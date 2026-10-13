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

const nodeLocator = (page: Page, id: string) =>
  page.locator(`.flow-node[data-node-id="${id}"]`)

const boxOf = async (locator: Locator): Promise<Box> => {
  await expect(locator).toHaveCSS('visibility', 'visible')
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Element has no bounding box')
  }

  return box
}

const expectNearBox = (actual: Point, expected: Point, tolerance = 1) => {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance)
}

const contains = (outer: Box, inner: Box) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

/** Drag with the real mouse, crossing the 1px threshold before the long move. */
const dragBy = async (page: Page, from: Point, dx: number, dy: number) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y)
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 10 })
  await page.mouse.up()
}

const centerOf = (box: Box): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
})

test('subflows: selection grouping keeps positions and drags members with the group', async ({
  page,
}) => {
  await page.goto('/ui-recipes/subflows/')
  const status = page.getByTestId('recipe-status')
  const a = nodeLocator(page, 'A')
  const b = nodeLocator(page, 'B')
  const beforeA = await boxOf(a)
  const beforeB = await boxOf(b)

  await a.click()
  await b.click({ modifiers: ['ControlOrMeta'] })
  await expect(status).toHaveAttribute('data-selected', 'A,B')
  await page.getByTestId('group-selection').click()

  await expect(status).toHaveAttribute(
    'data-parents',
    'A:group-1,B:group-1,C:,D:,E:G0'
  )
  const group = nodeLocator(page, 'group-1')
  const groupBox = await boxOf(group)
  expectNearBox(await boxOf(a), beforeA)
  expectNearBox(await boxOf(b), beforeB)
  expect(contains(groupBox, beforeA)).toBe(true)
  expect(contains(groupBox, beforeB)).toBe(true)

  // The group body below node B is free of children.
  await dragBy(
    page,
    { x: groupBox.x + 10, y: groupBox.y + groupBox.height - 6 },
    180,
    60
  )

  const movedGroup = await boxOf(group)
  const dx = movedGroup.x - groupBox.x
  const dy = movedGroup.y - groupBox.y
  expect(Math.abs(dx - 180)).toBeLessThanOrEqual(1)
  expectNearBox(await boxOf(a), {
    ...beforeA,
    x: beforeA.x + dx,
    y: beforeA.y + dy,
  })
  expectNearBox(await boxOf(b), {
    ...beforeB,
    x: beforeB.x + dx,
    y: beforeB.y + dy,
  })
})

test('subflows: dropping a node into or out of a group changes its parent in place', async ({
  page,
}) => {
  await page.goto('/ui-recipes/subflows/')
  const status = page.getByTestId('recipe-status')
  await expect(status).toHaveAttribute('data-parents', 'A:,B:,C:,D:,E:G0')
  const c = nodeLocator(page, 'C')
  const e = nodeLocator(page, 'E')
  const g0 = nodeLocator(page, 'G0')
  const g0Box = await boxOf(g0)
  const cBox = await boxOf(c)

  // Drop C fully inside G0, clear of E.
  const target = { x: g0Box.x + 200, y: g0Box.y + 200 }
  await dragBy(
    page,
    centerOf(cBox),
    target.x - centerOf(cBox).x,
    target.y - centerOf(cBox).y
  )
  await expect(status).toHaveAttribute('data-parents', 'A:,B:,C:G0,D:,E:G0')
  const dropped = await boxOf(c)
  expectNearBox(centerOf(dropped), target, 2)
  expect(contains(g0Box, dropped)).toBe(true)

  // Dragging G0 moves C with it.
  await dragBy(
    page,
    { x: g0Box.x + 20, y: g0Box.y + g0Box.height - 10 },
    -60,
    40
  )
  const movedG0 = await boxOf(g0)
  const dx = movedG0.x - g0Box.x
  const dy = movedG0.y - g0Box.y
  expect(Math.abs(dx + 60)).toBeLessThanOrEqual(1)
  expectNearBox(await boxOf(c), {
    ...dropped,
    x: dropped.x + dx,
    y: dropped.y + dy,
  })

  // Dragging E onto the empty pane detaches it where it was dropped.
  const eBox = await boxOf(e)
  const outside = { x: 330, y: 200 }
  await dragBy(
    page,
    centerOf(eBox),
    outside.x - centerOf(eBox).x,
    outside.y - centerOf(eBox).y
  )
  await expect(status).toHaveAttribute('data-parents', 'A:,B:,C:G0,D:,E:')
  expectNearBox(centerOf(await boxOf(e)), outside, 2)
})
