import {
  decodeFlowDocument,
  NodeIdSchema,
  EdgeIdSchema,
  ProtectedDeletionConflict,
} from '@flow/core'
import { Cause, Deferred, Effect, Exit, Fiber, Schema, Stream } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AppMessage,
  EditResponseSchema,
  HostAction,
  createProgramPublication,
  createProgramUpdate,
  wrapGraphMessage,
  initialModel,
  update,
} from './application.ts'
import { Message } from './graph.ts'
import { fixtureDocument, setupPointer } from './node-threshold-fixture.ts'

const heldPublicationPosition = (x: number) =>
  AppMessage.HostAction({
    action: HostAction.DispatchCommand({
      command: {
        kind: 'set-node-position',
        nodeId: NodeIdSchema.make('source'),
        position: { x, y: 0 },
      },
    }),
  })

const heldPublicationSnapshot = (
  x: number,
  view: { x: number; y: number; zoom: number }
) => ({
  document: {
    nodes: [
      {
        id: 'source',
        label: 'Source',
        position: { x, y: 0 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'target',
        label: 'Target',
        position: { x: 200, y: 0 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [],
  },
  viewport: view,
})

const edit = (model: ReturnType<typeof initialModel>, x: number) =>
  update(
    model,
    AppMessage.HostAction({
      action: HostAction.DispatchCommand({
        command: {
          kind: 'set-node-position',
          nodeId: NodeIdSchema.make('source'),
          position: { x, y: 0 },
        },
      }),
    })
  )

const latch = () => Effect.runSync(Deferred.make<boolean>())

describe('program publication with explicit emitter barriers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('enqueues complete detached N replacement X and Y history without running commands', async () => {
    const fixture = setupPointer()
    const gate = latch()
    const entered = latch()
    const finished = latch()

    const items: NonNullable<
      ReturnType<typeof update>['outMessage']
    >[number][] = []

    let count = 0

    const lane = createProgramPublication(fixture.resource, (item) =>
      Effect.gen(function* emitTestItem() {
        if (count === 0) {
          yield* Deferred.succeed(entered, true)
          yield* Deferred.await(gate)
        }

        items.push(item)
        count += 1

        if (count === 3) {
          yield* Deferred.succeed(finished, true)
        }

        return AppMessage.ChangePublished()
      })
    )

    const n = edit(fixture.model(), 10)

    const replacement = {
      ...fixtureDocument,
      nodes: fixtureDocument.nodes.map((node) => ({
        ...node,
        position: { x: 20, y: 0 },
      })),
    }

    const x = update(
      n.model,
      AppMessage.HostAction({
        action: HostAction.ReplaceDocument({ document: replacement }),
      })
    )

    const y = edit(x.model, 30)
    lane.enqueue(n.outMessage)
    lane.enqueue(x.outMessage)
    lane.enqueue(y.outMessage)
    const fiber = Effect.runFork(Stream.runDrain(lane.stream))
    await Effect.runPromise(Deferred.await(entered))
    expect(items).toStrictEqual([])
    const [first] = replacement.nodes

    if (first !== undefined) {
      Reflect.set(first.position, 'x', 999)
    }

    await Effect.runPromise(Deferred.succeed(gate, true))
    await Effect.runPromise(Deferred.await(finished))
    expect(
      items.flatMap((item) =>
        item.kind === 'change' && item.acceptedState !== undefined
          ? [
              [
                item.acceptedState.previous.document.nodes[0]?.position.x,
                item.acceptedState.current.document.nodes[0]?.position.x,
                item.acceptedState.cause,
              ],
            ]
          : []
      )
    ).toStrictEqual([
      [0, 10, 'semantic-change'],
      [10, 20, 'document-update'],
      [20, 30, 'semantic-change'],
    ])
    expect(y.model.changeKinds).toStrictEqual([
      'node-position',
      'node-position',
    ])
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(() => lane.enqueue(n.outMessage)).toThrow('closed')
    await fixture.dispose()
  })

  it('reconstructs a real protected-deletion error with detached payloads and retains later healthy publication', async () => {
    const fixture = setupPointer()

    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: fixtureDocument.nodes.map((node) => ({
          ...node,
          deletable: false,
        })),
        edges: [
          { id: 'edge', source: 'source', target: 'target', deletable: false },
        ],
      })
    )

    const base = initialModel(document, { x: 0, y: 0, zoom: 1 })

    const rejected = update(
      base,
      AppMessage.EditRequest({
        request: {
          requestId: 'protected',
          transaction: {
            operations: [
              {
                kind: 'delete-elements',
                nodeIds: [NodeIdSchema.make('source')],
                edgeIds: [EdgeIdSchema.make('edge')],
              },
            ],
          },
        },
      })
    )

    const original = rejected.outMessage?.find(
      (item) => item.kind === 'edit-failure'
    )

    if (original?.kind !== 'edit-failure' || !('error' in original.response)) {
      throw new Error('Expected production typed rejection')
    }

    const gate = latch()
    const finished = latch()
    const received: string[] = []

    const lane = createProgramPublication(fixture.resource, (item) =>
      Effect.gen(function* emitTestItem() {
        yield* Deferred.await(gate)

        if (item.kind === 'edit-failure') {
          expect(
            'error' in item.response && item.response.error
          ).toBeInstanceOf(ProtectedDeletionConflict)

          if (
            !('error' in item.response) ||
            !('nodeIds' in item.response.error) ||
            !('error' in original.response) ||
            !('nodeIds' in original.response.error)
          ) {
            throw new Error('Missing typed payload')
          }

          expect(item.response.error).not.toBe(original.response.error)
          expect(item.response.error.nodeIds).not.toBe(
            original.response.error.nodeIds
          )
          expect(Object.isFrozen(original.response.error)).toBeFalsy()
          const encoded = Schema.encodeSync(EditResponseSchema)(item.response)
          expect(encoded).toMatchObject({
            requestId: 'protected',
            error: {
              nodeIds: ['source'],
              edgeIds: ['edge'],
            },
          })
          received.push('response', item.interactionError.name)
        } else if (item.kind === 'change' && item.change !== undefined) {
          received.push(item.change.kind)
          yield* Deferred.succeed(finished, true)
        }

        return AppMessage.ChangePublished()
      })
    )

    lane.enqueue(rejected.outMessage)
    lane.enqueue(edit(base, 10).outMessage)
    const fiber = Effect.runFork(Stream.runDrain(lane.stream))
    await Effect.runPromise(Deferred.succeed(gate, true))
    await Effect.runPromise(Deferred.await(finished))
    expect(received).toStrictEqual(['response', 'onError', 'node-position'])
    await Effect.runPromise(Fiber.interrupt(fiber))
    await fixture.dispose()
  })

  it('an emitter defect after a successful prefix closes both queues and preserves the cause', async () => {
    const fixture = setupPointer()
    const entered = latch()
    const gate = latch()
    const failure = new Error('second emission failed')
    const delivered: string[] = []
    let count = 0

    const lane = createProgramPublication(fixture.resource, (item) =>
      Effect.gen(function* emitTestItem() {
        count += 1

        if (count === 1) {
          yield* Deferred.succeed(entered, true)
          yield* Deferred.await(gate)
          delivered.push(item.kind)

          return AppMessage.ChangePublished()
        }

        return yield* Effect.die(failure)
      })
    )

    lane.enqueue([
      { kind: 'interaction', events: [] },
      { kind: 'interaction', events: [] },
    ])
    lane.enqueue([{ kind: 'interaction', events: [] }])
    const fiber = Effect.runFork(Stream.runDrain(lane.stream))
    await Effect.runPromise(Deferred.await(entered))
    fixture.begin()
    expect(fixture.node.captured).toBeTruthy()
    await Effect.runPromise(Deferred.succeed(gate, true))
    const result = await Effect.runPromise(Fiber.await(fiber))
    expect({
      exit: result._tag,
      delivered,
      count,
      captured: fixture.node.captured,
    }).toStrictEqual({
      exit: 'Failure',
      delivered: ['interaction'],
      count: 2,
      captured: false,
    })
    expect(() => lane.enqueue([])).toThrow('closed')

    if (!Exit.isFailure(result)) {
      throw new Error('Expected emitter failure')
    }

    expect(Cause.squash(result.cause)).toBe(failure)

    await fixture.dispose()
  })

  it('disposal while emitter is blocked interrupts work and rejects later batches', async () => {
    const fixture = setupPointer()
    const entered = latch()
    const gate = latch()
    const delivered: string[] = []

    const lane = createProgramPublication(fixture.resource, (item) =>
      Effect.gen(function* emitTestItem() {
        yield* Deferred.succeed(entered, true)
        yield* Deferred.await(gate)
        delivered.push(item.kind)

        return AppMessage.ChangePublished()
      })
    )

    lane.enqueue([{ kind: 'interaction', events: [] }])
    const fiber = Effect.runFork(Stream.runDrain(lane.stream))
    await Effect.runPromise(Deferred.await(entered))
    lane.close()
    lane.close()
    await Effect.runPromise(Fiber.await(fiber))
    await Effect.runPromise(Deferred.succeed(gate, true))
    expect(delivered).toStrictEqual([])
    expect(() => lane.enqueue([])).toThrow('closed')
    await fixture.dispose()
  })
})

