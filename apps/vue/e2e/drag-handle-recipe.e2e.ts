import { expect, test } from '@playwright/test'

test('Vue playground moves nodes from the marked drag handle only', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Show drag handle' }).click()

  const node = page.locator('[data-node-id="input"]')
  const dragHandle = node.locator('[data-flow-drag-handle]')
  const content = node.locator('.flow-vue-node-label')

  await expect(dragHandle).toBeVisible()

  const position = () =>
    node.evaluate((element) => ({
      left: Number(getComputedStyle(element).left),
      top: Number(getComputedStyle(element).top),
    }))

  const dragFrom = async (target: typeof dragHandle) => {
    const bounds = await target.boundingBox()

    if (bounds === null) {
      throw new Error('Missing visible Vue drag target')
    }

    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      bounds.x + bounds.width / 2 + 48,
      bounds.y + bounds.height / 2 + 24,
      { steps: 4 }
    )
    await page.mouse.up()
  }

  const beforeHandleDrag = await position()
  await dragFrom(dragHandle)
  await expect.poll(position).toEqual({
    left: beforeHandleDrag.left + 48,
    top: beforeHandleDrag.top + 24,
  })

  const beforeContentDrag = await position()
  await dragFrom(content)
  await expect.poll(position).toEqual(beforeContentDrag)

  const unmarkedNode = page.locator('[data-node-id="output"]')

  const unmarkedBefore = await unmarkedNode.evaluate((element) => ({
    left: Number(getComputedStyle(element).left),
    top: Number(getComputedStyle(element).top),
  }))

  await dragFrom(unmarkedNode.locator('.flow-vue-node-label'))
  await expect
    .poll(() =>
      unmarkedNode.evaluate((element) => ({
        left: Number(getComputedStyle(element).left),
        top: Number(getComputedStyle(element).top),
      }))
    )
    .toEqual({ left: unmarkedBefore.left + 48, top: unmarkedBefore.top + 24 })

  await page.reload()
  const resetNode = page.locator('[data-node-id="input"]')
  await expect(resetNode).toHaveCSS('left', '110px')
  await expect(resetNode).toHaveCSS('top', '120px')
})
