/* oxlint-disable no-await-in-loop -- Variations own the same page and must finish before remounting. */
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type {
  ClosingOptionsFixture,
  ClosingOptionsInput,
} from '../src/closing-options-fixture.ts'

declare global {
  var closingOptions: ClosingOptionsFixture | undefined
}

const mount = async (page: Page, input: ClosingOptionsInput = {}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async (serialized) => {
    const modulePath = '/src/closing-options-fixture.ts'
    const { mountClosingOptions } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing host')
    }

    globalThis.closingOptions = mountClosingOptions(
      root,
      JSON.parse(serialized)
    )
  }, JSON.stringify(input))
  await page.waitForFunction(() =>
    globalThis.closingOptions?.controller.nodesInitialized()
  )
}

const node = (page: Page, id: string) =>
  page.locator(`.flow-node[data-node-id="${id}"]`)

const center = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Missing element')
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const events = (page: Page) =>
  page.evaluate(() => globalThis.closingOptions?.events)

const viewport = (page: Page) =>
  page.evaluate(() => globalThis.closingOptions?.controller.getViewport())

const viewportZoom = async (page: Page) => {
  const value = await viewport(page)

  return value?.zoom
}

const viewportY = async (page: Page) => {
  const value = await viewport(page)

  return value?.y
}

const nodeX = async (page: Page, id: string) => {
  const value = await node(page, id).boundingBox()

  return value?.x
}

const drag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 5 })
  await page.mouse.up()
}

const frameBarrier = (page: Page) =>
  page.evaluate(() => {
    const settled = Promise.withResolvers<boolean>()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        settled.resolve(true)
      })
    })

    return settled.promise
  })

const panePoint = async (page: Page, x: number, y: number) => {
  const box = await page.locator('.flow-canvas').boundingBox()

  if (box === null) {
    throw new Error('Missing pane')
  }

  return { x: box.x + x, y: box.y + y }
}

