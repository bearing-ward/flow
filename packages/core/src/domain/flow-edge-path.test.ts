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

describe('original pure path helper member contracts', () => {
  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C-112.28907705189,12.25 222.53907705189,93.5 140.75,93.5',
        55.12499999999999,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'right',
        curvature: 0,
      },
      expected: [
        'M-30.5,12.25 C-30.5,12.25 140.75,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'right',
        curvature: 0.5,
      },
      expected: [
        'M-30.5,12.25 C-194.07815410378,12.25 304.32815410378,93.5 140.75,93.5',
        55.124999999999986,
        52.875,
        85.62499999999999,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'right',
        curvature: -0.5,
      },
      expected: [
        'M-30.5,12.25 C133.07815410378,12.25 -22.828154103780008,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getBezierPath>[0]
    expected: ReturnType<typeof getBezierPath>
  }[])(
    'get-bezier-path::0curvature compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C-112.28907705189,12.25 55.125,93.5 140.75,93.5',
        -7.655278894458753,
        52.875,
        22.844721105541247,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C-112.28907705189,12.25 222.53907705189,93.5 140.75,93.5',
        55.12499999999999,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C-112.28907705189,12.25 140.75,52.875 140.75,93.5',
        24.454096105541247,
        37.640625,
        54.95409610554125,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C-112.28907705189,12.25 140.75,149.83673867912484 140.75,93.5',
        24.454096105541247,
        74.0012770046718,
        54.95409610554125,
        61.751277004671806,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 55.125,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 222.53907705189,93.5 140.75,93.5',
        117.90527889445875,
        52.875,
        148.40527889445875,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,52.875 140.75,93.5',
        87.234375,
        37.640625,
        117.734375,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,149.83673867912484 140.75,93.5',
        87.234375,
        74.0012770046718,
        117.734375,
        61.751277004671806,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C-30.5,-44.086738679124835 55.125,93.5 140.75,93.5',
        23.015625,
        31.748722995328187,
        53.515625,
        19.498722995328187,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C-30.5,-44.086738679124835 222.53907705189,93.5 140.75,93.5',
        85.79590389445875,
        31.748722995328187,
        116.29590389445875,
        19.498722995328187,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C-30.5,-44.086738679124835 140.75,52.875 140.75,93.5',
        55.125,
        16.514347995328187,
        85.625,
        4.264347995328187,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C-30.5,-44.086738679124835 140.75,149.83673867912484 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 55.125,93.5 140.75,93.5',
        23.015625,
        68.109375,
        53.515625,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 222.53907705189,93.5 140.75,93.5',
        85.79590389445875,
        68.109375,
        116.29590389445875,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,149.83673867912484 140.75,93.5',
        55.125,
        89.2356520046718,
        85.625,
        76.9856520046718,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getBezierPath>[0]
    expected: ReturnType<typeof getBezierPath>
  }[])(
    'get-bezier-path::0sourceposition compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: 7.125,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M7.125,12.25 C7.125,52.875 140.75,52.875 140.75,93.5',
        73.9375,
        52.875,
        66.8125,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getBezierPath>[0]
    expected: ReturnType<typeof getBezierPath>
  }[])(
    'get-bezier-path::0sourcex compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 7.125,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,7.125 C-30.5,50.3125 140.75,50.3125 140.75,93.5',
        55.125,
        50.3125,
        85.625,
        43.1875,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getBezierPath>[0]
    expected: ReturnType<typeof getBezierPath>
  }[])(
    'get-bezier-path::0sourcey compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C-112.28907705189,12.25 55.125,93.5 140.75,93.5',
        -7.655278894458753,
        52.875,
        22.844721105541247,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C-112.28907705189,12.25 222.53907705189,93.5 140.75,93.5',
        55.12499999999999,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C-112.28907705189,12.25 140.75,52.875 140.75,93.5',
        24.454096105541247,
        37.640625,
        54.95409610554125,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C-112.28907705189,12.25 140.75,149.83673867912484 140.75,93.5',
        24.454096105541247,
        74.0012770046718,
        54.95409610554125,
        61.751277004671806,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 55.125,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 222.53907705189,93.5 140.75,93.5',
        117.90527889445875,
        52.875,
        148.40527889445875,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,52.875 140.75,93.5',
        87.234375,
        37.640625,
        117.734375,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,149.83673867912484 140.75,93.5',
        87.234375,
        74.0012770046718,
        117.734375,
        61.751277004671806,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C-30.5,-44.086738679124835 55.125,93.5 140.75,93.5',
        23.015625,
        31.748722995328187,
        53.515625,
        19.498722995328187,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C-30.5,-44.086738679124835 222.53907705189,93.5 140.75,93.5',
        85.79590389445875,
        31.748722995328187,
        116.29590389445875,
        19.498722995328187,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C-30.5,-44.086738679124835 140.75,52.875 140.75,93.5',
        55.125,
        16.514347995328187,
        85.625,
        4.264347995328187,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C-30.5,-44.086738679124835 140.75,149.83673867912484 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 55.125,93.5 140.75,93.5',
        23.015625,
        68.109375,
        53.515625,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 222.53907705189,93.5 140.75,93.5',
        85.79590389445875,
        68.109375,
        116.29590389445875,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,149.83673867912484 140.75,93.5',
        55.125,
        89.2356520046718,
        85.625,
        76.9856520046718,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getBezierPath>[0]
    expected: ReturnType<typeof getBezierPath>
  }[])(
    'get-bezier-path::0targetposition compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: { sourceX: -30.5, sourceY: 12.25, targetX: 7.125, targetY: 93.5 },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 7.125,52.875 7.125,93.5',
        -11.6875,
        52.875,
        18.8125,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getBezierPath>[0]
    expected: ReturnType<typeof getBezierPath>
  }[])(
    'get-bezier-path::0targetx compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 7.125,
      },
      expected: [
        'M-30.5,12.25 C-30.5,26.399039278339714 140.75,-7.024039278339714 140.75,7.125',
        55.125,
        9.6875,
        85.625,
        2.5625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getBezierPath>[0]
    expected: ReturnType<typeof getBezierPath>
  }[])(
    'get-bezier-path::0targety compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: 140.75,
        sourceY: 93.5,
        targetX: -30.5,
        targetY: 12.25,
      },
      expected: [
        'M140.75,93.5 C140.75,149.83673867912484 -30.5,-44.086738679124835 -30.5,12.25',
        55.125,
        52.87499999999999,
        85.625,
        40.62500000000001,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: -30.5,
        targetY: 12.25,
      },
      expected: [
        'M-30.5,12.25 C-30.5,12.25 -30.5,12.25 -30.5,12.25',
        -30.5,
        12.25,
        0,
        0,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getBezierPath>[0]
    expected: ReturnType<typeof getBezierPath>
  }[])(
    'get-bezier-path::getBezierPath compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 55.125,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 55.125,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,52.875 140.75,93.5',
        87.234375,
        37.640625,
        117.734375,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,52.875 140.75,93.5',
        87.234375,
        37.640625,
        117.734375,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 55.125,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 55.125,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,52.875 140.75,93.5',
        87.234375,
        37.640625,
        117.734375,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,52.875 140.75,93.5',
        87.234375,
        37.640625,
        117.734375,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 55.125,93.5 140.75,93.5',
        23.015625,
        68.109375,
        53.515625,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 55.125,93.5 140.75,93.5',
        23.015625,
        68.109375,
        53.515625,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 55.125,93.5 140.75,93.5',
        23.015625,
        68.109375,
        53.515625,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 55.125,93.5 140.75,93.5',
        23.015625,
        68.109375,
        53.515625,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSimpleBezierPath>[0]
    expected: ReturnType<typeof getSimpleBezierPath>
  }[])(
    'get-simple-bezier-path::0sourceposition compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSimpleBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: 7.125,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M7.125,12.25 C7.125,52.875 140.75,52.875 140.75,93.5',
        73.9375,
        52.875,
        66.8125,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSimpleBezierPath>[0]
    expected: ReturnType<typeof getSimpleBezierPath>
  }[])(
    'get-simple-bezier-path::0sourcex compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSimpleBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 7.125,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,7.125 C-30.5,50.3125 140.75,50.3125 140.75,93.5',
        55.125,
        50.3125,
        85.625,
        43.1875,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSimpleBezierPath>[0]
    expected: ReturnType<typeof getSimpleBezierPath>
  }[])(
    'get-simple-bezier-path::0sourcey compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSimpleBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 55.125,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 55.125,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,52.875 140.75,93.5',
        87.234375,
        37.640625,
        117.734375,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,52.875 140.75,93.5',
        87.234375,
        37.640625,
        117.734375,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 55.125,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 55.125,93.5 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,52.875 140.75,93.5',
        87.234375,
        37.640625,
        117.734375,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C55.125,12.25 140.75,52.875 140.75,93.5',
        87.234375,
        37.640625,
        117.734375,
        25.390625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 55.125,93.5 140.75,93.5',
        23.015625,
        68.109375,
        53.515625,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 55.125,93.5 140.75,93.5',
        23.015625,
        68.109375,
        53.515625,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 55.125,93.5 140.75,93.5',
        23.015625,
        68.109375,
        53.515625,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 55.125,93.5 140.75,93.5',
        23.015625,
        68.109375,
        53.515625,
        55.859375,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSimpleBezierPath>[0]
    expected: ReturnType<typeof getSimpleBezierPath>
  }[])(
    'get-simple-bezier-path::0targetposition compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSimpleBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: { sourceX: -30.5, sourceY: 12.25, targetX: 7.125, targetY: 93.5 },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 7.125,52.875 7.125,93.5',
        -11.6875,
        52.875,
        18.8125,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSimpleBezierPath>[0]
    expected: ReturnType<typeof getSimpleBezierPath>
  }[])(
    'get-simple-bezier-path::0targetx compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSimpleBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 7.125,
      },
      expected: [
        'M-30.5,12.25 C-30.5,9.6875 140.75,9.6875 140.75,7.125',
        55.125,
        9.6875,
        85.625,
        2.5625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSimpleBezierPath>[0]
    expected: ReturnType<typeof getSimpleBezierPath>
  }[])(
    'get-simple-bezier-path::0targety compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSimpleBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5,12.25 C-30.5,52.875 140.75,52.875 140.75,93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: 140.75,
        sourceY: 93.5,
        targetX: -30.5,
        targetY: 12.25,
      },
      expected: [
        'M140.75,93.5 C140.75,52.875 -30.5,52.875 -30.5,12.25',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: -30.5,
        targetY: 12.25,
      },
      expected: [
        'M-30.5,12.25 C-30.5,12.25 -30.5,12.25 -30.5,12.25',
        -30.5,
        12.25,
        0,
        0,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSimpleBezierPath>[0]
    expected: ReturnType<typeof getSimpleBezierPath>
  }[])(
    'get-simple-bezier-path::getSimpleBezierPath compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSimpleBezierPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 50.125,12.25Q 55.125,12.25 55.125,17.25L 55.125,88.5Q 55.125,93.5 60.125,93.5L120.75 93.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
        borderRadius: 0,
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 55.125,12.25Q 55.125,12.25 55.125,12.25L 55.125,93.5Q 55.125,93.5 55.125,93.5L120.75 93.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
        borderRadius: 1000,
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 22.3125,12.25Q 55.125,12.25 55.125,45.0625L 55.125,60.6875Q 55.125,93.5 87.9375,93.5L120.75 93.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
        borderRadius: -5,
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 60.125,12.25Q 55.125,12.25 55.125,7.25L 55.125,98.5Q 55.125,93.5 50.125,93.5L120.75 93.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::0borderradius compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 50.125,12.25Q 55.125,12.25 55.125,17.25L 55.125,88.5Q 55.125,93.5 60.125,93.5L120.75 93.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
        centerX: 0,
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L -5,12.25Q 0,12.25 0,17.25L 0,88.5Q 0,93.5 5,93.5L120.75 93.5L140.75 93.5',
        0,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
        centerX: 23,
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 18,12.25Q 23,12.25 23,17.25L 23,88.5Q 23,93.5 28,93.5L120.75 93.5L140.75 93.5',
        23,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
        centerX: 33,
        centerY: 33,
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 28,12.25Q 33,12.25 33,17.25L 33,88.5Q 33,93.5 38,93.5L120.75 93.5L140.75 93.5',
        33,
        33,
        85.625,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::0centerx compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,47.875Q -30.5,52.875 -25.5,52.875L 135.75,52.875Q 140.75,52.875 140.75,57.875L140.75 73.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'top',
        centerY: 0,
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,5Q -30.5,0 -25.5,0L 135.75,0Q 140.75,0 140.75,5L140.75 73.5L140.75 93.5',
        55.125,
        0,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'top',
        centerY: 37,
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,34.625Q -30.5,37 -28.125,37L 135.75,37Q 140.75,37 140.75,42L140.75 73.5L140.75 93.5',
        55.125,
        37,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'top',
        centerX: 33,
        centerY: 33,
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,32.625Q -30.5,33 -30.125,33L 135.75,33Q 140.75,33 140.75,38L140.75 73.5L140.75 93.5',
        33,
        33,
        85.625,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::0centery compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 155.75,12.25Q 160.75,12.25 160.75,17.25L 160.75,88.5Q 160.75,93.5 155.75,93.5L140.75 93.5',
        75.125,
        12.25,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'right',
        offset: 0,
      },
      expected: [
        'M-30.5 12.25L-30.5 12.25L 135.75,12.25Q 140.75,12.25 140.75,17.25L140.75 93.5L140.75 93.5',
        55.125,
        12.25,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'right',
        offset: 35,
      },
      expected: [
        'M-30.5 12.25L4.5 12.25L 170.75,12.25Q 175.75,12.25 175.75,17.25L 175.75,88.5Q 175.75,93.5 170.75,93.5L140.75 93.5',
        90.125,
        12.25,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'right',
        offset: -10,
      },
      expected: [
        'M-30.5 12.25L-40.5 12.25L 125.75,12.25Q 130.75,12.25 130.75,17.25L 130.75,88.5Q 130.75,93.5 135.75,93.5L140.75 93.5',
        45.125,
        12.25,
        85.625,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::0offset compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,47.875Q -30.5,52.875 -25.5,52.875L 135.75,52.875Q 140.75,52.875 140.75,57.875L140.75 73.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5 12.25L -45.5,12.25Q -50.5,12.25 -50.5,17.25L -50.5,88.5Q -50.5,93.5 -45.5,93.5L120.75 93.5L140.75 93.5',
        35.125,
        93.5,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5 12.25L -45.5,12.25Q -50.5,12.25 -50.5,17.25L -50.5,47.875Q -50.5,52.875 -45.5,52.875L 155.75,52.875Q 160.75,52.875 160.75,57.875L 160.75,88.5Q 160.75,93.5 155.75,93.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5 12.25L -45.5,12.25Q -50.5,12.25 -50.5,17.25L -50.5,68.5Q -50.5,73.5 -45.5,73.5L 135.75,73.5Q 140.75,73.5 140.75,78.5L140.75 93.5',
        45.125,
        73.5,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5 12.25L -45.5,12.25Q -50.5,12.25 -50.5,17.25L -50.5,108.5Q -50.5,113.5 -45.5,113.5L 135.75,113.5Q 140.75,113.5 140.75,108.5L140.75 93.5',
        45.125,
        113.5,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 50.125,12.25Q 55.125,12.25 55.125,17.25L 55.125,88.5Q 55.125,93.5 60.125,93.5L120.75 93.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 155.75,12.25Q 160.75,12.25 160.75,17.25L 160.75,88.5Q 160.75,93.5 155.75,93.5L140.75 93.5',
        75.125,
        12.25,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 135.75,12.25Q 140.75,12.25 140.75,17.25L140.75 73.5L140.75 93.5',
        65.125,
        12.25,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5 12.25L -15.5,12.25Q -10.5,12.25 -10.5,17.25L -10.5,108.5Q -10.5,113.5 -5.5,113.5L 135.75,113.5Q 140.75,113.5 140.75,108.5L140.75 93.5',
        65.125,
        113.5,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5 12.25L -30.5,-2.75Q -30.5,-7.75 -25.5,-7.75L 115.75,-7.75Q 120.75,-7.75 120.75,-2.75L 120.75,88.5Q 120.75,93.5 125.75,93.5L140.75 93.5',
        45.125,
        -7.75,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5 12.25L -30.5,-2.75Q -30.5,-7.75 -25.5,-7.75L 155.75,-7.75Q 160.75,-7.75 160.75,-2.75L 160.75,88.5Q 160.75,93.5 155.75,93.5L140.75 93.5',
        65.125,
        -7.75,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5 12.25L -30.5,-2.75Q -30.5,-7.75 -25.5,-7.75L 135.75,-7.75Q 140.75,-7.75 140.75,-2.75L140.75 73.5L140.75 93.5',
        55.125,
        -7.75,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5 12.25L -30.5,-2.75Q -30.5,-7.75 -25.5,-7.75L 50.125,-7.75Q 55.125,-7.75 55.125,-2.75L 55.125,108.5Q 55.125,113.5 60.125,113.5L 135.75,113.5Q 140.75,113.5 140.75,108.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,88.5Q -30.5,93.5 -25.5,93.5L120.75 93.5L140.75 93.5',
        45.125,
        93.5,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5 12.25L -30.5,27.25Q -30.5,32.25 -25.5,32.25L 155.75,32.25Q 160.75,32.25 160.75,37.25L 160.75,88.5Q 160.75,93.5 155.75,93.5L140.75 93.5',
        65.125,
        32.25,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,47.875Q -30.5,52.875 -25.5,52.875L 135.75,52.875Q 140.75,52.875 140.75,57.875L140.75 73.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,108.5Q -30.5,113.5 -25.5,113.5L 135.75,113.5Q 140.75,113.5 140.75,108.5L140.75 93.5',
        55.125,
        113.5,
        85.625,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::0sourceposition compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,47.875Q -30.5,52.875 -25.5,52.875L 135.75,52.875Q 140.75,52.875 140.75,57.875L140.75 73.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: 7.125,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M7.125 12.25L7.125 32.25L 7.125,47.875Q 7.125,52.875 12.125,52.875L 135.75,52.875Q 140.75,52.875 140.75,57.875L140.75 73.5L140.75 93.5',
        73.9375,
        52.875,
        66.8125,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::0sourcex compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,47.875Q -30.5,52.875 -25.5,52.875L 135.75,52.875Q 140.75,52.875 140.75,57.875L140.75 73.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 7.125,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5 7.125L-30.5 27.125L -30.5,45.3125Q -30.5,50.3125 -25.5,50.3125L 135.75,50.3125Q 140.75,50.3125 140.75,55.3125L140.75 73.5L140.75 93.5',
        55.125,
        50.3125,
        85.625,
        43.1875,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::0sourcey compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 50.125,12.25Q 55.125,12.25 55.125,17.25L 55.125,88.5Q 55.125,93.5 60.125,93.5L120.75 93.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
        stepPosition: 0,
      },
      expected: [
        'M-30.5 12.25L -15.5,12.25Q -10.5,12.25 -10.5,17.25L -10.5,88.5Q -10.5,93.5 -5.5,93.5L120.75 93.5L140.75 93.5',
        -10.5,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
        stepPosition: 1,
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 115.75,12.25Q 120.75,12.25 120.75,17.25L 120.75,88.5Q 120.75,93.5 125.75,93.5L140.75 93.5',
        120.75,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
        stepPosition: 0.25,
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 17.3125,12.25Q 22.3125,12.25 22.3125,17.25L 22.3125,88.5Q 22.3125,93.5 27.3125,93.5L120.75 93.5L140.75 93.5',
        22.3125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
        stepPosition: -0.5,
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L -71.125,12.25Q -76.125,12.25 -76.125,17.25L -76.125,88.5Q -76.125,93.5 -71.125,93.5L120.75 93.5L140.75 93.5',
        -76.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
        stepPosition: 1.5,
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 181.375,12.25Q 186.375,12.25 186.375,17.25L 186.375,88.5Q 186.375,93.5 181.375,93.5L120.75 93.5L140.75 93.5',
        186.375,
        52.875,
        85.625,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::0stepposition compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,47.875Q -30.5,52.875 -25.5,52.875L 135.75,52.875Q 140.75,52.875 140.75,57.875L140.75 73.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5 12.25L -45.5,12.25Q -50.5,12.25 -50.5,17.25L -50.5,88.5Q -50.5,93.5 -45.5,93.5L120.75 93.5L140.75 93.5',
        35.125,
        93.5,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5 12.25L -45.5,12.25Q -50.5,12.25 -50.5,17.25L -50.5,47.875Q -50.5,52.875 -45.5,52.875L 155.75,52.875Q 160.75,52.875 160.75,57.875L 160.75,88.5Q 160.75,93.5 155.75,93.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5 12.25L -45.5,12.25Q -50.5,12.25 -50.5,17.25L -50.5,68.5Q -50.5,73.5 -45.5,73.5L 135.75,73.5Q 140.75,73.5 140.75,78.5L140.75 93.5',
        45.125,
        73.5,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'left',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5 12.25L -45.5,12.25Q -50.5,12.25 -50.5,17.25L -50.5,108.5Q -50.5,113.5 -45.5,113.5L 135.75,113.5Q 140.75,113.5 140.75,108.5L140.75 93.5',
        45.125,
        113.5,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 50.125,12.25Q 55.125,12.25 55.125,17.25L 55.125,88.5Q 55.125,93.5 60.125,93.5L120.75 93.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 155.75,12.25Q 160.75,12.25 160.75,17.25L 160.75,88.5Q 160.75,93.5 155.75,93.5L140.75 93.5',
        75.125,
        12.25,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5 12.25L-10.5 12.25L 135.75,12.25Q 140.75,12.25 140.75,17.25L140.75 73.5L140.75 93.5',
        65.125,
        12.25,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'right',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5 12.25L -15.5,12.25Q -10.5,12.25 -10.5,17.25L -10.5,108.5Q -10.5,113.5 -5.5,113.5L 135.75,113.5Q 140.75,113.5 140.75,108.5L140.75 93.5',
        65.125,
        113.5,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5 12.25L -30.5,-2.75Q -30.5,-7.75 -25.5,-7.75L 115.75,-7.75Q 120.75,-7.75 120.75,-2.75L 120.75,88.5Q 120.75,93.5 125.75,93.5L140.75 93.5',
        45.125,
        -7.75,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5 12.25L -30.5,-2.75Q -30.5,-7.75 -25.5,-7.75L 155.75,-7.75Q 160.75,-7.75 160.75,-2.75L 160.75,88.5Q 160.75,93.5 155.75,93.5L140.75 93.5',
        65.125,
        -7.75,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5 12.25L -30.5,-2.75Q -30.5,-7.75 -25.5,-7.75L 135.75,-7.75Q 140.75,-7.75 140.75,-2.75L140.75 73.5L140.75 93.5',
        55.125,
        -7.75,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'top',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5 12.25L -30.5,-2.75Q -30.5,-7.75 -25.5,-7.75L 50.125,-7.75Q 55.125,-7.75 55.125,-2.75L 55.125,108.5Q 55.125,113.5 60.125,113.5L 135.75,113.5Q 140.75,113.5 140.75,108.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'left',
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,88.5Q -30.5,93.5 -25.5,93.5L120.75 93.5L140.75 93.5',
        45.125,
        93.5,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'right',
      },
      expected: [
        'M-30.5 12.25L -30.5,27.25Q -30.5,32.25 -25.5,32.25L 155.75,32.25Q 160.75,32.25 160.75,37.25L 160.75,88.5Q 160.75,93.5 155.75,93.5L140.75 93.5',
        65.125,
        32.25,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'top',
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,47.875Q -30.5,52.875 -25.5,52.875L 135.75,52.875Q 140.75,52.875 140.75,57.875L140.75 73.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
        sourcePosition: 'bottom',
        targetPosition: 'bottom',
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,108.5Q -30.5,113.5 -25.5,113.5L 135.75,113.5Q 140.75,113.5 140.75,108.5L140.75 93.5',
        55.125,
        113.5,
        85.625,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::0targetposition compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,47.875Q -30.5,52.875 -25.5,52.875L 135.75,52.875Q 140.75,52.875 140.75,57.875L140.75 73.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: { sourceX: -30.5, sourceY: 12.25, targetX: 7.125, targetY: 93.5 },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,47.875Q -30.5,52.875 -25.5,52.875L 2.125,52.875Q 7.125,52.875 7.125,57.875L7.125 73.5L7.125 93.5',
        -11.6875,
        52.875,
        18.8125,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::0targetx compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,47.875Q -30.5,52.875 -25.5,52.875L 135.75,52.875Q 140.75,52.875 140.75,57.875L140.75 73.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 7.125,
      },
      expected: [
        'M-30.5 12.25L -30.5,27.25Q -30.5,32.25 -25.5,32.25L 50.125,32.25Q 55.125,32.25 55.125,27.25L 55.125,-7.875Q 55.125,-12.875 60.125,-12.875L 135.75,-12.875Q 140.75,-12.875 140.75,-7.875L140.75 7.125',
        55.125,
        9.6875,
        85.625,
        2.5625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::0targety compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L -30.5,47.875Q -30.5,52.875 -25.5,52.875L 135.75,52.875Q 140.75,52.875 140.75,57.875L140.75 73.5L140.75 93.5',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: 140.75,
        sourceY: 93.5,
        targetX: -30.5,
        targetY: 12.25,
      },
      expected: [
        'M140.75 93.5L 140.75,108.5Q 140.75,113.5 135.75,113.5L 60.125,113.5Q 55.125,113.5 55.125,108.5L 55.125,-2.75Q 55.125,-7.75 50.125,-7.75L -25.5,-7.75Q -30.5,-7.75 -30.5,-2.75L-30.5 12.25',
        55.125,
        52.875,
        85.625,
        40.625,
      ],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: -30.5,
        targetY: 12.25,
      },
      expected: [
        'M-30.5 12.25L-30.5 32.25L-30.5 -7.75L-30.5 12.25',
        -30.5,
        12.25,
        0,
        0,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getSmoothStepPath>[0]
    expected: ReturnType<typeof getSmoothStepPath>
  }[])(
    'get-smooth-step-path::getSmoothStepPath compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getSmoothStepPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: ['M -30.5,12.25L 140.75,93.5', 55.125, 52.875, 85.625, 40.625],
    },
    {
      params: {
        sourceX: 7.125,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M 7.125,12.25L 140.75,93.5',
        73.9375,
        52.875,
        66.8125,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getStraightPath>[0]
    expected: ReturnType<typeof getStraightPath>
  }[])(
    'get-straight-path::0sourcex compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getStraightPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: ['M -30.5,12.25L 140.75,93.5', 55.125, 52.875, 85.625, 40.625],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 7.125,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: [
        'M -30.5,7.125L 140.75,93.5',
        55.125,
        50.3125,
        85.625,
        43.1875,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getStraightPath>[0]
    expected: ReturnType<typeof getStraightPath>
  }[])(
    'get-straight-path::0sourcey compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getStraightPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: ['M -30.5,12.25L 140.75,93.5', 55.125, 52.875, 85.625, 40.625],
    },
    {
      params: { sourceX: -30.5, sourceY: 12.25, targetX: 7.125, targetY: 93.5 },
      expected: [
        'M -30.5,12.25L 7.125,93.5',
        -11.6875,
        52.875,
        18.8125,
        40.625,
      ],
    },
  ] satisfies {
    params: Parameters<typeof getStraightPath>[0]
    expected: ReturnType<typeof getStraightPath>
  }[])(
    'get-straight-path::0targetx compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getStraightPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: ['M -30.5,12.25L 140.75,93.5', 55.125, 52.875, 85.625, 40.625],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 7.125,
      },
      expected: ['M -30.5,12.25L 140.75,7.125', 55.125, 9.6875, 85.625, 2.5625],
    },
  ] satisfies {
    params: Parameters<typeof getStraightPath>[0]
    expected: ReturnType<typeof getStraightPath>
  }[])(
    'get-straight-path::0targety compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getStraightPath(params)).toStrictEqual(expected)
    }
  )

  it.each([
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: 140.75,
        targetY: 93.5,
      },
      expected: ['M -30.5,12.25L 140.75,93.5', 55.125, 52.875, 85.625, 40.625],
    },
    {
      params: {
        sourceX: 140.75,
        sourceY: 93.5,
        targetX: -30.5,
        targetY: 12.25,
      },
      expected: ['M 140.75,93.5L -30.5,12.25', 55.125, 52.875, 85.625, 40.625],
    },
    {
      params: {
        sourceX: -30.5,
        sourceY: 12.25,
        targetX: -30.5,
        targetY: 12.25,
      },
      expected: ['M -30.5,12.25L -30.5,12.25', -30.5, 12.25, 0, 0],
    },
  ] satisfies {
    params: Parameters<typeof getStraightPath>[0]
    expected: ReturnType<typeof getStraightPath>
  }[])(
    'get-straight-path::getStraightPath compares particular pinned full tuples: $params',
    ({ params, expected }) => {
      expect(getStraightPath(params)).toStrictEqual(expected)
    }
  )
})

