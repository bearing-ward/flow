import { test } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import {
  expect,
  componentMount,
  history,
  latestViewport,
  nodeSnapshot,
  expectedNodes,
  dragPane,
  zoomPane,
} from './helpers.ts'

export const hooksContract = (adapter: UpstreamHostAdapter) => {
  const get = (page: Page, selector: string) => adapter.locator(page, selector)
  // examples/react/cypress/components/hooks/useEdges.cy.tsx:7
  test('[UP-128-001] handles edges', async ({ page }) => {
    await componentMount(page, adapter, 1)
    await expect
      .poll(() => history(page, 'edges'))
      .toContainEqual([{ id: 'e1', source: '1', target: '2' }])
  })

  // examples/react/cypress/components/hooks/useEdges.cy.tsx:19
  test('[UP-128-002] handles defaultEdges', async ({ page }) => {
    await componentMount(page, adapter, 2)
    await expect.poll(() => history(page, 'edges')).toContainEqual([])
    await expect
      .poll(() => history(page, 'edges'))
      .toContainEqual([{ id: 'e1', source: '1', target: '2' }])
  })

  // examples/react/cypress/components/hooks/useNodes.cy.tsx:24
  test('[UP-128-003] handles nodes', async ({ page }) => {
    await componentMount(page, adapter, 3)
    await expect
      .poll(() => nodeSnapshot(page, adapter))
      .toContainEqual(expectedNodes)
  })

  // examples/react/cypress/components/hooks/useNodes.cy.tsx:36
  test('[UP-128-004] handles defaultNodes', async ({ page }) => {
    await componentMount(page, adapter, 4)
    await expect.poll(() => nodeSnapshot(page, adapter)).toContainEqual([])
    await expect
      .poll(() => nodeSnapshot(page, adapter))
      .toContainEqual(expectedNodes)
  })

  // examples/react/cypress/components/hooks/useNodesInitialized.cy.tsx:7
  test('[UP-128-005] returns false for no nodes', async ({ page }) => {
    await componentMount(page, adapter, 5)
    await expect.poll(() => history(page, 'initialized')).toContain(false)
  })

  // examples/react/cypress/components/hooks/useNodesInitialized.cy.tsx:20
  test('[UP-128-006] returns false without onNodesChange', async ({ page }) => {
    await componentMount(page, adapter, 6)
    await expect.poll(() => history(page, 'initialized')).toContain(false)
  })

  // examples/react/cypress/components/hooks/useNodesInitialized.cy.tsx:33
  test('[UP-128-007] returns true for defaultNodes', async ({ page }) => {
    await componentMount(page, adapter, 7)
    await expect.poll(() => history(page, 'initialized')).toContain(false)
    await expect.poll(() => history(page, 'initialized')).toContain(true)
  })

  // examples/react/cypress/components/hooks/useNodesInitialized.cy.tsx:46
  test('[UP-128-008] returns true for nodes + onNodesChange', async ({
    page,
  }) => {
    await componentMount(page, adapter, 8)
    await expect.poll(() => history(page, 'initialized')).toContain(false)
    await expect.poll(() => history(page, 'initialized')).toContain(true)
  })

  // examples/react/cypress/components/hooks/useOnViewportChange.cy.tsx:4
  test('[UP-128-009] listen to viewport drag', async ({ page }) => {
    await componentMount(page, adapter, 9)
    await dragPane(
      page,
      get(page, '.react-flow__pane'),
      { x: 50, y: 50 },
      { x: 50, y: 100 }
    )
    await expect
      .poll(() => history(page, 'starts'))
      .toContainEqual({ x: 0, y: 0, zoom: 1 })
    await expect
      .poll(() => history(page, 'changes'))
      .toContainEqual({ x: 0, y: 50, zoom: 1 })
    await expect
      .poll(() => history(page, 'ends'))
      .toContainEqual({ x: 0, y: 50, zoom: 1 })
  })

  // examples/react/cypress/components/hooks/useOnViewportChange.cy.tsx:22
  test('[UP-128-010] handles zoom in', async ({ page }) => {
    await componentMount(page, adapter, 10)
    await zoomPane(page, get(page, '.react-flow__pane'), -200)
    await expect.poll(() => history(page, 'starts')).toHaveLength(1)
    await expect.poll(() => history(page, 'changes')).toHaveLength(1)
    await expect.poll(() => history(page, 'ends')).toHaveLength(1)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBeGreaterThan(1)
  })

  // examples/react/cypress/components/hooks/useOnViewportChange.cy.tsx:42
  test('[UP-128-011] handles zoom out', async ({ page }) => {
    await componentMount(page, adapter, 11)
    await zoomPane(page, get(page, '.react-flow__pane'), 200)
    await expect.poll(() => history(page, 'starts')).toHaveLength(1)
    await expect.poll(() => history(page, 'changes')).toHaveLength(1)
    await expect.poll(() => history(page, 'ends')).toHaveLength(1)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBeLessThan(1)
  })

  // examples/react/cypress/components/hooks/useOnViewportChange.cy.tsx:62
  test('[UP-128-012] handles default viewport', async ({ page }) => {
    await componentMount(page, adapter, 12)
    await dragPane(
      page,
      get(page, '.react-flow__pane'),
      { x: 50, y: 50 },
      { x: 50, y: 100 }
    )
    await expect
      .poll(() => history(page, 'starts'))
      .toContainEqual({ x: 100, y: 100, zoom: 0.5 })
  })

  // examples/react/cypress/components/hooks/useViewport.cy.tsx:4
  test('[UP-128-013] handles drag', async ({ page }) => {
    await componentMount(page, adapter, 13)
    await expect
      .poll(() => history(page, 'viewports'))
      .toContainEqual({ x: 0, y: 0, zoom: 1 })
    await dragPane(
      page,
      get(page, '.react-flow__pane'),
      { x: 50, y: 0 },
      { x: 50, y: 400 }
    )
    await expect.poll(() => history(page, 'viewports')).toHaveLength(2)
    await expect
      .poll(() => history(page, 'viewports'))
      .toContainEqual({ x: 0, y: 0, zoom: 1 })
    await expect
      .poll(() => latestViewport(page))
      .toEqual({ x: 0, y: 400, zoom: 1 })
  })

  // examples/react/cypress/components/hooks/useViewport.cy.tsx:23
  test('[UP-128-014] handles zoom in', async ({ page }) => {
    await componentMount(page, adapter, 14)
    await zoomPane(page, get(page, '.react-flow__pane'), -200)
    await expect.poll(() => history(page, 'viewports')).toHaveLength(2)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBeGreaterThan(1)
  })

  // examples/react/cypress/components/hooks/useViewport.cy.tsx:38
  test('[UP-128-015] handles zoom out', async ({ page }) => {
    await componentMount(page, adapter, 15)
    await zoomPane(page, get(page, '.react-flow__pane'), 200)
    await expect.poll(() => history(page, 'viewports')).toHaveLength(2)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBeLessThan(1)
  })

  // examples/react/cypress/components/hooks/useViewport.cy.tsx:53
  test('[UP-128-016] handles default viewport', async ({ page }) => {
    await componentMount(page, adapter, 16)
    await expect
      .poll(() => history(page, 'viewports'))
      .toContainEqual({ x: 100, y: 100, zoom: 0.5 })
  })
}
