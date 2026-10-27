import {
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

const saved = async (page: Page) =>
  S.decodeUnknownSync(SavedWorkflowSchema)(
    JSON.parse(
      await page.getByLabel('Saved workflow JSON', { exact: true }).inputValue()
    )
  )

const click = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click()

const output = async (page: Page) => {
  await click(page, 'Run')
  await expect(page.getByLabel('Run status', { exact: true })).toHaveText(
    'Offline simulation: succeeded'
  )

  const state = S.decodeUnknownSync(WorkflowRunStateSchema)(
    JSON.parse((await page.locator('#run-state').textContent()) ?? 'null')
  )

  expect(state.nodes.output).toMatchObject({
    state: 'succeeded',
    outputs: { result: { kind: 'text', text: 'HELLO' } },
  })
  await click(page, 'Configure output')
  await expect(page.getByLabel('Run output', { exact: true })).toHaveValue(
    '{"result":{"kind":"text","text":"HELLO"}}'
  )
}

const attachments = (page: Page) =>
  page.evaluate(() => {
    const violations: string[] = []
    const json = document.querySelector('#accepted')?.textContent

    if (json === undefined || json === null) {
      throw new Error('Missing accepted document')
    }

    const accepted: {
      nodes: { id: string; handles: { id: string; side: string }[] }[]
      edges: {
        id: string
        source: string
        target: string
        sourceHandle: string
        targetHandle: string
      }[]
    } = JSON.parse(json)

    for (const edge of accepted.edges) {
      const group = document.querySelector(
        `[data-edge-id="${CSS.escape(edge.id)}"]`
      )

      const path =
        group?.querySelector('[data-testid="flow-edge-path"]') ??
        group?.querySelector('path')

      if (!(path instanceof SVGPathElement)) {
        violations.push(`missing edge ${edge.id}`)
        continue
      }

      for (const [node, handle, length] of [
        [edge.source, edge.sourceHandle, 0],
        [edge.target, edge.targetHandle, path.getTotalLength()],
      ] as const) {
        const element = document.querySelector(
          `[data-testid="flow-node"][data-node-id="${CSS.escape(node)}"] [data-handle-id="${CSS.escape(handle)}"]`
        )

        const rect = element?.getBoundingClientRect()
        const matrix = path.getScreenCTM()

        if (rect === undefined || matrix === null) {
          violations.push(`missing handle ${node} ${handle}`)
          continue
        }

        const point = path.getPointAtLength(length).matrixTransform(matrix)

        const side = accepted.nodes
          .find((item) => item.id === node)
          ?.handles.find((item) => item.id === handle)?.side

        let x = rect.x + rect.width / 2
        let y = rect.y + rect.height / 2

        switch (side) {
          case 'right': {
            x = rect.right
            break
          }

          case 'left': {
            x = rect.left
            break
          }

          case 'top': {
            y = rect.top
            break
          }

          case 'bottom': {
            y = rect.bottom
            break
          }

          default: {
            violations.push(`missing side ${node} ${handle}`)
          }
        }

        if (Math.hypot(point.x - x, point.y - y) > 2) {
          violations.push(`detached ${edge.id} ${handle}`)
        }
      }
    }

    return violations
  })

export const workflowEditorAcceptance = (
  host: 'vanilla' | 'vue' | 'foldkit'
) => {
  const { describe } = it
  describe(`${host} complete base workflow editor`, () => {
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
      await page.goto('/workflow/')
      await expect(page.locator('#accepted')).toContainText('seed-edge')
    })
    it.afterEach(({ page }) => {
      expect(failures.get(page)).toStrictEqual([])
    })

    it('adds, configures, validates, simulates, lays out, exports, reloads and restores the same fixture', async ({
      page,
    }) => {
      await click(page, 'Load base workflow')
      await click(page, 'Insert transform on edge initial-transform')
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(6)
      const appended = await read(page)
      const inserted = appended.nodes.at(-1)

      if (inserted === undefined) {
        throw new Error('Missing appended transform')
      }

      await click(page, `Configure ${inserted.id}`)
      await page.getByLabel('Operation', { exact: true }).selectOption('trim')
      await click(page, 'Apply configuration')
      await click(page, 'Configure initial')
      await page.getByLabel('Value', { exact: true }).fill(' hello ')
      await click(page, 'Apply configuration')
      await expect(page.getByLabel('Value', { exact: true })).toBeFocused()
      await expect(page.locator('#validation-report')).toContainText(
        '"issues":[]'
      )
      await output(page)
      const before = await read(page)
      await click(page, 'Layout and fit')
      await expect(
        page.getByLabel('Layout status', { exact: true })
      ).toHaveText('ELK layout complete')
      const arranged = await read(page)
      expect(
        arranged.nodes.map((node) => ({
          id: node.id,
          data: node.data,
          handles: node.handles,
        }))
      ).toStrictEqual(
        before.nodes.map((node) => ({
          id: node.id,
          data: node.data,
          handles: node.handles,
        }))
      )
      expect(arranged.edges).toStrictEqual(before.edges)

      const overlap = await page
        .locator('[data-testid="flow-node"]')
        .evaluateAll((elements) =>
          elements.flatMap((node, index) => {
            const a = node.getBoundingClientRect()

            return elements
              .slice(index + 1)
              .filter((other) => {
                const b = other.getBoundingClientRect()

                return (
                  Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 &&
                  Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1
                )
              })
              .map(() => 'overlap')
          })
        )

      expect(overlap).toStrictEqual([])
      await expect.poll(() => attachments(page)).toStrictEqual([])
      await click(page, 'Undo')
      await expect
        .poll(() =>
          read(page).then((document) =>
            document.nodes.map((node) => node.position)
          )
        )
        .toStrictEqual(before.nodes.map((node) => node.position))
      await click(page, 'Undo')
      await expect
        .poll(() =>
          read(page).then(
            (document) =>
              document.nodes.find((node) => node.id === 'initial')?.data
                ?.workflow?.config
          )
        )
        .toStrictEqual({ value: 'hello' })
      await click(page, 'Redo')
      await click(page, 'Redo')
      await page.getByLabel('Theme', { exact: true }).selectOption('dark')
      await expect(page.locator('html')).toHaveAttribute(
        'data-workflow-theme',
        'dark'
      )
      await expect(page.locator('body')).toHaveCSS(
        'background-color',
        'rgb(23, 42, 58)'
      )
      await expect(
        page.locator('#app [data-color-mode]').first()
      ).toHaveAttribute('data-color-mode', 'dark')
      await output(page)
      await click(page, 'Export workflow')
      const exported = await saved(page)
      expect(
        exported.graph.document.nodes.map((node) => ({
          id: node.id,
          data: node.data,
        }))
      ).toStrictEqual(
        arranged.nodes.map((node) => ({ id: node.id, data: node.data }))
      )
      expect(JSON.stringify(exported)).not.toMatch(
        /runId|outputs|measurementStatus|credentials|provider/u
      )
      await page.reload()
      await expect(page.locator('#accepted')).toContainText('seed-edge')
      await page
        .getByLabel('Workflow JSON', { exact: true })
        .fill(JSON.stringify(exported))
      await click(page, 'Import workflow')
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(6)
      const restored = await read(page)
      expect(
        restored.nodes.map((node) => ({
          id: node.id,
          position: node.position,
          data: node.data,
          handles: node.handles,
        }))
      ).toStrictEqual(
        arranged.nodes.map((node) => ({
          id: node.id,
          position: node.position,
          data: node.data,
          handles: node.handles,
        }))
      )
      expect(restored.edges).toStrictEqual(arranged.edges)
      await expect(page.getByLabel('Theme', { exact: true })).toHaveValue(
        'dark'
      )
      await click(page, 'Fit workflow')
      await expect.poll(() => attachments(page)).toStrictEqual([])
      await output(page)
      await click(page, 'Export workflow')
      expect(await saved(page)).toStrictEqual(exported)
    })

    it('rejects malformed saves atomically and keeps theme, history and configuration intact', async ({
      page,
    }) => {
      await click(page, 'Load base workflow')
      await page.getByLabel('Theme', { exact: true }).selectOption('dark')
      await click(page, 'Export workflow')
      const exported = await saved(page)
      const before = await read(page)

      const rejectImport = async (input: string) => {
        await page.getByLabel('Workflow JSON', { exact: true }).fill(input)
        await click(page, 'Import workflow')
        await expect(page.locator('#status')).toContainText('Rejected')
        expect(await read(page)).toStrictEqual(before)
        await expect(page.getByLabel('Theme', { exact: true })).toHaveValue(
          'dark'
        )
      }

      await rejectImport('{')
      await rejectImport(JSON.stringify({ ...exported, version: 99 }))
      await rejectImport(JSON.stringify({ ...exported, workflowVersion: 99 }))
      await rejectImport(
        JSON.stringify({
          ...exported,
          graph: {
            version: 1,
            document: {
              nodes: [],
              edges: [{ id: 'bad', source: 'missing', target: 'missing' }],
            },
          },
          theme: 'light',
        })
      )

      await click(page, 'Undo')
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(2)
    })

    it('keeps keyboard configuration and theme controls usable on a narrow screen', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      const add = page.getByRole('button', { name: 'Add initial', exact: true })
      await add.focus()
      await add.press('Enter')
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(3)
      const current = await read(page)
      const node = current.nodes.at(-1)
      await click(page, `Configure ${node?.id}`)
      const value = page.getByLabel('Value', { exact: true })
      await value.fill('Keyboard input')
      await value.press('ControlOrMeta+z')
      await value.fill('Keyboard input')
      await click(page, 'Apply configuration')
      await expect(value).toBeFocused()
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(3)
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.getByLabel('Theme', { exact: true }).selectOption('system')
      await expect(page.locator('html')).toHaveAttribute(
        'data-workflow-theme',
        'dark'
      )
      await expect(page.locator('body')).toHaveCSS(
        'background-color',
        'rgb(23, 42, 58)'
      )
      await page.emulateMedia({ colorScheme: 'light' })
      await expect(page.locator('html')).toHaveAttribute(
        'data-workflow-theme',
        'light'
      )
      await expect(page.locator('body')).toHaveCSS(
        'background-color',
        'rgb(248, 250, 252)'
      )

      const width = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }))

      expect(width.scroll).toBeLessThanOrEqual(width.client)
      await click(page, 'Undo')
      await expect
        .poll(() =>
          read(page).then(
            (document) => document.nodes.at(-1)?.data?.workflow?.config
          )
        )
        .toStrictEqual({ value: '' })
    })
  })
}
