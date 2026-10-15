import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import {
  centreOf,
  dragBy,
  mountModelStyling,
  nodeLocator,
  readNode,
} from './model-styling-shared.ts'

const node = (id: string, x = 100, y = 100, extra = {}) => ({
  id,
  label: id,
  position: { x, y },
  size: { width: 120, height: 50 },
  ...extra,
})

const viewport = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitModelStyling?.viewport())

const viewportCoordinate = async (page: Page, axis: 'x' | 'zoom') => {
  const value = await viewport(page)

  return value?.[axis]
}

/** Wait for native input to reach the Runtime and for a public edit receipt. */
const settleInput = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const first = Promise.withResolvers<number>()
    requestAnimationFrame(first.resolve)
    await first.promise
    const second = Promise.withResolvers<number>()
    requestAnimationFrame(second.resolve)
    await second.promise
  })

  const receipt = await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.edit([])
  )

  expect(receipt).toHaveProperty('result')
}

const readPosition = async (page: Page, id: string) => {
  const value = await readNode(page, id)

  return value?.position
}

test('fitView on init fits measured nodes once, including initially offscreen nodes', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [node('a', 1000, 1000), node('b', 2200, 1800)],
      edges: [],
    },
    options: {
      fitView: true,
      onlyRenderVisibleElements: true,
      fitViewOptions: { padding: 0.1, maxZoom: 0.7 },
    },
  })
  await expect
    .poll(async () => await viewportCoordinate(page, 'zoom'))
    .toBeLessThan(0.7)
  const pane = await page.getByTestId('flow-canvas').boundingBox()

  if (pane === null) {
    throw new Error('Missing pane')
  }

  await Promise.all(
    ['a', 'b'].map(async (id) => {
      const box = await nodeLocator(page, id).boundingBox()

      if (box === null) {
        throw new Error('Fit did not mount node')
      }

      expect(box.x).toBeGreaterThanOrEqual(pane.x)
      expect(box.y).toBeGreaterThanOrEqual(pane.y)
      expect(box.x + box.width).toBeLessThanOrEqual(pane.x + pane.width)
      expect(box.y + box.height).toBeLessThanOrEqual(pane.y + pane.height)
    })
  )

  await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.setViewport({ x: 0, y: 0, zoom: 1 })
  )
  await expect.poll(() => viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
})

for (const cull of [false, true]) {
  test(`onlyRenderVisibleElements=${cull} controls node and edge mounting with actual pane dimensions`, async ({
    page,
  }) => {
    await mountModelStyling(page, {
      document: {
        nodes: [node('a'), node('b', 840, 100), node('c', 1000, 100)],
        edges: [{ id: 'far', source: 'b', target: 'c' }],
      },
      options: { onlyRenderVisibleElements: cull },
    })
    await expect(nodeLocator(page, 'b')).toHaveCount(cull ? 0 : 1)
    await expect(page.locator('svg[data-edge-id="far"]')).toHaveCount(
      cull ? 0 : 1
    )
    await page.evaluate(() =>
      window.__flowFoldkitModelStyling?.setViewport({ x: -750, y: 0, zoom: 1 })
    )
    await expect(nodeLocator(page, 'b')).toHaveCount(1)
    await expect(page.locator('svg[data-edge-id="far"]')).toHaveCount(1)
  })
}

test('renderer registries can change after creation without replacing the graph', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [node('a', 100, 100, { type: 'zoom' }), node('b', 400, 300)],
      edges: [{ id: 'e', source: 'a', target: 'b', type: 'custom' }],
    },
  })
  await expect(page.getByTestId('zoom-node')).toHaveCount(1)
  await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.replaceRenderers()
  )
  await expect(page.getByTestId('replaced-node')).toHaveText('Replacement a')
  await expect(page.getByTestId('replaced-edge')).toHaveAttribute(
    'stroke',
    'red'
  )
  expect(await readPosition(page, 'a')).toEqual({ x: 100, y: 100 })
})

