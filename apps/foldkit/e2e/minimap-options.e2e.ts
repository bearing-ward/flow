import { flowMiniMapWheelZoom } from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { FoldkitMiniMapOptionsFixture } from './minimap-options-fixture.ts'

declare global {
  interface Window {
    __flowFoldkitMiniMapOptions?: FoldkitMiniMapOptionsFixture
    __flowFoldkitMiniMapOptionsMount?: () => FoldkitMiniMapOptionsFixture
  }
}

const viewportOf = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitMiniMapOptions?.viewport())

const viewportValue = (page: Page, key: 'x' | 'y' | 'zoom') =>
  page.evaluate(
    (axis) => window.__flowFoldkitMiniMapOptions?.viewport()[axis],
    key
  )

const mountFixture = async (page: Page): Promise<void> => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const modulePath = '/e2e/minimap-options-fixture.ts'
    const { mountFoldkitMiniMapOptionsFixture } = await import(modulePath)
    const host = document.querySelector<HTMLElement>('#app')

    if (host === null) {
      throw new Error('Missing Foldkit fixture host')
    }

    host.innerHTML = '<div id="minimap-options-fixture"></div>'

    const container = document.querySelector<HTMLElement>(
      '#minimap-options-fixture'
    )

    if (container === null) {
      throw new Error('Missing Foldkit minimap options fixture container')
    }

    window.__flowFoldkitMiniMapOptionsMount =
      mountFoldkitMiniMapOptionsFixture(container)
  })
  await expect(page.locator('.flow-foldkit-canvas')).toHaveCount(1)
  await page.evaluate(() => {
    const mount = window.__flowFoldkitMiniMapOptionsMount

    if (mount === undefined) {
      throw new Error('Foldkit minimap options fixture was not embedded')
    }

    window.__flowFoldkitMiniMapOptions = mount()
  })
}

test('Foldkit MiniMap draws node, mask and background options', async ({
  page,
}) => {
  await mountFixture(page)

  const minimap = page.getByTestId('styled-minimap')
  const nodeA = minimap.locator('[data-minimap-node="a"]')
  const nodeB = minimap.locator('[data-minimap-node="b"]')

  await expect(nodeA).toHaveClass(/flow-foldkit-minimap-node/u)
  await expect(nodeA).toHaveClass(/fixture-node-a/u)
  await expect(nodeA).toHaveClass(/selected/u)
  await expect(nodeB).toHaveClass(/fixture-node-b/u)
  await expect(nodeA).toHaveCSS('fill', 'rgb(255, 0, 0)')
  await expect(nodeB).toHaveCSS('fill', 'rgb(0, 128, 0)')
  await expect(nodeA).toHaveCSS('stroke', 'rgb(0, 0, 255)')
  await expect(nodeB).toHaveCSS('stroke', 'rgb(1, 2, 3)')
  await expect(nodeA).toHaveCSS('stroke-width', '3px')
  await expect(nodeA).toHaveAttribute('rx', '7')

  const mask = minimap.locator('[data-minimap-mask]')
  await expect(mask).toHaveCSS('fill', 'rgba(10, 20, 30, 0.5)')
  await expect(mask).toHaveCSS('stroke', 'rgb(200, 0, 200)')
  await expect(mask).toHaveCSS('stroke-width', '2px')
  await expect(mask).toHaveAttribute('fill-rule', 'evenodd')
  await expect(minimap).toHaveCSS('background-color', 'rgb(250, 240, 230)')
  await expect(minimap.locator('.flow-foldkit-minimap-background')).toHaveCSS(
    'fill',
    'rgb(250, 240, 230)'
  )

  // center-right: vertically centred on the canvas's right edge.
  await expect(minimap).toHaveAttribute('data-position', 'center-right')

  const placement = await page.evaluate(() => {
    const canvas = document.querySelector('.flow-foldkit-canvas')
    const element = document.querySelector('[data-testid="styled-minimap"]')

    if (canvas === null || element === null) {
      throw new Error('Missing canvas or minimap')
    }

    const outer = canvas.getBoundingClientRect()
    const inner = element.getBoundingClientRect()

    return {
      centerOffset:
        inner.top + inner.height / 2 - (outer.top + outer.height / 2),
      rightGap: outer.right - inner.right,
    }
  })

  expect(Math.abs(placement.centerOffset)).toBeLessThan(2)
  expect(placement.rightGap).toBeGreaterThan(0)
  expect(placement.rightGap).toBeLessThan(40)

  // The configured title names the minimap.
  await expect(minimap.locator('title')).toHaveText('Übersicht')
  await expect(minimap).toHaveAttribute('aria-label', 'Übersicht')
})

