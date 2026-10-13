import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

interface Point {
  readonly x: number
  readonly y: number
}

interface Box {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

const open = async (page: Page, scene: string) => {
  await page.goto(`/ui-recipes/edge-recipes/?scene=${scene}`)
  await expect(page.getByTestId('recipe-status')).toHaveText(/^edges:/u)
}

const edgePath = (page: Page, edgeId: string) =>
  page.locator(
    `[data-testid="recipe-edge-path"][data-recipe-edge-id="${edgeId}"]`
  )

/** A screen point along an SVG path, mapped through its screen CTM. */
const pointAt = (path: Locator, fraction: number): Promise<Point> =>
  path.evaluate((element, at) => {
    if (!(element instanceof SVGPathElement)) {
      throw new Error('Expected an SVG path')
    }

    const matrix = element.getScreenCTM()

    if (matrix === null) {
      throw new Error('Path has no screen matrix')
    }

    const point = element.getPointAtLength(element.getTotalLength() * at)
    const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix)

    return { x: screen.x, y: screen.y }
  }, fraction)

const endpoints = async (path: Locator) => ({
  start: await pointAt(path, 0),
  end: await pointAt(path, 1),
})

const centerOf = async (locator: Locator): Promise<Point> => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Element is not rendered')
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const nodeBox = async (page: Page, nodeId: string): Promise<Box> => {
  const box = await page.locator(`[data-node-id="${nodeId}"]`).boundingBox()

  if (box === null) {
    throw new Error(`Node ${nodeId} is not rendered`)
  }

  return {
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
  }
}

const expectNear = (actual: Point, expected: Point, tolerance = 2) => {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance)
}

type Side = 'left' | 'right' | 'top' | 'bottom'

/** The point lies on the given side of the box, within 2px. */
const expectOnSide = (point: Point, box: Box, side: Side) => {
  const tolerance = 2

  switch (side) {
    case 'left':
    case 'right': {
      expect(Math.abs(point.x - box[side])).toBeLessThanOrEqual(tolerance)
      expect(point.y).toBeGreaterThanOrEqual(box.top - tolerance)
      expect(point.y).toBeLessThanOrEqual(box.bottom + tolerance)
      break
    }

    default: {
      expect(Math.abs(point.y - box[side])).toBeLessThanOrEqual(tolerance)
      expect(point.x).toBeGreaterThanOrEqual(box.left - tolerance)
      expect(point.x).toBeLessThanOrEqual(box.right + tolerance)
    }
  }
}

const sideMidpoint = (box: Box, side: Side): Point => {
  const middle = {
    x: (box.left + box.right) / 2,
    y: (box.top + box.bottom) / 2,
  }

  switch (side) {
    case 'left':
    case 'right': {
      return { x: box[side], y: middle.y }
    }

    default: {
      return { x: middle.x, y: box[side] }
    }
  }
}

/** Real mouse drag; moves 2px past the 1px threshold before travelling. */
const dragBy = async (
  page: Page,
  from: Point,
  delta: Point,
  beforeRelease?: () => Promise<void>
) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y)
  await page.mouse.move(from.x + delta.x, from.y + delta.y, { steps: 8 })
  await beforeRelease?.()
  await page.mouse.up()
}

test('Edge with Button deletes its edge by click and by keyboard', async ({
  page,
}) => {
  await open(page, 'button-edge')
  const status = page.getByTestId('recipe-status')
  await expect(status).toHaveText('edges:e-ab,e-bc')

  const button = page.getByRole('button', { name: 'Delete edge e-ab' })
  await expect(button).toHaveCSS('pointer-events', 'all')
  expectNear(await centerOf(button), await pointAt(edgePath(page, 'e-ab'), 0.5))

  await button.click()
  await expect(edgePath(page, 'e-ab')).toHaveCount(0)
  await expect(button).toHaveCount(0)
  await expect(status).toHaveText('edges:e-bc')

  const keyboard = page.getByRole('button', { name: 'Delete edge e-bc' })
  await keyboard.focus()
  await expect(keyboard).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(edgePath(page, 'e-bc')).toHaveCount(0)
  await expect(keyboard).toHaveCount(0)
  await expect(status).toHaveText('edges:')
})

test('Edge with Node Data shows the source node value and follows updates', async ({
  page,
}) => {
  await open(page, 'data-edge')
  const label = page.getByTestId('data-edge-label')
  await expect(label).toHaveText('alpha')
  expectNear(await centerOf(label), await pointAt(edgePath(page, 'e-ab'), 0.5))

  await page.getByTestId('update-node-data').click()
  await expect(label).toHaveText('beta')
  expectNear(await centerOf(label), await pointAt(edgePath(page, 'e-ab'), 0.5))
})