test('default deletion exempts Panel controls and edge-label HTML and preserves selected nodes', async ({
  page,
}) => {
  await mount(page, { editingControls: true })
  await node(page, 'a').click()
  await page.evaluate(async () => {
    await globalThis.closingOptions?.controller.updateEdge('a-b', {
      selected: true,
    })
  })

  for (const testId of [
    'panel-input',
    'panel-textarea',
    'panel-select',
    'panel-div',
    'edge-label-input',
  ]) {
    const control = page.getByTestId(testId)
    await control.focus()
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Delete')
    await expect(node(page, 'a')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.flow-edge-group')).toHaveCount(1)
  }

  await page.getByTestId('panel-input').fill('typing')
  await page.keyboard.press('Backspace')
  await expect(page.getByTestId('panel-input')).toHaveValue('typin')
  await node(page, 'a').focus()
  await page.keyboard.press('Backspace')
  await expect(node(page, 'a')).toBeVisible()
  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
})

test('default deletion still removes only the focused selected edge', async ({
  page,
}) => {
  for (const key of ['Backspace', 'Delete']) {
    await mount(page)
    await page.evaluate(async () => {
      await globalThis.closingOptions?.controller.updateNode('a', {
        selected: true,
      })
    })
    await page.locator('.flow-edge-group').focus()
    await page.keyboard.press(key)
    await expect(page.locator('.flow-edge-group')).toHaveCount(0)
    await expect(node(page, 'a')).toHaveAttribute('aria-pressed', 'true')
    await expect(node(page, 'b')).toBeVisible()
  }
})

test('explicit deletion exempts editable controls and only fires on a configured key', async ({
  page,
}) => {
  await mount(page, {
    editingControls: true,
    options: { deleteKeyCode: 'Delete' },
  })
  await node(page, 'a').click()
  await page.getByTestId('panel-input').fill('text')
  await page.keyboard.press('Delete')
  await expect(node(page, 'a')).toBeVisible()
  await page.getByTestId('edge-label-input').focus()
  await page.keyboard.press('Delete')
  await expect(node(page, 'a')).toBeVisible()
  await page.locator('.flow-canvas').focus()
  await page.keyboard.down('Delete')
  await expect(node(page, 'a')).toHaveCount(0)
  await page.evaluate(async () => {
    await globalThis.closingOptions?.controller.updateNode('b', {
      selected: true,
    })
  })
  await page.keyboard.press('q')
  await expect(node(page, 'b')).toBeVisible()
  await page.keyboard.up('Delete')
})

test('deleteKeyCode alternatives and chords delete selected nodes, incident edges and selected edges', async ({
  page,
}) => {
  await mount(page, { options: { deleteKeyCode: ['Control+d', 'KeyX'] } })
  await node(page, 'a').click()
  await page.keyboard.press('Backspace')
  await expect(node(page, 'a')).toBeVisible()
  await page.keyboard.press('Control+d')
  await expect(node(page, 'a')).toHaveCount(0)
  await expect(page.locator('.flow-edge-group')).toHaveCount(0)
  await node(page, 'b').click()
  await page.keyboard.press('x')
  await expect(node(page, 'b')).toHaveCount(0)
})

test('deleteKeyCode supports held ordinary-key combinations', async ({
  page,
}) => {
  await mount(page, { options: { deleteKeyCode: 'a+b' } })
  await node(page, 'a').click()
  await page.keyboard.down('a')
  await expect(node(page, 'a')).toBeVisible()
  await page.keyboard.press('b')
  await page.keyboard.up('a')
  await expect(node(page, 'a')).toHaveCount(0)
  await expect(page.locator('.flow-edge-group')).toHaveCount(0)
  await node(page, 'b').click()
  await page.keyboard.press('ArrowRight')
  await expect(node(page, 'b')).toBeVisible()
})

test('deleteKeyCode null disables keyboard deletion', async ({ page }) => {
  await mount(page, { options: { deleteKeyCode: null } })
  await page.locator('.flow-edge-group').focus()
  await page.keyboard.press('Delete')
  await page.keyboard.press('Backspace')
  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
})

test('selectionKeyCode uses an ordinary held key and null disables the selection key', async ({
  page,
}) => {
  await mount(page, {
    options: {
      selectionKeyCode: ['k', 'Shift'],
      panOnDrag: false,
      autoPanOnSelection: false,
    },
  })
  await page.keyboard.down('k')
  await drag(
    page,
    await panePoint(page, 40, 40),
    await panePoint(page, 600, 270)
  )
  await page.keyboard.up('k')
  await expect(node(page, 'a')).toHaveAttribute('aria-pressed', 'true')
  await expect(node(page, 'b')).toHaveAttribute('aria-pressed', 'true')
  await mount(page, { options: { selectionKeyCode: null, panOnDrag: false } })
  await page.keyboard.down('Shift')
  await drag(
    page,
    await panePoint(page, 40, 40),
    await panePoint(page, 600, 270)
  )
  await page.keyboard.up('Shift')
  await expect(node(page, 'a')).not.toHaveAttribute('aria-pressed', 'true')
})

test('multiSelectionKeyCode overrides modifier defaults and supports null', async ({
  page,
}) => {
  await mount(page, { options: { multiSelectionKeyCode: 'Alt' } })
  await node(page, 'a').click()
  await page.keyboard.down('Alt')
  await node(page, 'b').click()
  await page.keyboard.up('Alt')
  await expect(node(page, 'a')).toHaveAttribute('aria-pressed', 'true')
  await expect(node(page, 'b')).toHaveAttribute('aria-pressed', 'true')
  await mount(page, { options: { multiSelectionKeyCode: null } })
  await node(page, 'a').click()
  await page.keyboard.down('Control')
  await node(page, 'b').click()
  await page.keyboard.up('Control')
  await expect(node(page, 'a')).not.toHaveAttribute('aria-pressed', 'true')
})

test('zoomActivationKeyCode temporarily zooms instead of scroll panning', async ({
  page,
}) => {
  await mount(page, {
    options: {
      panOnScroll: true,
      zoomOnScroll: false,
      zoomActivationKeyCode: 'z',
    },
  })
  const point = await panePoint(page, 650, 350)
  await page.mouse.move(point.x, point.y)
  await page.keyboard.down('z')
  await page.mouse.wheel(0, -100)
  await expect.poll(async () => await viewportZoom(page)).toBeGreaterThan(1)
  await page.keyboard.up('z')
  const before = await viewport(page)
  await page.mouse.wheel(0, 50)
  await expect
    .poll(async () => await viewportY(page))
    .toBeCloseTo((before?.y ?? 0) - 50, 5)
  expect(await viewportZoom(page)).toBe(before?.zoom)
})

test('zoomActivationKeyCode null disables temporary zoom and activation never overrides disabled pinch zoom', async ({
  page,
}) => {
  for (const zoomActivationKeyCode of [null, 'z'] as const) {
    await mount(page, {
      options: {
        zoomActivationKeyCode,
        zoomOnScroll: false,
        zoomOnPinch: false,
        panOnScroll: true,
      },
    })
    await page.keyboard.down('z')
    await page.locator('.flow-canvas').evaluate((canvas) =>
      canvas.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: -100,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        })
      )
    )
    expect(await viewportZoom(page)).toBe(1)
    const point = await panePoint(page, 650, 350)
    await page.mouse.move(point.x, point.y)
    await page.mouse.wheel(0, -100)

    if (zoomActivationKeyCode === null) {
      await expect.poll(() => viewportY(page)).toBe(100)
      expect(await viewportZoom(page)).toBe(1)
    } else {
      await expect.poll(() => viewportZoom(page)).toBeGreaterThan(1)
    }

    await page.keyboard.up('z')
  }
})

