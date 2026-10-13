import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

interface Point {
  readonly x: number
  readonly y: number
}

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const node = (page: Page, id: string) =>
  page.locator(`.flow-vue-node[data-node-id="${id}"]`)

const boxOf = async (locator: Locator): Promise<Box> => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Missing element box')
  }

  return box
}

const center = (box: Box): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
})

/** Press, cross the drag threshold, move to the target and release. */
const drag = async (page: Page, from: Point, to: Point) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(to.x, to.y, { steps: 10 })
  await page.mouse.up()
}

/** Top edge of a rendered element, for polling. */
const topOf = async (locator: Locator): Promise<number> => {
  const box = await boxOf(locator)

  return box.y
}

const expectMovedBy = (after: Box, before: Box, delta: Point) => {
  expect(Math.abs(after.x - before.x - delta.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(after.y - before.y - delta.y)).toBeLessThanOrEqual(1)
}

const contains = (outer: Box, inner: Box): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

const open = async (page: Page) => {
  await page.goto('/ui-recipes/subflows/')
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-parents',
    'A:,B:,C:,D:,E:G0'
  )
}

test('selection grouping wraps the selected nodes in a new parent', async ({
  page,
}) => {
  await open(page)

  const status = page.getByTestId('recipe-status')
  const beforeA = await boxOf(node(page, 'A'))
  const beforeB = await boxOf(node(page, 'B'))

  await page.keyboard.down('Shift')
  await drag(
    page,
    { x: beforeA.x - 20, y: beforeA.y - 20 },
    { x: beforeB.x + beforeB.width + 20, y: beforeB.y + beforeB.height + 20 }
  )
  await page.keyboard.up('Shift')
  await expect(status).toHaveAttribute('data-selected', 'A,B')

  await page.getByTestId('group-selection').click()
  await expect(status).toHaveAttribute(
    'data-parents',
    'A:group-1,B:group-1,C:,D:,E:G0'
  )

  const groupedA = await boxOf(node(page, 'A'))
  const groupedB = await boxOf(node(page, 'B'))
  expectMovedBy(groupedA, beforeA, { x: 0, y: 0 })
  expectMovedBy(groupedB, beforeB, { x: 0, y: 0 })

  const group = await boxOf(node(page, 'group-1'))
  expect(contains(group, groupedA) && contains(group, groupedB)).toBe(true)

  const delta = { x: 90, y: 140 }
  const grip = { x: group.x + 12, y: group.y + group.height / 2 }
  await drag(page, grip, { x: grip.x + delta.x, y: grip.y + delta.y })

  await expect
    .poll(async () => (await topOf(node(page, 'group-1'))) - group.y)
    .toBeCloseTo(delta.y, 0)

  expectMovedBy(await boxOf(node(page, 'A')), groupedA, delta)
  expectMovedBy(await boxOf(node(page, 'B')), groupedB, delta)
})

test('dropping a node into or out of a group changes its parent', async ({
  page,
}) => {
  await open(page)

  const status = page.getByTestId('recipe-status')
  const group = await boxOf(node(page, 'G0'))
  const beforeC = await boxOf(node(page, 'C'))
  const dropC = { x: group.x + 180, y: group.y + 240 }

  const deltaC = {
    x: dropC.x - center(beforeC).x,
    y: dropC.y - center(beforeC).y,
  }

  await drag(page, center(beforeC), dropC)
  await expect(status).toHaveAttribute('data-parents', 'A:,B:,C:G0,D:,E:G0')

  const droppedC = await boxOf(node(page, 'C'))
  expectMovedBy(droppedC, beforeC, deltaC)

  const beforeE = await boxOf(node(page, 'E'))
  const groupDelta = { x: -60, y: 120 }
  const grip = { x: group.x + 12, y: group.y + 12 }

  await drag(page, grip, { x: grip.x + groupDelta.x, y: grip.y + groupDelta.y })
  await expect
    .poll(async () => (await topOf(node(page, 'G0'))) - group.y)
    .toBeCloseTo(groupDelta.y, 0)

  expectMovedBy(await boxOf(node(page, 'C')), droppedC, groupDelta)

  const movedE = await boxOf(node(page, 'E'))
  expectMovedBy(movedE, beforeE, groupDelta)

  const dropE = { x: 150, y: 540 }

  const deltaE = {
    x: dropE.x - center(movedE).x,
    y: dropE.y - center(movedE).y,
  }

  await drag(page, center(movedE), dropE)
  await expect(status).toHaveAttribute('data-parents', 'A:,B:,C:G0,D:,E:')
  expectMovedBy(await boxOf(node(page, 'E')), movedE, deltaE)
})
