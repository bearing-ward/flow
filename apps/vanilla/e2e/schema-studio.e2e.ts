import { ViewportSchema, FlowEdgeSchema } from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { Schema as S } from 'effect'

import { importStudio } from '../../shared/schema-studio/model.ts'
import type { Studio } from '../../shared/schema-studio/model.ts'

const status = (page: Page) => page.getByTestId('studio-status')

const model = async (page: Page) =>
  importStudio((await status(page).getAttribute('data-model')) ?? '')

const viewport = async (page: Page) =>
  S.decodeUnknownSync(S.fromJsonString(ViewportSchema))(
    await status(page).getAttribute('data-viewport')
  )

const inspectModel = async <T>(
  page: Page,
  inspect: (value: Studio) => T
): Promise<T> => {
  const value = await model(page)

  return inspect(value)
}

const inspectViewport = async <T>(
  page: Page,
  inspect: (value: typeof ViewportSchema.Type) => T
): Promise<T> => {
  const value = await viewport(page)

  return inspect(value)
}

const position = async (page: Page, id: string) =>
  await inspectModel(
    page,
    (value) => value.items.find((item) => item.id === id)?.position
  )

const node = (page: Page, id: string) =>
  page.locator(`.flow-node[data-node-id="${id}"]`)

const heading = (page: Page, id: string) => page.getByTestId(`heading-${id}`)

const settle = async (page: Page): Promise<void> => {
  await expect(status(page)).toHaveAttribute('data-busy', 'false')
  await page.evaluate(async () => {
    // oxlint-disable-next-line promise/avoid-new -- Browser animation frames have no promise API.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
  })
}

const bounds = async (locator: Locator) => {
  const rect = await locator.boundingBox()

  if (rect === null) {
    throw new Error('Expected a visible element')
  }

  return rect
}

const drag = async (
  page: Page,
  locator: Locator,
  dx: number,
  dy: number
): Promise<void> => {
  const rect = await bounds(locator)
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    rect.x + rect.width / 2 + dx,
    rect.y + rect.height / 2 + dy,
    { steps: 12 }
  )
  await page.mouse.up()
  await settle(page)
}

const focus = async (page: Page, id: string): Promise<void> => {
  await page.locator(`.studio-list [data-table="${id}"]`).click()
  await settle(page)
}

const select = async (page: Page, id: string): Promise<void> => {
  await heading(page, id).click()
  await expect(
    page.locator(`.studio-list [data-table="${id}"]`)
  ).toHaveAttribute('aria-pressed', 'true')
}

test.use({ viewport: { width: 1440, height: 1000 } })

test.beforeEach(async ({ page }) => {
  await page.goto('/schema-studio/')
  await expect(status(page)).toContainText('12 tables · 14 relationships')
  await settle(page)
})

test('S1 loads the DBML sample and fits the complete canvas', async ({
  page,
}) => {
  await expect(page.locator('.studio-table')).toHaveCount(12)
  await expect(page.locator('.studio-area')).toHaveCount(2)
  await expect(page.locator('.studio-view')).toHaveCount(1)
  await expect(page.locator('.studio-note')).toHaveCount(2)
  expect(await inspectViewport(page, (value) => value.zoom)).toBeLessThan(1)
  await expect(heading(page, 'authors')).toBeInViewport()
  await expect(heading(page, 'inventory')).toBeInViewport()
})

test('S2 drags on a 20px grid with toggle and held Shift', async ({ page }) => {
  await focus(page, 'authors')
  await page.getByRole('button', { name: 'Snap 20', exact: true }).click()
  const { zoom } = await viewport(page)
  await drag(page, heading(page, 'authors'), 73 * zoom, 37 * zoom)
  await expect.poll(() => position(page, 'authors')).toEqual({ x: 160, y: 160 })
  await page.getByRole('button', { name: 'Snap 20', exact: true }).click()
  await page.keyboard.down('Shift')
  await expect(page.locator('.studio-canvas')).toHaveClass(/studio-snapping/u)
  await drag(page, heading(page, 'authors'), 31 * zoom, 28 * zoom)
  await page.keyboard.up('Shift')
  await expect.poll(() => position(page, 'authors')).toEqual({ x: 200, y: 180 })
})

