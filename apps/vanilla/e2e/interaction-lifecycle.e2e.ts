import type {
  ConnectionPreviewSnapshot,
  ConnectionPreviewState,
  FlowChange,
} from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import {
  interactionCancellationRetryCases,
  interactionConnectionCases,
  currentNativeConnectionCases,
  interactionLifecycleFixture,
} from '../../shared-e2e/interaction-lifecycle-contract.ts'

const mountLifecycleScenario = async (
  page: Page,
  withEdge = false
): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await expect(page.getByTestId('flow-canvas')).toHaveCount(0)
  await page.evaluate(async (hasEdge) => {
    const publicEntry = '/src/public.ts'
    const { mountFlow } = await import(publicEntry)
    const root = document.querySelector<HTMLElement>('#app')

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
            position: { x: 100, y: 140 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          ...[
            { id: 'original', x: 360, y: 140 },
            { id: 'target', x: 360, y: 320 },
          ].map(({ id, x, y }) => ({
            id,
            label: id,
            position: { x, y },
            handles: [
              { id: 'in', kind: 'target' as const, side: 'left' as const },
            ],
          })),
        ],
        edges: hasEdge
          ? [
              {
                id: 'edge',
                source: 'source',
                sourceHandle: 'out',
                target: 'original',
                targetHandle: 'in',
                selected: true,
              },
            ]
          : [],
      },
      {
        documentMode: 'uncontrolled',
        connectOnClick: true,
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    globalThis.flowChanges = []
    controller.subscribe((change: FlowChange) =>
      globalThis.flowChanges?.push(change)
    )
    globalThis.flowController = controller
  }, withEdge)
  await page.evaluate(() =>
    globalThis.flowController?.updateNodeInternals([
      'source',
      'original',
      'target',
    ])
  )
}

const centerOf = async (page: Page, selector: string) => {
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

const startAndHold = async (
  page: Page,
  from: string,
  to: string
): Promise<void> => {
  const start = await centerOf(page, from)
  const end = await centerOf(page, to)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 4 })
}

const reconnectTargetSelector = (id: string, handleId = 'in'): string =>
  `[data-node-id="${id}"] [data-handle-id="${handleId}"]`

type CancellationGesture =
  | 'connection'
  | 'reconnection'
  | 'resize'
  | 'selection'

interface CancellationMatrixRow {
  readonly reason: string
  readonly gesture: CancellationGesture
  readonly fixtureCase?: (typeof interactionCancellationRetryCases)[number]
}

const cancellationMatrix: readonly CancellationMatrixRow[] = [
  ...interactionCancellationRetryCases.map((fixtureCase) => ({
    reason: fixtureCase.reason,
    gesture: 'connection' as const,
    fixtureCase,
  })),
  { reason: 'removal', gesture: 'reconnection' },
  { reason: 'escape', gesture: 'reconnection' },
  { reason: 'blur', gesture: 'reconnection' },
  { reason: 'pointer-cancel', gesture: 'reconnection' },
  { reason: 'capture-loss', gesture: 'reconnection' },
  { reason: 'configuration-replacement', gesture: 'reconnection' },
  { reason: 'unmount', gesture: 'reconnection' },
  { reason: 'escape', gesture: 'resize' },
  { reason: 'blur', gesture: 'resize' },
  { reason: 'pointer-cancel', gesture: 'resize' },
  { reason: 'capture-loss', gesture: 'resize' },
  { reason: 'removal', gesture: 'resize' },
  { reason: 'configuration-replacement', gesture: 'resize' },
  { reason: 'unmount', gesture: 'resize' },
  { reason: 'escape', gesture: 'selection' },
  { reason: 'blur', gesture: 'selection' },
  { reason: 'pointer-cancel', gesture: 'selection' },
  { reason: 'capture-loss', gesture: 'selection' },
  { reason: 'removal', gesture: 'selection' },
  { reason: 'configuration-replacement', gesture: 'selection' },
  { reason: 'unmount', gesture: 'selection' },
]

const documentForGesture = (
  gesture: CancellationGesture
): typeof interactionLifecycleFixture.document => {
  if (gesture === 'connection') {
    return interactionLifecycleFixture.connectionDocument
  }

  if (gesture === 'reconnection') {
    const document = interactionLifecycleFixture.reconnectDocument

    return {
      ...document,
      edges: document.edges.map((edge) => ({ ...edge, selected: true })),
    }
  }

  return interactionLifecycleFixture.document
}

