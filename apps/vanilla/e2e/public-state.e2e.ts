import type { FlowEdge, FlowNodeConnection } from '@flow/core'
import type * as CoreModule from '@flow/core'
import { expect, test } from '@playwright/test'

import { runKeyPressObserverContract } from '../../shared-e2e/key-press-observer-contract.ts'
import { rendererContractFixture } from '../../shared-e2e/renderer-contract.ts'
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
            data: { tag: 'parent' },
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

  const result = await page.evaluate(async () => {
    const controller = window.__publicStateController
    const root = document.querySelector<HTMLElement>('#app')

    if (controller === undefined || root === null) {
      throw new Error('Missing state controller or root')
    }

    const initial = controller.getSnapshot()
    const savedSession = controller.getSavedSession()
    const restoreProposal = await controller.prepareRestore(savedSession)
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
    const selectedData = controller.getNodesData(['child', 'parent', 'absent'])

    const selectedConnections = controller.getNodeConnections({
      nodeId: 'parent',
    })

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
    controller.update(restoreProposal.document)
    controller.updateViewport(restoreProposal.viewport)
    const restored = controller.getSnapshot()
    controller.destroy()

    return {
      initialNodeCount: initial.document.nodes.length,
      initialEdgeCount: initial.document.edges.length,
      savedSession,
      restoreProposal: {
        document: restoreProposal.document,
        viewport: restoreProposal.viewport,
        frozen: Object.isFrozen(restoreProposal.document.nodes),
      },
      initialSnapshotFrozen: Object.isFrozen(initial.document.nodes[0]),
      hiddenRead: initial.document.nodes[0]?.hidden === true,
      culledRead,
      childPosition,
      missingNode,
      missingEdge,
      protectedRead,
      selectedData,
      selectedConnections,
      mutationBlocked,
      seen,
      afterUnsubscribe,
      latestNodeId: latest.document.nodes[0]?.id,
      latestViewport: latest.viewport,
      acknowledgedRestore: {
        document: restored.document,
        viewport: restored.viewport,
      },
      canvasCountAfterDestroy: root.querySelectorAll(
        '[data-testid="flow-canvas"]'
      ).length,
    }
  })

  expect(result).toMatchObject({
    initialNodeCount: 3,
    initialEdgeCount: 1,
    savedSession: {
      version: 1,
      document: {
        nodes: [
          {
            id: 'parent',
            label: 'Parent',
            position: { x: 10, y: 20 },
            hidden: true,
            data: { tag: 'parent' },
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
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    restoreProposal: {
      document: {
        nodes: [
          expect.objectContaining({ id: 'parent', data: { tag: 'parent' } }),
          expect.objectContaining({ id: 'child', parentId: 'parent' }),
          expect.objectContaining({ id: 'culled' }),
        ],
        edges: [expect.objectContaining({ id: 'hidden-edge' })],
      },
      viewport: { x: 0, y: 0, zoom: 1 },
      frozen: true,
    },
    initialSnapshotFrozen: true,
    hiddenRead: true,
    culledRead: true,
    childPosition: { x: 3, y: 4 },
    missingNode: true,
    missingEdge: true,
    protectedRead: true,
    selectedData: [
      { id: 'child', type: undefined, data: undefined },
      { id: 'parent', type: undefined, data: { tag: 'parent' } },
    ],
    selectedConnections: [
      {
        edgeId: 'hidden-edge',
        source: 'parent',
        target: 'child',
        sourceHandle: undefined,
        targetHandle: undefined,
      },
    ],
    mutationBlocked: true,
    seen: [
      { before: 3, after: 1, cause: 'document-update' },
      { before: 1, after: 1, cause: 'viewport-update' },
    ],
    afterUnsubscribe: 2,
    latestNodeId: 'replacement',
    latestViewport: { x: 4, y: 5, zoom: 1.25 },
    acknowledgedRestore: {
      document: {
        nodes: [
          expect.objectContaining({ id: 'parent' }),
          expect.objectContaining({ id: 'child' }),
          expect.objectContaining({ id: 'culled' }),
        ],
        edges: [expect.objectContaining({ id: 'hidden-edge' })],
      },
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    canvasCountAfterDestroy: 0,
  })
  expect(result.acknowledgedRestore.document).toEqual(
    result.restoreProposal.document
  )
  expect(result.acknowledgedRestore.viewport).toEqual(
    result.restoreProposal.viewport
  )
})

test('Vanilla renderer projects edge defaults below stored edge fields', async ({
  page,
}) => {
  const fixture = {
    ...rendererContractFixture.document,
    edges: rendererContractFixture.document.edges.map((edge) => {
      if (edge.id === 'edge-straight') {
        const edgeWithoutLabel = { ...edge }
        Reflect.deleteProperty(edgeWithoutLabel, 'label')

        return edgeWithoutLabel
      }

      if (edge.id === 'edge-bezier') {
        return { ...edge, stroke: '#123456' }
      }

      return edge
    }),
  }

  await page.goto('/')
  await page.evaluate(async (documentInput) => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    root.replaceChildren()
    mountFlow(root, documentInput, {
      documentMode: 'uncontrolled',
      defaultEdgeOptions: {
        label: 'Default label',
        stroke: '#abcdef',
        strokeWidth: 3,
      },
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    })
  }, fixture)

  await page.waitForFunction(() => {
    const source = document.querySelector<HTMLElement>(
      '[data-node-id="source"]'
    )

    return source?.dataset.measuredWidth !== undefined
  })

  await expect(
    page.locator(
      '[data-testid="flow-edge-label"][data-edge-id="edge-straight"]'
    )
  ).toHaveText('Default label')
  await expect(
    page.locator('[data-testid="flow-edge-label"][data-edge-id="edge-bezier"]')
  ).toHaveText('Bezier')

  await expect(
    page.locator('[data-edge-id="edge-straight"] path.flow-edge-path')
  ).toHaveAttribute('stroke', '#abcdef')
  await expect(
    page.locator('[data-edge-id="edge-bezier"] path.flow-edge-path')
  ).toHaveAttribute('stroke', '#123456')
})

test('controlled Vanilla restore waits for owner document and viewport acknowledgement', async ({
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
      {
        nodes: [
          { id: 'restore-node', label: 'Saved', position: { x: 10, y: 20 } },
        ],
        edges: [],
      },
      {
        documentMode: 'controlled',
        viewport: {
          mode: 'controlled',
          initial: { x: 5, y: 6, zoom: 1.25 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    const acceptedBeforeRestore = controller.getSnapshot()
    const savedSession = controller.getSavedSession()

    const restoreSession = {
      version: savedSession.version,
      document: {
        nodes: [
          {
            id: 'proposal-node',
            label: 'Restored proposal',
            position: { x: 32, y: 44 },
            data: { marker: 'from-saved-session' },
          },
        ],
        edges: [],
      },
      viewport: { x: -25, y: 30, zoom: 1.75 },
    }

    const proposal = await controller.prepareRestore(restoreSession)
    const beforeOwnerAck = controller.getSnapshot()

    controller.update({
      nodes: [
        { id: 'drift-node', label: 'Drift', position: { x: 90, y: 100 } },
      ],
      edges: [],
    })
    controller.updateViewport({ x: 80, y: 90, zoom: 1.5 })

    const diverged = controller.getSnapshot()

    controller.update(proposal.document)
    controller.updateViewport(proposal.viewport)

    const acknowledged = controller.getSnapshot()
    controller.destroy()

    return {
      proposal: { document: proposal.document, viewport: proposal.viewport },
      acceptedBeforeRestore: {
        document: acceptedBeforeRestore.document,
        viewport: acceptedBeforeRestore.viewport,
      },
      beforeOwnerAck: {
        document: beforeOwnerAck.document,
        viewport: beforeOwnerAck.viewport,
      },
      diverged: { document: diverged.document, viewport: diverged.viewport },
      acknowledged: {
        document: acknowledged.document,
        viewport: acknowledged.viewport,
      },
    }
  })

  expect(result.beforeOwnerAck).toEqual(result.acceptedBeforeRestore)
  expect(result.proposal).not.toEqual(result.acceptedBeforeRestore)
  expect(result.diverged).not.toEqual(result.proposal)
  expect(result.acknowledged).toEqual(result.proposal)
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

test('Vanilla key and selection observers follow their controller owner', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const { createFlow } = await import('../src/public.ts')
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const controller = await createFlow(
      root,
      {
        nodes: [
          { id: 'selectable', label: 'Selectable', position: { x: 0, y: 0 } },
        ],
        edges: [],
      },
      {
        documentMode: 'controlled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    const selections: string[] = []

    const stopSelection = controller.subscribeSelection(({ nodes, edges }) => {
      selections.push(
        `${nodes.map(({ id }) => id).join(',')}|${edges.map(({ id }) => id).join(',')}`
      )
    })

    const proposal = await controller.applyEdit({
      operations: [
        {
          kind: 'update-node',
          nodeId: 'selectable',
          patch: { selected: true },
        },
      ],
    })

    const beforeAcknowledgement = [...selections]
    controller.update(proposal.document)
    const afterAcknowledgement = [...selections]

    const keyTarget = document.createElement('div')
    const input = document.createElement('input')
    const noKey = document.createElement('div')
    noKey.className = 'nokey'
    const noKeyChild = document.createElement('span')
    noKey.append(noKeyChild)
    keyTarget.append(input, noKey)
    document.body.append(keyTarget)
    const keyStates: boolean[] = []

    const stopKey = controller.observeKeyPress(
      'x',
      { target: keyTarget },
      (pressed) => keyStates.push(pressed)
    )

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true })
    )
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'x',
        code: 'KeyX',
        bubbles: true,
      })
    )
    noKeyChild.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'x',
        code: 'KeyX',
        bubbles: true,
      })
    )
    const afterSuppressed = [...keyStates]

    const modifiedInputKey = new KeyboardEvent('keydown', {
      key: 'x',
      code: 'KeyX',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })

    input.dispatchEvent(modifiedInputKey)
    input.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'x', code: 'KeyX', bubbles: true })
    )
    const beforeDestroy = [...keyStates]
    controller.destroy()
    keyTarget.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true })
    )
    stopKey()
    stopSelection()
    keyTarget.remove()

    return {
      beforeAcknowledgement,
      afterAcknowledgement,
      keyStates: beforeDestroy,
      afterSuppressed,
      modifiedInputPrevented: modifiedInputKey.defaultPrevented,
      afterDestroy: keyStates,
    }
  })

  expect(result.beforeAcknowledgement).toEqual(['|'])
  expect(result.afterAcknowledgement).toEqual(['|', 'selectable|'])
  expect(result.keyStates).toEqual([false, true, false])
  expect(result.afterSuppressed).toEqual([false])
  expect(result.modifiedInputPrevented).toBe(true)
  expect(result.afterDestroy).toEqual([false, true, false])
})

