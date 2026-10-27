import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { RotationDemo } from './demo.ts'

const it = test

const { describe } = test

const node = (page: Page, id = 'a') =>
  page.locator(`[data-testid="flow-node"][data-node-id="${id}"]`)

const read = (page: Page) =>
  page.evaluate(() => {
    if (globalThis.flowRotationDemo === undefined) {
      throw new Error('Missing rotation recipe')
    }

    return globalThis.flowRotationDemo.document()
  })

const rotation = async (page: Page, id = 'a') => {
  const current = await read(page)

  return current.nodes.find((item) => item.id === id)?.rotation
}

const past = (page: Page) =>
  page.evaluate(async () => {
    if (globalThis.flowRotationDemo === undefined) {
      throw new Error('Missing rotation recipe')
    }

    const history = await globalThis.flowRotationDemo.history()

    return history.pastCount
  })

const click = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click()

const start = async (page: Page, degrees: number, id = 'a') => {
  const box = await node(page, id).boundingBox()

  const control = await node(page, id)
    .getByRole('button', { name: `Rotate ${id}`, exact: true })
    .boundingBox()

  if (box === null || control === null) {
    throw new Error('Missing rotation handle')
  }

  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const x = control.x + control.width / 2
  const y = control.y + control.height / 2
  const distance = Math.hypot(x - center.x, y - center.y)

  const angle =
    Math.atan2(y - center.y, x - center.x) + (degrees * Math.PI) / 180

  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(
    center.x + Math.cos(angle) * distance,
    center.y + Math.sin(angle) * distance,
    { steps: 12 }
  )
}

/** Compare the actual SVG endpoint with the outside of each rotated physical handle. */
const attached = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() => {
        const path = document.querySelector(
          '.flow-edge-path, .flow-vue-edge-path, .flow-foldkit-edge-path'
        )

        if (!(path instanceof SVGPathElement)) {
          return 999
        }

        const matrix = path.getScreenCTM()

        if (matrix === null) {
          return 999
        }

        const endpoints = [
          path.getPointAtLength(0).matrixTransform(matrix),
          path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix),
        ]

        return Math.max(
          ...['a', 'b'].map((id, index) => {
            const element = document.querySelector(
              `[data-testid="flow-node"][data-node-id="${id}"]`
            )

            const handle = element?.querySelector(
              `[data-handle-id="${id === 'a' ? 'source' : 'target'}"]`
            )

            const endpoint = endpoints[index]

            if (
              !(element instanceof HTMLElement) ||
              !(handle instanceof HTMLElement) ||
              endpoint === undefined
            ) {
              return 999
            }

            const rect = handle.getBoundingClientRect()

            const radians =
              (Number(element.dataset.rotation ?? 0) * Math.PI) / 180

            const zoom = Math.hypot(matrix.a, matrix.b)

            const displacement =
              (handle.offsetWidth / 2) * zoom * (id === 'a' ? 1 : -1)

            return Math.hypot(
              endpoint.x -
                (rect.x + rect.width / 2 + Math.cos(radians) * displacement),
              endpoint.y -
                (rect.y + rect.height / 2 + Math.sin(radians) * displacement)
            )
          })
        )
      })
    )
    .toBeLessThan(1.5)

const semantic = (input: Awaited<ReturnType<RotationDemo['document']>>) => ({
  nodes: input.nodes.map(
    ({ selected: _selected, measured: _measured, ...item }) => item
  ),
  edges: input.edges.map(({ selected: _selected, ...item }) => item),
})