const mountCancellationHost = async (
  page: Page,
  fixture: typeof interactionLifecycleFixture.document,
  selectionMode: 'full' | 'partial' = 'full'
): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(
    async ({ fixtureDocument, mode }) => {
      const publicEntry = '/src/public.ts'
      const { mountFlow } = await import(publicEntry)
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing cancellation test host')
      }

      const controller = mountFlow(root, fixtureDocument, {
        documentMode: 'uncontrolled',
        selectionMode: mode,
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      })

      globalThis.flowChanges = []
      globalThis.flowController = controller
      controller.subscribe((change: FlowChange) =>
        globalThis.flowChanges?.push(change)
      )

      const canvas = root.querySelector<HTMLElement>(
        '[data-testid="flow-canvas"]'
      )

      if (canvas === null) {
        throw new Error('Missing cancellation test canvas')
      }

      // SAFETY: The pointer ID is assigned by the next real browser pointerdown before cancellation dispatch.
      const state = globalThis as typeof globalThis & {
        __interactionPointerId: number | undefined
      }

      state.__interactionPointerId = undefined
      canvas.addEventListener(
        'pointerdown',
        (event: PointerEvent) => {
          state.__interactionPointerId = event.pointerId
        },
        { capture: true }
      )
    },
    { fixtureDocument: fixture, mode: selectionMode }
  )
}

const startResizeAndHold = async (page: Page): Promise<void> => {
  const point = await centerOf(
    page,
    '.flow-node[data-node-id="near"] .flow-node-resize-handle[data-direction="bottom-right"]'
  )

  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x + 18, point.y + 12, { steps: 3 })
}

const startSelectionAndHold = async (page: Page): Promise<void> => {
  const canvas = await page.getByTestId('flow-canvas').boundingBox()

  if (canvas === null) {
    throw new Error('Missing canvas bounds for selection cancellation')
  }

  await page.keyboard.down('Shift')
  await page.mouse.move(canvas.x + 4, canvas.y + 4)
  await page.mouse.down()
  await page.mouse.move(canvas.x + 140, canvas.y + 110, { steps: 3 })
}

const startCancellationGesture = async (
  page: Page,
  gesture: CancellationGesture,
  attempt: {
    readonly source: string
    readonly sourceHandle: string
    readonly target: string
    readonly targetHandle: string
  }
): Promise<void> => {
  if (gesture === 'connection') {
    await startAndHold(
      page,
      `[data-node-id="${attempt.source}"] [data-handle-id="${attempt.sourceHandle}"]`,
      `[data-node-id="${attempt.target}"] [data-handle-id="${attempt.targetHandle}"]`
    )

    return
  }

  if (gesture === 'reconnection') {
    await startAndHold(
      page,
      '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="target"]',
      `[data-node-id="${attempt.target}"] [data-handle-id="${attempt.targetHandle}"]`
    )

    return
  }

  if (gesture === 'resize') {
    await startResizeAndHold(page)

    return
  }

  await startSelectionAndHold(page)
}

const cancelGesture = async (
  page: Page,
  row: CancellationMatrixRow,
  document: typeof interactionLifecycleFixture.document
): Promise<boolean> => {
  switch (row.reason) {
    case 'escape': {
      await page.getByTestId('flow-canvas').focus()
      await page.keyboard.press('Escape')

      return false
    }

    case 'blur': {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')))

      return false
    }

    case 'pointer-cancel':
    case 'capture-loss': {
      await page.evaluate((reason) => {
        // SAFETY: The canvas listener stores the pointer ID of this active gesture.
        const state = globalThis as typeof globalThis & {
          __interactionPointerId: number | undefined
        }

        const pointerId = state.__interactionPointerId

        if (pointerId === undefined) {
          throw new Error('Missing active pointer ID')
        }

        const canvas = globalThis.document.querySelector(
          '[data-testid="flow-canvas"]'
        )

        if (canvas === null) {
          throw new Error('Missing active gesture canvas')
        }

        const eventType =
          reason === 'pointer-cancel' ? 'pointercancel' : 'lostpointercapture'

        canvas.dispatchEvent(
          new PointerEvent(eventType, {
            bubbles: true,
            pointerId,
            pointerType: 'mouse',
          })
        )
      }, row.reason)

      return false
    }

    case 'removal': {
      await page.evaluate((gesture) => {
        const controller = globalThis.flowController

        if (controller === undefined) {
          throw new Error('Missing active gesture controller')
        }

        const { nodes: currentNodes, edges: currentEdges } =
          controller.getSnapshot().document

        let removedNodeId = 'near'

        if (gesture === 'reconnection') {
          removedNodeId = 'target'
        } else if (gesture === 'connection') {
          removedNodeId = 'source'
        }

        const removedNodeIds = new Set([
          removedNodeId,
          ...currentNodes
            .filter((node) => node.parentId === removedNodeId)
            .map((node) => node.id),
        ])

        const nodes = currentNodes.filter(
          (node) => !removedNodeIds.has(node.id)
        )

        const edges = currentEdges.filter(
          (edge) =>
            !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target)
        )

        controller.update({
          nodes,
          edges,
        })
      }, row.gesture)

      return false
    }

    case 'configuration-replacement':
    case 'unmount': {
      await page.evaluate(() => globalThis.flowController?.destroy())
      await expect(page.getByTestId('flow-canvas')).toHaveCount(0)
      await page.mouse.up()
      expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
      await mountCancellationHost(page, document)

      return true
    }

    default: {
      return false
    }
  }
}

