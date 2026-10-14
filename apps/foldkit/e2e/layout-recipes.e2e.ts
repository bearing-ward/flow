import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

type Direction = 'TB' | 'LR' | 'none'

const open = async (page: Page, scene: string) => {
  await page.goto(`/ui-recipes/layout/?scene=${scene}`)
}

const status = (page: Page) => page.getByTestId('recipe-status')

const layouts = async (page: Page) =>
  Number((await status(page).getAttribute('data-layouts')) ?? '0')

const nodeBox = async (page: Page, nodeId: string): Promise<Box> => {
  const box = await page.locator(`[data-node-id="${nodeId}"]`).boundingBox()

  if (box === null) {
    throw new Error(`Node ${nodeId} is not rendered`)
  }

  return box
}

/**
 * Geometry violations read from the DOM: overlapping node rects and, for a
 * direction, edges whose target does not sit after its source.
 */
const violations = (page: Page, direction: Direction) =>
  page.evaluate((flow) => {
    const rects = new Map(
      [
        ...document.querySelectorAll<HTMLElement>('[data-testid="flow-node"]'),
      ].map((element) => [
        element.dataset.nodeId ?? '',
        element.getBoundingClientRect(),
      ])
    )

    const found: string[] = []
    const entries = [...rects]

    for (const [index, [id, rect]] of entries.entries()) {
      for (const [otherId, other] of entries.slice(index + 1)) {
        const overlapX =
          Math.min(rect.right, other.right) - Math.max(rect.left, other.left)

        const overlapY =
          Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top)

        if (overlapX > 0.5 && overlapY > 0.5) {
          found.push(`overlap ${id}/${otherId}`)
        }
      }
    }

    if (flow === 'none') {
      return found
    }

    for (const edge of document.querySelectorAll<SVGElement>(
      '[data-testid="flow-edge"]'
    )) {
      const source = rects.get(edge.dataset.sourceId ?? '')
      const target = rects.get(edge.dataset.targetId ?? '')

      if (source === undefined || target === undefined) {
        found.push(`missing ${edge.dataset.edgeId}`)
        continue
      }

      const ordered =
        flow === 'TB'
          ? target.top >= source.bottom - 0.5
          : target.left >= source.right - 0.5

      if (!ordered) {
        found.push(`order ${edge.dataset.edgeId}`)
      }
    }

    return found
  }, direction)

const expectLaidOut = async (page: Page, direction: Direction) => {
  await expect.poll(() => violations(page, direction)).toEqual([])
}

