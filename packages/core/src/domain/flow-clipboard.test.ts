import { Effect, Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  copyFlowSelection,
  createFlowClipboard,
  decodeFlowGraphFragment,
  pasteFlowGraphFragment,
} from './flow-clipboard.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import { createFlowGraph } from './flow-graph.ts'
import {
  decodeFlowDocument,
  NodeIdSchema,
  EdgeIdSchema,
} from './flow.schema.ts'

const fixture = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'parent',
          label: 'Group',
          position: { x: 100, y: 100 },
          size: { width: 400, height: 200 },
          selected: true,
        },
        {
          id: 'child',
          label: 'Child',
          position: { x: 20, y: 30 },
          parentId: 'parent',
          extent: 'parent',
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
          data: { arbitrary: { id: 'child', value: [1, null, true] } },
        },
        {
          id: 'nested',
          label: 'Nested',
          position: { x: 200, y: 30 },
          parentId: 'parent',
        },
        {
          id: 'leaf',
          label: 'Leaf',
          position: { x: 10, y: 10 },
          parentId: 'nested',
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        { id: 'outside', label: 'Outside', position: { x: 600, y: 100 } },
      ],
      edges: [
        {
          id: 'internal',
          source: 'child',
          sourceHandle: 'out',
          target: 'leaf',
          targetHandle: 'in',
          data: { id: 'child' },
        },
        {
          id: 'external',
          source: 'child',
          sourceHandle: 'out',
          target: 'outside',
          selected: true,
        },
      ],
    })
  )

