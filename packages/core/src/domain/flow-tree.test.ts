import { Effect, Result } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  createFlowTreeEditor,
  getFlowTreeLayoutInput,
} from '../use-cases/tree-editor.ts'
import { copyFlowSelection, pasteFlowGraphFragment } from './flow-clipboard.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import { createFlowGraph } from './flow-graph.ts'
import {
  encodeVersionedFlowDocument,
  decodeVersionedFlowDocument,
} from './flow-persistence.ts'
import { flowTreeData, projectFlowTree } from './flow-tree.schema.ts'
import {
  InvalidFlowTree,
  createFlowTreeNode,
  decodeFlowTree,
  prepareFlowTreeEdit,
} from './flow-tree.ts'
import type { FlowTreeEditSchema } from './flow-tree.ts'
import type { FlowDocument } from './flow.schema.ts'

const tree = () =>
  Effect.runSync(
    decodeFlowTree({
      nodes: ['a', 'b', 'c', 'p'].map((id) => ({
        ...createFlowTreeNode({ id, label: id, placeholder: id === 'p' }),
        data: {
          tree: {
            version: 1,
            kind: id === 'p' ? 'placeholder' : 'node',
            expanded: true,
          },
          opaque: { keep: [160] },
        },
      })),
      edges: [
        {
          id: 'ab',
          source: 'a',
          target: 'b',
          label: 'keep',
          data: { keep: [1, 'edge'] },
          stroke: '#123456',
        },
        { id: 'bc', source: 'b', target: 'c' },
        { id: 'ap', source: 'a', target: 'p' },
      ],
    })
  )

const edit = (
  document: FlowDocument,
  command: typeof FlowTreeEditSchema.Encoded
) =>
  Effect.runSync(
    prepareFlowTreeEdit(document, command).pipe(
      Effect.flatMap((transaction) => prepareFlowEdit(document, transaction))
    )
  ).document

const ids = (document: FlowDocument) =>
  projectFlowTree(document).nodes.map(({ id }) => id)

