import type * as CoreModule from '@flow/core'
import { expect, test } from '@playwright/test'

import type * as HostModule from '../src/public.ts'

declare global {
  interface Window {
    __publicStateController?: HostModule.JavaScriptFlowController
    __flowCancelState?: CoreModule.FlowStateChange[]
    __flowCancelController?: HostModule.JavaScriptFlowController
  }
}

test('JavaScript controller exposes immutable accepted state and subscriptions', async ({
  page,
}) => {
  await page.goto('/')

  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    window.__publicStateController = await createFlow(
      root,
      {
        nodes: [
          {
            id: 'parent',
            label: 'Parent',
            position: { x: 10, y: 20 },
            hidden: true,
          },
          {
            id: 'child',
            label: 'Child',
            position: { x: 3, y: 4 },
            parentId: 'parent',
          },
          { id: 'culled', label: 'Culled', position: { x: 5000, y: 5000 } },
        ],
        edges: [
          {
            id: 'hidden-edge',
            source: 'parent',
            target: 'child',
            hidden: true,
          },
        ],
      },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: -4500, y: -4500, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
        renderOnlyVisible: true,
      }
    )
  })

  await page.waitForFunction(() => {
    const culledNode = document.querySelector<HTMLElement>(
      '[data-node-id="culled"]'
    )

    return culledNode?.dataset.measuredWidth !== undefined
  })
  await page.evaluate(() =>
    window.__publicStateController?.updateViewport({ x: 0, y: 0, zoom: 1 })
  )
  await expect(page.locator('[data-node-id="culled"]')).toHaveCount(0)

  const result = await page.evaluate(() => {
    const controller = window.__publicStateController
    const root = document.querySelector<HTMLElement>('#app')

    if (controller === undefined || root === null) {
      throw new Error('Missing state controller or root')
    }

    const initial = controller.getSnapshot()
    const seen: { before: number; after: number; cause: string }[] = []

    const stop = controller.subscribeState(({ previous, current, cause }) => {
      seen.push({
        before: previous.document.nodes.length,
        after: current.document.nodes.length,
        cause,
      })
    })

    const culledRead = controller.getNode('culled') !== undefined
    const missingNode = controller.getNode('absent') === undefined
    const missingEdge = controller.getEdge('absent') === undefined
    const childPosition = controller.getNode('child')?.position
    const [parent] = initial.document.nodes

    if (parent === undefined) {
      throw new Error('Missing parent snapshot')
    }

    let mutationBlocked = false

    try {
      mutationBlocked = !Reflect.set(parent, 'label', 'mutated')
    } catch {
      mutationBlocked = true
    }

    const protectedRead = controller.getNode('parent')?.label === 'Parent'
    controller.update({
      nodes: [
        { id: 'replacement', label: 'Replacement', position: { x: 50, y: 60 } },
      ],
      edges: [],
    })
    controller.update({
      nodes: [
        { id: 'replacement', label: 'Replacement', position: { x: 50, y: 60 } },
      ],
      edges: [],
    })
    controller.updateViewport({ x: 4, y: 5, zoom: 1.25 })
    const latest = controller.getSnapshot()
    stop()
    controller.updateViewport({ x: 7, y: 8, zoom: 1.5 })
    const afterUnsubscribe = seen.length
    controller.destroy()

    return {
      initialNodeCount: initial.document.nodes.length,
      initialEdgeCount: initial.document.edges.length,
      initialSnapshotFrozen: Object.isFrozen(initial.document.nodes[0]),
      hiddenRead: initial.document.nodes[0]?.hidden === true,
      culledRead,
      childPosition,
      missingNode,
      missingEdge,
      protectedRead,
      mutationBlocked,
      seen,
      afterUnsubscribe,
      latestNodeId: latest.document.nodes[0]?.id,
      latestViewport: latest.viewport,
      canvasCountAfterDestroy: root.querySelectorAll(
        '[data-testid="flow-canvas"]'
      ).length,
    }
  })

  expect(result).toMatchObject({
    initialNodeCount: 3,
    initialEdgeCount: 1,
    initialSnapshotFrozen: true,
    hiddenRead: true,
    culledRead: true,
    childPosition: { x: 3, y: 4 },
    missingNode: true,
    missingEdge: true,
    protectedRead: true,
    mutationBlocked: true,
    seen: [
      { before: 3, after: 1, cause: 'document-update' },
      { before: 1, after: 1, cause: 'viewport-update' },
    ],
    afterUnsubscribe: 2,
    latestNodeId: 'replacement',
    latestViewport: { x: 4, y: 5, zoom: 1.25 },
    canvasCountAfterDestroy: 0,
  })
})

