import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  ViewportAnimationOptionsSchema,
  ViewportBoundsSchema,
  ViewportOperationResultSchema,
  ViewportPaddingSchema,
  getViewportForBounds,
  interpolateViewport,
} from './flow-viewport-operation.schema.ts'

const limits = { minZoom: 0.25, maxZoom: 4 }

const bounds = { x: 100, y: 50, width: 200, height: 100 }

describe('viewport operation contracts', () => {
  // Pinned xyflow 0a1f9575, packages/system/src/utils/general.ts:196-259,304-343.
  it.each([
    [0, { x: -400, y: -100, zoom: 4 }],
    [0.1, { x: -328, y: -64, zoom: 3.64 }],
    [0.5, { x: -134, y: 33, zoom: 2.67 }],
    [1, { x: 0, y: 100, zoom: 2 }],
    [2, { x: 132, y: 166, zoom: 1.34 }],
  ])('matches pinned numeric padding %s', (padding, expected) => {
    expect(
      getViewportForBounds({ bounds, width: 800, height: 600, limits, padding })
    ).toStrictEqual(expected)
  })

  // Pinned xyflow 0a1f9575, packages/system/src/utils/general.ts:196-259,304-343.
  it.each([
    ['10%', { x: -240, y: -20, zoom: 3.2 }],
    ['80px', { x: -240, y: -20, zoom: 3.2 }],
    [
      { x: '10%', y: '20px', left: '100px', top: 0 },
      { x: -210, y: -10, zoom: 3.1 },
    ],
    [
      { x: 0.5, y: 1, left: '80px' },
      { x: -214, y: 6.5, zoom: 2.935 },
    ],
    [
      { top: '20px', right: '40px', bottom: '60px', left: '80px' },
      { x: -260, y: -40, zoom: 3.4 },
    ],
    [{ left: '80px' }, { x: -280, y: -60, zoom: 3.6 }],
    [
      { x: '500px', y: '400px' },
      { x: 350, y: 275, zoom: 0.25 },
    ],
    ['20.9px', { x: -360, y: -80, zoom: 3.8 }],
    [{ left: 80 }, { x: 193, y: 97.5, zoom: 2.025 }],
    [
      { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      { x: -360, y: -80, zoom: 3.8 },
    ],
  ])('resolves upstream unit/side padding %j', (padding, expected) => {
    const decoded = S.decodeUnknownSync(ViewportPaddingSchema)(padding)
    expect(
      getViewportForBounds({
        bounds,
        width: 800,
        height: 600,
        limits,
        padding: decoded,
      })
    ).toStrictEqual(expected)
  })

  // Pinned xyflow 0a1f9575, packages/system/src/utils/general.ts:196-259,304-343.
  it('calculates centered viewports with numeric and per-side pixel padding', () => {
    expect(
      getViewportForBounds({
        bounds,
        width: 800,
        height: 600,
        limits,
      })
    ).toStrictEqual({ x: -328, y: -64, zoom: 3.64 })

    expect(
      getViewportForBounds({
        bounds,
        width: 800,
        height: 600,
        limits,
        padding: { top: '20px', right: '40px', bottom: '60px', left: '80px' },
      })
    ).toStrictEqual({ x: -260, y: -40, zoom: 3.4 })
    expect(
      getViewportForBounds({
        bounds,
        width: 800,
        height: 600,
        limits,
        padding: { left: '80px' },
      })
    ).toStrictEqual({ x: -280, y: -60, zoom: 3.6 })
  })

  it('clamps zoom and returns no target for empty panes or zero-area bounds', () => {
    expect(
      getViewportForBounds({
        bounds,
        width: 100,
        height: 80,
        limits: { minZoom: 0.5, maxZoom: 1 },
      })?.zoom
    ).toBe(0.5)

    expect(
      getViewportForBounds({ bounds, width: 0, height: 80, limits })
    ).toBeUndefined()
    expect(
      getViewportForBounds({
        bounds: { ...bounds, width: 0 },
        width: 800,
        height: 600,
        limits,
      })
    ).toBeUndefined()
  })

  it('interpolates viewport values with bounded linear and eased progress', () => {
    const from = { x: 0, y: 10, zoom: 1 }
    const to = { x: 100, y: 50, zoom: 3 }

    expect(interpolateViewport(from, to, 0.5)).toStrictEqual({
      x: 50,
      y: 30,
      zoom: 2,
    })
    expect(interpolateViewport(from, to, 0.5, 'ease-in-out')).toStrictEqual({
      x: 50,
      y: 30,
      zoom: 2,
    })
    expect(interpolateViewport(from, to, -2)).toStrictEqual(from)
    expect(interpolateViewport(from, to, 2)).toStrictEqual(to)
  })

  // Pinned xyflow 0a1f9575, packages/system/src/utils/general.ts:196-259,304-343.
  it('decodes serializable operation inputs and terminal results', () => {
    expect(S.decodeUnknownSync(ViewportBoundsSchema)(bounds)).toStrictEqual(
      bounds
    )
    expect(
      S.decodeUnknownSync(ViewportPaddingSchema)({
        top: '20px',
        right: '40px',
        bottom: '60px',
        left: '80px',
      })
    ).toBeDefined()
    expect(
      S.decodeUnknownSync(ViewportAnimationOptionsSchema)({
        duration: 120,
        easing: 'ease-in-out',
      })
    ).toStrictEqual({ duration: 120, easing: 'ease-in-out' })
    expect(
      S.decodeUnknownSync(ViewportOperationResultSchema)({
        requestId: 1,
        status: 'proposed',
        viewport: { x: 0, y: 0, zoom: 1 },
      }).status
    ).toBe('proposed')
    expect(() =>
      S.decodeUnknownSync(ViewportAnimationOptionsSchema)({
        duration: -1,
        easing: 'spring',
      })
    ).toThrow(/./u)
  })
})
