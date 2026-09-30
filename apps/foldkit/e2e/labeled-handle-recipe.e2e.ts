import { expect, test } from '@playwright/test'

test('Labeled Handle renders screen-space labels while Runtime retains connection controls', async ({
  page,
}) => {
  await page.goto('/ui-recipes/labeled-handle/')
  const label = page.locator('[data-flow-labeled-handle="out"]')
  await expect(label).toBeVisible()
  await expect(label).toHaveCSS('font-size', '12px')
  const handle = page.locator('[data-node-id] [data-handle-id="out"]').first()
  const labelId = await label.getAttribute('id')

  if (labelId === null) {
    throw new Error('Expected a stable label id')
  }

  await expect(handle).toHaveAttribute('aria-describedby', labelId)
  await handle.focus()
  await expect(handle).toBeFocused()

  const viewport = page.locator('.flow-foldkit-viewport')

  const initialTransform = await viewport.evaluate(
    (element) => getComputedStyle(element).transform
  )

  const initialBounds = await label.boundingBox()

  if (initialBounds === null) {
    throw new Error('Expected rendered label bounds')
  }

  let previousTransform = initialTransform

  // 5% allows fractional CSS pixel rounding while detecting graph scaling.
  // eslint-disable no-await-in-loop -- viewport operations are sequential.
  for (const zoom of ['1.25', '0.75', '1.5']) {
    await page.getByRole('button', { name: `Zoom to ${zoom}` }).click()
    await expect(viewport).not.toHaveCSS('transform', previousTransform)
    previousTransform = await viewport.evaluate(
      (element) => getComputedStyle(element).transform
    )
    const bounds = await label.boundingBox()

    if (bounds === null) {
      throw new Error('Expected rendered label bounds')
    }

    expect(
      Math.abs(bounds.height / initialBounds.height - 1)
    ).toBeLessThanOrEqual(0.05)
  }
  // eslint-enable no-await-in-loop
})