test('state listeners isolate failures, queue reentrant updates, and stop on destroy', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const controller = await createFlow(
      root,
      { nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 0 } }], edges: [] },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    const order: string[] = []
    controller.subscribeState(({ current }: CoreModule.FlowStateChange) => {
      const label = current.document.nodes[0]?.label ?? 'missing'
      order.push(`first:${label}`)

      if (label === 'B') {
        controller.update({
          nodes: [{ id: 'c', label: 'C', position: { x: 2, y: 2 } }],
          edges: [],
        })
      }
    })
    controller.subscribeState(({ current }: CoreModule.FlowStateChange) => {
      order.push(`second:${current.document.nodes[0]?.label ?? 'missing'}`)
    })
    controller.subscribeState(() => {
      throw new Error('listener failure is isolated')
    })
    controller.subscribeState(({ current }: CoreModule.FlowStateChange) => {
      order.push(`after-error:${current.document.nodes[0]?.label ?? 'missing'}`)
    })
    controller.update({
      nodes: [{ id: 'b', label: 'B', position: { x: 1, y: 1 } }],
      edges: [],
    })
    const finalLabel = controller.getNodes()[0]?.label
    let afterDestroy = 0
    controller.subscribeState(() => {
      afterDestroy += 1
    })
    controller.destroy()
    controller.update({ nodes: [], edges: [] })

    return { order, finalLabel, afterDestroy }
  })

  expect(result.order).toEqual([
    'first:B',
    'second:B',
    'after-error:B',
    'first:C',
    'second:C',
    'after-error:C',
  ])
  expect(result.finalLabel).toBe('C')
  expect(result.afterDestroy).toBe(0)
})

test('controlled proposals stay pending until acknowledgement; hosts are isolated', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const options = {
      documentMode: 'controlled' as const,
      viewport: {
        mode: 'uncontrolled' as const,
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    }

    const first = await createFlow(
      root,
      {
        nodes: [{ id: 'node', label: 'Node', position: { x: 0, y: 0 } }],
        edges: [],
      },
      options
    )

    const secondRoot = document.createElement('div')
    document.body.append(secondRoot)

    const second = await createFlow(
      secondRoot,
      {
        nodes: [{ id: 'other', label: 'Other', position: { x: 2, y: 2 } }],
        edges: [],
      },
      options
    )

    const thirdRoot = document.createElement('div')
    document.body.append(thirdRoot)

    const uncontrolled = await createFlow(
      thirdRoot,
      {
        nodes: [{ id: 'free', label: 'Free', position: { x: 0, y: 0 } }],
        edges: [],
      },
      { ...options, documentMode: 'uncontrolled' }
    )

    const sequence: string[] = []
    first.subscribe((change: CoreModule.FlowChange) =>
      sequence.push(`proposal:${change.kind}`)
    )
    first.subscribeState(({ current }: CoreModule.FlowStateChange) =>
      sequence.push(`accepted:${current.document.nodes[0]?.position.x}`)
    )
    uncontrolled.subscribe((change: CoreModule.FlowChange) =>
      sequence.push(`uncontrolled-proposal:${change.kind}`)
    )
    uncontrolled.subscribeState(({ current }: CoreModule.FlowStateChange) =>
      sequence.push(
        `uncontrolled-accepted:${current.document.nodes[0]?.position.x}`
      )
    )
    first.dispatch({
      kind: 'set-node-position',
      nodeId: 'node',
      position: { x: 40, y: 50 },
    })
    const pendingPosition = first.getNode('node')?.position
    const eventsBeforeAck = sequence.length
    first.update({
      nodes: [{ id: 'node', label: 'Node', position: { x: 40, y: 50 } }],
      edges: [],
    })
    const firstPositionAfterAck = first.getNode('node')?.position
    const secondPositionUnaffected = second.getNode('other')?.position
    uncontrolled.dispatch({
      kind: 'set-node-position',
      nodeId: 'free',
      position: { x: 10, y: 11 },
    })
    first.destroy()
    second.destroy()
    uncontrolled.destroy()
    secondRoot.remove()
    thirdRoot.remove()

    return {
      sequence,
      pendingPosition,
      eventsBeforeAck,
      firstPositionAfterAck,
      secondPositionUnaffected,
      uncontrolledPosition: uncontrolled.getNode('free')?.position,
    }
  })

  expect(result.pendingPosition).toEqual({ x: 0, y: 0 })
  expect(result.eventsBeforeAck).toBe(1)
  expect(result.sequence).toEqual([
    'proposal:node-position',
    'accepted:40',
    'uncontrolled-proposal:node-position',
    'uncontrolled-accepted:10',
  ])
  expect(result.firstPositionAfterAck).toEqual({ x: 40, y: 50 })
  expect(result.secondPositionUnaffected).toEqual({ x: 2, y: 2 })
  expect(result.uncontrolledPosition).toEqual({ x: 10, y: 11 })
})

test('canceling a rendered drag does not publish an accepted state change', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const controller = await createFlow(
      root,
      {
        nodes: [
          { id: 'dragged', label: 'Dragged', position: { x: 100, y: 100 } },
        ],
        edges: [],
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

    const stateChanges: CoreModule.FlowStateChange[] = []
    controller.subscribeState((change: CoreModule.FlowStateChange) =>
      stateChanges.push(change)
    )
    window.__flowCancelState = stateChanges
    window.__flowCancelController = controller
  })

  const node = page.locator('[data-node-id="dragged"]')
  const bounds = await node.boundingBox()
  expect(bounds).not.toBeNull()

  if (bounds === null) {
    throw new Error('Missing rendered drag node')
  }

  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 40,
    bounds.y + bounds.height / 2 + 30
  )
  await page.keyboard.press('Escape')

  const result = await page.evaluate(() => {
    const position = window.__flowCancelController?.getNode('dragged')?.position
    const eventCount = window.__flowCancelState?.length
    window.__flowCancelController?.destroy()

    return { position, eventCount }
  })

  expect(result.position).toEqual({ x: 100, y: 100 })
  expect(result.eventCount).toBe(0)
})
