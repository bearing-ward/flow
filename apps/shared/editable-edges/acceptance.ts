import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import './demo.ts'

const it = test

const { describe } = test

const read = (page: Page) =>
  page.evaluate(() => {
    if (globalThis.flowEditableDemo === undefined) {
      throw new Error('Missing editable edge demo')
    }

    return globalThis.flowEditableDemo.document()
  })

const history = (page: Page) =>
  page.evaluate(() => globalThis.flowEditableDemo?.history())

const edges = async (page: Page) => {
  const document = await read(page)

  return document.edges
}

const edge = async (page: Page, id = 'ab') => {
  const current = await edges(page)

  return current.find((item) => item.id === id)
}

const edgeCount = async (page: Page) => {
  const current = await edges(page)

  return current.length
}

const route = async (page: Page) => {
  const current = await edge(page)

  return current?.route
}

const points = async (page: Page) => {
  const current = await route(page)

  return current?.mode === 'manual' ? current.points : []
}

const point = (page: Page, index: number) =>
  page
    .locator(
      `[data-flow-route-point][data-edge-id="ab"][data-point-index="${index}"]`
    )
    .first()

const path = (page: Page, id = 'ab') =>
  page
    .locator(`[data-edge-id="${id}"]`)
    .locator('.flow-edge-path, .flow-vue-edge-path, .flow-foldkit-edge-path')
    .first()

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click()

