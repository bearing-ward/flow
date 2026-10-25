import { Schema as S } from 'effect'

import type { NodeExtent } from './flow-node-extent.schema.ts'
import type { NodeOrigin } from './flow-origin.schema.ts'
import { NodeResizeDirectionSchema } from './flow-runtime.schema.ts'
import type { NodeId, XYPosition } from './flow.schema.ts'

/** React `ResizeParams`: stored position (parent-relative anchor) and size. */
export const FlowResizeParamsSchema = S.Struct({
  x: S.Finite,
  y: S.Finite,
  width: S.Finite,
  height: S.Finite,
})

export type FlowResizeParams = typeof FlowResizeParamsSchema.Type

/**
 * React `ResizeParamsWithDirection`. `direction` is `[x, y]`, each -1, 0 or 1:
 * the direction the dragged edge moved in on that axis.
 */
export const FlowResizeParamsWithDirectionSchema = S.Struct({
  ...FlowResizeParamsSchema.fields,
  direction: S.Tuple([S.Finite, S.Finite]),
})

export type FlowResizeParamsWithDirection =
  typeof FlowResizeParamsWithDirectionSchema.Type

/** React `ControlPosition`. Same literals as the runtime resize direction. */
export const FlowResizeControlPositionSchema = NodeResizeDirectionSchema

export type FlowResizeControlPosition =
  typeof FlowResizeControlPositionSchema.Type

/** React `ResizeControlVariant`. */
export const FlowResizeControlVariantSchema = S.Literals(['line', 'handle'])

export type FlowResizeControlVariant =
  typeof FlowResizeControlVariantSchema.Type

/** React `ResizeControlDirection`: restricts a control to one axis. */
export const FlowResizeControlDirectionSchema = S.Literals([
  'horizontal',
  'vertical',
])

export type FlowResizeControlDirection =
  typeof FlowResizeControlDirectionSchema.Type

/** React `XY_RESIZER_HANDLE_POSITIONS` and `XY_RESIZER_LINE_POSITIONS`. */
export const flowResizeHandlePositions: readonly FlowResizeControlPosition[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]

export const flowResizeLinePositions: readonly FlowResizeControlPosition[] = [
  'top',
  'right',
  'bottom',
  'left',
]

/** NodeResizer / NodeResizeControl size constraints. */
export const FlowNodeResizeConstraintsSchema = S.Struct({
  minWidth: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  minHeight: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  maxWidth: S.optional(S.Number.check(S.isGreaterThan(0))),
  maxHeight: S.optional(S.Number.check(S.isGreaterThan(0))),
  keepAspectRatio: S.optional(S.Boolean),
})

export type FlowNodeResizeConstraints =
  typeof FlowNodeResizeConstraintsSchema.Type

/** React NodeResizer defaults. */
export const flowNodeResizeDefaults = {
  minWidth: 10,
  minHeight: 10,
  maxWidth: Number.MAX_VALUE,
  maxHeight: Number.MAX_VALUE,
  keepAspectRatio: false,
} as const

/** React `getControlDirection`. */
export const getFlowResizeControlDirection = (
  position: FlowResizeControlPosition
) => ({
  isHorizontal: position.includes('right') || position.includes('left'),
  isVertical: position.includes('bottom') || position.includes('top'),
  affectsX: position.includes('left'),
  affectsY: position.includes('top'),
})

const sign = (value: number): number => {
  if (value > 0) {
    return 1
  }

  return value < 0 ? -1 : 0
}

/** React `getResizeDirection`. */
export const getFlowResizeDirection = (input: {
  readonly width: number
  readonly prevWidth: number
  readonly height: number
  readonly prevHeight: number
  readonly affectsX: boolean
  readonly affectsY: boolean
}): readonly [number, number] => {
  const deltaWidth = input.width - input.prevWidth
  const deltaHeight = input.height - input.prevHeight

  return [
    deltaWidth !== 0 && input.affectsX ? -sign(deltaWidth) : sign(deltaWidth),
    deltaHeight !== 0 && input.affectsY
      ? -sign(deltaHeight)
      : sign(deltaHeight),
  ]
}

const lowerClamp = (lowerExtent: number, lowerBound: number) =>
  Math.max(0, lowerBound - lowerExtent)

const upperClamp = (upperExtent: number, upperBound: number) =>
  Math.max(0, upperExtent - upperBound)