test('connection cancellation removes preview and permits a fresh connection', async ({
  page,
}) => {
  await mountLifecycleScenario(page)

  await startAndHold(
    page,
    '[data-node-id="source"] [data-handle-id="out"]',
    '[data-node-id="target"] [data-handle-id="in"]'
  )
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
  await page.getByTestId('flow-canvas').focus()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  await expect(page.locator('.flow-edge-group')).toHaveCount(0)
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])

  await drag(
    page,
    '[data-node-id="source"] [data-handle-id="out"]',
    '[data-node-id="target"] [data-handle-id="in"]'
  )
  await expect(page.locator('.flow-edge-group')).toHaveCount(1)
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toMatchObject([
      { kind: 'edge-add', edge: { source: 'source', target: 'target' } },
    ])
})

test('reconnection cancellation preserves the edge and permits a fresh reconnection', async ({
  page,
}) => {
  await mountLifecycleScenario(page, true)

  const path = page.locator(
    '[data-edge-id="edge"][data-testid="flow-edge-path"]'
  )

  await expect
    .poll(() =>
      page.evaluate(() => {
        const controller = globalThis.flowController

        if (controller === undefined || !controller.nodesInitialized()) {
          return false
        }

        const source = controller.getInternalNode('source')
        const original = controller.getInternalNode('original')

        const out = source?.handles.find(
          (handle) => handle.nodeId === 'source' && handle.handleId === 'out'
        )

        const input = original?.handles.find(
          (handle) => handle.nodeId === 'original' && handle.handleId === 'in'
        )

        return (
          out !== undefined &&
          input !== undefined &&
          out.width > 0 &&
          out.height > 0 &&
          input.width > 0 &&
          input.height > 0
        )
      })
    )
    .toBe(true)

  const originalSnapshot = await page.evaluate(() => {
    const controller = globalThis.flowController

    if (controller === undefined) {
      throw new Error('Mounted public controller is missing')
    }

    return controller.getSnapshot()
  })

  const originalPath = await path.getAttribute('d')

  const anchor =
    '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="target"]'

  await startAndHold(page, anchor, reconnectTargetSelector('target'))
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
  expect(
    await page.evaluate(
      () => globalThis.flowController?.getConnectionPreview() ?? null
    )
  ).toMatchObject({ kind: 'reconnect' })
  await page.getByTestId('flow-canvas').focus()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => globalThis.flowController?.getConnectionPreview() ?? null
    )
  ).toBeNull()
  await expect(path).toHaveAttribute('d', originalPath ?? '')
  expect(
    await page.evaluate(() => {
      const controller = globalThis.flowController

      if (controller === undefined) {
        throw new Error('Mounted public controller is missing after Escape')
      }

      return {
        snapshot: controller.getSnapshot(),
        changes: globalThis.flowChanges,
      }
    })
  ).toStrictEqual({ snapshot: originalSnapshot, changes: [] })

  await drag(page, anchor, reconnectTargetSelector('target'))
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toMatchObject([
      { kind: 'edge-reconnect', edge: { id: 'edge', target: 'target' } },
    ])
  expect(await path.getAttribute('d')).not.toBe(originalPath)
})

