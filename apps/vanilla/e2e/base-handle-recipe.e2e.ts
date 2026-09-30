import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const connect = async (
  page: Page,
  source: Locator,
  target: Locator
): Promise<void> => {
  const sourceBounds = await source.boundingBox()
  const targetBounds = await target.boundingBox()

  if (sourceBounds === null || targetBounds === null) {
    throw new Error('Connection handles must be rendered')
  }

  await page.mouse.move(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y + targetBounds.height / 2,
    { steps: 8 }
  )
  await page.mouse.up()
}

test('Base Handle preserves host semantics, keyboard focus, and validation', async ({
  page,
}) => {
  await page.goto('/ui-recipes/base-handle/')

  const source = page.locator(
    '[data-node-id="source"] [data-handle-id="output"]'
  )

  const accepted = page.locator(
    '[data-node-id="accepted-target"] [data-handle-id="input"]'
  )

  const rejected = page.locator(
    '[data-node-id="rejected-target"] [data-handle-id="blocked"]'
  )

  await expect(source).toHaveAttribute('data-kind', 'source')
  await expect(source).toHaveClass(/flow-handle-right/u)
  await expect(source).toHaveAttribute('aria-label', 'source handle output')
  await expect(accepted).toHaveAttribute('data-kind', 'target')
  await expect(accepted).toHaveClass(/flow-handle-left/u)
  await expect(accepted).toHaveAttribute('aria-label', 'target handle input')
  await expect(rejected).toHaveAttribute('data-kind', 'target')

  await source.focus()
  await expect(source).toBeFocused()
  await connect(page, source, accepted)
  await expect(page.locator('#app')).toHaveAttribute('data-edge-count', '1')

  await connect(page, source, rejected)
  await expect(page.locator('#app')).toHaveAttribute('data-edge-count', '1')
})
