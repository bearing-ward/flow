import { expect, test as it } from '@playwright/test'

declare global {
  interface Window {
    workflowAiPendingTimers: number
  }
}

export const workflowAiCapabilityAcceptance = (host: string) => {
  it.describe(`${host} offline AI capability composition`, () => {
    let unexpected: string[] = []
    let errors: string[] = []
    it.beforeEach(async ({ page, baseURL }) => {
      unexpected = []
      errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.route('**/*', async (route) => {
        const url = route.request().url()

        if (
          new URL(url).origin === new URL(baseURL ?? '').origin &&
          !['fetch', 'xhr'].includes(route.request().resourceType())
        ) {
          await route.continue()
        } else {
          unexpected.push(url)
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
        window.workflowAiPendingTimers = 0
        Reflect.set(
          globalThis,
          'setTimeout',
          (handler: () => void, delay: number) => {
            const timer = schedule(() => {
              pending.delete(timer)
              window.workflowAiPendingTimers = pending.size
              handler()
            }, delay)

            if (delay === 200) {
              pending.add(timer)
              window.workflowAiPendingTimers = pending.size
            }

            return timer
          }
        )
        Reflect.set(
          globalThis,
          'clearTimeout',
          (timer: ReturnType<typeof setTimeout>) => {
            pending.delete(timer)
            window.workflowAiPendingTimers = pending.size
            cancel(timer)
          }
        )
      })
      await page.goto('/workflow-ai-capability/')
    })
    it.afterEach(() => {
      expect(unexpected).toStrictEqual([])
      expect(errors).toStrictEqual([])
    })
    it('projects literal chunks, final text and the local PNG', async ({
      page,
    }) => {
      await page.clock.install()
      await page.getByRole('button', { name: 'Generate fixture text' }).click()
      await expect(
        page.getByRole('status', { name: 'Capability status', exact: true })
      ).toHaveText('running')
      await page.clock.runFor(200)
      await expect(page.getByLabel('Text output', { exact: true })).toHaveText(
        'A '
      )
      await page.clock.runFor(600)
      await expect(
        page.getByRole('status', { name: 'Capability status', exact: true })
      ).toHaveText('succeeded')
      await expect(page.getByLabel('Text output', { exact: true })).toHaveText(
        'A quiet tree.'
      )
      await expect(page.getByLabel('Capability events')).toHaveText(
        '["A ","quiet ","tree."]'
      )
      await page.getByRole('button', { name: 'Generate fixture image' }).click()
      await page.clock.runFor(200)
      await expect(
        page.getByRole('status', { name: 'Capability status', exact: true })
      ).toHaveText('succeeded')
      const image = page.getByAltText('Local green fixture')
      await expect(image).toBeVisible()
      expect(
        await image.evaluate((element) =>
          element instanceof HTMLImageElement
            ? [
                element.naturalWidth,
                element.naturalHeight,
                element.src.startsWith('data:image/png;base64,'),
              ]
            : []
        )
      ).toStrictEqual([256, 256, true])
    })
    it('cancels, replaces and disposes without accepting late text or image', async ({
      page,
    }) => {
      await page.clock.install()
      await page.getByRole('button', { name: 'Generate fixture text' }).click()
      await page.clock.runFor(200)
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(
        page.getByRole('status', { name: 'Capability status', exact: true })
      ).toHaveText('cancelled')
      await page.clock.runFor(5000)
      await expect(page.getByLabel('Text output', { exact: true })).toHaveText(
        'A '
      )
      await page.getByRole('button', { name: 'Generate fixture image' }).click()
      await page.getByRole('button', { name: 'Generate fixture text' }).click()
      await page.clock.runFor(1000)
      await expect(
        page.getByRole('status', { name: 'Capability status', exact: true })
      ).toHaveText('succeeded')
      await expect(page.getByAltText('Local green fixture')).toBeHidden()
      await page.getByRole('button', { name: 'Generate fixture image' }).click()
      await page.getByRole('button', { name: 'Dispose', exact: true }).click()
      await expect(
        page.getByRole('status', { name: 'Capability status', exact: true })
      ).toHaveText('Disposed')
      await page.clock.runFor(5000)
      await expect(page.getByAltText('Local green fixture')).toBeHidden()
      await page.getByRole('button', { name: 'Generate fixture text' }).click()
      await page.clock.runFor(1000)
      await expect(
        page.getByRole('status', { name: 'Capability status', exact: true })
      ).toHaveText('Disposed')
    })
    it('releases pending provider timers on cancellation and disposal', async ({
      page,
    }) => {
      await page.getByRole('button', { name: 'Generate fixture text' }).click()
      await expect
        .poll(() => page.evaluate(() => window.workflowAiPendingTimers))
        .toBeGreaterThan(0)
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect
        .poll(() => page.evaluate(() => window.workflowAiPendingTimers))
        .toBe(0)
      await page.getByRole('button', { name: 'Generate fixture image' }).click()
      await expect
        .poll(() => page.evaluate(() => window.workflowAiPendingTimers))
        .toBeGreaterThan(0)
      await page.getByRole('button', { name: 'Dispose', exact: true }).click()
      await expect
        .poll(() => page.evaluate(() => window.workflowAiPendingTimers))
        .toBe(0)
    })
  })
}
