import { expect, test } from '@playwright/test'

import { runKeyPressObserverContract } from '../../shared-e2e/key-press-observer-contract.ts'

test('Vue state composables expose isolated readonly accepted state', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  await expect(page.getByTestId('state-probe-left')).toHaveAttribute(
    'data-node-count',
    '2'
  )
  await expect(page.locator("[data-node-id='left-hidden']")).toHaveCount(0)
  await expect(page.getByTestId('node-context-left-visible')).toHaveAttribute(
    'data-node-id-context',
    'left-visible'
  )

  const initial = await page.evaluate(() => ({
    left: window.__flowVueTest?.publicState('left'),
    right: window.__flowVueTest?.publicState('right'),
  }))

  expect(initial.left?.nodeIds).toEqual(['left-visible', 'left-hidden'])
  expect(initial.left?.edgeIds).toEqual(['left-edge'])
  expect(initial.left?.missingNode).toBe(true)
  expect(initial.left?.missingEdge).toBe(true)
  expect(initial.left?.frozen).toBe(true)
  expect(initial.left?.mutationRejected).toBe(true)
  expect(initial.left?.selectedData).toEqual([
    { id: 'left-hidden', type: undefined, data: undefined },
    { id: 'left-visible', type: undefined, data: { tag: 'left' } },
  ])
  expect(initial.left?.selectedConnections).toEqual([
    {
      edgeId: 'left-edge',
      source: 'left-visible',
      target: 'left-hidden',
      sourceHandle: undefined,
      targetHandle: undefined,
    },
  ])
  expect(initial.left?.savedSession).toEqual({
    version: 1,
    document: {
      nodes: [
        {
          id: 'left-visible',
          label: 'Left visible',
          position: { x: 20, y: 30 },
          data: { tag: 'left' },
        },
        {
          id: 'left-hidden',
          label: 'Left hidden',
          hidden: true,
          position: { x: 240, y: 30 },
        },
      ],
      edges: [
        { id: 'left-edge', source: 'left-visible', target: 'left-hidden' },
      ],
    },
    viewport: { x: 0, y: 0, zoom: 1 },
  })
  expect(initial.left?.notifications).toBe(0)

  const restoreProposal = await page.evaluate(() =>
    window.__flowVueTest?.preparePublicRestore('left')
  )

  expect(restoreProposal?.document.nodes.map(({ id }) => id)).toEqual([
    'left-visible',
    'left-hidden',
  ])
  expect(restoreProposal?.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({ firstNodeX: 20, notifications: 0 })
  expect(initial.right?.nodeIds).toEqual(['right-node'])
  expect(initial.right?.viewport).toEqual({ x: 15, y: 25, zoom: 1.25 })

  await page.evaluate(() => window.__flowVueTest?.proposePublicPosition('left'))
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({ firstNodeX: 20, notifications: 0, events: ['proposal'] })

  await page.evaluate(() => {
    const harness = window.__flowVueTest
    harness?.acceptPublicProposals()
    harness?.proposePublicPosition('left')
  })
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({
      firstNodeX: 90,
      notifications: 1,
      events: ['proposal', 'proposal', 'accepted'],
    })

  await page.evaluate(() =>
    window.__flowVueTest?.updatePublicViewport({ x: 40, y: 50, zoom: 1.5 })
  )
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({ viewport: { x: 40, y: 50, zoom: 1.5 }, notifications: 2 })

  await page.evaluate(() => window.__flowVueTest?.proposePublicViewport())
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({ viewport: { x: 35, y: 45, zoom: 1.2 }, notifications: 3 })

  await page.evaluate(() =>
    window.__flowVueTest?.updatePublicDocument('left', {
      nodes: [
        { id: 'replacement', label: 'Replacement', position: { x: 12, y: 14 } },
      ],
      edges: [],
    })
  )
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({
      nodeIds: ['replacement'],
      edgeIds: [],
      firstNodeX: 12,
      notifications: 4,
    })

  await page.evaluate(() =>
    window.__flowVueTest?.proposePublicPosition('right')
  )
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('right')))
    .toMatchObject({ firstNodeX: 90, notifications: 1 })
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({ firstNodeX: 12, notifications: 4 })

  if (restoreProposal === undefined) {
    throw new Error('Missing Vue restore proposal')
  }

  await page.evaluate(
    ({ document, viewport }) => {
      const harness = window.__flowVueTest
      harness?.updatePublicDocument('left', document)
      harness?.updatePublicViewport(viewport, 'left')
    },
    {
      document: restoreProposal.document,
      viewport: restoreProposal.viewport,
    }
  )

  const acknowledgedRestore = await page.evaluate(() =>
    window.__flowVueTest?.publicState('left')
  )

  expect(acknowledgedRestore?.document).toEqual(restoreProposal.document)
  expect(acknowledgedRestore?.viewport).toEqual(restoreProposal.viewport)

  await page.evaluate(() => window.__flowVueTest?.unmountPublicObserver())
  await expect(page.getByTestId('state-probe-left')).toHaveCount(0)
  await page.evaluate(() =>
    window.__flowVueTest?.proposePublicPosition('right')
  )
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('right'))
  ).toMatchObject({ firstNodeX: 90, notifications: 1 })

  await page.evaluate(() => window.__flowVueTest?.destroyPublicCanvases())
  await page.evaluate(() =>
    window.__flowVueTest?.proposePublicPosition('right')
  )
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('right'))
  ).toMatchObject({ firstNodeX: 90, notifications: 1 })
  expect(
    await page.evaluate(() => window.__flowVueTest?.outsideProviderError())
  ).toContain(
    'useFlow must be called in setup() below a mounted FlowCanvas provider'
  )
})