test('replacing an edge endpoint handle cancels reconnection before stale release', async ({
  page,
}) => {
  const { reconnectDocument } = interactionLifecycleFixture

  const selectedReconnectDocument = {
    ...reconnectDocument,
    edges: reconnectDocument.edges.map((edge) => ({ ...edge, selected: true })),
  }

  const replacedHandleDocument = {
    ...selectedReconnectDocument,
    nodes: selectedReconnectDocument.nodes.map((node) =>
      node.id === 'target'
        ? {
            ...node,
            handles: [
              {
                id: 'replacement-in',
                kind: 'target' as const,
                side: 'left' as const,
              },
            ],
          }
        : node
    ),
    edges: selectedReconnectDocument.edges.map((edge) =>
      edge.target === 'target'
        ? { ...edge, targetHandle: 'replacement-in' }
        : edge
    ),
  }

  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async (fixtureDocument) => {
    const publicEntry = '/src/public.ts'
    const { mountFlow } = await import(publicEntry)
    const root = globalThis.document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing reconnection handle-replacement host')
    }

    const controller = mountFlow(
      root,
      {
        ...fixtureDocument,
        edges: fixtureDocument.edges.map((edge) => ({
          ...edge,
          selected: true,
        })),
      },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    globalThis.flowChanges = []
    globalThis.flowController = controller
    controller.subscribe((change: FlowChange) =>
      globalThis.flowChanges?.push(change)
    )
  }, selectedReconnectDocument)

  const anchor =
    '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="target"]'

  await startAndHold(
    page,
    anchor,
    reconnectTargetSelector('target-next', 'in-next')
  )
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()

  await page.evaluate((nextDocument) => {
    globalThis.flowController?.update(nextDocument)
  }, replacedHandleDocument)

  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  await expect(
    page.locator('[data-testid="flow-edge-path"][data-edge-id="edge-existing"]')
  ).toHaveAttribute('d', /^M /u)
  await page.mouse.up()
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])
  expect(
    await page.evaluate(() => {
      const edge = globalThis.flowController?.getEdge('edge-existing')

      return { target: edge?.target, targetHandle: edge?.targetHandle }
    })
  ).toStrictEqual({ target: 'target', targetHandle: 'replacement-in' })

  await page.evaluate((nextDocument) => {
    globalThis.flowController?.update(nextDocument)
  }, selectedReconnectDocument)

  await drag(page, anchor, reconnectTargetSelector('target-next', 'in-next'))
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toMatchObject([
      {
        kind: 'edge-reconnect',
        edge: {
          id: 'edge-existing',
          source: 'source',
          sourceHandle: 'out',
          target: 'target-next',
          targetHandle: 'in-next',
        },
      },
    ])
  await expect(
    page.locator('[data-testid="flow-edge-path"][data-edge-id="edge-existing"]')
  ).toBeVisible()
  expect(
    await page.evaluate(() =>
      globalThis.flowController?.getEdge('edge-existing')
    )
  ).toMatchObject({
    id: 'edge-existing',
    source: 'source',
    sourceHandle: 'out',
    target: 'target-next',
    targetHandle: 'in-next',
  })
  expect(await page.evaluate(() => globalThis.flowChanges)).toHaveLength(1)
})

test('click connections remain isolated between two production hosts', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const publicEntry = '/src/public.ts'
    const { mountFlow } = await import(publicEntry)
    const first = document.querySelector<HTMLElement>('#app')

    if (first === null) {
      throw new Error('Missing first flow host')
    }

    const second = document.createElement('div')
    second.dataset.testid = 'second-flow-host'
    document.body.append(second)

    const graph = {
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 100, y: 140 },
          handles: [
            { id: 'out', kind: 'source' as const, side: 'right' as const },
          ],
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 360, y: 140 },
          handles: [
            { id: 'in', kind: 'target' as const, side: 'left' as const },
          ],
        },
      ],
      edges: [],
    }

    const options = {
      documentMode: 'uncontrolled' as const,
      connectOnClick: true,
      viewport: {
        mode: 'uncontrolled' as const,
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    }

    const firstController = mountFlow(first, graph, options)
    const secondController = mountFlow(second, graph, options)

    // SAFETY: These optional fields are initialized immediately before listeners are registered.
    const state = globalThis as typeof globalThis & {
      __firstHostChanges?: FlowChange[]
      __secondHostChanges?: FlowChange[]
    }

    state.__firstHostChanges = []
    state.__secondHostChanges = []
    firstController.subscribe((change: FlowChange) =>
      state.__firstHostChanges?.push(change)
    )
    secondController.subscribe((change: FlowChange) =>
      state.__secondHostChanges?.push(change)
    )
  })

  const firstTarget = '[data-node-id="target"] [data-handle-id="in"]'
  const secondHost = page.getByTestId('second-flow-host')
  await page
    .locator('#app [data-node-id="source"] [data-handle-id="out"]')
    .dispatchEvent('click')
  await expect(
    page.locator('#app [data-testid="flow-connection-preview"]')
  ).toBeVisible()
  await expect(secondHost.getByTestId('flow-connection-preview')).toHaveCount(0)

  await secondHost.locator(firstTarget).dispatchEvent('click')
  await expect(
    page.locator('#app [data-testid="flow-connection-preview"]')
  ).toBeVisible()
  await expect(secondHost.locator('.flow-edge-group')).toHaveCount(0)
  await expect(page.locator('#app .flow-edge-group')).toHaveCount(0)

  await page.locator(`#app ${firstTarget}`).dispatchEvent('click')
  await expect(page.locator('#app .flow-edge-group')).toHaveCount(1)
  // SAFETY: Both arrays were initialized during host setup before listeners ran.
  expect(
    await page.evaluate(
      () =>
        (
          globalThis as typeof globalThis & {
            __firstHostChanges?: FlowChange[]
          }
        ).__firstHostChanges
    )
  ).toHaveLength(1)
  // SAFETY: Both arrays were initialized during host setup before listeners ran.
  expect(
    await page.evaluate(
      () =>
        (
          globalThis as typeof globalThis & {
            __secondHostChanges?: FlowChange[]
          }
        ).__secondHostChanges
    )
  ).toEqual([])
})

