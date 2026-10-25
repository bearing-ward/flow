import { getNodesBounds } from '@flow/core'
import { describe, expect, it } from 'vitest'

import { lookup, fixtureNode, lookupNodes } from './geometry.ts'

describe('Pinned Cypress component utilities', () => {
  // examples/react/cypress/components/utils/get-nodes-bounds.cy.ts:5
  it('[UP-128-094] calculates bounds for a node', () => {
    const nodeLookup = lookup([fixtureNode('1', 10, 10, 100, 50)])
    expect(
      getNodesBounds(lookupNodes(nodeLookup, ['1']), { nodeLookup })
    ).toStrictEqual({
      x: 10,
      y: 10,
      width: 100,
      height: 50,
    })
  })

  // examples/react/cypress/components/utils/get-nodes-bounds.cy.ts:28
  it('[UP-128-095] calculates bounds for a node (-x, -y)', () => {
    const nodeLookup = lookup([fixtureNode('1', -10, -10, 100, 50)])
    expect(
      getNodesBounds(lookupNodes(nodeLookup, ['1']), { nodeLookup })
    ).toStrictEqual({
      x: -10,
      y: -10,
      width: 100,
      height: 50,
    })
  })

  // examples/react/cypress/components/utils/get-nodes-bounds.cy.ts:51
  it('[UP-128-096] calculates bounds for multitple nodes', () => {
    const nodeLookup = lookup([
      fixtureNode('1', -10, 10, 100, 50),
      fixtureNode('2', 100, 100, 100, 50),
    ])

    expect(
      getNodesBounds(lookupNodes(nodeLookup, ['1', '2']), { nodeLookup })
    ).toStrictEqual({
      x: -10,
      y: 10,
      width: 210,
      height: 140,
    })
  })

  // examples/react/cypress/components/utils/get-nodes-bounds.cy.ts:80
  it('[UP-128-097] calculates bounds for a node with a child node', () => {
    const nodeLookup = lookup([
      fixtureNode('1', 10, 10, 100, 50),
      fixtureNode('2', 200, 100, 100, 50, '1'),
      fixtureNode('3', 0, 200, 100, 50, '1'),
    ])

    expect(
      getNodesBounds(lookupNodes(nodeLookup, ['1', '2', '3']), { nodeLookup })
    ).toStrictEqual({
      x: 10,
      y: 10,
      width: 300,
      height: 250,
    })
  })

  // examples/react/cypress/components/utils/get-nodes-bounds.cy.ts:117
  it('[UP-128-098] calculates bounds for child nodes', () => {
    const nodeLookup = lookup([
      fixtureNode('1', 10, 10, 100, 50),
      fixtureNode('2', 20, 20, 100, 50, '1'),
      fixtureNode('3', 20, 200, 100, 50, '1'),
    ])

    expect(
      getNodesBounds(lookupNodes(nodeLookup, ['2', '3']), { nodeLookup })
    ).toStrictEqual({
      x: 30,
      y: 30,
      width: 100,
      height: 230,
    })
  })

  // examples/react/cypress/components/utils/get-nodes-bounds.cy.ts:154
  it('[UP-128-099] ignores unresolvable ids instead of stretching the bounds to the origin', () => {
    const nodeLookup = lookup([fixtureNode('1', 100, 100, 100, 50)])
    expect(getNodesBounds(['1', '2'], { nodeLookup })).toStrictEqual({
      x: 100,
      y: 100,
      width: 100,
      height: 50,
    })
  })
})
