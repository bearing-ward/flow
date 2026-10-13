import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const open = async (page: Page, scene: string) => {
  await page.goto(`/ui-recipes/layout/?scene=${scene}`)
}

const status = (page: Page) => page.getByTestId('recipe-status')

const node = (page: Page, id: string) =>
  page.locator(`.flow-vue-node[data-node-id="${id}"]`)

const boxOf = async (locator: Locator): Promise<Box> => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Missing element box')
  }

  return box
}

const layoutCount = async (page: Page): Promise<number> =>
  Number(await status(page).getAttribute('data-layouts'))

const waitForLayouts = async (page: Page, atLeast: number) => {
  await expect.poll(() => layoutCount(page)).toBeGreaterThanOrEqual(atLeast)
}

/** Every pair of rendered node boxes is disjoint (touching is fine). */
const noOverlaps = async (page: Page): Promise<boolean> => {
  const boxes = await page
    .locator('.flow-vue-node')
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().toJSON())
    )

  return boxes.every((first: Box, index) =>
    boxes.slice(index + 1).every((second: Box) => {
      const width =
        Math.min(first.x + first.width, second.x + second.width) -
        Math.max(first.x, second.x)

      const height =
        Math.min(first.y + first.height, second.y + second.height) -
        Math.max(first.y, second.y)

      return width <= 0.5 || height <= 0.5
    })
  )
}

const treeEdges = [
  ['1', '2'],
  ['1', '3'],
  ['2', '2a'],
  ['2', '2b'],
  ['2', '2c'],
  ['3', '3a'],
  ['3', '3b'],
  ['3', '3c'],
  ['3a', '3a1'],
] as const

const edgesFlow = async (
  page: Page,
  direction: 'TB' | 'LR'
): Promise<boolean> => {
  const results = await Promise.all(
    treeEdges.map(async ([source, target]) => {
      const from = await boxOf(node(page, source))
      const to = await boxOf(node(page, target))

      return direction === 'TB'
        ? to.y >= from.y + from.height - 0.5
        : to.x >= from.x + from.width - 0.5
    })
  )

  return results.every(Boolean)
}

const sourceHandleOnRight = async (page: Page, id: string) => {
  const nodeBox = await boxOf(node(page, id))

  const handle = await boxOf(
    node(page, id).locator('.flow-vue-handle[data-handle-id="out"]')
  )

  return Math.abs(handle.x + handle.width / 2 - (nodeBox.x + nodeBox.width))
}

for (const scene of ['dagre-tree', 'elk-tree']) {
  test(`${scene} lays out measured nodes top-down and left-right`, async ({
    page,
  }) => {
    await open(page, scene)
    await waitForLayouts(page, 1)

    await expect.poll(() => noOverlaps(page)).toBe(true)
    await expect.poll(() => edgesFlow(page, 'TB')).toBe(true)

    const widths = await page
      .locator('.flow-vue-node')
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().width)
      )

    expect(Math.max(...widths)).toBeGreaterThan(Math.min(...widths) * 2)

    await page.getByTestId('layout-lr').click()
    await waitForLayouts(page, 2)

    await expect.poll(() => edgesFlow(page, 'LR')).toBe(true)
    await expect.poll(() => noOverlaps(page)).toBe(true)
    await expect.poll(() => sourceHandleOnRight(page, '1')).toBeLessThan(2)
  })
}

test('elk-multiple-handles orders targets by their measured source ports', async ({
  page,
}) => {
  await open(page, 'elk-multiple-handles')
  await waitForLayouts(page, 1)
  await expect.poll(() => noOverlaps(page)).toBe(true)

  const t1 = await boxOf(node(page, 't1'))
  const t2 = await boxOf(node(page, 't2'))
  const t3 = await boxOf(node(page, 't3'))
  expect(
    t3.y < t1.y && t1.y < t2.y,
    `target tops ${t3.y}, ${t1.y}, ${t2.y}`
  ).toBe(true)

  const zoom = await page
    .locator('.flow-vue-viewport')
    .evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)

  const ports = (await status(page).getAttribute('data-ports')) ?? ''
  const source = await boxOf(node(page, 's'))

  const rendered = await Promise.all(
    ['out-a', 'out-b', 'out-c'].map(async (handleId) => {
      const handle = await boxOf(
        node(page, 's').locator(
          `.flow-vue-handle[data-handle-id="${handleId}"]`
        )
      )

      return { handleId, y: (handle.y - source.y) / zoom }
    })
  )

  const declared = new Map(
    ports.split(',').map((entry) => {
      const [id = '', y = ''] = entry.split('@')

      return [id, Number(y)] as const
    })
  )

  const matches = rendered.every(
    ({ handleId, y }) =>
      Math.abs((declared.get(`s:${handleId}`) ?? Number.NaN) - y) <= 1
  )

  expect(matches, `${ports} vs ${JSON.stringify(rendered)}`).toBe(true)
})

