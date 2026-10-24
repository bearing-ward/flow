import { Schema as S } from 'effect'

import {
  nodeAnchorToTopLeft,
  nodeTopLeftToAnchor,
} from './flow-origin.schema.ts'
import type { NodeOrigin } from './flow-origin.schema.ts'
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
): number =>
  // Pinned system/src/utils/general.ts:20-29 gives the maximum precedence,
  // even when subtracting the measured size makes it smaller than the minimum.
  Math.min(Math.max(minimum, proposed), maximum - size)

/** Constrain an anchor using physical bounds, including oversized nodes. */
export const constrainNodePosition = (
  position: XYPosition,
  dimensions: NodeDimensions,
  extent: NodeExtent,
  origin: NodeOrigin = [0, 0]
): XYPosition => {
  const topLeft = nodeAnchorToTopLeft(position, dimensions, origin)

  return nodeTopLeftToAnchor(
    {
      x: constrainAxis(topLeft.x, extent.minX, extent.maxX, dimensions.width),
      y: constrainAxis(topLeft.y, extent.minY, extent.maxY, dimensions.height),
    },
    dimensions,
    origin
  )
}

/** Constrain physical top-left items with one delta, preserving group relative positions. */
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
