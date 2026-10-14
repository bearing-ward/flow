import {
  getInternalNodeBounds,
  getIntersectingNodes as getIntersectingCandidates,
  getNodesBounds as getCoreNodesBounds,
  isNodeIntersecting as isCoreNodeIntersecting,
  toFlowObject,
} from '@flow/core'
import type {
  FlowConnectionState,
  FlowEdge,
  FlowIntersectionCandidate,
  FlowInteractivity,
  FlowInternalNode,
  FlowNode,
  FlowNodeData,
  FlowObject,
  FlowRect,
  FlowSnapshot,
  FlowStateChange,
  Viewport,
} from '@flow/core'
import { Predicate } from 'effect'

import type { ViewportObservation } from './mount-flow.ts'

/** The host reads the instance helpers are built from. */
export interface FlowInstanceSource {
  readonly getSnapshot: () => FlowSnapshot
  readonly getNodes: () => readonly FlowNode[]
  readonly getEdges: () => readonly FlowEdge[]
  readonly getViewport: () => Viewport
  readonly getInternalNode: (id: string) => FlowInternalNode | undefined
  readonly getNodesData: (nodeIds: readonly string[]) => readonly FlowNodeData[]
  readonly getInteractivity: () => FlowInteractivity
  readonly getConnection: () => FlowConnectionState
  readonly subscribeState: (
    listener: (change: FlowStateChange) => void
  ) => () => void
  readonly subscribeViewport: (
    listener: (event: ViewportObservation) => void
  ) => () => void
  readonly subscribeInteractivity: (
    listener: (interactivity: FlowInteractivity) => void
  ) => () => void
  readonly subscribeConnection: (
    listener: (state: FlowConnectionState) => void
  ) => () => void
}

/**
 * The state a `useStore` selector reads: accepted nodes (with `measured`),
 * edges and viewport, the interaction switches and the connection gesture.
 */
export interface FlowStoreState {
  readonly nodes: readonly FlowNode[]
  readonly edges: readonly FlowEdge[]
  readonly viewport: Viewport
  readonly interactivity: FlowInteractivity
  readonly connection: FlowConnectionState
}

/** A node, its id, or a flow-space rectangle, as React's instance takes. */
export type FlowNodeOrRect = FlowNode | { readonly id: string } | FlowRect

/** React `useReactFlow()` helpers and `useStore`/`useNodesData` equivalents. */
export interface FlowInstanceApi {
  /** React `getIntersectingNodes(nodeOrRect, partially = true, nodes?)`. */
  readonly getIntersectingNodes: (
    nodeOrRect: FlowNodeOrRect,
    partially?: boolean,
    nodes?: readonly FlowNode[]
  ) => readonly FlowNode[]
  /** React `isNodeIntersecting(nodeOrRect, area, partially = true)`. */
  readonly isNodeIntersecting: (
    nodeOrRect: FlowNodeOrRect,
    area: FlowRect,
    partially?: boolean
  ) => boolean
  /** React `getNodesBounds(nodes)`: nodes or ids, measured and absolute. */
  readonly getNodesBounds: (nodes: readonly (FlowNode | string)[]) => FlowRect
  /** React `toObject()`: detached nodes, edges and viewport. */
  readonly toObject: () => FlowObject
  /** The state `observeStore` selectors read. */
  readonly getStoreState: () => FlowStoreState
  /**
   * React `useStore(selector, equalityFn)`: call `listener` whenever the
   * selected value changes by `equalityFn` (default `Object.is`). The
   * current value is `selector(getStoreState())`; the listener is silent
   * until it changes.
   */
  readonly observeStore: <Selected>(
    selector: (state: FlowStoreState) => Selected,
    listener: (selected: Selected) => void,
    equalityFn?: (previous: Selected, next: Selected) => boolean
  ) => () => void
  /**
   * React `useNodesData(ids)`: call `listener` with `{ id, type, data }`
   * for the ids whenever any of them changes type or data, or appears or
   * disappears.
   */
  readonly observeNodesData: (
    nodeIds: string | readonly string[],
    listener: (data: readonly FlowNodeData[]) => void
  ) => () => void
}

const isRect = (value: FlowNodeOrRect): value is FlowRect =>
  'width' in value && 'height' in value && 'x' in value && !('id' in value)

const nodeDataEqual = (
  previous: readonly FlowNodeData[],
  next: readonly FlowNodeData[]
): boolean =>
  previous.length === next.length &&
  previous.every(
    (entry, index) =>
      entry.id === next[index]?.id &&
      entry.type === next[index]?.type &&
      JSON.stringify(entry.data) === JSON.stringify(next[index]?.data)
  )

/** Build the instance helpers over the host's public reads. */
export const createFlowInstanceApi = (
  source: FlowInstanceSource
): FlowInstanceApi => {
  const candidate = (id: string): FlowIntersectionCandidate | undefined => {
    const internal = source.getInternalNode(id)

    return internal === undefined ? undefined : getInternalNodeBounds(internal)
  }

  const resolve = (
    nodeOrRect: FlowNodeOrRect
  ): FlowIntersectionCandidate | FlowRect | undefined =>
    isRect(nodeOrRect) ? nodeOrRect : candidate(nodeOrRect.id)

  const candidates = (
    nodes: readonly FlowNode[] | undefined
  ): FlowIntersectionCandidate[] =>
    (nodes ?? source.getNodes()).flatMap((node) => {
      const resolved = candidate(node.id)

      return resolved === undefined ? [] : [resolved]
    })

  const getStoreState = (): FlowStoreState => ({
    nodes: source.getNodes(),
    edges: source.getEdges(),
    viewport: source.getViewport(),
    interactivity: source.getInteractivity(),
    connection: source.getConnection(),
  })

  const observeStore: FlowInstanceApi['observeStore'] = (
    selector,
    listener,
    equalityFn = Object.is
  ) => {
    let previous = selector(getStoreState())
    let active = true

    const check = (): void => {
      if (!active) {
        return
      }

      const next = selector(getStoreState())

      if (equalityFn(previous, next)) {
        return
      }

      previous = next
      listener(next)
    }

    const stops = [
      source.subscribeState(check),
      source.subscribeViewport(check),
      source.subscribeInteractivity(check),
      source.subscribeConnection(check),
    ]

    return () => {
      active = false

      for (const stop of stops) {
        stop()
      }
    }
  }

  return {
    getIntersectingNodes: (nodeOrRect, partially, nodes) => {
      const target = resolve(nodeOrRect)

      if (target === undefined) {
        return []
      }

      const hits = new Set(
        getIntersectingCandidates(
          target,
          partially ?? true,
          candidates(nodes)
        ).map(({ id }) => id)
      )

      return (nodes ?? source.getNodes()).filter(({ id }) => hits.has(id))
    },
    isNodeIntersecting: (nodeOrRect, area, partially = true) => {
      const target = resolve(nodeOrRect)

      return (
        target !== undefined && isCoreNodeIntersecting(target, area, partially)
      )
    },
    getNodesBounds: (nodes) =>
      getCoreNodesBounds(
        nodes.flatMap((node) => {
          const resolved = candidate(Predicate.isString(node) ? node : node.id)

          return resolved === undefined ? [] : [resolved]
        })
      ),
    toObject: () => toFlowObject(source.getSnapshot()),
    getStoreState,
    observeStore,
    observeNodesData: (nodeIds, listener) =>
      observeStore(
        () =>
          source.getNodesData(
            Predicate.isString(nodeIds) ? [nodeIds] : nodeIds
          ),
        listener,
        nodeDataEqual
      ),
  }
}
