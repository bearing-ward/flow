import {
  WorkflowDocumentSchema,
  baseWorkflowFixture,
  WorkflowValidationReportSchema,
} from '@flow/workflow'
import { expect, test as it } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema as S } from 'effect'

const browserFailures = new WeakMap<Page, string[]>()

const read = async (page: Page) =>
  S.decodeUnknownSync(WorkflowDocumentSchema)(
    JSON.parse((await page.locator('#accepted').textContent()) ?? '')
  )

const report = async (page: Page) =>
  S.decodeUnknownSync(WorkflowValidationReportSchema)(
    JSON.parse((await page.locator('#validation-report').textContent()) ?? '')
  )

const meaning = async (page: Page) => {
  const document = await read(page)

  return {
    nodes: document.nodes.map((node) => ({ id: node.id, data: node.data })),
    edges: document.edges,
  }
}

const choose = async (
  page: Page,
  source: string,
  sourcePort: string,
  target: string,
  targetPort: string
) => {
  await page
    .getByLabel('Source port', { exact: true })
    .selectOption(JSON.stringify([source, sourcePort]))
  await page
    .getByLabel('Target port', { exact: true })
    .selectOption(JSON.stringify([target, targetPort]))
  await page.getByRole('button', { name: 'Connect ports', exact: true }).click()
}

