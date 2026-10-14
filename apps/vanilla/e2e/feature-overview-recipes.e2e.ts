import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const open = async (page: Page) => {
  await page.goto('/ui-recipes/feature-overview/')
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-fitted',
    'true'
  )
}

const zoomOf = async (page: Page) => {
  const zoom = await page.getByTestId('flow-viewport').getAttribute('data-zoom')

  return Number(zoom)
}

const widthOf = async (locator: Locator) => {
  const box = await locator.boundingBox()

  return box?.width ?? 0
}

test('feature-overview: minimap, background, panel, custom node and edge render', async ({
  page,
}) => {
  await open(page)
  const nodes = await page.locator('.flow-node').count()
  expect(nodes).toBe(5)
  await expect(page.locator('svg.flow-minimap .flow-minimap-node')).toHaveCount(
    nodes
  )
  await expect(page.getByTestId('flow-canvas')).toHaveAttribute(
    'data-background',
    'dots'
  )
  await expect(page.getByTestId('flow-canvas')).toHaveCSS(
    'background-image',
    /radial-gradient/u
  )
  await expect(page.getByTestId('overview-panel')).toContainText(
    'Feature overview'
  )
  await expect(page.getByTestId('custom-node')).toContainText('Color node')
  await expect(page.getByTestId('custom-edge')).toHaveAttribute(
    'marker-end',
    /^url\(#/u
  )
  await expect(
    page.locator('.flow-edge-group[data-edge-id="e-animated"] .flow-edge-path')
  ).toHaveCSS('animation-name', 'overview-dash')
})

test('feature-overview: controls zoom, node toolbar and resizing', async ({
  page,
}) => {
  await open(page)
  const before = await zoomOf(page)
  await page.getByRole('button', { name: 'Zoom In' }).click()
  await expect.poll(() => zoomOf(page)).toBeGreaterThan(before)

  const toolbar = page.locator(
    '[data-testid="overview-node-toolbar"][data-toolbar-node="resizable"]'
  )

  const node = page.locator('.flow-node[data-node-id="resizable"]')
  await expect(toolbar).toBeHidden()
  await node.click()
  await expect(toolbar).toBeVisible()
  await expect(toolbar).toHaveText('Toolbar: Resizable node')

  const width = await widthOf(node)

  const corner = await node
    .locator('.flow-node-resize-handle[data-direction="bottom-right"]')
    .boundingBox()

  if (corner === null) {
    throw new Error('Missing resize control')
  }

  const from = {
    x: corner.x + corner.width / 2,
    y: corner.y + corner.height / 2,
  }

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y)
  await page.mouse.move(from.x + 40, from.y + 20, { steps: 8 })
  await page.mouse.up()

  await expect
    .poll(async () => (await widthOf(node)) - width)
    .toBeGreaterThan(38)
  expect((await widthOf(node)) - width).toBeLessThan(42)
})
