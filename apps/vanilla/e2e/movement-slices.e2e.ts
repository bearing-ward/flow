import type * as CoreModule from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const readViewportX = (page: Page) =>
  page.locator('.flow-viewport').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('Expected the viewport to be an HTML element')
    }

    return element.dataset.x
  })

interface MovementNodeInput {
  id: string
  label: string
  position: { x: number; y: number }
  selected: boolean
  draggable?: boolean
  ariaDescription?: string
  handles?: { id: string; kind: string; side: string }[]
}

interface MovementViewportOptions {
  mode: 'uncontrolled'
  initial: { x: number; y: number; zoom: number }
  limits: { minZoom: number; maxZoom: number }
  extent?: { minX: number; minY: number; maxX: number; maxY: number }
}

const mountGraph = async (
  page: Page,
  options: {
    documentMode?: 'controlled' | 'uncontrolled'
    selectionMode?: 'full' | 'partial'
    selected?: boolean
    lockAlpha?: boolean
    description?: string
    zoom?: number
    withEdge?: boolean
    boundedViewport?: boolean
  } = {}
): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(
    async ({
      documentMode,
      selectionMode,
      selected,
      lockAlpha,
      description,
      zoom,
      withEdge,
      boundedViewport,
    }) => {
      const modulePath = '/src/public.ts'
      const { mountFlow } = await import(modulePath)
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing host')
      }

      const sourceNode: MovementNodeInput = {
        id: 'a',
        label: 'Alpha',
        position: { x: 100, y: 180 },
        selected: selected ?? false,
      }

      if (lockAlpha) {
        sourceNode.draggable = false
      }

      if (description !== undefined) {
        sourceNode.ariaDescription = description
      }

      if (withEdge) {
        sourceNode.handles = [{ id: 'out', kind: 'source', side: 'right' }]
      }

      const targetNode: MovementNodeInput = {
        id: 'b',
        label: 'Beta',
        position: { x: 350, y: 180 },
        selected: selected ?? false,
      }

      if (withEdge) {
        targetNode.handles = [{ id: 'in', kind: 'target', side: 'left' }]
      }

      const viewportOptions: MovementViewportOptions = {
        mode: 'uncontrolled',
        initial: { x: boundedViewport ? -300 : 0, y: 0, zoom: zoom ?? 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      }

      if (boundedViewport) {
        viewportOptions.extent = {
          minX: 100,
          minY: 0,
          maxX: 2000,
          maxY: 1000,
        }
      }

      const controller = mountFlow(
        root,
        {
          nodes: [
            sourceNode,
            targetNode,
            { id: 'c', label: 'Gamma', position: { x: 650, y: 180 } },
          ],
          edges: withEdge
            ? [
                {
                  id: 'ab',
                  source: 'a',
                  sourceHandle: 'out',
                  target: 'b',
                  targetHandle: 'in',
                },
              ]
            : [],
        },
        {
          documentMode: documentMode ?? 'uncontrolled',
          selectionMode,
          viewport: viewportOptions,
        }
      )

      globalThis.flowChanges = []
      controller.subscribe((change: CoreModule.FlowChange) =>
        globalThis.flowChanges?.push(change)
      )
      globalThis.flowController = controller
    },
    options
  )
}

const touch = (x: number, y: number) => ({ x, y })

const instrumentAnimationFrames = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const pending = new Set<number>()
    const request = globalThis.requestAnimationFrame.bind(globalThis)
    const cancel = globalThis.cancelAnimationFrame.bind(globalThis)
    globalThis.flowTestPendingFrames = pending
    globalThis.requestAnimationFrame = (f) => {
      let frame = 0
      frame = request((timestamp) => {
        pending.delete(frame)
        f(timestamp)
      })
      pending.add(frame)

      return frame
    }

    globalThis.cancelAnimationFrame = (frame) => {
      pending.delete(frame)
      cancel(frame)
    }
  })
}

