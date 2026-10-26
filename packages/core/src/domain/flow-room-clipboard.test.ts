import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { copyFlowSelection, pasteFlowGraphFragment } from './flow-clipboard.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'group',
        label: 'Group',
        selected: true,
        position: { x: 10, y: 20 },
      },
      {
        id: 'a',
        label: 'A',
        parentId: 'group',
        position: { x: 0, y: 0 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'b',
        label: 'B',
        parentId: 'group',
        position: { x: 200, y: 0 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      {
        id: 'first',
        source: 'a',
        target: 'b',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
      {
        id: 'second',
        source: 'a',
        target: 'b',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ],
    bundles: [
      {
        id: 'bundle',
        edgeIds: ['first', 'second'],
        ties: [{ x: 100, y: 100 }],
      },
    ],
  })
)

describe('room clipboard identity', () => {
  it('separates concurrent allocators and remaps parents, endpoints, handles and bundle members', () => {
    const clipboard = Effect.runSync(copyFlowSelection(document))

    const a = pasteFlowGraphFragment(clipboard, document, {
      idNamespace: 'actor-a',
    })

    const b = pasteFlowGraphFragment(clipboard, document, {
      idNamespace: 'actor-b',
    })

    const left = Effect.runSync(
      prepareFlowEdit(document, a.transaction)
    ).document

    const right = Effect.runSync(
      prepareFlowEdit(document, b.transaction)
    ).document

    expect(left.nodes.map(({ id }) => id)).toStrictEqual([
      'group',
      'a',
      'b',
      'group-actor-a-copy-1',
      'a-actor-a-copy-1',
      'b-actor-a-copy-1',
    ])
    expect(right.nodes.map(({ id }) => id)).toStrictEqual([
      'group',
      'a',
      'b',
      'group-actor-b-copy-1',
      'a-actor-b-copy-1',
      'b-actor-b-copy-1',
    ])
    expect(
      left.nodes.find(({ id }) => id === 'a-actor-a-copy-1')
    ).toMatchObject({
      parentId: 'group-actor-a-copy-1',
      handles: [{ id: 'a-actor-a-copy-1-out' }],
    })
    expect(
      left.edges.find(({ id }) => id === 'first-actor-a-copy-1')
    ).toMatchObject({
      source: 'a-actor-a-copy-1',
      target: 'b-actor-a-copy-1',
      sourceHandle: 'a-actor-a-copy-1-out',
      targetHandle: 'b-actor-a-copy-1-in',
    })
    expect(left.bundles?.[1]).toStrictEqual({
      id: 'bundle-actor-a-copy-1',
      edgeIds: ['first-actor-a-copy-1', 'second-actor-a-copy-1'],
      ties: [{ x: 120, y: 120 }],
    })
  })
})
