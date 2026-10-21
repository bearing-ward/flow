import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { runKeyPressObserverContract } from '../../shared-e2e/key-press-observer-contract.ts'

test('Foldkit public snapshot client preserves literal-v1 reads and settles owner disposal', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const ordinary = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshotResult('uncontrolled')
  )

  expect(ordinary).toMatchObject({
    status: 'succeeded',
    response: { savedSession: { version: 1 } },
  })

  const disposed = await page.evaluate(async () => {
    const pending =
      window.__flowFoldkitTest?.requestSnapshotResult('uncontrolled')

    window.__flowFoldkitTest?.disposePublicState()

    return {
      pending: await pending,
      next: await window.__flowFoldkitTest?.requestSnapshotResult(
        'uncontrolled'
      ),
    }
  })

  expect(disposed.pending).toMatchObject({ status: 'disposed' })
  expect(disposed.next).toMatchObject({ status: 'disposed' })
})

const viewportContract: {
  coordinateCases: readonly {
    hostRect: { left: number; top: number }
    client: { x: number; y: number }
    viewport: { x: number; y: number; zoom: number }
    flow: { x: number; y: number }
    screen: { x: number; y: number }
  }[]
  fitCases: readonly {
    bounds: { x: number; y: number; width: number; height: number }
    pane: { width: number; height: number }
    limits: { minZoom: number; maxZoom: number }
    padding:
      | number
      | { top: number; right: number; bottom: number; left: number }
    viewport: { x: number; y: number; zoom: number }
  }[]
  operationContract: {
    controlled: { finalStatus: string }
    uncontrolled: { finalStatus: string }
    superseded: { previousStatus: string; replacementFinalStatus: string }
    disposed: { inFlightStatus: string }
    observationKinds: readonly string[]
  }
} = JSON.parse(
  readFileSync('research/fixtures/viewport-contract.json', 'utf-8')
)

test('Foldkit Runtime snapshots expose isolated selector and saved-session projections', async ({
  page,
}) => {
  await page.goto('/test.html')

  const result = await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    const graphPath = '/e2e/package-saved-session.ts'
    await import(harnessPath)
    const harness = window.__flowFoldkitTest

    if (harness === undefined) {
      throw new Error('Foldkit test harness did not initialize')
    }

    await harness.startPublicState()
    const graph = await import(graphPath)

    const response = await harness.requestSnapshot('controlled', {
      nodeIds: ['visible', 'missing'],
      connections: { nodeId: 'visible', type: 'source', handleId: null },
    })

    const prepared = await graph.prepareSavedSession(response.savedSession)
    harness.replacePublicDocument('controlled', prepared.document)
    harness.replacePublicViewport('controlled', prepared.viewport)
    const acknowledged = await harness.requestSnapshot('controlled')

    return { response, prepared, acknowledged }
  })

  if (result === undefined) {
    throw new Error('Foldkit Runtime snapshot response is missing')
  }

  const { response, prepared, acknowledged } = result

  expect(response.nodesData).toEqual([
    { id: 'visible', type: undefined, data: { alpha: 1, beta: 2 } },
  ])
  expect(response.nodeConnections).toEqual([
    {
      edgeId: 'visible-edge',
      source: 'visible',
      target: 'hidden',
      sourceHandle: undefined,
      targetHandle: undefined,
    },
  ])
  expect(response.savedSession).toEqual({
    version: 1,
    document: {
      nodes: response.snapshot.document.nodes.map(
        ({ selected: _selected, ...node }) => node
      ),
      edges: response.snapshot.document.edges.map(
        ({ selected: _selected, ...edge }) => edge
      ),
    },
    viewport: response.snapshot.viewport,
  })
  expect(prepared.document).toEqual(response.snapshot.document)
  expect(prepared.viewport).toEqual(response.snapshot.viewport)
  expect(acknowledged.snapshot.document).toEqual(prepared.document)
  expect(acknowledged.snapshot.viewport).toEqual(prepared.viewport)
})