test('preventScrolling controls wheel cancellation and onPaneScroll observes wheel even with zoom disabled', async ({
  page,
}) => {
  for (const preventScrolling of [true, false]) {
    await mount(page, { options: { preventScrolling, zoomOnScroll: false } })

    const canceled = await page.locator('.flow-canvas').evaluate(
      (element) =>
        !element.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: 40,
            bubbles: true,
            cancelable: true,
          })
        )
    )

    expect(canceled).toBe(preventScrolling)
    expect(await events(page)).toEqual(['scroll'])
    expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
  }
})

test('onPaneScroll ignores nodes, nowheel content, controls, Panels and minimap', async ({
  page,
}) => {
  await mount(page, {
    customContent: true,
    editingControls: true,
    options: { ui: { minimap: true }, noWheelClassName: 'stop-wheel' },
  })

  for (const target of [
    node(page, 'a'),
    page.getByTestId('stop-wheel'),
    page.getByTestId('panel-input'),
    page.locator('.flow-panel-slot'),
    page.locator('.flow-minimap'),
  ]) {
    await target.evaluate((element) =>
      element.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true })
      )
    )
  }

  expect(await events(page)).not.toContain('scroll')
})

test('preventScrolling false lets native wheel scroll the page when zoomOnScroll is false', async ({
  page,
}) => {
  await mount(page, {
    options: { preventScrolling: false, zoomOnScroll: false },
  })
  await page.evaluate(() => {
    document.body.style.height = '2000px'
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
  })
  const point = await panePoint(page, 650, 350)
  await page.mouse.move(point.x, point.y)
  await page.mouse.wheel(0, 100)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0)
  expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(await events(page)).toEqual(['scroll'])
})

test('default Ctrl and Meta wheel zoom instead of scroll panning', async ({
  page,
}) => {
  for (const modifier of ['Control', 'Meta']) {
    await mount(page, { options: { panOnScroll: true, zoomOnScroll: false } })
    const point = await panePoint(page, 650, 350)
    await page.mouse.move(point.x, point.y)
    await page.keyboard.down(modifier)
    await page.mouse.wheel(0, -100)
    await page.keyboard.up(modifier)
    await expect.poll(() => viewportZoom(page)).toBeGreaterThan(1)
  }
})