test('shared selection fixture drives the production Vanilla pointer path', async ({
  page,
}) => {
  // Each case remounts one browser page and must finish before the next begins.
  // eslint-disable no-await-in-loop
  for (const selectionCase of interactionLifecycleFixture.selectionCases) {
    await page.goto('/')
    await page.evaluate(() =>
      globalThis.dispatchEvent(new Event('beforeunload'))
    )
    await page.evaluate(
      async ({ fixtureDocument, mode }) => {
        const publicEntry = '/src/public.ts'
        const { mountFlow } = await import(publicEntry)
        const root = document.querySelector<HTMLElement>('#app')

        if (root === null) {
          throw new Error('Missing flow host')
        }

        const controller = mountFlow(root, fixtureDocument, {
          documentMode: 'uncontrolled',
          selectionMode: mode,
          viewport: {
            mode: 'uncontrolled',
            initial: { x: 100, y: 100, zoom: 1 },
            limits: { minZoom: 0.5, maxZoom: 2 },
          },
        })

        globalThis.flowChanges = []
        controller.subscribe((change: FlowChange) =>
          globalThis.flowChanges?.push(change)
        )
      },
      {
        fixtureDocument: interactionLifecycleFixture.document,
        mode: selectionCase.mode,
      }
    )

    const bounds = await page.getByTestId('flow-canvas').boundingBox()

    if (bounds === null) {
      throw new Error('Missing Flow canvas bounds')
    }

    const start = {
      x: bounds.x + selectionCase.rect.x + 100,
      y: bounds.y + selectionCase.rect.y + 100,
    }

    const end = {
      x: start.x + selectionCase.rect.width,
      y: start.y + selectionCase.rect.height,
    }

    await page.keyboard.down('Shift')
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 4 })
    await expect(page.getByTestId('flow-selection-rect')).toBeVisible()
    await page.mouse.up()
    await page.keyboard.up('Shift')

    await expect
      .poll(() =>
        page.evaluate(() =>
          globalThis.flowChanges?.find(
            (change) => change.kind === 'selection-set'
          )
        )
      )
      .toMatchObject({ kind: 'selection-set', nodeIds: selectionCase.nodeIds })
  }
  // eslint-enable no-await-in-loop
})

test('shared resize fixture drives the production Vanilla pointer path', async ({
  page,
}) => {
  // Each case remounts one browser page and must finish before the next begins.
  // eslint-disable no-await-in-loop
  for (const resizeCase of interactionLifecycleFixture.resizeCases) {
    await page.goto('/')
    await page.evaluate(() =>
      globalThis.dispatchEvent(new Event('beforeunload'))
    )
    await page.evaluate(async (fixtureDocument) => {
      const publicEntry = '/src/public.ts'
      const { mountFlow } = await import(publicEntry)
      const root = document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing flow host')
      }

      const controller = mountFlow(root, fixtureDocument, {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      })

      globalThis.flowChanges = []
      globalThis.flowController = controller
      controller.subscribe((change: FlowChange) =>
        globalThis.flowChanges?.push(change)
      )
    }, interactionLifecycleFixture.document)

    const handle = page.locator(
      `.flow-node-resize-handle[data-direction="${resizeCase.direction}"]`
    )

    const bounds = await handle.boundingBox()

    if (bounds === null) {
      throw new Error(`Missing resize control: ${resizeCase.direction}`)
    }

    const start = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    }

    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(
      start.x + resizeCase.delta.x,
      start.y + resizeCase.delta.y,
      { steps: 3 }
    )
    await page.mouse.up()

    await expect
      .poll(() =>
        page.evaluate(() =>
          globalThis.flowChanges?.find(
            (change) => change.kind === 'node-bounds'
          )
        )
      )
      .toMatchObject({
        kind: 'node-bounds',
        nodeId: 'near',
        position: resizeCase.position,
        size: resizeCase.size,
        childPositions: [
          { nodeId: 'child', position: resizeCase.childPosition },
        ],
      })

    const accepted = await page.evaluate(() =>
      globalThis.flowController
        ?.getSnapshot()
        .document.nodes.filter((node) => node.parentId === 'near')
        .map((node) => ({ id: node.id, position: node.position }))
    )

    expect(accepted).toStrictEqual([
      { id: 'child', position: resizeCase.childPosition },
    ])
  }
  // eslint-enable no-await-in-loop
})

