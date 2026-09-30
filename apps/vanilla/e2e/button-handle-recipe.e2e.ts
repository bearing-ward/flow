import { expect, test } from '@playwright/test'

test('Button Handle activates its app action without dragging or changing connection targeting', async ({
  page,
}) => {
  await page.goto('/ui-recipes/button-handle/')
  const button = page.getByRole('button', { name: 'Run action' })
  const node = page.locator('.flow-node[data-node-id="button-node"]')
  await expect(node).toHaveAttribute('data-measured-width', '190')
  await expect(node).toHaveAttribute('data-measured-height', '100')
  const initial = await node.getAttribute('style')
  await button.focus()
  await expect(button).toBeFocused()
  await button.press('Enter')
  await expect(button).toBeFocused()
  await expect(page.locator('#app')).toHaveAttribute('data-action-count', '1')
  await button.press('Space')
  await expect(button).toBeFocused()
  await expect(page.locator('#app')).toHaveAttribute('data-action-count', '2')
  const box = await button.boundingBox()
  expect(box).not.toBeNull()

  if (box === null) {
    throw new Error('Button Handle is not visible')
  }

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.locator('#app')).toHaveAttribute('data-action-count', '3')
  await expect(node).toHaveAttribute('style', initial ?? '')
  const buttonBox = await button.boundingBox()

  if (buttonBox === null) {
    throw new Error('Button Handle is not visible for pointer drag')
  }

  await page.mouse.move(
    buttonBox.x + buttonBox.width / 2,
    buttonBox.y + buttonBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    buttonBox.x + buttonBox.width / 2 + 70,
    buttonBox.y + buttonBox.height / 2 + 35,
    { steps: 5 }
  )
  await page.mouse.up()

  await expect(node).toHaveAttribute('style', initial ?? '')
  await expect(page.locator('#app')).toHaveAttribute('data-action-count', '3')
  await expect(page.locator('#app')).toHaveAttribute('data-edge-count', '0')
  await page.reload()

  const source = page.locator(
    '.flow-node[data-node-id="button-node"] [data-handle-id="out"]'
  )

  const target = page.locator(
    '[data-node-id="target-node"] [data-handle-id="in"]'
  )

  const a = await source.boundingBox()
  const b = await target.boundingBox()

  if (a === null || b === null) {
    throw new Error('Connection handles are not visible')
  }

  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect(page.locator('#app')).toHaveAttribute('data-edge-count', '1')
})
