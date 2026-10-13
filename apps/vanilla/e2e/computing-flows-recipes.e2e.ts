import { expect, test } from '@playwright/test'

test('computing-flows: node data flows through uppercase into the result', async ({
  page,
}) => {
  await page.goto('/ui-recipes/computing-flows/')
  const upper = page.getByTestId('upper-value')
  const result = page.getByTestId('result-value')
  await expect(upper).toHaveText('HELLO')
  await expect(result).toHaveText('HELLO, world')

  const input = page.getByTestId('text-input-text-1')
  await input.fill('')
  await input.pressSequentially('flow')
  await expect(input).toHaveValue('flow')
  await expect(upper).toHaveText('FLOW')
  await expect(result).toHaveText('FLOW, world')
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-data',
    'text-1=flow,text-2=world,upper=FLOW,result='
  )

  await page.getByTestId('disconnect-text-2').click()
  await expect(result).toHaveText('FLOW')
  await expect(page.getByTestId('recipe-status')).toHaveText(
    'edges:e-text-1-upper,e-upper-result'
  )
})

test('computing-flows: typing in a node input does not drag the node', async ({
  page,
}) => {
  await page.goto('/ui-recipes/computing-flows/')
  const node = page.locator('.flow-node[data-node-id="text-2"]')
  const input = page.getByTestId('text-input-text-2')
  await expect(input).toHaveValue('world')
  const before = await node.boundingBox()
  const box = await input.boundingBox()

  if (before === null || box === null) {
    throw new Error('Missing node geometry')
  }

  await page.mouse.move(box.x + 10, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 60, box.y + box.height / 2 + 30, { steps: 6 })
  await page.mouse.up()
  await expect(node).toHaveCSS('visibility', 'visible')
  expect(await node.boundingBox()).toEqual(before)
})
