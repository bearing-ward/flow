import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { once } from 'node:events'

import {
  decodeFlowDocument,
  projectFlowRoomDocument,
  prepareFlowEdit,
} from '@flow/core'
import type { FlowDocument } from '@flow/core'
import {
  prepareWorkflowEdit,
  encodeSavedWorkflow,
  decodeSavedWorkflow,
  workflowValidationReport,
  createWorkflowExecutionPlan,
  baseWorkflowFixture,
  aiWorkflowFixture,
  decodeWorkflowDocument,
  startWorkflowRun,
  createWorkflowAiEvaluator,
  makeLocalWorkflowAiProvider,
} from '@flow/workflow'
import { Effect, Exit, Scope } from 'effect'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

import { acquireYjsRoom } from './public.ts'

const serverUrl = 'ws://127.0.0.1:4194'

let server: ChildProcess | undefined

const decode = (input: Parameters<typeof decodeFlowDocument>[0]) =>
  Effect.runSync(decodeFlowDocument(input))

const empty = decode({ nodes: [], edges: [] })

const initial = decode({
  nodes: [
    { id: 'a', label: 'A', position: { x: 10, y: 20 } },
    { id: 'b', label: 'B', position: { x: 300, y: 20 } },
  ],
  edges: [{ id: 'ab', source: 'a', target: 'b' }],
})

const open = async (room: string, actorId: string) => {
  const scope = Scope.makeUnsafe()

  const client = await Effect.runPromise(
    acquireYjsRoom({ serverUrl, room, actorId, name: actorId }).pipe(
      Effect.provideService(Scope.Scope, scope)
    )
  )

  return {
    client,
    close: () => Effect.runPromise(Scope.close(scope, Exit.void)),
  }
}

const ordered = (document: FlowDocument) => ({
  nodes: document.nodes.toSorted((left, right) =>
    left.id.localeCompare(right.id)
  ),
  edges: document.edges.toSorted((left, right) =>
    left.id.localeCompare(right.id)
  ),
  bundles: document.bundles,
})

