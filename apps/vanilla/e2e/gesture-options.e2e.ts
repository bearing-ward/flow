import type * as CoreModule from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

type Scenario = 'threshold' | 'snap' | 'extent' | 'connection'

const mountScenario = async (page: Page, scenario: Scenario): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async (kind) => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = globalThis.document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    const controller = mountFlow(
      root,
      {
        nodes:
          kind === 'connection'
            ? [
                {
                  id: 'source',
                  label: 'Source',
                  position: { x: 120, y: 270 },
                  handles: [{ id: 'out', kind: 'source', side: 'right' }],
                },
                {
                  id: 'target',
                  label: 'Target',
                  position: { x: 1250, y: 270 },
                  handles: [{ id: 'in', kind: 'target', side: 'left' }],
                },
              ]
            : [
                {
                  id: 'a',
                  label: 'Alpha',
                  position: { x: kind === 'snap' ? 103 : 120, y: 180 },
                  selected: kind === 'snap',
                },
                {
                  id: 'b',
                  label: 'Beta',
                  position: { x: kind === 'snap' ? 307 : 360, y: 180 },
                  selected: kind === 'snap',
                },
              ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        nodeDragThreshold: kind === 'threshold' ? 8 : undefined,
        snapGrid: kind === 'snap' ? { x: 10, y: 20 } : undefined,
        connectOnClick: kind === 'connection',
        autoPanOnConnect: kind === 'connection',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
          extent:
            kind === 'extent'
              ? { minX: 0, minY: 0, maxX: 1200, maxY: 900 }
              : undefined,
        },
      }
    )

    globalThis.flowChanges = []
    controller.subscribe((change: CoreModule.FlowChange) =>
      globalThis.flowChanges?.push(change)
    )
    globalThis.flowController = controller
  }, scenario)
  await page.waitForFunction(() =>
    globalThis.flowController?.nodesInitialized()
  )
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

const drag = async (page: Page, from: string, to: string): Promise<void> => {
  const start = await centerOf(page, from)
  const end = await centerOf(page, to)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 4 })
  await page.mouse.up()
}

const viewport = (page: Page) =>
  page.getByTestId('flow-viewport').evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(
      globalThis.getComputedStyle(element).transform
    )

    return { x: matrix.m41, y: matrix.m42, zoom: matrix.a }
  })

test('node drag threshold keeps clicks and subthreshold movement semantic', async ({
  page,
}) => {
  await mountScenario(page, 'threshold')
  const node = page.locator('.flow-node[data-node-id="a"]')
  const start = await centerOf(page, '.flow-node[data-node-id="a"]')

  await page.mouse.click(start.x, start.y)
  await expect(node).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toStrictEqual([{ kind: 'node-selection', nodeId: 'a', selected: true }])

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 8, start.y)
  await page.mouse.up()
  await expect(node).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 120, 180)')
  expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(1)

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 9, start.y)
  await page.mouse.up()
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: 'node-position',
      nodeId: 'a',
      position: { x: 129, y: 180 },
    })
})

test('nested native controls and no-drag markers keep pointer key and wheel ownership', async ({
  page,
}) => {
  await mountScenario(page, 'threshold')

  const controls = await page.evaluate(() => {
    const content = document.querySelector<HTMLElement>(
      '.flow-node[data-node-id="a"] .flow-node-content'
    )

    if (content === null) {
      throw new Error('Missing node content')
    }

    const elements: HTMLElement[] = [
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('select'),
      document.createElement('div'),
      document.createElement('button'),
      document.createElement('a'),
    ]

    if (elements[3] !== undefined) {
      elements[3].contentEditable = 'true'
    }

    if (elements[5] instanceof HTMLAnchorElement) {
      elements[5].href = '#native-control'
    }

    for (const [index, element] of elements.entries()) {
      element.dataset.testid = `input-owner-${index}`
      element.style.cssText =
        'position:relative;display:inline-block;width:20px;height:20px;margin:2px'
      content.append(element)
    }

    return elements.slice(0, 6).map((_, index) => `input-owner-${index}`)
  })

  /* eslint-disable no-await-in-loop -- Pointer ownership must be exercised serially on the same mounted node. */
  for (const testId of controls) {
    const control = page.getByTestId(testId)
    const bounds = await control.boundingBox()

    if (bounds === null) {
      throw new Error(`Missing bounds for ${testId}`)
    }

    const eventOwnership = await control.evaluate((element) => {
      element.focus()

      const key = element.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'ArrowRight',
        })
      )

      const wheel = element.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: 80,
        })
      )

      return { keyNotPrevented: key, wheelNotPrevented: wheel }
    })

    expect(eventOwnership).toEqual({
      keyNotPrevented: true,
      wheelNotPrevented: true,
    })

    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      bounds.x + bounds.width + 40,
      bounds.y + bounds.height / 2
    )
    await page.mouse.up()
    await expect(page.locator('.flow-node[data-node-id="a"]')).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 120, 180)'
    )
  }
  /* eslint-enable no-await-in-loop */
})