test('Foldkit snapshot requests read complete accepted graph state', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const initial = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled', {
      nodeId: 'child',
      edgeId: 'visible-edge',
    })
  )

  expect(initial?.snapshot.document.nodes.map(({ id }) => id)).toEqual([
    'visible',
    'hidden',
    'culled',
    'parent',
    'child',
  ])
  expect(initial?.snapshot.document.edges.map(({ id }) => id)).toEqual([
    'visible-edge',
    'culled-edge',
  ])
  expect(initial?.snapshot.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(initial?.node).toMatchObject({
    id: 'child',
    parentId: 'parent',
    position: { x: 10, y: 15 },
  })
  expect(initial?.edge?.id).toBe('visible-edge')
  expect(initial?.internalNode).toMatchObject({
    node: { id: 'child' },
    absolutePosition: { x: 310, y: 315 },
  })
  await expect(page.locator('.flow-foldkit-node')).toHaveCount(6)
  await expect(page.locator('.flow-foldkit-edge')).toHaveCount(2)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled')
    )
  ).toEqual([])

  const missing = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled', {
      nodeId: 'missing-node',
      edgeId: 'missing-edge',
    })
  )

  expect(missing?.node).toBeUndefined()
  expect(missing?.edge).toBeUndefined()
  expect(missing?.internalNode).toBeNull()

  const malformed = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled', {
      nodeId: '',
    })
  )

  expect(malformed?.node).toBeUndefined()
  expect(malformed?.internalNode).toBeNull()
})

test('Foldkit Runtime observers track accepted selection and scoped key state', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    const harness = window.__flowFoldkitTest
    const target = document.createElement('div')
    target.id = 'observer-target'
    document.body.append(target)

    if (harness === undefined) {
      throw new Error('Missing Foldkit observer harness')
    }

    await harness.startPublicState()
    await harness.startPublicObservers('controlled', target)
    harness.subscribePublicSelection('controlled')
    harness.observePublicKeyPress('controlled', target)
  })
  await expect(page.locator('.flow-foldkit-canvas').first()).toBeVisible()

  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.publicSelectionEvents('controlled')
    )
  ).toEqual(['|'])

  const proposal = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestPublicEdit('controlled', {
      operations: [
        {
          kind: 'update-node',
          nodeId: 'visible',
          patch: { selected: true },
        },
      ],
    })
  )

  expect(proposal !== undefined && 'result' in proposal).toBe(true)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.publicSelectionEvents('controlled')
    )
  ).toEqual(['|'])

  if (proposal === undefined || !('result' in proposal)) {
    throw new Error('Foldkit controlled edit did not return its proposal')
  }

  expect(proposal.result.document.nodes[0]?.selected).toBe(true)
  await page.evaluate(async (document) => {
    const harness = window.__flowFoldkitTest
    harness?.replacePublicDocument('controlled', document)
    await harness?.settlePublicState()
  }, proposal.result.document)

  const acceptedAfterAck = await page.evaluate(async () => {
    const harness = window.__flowFoldkitTest

    return {
      states: harness?.publicAcceptedStates('controlled'),
      snapshot: await harness?.requestSnapshot('controlled'),
    }
  })

  expect(acceptedAfterAck.snapshot?.snapshot.document.nodes[0]?.selected).toBe(
    true
  )
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowFoldkitTest?.publicSelectionEvents('controlled')
      )
    )
    .toEqual(['|', 'visible|'])

  const keyState = await page.evaluate(() => {
    const target = document.querySelector<HTMLElement>('#observer-target')
    let targetEventCount = 0
    target?.addEventListener('keydown', () => {
      targetEventCount += 1
    })
    const input = document.createElement('input')
    const noKey = document.createElement('div')
    noKey.className = 'nokey'
    target?.append(input, noKey)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true })
    )
    input?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true })
    )
    noKey?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true })
    )

    const afterSuppressed = [
      ...(window.__flowFoldkitTest?.publicKeyStates('controlled') ?? []),
    ]

    const modified = new KeyboardEvent('keydown', {
      key: 'x',
      code: 'KeyX',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })

    input?.dispatchEvent(modified)

    const afterModified = [
      ...(window.__flowFoldkitTest?.publicKeyStates('controlled') ?? []),
    ]

    input?.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'x', code: 'KeyX', bubbles: true })
    )

    const states = [
      ...(window.__flowFoldkitTest?.publicKeyStates('controlled') ?? []),
    ]

    window.__flowFoldkitTest?.disposePublicObservers('controlled')
    input?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true })
    )
    input.remove()
    noKey.remove()

    return {
      states,
      afterSuppressed,
      afterModified,
      prevented: modified.defaultPrevented,
      targetEventCount,
    }
  })

  expect(keyState.targetEventCount).toBeGreaterThan(0)
  expect(keyState.afterSuppressed).toEqual([false])
  expect(keyState.afterModified).toEqual([false, true])
  expect(keyState.states).toEqual([false, true, false])
  expect(keyState.prevented).toBe(true)
})

