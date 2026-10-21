import { test, expect } from '@playwright/test'

import { boundingBox, getTransform } from './adapter.ts'
import type { UpstreamHostAdapter } from './adapter.ts'

export const nodesContract = (adapter: UpstreamHostAdapter): void => {
  test.describe('Nodes', () => {
    test.beforeEach(async ({ page }) => {
      // Go to the starting url before each test.
      await adapter.goto(page, '/upstream/nodes/general')
    })

    test.describe('selection', () => {
      // Upstream: tests/playwright/e2e/nodes.spec.ts:13
      test('[UP-126-021] selecting a node by click', async ({ page }) => {
        const locator = adapter.locator(page, `.react-flow__node`).first()
        await locator.click()

        await expect(locator).toHaveClass(/selected/u)
      })

      // Upstream: tests/playwright/e2e/nodes.spec.ts:20
      test('[UP-126-022] selecting multiple nodes with shift drag', async ({
        page,
      }) => {
        const nodeSelection = adapter.locator(
          page,
          '.react-flow__nodesselection'
        )

        const selection = adapter.locator(page, '.react-flow__selection')

        const nodes = adapter.locator(page, `.react-flow__node`)

        await expect(nodes.first()).toHaveCSS('visibility', 'visible')
        await expect(nodes.nth(1)).toHaveCSS('visibility', 'visible')
        await expect(nodes.nth(2)).toHaveCSS('visibility', 'visible')
        const box = await boundingBox(nodes.first())

        await page.keyboard.down('Shift')
        await page.mouse.move(box.x - 150, box.y - 25)
        await page.mouse.down()
        await page.mouse.move(box.x + 275, box.y + 200)

        await expect(selection).toBeInViewport()
        await page.mouse.up()
        await page.keyboard.up('Shift')

        await expect(nodes.first()).toHaveClass(/selected/u)
        await expect(nodes.nth(1)).toHaveClass(/selected/u)
        await expect(nodes.nth(2)).toHaveClass(/selected/u)

        await expect(nodeSelection).toBeInViewport()
      })

      // Upstream: tests/playwright/e2e/nodes.spec.ts:49
      test('[UP-126-023] panning from a multi-selection rectangle with the middle mouse button', async ({
        page,
      }) => {
        const nodes = adapter.locator(page, '.react-flow__node')

        const selection = adapter.locator(
          page,
          '.react-flow__nodesselection-rect'
        )

        const viewport = adapter.locator(page, '.react-flow__viewport')

        await expect(nodes.first()).toHaveCSS('visibility', 'visible')
        const nodeBox = await boundingBox(nodes.first())

        await page.keyboard.down('Shift')
        await page.mouse.move(nodeBox.x - 150, nodeBox.y - 25)
        await page.mouse.down()
        await page.mouse.move(nodeBox.x + 275, nodeBox.y + 200)
        await page.mouse.up()
        await page.keyboard.up('Shift')

        await expect(selection).toBeInViewport()
        const selectionBox = await boundingBox(selection)
        const transformsBefore = await getTransform(viewport)

        const selectionCenter = {
          x: selectionBox.x + selectionBox.width / 2,
          y: selectionBox.y + selectionBox.height / 2,
        }

        await page.mouse.move(selectionCenter.x, selectionCenter.y)
        await page.mouse.down({ button: 'middle' })
        await page.mouse.move(selectionCenter.x + 100, selectionCenter.y + 100)
        await page.mouse.up({ button: 'middle' })

        const transformsAfter = await getTransform(viewport)

        expect(transformsAfter.translateX).not.toBe(transformsBefore.translateX)
        expect(transformsAfter.translateY).not.toBe(transformsBefore.translateY)
      })

      // Upstream: tests/playwright/e2e/nodes.spec.ts:85
      test('[UP-126-024] selectable=false prevents selection', async ({
        page,
      }) => {
        const locator = adapter
          .locator(page, `.react-flow__node`)
          .and(adapter.locator(page, '[data-id="notSelectable"]'))

        await expect(
          adapter.locator(page, `.react-flow__node`).first()
        ).toHaveCSS('visibility', 'visible')
        await locator.click()

        await expect(locator).not.toHaveClass(/selected/u)
      })
    })

    test.describe('dragging', () => {
      // Upstream: tests/playwright/e2e/nodes.spec.ts:95
      test('[UP-126-025] dragging a node', async ({ page }) => {
        const node = adapter.locator(page, `.react-flow__node`).first()

        await expect(node).toHaveCSS('visibility', 'visible')

        const transformBeforeMove = await adapter.nodeTransform(node)

        await node.hover()
        await page.mouse.down()
        await page.mouse.move(500, 500)
        await page.mouse.up()

        const transformAfterMove = await adapter.nodeTransform(node)

        expect(transformBeforeMove).not.toMatch(transformAfterMove)
      })

      // Upstream: tests/playwright/e2e/nodes.spec.ts:116
      test('[UP-126-026] draggable=false prevents dragging', async ({
        page,
      }) => {
        const node = adapter
          .locator(page, `.react-flow__node`)
          .and(adapter.locator(page, '[data-id="notDraggable"]'))

        await expect(node).toHaveCSS('visibility', 'visible')

        const transformBeforeMove = await adapter.nodeTransform(node)

        await node.hover()
        await page.mouse.down()
        await page.mouse.move(500, 500)
        await page.mouse.up()

        const transformAfterMove = await adapter.nodeTransform(node)

        expect(transformBeforeMove).toMatch(transformAfterMove)
      })

      // Upstream: tests/playwright/e2e/nodes.spec.ts:136
      test('[UP-126-027] custom drag handle works', async ({ page }) => {
        const node = adapter
          .locator(page, `.react-flow__node`)
          .and(adapter.locator(page, '[data-id="drag-handle"]'))

        await expect(node).toHaveCSS('visibility', 'visible')
        const dragHandle = adapter.locator(page, '.custom-drag-handle')

        const transformBeforeMove = await adapter.nodeTransform(node)

        const nodeBox = await boundingBox(node)

        await page.mouse.move(nodeBox.x + 10, nodeBox.y + 10)
        await page.mouse.down()
        await page.mouse.move(500, 500)
        await page.mouse.up()

        const transformAfterMove = await adapter.nodeTransform(node)

        expect(transformBeforeMove).toMatch(transformAfterMove)

        await dragHandle.hover()
        await page.mouse.down()
        await page.mouse.move(500, 500)
        await page.mouse.up()

        const transformAfterDragHandleMove = await adapter.nodeTransform(node)

        expect(transformBeforeMove).not.toMatch(transformAfterDragHandleMove)
      })
    })

    test.describe('deleting', () => {
      // Upstream: tests/playwright/e2e/nodes.spec.ts:172
      test('[UP-126-028] deleting a node and its edges', async ({ page }) => {
        const node = adapter
          .locator(page, `.react-flow__node`)
          .and(adapter.locator(page, '[data-id="Node-1"]'))

        await expect(node).toHaveCSS('visibility', 'visible')

        await node.click()
        await page.keyboard.press('d')

        await expect(node).not.toBeAttached()

        const edges = await adapter.locator(page, `.react-flow__edge`).all()
        expect(edges).toHaveLength(0)
      })

      // Upstream: tests/playwright/e2e/nodes.spec.ts:185
      test('[UP-126-029] deletable=false prevents deletion', async ({
        page,
      }) => {
        const node = adapter
          .locator(page, `.react-flow__node`)
          .and(adapter.locator(page, '[data-id="notDeletable"]'))

        await expect(node).toHaveCSS('visibility', 'visible')

        await expect(node).toBeAttached()

        await node.click()
        // pressing backspace breaks webkit
        await page.keyboard.press('d')

        await expect(node).toBeAttached()
      })
    })

    test.describe('connecting', () => {
      // Upstream: tests/playwright/e2e/nodes.spec.ts:200
      test('[UP-126-030] connecting two nodes', async ({ page }) => {
        const connectionLine = adapter.locator(
          page,
          `.react-flow__connectionline`
        )

        const outputSourceHandle = adapter
          .locator(page, `.react-flow__handle`)
          .and(adapter.locator(page, '[data-nodeid="Node-1"]'))

        const inputSourceHandle = adapter
          .locator(page, `.react-flow__handle`)
          .and(adapter.locator(page, '[data-nodeid="Node-4"]'))

        await expect(
          adapter.locator(page, `.react-flow__node`).first()
        ).toHaveCSS('visibility', 'visible')
        await expect(outputSourceHandle).toBeInViewport()
        await expect(inputSourceHandle).toBeInViewport()

        await expect(adapter.locator(page, `.react-flow__edge`)).toHaveCount(2)

        await outputSourceHandle.hover()
        await page.mouse.down()
        await inputSourceHandle.hover()
        await expect(connectionLine).toBeInViewport()
        await page.mouse.up()

        await expect(connectionLine).not.toBeInViewport()

        await expect(
          adapter.locator(page, '[data-id="xy-edge__Node-1-Node-4"]')
        ).toBeInViewport()

        await expect(adapter.locator(page, `.react-flow__edge`)).toHaveCount(3)
      })

      // Upstream: tests/playwright/e2e/nodes.spec.ts:224
      test('[UP-126-031] connecting two output handles does not work', async ({
        page,
      }) => {
        const connectionLine = adapter.locator(
          page,
          `.react-flow__connectionline`
        )

        const firstOutputHandle = adapter
          .locator(page, `.react-flow__handle`)
          .and(adapter.locator(page, '[data-nodeid="Node-2"]'))

        const secondOutputHandle = adapter
          .locator(page, `.react-flow__handle`)
          .and(adapter.locator(page, '[data-nodeid="Node-4"]'))

        await expect(
          adapter.locator(page, `.react-flow__node`).first()
        ).toHaveCSS('visibility', 'visible')
        await expect(firstOutputHandle).toBeInViewport()
        await expect(secondOutputHandle).toBeInViewport()

        await expect(adapter.locator(page, `.react-flow__edge`)).toHaveCount(2)

        await firstOutputHandle.hover()
        await page.mouse.down()

        // await secondOutputHandle.hover();
        // Does not work in SvelteFlow for whatever reason!?
        // but the following works...
        const box = await boundingBox(secondOutputHandle)
        await page.mouse.move(box.x + 2, box.y + 2)

        await expect(connectionLine).toBeInViewport()
        await page.mouse.up()

        await expect(connectionLine).not.toBeInViewport()

        await expect(adapter.locator(page, `.react-flow__edge`)).toHaveCount(2)
      })

      // Upstream: tests/playwright/e2e/nodes.spec.ts:252
      test('[UP-126-032] connecting two input handles does not work', async ({
        page,
      }) => {
        const connectionLine = adapter.locator(
          page,
          `.react-flow__connectionline`
        )

        const firstInputHandle = adapter
          .locator(page, `.react-flow__handle`)
          .and(adapter.locator(page, '[data-nodeid="Node-1"]'))

        const secondInputHandle = adapter
          .locator(page, `.react-flow__handle`)
          .and(adapter.locator(page, '[data-nodeid="Node-3"]'))
          .and(adapter.locator(page, '.source'))

        await expect(
          adapter.locator(page, `.react-flow__node`).first()
        ).toHaveCSS('visibility', 'visible')
        await expect(firstInputHandle).toBeInViewport()
        await expect(secondInputHandle).toBeInViewport()

        await expect(adapter.locator(page, `.react-flow__edge`)).toHaveCount(2)

        await firstInputHandle.hover()
        await page.mouse.down()

        // await secondInputHandle.hover();
        // Does not work in SvelteFlow for whatever reason!?
        // but the following works...
        const box = await boundingBox(secondInputHandle)
        await page.mouse.move(box.x + 2, box.y + 2)

        await expect(connectionLine).toBeInViewport()
        await page.mouse.up()

        await expect(connectionLine).not.toBeInViewport()

        await expect(adapter.locator(page, `.react-flow__edge`)).toHaveCount(2)
      })

      // Upstream: tests/playwright/e2e/nodes.spec.ts:283
      test('[UP-126-033] connectable=false prevents connections', async ({
        page,
      }) => {
        const outputHandle = adapter
          .locator(page, `.react-flow__handle`)
          .and(adapter.locator(page, '[data-nodeid="Node-1"]'))

        const notConnectableHandle = adapter
          .locator(page, `.react-flow__handle`)
          .and(adapter.locator(page, '[data-nodeid="notConnectable"]'))

        const notConnectableBox = await boundingBox(notConnectableHandle)

        await expect(
          adapter.locator(page, `.react-flow__node`).first()
        ).toHaveCSS('visibility', 'visible')
        await expect(outputHandle).toBeInViewport()
        await expect(notConnectableHandle).toBeInViewport()

        await expect(adapter.locator(page, `.react-flow__edge`)).toHaveCount(2)

        await outputHandle.hover()
        await page.mouse.down()
        await page.mouse.move(notConnectableBox.x + 2, notConnectableBox.y + 2)
        await page.mouse.up()

        await expect(adapter.locator(page, `.react-flow__edge`)).toHaveCount(2)
      })
    })

    // Upstream: tests/playwright/e2e/nodes.spec.ts:306
    test('[UP-126-034] hidden=true hides the node', async ({ page }) => {
      const node = adapter
        .locator(page, `.react-flow__node`)
        .and(adapter.locator(page, '[data-id="hidden"]'))

      await expect(node).not.toBeInViewport()
    })

    // Upstream: tests/playwright/e2e/nodes.spec.ts:312
    test('[UP-126-035] classes get applied', async ({ page }) => {
      const node = adapter
        .locator(page, `.react-flow__node`)
        .and(adapter.locator(page, '[data-id="Node-1"]'))

      await expect(node).toHaveCSS('visibility', 'visible')

      await expect(node).toHaveClass(/playwright-test-class-123/u)
    })

    // Upstream: tests/playwright/e2e/nodes.spec.ts:319
    test('[UP-126-036] styles get applied', async ({ page }) => {
      const node = adapter
        .locator(page, `.react-flow__node`)
        .and(adapter.locator(page, '[data-id="Node-1"]'))

      await expect(node).toHaveCSS('visibility', 'visible')

      await expect(node).toHaveCSS('background-color', 'rgb(255, 0, 0)')
    })
  })
}
