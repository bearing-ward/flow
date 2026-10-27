import { WorkflowDocumentSchema, WorkflowRunStateSchema } from '@flow/workflow'
import { expect, test as it } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema as S } from 'effect'

declare global {
  interface Window {
    workflowAiPending: number
  }
}

const trackLocalTimers = () => {
  const schedule = globalThis.setTimeout
  const cancel = globalThis.clearTimeout
  const timers = new Set<ReturnType<typeof setTimeout>>()
  window.workflowAiPending = 0
  Reflect.set(
    globalThis,
    'setTimeout',
    (handler: () => void, delay: number) => {
      const timer = schedule(() => {
        timers.delete(timer)
        window.workflowAiPending = timers.size
        handler()
      }, delay)

      if (delay === 200 || delay === 250) {
        timers.add(timer)
        window.workflowAiPending = timers.size
      }

      return timer
    }
  )
  Reflect.set(
    globalThis,
    'clearTimeout',
    (timer: ReturnType<typeof setTimeout>) => {
      timers.delete(timer)
      window.workflowAiPending = timers.size
      cancel(timer)
    }
  )
}

const pauseGenerationClock = async (page: Page) => {
  await page.clock.install()
  const pause = await page.evaluate(() => Date.now() + 1000)
  await page.clock.pauseAt(pause)
  await page.evaluate(trackLocalTimers)
}

const click = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click()

const read = async (page: Page) =>
  S.decodeUnknownSync(WorkflowDocumentSchema)(
    JSON.parse((await page.locator('#accepted').textContent()) ?? 'null')
  )

const state = async (page: Page) =>
  S.decodeUnknownSync(WorkflowRunStateSchema)(
    JSON.parse((await page.locator('#run-state').textContent()) ?? 'null')
  )

const status = (page: Page) => page.getByLabel('Run status', { exact: true })

const connect = async (page: Page, source: string, target: string) => {
  await page
    .getByLabel('Source port', { exact: true })
    .selectOption({ label: source })
  await page
    .getByLabel('Target port', { exact: true })
    .selectOption({ label: target })
  await click(page, 'Connect ports')
}

