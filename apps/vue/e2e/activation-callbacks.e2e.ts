import { expect, test } from '@playwright/test'

import { conformanceFixtures } from '../../../packages/conformance/src/index.ts'
import { interactionLifecycleFixture } from '../../shared-e2e/interaction-lifecycle-contract.ts'

const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

if (fixture === undefined) {
  throw new Error('Missing Vue activation fixture')
}

// eslint-disable-next-line complexity -- exercises independent activation options against the mounted adapter.
test('Vue activation options and lifecycle callbacks run on FlowCanvas', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async (scenario) => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.mount(scenario)
  }, fixture)

  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.gestureEvents()))
    .toContain('init')

  await page.evaluate(() =>
    window.__flowVueTest?.setGestureOptions({
      panOnDrag: false,
      selectionOnDrag: true,
      panOnScroll: true,
      zoomOnScroll: false,
      zoomOnDoubleClick: false,
      panActivationKeyCode: 'Control',
      noPanClassName: 'test-no-pan',
      noDragClassName: 'test-no-drag',
      noWheelClassName: 'test-no-wheel',
    })
  )

  const canvas = page.getByTestId('flow-canvas')
  const canvasBounds = await canvas.boundingBox()

  if (canvasBounds === null) {
    throw new Error('Missing Vue canvas')
  }

  const initial = await page.evaluate(() => window.__flowVueTest?.viewport())
  await page.mouse.move(canvasBounds.x + 20, canvasBounds.y + 20)
  await page.mouse.down()
  await page.mouse.move(canvasBounds.x + 100, canvasBounds.y + 90, { steps: 4 })
  await expect(page.getByTestId('flow-selection-rect')).toBeVisible()
  await page.evaluate(() =>
    document
      .querySelector('[data-testid="flow-selection-rect"]')
      ?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      )
  )
  await page.mouse.up()

  const selectedViewport = await page.evaluate(() =>
    window.__flowVueTest?.viewport()
  )

  expect(selectedViewport).toEqual(initial)

  const eventsAfterSelection = await page.evaluate(() =>
    window.__flowVueTest?.gestureEvents()
  )

  expect(
    eventsAfterSelection?.filter((event) => event === 'selectionStart')
  ).toHaveLength(1)
  expect(
    eventsAfterSelection?.filter((event) => event.startsWith('selectionEnd:'))
  ).toHaveLength(1)
  expect(eventsAfterSelection).toContain('selectionProgress')
  expect(eventsAfterSelection).toContain('selectionDragStart')
  expect(eventsAfterSelection).toContain('selectionDrag')
  expect(
    eventsAfterSelection?.some((event) =>
      event.startsWith('selectionDragStop:')
    )
  ).toBe(true)
  expect(eventsAfterSelection).toContain('selectionChange')
  expect(eventsAfterSelection).toContain('selectionContextMenu')

  await page.evaluate(() =>
    window.__flowVueTest?.setGestureOptions({
      panOnDrag: true,
      selectionOnDrag: false,
      panOnScroll: true,
      zoomOnScroll: false,
      panActivationKeyCode: 'Control',
      noPanClassName: 'test-no-pan',
      noWheelClassName: 'test-no-wheel',
    })
  )
  await page.mouse.move(canvasBounds.x + 20, canvasBounds.y + 20)
  await page.mouse.down()
  await page.mouse.move(canvasBounds.x + 80, canvasBounds.y + 55, { steps: 3 })
  await page.mouse.up()
  expect(await page.evaluate(() => window.__flowVueTest?.viewport())).toEqual(
    initial
  )

  await page.keyboard.down('Control')
  await page.mouse.move(canvasBounds.x + 20, canvasBounds.y + 20)
  await page.mouse.down()
  await page.mouse.move(canvasBounds.x + 80, canvasBounds.y + 55, { steps: 3 })
  await page.mouse.up()
  await page.keyboard.up('Control')

  const pannedViewport = await page.evaluate(() =>
    window.__flowVueTest?.viewport()
  )

  expect(pannedViewport?.x).not.toBe(initial?.x)
  expect(pannedViewport?.y).not.toBe(initial?.y)

  await page.evaluate(() => {
    const canvasElement = document.querySelector('[data-testid="flow-canvas"]')
    const marker = document.createElement('div')
    marker.className = 'test-no-pan'
    marker.style.cssText =
      'position:absolute;left:160px;top:80px;width:60px;height:40px;z-index:10'
    canvasElement?.append(marker)
  })
  const noPanBounds = await page.locator('.test-no-pan').boundingBox()

  if (noPanBounds === null) {
    throw new Error('Missing no-pan marker')
  }

  await page.mouse.move(noPanBounds.x + 10, noPanBounds.y + 10)
  await page.keyboard.down('Control')
  await page.mouse.down()
  await page.mouse.move(noPanBounds.x + 50, noPanBounds.y + 30, { steps: 3 })
  await page.mouse.up()
  await page.keyboard.up('Control')
  expect(await page.evaluate(() => window.__flowVueTest?.viewport())).toEqual(
    pannedViewport
  )

  await page.mouse.move(canvasBounds.x + 180, canvasBounds.y + 150)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, 100)
  await page.keyboard.up('Control')

  const wheelPannedViewport = await page.evaluate(() =>
    window.__flowVueTest?.viewport()
  )

  expect(wheelPannedViewport?.y).toBeLessThan(pannedViewport?.y ?? 0)
  expect(wheelPannedViewport?.zoom).toBe(pannedViewport?.zoom)

  await page.evaluate(() =>
    window.__flowVueTest?.setGestureOptions({
      panOnScroll: true,
      panOnScrollSpeed: 2,
      panOnScrollMode: 'vertical',
      zoomOnScroll: false,
      panActivationKeyCode: 'Control',
      noWheelClassName: 'test-no-wheel',
    })
  )
  await page.keyboard.down('Control')
  await page.mouse.wheel(100, 100)
  await page.keyboard.up('Control')

  const speedModeViewport = await page.evaluate(() =>
    window.__flowVueTest?.viewport()
  )

  expect(speedModeViewport?.x).toBe(wheelPannedViewport?.x)
  expect(speedModeViewport?.y).toBe((wheelPannedViewport?.y ?? 0) - 200)

  await page.evaluate(() => {
    const canvasElement = document.querySelector('[data-testid="flow-canvas"]')
    const marker = document.createElement('div')
    marker.className = 'test-no-wheel'
    marker.style.cssText =
      'position:absolute;left:160px;top:130px;width:60px;height:50px;z-index:10'
    canvasElement?.append(marker)
  })
  const excludedBounds = await page.locator('.test-no-wheel').boundingBox()

  if (excludedBounds === null) {
    throw new Error('Missing no-wheel marker')
  }

  await page.mouse.move(excludedBounds.x + 10, excludedBounds.y + 10)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, 100)
  await page.keyboard.up('Control')
  expect(await page.evaluate(() => window.__flowVueTest?.viewport())).toEqual(
    speedModeViewport
  )

  await page.evaluate(() =>
    window.__flowVueTest?.setGestureOptions({
      zoomOnScroll: true,
      panOnScroll: false,
      zoomOnDoubleClick: true,
      noWheelClassName: 'test-no-wheel',
    })
  )
  await page.mouse.move(canvasBounds.x + 500, canvasBounds.y + 300)
  await page.mouse.wheel(0, 100)

  const zoomedByWheel = await page.evaluate(() =>
    window.__flowVueTest?.viewport()
  )

  expect(zoomedByWheel?.zoom).not.toBe(wheelPannedViewport?.zoom)

  await page.mouse.dblclick(canvasBounds.x + 500, canvasBounds.y + 300)

  const zoomedByDoubleClick = await page.evaluate(() =>
    window.__flowVueTest?.viewport()
  )

  expect(zoomedByDoubleClick?.zoom).not.toBe(zoomedByWheel?.zoom)
})

