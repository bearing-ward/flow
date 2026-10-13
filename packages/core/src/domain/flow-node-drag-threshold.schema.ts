import { Schema as S } from 'effect'

export const NodeDragThresholdSchema = S.Finite.check(
  S.isGreaterThanOrEqualTo(0)
)

export type NodeDragThreshold = typeof NodeDragThresholdSchema.Type

export const defaultNodeDragThreshold: NodeDragThreshold = 1

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- Public option values are decoded at host construction.
export const decodeNodeDragThreshold = (input?: unknown): NodeDragThreshold =>
  S.decodeUnknownSync(NodeDragThresholdSchema)(
    input === undefined ? defaultNodeDragThreshold : input
  )

export const nodeDragActivated = (
  threshold: NodeDragThreshold,
  startX: number,
  startY: number,
  clientX: number,
  clientY: number
): boolean => Math.hypot(clientX - startX, clientY - startY) > threshold
