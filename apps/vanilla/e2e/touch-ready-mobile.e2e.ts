import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const centerOf = async (page: Page, selector: string) => {
  const box = await page.locator(selector).boundingBox()

  if (box === null) {
    throw new Error(`Missing bounds for ${selector}`)
  }

  return {
    x: Math.round(box.x + box.width / 2),
    y: Math.round(box.y + box.height / 2),
  }
}

test('Touch-ready scene supports a synthetic mobile touch connection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Touch-ready' }).click()
  await expect(page.locator('#app')).toHaveAttribute(
    'data-playground-scene',
    'touch-ready'
  )

  const sourceSelector =
    '.flow-handle[data-node-id="touch-source"][data-kind="source"]'

  const targetSelector =
    '.flow-handle[data-node-id="touch-target"][data-kind="target"]'

  const resizeSelector =
    '.flow-node-resize-handle[data-direction="bottom-right"]'

  const source = page.locator(sourceSelector)
  const target = page.locator(targetSelector)
  const resize = page.locator(resizeSelector)
  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()
  const resizeBox = await resize.boundingBox()

  expect(sourceBox?.width).toBeGreaterThanOrEqual(28)
  expect(sourceBox?.height).toBeGreaterThanOrEqual(28)
  expect(targetBox?.width).toBeGreaterThanOrEqual(28)
  expect(targetBox?.height).toBeGreaterThanOrEqual(28)
  expect(resizeBox?.width).toBeGreaterThanOrEqual(28)
  expect(resizeBox?.height).toBeGreaterThanOrEqual(28)

  for (const box of [sourceBox, targetBox, resizeBox]) {
    expect(box).not.toBeNull()
    expect(box?.x).toBeGreaterThanOrEqual(0)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390)
    expect(box?.y).toBeGreaterThanOrEqual(0)
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844)
  }

  const sourcePoint = await centerOf(page, sourceSelector)
  const targetPoint = await centerOf(page, targetSelector)
  expect(
    await page.evaluate(
      ({ x, y }) =>
        document
          .elementFromPoint(x, y)
          ?.matches(
            '.flow-handle[data-node-id="touch-source"][data-kind="source"]'
          ),
      sourcePoint
    )
  ).toBe(true)
  expect(
    await page.evaluate(
      ({ x, y }) =>
        document
          .elementFromPoint(x, y)
          ?.matches(
            '.flow-handle[data-node-id="touch-target"][data-kind="target"]'
          ),
      targetPoint
    )
  ).toBe(true)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [sourcePoint],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [targetPoint],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })

  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
  await expect(page.locator('#app')).toHaveAttribute(
    'data-last-change',
    /edge-add/u
  )
})
