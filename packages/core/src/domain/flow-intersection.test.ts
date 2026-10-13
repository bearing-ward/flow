import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  getInternalNodeBounds,
  getIntersectingNodes,
  getRectOverlapArea,
  isRectIntersecting,
} from './flow-intersection.ts'
import { FlowNodeSchema } from './flow.schema.ts'

const box = (id: string, x: number, y: number, width = 100, height = 50) => ({
  id,
  bounds: { x, y, width, height },
})

describe(getRectOverlapArea, () => {
  it('measures the shared area and ignores touching edges', () => {
    expect(
      getRectOverlapArea(
        { x: 0, y: 0, width: 100, height: 50 },
        { x: 50, y: 25, width: 100, height: 50 }
      )
    ).toBe(1250)
    expect(
      getRectOverlapArea(
        { x: 0, y: 0, width: 100, height: 50 },
        { x: 100, y: 0, width: 10, height: 10 }
      )
    ).toBe(0)
  })
})

describe(isRectIntersecting, () => {
  const area = { x: 0, y: 0, width: 200, height: 200 }

  it('accepts any overlap when partial', () => {
    expect(
      isRectIntersecting({ x: 190, y: 0, width: 50, height: 50 }, area)
    ).toBeTruthy()
  })

  it('needs containment either way when not partial', () => {
    expect(
      isRectIntersecting({ x: 190, y: 0, width: 50, height: 50 }, area, false)
    ).toBeFalsy()
    expect(
      isRectIntersecting({ x: 10, y: 10, width: 50, height: 50 }, area, false)
    ).toBeTruthy()
    expect(
      isRectIntersecting(
        { x: -10, y: -10, width: 400, height: 400 },
        area,
        false
      )
    ).toBeTruthy()
  })

  it('never intersects a zero-area rectangle', () => {
    expect(
      isRectIntersecting({ x: 10, y: 10, width: 0, height: 0 }, area)
    ).toBeFalsy()
  })
})

describe(getIntersectingNodes, () => {
  const nodes = [box('a', 0, 0), box('b', 150, 0), box('c', 40, 20)]

  it('returns intersecting candidates in input order', () => {
    expect(
      getIntersectingNodes(nodes, { x: 0, y: 0, width: 120, height: 60 }).map(
        ({ id }) => id
      )
    ).toStrictEqual(['a', 'c'])
  })

  it('excludes ids and supports full containment', () => {
    expect(
      getIntersectingNodes(nodes, box('a', 0, 0).bounds, {
        excludeIds: ['a'],
      }).map(({ id }) => id)
    ).toStrictEqual(['c'])
    expect(
      getIntersectingNodes(
        nodes,
        { x: -10, y: -10, width: 130, height: 70 },
        { partially: false }
      ).map(({ id }) => id)
    ).toStrictEqual(['a'])
  })
})

describe(getInternalNodeBounds, () => {
  it('reads absolute measured bounds', () => {
    expect(
      getInternalNodeBounds({
        absolutePosition: { x: 5, y: 6 },
        handles: [],
        height: 40,
        width: 90,
        measurementStatus: 'measured',
        node: S.decodeUnknownSync(FlowNodeSchema)({
          id: 'n',
          label: 'n',
          position: { x: 1, y: 2 },
        }),
      })
    ).toStrictEqual({ id: 'n', bounds: { x: 5, y: 6, width: 90, height: 40 } })
  })
})
