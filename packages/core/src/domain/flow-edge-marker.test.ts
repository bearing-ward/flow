import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  collectFlowEdgeMarkers,
  flowEdgeMarkerDefaults,
  flowEdgeMarkerId,
  flowEdgeMarkerType,
  resolveFlowEdgeMarker,
} from './flow-edge-marker.ts'
import { FlowEdgeSchema } from './flow.schema.ts'
import type { FlowEdgeMarkerConfiguration } from './flow.schema.ts'

const edge = (input: Partial<typeof FlowEdgeSchema.Encoded>) =>
  S.decodeUnknownSync(FlowEdgeSchema)({
    id: 'e',
    source: 'a',
    target: 'b',
    ...input,
  })

describe('edge marker configuration', () => {
  it('accepts literal kinds and React EdgeMarker objects on the edge', () => {
    const decoded = edge({
      markerStart: 'arrow',
      markerEnd: {
        type: 'arrowclosed',
        color: '#ff0072',
        width: 20,
        height: 20,
        strokeWidth: 2,
        markerUnits: 'userSpaceOnUse',
        orient: 'auto',
      },
    })

    expect(flowEdgeMarkerType(decoded.markerStart)).toBe('arrow')
    expect(flowEdgeMarkerType(decoded.markerEnd)).toBe('arrowclosed')
    expect(flowEdgeMarkerType()).toBeUndefined()
    expect(() =>
      S.decodeUnknownSync(FlowEdgeSchema)({
        id: 'e',
        source: 'a',
        target: 'b',
        markerEnd: { type: 'diamond' },
      })
    ).toThrow(/Expected/u)
  })

  it('resolves React Marker defaults and lets a configured color win', () => {
    expect(
      resolveFlowEdgeMarker('arrow', { defaultColor: '#b1b1b7' })
    ).toStrictEqual({
      id: flowEdgeMarkerId({ type: 'arrow', color: '#b1b1b7' }),
      type: 'arrow',
      color: '#b1b1b7',
      ...flowEdgeMarkerDefaults,
    })

    const configured = resolveFlowEdgeMarker(
      { type: 'arrowclosed', color: 'red', width: 30 },
      { defaultColor: '#b1b1b7', scope: 'canvas 1' }
    )

    expect(configured).toMatchObject({
      type: 'arrowclosed',
      color: 'red',
      width: 30,
      height: 12.5,
      orient: 'auto-start-reverse',
    })
    expect(configured?.id).toMatch(/^flow-marker-canvas_20_1__[\w-]+$/u)
    expect(
      resolveFlowEdgeMarker({ type: 'arrow', color: null }, {})?.color
    ).toBeUndefined()
  })

  it('builds stable sorted DOM-safe ids like React getMarkerId', () => {
    expect(flowEdgeMarkerId({ width: 2, type: 'arrow' })).toBe(
      flowEdgeMarkerId({ type: 'arrow', width: 2 })
    )
    expect(flowEdgeMarkerId('arrow', 'x')).toBe('flow-marker-x__arrow')
    expect(flowEdgeMarkerId({ type: 'arrow', color: '#fff' })).toMatch(
      /^[\w-]+$/u
    )
  })

  it('collects unique markers with default start and end markers', () => {
    const expectedMarkers: readonly FlowEdgeMarkerConfiguration[] = [
      { type: 'arrow', color: 'red' },
      { type: 'arrowclosed', color: '#b1b1b7' },
    ]

    const markers = collectFlowEdgeMarkers(
      [
        edge({ markerEnd: { type: 'arrow', color: 'red' } }),
        edge({ markerEnd: { type: 'arrow', color: 'red' } }),
        edge({}),
      ],
      { defaultColor: '#b1b1b7', defaultMarkerEnd: 'arrowclosed' }
    )

    expect(markers.map(({ type, color }) => ({ type, color }))).toStrictEqual(
      expectedMarkers.toSorted((left, right) =>
        flowEdgeMarkerId(left).localeCompare(flowEdgeMarkerId(right))
      )
    )
  })
})
