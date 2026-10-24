import { expect, test } from '@playwright/test'

/** Flow-owned settled-state coverage. The upstream assertion stays unchanged. */
export const nodeExtentAdoptionContract = (
  host: 'vanilla' | 'vue' | 'foldkit'
) => {
  // Pinned system/src/utils/store.ts:154-170,449-469; general.ts:20-29.
  test('reclamps an initially oversized node after measurement and a document update', async ({
    page,
  }) => {
    await page.goto('/upstream-component/72')
    await expect(page.locator('#app')).toHaveAttribute(
      'data-upstream-ready',
      'true'
    )
    const prefix = host === 'vanilla' ? 'flow' : `flow-${host}`
    const node = page.locator(`.${prefix}-node`).first()

    const position = () =>
      node.evaluate((element) => {
        const style = getComputedStyle(element)
        const matrix = new DOMMatrixReadOnly(style.transform)

        return {
          x: matrix.m41 + (Number(style.left.replace('px', '')) || 0),
          y: matrix.m42 + (Number(style.top.replace('px', '')) || 0),
        }
      })

    await expect
      .poll(() => page.evaluate(() => window.__component.nodeChanges.flat()))
      .toContainEqual({
        type: 'dimensions',
        id: '1',
        dimensions: { width: 150, height: 44 },
      })
    await expect.poll(position).toEqual({ x: -100, y: 6 })
    await page.mouse.move(300, 300)
    await page.mouse.down()
    await page.mouse.move(450, 450)
    await page.mouse.up()
    const box = await node.boundingBox()

    if (box === null) {
      throw new Error('Missing measured node box')
    }

    const start = { x: box.x + box.width - 25, y: box.y + box.height / 2 }
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x, start.y - 3)
    await expect.poll(position).toEqual({ x: -100, y: 3 })
    await page.mouse.up()
    await expect.poll(position).toEqual({ x: -100, y: 3 })
    await page.mouse.click(start.x, start.y - 3)
    await expect(node).toHaveClass(/selected/u)
    await node.focus()
    await page.keyboard.press('ArrowUp')
    await expect.poll(position).toEqual({ x: -100, y: 0 })
    await page.keyboard.press('ArrowDown')
    await expect.poll(position).toEqual({ x: -100, y: 5 })
    await page.evaluate(() => window.__componentUpdate())
    await expect
      .poll(() => page.evaluate(() => window.__component.nodeChanges.flat()))
      .toContainEqual({
        type: 'dimensions',
        id: '1',
        dimensions: { width: 200, height: 100 },
      })
    await expect.poll(position).toEqual({ x: -150, y: -50 })
  })
}
