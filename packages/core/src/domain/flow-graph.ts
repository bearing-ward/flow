import { constrainNodePosition } from './flow-node-extent.schema.ts'
import type { NodeExtent } from './flow-node-extent.schema.ts'
import { nodeAnchorToTopLeft, resolveNodeOrigin } from './flow-origin.schema.ts'
import type { NodeOrigin } from './flow-origin.schema.ts'
import type { MeasuredNode } from './flow-runtime.schema.ts'
import type { HandleId } from './flow-values.ts'
import type { FlowRect } from './flow-visibility.schema.ts'
import type {
  FlowDocument,
  FlowEdge,
  FlowNode,
  NodeId,
  XYPosition,
} from './flow.schema.ts'

export interface FlowGraphNode {
  readonly id: NodeId
  readonly node: FlowNode
  readonly documentIndex: number
  readonly parentId: NodeId | undefined
  readonly absolutePosition: XYPosition
  readonly dimensions: { readonly width: number; readonly height: number }
  readonly hidden: boolean
}

export interface FlowGraphView {
  readonly document: FlowDocument
  readonly nodes: ReadonlyMap<NodeId, FlowGraphNode>
  readonly children: ReadonlyMap<NodeId, readonly NodeId[]>
  readonly orderedNodes: readonly FlowGraphNode[]
}

const fallbackDimensions = { width: 150, height: 44 } as const

// React getNodeDimensions prefers `node.measured` over declared width/height.
const measuredDimensions = (
  node: FlowNode
): { readonly width: number; readonly height: number } | undefined => {
  const width = node.measured?.width
  const height = node.measured?.height

  return width !== undefined && height !== undefined && width > 0 && height > 0
    ? { width, height }
    : undefined
}

// Pinned store.ts:154-170,449-469. Layout fallback is not measurement.
const adoptedNodeTopLeft = (
  node: FlowNode,
  measurement: MeasuredNode | undefined,
  extent: NodeExtent,
  origin: NodeOrigin
): XYPosition => {
  const dimensions = {
    width: measurement?.width ?? node.measured?.width ?? node.size?.width ?? 0,
    height:
      measurement?.height ?? node.measured?.height ?? node.size?.height ?? 0,
  }

  return nodeAnchorToTopLeft(
    constrainNodePosition(node.position, dimensions, extent, origin),
    dimensions,
    origin
  )
}

