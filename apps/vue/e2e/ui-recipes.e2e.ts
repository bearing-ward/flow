import { expect, test } from '@playwright/test'

test('Status Indicator follows accepted node data edits and remains accessible', async ({
  page,
}) => {
  await page.goto('/ui-recipes/status-indicator/')
  const status = page.getByRole('status', { name: 'Worker status: Waiting' })
  await expect(status).toHaveAttribute('data-status', 'waiting')
  await expect(status).toContainText('Waiting')

  await page.locator('[data-set-status="ready"]').click()
  const ready = page.getByRole('status', { name: 'Worker status: Ready' })
  await expect(ready).toHaveAttribute('data-status', 'ready')

  await page.locator('[data-set-status="error"]').click()
  const error = page.getByRole('status', { name: 'Worker status: Error' })
  await expect(error).toHaveAttribute('data-status', 'error')

  await page.locator('[data-set-status="waiting"]').click()
  const dot = status.locator('.flow-vue-status-indicator__dot')
  await expect(dot).toHaveCSS('animation-name', 'flow-vue-status-pulse')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(dot).toHaveCSS('animation-name', 'none')

  await page.locator('[data-reset-status]').click()
  await expect(status).toHaveAttribute('data-status', 'waiting')
  await page.reload()
  await expect(
    page.getByRole('status', { name: 'Worker status: Waiting' })
  ).toHaveAttribute('data-status', 'waiting')
})