describe('pure path helper arithmetic and ownership', () => {
  it('keeps backwards curvature control distance and raw negative curvature', () => {
    const params = {
      sourceX: 100,
      sourceY: 0,
      targetX: 0,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'left',
    } satisfies Parameters<typeof getBezierPath>[0]

    expect(getBezierPath({ ...params, curvature: 0.5 })).toStrictEqual([
      'M100,0 C225,0 -125,100 0,100',
      50,
      50,
      50,
      50,
    ])
    expect(getBezierPath({ ...params, curvature: -0.5 })).toStrictEqual([
      'M100,0 C-25,0 125,100 0,100',
      50,
      50,
      50,
      50,
    ])
  })

  it('returns fresh mutable tuples without mutating readonly coordinates', () => {
    const params = Object.freeze({
      sourceX: -10,
      sourceY: 20,
      targetX: 110,
      targetY: -60,
    })

    for (const helper of [
      getStraightPath,
      getBezierPath,
      getSimpleBezierPath,
      getSmoothStepPath,
    ]) {
      const first = helper(params)
      const second = helper(params)
      expect(first).not.toBe(second)
      expect(first).toStrictEqual(second)
      first[0] = 'caller changed path'
      first[1] = 999
      expect(helper(params)).toStrictEqual(second)
      expect(params).toStrictEqual({
        sourceX: -10,
        sourceY: 20,
        targetX: 110,
        targetY: -60,
      })
    }
  })

  it('preserves each exact optional assignment in the root compiler mode', () => {
    const coordinates = { sourceX: 0, sourceY: 0, targetX: 100, targetY: 100 }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined sourcePosition.
    const invalid0: Parameters<typeof getBezierPath>[0] = {
      ...coordinates,
      sourcePosition: undefined,
    }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined targetPosition.
    const invalid1: Parameters<typeof getBezierPath>[0] = {
      ...coordinates,
      targetPosition: undefined,
    }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined curvature.
    const invalid2: Parameters<typeof getBezierPath>[0] = {
      ...coordinates,
      curvature: undefined,
    }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined sourcePosition.
    const invalid3: Parameters<typeof getSimpleBezierPath>[0] = {
      ...coordinates,
      sourcePosition: undefined,
    }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined targetPosition.
    const invalid4: Parameters<typeof getSimpleBezierPath>[0] = {
      ...coordinates,
      targetPosition: undefined,
    }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined sourcePosition.
    const invalid5: Parameters<typeof getSmoothStepPath>[0] = {
      ...coordinates,
      sourcePosition: undefined,
    }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined targetPosition.
    const invalid6: Parameters<typeof getSmoothStepPath>[0] = {
      ...coordinates,
      targetPosition: undefined,
    }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined borderRadius.
    const invalid7: Parameters<typeof getSmoothStepPath>[0] = {
      ...coordinates,
      borderRadius: undefined,
    }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined centerX.
    const invalid8: Parameters<typeof getSmoothStepPath>[0] = {
      ...coordinates,
      centerX: undefined,
    }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined centerY.
    const invalid9: Parameters<typeof getSmoothStepPath>[0] = {
      ...coordinates,
      centerY: undefined,
    }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined offset.
    const invalid10: Parameters<typeof getSmoothStepPath>[0] = {
      ...coordinates,
      offset: undefined,
    }

    // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined stepPosition.
    const invalid11: Parameters<typeof getSmoothStepPath>[0] = {
      ...coordinates,
      stepPosition: undefined,
    }

    expect([
      invalid0,
      invalid1,
      invalid2,
      invalid3,
      invalid4,
      invalid5,
      invalid6,
      invalid7,
      invalid8,
      invalid9,
      invalid10,
      invalid11,
    ]).toHaveLength(12)
  })
})
