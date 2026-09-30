import { expect, test } from '@playwright/test'

test('public Vanilla control button preserves native attributes and events', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlowControlButton } = await import(modulePath)
    const originalSetProperty = CSSStyleDeclaration.prototype.setProperty
    CSSStyleDeclaration.prototype.setProperty = function setProperty(
      name,
      value,
      priority
    ) {
      if (name.includes('transform')) {
        window.__flowControlCssProperty = name
      }

      originalSetProperty.call(this, name, value, priority)
    }

    const content = document.createElement('span')
    content.textContent = 'Run'

    const button = createFlowControlButton(document, {
      name: 'action',
      value: 'run',
      title: 'Run action',
      className: 'caller',
      style: { backgroundColor: 'tomato', msTransform: 'translateX(1px)' },
      aria: { 'aria-label': 'Run action' },
      children: [content],
      onClick: () => {
        window.__controlButtonClicks += 1
      },
    })

    button.id = 'public-control-button'
    document.body.append(button)
    CSSStyleDeclaration.prototype.setProperty = originalSetProperty

    const disabled = createFlowControlButton(document, {
      disabled: true,
      children: [document.createTextNode('Disabled')],
    })

    disabled.id = 'disabled-control-button'
    document.body.append(disabled)
    window.__controlButtonClicks = 0
  })
  const button = page.getByRole('button', { name: 'Run action' })
  await expect(button).toHaveAttribute('type', 'button')
  await expect(button).toHaveAttribute('name', 'action')
  await expect(button).toHaveAttribute('value', 'run')
  await expect(button).toHaveAttribute('title', 'Run action')
  await expect(button).toHaveClass(/flow-control-button.*caller/u)
  await expect(button).toHaveCSS('background-color', 'rgb(255, 99, 71)')
  await expect
    .poll(() => page.evaluate(() => window.__flowControlCssProperty))
    .toBe('-ms-transform')
  await button.focus()
  await expect(button).toBeFocused()
  await expect(button).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect
    .poll(() => page.evaluate(() => window.__controlButtonClicks))
    .toBe(1)
  await expect(page.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Disabled' })).toHaveAttribute(
    'type',
    'button'
  )
})

declare global {
  interface Window {
    __controlButtonClicks: number
    __flowControlCssProperty: string
  }
}