test('Vanilla controller key observer follows the pinned keyboard contract', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const { createFlow } = await import('../src/public.ts')
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const controller = await createFlow(
      root,
      { nodes: [], edges: [] },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    const logs = new Map<string, boolean[]>()

    const stops = new Map<string, () => void>()

    const api = {
      observe: (
        id: string,
        keyCode: string | readonly string[] | null,
        options: {
          readonly target?: Window | Document | HTMLElement | ShadowRoot | null
          readonly actInsideInputWithModifier?: boolean
          readonly preventDefault?: boolean
        }
      ) => {
        stops.get(id)?.()
        const states: boolean[] = []
        logs.set(id, states)
        stops.set(
          id,
          controller.observeKeyPress(keyCode, options, (pressed) => {
            states.push(pressed)
          })
        )
      },
      states: (id: string) => [...(logs.get(id) ?? [])],
      unsubscribe: (id: string) => {
        stops.get(id)?.()
        stops.delete(id)
      },
      disposeOwner: () => controller.destroy(),
    }

    Object.assign(window, { __flowKeyPressContract: api })
  })

  const result = await page.evaluate(
    runKeyPressObserverContract,
    '__flowKeyPressContract'
  )

  expect(result.explicitTarget).toEqual([false, true, false])
  expect(result.defaultTarget).toEqual([false, true, false])
  expect(result.combinations).toEqual([false, true, false, true, false])
  expect(result.codeMatch).toEqual([false, true, false])
  expect(result.keyMatch).toEqual([false, true, false])
  expect(result.noPreventDefault).toBe(false)
  expect(result.modifiedInputWithoutAllowance).toEqual([false])
  expect(result.buttonPreventDefault).toBe(false)
  expect(result.anchorPreventDefault).toBe(false)
  expect(result.foreignAnchorPreventDefault).toBe(false)
  expect(result.foreignEditableSuppression).toEqual([false])
  expect(result.blurReset).toEqual([false, true, false])
  expect(result.contextMenuReset).toEqual([false, true, false])
  expect(result.metaCleanup).toEqual([false, true, false])
  expect(result.metaHeldBeforeRelease).toEqual([false, true])
  expect(result.unsubscribe).toEqual([false, true])
  expect(result.ownerDispose).toEqual([false, true])
})

