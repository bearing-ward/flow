import { expect, test } from '@playwright/test'

test('playground smoke switches scenes, preserves one canvas and disposes', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Flow playground' })
  ).toBeVisible()

  await Promise.all(
    [
      'Main graph',
      'Distant graph',
      'Nested resize',
      'Custom drag handle',
      'Placed panel',
    ].map((name) =>
      expect(page.getByRole('button', { name, exact: true })).toBeVisible()
    )
  )

  await expect(page).toHaveScreenshot('playground-scene-chooser.png', {
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Nested resize' }).click()
  await expect(
    page.locator('.flow-node[data-node-id="container"]')
  ).toBeVisible()
  await page.getByRole('button', { name: 'Custom drag handle' }).click()
  await expect(page.locator('[data-flow-drag-handle]')).toBeVisible()
  await expect(page).toHaveScreenshot('playground-custom-drag-scene.png', {
    animations: 'disabled',
  })
  const cardAction = page.getByRole('button', { name: 'Card action' })
  await cardAction.click()
  await expect(cardAction).toHaveAttribute('data-clicked', 'true')
  await page.getByRole('button', { name: 'Placed panel' }).click()
  await expect(page.locator('.flow-scene-panel')).toBeVisible()
  await page.getByRole('button', { name: 'Panel action' }).click()
  await expect(page.locator('.flow-scene-panel')).toHaveAttribute(
    'data-action-count',
    '1'
  )
  await page.getByRole('button', { name: 'Distant graph' }).click()
  await expect(
    page.locator('.flow-node[data-node-id="remote-a"]')
  ).toBeVisible()
  await page.getByRole('button', { name: 'Main graph' }).click()
  await expect(page.locator('.flow-node[data-node-id="input"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Show hidden edge' }).click()
  await expect(
    page.locator('[data-edge-id="hidden"] .flow-edge-path')
  ).toHaveCount(1)
  await page.getByRole('button', { name: 'Hide Validate node' }).click()
  await expect(page.locator('.flow-node[data-node-id="validate"]')).toHaveCount(
    0
  )
  await page.getByRole('button', { name: 'Show Validate node' }).click()
  await expect(page.locator('.flow-node[data-node-id="validate"]')).toHaveCount(
    1
  )
  await expect(page.getByTestId('flow-canvas')).toHaveCount(1)
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await expect(page.getByTestId('flow-canvas')).toHaveCount(0)
  await expect(page.locator('.flow-demo-panel')).toHaveCount(0)
  await expect(page.locator('.flow-panel-slot')).toHaveCount(0)
})
