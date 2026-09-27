import { expect, test } from '@playwright/test'
import { Schema } from 'effect'

test('Foldkit Updating Nodes edits data, removes nodes, and reports protected deletion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const panel = page.locator('.flow-state-tools')
  const result = panel.locator('output')

  const exerciseWorkflow = async () => {
    const add = panel.getByRole('button', { name: 'Add node' })
    await add.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.locator('.flow-foldkit-node[data-node-id="playground-edit-node"]')
    ).toHaveCount(1)

    await panel.getByLabel('Node label').fill('Updated Validate')
    await panel.getByRole('button', { name: 'Update label' }).click()
    await expect(
      page.locator('.flow-foldkit-node[data-node-id="validate"]')
    ).toContainText('Updated Validate')

    await panel.getByRole('button', { name: 'Update node data' }).click()
    await expect(result).toContainText('Updated node data')
    await panel.getByRole('button', { name: 'Update edge data' }).click()
    await expect(result).toContainText('Updated edge data')

    await panel.getByRole('button', { name: 'Inspect graph' }).click()
    await expect(result).toContainText('"nodes":')

    const inspected = Schema.decodeUnknownSync(
      Schema.Struct({
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
      })
    )(JSON.parse((await result.textContent()) ?? '{}'))

    expect(inspected).toMatchObject({
      nodeData: { source: 'playground', editedInPlayground: true },
      edgeData: { editedInPlayground: true },
      selected: 'Updated Validate',
    })

    await panel.getByRole('button', { name: 'Remove added node' }).click()
    await expect(
      page.locator('.flow-foldkit-node[data-node-id="playground-edit-node"]')
    ).toHaveCount(0)

    await panel.getByRole('button', { name: 'Add protected node' }).click()
    await panel.getByRole('button', { name: 'Try protected delete' }).click()
    await expect(result).toContainText('ProtectedDeletionConflict')
    await panel.getByRole('button', { name: 'Inspect graph' }).click()
    await expect(result).toContainText('"nodes":')

    const protectedState = Schema.decodeUnknownSync(
      Schema.Struct({ protectedNode: Schema.optional(Schema.String) })
    )(JSON.parse((await result.textContent()) ?? '{}'))

    expect(protectedState.protectedNode).toBe('protected-node')
  }

  await exerciseWorkflow()
  await page.screenshot({
    path: '/tmp/flow-052-foldkit-updating-nodes-desktop.png',
  })
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(
    page.locator('.flow-foldkit-node[data-node-id="validate"]')
  ).toContainText('Validate')

  await page.setViewportSize({ width: 390, height: 760 })
  await expect(panel.getByRole('button', { name: 'Add node' })).toBeVisible()
  await exerciseWorkflow()
  await page.screenshot({
    path: '/tmp/flow-052-foldkit-updating-nodes-narrow.png',
  })
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(
    page.locator('.flow-foldkit-node[data-node-id="playground-edit-node"]')
  ).toHaveCount(0)
  await expect(
    page.locator('.flow-foldkit-node[data-node-id="protected-node"]')
  ).toHaveCount(0)
})

test('Foldkit Delete Middle Node reconnects from one pre-edit model snapshot', async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 640 })
  await page.goto('/')
  const panel = page.locator('.flow-state-tools')
  const result = panel.locator('output')

  await expect(
    page.locator('.flow-foldkit-node[data-node-id="validate"]')
  ).toBeVisible()
  await expect(
    page.locator('.flow-foldkit-edge[data-edge-id="source-validate"]')
  ).toHaveCount(1)
  await expect(
    page.locator('.flow-foldkit-edge[data-edge-id="validate-target"]')
  ).toHaveCount(1)

  const action = panel.getByRole('button', {
    name: 'Delete middle and reconnect',
  })

  await action.focus()
  await page.keyboard.press('Enter')

  await expect(
    page.locator('.flow-foldkit-node[data-node-id="validate"]')
  ).toHaveCount(0)
  await expect(
    page.locator('.flow-foldkit-edge[data-edge-id="source-validate"]')
  ).toHaveCount(0)
  await expect(
    page.locator('.flow-foldkit-edge[data-edge-id="validate-target"]')
  ).toHaveCount(0)
  await expect(
    page.locator('.flow-foldkit-edge[data-edge-id="reconnected-source-target"]')
  ).toHaveCount(1)
  await expect(result).toContainText('connected source to target')
  await page.screenshot({ path: '/tmp/flow-052-foldkit-edit-desktop.png' })

  await page.setViewportSize({ width: 390, height: 760 })
  await expect(action).toBeVisible()
  await page.screenshot({ path: '/tmp/flow-052-foldkit-edit-narrow.png' })
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(
    page.locator('.flow-foldkit-node[data-node-id="validate"]')
  ).toBeVisible()
  await action.click()
  await expect(
    page.locator('.flow-foldkit-edge[data-edge-id="reconnected-source-target"]')
  ).toHaveCount(1)
  await panel.getByRole('button', { name: 'Reset example' }).click()
  await expect(
    page.locator('.flow-foldkit-node[data-node-id="validate"]')
  ).toBeVisible()
})

test('Foldkit session restore round-trips JSON edge data', async ({ page }) => {
  await page.goto('/')
  const panel = page.locator('.flow-state-tools')
  const result = panel.locator('output')

  await panel.getByRole('button', { name: 'Update edge data' }).click()
  await panel.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(result).toContainText('"edgeData":{"editedInPlayground":true}')
  await panel.getByRole('button', { name: 'Save snapshot' }).click()
  await panel.getByRole('button', { name: 'Change graph and viewport' }).click()
  await panel.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(result).toContainText('"edgeData":{"changedAfterSave":true}')

  await panel.getByRole('button', { name: 'Restore snapshot' }).click()
  await expect(result).toContainText('Restored document and viewport')
  await panel.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(result).toContainText('"edgeData":{"editedInPlayground":true}')
})