test('Vanilla public controller reads directional handle connections', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const { createFlow } = await import('../src/public.ts')
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const controller = await createFlow(
      root,
      {
        nodes: [
          {
            id: 'source',
            label: 'Source',
            position: { x: 0, y: 0 },
            handles: [
              { id: 'out-a', kind: 'source', side: 'right' },
              { id: 'out-b', kind: 'source', side: 'right' },
              { id: 'in-a', kind: 'target', side: 'left' },
            ],
          },
          {
            id: 'target',
            label: 'Target',
            position: { x: 200, y: 0 },
            handles: [
              { id: 'out-t', kind: 'source', side: 'right' },
              { id: 'in-a', kind: 'target', side: 'left' },
              { id: 'in-b', kind: 'target', side: 'left' },
            ],
          },
          {
            id: 'other',
            label: 'Other',
            position: { x: 400, y: 0 },
          },
        ],
        edges: [
          {
            id: 'source-a',
            source: 'source',
            target: 'target',
            sourceHandle: 'out-a',
            targetHandle: 'in-a',
          },
          {
            id: 'source-b',
            source: 'source',
            target: 'target',
            sourceHandle: 'out-b',
            targetHandle: 'in-b',
          },
          {
            id: 'incoming-source',
            source: 'other',
            target: 'source',
            targetHandle: 'in-a',
          },
          {
            id: 'outgoing-target',
            source: 'target',
            target: 'other',
            sourceHandle: 'out-t',
          },
        ],
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

    const ids = (query: {
      readonly nodeId: string
      readonly type: 'source' | 'target'
      readonly id?: string | null
    }) => controller.getHandleConnections(query).map(({ id }) => id)

    const handleConnectionIds = {
      sourceExplicit: ids({ nodeId: 'source', type: 'source', id: 'out-a' }),
      sourceNull: ids({ nodeId: 'source', type: 'source', id: null }),
      sourceEmpty: ids({ nodeId: 'source', type: 'source', id: '' }),
      sourceOmitted: ids({ nodeId: 'source', type: 'source' }),
      targetExplicit: ids({ nodeId: 'target', type: 'target', id: 'in-b' }),
      targetNull: ids({ nodeId: 'target', type: 'target', id: null }),
      incoming: ids({ nodeId: 'source', type: 'target' }),
      outgoing: ids({ nodeId: 'target', type: 'source' }),
      zeroMatch: ids({ nodeId: 'target', type: 'target', id: 'missing' }),
    }

    controller.destroy()

    return handleConnectionIds
  })

  expect(result).toEqual({
    sourceExplicit: ['source-a'],
    sourceNull: ['source-a', 'source-b'],
    sourceEmpty: ['source-a', 'source-b'],
    sourceOmitted: ['source-a', 'source-b'],
    targetExplicit: ['source-b'],
    targetNull: ['source-a', 'source-b'],
    incoming: ['incoming-source'],
    outgoing: ['outgoing-target'],
    zeroMatch: [],
  })
})

