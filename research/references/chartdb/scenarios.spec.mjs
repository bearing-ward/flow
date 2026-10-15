import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { test, expect } from '@playwright/test'

const root = fileURLToPath(new URL('.', import.meta.url))
const dbml = await readFile(
  new URL(
    '../../../apps/shared/schema-studio/sample-schema.dbml',
    import.meta.url
  ),
  'utf8'
)
let page
const table = (name) =>
  page.locator('.react-flow__node-table').filter({
    has: page.locator('label', { hasText: new RegExp(`^${name}$`) }),
  })
const area = (name) =>
  page.locator('.react-flow__node-area').filter({ hasText: name })
const icon = (name) => page.locator(`button:has(svg.lucide-${name})`).first()
const pause = () => page.waitForTimeout(650)

async function menu(top, item, child) {
  await page.getByRole('menuitem', { name: top, exact: true }).click()
  if (child) {
    await page.getByRole('menuitem', { name: item, exact: true }).hover()
    await page
      .locator('[role=menuitem], [role=menuitemcheckbox]')
      .filter({ hasText: new RegExp(`^${child}$`) })
      .click()
  } else await page.getByRole('menuitem', { name: item, exact: true }).click()
  await pause()
}
async function fit() {
  await icon('scan').click()
  await pause()
}
async function blank(near = null) {
  return page.evaluate((preferred) => {
    const b = document.querySelector('.react-flow').getBoundingClientRect()
    const target = preferred ?? { x: b.right - 90, y: b.top + 100 }
    const points = []
    for (let x = b.x + 50; x < b.right - 40; x += 30)
      for (let y = b.y + 100; y < b.bottom - 160; y += 30) {
        if (
          document
            .elementFromPoint(x, y)
            ?.classList.contains('react-flow__pane')
        )
          points.push({ x, y })
      }
    points.sort(
      (a, c) =>
        Math.hypot(a.x - target.x, a.y - target.y) -
        Math.hypot(c.x - target.x, c.y - target.y)
    )
    if (!points.length) throw new Error('No empty pane point available')
    return points[0]
  }, near)
}
async function deselect() {
  await page.mouse.click(...Object.values(await blank()))
}
async function dragFrom(from, dx, dy) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 18 })
  await page.mouse.up()
  await pause()
}
async function selectNode(node) {
  const point = await node.evaluate((e) => {
    const b = e.getBoundingClientRect()
    for (let y = b.y + 2; y < b.bottom - 1; y += 3)
      for (let x = b.x + 2; x < b.right - 1; x += 3) {
        const hit = document.elementFromPoint(x, y)
        if (
          hit?.closest('.react-flow__node')?.dataset.id === e.dataset.id &&
          !hit.closest('button,input,textarea,.react-flow__resize-control')
        )
          return { x, y }
      }
    throw new Error('No unobstructed point in node')
  })
  await page.mouse.click(point.x, point.y)
  await pause()
}
async function controlPoint(control) {
  return control.evaluate((e) => {
    const b = e.getBoundingClientRect()
    for (let y = Math.ceil(b.y); y < b.bottom; y++)
      for (let x = Math.ceil(b.x); x < b.right; x++) {
        const hit = document.elementFromPoint(x, y)
        if (hit === e || e.contains(hit)) return { x, y }
      }
    throw new Error('Resize control is occluded at every screen pixel')
  })
}
async function focusSidebar(name) {
  const header = page
    .locator('aside h3')
    .filter({ has: page.getByText(name, { exact: true }) })
    .first()
  await header.hover()
  await header.locator('svg.lucide-circle-dot-dashed').click()
  await pause()
}
async function dragNode(node, dx, dy) {
  const grip = node.locator('svg.lucide-grip-vertical'),
    label = node.locator('label')
  const b = await (
    (await grip.count()) ? grip : (await label.count()) ? label : node
  ).boundingBox()
  const y =
    (await label.count()) || (await grip.count())
      ? b.y + b.height / 2
      : b.y + 4 * (await zoom())
  await dragFrom({ x: b.x + b.width / 2, y }, dx, dy)
}
async function panToWorld(target) {
  const s = await observe(),
    b = s.canvas,
    z = s.viewport.zoom
  const dx = b.width / 2 - (s.viewport.x + target.x * z)
  const dy = b.height / 2 - (s.viewport.y + target.y * z)
  const p = await blank()
  await page.mouse.move(p.x, p.y)
  await page.mouse.wheel(-2 * dx, -2 * dy)
  await pause()
  return blank({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
}
async function zoom() {
  return page
    .locator('.react-flow__viewport')
    .evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a)
}
async function contextAdd(kind, point = null) {
  const p = point ?? (await blank())
  await page.mouse.click(p.x, p.y, { button: 'right' })
  const item = page.getByRole('menuitem', { name: `New ${kind}`, exact: true })
  const inputPromise = page.evaluate(
    () =>
      new Promise((resolve) => {
        document.addEventListener(
          'pointerdown',
          (event) => {
            const b = document
              .querySelector('.react-flow')
              .getBoundingClientRect()
            const m = new DOMMatrix(
              getComputedStyle(document.querySelector('.react-flow__viewport'))
                .transform
            )
            resolve({
              x: event.clientX,
              y: event.clientY,
              isTrusted: event.isTrusted,
              button: event.button,
              type: event.type,
              target: event.target
                .closest('[role=menuitem]')
                ?.textContent.trim(),
              canvas: { x: b.x, y: b.y },
              viewport: { x: m.e, y: m.f, zoom: m.a },
            })
          },
          { once: true, capture: true }
        )
      })
  )
  await page.evaluate(() => true)
  await item.click()
  const pointerEvent = await inputPromise
  await pause()
  return {
    panePointer: p,
    itemClick: { x: pointerEvent.x, y: pointerEvent.y },
    pointerEvent,
  }
}
async function observe() {
  return page.evaluate(async () => {
    const round = (n) => Math.round(n * 1000) / 1000
    const box = (e) => {
      const r = e.getBoundingClientRect()
      return {
        x: round(r.x),
        y: round(r.y),
        width: round(r.width),
        height: round(r.height),
      }
    }
    const v = document.querySelector('.react-flow__viewport')
    const m = new DOMMatrix(getComputedStyle(v).transform)
    const nodes = [...document.querySelectorAll('.react-flow__node')].map(
      (e) => {
        const p = new DOMMatrix(getComputedStyle(e).transform)
        return {
          id: e.dataset.id,
          type: [...e.classList]
            .find((c) => /^react-flow__node-/.test(c))
            ?.replace('react-flow__node-', ''),
          name:
            e.querySelector('label')?.textContent || e.innerText.split('\n')[0],
          position: { x: round(p.e), y: round(p.f) },
          width: round(e.offsetWidth),
          height: round(e.offsetHeight),
          selected: e.classList.contains('selected'),
          zIndex: getComputedStyle(e).zIndex,
          screen: box(e),
          handles: [...e.querySelectorAll('.react-flow__handle')].map((h) => ({
            id: h.dataset.handleid,
            side: h.dataset.handlepos,
            visibility: getComputedStyle(h).visibility,
            screen: box(h),
          })),
        }
      }
    )
    const edges = [...document.querySelectorAll('.react-flow__edge')].map(
      (e) => {
        const p = e.querySelector('.react-flow__edge-path')
        const markerStart = p?.getAttribute('marker-start'),
          markerEnd = p?.getAttribute('marker-end')
        const sourcePoint = p?.getPointAtLength(0),
          targetPoint = p?.getPointAtLength(p.getTotalLength())
        return {
          id: e.dataset.id,
          endpoints: e.getAttribute('aria-label'),
          selected: e.classList.contains('selected'),
          zIndex: getComputedStyle(e.parentElement).zIndex,
          path: p?.getAttribute('d'),
          markerStart,
          markerEnd,
          sourceSide: markerStart?.match(/_(left|right)\)$/)?.[1] ?? null,
          targetSide: markerEnd?.match(/_(left|right)\)$/)?.[1] ?? null,
          sourcePoint: sourcePoint && { x: sourcePoint.x, y: sourcePoint.y },
          targetPoint: targetPoint && { x: targetPoint.x, y: targetPoint.y },
          stroke: p && getComputedStyle(p).stroke,
          class: p?.getAttribute('class'),
        }
      }
    )
    const persisted = await new Promise((resolve, reject) => {
      const request = indexedDB.open('ChartDB')
      request.onerror = () => reject(request.error)
      request.onsuccess = async () => {
        const db = request.result
        const stores = [...db.objectStoreNames]
        const values = await Promise.all(
          stores.map(
            (name) =>
              new Promise((done, fail) => {
                const r = db
                  .transaction(name, 'readonly')
                  .objectStore(name)
                  .getAll()
                r.onsuccess = () => done([name, r.result])
                r.onerror = () => fail(r.error)
              })
          )
        )
        db.close()
        resolve(Object.fromEntries(values))
      }
    })
    return {
      viewport: { x: round(m.e), y: round(m.f), zoom: round(m.a) },
      canvas: box(document.querySelector('.react-flow')),
      nodes,
      edges,
      selected: nodes.filter((n) => n.selected).map((n) => n.name),
      markers: [...document.querySelectorAll('.marker-definitions marker')].map(
        (e) => ({
          id: e.id,
          text: e.textContent.trim(),
          circleRadius: e.querySelector('circle')?.getAttribute('r'),
          refX: e.getAttribute('refX'),
          refY: e.getAttribute('refY'),
        })
      ),
      canvasClass: document.querySelector('.react-flow').className,
      theme: document.documentElement.className,
      minimap: !!document.querySelector('.react-flow__minimap'),
      scroll: { x: scrollX, y: scrollY },
      settings: { ...localStorage },
      persisted,
    }
  })
}
async function save(name, value) {
  await writeFile(
    `${root}results/${name}.json`,
    `${JSON.stringify(value, null, 2)}\n`
  )
}
async function shot(name) {
  await page.screenshot({ path: `${root}results/screenshots/${name}.png` })
}
async function setupArea(name, names) {
  const existing = (await observe()).persisted.areas.map((a) => a.id)
  const point = await panToWorld(
    name === 'Catalog' ? { x: -300, y: -1600 } : { x: 3200, y: -1600 }
  )
  await contextAdd('Area', point)
  await fit()
  const id = (await observe()).persisted.areas.find(
    (a) => !existing.includes(a.id)
  ).id
  const node = page.locator(`.react-flow__node-area[data-id="${id}"]`)
  await node.click({
    button: 'right',
    position: { x: 10 * (await zoom()), y: 14 * (await zoom()) },
  })
  await page
    .getByRole('menuitem', { name: 'Edit Area Name', exact: true })
    .click()
  await node.locator('input').fill(name)
  await node.locator('input').press('Enter')
  await pause()
  await fit()
  for (const n of names) {
    await table(n).locator('label').click({ button: 'right' })
    await page.getByRole('menuitem', { name: /^Move to Area/ }).hover()
    await page.getByRole('menuitem', { name, exact: true }).click()
    await pause()
    await fit()
  }
}
async function setupNote(content, near) {
  const state = await observe(),
    existing = state.persisted.notes.map((n) => n.id)
  const t = state.persisted.db_tables.find((t) => t.name === near)
  const a = state.persisted.areas.find((a) => a.id === t.parentAreaId)
  const target = a
    ? { x: a.x + a.width + 100, y: a.y + a.height / 2 }
    : { x: t.x + 300, y: t.y + 250 }
  await contextAdd('Note', await panToWorld(target))
  await fit()
  const id = (await observe()).persisted.notes.find(
    (n) => !existing.includes(n.id)
  ).id
  const node = page.locator(`.react-flow__node-note[data-id="${id}"]`)
  await node.dblclick({
    position: { x: 20 * (await zoom()), y: 40 * (await zoom()) },
  })
  await node.locator('textarea').fill(content)
  await node.locator('textarea').press('Enter')
  await pause()
  await fit()
}

