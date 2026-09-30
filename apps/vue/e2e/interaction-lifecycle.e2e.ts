import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'
import { Schema as S } from 'effect'

import {
  conformanceFixtures,
  PublicEditQueuedDisposalSchema,
} from '../../../packages/conformance/src/index.ts'
import {
  interactionConnectionCases,
  interactionCancellationRetryCases,
  interactionLifecycleFixture,
  interactionReconnectionCases,
} from '../../shared-e2e/interaction-lifecycle-contract.ts'
import { createVueConformanceAdapter } from './conformance.ts'

const lifecycleFixture = (
  mode: 'controlled' | 'uncontrolled',
  selected = true
) => {
  const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (fixture === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  return {
    ...fixture,
    documentMode: mode,
    document: {
      edges: [],
      nodes: [
        {
          id: 'first',
          label: 'First',
          position: { x: 40, y: 50 },
          selected,
          size: { width: 150, height: 80 },
        },
        {
          id: 'second',
          label: 'Second',
          position: { x: 260, y: 90 },
          selectable: true,
        },
      ],
    },
    actions: [],
  }
}

const dispatchRepeatedKey = async (
  handle: Locator,
  key: string
): Promise<void> => {
  await handle.evaluate((element, repeatedKey) => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: repeatedKey,
        bubbles: true,
        cancelable: true,
        repeat: true,
      })
    )
  }, key)
}

const queuedDisposalFixture = S.decodeUnknownSync(
  PublicEditQueuedDisposalSchema
)(
  JSON.parse(
    readFileSync('research/fixtures/public-edit-contract.json', 'utf-8')
  ).queuedDisposal
)

test('Vue cancellation retry cases clear stale connections before a fresh commit', async ({
  page,
}) => {
  const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  const [fallbackCase] = interactionCancellationRetryCases

  if (base === undefined || fallbackCase === undefined) {
    throw new Error('Missing Vue cancellation retry fixture')
  }

  const adapter = createVueConformanceAdapter(page)

  /* eslint-disable no-await-in-loop */
  for (const reason of interactionLifecycleFixture.cancellationReasons) {
    const cancellationCase =
      interactionCancellationRetryCases.find(
        (candidate) => candidate.reason === reason
      ) ?? fallbackCase

    const document = interactionLifecycleFixture.connectionDocument

    await adapter.mount({ ...base, documentMode: 'uncontrolled', document })

    const source = page.locator(
      `[data-node-id="${cancellationCase.attempt.source}"] [data-handle-id="${cancellationCase.attempt.sourceHandle}"]`
    )

    const target = page.locator(
      `[data-node-id="${cancellationCase.attempt.target}"] [data-handle-id="${cancellationCase.attempt.targetHandle}"]`
    )

    const sourceBounds = await source.boundingBox()
    const targetBounds = await target.boundingBox()

    if (sourceBounds === null || targetBounds === null) {
      throw new Error(`Missing handles for ${cancellationCase.reason}`)
    }

    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      (sourceBounds.x + targetBounds.x) / 2,
      (sourceBounds.y + targetBounds.y) / 2,
      { steps: 2 }
    )
    await expect(page.getByTestId('flow-connection-preview')).toBeVisible()

    switch (reason) {
      case 'escape': {
        await page.keyboard.press('Escape')
        break
      }

      case 'blur': {
        await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
        break
      }

      case 'pointer-cancel': {
        await page
          .getByTestId('flow-canvas')
          .dispatchEvent('pointercancel', { pointerId: 1, bubbles: true })
        break
      }

      case 'capture-loss': {
        await page
          .getByTestId('flow-canvas')
          .dispatchEvent('lostpointercapture', {
            pointerId: 1,
            bubbles: true,
          })
        break
      }

      case 'removal': {
        await page.evaluate((nextDocument) => {
          window.__flowVueTest?.updateDocument({
            ...nextDocument,
            nodes: nextDocument.nodes.filter(({ id }) => id !== 'source'),
          })
        }, document)
        break
      }

      case 'configuration-replacement': {
        await page.evaluate(() => {
          window.__flowVueTest?.setConnectionOptions({
            mode: 'loose',
            radius: 20,
            autoPanOnConnect: false,
          })
        })
        break
      }

      case 'unmount': {
        const disposal = await adapter.destroy()
        expect(disposal.mountedElements).toBe(0)
        expect(disposal.changesAfterDestroy).toBe(0)
        expect(disposal.acceptedStatesAfterDestroy).toBe(0)
        break
      }

      default: {
        throw new Error(`Unsupported cancellation reason: ${reason}`)
      }
    }

    await page.mouse.up()

    if (reason === 'removal' || reason === 'unmount') {
      await adapter.mount({ ...base, documentMode: 'uncontrolled', document })
    }

    await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
    expect(await adapter.snapshot()).toMatchObject({ edgeIds: [] })

    const cancelledChanges = await adapter.changeKinds()

    const semanticChanges = cancelledChanges.filter((kind) =>
      ['edge-add', 'edge-reconnect', 'node-bounds', 'selection-set'].includes(
        kind
      )
    )

    expect(semanticChanges).toEqual([])

    const retrySource = page.locator(
      `[data-node-id="${cancellationCase.retry.source}"] [data-handle-id="${cancellationCase.retry.sourceHandle}"]`
    )

    const retryTarget = page.locator(
      `[data-node-id="${cancellationCase.retry.target}"] [data-handle-id="${cancellationCase.retry.targetHandle}"]`
    )

    const retrySourceBounds = await retrySource.boundingBox()
    const retryTargetBounds = await retryTarget.boundingBox()

    if (retrySourceBounds === null || retryTargetBounds === null) {
      throw new Error(`Missing retry handles for ${cancellationCase.reason}`)
    }

    await page.mouse.move(
      retrySourceBounds.x + retrySourceBounds.width / 2,
      retrySourceBounds.y + retrySourceBounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      retryTargetBounds.x + retryTargetBounds.width / 2,
      retryTargetBounds.y + retryTargetBounds.height / 2,
      { steps: 3 }
    )
    await page.mouse.up()

    expect(await adapter.snapshot()).toMatchObject({
      edgeIds: [cancellationCase.expectedRetryEdgeId],
    })
    const retryChanges = await adapter.changeKinds()
    expect(retryChanges.filter((kind) => kind === 'edge-add')).toEqual([
      'edge-add',
    ])
    await adapter.destroy()
  }
  /* eslint-enable no-await-in-loop */
})

test('Vue host callbacks tolerate reentrancy and queued disposal', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const reentrant = await page.evaluate(() =>
    window.__flowVueTest?.exerciseFunctionalEditUpdaters()
  )

  expect(reentrant).toMatchObject({ calls: 2, count: 2, mutationBlocked: true })

  await page.evaluate(() => window.__flowVueTest?.startPublicState())

  const disposalSnapshot = await page.evaluate(async (scenario) => {
    const result =
      await window.__flowVueTest?.disposeDuringEditPreparation(scenario)

    const mountedElements = document.querySelectorAll(
      "[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']"
    ).length

    return { result, mountedElements }
  }, queuedDisposalFixture)

  expect(disposalSnapshot.result?.error).toContain('Disposed')
  expect(disposalSnapshot.result?.events).toEqual(['accepted:trigger'])
  expect(disposalSnapshot.result?.events).not.toContain('late:notification')
  expect(disposalSnapshot.mountedElements).toBe(0)
})

test('Vue connection cancellation clears preview and allows a fresh accepted candidate', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(
    ({ id }) => id === 'connection-validity'
  )

  if (fixture === undefined) {
    throw new Error('Missing connection-validity fixture')
  }

  const acceptedAction = fixture.actions.find(
    (action) => action.kind === 'connect' && action.targetNodeId === 'approved'
  )

  const rejectedAction = fixture.actions.find(
    (action) => action.kind === 'connect' && action.targetNodeId === 'rejected'
  )

  if (
    acceptedAction?.kind !== 'connect' ||
    rejectedAction?.kind !== 'connect'
  ) {
    throw new Error('Missing accepted or rejected connection action')
  }

  const adapter = createVueConformanceAdapter(page)

  await adapter.mount(fixture)
  await adapter.perform(rejectedAction)

  expect(await adapter.snapshot()).toMatchObject({ edgeIds: [] })
  expect(
    await page.evaluate(() => window.__flowVueTest?.connectionCandidates())
  ).toContainEqual({
    source: 'source',
    sourceHandle: 'out',
    target: 'rejected',
    targetHandle: 'in',
  })

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')

  const sourceBounds = await source.boundingBox()
  const canvasBounds = await page.getByTestId('flow-canvas').boundingBox()

  if (sourceBounds === null || canvasBounds === null) {
    throw new Error('Missing Vue connection or canvas bounds')
  }

  await page.evaluate(() => window.__flowVueTest?.clearConnectionCandidates())

  const changesBeforeCancellation = await adapter.changeKinds()

  await page.mouse.move(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    canvasBounds.x + 30,
    canvasBounds.y + canvasBounds.height - 30,
    { steps: 3 }
  )
  await page.keyboard.press('Escape')
  await page.mouse.up()

  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  expect(
    await page.evaluate(() => window.__flowVueTest?.connectionCandidates())
  ).toEqual([])
  expect(await adapter.changeKinds()).toEqual(changesBeforeCancellation)

  await adapter.perform(acceptedAction)

  expect(
    await page.evaluate(() => window.__flowVueTest?.connectionCandidates())
  ).toContainEqual({
    source: 'source',
    sourceHandle: 'out',
    target: 'approved',
    targetHandle: 'in',
  })
  expect(await adapter.snapshot()).toMatchObject({ edgeIds: ['edge-1'] })

  await adapter.destroy()
})

