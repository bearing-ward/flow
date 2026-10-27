import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type { FiguresDemo } from './demo.ts'

const it = test

const { describe } = test

const kinds = ['circle', 'diamond', 'hexagon'] as const

const colors = ['#ff0071', '#1a8cff', '#00b884', '#ffb300'] as const

const outlines = {
  circle: 'M 0 50 A 50 50 0 1 0 100 50 A 50 50 0 1 0 0 50 Z',
  diamond: 'M 50 0 L 100 50 L 50 100 L 0 50 Z',
  hexagon: 'M 25 0 L 75 0 L 100 50 L 75 100 L 25 100 L 0 50 Z',
}

type Document = Awaited<ReturnType<FiguresDemo['document']>>

const read = (page: Page) =>
  page.evaluate(() => {
    if (globalThis.flowFiguresDemo === undefined) {
      throw new Error('Missing shapes recipe')
    }

    return globalThis.flowFiguresDemo.document()
  })

const past = (page: Page) =>
  page.evaluate(async () => {
    if (globalThis.flowFiguresDemo === undefined) {
      throw new Error('Missing shapes recipe')
    }

    const status = await globalThis.flowFiguresDemo.history()

    return status.pastCount
  })

const node = (page: Page, id: string) =>
  page.locator(`[data-testid="flow-node"][data-node-id="${id}"]`)

const svg = (page: Page, id: string) =>
  node(page, id).locator('[data-shape-svg]')

const mini = (page: Page, id: string) =>
  page.locator(`[data-shape-minimap="${id}"]`)

const click = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click()

const center = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Missing gesture target')
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const select = async (page: Page, id: string) => {
  await node(page, id).click({ position: { x: 55, y: 55 } })
  await expect(page.locator('#shape-colors')).toHaveAttribute(
    'data-node-id',
    id
  )
}

const drag = async (page: Page, target: Locator, dx: number, dy: number) => {
  const start = await center(target)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 8 })
  await page.mouse.up()
}

const currentNode = async (page: Page, id: string) => {
  const document = await read(page)

  return document.nodes.find((candidate) => candidate.id === id)
}

const nodeValue = async <K extends keyof Document['nodes'][number]>(
  page: Page,
  id: string,
  key: K
) => {
  const current = await currentNode(page, id)

  return current?.[key]
}

const nodeX = async (page: Page, id: string) => {
  const position = await nodeValue(page, id, 'position')

  return position?.x
}

const boxValue = async (page: Page, id: string, key: 'x' | 'width') => {
  const box = await node(page, id).boundingBox()

  return box?.[key]
}

const edgeCount = async (page: Page) => {
  const document = await read(page)

  return document.edges.length
}

const connect = async (page: Page, source: string, target: string) => {
  const start = await center(
    node(page, source).locator('[data-handle-id="out"]')
  )

  const end = await center(node(page, target).locator('[data-handle-id="in"]'))
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 12 })
  await page.mouse.up()
  await expect.poll(async () => await edgeCount(page)).toBe(1)
}

/** Compare real SVG endpoints in screen space with the outside of each physical handle box. */
const assertAttached = async (page: Page, source: string, target: string) => {
  await expect
    .poll(() =>
      page.evaluate(
        ({ source: from, target: to }) => {
          const path = document.querySelector(
            '.flow-edge-path, .flow-vue-edge-path, .flow-foldkit-edge-path'
          )

          const sourceHandle = document.querySelector(
            `[data-testid="flow-node"][data-node-id="${from}"] [data-handle-id="out"]`
          )

          const targetHandle = document.querySelector(
            `[data-testid="flow-node"][data-node-id="${to}"] [data-handle-id="in"]`
          )

          if (
            !(path instanceof SVGPathElement) ||
            sourceHandle === null ||
            targetHandle === null
          ) {
            return 999
          }

          const matrix = path.getScreenCTM()

          if (matrix === null) {
            return 999
          }

          const start = path.getPointAtLength(0).matrixTransform(matrix)

          const end = path
            .getPointAtLength(path.getTotalLength())
            .matrixTransform(matrix)

          const a = sourceHandle.getBoundingClientRect()
          const b = targetHandle.getBoundingClientRect()

          return Math.max(
            Math.hypot(start.x - a.right, start.y - (a.y + a.height / 2)),
            Math.hypot(end.x - b.left, end.y - (b.y + b.height / 2))
          )
        },
        { source, target }
      )
    )
    .toBeLessThan(1.5)
}

const semantic = (document: Document) => ({
  nodes: document.nodes.map(
    ({ selected: _selected, measured: _measured, ...value }) => value
  ),
  edges: document.edges.map(({ selected: _selected, ...value }) => value),
})

