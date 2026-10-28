import { expect, test } from '@playwright/test'

import { schemaStudioContract } from '../../shared-e2e/schema-studio-contract.ts'

const {
  status,
  viewport,
  inspectModel,
  node,
  heading,
  settle,
  bounds,
  focus,
  select,
} = schemaStudioContract('vanilla')

test('S5 elevates and animates connected edges with normal strokes; only the selected edge uses accent', async ({
  page,
}) => {
  const edge = page.getByTestId('relationship-relation-0')
  await select(page, 'books')
  await expect(edge).toHaveAttribute('data-highlighted', 'true')
  await expect(edge).toHaveCSS('stroke', 'rgb(100, 133, 147)')
  await expect(edge).toHaveCSS('stroke-width', '1.5px')
  const connected = page.locator('.flow-edge-group[data-edge-id="relation-0"]')
  await expect(connected).toHaveAttribute('data-z-index', '1')
  await expect(connected).toHaveClass(/animated/u)
  await expect(edge).toHaveCSS('animation-name', 'flow-dashdraw')
  await expect(
    page.locator('.flow-edge-group[data-edge-id="relation-6"]')
  ).toHaveAttribute('data-z-index', '0')
  await expect(node(page, 'books')).toHaveCSS('z-index', '1000')
  await expect(node(page, 'authors')).toHaveCSS('z-index', '0')
  await expect(edge).toHaveAttribute('marker-start', /-normal\)/u)
  await expect(page.locator('[data-node-toolbar="books"]')).toBeVisible()
  await page.getByTestId('cardinality-relation-0').click()
  await expect(edge).toHaveCSS('stroke', 'rgb(221, 90, 36)')
  await expect(edge).toHaveAttribute('marker-start', /-selected\)/u)
  await expect(edge).toHaveAttribute('marker-end', /-selected\)/u)
  await expect(page.getByTestId('relationship-relation-1')).toHaveCSS(
    'stroke',
    'rgb(100, 133, 147)'
  )
})

test('S14 context menus add at the pointer and duplicate or edit nodes', async ({
  page,
}) => {
  await page.evaluate(() => {
    const defaults: boolean[] = []
    window.addEventListener('contextmenu', (event) => {
      defaults.push(event.defaultPrevented)
      document.body.dataset.contextDefaults = JSON.stringify(defaults)
    })
  })
  const before = await viewport(page)
  const rect = await bounds(page.locator('.studio-canvas'))
  const point = { x: 1250, y: 850 }
  await page.mouse.click(point.x, point.y, { button: 'right' })
  await expect(page.locator('body')).toHaveAttribute(
    'data-context-defaults',
    '[true]'
  )
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

  if (added === undefined) {
    throw new Error('Missing added table')
  }

  await focus(page, added.id)
  await heading(page, added.id).click({ button: 'right' })
  await expect(
    page.getByRole('menuitem', { name: 'Duplicate item', exact: true })
  ).toBeVisible()
  await expect(page.locator('body')).toHaveAttribute(
    'data-context-defaults',
    '[true,true]'
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

test('Beyond: reconnects an edge endpoint to another field', async ({
  page,
}) => {
  await page.getByTestId('cardinality-relation-0').click()
  await page.keyboard.press('Escape')

  await expect(
    page.locator('.flow-edge-group[data-edge-id="relation-0"]')
  ).toHaveAttribute('aria-pressed', 'true')

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
