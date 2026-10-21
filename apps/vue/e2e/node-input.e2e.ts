import { expect, test } from '@playwright/test'

import { selectionBoundsContract } from '../../shared-e2e/node-input-contract.ts'

test.use({ viewport: { width: 1280, height: 720 } })

selectionBoundsContract('vue')

test('controlled owner acknowledges click selection before immediate keyboard deletion', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const path = '/e2e/controlled-delete-harness.ts'
    const { mountControlledDelete } = await import(path)
    mountControlledDelete()
  })
  const node = page.locator('.flow-vue-node[data-node-id="Node-1"]')
  await node.click()
  await page.keyboard.press('d')
  await expect(node).not.toBeAttached()
  await expect(page.locator('.flow-vue-edge')).toHaveCount(0)
})
