import { expect, test as it } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { GroupingFixture } from './grouping-fixture.ts'

const node = (page: Page, id: string) =>
  page.locator(`[data-node-id="${id}"]`).first()

const box = async (page: Page, id: string) => {
  const bounds = await node(page, id).boundingBox()

  if (bounds === null) {
    throw new Error(`Missing ${id}`)
  }

  return bounds
}

type GroupingState = Awaited<ReturnType<GroupingFixture['read']>>

const read = (page: Page): Promise<GroupingState> =>
  page.evaluate(() => {
    if (globalThis.flowGroupingFixture === undefined) {
      throw new Error('Missing grouping fixture')
    }

    return globalThis.flowGroupingFixture.read()
  })

const pastCount = async (page: Page) => {
  const state = await read(page)

  return state.history.pastCount
}

const documentNode = async (page: Page, id: string) => {
  const state = await read(page)

  return state.document.nodes.find((item) => item.id === id)
}

const parentOf = async (page: Page, id: string) => {
  const item = await documentNode(page, id)

  return item?.parentId
}

const widthOf = async (page: Page, id: string) => {
  const bounds = await box(page, id)

  return bounds.width
}

const edges = async (page: Page) => {
  const state = await read(page)

  return state.document.edges.map(({ selected: _selected, ...edge }) => edge)
}

const near = (
  actual: { x: number; y: number },
  expected: { x: number; y: number }
) => {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(1)
}

const replay = async (page: Page, action: 'undo' | 'redo') => {
  await page.evaluate(async (direction) => {
    await globalThis.flowGroupingFixture?.[direction]()
  }, action)
}

const selectPair = async (page: Page) => {
  await node(page, 'A').click()
  await node(page, 'B').click({ modifiers: ['Meta'] })
}

const open = async (page: Page) => {
  await page.goto('/ui-recipes/subflows/')
  await page.waitForFunction(() => globalThis.flowGroupingFixture !== undefined)
  await expect(node(page, 'A')).toBeVisible()
}