test('click connection callbacks are exclusive to click lifecycle and aggregate callbacks remain compatible', async ({
  page,
}) => {
  await mount(page, {
    options: { connectOnClick: true },
    document: {
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 80, y: 80 },
          sourcePosition: 'right',
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 380, y: 80 },
          targetPosition: 'left',
        },
      ],
      edges: [],
    },
  })
  await page
    .locator('.flow-handle[data-node-id="a"][data-kind="source"]')
    .click()
  await page
    .locator('.flow-handle[data-node-id="b"][data-kind="target"]')
    .click()
  expect(await events(page)).toContain('click-start')
  expect(await events(page)).toContain('click-end:proposed')
  await page.evaluate(() => {
    globalThis.closingOptions?.events.splice(0)
  })

  const from = await center(
    page.locator('.flow-handle[data-node-id="a"][data-kind="source"]')
  )

  await drag(page, from, await panePoint(page, 600, 300))
  const pointerEvents = await events(page)
  expect(pointerEvents?.filter((event) => event.startsWith('click-'))).toEqual(
    []
  )
  expect(
    pointerEvents?.filter(
      (event) => event.includes('connect') || event === 'click-start'
    )
  ).toEqual(['start:pointer-connect', 'end:pointer-connect'])
})

test('connectionLineStyle and connectionLineContainerStyle apply to straight and typed previews', async ({
  page,
}) => {
  for (const connectionLineType of [undefined, 'bezier'] as const) {
    await mount(page, {
      options: {
        connectionLineType,
        connectionLineStyle: { stroke: '#ff0000', strokeWidth: 5 },
        connectionLineContainerStyle: { opacity: 0.4 },
      },
    })

    const start = await center(
      page.locator('.flow-handle[data-node-id="a"][data-kind="source"]')
    )

    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 20, start.y + 30)
    const preview = page.getByTestId('flow-connection-preview')
    await expect(preview).toHaveCSS('opacity', '0.4')

    const path = preview.locator(
      connectionLineType === undefined ? 'line' : 'path'
    )

    await expect(path).toHaveCSS('stroke', 'rgb(255, 0, 0)')
    await expect(path).toHaveCSS('stroke-width', '5px')
    await page.mouse.up()
  }
})

test('custom noDragClassName disables dragging and replaces the default class', async ({
  page,
}) => {
  await mount(page, {
    customContent: true,
    options: { noDragClassName: 'stop-drag', autoPanOnNodeDrag: false },
  })
  const before = await node(page, 'a').boundingBox()
  const point = await center(page.getByTestId('stop-drag'))
  await drag(page, point, { x: point.x + 50, y: point.y + 30 })
  expect(await nodeX(page, 'a')).toBe(before?.x)
  const other = await center(page.getByTestId('nodrag'))
  await drag(page, other, { x: other.x + 50, y: other.y + 30 })
  await expect
    .poll(async () => await nodeX(page, 'a'))
    .toBe((before?.x ?? 0) + 50)
})

test('custom noWheelClassName and noPanClassName allow embedded wheel and pane controls', async ({
  page,
}) => {
  await mount(page, {
    customContent: true,
    options: { noWheelClassName: 'stop-wheel', noPanClassName: 'stop-pan' },
  })
  await page.getByTestId('stop-wheel').evaluate((element) =>
    element.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -100,
        bubbles: true,
        cancelable: true,
      })
    )
  )
  expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
  await page.locator('.flow-canvas').evaluate((canvas) => {
    const control = document.createElement('div')
    control.className = 'stop-pan'
    control.dataset.testid = 'pane-control'
    Object.assign(control.style, {
      position: 'absolute',
      left: '650px',
      top: '300px',
      width: '80px',
      height: '50px',
    })
    canvas.append(control)
  })
  const start = await center(page.getByTestId('pane-control'))
  await drag(page, start, { x: start.x - 100, y: start.y })
  expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
})

test('edgesReconnectable sets the default while explicit edge overrides and reconnectRadius remain effective', async ({
  page,
}) => {
  await mount(page, {
    options: { edgesReconnectable: false, reconnectRadius: 24 },
  })
  await expect(page.locator('.flow-edge-anchor-group')).not.toHaveClass(
    /selected/u
  )
  await page.evaluate(async () => {
    await globalThis.closingOptions?.controller.updateEdge('a-b', {
      reconnectable: true,
    })
  })

  const anchor = page.locator(
    '.flow-edge-reconnect-anchor[data-endpoint="target"]'
  )

  await expect(anchor).toHaveAttribute('r', '24')
  await expect(page.locator('.flow-edge-anchor-group')).toHaveClass(/selected/u)
  const start = await center(anchor)
  await page.mouse.move(start.x - 18, start.y + 10)
  await page.mouse.down()
  await page.mouse.move(start.x + 30, start.y + 30)
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
  await page.mouse.up()
})