export const workflowAiEditorAcceptance = (host: string) => {
  const { describe } = it
  describe(`${host} integrated offline AI editor A1-A8`, () => {
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
          errors.push(`Unexpected network ${route.request().url()}`)
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
      await page.addInitScript(trackLocalTimers)
      await page.goto('/workflow/')
      await expect(page.locator('#accepted')).toContainText('seed-edge')
    })
    it.afterEach(({ page }) => {
      expect(failures.get(page)).toStrictEqual([])
    })

    it('drops every AI kind after pan/zoom, edits prompts and supported settings, and connects system/prompt/trigger/image ports', async ({
      page,
    }) => {
      await click(page, 'Pan and zoom')

      const drop = async (kind: string) => {
        const transfer = await page.evaluateHandle((value) => {
          const data = new DataTransfer()
          data.setData('application/x-flow-workflow', value)

          return data
        }, kind)

        const bounds = await page.locator('#app').boundingBox()

        if (bounds === null) {
          throw new Error('Missing canvas')
        }

        await page.locator('#app').dispatchEvent('drop', {
          dataTransfer: transfer,
          clientX: bounds.x + 180,
          clientY: bounds.y + 180,
        })
        await transfer.dispose()
      }

      await drop('text-input')
      await drop('generate-text')
      await drop('generate-image')
      await drop('workflow-trigger')
      await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(6)
      const dropped = await read(page)
      expect(
        dropped.nodes.slice(2).map((node) => node.data?.workflow?.kind)
      ).toStrictEqual([
        'text-input',
        'generate-text',
        'generate-image',
        'workflow-trigger',
      ])

      for (const node of dropped.nodes.slice(2)) {
        expect(node.position.x).toBeCloseTo(120)
        expect(node.position.y).toBeCloseTo(186.6667, 2)
      }

      await click(page, 'Load AI workflow')
      const fixture = await read(page)
      await page
        .getByLabel('Workflow JSON', { exact: true })
        .fill(JSON.stringify({ ...fixture, edges: [] }))
      await click(page, 'Import workflow')
      await connect(page, 'trigger output', 'generate-text trigger')
      await connect(page, 'trigger output', 'generate-image trigger')
      await connect(page, 'text output', 'generate-text prompt')
      await connect(page, 'generate-text output', 'generate-image prompt')
      await connect(page, 'generate-image image', 'image-output input')
      await click(page, 'Configure text')
      await page.getByLabel('Text', { exact: true }).fill('A river')
      await click(page, 'Apply configuration')
      await click(page, 'Configure generate-text')
      const before = await read(page)
      await page.getByLabel('System', { exact: true }).fill('Be concise')
      await page.getByLabel('Prompt', { exact: true }).fill('Inline fallback')
      await page
        .getByLabel('Text model', { exact: true })
        .selectOption('local-text')
      await page.getByLabel('Temperature', { exact: true }).selectOption('1')
      expect(
        await page
          .getByLabel('Temperature', { exact: true })
          .locator('option')
          .allTextContents()
      ).toStrictEqual(['0', '1'])
      await click(page, 'Apply configuration')
      const configured = await read(page)
      expect(configured.nodes.map((node) => node.position)).toStrictEqual(
        before.nodes.map((node) => node.position)
      )
      expect(
        configured.nodes.find((node) => node.id === 'generate-text')?.data
          ?.workflow?.config
      ).toStrictEqual({
        modelId: 'local-text',
        temperature: 1,
        system: 'Be concise',
        prompt: 'Inline fallback',
      })
      await connect(page, 'text output', 'generate-text system')
      await click(page, 'Configure generate-image')
      await page
        .getByLabel('Image model', { exact: true })
        .selectOption('local-image')
      await page
        .getByLabel('Image size', { exact: true })
        .selectOption('256x256')
      await page
        .getByLabel('Image prompt', { exact: true })
        .fill('Image fallback')
      await click(page, 'Apply configuration')
      await expect(page.locator('#validation-report')).toContainText(
        '"issues":[]'
      )
      await click(page, 'Configure generate-text')
      await pauseGenerationClock(page)
      await click(page, 'Run')
      await page.clock.runFor(850)
      await expect(page.getByLabel('Run output', { exact: true })).toHaveValue(
        'A '
      )
      await page.clock.runFor(250)
      await expect(page.getByLabel('Run output', { exact: true })).toHaveValue(
        'A quiet '
      )
      await page.clock.runFor(2000)
      await expect(status(page)).toHaveText('Offline simulation: succeeded')
      await expect(page.getByLabel('Run output', { exact: true })).toHaveValue(
        '{"output":{"kind":"text","text":"A quiet tree."}}'
      )
      await click(page, 'Configure generate-image')

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
      await expect(
        page.locator('[data-node-id="generate-image"]').first()
      ).toContainText('succeeded')
      const completed = await state(page)
      expect(completed.nodes['image-output']).toMatchObject({
        state: 'succeeded',
        outputs: { result: { kind: 'image', assetId: 'flow-local-green-256' } },
      })
      await expect(
        page.getByText('Offline provider: flow-local.', { exact: false })
      ).toBeVisible()
      expect(await page.locator('input[type="password"]').count()).toBe(0)
      await page.clock.resume()
      await click(page, 'Export workflow')

      const saved = await page
        .getByLabel('Saved workflow JSON', { exact: true })
        .inputValue()

      expect(saved).not.toMatch(/runId|outputs|credentials|apiKey|provider/u)
      await page.reload()
      await page.getByLabel('Workflow JSON', { exact: true }).fill(saved)
      await click(page, 'Import workflow')
      await click(page, 'Run')
      await expect(status(page)).toHaveText('Offline simulation: succeeded')
      await click(page, 'Configure generate-image')
      await expect(
        page.getByAltText('Local generated workflow image')
      ).toBeVisible()
    })

    it('blocks unsupported imported provider settings, focuses their controls and accepts supported repairs', async ({
      page,
    }) => {
      await click(page, 'Load AI workflow')
      const before = await read(page)

      const unsupported = {
        ...before,
        nodes: before.nodes.map((node) => {
          const workflow = node.data?.workflow

          if (workflow?.kind === 'generate-text') {
            return {
              ...node,
              data: {
                ...node.data,
                workflow: {
                  ...workflow,
                  config: {
                    ...workflow.config,
                    modelId: 'unsupported',
                    temperature: 0.5,
                  },
                },
              },
            }
          }

          if (workflow?.kind === 'generate-image') {
            return {
              ...node,
              data: {
                ...node.data,
                workflow: {
                  ...workflow,
                  config: { ...workflow.config, width: 512 },
                },
              },
            }
          }

          return node
        }),
      }

      await page
        .getByLabel('Workflow JSON', { exact: true })
        .fill(JSON.stringify(unsupported))
      await click(page, 'Import workflow')
      await expect(
        page.getByRole('button', { name: 'Run', exact: true })
      ).toBeDisabled()
      await click(
        page,
        '{"code":"invalid-setting","nodeId":"generate-text","field":"modelId"}'
      )
      await expect(page.getByLabel('Text model', { exact: true })).toBeFocused()
      await page
        .getByLabel('Text model', { exact: true })
        .selectOption('local-text')
      await page.getByLabel('Temperature', { exact: true }).selectOption('1')
      await click(page, 'Apply configuration')
      await click(
        page,
        '{"code":"invalid-setting","nodeId":"generate-image","field":"size"}'
      )
      await expect(page.getByLabel('Image size', { exact: true })).toBeFocused()
      await page
        .getByLabel('Image size', { exact: true })
        .selectOption('256x256')
      await click(page, 'Apply configuration')
      await expect(page.locator('#validation-report')).toContainText(
        '"issues":[]'
      )
      await expect(
        page.getByRole('button', { name: 'Run', exact: true })
      ).toBeEnabled()
    })

    for (const fail of ['text', 'image']) {
      it(`shows typed local ${fail} failure and permits rerun`, async ({
        page,
      }) => {
        await page.goto(`/workflow/?local-failure=${fail}`)
        await click(page, 'Load AI workflow')
        await click(page, `Configure generate-${fail}`)
        await click(page, 'Run')
        await expect(status(page)).toHaveText('Offline simulation: failed')
        await expect(
          page.getByLabel('Run output', { exact: true })
        ).toHaveValue('Failed: provider-failure')
        const first = await state(page)
        expect(first.nodes[`generate-${fail}`]).toMatchObject({
          state: 'failed',
          failure: { code: 'provider-failure' },
        })
        await click(page, 'Run')
        await expect(status(page)).toHaveText('Offline simulation: failed')
        const rerun = await state(page)
        expect(rerun.runId).not.toBe(first.runId)
      })
    }

    it('cancels streaming text and pending image, reruns with a fresh identity, clears previews on edits and disposes listeners', async ({
      page,
    }) => {
      await click(page, 'Load AI workflow')
      await click(page, 'Configure generate-text')
      await pauseGenerationClock(page)
      await click(page, 'Run')
      await page.clock.runFor(850)
      await expect(page.getByLabel('Run output', { exact: true })).toHaveValue(
        'A '
      )
      await click(page, 'Cancel')
      await expect(status(page)).toHaveText('Offline simulation: cancelled')
      const first = await state(page)
      await expect
        .poll(() => page.evaluate(() => window.workflowAiPending))
        .toBe(0)
      await click(page, 'Configure generate-image')
      await click(page, 'Run')
      await page.clock.runFor(1800)
      await expect
        .poll(() =>
          state(page).then((value) => value.nodes['generate-image']?.state)
        )
        .toBe('running')
      await click(page, 'Cancel')
      await expect(status(page)).toHaveText('Offline simulation: cancelled')
      await expect(
        page.getByAltText('Local generated workflow image')
      ).toBeHidden()
      await click(page, 'Run')
      await page.clock.runFor(3000)
      await expect(status(page)).toHaveText('Offline simulation: succeeded')
      const rerun = await state(page)
      expect(rerun.runId).not.toBe(first.runId)
      await expect(
        page.getByAltText('Local generated workflow image')
      ).toBeVisible()
      await page.getByLabel('Image prompt', { exact: true }).fill('new prompt')
      await click(page, 'Apply configuration')
      await expect(
        page.getByAltText('Local generated workflow image')
      ).toBeHidden()
      await click(page, 'Run')
      await expect(status(page)).toContainText('running')

      const oldRun = await page
        .getByRole('button', { name: 'Run', exact: true })
        .elementHandle()

      if (oldRun === null) {
        throw new Error('Missing Run control')
      }

      await click(page, 'Dispose')
      await expect(page.locator('#status')).toHaveText('Disposed')
      await page.clock.runFor(10_000)
      await expect
        .poll(() => page.evaluate(() => window.workflowAiPending))
        .toBe(0)
      await expect(page.locator('#workflow-run')).toHaveCount(0)
      await oldRun.evaluate((button) =>
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      )
      await oldRun.dispose()
      await expect
        .poll(() => page.evaluate(() => window.workflowAiPending))
        .toBe(0)
      await expect(page.locator('#workflow-run')).toHaveCount(0)
    })
  })
}