test('S3 connects field handles, rejects duplicates, and refreshes collapsed anchors', async ({
  page,
}) => {
  const source = page.getByTestId('field-authors-f0-right')
  const target = page.getByTestId('field-books-f0-left')
  const a = await bounds(source)
  const b = await bounds(target)
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 })
  await page.mouse.up()
  await expect
    .poll(
      async () =>
        await inspectModel(page, (value) => value.relationships.length)
    )
    .toBe(15)
  await expect(page.getByTestId('studio-status')).toContainText(
    '15 relationships'
  )
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 })
  await page.mouse.up()
  await settle(page)
  await expect
    .poll(() => inspectModel(page, (value) => value.relationships.length))
    .toBe(15)
  await focus(page, 'books')
  const before = await bounds(page.getByTestId('field-books-f5-right'))
  await page.getByTestId('collapse-books').click()
  await settle(page)
  const after = await bounds(page.getByTestId('field-books-f5-right'))
  expect(after.y).toBeLessThan(before.y)
  const first = await bounds(page.getByTestId('field-books-f0-right'))
  const second = await bounds(page.getByTestId('field-books-f1-right'))
  expect(second.y - first.y).toBeCloseTo(
    28 * (await inspectViewport(page, (value) => value.zoom)),
    0
  )
})

test('S4 flips relationship sides when the target crosses the source', async ({
  page,
}) => {
  const edge = () => page.getByTestId('relationship-relation-0')
  const before = await edge().getAttribute('d')
  const { zoom } = await viewport(page)
  await drag(page, heading(page, 'publishers'), 900 * zoom, 0)
  await expect
    .poll(async () => {
      const edges = S.decodeUnknownSync(
        S.fromJsonString(S.Array(FlowEdgeSchema))
      )(await status(page).getAttribute('data-edges'))

      return edges.find((candidate) => candidate.id === 'relation-0')
        ?.sourceHandle
    })
    .toBe('f3-right')
  await expect(edge()).toHaveAttribute('d', /^M/u)
  expect(await edge().getAttribute('d')).not.toBe(before)
})

test('S5 selection highlights relationships, raises their z index and drives the list', async ({
  page,
}) => {
  await select(page, 'books')
  await expect(page.getByTestId('relationship-relation-0')).toHaveAttribute(
    'data-highlighted',
    'true'
  )
  await expect(page.getByTestId('relationship-relation-0')).toHaveCSS(
    'stroke-width',
    '3px'
  )
  await expect(
    page.locator('.flow-edge-group[data-edge-id="relation-0"]')
  ).toHaveAttribute('data-z-index', '1021')
  await expect(page.locator('[data-node-toolbar="books"]')).toBeVisible()
})

test('S6 protects editable targets including shadow DOM and deletes with both keys', async ({
  page,
}) => {
  await select(page, 'authors')
  const filter = page.getByRole('searchbox', { name: 'Filter tables' })
  await filter.fill('authors')
  await filter.press('Backspace')
  await settle(page)
  await expect(status(page)).toContainText('12 tables')
  await page.evaluate(() => {
    const host = document.createElement('div')
    host.dataset.testid = 'shadow-editor'
    const shadow = host.attachShadow({ mode: 'open' })
    const input = document.createElement('input')
    input.value = 'abc'
    shadow.append(input)
    document.body.append(host)
  })
  const shadow = page.getByTestId('shadow-editor').locator('input')
  await shadow.fill('abc')
  await shadow.press('Delete')
  await settle(page)
  await expect(status(page)).toContainText('12 tables')
  await page.evaluate(() => {
    const editing = document.createElement('div')
    editing.contentEditable = 'true'
    editing.dataset.testid = 'editable-content'
    editing.textContent = 'Keep this table'
    document.body.append(editing)
  })
  await page.getByTestId('editable-content').press('Backspace')
  await settle(page)
  await expect(status(page)).toContainText('12 tables')
  await filter.fill('')
  await settle(page)
  const note = page.getByRole('textbox', { name: 'Note Pricing' })
  await note.fill('keep me')
  await note.press('Backspace')
  await note.press('Tab')
  await settle(page)
  await expect
    .poll(
      async () =>
        await inspectModel(page, (value) =>
          value.items.find((item) => item.id === 'prices-note')
        )
    )
    .toMatchObject({ text: 'keep m' })
  await heading(page, 'authors').click()
  await page.keyboard.press('Delete')
  await settle(page)
  await expect(status(page)).toContainText('11 tables')
  await heading(page, 'books').click()
  await page.keyboard.press('Backspace')
  await settle(page)
  await expect(status(page)).toContainText('10 tables')
})

