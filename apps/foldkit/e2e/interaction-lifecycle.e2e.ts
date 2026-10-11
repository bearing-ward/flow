import { defaultInteractionOptions } from '@flow/foldkit'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { conformanceFixtures } from '../../../packages/conformance/src/index.ts'
import {
  interactionCancellationRetryCases,
  interactionConnectionCases,
  interactionLifecycleFixture,
  interactionReconnectionCases,
} from '../../shared-e2e/interaction-lifecycle-contract.ts'
import { createFoldkitConformanceAdapter } from './conformance.ts'

const connectionFixture = conformanceFixtures.find(
  (fixture) => fixture.id === 'connection-validity'
)

const movementFixture = conformanceFixtures.find(
  (fixture) => fixture.id === 'controlled-acknowledgement'
)

if (connectionFixture === undefined || movementFixture === undefined) {
  throw new Error('Missing Foldkit interaction lifecycle fixtures')
}

test('Foldkit connection success and rejection settle once through the rendered host', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount(connectionFixture)

  const [rejected, accepted] = connectionFixture.actions

  if (rejected?.kind !== 'connect' || accepted?.kind !== 'connect') {
    throw new Error('Missing connection lifecycle fixture actions')
  }

  await adapter.perform(rejected)
  expect(await adapter.changeKinds()).toEqual([])
  const rejectedSnapshot = await adapter.snapshot()
  expect(rejectedSnapshot.edgeIds).toEqual([])

  await adapter.perform(accepted)
  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-add'])
  await expect
    .poll(() => adapter.snapshot().then(({ edgeIds }) => edgeIds))
    .toEqual(['edge-1'])

  const cleanup = await adapter.destroy()

  const lifecycle = await page.evaluate(
    () => window.__flowFoldkitTest?.interactionEvents() ?? []
  )

  expect(lifecycle.filter(({ name }) => name === 'onInit')).toHaveLength(1)
  expect(
    lifecycle
      .filter(({ name }) =>
        ['onConnectStart', 'onConnect', 'onConnectEnd'].includes(name)
      )
      .map(({ name, phase, outcome }) => `${name}:${phase}:${outcome ?? ''}`)
  ).toEqual([
    'onConnectStart:start:',
    'onConnectEnd:end:rejected',
    'onConnectStart:start:',
    'onConnect:proposal:accepted',
    'onConnectEnd:end:accepted',
  ])
  expect(
    lifecycle.find(
      ({ name, phase }) => name === 'onConnect' && phase === 'proposal'
    )
  ).toMatchObject({
    change: { kind: 'edge-add', edge: { id: 'edge-1' } },
  })
  expect(cleanup.mountedElements).toBe(0)
  expect(cleanup.changesAfterDestroy).toBe(0)
})

test('Foldkit Runtime connection creation applies default edge fields', async ({
  page,
}) => {
  const [, accepted] = connectionFixture.actions

  if (accepted?.kind !== 'connect') {
    throw new Error('Missing accepted connection action')
  }

  await page.goto('/test.html')
  await page.evaluate(
    async (fixture) => {
      const harnessPath = '/e2e/test-harness.ts'
      await import(harnessPath)
      await window.__flowFoldkitTest?.mount(fixture, 'full', {
        connectionMode: 'strict',
        connectionRadius: 20,
        autoPanOnConnect: true,
        defaultEdgeOptions: { label: 'Default connection', strokeWidth: 4 },
      })
    },
    { ...connectionFixture, actions: [] }
  )

  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.perform(accepted)
  const read = await adapter.readState({ edgeId: 'edge-1' })
  expect(read.edge).toMatchObject({
    id: 'edge-1',
    label: 'Default connection',
    strokeWidth: 4,
  })
})

test('Foldkit emits serializable pane and node mouse events from production markup', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({ ...connectionFixture, actions: [] })

  const node = page.locator('[data-node-id]').first()
  await node.hover()
  await node.click()
  await page.locator('.flow-foldkit-canvas').click({
    position: { x: 20, y: 20 },
  })

  const events = await page.evaluate(
    () => window.__flowFoldkitTest?.interactionEvents() ?? []
  )

  expect(events.map(({ name }) => name)).toContain('onNodeClick')
  expect(events.map(({ name }) => name)).toContain('onNodeMouseEnter')
  expect(events.map(({ name }) => name)).toContain('onPaneClick')

  await adapter.destroy()
})

test('Foldkit click connection can be disabled and selection context menu is observable', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  const fixture = { ...connectionFixture, actions: [] }

  const options = {
    ...defaultInteractionOptions,
    connectOnClick: false,
  }

  await page.goto('/test.html')
  await page.evaluate(
    async ({ fixture: testFixture, interactionOptions }) => {
      const harnessPath = '/e2e/test-harness.ts'
      await import(harnessPath)
      await window.__flowFoldkitTest?.mount(
        testFixture,
        'full',
        interactionOptions
      )
    },
    { fixture, interactionOptions: options }
  )

  await page.locator('[data-handle-id="out"]').click()
  await expect(page.locator('.flow-foldkit-connection-preview')).toHaveCount(0)

  await page.locator('[data-node-id="source"]').click({ button: 'right' })

  const events = await page.evaluate(
    () => window.__flowFoldkitTest?.interactionEvents() ?? []
  )

  expect(events.at(-1)).toMatchObject({
    name: 'onSelectionContextMenu',
    phase: 'event',
    nodeId: 'source',
  })

  await adapter.destroy()
})

test('Foldkit click connection reports click input kind when enabled', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({ ...connectionFixture, actions: [] })

  await page.locator('[data-handle-id="out"]').dispatchEvent('click')
  await page
    .locator('[data-node-id="approved"] [data-handle-id="in"]')
    .dispatchEvent('click')
  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-add'])

  const events = await page.evaluate(
    () => window.__flowFoldkitTest?.interactionEvents() ?? []
  )

  expect(events.find(({ name }) => name === 'onConnectStart')).toMatchObject({
    inputKind: 'click',
  })

  await adapter.destroy()
})

test('Foldkit rectangle selection emits one success and one cancellation terminal', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({ ...connectionFixture, actions: [] })

  const canvas = page.locator('[data-testid="flow-canvas"]')
  const bounds = await canvas.boundingBox()

  if (bounds === null) {
    throw new Error('Missing Foldkit canvas bounds')
  }

  const point = (x: number, y: number) => ({
    x: bounds.x + x,
    y: bounds.y + y,
  })

  await page.mouse.move(point(30, 70).x, point(30, 70).y)
  await page.mouse.down()

  await expect(page.locator('.flow-foldkit-selection-rect')).toBeVisible()
  await page.mouse.move(point(260, 210).x, point(260, 210).y)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__flowFoldkitTest
            ?.interactionEvents()
            .filter(({ name }) => name === 'onSelectionDrag').length ?? 0
      )
    )
    .toBeGreaterThan(0)
  await page.mouse.up()

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__flowFoldkitTest
            ?.interactionEvents()
            .filter(({ name }) => name === 'onSelectionEnd')
            .map(({ outcome }) => outcome) ?? []
      )
    )
    .toEqual(['accepted'])

  await page.mouse.move(point(800, 500).x, point(800, 500).y)
  await page.mouse.down()
  await expect(page.locator('.flow-foldkit-selection-rect')).toBeVisible()
  await page.mouse.move(point(850, 550).x, point(850, 550).y)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__flowFoldkitTest
            ?.interactionEvents()
            .filter(({ name }) => name === 'onSelectionDrag').length ?? 0
      )
    )
    .toBeGreaterThan(1)
  await page.keyboard.press('Escape')
  await page.mouse.up()

  const events = await page.evaluate(
    () => window.__flowFoldkitTest?.interactionEvents() ?? []
  )

  const terminals = events.filter(({ name }) => name === 'onSelectionEnd')

  expect(terminals).toHaveLength(2)
  expect(terminals.map(({ outcome }) => outcome)).toEqual([
    'accepted',
    'cancelled',
  ])
  expect(events.map(({ name }) => name)).toContain('onSelectionDrag')

  await adapter.destroy()
})

test('Foldkit viewport activation options pan and preserve move lifecycle ordering', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  const scenario = { ...connectionFixture, actions: [] }

  const interactionOptions = {
    ...defaultInteractionOptions,
    panOnDrag: true,
    panOnScroll: true,
    panOnScrollMode: 'vertical' as const,
    panOnScrollSpeed: 1.5,
    zoomOnScroll: false,
    zoomOnDoubleClick: true,
  }

  await page.goto('/test.html')
  await page.evaluate(
    async ({ fixture, options }) => {
      const harnessPath = '/e2e/test-harness.ts'
      await import(harnessPath)
      await window.__flowFoldkitTest?.mount(fixture, 'full', options)
    },
    { fixture: scenario, options: interactionOptions }
  )

  const viewport = page.locator('.flow-foldkit-viewport')
  const canvas = page.locator('.flow-foldkit-canvas')
  const canvasBox = await canvas.boundingBox()

  if (canvasBox === null) {
    throw new Error('Missing Foldkit canvas bounds')
  }

  const panStart = {
    x: canvasBox.x + canvasBox.width * 0.9,
    y: canvasBox.y + canvasBox.height * 0.9,
  }

  const before = await viewport.getAttribute('style')
  await page.mouse.move(panStart.x, panStart.y)
  await page.mouse.down()
  await page.mouse.move(panStart.x - 50, panStart.y - 50)
  await page.mouse.up()
  await expect.poll(() => viewport.getAttribute('style')).not.toBe(before)

  const beforePanWheel = await viewport.getAttribute('style')
  await page.mouse.move(panStart.x, panStart.y)
  await page.mouse.wheel(20, 120)
  await expect
    .poll(() => viewport.getAttribute('style'))
    .not.toBe(beforePanWheel)

  const events = await page.evaluate(
    () => window.__flowFoldkitTest?.interactionEvents() ?? []
  )

  const moveEvents = events.filter(({ name }) =>
    ['onMoveStart', 'onMove', 'onMoveEnd'].includes(name)
  )

  expect(moveEvents.map(({ name, phase }) => `${name}:${phase}`)).toContain(
    'onMoveStart:start'
  )
  expect(moveEvents.map(({ name, phase }) => `${name}:${phase}`)).toContain(
    'onMove:progress'
  )
  expect(moveEvents.map(({ name, phase }) => `${name}:${phase}`)).toContain(
    'onMoveEnd:end'
  )

  await page.mouse.move(500, 400)
  const beforeWheel = await viewport.getAttribute('style')
  await page.mouse.wheel(0, 120)
  await expect.poll(() => viewport.getAttribute('style')).not.toBe(beforeWheel)

  const beforeDoubleClick = await viewport.getAttribute('style')
  await page.mouse.dblclick(500, 400)
  await expect
    .poll(() => viewport.getAttribute('style'))
    .not.toBe(beforeDoubleClick)
  await adapter.destroy()
})

