import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

test('Vue mini map renders visible graph geometry and recenters the canvas', async ({
  page,
}) => {
  await page.goto('/minimap-test.html')

  const miniMap = page.getByRole('button', { name: /Mini map/iu })
  await expect(miniMap).toBeVisible()
  await expect(miniMap.locator('[data-minimap-node="near"]')).toHaveCount(1)
  await expect(miniMap.locator('[data-minimap-node="far"]')).toHaveCount(1)
  await expect(miniMap.locator('[data-minimap-node="hidden"]')).toHaveCount(0)
  await expect(miniMap.getByTestId('flow-minimap-viewport')).toBeVisible()

  const box = await miniMap.boundingBox()

  if (box === null) {
    throw new Error('Mini map has no rendered bounds')
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.evaluate(() => window.__flowMiniMapResetPaneEvents?.())
  await page.mouse.click(box.x + box.width * 0.88, box.y + box.height * 0.55)
  await expect
    .poll(() => page.evaluate(() => window.__flowMiniMapViewport?.().x))
    .toBeLessThan(-100)
  await expect
    .poll(() => page.evaluate(() => window.__flowMiniMapPaneEvents?.()))
    .toBe(0)
})

test('Vue MiniMap projects accepted DOM measurements without editing document data', async ({
  page,
}) => {
  await page.goto('/minimap-test.html')

  const node = page.locator('[data-node-id="far"]')
  const miniMapNode = page.locator('[data-minimap-node="far"]')

  await expect
    .poll(() =>
      page.evaluate(
        () => window.__flowMiniMapInternalNode?.('far')?.measurementStatus
      )
    )
    .toBe('measured')

  const originalProjection = await page.evaluate(() =>
    window.__flowMiniMapExpectedNodes?.()?.find(({ id }) => id === 'far')
  )

  if (originalProjection === undefined) {
    throw new Error('Initial accepted MiniMap projection is unavailable')
  }

  await node.evaluate((element) => {
    element.style.minWidth = '300px'
    element.style.minHeight = '180px'
  })

  await expect
    .poll(() =>
      page.evaluate(() => {
        const internal = window.__flowMiniMapInternalNode?.('far')

        return internal?.measurementStatus === 'measured'
          ? { width: internal.width, height: internal.height }
          : undefined
      })
    )
    .toEqual({ width: 300, height: 180 })

  const acceptedProjection = await page.evaluate(() =>
    window.__flowMiniMapExpectedNodes?.()?.find(({ id }) => id === 'far')
  )

  if (acceptedProjection === undefined) {
    throw new Error('Updated accepted MiniMap projection is unavailable')
  }

  await expect(miniMapNode).toHaveAttribute(
    'width',
    String(acceptedProjection.width)
  )
  await expect(miniMapNode).toHaveAttribute(
    'height',
    String(acceptedProjection.height)
  )
  expect(acceptedProjection.width).not.toBe(originalProjection.width)
  expect(acceptedProjection.height).not.toBe(originalProjection.height)

  const documentNode = await page.evaluate(() =>
    window.__flowMiniMapDocument?.().nodes.find(({ id }) => id === 'far')
  )

  expect(documentNode?.size).toEqual({ width: 180, height: 90 })
})

test('Vue mini map isolates canvas pointer, mouse, wheel, and context events', async ({
  page,
}) => {
  await page.goto('/minimap-test.html')

  const miniMap = page.getByRole('button', { name: /Mini map/iu })
  const box = await miniMap.boundingBox()

  if (box === null) {
    throw new Error('Mini map has no rendered bounds')
  }

  const point = {
    clickX: box.x + box.width * 0.88,
    clickY: box.y + box.height * 0.55,
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }

  await page.mouse.move(point.x, point.y)
  await page.evaluate(() => window.__flowMiniMapResetPaneEvents?.())

  await page.keyboard.down('Shift')
  await miniMap.evaluate((element, coordinates) => {
    const init = {
      bubbles: true,
      cancelable: true,
      clientX: coordinates.x,
      clientY: coordinates.y,
    }

    for (const type of ['pointermove', 'pointerup', 'pointercancel']) {
      element.dispatchEvent(new PointerEvent(type, init))
    }

    for (const type of ['mousemove', 'mouseenter', 'mouseleave']) {
      element.dispatchEvent(new MouseEvent(type, init))
    }

    element.dispatchEvent(new WheelEvent('wheel', { ...init, deltaY: 120 }))
    element.dispatchEvent(new MouseEvent('contextmenu', init))
    element.dispatchEvent(new MouseEvent('dblclick', init))
    element.dispatchEvent(
      new PointerEvent('pointerdown', { ...init, button: 1 })
    )
    element.dispatchEvent(
      new MouseEvent('click', {
        ...init,
        clientX: coordinates.clickX,
        clientY: coordinates.clickY,
      })
    )
  }, point)
  await page.keyboard.up('Shift')

  await expect
    .poll(() => page.evaluate(() => window.__flowMiniMapPaneEvents?.()))
    .toBe(0)
  await expect
    .poll(() => page.evaluate(() => window.__flowMiniMapViewport?.().zoom))
    .toBe(1)
  await expect
    .poll(() => page.evaluate(() => window.__flowMiniMapViewport?.().x))
    .toBeLessThan(-100)
})

const assertKeyboardCenter = async (
  page: Page,
  key: 'Enter' | 'Space'
): Promise<void> => {
  await page.goto('/minimap-test.html')

  const miniMap = page.getByRole('button', { name: /Mini map/iu })
  await miniMap.focus()
  await expect(miniMap).toBeFocused()
  await miniMap.press(key)

  const canvasCenter = await page
    .locator('.flow-vue-canvas')
    .evaluate((canvas) => {
      if (!(canvas instanceof HTMLElement)) {
        throw new TypeError('Canvas fixture element is not an HTMLElement')
      }

      return {
        x: canvas.clientWidth / 2,
        y: canvas.clientHeight / 2,
      }
    })

  await expect
    .poll(() => page.evaluate(() => window.__flowMiniMapViewport?.().x))
    .toBeCloseTo(canvasCenter.x - 490, 4)
  await expect
    .poll(() => page.evaluate(() => window.__flowMiniMapViewport?.().y))
    .toBeCloseTo(canvasCenter.y - 245, 4)
}

test('Vue mini map centers the graph with Enter', async ({ page }) => {
  await assertKeyboardCenter(page, 'Enter')
})

test('Vue mini map centers the graph with Space', async ({ page }) => {
  await assertKeyboardCenter(page, 'Space')
})

test('Vue mini map keyboard activation preserves an active canvas selection', async ({
  page,
}) => {
  await page.goto('/minimap-test.html')

  const nearNode = page.locator('[data-node-id="near"]')
  await nearNode.focus()
  await page.keyboard.press('Shift+Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')

  const selectionStatus = page.getByTestId('flow-selection-keyboard-status')
  const selectionRect = page.getByTestId('flow-selection-rect')
  await expect(selectionStatus).toBeVisible()
  await expect(selectionRect).toBeVisible()

  const miniMap = page.getByRole('button', { name: /Mini map/iu })
  await miniMap.focus()
  await miniMap.press('Enter')

  const canvasCenter = await page
    .locator('.flow-vue-canvas')
    .evaluate((canvas) => {
      if (!(canvas instanceof HTMLElement)) {
        throw new TypeError('Canvas fixture element is not an HTMLElement')
      }

      return {
        x: canvas.clientWidth / 2,
        y: canvas.clientHeight / 2,
      }
    })

  await expect
    .poll(() => page.evaluate(() => window.__flowMiniMapViewport?.().x))
    .toBeCloseTo(canvasCenter.x - 490, 4)
  await expect
    .poll(() => page.evaluate(() => window.__flowMiniMapViewport?.().y))
    .toBeCloseTo(canvasCenter.y - 245, 4)
  await expect(selectionStatus).toBeVisible()
  await expect(selectionRect).toBeVisible()

  await miniMap.press('Escape')
  await expect(selectionStatus).toBeVisible()
  await expect(selectionRect).toBeVisible()
})

test('Vue mini map handles an empty graph accessibly', async ({ page }) => {
  await page.goto('/minimap-test.html?empty=1')
  const miniMap = page.getByRole('img', { name: 'Mini map (empty graph)' })
  await expect(miniMap).toBeVisible()
  await expect(miniMap.locator('[data-minimap-node]')).toHaveCount(0)

  const box = await miniMap.boundingBox()

  if (box === null) {
    throw new Error('Empty mini map has no rendered bounds')
  }

  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  await page.mouse.move(point.x, point.y)
  await page.evaluate(() => window.__flowMiniMapResetPaneEvents?.())
  await miniMap.evaluate((element, coordinates) => {
    const init = {
      bubbles: true,
      cancelable: true,
      clientX: coordinates.x,
      clientY: coordinates.y,
    }

    for (const type of ['pointermove', 'pointerup', 'pointercancel']) {
      element.dispatchEvent(new PointerEvent(type, init))
    }

    for (const type of ['mousemove', 'mouseenter', 'mouseleave']) {
      element.dispatchEvent(new MouseEvent(type, init))
    }

    element.dispatchEvent(new WheelEvent('wheel', { ...init, deltaY: 120 }))
    element.dispatchEvent(new MouseEvent('contextmenu', init))
    element.dispatchEvent(new MouseEvent('dblclick', init))
    element.dispatchEvent(
      new PointerEvent('pointerdown', { ...init, button: 1 })
    )
  }, point)

  await expect
    .poll(() => page.evaluate(() => window.__flowMiniMapPaneEvents?.()))
    .toBe(0)
  await expect
    .poll(() => page.evaluate(() => window.__flowMiniMapViewport?.().zoom))
    .toBe(1)
})