test('node aria attributes, edge roles, keyboardDisabled text and endpoint reconnectability render', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [
        node('a', 100, 100, {
          ariaLabel: 'Custom node',
          ariaDescription: 'Detailed node',
          ariaRole: 'article',
        }),
        node('b', 400, 300),
      ],
      edges: [
        {
          id: 'e',
          source: 'a',
          target: 'b',
          ariaRole: 'link',
          selected: true,
          reconnectable: 'target',
        },
      ],
    },
    options: {
      edgesReconnectable: false,
      reconnectRadius: 18,
      ariaLabelConfig: {
        'node.a11yDescription.keyboardDisabled': 'Keyboard node instructions',
      },
    },
  })
  await expect(nodeLocator(page, 'a')).toHaveAttribute(
    'aria-label',
    'Custom node'
  )
  await expect(nodeLocator(page, 'a')).toHaveAttribute(
    'aria-description',
    'Detailed node'
  )
  await expect(nodeLocator(page, 'a')).toHaveAttribute('role', 'article')
  await expect(page.locator('svg[data-edge-id="e"]')).toHaveAttribute(
    'role',
    'link'
  )
  await expect(page.locator('[id$="-node-desc"]')).toHaveText(
    'Keyboard node instructions'
  )
  await expect(page.locator('[data-edge-endpoint="source"]')).toHaveCount(0)
  await expect(page.locator('[data-edge-endpoint="target"]')).toHaveCSS(
    'width',
    '36px'
  )
  await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.edit([
      { kind: 'update-edge', edgeId: 'e', patch: { reconnectable: false } },
    ])
  )
  await expect(page.locator('[data-edge-endpoint]')).toHaveCount(0)
})

test('keyboard node movement uses the custom aria-live callback', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: { nodes: [node('a', 100, 100, { selected: true })], edges: [] },
    liveMessages: true,
  })
  await nodeLocator(page, 'a').focus()
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() => readNode(page, 'a').then((n) => n?.position))
    .toEqual({ x: 105, y: 100 })
  await expect(page.locator('[aria-live="assertive"]')).toHaveText(
    'Live right 105/100'
  )
})

test('disableKeyboardA11y disables keyboard movement and descriptions', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [node('a', 100, 100, { selected: true }), node('b', 400, 300)],
      edges: [{ id: 'e', source: 'a', target: 'b' }],
    },
    options: { disableKeyboardA11y: true },
  })
  await nodeLocator(page, 'a').focus()
  await page.keyboard.press('ArrowRight')
  expect(await readPosition(page, 'a')).toEqual({ x: 100, y: 100 })
  await expect(nodeLocator(page, 'a')).not.toHaveAttribute('aria-describedby')
  await expect(page.locator('[aria-live="assertive"]')).toHaveCount(0)
  const edge = page.locator('svg[data-edge-id="e"]')

  await edge.locator('.flow-foldkit-edge-hit-target').focus()
  await page.keyboard.press('Enter')
  await expect(edge).toHaveAttribute('data-selected', 'false')
})

for (const target of ['node', 'selection-control']) {
  test(`keyboard selection keeps arrow ownership when started on the ${target}`, async ({
    page,
  }) => {
    await mountModelStyling(page, {
      document: {
        nodes: [node('a', 100, 100, { selected: true })],
        edges: [],
      },
    })

    const focused =
      target === 'node'
        ? nodeLocator(page, 'a')
        : nodeLocator(page, 'a').locator('.flow-foldkit-select-node')

    await focused.focus()
    await page.keyboard.press('Shift+Space')
    const rectangle = page.locator('.flow-foldkit-selection-rect')

    await expect(rectangle).toHaveCount(1)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await expect(rectangle).toHaveCSS('width', '5px')
    await expect(rectangle).toHaveCSS('height', '5px')
    expect(await readPosition(page, 'a')).toEqual({ x: 100, y: 100 })
    await page.keyboard.press('Escape')
    await expect(rectangle).toHaveCount(0)
  })
}

test('configured multi-selection and zoom activation keys work', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: { nodes: [node('a'), node('b', 300, 250)], edges: [] },
    options: {
      multiSelectionKeyCode: 'Alt',
      zoomActivationKeyCode: 'Alt',
      panOnScroll: true,
    },
  })
  await nodeLocator(page, 'a').click({ position: { x: 30, y: 20 } })
  await page.keyboard.down('Alt')
  await nodeLocator(page, 'b').click({ position: { x: 30, y: 20 } })
  await expect
    .poll(() => readNode(page, 'a').then((n) => n?.selected))
    .toBe(true)
  await expect
    .poll(() => readNode(page, 'b').then((n) => n?.selected))
    .toBe(true)
  await page.mouse.move(600, 400)
  await page.mouse.wheel(0, -100)
  await expect
    .poll(async () => await viewportCoordinate(page, 'zoom'))
    .toBeGreaterThan(1)
  await page.keyboard.up('Alt')
})

