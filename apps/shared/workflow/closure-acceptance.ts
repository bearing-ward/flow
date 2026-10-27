import {
  aiWorkflowFixture,
  baseWorkflowFixture,
  SavedWorkflowSchema,
  WorkflowDocumentSchema,
  WorkflowRunStateSchema,
} from '@flow/workflow'
import { expect, test as it } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema as S } from 'effect'

const read = async (page: Page) =>
  S.decodeUnknownSync(WorkflowDocumentSchema)(
    JSON.parse((await page.locator('#accepted').textContent()) ?? 'null')
  )

const activate = async (page: Page, name: string) => {
  const button = page.getByRole('button', { name, exact: true })
  await button.focus()
  await button.press('Enter')
}

export const workflowClosureAcceptance = (host: string) => {
  const { describe } = it
  describe(`${host} independent workflow closure`, () => {
    const failures = new WeakMap<Page, string[]>()
    it.beforeEach(async ({ page, baseURL }) => {
      const errors: string[] = []
      failures.set(page, errors)
      page.on('pageerror', (error) => errors.push(error.message))
      await page.route('**/*', async (route) => {
        if (
          new URL(route.request().url()).origin ===
          new URL(baseURL ?? '').origin
        ) {
          await route.continue()
        } else {
          errors.push(`Unexpected request ${route.request().url()}`)
          await route.abort()
        }
      })
      await page.routeWebSocket('**/*', (socket) => {
        if (new URL(socket.url()).host === new URL(baseURL ?? '').host) {
          socket.connectToServer()
        } else {
          errors.push(`Unexpected socket ${socket.url()}`)
          void socket.close()
        }
      })
      await page.goto('/')

      const link = page.getByRole('link', {
        name: 'Workflow and offline AI editor',
        exact: true,
      })

      await link.focus()
      await link.press('Enter')
      await expect(page.locator('#accepted')).toContainText('seed-edge')
    })
    it.afterEach(({ page }) => {
      expect(failures.get(page)).toStrictEqual([])
    })

    it('selects, moves and deletes a rendered workflow node with native inputs', async ({
      page,
    }) => {
      await activate(page, 'Layout and fit')
      await expect(
        page.getByLabel('Layout status', { exact: true })
      ).toHaveText('ELK layout complete')
      const before = await read(page)
      const [first] = before.nodes

      if (first === undefined) {
        throw new Error('Missing seed node')
      }

      const node = page.locator(
        `[data-testid="flow-node"][data-node-id="${first.id}"]`
      )

      await node.click()
      await expect
        .poll(() =>
          read(page).then(
            (document) =>
              document.nodes.find((item) => item.id === first.id)?.selected
          )
        )
        .toBe(true)
      const bounds = await node.boundingBox()

      if (bounds === null) {
        throw new Error('Missing rendered seed node')
      }

      await page.mouse.move(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2
      )
      await page.mouse.down()
      await page.mouse.move(
        bounds.x + bounds.width / 2 + 40,
        bounds.y + bounds.height / 2 + 25,
        { steps: 5 }
      )
      await page.mouse.up()
      await expect
        .poll(() =>
          read(page).then(
            (document) =>
              document.nodes.find((item) => item.id === first.id)?.selected
          )
        )
        .toBe(true)
      await expect
        .poll(() =>
          read(page).then(
            (document) =>
              document.nodes.find((item) => item.id === first.id)?.position
          )
        )
        .not.toStrictEqual(first.position)
      await node.focus()
      await node.press('Delete')
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(1)
      const deleted = await read(page)
      expect(deleted.nodes.map((item) => item.id)).not.toContain(first.id)
      expect(deleted.edges).toStrictEqual([])
      await activate(page, 'Undo')
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(2)
    })

    for (const [name, fixture, outputId, expected] of [
      ['base', baseWorkflowFixture, 'output', { kind: 'text', text: 'HELLO' }],
      [
        'AI',
        aiWorkflowFixture,
        'image-output',
        {
          kind: 'image',
          assetId: 'flow-local-green-256',
          mediaType: 'image/png',
          width: 256,
          height: 256,
        },
      ],
    ] as const) {
      it(`drives the identical ${name} fixture through keyboard import, layout, themes, save, reload and offline output`, async ({
        page,
      }) => {
        await page
          .getByLabel('Workflow JSON', { exact: true })
          .fill(JSON.stringify(fixture))
        await activate(page, 'Import workflow')
        await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(
          fixture.nodes.length
        )
        const accepted = await read(page)
        await activate(page, 'Layout and fit')
        await expect(
          page.getByLabel('Layout status', { exact: true })
        ).toHaveText('ELK layout complete')
        const arranged = await read(page)
        expect(arranged.nodes.map((node) => node.data)).toStrictEqual(
          accepted.nodes.map((node) => node.data)
        )
        expect(arranged.edges).toStrictEqual(accepted.edges)
        await page.emulateMedia({ colorScheme: 'dark' })
        const theme = page.getByLabel('Theme', { exact: true })
        await theme.selectOption('light')
        await expect(page.locator('html')).toHaveAttribute(
          'data-workflow-theme',
          'light'
        )
        await theme.selectOption('dark')
        await expect(page.locator('html')).toHaveAttribute(
          'data-workflow-theme',
          'dark'
        )
        await theme.selectOption('system')
        await expect(page.locator('html')).toHaveAttribute(
          'data-workflow-theme',
          'dark'
        )
        await activate(page, 'Export workflow')

        const encoded = await page
          .getByLabel('Saved workflow JSON', { exact: true })
          .inputValue()

        const saved = S.decodeUnknownSync(SavedWorkflowSchema)(
          JSON.parse(encoded)
        )

        expect(saved.theme).toBe('system')
        await page.reload()
        await expect(page.locator('#accepted')).toContainText('seed-edge')
        await page.getByLabel('Workflow JSON', { exact: true }).fill(encoded)
        await activate(page, 'Import workflow')
        await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(
          fixture.nodes.length
        )
        const restored = await read(page)
        expect(
          restored.nodes.map((node) => ({
            id: node.id,
            data: node.data,
            position: node.position,
            handles: node.handles,
          }))
        ).toStrictEqual(
          arranged.nodes.map((node) => ({
            id: node.id,
            data: node.data,
            position: node.position,
            handles: node.handles,
          }))
        )
        expect(restored.edges).toStrictEqual(arranged.edges)
        await activate(page, 'Run')

        try {
          await expect(
            page.getByLabel('Run status', { exact: true })
          ).toHaveText('Offline simulation: succeeded')
        } catch (error) {
          expect(await read(page)).toStrictEqual(restored)
          throw error
        }

        const state = S.decodeUnknownSync(WorkflowRunStateSchema)(
          JSON.parse((await page.locator('#run-state').textContent()) ?? 'null')
        )

        expect(state.nodes[outputId]).toMatchObject({
          state: 'succeeded',
          outputs: { result: expected },
        })
        await activate(page, `Configure ${outputId}`)

        if (name === 'AI') {
          const image = page.getByAltText('Local generated workflow image', {
            exact: true,
          })

          await expect(image).toBeVisible()
          await expect
            .poll(() =>
              image.evaluate((element: HTMLImageElement) => [
                element.naturalWidth,
                element.naturalHeight,
              ])
            )
            .toStrictEqual([256, 256])
        } else {
          await expect(
            page.getByLabel('Run output', { exact: true })
          ).toHaveValue('{"result":{"kind":"text","text":"HELLO"}}')
        }

        const afterRun = await read(page)
        expect(afterRun.nodes.map((node) => node.data)).toStrictEqual(
          restored.nodes.map((node) => node.data)
        )
      })
    }
  })
}
