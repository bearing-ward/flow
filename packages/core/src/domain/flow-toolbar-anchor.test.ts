import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowGraph } from './flow-graph.ts'
import { flowToolbarAnchors, nodeToolbarAnchor } from './flow-toolbar-anchor.ts'
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

  it('supports node toolbar position, alignment, and screen-space offset', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'node',
            label: 'Node',
            position: { x: 10, y: 20 },
            size: { width: 100, height: 40 },
          },
        ],
        edges: [],
      })
    )

    const node = document.nodes.find(({ id }) => id === 'node')

    if (node === undefined) {
      throw new Error('Expected node is missing from decoded document')
    }

    const graph = createFlowGraph(document)
    const viewport = { x: 5, y: 7, zoom: 2 }

    expect(
      nodeToolbarAnchor(graph, node.id, viewport, {
        position: 'right',
        align: 'end',
        offset: 8,
      })?.position
    ).toStrictEqual({ x: 233, y: 127 })
  })
})