const sizeClamp = (size: number, minimum: number, maximum: number) =>
  Math.max(0, minimum - size, size - maximum)

export interface FlowNodeResizerDimensionsInput {
  readonly controlPosition: FlowResizeControlPosition
  /** Stored position (parent-relative anchor) and size at resize start. */
  readonly start: FlowResizeParams
  /** Pointer travel since resize start in flow units, already snapped. */
  readonly delta: XYPosition
  readonly constraints?: FlowNodeResizeConstraints
  readonly nodeOrigin?: NodeOrigin
  /** Parent-local bounds the node may grow into (`extent` or the parent box). */
  readonly extent?: NodeExtent | undefined
  /** Parent-local box of `extent: 'parent'`/`expandParent` children to keep inside. */
  readonly childExtent?: NodeExtent | undefined
}

/**
 * Port of React `getDimensionsAfterResize`: apply min/max size, extent,
 * child extent and aspect-ratio limits by finding the strongest clamp on
 * each axis, then derive position and size from the clamped travel.
 */
// oxlint-disable-next-line complexity -- one-to-one port of the reference clamp cascade keeps it auditable.
export const calculateFlowNodeResizerDimensions = (
  input: FlowNodeResizerDimensionsInput
): FlowResizeParams => {
  const control = getFlowResizeControlDirection(input.controlPosition)
  let { affectsX, affectsY } = control
  const { isHorizontal, isVertical } = control
  const isDiagonal = isHorizontal && isVertical

  const minWidth =
    input.constraints?.minWidth ?? flowNodeResizeDefaults.minWidth

  const minHeight =
    input.constraints?.minHeight ?? flowNodeResizeDefaults.minHeight

  const maxWidth =
    input.constraints?.maxWidth ?? flowNodeResizeDefaults.maxWidth

  const maxHeight =
    input.constraints?.maxHeight ?? flowNodeResizeDefaults.maxHeight

  const keepAspectRatio = input.constraints?.keepAspectRatio === true
  const origin = input.nodeOrigin ?? [0, 0]

  const {
    x: startX,
    y: startY,
    width: startWidth,
    height: startHeight,
  } = input.start

  const aspectRatio = startWidth / startHeight
  const { extent, childExtent } = input
  let distX = Math.floor(isHorizontal ? input.delta.x : 0)
  let distY = Math.floor(isVertical ? input.delta.y : 0)
  const newWidth = startWidth + (affectsX ? -distX : distX)
  const newHeight = startHeight + (affectsY ? -distY : distY)
  const originOffsetX = -origin[0] * startWidth
  const originOffsetY = -origin[1] * startHeight
  let clampX = sizeClamp(newWidth, minWidth, maxWidth)
  let clampY = sizeClamp(newHeight, minHeight, maxHeight)

  if (extent !== undefined) {
    let xClamp = 0
    let yClamp = 0

    if (affectsX && distX < 0) {
      xClamp = lowerClamp(startX + distX + originOffsetX, extent.minX)
    } else if (!affectsX && distX > 0) {
      xClamp = upperClamp(startX + newWidth + originOffsetX, extent.maxX)
    }

    if (affectsY && distY < 0) {
      yClamp = lowerClamp(startY + distY + originOffsetY, extent.minY)
    } else if (!affectsY && distY > 0) {
      yClamp = upperClamp(startY + newHeight + originOffsetY, extent.maxY)
    }

    clampX = Math.max(clampX, xClamp)
    clampY = Math.max(clampY, yClamp)
  }

  if (childExtent !== undefined) {
    let xClamp = 0
    let yClamp = 0

    if (affectsX && distX > 0) {
      xClamp = upperClamp(startX + distX, childExtent.minX)
    } else if (!affectsX && distX < 0) {
      xClamp = lowerClamp(startX + newWidth, childExtent.maxX)
    }

    if (affectsY && distY > 0) {
      yClamp = upperClamp(startY + distY, childExtent.minY)
    } else if (!affectsY && distY < 0) {
      yClamp = lowerClamp(startY + newHeight, childExtent.maxY)
    }

    clampX = Math.max(clampX, xClamp)
    clampY = Math.max(clampY, yClamp)
  }

  if (keepAspectRatio) {
    if (isHorizontal) {
      clampX = Math.max(
        clampX,
        sizeClamp(newWidth / aspectRatio, minHeight, maxHeight) * aspectRatio
      )

      const growsDown =
        (!affectsX && !affectsY) || (affectsX && !affectsY && isDiagonal)

      const verticalTravel = (affectsX ? distX : -distX) / aspectRatio

      if (extent !== undefined) {
        clampX = Math.max(
          clampX,
          (growsDown
            ? upperClamp(
                startY + originOffsetY + newWidth / aspectRatio,
                extent.maxY
              )
            : lowerClamp(
                startY + originOffsetY + verticalTravel,
                extent.minY
              )) * aspectRatio
        )
      }

      if (childExtent !== undefined) {
        clampX = Math.max(
          clampX,
          (growsDown
            ? lowerClamp(startY + newWidth / aspectRatio, childExtent.maxY)
            : upperClamp(startY + verticalTravel, childExtent.minY)) *
            aspectRatio
        )
      }
    }

    if (isVertical) {
      clampY = Math.max(
        clampY,
        sizeClamp(newHeight * aspectRatio, minWidth, maxWidth) / aspectRatio
      )

      const growsRight =
        (!affectsX && !affectsY) || (affectsY && !affectsX && isDiagonal)

      const horizontalTravel = (affectsY ? distY : -distY) * aspectRatio

      if (extent !== undefined) {
        clampY = Math.max(
          clampY,
          (growsRight
            ? upperClamp(
                startX + newHeight * aspectRatio + originOffsetX,
                extent.maxX
              )
            : lowerClamp(
                startX + horizontalTravel + originOffsetX,
                extent.minX
              )) / aspectRatio
        )
      }

      if (childExtent !== undefined) {
        clampY = Math.max(
          clampY,
          (growsRight
            ? lowerClamp(startX + newHeight * aspectRatio, childExtent.maxX)
            : upperClamp(startX + horizontalTravel, childExtent.minX)) /
            aspectRatio
        )
      }
    }
  }

  distY += distY < 0 ? clampY : -clampY
  distX += distX < 0 ? clampX : -clampX

  if (keepAspectRatio) {
    if (isDiagonal) {
      const mirrored = affectsX !== affectsY

      if (newWidth > newHeight * aspectRatio) {
        distY = (mirrored ? -distX : distX) / aspectRatio
      } else {
        distX = (mirrored ? -distY : distY) * aspectRatio
      }
    } else if (isHorizontal) {
      distY = distX / aspectRatio
      affectsY = affectsX
    } else {
      distX = distY * aspectRatio
      affectsX = affectsY
    }
  }

  const x = affectsX ? startX + distX : startX
  const y = affectsY ? startY + distY : startY

  return {
    width: startWidth + (affectsX ? -distX : distX),
    height: startHeight + (affectsY ? -distY : distY),
    x: origin[0] * distX * (affectsX ? -1 : 1) + x,
    y: origin[1] * distY * (affectsY ? -1 : 1) + y,
  }
}

