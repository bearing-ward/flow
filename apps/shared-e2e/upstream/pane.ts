import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import { boundingBox, getTransform } from './adapter.ts'
import type { UpstreamHostAdapter } from './adapter.ts'

interface Point {
  x: number
  y: number
}

const getPaneDragPoints = async (pane: Locator) => {
  const bounds = await boundingBox(pane)

  if (!bounds) {
    throw new Error('Could not measure the pane for the drag gesture.')
  }

  const start = {
    x: bounds.x + bounds.width * 0.75,
    y: bounds.y + bounds.height * 0.75,
  }

  return { start, end: { x: start.x - 80, y: start.y - 80 } }
}

const withTouchDrag = async (
  page: Page,
  start: Point,
  end: Point,
  assertions: () => Promise<void>
) => {
  const client = await page.context().newCDPSession(page)

  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...start, id: 0 }],
    })

    for (let step = 1; step <= 4; step += 1) {
      const progress = step / 4
      // oxlint-disable-next-line no-await-in-loop -- CDP touch moves must be delivered in order.
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress,
            id: 0,
          },
        ],
      })
    }

    await assertions()
  } finally {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await client.detach()
  }
}

export const paneContract = (adapter: UpstreamHostAdapter): void => {
  test.describe('Pane default', () => {
    test.beforeEach(async ({ page }) => {
      // Go to the starting url before each test.
      await adapter.goto(page, '/upstream/pane/general')

      // Wait till the edges are rendered
      await adapter
        .locator(page, '[data-id="first-edge"]')
        .waitFor({ state: 'visible', timeout: 5000 })
    })

    test.describe('pan & zoom', () => {
      // Upstream: tests/playwright/e2e/pane.spec.ts:58
      test('[UP-126-037] panning the pane moves it', async ({ page }) => {
        const pane = adapter.locator(page, `.react-flow__pane`)
        const viewport = adapter.locator(page, `.react-flow__viewport`)

        await expect(pane).toBeAttached()

        const paneBox = await boundingBox(pane)
        const transformsBefore = await getTransform(viewport)
        const movementPx = 100

        await pane.hover()
        await page.mouse.down()
        // Move pane by 100, 100
        await page.mouse.move(
          paneBox.x + paneBox.width * 0.5 + movementPx,
          paneBox.y + paneBox.height * 0.5 + movementPx
        )

        const transformsAfter = await getTransform(viewport)

        expect(
          movementPx -
            Math.floor(transformsAfter.translateX - transformsBefore.translateX)
        ).toBeLessThan(1)
        expect(
          movementPx -
            Math.floor(transformsAfter.translateY - transformsBefore.translateY)
        ).toBeLessThan(1)
      })

      // Upstream: tests/playwright/e2e/pane.spec.ts:82
      test('[UP-126-038] scrolling the default pane zooms it', async ({
        page,
      }) => {
        const pane = adapter.locator(page, `.react-flow__pane`)
        const viewport = adapter.locator(page, `.react-flow__viewport`)

        await expect(pane).toBeAttached()

        const transformsBefore = await getTransform(viewport)

        await pane.hover()
        await page.mouse.wheel(0, 100)

        const transformsAfter = await getTransform(viewport)

        expect(transformsAfter.scale).not.toBe(transformsBefore.scale)
      })
    })

    test.describe('minZoom & maxZoom', () => {
      // Upstream: tests/playwright/e2e/pane.spec.ts:100
      test('[UP-126-039] minZoom', async ({ page }) => {
        const pane = adapter.locator(page, `.react-flow__pane`)
        const viewport = adapter.locator(page, `.react-flow__viewport`)

        await expect(pane).toBeAttached()

        await pane.hover()

        // Zoom out
        await page.mouse.wheel(5000, 5000)

        const transformsMinZoom = await getTransform(viewport)
        expect(transformsMinZoom.scale).toBe(0.25)
      })

      // Upstream: tests/playwright/e2e/pane.spec.ts:115
      test('[UP-126-040] maxZoom', async ({ page }) => {
        const pane = adapter.locator(page, `.react-flow__pane`)
        const viewport = adapter.locator(page, `.react-flow__viewport`)

        await expect(pane).toBeAttached()

        await pane.hover()

        // Zoom in
        await page.mouse.wheel(-5000, -5000)

        const transformsMaxZoom = await getTransform(viewport)
        expect(transformsMaxZoom.scale).toBe(4)
      })
    })

    test.describe('autoPan', () => {
      // Upstream: tests/playwright/e2e/pane.spec.ts:132
      test('[UP-126-041] autoPanOnNodeDrag', async ({ page }) => {
        const viewport = adapter.locator(page, `.react-flow__viewport`)
        const node = adapter.locator(page, '[data-id="1"]')

        await expect(node).toBeAttached()

        const transformBefore = await getTransform(viewport)

        await node.hover()
        await page.mouse.down()
        await page.mouse.move(0, 0)
        await page.waitForTimeout(500)
        await page.mouse.move(2000, 2000, { steps: 100 })
        await page.mouse.up()

        const transformAfter = await getTransform(viewport)

        await expect(transformAfter.translateX).not.toEqual(
          transformBefore.translateX
        )
        await expect(transformAfter.translateY).not.toEqual(
          transformBefore.translateY
        )
      })

      // Upstream: tests/playwright/e2e/pane.spec.ts:153
      test('[UP-126-042] autoPanOnConnect', async ({ page }) => {
        const viewport = adapter.locator(page, `.react-flow__viewport`)

        const handle = adapter.locator(
          page,
          `[data-id="1"] .react-flow__handle`
        )

        await expect(handle).toBeAttached()

        const transformBefore = await getTransform(viewport)

        await handle.hover()
        await page.mouse.down()
        await page.mouse.move(0, 0)
        await page.waitForTimeout(500)
        await page.mouse.move(100, 100, { steps: 100 })

        const transformAfter = await getTransform(viewport)

        await expect(transformAfter.translateX).not.toEqual(
          transformBefore.translateX
        )
        await expect(transformAfter.translateY).not.toEqual(
          transformBefore.translateY
        )
      })
    })
  })

  test.describe('Pane non-default', () => {
    test.beforeEach(async ({ page }) => {
      // Go to the starting url before each test.
      await adapter.goto(page, '/upstream/pane/non-defaults')

      // Wait till the edges are rendered
      await adapter
        .locator(page, '[data-id="first-edge"]')
        .waitFor({ state: 'visible', timeout: 5000 })
    })

    test.describe('pan & zoom', () => {
      // Upstream: tests/playwright/e2e/pane.spec.ts:185
      test('[UP-126-043] panOnScroll pans the pane on scrolling', async ({
        page,
      }) => {
        const pane = adapter.locator(page, `.react-flow__pane`)
        const viewport = adapter.locator(page, `.react-flow__viewport`)

        await expect(pane).toBeAttached()

        const transformsBefore = await getTransform(viewport)

        await pane.hover()
        await page.mouse.wheel(100, 100)

        const transformsAfter = await getTransform(viewport)

        expect(transformsAfter.translateX).not.toBe(transformsBefore.translateX)
        expect(transformsAfter.translateY).not.toBe(transformsBefore.translateY)
      })

      // Upstream: tests/playwright/e2e/pane.spec.ts:202
      test('[UP-126-044] intialViewport', async ({ page }) => {
        const pane = adapter.locator(page, `.react-flow__pane`)
        const viewport = adapter.locator(page, `.react-flow__viewport`)

        await expect(pane).toBeAttached()

        const viewportTransform = await getTransform(viewport)

        expect(viewportTransform.translateX).toBe(1.23)
        expect(viewportTransform.translateY).toBe(9.87)
        expect(viewportTransform.scale).toBe(1.234)
      })

      test.describe('touch input', () => {
        // Model a hybrid touchscreen computer without switching to a mobile browser profile.
        test.use({ hasTouch: true })

        // Upstream: tests/playwright/e2e/pane.spec.ts:219
        test('[UP-126-045] touch drag pans when primary mouse drag is reserved for selection', async ({
          page,
          browserName,
        }) => {
          test.skip(
            browserName !== 'chromium',
            'CDP touch input is only available in Chromium.'
          )

          const pane = adapter.locator(page, `.react-flow__pane`)
          const viewport = adapter.locator(page, `.react-flow__viewport`)
          const selection = adapter.locator(page, `.react-flow__selection`)

          await expect(pane).toBeAttached()

          const { start, end } = await getPaneDragPoints(pane)
          const transformBefore = await getTransform(viewport)

          await withTouchDrag(page, start, end, async () => {
            await expect
              .poll(async () => {
                const transform = await getTransform(viewport)

                return transform.translateX
              })
              .not.toBe(transformBefore.translateX)
            await expect(selection).toHaveCount(0)
          })
        })

        // Upstream: tests/playwright/e2e/pane.spec.ts:237
        test('[UP-126-046] selection key keeps touch drag in selection mode', async ({
          page,
          browserName,
        }) => {
          test.skip(
            browserName !== 'chromium',
            'CDP touch input is only available in Chromium.'
          )

          const pane = adapter.locator(page, `.react-flow__pane`)
          const viewport = adapter.locator(page, `.react-flow__viewport`)
          const selection = adapter.locator(page, `.react-flow__selection`)

          await expect(pane).toBeAttached()

          const { start, end } = await getPaneDragPoints(pane)
          const transformBefore = await getTransform(viewport)

          await page.keyboard.down('Shift')
          await expect(pane).toHaveClass(/selection/u)

          try {
            await withTouchDrag(page, start, end, async () => {
              await expect(selection).toBeVisible()
              expect(await getTransform(viewport)).toEqual(transformBefore)
            })
          } finally {
            await page.keyboard.up('Shift')
          }
        })
      })

      // Upstream: tests/playwright/e2e/pane.spec.ts:263
      test('[UP-126-047] primary mouse drag still creates a selection marquee', async ({
        page,
      }) => {
        const pane = adapter.locator(page, `.react-flow__pane`)
        const viewport = adapter.locator(page, `.react-flow__viewport`)
        const selection = adapter.locator(page, `.react-flow__selection`)

        await expect(pane).toBeAttached()

        const { start, end } = await getPaneDragPoints(pane)
        const transformBefore = await getTransform(viewport)

        await page.mouse.move(start.x, start.y)
        await page.mouse.down()

        try {
          await page.mouse.move(end.x, end.y, { steps: 4 })
          await expect(selection).toBeVisible()
          expect(await getTransform(viewport)).toEqual(transformBefore)
        } finally {
          await page.mouse.up()
        }
      })
    })
  })

  test.describe('Pane activation keys', () => {
    test.beforeEach(async ({ page }) => {
      await adapter.goto(page, '/upstream/pane/activation-keys')
      await adapter
        .locator(page, '[data-id="first-edge"]')
        .waitFor({ state: 'visible', timeout: 5000 })
    })

    // Upstream: tests/playwright/e2e/pane.spec.ts:293
    test('[UP-126-048] Control and primary-button drag pans the pane', async ({
      page,
    }) => {
      const pane = adapter.locator(page, `.react-flow__pane`)
      const viewport = adapter.locator(page, `.react-flow__viewport`)
      const paneBox = await boundingBox(pane)
      const transformsBefore = await getTransform(viewport)
      const movementPx = 100

      await page.keyboard.down('Control')
      await pane.hover()
      await page.mouse.down()
      await page.mouse.move(
        paneBox.x + paneBox.width * 0.5 + movementPx,
        paneBox.y + paneBox.height * 0.5 + movementPx
      )
      await page.mouse.up()
      await page.keyboard.up('Control')

      const transformsAfter = await getTransform(viewport)

      expect(
        movementPx -
          Math.floor(transformsAfter.translateX - transformsBefore.translateX)
      ).toBeLessThan(1)
      expect(
        movementPx -
          Math.floor(transformsAfter.translateY - transformsBefore.translateY)
      ).toBeLessThan(1)
    })
  })
}
