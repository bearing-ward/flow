import { expect, test } from '@playwright/test'
import { Schema } from 'effect'

test('vanilla Updating Nodes edits data, removes nodes, and reports protected deletion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const panel = page.locator('.flow-state-tools')
  const result = panel.locator('[data-state-result]')

  const inspectState = async () => {
    await panel.getByRole('button', { name: 'Inspect graph' }).click()

    return Schema.decodeUnknownSync(
      Schema.Struct({
        nodes: Schema.Number,
        nodeData: Schema.optional(
          Schema.Struct({
            source: Schema.optional(Schema.String),
            editedInPlayground: Schema.optional(Schema.Boolean),
          })
        ),
        edgeData: Schema.optional(
          Schema.Struct({ editedInPlayground: Schema.optional(Schema.Boolean) })
        ),
        selected: Schema.optional(Schema.String),
        protectedNode: Schema.optional(Schema.String),
      })
    )(JSON.parse((await result.textContent()) ?? '{}'))
  }

  const initial = await inspectState()

  const exerciseWorkflow = async () => {
    const add = panel.getByRole('button', { name: 'Add node' })
    await add.focus()
    await page.keyboard.press('Enter')
    await expect(result).toContainText('accepted nodes=')

    await panel.getByLabel('Node label').fill('Updated Validate')
    await panel.getByRole('button', { name: 'Update label' }).click()
    await expect(
      page.locator('article[data-node-id="validate"]')
    ).toContainText('Updated Validate')

    await panel.getByRole('button', { name: 'Update node data' }).click()
    await expect(result).toContainText('editedInPlayground')
    await panel.getByRole('button', { name: 'Update edge data' }).click()
    await expect(result).toContainText('editedInPlayground')

    await panel.getByRole('button', { name: 'Inspect graph' }).click()
    const inspected = await inspectState()
    expect(inspected).toMatchObject({
      nodes: initial.nodes + 1,
      nodeData: { source: 'playground', editedInPlayground: true },
      edgeData: { editedInPlayground: true },
      selected: 'Updated Validate',
    })

    await panel.getByRole('button', { name: 'Remove added node' }).click()
    await expect(result).toContainText('Removed nodes=added-node')
    const afterRemoval = await inspectState()
    expect(afterRemoval.nodes).toBe(initial.nodes)

    await panel.getByRole('button', { name: 'Add protected node' }).click()
    await panel.getByRole('button', { name: 'Try protected delete' }).click()
    await expect(result).toContainText('ProtectedDeletionConflict')
    await panel.getByRole('button', { name: 'Inspect graph' }).click()
    const protectedState = await inspectState()
    expect(protectedState.protectedNode).toBe('protected-node')
  }

  await exerciseWorkflow()
  await page.screenshot({
    path: '/tmp/flow-052-vanilla-updating-nodes-desktop.png',
  })
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(page.locator('article[data-node-id="validate"]')).toContainText(
    'Validate'
  )
  const afterDesktopReset = await inspectState()
  expect(afterDesktopReset.nodes).toBe(initial.nodes)

  await page.setViewportSize({ width: 390, height: 760 })
  await expect(panel.getByRole('button', { name: 'Add node' })).toBeVisible()
  await exerciseWorkflow()
  await page.screenshot({
    path: '/tmp/flow-052-vanilla-updating-nodes-narrow.png',
  })
  await panel.getByRole('button', { name: 'Reset example' }).click()
  const afterNarrowReset = await inspectState()
  expect(afterNarrowReset.nodes).toBe(initial.nodes)
  expect(afterNarrowReset.protectedNode).toBeUndefined()
})

test('vanilla Delete Middle Node reconnects each neighbor atomically', async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 640 })
  await page.goto('/')
  const panel = page.locator('.flow-state-tools')
  const result = panel.locator('[data-state-result]')

  const action = panel.getByRole('button', {
    name: 'Delete middle and reconnect',
  })

  await expect(page.locator('article[data-node-id="transform"]')).toBeVisible()
  await action.focus()
  await page.keyboard.press('Enter')

  await expect(page.locator('article[data-node-id="transform"]')).toHaveCount(0)
  await expect(
    page.locator('.flow-edge-group[data-edge-id="reconnected-input-output"]')
  ).toBeVisible()
  await expect(
    page.locator('.flow-edge-group[data-edge-id="reconnected-input-validate"]')
  ).toBeVisible()
  await expect(result).toContainText('connected input to validate, output')
  await page.screenshot({ path: '/tmp/flow-052-vanilla-edit-desktop.png' })

  await page.setViewportSize({ width: 390, height: 760 })
  await expect(action).toBeVisible()
  await page.screenshot({ path: '/tmp/flow-052-vanilla-edit-narrow.png' })
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(page.locator('article[data-node-id="transform"]')).toBeVisible()
  await action.click()
  await expect(
    page.locator('.flow-edge-group[data-edge-id="reconnected-input-output"]')
  ).toBeVisible()
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(page.locator('article[data-node-id="transform"]')).toBeVisible()
})

test('vanilla session restore round-trips JSON edge data', async ({ page }) => {
  await page.goto('/')
  const panel = page.locator('.flow-state-tools')
  const result = panel.locator('[data-state-result]')

  await panel.getByRole('button', { name: 'Update edge data' }).click()
  await expect(result).toContainText('"editedInPlayground":true')
  await panel.getByRole('button', { name: 'Save snapshot' }).click()
  await panel.getByRole('button', { name: 'Change graph and viewport' }).click()
  await panel.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(result).toContainText('"edgeData":{"changedAfterSave":true}')

  await panel.getByRole('button', { name: 'Restore snapshot' }).click()
  await panel.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(result).toContainText('"edgeData":{"editedInPlayground":true}')
})
