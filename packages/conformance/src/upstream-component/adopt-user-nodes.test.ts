import { NodeIdSchema } from '@flow/core'
import { describe, expect, it } from 'vitest'

import { lookup, fixtureNode } from './geometry.ts'

const id = NodeIdSchema.make

describe('Pinned Cypress component utilities', () => {
  // examples/react/cypress/components/utils/adopt-user-nodes.cy.ts:5
  it('[UP-128-077] builds node lookup', () => {
    const nodes = lookup([fixtureNode('1', 250, 5, 100, 50)])
    expect(nodes.size).toBe(1)
    expect(nodes.get(id('1'))).toHaveProperty('absolutePosition')
  })

  // examples/react/cypress/components/utils/adopt-user-nodes.cy.ts:23
  it('[UP-128-078] calculates positionAbsolute with nodeOrigin', () => {
    const nodes = lookup([fixtureNode('1', 250, 5, 100, 50)], [0.5, 0.5])
    expect(nodes.get(id('1'))?.absolutePosition).toStrictEqual({
      x: 200,
      y: -20,
    })
  })

  // examples/react/cypress/components/utils/adopt-user-nodes.cy.ts:48
  it('[UP-128-079] calculates positionAbsolute with nodeExtent', () => {
    // Flow exposes extent constraint separately from graph projection.
    const nodes = lookup([fixtureNode('1', 500, 500, 50, 25)], [0, 0], {
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
    })

    expect(nodes.get(id('1'))?.absolutePosition).toStrictEqual({ x: 50, y: 75 })
  })

  // examples/react/cypress/components/utils/adopt-user-nodes.cy.ts:73
  it('[UP-128-080] calculates positionAbsolute for sub flow', () => {
    const nodes = lookup([
      fixtureNode('1', 100, 100, 100, 50),
      fixtureNode('2', 0, 0, 100, 50, '1'),
    ])

    expect(nodes.size).toBe(2)
    expect(nodes.get(id('2'))?.absolutePosition).toStrictEqual({
      x: 100,
      y: 100,
    })
  })

  // examples/react/cypress/components/utils/adopt-user-nodes.cy.ts:106
  it('[UP-128-081] calculates positionAbsolute for sub flow with nodeOrigin', () => {
    const nodes = lookup(
      [
        fixtureNode('1', 100, 100, 100, 50),
        fixtureNode('2', 0, 0, 100, 50, '1'),
      ],
      [0.5, 0.5]
    )

    expect(nodes.get(id('1'))?.absolutePosition).toStrictEqual({ x: 50, y: 75 })
    expect(nodes.get(id('2'))?.absolutePosition).toStrictEqual({ x: 0, y: 50 })
  })

  // examples/react/cypress/components/utils/adopt-user-nodes.cy.ts:146
  it('[UP-128-082] calculates positionAbsolute for sub flow with nodeExtent', () => {
    const nodes = lookup(
      [
        fixtureNode('a', 500, 500, 100, 50),
        fixtureNode('b', 0, 0, 100, 50),
        fixtureNode('c', 1000, 1000, 100, 50, 'a'),
      ],
      [0, 0],
      { minX: 0, minY: 0, maxX: 200, maxY: 200 }
    )

    expect(nodes.get(id('a'))?.absolutePosition).toStrictEqual({
      x: 100,
      y: 150,
    })
    expect(nodes.get(id('b'))?.absolutePosition).toStrictEqual({ x: 0, y: 0 })
    expect(nodes.get(id('c'))?.absolutePosition).toStrictEqual({
      x: 100,
      y: 150,
    })
  })
})
