import { Schema as S } from 'effect'

import type { XYPosition } from './flow-values.ts'
export declare const SnapGridSchema: S.Struct<{
  readonly x: S.Finite
  readonly y: S.Finite
}>
export type SnapGrid = typeof SnapGridSchema.Type
export declare const snapPosition: (
  position: XYPosition,
  grid: SnapGrid
) => XYPosition
export declare const snapGroupDelta: (
  anchorOriginal: XYPosition,
  unsnappedDelta: XYPosition,
  grid: SnapGrid
) => XYPosition
