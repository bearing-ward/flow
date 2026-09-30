import { expect, test } from '@playwright/test'

test('Status Indicator reflects edited app data, accessible state, motion preference, and reset', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/ui-recipes/status-indicator/')

  const canvas = page.locator('[data-status-canvas]')
  await expect(canvas.locator('.flow-foldkit-canvas')).toBeVisible()
  const status = canvas.locator('.flow-foldkit-status-indicator')
  const statusText = status.locator('.flow-foldkit-status-indicator-label')
  await expect(status).toHaveAttribute('data-flow-status', 'waiting')
  await expect(statusText).toHaveText('Waiting')
  await expect(status).toHaveCSS('background-color', 'rgb(241, 245, 249)')
  await expect(status.locator('.flow-foldkit-status-indicator-mark')).toHaveCSS(
    'animation-name',
    'none'
  )

  await page.getByRole('button', { name: 'Mark ready' }).click()
  await expect(status).toHaveAttribute('data-flow-status', 'ready')
  await expect(statusText).toHaveText('Ready')
  await expect(status).toHaveCSS('background-color', 'rgb(220, 252, 231)')

  await page.getByRole('button', { name: 'Mark error' }).click()
  await expect(status).toHaveAttribute('data-flow-status', 'error')
  await expect(statusText).toHaveText('Error')
  await expect(status).toHaveCSS('background-color', 'rgb(254, 226, 226)')

  await page.getByRole('button', { name: 'Reset to waiting' }).click()
  await expect(status).toHaveAttribute('data-flow-status', 'waiting')
  await expect(statusText).toHaveText('Waiting')
  await page.reload()
  await expect(
    page.locator('[data-status-canvas] .flow-foldkit-status-indicator')
  ).toHaveAttribute('data-flow-status', 'waiting')
})

test('Appendix disclosure is accessible, keyboard operable, isolated from canvas gestures, and unmounts cleanly', async ({
  page,
}) => {
  await page.goto('/ui-recipes/appendix/')

  const canvas = page.locator(
    '.flow-appendix-canvas-frame .flow-foldkit-canvas'
  )

  await expect(canvas).toBeVisible()
  const disclosure = page.getByRole('button', { name: 'Implementation notes' })
  const content = page.locator('#flow-appendix-content')
  const viewport = canvas.locator('.flow-foldkit-viewport')
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false')
  await expect(disclosure).toHaveAttribute(
    'aria-controls',
    'flow-appendix-content'
  )
  await expect(content).toBeHidden()

  const initialViewport = await viewport.getAttribute('style')
  const buttonBox = await disclosure.boundingBox()

  expect(buttonBox).not.toBeNull()

  if (buttonBox === null) {
    throw new Error('Appendix disclosure is not visible')
  }

  await page.mouse.move(
    buttonBox.x + buttonBox.width / 2,
    buttonBox.y + buttonBox.height / 2
  )
  await page.mouse.wheel(0, 120)
  await expect(viewport).toHaveAttribute('style', initialViewport ?? '')

  await disclosure.focus()
  await page.keyboard.press('Enter')
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  await expect(content).toBeVisible()
  await expect(content).toContainText('retry step after validation')
  await expect(viewport).toHaveAttribute('style', initialViewport ?? '')

  await page.keyboard.press('Space')
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false')
  await expect(content).toBeHidden()

  await page.reload()
  await expect(page.locator('.flow-foldkit-canvas')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Implementation notes' })
  ).toHaveAttribute('aria-expanded', 'false')
  await page.evaluate(() => {
    globalThis.dispatchEvent(new Event('flow-recipe:unmount'))
  })
  await expect(page.locator('#app')).toBeEmpty()
})

test('Tooltip supports hover and keyboard focus without canvas gestures, and tears down cleanly', async ({
  page,
}) => {
  await page.goto('/ui-recipes/tooltip/')

  const canvas = page.locator('.flow-tooltip-canvas-frame .flow-foldkit-canvas')
  const trigger = page.getByRole('img', { name: 'Node guidance' })
  const viewport = canvas.locator('.flow-foldkit-viewport')
  const tooltip = page.getByRole('tooltip')

  await expect(canvas).toBeVisible()
  await expect(trigger).toHaveAttribute('tabindex', '0')
  const descriptionId = await trigger.getAttribute('aria-describedby')
  expect(descriptionId).toBeTruthy()
  await expect(tooltip).toBeHidden()

  const initialViewport = await viewport.getAttribute('style')
  await trigger.focus()
  await expect(tooltip).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-describedby', descriptionId ?? '')
  await expect(tooltip).toContainText(
    'Review the changed files before publishing.'
  )
  await expect(tooltip).toContainText('<script>')
  await expect(tooltip.locator('script')).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(viewport).toHaveAttribute('style', initialViewport ?? '')

  await trigger.evaluate((element) => element.blur())
  await expect(tooltip).toBeHidden()

  const triggerBox = await trigger.boundingBox()
  expect(triggerBox).not.toBeNull()

  if (triggerBox === null) {
    throw new Error('Tooltip trigger is not visible')
  }

  await page.mouse.move(
    triggerBox.x + triggerBox.width / 2,
    triggerBox.y + triggerBox.height / 2
  )
  await expect(tooltip).toBeVisible()
  await page.mouse.down()
  await page.mouse.move(
    triggerBox.x + triggerBox.width / 2 + 30,
    triggerBox.y + triggerBox.height / 2 + 20
  )
  await page.mouse.up()
  await expect(viewport).toHaveAttribute('style', initialViewport ?? '')
  await page.mouse.move(
    triggerBox.x + triggerBox.width / 2,
    triggerBox.y + triggerBox.height / 2
  )
  const tooltipBox = await tooltip.boundingBox()
  expect(tooltipBox).not.toBeNull()

  if (tooltipBox === null) {
    throw new Error('Tooltip is not visible')
  }

  await page.mouse.move(
    tooltipBox.x + tooltipBox.width / 2,
    tooltipBox.y + tooltipBox.height / 2,
    { steps: 10 }
  )
  await expect(tooltip).toBeVisible()
  await trigger.evaluate((element) => element.blur())
  await expect(tooltip).toBeVisible()
  await page.mouse.move(10, 10)
  await expect(tooltip).toBeHidden()
  await expect(viewport).toHaveAttribute('style', initialViewport ?? '')

  await page.reload()
  await expect(page.getByRole('tooltip')).toBeHidden()
  await expect(
    page.getByRole('img', { name: 'Node guidance' })
  ).toHaveAttribute('aria-describedby', /flow-foldkit-tooltip-/u)
  await page.evaluate(() => {
    globalThis.dispatchEvent(new Event('flow-recipe:unmount'))
  })
  await expect(page.locator('#app')).toBeEmpty()
})