test('Vanilla node connection observer reports only accepted deltas and disposes', async ({
  page,
}) => {
  await page.goto('/')

  const events = await page.evaluate(async () => {
    const publicEntry = ['', 'src', 'public.ts'].join('/')
    const { createFlow } = await import(publicEntry)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const initial = {
      nodes: [
        { id: 'a', label: 'A', position: { x: 0, y: 0 } },
        { id: 'b', label: 'B', position: { x: 20, y: 0 } },
        { id: 'c', label: 'C', position: { x: 40, y: 0 } },
      ],
      edges: [{ id: 'ab', source: 'a', target: 'b' }],
    }

    const reportedErrors: string[] = []

    const controller = await createFlow(root, initial, {
      onError: (error: Error) => reportedErrors.push(error.message),
      documentMode: 'controlled',
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    })

    const notifications: string[] = []
    let throwOnNextDisconnect = true

    const secondRoot = document.createElement('div')
    document.body.append(secondRoot)

    const secondController = await createFlow(secondRoot, initial, {
      documentMode: 'controlled',
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    })

    const secondNotifications: string[] = []
    secondController.observeNodeConnections(
      { nodeId: 'a' },
      {
        onConnect: (connections: readonly FlowNodeConnection[]) =>
          secondNotifications.push(
            `connect:${connections.map(({ edgeId }) => edgeId).join(',')}`
          ),
      }
    )

    const stop = controller.observeNodeConnections(
      { nodeId: 'a' },
      {
        onDisconnect: (connections: readonly FlowNodeConnection[]) => {
          notifications.push(
            `disconnect:${connections.map(({ edgeId }) => edgeId).join(',')}`
          )

          if (throwOnNextDisconnect) {
            throwOnNextDisconnect = false
            throw new Error('observer disconnect failed')
          }
        },
        onConnect: (connections: readonly FlowNodeConnection[]) =>
          notifications.push(
            `connect:${connections.map(({ edgeId }) => edgeId).join(',')}`
          ),
      }
    )

    await controller.setEdges([
      { id: 'ab', source: 'a', target: 'b' },
      { id: 'ac', source: 'a', target: 'c' },
    ])
    const afterProposal = [...notifications]

    controller.update(initial)
    const afterRejectedProposal = [...notifications]

    const added = {
      ...initial,
      edges: [
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'ac', source: 'a', target: 'c' },
      ],
    }

    controller.update(added)
    const secondAfterFirstControllerUpdate = [...secondNotifications]
    controller.update({
      ...added,
      edges: [
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'ac', source: 'c', target: 'a' },
      ],
    })
    controller.update({
      ...initial,
      edges: [{ id: 'ab', source: 'a', target: 'b' }],
    })
    stop()
    controller.update(added)
    secondController.update({
      ...initial,
      edges: [
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'ax', source: 'a', target: 'c' },
      ],
    })
    const secondAfterItsOwnUpdate = [...secondNotifications]
    secondController.destroy()
    secondRoot.remove()
    controller.destroy()

    return {
      afterProposal,
      afterRejectedProposal,
      notifications,
      reportedErrors,
      secondAfterFirstControllerUpdate,
      secondAfterItsOwnUpdate,
    }
  })

  expect(events.afterProposal).toStrictEqual([])
  expect(events.afterRejectedProposal).toStrictEqual([])
  expect(events.notifications).toStrictEqual([
    'connect:ac',
    'disconnect:ac',
    'connect:ac',
    'disconnect:ac',
  ])
  expect(events.reportedErrors).toStrictEqual(['observer disconnect failed'])
  expect(events.secondAfterFirstControllerUpdate).toStrictEqual([])
  expect(events.secondAfterItsOwnUpdate).toStrictEqual(['connect:ax'])
})

