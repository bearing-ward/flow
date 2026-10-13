import type { FlowInternalNode } from './flow-measurement.schema.ts'
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
 * Candidates whose bounds intersect `rect`, in input order. This is the
 * host-neutral core of React Flow's `getIntersectingNodes(nodeOrRect,
 * partially, nodes)`; hosts supply measured absolute bounds.
 */
export const getIntersectingNodes = <
  Candidate extends FlowIntersectionCandidate,
>(
  candidates: readonly Candidate[],
  rect: FlowRect,
  options: FlowIntersectionOptions = {}
): readonly Candidate[] => {
  const excluded = new Set(options.excludeIds)
  const partially = options.partially ?? true

  return candidates.filter(
    (candidate) =>
      !excluded.has(candidate.id) &&
      isRectIntersecting(candidate.bounds, rect, partially)
  )
}

/** Absolute measured bounds of an internal node, ready for intersection tests. */
export const getInternalNodeBounds = (
  internal: FlowInternalNode
): FlowIntersectionCandidate => ({
  id: internal.node.id,
  bounds: {
    x: internal.absolutePosition.x,
    y: internal.absolutePosition.y,
    width: internal.width,
    height: internal.height,
  },
})
