import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type { JavaScriptFlowController } from '../src/public.ts'

declare global {
  var uiControls:
    | {
        readonly controller: JavaScriptFlowController
        readonly interactiveCalls: boolean[]
        readonly mountEdgeToolbar: (edgeId: string) => void
        readonly destroyAll: () => void
      }
    | undefined
}

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Expected a rendered element')
  }

  return box
}

const zoomOf = (page: Page) =>
  page.evaluate(() => globalThis.uiControls?.controller.getViewport().zoom)

const boxX = async (locator: Locator) => {
  const box = await boxOf(locator)

  return box.x
}

const nodePosition = (page: Page, id: string) =>
  page.evaluate(
    (nodeId) => globalThis.uiControls?.controller.getNode(nodeId)?.position,
    id
  )

const nodeX = async (page: Page, id: string) => {
  const position = await nodePosition(page, id)

  return position?.x
}

const drag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 })
  await page.mouse.move(to.x, to.y, { steps: 4 })
}

const centre = (box: {
  x: number
  y: number
  width: number
  height: number
}) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
})

test('Vanilla UI catalog controls drive the viewport, lock, toolbars, search and devtools', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'

    const {
      createFlowControls,
      createFlowDevTools,
      createFlowEdgeToolbar,
      createFlowNodeSearch,
      createFlowNodeToolbar,
      createFlowZoomSelect,
      createFlowZoomSlider,
      mountFlow,
    } = await import(modulePath)

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing host')
    }

    root.replaceChildren()
    root.style.width = '720px'
    root.style.height = '420px'

    const controller = mountFlow(
      root,
      {
        nodes: [
          {
            id: 'a',
            label: 'Alpha',
            position: { x: 80, y: 120 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            id: 'b',
            label: 'Beta',
            position: { x: 400, y: 260 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
          { id: 'c', label: 'Gamma', position: { x: 1100, y: 700 } },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
          mode: 'uncontrolled',
        },
      }
    )

    const interactiveCalls: boolean[] = []

    const nodeContent = document.createElement('button')
    nodeContent.type = 'button'
    nodeContent.textContent = 'Node action'
    nodeContent.style.cssText = 'display:block;width:90px;height:24px'

    const edgeContent = document.createElement('span')
    edgeContent.textContent = 'Edge action'
    edgeContent.style.cssText = 'display:block;width:70px;height:20px'

    const origin = document.createElement('div')
    origin.dataset.testid = 'toolbar-origin'
    origin.append(nodeContent)
    document.body.append(origin)

    const mounts = [
      createFlowControls(controller, {
        position: 'bottom-left',
        onInteractiveChange: (interactive: boolean) =>
          interactiveCalls.push(interactive),
      }),
      createFlowZoomSlider(controller, { position: 'bottom-right' }),
      createFlowZoomSelect(controller, { position: 'top-center' }),
      createFlowNodeSearch(controller, { position: 'top-left' }),
      createFlowDevTools(controller, { position: 'top-right' }),
      createFlowNodeToolbar(controller, nodeContent, { nodeId: 'a' }),
    ]

    globalThis.uiControls = {
      controller,
      interactiveCalls,
      mountEdgeToolbar: (edgeId) => {
        const toolbar = createFlowEdgeToolbar(controller, edgeContent, {
          edgeId,
          x: 300,
          y: 200,
          isVisible: true,
        })

        toolbar.element.dataset.testid = 'edge-toolbar'
        mounts.push(toolbar)
      },
      destroyAll: () => {
        for (const mount of mounts) {
          mount.destroy()
        }
      },
    }
  })

  const canvas = page.getByTestId('flow-canvas')
  const nodeA = page.locator('.flow-node[data-node-id="a"]')
  const nodeToolbar = page.locator('[data-node-toolbar="a"]')
  const edgeToolbar = page.getByTestId('edge-toolbar')

  // Every overlay is scoped to this canvas and marked against canvas gestures.
  await Promise.all(
    (['zoom-slider', 'zoom-select', 'node-search', 'devtools'] as const).map(
      async (kind) => {
        const overlay = page.locator(`[data-flow-ui="${kind}"]`)
        await expect(overlay).toHaveCount(1)
        await expect(overlay).toHaveClass(/nopan.*nodrag.*nowheel/u)
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
    globalThis.uiControls?.controller.setViewport({ x: 0, y: 0, zoom: 1 })
  )

  // Lock toggle blocks drag and connect, and reports the change.
  const lock = page.getByRole('button', { name: 'Toggle interactivity' })
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
  await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'true')
  expect(
    await page.evaluate(() => globalThis.uiControls?.interactiveCalls)
  ).toEqual([false])

  const before = await nodePosition(page, 'a')
  await drag(page, centre(await boxOf(nodeA)), { x: 300, y: 80 })
  await page.mouse.up()
  expect(await nodePosition(page, 'a')).toEqual(before)

  const source = page.locator('[data-node-id="a"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="b"] [data-handle-id="in"]')
  await drag(page, centre(await boxOf(source)), centre(await boxOf(target)))
  await page.mouse.up()
  expect(
    await page.evaluate(() => globalThis.uiControls?.controller.getEdges())
  ).toHaveLength(0)
  await nodeA.click()
  expect(
    await page.evaluate(
      () => globalThis.uiControls?.controller.getNode('a')?.selected
    )
  ).not.toBe(true)

  await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
  expect(
    await page.evaluate(() => globalThis.uiControls?.interactiveCalls)
  ).toEqual([false, true])

  await drag(page, centre(await boxOf(source)), centre(await boxOf(target)))
  await page.mouse.up()
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.uiControls?.controller.getEdges().length)
    )
    .toBe(1)
  await page.evaluate(() => {
    const edgeId = globalThis.uiControls?.controller.getEdges()[0]?.id

    if (edgeId !== undefined) {
      globalThis.uiControls?.mountEdgeToolbar(edgeId)
    }
  })

  // Node toolbar: hidden until its node is the single selection, then
  // anchored above it at a fixed size, following drag and zoom.
  await expect(nodeToolbar).toBeHidden()
  await page.evaluate(() =>
    globalThis.uiControls?.controller.applyEdit({
      operations: [
        { kind: 'update-node', nodeId: 'a', patch: { selected: true } },
      ],
    })
  )
  await expect(nodeToolbar).toBeVisible()

  const expectToolbarAboveNode = () =>
    expect(async () => {
      const node = await boxOf(nodeA)
      const toolbar = await boxOf(nodeToolbar)
      expect(toolbar.width).toBeCloseTo(90, 0)
      expect(toolbar.height).toBeCloseTo(24, 0)
      expect(toolbar.x + toolbar.width / 2).toBeCloseTo(
        node.x + node.width / 2,
        0
      )
      expect(toolbar.y + toolbar.height).toBeCloseTo(node.y - 10, 0)
    }).toPass({ timeout: 3000 })

  await expectToolbarAboveNode()

  const startBox = await boxOf(nodeA)
  await drag(page, centre(startBox), { x: 260, y: 140 })
  // Mid-drag, before the document commits, the toolbar follows the node.
  await expect.poll(() => boxX(nodeA)).not.toBe(startBox.x)
  await expectToolbarAboveNode()
  await page.mouse.up()
  await expect.poll(() => nodeX(page, 'a')).not.toBe(80)
  await expectToolbarAboveNode()
  await page.evaluate(() =>
    globalThis.uiControls?.controller.setViewport({ x: 30, y: 20, zoom: 2 })
  )
  await expectToolbarAboveNode()

  // Edge toolbar: fixed size, centred on its transformed flow point.
  await expect(edgeToolbar).toBeVisible()

  await expect(async () => {
    const canvasBox = await boxOf(canvas)
    const edgeBox = await boxOf(edgeToolbar)
    expect(edgeBox.width).toBeCloseTo(70, 0)
    expect(edgeBox.x + edgeBox.width / 2 - canvasBox.x).toBeCloseTo(
      30 + 300 * 2,
      0
    )
    expect(edgeBox.y + edgeBox.height / 2 - canvasBox.y).toBeCloseTo(
      20 + 200 * 2,
      0
    )
  }).toPass({ timeout: 3000 })

  // Node search: filter, navigate by keyboard, select and centre.
  await page.evaluate(() =>
    globalThis.uiControls?.controller.setViewport({ x: 0, y: 0, zoom: 1 })
  )

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
  await search.press('Backspace')
  await search.fill('gam')
  await expect(results.getByRole('option')).toHaveText(['Gamma'])
  await search.press('Enter')
  await expect(results).toBeHidden()
  await expect
    .poll(() =>
      page.evaluate(() =>
        globalThis.uiControls?.controller
          .getNodes()
          .filter((node) => node.selected === true)
          .map((node) => node.id)
      )
    )
    .toEqual(['c'])
  await expect
    .poll(async () => {
      const node = await boxOf(page.locator('.flow-node[data-node-id="c"]'))
      const box = await boxOf(canvas)

      // Within a pixel: the canvas border offsets its box from the pane.
      return (
        Math.abs(node.x + node.width / 2 - box.x - box.width / 2) <= 1.5 &&
        Math.abs(node.y + node.height / 2 - box.y - box.height / 2) <= 1.5
      )
    })
    .toBe(true)
  expect(await zoomOf(page)).toBeCloseTo(1)
  expect(
    await page.evaluate(
      () => globalThis.uiControls?.controller.getNodes().length
    )
  ).toBe(3)

  // DevTools: toggle panels, list nodes, log a semantic change, show viewport.
  const devtools = page.getByRole('group', { name: 'Flow devtools' })
  const inspector = devtools.getByRole('region', { name: 'Node inspector' })
  await expect(inspector).toBeHidden()
  await devtools.getByRole('button', { name: 'Node inspector' }).click()
  await expect(inspector).toBeVisible()
  await expect(inspector.getByRole('listitem')).toHaveCount(4)
  await expect(inspector.locator('[data-devtools-node="c"]')).toContainText(
    'Gamma'
  )
  await expect(inspector.locator('[data-devtools-node="c"]')).toContainText(
    'selected'
  )
  await devtools.getByRole('button', { name: 'Change logger' }).click()
  await page.evaluate(() =>
    globalThis.uiControls?.controller.applyEdit({
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

  // Disposal removes overlays, releases the lock and restores toolbar content.
  await lock.click()
  await page.evaluate(() => globalThis.uiControls?.destroyAll())
  await expect(page.locator('.flow-ui-overlay')).toHaveCount(0)
  await expect(page.locator('.flow-toolbar-layer')).toHaveCount(0)
  await expect(
    page
      .getByTestId('toolbar-origin')
      .getByRole('button', { name: 'Node action' })
  ).toHaveCount(1)

  await page.evaluate(() =>
    globalThis.uiControls?.controller.setViewport({ x: 0, y: 0, zoom: 1 })
  )

  const released = await nodePosition(page, 'b')
  await drag(
    page,
    centre(await boxOf(page.locator('.flow-node[data-node-id="b"]'))),
    {
      x: 200,
      y: 300,
    }
  )
  await page.mouse.up()
  await expect.poll(() => nodePosition(page, 'b')).not.toEqual(released)
})
