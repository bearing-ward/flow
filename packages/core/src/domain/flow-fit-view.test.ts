import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  FitViewNodeDimensionsSchema,
  FitViewPaddingSchema,
  fitViewportToNodes,
  FlowFitViewOptionsSchema,
  resolveFitViewNodeIds,
} from './flow-fit-view.ts'
import type { MeasuredNode } from './flow-runtime.schema.ts'
import { NodeIdSchema } from './flow-values.ts'
import type { FlowNode } from './flow.schema.ts'

const firstId = S.decodeSync(NodeIdSchema)('first')

const secondId = S.decodeSync(NodeIdSchema)('second')

const currentViewport = { x: -12, y: 23, zoom: 0.75 }

const limits = { minZoom: 0.25, maxZoom: 4 }

const firstNode: FlowNode = {
  id: firstId,
  label: 'First',
  position: { x: 0, y: 0 },
}

const secondNode: FlowNode = {
  id: secondId,
  label: 'Second',
  position: { x: 300, y: 200 },
}

const nodes = [firstNode, secondNode]

const document = { nodes, edges: [] }

const measurements = new Map([
  [firstId, { nodeId: firstId, width: 100, height: 100 }],
  [secondId, { nodeId: secondId, width: 100, height: 100 }],
])

describe('fit viewport to nodes', () => {
  it('fits measured bounds with fractional padding and centers the result', () => {
    expect(
      fitViewportToNodes({
        document,
        measurements,
        currentViewport,
        paneWidth: 1000,
        paneHeight: 600,
        limits,
      })
    ).toStrictEqual({ x: 180, y: 60, zoom: 1.6 })
  })

  it('clamps zoom while keeping the measured bounds centered', () => {
    expect(
      fitViewportToNodes({
        document: { nodes: [firstNode], edges: [] },
        measurements,
        currentViewport,
        paneWidth: 1000,
        paneHeight: 600,
        limits: { minZoom: 0.5, maxZoom: 2 },
      })
    ).toStrictEqual({ x: 400, y: 200, zoom: 2 })
  })

  it('ignores hidden nodes and nodes without measured dimensions', () => {
    const visibleMeasurements = new Map<typeof firstId, MeasuredNode>([
      [firstId, { nodeId: firstId, width: 100, height: 100 }],
    ])

    expect(
      fitViewportToNodes({
        document,
        nodeIds: new Set([firstId]),
        measurements: visibleMeasurements,
        currentViewport,
        paneWidth: 1000,
        paneHeight: 600,
        limits: { minZoom: 0.5, maxZoom: 2 },
      })
    ).toStrictEqual({ x: 400, y: 200, zoom: 2 })

    expect(
      fitViewportToNodes({
        document: {
          nodes: [{ ...secondNode, hidden: true }, firstNode],
          edges: [],
        },
        measurements,
        currentViewport,
        paneWidth: 1000,
        paneHeight: 600,
        limits: { minZoom: 0.5, maxZoom: 2 },
      })
    ).toStrictEqual({ x: 400, y: 200, zoom: 2 })
  })

  it('uses fallback dimensions for unmeasured nodes while retaining measured sizes', () => {
    const visibleMeasurements = new Map<typeof firstId, MeasuredNode>([
      [firstId, { nodeId: firstId, width: 100, height: 100 }],
    ])

    expect(
      fitViewportToNodes({
        document,
        measurements: visibleMeasurements,
        fallbackDimensions: { width: 200, height: 50 },
        currentViewport,
        paneWidth: 1000,
        paneHeight: 600,
        limits,
      })
    ).toStrictEqual({ x: 100, y: 100, zoom: 1.6 })
  })

  it('uses fallback dimensions for zero-sized measurements and excludes hidden nodes', () => {
    const zeroMeasurements = new Map<typeof firstId, MeasuredNode>([
      [firstId, { nodeId: firstId, width: 0, height: 0 }],
    ])

    expect(
      fitViewportToNodes({
        document: {
          nodes: [firstNode, { ...secondNode, hidden: true }],
          edges: [],
        },
        measurements: zeroMeasurements,
        fallbackDimensions: { width: 200, height: 50 },
        currentViewport,
        paneWidth: 1000,
        paneHeight: 600,
        limits: { minZoom: 0.5, maxZoom: 2 },
      })
    ).toStrictEqual({ x: 300, y: 250, zoom: 2 })
  })

  it('keeps the current viewport when there is nothing measurable or no pane', () => {
    for (const input of [
      { document: { nodes: [], edges: [] }, paneWidth: 1000, paneHeight: 600 },
      { document, paneWidth: 0, paneHeight: 600 },
      { document, paneWidth: 1000, paneHeight: 0 },
    ]) {
      expect(
        fitViewportToNodes({
          ...input,
          measurements,
          currentViewport,
          limits,
        })
      ).toBe(currentViewport)
    }
  })

  it('accepts only finite padding smaller than half the pane', () => {
    for (const invalid of [-0.1, 0.5, Infinity, Number.NaN]) {
      expect(() => S.decodeSync(FitViewPaddingSchema)(invalid)).toThrow(
        'Expected'
      )
    }
  })

  it('requires finite positive fallback dimensions', () => {
    for (const invalid of [
      { width: 0, height: 50 },
      { width: 200, height: -1 },
      { width: Infinity, height: 50 },
      { width: 200, height: Number.NaN },
    ]) {
      expect(() => S.decodeSync(FitViewNodeDimensionsSchema)(invalid)).toThrow(
        'Expected'
      )
    }
  })
})

