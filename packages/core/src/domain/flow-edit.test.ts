import { Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  FlowEditDisposedSchema,
  FlowEditErrorSchema,
  FlowDeleteInvalidCandidate,
  ProtectedDeletionConflict,
} from './flow-edit-error.ts'
import {
  finalizeFlowDeleteCandidate,
  prepareFlowDeleteCandidate,
  prepareFlowEdit,
} from './flow-edit.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const document = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        { id: 'a', label: 'A', position: { x: 0, y: 0 } },
        { id: 'b', label: 'B', position: { x: 1, y: 1 }, parentId: 'a' },
        { id: 'c', label: 'C', position: { x: 2, y: 2 }, parentId: 'b' },
        { id: 'd', label: 'D', position: { x: 3, y: 3 } },
      ],
      edges: [
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'cd', source: 'c', target: 'd' },
      ],
    })
  )

describe(prepareFlowEdit, () => {
  it('applies related collection edits atomically and preserves unaffected identities', () => {
    const initial = document()

    const result = Effect.runSync(
      prepareFlowEdit(initial, {
        operations: [
          {
            kind: 'set-nodes',
            nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 0 } }],
          },
          { kind: 'set-edges', edges: [] },
          {
            kind: 'add-nodes',
            nodes: [{ id: 'x', label: 'X', position: { x: 4, y: 4 } }],
          },
          {
            kind: 'add-edges',
            edges: [{ id: 'ax', source: 'a', target: 'x' }],
          },
        ],
      })
    )

    expect(result.document.nodes.map(({ id }) => id)).toStrictEqual(['a', 'x'])
    expect(result.document.edges.map(({ id }) => id)).toStrictEqual(['ax'])
    expect(initial.nodes.map(({ id }) => id)).toStrictEqual([
      'a',
      'b',
      'c',
      'd',
    ])

    const addition = Effect.runSync(
      prepareFlowEdit(initial, {
        operations: [
          {
            kind: 'add-nodes',
            nodes: [{ id: 'x', label: 'X', position: { x: 4, y: 4 } }],
          },
        ],
      })
    )

    expect(addition.document.nodes[0]).toBe(initial.nodes[0])
  })

  it('merges and replaces data while treating missing targets as no-ops', () => {
    const initial = document()

    const result = Effect.runSync(
      prepareFlowEdit(initial, {
        operations: [
          {
            kind: 'update-node-data',
            nodeId: 'd',
            data: { first: 1, second: 2 },
          },
          { kind: 'update-node-data', nodeId: 'd', data: { first: 3 } },
          { kind: 'update-edge-data', edgeId: 'ab', data: { title: 'edge' } },
          {
            kind: 'update-edge-data',
            edgeId: 'ab',
            data: { only: true },
            replace: true,
          },
          {
            kind: 'update-node',
            nodeId: 'missing',
            patch: { label: 'ignored' },
          },
        ],
      })
    )

    expect(result.document.nodes[3]?.data).toStrictEqual({
      first: 3,
      second: 2,
    })
    expect(result.document.edges[0]?.data).toStrictEqual({ only: true })
    expect(initial.nodes[3]?.data).toBeUndefined()
  })

  it('rolls back invalid final graphs and allows incomplete intermediate collections', () => {
    const initial = document()

    const invalid = Effect.runSync(
      Effect.flip(
        prepareFlowEdit(initial, {
          operations: [
            {
              kind: 'set-nodes',
              nodes: [{ id: 'new', label: 'New', position: { x: 0, y: 0 } }],
            },
          ],
        })
      )
    )

    expect(invalid).toBeDefined()

    const valid = Effect.runSync(
      prepareFlowEdit(initial, {
        operations: [
          { kind: 'set-edges', edges: [] },
          {
            kind: 'set-nodes',
            nodes: [{ id: 'new', label: 'New', position: { x: 0, y: 0 } }],
          },
          {
            kind: 'set-edges',
            edges: [{ id: 'new-edge', source: 'new', target: 'new' }],
          },
        ],
      })
    )

    expect(valid.document.nodes.map(({ id }) => id)).toStrictEqual(['new'])
  })

  it('deletes descendants and incident edges in document order', () => {
    const result = Effect.runSync(
      prepareFlowEdit(document(), {
        operations: [
          { kind: 'delete-elements', nodeIds: ['b', 'missing', 'b'] },
        ],
      })
    )

    expect(result.deletion).toStrictEqual({
      deletedNodeIds: ['b', 'c'],
      deletedEdgeIds: ['ab', 'cd'],
    })
  })

  it('returns a typed conflict for protected descendants or edges', () => {
    const protectedDocument = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: 'parent', label: 'Parent', position: { x: 0, y: 0 } },
          {
            id: 'child',
            label: 'Child',
            position: { x: 0, y: 0 },
            parentId: 'parent',
            deletable: false,
          },
        ],
        edges: [],
      })
    )

    const failure = Effect.runSync(
      Effect.flip(
        prepareFlowEdit(protectedDocument, {
          operations: [{ kind: 'delete-elements', nodeIds: ['parent'] }],
        })
      )
    )

    if (!(failure instanceof ProtectedDeletionConflict)) {
      throw new Error('Expected a protected deletion conflict')
    }

    expect(failure.nodeIds).toStrictEqual(['child'])
  })

  it('prepares a deletable candidate and allows only an approved subset', () => {
    const initial = document()

    const { candidate } = Effect.runSync(
      prepareFlowDeleteCandidate(initial, { nodeIds: ['b'] })
    )

    expect(candidate.nodes.map(({ id }) => id)).toStrictEqual(['b', 'c'])
    expect(candidate.edges.map(({ id }) => id)).toStrictEqual(['ab', 'cd'])

    const [, selectedNode] = candidate.nodes
    const [, selectedEdge] = candidate.edges

    if (selectedNode === undefined || selectedEdge === undefined) {
      throw new Error('Expected prepared deletion candidates')
    }

    const result = Effect.runSync(
      finalizeFlowDeleteCandidate(
        initial,
        candidate,
        { nodes: [selectedNode], edges: [selectedEdge] },
        'delete-subset'
      )
    )

    expect(result.deletion).toStrictEqual({
      deletedNodeIds: ['c'],
      deletedEdgeIds: ['cd'],
    })
    expect(result.document.nodes.map(({ id }) => id)).toStrictEqual([
      'a',
      'b',
      'd',
    ])
  })

  it('turns denial into a no-op and rejects candidates that widen eligibility', () => {
    const initial = document()

    const { candidate } = Effect.runSync(
      prepareFlowDeleteCandidate(initial, { nodeIds: ['b'] })
    )

    const denied = Effect.runSync(
      finalizeFlowDeleteCandidate(initial, candidate, false, 'delete-denied')
    )

    expect(denied.document).toBe(initial)
    expect(denied.deletion).toStrictEqual({
      deletedNodeIds: [],
      deletedEdgeIds: [],
    })

    const [eligibleNode] = candidate.nodes
    const ineligibleNode = initial.nodes.find(({ id }) => id === 'd')

    if (eligibleNode === undefined || ineligibleNode === undefined) {
      throw new Error('Expected deletion candidate and ineligible node')
    }

    const failure = Effect.runSync(
      Effect.flip(
        finalizeFlowDeleteCandidate(
          initial,
          candidate,
          { nodes: [eligibleNode, ineligibleNode], edges: [] },
          'delete-widened'
        )
      )
    )

    expect(failure).toBeInstanceOf(FlowDeleteInvalidCandidate)
    expect(failure).toMatchObject({ nodeIds: ['d'] })
  })

  it('encodes edit disposal as a typed result failure', () => {
    const error = FlowEditDisposedSchema.make({})
    const encoded = Schema.encodeSync(FlowEditErrorSchema)(error)
    expect(encoded._tag).toBe(error._tag)
  })
})
