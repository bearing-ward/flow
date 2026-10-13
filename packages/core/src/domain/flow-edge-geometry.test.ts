import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  flowMeasurementsFromInternalNodes,
  getEdgeDistanceToPoint,
  getEdgeGeometry,
  getEdgeIntersections,
  getEdgesGeometry,
  getFlowNodeBounds,
  getPathPolylines,
  isEdgeIntersectingRect,
  isPointNearEdge,
} from './flow-edge-geometry.ts'
import { bezierEdgePath } from './flow-edge.schema.ts'
import {
  FlowMeasurementStateSchema,
  getFlowInternalNode,
} from './flow-measurement.schema.ts'
import { smoothStepEdgePath } from './flow-step-edge.schema.ts'
import { HandleIdSchema, NodeIdSchema } from './flow-values.ts'
import { FlowDocumentSchema } from './flow.schema.ts'

const handles = [
  { id: 'in', kind: 'target', side: 'left' },
  { id: 'out', kind: 'source', side: 'right' },
]

const node = (id: string, x: number, y: number, extra = {}) => ({
  id,
  label: id,
  position: { x, y },
  size: { width: 100, height: 40 },
  handles,
  ...extra,
})

const document = S.decodeUnknownSync(FlowDocumentSchema)({
  nodes: [
    node('a', 0, 0),
    node('b', 300, 0),
    node('c', 0, 200),
    node('hidden', 600, 0, { hidden: true }),
  ],
  edges: [
    { id: 'straight', source: 'a', target: 'b' },
    { id: 'bezier', source: 'a', target: 'c', path: 'bezier' },
    { id: 'smooth', source: 'c', target: 'b', path: 'smoothstep' },
    { id: 'to-hidden', source: 'a', target: 'hidden' },
    { id: 'off', source: 'a', target: 'b', hidden: true },
    { id: 'bad-handle', source: 'a', target: 'b', targetHandle: 'nope' },
  ],
})

describe(getEdgesGeometry, () => {
  it('returns rendered edges with path, endpoints and label', () => {
    const geometry = getEdgesGeometry(document)

    expect(geometry.map(({ id }) => id)).toStrictEqual([
      'straight',
      'bezier',
      'smooth',
    ])
  })

  it('anchors unmeasured handles and the label', () => {
    const straight = getEdgeGeometry(document, 'straight')

    // Unmeasured handles: side middle plus half the default 11px handle box.
    expect(straight?.source).toStrictEqual({ x: 105.5, y: 20 })
    expect(straight?.target).toStrictEqual({ x: 294.5, y: 20 })
    expect(straight?.path).toBe('M 105.5,20L 294.5,20')
    expect(straight?.label).toStrictEqual({ x: 200, y: 20 })
    expect([straight?.sourceHandleId, straight?.sourcePosition]).toStrictEqual([
      'out',
      'right',
    ])
  })

  it('draws each path kind like the host renderers', () => {
    const bezier = getEdgeGeometry(document, 'bezier')
    const smooth = getEdgeGeometry(document, 'smooth')

    expect(bezier?.path).toBe(
      bezierEdgePath({ x: 105.5, y: 20 }, { x: -5.5, y: 220 }, 'right', 'left')
    )
    expect(smooth?.path).toBe(
      smoothStepEdgePath(
        { x: 105.5, y: 220 },
        { x: 294.5, y: 20 },
        'right',
        'left'
      )
    )
    expect(getEdgeGeometry(document, 'to-hidden')).toBeUndefined()
  })

  it('uses measured handles and position overrides', () => {
    const measurements = new Map([
      [
        NodeIdSchema.make('a'),
        {
          nodeId: NodeIdSchema.make('a'),
          width: 120,
          height: 60,
          handles: [
            {
              nodeId: NodeIdSchema.make('a'),
              handleId: HandleIdSchema.make('out'),
              offset: { x: 120, y: 10 },
              width: 10,
              height: 10,
            },
          ],
        },
      ],
    ])

    const moved = getEdgeGeometry(document, 'straight', {
      measurements,
      positionOverrides: new Map([[NodeIdSchema.make('b'), { x: 400, y: 50 }]]),
    })

    expect(moved?.source).toStrictEqual({ x: 125, y: 10 })
    expect(moved?.target).toStrictEqual({ x: 394.5, y: 70 })
  })
})

describe(getFlowNodeBounds, () => {
  const nested = S.decodeUnknownSync(FlowDocumentSchema)({
    nodeOrigin: [0.5, 0.5],
    nodes: [
      node('parent', 200, 100, { size: { width: 200, height: 100 } }),
      node('child', 50, 30, { parentId: 'parent', origin: [0, 0] }),
      node('hidden', 0, 0, { hidden: true }),
    ],
    edges: [],
  })

  it('makes parent-relative anchors absolute with origins and ancestors', () => {
    expect(getFlowNodeBounds(nested)).toStrictEqual([
      { id: 'parent', bounds: { x: 100, y: 50, width: 200, height: 100 } },
      { id: 'child', bounds: { x: 150, y: 80, width: 100, height: 40 } },
    ])
  })

  it('treats drag overrides as parent-relative anchors, moving children too', () => {
    const moved = getFlowNodeBounds(nested, {
      positionOverrides: new Map([
        ['parent', { x: 300, y: 100 }],
        ['child', { x: 60, y: 30 }],
      ]),
    })

    expect(moved).toStrictEqual([
      { id: 'parent', bounds: { x: 200, y: 50, width: 200, height: 100 } },
      { id: 'child', bounds: { x: 260, y: 80, width: 100, height: 40 } },
    ])
  })
})

