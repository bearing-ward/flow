import { FlowSnapshotSchema, NodeIdSchema, selectNodesData } from '@flow/core'
import type {
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowNodeData,
  Viewport,
} from '@flow/core'
import { Equal, Schema } from 'effect'
import type { Runtime } from 'foldkit'

import type { ports } from './application.ts'
import { createFoldkitSnapshotClient } from './snapshot-client.ts'

type RuntimePorts = Runtime.EmbedHandle<typeof ports>['ports']

/** The Runtime ports the store reads its state from. */
export type FoldkitStorePorts = Pick<
  RuntimePorts,
  | 'snapshotRequests'
  | 'snapshots'
  | 'snapshotFailures'
  | 'versionedSnapshotRequests'
  | 'versionedSnapshots'
  | 'acceptedStates'
  | 'viewportResults'
  | 'viewportEvents'
  | 'measurementResults'
>

/**
 * A serializable view of React Flow's store state for one Runtime: the
 * accepted nodes and edges, the viewport (also as React's `transform`
 * tuple) and node measurement readiness. `ready` is false until the first
 * state arrives from the Runtime.
 */
export interface FoldkitFlowState {
  readonly ready: boolean
  readonly nodes: readonly FlowNode[]
  readonly edges: readonly FlowEdge[]
  readonly viewport: Viewport
  readonly transform: readonly [number, number, number]
  readonly nodesInitialized: boolean
}

/**
 * React Flow's `useStore(selector, equalityFn)` and `useNodesData(ids)` for
 * a Foldkit host. Listeners run only when the selected value changes under
 * the equality function, the way React re-renders a `useStore` consumer.
 */
export interface FoldkitStore {
  readonly getState: () => FoldkitFlowState
  /** Resolves with the first state the Runtime reports. */
  readonly ready: Promise<FoldkitFlowState>
  /**
   * Listen to one selected value. The listener receives the new and previous
   * selection whenever `equality` (default `Object.is`) says they differ.
   */
  readonly select: <Selected>(
    selector: (state: FoldkitFlowState) => Selected,
    listener: (selected: Selected, previous: Selected) => void,
    equality?: (previous: Selected, next: Selected) => boolean
  ) => () => void
  /** Listen to every state change. */
  readonly subscribe: (
    listener: (state: FoldkitFlowState) => void
  ) => () => void
  /**
   * Observe the `{ id, type, data }` of some nodes, in the given order. It
   * emits once the first state is known, then only when one of those nodes'
   * type or data changes structurally, or one appears or disappears.
   */
  readonly observeNodesData: (
    nodeIds: readonly string[],
    listener: (nodesData: readonly FlowNodeData[]) => void
  ) => () => void
  readonly dispose: () => void
}

const stateOf = (
  document: Pick<FlowDocument, 'nodes' | 'edges'>,
  viewport: Viewport,
  nodesInitialized: boolean,
  ready: boolean
): FoldkitFlowState => ({
  ready,
  nodes: document.nodes,
  edges: document.edges,
  viewport,
  transform: [viewport.x, viewport.y, viewport.zoom],
  nodesInitialized,
})

const sameViewport = (first: Viewport, second: Viewport): boolean =>
  first.x === second.x && first.y === second.y && first.zoom === second.zoom

/** Build a store over one Runtime's published state. */
export const createFoldkitStore = (
  runtimePorts: FoldkitStorePorts
): FoldkitStore => {
  const snapshots = createFoldkitSnapshotClient(runtimePorts)

  const listeners = new Set<(state: FoldkitFlowState) => void>()

  let state = stateOf(
    { nodes: [], edges: [] },
    { x: 0, y: 0, zoom: 1 },
    false,
    false
  )

  let readinessKnown = false

  let disposed = false

  const { promise: ready, resolve: resolveReady } =
    Promise.withResolvers<FoldkitFlowState>()

  const publish = (next: FoldkitFlowState): void => {
    if (disposed) {
      return
    }

    const wasReady = state.ready
    state = next

    if (!wasReady && next.ready) {
      resolveReady(next)
    }

    for (const listener of listeners) {
      listener(next)
    }
  }

  const stops = [
    runtimePorts.acceptedStates.subscribe((change) => {
      const { document, viewport } = Schema.decodeUnknownSync(
        FlowSnapshotSchema
      )(change.current)

      publish(stateOf(document, viewport, state.nodesInitialized, true))
    }),
    // A `start` event carries the viewport before the move and can arrive
    // after the accepted state, so only `change` and `end` update the store.
    runtimePorts.viewportEvents.subscribe(({ kind, viewport }) => {
      if (
        kind !== 'start' &&
        state.ready &&
        !sameViewport(viewport, state.viewport)
      ) {
        publish(stateOf(state, viewport, state.nodesInitialized, true))
      }
    }),
    runtimePorts.viewportResults.subscribe(({ status, viewport }) => {
      if (
        state.ready &&
        (status === 'accepted' || status === 'unchanged') &&
        !sameViewport(viewport, state.viewport)
      ) {
        publish(stateOf(state, viewport, state.nodesInitialized, true))
      }
    }),
    runtimePorts.measurementResults.subscribe(({ nodesInitialized }) => {
      readinessKnown = true

      if (nodesInitialized === state.nodesInitialized) {
        return
      }

      const next = stateOf(state, state.viewport, nodesInitialized, state.ready)

      // Before the first state, keep the readiness for it without publishing.
      if (next.ready) {
        publish(next)
      } else {
        state = next
      }
    }),
  ]

  const loadInitialState = async (): Promise<void> => {
    const result = await snapshots.requestVersioned({})

    if (result.status !== 'succeeded' || state.ready) {
      return
    }

    const { snapshot, nodesInitialized } = result.response

    publish(
      stateOf(
        snapshot.document,
        snapshot.viewport,
        readinessKnown ? state.nodesInitialized : nodesInitialized,
        true
      )
    )
  }

  void loadInitialState()

  const subscribe = (
    listener: (next: FoldkitFlowState) => void
  ): (() => void) => {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  }

  const select = <Selected>(
    selector: (current: FoldkitFlowState) => Selected,
    listener: (selected: Selected, previous: Selected) => void,
    equality: (previous: Selected, next: Selected) => boolean = Object.is
  ): (() => void) => {
    let selected = selector(state)

    return subscribe((next) => {
      const candidate = selector(next)

      if (equality(selected, candidate)) {
        return
      }

      const previous = selected
      selected = candidate
      listener(candidate, previous)
    })
  }

  const observeNodesData: FoldkitStore['observeNodesData'] = (
    nodeIds,
    listener
  ) => {
    const ids = nodeIds.map((id) => NodeIdSchema.make(id))

    const project = (current: FoldkitFlowState) =>
      selectNodesData({ nodes: current.nodes, edges: current.edges }, ids)

    if (state.ready) {
      listener(project(state))

      return select(project, listener, Equal.equals)
    }

    let stopSelect: (() => void) | undefined

    const stopReady = subscribe((next) => {
      if (!next.ready || stopSelect !== undefined) {
        return
      }

      listener(project(next))
      stopSelect = select(project, listener, Equal.equals)
    })

    return () => {
      stopReady()
      stopSelect?.()
    }
  }

  return {
    getState: () => state,
    ready,
    select,
    subscribe,
    observeNodesData,
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      snapshots.dispose()

      for (const stop of stops) {
        stop()
      }

      listeners.clear()
    },
  }
}