test('canvas activation options disable or redirect pointer and viewport inputs', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    const moveEvents: string[] = []

    const recordMove = (kind: string): void => {
      if (document.documentElement.dataset.moveEvents === 'reset') {
        moveEvents.length = 0
      }

      moveEvents.push(kind)
      document.documentElement.dataset.moveEvents = JSON.stringify(moveEvents)
    }

    const controller = mountFlow(
      root,
      {
        nodes: [
          { id: 'a', label: 'A', position: { x: 80, y: 80 }, selected: true },
          { id: 'b', label: 'B', position: { x: 300, y: 80 } },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        panOnDrag: false,
        selectionOnDrag: false,
        panOnScroll: true,
        panOnScrollSpeed: 2,
        panOnScrollMode: 'vertical',
        zoomOnScroll: false,
        zoomOnDoubleClick: false,
        keyboardActivation: false,
        onInit: () => {
          document.documentElement.dataset.flowInitialized = String(
            document.querySelector('[data-testid="flow-canvas"]') !== null
          )
        },
        onMoveStart: () => recordMove('start'),
        onMove: () => recordMove('change'),
        onMoveEnd: () => recordMove('end'),
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    globalThis.flowChanges = []
    controller.subscribe((change: CoreModule.FlowChange) =>
      globalThis.flowChanges?.push(change)
    )
    globalThis.flowController = controller
  })

  const canvas = page.getByTestId('flow-canvas')
  await expect(page.locator('html')).toHaveAttribute(
    'data-flow-initialized',
    'true'
  )
  const before = await viewport(page)
  await page.evaluate(() => {
    document.documentElement.dataset.moveEvents = 'reset'
  })
  await canvas.hover({ position: { x: 60, y: 60 } })
  await page.mouse.wheel(0, 120)
  await expect.poll(() => viewport(page)).not.toEqual(before)
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(document.documentElement.dataset.moveEvents ?? '[]')
      )
    )
    .toEqual(['start', 'change', 'end'])
  const afterPan = await viewport(page)
  expect(afterPan.zoom).toBe(before.zoom)
  expect(afterPan.x).toBe(before.x)
  expect(afterPan.y).not.toBe(before.y)

  await canvas.dblclick({ position: { x: 60, y: 60 } })
  expect(await viewport(page)).toEqual(afterPan)

  await page.mouse.move(550, 350)
  await page.mouse.down()
  await page.mouse.move(620, 410, { steps: 2 })
  await page.mouse.up()
  expect(await viewport(page)).toEqual(afterPan)

  await page.keyboard.down('Shift')
  await page.mouse.move(550, 350)
  await page.mouse.down()
  await page.mouse.move(620, 410, { steps: 2 })
  await page.mouse.up()
  await page.keyboard.up('Shift')
  expect(await page.getByTestId('flow-selection-rect').count()).toBe(0)

  const node = page.locator('.flow-node[data-node-id="a"]')
  const nodeStart = await centerOf(page, '.flow-node[data-node-id="a"]')
  await canvas.focus()
  await page.keyboard.press('ArrowRight')
  await expect(node).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 80, 80)')

  await page.mouse.move(nodeStart.x, nodeStart.y)
  await page.mouse.down()
  await page.mouse.move(nodeStart.x + 80, nodeStart.y + 60, { steps: 3 })
  await page.mouse.up()
  expect(await page.getByTestId('flow-selection-rect').count()).toBe(0)
  expect(await viewport(page)).toEqual(afterPan)
})