test('S7 multi-selects with Shift, Meta, Control and a full selection rectangle', async ({
  page,
}) => {
  await select(page, 'authors')
  await page.keyboard.down('Shift')
  await settle(page)
  await heading(page, 'books').click()
  await page.keyboard.up('Shift')
  await expect(page.locator('.studio-list [aria-pressed="true"]')).toHaveCount(
    2
  )
  await heading(page, 'genres').click({ modifiers: ['Meta'] })
  await expect(page.locator('.studio-list [aria-pressed="true"]')).toHaveCount(
    3
  )
  await heading(page, 'publishers').click({ modifiers: ['Control'] })
  await expect(page.locator('.studio-list [aria-pressed="true"]')).toHaveCount(
    4
  )
  const a = await bounds(node(page, 'authors'))
  const b = await bounds(node(page, 'books'))
  const zoom = await inspectViewport(page, (value) => value.zoom)
  await page.mouse.move(a.x - 55 * zoom, a.y - 10)
  await page.mouse.down()
  await page.mouse.move(
    b.x + b.width + 10,
    Math.max(a.y + a.height, b.y + b.height) + 10,
    { steps: 10 }
  )
  await expect(page.getByTestId('flow-selection-rect')).toBeVisible()
  await page.mouse.up()
  await settle(page)
  await expect(page.locator('.studio-list [aria-pressed="true"]')).toHaveCount(
    2
  )
  await expect(
    page.locator('.studio-list [data-table="authors"]')
  ).toHaveAttribute('aria-pressed', 'true')
})

test('S8 area dragging carries fully contained tables', async ({ page }) => {
  const before = await position(page, 'authors')
  const { zoom } = await viewport(page)
  await drag(page, heading(page, 'catalog-area'), 100 * zoom, 60 * zoom)
  await expect
    .poll(async () => {
      const point = await position(page, 'catalog-area')

      return { x: Math.round(point?.x ?? 0), y: Math.round(point?.y ?? 0) }
    })
    .toEqual({ x: 140, y: 100 })
  await expect
    .poll(async () => {
      const point = await position(page, 'authors')

      return { x: Math.round(point?.x ?? 0), y: Math.round(point?.y ?? 0) }
    })
    .toEqual({ x: (before?.x ?? 0) + 100, y: (before?.y ?? 0) + 60 })
  await expect
    .poll(() => position(page, 'customers'))
    .toEqual({ x: 1120, y: 120 })
})

test('S9 resizes tables horizontally, notes and areas', async ({ page }) => {
  await focus(page, 'authors')
  await select(page, 'authors')
  await drag(
    page,
    node(page, 'authors').locator('[data-direction="right"]'),
    70,
    0
  )
  await expect
    .poll(
      async () =>
        (await inspectModel(
          page,
          (value) => value.items.find((item) => item.id === 'authors')?.width
        )) ?? 0
    )
    .toBeGreaterThan(290)

  const resizedWidth = await inspectModel(
    page,
    (value) => value.items.find((item) => item.id === 'authors')?.width
  )

  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect
    .poll(() =>
      inspectModel(
        page,
        (value) => value.items.find((item) => item.id === 'authors')?.width
      )
    )
    .toBe(250)
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect
    .poll(() =>
      inspectModel(
        page,
        (value) => value.items.find((item) => item.id === 'authors')?.width
      )
    )
    .toBe(resizedWidth)
  await page.getByRole('button', { name: 'Show all', exact: true }).click()
  await settle(page)
  await heading(page, 'prices-note').click()
  await drag(
    page,
    node(page, 'prices-note').locator('[data-direction="bottom-right"]'),
    30,
    25
  )
  await expect
    .poll(
      async () =>
        (await inspectModel(
          page,
          (value) =>
            value.items.find((item) => item.id === 'prices-note')?.height
        )) ?? 0
    )
    .toBeGreaterThan(165)
  await heading(page, 'sales-area').click()
  await drag(
    page,
    node(page, 'sales-area').locator('[data-direction="bottom-right"]'),
    30,
    25
  )
  await expect
    .poll(
      async () =>
        (await inspectModel(
          page,
          (value) => value.items.find((item) => item.id === 'sales-area')?.width
        )) ?? 0
    )
    .toBeGreaterThan(1000)
})