/** Build physical geometry; document positions and overrides are parent-relative anchors. */
export const createFlowGraph = (
  document: FlowDocument,
  measurements: ReadonlyMap<NodeId, MeasuredNode> = new Map(),
  positionOverrides: ReadonlyMap<NodeId, XYPosition> = new Map(),
  fallback: {
    readonly width: number
    readonly height: number
  } = fallbackDimensions,
  nodeExtent?: NodeExtent
): FlowGraphView => {
  const documentIndex = new Map<NodeId, number>()
  const nodeById = new Map<NodeId, FlowNode>()
  const childLists = new Map<NodeId, NodeId[]>()

  for (const [index, node] of document.nodes.entries()) {
    documentIndex.set(node.id, index)
    nodeById.set(node.id, node)

    if (node.parentId !== undefined) {
      const siblings = childLists.get(node.parentId) ?? []
      siblings.push(node.id)
      childLists.set(node.parentId, siblings)
    }
  }

  const graphNodes = new Map<NodeId, FlowGraphNode>()

  const resolve = (id: NodeId): FlowGraphNode => {
    const cached = graphNodes.get(id)

    if (cached !== undefined) {
      return cached
    }

    const node = nodeById.get(id)

    if (node === undefined) {
      throw new Error(`Flow graph is missing node ${id}`)
    }

    const measurement = measurements.get(id)
    const documentOrder = documentIndex.get(id)

    if (documentOrder === undefined) {
      throw new Error(`Flow graph is missing document index for node ${id}`)
    }

    const parent =
      node.parentId === undefined ? undefined : resolve(node.parentId)

    const position = positionOverrides.get(id) ?? node.position

    const dimensions =
      measurement !== undefined &&
      measurement.width > 0 &&
      measurement.height > 0
        ? { width: measurement.width, height: measurement.height }
        : (measuredDimensions(node) ?? node.size ?? fallback)

    const origin = resolveNodeOrigin(node, document)

    const adoptsExtent =
      nodeExtent !== undefined &&
      parent === undefined &&
      !positionOverrides.has(id)

    const topLeft = adoptsExtent
      ? adoptedNodeTopLeft(node, measurement, nodeExtent, origin)
      : nodeAnchorToTopLeft(position, dimensions, origin)

    const resolved: FlowGraphNode = {
      id,
      node,
      documentIndex: documentOrder,
      parentId: node.parentId,
      absolutePosition:
        parent === undefined
          ? topLeft
          : {
              x: parent.absolutePosition.x + topLeft.x,
              y: parent.absolutePosition.y + topLeft.y,
            },
      dimensions,
      hidden: node.hidden === true || parent?.hidden === true,
    }

    graphNodes.set(id, resolved)

    return resolved
  }

  for (const node of document.nodes) {
    resolve(node.id)
  }

  const compareSiblings = (first: NodeId, second: NodeId): number => {
    const a = graphNodes.get(first)
    const b = graphNodes.get(second)

    if (a === undefined || b === undefined) {
      throw new Error('Flow graph sibling references a missing node')
    }

    return (
      (a.node.zIndex ?? 0) - (b.node.zIndex ?? 0) ||
      a.documentIndex - b.documentIndex
    )
  }

  for (const siblings of childLists.values()) {
    siblings.sort(compareSiblings)
  }

  const roots = document.nodes
    .filter((node) => node.parentId === undefined)
    .map((node) => node.id)
    .toSorted(compareSiblings)

  const orderedNodes: FlowGraphNode[] = []

  const appendSubtree = (id: NodeId): void => {
    const node = graphNodes.get(id)

    if (node === undefined) {
      throw new Error(`Flow graph is missing ordered node ${id}`)
    }

    orderedNodes.push(node)

    for (const childId of childLists.get(id) ?? []) {
      appendSubtree(childId)
    }
  }

  for (const rootId of roots) {
    appendSubtree(rootId)
  }

  return { document, nodes: graphNodes, children: childLists, orderedNodes }
}

export const graphNode = (
  graph: FlowGraphView,
  id: NodeId
): FlowGraphNode | undefined => graph.nodes.get(id)

export const graphAncestors = (
  graph: FlowGraphView,
  id: NodeId
): readonly FlowGraphNode[] => {
  const result: FlowGraphNode[] = []
  let current = graph.nodes.get(id)

  while (current?.parentId !== undefined) {
    current = graph.nodes.get(current.parentId)

    if (current !== undefined) {
      result.push(current)
    }
  }

  return result
}

export const graphDescendants = (
  graph: FlowGraphView,
  id: NodeId
): readonly FlowGraphNode[] => {
  const result: FlowGraphNode[] = []

  const visit = (parentId: NodeId): void => {
    for (const childId of graph.children.get(parentId) ?? []) {
      const child = graph.nodes.get(childId)

      if (child !== undefined) {
        result.push(child)
      }

      visit(childId)
    }
  }

  visit(id)

  return result
}

export const graphNodeBounds = (node: FlowGraphNode) => ({
  x: node.absolutePosition.x,
  y: node.absolutePosition.y,
  width: node.dimensions.width,
  height: node.dimensions.height,
})

