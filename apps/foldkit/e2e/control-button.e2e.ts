import { expect, test } from '@playwright/test'

test('public Foldkit control button preserves native attributes and events', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const modulePath = '/e2e/package-ui.ts'
    const { createFoldkitControlButton } = await import(modulePath)
    const originalSetProperty = CSSStyleDeclaration.prototype.setProperty
    CSSStyleDeclaration.prototype.setProperty = function setProperty(
      name,
      value,
      priority
    ) {
      if (name.includes('transform')) {
        window.__foldkitControlCssProperty = name
      }

      originalSetProperty.call(this, name, value, priority)
    }

    const content = document.createElement('span')
    content.textContent = 'Run'

    const button = createFoldkitControlButton(document, {
      name: 'action',
      value: 'run',
      title: 'Run action',
      className: 'caller',
      style: { backgroundColor: 'tomato', msTransform: 'translateX(1px)' },
      aria: { 'aria-label': 'Run action' },
      children: [content],
      onClick: () => {
        window.__foldkitControlButtonClicks += 1
      },
    })

    button.id = 'public-control-button'
    document.body.append(button)
    CSSStyleDeclaration.prototype.setProperty = originalSetProperty

    const disabled = createFoldkitControlButton(document, {
      disabled: true,
      children: [document.createTextNode('Disabled')],
    })

    disabled.id = 'disabled-control-button'
    document.body.append(disabled)
    window.__foldkitControlButtonClicks = 0
  })
  const button = page.getByRole('button', { name: 'Run action' })
  await expect(button).toHaveAttribute('type', 'button')
  await expect(button).toHaveAttribute('name', 'action')
  await expect(button).toHaveAttribute('value', 'run')
  await expect(button).toHaveAttribute('title', 'Run action')
  await expect(button).toHaveClass(/flow-foldkit-control-button.*caller/u)
  await expect(button).toHaveCSS('background-color', 'rgb(255, 99, 71)')
  await expect
    .poll(() => page.evaluate(() => window.__foldkitControlCssProperty))
    .toBe('-ms-transform')
  await button.focus()
  await expect(button).toBeFocused()
  await expect(button).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect
    .poll(() => page.evaluate(() => window.__foldkitControlButtonClicks))
    .toBe(1)
  await expect(page.getByRole('button', { name: 'Disabled' })).toBeDisabled()
})

declare global {
  interface Window {
    __foldkitControlButtonClicks: number
    __foldkitControlCssProperty: string
  }
}
