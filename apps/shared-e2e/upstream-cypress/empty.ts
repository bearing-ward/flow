import { expect, test } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import { click, persistentExample, trigger, handleSelector } from './helpers.ts'

export const emptyContract = (adapter: UpstreamHostAdapter) => {
  test.describe('Empty Flow Rendering', () => {
    const { page, get } = persistentExample(adapter, 'empty')

    // Upstream: examples/react/cypress/e2e/empty.cy.ts:6
    test('[UP-127-028] renders an empty flow', async () => {
      await expect(get('.react-flow__renderer')).toBeAttached()
      await expect(get('.react-flow__node')).toHaveCount(0)
      await expect(get('.react-flow__edge')).toHaveCount(0)
    })

    // Upstream: examples/react/cypress/e2e/empty.cy.ts:12
    test('[UP-127-029] renders empty selection', async () => {
      await click(page(), get('.react-flow__renderer'))
      await page().keyboard.down('Shift')
      await page().waitForTimeout(50)
      await trigger(page(), get('.react-flow__pane'), 'mousedown', {
        x: 400,
        y: 50,
      })
      await trigger(page(), get('.react-flow__pane'), 'mousemove', {
        x: 200,
        y: 200,
      })
      await page().waitForTimeout(50)
      await trigger(page(), get('.react-flow__pane'), 'mouseup', {
        x: 200,
        y: 200,
      })
      await page().keyboard.up('Shift')
    })

    // Upstream: examples/react/cypress/e2e/empty.cy.ts:26
    test('[UP-127-030] adds two nodes', async () => {
      await click(page(), page().getByText('add node', { exact: true }))
      await click(page(), page().getByText('add node', { exact: true }))
    })

    // Upstream: examples/react/cypress/e2e/empty.cy.ts:31
    test('[UP-127-031] connects nodes', async () => {
      await trigger(
        page(),
        get('.react-flow__node')
          .first()
          .locator(handleSelector(adapter, 'source')),
        'mousedown'
      )
      await trigger(
        page(),
        get('.react-flow__node')
          .last()
          .locator(handleSelector(adapter, 'target')),
        'mousemove'
      )
      await trigger(
        page(),
        get('.react-flow__node')
          .last()
          .locator(handleSelector(adapter, 'target')),
        'mouseup'
      )
      await expect(get('.react-flow__edge')).toHaveCount(1)
    })
  })
}
