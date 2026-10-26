import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema as S } from 'effect'

import './resize-completion-fixture.ts'

const CompletionChange = S.Struct({
  type: S.Literal('dimensions'),
  resizing: S.Literal(false),
})

type Host = 'vanilla' | 'vue' | 'foldkit'

const controls = {
  vanilla: '.flow-resize-control[data-direction="left"]',
  vue: '.flow-vue-resize-control.line.left',
  foldkit: '.flow-foldkit-resize-control-line.flow-foldkit-resize-control-left',
}

const observed = (page: Page) =>
  page.evaluate(() => window.__resizeCompletion.changes())

const settle = (page: Page) =>
  page.evaluate(() => {
    const { promise, resolve } = Promise.withResolvers<undefined>()
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined)))

    return promise
  })

const mount = async (
  page: Page,
  host: Host,
  mode: 'controlled' | 'uncontrolled',
  throwEnd = false
) => {
  await page.goto(host === 'vanilla' ? '/' : '/test.html')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(
    async ({ modulePath, mode: ownership, throwEnd: failure }) => {
      const { mountResizeCompletion } = await import(modulePath)
      const root = document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing resize completion root')
      }

      mountResizeCompletion(root, ownership, failure)
    },
    {
      modulePath:
        host === 'foldkit'
          ? '/e2e/resize-completion-fixture.ts'
          : '/src/resize-completion-fixture.ts',
      mode,
      throwEnd,
    }
  )
  await expect.poll(() => observed(page)).not.toEqual([])
  await settle(page)
  await page.evaluate(() => window.__resizeCompletion.clear())
}

const press = async (page: Page, host: Host) => {
  const control = page.locator(controls[host])
  const element = await control.elementHandle()
  const box = await control.boundingBox()

  if (box === null || element === null) {
    throw new Error('Missing resize control')
  }

  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()

  return { x, y, element }
}

export const resizeCompletionBatches = (
  batches: readonly (readonly unknown[])[]
) => batches.filter((batch) => batch.some(S.is(CompletionChange)))

export const resizeCompletionContract = (host: Host): void => {
  for (const mode of ['controlled', 'uncontrolled'] as const) {
    for (const scenario of [
      'no movement',
      'veto only',
      'accepted then vetoed',
    ]) {
      test(`resize completion observer: ${mode}, ${scenario}`, async ({
        page,
      }, info) => {
        await mount(page, host, mode)

        const before = await page.evaluate(() =>
          window.__resizeCompletion.geometryChangeCount()
        )

        const { x, y, element } = await press(page, host)

        if (scenario === 'accepted then vetoed') {
          await page.mouse.move(x - 20, y)
        }

        if (scenario !== 'no movement') {
          await page.mouse.move(x - 60, y)
        }

        await page.mouse.up()
        const accepted = scenario === 'accepted then vetoed'

        const expected = [
          {
            id: 'r',
            type: 'dimensions',
            resizing: false,
            dimensions: { width: accepted ? 170 : 150, height: 80 },
          },
        ]

        await expect
          .poll(async () => resizeCompletionBatches(await observed(page)))
          .toEqual([expected])
        await expect
          .poll(() => page.evaluate(() => window.__resizeCompletion.bounds()))
          .toEqual({
            x: accepted ? 80 : 100,
            y: 100,
            width: accepted ? 170 : 150,
            height: 80,
          })
        const prefix = host === 'vanilla' ? 'flow' : `flow-${host}`
        const node = page.locator(`.${prefix}-node[data-node-id="r"]`)
        await expect(node).toHaveCSS('width', accepted ? '170px' : '150px')
        await expect(node).toHaveCSS('height', '80px')
        expect(
          await page.evaluate(() =>
            window.__resizeCompletion.geometryChangeCount()
          )
        ).toBe(before + (accepted ? 1 : 0))
        expect(
          await page.evaluate(() => window.__resizeCompletion.endCount())
        ).toBe(1)
        // A consumed session cannot publish again through capture loss or a repeated release.
        await element.dispatchEvent('lostpointercapture', { pointerId: 1 })
        await element.dispatchEvent('pointerup', { pointerId: 1 })
        await page.mouse.up()
        await settle(page)
        expect(resizeCompletionBatches(await observed(page))).toEqual([
          expected,
        ])
        expect(
          await page.evaluate(() => window.__resizeCompletion.endCount())
        ).toBe(1)
        await info.attach('onNodesChange', {
          body: JSON.stringify(await observed(page)),
          contentType: 'application/json',
        })
      })
    }

    for (const teardown of ['remove', 'unmount'] as const) {
      for (const motion of ['no movement', 'accepted movement']) {
        test(`resize completion observer: ${mode}, ${teardown} during ${motion}`, async ({
          page,
        }) => {
          await mount(page, host, mode)
          const { x, y, element } = await press(page, host)

          if (motion === 'accepted movement') {
            await page.mouse.move(x - 20, y)
            await settle(page)
          }

          expect(resizeCompletionBatches(await observed(page))).toEqual([])
          await page.evaluate(
            (action) => window.__resizeCompletion[action](),
            teardown
          )
          await expect(page.locator(controls[host])).toHaveCount(0)
          await page.mouse.up()
          await element.dispatchEvent('pointerup', { pointerId: 1 })
          await element.dispatchEvent('lostpointercapture', { pointerId: 1 })
          await settle(page)
          expect(resizeCompletionBatches(await observed(page))).toEqual([])
        })
      }
    }

    test(`resize completion observer: ${mode}, throwing end callback`, async ({
      page,
    }) => {
      await mount(page, host, mode, true)
      await press(page, host)
      await page.mouse.up()
      await expect
        .poll(async () => resizeCompletionBatches(await observed(page)))
        .toEqual([
          [
            {
              id: 'r',
              type: 'dimensions',
              resizing: false,
              dimensions: { width: 150, height: 80 },
            },
          ],
        ])
      expect(
        await page.evaluate(() => window.__resizeCompletion.endCount())
      ).toBe(1)
      expect(
        await page.evaluate(() => window.__resizeCompletion.callbackFailures())
      ).toBe(1)
    })
  }
}