test('Vue active drag and host disposal stay isolated across canvases', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    await window.__flowVueTest?.mountGestureIsolationHosts()
  })

  const left = page.locator('[data-node-id="isolation-left"]')
  const right = page.locator('[data-node-id="isolation-right"]')
  await expect(left).toContainText('Left host')
  await expect(right).toContainText('Right host')
  const rightBounds = await right.boundingBox()
  const leftBounds = await left.boundingBox()

  if (rightBounds === null || leftBounds === null) {
    throw new Error('Missing Vue isolation host nodes')
  }

  const rightX = rightBounds.x
  const leftX = leftBounds.x
  await page.mouse.move(
    leftBounds.x + leftBounds.width / 2,
    leftBounds.y + leftBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    leftBounds.x + leftBounds.width / 2 + 45,
    leftBounds.y + leftBounds.height / 2 + 30,
    { steps: 3 }
  )

  const held = await page.evaluate(() =>
    window.__flowVueTest?.gestureIsolationSnapshot()
  )

  expect(held?.leftDragEvents).toBeGreaterThan(0)
  expect(held?.rightDragEvents).toBe(0)
  expect(held?.rightChanges).toEqual([])
  expect(held?.leftCanvasCount).toBe(1)
  expect(held?.rightCanvasCount).toBe(1)
  await expect(right).toHaveCSS('left', '40px')
  await expect(right).toContainText('Right host')

  await page.evaluate(() => window.__flowVueTest?.unmountGestureIsolationLeft())
  await expect(page.locator('[data-testid="isolation-left-host"]')).toHaveCount(
    0
  )
  await expect(
    page.locator(
      '[data-testid="isolation-right-host"] [data-testid="flow-canvas"]'
    )
  ).toHaveCount(1)
  await page.mouse.up()

  const afterUnmount = await page.evaluate(() =>
    window.__flowVueTest?.gestureIsolationSnapshot()
  )

  expect(afterUnmount?.rightDragEvents).toBe(0)
  expect(afterUnmount?.rightChanges).toEqual([])
  expect(afterUnmount?.rightCanvasCount).toBe(1)
  await expect(right).toHaveCSS('left', '40px')

  const rightBeforeRetry = await right.boundingBox()

  if (rightBeforeRetry === null) {
    throw new Error('Right Vue isolation host disappeared after left disposal')
  }

  await page.mouse.move(
    rightBeforeRetry.x + rightBeforeRetry.width / 2,
    rightBeforeRetry.y + rightBeforeRetry.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    rightBeforeRetry.x + rightBeforeRetry.width / 2 + 35,
    rightBeforeRetry.y + rightBeforeRetry.height / 2 + 20,
    { steps: 3 }
  )
  await page.mouse.up()
  await expect
    .poll(() =>
      page.evaluate(() => window.__flowVueTest?.gestureIsolationSnapshot())
    )
    .toMatchObject({ rightChanges: ['node-position'] })

  const afterRightDrag = await page.evaluate(() =>
    window.__flowVueTest?.gestureIsolationSnapshot()
  )

  expect(afterRightDrag?.rightDragEvents).toBeGreaterThan(0)
  expect(afterRightDrag?.leftChanges).toEqual(held?.leftChanges)
  expect(leftX).toBeLessThan(rightX)
})

test('Vue keyboard connection uses controlled and uncontrolled public changes', async ({
  page,
}) => {
  const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  const strictCase = interactionConnectionCases.find(
    ({ id }) => id === 'strict-accepted'
  )

  const looseTargetOriginCase = interactionConnectionCases.find(
    ({ id }) => id === 'loose-normalizes-from-target-handle-origin'
  )

  if (
    base === undefined ||
    strictCase === undefined ||
    looseTargetOriginCase === undefined
  ) {
    throw new Error('Missing keyboard connection fixtures')
  }

  const adapter = createVueConformanceAdapter(page)

  /* eslint-disable no-await-in-loop */
  for (const [connectionCase, documentMode] of [
    [strictCase, 'uncontrolled'],
    [looseTargetOriginCase, 'controlled'],
  ] as const) {
    await adapter.mount({
      ...base,
      documentMode,
      document: interactionLifecycleFixture.connectionDocument,
    })
    await page.evaluate((mode) => {
      window.__flowVueTest?.setConnectionOptions({
        mode,
        radius: 20,
        autoPanOnConnect: false,
      })
    }, connectionCase.mode)

    const source = page.locator(
      `[data-node-id="${connectionCase.connection.source}"] [data-handle-id="${connectionCase.connection.sourceHandle}"]`
    )

    const target = page.locator(
      `[data-node-id="${connectionCase.connection.target}"] [data-handle-id="${connectionCase.connection.targetHandle}"]`
    )

    await source.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByTestId('flow-connection-keyboard-status')
    ).toBeVisible()
    await target.focus()
    await page.keyboard.press('Space')

    expect(await adapter.changeKinds()).toContain('edge-add')

    if (documentMode === 'controlled') {
      expect(await adapter.snapshot()).toMatchObject({ edgeIds: [] })
      expect(await adapter.acceptedStates()).toHaveLength(0)
    } else {
      expect(await adapter.snapshot()).toMatchObject({
        edgeIds: [connectionCase.expectedEdgeId],
      })
    }

    if (
      documentMode === 'uncontrolled' &&
      connectionCase.normalized !== undefined
    ) {
      expect(
        await adapter.readState({ edgeId: connectionCase.expectedEdgeId })
      ).toMatchObject({ edge: connectionCase.normalized })
    }
  }
  /* eslint-enable no-await-in-loop */

  await adapter.destroy()
})

test('Vue production pointer handlers complete a synthetic touch connection', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  const connectionCase = interactionConnectionCases.find(
    ({ id }) => id === 'strict-accepted'
  )

  if (fixture === undefined || connectionCase === undefined) {
    throw new Error('Missing touch connection fixture')
  }

  const adapter = createVueConformanceAdapter(page)
  await adapter.mount(
    {
      ...fixture,
      documentMode: 'uncontrolled',
      document: interactionLifecycleFixture.connectionDocument,
    },
    { defaultEdgeOptions: { label: 'Default connection', strokeWidth: 4 } }
  )

  const source = page.locator(
    `[data-node-id="${connectionCase.connection.source}"] [data-handle-id="${connectionCase.connection.sourceHandle}"]`
  )

  const target = page.locator(
    `[data-node-id="${connectionCase.connection.target}"] [data-handle-id="${connectionCase.connection.targetHandle}"]`
  )

  const sourceBounds = await source.boundingBox()

  const targetBounds = await target.boundingBox()

  if (sourceBounds === null || targetBounds === null) {
    throw new Error('Missing touch connection handles')
  }

  await page.evaluate(
    ({ sourceSelector, targetSelector, start, end }) => {
      const sourceHandle = document.querySelector(sourceSelector)
      const targetHandle = document.querySelector(targetSelector)
      const canvas = document.querySelector('[data-testid="flow-canvas"]')

      if (
        !(sourceHandle instanceof HTMLElement) ||
        !(targetHandle instanceof HTMLElement) ||
        !(canvas instanceof HTMLElement)
      ) {
        throw new Error('Missing live touch connection targets')
      }

      const originalCapture = HTMLElement.prototype.setPointerCapture
      HTMLElement.prototype.setPointerCapture = (pointerId) => {
        if (pointerId !== 42) {
          throw new Error('Unexpected synthetic pointer capture id')
        }
      }

      try {
        sourceHandle.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            pointerId: 42,
            pointerType: 'touch',
            isPrimary: true,
            button: 0,
            buttons: 1,
            clientX: start.x,
            clientY: start.y,
          })
        )
        canvas.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            cancelable: true,
            pointerId: 42,
            pointerType: 'touch',
            isPrimary: true,
            button: 0,
            buttons: 1,
            clientX: end.x,
            clientY: end.y,
          })
        )
        canvas.dispatchEvent(
          new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            pointerId: 42,
            pointerType: 'touch',
            isPrimary: true,
            button: 0,
            buttons: 0,
            clientX: end.x,
            clientY: end.y,
          })
        )
      } finally {
        HTMLElement.prototype.setPointerCapture = originalCapture
      }
    },
    {
      sourceSelector: `[data-node-id="${connectionCase.connection.source}"] [data-handle-id="${connectionCase.connection.sourceHandle}"]`,
      targetSelector: `[data-node-id="${connectionCase.connection.target}"] [data-handle-id="${connectionCase.connection.targetHandle}"]`,
      start: {
        x: sourceBounds.x + sourceBounds.width / 2,
        y: sourceBounds.y + sourceBounds.height / 2,
      },
      end: {
        x: targetBounds.x + targetBounds.width / 2,
        y: targetBounds.y + targetBounds.height / 2,
      },
    }
  )

  expect(await adapter.snapshot()).toMatchObject({
    edgeIds: [connectionCase.expectedEdgeId],
  })
  expect(await adapter.changeKinds()).toContain('edge-add')
  expect(
    await adapter.readState({ edgeId: connectionCase.expectedEdgeId })
  ).toMatchObject({
    edge: {
      id: connectionCase.expectedEdgeId,
      label: 'Default connection',
      strokeWidth: 4,
    },
  })
  await adapter.destroy()
})