test('Foldkit selection, keyboard activation, and noWheel markers are configurable', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  const scenario = { ...connectionFixture, actions: [] }

  const interactionOptions = {
    ...defaultInteractionOptions,
    selectionOnDrag: false,
    keyboardActivation: false,
    panOnScroll: true,
  }

  await page.goto('/test.html')
  await page.evaluate(
    async ({ fixture, options }) => {
      const harnessPath = '/e2e/test-harness.ts'
      await import(harnessPath)
      await window.__flowFoldkitTest?.mount(fixture, 'full', options)
    },
    { fixture: scenario, options: interactionOptions }
  )

  const canvas = page.locator('.flow-foldkit-canvas')
  const viewport = page.locator('.flow-foldkit-viewport')
  const before = await viewport.getAttribute('style')
  await page.mouse.move(900, 600)
  await page.mouse.down()
  await page.mouse.move(850, 550)
  await page.mouse.up()
  await expect.poll(() => viewport.getAttribute('style')).toBe(before)
  await expect(page.locator('.flow-foldkit-selection-rect')).toHaveCount(0)

  await page.evaluate(() => {
    const targetCanvas = document.querySelector<HTMLElement>(
      '.flow-foldkit-canvas'
    )

    if (targetCanvas === null) {
      throw new Error('Missing Foldkit canvas')
    }

    const marker = document.createElement('div')
    marker.className = 'flow-foldkit-nowheel'
    marker.style.position = 'absolute'
    marker.style.inset = '300px auto auto 400px'
    marker.style.width = '100px'
    marker.style.height = '100px'
    marker.style.zIndex = '9999'
    targetCanvas.append(marker)
  })
  const marker = page.locator('.flow-foldkit-nowheel')
  const markerBox = await marker.boundingBox()

  if (markerBox === null) {
    throw new Error('Missing noWheel marker bounds')
  }

  const beforeWheel = await viewport.getAttribute('style')
  await page.mouse.move(markerBox.x + 10, markerBox.y + 10)
  await page.mouse.wheel(0, 120)
  await expect.poll(() => viewport.getAttribute('style')).toBe(beforeWheel)

  const sourceHandle = canvas.locator('[data-handle-id]').first()
  await sourceHandle.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.flow-foldkit-connection-preview')).toHaveCount(0)
  await adapter.destroy()
})

test('Foldkit completes a synthetic touch connection through production handles', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({ ...connectionFixture, actions: [] })

  const [, accepted] = connectionFixture.actions

  if (accepted?.kind !== 'connect') {
    throw new Error('Missing accepted shared connection fixture case')
  }

  const source = page.locator(
    `[data-node-id="${accepted.sourceNodeId}"] [data-handle-id="${accepted.sourceHandleId}"]`
  )

  const target = page.locator(
    `[data-node-id="${accepted.targetNodeId}"] [data-handle-id="${accepted.targetHandleId}"]`
  )

  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()

  if (sourceBox === null || targetBox === null) {
    throw new Error('Missing Foldkit touch connection handles')
  }

  await source.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 301,
    pointerType: 'touch',
    clientX: sourceBox.x + sourceBox.width / 2,
    clientY: sourceBox.y + sourceBox.height / 2,
  })
  await page.evaluate(
    ({ x, y }) =>
      document.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 301,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
        })
      ),
    {
      x: targetBox.x + targetBox.width / 2,
      y: targetBox.y + targetBox.height / 2,
    }
  )

  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-add'])
  await expect
    .poll(() => adapter.snapshot().then(({ edgeIds }) => edgeIds))
    .toEqual(['edge-1'])
  await adapter.destroy()
})

test('Foldkit production preview renderer updates, proposes, and cleans up', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = {
    ...connectionFixture,
    documentMode: 'controlled' as const,
    actions: [],
  }

  await adapter.mount(fixture)

  await page.evaluate(
    (scenario) =>
      window.__flowFoldkitTest?.mount(scenario, 'full', undefined, true),
    fixture
  )
  expect(
    await page.evaluate(() => window.__flowFoldkitTest?.readConnectionPreview())
  ).toBeNull()

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')

  const target = page.locator('[data-node-id="approved"] [data-handle-id="in"]')

  const sourceBox = await source.boundingBox()

  const targetBox = await target.boundingBox()
  const canvasBox = await page.locator('.flow-foldkit-canvas').boundingBox()

  if (sourceBox === null || targetBox === null || canvasBox === null) {
    throw new Error('Missing Foldkit preview handles')
  }

  const start = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  }

  const end = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2,
  }

  await source.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 401,
    clientX: start.x,
    clientY: start.y,
  })
  await page.evaluate(
    ({ point, pointerId }) =>
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId,
          clientX: point.x,
          clientY: point.y,
        })
      ),
    { point: end, pointerId: 401 }
  )

  const probe = page.locator('.flow-foldkit-connection-preview-probe')

  await expect(probe).toHaveAttribute('data-preview-kind', 'connect')
  await expect(probe).toHaveAttribute('data-preview-valid', 'true')
  await expect(probe).toHaveAttribute('data-candidate-target', 'approved')

  const updates = await page.evaluate(
    () => window.__flowFoldkitTest?.connectionPreviewStates() ?? []
  )

  expect(updates.length).toBeGreaterThan(0)

  const latestUpdate = updates.at(-1)

  expect(latestUpdate).toMatchObject({
    kind: 'connect',
    candidate: {
      target: 'approved',
      targetHandle: 'in',
    },
    valid: true,
  })
  expect(latestUpdate?.to.x).toBeCloseTo(end.x - canvasBox.x)
  expect(latestUpdate?.to.y).toBeCloseTo(end.y - canvasBox.y)
  expect(
    await page.evaluate(() => window.__flowFoldkitTest?.readConnectionPreview())
  ).toMatchObject({ kind: 'connect', valid: true })

  await target.dispatchEvent('pointerup', {
    button: 0,
    pointerId: 401,
    clientX: end.x,
    clientY: end.y,
  })
  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-add'])
  await expect(probe).toHaveCount(0)
  expect(
    await page.evaluate(() => window.__flowFoldkitTest?.readConnectionPreview())
  ).toBeNull()

  const controlledSnapshot = await adapter.snapshot()

  expect(controlledSnapshot.edgeIds).toEqual([])

  await source.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 402,
    clientX: start.x,
    clientY: start.y,
  })
  await expect(probe).toBeVisible()
  await page.locator('.flow-foldkit-canvas').focus()
  await page.keyboard.press('Escape')
  await expect(probe).toHaveCount(0)
  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-add'])

  await source.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 403,
    clientX: start.x,
    clientY: start.y,
  })
  await expect(probe).toBeVisible()
  const cleanup = await adapter.destroy()

  expect(cleanup.mountedElements).toBe(0)
  await expect(probe).toHaveCount(0)
})

test('Foldkit preview snapshots stay scoped to the Runtime owning the gesture', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startConnectionPreviewIsolation()
  })

  const canvases = page.locator('.flow-foldkit-canvas[data-flow-instance]')

  await expect(canvases).toHaveCount(2)

  expect(await canvases.nth(0).getAttribute('data-flow-instance')).not.toBe(
    await canvases.nth(1).getAttribute('data-flow-instance')
  )

  const firstCanvas = canvases.nth(0)

  const source = firstCanvas.locator(
    '[data-node-id="source"] [data-handle-id="out"]'
  )

  const target = firstCanvas.locator(
    '[data-node-id="target"] [data-handle-id="in"]'
  )

  const sourceBounds = await source.boundingBox()

  const targetBounds = await target.boundingBox()

  if (sourceBounds === null || targetBounds === null) {
    throw new Error('Missing colliding Runtime handles')
  }

  const start = {
    x: sourceBounds.x + sourceBounds.width / 2,
    y: sourceBounds.y + sourceBounds.height / 2,
  }

  const end = {
    x: targetBounds.x + targetBounds.width / 2,
    y: targetBounds.y + targetBounds.height / 2,
  }

  await source.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 701,
    clientX: start.x,
    clientY: start.y,
  })

  await page.evaluate(
    ({ point, pointerId }) =>
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId,
          clientX: point.x,
          clientY: point.y,
        })
      ),
    { point: end, pointerId: 701 }
  )

  await expect(
    page.locator(
      '.flow-foldkit-canvas[data-flow-instance] .flow-foldkit-connection-preview[data-preview-kind="connect"]'
    )
  ).toBeVisible()

  const active = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
  )

  const idle = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled')
  )

  expect(active?.connectionPreview).toMatchObject({
    kind: 'connect',
    valid: true,
    candidate: { source: 'source', target: 'target' },
  })

  expect(idle?.connectionPreview).toBeNull()

  await page.evaluate(
    ({ point, pointerId }) =>
      document.dispatchEvent(
        new PointerEvent('pointercancel', {
          bubbles: true,
          pointerId,
          clientX: point.x,
          clientY: point.y,
        })
      ),
    { point: end, pointerId: 701 }
  )
})

test('Foldkit discards reconnectable handle sessions after dynamic handle replacement', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({ ...connectionFixture, actions: [] })

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const sourceBox = await source.boundingBox()

  if (sourceBox === null) {
    throw new Error('Missing original Foldkit source handle')
  }

  await source.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 31,
    clientX: sourceBox.x + sourceBox.width / 2,
    clientY: sourceBox.y + sourceBox.height / 2,
  })
  await page.evaluate((fixture) => {
    const nextDocument = {
      ...fixture.document,
      nodes: fixture.document.nodes.map((node) =>
        node.id === 'source'
          ? {
              ...node,
              handles: node.handles?.map((handle) => ({
                ...handle,
                id: 'out-next',
              })),
            }
          : node
      ),
    }

    window.__flowFoldkitTest?.replaceDocument(nextDocument)
  }, connectionFixture)

  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 31,
        clientX: 520,
        clientY: 120,
      })
    )
  )
  expect(await adapter.changeKinds()).toEqual([])

  const nextSource = page.locator(
    '[data-node-id="source"] [data-handle-id="out-next"]'
  )

  const target = page.locator('[data-node-id="approved"] [data-handle-id="in"]')
  const nextSourceBox = await nextSource.boundingBox()
  const targetBox = await target.boundingBox()

  if (nextSourceBox === null || targetBox === null) {
    throw new Error('Missing replacement Foldkit connection handles')
  }

  await nextSource.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 32,
    clientX: nextSourceBox.x + nextSourceBox.width / 2,
    clientY: nextSourceBox.y + nextSourceBox.height / 2,
  })
  await target.dispatchEvent('pointerup', {
    bubbles: true,
    pointerId: 32,
    clientX: targetBox.x + targetBox.width / 2,
    clientY: targetBox.y + targetBox.height / 2,
  })

  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-add'])
  const cleanup = await adapter.destroy()
  expect(cleanup.mountedElements).toBe(0)
})

