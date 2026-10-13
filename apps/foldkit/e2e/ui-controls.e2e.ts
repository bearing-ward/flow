import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type { FoldkitUiControlsFixture } from './ui-controls-fixture.ts'

declare global {
  interface Window {
    __flowFoldkitUiControls?: FoldkitUiControlsFixture
    __flowFoldkitUiControlsMount?: () => FoldkitUiControlsFixture
  }
}

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Expected a rendered element')
  }

  return box
}

const centre = (box: {
  x: number
  y: number
  width: number
  height: number
}) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })

const zoomOf = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitUiControls?.viewport().zoom)

const nodePosition = (page: Page, id: string) =>
  page.evaluate(
    (nodeId) =>
      window.__flowFoldkitUiControls?.nodes().find((node) => node.id === nodeId)
        ?.position,
    id
  )

const drag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

test('Foldkit UI catalog controls drive the viewport, lock, search and devtools', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const modulePath = '/e2e/ui-controls-fixture.ts'
    const { mountFoldkitUiControlsFixture } = await import(modulePath)
    const host = document.querySelector<HTMLElement>('#app')

    if (host === null) {
      throw new Error('Missing Foldkit fixture host')
    }

    host.innerHTML = '<div id="ui-controls-fixture"></div>'

    const container = document.querySelector<HTMLElement>(
      '#ui-controls-fixture'
    )

    if (container === null) {
      throw new Error('Missing Foldkit UI controls fixture container')
    }

    window.__flowFoldkitUiControlsMount =
      mountFoldkitUiControlsFixture(container)
  })
  await expect(page.locator('.flow-foldkit-canvas')).toHaveCount(1)
  await page.evaluate(() => {
    const mount = window.__flowFoldkitUiControlsMount

    if (mount === undefined) {
      throw new Error('Foldkit UI controls fixture was not embedded')
    }

    window.__flowFoldkitUiControls = mount()
  })

  const canvas = page.locator('.flow-foldkit-canvas')
  const nodeA = page.locator('.flow-foldkit-node[data-node-id="a"]')

  await Promise.all(
    (['zoom-slider', 'zoom-select', 'node-search', 'devtools'] as const).map(
      async (kind) => {
        const overlay = canvas.locator(`[data-flow-ui="${kind}"]`)
        await expect(overlay).toHaveCount(1)
        await expect(overlay).toHaveClass(
          /flow-foldkit-nopan.*flow-foldkit-nodrag.*flow-foldkit-nowheel/u
        )
        await expect(overlay).toHaveAttribute('data-flow-no-drag', 'true')
      }
    )
  )

  // Zoom slider: the range drives zoom within limits; the percent resets.
  const slider = page.getByRole('slider', { name: 'Zoom level' })
  await expect(slider).toHaveAttribute('min', '0.5')
  await expect(slider).toHaveAttribute('max', '2')
  await slider.fill('1.5')
  await expect.poll(() => zoomOf(page)).toBeCloseTo(1.5)
  await expect(
    page.getByRole('button', { name: 'Reset zoom to 100%' })
  ).toHaveText('150%')
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => zoomOf(page)).toBeCloseTo(1.51)
  await page.getByRole('button', { name: 'Reset zoom to 100%' }).click()
  await expect.poll(() => zoomOf(page)).toBeCloseTo(1)

  // Zoom select: presets zoom, fit view fits, the label shows the zoom.
  const select = page.getByRole('combobox', { name: 'Zoom' })
  await select.selectOption('2')
  await expect.poll(() => zoomOf(page)).toBeCloseTo(2)
  await expect(select.locator('option:checked')).toHaveText('200%')
  await select.selectOption('fit')
  await expect.poll(() => zoomOf(page)).toBeLessThan(1)
  await page.evaluate(() =>
    window.__flowFoldkitUiControls?.setViewport({ x: 0, y: 0, zoom: 1 })
  )

  // Lock toggle blocks drag, connect and select, and reports the change.
  const lock = page.getByRole('button', { name: 'Toggle interactivity' })
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
  await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'true')
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitUiControls?.interactiveCalls()
    )
  ).toEqual([false])

  const before = await nodePosition(page, 'a')
  await drag(page, centre(await boxOf(nodeA)), { x: 300, y: 80 })
  expect(await nodePosition(page, 'a')).toEqual(before)

  const source = page.locator('[data-node-id="a"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="b"] [data-handle-id="in"]')
  await drag(page, centre(await boxOf(source)), centre(await boxOf(target)))
  expect(
    await page.evaluate(() => window.__flowFoldkitUiControls?.edgeCount())
  ).toBe(0)
  await nodeA.click()
  expect(
    await page.evaluate(
      () =>
        window.__flowFoldkitUiControls?.nodes().find((node) => node.id === 'a')
          ?.selected
    )
  ).not.toBe(true)

  await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitUiControls?.interactiveCalls()
    )
  ).toEqual([false, true])
  await drag(page, centre(await boxOf(source)), centre(await boxOf(target)))
  await expect
    .poll(() =>
      page.evaluate(() => window.__flowFoldkitUiControls?.edgeCount())
    )
    .toBe(1)
  await drag(page, centre(await boxOf(nodeA)), { x: 260, y: 140 })
  await expect.poll(() => nodePosition(page, 'a')).not.toEqual(before)

  // Node search: filter, navigate by keyboard, select and centre.
  const search = page.getByRole('combobox', { name: 'Search nodes' })
  const results = page.getByRole('listbox', { name: 'Matching nodes' })
  await search.fill('a')
  await expect(results.getByRole('option')).toHaveText([
    'Alpha',
    'Beta',
    'Gamma',
  ])
  await expect(results.getByRole('option', { name: 'Alpha' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await search.press('ArrowUp')
  await expect(results.getByRole('option', { name: 'Gamma' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await search.fill('gam')
  await expect(results.getByRole('option')).toHaveText(['Gamma'])
  await search.press('Enter')
  await expect(results).toBeHidden()
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowFoldkitUiControls
          ?.nodes()
          .filter((node) => node.selected === true)
          .map((node) => node.id)
      )
    )
    .toEqual(['c'])
  await expect
    .poll(async () => {
      const node = await boxOf(
        page.locator('.flow-foldkit-node[data-node-id="c"]')
      )

      const box = await boxOf(canvas)

      // Within a pixel: the canvas border offsets its box from the pane.
      return (
        Math.abs(node.x + node.width / 2 - box.x - box.width / 2) <= 1.5 &&
        Math.abs(node.y + node.height / 2 - box.y - box.height / 2) <= 1.5
      )
    })
    .toBe(true)
  expect(await zoomOf(page)).toBeCloseTo(1)

  // Clicking a result with the pointer also selects.
  await search.fill('beta')
  await results.getByRole('option', { name: 'Beta' }).click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowFoldkitUiControls
          ?.nodes()
          .filter((node) => node.selected === true)
          .map((node) => node.id)
      )
    )
    .toEqual(['b'])

  // DevTools: toggle panels, list nodes, log a semantic change, show viewport.
  const devtools = page.getByRole('group', { name: 'Flow devtools' })
  const inspector = devtools.getByRole('region', { name: 'Node inspector' })
  await expect(inspector).toBeHidden()
  await devtools.getByRole('button', { name: 'Node inspector' }).click()
  await expect(inspector).toBeVisible()
  await expect(inspector.getByRole('listitem')).toHaveCount(4)
  await expect(inspector.locator('[data-devtools-node="b"]')).toContainText(
    'Beta'
  )
  await expect(inspector.locator('[data-devtools-node="b"]')).toContainText(
    'selected'
  )
  await devtools.getByRole('button', { name: 'Change logger' }).click()
  await page.evaluate(() =>
    window.__flowFoldkitUiControls?.applyEdit({
      operations: [
        {
          kind: 'update-node',
          nodeId: 'b',
          patch: { position: { x: 420, y: 250 } },
        },
      ],
    })
  )
  await expect(
    devtools.getByRole('log').getByRole('listitem').first()
  ).toHaveText('node b position 420, 250')
  await expect(inspector.locator('[data-devtools-node="b"]')).toContainText(
    '(420, 250)'
  )
  await devtools.getByRole('button', { name: 'Viewport logger' }).click()
  await expect(devtools.locator('output')).toHaveText(/zoom: 1$/u)
  await devtools.getByRole('button', { name: 'Node inspector' }).click()
  await expect(inspector).toBeHidden()

  // Disposal removes the panels and releases the lock.
  await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => window.__flowFoldkitUiControls?.disposeAll())
  await expect(canvas.locator('[data-flow-ui]')).toHaveCount(0)
  await expect(
    canvas.getByRole('group', { name: 'Flow controls' })
  ).toHaveCount(0)

  const nodeB = page.locator('.flow-foldkit-node[data-node-id="b"]')
  const released = await nodePosition(page, 'b')
  const boxB = await boxOf(nodeB)
  await drag(page, centre(boxB), { x: boxB.x - 60, y: boxB.y + 40 })
  await expect.poll(() => nodePosition(page, 'b')).not.toEqual(released)
})
