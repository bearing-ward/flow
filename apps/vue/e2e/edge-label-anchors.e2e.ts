import { expect, test } from '@playwright/test'

import type * as ThresholdHarness from './connection-threshold-harness.ts'

for (const zoom of [0.5, 2]) {
  for (const endpoint of ['source', 'target']) {
    test(`interactive label preserves ${endpoint} reconnect input at zoom ${zoom}`, async ({
      page,
    }) => {
      await page.goto('/connection-threshold.html', {
        waitUntil: 'networkidle',
      })
      await page.evaluate(async (scale) => {
        const modulePath = '/e2e/connection-threshold-harness.ts'

        const harness: typeof ThresholdHarness = await import(modulePath)

        await harness.mount('vue', { edge: true, threshold: 8, zoom: scale })
      }, zoom)

      const anchor = page.locator(
        `.flow-vue-edge-reconnect-anchor[data-endpoint="${endpoint}"]`
      )

      await expect(page.locator('.flow-vue-edge-label')).toHaveCSS(
        'pointer-events',
        'all'
      )
      const bounds = await anchor.boundingBox()

      if (bounds === null) {
        throw new Error('Missing reconnect control')
      }

      const point = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      }

      const receipt = await page.evaluate(
        ({ x, y }) => ({
          endpoint:
            document
              .elementFromPoint(x, y)
              ?.closest<SVGElement>('.flow-vue-edge-reconnect-anchor')?.dataset
              .endpoint ?? null,
          stack: document
            .elementsFromPoint(x, y)
            .map((element) => element.getAttribute('class')),
        }),
        point
      )

      await test.info().attach('label-anchor-hit-order', {
        body: JSON.stringify({
          zoom,
          expectedEndpoint: endpoint,
          point,
          ...receipt,
        }),
        contentType: 'application/json',
      })
      // Pinned EdgeWrapper/index.tsx:218-251 paints EdgeUpdateAnchors after EdgeText.
      expect(receipt.endpoint).toBe(endpoint)
      await page.mouse.move(point.x, point.y)
      await page.mouse.down()

      const captured = await page.evaluate(async () => {
        const modulePath = '/e2e/connection-threshold-harness.ts'

        const harness: typeof ThresholdHarness = await import(modulePath)

        return harness.read()
      })

      expect(captured.captured).toBe(true)
      await page.mouse.move(point.x + 6, point.y + 8)

      const active = await page.evaluate(async () => {
        const modulePath = '/e2e/connection-threshold-harness.ts'

        const harness: typeof ThresholdHarness = await import(modulePath)

        return harness.read()
      })

      expect(active.events).toContain('reconnectStart')
      await page.keyboard.press('Escape')
      await page.mouse.up()
    })
  }
}