test('Vue custom connection preview receives candidate state and clears at terminals', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  const connectionCase = interactionConnectionCases.find(
    ({ id }) => id === 'strict-accepted'
  )

  if (fixture === undefined || connectionCase?.normalized === undefined) {
    throw new Error('Missing custom connection preview fixture')
  }

  const adapter = createVueConformanceAdapter(page)
  const document = interactionLifecycleFixture.connectionDocument

  await adapter.mount({ ...fixture, documentMode: 'uncontrolled', document })
  await page.evaluate(() =>
    window.__flowVueTest?.setConnectionPreviewEnabled(true)
  )
  await page.evaluate(() => {
    window.__flowVueTest?.setConnectionOptions({
      mode: 'strict',
      radius: 20,
      autoPanOnConnect: false,
    })
  })

  expect(
    await page.evaluate(() => window.__flowVueTest?.connectionPreview() ?? null)
  ).toBeNull()

  const source = page.locator(
    `[data-node-id="${connectionCase.connection.source}"] [data-handle-id="${connectionCase.connection.sourceHandle}"]`
  )

  const target = page.locator(
    `[data-node-id="${connectionCase.connection.target}"] [data-handle-id="${connectionCase.connection.targetHandle}"]`
  )

  const sourceBounds = await source.boundingBox()

  const targetBounds = await target.boundingBox()

  if (sourceBounds === null || targetBounds === null) {
    throw new Error('Missing custom preview handles')
  }

  await page.mouse.move(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  )
  await page.mouse.down()

  const initialPreviewStates = await page.evaluate(
    () => window.__flowVueTest?.connectionPreviewStates() ?? []
  )

  const initialPreview = initialPreviewStates.at(-1)

  expect(initialPreview?.valid).toBe(false)
  await page.mouse.move(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y + targetBounds.height / 2,
    { steps: 3 }
  )
  await expect(page.getByTestId('flow-custom-connection-preview')).toBeVisible()

  const previewStates = await page.evaluate(
    () => window.__flowVueTest?.connectionPreviewStates() ?? []
  )

  const activePreview = previewStates.at(-1)
  expect(activePreview).toMatchObject({
    kind: 'connect',
    candidate: connectionCase.normalized,
    valid: true,
  })
  expect(activePreview?.from).not.toEqual(activePreview?.to)
  expect(
    await page.evaluate(() => window.__flowVueTest?.connectionPreview())
  ).toMatchObject({ kind: 'connect', valid: true })

  await page.mouse.up()
  await expect
    .poll(() =>
      page.evaluate(() => window.__flowVueTest?.connectionPreview() ?? null)
    )
    .toBeNull()
  await expect(page.getByTestId('flow-custom-connection-preview')).toHaveCount(
    0
  )
  expect(await adapter.snapshot()).toMatchObject({
    edgeIds: [connectionCase.expectedEdgeId],
  })

  await adapter.mount({ ...fixture, documentMode: 'controlled', document })
  await page.evaluate(() =>
    window.__flowVueTest?.setConnectionPreviewEnabled(true)
  )
  await page.evaluate(() => {
    window.__flowVueTest?.setConnectionOptions({
      mode: 'strict',
      radius: 20,
      autoPanOnConnect: false,
    })
  })

  const controlledSourceBounds = await source.boundingBox()
  const controlledTargetBounds = await target.boundingBox()

  if (controlledSourceBounds === null || controlledTargetBounds === null) {
    throw new Error('Missing controlled custom preview handles')
  }

  await page.mouse.move(
    controlledSourceBounds.x + controlledSourceBounds.width / 2,
    controlledSourceBounds.y + controlledSourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    controlledTargetBounds.x + controlledTargetBounds.width / 2,
    controlledTargetBounds.y + controlledTargetBounds.height / 2,
    { steps: 3 }
  )
  await expect(page.getByTestId('flow-custom-connection-preview')).toBeVisible()
  await page.mouse.up()
  await expect(page.getByTestId('flow-custom-connection-preview')).toHaveCount(
    0
  )
  expect(await adapter.snapshot()).toMatchObject({ edgeIds: [] })
  expect(await adapter.changeKinds()).toContain('edge-add')

  await adapter.mount({ ...fixture, documentMode: 'uncontrolled', document })
  await page.evaluate(() =>
    window.__flowVueTest?.setConnectionPreviewEnabled(true)
  )
  await page.evaluate(() => {
    window.__flowVueTest?.setConnectionOptions({
      mode: 'strict',
      radius: 20,
      autoPanOnConnect: false,
    })
  })
  const cancelSourceBounds = await source.boundingBox()

  if (cancelSourceBounds === null) {
    throw new Error('Missing cancellation preview source')
  }

  await page.mouse.move(
    cancelSourceBounds.x + cancelSourceBounds.width / 2,
    cancelSourceBounds.y + cancelSourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    cancelSourceBounds.x + cancelSourceBounds.width / 2 + 20,
    cancelSourceBounds.y + cancelSourceBounds.height / 2,
    { steps: 2 }
  )
  await expect(page.getByTestId('flow-custom-connection-preview')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('flow-custom-connection-preview')).toHaveCount(
    0
  )
  expect(await adapter.snapshot()).toMatchObject({ edgeIds: [] })
  expect(await adapter.changeKinds()).toEqual([])
  await adapter.destroy()
})

test('Vue production connection gestures follow shared strict and loose cases', async ({
  page,
}) => {
  const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (base === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)

  /* eslint-disable no-await-in-loop */
  for (const connectionCase of interactionConnectionCases) {
    const document =
      connectionCase.document === 'duplicate'
        ? interactionLifecycleFixture.duplicateDocument
        : interactionLifecycleFixture.connectionDocument

    await adapter.mount({
      ...base,
      documentMode: 'uncontrolled',
      document,
    })
    await page.evaluate((mode) => {
      window.__flowVueTest?.setConnectionOptions({
        mode,
        radius: 20,
        autoPanOnConnect: false,
      })
    }, connectionCase.mode)

    const source = page.locator(
      `[data-node-id="${connectionCase.connection.source}"] [data-handle-id="${connectionCase.connection.sourceHandle}"]`
    )

    const target = page.locator(
      `[data-node-id="${connectionCase.connection.target}"] [data-handle-id="${connectionCase.connection.targetHandle}"]`
    )

    const sourceBounds = await source.boundingBox()
    const targetBounds = await target.boundingBox()

    if (sourceBounds === null || targetBounds === null) {
      throw new Error(`Missing handles for ${connectionCase.id}`)
    }

    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      targetBounds.x + targetBounds.width / 2,
      targetBounds.y + targetBounds.height / 2,
      { steps: 3 }
    )
    await page.mouse.up()

    const expectedEdgeIds =
      connectionCase.outcome === 'accepted' ||
      connectionCase.document === 'duplicate'
        ? ['edge-1']
        : []

    expect(await adapter.snapshot()).toMatchObject({ edgeIds: expectedEdgeIds })

    if (
      connectionCase.outcome === 'accepted' &&
      connectionCase.normalized !== undefined
    ) {
      expect(await adapter.readState({ edgeId: 'edge-1' })).toMatchObject({
        edge: connectionCase.normalized,
      })
    }
  }
  /* eslint-enable no-await-in-loop */

  await adapter.mount({
    ...base,
    documentMode: 'uncontrolled',
    document: interactionLifecycleFixture.connectionDocument,
  })
  await page.evaluate(() => {
    window.__flowVueTest?.setConnectionOptions({
      mode: 'loose',
      radius: 20,
      autoPanOnConnect: false,
    })
  })

  const sameKindSource = page.locator(
    '[data-node-id="source"] [data-handle-id="out"]'
  )

  const sameKindTarget = page.locator(
    '[data-node-id="target-next"] [data-handle-id="in-next"]'
  )

  const sameKindSourceBounds = await sameKindSource.boundingBox()
  const sameKindTargetBounds = await sameKindTarget.boundingBox()

  if (sameKindSourceBounds === null || sameKindTargetBounds === null) {
    throw new Error('Missing loose same-kind connection handles')
  }

  await page.mouse.move(
    sameKindSourceBounds.x + sameKindSourceBounds.width / 2,
    sameKindSourceBounds.y + sameKindSourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    sameKindTargetBounds.x + sameKindTargetBounds.width / 2,
    sameKindTargetBounds.y + sameKindTargetBounds.height / 2,
    { steps: 3 }
  )
  await page.mouse.up()

  expect(await adapter.readState({ edgeId: 'edge-1' })).toMatchObject({
    edge: {
      source: 'source',
      sourceHandle: 'out',
      target: 'target-next',
      targetHandle: 'in-next',
    },
  })

  await adapter.destroy()
})

test('Vue connection radius uses zoomed graph distance with direct hit priority', async ({
  page,
}) => {
  const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (base === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)

  await adapter.mount({
    ...base,
    documentMode: 'uncontrolled',
    viewportMode: 'uncontrolled',
    document: interactionLifecycleFixture.connectionDocument,
  })
  await page.evaluate(() => {
    window.__flowVueTest?.updateViewport({ x: 0, y: 0, zoom: 2 })
  })

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="target"] [data-handle-id="in"]')
  const sourceBounds = await source.boundingBox()
  const targetBounds = await target.boundingBox()

  if (sourceBounds === null || targetBounds === null) {
    throw new Error('Missing radius test handles')
  }

  await page.mouse.move(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y + targetBounds.height / 2 + 14,
    { steps: 3 }
  )
  await page.mouse.up()
  expect(await adapter.snapshot()).toMatchObject({ edgeIds: ['edge-1'] })

  await adapter.mount({
    ...base,
    documentMode: 'uncontrolled',
    viewportMode: 'uncontrolled',
    document: interactionLifecycleFixture.connectionDocument,
  })
  await page.evaluate(() => {
    window.__flowVueTest?.setConnectionOptions({
      mode: 'strict',
      radius: 20,
      autoPanOnConnect: false,
    })
    window.__flowVueTest?.updateViewport({ x: 0, y: 0, zoom: 2 })
  })

  const outsideSourceBounds = await source.boundingBox()
  const outsideTargetBounds = await target.boundingBox()

  if (outsideSourceBounds === null || outsideTargetBounds === null) {
    throw new Error('Missing outside-radius handles')
  }

  await page.mouse.move(
    outsideSourceBounds.x + outsideSourceBounds.width / 2,
    outsideSourceBounds.y + outsideSourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    outsideTargetBounds.x + outsideTargetBounds.width / 2,
    outsideTargetBounds.y + outsideTargetBounds.height / 2 + 24,
    { steps: 3 }
  )
  await page.mouse.up()
  expect(await adapter.snapshot()).toMatchObject({ edgeIds: [] })

  await adapter.mount({
    ...base,
    documentMode: 'uncontrolled',
    viewportMode: 'uncontrolled',
    document: interactionLifecycleFixture.connectionDocument,
  })
  await page.evaluate(() => {
    window.__flowVueTest?.setConnectionOptions({
      mode: 'strict',
      radius: 0,
      autoPanOnConnect: false,
    })
    window.__flowVueTest?.updateViewport({ x: 0, y: 0, zoom: 2 })
  })

  const directSourceBounds = await source.boundingBox()
  const directTargetBounds = await target.boundingBox()

  if (directSourceBounds === null || directTargetBounds === null) {
    throw new Error('Missing direct-hit handles at zoom')
  }

  await page.mouse.move(
    directSourceBounds.x + directSourceBounds.width / 2,
    directSourceBounds.y + directSourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    directTargetBounds.x + directTargetBounds.width / 2,
    directTargetBounds.y + directTargetBounds.height / 2,
    { steps: 3 }
  )
  await page.mouse.up()
  expect(await adapter.snapshot()).toMatchObject({ edgeIds: ['edge-1'] })
  await adapter.destroy()
})

