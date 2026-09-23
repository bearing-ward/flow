import { Effect, Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import {
  PanExtentSchema,
  constrainViewportToExtent,
} from "./flow-pan-extent.schema.ts";

const extent = { minX: 0, minY: 0, maxX: 1000, maxY: 800 };

describe("pan extent", () => {
  it("rejects non-finite and inverted bounds", () => {
    for (const value of [
      { ...extent, minX: 1001 },
      { ...extent, minY: 801 },
      { ...extent, maxX: Infinity },
    ]) {
      const result = Effect.runSync(
        Effect.exit(S.decodeUnknownEffect(PanExtentSchema)(value))
      );

      expect(result._tag).toBe("Failure");
    }
  });

  it("clamps outward translations at each boundary", () => {
    expect(
      constrainViewportToExtent({ x: 20, y: 30, zoom: 1 }, extent, 200, 100)
    ).toStrictEqual({ x: 0, y: 0, zoom: 1 });

    expect(
      constrainViewportToExtent({ x: -900, y: -800, zoom: 1 }, extent, 200, 100)
    ).toStrictEqual({ x: -800, y: -700, zoom: 1 });
  });

  it("preserves in-bounds translation at the proposed zoom", () => {
    expect(
      constrainViewportToExtent({ x: -300, y: -200, zoom: 2 }, extent, 200, 100)
    ).toStrictEqual({ x: -300, y: -200, zoom: 2 });
  });

  it("centers an extent smaller than the screen on both axes", () => {
    expect(
      constrainViewportToExtent(
        { x: -100, y: 500, zoom: 2 },
        { minX: 10, minY: 20, maxX: 60, maxY: 70 },
        300,
        200
      )
    ).toStrictEqual({ x: 80, y: 10, zoom: 2 });
  });
});