// eslint-disable-next-line complexity -- checks terminal ordering under both document control modes.
test('Vue drag and selection terminals follow proposal and adoption events', async ({
  page,
}) => {
  /* eslint-disable no-await-in-loop */
  for (const documentMode of ['controlled', 'uncontrolled'] as const) {
    await page.goto('/test.html')
    await page.evaluate(
      async ({ scenario, mode }) => {
        const harnessPath = '/src/test-harness.ts'
        await import(harnessPath)
        window.__flowVueTest?.mount({ ...scenario, documentMode: mode })
        window.__flowVueTest?.setGestureOptions({
          panOnDrag: false,
          selectionOnDrag: true,
          selectNodesOnDrag: false,
        })
      },
      { scenario: fixture, mode: documentMode }
    )

    const canvas = page.getByTestId('flow-canvas')
    const canvasBounds = await canvas.boundingBox()

    if (canvasBounds === null) {
      throw new Error('Missing Vue canvas')
    }

    await page.mouse.move(canvasBounds.x + 20, canvasBounds.y + 20)
    await page.mouse.down()
    await page.mouse.move(canvasBounds.x + 100, canvasBounds.y + 90, {
      steps: 4,
    })
    await page.mouse.up()

    const selectionTimeline = await page.evaluate(() =>
      window.__flowVueTest?.gestureEvents()
    )

    const selectionChangeIndex =
      selectionTimeline?.lastIndexOf('change:selection-set') ?? -1

    const selectionTerminal =
      documentMode === 'controlled'
        ? 'selectionEnd:proposed'
        : 'selectionEnd:accepted'

    const selectionTerminalIndex =
      selectionTimeline?.lastIndexOf(selectionTerminal) ?? -1

    expect(selectionChangeIndex).toBeGreaterThanOrEqual(0)
    expect(selectionTerminalIndex).toBeGreaterThan(selectionChangeIndex)

    if (documentMode === 'uncontrolled') {
      const selectionAdoptionIndex =
        selectionTimeline?.lastIndexOf('accepted:semantic-change') ?? -1

      expect(selectionAdoptionIndex).toBeGreaterThan(selectionChangeIndex)
      expect(selectionTerminalIndex).toBeGreaterThan(selectionAdoptionIndex)
    }

    const node = page.locator('[data-node-id]').first()
    const nodeBounds = await node.boundingBox()

    if (nodeBounds === null) {
      throw new Error('Missing Vue node')
    }

    await page.mouse.move(nodeBounds.x + 20, nodeBounds.y + 20)
    await page.mouse.down()
    await page.mouse.move(nodeBounds.x + 80, nodeBounds.y + 60, { steps: 4 })
    await page.mouse.up()

    const dragTimeline = await page.evaluate(() =>
      window.__flowVueTest?.gestureEvents()
    )

    const dragChangeIndex =
      dragTimeline?.lastIndexOf('change:node-position') ?? -1

    const dragTerminal =
      documentMode === 'controlled'
        ? 'nodeDragEnd:proposed'
        : 'nodeDragEnd:accepted'

    const dragTerminalIndex = dragTimeline?.lastIndexOf(dragTerminal) ?? -1

    expect(dragChangeIndex).toBeGreaterThanOrEqual(0)
    expect(dragTerminalIndex).toBeGreaterThan(dragChangeIndex)

    if (documentMode === 'uncontrolled') {
      const dragAdoptionIndex =
        dragTimeline?.lastIndexOf('accepted:semantic-change') ?? -1

      expect(dragAdoptionIndex).toBeGreaterThan(dragChangeIndex)
      expect(dragTerminalIndex).toBeGreaterThan(dragAdoptionIndex)
    }
  }
  /* eslint-enable no-await-in-loop */
})

