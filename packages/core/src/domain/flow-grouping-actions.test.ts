import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { prepareFlowEdit } from './flow-edit.ts'
import { createFlowGraph, graphNodeBounds } from './flow-graph.ts'
import type { FlowGroupingActionSchema } from './flow-grouping-actions.ts'
import {
  prepareFlowGrouping,
  refitFlowGroups,
  refitGroupNodes,
} from './flow-grouping-actions.ts'
import { createFlowHistory, reduceFlowHistory } from './flow-history.ts'
import { decodeFlowDocument, NodeIdSchema } from './flow.schema.ts'
import type { FlowDocument } from './flow.schema.ts'

const initial = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'Alpha',
          position: { x: 100, y: 100 },
          size: { width: 120, height: 50 },
        },
        {
          id: 'b',
          label: 'Beta',
          position: { x: 300, y: 150 },
          size: { width: 120, height: 50 },
        },
      ],
      edges: [
        { id: 'ab', source: 'a', target: 'b', data: { opaque: ['preserved'] } },
      ],
    })
  )

const bounds = (
  document: FlowDocument
): ReadonlyMap<string, ReturnType<typeof graphNodeBounds>> =>
  new Map(
    [...createFlowGraph(document).nodes].map(([id, node]) => [
      id,
      graphNodeBounds(node),
    ])
  )

const command = (
  document: FlowDocument,
  action: typeof FlowGroupingActionSchema.Encoded
) =>
  Effect.runSync(
    Effect.flatMap(
      prepareFlowGrouping(document, bounds(document), action),
      (transaction) => prepareFlowEdit(document, transaction)
    )
  ).document

const grouped = () =>
  command(initial(), { kind: 'group', groupId: 'g', nodeIds: ['a', 'b'] })

describe('grouping actions', () => {
  it('groups, ungroups and detaches atomically without changing child bounds or edges', () => {
    const before = initial()
    const group = grouped()
    expect(group.nodes.find((node) => node.id === 'g')).toMatchObject({
      position: { x: 80, y: 80 },
      size: { width: 360, height: 140 },
      data: { flowGrouping: { autoFit: true } },
    })
    const ungrouped = command(group, { kind: 'ungroup', groupId: 'g' })
    expect({ bounds: bounds(ungrouped), edges: ungrouped.edges }).toStrictEqual(
      { bounds: bounds(before), edges: before.edges }
    )
    const detached = command(group, { kind: 'detach', nodeIds: ['a'] })
    expect(bounds(detached).get('a')).toStrictEqual(bounds(before).get('a'))
    expect(bounds(detached).get('b')).toStrictEqual(bounds(before).get('b'))
    expect(detached.nodes.find((node) => node.id === 'g')?.size).toStrictEqual({
      width: 160,
      height: 90,
    })
  })

  it('fits nested groups inside out and preserves every descendant position', () => {
    const inner = grouped()

    const outer = command(inner, {
      kind: 'group',
      groupId: 'outer',
      nodeIds: ['g'],
    })

    const changed = {
      ...outer,
      nodes: outer.nodes.map((node) =>
        node.id === 'a' ? { ...node, position: { x: -100, y: -30 } } : node
      ),
    }

    const expected = bounds(changed)
    const fitted = refitFlowGroups(changed)
    expect(bounds(fitted).get('a')).toStrictEqual(expected.get('a'))
    expect(bounds(fitted).get('b')).toStrictEqual(expected.get('b'))
    expect(
      fitted.nodes.find((node) => node.id === 'outer')?.size
    ).toStrictEqual({ width: 520, height: 230 })
    const ungrouped = command(outer, { kind: 'ungroup', groupId: 'g' })
    expect(ungrouped.nodes.find((node) => node.id === 'a')?.parentId).toBe(
      'outer'
    )
    expect(bounds(ungrouped).get('a')).toStrictEqual(bounds(initial()).get('a'))
  })

  it('grows and shrinks after authored size changes and preserves edge attachments', () => {
    const document = grouped()

    const resize = (width: number) =>
      Effect.runSync(
        prepareFlowEdit(document, {
          operations: [
            {
              kind: 'update-node',
              nodeId: 'b',
              patch: { label: 'Changed', size: { width, height: 80 } },
            },
          ],
        })
      ).document

    expect(
      resize(240).nodes.find((node) => node.id === 'g')?.size
    ).toStrictEqual({ width: 480, height: 170 })
    expect(
      resize(40).nodes.find((node) => node.id === 'g')?.size
    ).toStrictEqual({ width: 280, height: 170 })
    expect(resize(240).edges).toStrictEqual(document.edges)
  })

  it('rejects missing bounds and cycles without partial refitting', () => {
    const document = grouped()
    expect(refitGroupNodes(document.nodes, new Map())).toBe(document.nodes)

    const cyclic = document.nodes.map((node) =>
      node.id === 'g' ? { ...node, parentId: NodeIdSchema.make('g') } : node
    )

    expect(refitGroupNodes(cyclic, bounds(document))).toBe(cyclic)
    expect(() =>
      Effect.runSync(
        prepareFlowGrouping(document, new Map(), {
          kind: 'ungroup',
          groupId: 'g',
        })
      )
    ).toThrow('missing-bounds')
  })

  it('preserves centered anchors and the document origin through grouping and ungrouping', () => {
    const source = { ...initial(), nodeOrigin: [0.5, 0.5] as const }

    const group = command(source, {
      kind: 'group',
      groupId: 'g',
      nodeIds: ['a', 'b'],
    })

    const removed = command(group, { kind: 'ungroup', groupId: 'g' })
    expect(bounds(group).get('a')).toStrictEqual(bounds(source).get('a'))
    expect(bounds(group).get('b')).toStrictEqual(bounds(source).get('b'))
    expect(bounds(removed)).toStrictEqual(bounds(source))
  })

  it('uses measured intrinsic children and refits idempotently without moving siblings', () => {
    const document = grouped()

    const intrinsic = {
      ...document,
      nodes: document.nodes.map((node) => {
        if (node.id !== 'a') {
          return node
        }

        const { size: _size, ...rest } = node

        return rest
      }),
    }

    const measurements = new Map([
      [
        NodeIdSchema.make('a'),
        { nodeId: NodeIdSchema.make('a'), width: 500, height: 80 },
      ],
    ])

    const fitted = refitFlowGroups(intrinsic, measurements)
    expect(fitted.nodes.find((node) => node.id === 'g')?.size).toStrictEqual({
      width: 540,
      height: 140,
    })
    expect(bounds(fitted).get('b')).toStrictEqual(bounds(document).get('b'))
    expect(refitFlowGroups(fitted, measurements)).toBe(fitted)
  })

  it('records each command once and folds later measurements into the present snapshot', () => {
    const before = initial()
    const group = grouped()

    const history = reduceFlowHistory(createFlowHistory(before), {
      kind: 'accepted',
      document: group,
    }).state

    expect(history.past).toHaveLength(1)

    const derived = reduceFlowHistory(history, {
      kind: 'accepted',
      document: group,
      derived: true,
    }).state

    expect(derived.past).toStrictEqual(history.past)
    expect(derived.future).toStrictEqual(history.future)
    const detached = command(group, { kind: 'detach', nodeIds: ['a'] })
    expect(
      reduceFlowHistory(derived, { kind: 'accepted', document: detached }).state
        .past
    ).toHaveLength(2)
  })
})
