import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 720 } })

test('hidden default toolbar stays outside the accessible and focusable output', async ({
  page,
}) => {
  await page.goto('/upstream/node-toolbar/general')
  await expect(page.locator('#app')).toHaveAttribute(
    'data-upstream-ready',
    'true'
  )

  const toolbar = page.locator(
    '.flow-foldkit-node-toolbar[data-node-toolbar="default-node"]'
  )

  // Plan 102 keeps invisible caller content mounted with hidden.
  await expect(toolbar).toBeAttached()
  await expect(toolbar).toHaveAttribute('hidden', '')
  await expect(toolbar).toBeHidden()
  await expect(toolbar).toHaveCSS('display', 'none')
  await expect(toolbar.getByRole('button')).toHaveCount(0)
  expect(await toolbar.ariaSnapshot()).toBe('')

  expect(
    await toolbar.evaluate((element) =>
      [...element.querySelectorAll('button')].map((button) => {
        button.focus()

        return button.ownerDocument.activeElement === button
      })
    )
  ).toEqual([false, false, false])

  await page.locator('.flow-foldkit-node[data-node-id="default-node"]').click()
  await expect(toolbar).toBeVisible()
  await expect(toolbar.getByRole('button')).toHaveCount(3)
})
