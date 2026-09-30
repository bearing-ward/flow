import { expect, test } from '@playwright/test'

test('Placeholder creates one accepted, keyboard-usable node and remounts cleanly', async ({
  page,
}) => {
  await page.goto('/ui-recipes/placeholder/')
  const action = page.getByRole('button', { name: 'Add your first node' })
  await action.focus()
  await expect(action).toBeFocused()
  await page.keyboard.press('Enter')
  const node = page.locator('[data-node-id="placeholder-created"]')
  await expect(node).toHaveAttribute('aria-label', 'Created from empty state')
  await expect(node).toBeVisible()
  await node.focus()
  await expect(node).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(node).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(1)
  await expect(page.locator('output')).toHaveText('accepted:1')
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Add your first node' })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Add your first node' }).click()
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(1)
})
