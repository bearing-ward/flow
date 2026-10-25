import { expect, test } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import {
  click,
  persistentExample,
  trigger,
  isWithinViewport,
  isOutsideViewport,
} from './helpers.ts'

export const figmaContract = (adapter: UpstreamHostAdapter) => {
  test.describe('Figma Flow UI', () => {
    const { page, get } = persistentExample(adapter, 'figma')

    // Upstream: examples/react/cypress/e2e/figma.cy.ts:6
    test('[UP-127-032] renders a flow with three nodes', async () => {
      await expect(get('.react-flow__renderer')).toBeAttached()
      await expect(get('.react-flow__node')).toHaveCount(4)
      await expect(get('.react-flow__edge')).toHaveCount(2)
      await expect(
        get('.react-flow__node').locator(adapter.selectors.handle).first()
      ).toBeAttached()
    })

    // Upstream: examples/react/cypress/e2e/figma.cy.ts:13
    test('[UP-127-033] renders a grid', async () => {
      await expect(get('.react-flow__background')).toBeAttached()
    })

    // Upstream: examples/react/cypress/e2e/figma.cy.ts:17
    test('[UP-127-034] selects all nodes by drag', async () => {
      await trigger(page(), get('.react-flow__pane'), 'mousedown', 'topLeft')
      await trigger(
        page(),
        get('.react-flow__pane'),
        'mousemove',
        'bottomRight'
      )
      await page().waitForTimeout(50)
      await trigger(page(), get('.react-flow__pane'), 'mouseup')
      await expect(get('.react-flow__node.selected').first()).toBeAttached()
    })

    // Upstream: examples/react/cypress/e2e/figma.cy.ts:30
    test('[UP-127-035] removes selection', async () => {
      await click(page(), get('.react-flow__pane'), 'topLeft')
      await expect(get('.react-flow__node.selected')).toHaveCount(0)
    })

    // Upstream: examples/react/cypress/e2e/figma.cy.ts:35
    test('[UP-127-036] drags using right click', async () => {
      await isWithinViewport(page(), get('.react-flow__node').last())
      await trigger(
        page(),
        get('.react-flow__pane'),
        'mousedown',
        'center',
        'right'
      )
      await trigger(
        page(),
        get('.react-flow__pane'),
        'mousemove',
        'bottom',
        'right'
      )
      await page().waitForTimeout(50)
      await trigger(page(), get('.react-flow__pane'), 'mouseup')
      await expect(get('.react-flow__node.selected')).toHaveCount(0)
      await isOutsideViewport(page(), get('.react-flow__node').last())
    })
  })
}
