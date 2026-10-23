import { defaultInteractionOptions } from '@flow/foldkit'
import { expect, test } from '@playwright/test'

import type { ConformanceFixture } from '../../../packages/conformance/src/index.ts'

test('Foldkit playground exposes viewport controls over the rendered canvas', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Viewport' })).toBeVisible()
  await page.getByRole('button', { name: 'Fit selected' }).click()
  await expect(page.locator('[data-viewport-result]')).toContainText('accepted')
  await expect(page.locator('.flow-foldkit-viewport')).toHaveCSS(
    'transform',
    /matrix\(/u
  )
  await page.getByRole('button', { name: 'Show coordinate conversion' }).click()
  await expect(page.locator('[data-viewport-result]')).toContainText('screen')
})

// Pinned xyflow 0a1f9575, packages/system/src/xypanzoom/XYPanZoom.ts:103,220-225.
// Its pinned d3-zoom 3.0.0 handler uses factors 2 and 0.5 with Shift:
// https://github.com/d3/d3-zoom/blob/v3.0.0/src/zoom.js#L303-L313
// Compare terminal pointer-anchored targets, not d3's transition frames.
test('Foldkit native double-click doubles zoom and Shift halves it about the pointer', async ({
  page,
}) => {
  const scenario = {
    version: 1,
    id: 'native-double-click',
    description: 'Native pointer-anchored zoom endpoints',
    documentMode: 'uncontrolled',
    viewportMode: 'uncontrolled',
    document: { nodes: [], edges: [] },
    actions: [],
    expected: { nodeIds: [], edgeIds: [], positions: [], changeKinds: [] },
  } satisfies ConformanceFixture

  await page.goto('/test.html')
  await page.evaluate(
    async ({ fixture, options }) => {
      const harnessPath = '/e2e/test-harness.ts'
      await import(harnessPath)
      await window.__flowFoldkitTest?.mount(fixture, 'full', options)
    },
    {
      fixture: scenario,
      options: { ...defaultInteractionOptions, zoomOnDoubleClick: true },
    }
  )

  const viewport = page.locator('.flow-foldkit-viewport')

  const read = () =>
    viewport.evaluate((element) => {
      const matrix = new DOMMatrix(getComputedStyle(element).transform)

      return { x: matrix.e, y: matrix.f, zoom: matrix.a }
    })

  const pane = await page.locator('.flow-foldkit-canvas').boundingBox()

  if (pane === null) {
    throw new Error('Missing native zoom pane')
  }

  await page.evaluate(() =>
    window.__flowFoldkitTest?.replaceViewport({ x: 0, y: 0, zoom: 0.5 })
  )
  await expect.poll(read).toEqual({ x: 0, y: 0, zoom: 0.5 })
  await page.mouse.dblclick(pane.x + 250, pane.y + 200)
  await expect.poll(read).toEqual({ x: -250, y: -200, zoom: 1 })

  await page.keyboard.down('Shift')

  try {
    await page.mouse.dblclick(pane.x + 250, pane.y + 200)
    await expect.poll(read).toEqual({ x: 0, y: 0, zoom: 0.5 })
  } finally {
    await page.keyboard.up('Shift')
  }
})
