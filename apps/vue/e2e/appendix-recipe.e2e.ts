import { expect, test } from '@playwright/test'

test('Appendix reveals app-owned details accessibly without moving the node', async ({
  page,
}) => {
  await page.goto('/ui-recipes/appendix/')

  const node = page.locator('.flow-vue-node[data-node-id="appendix-node"]')
  const trigger = page.getByRole('button', { name: 'Deployment notes' })
  const region = page.getByRole('region', { name: 'Deployment notes' })
  const details = page.getByTestId('appendix-details')

  await expect(node).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toHaveAttribute('aria-controls', 'deployment-appendix')
  await expect(region).toBeHidden()

  const before = await node.boundingBox()
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(details).toHaveText(
    'The staging environment is ready for review.'
  )
  await expect(region).toBeVisible()
  await page.keyboard.press('Space')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(region).toBeHidden()

  await trigger.click()
  await expect(region).toBeVisible()
  const after = await node.boundingBox()
  expect(after?.x).toBe(before?.x)
  expect(after?.y).toBe(before?.y)

  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Deployment notes' })
  ).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('[data-node-id="appendix-node"]')).toHaveCount(1)
})
