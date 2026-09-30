import { expect, test } from '@playwright/test'

test('Vue Tooltip supports hover and focus without graph gestures', async ({
  page,
}) => {
  await page.goto('/ui-recipes/tooltip/')

  const canvas = page.locator('.flow-vue-canvas')
  const node = page.locator('.flow-vue-node[data-node-id="tooltip-example"]')
  const trigger = page.getByRole('button', { name: 'Status help' })
  const regionTrigger = page.getByRole('button', { name: 'Region help' })
  // Role queries omit the hidden tooltip nodes; the attribute locator also
  // lets the test assert their initial hidden state.
  const tooltips = page.locator('[role="tooltip"]')
  const tooltip = tooltips.nth(0)
  const regionTooltip = tooltips.nth(1)
  await expect(node).toBeVisible()

  const triggerDescription = await trigger.getAttribute('aria-describedby')
  const initialIds = triggerDescription?.split(/\s+/u) ?? []

  expect(initialIds).toContain('application-status-note')
  expect(
    initialIds.filter((id) => id === 'application-status-note')
  ).toHaveLength(1)

  const regionDescription = await regionTrigger.getAttribute('aria-describedby')
  const regionIds = regionDescription?.split(/\s+/u) ?? []

  const firstTooltipId = initialIds.find((id) => id.startsWith('flow-tooltip-'))
  const secondTooltipId = regionIds.find((id) => id.startsWith('flow-tooltip-'))
  expect(firstTooltipId).toBeDefined()
  expect(secondTooltipId).toBeDefined()
  expect(secondTooltipId).not.toBe(firstTooltipId)
  await expect(tooltips).toHaveCount(2)
  await expect(tooltip).toBeHidden()
  await expect(regionTooltip).toBeHidden()

  const nodeBefore = await node.boundingBox()

  const viewportBefore = await canvas
    .locator('.flow-vue-viewport')
    .getAttribute('style')

  await trigger.hover()
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveText('This status is owned by the application.')
  await expect(page.locator(`#${firstTooltipId}`)).toHaveAttribute(
    'role',
    'tooltip'
  )
  const tooltipBox = await tooltip.boundingBox()

  if (tooltipBox === null) {
    throw new Error('Visible tooltip has no layout box')
  }

  await page.mouse.move(
    tooltipBox.x + tooltipBox.width / 2,
    tooltipBox.y + tooltipBox.height / 2
  )
  await expect(tooltip).toBeVisible()
  await expect(trigger).not.toBeFocused()
  await page.mouse.move(20, 20)
  await expect(tooltip).toBeHidden()

  await trigger.focus()
  await expect(tooltip).toBeVisible()
  await expect(trigger).toBeFocused()
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  })
  await expect(tooltip).toBeHidden()

  await trigger.hover()
  await trigger.click()
  await page.mouse.wheel(0, 160)
  await expect(node).toBeVisible()
  expect(await node.boundingBox()).toEqual(nodeBefore)
  expect(await canvas.locator('.flow-vue-viewport').getAttribute('style')).toBe(
    viewportBefore
  )

  await page.reload()
  await expect(page.locator('[role="tooltip"]')).toHaveCount(2)
  await expect(page.locator('[role="tooltip"]').first()).toBeHidden()
  await page.goto('/')
  await expect(page.locator('[role="tooltip"]')).toHaveCount(0)
})
