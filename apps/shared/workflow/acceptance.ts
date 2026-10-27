import {
  WorkflowDocumentSchema,
  workflowKinds,
  workflowPorts,
} from '@flow/workflow'
import type { WorkflowKind, WorkflowNodeData } from '@flow/workflow'
import { expect, test as it } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { Schema } from 'effect'

const read = async (page: Page) =>
  Schema.decodeUnknownSync(WorkflowDocumentSchema)(
    JSON.parse((await page.locator('#accepted').textContent()) ?? 'null')
  )

const nodes = (page: Page) => read(page).then((document) => document.nodes)

const edges = (page: Page) => read(page).then((document) => document.edges)

const configureKind = async (
  panel: Locator,
  kind: WorkflowKind
): Promise<WorkflowNodeData['config']> => {
  switch (kind) {
    case 'initial': {
      await panel.getByLabel('Value', { exact: true }).fill(' start ')

      return { value: ' start ' }
    }

    case 'transform': {
      await panel.getByLabel('Operation').selectOption('trim')

      return { operation: 'trim' }
    }

    case 'branch': {
      await panel.getByLabel('Operator').selectOption('contains')
      await panel.getByLabel('Compare value').fill('yes')

      return { operator: 'contains', value: 'yes' }
    }

    case 'join': {
      await panel.getByLabel('Separator').fill(' / ')

      return { separator: ' / ' }
    }

    case 'output': {
      await panel.getByLabel('Format').selectOption('image')

      return { format: 'image' }
    }

    case 'text-input': {
      await panel.getByLabel('Text', { exact: true }).fill('Delete Backspace z')
      await panel.getByLabel('Text lock').selectOption('true')

      return { text: 'Delete Backspace z', locked: true }
    }

    case 'generate-text': {
      await panel.getByLabel('Text model').selectOption('local-text')
      await panel.getByLabel('Temperature').selectOption('1')
      await panel.getByLabel('System').fill('Concise')
      await panel.getByLabel('Prompt', { exact: true }).fill('A tree')

      return {
        modelId: 'local-text',
        temperature: 1,
        system: 'Concise',
        prompt: 'A tree',
      }
    }

    case 'generate-image': {
      await panel.getByLabel('Image model').selectOption('local-image')
      await panel.getByLabel('Image size').selectOption('256x256')
      await panel.getByLabel('Image prompt').fill('A tree')

      return {
        modelId: 'local-image',
        width: 256,
        height: 256,
        prompt: 'A tree',
      }
    }

    case 'workflow-trigger': {
      await panel.getByLabel('Trigger label').fill('Go')

      return { label: 'Go' }
    }

    default: {
      const exhaustive: never = kind
      throw new Error(exhaustive)
    }
  }
}

