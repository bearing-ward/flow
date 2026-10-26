import type { FlowRoutePoint } from './flow-route.schema.ts'
import type { XYPosition } from './flow-values.ts'

/** Deterministic polyline and arc-length midpoint used by every built-in host. */
export const getManualRouteGeometry = (
  source: XYPosition,
  target: XYPosition,
  points: readonly XYPosition[]
) => {
  const vertices = [source, ...points, target].filter((point, index, all) => {
    const previous = all[index - 1]

    return (
      previous === undefined || previous.x !== point.x || previous.y !== point.y
    )
  })

  const lengths = vertices.slice(1).map((point, index) => {
    const from = vertices[index] ?? source

    return Math.hypot(point.x - from.x, point.y - from.y)
  })

  let remaining = lengths.reduce((total, length) => total + length, 0) / 2
  let label = target

  for (const [index, length] of lengths.entries()) {
    const from = vertices[index] ?? source
    const to = vertices[index + 1] ?? target

    if (length > 0 && remaining <= length) {
      const t = remaining / length

      label = {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      }
      break
    }

    remaining -= length
  }

  return {
    path: `M${source.x},${source.y}${vertices
      .slice(1)
      .map((point) => ` L${point.x},${point.y}`)
      .join('')}`,
    label,
  }
}

/** Lowest index wins equal-distance hits. Tolerance is in graph units. */
export const hitTestRoutePoint = (
  points: readonly FlowRoutePoint[],
  point: FlowRoutePoint,
  tolerance: number
): number | undefined => {
  let distance = tolerance
  let hit: number | undefined

  for (const [index, candidate] of points.entries()) {
    const next = Math.hypot(candidate.x - point.x, candidate.y - point.y)

    if (next <= tolerance && (hit === undefined || next < distance)) {
      distance = next
      hit = index
    }
  }

  return hit
}

/** Samples are transient; no logging or document mutation occurs per frame. */
export const sampleRoutePoint = (
  points: readonly FlowRoutePoint[],
  point: FlowRoutePoint,
  minimumDistance = 4
): readonly FlowRoutePoint[] => {
  const last = points.at(-1)

  return last === undefined ||
    Math.hypot(point.x - last.x, point.y - last.y) >= minimumDistance
    ? [...points, point]
    : points
}
