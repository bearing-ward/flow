import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowGraph } from './flow-graph.ts'
import {
  solveFlowAlignment,
  resolveFlowAlignmentGuides,
} from './flow-helper-lines.ts'
import type { FlowDocumentSchema } from './flow.schema.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const document = (nodes: typeof FlowDocumentSchema.Encoded.nodes) =>
  Effect.runSync(decodeFlowDocument({ nodes, edges: [] }))

const base = () =>
  document([
    {
      id: 'a',
      label: 'A',
      position: { x: 100, y: 100 },
      size: { width: 100, height: 60 },
    },
    {
      id: 'b',
      label: 'B',
      position: { x: 400, y: 300 },
      size: { width: 140, height: 80 },
    },
  ])

const solve = (x: number, y: number, zoom = 1) => {
  const graph = createFlowGraph(base())

  return solveFlowAlignment({
    graph,
    nodeIds: graph.document.nodes.slice(0, 1).map((n) => n.id),
    delta: { x, y },
    zoom,
  })
}

describe('measured alignment helper lines', () => {
  it('snaps horizontal and vertical centers and edges with exact guide coordinates', () => {
    expect(solve(296, 196)).toMatchObject({
      delta: { x: 300, y: 200 },
      guides: [
        { axis: 'x', coordinate: 400 },
        { axis: 'y', coordinate: 300 },
      ],
    })
    expect(solve(317, 207)).toMatchObject({
      delta: { x: 320, y: 210 },
      guides: [
        { axis: 'x', coordinate: 470 },
        { axis: 'y', coordinate: 340 },
      ],
    })
  })

  it('uses an inclusive six CSS pixel tolerance at every zoom', () => {
    expect([
      solve(294, 150).delta.x,
      solve(293.99, 150).delta.x,
      solve(288, 150, 0.5).delta.x,
      solve(287.99, 150, 0.5).delta.x,
      solve(297, 150, 2).delta.x,
      solve(296.99, 150, 2).delta.x,
    ]).toStrictEqual([300, 293.99, 300, 287.99, 300, 296.99])
  })

  it('gives active guides precedence over grid snapping and retains grid on unmatched axes', () => {
    const graph = createFlowGraph(base())
    expect(
      solveFlowAlignment({
        graph,
        nodeIds: graph.document.nodes.slice(0, 1).map((n) => n.id),
        delta: { x: 317, y: 154 },
        zoom: 1,
        snapGrid: { x: 50, y: 50 },
      })
    ).toMatchObject({
      delta: { x: 320, y: 150 },
      guides: [{ axis: 'x', coordinate: 470 }],
    })
  })

  it('preserves group offsets, excludes dragged descendants and ignores hidden candidates', () => {
    const doc = document([
      {
        id: 'a',
        label: 'A',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 60 },
      },
      {
        id: 'c',
        label: 'C',
        parentId: 'a',
        position: { x: 20, y: 20 },
        size: { width: 50, height: 20 },
      },
      {
        id: 'hidden',
        label: 'Hidden',
        hidden: true,
        position: { x: 104, y: 104 },
      },
    ])

    const graph = createFlowGraph(doc)
    expect(
      solveFlowAlignment({
        graph,
        nodeIds: doc.nodes.slice(0, 1).map((n) => n.id),
        delta: { x: 4, y: 4 },
        zoom: 1,
      })
    ).toStrictEqual({ delta: { x: 4, y: 4 }, guides: [] })
  })

  it('uses parent absolute coordinates and declared origins', () => {
    const doc = document([
      {
        id: 'p',
        label: 'P',
        position: { x: 50, y: 50 },
        size: { width: 700, height: 500 },
      },
      {
        id: 'a',
        label: 'A',
        parentId: 'p',
        position: { x: 100, y: 80 },
        origin: [0.5, 0.5],
        size: { width: 100, height: 60 },
      },
      {
        id: 'b',
        label: 'B',
        position: { x: 400, y: 300 },
        size: { width: 140, height: 80 },
      },
    ])

    const graph = createFlowGraph(doc)
    expect(
      solveFlowAlignment({
        graph,
        nodeIds: doc.nodes.slice(1, 2).map((n) => n.id),
        delta: { x: 296, y: 196 },
        zoom: 1,
      }).delta
    ).toStrictEqual({ x: 300, y: 200 })
  })

  it('chooses center then stable target IDs when candidates tie', () => {
    const doc = document([
      ...base().nodes,
      {
        id: 'c',
        label: 'C',
        position: { x: 400, y: 600 },
        size: { width: 140, height: 80 },
      },
    ])

    const { nodes } = doc
    const graph = createFlowGraph(doc)

    const input = {
      graph,
      nodeIds: nodes.slice(0, 1).map((n) => n.id),
      delta: { x: 310, y: 100 },
      zoom: 0.5,
    }

    const result = solveFlowAlignment(input)
    expect(result.guides[0]).toMatchObject({
      axis: 'x',
      coordinate: 470,
      targetId: 'b',
    })
    expect(
      solveFlowAlignment({
        ...input,
        graph: createFlowGraph({ ...doc, nodes: nodes.toReversed() }),
      })
    ).toStrictEqual(result)
  })

  it('uses measured sizes and one delta for a selection', () => {
    const doc = document([
      ...base().nodes,
      {
        id: 'c',
        label: 'C',
        position: { x: 100, y: 200 },
        size: { width: 100, height: 60 },
      },
    ])

    const [first, target, third] = doc.nodes

    if (first === undefined || target === undefined || third === undefined) {
      throw new Error('Missing fixture nodes')
    }

    const graph = createFlowGraph(
      doc,
      new Map([[target.id, { nodeId: target.id, width: 180, height: 100 }]])
    )

    const result = solveFlowAlignment({
      graph,
      nodeIds: [first.id, third.id],
      delta: { x: 337, y: 96 },
      zoom: 1,
    })

    expect(result.delta).toStrictEqual({ x: 340, y: 100 })
    expect(result.guides).toMatchObject([
      { axis: 'x', coordinate: 490, from: 200, to: 400 },
      { axis: 'y', coordinate: 300, from: 400, to: 580 },
    ])
  })

  it('removes guides invalidated by placement constraints', () => {
    const doc = base()
    const [first] = doc.nodes

    if (first === undefined) {
      throw new Error('Missing drag source')
    }

    const result = solveFlowAlignment({
      graph: createFlowGraph(doc),
      nodeIds: [first.id],
      delta: { x: 296, y: 196 },
      zoom: 1,
    })

    const rendered = createFlowGraph(
      doc,
      new Map(),
      new Map([[first.id, { x: 320, y: 300 }]])
    )

    expect(resolveFlowAlignmentGuides(rendered, result.guides)).toMatchObject([
      { axis: 'y', coordinate: 300, from: 320, to: 540 },
    ])
  })
})
