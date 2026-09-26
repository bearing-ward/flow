import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowGraph } from './flow-graph.ts'
import { flowToolbarAnchors } from './flow-toolbar-anchor.ts'
import { decodeFlowDocument } from './flow.schema.ts'

describe('flow toolbar anchors', () => {
  it('projects nested node and edge anchors through viewport changes', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'parent',
            label: 'Parent',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 120 },
          },
          {
            id: 'child',
            label: 'Child',
            parentId: 'parent',
            position: { x: 20, y: 30 },
            size: { width: 80, height: 40 },
          },
        ],
        edges: [{ id: 'edge', source: 'parent', target: 'child' }],
      })
    )

    const graph = createFlowGraph(document)
    expect(flowToolbarAnchors(graph, { x: 10, y: 20, zoom: 1 })).toStrictEqual({
      nodes: [
        { id: 'parent', position: { x: 210, y: 120 } },
        { id: 'child', position: { x: 170, y: 150 } },
      ],
      edges: [{ id: 'edge', position: { x: 190, y: 175 } }],
    })
    expect(
      flowToolbarAnchors(graph, { x: 20, y: 30, zoom: 2 }).nodes[1]?.position
    ).toStrictEqual({ x: 340, y: 290 })
  })

  it('omits anchors for hidden nodes and their incident edges', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: 'a', label: 'A', position: { x: 0, y: 0 }, hidden: true },
          { id: 'b', label: 'B', position: { x: 200, y: 0 } },
        ],
        edges: [{ id: 'ab', source: 'a', target: 'b' }],
      })
    )

    expect(
      flowToolbarAnchors(createFlowGraph(document), { x: 0, y: 0, zoom: 1 })
    ).toStrictEqual({
      nodes: [{ id: 'b', position: { x: 275, y: 0 } }],
      edges: [],
    })
  })
})