test('Foldkit node connection observers report controlled accepted deltas per Runtime', async ({
  page,
}) => {
  await page.goto('/test.html')

  const events = await page.evaluate(async () => {
    const harnessPath = ['', 'e2e', 'test-harness.ts'].join('/')
    await import(harnessPath)
    const harness = window.__flowFoldkitTest

    if (harness === undefined) {
      throw new Error('Missing Foldkit test harness')
    }

    await harness.startPublicState()
    await harness.startPublicObservers('controlled', document.body)
    await harness.startPublicObservers('uncontrolled', document.body)
    harness.observePublicNodeConnections('controlled', 'visible', true)
    harness.observePublicNodeConnections('uncontrolled', 'visible')

    const initialResponse = await harness.requestSnapshot('controlled')
    const initial = initialResponse.snapshot.document

    await harness.requestPublicEdit('controlled', {
      operations: [
        {
          kind: 'add-edges',
          edges: [{ id: 'extra-edge', source: 'visible', target: 'culled' }],
        },
      ],
    })
    const afterProposal = [...harness.publicNodeConnectionEvents('controlled')]

    harness.replacePublicDocument('controlled', initial)
    await harness.settlePublicState()
    const afterRejection = [...harness.publicNodeConnectionEvents('controlled')]

    const added = {
      ...initial,
      edges: [
        ...initial.edges,
        { id: 'extra-edge', source: 'visible', target: 'culled' },
      ],
    }

    harness.replacePublicDocument('controlled', added)
    await harness.settlePublicState()
    const afterAdd = [...harness.publicNodeConnectionEvents('controlled')]

    const otherRuntimeAfterControlledUpdate = [
      ...harness.publicNodeConnectionEvents('uncontrolled'),
    ]

    harness.replacePublicDocument('uncontrolled', added)
    await harness.settlePublicState()

    const otherRuntimeAfterOwnUpdate = [
      ...harness.publicNodeConnectionEvents('uncontrolled'),
    ]

    const reconnected = {
      ...added,
      edges: added.edges.map((edge) =>
        edge.id === 'extra-edge'
          ? { ...edge, source: 'culled', target: 'visible' }
          : edge
      ),
    }

    harness.replacePublicDocument('controlled', reconnected)
    await harness.settlePublicState()
    const afterReconnect = [...harness.publicNodeConnectionEvents('controlled')]

    harness.replacePublicDocument('controlled', initial)
    await harness.settlePublicState()
    const afterRemove = [...harness.publicNodeConnectionEvents('controlled')]

    harness.disposePublicObservers('controlled')
    harness.replacePublicDocument('controlled', added)
    await harness.settlePublicState()
    const afterDispose = [...harness.publicNodeConnectionEvents('controlled')]

    return {
      afterProposal,
      afterRejection,
      afterAdd,
      afterReconnect,
      afterRemove,
      afterDispose,
      connectionErrors: harness.publicNodeConnectionErrors('controlled'),
      otherRuntimeAfterControlledUpdate,
      otherRuntimeAfterOwnUpdate,
    }
  })

  expect(events.afterProposal).toStrictEqual([])
  expect(events.afterRejection).toStrictEqual([])
  expect(events.afterAdd).toStrictEqual(['connect:extra-edge'])
  expect(events.afterReconnect.slice(events.afterAdd.length)).toStrictEqual([
    'disconnect:extra-edge',
    'connect:extra-edge',
  ])
  expect(events.afterRemove.slice(events.afterReconnect.length)).toStrictEqual([
    'disconnect:extra-edge',
  ])
  expect(events.connectionErrors).toStrictEqual([
    'onDisconnect:Foldkit observer disconnect failed',
  ])
  expect(events.afterDispose).toStrictEqual(events.afterRemove)
  expect(events.otherRuntimeAfterControlledUpdate).toStrictEqual([])
  expect(events.otherRuntimeAfterOwnUpdate).toStrictEqual([
    'connect:extra-edge',
  ])
})

