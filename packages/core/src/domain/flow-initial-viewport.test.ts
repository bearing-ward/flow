import { Effect, Result } from 'effect'
import { describe, expect, it } from 'vitest'

import { decodeInitialViewport } from './flow-initial-viewport.ts'

const limits = { minZoom: 0.5, maxZoom: 2 }

describe('initial viewport boundary', () => {
  it.each([
    [-1, 0.5],
    [0, 0.5],
    [1.5, 1.5],
    [100, 2],
  ])(
    'clamps initial zoom %s to %s while preserving translation',
    (zoom, expected) => {
      // Pinned packages/system/src/xypanzoom/XYPanZoom.ts:89-100 clamps before initialization.
      expect(
        Effect.runSync(decodeInitialViewport({ x: 12, y: -30, zoom }, limits))
      ).toStrictEqual({ x: 12, y: -30, zoom: expected })
    }
  )

  it.each([
    { x: 0, y: 0, zoom: Number.NaN },
    { x: 0, y: 0, zoom: Number.POSITIVE_INFINITY },
    { x: Number.POSITIVE_INFINITY, y: 0, zoom: 1 },
    { x: 0, y: 0, zoom: '1' },
  ])('rejects malformed input %s before runtime initialization', (input) => {
    expect(
      Result.isFailure(
        Effect.runSync(Effect.result(decodeInitialViewport(input, limits)))
      )
    ).toBeTruthy()
  })

  it('rejects inverted limits before clamping', () => {
    expect(
      Result.isFailure(
        Effect.runSync(
          Effect.result(
            decodeInitialViewport(
              { x: 0, y: 0, zoom: -1 },
              { minZoom: 2, maxZoom: 0.5 }
            )
          )
        )
      )
    ).toBeTruthy()
  })
})
