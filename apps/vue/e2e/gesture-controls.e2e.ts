import { expect, test } from '@playwright/test'

test('Vue desktop gesture controls expose connection events and keyboard resize and drag', async ({
  page,
}) => {
  await page.goto('/')

  const resizeControl = page.getByRole('button', {
    name: 'Enable resize controls',
  })

  await resizeControl.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('button', { name: 'Disable resize controls' })
  ).toHaveAttribute('aria-pressed', 'true')

  const rightResize = page.locator(
    '[data-node-id="transform"] [data-direction="right"]'
  )

  await expect(rightResize).toBeVisible()

  const initialWidth = await page
    .locator('[data-node-id="transform"]')
    .evaluate((node) => getComputedStyle(node).width)

  await rightResize.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-node-id="transform"]')).not.toHaveCSS(
    'width',
    initialWidth
  )

  const dragControl = page.getByRole('button', { name: 'Show drag handle' })
  await dragControl.focus()
  await page.keyboard.press('Enter')
  const dragHandle = page.getByTestId('demo-drag-handle')
  await expect(dragHandle).toBeVisible()
  const input = page.locator('[data-node-id="input"]')

  const initialLeft = await input.evaluate((node) =>
    Number(getComputedStyle(node).left)
  )

  await dragHandle.focus()
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() => input.evaluate((node) => Number(getComputedStyle(node).left)))
    .toBe(initialLeft + 5)

  const source = page.locator('[data-node-id="input"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="output"] [data-handle-id="in"]')
  const sourceBounds = await source.boundingBox()
  const targetBounds = await target.boundingBox()

  if (sourceBounds === null || targetBounds === null) {
    throw new Error('Missing Vue connection handles')
  }

  await page.mouse.move(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y + targetBounds.height / 2,
    { steps: 5 }
  )
  await page.mouse.up()
  await expect(page.getByTestId('connection-events')).toContainText(
    'started → accepted:input→output'
  )

  await page.reload()
  await page.getByRole('button', { name: 'Block connections' }).click()
  const refreshedSource = await source.boundingBox()
  const refreshedTarget = await target.boundingBox()

  if (refreshedSource === null || refreshedTarget === null) {
    throw new Error('Missing connection handles after event reset')
  }

  await page.mouse.move(
    refreshedSource.x + refreshedSource.width / 2,
    refreshedSource.y + refreshedSource.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    refreshedTarget.x + refreshedTarget.width / 2,
    refreshedTarget.y + refreshedTarget.height / 2,
    { steps: 5 }
  )
  await page.mouse.up()
  await expect(page.getByTestId('connection-events')).toContainText(
    'started → rejected:input→output'
  )
})

test('Vue narrow touch-ready controls stay keyboard reachable and support touch drag', async ({
  browser,
  baseURL,
}) => {
  if (baseURL === undefined) {
    throw new Error('Missing configured Vue test URL')
  }

  const context = await browser.newContext({
    baseURL,
    viewport: { width: 360, height: 780 },
    isMobile: true,
    hasTouch: true,
  })

  const page = await context.newPage()

  await page.goto('/')

  const touchControl = page.getByRole('button', {
    name: 'Enable touch-ready targets',
  })

  await expect(touchControl).toBeVisible()
  await touchControl.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('button', { name: 'Disable touch-ready targets' })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.locator('[data-node-id="input"] [data-handle-id="out"]')
  ).toHaveCSS('width', '44px')

  const handle = page.getByTestId('demo-drag-handle')
  await page.getByRole('button', { name: 'Show drag handle' }).focus()
  await page.keyboard.press('Enter')
  await expect(handle).toBeVisible()
  await handle.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[data-node-id="input"]')).toHaveCSS('top', '125px')

  const dragHandleBox = await handle.boundingBox()

  const inputBeforeTouch = await page
    .locator('[data-node-id="input"]')
    .evaluate((node) => Number(getComputedStyle(node).left))

  if (dragHandleBox === null) {
    throw new Error('Missing visible drag handle for touch gesture')
  }

  const cdp = await context.newCDPSession(page)

  const start = {
    x: dragHandleBox.x + dragHandleBox.width / 2,
    y: dragHandleBox.y + dragHandleBox.height / 2,
  }

  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 1, ...start }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ id: 1, x: start.x + 24, y: start.y + 12 }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })

  await expect
    .poll(() =>
      page
        .locator('[data-node-id="input"]')
        .evaluate((node) => Number(getComputedStyle(node).left))
    )
    .toBe(inputBeforeTouch + 24)
  await context.close()
})
