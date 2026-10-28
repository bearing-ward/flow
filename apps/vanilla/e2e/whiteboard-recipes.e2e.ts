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

const nodeLocator = (page: Page, id: string) =>
  page.locator(`.flow-node[data-node-id="${id}"]`)

const boxOf = async (locator: Locator): Promise<Box> => {
  await expect(locator).toHaveCSS('visibility', 'visible')
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Element has no bounding box')
  }

  return box
}

const open = async (page: Page) => {
  await page.goto('/ui-recipes/whiteboard/')
  await expect(page.getByTestId('recipe-status')).toHaveText('nodes:5')
  const canvas = await boxOf(page.getByTestId('flow-canvas'))

  return { status: page.getByTestId('recipe-status'), canvas }
}

/** Press, then move through every point with real mouse events, then release. */
const stroke = async (page: Page, points: readonly Point[]) => {
  const [first, ...rest] = points

  if (first === undefined) {
    throw new Error('Empty stroke')
  }

  await page.mouse.move(first.x, first.y)
  await page.mouse.down()

  for (const point of rest) {
    // oxlint-disable-next-line no-await-in-loop -- A stroke's pointer moves must reach the page in order.
    await page.mouse.move(point.x, point.y, { steps: 4 })
  }

  await page.mouse.up()
}

/** A closed lasso outline around a screen rectangle. */
const lassoAround = (rect: Box): readonly Point[] => [
  { x: rect.x, y: rect.y },
  { x: rect.x + rect.width / 2, y: rect.y - 4 },
  { x: rect.x + rect.width, y: rect.y },
  { x: rect.x + rect.width + 4, y: rect.y + rect.height / 2 },
  { x: rect.x + rect.width, y: rect.y + rect.height },
  { x: rect.x, y: rect.y + rect.height },
  { x: rect.x - 4, y: rect.y + rect.height / 2 },
  { x: rect.x + 2, y: rect.y + 2 },
]

const union = (first: Box, second: Box, padding: number): Box => {
  const x = Math.min(first.x, second.x) - padding
  const y = Math.min(first.y, second.y) - padding

  return {
    x,
    y,
    width:
      Math.max(first.x + first.width, second.x + second.width) + padding - x,
    height:
      Math.max(first.y + first.height, second.y + second.height) + padding - y,
  }
}

/** Screen point at a fraction of an SVG path's length. */
const pathPoint = (page: Page, selector: string, fraction: number) =>
  page.evaluate(
    ([target, at]) => {
      const path = document.querySelector(target)

      if (!(path instanceof SVGPathElement)) {
        throw new TypeError(`Missing path ${target}`)
      }

      const matrix = path.getScreenCTM()

      if (matrix === null) {
        throw new Error('Path has no screen matrix')
      }

      const point = path.getPointAtLength(path.getTotalLength() * at)

      return new DOMPoint(point.x, point.y).matrixTransform(matrix).toJSON()
    },
    [selector, fraction] as const
  )

test('whiteboard: lasso selects nodes fully inside, or touched when partial', async ({
  page,
}) => {
  const { status } = await open(page)
  const a = await boxOf(nodeLocator(page, 'A'))
  const b = await boxOf(nodeLocator(page, 'B'))
  const c = await boxOf(nodeLocator(page, 'C'))

  await page.getByTestId('tool-lasso').click()
  await expect(page.getByTestId('tool-overlay')).toHaveCSS(
    'pointer-events',
    'auto'
  )
  await stroke(page, lassoAround(union(a, b, 12)))
  await expect(status).toHaveAttribute('data-selected', 'A,B')
  await expect(nodeLocator(page, 'A')).toHaveAttribute('aria-pressed', 'true')
  await expect(nodeLocator(page, 'C')).not.toHaveAttribute(
    'aria-pressed',
    'true'
  )

  // Around A and through the upper half of C.
  const cut: Box = {
    x: a.x - 12,
    y: a.y - 12,
    width: a.width + 24,
    height: c.y + c.height / 2 - (a.y - 12),
  }

  await stroke(page, lassoAround(cut))
  await expect(status).toHaveAttribute('data-selected', 'A')

  await page.getByTestId('lasso-partial').check()
  await stroke(page, lassoAround(cut))
  await expect(status).toHaveAttribute('data-selected', 'A,C')
})

