import { expect, test } from '@playwright/test'

test('Base Handle describes directional handles and preserves Runtime connection rules', async ({
  page,
}) => {
  await page.goto('/ui-recipes/base-handle/')
  const input = page.locator('[data-flow-base-handle="in"]')
  const output = page.locator('[data-flow-base-handle="out"]')
  await expect(input).toHaveAttribute('data-handle-kind', 'target')
  await expect(input).toHaveAttribute('data-handle-side', 'left')
  await expect(input).toContainText('Incoming data')
  await expect(input).toContainText('Input')
  await expect(output).toHaveAttribute('data-handle-kind', 'source')
  await expect(output).toHaveAttribute('data-handle-side', 'right')
  await expect(output).toContainText('Validated result')
  await expect(output).toContainText('Output')

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="target"] [data-handle-id="in"]')

  const targetHandle = page.locator(
    '[data-node-id="validate"] [data-handle-id="in"]'
  )

  await source.focus()
  await expect(source).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(source).toBeFocused()

  const edgePaths = page.locator('.flow-foldkit-edge')
  const initialCount = await edgePaths.count()
  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()

  if (sourceBox === null || targetBox === null) {
    throw new Error('Connection handles are not rendered')
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  )

  await page.mouse.down()
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 8 }
  )
  await page.mouse.up()
  await expect(edgePaths).toHaveCount(initialCount + 1)

  const targetNodeBox = await targetHandle.boundingBox()
  const sourceAfter = await source.boundingBox()

  if (targetNodeBox === null || sourceAfter === null) {
    throw new Error('Connection handles disappeared')
  }

  await page.mouse.move(
    sourceAfter.x + sourceAfter.width / 2,
    sourceAfter.y + sourceAfter.height / 2
  )

  await page.mouse.down()
  await page.mouse.move(
    targetNodeBox.x + targetNodeBox.width / 2,
    targetNodeBox.y + targetNodeBox.height / 2,
    { steps: 8 }
  )
  await page.mouse.up()
  await expect(edgePaths).toHaveCount(initialCount + 1)
})