describe('Yjs room over real y-websocket', () => {
  beforeAll(async () => {
    const environment = { ...process.env }
    delete environment.YPERSISTENCE
    delete environment.CALLBACK_URL
    server = spawn(
      process.execPath,
      [
        new URL(
          'src/server.js',
          import.meta.resolve('@y/websocket-server/package.json')
        ).pathname,
      ],
      {
        env: { ...environment, HOST: '127.0.0.1', PORT: '4194' },
        stdio: ['ignore', 'pipe', 'inherit'],
      }
    )

    if (server.stdout === null) {
      throw new Error('Missing server readiness stream')
    }

    await once(server.stdout, 'data')
  })

  afterAll(async () => {
    if (server !== undefined && server.exitCode === null) {
      const exited = once(server, 'exit')
      server.kill('SIGTERM')
      await exited
    }
  })

  it('replicates rotation between real peers and preserves it through selective undo/redo', async () => {
    const room = crypto.randomUUID()
    const a = await open(room, 'rotation-a')
    const b = await open(room, 'rotation-b')

    try {
      await expect.poll(a.client.status).toBe('connected')
      Effect.runSync(a.client.commit(empty, initial))
      await expect.poll(b.client.document).toStrictEqual(a.client.document())
      const before = a.client.document()

      const rotated = decode({
        ...before,
        nodes: before.nodes.map((node) =>
          node.id === 'a' ? { ...node, rotation: 135 } : node
        ),
      })

      Effect.runSync(a.client.commit(before, rotated))
      await expect
        .poll(
          () =>
            b.client.document().nodes.find((node) => node.id === 'a')?.rotation
        )
        .toBe(135)
      a.client.undo()
      await expect
        .poll(
          () =>
            b.client.document().nodes.find((node) => node.id === 'a')?.rotation
        )
        .toBeUndefined()
      a.client.redo()
      await expect
        .poll(
          () =>
            b.client.document().nodes.find((node) => node.id === 'a')?.rotation
        )
        .toBe(135)
    } finally {
      await Promise.all([a.close(), b.close()])
    }
  })

  it('collaborates on restored workflow configuration and presentation extensions', async () => {
    const room = crypto.randomUUID()
    const a = await open(room, 'saved-workflow-a')
    const b = await open(room, 'saved-workflow-b')

    const document = Effect.runSync(
      decodeWorkflowDocument({
        ...baseWorkflowFixture,
        nodes: [
          {
            id: 'group',
            label: 'Group',
            position: { x: 0, y: 0 },
            size: { width: 1400, height: 500 },
          },
          ...baseWorkflowFixture.nodes.map((node) => ({
            ...node,
            parentId: 'group',
            extent: 'parent',
            rotation: 35,
            data: {
              ...node.data,
              tree: { version: 1, kind: 'node', expanded: true },
            },
          })),
          {
            id: 'shape',
            label: 'Shape',
            type: 'shape',
            position: { x: 30, y: 350 },
            size: { width: 40, height: 40 },
            data: { type: 'diamond', color: '#ff0071' },
          },
        ],
        edges: baseWorkflowFixture.edges.map((edge) => ({
          ...edge,
          route: {
            mode: 'manual',
            points: [
              { x: 100, y: 100 },
              { x: 200, y: 200 },
            ],
          },
        })),
        bundles: [
          {
            id: 'branches',
            edgeIds: ['branch-true', 'branch-false'],
            ties: [{ x: 600, y: 100 }],
          },
        ],
      })
    )

    const saved = Effect.runSync(encodeSavedWorkflow(document, 'dark'))
    const restored = Effect.runSync(decodeSavedWorkflow(saved)).document

    try {
      await expect.poll(a.client.status).toBe('connected')
      Effect.runSync(a.client.commit(empty, restored))
      await expect.poll(() => b.client.document().nodes.length).toBe(7)
      const remote = Effect.runSync(decodeWorkflowDocument(b.client.document()))

      expect(ordered(remote)).toStrictEqual(ordered(restored))
      const branch = remote.nodes.find((node) => node.id === 'branch')

      expect(branch?.data?.workflow).toMatchObject({
        kind: 'branch',
        config: { operator: 'equals', value: 'HELLO' },
        ports: { input: 'in', true: 'yes', false: 'no' },
      })
      a.client.undo()
      await expect.poll(() => b.client.document().nodes.length).toBe(0)
    } finally {
      await a.close()
      await b.close()
    }
  })

  it('synchronizes a workflow append as one room undo entry with its branch ports', async () => {
    const room = crypto.randomUUID()
    const a = await open(room, 'palette-a')
    const b = await open(room, 'palette-b')

    const base = {
      ...projectFlowRoomDocument(
        Effect.runSync(decodeWorkflowDocument(baseWorkflowFixture))
      ),
      bundles: [],
      nodeOrigin: undefined,
    }

    let sequence = 0

    const transaction = Effect.runSync(
      prepareWorkflowEdit(
        base,
        {
          kind: 'append',
          edgeId: 'branch-false',
          nodeKind: 'transform',
          position: { x: 600, y: 200 },
        },
        { allocate: (namespace) => `room-${namespace}-${(sequence += 1)}` }
      )
    )

    const appended = Effect.runSync(prepareFlowEdit(base, transaction)).document

    try {
      await expect.poll(a.client.status).toBe('connected')
      Effect.runSync(a.client.commit(empty, base))
      await expect.poll(() => b.client.document().nodes.length).toBe(5)
      Effect.runSync(a.client.commit(base, appended))
      await expect.poll(() => b.client.document().nodes.length).toBe(6)
      const remote = Effect.runSync(decodeWorkflowDocument(b.client.document()))
      expect(
        remote.edges.find((edge) => edge.id === 'branch-false')
      ).toMatchObject({
        source: 'branch',
        sourceHandle: 'no',
        target: 'room-node-3',
      })
      expect(workflowValidationReport(remote).issues).toStrictEqual([])
      const plan = createWorkflowExecutionPlan(remote, 1)
      expect(
        plan.kind === 'ready' ? plan.plan.steps.map((step) => step.nodeId) : []
      ).toStrictEqual([
        'initial',
        'transform',
        'branch',
        'room-node-3',
        'join',
        'output',
      ])
      a.client.undo()
      await expect.poll(() => b.client.document().nodes.length).toBe(5)
      expect(
        Effect.runSync(decodeWorkflowDocument(b.client.document())).edges
      ).toStrictEqual(base.edges)
    } finally {
      await a.close()
      await b.close()
    }
  })

  it('keeps runs transient between real peers and preserves configuration through local room undo', async () => {
    const room = crypto.randomUUID()
    const a = await open(room, 'workflow-a')
    const b = await open(room, 'workflow-b')

    const base = {
      ...projectFlowRoomDocument(
        Effect.runSync(decodeWorkflowDocument(baseWorkflowFixture))
      ),
      bundles: [],
      nodeOrigin: undefined,
    }

    const ai = projectFlowRoomDocument(
      Effect.runSync(decodeWorkflowDocument(aiWorkflowFixture))
    )

    try {
      await expect.poll(a.client.status).toBe('connected')
      Effect.runSync(a.client.commit(empty, base))
      await expect.poll(() => b.client.document().nodes.length).toBe(5)
      expect(
        Effect.runSync(decodeWorkflowDocument(b.client.document()))
      ).toStrictEqual(base)
      const beforeRun = structuredClone(a.client.document())
      const states: string[] = []
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runInRoom() {
            const run = yield* startWorkflowRun(
              { document: beforeRun, revision: 0 },
              {
                runId: 'room-local',
                expectedRevision: 0,
                onEvent: (event) => {
                  if (event.kind === 'run') {
                    states.push(event.state)
                  }
                },
              }
            )

            yield* run.await
          })
        )
      )
      expect({
        states,
        local: a.client.document(),
        remote: b.client.document(),
      }).toStrictEqual({
        states: ['queued', 'running', 'succeeded'],
        local: beforeRun,
        remote: beforeRun,
      })
      Effect.runSync(a.client.commit(a.client.document(), ai))
      await expect
        .poll(() =>
          b.client.document().nodes.some(({ id }) => id === 'generate-image')
        )
        .toBeTruthy()
      expect(
        Effect.runSync(decodeWorkflowDocument(b.client.document())).nodes.find(
          ({ id }) => id === 'generate-image'
        )?.data?.workflow
      ).toMatchObject({
        kind: 'generate-image',
        config: { modelId: 'local-image', width: 256, height: 256, prompt: '' },
        ports: { trigger: 'start', prompt: 'prompt', image: 'image' },
      })
      const service = Effect.runSync(makeLocalWorkflowAiProvider())
      const beforeAiRun = structuredClone(b.client.document())
      const aiStates: string[] = []
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* aiRunInRoom() {
            const session = yield* startWorkflowRun(
              { document: a.client.document(), revision: 175 },
              {
                runId: 'room-ai-175',
                expectedRevision: 175,
                capabilities: service.capabilities,
                evaluate: createWorkflowAiEvaluator(service),
                onEvent: (event) => {
                  if (event.kind === 'run') {
                    aiStates.push(event.state)
                  }
                },
              }
            )

            yield* session.await
          })
        )
      )
      expect({
        states: aiStates,
        local: a.client.document(),
        remote: b.client.document(),
      }).toStrictEqual({
        states: ['queued', 'running', 'succeeded'],
        local: beforeAiRun,
        remote: beforeAiRun,
      })
      a.client.undo()
      await expect
        .poll(() =>
          b.client.document().nodes.some(({ id }) => id === 'initial')
        )
        .toBeTruthy()
      expect(
        Effect.runSync(decodeWorkflowDocument(b.client.document()))
      ).toStrictEqual(base)
    } finally {
      await a.close()
      await b.close()
    }
  })

  it('converges independent fields, keeps local undo selective and ignores duplicate updates', async () => {
    const room = crypto.randomUUID()
    const a = await open(room, 'a')
    const b = await open(room, 'b')
    const raw = new Y.Doc()

    const provider = new WebsocketProvider(serverUrl, room, raw, {
      disableBc: true,
    })

    try {
      await expect.poll(a.client.status).toBe('connected')
      Effect.runSync(a.client.commit(empty, initial))
      await expect.poll(b.client.document).toStrictEqual(a.client.document())
      const before = b.client.document()

      const moved = decode({
        ...before,
        nodes: before.nodes.map((node) =>
          node.id === 'a' ? { ...node, position: { x: 90, y: 80 } } : node
        ),
      })

      Effect.runSync(a.client.disconnect)
      Effect.runSync(a.client.commit(before, moved))
      Effect.runSync(
        b.client.commit(
          before,
          decode({
            ...before,
            nodes: before.nodes.map((node) =>
              node.id === 'a' ? { ...node, label: 'Peer label' } : node
            ),
          })
        )
      )
      Effect.runSync(a.client.reconnect)
      await expect
        .poll(() => a.client.document().nodes[0])
        .toMatchObject({ position: { x: 90, y: 80 }, label: 'Peer label' })
      await expect.poll(b.client.document).toStrictEqual(a.client.document())
      a.client.undo()
      await expect
        .poll(() => b.client.document().nodes[0])
        .toMatchObject({ position: { x: 10, y: 20 }, label: 'Peer label' })
      a.client.redo()
      await expect
        .poll(() => b.client.document().nodes[0]?.position)
        .toStrictEqual({ x: 90, y: 80 })
      await expect.poll(() => provider.synced).toBeTruthy()
      const update = Y.encodeStateAsUpdate(raw)
      const length: number[] = []
      let remaining = update.length

      while (remaining > 127) {
        length.push((remaining % 128) + 128)
        remaining = Math.floor(remaining / 128)
      }

      length.push(remaining)
      const frame = new Uint8Array([0, 2, ...length, ...update])
      const count = a.client.history().pastCount
      provider.ws?.send(frame)
      provider.ws?.send(frame)
      raw
        .getMap('flow-v1')
        .set(JSON.stringify(['nodes', 'a', 'label']), 'After duplicate')
      await expect
        .poll(() => a.client.document().nodes[0]?.label)
        .toBe('After duplicate')
      await expect.poll(b.client.document).toStrictEqual(a.client.document())
      expect(a.client.history().pastCount).toBe(count)
    } finally {
      provider.destroy()
      provider.awareness.destroy()
      raw.destroy()
      await a.close()
      await b.close()
    }
  })

  it('lets deletion win over concurrent movement without dangling edges', async () => {
    const room = crypto.randomUUID()
    const a = await open(room, 'a')
    const b = await open(room, 'b')

    try {
      Effect.runSync(a.client.commit(empty, initial))
      await expect.poll(b.client.document).toStrictEqual(a.client.document())
      const before = b.client.document()
      Effect.runSync(b.client.disconnect)
      Effect.runSync(
        a.client.commit(
          before,
          decode({
            nodes: before.nodes.filter(({ id }) => id !== 'a'),
            edges: [],
          })
        )
      )
      Effect.runSync(
        b.client.commit(
          before,
          decode({
            ...before,
            nodes: before.nodes.map((node) => ({
              ...node,
              position: { x: 500, y: 500 },
            })),
          })
        )
      )
      Effect.runSync(b.client.reconnect)
      await expect
        .poll(() => b.client.document().nodes.map(({ id }) => id))
        .toStrictEqual(['b'])
      await expect.poll(b.client.document).toStrictEqual(a.client.document())
      b.client.undo()
      await expect
        .poll(() => a.client.document().nodes.map(({ id }) => id))
        .toStrictEqual(['b'])
      expect(a.client.document().edges).toStrictEqual([])
    } finally {
      await a.close()
      await b.close()
    }
  })

  it('isolates rooms, decodes presence, cleans awareness and releases idempotently', async () => {
    const roomId = crypto.randomUUID()
    const a = await open(`path/../${roomId}`, 'a')
    const b = await open(roomId, 'b')

    try {
      Effect.runSync(a.client.commit(empty, initial))
      await expect.poll(a.client.status).toBe('connected')
      await expect.poll(b.client.status).toBe('connected')
      expect(b.client.document()).toMatchObject({ nodes: [], edges: [] })
      expect(a.client.presence()).toStrictEqual([])

      const failed = Effect.runSyncExit(
        a.client.commit(empty, { ...initial, nodes: [] })
      )

      expect(Exit.isFailure(failed)).toBeTruthy()
    } finally {
      await a.close()
      await b.close()
    }

    expect(a.client.status()).toBe('disposed')
    expect(a.client.history().disposed).toBeTruthy()
    await a.close()
    expect(Exit.isFailure(Effect.runSyncExit(a.client.reconnect))).toBeTruthy()
  })

  it('coalesces a live gesture, gives each command one step and excludes local presentation', async () => {
    const a = await open(crypto.randomUUID(), 'a')

    try {
      Effect.runSync(a.client.commit(empty, initial))
      Effect.runSync(a.client.commit(empty, initial))
      let before: FlowDocument = initial
      a.client.beginGesture()

      for (const x of [40, 70, 100]) {
        const next = decode({
          ...before,
          nodes: before.nodes.map((node) =>
            node.id === 'a'
              ? {
                  ...node,
                  position: { x, y: 20 },
                  selected: true,
                  measured: { width: 200 },
                }
              : node
          ),
        })

        Effect.runSync(a.client.commit(before, next))
        before = next
      }

      a.client.endGesture()
      expect(a.client.history().pastCount).toBe(2)
      a.client.undo()
      expect(a.client.document().nodes[0]?.position).toStrictEqual({
        x: 10,
        y: 20,
      })
      expect(a.client.document().nodes[0]?.selected).toBeUndefined()
      expect(a.client.document().nodes[0]?.measured).toBeUndefined()
      expect(a.client.history().canRedo).toBeTruthy()
    } finally {
      await a.close()
    }
  })

  it('reports typed malformed updates, retains the last valid graph and recovers after repair', async () => {
    const id = crypto.randomUUID()
    const a = await open(id, 'a')
    const raw = new Y.Doc()

    const provider = new WebsocketProvider(serverUrl, id, raw, {
      disableBc: true,
    })

    try {
      Effect.runSync(a.client.commit(empty, initial))
      await expect.poll(() => provider.synced).toBeTruthy()
      const fields = raw.getMap('flow-v1')
      const field = JSON.stringify(['nodes', 'a', 'position'])
      fields.set(field, { x: 'invalid', y: 5 })
      await expect.poll(() => a.client.failure()?.operation).toBe('decode')
      expect(a.client.document().nodes[0]?.position).toStrictEqual({
        x: 10,
        y: 20,
      })
      fields.set(field, { x: 100, y: 200 })
      await expect
        .poll(() => a.client.document().nodes[0]?.position)
        .toStrictEqual({ x: 100, y: 200 })
      expect(a.client.failure()).toBeUndefined()
      expect(a.client.history().pastCount).toBe(1)
      const identity = JSON.stringify(['nodes', 'a', 'id'])
      fields.set(identity, 'mismatched-identity')
      await expect.poll(() => a.client.failure()?.operation).toBe('decode')
      expect(a.client.document().nodes[0]?.id).toBe('a')
      fields.set(identity, 'a')
      await expect.poll(a.client.failure).toBeUndefined()
      const membership = JSON.stringify(['nodes', 'a', '$alive'])
      fields.set(membership, 'invalid-membership')
      await expect.poll(() => a.client.failure()?.operation).toBe('decode')
      fields.set(membership, true)
      await expect.poll(a.client.failure).toBeUndefined()
      provider.awareness.setLocalState({
        flow: { actorId: 'bad-peer', name: 42, cursor: null },
      })
      expect(a.client.presence()).toStrictEqual([])
    } finally {
      provider.destroy()
      provider.awareness.destroy()
      raw.destroy()
      await a.close()
    }
  })

  it('does not undo a peer overwrite of the same field or record remote/system origins', async () => {
    const id = crypto.randomUUID()
    const a = await open(id, 'a')
    const b = await open(id, 'b')

    try {
      Effect.runSync(
        a.client.commit(empty, initial, {
          transactionId: 'system',
          origin: { kind: 'system', actorId: 'seed' },
        })
      )
      expect(a.client.history().pastCount).toBe(0)
      expect(a.client.document().nodes).toStrictEqual([])
      Effect.runSync(a.client.commit(empty, initial))
      await expect.poll(b.client.document).toStrictEqual(a.client.document())

      const local = decode({
        ...initial,
        nodes: initial.nodes.map((node) =>
          node.id === 'a' ? { ...node, label: 'Local' } : node
        ),
      })

      Effect.runSync(a.client.commit(initial, local))
      await expect.poll(() => b.client.document().nodes[0]?.label).toBe('Local')
      const before = b.client.document()
      Effect.runSync(
        b.client.commit(
          before,
          decode({
            ...before,
            nodes: before.nodes.map((node) =>
              node.id === 'a' ? { ...node, label: 'Peer' } : node
            ),
          })
        )
      )
      await expect.poll(() => a.client.document().nodes[0]?.label).toBe('Peer')
      a.client.undo()
      expect(a.client.document().nodes[0]?.label).toBe('Peer')
    } finally {
      await a.close()
      await b.close()
    }
  })

  it('refreshes awareness on reconnect and removes presence when the scope closes', async () => {
    const id = crypto.randomUUID()
    const a = await open(id, 'a')
    const b = await open(id, 'b')

    try {
      await expect
        .poll(() => a.client.presence().map(({ actorId }) => actorId))
        .toStrictEqual(['b'])
      Effect.runSync(b.client.disconnect)
      await expect.poll(a.client.presence).toStrictEqual([])
      Effect.runSync(b.client.reconnect)
      await expect
        .poll(() => a.client.presence().map(({ actorId }) => actorId))
        .toStrictEqual(['b'])
      await b.close()
      await expect.poll(a.client.presence).toStrictEqual([])
    } finally {
      await a.close()
      await b.close()
    }
  })

  it('rejects dot-only room names before acquiring transport resources', async () => {
    const results = await Promise.all(
      ['.', '..'].map((room) =>
        Effect.runPromiseExit(
          Effect.scoped(
            acquireYjsRoom({
              serverUrl,
              room,
              actorId: 'invalid',
              name: 'Invalid',
            })
          )
        )
      )
    )

    expect(results.every(Exit.isFailure)).toBeTruthy()
  })
})