test('configured delete key uses the approval workflow and ignores text inputs', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: { nodes: [node('a', 100, 100, { selected: true })], edges: [] },
    options: { deleteKeyCode: 'Delete' },
  })
  await page.evaluate(() => {
    const input = document.createElement('input')
    input.dataset.testid = 'keyboard-input'
    document.querySelector('[data-node-id="a"]')?.append(input)
  })
  await page.getByTestId('keyboard-input').fill('Text')
  await page.keyboard.press('Delete')
  await settleInput(page)
  expect(await readNode(page, 'a')).not.toBeNull()
  await nodeLocator(page, 'a').focus()
  await page.keyboard.press('Backspace')
  await settleInput(page)
  expect(await readNode(page, 'a')).not.toBeNull()
  await page.keyboard.press('Delete')
  await expect(nodeLocator(page, 'a')).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitModelStyling?.deleteApprovals()
    )
  ).toBe(1)
})

test('keyboard deletion respects approval rejection', async ({ page }) => {
  await mountModelStyling(page, {
    document: { nodes: [node('a', 100, 100, { selected: true })], edges: [] },
    approveDeletion: false,
  })
  await nodeLocator(page, 'a').focus()
  await page.keyboard.press('Backspace')
  await expect
    .poll(() =>
      page.evaluate(() => window.__flowFoldkitModelStyling?.deleteApprovals())
    )
    .toBe(1)
  await expect
    .poll(() =>
      page.evaluate(() => window.__flowFoldkitModelStyling?.deleteResults())
    )
    .toBe(1)
  await expect(nodeLocator(page, 'a')).toHaveCount(1)
  expect(await readNode(page, 'a')).not.toBeNull()
})

test('null key codes disable deletion, modifier selection and wheel activation', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: { nodes: [node('a'), node('b', 300, 250)], edges: [] },
    options: {
      deleteKeyCode: null,
      selectionKeyCode: null,
      multiSelectionKeyCode: null,
      zoomActivationKeyCode: null,
      panOnScroll: true,
      selectionOnDrag: false,
    },
  })
  await nodeLocator(page, 'a').click({ position: { x: 30, y: 20 } })
  await page.keyboard.down('Meta')
  await nodeLocator(page, 'b').click({ position: { x: 30, y: 20 } })
  await expect
    .poll(() => readNode(page, 'a').then((n) => n?.selected))
    .toBe(false)
  await page.mouse.move(600, 400)
  await page.mouse.wheel(0, -100)
  await expect.poll(() => viewport(page).then((value) => value?.y)).not.toBe(0)
  expect(await viewportCoordinate(page, 'zoom')).toBe(1)
  await page.keyboard.up('Meta')
  await nodeLocator(page, 'b').focus()
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Delete')
  await settleInput(page)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitModelStyling?.deleteApprovals()
    )
  ).toBe(0)
  await expect(nodeLocator(page, 'b')).toHaveCount(1)
  await page.keyboard.down('Shift')
  await page.mouse.move(600, 400)
  await page.mouse.down()
  await page.mouse.move(650, 450)
  await expect(page.locator('.flow-foldkit-selection-rect')).toHaveCount(0)
  await page.mouse.up()
  await page.keyboard.up('Shift')
})

