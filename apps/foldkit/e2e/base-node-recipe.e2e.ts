import { expect, test } from '@playwright/test'

test('Base Node composes accessible content while Foldkit owns handles and teardown', async ({
  page,
}) => {
  await page.goto('/ui-recipes/base-node/')
  const node = page.locator('.flow-foldkit-node[data-node-id="validate"]')
  const shell = page.locator('[data-flow-base-node]')
  await expect(shell).toHaveAttribute('role', 'group')
  await expect(shell).toHaveAttribute('aria-label', 'Validate')
  await expect(shell.locator('h2')).toHaveText('Validate')
  await expect(node.locator('[data-handle-id="in"]')).toBeVisible()
  const action = shell.getByRole('button', { name: 'Open details' })
  await action.evaluate((button) => {
    button.addEventListener('click', () => {
      button.dataset['activated'] = 'true'
    })
  })
  await action.focus()
  await expect(action).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(action).toHaveAttribute('data-activated', 'true')
  await page.reload()
  await expect(page.locator('[data-flow-base-node]')).toBeVisible()
})
