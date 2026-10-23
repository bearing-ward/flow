import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const open = async (page: Page) => {
  await page.goto('/ui-recipes/feature-overview/')
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(5)
}

const zoomOf = (page: Page) =>
  page
    .locator('.flow-foldkit-viewport')
    .evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)

test('Feature Overview renders custom elements and the canvas UI', async ({
  page,
}) => {
  await open(page)

  await expect(page.locator('.flow-foldkit-minimap')).toBeVisible()
  await expect(page.locator('.flow-foldkit-minimap-node')).toHaveCount(5)
  await expect(
    page.locator('.flow-foldkit-background-overlay pattern')
  ).toHaveCount(1)
  await expect(page.getByTestId('overview-panel')).toContainText(
    'Feature Overview'
  )
  await expect(page.getByTestId('custom-node')).toHaveText('Annotation')
  await expect(page.getByTestId('custom-edge')).toHaveText('custom edge')
  await expect(
    page.locator('[data-marker-end-kind="arrowclosed"]')
  ).toHaveCount(2)
  await expect(page.getByTestId('animated-edge')).toHaveCSS(
    'animation-name',
    'overview-dash'
  )
})

test('Feature Overview shows the toolbar of the selected node, resizes it and zooms', async ({
  page,
}) => {
  await open(page)
  const status = page.getByTestId('recipe-status')

  // fitView ran once the nodes were measured.
  await expect(status).toHaveAttribute('data-fitted', 'true')

  const toolbar = page.locator(
    '[data-testid="overview-node-toolbar"][data-for="resizable"]'
  )

  await expect(toolbar).toBeHidden()
  const resizable = page.locator('[data-node-id="resizable"]')
  await resizable.click()
  await expect(status).toHaveAttribute('data-selected', 'resizable')
  await expect(toolbar).toBeVisible()

  const initial = await resizable.boundingBox()
  const width = initial?.width ?? 0

  const handle = await resizable
    .locator('.flow-foldkit-resize-bottom-right')
    .boundingBox()

  if (handle === null) {
    throw new Error('Missing resize control')
  }

  const start = {
    x: handle.x + handle.width / 2,
    y: handle.y + handle.height / 2,
  }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 3, start.y)
  await page.mouse.move(start.x + 40, start.y, { steps: 8 })
  await page.mouse.up()

  await expect
    .poll(async () => {
      const resized = await resizable.boundingBox()

      return resized?.width ?? 0
    })
    .toBeCloseTo(width + 40, -0.5)

  // Pinned xyflow 0a1f9575, packages/react/src/hooks/useViewportHelper.ts:24-39.
  // Zoom must scale the live viewport after fitting, rather than a cached value.
  const before = await zoomOf(page)
  await page.getByRole('button', { name: 'Zoom In' }).click()
  await expect.poll(() => zoomOf(page)).toBeCloseTo(before * 1.2, 4)
})
