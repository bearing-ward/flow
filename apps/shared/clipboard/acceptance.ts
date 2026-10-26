import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { ClipboardDemo } from './demo.ts'

type DemoDocument = Awaited<ReturnType<ClipboardDemo['document']>>

const it = test

const { describe } = test

const read = (page: Page) =>
  page.evaluate(() => {
    const demo = globalThis.flowClipboardDemo

    if (demo === undefined) {
      throw new Error('Missing clipboard demo')
    }

    return demo.document()
  })

const status = (page: Page) =>
  page.evaluate(() => {
    const demo = globalThis.flowClipboardDemo

    if (demo === undefined) {
      throw new Error('Missing clipboard demo')
    }

    return demo.history()
  })

const nodeCount = async (page: Page) => {
  const document = await read(page)

  return document.nodes.length
}

const pastCount = async (page: Page) => {
  const current = await status(page)

  return current.pastCount
}

const lastNode = async (
  page: Page
): Promise<DemoDocument['nodes'][number] | undefined> => {
  const document = await read(page)

  return document.nodes.at(-1)
}

const selection = async (page: Page) => {
  const document = await read(page)

  return document.nodes.filter(({ selected }) => selected).map(({ id }) => id)
}

const node = (page: Page, id: string) =>
  page.locator(`[data-node-id="${id}"]`).first()

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click()

const focusNode = async (page: Page, id: string) => {
  await node(page, id).focus()
}