test('standard no-pan no-drag and no-wheel classes preserve input ownership', async ({
  page,
}) => {
  await mountScenario(page, 'threshold')
  await page.evaluate(() => {
    const content = document.querySelector<HTMLElement>(
      '[data-node-id="a"] .flow-node-content'
    )

    const canvas = document.querySelector<HTMLElement>(
      '[data-testid="flow-canvas"]'
    )

    if (content === null || canvas === null) {
      throw new Error('Missing node content or canvas')
    }

    const markers = ['.nodrag', '.nopan', '.nowheel']

    for (const selector of markers) {
      const marker = document.createElement('button')
      marker.className = selector.slice(1)
      marker.textContent = selector
      marker.style.cssText =
        'position:absolute;left:4px;bottom:4px;width:40px;height:24px'
      content.append(marker)
    }

    const noPan = document.createElement('button')
    noPan.className = 'nopan'
    noPan.textContent = 'No pan'
    noPan.style.cssText =
      'position:absolute;left:12px;top:12px;width:52px;height:24px;z-index:5'
    canvas.append(noPan)
  })

  const beforeNoPan = await viewport(page)
  const noPanStart = await centerOf(page, '.flow-canvas > .nopan')
  await page.mouse.move(noPanStart.x, noPanStart.y)
  await page.mouse.down()
  await page.mouse.move(noPanStart.x + 40, noPanStart.y + 30, { steps: 2 })
  await page.mouse.up()
  expect(await viewport(page)).toEqual(beforeNoPan)

  const noDrag = page.locator('.nodrag')
  const noDragStart = await centerOf(page, '.nodrag')
  await page.mouse.move(noDragStart.x, noDragStart.y)
  await page.mouse.down()
  await page.mouse.move(noDragStart.x + 40, noDragStart.y, { steps: 2 })
  await page.mouse.up()
  await expect(page.locator('.flow-node[data-node-id="a"]')).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 120, 180)'
  )
  await expect(noDrag).toBeVisible()

  const before = await viewport(page)
  const wheelPosition = await centerOf(page, '.nowheel')
  await page.mouse.move(wheelPosition.x, wheelPosition.y)
  await page.mouse.wheel(0, 120)
  await expect.poll(() => viewport(page)).toEqual(before)
})

test('node drag lifecycle callbacks report activation, preview, and one proposal terminal', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    const events: { phase: string; nodeIds: readonly string[] }[] = []

    const record = (phase: string, nodeIds: readonly string[]): void => {
      events.push({ phase, nodeIds })
      document.documentElement.dataset.nodeDragEvents = JSON.stringify(events)
    }

    mountFlow(
      root,
      {
        nodes: [
          { id: 'dragged', label: 'Dragged', position: { x: 100, y: 120 } },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        onNodeDragStart: ({
          nodeIds,
        }: {
          readonly nodeIds: readonly string[]
        }) => record('start', nodeIds),
        onNodeDrag: ({ nodeIds }: { readonly nodeIds: readonly string[] }) =>
          record('move', nodeIds),
        onNodeDragStop: ({
          nodeIds,
          outcome,
        }: {
          readonly nodeIds: readonly string[]
          readonly outcome: 'proposed' | 'cancelled'
        }) => record(`stop:${outcome}`, nodeIds),
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )
  })

  const start = await centerOf(page, '[data-node-id="dragged"]')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 120, start.y + 60, { steps: 4 })
  await page.mouse.up()

  const events = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.nodeDragEvents ?? '[]')
  )

  expect(events[0]).toEqual({ phase: 'start', nodeIds: ['dragged'] })

  expect(events.at(-1)).toEqual({
    phase: 'stop:proposed',
    nodeIds: ['dragged'],
  })
  expect(
    events.filter(({ phase }: { phase: string }) => phase === 'start')
  ).toHaveLength(1)
  expect(
    events.filter(({ phase }: { phase: string }) => phase === 'move').length
  ).toBeGreaterThan(0)
  expect(
    events.filter(({ phase }: { phase: string }) => phase.startsWith('stop:'))
  ).toHaveLength(1)
})

const runConnectionCallbackScenario = async (
  page: Page,
  input: 'pointer-connect' | 'click-connect'
): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    const events: string[] = []

    const record = (event: string): void => {
      events.push(event)
      document.documentElement.dataset.connectEvents = JSON.stringify(events)
    }

    mountFlow(
      root,
      {
        nodes: [
          {
            id: 'source',
            label: 'Source',
            position: { x: 100, y: 140 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            id: 'target',
            label: 'Target',
            position: { x: 360, y: 140 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        connectOnClick: true,
        onConnectStart: ({ inputKind: kind }: { readonly inputKind: string }) =>
          record(`start:${kind}`),
        onConnect: () => record('proposal'),
        onConnectEnd: ({
          inputKind: kind,
          outcome,
        }: {
          readonly inputKind: string
          readonly outcome: string
        }) => record(`end:${kind}:${outcome}`),
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )
  })

  const clickConnect = () =>
    page.evaluate(() => {
      for (const selector of [
        '[data-node-id="source"] [data-handle-id="out"]',
        '[data-node-id="target"] [data-handle-id="in"]',
      ]) {
        document
          .querySelector(selector)
          ?.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true })
          )
      }
    })

  await (input === 'pointer-connect'
    ? drag(
        page,
        '[data-node-id="source"] [data-handle-id="out"]',
        '[data-node-id="target"] [data-handle-id="in"]'
      )
    : clickConnect())

  const events = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.connectEvents ?? '[]')
  )

  expect(events).toEqual([
    `start:${input}`,
    'proposal',
    `end:${input}:proposed`,
  ])
}