test('Vue keyboard selection terminal follows uncontrolled state adoption', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async (scenario) => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.mount({ ...scenario, documentMode: 'uncontrolled' })
    window.__flowVueTest?.setSelectionMode('partial')
  }, fixture)

  const node = page.locator('[data-node-id]').first()
  await node.focus()
  await page.keyboard.press('Shift+Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')

  const timeline = await page.evaluate(() =>
    window.__flowVueTest?.gestureEvents()
  )

  const change = timeline?.lastIndexOf('change:selection-set') ?? -1

  const adoption = timeline?.lastIndexOf('accepted:semantic-change') ?? -1

  const terminal = timeline?.lastIndexOf('selectionEnd:accepted') ?? -1

  expect(change).toBeGreaterThanOrEqual(0)
  expect(adoption).toBeGreaterThan(change)
  expect(terminal).toBeGreaterThan(adoption)
})

test('Vue node drag lifecycle emits one terminal callback after cleanup', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async (scenario) => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.mount(scenario)
  }, fixture)
  await page.evaluate(() =>
    window.__flowVueTest?.setGestureOptions({
      noDragClassName: 'test-no-drag',
      selectNodesOnDrag: true,
    })
  )

  const node = page.locator('[data-node-id]').first()
  const bounds = await node.boundingBox()

  if (bounds === null) {
    throw new Error('Missing Vue node')
  }

  await page.mouse.move(bounds.x + 20, bounds.y + 20)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 80, bounds.y + 60, { steps: 4 })
  await page.mouse.up()

  const events = await page.evaluate(() =>
    window.__flowVueTest?.gestureEvents()
  )

  expect(events?.filter((event) => event === 'nodeDragStart')).toHaveLength(1)
  expect(
    events?.filter((event) => event === 'nodeDragEnd:proposed')
  ).toHaveLength(1)
  expect(
    events?.filter((event) => event === 'nodeDragStop:proposed')
  ).toHaveLength(1)
  expect(
    events?.filter((event) => event === 'nodeDragEnd:cancelled')
  ).toHaveLength(0)
  expect(events).toContain('nodeDrag')
  expect(events).toContain('change:selection-set')

  await page.evaluate(() => {
    const nodeElement = document.querySelector('[data-node-id]')
    const marker = document.createElement('span')
    marker.className = 'test-no-drag'
    marker.style.cssText =
      'position:absolute;left:2px;top:2px;width:20px;height:20px'
    nodeElement?.append(marker)
  })
  const markerBounds = await page.locator('.test-no-drag').boundingBox()

  if (markerBounds === null) {
    throw new Error('Missing no-drag marker')
  }

  await page.mouse.move(markerBounds.x + 5, markerBounds.y + 5)
  await page.mouse.down()
  await page.mouse.move(markerBounds.x + 35, markerBounds.y + 25, { steps: 3 })
  await page.mouse.up()

  const eventsAfterExcludedDrag = await page.evaluate(() =>
    window.__flowVueTest?.gestureEvents()
  )

  expect(
    eventsAfterExcludedDrag?.filter((event) => event === 'nodeDragStart')
  ).toHaveLength(1)
})

