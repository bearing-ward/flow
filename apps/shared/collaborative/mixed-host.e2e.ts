import { expect, test } from '@playwright/test'

import { applyRoom, readyRoom, readRoom, seedRoom } from './acceptance.ts'

const it = test

const { describe } = test

describe('mixed-host collaboration over real websocket', () => {
  it('converges Vanilla, Vue and Foldkit edits, selective undo and deletion in one room', async ({
    browser,
  }) => {
    const room = crypto.randomUUID()

    const clients = await Promise.all(
      [4190, 4191, 4192].map(async (port) => {
        const context = await browser.newContext()
        const page = await context.newPage()
        await readyRoom(
          page,
          `http://127.0.0.1:${port}/collaborative/?room=${room}`
        )

        return { page, context }
      })
    )

    try {
      const [vanilla, vue, foldkit] = clients.map(({ page }) => page)

      if (vanilla === undefined || vue === undefined || foldkit === undefined) {
        throw new Error('Missing clients')
      }

      await seedRoom(vanilla)

      await Promise.all(
        clients.map(({ page }) =>
          expect(
            page.locator('[data-testid="flow-node"][data-node-id="a"]')
          ).toBeVisible()
        )
      )

      await Promise.all([
        applyRoom(vue, [
          { kind: 'update-node', nodeId: 'a', patch: { label: 'Vue label' } },
        ]),
        applyRoom(foldkit, [
          {
            kind: 'update-node',
            nodeId: 'b',
            patch: { position: { x: 500, y: 260 } },
          },
        ]),
      ])

      await Promise.all(
        clients.map(async ({ page }) => {
          await expect
            .poll(() =>
              readRoom(page).then(
                (value) =>
                  value?.document.nodes.find(({ id }) => id === 'a')?.label
              )
            )
            .toBe('Vue label')
          await expect
            .poll(() =>
              readRoom(page).then(
                (value) =>
                  value?.document.nodes.find(({ id }) => id === 'b')?.position
              )
            )
            .toEqual({ x: 500, y: 260 })
        })
      )

      await vue.getByRole('button', { name: 'Undo', exact: true }).click()

      await Promise.all(
        clients.map(async ({ page }) => {
          await expect
            .poll(() =>
              readRoom(page).then(
                (value) =>
                  value?.document.nodes.find(({ id }) => id === 'a')?.label
              )
            )
            .toBe('A')
          const snapshot = await readRoom(page)
          expect(
            snapshot?.document.nodes.find(({ id }) => id === 'b')?.position
          ).toEqual({ x: 500, y: 260 })
        })
      )

      await applyRoom(foldkit, [{ kind: 'delete-elements', nodeIds: ['a'] }])

      await Promise.all(
        clients.map(async ({ page }) => {
          await expect(
            page.locator('[data-testid="flow-node"][data-node-id="a"]')
          ).toHaveCount(0)
          await expect
            .poll(() => readRoom(page).then((value) => value?.document.edges))
            .toEqual([])
        })
      )
    } finally {
      await Promise.all(
        clients.map(async ({ page, context }) => {
          await page.evaluate(() => globalThis.flowCollaborativeDemo?.dispose())
          await context.close()
        })
      )
    }
  })
})