test('pointer and click connection lifecycles produce one proposal terminal', async ({
  page,
}) => {
  await runConnectionCallbackScenario(page, 'pointer-connect')
  await runConnectionCallbackScenario(page, 'click-connect')
})

test('click connection cancellation emits one terminal with its reason', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    const events: string[] = []

    const record = (event: string): void => {
      events.push(event)
      document.documentElement.dataset.connectEvents = JSON.stringify(events)
    }

    mountFlow(
      root,
      {
        nodes: [
          {
            id: 'source',
            label: 'Source',
            position: { x: 100, y: 140 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            id: 'target',
            label: 'Target',
            position: { x: 360, y: 140 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        connectOnClick: true,
        onConnectStart: ({ inputKind }: { readonly inputKind: string }) =>
          record(`start:${inputKind}`),
        onConnectEnd: ({
          inputKind,
          outcome,
          reason,
        }: {
          readonly inputKind: string
          readonly outcome: string
          readonly reason?: string
        }) => record(`end:${inputKind}:${outcome}:${reason}`),
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )
  })

  await page
    .locator('[data-node-id="source"] [data-handle-id="out"]')
    .evaluate((element) =>
      element.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    )
  await page.keyboard.press('Escape')

  const events = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.connectEvents ?? '[]')
  )

  expect(events).toEqual([
    'start:click-connect',
    'end:click-connect:cancelled:escape',
  ])
})

test('reconnection cancellation emits one terminal with its reason', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    const events: string[] = []

    const record = (event: string): void => {
      events.push(event)
      document.documentElement.dataset.reconnectEvents = JSON.stringify(events)
    }

    mountFlow(
      root,
      {
        nodes: [
          {
            id: 'source',
            label: 'Source',
            position: { x: 100, y: 140 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            id: 'original',
            label: 'Original',
            position: { x: 360, y: 140 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
          {
            id: 'replacement',
            label: 'Replacement',
            position: { x: 360, y: 340 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
        ],
        edges: [
          {
            id: 'edge',
            source: 'source',
            sourceHandle: 'out',
            target: 'original',
            targetHandle: 'in',
            selected: true,
          },
        ],
      },
      {
        documentMode: 'uncontrolled',
        onReconnectStart: ({
          edgeId,
          endpoint,
        }: {
          readonly edgeId: string
          readonly endpoint: string
        }) => record(`start:${edgeId}:${endpoint}`),
        onReconnectEnd: ({
          edgeId,
          endpoint,
          outcome,
          reason,
        }: {
          readonly edgeId: string
          readonly endpoint: string
          readonly outcome: string
          readonly reason?: string
        }) => record(`end:${edgeId}:${endpoint}:${outcome}:${reason}`),
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )
  })

  const anchor =
    '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="target"]'

  const target = '[data-node-id="replacement"] [data-handle-id="in"]'
  const anchorPoint = await centerOf(page, anchor)
  await page.mouse.move(anchorPoint.x, anchorPoint.y)
  await page.mouse.down()
  const targetPoint = await centerOf(page, target)
  await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 3 })
  await page.keyboard.press('Escape')
  await page.mouse.up()

  const events = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.reconnectEvents ?? '[]')
  )

  expect(events).toEqual([
    'start:edge:target',
    'end:edge:target:cancelled:escape',
  ])
})