test('Vue connect auto-pan runs only while its gesture is active', async ({
  page,
}) => {
  const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (base === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)

  await adapter.mount({
    ...base,
    documentMode: 'uncontrolled',
    viewportMode: 'uncontrolled',
    document: interactionLifecycleFixture.connectionDocument,
  })
  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const canvas = page.getByTestId('flow-canvas')
  const sourceBounds = await source.boundingBox()
  const canvasBounds = await canvas.boundingBox()

  if (sourceBounds === null || canvasBounds === null) {
    throw new Error('Missing Vue auto-pan bounds')
  }

  const initialSourceBounds = await page
    .locator('[data-node-id="source"]')
    .boundingBox()

  await page.mouse.move(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    canvasBounds.x + canvasBounds.width - 2,
    canvasBounds.y + canvasBounds.height / 2,
    { steps: 4 }
  )

  const pannedSourceBounds = await page
    .locator('[data-node-id="source"]')
    .boundingBox()

  expect(initialSourceBounds).not.toBeNull()
  expect(pannedSourceBounds).not.toBeNull()
  expect(pannedSourceBounds?.x).toBeLessThan(initialSourceBounds?.x ?? 0)

  await page.keyboard.press('Escape')
  await page.mouse.up()

  const settledSourceBounds = await page
    .locator('[data-node-id="source"]')
    .boundingBox()

  await page.mouse.move(
    canvasBounds.x + canvasBounds.width - 2,
    canvasBounds.y + canvasBounds.height / 2,
    { steps: 2 }
  )

  const afterTerminalBounds = await page
    .locator('[data-node-id="source"]')
    .boundingBox()

  expect(afterTerminalBounds?.x).toBeCloseTo(settledSourceBounds?.x ?? 0, 0)
  expect(await page.getByTestId('flow-connection-preview')).toHaveCount(0)

  await adapter.mount({
    ...base,
    documentMode: 'uncontrolled',
    viewportMode: 'uncontrolled',
    document: interactionLifecycleFixture.connectionDocument,
  })
  await page.evaluate(() => {
    window.__flowVueTest?.setConnectionOptions({
      mode: 'strict',
      radius: 20,
      autoPanOnConnect: false,
    })
  })

  const disabledSourceBounds = await source.boundingBox()
  const disabledCanvasBounds = await canvas.boundingBox()
  const disabledNode = page.locator('[data-node-id="source"]')
  const disabledBefore = await disabledNode.boundingBox()

  if (
    disabledSourceBounds === null ||
    disabledCanvasBounds === null ||
    disabledBefore === null
  ) {
    throw new Error('Missing auto-pan disabled gesture bounds')
  }

  await page.mouse.move(
    disabledSourceBounds.x + disabledSourceBounds.width / 2,
    disabledSourceBounds.y + disabledSourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    disabledCanvasBounds.x + disabledCanvasBounds.width - 2,
    disabledCanvasBounds.y + disabledCanvasBounds.height / 2,
    { steps: 4 }
  )
  const disabledAfter = await disabledNode.boundingBox()
  expect(disabledAfter?.x).toBeCloseTo(disabledBefore.x, 0)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  expect(await page.getByTestId('flow-connection-preview')).toHaveCount(0)
  await adapter.destroy()
})

test('Vue cancels an active connection when its source handle is replaced', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(
    ({ id }) => id === 'connection-validity'
  )

  if (fixture === undefined) {
    throw new Error('Missing connection-validity fixture')
  }

  const adapter = createVueConformanceAdapter(page)
  await adapter.mount(fixture)
  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const bounds = await source.boundingBox()

  if (bounds === null) {
    throw new Error('Missing Vue source handle bounds')
  }

  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(bounds.x + 36, bounds.y + 20, { steps: 2 })
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()

  const replacement = structuredClone(fixture.document)
  const sourceNode = replacement.nodes.find(({ id }) => id === 'source')

  if (sourceNode === undefined) {
    throw new Error('Missing source node in Vue fixture')
  }

  await page.evaluate(
    (document) => window.__flowVueTest?.updateDocument(document),
    {
      ...replacement,
      nodes: replacement.nodes.map((node) =>
        node.id === 'source'
          ? {
              ...node,
              handles: [
                {
                  id: 'replacement',
                  kind: 'source' as const,
                  side: 'right' as const,
                },
              ],
            }
          : node
      ),
    }
  )
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  await page.mouse.up()

  await page.evaluate(
    (document) => window.__flowVueTest?.updateDocument(document),
    replacement
  )
  await adapter.perform({
    kind: 'connect',
    sourceNodeId: 'source',
    sourceHandleId: 'out',
    targetNodeId: 'approved',
    targetHandleId: 'in',
  })
  expect(await adapter.snapshot()).toMatchObject({ edgeIds: ['edge-1'] })
  await adapter.destroy()
})

test('Vue production reconnect gestures follow shared reconnection cases', async ({
  page,
}) => {
  const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (base === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)

  const document = {
    ...interactionLifecycleFixture.reconnectDocument,
    edges: interactionLifecycleFixture.reconnectDocument.edges.map((edge) =>
      edge.id === 'edge-existing'
        ? { ...edge, selected: true, reconnectable: true }
        : edge
    ),
  }

  const [originalEdge] = interactionLifecycleFixture.reconnectDocument.edges

  if (originalEdge === undefined) {
    throw new Error('Missing shared reconnect edge')
  }

  /* eslint-disable no-await-in-loop */
  for (const reconnectCase of interactionReconnectionCases) {
    await adapter.mount({ ...base, documentMode: 'uncontrolled', document })

    const anchor = page.locator(
      `[data-testid="flow-edge-reconnect-anchor"][data-edge-id="edge-existing"][data-endpoint="${reconnectCase.endpoint}"]`
    )

    const target = page.locator(
      `[data-node-id="${reconnectCase.nodeId}"] [data-handle-id="${reconnectCase.handleId}"]`
    )

    const anchorBounds = await anchor.boundingBox()
    const targetBounds = await target.boundingBox()

    if (anchorBounds === null || targetBounds === null) {
      throw new Error(`Missing reconnect handles for ${reconnectCase.id}`)
    }

    await page.mouse.move(
      anchorBounds.x + anchorBounds.width / 2,
      anchorBounds.y + anchorBounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      targetBounds.x + targetBounds.width / 2,
      targetBounds.y + targetBounds.height / 2,
      { steps: 3 }
    )
    await page.mouse.up()

    const edge = await adapter.readState({ edgeId: 'edge-existing' })

    if (edge.edge === null || edge.edge === undefined) {
      throw new Error(`Missing edge result for ${reconnectCase.id}`)
    }

    if (reconnectCase.outcome === 'accepted') {
      if (reconnectCase.expectedEdge === undefined) {
        throw new Error(`Missing expected edge for ${reconnectCase.id}`)
      }

      expect(edge.edge).toMatchObject(reconnectCase.expectedEdge)
    } else {
      expect(edge.edge).toMatchObject(originalEdge)
    }
  }
  /* eslint-enable no-await-in-loop */

  await adapter.destroy()
})

// eslint-disable-next-line complexity -- drives each shared reconnect cancellation terminal and retry.
test('Vue reconnect cancellation sources clear stale proposals before a fresh controlled or uncontrolled retry', async ({
  page,
}) => {
  const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  const retryCase = interactionReconnectionCases.find(
    ({ endpoint, outcome }) => endpoint === 'source' && outcome === 'accepted'
  )

  if (base === undefined || retryCase?.expectedEdge === undefined) {
    throw new Error('Missing accepted reconnect retry fixture')
  }

  const adapter = createVueConformanceAdapter(page)

  const originalEdges = interactionLifecycleFixture.reconnectDocument.edges

  const reconnectDocument = {
    ...interactionLifecycleFixture.reconnectDocument,
    edges: originalEdges.map((edge) =>
      edge.id === 'edge-existing'
        ? { ...edge, selected: true, reconnectable: true }
        : edge
    ),
  }

  const originalEdge = reconnectDocument.edges.find(
    ({ id }) => id === 'edge-existing'
  )

  if (originalEdge === undefined) {
    throw new Error('Missing original reconnect edge')
  }

  const reasons = interactionLifecycleFixture.cancellationReasons.filter(
    (reason) =>
      [
        'escape',
        'blur',
        'pointer-cancel',
        'capture-loss',
        'removal',
        'configuration-replacement',
        'unmount',
      ].includes(reason)
  )

  /* eslint-disable no-await-in-loop */
  for (const [index, reason] of reasons.entries()) {
    const documentMode = index % 2 === 0 ? 'uncontrolled' : 'controlled'

    await adapter.mount({ ...base, documentMode, document: reconnectDocument })
    await page.evaluate(() => {
      window.__flowVueTest?.setConnectionOptions({
        mode: 'strict',
        radius: 20,
        autoPanOnConnect: false,
      })
    })

    const anchor = page.locator(
      '[data-testid="flow-edge-reconnect-anchor"][data-edge-id="edge-existing"][data-endpoint="source"]'
    )

    const target = page.locator(
      `[data-node-id="${retryCase.nodeId}"] [data-handle-id="${retryCase.handleId}"]`
    )

    const anchorBounds = await anchor.boundingBox()

    const targetBounds = await target.boundingBox()

    if (anchorBounds === null || targetBounds === null) {
      throw new Error(`Missing active reconnect geometry for ${reason}`)
    }

    await page.mouse.move(
      anchorBounds.x + anchorBounds.width / 2,
      anchorBounds.y + anchorBounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      targetBounds.x + targetBounds.width / 2,
      targetBounds.y + targetBounds.height / 2,
      { steps: 3 }
    )
    await expect(page.getByTestId('flow-connection-preview')).toBeVisible()

    switch (reason) {
      case 'escape': {
        await page.keyboard.press('Escape')
        break
      }

      case 'blur': {
        await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
        break
      }

      case 'pointer-cancel': {
        await page
          .getByTestId('flow-canvas')
          .dispatchEvent('pointercancel', { pointerId: 1, bubbles: true })
        break
      }

      case 'capture-loss': {
        await page
          .getByTestId('flow-canvas')
          .dispatchEvent('lostpointercapture', {
            pointerId: 1,
            bubbles: true,
          })
        break
      }

      case 'removal': {
        await page.evaluate((document) => {
          window.__flowVueTest?.updateDocument({
            nodes: document.nodes.filter(({ id }) => id !== 'target'),
            edges: [],
          })
        }, reconnectDocument)
        break
      }

      case 'configuration-replacement': {
        await page.evaluate(() => {
          window.__flowVueTest?.setConnectionOptions({
            mode: 'loose',
            radius: 20,
            autoPanOnConnect: false,
          })
        })
        break
      }

      case 'unmount': {
        const disposal = await adapter.destroy()
        expect(disposal.mountedElements).toBe(0)
        expect(disposal.changesAfterDestroy).toBe(0)
        break
      }

      default: {
        throw new Error(`Unsupported reconnect cancellation reason: ${reason}`)
      }
    }

    await page.mouse.up()

    if (reason === 'removal' || reason === 'unmount') {
      await adapter.mount({
        ...base,
        documentMode,
        document: reconnectDocument,
      })
    }

    await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
    expect(await adapter.snapshot()).toMatchObject({
      edgeIds: ['edge-existing'],
    })
    expect(await adapter.readState({ edgeId: 'edge-existing' })).toMatchObject({
      edge: originalEdge,
    })
    expect(await adapter.changeKinds()).not.toContain('edge-reconnect')

    if (reason === 'configuration-replacement') {
      await page.evaluate(() => {
        window.__flowVueTest?.setConnectionOptions({
          mode: 'strict',
          radius: 20,
          autoPanOnConnect: false,
        })
      })
    }

    const retryAnchor = page.locator(
      '[data-testid="flow-edge-reconnect-anchor"][data-edge-id="edge-existing"][data-endpoint="source"]'
    )

    const retryTarget = page.locator(
      `[data-node-id="${retryCase.nodeId}"] [data-handle-id="${retryCase.handleId}"]`
    )

    const retryAnchorBounds = await retryAnchor.boundingBox()

    const retryTargetBounds = await retryTarget.boundingBox()

    if (retryAnchorBounds === null || retryTargetBounds === null) {
      throw new Error(`Missing fresh reconnect geometry for ${reason}`)
    }

    await page.mouse.move(
      retryAnchorBounds.x + retryAnchorBounds.width / 2,
      retryAnchorBounds.y + retryAnchorBounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      retryTargetBounds.x + retryTargetBounds.width / 2,
      retryTargetBounds.y + retryTargetBounds.height / 2,
      { steps: 3 }
    )
    await page.mouse.up()

    expect(await adapter.changeKinds()).toEqual(['edge-reconnect'])

    if (documentMode === 'controlled') {
      expect(
        await adapter.readState({ edgeId: 'edge-existing' })
      ).toMatchObject({
        edge: originalEdge,
      })
      await page.evaluate(
        ({ document, expectedEdge }) => {
          window.__flowVueTest?.updateDocument({
            ...document,
            edges: document.edges.map((edge) =>
              edge.id === expectedEdge.id ? expectedEdge : edge
            ),
          })
        },
        { document: reconnectDocument, expectedEdge: retryCase.expectedEdge }
      )
    }

    expect(await adapter.readState({ edgeId: 'edge-existing' })).toMatchObject({
      edge: retryCase.expectedEdge,
    })
  }
  /* eslint-enable no-await-in-loop */

  await adapter.destroy()
})

