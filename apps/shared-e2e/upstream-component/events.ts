import { test } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import {
  expect,
  componentMount,
  history,
  eventCount,
  drag,
  dragPane,
  boundingBox,
} from './helpers.ts'

export const eventsContract = (adapter: UpstreamHostAdapter) => {
  const get = (page: Page, selector: string) => adapter.locator(page, selector)
  // examples/react/cypress/components/reactflow/event-handlers.cy.tsx:8
  test('[UP-128-034] handles onInit', async ({ page }) => {
    await componentMount(page, adapter, 34)
    await page.waitForTimeout(100)
    await expect.poll(() => eventCount(page, 'onInit')).toBe(1)
  })

  // examples/react/cypress/components/reactflow/event-handlers.cy.tsx:18
  test('[UP-128-035] handles onNodeClick', async ({ page }) => {
    await componentMount(page, adapter, 35)
    await expect.poll(() => eventCount(page, 'onNodeClick')).toBe(0)
    await get(page, '.react-flow__node').first().click()
    await expect.poll(() => eventCount(page, 'onNodeClick')).toBe(1)
  })

  // examples/react/cypress/components/reactflow/event-handlers.cy.tsx:31
  test('[UP-128-036] handles onNodeDrag handlers', async ({ page }) => {
    await componentMount(page, adapter, 36)
    await expect.poll(() => eventCount(page, 'onNodeDragStart')).toBe(0)
    await expect.poll(() => eventCount(page, 'onNodeDrag')).toBe(0)
    await expect.poll(() => eventCount(page, 'onNodeDragStop')).toBe(0)
    await drag(page, get(page, '.react-flow__node').first(), { x: 200, y: 0 })
    await expect
      .poll(() => eventCount(page, 'onNodeDragStart'))
      .toBeGreaterThan(0)
    await expect.poll(() => eventCount(page, 'onNodeDrag')).toBeGreaterThan(0)
    await expect
      .poll(() => eventCount(page, 'onNodeDragStop'))
      .toBeGreaterThan(0)
  })

  // examples/react/cypress/components/reactflow/event-handlers.cy.tsx:57
  test('[UP-128-037] handles onNodeMouse handlers', async ({ page }) => {
    await componentMount(page, adapter, 37)
    await page.waitForTimeout(200)
    await expect.poll(() => eventCount(page, 'onNodeMouseEnter')).toBe(0)
    await expect.poll(() => eventCount(page, 'onNodeMouseMove')).toBe(0)
    await expect.poll(() => eventCount(page, 'onNodeMouseLeave')).toBe(0)
    await expect.poll(() => eventCount(page, 'onNodeContextMenu')).toBe(0)
    await expect.poll(() => eventCount(page, 'onNodeDoubleClick')).toBe(0)
    const element = get(page, '.react-flow__node').first()
    const target = element
    await target.click({ button: 'right' })
    await target.dblclick()
    await expect.poll(() => eventCount(page, 'onNodeContextMenu')).toBe(1)
    await expect.poll(() => eventCount(page, 'onNodeDoubleClick')).toBe(1)
    await target.hover()
    const bounds = await boundingBox(element)
    await page.mouse.move(bounds.x + 100, bounds.y + 100)
    await expect
      .poll(() => eventCount(page, 'onNodeMouseEnter'))
      .toBeGreaterThan(0)
    await expect
      .poll(() => eventCount(page, 'onNodeMouseMove'))
      .toBeGreaterThan(0)
    await expect
      .poll(() => eventCount(page, 'onNodeMouseLeave'))
      .toBeGreaterThan(0)
  })

  // examples/react/cypress/components/reactflow/event-handlers.cy.tsx:108
  test('[UP-128-038] handles onEdgeClick', async ({ page }) => {
    await componentMount(page, adapter, 38)
    await expect.poll(() => eventCount(page, 'onEdgeClick')).toBe(0)
    await adapter.edgeClick(get(page, '.react-flow__edge').first())
    await expect.poll(() => eventCount(page, 'onEdgeClick')).toBe(1)
  })

  // examples/react/cypress/components/reactflow/event-handlers.cy.tsx:121
  test('[UP-128-039] handles onEdgeMouse handlers', async ({ page }) => {
    await componentMount(page, adapter, 39)
    await page.waitForTimeout(200)
    await expect.poll(() => eventCount(page, 'onEdgeMouseEnter')).toBe(0)
    await expect.poll(() => eventCount(page, 'onEdgeMouseMove')).toBe(0)
    await expect.poll(() => eventCount(page, 'onEdgeMouseLeave')).toBe(0)
    await expect.poll(() => eventCount(page, 'onEdgeContextMenu')).toBe(0)
    await expect.poll(() => eventCount(page, 'onEdgeDoubleClick')).toBe(0)
    const element = get(page, '.react-flow__edge').first()
    const target = adapter.edgeTarget(element)
    await target.click({ button: 'right' })
    await target.dblclick()
    await expect.poll(() => eventCount(page, 'onEdgeContextMenu')).toBe(1)
    await target.hover()
    const bounds = await boundingBox(element)
    await page.mouse.move(bounds.x + 100, bounds.y + 100)
    await expect
      .poll(() => eventCount(page, 'onEdgeMouseEnter'))
      .toBeGreaterThan(0)
    await expect
      .poll(() => eventCount(page, 'onEdgeMouseMove'))
      .toBeGreaterThan(0)
    await expect
      .poll(() => eventCount(page, 'onEdgeMouseLeave'))
      .toBeGreaterThan(0)
  })

  // examples/react/cypress/components/reactflow/event-handlers.cy.tsx:171
  test('[UP-128-040] handles onMove handlers', async ({ page }) => {
    await componentMount(page, adapter, 40)
    await expect.poll(() => eventCount(page, 'onMoveStart')).toBe(0)
    await expect.poll(() => eventCount(page, 'onMove')).toBe(0)
    await expect.poll(() => eventCount(page, 'onMoveEnd')).toBe(0)
    await dragPane(
      page,
      get(page, '.react-flow__pane'),
      { x: 10, y: 200 },
      { x: 100, y: 200 }
    )
    await page.waitForTimeout(100)
    await expect.poll(() => eventCount(page, 'onMoveStart')).toBe(1)
    await expect.poll(() => eventCount(page, 'onMove')).toBeGreaterThan(0)
    await expect.poll(() => eventCount(page, 'onMoveEnd')).toBe(1)
  })

  // examples/react/cypress/components/reactflow/event-handlers.cy.tsx:191
  test('[UP-128-041] handles click handlers', async ({ page }) => {
    await componentMount(page, adapter, 41)
    await expect.poll(() => eventCount(page, 'onPaneClick')).toBe(0)
    await expect.poll(() => eventCount(page, 'onPaneContextMenu')).toBe(0)
    await get(page, '.react-flow__pane').click({ button: 'right' })
    await get(page, '.react-flow__pane').click()
    await page.waitForTimeout(100)
    await expect.poll(() => eventCount(page, 'onPaneClick')).toBe(1)
    await expect.poll(() => eventCount(page, 'onPaneContextMenu')).toBe(1)
  })

  // examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:25
  test('[UP-128-043] receive initial dimension change', async ({ page }) => {
    await componentMount(page, adapter, 43)
    await page.waitForTimeout(500)
    await expect.poll(() => history(page, 'nodeChanges')).toHaveLength(1)
    await expect
      .poll(() => history(page, 'nodeChanges'))
      .toContainEqual([
        { type: 'dimensions', id: '1', dimensions: { width: 100, height: 40 } },
        { type: 'dimensions', id: '2', dimensions: { width: 80, height: 50 } },
      ])
  })

  // examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:36
  test('[UP-128-044] receive replace and dimension change', async ({
    page,
  }) => {
    await componentMount(page, adapter, 44)
    await page.waitForTimeout(500)
    await page.locator('[data-id=update-btn]').click()
    await expect.poll(() => history(page, 'nodeChanges')).toHaveLength(3)
    const changes = await history(page, 'nodeChanges')
    expect(changes[1]).toEqual([
      {
        type: 'replace',
        id: '1',
        item: {
          id: '1',
          label: 'Node 1',
          data: { label: 'Node 1' },
          position: { x: 0, y: 0 },
          sourcePosition: 'bottom',
          targetPosition: 'top',
          measured: { width: 200, height: 100 },
          style: { width: 200, height: 100 },
        },
      },
    ])
    expect(changes[2]).toEqual([
      { type: 'dimensions', id: '1', dimensions: { width: 200, height: 100 } },
    ])
  })

  // examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:75
  test('[UP-128-045] receive select and unselect change', async ({ page }) => {
    await componentMount(page, adapter, 45)
    await page.waitForTimeout(500)
    await get(page, '.react-flow__node').first().click()
    await expect
      .poll(() => history(page, 'nodeChanges'))
      .toContainEqual([{ id: '1', type: 'select', selected: true }])
    await get(page, '.react-flow__pane').click({ force: true })
    await expect
      .poll(() => history(page, 'nodeChanges'))
      .toContainEqual([{ id: '1', type: 'select', selected: false }])
  })

  // examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:86
  test('[UP-128-046] receive position change', async ({ page }) => {
    await componentMount(page, adapter, 46)
    await page.waitForTimeout(500)
    await drag(page, get(page, '.react-flow__node').first(), { x: 200, y: 25 })
    await expect
      .poll(() => history(page, 'nodeChanges'))
      .toContainEqual([
        {
          id: '1',
          type: 'position',
          dragging: false,
          position: { x: 200, y: 25 },
          positionAbsolute: { x: 200, y: 25 },
        },
      ])
  })

  // examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:97
  test('[UP-128-047] receive remove change', async ({ page }) => {
    await componentMount(page, adapter, 47)
    await page.waitForTimeout(500)
    await get(page, '.react-flow__node').first().click()
    await page.keyboard.press('Backspace')
    await expect
      .poll(() => history(page, 'nodeChanges'))
      .toContainEqual([{ id: '1', type: 'remove' }])
  })
}
