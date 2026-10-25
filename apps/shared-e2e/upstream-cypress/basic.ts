import { expect, test } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import {
  click,
  transformRetained,
  persistentExample,
  trigger,
  drag,
  wheel,
  transform,
  handleSelector,
} from './helpers.ts'

export const basicContract = (adapter: UpstreamHostAdapter) => {
  test.describe('Basic Flow Rendering', () => {
    const { page, get } = persistentExample(adapter, 'basic')

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:6
    test('[UP-127-001] renders a flow with three nodes', async () => {
      await expect(get('.react-flow__renderer')).toBeAttached()
      await expect(page().locator('.react-flow-basic-example')).toBeAttached()
      await expect(get('.react-flow__node')).toHaveCount(4)
      await expect(get('.react-flow__edge')).toHaveCount(2)
      await expect(
        get('.react-flow__node').locator(adapter.selectors.handle).first()
      ).toBeAttached()
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:14
    test('[UP-127-002] renders a grid', async () => {
      await expect(get('.react-flow__background')).toBeAttached()
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:18
    test('[UP-127-003] selects two nodes by clicks', async () => {
      await page().keyboard.down('Meta')
      await click(page(), get('.react-flow__node').first())
      await expect(get('.react-flow__node').first()).toHaveClass(/selected/u)
      await click(page(), get('.react-flow__node').last())
      await expect(get('.react-flow__node').last()).toHaveClass(/selected/u)
      await expect(get('.react-flow__node').first()).toHaveClass(/selected/u)
      await page().keyboard.up('Meta')
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:31
    test('[UP-127-004] selects a node by click', async () => {
      await click(page(), get('.react-flow__node').first(), 'center', {
        force: true,
      })
      await expect(get('.react-flow__node').first()).toHaveClass(/selected/u)
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:35
    test('[UP-127-005] deselects node', async () => {
      await click(page(), get('.react-flow__renderer'), 'bottomLeft')
      await expect(get('.react-flow__node').first()).not.toHaveClass(
        /selected/u
      )
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:40
    test('[UP-127-006] selects an edge by click', async () => {
      await click(
        page(),
        adapter.edgeTarget(get('.react-flow__edge').first()),
        'center',
        { force: true }
      )
      await expect(get('.react-flow__edge').first()).toHaveClass(/selected/u)
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:45
    test('[UP-127-007] deselects edge', async () => {
      await click(page(), get('.react-flow__renderer'), 'bottomLeft')
      await expect(get('.react-flow__edge').first()).not.toHaveClass(
        /selected/u
      )
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:50
    test('[UP-127-008] selects one node with a selection', async () => {
      await page().keyboard.down('Shift')
      await trigger(page(), get('.react-flow__pane'), 'mousedown', {
        x: 1,
        y: 10,
      })
      await trigger(page(), get('.react-flow__pane'), 'mousemove', {
        x: 1000,
        y: 200,
      })
      await trigger(page(), get('.react-flow__pane'), 'mouseup', {
        x: 1000,
        y: 200,
      })
      await expect(get('.react-flow__node').nth(0)).toHaveClass(/selected/u)
      await expect(get('.react-flow__node').nth(3)).not.toHaveClass(/selected/u)
      await expect(get('.react-flow__nodesselection-rect')).toBeAttached()
      await page().keyboard.up('Shift')
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:65
    test('[UP-127-009] selects all nodes', async () => {
      await page().keyboard.down('Shift')
      await trigger(page(), get('.react-flow__pane'), 'mousedown', 'topRight')
      await trigger(page(), get('.react-flow__pane'), 'mousemove', 'bottomLeft')
      await page().waitForTimeout(50)
      await trigger(page(), get('.react-flow__pane'), 'mouseup', 'bottomLeft')
      await page().waitForTimeout(400)
      await expect(get('.react-flow__node.selected').first()).toBeAttached()
      await page().waitForTimeout(200)
      await expect(get('.react-flow__nodesselection-rect')).toBeAttached()
      await page().keyboard.up('Shift')
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:83
    test('[UP-127-010] removes selection', async () => {
      await click(page(), get('.react-flow__renderer'), 'bottomLeft')
      await expect(get('.react-flow__nodesselection-rect')).toHaveCount(0)
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:88
    test('[UP-127-011] selects an edge', async () => {
      await click(
        page(),
        adapter.edgeTarget(get('.react-flow__edge').first()),
        'center',
        { force: true }
      )
      await expect(get('.react-flow__edge').first()).toHaveClass(/selected/u)
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:92
    test('[UP-127-012] drags a node', async () => {
      const before = await transform(get('.react-flow__node').first())

      const subject = await drag(page(), get('.react-flow__node').first(), {
        x: 10,
        y: 10,
      })

      expect(await transformRetained(subject)).not.toBe(before)
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:101
    test('[UP-127-013] removes a node', async () => {
      const node = get('.react-flow__node').filter({ hasText: 'Node 1' })
      await click(page(), node)
      await expect(node).toHaveClass(/selected/u)
      await page().keyboard.press('Backspace')
      await expect(get('.react-flow__node')).toHaveCount(3)
      await expect(get('.react-flow__edge')).toHaveCount(0)
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:109
    test('[UP-127-014] connects nodes', async () => {
      await trigger(
        page(),
        get('.react-flow__node')
          .filter({ hasText: 'Node 3' })
          .locator(handleSelector(adapter, 'source')),
        'mousedown'
      )
      await trigger(
        page(),
        get('.react-flow__node')
          .filter({ hasText: 'Node 4' })
          .locator(handleSelector(adapter, 'target')),
        'mousemove'
      )
      await page().waitForTimeout(200)
      await trigger(
        page(),
        get('.react-flow__node')
          .filter({ hasText: 'Node 4' })
          .locator(handleSelector(adapter, 'target')),
        'mouseup'
      )
      await expect(get('.react-flow__edge')).toHaveCount(1)
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:126
    test('[UP-127-015] removes an edge', async () => {
      await click(page(), adapter.edgeTarget(get('.react-flow__edge').first()))
      await page().keyboard.press('Backspace')
      await expect(get('.react-flow__edge')).toHaveCount(0)
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:133
    test('[UP-127-016] drags the pane', async () => {
      const before = await transform(get('.react-flow__viewport'))
      await trigger(page(), get('.react-flow__pane'), 'mousedown', 'topLeft')
      await trigger(page(), get('.react-flow__pane'), 'mousemove', 'bottomLeft')
      await page().waitForTimeout(50)
      await trigger(page(), get('.react-flow__pane'), 'mouseup')
      expect(await transform(get('.react-flow__viewport'))).not.toBe(before)
    })

    // Upstream: examples/react/cypress/e2e/basic.cy.ts:151
    test('[UP-127-017] zooms the pane', async () => {
      const before = await transform(get('.react-flow__viewport'))
      await wheel(get('.react-flow__pane'), -200)
      await page().waitForTimeout(50)
      expect(await transform(get('.react-flow__viewport'))).not.toBe(before)
    })
  })
}