test('Vue owner observers wait for selection acknowledgement and dispose key targets', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    await import('../src/test-harness.ts')
    window.__flowVueTest?.startPublicState()
  })
  await expect(page.getByTestId('state-probe-left')).toBeVisible()

  await page.evaluate(() =>
    window.__flowVueTest?.subscribePublicSelection('left')
  )
  expect(
    await page.evaluate(() =>
      window.__flowVueTest?.publicSelectionEvents('left')
    )
  ).toEqual(['|'])

  await page.evaluate(() => window.__flowVueTest?.proposePublicSelection())
  expect(
    await page.evaluate(() =>
      window.__flowVueTest?.publicSelectionEvents('left')
    )
  ).toEqual(['|'])
  await page.evaluate(() => window.__flowVueTest?.acknowledgePublicSelection())
  await expect
    .poll(() =>
      page.evaluate(() => window.__flowVueTest?.publicSelectionEvents('left'))
    )
    .toEqual(['|', 'left-visible|'])

  const keyboardResult = await page.evaluate(() => {
    const target = document.createElement('div')
    const input = document.createElement('input')
    const noKey = document.createElement('div')
    noKey.className = 'nokey'
    const noKeyChild = document.createElement('span')
    noKey.append(noKeyChild)
    target.append(input, noKey)
    document.body.append(target)
    window.__flowVueTest?.observePublicKeyPress(target)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true })
    )
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true })
    )
    noKeyChild.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true })
    )
    const afterSuppressed = [...(window.__flowVueTest?.publicKeyStates() ?? [])]

    const modified = new KeyboardEvent('keydown', {
      key: 'x',
      code: 'KeyX',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })

    input.dispatchEvent(modified)
    input.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'x', code: 'KeyX', bubbles: true })
    )
    const beforeUnmount = [...(window.__flowVueTest?.publicKeyStates() ?? [])]
    window.__flowVueTest?.destroyPublicCanvases()
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true })
    )
    const afterUnmount = [...(window.__flowVueTest?.publicKeyStates() ?? [])]
    target.remove()

    return {
      afterSuppressed,
      beforeUnmount,
      afterUnmount,
      prevented: modified.defaultPrevented,
    }
  })

  expect(keyboardResult.beforeUnmount).toEqual([false, true, false])
  expect(keyboardResult.afterSuppressed).toEqual([false])
  expect(keyboardResult.afterUnmount).toEqual([false, true, false])
  expect(keyboardResult.prevented).toBe(true)
})

test('Vue owner key observer follows the pinned keyboard contract', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    await import('../src/test-harness.ts')
    const harness = window.__flowVueTest
    await harness?.startPublicState()
    Object.assign(window, {
      __flowKeyPressContract: {
        observe: (
          id: string,
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
        ) => harness?.observeContractKeyPress(id, keyCode, options),
        states: (id: string) => harness?.contractKeyStates(id) ?? [],
        unsubscribe: (id: string) => harness?.unsubscribeContractKeyPress(id),
        disposeOwner: () => harness?.destroyPublicCanvases(),
      },
    })
  })
  await expect(page.getByTestId('state-probe-left')).toBeVisible()

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

test('Vue accepted state listeners deduplicate and queue reentrant changes', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const order = await page.evaluate(() =>
    window.__flowVueTest?.exercisePublicNotificationPolicy()
  )

  expect(order).toEqual([
    'first:100',
    'failure:100',
    'last:100',
    'first:101',
    'failure:101',
    'last:101',
  ])
})

test('Vue accepted state treats object key order as equal document values', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  await page.evaluate(() => {
    window.__flowVueTest?.updatePublicDocument('left', {
      nodes: [
        {
          id: 'left-visible',
          label: 'Left visible',
          position: { x: 20, y: 30 },
          data: { alpha: 1, beta: 2 },
        },
        {
          id: 'left-hidden',
          label: 'Left hidden',
          hidden: true,
          position: { x: 240, y: 30 },
        },
      ],
      edges: [
        { id: 'left-edge', source: 'left-visible', target: 'left-hidden' },
      ],
    })
  })

  await page.evaluate(() => {
    window.__flowVueTest?.updatePublicDocument('left', {
      nodes: [
        {
          id: 'left-visible',
          label: 'Left visible',
          position: { x: 20, y: 30 },
          data: { beta: 2, alpha: 1 },
        },
        {
          id: 'left-hidden',
          label: 'Left hidden',
          hidden: true,
          position: { x: 240, y: 30 },
        },
      ],
      edges: [
        { id: 'left-edge', source: 'left-visible', target: 'left-hidden' },
      ],
    })
  })

  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({
    notifications: 1,
    nodeIds: ['left-visible', 'left-hidden'],
  })
})