test('Foldkit reconnects an edge endpoint through the selected edge controls', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = {
    ...connectionFixture,
    actions: [],
    document: {
      ...connectionFixture.document,
      nodes: [
        ...connectionFixture.document.nodes,
        {
          id: 'source-next',
          label: 'Next source',
          position: { x: 80, y: 320 },
          handles: [
            {
              id: 'out-next',
              kind: 'source' as const,
              side: 'right' as const,
            },
          ],
        },
      ],
      edges: [
        {
          id: 'reconnect-edge',
          source: 'source',
          sourceHandle: 'out',
          target: 'approved',
          targetHandle: 'in',
          selected: true,
        },
      ],
    },
  }

  await adapter.mount(fixture)

  const sourceControl = page.locator(
    '[data-edge-id="reconnect-edge"][data-edge-endpoint="source"]'
  )

  const controlBox = await sourceControl.boundingBox()

  const nextHandle = page.locator(
    '[data-node-id="source-next"] [data-handle-id="out-next"]'
  )

  const handleBox = await nextHandle.boundingBox()

  if (controlBox === null || handleBox === null) {
    throw new Error(
      'Missing Foldkit reconnection endpoint or replacement handle'
    )
  }

  await sourceControl.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 70,
    clientX: controlBox.x + controlBox.width / 2,
    clientY: controlBox.y + controlBox.height / 2,
  })
  await page.evaluate((scenario) => {
    const nextDocument = {
      ...scenario.document,
      nodes: scenario.document.nodes.map((node) =>
        node.id === 'source-next'
          ? {
              ...node,
              handles: node.handles?.map((handle) => ({
                ...handle,
                id: 'out-replaced',
              })),
            }
          : node
      ),
    }

    window.__flowFoldkitTest?.replaceDocument(nextDocument)
  }, fixture)
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 70,
        clientX: 500,
        clientY: 500,
      })
    )
  )

  expect(await adapter.changeKinds()).toEqual([])

  const refreshedSourceControl = page.locator(
    '[data-edge-id="reconnect-edge"][data-edge-endpoint="source"]'
  )

  const refreshedControlBox = await refreshedSourceControl.boundingBox()

  const replacedHandle = page.locator(
    '[data-node-id="source-next"] [data-handle-id="out-replaced"]'
  )

  const replacedHandleBox = await replacedHandle.boundingBox()

  if (refreshedControlBox === null || replacedHandleBox === null) {
    throw new Error('Missing refreshed Foldkit reconnect control')
  }

  await refreshedSourceControl.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 72,
    clientX: refreshedControlBox.x + refreshedControlBox.width / 2,
    clientY: refreshedControlBox.y + refreshedControlBox.height / 2,
  })
  await replacedHandle.dispatchEvent('pointerup', {
    bubbles: true,
    pointerId: 72,
    clientX: replacedHandleBox.x + replacedHandleBox.width / 2,
    clientY: replacedHandleBox.y + replacedHandleBox.height / 2,
  })

  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-reconnect'])

  const reconnect = await page.evaluate(
    () => window.__flowFoldkitTest?.changes()[0]
  )

  expect(reconnect).toMatchObject({
    kind: 'edge-reconnect',
    edge: {
      id: 'reconnect-edge',
      source: 'source-next',
      sourceHandle: 'out-replaced',
      target: 'approved',
      targetHandle: 'in',
    },
  })
  await expect(
    page.locator('svg.flow-foldkit-edge[data-edge-id="reconnect-edge"]')
  ).toHaveAttribute('data-source-id', 'source-next')

  const lifecycle = await page.evaluate(
    () => window.__flowFoldkitTest?.interactionEvents() ?? []
  )

  expect(
    lifecycle
      .filter(({ name }) => name === 'onReconnectEnd')
      .map(({ outcome }) => outcome)
  ).toEqual(['cancelled', 'accepted'])
  expect(
    lifecycle.find(
      ({ name, phase }) => name === 'onReconnect' && phase === 'proposal'
    )
  ).toMatchObject({
    change: { kind: 'edge-reconnect', edge: { id: 'reconnect-edge' } },
  })

  await adapter.destroy()
})

test('Foldkit keeps controlled edge reconnection as a proposal', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({
    ...connectionFixture,
    documentMode: 'controlled',
    actions: [],
    document: {
      ...connectionFixture.document,
      nodes: [
        ...connectionFixture.document.nodes,
        {
          id: 'source-next',
          label: 'Next source',
          position: { x: 80, y: 320 },
          handles: [
            {
              id: 'out-next',
              kind: 'source' as const,
              side: 'right' as const,
            },
          ],
        },
      ],
      edges: [
        {
          id: 'controlled-reconnect-edge',
          source: 'source',
          sourceHandle: 'out',
          target: 'approved',
          targetHandle: 'in',
          selected: true,
        },
      ],
    },
  })
  await expect
    .poll(() => adapter.snapshot().then(({ edgeIds }) => edgeIds))
    .toEqual(['controlled-reconnect-edge'])
  const before = await adapter.snapshot()

  const sourceControl = page.locator(
    '[data-edge-id="controlled-reconnect-edge"][data-edge-endpoint="source"]'
  )

  const controlBox = await sourceControl.boundingBox()

  const nextHandle = page.locator(
    '[data-node-id="source-next"] [data-handle-id="out-next"]'
  )

  const handleBox = await nextHandle.boundingBox()

  if (controlBox === null || handleBox === null) {
    throw new Error('Missing controlled Foldkit reconnection handles')
  }

  await sourceControl.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 71,
    clientX: controlBox.x + controlBox.width / 2,
    clientY: controlBox.y + controlBox.height / 2,
  })
  await nextHandle.dispatchEvent('pointerup', {
    bubbles: true,
    pointerId: 71,
    clientX: handleBox.x + handleBox.width / 2,
    clientY: handleBox.y + handleBox.height / 2,
  })
  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-reconnect'])
  expect(await adapter.snapshot()).toStrictEqual(before)

  const proposed = await page.evaluate(
    () => window.__flowFoldkitTest?.changes()[0]
  )

  expect(proposed).toMatchObject({
    kind: 'edge-reconnect',
    edge: { source: 'source-next', sourceHandle: 'out-next' },
  })

  const lifecycle = await page.evaluate(
    () => window.__flowFoldkitTest?.interactionEvents() ?? []
  )

  expect(
    lifecycle
      .filter(({ name }) => name === 'onReconnectEnd')
      .map(({ outcome }) => outcome)
  ).toEqual(['proposed'])
  expect(
    lifecycle.find(
      ({ name, phase }) => name === 'onReconnect' && phase === 'proposal'
    )
  ).toMatchObject({
    outcome: 'proposed',
    change: {
      kind: 'edge-reconnect',
      edge: { id: 'controlled-reconnect-edge' },
    },
  })

  await adapter.destroy()
})

test('Foldkit cancels reconnect on blur and capture loss, then permits a retry', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = {
    ...connectionFixture,
    actions: [],
    document: {
      ...connectionFixture.document,
      nodes: [
        ...connectionFixture.document.nodes,
        {
          id: 'source-next',
          label: 'Next source',
          position: { x: 80, y: 320 },
          handles: [
            {
              id: 'out-next',
              kind: 'source' as const,
              side: 'right' as const,
            },
          ],
        },
      ],
      edges: [
        {
          id: 'reconnect-cancel-edge',
          source: 'source',
          sourceHandle: 'out',
          target: 'approved',
          targetHandle: 'in',
          selected: true,
        },
      ],
    },
  }

  await adapter.mount(fixture)

  const sourceControl = page.locator(
    '[data-edge-id="reconnect-cancel-edge"][data-edge-endpoint="source"]'
  )

  const nextHandle = page.locator(
    '[data-node-id="source-next"] [data-handle-id="out-next"]'
  )

  const begin = async (pointerId: number) => {
    const box = await sourceControl.boundingBox()

    if (box === null) {
      throw new Error('Missing Foldkit reconnection endpoint')
    }

    await sourceControl.dispatchEvent('pointerdown', {
      button: 0,
      pointerId,
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
    })
    await expect(page.locator('.flow-foldkit-connection-preview')).toBeVisible()
  }

  await begin(73)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 73,
        clientX: 100,
        clientY: 330,
      })
    )
  )
  expect(await adapter.changeKinds()).toEqual([])
  await expect(page.locator('.flow-foldkit-connection-preview')).toHaveCount(0)

  await begin(74)
  await sourceControl.dispatchEvent('lostpointercapture', {
    bubbles: true,
    pointerId: 74,
  })
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 74,
        clientX: 100,
        clientY: 330,
      })
    )
  )
  expect(await adapter.changeKinds()).toEqual([])
  await expect(page.locator('.flow-foldkit-connection-preview')).toHaveCount(0)

  await begin(76)
  await page.locator('[data-testid="flow-canvas"]').focus()
  await page.keyboard.press('Escape')
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 76,
        clientX: 100,
        clientY: 330,
      })
    )
  )
  expect(await adapter.changeKinds()).toEqual([])
  await expect(page.locator('.flow-foldkit-connection-preview')).toHaveCount(0)

  await begin(77)
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, pointerId: 77 })
    )
  )
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 77,
        clientX: 100,
        clientY: 330,
      })
    )
  )
  expect(await adapter.changeKinds()).toEqual([])
  await expect(page.locator('.flow-foldkit-connection-preview')).toHaveCount(0)

  const targetBox = await nextHandle.boundingBox()

  if (targetBox === null) {
    throw new Error('Missing Foldkit replacement source handle')
  }

  await begin(75)
  await expect(
    page.locator('svg.flow-foldkit-edge[data-edge-id="reconnect-cancel-edge"]')
  ).toHaveAttribute('data-source-id', 'source')
  await nextHandle.dispatchEvent('pointerup', {
    bubbles: true,
    pointerId: 75,
    clientX: targetBox.x + targetBox.width / 2,
    clientY: targetBox.y + targetBox.height / 2,
  })
  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-reconnect'])
  const finalSnapshot = await adapter.snapshot()
  expect(finalSnapshot.edgeIds).toEqual(['reconnect-cancel-edge'])
  await expect(
    page.locator('svg.flow-foldkit-edge[data-edge-id="reconnect-cancel-edge"]')
  ).toHaveAttribute('data-source-id', 'source-next')
  await adapter.destroy()
})

test('Foldkit supports keyboard connection activation in controlled and uncontrolled modes', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  await adapter.mount({
    ...connectionFixture,
    documentMode: 'controlled',
    actions: [],
  })

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="approved"] [data-handle-id="in"]')
  await source.focus()
  await page.keyboard.press('Enter')
  await target.focus()
  await page.keyboard.press('Space')

  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-add'])

  const proposal = await page.evaluate(
    () => window.__flowFoldkitTest?.changes()[0]
  )

  expect(proposal).toMatchObject({
    kind: 'edge-add',
    edge: {
      source: 'source',
      sourceHandle: 'out',
      target: 'approved',
      targetHandle: 'in',
    },
  })
  const controlledSnapshot = await adapter.snapshot()
  expect(controlledSnapshot.edgeIds).toEqual([])

  await adapter.destroy()
  await adapter.mount({
    ...connectionFixture,
    documentMode: 'uncontrolled',
    actions: [],
  })
  await page.locator('[data-node-id="source"] [data-handle-id="out"]').click()
  await page.locator('[data-node-id="approved"] [data-handle-id="in"]').click()

  await expect
    .poll(() => adapter.snapshot().then(({ edgeIds }) => edgeIds))
    .toEqual(['edge-1'])
  await adapter.destroy()
})

