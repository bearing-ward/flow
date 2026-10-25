import {
  constrainNodePosition,
  createFlowGraph,
  FlowDocumentSchema,
  NodeIdSchema,
} from '@flow/core'
import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

describe('Pinned Cypress component utilities', () => {
  // examples/react/cypress/components/utils/calculate-node-position.cy.ts:5
  it("[UP-128-093] clamps a child with extent 'parent' to a parent that has an intrinsic size but is not measured yet", () => {
    const document = S.decodeUnknownSync(FlowDocumentSchema)({
      nodes: [
        {
          id: 'parent',
          label: 'parent',
          position: { x: 0, y: 0 },
          size: { width: 200, height: 100 },
        },
        {
          id: 'child',
          label: 'child',
          position: { x: 0, y: 0 },
          measured: { width: 50, height: 50 },
          parentId: 'parent',
          extent: 'parent',
        },
      ],
      edges: [],
    })

    const graph = createFlowGraph(document)
    const parent = graph.nodes.get(NodeIdSchema.make('parent'))
    const child = graph.nodes.get(NodeIdSchema.make('child'))

    if (!parent || !child) {
      throw new Error('Missing fixture nodes')
    }

    const positionAbsolute = constrainNodePosition(
      { x: 500, y: 500 },
      child.dimensions,
      {
        minX: parent.absolutePosition.x,
        minY: parent.absolutePosition.y,
        maxX: parent.absolutePosition.x + parent.dimensions.width,
        maxY: parent.absolutePosition.y + parent.dimensions.height,
      }
    )

    expect(positionAbsolute.x).toBe(150)
    expect(positionAbsolute.y).toBe(50)
  })
})