test('auto-layout re-runs when the node set changes', async ({ page }) => {
  await open(page, 'auto-layout')
  await waitForLayouts(page, 1)

  const childBelow = async (child: string, parent: string) => {
    const from = await boxOf(node(page, parent))
    const to = await boxOf(node(page, child))

    return to.y >= from.y + from.height - 0.5
  }

  await page.getByTestId('add-child').click()
  await expect(node(page, 'child-1')).toBeVisible()
  await page.getByTestId('add-child').click()
  await expect(node(page, 'child-2')).toBeVisible()

  await expect
    .poll(
      async () =>
        (await childBelow('child-1', '1')) &&
        (await childBelow('child-2', '1')) &&
        (await noOverlaps(page))
    )
    .toBe(true)

  await node(page, '2').click()
  await expect(
    node(page, '2').locator('.flow-vue-resize-handle').first()
  ).toBeVisible()
  await page.getByTestId('add-child').click()
  await expect(node(page, 'child-3')).toBeVisible()

  await expect
    .poll(
      async () => (await childBelow('child-3', '2')) && (await noOverlaps(page))
    )
    .toBe(true)

  const before = await layoutCount(page)
  await page.getByTestId('remove-last').click()
  await expect(node(page, 'child-3')).toHaveCount(0)
  await waitForLayouts(page, before + 1)
  await expect.poll(() => noOverlaps(page)).toBe(true)
})

test('force-layout animates, settles without overlaps and pins a dropped node', async ({
  page,
}) => {
  await open(page, 'force-layout')

  await expect
    .poll(async () => Number(await status(page).getAttribute('data-ticks')))
    .toBeGreaterThan(0)
  await expect(status(page)).toHaveAttribute('data-running', 'true')

  const first = await boxOf(node(page, 'f1'))
  await page.waitForTimeout(150)
  const second = await boxOf(node(page, 'f1'))
  expect(Math.hypot(second.x - first.x, second.y - first.y)).toBeGreaterThan(0)

  await expect(status(page)).toHaveAttribute('data-running', 'false', {
    timeout: 20_000,
  })
  expect(await noOverlaps(page)).toBe(true)

  const ticks = Number(await status(page).getAttribute('data-ticks'))
  const settled = await boxOf(node(page, 'f1'))
  const from = { x: settled.x + 20, y: settled.y + settled.height / 2 }
  const dx = from.x < 480 ? 150 : -150
  const to = { x: from.x + dx, y: from.y }

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(to.x, to.y, { steps: 10 })
  await page.mouse.up()

  await expect
    .poll(async () => Number(await status(page).getAttribute('data-ticks')))
    .toBeGreaterThan(ticks)
  await expect(status(page)).toHaveAttribute('data-running', 'false', {
    timeout: 20_000,
  })

  const dropped = await boxOf(node(page, 'f1'))
  expect(Math.abs(dropped.x - (settled.x + dx))).toBeLessThanOrEqual(3)
  expect(Math.abs(dropped.y - settled.y)).toBeLessThanOrEqual(3)
})

test('dynamic-layouting turns placeholders into nodes and re-lays out', async ({
  page,
}) => {
  await open(page, 'dynamic-layouting')
  await waitForLayouts(page, 1)
  await expect(status(page)).toHaveAttribute('data-nodes', '1')
  await expect(status(page)).toHaveAttribute('data-placeholders', '1')

  await page.getByTestId('placeholder').click()
  await expect(status(page)).toHaveAttribute('data-nodes', '2')
  await expect(status(page)).toHaveAttribute('data-placeholders', '1')
  await expect(node(page, 'placeholder-1')).toHaveText('Node 1')

  await expect
    .poll(async () => {
      const parent = await boxOf(node(page, 'placeholder-1'))
      const child = await boxOf(node(page, 'placeholder-2'))

      return (
        child.y >= parent.y + parent.height - 0.5 && (await noOverlaps(page))
      )
    })
    .toBe(true)

  await node(page, 'root').click()
  await expect(status(page)).toHaveAttribute('data-placeholders', '2')
  await expect(node(page, 'placeholder-3')).toBeVisible()
  await expect.poll(() => noOverlaps(page)).toBe(true)
})
