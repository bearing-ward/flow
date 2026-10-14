import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { calculateFlowExpandParentDrag } from './flow-expand-parent.ts'
import { createFlowGraph } from './flow-graph.ts'
import { NodeIdSchema } from './flow-values.ts'
import { decodeFlowDocument } from './flow.schema.ts'

describe('expandParent drag', () => {
  it('clamps the dragged child at 0 while the parent shifts, like updateNodePositions', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'parent',
            label: 'Parent',
            position: { x: 100, y: 100 },
            size: { width: 100, height: 100 },
          },
          {
            id: 'child',
            label: 'Child',
            parentId: 'parent',
            extent: 'parent',
            expandParent: true,
            position: { x: 10, y: 10 },
            size: { width: 20, height: 20 },
          },
          {
            id: 'sibling',
            label: 'Sibling',
            parentId: 'parent',
            position: { x: 50, y: 50 },
            size: { width: 10, height: 10 },
          },
          { id: 'free', label: 'Free', position: { x: 0, y: 0 } },
        ],
        edges: [],
      })
    )

    expect(
      calculateFlowExpandParentDrag(createFlowGraph(document), [
        { id: NodeIdSchema.make('child'), position: { x: -20, y: 10 } },
        { id: NodeIdSchema.make('free'), position: { x: -5, y: -5 } },
      ])
    ).toStrictEqual([
      { kind: 'position', nodeId: 'child', position: { x: 0, y: 10 } },
      { kind: 'position', nodeId: 'free', position: { x: -5, y: -5 } },
      { kind: 'position', nodeId: 'parent', position: { x: 80, y: 100 } },
      { kind: 'position', nodeId: 'sibling', position: { x: 70, y: 50 } },
      { kind: 'size', nodeId: 'parent', size: { width: 120, height: 100 } },
    ])
  })
})