test('Foldkit Runtime key observer follows the pinned keyboard contract', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    const harness = window.__flowFoldkitTest

    if (harness === undefined) {
      throw new Error('Missing Foldkit observer harness')
    }

    await harness.startPublicState()
    await harness.startPublicObservers('controlled', document.body)
    Object.assign(window, {
      __flowKeyPressContract: {
        observe: (
          observerId: string,
          keyCode: string | readonly string[] | null,
          options: {
            readonly target?:
              | Window
              | Document
              | HTMLElement
              | ShadowRoot
              | null
            readonly actInsideInputWithModifier?: boolean
            readonly preventDefault?: boolean
          }
        ) =>
          harness.observeContractKeyPress(
            'controlled',
            observerId,
            keyCode,
            options
          ),
        states: (observerId: string) =>
          harness.contractKeyStates('controlled', observerId),
        unsubscribe: (observerId: string) =>
          harness.unsubscribeContractKeyPress('controlled', observerId),
        disposeOwner: () => harness.disposePublicObservers('controlled'),
      },
    })
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

test('Foldkit ports separate proposals from accepted updates and cancellation', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  await page.evaluate(() => {
    window.__flowFoldkitTest?.dispatchPublicCommand('uncontrolled', {
      kind: 'set-node-position',
      nodeId: 'visible',
      position: { x: 80, y: 90 },
    })
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const uncontrolled = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled', {
      nodeId: 'visible',
    })
  )

  expect(uncontrolled?.node?.position).toEqual({ x: 80, y: 90 })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicChanges('uncontrolled').length
    )
  ).toBe(1)
  expect(
    await page.evaluate(
      () =>
        window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length
    )
  ).toBe(1)

  await page.evaluate(() => {
    window.__flowFoldkitTest?.dispatchPublicCommand('controlled', {
      kind: 'set-node-position',
      nodeId: 'visible',
      position: { x: 120, y: 130 },
    })
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const proposal = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled', {
      nodeId: 'visible',
    })
  )

  if (proposal === undefined) {
    throw new Error('Missing controlled snapshot response')
  }

  expect(proposal?.node?.position).toEqual({ x: 20, y: 30 })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicChanges('controlled').length
    )
  ).toBe(1)
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicAcceptedStates('controlled').length
    )
  ).toBe(0)

  const acceptedDocument = {
    ...proposal.snapshot.document,
    nodes: proposal.snapshot.document.nodes.map((node) =>
      node.id === 'visible' ? { ...node, position: { x: 120, y: 130 } } : node
    ),
  }

  await page.evaluate((documentInput) => {
    if (documentInput !== undefined) {
      window.__flowFoldkitTest?.replacePublicDocument(
        'controlled',
        documentInput
      )
    }
  }, acceptedDocument)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const acknowledged = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled', {
      nodeId: 'visible',
    })
  )

  expect(acknowledged?.node?.position).toEqual({ x: 120, y: 130 })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicAcceptedStates('controlled').length
    )
  ).toBe(1)

  await page.evaluate(() => {
    window.__flowFoldkitTest?.dispatchPublicCommand('controlled', {
      kind: 'set-viewport',
      viewport: { x: 90, y: 95, zoom: 1.1 },
    })
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const viewportProposal = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled')
  )

  expect(viewportProposal?.snapshot.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicAcceptedStates('controlled').length
    )
  ).toBe(1)

  await page.evaluate(() => {
    window.__flowFoldkitTest?.replacePublicViewport('controlled', {
      x: 90,
      y: 95,
      zoom: 1.1,
    })
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const viewportAcknowledged = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled')
  )

  expect(viewportAcknowledged?.snapshot.viewport).toEqual({
    x: 90,
    y: 95,
    zoom: 1.1,
  })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicAcceptedStates('controlled').length
    )
  ).toBe(2)

  await page.evaluate(() => {
    window.__flowFoldkitTest?.dispatchPublicCommand('uncontrolled', {
      kind: 'set-viewport',
      viewport: { x: 25, y: 35, zoom: 1.5 },
    })
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const viewport = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
  )

  expect(viewport?.snapshot.viewport).toEqual({ x: 25, y: 35, zoom: 1.5 })

  const acceptedBeforeCancellation = await page.evaluate(
    () => window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length
  )

  await page
    .locator('[data-node-id="visible"]')
    .first()
    .dispatchEvent('pointerdown', {
      button: 0,
      pointerId: 41,
      clientX: 20,
      clientY: 30,
    })
  await page.evaluate(() => {
    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, pointerId: 41 })
    )
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())
  expect(
    await page.evaluate(async () => {
      const snapshot =
        await window.__flowFoldkitTest?.requestSnapshot('uncontrolled')

      return {
        acceptedCount:
          window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length,
        node: snapshot?.snapshot.document.nodes.find(
          ({ id }) => id === 'visible'
        ),
      }
    })
  ).toMatchObject({
    acceptedCount: acceptedBeforeCancellation,
    node: { position: { x: 80, y: 90 } },
  })
})

