import { Schema as S } from 'effect'

export const ConnectionDragThresholdSchema = S.Finite.check(
  S.isGreaterThanOrEqualTo(0)
)

export type ConnectionDragThreshold = typeof ConnectionDragThresholdSchema.Type

export const defaultConnectionDragThreshold: ConnectionDragThreshold = 1

export const connectionDragActivated = (
  threshold: ConnectionDragThreshold,
  startX: number,
  startY: number,
  clientX: number,
  clientY: number
): boolean =>
  threshold === 0 ||
  (clientX - startX) ** 2 + (clientY - startY) ** 2 > threshold ** 2
