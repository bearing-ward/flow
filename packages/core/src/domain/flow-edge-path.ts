import { Schema as S } from 'effect'

import { FlowHandleSchema } from './flow.schema.ts'
import type { FlowHandle, XYPosition } from './flow.schema.ts'

type Position = FlowHandle['side']

const GetStraightPathParamsSchema = S.Struct({
  sourceX: S.Number,
  sourceY: S.Number,
  targetX: S.Number,
  targetY: S.Number,
})

export type GetStraightPathParams = typeof GetStraightPathParamsSchema.Type

const GetSimpleBezierPathParamsSchema = S.Struct({
  ...GetStraightPathParamsSchema.fields,
  sourcePosition: S.optionalKey(FlowHandleSchema.fields.side),
  targetPosition: S.optionalKey(FlowHandleSchema.fields.side),
})

export type GetSimpleBezierPathParams =
  typeof GetSimpleBezierPathParamsSchema.Type

const GetBezierPathParamsSchema = S.Struct({
  ...GetSimpleBezierPathParamsSchema.fields,
  curvature: S.optionalKey(S.Number),
})

export type GetBezierPathParams = typeof GetBezierPathParamsSchema.Type

const GetSmoothStepPathParamsSchema = S.Struct({
  ...GetSimpleBezierPathParamsSchema.fields,
  borderRadius: S.optionalKey(S.Number),
  centerX: S.optionalKey(S.Number),
  centerY: S.optionalKey(S.Number),
  offset: S.optionalKey(S.Number),
  stepPosition: S.optionalKey(S.Number),
})

export type GetSmoothStepPathParams = typeof GetSmoothStepPathParamsSchema.Type

const EdgePathSchema = S.mutable(
  S.Tuple([S.String, S.Number, S.Number, S.Number, S.Number])
)

type EdgePath = typeof EdgePathSchema.Type

const edgeCenter = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: GetStraightPathParams): [number, number, number, number] => {
  const offsetX = Math.abs(targetX - sourceX) / 2
  const centerX = targetX < sourceX ? targetX + offsetX : targetX - offsetX
  const offsetY = Math.abs(targetY - sourceY) / 2
  const centerY = targetY < sourceY ? targetY + offsetY : targetY - offsetY

  return [centerX, centerY, offsetX, offsetY]
}

const bezierCenter = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourceControlX: number,
  sourceControlY: number,
  targetControlX: number,
  targetControlY: number
): [number, number, number, number] => {
  const centerX =
    sourceX * 0.125 +
    sourceControlX * 0.375 +
    targetControlX * 0.375 +
    targetX * 0.125

  const centerY =
    sourceY * 0.125 +
    sourceControlY * 0.375 +
    targetControlY * 0.375 +
    targetY * 0.125

  return [
    centerX,
    centerY,
    Math.abs(centerX - sourceX),
    Math.abs(centerY - sourceY),
  ]
}

const calculateControlOffset = (distance: number, curvature: number): number =>
  distance >= 0 ? 0.5 * distance : curvature * 25 * Math.sqrt(-distance)

const controlWithCurvature = (
  position: Position,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number
): [number, number] => {
  switch (position) {
    case 'left': {
      return [x1 - calculateControlOffset(x1 - x2, curvature), y1]
    }

    case 'right': {
      return [x1 + calculateControlOffset(x2 - x1, curvature), y1]
    }

    case 'top': {
      return [x1, y1 - calculateControlOffset(y1 - y2, curvature)]
    }

    case 'bottom': {
      return [x1, y1 + calculateControlOffset(y2 - y1, curvature)]
    }

    default: {
      const exhaustivePosition: never = position

      return exhaustivePosition
    }
  }
}

const simpleControl = (
  position: Position,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): [number, number] =>
  position === 'left' || position === 'right'
    ? [0.5 * (x1 + x2), y1]
    : [x1, 0.5 * (y1 + y2)]

export const getStraightPath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: GetStraightPathParams): EdgePath => {
  const [labelX, labelY, offsetX, offsetY] = edgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return [
    `M ${sourceX},${sourceY}L ${targetX},${targetY}`,
    labelX,
    labelY,
    offsetX,
    offsetY,
  ]
}

