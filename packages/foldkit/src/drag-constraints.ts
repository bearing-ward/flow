import { NodeIdSchema, snapPosition, constrainNodePosition } from '@flow/core'
import type { NodeId, PanExtent, SnapGrid, XYPosition } from '@flow/core'
import { Schema } from 'effect'

/**
 * Where a node drag found one dragged node, plus what React `XYDrag` needs to
 * place it each frame: its size, origin, parent offset and absolute extent.
 */
export const NodeDragOriginSchema = Schema.Struct({
  nodeId: NodeIdSchema,
  /** Stored (parent-relative anchor) position at drag start. */
  x: Schema.Finite,
  y: Schema.Finite,
  /** Absolute top-left at drag start. */
  absoluteX: Schema.Finite,
  absoluteY: Schema.Finite,
  width: Schema.optional(Schema.Finite),
  height: Schema.optional(Schema.Finite),
  originX: Schema.optional(Schema.Finite),
  originY: Schema.optional(Schema.Finite),
  parentX: Schema.optional(Schema.Finite),
  parentY: Schema.optional(Schema.Finite),
  /** Absolute box the node's top-left box must stay in, React `calculateNodePosition`. */
  extent: Schema.NullOr(
    Schema.Struct({
      minX: Schema.Finite,
      minY: Schema.Finite,
      maxX: Schema.Finite,
      maxY: Schema.Finite,
    })
  ),
})

export type NodeDragOrigin = typeof NodeDragOriginSchema.Type

export interface NodeDragPlacement {
  readonly nodeId: NodeId
  readonly position: XYPosition
  readonly positionAbsolute: XYPosition
}

/**
 * React `XYDrag` placement for one frame: each node's absolute top-left is
 * its start plus the pointer travel, snapped to the grid (one shared offset
 * from the first node for multi-node drags, as `calculateSnapOffset`), then
 * clamped to its extent (`clampPosition`), then turned back into a stored
 * parent-relative anchor.
 */
export const placeDraggedNodes = (
  origins: readonly NodeDragOrigin[],
  delta: XYPosition,
  snapGrid?: SnapGrid
): readonly NodeDragPlacement[] => {
  const [reference] = origins

  const snapOffset =
    snapGrid === undefined || reference === undefined || origins.length < 2
      ? undefined
      : (() => {
          const position = {
            x: reference.absoluteX + delta.x,
            y: reference.absoluteY + delta.y,
          }

          const snapped = snapPosition(position, snapGrid)

          return { x: snapped.x - position.x, y: snapped.y - position.y }
        })()

  return origins.map((origin) => {
    let next = { x: origin.absoluteX + delta.x, y: origin.absoluteY + delta.y }

    if (snapGrid !== undefined) {
      next =
        snapOffset === undefined
          ? snapPosition(next, snapGrid)
          : {
              x: Math.round(next.x + snapOffset.x),
              y: Math.round(next.y + snapOffset.y),
            }
    }

    const width = origin.width ?? 0
    const height = origin.height ?? 0

    const positionAbsolute =
      origin.extent === null
        ? next
        : constrainNodePosition(next, { width, height }, origin.extent)

    // Without size or parent data (older sessions) keep the plain offset.
    if (origin.width === undefined || origin.height === undefined) {
      return {
        nodeId: origin.nodeId,
        position: {
          x: origin.x + positionAbsolute.x - origin.absoluteX,
          y: origin.y + positionAbsolute.y - origin.absoluteY,
        },
        positionAbsolute,
      }
    }

    return {
      nodeId: origin.nodeId,
      position: {
        x:
          positionAbsolute.x -
          (origin.parentX ?? 0) +
          width * (origin.originX ?? 0),
        y:
          positionAbsolute.y -
          (origin.parentY ?? 0) +
          height * (origin.originY ?? 0),
      },
      positionAbsolute,
    }
  })
}

/**
 * The absolute extent React applies to one drag item: the parent box for
 * `extent: 'parent'` (unless `expandParent`), else the canvas `nodeExtent`,
 * shifted per item for multi-node drags so the group keeps its shape.
 */
export const dragItemExtent = (input: {
  readonly parentBox:
    | {
        readonly x: number
        readonly y: number
        readonly width: number
        readonly height: number
      }
    | undefined
  readonly extentParent: boolean
  readonly expandParent: boolean
  readonly nodeExtent: PanExtent | undefined
  readonly item: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly groupBox:
    | {
        readonly x: number
        readonly y: number
        readonly x2: number
        readonly y2: number
      }
    | undefined
}): PanExtent | undefined => {
  if (input.extentParent) {
    const box = input.parentBox

    // React keeps `extent: 'parent'` unclamped for `expandParent` children.
    return input.expandParent ||
      box === undefined ||
      box.width <= 0 ||
      box.height <= 0
      ? undefined
      : {
          minX: box.x,
          minY: box.y,
          maxX: box.x + box.width,
          maxY: box.y + box.height,
        }
  }

  if (input.nodeExtent === undefined) {
    return undefined
  }

  const { groupBox, item, nodeExtent } = input

  if (groupBox === undefined) {
    return nodeExtent
  }

  return {
    minX: item.x - groupBox.x + nodeExtent.minX,
    minY: item.y - groupBox.y + nodeExtent.minY,
    maxX: item.x + item.width - groupBox.x2 + nodeExtent.maxX,
    maxY: item.y + item.height - groupBox.y2 + nodeExtent.maxY,
  }
}

/** React `getInternalNodesBounds(dragItems)`: the box around every drag item. */
export interface DragGroupBox {
  readonly x: number
  readonly y: number
  readonly x2: number
  readonly y2: number
}

export const dragGroupBox = (
  items: readonly {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }[]
): DragGroupBox => {
  let x = Number.POSITIVE_INFINITY
  let y = Number.POSITIVE_INFINITY
  let x2 = Number.NEGATIVE_INFINITY
  let y2 = Number.NEGATIVE_INFINITY

  for (const item of items) {
    x = Math.min(x, item.x)
    y = Math.min(y, item.y)
    x2 = Math.max(x2, item.x + item.width)
    y2 = Math.max(y2, item.y + item.height)
  }

  return { x, y, x2, y2 }
}
