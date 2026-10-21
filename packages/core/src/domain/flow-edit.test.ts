import { Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  FlowEditDisposedSchema,
  FlowEditErrorSchema,
  FlowDeleteInvalidCandidate,
  ProtectedDeletionConflict,
} from './flow-edit-error.ts'
import { FlowEditResultSchema } from './flow-edit.schema.ts'
import {
  finalizeFlowDeleteCandidate,
  prepareFlowDeleteCandidate,
  prepareFlowEdit,
} from './flow-edit.ts'
import { decodeFlowDocument, MissingEdgeEndpoint } from './flow.schema.ts'

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
      throw new TypeError('Expected a protected deletion conflict')
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

const originDocument = (nodeOrigin: readonly number[] = [-0.5, 1.5]) =>
  Effect.runSync(decodeFlowDocument({ ...document(), nodeOrigin }))

describe('document origin regression boundaries', () => {
  it('retains origin during ordinary label and position edits', () => {
    const initial = originDocument()

    const result = Effect.runSync(
      prepareFlowEdit(initial, {
        operations: [
          {
            kind: 'update-node',
            nodeId: 'd',
            patch: { label: 'Edited', position: { x: 50, y: -20 } },
          },
        ],
      })
    )

    expect(result.document).toMatchObject({ nodeOrigin: [-0.5, 1.5] })
    expect(result.document.nodes[3]).toMatchObject({
      label: 'Edited',
      position: { x: 50, y: -20 },
    })
  })

  it('retains origin through prepared and approved deletion', () => {
    const initial = originDocument()

    const { candidate, result: prepared } = Effect.runSync(
      prepareFlowDeleteCandidate(initial, { nodeIds: ['b'] })
    )

    const result = Effect.runSync(
      finalizeFlowDeleteCandidate(initial, candidate, true, 'origin-delete')
    )

    expect({
      prepared: prepared.document,
      approved: result.document,
    }).toMatchObject({
      prepared: { nodeOrigin: [-0.5, 1.5] },
      approved: { nodeOrigin: [-0.5, 1.5] },
    })
    expect(result.deletion).toStrictEqual({
      deletedNodeIds: ['b', 'c'],
      deletedEdgeIds: ['ab', 'cd'],
    })
  })

  it('retains origin when decoding the result document contract', () => {
    const packet = {
      document: originDocument(),
      deletion: { deletedNodeIds: [], deletedEdgeIds: [] },
    }

    expect(
      Schema.decodeUnknownSync(FlowEditResultSchema)(packet)
    ).toStrictEqual(packet)
  })

  it('retains origin when encoding the result document contract', () => {
    const packet = {
      document: originDocument(),
      deletion: { deletedNodeIds: [], deletedEdgeIds: [] },
    }

    expect(Schema.encodeSync(FlowEditResultSchema)(packet)).toStrictEqual(
      packet
    )
  })
})

