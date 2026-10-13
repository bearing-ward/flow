import { Deferred, Effect, Schema } from 'effect'
import { Runtime } from 'foldkit'

import {
  decodeFlowDocument,
  NodeIdSchema,
  FlowChangeSchema,
  FlowStateChangeSchema,
} from '../../../packages/core/dist/public.js'
import {
  createProgram,
  defaultInteractionOptions,
  InteractionEventSchema,
  HostAction,
  createFoldkitSnapshotClient,
} from '../../../packages/foldkit/dist/public.js'
import type { ports } from '../../../packages/foldkit/dist/public.js'
import { frames } from '../../shared-e2e/connection-threshold-harness.ts'

export const publicationProbe = async (
  mode:
    | 'proposal-replace'
    | 'acceptance-replace'
    | 'throw-listener'
    | 'dispose-listener'
    | 'protected-error'
    | 'duplicate-error'
) => {
  const documentState = Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 0, y: 0 },
          deletable: false,
        },
      ],
      edges: [],
    })
  )

  const container = document.createElement('div')
  container.id = 'publication-probe'
  document.body.append(container)

  const active = Runtime.embed<typeof ports, never, 'Element'>(
    createProgram(container, documentState, { x: 0, y: 0, zoom: 1 })
  )

  const client = createFoldkitSnapshotClient(active.ports)
  const finished = Effect.runSync(Deferred.make<boolean>())
  const observations: string[] = []
  const finish = () => Effect.runSync(Deferred.succeed(finished, true))

  const replacement = {
    ...documentState,
    nodes: documentState.nodes.map((node) => ({
      ...node,
      position: { x: 20, y: 0 },
    })),
  }

  const replace = () =>
    active.ports.actions.send(
      HostAction.ReplaceDocument({ document: replacement })
    )

  active.ports.changes.subscribe(() => {
    observations.push('proposal')

    if (mode === 'proposal-replace') {
      replace()
    }

    if (mode === 'dispose-listener') {
      active.dispose()
      finish()
    }

    if (mode === 'throw-listener') {
      throw new Error('Intentional host-listener error')
    }
  })
  active.ports.acceptedStates.subscribe((state) => {
    const x = state.current.document.nodes[0]?.position.x
    observations.push(`accepted:${x}`)

    if (mode === 'acceptance-replace' && x === 10) {
      replace()
    }

    if (mode === 'throw-listener' || x === 20) {
      finish()
    }

    const position = state.current.document.nodes[0]?.position

    if (position !== undefined) {
      Reflect.set(position, 'x', 999)
    }
  })
  active.ports.editResults.subscribe((response) => {
    observations.push(
      'error' in response
        ? `response:${response.error._tag}`
        : 'response:success'
    )
  })
  active.ports.interactionEvents.subscribe((events) => {
    for (const event of events) {
      if (event.name === 'onError') {
        observations.push('onError')
        finish()
      }
    }
  })

  try {
    await frames(2)
    const mounted = await client.requestVersioned()

    if (mounted.status !== 'succeeded') {
      throw new Error('Public runtime did not mount')
    }

    if (mode === 'protected-error' || mode === 'duplicate-error') {
      active.ports.editRequests.send({
        requestId: mode,
        transaction: {
          operations:
            mode === 'protected-error'
              ? [{ kind: 'delete-elements', nodeIds: ['source'], edgeIds: [] }]
              : [
                  {
                    kind: 'set-nodes',
                    nodes: [...documentState.nodes, ...documentState.nodes],
                  },
                ],
        },
      })
    } else {
      active.ports.actions.send(
        HostAction.DispatchCommand({
          command: {
            kind: 'set-node-position',
            nodeId: NodeIdSchema.make('source'),
            position: { x: 10, y: 0 },
          },
        })
      )
    }

    await Effect.runPromise(Deferred.await(finished))
    await Effect.runPromise(
      Effect.callback<boolean>((resume) => {
        queueMicrotask(() => resume(Effect.succeed(true)))
      })
    )
    await Effect.runPromise(
      Effect.callback<boolean>((resume) => {
        queueMicrotask(() => resume(Effect.succeed(true)))
      })
    )

    return [...observations]
  } finally {
    client.dispose()
    active.dispose()
    container.remove()
  }
}

type ReleaseMode =
  | 'proposal-replace'
  | 'acceptance-replace'
  | 'proposal-dispose'
  | 'queued-deliver'
  | 'queued-dispose'

const ReleaseObservationSchema = Schema.Union([
  Schema.Struct({ port: Schema.Literal('changes'), change: FlowChangeSchema }),
  Schema.Struct({
    port: Schema.Literal('acceptedStates'),
    change: FlowStateChangeSchema,
  }),
  Schema.Struct({
    port: Schema.Literal('interactionEvents'),
    event: InteractionEventSchema,
  }),
  Schema.Struct({
    port: Schema.Literal('request'),
    kind: Schema.Literal('ReplaceDocument'),
  }),
])