describe('publication route coverage and reentrant enqueue', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('API-first edits and host actions stay uninitialized until a graph message', () => {
    const fixture = setupPointer()
    const first = edit(fixture.model(), 10)

    const second = update(
      first.model,
      AppMessage.HostAction({
        action: HostAction.ReplaceViewport({
          viewport: { x: 3, y: 0, zoom: 1 },
        }),
      })
    )

    const initialized = update(
      second.model,
      wrapGraphMessage({ message: Message.IgnoreInput({}) })
    )

    const repeated = update(
      initialized.model,
      wrapGraphMessage({ message: Message.IgnoreInput({}) })
    )

    expect({
      first: first.model.lifecycleReady,
      second: second.model.lifecycleReady,
      init: initialized.outMessage?.flatMap((item) =>
        item.kind === 'interaction'
          ? item.events.map((event) => event.name)
          : []
      ),
      repeat: repeated.outMessage?.flatMap((item) =>
        item.kind === 'interaction' ? item.events : []
      ),
    }).toStrictEqual({
      first: false,
      second: false,
      init: ['onInit'],
      repeat: [],
    })
  })

  it('a reentrant replacement batch stays behind all already enqueued items', async () => {
    const fixture = setupPointer()
    const finished = latch()
    const observed: string[] = []

    const lane = createProgramPublication(fixture.resource, (item) =>
      Effect.gen(function* emitReentrantItem() {
        if (item.kind !== 'interaction') {
          throw new Error('Expected interaction item')
        }

        const name = item.events[0]?.name

        if (name === undefined) {
          throw new Error('Expected event')
        }

        observed.push(name)

        if (name === 'onNodeDrag') {
          lane.enqueue([
            {
              kind: 'interaction',
              events: [
                { name: 'onInit', phase: 'event', inputKind: 'runtime' },
              ],
            },
          ])
        }

        if (name === 'onInit') {
          yield* Deferred.succeed(finished, true)
        }

        return AppMessage.ChangePublished()
      })
    )

    lane.enqueue([
      {
        kind: 'interaction',
        events: [
          { name: 'onNodeDrag', phase: 'progress', inputKind: 'pointer' },
        ],
      },
      {
        kind: 'interaction',
        events: [
          {
            name: 'onNodeDragStop',
            phase: 'end',
            inputKind: 'pointer',
            outcome: 'accepted',
          },
        ],
      },
    ])
    const fiber = Effect.runFork(Stream.runDrain(lane.stream))
    await Effect.runPromise(Deferred.await(finished))
    expect(observed).toStrictEqual(['onNodeDrag', 'onNodeDragStop', 'onInit'])
    await Effect.runPromise(Fiber.interrupt(fiber))
    await fixture.dispose()
  })

  it('equivalent replacement adds no state notification and viewport animation completion uses the same batch', () => {
    const fixture = setupPointer()
    const base = fixture.model()

    const equivalent = update(
      base,
      AppMessage.HostAction({
        action: HostAction.ReplaceDocument({ document: base.graph.document }),
      })
    )

    const animation = update(
      base,
      AppMessage.ViewportRequest({
        request: {
          requestId: 'animated',
          kind: 'set',
          viewport: { x: 20, y: 30, zoom: 1 },
          animation: { duration: 100 },
          width: 800,
          height: 600,
          originX: 0,
          originY: 0,
        },
      })
    )

    const frame = update(
      animation.model,
      AppMessage.ViewportFrame({ delta: 64 })
    )

    const complete = update(
      frame.model,
      AppMessage.ViewportFrame({ delta: 64 })
    )

    expect(equivalent.outMessage).toStrictEqual([])
    expect(
      complete.outMessage?.flatMap((item) =>
        item.kind === 'change' ? [item.acceptedState] : []
      )
    ).toMatchObject([
      {
        previous: { viewport: { x: 0, y: 0, zoom: 1 } },
        current: { viewport: { x: 20, y: 30, zoom: 1 } },
        cause: 'viewport-update',
      },
    ])
    expect(complete.model.changeKinds).toStrictEqual([])
  })
})

