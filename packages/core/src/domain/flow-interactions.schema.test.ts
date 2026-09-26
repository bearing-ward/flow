import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowGraph } from './flow-graph.ts'
import {
  applyNodePositionsChange,
  moveNodeGroupDrag,
  movePinch,
  moveSelectedNodes,
  screenToFlowPosition,
  selectionAutoPanDelta,
} from './flow-runtime.schema.ts'
import { selectionInRect } from './flow-visibility.schema.ts'
import { decodeFlowDocument, NodeIdSchema } from './flow.schema.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'first',
        label: 'First',
        position: { x: 10, y: 10 },
        selected: true,
      },
      {
        id: 'second',
        label: 'Second',
        position: { x: 40, y: 10 },
        selected: true,
      },
      {
        id: 'tangent',
        label: 'Tangent',
        position: { x: 50, y: 10 },
      },
      {
        id: 'hidden',
        label: 'Hidden',
        position: { x: 5, y: 5 },
        selected: true,
        hidden: true,
      },
      {
        id: 'locked',
        label: 'Locked',
        position: { x: 5, y: 5 },
        selectable: false,
      },
    ],
    edges: [],
  })
)

describe('rectangle selection modes', () => {
  it('requires containment in full mode and positive overlap in partial mode', () => {
    const measurements = new Map(
      document.nodes.map((node) => [
        node.id,
        { nodeId: node.id, width: 20, height: 20 },
      ])
    )

    const rect = { x: 0, y: 0, width: 50, height: 50 }

    expect(
      selectionInRect(createFlowGraph(document, measurements), rect, 'full')
        .nodeIds
    ).toStrictEqual(['first'])
    expect(
      selectionInRect(createFlowGraph(document, measurements), rect, 'partial')
        .nodeIds
    ).toStrictEqual(['first', 'second'])
  })
})

describe('moving selected nodes', () => {
  it('moves only the selected ancestor when descendants are also selected', () => {
    const nested = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'root',
            label: 'Root',
            position: { x: 100, y: 100 },
            selected: true,
          },
          {
            id: 'child',
            label: 'Child',
            parentId: 'root',
            position: { x: 10, y: 20 },
            selected: true,
          },
          {
            id: 'leaf',
            label: 'Leaf',
            parentId: 'child',
            position: { x: 3, y: 4 },
            selected: true,
          },
        ],
        edges: [],
      })
    )

    expect(moveSelectedNodes(nested, { x: 5, y: 6 }).positions).toStrictEqual([
      { nodeId: 'root', position: { x: 105, y: 106 } },
    ])
  })

  it("keeps a directly selected child's emitted position parent-local", () => {
    const nested = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: 'root', label: 'Root', position: { x: 100, y: 100 } },
          {
            id: 'child',
            label: 'Child',
            parentId: 'root',
            position: { x: 10, y: 20 },
            selected: true,
          },
        ],
        edges: [],
      })
    )

    expect(moveSelectedNodes(nested, { x: 5, y: 6 }).positions).toStrictEqual([
      { nodeId: 'child', position: { x: 15, y: 26 } },
    ])
  })

  it('makes one semantic change for visible selected nodes', () => {
    const change = moveSelectedNodes(document, { x: 3, y: -4 })

    expect(change).toStrictEqual({
      kind: 'node-positions',
      positions: [
        { nodeId: 'first', position: { x: 13, y: 6 } },
        { nodeId: 'second', position: { x: 43, y: 6 } },
      ],
    })
    expect(document.nodes[0]?.position).toStrictEqual({ x: 10, y: 10 })
  })

  it('applies all positions together and preserves the original document', () => {
    const change = moveSelectedNodes(document, { x: 3, y: -4 })
    const next = applyNodePositionsChange(document, change)

    expect(next?.nodes[0]?.position).toStrictEqual({ x: 13, y: 6 })
    expect(next?.nodes[1]?.position).toStrictEqual({ x: 43, y: 6 })
    expect(next?.nodes[2]).toBe(document.nodes[2])
    expect(document.nodes[0]?.position).toStrictEqual({ x: 10, y: 10 })
  })

  it('rejects position changes with missing targets or duplicate IDs', () => {
    const change = moveSelectedNodes(document, { x: 3, y: -4 })
    const [firstPosition] = change.positions

    if (firstPosition === undefined) {
      throw new Error('Missing first position in movement fixture')
    }

    expect(
      applyNodePositionsChange(document, {
        ...change,
        positions: [
          ...change.positions,
          {
            nodeId: S.decodeSync(NodeIdSchema)('missing'),
            position: { x: 0, y: 0 },
          },
        ],
      })
    ).toBeUndefined()
    expect(
      applyNodePositionsChange(document, {
        ...change,
        positions: [...change.positions, firstPosition],
      })
    ).toBeUndefined()
  })

  it('moves a selected group by one shared pointer delta', () => {
    const [first, second] = document.nodes

    if (first === undefined || second === undefined) {
      throw new Error('Missing group drag fixture nodes')
    }

    const drag = {
      anchorNodeId: first.id,
      pointerId: 7,
      pointerStart: { x: 10, y: 20 },
      positions: [
        { nodeId: first.id, position: first.position },
        { nodeId: second.id, position: second.position },
      ],
    }

    expect(moveNodeGroupDrag(drag, { x: 40, y: -10 })).toStrictEqual({
      kind: 'node-positions',
      positions: [
        { nodeId: 'first', position: { x: 40, y: -20 } },
        { nodeId: 'second', position: { x: 70, y: -20 } },
      ],
    })
    expect(drag.positions[0]?.position).toStrictEqual({ x: 10, y: 10 })
  })
})

describe('pinch and selection auto-pan geometry', () => {
  it("preserves the starting midpoint's flow anchor while moving and zooming", () => {
    const pinch = {
      firstPointerId: 1,
      secondPointerId: 2,
      firstStart: { x: 0, y: 0 },
      secondStart: { x: 100, y: 0 },
      viewportStart: { x: 10, y: 20, zoom: 1 },
    }

    const next = movePinch(
      pinch,
      { x: 10, y: 0 },
      { x: 210, y: 0 },
      { minZoom: 0.5, maxZoom: 3 }
    )

    expect(next).toStrictEqual({ x: 30, y: 40, zoom: 2 })
    expect(screenToFlowPosition({ x: 110, y: 0 }, next)).toStrictEqual(
      screenToFlowPosition({ x: 50, y: 0 }, pinch.viewportStart)
    )
    expect(
      movePinch(
        pinch,
        { x: 10, y: 0 },
        { x: 210, y: 0 },
        { minZoom: 0.5, maxZoom: 1.5 }
      )
    ).toStrictEqual({ x: 50, y: 30, zoom: 1.5 })
  })

  it('pans inward at each edge and stops at the band boundary', () => {
    expect(selectionAutoPanDelta({ x: 5, y: 10 }, 200, 100)).toStrictEqual({
      x: 15,
      y: 15,
    })
    expect(selectionAutoPanDelta({ x: 195, y: 95 }, 200, 100)).toStrictEqual({
      x: -15,
      y: -15,
    })
    expect(selectionAutoPanDelta({ x: 40, y: 60 }, 200, 100)).toStrictEqual({
      x: 0,
      y: 0,
    })
  })
})
