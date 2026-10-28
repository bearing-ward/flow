import { expect, test } from '@playwright/test'

test('Vue playground smoke switches graphs and adds a node', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Flow Vue playground' })
  ).toBeVisible()
  await expect(page.getByTestId('flow-node')).toHaveCount(4)
  await expect(page.getByTestId('flow-edge')).toHaveCount(3)
  await page.getByRole('button', { name: 'Show hidden edge' }).click()
  await expect(page.getByTestId('flow-edge')).toHaveCount(4)
  await page.getByRole('button', { name: 'Hide Validate node' }).click()
  await expect(page.locator('[data-node-id="validate"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show Validate node' }).click()
  await expect(page.locator('[data-node-id="validate"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Distant graph' }).click()
  await expect(page.getByTestId('flow-node')).toHaveCount(2)
  await expect(page.getByTestId('flow-edge')).toHaveCount(1)
  await page.getByRole('button', { name: 'Main graph' }).click()
  await expect(page.getByTestId('flow-node')).toHaveCount(4)
  await page.getByRole('button', { name: 'Add node' }).click()
  await expect(page.getByText('New node')).toBeVisible()
})