const ReleaseResultSchema = Schema.Struct({
  observations: Schema.Array(ReleaseObservationSchema),
  capturedAtStart: Schema.Boolean,
  disposed: Schema.Boolean,
  queuedCallbacks: Schema.Number,
})

let releaseProbe:
  | {
      read: () => Promise<typeof ReleaseResultSchema.Encoded>
      dispose: () => void
    }
  | undefined

export const mountNodeRelease = async (mode: ReleaseMode) => {
  releaseProbe?.dispose()

  const state = Effect.runSync(
    decodeFlowDocument({
      nodes: [{ id: 'source', label: 'Release', position: { x: 60, y: 70 } }],
      edges: [],
    })
  )

  const root = document.createElement('section')
  root.dataset.releaseProbe = ''
  root.style.cssText = 'position:absolute;left:0;top:0;width:960px;height:640px'
  const container = document.createElement('div')
  container.id = 'native-release-probe'
  root.append(container)
  document.body.append(root)

  const active = Runtime.embed<typeof ports, never, 'Element'>(
    createProgram(
      container,
      state,
      { x: 0, y: 0, zoom: 1 },
      [],
      'uncontrolled',
      'uncontrolled',
      {},
      undefined,
      'full',
      { ...defaultInteractionOptions, nodeDragThreshold: 5 }
    )
  )

  const client = createFoldkitSnapshotClient(active.ports)
  const observations: (typeof ReleaseObservationSchema.Encoded)[] = []
  const nativeMicrotask = globalThis.queueMicrotask
  const parked: VoidFunction[] = []
  let hold = false
  let disposed = false
  let capturedAtStart = false
  let queuedCallbacks = 0
  const finished = Effect.runSync(Deferred.make<boolean>())
  const complete = () => Effect.runSync(Deferred.succeed(finished, true))

  const microtaskFence = () =>
    Effect.runPromise(
      Effect.callback<boolean>((resume) => {
        nativeMicrotask(() => resume(Effect.succeed(true)))
      })
    )

  const dispose = () => {
    disposed = true
    active.dispose()
  }

  if (mode === 'queued-deliver' || mode === 'queued-dispose') {
    globalThis.queueMicrotask = (task) =>
      nativeMicrotask(() => {
        if (hold) {
          parked.push(task)
        } else {
          task()
        }
      })
  }

  const replacement = {
    ...state,
    nodes: state.nodes.map((node) => ({ ...node, position: { x: 90, y: 70 } })),
  }

  const replace = () => {
    observations.push({ port: 'request', kind: 'ReplaceDocument' })
    active.ports.actions.send(
      HostAction.ReplaceDocument({ document: replacement })
    )
  }

  active.ports.changes.subscribe((change) => {
    observations.push({ port: 'changes', change })

    if (mode === 'proposal-replace') {
      replace()
    }

    if (mode === 'proposal-dispose') {
      dispose()
      complete()
    }

    if (mode === 'queued-deliver' || mode === 'queued-dispose') {
      hold = true
      nativeMicrotask(() =>
        nativeMicrotask(() => {
          queuedCallbacks = parked.length

          if (mode === 'queued-dispose') {
            dispose()
          }

          hold = false
          globalThis.queueMicrotask = nativeMicrotask

          for (const task of parked.splice(0)) {
            task()
          }

          complete()
        })
      )
    }
  })
  active.ports.acceptedStates.subscribe((change) => {
    observations.push({ port: 'acceptedStates', change })

    if (mode === 'acceptance-replace' && change.cause === 'semantic-change') {
      replace()
    }

    if (change.cause === 'document-update') {
      complete()
    }
  })
  active.ports.interactionEvents.subscribe((events) => {
    for (const event of events) {
      if (event.name === 'onNodeDragStart') {
        const node = root.querySelector('[data-node-id="source"]')
        capturedAtStart = node?.hasPointerCapture(1) === true
      }

      if (
        event.name === 'onNodeDragStart' ||
        event.name === 'onNodeDrag' ||
        event.name === 'onNodeDragStop'
      ) {
        observations.push({ port: 'interactionEvents', event })
      }
    }
  })
  releaseProbe = {
    read: async () => {
      await Effect.runPromise(Deferred.await(finished))
      await microtaskFence()
      await microtaskFence()

      return { observations, capturedAtStart, disposed, queuedCallbacks }
    },
    dispose: () => {
      globalThis.queueMicrotask = nativeMicrotask
      hold = false
      client.dispose()
      dispose()

      for (const task of parked.splice(0)) {
        task()
      }

      root.remove()
    },
  }
  await frames(2)
  const mounted = await client.requestVersioned()

  if (mounted.status !== 'succeeded') {
    throw new Error('Native release runtime did not mount')
  }
}

export const readNodeRelease = () => {
  if (releaseProbe === undefined) {
    throw new Error('Native release probe is not mounted')
  }

  return releaseProbe.read()
}
