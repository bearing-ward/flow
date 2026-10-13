import type { FlowPosition } from './flow-renderer-props.ts'
import type { XYPosition } from './flow.schema.ts'

/** Absolute flow-space rectangle of a node, such as `FlowNodeBounds`. */
export interface FlowFloatingRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Endpoint parameters for a floating edge. The names match the path helpers'
 * inputs, so the result can be passed straight to `getBezierPath`.
 */
export interface FlowFloatingEdgeParams {
  readonly sourceX: number
  readonly sourceY: number
  readonly targetX: number
  readonly targetY: number
  readonly sourcePosition: FlowPosition
  readonly targetPosition: FlowPosition
}

const center = (rect: FlowFloatingRect): XYPosition => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
})

/**
 * The point where the line from the rect's center towards `toward` crosses the
 * rect's border. A zero-size rect, or a point at its center, returns the center.
 */
export const getNodeIntersection = (
  rect: FlowFloatingRect,
  toward: XYPosition
): XYPosition => {
  const w = rect.width / 2
  const h = rect.height / 2
  const middle = center(rect)

  if (w === 0 || h === 0) {
    return middle
  }

  // Map the rect onto a unit diamond, project onto its border, and map back.
  const xx1 = (toward.x - middle.x) / (2 * w) - (toward.y - middle.y) / (2 * h)
  const yy1 = (toward.x - middle.x) / (2 * w) + (toward.y - middle.y) / (2 * h)
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1)
  const xx3 = a * xx1
  const yy3 = a * yy1

  return { x: w * (xx3 + yy3) + middle.x, y: h * (-xx3 + yy3) + middle.y }
}

/** The side of the rect a border point lies on, with a 1px tolerance like React Flow's example. */
export const getEdgePosition = (
  rect: FlowFloatingRect,
  point: XYPosition
): FlowPosition => {
  const nx = Math.round(rect.x)
  const ny = Math.round(rect.y)
  const px = Math.round(point.x)
  const py = Math.round(point.y)

  if (px <= nx + 1) {
    return 'left'
  }

  if (px >= nx + rect.width - 1) {
    return 'right'
  }

  if (py <= ny + 1) {
    return 'top'
  }

  if (py >= ny + rect.height - 1) {
    return 'bottom'
  }

  return 'top'
}

/**
 * Floating edge endpoints: each end sits where the line between the two node
 * centers crosses that node's border. Recompute it whenever either node moves.
 */
export const getFloatingEdgeParams = (
  source: FlowFloatingRect,
  target: FlowFloatingRect
): FlowFloatingEdgeParams => {
  const sourcePoint = getNodeIntersection(source, center(target))
  const targetPoint = getNodeIntersection(target, center(source))

  return {
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    targetX: targetPoint.x,
    targetY: targetPoint.y,
    sourcePosition: getEdgePosition(source, sourcePoint),
    targetPosition: getEdgePosition(target, targetPoint),
  }
}

/** The midpoint of one side of a rect. */
export const getSideMidpoint = (
  rect: FlowFloatingRect,
  side: FlowPosition
): XYPosition => {
  switch (side) {
    case 'left': {
      return { x: rect.x, y: rect.y + rect.height / 2 }
    }

    case 'right': {
      return { x: rect.x + rect.width, y: rect.y + rect.height / 2 }
    }

    case 'top': {
      return { x: rect.x + rect.width / 2, y: rect.y }
    }

    default: {
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height }
    }
  }
}

const facingSide = (
  from: FlowFloatingRect,
  to: FlowFloatingRect
): FlowPosition => {
  const a = center(from)
  const b = center(to)

  if (Math.abs(a.x - b.x) > Math.abs(a.y - b.y)) {
    return a.x > b.x ? 'left' : 'right'
  }

  return a.y > b.y ? 'top' : 'bottom'
}

/**
 * Simple floating edge endpoints: each end snaps to the midpoint of the side
 * that faces the other node along the dominant axis between their centers.
 */
export const getSimpleFloatingEdgeParams = (
  source: FlowFloatingRect,
  target: FlowFloatingRect
): FlowFloatingEdgeParams => {
  const sourcePosition = facingSide(source, target)
  const targetPosition = facingSide(target, source)
  const sourcePoint = getSideMidpoint(source, sourcePosition)
  const targetPoint = getSideMidpoint(target, targetPosition)

  return {
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    targetX: targetPoint.x,
    targetY: targetPoint.y,
    sourcePosition,
    targetPosition,
  }
}

/** A floating connection line start: a border point and the side it lies on. */
export interface FlowFloatingConnectionStart {
  readonly x: number
  readonly y: number
  readonly position: FlowPosition
}

/** Floating start point for a connection line from a node towards the pointer. */
export const getFloatingConnectionStart = (
  fromNode: FlowFloatingRect,
  to: XYPosition
): FlowFloatingConnectionStart => {
  const point = getNodeIntersection(fromNode, to)

  return { ...point, position: getEdgePosition(fromNode, point) }
}
