import { expect, test } from '@playwright/test'

import {
  installEdgeGeometryReaders,
  readEdgeLabel,
  readEdgePath,
} from '../../shared-e2e/edge-label-geometry.ts'
import type { FoldkitBaseEdgeFixture } from './base-edge-fixture.ts'

declare global {
  interface Window {
    __flowFoldkitBaseEdge?: FoldkitBaseEdgeFixture
  }
}

const background = 'rect.flow-foldkit-edge-textbg'

const labeledLabel =
  '[data-testid="base-edge-labeled"] ~ .flow-foldkit-edge-textwrapper'

const labeledPoint = { x: 300, y: 160 }

test('Foldkit flowBaseEdge and flowEdgeText render paths and centered measured labels', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const modulePath = '/e2e/base-edge-fixture.ts'
    const { mountFoldkitBaseEdgeFixture } = await import(modulePath)
    const host = document.querySelector<HTMLElement>('#app')

    if (host === null) {
      throw new Error('Missing Foldkit fixture host')
    }

    host.innerHTML = '<div id="base-edge-fixture"></div>'

    const container = document.querySelector<HTMLElement>('#base-edge-fixture')

    if (container === null) {
      throw new Error('Missing Foldkit base edge fixture container')
    }

    window.__flowFoldkitBaseEdge = mountFoldkitBaseEdgeFixture(container)
  })
  await installEdgeGeometryReaders(page)

  await expect(page.getByTestId('base-edge-labeled')).toHaveCount(1)

  const labeled = await readEdgePath(page, '[data-testid="base-edge-labeled"]')
  expect(labeled.visibleD).toMatch(/^M/u)
  expect(labeled).toMatchObject({
    visibleClass: 'flow-foldkit-base-edge-path fixture-base-edge',
    visibleFill: 'none',
    stroke: '#0f766e',
    computedStroke: 'rgb(15, 118, 110)',
    markerEnd: 'url(#fixture-marker)',
    interactionClass: 'flow-foldkit-edge-interaction',
    interactionD: labeled.visibleD,
    interactionWidth: '20',
    interactionOpacity: '0',
  })

  const plain = await readEdgePath(page, '[data-testid="base-edge-plain"]')
  // interactionWidth 0 omits the interaction path; the label wrapper follows.
  expect(plain.interactionClass).toBe('flow-foldkit-edge-textwrapper')
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
    '[data-testid="base-edge-plain"] ~ .flow-foldkit-edge-textwrapper',
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
    window.__flowFoldkitBaseEdge?.setLabel('Approve with a longer label')
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
    window.__flowFoldkitBaseEdge?.setViewport({ x: 20, y: 10, zoom: 1.25 })
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