test('Vue reports one recoverable validator boundary failure and ends rejected', async ({
  page,
}) => {
  const connectionFixture = conformanceFixtures.find(
    ({ id }) => id === 'connection-validity'
  )

  if (connectionFixture === undefined) {
    throw new Error('Missing Vue connection fixture')
  }

  await page.goto('/test.html')
  await page.evaluate(async (scenario) => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.mount(scenario)
    window.__flowVueTest?.setConnectionValidatorThrows(true)
  }, connectionFixture)

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="approved"] [data-handle-id="in"]')
  const sourceBounds = await source.boundingBox()
  const targetBounds = await target.boundingBox()

  if (sourceBounds === null || targetBounds === null) {
    throw new Error('Missing Vue connection handles')
  }

  await page.mouse.move(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y + targetBounds.height / 2,
    { steps: 4 }
  )
  await page.mouse.up()

  const events = await page.evaluate(() =>
    window.__flowVueTest?.gestureEvents()
  )

  expect(
    events?.filter((event) => event === 'error:connection-validator')
  ).toHaveLength(1)
  expect(
    events?.filter((event) => event === 'connectEnd:rejected')
  ).toHaveLength(1)
  expect(
    events?.filter((event) => event === 'connectEnd:cancelled')
  ).toHaveLength(0)
})

