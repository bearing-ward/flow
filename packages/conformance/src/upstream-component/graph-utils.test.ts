import { isNode, isEdge, getOutgoers, getIncomers, addEdge } from '@flow/core'
import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { nodes, edges, node, edge, nodeId, edgeId } from './fixtures.ts'

describe('Pinned Cypress component utilities', () => {
  // examples/react/cypress/components/utils/graph-utils.cy.ts:22
  it('[UP-128-100] tests isNode function', () => {
    expect({ result: isNode(node(0)) }).toStrictEqual({ result: true })
    expect({ result: isNode(edge(0)) }).toStrictEqual({ result: false })
  })

  // examples/react/cypress/components/utils/graph-utils.cy.ts:27
  it('[UP-128-101] tests isEdge function', () => {
    expect({ result: isEdge(edge(0)) }).toStrictEqual({ result: true })
    expect({ result: isEdge(node(0)) }).toStrictEqual({ result: false })
  })

  // examples/react/cypress/components/utils/graph-utils.cy.ts:32
  it('[UP-128-102] tests getOutgoers function', () => {
    expect(getOutgoers(node(0), nodes, edges)).toHaveLength(2)
    expect(getOutgoers(node(2), nodes, edges)).toHaveLength(0)
  })

  // examples/react/cypress/components/utils/graph-utils.cy.ts:41
  it('[UP-128-103] tests getIncomers function', () => {
    expect(getIncomers(node(2), nodes, edges)).toHaveLength(2)
    expect(getIncomers(node(0), nodes, edges)).toHaveLength(0)
  })

  // examples/react/cypress/components/utils/graph-utils.cy.ts:50
  it('[UP-128-104] adds edge', () => {
    const next = addEdge(
      { ...edge(0), id: edgeId('new-edge-1-4'), target: nodeId('4') },
      edges
    )

    expect(next).toHaveLength(edges.length + 1)
  })

  // examples/react/cypress/components/utils/graph-utils.cy.ts:57
  it('[UP-128-105] tries to add existing edge', () => {
    expect(
      addEdge({ ...edge(2), id: edgeId('new-edge-2-3') }, edges)
    ).toHaveLength(edges.length)
  })

  // examples/react/cypress/components/utils/graph-utils.cy.ts:64
  it('[UP-128-106] tries to add invalid edge', () => {
    // Upstream only asserts inside catch; a non-throwing call satisfies that case.
    // Raw JSON deliberately bypasses the typed schema to exercise invalid JavaScript input.
    const invalidEdge = JSON.parse('{"nosource":"1","notarget":"3"}')

    let outcome:
      | { kind: 'returned' }
      | { kind: 'threw'; message: string | undefined } = { kind: 'returned' }

    try {
      addEdge(invalidEdge, edges)
    } catch (error) {
      const hasMessage = S.is(S.Struct({ message: S.String }))(error)
      outcome = {
        kind: 'threw',
        message: hasMessage ? error.message : undefined,
      }
    }

    expect([
      { kind: 'returned' },
      {
        kind: 'threw',
        message: "Can't create edge. An edge needs a source and a target.",
      },
    ]).toContainEqual(outcome)
  })
})