test('Foldkit applies loose connection normalization and the configured radius', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const looseCase = interactionConnectionCases.find(
    ({ id }) => id === 'loose-normalizes-from-target-handle-origin'
  )

  if (looseCase === undefined) {
    throw new Error('Missing shared loose connection fixture case')
  }

  const fixture = {
    ...connectionFixture,
    allowedConnectionTargets: ['loose-source', 'loose-target'],
    document: interactionLifecycleFixture.connectionDocument,
    actions: [],
  }

  await adapter.mount(fixture)

  await page.evaluate(async (scenario) => {
    await window.__flowFoldkitTest?.mount(scenario, 'full', {
      connectionMode: 'loose',
      connectionRadius: 20,
      autoPanOnConnect: false,
    })
  }, fixture)

  const source = page.locator(
    `[data-node-id="${looseCase.connection.source}"] [data-handle-id="${looseCase.connection.sourceHandle}"]`
  )

  const target = page.locator(
    `[data-node-id="${looseCase.connection.target}"] [data-handle-id="${looseCase.connection.targetHandle}"]`
  )

  const targetBox = await target.boundingBox()
  const sourceBox = await source.boundingBox()

  if (targetBox === null || sourceBox === null) {
    throw new Error('Missing Foldkit connection handles')
  }

  await source.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 190,
    clientX: sourceBox.x + sourceBox.width / 2,
    clientY: sourceBox.y + sourceBox.height / 2,
  })
  await page.evaluate(
    ({ x, y }) =>
      document.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 190,
          clientX: x,
          clientY: y,
        })
      ),
    {
      x: targetBox.x + targetBox.width / 2 + 40,
      y: targetBox.y + targetBox.height / 2,
    }
  )
  expect(await adapter.changeKinds()).toEqual([])

  await source.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 191,
    clientX: sourceBox.x + sourceBox.width / 2,
    clientY: sourceBox.y + sourceBox.height / 2,
  })
  await page.evaluate(
    ({ x, y }) =>
      document.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 191,
          clientX: x,
          clientY: y,
        })
      ),
    {
      x: sourceBox.x + sourceBox.width / 2,
      y: sourceBox.y + sourceBox.height / 2,
    }
  )
  expect(await adapter.changeKinds()).toEqual([])

  await source.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 192,
    clientX: sourceBox.x + sourceBox.width / 2,
    clientY: sourceBox.y + sourceBox.height / 2,
  })
  await page.evaluate(
    ({ x, y }) =>
      document.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 192,
          clientX: x,
          clientY: y,
        })
      ),
    {
      x: targetBox.x + targetBox.width / 2,
      y: targetBox.y + targetBox.height / 2,
    }
  )
  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-add'])
  expect(
    await page.evaluate(() => window.__flowFoldkitTest?.changes()[0])
  ).toMatchObject({
    kind: 'edge-add',
    edge: looseCase.normalized,
  })

  await adapter.destroy()

  const strictCase = interactionConnectionCases.find(
    ({ id }) => id === 'strict-rejects-opposite-handle-kinds'
  )

  if (strictCase === undefined) {
    throw new Error('Missing shared strict connection fixture case')
  }

  const strictFixture = {
    ...connectionFixture,
    allowedConnectionTargets: ['loose-source', 'target'],
    document: interactionLifecycleFixture.connectionDocument,
    actions: [],
  }

  await adapter.mount(strictFixture)
  await page.evaluate(async (scenario) => {
    await window.__flowFoldkitTest?.mount(scenario, 'full', {
      connectionMode: 'strict',
      connectionRadius: 20,
      autoPanOnConnect: false,
    })
  }, strictFixture)

  const strictHandle = page.locator(
    `[data-node-id="${strictCase.connection.source}"] [data-handle-id="${strictCase.connection.sourceHandle}"]`
  )

  const strictBox = await strictHandle.boundingBox()

  if (strictBox === null) {
    throw new Error('Missing strict fixture connection handle')
  }

  await strictHandle.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 194,
    clientX: strictBox.x + strictBox.width / 2,
    clientY: strictBox.y + strictBox.height / 2,
  })
  await page.evaluate(
    ({ x, y }) =>
      document.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 194,
          clientX: x,
          clientY: y,
        })
      ),
    {
      x: strictBox.x + strictBox.width / 2,
      y: strictBox.y + strictBox.height / 2,
    }
  )
  expect(await adapter.changeKinds()).toEqual([])
  await adapter.destroy()
})

test('Foldkit connectionRadius stays in screen pixels across viewport zoom', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = {
    ...connectionFixture,
    allowedConnectionTargets: ['target'],
    document: interactionLifecycleFixture.connectionDocument,
    actions: [],
  }

  const runRelease = async (
    zoom: number,
    offset: number,
    expectedChangeKinds: readonly string[]
  ): Promise<void> => {
    await adapter.mount(fixture)
    await page.evaluate(async (scenario) => {
      await window.__flowFoldkitTest?.mount(scenario, 'full', {
        connectionMode: 'strict',
        connectionRadius: 20,
        autoPanOnConnect: false,
      })
    }, fixture)
    await page.evaluate((nextZoom) => {
      window.__flowFoldkitTest?.replaceViewport({ x: 0, y: 0, zoom: nextZoom })
    }, zoom)

    const source = page.locator(
      '[data-node-id="source"] [data-handle-id="out"]'
    )

    const target = page.locator('[data-node-id="target"] [data-handle-id="in"]')
    const sourceBounds = await source.boundingBox()
    const targetBounds = await target.boundingBox()

    if (sourceBounds === null || targetBounds === null) {
      throw new Error('Missing Foldkit zoomed connection handles')
    }

    await source.dispatchEvent('pointerdown', {
      button: 0,
      pointerId: 250,
      clientX: sourceBounds.x + sourceBounds.width / 2,
      clientY: sourceBounds.y + sourceBounds.height / 2,
    })

    const releasePoint = {
      x: targetBounds.x + targetBounds.width / 2 - offset,
      y: targetBounds.y + targetBounds.height / 2,
    }

    await page.evaluate(
      ({ x, y }) =>
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            pointerId: 250,
            clientX: x,
            clientY: y,
          })
        ),
      releasePoint
    )
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const preview =
            await window.__flowFoldkitTest?.readConnectionPreview()

          return preview?.kind === 'connect'
            ? (preview.candidate?.target ?? null)
            : null
        })
      )
      .toBe(expectedChangeKinds.length === 0 ? null : 'target')
    await page.evaluate(
      ({ x, y }) =>
        document.dispatchEvent(
          new PointerEvent('pointerup', {
            bubbles: true,
            pointerId: 250,
            clientX: x,
            clientY: y,
          })
        ),
      releasePoint
    )
    await expect.poll(() => adapter.changeKinds()).toEqual(expectedChangeKinds)
    await adapter.destroy()
  }

  // At 2x zoom, 30 screen pixels is 15 graph units: outside a 20px radius.
  await runRelease(2, 30, [])
  // At 0.5x zoom, 15 screen pixels is 30 graph units: inside that same radius.
  await runRelease(0.5, 15, ['edge-add'])
})

test('Foldkit auto-pans an active connection gesture near the canvas edge', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({ ...connectionFixture, actions: [] })
  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const sourceBox = await source.boundingBox()

  if (sourceBox === null) {
    throw new Error('Missing Foldkit source handle')
  }

  await source.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 193,
    clientX: sourceBox.x + sourceBox.width / 2,
    clientY: sourceBox.y + sourceBox.height / 2,
  })
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>('.flow-foldkit-canvas')

    if (canvas === null) {
      throw new Error('Missing Foldkit canvas')
    }

    const bounds = canvas.getBoundingClientRect()
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 193,
        clientX: bounds.right - 1,
        clientY: bounds.top + bounds.height / 2,
      })
    )
  })
  await expect
    .poll(async () => {
      const state = await adapter.readState({})

      return state.snapshot.viewport.x
    })
    .not.toBe(0)
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointercancel', {
        bubbles: true,
        pointerId: 193,
      })
    )
  )
  await adapter.destroy()
})

test('Foldkit supports keyboard edge reconnection in controlled and uncontrolled modes', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const sourceReconnectCase = interactionReconnectionCases.find(
    ({ id }) => id === 'source-endpoint-accepted'
  )

  if (sourceReconnectCase === undefined) {
    throw new Error('Missing shared source reconnection fixture case')
  }

  if (
    sourceReconnectCase.outcome !== 'accepted' ||
    sourceReconnectCase.expectedEdge === undefined
  ) {
    throw new Error('Shared source reconnection fixture is not accepted')
  }

  const fixture = {
    ...connectionFixture,
    actions: [],
    document: {
      ...connectionFixture.document,
      nodes: [
        ...connectionFixture.document.nodes,
        {
          id: sourceReconnectCase.nodeId,
          label: 'Next source',
          position: { x: 80, y: 320 },
          handles: [
            {
              id: sourceReconnectCase.handleId,
              kind: 'source' as const,
              side: 'right' as const,
            },
          ],
        },
      ],
      edges: [
        {
          id: 'keyboard-reconnect-edge',
          source: 'source',
          sourceHandle: 'out',
          target: 'approved',
          targetHandle: 'in',
          selected: true,
        },
      ],
    },
  }

  await adapter.mount({ ...fixture, documentMode: 'controlled' })

  const reconnectControl = page.getByRole('button', {
    name: 'Reconnect source of Edge keyboard-reconnect-edge',
  })

  await reconnectControl.focus()
  await page.keyboard.press('Enter')
  await page
    .locator(
      `[data-node-id="${sourceReconnectCase.nodeId}"] [data-handle-id="${sourceReconnectCase.handleId}"]`
    )
    .focus()
  await page.keyboard.press('Space')
  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-reconnect'])

  const controlledChange = await page.evaluate(
    () => window.__flowFoldkitTest?.changes()[0]
  )

  expect(controlledChange).toMatchObject({
    kind: 'edge-reconnect',
    edge: {
      id: 'keyboard-reconnect-edge',
      source: sourceReconnectCase.expectedEdge.source,
      sourceHandle: sourceReconnectCase.expectedEdge.sourceHandle,
    },
  })
  const controlledSnapshot = await adapter.snapshot()
  expect(controlledSnapshot.edgeIds).toEqual(['keyboard-reconnect-edge'])
  await expect(
    page.locator(
      'svg.flow-foldkit-edge[data-edge-id="keyboard-reconnect-edge"]'
    )
  ).toHaveAttribute('data-source-id', 'source')

  await adapter.destroy()
  await adapter.mount({ ...fixture, documentMode: 'uncontrolled' })
  await page
    .getByRole('button', {
      name: 'Reconnect source of Edge keyboard-reconnect-edge',
    })
    .focus()
  await page.keyboard.press('Space')
  await page
    .locator(
      `[data-node-id="${sourceReconnectCase.nodeId}"] [data-handle-id="${sourceReconnectCase.handleId}"]`
    )
    .focus()
  await page.keyboard.press('Enter')
  await expect(
    page.locator(
      'svg.flow-foldkit-edge[data-edge-id="keyboard-reconnect-edge"]'
    )
  ).toHaveAttribute('data-source-id', 'source-next')
  await adapter.destroy()
})

test('Foldkit pointer cancellation discards a drag and permits a fresh drag', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({ ...movementFixture, actions: [] })

  const node = page.locator('[data-node-id="move"]')
  const box = await node.boundingBox()

  if (box === null) {
    throw new Error('Missing Foldkit lifecycle node')
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await node.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 41,
    clientX: startX,
    clientY: startY,
  })
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointercancel', {
        bubbles: true,
        pointerId: 41,
      })
    )
  )

  expect(await adapter.changeKinds()).toEqual([])
  const cancelledSnapshot = await adapter.snapshot()
  expect(cancelledSnapshot.positions).toEqual([{ id: 'move', x: 80, y: 100 }])

  await adapter.perform({ kind: 'drag-node', nodeId: 'move', dx: 32, dy: 20 })
  await expect.poll(() => adapter.changeKinds()).toEqual(['node-position'])

  const freshGestureChanges = await page.evaluate(
    () => window.__flowFoldkitTest?.changes() ?? []
  )

  expect(freshGestureChanges).toContainEqual({
    kind: 'node-position',
    nodeId: 'move',
    position: { x: 112, y: 120 },
  })
  const freshGestureSnapshot = await adapter.snapshot()
  expect(freshGestureSnapshot.positions).toEqual([
    { id: 'move', x: 80, y: 100 },
  ])

  const cleanup = await adapter.destroy()
  expect(cleanup.mountedElements).toBe(0)
})

