import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const boxOf = async (locator: Locator): Promise<Box> => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Missing element box')
  }

  return box
}

const node = (page: Page, id: string) =>
  page.locator(`.flow-vue-node[data-node-id="${id}"]`)

/** Rendered width of an element, for polling. */
const widthOf = async (locator: Locator): Promise<number> => {
  const box = await boxOf(locator)

  return box.width
}

/** The scale of the rendered viewport transform; NaN while the page reloads. */
const viewportZoom = async (page: Page): Promise<number> => {
  try {
    return await page
      .locator('.flow-vue-viewport')
      .evaluate(
        (element) => new DOMMatrix(getComputedStyle(element).transform).a
      )
  } catch {
    return Number.NaN
  }
}

test('feature overview renders the built-in UI around custom nodes and edges', async ({
  page,
}) => {
  await page.goto('/ui-recipes/feature-overview/')

  const status = page.getByTestId('recipe-status')
  await expect(status).toHaveAttribute('data-nodes', '5')
  await expect
    .poll(async () => {
      const zoom = await viewportZoom(page)

      return Number.isFinite(zoom) && zoom !== 1
    })
    .toBe(true)

  await expect(page.locator('svg.flow-vue-minimap')).toBeVisible()
  await expect(page.locator('.flow-vue-minimap-node')).toHaveCount(5)
  await expect(
    page.locator('svg.flow-vue-background pattern circle')
  ).toHaveCount(1)
  await expect(page.getByTestId('overview-panel')).toContainText(
    'Feature overview'
  )
  await expect(page.getByTestId('custom-node')).toContainText(
    'Custom node markup'
  )
  await expect(page.getByTestId('custom-edge')).toHaveCount(1)
  await expect(
    page.locator('g[data-edge-id="e-input"] path[marker-end]')
  ).toHaveCount(1)
})

test('controls zoom, a clicked node shows its toolbar and resizes', async ({
  page,
}) => {
  await page.goto('/ui-recipes/feature-overview/')
  await expect
    .poll(async () => {
      const zoom = await viewportZoom(page)

      return Number.isFinite(zoom) && zoom !== 1
    })
    .toBe(true)

  const fitted = await viewportZoom(page)
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect.poll(() => viewportZoom(page)).toBeGreaterThan(fitted)

  const toolbars = page.getByTestId('overview-node-toolbar')
  await expect(toolbars).toHaveCount(0)

  await node(page, 'default').click()
  await expect(toolbars).toHaveCount(1)
  await expect(toolbars).toHaveAttribute('data-toolbar-node', 'default')

  const before = await boxOf(node(page, 'default'))

  const corner = await boxOf(
    node(page, 'default').locator('.flow-vue-resize-bottom-right')
  )

  const from = {
    x: corner.x + corner.width / 2,
    y: corner.y + corner.height / 2,
  }

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(from.x + 40, from.y + 20, { steps: 8 })
  await page.mouse.up()

  await expect
    .poll(async () =>
      Math.abs((await widthOf(node(page, 'default'))) - before.width - 40)
    )
    .toBeLessThanOrEqual(2)
})
