import { expect, test } from '@playwright/test'

import { interactionPolicyContract } from '../../shared-e2e/interaction-policy-contract.ts'

interactionPolicyContract('vue')

test('Vue callback presence alone refreshes pointer policy', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const { mountInteractionPolicyTest } =
      await import('../src/interaction-policy-test.ts')

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing callback fixture root')
    }

    mountInteractionPolicyTest(root)
  })
  const node = page.locator('.flow-vue-node').first()
  const edge = page.locator('.flow-vue-edge').first()
  await expect(node).toHaveCSS('pointer-events', 'none')
  await expect(edge).toHaveCSS('pointer-events', 'none')
  await page.getByRole('button', { name: 'Toggle callbacks' }).click()
  await expect(node).toHaveCSS('pointer-events', 'all')
  await expect(edge).toHaveCSS('pointer-events', 'visiblestroke')
  await node.click()
  await expect(page.locator('#app')).toHaveAttribute('data-clicks', '1')
  await page.getByRole('button', { name: 'Toggle callbacks' }).click()
  await expect(node).toHaveCSS('pointer-events', 'none')
  await expect(edge).toHaveCSS('pointer-events', 'none')
})