test('Foldkit consumes every shared cancellation/retry case through production handles', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const [fallbackCase] = interactionCancellationRetryCases

  if (fallbackCase === undefined) {
    throw new Error('Missing shared cancellation/retry fixture cases')
  }

  const acceptedGestureStates = async () => {
    const states = await adapter.acceptedStates()

    return states.filter(({ cause }) => cause === 'semantic-change')
  }

  // oxlint-disable no-await-in-loop
  for (const reason of interactionLifecycleFixture.cancellationReasons) {
    const cancellationCase =
      interactionCancellationRetryCases.find(
        (item) => item.reason === reason
      ) ?? fallbackCase

    const fixture = {
      ...connectionFixture,
      actions: [],
      allowedConnectionTargets: [cancellationCase.retry.target],
      document: interactionLifecycleFixture.connectionDocument,
    }

    await adapter.mount(fixture)

    const source = page.locator(
      `[data-node-id="${cancellationCase.attempt.source}"] [data-handle-id="${cancellationCase.attempt.sourceHandle}"]`
    )

    const target = page.locator(
      `[data-node-id="${cancellationCase.attempt.target}"] [data-handle-id="${cancellationCase.attempt.targetHandle}"]`
    )

    const sourceBox = await source.boundingBox()
    const targetBox = await target.boundingBox()

    if (sourceBox === null || targetBox === null) {
      throw new Error(`Missing handles for ${cancellationCase.reason} fixture`)
    }

    const pointerId = 121

    await source.dispatchEvent('pointerdown', {
      button: 0,
      pointerId,
      clientX: sourceBox.x + sourceBox.width / 2,
      clientY: sourceBox.y + sourceBox.height / 2,
    })

    if (reason === 'escape') {
      await page.locator('[data-testid="flow-canvas"]').focus()
      await page.keyboard.press('Escape')
    } else if (reason === 'blur') {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    } else if (reason === 'pointer-cancel') {
      await page.evaluate((id) => {
        document.dispatchEvent(
          new PointerEvent('pointercancel', { bubbles: true, pointerId: id })
        )
      }, pointerId)
    } else if (reason === 'capture-loss') {
      await page.evaluate((id) => {
        document.dispatchEvent(
          new PointerEvent('lostpointercapture', {
            bubbles: true,
            pointerId: id,
          })
        )
      }, pointerId)
    } else if (reason === 'removal') {
      await page.evaluate((document) => {
        const replacement = {
          ...document,
          nodes: document.nodes.filter((node) => node.id !== 'source'),
        }

        window.__flowFoldkitTest?.replaceDocument(replacement)
      }, fixture.document)
    } else if (reason === 'configuration-replacement') {
      await page.evaluate((document) => {
        const replacement = {
          ...document,
          nodes: document.nodes.map((node) =>
            node.id === 'target' ? { ...node, label: 'Replaced target' } : node
          ),
        }

        window.__flowFoldkitTest?.replaceDocument(replacement)
      }, fixture.document)
    } else {
      const cleanup = await adapter.destroy()

      expect(cleanup.changesAfterDestroy).toBe(0)
      expect(cleanup.acceptedStatesAfterDestroy).toBe(0)
    }

    await page.evaluate(
      ({ id, x, y }) =>
        document.dispatchEvent(
          new PointerEvent('pointerup', {
            bubbles: true,
            pointerId: id,
            clientX: x,
            clientY: y,
          })
        ),
      {
        id: pointerId,
        x: targetBox.x + targetBox.width / 2,
        y: targetBox.y + targetBox.height / 2,
      }
    )

    expect(await adapter.changeKinds()).toEqual([])
    const acceptedChanges = await acceptedGestureStates()

    expect(acceptedChanges).toEqual([])

    expect(await adapter.snapshot()).toMatchObject({ edgeIds: [] })

    if (reason === 'unmount' || reason === 'removal') {
      await adapter.mount(fixture)
    } else if (reason === 'configuration-replacement') {
      await page.evaluate(
        (document) => window.__flowFoldkitTest?.replaceDocument(document),
        fixture.document
      )
    }

    if (reason !== 'unmount') {
      expect(await adapter.changeKinds()).toEqual([])
      const restoredGestureChanges = await acceptedGestureStates()

      expect(restoredGestureChanges).toEqual([])
    }

    await adapter.perform({
      kind: 'connect',
      sourceNodeId: cancellationCase.retry.source,
      sourceHandleId: cancellationCase.retry.sourceHandle,
      targetNodeId: cancellationCase.retry.target,
      targetHandleId: cancellationCase.retry.targetHandle,
    })

    await expect
      .poll(() => adapter.changeKinds(), {
        message: `Cancellation reason ${reason} should permit the shared fresh retry`,
      })
      .toEqual(['edge-add'])
    await expect
      .poll(
        async () => {
          const snapshot = await adapter.snapshot()

          return snapshot.edgeIds
        },
        {
          message: `Cancellation reason ${reason} should render its fresh retry edge`,
        }
      )
      .toEqual([cancellationCase.expectedRetryEdgeId])
    await adapter.destroy()
  }
  // oxlint-enable no-await-in-loop
})

test('Foldkit honors node drag/focus and edge select/focus flags', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const document = {
    ...interactionLifecycleFixture.reconnectDocument,
    nodes: interactionLifecycleFixture.reconnectDocument.nodes.map((node) =>
      node.id === 'source'
        ? { ...node, draggable: false, focusable: false }
        : node
    ),
    edges: interactionLifecycleFixture.reconnectDocument.edges.map((edge) =>
      edge.id === 'edge-existing'
        ? { ...edge, focusable: false, selectable: false }
        : edge
    ),
  }

  await adapter.mount({
    ...connectionFixture,
    documentMode: 'uncontrolled',
    document,
  })

  const source = page.locator('[data-node-id="source"]')

  await expect(source).toHaveAttribute('tabindex', '-1')
  const sourceBounds = await source.boundingBox()

  if (sourceBounds === null) {
    throw new Error('Missing non-draggable source geometry')
  }

  await page.mouse.move(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    sourceBounds.x + sourceBounds.width + 70,
    sourceBounds.y + 20
  )
  await page.mouse.up()

  const nodeAfterDrag = await adapter.readState({ nodeId: 'source' })

  expect(nodeAfterDrag.node?.position).toEqual({ x: 20, y: 20 })

  const edgeTarget = page.locator(
    '.flow-foldkit-edge[data-edge-id="edge-existing"] .flow-foldkit-edge-hit-target'
  )

  await expect(edgeTarget).toHaveAttribute('tabindex', '-1')
  await expect(edgeTarget).toHaveAttribute('role', 'img')
  await edgeTarget.click({ force: true })
  expect(await adapter.changeKinds()).not.toContain('edge-selection')
  await adapter.destroy()
})

test('Foldkit ignores cancellation from a different pointer and completes the active pointer', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({ ...movementFixture, actions: [] })

  const node = page.locator('[data-node-id="move"]')
  const box = await node.boundingBox()

  if (box === null) {
    throw new Error('Missing Foldkit lifecycle node')
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await node.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 51,
    clientX: startX,
    clientY: startY,
  })
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointercancel', {
        bubbles: true,
        pointerId: 52,
      })
    )
  )
  await page.evaluate(
    ({ x, y }) =>
      document.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 51,
          clientX: x + 32,
          clientY: y + 20,
        })
      ),
    { x: startX, y: startY }
  )

  await expect.poll(() => adapter.changeKinds()).toEqual(['node-position'])

  const completedChanges = await page.evaluate(
    () => window.__flowFoldkitTest?.changes() ?? []
  )

  expect(completedChanges).toContainEqual({
    kind: 'node-position',
    nodeId: 'move',
    position: { x: 112, y: 120 },
  })
  const completedSnapshot = await adapter.snapshot()
  expect(completedSnapshot.positions).toEqual([{ id: 'move', x: 80, y: 100 }])

  const cleanup = await adapter.destroy()
  expect(cleanup.mountedElements).toBe(0)
})

test('Foldkit clears active gestures on blur and document replacement', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({ ...movementFixture, actions: [] })

  const node = page.locator('[data-node-id="move"]')
  const box = await node.boundingBox()

  if (box === null) {
    throw new Error('Missing Foldkit lifecycle node')
  }

  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await node.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 61,
    clientX: x,
    clientY: y,
  })
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 61,
        clientX: 500,
        clientY: 500,
      })
    )
  )
  expect(await adapter.changeKinds()).toEqual([])

  await node.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 63,
    clientX: x,
    clientY: y,
  })
  await node.dispatchEvent('lostpointercapture', {
    bubbles: true,
    pointerId: 63,
  })
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 63,
        clientX: 500,
        clientY: 500,
      })
    )
  )
  expect(await adapter.changeKinds()).toEqual([])

  await node.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 62,
    clientX: x,
    clientY: y,
  })
  await page.evaluate((fixture) => {
    const nextDocument = {
      ...fixture.document,
      nodes: fixture.document.nodes.map((candidate) =>
        candidate.id === 'move'
          ? { ...candidate, label: 'Replaced while active' }
          : candidate
      ),
    }

    window.__flowFoldkitTest?.replaceDocument(nextDocument)
  }, movementFixture)
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 62,
        clientX: 500,
        clientY: 500,
      })
    )
  )
  expect(await adapter.changeKinds()).toEqual([])

  const cleanup = await adapter.destroy()
  expect(cleanup.mountedElements).toBe(0)
})

test('Foldkit discards active gestures on unmount and leaves key and wheel input unowned', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({ ...movementFixture, actions: [] })

  const node = page.locator('[data-node-id="move"]')
  const box = await node.boundingBox()

  if (box === null) {
    throw new Error('Missing Foldkit lifecycle node')
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await node.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 64,
    clientX: startX,
    clientY: startY,
  })
  const cleanup = await adapter.destroy()
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 64,
        clientX: 500,
        clientY: 500,
      })
    )
  )
  expect(cleanup.mountedElements).toBe(0)
  expect(cleanup.changesAfterDestroy).toBe(0)

  await adapter.mount({ ...movementFixture, actions: [] })
  const canvas = page.locator('[data-testid="flow-canvas"]')
  await canvas.dispatchEvent('wheel', { deltaX: 100, deltaY: 100 })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Escape')
  expect(await adapter.changeKinds()).toEqual([])
  const untouched = await adapter.snapshot()
  expect(untouched.positions).toEqual([{ id: 'move', x: 80, y: 100 }])
  await adapter.destroy()
})

