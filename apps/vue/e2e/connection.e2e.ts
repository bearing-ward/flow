import { expect, test } from '@playwright/test'

test('enabled handle connections render a default edge', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Block connections' })
  ).toBeEnabled()

  const source = page.locator('[data-node-id="input"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="output"] [data-handle-id="in"]')
  const sourceBounds = await source.boundingBox()
  const targetBounds = await target.boundingBox()

  if (sourceBounds === null || targetBounds === null) {
    throw new Error('Expected the demo connection handles to be visible')
  }

  const from = {
    x: sourceBounds.x + sourceBounds.width / 2,
    y: sourceBounds.y + sourceBounds.height / 2,
  }

  const to = {
    x: targetBounds.x + targetBounds.width / 2,
    y: targetBounds.y + targetBounds.height / 2,
  }

  const edgeCount = await page.getByTestId('flow-edge').count()

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await expect(page.getByTestId('flow-connection-preview')).toHaveAttribute(
    'd',
    /^M /u
  )
  await page.mouse.up()

  await expect(page.getByTestId('flow-edge')).toHaveCount(edgeCount + 1)
  await expect(page.getByTestId('flow-edge-path').last()).toHaveAttribute(
    'd',
    /^M /u
  )

  const secondSource = page.locator(
    '[data-node-id="transform"] [data-handle-id="out"]'
  )

  const secondTarget = page.locator(
    '[data-node-id="output"] [data-handle-id="in"]'
  )

  const secondSourceBounds = await secondSource.boundingBox()

  const secondTargetBounds = await secondTarget.boundingBox()

  if (secondSourceBounds === null || secondTargetBounds === null) {
    throw new Error('Expected the demo click-connection handles to be visible')
  }

  await page.mouse.click(
    secondSourceBounds.x + secondSourceBounds.width / 2,
    secondSourceBounds.y + secondSourceBounds.height / 2
  )
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(1)
  await page.mouse.click(
    secondTargetBounds.x + secondTargetBounds.width / 2,
    secondTargetBounds.y + secondTargetBounds.height / 2
  )
  await expect(page.getByTestId('flow-edge')).toHaveCount(edgeCount + 2)
})
