import { expect, test } from '@playwright/test'

const url = 'https://example-apps.xyflow.com/react/pro/undo-redo/index.html'

test('public reference creates nodes and restores a complete drag through buttons and shortcuts', async ({
  page,
}) => {
  await page.goto(url)

  const undo = page.getByRole('button', { name: /undo/iu })
  const redo = page.getByRole('button', { name: /redo/iu })
  const pane = page.locator('.react-flow__pane')
  const nodes = page.locator('.react-flow__node')

  await expect(undo).toBeDisabled()
  await expect(redo).toBeDisabled()
  await expect(nodes).toHaveCount(0)
  await pane.click({ position: { x: 260, y: 220 } })
  await expect(nodes).toHaveCount(1)
  await undo.click()
  await expect(nodes).toHaveCount(0)
  await redo.click()
  await expect(nodes).toHaveCount(1)
  await pane.click({ position: { x: 600, y: 350 } })
  await expect(nodes).toHaveCount(2)

  const node = nodes.first()
  const bounds = await node.boundingBox()

  if (bounds === null) {
    throw new Error('Reference node has no rendered bounds')
  }

  const initial = await node.evaluate((element) => element.style.transform)

  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 70,
    bounds.y + bounds.height / 2 + 50,
    { steps: 8 }
  )
  await page.mouse.up()

  const moved = await node.evaluate((element) => element.style.transform)

  expect(moved).not.toBe(initial)
  await undo.click()
  await expect
    .poll(() => node.evaluate((element) => element.style.transform))
    .toBe(initial)
  await redo.click()
  await expect
    .poll(() => node.evaluate((element) => element.style.transform))
    .toBe(moved)
  await node.focus()
  await page.keyboard.press('Control+z')
  await expect
    .poll(() => node.evaluate((element) => element.style.transform))
    .toBe(initial)
  await page.keyboard.press('Control+Shift+z')
  await expect
    .poll(() => node.evaluate((element) => element.style.transform))
    .toBe(moved)
})
