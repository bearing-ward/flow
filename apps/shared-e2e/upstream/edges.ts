import { test, expect } from '@playwright/test'

import type { UpstreamHostAdapter } from './adapter.ts'

export const edgesContract = (adapter: UpstreamHostAdapter): void => {
  test.describe('Edges', () => {
    test.beforeEach(async ({ page }) => {
      // Go to the starting url before each test.
      await adapter.goto(page, '/upstream/edges/general')

      // Timeout gets ignored and tests timeout after 200ms ???
      // page.waitForSelector('[data-id="edge-with-class"]', { timeout: 5000 });
    })

    test.describe('selection', () => {
      // Upstream: tests/playwright/e2e/edges.spec.ts:15
      test('[UP-126-003] selecting an edge by click', async ({ page }) => {
        const edge = adapter.locator(page, `[data-id="edge-with-class"]`)

        await expect(edge).toBeAttached()
        await adapter.edgeClick(edge)
        await expect(edge).toHaveClass(/selected/u)
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:23
      test('[UP-126-004] selecting multiple edges by meta-click', async ({
        page,
      }) => {
        const edge1 = adapter.locator(page, '[data-id="edge-with-class"]')
        const edge2 = adapter.locator(page, '[data-id="edge-with-style"]')

        await expect(edge1).toBeAttached()
        await expect(edge2).toBeAttached()

        await adapter.edgeClick(edge1)
        await expect(edge1).toHaveClass(/selected/u)

        // we are using "s" here because Meta doesn't work for some reason
        await page.keyboard.down('s')
        await adapter.edgeClick(edge2)
        await page.keyboard.up('s')

        await expect(edge2).toHaveClass(/selected/u)
        await expect(edge1).toHaveClass(/selected/u)
      })
    })

    test.describe('properties', () => {
      // Upstream: tests/playwright/e2e/edges.spec.ts:44
      test('[UP-126-005] classes get applied', async ({ page }) => {
        const edge = adapter.locator(page, '[data-id="edge-with-class"]')

        await expect(edge).toHaveClass(/edge-class-test/u)
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:50
      test('[UP-126-006] styles get applied', async ({ page }) => {
        const edge = adapter
          .locator(page, '[data-id="edge-with-style"]')
          .locator(adapter.selectors.edgePath)

        await expect(edge).toHaveCSS('stroke', 'rgb(255, 0, 0)')
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:56
      test('[UP-126-007] hidden=true hides edge', async ({ page }) => {
        const edge = adapter.locator(page, '#hidden-edge')

        await expect(edge).not.toBeVisible()
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:62
      test('[UP-126-008] animated=true add "animated" class', async ({
        page,
      }) => {
        const edge = adapter.locator(page, '[data-id="animated-edge"]')

        await expect(edge).toHaveClass(/animated/u)
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:68
      test('[UP-126-009] selectable=false prevents selecting of edges', async ({
        page,
      }) => {
        const edge = adapter.locator(page, '[data-id="not-selectable-edge"]')

        await expect(edge).toBeAttached()
        await expect(edge).not.toHaveClass(/selected/u)

        // For some reason these commands do not work
        // await expect(edge).toBeInViewport();
        // await adapter.edgeClick(edge);

        const edgeBox = await adapter.edgeBounds(edge)

        await page.mouse.move(
          edgeBox.x + edgeBox.width * 0.5,
          edgeBox.y + edgeBox.height * 0.5
        )
        await page.mouse.down()
        await page.mouse.up()

        await expect(edge).not.toHaveClass(/selected/u)
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:87
      test('[UP-126-010] deleting edges is possible', async ({ page }) => {
        const edge = adapter.locator(page, '[data-id="edge-with-class"]')

        await expect(edge).toBeAttached()

        await adapter.edgeClick(edge)
        await expect(edge).toHaveClass(/selected/u)

        await page.keyboard.press('d')

        await expect(edge).not.toBeAttached()
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:100
      test('[UP-126-011] deletable=false prevents deleting of edges', async ({
        page,
      }) => {
        const edge = adapter.locator(page, '[data-id="not-deletable"]')

        await expect(edge).toBeAttached()

        // For some reason these commands do not work
        // await expect(edge).toBeInViewport();
        // await adapter.edgeClick(edge);

        const edgeBox = await adapter.edgeBounds(edge)

        await page.mouse.move(
          edgeBox.x + edgeBox.width * 0.5,
          edgeBox.y + edgeBox.height * 0.5
        )
        await page.mouse.down()
        await page.mouse.up()

        await expect(edge).toHaveClass(/selected/u)

        await page.keyboard.press('d')
        await expect(edge).toBeAttached()
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:121
      test('[UP-126-012] zIndex sets z-index of edge svgs', async ({
        page,
      }) => {
        const svg = adapter.edgeLayer(page, 'z-index')

        await expect(svg).toBeAttached()
        await expect(svg).toHaveCSS('z-index', '3141592')
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:128
      test('[UP-126-013] aria-lable is working', async ({ page }) => {
        const edge = adapter.locator(page, '[data-id="aria-label"]')

        await expect(edge).toHaveAttribute('aria-label', 'aria-label-test')
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:134
      test('[UP-126-014] interactionWidth is working', async ({ page }) => {
        const edge = adapter.locator(page, '[data-id="interaction-width"]')

        await expect(edge).toBeAttached()

        const edgeBox = await adapter.edgeBounds(edge)

        await page.mouse.move(
          edgeBox.x + edgeBox.width * 0.5 + 21,
          edgeBox.y + edgeBox.height * 0.5
        )
        await page.mouse.down()
        await page.mouse.up()

        await expect(edge).toHaveClass(/selected/u)
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:148
      test('[UP-126-015] marker-start, marker-end set markers', async ({
        page,
      }) => {
        const edge = adapter
          .locator(page, '[data-id="markers"]')
          .locator(adapter.selectors.edgePath)

        await expect(edge).toBeAttached()

        await expect(edge).toHaveAttribute(
          'marker-start',
          "url('#1__type=arrowclosed')"
        )
        await expect(edge).toHaveAttribute(
          'marker-end',
          "url('#1__type=arrow')"
        )
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:157
      test('[UP-126-016] z-index', async ({ page }) => {
        const svg = adapter.edgeLayer(page, 'edge-with-class')

        await expect(svg).toBeAttached()
        await expect(svg).toHaveCSS('z-index', '0')
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:164
      test('[UP-126-017] sub flow: normal node to child node, z-index', async ({
        page,
      }) => {
        const svg = adapter.edgeLayer(page, 'subflow-edge')

        await expect(svg).toBeAttached()
        await expect(svg).toHaveCSS('z-index', '1')
      })

      // Upstream: tests/playwright/e2e/edges.spec.ts:171
      test('[UP-126-018] sub flow: child node to child node, z-index', async ({
        page,
      }) => {
        const svg = adapter.edgeLayer(page, 'subflow-edge-2')

        await expect(svg).toBeAttached()
        await expect(svg).toHaveCSS('z-index', '1')
      })
    })
  })
}
