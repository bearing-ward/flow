import { describe, expect, it } from 'vitest'

import {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from './flow-edge-path.ts'

describe('edge path utilities', () => {
  it('returns a straight path and its midpoint offsets', () => {
    expect(
      getStraightPath({ sourceX: 10, sourceY: 20, targetX: 110, targetY: 60 })
    ).toStrictEqual(['M 10,20L 110,60', 60, 40, 50, 20])
  })

  it('uses source defaults and returns Bezier label and offset tuple values', () => {
    expect(
      getBezierPath({ sourceX: 0, sourceY: 0, targetX: 100, targetY: 100 })
    ).toStrictEqual(['M0,0 C0,50 100,50 100,100', 50, 50, 50, 50])
    expect(
      getSimpleBezierPath({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
      })
    ).toStrictEqual(['M0,0 C0,50 100,50 100,100', 50, 50, 50, 50])
  })

  it('uses custom handles, curvature and smooth-step options', () => {
    expect(
      getBezierPath({
        sourceX: 20,
        sourceY: 40,
        sourcePosition: 'right',
        targetX: 180,
        targetY: 120,
        targetPosition: 'left',
        curvature: 0.5,
      })
    ).toStrictEqual(['M20,40 C100,40 100,120 180,120', 100, 80, 80, 40])
    expect(
      getSmoothStepPath({
        sourceX: 0,
        sourceY: 0,
        sourcePosition: 'right',
        targetX: 100,
        targetY: 100,
        targetPosition: 'left',
        borderRadius: 0,
        offset: 10,
        stepPosition: 0.25,
      })
    ).toStrictEqual([
      'M0 0L10 0L 30,0Q 30,0 30,0L 30,100Q 30,100 30,100L90 100L100 100',
      30,
      50,
      50,
      50,
    ])
    expect(
      getSmoothStepPath({
        sourceX: 0,
        sourceY: 0,
        sourcePosition: 'right',
        targetX: 100,
        targetY: 100,
        targetPosition: 'left',
        centerX: 30,
        centerY: 40,
      })
    ).toStrictEqual([
      'M0 0L20 0L 25,0Q 30,0 30,5L 30,95Q 30,100 35,100L80 100L100 100',
      30,
      40,
      50,
      50,
    ])
  })
})