test('Foldkit supports keyboard node selection and resize through focused controls', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({
    ...movementFixture,
    actions: [],
    document: {
      ...movementFixture.document,
      nodes: [
        ...movementFixture.document.nodes,
        {
          id: 'already-selected',
          label: 'Already selected',
          position: { x: 360, y: 300 },
          selected: true,
        },
      ],
    },
  })

  const selectionControl = page.locator(
    '[data-node-id="move"] .flow-foldkit-select-node'
  )

  await selectionControl.focus()
  await page.keyboard.press('Space')
  await expect.poll(() => adapter.changeKinds()).toEqual(['selection-set'])

  const selection = await page.evaluate(
    () => window.__flowFoldkitTest?.changes()[0]
  )

  expect(selection).toMatchObject({
    kind: 'selection-set',
    nodeIds: ['move', 'already-selected'],
  })
  await expect(
    page.getByRole('button', { name: 'Resize Move from right' })
  ).toBeVisible()

  const resizeControl = page.getByRole('button', {
    name: 'Resize Move from right',
  })

  await resizeControl.focus()
  await page.keyboard.down('ArrowRight')
  await resizeControl.dispatchEvent('keydown', {
    key: 'ArrowRight',
    repeat: true,
    bubbles: true,
  })

  await expect
    .poll(() =>
      page
        .locator('[data-node-id="move"]')
        .evaluate((node) =>
          node instanceof HTMLElement ? node.style.width : null
        )
    )
    .toBe('160px')
  await page.keyboard.up('ArrowRight')
  await expect
    .poll(() =>
      page
        .locator('[data-node-id="move"]')
        .evaluate((node) =>
          node instanceof HTMLElement
            ? node.getBoundingClientRect().width
            : null
        )
    )
    .toBe(150)
  await expect
    .poll(() => adapter.changeKinds())
    .toEqual(['selection-set', 'node-bounds'])

  const resize = await page.evaluate(() =>
    window.__flowFoldkitTest
      ?.changes()
      .find((change) => change.kind === 'node-bounds')
  )

  expect(resize).toMatchObject({
    kind: 'node-bounds',
    nodeId: 'move',
    position: { x: 80, y: 100 },
    size: { width: 160, height: 44 },
  })

  await page.keyboard.down('ArrowRight')
  await page.keyboard.press('Escape')
  await page.keyboard.up('ArrowRight')
  await expect
    .poll(() => adapter.changeKinds())
    .toEqual(['selection-set', 'node-bounds'])
  await adapter.destroy()
})

test('Foldkit keyboard resize cancels on blur and node removal, then accepts a fresh retry', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = {
    ...movementFixture,
    documentMode: 'uncontrolled' as const,
    actions: [],
    document: {
      edges: [],
      nodes: [
        {
          id: 'move',
          label: 'Move',
          position: { x: 80, y: 100 },
          size: { width: 150, height: 80 },
          selected: true,
        },
        {
          id: 'far',
          label: 'Far',
          position: { x: 360, y: 300 },
          size: { width: 150, height: 80 },
        },
      ],
    },
  }

  await adapter.mount(fixture)

  const moveResize = page.getByRole('button', {
    name: 'Resize Move from right',
  })

  await moveResize.focus()
  await page.keyboard.down('ArrowRight')
  await moveResize.dispatchEvent('keydown', {
    key: 'ArrowRight',
    repeat: true,
    bubbles: true,
  })
  await expect(page.locator('[data-node-id="move"]')).toHaveCSS(
    'width',
    '160px'
  )

  await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
  await expect(page.locator('[data-node-id="move"]')).toHaveCSS(
    'width',
    '150px'
  )
  await page.keyboard.up('ArrowRight')
  expect(await adapter.changeKinds()).toEqual([])
  expect(await adapter.acceptedStates()).toHaveLength(0)

  await moveResize.focus()
  await page.keyboard.down('ArrowRight')
  await page.keyboard.up('ArrowRight')
  await expect.poll(() => adapter.changeKinds()).toEqual(['node-bounds'])
  const blurRetryState = await adapter.readState({ nodeId: 'move' })
  expect(blurRetryState.node?.size).toEqual({
    width: 155,
    height: 80,
  })

  await adapter.mount(fixture)

  const activeResize = page.getByRole('button', {
    name: 'Resize Move from right',
  })

  await activeResize.focus()
  await page.keyboard.down('ArrowRight')
  await activeResize.dispatchEvent('keydown', {
    key: 'ArrowRight',
    repeat: true,
    bubbles: true,
  })

  const retryDocument = {
    edges: [],
    nodes: [
      {
        id: 'far',
        label: 'Far',
        position: { x: 360, y: 300 },
        size: { width: 150, height: 80 },
        selected: true,
      },
    ],
  }

  await adapter.perform({ kind: 'update-document', document: retryDocument })
  await expect(page.locator('[data-node-id="move"]')).toHaveCount(0)
  const acceptedAfterRemoval = await adapter.acceptedStates()
  await page.keyboard.up('ArrowRight')
  expect(await adapter.changeKinds()).toEqual([])
  expect(await adapter.acceptedStates()).toEqual(acceptedAfterRemoval)

  const farResize = page.getByRole('button', { name: 'Resize Far from right' })
  await farResize.focus()
  await page.keyboard.down('ArrowRight')
  await page.keyboard.up('ArrowRight')
  await expect.poll(() => adapter.changeKinds()).toEqual(['node-bounds'])
  const removalRetryState = await adapter.readState({ nodeId: 'far' })
  expect(removalRetryState.node?.size).toEqual({
    width: 155,
    height: 80,
  })
  await adapter.destroy()
})

test('Foldkit Shift+Space selects a rectangle from the focused node center', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({
    ...movementFixture,
    actions: [],
    document: {
      ...movementFixture.document,
      nodes: [
        ...movementFixture.document.nodes,
        {
          id: 'rectangle-target',
          label: 'Rectangle target',
          position: { x: 165, y: 125 },
          size: { width: 20, height: 10 },
        },
      ],
    },
  })

  const control = page.locator(
    '[data-node-id="move"] .flow-foldkit-select-node'
  )

  await control.focus()
  await page.keyboard.press('Shift+Space')
  await expect(page.locator('.flow-foldkit-selection-rect')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.flow-foldkit-selection-rect')).toHaveCount(0)
  expect(await adapter.changeKinds()).toEqual([])

  await page.keyboard.press('Shift+Space')

  // oxlint-disable no-await-in-loop
  for (let index = 0; index < 7; index += 1) {
    await page.keyboard.press('ArrowRight')
  }

  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.press('ArrowDown')
  }
  // oxlint-enable no-await-in-loop

  await page.keyboard.press('Enter')
  await expect.poll(() => adapter.changeKinds()).toEqual(['selection-set'])

  const selection = await page.evaluate(
    () => window.__flowFoldkitTest?.changes()[0]
  )

  expect(selection).toMatchObject({
    kind: 'selection-set',
    nodeIds: ['rectangle-target'],
  })
  await expect(page.locator('.flow-foldkit-selection-rect')).toHaveCount(0)
  await adapter.destroy()
})

test('Foldkit renders eight resize controls and publishes resize candidates', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const selectedFixture = {
    ...movementFixture,
    actions: [],
    document: {
      ...movementFixture.document,
      nodes: [
        ...movementFixture.document.nodes.map((node, index) =>
          index === 0
            ? {
                ...node,
                position: interactionLifecycleFixture.resizeStart.position,
                size: interactionLifecycleFixture.resizeStart.size,
                selected: true,
              }
            : node
        ),
        {
          id: 'nested-resize-child',
          label: 'Nested resize child',
          parentId: 'move',
          position: { x: 20, y: 20 },
          size: { width: 30, height: 20 },
        },
      ],
    },
  }

  await adapter.mount(selectedFixture)

  await expect(page.locator('[data-resize-direction]')).toHaveCount(8)

  // Pointer interactions must stay serial so each resize starts from the last accepted model.

  // oxlint-disable no-await-in-loop
  for (const [
    index,
    resizeCase,
  ] of interactionLifecycleFixture.resizeCases.entries()) {
    const control = page.locator(
      `[data-resize-direction="${resizeCase.direction}"]`
    )

    const box = await control.boundingBox()

    if (box === null) {
      throw new Error(`Missing Foldkit resize control ${resizeCase.direction}`)
    }

    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2
    const pointerId = 100 + index

    await control.dispatchEvent('pointerdown', {
      button: 0,
      pointerId,
      clientX: startX,
      clientY: startY,
    })
    await page.evaluate(
      ({ pointerId: id, clientX, clientY }) =>
        document.dispatchEvent(
          new PointerEvent('pointerup', {
            bubbles: true,
            pointerId: id,
            clientX,
            clientY,
          })
        ),
      {
        pointerId,
        clientX: startX + resizeCase.delta.x,
        clientY: startY + resizeCase.delta.y,
      }
    )

    await expect
      .poll(async () => {
        const kinds = await adapter.changeKinds()

        return kinds.filter((kind) => kind === 'node-bounds').length
      })
      .toBe(index + 1)
  }
  // oxlint-enable no-await-in-loop

  await expect.poll(() => adapter.changeKinds()).toContain('node-bounds')

  const nodeBounds = await page.evaluate(
    () =>
      window.__flowFoldkitTest
        ?.changes()
        .filter((change) => change.kind === 'node-bounds') ?? []
  )

  expect(nodeBounds).toHaveLength(8)
  expect(nodeBounds).toEqual(
    interactionLifecycleFixture.resizeCases.map((resizeCase) => ({
      kind: 'node-bounds',
      nodeId: 'move',
      position: resizeCase.position,
      size: resizeCase.size,
      childPositions: [
        {
          nodeId: 'nested-resize-child',
          position: resizeCase.childPosition,
        },
      ],
    }))
  )
  const cleanup = await adapter.destroy()
  expect(cleanup.mountedElements).toBe(0)
})

test('Foldkit applies accepted uncontrolled resize geometry', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = {
    ...movementFixture,
    documentMode: 'uncontrolled' as const,
    actions: [],
    document: {
      ...movementFixture.document,
      nodes: movementFixture.document.nodes.map((node) => ({
        ...node,
        selected: true,
      })),
    },
  }

  await adapter.mount(fixture)
  const control = page.locator('[data-resize-direction="right"]')
  const box = await control.boundingBox()

  if (box === null) {
    throw new Error('Missing right resize control')
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2)
  await page.mouse.up()
  await expect(page.locator('[data-node-id="move"]')).toHaveCSS(
    'width',
    '158px'
  )
  const cleanup = await adapter.destroy()
  expect(cleanup.changesAfterDestroy).toBe(0)
})

test('Foldkit cancels a resize without publishing or applying geometry', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = {
    ...movementFixture,
    documentMode: 'uncontrolled' as const,
    actions: [],
    document: {
      ...movementFixture.document,
      nodes: movementFixture.document.nodes.map((node) => ({
        ...node,
        selected: true,
      })),
    },
  }

  await adapter.mount(fixture)
  const control = page.locator('[data-resize-direction="right"]')
  const box = await control.boundingBox()

  if (box === null) {
    throw new Error('Missing right resize control')
  }

  await control.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 88,
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
  })
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, pointerId: 88 })
    )
  )
  expect(await adapter.changeKinds()).toEqual([])
  expect(await adapter.acceptedStates()).toEqual([])
  await expect(page.locator('[data-node-id="move"]')).toHaveCSS(
    'width',
    '150px'
  )

  // oxlint-disable no-await-in-loop
  for (const [reason, pointerId] of [
    ['blur', 89],
    ['capture-loss', 90],
    ['escape', 91],
  ] as const) {
    await control.dispatchEvent('pointerdown', {
      button: 0,
      pointerId,
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
    })

    if (reason === 'blur') {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    } else if (reason === 'capture-loss') {
      await page.evaluate(
        (id) =>
          document.dispatchEvent(
            new PointerEvent('lostpointercapture', {
              bubbles: true,
              pointerId: id,
            })
          ),
        pointerId
      )
    } else {
      await page.locator('[data-testid="flow-canvas"]').focus()
      await page.keyboard.press('Escape')
    }

    await page.evaluate(
      (id) =>
        document.dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, pointerId: id })
        ),
      pointerId
    )
    expect(await adapter.changeKinds()).toEqual([])
    expect(await adapter.acceptedStates()).toEqual([])
    await expect(page.locator('[data-node-id="move"]')).toHaveCSS(
      'width',
      '150px'
    )
  }
  // oxlint-enable no-await-in-loop

  const retryBox = await control.boundingBox()

  if (retryBox === null) {
    throw new Error('Missing right resize control for retry')
  }

  await page.mouse.move(
    retryBox.x + retryBox.width / 2,
    retryBox.y + retryBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    retryBox.x + retryBox.width / 2 + 8,
    retryBox.y + retryBox.height / 2
  )
  await page.mouse.up()

  await expect(page.locator('[data-node-id="move"]')).toHaveCSS(
    'width',
    '158px'
  )
  await expect.poll(() => adapter.changeKinds()).toContain('node-bounds')
  const cleanup = await adapter.destroy()
  expect(cleanup.mountedElements).toBe(0)
})

