import { expect, test as it } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { TreeDemo } from './demo.ts'

const { describe } = it

const status = (page: Page) => page.locator('#tree-status')

const node = (page: Page, id: string) =>
  page.locator(`[data-testid=flow-node][data-node-id="${id}"]`)

const read = (page: Page): ReturnType<TreeDemo['read']> =>
  page.evaluate(() => {
    if (globalThis.flowTreeDemo === undefined) {
      throw new Error('Missing tree recipe API')
    }

    return globalThis.flowTreeDemo.read()
  })

const past = (page: Page) =>
  page.evaluate(() =>
    globalThis.flowTreeDemo?.history().then(({ pastCount }) => pastCount)
  )

const ready = (page: Page) =>
  expect(status(page)).toHaveAttribute('data-state', 'ready')

const button = async (page: Page, name: string, keyboard = false) => {
  const control = page.getByRole('button', { name, exact: true })

  if (keyboard) {
    await control.focus()
    await control.press('Enter')
  } else {
    await control.click()
  }

  await ready(page)
}

const open = async (page: Page, route = 'expand-collapse') => {
  await page.goto(`/${route}/`)
  await ready(page)
  await expect(
    page.getByRole('button', { name: 'Toggle root', exact: true })
  ).toBeVisible()
}

const duration = async (page: Page, value: string) => {
  await page.getByLabel('Animation duration').fill(value)
  await page.getByLabel('Animation duration').press('Tab')
}

const drawn = (page: Page) =>
  page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid=flow-node][data-node-id]'
      ),
    ].map((element) => {
      const style = getComputedStyle(element)
      const transform = new DOMMatrixReadOnly(style.transform)

      return {
        id: element.dataset.nodeId,
        x: (Number(style.left.replace(/px$/u, '')) || 0) + transform.e,
        y: (Number(style.top.replace(/px$/u, '')) || 0) + transform.f,
      }
    })
  )

const exact = async (page: Page) => {
  await expect
    .poll(async () => {
      const { document } = await read(page)
      const actual = await drawn(page)

      return actual.filter((value) => {
        const target = document.nodes.find(({ id }) => id === value.id)

        return (
          target === undefined ||
          Math.abs(value.x - target.position.x) > 0.01 ||
          Math.abs(value.y - target.position.y) > 0.01
        )
      })
    })
    .toEqual([])
}

const attachment = (page: Page) =>
  page.evaluate(() => {
    const path = document.querySelector<SVGPathElement>(
      'path.flow-edge-path[data-edge-id="root-branch"], [data-testid=flow-edge][data-edge-id="root-branch"] [data-testid=flow-edge-path], svg.flow-foldkit-edge[data-edge-id="root-branch"] path'
    )

    const source = document
      .querySelector(
        '[data-node-id="root"] [data-handle-kind="source"], [data-node-id="root"] [data-handle-id="source"]'
      )
      ?.getBoundingClientRect()

    const target = document
      .querySelector(
        '[data-node-id="branch"] [data-handle-kind="target"], [data-node-id="branch"] [data-handle-id="target"]'
      )
      ?.getBoundingClientRect()

    const matrix = path?.getScreenCTM()

    if (
      path === null ||
      matrix === null ||
      matrix === undefined ||
      source === undefined ||
      target === undefined
    ) {
      throw new Error('Missing tree edge geometry')
    }

    const start = path.getPointAtLength(0).matrixTransform(matrix)

    const end = path
      .getPointAtLength(path.getTotalLength())
      .matrixTransform(matrix)

    return Math.max(
      Math.hypot(
        start.x - source.x - source.width / 2,
        start.y - source.bottom
      ),
      Math.hypot(end.x - target.x - target.width / 2, end.y - target.top)
    )
  })