describe('FitViewOptions', () => {
  it('decodes React fit options with node lists and Flow shorthands', () => {
    expect(
      S.decodeUnknownSync(FlowFitViewOptionsSchema)({
        padding: 0.2,
        includeHiddenNodes: true,
        minZoom: 0.5,
        maxZoom: 1.5,
        duration: 200,
        nodes: [{ id: 'first' }],
      })
    ).toMatchObject({ nodes: [{ id: 'first' }], minZoom: 0.5 })
    expect(
      S.decodeUnknownSync(FlowFitViewOptionsSchema)({ nodes: 'selected' })
    ).toStrictEqual({ nodes: 'selected' })
    expect(() =>
      S.decodeUnknownSync(FlowFitViewOptionsSchema)({ minZoom: 0 })
    ).toThrow(/Expected/u)
    expect(() =>
      S.decodeUnknownSync(FlowFitViewOptionsSchema)({ nodes: ['first'] })
    ).toThrow(/Expected/u)
  })

  it('resolves the fitted node ids', () => {
    const selected = {
      nodes: [firstNode, { ...secondNode, selected: true }],
    }

    expect(resolveFitViewNodeIds(selected)).toBeUndefined()
    expect(resolveFitViewNodeIds(selected, 'all')).toBeUndefined()
    expect([
      ...(resolveFitViewNodeIds(selected, 'selected') ?? []),
    ]).toStrictEqual([secondId])
    expect([
      ...(resolveFitViewNodeIds(selected, [{ id: firstId }]) ?? []),
    ]).toStrictEqual([firstId])
  })

  it('applies per-call minZoom and maxZoom over the canvas limits', () => {
    const fit = (options: { minZoom?: number; maxZoom?: number }) =>
      fitViewportToNodes({
        document: { nodes: [firstNode], edges: [] },
        measurements,
        currentViewport,
        paneWidth: 1000,
        paneHeight: 600,
        limits,
        ...options,
      }).zoom

    expect(fit({})).toBe(4)
    expect(fit({ maxZoom: 1.5 })).toBe(1.5)
    expect(
      fitViewportToNodes({
        document,
        measurements,
        currentViewport,
        paneWidth: 1000,
        paneHeight: 600,
        limits,
        minZoom: 2,
      }).zoom
    ).toBe(2)
  })

  it('includes hidden nodes only when includeHiddenNodes is set', () => {
    const hiddenDocument = {
      nodes: [firstNode, { ...secondNode, hidden: true }],
      edges: [],
    }

    const input = {
      document: hiddenDocument,
      measurements,
      currentViewport,
      paneWidth: 1000,
      paneHeight: 600,
      limits,
    }

    expect(fitViewportToNodes(input)).toStrictEqual(
      fitViewportToNodes({
        ...input,
        document: { nodes: [firstNode], edges: [] },
      })
    )
    expect(
      fitViewportToNodes({ ...input, includeHiddenNodes: true })
    ).toStrictEqual(fitViewportToNodes({ ...input, document }))
  })
})
