import { expect, test } from '@playwright/test'

test('Base Node composes accessible content while Vanilla owns handles and teardown', async ({
  page,
}) => {
  await page.goto('/ui-recipes/base-node/')
  const node = page.locator('.flow-node[data-node-id="base-node"]')
  const shell = page.locator('[data-flow-base-node]')
  await expect(shell).toHaveAttribute('role', 'group')
  await expect(shell).toHaveAttribute('aria-label', 'Review task')
  await expect(shell.locator('h2')).toHaveText('Review task')
  await expect(node.locator('[data-handle-id="output"]')).toBeVisible()
  const action = shell.getByRole('button', { name: 'Open details' })
  await action.focus()
  await expect(action).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(action).toHaveAttribute('data-activated', 'true')
  await page.reload()
  await expect(
    page.locator('.flow-node[data-node-id="base-node"]')
  ).toBeVisible()
})
