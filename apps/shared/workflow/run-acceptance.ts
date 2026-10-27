import {
  baseWorkflowFixture,
  WorkflowRunStateSchema,
  WorkflowDocumentSchema,
} from '@flow/workflow'
import { expect, test as it } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema as S } from 'effect'

declare global {
  interface Window {
    workflowPendingEvaluations: number
    workflowScheduledEvaluations: number
  }
}

const read = async (page: Page) =>
  S.decodeUnknownSync(WorkflowDocumentSchema)(
    JSON.parse((await page.locator('#accepted').textContent()) ?? 'null')
  )

const runState = async (page: Page) =>
  S.decodeUnknownSync(WorkflowRunStateSchema)(
    JSON.parse((await page.locator('#run-state').textContent()) ?? 'null')
  )

export const workflowRunAcceptance = (host: string) => {
  it.describe(`${host} transient offline workflow runs`, () => {
    let unexpected: string[] = []
    let errors: string[] = []

    it.beforeEach(async ({ page, baseURL }) => {
      unexpected = []
      errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.route('**/*', async (route) => {
        if (
          new URL(route.request().url()).origin ===
          new URL(baseURL ?? '').origin
        ) {
          await route.continue()
        } else {
          unexpected.push(route.request().url())
          await route.abort()
        }
      })
      await page.routeWebSocket('**/*', (socket) => {
        if (new URL(socket.url()).host === new URL(baseURL ?? '').host) {
          socket.connectToServer()
        } else {
          unexpected.push(socket.url())
          void socket.close()
        }
      })
      await page.addInitScript(() => {
        const schedule = globalThis.setTimeout
        const cancel = globalThis.clearTimeout
        const pending = new Set<ReturnType<typeof setTimeout>>()
        window.workflowPendingEvaluations = 0
        window.workflowScheduledEvaluations = 0
        Reflect.set(
          globalThis,
          'setTimeout',
          (handler: () => void, delay: number) => {
            const timer = schedule(() => {
              pending.delete(timer)
              window.workflowPendingEvaluations = pending.size
              handler()
            }, delay)

            if (delay === 200) {
              pending.add(timer)
              window.workflowScheduledEvaluations += 1
              window.workflowPendingEvaluations = pending.size
            }

            return timer
          }
        )
        Reflect.set(
          globalThis,
          'clearTimeout',
          (timer: ReturnType<typeof setTimeout>) => {
            pending.delete(timer)
            window.workflowPendingEvaluations = pending.size
            cancel(timer)
          }
        )
      })
      await page.goto('/workflow/')
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(2)
    })

    it.afterEach(() => {
      expect(unexpected).toStrictEqual([])
      expect(errors).toStrictEqual([])
    })

    it('renders running and terminal node status and exact output without changing history', async ({
      page,
    }) => {
      await page
        .getByRole('button', { name: 'Load base workflow', exact: true })
        .click()
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(5)
      const before = await read(page)
      await page.getByRole('button', { name: 'Run', exact: true }).click()
      await expect(page.getByLabel('Run status', { exact: true })).toHaveText(
        'Offline simulation: running'
      )
      await expect(
        page.locator('[data-node-id="initial"]').first()
      ).toContainText('running')
      await expect(page.getByLabel('Run status', { exact: true })).toHaveText(
        'Offline simulation: succeeded'
      )
      await expect(
        page.locator('[data-node-id="output"]').first()
      ).toContainText('succeeded')
      const state = await runState(page)
      expect(state.nodes.output).toMatchObject({
        state: 'succeeded',
        outputs: { result: { kind: 'text', text: 'HELLO' } },
      })
      await page
        .getByRole('button', { name: 'Configure output', exact: true })
        .click()
      await expect(page.getByLabel('Run output', { exact: true })).toHaveValue(
        '{"result":{"kind":"text","text":"HELLO"}}'
      )
      expect(await read(page)).toStrictEqual(before)
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(2)
      await expect(page.getByLabel('Run status', { exact: true })).toHaveText(
        'Offline simulation. No active run.'
      )
      await page.getByRole('button', { name: 'Redo', exact: true }).click()
      await expect
        .poll(() => read(page).then((document) => document.nodes.length))
        .toBe(5)
    })

    it('cancels, reruns with a fresh identity, and invalidates on accepted configuration edits', async ({
      page,
    }) => {
      await page
        .getByRole('button', { name: 'Load base workflow', exact: true })
        .click()
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(5)
      await page.getByRole('button', { name: 'Run', exact: true }).click()
      await expect(
        page.getByLabel('Run status', { exact: true })
      ).toContainText('running')
      const first = await runState(page)
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(page.getByLabel('Run status', { exact: true })).toHaveText(
        'Offline simulation: cancelled'
      )
      const cancelled = await runState(page)
      expect(
        Object.values(cancelled.nodes).every(
          (node) => node.state === 'cancelled' || node.state === 'succeeded'
        )
      ).toBe(true)
      await expect
        .poll(() => page.evaluate(() => window.workflowPendingEvaluations))
        .toBe(0)
      await page.getByRole('button', { name: 'Run', exact: true }).click()
      await expect(
        page.getByLabel('Run status', { exact: true })
      ).toContainText('running')
      const rerun = await runState(page)
      expect(rerun.runId).not.toBe(first.runId)
      await page
        .getByRole('button', { name: 'Configure initial', exact: true })
        .click()
      await page.getByLabel('Value', { exact: true }).fill('changed')
      await page
        .getByRole('button', { name: 'Apply configuration', exact: true })
        .click()
      await expect(page.getByLabel('Run status', { exact: true })).toHaveText(
        'Offline simulation. No active run.'
      )
      await expect
        .poll(() => page.evaluate(() => window.workflowPendingEvaluations))
        .toBe(0)
      await page.getByRole('button', { name: 'Run', exact: true }).click()
      await expect(page.getByLabel('Run status', { exact: true })).toHaveText(
        'Offline simulation: succeeded'
      )
      const state = await runState(page)
      expect(state.nodes.output).toMatchObject({
        outputs: { result: { kind: 'text', text: 'CHANGED' } },
      })
    })

    it('shows typed failure and prevents invalid runs with visible reasons', async ({
      page,
    }) => {
      await page
        .getByRole('button', { name: 'Load AI workflow', exact: true })
        .click()
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(5)
      await page.getByRole('button', { name: 'Run', exact: true }).click()
      await expect(page.getByLabel('Run status', { exact: true })).toHaveText(
        'Offline simulation: failed'
      )
      const failed = await runState(page)
      expect(failed.nodes['generate-text']).toMatchObject({
        state: 'failed',
        failure: { code: 'unsupported-kind' },
      })
      await page
        .getByLabel('Workflow JSON', { exact: true })
        .fill(JSON.stringify({ ...baseWorkflowFixture, edges: [] }))
      await page
        .getByRole('button', { name: 'Import workflow', exact: true })
        .click()
      await expect(
        page.getByRole('button', { name: 'Run', exact: true })
      ).toBeDisabled()
      await expect(page.locator('#validation-report')).toContainText(
        'missing-input'
      )
    })

    it('preserves groups, trees, shapes, rotation, routes and bundles through a run and clipboard paste', async ({
      page,
    }) => {
      const fixture = {
        ...baseWorkflowFixture,
        nodes: [
          {
            id: 'group',
            label: 'Group',
            position: { x: 0, y: 0 },
            size: { width: 1400, height: 500 },
          },
          ...baseWorkflowFixture.nodes.map((node) => ({
            ...node,
            parentId: 'group',
            extent: 'parent',
            rotation: 35,
            data: {
              ...node.data,
              tree: { version: 1, kind: 'node', expanded: true },
            },
          })),
          {
            id: 'shape',
            label: 'Shape',
            type: 'shape',
            position: { x: 30, y: 350 },
            size: { width: 40, height: 40 },
            data: { type: 'diamond', color: '#ff0071' },
          },
        ],
        edges: baseWorkflowFixture.edges.map((edge) => ({
          ...edge,
          route: {
            mode: 'manual',
            points: [
              { x: 100, y: 100 },
              { x: 200, y: 200 },
            ],
          },
        })),
        bundles: [
          {
            id: 'branches',
            edgeIds: ['branch-true', 'branch-false'],
            ties: [{ x: 600, y: 100 }],
          },
        ],
      }

      await page
        .getByLabel('Workflow JSON', { exact: true })
        .fill(JSON.stringify(fixture))
      await page
        .getByRole('button', { name: 'Import workflow', exact: true })
        .click()
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(7)
      const before = await read(page)
      await page.getByRole('button', { name: 'Run', exact: true }).click()
      await expect(page.getByLabel('Run status', { exact: true })).toHaveText(
        'Offline simulation: succeeded'
      )
      const state = await runState(page)
      expect(state.nodes.output).toMatchObject({
        outputs: { result: { kind: 'text', text: 'HELLO' } },
      })
      expect(await read(page)).toStrictEqual(before)
      await page
        .getByRole('button', { name: 'Select all', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Copy selected', exact: true })
        .click()
      await page.getByRole('button', { name: 'Paste', exact: true }).click()
      await expect
        .poll(() => read(page).then((document) => document.nodes.length))
        .toBe(14)
      const pasted = await read(page)
      expect(
        pasted.nodes.filter((node) => node.data?.workflow !== undefined)
      ).toHaveLength(10)
      expect(pasted.nodes.filter((node) => node.rotation === 35)).toHaveLength(
        10
      )
      expect(pasted.bundles).toHaveLength(2)
      expect(JSON.stringify(pasted)).not.toContain('runId')
      await expect(page.getByLabel('Run status', { exact: true })).toHaveText(
        'Offline simulation. No active run.'
      )
    })

    it('disposes mid-run and removes every pending evaluator timer', async ({
      page,
    }) => {
      await page
        .getByRole('button', { name: 'Load base workflow', exact: true })
        .click()
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(5)
      await page.getByRole('button', { name: 'Run', exact: true }).click()
      await expect(
        page.getByLabel('Run status', { exact: true })
      ).toContainText('running')
      await expect
        .poll(() => page.evaluate(() => window.workflowPendingEvaluations))
        .toBeGreaterThan(0)
      expect(
        await page.evaluate(() => window.workflowScheduledEvaluations)
      ).toBeGreaterThan(0)
      await page.getByRole('button', { name: 'Dispose', exact: true }).click()
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(0)
      await expect(page.locator('#workflow-run')).toHaveCount(0)
      await expect
        .poll(() => page.evaluate(() => window.workflowPendingEvaluations))
        .toBe(0)
      await page.clock.install()

      const scheduled = await page.evaluate(
        () => window.workflowScheduledEvaluations
      )

      await page.clock.runFor(10_000)
      expect(
        await page.evaluate(() => window.workflowScheduledEvaluations)
      ).toBe(scheduled)
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(0)
    })
  })
}
