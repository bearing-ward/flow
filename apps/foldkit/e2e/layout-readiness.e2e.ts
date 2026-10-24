import { expect, test } from '@playwright/test'

test('measurement dimensions stay stable through fractional fit zoom and size feedback', async ({
  page,
}) => {
  await page.goto('/test.html')

  const widths = await page.evaluate(async () => {
    const fixturePath = '/e2e/layout-measurement-fixture.ts'

    await import(fixturePath)

    return window.measureLayoutFeedback()
  })

  // Pinned xyflow packages/system/src/utils/dom.ts:30 uses offset dimensions.
  expect(widths).toEqual([106, 106, 106, 106, 106])
})

for (const scene of ['elk-multiple-handles', 'dynamic-layouting']) {
  test(`${scene} completion waits for its fitted DOM`, async ({ page }) => {
    await page.addInitScript(() => {
      const { setProperty: nativeSetProperty } = CSSStyleDeclaration.prototype
      let held: (() => void) | undefined
      let released = false

      CSSStyleDeclaration.prototype.setProperty = function setProperty(
        property,
        value,
        priority
      ) {
        if (
          !released &&
          property === 'transform' &&
          document.querySelector<HTMLElement>('.flow-foldkit-viewport')
            ?.style === this
        ) {
          held = () => nativeSetProperty.call(this, property, value, priority)
          document.documentElement.dataset.layoutFitHeld = 'true'

          return
        }

        nativeSetProperty.call(this, property, value, priority)
      }

      document.addEventListener('release-layout-fit', () => {
        released = true
        held?.()
        CSSStyleDeclaration.prototype.setProperty = nativeSetProperty
      })
    })
    await page.goto(`/ui-recipes/layout/?scene=${scene}`)
    await expect(page.locator('html')).toHaveAttribute(
      'data-layout-fit-held',
      'true'
    )
    await page.evaluate(async () => {
      const { promise, resolve } = Promise.withResolvers<number>()
      requestAnimationFrame(() => requestAnimationFrame(resolve))
      await promise
    })
    await expect(page.getByTestId('recipe-status')).toHaveAttribute(
      'data-layouts',
      '0'
    )
    await page.evaluate(() =>
      document.dispatchEvent(new Event('release-layout-fit'))
    )
    await expect(page.getByTestId('recipe-status')).toHaveAttribute(
      'data-layouts',
      '1'
    )
    await expect(page.locator('.flow-foldkit-viewport')).toHaveCSS(
      'transform',
      /matrix\(2,/u
    )
  })
}
