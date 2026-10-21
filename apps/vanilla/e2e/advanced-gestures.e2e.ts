import type * as CoreModule from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { releasePointerCapture } from '../../shared-e2e/release-pointer-capture.ts'
import { runSerially } from '../../shared-e2e/run-serially.ts'
import type { FlowDocumentInput } from '../src/mount-flow.ts'

interface ResizeSourceNodeInput {
  id: string
  label: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  parentId?: string
  extent?: 'parent'
  selected: boolean
  handles: { id: string; kind: string; side: string }[]
}

type Scenario =
  | 'extent-single'
  | 'extent-group'
  | 'fit'
  | 'radius'
  | 'validator'
  | 'keyboard'

const mountScenario = async (page: Page, scenario: Scenario): Promise<void> => {
  await page.goto('/')
  await expect(page.getByTestId('flow-canvas')).toBeVisible()
  await expect(page.locator('.flow-demo-panel')).toBeVisible()
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await expect(page.getByTestId('flow-canvas')).toHaveCount(0)
  await expect(page.locator('.flow-demo-panel')).toHaveCount(0)
  await page.evaluate(async (kind) => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = globalThis.document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    const connectionScenario =
      kind === 'radius' || kind === 'validator' || kind === 'keyboard'

    const controller = mountFlow(
      root,
      {
        nodes: connectionScenario
          ? [
              {
                id: 'source',
                label: 'Source',
                position: { x: 100, y: 200 },
                handles: [{ id: 'out', kind: 'source', side: 'right' }],
              },
              {
                id: 'rejected',
                label: 'Rejected',
                position: { x: 350, y: 200 },
                handles: [{ id: 'in', kind: 'target', side: 'left' }],
              },
              {
                id: 'approved',
                label: 'Approved',
                position: { x: 600, y: 200 },
                handles: [{ id: 'in', kind: 'target', side: 'left' }],
              },
            ]
          : [
              {
                id: 'a',
                label: 'Alpha',
                position: { x: 100, y: 100 },
                selected: kind === 'extent-group',
              },
              {
                id: 'b',
                label: 'Beta',
                position: {
                  x: kind === 'fit' ? 1500 : 300,
                  y: kind === 'fit' ? 300 : 100,
                },
                selected: kind === 'extent-group',
              },
            ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        nodesResizable: true,
        nodeExtent: kind.startsWith('extent')
          ? { minX: 0, minY: 0, maxX: 500, maxY: 400 }
          : undefined,
        connectionRadius: kind === 'radius' ? 30 : undefined,
        isValidConnection:
          kind === 'validator'
            ? (candidate: CoreModule.FlowConnection) =>
                candidate.target === 'approved'
            : undefined,
        connectOnClick: kind === 'keyboard' || kind === 'validator',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.25, maxZoom: 2 },
        },
      }
    )

    globalThis.flowChanges = []
    controller.subscribe((change: CoreModule.FlowChange) =>
      globalThis.flowChanges?.push(change)
    )
    globalThis.flowController = controller
  }, scenario)
}

const centerOf = async (
  page: Page,
  selector: string
): Promise<{ x: number; y: number }> => {
  const box = await page.locator(selector).boundingBox()

  if (box === null) {
    throw new Error(`Missing bounds for ${selector}`)
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const drag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
): Promise<void> => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y)
  await page.mouse.up()
}

const position = (page: Page, nodeId: string) =>
  page.locator(`.flow-node[data-node-id="${nodeId}"]`).evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(
      globalThis.getComputedStyle(element).transform
    )

    return { x: matrix.m41, y: matrix.m42 }
  })

type GestureMode =
  | 'node-drag'
  | 'connection'
  | 'reconnection'
  | 'pane-pan'
  | 'selection'

type Cancellation =
  | 'escape'
  | 'blur'
  | 'pointercancel'
  | 'capture-loss'
  | 'node-removal'
  | 'edge-removal'
  | 'destroy'

const mountCancellationScenario = async (page: Page): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await expect(page.getByTestId('flow-canvas')).toHaveCount(0)
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = globalThis.document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    const controller = mountFlow(
      root,
      {
        nodes: [
          {
            id: 'source',
            label: 'Source',
            position: { x: 80, y: 180 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            id: 'target',
            label: 'Target',
            position: { x: 300, y: 180 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
          { id: 'drag', label: 'Drag', position: { x: 500, y: 180 } },
          { id: 'spare', label: 'Spare', position: { x: 700, y: 180 } },
        ],
        edges: [
          {
            id: 'edge',
            source: 'source',
            sourceHandle: 'out',
            target: 'target',
            targetHandle: 'in',
            selected: true,
          },
        ],
      },
      {
        documentMode: 'uncontrolled',
        nodesResizable: true,
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.25, maxZoom: 2 },
        },
      }
    )

    globalThis.flowChanges = []
    controller.subscribe((change: CoreModule.FlowChange) =>
      globalThis.flowChanges?.push(change)
    )
    globalThis.flowController = controller
  })
  await expect(page.getByTestId('flow-canvas')).toBeVisible()
  await expect(
    page.locator('[data-testid="flow-edge-reconnect-anchor"]')
  ).toHaveCount(2)
}

const mountResizeScenario = async (
  page: Page,
  documentMode: 'controlled' | 'uncontrolled' = 'uncontrolled',
  zoom = 1,
  extent?: { minX: number; minY: number; maxX: number; maxY: number },
  sourceSize: { width: number; height: number } | undefined = undefined,
  options: {
    nestedParent?: boolean
    derivedUI?: boolean
    renderOnlyVisible?: boolean
  } = {}
): Promise<void> => {
  const defaultSourceSize = sourceSize ?? { width: 90, height: 60 }
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await expect(page.getByTestId('flow-canvas')).toHaveCount(0)
  await page.evaluate(
    async ({
      mode,
      initialZoom,
      extent: nodeExtent,
      sourceSize: decodedSourceSize,
      options: mountOptions,
    }) => {
      const modulePath = '/src/public.ts'
      const { mountFlow } = await import(modulePath)
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing flow host')
      }

      const sourceNode: ResizeSourceNodeInput = {
        id: 'source',
        label: 'Source',
        position: mountOptions.nestedParent
          ? { x: 10, y: 10 }
          : { x: 80, y: 100 },
        size: mountOptions.nestedParent
          ? { width: 60, height: 40 }
          : decodedSourceSize,
        selected: true,
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      }

      if (mountOptions.nestedParent) {
        sourceNode.parentId = 'container'
        sourceNode.extent = 'parent'
      }

      const nodes = [
        ...(mountOptions.nestedParent
          ? [
              {
                id: 'container',
                label: 'Container',
                position: { x: 50, y: 50 },
                size: { width: 100, height: 80 },
              },
            ]
          : []),
        sourceNode,
        {
          id: 'child',
          label: 'Child',
          parentId: 'source',
          position: { x: 15, y: 15 },
          size: { width: 20, height: 20 },
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 300, y: 100 },
          size: { width: 90, height: 60 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        ...(mountOptions.renderOnlyVisible
          ? [
              {
                id: 'remote',
                label: 'Remote',
                position: { x: 2200, y: 700 },
                size: { width: 90, height: 60 },
              },
            ]
          : []),
      ]

      const document = {
        nodes,
        edges: [
          {
            id: 'edge',
            source: 'source',
            target: 'target',
            sourceHandle: 'out',
            targetHandle: 'in',
          },
        ],
      }

      globalThis.flowAuthoritativeNodes = structuredClone(nodes)

      const toolbar = mountOptions.derivedUI
        ? globalThis.document.createElement('div')
        : undefined

      if (toolbar !== undefined) {
        toolbar.id = 'resize-node-toolbar'
        toolbar.textContent = 'Node toolbar'
        globalThis.document.body.append(toolbar)
      }

      const controller = mountFlow(root, document, {
        documentMode: mode,
        nodesResizable: true,
        nodeExtent,
        renderOnlyVisible: mountOptions.renderOnlyVisible,
        ui: mountOptions.derivedUI ? { minimap: true } : undefined,
        toolbarContainers:
          toolbar === undefined ? undefined : { nodes: { source: toolbar } },
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: initialZoom },
          limits: { minZoom: 0.25, maxZoom: 3 },
        },
      })

      globalThis.flowChanges = []
      controller.subscribe((change: CoreModule.FlowChange) =>
        globalThis.flowChanges?.push(change)
      )
      globalThis.flowController = controller
    },
    {
      mode: documentMode,
      initialZoom: zoom,
      extent,
      sourceSize: defaultSourceSize,
      options,
    }
  )
  const resizeHandles = page.getByTestId('flow-node-resize-handle')
  await expect(resizeHandles).toHaveCount(8)
  expect(
    await resizeHandles.evaluateAll((buttons) =>
      buttons.map((button) => {
        if (!(button instanceof HTMLButtonElement)) {
          throw new TypeError('Expected resize handle button')
        }

        return button.getAttribute('aria-label')
      })
    )
  ).toEqual([
    'Resize Source from top',
    'Resize Source from right',
    'Resize Source from bottom',
    'Resize Source from left',
    'Resize Source from top left',
    'Resize Source from top right',
    'Resize Source from bottom right',
    'Resize Source from bottom left',
  ])
  await expect(
    page.locator('.flow-node[data-node-id="source"]')
  ).toHaveAttribute(
    'data-measured-width',
    String(options.nestedParent ? 60 : Math.max(defaultSourceSize.width, 30))
  )
}

