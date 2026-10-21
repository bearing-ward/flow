import { test, expect } from '@playwright/test'

import type { UpstreamHostAdapter } from './adapter.ts'

export const propsContract = (adapter: UpstreamHostAdapter): void => {
  test.describe('Props', () => {
    test.describe('colorMode', () => {
      // Upstream: tests/playwright/e2e/props.spec.ts:7
      test('[UP-126-049] render default light color mode', async ({ page }) => {
        await adapter.goto(page, '/upstream/color-mode')

        await expect(
          adapter.locator(page, `.react-flow__node`).first()
        ).toHaveCSS('visibility', 'visible')

        await expect(adapter.locator(page, `.react-flow`)).not.toHaveClass(
          /dark/u
        )
      })

      // Upstream: tests/playwright/e2e/props.spec.ts:15
      test('[UP-126-050] render dark color mode', async ({ page }) => {
        await adapter.goto(page, '/upstream/color-mode')
        await expect(
          adapter.locator(page, `.react-flow__node`).first()
        ).toHaveCSS('visibility', 'visible')

        await page
          .getByTestId('colormode-select')
          .selectOption({ label: 'dark' })

        await expect(adapter.locator(page, `.react-flow`)).toHaveClass(/dark/u)
      })
    })
  })
}