const selectionFixture = {
  ...movementFixture,
  actions: [],
  document: {
    ...interactionLifecycleFixture.document,
    nodes: interactionLifecycleFixture.document.nodes.map((node) => ({
      ...node,
      size: node.size ?? { width: 150, height: 44 },
    })),
  },
}

const dragSelection = async (
  page: Page,
  rect: (typeof interactionLifecycleFixture.selectionCases)[number]['rect']
) => {
  const canvas = page.locator('[data-testid="flow-canvas"]')
  const box = await canvas.boundingBox()

  if (box === null) {
    throw new Error('Missing Foldkit selection canvas')
  }

  await page.mouse.move(
    box.x + rect.x + rect.width,
    box.y + rect.y + rect.height
  )
  await page.mouse.down()
  await page.mouse.move(box.x + rect.x, box.y + rect.y, { steps: 4 })
  await expect(canvas.locator('.flow-foldkit-selection-rect')).toBeVisible()
  await page.mouse.up()
}

const mountSelection = async (page: Page, mode: 'full' | 'partial') => {
  await page.goto('/test.html')
  await page.evaluate(
    async ({ fixture, selectionMode }) => {
      const harnessPath = '/e2e/test-harness.ts'
      await import(harnessPath)
      await window.__flowFoldkitTest?.mount(fixture, selectionMode)
    },
    { fixture: selectionFixture, selectionMode: mode }
  )
}

test('Foldkit applies the shared full and partial rectangle fixture through host pointers', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  // oxlint-disable no-await-in-loop
  for (const selectionCase of interactionLifecycleFixture.selectionCases) {
    await mountSelection(page, selectionCase.mode)
    await dragSelection(page, selectionCase.rect)
    await expect.poll(() => adapter.changeKinds()).toContain('selection-set')

    const change = await page.evaluate(
      () => window.__flowFoldkitTest?.changes()[0]
    )

    expect(change).toMatchObject({
      kind: 'selection-set',
      nodeIds: selectionCase.nodeIds,
      edgeIds: [],
    })
    await adapter.destroy()
  }
  // oxlint-enable no-await-in-loop
})

test('Foldkit cancels a rectangle selection without publishing a change', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount(selectionFixture)
  const canvas = page.locator('[data-testid="flow-canvas"]')
  const box = await canvas.boundingBox()

  if (box === null) {
    throw new Error('Missing Foldkit selection canvas')
  }

  await canvas.dispatchEvent('pointerdown', {
    button: 0,
    pointerId: 73,
    clientX: box.x + 70,
    clientY: box.y + 80,
  })
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, pointerId: 73 })
    )
  )
  expect(await adapter.changeKinds()).toEqual([])
  expect(await adapter.acceptedStates()).toEqual([])
  await expect(canvas.locator('.flow-foldkit-selection-rect')).toHaveCount(0)

  // oxlint-disable no-await-in-loop
  for (const [reason, pointerId] of [
    ['blur', 74],
    ['capture-loss', 75],
    ['escape', 76],
  ] as const) {
    await canvas.dispatchEvent('pointerdown', {
      button: 0,
      pointerId,
      clientX: box.x + 70,
      clientY: box.y + 80,
    })

    await expect(canvas.locator('.flow-foldkit-selection-rect')).toBeVisible()

    if (reason === 'blur') {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    } else if (reason === 'capture-loss') {
      await page.evaluate(
        (id) =>
          document.dispatchEvent(
            new PointerEvent('lostpointercapture', {
              bubbles: true,
              pointerId: id,
            })
          ),
        pointerId
      )
    } else {
      await canvas.focus()
      await page.keyboard.press('Escape')
    }

    await page.evaluate(
      (id) =>
        document.dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, pointerId: id })
        ),
      pointerId
    )
    expect(await adapter.changeKinds()).toEqual([])
    expect(await adapter.acceptedStates()).toEqual([])
    await expect(canvas.locator('.flow-foldkit-selection-rect')).toHaveCount(0)
  }
  // oxlint-enable no-await-in-loop

  const [retryCase] = interactionLifecycleFixture.selectionCases

  if (retryCase === undefined) {
    throw new Error('Missing shared selection retry fixture case')
  }

  await dragSelection(page, retryCase.rect)
  await expect.poll(() => adapter.changeKinds()).toContain('selection-set')

  const cleanup = await adapter.destroy()
  expect(cleanup.changesAfterDestroy).toBe(0)
})

test('Foldkit reconnect cancels on removal, replacement, and unmount, then retries', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const reasons = interactionCancellationRetryCases.filter(({ reason }) =>
    ['removal', 'configuration-replacement', 'unmount'].includes(reason)
  )

  const fixture = {
    ...connectionFixture,
    actions: [],
    allowedConnectionTargets: ['source-next', 'approved'],
    document: {
      ...connectionFixture.document,
      nodes: [
        ...connectionFixture.document.nodes,
        {
          id: 'source-next',
          label: 'Next source',
          position: { x: 80, y: 320 },
          handles: [
            { id: 'out-next', kind: 'source' as const, side: 'right' as const },
          ],
        },
      ],
      edges: [
        {
          id: 'reconnect-lifecycle-edge',
          source: 'source',
          sourceHandle: 'out',
          target: 'approved',
          targetHandle: 'in',
          selected: true,
        },
      ],
    },
  }

  // oxlint-disable no-await-in-loop
  for (const cancellationCase of reasons) {
    for (const documentMode of ['uncontrolled', 'controlled'] as const) {
      const rowFixture = { ...fixture, documentMode }

      await adapter.mount(rowFixture)

      const sourceControl = page.locator(
        '[data-edge-id="reconnect-lifecycle-edge"][data-edge-endpoint="source"]'
      )

      const sourceBox = await sourceControl.boundingBox()

      if (sourceBox === null) {
        throw new Error('Missing reconnect endpoint')
      }

      const pointerId = 510

      await sourceControl.dispatchEvent('pointerdown', {
        button: 0,
        pointerId,
        clientX: sourceBox.x + sourceBox.width / 2,
        clientY: sourceBox.y + sourceBox.height / 2,
      })
      await expect(
        page.locator('.flow-foldkit-connection-preview')
      ).toBeVisible()

      if (cancellationCase.reason === 'removal') {
        await page.evaluate((document) => {
          const removedNodeIds = new Set(
            document.nodes
              .filter((node) => node.id === 'source')
              .map((node) => node.id)
          )

          window.__flowFoldkitTest?.replaceDocument({
            ...document,
            nodes: document.nodes.filter(
              (node) => !removedNodeIds.has(node.id)
            ),
            edges: document.edges.filter(
              (edge) =>
                !removedNodeIds.has(edge.source) &&
                !removedNodeIds.has(edge.target)
            ),
          })
        }, rowFixture.document)
      } else if (cancellationCase.reason === 'configuration-replacement') {
        await page.evaluate((document) => {
          window.__flowFoldkitTest?.replaceDocument({
            ...document,
            nodes: document.nodes.map((node) =>
              node.id === 'source'
                ? { ...node, label: 'Reconfigured source' }
                : node
            ),
          })
        }, rowFixture.document)
      } else {
        const cleanup = await adapter.destroy()

        expect(cleanup.changesAfterDestroy).toBe(0)
        expect(cleanup.acceptedStatesAfterDestroy).toBe(0)
      }

      await page.evaluate(
        (id) =>
          document.dispatchEvent(
            new PointerEvent('pointerup', { bubbles: true, pointerId: id })
          ),
        pointerId
      )

      expect(await adapter.changeKinds()).toEqual([])
      const acceptedStates = await adapter.acceptedStates()

      const semanticChanges = acceptedStates.filter(
        ({ cause }) => cause === 'semantic-change'
      )

      expect(semanticChanges).toEqual([])

      if (cancellationCase.reason !== 'unmount') {
        await expect(
          page.locator('.flow-foldkit-connection-preview')
        ).toHaveCount(0)
      }

      await adapter.mount(rowFixture)

      const retrySource = page.locator(
        '[data-edge-id="reconnect-lifecycle-edge"][data-edge-endpoint="source"]'
      )

      const retryTarget = page.locator(
        '[data-node-id="source-next"] [data-handle-id="out-next"]'
      )

      const retrySourceBox = await retrySource.boundingBox()

      const retryTargetBox = await retryTarget.boundingBox()

      if (retrySourceBox === null || retryTargetBox === null) {
        throw new Error('Missing reconnect retry handles')
      }

      await retrySource.dispatchEvent('pointerdown', {
        button: 0,
        pointerId: 511,
        clientX: retrySourceBox.x + retrySourceBox.width / 2,
        clientY: retrySourceBox.y + retrySourceBox.height / 2,
      })
      await retryTarget.dispatchEvent('pointerup', {
        bubbles: true,
        pointerId: 511,
        clientX: retryTargetBox.x + retryTargetBox.width / 2,
        clientY: retryTargetBox.y + retryTargetBox.height / 2,
      })

      await expect
        .poll(() => adapter.changeKinds(), {
          message: 'Reconnect retry should succeed after cancellation',
        })
        .toEqual(['edge-reconnect'])

      const accepted = await adapter.readState({
        edgeId: 'reconnect-lifecycle-edge',
      })

      expect(accepted.edge?.source).toBe(
        documentMode === 'uncontrolled' ? 'source-next' : 'source'
      )

      if (documentMode === 'uncontrolled') {
        await expect(
          page.locator(
            'svg.flow-foldkit-edge[data-edge-id="reconnect-lifecycle-edge"]'
          )
        ).toHaveAttribute('data-source-id', 'source-next')
      }

      await adapter.destroy()
    }
  }
  // oxlint-enable no-await-in-loop
})