test('Vue keyboard reconnection follows shared case under controlled ownership', async ({
  page,
}) => {
  const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  const reconnectCase = interactionReconnectionCases.find(
    ({ id }) => id === 'source-endpoint-accepted'
  )

  const modeCase = interactionConnectionCases.find(
    ({ id }) => id === 'strict-accepted'
  )

  if (
    base === undefined ||
    reconnectCase?.expectedEdge === undefined ||
    modeCase === undefined
  ) {
    throw new Error('Missing shared keyboard reconnect case')
  }

  const adapter = createVueConformanceAdapter(page)
  const { expectedEdge } = reconnectCase

  const [originalEdge] = interactionLifecycleFixture.reconnectDocument.edges

  if (originalEdge === undefined) {
    throw new Error('Missing reconnect base edge')
  }

  const document = {
    ...interactionLifecycleFixture.reconnectDocument,
    edges: interactionLifecycleFixture.reconnectDocument.edges.map((edge) =>
      edge.id === expectedEdge.id
        ? { ...edge, selected: true, reconnectable: true }
        : edge
    ),
  }

  /* eslint-disable no-await-in-loop */
  for (const documentMode of ['controlled', 'uncontrolled'] as const) {
    await adapter.mount({ ...base, documentMode, document })
    await page.evaluate((mode) => {
      window.__flowVueTest?.setConnectionOptions({
        mode,
        radius: 20,
        autoPanOnConnect: false,
      })
    }, modeCase.mode)

    const anchor = page.locator(
      `[data-testid="flow-edge-reconnect-anchor"][data-edge-id="${expectedEdge.id}"][data-endpoint="${reconnectCase.endpoint}"]`
    )

    const target = page.locator(
      `[data-node-id="${reconnectCase.nodeId}"] [data-handle-id="${reconnectCase.handleId}"]`
    )

    await anchor.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByTestId('flow-connection-keyboard-status')
    ).toBeVisible()
    await target.focus()
    await page.keyboard.press('Space')

    expect(await adapter.changeKinds()).toContain('edge-reconnect')

    const edge = await adapter.readState({ edgeId: expectedEdge.id })

    if (documentMode === 'controlled') {
      expect(edge.edge).toMatchObject(originalEdge)
      expect(await adapter.acceptedStates()).toHaveLength(0)
    } else {
      expect(edge.edge).toMatchObject(expectedEdge)
    }
  }
  /* eslint-enable no-await-in-loop */

  await adapter.destroy()
})

test('Vue reconnects a selected edge endpoint through the public edge change', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (fixture === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)

  const reconnectDocument = {
    nodes: [
      {
        id: 'old-source',
        label: 'Old source',
        position: { x: 30, y: 50 },
        handles: [
          { id: 'out', kind: 'source' as const, side: 'right' as const },
        ],
      },
      {
        id: 'new-source',
        label: 'New source',
        position: { x: 30, y: 220 },
        handles: [
          { id: 'out', kind: 'source' as const, side: 'right' as const },
        ],
      },
      {
        id: 'target',
        label: 'Target',
        position: { x: 350, y: 130 },
        handles: [{ id: 'in', kind: 'target' as const, side: 'left' as const }],
      },
    ],
    edges: [
      {
        id: 'edge-reconnect',
        source: 'old-source',
        sourceHandle: 'out',
        target: 'target',
        targetHandle: 'in',
        reconnectable: true,
        selected: true,
      },
    ],
  }

  await adapter.mount({
    ...fixture,
    documentMode: 'uncontrolled',
    document: reconnectDocument,
  })

  const anchor = page.locator(
    '[data-testid="flow-edge-reconnect-anchor"][data-edge-id="edge-reconnect"][data-endpoint="source"]'
  )

  const target = page.locator(
    '[data-node-id="new-source"] [data-handle-id="out"]'
  )

  const anchorBounds = await anchor.boundingBox()
  const targetBounds = await target.boundingBox()

  if (anchorBounds === null || targetBounds === null) {
    throw new Error('Missing Vue reconnect anchor or replacement handle')
  }

  await page.mouse.move(
    anchorBounds.x + anchorBounds.width / 2,
    anchorBounds.y + anchorBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y + targetBounds.height / 2,
    { steps: 3 }
  )
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()

  await page.evaluate((document) => {
    const replacement = {
      ...document,
      nodes: document.nodes.map((node) =>
        node.id === 'new-source'
          ? {
              ...node,
              handles: [
                {
                  id: 'replacement-out',
                  kind: 'source' as const,
                  side: 'right' as const,
                },
              ],
            }
          : node
      ),
    }

    window.__flowVueTest?.updateDocument(replacement)
  }, reconnectDocument)
  await expect(page.getByTestId('flow-connection-preview')).toHaveCount(0)
  await page.mouse.up()
  expect(await adapter.readState({ edgeId: 'edge-reconnect' })).toMatchObject({
    edge: { source: 'old-source', sourceHandle: 'out' },
  })
  expect(await adapter.changeKinds()).not.toContain('edge-reconnect')

  await page.evaluate((document) => {
    window.__flowVueTest?.updateDocument(document)
  }, reconnectDocument)
  const freshAnchorBounds = await anchor.boundingBox()
  const freshTargetBounds = await target.boundingBox()

  if (freshAnchorBounds === null || freshTargetBounds === null) {
    throw new Error('Missing fresh Vue reconnect bounds')
  }

  await page.mouse.move(
    freshAnchorBounds.x + freshAnchorBounds.width / 2,
    freshAnchorBounds.y + freshAnchorBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    freshTargetBounds.x + freshTargetBounds.width / 2,
    freshTargetBounds.y + freshTargetBounds.height / 2,
    { steps: 4 }
  )
  await page.mouse.up()

  expect(await adapter.readState({ edgeId: 'edge-reconnect' })).toMatchObject({
    edge: { source: 'new-source', sourceHandle: 'out' },
  })
  expect(await adapter.changeKinds()).toContain('edge-reconnect')

  await adapter.destroy()
})

test('Vue gives a native input ownership of Escape and wheel events', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(
    ({ id }) => id === 'connection-validity'
  )

  if (fixture === undefined) {
    throw new Error('Missing connection-validity fixture')
  }

  const adapter = createVueConformanceAdapter(page)
  await adapter.mount(fixture)
  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const bounds = await source.boundingBox()

  if (bounds === null) {
    throw new Error('Missing Vue source handle bounds')
  }

  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(bounds.x + 34, bounds.y + 20, { steps: 2 })
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()

  const ownership = await page.evaluate(() => {
    const node = document.querySelector('[data-node-id="source"]')

    if (!(node instanceof HTMLElement)) {
      throw new Error('Missing Vue source node')
    }

    const controls = [
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('select'),
      document.createElement('div'),
      document.createElement('button'),
      document.createElement('a'),
    ]

    const results = controls.map((control) => {
      if (control instanceof HTMLDivElement) {
        control.contentEditable = 'true'
      }

      if (control instanceof HTMLAnchorElement) {
        control.href = '#native-control'
      }

      node.append(control)

      control.focus()

      const keyNotPrevented = control.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Escape',
        })
      )

      const wheelNotPrevented = control.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: 100,
        })
      )

      return { keyNotPrevented, wheelNotPrevented }
    })

    return results
  })

  expect(
    ownership.every(
      ({ keyNotPrevented, wheelNotPrevented }) =>
        keyNotPrevented && wheelNotPrevented
    )
  ).toBe(true)
  await expect(page.getByTestId('flow-connection-preview')).toBeVisible()
  await page.mouse.up()
  await adapter.destroy()

  await adapter.mount(fixture)

  const sourceNode = page.locator('[data-node-id="source"]')
  const sourceBeforePointer = await adapter.readState({ nodeId: 'source' })
  const originalPosition = sourceBeforePointer.node?.position

  const pointerTargets = await sourceNode.evaluate((node) => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    select.append(new Option('Native option', 'native'))
    const contentEditable = document.createElement('div')
    contentEditable.contentEditable = 'true'
    const button = document.createElement('button')
    button.type = 'button'
    const link = document.createElement('a')
    link.href = '#native-control'
    const flowNoDrag = document.createElement('div')
    const noDrag = document.createElement('div')
    flowNoDrag.dataset.flowNoDrag = 'true'
    noDrag.dataset.flowNodrag = 'true'

    const targets = [
      input,
      textarea,
      select,
      contentEditable,
      button,
      link,
      flowNoDrag,
      noDrag,
    ]

    for (const [index, target] of targets.entries()) {
      target.dataset.testid = `vue-pointer-owner-${index}`
      target.style.cssText = 'display:block;width:20px;height:20px;margin:2px'
      node.append(target)
    }

    return targets.map((_, index) => `vue-pointer-owner-${index}`)
  })

  /* eslint-disable no-await-in-loop -- Verify pointer ownership on each nested target serially. */
  for (const testId of pointerTargets) {
    const target = page.getByTestId(testId)
    const targetBounds = await target.boundingBox()

    if (targetBounds === null) {
      throw new Error(`Missing pointer-owned target geometry for ${testId}`)
    }

    await page.mouse.move(targetBounds.x + 5, targetBounds.y + 5)
    await page.mouse.down()
    await page.mouse.move(
      targetBounds.x + targetBounds.width + 40,
      targetBounds.y + 5
    )
    await page.mouse.up()
    const stateAfterPointer = await adapter.readState({ nodeId: 'source' })

    expect(stateAfterPointer.node?.position).toEqual(originalPosition)
  }
  /* eslint-enable no-await-in-loop */

  await adapter.destroy()
})