const beginResize = async (
  page: Page,
  dx = 60,
  dy = 30,
  direction = 'bottom-right'
): Promise<{ x: number; y: number }> => {
  const bounds = await page
    .locator(`.flow-node-resize-handle[data-direction="${direction}"]`)
    .boundingBox()

  if (bounds === null) {
    throw new Error('Missing node resize handle')
  }

  const start = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + dx, start.y + dy)
  await expect(page.locator('.flow-node[data-node-id="source"]')).toHaveClass(
    /resizing/u
  )

  return start
}

const currentSize = (page: Page) =>
  page.locator('.flow-node[data-node-id="source"]').evaluate((node) => {
    if (!(node instanceof HTMLElement)) {
      throw new TypeError('Expected source HTML node')
    }

    return {
      width: Number(node.style.width.replace('px', '')),
      height: Number(node.style.height.replace('px', '')),
    }
  })

const keyboardResize = async (
  page: Page,
  direction: string,
  key: string
): Promise<void> => {
  const button = page.locator(
    `.flow-node-resize-handle[data-direction="${direction}"]`
  )

  await expect(button).toBeVisible()
  await button.focus()
  await expect(button).toBeFocused()
  await page.keyboard.press(key)
}

const beginCancellationGesture = async (
  page: Page,
  mode: GestureMode
): Promise<void> => {
  const canvas = page.getByTestId('flow-canvas')

  if (mode === 'node-drag') {
    const start = await centerOf(page, '[data-node-id="drag"]')
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 20, start.y + 5)
    await expect(page.locator('[data-node-id="drag"]')).toHaveClass(/dragging/u)
  } else if (mode === 'connection') {
    const start = await centerOf(
      page,
      '.flow-node[data-node-id="source"] .flow-handle[data-handle-id="out"]'
    )

    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 35, start.y + 25)
    await expect(page.locator('.flow-connection-preview')).toHaveCount(1)
  } else if (mode === 'reconnection') {
    const anchor = await page
      .locator('[data-testid="flow-edge-reconnect-anchor"]')
      .first()
      .boundingBox()

    if (anchor === null) {
      throw new Error('Missing reconnect anchor')
    }

    await page.mouse.move(
      anchor.x + anchor.width / 2,
      anchor.y + anchor.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      anchor.x + anchor.width / 2 + 30,
      anchor.y + anchor.height / 2 + 20
    )
    await expect(page.locator('.flow-connection-preview')).toHaveCount(1)
  } else {
    const bounds = await canvas.boundingBox()

    if (bounds === null) {
      throw new Error('Missing canvas bounds')
    }

    const start =
      mode === 'selection'
        ? { x: bounds.x + 20, y: bounds.y + 70 }
        : { x: bounds.x + 20, y: bounds.y + 20 }

    if (mode === 'selection') {
      await page.keyboard.down('Shift')
    }

    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 35, start.y + 25)
    await expect(
      mode === 'selection' ? page.getByTestId('flow-selection-rect') : canvas
    ).toBeVisible()

    if (mode === 'pane-pan') {
      await expect(canvas).toHaveClass(/panning/u)
    }
  }
}

const cancelGesture = async (
  page: Page,
  mode: GestureMode,
  cancellation: Cancellation
): Promise<void> => {
  if (cancellation === 'escape') {
    await page
      .getByTestId('flow-canvas')
      .evaluate((canvas) =>
        canvas.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        )
      )
  } else if (cancellation === 'blur') {
    await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
  } else if (cancellation === 'capture-loss') {
    await releasePointerCapture(page)
  } else if (cancellation === 'pointercancel') {
    await page
      .getByTestId('flow-canvas')
      .evaluate((canvas) =>
        canvas.dispatchEvent(
          new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })
        )
      )
  } else if (cancellation === 'node-removal') {
    await page.evaluate((gestureMode) => {
      const nodes =
        gestureMode === 'connection'
          ? [
              {
                id: 'target',
                label: 'Target',
                position: { x: 300, y: 180 },
                handles: [{ id: 'in', kind: 'target', side: 'left' }],
              },
              { id: 'drag', label: 'Drag', position: { x: 500, y: 180 } },
              { id: 'spare', label: 'Spare', position: { x: 700, y: 180 } },
            ]
          : [
              {
                id: 'source',
                label: 'Source',
                position: { x: 80, y: 180 },
                handles: [{ id: 'out', kind: 'source', side: 'right' }],
              },
              {
                id: 'target',
                label: 'Target',
                position: { x: 300, y: 180 },
                handles: [{ id: 'in', kind: 'target', side: 'left' }],
              },
              { id: 'spare', label: 'Spare', position: { x: 700, y: 180 } },
            ]

      // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
      globalThis.flowController?.update({ nodes, edges: [] } as never)
    }, mode)
  } else if (cancellation === 'edge-removal') {
    await page.evaluate(() =>
      globalThis.flowController?.update({
        nodes: [
          {
            id: 'source',
            label: 'Source',
            position: { x: 80, y: 180 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            id: 'target',
            label: 'Target',
            position: { x: 300, y: 180 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
          { id: 'drag', label: 'Drag', position: { x: 500, y: 180 } },
          { id: 'spare', label: 'Spare', position: { x: 700, y: 180 } },
        ],
        edges: [],
      })
    )
  } else {
    await page.evaluate(() => globalThis.flowController?.destroy())
  }
}

const cancellationCases: readonly {
  mode: GestureMode
  cancellation: Cancellation
}[] = [
  ...(
    ['escape', 'blur', 'pointercancel', 'capture-loss', 'destroy'] as const
  ).flatMap((cancellation) =>
    (
      [
        'node-drag',
        'connection',
        'reconnection',
        'pane-pan',
        'selection',
      ] as const
    ).map((mode) => ({ mode, cancellation }))
  ),
  { mode: 'node-drag', cancellation: 'node-removal' },
  { mode: 'connection', cancellation: 'node-removal' },
  { mode: 'reconnection', cancellation: 'edge-removal' },
]

for (const { mode, cancellation } of cancellationCases) {
  test(`${mode} cancellation by ${cancellation} releases its session`, async ({
    page,
  }) => {
    await mountCancellationScenario(page)
    await beginCancellationGesture(page, mode)
    await cancelGesture(page, mode, cancellation)

    if (cancellation !== 'destroy') {
      await page.mouse.up()

      if (mode === 'node-drag' && cancellation === 'node-removal') {
        await expect(page.locator('[data-node-id="drag"]')).toHaveCount(0)
      } else if (mode === 'node-drag') {
        await expect(page.locator('[data-node-id="drag"]')).not.toHaveClass(
          /dragging/u
        )
      }

      if (mode === 'connection' || mode === 'reconnection') {
        await expect(page.locator('.flow-connection-preview')).toHaveCount(0)
      }

      if (mode === 'pane-pan') {
        await expect(page.getByTestId('flow-canvas')).not.toHaveClass(
          /panning/u
        )
      }

      if (mode === 'selection') {
        await expect(page.getByTestId('flow-selection-rect')).toHaveCount(0)
      }

      expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])

      const spare = await centerOf(page, '[data-node-id="spare"]')
      await page.mouse.move(spare.x, spare.y)
      await page.mouse.down()
      await page.mouse.move(spare.x + 20, spare.y + 5)
      await expect(page.locator('[data-node-id="spare"]')).toHaveClass(
        /dragging/u
      )
      await page
        .getByTestId('flow-canvas')
        .evaluate((canvas) =>
          canvas.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
          )
        )
      await page.mouse.up()
      expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
    }
  })
}

