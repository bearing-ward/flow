import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

interface Point {
  readonly x: number
  readonly y: number
}

const open = async (page: Page) => {
  await page.goto('/ui-recipes/delete-edge-on-drop/')
  await expect(page.getByTestId('recipe-status')).toHaveText('edges:e1-2=1>2')
}

const centerOf = async (page: Page, selector: string): Promise<Point> => {
  const box = await page.locator(selector).boundingBox()

  if (box === null) {
    throw new Error(`${selector} is not rendered`)
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Click the edge path away from its label, as a user selects an edge. */
const selectEdge = async (page: Page, edgeId: string) => {
  const point = await page
    .locator(`[data-edge-id="${edgeId}"] .flow-foldkit-edge-path`)
    .evaluate((element) => {
      if (!(element instanceof SVGPathElement)) {
        throw new TypeError('Expected an SVG path')
      }

      const matrix = element.getScreenCTM()

      if (matrix === null) {
        throw new Error('Path has no screen matrix')
      }

      const local = element.getPointAtLength(element.getTotalLength() * 0.25)
      const screen = new DOMPoint(local.x, local.y).matrixTransform(matrix)

      return { x: screen.x, y: screen.y }
    })

  await page.mouse.click(point.x, point.y)
}

/** Real pointer drag of the target reconnect anchor, past the 1px threshold. */
const dragTargetAnchor = async (page: Page, to: Point) => {
  await selectEdge(page, 'e1-2')

  const anchor = '[data-edge-id="e1-2"][data-edge-endpoint="target"]'

  await expect(page.locator(anchor)).toBeVisible()

  const from = await centerOf(page, anchor)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 2, from.y + 2)
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

test('dropping a reconnecting edge end on the empty pane deletes the edge', async ({
  page,
}) => {
  await open(page)

  const frame = await page.locator('.recipe-frame').boundingBox()

  if (frame === null) {
    throw new Error('Missing recipe frame')
  }

  await dragTargetAnchor(page, { x: frame.x + 820, y: frame.y + 470 })

  const status = page.getByTestId('recipe-status')

  await expect(status).toHaveAttribute('data-last-reconnect', 'rejected')
  await expect(status).toHaveText('edges:')
  await expect(page.locator('svg.flow-foldkit-edge')).toHaveCount(0)
})

test('dropping a reconnecting edge end on another handle keeps and reconnects the edge', async ({
  page,
}) => {
  await open(page)

  await dragTargetAnchor(
    page,
    await centerOf(page, '[data-node-id="3"] [data-handle-id="in"]')
  )

  const status = page.getByTestId('recipe-status')

  await expect(status).toHaveAttribute('data-last-reconnect', 'accepted')
  await expect(status).toHaveText('edges:e1-2=1>3')
  await expect(
    page.locator('svg.flow-foldkit-edge[data-edge-id="e1-2"]')
  ).toHaveCount(1)
})