test('Foldkit MiniMap custom node renderer and ariaLabel null', async ({
  page,
}) => {
  await mountFixture(page)

  const minimap = page.getByTestId('custom-minimap')

  await expect(minimap.locator('circle.fixture-custom-node')).toHaveCount(2)
  await expect(minimap.locator('[data-minimap-node="a"]')).toHaveAttribute(
    'data-selected',
    'true'
  )
  await expect(minimap.locator('[data-minimap-node="b"]')).toHaveAttribute(
    'data-selected',
    'false'
  )
  await expect(minimap.locator('title')).toHaveCount(0)
  await expect(minimap).not.toHaveAttribute('aria-labelledby', /.*/u)
  await expect(minimap).not.toHaveAttribute('aria-label', /.*/u)
  await expect(minimap).toHaveAttribute('data-position', 'top-left')
})

test('Foldkit MiniMap pannable drag pans and zoomable wheel zooms', async ({
  page,
}) => {
  await mountFixture(page)

  const minimap = page.getByTestId('styled-minimap')
  const box = await minimap.boundingBox()

  if (box === null) {
    throw new Error('Expected a rendered minimap')
  }

  // Start above the vertically centred panel that shares the right edge.
  const start = { x: box.x + box.width / 2, y: box.y + 20 }

  // Drag right and down: the viewport moves the other way, as React.
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 20, start.y + 10, { steps: 5 })
  await page.mouse.up()

  await expect.poll(() => viewportValue(page, 'x')).toBeLessThan(-20)
  await expect.poll(() => viewportValue(page, 'y')).toBeLessThan(-5)
  expect(await viewportValue(page, 'zoom')).toBe(1)

  await page.evaluate(() =>
    window.__flowFoldkitMiniMapOptions?.setViewport({ x: 0, y: 0, zoom: 1 })
  )
  await expect.poll(() => viewportValue(page, 'x')).toBe(0)

  // Wheel up zooms in around the pane centre by React's zoomStep formula.
  const expectedIn = flowMiniMapWheelZoom({
    zoom: 1,
    deltaY: -100,
    deltaMode: 0,
    zoomStep: 2,
  })

  // zoomStep 2 doubles the default step: 2^0.4 instead of 2^0.2.
  expect(expectedIn).toBeCloseTo(2 ** 0.4, 6)
  await page.mouse.move(start.x, start.y)
  await page.mouse.wheel(0, -100)
  await expect
    .poll(() => viewportValue(page, 'zoom'))
    .toBeCloseTo(expectedIn, 6)

  const zoomed = await viewportOf(page)

  if (zoomed === undefined) {
    throw new Error('Expected a viewport')
  }

  const pane = await page.locator('.flow-foldkit-canvas').boundingBox()

  if (pane === null) {
    throw new Error('Expected a rendered pane')
  }

  // The pane centre stays on the same flow point (flow origin before zoom).
  const centreX = pane.width / 2
  expect((centreX - zoomed.x) / zoomed.zoom).toBeCloseTo(centreX, 0)

  await page.mouse.wheel(0, 200)
  await expect
    .poll(() => viewportValue(page, 'zoom'))
    .toBeCloseTo(
      flowMiniMapWheelZoom({
        zoom: zoomed.zoom,
        deltaY: 200,
        deltaMode: 0,
        zoomStep: 2,
      }),
      6
    )
})

