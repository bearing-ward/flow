import { Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  defaultFlowAriaLabelConfig,
  FlowAriaLabelTextConfigSchema,
  resolveFlowAriaLabelConfig,
} from './flow-aria-label-config.ts'
import {
  coordinateExtentToPanExtent,
  CoordinateExtentSchema,
  FlowExtentInputSchema,
  panExtentToCoordinateExtent,
} from './flow-coordinate-extent.ts'
import {
  flowPanelPlacement,
  FlowPanelPositionSchema,
  flowPanelPositions,
} from './flow-panel-position.ts'
import { FlowSnapGridInputSchema } from './flow-snap-grid.schema.ts'

describe('CoordinateExtent', () => {
  it('decodes the React tuple and converts to and from the Flow record', () => {
    const extent = S.decodeUnknownSync(CoordinateExtentSchema)([
      [-10, 0],
      [100, 50],
    ])

    expect(coordinateExtentToPanExtent(extent)).toStrictEqual({
      minX: -10,
      minY: 0,
      maxX: 100,
      maxY: 50,
    })
    expect(
      panExtentToCoordinateExtent(coordinateExtentToPanExtent(extent))
    ).toStrictEqual(extent)
  })

  it('rejects inverted or non-finite extents', () => {
    for (const invalid of [
      [
        [10, 0],
        [0, 10],
      ],
      [
        [0, 0],
        [Infinity, 10],
      ],
      [[0, 0]],
    ]) {
      expect(
        Exit.isFailure(S.decodeUnknownExit(CoordinateExtentSchema)(invalid))
      ).toBeTruthy()
    }
  })

  it('accepts either extent form at the host option boundary', () => {
    const record = { minX: 0, minY: 0, maxX: 10, maxY: 20 }

    expect(S.decodeUnknownSync(FlowExtentInputSchema)(record)).toStrictEqual(
      record
    )
    expect(
      S.decodeUnknownSync(FlowExtentInputSchema)([
        [0, 0],
        [10, 20],
      ])
    ).toStrictEqual(record)
  })
})

describe('SnapGrid input', () => {
  it('accepts the Flow record or the React tuple with positive steps', () => {
    expect(
      S.decodeUnknownSync(FlowSnapGridInputSchema)([15, 20])
    ).toStrictEqual({ x: 15, y: 20 })
    expect(
      S.decodeUnknownSync(FlowSnapGridInputSchema)({ x: 5, y: 5 })
    ).toStrictEqual({ x: 5, y: 5 })

    for (const invalid of [[0, 10], [10], { x: -1, y: 1 }, [Number.NaN, 1]]) {
      expect(
        Exit.isFailure(S.decodeUnknownExit(FlowSnapGridInputSchema)(invalid))
      ).toBeTruthy()
    }
  })
})

describe('PanelPosition', () => {
  it('includes React center-left and center-right', () => {
    expect(flowPanelPositions).toHaveLength(8)
    expect(S.decodeUnknownSync(FlowPanelPositionSchema)('center-left')).toBe(
      'center-left'
    )
    expect(
      Exit.isFailure(S.decodeUnknownExit(FlowPanelPositionSchema)('center'))
    ).toBeTruthy()
  })

  it('places panels with React classes and the 15px margin', () => {
    expect(flowPanelPlacement('center-right')).toStrictEqual({
      vertical: 'center',
      horizontal: 'right',
      classNames: ['center', 'right'],
      style: { top: '50%', transform: 'translateY(-50%)', right: '15px' },
    })
    expect(flowPanelPlacement('bottom-center')).toStrictEqual({
      vertical: 'bottom',
      horizontal: 'center',
      classNames: ['bottom', 'center'],
      style: { bottom: '15px', left: '50%', transform: 'translateX(-50%)' },
    })
    expect(flowPanelPlacement('top-left').style).toStrictEqual({
      top: '15px',
      left: '15px',
    })
  })
})

describe('AriaLabelConfig', () => {
  it('keeps React keys and English defaults', () => {
    expect(defaultFlowAriaLabelConfig['minimap.ariaLabel']).toBe('Mini Map')
    expect(defaultFlowAriaLabelConfig['controls.ariaLabel']).toBe(
      'Control Panel'
    )
    expect(
      defaultFlowAriaLabelConfig['node.a11yDescription.ariaLiveMessage']({
        direction: 'up',
        x: 1,
        y: 2,
      })
    ).toBe('Moved selected node up. New position, x: 1, y: 2')
  })

  it('merges partial localized overrides over the defaults', () => {
    const config = resolveFlowAriaLabelConfig({
      'controls.zoomIn.ariaLabel': 'Vergrößern',
      'node.a11yDescription.ariaLiveMessage': ({ x, y }) => `${x}/${y}`,
    })

    expect(config['controls.zoomIn.ariaLabel']).toBe('Vergrößern')
    expect(config['controls.zoomOut.ariaLabel']).toBe('Zoom Out')
    expect(
      config['node.a11yDescription.ariaLiveMessage']({
        direction: 'left',
        x: 3,
        y: 4,
      })
    ).toBe('3/4')
    expect(resolveFlowAriaLabelConfig()).toStrictEqual(
      defaultFlowAriaLabelConfig
    )
  })

  it('decodes serializable text overrides', () => {
    expect(
      S.decodeUnknownSync(FlowAriaLabelTextConfigSchema)({
        'handle.ariaLabel': 'Anschluss',
      })
    ).toStrictEqual({ 'handle.ariaLabel': 'Anschluss' })
    expect(
      Exit.isFailure(
        S.decodeUnknownExit(FlowAriaLabelTextConfigSchema)({
          'handle.ariaLabel': 1,
        })
      )
    ).toBeTruthy()
  })
})
