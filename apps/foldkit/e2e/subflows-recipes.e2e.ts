import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

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

const open = async (page: Page) => {
  await page.goto('/ui-recipes/subflows/')
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-parents',
    'A:,B:,C:,D:,E:G0'
  )
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

const center = (box: Box): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
})

/** Poll the rendered node box; Foldkit paints accepted state on the next frame. */
const expectNodeAt = async (
  page: Page,
  nodeId: string,
  expected: Point,
  tolerance = 1
) => {
  await expect
    .poll(async () => {
      const box = await nodeBox(page, nodeId)

      return Math.max(
        Math.abs(box.x - expected.x),
        Math.abs(box.y - expected.y)
      )
    })
    .toBeLessThanOrEqual(tolerance)
}

const contains = (outer: Box, inner: Box) =>
  outer.x <= inner.x &&
  outer.y <= inner.y &&
  outer.x + outer.width >= inner.x + inner.width &&
  outer.y + outer.height >= inner.y + inner.height

test('Selection Grouping wraps the selected nodes in a new parent', async ({
  page,
}) => {
  await open(page)
  const status = page.getByTestId('recipe-status')
  const beforeA = await nodeBox(page, 'A')
  const beforeB = await nodeBox(page, 'B')

  // Foldkit's additive selection control on each node.
  await page.getByRole('button', { name: 'Toggle selection for A' }).click()
  await page.getByRole('button', { name: 'Toggle selection for B' }).click()
  await page.getByTestId('group-selection').click()

  await expect(status).toHaveAttribute(
    'data-parents',
    'A:group-1,B:group-1,C:,D:,E:G0'
  )
  await expectNodeAt(page, 'A', beforeA)
  await expectNodeAt(page, 'B', beforeB)

  const group = await nodeBox(page, 'group-1')
  expect(contains(group, beforeA) && contains(group, beforeB)).toBe(true)

  // Drag the group by its body, in the gap between A and B.
  const delta = { x: 80, y: 160 }
  await dragBy(
    page,
    { x: (beforeA.x + beforeA.width + beforeB.x) / 2, y: center(beforeA).y },
    delta
  )

  await expect
    .poll(async () => {
      const box = await nodeBox(page, 'group-1')

      return box.y
    })
    .toBeCloseTo(group.y + delta.y, 0)
  await expectNodeAt(page, 'A', {
    x: beforeA.x + delta.x,
    y: beforeA.y + delta.y,
  })
  await expectNodeAt(page, 'B', {
    x: beforeB.x + delta.x,
    y: beforeB.y + delta.y,
  })
})

test('Parent Child Relation re-parents a node dropped into or out of a group', async ({
  page,
}) => {
  await open(page)
  const status = page.getByTestId('recipe-status')
  const c = await nodeBox(page, 'C')
  const g0 = await nodeBox(page, 'G0')

  // Drop C inside G0, below E.
  const intoGroup = { x: g0.x + 160 - c.x, y: g0.y + 200 - c.y }
  await dragBy(page, center(c), intoGroup)

  await expect(status).toHaveAttribute('data-parents', 'A:,B:,C:G0,D:,E:G0')
  await expectNodeAt(
    page,
    'C',
    { x: c.x + intoGroup.x, y: c.y + intoGroup.y },
    2
  )

  // Dragging G0 moves its children with it.
  const droppedC = await nodeBox(page, 'C')
  const e = await nodeBox(page, 'E')
  const groupDelta = { x: -60, y: 100 }
  await dragBy(page, { x: g0.x + 20, y: g0.y + g0.height - 20 }, groupDelta)

  await expect
    .poll(async () => {
      const box = await nodeBox(page, 'G0')

      return box.x
    })
    .toBeCloseTo(g0.x + groupDelta.x, 0)
  await expectNodeAt(page, 'C', {
    x: droppedC.x + groupDelta.x,
    y: droppedC.y + groupDelta.y,
  })

  // Drag E out of G0 onto the empty pane.
  await expectNodeAt(page, 'E', {
    x: e.x + groupDelta.x,
    y: e.y + groupDelta.y,
  })
  const movedE = await nodeBox(page, 'E')
  const outOfGroup = { x: c.x - movedE.x, y: c.y + 120 - movedE.y }
  await dragBy(page, center(movedE), outOfGroup)

  await expect(status).toHaveAttribute('data-parents', 'A:,B:,C:G0,D:,E:')
  await expectNodeAt(
    page,
    'E',
    { x: movedE.x + outOfGroup.x, y: movedE.y + outOfGroup.y },
    2
  )
})