test('Foldkit resize cancels on removal, replacement, and unmount in both control modes', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const reasons = interactionCancellationRetryCases.filter(({ reason }) =>
    ['removal', 'configuration-replacement', 'unmount'].includes(reason)
  )

  const resizeFixture = {
    ...movementFixture,
    actions: [],
    document: {
      ...movementFixture.document,
      nodes: movementFixture.document.nodes.map((node) => ({
        ...node,
        selected: true,
        size: { width: 150, height: 44 },
      })),
    },
  }

  // oxlint-disable no-await-in-loop
  for (const cancellationCase of reasons) {
    for (const documentMode of ['uncontrolled', 'controlled'] as const) {
      const rowFixture = { ...resizeFixture, documentMode }

      await adapter.mount(rowFixture)

      const control = page.locator('[data-resize-direction="right"]')
      const box = await control.boundingBox()

      if (box === null) {
        throw new Error('Missing active resize control')
      }

      const pointerId = 520

      await control.dispatchEvent('pointerdown', {
        button: 0,
        pointerId,
        clientX: box.x + box.width / 2,
        clientY: box.y + box.height / 2,
      })

      if (cancellationCase.reason === 'removal') {
        await page.evaluate((document) => {
          window.__flowFoldkitTest?.replaceDocument({
            ...document,
            nodes: document.nodes.filter((node) => node.id !== 'move'),
          })
        }, rowFixture.document)
      } else if (cancellationCase.reason === 'configuration-replacement') {
        await page.evaluate((document) => {
          window.__flowFoldkitTest?.replaceDocument({
            ...document,
            nodes: document.nodes.map((node) =>
              node.id === 'move'
                ? { ...node, label: 'Reconfigured move' }
                : node
            ),
          })
        }, rowFixture.document)
      } else {
        const cleanup = await adapter.destroy()

        expect(cleanup.changesAfterDestroy).toBe(0)
        expect(cleanup.acceptedStatesAfterDestroy).toBe(0)
      }

      await page.evaluate(
        (id) =>
          document.dispatchEvent(
            new PointerEvent('pointerup', { bubbles: true, pointerId: id })
          ),
        pointerId
      )
      expect(await adapter.changeKinds()).toEqual([])
      const acceptedStates = await adapter.acceptedStates()

      expect(
        acceptedStates.filter(({ cause }) => cause === 'semantic-change')
      ).toEqual([])

      if (cancellationCase.reason !== 'unmount') {
        await expect(
          page.locator('[data-resize-direction="right"]')
        ).toHaveCount(cancellationCase.reason === 'removal' ? 0 : 1)
      }

      await adapter.mount(rowFixture)
      const retry = page.locator('[data-resize-direction="right"]')
      const retryBox = await retry.boundingBox()

      if (retryBox === null) {
        throw new Error('Missing retry resize control')
      }

      await page.mouse.move(
        retryBox.x + retryBox.width / 2,
        retryBox.y + retryBox.height / 2
      )
      await page.mouse.down()
      await page.mouse.move(
        retryBox.x + retryBox.width / 2 + 8,
        retryBox.y + retryBox.height / 2
      )
      await page.mouse.up()

      await expect.poll(() => adapter.changeKinds()).toEqual(['node-bounds'])
      await expect(page.locator('[data-node-id="move"]')).toHaveCSS(
        'width',
        documentMode === 'uncontrolled' ? '158px' : '150px'
      )
      await adapter.destroy()
    }
  }
  // oxlint-enable no-await-in-loop
})

test('Foldkit selection cancels on removal, replacement, and unmount in both control modes', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const reasons = interactionCancellationRetryCases.filter(({ reason }) =>
    ['removal', 'configuration-replacement', 'unmount'].includes(reason)
  )

  const [retryCase] = interactionLifecycleFixture.selectionCases

  if (retryCase === undefined) {
    throw new Error('Missing shared selection retry fixture case')
  }

  // oxlint-disable no-await-in-loop
  for (const cancellationCase of reasons) {
    for (const documentMode of ['uncontrolled', 'controlled'] as const) {
      const rowFixture = { ...selectionFixture, documentMode }

      await adapter.mount(rowFixture)
      const canvas = page.locator('[data-testid="flow-canvas"]')
      const canvasBox = await canvas.boundingBox()

      if (canvasBox === null) {
        throw new Error('Missing selection canvas')
      }

      const pointerId = 530

      await canvas.dispatchEvent('pointerdown', {
        button: 0,
        pointerId,
        clientX: canvasBox.x + retryCase.rect.x + retryCase.rect.width,
        clientY: canvasBox.y + retryCase.rect.y + retryCase.rect.height,
      })
      await page.evaluate(
        ({ pointerId: id, x, y }) =>
          document.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              pointerId: id,
              clientX: x,
              clientY: y,
            })
          ),
        {
          pointerId,
          x: canvasBox.x + retryCase.rect.x,
          y: canvasBox.y + retryCase.rect.y,
        }
      )
      await expect(canvas.locator('.flow-foldkit-selection-rect')).toBeVisible()

      if (cancellationCase.reason === 'removal') {
        await page.evaluate((document) => {
          const removedNodeIds = new Set(
            document.nodes
              .filter((node) => node.id === 'near')
              .map((node) => node.id)
          )

          for (const node of document.nodes) {
            if (node.parentId === 'near') {
              removedNodeIds.add(node.id)
            }
          }

          window.__flowFoldkitTest?.replaceDocument({
            ...document,
            nodes: document.nodes.filter(
              (node) => !removedNodeIds.has(node.id)
            ),
            edges: document.edges.filter(
              (edge) =>
                !removedNodeIds.has(edge.source) &&
                !removedNodeIds.has(edge.target)
            ),
          })
        }, rowFixture.document)
      } else if (cancellationCase.reason === 'configuration-replacement') {
        await page.evaluate((document) => {
          window.__flowFoldkitTest?.replaceDocument({
            ...document,
            nodes: document.nodes.map((node) =>
              node.id === 'near'
                ? { ...node, label: 'Reconfigured selection target' }
                : node
            ),
          })
        }, rowFixture.document)
      } else {
        const cleanup = await adapter.destroy()

        expect(cleanup.changesAfterDestroy).toBe(0)
        expect(cleanup.acceptedStatesAfterDestroy).toBe(0)
      }

      await page.evaluate(
        (id) =>
          document.dispatchEvent(
            new PointerEvent('pointerup', { bubbles: true, pointerId: id })
          ),
        pointerId
      )
      expect(await adapter.changeKinds()).toEqual([])
      const acceptedStates = await adapter.acceptedStates()

      expect(
        acceptedStates.filter(({ cause }) => cause === 'semantic-change')
      ).toEqual([])

      if (cancellationCase.reason !== 'unmount') {
        await expect(page.locator('.flow-foldkit-selection-rect')).toHaveCount(
          0
        )
      }

      await adapter.mount(rowFixture)
      await dragSelection(page, retryCase.rect)
      await expect.poll(() => adapter.changeKinds()).toEqual(['selection-set'])
      await adapter.destroy()
    }
  }
  // oxlint-enable no-await-in-loop
})

test('Foldkit accepts directed named target-target pointers, renders measured identities and rejects the duplicate', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = {
    ...connectionFixture,
    documentMode: 'uncontrolled',
    allowedConnectionTargets: ['target', 'loose-source'],
    document: interactionLifecycleFixture.connectionDocument,
    actions: [],
  } satisfies Parameters<typeof adapter.mount>[0]

  await adapter.mount(fixture)
  await page.evaluate(async (scenario) => {
    await window.__flowFoldkitTest?.mount(scenario, 'full', {
      connectionMode: 'loose',
      connectionRadius: 20,
      autoPanOnConnect: false,
    })
  }, fixture)

  await page.evaluate(() =>
    window.__flowFoldkitTest?.startMountedMeasurementObserver()
  )

  await expect.poll(() => adapter.nodesInitialized(false)).toBe(true)

  await Promise.all(
    ['target', 'loose-source'].map((nodeId) =>
      expect
        .poll(async () => {
          const internal = await adapter.internalNode(nodeId)

          const measured = internal?.handles.find(
            ({ handleId }) => handleId === 'in'
          )

          return (
            internal?.measurementStatus === 'measured' &&
            internal.node.handles?.find(({ id }) => id === 'in')?.kind ===
              'target' &&
            measured !== undefined &&
            measured.width > 0 &&
            measured.height > 0
          )
        })
        .toBe(true)
    )
  )

  const initiating = page.locator(
    '[data-node-id="loose-source"] [data-handle-id="in"]'
  )

  const destination = page.locator(
    '[data-node-id="target"] [data-handle-id="in"]'
  )

  const from = await initiating.boundingBox()
  const to = await destination.boundingBox()

  if (from === null || to === null) {
    throw new Error('Missing named target-target handles')
  }

  const gesture = async () => {
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
      steps: 3,
    })
    await page.mouse.up()
  }

  await gesture()
  await expect.poll(() => adapter.changeKinds()).toStrictEqual(['edge-add'])
  const read = await adapter.readState({ edgeId: 'edge-1' })
  expect(read.edge).toMatchObject({
    id: 'edge-1',
    source: 'target',
    sourceHandle: 'in',
    target: 'loose-source',
    targetHandle: 'in',
  })
  expect(read.snapshot.document.edges).toHaveLength(1)

  const source = await adapter.internalNode('target')
  const target = await adapter.internalNode('loose-source')
  const sourceHandle = source?.handles.find(({ handleId }) => handleId === 'in')
  const targetHandle = target?.handles.find(({ handleId }) => handleId === 'in')

  if (
    source === null ||
    target === null ||
    sourceHandle === undefined ||
    targetHandle === undefined
  ) {
    throw new Error('Missing current public endpoint geometry')
  }

  // Both actual declarations are left-sided targets. Accepted physical IDs
  // attach at the measured outer boundary, independently of directed labels.
  const sourcePoint = {
    x:
      source.absolutePosition.x +
      sourceHandle.offset.x -
      sourceHandle.width / 2,
    y: source.absolutePosition.y + sourceHandle.offset.y,
  }

  const targetPoint = {
    x:
      target.absolutePosition.x +
      targetHandle.offset.x -
      targetHandle.width / 2,
    y: target.absolutePosition.y + targetHandle.offset.y,
  }

  const edge = page.locator('.flow-foldkit-edge[data-edge-id="edge-1"]')
  await expect(edge).toHaveCount(1)
  await expect(edge).toHaveAttribute('data-source-id', 'target')
  await expect(edge).toHaveAttribute('data-source-handle', 'in')
  await expect(edge).toHaveAttribute('data-target-id', 'loose-source')
  await expect(edge).toHaveAttribute('data-target-handle', 'in')
  await expect(edge.locator('.flow-foldkit-edge-hit-target')).toHaveAttribute(
    'd',
    `M ${sourcePoint.x},${sourcePoint.y}L ${targetPoint.x},${targetPoint.y}`
  )

  const observed = await edge
    .locator('.flow-foldkit-edge-hit-target')
    .evaluate((element) => {
      if (!(element instanceof SVGPathElement)) {
        throw new TypeError('Expected rendered target-target path')
      }

      const first = element.getPointAtLength(0)
      const last = element.getPointAtLength(element.getTotalLength())

      return {
        source: { x: first.x, y: first.y },
        target: { x: last.x, y: last.y },
      }
    })

  expect(observed).toStrictEqual({ source: sourcePoint, target: targetPoint })
  const accepted = read.snapshot
  await gesture()
  await expect
    .poll(async () => {
      const events = await page.evaluate(
        () => window.__flowFoldkitTest?.interactionEvents() ?? []
      )

      return events
        .filter(({ name }) => name === 'onConnectEnd')
        .map(({ outcome }) => outcome)
    })
    .toStrictEqual(['accepted', 'rejected'])
  expect(await adapter.changeKinds()).toStrictEqual(['edge-add'])

  const afterDuplicate = await adapter.readState({ edgeId: 'edge-1' })

  expect(afterDuplicate.snapshot).toStrictEqual(accepted)

  const events = await page.evaluate(
    () => window.__flowFoldkitTest?.interactionEvents() ?? []
  )

  expect(
    events
      .filter(({ name }) =>
        ['onConnectStart', 'onConnect', 'onConnectEnd'].includes(name)
      )
      .map(({ name, phase, outcome }) => `${name}:${phase}:${outcome ?? ''}`)
  ).toStrictEqual([
    'onConnectStart:start:',
    'onConnect:proposal:accepted',
    'onConnectEnd:end:accepted',
    'onConnectStart:start:',
    'onConnectEnd:end:rejected',
  ])
  await expect(page.locator('.flow-foldkit-connection-preview')).toHaveCount(0)
  await adapter.destroy()
})
