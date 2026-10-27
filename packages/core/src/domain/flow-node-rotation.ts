import { Schema as S } from 'effect'

import { NodeIdSchema, XYPositionSchema } from './flow-values.ts'
import type { XYPosition } from './flow-values.ts'
import type { FlowRect } from './flow-visibility.schema.ts'

/** Clockwise CSS degrees around the center of the unrotated measured node. */
export const FlowNodeRotationSchema = S.Finite

export const FlowRotationGestureSchema = S.Struct({
  nodeId: NodeIdSchema,
  center: XYPositionSchema,
  initialRotation: FlowNodeRotationSchema,
  pointerAngle: S.Finite,
  rotation: FlowNodeRotationSchema,
  phase: S.Literals(['active', 'completed', 'cancelled']),
})

export type FlowRotationGesture = typeof FlowRotationGestureSchema.Type

export const FlowRotationEventSchema = S.Union([
  S.Struct({ kind: S.Literal('move'), pointer: XYPositionSchema }),
  S.Struct({ kind: S.Literal('complete') }),
  S.Struct({ kind: S.Literal('cancel') }),
])

export type FlowRotationEvent = typeof FlowRotationEventSchema.Type

export const normalizeFlowRotation = (rotation: number): number =>
  ((rotation % 360) + 360) % 360

const pointerAngle = (pointer: XYPosition, center: XYPosition): number =>
  (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI

export const startFlowRotation = (input: {
  readonly nodeId: FlowRotationGesture['nodeId']
  readonly center: XYPosition
  readonly pointer: XYPosition
  readonly rotation: number
}): FlowRotationGesture => ({
  nodeId: input.nodeId,
  center: input.center,
  initialRotation: input.rotation,
  pointerAngle: pointerAngle(input.pointer, input.center),
  rotation: input.rotation,
  phase: 'active',
})

/** Pointer samples never mutate graph meaning. Completion produces one edit. */
export const reduceFlowRotation = (
  gesture: FlowRotationGesture,
  event: FlowRotationEvent
): FlowRotationGesture => {
  if (gesture.phase !== 'active') {
    return gesture
  }

  switch (event.kind) {
    case 'move': {
      if (
        event.pointer.x === gesture.center.x &&
        event.pointer.y === gesture.center.y
      ) {
        return gesture
      }

      return {
        ...gesture,
        rotation: normalizeFlowRotation(
          normalizeFlowRotation(gesture.initialRotation) +
            pointerAngle(event.pointer, gesture.center) -
            gesture.pointerAngle
        ),
      }
    }

    case 'complete': {
      return { ...gesture, phase: 'completed' }
    }

    case 'cancel': {
      return {
        ...gesture,
        rotation: gesture.initialRotation,
        phase: 'cancelled',
      }
    }

    default: {
      const exhaustive: never = event

      return exhaustive
    }
  }
}

export const rotateFlowPoint = (
  point: XYPosition,
  center: XYPosition,
  rotation: number
): XYPosition => {
  if (normalizeFlowRotation(rotation) === 0) {
    return point
  }

  const radians = (normalizeFlowRotation(rotation) * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const x = point.x - center.x
  const y = point.y - center.y

  return {
    x: center.x + x * cosine - y * sine,
    y: center.y + x * sine + y * cosine,
  }
}

/** Enclosing AABB only; layout anchors and node sizes remain unrotated. */
export const rotatedFlowBounds = (bounds: FlowRect, rotation = 0): FlowRect => {
  if (normalizeFlowRotation(rotation) === 0) {
    return bounds
  }

  const radians = (normalizeFlowRotation(rotation) * Math.PI) / 180
  const cosine = Math.abs(Math.cos(radians))
  const sine = Math.abs(Math.sin(radians))
  const width = bounds.width * cosine + bounds.height * sine
  const height = bounds.width * sine + bounds.height * cosine

  return {
    x: bounds.x + (bounds.width - width) / 2,
    y: bounds.y + (bounds.height - height) / 2,
    width,
    height,
  }
}

/** Undo a DOM sample's rotation before recording a local handle center. */
export const unrotateFlowHandle = (input: {
  readonly center: XYPosition
  readonly nodeCenter: XYPosition
  readonly size: { readonly width: number; readonly height: number }
  readonly zoom: number
  readonly rotation: number
}): XYPosition => {
  const point = rotateFlowPoint(input.center, input.nodeCenter, -input.rotation)

  return {
    x: (point.x - input.nodeCenter.x) / input.zoom + input.size.width / 2,
    y: (point.y - input.nodeCenter.y) / input.zoom + input.size.height / 2,
  }
}