export const graphClipboardAcceptance = (host: string): void => {
  describe(`${host} session graph clipboard`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 900 })
      await page.goto('/clipboard/')
      await expect(node(page, 'a')).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(() => globalThis.flowClipboardDemo !== undefined)
        )
        .toBe(true)
      await expect.poll(async () => await nodeCount(page)).toBe(7)
    })

    it('Shift box selection, mixed edge selection, keyboard copy/paste, repeat offset and one-step undo/redo', async ({
      page,
    }) => {
      const canvas = await page.locator('#app').boundingBox()

      if (canvas === null) {
        throw new Error('Missing canvas bounds')
      }

      await page.keyboard.down('Shift')
      await page.mouse.move(canvas.x + 40, canvas.y + 35)
      await page.mouse.down()
      await page.mouse.move(canvas.x + 490, canvas.y + 160, { steps: 12 })
      await page.mouse.up()
      await page.keyboard.up('Shift')
      await expect.poll(async () => await selection(page)).toEqual(['a', 'b'])
      // Also select an unrelated edge without changing the selected nodes.
      const external = page.locator('[data-edge-id="external"] path').last()

      const point = await external.evaluate((element) => {
        if (!(element instanceof SVGPathElement)) {
          throw new TypeError('Missing edge path')
        }

        const local = element.getPointAtLength(element.getTotalLength() * 0.8)
        const matrix = element.getScreenCTM()

        if (matrix === null) {
          throw new Error('Missing edge transform')
        }

        const screen = local.matrixTransform(matrix)

        return { x: screen.x, y: screen.y }
      })

      await page.keyboard.down('Meta')
      await page.mouse.click(point.x, point.y)
      await page.keyboard.up('Meta')
      const mixed = await read(page)
      expect(mixed.edges.find(({ id }) => id === 'external')?.selected).toBe(
        true
      )
      expect(
        mixed.nodes.filter(({ selected }) => selected).map(({ id }) => id)
      ).toEqual(['a', 'b'])

      await focusNode(page, 'a')
      await page.keyboard.press('Control+c')
      await page.keyboard.press('Control+v')
      await expect.poll(async () => await nodeCount(page)).toBe(9)
      let document = await read(page)
      expect(
        document.nodes.slice(-2).map(({ id, position }) => ({ id, position }))
      ).toEqual([
        { id: 'a-copy-1', position: { x: 100, y: 90 } },
        { id: 'b-copy-1', position: { x: 340, y: 90 } },
      ])
      expect(document.edges.slice(3)).toMatchObject([
        {
          id: 'ab-copy-1',
          source: 'a-copy-1',
          target: 'b-copy-1',
          sourceHandle: 'a-copy-1-out',
          targetHandle: 'b-copy-1-in',
          data: { untouched: 'a' },
        },
      ])
      expect(document.nodes.at(-2)?.data).toEqual({
        opaque: { id: 'a', values: [1, null, true] },
      })
      await expect(node(page, 'a-copy-1')).toBeVisible()
      const original = await node(page, 'a').boundingBox()
      const pasted = await node(page, 'a-copy-1').boundingBox()
      expect((pasted?.x ?? 0) - (original?.x ?? 0)).toBeCloseTo(20, 0)
      expect((pasted?.y ?? 0) - (original?.y ?? 0)).toBeCloseTo(20, 0)
      await expect.poll(async () => await pastCount(page)).toBe(1)
      await focusNode(page, 'a-copy-1')
      await page.keyboard.press('Meta+v')
      await expect.poll(async () => await nodeCount(page)).toBe(11)
      document = await read(page)
      expect(document.nodes.at(-2)).toMatchObject({
        id: 'a-copy-2',
        position: { x: 120, y: 110 },
      })
      expect(new Set(document.nodes.map(({ id }) => id)).size).toBe(11)
      await button(page, 'Undo')
      await expect.poll(async () => await nodeCount(page)).toBe(9)
      await button(page, 'Undo')
      await expect.poll(async () => await nodeCount(page)).toBe(7)
      await expect(node(page, 'a-copy-1')).toHaveCount(0)
      await button(page, 'Redo')
      await expect.poll(async () => await nodeCount(page)).toBe(9)
      await expect(node(page, 'a-copy-1')).toBeVisible()
    })

    it('nested groups preserve descendants, parent attachments and handle paths', async ({
      page,
    }) => {
      await node(page, 'group').click({ position: { x: 12, y: 12 } })
      await button(page, 'Copy')
      await button(page, 'Paste')
      await expect.poll(async () => await nodeCount(page)).toBe(11)
      const document = await read(page)
      expect(
        document.nodes
          .slice(-4)
          .map(({ id, parentId, position }) => ({ id, parentId, position }))
      ).toEqual([
        {
          id: 'group-copy-1',
          parentId: undefined,
          position: { x: 100, y: 270 },
        },
        {
          id: 'child-copy-1',
          parentId: 'group-copy-1',
          position: { x: 20, y: 50 },
        },
        {
          id: 'nested-copy-1',
          parentId: 'group-copy-1',
          position: { x: 200, y: 40 },
        },
        {
          id: 'leaf-copy-1',
          parentId: 'nested-copy-1',
          position: { x: 30, y: 60 },
        },
      ])
      expect(document.edges.at(-1)).toMatchObject({
        id: 'nested-edge-copy-1',
        source: 'child-copy-1',
        target: 'leaf-copy-1',
        sourceHandle: 'child-copy-1-out',
        targetHandle: 'leaf-copy-1-in',
      })
      await expect(node(page, 'leaf-copy-1')).toBeVisible()
      const original = await node(page, 'leaf').boundingBox()
      const pasted = await node(page, 'leaf-copy-1').boundingBox()
      expect((pasted?.x ?? 0) - (original?.x ?? 0)).toBeCloseTo(20, 0)
      await expect(
        page.locator('[data-edge-id="nested-edge-copy-1"]').first()
      ).toBeVisible()
      await button(page, 'Undo')
      await expect.poll(async () => await nodeCount(page)).toBe(7)
    })

    it('a copied child detaches an absent parent; transformed viewport keeps graph-space placement', async ({
      page,
    }) => {
      await node(page, 'child').click({ position: { x: 40, y: 20 } })
      await button(page, 'Copy')
      await button(page, 'Transform viewport')
      await button(page, 'Paste')
      await expect.poll(async () => await nodeCount(page)).toBe(8)
      const child = await lastNode(page)
      expect(child).toMatchObject({
        id: 'child-copy-1',
        position: { x: 120, y: 320 },
      })
      expect(child?.parentId).toBeUndefined()
      expect(child?.extent).toBeUndefined()
      const original = await node(page, 'child').boundingBox()
      const pasted = await node(page, 'child-copy-1').boundingBox()
      expect((pasted?.x ?? 0) - (original?.x ?? 0)).toBeCloseTo(15, 0)
      expect((pasted?.y ?? 0) - (original?.y ?? 0)).toBeCloseTo(15, 0)
      await button(page, 'Paste at graph point')
      await expect.poll(async () => await nodeCount(page)).toBe(9)
      expect(await lastNode(page)).toMatchObject({
        id: 'child-copy-2',
        position: { x: 500, y: 200 },
      })
      await button(page, 'Undo')
      await expect.poll(async () => await nodeCount(page)).toBe(8)
      await button(page, 'Undo')
      await expect.poll(async () => await nodeCount(page)).toBe(7)
    })

    it('malformed fragments, absent parents and dangling edges cannot change the graph or replace a valid clipboard', async ({
      page,
    }) => {
      await node(page, 'a').click({ position: { x: 40, y: 20 } })
      await button(page, 'Copy')
      await button(page, 'Load fragment')
      const before = await read(page)

      await button(page, 'Malformed fragment')
      await button(page, 'Missing parent')
      await button(page, 'Dangling edge')
      expect(await read(page)).toEqual(before)
      expect(await pastCount(page)).toBe(0)

      await button(page, 'Paste')
      await expect.poll(async () => await nodeCount(page)).toBe(8)
      const pasted = await lastNode(page)
      expect(pasted).toMatchObject({
        id: 'imported-copy-1',
        position: { x: 70, y: 80 },
        data: { sourceId: 'a' },
      })
    })

    it('native text controls retain copy/paste and the empty session resets on reload', async ({
      page,
    }) => {
      await button(page, 'Paste')
      expect(await pastCount(page)).toBe(0)
      await node(page, 'a').click({ position: { x: 40, y: 20 } })
      await focusNode(page, 'a')
      await page.keyboard.press('Meta+c')
      const input = page.getByRole('textbox', { name: 'Native text' })
      await input.fill('Native text')
      await input.press('ControlOrMeta+a')
      await input.press('Control+c')
      await input.press('Control+v')
      await input.press('Meta+c')
      await input.press('Meta+v')
      await expect(input).toHaveValue('Native text')
      expect(await nodeCount(page)).toBe(7)
      await button(page, 'Paste')
      await expect.poll(async () => await nodeCount(page)).toBe(8)
      await page.reload()
      await expect(node(page, 'a')).toBeVisible()
      await button(page, 'Paste')
      expect(await nodeCount(page)).toBe(7)
      expect(await pastCount(page)).toBe(0)
    })

    it('disposal releases native clipboard gestures and revokes further canvas edits', async ({
      page,
    }) => {
      await node(page, 'a').click({ position: { x: 40, y: 20 } })
      await button(page, 'Copy')
      await button(page, 'Dispose')
      await expect(page.locator('#app [data-node-id]')).toHaveCount(0)
      await button(page, 'Copy')
      await button(page, 'Paste')
      await page.keyboard.press('Control+v')
      await page.keyboard.press('Meta+v')
      await expect(page.locator('#app [data-node-id]')).toHaveCount(0)
    })
  })
}