test('shared connection cases drive the production Vanilla pointer path', async ({
  page,
}) => {
  expect(interactionConnectionCases.map(({ id }) => id)).toStrictEqual([
    'strict-accepted',
    'strict-rejects-opposite-handle-kinds',
    'loose-normalizes-from-target-handle-origin',
    'loose-rejects-target-to-target-rendering-gap',
    'strict-rejects-duplicate',
  ])
  expect(currentNativeConnectionCases).toHaveLength(5)

  for (const [index, scenario] of interactionConnectionCases.entries()) {
    if (scenario.id !== 'loose-rejects-target-to-target-rendering-gap') {
      expect(currentNativeConnectionCases[index]).toStrictEqual(scenario)
    }
  }

  expect(currentNativeConnectionCases[3]).toStrictEqual({
    id: 'loose-accepts-directed-named-target-to-target',
    document: 'connection',
    mode: 'loose',
    connection: {
      source: 'loose-source',
      sourceHandle: 'in',
      target: 'target',
      targetHandle: 'in',
    },
    outcome: 'accepted',
    normalized: {
      source: 'target',
      sourceHandle: 'in',
      target: 'loose-source',
      targetHandle: 'in',
    },
    expectedEdgeId: 'edge-1',
    eventOrder: ['connectStart', 'connect', 'connectEnd'],
  })

  // Each case remounts one page so host state cannot leak between scenarios.
  // eslint-disable no-await-in-loop
  for (const scenario of currentNativeConnectionCases) {
    const fixtureDocument =
      scenario.document === 'duplicate'
        ? interactionLifecycleFixture.duplicateDocument
        : interactionLifecycleFixture.connectionDocument

    await page.goto('/')
    await page.evaluate(() =>
      globalThis.dispatchEvent(new Event('beforeunload'))
    )
    await page.evaluate(
      async ({ fixtureDocument: documentInput, mode }) => {
        const publicEntry = '/src/public.ts'
        const { mountFlow } = await import(publicEntry)
        const root = document.querySelector<HTMLElement>('#app')

        if (root === null) {
          throw new Error('Missing Flow host')
        }

        globalThis.flowController = mountFlow(root, documentInput, {
          documentMode: 'uncontrolled',
          connectionMode: mode === 'loose' ? mode : undefined,
          viewport: {
            mode: 'uncontrolled',
            initial: { x: 0, y: 0, zoom: 1 },
            limits: { minZoom: 0.5, maxZoom: 2 },
          },
        })
      },
      { fixtureDocument, mode: scenario.mode }
    )

    const source = page.locator(
      `.flow-node[data-node-id="${scenario.connection.source}"] .flow-handle[data-handle-id="${scenario.connection.sourceHandle}"]`
    )

    const targetHandle = page.locator(
      `.flow-node[data-node-id="${scenario.connection.target}"] .flow-handle[data-handle-id="${scenario.connection.targetHandle}"]`
    )

    const sourceBounds = await source.boundingBox()
    const targetBounds = await targetHandle.boundingBox()

    if (sourceBounds === null || targetBounds === null) {
      throw new Error(`Missing handles for ${scenario.id}`)
    }

    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      targetBounds.x + targetBounds.width / 2,
      targetBounds.y + targetBounds.height / 2,
      { steps: 5 }
    )
    await page.mouse.up()

    let expectedEdges: readonly unknown[] = []

    if (scenario.outcome === 'accepted') {
      expectedEdges = [scenario.normalized]
    } else if (scenario.document === 'duplicate') {
      expectedEdges = interactionLifecycleFixture.duplicateDocument.edges.map(
        ({
          source: sourceId,
          sourceHandle,
          target: targetId,
          targetHandle: targetHandleId,
        }) => ({
          source: sourceId,
          sourceHandle,
          target: targetId,
          targetHandle: targetHandleId,
        })
      )
    }

    await expect
      .poll(() =>
        page.evaluate(() =>
          globalThis.flowController?.getEdges().map((edge) => ({
            source: edge.source,
            sourceHandle: edge.sourceHandle,
            target: edge.target,
            targetHandle: edge.targetHandle,
          }))
        )
      )
      .toEqual(expectedEdges)
  }
  // eslint-enable no-await-in-loop
})

