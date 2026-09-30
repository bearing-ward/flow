import { expect, test } from '@playwright/test'

test('Base Handle presents side and kind while FlowCanvas owns keyboard connections', async ({
  page,
}) => {
  await page.goto('/ui-recipes/base-handle/')

  const source = page.locator(
    '[data-node-id="source-node"] [data-handle-id="send"]'
  )

  const rejected = page.locator(
    '[data-node-id="rejected-node"] [data-handle-id="blocked"]'
  )

  const accepted = page.locator(
    '[data-node-id="accepted-node"] [data-handle-id="ready"]'
  )

  await expect(source).toHaveAttribute('type', 'button')
  await expect(source).toHaveAttribute('data-handle-kind', 'source')
  await expect(source).toHaveClass(/flow-vue-handle-right/u)
  await expect(rejected).toHaveAttribute('data-handle-kind', 'source')
  await expect(rejected).toHaveClass(/flow-vue-handle-top/u)
  await expect(accepted).toHaveClass(/flow-vue-handle-left/u)

  const sourceLabel = page.locator('[data-flow-base-handle="send"]')
  await expect(sourceLabel).toContainText('source · right')
  await expect(page.locator('[data-flow-base-handle="blocked"]')).toContainText(
    'source · top'
  )

  await source.focus()
  await expect(source).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(
    page.getByTestId('flow-connection-keyboard-status')
  ).toBeVisible()
  await rejected.focus()
  await page.keyboard.press('Space')
  await expect(page.getByTestId('flow-edge')).toHaveCount(0)

  await source.focus()
  await page.keyboard.press('Enter')
  await accepted.focus()
  await page.keyboard.press('Space')
  await expect(page.getByTestId('flow-edge')).toHaveCount(1)
})
