import { Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  projectFlowRoomDocument,
  projectFlowRoomPresence,
  FlowRoomPresenceSchema,
} from './flow-room.ts'
import { decodeFlowDocument, FlowDocumentSchema } from './flow.schema.ts'

const decode = (input: Parameters<typeof decodeFlowDocument>[0]) =>
  Effect.runSync(decodeFlowDocument(input))

describe('room integrity projection', () => {
  it('detaches an orphan at its absolute position and prunes dangling edges and bundles', () => {
    const input = Schema.decodeUnknownSync(FlowDocumentSchema)({
      nodes: [
        {
          id: 'child',
          label: 'Child',
          position: { x: 5, y: 10 },
          parentId: 'parent',
          extent: 'parent',
        },
        { id: 'b', label: 'B', position: { x: 300, y: 20 } },
      ],
      edges: [
        { id: 'a', source: 'parent', target: 'child' },
        { id: 'b', source: 'child', target: 'b' },
      ],
      bundles: [
        { id: 'bundle', edgeIds: ['a', 'b'], ties: [{ x: 100, y: 100 }] },
      ],
    })

    const parent = decode({
      nodes: [{ id: 'parent', label: 'Parent', position: { x: 80, y: 60 } }],
      edges: [],
    }).nodes

    const result = projectFlowRoomDocument(input, parent)
    expect(result.nodes.find(({ id }) => id === 'child')).toStrictEqual({
      id: 'child',
      label: 'Child',
      position: { x: 85, y: 70 },
    })
    expect(result.edges.map(({ id }) => id)).toStrictEqual(['b'])
    expect(result.bundles).toStrictEqual([])
  })

  it('breaks concurrent parent cycles deterministically regardless of input order', () => {
    const input = Schema.decodeUnknownSync(FlowDocumentSchema)({
      nodes: [
        { id: 'b', label: 'B', position: { x: 30, y: 40 }, parentId: 'a' },
        { id: 'a', label: 'A', position: { x: 10, y: 20 }, parentId: 'b' },
      ],
      edges: [],
    })

    const projected = projectFlowRoomDocument(input)
    expect(projected).toStrictEqual(
      projectFlowRoomDocument({ ...input, nodes: input.nodes.toReversed() })
    )
    expect(
      projected.nodes.find(({ id }) => id === 'a')?.parentId
    ).toBeUndefined()
    expect(projected.nodes.find(({ id }) => id === 'b')?.parentId).toBe('a')
  })

  it('excludes selection and measurement and preserves opaque extension fields', () => {
    const document = decode({
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 0, y: 0 },
          selected: true,
          measured: { width: 44 },
          data: {
            tree: { version: 1, kind: 'node', expanded: false },
            opaque: ['preserve', 164],
          },
        },
      ],
      edges: [],
    })

    const result = projectFlowRoomDocument(document)
    expect(result.nodes[0]?.selected).toBeUndefined()
    expect(result.nodes[0]?.measured).toBeUndefined()
    expect(result.nodes[0]?.data).toStrictEqual({
      tree: { version: 1, kind: 'node', expanded: false },
      opaque: ['preserve', 164],
    })
  })

  it('uses authored parent origins for orphan coordinates and clears an orphaned extent', () => {
    const input = Schema.decodeUnknownSync(FlowDocumentSchema)({
      nodeOrigin: [0.5, 0.5],
      nodes: [
        {
          id: 'child',
          label: 'Child',
          position: { x: 5, y: 10 },
          parentId: 'parent',
          extent: 'parent',
        },
        {
          id: 'orphan',
          label: 'Orphan',
          position: { x: 0, y: 0 },
          extent: 'parent',
        },
      ],
      edges: [],
    })

    const retired = decode({
      nodes: [
        {
          id: 'parent',
          label: 'Parent',
          position: { x: 80, y: 60 },
          size: { width: 100, height: 80 },
        },
      ],
      edges: [],
    }).nodes

    const projected = projectFlowRoomDocument(input, retired)
    expect(projected.nodes[0]?.position).toStrictEqual({ x: 35, y: 30 })
    expect(projected.nodes[1]?.extent).toBeUndefined()
  })

  it('keeps live descendant membership when only its ancestor was deleted', () => {
    const input = Schema.decodeUnknownSync(FlowDocumentSchema)({
      nodes: [
        {
          id: 'a',
          label: 'Grandchild',
          position: { x: 5, y: 10 },
          parentId: 'b',
        },
        {
          id: 'b',
          label: 'Child',
          position: { x: 20, y: 30 },
          parentId: 'retired',
        },
      ],
      edges: [],
    })

    const retired = decode({
      nodes: [
        { id: 'retired', label: 'Retired', position: { x: 100, y: 200 } },
      ],
      edges: [],
    }).nodes

    const projected = projectFlowRoomDocument(input, retired)
    expect(projected.nodes[0]).toMatchObject({
      parentId: 'b',
      position: { x: 5, y: 10 },
    })
    expect(projected.nodes[1]?.position).toStrictEqual({ x: 120, y: 230 })
    expect(projected.nodes[1]?.parentId).toBeUndefined()
  })

  it('retains default physical handles and drops only missing handle references', () => {
    const input = Schema.decodeUnknownSync(FlowDocumentSchema)({
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 0, y: 0 },
          sourcePosition: 'right',
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 200, y: 0 },
          targetPosition: 'left',
        },
      ],
      edges: [
        {
          id: 'valid',
          source: 'a',
          target: 'b',
          sourceHandle: 'source',
          targetHandle: 'target',
        },
        { id: 'invalid', source: 'a', target: 'b', sourceHandle: 'missing' },
      ],
    })

    expect(
      projectFlowRoomDocument(input).edges.map(({ id }) => id)
    ).toStrictEqual(['valid'])
  })

  it('projects decoded live drag presence without changing durable positions and orders simultaneous previews', () => {
    const document = decode({
      nodes: [{ id: 'a', label: 'A', position: { x: 10, y: 20 } }],
      edges: [],
    })

    const presence = Schema.decodeUnknownSync(
      Schema.Array(FlowRoomPresenceSchema)
    )([
      {
        actorId: 'z',
        name: 'Z',
        cursor: null,
        drag: [{ nodeId: 'a', position: { x: 200, y: 300 } }],
      },
      {
        actorId: 'a',
        name: 'A',
        cursor: null,
        drag: [
          { nodeId: 'a', position: { x: 90, y: 80 } },
          { nodeId: 'deleted', position: { x: 400, y: 400 } },
        ],
      },
    ])

    const projected = projectFlowRoomPresence(document, presence)
    expect(projected.nodes[0]?.position).toStrictEqual({ x: 200, y: 300 })
    expect(projected.nodes).toHaveLength(1)
    expect(document.nodes[0]?.position).toStrictEqual({ x: 10, y: 20 })
    expect(
      projectFlowRoomPresence(document, presence.toReversed())
    ).toStrictEqual(projected)
  })
})