describe('session graph clipboard', () => {
  it('copies descendants and induced edges, remaps parents/endpoints/handles, preserves opaque JSON and offsets repeated paste', () => {
    const document = fixture()
    const state = Effect.runSync(copyFlowSelection(document))
    expect(state.fragment?.document.nodes.map(({ id }) => id)).toStrictEqual([
      'parent',
      'child',
      'nested',
      'leaf',
    ])
    expect(state.fragment?.document.edges.map(({ id }) => id)).toStrictEqual([
      'internal',
    ])
    const first = pasteFlowGraphFragment(state, document)

    const result = Effect.runSync(
      prepareFlowEdit(document, first.transaction)
    ).document

    expect(
      result.nodes
        .slice(5)
        .map(({ id, parentId, position }) => ({ id, parentId, position }))
    ).toStrictEqual([
      {
        id: 'parent-copy-1',
        parentId: undefined,
        position: { x: 120, y: 120 },
      },
      {
        id: 'child-copy-1',
        parentId: 'parent-copy-1',
        position: { x: 20, y: 30 },
      },
      {
        id: 'nested-copy-1',
        parentId: 'parent-copy-1',
        position: { x: 200, y: 30 },
      },
      {
        id: 'leaf-copy-1',
        parentId: 'nested-copy-1',
        position: { x: 10, y: 10 },
      },
    ])
    expect(result.edges.at(-1)).toMatchObject({
      id: 'internal-copy-1',
      source: 'child-copy-1',
      target: 'leaf-copy-1',
      sourceHandle: 'child-copy-1-out',
      targetHandle: 'leaf-copy-1-in',
      data: { id: 'child' },
    })
    expect(result.nodes[6]?.data).toStrictEqual({
      arbitrary: { id: 'child', value: [1, null, true] },
    })
  })

  it('offsets repeated paste and keeps every ID distinct', () => {
    const document = fixture()
    const state = Effect.runSync(copyFlowSelection(document))
    const first = pasteFlowGraphFragment(state, document)

    const result = Effect.runSync(
      prepareFlowEdit(document, first.transaction)
    ).document

    const second = Effect.runSync(
      prepareFlowEdit(
        result,
        pasteFlowGraphFragment(first.state, result).transaction
      )
    ).document

    expect(second.nodes.at(-4)).toMatchObject({
      id: 'parent-copy-2',
      position: { x: 140, y: 140 },
    })
    expect(new Set(second.nodes.map(({ id }) => id)).size).toBe(13)
  })

  it('detaches copied roots from absent parents without moving their absolute anchors', () => {
    const initial = fixture()

    const document = {
      ...initial,
      nodes: initial.nodes.map((node) => ({
        ...node,
        selected: node.id === 'child',
      })),
    }

    const state = Effect.runSync(copyFlowSelection(document))
    expect(state.fragment?.document.nodes[0]).toMatchObject({
      id: 'child',
      position: { x: 120, y: 130 },
    })
    expect(state.fragment?.document.nodes[0]?.parentId).toBeUndefined()
    expect(state.fragment?.document.nodes[0]?.extent).toBeUndefined()
    expect(state.fragment?.document.edges).toStrictEqual([])
  })

  it('places roots in graph space and remaps only explicitly owned extension references', () => {
    const initial = fixture()

    const document = {
      ...initial,
      nodes: initial.nodes.map((node) =>
        node.id === 'child'
          ? {
              ...node,
              data: {
                ...node.data,
                owned: { parentId: 'parent', edgeId: 'internal' },
              },
            }
          : node
      ),
    }

    const ownedSchema = S.Struct({
      parentId: NodeIdSchema,
      edgeId: EdgeIdSchema,
    })

    const state = Effect.runSync(copyFlowSelection(document))

    const result = pasteFlowGraphFragment(
      state,
      document,
      { position: { x: -50, y: 300 } },
      [
        {
          remapNode: (node, refs) => {
            if (node.data?.owned === undefined) {
              return node
            }

            const owned = S.decodeUnknownSync(ownedSchema)(node.data.owned)

            return {
              ...node,
              data: {
                ...node.data,
                owned: {
                  parentId: refs.nodeIds.get(owned.parentId) ?? null,
                  edgeId: refs.edgeIds.get(owned.edgeId) ?? null,
                },
              },
            }
          },
        },
      ]
    )

    const pasted = Effect.runSync(
      prepareFlowEdit(document, result.transaction)
    ).document

    expect(pasted.nodes[5]?.position).toStrictEqual({ x: -50, y: 300 })
    expect(pasted.nodes[6]?.data).toStrictEqual({
      arbitrary: { id: 'child', value: [1, null, true] },
      owned: { parentId: 'parent-copy-1', edgeId: 'internal-copy-1' },
    })
  })

  it('retains physical placement and inherited origins when a copied child enters a different document', () => {
    const source = Effect.runSync(
      decodeFlowDocument({
        nodeOrigin: [0.5, 0.5],
        nodes: [
          {
            id: 'parent',
            label: 'Parent',
            position: { x: 100, y: 100 },
            size: { width: 400, height: 200 },
          },
          {
            id: 'child',
            label: 'Child',
            parentId: 'parent',
            position: { x: 20, y: 30 },
            size: { width: 100, height: 40 },
            selected: true,
          },
        ],
        edges: [],
      })
    )

    const destination = Effect.runSync(
      decodeFlowDocument({ nodeOrigin: [0, 0], nodes: [], edges: [] })
    )

    const state = Effect.runSync(copyFlowSelection(source))

    const pasted = Effect.runSync(
      prepareFlowEdit(
        destination,
        pasteFlowGraphFragment(state, destination).transaction
      )
    ).document

    expect(pasted.nodes[0]).toMatchObject({
      origin: [0.5, 0.5],
      position: { x: -60, y: 50 },
    })
    expect(
      createFlowGraph(pasted).orderedNodes[0]?.absolutePosition
    ).toStrictEqual({ x: -110, y: 30 })
    expect(
      createFlowGraph(source).nodes.get(NodeIdSchema.make('child'))
        ?.absolutePosition
    ).toStrictEqual({ x: -130, y: 10 })
  })

  it('preserves implicit default handle names while remapping their node endpoints', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 0, y: 0 },
            sourcePosition: 'right',
            selected: true,
          },
          {
            id: 'b',
            label: 'B',
            position: { x: 200, y: 0 },
            targetPosition: 'left',
            selected: true,
          },
        ],
        edges: [
          {
            id: 'ab',
            source: 'a',
            target: 'b',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
        ],
      })
    )

    const state = Effect.runSync(copyFlowSelection(document))

    const pasted = Effect.runSync(
      prepareFlowEdit(
        document,
        pasteFlowGraphFragment(state, document).transaction
      )
    ).document

    expect(pasted.edges.at(-1)).toMatchObject({
      source: 'a-copy-1',
      target: 'b-copy-1',
      sourceHandle: 'source',
      targetHandle: 'target',
    })
    expect(pasted.nodes.at(-1)?.handles).toBeUndefined()
  })

  it('rejects malformed/versioned, missing-parent, dangling-edge, duplicate-id, cycle and invalid-handle fragments', () => {
    const doc = fixture()

    for (const input of [
      null,
      {},
      { version: 2, document: doc },
      { version: 1, document: { nodes: [doc.nodes[1]], edges: [] } },
      { version: 1, document: { nodes: [], edges: [doc.edges[0]] } },
      {
        version: 1,
        document: { nodes: [doc.nodes[0], doc.nodes[0]], edges: [] },
      },
      {
        version: 1,
        document: {
          nodes: doc.nodes.map((node) =>
            node.id === 'parent' ? { ...node, parentId: 'leaf' } : node
          ),
          edges: doc.edges,
        },
      },
      {
        version: 1,
        document: { ...doc, edges: [{ ...doc.edges[0], sourceHandle: 'bad' }] },
      },
    ]) {
      expect(
        Exit.isFailure(Effect.runSyncExit(decodeFlowGraphFragment(input)))
      ).toBeTruthy()
    }
  })

  it('keeps an empty session harmless and allocates against preexisting copy IDs', () => {
    const doc = fixture()

    const empty = Effect.runSync(
      prepareFlowEdit(
        doc,
        pasteFlowGraphFragment(createFlowClipboard(), doc).transaction
      )
    ).document

    expect(empty.nodes.map(({ id }) => id)).toStrictEqual(
      doc.nodes.map(({ id }) => id)
    )
    const state = Effect.runSync(copyFlowSelection(doc))

    const first = Effect.runSync(
      prepareFlowEdit(doc, pasteFlowGraphFragment(state, doc).transaction)
    ).document

    const second = Effect.runSync(
      prepareFlowEdit(first, pasteFlowGraphFragment(state, first).transaction)
    ).document

    expect(second.nodes.at(-4)?.id).toBe('parent-copy-2')
  })
})