test('Animated SVG Edge moves a shape and parks it under reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await open(page, 'animated-svg-edge')
  const mover = page.getByTestId('animated-svg-shape')
  const motion = mover.locator('animateMotion')
  const path = edgePath(page, 'e-ab')

  await expect(motion).toHaveCount(1)
  await expect(motion).toHaveAttribute(
    'path',
    (await path.getAttribute('d')) ?? ''
  )
  const first = await centerOf(mover)
  await expect
    .poll(async () => {
      const second = await centerOf(mover)

      return Math.hypot(second.x - first.x, second.y - first.y)
    })
    .toBeGreaterThan(2)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(motion).toHaveCount(0)
  const midpoint = await pointAt(path, 0.5)
  expectNear(await centerOf(mover), midpoint)
  await page.waitForTimeout(400)
  expectNear(await centerOf(mover), midpoint)
})

for (const { scene, simple, delta, after } of [
  {
    scene: 'floating-edges',
    simple: false,
    delta: { x: 480, y: 0 },
    after: ['left', 'right'] as const,
  },
  {
    // The drag makes the vertical axis dominant.
    scene: 'simple-floating-edges',
    simple: true,
    delta: { x: 160, y: 244 },
    after: ['top', 'bottom'] as const,
  },
]) {
  test(`${scene} attach to the facing node borders and follow a drag`, async ({
    page,
  }) => {
    await open(page, scene)
    const path = edgePath(page, 'e-4')

    const expectFacing = async (sourceSide: Side, targetSide: Side) => {
      const source = await nodeBox(page, 's-left')
      const target = await nodeBox(page, 'target')
      const { start, end } = await endpoints(path)

      if (simple) {
        expectNear(start, sideMidpoint(source, sourceSide))
        expectNear(end, sideMidpoint(target, targetSide))
      } else {
        expectOnSide(start, source, sourceSide)
        expectOnSide(end, target, targetSide)
      }
    }

    await expect(() => expectFacing('right', 'left')).toPass()

    // The node and its floating edge follow the pointer before the drop.
    const node = page.locator('[data-node-id="s-left"]')
    const before = await nodeBox(page, 's-left')

    await dragBy(page, await centerOf(node), delta, async () => {
      await expect
        .poll(async () => {
          const live = await nodeBox(page, 's-left')

          return live.left
        })
        .toBeGreaterThan(before.left + delta.x - 5)
      await expect(() => expectFacing(after[0], after[1])).toPass()
    })

    await expect
      .poll(async () => {
        const moved = await nodeBox(page, 's-left')

        return moved.left
      })
      .toBeGreaterThan(before.left + delta.x - 5)
    await expect(() => expectFacing(after[0], after[1])).toPass()
  })
}

test('Easy Connect connects node bodies with floating edges', async ({
  page,
}) => {
  await open(page, 'easy-connect')
  const status = page.getByTestId('recipe-status')
  const n1 = page.locator('[data-node-id="n1"]')
  const n2 = page.locator('[data-node-id="n2"]')

  const body = async (locator: Locator): Promise<Point> => {
    const center = await centerOf(locator)

    return { x: center.x, y: center.y + 12 }
  }

  // Wait for measured, body-sized handles before connecting.
  await expect
    .poll(
      async () =>
        await n1
          .locator('[data-handle-id="source"]')
          .evaluate((element) => element.getBoundingClientRect().width)
    )
    .toBeGreaterThan(100)

  const connect = async (from: Point, to: Point) => {
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + 3, from.y)
    await page.mouse.move(to.x, to.y, { steps: 8 })
    await expect(page.getByTestId('easy-connection-line')).toBeVisible()
    expectNear(await centerOf(page.getByTestId('easy-connection-cursor')), to)
    await page.mouse.up()
    await expect(page.getByTestId('easy-connection-line')).toHaveCount(0)
  }

  // Empty pane: no edge.
  await connect(await body(n1), { x: 480, y: 330 })
  await expect(status).toHaveText('edges:')

  // Back onto the origin node: no self edge.
  const start = await body(n1)
  await connect(start, { x: start.x + 20, y: start.y + 10 })
  await expect(status).toHaveText('edges:')

  await connect(await body(n1), await body(n2))
  await expect(page.locator('[data-testid="flow-edge"]')).toHaveCount(1)
  const edge = page.locator('[data-testid="flow-edge"]')
  await expect(edge).toHaveAttribute('data-source-id', 'n1')
  await expect(edge).toHaveAttribute('data-target-id', 'n2')
  await expect(edge).toHaveAttribute('data-edge-type', 'floating')
  const edgeId = (await edge.getAttribute('data-edge-id')) ?? ''
  await expect(status).toHaveText(`edges:${edgeId}`)
  const path = edgePath(page, edgeId)

  const facing = async (sourceSide: Side, targetSide: Side) => {
    const { start: from, end: to } = await endpoints(path)
    expectOnSide(from, await nodeBox(page, 'n1'), sourceSide)
    expectOnSide(to, await nodeBox(page, 'n2'), targetSide)
  }

  await expect(() => facing('right', 'left')).toPass()

  // The strip drags the node; the floating edge follows after the drop.
  const strip = n2.getByTestId('easy-drag-strip')
  const before = await nodeBox(page, 'n2')
  await dragBy(page, await centerOf(strip), { x: -240, y: 300 })
  await expect
    .poll(async () => {
      const moved = await nodeBox(page, 'n2')

      return moved.top
    })
    .toBeGreaterThan(before.top + 250)
  await expect(status).toHaveText(`edges:${edgeId}`)
  await expect(() => facing('bottom', 'top')).toPass()
})