export const getBezierPath = ({
  sourceX,
  sourceY,
  sourcePosition = 'bottom',
  targetX,
  targetY,
  targetPosition = 'top',
  curvature = 0.25,
}: GetBezierPathParams): EdgePath => {
  const [sourceControlX, sourceControlY] = controlWithCurvature(
    sourcePosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature
  )

  const [targetControlX, targetControlY] = controlWithCurvature(
    targetPosition,
    targetX,
    targetY,
    sourceX,
    sourceY,
    curvature
  )

  const [labelX, labelY, offsetX, offsetY] = bezierCenter(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceControlX,
    sourceControlY,
    targetControlX,
    targetControlY
  )

  return [
    `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
    labelX,
    labelY,
    offsetX,
    offsetY,
  ]
}

export const getSimpleBezierPath = ({
  sourceX,
  sourceY,
  sourcePosition = 'bottom',
  targetX,
  targetY,
  targetPosition = 'top',
}: GetSimpleBezierPathParams): EdgePath => {
  const [sourceControlX, sourceControlY] = simpleControl(
    sourcePosition,
    sourceX,
    sourceY,
    targetX,
    targetY
  )

  const [targetControlX, targetControlY] = simpleControl(
    targetPosition,
    targetX,
    targetY,
    sourceX,
    sourceY
  )

  const [labelX, labelY, offsetX, offsetY] = bezierCenter(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceControlX,
    sourceControlY,
    targetControlX,
    targetControlY
  )

  return [
    `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
    labelX,
    labelY,
    offsetX,
    offsetY,
  ]
}

const directions = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
} satisfies Record<Position, XYPosition>

const routeDirection = (
  source: XYPosition,
  sourcePosition: Position,
  target: XYPosition
): XYPosition => {
  if (sourcePosition === 'left' || sourcePosition === 'right') {
    return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 }
  }

  return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 }
}

const distance = (a: XYPosition, b: XYPosition): number =>
  // oxlint-disable-next-line prefer-exponentiation-operator -- Match pinned path geometry arithmetic.
  Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))

interface SmoothPointsParams {
  readonly source: XYPosition
  readonly sourcePosition: Position
  readonly target: XYPosition
  readonly targetPosition: Position
  readonly centerX: number | undefined
  readonly centerY: number | undefined
  readonly offset: number
  readonly stepPosition: number
}

type MiddlePoints = [XYPosition] | [XYPosition, XYPosition]

const lastPoint = (
  points: readonly [XYPosition, ...XYPosition[]]
): XYPosition => {
  const [first] = points
  let result = first

  for (const point of points) {
    result = point
  }

  return result
}

interface SameRouteSelection {
  readonly sourceTarget: [XYPosition]
  readonly targetSource: [XYPosition]
  readonly points: [XYPosition]
}

interface GapAdjustments {
  readonly sourceAdjustment: XYPosition
  readonly targetAdjustment: XYPosition
}

interface SmoothRoute {
  readonly points: MiddlePoints
  readonly centerX: number
  readonly centerY: number
  readonly sourceAdjustment: XYPosition
  readonly targetAdjustment: XYPosition
}

const oppositeRoute = (
  sourceGapped: XYPosition,
  targetGapped: XYPosition,
  sourcePosition: Position,
  sourceDirection: XYPosition,
  axis: 'x' | 'y',
  centerXOverride: number | undefined,
  centerYOverride: number | undefined,
  stepPosition: number
): SmoothRoute => {
  const direction = routeDirection(sourceGapped, sourcePosition, targetGapped)

  const centerX =
    axis === 'x'
      ? (centerXOverride ??
        sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition)
      : (centerXOverride ?? (sourceGapped.x + targetGapped.x) / 2)

  const centerY =
    axis === 'y'
      ? (centerYOverride ??
        sourceGapped.y + (targetGapped.y - sourceGapped.y) * stepPosition)
      : (centerYOverride ?? (sourceGapped.y + targetGapped.y) / 2)

  const vertical: [XYPosition, XYPosition] = [
    { x: centerX, y: sourceGapped.y },
    { x: centerX, y: targetGapped.y },
  ]

  const horizontal: [XYPosition, XYPosition] = [
    { x: sourceGapped.x, y: centerY },
    { x: targetGapped.x, y: centerY },
  ]

  let points: [XYPosition, XYPosition]

  if (axis === 'x') {
    points = sourceDirection.x === direction.x ? vertical : horizontal
  } else {
    points = sourceDirection.y === direction.y ? horizontal : vertical
  }

  return {
    points,
    centerX,
    centerY,
    sourceAdjustment: { x: 0, y: 0 },
    targetAdjustment: { x: 0, y: 0 },
  }
}

