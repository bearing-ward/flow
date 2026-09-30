import { expect, test } from '@playwright/test'

test('Custom Node recipe updates displayed status and accepted data in place', async ({
  page,
}) => {
  await page.goto('/custom-node-test.html')
  const node = page.locator('.flow-vue-node[data-node-id="custom-status"]')
  const card = page.getByTestId('custom-node')
  const initialPosition = await node.getAttribute('style')
  const initialCard = await card.evaluate((element) => element)

  await expect(card.locator('h2')).toHaveText('Release check')
  await expect(page.getByTestId('custom-detail')).toHaveText('Build is queued')
  await expect(card).toHaveAttribute('data-status', 'waiting')
  await page.getByTestId('custom-status-control').click()
  await expect(card).toHaveAttribute('data-status', 'ready')
  await expect(page.getByTestId('custom-status-control')).toHaveText('ready')
  await expect(page.getByTestId('custom-detail')).toHaveText(
    'All checks passed'
  )
  expect(await node.getAttribute('style')).toBe(initialPosition)
  expect(await card.evaluate((element) => element)).toBe(initialCard)
})