test('threshold-only node press cancels without a selection or position change', async ({
  page,
}) => {
  await mountCancellationScenario(page)
  const start = await centerOf(page, '[data-node-id="drag"]')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await expect(page.locator('[data-node-id="drag"]')).not.toHaveClass(
    /dragging/u
  )
  await page
    .getByTestId('flow-canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )
  await page.mouse.up()
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
  await expect(page.locator('.flow-connection-preview')).toHaveCount(0)
})

test('invalid controlled update during a drag is rejected without corrupting the preview', async ({
  page,
}) => {
  await mountCancellationScenario(page)
  const start = await centerOf(page, '[data-node-id="drag"]')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 24, start.y + 8)
  await expect(page.locator('[data-node-id="drag"]')).toHaveClass(/dragging/u)

  const rejected = await page.evaluate(() => {
    try {
      // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
      globalThis.flowController?.update({
        nodes: [
          { id: 'duplicate', label: 'First', position: { x: 0, y: 0 } },
          { id: 'duplicate', label: 'Second', position: { x: 1, y: 1 } },
        ],
        edges: [],
      } as never)

      return false
    } catch {
      return true
    }
  })

  expect(rejected).toBe(true)
  await expect(page.locator('[data-node-id="drag"]')).toHaveClass(/dragging/u)
  await page
    .getByTestId('flow-canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )
  await page.mouse.up()
  await expect(page.locator('[data-node-id="drag"]')).not.toHaveClass(
    /dragging/u
  )
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])

  const spare = await centerOf(page, '[data-node-id="spare"]')
  await page.mouse.move(spare.x, spare.y)
  await page.mouse.down()
  await page.mouse.move(spare.x + 20, spare.y + 5)
  await expect(page.locator('[data-node-id="spare"]')).toHaveClass(/dragging/u)
  await page
    .getByTestId('flow-canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )
  await page.mouse.up()
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
})

test('removing a dragged node clears its preview and releases gesture resources', async ({
  page,
}) => {
  await mountCancellationScenario(page)
  const start = await centerOf(page, '[data-node-id="drag"]')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 24, start.y + 8)
  const draggedNode = page.locator('[data-node-id="drag"]')
  await expect(draggedNode).toHaveClass(/dragging/u)
  const element = await draggedNode.elementHandle()

  if (element === null) {
    throw new Error('Missing active drag node')
  }

  const captured = await page.evaluate(() => {
    const elements = [
      globalThis.document.querySelector<HTMLElement>(
        "[data-testid='flow-canvas']"
      ),
      globalThis.document.querySelector<HTMLElement>("[data-node-id='drag']"),
    ]

    return elements.some(
      (candidate) => candidate?.hasPointerCapture(1) === true
    )
  })

  expect(captured).toBe(true)

  // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
  await page.evaluate(() => {
    const document: FlowDocumentInput = {
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 80, y: 180 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 300, y: 180 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        { id: 'spare', label: 'Spare', position: { x: 700, y: 180 } },
      ],
      edges: [],
    }

    globalThis.flowController?.update(document)
  })
  await expect(draggedNode).toHaveCount(0)
  expect(
    await element.evaluate(
      (node) => node instanceof HTMLElement && node.hasPointerCapture(1)
    )
  ).toBe(false)
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
  await element.evaluate((node) => {
    if (!(node instanceof HTMLElement)) {
      throw new TypeError('Detached node is not an HTMLElement')
    }

    node.dataset.measuredWidth = 'released'
    node.style.width = '321px'
  })
  await page.waitForTimeout(50)
  expect(await element.getAttribute('data-measured-width')).toBe('released')

  const spare = await centerOf(page, '[data-node-id="spare"]')
  await page.mouse.move(spare.x, spare.y)
  await page.mouse.down()
  await page.mouse.move(spare.x + 20, spare.y + 5)
  await expect(page.locator('[data-node-id="spare"]')).toHaveClass(/dragging/u)
  await page
    .getByTestId('flow-canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )
  await page.mouse.up()
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
})

test('unmounting during a drag releases capture and resize observation', async ({
  page,
}) => {
  await mountCancellationScenario(page)
  const start = await centerOf(page, '[data-node-id="drag"]')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 24, start.y + 8)
  const draggedNode = page.locator('[data-node-id="drag"]')
  await expect(draggedNode).toHaveClass(/dragging/u)
  const element = await draggedNode.elementHandle()

  if (element === null) {
    throw new Error('Missing active drag node')
  }

  const captured = await page.evaluate(() => {
    const elements = [
      globalThis.document.querySelector<HTMLElement>(
        "[data-testid='flow-canvas']"
      ),
      globalThis.document.querySelector<HTMLElement>("[data-node-id='drag']"),
    ]

    return elements.some(
      (candidate) => candidate?.hasPointerCapture(1) === true
    )
  })

  expect(captured).toBe(true)
  await page.evaluate(() => globalThis.flowController?.destroy())
  await expect(page.getByTestId('flow-canvas')).toHaveCount(0)
  expect(
    await element.evaluate(
      (node) => node instanceof HTMLElement && node.hasPointerCapture(1)
    )
  ).toBe(false)
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
  await element.evaluate((node) => {
    if (!(node instanceof HTMLElement)) {
      throw new TypeError('Detached node is not an HTMLElement')
    }

    node.dataset.measuredWidth = 'released'
    node.style.width = '321px'
  })
  await page.waitForTimeout(50)
  expect(await element.getAttribute('data-measured-width')).toBe('released')
})

// Playwright/CDP touch injection does not preserve native pointer capture in this environment.
test.fixme('concurrent native connection and node drag cancellation requires real pointer capture', () => {
  throw new Error('Requires native pointer capture')
})

test.fixme('native two-contact pinch cancellation requires real touch pointer capture', () => {
  throw new Error('Requires native touch pointer capture')
})

test('bounds conflict cancels resize without publishing an invalid rectangle', async ({
  page,
}) => {
  await mountResizeScenario(
    page,
    'uncontrolled',
    1,
    { minX: 0, minY: 0, maxX: 100, maxY: 400 },
    { width: 20, height: 60 }
  )
  await beginResize(page, 20, 0, 'bottom-right')
  await page.mouse.up()
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
  expect(await currentSize(page)).toStrictEqual({ width: 20, height: 60 })
  expect(await position(page, 'source')).toStrictEqual({ x: 80, y: 100 })
})

