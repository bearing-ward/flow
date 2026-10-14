import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface Point {
  readonly x: number
  readonly y: number
}

const open = async (page: Page) => {
  await page.goto('/ui-recipes/labeled-group/')
  await expect(page.locator('[data-node-id="child-2"]')).toBeVisible()
}

const nodeBox = async (page: Page, nodeId: string): Promise<Box> => {
  const box = await page.locator(`[data-node-id="${nodeId}"]`).boundingBox()

  if (box === null) {
    throw new Error(`Node ${nodeId} is not rendered`)
  }

  return box
}

/** Real mouse drag; moves 3px past the 1px threshold before travelling. */
const dragBy = async (page: Page, from: Point, delta: Point) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(from.x + delta.x, from.y + delta.y, { steps: 10 })
  await page.mouse.up()
}

const inside = (outer: Box, inner: Box, tolerance = 1): boolean =>
  inner.x >= outer.x - tolerance &&
  inner.y >= outer.y - tolerance &&
  inner.x + inner.width <= outer.x + outer.width + tolerance &&
  inner.y + inner.height <= outer.y + outer.height + tolerance

test('the labeled group renders its title in the top-left corner and its children inside', async ({
  page,
}) => {
  await open(page)

  const label = page.locator(
    '[data-node-id="group"] [data-flow-labeled-group-label="top-left"]'
  )

  await expect(label).toHaveText('Group A')
  await expect(
    page.locator('[data-node-id="group"] [role="group"]')
  ).toHaveAttribute('aria-label', 'Group A')

  const group = await nodeBox(page, 'group')
  const title = await label.boundingBox()

  expect(
    title !== null &&
      Math.abs(title.x - group.x) <= 2 &&
      Math.abs(title.y - group.y) <= 2
  ).toBeTruthy()
  expect([
    inside(group, await nodeBox(page, 'child-1')),
    inside(group, await nodeBox(page, 'child-2')),
    inside(group, await nodeBox(page, 'outside')),
  ]).toStrictEqual([true, true, false])
})

test('dragging the group moves its children with it', async ({ page }) => {
  await open(page)

  const group = await nodeBox(page, 'group')
  const first = await nodeBox(page, 'child-1')
  const second = await nodeBox(page, 'child-2')

  // Press on the frame below the title, away from both children.
  await dragBy(page, { x: group.x + 300, y: group.y + 40 }, { x: 90, y: 60 })
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-positions',
    /group@170,140 child-1@30,60 child-2@220,170/u
  )
  await expect
    .poll(async () => {
      const moved = await nodeBox(page, 'child-1')

      return [Math.round(moved.x - first.x), Math.round(moved.y - first.y)]
    })
    .toStrictEqual([90, 60])

  const movedSecond = await nodeBox(page, 'child-2')

  expect([
    Math.round(movedSecond.x - second.x),
    Math.round(movedSecond.y - second.y),
  ]).toStrictEqual([90, 60])
})

test('a child with extent parent stays inside the group while dragged out', async ({
  page,
}) => {
  await open(page)

  const child = await nodeBox(page, 'child-2')

  await dragBy(
    page,
    { x: child.x + child.width / 2, y: child.y + child.height / 2 },
    { x: 400, y: 300 }
  )
  // The group is 380x260 and the child 120x44: the child stops at its corner.
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-positions',
    /child-2@260,216/u
  )
  expect(
    inside(await nodeBox(page, 'group'), await nodeBox(page, 'child-2'))
  ).toBeTruthy()

  const moved = await nodeBox(page, 'child-1')

  await dragBy(
    page,
    { x: moved.x + moved.width / 2, y: moved.y + moved.height / 2 },
    { x: -300, y: -300 }
  )
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-positions',
    /child-1@0,0/u
  )
})
