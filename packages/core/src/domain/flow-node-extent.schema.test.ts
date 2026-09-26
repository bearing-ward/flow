import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  NodeDimensionsSchema,
  NodeExtentSchema,
  constrainNodeGroupDelta,
  constrainNodePosition,
} from './flow-node-extent.schema.ts'

const extent = { minX: 0, minY: 0, maxX: 100, maxY: 80 }

describe('node extent', () => {
  it('decodes ordered finite bounds and nonnegative dimensions', () => {
    expect(S.decodeSync(NodeExtentSchema)(extent)).toStrictEqual(extent)
    expect(
      S.decodeSync(NodeDimensionsSchema)({ width: 20, height: 0 })
    ).toStrictEqual({
      width: 20,
      height: 0,
    })
    expect(() =>
      S.decodeSync(NodeExtentSchema)({ ...extent, minX: 101 })
    ).toThrow(/minimums must be less than or equal to maximums/u)
    expect(() =>
      S.decodeSync(NodeDimensionsSchema)({ width: -1, height: 20 })
    ).toThrow(/Expected a value greater than or equal to 0/u)
  })

  it('keeps the full measured node inside each bound', () => {
    expect(
      constrainNodePosition(
        { x: -10, y: 90 },
        { width: 20, height: 30 },
        extent
      )
    ).toStrictEqual({ x: 0, y: 50 })
    expect(
      constrainNodePosition(
        { x: 90, y: -10 },
        { width: 20, height: 30 },
        extent
      )
    ).toStrictEqual({ x: 80, y: 0 })
  })

  it('centers an oversized node on the axes where it cannot fit', () => {
    expect(
      constrainNodePosition(
        { x: 999, y: -999 },
        { width: 120, height: 100 },
        extent
      )
    ).toStrictEqual({ x: -10, y: -10 })
  })

  it('clamps one group delta and preserves spacing', () => {
    const nodes = [
      { position: { x: 10, y: 5 }, width: 20, height: 15 },
      { position: { x: 60, y: 35 }, width: 20, height: 15 },
    ]

    const delta = constrainNodeGroupDelta(nodes, { x: 50, y: 50 }, extent)

    expect(delta).toStrictEqual({ x: 20, y: 30 })
    expect(
      nodes.map((node) => ({
        x: node.position.x + delta.x,
        y: node.position.y + delta.y,
      }))
    ).toStrictEqual([
      { x: 30, y: 35 },
      { x: 80, y: 65 },
    ])
  })

  it('centers an oversized group and leaves an empty group unchanged', () => {
    expect(
      constrainNodeGroupDelta(
        [
          { position: { x: 0, y: 0 }, width: 20, height: 20 },
          { position: { x: 110, y: 0 }, width: 20, height: 20 },
        ],
        { x: 200, y: 10 },
        extent
      )
    ).toStrictEqual({ x: -15, y: 10 })
    expect(constrainNodeGroupDelta([], { x: 3, y: -2 }, extent)).toStrictEqual({
      x: 3,
      y: -2,
    })
  })
})