test('controlled left resize restores parent and child positions until the atomic bounds change is acknowledged', async ({
  page,
}) => {
  await mountResizeScenario(page, 'controlled')
  await beginResize(page, 20, 0, 'left')
  await page.mouse.up()
  expect(await page.evaluate(() => globalThis.flowChanges?.[0])).toEqual({
    kind: 'node-bounds',
    nodeId: 'source',
    position: { x: 100, y: 100 },
    size: { width: 70, height: 60 },
    childPositions: [{ nodeId: 'child', position: { x: -5, y: 15 } }],
  })
  expect(await position(page, 'source')).toEqual({ x: 80, y: 100 })
  expect(await currentSize(page)).toEqual({ width: 90, height: 60 })
  expect(await position(page, 'child')).toEqual({ x: 95, y: 115 })
  expect(
    await page.evaluate(() =>
      globalThis.flowAuthoritativeNodes?.map(
        ({ id, position: nodePosition, size }) => ({
          id,
          position: nodePosition,
          size,
        })
      )
    )
  ).toEqual([
    {
      id: 'source',
      position: { x: 80, y: 100 },
      size: { width: 90, height: 60 },
    },
    {
      id: 'child',
      position: { x: 15, y: 15 },
      size: { width: 20, height: 20 },
    },
    {
      id: 'target',
      position: { x: 300, y: 100 },
      size: { width: 90, height: 60 },
    },
  ])
  await page.evaluate(() => {
    const authoritativeNodes = globalThis.flowAuthoritativeNodes

    if (authoritativeNodes === undefined) {
      throw new Error('Missing authoritative node fixture')
    }

    const nodes = authoritativeNodes.map((node) => {
      if (node.id === 'source') {
        return {
          ...node,
          position: { x: 100, y: 100 },
          size: { width: 70, height: 60 },
        }
      }

      if (node.id === 'child') {
        return { ...node, position: { x: -5, y: 15 } }
      }

      return node
    })

    globalThis.flowAuthoritativeNodes = nodes
    globalThis.flowController?.update({
      nodes: nodes.map((node) => {
        if (node.id === 'source') {
          return {
            ...node,
            label: node.id,
            selected: true,
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          }
        }

        if (node.id === 'target') {
          return {
            ...node,
            label: node.id,
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          }
        }

        return { ...node, label: node.id }
      }),
      edges: [
        {
          id: 'edge',
          source: 'source',
          target: 'target',
          sourceHandle: 'out',
          targetHandle: 'in',
        },
      ],
    })
  })
  await expect.poll(() => position(page, 'source')).toEqual({ x: 100, y: 100 })
  await expect.poll(() => position(page, 'child')).toEqual({ x: 95, y: 115 })
  expect(await currentSize(page)).toEqual({ width: 70, height: 60 })
})

test('resize refreshes toolbar and minimap while visible-node reconciliation preserves the active node', async ({
  page,
}) => {
  await mountResizeScenario(page, 'uncontrolled', 1, undefined, undefined, {
    derivedUI: true,
    renderOnlyVisible: true,
  })
  await expect(
    page.locator('.flow-minimap-node[data-node-id="source"]')
  ).toHaveCount(1)

  const before = await page
    .locator('#resize-node-toolbar')
    .getAttribute('style')

  const miniBefore = await page
    .locator('.flow-minimap-node[data-node-id="source"]')
    .getAttribute('width')

  await beginResize(page, 60, 30, 'bottom-right')
  await expect(
    page.locator('.flow-node[data-node-id="source"]')
  ).toHaveAttribute('data-resizing', 'true')
  await expect(page.locator('#resize-node-toolbar')).toBeVisible()
  await expect
    .poll(() => page.locator('#resize-node-toolbar').getAttribute('style'))
    .not.toBe(before)
  await expect
    .poll(() =>
      page
        .locator('.flow-minimap-node[data-node-id="source"]')
        .getAttribute('width')
    )
    .not.toBe(miniBefore)
  await expect(page.locator('.flow-node[data-node-id="source"]')).toHaveCount(1)
  await expect(page.locator('.flow-node[data-node-id="remote"]')).toHaveCount(0)
  await page
    .getByTestId('flow-canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )
  await expect(page.locator('.flow-node[data-node-id="source"]')).toHaveCount(1)
  expect(await currentSize(page)).toEqual({ width: 90, height: 60 })
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
})

test('nested parent extent clamps resize and cancellation restores local and world positions', async ({
  page,
}) => {
  await mountResizeScenario(page, 'uncontrolled', 1, undefined, undefined, {
    nestedParent: true,
  })
  expect(await position(page, 'source')).toEqual({ x: 60, y: 60 })
  expect(await position(page, 'child')).toEqual({ x: 75, y: 75 })
  await beginResize(page, -100, 0, 'left')
  await expect.poll(() => currentSize(page)).toEqual({ width: 70, height: 40 })
  await expect.poll(() => position(page, 'source')).toEqual({ x: 50, y: 60 })
  await expect.poll(() => position(page, 'child')).toEqual({ x: 75, y: 75 })
  await page
    .getByTestId('flow-canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )
  await expect.poll(() => currentSize(page)).toEqual({ width: 60, height: 40 })
  await expect.poll(() => position(page, 'source')).toEqual({ x: 60, y: 60 })
  await expect.poll(() => position(page, 'child')).toEqual({ x: 75, y: 75 })
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
})

for (const zoom of [1, 2] as const) {
  test(`directional resize controls and active preview screenshot at zoom ${zoom}`, async ({
    page,
  }) => {
    await mountResizeScenario(page, 'uncontrolled', zoom)
    const source = page.locator('.flow-node[data-node-id="source"]')
    await source.evaluate((node) => {
      if (!(node instanceof HTMLElement)) {
        throw new TypeError('Expected source HTML node')
      }

      node.blur()
    })
    await expect(source).toHaveScreenshot(`resize-idle-zoom-${zoom}.png`, {
      animations: 'disabled',
    })
    await beginResize(page, 24, 12, 'left')
    await expect(source).toHaveScreenshot(`resize-active-zoom-${zoom}.png`, {
      animations: 'disabled',
    })
    await page
      .getByTestId('flow-canvas')
      .evaluate((canvas) =>
        canvas.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        )
      )
    await page.mouse.up()
    await expect(source).not.toHaveClass(/resizing/u)
    await expect(
      page.locator('.flow-node-resize-handle[data-direction="left"]')
    ).toHaveAccessibleName('Resize Source from left')
  })

  test(`top and top-left resize preserve fixed opposite edges and child world position at zoom ${zoom}`, async ({
    page,
  }) => {
    await mountResizeScenario(page, 'uncontrolled', zoom)
    await beginResize(page, 0, 15, 'top')
    await page.mouse.up()
    await expect
      .poll(() => currentSize(page))
      .toStrictEqual({ width: 90, height: 60 - 15 / zoom })
    await expect
      .poll(() => position(page, 'source'))
      .toStrictEqual({ x: 80, y: 100 + 15 / zoom })
    await expect
      .poll(() => position(page, 'child'))
      .toStrictEqual({ x: 95, y: 115 })
    const topChange = await page.evaluate(() => globalThis.flowChanges?.[0])
    expect(topChange).toMatchObject({
      kind: 'node-bounds',
      position: { x: 80, y: 100 + 15 / zoom },
    })
    await mountResizeScenario(page, 'uncontrolled', zoom)
    await beginResize(page, 20, 15, 'top-left')
    await page.mouse.up()
    await expect
      .poll(() => currentSize(page))
      .toStrictEqual({ width: 90 - 20 / zoom, height: 60 - 15 / zoom })
    await expect
      .poll(() => position(page, 'source'))
      .toStrictEqual({ x: 80 + 20 / zoom, y: 100 + 15 / zoom })
    await expect
      .poll(() => position(page, 'child'))
      .toStrictEqual({ x: 95, y: 115 })
    expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(1)
  })
}

for (const zoom of [1, 2] as const) {
  test(`left resize keeps the opposite edge and nested child fixed at zoom ${zoom}`, async ({
    page,
  }) => {
    await mountResizeScenario(page, 'uncontrolled', zoom)
    await beginResize(page, 20, 0, 'left')
    await page.mouse.up()
    await expect
      .poll(() => currentSize(page))
      .toStrictEqual({ width: 90 - 20 / zoom, height: 60 })
    await expect
      .poll(() => position(page, 'source'))
      .toStrictEqual({ x: 80 + 20 / zoom, y: 100 })
    await expect
      .poll(() => position(page, 'child'))
      .toStrictEqual({ x: 95, y: 115 })
    expect(
      await page.evaluate(() => globalThis.flowChanges?.[0])
    ).toMatchObject({
      kind: 'node-bounds',
      position: { x: 80 + 20 / zoom, y: 100 },
    })
  })
}

for (const zoom of [1, 2] as const) {
  test(`bottom-right resize previews edges and commits one atomic bounds change at zoom ${zoom}`, async ({
    page,
  }) => {
    await mountResizeScenario(page, 'uncontrolled', zoom)
    const edge = page.locator('[data-edge-id="edge"] .flow-edge-path')
    const previousPath = await edge.getAttribute('d')
    const change = { width: 90 + 60 / zoom, height: 60 + 30 / zoom }
    await beginResize(page)
    await expect.poll(() => currentSize(page)).toStrictEqual(change)
    await expect(
      page.locator('.flow-node[data-node-id="source"]')
    ).not.toHaveClass(/dragging/u)
    await expect(page.getByTestId('flow-canvas')).not.toHaveClass(/panning/u)
    await expect.poll(() => edge.getAttribute('d')).not.toBe(previousPath)
    await page.mouse.up()
    await expect
      .poll(() => page.evaluate(() => globalThis.flowChanges))
      .toStrictEqual([
        {
          kind: 'node-bounds',
          nodeId: 'source',
          position: { x: 80, y: 100 },
          size: change,
          childPositions: [{ nodeId: 'child', position: { x: 15, y: 15 } }],
        },
      ])
    expect(await currentSize(page)).toStrictEqual(change)
    expect(await position(page, 'source')).toStrictEqual({ x: 80, y: 100 })
  })

  test(`controlled bottom-right resize waits for acknowledgement at zoom ${zoom}`, async ({
    page,
  }) => {
    await mountResizeScenario(page, 'controlled', zoom)
    const change = { width: 90 + 60 / zoom, height: 60 + 30 / zoom }
    await beginResize(page)
    await page.mouse.up()
    await expect
      .poll(() => page.evaluate(() => globalThis.flowChanges))
      .toStrictEqual([
        {
          kind: 'node-bounds',
          nodeId: 'source',
          position: { x: 80, y: 100 },
          size: change,
          childPositions: [{ nodeId: 'child', position: { x: 15, y: 15 } }],
        },
      ])
    expect(await currentSize(page)).toStrictEqual({ width: 90, height: 60 })
    // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
    await page.evaluate(
      (size) =>
        globalThis.flowController?.update({
          nodes: [
            {
              id: 'source',
              label: 'Source',
              position: { x: 80, y: 100 },
              size,
              selected: true,
              handles: [{ id: 'out', kind: 'source', side: 'right' }],
            },
            {
              id: 'child',
              label: 'Child',
              parentId: 'source',
              position: { x: 15, y: 15 },
              size: { width: 20, height: 20 },
            },
            {
              id: 'target',
              label: 'Target',
              position: { x: 300, y: 100 },
              size: { width: 90, height: 60 },
              handles: [{ id: 'in', kind: 'target', side: 'left' }],
            },
          ],
          edges: [
            {
              id: 'edge',
              source: 'source',
              target: 'target',
              sourceHandle: 'out',
              targetHandle: 'in',
            },
          ],
        } as never),
      change
    )
    await expect.poll(() => currentSize(page)).toStrictEqual(change)
  })
}

for (const cancellation of [
  'escape',
  'blur',
  'pointercancel',
  'capture-loss',
  'node-removal',
  'destroy',
] as const) {
  test(`node resize cancellation by ${cancellation} restores authoritative size`, async ({
    page,
  }) => {
    await mountResizeScenario(page)
    const source = page.locator('.flow-node[data-node-id="source"]')
    const sourceElement = await source.elementHandle()

    if (sourceElement === null) {
      throw new Error('Missing resize owner')
    }

    await beginResize(page)
    await expect
      .poll(() => currentSize(page))
      .toStrictEqual({ width: 150, height: 90 })

    if (cancellation === 'escape') {
      await page
        .getByTestId('flow-canvas')
        .evaluate((canvas) =>
          canvas.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
          )
        )
    } else if (cancellation === 'blur') {
      await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
    } else if (cancellation === 'capture-loss') {
      await releasePointerCapture(page)
    } else if (cancellation === 'pointercancel') {
      await page
        .getByTestId('flow-canvas')
        .evaluate((canvas) =>
          canvas.dispatchEvent(
            new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })
          )
        )
    } else if (cancellation === 'node-removal') {
      // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
      await page.evaluate(() =>
        globalThis.flowController?.update({
          nodes: [
            {
              id: 'target',
              label: 'Target',
              position: { x: 300, y: 100 },
              size: { width: 90, height: 60 },
              handles: [{ id: 'in', kind: 'target', side: 'left' }],
            },
          ],
          edges: [],
        } as never)
      )
    } else {
      await page.evaluate(() => globalThis.flowController?.destroy())
    }

    if (cancellation === 'node-removal') {
      await expect(source).toHaveCount(0)
    }

    expect(
      await sourceElement.evaluate(
        (element) =>
          element instanceof HTMLElement && element.hasPointerCapture(1)
      )
    ).toBe(false)

    if (cancellation !== 'destroy' && cancellation !== 'node-removal') {
      await expect(source).not.toHaveClass(/resizing/u)
      await expect
        .poll(() => currentSize(page))
        .toStrictEqual({ width: 90, height: 60 })
      await expect
        .poll(() => position(page, 'source'))
        .toStrictEqual({ x: 80, y: 100 })
      await expect
        .poll(() => position(page, 'child'))
        .toStrictEqual({ x: 95, y: 115 })
      expect(
        await source.evaluate(
          (element) =>
            element instanceof HTMLElement && element.hasPointerCapture(1)
        )
      ).toBe(false)
    }

    if (cancellation !== 'destroy') {
      await page.mouse.up()
    }

    expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])

    if (cancellation === 'node-removal') {
      await page.evaluate(() =>
        globalThis.flowController?.update({
          nodes: [
            {
              id: 'source',
              label: 'Source',
              position: { x: 80, y: 100 },
              size: { width: 90, height: 60 },
              selected: true,
              handles: [{ id: 'out', kind: 'source', side: 'right' }],
            },
            {
              id: 'child',
              label: 'Child',
              parentId: 'source',
              position: { x: 15, y: 15 },
              size: { width: 20, height: 20 },
            },
            {
              id: 'target',
              label: 'Target',
              position: { x: 300, y: 100 },
              size: { width: 90, height: 60 },
              handles: [{ id: 'in', kind: 'target', side: 'left' }],
            },
          ],
          edges: [
            {
              id: 'edge',
              source: 'source',
              target: 'target',
              sourceHandle: 'out',
              targetHandle: 'in',
            },
          ],
        })
      )
      await expect(source).toHaveCount(1)
    } else if (cancellation === 'destroy') {
      await expect(page.getByTestId('flow-canvas')).toHaveCount(0)
    } else {
      await page.waitForTimeout(80)
      await expect
        .poll(() => currentSize(page))
        .toStrictEqual({ width: 90, height: 60 })
    }

    if (cancellation !== 'destroy') {
      await beginResize(page)
      await page.mouse.up()
      await expect
        .poll(() => page.evaluate(() => globalThis.flowChanges))
        .toHaveLength(1)
      await expect
        .poll(() => currentSize(page))
        .toStrictEqual({ width: 150, height: 90 })
    }
  })
}