test('paneClickDistance and nodeClickDistance accept small jitter and reject larger movement', async ({
  page,
}) => {
  await mount(page, {
    options: {
      paneClickDistance: 6,
      nodeClickDistance: 6,
      nodeDragThreshold: 100,
      panOnDrag: false,
    },
  })
  const pane = await panePoint(page, 650, 350)
  await drag(page, pane, { x: pane.x + 4, y: pane.y })
  const point = await center(node(page, 'a'))
  await drag(page, point, { x: point.x + 4, y: point.y })
  expect(await events(page)).toEqual(['pane-click', 'node-click'])
  await drag(page, pane, { x: pane.x + 10, y: pane.y })
  await drag(page, point, { x: point.x + 10, y: point.y })
  expect(await events(page)).toEqual(['pane-click', 'node-click'])
})

test('autoPanOnNodeDrag disables panning and autoPanSpeed controls frame displacement', async ({
  page,
}) => {
  for (const [autoPanOnNodeDrag, autoPanSpeed] of [
    [false, 3],
    [true, 0],
    [true, 3],
  ] as const) {
    await mount(page, { options: { autoPanOnNodeDrag, autoPanSpeed } })
    const start = await center(node(page, 'a'))
    const edge = await panePoint(page, 790, 250)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 3, start.y + 3)
    await page.mouse.move(edge.x, edge.y)
    await frameBarrier(page)
    const rendered = await page.locator('.flow-viewport').getAttribute('style')

    if (autoPanOnNodeDrag && autoPanSpeed > 0) {
      await expect(page.locator('.flow-viewport')).not.toHaveCSS(
        'transform',
        'matrix(1, 0, 0, 1, 0, 0)'
      )

      const x = await page
        .locator('.flow-viewport')
        .evaluate(
          (element) => new DOMMatrix(getComputedStyle(element).transform).e
        )

      expect(x).toBeLessThan(0)
      expect(Math.abs(x % 3)).toBe(0)
    } else {
      expect(rendered).toContain('translate(0px, 0px)')
    }

    await page.mouse.up()
  }
})

test('autoPanOnSelection gates rectangle auto-pan with the configured speed', async ({
  page,
}) => {
  for (const autoPanOnSelection of [false, true]) {
    await mount(page, { options: { autoPanOnSelection, autoPanSpeed: 2 } })
    await page.keyboard.down('Shift')
    const start = await panePoint(page, 600, 300)
    const edge = await panePoint(page, 790, 350)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(edge.x, edge.y)
    await frameBarrier(page)

    const x = await page
      .locator('.flow-viewport')
      .evaluate(
        (element) => new DOMMatrix(getComputedStyle(element).transform).e
      )

    expect(autoPanOnSelection ? x < 0 && x % 2 === 0 : x === 0).toBe(true)
    await page.mouse.up()
    await page.keyboard.up('Shift')
  }
})

test('autoPanOnNodeFocus brings keyboard Tab focus inside the viewport and emits move lifecycle by default', async ({
  page,
}) => {
  for (const autoPanOnNodeFocus of [false, true, undefined]) {
    await mount(page, {
      trackMoves: true,
      options: autoPanOnNodeFocus === undefined ? {} : { autoPanOnNodeFocus },
      document: {
        nodes: [{ id: 'a', label: 'Offscreen', position: { x: 900, y: 100 } }],
        edges: [],
      },
    })
    await page.evaluate(() => {
      globalThis.closingOptions?.events.splice(0)
    })
    await page.locator('.flow-canvas').focus()
    await page.keyboard.press('Tab')
    await expect(node(page, 'a')).toBeFocused()

    if (autoPanOnNodeFocus === false) {
      expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
      expect(await events(page)).toEqual([])
    } else {
      const current = await viewport(page)

      expect(current?.x).toBeLessThan(0)
      expect(
        await page
          .locator('.flow-canvas')
          .evaluate((canvas) => ({ x: canvas.scrollLeft, y: canvas.scrollTop }))
      ).toEqual({ x: 0, y: 0 })
      const box = await node(page, 'a').boundingBox()
      const pane = await page.locator('.flow-canvas').boundingBox()

      if (box === null || pane === null) {
        throw new Error('Missing focused node or pane')
      }

      expect(box.x).toBeGreaterThanOrEqual(pane.x)
      expect(box.y).toBeGreaterThanOrEqual(pane.y)
      expect(box.x + box.width).toBeLessThanOrEqual(pane.x + pane.width)
      expect(box.y + box.height).toBeLessThanOrEqual(pane.y + pane.height)
      expect(await events(page)).toEqual(['move-start', 'move', 'move-end'])
    }
  }
})