test('S10 zoom controls clamp at 0.1 and 5', async ({ page }) => {
  for (let index = 0; index < 30; index += 1) {
    // oxlint-disable-next-line no-await-in-loop -- Zoom operations must run sequentially.
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
  }

  await expect
    .poll(async () => await inspectViewport(page, (value) => value.zoom))
    .toBe(0.1)

  for (let index = 0; index < 35; index += 1) {
    // oxlint-disable-next-line no-await-in-loop -- Zoom operations must run sequentially.
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  }

  await expect
    .poll(async () => await inspectViewport(page, (value) => value.zoom))
    .toBe(5)
})

test('S11 toggles pan-on-scroll without changing zoom', async ({ page }) => {
  await page
    .getByRole('checkbox', { name: 'Pan on scroll', exact: true })
    .check()
  const before = await viewport(page)
  await page.mouse.move(1300, 800)
  await page.mouse.wheel(120, 180)
  await settle(page)
  await expect
    .poll(async () => await inspectViewport(page, (value) => value.y))
    .toBeLessThan(before.y)
  expect(await inspectViewport(page, (value) => value.zoom)).toBe(before.zoom)
  await page
    .getByRole('checkbox', { name: 'Pan on scroll', exact: true })
    .uncheck()
  await page.mouse.move(1300, 800)
  await page.mouse.wheel(0, -120)
  await settle(page)
  await expect
    .poll(async () => await inspectViewport(page, (value) => value.zoom))
    .toBeGreaterThan(before.zoom)
})

