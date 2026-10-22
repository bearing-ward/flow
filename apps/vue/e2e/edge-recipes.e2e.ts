import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

interface Point {
  readonly x: number
  readonly y: number
}

interface PathPoints {
  readonly start: Point
  readonly mid: Point
  readonly end: Point
  readonly d: string
}

const open = async (page: Page, scene: string) => {
  await page.goto(`/ui-recipes/edge-recipes/?scene=${scene}`)
}

const node = (page: Page, id: string) =>
  page.locator(`.flow-vue-node[data-node-id="${id}"]`)

/** Screen points along an SVG path, mapped through its screen matrix. */
const pathPoints = (locator: Locator): Promise<PathPoints> =>
  locator.evaluate((element) => {
    if (!(element instanceof SVGPathElement)) {
      throw new TypeError('Expected an SVG path')
    }

    const matrix = element.getScreenCTM()

    if (matrix === null) {
      throw new Error('Path has no screen matrix')
    }

    const total = element.getTotalLength()

    const at = (length: number) => {
      const point = element.getPointAtLength(length).matrixTransform(matrix)

      return { x: point.x, y: point.y }
    }

    return {
      start: at(0),
      mid: at(total / 2),
      end: at(total),
      d: element.getAttribute('d') ?? '',
    }
  })

const centerOf = async (locator: Locator): Promise<Point> => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Missing element box')
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const expectNear = (actual: Point, expected: Point, tolerance = 2) => {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance)
}

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

const boxCenter = (box: Box): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
})

/** Distance from a point to the nearest edge of a box, when it is within the box's reach. */
const borderDistance = (point: Point, box: Box): number => {
  const inside =
    point.x >= box.x - 2 &&
    point.x <= box.x + box.width + 2 &&
    point.y >= box.y - 2 &&
    point.y <= box.y + box.height + 2

  if (!inside) {
    return Number.POSITIVE_INFINITY
  }

  return Math.min(
    Math.abs(point.x - box.x),
    Math.abs(point.x - (box.x + box.width)),
    Math.abs(point.y - box.y),
    Math.abs(point.y - (box.y + box.height))
  )
}

/** Distance from a point to the line through two centers. */
const lineDistance = (point: Point, from: Point, to: Point): number => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)

  return (
    Math.abs(dy * point.x - dx * point.y + to.x * from.y - to.y * from.x) /
    length
  )
}

/** Both ends lie on the node borders, on the line between the node centers. */
const floatingEndpointsOk = async (
  path: Locator,
  source: Locator,
  target: Locator
): Promise<boolean> => {
  const points = await pathPoints(path)
  const sourceBox = await boxOf(source)
  const targetBox = await boxOf(target)
  const sourceCenter = boxCenter(sourceBox)
  const targetCenter = boxCenter(targetBox)

  return (
    borderDistance(points.start, sourceBox) <= 2 &&
    borderDistance(points.end, targetBox) <= 2 &&
    lineDistance(points.start, sourceCenter, targetCenter) <= 2 &&
    lineDistance(points.end, sourceCenter, targetCenter) <= 2
  )
}

const facingMidpoint = (from: Box, to: Box): Point => {
  const a = boxCenter(from)
  const b = boxCenter(to)

  if (Math.abs(a.x - b.x) > Math.abs(a.y - b.y)) {
    return { x: a.x > b.x ? from.x : from.x + from.width, y: a.y }
  }

  return { x: a.x, y: a.y > b.y ? from.y : from.y + from.height }
}

/** Both ends sit on the midpoints of the sides that face each other. */
const simpleEndpointsOk = async (
  path: Locator,
  source: Locator,
  target: Locator
): Promise<boolean> => {
  const points = await pathPoints(path)
  const sourceBox = await boxOf(source)
  const targetBox = await boxOf(target)
  const expectedStart = facingMidpoint(sourceBox, targetBox)
  const expectedEnd = facingMidpoint(targetBox, sourceBox)

  return (
    Math.hypot(
      points.start.x - expectedStart.x,
      points.start.y - expectedStart.y
    ) <= 2 &&
    Math.hypot(points.end.x - expectedEnd.x, points.end.y - expectedEnd.y) <= 2
  )
}

/** Press, cross the drag threshold, then move to a point and keep holding. */
const pressAndMove = async (page: Page, from: Point, to: Point) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(to.x, to.y, { steps: 8 })
}

const moverCenter = (page: Page) =>
  centerOf(page.getByTestId('animated-svg-shape'))

const pathMidpoint = async (path: Locator): Promise<Point> => {
  const points = await pathPoints(path)

  return points.mid
}

const pathEnd = async (path: Locator): Promise<Point> => {
  const points = await pathPoints(path)

  return points.end
}

