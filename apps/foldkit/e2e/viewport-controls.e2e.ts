import { expect, test } from '@playwright/test'

test('Foldkit playground exposes viewport controls over the rendered canvas', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Viewport' })).toBeVisible()
  await page.getByRole('button', { name: 'Fit selected' }).click()
  await expect(page.locator('[data-viewport-result]')).toContainText('accepted')
  await expect(page.locator('.flow-foldkit-viewport')).toHaveCSS(
    'transform',
    /matrix\(/u
  )
  await page.getByRole('button', { name: 'Show coordinate conversion' }).click()
  await expect(page.locator('[data-viewport-result]')).toContainText('screen')
})
