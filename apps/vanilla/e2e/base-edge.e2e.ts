import type { FlowEdge } from '@flow/core'
import { expect, test } from '@playwright/test'

import {
  installEdgeGeometryReaders,
  readEdgeLabel,
  readEdgePath,
} from '../../shared-e2e/edge-label-geometry.ts'
import type { FlowBaseEdgeOptions } from '../src/base-edge.ts'
import type { FlowEdgeRenderContext } from '../src/mount-flow.ts'

declare global {
  interface Window {
    __flowVanillaBaseEdge?: {
      readonly setViewport: (viewport: {
        readonly x: number
        readonly y: number
        readonly zoom: number
      }) => void
      readonly setLabel: (label: string) => void
    }
  }
}

const background = 'rect.flow-edge-textbg'

const labeledLabel =
  '[data-testid="base-edge-labeled"] ~ .flow-edge-textwrapper'

const labeledPoint = { x: 300, y: 160 }

test('Vanilla createFlowBaseEdge and createFlowEdgeText render paths and centered measured labels', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'

    const { createFlowBaseEdge, createFlowEdgeText, mountFlow } = await import(
      modulePath
    )

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing host')
    }

    root.replaceChildren()
    root.style.width = '720px'
    root.style.height = '420px'

    const labelPoints = new Map([
      ['labeled', { labelX: 300, labelY: 160 }],
      ['plain', { labelX: 200, labelY: 300 }],
      ['text', { labelX: 500, labelY: 120 }],
    ])

    const dataOf = (edge: FlowEdge) => ({
      label: String(edge.data?.label),
      ...(labelPoints.get(edge.id) ?? { labelX: 0, labelY: 0 }),
    })

    const baseRenderer = (extra: Partial<FlowBaseEdgeOptions>) => ({
      render: (
        edge: FlowEdge,
        context: FlowEdgeRenderContext,
        visual: SVGGElement
      ) => {
        const options = (next: typeof edge, path: string) => ({
          path,
          label: dataOf(next).label,
          labelX: dataOf(next).labelX,
          labelY: dataOf(next).labelY,
          attributes: { 'data-testid': `base-edge-${next.id}` },
          ...extra,
        })

        const mount = createFlowBaseEdge(
          document,
          options(edge, context.pathData)
        )

        visual.append(mount.element)
        mount.update(options(edge, context.pathData))

        return {
          update: (next: typeof edge, nextContext: typeof context) =>
            mount.update(options(next, nextContext.pathData)),
          destroy: () => mount.dispose(),
        }
      },
    })

    const textRenderer = {
      render: (
        edge: FlowEdge,
        _context: FlowEdgeRenderContext,
        visual: SVGGElement
      ) => {
        const child = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'circle'
        )

        child.setAttribute('r', '3')
        child.dataset.testid = 'edge-text-child'

        const options = (next: typeof edge) => ({
          x: dataOf(next).labelX,
          y: dataOf(next).labelY,
          label: dataOf(next).label,
          labelBgPadding: [6, 3] as const,
          labelBgBorderRadius: 5,
          className: 'standalone-edge-text',
          children: [child],
        })

        const mount = createFlowEdgeText(document, options(edge))
        visual.append(mount.element)
        mount.update(options(edge))

        return {
          update: (next: typeof edge) => mount.update(options(next)),
          destroy: () => mount.dispose(),
        }
      },
    }

    const document_ = {
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 40, y: 60 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 460, y: 260 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'labeled',
          type: 'labeled',
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
          data: { label: 'Approve', labelX: 300, labelY: 160 },
        },
        {
          id: 'plain',
          type: 'plain',
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
          data: { label: 'Plain', labelX: 200, labelY: 300 },
        },
        {
          id: 'text',
          type: 'text',
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
          data: { label: 'Standalone', labelX: 500, labelY: 120 },
        },
      ],
    }

    const controller = mountFlow(root, document_, {
      documentMode: 'uncontrolled',
      edgeRenderers: {
        labeled: baseRenderer({
          className: 'fixture-base-edge',
          markerEnd: 'url(#fixture-marker)',
          attributes: {
            'data-testid': 'base-edge-labeled',
            stroke: '#0f766e',
            computedStroke: 'rgb(15, 118, 110)',
          },
        }),
        plain: baseRenderer({ labelShowBg: false, interactionWidth: 0 }),
        text: textRenderer,
      },
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    })

    window.__flowVanillaBaseEdge = {
      setViewport: (viewport) => controller.updateViewport(viewport),
      setLabel: (label) =>
        controller.update({
          ...document_,
          edges: document_.edges.map((edge) =>
            edge.id === 'labeled'
              ? { ...edge, data: { ...edge.data, label } }
              : edge
          ),
        }),
    }
  })
  await installEdgeGeometryReaders(page)

  await expect(page.getByTestId('base-edge-labeled')).toHaveCount(1)

  const labeled = await readEdgePath(page, '[data-testid="base-edge-labeled"]')
  expect(labeled.visibleD).toMatch(/^M/u)
  expect(labeled).toMatchObject({
    visibleClass: 'flow-edge-path fixture-base-edge',
    visibleFill: 'none',
    stroke: '#0f766e',
    markerEnd: 'url(#fixture-marker)',
    interactionClass: 'flow-edge-interaction',
    interactionD: labeled.visibleD,
    interactionWidth: '20',
    interactionOpacity: '0',
  })

  const plain = await readEdgePath(page, '[data-testid="base-edge-plain"]')
  // interactionWidth 0 omits the interaction path; the label wrapper follows.
  expect(plain.interactionClass).toBe('flow-edge-textwrapper')
  expect(plain).toMatchObject({
    stroke: '#64748b',
    computedStroke: 'rgb(100, 116, 139)',
    computedStrokeWidth: '2px',
  })

  await expect
    .poll(async () => {
      const { visibility } = await readEdgeLabel(
        page,
        labeledLabel,
        background,
        labeledPoint
      )

      return visibility
    })
    .toBe('visible')

  const initial = await readEdgeLabel(
    page,
    labeledLabel,
    background,
    labeledPoint
  )

  expect(initial.center.x).toBeCloseTo(initial.expected.x, 0)
  expect(initial.center.y).toBeCloseTo(initial.expected.y, 0)
  expect(initial.background).toEqual({
    width: initial.text.width + 4,
    height: initial.text.height + 8,
    rx: '2',
  })

  const plainLabel = await readEdgeLabel(
    page,
    '[data-testid="base-edge-plain"] ~ .flow-edge-textwrapper',
    background,
    { x: 200, y: 300 }
  )

  expect(plainLabel.background).toBeNull()
  expect(plainLabel.visibility).toBe('visible')
  // Without a background the glyph box is not exactly symmetric about the point.
  expect(
    Math.abs(plainLabel.center.x - plainLabel.expected.x)
  ).toBeLessThanOrEqual(1.5)
  expect(
    Math.abs(plainLabel.center.y - plainLabel.expected.y)
  ).toBeLessThanOrEqual(1.5)

  const standalone = await readEdgeLabel(
    page,
    '.standalone-edge-text',
    background,
    { x: 500, y: 120 }
  )

  expect(standalone.center.x).toBeCloseTo(standalone.expected.x, 0)
  expect(standalone.center.y).toBeCloseTo(standalone.expected.y, 0)
  expect(standalone.background).toEqual({
    width: standalone.text.width + 12,
    height: standalone.text.height + 6,
    rx: '5',
  })
  await expect(page.getByTestId('edge-text-child')).toHaveCount(1)

  await page.evaluate(() =>
    window.__flowVanillaBaseEdge?.setLabel('Approve with a longer label')
  )
  await expect
    .poll(async () => {
      const { text } = await readEdgeLabel(
        page,
        labeledLabel,
        background,
        labeledPoint
      )

      return text.width
    })
    .toBeGreaterThan(initial.text.width)

  const relabeled = await readEdgeLabel(
    page,
    labeledLabel,
    background,
    labeledPoint
  )

  expect(relabeled.center.x).toBeCloseTo(relabeled.expected.x, 0)
  expect(relabeled.background?.width).toBeCloseTo(relabeled.text.width + 4, 3)

  await page.evaluate(() =>
    window.__flowVanillaBaseEdge?.setViewport({ x: 20, y: 10, zoom: 1.25 })
  )
  await expect
    .poll(async () => {
      const { center, expected } = await readEdgeLabel(
        page,
        labeledLabel,
        background,
        labeledPoint
      )

      return Math.round(Math.abs(center.x - expected.x))
    })
    .toBeLessThanOrEqual(1)

  const zoomed = await readEdgeLabel(
    page,
    labeledLabel,
    background,
    labeledPoint
  )

  expect(Math.abs(zoomed.center.y - zoomed.expected.y)).toBeLessThanOrEqual(1)
})