describe('origin preservation across transaction and deletion semantics', () => {
  describe.each([
    [0.5, 0.5],
    [-0.5, 1.5],
    [0, 0],
  ])('explicit origin [%s, %s]', (x, y) => {
    it('retains origin during label, position and data merges', () => {
      const initial = originDocument([x, y])

      const before = structuredClone(initial)

      const edited = Effect.runSync(
        prepareFlowEdit(initial, {
          operations: [
            {
              kind: 'update-node',
              nodeId: 'd',
              patch: { label: 'Edited', position: { x: 50, y: -20 } },
            },
            {
              kind: 'update-edge',
              edgeId: 'cd',
              patch: { label: 'Edited edge' },
            },
            {
              kind: 'update-node-data',
              nodeId: 'd',
              data: { first: 1, second: 2 },
            },
            { kind: 'update-node-data', nodeId: 'd', data: { first: 3 } },
            {
              kind: 'update-edge-data',
              edgeId: 'cd',
              data: { first: 1, second: 2 },
            },
            { kind: 'update-edge-data', edgeId: 'cd', data: { first: 3 } },
          ],
        })
      )

      expect(edited.document).toMatchObject({ nodeOrigin: [x, y] })
      expect(edited.document.nodes[3]).toMatchObject({
        label: 'Edited',
        position: { x: 50, y: -20 },
        data: { first: 3, second: 2 },
      })
      expect(edited.document.edges[1]).toMatchObject({
        label: 'Edited edge',
        data: { first: 3, second: 2 },
      })

      expect(initial).toStrictEqual(before)
    })

    it('preserves untouched node and edge references', () => {
      const initial = originDocument([x, y])

      const before = structuredClone(initial)

      const edited = Effect.runSync(
        prepareFlowEdit(initial, {
          operations: [
            { kind: 'update-node', nodeId: 'd', patch: { label: 'Edited' } },
            {
              kind: 'update-edge',
              edgeId: 'cd',
              patch: { label: 'Edited edge' },
            },
          ],
        })
      )

      expect(edited.document.nodes[0]).toBe(initial.nodes[0])
      expect(edited.document.edges[0]).toBe(initial.edges[0])

      expect(initial).toStrictEqual(before)
    })

    it('retains origin while replacing node and edge data', () => {
      const initial = originDocument([x, y])

      const before = structuredClone(initial)

      const replaced = Effect.runSync(
        prepareFlowEdit(initial, {
          operations: [
            { kind: 'update-node-data', nodeId: 'd', data: { first: 1 } },
            { kind: 'update-edge-data', edgeId: 'cd', data: { first: 1 } },
            {
              kind: 'update-node-data',
              nodeId: 'd',
              data: { only: true },
              replace: true,
            },
            {
              kind: 'update-edge-data',
              edgeId: 'cd',
              data: { only: true },
              replace: true,
            },
          ],
        })
      )

      expect(replaced.document).toMatchObject({ nodeOrigin: [x, y] })
      expect(replaced.document.nodes[3]?.data).toStrictEqual({ only: true })
      expect(replaced.document.edges[1]?.data).toStrictEqual({ only: true })

      expect(initial).toStrictEqual(before)
    })

    it('retains origin during collection replacement and addition', () => {
      const initial = originDocument([x, y])

      const before = structuredClone(initial)

      const collection = Effect.runSync(
        prepareFlowEdit(initial, {
          operations: [
            { kind: 'set-edges', edges: [] },
            {
              kind: 'set-nodes',
              nodes: [
                { id: 'a', label: 'Replacement', position: { x: 0, y: 0 } },
              ],
            },
            {
              kind: 'add-nodes',
              nodes: [{ id: 'x', label: 'Added', position: { x: 4, y: 4 } }],
            },
            {
              kind: 'add-edges',
              edges: [{ id: 'ax', source: 'a', target: 'x' }],
            },
          ],
        })
      )

      expect(collection.document).toMatchObject({ nodeOrigin: [x, y] })
      expect(
        collection.document.nodes.map(({ id, label }) => ({ id, label }))
      ).toStrictEqual([
        { id: 'a', label: 'Replacement' },
        { id: 'x', label: 'Added' },
      ])
      expect(collection.document.edges.map(({ id }) => id)).toStrictEqual([
        'ax',
      ])

      expect(initial).toStrictEqual(before)
    })

    it('retains origin and unaffected identities during empty and missing-target edits', () => {
      const initial = originDocument([x, y])

      const before = structuredClone(initial)

      const noOp = Effect.runSync(prepareFlowEdit(initial, { operations: [] }))

      const missing = Effect.runSync(
        prepareFlowEdit(initial, {
          operations: [
            {
              kind: 'update-node',
              nodeId: 'missing',
              patch: { label: 'Ignored' },
            },
            {
              kind: 'update-edge',
              edgeId: 'missing',
              patch: { label: 'Ignored' },
            },
            {
              kind: 'update-node-data',
              nodeId: 'missing',
              data: { ignored: true },
            },
            {
              kind: 'update-edge-data',
              edgeId: 'missing',
              data: { ignored: true },
            },
          ],
        })
      )

      for (const result of [noOp, missing]) {
        expect(result.document).toStrictEqual(initial)

        for (const [index, node] of initial.nodes.entries()) {
          expect(result.document.nodes[index]).toBe(node)
        }

        for (const [index, edge] of initial.edges.entries()) {
          expect(result.document.edges[index]).toBe(edge)
        }
      }

      expect(initial).toStrictEqual(before)
    })

    it('retains origin through delete then edit transactions', () => {
      const initial = originDocument([x, y])

      const before = structuredClone(initial)

      const compound = Effect.runSync(
        prepareFlowEdit(initial, {
          operations: [
            { kind: 'delete-elements', nodeIds: ['b', 'missing', 'b'] },
            {
              kind: 'update-node',
              nodeId: 'd',
              patch: { label: 'After delete' },
            },
          ],
        })
      )

      expect(compound.document).toMatchObject({ nodeOrigin: [x, y] })
      expect(
        compound.document.nodes.map(({ id, label }) => ({ id, label }))
      ).toStrictEqual([
        { id: 'a', label: 'A' },
        { id: 'd', label: 'After delete' },
      ])
      expect(compound.deletion).toStrictEqual({
        deletedNodeIds: ['b', 'c'],
        deletedEdgeIds: ['ab', 'cd'],
      })

      expect(initial).toStrictEqual(before)
    })

    it('retains origin and document order through prepared and approved deletion', () => {
      const initial = originDocument([x, y])

      const before = structuredClone(initial)

      const { candidate, result: prepared } = Effect.runSync(
        prepareFlowDeleteCandidate(initial, { nodeIds: ['b'] })
      )

      const approved = Effect.runSync(
        finalizeFlowDeleteCandidate(initial, candidate, true, 'origin-approved')
      )

      for (const result of [prepared, approved]) {
        expect(result.document).toMatchObject({ nodeOrigin: [x, y] })
        expect(result.document.nodes[0]).toBe(initial.nodes[0])
        expect(result.document.nodes[1]).toBe(initial.nodes[3])
        expect(result.deletion).toStrictEqual({
          deletedNodeIds: ['b', 'c'],
          deletedEdgeIds: ['ab', 'cd'],
        })
        expect(
          Schema.decodeUnknownSync(FlowEditResultSchema)(
            Schema.encodeSync(FlowEditResultSchema)(result)
          )
        ).toStrictEqual(result)
      }

      expect(initial).toStrictEqual(before)
    })

    it('returns the original origin document when deletion is denied', () => {
      const initial = originDocument([x, y])

      const before = structuredClone(initial)

      const { candidate } = Effect.runSync(
        prepareFlowDeleteCandidate(initial, { nodeIds: ['b'] })
      )

      const denied = Effect.runSync(
        finalizeFlowDeleteCandidate(initial, candidate, false, 'origin-denied')
      )

      expect(denied.document).toBe(initial)
      expect(denied.deletion).toStrictEqual({
        deletedNodeIds: [],
        deletedEdgeIds: [],
      })

      expect(initial).toStrictEqual(before)
    })

    it('leaves the original origin document intact on graph rollback', () => {
      const initial = originDocument([x, y])

      const before = structuredClone(initial)

      const failure = Effect.runSync(
        Effect.flip(
          prepareFlowEdit(initial, {
            operations: [{ kind: 'set-nodes', nodes: [] }],
          })
        )
      )

      expect(failure).toBeInstanceOf(MissingEdgeEndpoint)

      expect(initial).toStrictEqual(before)
    })

    it('leaves protected origin documents intact on deletion failure', () => {
      const initial = originDocument([x, y])

      const before = structuredClone(initial)

      const protectedDocument = Effect.runSync(
        decodeFlowDocument({
          ...initial,
          nodes: initial.nodes.map((node) =>
            node.id === 'c' ? { ...node, deletable: false } : node
          ),
        })
      )

      const protectedBefore = structuredClone(protectedDocument)

      const protectedFailure = Effect.runSync(
        Effect.flip(
          prepareFlowEdit(protectedDocument, {
            operations: [{ kind: 'delete-elements', nodeIds: ['b'] }],
          })
        )
      )

      expect(protectedFailure).toBeInstanceOf(ProtectedDeletionConflict)
      expect(protectedFailure).toMatchObject({ nodeIds: ['c'] })
      expect(protectedDocument).toStrictEqual(protectedBefore)

      expect(initial).toStrictEqual(before)
    })
  })

  it.each(['absent', 'own-undefined'])(
    'preserves %s origin key semantics through edits and result transport',
    (presence) => {
      const initial =
        presence === 'absent'
          ? document()
          : Effect.runSync(
              decodeFlowDocument({ ...document(), nodeOrigin: undefined })
            )

      expect(Object.hasOwn(initial, 'nodeOrigin')).toBe(
        presence === 'own-undefined'
      )
      expect(initial.nodeOrigin).toBeUndefined()

      const { candidate } = Effect.runSync(
        prepareFlowDeleteCandidate(initial, { nodeIds: ['b'] })
      )

      const results = [
        Effect.runSync(prepareFlowEdit(initial, { operations: [] })),
        Effect.runSync(
          prepareFlowEdit(initial, {
            operations: [
              { kind: 'update-node', nodeId: 'd', patch: { label: 'Edited' } },
            ],
          })
        ),
        Effect.runSync(
          finalizeFlowDeleteCandidate(
            initial,
            candidate,
            true,
            'optional-origin'
          )
        ),
      ]

      for (const result of results) {
        const encoded = Schema.encodeSync(FlowEditResultSchema)(result)
        const decoded = Schema.decodeUnknownSync(FlowEditResultSchema)(encoded)

        for (const value of [
          result.document,
          encoded.document,
          decoded.document,
        ]) {
          expect(Object.hasOwn(value, 'nodeOrigin')).toBe(
            presence === 'own-undefined'
          )
          expect(value.nodeOrigin).toBeUndefined()
        }
      }
    }
  )

  it.each([
    null,
    [0],
    [0, 1, 2],
    ['0', 1],
    [Number.NaN, 0],
    [0, Number.POSITIVE_INFINITY],
    [Number.NEGATIVE_INFINITY, 0],
  ])('rejects invalid origin metadata at result decoding: %j', (nodeOrigin) => {
    expect(() =>
      Schema.decodeUnknownSync(FlowEditResultSchema)({
        document: { ...document(), nodeOrigin },
        deletion: { deletedNodeIds: [], deletedEdgeIds: [] },
      })
    ).toThrow(expect.objectContaining({ name: 'SchemaError' }))
  })
})