/** One child whose stored position must compensate a top/left resize. */
export interface FlowNodeResizeChild {
  readonly id: NodeId
  readonly position: XYPosition
}

/** Drag-session state for React `XYResizer` semantics. Treat as opaque. */
export interface FlowNodeResizeSession {
  readonly controlPosition: FlowResizeControlPosition
  readonly start: FlowResizeParams
  readonly previous: FlowResizeParams
  readonly constraints: FlowNodeResizeConstraints
  readonly nodeOrigin: NodeOrigin
  readonly resizeDirection: FlowResizeControlDirection | undefined
  readonly extent: NodeExtent | undefined
  readonly childExtent: NodeExtent | undefined
  readonly children: readonly FlowNodeResizeChild[]
  /** The node has a parent and `expandParent`. */
  readonly expandParent: boolean
}

export interface FlowNodeResizeStart {
  readonly controlPosition: FlowResizeControlPosition
  /** Stored position and measured size at pointer down. */
  readonly start: FlowResizeParams
  readonly constraints?: FlowNodeResizeConstraints
  readonly nodeOrigin?: NodeOrigin
  /** NodeResizeControl `resizeDirection`. */
  readonly resizeDirection?: FlowResizeControlDirection
  readonly extent?: NodeExtent
  readonly childExtent?: NodeExtent
  /** Direct children with their stored positions. */
  readonly children?: readonly FlowNodeResizeChild[]
  readonly expandParent?: boolean
}