test('button-edge deletes its edge by click and by keyboard', async ({
  page,
}) => {
  await open(page, 'button-edge')

  const status = page.getByTestId('recipe-status')
  await expect(status).toHaveText('edges:e-ab,e-bc')

  const path = page.locator('path[data-edge-path="e-ab"]')

  const button = page.getByRole('button', { name: 'Delete edge e-ab' })
  await expect(button).toHaveCSS('pointer-events', 'all')
  expectNear(await centerOf(button), await pathMidpoint(path))

  // Pinned GraphView/index.tsx:182 keeps the label renderer in the viewport.
  const labelHit = await button.evaluate((element) => {
    const bounds = element.getBoundingClientRect()

    const hits = document.elementsFromPoint(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    )

    return {
      buttonIsFirst: hits[0] === element,
      hits: hits.slice(0, 4).map((hit) => hit.outerHTML.slice(0, 220)),
    }
  })

  await test.info().attach('button-edge-hit-order', {
    body: JSON.stringify(labelHit),
    contentType: 'application/json',
  })
  expect(labelHit.buttonIsFirst).toBe(true)
  await button.click()
  await expect(path).toHaveCount(0)
  await expect(button).toHaveCount(0)
  await expect(status).toHaveText('edges:e-bc')

  const keyboardButton = page.getByRole('button', {
    name: 'Delete edge e-bc',
  })

  await keyboardButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('path[data-edge-path="e-bc"]')).toHaveCount(0)
  await expect(keyboardButton).toHaveCount(0)
  await expect(status).toHaveText('edges:')
})

test('data-edge label follows the source node data', async ({ page }) => {
  await open(page, 'data-edge')

  const label = page.getByTestId('data-edge-label')
  const path = page.getByTestId('data-edge-path')
  await expect(label).toHaveText('alpha')
  expectNear(await centerOf(label), await pathMidpoint(path))

  await page.getByTestId('update-node-data').click()
  await expect(label).toHaveText('beta')
  expectNear(await centerOf(label), await pathMidpoint(path))
})

test('animated-svg-edge animates along the path and respects reduced motion', async ({
  page,
}) => {
  await open(page, 'animated-svg-edge')

  const path = page.getByTestId('animated-svg-path')

  const motion = page.locator(
    '[data-testid="animated-svg-shape"] animateMotion'
  )

  await expect(motion).toHaveCount(1)

  const points = await pathPoints(path)
  await expect(motion).toHaveAttribute('path', points.d)

  const first = await moverCenter(page)

  await expect
    .poll(async () => {
      const next = await moverCenter(page)

      return Math.hypot(next.x - first.x, next.y - first.y)
    })
    .toBeGreaterThan(2)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(motion).toHaveCount(0)

  const parked = await moverCenter(page)
  expectNear(parked, await pathMidpoint(path))
  await page.waitForTimeout(400)
  expectNear(await moverCenter(page), parked, 0.5)
})