test('Edge Markers resolve built-in and custom marker references', async ({
  page,
}) => {
  await open(page, 'edge-markers')

  const refs = await page.evaluate(() =>
    [...document.querySelectorAll<SVGElement>('[data-testid="flow-edge"]')].map(
      (edge) => {
        const visible =
          edge.querySelector('.flow-foldkit-edge-path') ??
          edge.querySelector('[data-testid="recipe-edge-path"]')

        const resolve = (attribute: string) => {
          const value = visible?.getAttribute(attribute) ?? null
          const id = /^url\(#(?<id>.+)\)$/u.exec(value ?? '')?.groups?.['id']

          const marker =
            id === undefined ? null : document.querySelector(`#${id}`)

          return {
            value,
            resolved: marker instanceof SVGMarkerElement,
            fill:
              marker?.querySelector('circle, path')?.getAttribute('fill') ??
              null,
            width: marker?.getAttribute('markerWidth') ?? null,
            height: marker?.getAttribute('markerHeight') ?? null,
          }
        }

        return {
          id: edge.dataset.edgeId,
          start: resolve('marker-start'),
          end: resolve('marker-end'),
        }
      }
    )
  )

  const byId = new Map(refs.map((ref) => [ref.id, ref]))
  expect(byId.get('mk-arrow')?.end.resolved).toBe(true)
  expect(byId.get('mk-arrow')?.start.value).toBeNull()
  expect(byId.get('mk-closed')?.end.resolved).toBe(true)
  expect(byId.get('mk-both')?.start.resolved).toBe(true)
  expect(byId.get('mk-both')?.end.resolved).toBe(true)

  const custom = byId.get('mk-custom')

  for (const end of [custom?.start, custom?.end]) {
    expect(end?.resolved).toBe(true)
    expect(end?.fill).toBe('#e11d48')
    expect(end?.width).toBe('16')
    expect(end?.height).toBe('16')
  }

  await expect(page.getByTestId('custom-marker')).toHaveCount(2)
  await expect(page.getByTestId('custom-marker').locator('circle')).toHaveCount(
    1
  )

  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('[id]')].map((element) => element.id)
  )

  expect(new Set(ids).size).toBe(ids.length)
})

test('Multi Connection Line draws one line per selected node and connects them all', async ({
  page,
}) => {
  await open(page, 'multi-connection-line')
  const status = page.getByTestId('recipe-status')
  await expect(status).toHaveAttribute('data-handles', /s1:out,s2:out,s3:out/u)

  const handle = (nodeId: string, handleId: string) =>
    page.locator(`[data-node-id="${nodeId}"] [data-handle-id="${handleId}"]`)

  const from = await centerOf(handle('s1', 'out'))
  const pointer = { x: from.x + 200, y: from.y + 60 }

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y)
  await page.mouse.move(pointer.x, pointer.y, { steps: 6 })

  const lines = page.getByTestId('multi-connection-line')
  await expect(lines).toHaveCount(2)

  const measured = await Promise.all(
    ['s1', 's2'].map(async (nodeId) => ({
      line: await endpoints(
        page.locator(
          `[data-testid="multi-connection-line"][data-node-id="${nodeId}"]`
        )
      ),
      handle: await centerOf(handle(nodeId, 'out')),
    }))
  )

  for (const { line, handle: center } of measured) {
    expectNear(line.start, center)
    expectNear(line.end, pointer)
  }

  const drop = await centerOf(handle('t', 'in'))
  await page.mouse.move(drop.x, drop.y, { steps: 6 })
  await page.mouse.up()
  await expect(lines).toHaveCount(0)

  const edges = page.locator('[data-testid="flow-edge"]')
  await expect(edges).toHaveCount(2)

  const pairs = await edges.evaluateAll((elements) =>
    elements
      .map(
        (element) => `${element.dataset.sourceId}->${element.dataset.targetId}`
      )
      .toSorted()
  )

  expect(pairs).toEqual(['s1->t', 's2->t'])
  await expect(status).toHaveText(/^edges:.+,.+$/u)
})