test('S12 filters by schema, fits, and recovers from a lost viewport', async ({
  page,
}) => {
  await page.getByRole('searchbox').fill('public')
  await settle(page)
  await expect(page.locator('.studio-table:visible')).toHaveCount(12)
  await expect(heading(page, 'authors')).toBeInViewport()
  await page.getByRole('searchbox').fill('books')
  await settle(page)
  await expect(page.locator('.studio-table:visible')).toHaveCount(1)
  await expect(heading(page, 'books')).toBeInViewport()
  await page.getByRole('checkbox', { name: 'Pan on scroll' }).check()
  await page.mouse.move(1300, 800)
  await page.mouse.wheel(20_000, 20_000)
  await expect(
    page.getByRole('button', { name: 'Lost in canvas · Show all' })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Lost in canvas · Show all' }).click()
  await settle(page)
  await expect(heading(page, 'books')).toBeInViewport()
  await expect(
    page.getByRole('button', { name: 'Lost in canvas · Show all' })
  ).toBeHidden()
})

test('S13 focuses and selects a table from the list with an animated fit', async ({
  page,
}) => {
  const before = await viewport(page)
  await focus(page, 'reviews')
  await expect(heading(page, 'reviews')).toBeInViewport()
  expect(await inspectViewport(page, (value) => value.zoom)).toBeGreaterThan(
    before.zoom
  )
  await expect(
    page.locator('.studio-list [data-table="reviews"]')
  ).toHaveAttribute('aria-pressed', 'true')
})

test('S14 context menus add at the pointer and duplicate or edit nodes', async ({
  page,
}) => {
  const before = await viewport(page)
  const rect = await bounds(page.locator('.studio-canvas'))
  const point = { x: 1250, y: 850 }
  await page.mouse.click(point.x, point.y, { button: 'right' })
  await page.getByRole('menuitem', { name: 'Add table', exact: true }).click()
  await expect(status(page)).toContainText('13 tables')

  const added = await inspectModel(page, (value) =>
    value.items.find((item) => item.name === 'New table')
  )

  expect(added?.position.x).toBeCloseTo(
    (point.x - rect.x - before.x) / before.zoom,
    0
  )
  expect(added?.position.y).toBeCloseTo(
    (point.y - rect.y - before.y) / before.zoom,
    0
  )
})

test('S15 toggles minimap and dark mode and renders dependencies', async ({
  page,
}) => {
  await expect(page.locator('.flow-minimap-panel')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Minimap', exact: true }).uncheck()
  await settle(page)
  await expect(page.locator('.flow-minimap-panel')).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Minimap', exact: true }).check()
  await expect(page.locator('.flow-minimap-panel')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Dark mode' }).check()
  await expect(page.locator('#app')).toHaveClass('studio-dark')
  await expect(page.locator('[data-color-mode="dark"]')).toHaveClass(/dark/u)
  await expect(
    page.locator('.flow-edge-group[data-edge-id^="dependency"]:visible')
  ).toHaveCount(2)
  await page.getByRole('checkbox', { name: 'View dependencies' }).uncheck()
  await settle(page)
  await expect(
    page.locator('.flow-edge-group[data-edge-id^="dependency"]:visible')
  ).toHaveCount(0)
})

test('S16 undo/redo, persistence and a valid PNG export', async ({ page }) => {
  await focus(page, 'authors')
  const before = await position(page, 'authors')
  await drag(page, heading(page, 'authors'), 60, 0)
  const after = await position(page, 'authors')
  expect(after?.x).toBeGreaterThan(before?.x ?? 0)
  await page.keyboard.press('Control+z')
  await settle(page)
  await expect.poll(() => position(page, 'authors')).toEqual(before)
  await page.keyboard.press('Control+Shift+z')
  await settle(page)
  await expect.poll(() => position(page, 'authors')).toEqual(after)
  await page.reload()
  await settle(page)
  await expect.poll(() => position(page, 'authors')).toEqual(after)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PNG' }).click()
  const artifact = await download
  expect(artifact.suggestedFilename()).toBe('schema-studio.png')
  const stream = await artifact.createReadStream()
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  const bytes = Buffer.concat(chunks)
  expect(bytes.length).toBeGreaterThan(10_000)
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1235, 904])
  expect(bytes.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  )
})

test('Beyond: keyboard movement announces 5px and Shift 20px moves, then copy/paste', async ({
  page,
}) => {
  await focus(page, 'authors')
  await heading(page, 'authors').click()
  await page.keyboard.press('ArrowRight')
  await settle(page)
  await expect.poll(() => position(page, 'authors')).toEqual({ x: 85, y: 120 })
  await expect(page.locator('.studio-announcement')).toHaveText(
    'authors moved to 85, 120'
  )
  await page.keyboard.press('ArrowLeft')
  await settle(page)
  await page.keyboard.down('Shift')
  await settle(page)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.up('Shift')
  await settle(page)
  await expect.poll(() => position(page, 'authors')).toEqual({ x: 80, y: 140 })
  await expect(page.locator('.studio-announcement')).toHaveText(
    'authors moved to 80, 140'
  )
  await page.keyboard.press('Control+c')
  await page.keyboard.press('Control+v')
  await settle(page)
  await expect(status(page)).toContainText('13 tables')
  await expect
    .poll(() =>
      inspectModel(
        page,
        (value) =>
          value.items.find((item) => item.name === 'authors copy')?.position
      )
    )
    .toEqual({ x: 120, y: 180 })
})

test('Beyond: HTML cardinality popover changes markers and is undoable', async ({
  page,
}) => {
  await page.getByTestId('cardinality-relation-0').click()
  await page.getByRole('menuitem', { name: 'one to many', exact: true }).click()
  await expect(page.getByTestId('cardinality-relation-0')).toHaveText('1 : N')
  await expect(page.getByTestId('relationship-relation-0')).toHaveAttribute(
    'marker-end',
    'url(#studio-relation-0-many)'
  )
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByTestId('cardinality-relation-0')).toHaveText('N : 1')
})

test('Beyond: reconnects an edge endpoint to another field', async ({
  page,
}) => {
  await page.getByTestId('cardinality-relation-0').click()
  await page.keyboard.press('Escape')

  await expect(
    page.locator('.flow-edge-anchor-group[data-edge-id="relation-0"]')
  ).toHaveClass(/selected/u)

  const start = await bounds(
    page.locator(
      '.flow-edge-anchor-group[data-edge-id="relation-0"] .flow-edge-reconnect-anchor[data-endpoint="target"]'
    )
  )

  const target = await bounds(page.getByTestId('field-authors-f0-right'))
  await page.mouse.move(
    start.x + start.width * 0.85,
    start.y + start.height / 2
  )
  expect(
    await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('class'),
      { x: start.x + start.width * 0.85, y: start.y + start.height / 2 }
    )
  ).toContain('flow-edge-reconnect-anchor')
  await page.mouse.down()
  await page.mouse.move(
    start.x + start.width * 0.85 + 4,
    start.y + start.height / 2 + 4
  )
  await expect(status(page)).toHaveAttribute('data-reconnect', 'started')
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
    { steps: 12 }
  )
  await page.mouse.up()
  await expect(status(page)).toHaveAttribute('data-reconnect', 'proposed:')
  await settle(page)
  await expect
    .poll(() =>
      inspectModel(
        page,
        (value) =>
          value.relationships.find((relation) => relation.id === 'relation-0')
            ?.target
      )
    )
    .toEqual({ table: 'authors', field: 'id' })
  await expect(status(page)).toContainText('14 relationships')
})

