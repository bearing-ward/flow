import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  MeasuredHandleSchema,
  bezierEdgePath,
  edgeAttachmentPosition,
  edgeLabelPosition,
  resolveEdgeHandles,
  straightEdgePath,
} from './flow-edge.schema.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    edges: [{ id: 'edge-1', source: 'first', target: 'second' }],
    nodes: [
      {
        id: 'first',
        label: 'First',
        position: { x: 100, y: 120 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'second',
        label: 'Second',
        position: { x: 350, y: 120 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
  })
)

describe('straight edge geometry', () => {
  it('uses explicit noncanonical declarations and their measured physical sides', () => {
    const accepted = Effect.runSync(
      decodeFlowDocument({
        nodes: document.nodes.map((node) => ({
          ...node,
          handles: [
            {
              id: 'physical',
              kind: node.id === 'first' ? 'target' : 'source',
              side: node.id === 'first' ? 'left' : 'bottom',
            },
          ],
        })),
        edges: [
          {
            id: 'edge',
            source: 'first',
            sourceHandle: 'physical',
            target: 'second',
            targetHandle: 'physical',
          },
        ],
      })
    )

    const [edge] = accepted.edges

    if (edge === undefined) {
      throw new Error('Expected explicit edge')
    }

    const resolved = resolveEdgeHandles(accepted, edge)

    if (resolved === undefined) {
      throw new Error('Expected physical declarations')
    }

    const source = S.decodeUnknownSync(MeasuredHandleSchema)({
      nodeId: 'first',
      handleId: 'physical',
      offset: { x: 10, y: 20 },
      width: 12,
      height: 12,
    })

    const target = S.decodeUnknownSync(MeasuredHandleSchema)({
      nodeId: 'second',
      handleId: 'physical',
      offset: { x: 30, y: 40 },
      width: 12,
      height: 12,
    })

    expect(
      edgeAttachmentPosition(
        resolved.sourceNode.position,
        resolved.sourceHandle,
        source
      )
    ).toStrictEqual({ x: 104, y: 140 })
    expect(
      edgeAttachmentPosition(
        resolved.targetNode.position,
        resolved.targetHandle,
        target
      )
    ).toStrictEqual({ x: 380, y: 166 })
    expect(resolved.sourceHandle.kind).toBe('target')
    expect(resolved.targetHandle.kind).toBe('source')
  })

  it('selects the first declared handles when an edge omits handle IDs', () => {
    const [edge] = document.edges

    if (edge === undefined) {
      throw new Error('Missing test edge')
    }

    const resolved = resolveEdgeHandles(document, edge)

    expect(resolved?.sourceHandle.id).toBe('out')
    expect(resolved?.targetHandle.id).toBe('in')
  })

  it('attaches a straight path to measured handle sides', () => {
    const [edge] = document.edges

    if (edge === undefined) {
      throw new Error('Missing test edge')
    }

    const resolved = resolveEdgeHandles(document, edge)

    if (resolved === undefined) {
      throw new Error('Missing test handles')
    }

    const sourceMeasured = S.decodeSync(MeasuredHandleSchema)({
      nodeId: 'first',
      handleId: 'out',
      offset: { x: 149, y: 22 },
      width: 12,
      height: 12,
    })

    const targetMeasured = S.decodeSync(MeasuredHandleSchema)({
      nodeId: 'second',
      handleId: 'in',
      offset: { x: -1, y: 22 },
      width: 12,
      height: 12,
    })

    const source = edgeAttachmentPosition(
      resolved.sourceNode.position,
      resolved.sourceHandle,
      sourceMeasured
    )

    const target = edgeAttachmentPosition(
      resolved.targetNode.position,
      resolved.targetHandle,
      targetMeasured
    )

    expect(source).toStrictEqual({ x: 255, y: 142 })
    expect(target).toStrictEqual({ x: 343, y: 142 })
    expect(straightEdgePath(source, target)).toBe('M 255,142L 343,142')
  })
})

describe('Bezier edge geometry', () => {
  it('accepts the explicit Bezier path choice at document decode', () => {
    const decoded = Effect.runSync(
      decodeFlowDocument({
        ...document,
        edges: [
          {
            id: 'edge-1',
            source: 'first',
            target: 'second',
            path: 'bezier',
          },
        ],
      })
    )

    expect(decoded.edges[0]?.path).toBe('bezier')
  })

  it('places forward horizontal controls halfway between endpoints', () => {
    expect(
      bezierEdgePath({ x: 0, y: 0 }, { x: 100, y: 0 }, 'right', 'left')
    ).toBe('M0,0 C50,0 50,0 100,0')
  })

  it('bends controls outward for backward horizontal endpoints', () => {
    expect(
      bezierEdgePath({ x: 100, y: 0 }, { x: 0, y: 0 }, 'right', 'left')
    ).toBe('M100,0 C162.5,0 -62.5,0 0,0')
  })

  it('uses vertical and mixed attachment sides', () => {
    expect(
      bezierEdgePath({ x: 0, y: 100 }, { x: 0, y: 0 }, 'top', 'bottom')
    ).toBe('M0,100 C0,50 0,50 0,0')

    expect(
      bezierEdgePath({ x: 0, y: 0 }, { x: 100, y: 100 }, 'right', 'top')
    ).toBe('M0,0 C50,0 100,50 100,100')
  })
})

describe('edge label geometry', () => {
  it('centers straight labels between attachments', () => {
    expect(
      edgeLabelPosition(
        { x: 0, y: 0 },
        { x: 100, y: 40 },
        'straight',
        'right',
        'left'
      )
    ).toStrictEqual({ x: 50, y: 20 })
  })

  it('places Bezier labels at the cubic half-parameter point', () => {
    expect(
      edgeLabelPosition(
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        'bezier',
        'right',
        'top'
      )
    ).toStrictEqual({ x: 68.75, y: 31.25 })
  })
})

describe('edge marker and stroke contracts', () => {
  it('decodes supported arrows and positive stroke width', () => {
    const decoded = Effect.runSync(
      decodeFlowDocument({
        ...document,
        edges: [
          {
            id: 'edge-1',
            source: 'first',
            target: 'second',
            markerStart: 'arrowclosed',
            markerEnd: 'arrow',
            stroke: '#ff0000',
            strokeWidth: 3,
          },
        ],
      })
    )

    expect(decoded.edges[0]).toMatchObject({
      markerStart: 'arrowclosed',
      markerEnd: 'arrow',
      stroke: '#ff0000',
      strokeWidth: 3,
    })
  })

  it('retains an exact empty accessibility label through full document decoding', () => {
    const decoded = Effect.runSync(
      decodeFlowDocument({
        ...document,
        edges: [
          {
            id: 'edge-1',
            source: 'first',
            target: 'second',
            ariaLabel: '',
          },
        ],
      })
    )

    expect({
      label: decoded.edges[0]?.ariaLabel,
      ownLabel: Object.hasOwn(decoded.edges[0] ?? {}, 'ariaLabel'),
    }).toStrictEqual({ label: '', ownLabel: true })
  })

  it('rejects unsupported arrows, reconnection options, colors, and widths', () => {
    for (const invalid of [
      { markerStart: 'triangle' },
      { stroke: 'red' },
      { strokeWidth: 0 },
      { interactionWidth: 0 },
      { reconnectable: 'both' },
      { ariaLabel: null },
      { ariaLabel: false },
    ]) {
      expect(() =>
        Effect.runSync(
          decodeFlowDocument({
            ...document,
            edges: [
              {
                id: 'edge-1',
                source: 'first',
                target: 'second',
                ...invalid,
              },
            ],
          })
        )
      ).toThrow(/./u)
    }
  })
})

describe('original 065 handle identity boundary, unit path', () => {
  it('rejects null, empty and missing identities rather than inventing DOM identities', () => {
    for (const handleId of [null, '', undefined]) {
      expect(() =>
        S.decodeUnknownSync(MeasuredHandleSchema)({
          nodeId: 'node',
          handleId,
          offset: { x: 0, y: 0 },
          width: 0,
          height: 0,
        })
      ).toThrow('Expected')
    }
  })
})