test('Foldkit MiniMap onClick and onNodeClick replace click-to-centre', async ({
  page,
}) => {
  await mountFixture(page)

  const minimap = page.getByTestId('custom-minimap')
  const nodeB = minimap.locator('[data-minimap-node="b"]')
  const nodeBox = await nodeB.boundingBox()
  const box = await minimap.boundingBox()

  if (nodeBox === null || box === null) {
    throw new Error('Expected a rendered minimap node')
  }

  await page.mouse.click(
    nodeBox.x + nodeBox.width / 2,
    nodeBox.y + nodeBox.height / 2
  )

  await expect
    .poll(() =>
      page.evaluate(() => window.__flowFoldkitMiniMapOptions?.nodeClicks())
    )
    .toEqual(['b'])

  const [nodePoint] =
    (await page.evaluate(() => window.__flowFoldkitMiniMapOptions?.clicks())) ??
    []

  // The flow point lies inside node b (stored at 600, 400).
  expect(nodePoint?.x).toBeGreaterThan(590)
  expect(nodePoint?.y).toBeGreaterThan(390)

  // An empty spot reports only onClick; neither click recentres.
  await page.mouse.click(box.x + 4, box.y + 4)
  await expect
    .poll(async () => {
      const clicks = await page.evaluate(() =>
        window.__flowFoldkitMiniMapOptions?.clicks()
      )

      return clicks?.length
    })
    .toBe(2)
  expect(
    await page.evaluate(() => window.__flowFoldkitMiniMapOptions?.nodeClicks())
  ).toEqual(['b'])
  expect(await viewportOf(page)).toEqual({ x: 0, y: 0, zoom: 1 })
})

test('Foldkit MiniMap redraws from live positions during a node drag', async ({
  page,
}) => {
  await mountFixture(page)

  const node = page.locator('.flow-foldkit-node[data-node-id="b"]')

  const rect = page.locator(
    '[data-testid="styled-minimap"] [data-minimap-node="b"]'
  )

  const nodeBox = await node.boundingBox()

  if (nodeBox === null) {
    throw new Error('Expected a rendered node')
  }

  const readRect = () =>
    rect.evaluate((element) => ({
      x: Number(element.getAttribute('x')),
      y: Number(element.getAttribute('y')),
    }))

  const before = await readRect()

  // The centre avoids the node's corner selection button.
  const from = {
    x: nodeBox.x + nodeBox.width / 2,
    y: nodeBox.y + nodeBox.height / 2,
  }

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(from.x - 200, from.y - 150, { steps: 8 })

  // Mid-drag, before mouse up: the minimap already shows the live position.
  await expect
    .poll(() =>
      page.evaluate(() => window.__flowFoldkitMiniMapOptions?.dragUpdates())
    )
    .toBeGreaterThan(0)
  await expect
    .poll(() => rect.evaluate((element) => Number(element.getAttribute('x'))))
    .not.toBe(before.x)

  const during = await readRect()

  expect(during.y).not.toBe(before.y)
  await page.mouse.up()
})

test('Foldkit controls and panels take ariaLabelConfig and center positions', async ({
  page,
}) => {
  await mountFixture(page)

  const group = page.getByRole('group', { name: 'Steuerung' })
  await expect(group).toHaveAttribute('data-position', 'center-left')

  await Promise.all(
    ['Vergrößern', 'Verkleinern', 'Einpassen', 'Interaktivität umschalten'].map(
      (name) => expect(group.getByRole('button', { name })).toHaveCount(1)
    )
  )

  const panel = page.getByRole('group', { name: 'Center panel' })
  await expect(panel).toHaveClass(/flow-foldkit-panel-center-right/u)

  const offsets = await page.evaluate(() => {
    const canvas = document.querySelector('.flow-foldkit-canvas')
    const controls = document.querySelector('.flow-foldkit-controls')
    const content = document.querySelector('.flow-foldkit-panel-center-right')

    if (canvas === null || controls === null || content === null) {
      throw new Error('Missing canvas, controls or panel')
    }

    const outer = canvas.getBoundingClientRect()
    const middle = outer.top + outer.height / 2

    const centre = (element: Element) => {
      const rect = element.getBoundingClientRect()

      return {
        vertical: rect.top + rect.height / 2 - middle,
        left: rect.left - outer.left,
        right: outer.right - rect.right,
      }
    }

    return { controls: centre(controls), panel: centre(content) }
  })

  expect(Math.abs(offsets.controls.vertical)).toBeLessThan(2)
  // 12px inset inside the canvas's 1px border.
  expect(offsets.controls.left).toBeGreaterThanOrEqual(11)
  expect(offsets.controls.left).toBeLessThanOrEqual(14)
  expect(Math.abs(offsets.panel.vertical)).toBeLessThan(2)
  expect(offsets.panel.right).toBeGreaterThanOrEqual(11)
  expect(offsets.panel.right).toBeLessThanOrEqual(14)

  // fitViewOptions.nodes fits only node b.
  await group.getByRole('button', { name: 'Einpassen' }).click()
  await expect.poll(() => viewportValue(page, 'x')).toBeLessThan(-200)
})