export const workflowPaletteAcceptance = (
  host: 'vanilla' | 'vue' | 'foldkit'
) => {
  const { describe } = it
  describe(`${host} workflow palette`, () => {
    for (const kind of workflowKinds) {
      for (const keyboard of [false, true]) {
        it(`adds ${kind} by ${keyboard ? 'keyboard' : 'palette'} and configures it`, async ({
          page,
        }) => {
          const errors: string[] = []
          page.on('pageerror', (error) => errors.push(error.message))
          await page.route('**/*', (route) =>
            ['127.0.0.1', 'localhost'].includes(
              new URL(route.request().url()).hostname
            )
              ? route.continue()
              : (errors.push('Unexpected remote request'), route.abort())
          )
          await page.goto('/workflow/')
          await expect(page.locator('#accepted')).toContainText('seed-edge')

          const current = await read(page)
          const count = current.nodes.length

          const add = page.getByRole('button', {
            name: `Add ${kind}`,
            exact: true,
          })

          if (keyboard) {
            await add.focus()
            await page.keyboard.press('Enter')
          } else {
            await add.click()
          }

          await expect
            .poll(() => nodes(page).then((items) => items.length))
            .toBe(count + 1)
          const added = await read(page)
          const node = added.nodes.at(-1)

          if (node === undefined) {
            throw new Error('Missing added node')
          }

          expect(node.data?.workflow?.kind).toBe(kind)

          const wrapper = page.locator(
            `[data-testid="flow-node"][data-node-id="${node.id}"]`
          )

          await expect(wrapper).toBeAttached()
          await expect(wrapper.locator('.workflow-card')).toContainText(kind)
          await expect
            .poll(() =>
              wrapper
                .locator('[data-handle-id]')
                .evaluateAll((elements) =>
                  elements.map((element) => element.dataset.handleId).toSorted()
                )
            )
            .toStrictEqual(node.handles?.map((handle) => handle.id).toSorted())
          expect(node.handles?.map((handle) => handle.id)).toStrictEqual(
            node.data?.workflow === undefined
              ? []
              : workflowPorts(node.data.workflow).map((port) => port.id)
          )

          await page
            .getByRole('button', { name: `Configure ${node.id}`, exact: true })
            .click()
          const panel = page.locator('#configuration')

          const expected = await configureKind(panel, kind)

          const ports = node.data?.workflow?.ports
          const { position } = node
          await panel
            .getByRole('button', { name: 'Apply configuration' })
            .click()
          await expect
            .poll(() =>
              nodes(page).then(
                (items) =>
                  items.find((item) => item.id === node.id)?.data?.workflow
                    ?.config
              )
            )
            .toStrictEqual(expected)
          const configured = await read(page)
          expect(
            configured.nodes.find((item) => item.id === node.id)?.data?.workflow
              ?.ports
          ).toStrictEqual(ports)
          expect(
            configured.nodes.find((item) => item.id === node.id)?.position
          ).toStrictEqual(position)
          await expect(panel.getByLabel('Run output')).toHaveAttribute(
            'readonly',
            ''
          )

          if (kind === 'text-input') {
            await expect(
              panel.getByLabel('Text', { exact: true })
            ).toHaveAttribute('readonly', '')
            await panel.getByLabel('Text lock').selectOption('false')
            await panel
              .getByRole('button', { name: 'Apply configuration' })
              .click()
            await expect(
              panel.getByLabel('Text', { exact: true })
            ).not.toHaveAttribute('readonly', '')
            const beforeTyping = await read(page)
            await panel.getByLabel('Text', { exact: true }).focus()
            await page.keyboard.press('Backspace')
            await page.keyboard.press('Delete')
            await page.keyboard.press('ControlOrMeta+z')
            const afterTyping = await read(page)
            expect(
              afterTyping.nodes.map((item) => ({
                id: item.id,
                data: item.data,
                position: item.position,
              }))
            ).toStrictEqual(
              beforeTyping.nodes.map((item) => ({
                id: item.id,
                data: item.data,
                position: item.position,
              }))
            )
          }

          await page
            .getByRole('button', { name: 'Dispose', exact: true })
            .click()
          await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(0)
          expect(errors).toStrictEqual([])
        })
      }
    }

    it('preserves a false branch role through append, undo and delete/reconnect', async ({
      page,
    }) => {
      await page.goto('/workflow/')
      await page
        .getByRole('button', { name: 'Load base workflow', exact: true })
        .click()
      await expect.poll(() => nodes(page).then((items) => items.length)).toBe(5)
      const before = await read(page)
      await page
        .getByRole('button', {
          name: 'Append transform on branch-false',
          exact: true,
        })
        .click()
      await expect.poll(() => nodes(page).then((items) => items.length)).toBe(6)
      const appended = await read(page)
      const inserted = appended.nodes.at(-1)

      if (inserted === undefined) {
        throw new Error('Missing branch append')
      }

      expect(
        appended.edges.find((edge) => edge.id === 'branch-false')
      ).toMatchObject({
        source: 'branch',
        sourceHandle: 'no',
        target: inserted.id,
      })
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect
        .poll(() => edges(page))
        .toStrictEqual(
          before.edges.map((edge) => ({ ...edge, selected: false }))
        )
      await page.getByRole('button', { name: 'Redo', exact: true }).click()
      await expect.poll(() => nodes(page).then((items) => items.length)).toBe(6)
      await page
        .getByRole('button', { name: `Configure ${inserted.id}`, exact: true })
        .click()
      await page.getByRole('button', { name: 'Delete and reconnect' }).click()
      await expect.poll(() => nodes(page).then((items) => items.length)).toBe(5)
      const reconnected = await read(page)
      expect(reconnected.edges.at(-1)).toMatchObject({
        source: 'branch',
        sourceHandle: 'no',
        target: 'join',
        targetHandle: 'in',
      })
    })

    it('drops after pan/zoom, appends in one undo, deletes/reconnects and pastes remapped ports', async ({
      page,
    }) => {
      await page.goto('/workflow/')
      await expect(page.locator('#accepted')).toContainText('seed-edge')
      const before = await read(page)
      await page.getByRole('button', { name: 'Pan and zoom' }).click()
      const canvas = page.locator('#app')
      const bounds = await canvas.boundingBox()

      if (bounds === null) {
        throw new Error('Missing canvas')
      }

      await page
        .getByRole('button', { name: 'Add branch', exact: true })
        .dragTo(canvas, { targetPosition: { x: 300, y: 300 } })
      await expect.poll(() => nodes(page).then((items) => items.length)).toBe(3)
      const afterDrop = await read(page)
      const dropped = afterDrop.nodes.at(-1)
      expect(dropped?.position.x).toBeCloseTo((300 - 90) / 0.75, 1)
      expect(dropped?.position.y).toBeCloseTo((300 - 40) / 0.75, 1)
      await expect(
        page.locator(`[data-node-id="${dropped?.id}"] .workflow-card`)
      ).toContainText('true · false')
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect.poll(() => nodes(page).then((items) => items.length)).toBe(2)
      const beforeAppend = await read(page)
      await page
        .getByRole('button', {
          name: 'Insert transform on edge seed-edge',
          exact: true,
        })
        .click()
      await expect.poll(() => edges(page).then((items) => items.length)).toBe(2)
      const appended = await read(page)
      const inserted = appended.nodes.at(-1)

      if (inserted === undefined) {
        throw new Error('Missing append')
      }

      expect(appended.edges[0]).toMatchObject({
        id: 'seed-edge',
        source: before.edges[0]?.source,
        sourceHandle: before.edges[0]?.sourceHandle,
        target: inserted.id,
      })
      const edgeTestId = host === 'vanilla' ? 'flow-edge-group' : 'flow-edge'
      await expect(page.locator(`[data-testid="${edgeTestId}"]`)).toHaveCount(2)
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect.poll(() => edges(page)).toStrictEqual(beforeAppend.edges)
      await page.getByRole('button', { name: 'Redo', exact: true }).click()
      await expect.poll(() => nodes(page).then((items) => items.length)).toBe(3)
      await page
        .getByRole('button', { name: `Configure ${inserted.id}`, exact: true })
        .click()
      await page.getByRole('button', { name: 'Delete and reconnect' }).click()
      await expect.poll(() => nodes(page).then((items) => items.length)).toBe(2)
      const reconnected = await edges(page)
      expect(reconnected[0]).toMatchObject({
        source: before.edges[0]?.source,
        sourceHandle: before.edges[0]?.sourceHandle,
        target: before.edges[0]?.target,
        targetHandle: before.edges[0]?.targetHandle,
      })
      await page
        .getByRole('button', { name: 'Select all', exact: true })
        .click()
      await expect
        .poll(() =>
          nodes(page).then((items) => items.every((node) => node.selected))
        )
        .toBe(true)
      const source = await read(page)
      await page
        .getByRole('button', { name: 'Copy selected', exact: true })
        .click()
      await page.getByRole('button', { name: 'Paste', exact: true }).click()
      await expect.poll(() => nodes(page).then((items) => items.length)).toBe(4)
      const pasted = await read(page)
      expect(pasted.nodes.slice(0, 2).map((node) => node.data)).toStrictEqual(
        source.nodes.map((node) => node.data)
      )

      for (const node of pasted.nodes.slice(2)) {
        expect(node.handles?.map((handle) => handle.id)).toStrictEqual(
          node.data?.workflow === undefined
            ? []
            : workflowPorts(node.data.workflow).map((port) => port.id)
        )
        expect(source.nodes.some((original) => original.id === node.id)).toBe(
          false
        )
      }

      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(4)
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect.poll(() => nodes(page).then((items) => items.length)).toBe(2)
      await page
        .getByRole('button', { name: 'Select all', exact: true })
        .click()
      await expect
        .poll(() =>
          nodes(page).then((items) => items.every((node) => node.selected))
        )
        .toBe(true)
      await canvas.focus()
      await page.keyboard.press('ControlOrMeta+c')
      await page.keyboard.press('ControlOrMeta+v')
      await expect.poll(() => nodes(page).then((items) => items.length)).toBe(4)
      const keyboardPasted = await read(page)
      expect(
        keyboardPasted.nodes.slice(2).map((node) => node.data)
      ).toStrictEqual(pasted.nodes.slice(2).map((node) => node.data))
    })
  })
}
