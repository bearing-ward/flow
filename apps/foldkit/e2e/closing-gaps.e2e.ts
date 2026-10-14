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
    'Live right 100/100'
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
  expect(await readNode(page, 'a')).not.toBeNull()
  await nodeLocator(page, 'a').focus()
  await page.keyboard.press('Backspace')
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

for (const enabled of [false, true]) {
  test(`autoPanOnNodeDrag=${enabled} controls drag auto-pan`, async ({
    page,
  }) => {
    await mountModelStyling(page, {
      document: { nodes: [node('a', 600, 250)], edges: [] },
      options: { autoPanOnNodeDrag: enabled, autoPanSpeed: 7 },
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

    if (enabled) {
      await expect
        .poll(() => readPosition(page, 'a').then((position) => position?.x))
        .toBeGreaterThan(600)
    } else {
      expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
    }
  })
}

for (const enabled of [false, true]) {
  test(`autoPanOnSelection=${enabled} controls selection auto-pan with configured selection key`, async ({
    page,
  }) => {
    await mountModelStyling(page, {
      document: { nodes: [node('a')], edges: [] },
      options: {
        autoPanOnSelection: enabled,
        selectionKeyCode: 'Alt',
        selectionOnDrag: false,
        panOnDrag: true,
        autoPanSpeed: 7,
      },
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

    if (!enabled) {
      expect(await viewport(page)).toEqual({ x: 0, y: 0, zoom: 1 })
    }
  })
}

for (const enabled of [false, true]) {
  test(`autoPanOnNodeFocus=${enabled} controls offscreen keyboard focus`, async ({
    page,
  }) => {
    await mountModelStyling(page, {
      document: { nodes: [node('a'), node('far', 1100, 600)], edges: [] },
      options: { autoPanOnNodeFocus: enabled },
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