/** Begin a resize; the `onResizeStart` payload is `session.previous`. */
export const startFlowNodeResize = (
  input: FlowNodeResizeStart
): FlowNodeResizeSession => ({
  controlPosition: input.controlPosition,
  start: input.start,
  previous: input.start,
  constraints: input.constraints ?? {},
  nodeOrigin: input.nodeOrigin ?? [0, 0],
  resizeDirection: input.resizeDirection,
  extent: input.extent,
  childExtent: input.childExtent,
  children: input.children ?? [],
  expandParent: input.expandParent === true,
})

export interface FlowNodeResizeStep {
  /** The `shouldResize`/`onResize` payload. */
  readonly params: FlowResizeParamsWithDirection
  /** Stored position to commit, when it changed. */
  readonly position: XYPosition | undefined
  /** Size to commit, when it changed. */
  readonly size: { readonly width: number; readonly height: number } | undefined
  /** Child position compensation to commit with the resize. */
  readonly childPositions: readonly FlowNodeResizeChild[]
}

export interface FlowNodeResizeStepResult {
  readonly session: FlowNodeResizeSession
  readonly step: FlowNodeResizeStep | undefined
}

/**
 * One React `XYResizer` drag step. Returns the next session and, unless the
 * pointer produced no change, the step to report and commit. Adopt the next
 * session only when `shouldResize` accepts the step, matching React 12.12.0.
 */
// oxlint-disable-next-line complexity -- mirrors the reference drag handler branch by branch.
export const stepFlowNodeResize = (
  session: FlowNodeResizeSession,
  delta: XYPosition
): FlowNodeResizeStepResult => {
  const { previous, nodeOrigin } = session

  const next = calculateFlowNodeResizerDimensions({
    controlPosition: session.controlPosition,
    start: session.start,
    delta,
    constraints: session.constraints,
    nodeOrigin,
    extent: session.extent,
    childExtent: session.childExtent,
  })

  const isWidthChange = next.width !== previous.width
  const isHeightChange = next.height !== previous.height
  const isXPosChange = next.x !== previous.x && isWidthChange
  const isYPosChange = next.y !== previous.y && isHeightChange

  if (!isXPosChange && !isYPosChange && !isWidthChange && !isHeightChange) {
    return { session, step: undefined }
  }

  let current = previous
  let { start, children } = session
  let position: XYPosition | undefined
  let size: { readonly width: number; readonly height: number } | undefined
  let childPositions: readonly FlowNodeResizeChild[] = []

  if (
    isXPosChange ||
    isYPosChange ||
    nodeOrigin[0] === 1 ||
    nodeOrigin[1] === 1
  ) {
    position = {
      x: isXPosChange ? next.x : previous.x,
      y: isYPosChange ? next.y : previous.y,
    }
    current = { ...current, ...position }

    const xChange = next.x - previous.x
    const yChange = next.y - previous.y

    children = children.map((child) => ({
      id: child.id,
      position: {
        x:
          child.position.x -
          xChange +
          nodeOrigin[0] * (next.width - previous.width),
        y:
          child.position.y -
          yChange +
          nodeOrigin[1] * (next.height - previous.height),
      },
    }))
    childPositions = children
  }

  if (isWidthChange || isHeightChange) {
    size = {
      width:
        isWidthChange && session.resizeDirection !== 'vertical'
          ? next.width
          : previous.width,
      height:
        isHeightChange && session.resizeDirection !== 'horizontal'
          ? next.height
          : previous.height,
    }
    current = { ...current, ...size }
  }

  if (session.expandParent && position !== undefined) {
    const xLimit = nodeOrigin[0] * (size?.width ?? 0)

    if (position.x !== 0 && position.x < xLimit) {
      current = { ...current, x: xLimit }
      start = { ...start, x: start.x - (position.x - xLimit) }
    }

    const yLimit = nodeOrigin[1] * (size?.height ?? 0)

    if (position.y !== 0 && position.y < yLimit) {
      current = { ...current, y: yLimit }
      start = { ...start, y: start.y - (position.y - yLimit) }
    }
  }

  const control = getFlowResizeControlDirection(session.controlPosition)

  const direction = getFlowResizeDirection({
    width: current.width,
    prevWidth: previous.width,
    height: current.height,
    prevHeight: previous.height,
    affectsX: control.affectsX,
    affectsY: control.affectsY,
  })

  return {
    session: { ...session, start, previous: current, children },
    step: {
      params: { ...current, direction: [direction[0], direction[1]] },
      position,
      size,
      childPositions,
    },
  }
}