const keyboardResizeCases = [
  {
    direction: 'top',
    keys: ['ArrowUp'],
    position: { x: 80, y: 95 },
    size: { width: 90, height: 65 },
    child: { x: 15, y: 20 },
  },
  {
    direction: 'right',
    keys: ['ArrowRight'],
    position: { x: 80, y: 100 },
    size: { width: 95, height: 60 },
    child: { x: 15, y: 15 },
  },
  {
    direction: 'bottom',
    keys: ['ArrowDown'],
    position: { x: 80, y: 100 },
    size: { width: 90, height: 65 },
    child: { x: 15, y: 15 },
  },
  {
    direction: 'left',
    keys: ['ArrowLeft'],
    position: { x: 75, y: 100 },
    size: { width: 95, height: 60 },
    child: { x: 20, y: 15 },
  },
  {
    direction: 'top-left',
    keys: ['ArrowUp', 'ArrowLeft'],
    position: { x: 75, y: 95 },
    size: { width: 95, height: 65 },
    child: { x: 20, y: 20 },
  },
  {
    direction: 'top-right',
    keys: ['ArrowUp', 'ArrowRight'],
    position: { x: 80, y: 95 },
    size: { width: 95, height: 65 },
    child: { x: 15, y: 20 },
  },
  {
    direction: 'bottom-right',
    keys: ['ArrowRight', 'ArrowDown'],
    position: { x: 80, y: 100 },
    size: { width: 95, height: 65 },
    child: { x: 15, y: 15 },
  },
  {
    direction: 'bottom-left',
    keys: ['ArrowLeft', 'ArrowDown'],
    position: { x: 75, y: 100 },
    size: { width: 95, height: 65 },
    child: { x: 20, y: 15 },
  },
] as const

