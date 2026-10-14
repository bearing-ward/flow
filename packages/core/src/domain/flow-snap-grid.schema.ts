import { Schema as S, SchemaGetter as G } from 'effect'

import type { XYPosition } from './flow-values.ts'

export const SnapGridSchema = S.Struct({
  x: S.Finite.check(S.isGreaterThan(0)),
  y: S.Finite.check(S.isGreaterThan(0)),
})

export type SnapGrid = typeof SnapGridSchema.Type

/** React Flow `SnapGrid` tuple: `[x, y]` with positive finite steps. */
export const SnapGridTupleSchema = S.Tuple([
  S.Finite.check(S.isGreaterThan(0)),
  S.Finite.check(S.isGreaterThan(0)),
])

export type SnapGridTuple = typeof SnapGridTupleSchema.Type

/**
 * Host `snapGrid` option boundary shared by every host: the Flow `{ x, y }`
 * record or the React `[x, y]` tuple, decoded to the record.
 */
export const FlowSnapGridInputSchema = S.Union([
  SnapGridSchema,
  SnapGridTupleSchema.pipe(
    S.decodeTo(SnapGridSchema, {
      decode: G.transform(([x, y]) => ({ x, y })),
      encode: G.transform(({ x, y }): SnapGridTuple => [x, y]),
    })
  ),
])

export const snapPosition = (
  position: XYPosition,
  grid: SnapGrid
): XYPosition => ({
  x: Math.round(position.x / grid.x) * grid.x,
  y: Math.round(position.y / grid.y) * grid.y,
})

export const snapGroupDelta = (
  anchorOriginal: XYPosition,
  unsnappedDelta: XYPosition,
  grid: SnapGrid
): XYPosition => {
  const anchor = snapPosition(
    {
      x: anchorOriginal.x + unsnappedDelta.x,
      y: anchorOriginal.y + unsnappedDelta.y,
    },
    grid
  )

  return {
    x: anchor.x - anchorOriginal.x,
    y: anchor.y - anchorOriginal.y,
  }
}
