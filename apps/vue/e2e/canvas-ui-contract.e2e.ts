import { expect, test } from '@playwright/test'

test('Vue controls use public viewport actions and background tracks the viewport', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const { mountVueUiFixture } = await import('../src/ui-contract-fixture.ts')
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Vue UI fixture mount point is missing')
    }

    const cleanup = mountVueUiFixture(root)
    Object.assign(window, { __flowVueUiCleanup: cleanup })
  })

  const controls = page.locator('[data-flow-ui="controls"]')
  const backgrounds = page.locator('[data-flow-ui="background"]')
  const dots = page.locator('[data-background-variant="dots"]')
  const lines = page.locator('[data-background-variant="lines"]')
  const cross = page.locator('[data-background-variant="cross"]')

  await expect(controls).toHaveAttribute('role', 'group')

  await expect(controls).toHaveAttribute('aria-label', 'Control Panel')
  await expect(controls).toHaveClass(/flow-vue-controls-bottom-center/u)
  await expect(controls).toHaveClass(/flow-vue-controls-horizontal/u)
  await expect(backgrounds).toHaveCount(3)
  await expect(dots).toHaveAttribute('aria-hidden', 'true')
  await expect(dots.locator('pattern')).toHaveAttribute('width', '18')
  await expect(dots.locator('pattern')).toHaveAttribute('height', '24')
  await expect(dots.locator('pattern')).toHaveClass(/fixture-pattern/u)
  await expect(dots.locator('pattern circle')).toHaveAttribute('r', '2')
  await expect(lines.locator('pattern path')).toHaveAttribute(
    'd',
    'M 18 0 L 0 0 0 24'
  )
  await expect(cross.locator('pattern path')).toHaveAttribute(
    'd',
    'M 8 12 h 2 M 9 11 v 2'
  )
  await expect(
    page.getByRole('button', { name: 'Custom disabled action' })
  ).toBeDisabled()

  const initialTransform = await dots
    .locator('pattern')
    .getAttribute('patternTransform')

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.locator('#ui-viewport')).toHaveAttribute('data-zoom', '1.2')
  await expect(page.locator('#ui-callbacks')).toHaveText('1,0,0')
  await expect(dots.locator('pattern')).not.toHaveAttribute(
    'patternTransform',
    initialTransform ?? ''
  )

  await page.getByRole('button', { name: 'Zoom out' }).click()
  await expect(page.locator('#ui-callbacks')).toHaveText('1,1,0')
  await page.getByRole('button', { name: 'Fit view' }).click()
  await expect(page.locator('#ui-callbacks')).toHaveText('1,1,1')

  await page.locator('#app').evaluate((root) => {
    root.dispatchEvent(new Event('flow-ui-fixture-destroy'))
  })
  await expect(page.locator('.flow-vue-canvas')).toHaveCount(0)
})
