import { expect, test } from '@playwright/test'

test('FlowPanel placement, attributes, keyboard order, and unmount lifecycle', async ({
  page,
}) => {
  await page.goto('/panel-test.html')
  const canvas = page.getByTestId('flow-canvas')
  const panel = page.getByTestId('flow-panel')
  await expect(panel).toHaveAttribute('role', 'group')
  await expect(panel).toHaveAttribute('aria-label', 'Panel tools')
  await expect(panel).toHaveAttribute('data-flow-ui', 'panel')
  await expect(panel).toHaveAttribute('id', 'contract-panel')
  await expect(panel).toHaveClass(/consumer-class/u)
  await expect(panel).toHaveClass(/flow-vue-no-pan/u)
  await expect(panel).toHaveClass(/flow-vue-no-drag/u)
  await expect(panel).toHaveClass(/flow-vue-no-wheel/u)
  await expect(panel).toHaveCSS('background-color', 'rgb(240, 248, 255)')
  await expect(panel.getByLabel('Panel input')).toHaveValue('editable')

  const canvasBox = await canvas.boundingBox()

  if (canvasBox === null) {
    throw new Error('Canvas should be rendered')
  }

  const positions = [
    ['top-left', 'top', 'left'],
    ['top-center', 'top', 'center'],
    ['top-right', 'top', 'right'],
    ['bottom-left', 'bottom', 'left'],
    ['bottom-center', 'bottom', 'center'],
    ['bottom-right', 'bottom', 'right'],
  ] as const

  // eslint-disable no-await-in-loop -- Position changes share one mounted panel so each measured state is observed in order.
  for (const [position, vertical, horizontal] of positions) {
    await page.getByTestId(`set-${position}`).click()

    await expect(panel).toHaveAttribute('data-position', position)

    const panelBox = await panel.boundingBox()

    if (panelBox === null) {
      throw new Error('Panel should be rendered')
    }

    expect(panelBox.y).toBeCloseTo(
      vertical === 'top'
        ? canvasBox.y + 13
        : canvasBox.y + canvasBox.height - 13 - panelBox.height,
      0
    )

    if (horizontal === 'left') {
      expect(panelBox.x).toBeCloseTo(canvasBox.x + 13, 0)
    } else if (horizontal === 'right') {
      expect(panelBox.x + panelBox.width).toBeCloseTo(
        canvasBox.x + canvasBox.width - 13,
        0
      )
    } else {
      expect(panelBox.x + panelBox.width / 2).toBeCloseTo(
        canvasBox.x + canvasBox.width / 2,
        0
      )
    }
  }
  // eslint-enable no-await-in-loop

  await page.getByTestId('set-top-left').focus()
  await page.keyboard.press('Tab')
  await expect(page.getByTestId('set-top-center')).toBeFocused()
  await page.locator('#panel-input').focus()
  await page.keyboard.press('Tab')
  await expect(page.getByTestId('panel-action')).toBeFocused()

  await page.getByTestId('toggle-panel').click()
  await expect(panel).toHaveCount(0)
  await page.getByTestId('toggle-panel').click()
  await expect(panel).toHaveCount(1)
})