for (const resizeCase of keyboardResizeCases) {
  test(`keyboard resize ${resizeCase.direction} follows edge signs and keeps the child world position fixed`, async ({
    page,
  }) => {
    await mountResizeScenario(page)

    const button = page.locator(
      `.flow-node-resize-handle[data-direction="${resizeCase.direction}"]`
    )

    await button.focus()
    await expect(button).toHaveAccessibleName(
      `Resize Source from ${resizeCase.direction.replaceAll('-', ' ')}`
    )

    const beforeActivation = {
      position: await position(page, 'source'),
      size: await currentSize(page),
    }

    await page.keyboard.press('Enter')
    await page.keyboard.press('Space')
    await expect
      .poll(() => position(page, 'source'))
      .toStrictEqual(beforeActivation.position)
    await expect
      .poll(() => currentSize(page))
      .toStrictEqual(beforeActivation.size)
    await expect(
      page.locator('.flow-node[data-node-id="source"]')
    ).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
    await button.focus()

    await runSerially(resizeCase.keys, (key) => page.keyboard.press(key))

    await expect
      .poll(() => position(page, 'source'))
      .toStrictEqual(resizeCase.position)
    await expect.poll(() => currentSize(page)).toStrictEqual(resizeCase.size)
    await expect
      .poll(() => position(page, 'child'))
      .toStrictEqual({ x: 95, y: 115 })
    const changes = await page.evaluate(() => globalThis.flowChanges)
    expect(changes).toHaveLength(resizeCase.keys.length)
    expect(changes?.every((change) => change.kind === 'node-bounds')).toBe(true)
    await expect(button).toBeFocused()
  })
}

test('keyboard resize owns one arrow and its initial Shift step until matching keyup', async ({
  page,
}) => {
  await mountResizeScenario(page)

  const button = page.locator(
    '.flow-node-resize-handle[data-direction="right"]'
  )

  await button.focus()
  await page.keyboard.down('ArrowRight')
  await button.evaluate((element) =>
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        shiftKey: true,
        repeat: true,
      })
    )
  )
  await button.evaluate((element) =>
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        repeat: true,
      })
    )
  )
  await page.keyboard.down('Shift')
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 100, height: 60 })
  await expect
    .poll(() => position(page, 'source'))
    .toStrictEqual({ x: 80, y: 100 })
  await page.keyboard.up('ArrowRight')
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toHaveLength(1)
  await expect(button).toBeFocused()
  await page.keyboard.up('Shift')
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 100, height: 60 })
})

test('keyboard resize uses the larger Shift step captured at gesture start and accepts a fresh gesture after Escape', async ({
  page,
}) => {
  await mountResizeScenario(page)

  const button = page.locator(
    '.flow-node-resize-handle[data-direction="right"]'
  )

  await button.focus()
  await page.keyboard.down('Shift')
  await page.keyboard.down('ArrowRight')
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 110, height: 60 })
  await page.keyboard.press('Escape')
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 90, height: 60 })
  await expect(button).toBeFocused()
  await page.keyboard.up('ArrowRight')
  await page.keyboard.up('Shift')
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 95, height: 60 })
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toHaveLength(1)
})

test('controlled keyboard left resize restores authoritative geometry until delayed atomic acknowledgement', async ({
  page,
}) => {
  await mountResizeScenario(page, 'controlled')
  const button = page.locator('.flow-node-resize-handle[data-direction="left"]')
  await button.focus()
  await page.keyboard.down('ArrowLeft')
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 95, height: 60 })
  await expect
    .poll(() => position(page, 'source'))
    .toStrictEqual({ x: 75, y: 100 })
  await expect
    .poll(() => position(page, 'child'))
    .toStrictEqual({ x: 95, y: 115 })
  await page.keyboard.up('ArrowLeft')
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toStrictEqual([
      {
        kind: 'node-bounds',
        nodeId: 'source',
        position: { x: 75, y: 100 },
        size: { width: 95, height: 60 },
        childPositions: [{ nodeId: 'child', position: { x: 20, y: 15 } }],
      },
    ])
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 90, height: 60 })
  await expect
    .poll(() => position(page, 'source'))
    .toStrictEqual({ x: 80, y: 100 })
  await expect
    .poll(() => position(page, 'child'))
    .toStrictEqual({ x: 95, y: 115 })
  await page.waitForTimeout(80)
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 90, height: 60 })
  await page.evaluate(() => {
    const nodes = structuredClone(globalThis.flowAuthoritativeNodes ?? [])
    const source = nodes.find((node) => node.id === 'source')
    const child = nodes.find((node) => node.id === 'child')

    if (source === undefined || child === undefined) {
      throw new Error('Missing resize fixture nodes')
    }

    source.position = { x: 75, y: 100 }
    source.size = { width: 95, height: 60 }
    child.position = { x: 20, y: 15 }
    // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
    globalThis.flowController?.update({
      nodes,
      edges: [
        {
          id: 'edge',
          source: 'source',
          target: 'target',
          sourceHandle: 'out',
          targetHandle: 'in',
        },
      ],
    } as never)
  })
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 95, height: 60 })
  await expect
    .poll(() => position(page, 'source'))
    .toStrictEqual({ x: 75, y: 100 })
  await expect
    .poll(() => position(page, 'child'))
    .toStrictEqual({ x: 95, y: 115 })
})

test('controlled keyboard resize does not adopt a candidate without acknowledgement', async ({
  page,
}) => {
  await mountResizeScenario(page, 'controlled')
  await keyboardResize(page, 'top', 'ArrowUp')
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toHaveLength(1)
  await page.waitForTimeout(80)
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 90, height: 60 })
  await expect
    .poll(() => position(page, 'source'))
    .toStrictEqual({ x: 80, y: 100 })
  await expect
    .poll(() => position(page, 'child'))
    .toStrictEqual({ x: 95, y: 115 })
})

for (const cancellation of [
  'escape',
  'blur',
  'node-removal',
  'node-hidden',
  'deselection',
  'destroy',
] as const) {
  test(`keyboard resize cancellation by ${cancellation} restores geometry without publishing`, async ({
    page,
  }) => {
    await mountResizeScenario(page)

    const button = page.locator(
      '.flow-node-resize-handle[data-direction="left"]'
    )

    await button.focus()
    await page.keyboard.down('ArrowLeft')
    await expect
      .poll(() => currentSize(page))
      .toStrictEqual({ width: 95, height: 60 })

    if (cancellation === 'escape') {
      await page.keyboard.press('Escape')
    } else if (cancellation === 'blur') {
      await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
    } else if (cancellation === 'node-removal') {
      // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
      await page.evaluate(() =>
        globalThis.flowController?.update({ nodes: [], edges: [] } as never)
      )
    } else if (cancellation === 'node-hidden') {
      // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
      await page.evaluate(() =>
        globalThis.flowController?.update({
          nodes: [
            {
              id: 'source',
              label: 'Source',
              position: { x: 80, y: 100 },
              size: { width: 90, height: 60 },
              selected: true,
              hidden: true,
              handles: [{ id: 'out', kind: 'source', side: 'right' }],
            },
            {
              id: 'child',
              label: 'Child',
              parentId: 'source',
              position: { x: 15, y: 15 },
              size: { width: 20, height: 20 },
            },
            {
              id: 'target',
              label: 'Target',
              position: { x: 300, y: 100 },
              size: { width: 90, height: 60 },
              handles: [{ id: 'in', kind: 'target', side: 'left' }],
            },
          ],
          edges: [],
        } as never)
      )
    } else if (cancellation === 'deselection') {
      // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
      await page.evaluate(() =>
        globalThis.flowController?.update({
          nodes: [
            {
              id: 'source',
              label: 'Source',
              position: { x: 80, y: 100 },
              size: { width: 90, height: 60 },
              selected: false,
              handles: [{ id: 'out', kind: 'source', side: 'right' }],
            },
            {
              id: 'child',
              label: 'Child',
              parentId: 'source',
              position: { x: 15, y: 15 },
              size: { width: 20, height: 20 },
            },
            {
              id: 'target',
              label: 'Target',
              position: { x: 300, y: 100 },
              size: { width: 90, height: 60 },
              handles: [{ id: 'in', kind: 'target', side: 'left' }],
            },
          ],
          edges: [],
        } as never)
      )
    } else {
      await page.evaluate(() => globalThis.flowController?.destroy())
    }

    if (cancellation === 'destroy') {
      await expect(page.getByTestId('flow-canvas')).toHaveCount(0)
      await expect
        .poll(() => page.evaluate(() => globalThis.flowChanges))
        .toEqual([])
    } else {
      if (cancellation === 'node-removal') {
        await expect(
          page.locator('.flow-node[data-node-id="source"]')
        ).toHaveCount(0)
      } else if (
        cancellation === 'node-hidden' ||
        cancellation === 'deselection'
      ) {
        await expect(button).toHaveCount(0)
      } else {
        await expect(button).toBeFocused()
      }

      await expect
        .poll(() => page.evaluate(() => globalThis.flowChanges))
        .toEqual([])

      if (cancellation !== 'node-removal' && cancellation !== 'node-hidden') {
        await expect
          .poll(() => currentSize(page))
          .toStrictEqual({ width: 90, height: 60 })
      }

      if (
        cancellation === 'escape' ||
        cancellation === 'blur' ||
        cancellation === 'deselection'
      ) {
        await expect
          .poll(() => position(page, 'child'))
          .toStrictEqual({ x: 95, y: 115 })
      }

      if (
        cancellation === 'node-removal' ||
        cancellation === 'node-hidden' ||
        cancellation === 'deselection'
      ) {
        await expect(page.getByTestId('flow-canvas')).toBeFocused()
      }
    }
  })
}

