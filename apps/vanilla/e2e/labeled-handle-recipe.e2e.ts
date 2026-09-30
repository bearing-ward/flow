import { expect, test } from '@playwright/test'

test('Labeled Handle keeps its label associated with the focusable connection button', async ({
  page,
}) => {
  await page.goto('/ui-recipes/labeled-handle/')
  const source = page.locator('[data-handle-id="output"]')
  const label = page.locator('[data-flow-labeled-handle="output"]')
  const labelId = await label.getAttribute('id')

  if (labelId === null) {
    throw new Error('Expected a stable label id')
  }

  await expect(label).toHaveText('Result')
  await expect(source).toHaveAttribute('aria-describedby', labelId)
  await expect(label).toHaveCSS('font-size', '12px')
  await source.focus()
  await expect(source).toBeFocused()

  const viewport = page.locator('.flow-viewport')

  const initialTransform = await viewport.evaluate(
    (element) => getComputedStyle(element).transform
  )

  const initialBounds = await label.boundingBox()

  if (initialBounds === null) {
    throw new Error('Expected rendered label bounds')
  }

  await page.mouse.move(220, 180)
  let previousTransform = initialTransform

  // 5% allows fractional CSS pixel rounding while detecting graph scaling.
  // eslint-disable no-await-in-loop -- zoom transitions are sequential.
  for (const deltaY of [-100, -100, 200]) {
    await page.mouse.wheel(0, deltaY)
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
