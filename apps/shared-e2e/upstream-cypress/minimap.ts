import { expect, test } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import { retain, persistentExample, trigger, drag, wheel } from './helpers.ts'

export const minimapContract = (adapter: UpstreamHostAdapter) => {
  test.describe('Minimap Testing', () => {
    const { page, get } = persistentExample(adapter, 'basic')

    // Upstream: examples/react/cypress/e2e/minimap.cy.ts:6
    test('[UP-127-063] renders the mini map', async () => {
      await expect(get('.react-flow__minimap')).toBeAttached()
      await expect(get('.react-flow__minimap-mask')).toBeAttached()
    })

    // Upstream: examples/react/cypress/e2e/minimap.cy.ts:11
    test('[UP-127-064] has same number of nodes as the pane', async () => {
      await expect(get('.react-flow__minimap-node').first()).toBeAttached()
      expect(await get('.react-flow__node').count()).toBe(
        await get('.react-flow__minimap-node').count()
      )
    })

    // Upstream: examples/react/cypress/e2e/minimap.cy.ts:20
    test('[UP-127-065] changes zoom level', async () => {
      const beforeBox = await get('.react-flow__minimap svg').getAttribute(
        'viewBox'
      )

      const beforeMask = await get('.react-flow__minimap-mask').getAttribute(
        'd'
      )

      await wheel(get('.react-flow__pane'), -200)
      await page().waitForTimeout(50)
      expect(
        await get('.react-flow__minimap svg').getAttribute('viewBox')
      ).not.toBe(beforeBox)
      expect(await get('.react-flow__minimap-mask').getAttribute('d')).not.toBe(
        beforeMask
      )
    })

    // Upstream: examples/react/cypress/e2e/minimap.cy.ts:36
    test('[UP-127-066] changes node position', async () => {
      const node = await retain(get('.react-flow__minimap-node').first())
      const xBefore = Number(await node.getAttribute('x'))
      const yBefore = Number(await node.getAttribute('y'))
      await drag(page(), get('.react-flow__node').first(), { x: 500, y: 25 })
      await page().waitForTimeout(100)
      const xAfter = Number(await node.getAttribute('x'))
      const yAfter = Number(await node.getAttribute('y'))
      expect(xAfter).not.toBe(xBefore)
      expect(yAfter).not.toBe(yBefore)
      expect(xAfter - xBefore).toBeGreaterThan(yAfter - yBefore)
    })

    // Upstream: examples/react/cypress/e2e/minimap.cy.ts:54
    test('[UP-127-067] changes node positions via pane drag', async () => {
      const beforeBox = await get('.react-flow__minimap svg').getAttribute(
        'viewBox'
      )

      const beforeMask = await get('.react-flow__minimap-mask').getAttribute(
        'd'
      )

      await trigger(page(), get('.react-flow__pane'), 'mousedown', 'topLeft')
      await trigger(page(), get('.react-flow__pane'), 'mousemove', 'bottomLeft')
      await page().waitForTimeout(50)
      await trigger(page(), get('.react-flow__pane'), 'mouseup')
      expect(
        await get('.react-flow__minimap svg').getAttribute('viewBox')
      ).not.toBe(beforeBox)
      expect(await get('.react-flow__minimap-mask').getAttribute('d')).not.toBe(
        beforeMask
      )
    })
  })
}
