import { describe, expect, it } from 'vitest'

import {
  getClosestNode,
  getProximityConnection,
  resolveNodeCollisions,
} from './flow-collision.ts'

const box = (id: string, x: number, y: number, width = 100, height = 50) => ({
  id,
  bounds: { x, y, width, height },
})

/** The deepest overlap left between any pair, on its shallower axis. */
const deepestOverlap = (boxes: readonly ReturnType<typeof box>[]): number =>
  Math.max(
    0,
    ...boxes.flatMap((first, index) =>
      boxes.slice(index + 1).map(({ bounds: b }) => {
        const a = first.bounds
        const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
        const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)

        return Math.min(x, y)
      })
    )
  )

describe(resolveNodeCollisions, () => {
  it('separates two nodes along the axis needing the smaller move', () => {
    const [a, b] = resolveNodeCollisions([box('a', 0, 0), box('b', 80, 10)])

    // 20 units of horizontal overlap against 40 vertical: split along x.
    expect(a?.bounds).toStrictEqual({ x: -10, y: 0, width: 100, height: 50 })
    expect(b?.bounds).toStrictEqual({ x: 90, y: 10, width: 100, height: 50 })
  })

  it('keeps fixed nodes in place and adds a margin', () => {
    const [a, b] = resolveNodeCollisions([box('a', 0, 0), box('b', 80, 10)], {
      fixedIds: ['a'],
      margin: 10,
    })

    expect(a?.bounds.x).toBe(0)
    expect(b?.bounds.x).toBe(110)
  })

  it('resolves a pile and leaves separate nodes and extra fields untouched', () => {
    const pile = [
      { ...box('a', 0, 0), tag: 'kept' },
      box('b', 10, 10),
      box('c', 20, 5),
      box('far', 500, 500),
    ]

    const resolved = resolveNodeCollisions(pile, { maxIterations: 100 })

    expect(deepestOverlap(resolved)).toBeLessThanOrEqual(0.5)
    expect(resolved[0]).toHaveProperty('tag', 'kept')
    expect(resolved[3]?.bounds).toStrictEqual(pile[3]?.bounds)
    expect(pile[0]?.bounds.x).toBe(0)
  })

  it('ignores overlaps under the threshold and pushes coincident nodes apart', () => {
    expect(
      resolveNodeCollisions([box('a', 0, 0), box('b', 99.8, 0)]).map(
        ({ bounds }) => bounds.x
      )
    ).toStrictEqual([0, 99.8])
    expect(
      resolveNodeCollisions([box('a', 0, 0), box('b', 0, 0)]).map(
        ({ bounds }) => bounds.y
      )
    ).toStrictEqual([-25, 25])
  })
})

describe(getClosestNode, () => {
  const nodes = [box('a', 0, 0), box('b', 100, 0), box('c', 300, 0)]

  it('returns the closest candidate strictly within the distance', () => {
    expect(
      getClosestNode(nodes, box('d', 130, 40).bounds, { maxDistance: 150 })
    ).toStrictEqual({ node: nodes[1], distance: 50 })
    expect(
      getClosestNode(nodes, box('d', 150, 0).bounds, {
        maxDistance: 50,
      })
    ).toBeUndefined()
  })

  it('skips excluded ids and can compare centers', () => {
    expect(
      getClosestNode(nodes, nodes[1]?.bounds ?? box('x', 0, 0).bounds, {
        maxDistance: 150,
        excludeIds: ['b'],
      })?.node.id
    ).toBe('a')
    expect(
      getClosestNode([box('big', 0, 0, 400, 400)], box('d', 150, 150).bounds, {
        maxDistance: 100,
        measure: 'center',
      })?.distance
    ).toBeCloseTo(Math.hypot(0, 25))
  })
})

describe(getProximityConnection, () => {
  const nodes = [box('a', 0, 0), box('b', 400, 0)]

  it('connects the left node as source', () => {
    expect(
      getProximityConnection(nodes, box('drag', 120, 0), { maxDistance: 150 })
    ).toStrictEqual({ source: 'a', target: 'drag', distance: 120 })
    expect(
      getProximityConnection(nodes, box('drag', 300, 0), { maxDistance: 150 })
    ).toStrictEqual({ source: 'drag', target: 'b', distance: 100 })
  })

  it('never connects a node to itself or beyond the distance', () => {
    expect(
      getProximityConnection([box('drag', 0, 0)], box('drag', 10, 0), {
        maxDistance: 150,
      })
    ).toBeUndefined()
    expect(
      getProximityConnection(nodes, box('drag', 200, 200), { maxDistance: 150 })
    ).toBeUndefined()
  })
})