for (const configured of [undefined, false, true]) {
  const enabled = configured ?? true

  test(`autoPanOnNodeDrag=${configured ?? 'default'} controls drag auto-pan`, async ({
    page,
  }) => {
    const options: NonNullable<
      Parameters<typeof mountModelStyling>[1]['options']
    > = { autoPanSpeed: 7 }

    const scopedOptions =
      configured === undefined
        ? options
        : { ...options, autoPanOnNodeDrag: configured }

    await mountModelStyling(page, {
      document: { nodes: [node('a', 600, 250)], edges: [] },
      options: scopedOptions,
    })
    const from = await centreOf(nodeLocator(page, 'a'))
    const pane = await page.getByTestId('flow-canvas').boundingBox()

    if (pane === null) {
      throw new Error('Missing pane')
    }

    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(pane.x + pane.width - 5, from.y, { steps: 6 })

    if (enabled) {
      await expect
        .poll(async () => await viewportCoordinate(page, 'x'))
        .toBeLessThan(0)
      expect(
        await nodeLocator(page, 'a').evaluate((element) =>
          element.hasPointerCapture(1)
        )
      ).toBe(true)
    }

    await page.mouse.up()
    await settleInput(page)

    if (enabled) {
      await expect
        .poll(() => readPosition(page, 'a').then((position) => position?.x))
        .toBeGreaterThan(600)
    } else {
      expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
    }
  })
}

for (const configured of [undefined, false, true]) {
  const enabled = configured ?? true

  test(`autoPanOnSelection=${configured ?? 'default'} controls selection auto-pan with configured selection key`, async ({
    page,
  }) => {
    const options: NonNullable<
      Parameters<typeof mountModelStyling>[1]['options']
    > = {
      selectionKeyCode: 'Alt',
      selectionOnDrag: false,
      panOnDrag: true,
      autoPanSpeed: 7,
    }

    const scopedOptions =
      configured === undefined
        ? options
        : { ...options, autoPanOnSelection: configured }

    await mountModelStyling(page, {
      document: { nodes: [node('a')], edges: [] },
      options: scopedOptions,
    })
    const pane = await page.getByTestId('flow-canvas').boundingBox()

    if (pane === null) {
      throw new Error('Missing pane')
    }

    await page.keyboard.down('Alt')
    await page.mouse.move(pane.x + 400, pane.y + 300)
    await page.mouse.down()
    await page.mouse.move(pane.x + pane.width - 5, pane.y + 350, { steps: 6 })
    await expect(page.locator('.flow-foldkit-selection-rect')).toHaveCount(1)

    if (enabled) {
      await expect
        .poll(async () => await viewportCoordinate(page, 'x'))
        .toBeLessThan(0)
    }

    await page.mouse.up()
    await page.keyboard.up('Alt')
    await settleInput(page)

    if (!enabled) {
      expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
    }
  })
}

for (const configured of [undefined, false, true]) {
  const enabled = configured ?? true

  test(`autoPanOnNodeFocus=${configured ?? 'default'} controls offscreen keyboard focus`, async ({
    page,
  }) => {
    await mountModelStyling(page, {
      document: { nodes: [node('a'), node('far', 1100, 600)], edges: [] },
      options:
        configured === undefined ? {} : { autoPanOnNodeFocus: configured },
    })
    await nodeLocator(page, 'far').focus()

    if (enabled) {
      await expect
        .poll(async () => await viewportCoordinate(page, 'x'))
        .toBeLessThan(0)
    } else {
      expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
    }
  })
}

test('pane and node click distances suppress travelled clicks and retain clicks inside the configured distance', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: { nodes: [node('a')], edges: [] },
    options: {
      nodeDragThreshold: 100,
      paneClickDistance: 6,
      nodeClickDistance: 6,
      selectionOnDrag: false,
    },
  })
  await dragBy(page, nodeLocator(page, 'a'), 4, 0)
  await expect
    .poll(() => readNode(page, 'a').then((n) => n?.selected))
    .toBe(true)

  const nodeClicks = () =>
    page.evaluate(
      () =>
        window.__flowFoldkitModelStyling
          ?.events()
          .filter(({ name }) => name === 'onNodeClick').length ?? 0
    )

  await expect.poll(nodeClicks).toBe(1)
  await dragBy(page, nodeLocator(page, 'a'), 10, 0)
  expect(await nodeClicks()).toBe(1)

  const count = () =>
    page.evaluate(
      () =>
        window.__flowFoldkitModelStyling
          ?.events()
          .filter(({ name }) => name === 'onPaneClick').length ?? 0
    )

  const pane = page.getByTestId('flow-canvas')
  await page.mouse.move(600, 400)
  await page.mouse.down()
  await page.mouse.move(604, 400)
  await page.mouse.up()
  await expect.poll(count).toBe(1)
  await page.mouse.move(600, 400)
  await page.mouse.down()
  await page.mouse.move(610, 400)
  await page.mouse.up()
  await expect(pane).toBeVisible()
  expect(await count()).toBe(1)
})