test('rectangle selection lifecycle reports start progress and selected result once', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    const events: string[] = []

    const record = (event: string): void => {
      events.push(event)
      document.documentElement.dataset.selectionEvents = JSON.stringify(events)
    }

    mountFlow(
      root,
      {
        nodes: [
          { id: 'a', label: 'A', position: { x: 100, y: 120 } },
          { id: 'b', label: 'B', position: { x: 330, y: 120 } },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        selectionActivationModifier: 'alt',
        selectNodesOnDrag: true,
        onSelectionStart: () => record('start'),
        onSelectionDrag: () => record('progress'),
        onSelectionEnd: ({
          outcome,
          nodeIds,
        }: {
          readonly outcome: 'finished' | 'cancelled'
          readonly nodeIds: readonly string[]
        }) => record(`end:${outcome}:${nodeIds.join(',')}`),
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )
  })

  const canvas = page.getByTestId('flow-canvas')
  await page.keyboard.down('Alt')
  await canvas.hover({ position: { x: 80, y: 80 } })
  await page.mouse.down()
  await page.mouse.move(540, 230, { steps: 4 })
  await page.mouse.up()
  await page.keyboard.up('Alt')

  const events = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.selectionEvents ?? '[]')
  )

  expect(events[0]).toBe('start')
  expect(events.filter((event: string) => event === 'start')).toHaveLength(1)
  expect(
    events.filter((event: string) => event === 'progress').length
  ).toBeGreaterThan(0)
  expect(events.at(-1)).toBe('end:finished:a,b')
  expect(
    events.filter((event: string) => event.startsWith('end:')).length
  ).toBe(1)
})

test('rectangle selection cancellation emits one terminal with its reason', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    const events: string[] = []

    const record = (event: string): void => {
      events.push(event)
      document.documentElement.dataset.selectionEvents = JSON.stringify(events)
    }

    mountFlow(
      root,
      {
        nodes: [{ id: 'a', label: 'A', position: { x: 100, y: 120 } }],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        onSelectionStart: () => record('start'),
        onSelectionEnd: ({
          outcome,
          reason,
        }: {
          readonly outcome: string
          readonly reason?: string
        }) => record(`end:${outcome}:${reason}`),
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )
  })

  const canvas = page.getByTestId('flow-canvas')
  await canvas.focus()
  await page.keyboard.down('Shift')
  await canvas.hover({ position: { x: 80, y: 80 } })
  await page.mouse.down()
  await page.mouse.move(250, 240, { steps: 3 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await page.keyboard.up('Shift')

  const events = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.selectionEvents ?? '[]')
  )

  expect(events).toEqual(['start', 'end:cancelled:escape'])
})

test('snap grid applies to selected group drag and keyboard movement', async ({
  page,
}) => {
  await mountScenario(page, 'snap')
  const a = page.locator('.flow-node[data-node-id="a"]')
  const start = await centerOf(page, '.flow-node[data-node-id="a"]')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 17, start.y + 22)
  await page.mouse.up()

  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: 'node-positions',
      positions: [
        { nodeId: 'a', position: { x: 120, y: 200 } },
        { nodeId: 'b', position: { x: 324, y: 200 } },
      ],
    })
  await a.focus()
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: 'node-positions',
      positions: [
        { nodeId: 'a', position: { x: 130, y: 200 } },
        { nodeId: 'b', position: { x: 330, y: 200 } },
      ],
    })
})

test('pan extent constrains pointer pan and anchored wheel zoom', async ({
  page,
}) => {
  await mountScenario(page, 'extent')
  const canvas = page.getByTestId('flow-canvas')
  const box = await canvas.boundingBox()

  if (box === null) {
    throw new Error('Missing canvas bounds')
  }

  const { width, height } = box
  await page.mouse.move(700, 500)
  await page.mouse.down()
  await page.mouse.move(900, 590)
  await page.mouse.up()
  await expect.poll(() => viewport(page)).toStrictEqual({ x: 0, y: 0, zoom: 1 })

  await page.mouse.move(800, 500)
  await page.mouse.down()
  await page.mouse.move(100, 100)
  await page.mouse.up()
  await expect
    .poll(() => viewport(page))
    .toStrictEqual({
      x: width - 1200,
      y: height - 900,
      zoom: 1,
    })

  await page.mouse.move(820, 520)
  await page.mouse.wheel(0, -1000)
  await expect
    .poll(async () => {
      const current = await viewport(page)

      return current.zoom
    })
    .toBe(2)
  const zoomed = await viewport(page)
  expect(zoomed.x).toBeGreaterThanOrEqual(width - 2400)
  expect(zoomed.x).toBeLessThanOrEqual(0)
  expect(zoomed.y).toBeGreaterThanOrEqual(height - 1800)
  expect(zoomed.y).toBeLessThanOrEqual(0)
})