export const graphBounds = (
  graph: FlowGraphView,
  ids?: ReadonlySet<NodeId>,
  options: { readonly includeHidden?: boolean } = {}
) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of graph.orderedNodes) {
    if (
      (node.hidden && options.includeHidden !== true) ||
      (ids !== undefined && !ids.has(node.id))
    ) {
      continue
    }

    const bounds = graphNodeBounds(node)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  }

  return minX === Infinity
    ? undefined
    : { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

const intersects = (a: FlowRect, b: FlowRect): boolean =>
  a.x <= b.x + b.width &&
  a.x + a.width >= b.x &&
  a.y <= b.y + b.height &&
  a.y + a.height >= b.y

export const graphNodesIntersecting = (
  graph: FlowGraphView,
  rect: FlowRect
): readonly FlowGraphNode[] =>
  graph.orderedNodes.filter(
    (node) => !node.hidden && intersects(graphNodeBounds(node), rect)
  )

/** Return incoming edges for one graph node; this Flow API does not return neighboring nodes. */
export const graphIncomers = (
  graph: FlowGraphView,
  id: NodeId
): readonly FlowEdge[] =>
  graph.document.edges.filter((edge) => edge.target === id)

/** Return outgoing edges for one graph node; this Flow API does not return neighboring nodes. */
export const graphOutgoers = (
  graph: FlowGraphView,
  id: NodeId
): readonly FlowEdge[] =>
  graph.document.edges.filter((edge) => edge.source === id)

/** Return supplied nodes with edges directed into the selected node, in node input order. */
export const getIncomers = (
  node: Pick<FlowNode, 'id'>,
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[]
): readonly FlowNode[] => {
  const incomingIds = new Set<NodeId>()

  for (const edge of edges) {
    if (edge.target === node.id) {
      incomingIds.add(edge.source)
    }
  }

  return nodes.filter((candidate) => incomingIds.has(candidate.id))
}

/** Return supplied nodes with edges directed out of the selected node, in node input order. */
export const getOutgoers = (
  node: Pick<FlowNode, 'id'>,
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[]
): readonly FlowNode[] => {
  const outgoingIds = new Set<NodeId>()

  for (const edge of edges) {
    if (edge.source === node.id) {
      outgoingIds.add(edge.target)
    }
  }

  return nodes.filter((candidate) => outgoingIds.has(candidate.id))
}

/** Return edges incident to at least one supplied node, in edge input order. */
export const getConnectedEdges = (
  nodes: readonly Pick<FlowNode, 'id'>[],
  edges: readonly FlowEdge[]
): readonly FlowEdge[] => {
  const nodeIds = new Set(nodes.map((node) => node.id))

  return edges.filter(
    (edge) => nodeIds.has(edge.source) || nodeIds.has(edge.target)
  )
}

/** Return edges attached to one node handle, preserving document edge order. */
export const getHandleConnections = (
  nodeId: NodeId,
  handleId: HandleId | undefined,
  kind: 'source' | 'target',
  edges: readonly FlowEdge[]
): readonly FlowEdge[] =>
  edges.filter((edge) =>
    kind === 'source'
      ? edge.source === nodeId &&
        (handleId === undefined || edge.sourceHandle === handleId)
      : edge.target === nodeId &&
        (handleId === undefined || edge.targetHandle === handleId)
  )

export const graphResizeChildExtent = (
  graph: FlowGraphView,
  nodeId: NodeId
): NodeExtent | undefined => {
  const parent = graph.nodes.get(nodeId)

  if (parent === undefined) {
    return undefined
  }

  const parentPosition = nodeAnchorToTopLeft(
    parent.node.position,
    parent.dimensions,
    resolveNodeOrigin(parent.node, graph.document)
  )

  let extent: NodeExtent | undefined

  for (const childId of graph.children.get(nodeId) ?? []) {
    const child = graph.nodes.get(childId)

    if (child === undefined || child.node.extent !== 'parent') {
      continue
    }

    const childPosition = nodeAnchorToTopLeft(
      child.node.position,
      child.dimensions,
      resolveNodeOrigin(child.node, graph.document)
    )

    const minX = parentPosition.x + childPosition.x
    const minY = parentPosition.y + childPosition.y
    const maxX = minX + child.dimensions.width
    const maxY = minY + child.dimensions.height

    extent =
      extent === undefined
        ? { minX, minY, maxX, maxY }
        : {
            minX: Math.min(extent.minX, minX),
            minY: Math.min(extent.minY, minY),
            maxX: Math.max(extent.maxX, maxX),
            maxY: Math.max(extent.maxY, maxY),
          }
  }

  return extent
}