const center = async (locator: ReturnType<Page['locator']>) => {
  const bounds = await locator.boundingBox()

  if (bounds === null) {
    throw new Error('Missing gesture target')
  }

  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

const beginPointDrag = async (page: Page, index = 0) => {
  const start = await center(point(page, index))

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()

  return start
}

const pastCount = async (page: Page) => {
  const current = await history(page)

  return current?.pastCount
}

const assertPathAndLabel = async (page: Page) => {
  const geometry = await path(page).evaluate((visible) => {
    if (!(visible instanceof SVGPathElement)) {
      throw new TypeError('Missing rendered route path')
    }

    const matrix = visible.getScreenCTM()
    const mid = visible.getPointAtLength(visible.getTotalLength() / 2)

    const label = [
      ...document.querySelectorAll(
        '.flow-edge-label, .flow-vue-edge-label, .flow-foldkit-edge-label'
      ),
    ].find((element) => element.textContent === 'Editable route')

    if (matrix === null || label === undefined) {
      throw new Error('Missing route label or screen matrix')
    }

    const expected = new DOMPoint(mid.x, mid.y).matrixTransform(matrix)
    const box = label.getBoundingClientRect()
    const owner = visible.closest('.flow-edge-group, [data-testid="flow-edge"]')

    const hit = owner?.querySelector(
      '.flow-edge-hit, .flow-vue-edge-hit-target, .flow-foldkit-edge-hit-target'
    )

    return {
      d: visible.getAttribute('d'),
      hit: hit?.getAttribute('d'),
      error: Math.hypot(
        box.x + box.width / 2 - expected.x,
        box.y + box.height / 2 - expected.y
      ),
    }
  })

  expect(geometry.hit).toBe(geometry.d)
  expect(geometry.error).toBeLessThan(3)
}

const edgeFocusTargets = {
  vanilla: '.flow-edge-group[data-edge-id="ab"]',
  vue: '[data-edge-id="ab"] .flow-vue-edge-hit-target',
  foldkit: '[data-edge-id="ab"] .flow-foldkit-edge-hit-target',
}

export const editableEdgesAcceptance = (
  host: keyof typeof edgeFocusTargets
): void => {
  describe(`${host} editable and freeform edges`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 900 })
      await page.goto('/editable-edges/')
      await expect(point(page, 0)).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(() => globalThis.flowEditableDemo !== undefined)
        )
        .toBeTruthy()
    })

    it('renders stored graph points as an ordinary labeled selectable edge with one shared interaction path', async ({
      page,
    }) => {
      await expect(path(page)).toHaveAttribute('d', / L280,180 L380,180/u)
      await assertPathAndLabel(page)
      await page.getByText('Editable route', { exact: true }).click()
      await expect
        .poll(async () => {
          const current = await edge(page)

          return current?.selected
        })
        .toBeTruthy()
    })

    it('previews a transformed point drag and commits exactly one undo step', async ({
      page,
    }) => {
      await button(page, 'Transform viewport')
      const canvas = await page.locator('#app').boundingBox()

      if (canvas === null) {
        throw new Error('Missing canvas')
      }

      await expect
        .poll(async () => {
          const position = await center(point(page, 0))

          return Math.hypot(
            position.x - canvas.x - 310,
            position.y - canvas.y - 185
          )
        })
        .toBeLessThan(0.1)
      const start = await beginPointDrag(page)

      await page.mouse.move(start.x + 30, start.y + 22.5, { steps: 5 })
      await expect(path(page)).toHaveAttribute('d', / L320,210 L380,180/u)
      expect(await points(page)).toEqual([
        { x: 280, y: 180 },
        { x: 380, y: 180 },
      ])
      await page.mouse.up()
      await expect
        .poll(() => points(page))
        .toEqual([
          { x: 320, y: 210 },
          { x: 380, y: 180 },
        ])
      await expect.poll(() => pastCount(page)).toBe(1)
      await assertPathAndLabel(page)
      await button(page, 'Undo')
      await expect
        .poll(() => points(page))
        .toEqual([
          { x: 280, y: 180 },
          { x: 380, y: 180 },
        ])
      await button(page, 'Redo')
      await expect(path(page)).toHaveAttribute('d', / L320,210 L380,180/u)
    })

    it('adds a point by double click and removes or moves focused handles without deleting the edge', async ({
      page,
    }) => {
      const canvas = await page.locator('#app').boundingBox()

      if (canvas === null) {
        throw new Error('Missing canvas')
      }

      await page.mouse.dblclick(canvas.x + 430, canvas.y + 140)
      await expect
        .poll(() => points(page))
        .toEqual([
          { x: 280, y: 180 },
          { x: 380, y: 180 },
          { x: 430, y: 140 },
        ])
      await point(page, 2).focus()
      await page.keyboard.press('Shift+ArrowDown')
      await expect
        .poll(() => points(page))
        .toEqual([
          { x: 280, y: 180 },
          { x: 380, y: 180 },
          { x: 430, y: 150 },
        ])
      await point(page, 2).focus()
      await page.keyboard.press('Delete')
      await expect
        .poll(() => points(page))
        .toEqual([
          { x: 280, y: 180 },
          { x: 380, y: 180 },
        ])
      const remaining = await edges(page)

      expect(remaining.map(({ id }) => id)).toEqual(['ab'])
    })

    it('retains points through endpoint motion and native endpoint reconnection', async ({
      page,
    }) => {
      const before = await path(page).getAttribute('d')

      await button(page, 'Move endpoint')
      await expect.poll(() => path(page).getAttribute('d')).not.toBe(before)
      expect(await points(page)).toEqual([
        { x: 280, y: 180 },
        { x: 380, y: 180 },
      ])

      const anchor = page
        .locator(
          '[data-edge-id="ab"] [data-endpoint="target"], [data-edge-id="ab"][data-edge-endpoint="target"], [data-edge-id="ab"] [data-edge-endpoint="target"]'
        )
        .first()

      const start = await center(anchor)

      const end = await center(
        page.locator('[data-node-id="c"] [data-handle-id="in"]').first()
      )

      await page.mouse.move(start.x - 4, start.y)
      await page.mouse.down()
      await page.mouse.move(end.x, end.y, { steps: 8 })
      await page.mouse.up()
      await expect
        .poll(async () => {
          const current = await edge(page)

          return current?.target
        })
        .toBe('c')
      expect(await points(page)).toEqual([
        { x: 280, y: 180 },
        { x: 380, y: 180 },
      ])
      await expect(path(page)).toHaveAttribute('d', / L280,180 L380,180/u)
      await assertPathAndLabel(page)
    })

    it('returns the last removed point to automatic and supports keyboard insertion', async ({
      page,
    }) => {
      await point(page, 0).focus()
      await page.keyboard.press('Delete')
      await expect.poll(() => points(page)).toHaveLength(1)
      await point(page, 0).focus()
      await page.keyboard.press('Backspace')
      await expect.poll(() => route(page)).toEqual({ mode: 'automatic' })
      await expect(path(page)).not.toHaveAttribute('d', / L280,180| L380,180/u)

      const midpoint = await path(page).evaluate((element) => {
        if (!(element instanceof SVGPathElement)) {
          throw new TypeError('Missing edge path')
        }

        const position = element.getPointAtLength(element.getTotalLength() / 2)

        return { x: position.x, y: position.y }
      })

      const target = edgeFocusTargets[host]

      await page.locator(target).focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => points(page)).toEqual([midpoint])
      await expect.poll(() => pastCount(page)).toBe(3)
      await assertPathAndLabel(page)
    })

    it('auto-pans a stationary point drag without changing accepted points before release', async ({
      page,
    }) => {
      const canvas = await page
        .locator('[data-testid="flow-canvas"]')
        .first()
        .boundingBox()

      if (canvas === null) {
        throw new Error('Missing canvas')
      }

      await beginPointDrag(page)
      await page.mouse.move(canvas.x + canvas.width - 5, canvas.y + 400)

      const previewX = () =>
        path(page).evaluate((element) =>
          Number(element.getAttribute('d')?.split(' L')[1]?.split(',')[0])
        )

      await expect.poll(previewX).toBeGreaterThan(canvas.width + 10)
      expect(await points(page)).toEqual([
        { x: 280, y: 180 },
        { x: 380, y: 180 },
      ])
      await page.mouse.up()
      await expect
        .poll(async () => {
          const stored = await points(page)

          return stored[0]?.x
        })
        .toBeGreaterThan(canvas.width + 10)
      await expect.poll(() => pastCount(page)).toBe(1)
      await assertPathAndLabel(page)
    })

    it('saves, loads and copies routes with opaque data and translated graph points', async ({
      page,
    }) => {
      await button(page, 'Save')
      await point(page, 0).focus()
      await page.keyboard.press('ArrowDown')
      await expect
        .poll(() => points(page))
        .toEqual([
          { x: 280, y: 181 },
          { x: 380, y: 180 },
        ])
      await button(page, 'Load')
      await expect
        .poll(() => points(page))
        .toEqual([
          { x: 280, y: 180 },
          { x: 380, y: 180 },
        ])
      await page
        .locator('[data-node-id="a"]')
        .first()
        .click({ position: { x: 40, y: 20 } })
      await page
        .locator('[data-node-id="b"]')
        .first()
        .click({ position: { x: 40, y: 20 }, modifiers: ['Meta'] })
      await button(page, 'Copy')
      await button(page, 'Paste')
      await expect.poll(() => edgeCount(page)).toBe(2)

      const pastedEdges = await edges(page)

      const copied = pastedEdges.at(-1)

      expect(copied).toMatchObject({
        route: {
          mode: 'manual',
          points: [
            { x: 300, y: 200 },
            { x: 400, y: 200 },
          ],
        },
        data: { opaque: { source: 'a', values: [1, null, true] } },
      })
      await expect(path(page, copied?.id)).toHaveAttribute(
        'd',
        / L300,200 L400,200/u
      )
      await button(page, 'Undo')
      await expect.poll(() => edgeCount(page)).toBe(1)
    })

    it('creates a Space-held freeform connection using graph samples and a single history action', async ({
      page,
    }) => {
      const canvas = await page.locator('#app').boundingBox()

      if (canvas === null) {
        throw new Error('Missing canvas')
      }

      const start = await center(
        page.locator('[data-node-id="a"] [data-handle-id="out"]').first()
      )

      const end = await center(
        page.locator('[data-node-id="c"] [data-handle-id="in"]').first()
      )

      await page.mouse.click(canvas.x + 900, canvas.y + 500)
      await expect(page.locator('.flow-foldkit-reconnect-handle')).toHaveCount(
        0
      )
      await page.keyboard.down('Space')
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(canvas.x + 280, canvas.y + 300)
      await page.mouse.move(canvas.x + 430, canvas.y + 380)
      await expect(
        page.locator('path[d*="L280,300"][d*="L430,380"]').first()
      ).toBeVisible()
      await page.mouse.move(end.x, end.y)
      await page.mouse.up()
      await page.keyboard.up('Space')
      await expect.poll(() => edgeCount(page)).toBe(2)

      const createdEdges = await edges(page)

      const freeform = createdEdges.find(({ id }) => id !== 'ab')

      expect(freeform).toMatchObject({
        source: 'a',
        target: 'c',
        route: { mode: 'manual' },
      })
      expect(
        freeform?.route?.mode === 'manual' ? freeform.route.points : []
      ).toEqual(
        expect.arrayContaining([
          { x: 280, y: 300 },
          { x: 430, y: 380 },
        ])
      )
      await expect(path(page, freeform?.id)).toHaveAttribute(
        'd',
        /L280,300 L430,380/u
      )
      await expect.poll(() => pastCount(page)).toBe(1)
      await button(page, 'Undo')
      await expect.poll(() => edgeCount(page)).toBe(1)
    })

    it('orders a backward-drawn loose connection from normalized source to target', async ({
      page,
    }) => {
      await page.goto('/editable-edges/?loose=1')
      await expect(point(page, 0)).toBeVisible()
      const canvas = await page.locator('#app').boundingBox()

      if (canvas === null) {
        throw new Error('Missing canvas')
      }

      const start = await center(
        page.locator('[data-node-id="c"] [data-handle-id="in"]').first()
      )

      const end = await center(
        page.locator('[data-node-id="a"] [data-handle-id="out"]').first()
      )

      await page.mouse.click(canvas.x + 900, canvas.y + 500)
      await expect(page.locator('.flow-foldkit-reconnect-handle')).toHaveCount(
        0
      )
      await page.keyboard.down('Space')
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(canvas.x + 400, canvas.y + 350)
      await page.mouse.move(canvas.x + 280, canvas.y + 300)
      await page.mouse.move(end.x, end.y)
      await page.mouse.up()
      await page.keyboard.up('Space')
      await expect.poll(() => edgeCount(page)).toBe(2)
      const createdEdges = await edges(page)
      const freeform = createdEdges.find(({ id }) => id !== 'ab')
      expect(freeform).toMatchObject({
        source: 'a',
        target: 'c',
        route: { mode: 'manual' },
      })
      await expect(path(page, freeform?.id)).toHaveAttribute(
        'd',
        /L280,300 L400,350/u
      )
      await expect.poll(() => pastCount(page)).toBe(1)
      await button(page, 'Undo')
      await expect.poll(() => edgeCount(page)).toBe(1)
    })

    it('cancels point and freeform gestures without history and revokes stale releases on disposal', async ({
      page,
    }) => {
      const original = await path(page).getAttribute('d')
      const start = await beginPointDrag(page)

      await page.mouse.move(start.x + 40, start.y + 30)
      await page.keyboard.press('Escape')
      await page.mouse.up()
      await expect(path(page)).toHaveAttribute('d', original ?? '')
      expect(await pastCount(page)).toBe(0)

      const source = await center(
        page.locator('[data-node-id="a"] [data-handle-id="out"]').first()
      )

      await page.keyboard.down('Space')
      await page.mouse.move(source.x, source.y)
      await page.mouse.down()
      await page.mouse.move(source.x + 100, source.y + 160)
      await page.keyboard.press('Escape')
      await page.mouse.up()
      await page.keyboard.up('Space')
      expect(await edgeCount(page)).toBe(1)
      expect(await pastCount(page)).toBe(0)

      const next = await beginPointDrag(page)

      await page.mouse.move(next.x + 20, next.y + 20)
      await page.evaluate(() => globalThis.flowEditableDemo?.dispose())
      await page.mouse.up()
      await expect(page.locator('#app [data-node-id]')).toHaveCount(0)
      await expect(page.locator('[data-flow-route-point]')).toHaveCount(0)
    })
  })
}
