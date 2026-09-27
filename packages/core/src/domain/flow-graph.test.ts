import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  createFlowGraph,
  graphAncestors,
  graphBounds,
  graphDescendants,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
  graphIncomers,
  graphNode,
  graphNodesIntersecting,
  graphOutgoers,
} from './flow-graph.ts'
import { NodeIdSchema } from './flow-values.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const nodeId = S.decodeUnknownSync(NodeIdSchema)

describe('flow graph view', () => {
  it('resolves deterministic generated trees independent of document order', () => {
    const seeds = [0x13_57_9b_df, 0x24_68_ac_e0, 0xde_ad_be_ef, 0x10_20_30_40]

    for (const seed of seeds) {
      let state = seed

      const random = (): number => {
        state = (Math.imul(state, 1_664_525) + 1_013_904_223) % 0x1_00_00_00_00

        if (state < 0) {
          state += 0x1_00_00_00_00
        }

        return state / 0x1_00_00_00_00
      }

      const nodes: {
        id: string
        label: string
        position: { x: number; y: number }
        parentId?: string
        hidden?: boolean
      }[] = []

      const expected = new Map<
        string,
        { x: number; y: number; hidden: boolean }
      >()

      const depth = 1 + Math.floor(random() * 5)

      for (let index = 0; index < depth; index += 1) {
        const id = `seed-${seed}-node-${index}`

        const position = {
          x: Math.floor(random() * 201) - 100,
          y: Math.floor(random() * 201) - 100,
        }

        const ownHidden = random() < 0.25

        const parentIndex =
          index === 0 ? undefined : Math.floor(random() * index)

        const parentId =
          parentIndex === undefined
            ? undefined
            : `seed-${seed}-node-${parentIndex}`

        const parent =
          parentId === undefined ? undefined : expected.get(parentId)

        const generatedNode: (typeof nodes)[number] = {
          id,
          label: id,
          position,
        }

        if (parentId !== undefined) {
          generatedNode.parentId = parentId
        }

        if (ownHidden) {
          generatedNode.hidden = true
        }

        nodes.push(generatedNode)
        expected.set(id, {
          x: (parent?.x ?? 0) + position.x,
          y: (parent?.y ?? 0) + position.y,
          hidden: ownHidden || (parent?.hidden ?? false),
        })
      }

      nodes.reverse()

      try {
        const document = Effect.runSync(
          decodeFlowDocument({ nodes, edges: [] })
        )

        const graph = createFlowGraph(document)

        for (const [id, position] of expected) {
          expect(
            graphNode(graph, nodeId(id)),
            `seed ${seed}, node ${id}`
          ).toMatchObject({
            absolutePosition: { x: position.x, y: position.y },
            hidden: position.hidden,
          })
        }

        expect(
          new Set(graph.orderedNodes.map((node) => node.id)),
          `seed ${seed}: stable IDs`
        ).toStrictEqual(new Set(expected.keys()))
      } catch (error) {
        throw new Error(`Generated graph property failed for seed ${seed}`, {
          cause: error,
        })
      }
    }
  })

  it('derives three-level absolute positions independently of array order', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'leaf',
            label: 'Leaf',
            parentId: 'child',
            position: { x: 3, y: 4 },
          },
          { id: 'root', label: 'Root', position: { x: 100, y: 200 } },
          {
            id: 'child',
            label: 'Child',
            parentId: 'root',
            position: { x: 10, y: 20 },
          },
        ],
        edges: [],
      })
    )

    const graph = createFlowGraph(document)

    expect(graphNode(graph, nodeId('leaf'))?.absolutePosition).toStrictEqual({
      x: 113,
      y: 224,
    })
    expect(
      graphAncestors(graph, nodeId('leaf')).map((node) => node.id)
    ).toStrictEqual(['child', 'root'])
    expect(
      graphDescendants(graph, nodeId('root')).map((node) => node.id)
    ).toStrictEqual(['child', 'leaf'])
  })

  it('orders siblings by zIndex and document order with parents before descendants', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: 'late', label: 'Late', position: { x: 0, y: 0 }, zIndex: 5 },
          {
            id: 'child',
            label: 'Child',
            parentId: 'root',
            position: { x: 0, y: 0 },
            zIndex: -10,
          },
          { id: 'root', label: 'Root', position: { x: 0, y: 0 }, zIndex: 10 },
          { id: 'early', label: 'Early', position: { x: 0, y: 0 }, zIndex: 1 },
        ],
        edges: [],
      })
    )

    expect(
      createFlowGraph(document).orderedNodes.map((node) => node.id)
    ).toStrictEqual(['early', 'late', 'root', 'child'])
  })

  it('inherits hidden state and uses measured dimensions over declared dimensions', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'root',
            label: 'Root',
            position: { x: 0, y: 0 },
            size: { width: 300, height: 200 },
            hidden: true,
          },
          {
            id: 'child',
            label: 'Child',
            parentId: 'root',
            position: { x: 10, y: 15 },
            size: { width: 80, height: 50 },
          },
        ],
        edges: [],
      })
    )

    const graph = createFlowGraph(
      document,
      new Map([
        [nodeId('child'), { nodeId: nodeId('child'), width: 120, height: 70 }],
      ])
    )

    expect(graphNode(graph, nodeId('child'))).toMatchObject({
      absolutePosition: { x: 10, y: 15 },
      dimensions: { width: 120, height: 70 },
      hidden: true,
    })
    expect(graphBounds(graph)).toBeUndefined()
  })

  it('uses declared sizes before measurements and the 150 by 44 fallback otherwise', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'declared',
            label: 'Declared',
            position: { x: 0, y: 0 },
            size: { width: 90, height: 60 },
          },
          { id: 'fallback', label: 'Fallback', position: { x: 100, y: 0 } },
        ],
        edges: [],
      })
    )

    const graph = createFlowGraph(document)

    expect(graphNode(graph, nodeId('declared'))?.dimensions).toStrictEqual({
      width: 90,
      height: 60,
    })
    expect(graphNode(graph, nodeId('fallback'))?.dimensions).toStrictEqual({
      width: 150,
      height: 44,
    })
  })

  it('computes bounds, intersections, and directed neighboring edges', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 0, y: 0 },
            size: { width: 20, height: 20 },
          },
          {
            id: 'b',
            label: 'B',
            position: { x: 50, y: 0 },
            size: { width: 20, height: 20 },
          },
          {
            id: 'c',
            label: 'C',
            position: { x: 100, y: 0 },
            size: { width: 20, height: 20 },
          },
        ],
        edges: [
          { id: 'ab', source: 'a', target: 'b' },
          { id: 'ba', source: 'b', target: 'a' },
          { id: 'bc', source: 'b', target: 'c' },
        ],
      })
    )

    const graph = createFlowGraph(document)

    expect(graphBounds(graph)).toStrictEqual({
      x: 0,
      y: 0,
      width: 120,
      height: 20,
    })
    expect(
      graphNodesIntersecting(graph, { x: 45, y: 0, width: 10, height: 20 }).map(
        (node) => node.id
      )
    ).toStrictEqual(['b'])
    expect(
      graphIncomers(graph, nodeId('b')).map((edge) => edge.id)
    ).toStrictEqual(['ab'])
    expect(
      graphOutgoers(graph, nodeId('b')).map((edge) => edge.id)
    ).toStrictEqual(['ba', 'bc'])
    expect(
      graphBounds(
        createFlowGraph(
          Effect.runSync(decodeFlowDocument({ nodes: [], edges: [] }))
        )
      )
    ).toBeUndefined()
  })

  it('resolves child-local positions with overrides and size precedence in spatial queries', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'parent',
            label: 'Parent',
            position: { x: 100, y: 80 },
            size: { width: 10, height: 10 },
          },
          {
            id: 'child',
            label: 'Child',
            parentId: 'parent',
            position: { x: 5, y: 7 },
            size: { width: 20, height: 12 },
          },
          {
            id: 'measured',
            label: 'Measured',
            position: { x: 200, y: 0 },
            size: { width: 10, height: 10 },
          },
          { id: 'fallback', label: 'Fallback', position: { x: 300, y: 0 } },
        ],
        edges: [],
      })
    )

    const graph = createFlowGraph(
      document,
      new Map([
        [
          nodeId('measured'),
          { nodeId: nodeId('measured'), width: 40, height: 30 },
        ],
      ]),
      new Map([[nodeId('child'), { x: 9, y: 11 }]])
    )

    expect({
      childPosition: graphNode(graph, nodeId('child'))?.absolutePosition,
      childDimensions: graphNode(graph, nodeId('child'))?.dimensions,
      measuredDimensions: graphNode(graph, nodeId('measured'))?.dimensions,
      fallbackDimensions: graphNode(graph, nodeId('fallback'))?.dimensions,
    }).toStrictEqual({
      childPosition: { x: 109, y: 91 },
      childDimensions: { width: 20, height: 12 },
      measuredDimensions: { width: 40, height: 30 },
      fallbackDimensions: { width: 150, height: 44 },
    })
    expect([
      graphNodesIntersecting(graph, {
        x: 108,
        y: 91,
        width: 22,
        height: 12,
      }).map((node) => node.id),
      graphNodesIntersecting(graph, { x: 239, y: 25, width: 1, height: 1 }).map(
        (node) => node.id
      ),
      graphNodesIntersecting(graph, { x: 449, y: 43, width: 1, height: 1 }).map(
        (node) => node.id
      ),
    ]).toStrictEqual([['child'], ['measured'], ['fallback']])
    expect(graphBounds(graph)).toStrictEqual({
      x: 100,
      y: 0,
      width: 350,
      height: 103,
    })
  })

  it('excludes hidden descendants from spatial results while directed edges use document topology', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'hidden',
            label: 'Hidden',
            position: { x: 0, y: 0 },
            hidden: true,
          },
          {
            id: 'descendant',
            label: 'Descendant',
            parentId: 'hidden',
            position: { x: 10, y: 10 },
          },
          { id: 'visible', label: 'Visible', position: { x: 30, y: 30 } },
        ],
        edges: [
          { id: 'hidden-to-visible', source: 'descendant', target: 'visible' },
        ],
      })
    )

    const graph = createFlowGraph(document)

    expect(
      graphNodesIntersecting(graph, {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
      }).map((node) => node.id)
    ).toStrictEqual(['visible'])
    expect(
      graphIncomers(graph, nodeId('visible')).map((edge) => edge.id)
    ).toStrictEqual(['hidden-to-visible'])
    expect(
      graphOutgoers(graph, nodeId('descendant')).map((edge) => edge.id)
    ).toStrictEqual(['hidden-to-visible'])
  })

  it('keeps invalid cyclic ancestry at the decode boundary', () => {
    const result = Effect.runSync(
      Effect.exit(
        decodeFlowDocument({
          nodes: [
            { id: 'a', label: 'A', parentId: 'b', position: { x: 0, y: 0 } },
            { id: 'b', label: 'B', parentId: 'a', position: { x: 0, y: 0 } },
          ],
          edges: [],
        })
      )
    )

    expect(result._tag).toBe('Failure')
  })
})

