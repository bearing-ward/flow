/* oxlint-disable no-await-in-loop */
import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

test.use({
  screenshot: 'on',
  video: 'on',
  trace: 'retain-on-failure',
})

const readBounds = (node: Locator) =>
  node.evaluate((element) => {
    const { left, top, right, bottom, width, height } =
      element.getBoundingClientRect()

    const transform = new DOMMatrixReadOnly(getComputedStyle(element).transform)

    return {
      dom: { left, top, right, bottom, width, height },
      world: { x: transform.m41, y: transform.m42, width, height },
    }
  })

const resizeCases = [
  {
    direction: 'top-left',
    delta: { x: 100, y: 100 },
    horizontalKey: 'Shift+ArrowRight',
    horizontalSteps: 5,
    verticalKey: 'Shift+ArrowDown',
    verticalSteps: 5,
    expected: { x: 312, y: 278, width: 268, height: 132 },
  },
  {
    direction: 'bottom-right',
    delta: { x: -240, y: -160 },
    horizontalKey: 'Shift+ArrowLeft',
    horizontalSteps: 12,
    verticalKey: 'Shift+ArrowUp',
    verticalSteps: 8,
    expected: { x: 280, y: 220, width: 152, height: 114 },
  },
]

for (const input of ['pointer', 'keyboard']) {
  for (const resizeCase of resizeCases) {
    test(`${input} ${resizeCase.direction} shrink contains the unchanged demo child`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')
      await page.locator('button[data-action="resize"]').click()
      await expect(page.locator('#app')).toHaveAttribute(
        'data-playground-scene',
        'resize'
      )

      const parent = page.locator('.flow-node[data-node-id="container"]')
      const child = page.locator('.flow-node[data-node-id="child"]')
      await expect(parent).toBeVisible()
      await expect(child).toBeVisible()
      await expect
        .poll(() => readBounds(parent))
        .toEqual({
          dom: {
            left: 280,
            top: 220,
            right: 580,
            bottom: 410,
            width: 300,
            height: 190,
          },
          world: { x: 280, y: 220, width: 300, height: 190 },
        })
      const childBefore = await readBounds(child)
      expect(childBefore).toEqual({
        dom: {
          left: 312,
          top: 278,
          right: 432,
          bottom: 334,
          width: 120,
          height: 56,
        },
        world: { x: 312, y: 278, width: 120, height: 56 },
      })

      const handle = parent.locator(
        `.flow-node-resize-handle[data-direction="${resizeCase.direction}"]`
      )

      if (input === 'pointer') {
        const bounds = await handle.boundingBox()

        if (bounds === null) {
          throw new Error('Missing demo parent resize handle')
        }

        const start = {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
        }

        await page.mouse.move(start.x, start.y)
        await page.mouse.down()
        await page.mouse.move(
          start.x + resizeCase.delta.x,
          start.y + resizeCase.delta.y,
          { steps: 10 }
        )
        await page.mouse.up()
      } else {
        await handle.focus()

        for (let step = 0; step < resizeCase.horizontalSteps; step += 1) {
          await page.keyboard.press(resizeCase.horizontalKey)
        }

        for (let step = 0; step < resizeCase.verticalSteps; step += 1) {
          await page.keyboard.press(resizeCase.verticalKey)
        }
      }

      await expect(page.locator('#app')).toHaveAttribute(
        'data-last-change',
        /node-bounds/u
      )
      await expect.poll(() => readBounds(child)).toEqual(childBefore)
      const parentAfter = await readBounds(parent)
      const childAfter = await readBounds(child)
      await testInfo.attach('committed-bounds', {
        body: JSON.stringify({ parentAfter, childBefore, childAfter }, null, 2),
        contentType: 'application/json',
      })

      expect.soft(parentAfter.world).toEqual(resizeCase.expected)
      expect.soft(parentAfter.dom.left).toBeLessThanOrEqual(312)
      expect.soft(parentAfter.dom.top).toBeLessThanOrEqual(278)
      expect.soft(parentAfter.dom.right).toBeGreaterThanOrEqual(432)
      expect.soft(parentAfter.dom.bottom).toBeGreaterThanOrEqual(334)
    })
  }
}
