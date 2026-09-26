import { expect, test } from '@playwright/test'

test('Vue playground exposes the vanilla main and distant graph controls', async ({
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

  const canvas = page.getByTestId('flow-canvas')
  const bounds = await canvas.boundingBox()

  if (bounds === null) {
    throw new Error('Missing Vue demo canvas')
  }

  await page.mouse.move(
    bounds.x + bounds.width - 30,
    bounds.y + bounds.height - 30
  )
  await page.mouse.down()
  await page.mouse.move(
    bounds.x + bounds.width - 55,
    bounds.y + bounds.height - 55
  )
  await page.mouse.up()
  await expect(page.locator('.flow-vue-viewport')).toHaveCSS(
    'transform',
    /matrix\(1, 0, 0, 1, -25, -25\)/u
  )
  await page.mouse.move(bounds.x + 300, bounds.y + 200)
  await page.mouse.wheel(0, -250)
  await expect(page.locator('.flow-vue-viewport')).not.toHaveCSS(
    'transform',
    /matrix\(1, 0, 0, 1, -25, -25\)/u
  )
  await page.getByRole('button', { name: 'Fit graph' }).click()
  await expect(page.locator('.flow-vue-viewport')).not.toHaveCSS(
    'transform',
    /matrix\(1, 0, 0, 1, -25, -25\)/u
  )
})