const graphQueryFixture = () => {
  const document = Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'target',
          label: 'Target',
          position: { x: 0, y: 0 },
          hidden: true,
        },
        { id: 'source-b', label: 'B', position: { x: 0, y: 0 } },
        { id: 'source-a', label: 'A', position: { x: 0, y: 0 } },
        { id: 'isolated', label: 'Isolated', position: { x: 0, y: 0 } },
        {
          id: 'outside',
          label: 'Outside supplied subset',
          position: { x: 0, y: 0 },
        },
      ],
      edges: [
        { id: 'b-target', source: 'source-b', target: 'target' },
        { id: 'a-target', source: 'source-a', target: 'target' },
        { id: 'b-target-parallel', source: 'source-b', target: 'target' },
        { id: 'target-self', source: 'target', target: 'target' },
        { id: 'target-b', source: 'target', target: 'source-b' },
        { id: 'unselected-source', source: 'outside', target: 'isolated' },
      ],
    })
  )

  const nodes = document.nodes.filter((node) => node.id !== nodeId('outside'))
  const edges = [...document.edges]

  return { nodes, edges }
}

describe('reference-shaped graph query helpers', () => {
  it('returns unique incomers and outgoers in supplied node order, including hidden nodes and self-loops', () => {
    const { nodes, edges } = graphQueryFixture()
    const selected = { id: nodeId('target') }
    const incomers = getIncomers(selected, nodes, edges)
    const outgoers = getOutgoers(selected, nodes, edges)

    expect(incomers.map((node) => node.id)).toStrictEqual([
      nodeId('target'),
      nodeId('source-b'),
      nodeId('source-a'),
    ])

    expect(outgoers.map((node) => node.id)).toStrictEqual([
      nodeId('target'),
      nodeId('source-b'),
    ])

    expect(incomers.every((node) => nodes.includes(node))).toBeTruthy()
  })

  it('handles missing IDs, empty collections, and endpoints outside the supplied node subset', () => {
    const { nodes, edges } = graphQueryFixture()
    const selected = { id: nodeId('target') }

    expect(getIncomers({ id: nodeId('isolated') }, nodes, edges)).toStrictEqual(
      []
    )

    expect(getIncomers({ id: nodeId('absent') }, nodes, edges)).toStrictEqual(
      []
    )

    expect(getOutgoers({ id: nodeId('absent') }, nodes, edges)).toStrictEqual(
      []
    )

    expect(getIncomers(selected, [], edges)).toStrictEqual([])

    expect(getOutgoers(selected, nodes, [])).toStrictEqual([])
  })

  it('returns connected edges in supplied edge order when either endpoint is selected', () => {
    const { nodes, edges } = graphQueryFixture()
    const selected = { id: nodeId('target') }
    const connected = getConnectedEdges([selected], edges)

    expect(connected.map((edge) => edge.id)).toStrictEqual([
      'b-target',
      'a-target',
      'b-target-parallel',
      'target-self',
      'target-b',
    ])

    const isolated = nodes.find((node) => node.id === nodeId('isolated'))

    if (isolated === undefined) {
      throw new Error('Fixture is missing the isolated node')
    }

    expect(
      getConnectedEdges([isolated], edges).map((edge) => edge.id)
    ).toStrictEqual(['unselected-source'])

    expect(getConnectedEdges([], edges)).toStrictEqual([])

    expect(getConnectedEdges([selected], [])).toStrictEqual([])

    expect(connected.every((edge) => edges.includes(edge))).toBeTruthy()
  })

  it('does not mutate supplied node or edge collections', () => {
    const { nodes, edges } = graphQueryFixture()
    const nodesBefore = [...nodes]
    const edgesBefore = [...edges]

    getIncomers({ id: nodeId('target') }, nodes, edges)
    getOutgoers({ id: nodeId('target') }, nodes, edges)
    getConnectedEdges(nodes, edges)

    expect({ nodes, edges }).toStrictEqual({
      nodes: nodesBefore,
      edges: edgesBefore,
    })
  })
})
