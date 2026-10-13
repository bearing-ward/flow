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

const recipe = (scene: string) => `/ui-recipes/edge-recipes/?scene=${scene}`

/** Screen point at a fraction of an SVG path's length, mapped through its screen CTM. */
const pathPoint = (page: Page, selector: string, fraction: number) =>
  page.evaluate(
    ([target, at]) => {
      const path = document.querySelector(target)

      if (!(path instanceof SVGPathElement)) {
        throw new Error(`Missing path ${target}`)
      }

      const matrix = path.getScreenCTM()

      if (matrix === null) {
        throw new Error('Path has no screen matrix')
      }

      const point = path.getPointAtLength(path.getTotalLength() * at)
      const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix)

      return { x: screen.x, y: screen.y }
    },
    [selector, fraction] as const
  )

const boxOf = async (locator: Locator): Promise<Box> => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Element has no bounding box')
  }

  return box
}

const centerOf = (box: Box): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
})

const expectNear = (actual: Point, expected: Point, tolerance = 2) => {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance)
}

/** The point lies on the rect's border, within the tolerance. */
const expectOnBorder = (point: Point, box: Box, tolerance = 2) => {
  const inside =
    point.x >= box.x - tolerance &&
    point.x <= box.x + box.width + tolerance &&
    point.y >= box.y - tolerance &&
    point.y <= box.y + box.height + tolerance

  const borderDistance = Math.min(
    Math.abs(point.x - box.x),
    Math.abs(point.x - box.x - box.width),
    Math.abs(point.y - box.y),
    Math.abs(point.y - box.y - box.height)
  )

  expect(inside).toBe(true)
  expect(borderDistance).toBeLessThanOrEqual(tolerance)
}

/** The point lies on the segment between the two rect centers, so it faces the other node. */
const expectBetweenCenters = (point: Point, from: Box, to: Box) => {
  const a = centerOf(from)
  const b = centerOf(to)
  const length = Math.hypot(b.x - a.x, b.y - a.y)

  const offLine =
    Math.abs((b.x - a.x) * (a.y - point.y) - (a.x - point.x) * (b.y - a.y)) /
    length

  const along =
    ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) /
    (length * length)

  expect(offLine).toBeLessThanOrEqual(2)
  expect(along).toBeGreaterThan(0)
  expect(along).toBeLessThan(1)
}

const expectFloatingEndpoints = async (
  page: Page,
  edge: string,
  source: Locator,
  target: Locator
) => {
  const sourceBox = await boxOf(source)
  const targetBox = await boxOf(target)
  const start = await pathPoint(page, edge, 0)
  const end = await pathPoint(page, edge, 1)

  expectOnBorder(start, sourceBox)
  expectBetweenCenters(start, sourceBox, targetBox)
  expectOnBorder(end, targetBox)
  expectBetweenCenters(end, sourceBox, targetBox)
}

/** Press at a point and cross the default 1px threshold by 2px before a longer move. */
const pressAndStart = async (page: Page, at: Point) => {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.move(at.x + 3, at.y)
}

test('button-edge: delete button sits on the path midpoint and deletes by click and Enter', async ({
  page,
}) => {
  await page.goto(recipe('button-edge'))
  const status = page.getByTestId('recipe-status')
  await expect(status).toHaveText('edges:e-ab,e-bc')

  const button = page.getByRole('button', { name: 'Delete edge e-ab' })

  const midpoint = await pathPoint(
    page,
    '[data-testid="recipe-edge-e-ab"]',
    0.5
  )

  expectNear(centerOf(await boxOf(button)), midpoint)

  await button.click()
  await expect(page.getByTestId('recipe-edge-e-ab')).toHaveCount(0)
  await expect(button).toHaveCount(0)
  await expect(status).toHaveText('edges:e-bc')

  const second = page.getByRole('button', { name: 'Delete edge e-bc' })
  await second.focus()
  await expect(second).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('recipe-edge-e-bc')).toHaveCount(0)
  await expect(second).toHaveCount(0)
  await expect(status).toHaveText('edges:')
})