const pendingAnimationFrames = (page: Page): Promise<number> =>
  page.evaluate(() => globalThis.flowTestPendingFrames?.size ?? 0)

test('arrow keys move the selected group by 5 or 20 flow units', async ({
  page,
}) => {
  await mountGraph(page, { selected: true })
  const alpha = page.locator('.flow-node[data-node-id="a"]')
  const beta = page.locator('.flow-node[data-node-id="b"]')
  const gamma = page.locator('.flow-node[data-node-id="c"]')

  await alpha.focus()
  await expect(alpha).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: 'node-positions',
      positions: [
        { nodeId: 'a', position: { x: 105, y: 180 } },
        { nodeId: 'b', position: { x: 355, y: 180 } },
      ],
    })
  await expect(alpha).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 105, 180)')
  await expect(beta).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 355, 180)')

  await page.keyboard.press('Shift+ArrowDown')
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: 'node-positions',
      positions: [
        { nodeId: 'a', position: { x: 105, y: 200 } },
        { nodeId: 'b', position: { x: 355, y: 200 } },
      ],
    })
  await expect(gamma).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 650, 180)')
})

test('locked selected nodes stay selectable while movable group members retain spacing', async ({
  page,
}) => {
  await mountGraph(page, { selected: true, lockAlpha: true })
  const alpha = page.locator('.flow-node[data-node-id="a"]')
  const beta = page.locator('.flow-node[data-node-id="b"]')
  const box = await alpha.boundingBox()

  if (box === null) {
    throw new Error('Missing node bounds')
  }

  await page.mouse.move(box.x + 30, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(box.x + 90, box.y + 60)
  await page.mouse.up()
  await expect(alpha).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 100, 180)')
  await expect(beta).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 410, 220)')
  await alpha.focus()
  await page.keyboard.press('ArrowRight')
  await expect(alpha).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 100, 180)')
  await expect(beta).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 415, 220)')
})

test('custom node descriptions follow keyed document updates and removal', async ({
  page,
}) => {
  await mountGraph(page, { description: 'Initial details' })
  const alpha = page.locator('.flow-node[data-node-id="a"]')
  await expect(alpha).toHaveAttribute('aria-label', 'Alpha')
  await expect(alpha).toHaveAttribute('aria-description', 'Initial details')
  await expect(alpha).toHaveAccessibleDescription('Initial details')
  await page.evaluate(() =>
    globalThis.flowController?.update({
      nodes: [
        {
          id: 'a',
          label: 'Alpha',
          position: { x: 100, y: 180 },
          ariaDescription: 'Updated details',
        },
        { id: 'b', label: 'Beta', position: { x: 350, y: 180 } },
        { id: 'c', label: 'Gamma', position: { x: 650, y: 180 } },
      ],
      edges: [],
    })
  )
  await expect(alpha).toHaveAttribute('aria-description', 'Updated details')
  await expect(alpha).toHaveAccessibleDescription('Updated details')
  await page.evaluate(() =>
    globalThis.flowController?.update({
      nodes: [
        { id: 'a', label: 'Alpha', position: { x: 100, y: 180 } },
        { id: 'b', label: 'Beta', position: { x: 350, y: 180 } },
        { id: 'c', label: 'Gamma', position: { x: 650, y: 180 } },
      ],
      edges: [],
    })
  )
  await expect(alpha).not.toHaveAttribute('aria-description')
  await expect(alpha).not.toHaveAccessibleDescription('Updated details')
})