test('Vanilla connection creation applies defaults below connection fields', async ({
  page,
}) => {
  const [scenario] = interactionConnectionCases

  if (scenario === undefined) {
    throw new Error('Missing connection fixture')
  }

  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async (documentInput) => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing Flow host')
    }

    globalThis.flowController = mountFlow(root, documentInput, {
      documentMode: 'uncontrolled',
      defaultEdgeOptions: { label: 'Default connection', strokeWidth: 4 },
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    })
  }, interactionLifecycleFixture.connectionDocument)

  await drag(
    page,
    `.flow-node[data-node-id="${scenario.connection.source}"] .flow-handle[data-handle-id="${scenario.connection.sourceHandle}"]`,
    `.flow-node[data-node-id="${scenario.connection.target}"] .flow-handle[data-handle-id="${scenario.connection.targetHandle}"]`
  )
  await expect
    .poll(() => page.evaluate(() => globalThis.flowController?.getEdges()))
    .toHaveLength(1)

  const edge = await page.evaluate(
    () => globalThis.flowController?.getEdges()[0]
  )

  expect(edge).toMatchObject({
    id: expect.any(String),
    source: scenario.connection.source,
    target: scenario.connection.target,
    label: 'Default connection',
    strokeWidth: 4,
  })
})

test('custom connection preview receives production candidate state and cleanup', async ({
  page,
}) => {
  const documentInput = interactionLifecycleFixture.connectionDocument

  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async (nextDocument) => {
    const publicEntry = '/src/public.ts'
    const { mountFlow } = await import(publicEntry)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing custom preview host')
    }

    globalThis.flowChanges = []

    const controller = mountFlow(root, nextDocument, {
      documentMode: 'controlled',
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
      connectionPreview: (
        state: ConnectionPreviewState | null,
        container: SVGSVGElement
      ) => {
        container.querySelector('[data-custom-preview]')?.remove()

        if (state === null) {
          document.body.dataset.customPreviewState = 'cleared'

          return
        }

        document.body.dataset.customPreviewState = JSON.stringify(state)

        const path = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path'
        )

        path.dataset.customPreview = 'true'
        path.dataset.valid = String(state.valid)
        path.setAttribute(
          'd',
          `M ${state.from.x},${state.from.y} L ${state.to.x},${state.to.y}`
        )
        container.append(path)
      },
    })

    controller.subscribe((change: FlowChange) =>
      globalThis.flowChanges?.push(change)
    )
    globalThis.flowController = controller
    globalThis.flowPreviewNotifications = []
    controller.subscribeConnectionPreview(
      (preview: ConnectionPreviewSnapshot) =>
        globalThis.flowPreviewNotifications?.push(preview)
    )
  }, documentInput)

  const source =
    '.flow-node[data-node-id="source"] .flow-handle[data-handle-id="out"]'

  const target =
    '.flow-node[data-node-id="target"] .flow-handle[data-handle-id="in"]'

  expect(
    await page.evaluate(
      () => globalThis.flowController?.getConnectionPreview() ?? null
    )
  ).toBeNull()

  await startAndHold(page, source, target)
  await expect(page.locator('[data-custom-preview]')).toHaveAttribute(
    'data-valid',
    'true'
  )

  const activeState = await page
    .locator('body')
    .getAttribute('data-custom-preview-state')

  expect(activeState).toContain('"kind":"connect"')
  expect(activeState).toContain('"target":"target"')

  const apiPreview = await page.evaluate(() => {
    const preview = globalThis.flowController?.getConnectionPreview() ?? null

    return {
      preview,
      frozen: preview !== null && Object.isFrozen(preview),
    }
  })

  expect(apiPreview.preview).toMatchObject({ kind: 'connect', valid: true })
  expect(apiPreview.frozen).toBe(true)
  expect(
    await page.evaluate(() => globalThis.flowPreviewNotifications)
  ).toContainEqual(expect.objectContaining({ kind: 'connect', valid: true }))
  await page.mouse.up()
  await expect
    .poll(() =>
      page.evaluate(
        () => globalThis.flowController?.getConnectionPreview() ?? null
      )
    )
    .toBeNull()
  await expect(page.locator('[data-custom-preview]')).toHaveCount(0)
  await expect(page.locator('body')).toHaveAttribute(
    'data-custom-preview-state',
    'cleared'
  )
  expect(
    await page.evaluate(() => globalThis.flowPreviewNotifications)
  ).toContain(null)
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toMatchObject([{ kind: 'edge-add' }])
  expect(
    await page.evaluate(() => globalThis.flowController?.getEdges())
  ).toEqual([])
  await page.evaluate(() => {
    globalThis.flowChanges = []
  })

  await startAndHold(page, source, target)
  await expect(page.locator('[data-custom-preview]')).toHaveAttribute(
    'data-valid',
    'true'
  )
  await page.locator('[data-testid="flow-canvas"]').focus()
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(page.locator('[data-custom-preview]')).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toHaveLength(0)

  await startAndHold(page, source, target)
  await expect(page.locator('[data-custom-preview]')).toHaveCount(1)
  await page.evaluate(() => globalThis.flowController?.destroy())
  expect(
    await page.evaluate(() => globalThis.flowController?.getConnectionPreview())
  ).toBeNull()
  await expect(page.locator('[data-custom-preview]')).toHaveCount(0)
  await expect(page.locator('body')).toHaveAttribute(
    'data-custom-preview-state',
    'cleared'
  )

  const notificationsAtDestroy = await page.evaluate(
    () => globalThis.flowPreviewNotifications?.length ?? 0
  )

  await page.mouse.up()
  expect(
    await page.evaluate(() => globalThis.flowPreviewNotifications?.length ?? 0)
  ).toBe(notificationsAtDestroy)
})

