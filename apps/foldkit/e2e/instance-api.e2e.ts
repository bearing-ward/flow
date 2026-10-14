import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const status = (page: Page) => page.getByTestId('recipe-status')

const open = async (page: Page) => {
  await page.goto('/ui-recipes/instance-api/')
  await expect(status(page)).toHaveAttribute('data-ready', 'true')
  await expect(page.locator('[data-node-id="c"]')).toBeVisible()
}

/** Click a toolbar action and wait until it has finished. */
const run = async (page: Page, testId: string) => {
  const before = Number((await status(page).getAttribute('data-runs')) ?? '0')

  await page.getByTestId(testId).click()
  await expect(status(page)).toHaveAttribute('data-runs', String(before + 1))
}

/** Real mouse drag of a node's centre; moves past the 1px threshold first. */
const dragNode = async (page: Page, nodeId: string, dx: number, dy: number) => {
  const box = await page.locator(`[data-node-id="${nodeId}"]`).boundingBox()

  if (box === null) {
    throw new Error(`Node ${nodeId} is not rendered`)
  }

  const x = box.x + box.width / 2
  const y = box.y + box.height / 2

  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 3, y + 3)
  await page.mouse.move(x + dx, y + dy, { steps: 10 })
  await page.mouse.up()
}

test('getIntersectingNodes and isNodeIntersecting see a node dragged onto another', async ({
  page,
}) => {
  await open(page)
  await run(page, 'intersections')
  await expect(status(page)).toHaveAttribute('data-intersecting', '')
  await expect(status(page)).toHaveAttribute('data-a-intersects-b', 'false')

  await dragNode(page, 'a', 250, 0)
  await run(page, 'intersections')
  await expect(status(page)).toHaveAttribute('data-intersecting', 'b')
  await expect(status(page)).toHaveAttribute('data-a-intersects-b', 'true')
})

test('getNodesBounds wraps the measured nodes and toObject restores the flow', async ({
  page,
}) => {
  await open(page)
  await run(page, 'bounds')
  await expect(status(page)).toHaveAttribute('data-bounds', '40,40,120,270')

  await run(page, 'round-trip')
  await expect(status(page)).toHaveAttribute('data-cleared', '0')
  await expect(status(page)).toHaveAttribute('data-round-trip', 'true')
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(3)
})

test('a store selector fires only when its selected value changes', async ({
  page,
}) => {
  await open(page)
  // The first state replaced the empty ids; the zoom stayed at 1.
  await expect(status(page)).toHaveAttribute('data-node-id-events', '1')
  await expect(status(page)).toHaveAttribute('data-zoom-events', '0')

  await dragNode(page, 'c', 60, 20)
  await run(page, 'edit-a')
  await expect(status(page)).toHaveAttribute('data-zoom-events', '0')
  await expect(status(page)).toHaveAttribute('data-node-id-events', '1')

  await run(page, 'zoom')
  await expect(status(page)).toHaveAttribute('data-zoom', '1.5')
  await expect(status(page)).toHaveAttribute('data-zoom-history', ' 1.5')
  await expect(status(page)).toHaveAttribute('data-zoom-events', '1')

  await run(page, 'add-node')
  await expect(status(page)).toHaveAttribute('data-node-ids', 'a,b,c,d')
  await expect(status(page)).toHaveAttribute('data-node-id-events', '2')
  await expect(status(page)).toHaveAttribute('data-zoom-events', '1')
})

test('observed node data emits once known, then only for the observed node', async ({
  page,
}) => {
  await open(page)
  await expect(status(page)).toHaveAttribute('data-observed-events', '1')
  await expect(status(page)).toHaveAttribute('data-observed', '{"count":0}')

  await run(page, 'edit-c')
  await dragNode(page, 'a', 40, 40)
  await expect(status(page)).toHaveAttribute('data-observed-events', '1')

  await run(page, 'edit-a')
  await expect(status(page)).toHaveAttribute('data-observed-events', '2')
  await expect(status(page)).toHaveAttribute('data-observed', '{"count":2}')
})