test('capture ChartDB scenarios S1–S16', async ({ browser }) => {
  test.setTimeout(600000)
  page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    colorScheme: 'light',
  })
  page.setDefaultTimeout(8000)
  await page.goto('http://127.0.0.1:4190')
  await page.getByRole('img', { name: 'PostgreSQL', exact: true }).click()
  await page
    .getByRole('button', { name: 'Empty database', exact: true })
    .click()
  await menu('Actions', 'Import', 'DBML')
  const editor = page.locator('.monaco-editor textarea').last()
  await editor.waitFor({ state: 'visible', timeout: 60000 })
  await editor.focus()
  await page.keyboard.insertText(dbml)
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.react-flow__node-table')).toHaveCount(12)
  await pause()
  await fit()
  await save('import', await observe())
  await page
    .getByRole('button', { name: 'Not now', exact: true })
    .waitFor({ timeout: 40000 })
  await page.getByRole('button', { name: 'Not now', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await pause()
  await setupArea('Catalog', [
    'authors',
    'books',
    'book_authors',
    'publishers',
    'genres',
    'book_genres',
  ])
  await setupArea('Sales', ['customers', 'addresses', 'orders', 'order_items'])
  await setupNote('Prices are stored in cents.', 'order_items')
  await setupNote('Reviews are moderated before display.', 'reviews')
  await menu('View', 'Database Views', 'On')
  await contextAdd('View')
  await page.getByPlaceholder('Table name', { exact: true }).fill('bestsellers')
  await expect
    .poll(async () =>
      (await observe()).persisted.db_tables.some(
        (t) => t.name === 'bestsellers'
      )
    )
    .toBe(true)
  await page
    .locator(
      '.react-flow__node-table:has(input[placeholder="Table name"]) button:has(svg.lucide-x)'
    )
    .click()
  await deselect()
  await fit()
  for (const targetName of ['books', 'order_items']) {
    await table('bestsellers').locator('label').click()
    const h = await table('bestsellers')
      .locator('[data-handleid^=top_dep_]')
      .boundingBox()
    const target = await table(targetName).locator('label').boundingBox()
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      target.x + target.width / 2,
      target.y + target.height / 2,
      { steps: 24 }
    )
    await pause()
    await page.mouse.up()
    await pause()
  }
  await deselect()
  await fit()
  const fixture = await observe()
  for (const [name, count] of [
    ['Catalog', 6],
    ['Sales', 4],
  ]) {
    const id = fixture.persisted.areas.find((a) => a.name === name).id
    expect(
      fixture.persisted.db_tables.filter((t) => t.parentAreaId === id)
    ).toHaveLength(count)
  }
  expect(fixture.persisted.db_dependencies).toHaveLength(2)
  expect(fixture.persisted.notes.map((n) => n.content).sort()).toEqual([
    'Prices are stored in cents.',
    'Reviews are moderated before display.',
  ])
  await save('fixture', fixture)
  await shot('fixture-light')
  const fixtureStorage = await page.context().storageState({ indexedDB: true })
  const fixtureUrl = page.url()
  const captures = []
  const run = {
    capturedAt: new Date().toISOString(),
    browser: browser.version(),
    userAgent: await page.evaluate(() => navigator.userAgent),
    platform: process.platform,
    architecture: process.arch,
    viewport: { width: 1600, height: 1000 },
    devicePixelRatio: await page.evaluate(() => devicePixelRatio),
    fixtureUrl,
    fixtureCreatedThrough: 'UI',
    scenarioReset: 'Playwright storageState including IndexedDB',
  }
  await save('run', run)
  const errors = []
  async function scenario(id, title, action) {
    await test.step(`${id} ${title}`, async () => {
      await page.context().close()
      const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 },
        colorScheme: 'light',
        storageState: fixtureStorage,
      })
      page = await context.newPage()
      page.setDefaultTimeout(8000)
      await page.goto(fixtureUrl)
      await expect(page.locator('.react-flow__node-table')).toHaveCount(13)
      await fit()
      const before = await observe()
      try {
        const outcome = await action(before)
        await pause()
        const after = await observe()
        await save(id, {
          run: run.capturedAt,
          id,
          title,
          status: 'observed',
          before,
          outcome,
          after,
        })
        await shot(`${id}-light`)
        await menu('View', /^Theme/, 'Dark')
        expect((await observe()).theme).toBe('dark')
        await shot(`${id}-dark`)
        await menu('View', /^Theme/, 'Light')
        captures.push({ id, title, status: 'observed', outcome })
      } catch (error) {
        const after = await observe()
        await save(id, {
          run: run.capturedAt,
          id,
          title,
          status: 'unverified',
          error: String(error),
          before,
          after,
        })
        await shot(`${id}-error`)
        errors.push(`${id}: ${String(error)}`)
        captures.push({
          id,
          title,
          status: 'unverified',
          reason: String(error),
        })
        await page.keyboard.press('Escape')
      }
    })
  }
  await scenario('S1', 'load and fit', async () => {
    await fit()
    const s = await observe()
    expect(s.persisted.db_tables).toHaveLength(13)
    expect(s.persisted.db_relationships).toHaveLength(14)
    expect(s.persisted.areas).toHaveLength(2)
    expect(s.persisted.notes).toHaveLength(2)
    return {
      importedTables: 12,
      importedRelationships: 14,
      fitViewport: s.viewport,
      fixture: 'fixture.json',
    }
  })
  await scenario('S2', 'drag with grid toggle and Shift', async () => {
    await deselect()
    const trials = []
    for (const mode of ['free', 'toggle', 'shift']) {
      if (mode === 'toggle') await icon('magnet').click()
      if (mode === 'shift') {
        await icon('magnet').click()
      }
      await deselect()
      await table('authors').locator('label').click()
      const before = await observe()
      let during = before
      if (mode === 'shift') {
        const b = await table('authors').locator('label').boundingBox()
        const from = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
        await page.mouse.move(from.x, from.y)
        await page.mouse.down()
        await page.mouse.move(from.x + 4, from.y + 4, { steps: 3 })
        await page.keyboard.down('Shift')
        await pause()
        during = await observe()
        await page.mouse.move(from.x + 43, from.y + 27, { steps: 18 })
        await page.mouse.up()
        await page.keyboard.up('Shift')
        await pause()
      } else await dragNode(table('authors'), 43, 27)
      const after = await observe()
      const position = after.nodes.find((n) => n.name === 'authors').position
      if (mode !== 'free') {
        expect(Math.abs(position.x % 20)).toBe(0)
        expect(Math.abs(position.y % 20)).toBe(0)
      }
      trials.push({
        mode,
        before: before.nodes.find((n) => n.name === 'authors').position,
        after: position,
        selectedBefore: before.selected,
        selectedAfter: after.selected,
        canvasClassDuring: during.canvasClass,
        modifierTiming:
          mode === 'shift'
            ? 'Shift pressed after the initial 4px drag activation'
            : 'none',
        moved:
          JSON.stringify(position) !==
          JSON.stringify(
            before.nodes.find((n) => n.name === 'authors').position
          ),
        inputScreenDelta: { x: 43, y: 27 },
        viewport: after.viewport,
      })
    }
    return { trials }
  })
  await scenario('S3', 'connect fields', async (before) => {
    await table('authors').locator('label').click()
    const state = await observe()
    const author = state.persisted.db_tables.find((t) => t.name === 'authors')
    const fieldId = author.fields.find((f) => f.name === 'country_code').id
    const source = table('authors').locator(
      `[data-handleid="right_rel_${fieldId}"]`
    )
    const b = await source.boundingBox()
    const target = table('publishers').getByText('country_code', {
      exact: true,
    })
    const t = await target.boundingBox()
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await page.mouse.down()
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 24 })
    await pause()
    await page.mouse.up()
    await pause()
    const after = await observe()
    const newRelationships = after.persisted.db_relationships.filter(
      (r) => !before.persisted.db_relationships.some((old) => old.id === r.id)
    )
    expect(newRelationships).toHaveLength(1)
    return {
      source: 'authors.country_code',
      target: 'publishers.country_code',
      created: newRelationships,
    }
  })
  await scenario('S4', 'edge side flip', async () => {
    await fit()
    await deselect()
    const before = await observe()
    const source = before.nodes.find((n) => n.name === 'books')
    const target = before.nodes.find((n) => n.name === 'publishers')
    const rel = before.persisted.db_relationships.find(
      (r) => r.name === 'books_publisher_id_publishers_id'
    )
    await table('publishers').locator('label').click()
    await dragNode(
      table('publishers'),
      (source.position.x - 360 - target.position.x) * before.viewport.zoom,
      0
    )
    const after = await observe()
    return {
      relationshipId: rel.id,
      before: before.edges.find((e) => e.id === rel.id),
      after: after.edges.find((e) => e.id === rel.id),
      targetPosition: after.persisted.db_tables.find(
        (t) => t.name === 'publishers'
      ),
    }
  })
  await scenario('S5', 'selection highlights connected edges', async () => {
    await fit()
    await deselect()
    const before = await observe()
    await table('books').locator('label').click()
    const after = await observe()
    const book = after.nodes.find((n) => n.name === 'books')
    const connected = after.edges.filter((e) => e.endpoints?.includes(book.id))
    expect(connected.length).toBeGreaterThan(0)
    expect(connected.every((e) => e.zIndex === '1')).toBe(true)
    const point = await page.evaluate(
      (ids) => {
        for (const id of ids) {
          const path = document.querySelector(
            `.react-flow__edge[data-id="${id}"] .react-flow__edge-path`
          )
          for (let fraction = 0.1; fraction < 0.95; fraction += 0.05) {
            const p = path
              .getPointAtLength(path.getTotalLength() * fraction)
              .matrixTransform(path.getScreenCTM())
            const hit = document
              .elementFromPoint(p.x, p.y)
              ?.closest('.react-flow__edge')
            if (hit?.dataset.id === id) return { x: p.x, y: p.y, id }
          }
        }
        throw new Error('No unobstructed edge point found')
      },
      connected.filter((e) => e.markerStart).map((e) => e.id)
    )
    await page.mouse.click(point.x, point.y)
    await pause()
    const selectedEdge = (await observe()).edges.find((e) => e.id === point.id)
    expect(selectedEdge.selected).toBe(true)
    expect(selectedEdge.stroke).toBe('rgb(219, 39, 119)')
    return {
      beforeEdges: before.edges,
      connected,
      tableZ: book.zIndex,
      selectedEdge,
    }
  })
  await scenario('S6', 'delete keys and editable exemptions', async () => {
    const trials = []
    for (const key of ['Backspace', 'Delete']) {
      await fit()
      await table('inventory').locator('label').click()
      const input = page.getByPlaceholder('Filter', { exact: true })
      await input.fill('xyz')
      await input.press('End')
      await input.press(key)
      let s = await observe()
      trials.push({
        key,
        target: 'input',
        inventoryExists: s.persisted.db_tables.some(
          (t) => t.name === 'inventory'
        ),
        inputValue: await input.inputValue(),
      })
      await input.fill('')
      await input.blur()
      await table('inventory').locator('label').click()
      await page.keyboard.press(key)
      await pause()
      s = await observe()
      expect(s.persisted.db_tables.some((t) => t.name === 'inventory')).toBe(
        false
      )
      trials.push({
        key,
        target: 'canvas',
        inventoryExists: false,
        remainingRelationships: s.persisted.db_relationships.length,
      })
      await icon('undo').click()
      await pause()
      await fit()
      expect(
        (await observe()).persisted.db_tables.some(
          (t) => t.name === 'inventory'
        )
      ).toBe(true)
    }
    const note = page.locator('.react-flow__node-note').first()
    await fit()
    const noteId = await note.getAttribute('data-id')
    const notePosition = (await observe()).nodes.find(
      (n) => n.id === noteId
    ).position
    await panToWorld({ x: notePosition.x + 100, y: notePosition.y + 75 })
    await note.dblclick({
      position: { x: 20 * (await zoom()), y: 40 * (await zoom()) },
    })
    const text = note.locator('textarea')
    const original = await text.inputValue()
    for (const key of ['Backspace', 'Delete']) {
      await text.fill('abc')
      await text.press('End')
      await text.press(key)
      trials.push({
        key,
        target: 'textarea',
        noteCount: (await observe()).persisted.notes.length,
        inputValue: await text.inputValue(),
      })
    }
    await text.fill(original)
    await text.press('Enter')
    return { trials }
  })
  await scenario('S7', 'multi-select clicks and box', async () => {
    await fit()
    await deselect()
    const trials = []
    for (const key of ['Shift', 'Meta', 'Control']) {
      await deselect()
      await table('authors').locator('label').click()
      await page.keyboard.down(key)
      await pause()
      await table('books').locator('label').click()
      await pause()
      await page.keyboard.up(key)
      await pause()
      trials.push({
        key,
        selected: (await observe()).selected,
        contextMenu: await page
          .getByRole('menu')
          .getByRole('menuitem')
          .allTextContents(),
      })
      await page.keyboard.press('Escape')
      await pause()
    }
    await deselect()
    const b = await table('inventory').boundingBox()
    await page.keyboard.down('Shift')
    await dragFrom({ x: b.x - 10, y: b.y - 10 }, b.width + 20, b.height + 20)
    await page.keyboard.up('Shift')
    await pause()
    const full = (await observe()).selected
    await deselect()
    await page.keyboard.down('Shift')
    await dragFrom({ x: b.x - 10, y: b.y - 10 }, b.width / 2, b.height / 2)
    await page.keyboard.up('Shift')
    await pause()
    const partial = (await observe()).selected
    expect(full).toContain('inventory')
    expect(partial).not.toContain('inventory')
    return { clickTrials: trials, fullBox: full, partialBox: partial }
  })
  await scenario('S8', 'area drag carries member tables', async () => {
    await deselect()
    await fit()
    const before = await observe()
    const a = before.persisted.areas.find((a) => a.name === 'Catalog')
    await dragNode(area('Catalog'), 44, 33)
    const after = await observe()
    const a2 = after.persisted.areas.find((n) => n.id === a.id)
    const delta = { x: a2.x - a.x, y: a2.y - a.y }
    const members = before.persisted.db_tables
      .filter((t) => t.parentAreaId === a.id)
      .map((t) => {
        const t2 = after.persisted.db_tables.find((n) => n.id === t.id)
        return {
          name: t.name,
          before: { x: t.x, y: t.y },
          after: { x: t2.x, y: t2.y },
          delta: { x: t2.x - t.x, y: t2.y - t.y },
        }
      })
    expect(members).toHaveLength(6)
    expect(
      members.every(
        (t) =>
          Math.abs(t.delta.x - delta.x) < 0.01 &&
          Math.abs(t.delta.y - delta.y) < 0.01
      )
    ).toBe(true)
    expect(Math.abs(delta.x)).toBeGreaterThan(0)
    return {
      areaBefore: a,
      areaAfter: a2,
      delta,
      members,
      nonmembers: after.persisted.db_tables
        .filter((t) => t.parentAreaId !== a.id)
        .map((t) => ({ name: t.name, x: t.x, y: t.y })),
    }
  })
  await scenario('S9', 'resize constraints', async () => {
    const trials = []
    for (const [kind, node] of [
      ['table', table('inventory')],
      ['note', page.locator('.react-flow__node-note').first()],
      ['area', area('Sales')],
    ]) {
      if (kind === 'table') await focusSidebar('inventory')
      else await fit()
      await selectNode(node)
      const before = await observe(),
        id = await node.getAttribute('data-id')
      const initial = before.nodes.find((n) => n.id === id)
      const handle = node
        .locator(
          kind === 'table'
            ? '.react-flow__resize-control.line.right'
            : '.react-flow__resize-control.handle.bottom.right'
        )
        .first()
      const smallerStart = await controlPoint(handle)
      await dragFrom(
        smallerStart,
        -(initial.width * before.viewport.zoom + 40),
        kind === 'table' ? 0 : -(initial.height * before.viewport.zoom + 40)
      )
      const smaller = (await observe()).nodes.find((n) => n.id === id)
      if (kind !== 'table') await fit()
      await selectNode(node)
      const largerStart = await controlPoint(handle)
      await dragFrom(
        largerStart,
        kind === 'table' ? 400 : 200,
        kind === 'table' ? 0 : 140
      )
      const larger = (await observe()).nodes.find((n) => n.id === id)
      if (kind === 'table') {
        expect(smaller.width).toBe(224)
        expect(larger.width).toBe(450)
        expect(larger.height).toBe(initial.height)
      }
      if (kind === 'note') {
        expect(smaller.width).toBe(200)
        expect(smaller.height).toBe(150)
      }
      if (kind === 'area') {
        expect(smaller.width).toBe(100)
        expect(smaller.height).toBe(100)
      }
      expect(larger.width).toBeGreaterThan(smaller.width)
      trials.push({
        kind,
        before: initial,
        smaller,
        larger,
        smallerStart,
        largerStart,
      })
    }
    return { trials }
  })
  await scenario('S10', 'zoom clamps', async () => {
    await deselect()
    const samples = []
    for (let i = 0; i < 24; i++) {
      await icon('zoom-out').click()
      await page.waitForTimeout(220)
    }
    const minimum = await zoom()
    samples.push(minimum)
    await icon('zoom-out').click()
    await pause()
    const below = await zoom()
    for (let i = 0; i < 28; i++) {
      await icon('zoom-in').click()
      await page.waitForTimeout(220)
    }
    const maximum = await zoom()
    samples.push(maximum)
    await icon('zoom-in').click()
    await pause()
    const above = await zoom()
    expect(minimum).toBeCloseTo(0.1, 6)
    expect(maximum).toBeCloseTo(5, 6)
    await fit()
    return {
      minimum,
      below,
      maximum,
      above,
      method: 'toolbar zoom buttons, waited beyond the 200ms animation',
    }
  })
  await scenario('S11', 'scroll setting', async () => {
    await fit()
    await deselect()
    const trials = []
    for (const setting of ['Off', 'On']) {
      await menu('View', 'Zoom on Scroll', setting)
      const before = await observe()
      const p = await blank()
      await page.mouse.move(p.x, p.y)
      await page.mouse.wheel(80, 120)
      await pause()
      trials.push({
        setting,
        before: before.viewport,
        after: (await observe()).viewport,
        windowScroll: await page.evaluate(() => ({ x: scrollX, y: scrollY })),
      })
    }
    await menu('View', 'Zoom on Scroll', 'Off')
    await fit()
    expect(trials[0].after.zoom).toBe(trials[0].before.zoom)
    expect(trials[1].after.zoom).not.toBe(trials[1].before.zoom)
    return { trials }
  })
  await scenario('S12', 'filter and lost-in-canvas recovery', async () => {
    await icon('search').click()
    await pause()
    const panel = page
      .locator('div.absolute')
      .filter({
        has: page.getByRole('heading', { name: 'Filter Tables', exact: true }),
      })
      .last()
    const before = await observe()
    await panel.getByPlaceholder('Search tables...').fill('books')
    await pause()
    const searchOnly = await observe()
    const row = panel
      .getByText('books', { exact: true })
      .locator('..')
      .locator('..')
    await row.locator('button:has(svg.lucide-eye)').click()
    await page.waitForTimeout(1200)
    const filtered = await observe()
    expect(filtered.nodes.some((n) => n.name === 'books')).toBe(false)
    await row.locator('button:has(svg.lucide-eye-off)').click()
    await page.waitForTimeout(1200)
    await panel.locator('button:has(svg.lucide-x)').click()
    await fit()
    const p = await blank()
    await page.mouse.move(p.x, p.y)
    await page.mouse.wheel(18000, 18000)
    await expect(page.getByRole('button', { name: /Show all/i })).toBeVisible({
      timeout: 8000,
    })
    const lost = await observe()
    await shot('S12-lost')
    await page.getByRole('button', { name: /Show all/i }).click()
    await pause()
    const recovered = await observe()
    expect(recovered.nodes.some((n) => n.name === 'books')).toBe(true)
    return {
      beforeViewport: before.viewport,
      searchOnlyViewport: searchOnly.viewport,
      filteredViewport: filtered.viewport,
      filteredNames: filtered.nodes.map((n) => n.name),
      filterState: filtered.persisted.diagram_filters,
      lostViewport: lost.viewport,
      lostRenderedNodes: lost.nodes.length,
      recoveredViewport: recovered.viewport,
    }
  })
  await scenario('S13', 'focus from side list', async () => {
    const before = await observe()
    const header = page
      .locator('aside h3')
      .filter({ has: page.getByText('books', { exact: true }) })
      .first()
    await header.hover()
    await header.locator('svg.lucide-circle-dot-dashed').click()
    await pause()
    const after = await observe()
    expect(after.viewport.zoom).toBe(1)
    expect(after.selected).toEqual(['books'])
    return {
      beforeViewport: before.viewport,
      afterViewport: after.viewport,
      selected: after.selected,
      book: after.nodes.find((n) => n.name === 'books'),
    }
  })
  await scenario('S14', 'context add at pointer', async () => {
    await deselect()
    await fit()
    const before = await observe()
    const point = await blank()
    const camera = await page.locator('.react-flow__viewport').evaluate((e) => {
      const m = new DOMMatrix(getComputedStyle(e).transform),
        b = document.querySelector('.react-flow').getBoundingClientRect()
      return { x: m.e, y: m.f, zoom: m.a, left: b.x, top: b.y }
    })
    const menuChoice = await contextAdd('Table', point)
    await page
      .getByPlaceholder('Table name', { exact: true })
      .fill('context_table')
    await expect
      .poll(async () =>
        (await observe()).persisted.db_tables.some(
          (t) => t.name === 'context_table'
        )
      )
      .toBe(true)
    await page
      .locator(
        '.react-flow__node-table:has(input[placeholder="Table name"]) button:has(svg.lucide-x)'
      )
      .click()
    await deselect()
    await pause()
    const after = await observe()
    const created = after.persisted.db_tables.find(
      (t) => t.name === 'context_table'
    )
    expect(created).toBeTruthy()
    expect(menuChoice.pointerEvent.isTrusted).toBe(true)
    return {
      pointer: point,
      menuChoice,
      expectedMenuClickFlow: {
        x:
          (menuChoice.itemClick.x -
            menuChoice.pointerEvent.canvas.x -
            menuChoice.pointerEvent.viewport.x) /
          menuChoice.pointerEvent.viewport.zoom,
        y:
          (menuChoice.itemClick.y -
            menuChoice.pointerEvent.canvas.y -
            menuChoice.pointerEvent.viewport.y) /
          menuChoice.pointerEvent.viewport.zoom,
      },
      viewport: before.viewport,
      canvas: before.canvas,
      created,
      mappingDeltaGraph: {
        x:
          created.x -
          (menuChoice.itemClick.x -
            menuChoice.pointerEvent.canvas.x -
            menuChoice.pointerEvent.viewport.x) /
            menuChoice.pointerEvent.viewport.zoom,
        y:
          created.y -
          (menuChoice.itemClick.y -
            menuChoice.pointerEvent.canvas.y -
            menuChoice.pointerEvent.viewport.y) /
            menuChoice.pointerEvent.viewport.zoom,
      },
      paneCameraBeforeMenu: camera,
      expectedPointerFlow: {
        x:
          (point.x - before.canvas.x - before.viewport.x) /
          before.viewport.zoom,
        y:
          (point.y - before.canvas.y - before.viewport.y) /
          before.viewport.zoom,
      },
    }
  })
  await scenario('S15', 'minimap and dark theme', async () => {
    await fit()
    await menu('View', 'Hide Mini Map')
    const hidden = (await observe()).minimap
    await menu('View', 'Show Mini Map')
    const shown = (await observe()).minimap
    await menu('View', /^Theme/, 'Dark')
    await shot('S15-dark')
    const dark = (await observe()).theme
    await menu('View', /^Theme/, 'Light')
    await shot('S15-light')
    expect(hidden).toBe(false)
    expect(shown).toBe(true)
    return { hidden, shown, dark, light: (await observe()).theme }
  })
  await scenario('S16', 'undo redo and image export', async () => {
    await fit()
    await deselect()
    await table('inventory').locator('label').click()
    const before = await observe()
    await dragNode(table('inventory'), 50, 30)
    const moved = await observe()
    await page.keyboard.press('Meta+z')
    await pause()
    const undone = await observe()
    await page.keyboard.press('Meta+Shift+z')
    await pause()
    const redone = await observe()
    await menu('Actions', 'Export as', 'PNG')
    const exportDialog = await page.getByRole('dialog').innerText()
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.getByRole('button', { name: 'Export', exact: true }).click()
    const download = await downloadPromise
    await download.saveAs(`${root}results/export.png`)
    const bytes = await readFile(`${root}results/export.png`)
    const image = {
      fileName: download.suggestedFilename(),
      signature: bytes.subarray(1, 4).toString(),
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
      byteLength: bytes.length,
      settingsDialog: exportDialog,
    }
    expect(image.signature).toBe('PNG')
    expect(Math.abs(image.width - before.canvas.width * 4)).toBeLessThanOrEqual(
      1
    )
    expect(
      Math.abs(image.height - before.canvas.height * 4)
    ).toBeLessThanOrEqual(1)
    const position = (state) => {
      const t = state.persisted.db_tables.find((t) => t.name === 'inventory')
      return { x: t.x, y: t.y }
    }
    expect(position(undone)).toEqual(position(before))
    expect(position(redone)).toEqual(position(moved))
    expect(position(moved)).not.toEqual(position(before))
    return {
      before: position(before),
      moved: position(moved),
      undone: position(undone),
      redone: position(redone),
      image,
    }
  })
  await save('summary', { run: run.capturedAt, scenarios: captures, errors })
  expect(errors).toEqual([])
})