test('custom no-drag, no-wheel and no-pan classes gate native input', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [
        node('a', 100, 100, { type: 'handle', className: 'skip-wheel' }),
        node('b', 350, 250, { draggable: false, className: 'skip-pan' }),
      ],
      edges: [],
    },
    options: {
      noDragClassName: 'custom-drag-handle',
      noWheelClassName: 'skip-wheel',
      noPanClassName: 'skip-pan',
      zoomOnScroll: true,
      panOnDrag: true,
      selectionOnDrag: false,
    },
  })
  await dragBy(
    page,
    nodeLocator(page, 'a').locator('.custom-drag-handle'),
    40,
    20
  )
  expect(await readPosition(page, 'a')).toEqual({ x: 100, y: 100 })
  await nodeLocator(page, 'a').hover()
  await page.mouse.wheel(0, -100)
  expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
  await dragBy(page, nodeLocator(page, 'b'), 40, 20)
  expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
  await page.mouse.move(650, 400)
  await page.mouse.wheel(0, -100)
  await expect
    .poll(async () => await viewportCoordinate(page, 'zoom'))
    .toBeGreaterThan(1)
})

test('connectionLineStyle and connectionLineContainerStyle style the builtin preview', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [
        node('a', 100, 100, { sourcePosition: 'bottom' }),
        node('b', 400, 250, { targetPosition: 'top' }),
      ],
      edges: [],
    },
    options: {
      connectionLineStyle: { stroke: 'rgb(255, 0, 0)', strokeWidth: 5 },
      connectionLineContainerStyle: { opacity: 0.4 },
    },
  })

  const from = await centreOf(
    nodeLocator(page, 'a').locator('[data-handle-id="source"]')
  )

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(from.x + 80, from.y + 80, { steps: 4 })
  await expect(page.locator('.flow-foldkit-connection-preview')).toHaveCSS(
    'opacity',
    '0.4'
  )
  await expect(page.locator('.flow-foldkit-connection-preview-path')).toHaveCSS(
    'stroke',
    'rgb(255, 0, 0)'
  )
  await expect(page.locator('.flow-foldkit-connection-preview-path')).toHaveCSS(
    'stroke-width',
    '5px'
  )
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(page.locator('.flow-foldkit-connection-preview')).toHaveCount(0)
})

test('non-focusable nodes omit tabindex and ignore node keyboard and focus handlers', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [node('a', 100, 100, { selected: true, focusable: false })],
      edges: [],
    },
  })
  const wrapper = nodeLocator(page, 'a')

  await expect(wrapper).not.toHaveAttribute('tabindex')
  await wrapper.click({ position: { x: 30, y: 20 } })
  // Make the wrapper focusable externally to prove the handler also checks the domain option.
  await wrapper.evaluate((element) => {
    element.setAttribute('tabindex', '-1')
  })
  await wrapper.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await settleInput(page)
  expect(await readPosition(page, 'a')).toEqual({ x: 100, y: 100 })
  const selectedNode = await readNode(page, 'a')
  expect(selectedNode?.selected).toBe(true)
  await expect(page.locator('[aria-live="assertive"]')).toHaveText('')
  await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.setViewport({ x: -1200, y: 0, zoom: 1 })
  )
  await expect.poll(() => viewport(page)).toEqual({ x: -1200, y: 0, zoom: 1 })
  await wrapper.focus()
  await settleInput(page)
  expect(await viewport(page)).toEqual({ x: -1200, y: 0, zoom: 1 })
})