test('connection auto-pan reaches a distant target and commits an edge', async ({
  page,
}) => {
  await mountScenario(page, 'connection')

  const source = await centerOf(
    page,
    '[data-node-id="source"] [data-handle-id="out"]'
  )

  const canvas = await page.getByTestId('flow-canvas').boundingBox()

  if (canvas === null) {
    throw new Error('Missing canvas bounds')
  }

  await page.mouse.move(source.x, source.y)
  await page.mouse.down()
  // Cross the default one-pixel connection drag threshold.
  await page.mouse.move(source.x + 2, source.y)
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
  await page.mouse.move(canvas.x + canvas.width - 8, source.y)
  await expect
    .poll(async () => {
      const current = await viewport(page)

      return current.x
    })
    .toBeLessThan(-550)

  await page.mouse.move(canvas.x + canvas.width / 2, source.y)

  const target = await centerOf(
    page,
    '[data-node-id="target"] [data-handle-id="in"]'
  )

  expect(
    await page.evaluate(
      ({ x, y }) =>
        globalThis.document
          .elementFromPoint(x, y)
          ?.closest<HTMLElement>('.flow-handle')?.dataset.handleId,
      target
    )
  ).toBe('in')

  await page.mouse.move(target.x, target.y)
  await page.mouse.up()
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.flowChanges?.map((change) => change.kind))
    )
    .toContain('edge-add')
  const finalViewport = await viewport(page)
  expect(finalViewport.x).toBeLessThan(-550)
})

test('two-click connection exposes pending state and supports cancellation', async ({
  page,
}) => {
  await mountScenario(page, 'connection')
  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="target"] [data-handle-id="in"]')
  await source.click()
  await expect(source).toHaveClass(/connecting/u)
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(source).not.toHaveClass(/connecting/u)
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(0)

  await source.click()
  await source.click()
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  await source.click()
  await page.evaluate(() =>
    globalThis.flowController?.updateViewport({ x: -500, y: 0, zoom: 1 })
  )
  await target.click()
  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)?.kind))
    .toBe('edge-add')
})

test('pointer UI callbacks stay host-native and keyboard drag has one lifecycle', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow host')
    }

    const events: string[] = []

    const record =
      (name: string) => (payload: { nodeId?: string; edgeId?: string }) => {
        events.push(`${name}:${payload.nodeId ?? payload.edgeId ?? 'pane'}`)
        document.documentElement.dataset.uiEvents = JSON.stringify(events)
      }

    const recordKeyboard = (event: string): void => {
      events.push(event)
      document.documentElement.dataset.uiEvents = JSON.stringify(events)
    }

    mountFlow(
      root,
      {
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 100, y: 120 },
            selected: true,
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            id: 'b',
            label: 'B',
            position: { x: 400, y: 120 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
        ],
        edges: [
          {
            id: 'e',
            source: 'a',
            sourceHandle: 'out',
            target: 'b',
            targetHandle: 'in',
          },
        ],
      },
      {
        documentMode: 'uncontrolled',
        onNodeClick: record('node-click'),
        onNodeDoubleClick: record('node-double'),
        onNodeMouseEnter: record('node-enter'),
        onNodeMouseLeave: record('node-leave'),
        onNodeContextMenu: record('node-context'),
        onPaneClick: record('pane-click'),
        onEdgeClick: record('edge-click'),
        onNodeDragStart: () => recordKeyboard('keyboard-start'),
        onNodeDrag: () => recordKeyboard('keyboard-progress'),
        onNodeDragStop: ({ outcome }: { outcome: string }) =>
          recordKeyboard(`keyboard-end:${outcome}`),
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )
  })
  const node = page.locator('.flow-node[data-node-id="a"]')
  await expect(node).toBeVisible()
  await node.focus()
  await page.keyboard.press('ArrowRight')
  await node.hover()
  await node.click()
  await node.dblclick()
  await node.click({ button: 'right' })
  await page.locator('.flow-edge-group').dispatchEvent('click')
  await node.focus()
  await page.getByTestId('flow-canvas').click({ position: { x: 30, y: 30 } })

  const events = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.uiEvents ?? '[]')
  )

  expect(events).toContain('node-enter:a')
  expect(events).toContain('node-leave:a')
  expect(events).toContain('node-click:a')
  expect(events).toContain('node-context:a')
  expect(events).toContain('node-double:a')
  expect(events).toContain('edge-click:e')
  expect(events).toContain('pane-click:pane')
  expect(events).toContain('keyboard-start')
  expect(events).toContain('keyboard-progress')
  expect(events).toContain('keyboard-end:proposed')
})
