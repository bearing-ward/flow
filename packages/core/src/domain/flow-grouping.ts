import { getIntersectingNodes } from './flow-intersection.ts'
import type { FlowIntersectionCandidate } from './flow-intersection.ts'
import type { FlowRect } from './flow-visibility.schema.ts'
import type { FlowNode, NodeId } from './flow.schema.ts'

/** Absolute, measured flow-space bounds by node id, such as from internal nodes. */
export type FlowNodeBoundsLookup = ReadonlyMap<string, FlowRect>

export interface FlowGroupNodesOptions {
  readonly nodeIds: readonly string[]
  /** Id of the new parent node. */
  readonly groupId: NodeId
  /** Space between the grouped nodes and the parent border. Defaults to 20. */
  readonly padding?: number | undefined
  readonly label?: string | undefined
  readonly type?: string | undefined
}

export type FlowGroupNodesResult =
  | { readonly kind: 'grouped'; readonly nodes: readonly FlowNode[] }
  | {
      readonly kind: 'rejected'
      readonly reason:
        | 'empty-selection'
        | 'duplicate-group-id'
        | 'missing-bounds'
        | 'mixed-parents'
    }

const unionRect = (rects: readonly FlowRect[]): FlowRect => {
  const minX = Math.min(...rects.map(({ x }) => x))
  const minY = Math.min(...rects.map(({ y }) => y))
  const maxX = Math.max(...rects.map(({ x, width }) => x + width))
  const maxY = Math.max(...rects.map(({ y, height }) => y + height))

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** Move parents in front of their children, keeping the input order otherwise. */
const parentsFirst = (nodes: readonly FlowNode[]): readonly FlowNode[] => {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const placed = new Set<string>()
  const ordered: FlowNode[] = []

  const place = (node: FlowNode, visiting: ReadonlySet<string>): void => {
    if (placed.has(node.id) || visiting.has(node.id)) {
      return
    }

    const parent =
      node.parentId === undefined ? undefined : byId.get(node.parentId)

    if (parent !== undefined) {
      place(parent, new Set([...visiting, node.id]))
    }

    placed.add(node.id)
    ordered.push(node)
  }

  for (const node of nodes) {
    place(node, new Set())
  }

  return ordered
}

/**
 * Wrap nodes that share a parent in a new parent node sized to their measured
 * bounds plus padding. Children keep their absolute positions, become
 * relative to the new parent, and are deselected; the new parent is selected.
 */
export const groupNodes = (
  nodes: readonly FlowNode[],
  bounds: FlowNodeBoundsLookup,
  options: FlowGroupNodesOptions
): FlowGroupNodesResult => {
  const members = nodes.filter((node) => options.nodeIds.includes(node.id))

  if (members.length === 0) {
    return { kind: 'rejected', reason: 'empty-selection' }
  }

  if (nodes.some((node) => node.id === options.groupId)) {
    return { kind: 'rejected', reason: 'duplicate-group-id' }
  }

  const parentIds = new Set(members.map(({ parentId }) => parentId))

  if (parentIds.size > 1) {
    return { kind: 'rejected', reason: 'mixed-parents' }
  }

  const rects = members.map(({ id }) => bounds.get(id))

  const parentId = members[0]?.parentId

  const parentBounds =
    parentId === undefined ? { x: 0, y: 0 } : bounds.get(parentId)

  const memberRects = rects.filter((rect) => rect !== undefined)

  if (memberRects.length !== members.length || parentBounds === undefined) {
    return { kind: 'rejected', reason: 'missing-bounds' }
  }

  const padding = options.padding ?? 20
  const union = unionRect(memberRects)

  const groupRect = {
    x: union.x - padding,
    y: union.y - padding,
    width: union.width + padding * 2,
    height: union.height + padding * 2,
  }

  const groupBase: FlowNode = {
    id: options.groupId,
    label: options.label ?? 'Group',
    position: {
      x: groupRect.x - parentBounds.x,
      y: groupRect.y - parentBounds.y,
    },
    size: { width: groupRect.width, height: groupRect.height },
    selected: true,
  }

  const nested = parentId === undefined ? groupBase : { ...groupBase, parentId }

  const group =
    options.type === undefined ? nested : { ...nested, type: options.type }

  const memberIds = new Set(members.map(({ id }) => id))

  const next = nodes.map((node) => {
    const rect = bounds.get(node.id)

    if (!memberIds.has(node.id) || rect === undefined) {
      return node
    }

    return {
      ...node,
      parentId: options.groupId,
      position: { x: rect.x - groupRect.x, y: rect.y - groupRect.y },
      selected: false,
    }
  })

  const firstMember = next.findIndex(({ id }) => memberIds.has(id))

  return {
    kind: 'grouped',
    nodes: parentsFirst([
      ...next.slice(0, firstMember),
      group,
      ...next.slice(firstMember),
    ]),
  }
}

const descendantIds = (
  nodes: readonly FlowNode[],
  rootId: string
): ReadonlySet<string> => {
  const found = new Set<string>([rootId])
  let grew = true

  while (grew) {
    grew = false

    for (const node of nodes) {
      if (
        node.parentId !== undefined &&
        found.has(node.parentId) &&
        !found.has(node.id)
      ) {
        found.add(node.id)
        grew = true
      }
    }
  }

  return found
}

/**
 * The parent a dropped node belongs in: the smallest candidate that fully
 * contains the node's bounds, skipping the node and its descendants.
 * Undefined means the node belongs at the top level.
 */
export const getDropParentId = (
  nodes: readonly FlowNode[],
  candidates: readonly FlowIntersectionCandidate[],
  nodeId: string,
  nodeBounds: FlowRect
): string | undefined => {
  const blocked = descendantIds(nodes, nodeId)

  const containing = getIntersectingNodes(candidates, nodeBounds, {
    partially: false,
    excludeIds: blocked,
  }).filter(
    ({ bounds }) =>
      bounds.width * bounds.height >= nodeBounds.width * nodeBounds.height
  )

  return containing.toSorted(
    (a, b) =>
      a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height
  )[0]?.id
}

/**
 * Give a node a new parent, or none, keeping its absolute position. The
 * position becomes relative to the new parent and the node moves behind its
 * parent in the node order. Unknown ids, missing bounds and cycles leave the
 * nodes unchanged.
 */
export const reparentNode = (
  nodes: readonly FlowNode[],
  bounds: FlowNodeBoundsLookup,
  nodeId: string,
  parentId?: NodeId
): readonly FlowNode[] => {
  const rect = bounds.get(nodeId)
  const parentRect = parentId === undefined ? undefined : bounds.get(parentId)

  if (
    rect === undefined ||
    (parentId !== undefined &&
      (parentRect === undefined || descendantIds(nodes, nodeId).has(parentId)))
  ) {
    return nodes
  }

  const origin = parentRect ?? { x: 0, y: 0 }

  return parentsFirst(
    nodes.map((node) => {
      if (node.id !== nodeId) {
        return node
      }

      const { parentId: _previous, ...rest } = node
      const position = { x: rect.x - origin.x, y: rect.y - origin.y }

      if (parentId !== undefined) {
        return { ...rest, parentId, position }
      }

      // A parent-relative extent only applies while the node has a parent.
      const { extent, ...detached } = rest

      return extent === 'parent'
        ? { ...detached, position }
        : { ...rest, position }
    })
  )
}