for (const kind of ['contenteditable', 'nokey', 'shadow-input']) {
  test(`arrow and Escape keys inside ${kind} keep editable ownership`, async ({
    page,
  }) => {
    await mountModelStyling(page, {
      document: { nodes: [node('a', 100, 100, { selected: true })], edges: [] },
    })
    await nodeLocator(page, 'a').evaluate((element, controlKind) => {
      const control = document.createElement(
        controlKind === 'shadow-input' ? 'input' : 'div'
      )

      control.dataset.testid = 'editable-control'
      control.tabIndex = 0

      if (controlKind === 'contenteditable') {
        control.setAttribute('contenteditable', '')
      }

      if (controlKind === 'nokey') {
        control.className = 'nokey'
      }

      if (controlKind === 'shadow-input') {
        const host = document.createElement('div')
        element.append(host)
        host.attachShadow({ mode: 'open' }).append(control)
      } else {
        element.append(control)
      }
    }, kind)
    await nodeLocator(page, 'a').focus()
    await page.keyboard.press('Shift+Space')
    await expect(page.locator('.flow-foldkit-selection-rect')).toHaveCount(1)
    await page.getByTestId('editable-control').focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Escape')
    await settleInput(page)
    expect(await readPosition(page, 'a')).toEqual({ x: 100, y: 100 })
    const selectedNode = await readNode(page, 'a')
    expect(selectedNode?.selected).toBe(true)
    await expect(page.locator('.flow-foldkit-selection-rect')).toHaveCount(1)
    await expect
      .poll(() =>
        page
          .locator('.flow-foldkit-selection-rect')
          .evaluate((element) =>
            element instanceof HTMLElement ? element.style.width : null
          )
      )
      .toBe('0px')
    await nodeLocator(page, 'a').focus()
    await page.keyboard.press('Escape')
    await expect(page.locator('.flow-foldkit-selection-rect')).toHaveCount(0)
  })
}

for (const extra of [
  { selected: false },
  { selected: true, draggable: false },
]) {
  test(`arrow scrolling is preserved for a node with ${JSON.stringify(extra)}`, async ({
    page,
  }) => {
    await mountModelStyling(page, {
      document: { nodes: [node('a', 100, 100, extra)], edges: [] },
    })

    const prevented = await nodeLocator(page, 'a').evaluate((element) => {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        code: 'ArrowRight',
        bubbles: true,
        composed: true,
        cancelable: true,
      })

      element.dispatchEvent(event)

      return event.defaultPrevented
    })

    expect(prevented).toBe(false)
    await settleInput(page)
    expect(await readPosition(page, 'a')).toEqual({ x: 100, y: 100 })
  })
}

test('non-draggable nodes retain travelled clicks regardless of nodeClickDistance', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: { nodes: [node('a', 100, 100, { draggable: false })], edges: [] },
    options: { nodeClickDistance: 6, selectionOnDrag: false },
  })
  await dragBy(page, nodeLocator(page, 'a'), 10, 0)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__flowFoldkitModelStyling
            ?.events()
            .filter(({ name }) => name === 'onNodeClick').length
      )
    )
    .toBe(1)
  const selectedNode = await readNode(page, 'a')
  expect(selectedNode?.selected).toBe(true)
})

test('Meta+Backspace stays inside a node input and deletes after focusing its wrapper', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: { nodes: [node('a', 100, 100, { selected: true })], edges: [] },
    options: { deleteKeyCode: 'Meta+Backspace' },
  })
  await nodeLocator(page, 'a').evaluate((element) => {
    const input = document.createElement('input')
    input.dataset.testid = 'delete-input'
    element.append(input)
  })
  await page.getByTestId('delete-input').fill('Text')
  await page.keyboard.press('Meta+Backspace')
  await settleInput(page)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitModelStyling?.deleteApprovals()
    )
  ).toBe(0)
  expect(await readNode(page, 'a')).not.toBeNull()
  await nodeLocator(page, 'a').focus()
  await page.keyboard.press('Meta+Backspace')
  await expect(nodeLocator(page, 'a')).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitModelStyling?.deleteApprovals()
    )
  ).toBe(1)
})

test('default deletion works when the canvas is mounted inside a shadow root', async ({
  page,
}) => {
  await mountModelStyling(page, {
    shadowCanvas: true,
    document: { nodes: [node('a', 100, 100, { selected: true })], edges: [] },
  })
  await nodeLocator(page, 'a').focus()
  await page.keyboard.press('Backspace')
  await expect(nodeLocator(page, 'a')).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitModelStyling?.deleteApprovals()
    )
  ).toBe(1)
})

