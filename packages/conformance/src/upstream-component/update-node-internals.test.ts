import {
  FlowDocumentSchema,
  emptyFlowMeasurementState,
  applyNodeMeasurement,
  NodeIdSchema,
} from '@flow/core'
import { Schema as S } from 'effect'
import { describe, test, expect } from 'vitest'

describe('Pinned Cypress component utilities', () => {
  // examples/react/cypress/components/utils/update-node-internals.cy.ts:17
  test('[UP-128-107] does not crash when a node parent is absent from nodeLookup', () => {
    const document = S.decodeUnknownSync(FlowDocumentSchema)({
      nodes: [
        {
          id: 'child',
          label: 'child',
          position: { x: 0, y: 0 },
          parentId: 'missing-parent',
          extent: 'parent',
          measured: { width: 50, height: 50 },
        },
      ],
      edges: [],
    })

    expect(() => {
      applyNodeMeasurement(document, emptyFlowMeasurementState(), {
        nodeId: NodeIdSchema.make('child'),
        generation: 0,
        width: 50,
        height: 50,
      })
    }).not.toThrow()
  })
})
