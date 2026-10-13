import { expect, test } from '@playwright/test'

test('Computing Flows derives node data from upstream nodes through typed edits', async ({
  page,
}) => {
  await page.goto('/ui-recipes/computing-flows/')
  const status = page.getByTestId('recipe-status')
  const upper = page.getByTestId('upper-value')
  const result = page.getByTestId('result-value')

  await expect(result).toHaveText('HELLO, world')
  await expect(upper).toHaveText('HELLO')

  const input = page.getByTestId('text-input-text-1')
  await input.fill('')
  await input.pressSequentially('flow', { delay: 40 })

  await expect(input).toHaveValue('flow')
  await expect(upper).toHaveText('FLOW')
  await expect(result).toHaveText('FLOW, world')

  await page.getByTestId('disconnect-text-2').click()

  await expect(result).toHaveText('FLOW')
  await expect(status).toHaveAttribute(
    'data-edges',
    'e-text-1-upper,e-upper-result'
  )
})