test('Vue rectangle selection honors full and partial modes', async ({
  page,
}) => {
  const adapter = createVueConformanceAdapter(page)

  const selectionDocument = {
    ...interactionLifecycleFixture.document,
    nodes: interactionLifecycleFixture.document.nodes.map((node) => ({
      ...node,
      selected: false,
    })),
  }

  /* eslint-disable no-await-in-loop */
  for (const selectionCase of interactionLifecycleFixture.selectionCases) {
    await adapter.mount({
      ...lifecycleFixture('uncontrolled', false),
      document: selectionDocument,
    })
    await page.evaluate(
      (mode) => window.__flowVueTest?.setSelectionMode(mode),
      selectionCase.mode
    )
    const canvas = await page.getByTestId('flow-canvas').boundingBox()

    if (canvas === null) {
      throw new Error('Missing selection canvas bounds')
    }

    const start = {
      x: canvas.x + selectionCase.rect.x + 2,
      y: canvas.y + selectionCase.rect.y + 2,
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

    expect(await adapter.changeKinds()).toContain('selection-set')

    for (const node of selectionDocument.nodes) {
      const state = await adapter.readState({ nodeId: node.id })
      expect(state.node?.selected === true).toBe(
        selectionCase.nodeIds.includes(node.id)
      )
    }
  }
  /* eslint-enable no-await-in-loop */

  await adapter.destroy()
})

test('Vue keyboard rectangle selection previews, cancels, retries, and honors controlled ownership', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (fixture === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)

  const document = {
    ...interactionLifecycleFixture.document,
    nodes: interactionLifecycleFixture.document.nodes.map((node) => ({
      ...node,
      selected: false,
    })),
  }

  const activateAndExtend = async (): Promise<void> => {
    await page.locator('[data-node-id="near"]').focus()
    await page.keyboard.press('Shift+Space')
    await expect(
      page.getByTestId('flow-selection-keyboard-status')
    ).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await expect(page.getByTestId('flow-selection-rect')).toBeVisible()
  }

  await adapter.mount({ ...fixture, documentMode: 'uncontrolled', document })
  await page.evaluate(() => window.__flowVueTest?.setSelectionMode('partial'))
  await activateAndExtend()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('flow-selection-keyboard-status')).toHaveCount(
    0
  )
  await expect(page.getByTestId('flow-selection-rect')).toHaveCount(0)
  expect(await adapter.changeKinds()).not.toContain('selection-set')

  await activateAndExtend()
  await page.keyboard.press('Enter')
  const uncontrolledSelection = await adapter.readState({ nodeId: 'near' })
  expect(uncontrolledSelection.node?.selected).toBe(true)
  expect(await adapter.changeKinds()).toEqual(['selection-set'])

  await adapter.mount({ ...fixture, documentMode: 'controlled', document })
  await page.evaluate(() => window.__flowVueTest?.setSelectionMode('partial'))
  await activateAndExtend()
  await page.keyboard.press('Enter')
  const controlledSelection = await adapter.readState({ nodeId: 'near' })
  expect(controlledSelection.node?.selected).toBe(false)
  expect(await adapter.changeKinds()).toContain('selection-set')

  const acceptedDocument = {
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === 'near' ? { ...node, selected: true } : node
    ),
  }

  await page.evaluate((nextDocument) => {
    window.__flowVueTest?.acceptDocument(nextDocument)
  }, acceptedDocument)
  const acceptedSelection = await adapter.readState({ nodeId: 'near' })
  expect(acceptedSelection.node?.selected).toBe(true)
  await adapter.destroy()
})

test('Vue selection cancellation sources clear the preview and allow a fresh selection', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (fixture === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)

  const document = {
    ...interactionLifecycleFixture.document,
    nodes: interactionLifecycleFixture.document.nodes.map((node) => ({
      ...node,
      selected: false,
    })),
  }

  const { cancellationReasons } = interactionLifecycleFixture

  /* eslint-disable no-await-in-loop */
  for (const [index, reason] of cancellationReasons.entries()) {
    const documentMode = index % 2 === 0 ? 'uncontrolled' : 'controlled'

    await adapter.mount({ ...fixture, documentMode, document })
    const canvas = await page.getByTestId('flow-canvas').boundingBox()

    if (canvas === null) {
      throw new Error(`Missing selection canvas for ${reason}`)
    }

    const start = { x: canvas.x + 5, y: canvas.y + 5 }
    const end = { x: canvas.x + 150, y: canvas.y + 130 }

    await page.keyboard.down('Shift')
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 3 })
    await expect(page.getByTestId('flow-selection-rect')).toBeVisible()

    switch (reason) {
      case 'escape': {
        await page.keyboard.press('Escape')
        break
      }

      case 'blur': {
        await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
        break
      }

      case 'pointer-cancel': {
        await page
          .getByTestId('flow-canvas')
          .dispatchEvent('pointercancel', { pointerId: 1, bubbles: true })
        break
      }

      case 'capture-loss': {
        await page
          .getByTestId('flow-canvas')
          .dispatchEvent('lostpointercapture', {
            pointerId: 1,
            bubbles: true,
          })
        break
      }

      case 'configuration-replacement': {
        await page.evaluate(() =>
          window.__flowVueTest?.setSelectionMode('partial')
        )
        break
      }

      case 'removal': {
        await page.evaluate((nextDocument) => {
          window.__flowVueTest?.updateDocument({
            ...nextDocument,
            nodes: nextDocument.nodes.filter(
              ({ id }) => id !== 'near' && id !== 'child'
            ),
          })
        }, document)
        break
      }

      case 'unmount': {
        const disposal = await adapter.destroy()
        expect(disposal.mountedElements).toBe(0)
        break
      }

      default: {
        throw new Error(`Unsupported selection cancellation reason: ${reason}`)
      }
    }

    await page.mouse.up()
    await page.keyboard.up('Shift')

    if (reason === 'unmount') {
      await adapter.mount({
        ...fixture,
        documentMode,
        document,
      })
    }

    if (reason === 'removal') {
      await page.evaluate((nextDocument) => {
        window.__flowVueTest?.updateDocument(nextDocument)
      }, document)
    }

    if (reason === 'configuration-replacement') {
      await page.evaluate(() => window.__flowVueTest?.setSelectionMode('full'))
    }

    await expect(page.getByTestId('flow-selection-rect')).toHaveCount(0)
    expect(await adapter.changeKinds()).not.toContain('selection-set')

    const stateAfterCancellation = await adapter.readState({ nodeId: 'near' })
    expect(stateAfterCancellation.node?.selected).toBe(false)

    const retryCanvas = await page.getByTestId('flow-canvas').boundingBox()

    if (retryCanvas === null) {
      throw new Error(`Missing selection retry canvas for ${reason}`)
    }

    await page.keyboard.down('Shift')
    await page.mouse.move(retryCanvas.x + 5, retryCanvas.y + 5)
    await page.mouse.down()
    await page.mouse.move(retryCanvas.x + 150, retryCanvas.y + 130, {
      steps: 3,
    })
    await expect(page.getByTestId('flow-selection-rect')).toBeVisible()
    await page.mouse.up()
    await page.keyboard.up('Shift')

    const stateAfterRetry = await adapter.readState({ nodeId: 'near' })

    if (documentMode === 'controlled') {
      expect(stateAfterRetry.node?.selected).toBe(false)
      expect(await adapter.changeKinds()).toEqual(['selection-set'])

      const acceptedDocument = {
        ...document,
        nodes: document.nodes.map((node) =>
          node.id === 'near' ? { ...node, selected: true } : node
        ),
      }

      await page.evaluate((nextDocument) => {
        window.__flowVueTest?.updateDocument(nextDocument)
      }, acceptedDocument)
    }

    const acceptedSelection = await adapter.readState({ nodeId: 'near' })

    expect(acceptedSelection.node?.selected).toBe(true)
    expect(await adapter.changeKinds()).toEqual(['selection-set'])
    await adapter.destroy()
  }
  /* eslint-enable no-await-in-loop */
})

test('Vue resize cancellation sources clear transient geometry before a fresh controlled or uncontrolled resize', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (fixture === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)
  const { document, resizeStart } = interactionLifecycleFixture

  const initialSize = resizeStart.size

  const reasons = interactionLifecycleFixture.cancellationReasons.filter(
    (reason) =>
      [
        'escape',
        'blur',
        'pointer-cancel',
        'capture-loss',
        'removal',
        'unmount',
      ].includes(reason)
  )

  /* eslint-disable no-await-in-loop */
  for (const [index, reason] of reasons.entries()) {
    const documentMode = index % 2 === 0 ? 'uncontrolled' : 'controlled'

    await adapter.mount({ ...fixture, documentMode, document })

    const handle = page.locator(
      '[data-node-id="near"] [data-direction="right"]'
    )

    const bounds = await handle.boundingBox()

    if (bounds === null) {
      throw new Error(`Missing resize handle for ${reason}`)
    }

    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      bounds.x + bounds.width / 2 + 20,
      bounds.y + bounds.height / 2,
      { steps: 2 }
    )

    switch (reason) {
      case 'escape': {
        await page.keyboard.press('Escape')
        break
      }

      case 'blur': {
        await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
        break
      }

      case 'pointer-cancel': {
        await page
          .getByTestId('flow-canvas')
          .dispatchEvent('pointercancel', { pointerId: 1, bubbles: true })
        break
      }

      case 'capture-loss': {
        await page
          .getByTestId('flow-canvas')
          .dispatchEvent('lostpointercapture', {
            pointerId: 1,
            bubbles: true,
          })
        break
      }

      case 'removal': {
        await page.evaluate((nextDocument) => {
          window.__flowVueTest?.updateDocument({
            ...nextDocument,
            nodes: nextDocument.nodes.filter(
              ({ id }) => id !== 'near' && id !== 'child'
            ),
          })
        }, document)
        break
      }

      case 'unmount': {
        const disposal = await adapter.destroy()
        expect(disposal.mountedElements).toBe(0)
        break
      }

      default: {
        throw new Error(`Unsupported resize cancellation reason: ${reason}`)
      }
    }

    await page.mouse.up()

    if (reason === 'removal' || reason === 'unmount') {
      await adapter.mount({ ...fixture, documentMode, document })
    }

    expect(await adapter.readState({ nodeId: 'near' })).toMatchObject({
      node: { size: initialSize },
    })
    expect(await adapter.changeKinds()).not.toContain('node-bounds')

    const retryHandle = page.locator(
      '[data-node-id="near"] [data-direction="right"]'
    )

    const retryBounds = await retryHandle.boundingBox()

    if (retryBounds === null) {
      throw new Error(`Missing fresh resize handle for ${reason}`)
    }

    await page.mouse.move(
      retryBounds.x + retryBounds.width / 2,
      retryBounds.y + retryBounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      retryBounds.x + retryBounds.width / 2 + 10,
      retryBounds.y + retryBounds.height / 2,
      { steps: 2 }
    )
    await page.mouse.up()

    expect(await adapter.changeKinds()).toEqual(['node-bounds'])

    if (documentMode === 'controlled') {
      expect(await adapter.readState({ nodeId: 'near' })).toMatchObject({
        node: { size: initialSize },
      })

      const acceptedDocument = {
        ...document,
        nodes: document.nodes.map((node) =>
          node.id === 'near'
            ? {
                ...node,
                size: {
                  width: initialSize.width + 10,
                  height: initialSize.height,
                },
              }
            : node
        ),
      }

      await page.evaluate((nextDocument) => {
        window.__flowVueTest?.updateDocument(nextDocument)
      }, acceptedDocument)
    }

    expect(await adapter.readState({ nodeId: 'near' })).toMatchObject({
      node: {
        size: { width: initialSize.width + 10, height: initialSize.height },
      },
    })
  }
  /* eslint-enable no-await-in-loop */

  await adapter.destroy()
})

