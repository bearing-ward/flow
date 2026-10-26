import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema as S } from 'effect'

import { resizeCompletionBatches } from '../../shared-e2e/resize-completion-contract.ts'

const settle = (page: Page) =>
  page.evaluate(() => {
    const { promise, resolve } = Promise.withResolvers<undefined>()
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined)))

    return promise
  })

for (const mode of ['controlled', 'uncontrolled']) {
  for (const scenario of ['no movement', 'veto only', 'accepted then vetoed']) {
    test(`resize completion observer: ${mode}, ${scenario}`, async ({
      page,
    }, testInfo) => {
      await page.goto(`/resize-regression?mode=${mode}`)
      await expect(page.locator('.react-flow__node')).toBeVisible()
      await expect
        .poll(async () =>
          JSON.parse(
            (await page.getByTestId('resize-node-changes').textContent()) ??
              'null'
          )
        )
        .not.toEqual([])
      await settle(page)
      await page.getByRole('button', { name: 'Clear changes' }).click()
      const control = page.locator('.react-flow__resize-control.line.left')
      const box = await control.boundingBox()

      if (box === null) {
        throw new Error('Missing resize control')
      }

      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      await page.mouse.move(x, y)
      await page.mouse.down()

      if (scenario === 'accepted then vetoed') {
        await page.mouse.move(x - 20, y)
      }

      if (scenario !== 'no movement') {
        await page.mouse.move(x - 60, y)
      }

      await page.mouse.up()
      await expect
        .poll(async () => await page.getByTestId('resize-events').textContent())
        .toContain('end')

      const observed = await page
        .getByTestId('resize-node-changes')
        .textContent()

      await testInfo.attach('onNodesChange', {
        body: observed ?? 'null',
        contentType: 'application/json',
      })

      const batches = S.decodeUnknownSync(S.Array(S.Array(S.Unknown)))(
        JSON.parse(observed ?? 'null')
      )

      const expected = [
        {
          id: 'r',
          type: 'dimensions',
          resizing: false,
          dimensions: {
            width: scenario === 'accepted then vetoed' ? 170 : 150,
            height: 80,
          },
        },
      ]

      expect(resizeCompletionBatches(batches)).toEqual([expected])
      await control.dispatchEvent('mouseup')
      await page.mouse.up()
      await settle(page)
      expect(
        resizeCompletionBatches(
          S.decodeUnknownSync(S.Array(S.Array(S.Unknown)))(
            JSON.parse(
              (await page.getByTestId('resize-node-changes').textContent()) ??
                'null'
            )
          )
        )
      ).toEqual([expected])
    })
  }
}

for (const mode of ['controlled', 'uncontrolled']) {
  for (const action of ['Remove node', 'Unmount flow']) {
    test(`resize completion teardown: ${mode}, ${action}`, async ({
      page,
    }, info) => {
      await page.goto(`/resize-regression?mode=${mode}`)
      await expect(page.locator('.react-flow__node')).toBeVisible()
      await expect
        .poll(async () =>
          JSON.parse(
            (await page.getByTestId('resize-node-changes').textContent()) ??
              'null'
          )
        )
        .not.toEqual([])
      await settle(page)
      await page.getByRole('button', { name: 'Clear changes' }).click()
      const control = page.locator('.react-flow__resize-control.line.left')
      const box = await control.boundingBox()

      if (box === null) {
        throw new Error('Missing resize control')
      }

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page
        .getByRole('button', { name: action, exact: true })
        .evaluate((element) =>
          element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        )
      await expect(control).toHaveCount(0)
      await page.mouse.up()

      const observed = await page
        .getByTestId('resize-node-changes')
        .textContent()

      await info.attach('onNodesChange-after-teardown', {
        body: observed ?? 'null',
        contentType: 'application/json',
      })

      const batches = S.decodeUnknownSync(S.Array(S.Array(S.Unknown)))(
        JSON.parse(observed ?? 'null')
      )

      expect(batches).toEqual(
        action === 'Remove node'
          ? [
              [{ id: 'r', type: 'remove' }],
              [
                {
                  id: 'r',
                  type: 'dimensions',
                  resizing: false,
                  dimensions: { width: 150, height: 80 },
                },
              ],
            ]
          : []
      )
    })
  }
}