describe(flowMeasurementsFromInternalNodes, () => {
  it('keeps measured internal nodes only', () => {
    const state = S.decodeUnknownSync(FlowMeasurementStateSchema)({
      generations: [{ nodeId: 'a', generation: 1 }],
      nodes: [
        { generation: 1, measurement: { nodeId: 'a', width: 90, height: 30 } },
      ],
      revision: 1,
    })

    const measurements = flowMeasurementsFromInternalNodes(
      ['a', 'b', 'missing'].map((id) =>
        getFlowInternalNode(document, state, NodeIdSchema.make(id))
      )
    )

    expect([...measurements.keys()]).toStrictEqual(['a'])
    expect(measurements.get(NodeIdSchema.make('a'))?.width).toBe(90)
  })
})

describe(getPathPolylines, () => {
  it('flattens lines, curves, relative commands and close paths', () => {
    expect(getPathPolylines('M0,0 L10,0 h5 v5 l-5,0 Z')).toStrictEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 15, y: 0 },
        { x: 15, y: 5 },
        { x: 10, y: 5 },
        { x: 0, y: 0 },
      ],
    ])
  })

  it('flattens curves and separate subpaths', () => {
    const curve = getPathPolylines('M0 0 C0 10 10 10 10 0', {
      curveSegments: 4,
    })

    expect(curve[0]).toHaveLength(5)
    expect(curve[0]?.at(-1)).toStrictEqual({ x: 10, y: 0 })
    expect(curve[0]?.[2]).toStrictEqual({ x: 5, y: 7.5 })

    expect(
      getPathPolylines('M0 0 Q5 10 10 0', { curveSegments: 2 })
    ).toStrictEqual([
      [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        { x: 10, y: 0 },
      ],
    ])
    expect(getPathPolylines('M0 0 L1 1 M5 5 L6 6')).toHaveLength(2)
  })
})

describe('edge hit tests', () => {
  const horizontal = { path: 'M0,0 L100,0' }
  const vertical = { path: 'M50,-50 L50,50' }

  it('measures distance and nearness to a point', () => {
    expect(getEdgeDistanceToPoint(horizontal, { x: 50, y: 7 })).toBe(7)
    expect(getEdgeDistanceToPoint(horizontal, { x: 110, y: 0 })).toBe(10)
    expect(isPointNearEdge(horizontal, { x: 50, y: 4 }, 5)).toBeTruthy()
    expect(isPointNearEdge(horizontal, { x: 50, y: 6 }, 5)).toBeFalsy()
  })

  it('tests a rectangle crossed by, containing or apart from a path', () => {
    expect(
      isEdgeIntersectingRect(horizontal, {
        x: 40,
        y: -5,
        width: 10,
        height: 10,
      })
    ).toBeTruthy()
    expect(
      isEdgeIntersectingRect(horizontal, {
        x: -10,
        y: -10,
        width: 200,
        height: 20,
      })
    ).toBeTruthy()
    expect(
      isEdgeIntersectingRect(horizontal, { x: 40, y: 5, width: 10, height: 10 })
    ).toBeFalsy()
  })

  it('finds crossing points between two paths', () => {
    expect(getEdgeIntersections(horizontal, vertical)).toStrictEqual([
      { x: 50, y: 0 },
    ])
    expect(
      getEdgeIntersections(horizontal, { path: 'M0,10 L100,10' })
    ).toStrictEqual([])
  })

  it('ignores edges that only share a handle anchor or touch with an end', () => {
    const [straight, bezier] = getEdgesGeometry(document)

    if (straight === undefined || bezier === undefined) {
      throw new Error('missing geometry')
    }

    // Both edges leave the out handle of node a.
    expect(straight.source).toStrictEqual(bezier.source)
    expect(getEdgeIntersections(straight, bezier)).toStrictEqual([])
    expect(
      getEdgeIntersections({ path: 'M0,0 L100,0' }, { path: 'M100,0 L200,50' })
    ).toStrictEqual([])
    expect(
      getEdgeIntersections(horizontal, { path: 'M50,0 L50,50' })
    ).toStrictEqual([])
  })

  it('reports no point for collinear overlap and one for a crossing at a vertex', () => {
    expect(
      getEdgeIntersections(horizontal, { path: 'M20,0 L80,0' })
    ).toStrictEqual([])
    expect(
      getEdgeIntersections(
        { path: 'M0,0 L50,50 L100,0' },
        { path: 'M50,0 L50,100' }
      )
    ).toStrictEqual([{ x: 50, y: 50 }])
  })
})
