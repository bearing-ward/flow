import { expect, test } from '@playwright/test'
import { Schema } from 'effect'

test('Vue Updating Nodes adds, edits, removes, inspects data, and reports protected deletion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const panel = page.locator('.flow-state-tools')
  const result = panel.locator('output')

  const exerciseWorkflow = async () => {
    const add = panel.getByRole('button', { name: 'Add graph node' })
    await add.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.locator('.flow-vue-node[data-node-id="public-edit-node"]')
    ).toHaveCount(1)

    await panel.getByLabel('Node label').fill('Updated Validate')
    await panel.getByRole('button', { name: 'Update label' }).click()
    await expect(
      page.locator('.flow-vue-node[data-node-id="validate"]')
    ).toContainText('Updated Validate')

    await panel.getByRole('button', { name: 'Update node data' }).click()
    await expect(result).toContainText('editedInPlayground')
    await panel.getByRole('button', { name: 'Update edge data' }).click()

    await panel.getByRole('button', { name: 'Inspect graph' }).click()

    const inspected = Schema.decodeUnknownSync(
      Schema.Struct({
        nodeData: Schema.optional(
          Schema.Struct({
            source: Schema.optional(Schema.String),
            editedInPlayground: Schema.optional(Schema.Boolean),
          })
        ),
        edgeData: Schema.optional(
          Schema.Struct({ edited: Schema.optional(Schema.Boolean) })
        ),
        selected: Schema.optional(Schema.String),
      })
    )(JSON.parse((await result.textContent()) ?? '{}'))

    expect(inspected).toMatchObject({
      nodeData: { source: 'playground', editedInPlayground: true },
      edgeData: { edited: true },
      selected: 'Updated Validate',
    })

    await panel.getByRole('button', { name: 'Remove added node' }).click()
    await expect(
      page.locator('.flow-vue-node[data-node-id="public-edit-node"]')
    ).toHaveCount(0)

    await panel.getByRole('button', { name: 'Add protected node' }).click()
    await panel.getByRole('button', { name: 'Try protected delete' }).click()
    await expect(result).toContainText('ProtectedDeletionConflict')
    await panel.getByRole('button', { name: 'Inspect graph' }).click()

    const protectedState = Schema.decodeUnknownSync(
      Schema.Struct({ protectedNode: Schema.optional(Schema.String) })
    )(JSON.parse((await result.textContent()) ?? '{}'))

    expect(protectedState.protectedNode).toBe('protected-node')
  }

  await exerciseWorkflow()
  await page.screenshot({
    path: '/tmp/flow-052-vue-updating-nodes-desktop.png',
  })
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(
    page.locator('.flow-vue-node[data-node-id="validate"]')
  ).toContainText('Validate')

  await page.setViewportSize({ width: 390, height: 760 })
  await expect(
    panel.getByRole('button', { name: 'Add graph node' })
  ).toBeVisible()
  await exerciseWorkflow()
  await page.screenshot({ path: '/tmp/flow-052-vue-updating-nodes-narrow.png' })
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(
    page.locator('.flow-vue-node[data-node-id="public-edit-node"]')
  ).toHaveCount(0)
  await expect(
    page.locator('.flow-vue-node[data-node-id="protected-node"]')
  ).toHaveCount(0)
})

test('Vue Delete Middle Node reconnects one controlled transaction', async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 640 })
  await page.goto('/')
  const panel = page.locator('.flow-state-tools')
  const result = panel.locator('output')

  const action = panel.getByRole('button', {
    name: 'Delete middle and reconnect',
  })

  await expect(
    page.locator('.flow-vue-node[data-node-id="transform"]')
  ).toBeVisible()
  await action.focus()
  await page.keyboard.press('Enter')

  await expect(
    page.locator('.flow-vue-node[data-node-id="transform"]')
  ).toHaveCount(0)
  await expect(
    page.locator('[data-edge-id="reconnected-input-validate"]')
  ).toBeVisible()
  await expect(result).toContainText('connected input to validate')
  await page.screenshot({ path: '/tmp/flow-052-vue-edit-desktop.png' })

  await page.setViewportSize({ width: 390, height: 760 })
  await expect(action).toBeVisible()
  await page.screenshot({ path: '/tmp/flow-052-vue-edit-narrow.png' })
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(
    page.locator('.flow-vue-node[data-node-id="transform"]')
  ).toBeVisible()
  await action.click()
  await expect(
    page.locator('[data-edge-id="reconnected-input-validate"]')
  ).toBeVisible()
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(
    page.locator('.flow-vue-node[data-node-id="transform"]')
  ).toBeVisible()
})

test('Vue session restore round-trips JSON edge data', async ({ page }) => {
  await page.goto('/')
  const panel = page.locator('.flow-state-tools')
  const result = panel.locator('output')

  await panel.getByRole('button', { name: 'Update edge data' }).click()
  await panel.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(result).toContainText('"edgeData":{"edited":true}')
  await panel.getByRole('button', { name: 'Save snapshot' }).click()
  await panel.getByRole('button', { name: 'Change graph and viewport' }).click()
  await panel.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(result).toContainText('"edgeData":{"changedAfterSave":true}')

  await panel.getByRole('button', { name: 'Restore snapshot' }).click()
  await panel.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(result).toContainText('"edgeData":{"edited":true}')
})
