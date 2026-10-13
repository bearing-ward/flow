import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

interface Point {
  readonly x: number
  readonly y: number
}

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const open = async (page: Page) => {
  await page.goto('/ui-recipes/whiteboard/')
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-nodes',
    'A,B,C,X,Y'
  )
}

const boxOf = async (page: Page, selector: string): Promise<Box> => {
  const box = await page.locator(selector).boundingBox()

  if (box === null) {
    throw new Error(`${selector} is not rendered`)
  }

  return box
}

const nodeBox = (page: Page, nodeId: string) =>
  boxOf(page, `[data-node-id="${nodeId}"]`)

/** A real mouse stroke through every point. */
const stroke = async (page: Page, points: readonly Point[]) => {
  const [first, ...rest] = points

  if (first === undefined) {
    return
  }

  await page.mouse.move(first.x, first.y)
  await page.mouse.down()

  // eslint-disable no-await-in-loop -- a stroke visits its points in order.
  for (const point of rest) {
    await page.mouse.move(point.x, point.y, { steps: 6 })
  }
  // eslint-enable no-await-in-loop

  await page.mouse.up()
}

test('Lasso Selection selects the nodes inside the drawn polygon', async ({
  page,
}) => {
  await open(page)
  const status = page.getByTestId('recipe-status')
  const a = await nodeBox(page, 'A')
  const b = await nodeBox(page, 'B')
  const c = await nodeBox(page, 'C')

  await page.getByTestId('tool-lasso').click()
  await expect(page.getByTestId('tool-overlay')).toHaveCSS(
    'pointer-events',
    'auto'
  )

  const top = a.y - 15
  const bottom = a.y + a.height + 15

  await stroke(page, [
    { x: a.x - 15, y: top },
    { x: b.x + b.width + 15, y: top },
    { x: b.x + b.width + 15, y: bottom },
    { x: a.x - 15, y: bottom },
    { x: a.x - 15, y: top + 2 },
  ])

  await expect(status).toHaveAttribute('data-selected', 'A,B')
  await expect(
    page.locator('[data-node-id="A"] .flow-foldkit-resize')
  ).toHaveCount(8)

  // Partial: around A, under B, and a prong into C.
  await page.getByTestId('lasso-partial').check()
  const below = b.y + b.height + 20
  const cx = c.x + c.width / 2

  await stroke(page, [
    { x: a.x - 15, y: top },
    { x: a.x + a.width + 15, y: top },
    { x: a.x + a.width + 15, y: below },
    { x: cx, y: below },
    { x: cx, y: c.y + c.height / 2 },
    { x: cx + 10, y: c.y + c.height / 2 },
    { x: cx + 10, y: below + 20 },
    { x: a.x - 15, y: below + 20 },
    { x: a.x - 15, y: top + 2 },
  ])

  await expect(status).toHaveAttribute('data-selected', 'A,C')
})

test('Eraser Tool deletes the nodes and edges its trail crosses', async ({
  page,
}) => {
  await open(page)
  const status = page.getByTestId('recipe-status')
  const x = await nodeBox(page, 'X')

  await page.getByTestId('tool-eraser').click()

  // Across node X.
  const middle = x.y + x.height / 2
  await stroke(page, [
    { x: x.x - 20, y: middle },
    { x: x.x + x.width / 2, y: middle + 5 },
    { x: x.x + x.width + 20, y: middle },
  ])

  await expect(status).toHaveAttribute('data-nodes', 'A,B,C,Y')

  // Across the long edge C -> Y, away from every node.
  const crossing = await page
    .locator('[data-edge-id="e-c-y"] .flow-foldkit-edge-path')
    .evaluate((element) => {
      if (!(element instanceof SVGPathElement)) {
        throw new Error('Expected an SVG path')
      }

      const matrix = element.getScreenCTM()

      if (matrix === null) {
        throw new Error('Path has no screen matrix')
      }

      const point = element.getPointAtLength(element.getTotalLength() / 2)
      const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix)

      return { x: screen.x, y: screen.y }
    })

  await stroke(page, [
    { x: crossing.x - 30, y: crossing.y - 10 },
    { x: crossing.x + 30, y: crossing.y + 10 },
  ])

  await expect(status).toHaveAttribute('data-edges', 'e-a-b,e-b-c')
  await expect(status).toHaveAttribute('data-nodes', 'A,B,C,Y')
})

test('Rectangle creates a node from a dragged screen rectangle', async ({
  page,
}) => {
  await open(page)
  const status = page.getByTestId('recipe-status')
  const frame = await boxOf(page, '.recipe-frame')

  await page.getByTestId('tool-rectangle').click()

  const start = { x: frame.x + 300, y: frame.y + 330 }
  await stroke(page, [
    start,
    { x: start.x + 100, y: start.y + 50 },
    { x: start.x + 200, y: start.y + 100 },
  ])

  await expect(status).toHaveAttribute('data-nodes', 'A,B,C,X,Y,rectangle-1')
  const rectangle = await nodeBox(page, 'rectangle-1')
  expect(Math.abs(rectangle.x - start.x)).toBeLessThanOrEqual(3)
  expect(Math.abs(rectangle.y - start.y)).toBeLessThanOrEqual(3)
  expect(Math.abs(rectangle.width - 200)).toBeLessThanOrEqual(3)
  expect(Math.abs(rectangle.height - 100)).toBeLessThanOrEqual(3)
})

test('Freehand Draw turns a stroke into a node holding the path', async ({
  page,
}) => {
  await open(page)
  const status = page.getByTestId('recipe-status')
  const frame = await boxOf(page, '.recipe-frame')

  await page.getByTestId('tool-freehand').click()

  const points = Array.from({ length: 7 }, (_, index) => ({
    x: frame.x + 300 + index * 25,
    y: frame.y + 420 + (index % 2 === 0 ? 0 : 40),
  }))

  await stroke(page, points)

  await expect(status).toHaveAttribute('data-nodes', 'A,B,C,X,Y,freehand-1')

  const d = await page
    .locator('[data-node-id="freehand-1"] [data-testid="freehand-path"]')
    .getAttribute('d')

  expect(d).toMatch(/^M /u)
  expect((d ?? '').match(/Q /gu)?.length ?? 0).toBeGreaterThanOrEqual(3)

  const box = await nodeBox(page, 'freehand-1')
  // Stroke padding is 4 flow units at zoom 1.25.
  const tolerance = 6

  const inside = points.every(
    (point) =>
      point.x >= box.x - tolerance &&
      point.x <= box.x + box.width + tolerance &&
      point.y >= box.y - tolerance &&
      point.y <= box.y + box.height + tolerance
  )

  expect(inside).toBe(true)
})

test('With no tool active the overlay lets pane drags through', async ({
  page,
}) => {
  await open(page)
  const status = page.getByTestId('recipe-status')
  const frame = await boxOf(page, '.recipe-frame')

  await page.getByTestId('tool-rectangle').click()
  await page.getByTestId('tool-select').click()
  await expect(page.getByTestId('tool-overlay')).toHaveCSS(
    'pointer-events',
    'none'
  )

  const start = { x: frame.x + 300, y: frame.y + 330 }
  await stroke(page, [
    start,
    { x: start.x + 5, y: start.y + 5 },
    { x: start.x + 200, y: start.y + 100 },
  ])

  await expect(status).toHaveAttribute('data-nodes', 'A,B,C,X,Y')
  await expect(page.locator('[data-node-id^="rectangle"]')).toHaveCount(0)
})
