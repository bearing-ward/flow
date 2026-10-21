import { expect, test } from '@playwright/test'

export const selectionBoundsContract = (
  host: 'vanilla' | 'vue' | 'foldkit'
): void => {
  const prefix = host === 'vanilla' ? 'flow' : `flow-${host}`

  test('released selection bounds follow selected nodes through a middle-button pan', async ({
    page,
  }) => {
    await page.goto('/upstream/nodes/general')

    if (host === 'foldkit') {
      await expect(page.locator('#app')).toHaveAttribute(
        'data-upstream-ready',
        'true'
      )
    }

    const first = page.locator(`.${prefix}-node[data-node-id="Node-1"]`)
    await expect(first).toBeVisible()
    const nodeBox = await first.boundingBox()

    if (nodeBox === null) {
      throw new Error('Missing node bounds')
    }

    await page.keyboard.down('Shift')
    await page.mouse.move(nodeBox.x - 150, nodeBox.y - 25)
    await page.mouse.down()
    await page.mouse.move(nodeBox.x + 275, nodeBox.y + 200)
    await page.mouse.up()
    await page.keyboard.up('Shift')

    const bounds = page.locator(`.${prefix}-selection-box`)
    await expect(bounds).toBeVisible()
    // Pinned tests/playwright/e2e/nodes.spec.ts:20 checks three nodes without limiting the selected count.
    await expect(page.locator(`.${prefix}-node.selected`)).toHaveCount(4)
    const before = await bounds.boundingBox()

    if (before === null) {
      throw new Error('Missing released selection bounds')
    }

    const selected = await page.locator(`.${prefix}-node.selected`).all()
    const boxes = await Promise.all(selected.map((node) => node.boundingBox()))
    const present = boxes.filter((box) => box !== null)
    expect(present).toHaveLength(4)
    expect(before.x).toBeCloseTo(Math.min(...present.map((box) => box.x)), 1)
    expect(before.y).toBeCloseTo(Math.min(...present.map((box) => box.y)), 1)
    expect(before.x + before.width).toBeCloseTo(
      Math.max(...present.map((box) => box.x + box.width)),
      1
    )
    expect(before.y + before.height).toBeCloseTo(
      Math.max(...present.map((box) => box.y + box.height)),
      1
    )

    const x = before.x + before.width / 2
    const y = before.y + before.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(x + 100, y + 100)
    await page.mouse.up({ button: 'middle' })
    const after = await bounds.boundingBox()
    expect(after?.x).toBeCloseTo(before.x + 100, 1)
    expect(after?.y).toBeCloseTo(before.y + 100, 1)
    expect(after?.width).toBeCloseTo(before.width, 1)
    expect(after?.height).toBeCloseTo(before.height, 1)
    await expect(page.locator(`.${prefix}-node.selected`)).toHaveCount(4)

    await first.click()
    await expect(bounds).not.toBeVisible()
  })
}
