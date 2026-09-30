import { expect, test } from '@playwright/test'

test('Database Schema updates its table and connectable handle controls through the Vue editor', async ({
  page,
}) => {
  await page.goto('/ui-recipes/database-schema/')
  const schema = page.locator('.flow-vue-database-schema')
  await expect(schema).toContainText('name')
  await expect(page.locator('[data-handle-id="name-out"]')).toHaveClass(
    /flow-vue-handle-right/u
  )
  await page.locator('[data-edit-schema]').click()
  await expect(schema).toContainText('email')
  await expect(schema).not.toContainText('legacy_id')
  await expect(page.locator('[data-handle-id="name-out"]')).toHaveCount(0)
  const source = page.locator('[data-handle-id="email-out"]')
  await expect(source).toHaveAttribute('data-handle-kind', 'source')
  await expect(source).toHaveClass(/flow-vue-handle-bottom/u)
  await expect(page.locator('[data-handle-id="created-in"]')).toHaveAttribute(
    'data-handle-kind',
    'target'
  )
  await expect(page.locator('[data-handle-id="created-in"]')).toHaveClass(
    /flow-vue-handle-top/u
  )
  await page.getByRole('button', { name: 'Connect email' }).click()
  await expect(page.locator('.flow-vue-edge-path')).toHaveCount(1)
})