test('data-edge: label follows source node data and stays centered', async ({
  page,
}) => {
  await page.goto(recipe('data-edge'))
  const label = page.getByTestId('data-edge-label')
  await expect(label).toHaveText('alpha')

  const midpoint = await pathPoint(
    page,
    '[data-testid="recipe-edge-e-ab"]',
    0.5
  )

  expectNear(centerOf(await boxOf(label)), midpoint)

  await page.getByTestId('update-node-data').click()
  await expect(label).toHaveText('beta')
  expectNear(centerOf(await boxOf(label)), midpoint)
})

test('animated-svg-edge: shape animates along the path and parks under reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(recipe('animated-svg-edge'))
  const traveler = page.getByTestId('animated-svg-shape')
  const motion = traveler.locator('animateMotion')
  await expect(motion).toHaveCount(1)

  const d = await page.getByTestId('recipe-edge-e-ab').getAttribute('d')

  await expect(motion).toHaveAttribute('path', d ?? '')
  await expect(motion).toHaveAttribute('dur', '2s')
  await expect(motion).toHaveAttribute('repeatCount', 'indefinite')

  const first = centerOf(await boxOf(traveler))
  await page.waitForTimeout(400)
  const second = centerOf(await boxOf(traveler))
  expect(Math.hypot(second.x - first.x, second.y - first.y)).toBeGreaterThan(2)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(motion).toHaveCount(0)

  const midpoint = await pathPoint(
    page,
    '[data-testid="recipe-edge-e-ab"]',
    0.5
  )

  const parked = centerOf(await boxOf(traveler))
  expectNear(parked, midpoint)
  await page.waitForTimeout(400)
  expectNear(centerOf(await boxOf(traveler)), parked, 0.5)
})