export const treeAcceptance = (host: string) => {
  describe(`${host} dynamic tree editing and expand/collapse`, () => {
    it('promotes a placeholder, grows branches and inserts through an edge plus with one undo step per gesture', async ({
      page,
    }) => {
      await open(page, 'dynamic-layouting')
      const before = await past(page)
      await node(page, 'placeholder').click({ position: { x: 70, y: 15 } })
      await ready(page)
      const state1 = await read(page)
      expect(
        state1.document.nodes.find(({ id }) => id === 'placeholder')?.data
      ).toEqual({
        tree: { version: 1, kind: 'node', expanded: true },
        opaque: { keep: ['tree', 160] },
      })
      expect(await past(page)).toBe((before ?? 0) + 1)
      await button(page, 'Add child placeholder')
      await expect(node(page, 'child-1')).toBeVisible()
      expect(await past(page)).toBe((before ?? 0) + 2)
      await button(page, '+ root-branch', true)
      const { document } = await read(page)
      expect(
        document.edges.find(({ id }) => id === 'root-branch')
      ).toMatchObject({
        source: 'root',
        target: 'insert-2',
        label: 'kept edge',
        stroke: '#336699',
        data: { opaque: { retained: [160, 'edge'] } },
      })
      expect(
        document.edges.find(({ id }) => id === 'insert-edge-2')
      ).toMatchObject({
        source: 'insert-2',
        target: 'branch',
        data: { opaque: { retained: [160, 'edge'] } },
      })
      expect(await past(page)).toBe((before ?? 0) + 3)
      await exact(page)
      await button(page, 'Undo')
      await expect(node(page, 'insert-2')).toHaveCount(0)
      const state2 = await read(page)
      expect(
        state2.document.edges.find(({ id }) => id === 'root-branch')?.target
      ).toBe('branch')
      await button(page, 'Redo', true)
      await expect(node(page, 'insert-2')).toBeVisible()
      await exact(page)
    })

    it('adds child placeholders by clicking regular nodes and promotes them with a replacement placeholder', async ({
      page,
    }) => {
      await open(page, 'dynamic-layouting')
      const before = await past(page)
      await node(page, 'root').click({ position: { x: 70, y: 15 } })
      await ready(page)
      await expect(node(page, 'child-1')).toBeVisible()
      const added = await read(page)
      expect(
        added.document.nodes.find(({ id }) => id === 'child-1')?.data?.tree
      ).toEqual({ version: 1, kind: 'placeholder', expanded: true })
      await node(page, 'child-1').focus()
      await node(page, 'child-1').press('Enter')
      await ready(page)
      await expect(node(page, 'child-1-placeholder')).toBeVisible()
      const promoted = await read(page)
      expect(
        promoted.document.nodes.find(({ id }) => id === 'child-1')?.data?.tree
      ).toEqual({ version: 1, kind: 'node', expanded: true })
      expect(promoted.document.edges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'child-1',
            target: 'child-1-placeholder',
          }),
        ])
      )
      expect(await past(page)).toBe((before ?? 0) + 2)
      await button(page, 'Undo')
      await expect(node(page, 'child-1-placeholder')).toHaveCount(0)
      await exact(page)
    })

    it('collapses multiple levels with pointer and keyboard while retaining hidden data and stable focus', async ({
      page,
    }) => {
      await open(page)
      await button(page, 'Toggle branch')
      await expect(node(page, 'leaf')).toHaveCount(0)
      await button(page, 'Toggle root', true)
      await expect(page.locator('[data-testid=flow-node]')).toHaveCount(1)
      await expect(
        page.getByRole('button', { name: 'Toggle root', exact: true })
      ).toBeFocused()
      const state3 = await read(page)
      const collapsed = state3.document
      expect(collapsed.nodes).toHaveLength(4)
      expect(collapsed.edges).toHaveLength(3)
      expect(collapsed.nodes.every(({ hidden }) => hidden === undefined)).toBe(
        true
      )
      await button(page, 'Toggle root', true)
      await expect(node(page, 'branch')).toBeVisible()
      await expect(node(page, 'leaf')).toHaveCount(0)
      await node(page, 'branch').focus()
      await node(page, 'branch').press('Enter')
      await ready(page)
      await expect(node(page, 'leaf')).toBeVisible()
      await expect(node(page, 'branch')).toBeFocused()
      const state4 = await read(page)
      expect(
        state4.document.nodes.find(({ id }) => id === 'leaf')?.data?.opaque
      ).toEqual({ keep: ['tree', 160] })
      await exact(page)
    })

    it('moves focus to the nearest visible ancestor when a focused subtree disappears', async ({
      page,
    }) => {
      await open(page)
      await node(page, 'leaf').focus()
      await page.evaluate(() =>
        globalThis.flowTreeDemo?.tree({ kind: 'toggle', nodeId: 'branch' })
      )
      await ready(page)
      await expect(node(page, 'leaf')).toHaveCount(0)
      await expect(node(page, 'branch')).toBeFocused()
      await node(page, 'branch').press('Space')
      await ready(page)
      await expect(node(page, 'leaf')).toBeVisible()
      await expect(node(page, 'branch')).toBeFocused()
    })

    it('adds beneath a collapsed parent, preserves unrelated hidden flags, and restores the complete edit with undo', async ({
      page,
    }) => {
      await open(page)
      await page.evaluate(() =>
        globalThis.flowTreeDemo?.edit({
          operations: [
            { kind: 'update-node', nodeId: 'leaf', patch: { hidden: true } },
          ],
        })
      )
      await button(page, 'Toggle branch')
      await page.getByLabel('Parent node').selectOption('branch')
      const before = await past(page)
      await button(page, 'Add child to parent', true)
      await expect(node(page, 'child-1')).toHaveCount(0)
      const state5 = await read(page)
      expect(state5.document.nodes).toHaveLength(5)
      expect(await past(page)).toBe((before ?? 0) + 1)
      await button(page, 'Toggle branch')
      await expect(node(page, 'child-1')).toBeVisible()
      await expect(node(page, 'leaf')).toHaveCount(0)
      const state6 = await read(page)
      expect(
        state6.document.nodes.find(({ id }) => id === 'leaf')?.hidden
      ).toBe(true)
      await button(page, 'Undo')
      await expect(node(page, 'child-1')).toHaveCount(0)
      await button(page, 'Undo')
      const state7 = await read(page)
      expect(state7.document.nodes).toHaveLength(4)
    })

    it('animates the visible hierarchy under pan and zoom with attached edges and exact final positions', async ({
      page,
    }) => {
      await open(page)
      await duration(page, '1600')
      await button(page, 'Pan and zoom')
      const before = await past(page)
      await page
        .getByRole('button', { name: 'Add child root', exact: true })
        .click()
      await expect(status(page)).toHaveAttribute('data-state', 'running')
      await expect
        .poll(async () => {
          const state8 = await drawn(page)
          const value = state8.find(({ id }) => id === 'root')

          return value !== undefined && value.y > 30 && value.y < 59
        })
        .toBe(true)
      await expect.poll(() => attachment(page)).toBeLessThan(1)
      await ready(page)
      await exact(page)
      expect(await past(page)).toBe((before ?? 0) + 1)
      const state9 = await read(page)
      const positions = state9.document.nodes.map(({ position }) => position)
      await button(page, 'Undo')
      await expect(node(page, 'child-1')).toHaveCount(0)
      await button(page, 'Redo')
      const state10 = await read(page)
      expect(state10.document.nodes.map(({ position }) => position)).toEqual(
        positions
      )
      await exact(page)
    })

    it('roundtrips nested expansion and opaque fields through save-load, clipboard and undo', async ({
      page,
    }) => {
      await open(page)
      await button(page, 'Toggle branch')
      const state11 = await read(page)
      const saved = state11.document
      await button(page, 'Save', true)
      await button(page, 'Toggle branch')
      await button(page, 'Add child root')
      await button(page, 'Load', true)
      await expect(node(page, 'leaf')).toHaveCount(0)
      await expect
        .poll(() =>
          read(page).then(({ document }) =>
            document.nodes.map(({ data }) => data)
          )
        )
        .toEqual(saved.nodes.map(({ data }) => data))
      const state12 = await read(page)
      expect(state12.document.edges).toEqual(saved.edges)
      await button(page, 'Copy tree')
      const before = await past(page)
      await button(page, 'Paste', true)
      await expect
        .poll(() => read(page).then(({ document }) => document.nodes.length))
        .toBe(8)
      const state13 = await read(page)
      const pasted = state13.document
      expect(pasted.nodes.slice(4).map(({ data }) => data)).toEqual(
        saved.nodes.map(({ data }) => data)
      )
      expect(pasted.edges.slice(3).map(({ data }) => data)).toEqual(
        saved.edges.map(({ data }) => data)
      )
      expect(new Set(pasted.nodes.map(({ id }) => id)).size).toBe(8)
      expect(await past(page)).toBe((before ?? 0) + 1)
      await button(page, 'Undo')
      await expect
        .poll(() => read(page).then(({ document }) => document.nodes.length))
        .toBe(4)
    })

    it('deletes an entire tree, rejects deleted parents, creates an empty root and undoes each command', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await open(page)
      await page.getByLabel('Parent node').selectOption('root')
      const before = await past(page)
      await button(page, 'Delete parent subtree', true)
      await expect(page.locator('[data-testid=flow-node]')).toHaveCount(0)
      const state14 = await read(page)
      expect(state14.document.edges).toEqual([])
      expect(await past(page)).toBe((before ?? 0) + 1)
      await page.evaluate(() =>
        globalThis.flowTreeDemo?.tree({
          kind: 'add-child',
          parentId: 'root',
          id: 'lost',
          edgeId: 'lost',
          label: 'Lost',
        })
      )
      await expect(status(page)).toHaveAttribute('data-state', 'error')
      const state15 = await read(page)
      expect(state15.document.nodes).toEqual([])
      expect(await past(page)).toBe((before ?? 0) + 1)
      await button(page, 'Create root', true)
      await expect(node(page, 'root')).toBeVisible()
      await button(page, 'Undo')
      await expect(node(page, 'root')).toHaveCount(0)
      await button(page, 'Undo')
      await expect(page.locator('[data-testid=flow-node]')).toHaveCount(4)
      await exact(page)
    })

    it('promotes and grows through keyboard controls and releases pending work on disposal', async ({
      page,
    }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await open(page)
      await button(page, 'Promote placeholder', true)
      await button(page, 'Add child placeholder', true)
      await expect(node(page, 'child-1')).toBeVisible()
      await duration(page, '5000')
      await page
        .getByRole('button', { name: 'Add child root', exact: true })
        .click()
      await expect(status(page)).toHaveAttribute('data-state', 'running')
      await page.getByRole('button', { name: 'Dispose', exact: true }).click()
      await expect(status(page)).toHaveAttribute('data-state', 'disposed')
      const after = await page.locator('#app').innerHTML()
      await page.evaluate(() => {
        const frame = Promise.withResolvers<undefined>()
        requestAnimationFrame(() =>
          requestAnimationFrame(() => frame.resolve(undefined))
        )

        return frame.promise
      })
      expect(await page.locator('#app').innerHTML()).toBe(after)
      expect(errors).toEqual([])
      await page.reload()
      await ready(page)
      expect(await past(page)).toBe(0)
    })
  })
}
