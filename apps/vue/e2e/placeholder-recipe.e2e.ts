import { expect, test } from '@playwright/test'

test('Vue Placeholder adds one accepted, keyboard-usable node and remounts cleanly', async ({
  page,
}) => {
  await page.goto('/ui-recipes/placeholder/')
  const action = page.getByRole('button', { name: 'Add your first node' })
  await action.focus()
  await expect(action).toBeFocused()
  await page.keyboard.press('Enter')
  const node = page.locator('[data-node-id="placeholder-created"]')
  await expect(node).toContainText('Created from empty state')
  await node.focus()
  await expect(node).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('output')).toHaveText('selected:true')
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(1)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Add your first node' })
  ).toBeVisible()
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(0)
})