test('floating-edges: endpoints follow the facing borders during and after a drag', async ({
  page,
}) => {
  await page.goto(recipe('floating-edges'))
  const edge = '[data-testid="floating-edge-e-0"]'
  const source = page.locator('.flow-node[data-node-id="left"]')
  const target = page.locator('.flow-node[data-node-id="target"]')
  await expect(page.locator(edge)).toHaveCount(1)
  await expect(page.locator(edge)).toHaveAttribute('marker-end', /^url\(#/u)
  await expectFloatingEndpoints(page, edge, source, target)

  const before = await boxOf(source)
  const targetBox = await boxOf(target)
  const start = centerOf(before)

  const destination = {
    x: targetBox.x + targetBox.width + 150,
    y: targetBox.y + targetBox.height + 70,
  }

  await pressAndStart(page, start)
  await page.mouse.move(destination.x, destination.y, { steps: 12 })

  const during = await boxOf(source)
  expect(during.x).toBeGreaterThan(targetBox.x + targetBox.width)
  await expectFloatingEndpoints(page, edge, source, target)
  const startDuring = await pathPoint(page, edge, 0)
  expect(startDuring.x).toBeLessThan(centerOf(during).x)

  await page.mouse.up()
  await expectFloatingEndpoints(page, edge, source, target)
})

test('simple-floating-edges: endpoints snap to facing side midpoints across an axis flip', async ({
  page,
}) => {
  await page.goto(recipe('simple-floating-edges'))
  const edge = '[data-testid="floating-edge-e-0"]'
  const source = page.locator('.flow-node[data-node-id="left"]')
  const target = page.locator('.flow-node[data-node-id="target"]')
  await expect(page.locator(edge)).toHaveCount(1)

  const sideMidpoints = async () => {
    const s = await boxOf(source)
    const t = await boxOf(target)

    return { s, t }
  }

  const initial = await sideMidpoints()
  expectNear(await pathPoint(page, edge, 0), {
    x: initial.s.x + initial.s.width,
    y: initial.s.y + initial.s.height / 2,
  })
  expectNear(await pathPoint(page, edge, 1), {
    x: initial.t.x,
    y: initial.t.y + initial.t.height / 2,
  })

  const targetCenter = centerOf(initial.t)
  const destination = { x: targetCenter.x - 120, y: targetCenter.y - 160 }
  await pressAndStart(page, centerOf(initial.s))
  await page.mouse.move(destination.x, destination.y, { steps: 12 })

  const during = await sideMidpoints()
  expectNear(await pathPoint(page, edge, 0), {
    x: during.s.x + during.s.width / 2,
    y: during.s.y + during.s.height,
  })
  expectNear(await pathPoint(page, edge, 1), {
    x: during.t.x + during.t.width / 2,
    y: during.t.y,
  })

  await page.mouse.up()
  const after = await sideMidpoints()
  expectNear(await pathPoint(page, edge, 0), {
    x: after.s.x + after.s.width / 2,
    y: after.s.y + after.s.height,
  })
  expectNear(await pathPoint(page, edge, 1), {
    x: after.t.x + after.t.width / 2,
    y: after.t.y,
  })
})

test('easy-connect: node bodies connect into floating edges and strips drag nodes', async ({
  page,
}) => {
  await page.goto(recipe('easy-connect'))
  const status = page.getByTestId('recipe-status')
  await expect(status).toHaveText('edges:')

  const node = (id: string) => page.locator(`.flow-node[data-node-id="${id}"]`)

  /** A body point below the drag strip and away from any default handle position. */
  const bodyPoint = async (id: string) => {
    const box = await boxOf(node(id))

    return { x: box.x + box.width / 2 - 20, y: box.y + box.height / 2 + 10 }
  }

  const one = await bodyPoint('1')
  const two = await bodyPoint('2')
  await pressAndStart(page, one)
  await page.mouse.move((one.x + two.x) / 2, one.y + 40, { steps: 6 })
  await expect(page.getByTestId('easy-connection-line')).toHaveCount(1)
  const cursor = page.getByTestId('easy-connection-cursor')
  await expect(cursor).toHaveCount(1)
  expectNear(centerOf(await boxOf(cursor)), {
    x: (one.x + two.x) / 2,
    y: one.y + 40,
  })

  await page.mouse.move(two.x, two.y, { steps: 6 })
  await page.mouse.up()
  await expect(status).toHaveAttribute('data-pairs', '1>2')
  await expect(page.getByTestId('easy-connection-line')).toHaveCount(0)

  const edge = page.locator('[data-testid^="floating-edge-"]')
  await expect(edge).toHaveCount(1)
  const edgeId = await edge.getAttribute('data-testid')
  const edgeSelector = `[data-testid="${edgeId}"]`
  await expectFloatingEndpoints(page, edgeSelector, node('1'), node('2'))

  const three = await bodyPoint('3')
  await pressAndStart(page, three)
  await page.mouse.move(three.x + 180, three.y - 120, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByTestId('easy-connection-line')).toHaveCount(0)
  await expect(status).toHaveAttribute('data-pairs', '1>2')

  await pressAndStart(page, one)
  await page.mouse.move(one.x + 120, one.y + 120, { steps: 6 })
  await page.mouse.move(one.x, one.y, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByTestId('easy-connection-line')).toHaveCount(0)
  await expect(status).toHaveAttribute('data-pairs', '1>2')

  const strip = node('2').getByTestId('easy-drag-strip')
  const before = await boxOf(node('2'))
  const grip = centerOf(await boxOf(strip))
  await pressAndStart(page, grip)
  await page.mouse.move(grip.x, grip.y + 140, { steps: 10 })
  await page.mouse.up()
  await expect
    .poll(async () => {
      const moved = await boxOf(node('2'))

      return moved.y - before.y
    })
    .toBeGreaterThan(100)
  await expect(status).toHaveAttribute('data-pairs', '1>2')
  await expectFloatingEndpoints(page, edgeSelector, node('1'), node('2'))
})

test('edge-markers: built-in and custom markers resolve with configured style', async ({
  page,
}) => {
  await page.goto(recipe('edge-markers'))
  await expect(page.getByTestId('recipe-edge-m-custom-1')).toHaveCount(1)

  const report = await page.evaluate(() => {
    // eslint-disable-next-line unicorn/consistent-function-scoping -- This helper runs in the page, where module scope is unavailable.
    const resolve = (reference: string | null) => {
      const id = /^url\(#(?<id>.+)\)$/u.exec(reference ?? '')?.groups?.id

      return id === undefined ? null : document.querySelector(`#${id}`)
    }

    const builtIn = (edgeId: string) => {
      const path = document.querySelector(
        `[data-edge-id="${edgeId}"] path[marker-end]`
      )

      return {
        end: resolve(path?.getAttribute('marker-end') ?? null)?.tagName ?? null,
        start:
          resolve(path?.getAttribute('marker-start') ?? null)?.tagName ?? null,
      }
    }

    const custom = (edgeId: string) => {
      const path = document.querySelector(
        `[data-testid="recipe-edge-${edgeId}"]`
      )

      const read = (attribute: string) => {
        const marker = resolve(path?.getAttribute(attribute) ?? null)

        return marker === null
          ? null
          : {
              tag: marker.tagName,
              width: marker.getAttribute('markerWidth'),
              height: marker.getAttribute('markerHeight'),
              fill: marker.firstElementChild?.getAttribute('fill') ?? null,
              glyph: marker.firstElementChild?.tagName ?? null,
            }
      }

      return { start: read('marker-start'), end: read('marker-end') }
    }

    const ids = [...document.querySelectorAll('[id]')].map(({ id }) => id)

    return {
      arrow: builtIn('m-arrow'),
      closed: builtIn('m-closed'),
      both: builtIn('m-both'),
      custom1: custom('m-custom-1'),
      custom2: custom('m-custom-2'),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      customMarkerCount: document.querySelectorAll(
        '[data-testid="custom-marker"]'
      ).length,
    }
  })

  expect(report.arrow).toEqual({ end: 'marker', start: null })
  expect(report.closed).toEqual({ end: 'marker', start: null })
  expect(report.both).toEqual({ end: 'marker', start: 'marker' })
  expect(report.custom1).toEqual({
    start: {
      tag: 'marker',
      width: '16',
      height: '16',
      fill: '#e11d48',
      glyph: 'circle',
    },
    end: {
      tag: 'marker',
      width: '16',
      height: '16',
      fill: '#e11d48',
      glyph: 'polygon',
    },
  })
  expect(report.custom2.start).toMatchObject({
    width: '12',
    fill: '#0ea5e9',
  })
  expect(report.custom2.end).toMatchObject({ width: '12', fill: '#0ea5e9' })
  expect(report.customMarkerCount).toBe(4)
  expect(report.duplicateIds).toEqual([])
})

test('multi-connection-line: one preview line per selected node and one edge each on connect', async ({
  page,
}) => {
  await page.goto(recipe('multi-connection-line'))
  const status = page.getByTestId('recipe-status')
  await expect(status).toHaveText('edges:')

  const handle = (nodeId: string, handleId: string) =>
    page.locator(
      `.flow-handle[data-node-id="${nodeId}"][data-handle-id="${handleId}"]`
    )

  const origin = centerOf(await boxOf(handle('s1', 'out')))
  const pointer = { x: origin.x + 220, y: origin.y + 30 }
  await pressAndStart(page, origin)
  await page.mouse.move(pointer.x, pointer.y, { steps: 8 })

  const lines = page.getByTestId('multi-connection-line')
  await expect(lines).toHaveCount(2)

  const measured = await Promise.all(
    ['s1', 's2'].map(async (nodeId) => {
      const selector = `[data-testid="multi-connection-line"][data-node-id="${nodeId}"]`

      return {
        start: await pathPoint(page, selector, 0),
        end: await pathPoint(page, selector, 1),
        handle: centerOf(await boxOf(handle(nodeId, 'out'))),
      }
    })
  )

  for (const { start, end, handle: handleCenter } of measured) {
    expectNear(start, handleCenter)
    expectNear(end, pointer)
  }

  const drop = centerOf(await boxOf(handle('t', 'in')))
  await page.mouse.move(drop.x, drop.y, { steps: 8 })
  await page.mouse.up()
  await expect(lines).toHaveCount(0)
  await expect
    .poll(async () =>
      ((await status.getAttribute('data-pairs')) ?? '').split(',').toSorted()
    )
    .toEqual(['s1>t', 's2>t'])
})
