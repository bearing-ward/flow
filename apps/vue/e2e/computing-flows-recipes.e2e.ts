import { expect, test } from '@playwright/test'

test('computing flows propagate node data through connections', async ({
  page,
}) => {
  await page.goto('/ui-recipes/computing-flows/')

  const upper = page.getByTestId('upper-value')
  const result = page.getByTestId('result-value')
  const input = page.getByTestId('text-input-text-1')

  await expect(upper).toHaveText('HELLO')
  await expect(result).toHaveText('HELLO, world')

  await input.fill('')
  await input.pressSequentially('flow')

  await expect(input).toHaveValue('flow')
  await expect(upper).toHaveText('FLOW')
  await expect(result).toHaveText('FLOW, world')

  await page.getByTestId('disconnect-text-2').click()

  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-edges',
    'text-1>upper,upper>result'
  )
  await expect(result).toHaveText('FLOW')
})