test('node dragging auto-pans at the canvas edge and escape stops the frame', async ({
  page,
}) => {
  await mountGraph(page)
  await instrumentAnimationFrames(page)
  const alpha = page.locator('.flow-node[data-node-id="a"]')
  const box = await alpha.boundingBox()

  if (box === null) {
    throw new Error('Missing node bounds')
  }

  const canvas = await page.locator('.flow-canvas').boundingBox()

  if (canvas === null) {
    throw new Error('Missing canvas bounds')
  }

  await page.mouse.move(box.x + 30, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(
    canvas.x + canvas.width - 5,
    canvas.y + canvas.height / 2
  )
  await expect
    .poll(() => readViewportX(page))
    .not.toBe('0')
  await expect.poll(() => pendingAnimationFrames(page)).toBeGreaterThan(0)
  await page
    .getByTestId('flow-canvas')
    .evaluate((canvasElement) =>
      canvasElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )
  const stoppedAt = await page.locator('.flow-viewport').getAttribute('data-x')
  await page.waitForTimeout(80)
  await expect(page.locator('.flow-viewport')).toHaveAttribute(
    'data-x',
    stoppedAt ?? '0'
  )
  await expect(alpha).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 100, 180)')
  await expect.poll(() => pendingAnimationFrames(page)).toBe(0)
  await page.mouse.up()
})

for (const cancellation of [
  'blur',
  'pointercancel',
  'capture-loss',
  'node-removal',
  'destroy',
] as const) {
  test(`node auto-pan frame stops after ${cancellation}`, async ({ page }) => {
    await mountGraph(page)
    await instrumentAnimationFrames(page)
    const alpha = page.locator('.flow-node[data-node-id="a"]')
    const viewport = page.locator('.flow-viewport')
    const box = await alpha.boundingBox()
    const canvas = await page.locator('.flow-canvas').boundingBox()

    if (box === null || canvas === null) {
      throw new Error('Missing canvas or node bounds')
    }

    await page.mouse.move(box.x + 30, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(
      canvas.x + canvas.width - 5,
      canvas.y + canvas.height / 2
    )
    await expect
      .poll(() => readViewportX(page))
      .not.toBe('0')
    await expect.poll(() => pendingAnimationFrames(page)).toBeGreaterThan(0)

    if (cancellation === 'blur') {
      await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
    } else if (cancellation === 'pointercancel') {
      await alpha.dispatchEvent('pointercancel', {
        pointerId: 1,
        bubbles: true,
      })
    } else if (cancellation === 'capture-loss') {
      await alpha.dispatchEvent('lostpointercapture', {
        pointerId: 1,
        bubbles: true,
      })
    } else if (cancellation === 'node-removal') {
      await page.evaluate(() =>
        globalThis.flowController?.update({
          nodes: [
            { id: 'b', label: 'Beta', position: { x: 350, y: 180 } },
            { id: 'c', label: 'Gamma', position: { x: 650, y: 180 } },
          ],
          edges: [],
        })
      )
    } else {
      await page.evaluate(() => globalThis.flowController?.destroy())
    }

    if (cancellation === 'destroy') {
      await page.waitForTimeout(80)
      await expect(viewport).toHaveCount(0)
      await expect.poll(() => pendingAnimationFrames(page)).toBe(0)
      await page.mouse.up()

      return
    }

    const stoppedAt = await viewport.getAttribute('data-x')
    await page.waitForTimeout(80)
    await expect(viewport).toHaveAttribute('data-x', stoppedAt ?? '0')
    await expect.poll(() => pendingAnimationFrames(page)).toBe(0)

    if (cancellation === 'node-removal') {
      await expect(alpha).toHaveCount(0)
    }

    if (cancellation !== 'node-removal') {
      await expect(alpha).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 100, 180)')
    }

    await page.mouse.up()
  })
}

test('controlled node auto-pan cancellation restores preview and publishes no position', async ({
  page,
}) => {
  await mountGraph(page, { documentMode: 'controlled' })
  const alpha = page.locator('.flow-node[data-node-id="a"]')
  const box = await alpha.boundingBox()
  const canvas = await page.locator('.flow-canvas').boundingBox()

  if (box === null || canvas === null) {
    throw new Error('Missing canvas or node bounds')
  }

  await page.mouse.move(box.x + 120, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(canvas.x + 5, canvas.y + canvas.height / 2)
  await expect
    .poll(() => readViewportX(page))
    .not.toBe('0')
  await page
    .getByTestId('flow-canvas')
    .evaluate((element) =>
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )
  await page.mouse.up()
  await expect(alpha).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 100, 180)')
  expect(
    await page.evaluate(
      () =>
        globalThis.flowChanges?.filter(
          (change) =>
            change.kind === 'node-position' || change.kind === 'node-positions'
        ).length
    )
  ).toBe(0)
})

