import { WorkflowDocumentSchema } from '@flow/workflow'
import { expect, test as it } from '@playwright/test'
import { Schema } from 'effect'

export const workflowContractsAcceptance = (
  host: 'vanilla' | 'vue' | 'foldkit'
) => {
  const { describe } = it

  describe(`${host} workflow document owner`, () => {
    it('accepts both fixtures, preserves metadata and rejects invalid imports without replacing the document', async ({
      page,
    }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.text().includes('Duplicate key')) {
          errors.push(message.text())
        }
      })
      await page.route('**/*', (route) => {
        const url = new URL(route.request().url())

        if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
          errors.push(`Unexpected remote request: ${url.origin}`)

          return route.abort()
        }

        return route.continue()
      })
      await page.goto('/workflow-contracts/')
      const accepted = page.locator('#accepted')

      const read = async () =>
        Schema.decodeUnknownSync(WorkflowDocumentSchema)(
          JSON.parse((await accepted.textContent()) ?? 'null')
        )

      const edgeTestId = host === 'vanilla' ? 'flow-edge-group' : 'flow-edge'
      await expect(accepted).toContainText('initial-transform')
      await expect(
        page.locator('[data-testid="flow-node"][data-node-id="initial"]')
      ).toBeVisible()
      await expect(
        page.locator(
          `[data-testid="${edgeTestId}"][data-edge-id="initial-transform"]`
        )
      ).toBeAttached()
      const base = await read()
      await page.getByRole('button', { name: 'Load AI workflow' }).click()
      await expect(accepted).toContainText('local-image')
      await expect(accepted).toContainText('preserved')
      await expect(
        page.locator('[data-testid="flow-node"][data-node-id="generate-image"]')
      ).toBeVisible()
      await expect(
        page.locator(
          `[data-testid="${edgeTestId}"][data-edge-id="image-output"]`
        )
      ).toBeAttached()
      const ai = await read()
      await page
        .getByRole('textbox', { name: 'Workflow JSON' })
        .fill(
          '{"nodes":[],"edges":[{"id":"bad","source":"absent","target":"absent"}]}'
        )
      await page.getByRole('button', { name: 'Accept document' }).click()
      await expect(page.locator('#status')).toHaveText('Rejected document')
      await expect.poll(read).toStrictEqual(ai)
      await page.getByRole('button', { name: 'Load base workflow' }).click()
      await expect.poll(read).toStrictEqual(base)
      await page.getByRole('button', { name: 'Dispose', exact: true }).click()
      await expect(page.locator('#status')).toHaveText('Disposed')
      await expect(
        page.locator('[data-testid="flow-node"][data-node-id="initial"]')
      ).toHaveCount(0)
      expect(errors).toStrictEqual([])
    })
  })
}