export const groupingActionsContract = () => {
  it.describe('complete grouping actions', () => {
    it('shows contextual actions and groups, detaches and ungroups without jumps, one undo step each', async ({
      page,
    }) => {
      await open(page)
      await expect(page.getByTestId('group-selection')).toBeHidden()
      await expect(page.getByTestId('ungroup-selection')).toBeHidden()
      await expect(page.getByTestId('detach-selection')).toBeHidden()
      const a = await box(page, 'A')
      const b = await box(page, 'B')
      await selectPair(page)
      await expect(page.getByTestId('group-selection')).toBeVisible()
      await page.getByTestId('group-selection').click()
      await expect(node(page, 'group-1')).toBeVisible()
      near(await box(page, 'A'), a)
      near(await box(page, 'B'), b)
      await expect.poll(async () => await pastCount(page)).toBe(1)
      const grouped = await read(page)
      expect(
        grouped.document.edges.map(({ id, source, target }) => ({
          id,
          source,
          target,
        }))
      ).toEqual([{ id: 'a-b', source: 'A', target: 'B' }])
      await replay(page, 'undo')
      await expect(node(page, 'group-1')).toHaveCount(0)
      near(await box(page, 'A'), a)
      near(await box(page, 'B'), b)
      await replay(page, 'redo')
      await expect(node(page, 'group-1')).toBeVisible()
      const restoredGroup = await box(page, 'group-1')
      await page.mouse.click(restoredGroup.x + 6, restoredGroup.y + 6)
      await expect(page.getByTestId('ungroup-selection')).toBeVisible()
      await node(page, 'A').click()
      await expect(page.getByTestId('detach-selection')).toBeVisible()
      await page.getByTestId('detach-selection').click()
      await expect.poll(async () => await parentOf(page, 'A')).toBeUndefined()
      near(await box(page, 'A'), a)
      near(await box(page, 'B'), b)
      expect(await pastCount(page)).toBe(2)
      await replay(page, 'undo')
      await expect.poll(async () => await parentOf(page, 'A')).toBe('group-1')
      const group = await box(page, 'group-1')
      await page.mouse.click(group.x + 6, group.y + 6)
      await it.info().attach('ungroup-state', {
        body: JSON.stringify(await read(page)),
        contentType: 'application/json',
      })
      await page.getByTestId('ungroup-selection').click()
      await expect(node(page, 'group-1')).toHaveCount(0)
      near(await box(page, 'A'), a)
      near(await box(page, 'B'), b)
      expect(await edges(page)).toEqual(grouped.document.edges)
      expect(await pastCount(page)).toBe(2)
      await replay(page, 'undo')
      await expect(node(page, 'group-1')).toBeVisible()
      await replay(page, 'redo')
      await expect(node(page, 'group-1')).toHaveCount(0)
    })

    it('fits child moves and label/size changes, grows and shrinks, preserves edges, and restores one step', async ({
      page,
    }) => {
      await open(page)
      await selectPair(page)
      await page.getByTestId('group-selection').click()
      await expect(node(page, 'group-1')).toBeVisible()
      const original = await box(page, 'group-1')
      const a = await box(page, 'A')
      const b = await box(page, 'B')

      const paths = await page
        .locator('path[d^="M"]')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('d'))
        )

      await page.evaluate(async () => {
        await globalThis.flowGroupingFixture?.edit({
          operations: [
            {
              kind: 'update-node',
              nodeId: 'B',
              patch: {
                label: 'A much longer label',
                size: { width: 250, height: 90 },
              },
            },
          ],
        })
      })
      await it.info().attach('authored-size-state', {
        body: JSON.stringify({
          state: await read(page),
          dom: await node(page, 'B').evaluate((element) => ({
            style: element.getAttribute('style'),
            measured: element.dataset.measuredWidth,
          })),
        }),
        contentType: 'application/json',
      })
      await expect.poll(async () => await widthOf(page, 'B')).toBe(250)
      const grown = await box(page, 'group-1')
      expect(grown.width).toBeGreaterThan(original.width)
      near(await box(page, 'A'), a)
      near(await box(page, 'B'), b)
      expect(await pastCount(page)).toBe(2)
      await replay(page, 'undo')
      await expect
        .poll(async () => await widthOf(page, 'group-1'))
        .toBe(original.width)
      await expect
        .poll(() =>
          page
            .locator('path[d^="M"]')
            .evaluateAll((elements) =>
              elements.map((element) => element.getAttribute('d'))
            )
        )
        .toEqual(paths)
      await replay(page, 'redo')
      await expect
        .poll(async () => await widthOf(page, 'group-1'))
        .toBe(grown.width)
      await page.evaluate(async () => {
        await globalThis.flowGroupingFixture?.edit({
          operations: [
            {
              kind: 'update-node',
              nodeId: 'B',
              patch: {
                size: { width: 60, height: 30 },
                position: { x: 30, y: 100 },
              },
            },
          ],
        })
      })
      await expect
        .poll(async () => await widthOf(page, 'group-1'))
        .toBeLessThan(grown.width)
      near(await box(page, 'A'), a)
      const fitted = await box(page, 'group-1')
      const child = await box(page, 'B')
      expect(child.x - fitted.x).toBeGreaterThanOrEqual(20)
      expect(
        fitted.x + fitted.width - child.x - child.width
      ).toBeGreaterThanOrEqual(20)
    })

    it('refits after a child drag and retains the drop-outside detach gesture', async ({
      page,
    }) => {
      await open(page)
      await selectPair(page)
      await page.getByTestId('group-selection').click()
      await expect(node(page, 'group-1')).toBeVisible()
      const a = await box(page, 'A')
      const b = await box(page, 'B')
      const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 }
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 3, start.y + 3)
      await page.mouse.move(start.x + 20, start.y + 10, { steps: 8 })
      await page.mouse.up()
      await expect.poll(() => parentOf(page, 'A')).toBe('group-1')
      near(await box(page, 'A'), { x: a.x + 20, y: a.y + 10 })
      near(await box(page, 'B'), b)
      const moved = await box(page, 'A')
      const group = await box(page, 'group-1')
      expect(
        group.x + group.width - moved.x - moved.width
      ).toBeGreaterThanOrEqual(20)

      const from = {
        x: moved.x + moved.width / 2,
        y: moved.y + moved.height / 2,
      }

      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x + 3, from.y + 3)
      await page.mouse.move(350, 480, { steps: 10 })
      await page.mouse.up()
      await expect.poll(() => parentOf(page, 'A')).toBeUndefined()
      const detached = await box(page, 'A')
      near(
        {
          x: detached.x + detached.width / 2,
          y: detached.y + detached.height / 2,
        },
        { x: 350, y: 480 }
      )
      near(await box(page, 'B'), b)
      expect(await parentOf(page, 'B')).toBe('group-1')
    })

    it('moves a fitted group and every descendant together', async ({
      page,
    }) => {
      await open(page)
      await selectPair(page)
      await page.getByTestId('group-selection').click()
      await expect(node(page, 'group-1')).toBeVisible()
      const group = await box(page, 'group-1')
      const a = await box(page, 'A')
      const b = await box(page, 'B')
      const from = { x: group.x + 8, y: group.y + group.height - 8 }
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x + 3, from.y + 3)
      await page.mouse.move(from.x + 80, from.y + 160, { steps: 10 })
      await page.mouse.up()
      await it.info().attach('group-drag-state', {
        body: JSON.stringify({
          state: await read(page),
          group,
          a,
          b,
          after: await box(page, 'group-1'),
        }),
        contentType: 'application/json',
      })
      await expect
        .poll(async () => {
          const moved = await box(page, 'group-1')

          return moved.y
        })
        .toBeCloseTo(group.y + 160, 0)
      near(await box(page, 'A'), { x: a.x + 80, y: a.y + 160 })
      near(await box(page, 'B'), { x: b.x + 80, y: b.y + 160 })
    })

    it('refits after DOM measurements grow and shrink an intrinsic child without extra undo steps', async ({
      page,
    }) => {
      await open(page)
      await selectPair(page)
      await page.getByTestId('group-selection').click()
      await expect(node(page, 'group-1')).toBeVisible()
      const before = await box(page, 'A')
      await page.evaluate(async () => {
        const fixture = globalThis.flowGroupingFixture

        if (fixture === undefined) {
          throw new Error('Missing fixture')
        }

        const state = await fixture.read()
        await fixture.edit({
          operations: [
            {
              kind: 'set-nodes',
              nodes: state.document.nodes.map((item) => {
                if (item.id !== 'A') {
                  return item
                }

                const { size: _size, ...intrinsic } = item

                return {
                  ...intrinsic,
                  label: 'Intrinsic child',
                  style: { width: '500px', height: '70px' },
                }
              }),
            },
          ],
        })
      })
      await expect.poll(() => widthOf(page, 'A')).toBe(500)
      await expect
        .poll(async () => {
          const group = await box(page, 'group-1')
          const child = await box(page, 'A')

          return group.x + group.width - child.x - child.width
        })
        .toBeGreaterThanOrEqual(20)
      const grown = await box(page, 'group-1')
      near(await box(page, 'A'), before)
      expect(await pastCount(page)).toBe(2)
      await page.evaluate(async () => {
        await globalThis.flowGroupingFixture?.edit({
          operations: [
            {
              kind: 'update-node',
              nodeId: 'A',
              patch: {
                label: 'Small',
                style: { width: '100px', height: '40px' },
              },
            },
          ],
        })
      })
      await expect.poll(() => widthOf(page, 'A')).toBe(100)
      await expect
        .poll(() => widthOf(page, 'group-1'))
        .toBeLessThan(grown.width)
      near(await box(page, 'A'), before)
      expect(await pastCount(page)).toBe(3)
      await replay(page, 'undo')
      await expect.poll(() => widthOf(page, 'A')).toBe(500)
      await expect.poll(() => widthOf(page, 'group-1')).toBe(grown.width)
      await expect.poll(() => pastCount(page)).toBe(2)
      await expect
        .poll(async () => {
          const state = await read(page)

          return state.history.futureCount
        })
        .toBe(1)
    })

    it('keeps nested groups, selection and coordinates through zoom and a saved-document round trip', async ({
      page,
    }) => {
      await open(page)
      await selectPair(page)
      await page.getByTestId('group-selection').click()
      await expect(node(page, 'group-1')).toBeVisible()
      const a = await box(page, 'A')
      await page.getByTestId('group-selection').click()
      await expect(node(page, 'group-2')).toBeVisible()
      near(await box(page, 'A'), a)
      expect(await parentOf(page, 'group-1')).toBe('group-2')
      await page.evaluate(async () => {
        await globalThis.flowGroupingFixture?.zoom()
      })
      await expect
        .poll(async () => await widthOf(page, 'A'))
        .toBeCloseTo(a.width * 0.75, 0)
      const zoomed = await box(page, 'A')
      const before = await edges(page)
      await page.evaluate(async () => {
        await globalThis.flowGroupingFixture?.saveLoad()
      })
      await expect
        .poll(async () => await parentOf(page, 'group-1'))
        .toBe('group-2')
      near(await box(page, 'A'), zoomed)
      expect(await edges(page)).toEqual(before)
      const outer = await box(page, 'group-2')
      await page.mouse.click(outer.x + 4, outer.y + 4)
      await expect(page.getByTestId('ungroup-selection')).toBeVisible()
      await page.getByTestId('ungroup-selection').click()
      await expect(node(page, 'group-2')).toHaveCount(0)
      near(await box(page, 'A'), zoomed)
    })
  })
}