test('Foldkit accepted-state ports isolate programs, deduplicate, and dispose', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const initial = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
  )

  if (initial === undefined) {
    throw new Error('Missing initial Foldkit snapshot')
  }

  await page.evaluate((documentInput) => {
    window.__flowFoldkitTest?.replacePublicDocument(
      'uncontrolled',
      documentInput
    )
  }, initial.snapshot.document)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())
  expect(
    await page.evaluate(
      () =>
        window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length
    )
  ).toBe(0)

  const reorderedDataDocument = {
    ...initial.snapshot.document,
    nodes: initial.snapshot.document.nodes.map((node) =>
      node.id === 'visible' ? { ...node, data: { beta: 2, alpha: 1 } } : node
    ),
  }

  await page.evaluate((documentInput) => {
    window.__flowFoldkitTest?.replacePublicDocument(
      'uncontrolled',
      documentInput
    )
  }, reorderedDataDocument)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())
  expect(
    await page.evaluate(
      () =>
        window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length
    )
  ).toBe(0)

  const equalWithUpdatedLabel = {
    ...initial.snapshot.document,
    nodes: initial.snapshot.document.nodes.map((node) =>
      node.id === 'visible' ? { ...node, label: 'Updated' } : node
    ),
  }

  await page.evaluate((documentInput) => {
    if (documentInput !== undefined) {
      window.__flowFoldkitTest?.replacePublicDocument(
        'uncontrolled',
        documentInput
      )
    }
  }, equalWithUpdatedLabel)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  expect(
    await page.evaluate(async () => {
      const uncontrolled = await window.__flowFoldkitTest?.requestSnapshot(
        'uncontrolled',
        { nodeId: 'visible' }
      )

      const controlled = await window.__flowFoldkitTest?.requestSnapshot(
        'controlled',
        { nodeId: 'visible' }
      )

      return {
        uncontrolledLabel: uncontrolled?.node?.label,
        controlledLabel: controlled?.node?.label,
        acceptedCount:
          window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length,
      }
    })
  ).toEqual({
    uncontrolledLabel: 'Updated',
    controlledLabel: 'Visible',
    acceptedCount: 1,
  })

  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.exercisePublicUnsubscribe()
    )
  ).toBe(0)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.exercisePublicListenerFailure()
    )
  ).toBe(1)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.exercisePublicReentrancy()
    )
  ).toEqual(['50', '77'])

  await page.evaluate(() => window.__flowFoldkitTest?.disposePublicState())

  const disposed = await page.evaluate(() =>
    window.__flowFoldkitTest?.probeAfterPublicDisposal('uncontrolled')
  )

  expect(disposed).toEqual({
    acceptedCount: 0,
    changeCount: 0,
    mountedElements: 0,
  })
})