const handleCenter = async (page: Page, nodeId: string, handleId: string) => {
  const box = await page
    .locator(`[data-node-id="${nodeId}"] [data-handle-id="${handleId}"]`)
    .boundingBox()

  if (box === null) {
    throw new Error(`Handle ${nodeId}:${handleId} is not rendered`)
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

for (const scene of ['dagre-tree', 'elk-tree']) {
  test(`${scene} lays out measured nodes top to bottom and left to right`, async ({
    page,
  }) => {
    await open(page, scene)
    await expect(status(page)).toHaveAttribute('data-layouts', '1')
    await expectLaidOut(page, 'TB')

    await page.getByTestId('layout-lr').click()
    await expect(status(page)).toHaveAttribute('data-layouts', '2')
    await expectLaidOut(page, 'LR')

    // Source handles moved to the trailing side.
    const root = await nodeBox(page, '1')
    await expect
      .poll(async () => {
        const center = await handleCenter(page, '1', 'out')

        return center.x
      })
      .toBeCloseTo(root.x + root.width, 0)
  })
}

test('elk-multiple-handles orders targets by their measured source ports', async ({
  page,
}) => {
  await open(page, 'elk-multiple-handles')
  await expect(status(page)).toHaveAttribute('data-layouts', '1')
  await expectLaidOut(page, 'LR')

  const [t1, t2, t3] = await Promise.all(
    ['t1', 't2', 't3'].map((id) => nodeBox(page, id))
  )

  expect(t3?.y).toBeLessThan(t1?.y ?? 0)
  expect(t1?.y).toBeLessThan(t2?.y ?? 0)

  // data-ports reports flow-space handle offsets; compare with the DOM.
  const ports = (await status(page).getAttribute('data-ports')) ?? ''

  const zoom = await page
    .locator('.flow-foldkit-viewport')
    .evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)

  const source = await nodeBox(page, 's')

  const rendered = await Promise.all(
    ['out-a', 'out-b', 'out-c'].map(async (handle) => {
      const center = await handleCenter(page, 's', handle)

      return { handle, offset: (center.y - source.y) / zoom }
    })
  )

  const reported = new Map(
    ports.split(',').map((entry) => {
      const [id = '', offset = ''] = entry.split('@')

      return [id, Number(offset)]
    })
  )

  for (const { handle, offset } of rendered) {
    expect(
      Math.abs((reported.get(`s:${handle}`) ?? -100) - offset)
    ).toBeLessThanOrEqual(1)
  }
})

test('auto-layout re-runs when nodes are added or removed', async ({
  page,
}) => {
  await open(page, 'auto-layout')
  await expect(status(page)).toHaveAttribute('data-layouts', '1')

  await page.getByTestId('add-child').click()
  await page.getByTestId('add-child').click()
  await expect(status(page)).toHaveAttribute('data-nodes', '12')
  await expect.poll(() => layouts(page)).toBeGreaterThanOrEqual(2)
  await expectLaidOut(page, 'TB')

  const root = await nodeBox(page, '1')
  const firstChild = await nodeBox(page, 'child-1')
  const secondChild = await nodeBox(page, 'child-2')
  expect(firstChild.y).toBeGreaterThanOrEqual(root.y + root.height)
  expect(secondChild.y).toBeGreaterThanOrEqual(root.y + root.height)

  // A node selected by clicking it, as in the React example, receives the
  // next child.
  const selectedParent = await nodeBox(page, '3')
  await page.mouse.click(
    selectedParent.x + selectedParent.width / 2,
    selectedParent.y + selectedParent.height / 2
  )
  const beforeThird = await layouts(page)
  await page.getByTestId('add-child').click()
  await expect.poll(() => layouts(page)).toBeGreaterThan(beforeThird)
  await expectLaidOut(page, 'TB')
  const parent = await nodeBox(page, '3')
  const thirdChild = await nodeBox(page, 'child-3')
  expect(thirdChild.y).toBeGreaterThanOrEqual(parent.y + parent.height)

  const beforeRemove = await layouts(page)
  await page.getByTestId('remove-last').click()
  await expect(page.locator('[data-node-id="child-3"]')).toHaveCount(0)
  await expect.poll(() => layouts(page)).toBeGreaterThan(beforeRemove)
  await expectLaidOut(page, 'TB')
})

test('force-layout simulates, settles and keeps a dropped node pinned', async ({
  page,
}) => {
  await open(page, 'force-layout')
  await expect
    .poll(async () => Number(await status(page).getAttribute('data-ticks')))
    .toBeGreaterThan(0)

  const first = await nodeBox(page, 'n1')
  await expect
    .poll(async () => {
      const next = await nodeBox(page, 'n1')

      return Math.hypot(next.x - first.x, next.y - first.y)
    })
    .toBeGreaterThan(1)

  await expect(status(page)).toHaveAttribute('data-running', 'false', {
    timeout: 15_000,
  })
  await expectLaidOut(page, 'none')

  const ticks = Number(await status(page).getAttribute('data-ticks'))
  const frame = await page.locator('.recipe-frame').boundingBox()
  const before = await nodeBox(page, 'n1')

  const towardCenter =
    before.x + before.width / 2 > (frame?.x ?? 0) + (frame?.width ?? 0) / 2
      ? -150
      : 150

  const start = {
    x: before.x + before.width / 2,
    y: before.y + before.height / 2,
  }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 3, start.y)
  await page.mouse.move(start.x + towardCenter, start.y, { steps: 10 })
  await page.mouse.up()
  await expect(status(page)).toHaveAttribute('data-pinned', /^n1@/u)
  await expect
    .poll(async () => {
      const box = await nodeBox(page, 'n1')

      return box.x
    })
    .toBeCloseTo(before.x + towardCenter, 0)
  const dropped = await nodeBox(page, 'n1')

  await expect
    .poll(async () => Number(await status(page).getAttribute('data-ticks')))
    .toBeGreaterThan(ticks)
  await expect(status(page)).toHaveAttribute('data-running', 'false', {
    timeout: 15_000,
  })

  const after = await nodeBox(page, 'n1')
  expect(Math.abs(after.x - dropped.x)).toBeLessThanOrEqual(3)
  expect(Math.abs(after.y - dropped.y)).toBeLessThanOrEqual(3)
})

test('dynamic-layouting grows the tree from placeholders', async ({ page }) => {
  await open(page, 'dynamic-layouting')
  await expect(status(page)).toHaveAttribute('data-layouts', '1')
  await expect(status(page)).toHaveAttribute('data-placeholders', '1')

  await expectLaidOut(page, 'TB')
  const first = await nodeBox(page, 'p-1')
  await page.mouse.click(first.x + first.width / 2, first.y + first.height / 2)
  await expect(status(page)).toHaveAttribute('data-nodes', '2')
  await expect(status(page)).toHaveAttribute('data-placeholders', '1')
  await expectLaidOut(page, 'TB')

  const converted = await nodeBox(page, 'p-1')
  const placeholder = await nodeBox(page, 'p-2')
  expect(placeholder.y).toBeGreaterThanOrEqual(converted.y + converted.height)

  // A click on a regular node (`onNodeClick`) grows a new placeholder branch,
  // and its first measurement lays the tree out again.
  const root = await nodeBox(page, 'root')
  const beforeBranch = await layouts(page)
  await page.mouse.click(root.x + root.width / 2, root.y + root.height / 2)
  await expect(status(page)).toHaveAttribute('data-placeholders', '2')
  await expect.poll(() => layouts(page)).toBeGreaterThan(beforeBranch)
  await expectLaidOut(page, 'TB')
  const branched = await nodeBox(page, 'root')
  const branch = await nodeBox(page, 'p-3')
  expect(branch.y).toBeGreaterThanOrEqual(branched.y + branched.height)
})

test('auto-layout re-runs when an edge alone is added', async ({ page }) => {
  await open(page, 'auto-layout')
  await expect(status(page)).toHaveAttribute('data-layouts', '1')
  await expectLaidOut(page, 'TB')

  const before = await layouts(page)
  const from = await handleCenter(page, '2c', 'out')
  const to = await handleCenter(page, '3c', 'in')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 4, from.y + 4)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()

  await expect(page.locator('[data-testid="flow-edge"]')).toHaveCount(10)
  await expect.poll(() => layouts(page)).toBeGreaterThan(before)
  // The new edge orders 3c below 2c, so the tree was laid out again.
  await expectLaidOut(page, 'TB')
})
