import { expect, test } from '@playwright/test'

test('Foldkit Placeholder adds one accepted, keyboard-usable node and remounts cleanly', async ({
  page,
}) => {
  await page.goto('/ui-recipes/placeholder/')
  const action = page.getByRole('button', { name: 'Add your first node' })
  await action.focus()
  await expect(action).toBeFocused()
  await page.keyboard.press('Space')
  const node = page.locator('[data-node-id="placeholder-created"]')
  await expect(node).toContainText('Created from empty state')
  await node.focus()
  await expect(node).toBeFocused()
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(1)
  await expect(page.locator('output')).toHaveText('accepted:1')
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Add your first node' })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Add your first node' }).click()
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(1)

  const selectNode = page.getByRole('button', {
    name: 'Toggle selection for Created from empty state',
  })

  await selectNode.focus()
  await expect(selectNode).toBeFocused()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Check keyboard selection' }).click()
  await expect(page.locator('output')).toHaveText('selected:true')
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Add your first node' })
  ).toBeVisible()
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(0)
})