test('Foldkit viewport requests return controlled proposals and drive the rendered transform', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })
  const [coordinate] = viewportContract.coordinateCases

  if (coordinate === undefined) {
    throw new Error('Missing viewport coordinate fixture')
  }

  const request = {
    width: 600,
    height: 400,
    originX: coordinate.hostRect.left,
    originY: coordinate.hostRect.top,
  }

  const converted = await page.evaluate(
    async ({ coordinate: fixtureCoordinate, ...base }) => {
      const api = window.__flowFoldkitTest
      await api?.requestPublicViewport('uncontrolled', {
        ...base,
        kind: 'set',
        viewport: fixtureCoordinate.viewport,
      })

      const updated = await api?.requestPublicViewport('uncontrolled', {
        ...base,
        kind: 'flowToScreen',
        point: fixtureCoordinate.flow,
      })

      const screen = await api?.requestPublicViewport('uncontrolled', {
        ...base,
        kind: 'screenToFlow',
        point: fixtureCoordinate.screen,
      })

      return { updated, screen }
    },
    { ...request, coordinate }
  )

  expect(converted.updated?.status).toBe('unchanged')
  expect(converted.updated?.point).toEqual(coordinate.screen)
  expect(converted.screen?.point).toEqual(coordinate.flow)
  await expect(page.locator('.flow-foldkit-viewport').first()).toBeVisible()
  await expect(page.locator('.flow-foldkit-viewport').first()).toHaveCSS(
    'transform',
    `matrix(${coordinate.viewport.zoom}, 0, 0, ${coordinate.viewport.zoom}, ${coordinate.viewport.x}, ${coordinate.viewport.y})`
  )

  const scrolled = await page.evaluate(async (base) => {
    document.body.style.minHeight = '1800px'
    window.scrollTo(0, 180)
    const pane = document.querySelector('.flow-foldkit-canvas')

    if (!(pane instanceof HTMLElement)) {
      throw new TypeError('Missing Foldkit pane')
    }

    const rect = pane.getBoundingClientRect()
    const point = { x: 110, y: 60 }

    const requestBase = {
      width: rect.width,
      height: rect.height,
      originX: rect.left,
      originY: rect.top,
    }

    await window.__flowFoldkitTest?.requestPublicViewport('uncontrolled', {
      ...requestBase,
      kind: 'set',
      viewport: base.viewport,
    })

    return {
      rect: { left: rect.left, top: rect.top },
      forward: await window.__flowFoldkitTest?.requestPublicViewport(
        'uncontrolled',
        {
          ...requestBase,
          kind: 'flowToScreen',
          point,
        }
      ),
      reverse: await window.__flowFoldkitTest?.requestPublicViewport(
        'uncontrolled',
        {
          ...requestBase,
          kind: 'screenToFlow',
          point: {
            x: rect.left + base.viewport.x + point.x * base.viewport.zoom,
            y: rect.top + base.viewport.y + point.y * base.viewport.zoom,
          },
        }
      ),
    }
  }, coordinate)

  expect(scrolled.rect.top).toBeLessThan(0)
  expect(scrolled.forward?.point).toEqual({
    x:
      scrolled.rect.left +
      coordinate.viewport.x +
      coordinate.flow.x * coordinate.viewport.zoom,
    y:
      scrolled.rect.top +
      coordinate.viewport.y +
      coordinate.flow.y * coordinate.viewport.zoom,
  })
  expect(scrolled.reverse?.point).toEqual(coordinate.flow)
  const [fitFixture] = viewportContract.fitCases

  if (fitFixture === undefined) {
    throw new Error('Missing viewport fit fixture')
  }

  const fit = await page.evaluate(
    (fixture) =>
      window.__flowFoldkitTest?.requestPublicViewport('uncontrolled', {
        kind: 'fitBounds',
        bounds: fixture.bounds,
        width: fixture.pane.width,
        height: fixture.pane.height,
        originX: 0,
        originY: 0,
        padding: fixture.padding,
      }),
    fitFixture
  )

  expect(fit?.viewport).toEqual(fitFixture.viewport)

  const controlled = await page.evaluate(
    (base) =>
      window.__flowFoldkitTest?.requestPublicViewport('controlled', {
        ...base,
        kind: 'center',
        point: { x: 100, y: 80 },
      }),
    request
  )

  expect(controlled?.status).toBe(
    viewportContract.operationContract.controlled.finalStatus
  )
  expect(controlled?.viewport).toEqual({ x: 200, y: 120, zoom: 1 })

  const controlledSnapshot = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled')
  )

  expect(controlledSnapshot?.snapshot.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicAcceptedStates('controlled').length
    )
  ).toBe(0)

  const unchanged = await page.evaluate(
    (base) =>
      window.__flowFoldkitTest?.requestPublicViewport('uncontrolled', {
        ...base,
        kind: 'get',
      }),
    request
  )

  expect(unchanged?.viewport).toEqual(fitFixture.viewport)
})

