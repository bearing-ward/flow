import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const it = test

const { describe } = test

const node = (page: Page, id = 'a') =>
  page.locator(`[data-node-id="${id}"]`).first()

const read = (page: Page) =>
  page.evaluate(() => {
    const demo = globalThis.flowHelperLinesDemo

    if (demo === undefined) {
      throw new Error('Missing helper lines demo')
    }

    return demo.document()
  })

const position = async (page: Page, id = 'a') => {
  const document = await read(page)

  return document.nodes.find((n) => n.id === id)?.position
}

const history = (page: Page) =>
  page.evaluate(() => globalThis.flowHelperLinesDemo?.history())

const guide = (page: Page, axis: string) =>
  page.locator(`[data-helper-axis="${axis}"]`)

const open = async (page: Page, query = '') => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto(`/helper-lines/${query}`)
  await expect(node(page)).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.flowHelperLinesDemo !== undefined)
    )
    .toBe(true)
}

const drag = async (page: Page, dx: number, dy: number, zoom = 1) => {
  const box = await node(page).boundingBox()

  if (box === null) {
    throw new Error('Missing drag node')
  }

  await page.mouse.move(box.x + 25 * zoom, box.y + 25 * zoom)
  await page.mouse.down()
  await page.mouse.move(box.x + (25 + dx) * zoom, box.y + (25 + dy) * zoom, {
    steps: 8,
  })
}

const finish = async (page: Page, expected: { x: number; y: number }) => {
  await page.mouse.up()
  await expect.poll(() => position(page)).toEqual(expected)
  await expect(page.locator('[data-helper-axis]')).toHaveCount(0)
}

const initialPan = { x: 0, y: 0 }

const checkRendered = async (
  page: Page,
  x: number,
  y: number,
  zoom = 1,
  pan = initialPan
) => {
  const coordinate = async (axis: 'x' | 'y') => {
    const box = await node(page).boundingBox()

    const canvas = await page
      .locator('.flow-canvas, .flow-vue-canvas, .flow-foldkit-canvas')
      .boundingBox()

    if (box === null || canvas === null) {
      throw new Error('Missing rendered bounds')
    }

    return box[axis] - canvas[axis]
  }

  await expect.poll(() => coordinate('x')).toBeCloseTo(x * zoom + pan.x, 0)
  await expect.poll(() => coordinate('y')).toBeCloseTo(y * zoom + pan.y, 0)
}

const checkGuide = async (
  page: Page,
  axis: string,
  coordinate: number,
  zoom = 1,
  pan = initialPan
) => {
  await expect(guide(page, axis)).toHaveAttribute(
    'data-coordinate',
    String(coordinate)
  )
  const line = await guide(page, axis).boundingBox()

  const canvas = await page
    .locator('.flow-canvas, .flow-vue-canvas, .flow-foldkit-canvas')
    .boundingBox()

  if (line === null || canvas === null) {
    throw new Error('Missing rendered guide')
  }

  const actual = axis === 'x' ? line.x - canvas.x : line.y - canvas.y
  const offset = axis === 'x' ? pan.x : pan.y
  expect(actual).toBeCloseTo(coordinate * zoom + offset, 0)
}

