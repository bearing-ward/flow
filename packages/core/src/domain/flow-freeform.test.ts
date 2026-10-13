import { describe, expect, it } from 'vitest'

import {
  getFreehandPath,
  getNodesInsideLasso,
  getPointsBounds,
  getRectFromPoints,
  isPointInPolygon,
  polylineIntersectsRect,
  polylinesIntersect,
  segmentsIntersect,
  translatePoints,
} from './flow-freeform.ts'

const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
]

const p = (x: number, y: number) => ({ x, y })

describe(getRectFromPoints, () => {
  it('normalizes a drag in any direction', () => {
    expect(getRectFromPoints(p(50, 80), p(10, 20))).toStrictEqual({
      x: 10,
      y: 20,
      width: 40,
      height: 60,
    })
  })
})

describe(getPointsBounds, () => {
  it('bounds points and rejects an empty list', () => {
    expect(getPointsBounds(square)).toStrictEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
    expect(getPointsBounds([])).toBeUndefined()
  })
})

describe(isPointInPolygon, () => {
  it('casts rays against the polygon', () => {
    expect(isPointInPolygon(p(50, 50), square)).toBeTruthy()
    expect(isPointInPolygon(p(150, 50), square)).toBeFalsy()
  })
})

describe(segmentsIntersect, () => {
  it('finds crossings and collinear overlaps', () => {
    expect(
      segmentsIntersect(p(0, 0), p(10, 10), p(0, 10), p(10, 0))
    ).toBeTruthy()
    expect(segmentsIntersect(p(0, 0), p(10, 0), p(5, 0), p(15, 0))).toBeTruthy()
    expect(segmentsIntersect(p(0, 0), p(10, 0), p(0, 5), p(10, 5))).toBeFalsy()
  })
})

describe(polylinesIntersect, () => {
  it('crosses open polylines and treats one point as a dot', () => {
    expect(
      polylinesIntersect([p(0, 50), p(100, 50)], [p(50, 0), p(50, 100)])
    ).toBeTruthy()
    expect(polylinesIntersect([p(50, 50)], [p(0, 50), p(100, 50)])).toBeTruthy()
    expect(polylinesIntersect([p(50, 60)], [p(0, 50), p(100, 50)])).toBeFalsy()
  })
})

describe(polylineIntersectsRect, () => {
  const rect = { x: 0, y: 0, width: 100, height: 50 }

  it('detects strokes inside or across a rectangle', () => {
    expect(polylineIntersectsRect([p(10, 10)], rect)).toBeTruthy()
    expect(polylineIntersectsRect([p(-10, 25), p(200, 25)], rect)).toBeTruthy()
    expect(polylineIntersectsRect([p(-10, 80), p(200, 80)], rect)).toBeFalsy()
  })
})

describe(getNodesInsideLasso, () => {
  const nodes = [
    { id: 'inside', bounds: { x: 10, y: 10, width: 20, height: 20 } },
    { id: 'straddle', bounds: { x: 90, y: 40, width: 40, height: 20 } },
    { id: 'outside', bounds: { x: 200, y: 200, width: 20, height: 20 } },
    { id: 'around', bounds: { x: -50, y: -50, width: 300, height: 300 } },
  ]

  it('needs every corner inside in full mode', () => {
    expect(
      getNodesInsideLasso(nodes, square).map(({ id }) => id)
    ).toStrictEqual(['inside'])
  })

  it('takes touched nodes in partial mode', () => {
    expect(
      getNodesInsideLasso(nodes, square, { partial: true }).map(({ id }) => id)
    ).toStrictEqual(['inside', 'straddle', 'around'])
  })

  it('needs a polygon', () => {
    expect(getNodesInsideLasso(nodes, square.slice(0, 2))).toStrictEqual([])
  })
})

describe(getFreehandPath, () => {
  it('draws dots, lines and smoothed curves', () => {
    expect(getFreehandPath([])).toBe('')
    expect(getFreehandPath([p(1, 2)])).toBe('M 1 2 L 1 2')
    expect(getFreehandPath([p(0, 0), p(10, 0)])).toBe('M 0 0 L 10 0')
    expect(getFreehandPath([p(0, 0), p(10, 0), p(10, 10)])).toBe(
      'M 0 0 Q 10 0 10 5 L 10 10'
    )
  })
})

describe(translatePoints, () => {
  it('moves points into a local frame', () => {
    expect(translatePoints([p(15, 25)], p(10, 20))).toStrictEqual([p(5, 5)])
  })
})
