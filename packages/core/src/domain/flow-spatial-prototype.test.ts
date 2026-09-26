import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowGraph, graphNodesIntersecting } from './flow-graph.ts'
import { createFlowSpatialPrototype } from './flow-spatial-prototype.ts'
import { NodeIdSchema } from './flow-values.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const nodeId = S.decodeUnknownSync(NodeIdSchema)

const ids = (
  graph: ReturnType<typeof createFlowGraph>,
  rect: { x: number; y: number; width: number; height: number }
) => createFlowSpatialPrototype(graph).query(rect).map(String)

const scanIds = (
  graph: ReturnType<typeof createFlowGraph>,
  rect: { x: number; y: number; width: number; height: number }
) => graphNodesIntersecting(graph, rect).map((node) => String(node.id))

describe('flow spatial prototype', () => {
  it('matches scan after graph revisions and preserves inclusive boundary touch', () => {
    const base = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'parent',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { width: 20, height: 20 },
          },
          {
            id: 'child',
            label: 'Child',
            parentId: 'parent',
            position: { x: 30, y: 0 },
            size: { width: 10, height: 10 },
          },
          {
            id: 'hidden',
            label: 'Hidden',
            position: { x: 50, y: 0 },
            hidden: true,
          },
        ],
        edges: [],
      })
    )

    const revisions = [
      createFlowGraph(base),
      createFlowGraph(
        Effect.runSync(
          decodeFlowDocument({
            nodes: [
              ...base.nodes,
              { id: 'added', label: 'Added', position: { x: 90, y: 0 } },
            ],
            edges: [],
          })
        )
      ),
      createFlowGraph(
        Effect.runSync(
          decodeFlowDocument({
            nodes: base.nodes.filter((node) => node.id !== 'child'),
            edges: [],
          })
        )
      ),
      createFlowGraph(
        base,
        new Map(),
        new Map([[nodeId('parent'), { x: 200, y: 0 }]])
      ),
      createFlowGraph(
        base,
        new Map(),
        new Map([[nodeId('child'), { x: 50, y: 0 }]])
      ),
      createFlowGraph(
        base,
        new Map([
          [
            nodeId('child'),
            { nodeId: nodeId('child'), width: 180, height: 15 },
          ],
        ])
      ),
      createFlowGraph(
        Effect.runSync(
          decodeFlowDocument({
            nodes: base.nodes.map((node) =>
              node.id === 'parent' ? { ...node, hidden: true } : node
            ),
            edges: [],
          })
        )
      ),
    ]

    const rects = [
      { x: 20, y: 0, width: 0, height: 20 },
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 180, y: 0, width: 1, height: 20 },
      { x: 49, y: 0, width: 1, height: 10 },
    ]

    for (const graph of revisions) {
      const index = createFlowSpatialPrototype(graph)

      for (const rect of rects) {
        expect(index.query(rect).map(String)).toStrictEqual(
          scanIds(graph, rect)
        )
      }
    }

    const firstRevision = revisions.at(0)
    const firstRect = rects.at(0)

    if (firstRevision === undefined || firstRect === undefined) {
      throw new Error('Expected populated spatial fixtures')
    }

    expect(ids(firstRevision, firstRect)).toStrictEqual(['parent'])
  })

  it('matches 100 fixed-seed generated rectangles', () => {
    const seed = 0x5_1a_71_a1
    let state = seed

    const random = () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) % 0x1_00_00_00_00

      if (state < 0) {
        state += 0x1_00_00_00_00
      }

      return state / 0x1_00_00_00_00
    }

    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: Array.from({ length: 90 }, (_, index) => ({
          id: `n${index}`,
          label: `N${index}`,
          position: {
            x: Math.floor(random() * 1800) - 900,
            y: Math.floor(random() * 1800) - 900,
          },
          size: {
            width: 1 + Math.floor(random() * 420),
            height: 1 + Math.floor(random() * 420),
          },
          hidden: index % 13 === 0,
        })),
        edges: [],
      })
    )

    const graph = createFlowGraph(document)
    const index = createFlowSpatialPrototype(graph)

    for (let n = 0; n < 100; n += 1) {
      const rect = {
        x: Math.floor(random() * 1800) - 900,
        y: Math.floor(random() * 1800) - 900,
        width: Math.floor(random() * 500),
        height: Math.floor(random() * 500),
      }

      try {
        expect(index.query(rect).map(String)).toStrictEqual(
          scanIds(graph, rect)
        )
      } catch (error) {
        throw new Error(
          `fixed-seed spatial comparison failed (seed=${seed}, rectangle=${n})`,
          { cause: error }
        )
      }
    }
  })
})
