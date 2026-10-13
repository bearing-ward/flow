import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { getDropParentId, groupNodes, reparentNode } from './flow-grouping.ts'
import { FlowNodeSchema, NodeIdSchema } from './flow.schema.ts'
import type { FlowNode } from './flow.schema.ts'

const node = (
  id: string,
  x: number,
  y: number,
  extra: {
    readonly parentId?: string
    readonly extent?: 'parent'
    readonly selected?: boolean
  } = {}
): FlowNode =>
  S.decodeUnknownSync(FlowNodeSchema)({
    id,
    label: id,
    position: { x, y },
    ...extra,
  })

const nodeId = NodeIdSchema.make

const rect = (x: number, y: number, width = 100, height = 40) => ({
  x,
  y,
  width,
  height,
})

describe(groupNodes, () => {
  const nodes = [
    node('a', 100, 100, { selected: true }),
    node('b', 300, 200, { selected: true }),
    node('c', 0, 0),
  ]

  const bounds = new Map([
    ['a', rect(100, 100)],
    ['b', rect(300, 200)],
    ['c', rect(0, 0)],
  ])

  it('wraps the nodes in a padded parent and keeps absolute positions', () => {
    const result = groupNodes(nodes, bounds, {
      nodeIds: ['a', 'b'],
      groupId: nodeId('g'),
      padding: 10,
    })

    expect(result.kind).toBe('grouped')

    const grouped = result.kind === 'grouped' ? result.nodes : []

    expect(grouped.map(({ id }) => id)).toStrictEqual(['g', 'a', 'b', 'c'])
    expect(grouped[0]).toStrictEqual({
      id: 'g',
      label: 'Group',
      position: { x: 90, y: 90 },
      size: { width: 320, height: 160 },
      selected: true,
    })
    expect(grouped.slice(1, 3)).toMatchObject([
      { parentId: 'g', position: { x: 10, y: 10 }, selected: false },
      { parentId: 'g', position: { x: 210, y: 110 } },
    ])
    expect(grouped[3]).toBe(nodes[2])
  })

  it('nests a group inside the shared parent', () => {
    const nested = [node('p', 0, 0), node('a', 10, 10, { parentId: 'p' })]

    const result = groupNodes(
      nested,
      new Map([
        ['p', rect(50, 50, 400, 400)],
        ['a', rect(60, 60)],
      ]),
      { nodeIds: ['a'], groupId: nodeId('g'), padding: 5, type: 'group' }
    )

    expect(result).toMatchObject({
      kind: 'grouped',
      nodes: [
        { id: 'p' },
        { id: 'g', parentId: 'p', type: 'group', position: { x: 5, y: 5 } },
        { id: 'a', parentId: 'g', position: { x: 5, y: 5 } },
      ],
    })
  })

  it('rejects empty, duplicate, unmeasured and mixed selections', () => {
    expect(
      groupNodes(nodes, bounds, { nodeIds: [], groupId: nodeId('g') })
    ).toStrictEqual({
      kind: 'rejected',
      reason: 'empty-selection',
    })
    expect(
      groupNodes(nodes, bounds, { nodeIds: ['a'], groupId: nodeId('c') })
    ).toMatchObject({
      reason: 'duplicate-group-id',
    })
    expect(
      groupNodes(nodes, new Map(), { nodeIds: ['a'], groupId: nodeId('g') })
    ).toMatchObject({
      reason: 'missing-bounds',
    })
    expect(
      groupNodes([...nodes, node('d', 0, 0, { parentId: 'c' })], bounds, {
        nodeIds: ['a', 'd'],
        groupId: nodeId('g'),
      })
    ).toMatchObject({ reason: 'mixed-parents' })
  })
})

describe(getDropParentId, () => {
  const nodes = [
    node('outer', 0, 0),
    node('inner', 20, 20, { parentId: 'outer' }),
    node('n', 0, 0),
  ]

  const candidates = [
    { id: 'outer', bounds: rect(0, 0, 500, 500) },
    { id: 'inner', bounds: rect(20, 20, 200, 200) },
  ]

  it('picks the smallest containing candidate', () => {
    expect(getDropParentId(nodes, candidates, 'n', rect(30, 30, 50, 20))).toBe(
      'inner'
    )
    expect(
      getDropParentId(nodes, candidates, 'n', rect(300, 300, 50, 20))
    ).toBe('outer')
  })

  it('returns undefined outside every candidate or across a border', () => {
    expect(
      getDropParentId(nodes, candidates, 'n', rect(600, 600, 50, 20))
    ).toBeUndefined()
    expect(
      getDropParentId(nodes, candidates, 'n', rect(480, 10, 50, 20))
    ).toBeUndefined()
  })

  it('never nests a node inside itself or its descendants', () => {
    expect(
      getDropParentId(nodes, candidates, 'outer', rect(30, 30, 50, 20))
    ).toBeUndefined()
  })
})

describe(reparentNode, () => {
  const nodes = [node('n', 300, 300), node('g', 100, 100)]

  const bounds = new Map([
    ['n', rect(300, 300)],
    ['g', rect(100, 100, 400, 400)],
  ])

  it('moves a node under a parent and keeps its absolute position', () => {
    expect(reparentNode(nodes, bounds, 'n', nodeId('g'))).toStrictEqual([
      node('g', 100, 100),
      node('n', 200, 200, { parentId: 'g' }),
    ])
  })

  it('keeps a parent extent when moving into another parent', () => {
    const child = [
      node('g', 100, 100),
      node('h', 400, 100),
      node('n', 200, 200, { parentId: 'g', extent: 'parent' }),
    ]

    expect(
      reparentNode(
        child,
        new Map([
          ...bounds,
          [nodeId('h'), { x: 400, y: 100, width: 300, height: 300 }],
        ]),
        'n',
        nodeId('h')
      ).find(({ id }) => id === 'n')?.extent
    ).toBe('parent')
  })

  it('detaches a node to the top level', () => {
    const child = [
      node('g', 100, 100),
      node('n', 200, 200, { parentId: 'g', extent: 'parent' }),
    ]

    expect(reparentNode(child, bounds, 'n')).toStrictEqual([
      node('g', 100, 100),
      node('n', 300, 300),
    ])
  })

  it('ignores missing bounds and cycles', () => {
    expect(reparentNode(nodes, new Map(), 'n', nodeId('g'))).toBe(nodes)

    const nested = [node('g', 0, 0), node('n', 0, 0, { parentId: 'g' })]

    expect(reparentNode(nested, bounds, 'g', nodeId('n'))).toBe(nested)
  })
})
