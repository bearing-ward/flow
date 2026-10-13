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
  page.locator(`.flow-vue-node[data-node-id="${id}"]`)

const boxOf = async (locator: Locator): Promise<Box> => {
  await expect(locator).toHaveCSS('visibility', 'visible')
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Element has no bounding box')
  }

  return box
}

const centerOf = (box: Box): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
})

const open = async (page: Page, scene: string) => {
  await page.goto(`/ui-recipes/intersections/?scene=${scene}`)
  const status = page.getByTestId('recipe-status')
  await expect(status).toHaveAttribute('data-bounds', /^\d+,\d+,[1-9]/u)

  return status
}

/** Press on a node and cross the 1px drag threshold; the caller moves and releases. */
const pressNode = async (page: Page, id: string): Promise<Point> => {
  const start = centerOf(await boxOf(nodeLocator(page, id)))
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 3, start.y)

  return start
}

const moveTo = (page: Page, from: Point, dx: number, dy: number) =>
  page.mouse.move(from.x + dx, from.y + dy, { steps: 10 })

test('intersections: a dragged node reports the nodes and area it overlaps', async ({
  page,
}) => {
  const status = await open(page, 'intersections')
  await expect(status).toHaveAttribute('data-bounds', '40,40,540,210')

  const start = await pressNode(page, '1')
  await moveTo(page, start, 0, 120)
  await expect(status).toHaveAttribute('data-intersecting', '2')
  await expect(status).toHaveAttribute('data-in-area', 'false')

  await moveTo(page, start, -150, 40)
  await expect(status).toHaveAttribute('data-intersecting', 'area')
  await expect(status).toHaveAttribute('data-in-area', 'true')
  await page.mouse.up()

  await page.getByTestId('to-object').click()
  await expect(status).toHaveAttribute('data-object', '5:0:1')
})

const collisionIds = ['A', 'B', 'C', 'D'] as const

/** Rendered boxes of the collision scene's nodes, by id. */
const collisionBoxes = async (page: Page) =>
  new Map(
    await Promise.all(
      collisionIds.map(
        async (id) => [id, await boxOf(nodeLocator(page, id))] as const
      )
    )
  )

/** Pairs whose rendered boxes overlap, like `A/B`. */
const overlappingPairs = (boxes: ReadonlyMap<string, Box>): string =>
  collisionIds
    .flatMap((first, index) =>
      collisionIds.slice(index + 1).flatMap((second) => {
        const a = boxes.get(first)
        const b = boxes.get(second)

        if (a === undefined || b === undefined) {
          return []
        }

        const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
        const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)

        return x > 0 && y > 0 ? [`${first}/${second}`] : []
      })
    )
    .join(',')

const movedBy = (before: Box | undefined, after: Box | undefined): number =>
  before === undefined || after === undefined
    ? 0
    : Math.hypot(after.x - before.x, after.y - before.y)

test('node collisions: resolving and dropping move nodes until none overlap', async ({
  page,
}) => {
  const status = await open(page, 'node-collisions')
  await expect(status).toHaveAttribute('data-overlapping', 'A/B,A/C,B/C')

  const initial = await collisionBoxes(page)
  expect(overlappingPairs(initial)).toBe('A/B,A/C,B/C')

  await page.getByTestId('resolve-collisions').click()

  // Rendered boxes, not the status line, prove the nodes really moved apart.
  await expect
    .poll(async () => {
      const boxes = await collisionBoxes(page)

      return {
        overlapping: overlappingPairs(boxes),
        moved: (['A', 'B', 'C'] as const).some(
          (id) => movedBy(initial.get(id), boxes.get(id)) > 1
        ),
      }
    })
    .toStrictEqual({ overlapping: '', moved: true })
  await expect(status).toHaveAttribute('data-overlapping', '')

  const resolved = await collisionBoxes(page)
  const a = resolved.get('A')
  const d = resolved.get('D')

  if (a === undefined || d === undefined) {
    throw new Error('Missing collision nodes')
  }

  const start = await pressNode(page, 'D')
  const dx = a.x + 30 - d.x
  const dy = a.y + 10 - d.y
  await moveTo(page, start, dx, dy)
  await expect(status).toHaveAttribute('data-overlapping', /A\/D|D\//u)
  await page.mouse.up()

  // The dropped node stays where it was dropped; A makes room.
  await expect
    .poll(async () => {
      const boxes = await collisionBoxes(page)
      const dropped = boxes.get('D')

      return {
        overlapping: overlappingPairs(boxes),
        aMoved: movedBy(resolved.get('A'), boxes.get('A')) > 1,
        dStayed:
          dropped !== undefined &&
          Math.abs(dropped.x - (d.x + dx)) <= 2 &&
          Math.abs(dropped.y - (d.y + dy)) <= 2,
      }
    })
    .toStrictEqual({ overlapping: '', aMoved: true, dStayed: true })
  await expect(status).toHaveAttribute('data-overlapping', '')
})

test('edge intersection: crossing markers follow the edge paths live', async ({
  page,
}) => {
  const status = await open(page, 'edge-intersection')
  await expect(status).toHaveAttribute('data-crossings', '1')
  await expect(page.getByTestId('edge-crossing')).toHaveCount(1)

  const start = await pressNode(page, 'D')
  await moveTo(page, start, 0, 340)
  await expect(status).toHaveAttribute('data-crossings', '0')
  await expect(page.getByTestId('edge-crossing')).toHaveCount(0)
  await page.mouse.up()
  await expect(status).toHaveAttribute('data-crossings', '0')
})

test('edge intersection: a node dragged over edges reports them', async ({
  page,
}) => {
  const status = await open(page, 'edge-intersection')
  const marker = await boxOf(page.getByTestId('edge-crossing'))
  const start = await pressNode(page, 'X')
  const target = centerOf(marker)
  await moveTo(page, start, target.x - start.x, target.y - start.y)
  await expect(status).toHaveAttribute('data-under-node', 'A-B,C-D')
  await page.mouse.up()
})

test('proximity connect: dropping near a node adds an edge, far away does not', async ({
  page,
}) => {
  const status = await open(page, 'proximity-connect')
  await expect(status).toHaveAttribute('data-edges', '')

  const a = await pressNode(page, 'A')
  await moveTo(page, a, 260, -100)
  await expect(status).toHaveAttribute('data-proximity', 'A>B')
  await expect(page.getByTestId('proximity-preview')).toHaveCount(1)
  await page.mouse.up()
  await expect(status).toHaveAttribute('data-edges', 'A-B')
  await expect(page.getByTestId('proximity-preview')).toHaveCount(0)

  const c = await pressNode(page, 'C')
  await moveTo(page, c, 300, 100)
  await expect(status).toHaveAttribute('data-proximity', '')
  await page.mouse.up()
  await expect(status).toHaveAttribute('data-edges', 'A-B')
})
