import { graphNodeBounds } from './flow-graph.ts'
import type { FlowGraphView } from './flow-graph.ts'
import type { Viewport } from './flow-runtime.schema.ts'
import type { FlowEdge, NodeId, XYPosition } from './flow.schema.ts'

export interface FlowToolbarAnchor {
  readonly id: string
  readonly position: XYPosition
}

export interface FlowToolbarAnchors {
  readonly nodes: readonly FlowToolbarAnchor[]
  readonly edges: readonly FlowToolbarAnchor[]
}

const toScreen = (position: XYPosition, viewport: Viewport): XYPosition => ({
  x: viewport.x + position.x * viewport.zoom,
  y: viewport.y + position.y * viewport.zoom,
})

export const nodeToolbarAnchor = (
  graph: FlowGraphView,
  nodeId: NodeId,
  viewport: Viewport
): FlowToolbarAnchor | undefined => {
  const node = graph.nodes.get(nodeId)

  if (node === undefined || node.hidden) {
    return undefined
  }

  const bounds = graphNodeBounds(node)

  return {
    id: nodeId,
    position: toScreen(
      { x: bounds.x + bounds.width / 2, y: bounds.y },
      viewport
    ),
  }
}

export const edgeToolbarAnchor = (
  edge: FlowEdge,
  graph: FlowGraphView,
  viewport: Viewport
): FlowToolbarAnchor | undefined => {
  const source = graph.nodes.get(edge.source)
  const target = graph.nodes.get(edge.target)

  if (
    source === undefined ||
    target === undefined ||
    source.hidden ||
    target.hidden ||
    edge.hidden
  ) {
    return undefined
  }

  const a = graphNodeBounds(source)
  const b = graphNodeBounds(target)

  return {
    id: edge.id,
    position: toScreen(
      {
        x: (a.x + a.width / 2 + b.x + b.width / 2) / 2,
        y: (a.y + a.height / 2 + b.y + b.height / 2) / 2,
      },
      viewport
    ),
  }
}

export const flowToolbarAnchors = (
  graph: FlowGraphView,
  viewport: Viewport
): FlowToolbarAnchors => ({
  nodes: graph.orderedNodes.flatMap((node) => {
    const anchor = nodeToolbarAnchor(graph, node.id, viewport)

    return anchor === undefined ? [] : [anchor]
  }),
  edges: graph.document.edges.flatMap((edge) => {
    const anchor = edgeToolbarAnchor(edge, graph, viewport)

    return anchor === undefined ? [] : [anchor]
  }),
})