export const rotationAcceptance = (host: string) => {
  describe(`${host} rotatable node`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1100, height: 850 })
      await page.goto('/rotatable-node/')
      await expect(
        node(page).getByRole('button', { name: 'Rotate a', exact: true })
      ).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(() => globalThis.flowRotationDemo !== undefined)
        )
        .toBe(true)
      await attached(page)
    })

    for (const degrees of [45, 90, 180, 270]) {
      it(`rotates ${degrees} degrees with live connected edges and exactly one undo step`, async ({
        page,
      }) => {
        const count = await past(page)
        await start(page, degrees)
        expect(await rotation(page)).toBe(0)
        expect(await past(page)).toBe(count)
        await expect
          .poll(async () =>
            Number(await node(page).getAttribute('data-rotation'))
          )
          .toBeCloseTo(degrees, 1)
        await attached(page)
        await page.mouse.up()
        await expect.poll(() => rotation(page)).toBeCloseTo(degrees, 1)
        await expect.poll(() => past(page)).toBe(count + 1)
        await attached(page)
        await click(page, 'Undo')
        await expect.poll(() => rotation(page)).toBe(0)
        await attached(page)
        await click(page, 'Redo')
        await expect.poll(() => rotation(page)).toBeCloseTo(degrees, 1)
        await attached(page)
      })
    }

    it('rotates shapes and noncentral custom handles after measurement refresh and zoom', async ({
      page,
    }) => {
      await click(page, 'Transform viewport')
      await expect
        .poll(async () => {
          const bounds = await node(page).boundingBox()

          return bounds?.width
        })
        .toBeCloseTo(120, 1)
      await start(page, 45, 'b')
      await page.mouse.up()
      await expect.poll(() => rotation(page, 'b')).toBeCloseTo(45, 1)
      await expect(node(page, 'b').locator('[data-shape-svg]')).toBeVisible()
      await page.evaluate(async () => {
        if (globalThis.flowRotationDemo === undefined) {
          throw new Error('Missing demo')
        }

        await globalThis.flowRotationDemo.edit({
          operations: [
            { kind: 'update-node', nodeId: 'a', patch: { rotation: 135 } },
          ],
        })
      })
      await page.evaluate(async () => {
        if (globalThis.flowRotationDemo === undefined) {
          throw new Error('Missing demo')
        }

        const handle = document.querySelector(
          '[data-testid="flow-node"][data-node-id="a"] [data-handle-id="source"]'
        )

        if (!(handle instanceof HTMLElement)) {
          throw new TypeError('Missing source handle')
        }

        handle.style.top = '25%'
        await globalThis.flowRotationDemo.refresh('a')
      })
      await attached(page)
    })

    it('keeps rotation and metadata through v6 save/load and copy/paste', async ({
      page,
    }) => {
      await start(page, 90)
      await page.mouse.up()
      await expect.poll(() => rotation(page)).toBeCloseTo(90, 1)
      const beforeCopy = await read(page)
      expect(
        beforeCopy.nodes.find((item) => item.id === 'a')?.selected
      ).toBeTruthy()
      await click(page, 'Copy')
      await click(page, 'Paste')
      await expect.poll(() => rotation(page, 'a-copy-1')).toBeCloseTo(90, 1)
      const copied = await read(page)
      expect(copied.nodes.find((item) => item.id === 'a-copy-1')?.data).toEqual(
        { opaque: ['rotation', 167] }
      )
      await click(page, 'Save')
      expect(
        await page.evaluate(() => globalThis.flowRotationDemo?.saved()?.version)
      ).toBe(6)
      const saved = semantic(await read(page))
      await page.evaluate(async () => {
        if (globalThis.flowRotationDemo === undefined) {
          throw new Error('Missing demo')
        }

        await globalThis.flowRotationDemo.edit({
          operations: [
            { kind: 'update-node', nodeId: 'a', patch: { rotation: 12 } },
          ],
        })
      })
      await click(page, 'Load')
      await expect.poll(async () => semantic(await read(page))).toEqual(saved)
      await attached(page)
    })

    it('connects to a rotated handle through native pointer input', async ({
      page,
    }) => {
      await start(page, 90)
      await page.mouse.up()
      await expect.poll(() => rotation(page)).toBeCloseTo(90, 1)
      await page.evaluate(async () => {
        if (globalThis.flowRotationDemo === undefined) {
          throw new Error('Missing demo')
        }

        await globalThis.flowRotationDemo.edit({
          operations: [{ kind: 'set-edges', edges: [] }],
        })
      })

      const source = await node(page)
        .locator('[data-handle-id="source"]')
        .boundingBox()

      const target = await node(page, 'b')
        .locator('[data-handle-id="target"]')
        .boundingBox()

      if (source === null || target === null) {
        throw new Error('Missing connection handles')
      }

      await page.mouse.move(
        source.x + source.width / 2,
        source.y + source.height / 2
      )
      await page.mouse.down()
      await page.mouse.move(
        target.x + target.width / 2,
        target.y + target.height / 2,
        { steps: 16 }
      )
      await page.mouse.up()
      await expect
        .poll(async () => {
          const current = await read(page)

          return current.edges.length
        })
        .toBe(1)
      await attached(page)
    })

    it('pans and zooms with native input, then rotates in flow coordinates', async ({
      page,
    }) => {
      const count = await past(page)
      const original = await node(page).boundingBox()
      const app = await page.locator('#app').boundingBox()

      if (original === null || app === null) {
        throw new Error('Missing canvas')
      }

      await page.mouse.move(app.x + 20, app.y + 490)
      await page.mouse.down()
      await page.mouse.move(app.x + 80, app.y + 520, { steps: 8 })
      await page.mouse.up()
      await expect
        .poll(async () => {
          const bounds = await node(page).boundingBox()

          return bounds?.x
        })
        .toBeCloseTo(original.x + 60, 0)
      await page.mouse.wheel(0, -100)
      await expect
        .poll(async () => {
          const bounds = await node(page).boundingBox()

          return bounds?.width
        })
        .toBeGreaterThan(original.width)
      expect(await past(page)).toBe(count)
      await attached(page)
      await start(page, 90)
      await page.mouse.up()
      await expect.poll(() => rotation(page)).toBeCloseTo(90, 1)
      await attached(page)
    })

    for (const reason of [
      'escape',
      'blur',
      'pointercancel',
      'lostcapture',
      'replacement',
    ] as const) {
      it(`cancels ${reason} without accepting rotation or adding history`, async ({
        page,
      }) => {
        const count = await past(page)
        await start(page, 90)
        await expect
          .poll(async () =>
            Number(await node(page).getAttribute('data-rotation'))
          )
          .toBeCloseTo(90, 1)

        if (reason === 'escape') {
          await page.keyboard.press('Escape')
        }

        if (reason === 'blur') {
          await page.evaluate(() => window.dispatchEvent(new Event('blur')))
        }

        if (reason === 'pointercancel') {
          await page.evaluate(() =>
            document.dispatchEvent(
              new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })
            )
          )
        }

        if (reason === 'lostcapture') {
          await page.evaluate(() => {
            for (const element of document.querySelectorAll('*')) {
              if (element.hasPointerCapture(1)) {
                element.releasePointerCapture(1)
              }
            }
          })
        }

        if (reason === 'replacement') {
          await page.evaluate(async () => {
            if (globalThis.flowRotationDemo === undefined) {
              throw new Error('Missing demo')
            }

            await globalThis.flowRotationDemo.edit({
              operations: [
                {
                  kind: 'update-node',
                  nodeId: 'a',
                  patch: { label: 'Replaced during rotation' },
                },
              ],
            })
          })
        }

        await page.mouse.up()
        await expect(node(page)).toHaveAttribute('data-rotation', '0')
        expect(await rotation(page)).toBe(0)
        await expect
          .poll(() => past(page))
          .toBe(count + (reason === 'replacement' ? 1 : 0))
        await attached(page)
      })
    }

    it('auto-pans during rotation and restores the viewport on cancellation', async ({
      page,
    }) => {
      const initial = await node(page).boundingBox()
      await start(page, 45)
      const before = await node(page).boundingBox()
      const app = await page.locator('#app').boundingBox()

      if (before === null || app === null) {
        throw new Error('Missing viewport')
      }

      await page.mouse.move(app.x + app.width - 2, app.y + 300)
      await expect
        .poll(async () => {
          const bounds = await node(page).boundingBox()

          return bounds?.x
        })
        .toBeLessThan(before.x - 20)
      await page.keyboard.press('Escape')
      await page.mouse.up()
      await expect(node(page)).toHaveAttribute('data-rotation', '0')
      expect(await rotation(page)).toBe(0)
      await expect
        .poll(async () => {
          const current = await node(page).boundingBox()

          return current?.x
        })
        .toBeCloseTo(initial?.x ?? 0, 1)
    })

    it('disposes an active rotation and releases capture, frames and listeners', async ({
      page,
    }) => {
      await start(page, 90)
      await page.evaluate(() => globalThis.flowRotationDemo?.dispose())
      await page.mouse.up()
      await page.mouse.move(800, 400)
      await expect(node(page)).toHaveCount(0)
      expect(
        await page.evaluate(() =>
          [...document.querySelectorAll('*')].some((element) =>
            element.hasPointerCapture(1)
          )
        )
      ).toBe(false)
    })
  })
}
