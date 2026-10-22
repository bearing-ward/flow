import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowGraph } from './flow-graph.ts'
import {
  flowMiniMapPanViewport,
  flowMiniMapWheelZoom,
  FlowMiniMapOptionsSchema,
  selectFlowMiniMapProjection,
} from './flow-minimap.ts'
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
    // Upstream: packages/react/src/additional-components/MiniMap/MiniMap.tsx:19-24.
    expect(projection?.viewport).toStrictEqual({
      x: 10,
      y: 5,
      width: 300,
      height: 200,
    })
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

describe('FlowMiniMap options and node presentation', () => {
  const document = Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'styled',
          label: 'Styled',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 50 },
          style: { background: '#123456' },
          selected: true,
          type: 'input',
        },
        {
          id: 'plain',
          label: 'Plain',
          position: { x: 200, y: 0 },
          size: { width: 100, height: 50 },
          style: { backgroundColor: '#abcdef' },
        },
      ],
      edges: [],
    })
  )

  const base = {
    graph: createFlowGraph(document),
    viewport: { x: 0, y: 0, zoom: 1 },
    canvas: { width: 400, height: 300 },
    size: { width: 200, height: 150 },
  }

  it('uses React defaults and style fallbacks without options', () => {
    const nodes = selectFlowMiniMapProjection(base)?.nodes ?? []

    expect(
      nodes.map(({ id, fill, color, className, borderRadius, selected }) => ({
        id,
        fill,
        color,
        className,
        borderRadius,
        selected,
      }))
    ).toStrictEqual([
      {
        id: 'styled',
        fill: '#123456',
        color: undefined,
        className: '',
        borderRadius: 5,
        selected: true,
      },
      {
        id: 'plain',
        fill: '#abcdef',
        color: undefined,
        className: '',
        borderRadius: 5,
        selected: false,
      },
    ])
  })

  it('applies constant and per-node attribute functions', () => {
    const nodes =
      selectFlowMiniMapProjection({
        ...base,
        options: {
          nodeColor: (node) => (node.type === 'input' ? '#ff0072' : undefined),
          nodeStrokeColor: '#222',
          nodeClassName: (node) => `mini-${node.id}`,
          nodeBorderRadius: 2,
          nodeStrokeWidth: 3,
        },
      })?.nodes ?? []

    expect(nodes[0]).toMatchObject({
      color: '#ff0072',
      fill: '#ff0072',
      strokeColor: '#222',
      strokeWidth: 3,
      className: 'mini-styled',
      borderRadius: 2,
      style: { background: '#123456' },
    })
    expect(nodes[1]).toMatchObject({
      color: undefined,
      fill: '#abcdef',
      className: 'mini-plain',
    })
  })

  it('decodes the serializable MiniMap options', () => {
    expect(
      S.decodeUnknownSync(FlowMiniMapOptionsSchema)({
        position: 'center-left',
        pannable: true,
        zoomable: true,
        inversePan: true,
        zoomStep: 2,
        maskColor: 'rgba(0,0,0,0.2)',
        maskStrokeWidth: 2,
        ariaLabel: null,
      })
    ).toMatchObject({ position: 'center-left', ariaLabel: null })
    expect(() =>
      S.decodeUnknownSync(FlowMiniMapOptionsSchema)({ zoomStep: 0 })
    ).toThrow(/Expected/u)
  })

  it('pans and zooms like XYMinimap', () => {
    expect(
      flowMiniMapPanViewport({
        viewport: { x: 0, y: 0, zoom: 2 },
        delta: { x: 10, y: -5 },
        scale: 0.5,
      })
    ).toStrictEqual({ x: -40, y: 20, zoom: 2 })
    expect(
      flowMiniMapPanViewport({
        viewport: { x: 0, y: 0, zoom: 0.5 },
        delta: { x: 10, y: 0 },
        scale: 1,
        inversePan: true,
      }).x
    ).toBe(5)
    expect(
      flowMiniMapWheelZoom({ zoom: 1, deltaY: -500, deltaMode: 0 })
    ).toBeCloseTo(2)
    expect(
      flowMiniMapWheelZoom({ zoom: 1, deltaY: 20, deltaMode: 1, zoomStep: 2 })
    ).toBeCloseTo(2 ** -2)
    expect(
      flowMiniMapWheelZoom({
        zoom: 1,
        deltaY: -50,
        deltaMode: 0,
        macPinch: true,
      })
    ).toBeCloseTo(2)
  })
})

// Upstream: packages/react/src/additional-components/MiniMap/MiniMap.tsx:19-24,43-45,107-116,212-215.
// The reference uses graph units and
// unions visible node bounds with the viewport before applying offsetScale=5.
describe('MiniMap viewport tracking', () => {
  const graph = createFlowGraph(
    Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 0, y: 0 },
            size: { width: 100, height: 50 },
          },
          {
            id: 'hidden',
            label: 'Hidden',
            position: { x: -1000, y: -1000 },
            hidden: true,
          },
        ],
        edges: [],
      })
    )
  )

  it.each([
    {
      viewport: { x: 0, y: 0, zoom: 1 },
      box: { x: -5, y: -5, width: 210, height: 110 },
    },
    {
      viewport: { x: 0, y: 0, zoom: 2 },
      box: { x: -2.5, y: -2.5, width: 105, height: 55 },
    },
    {
      viewport: { x: 300, y: 0, zoom: 1 },
      box: { x: -310, y: -60, width: 420, height: 220 },
    },
  ])(
    'tracks $viewport while retaining graph-space node geometry',
    ({ viewport, box }) => {
      const projection = selectFlowMiniMapProjection({
        graph,
        viewport,
        canvas: { width: 200, height: 100 },
        size: { width: 200, height: 100 },
      })

      expect(projection?.viewBox).toStrictEqual(box)
      expect(projection?.nodes).toHaveLength(1)
      expect(projection?.nodes[0]).toMatchObject({
        id: 'a',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      })
    }
  )

  it('cuts the graph-space viewport out of the padded mask and inverts letterboxed clicks', () => {
    const projection = selectFlowMiniMapProjection({
      graph,
      viewport: { x: 0, y: 0, zoom: 1 },
      canvas: { width: 200, height: 100 },
      size: { width: 200, height: 100 },
    })

    expect(projection?.maskPath).toBe(
      'M-10,-10h220v120h-220z M0,0h200v100h-200z'
    )
    expect(projection?.pointToGraph({ x: 100, y: 50 })).toStrictEqual({
      x: 100,
      y: 50,
    })
    expect(projection?.pointToGraph({ x: 0, y: 0 }).x).toBeCloseTo(-10)
    expect(projection?.pointToGraph({ x: 0, y: 0 }).y).toBeCloseTo(-5)
  })
})