const initialSameRoute = (
  sourceGapped: XYPosition,
  targetGapped: XYPosition,
  sourceDirection: XYPosition,
  direction: XYPosition,
  axis: 'x' | 'y'
): SameRouteSelection => {
  const sourceTarget: [XYPosition] = [{ x: sourceGapped.x, y: targetGapped.y }]
  const targetSource: [XYPosition] = [{ x: targetGapped.x, y: sourceGapped.y }]

  let points: [XYPosition]

  if (axis === 'x') {
    points = sourceDirection.x === direction.x ? targetSource : sourceTarget
  } else {
    points = sourceDirection.y === direction.y ? sourceTarget : targetSource
  }

  return { sourceTarget, targetSource, points }
}

const gapAdjustments = (
  source: XYPosition,
  target: XYPosition,
  sourceGapped: XYPosition,
  targetGapped: XYPosition,
  sourcePosition: Position,
  targetPosition: Position,
  sourceDirection: XYPosition,
  direction: XYPosition,
  axis: 'x' | 'y',
  offset: number
): GapAdjustments => {
  const sourceAdjustment = { x: 0, y: 0 }
  const targetAdjustment = { x: 0, y: 0 }

  if (sourcePosition !== targetPosition) {
    return { sourceAdjustment, targetAdjustment }
  }

  const difference = Math.abs(source[axis] - target[axis])

  if (!(difference <= offset)) {
    return { sourceAdjustment, targetAdjustment }
  }

  const adjustment = Math.min(offset - 1, offset - difference)

  if (sourceDirection[axis] === direction[axis]) {
    sourceAdjustment[axis] =
      (sourceGapped[axis] > source[axis] ? -1 : 1) * adjustment
  } else {
    targetAdjustment[axis] =
      (targetGapped[axis] > target[axis] ? -1 : 1) * adjustment
  }

  return { sourceAdjustment, targetAdjustment }
}

const shouldFlipSameRoute = (
  sourceGapped: XYPosition,
  targetGapped: XYPosition,
  sourcePosition: Position,
  targetPosition: Position,
  sourceDirection: XYPosition,
  targetDirection: XYPosition,
  axis: 'x' | 'y'
): boolean => {
  if (sourcePosition === targetPosition) {
    return false
  }

  const otherAxis = axis === 'x' ? 'y' : 'x'
  const aligned = sourceDirection[axis] === targetDirection[otherAxis]
  const greater = sourceGapped[otherAxis] > targetGapped[otherAxis]
  const less = sourceGapped[otherAxis] < targetGapped[otherAxis]

  return sourceDirection[axis] === 1
    ? (!aligned && greater) || (aligned && less)
    : (!aligned && less) || (aligned && greater)
}

const routeLabel = (
  sourceGapPoint: XYPosition,
  targetGapPoint: XYPosition,
  point: XYPosition
): [number, number] => {
  const maxXDistance = Math.max(
    Math.abs(sourceGapPoint.x - point.x),
    Math.abs(targetGapPoint.x - point.x)
  )

  const maxYDistance = Math.max(
    Math.abs(sourceGapPoint.y - point.y),
    Math.abs(targetGapPoint.y - point.y)
  )

  return maxXDistance >= maxYDistance
    ? [(sourceGapPoint.x + targetGapPoint.x) / 2, point.y]
    : [point.x, (sourceGapPoint.y + targetGapPoint.y) / 2]
}

const sameDirectionRoute = (
  source: XYPosition,
  target: XYPosition,
  sourcePosition: Position,
  targetPosition: Position,
  sourceGapped: XYPosition,
  targetGapped: XYPosition,
  offset: number
): SmoothRoute => {
  const sourceDirection = directions[sourcePosition]
  const targetDirection = directions[targetPosition]
  const direction = routeDirection(sourceGapped, sourcePosition, targetGapped)
  const axis = direction.x === 0 ? 'y' : 'x'

  const route = initialSameRoute(
    sourceGapped,
    targetGapped,
    sourceDirection,
    direction,
    axis
  )

  const adjustments = gapAdjustments(
    source,
    target,
    sourceGapped,
    targetGapped,
    sourcePosition,
    targetPosition,
    sourceDirection,
    direction,
    axis,
    offset
  )

  let { points } = route

  if (
    shouldFlipSameRoute(
      sourceGapped,
      targetGapped,
      sourcePosition,
      targetPosition,
      sourceDirection,
      targetDirection,
      axis
    )
  ) {
    points = axis === 'x' ? route.sourceTarget : route.targetSource
  }

  const sourceGapPoint = {
    x: sourceGapped.x + adjustments.sourceAdjustment.x,
    y: sourceGapped.y + adjustments.sourceAdjustment.y,
  }

  const targetGapPoint = {
    x: targetGapped.x + adjustments.targetAdjustment.x,
    y: targetGapped.y + adjustments.targetAdjustment.y,
  }

  const [centerX, centerY] = routeLabel(
    sourceGapPoint,
    targetGapPoint,
    points[0]
  )

  return { points, centerX, centerY, ...adjustments }
}

