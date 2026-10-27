import { Predicate } from 'effect'

import type { FlowInternalNode } from './flow-measurement.schema.ts'
import { rotatedFlowBounds } from './flow-node-rotation.ts'
import type { FlowRect } from './flow-visibility.schema.ts'

/** A node, or any other item, with an absolute flow-space rectangle. */
export interface FlowIntersectionCandidate {
  readonly id: string
  readonly bounds: FlowRect
}

export interface FlowIntersectionOptions {
  /**
   * When true (the default), any overlap counts. When false, one rectangle
   * must contain the other.
   */
  readonly partially?: boolean | undefined
  /** Candidate ids to skip, such as the dragged node itself. */
  readonly excludeIds?: Iterable<string> | undefined
}

/** Area shared by two rectangles; zero when they only touch or do not meet. */
export const getRectOverlapArea = (first: FlowRect, second: FlowRect): number =>
  Math.max(
    0,
    Math.min(first.x + first.width, second.x + second.width) -
      Math.max(first.x, second.x)
  ) *
  Math.max(
    0,
    Math.min(first.y + first.height, second.y + second.height) -
      Math.max(first.y, second.y)
  )

/**
 * React Flow's `isNodeIntersecting` rule: any overlap when `partially`, or
 * containment of one rectangle in the other. Zero-area rectangles never
 * intersect, so an empty drag rectangle selects nothing.
 */
export const isRectIntersecting = (
  rect: FlowRect,
  area: FlowRect,
  partially = true
): boolean => {
  const overlap = getRectOverlapArea(rect, area)

  if (overlap <= 0) {
    return false
  }

  return (
    partially ||
    overlap >= rect.width * rect.height ||
    overlap >= area.width * area.height
  )
}

/**
 * Anything with node bounds: an internal node from a host, or an
 * intersection candidate that already carries absolute bounds.
 */
export type FlowBoundedNode = FlowInternalNode | FlowIntersectionCandidate

/** A bounded node or a plain flow-space rectangle. */
export type FlowNodeOrRect = FlowBoundedNode | FlowRect

const isInternalNode = (value: FlowNodeOrRect): value is FlowInternalNode =>
  'absolutePosition' in value

const isCandidate = (
  value: FlowNodeOrRect
): value is FlowIntersectionCandidate => 'bounds' in value

const isBoundedNode = (value: FlowNodeOrRect): value is FlowBoundedNode =>
  isInternalNode(value) || isCandidate(value)

/** Id of a bounded node. */
export const boundedNodeId = (node: FlowBoundedNode): string =>
  isInternalNode(node) ? node.node.id : node.id

/** Absolute flow-space bounds of a bounded node or rectangle. */
export const boundedNodeRect = (nodeOrRect: FlowNodeOrRect): FlowRect => {
  if (isInternalNode(nodeOrRect)) {
    return rotatedFlowBounds(
      {
        x: nodeOrRect.absolutePosition.x,
        y: nodeOrRect.absolutePosition.y,
        width: nodeOrRect.width,
        height: nodeOrRect.height,
      },
      nodeOrRect.node.rotation
    )
  }

  return isCandidate(nodeOrRect) ? nodeOrRect.bounds : nodeOrRect
}

/**
 * React Flow's `isNodeIntersecting`: whether a node or rectangle overlaps
 * `area` at all when `partially`, or one contains the other otherwise.
 */
export const isNodeIntersecting = (
  nodeOrRect: FlowNodeOrRect,
  area: FlowRect,
  partially = true
): boolean => isRectIntersecting(boundedNodeRect(nodeOrRect), area, partially)

const isNodeList = (
  value:
    | FlowNodeOrRect
    | FlowIntersectionOptions
    | readonly FlowBoundedNode[]
    | undefined
): value is readonly FlowBoundedNode[] => Array.isArray(value)

/**
 * React Flow's `getIntersectingNodes(nodeOrRect, partially, nodes)`: the
 * nodes that intersect a node or rectangle, in input order. Partial (the
 * default) takes any overlap; otherwise one must contain the other. A node
 * never intersects itself.
 */
export function getIntersectingNodes<Item extends FlowBoundedNode>(
  nodeOrRect: FlowNodeOrRect,
  partially: boolean | undefined,
  nodes: readonly Item[]
): readonly Item[]

/**
 * Candidates whose bounds intersect `rect`, in input order, skipping
 * `excludeIds`. Kept for callers that already hold candidate lists.
 */
export function getIntersectingNodes<
  Candidate extends FlowIntersectionCandidate,
>(
  candidates: readonly Candidate[],
  rect: FlowRect,
  options?: FlowIntersectionOptions
): readonly Candidate[]

export function getIntersectingNodes(
  first: FlowNodeOrRect | readonly FlowBoundedNode[],
  second: FlowRect | boolean | undefined,
  third?: FlowIntersectionOptions | readonly FlowBoundedNode[]
): readonly FlowBoundedNode[] {
  if (isNodeList(first)) {
    const candidates = first
    const rect = Predicate.isBoolean(second) ? undefined : second
    const options = isNodeList(third) ? {} : (third ?? {})

    if (rect === undefined) {
      return []
    }

    const excluded = new Set(options.excludeIds)
    const partially = options.partially ?? true

    return candidates.filter(
      (candidate) =>
        !excluded.has(boundedNodeId(candidate)) &&
        isRectIntersecting(boundedNodeRect(candidate), rect, partially)
    )
  }

  const nodeOrRect = first
  const nodes = isNodeList(third) ? third : []
  const rect = boundedNodeRect(nodeOrRect)

  const selfId = isBoundedNode(nodeOrRect)
    ? boundedNodeId(nodeOrRect)
    : undefined

  const partially = Predicate.isBoolean(second) ? second : true

  return nodes.filter(
    (node) =>
      boundedNodeId(node) !== selfId &&
      isRectIntersecting(boundedNodeRect(node), rect, partially)
  )
}

/** Absolute measured bounds of an internal node, ready for intersection tests. */
export const getInternalNodeBounds = (
  internal: FlowInternalNode
): FlowIntersectionCandidate => ({
  id: internal.node.id,
  bounds: rotatedFlowBounds(
    {
      x: internal.absolutePosition.x,
      y: internal.absolutePosition.y,
      width: internal.width,
      height: internal.height,
    },
    internal.node.rotation
  ),
})

/** Physical layout box for parent-relative coordinate conversion. */
export const getInternalNodeLayoutBounds = (
  internal: FlowInternalNode
): FlowIntersectionCandidate => ({
  id: internal.node.id,
  bounds: {
    ...internal.absolutePosition,
    width: internal.width,
    height: internal.height,
  },
})
