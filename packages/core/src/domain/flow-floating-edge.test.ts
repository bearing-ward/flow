import { describe, expect, it } from 'vitest'

import { getBezierPath } from './flow-edge-path.ts'
import {
  getEdgePosition,
  getFloatingConnectionStart,
  getFloatingEdgeParams,
  getNodeIntersection,
  getSideMidpoint,
  getSimpleFloatingEdgeParams,
} from './flow-floating-edge.ts'

const a = { x: 0, y: 0, width: 100, height: 40 }

describe(getNodeIntersection, () => {
  it('meets the border on the line towards the other point', () => {
    expect(getNodeIntersection(a, { x: 400, y: 20 })).toStrictEqual({
      x: 100,
      y: 20,
    })
    expect(getNodeIntersection(a, { x: -400, y: 20 })).toStrictEqual({
      x: 0,
      y: 20,
    })
    expect(getNodeIntersection(a, { x: 50, y: 300 })).toStrictEqual({
      x: 50,
      y: 40,
    })
    expect(getNodeIntersection(a, { x: 50, y: -300 })).toStrictEqual({
      x: 50,
      y: 0,
    })
  })

  it('hits a corner on the diagonal and stays on the border', () => {
    const square = { x: 0, y: 0, width: 100, height: 100 }

    expect(getNodeIntersection(square, { x: 300, y: 300 })).toStrictEqual({
      x: 100,
      y: 100,
    })

    const point = getNodeIntersection(a, { x: 130, y: 70 })

    expect(point.x).toBeGreaterThanOrEqual(0)
    expect(point.x).toBeLessThanOrEqual(100)
    expect(point.y === 0 || point.y === 40 || point.x === 100).toBeTruthy()
  })

  it('returns the center for degenerate input', () => {
    expect(getNodeIntersection(a, { x: 50, y: 20 })).toStrictEqual({
      x: 50,
      y: 20,
    })
    expect(
      getNodeIntersection({ x: 5, y: 5, width: 0, height: 0 }, { x: 9, y: 9 })
    ).toStrictEqual({ x: 5, y: 5 })
  })
})

describe(getEdgePosition, () => {
  it('names the side a border point lies on', () => {
    expect(getEdgePosition(a, { x: 0, y: 20 })).toBe('left')
    expect(getEdgePosition(a, { x: 100, y: 20 })).toBe('right')
    expect(getEdgePosition(a, { x: 50, y: 0 })).toBe('top')
    expect(getEdgePosition(a, { x: 50, y: 40 })).toBe('bottom')
  })
})

describe(getFloatingEdgeParams, () => {
  it('attaches both ends to the facing borders', () => {
    const b = { x: 300, y: 0, width: 100, height: 40 }

    expect(getFloatingEdgeParams(a, b)).toStrictEqual({
      sourceX: 100,
      sourceY: 20,
      targetX: 300,
      targetY: 20,
      sourcePosition: 'right',
      targetPosition: 'left',
    })
  })

  it('switches sides when the target moves below the source', () => {
    const params = getFloatingEdgeParams(a, {
      x: 0,
      y: 300,
      width: 100,
      height: 40,
    })

    expect(params).toMatchObject({
      sourceX: 50,
      sourceY: 40,
      targetX: 50,
      targetY: 300,
      sourcePosition: 'bottom',
      targetPosition: 'top',
    })
  })

  it('feeds getBezierPath directly', () => {
    const params = getFloatingEdgeParams(a, {
      x: 300,
      y: 200,
      width: 100,
      height: 40,
    })

    const [path] = getBezierPath(params)

    expect(path.startsWith(`M${params.sourceX},${params.sourceY}`)).toBeTruthy()
  })
})

describe(getSimpleFloatingEdgeParams, () => {
  it('snaps to facing side midpoints on the dominant axis', () => {
    expect(
      getSimpleFloatingEdgeParams(a, { x: 300, y: 60, width: 100, height: 40 })
    ).toStrictEqual({
      sourceX: 100,
      sourceY: 20,
      targetX: 300,
      targetY: 80,
      sourcePosition: 'right',
      targetPosition: 'left',
    })
    expect(
      getSimpleFloatingEdgeParams(a, { x: 20, y: 300, width: 100, height: 40 })
    ).toMatchObject({ sourcePosition: 'bottom', targetPosition: 'top' })
  })

  it('exposes side midpoints', () => {
    expect(getSideMidpoint(a, 'top')).toStrictEqual({ x: 50, y: 0 })
    expect(getSideMidpoint(a, 'bottom')).toStrictEqual({ x: 50, y: 40 })
  })
})

describe(getFloatingConnectionStart, () => {
  it('starts on the border facing the pointer', () => {
    expect(getFloatingConnectionStart(a, { x: 50, y: -200 })).toStrictEqual({
      x: 50,
      y: 0,
      position: 'top',
    })
  })
})
