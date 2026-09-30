import { expect, test } from '@playwright/test'

test('Database Schema follows public node edits and changes real handles', async ({
  page,
}) => {
  await page.goto('/ui-recipes/database-schema/')
  const schema = page.locator('.flow-database-schema')
  await expect(schema).toContainText('name')
  await expect(page.locator('[data-handle-id="name-out"]')).toHaveClass(
    /flow-handle-source/u
  )
  await expect(page.locator('[data-handle-id="name-out"]')).toHaveClass(
    /flow-handle-right/u
  )
  await page.getByRole('button', { name: 'Update schema', exact: true }).click()
  await expect(schema).toContainText('email')
  await expect(schema).not.toContainText('legacy_id')
  await expect(page.locator('[data-handle-id="name-out"]')).toHaveCount(0)
  const output = page.locator('[data-handle-id="email-out"]')
  await expect(output).toHaveAttribute('data-kind', 'source')
  await expect(output).toHaveClass(/flow-handle-bottom/u)
  await expect(page.locator('[data-handle-id="created-in"]')).toHaveAttribute(
    'data-kind',
    'target'
  )
  await expect(page.locator('[data-handle-id="created-in"]')).toHaveClass(
    /flow-handle-top/u
  )
  await page.getByRole('button', { name: 'Update schema again' }).click()
  await expect(schema).toContainText('display_name')
  await expect(schema).toContainText('audit_at')
  await expect(schema).not.toContainText('email')
  await expect(page.locator('[data-handle-id="email-out"]')).toHaveCount(0)
  const finalOutput = page.locator('[data-handle-id="display-out"]')
  await expect(finalOutput).toHaveAttribute('data-kind', 'source')
  await expect(finalOutput).toHaveClass(/flow-handle-right/u)
  await expect(page.locator('[data-handle-id="audit-in"]')).toHaveAttribute(
    'data-kind',
    'target'
  )
  await expect(page.locator('[data-handle-id="audit-in"]')).toHaveClass(
    /flow-handle-left/u
  )
  await page.getByRole('button', { name: 'Connect display name' }).click()
  await expect(page.locator('[data-edge-count]')).toHaveText('1')
})
