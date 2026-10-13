import type { FlowIntersectionCandidate } from './flow-intersection.ts'
import type { FlowRect } from './flow-visibility.schema.ts'
import type { XYPosition } from './flow.schema.ts'

/** Normalized rectangle spanned by two drag points, in either order. */
export const getRectFromPoints = (
  start: XYPosition,
  end: XYPosition
): FlowRect => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
})

/** Smallest rectangle containing every point; undefined for no points. */
export const getPointsBounds = (
  points: readonly XYPosition[]
): FlowRect | undefined => {
  if (points.length === 0) {
    return undefined
  }

  const xs = points.map(({ x }) => x)
  const ys = points.map(({ y }) => y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)

  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  }
}

/** Even-odd ray cast. Points exactly on the border may land either side. */
export const isPointInPolygon = (
  point: XYPosition,
  polygon: readonly XYPosition[]
): boolean => {
  let inside = false

  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const current = polygon[index]
    const before = polygon[previous]

    if (current === undefined || before === undefined) {
      continue
    }

    const crosses =
      current.y > point.y !== before.y > point.y &&
      point.x <
        ((before.x - current.x) * (point.y - current.y)) /
          (before.y - current.y) +
          current.x

    if (crosses) {
      inside = !inside
    }
  }

  return inside
}

const orientation = (a: XYPosition, b: XYPosition, c: XYPosition): number =>
  Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x))

const onSegment = (a: XYPosition, b: XYPosition, point: XYPosition): boolean =>
  Math.min(a.x, b.x) <= point.x &&
  point.x <= Math.max(a.x, b.x) &&
  Math.min(a.y, b.y) <= point.y &&
  point.y <= Math.max(a.y, b.y)

/** Whether segments `a1-a2` and `b1-b2` touch or cross. */
export const segmentsIntersect = (
  a1: XYPosition,
  a2: XYPosition,
  b1: XYPosition,
  b2: XYPosition
): boolean => {
  const o1 = orientation(a1, a2, b1)
  const o2 = orientation(a1, a2, b2)
  const o3 = orientation(b1, b2, a1)
  const o4 = orientation(b1, b2, a2)

  if (o1 !== o2 && o3 !== o4) {
    return true
  }

  return (
    (o1 === 0 && onSegment(a1, a2, b1)) ||
    (o2 === 0 && onSegment(a1, a2, b2)) ||
    (o3 === 0 && onSegment(b1, b2, a1)) ||
    (o4 === 0 && onSegment(b1, b2, a2))
  )
}

const segments = (
  points: readonly XYPosition[],
  closed: boolean
): readonly (readonly [XYPosition, XYPosition])[] => {
  const pairs: (readonly [XYPosition, XYPosition])[] = []

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]
    const to = points[index]

    if (from !== undefined && to !== undefined) {
      pairs.push([from, to])
    }
  }

  const [first] = points
  const last = points.at(-1)

  if (
    closed &&
    points.length > 2 &&
    first !== undefined &&
    last !== undefined
  ) {
    pairs.push([last, first])
  }

  return pairs
}

const rectCorners = (rect: FlowRect): readonly XYPosition[] => [
  { x: rect.x, y: rect.y },
  { x: rect.x + rect.width, y: rect.y },
  { x: rect.x + rect.width, y: rect.y + rect.height },
  { x: rect.x, y: rect.y + rect.height },
]

const closeRing = (points: readonly XYPosition[]): readonly XYPosition[] =>
  points.length > 0 ? [...points, ...points.slice(0, 1)] : points

const isPointInRect = (point: XYPosition, rect: FlowRect): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height

/** Whether two open polylines touch or cross. A single point counts as a dot. */
export const polylinesIntersect = (
  first: readonly XYPosition[],
  second: readonly XYPosition[]
): boolean => {
  const firstSegments =
    first.length === 1 && first[0] !== undefined
      ? [[first[0], first[0]] as const]
      : segments(first, false)

  const secondSegments =
    second.length === 1 && second[0] !== undefined
      ? [[second[0], second[0]] as const]
      : segments(second, false)

  return firstSegments.some(([a1, a2]) =>
    secondSegments.some(([b1, b2]) => segmentsIntersect(a1, a2, b1, b2))
  )
}

/** Whether an open polyline enters a rectangle or crosses its border. */
export const polylineIntersectsRect = (
  points: readonly XYPosition[],
  rect: FlowRect
): boolean =>
  points.some((point) => isPointInRect(point, rect)) ||
  polylinesIntersect(points, closeRing(rectCorners(rect)))

export interface FlowLassoOptions {
  /**
   * Partial selection takes a node when the lasso touches it: one of its
   * corners is inside, or the lasso outline crosses it. Full selection needs
   * every corner inside.
   */
  readonly partial?: boolean | undefined
}

/**
 * Candidates selected by a closed lasso polygon, in input order. Full mode
 * matches React Flow's Lasso Selection example, which tests node corners
 * against the drawn path.
 */
export const getNodesInsideLasso = <
  Candidate extends FlowIntersectionCandidate,
>(
  candidates: readonly Candidate[],
  polygon: readonly XYPosition[],
  options: FlowLassoOptions = {}
): readonly Candidate[] => {
  if (polygon.length < 3) {
    return []
  }

  return candidates.filter(({ bounds }) => {
    const corners = rectCorners(bounds)

    if (options.partial !== true) {
      return corners.every((corner) => isPointInPolygon(corner, polygon))
    }

    return (
      corners.some((corner) => isPointInPolygon(corner, polygon)) ||
      polylineIntersectsRect(closeRing(polygon), bounds)
    )
  })
}

const midpoint = (a: XYPosition, b: XYPosition): XYPosition => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

const format = (value: number): string => String(Math.round(value * 100) / 100)

/**
 * Smoothed SVG path through stroke points: quadratic curves between segment
 * midpoints. One point draws a zero-length segment that a round line cap
 * shows as a dot.
 */
export const getFreehandPath = (points: readonly XYPosition[]): string => {
  const [first] = points

  if (first === undefined) {
    return ''
  }

  const start = `M ${format(first.x)} ${format(first.y)}`

  if (points.length === 1) {
    return `${start} L ${format(first.x)} ${format(first.y)}`
  }

  const parts = [start]

  for (let index = 1; index < points.length - 1; index += 1) {
    const control = points[index]
    const next = points[index + 1]

    if (control !== undefined && next !== undefined) {
      const end = midpoint(control, next)

      parts.push(
        `Q ${format(control.x)} ${format(control.y)} ${format(end.x)} ${format(end.y)}`
      )
    }
  }

  const last = points.at(-1) ?? first

  parts.push(`L ${format(last.x)} ${format(last.y)}`)

  return parts.join(' ')
}

/** Translate points so `origin` becomes (0, 0), such as stroke points relative to their node. */
export const translatePoints = (
  points: readonly XYPosition[],
  origin: XYPosition
): readonly XYPosition[] =>
  points.map(({ x, y }) => ({ x: x - origin.x, y: y - origin.y }))
