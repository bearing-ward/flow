import { createFlowGraph } from '@flow/core'
import type {
  FlowDocument,
  FlowGraphView,
  MeasuredNode,
  NodeId,
  XYPosition,
} from '@flow/core'

interface CachedGraph {
  readonly document: FlowDocument
  readonly measurements: ReadonlyMap<NodeId, MeasuredNode>
  readonly positions: ReadonlyMap<NodeId, XYPosition>
  readonly graph: FlowGraphView
}

const samePositions = (
  cached: ReadonlyMap<NodeId, XYPosition>,
  current: ReadonlyMap<NodeId, XYPosition>
): boolean =>
  cached.size === current.size &&
  [...current].every(([id, point]) => {
    const previous = cached.get(id)

    return previous?.x === point.x && previous.y === point.y
  })

/**
 * Memoize `createFlowGraph` per accepted document and measurement snapshot.
 * The host replaces both by identity when they change. Rendered position
 * overrides live in a mutable map, so they are compared by value, which is
 * far cheaper than rebuilding the graph on every connection pointer move.
 */
export const createFlowGraphCache = () => {
  let cached: CachedGraph | undefined

  return (
    document: FlowDocument,
    measurements: ReadonlyMap<NodeId, MeasuredNode>,
    positions: ReadonlyMap<NodeId, XYPosition>
  ): FlowGraphView => {
    if (
      cached?.document === document &&
      cached.measurements === measurements &&
      samePositions(cached.positions, positions)
    ) {
      return cached.graph
    }

    const snapshot = new Map(
      [...positions].map(([id, point]) => [id, { x: point.x, y: point.y }])
    )

    const graph = createFlowGraph(document, measurements, snapshot)
    cached = { document, measurements, positions: snapshot, graph }

    return graph
  }
}