test('floating-edges attach to the facing borders after a node drag', async ({
  page,
}) => {
  await open(page, 'floating-edges')

  const path = page.locator('path[data-edge-path="e-0"]')
  const source = node(page, 'top')
  const target = node(page, 'target')
  await expect(path).toHaveAttribute('marker-end', /^url\(#/u)
  await expect.poll(() => floatingEndpointsOk(path, source, target)).toBe(true)

  const before = await pathPoints(path)
  const targetCenter = boxCenter(await boxOf(target))
  expect(before.start.y).toBeLessThan(targetCenter.y)

  // Drag the source below the target, so both endpoints flip sides. Vue
  // previews a node drag with a DOM transform and commits the position on
  // drop, so edges, built-in and custom alike, update after the drop.
  await pressAndMove(page, await centerOf(source), { x: 480, y: 560 })
  await page.mouse.up()
  await expect.poll(() => floatingEndpointsOk(path, source, target)).toBe(true)

  const after = await pathPoints(path)
  expect(after.start.y).toBeGreaterThan(targetCenter.y)
  expect(after.end.y).toBeGreaterThan(targetCenter.y)
})

test('simple-floating-edges snap to the facing side midpoints', async ({
  page,
}) => {
  await open(page, 'simple-floating-edges')

  const path = page.locator('path[data-edge-path="e-0"]')
  const source = node(page, 'top')
  const target = node(page, 'target')
  await expect.poll(() => simpleEndpointsOk(path, source, target)).toBe(true)

  const targetBox = await boxOf(target)

  expectNear(await pathEnd(path), {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y,
  })

  // Move the source left of the target so the horizontal axis dominates.
  // Vue commits the drag on drop, so the edge updates then.
  await pressAndMove(page, await centerOf(source), { x: 250, y: 200 })
  await page.mouse.up()
  await expect.poll(() => simpleEndpointsOk(path, source, target)).toBe(true)

  expectNear(await pathEnd(path), {
    x: targetBox.x,
    y: targetBox.y + targetBox.height / 2,
  })
})

test('easy-connect connects node bodies with floating edges', async ({
  page,
}) => {
  await open(page, 'easy-connect')

  const status = page.getByTestId('recipe-status')
  const first = node(page, '1')
  const second = node(page, '2')
  const third = node(page, '3')
  await expect(status).toHaveText('edges:')

  await pressAndMove(page, await centerOf(first), { x: 380, y: 300 })
  await expect(page.getByTestId('easy-connection-line')).toHaveCount(1)
  expectNear(await centerOf(page.getByTestId('easy-connection-cursor')), {
    x: 380,
    y: 300,
  })
  const secondCenter = await centerOf(second)
  await page.mouse.move(secondCenter.x, secondCenter.y, { steps: 6 })
  await page.mouse.up()

  await expect(status).toHaveAttribute('data-links', '1>2')
  await expect(page.getByTestId('easy-connection-line')).toHaveCount(0)

  const path = page.getByTestId('floating-edge-path')
  await expect(path).toHaveCount(1)
  await expect.poll(() => floatingEndpointsOk(path, first, second)).toBe(true)

  // Released over the empty pane: no edge.
  await pressAndMove(page, await centerOf(third), { x: 420, y: 560 })
  await expect(page.getByTestId('easy-connection-cursor')).toHaveCount(1)
  await page.mouse.up()
  await expect(page.getByTestId('easy-connection-line')).toHaveCount(0)

  // Released back on the origin node: no self edge.
  const thirdCenter = await centerOf(third)
  await pressAndMove(page, thirdCenter, {
    x: thirdCenter.x + 40,
    y: thirdCenter.y + 10,
  })
  await page.mouse.up()
  await expect(status).toHaveAttribute('data-links', '1>2')

  // The strip drags the node, and the floating edge follows.
  const strip = second.getByTestId('easy-drag-strip')
  const before = await boxOf(second)
  const grip = await centerOf(strip)
  await pressAndMove(page, grip, { x: grip.x, y: grip.y + 150 })
  await page.mouse.up()
  await expect
    .poll(async () => {
      const box = await boxOf(second)

      return box.y
    })
    .toBeGreaterThan(before.y + 140)
  await expect.poll(() => floatingEndpointsOk(path, first, second)).toBe(true)
  await expect(status).toHaveAttribute('data-links', '1>2')
})

test('edge-markers resolves built-in and custom marker references', async ({
  page,
}) => {
  await open(page, 'edge-markers')

  const markerRef = async (locator: Locator, attribute: string) => {
    const value = await locator.getAttribute(attribute)
    const id = /^url\(#(?<id>[^)]+)\)$/u.exec(value ?? '')?.groups?.id

    expect(id).toBeDefined()

    return page.evaluate(
      (markerId) =>
        document.querySelector(`#${CSS.escape(markerId ?? '')}`)?.tagName ??
        null,
      id
    )
  }

  const builtin = (id: string) =>
    page.locator(`g[data-edge-id="${id}"] [data-testid="flow-edge-path"]`)

  await expect(builtin('arrow')).toHaveCount(1)
  expect(await markerRef(builtin('arrow'), 'marker-end')).toBe('marker')
  expect(await markerRef(builtin('arrowclosed'), 'marker-end')).toBe('marker')
  expect(await markerRef(builtin('both'), 'marker-start')).toBe('marker')
  expect(await markerRef(builtin('both'), 'marker-end')).toBe('marker')

  const markers = page.getByTestId('custom-marker')
  await expect(markers).toHaveCount(2)

  const customMarkers = await markers.all()

  await Promise.all(
    customMarkers.flatMap((marker) => [
      expect(marker).toHaveAttribute('markerWidth', '16'),
      expect(marker).toHaveAttribute('markerHeight', '16'),
      expect(marker.locator(':scope > *')).toHaveAttribute('fill', '#e11d48'),
    ])
  )

  const custom = page.locator('path[data-edge-path="custom"]')
  const startId = await markers.nth(0).getAttribute('id')
  const endId = await markers.nth(1).getAttribute('id')
  await expect(custom).toHaveAttribute('marker-start', `url(#${startId})`)
  await expect(custom).toHaveAttribute('marker-end', `url(#${endId})`)

  const duplicates = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(({ id }) => id)

    return ids.filter((id, index) => ids.indexOf(id) !== index)
  })

  expect(duplicates).toEqual([])
})

test('multi-connection-line draws from every selected node and connects them all', async ({
  page,
}) => {
  await open(page, 'multi-connection-line')

  const handle = (id: string, handleId: string) =>
    node(page, id).locator(`[data-handle-id="${handleId}"]`)

  await expect(handle('s1', 'out')).toBeVisible()

  const pointer = { x: 380, y: 420 }
  await pressAndMove(page, await centerOf(handle('s1', 'out')), pointer)

  const lines = page.getByTestId('multi-connection-line')
  await expect(lines).toHaveCount(2)

  const origins = await Promise.all(
    ['s1', 's2'].map(async (id) => ({
      points: await pathPoints(
        page.locator(
          `[data-testid="multi-connection-line"][data-node-id="${id}"]`
        )
      ),
      handleCenter: await centerOf(handle(id, 'out')),
    }))
  )

  for (const { points, handleCenter } of origins) {
    expectNear(points.start, handleCenter)
    expectNear(points.end, pointer)
  }

  const drop = await centerOf(handle('t', 'in'))
  await page.mouse.move(drop.x, drop.y, { steps: 6 })
  await page.mouse.up()

  const status = page.getByTestId('recipe-status')

  await expect
    .poll(async () =>
      ((await status.getAttribute('data-links')) ?? '').split(',').toSorted()
    )
    .toEqual(['s1>t', 's2>t'])
})
