import { expect, test } from '@playwright/test'

test('Vue playground demonstrates descendant composables and session restore', async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 640 })
  await page.goto('/')
  await expect(
    page.locator('.flow-vue-node[data-node-id="validate"]')
  ).toBeVisible()
  await page.screenshot({ path: '/tmp/flow-051-vue-desktop.png' })
  const panel = page.locator('.flow-state-tools')
  const result = panel.locator('output:not([data-testid="measurement-result"])')
  await expect(
    panel.getByRole('button', { name: 'Restore snapshot' })
  ).toBeDisabled()
  await panel.getByLabel('Node label').fill('Check input')
  await panel.getByRole('button', { name: 'Update label' }).click()
  await panel.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(result).toContainText('"selected":"Check input"')
  await expect(
    page.locator('.flow-vue-node[data-node-id="validate"]')
  ).toContainText('Check input')
  await expect(result).toContainText('"selected":"Check input"')
  await expect(result).toContainText('"incomers":["input","transform"]')
  await panel.getByRole('button', { name: 'Save snapshot' }).click()
  await panel.getByRole('button', { name: 'Change graph and viewport' }).click()
  await expect(
    page.locator('.flow-vue-node[data-node-id="validate"]')
  ).toContainText('Changed after save')
  await panel.getByRole('button', { name: 'Restore snapshot' }).click()
  await expect(
    page.locator('.flow-vue-node[data-node-id="validate"]')
  ).toContainText('Check input')
  await panel.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(result).toContainText('"viewport":{"x":0,"y":0,"zoom":1}')
  await expect(result).toContainText('"isSelected":false')
  await panel.getByRole('button', { name: 'Toggle hidden' }).click()
  await expect(
    page.locator('.flow-vue-node[data-node-id="validate"]')
  ).toHaveCount(0)
  await expect(page.locator('.flow-node[data-edge-id="bezier"]')).toHaveCount(0)
  await panel.getByRole('button', { name: 'Inspect graph' }).focus()
  await page.keyboard.press('Enter')
  await expect(result).toContainText('"nodes"')
  await page.setViewportSize({ width: 390, height: 760 })
  await expect(
    panel.getByRole('button', { name: 'Inspect graph' })
  ).toBeVisible()
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(
    page.locator('.flow-vue-node[data-node-id="validate"]')
  ).toBeVisible()
  await expect(
    panel.getByRole('button', { name: 'Restore snapshot' })
  ).toBeDisabled()
  await expect(panel.getByLabel('Node label')).toHaveValue('Validate')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: '/tmp/flow-051-vue-narrow.png' })
})
