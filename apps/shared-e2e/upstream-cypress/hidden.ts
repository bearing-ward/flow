import { expect, test } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import { click, persistentExample } from './helpers.ts'

export const hiddenContract = (adapter: UpstreamHostAdapter) => {
  test.describe('Hidden Flow Rendering', () => {
    const { page, get } = persistentExample(adapter, 'hidden')

    // Upstream: examples/react/cypress/e2e/hidden.cy.ts:6
    test('[UP-127-037] renders empty flow', async () => {
      await expect(get('.react-flow__node')).toHaveCount(0)
      await expect(get('.react-flow__edge')).toHaveCount(0)
      await expect(get('.react-flow__minimap-node')).toHaveCount(0)
    })

    // Upstream: examples/react/cypress/e2e/hidden.cy.ts:12
    test('[UP-127-038] toggles isHidden mode', async () => {
      await click(page(), get('.react-flow__ishidden'))
    })

    // Upstream: examples/react/cypress/e2e/hidden.cy.ts:16
    test('[UP-127-039] renders initial flow', async () => {
      await expect(get('.react-flow__renderer')).toBeAttached()
      await expect(get('.react-flow__node')).toHaveCount(4)
      await expect(get('.react-flow__edge')).toHaveCount(3)
      await expect(get('.react-flow__minimap-node')).toHaveCount(4)
    })

    // Upstream: examples/react/cypress/e2e/hidden.cy.ts:23
    test('[UP-127-040] toggles isHidden mode again', async () => {
      await click(page(), get('.react-flow__ishidden'))
    })

    // Upstream: examples/react/cypress/e2e/hidden.cy.ts:27
    test('[UP-127-041] renders empty flow', async () => {
      await expect(get('.react-flow__node')).toHaveCount(0)
      await expect(get('.react-flow__edge')).toHaveCount(0)
      await expect(get('.react-flow__minimap-node')).toHaveCount(0)
    })
  })
}
