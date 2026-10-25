import { test, expect } from '@playwright/test'

import ledger from '../../../research/catalogs/upstream-test-ledger.json' with { type: 'json' }
import { componentsContract } from '../../shared-e2e/upstream-component/components.ts'
import { eventsContract } from '../../shared-e2e/upstream-component/events.ts'
import { componentEvidence } from '../../shared-e2e/upstream-component/helpers.ts'
import { hooksContract } from '../../shared-e2e/upstream-component/hooks.ts'
import { viewContract } from '../../shared-e2e/upstream-component/view.ts'
import { upstreamHostAdapter } from '../../shared-e2e/upstream/adapter.ts'
// Cypress v13.6.6 packages/config/src/options.ts:451-458, component defaults.

declare global {
  interface Window {
    __referenceUtility: string | null
  }
}

test.use({ viewport: { width: 500, height: 500 } })

const adapter = upstreamHostAdapter('react')

componentEvidence()

hooksContract(adapter)

componentsContract(adapter)

eventsContract(adapter)

viewContract(adapter)

for (const entry of ledger.cases.filter(
  (item) => item.phase === 128 && item.upstream.includes('/utils/')
)) {
  test(`[${entry.id}] ${entry.title}`, async ({ page }) => {
    await page.goto(
      `${adapter.baseURL}/upstream-utility/${Number(entry.id.slice(-3))}`
    )
    await expect(page.locator('#app')).toHaveAttribute(
      'data-upstream-ready',
      'true'
    )
    expect(await page.evaluate(() => window.__referenceUtility)).toBeNull()
  })
}
