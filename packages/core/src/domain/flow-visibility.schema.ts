import { Schema as S } from 'effect'

import { graphNode, graphNodeBounds } from './flow-graph.ts'
import type { FlowGraphView } from './flow-graph.ts'
import type { SelectionSetChange, Viewport } from './flow-runtime.schema.ts'
import type { EdgeId, NodeId } from './flow-values.ts'
import type { FlowEdge } from './flow.schema.ts'

export const FlowRectSchema = S.Struct({
  x: S.Number,
  y: S.Number,
  width: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  height: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
})

export type FlowRect = typeof FlowRectSchema.Type

export const SelectionModeSchema = S.Literals(['full', 'partial'])

export type SelectionMode = typeof SelectionModeSchema.Type

export const viewportFlowRect = (
  viewport: Viewport,
  screenWidth: number,
  screenHeight: number,
  overscan = 32
): FlowRect => ({
  x: (-viewport.x - overscan) / viewport.zoom,
  y: (-viewport.y - overscan) / viewport.zoom,
  width: (screenWidth + 2 * overscan) / viewport.zoom,
  height: (screenHeight + 2 * overscan) / viewport.zoom,
})

export const intersectsFlowRect = (
  first: FlowRect,
  second: FlowRect
): boolean =>
  first.x <= second.x + second.width &&
  first.x + first.width >= second.x &&
  first.y <= second.y + second.height &&
  first.y + first.height >= second.y

export const nodeIntersectsViewport = (
  graph: FlowGraphView,
  nodeId: NodeId,
  viewportRect: FlowRect
): boolean => {
  const node = graphNode(graph, nodeId)

  return (
    node !== undefined &&
    !node.hidden &&
    intersectsFlowRect(graphNodeBounds(node), viewportRect)
  )
}

export const edgeIntersectsViewport = (
  graph: FlowGraphView,
  edge: FlowEdge,
  viewportRect: FlowRect
): boolean => {
  if (edge.hidden === true) {
    return false
  }

  const source = graphNode(graph, edge.source)
  const target = graphNode(graph, edge.target)

  if (
    source === undefined ||
    target === undefined ||
    source.hidden ||
    target.hidden
  ) {
    return false
  }

  const sourceBounds = graphNodeBounds(source)
  const targetBounds = graphNodeBounds(target)

  const x = Math.min(sourceBounds.x, targetBounds.x)
  const y = Math.min(sourceBounds.y, targetBounds.y)

  const right = Math.max(
    sourceBounds.x + sourceBounds.width,
    targetBounds.x + targetBounds.width
  )

  const bottom = Math.max(
    sourceBounds.y + sourceBounds.height,
    targetBounds.y + targetBounds.height
  )

  return intersectsFlowRect(
    { x, y, width: right - x, height: bottom - y },
    viewportRect
  )
}

export const selectionInRect = (
  graph: FlowGraphView,
  rect: FlowRect,
  mode: SelectionMode = 'full'
): SelectionSetChange => {
  const nodeIds: NodeId[] = []

  for (const entry of graph.orderedNodes) {
    const { node } = entry

    if (entry.hidden || node.selectable === false) {
      continue
    }

    const bounds = graphNodeBounds(entry)

    const matches =
      mode === 'partial'
        ? bounds.x < rect.x + rect.width &&
          bounds.x + bounds.width > rect.x &&
          bounds.y < rect.y + rect.height &&
          bounds.y + bounds.height > rect.y
        : bounds.x >= rect.x &&
          bounds.y >= rect.y &&
          bounds.x + bounds.width <= rect.x + rect.width &&
          bounds.y + bounds.height <= rect.y + rect.height

    if (matches) {
      nodeIds.push(node.id)
    }
  }

  const selectedNodes = new Set(nodeIds)

  const edgeIds: EdgeId[] = graph.document.edges
    .filter(
      (edge) =>
        edge.hidden !== true &&
        edge.selectable !== false &&
        graphNode(graph, edge.source)?.hidden === false &&
        graphNode(graph, edge.target)?.hidden === false &&
        (selectedNodes.has(edge.source) || selectedNodes.has(edge.target))
    )
    .map((edge) => edge.id)

  return { kind: 'selection-set', nodeIds, edgeIds }
}

export const orderFlowEdges = (edges: readonly FlowEdge[]): FlowEdge[] =>
  edges
    .map((edge, index) => ({ edge, index }))
    .toSorted((first, second) => {
      const firstLevel =
        (first.edge.zIndex ?? 0) + (first.edge.selected === true ? 1000 : 0)

      const secondLevel =
        (second.edge.zIndex ?? 0) + (second.edge.selected === true ? 1000 : 0)

      return firstLevel - secondLevel || first.index - second.index
    })
    .map(({ edge }) => edge)
