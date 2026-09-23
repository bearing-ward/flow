import { Schema as S } from "effect";

import type { XYPosition } from "./flow-values.ts";

export const SnapGridSchema = S.Struct({
  x: S.Finite.check(S.isGreaterThan(0)),
  y: S.Finite.check(S.isGreaterThan(0)),
});

export type SnapGrid = typeof SnapGridSchema.Type;

export const snapPosition = (
  position: XYPosition,
  grid: SnapGrid
): XYPosition => ({
  x: Math.round(position.x / grid.x) * grid.x,
  y: Math.round(position.y / grid.y) * grid.y,
});

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
  );

  return {
    x: anchor.x - anchorOriginal.x,
    y: anchor.y - anchorOriginal.y,
  };
};
