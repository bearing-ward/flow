import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const nodeBounds = (page: Page, id: string) =>
  page.locator(`.flow-node[data-node-id="${id}"]`).evaluate((element) => {
    const { width, height } = element.getBoundingClientRect()

    return { width, height }
  })

test('playground connection, resize, drag-handle, and touch-ready scenes are usable', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('button', { name: 'Connection events' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resize' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Drag handle' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Touch-ready' })).toBeVisible()

  await page.getByRole('button', { name: 'Connection events' }).click()

  const source = page.locator(
    '.flow-handle[data-node-id="event-source"][data-kind="source"]'
  )

  const target = page.locator(
    '.flow-handle[data-node-id="event-target"][data-kind="target"]'
  )

  await source.click()
  await target.click()
  await expect(page.locator('#app')).toHaveAttribute(
    'data-last-change',
    /edge-add/u
  )
  await expect(page.locator('#app')).toHaveAttribute('data-edge-count', '1')
  await expect(page.locator('[data-testid="flow-edge-path"]')).toHaveCount(1)

  await page.getByRole('button', { name: 'Resize' }).click()
  const parent = page.locator('.flow-node[data-node-id="container"]')

  const resizeControl = parent.locator(
    '.flow-node-resize-handle[data-direction="bottom-right"]'
  )

  await expect(resizeControl).toBeVisible()
  const before = await nodeBounds(page, 'container')
  await resizeControl.focus()
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(async () => {
      const bounds = await nodeBounds(page, 'container')

      return bounds.width
    })
    .toBeGreaterThan(before.width)

  await page.getByRole('button', { name: 'Drag handle' }).click()
  const dragCard = page.locator('.flow-node[data-node-id="drag-card"]')
  await expect(dragCard.locator('[data-flow-drag-handle]')).toBeVisible()
  await dragCard.getByRole('button', { name: 'Card action' }).click()
  await expect(
    dragCard.getByRole('button', { name: 'Card action' })
  ).toHaveAttribute('data-clicked', 'true')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Touch-ready' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#app')).toHaveAttribute(
    'data-playground-scene',
    'touch-ready'
  )

  const touchSource = page.locator(
    '.flow-handle[data-node-id="touch-source"][data-kind="source"]'
  )

  const touchControl = page.locator(
    '.flow-node-resize-handle[data-direction="bottom-right"]'
  )

  await expect(touchSource).toBeVisible()
  await expect(touchControl).toBeVisible()
  const sourceBox = await touchSource.boundingBox()
  const resizeBox = await touchControl.boundingBox()

  expect(sourceBox?.width).toBeGreaterThanOrEqual(28)
  expect(sourceBox?.height).toBeGreaterThanOrEqual(28)
  expect(resizeBox?.width).toBeGreaterThanOrEqual(28)
  expect(resizeBox?.height).toBeGreaterThanOrEqual(28)

  const touchTarget = page.locator(
    '.flow-handle[data-node-id="touch-target"][data-kind="target"]'
  )

  await touchSource.focus()
  await page.keyboard.press('Enter')
  await touchTarget.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#app')).toHaveAttribute(
    'data-last-change',
    /edge-add/u
  )
  await expect(
    page.getByRole('button', { name: 'Touch-ready' })
  ).toHaveAttribute('aria-pressed', 'true')
})
