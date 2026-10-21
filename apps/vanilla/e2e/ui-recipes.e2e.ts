import { expect, test } from '@playwright/test'

test('Appendix discloses app content by keyboard without moving the graph', async ({
  page,
}) => {
  await page.goto('/ui-recipes/appendix/')

  const button = page.getByRole('button', { name: 'Import details' })
  const region = page.locator(`#${await button.getAttribute('aria-controls')}`)
  const viewport = page.locator('.flow-viewport')

  const node = page.locator('[data-node-id="appendix-node"]')

  const readNodeTransform = () =>
    node.evaluate((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new TypeError('Appendix node must be an HTML element')
      }

      return element.style.transform
    })

  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(region).toBeHidden()
  await expect(region).toContainText(
    'The workflow validates customer records before importing them.'
  )

  const initialGraph = await page.evaluate(() => {
    const viewportElement =
      document.querySelector<HTMLElement>('.flow-viewport')

    const nodeElement = document.querySelector<HTMLElement>(
      '[data-node-id="appendix-node"]'
    )

    if (viewportElement === null || nodeElement === null) {
      throw new Error('Appendix graph elements are missing')
    }

    return {
      viewportX: viewportElement.dataset.x,
      viewportY: viewportElement.dataset.y,
      nodeTransform: nodeElement.style.transform,
    }
  })

  await button.focus()
  await button.press('Enter')
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await expect(region).toBeVisible()
  await button.press('Space')
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(region).toBeHidden()

  const bounds = await button.boundingBox()

  if (bounds === null) {
    throw new Error('Appendix button must be visible')
  }

  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2 + 90, bounds.y + 55, {
    steps: 5,
  })
  await page.mouse.up()

  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(region).toBeHidden()
  expect(await viewport.getAttribute('data-x')).toBe(initialGraph.viewportX)
  expect(await viewport.getAttribute('data-y')).toBe(initialGraph.viewportY)
  expect(await readNodeTransform()).toBe(initialGraph.nodeTransform)

  await button.focus()
  await page.keyboard.press('Enter')
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await expect(region).toBeVisible()
  expect(await viewport.getAttribute('data-x')).toBe(initialGraph.viewportX)
  expect(await viewport.getAttribute('data-y')).toBe(initialGraph.viewportY)
  expect(await readNodeTransform()).toBe(initialGraph.nodeTransform)

  await page.getByRole('button', { name: 'Remount appendix' }).click()
  const remountedButton = page.getByRole('button', { name: 'Import details' })
  await expect(remountedButton).toHaveAttribute('aria-expanded', 'false')
  await expect(
    page.locator(`#${await remountedButton.getAttribute('aria-controls')}`)
  ).toBeHidden()
  await expect(page.locator('.flow-appendix')).toHaveCount(1)
})

test('Status Indicator follows public node data with semantic and reduced-motion feedback', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/ui-recipes/status-indicator')

  const indicator = page.locator(
    '.flow-status-recipe-node .flow-status-indicator'
  )

  await expect(indicator).toHaveAttribute('role', 'status')
  await expect(indicator).toHaveAttribute('data-flow-status', 'waiting')
  await expect(indicator).toHaveText('Waiting')
  await expect(indicator).toHaveCSS('color', 'rgb(146, 64, 14)')
  await expect(indicator.locator('.flow-status-indicator-marker')).toHaveCSS(
    'animation-name',
    'none'
  )

  await page.getByRole('button', { name: 'Ready' }).click()
  await expect(indicator).toHaveAttribute('data-flow-status', 'ready')
  await expect(indicator).toHaveText('Ready')
  await expect(indicator).toHaveCSS('color', 'rgb(22, 101, 52)')

  await page.getByRole('button', { name: 'Error' }).click()
  await expect(indicator).toHaveAttribute('data-flow-status', 'error')
  await expect(indicator).toHaveText('Error')
  await expect(indicator).toHaveCSS('color', 'rgb(185, 28, 28)')

  await page.getByRole('button', { name: 'Waiting' }).click()
  await expect(indicator).toHaveAttribute('data-flow-status', 'waiting')
  await expect(indicator).toHaveText('Waiting')
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(indicator).toHaveAttribute('data-flow-status', 'waiting')
  await page.reload()
  await expect(
    page.locator('.flow-status-recipe-node .flow-status-indicator')
  ).toHaveText('Waiting')
})

test('Tooltip supports pointer and keyboard descriptions without moving the graph', async ({
  page,
}) => {
  await page.goto('/ui-recipes/tooltip/')

  const trigger = page.getByRole('button', { name: 'Import settings' })

  const secondaryTrigger = page.getByRole('button', {
    name: 'Export settings',
  })

  const tooltipId = await trigger.getAttribute('aria-describedby')

  const secondaryTooltipId =
    await secondaryTrigger.getAttribute('aria-describedby')

  if (tooltipId === null) {
    throw new Error('Tooltip trigger must reference its description')
  }

  if (secondaryTooltipId === null) {
    throw new Error('Secondary tooltip trigger must reference its description')
  }

  expect(secondaryTooltipId).not.toBe(tooltipId)

  const tooltip = page.locator(`#${tooltipId}`)
  const viewport = page.locator('.flow-viewport')
  const node = page.locator('[data-node-id="tooltip-node"]')

  const initialGraph = await page.evaluate(() => {
    const viewportElement =
      document.querySelector<HTMLElement>('.flow-viewport')

    const nodeElement = document.querySelector<HTMLElement>(
      '[data-node-id="tooltip-node"]'
    )

    if (viewportElement === null || nodeElement === null) {
      throw new Error('Tooltip graph elements are missing')
    }

    return {
      viewportX: viewportElement.dataset.x,
      viewportY: viewportElement.dataset.y,
      zoom: viewportElement.dataset.zoom,
      nodeTransform: nodeElement.style.transform,
    }
  })

  await expect(trigger).toHaveAttribute('aria-describedby', tooltipId)
  await expect(tooltip).toHaveAttribute('role', 'tooltip')
  await expect(tooltip).toContainText('Choose which customer fields to import.')
  await expect(page.locator(`#${secondaryTooltipId}`)).toContainText(
    'Choose a destination for exported records.'
  )
  await expect(tooltip).toBeHidden()

  await trigger.focus()
  await expect(tooltip).toBeVisible()
  expect(
    await trigger.evaluate((element) => document.activeElement === element)
  ).toBe(true)
  await page.keyboard.press('Tab')
  await expect(tooltip).toBeHidden()

  await trigger.hover()
  await expect(tooltip).toBeVisible()
  await tooltip.hover()
  await expect(tooltip).toBeVisible()
  await page.mouse.move(8, 8)
  await expect(tooltip).toBeHidden()

  expect(await viewport.getAttribute('data-x')).toBe(initialGraph.viewportX)
  expect(await viewport.getAttribute('data-y')).toBe(initialGraph.viewportY)
  expect(await viewport.getAttribute('data-zoom')).toBe(initialGraph.zoom)
  expect(
    await node.evaluate((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new TypeError('Tooltip node must be an HTML element')
      }

      return element.style.transform
    })
  ).toBe(initialGraph.nodeTransform)

  await page.getByRole('button', { name: 'Remount tooltip' }).click()
  await expect(
    page.getByRole('button', { name: 'Import settings' })
  ).toHaveAttribute('aria-describedby', /flow-tooltip-/u)
  await expect(page.locator('[role="tooltip"]')).toHaveCount(2)
  await expect(page.locator('[role="tooltip"]:visible')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('[role="tooltip"]')).toHaveCount(2)
  await expect(page.locator('[role="tooltip"]:visible')).toHaveCount(0)
})