test('autoPanOnNodeFocus false preserves keyboard node move announcements', async ({
  page,
}) => {
  await mount(page, { options: { autoPanOnNodeFocus: false } })
  await node(page, 'a').focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('flow-aria-live')).toHaveText(
    'Moved selected node right. New position, x: 85, y: 80'
  )
  expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
})

test('setCanvasOptions changes snapping on the next move of an active drag and retains a disabled grid', async ({
  page,
}) => {
  await mount(page, {
    options: {
      snapToGrid: false,
      snapGrid: [20, 20],
      autoPanOnNodeDrag: false,
    },
  })
  const retained = await node(page, 'a').elementHandle()
  const start = await center(node(page, 'a'))
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 7, start.y + 7)
  await expect.poll(() => nodeX(page, 'a')).toBe(87)
  await page.evaluate(() =>
    globalThis.closingOptions?.controller.setCanvasOptions({ snapToGrid: true })
  )
  await page.mouse.move(start.x + 33, start.y + 27)
  await expect.poll(() => nodeX(page, 'a')).toBe(120)
  await page.evaluate(() =>
    globalThis.closingOptions?.controller.setCanvasOptions({
      snapGrid: { x: 30, y: 30 },
    })
  )
  await page.mouse.move(start.x + 55, start.y + 45)
  await expect.poll(() => nodeX(page, 'a')).toBe(150)
  await page.evaluate(() =>
    globalThis.closingOptions?.controller.setCanvasOptions({
      snapToGrid: false,
    })
  )
  await page.mouse.move(start.x + 63, start.y + 55)
  await expect.poll(() => nodeX(page, 'a')).toBe(143)
  await page.mouse.up()
  expect(
    await retained?.evaluate(
      (element) =>
        element === document.querySelector('.flow-node[data-node-id="a"]')
    )
  ).toBe(true)
})

test('setCanvasOptions switches scroll modes without replacing node DOM', async ({
  page,
}) => {
  await mount(page)
  const retained = await node(page, 'a').elementHandle()
  await page.evaluate(() =>
    globalThis.closingOptions?.controller.setCanvasOptions({
      panOnScroll: true,
      zoomOnScroll: false,
      panOnScrollMode: 'horizontal',
      panOnScrollSpeed: 2,
    })
  )
  const point = await panePoint(page, 650, 350)
  await page.mouse.move(point.x, point.y)
  await page.mouse.wheel(50, 40)
  await expect.poll(() => viewport(page)).toEqual({ x: -100, y: 0, zoom: 1 })
  await page.evaluate(() =>
    globalThis.closingOptions?.controller.setCanvasOptions({
      panOnScrollMode: 'vertical',
    })
  )
  await page.mouse.wheel(50, 40)
  await expect.poll(() => viewport(page)).toEqual({ x: -100, y: -80, zoom: 1 })
  await page.evaluate(() =>
    globalThis.closingOptions?.controller.setCanvasOptions({
      panOnScroll: false,
      zoomOnScroll: true,
    })
  )
  await page.mouse.wheel(0, -100)
  await expect.poll(() => viewportZoom(page)).toBeGreaterThan(1)
  expect(
    await retained?.evaluate(
      (element) =>
        element === document.querySelector('.flow-node[data-node-id="a"]')
    )
  ).toBe(true)
})