export const figuresAcceptance = (host: string): void => {
  describe(`${host} figure palette`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 900 })
      await page.goto('/shapes/')
      await expect(node(page, 'hexagon')).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(() => globalThis.flowFiguresDemo !== undefined)
        )
        .toBe(true)
      await expect(mini(page, 'circle')).toBeVisible()
    })

    for (const [index, type] of kinds.entries()) {
      it(`keeps ${type} chrome absent until selection or keyboard focus`, async ({
        page,
      }) => {
        const wrapper = node(page, type)
        await expect(wrapper).not.toHaveClass(/selected/u)
        await Promise.all(
          ['top', 'right', 'bottom', 'left'].map((side) =>
            expect(wrapper).toHaveCSS(`border-${side}-width`, '0px')
          )
        )
        await expect(wrapper).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
        await wrapper.hover()
        await expect(wrapper).toHaveCSS('box-shadow', 'none')
        await expect(wrapper).toHaveCSS('outline-style', 'none')
        await page.keyboard.press('Tab')
        await wrapper.focus()
        await expect(wrapper).toBeFocused()
        await expect(wrapper).toHaveCSS('outline-style', 'solid')
        await expect(wrapper).toHaveCSS('outline-width', '2px')
        await expect(wrapper).toHaveCSS('outline-color', 'rgb(37, 99, 235)')
        await select(page, type)
        await page
          .getByRole('button', { name: 'Create circle', exact: true })
          .focus()
        await expect(wrapper).not.toBeFocused()
        await expect(wrapper).toHaveClass(/selected/u)
        await expect(wrapper).toHaveCSS('outline-style', 'solid')
        await expect(wrapper).toHaveCSS('outline-width', '2px')
        await page.locator('#app').click({ position: { x: 20, y: 500 } })
        await expect(wrapper).not.toHaveClass(/selected/u)
        await expect(wrapper).toHaveCSS('outline-style', 'none')
      })

      it(`renders and creates ${type} with a matching minimap and one-step history`, async ({
        page,
      }) => {
        await expect(svg(page, type).locator('path')).toHaveAttribute(
          'd',
          outlines[type]
        )
        await expect(mini(page, type).locator('path')).toHaveAttribute(
          'd',
          outlines[type]
        )
        await expect(mini(page, type).locator('path')).toHaveAttribute(
          'fill',
          colors[index] ?? ''
        )
        const before = await past(page)
        await click(page, `Create ${type}`)
        await expect(node(page, `${type}-1`)).toBeVisible()
        await expect.poll(() => past(page)).toBe(before + 1)
        await expect(mini(page, `${type}-1`).locator('path')).toHaveAttribute(
          'd',
          outlines[type]
        )
        await click(page, 'Undo')
        await expect(node(page, `${type}-1`)).toHaveCount(0)
        await click(page, 'Redo')
        await expect(node(page, `${type}-1`)).toBeVisible()
      })
    }

    for (const type of kinds) {
      for (const color of colors) {
        it(`recolors ${type} to ${color} with matching minimap and one-step history`, async ({
          page,
        }) => {
          await select(page, type)
          await expect(
            page.getByRole('navigation', { name: 'Shape color', exact: true })
          ).toBeVisible()
          const before = await currentNode(page, type)
          const count = await past(page)
          await click(page, `Color ${color}`)
          await expect(svg(page, type).locator('path')).toHaveAttribute(
            'fill',
            color
          )
          await expect(mini(page, type).locator('path')).toHaveAttribute(
            'fill',
            color
          )
          const colored = await currentNode(page, type)
          expect(colored?.data?.['opaque']).toEqual({ keep: ['shape', 7] })

          if (before?.data?.['color'] === color) {
            expect(await past(page)).toBe(count)
          } else {
            await expect.poll(() => past(page)).toBe(count + 1)
            await click(page, 'Undo')
            await expect(svg(page, type).locator('path')).toHaveAttribute(
              'fill',
              String(before?.data?.['color'])
            )
            await click(page, 'Redo')
            await expect(mini(page, type).locator('path')).toHaveAttribute(
              'fill',
              color
            )
          }
        })
      }
    }

    for (const [index, type] of kinds.entries()) {
      it(`connects, moves and resizes ${type}, retaining physical attachments and one undo step per gesture`, async ({
        page,
      }) => {
        const target = kinds[(index + 1) % kinds.length] ?? 'circle'
        await connect(page, type, target)
        await assertAttached(page, type, target)
        await select(page, type)
        const position = await nodeValue(page, type, 'position')
        const count = await past(page)
        await drag(page, svg(page, type), 40, 30)
        await expect
          .poll(async () => await nodeValue(page, type, 'position'))
          .toEqual({ x: (position?.x ?? 0) + 40, y: (position?.y ?? 0) + 30 })
        await expect.poll(() => past(page)).toBe(count + 1)
        await assertAttached(page, type, target)
        await click(page, 'Undo')
        await expect
          .poll(async () => await nodeValue(page, type, 'position'))
          .toEqual(position)
        await click(page, 'Redo')
        await expect
          .poll(async () => await nodeX(page, type))
          .toBe((position?.x ?? 0) + 40)
        await click(page, 'Transform viewport')
        const beforeBox = await node(page, type).boundingBox()
        await expect
          .poll(async () => await boxValue(page, type, 'width'))
          .toBe(90)
        const size = await nodeValue(page, type, 'size')
        const resizeCount = await past(page)

        const control = node(page, type).getByRole('button', {
          name: `Resize ${type} from bottom right`,
          exact: true,
        })

        await expect(control).toBeVisible()
        await drag(page, control, 30, 15)
        await expect
          .poll(async () => await nodeValue(page, type, 'size'))
          .toEqual({
            width: (size?.width ?? 0) + 40,
            height: (size?.height ?? 0) + 20,
          })
        await expect.poll(() => past(page)).toBe(resizeCount + 1)
        await expect(svg(page, type).locator('path')).toHaveAttribute(
          'd',
          outlines[type]
        )
        await expect(mini(page, type)).toHaveAttribute('width', '160')
        await expect(mini(page, type)).toHaveAttribute('height', '140')
        await assertAttached(page, type, target)
        await click(page, 'Color #ffb300')
        await assertAttached(page, type, target)
        await click(page, 'Undo')
        await click(page, 'Undo')
        await expect
          .poll(async () => await nodeValue(page, type, 'size'))
          .toEqual(size)
        await assertAttached(page, type, target)
        expect(beforeBox).not.toBeNull()
      })
    }

    it('preserves shapes, colors, bounds and metadata through clipboard, save/load and malformed-load rejection', async ({
      page,
    }) => {
      await select(page, 'diamond')
      await click(page, 'Color #ffb300')
      const original = await currentNode(page, 'diamond')
      const count = await past(page)
      await click(page, 'Copy')
      await click(page, 'Paste')
      await expect(node(page, 'diamond-copy-1')).toBeVisible()
      const pasted = await currentNode(page, 'diamond-copy-1')
      expect(pasted?.data).toEqual(original?.data)
      expect(pasted?.size).toEqual(original?.size)
      expect(pasted?.handles?.map(({ side, kind }) => [side, kind])).toEqual([
        ['left', 'target'],
        ['right', 'source'],
      ])
      await expect(
        mini(page, 'diamond-copy-1').locator('path')
      ).toHaveAttribute('fill', '#ffb300')
      await expect.poll(() => past(page)).toBe(count + 1)
      await click(page, 'Undo')
      await expect(node(page, 'diamond-copy-1')).toHaveCount(0)
      await click(page, 'Redo')
      await expect(node(page, 'diamond-copy-1')).toBeVisible()
      await click(page, 'Save')
      const saved = semantic(await read(page))
      await select(page, 'circle')
      await click(page, 'Color #00b884')
      await click(page, 'Load')
      await expect.poll(async () => semantic(await read(page))).toEqual(saved)
      await expect(
        mini(page, 'diamond-copy-1').locator('path')
      ).toHaveAttribute('fill', '#ffb300')
      const before = semantic(await read(page))
      const beforeHistory = await past(page)
      await click(page, 'Load malformed shape')
      await expect(page.locator('#shape-status')).toContainText(
        'Shape data rejected'
      )
      expect(semantic(await read(page))).toEqual(before)
      expect(await past(page)).toBe(beforeHistory)
    })

    it('uses native pan and zoom without changing figure meaning or history, and disposes controls', async ({
      page,
    }) => {
      const before = semantic(await read(page))
      const count = await past(page)
      const initial = await node(page, 'circle').boundingBox()
      const app = await page.locator('#app').boundingBox()

      if (initial === null || app === null) {
        throw new Error('Missing canvas bounds')
      }

      await page.mouse.move(app.x + 20, app.y + 500)
      await page.mouse.down()
      await page.mouse.move(app.x + 90, app.y + 540, { steps: 8 })
      await page.mouse.up()
      await expect
        .poll(async () => await boxValue(page, 'circle', 'x'))
        .toBeCloseTo(initial.x + 70, 0)
      await page.mouse.wheel(0, -150)
      await expect
        .poll(async () => await boxValue(page, 'circle', 'width'))
        .toBeGreaterThan(initial.width)
      expect(semantic(await read(page))).toEqual(before)
      expect(await past(page)).toBe(count)
      await expect(mini(page, 'circle').locator('path')).toHaveAttribute(
        'd',
        outlines.circle
      )
      await click(page, 'Dispose')
      await expect(node(page, 'circle')).toHaveCount(0)
      expect(
        await page.evaluate(() => globalThis.flowFiguresDemo)
      ).toBeUndefined()
      await click(page, 'Create circle')
      await expect(node(page, 'circle-1')).toHaveCount(0)
    })
  })
}
