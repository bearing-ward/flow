import { expect, test } from '@playwright/test'

import { selectionBoundsContract } from '../../shared-e2e/node-input-contract.ts'

test.use({ viewport: { width: 1280, height: 720 } })

test.beforeEach(async ({ page }) => {
  await page.goto('/upstream/nodes/general')
  await expect(page.locator('#app')).toHaveAttribute(
    'data-upstream-ready',
    'true'
  )
})

test('threshold-zero label press and release selects without moving the node', async ({
  page,
}) => {
  const node = page.locator('.flow-foldkit-node[data-node-id="Node-1"]')
  const before = await node.boundingBox()
  await node.hover()
  await page.mouse.down()
  await expect(node).toHaveClass(/dragging/u)
  await page.mouse.up()
  await expect(node).toHaveClass(/selected/u)
  await expect(node).not.toHaveClass(/dragging/u)
  await expect(node).toBeFocused()
  expect(await node.boundingBox()).toEqual(before)
})

test('keyboard deletion uses the approval client after explicit selection', async ({
  page,
}) => {
  const node = page.locator('.flow-foldkit-node[data-node-id="Node-1"]')
  await node
    .getByRole('button', { name: 'Toggle selection for Node-1', exact: true })
    .click()
  await expect(node).toHaveClass(/selected/u)
  await page.keyboard.press('d')
  await expect(node).not.toBeAttached()
  await expect(page.locator('.flow-foldkit-edge')).toHaveCount(0)
})

test('controlled owner acknowledges click selection before immediate keyboard deletion', async ({
  page,
}) => {
  const node = page.locator('.flow-foldkit-node[data-node-id="Node-1"]')
  await node.click()
  await page.keyboard.press('d')
  await expect(node).not.toBeAttached()
  await expect(page.locator('.flow-foldkit-edge')).toHaveCount(0)
})

selectionBoundsContract('foldkit')
