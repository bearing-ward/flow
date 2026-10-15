import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const node = (page: Page) => page.getByTestId('flow-node')

const read = (page: Page) =>
  page.evaluate(async () => {
    const fixture = window.__foldkitResizeInstance

    if (fixture === undefined) {
      throw new Error('Missing public instance fixture')
    }

    const [internal, bulk, single, nodes] = await Promise.all([
      fixture.instance.getInternalNode('a'),
      fixture.instance.getInternalNodes(),
      fixture.instance.getNode('a'),
      fixture.instance.getNodes(),
    ])

    return {
      internal,
      bulk: bulk[0],
      single,
      listed: nodes[0],
      accepted: fixture.accepted().nodes[0],
    }
  })

const width = async (page: Page) => {
  const value = await read(page)

  return value.internal?.width
}

for (const custom of [false, true]) {
  test(`public instance reads live ${custom ? 'custom' : 'built-in'} pointer resize and Escape restores accepted bounds`, async ({
    page,
  }) => {
    await page.goto(`/live-internal-node/${custom ? '?custom' : ''}`)
    const before = await node(page).boundingBox()

    if (before === null) {
      throw new Error('Missing node')
    }

    const control = node(page).locator('[data-resize-direction="bottom-right"]')
    const rect = await control.boundingBox()

    if (rect === null) {
      throw new Error('Missing resizer')
    }

    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      rect.x + rect.width / 2 + 50,
      rect.y + rect.height / 2 + 40,
      { steps: 6 }
    )
    await expect.poll(() => width(page)).toBe(250)
    const during = await read(page)
    expect(during.internal?.height).toBe(140)
    expect(during.bulk?.width).toBe(250)
    expect(during.single?.size).toEqual({ width: 250, height: 140 })
    expect(during.listed?.size).toEqual({ width: 250, height: 140 })
    expect(during.accepted?.size).toEqual({ width: 200, height: 100 })
    const drawn = await node(page).boundingBox()
    expect(drawn?.width).toBe(250)
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await expect.poll(() => width(page)).toBe(before.width)
  })
}

test('public instance reads held keyboard resize before release and restores after Escape', async ({
  page,
}) => {
  await page.goto('/live-internal-node/')
  await node(page).locator('[data-resize-direction="top-left"]').focus()
  await page.keyboard.down('ArrowLeft')
  await expect.poll(() => width(page)).toBe(205)
  const during = await read(page)
  expect(during.internal?.absolutePosition.x).toBe(95)
  expect(during.single?.position.x).toBe(95)
  expect(during.listed?.size?.width).toBe(205)
  expect(during.accepted?.position.x).toBe(100)
  await page.keyboard.press('Escape')
  await page.keyboard.up('ArrowLeft')
  await expect.poll(() => width(page)).toBe(200)
})