describe('publication instance and pre-consumption disposal', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('disposal before consumption discards the pending batch and is idempotent', async () => {
    const fixture = setupPointer()
    const emitted: string[] = []

    const lane = createProgramPublication(fixture.resource, (item) =>
      Effect.sync(() => {
        emitted.push(item.kind)

        return AppMessage.ChangePublished()
      })
    )

    lane.enqueue([{ kind: 'interaction', events: [] }])
    lane.close()
    lane.close()

    const result = await Effect.runPromise(
      Effect.exit(Stream.runDrain(lane.stream))
    )

    expect({ emitted, exit: result._tag }).toStrictEqual({
      emitted: [],
      exit: 'Failure',
    })
    expect(() => lane.enqueue([])).toThrow('closed')
    await fixture.dispose()
  })

  it('closing one lane cannot close another instance or replay its batch on remount', async () => {
    const first = setupPointer()
    const firstEmitted: string[] = []

    const closed = createProgramPublication(first.resource, (item) =>
      Effect.sync(() => {
        firstEmitted.push(item.kind)

        return AppMessage.ChangePublished()
      })
    )

    closed.enqueue([{ kind: 'interaction', events: [] }])
    closed.close()
    const second = setupPointer()
    const finished = latch()
    const secondEmitted: string[] = []

    const fresh = createProgramPublication(second.resource, (item) =>
      Effect.gen(function* emitFresh() {
        secondEmitted.push(item.kind)
        yield* Deferred.succeed(finished, true)

        return AppMessage.ChangePublished()
      })
    )

    const fiber = Effect.runFork(Stream.runDrain(fresh.stream))
    fresh.enqueue([{ kind: 'interaction', events: [] }])
    await Effect.runPromise(Deferred.await(finished))
    expect({ firstEmitted, secondEmitted }).toStrictEqual({
      firstEmitted: [],
      secondEmitted: ['interaction'],
    })
    await Effect.runPromise(Fiber.interrupt(fiber))
    await first.dispose()
    await second.dispose()
  })
})

