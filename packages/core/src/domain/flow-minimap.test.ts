import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowGraph } from './flow-graph.ts'
import { selectFlowMiniMapProjection } from './flow-minimap.ts'
import { decodeFlowDocument } from './flow.schema.ts'

describe('FlowMiniMap projection', () => {
  it('bounds visible nodes, projects viewport, and inverts pointer coordinates', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 0, y: 0 },
            size: { width: 100, height: 50 },
          },
          { id: 'b', label: 'B', position: { x: 200, y: 100 }, hidden: true },
          {
            id: 'c',
            label: 'C',
            position: { x: 300, y: 100 },
            size: { width: 50, height: 50 },
          },
        ],
        edges: [],
      })
    )

    const projection = selectFlowMiniMapProjection({
      graph: createFlowGraph(document),
      viewport: { x: -20, y: -10, zoom: 2 },
      canvas: { width: 600, height: 400 },
      size: { width: 180, height: 120 },
    })

    expect(projection?.nodes.map(({ id }) => id)).toStrictEqual(['a', 'c'])
    expect(projection?.bounds).toStrictEqual({
      x: 0,
      y: 0,
      width: 350,
      height: 150,
    })
    expect(projection?.graphCenter).toStrictEqual({ x: 175, y: 75 })
    expect(
      projection?.pointToGraph({ x: projection.offsetX, y: projection.offsetY })
    ).toStrictEqual({ x: 0, y: 0 })
    expect(projection?.viewport.width).toBeCloseTo((600 / 2) * (164 / 350))
  })

  it('returns no projection for an empty or all-hidden graph', () => {
    const empty = Effect.runSync(decodeFlowDocument({ nodes: [], edges: [] }))

    const hidden = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'hidden',
            label: 'Hidden',
            hidden: true,
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      })
    )

    const input = {
      viewport: { x: 0, y: 0, zoom: 1 },
      canvas: { width: 200, height: 100 },
      size: { width: 180, height: 120 },
    }

    expect(
      selectFlowMiniMapProjection({ ...input, graph: createFlowGraph(empty) })
    ).toBeUndefined()
    expect(
      selectFlowMiniMapProjection({ ...input, graph: createFlowGraph(hidden) })
    ).toBeUndefined()
  })
})