test('keyboard resize cancels when an ancestor becomes hidden and preserves nested local geometry', async ({
  page,
}) => {
  await mountResizeScenario(
    page,
    'uncontrolled',
    1,
    undefined,
    { width: 60, height: 40 },
    { nestedParent: true }
  )
  const button = page.locator('.flow-node-resize-handle[data-direction="left"]')
  await button.focus()
  await page.keyboard.down('ArrowLeft')
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 65, height: 40 })
  await expect
    .poll(() => position(page, 'source'))
    .toStrictEqual({ x: 55, y: 60 })
  await expect
    .poll(() => position(page, 'child'))
    .toStrictEqual({ x: 75, y: 75 })
  // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
  await page.evaluate(() =>
    globalThis.flowController?.update({
      nodes: [
        {
          id: 'container',
          label: 'Container',
          position: { x: 50, y: 50 },
          size: { width: 100, height: 80 },
          hidden: true,
        },
        {
          id: 'source',
          label: 'Source',
          parentId: 'container',
          extent: 'parent',
          position: { x: 10, y: 10 },
          size: { width: 60, height: 40 },
          selected: true,
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'child',
          label: 'Child',
          parentId: 'source',
          position: { x: 15, y: 15 },
          size: { width: 20, height: 20 },
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 300, y: 100 },
          size: { width: 90, height: 60 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [],
    } as never)
  )
  await expect(button).toHaveCount(0)
  await expect(page.getByTestId('flow-canvas')).toBeFocused()
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toEqual([])
  await page.keyboard.up('ArrowLeft')
  // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
  await page.evaluate(() =>
    globalThis.flowController?.update({
      nodes: [
        {
          id: 'container',
          label: 'Container',
          position: { x: 50, y: 50 },
          size: { width: 100, height: 80 },
        },
        {
          id: 'source',
          label: 'Source',
          parentId: 'container',
          extent: 'parent',
          position: { x: 10, y: 10 },
          size: { width: 60, height: 40 },
          selected: true,
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'child',
          label: 'Child',
          parentId: 'source',
          position: { x: 15, y: 15 },
          size: { width: 20, height: 20 },
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 300, y: 100 },
          size: { width: 90, height: 60 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [],
    } as never)
  )
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 60, height: 40 })
  await expect
    .poll(() => position(page, 'source'))
    .toStrictEqual({ x: 60, y: 60 })
  await expect
    .poll(() => position(page, 'child'))
    .toStrictEqual({ x: 75, y: 75 })
  await keyboardResize(page, 'left', 'ArrowLeft')
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toHaveLength(1)
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 65, height: 40 })
})

test('keyboard resize remains active through viewport culling and pointer resize still works afterward', async ({
  page,
}) => {
  await mountResizeScenario(
    page,
    'uncontrolled',
    1,
    undefined,
    { width: 90, height: 60 },
    { renderOnlyVisible: true }
  )
  await page.locator('.flow-node-resize-handle[data-direction="right"]').focus()
  await page.keyboard.down('ArrowRight')
  await page.evaluate(() =>
    globalThis.flowController?.updateViewport({ x: -5000, y: -5000, zoom: 1 })
  )
  await page.keyboard.up('ArrowRight')
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toHaveLength(1)
  await page.evaluate(() =>
    globalThis.flowController?.updateViewport({ x: 0, y: 0, zoom: 1 })
  )
  await expect(page.locator('.flow-node[data-node-id="source"]')).toBeVisible()
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 95, height: 60 })
  await beginResize(page, 5, 0, 'right')
  await page.mouse.up()
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toHaveLength(2)
  await expect
    .poll(() => currentSize(page))
    .toStrictEqual({ width: 100, height: 60 })
})

test('node extent keeps a complete node inside its bounds during drag', async ({
  page,
}) => {
  await mountScenario(page, 'extent-single')
  const start = await centerOf(page, '[data-node-id="a"]')
  await drag(page, start, { x: start.x + 500, y: start.y + 500 })
  await expect.poll(() => position(page, 'a')).toStrictEqual({ x: 350, y: 356 })
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: 'node-position',
      nodeId: 'a',
      position: { x: 350, y: 356 },
    })
})

test('node extent preserves group spacing and constrains keyboard movement', async ({
  page,
}) => {
  await mountScenario(page, 'extent-group')
  const start = await centerOf(page, '[data-node-id="a"]')
  await drag(page, start, { x: start.x + 500, y: start.y })
  await expect.poll(() => position(page, 'a')).toStrictEqual({ x: 150, y: 100 })
  await expect.poll(() => position(page, 'b')).toStrictEqual({ x: 350, y: 100 })

  await page.locator('[data-node-id="a"]').focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => position(page, 'a')).toStrictEqual({ x: 150, y: 100 })
  await expect.poll(() => position(page, 'b')).toStrictEqual({ x: 350, y: 100 })
})

test('fitView shows measured distant nodes and supports selected-node fit', async ({
  page,
}) => {
  await mountScenario(page, 'fit')
  await expect(page.locator('[data-node-id="a"]')).toHaveAttribute(
    'data-measured-width',
    '150'
  )
  await expect(page.locator('[data-node-id="b"]')).toHaveAttribute(
    'data-measured-width',
    '150'
  )
  await page.evaluate(() =>
    globalThis.flowController?.fitView().then((result) => result.status)
  )
  const canvas = await page.getByTestId('flow-canvas').boundingBox()
  const first = await page.locator('[data-node-id="a"]').boundingBox()
  const second = await page.locator('[data-node-id="b"]').boundingBox()

  if (canvas === null || first === null || second === null) {
    throw new Error('Missing fitView bounds')
  }

  expect(first.x).toBeGreaterThanOrEqual(canvas.x)
  expect(second.x + second.width).toBeLessThanOrEqual(canvas.x + canvas.width)
  await page.locator('[data-node-id="a"]').click()
  await page.evaluate(() =>
    globalThis.flowController
      ?.fitView({ nodes: 'selected' })
      .then((result) => result.status)
  )
  const selected = await page.locator('[data-node-id="a"]').boundingBox()

  if (selected === null) {
    throw new Error('Missing selected node bounds')
  }

  expect(selected.x).toBeGreaterThan(canvas.x + canvas.width / 4)
  expect(selected.x + selected.width).toBeLessThan(
    canvas.x + (canvas.width * 3) / 4
  )
})