// Pinned react/src/store/index.ts:211-230 supplies the terminal dragging flag;
// examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:86 requires absolute metadata.
const positionDelta = (x: number) => ({
  nodes: [
    {
      id: 'source',
      type: 'position',
      position: { x, y: 0 },
      dragging: false,
      positionAbsolute: { x, y: 0 },
    },
  ],
  edges: [],
})

describe('round three actual updater held viewport history', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    'replacement',
    'animation',
    'equivalent',
    'unchanged-request',
  ] as const)(
    'holds N through actual %s X and semantic Y without executing commands',
    async (route) => {
      const fixture = setupPointer()
      const entered = latch()
      const gate = latch()
      const finished = latch()

      const items: NonNullable<
        ReturnType<typeof update>['outMessage']
      >[number][] = []

      const mutationAttempts: boolean[] = []
      const ports: { port: string; value: unknown }[] = []

      const expectedCount =
        route === 'equivalent' || route === 'unchanged-request' ? 2 : 3

      const lane = createProgramPublication(fixture.resource, (item) =>
        Effect.gen(function* recordItem() {
          if (items.length === 0) {
            yield* Deferred.succeed(entered, true)
            yield* Deferred.await(gate)
          }

          items.push(item)

          if (item.kind === 'change') {
            if (item.change !== undefined) {
              ports.push({ port: 'changes', value: item.change })
            }

            if (item.acceptedState !== undefined) {
              mutationAttempts.push(
                Reflect.set(item.acceptedState.previous.viewport, 'x', 999),
                Reflect.set(
                  item.acceptedState.current.document.nodes[0]?.position ?? {},
                  'x',
                  999
                )
              )
              ports.push({ port: 'acceptedStates', value: item.acceptedState })
            }
          } else {
            ports.push({ port: item.kind, value: item })
          }

          if (items.length === expectedCount) {
            yield* Deferred.succeed(finished, true)
          }

          return AppMessage.ChangePublished()
        })
      )

      const reduce = createProgramUpdate(fixture.resource, lane)
      let model = fixture.model()

      const step = (message: Parameters<typeof reduce>[1]) => {
        const result = reduce(model, message)

        ;({ model } = result)

        return result
      }

      const fiber = Effect.runFork(Stream.runDrain(lane.stream))

      try {
        step(heldPublicationPosition(10))
        await Effect.runPromise(Deferred.await(entered))

        const viewport =
          route === 'equivalent' || route === 'unchanged-request'
            ? { x: 0, y: 0, zoom: 1 }
            : { x: 20, y: 30, zoom: 1 }

        let intermediate: { pending: boolean; empty: boolean } | null = null

        if (route === 'replacement' || route === 'equivalent') {
          step(
            AppMessage.HostAction({
              action: HostAction.ReplaceViewport({ viewport }),
            })
          )
        } else {
          step(
            AppMessage.ViewportRequest({
              request: {
                requestId: 'held-viewport',
                kind: 'set',
                viewport,
                animation: { duration: 100 },
                width: 800,
                height: 600,
                originX: 0,
                originY: 0,
              },
            })
          )

          if (route === 'animation') {
            step(AppMessage.ViewportFrame({ delta: 64 }))
            intermediate = {
              pending: model.graph.viewport !== viewport,
              empty: items.length === 0,
            }
            step(AppMessage.ViewportFrame({ delta: 64 }))
          }
        }

        step(heldPublicationPosition(30))
        expect({
          items,
          ports,
          changeKinds: model.changeKinds,
          intermediate,
          animation: model.viewportAnimation,
          viewportFrozen: Object.isFrozen(viewport),
          callerFrozen: Object.isFrozen(
            model.graph.document.nodes[0]?.position
          ),
        }).toStrictEqual({
          items: [],
          ports: [],
          changeKinds: ['node-position', 'node-position'],
          intermediate:
            route === 'animation' ? { pending: true, empty: true } : null,
          animation: null,
          viewportFrozen: false,
          callerFrozen: false,
        })
        Reflect.set(viewport, 'x', 999)
        const callerPosition = model.graph.document.nodes[0]?.position

        if (callerPosition !== undefined) {
          Reflect.set(callerPosition, 'x', 999)
        }

        await Effect.runPromise(Deferred.succeed(gate, true))
        await Effect.runPromise(Deferred.await(finished))

        const initial = { x: 0, y: 0, zoom: 1 }
        const target = { x: 20, y: 30, zoom: 1 }
        const finalViewport = expectedCount === 2 ? initial : target

        const n = {
          kind: 'change',
          change: {
            kind: 'node-position',
            nodeId: 'source',
            position: { x: 10, y: 0 },
          },
          acceptedState: {
            previous: heldPublicationSnapshot(0, initial),
            current: heldPublicationSnapshot(10, initial),
            cause: 'semantic-change',
          },
          controlMode: 'uncontrolled',
          elementChanges: positionDelta(10),
        }

        const acceptedViewport = {
          acceptedState: {
            previous: heldPublicationSnapshot(10, initial),
            current: heldPublicationSnapshot(10, target),
            cause: 'viewport-update',
          },
        }

        const x =
          route === 'animation'
            ? {
                kind: 'change',
                change: { kind: 'viewport', viewport: target },
                ...acceptedViewport,
              }
            : { kind: 'change', ...acceptedViewport }

        const y = {
          kind: 'change',
          change: {
            kind: 'node-position',
            nodeId: 'source',
            position: { x: 30, y: 0 },
          },
          acceptedState: {
            previous: heldPublicationSnapshot(10, finalViewport),
            current: heldPublicationSnapshot(30, finalViewport),
            cause: 'semantic-change',
          },
          controlMode: 'uncontrolled',
          elementChanges: positionDelta(30),
        }

        expect(mutationAttempts).toStrictEqual(
          Array.from({ length: expectedCount * 2 }, () => false)
        )
        expect(items).toStrictEqual(expectedCount === 2 ? [n, y] : [n, x, y])
        expect(ports).toStrictEqual([
          { port: 'changes', value: n.change },
          { port: 'acceptedStates', value: n.acceptedState },
          ...(route === 'animation'
            ? [
                {
                  port: 'changes',
                  value: { kind: 'viewport', viewport: target },
                },
              ]
            : []),
          ...(expectedCount === 3
            ? [{ port: 'acceptedStates', value: x.acceptedState }]
            : []),
          { port: 'changes', value: y.change },
          { port: 'acceptedStates', value: y.acceptedState },
        ])
      } finally {
        await Effect.runPromise(Fiber.interrupt(fiber))
        await fixture.dispose()
      }
    }
  )
})