test('Vue can disable click-activated connections', async ({ page }) => {
  const connectionFixture = conformanceFixtures.find(
    ({ id }) => id === 'connection-validity'
  )

  if (connectionFixture === undefined) {
    throw new Error('Missing Vue connection fixture')
  }

  await page.goto('/test.html')
  await page.evaluate(async (scenario) => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.mount(scenario)
    window.__flowVueTest?.setGestureOptions({ connectOnClick: false })
  }, connectionFixture)

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const sourceBounds = await source.boundingBox()

  if (sourceBounds === null) {
    throw new Error('Missing Vue source handle')
  }

  await page.mouse.click(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  )

  const events = await page.evaluate(() =>
    window.__flowVueTest?.gestureEvents()
  )

  expect(events).not.toContain('clickConnectStart')
  // Like xyflow's XYHandle, a press that never crosses the drag threshold
  // never starts a connection, so it reports no connection end either.
  expect(
    events?.filter((event) => event.startsWith('connectEnd'))
  ).toHaveLength(0)
})

test('Vue click-connect aliases bracket the published connection', async ({
  page,
}) => {
  const connectionFixture = conformanceFixtures.find(
    ({ id }) => id === 'connection-validity'
  )

  if (connectionFixture === undefined) {
    throw new Error('Missing Vue connection fixture')
  }

  await page.goto('/test.html')
  await page.evaluate(async (scenario) => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.mount({ ...scenario, documentMode: 'uncontrolled' })
    window.__flowVueTest?.setGestureOptions({ connectOnClick: true })
  }, connectionFixture)

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="approved"] [data-handle-id="in"]')
  const sourceBounds = await source.boundingBox()
  const targetBounds = await target.boundingBox()

  if (sourceBounds === null || targetBounds === null) {
    throw new Error('Missing Vue connection handles')
  }

  await page.mouse.click(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  )
  await page.mouse.click(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y + targetBounds.height / 2
  )

  const timeline = await page.evaluate(() =>
    window.__flowVueTest?.gestureEvents()
  )

  const clickStart = timeline?.indexOf('clickConnectStart') ?? -1
  const change = timeline?.indexOf('change:edge-add') ?? -1
  const adoption = timeline?.indexOf('accepted:semantic-change') ?? -1
  const clickEnd = timeline?.indexOf('clickConnectEnd:accepted') ?? -1

  expect(clickStart).toBeGreaterThanOrEqual(0)
  expect(change).toBeGreaterThan(clickStart)
  expect(adoption).toBeGreaterThan(change)
  expect(clickEnd).toBeGreaterThan(adoption)
})

test('Vue reconnect terminal follows change and uncontrolled adoption', async ({
  page,
}) => {
  const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (base === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const document = {
    ...interactionLifecycleFixture.reconnectDocument,
    edges: interactionLifecycleFixture.reconnectDocument.edges.map((edge) =>
      edge.id === 'edge-existing'
        ? { ...edge, selected: true, reconnectable: true }
        : edge
    ),
  }

  await page.goto('/test.html')
  await page.evaluate(
    async ({ scenario, reconnectDocument }) => {
      const harnessPath = '/src/test-harness.ts'
      await import(harnessPath)
      window.__flowVueTest?.mount({
        ...scenario,
        documentMode: 'uncontrolled',
        document: reconnectDocument,
      })
    },
    { scenario: base, reconnectDocument: document }
  )

  const anchor = page.locator(
    '[data-testid="flow-edge-reconnect-anchor"][data-edge-id="edge-existing"][data-endpoint="source"]'
  )

  const target = page.locator(
    '[data-node-id="source-next"] [data-handle-id="out-next"]'
  )

  const anchorBounds = await anchor.boundingBox()
  const targetBounds = await target.boundingBox()

  if (anchorBounds === null || targetBounds === null) {
    throw new Error('Missing Vue reconnect handles')
  }

  await page.mouse.move(
    anchorBounds.x + anchorBounds.width / 2,
    anchorBounds.y + anchorBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y + targetBounds.height / 2,
    { steps: 4 }
  )
  await page.mouse.up()

  const timeline = await page.evaluate(() =>
    window.__flowVueTest?.gestureEvents()
  )

  const change = timeline?.indexOf('change:edge-reconnect') ?? -1
  const adoption = timeline?.indexOf('accepted:semantic-change') ?? -1
  const terminal = timeline?.indexOf('reconnectEnd:accepted') ?? -1

  expect(change).toBeGreaterThanOrEqual(0)
  expect(adoption).toBeGreaterThan(change)
  expect(terminal).toBeGreaterThan(adoption)
})
