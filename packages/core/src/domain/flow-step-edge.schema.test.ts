import { describe, expect, it } from 'vitest'

import {
  smoothStepEdgePath,
  stepEdgeLabelPosition,
  stepEdgePath,
} from './flow-step-edge.schema.ts'

describe('step edge geometry', () => {
  it('routes opposite horizontal handles through the midpoint', () => {
    expect(
      stepEdgePath({ x: 0, y: 0 }, { x: 100, y: 80 }, 'right', 'left')
    ).toBe('M0 0L20 0L 50,0Q 50,0 50,0L 50,80Q 50,80 50,80L80 80L100 80')
  })

  it('routes backward and vertical handles outside their endpoints', () => {
    expect(
      stepEdgePath({ x: 100, y: 0 }, { x: 0, y: 80 }, 'right', 'left')
    ).toBe(
      'M100 0L 120,0Q 120,0 120,0L 120,40Q 120,40 120,40L -20,40Q -20,40 -20,40L -20,80Q -20,80 -20,80L0 80'
    )

    expect(
      stepEdgePath({ x: 0, y: 100 }, { x: 100, y: 0 }, 'top', 'bottom')
    ).toBe('M0 100L0 80L 0,50Q 0,50 0,50L 100,50Q 100,50 100,50L100 20L100 0')
  })

  it('avoids overlapping gaps on handles facing the same side', () => {
    expect(
      stepEdgePath({ x: 0, y: 0 }, { x: 0, y: 100 }, 'right', 'right')
    ).toBe('M0 0L 20,0Q 20,0 20,0L 20,100Q 20,100 20,100L1 100L0 100')
  })
})

describe('smooth step edge geometry', () => {
  it('rounds both midpoint corners at the default five-unit radius', () => {
    expect(
      smoothStepEdgePath({ x: 0, y: 0 }, { x: 100, y: 80 }, 'right', 'left')
    ).toBe('M0 0L20 0L 45,0Q 50,0 50,5L 50,75Q 50,80 55,80L80 80L100 80')
  })

  it('rounds mixed and same-side routes', () => {
    expect(
      smoothStepEdgePath({ x: 0, y: 0 }, { x: 100, y: 100 }, 'right', 'bottom')
    ).toBe(
      'M0 0L 15,0Q 20,0 20,5L 20,115Q 20,120 25,120L 95,120Q 100,120 100,115L100 100'
    )

    expect(
      smoothStepEdgePath({ x: 0, y: 0 }, { x: 0, y: 100 }, 'right', 'right')
    ).toBe('M0 0L 15,0Q 20,0 20,5L 20,95Q 20,100 15,100L1 100L0 100')
  })
})

describe('routed edge labels', () => {
  it('places opposite-side labels at the routing center', () => {
    expect(
      stepEdgeLabelPosition({ x: 0, y: 0 }, { x: 100, y: 80 }, 'right', 'left')
    ).toStrictEqual({ x: 50, y: 40 })
  })

  it('places mixed-side labels on the longer middle segment', () => {
    expect(
      stepEdgeLabelPosition(
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        'right',
        'bottom'
      )
    ).toStrictEqual({ x: 20, y: 60 })
  })
})