test('Vanilla handle connection observer filters accepted deltas and disposes', async ({
  page,
}) => {
  await page.goto('/')

  const events = await page.evaluate(async () => {
    const publicEntry = ['', 'src', 'public.ts'].join('/')
    const { createFlow } = await import(publicEntry)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const initial = {
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 0, y: 0 },
          handles: [
            { id: 'out-1', kind: 'source', side: 'right' },
            { id: 'out-2', kind: 'source', side: 'right' },
          ],
        },
        { id: 'b', label: 'B', position: { x: 20, y: 0 } },
        { id: 'c', label: 'C', position: { x: 40, y: 0 } },
      ],
      edges: [
        { id: 'a1b', source: 'a', sourceHandle: 'out-1', target: 'b' },
        { id: 'a2c', source: 'a', sourceHandle: 'out-2', target: 'c' },
      ],
    }

    const errors: string[] = []

    const controller = await createFlow(root, initial, {
      documentMode: 'controlled',
      onError: (error: Error) => errors.push(error.message),
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    })

    const notifications: string[] = []
    const targetNotifications: string[] = []

    let throwOnDisconnect = true

    const stop = controller.observeHandleConnections(
      { nodeId: 'a', type: 'source', id: 'out-1' },
      {
        onDisconnect: (edges: readonly FlowEdge[]) => {
          notifications.push(
            `disconnect:${edges.map(({ id }) => id).join(',')}`
          )

          if (throwOnDisconnect) {
            throwOnDisconnect = false
            throw new Error('handle observer disconnect failed')
          }
        },
        onConnect: (edges: readonly FlowEdge[]) =>
          notifications.push(`connect:${edges.map(({ id }) => id).join(',')}`),
      }
    )

    const stopTarget = controller.observeHandleConnections(
      { nodeId: 'c', type: 'target' },
      {
        onConnect: (edges: readonly FlowEdge[]) =>
          targetNotifications.push(
            `connect:${edges.map(({ id }) => id).join(',')}`
          ),
        onDisconnect: (edges: readonly FlowEdge[]) =>
          targetNotifications.push(
            `disconnect:${edges.map(({ id }) => id).join(',')}`
          ),
      }
    )

    await controller.setEdges([
      ...initial.edges,
      { id: 'a1c', source: 'a', sourceHandle: 'out-1', target: 'c' },
    ])

    const afterProposal = [...notifications]

    controller.update(initial)

    const afterRejectedProposal = [...notifications]

    const added = {
      ...initial,
      edges: [
        ...initial.edges,
        { id: 'a1c', source: 'a', sourceHandle: 'out-1', target: 'c' },
      ],
    }

    controller.update(added)
    controller.update({
      ...added,
      edges: added.edges.map((edge) =>
        edge.id === 'a1c' ? { ...edge, target: 'b' } : edge
      ),
    })
    stop()
    stopTarget()
    controller.update(initial)
    controller.destroy()

    return {
      afterProposal,
      afterRejectedProposal,
      notifications,
      targetNotifications,
      errors,
    }
  })

  expect(events.afterProposal).toStrictEqual([])
  expect(events.afterRejectedProposal).toStrictEqual([])
  expect(events.notifications).toStrictEqual([
    'connect:a1c',
    'disconnect:a1c',
    'connect:a1c',
  ])
  expect(events.errors).toStrictEqual(['handle observer disconnect failed'])
  expect(events.targetNotifications).toStrictEqual([
    'connect:a1c',
    'disconnect:a1c',
  ])
})