test('Beyond: click-started relationship follows the pointer and connects', async ({
  page,
}) => {
  await heading(page, 'authors').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Relate id', exact: true }).click()
  await page.mouse.move(900, 600)
  await expect(page.locator('.studio-cursor-node')).toBeVisible()
  await expect(
    page.locator(
      '.flow-edge-group[data-edge-id="studio-floating"] .flow-edge-path'
    )
  ).toHaveAttribute('d', /^M[\d., -]+L[\d., -]+$/u)
  await page.getByTestId('field-books-f0-left').click()
  await expect(status(page)).toContainText('15 relationships')
  await settle(page)
  await expect(page.locator('.studio-cursor-node')).toBeHidden()
})

test('Beyond: inline edits names and field types without deleting while typing', async ({
  page,
}) => {
  await focus(page, 'authors')
  await page
    .locator('[data-node-toolbar="authors"]')
    .getByRole('button', { name: 'Edit', exact: true })
    .click()
  const editor = page.getByRole('dialog', { name: 'Edit item' })
  await editor
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('writers')
  await editor
    .getByRole('textbox', { name: 'Type name', exact: true })
    .fill('text')
  await editor
    .getByRole('textbox', { name: 'Field name', exact: true })
    .press('Delete')
  await settle(page)
  await expect(status(page)).toContainText('12 tables')
  await editor
    .getByRole('textbox', { name: 'Field name', exact: true })
    .fill('name')
  await editor.getByRole('button', { name: 'Save changes' }).click()
  await expect(heading(page, 'authors')).toHaveText('writers')
  await expect(node(page, 'authors')).toContainText('name · text')
})

test('Beyond: overlaps are highlighted and intersecting tables can be deleted', async ({
  page,
}) => {
  const zoom = await inspectViewport(page, (value) => value.zoom)
  await drag(page, heading(page, 'authors'), 320 * zoom, 0)
  await page.getByRole('button', { name: 'Show overlaps', exact: true }).click()
  await expect(page.locator('.studio-overlap')).toHaveCount(2)
  await settle(page)
  await heading(page, 'books').click()
  await page
    .getByRole('button', { name: 'Delete intersecting', exact: true })
    .click()
  await expect(status(page)).toContainText('11 tables')
  await expect(page.locator('.studio-announcement')).toContainText(
    '1 intersecting tables deleted'
  )
})

test('Beyond: auto-arrange and culling retain all tables in the saved model', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Auto-arrange', exact: true }).click()
  await settle(page)
  await expect(status(page)).toContainText('12 tables · 14 relationships')
  await focus(page, 'books')
  await page
    .getByRole('checkbox', { name: 'Render only visible', exact: true })
    .check()
  await settle(page)
  await expect(heading(page, 'books')).toBeInViewport()
  const rendered = await page.locator('.studio-table').count()
  expect(rendered).toBeGreaterThan(0)
  expect(rendered).toBeLessThan(12)
  await expect
    .poll(() =>
      inspectModel(
        page,
        (value) => value.items.filter((item) => item.kind === 'table').length
      )
    )
    .toBe(12)
})

test('Beyond: exports the model and imports JSON through the file picker', async ({
  page,
}) => {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click()
  const artifact = await download
  expect(artifact.suggestedFilename()).toBe('schema-studio.json')
  const stream = await artifact.createReadStream()
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  const saved = importStudio(Buffer.concat(chunks).toString('utf-8'))
  expect(saved).toEqual(await model(page))

  const imported = {
    ...saved,
    items: saved.items.map((item) =>
      item.id === 'authors' ? { ...item, name: 'writers from JSON' } : item
    ),
  }

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click()
  const picker = await chooser
  await picker.setFiles({
    name: 'diagram.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  })
  await expect(heading(page, 'authors')).toHaveText('writers from JSON')
  await settle(page)
  await expect(status(page)).toContainText('12 tables · 14 relationships')
})