test('Vue pointer resize supports eight directions, acceptance, and cancellation', async ({
  page,
}) => {
  const adapter = createVueConformanceAdapter(page)

  const resizeDocument = interactionLifecycleFixture.document

  await adapter.mount({
    ...lifecycleFixture('uncontrolled'),
    document: resizeDocument,
  })

  /* eslint-disable no-await-in-loop */
  for (const resizeCase of interactionLifecycleFixture.resizeCases) {
    const { direction } = resizeCase

    await page.evaluate((document) => {
      window.__flowVueTest?.updateDocument(document)
    }, resizeDocument)

    const handle = page.locator(
      `[data-node-id="near"] [data-direction="${direction}"]`
    )

    await expect(handle).toBeVisible()

    const box = await handle.boundingBox()

    if (box === null) {
      throw new Error(`Missing ${direction} resize handle`)
    }

    let dx = 0

    if (direction.includes('left') || direction.includes('right')) {
      dx = resizeCase.delta.x
    }

    let dy = 0

    if (direction.includes('top') || direction.includes('bottom')) {
      dy = resizeCase.delta.y
    }

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

    await page.mouse.down()

    await page.mouse.move(
      box.x + box.width / 2 + dx,
      box.y + box.height / 2 + dy,
      { steps: 3 }
    )

    await page.mouse.up()
  }
  /* eslint-enable no-await-in-loop */

  const resizedNode = await adapter.readState({ nodeId: 'near' })
  expect(resizedNode.node?.size).not.toEqual(
    interactionLifecycleFixture.resizeStart.size
  )
  expect(await adapter.changeKinds()).toContain('node-bounds')

  const stateBeforeCancel = await adapter.readState({ nodeId: 'near' })
  const widthBeforeCancel = stateBeforeCancel.node?.size?.width

  const rightHandle = page.locator(
    '[data-node-id="near"] [data-direction="right"]'
  )

  const rightBox = await rightHandle.boundingBox()

  if (rightBox === null) {
    throw new Error('Missing right resize handle for cancellation')
  }

  await page.mouse.move(rightBox.x + 4, rightBox.y + 4)
  await page.mouse.down()
  await page.mouse.move(rightBox.x + 30, rightBox.y + 4, { steps: 3 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  const afterCancel = await adapter.readState({ nodeId: 'near' })
  expect(afterCancel.node?.size?.width).toBe(widthBeforeCancel)
  await adapter.destroy()

  await adapter.mount(lifecycleFixture('controlled'))

  const controlledHandle = page.locator(
    '[data-node-id="first"] [data-direction="right"]'
  )

  const controlledBox = await controlledHandle.boundingBox()

  if (controlledBox === null) {
    throw new Error('Missing controlled resize handle')
  }

  await page.mouse.move(controlledBox.x + 4, controlledBox.y + 4)
  await page.mouse.down()
  await page.mouse.move(controlledBox.x + 22, controlledBox.y + 4, { steps: 3 })
  await page.mouse.up()
  expect(await adapter.changeKinds()).toContain('node-bounds')
  const controlledNode = await adapter.readState({ nodeId: 'first' })
  expect(controlledNode.node?.size).toEqual({
    width: 150,
    height: 80,
  })
  await adapter.destroy()
})

test('Vue keyboard selection and all resize directions preserve the fixture contract', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (fixture === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)
  const resizeDocument = interactionLifecycleFixture.document

  const hostFixture = {
    ...fixture,
    documentMode: 'uncontrolled' as const,
    document: resizeDocument,
  }

  await adapter.mount(hostFixture)
  await page.locator('[data-node-id="near"] [data-direction="right"]').focus()
  await page.keyboard.down('ArrowRight')
  const beforeCancel = await adapter.readState({ nodeId: 'near' })
  expect(beforeCancel.node?.size).toEqual(
    interactionLifecycleFixture.resizeStart.size
  )
  await page.keyboard.press('Escape')
  await page.keyboard.up('ArrowRight')
  const afterCancel = await adapter.readState({ nodeId: 'near' })
  expect(afterCancel.node?.size).toEqual(
    interactionLifecycleFixture.resizeStart.size
  )
  expect(await adapter.changeKinds()).not.toContain('node-bounds')

  /* eslint-disable no-await-in-loop */
  for (const resizeCase of interactionLifecycleFixture.resizeCases) {
    await page.evaluate((document) => {
      window.__flowVueTest?.updateDocument(document)
    }, resizeDocument)

    const handle = page.locator(
      `[data-node-id="near"] [data-direction="${resizeCase.direction}"]`
    )

    await handle.focus()

    await page.evaluate(() => {
      // SAFETY: This test owns the namespaced instrumentation fields on its window.
      const target = window as Window & {
        __vueResizeKeyEvents?: {
          readonly key: string
          readonly direction: string | undefined
        }[]
        __vueResizeKeyListenerInstalled?: boolean
      }

      target.__vueResizeKeyEvents = []

      if (target.__vueResizeKeyListenerInstalled !== true) {
        target.__vueResizeKeyListenerInstalled = true
        window.addEventListener(
          'keydown',
          (event) => {
            const eventTarget = event.target

            target.__vueResizeKeyEvents?.push({
              key: event.key,
              direction: (() => {
                const directionTarget =
                  eventTarget instanceof Element
                    ? eventTarget.closest('[data-direction]')
                    : null

                return directionTarget instanceof HTMLElement
                  ? directionTarget.dataset.direction
                  : undefined
              })(),
            })
          },
          { capture: true }
        )
      }
    })

    const startNode = resizeDocument.nodes.find(({ id }) => id === 'near')

    if (startNode === undefined || startNode.size === undefined) {
      throw new Error('Missing keyboard resize start geometry')
    }

    const startSize = startNode.size
    const startChild = resizeDocument.nodes.find(({ id }) => id === 'child')

    if (startChild === undefined) {
      throw new Error('Missing keyboard resize child geometry')
    }

    const completedAxes = new Set<'x' | 'y'>()

    const pressResizeKey = async (
      key: string,
      axis: 'x' | 'y'
    ): Promise<void> => {
      completedAxes.add(axis)
      await handle.focus()
      await page.keyboard.press(key)

      const diagnostic = await page.evaluate(() => {
        // SAFETY: This test owns the namespaced instrumentation fields on its window.
        const target = window as Window & {
          __vueResizeKeyEvents?: {
            readonly key: string
            readonly direction: string | undefined
          }[]
        }

        const active = document.activeElement?.closest('[data-direction]')

        return {
          event: target.__vueResizeKeyEvents?.at(-1),
          activeDirection:
            active instanceof HTMLElement
              ? active.dataset.direction
              : undefined,
        }
      })

      expect(
        diagnostic.event,
        `keydown delivery ${resizeCase.direction} ${axis}`
      ).toMatchObject({ key, direction: resizeCase.direction })
      expect(
        diagnostic.activeDirection,
        `focus after ${resizeCase.direction} ${axis}`
      ).toBe(resizeCase.direction)

      const state = await adapter.readState({ nodeId: 'near' })

      const movesX =
        completedAxes.has('x') &&
        (resizeCase.direction.includes('left') ||
          resizeCase.direction.includes('right'))

      const movesY =
        completedAxes.has('y') &&
        (resizeCase.direction.includes('top') ||
          resizeCase.direction.includes('bottom'))

      const expectedPosition = {
        x:
          startNode.position.x +
          (resizeCase.direction.includes('left') ? 5 : 0) * Number(movesX),
        y:
          startNode.position.y +
          (resizeCase.direction.includes('top') ? 5 : 0) * Number(movesY),
      }

      const expectedSize = {
        width:
          startSize.width +
          (resizeCase.direction.includes('right') ? 5 : 0) * Number(movesX) -
          (resizeCase.direction.includes('left') ? 5 : 0) * Number(movesX),
        height:
          startSize.height +
          (resizeCase.direction.includes('bottom') ? 5 : 0) * Number(movesY) -
          (resizeCase.direction.includes('top') ? 5 : 0) * Number(movesY),
      }

      const expectedChildPosition = {
        x:
          startChild.position.x -
          (movesX && resizeCase.direction.includes('left') ? 5 : 0),
        y:
          startChild.position.y -
          (movesY && resizeCase.direction.includes('top') ? 5 : 0),
      }

      expect(
        state.node?.position,
        `position after ${resizeCase.direction} ${axis}`
      ).toEqual(expectedPosition)
      expect(
        state.node?.size,
        `size after ${resizeCase.direction} ${axis}`
      ).toEqual(expectedSize)
      const childState = await adapter.readState({ nodeId: 'child' })
      expect(
        childState.node?.position,
        `child position after ${resizeCase.direction} ${axis}`
      ).toEqual(expectedChildPosition)
    }

    if (
      resizeCase.direction.includes('left') ||
      resizeCase.direction.includes('right')
    ) {
      await pressResizeKey('ArrowRight', 'x')
    }

    if (
      resizeCase.direction.includes('top') ||
      resizeCase.direction.includes('bottom')
    ) {
      await pressResizeKey('ArrowDown', 'y')
    }
  }
  /* eslint-enable no-await-in-loop */

  await adapter.mount({ ...hostFixture, documentMode: 'controlled' })
  const controlledNear = page.locator('[data-node-id="near"]')
  await controlledNear.focus()
  await page.keyboard.press('Space')
  const controlledSelection = await adapter.readState({ nodeId: 'near' })
  expect(controlledSelection.node?.selected).toBe(true)
  expect(await adapter.changeKinds()).toContain('selection-set')

  const controlledResize = page.locator(
    '[data-node-id="near"] [data-direction="right"]'
  )

  await controlledResize.focus()
  await page.keyboard.press('ArrowRight')
  const controlledResult = await adapter.readState({ nodeId: 'near' })
  expect(controlledResult.node?.size).toEqual(
    interactionLifecycleFixture.resizeStart.size
  )
  expect(await adapter.changeKinds()).toContain('node-bounds')
  expect(await adapter.acceptedStates()).toHaveLength(0)
  await adapter.destroy()
})

test('Vue grouped keyboard resize commits once and preserves controlled ownership', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (fixture === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)
  const { document, resizeStart } = interactionLifecycleFixture
  const initialSize = resizeStart.size

  await adapter.mount({ ...fixture, documentMode: 'uncontrolled', document })

  const uncontrolledHandle = page.locator(
    '[data-node-id="near"] [data-direction="right"]'
  )

  await uncontrolledHandle.focus()
  await page.keyboard.down('ArrowRight')
  await dispatchRepeatedKey(uncontrolledHandle, 'ArrowRight')

  const previewWidth = await page
    .locator('[data-node-id="near"]')
    .evaluate((element) => element.getBoundingClientRect().width)

  expect(previewWidth).toBe(initialSize.width + 10)

  const previewAcceptedState = await adapter.readState({ nodeId: 'near' })

  expect(previewAcceptedState.node?.size).toEqual(initialSize)
  await page.keyboard.press('Escape')
  await page.keyboard.up('ArrowRight')
  const afterEscape = await adapter.readState({ nodeId: 'near' })
  expect(afterEscape.node?.size).toEqual(initialSize)
  expect(await adapter.changeKinds()).toEqual([])

  await uncontrolledHandle.focus()
  await page.keyboard.down('ArrowRight')
  await dispatchRepeatedKey(uncontrolledHandle, 'ArrowRight')
  const uncontrolledBeforeRelease = await adapter.readState({ nodeId: 'near' })
  expect(uncontrolledBeforeRelease.node?.size).toEqual(initialSize)

  await page.keyboard.up('ArrowRight')
  const uncontrolledAfterRelease = await adapter.readState({ nodeId: 'near' })
  expect(uncontrolledAfterRelease.node?.size).toEqual({
    width: initialSize.width + 10,
    height: initialSize.height,
  })
  expect(await adapter.changeKinds()).toEqual(['node-bounds'])

  await adapter.mount({ ...fixture, documentMode: 'controlled', document })

  const controlledHandle = page.locator(
    '[data-node-id="near"] [data-direction="right"]'
  )

  await controlledHandle.focus()
  await page.keyboard.down('ArrowRight')
  await dispatchRepeatedKey(controlledHandle, 'ArrowRight')
  await page.keyboard.up('ArrowRight')
  const controlledBeforeAcceptance = await adapter.readState({ nodeId: 'near' })
  expect(controlledBeforeAcceptance.node?.size).toEqual(initialSize)
  expect(await adapter.changeKinds()).toContain('node-bounds')

  const acceptedDocument = {
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === 'near'
        ? {
            ...node,
            size: { width: initialSize.width + 10, height: initialSize.height },
          }
        : node
    ),
  }

  await page.evaluate((nextDocument) => {
    window.__flowVueTest?.acceptDocument(nextDocument)
  }, acceptedDocument)
  const controlledAfterAcceptance = await adapter.readState({ nodeId: 'near' })
  expect(controlledAfterAcceptance.node?.size).toEqual({
    width: initialSize.width + 10,
    height: initialSize.height,
  })
  await adapter.destroy()
})