const smoothPoints = ({
  source,
  sourcePosition,
  target,
  targetPosition,
  centerX: centerXOverride,
  centerY: centerYOverride,
  offset,
  stepPosition,
}: SmoothPointsParams): [
  [XYPosition, ...XYPosition[]],
  number,
  number,
  number,
  number,
] => {
  const sourceDirection = directions[sourcePosition]
  const targetDirection = directions[targetPosition]

  const sourceGapped = {
    x: source.x + sourceDirection.x * offset,
    y: source.y + sourceDirection.y * offset,
  }

  const targetGapped = {
    x: target.x + targetDirection.x * offset,
    y: target.y + targetDirection.y * offset,
  }

  const axis = sourceDirection.x === 0 ? 'y' : 'x'

  const route =
    sourceDirection[axis] * targetDirection[axis] === -1
      ? oppositeRoute(
          sourceGapped,
          targetGapped,
          sourcePosition,
          sourceDirection,
          axis,
          centerXOverride,
          centerYOverride,
          stepPosition
        )
      : sameDirectionRoute(
          source,
          target,
          sourcePosition,
          targetPosition,
          sourceGapped,
          targetGapped,
          offset
        )

  // oxlint-disable-next-line unicorn/no-unreadable-array-destructuring -- The center values are intentionally unused here.
  const [, , offsetX, offsetY] = edgeCenter({
    sourceX: source.x,
    sourceY: source.y,
    targetX: target.x,
    targetY: target.y,
  })

  const [firstPoint] = route.points
  const finalPoint = lastPoint(route.points)

  const adjustedSource = {
    x: sourceGapped.x + route.sourceAdjustment.x,
    y: sourceGapped.y + route.sourceAdjustment.y,
  }

  const adjustedTarget = {
    x: targetGapped.x + route.targetAdjustment.x,
    y: targetGapped.y + route.targetAdjustment.y,
  }

  const pathPoints: [XYPosition, ...XYPosition[]] = [source]

  if (adjustedSource.x !== firstPoint.x || adjustedSource.y !== firstPoint.y) {
    pathPoints.push(adjustedSource)
  }

  pathPoints.push(...route.points)

  if (adjustedTarget.x !== finalPoint.x || adjustedTarget.y !== finalPoint.y) {
    pathPoints.push(adjustedTarget)
  }

  pathPoints.push(target)

  return [pathPoints, route.centerX, route.centerY, offsetX, offsetY]
}

const bend = (
  a: XYPosition,
  b: XYPosition,
  c: XYPosition,
  size: number
): string => {
  const bendSize = Math.min(distance(a, b) / 2, distance(b, c) / 2, size)
  const { x, y } = b

  if ((a.x === x && x === c.x) || (a.y === y && y === c.y)) {
    return `L${x} ${y}`
  }

  if (a.y === y) {
    const xDirection = a.x < c.x ? -1 : 1
    const yDirection = a.y < c.y ? 1 : -1

    return `L ${x + bendSize * xDirection},${y}Q ${x},${y} ${x},${y + bendSize * yDirection}`
  }

  const xDirection = a.x < c.x ? 1 : -1
  const yDirection = a.y < c.y ? -1 : 1

  return `L ${x},${y + bendSize * yDirection}Q ${x},${y} ${x + bendSize * xDirection},${y}`
}

export const getSmoothStepPath = ({
  sourceX,
  sourceY,
  sourcePosition = 'bottom',
  targetX,
  targetY,
  targetPosition = 'top',
  borderRadius = 5,
  centerX,
  centerY,
  offset = 20,
  stepPosition = 0.5,
}: GetSmoothStepPathParams): EdgePath => {
  const smoothPath = smoothPoints({
    source: { x: sourceX, y: sourceY },
    sourcePosition,
    target: { x: targetX, y: targetY },
    targetPosition,
    centerX,
    centerY,
    offset,
    stepPosition,
  })

  const [points, labelX, labelY, offsetX, offsetY] = smoothPath

  let path = `M${points[0].x} ${points[0].y}`
  let index = 1

  while (index < points.length - 1) {
    const previous = points[index - 1]
    const current = points[index]
    const next = points[index + 1]

    if (previous !== undefined && current !== undefined && next !== undefined) {
      path += bend(previous, current, next, borderRadius)
    }

    index += 1
  }

  const finalPoint = lastPoint(points)
  path += `L${finalPoint.x} ${finalPoint.y}`

  return [path, labelX, labelY, offsetX, offsetY]
}