test('Fit graph demo action fits the current graph', async ({ page }) => {
  await page.goto('/')
  const button = page.getByRole('button', { name: 'Fit graph' })
  await expect(button).toBeVisible()
  await button.click()
  await expect
    .poll(() =>
      page
        .getByTestId('flow-viewport')
        .evaluate(
          (element) =>
            new DOMMatrixReadOnly(
              globalThis.getComputedStyle(element).transform
            ).a
        )
    )
    .toBeLessThan(1)
  await expect(page.locator('.flow-demo-note')).toContainText(
    'Fit graph uses measured sizes'
  )
  await expect(button).toHaveAttribute('aria-current', 'true')

  const block = page.getByRole('button', { name: 'Block Output connections' })
  await block.click()
  await expect(
    page.getByRole('button', { name: 'Allow Output connections' })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.flow-demo-description')).toContainText(
    'new links into Output are rejected'
  )
  await expect(page.locator('.flow-demo-note')).toContainText(
    'The rule rejects that new edge'
  )
  await page.getByRole('button', { name: 'Allow Output connections' }).click()
  await expect(
    page.getByRole('button', { name: 'Block Output connections' })
  ).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.flow-demo-description')).toContainText(
    'Connection rule off'
  )
  await expect(page.locator('.flow-demo-note')).toContainText(
    'A duplicate endpoint pair is still rejected'
  )
})

test('connection radius accepts a nearby release outside a target handle', async ({
  page,
}) => {
  await mountScenario(page, 'radius')

  const source = await centerOf(
    page,
    '.flow-node[data-node-id="source"] [data-handle-id="out"]'
  )

  const target = await centerOf(
    page,
    '[data-node-id="rejected"] [data-handle-id="in"]'
  )

  await drag(page, source, { x: target.x, y: target.y + 35 })
  await expect(page.locator('.flow-edge-group')).toHaveCount(0)

  const near = { x: target.x, y: target.y + 20 }
  expect(
    await page.evaluate(
      ({ x, y }) =>
        globalThis.document.elementFromPoint(x, y)?.closest('.flow-handle') ===
        null,
      near
    )
  ).toBe(true)
  await drag(page, source, near)
  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)?.kind))
    .toBe('edge-add')
})

test('custom connection validator rejects one target and accepts another', async ({
  page,
}) => {
  await mountScenario(page, 'validator')

  const source = await centerOf(
    page,
    '.flow-node[data-node-id="source"] [data-handle-id="out"]'
  )

  const rejected = await centerOf(
    page,
    '[data-node-id="rejected"] [data-handle-id="in"]'
  )

  await drag(page, source, rejected)
  await expect(page.locator('.flow-edge-group')).toHaveCount(0)
  expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(0)

  const approved = await centerOf(
    page,
    '[data-node-id="approved"] [data-handle-id="in"]'
  )

  await drag(page, source, approved)
  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)?.kind))
    .toBe('edge-add')
})

test('custom connection validator also applies to two-click connections', async ({
  page,
}) => {
  await mountScenario(page, 'validator')

  const source = page.locator(
    '.flow-node[data-node-id="source"] [data-handle-id="out"]'
  )

  const rejected = page.locator(
    '[data-node-id="rejected"] [data-handle-id="in"]'
  )

  const approved = page.locator(
    '[data-node-id="approved"] [data-handle-id="in"]'
  )

  await source.click()
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
  await rejected.click()
  await expect(page.locator('.flow-edge-group')).toHaveCount(0)

  await source.click()
  await approved.click()
  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)?.kind))
    .toBe('edge-add')
})

test('keyboard activates focused source and target handles in click mode', async ({
  page,
}) => {
  await mountScenario(page, 'keyboard')
  await expect(
    page.locator('.flow-node.flow-node[data-node-id="source"]')
  ).toHaveAttribute('data-measured-width', '150')
  await expect(
    page.locator('.flow-node[data-node-id="rejected"]')
  ).toHaveAttribute('data-measured-width', '150')

  const source = page.locator(
    '.flow-node[data-node-id="source"] [data-handle-id="out"]'
  )

  const target = page.locator('[data-node-id="rejected"] [data-handle-id="in"]')

  await source.focus()
  await expect(source).toBeFocused()
  await page.keyboard.press('Enter')
  // Keyboard activation has no pointer yet, so the preview line is zero-length.
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(1)
  await expect(source).toHaveClass(/connecting/u)
  await expect(source).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)

  await page.keyboard.press('Enter')
  // Keyboard activation has no pointer yet, so the preview line is zero-length.
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(1)
  await page.keyboard.press('Tab')
  await expect(
    page.locator('.flow-node[data-node-id="rejected"]')
  ).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)?.kind))
    .toBe('edge-add')
})

test('window blur cancels a pending click connection', async ({ page }) => {
  await mountScenario(page, 'keyboard')

  const source = page.locator(
    '.flow-node[data-node-id="source"] [data-handle-id="out"]'
  )

  await source.click()
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
  await page.evaluate(() => {
    const other = globalThis.document.createElement('button')
    other.id = 'focus-target'
    globalThis.document.body.append(other)
    other.focus()
    globalThis.dispatchEvent(new Event('blur'))
  })

  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  await expect(source).not.toHaveClass(/connecting/u)
  await expect(page.locator('.flow-edge-group')).toHaveCount(0)
  await expect(page.locator('#focus-target')).toBeFocused()
  expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(0)
})

test('lost pointer capture cancels a node drag without publishing a change', async ({
  page,
}) => {
  await mountScenario(page, 'keyboard')
  const node = page.locator('.flow-node.flow-node[data-node-id="source"]')
  const original = await position(page, 'source')

  const start = await centerOf(
    page,
    '.flow-node[data-node-id="source"] .flow-node-content'
  )

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 80, start.y + 40)
  await expect(node).toHaveClass(/dragging/u)
  await releasePointerCapture(page)

  await expect(node).not.toHaveClass(/dragging/u)
  await expect.poll(() => position(page, 'source')).toStrictEqual(original)
  expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(0)
  await page.mouse.up()
  expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(0)
})

test('Escape cancels an active node drag without publishing a change', async ({
  page,
}) => {
  await mountScenario(page, 'keyboard')
  const node = page.locator('.flow-node.flow-node[data-node-id="source"]')
  const original = await position(page, 'source')

  const start = await centerOf(
    page,
    '.flow-node.flow-node[data-node-id="source"]'
  )

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 80, start.y + 40)
  await expect(node).toHaveClass(/dragging/u)
  await page
    .getByTestId('flow-canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )

  await expect(node).not.toHaveClass(/dragging/u)
  await expect.poll(() => position(page, 'source')).toStrictEqual(original)
  await page.mouse.up()
  expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(0)
})

test('window blur cancels pane pan and selection rectangle', async ({
  page,
}) => {
  await mountScenario(page, 'keyboard')
  const canvas = page.getByTestId('flow-canvas')
  const box = await canvas.boundingBox()

  if (box === null) {
    throw new Error('Missing canvas bounds')
  }

  const point = { x: box.x + box.width - 30, y: box.y + box.height - 30 }
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x - 60, point.y - 40)
  await expect(canvas).toHaveClass(/panning/u)
  await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
  await expect(canvas).not.toHaveClass(/panning/u)
  await page.mouse.up()

  await page.keyboard.down('Shift')
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x - 60, point.y - 40)
  await expect(page.getByTestId('flow-selection-rect')).toBeVisible()
  await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
  await expect(page.getByTestId('flow-selection-rect')).toHaveCount(0)
  await page.keyboard.up('Shift')
  await page.mouse.up()
  expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(0)
})

test('destroy releases the scoped window blur listener once', async ({
  page,
}) => {
  await mountScenario(page, 'keyboard')
  await page.evaluate(() => {
    const target = globalThis.window
    const remove = target.removeEventListener.bind(target)
    let removals = 0

    Object.defineProperty(target, 'removeEventListener', {
      configurable: true,
      value: (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions
      ) => {
        if (type === 'blur') {
          removals += 1
          globalThis.document.body.dataset.blurListenerRemovals =
            String(removals)
        }

        remove(type, listener, options)
      },
    })
    globalThis.flowController?.destroy()
    globalThis.flowController?.destroy()
  })

  await expect(page.getByTestId('flow-canvas')).toHaveCount(0)
  await expect(page.locator('body')).toHaveAttribute(
    'data-blur-listener-removals',
    '1'
  )
})