export const workflowValidationAcceptance = (
  host: 'vanilla' | 'vue' | 'foldkit'
) => {
  const { describe } = it
  describe(`${host} workflow validation`, () => {
    it.beforeEach(async ({ page }) => {
      const failures: string[] = []
      browserFailures.set(page, failures)
      page.on('pageerror', (error) => failures.push(error.message))
      await page.route('**/*', (route) => {
        const requestHost = new URL(route.request().url()).hostname

        if (['127.0.0.1', 'localhost'].includes(requestHost)) {
          return route.continue()
        }

        failures.push(`Unexpected network request to ${requestHost}`)

        return route.abort('blockedbyclient')
      })
      await page.goto('/workflow/')
      await expect(page.locator('#accepted')).toContainText('seed-edge')
    })

    it.afterEach(({ page }) => {
      expect(browserFailures.get(page)).toStrictEqual([])
    })

    it('blocks invalid preparation, focuses a missing port by keyboard, connects and undoes', async ({
      page,
    }) => {
      await page
        .getByRole('button', { name: 'Add transform', exact: true })
        .click()
      await expect
        .poll(() => read(page).then((document) => document.nodes.length))
        .toBe(3)
      const current = await read(page)
      const node = current.nodes.at(-1)

      if (node?.data?.workflow?.kind !== 'transform') {
        throw new Error('Missing transform')
      }

      const expected = [
        {
          code: 'missing-input',
          nodeId: node.id,
          portId: node.data.workflow.ports.input,
        },
        { code: 'unreachable-node', nodeId: node.id },
      ]

      await expect
        .poll(() => report(page).then(({ issues }) => issues))
        .toStrictEqual(expected)
      await expect(
        page.getByRole('button', { name: 'Prepare run' })
      ).toHaveAttribute('aria-disabled', 'true')

      await expect(page.getByLabel('Execution preparation')).toHaveText(
        'Run blocked. Resolve the workflow issues.'
      )
      await page
        .getByRole('button', { name: JSON.stringify(expected[0]), exact: true })
        .focus()
      await page.keyboard.press('Enter')
      await expect(
        page.getByLabel('Target port', { exact: true })
      ).toBeFocused()

      const connectedDocument = await read(page)

      const initial = connectedDocument.nodes.find(
        (item) => item.data?.workflow?.kind === 'initial'
      )

      if (initial?.data?.workflow?.kind !== 'initial') {
        throw new Error('Missing initial')
      }

      await choose(
        page,
        initial.id,
        initial.data.workflow.ports.output,
        node.id,
        node.data.workflow.ports.input
      )
      await expect
        .poll(() => report(page).then(({ issues }) => issues))
        .toStrictEqual([])
      await page.getByRole('button', { name: 'Prepare run' }).click()
      await expect(page.getByLabel('Execution preparation')).toContainText(
        node.id
      )
      await expect(page.getByLabel('Execution preparation')).toContainText(
        'settle-all-use-active'
      )

      const prepared = await page
        .getByLabel('Execution preparation')
        .textContent()

      await page
        .getByRole('button', { name: 'Pan and zoom', exact: true })
        .click()
      await expect(page.getByLabel('Execution preparation')).toHaveText(
        prepared ?? ''
      )
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect
        .poll(() => report(page).then(({ issues }) => issues))
        .toStrictEqual(expected)
      await expect(page.getByLabel('Execution preparation')).toHaveText(
        'Run blocked. Resolve the workflow issues.'
      )
    })

    it('focuses an invalid setting, clears it only after acceptance, and agrees with import validation', async ({
      page,
    }) => {
      await page
        .getByRole('button', { name: 'Load base workflow', exact: true })
        .click()
      await expect
        .poll(() => read(page).then((document) => document.nodes.length))
        .toBe(5)
      await page
        .getByRole('button', { name: 'Configure branch', exact: true })
        .click()
      await page
        .getByRole('combobox', { name: 'Operator', exact: true })
        .selectOption('contains')
      await page.getByLabel('Compare value', { exact: true }).fill('')
      await page
        .getByRole('button', { name: 'Apply configuration', exact: true })
        .click()

      const issue = {
        code: 'invalid-setting',
        nodeId: 'branch',
        field: 'value',
      }

      await expect
        .poll(() => report(page).then(({ issues }) => issues))
        .toStrictEqual([issue])
      await page
        .getByRole('button', { name: JSON.stringify(issue), exact: true })
        .focus()
      await page.keyboard.press('Enter')
      const input = page.getByLabel('Compare value', { exact: true })
      await expect(input).toBeFocused()
      await expect(input).toHaveAttribute('aria-invalid', 'true')
      const invalidDocument = await read(page)
      const beforeImport = await report(page)
      await page
        .getByLabel('Workflow JSON', { exact: true })
        .fill(JSON.stringify(invalidDocument))
      await page
        .getByRole('button', { name: 'Import workflow', exact: true })
        .click()
      await expect(page.locator('#status')).toHaveText('Accepted edit')
      await expect.poll(() => report(page)).toStrictEqual(beforeImport)
      await page
        .getByRole('button', { name: JSON.stringify(issue), exact: true })
        .click()
      await input.fill('HELLO')
      expect(await report(page).then(({ issues }) => issues)).toStrictEqual([
        issue,
      ])
      await page
        .getByRole('button', { name: 'Apply configuration', exact: true })
        .click()
      await expect
        .poll(() => report(page).then(({ issues }) => issues))
        .toStrictEqual([])
      await expect(input).toHaveAttribute('aria-invalid', 'false')
      await page.getByRole('button', { name: 'Prepare run' }).click()
      await expect(page.getByLabel('Execution preparation')).toContainText(
        '"nodeIds":["initial","transform","branch","join","output"]'
      )
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect
        .poll(() => report(page).then(({ issues }) => issues))
        .toStrictEqual([issue])
    })

    it('rejects a typed mismatch without document or history changes, and creates trigger edges', async ({
      page,
    }) => {
      await page
        .getByRole('button', { name: 'Load AI workflow', exact: true })
        .click()
      await expect
        .poll(() => read(page).then((document) => document.nodes.length))
        .toBe(5)
      const before = await meaning(page)
      await choose(page, 'generate-image', 'image', 'generate-text', 'system')
      await expect(page.locator('#status')).toContainText('incompatible-ports')
      expect(await meaning(page)).toStrictEqual(before)
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect
        .poll(() => read(page).then((document) => document.nodes.length))
        .toBe(2)
      await page.getByRole('button', { name: 'Redo', exact: true }).click()
      await expect
        .poll(() => read(page).then((document) => document.nodes.length))
        .toBe(5)
      const ai = await read(page)
      await page.getByLabel('Workflow JSON', { exact: true }).fill(
        JSON.stringify({
          ...ai,
          edges: ai.edges.filter((edge) => edge.id !== 'trigger-text'),
        })
      )
      await page
        .getByRole('button', { name: 'Import workflow', exact: true })
        .click()
      await expect
        .poll(() => report(page).then(({ issues }) => issues))
        .toStrictEqual([
          { code: 'missing-input', nodeId: 'generate-text', portId: 'start' },
        ])
      await choose(page, 'trigger', 'start', 'generate-text', 'start')
      await expect
        .poll(() => report(page).then(({ issues }) => issues))
        .toStrictEqual([])
      expect(
        await read(page).then(
          (document) => document.edges.at(-1)?.data?.workflow
        )
      ).toStrictEqual({
        version: 1,
        kind: 'trigger',
      })
    })

    it('preserves document extensions through import, preparation and history', async ({
      page,
    }) => {
      const workflow = {
        ...baseWorkflowFixture,
        nodeOrigin: [0.5, 0.5],
        nodes: [
          {
            id: 'group',
            label: 'Group',
            position: { x: 0, y: 0 },
            size: { width: 1600, height: 600 },
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
        .fill(JSON.stringify(workflow))
      await page
        .getByRole('button', { name: 'Import workflow', exact: true })
        .click()
      await expect(page.locator('#accepted')).toContainText('branches')
      const imported = await read(page)
      expect({
        bundles: imported.bundles,
        nodeOrigin: imported.nodeOrigin,
        nodes: imported.nodes.map((node) => ({
          id: node.id,
          parentId: node.parentId,
          rotation: node.rotation,
          data: node.data,
        })),
        routes: imported.edges.map((edge) => edge.route),
      }).toStrictEqual({
        bundles: workflow.bundles,
        nodeOrigin: workflow.nodeOrigin,
        nodes: workflow.nodes.map((node) => ({
          id: node.id,
          parentId: 'parentId' in node ? node.parentId : undefined,
          rotation: 'rotation' in node ? node.rotation : undefined,
          data: 'data' in node ? node.data : undefined,
        })),
        routes: workflow.edges.map((edge) => edge.route),
      })
      await expect
        .poll(() => report(page).then(({ issues }) => issues))
        .toStrictEqual([])
      await page.getByRole('button', { name: 'Prepare run' }).click()
      await expect(page.getByLabel('Execution preparation')).toContainText(
        '"nodeIds":["initial","transform","branch","join","output"]'
      )
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect
        .poll(() => read(page).then((document) => document.nodes.length))
        .toBe(2)
      await page.getByRole('button', { name: 'Redo', exact: true }).click()
      await expect
        .poll(() => read(page).then((document) => document.bundles))
        .toStrictEqual(workflow.bundles)
    })

    it('rejects cyclic connections and malformed imports before replacing accepted state', async ({
      page,
    }) => {
      await page
        .getByRole('button', { name: 'Load base workflow', exact: true })
        .click()
      await expect
        .poll(() => read(page).then((document) => document.nodes.length))
        .toBe(5)
      const base = await read(page)
      await page.getByLabel('Workflow JSON', { exact: true }).fill(
        JSON.stringify({
          ...base,
          edges: base.edges.filter((edge) => edge.id !== 'initial-transform'),
        })
      )
      await page
        .getByRole('button', { name: 'Import workflow', exact: true })
        .click()
      await expect
        .poll(() => report(page).then(({ issues }) => issues.length))
        .toBe(5)
      const before = await meaning(page)
      await choose(page, 'join', 'out', 'transform', 'in')
      await expect(page.locator('#status')).toContainText(
        '"nodeIds":["branch","join","transform"]'
      )
      expect(await meaning(page)).toStrictEqual(before)
      await page
        .getByLabel('Workflow JSON', { exact: true })
        .fill('{"nodes":"bad"}')
      await page
        .getByRole('button', { name: 'Import workflow', exact: true })
        .click()
      await expect(page.locator('#status')).toHaveText(
        'Rejected document. Invalid document encoding or settings.'
      )
      expect(await meaning(page)).toStrictEqual(before)
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect
        .poll(() => report(page).then(({ issues }) => issues))
        .toStrictEqual([])
      await page.getByRole('button', { name: 'Dispose', exact: true }).click()
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(0)
    })
  })
}
