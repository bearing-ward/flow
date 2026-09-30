import { Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  diffNodeConnections,
  FlowHandleConnectionsQuerySchema,
  flowSelectionEqual,
  selectFlowSelection,
  selectHandleConnections,
  selectNodeConnections,
  selectNodesData,
} from './flow-selectors.ts'
import { EdgeIdSchema, HandleIdSchema, NodeIdSchema } from './flow-values.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'a',
        label: 'A',
        type: 'alpha',
        position: { x: 0, y: 0 },
        data: { v: 1 },
        handles: [
          { id: 'out', kind: 'source', side: 'right' },
          { id: 'in', kind: 'target', side: 'left' },
        ],
      },
      { id: 'b', label: 'B', position: { x: 1, y: 1 } },
      {
        id: 'c',
        label: 'C',
        position: { x: 2, y: 2 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      { id: 'ab', source: 'a', target: 'b', sourceHandle: 'out' },
      { id: 'ca', source: 'c', target: 'a', targetHandle: 'in' },
      { id: 'bc', source: 'b', target: 'c' },
    ],
  })
)

const selectHandleConnectionsFromQuery = (
  input: typeof FlowHandleConnectionsQuerySchema.Encoded
) =>
  selectHandleConnections(
    document,
    Schema.decodeUnknownSync(FlowHandleConnectionsQuerySchema)(input)
  )

describe('Flow selectors', () => {
  it('orders disconnected and connected projections for removed, added, and reconnected edges', () => {
    const previous = selectNodeConnections(document, {
      nodeId: NodeIdSchema.make('a'),
    })

    const unchanged = previous.filter(({ edgeId }) => edgeId !== 'ab')

    const reconnected = unchanged.map((connection) =>
      connection.edgeId === 'ca'
        ? { ...connection, target: NodeIdSchema.make('c') }
        : connection
    )

    const [template] = previous

    if (template === undefined) {
      throw new Error('Expected at least one node connection in fixture')
    }

    const current = [
      ...reconnected,
      {
        ...template,
        edgeId: EdgeIdSchema.make('edge-new'),
      },
    ]

    const delta = diffNodeConnections(previous, current)

    expect(delta.disconnected.map(({ edgeId }) => edgeId)).toStrictEqual([
      'ab',
      'ca',
    ])
    expect(delta.connected.map(({ edgeId }) => edgeId)).toStrictEqual([
      'ca',
      'edge-new',
    ])
  })

  it('selects accepted selected members and compares selection identity by ordered IDs', () => {
    const selectedDocument = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { ...document.nodes[0], selected: true },
          { ...document.nodes[1] },
          { ...document.nodes[2], selected: true },
        ],
        edges: [
          { ...document.edges[0], selected: true },
          { ...document.edges[1] },
          { ...document.edges[2] },
        ],
      })
    )

    const selection = selectFlowSelection(selectedDocument)

    expect(selection.nodes.map(({ id }) => id)).toStrictEqual(['a', 'c'])
    expect(selection.edges.map(({ id }) => id)).toStrictEqual(['ab'])
    expect(
      flowSelectionEqual(selection, selectFlowSelection(selectedDocument))
    ).toBeTruthy()
    expect(
      flowSelectionEqual(selection, {
        nodes: [...selection.nodes].toReversed(),
        edges: selection.edges,
      })
    ).toBeFalsy()
  })

  it('selects requested node data in ID order and omits missing IDs', () => {
    expect(
      selectNodesData(
        document,
        ['b', 'missing', 'a'].map((id) => NodeIdSchema.make(id))
      )
    ).toStrictEqual([
      { id: 'b', type: undefined, data: undefined },
      { id: 'a', type: 'alpha', data: { v: 1 } },
    ])
  })

  it('filters incident connections by direction and optional handle', () => {
    const nodeId = NodeIdSchema.make('a')
    expect(selectNodeConnections(document, { nodeId })).toHaveLength(2)
    expect(
      selectNodeConnections(document, {
        nodeId,
        type: 'source',
        handleId: HandleIdSchema.make('out'),
      })
    ).toStrictEqual([
      {
        edgeId: 'ab',
        source: 'a',
        target: 'b',
        sourceHandle: 'out',
        targetHandle: undefined,
      },
    ])
    expect(
      selectNodeConnections(document, {
        nodeId,
        type: 'target',
        handleId: HandleIdSchema.make('out'),
      })
    ).toStrictEqual([])
    expect(
      selectNodeConnections(document, {
        nodeId: NodeIdSchema.make('b'),
        type: 'target',
        handleId: null,
      }).map(({ edgeId }) => edgeId)
    ).toStrictEqual(['ab'])
    expect(
      selectNodeConnections(document, {
        nodeId: NodeIdSchema.make('b'),
        type: 'source',
        handleId: null,
      }).map(({ edgeId }) => edgeId)
    ).toStrictEqual(['bc'])
  })

  it('selects directional handle edges with explicit or aggregate IDs', () => {
    expect(
      selectHandleConnectionsFromQuery({
        nodeId: 'a',
        type: 'source',
        id: 'out',
      }).map(({ id }) => id)
    ).toStrictEqual(['ab'])
    expect(
      selectHandleConnectionsFromQuery({
        nodeId: 'a',
        type: 'target',
        id: 'in',
      }).map(({ id }) => id)
    ).toStrictEqual(['ca'])
    expect(
      selectHandleConnectionsFromQuery({
        nodeId: 'a',
        type: 'source',
        id: null,
      }).map(({ id }) => id)
    ).toStrictEqual(['ab'])
    expect(
      selectHandleConnectionsFromQuery({ nodeId: 'a', type: 'target' }).map(
        ({ id }) => id
      )
    ).toStrictEqual(['ca'])
    expect(
      selectHandleConnectionsFromQuery({
        nodeId: 'a',
        type: 'source',
        id: 'missing',
      })
    ).toStrictEqual([])
  })

  it('returns no handle connections for an unknown node', () => {
    expect(
      selectHandleConnectionsFromQuery({
        nodeId: 'missing',
        type: 'source',
        id: null,
      })
    ).toStrictEqual([])
  })
})