test('Foldkit viewport animation supersedes requests and fitView renders selected nodes', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const request = { width: 600, height: 400, originX: 0, originY: 0 }

  const animated = await page.evaluate(async (base) => {
    const api = window.__flowFoldkitTest

    const first = api?.requestPublicViewport('uncontrolled', {
      ...base,
      kind: 'set',
      viewport: { x: 200, y: 120, zoom: 1.5 },
      animation: { duration: 160, easing: 'ease-in-out' },
    })

    const second = api?.requestPublicViewport('uncontrolled', {
      ...base,
      kind: 'set',
      viewport: { x: 100, y: 80, zoom: 1.25 },
      animation: { duration: 64 },
    })

    return { first: await first, second: await second }
  }, request)

  expect(animated.first?.status).toBe(
    viewportContract.operationContract.superseded.previousStatus
  )
  expect(animated.second).toMatchObject({
    status:
      viewportContract.operationContract.superseded.replacementFinalStatus,
    viewport: { x: 100, y: 80, zoom: 1.25 },
  })
  await expect(page.locator('.flow-foldkit-viewport').first()).toHaveCSS(
    'transform',
    'matrix(1.25, 0, 0, 1.25, 100, 80)'
  )

  const observationKinds = await page.evaluate(() =>
    window.__flowFoldkitTest
      ?.publicViewportEvents('uncontrolled')
      .map(({ kind }) => kind)
  )

  const finalEnd = observationKinds?.lastIndexOf('end') ?? -1
  const animationStart = observationKinds?.lastIndexOf('start') ?? -1
  const animationChange = observationKinds?.lastIndexOf('change') ?? -1
  expect(viewportContract.operationContract.observationKinds).toEqual([
    'start',
    'change',
    'end',
  ])
  expect(animationStart).toBeGreaterThan(0)
  expect(animationChange).toBeGreaterThan(animationStart)
  expect(finalEnd).toBeGreaterThan(animationChange)
  expect(observationKinds?.[animationStart - 1]).toBe('end')
})

test('Foldkit fitView measures and fits selected nodes', async ({ page }) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const request = { width: 600, height: 400, originX: 0, originY: 0 }

  const initial = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
  )

  if (initial === undefined) {
    throw new Error('Missing document for selected fit')
  }

  const selectedDocument = {
    ...initial.snapshot.document,
    nodes: initial.snapshot.document.nodes.map((node) =>
      node.id === 'visible'
        ? { ...node, selected: true }
        : { ...node, selected: false }
    ),
  }

  await page.evaluate((documentInput) => {
    if (documentInput !== undefined) {
      window.__flowFoldkitTest?.replacePublicDocument(
        'uncontrolled',
        documentInput
      )
    }
  }, selectedDocument)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())
  await page.evaluate(() =>
    window.__flowFoldkitTest?.refreshPublicNode('uncontrolled', 'visible')
  )

  const selectedFit = await page.evaluate(
    (base) =>
      window.__flowFoldkitTest?.requestPublicViewport('uncontrolled', {
        ...base,
        kind: 'fitView',
        nodes: 'selected',
        padding: 0.1,
      }),
    request
  )

  expect(selectedFit).toMatchObject({ status: 'accepted', complete: true })
  expect(selectedFit?.viewport.zoom).toBeGreaterThan(0)

  await expect
    .poll(() =>
      page
        .locator('.flow-foldkit-viewport')
        .first()
        .evaluate((element) => {
          const matrix = new DOMMatrix(getComputedStyle(element).transform)

          return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
        })
    )
    .toEqual([
      expect.closeTo(selectedFit?.viewport.zoom ?? 0, 4),
      0,
      0,
      expect.closeTo(selectedFit?.viewport.zoom ?? 0, 4),
      expect.closeTo(selectedFit?.viewport.x ?? 0, 4),
      expect.closeTo(selectedFit?.viewport.y ?? 0, 4),
    ])
})

test('Foldkit viewport client honors reduced motion and settles pending work on disposal', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const reduced = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestViewportClient('uncontrolled', {
      kind: 'set',
      viewport: { x: 70, y: 45, zoom: 1.2 },
      animation: { duration: 400, easing: 'ease-in-out' },
    })
  )

  expect(reduced).toMatchObject({
    status: 'accepted',
    complete: true,
    viewport: { x: 70, y: 45, zoom: 1.2 },
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })

  const pending = await page.evaluate(() => {
    const request = window.__flowFoldkitTest?.requestViewportClient(
      'uncontrolled',
      {
        kind: 'set',
        viewport: { x: 200, y: 180, zoom: 1.7 },
        animation: { duration: 1000 },
      }
    )

    window.__flowFoldkitTest?.disposePublicState()

    return request
  })

  expect(pending).toMatchObject({ status: 'disposed', complete: true })
})
