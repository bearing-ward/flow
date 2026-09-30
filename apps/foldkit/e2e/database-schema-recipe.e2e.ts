import { expect, test } from '@playwright/test'

test('Database Schema edits app-owned data and replaces Runtime connection handles', async ({
  page,
}) => {
  await page.goto('/ui-recipes/database-schema/')
  const schema = page.locator('.flow-foldkit-database-schema')
  await expect(schema).toContainText('name')
  await expect(page.locator('[data-handle-id="name-out"]')).toHaveCount(1)
  await page.locator('[data-edit-schema]').click()
  await expect(schema).toContainText('email')
  await expect(schema).not.toContainText('legacy_id')
  await expect(page.locator('[data-handle-id="name-out"]')).toHaveCount(0)
  const source = page.locator('[data-handle-id="email-out"]')
  await expect(source).toHaveAttribute('aria-label', 'source handle email-out')
  await expect(source).toHaveAttribute('data-handle-side', 'bottom')
  await expect(source).toHaveClass(/bottom/u)
  await expect(page.locator('[data-handle-id="created-in"]')).toHaveAttribute(
    'aria-label',
    'target handle created-in'
  )
  await expect(page.locator('[data-handle-id="created-in"]')).toHaveAttribute(
    'data-handle-side',
    'top'
  )
  await expect(page.locator('[data-handle-id="created-in"]')).toHaveClass(
    /top/u
  )
  await expect(page.locator('[data-schema-result]')).toHaveText('accepted:2')
  await page.getByRole('button', { name: 'Connect email' }).click()
  await expect(page.locator('[data-schema-result]')).toHaveText(
    'accepted-edges:1'
  )
})
