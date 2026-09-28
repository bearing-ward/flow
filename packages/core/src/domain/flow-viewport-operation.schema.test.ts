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
  it('calculates centered viewports with fractional and per-side pixel padding', () => {
    expect(
      getViewportForBounds({
        bounds,
        width: 800,
        height: 600,
        limits,
      })
    ).toStrictEqual({ x: -240, y: -20, zoom: 3.2 })

    expect(
      getViewportForBounds({
        bounds,
        width: 800,
        height: 600,
        limits,
        padding: { top: 20, right: 40, bottom: 60, left: 80 },
      })
    ).toStrictEqual({ x: -260, y: -40, zoom: 3.4 })
    expect(
      getViewportForBounds({
        bounds,
        width: 800,
        height: 600,
        limits,
        padding: { left: 80 },
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

  it('decodes serializable operation inputs and terminal results', () => {
    expect(S.decodeUnknownSync(ViewportBoundsSchema)(bounds)).toStrictEqual(
      bounds
    )
    expect(
      S.decodeUnknownSync(ViewportPaddingSchema)({
        top: 20,
        right: 40,
        bottom: 60,
        left: 80,
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