test('setCanvasOptions toggles culling and decodes options atomically with mount defaults', async ({
  page,
}) => {
  await mount(page, {
    document: {
      nodes: [
        {
          id: 'a',
          label: 'Visible',
          position: { x: 80, y: 80 },
          selected: true,
        },
        { id: 'b', label: 'Offscreen', position: { x: 1800, y: 80 } },
      ],
      edges: [],
    },
  })
  const retained = await node(page, 'a').elementHandle()
  await page.evaluate(() =>
    globalThis.closingOptions?.controller.setCanvasOptions({
      renderOnlyVisible: true,
    })
  )
  await expect(node(page, 'b')).toHaveCount(0)
  await page.evaluate(() =>
    globalThis.closingOptions?.controller.setCanvasOptions({
      renderOnlyVisible: false,
    })
  )
  await expect(node(page, 'b')).toHaveCount(1)
  expect(
    await retained?.evaluate(
      (element) =>
        element === document.querySelector('.flow-node[data-node-id="a"]')
    )
  ).toBe(true)

  const invalid = await page.evaluate(() => {
    try {
      globalThis.closingOptions?.controller.setCanvasOptions({
        renderOnlyVisible: true,
        panOnScrollSpeed: 0,
      })

      return false
    } catch {
      return true
    }
  })

  expect(invalid).toBe(true)
  await expect(node(page, 'b')).toHaveCount(1)
  await page.evaluate(() =>
    globalThis.closingOptions?.controller.setCanvasOptions({ snapToGrid: true })
  )
  await node(page, 'a').focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => nodeX(page, 'a')).toBe(90)
})

test('built-in keyboard movement uses 5/20 unsnapped and 20/80 snapped with native announcements', async ({
  page,
}) => {
  await mount(page, { options: { snapToGrid: false, snapGrid: [20, 20] } })
  await node(page, 'a').click()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => nodeX(page, 'a')).toBe(85)
  await page.keyboard.press('Shift+ArrowRight')
  await expect.poll(() => nodeX(page, 'a')).toBe(105)
  await expect(page.getByTestId('flow-aria-live')).toHaveText(
    'Moved selected node right. New position, x: 105, y: 80'
  )
  await page.keyboard.press('ArrowLeft')
  await page.evaluate(() =>
    globalThis.closingOptions?.controller.setCanvasOptions({ snapToGrid: true })
  )
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => nodeX(page, 'a')).toBe(120)
  await page.keyboard.press('Shift+ArrowRight')
  await expect.poll(() => nodeX(page, 'a')).toBe(200)
  await expect(page.getByTestId('flow-aria-live')).toHaveText(
    'Moved selected node right. New position, x: 200, y: 80'
  )
})

test('data-only onHandleRender refresh preserves the source of an active connection', async ({
  page,
}) => {
  await mount(page, {
    handleRender: true,
    document: {
      nodes: [
        {
          id: 'a',
          label: 'Source',
          position: { x: 80, y: 80 },
          sourcePosition: 'right',
          data: { name: 'before' },
        },
        {
          id: 'b',
          label: 'Target',
          position: { x: 380, y: 80 },
          targetPosition: 'left',
        },
      ],
      edges: [],
    },
  })

  const source = page.locator(
    '.flow-handle[data-node-id="a"][data-kind="source"]'
  )

  const retained = await source.elementHandle()
  const start = await center(source)

  const end = await center(
    page.locator('.flow-handle[data-node-id="b"][data-kind="target"]')
  )

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 20, start.y + 20)
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
  await page.evaluate(async () => {
    await globalThis.closingOptions?.controller.updateNodeData('a', {
      name: 'after',
    })
  })
  await expect(source).toHaveAttribute('title', '{"name":"after"}')
  expect(
    await retained?.evaluate(
      (element) =>
        element ===
        document.querySelector(
          '.flow-handle[data-node-id="a"][data-kind="source"]'
        )
    )
  ).toBe(true)
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
  await page.mouse.move(end.x, end.y, { steps: 5 })
  await page.mouse.up()
  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
  expect(await events(page)).toEqual([
    'start:pointer-connect',
    'end:pointer-connect',
  ])
})