for (const row of cancellationMatrix) {
  test(`${row.gesture} cancellation by ${row.reason} permits one fresh accepted gesture`, async ({
    page,
  }) => {
    const fixtureCase = row.fixtureCase ?? interactionCancellationRetryCases[0]

    if (fixtureCase === undefined) {
      throw new Error('Missing shared cancellation/retry fixture case')
    }

    const document = documentForGesture(row.gesture)
    const { attempt } = fixtureCase
    let { retry } = fixtureCase

    if (row.gesture === 'connection') {
      retry = row.fixtureCase?.retry ?? retry
    }

    if (row.gesture === 'reconnection') {
      retry = { ...retry, target: 'target-next', targetHandle: 'in-next' }
    }

    await mountCancellationHost(page, document)
    await startCancellationGesture(page, row.gesture, attempt)

    if (row.gesture === 'connection' || row.gesture === 'reconnection') {
      await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
    } else if (row.gesture === 'resize') {
      await expect(
        page.locator('.flow-node[data-node-id="near"].resizing')
      ).toBeVisible()
    } else {
      await expect(page.getByTestId('flow-selection-rect')).toBeVisible()
    }

    const replacedHost = await cancelGesture(page, row, document)
    await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
    await expect(page.getByTestId('flow-selection-rect')).toHaveCount(0)
    await expect(page.locator('.flow-node.resizing')).toHaveCount(0)

    if (!replacedHost) {
      await page.mouse.up()
    }

    if (row.gesture === 'selection') {
      await page.keyboard.up('Shift')
    }

    expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([])

    if (row.reason === 'removal') {
      await page.evaluate((restoreDocument) => {
        globalThis.flowController?.update(restoreDocument)
      }, document)
    }

    await startCancellationGesture(page, row.gesture, retry)
    await page.mouse.up()

    if (row.gesture === 'selection') {
      await page.keyboard.up('Shift')
      await expect
        .poll(() =>
          page.evaluate(() =>
            globalThis.flowChanges?.filter(
              (change) => change.kind === 'selection-set'
            )
          )
        )
        .toHaveLength(1)
    } else if (row.gesture === 'connection') {
      await expect
        .poll(() => page.evaluate(() => globalThis.flowChanges))
        .toMatchObject([
          {
            kind: 'edge-add',
            edge: {
              id: fixtureCase.expectedRetryEdgeId,
              source: retry.source,
              target: retry.target,
            },
          },
        ])
    } else if (row.gesture === 'reconnection') {
      await expect
        .poll(() => page.evaluate(() => globalThis.flowChanges))
        .toMatchObject([
          {
            kind: 'edge-reconnect',
            edge: {
              id: 'edge-existing',
              target: 'target-next',
              targetHandle: 'in-next',
            },
          },
        ])
    } else {
      await expect
        .poll(() => page.evaluate(() => globalThis.flowChanges))
        .toMatchObject([{ kind: 'node-bounds', nodeId: 'near' }])
    }

    const acceptedChanges = await page.evaluate(() => globalThis.flowChanges)

    if (row.gesture === 'selection') {
      expect(acceptedChanges?.map((change) => change.kind)).toContain(
        'selection-set'
      )
      expect(
        acceptedChanges?.every(
          (change) =>
            change.kind === 'selection-set' || change.kind === 'viewport'
        )
      ).toBe(true)
    } else {
      expect(acceptedChanges).toHaveLength(1)
    }
  })
}
