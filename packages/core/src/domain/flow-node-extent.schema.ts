import { Schema as S } from 'effect'

import { PanExtentSchema } from './flow-pan-extent.schema.ts'
import { XYPositionSchema } from './flow-values.ts'
import type { XYPosition } from './flow-values.ts'

export const NodeExtentSchema = PanExtentSchema

export type NodeExtent = typeof NodeExtentSchema.Type

export const NodeDimensionsSchema = S.Struct({
  width: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  height: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
})

export type NodeDimensions = typeof NodeDimensionsSchema.Type

export const NodeExtentItemSchema = S.Struct({
  position: XYPositionSchema,
  ...NodeDimensionsSchema.fields,
})

export type NodeExtentItem = typeof NodeExtentItemSchema.Type

const constrainAxis = (
  proposed: number,
  minimum: number,
  maximum: number,
  size: number
): number => {
  const lastPosition = maximum - size

  if (lastPosition < minimum) {
    return (minimum + lastPosition) / 2
  }

  return Math.min(lastPosition, Math.max(minimum, proposed))
}

/** Keep the complete node within the extent; center it when it cannot fit. */
export const constrainNodePosition = (
  position: XYPosition,
  dimensions: NodeDimensions,
  extent: NodeExtent
): XYPosition => ({
  x: constrainAxis(position.x, extent.minX, extent.maxX, dimensions.width),
  y: constrainAxis(position.y, extent.minY, extent.maxY, dimensions.height),
})

/** Constrain one shared delta so group members keep their relative positions. */
export const constrainNodeGroupDelta = (
  nodes: readonly NodeExtentItem[],
  proposedDelta: XYPosition,
  extent: NodeExtent
): XYPosition => {
  if (nodes.length === 0) {
    return proposedDelta
  }

  let left = Number.POSITIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  for (const node of nodes) {
    left = Math.min(left, node.position.x)
    top = Math.min(top, node.position.y)
    right = Math.max(right, node.position.x + node.width)
    bottom = Math.max(bottom, node.position.y + node.height)
  }

  return {
    x:
      constrainAxis(
        left + proposedDelta.x,
        extent.minX,
        extent.maxX,
        right - left
      ) - left,
    y:
      constrainAxis(
        top + proposedDelta.y,
        extent.minY,
        extent.maxY,
        bottom - top
      ) - top,
  }
}
