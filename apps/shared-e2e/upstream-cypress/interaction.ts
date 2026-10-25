import { expect, test } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import {
  click,
  doubleClick,
  transformRetained,
  persistentExample,
  trigger,
  drag,
  wheel,
  transform,
  handleSelector,
} from './helpers.ts'

export const interactionContract = (adapter: UpstreamHostAdapter) => {
  test.describe('Interaction Flow Rendering', () => {
    const { page, get } = persistentExample(adapter, 'interaction')

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:6
    test('[UP-127-042] renders initial flow', async () => {
      await expect(get('.react-flow__renderer')).toBeAttached()
      await expect(get('.react-flow__node')).toHaveCount(4)
      await expect(get('.react-flow__edge')).toHaveCount(2)
      await expect(
        get('.react-flow__node').locator(adapter.selectors.handle).first()
      ).toBeAttached()
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:13
    test('[UP-127-043] tries to select a node by click', async () => {
      expect(
        await get('.react-flow__node')
          .first()
          .evaluate((el) => getComputedStyle(el).pointerEvents)
      ).toBe('none')
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:18
    test('[UP-127-044] tries to select an edge by click', async () => {
      expect(
        await get('.react-flow__edge')
          .first()
          .evaluate((el) => getComputedStyle(el).pointerEvents)
      ).toBe('none')
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:23
    test('[UP-127-045] toggles on capture element click', async () => {
      await click(page(), get('.react-flow__captureelementclick'))
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:27
    test('[UP-127-046] allows node clicks when enabled', async () => {
      expect(
        await get('.react-flow__node')
          .first()
          .evaluate((el) => getComputedStyle(el).pointerEvents)
      ).toBe('all')
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:32
    test('[UP-127-047] allows edge clicks when enabled', async () => {
      const events = await get('.react-flow__edge')
        .first()
        .evaluate((el) => getComputedStyle(el).pointerEvents)

      expect(events.toLowerCase()).toBe('visiblestroke')
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:37
    test('[UP-127-048] tries to do a selection', async () => {
      await page().keyboard.down('Shift')
      await page().waitForTimeout(50)
      await trigger(page(), get('.react-flow__pane'), 'mousedown', {
        x: 1000,
        y: 50,
      })
      await trigger(page(), get('.react-flow__pane'), 'mousemove', {
        x: 1,
        y: 400,
      })
      await page().waitForTimeout(50)
      await expect(get('.react-flow__selection')).toHaveCount(0)
      await trigger(page(), get('.react-flow__pane'), 'mouseup', {
        x: 1,
        y: 200,
      })
      await page().keyboard.up('Shift')
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:53
    test('[UP-127-049] tries to connect to nodes', async () => {
      expect(
        await get('.react-flow__node')
          .filter({ hasText: 'Node 3' })
          .locator(handleSelector(adapter, 'source'))
          .evaluate((el) => getComputedStyle(el).pointerEvents)
      ).toBe('none')
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:63
    test('[UP-127-050] tries to zoom by double click', async () => {
      const before = await transform(get('.react-flow__nodes'))
      await doubleClick(page(), get('.react-flow__renderer'))
      expect(await transform(get('.react-flow__nodes'))).toBe(before)
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:74
    test('[UP-127-051] tries to zoom by scroll', async () => {
      const before = await transform(get('.react-flow__nodes'))
      await wheel(get('.react-flow__renderer'), -200)
      expect(await transform(get('.react-flow__nodes'))).toBe(before)
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:85
    test('[UP-127-052] toggles draggable mode', async () => {
      await click(page(), get('.react-flow__draggable'))
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:89
    test('[UP-127-053] drags a node', async () => {
      const before = await transform(get('.react-flow__node').first())

      const subject = await drag(page(), get('.react-flow__node').first(), {
        x: 325,
        y: 100,
      })

      expect(await transformRetained(subject)).not.toBe(before)
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:98
    test('[UP-127-054] toggles selectable mode', async () => {
      await click(page(), get('.react-flow__selectable'))
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:102
    test('[UP-127-055] selects a node by click', async () => {
      await click(page(), get('.react-flow__node').first())
      await expect(get('.react-flow__node').first()).toHaveClass(/selected/u)
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:106
    test('[UP-127-056] selects an edge by click', async () => {
      await click(
        page(),
        adapter.edgeTarget(get('.react-flow__edge').first()),
        'center',
        { force: true }
      )
      await expect(get('.react-flow__edge').first()).toHaveClass(/selected/u)
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:111
    test('[UP-127-057] toggles connectable mode', async () => {
      await click(page(), get('.react-flow__connectable'))
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:115
    test('[UP-127-058] connects two nodes', async () => {
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
      await trigger(
        page(),
        get('.react-flow__node')
          .filter({ hasText: 'Node 4' })
          .locator(handleSelector(adapter, 'target')),
        'mouseup'
      )
      await expect(get('.react-flow__edge')).toHaveCount(3)
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:130
    test('[UP-127-059] toggles zoom on scroll', async () => {
      await click(page(), get('.react-flow__zoomonscroll'))
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:134
    test('[UP-127-060] zooms by scroll', async () => {
      const before = await transform(get('.react-flow__viewport'))
      await wheel(get('.react-flow__pane'), 200)
      await page().waitForTimeout(50)
      expect(await transform(get('.react-flow__viewport'))).not.toBe(before)
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:146
    test('[UP-127-061] toggles zoom on double click', async () => {
      await click(page(), get('.react-flow__zoomondbl'))
    })

    // Upstream: examples/react/cypress/e2e/interaction.cy.ts:150
    test('[UP-127-062] zooms by double click', async () => {
      // Cypress.$ runs synchronously before its queued zoom-out click.
      const before = await transform(get('.react-flow__viewport'))
      await click(page(), get('.react-flow__controls-zoomout'))
      await doubleClick(page(), get('.react-flow__pane'))
      await page().waitForTimeout(50)
      expect(await transform(get('.react-flow__viewport'))).not.toBe(before)
    })
  })
}