test('node auto-pan at zoom 2 updates drag and incident-edge previews', async ({
  page,
}) => {
  await mountGraph(page, { zoom: 2, withEdge: true })
  const alpha = page.locator('.flow-node[data-node-id="a"]')
  const box = await alpha.boundingBox()
  const canvas = await page.locator('.flow-canvas').boundingBox()

  if (box === null || canvas === null) {
    throw new Error('Missing canvas or node bounds')
  }

  const path = page.getByTestId('flow-edge-path')
  const beforePath = await path.getAttribute('d')
  await page.mouse.move(box.x + 30, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(
    canvas.x + canvas.width - 5,
    canvas.y + canvas.height / 2
  )
  await expect
    .poll(() => readViewportX(page))
    .not.toBe('0')
  await expect.poll(() => path.getAttribute('d')).not.toBe(beforePath)
  const viewportX = await page.locator('.flow-viewport').getAttribute('data-x')
  expect(Number(viewportX)).toBeLessThan(0)
  await page.mouse.up()
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toMatchObject({ kind: 'node-position', nodeId: 'a' })
  expect(await alpha.evaluate((element) => element.style.transform)).not.toBe(
    'translate(100px, 180px)'
  )
})

test('node auto-pan respects the configured viewport extent', async ({
  page,
}) => {
  await mountGraph(page, { zoom: 2, boundedViewport: true })
  const alpha = page.locator('.flow-node[data-node-id="a"]')
  const box = await alpha.boundingBox()
  const canvas = await page.locator('.flow-canvas').boundingBox()

  if (box === null || canvas === null) {
    throw new Error('Missing canvas or node bounds')
  }

  await page.mouse.move(box.x + 120, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(canvas.x + 5, canvas.y + canvas.height / 2)
  await page.waitForTimeout(80)
  await expect(page.locator('.flow-viewport')).toHaveAttribute('data-x', '-200')
  await page
    .getByTestId('flow-canvas')
    .evaluate((element) =>
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )
  await page.mouse.up()
})

test('keyboard movement reveals the focused node without a frame loop', async ({
  page,
}) => {
  await mountGraph(page, { selected: true })
  const alpha = page.locator('.flow-node[data-node-id="a"]')
  await page.evaluate(() =>
    globalThis.flowController?.updateViewport({ x: -250, y: 0, zoom: 1 })
  )
  await alpha.focus()
  await page.keyboard.press('ArrowRight')
  await expect(alpha).toBeFocused()
  await expect
    .poll(() => readViewportX(page))
    .not.toBe('-250')
  const afterMove = await page.locator('.flow-viewport').getAttribute('data-x')
  await page.waitForTimeout(80)
  await expect(page.locator('.flow-viewport')).toHaveAttribute(
    'data-x',
    afterMove ?? '0'
  )
})

test('controlled keyboard movement waits for document acknowledgement', async ({
  page,
}) => {
  await mountGraph(page, { documentMode: 'controlled', selected: true })
  const alpha = page.locator('.flow-node[data-node-id="a"]')
  const beta = page.locator('.flow-node[data-node-id="b"]')

  await alpha.focus()
  await expect(alpha).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: 'node-positions',
      positions: [
        { nodeId: 'a', position: { x: 105, y: 180 } },
        { nodeId: 'b', position: { x: 355, y: 180 } },
      ],
    })
  await expect(alpha).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 100, 180)')
  await expect(beta).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 350, 180)')

  await page.evaluate(() =>
    globalThis.flowController?.update({
      nodes: [
        {
          id: 'a',
          label: 'Alpha',
          position: { x: 105, y: 180 },
          selected: true,
        },
        {
          id: 'b',
          label: 'Beta',
          position: { x: 355, y: 180 },
          selected: true,
        },
        { id: 'c', label: 'Gamma', position: { x: 650, y: 180 } },
      ],
      edges: [],
    })
  )
  await expect(alpha).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 105, 180)')
  await expect(beta).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 355, 180)')
})

