import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

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

const node = (page: Page, id: string) =>
  page.locator(`.flow-vue-node[data-node-id="${id}"]`)

const boxOf = async (locator: Locator): Promise<Box> => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Missing element box')
  }

  return box
}

const open = async (page: Page) => {
  await page.goto('/ui-recipes/whiteboard/')
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-nodes',
    'A,B,C,X,Y'
  )
  await expect(node(page, 'Y')).toBeVisible()
}

/** Press, then move through every point with real mouse input, then release. */
const stroke = async (page: Page, points: readonly Point[]) => {
  const [first, ...rest] = points

  if (first === undefined) {
    return
  }

  await page.mouse.move(first.x, first.y)
  await page.mouse.down()

  for (const point of rest) {
    // eslint-disable-next-line no-await-in-loop -- pointer input is sequential.
    await page.mouse.move(point.x, point.y, { steps: 6 })
  }

  await page.mouse.up()
}

/** A closed loop through the corners of a screen rectangle. */
const loop = (box: Box): readonly Point[] => [
  { x: box.x, y: box.y },
  { x: box.x + box.width, y: box.y },
  { x: box.x + box.width, y: box.y + box.height },
  { x: box.x, y: box.y + box.height },
  { x: box.x, y: box.y + 2 },
]

const status = (page: Page) => page.getByTestId('recipe-status')

test('lasso selects nodes fully or partially inside the drawn shape', async ({
  page,
}) => {
  await open(page)

  const a = await boxOf(node(page, 'A'))
  const b = await boxOf(node(page, 'B'))
  const c = await boxOf(node(page, 'C'))

  await page.getByTestId('tool-lasso').click()
  await expect(page.getByTestId('tool-overlay')).toHaveCSS(
    'pointer-events',
    'auto'
  )

  await stroke(
    page,
    loop({
      x: a.x - 20,
      y: a.y - 20,
      width: b.x + b.width + 40 - a.x,
      height: a.height + 40,
    })
  )
  await expect(status(page)).toHaveAttribute('data-selected', 'A,B')
  await expect(
    node(page, 'A').locator('.flow-vue-resize-handle').first()
  ).toBeVisible()

  await page.getByTestId('lasso-partial').check()
  await stroke(
    page,
    loop({
      x: a.x - 20,
      y: a.y - 20,
      width: a.width + 40,
      height: c.y + c.height / 2 - a.y + 20,
    })
  )
  await expect(status(page)).toHaveAttribute('data-selected', 'A,C')
})

test('eraser deletes the nodes and edges its trail crosses', async ({
  page,
}) => {
  await open(page)

  const x = await boxOf(node(page, 'X'))
  const longEdge = page.locator('g[data-edge-id="C-Y"] path.flow-vue-edge-path')

  const mid = await longEdge.evaluate((element) => {
    if (!(element instanceof SVGPathElement)) {
      throw new TypeError('Expected an SVG path')
    }

    const matrix = element.getScreenCTM()

    if (matrix === null) {
      throw new Error('Path has no screen matrix')
    }

    const point = element
      .getPointAtLength(element.getTotalLength() / 2)
      .matrixTransform(matrix)

    return { x: point.x, y: point.y }
  })

  await page.getByTestId('tool-eraser').click()

  await stroke(page, [
    { x: x.x + x.width / 2, y: x.y - 20 },
    { x: x.x + x.width / 2, y: x.y + x.height + 20 },
  ])
  await expect(status(page)).toHaveAttribute('data-nodes', 'A,B,C,Y')
  await expect(status(page)).toHaveAttribute('data-edges', 'A-B,C-Y')

  await page.mouse.move(mid.x - 30, mid.y - 30)
  await page.mouse.down()
  await page.mouse.move(mid.x + 30, mid.y + 30, { steps: 8 })
  await expect(page.getByTestId('tool-overlay')).toHaveAttribute(
    'data-marked-edges',
    'C-Y'
  )
  await page.mouse.up()

  await expect(status(page)).toHaveAttribute('data-edges', 'A-B')
  await expect(status(page)).toHaveAttribute('data-nodes', 'A,B,C,Y')
})

test('rectangle tool creates a node from the dragged screen rectangle', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('tool-rectangle').click()

  const start = { x: 300, y: 380 }
  await stroke(page, [start, { x: start.x + 200, y: start.y + 100 }])

  await expect(status(page)).toHaveAttribute(
    'data-nodes',
    'A,B,C,X,Y,rectangle-1'
  )

  const rect = await boxOf(node(page, 'rectangle-1'))
  expect(Math.abs(rect.x - start.x)).toBeLessThanOrEqual(3)
  expect(Math.abs(rect.y - start.y)).toBeLessThanOrEqual(3)
  expect(Math.abs(rect.width - 200)).toBeLessThanOrEqual(3)
  expect(Math.abs(rect.height - 100)).toBeLessThanOrEqual(3)
})

test('freehand tool creates a node holding the smoothed stroke', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('tool-freehand').click()

  const points = [
    { x: 300, y: 220 },
    { x: 340, y: 260 },
    { x: 380, y: 220 },
    { x: 420, y: 260 },
    { x: 460, y: 220 },
  ]

  await stroke(page, points)
  await expect(status(page)).toHaveAttribute(
    'data-nodes',
    'A,B,C,X,Y,freehand-1'
  )

  const path = node(page, 'freehand-1').getByTestId('freehand-path')
  const d = (await path.getAttribute('d')) ?? ''
  expect(d.startsWith('M')).toBe(true)
  expect(d.match(/Q/gu)?.length ?? 0).toBeGreaterThan(3)

  const box = await boxOf(node(page, 'freehand-1'))
  const padding = 6

  const inside = points.every(
    ({ x, y }) =>
      x >= box.x - padding &&
      x <= box.x + box.width + padding &&
      y >= box.y - padding &&
      y <= box.y + box.height + padding
  )

  expect(inside).toBe(true)
})

test('select tool leaves pane drags to the canvas', async ({ page }) => {
  await open(page)
  await page.getByTestId('tool-rectangle').click()
  await page.getByTestId('tool-select').click()
  await expect(page.getByTestId('tool-overlay')).toHaveCSS(
    'pointer-events',
    'none'
  )

  const before = await boxOf(node(page, 'A'))

  await page.mouse.move(320, 420)
  await page.mouse.down()
  await page.mouse.move(323, 423)
  await page.mouse.move(420, 470, { steps: 8 })
  await page.mouse.up()

  await expect(status(page)).toHaveAttribute('data-nodes', 'A,B,C,X,Y')

  const after = await boxOf(node(page, 'A'))
  expect(Math.round(after.x - before.x)).toBe(100)
  expect(Math.round(after.y - before.y)).toBe(50)
})