test('Vue keyboard resize cancels on blur and node removal, then accepts a fresh retry', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (fixture === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)
  const { document, resizeStart } = interactionLifecycleFixture
  const initialWidth = resizeStart.size.width

  await adapter.mount({ ...fixture, documentMode: 'uncontrolled', document })

  const nearHandle = page.locator(
    '[data-node-id="near"] [data-direction="right"]'
  )

  await nearHandle.focus()
  await page.keyboard.down('ArrowRight')
  await dispatchRepeatedKey(nearHandle, 'ArrowRight')
  await expect(page.locator('[data-node-id="near"]')).toHaveCSS(
    'width',
    `${initialWidth + 10}px`
  )

  await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
  await expect(page.locator('[data-node-id="near"]')).toHaveCSS(
    'width',
    `${initialWidth}px`
  )
  await page.keyboard.up('ArrowRight')
  expect(await adapter.changeKinds()).toEqual([])
  expect(await adapter.acceptedStates()).toHaveLength(0)

  await nearHandle.focus()
  await page.keyboard.down('ArrowRight')
  await dispatchRepeatedKey(nearHandle, 'ArrowRight')
  await page.keyboard.up('ArrowRight')
  await expect.poll(() => adapter.changeKinds()).toEqual(['node-bounds'])
  const blurRetryState = await adapter.readState({ nodeId: 'near' })
  expect(blurRetryState.node?.size).toEqual({
    width: initialWidth + 10,
    height: resizeStart.size.height,
  })

  await adapter.mount({ ...fixture, documentMode: 'uncontrolled', document })

  const activeHandle = page.locator(
    '[data-node-id="near"] [data-direction="right"]'
  )

  await activeHandle.focus()
  await page.keyboard.down('ArrowRight')
  await dispatchRepeatedKey(activeHandle, 'ArrowRight')

  const retryDocument = {
    nodes: [
      {
        id: 'far',
        label: 'Far',
        position: { x: 500, y: 20 },
        size: { width: initialWidth, height: resizeStart.size.height },
        selected: true,
      },
    ],
    edges: [],
  }

  await adapter.perform({ kind: 'update-document', document: retryDocument })
  await expect(page.locator('[data-node-id="near"]')).toHaveCount(0)
  const acceptedAfterRemoval = await adapter.acceptedStates()
  await page.keyboard.up('ArrowRight')
  expect(await adapter.changeKinds()).toEqual([])
  expect(await adapter.acceptedStates()).toEqual(acceptedAfterRemoval)

  const farHandle = page.locator(
    '[data-node-id="far"] [data-direction="right"]'
  )

  await farHandle.focus()
  await page.keyboard.down('ArrowRight')
  await page.keyboard.up('ArrowRight')
  await expect.poll(() => adapter.changeKinds()).toEqual(['node-bounds'])
  const removalRetryState = await adapter.readState({ nodeId: 'far' })
  expect(removalRetryState.node?.size).toEqual({
    width: initialWidth + 5,
    height: resizeStart.size.height,
  })
  await adapter.destroy()
})

test('Vue top-left resize preserves nested child graph position and blur cancels resize', async ({
  page,
}) => {
  const adapter = createVueConformanceAdapter(page)
  const fixture = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (fixture === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  await adapter.mount({
    ...fixture,
    documentMode: 'uncontrolled',
    document: {
      edges: [],
      nodes: [
        {
          id: 'parent',
          label: 'Parent',
          position: { x: 100, y: 100 },
          selected: true,
          size: { width: 160, height: 100 },
        },
        {
          id: 'child',
          label: 'Child',
          parentId: 'parent',
          position: { x: 20, y: 20 },
          size: { width: 50, height: 30 },
        },
      ],
    },
  })

  const topLeft = page.locator(
    '[data-node-id="parent"] [data-direction="top-left"]'
  )

  const bounds = await topLeft.boundingBox()

  if (bounds === null) {
    throw new Error('Missing nested-parent resize handle')
  }

  await page.mouse.move(bounds.x + 4, bounds.y + 4)
  await page.mouse.down()
  await page.mouse.move(bounds.x - 6, bounds.y - 6, { steps: 3 })
  await page.mouse.up()

  const parent = await adapter.readState({ nodeId: 'parent' })
  const child = await adapter.readState({ nodeId: 'child' })
  expect(parent.node?.position).toEqual({ x: 90, y: 90 })
  expect(child.node?.position).toEqual({ x: 30, y: 30 })

  const right = page.locator('[data-node-id="parent"] [data-direction="right"]')
  const rightBounds = await right.boundingBox()

  if (rightBounds === null) {
    throw new Error('Missing resize handle for blur cancellation')
  }

  const widthBeforeBlur = parent.node?.size?.width
  await page.mouse.move(rightBounds.x + 4, rightBounds.y + 4)
  await page.mouse.down()
  await page.mouse.move(rightBounds.x + 24, rightBounds.y + 4, { steps: 2 })
  await page.evaluate(() => globalThis.dispatchEvent(new Event('blur')))
  await page.mouse.up()

  const afterBlur = await adapter.readState({ nodeId: 'parent' })
  expect(afterBlur.node?.size?.width).toBe(widthBeforeBlur)

  const parentNode = page.locator('[data-node-id="parent"]')
  await parentNode.focus()
  await page.keyboard.press('Space')

  const deselectedParent = await adapter.readState({ nodeId: 'parent' })
  expect(deselectedParent.node?.selected).toBe(false)

  await page.keyboard.press('Space')
  const selectedParent = await adapter.readState({ nodeId: 'parent' })
  expect(selectedParent.node?.selected).toBe(true)

  const keyboardResizeHandle = page.locator(
    '[data-node-id="parent"] [data-direction="right"]'
  )

  await keyboardResizeHandle.focus()
  await page.keyboard.press('ArrowRight')
  const afterKeyboardResize = await adapter.readState({ nodeId: 'parent' })
  expect(afterKeyboardResize.node?.size?.width).toBe((widthBeforeBlur ?? 0) + 5)
  await adapter.destroy()
})

test('Vue honors node drag/focus and edge select/focus flags', async ({
  page,
}) => {
  const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (base === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  const adapter = createVueConformanceAdapter(page)

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

  await adapter.mount({ ...base, documentMode: 'uncontrolled', document })

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
  const stateAfterDrag = await adapter.readState({ nodeId: 'source' })

  expect(stateAfterDrag.node?.position).toEqual({
    x: 20,
    y: 20,
  })

  const edgeTarget = page.getByTestId('flow-edge-hit-target')
  await expect(edgeTarget).toHaveAttribute('tabindex', '-1')
  await expect(edgeTarget).toHaveAttribute('role', 'img')
  await edgeTarget.click({ force: true })
  expect(await adapter.changeKinds()).not.toContain('edge-selection')
  await adapter.destroy()
})