test('whiteboard: eraser deletes the nodes and edges its trail crosses', async ({
  page,
}) => {
  const { status } = await open(page)
  const x = await boxOf(nodeLocator(page, 'X'))
  await page.getByTestId('tool-eraser').click()

  const midY = x.y + x.height / 2
  await page.mouse.move(x.x + 10, midY)
  await page.mouse.down()
  await page.mouse.move(x.x + x.width - 10, midY, { steps: 6 })
  await expect(nodeLocator(page, 'X')).toHaveClass(/eraser-marked/u)
  await page.mouse.up()
  await expect(status).toHaveAttribute('data-nodes', 'A,B,C,Y')
  await expect(status).toHaveAttribute('data-edges', 'e-a-b,e-a-c,e-c-y')

  const mid = await pathPoint(
    page,
    '.flow-edge-path[data-edge-id="e-c-y"]',
    0.5
  )

  await stroke(page, [
    { x: mid.x - 2, y: mid.y - 20 },
    { x: mid.x + 2, y: mid.y + 20 },
  ])
  await expect(status).toHaveAttribute('data-edges', 'e-a-b,e-a-c')
  await expect(status).toHaveAttribute('data-nodes', 'A,B,C,Y')
})

test('whiteboard: rectangle tool creates a node matching the dragged screen rect', async ({
  page,
}) => {
  const { status, canvas } = await open(page)
  await page.getByTestId('tool-rectangle').click()

  const start = { x: canvas.x + 450, y: canvas.y + 60 }

  // A tiny drag creates nothing.
  await stroke(page, [start, { x: start.x + 3, y: start.y + 3 }])
  await expect(status).toHaveText('nodes:5')

  await stroke(page, [start, { x: start.x + 200, y: start.y + 100 }])
  await expect(status).toHaveText('nodes:6')
  await expect(status).toHaveAttribute('data-nodes', /,rectangle-1$/u)

  const created = await boxOf(nodeLocator(page, 'rectangle-1'))
  expect(Math.abs(created.x - start.x)).toBeLessThanOrEqual(3)
  expect(Math.abs(created.y - start.y)).toBeLessThanOrEqual(3)
  expect(Math.abs(created.width - 200)).toBeLessThanOrEqual(3)
  expect(Math.abs(created.height - 100)).toBeLessThanOrEqual(3)
})

test('whiteboard: freehand stroke becomes a node holding a smoothed path', async ({
  page,
}) => {
  const { status, canvas } = await open(page)
  await page.getByTestId('tool-freehand').click()

  const points = Array.from({ length: 8 }, (_, index) => ({
    x: canvas.x + 440 + index * 20,
    y: canvas.y + 230 + (index % 2 === 0 ? 0 : 50),
  }))

  await stroke(page, points)
  await expect(status).toHaveText('nodes:6')

  const node = nodeLocator(page, 'freehand-1')
  const d = await node.getByTestId('freehand-path').getAttribute('d')
  expect(d).toMatch(/^M /u)
  expect(d?.match(/Q /gu)?.length ?? 0).toBeGreaterThan(5)

  // Stroke padding is 4 flow units at zoom 1.25.
  const rect = await boxOf(node)
  const tolerance = 6

  const outside = points.filter(
    (point) =>
      point.x < rect.x - tolerance ||
      point.x > rect.x + rect.width + tolerance ||
      point.y < rect.y - tolerance ||
      point.y > rect.y + rect.height + tolerance
  )

  expect(outside).toEqual([])
})

test('whiteboard: with no tool the overlay passes the pane drag through', async ({
  page,
}) => {
  const { status, canvas } = await open(page)
  const overlay = page.getByTestId('tool-overlay')
  const viewport = page.getByTestId('flow-viewport')
  await page.getByTestId('tool-rectangle').click()
  await page.getByTestId('tool-select').click()
  await expect(overlay).toHaveCSS('pointer-events', 'none')
  await expect(viewport).toHaveAttribute('data-x', '40')

  const start = { x: canvas.x + 450, y: canvas.y + 60 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 3, start.y)
  await page.mouse.move(start.x + 120, start.y + 80, { steps: 8 })
  await page.mouse.up()

  await expect(viewport).not.toHaveAttribute('data-x', '40')
  await expect(status).toHaveText('nodes:5')
})