test('initial fitting retries when a zero-sized mounted pane receives dimensions', async ({
  page,
}) => {
  await mountModelStyling(page, {
    initialPaneSize: { width: 0, height: 0 },
    document: {
      nodes: [node('a', 1000, 1000), node('b', 2200, 1800)],
      edges: [],
    },
    options: {
      fitView: true,
      onlyRenderVisibleElements: true,
      fitViewOptions: { maxZoom: 0.7 },
    },
  })
  await settleInput(page)
  expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
  await page.getByTestId('flow-canvas').evaluate((element) => {
    element.style.width = '800px'
    element.style.height = '500px'
  })
  await expect.poll(() => viewportCoordinate(page, 'zoom')).toBeLessThan(0.7)
  await expect(nodeLocator(page, 'a')).toBeVisible()
  await expect(nodeLocator(page, 'b')).toBeVisible()
})

test('resizing the pane updates node and edge culling without another graph action', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [node('a'), node('b', 840, 100), node('c', 1000, 100)],
      edges: [{ id: 'far', source: 'b', target: 'c' }],
    },
    options: { onlyRenderVisibleElements: true },
  })
  await expect(nodeLocator(page, 'b')).toHaveCount(0)
  await page.getByTestId('flow-canvas').evaluate((element) => {
    element.style.width = '950px'
  })
  await expect(nodeLocator(page, 'b')).toHaveCount(1)
  await expect(page.locator('svg[data-edge-id="far"]')).toHaveCount(1)
  await page.getByTestId('flow-canvas').evaluate((element) => {
    element.style.width = '800px'
  })
  await expect(nodeLocator(page, 'b')).toHaveCount(0)
  await expect(page.locator('svg[data-edge-id="far"]')).toHaveCount(0)
})

test('culling retains an edge crossing the viewport when both endpoints are offscreen', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [node('a'), node('left', -400, 220), node('right', 1100, 220)],
      edges: [
        { id: 'crossing', source: 'left', target: 'right', path: 'straight' },
      ],
    },
    options: { onlyRenderVisibleElements: true },
  })
  await expect(nodeLocator(page, 'left')).toHaveCount(0)
  await expect(nodeLocator(page, 'right')).toHaveCount(0)
  await expect(page.locator('svg[data-edge-id="crossing"]')).toHaveCount(1)

  const path = page.locator(
    'svg[data-edge-id="crossing"] .flow-foldkit-edge-path'
  )

  await expect(path).toHaveAttribute('d', /L/u)
})

test('React defaults select with Enter, draw a pane selection with Shift and zoom with the platform modifier', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: { nodes: [node('a')], edges: [] },
    options: { panOnDrag: true, selectionOnDrag: false },
  })
  await nodeLocator(page, 'a').focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(() => readNode(page, 'a').then((n) => n?.selected))
    .toBe(true)
  await page.keyboard.press('Enter')
  await expect
    .poll(() => readNode(page, 'a').then((n) => n?.selected))
    .toBe(false)
  await page.keyboard.down('Shift')
  await page.mouse.move(500, 350)
  await page.mouse.down()
  await page.mouse.move(600, 400)
  await expect(page.locator('.flow-foldkit-selection-rect')).toHaveCount(1)
  await page.mouse.up()
  await page.keyboard.up('Shift')

  const modifier = await page.evaluate(() =>
    navigator.userAgent.includes('Mac') ? 'Meta' : 'Control'
  )

  await page.keyboard.down(modifier)
  await page.mouse.move(500, 350)
  await page.mouse.wheel(0, -100)
  await expect.poll(() => viewportCoordinate(page, 'zoom')).toBeGreaterThan(1)
  await page.keyboard.up(modifier)
})

test('keyboardActivation=false preserves native arrow scrolling', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: { nodes: [node('a', 100, 100, { selected: true })], edges: [] },
    options: { keyboardActivation: false },
  })

  const prevented = await nodeLocator(page, 'a').evaluate((element) => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      composed: true,
      cancelable: true,
    })

    element.dispatchEvent(event)

    return event.defaultPrevented
  })

  expect(prevented).toBe(false)
  await settleInput(page)
  expect(await readPosition(page, 'a')).toEqual({ x: 100, y: 100 })
})
