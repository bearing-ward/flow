import { expect, test } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import {
  transformRetained,
  retain,
  persistentExample,
  drag,
} from './helpers.ts'

export const draghandleContract = (adapter: UpstreamHostAdapter) => {
  test.describe('DragHandle Flow Rendering', () => {
    const { page, get } = persistentExample(adapter, 'draghandle')

    // Upstream: examples/react/cypress/e2e/draghandle.cy.ts:6
    test('[UP-127-025] renders a flow with a node', async () => {
      await expect(get('.react-flow__renderer')).toBeAttached()
      await expect(get('.react-flow__node')).toHaveCount(1)
    })

    // Upstream: examples/react/cypress/e2e/draghandle.cy.ts:11
    test('[UP-127-026] tries to drag a node', async () => {
      const node = await retain(get('.react-flow__node').first())
      const before = await transformRetained(node)
      await drag(page(), get('.react-flow__node').first(), { x: 500, y: 500 })
      expect(await transformRetained(node)).toBe(before)
    })

    // Upstream: examples/react/cypress/e2e/draghandle.cy.ts:21
    test('[UP-127-027] drags a node', async () => {
      const node = await retain(get('.react-flow__node').first())
      const before = await transformRetained(node)
      await drag(page(), page().locator('.custom-drag-handle').first(), {
        x: 500,
        y: 500,
      })
      expect(await transformRetained(node)).not.toBe(before)
    })
  })
}
