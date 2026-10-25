import { applyNodeChanges, applyEdgeChanges } from '@flow/core'
import type {
  FlowNode,
  FlowEdge,
  XYPosition,
  NodeChange,
  EdgeChange,
} from '@flow/core'
import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { nodes, edges, node, edge, nodeId, edgeId } from './fixtures.ts'

describe('Pinned Cypress component utilities', () => {
  // examples/react/cypress/components/utils/apply-changes.cy.ts:30
  it('[UP-128-083] adds a node/edge', () => {
    const currentNodes: FlowNode[] = []
    const nodeChanges: NodeChange[] = [{ type: 'add', item: node(0) }]
    const nextNodes = applyNodeChanges(nodeChanges, currentNodes)
    expect(nextNodes).toHaveLength(nodeChanges.length)

    const currentEdges: FlowEdge[] = []
    const edgeChanges: EdgeChange[] = [{ type: 'add', item: edge(0) }]
    const nextEdges = applyEdgeChanges(edgeChanges, currentEdges)

    expect(nextEdges).toHaveLength(1)
  })

  // examples/react/cypress/components/utils/apply-changes.cy.ts:43
  it('[UP-128-084] adds multiple nodes/edges', () => {
    const currentNodes: FlowNode[] = []

    const nodeChanges: NodeChange[] = [
      { type: 'add', item: node(0) },
      { type: 'add', item: node(1) },
    ]

    const nextNodes = applyNodeChanges(nodeChanges, currentNodes)
    expect(nextNodes).toHaveLength(nodeChanges.length)

    const currentEdges: FlowEdge[] = []

    const edgeChanges: EdgeChange[] = [
      { type: 'add', item: edge(0) },
      { type: 'add', item: edge(1) },
    ]

    const nextEdges = applyEdgeChanges(edgeChanges, currentEdges)
    expect(nextEdges).toHaveLength(edgeChanges.length)
  })

  // examples/react/cypress/components/utils/apply-changes.cy.ts:61
  it('[UP-128-085] removes a node/edge', () => {
    const nodesLength = nodes.length
    const nodeChanges: NodeChange[] = [{ type: 'remove', id: nodeId('1') }]
    const nextNodes = applyNodeChanges(nodeChanges, nodes)
    expect(nextNodes).toHaveLength(nodes.length - nodeChanges.length)
    expect(nodes).toHaveLength(nodesLength)

    const edgesLength = edges.length
    const edgeChanges: EdgeChange[] = [{ type: 'remove', id: edgeId('e1-2') }]
    const nextEdges = applyEdgeChanges(edgeChanges, edges)
    expect(nextEdges).toHaveLength(edges.length - 1)
    expect(edges).toHaveLength(edgesLength)
  })

  // examples/react/cypress/components/utils/apply-changes.cy.ts:75
  it('[UP-128-086] removes multiple node/edge', () => {
    const nodesLength = nodes.length

    const nodeChanges: NodeChange[] = [
      { type: 'remove', id: nodeId('1') },
      { type: 'remove', id: nodeId('2') },
    ]

    const nextNodes = applyNodeChanges(nodeChanges, nodes)
    expect(nextNodes).toHaveLength(nodes.length - nodeChanges.length)
    expect(nodes).toHaveLength(nodesLength)

    const edgesLength = edges.length

    const edgeChanges: EdgeChange[] = [
      { type: 'remove', id: edgeId('e1-2') },
      { type: 'remove', id: edgeId('e1-3') },
    ]

    const nextEdges = applyEdgeChanges(edgeChanges, edges)
    expect(nextEdges).toHaveLength(edges.length - edgeChanges.length)
    expect(edges).toHaveLength(edgesLength)
  })

  // examples/react/cypress/components/utils/apply-changes.cy.ts:95
  it('[UP-128-087] selects a node/edge', () => {
    const nodeChanges: NodeChange[] = [
      { type: 'select', id: nodeId('1'), selected: true },
    ]

    const nextNodes = applyNodeChanges(nodeChanges, nodes)
    expect({ selected: nextNodes[0]?.selected }).toStrictEqual({
      selected: true,
    })

    const edgeChanges: EdgeChange[] = [
      { type: 'select', id: edgeId('e1-2'), selected: true },
    ]

    const nextEdges = applyEdgeChanges(edgeChanges, edges)
    expect({ selected: nextEdges[0]?.selected }).toStrictEqual({
      selected: true,
    })
  })

  // examples/react/cypress/components/utils/apply-changes.cy.ts:105
  it('[UP-128-088] deselects a node/edge', () => {
    const nodeChanges: NodeChange[] = [
      { type: 'select', id: nodeId('1'), selected: false },
    ]

    const nextNodes = applyNodeChanges(
      nodeChanges,
      nodes.map((n) => ({ ...n, selected: true }))
    )

    expect({ selected: nextNodes[0]?.selected }).toStrictEqual({
      selected: false,
    })
    expect({ selected: nextNodes[1]?.selected }).toStrictEqual({
      selected: true,
    })

    const edgeChanges: EdgeChange[] = [
      { type: 'select', id: edgeId('e1-2'), selected: false },
    ]

    const nextEdges = applyEdgeChanges(
      edgeChanges,
      edges.map((e) => ({ ...e, selected: true }))
    )

    expect({ selected: nextEdges[0]?.selected }).toStrictEqual({
      selected: false,
    })
    expect({ selected: nextEdges[1]?.selected }).toStrictEqual({
      selected: true,
    })
  })

  // examples/react/cypress/components/utils/apply-changes.cy.ts:123
  it('[UP-128-089] updates node position', () => {
    const newPosition: XYPosition = { x: 100, y: 100 }

    const nodeChanges: NodeChange[] = [
      { type: 'position', id: nodeId('1'), position: newPosition },
    ]

    const nextNodes = applyNodeChanges(nodeChanges, nodes)

    expect(nextNodes[0]?.position).toStrictEqual(newPosition)
  })

  // examples/react/cypress/components/utils/apply-changes.cy.ts:131
  it('[UP-128-090] updates node dimensions', () => {
    const newWidth = 200
    const newHeight = 200

    const nodeChanges: NodeChange[] = [
      {
        type: 'dimensions',
        id: nodeId('1'),
        dimensions: { width: newWidth, height: newHeight },
      },
    ]

    const nextNodes = applyNodeChanges(nodeChanges, nodes)

    expect(node(0).measured).toBeUndefined()
    expect(nextNodes[0]?.measured).toStrictEqual({
      width: newWidth,
      height: newHeight,
    })
    expect(
      S.decodeUnknownSync(S.Struct({ width: S.optional(S.Number) }))(
        nextNodes[0]
      ).width
    ).toBeUndefined()
    expect(
      S.decodeUnknownSync(S.Struct({ height: S.optional(S.Number) }))(
        nextNodes[0]
      ).height
    ).toBeUndefined()
  })

  // examples/react/cypress/components/utils/apply-changes.cy.ts:145
  it('[UP-128-091] updates node position and dimensions', () => {
    const newPosition: XYPosition = { x: 100, y: 100 }
    const newWidth = 200
    const newHeight = 200

    const nodeChanges: NodeChange[] = [
      { type: 'position', id: nodeId('1'), position: newPosition },
      {
        type: 'dimensions',
        id: nodeId('1'),
        dimensions: { width: newWidth, height: newHeight },
      },
    ]

    const nextNodes = applyNodeChanges(nodeChanges, nodes)

    expect(nextNodes[0]?.position).toStrictEqual(newPosition)
    expect(nextNodes[0]?.measured).toStrictEqual({
      width: newWidth,
      height: newHeight,
    })
  })

  // examples/react/cypress/components/utils/apply-changes.cy.ts:159
  it('[UP-128-092] replaces nodes/edges', () => {
    const nodesLength = nodes.length

    const nodeChanges: NodeChange[] = [
      { type: 'replace', id: node(0).id, item: node(1) },
    ]

    const nextNodes = applyNodeChanges(nodeChanges, nodes)

    expect([nodes.length, nextNodes.length]).toStrictEqual([
      nodesLength,
      nodesLength,
    ])
    expect(nextNodes[0]).toStrictEqual(node(1))

    const edgesLength = edges.length

    const edgeChange: EdgeChange[] = [
      { type: 'replace', id: edge(0).id, item: edge(1) },
    ]

    const nextEdges = applyEdgeChanges(edgeChange, edges)

    expect(edges).toHaveLength(edgesLength)
    expect(nextEdges).toHaveLength(edgesLength)
    expect(nextEdges[0]).toStrictEqual(edge(1))
  })
})