describe('versioned dynamic trees', () => {
  it('preserves nested expansion, hidden flags, positions and opaque data across collapse and roundtrip', () => {
    let document = tree()
    document = {
      ...document,
      nodes: document.nodes.map((node) =>
        node.id === 'c' ? { ...node, hidden: true } : node
      ),
    }
    document = edit(document, { kind: 'toggle', nodeId: 'b' })
    document = edit(document, { kind: 'toggle', nodeId: 'a' })
    expect(ids(document)).toStrictEqual(['a'])

    const saved = Effect.runSync(
      decodeVersionedFlowDocument(encodeVersionedFlowDocument(document))
    )

    document = edit(saved, { kind: 'toggle', nodeId: 'a' })
    expect(ids(document)).toStrictEqual(['a', 'b', 'p'])
    document = edit(document, { kind: 'toggle', nodeId: 'b' })
    expect(ids(document)).toStrictEqual(['a', 'b', 'c', 'p'])
    expect(
      createFlowGraph(document).orderedNodes.find(({ id }) => id === 'c')
        ?.hidden
    ).toBeTruthy()
    expect({
      hidden: document.nodes.find(({ id }) => id === 'c')?.hidden,
      data: document.nodes.map(({ data }) => data?.opaque),
    }).toStrictEqual({
      hidden: true,
      data: Array.from({ length: 4 }, () => ({ keep: [160] })),
    })
  })

  it('promotes in place, grows collapsed parents without expanding them, and inserts without losing edge fields', () => {
    let document = edit(tree(), {
      kind: 'promote',
      nodeId: 'p',
      label: 'Promoted',
    })

    expect(
      flowTreeData(document.nodes.find(({ id }) => id === 'p'))?.kind
    ).toBe('node')
    document = edit(document, { kind: 'toggle', nodeId: 'b' })
    document = edit(document, {
      kind: 'add-child',
      parentId: 'b',
      id: 'new',
      edgeId: 'bn',
      label: 'New',
    })
    expect({ ids: ids(document), count: document.nodes.length }).toStrictEqual({
      ids: ['a', 'b', 'p', 'p-placeholder'],
      count: 6,
    })
    document = edit(document, {
      kind: 'insert',
      edgeId: 'ab',
      id: 'middle',
      newEdgeId: 'mb',
      label: 'Middle',
    })
    expect(document.edges.find(({ id }) => id === 'ab')).toMatchObject({
      source: 'a',
      target: 'middle',
      label: 'keep',
      data: { keep: [1, 'edge'] },
      stroke: '#123456',
    })
    expect(document.edges.find(({ id }) => id === 'mb')).toMatchObject({
      source: 'middle',
      target: 'b',
      data: { keep: [1, 'edge'] },
    })

    expect(
      getFlowTreeLayoutInput(document, {
        nodes: [],
        edges: [],
        unmeasured: [],
      }).nodes.map(({ id }) => ({
        id,
        expanded: flowTreeData(document.nodes.find((node) => node.id === id))
          ?.expanded,
      }))
    ).toStrictEqual([
      { id: 'a', expanded: true },
      { id: 'b', expanded: false },
      { id: 'p', expanded: true },
      { id: 'p-placeholder', expanded: true },
      { id: 'middle', expanded: true },
    ])
  })

  it('rejects cycles, multiple parents, multiple roots, invalid versions, duplicate IDs and missing nodes', () => {
    const document = tree()

    const invalid: unknown[] = [
      {
        ...document,
        edges: [...document.edges, { id: 'ca', source: 'c', target: 'a' }],
      },
      {
        ...document,
        edges: [...document.edges, { id: 'ac', source: 'a', target: 'c' }],
      },
      { ...document, edges: document.edges.filter(({ id }) => id !== 'bc') },
      {
        ...document,
        nodes: document.nodes.map((node) => ({
          ...node,
          data: { tree: { version: 2, expanded: true, kind: 'node' } },
        })),
      },
    ]

    for (const candidate of invalid) {
      expect(
        Result.isFailure(
          Effect.runSync(Effect.result(decodeFlowTree(candidate)))
        )
      ).toBeTruthy()
    }

    for (const command of [
      {
        kind: 'add-child',
        parentId: 'gone',
        id: 'new',
        edgeId: 'new',
        label: 'New',
      },
      {
        kind: 'add-child',
        parentId: 'a',
        id: 'b',
        edgeId: 'new',
        label: 'Duplicate',
      },
      {
        kind: 'insert',
        edgeId: 'gone',
        id: 'new',
        newEdgeId: 'new',
        label: 'New',
      },
    ] satisfies (typeof FlowTreeEditSchema.Encoded)[]) {
      expect(
        Result.isFailure(
          Effect.runSync(Effect.result(prepareFlowTreeEdit(document, command)))
        )
      ).toBeTruthy()
    }
  })

  it('supports an empty tree, root creation, subtree deletion and rejects a deleted parent', () => {
    let document = edit(tree(), { kind: 'delete-subtree', nodeId: 'a' })
    expect(document.nodes).toStrictEqual([])
    expect(document.edges).toStrictEqual([])
    expect(() =>
      edit(document, {
        kind: 'add-child',
        parentId: 'b',
        id: 'x',
        edgeId: 'x',
        label: 'X',
      })
    ).toThrow(InvalidFlowTree)
    document = edit(document, {
      kind: 'create-root',
      id: 'root',
      label: 'Root',
    })
    expect(ids(document)).toStrictEqual(['root'])
  })

  it('preserves tree data on copied hidden descendants and allocates fresh clipboard references', () => {
    let document = edit(tree(), { kind: 'toggle', nodeId: 'b' })
    document = {
      ...document,
      nodes: document.nodes.map((node) => ({ ...node, selected: true })),
    }
    const clipboard = Effect.runSync(copyFlowSelection(document))
    const result = pasteFlowGraphFragment(clipboard, document)

    const pasted = Effect.runSync(
      prepareFlowEdit(document, result.transaction)
    ).document

    expect(
      pasted.nodes.slice(4).map((node) => flowTreeData(node))
    ).toStrictEqual(document.nodes.map((node) => flowTreeData(node)))
    expect(pasted.edges.slice(3).map(({ data }) => data)).toStrictEqual(
      document.edges.map(({ data }) => data)
    )
  })

  it('discards stale layout and disposed workflows before any host commit', async () => {
    let document = tree()
    const input = { nodes: [], edges: [], unmeasured: [] }
    let commits = 0

    const editor = createFlowTreeEditor({
      read: () => Promise.resolve({ document, input }),
      engine: (request) =>
        Effect.sync(() => {
          document = edit(document, { kind: 'toggle', nodeId: 'b' })

          return {
            revision: request.revision,
            settings: request.settings,
            positions: new Map(),
          }
        }),
      animate: () => {
        commits += 1

        return Promise.resolve({ revision: '', kind: 'finished' })
      },
    })

    await expect(
      Effect.runPromise(
        Effect.result(editor.edit({ kind: 'toggle', nodeId: 'a' }))
      )
    ).resolves.toMatchObject({
      failure: { reason: 'Tree changed during layout or editor disposed' },
    })
    editor.dispose()
    await expect(
      Effect.runPromise(
        Effect.result(editor.edit({ kind: 'toggle', nodeId: 'a' }))
      )
    ).resolves.toMatchObject({
      failure: { reason: 'Tree editor disposed' },
    })
    expect(commits).toBe(0)
  })
})
