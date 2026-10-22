import { expect, test } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import { click, persistentExample, trigger, transform } from './helpers.ts'

export const controlsContract = (adapter: UpstreamHostAdapter) => {
  test.describe('Controls Testing', () => {
    const { page, get } = persistentExample(adapter, 'basic')

    // Upstream: examples/react/cypress/e2e/controls.cy.ts:6
    test('[UP-127-018] renders the control panel', async () => {
      await expect(get('.react-flow__controls')).toBeAttached()
    })

    // Upstream: examples/react/cypress/e2e/controls.cy.ts:10
    test('[UP-127-019] zooms in', async () => {
      const before = await transform(get('.react-flow__viewport'))
      await click(page(), get('.react-flow__controls-zoomin'))
      expect(await transform(get('.react-flow__viewport'))).not.toBe(before)
    })

    // Upstream: examples/react/cypress/e2e/controls.cy.ts:21
    test('[UP-127-020] zooms out', async () => {
      const before = await transform(get('.react-flow__viewport'))
      await click(page(), get('.react-flow__controls-zoomout'))
      expect(await transform(get('.react-flow__viewport'))).not.toBe(before)
    })

    // Upstream: examples/react/cypress/e2e/controls.cy.ts:33
    test('[UP-127-021] drags the pane', async () => {
      const before = await transform(get('.react-flow__viewport'))
      await trigger(
        page(),
        get('.react-flow__renderer'),
        'mousedown',
        'topLeft'
      )
      await trigger(page(), get('.react-flow__renderer'), 'mousemove', {
        x: 10,
        y: 400,
      })
      await page().waitForTimeout(50)
      await trigger(page(), get('.react-flow__renderer'), 'mouseup', {
        x: 10,
        y: 400,
      })
      expect(await transform(get('.react-flow__viewport'))).not.toBe(before)
    })

    // Upstream: examples/react/cypress/e2e/controls.cy.ts:51
    test('[UP-127-022] fits view', async () => {
      const before = await transform(get('.react-flow__viewport'))
      await click(page(), get('.react-flow__controls-fitview'))
      expect(await transform(get('.react-flow__viewport'))).not.toBe(before)
    })

    // Upstream: examples/react/cypress/e2e/controls.cy.ts:62
    test('[UP-127-023] uses interactive control - not interactive', async () => {
      await click(page(), get('.react-flow__node').first())
      await expect(get('.react-flow__node').first()).toHaveClass(/selected/u)
      await click(page(), get('.react-flow__pane'), 'topLeft')
      await expect(get('.react-flow__node').first()).not.toHaveClass(
        /selected/u
      )
      await click(page(), get('.react-flow__controls-interactive'))
      await expect(get('.react-flow__node').first()).not.toHaveClass(
        /selected/u
      )
    })

    // Upstream: examples/react/cypress/e2e/controls.cy.ts:74
    test('[UP-127-024] uses interactive control - interactive', async () => {
      await click(page(), get('.react-flow__controls-interactive'))
      await click(page(), get('.react-flow__node').first(), 'center', {
        force: true,
      })
      await expect(get('.react-flow__node').first()).toHaveClass(/selected/u)
    })
  })
}