export const helperLinesAcceptance = (host: string): void => {
  describe(`${host} alignment helper lines`, () => {
    it('shows horizontal/vertical edge guides, commits accepted geometry and one history step', async ({
      page,
    }) => {
      await open(page)
      await drag(page, 296, 196)
      await checkGuide(page, 'x', 400)
      await checkGuide(page, 'y', 300)
      await checkRendered(page, 400, 300)
      await finish(page, { x: 400, y: 300 })
      await expect
        .poll(async () => {
          const status = await history(page)

          return status?.pastCount
        })
        .toBe(1)
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect.poll(() => position(page)).toEqual({ x: 100, y: 100 })
      await checkRendered(page, 100, 100)
      await page.getByRole('button', { name: 'Redo', exact: true }).click()
      await expect.poll(() => position(page)).toEqual({ x: 400, y: 300 })
      await checkRendered(page, 400, 300)
    })

    it('snaps centers before grid and copies the final authored positions', async ({
      page,
    }) => {
      await open(page, '?grid')
      await drag(page, 317, 207)
      await expect(guide(page, 'x')).toHaveAttribute('data-coordinate', '470')
      await expect(guide(page, 'y')).toHaveAttribute('data-coordinate', '340')
      await checkRendered(page, 420, 310)
      await finish(page, { x: 420, y: 310 })
      await page.getByRole('button', { name: 'Copy', exact: true }).click()
      await page.getByRole('button', { name: 'Paste', exact: true }).click()
      await expect
        .poll(() => position(page, 'a-copy-1'))
        .toEqual({ x: 440, y: 330 })
    })

    it('aligns right and bottom edges with different measured node sizes', async ({
      page,
    }) => {
      await open(page)
      await drag(page, 336, 216)
      await checkGuide(page, 'x', 540)
      await checkGuide(page, 'y', 380)
      await checkRendered(page, 440, 320)
      await finish(page, { x: 440, y: 320 })
    })

    it('activates at the inclusive tolerance boundary and clears outside it', async ({
      page,
    }) => {
      await open(page)
      await drag(page, 294, 150)
      await expect(guide(page, 'x')).toHaveAttribute('data-coordinate', '400')
      const box = await node(page).boundingBox()

      if (box === null) {
        throw new Error('Missing node')
      }

      await page.mouse.move(box.x + 18, box.y + 25)
      await expect(guide(page, 'x')).toHaveCount(0)
      await finish(page, { x: 393, y: 250 })
    })

    it('keeps a multi-selection rigid and excludes its own members', async ({
      page,
    }) => {
      await open(page, '?scenario=multi')
      await drag(page, 296, 96)
      await expect(guide(page, 'x')).toHaveAttribute('data-coordinate', '400')
      await expect(guide(page, 'y')).toHaveAttribute('data-coordinate', '300')
      await finish(page, { x: 400, y: 200 })
      await expect.poll(() => position(page, 'c')).toEqual({ x: 400, y: 300 })
      await expect
        .poll(async () => {
          const status = await history(page)

          return status?.pastCount
        })
        .toBe(1)
    })

    it('aligns nested parent-relative nodes without a coordinate jump', async ({
      page,
    }) => {
      await open(page, '?scenario=nested')
      await drag(page, 296, 196)
      await expect(guide(page, 'x')).toHaveAttribute('data-coordinate', '400')
      await expect(guide(page, 'y')).toHaveAttribute('data-coordinate', '300')
      await finish(page, { x: 350, y: 250 })
      await checkRendered(page, 400, 300)
    })

    it('converts CSS tolerance and renders graph-space guides under pan and zoom', async ({
      page,
    }) => {
      await open(page)
      await page
        .getByRole('button', { name: 'Transform viewport', exact: true })
        .click()
      await checkRendered(page, 100, 100, 0.75, { x: 100, y: 50 })
      await drag(page, 292, 202, 0.75)
      await checkGuide(page, 'x', 400, 0.75, { x: 100, y: 50 })
      await checkGuide(page, 'y', 300, 0.75, { x: 100, y: 50 })
      await checkRendered(page, 400, 300, 0.75, { x: 100, y: 50 })
      await finish(page, { x: 400, y: 300 })
    })

    it('clears previews on pointer cancellation and disposal without history', async ({
      page,
    }) => {
      await open(page)
      await drag(page, 296, 196)
      await expect(guide(page, 'x')).toBeVisible()
      await node(page).dispatchEvent('pointercancel', {
        pointerId: 1,
        bubbles: true,
      })
      await page.mouse.up()
      await expect(page.locator('[data-helper-axis]')).toHaveCount(0)
      await expect.poll(() => position(page)).toEqual({ x: 100, y: 100 })
      await expect
        .poll(async () => {
          const status = await history(page)

          return status?.pastCount
        })
        .toBe(0)
      await drag(page, 296, 196)
      await expect(guide(page, 'x')).toBeVisible()
      await page.evaluate(() => globalThis.flowHelperLinesDemo?.dispose())
      await page.mouse.up()
      await expect(page.locator('[data-helper-axis]')).toHaveCount(0)
    })

    it('recomputes alignment during captured auto-pan and commits the visible position', async ({
      page,
    }) => {
      await open(page)
      await page.setViewportSize({ width: 700, height: 900 })
      await drag(page, 296, 196)

      const canvas = await page
        .locator('.flow-canvas, .flow-vue-canvas, .flow-foldkit-canvas')
        .boundingBox()

      if (canvas === null) {
        throw new Error('Missing canvas')
      }

      const before = await node(page, 'b').boundingBox()

      if (before === null) {
        throw new Error('Missing auto-pan target')
      }

      await page.mouse.move(canvas.x + canvas.width - 5, canvas.y + 325)
      await expect
        .poll(async () => {
          const box = await node(page).boundingBox()

          return box?.x
        })
        .toBeGreaterThan(600)
      await expect
        .poll(async () => {
          const box = await node(page, 'b').boundingBox()

          return box?.x
        })
        .toBeLessThan(before.x - 5)
      await expect(guide(page, 'y')).toHaveAttribute('data-coordinate', '300')
      // Return to the target's visible left edge after the viewport has moved.
      const target = await node(page, 'b').boundingBox()

      if (target === null) {
        throw new Error('Missing target')
      }

      await page.mouse.move(target.x + 25, target.y + 25)
      await expect(guide(page, 'x')).toHaveAttribute('data-coordinate', '400')
      await expect(guide(page, 'y')).toHaveAttribute('data-coordinate', '300')
      await finish(page, { x: 400, y: 300 })
    })
  })
}
