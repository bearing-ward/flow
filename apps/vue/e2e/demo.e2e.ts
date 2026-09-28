import { expect, test } from '@playwright/test'

test('Vue playground exposes the vanilla main and distant graph controls', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Flow Vue playground' })
  ).toBeVisible()
  await expect(page.getByTestId('flow-node')).toHaveCount(4)
  await expect(page.getByTestId('flow-edge')).toHaveCount(3)

  await page.getByRole('button', { name: 'Show hidden edge' }).click()
  await expect(page.getByTestId('flow-edge')).toHaveCount(4)
  await page.getByRole('button', { name: 'Hide Validate node' }).click()
  await expect(page.locator('[data-node-id="validate"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show Validate node' }).click()
  await expect(page.locator('[data-node-id="validate"]')).toHaveCount(1)

  await page.getByRole('button', { name: 'Distant graph' }).click()
  await expect(page.getByTestId('flow-node')).toHaveCount(2)
  await expect(page.getByTestId('flow-edge')).toHaveCount(1)
  await page.getByRole('button', { name: 'Main graph' }).click()
  await expect(page.getByTestId('flow-node')).toHaveCount(4)

  await page.getByRole('button', { name: 'Add node' }).click()
  await expect(page.getByText('New node')).toBeVisible()

  const canvas = page.getByTestId('flow-canvas')
  await canvas.scrollIntoViewIfNeeded()
  const bounds = await canvas.boundingBox()

  if (bounds === null) {
    throw new Error('Missing Vue demo canvas')
  }

  await page.mouse.move(
    bounds.x + bounds.width - 30,
    bounds.y + bounds.height - 30
  )
  await page.mouse.down()
  await page.mouse.move(
    bounds.x + bounds.width - 55,
    bounds.y + bounds.height - 55
  )
  await page.mouse.up()
  await expect(page.locator('.flow-vue-viewport')).toHaveCSS(
    'transform',
    /matrix\(1, 0, 0, 1, -25, -25\)/u
  )
  await page.mouse.move(bounds.x + 300, bounds.y + 200)
  await page.mouse.wheel(0, -250)
  await expect(page.locator('.flow-vue-viewport')).not.toHaveCSS(
    'transform',
    /matrix\(1, 0, 0, 1, -25, -25\)/u
  )
  await page.getByRole('button', { name: 'Fit graph' }).click()
  await expect(page.locator('.flow-vue-viewport')).not.toHaveCSS(
    'transform',
    /matrix\(1, 0, 0, 1, -25, -25\)/u
  )
})

test('Vue viewport operations scene exposes fitted coordinates, animation cancellation, and custom node sizes', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Viewport operations' }).click()
  await expect(page.locator('[data-node-id="viewport-selected"]')).toHaveCSS(
    'width',
    '260px'
  )
  await expect(page.locator('[data-node-id="viewport-peer"]')).toHaveCSS(
    'width',
    '190px'
  )

  await page.getByTestId('viewport-center').click()
  await expect(page.getByTestId('viewport-operation-status')).toHaveText(
    'Center: accepted'
  )
  await page.getByTestId('viewport-fit-selected').click()
  await expect(page.getByTestId('viewport-operation-status')).toHaveText(
    'Fit selected: accepted'
  )
  await expect(page.getByTestId('viewport-observation')).toHaveText(
    'end:accepted'
  )

  const fitCenter = await page.evaluate(() => {
    const pane = document
      .querySelector('.flow-vue-canvas')
      ?.getBoundingClientRect()

    const node = document
      .querySelector<HTMLElement>('[data-node-id="viewport-selected"]')
      ?.getBoundingClientRect()

    return pane === undefined || node === undefined
      ? undefined
      : {
          dx: node.left + node.width / 2 - pane.left - pane.width / 2,
          dy: node.top + node.height / 2 - pane.top - pane.height / 2,
        }
  })

  expect(Math.abs(fitCenter?.dx ?? Infinity)).toBeLessThan(2)
  expect(Math.abs(fitCenter?.dy ?? Infinity)).toBeLessThan(2)

  await page.getByTestId('viewport-marker').click()

  const marker = await page
    .getByTestId('viewport-conversion-marker')
    .boundingBox()

  const pane = await page.getByTestId('flow-canvas').boundingBox()

  if (marker === null || pane === null) {
    throw new Error('Viewport marker or canvas bounds are unavailable')
  }

  expect(marker.x).toBeGreaterThanOrEqual(pane.x)
  expect(marker.x + marker.width).toBeLessThanOrEqual(pane.x + pane.width)

  await page.getByTestId('viewport-zoom-to').click()
  await expect(page.getByTestId('viewport-operation-status')).toHaveText(
    'Zoom to 0.65: pending'
  )
  await page.getByTestId('viewport-cancel').click()
  await expect(page.getByTestId('viewport-operation-status')).toHaveText(
    'Zoom to 0.65: superseded'
  )
  await expect(page.getByTestId('viewport-observation')).toHaveText(
    'end:superseded'
  )
})
