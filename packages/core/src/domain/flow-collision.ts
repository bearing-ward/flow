import type { FlowIntersectionCandidate } from './flow-intersection.ts'
import type { FlowRect } from './flow-visibility.schema.ts'

export interface FlowCollisionOptions {
  /** Passes over all pairs before giving up. Defaults to 50. */
  readonly maxIterations?: number | undefined
  /** Overlap, in flow units on both axes, below which nodes count as apart. Defaults to 0.5. */
  readonly overlapThreshold?: number | undefined
  /** Extra space to keep between nodes. Defaults to 0. */
  readonly margin?: number | undefined
  /** Nodes that never move, such as the node just dropped. */
  readonly fixedIds?: Iterable<string> | undefined
}

interface MutableRect {
  x: number
  y: number
  width: number
  height: number
}

/** Direction to push along an axis; coincident centers push right or down. */
const pushDirection = (delta: number): number => (delta < 0 ? -1 : 1)

/** Share of the separating move that the first node takes. */
const firstShare = (firstFixed: boolean, secondFixed: boolean): number => {
  if (secondFixed) {
    return 1
  }

  return firstFixed ? 0 : 0.5
}

/** Separate one overlapping pair in place; true when either moved. */
const separatePair = (
  a: MutableRect,
  b: MutableRect,
  share: number,
  threshold: number,
  margin: number
): boolean => {
  const dx = b.x + b.width / 2 - (a.x + a.width / 2)
  const dy = b.y + b.height / 2 - (a.y + a.height / 2)
  const overlapX = (a.width + b.width) / 2 + margin - Math.abs(dx)
  const overlapY = (a.height + b.height) / 2 + margin - Math.abs(dy)

  if (overlapX <= threshold || overlapY <= threshold) {
    return false
  }

  const alongX = overlapX < overlapY
  const axis = alongX ? 'x' : 'y'
  const move = (alongX ? overlapX : overlapY) * pushDirection(alongX ? dx : dy)

  a[axis] -= move * share
  b[axis] += move * (1 - share)

  return true
}

/**
 * Push overlapping nodes apart, modeled on React Flow's Node Collisions
 * example. Each pass separates every overlapping pair along the axis that
 * needs the smaller move; both nodes move half the distance unless one is
 * fixed. Passes repeat until no pair overlaps by more than
 * `overlapThreshold` or `maxIterations` runs out. Returns the candidates in
 * input order with their resolved bounds.
 */
export const resolveNodeCollisions = <
  Candidate extends FlowIntersectionCandidate,
>(
  candidates: readonly Candidate[],
  options: FlowCollisionOptions = {}
): readonly Candidate[] => {
  const maxIterations = options.maxIterations ?? 50
  const threshold = options.overlapThreshold ?? 0.5
  const margin = options.margin ?? 0
  const fixed = new Set(options.fixedIds)

  const boxes = candidates.map(({ id, bounds }) => ({
    rect: { ...bounds },
    fixed: fixed.has(id),
  }))

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let moved = false

    for (const [index, first] of boxes.entries()) {
      for (const second of boxes.slice(index + 1)) {
        if (
          !(first.fixed && second.fixed) &&
          separatePair(
            first.rect,
            second.rect,
            firstShare(first.fixed, second.fixed),
            threshold,
            margin
          )
        ) {
          moved = true
        }
      }
    }

    if (!moved) {
      break
    }
  }

  return candidates.map((candidate, index) => {
    const bounds: FlowRect = boxes[index]?.rect ?? candidate.bounds

    return { ...candidate, bounds }
  })
}

export type FlowProximityMeasure = 'position' | 'center'

export interface FlowClosestNodeOptions {
  /** Only nodes strictly closer than this count. */
  readonly maxDistance: number
  /** Candidate ids to skip, such as the dragged node itself. */
  readonly excludeIds?: Iterable<string> | undefined
  /**
   * `position` (the default) compares top-left corners, like React Flow's
   * Proximity Connect example; `center` compares rectangle centers.
   */
  readonly measure?: FlowProximityMeasure | undefined
}

export interface FlowClosestNode<Candidate extends FlowIntersectionCandidate> {
  readonly node: Candidate
  readonly distance: number
}

const referencePoint = (rect: FlowRect, measure: FlowProximityMeasure) =>
  measure === 'center'
    ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    : { x: rect.x, y: rect.y }

/**
 * The candidate closest to `bounds`, within `maxDistance`. Ties keep the
 * earlier candidate. Undefined when none is close enough.
 */
export const getClosestNode = <Candidate extends FlowIntersectionCandidate>(
  candidates: readonly Candidate[],
  bounds: FlowRect,
  options: FlowClosestNodeOptions
): FlowClosestNode<Candidate> | undefined => {
  const measure = options.measure ?? 'position'
  const excluded = new Set(options.excludeIds)
  const origin = referencePoint(bounds, measure)
  let closest: FlowClosestNode<Candidate> | undefined

  for (const node of candidates) {
    if (excluded.has(node.id)) {
      continue
    }

    const point = referencePoint(node.bounds, measure)
    const distance = Math.hypot(point.x - origin.x, point.y - origin.y)

    if (
      distance < options.maxDistance &&
      (closest === undefined || distance < closest.distance)
    ) {
      closest = { node, distance }
    }
  }

  return closest
}

export interface FlowProximityConnection {
  readonly source: string
  readonly target: string
  readonly distance: number
}

/**
 * React Flow's Proximity Connect rule: connect a dragged node to the closest
 * other node within `maxDistance`. The node further left is the source.
 */
export const getProximityConnection = (
  candidates: readonly FlowIntersectionCandidate[],
  dragged: FlowIntersectionCandidate,
  options: Omit<FlowClosestNodeOptions, 'excludeIds'>
): FlowProximityConnection | undefined => {
  const closest = getClosestNode(candidates, dragged.bounds, {
    ...options,
    excludeIds: [dragged.id],
  })

  if (closest === undefined) {
    return undefined
  }

  const closestIsSource = closest.node.bounds.x < dragged.bounds.x

  return {
    source: closestIsSource ? closest.node.id : dragged.id,
    target: closestIsSource ? dragged.id : closest.node.id,
    distance: closest.distance,
  }
}