test('dragging one selected node moves the selected group', async ({
  page,
}) => {
  await mountGraph(page, { selected: true })
  const alpha = page.locator('.flow-node[data-node-id="a"]')
  const beta = page.locator('.flow-node[data-node-id="b"]')
  const box = await alpha.boundingBox()

  if (box === null) {
    throw new Error('Missing node bounds')
  }

  await page.mouse.move(box.x + 40, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(box.x + 100, box.y + 60)
  await expect(alpha).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 160, 220)')
  await expect(beta).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 410, 220)')
  await page.mouse.up()

  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: 'node-positions',
      positions: [
        { nodeId: 'a', position: { x: 160, y: 220 } },
        { nodeId: 'b', position: { x: 410, y: 220 } },
      ],
    })
  await expect(page.locator('.flow-node[data-node-id="c"]')).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 650, 180)'
  )
})

test('partial rectangle selects a node with positive overlap', async ({
  page,
}) => {
  await mountGraph(page, { selectionMode: 'partial' })
  const alpha = page.locator('.flow-node[data-node-id="a"]')

  await page.keyboard.down('Shift')
  await page.mouse.move(85, 165)
  await page.mouse.down()
  await page.mouse.move(115, 195)
  await expect(page.getByTestId('flow-selection-rect')).toBeVisible()
  await page.mouse.up()
  await page.keyboard.up('Shift')

  await expect(alpha).toHaveClass(/selected/u)
  await expect(page.locator('.flow-node[data-node-id="b"]')).not.toHaveClass(
    /selected/u
  )
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({ kind: 'selection-set', nodeIds: ['a'], edgeIds: [] })
})

test('selection near the pane edge pans until released', async ({ page }) => {
  await mountGraph(page)
  const canvas = page.getByTestId('flow-canvas')
  const box = await canvas.boundingBox()

  if (box === null) {
    throw new Error('Missing canvas bounds')
  }

  await page.keyboard.down('Shift')
  await page.mouse.move(box.x + 450, box.y + 120)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width - 8, box.y + 250)
  await expect
    .poll(() =>
      page
        .getByTestId('flow-viewport')
        .evaluate(
          (element) =>
            new DOMMatrixReadOnly(getComputedStyle(element).transform).m41
        )
    )
    .toBeLessThan(-15)
  await page.mouse.up()
  await page.keyboard.up('Shift')

  await expect
    .poll(() =>
      page.evaluate(() =>
        globalThis.flowChanges?.some(
          (change) => change.kind === 'viewport' && change.viewport.x < -15
        )
      )
    )
    .toBe(true)
})

test('real touch pan and pinch publish viewport changes', async ({ page }) => {
  await mountGraph(page)
  const session = await page.context().newCDPSession(page)

  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [touch(520, 100)],
  })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [touch(550, 100)],
  })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toMatchObject({ kind: 'viewport', viewport: { x: 30, zoom: 1 } })

  await page.evaluate(() => {
    globalThis.flowChanges = []
    globalThis.flowController?.updateViewport({ x: 0, y: 0, zoom: 1 })
  })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [touch(400, 100)],
  })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [touch(400, 100), touch(600, 100)],
  })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [touch(350, 100), touch(650, 100)],
  })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [touch(650, 100)],
  })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })

  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toMatchObject({ kind: 'viewport', viewport: { x: -250, zoom: 1.5 } })
})
