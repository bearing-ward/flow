import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const nodePosition = (page: Page, id: string) =>
  page.locator(`.flow-node[data-node-id="${id}"]`).evaluate((element) => {
    const transform = new DOMMatrixReadOnly(getComputedStyle(element).transform)

    return { x: transform.m41, y: transform.m42 }
  })

test('playground exposes and switches between completed interaction scenes', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Flow playground' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Main graph' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Distant graph' })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Nested resize' })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Custom drag handle' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Placed panel' })).toBeVisible()
  await expect(page).toHaveScreenshot('playground-scene-chooser.png', {
    animations: 'disabled',
  })

  await page.getByRole('button', { name: 'Nested resize' }).click()
  const parent = page.locator('.flow-node[data-node-id="container"]')
  await expect(parent).toBeVisible()
  await expect(parent.locator('.flow-node-resize-handle')).toHaveCount(8)
  const childBefore = await nodePosition(page, 'child')

  const resizeHandle = parent.locator(
    '.flow-node-resize-handle[data-direction="bottom-right"]'
  )

  const handleBounds = await resizeHandle.boundingBox()

  if (handleBounds === null) {
    throw new Error('Missing parent resize handle')
  }

  await page.mouse.move(
    handleBounds.x + handleBounds.width / 2,
    handleBounds.y + handleBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    handleBounds.x + handleBounds.width / 2 + 45,
    handleBounds.y + handleBounds.height / 2 + 35,
    { steps: 4 }
  )
  await page.mouse.up()
  await expect(page.locator('#app')).toHaveAttribute(
    'data-last-change',
    /node-bounds/u
  )
  expect(await nodePosition(page, 'child')).toEqual(childBefore)

  await page.getByRole('button', { name: 'Custom drag handle' }).click()
  const card = page.locator('.flow-node[data-node-id="drag-card"]')
  const before = await nodePosition(page, 'drag-card')
  await expect(card.locator('[data-flow-drag-handle]')).toBeVisible()
  await expect(page).toHaveScreenshot('playground-custom-drag-scene.png', {
    animations: 'disabled',
  })
  await card.getByRole('button', { name: 'Card action' }).click()
  await expect(
    card.getByRole('button', { name: 'Card action' })
  ).toHaveAttribute('data-clicked', 'true')
  expect(await nodePosition(page, 'drag-card')).toEqual(before)
  const header = card.locator('[data-flow-drag-handle]')
  const headerBounds = await header.boundingBox()

  if (headerBounds === null) {
    throw new Error('Missing custom drag handle')
  }

  await page.mouse.move(
    headerBounds.x + headerBounds.width / 2,
    headerBounds.y + headerBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    headerBounds.x + headerBounds.width / 2 + 60,
    headerBounds.y + headerBounds.height / 2 + 35,
    { steps: 4 }
  )
  await page.mouse.up()
  await expect.poll(() => nodePosition(page, 'drag-card')).not.toEqual(before)

  await page.getByRole('button', { name: 'Placed panel' }).click()
  const slot = page.locator('.flow-panel-slot[data-placement="top-left"]')
  await expect(slot.locator('.flow-scene-panel')).toBeVisible()
  await slot.getByRole('button', { name: 'Panel action' }).click()
  await expect(slot.locator('.flow-scene-panel')).toHaveAttribute(
    'data-action-count',
    '1'
  )

  await page.getByRole('button', { name: 'Main graph' }).click()
  await expect(page.locator('.flow-node[data-node-id="input"]')).toBeVisible()
  await expect(slot.locator('.flow-scene-panel')).toBeHidden()
  await page.getByRole('button', { name: 'Distant graph' }).click()
  await expect(
    page.locator('.flow-node[data-node-id="remote-a"]')
  ).toBeVisible()
  await page.getByRole('button', { name: 'Nested resize' }).click()
  await page.getByRole('button', { name: 'Custom drag handle' }).click()
  await expect(
    page.locator(".flow-node[data-node-id='drag-card']")
  ).toHaveCount(1)
  await expect(page.locator('.flow-demo-panel')).toHaveCount(1)
  await expect(page.locator('.flow-panel-slot')).toHaveCount(1)

  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await expect(page.getByTestId('flow-canvas')).toHaveCount(0)
  await expect(page.locator('.flow-demo-panel')).toHaveCount(0)
  await expect(page.locator('.flow-panel-slot')).toHaveCount(0)
})

test('viewport API playground demonstrates fit, conversion, fractional zoom, and cancellation', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Viewport API scene' }).click()
  const card = page.locator('.flow-node[data-node-id="viewport-card"]')
  await expect(card).toHaveAttribute('data-measured-width', '230')
  await expect(card).toHaveClass(/selected/u)

  await page.getByRole('button', { name: 'Show conversion marker' }).click()
  await expect(page.getByTestId('conversion-marker')).toBeVisible()
  await page.getByRole('button', { name: 'Zoom to 0.73' }).click()
  await expect(page.locator('.flow-viewport')).toHaveAttribute(
    'data-zoom',
    '0.73'
  )
  await page.getByRole('button', { name: 'Center selected' }).click()
  await page.getByRole('button', { name: 'Fit selected' }).click()
  await page.getByRole('button', { name: 'Animate viewport' }).click()
  await page.getByRole('button', { name: 'Cancel animation' }).click()
  await expect(page.locator('.flow-demo-status')).toHaveText(
    'Viewport animation cancelled'
  )
  await expect(page.getByTestId('flow-canvas')).toBeVisible()
})
