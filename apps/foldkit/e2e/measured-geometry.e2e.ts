import { expect, test } from '@playwright/test'

import { assertSharedMeasurementContract } from '../../shared-e2e/measured-geometry-contract.ts'
import { createFoldkitConformanceAdapter } from './conformance.ts'

declare global {
  interface Window {
    __foldkitObserverCounts: {
      mutationCallbacks: number
      mutationDisconnects: number
      resizeCallbacks: number
      resizeDisconnects: number
    }
  }
}

test('Foldkit production APIs satisfy the shared measured-geometry cases', async ({
  page,
}) => {
  await assertSharedMeasurementContract(createFoldkitConformanceAdapter(page))
})

test('Foldkit observes measured node bounds and explicit handle relocation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const node = page.locator('[data-node-id="validate"]')
  const handle = node.locator('[data-handle-id="out"]')
  await expect(node).toBeVisible()
  const before = await node.boundingBox()
  const handleBefore = await handle.boundingBox()
  await page.screenshot({
    path: '/tmp/flow-foldkit-measured-desktop.png',
    fullPage: true,
  })
  await page
    .getByRole('button', { name: 'Toggle measured size and handle offset' })
    .click()
  await expect
    .poll(async () => {
      const bounds = await node.boundingBox()

      return bounds?.height
    })
    .not.toBe(before?.height)
  await expect
    .poll(async () => {
      const bounds = await handle.boundingBox()

      return bounds?.y
    })
    .not.toBe(handleBefore?.y)
  await expect(
    page.locator('.flow-state-tools output:not([data-measurement])')
  ).toContainText('Measurement measured')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: '/tmp/flow-foldkit-measured-mobile.png',
    fullPage: true,
  })
})

test('Foldkit app disconnects geometry observers when its Runtime unmounts', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const counts = {
      mutationCallbacks: 0,
      mutationDisconnects: 0,
      resizeCallbacks: 0,
      resizeDisconnects: 0,
    }

    Object.assign(window, { __foldkitObserverCounts: counts })

    const NativeMutationObserver = window.MutationObserver
    window.MutationObserver = new Proxy(NativeMutationObserver, {
      construct(target, [callback]) {
        const observer = Reflect.construct(target, [
          (records: MutationRecord[], instance: MutationObserver) => {
            counts.mutationCallbacks += 1
            // oxlint-disable-next-line promise/prefer-await-to-callbacks
            callback(records, instance)
          },
        ])

        const disconnect = observer.disconnect.bind(observer)
        observer.disconnect = () => {
          counts.mutationDisconnects += 1
          disconnect()
        }

        return observer
      },
    })

    const NativeResizeObserver = window.ResizeObserver
    window.ResizeObserver = new Proxy(NativeResizeObserver, {
      construct(target, [callback]) {
        const observer = Reflect.construct(target, [
          (entries: ResizeObserverEntry[], instance: ResizeObserver) => {
            counts.resizeCallbacks += 1
            // oxlint-disable-next-line promise/prefer-await-to-callbacks
            callback(entries, instance)
          },
        ])

        const disconnect = observer.disconnect.bind(observer)
        observer.disconnect = () => {
          counts.resizeDisconnects += 1
          disconnect()
        }

        return observer
      },
    })
  })
  await page.goto('/')
  const node = page.locator('[data-node-id="validate"]')
  await expect(node).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => window.__foldkitObserverCounts.resizeCallbacks)
    )
    .toBeGreaterThan(0)

  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
  })

  const afterUnmount = await page.evaluate(() => {
    const counts = window.__foldkitObserverCounts

    const disconnected = {
      mutation: counts.mutationDisconnects,
      resize: counts.resizeDisconnects,
    }

    const callbacks = {
      mutation: counts.mutationCallbacks,
      resize: counts.resizeCallbacks,
    }

    document
      .querySelector('[data-node-id="validate"]')
      ?.setAttribute('style', 'height: 190px')
    document
      .querySelector('.flow-foldkit-host')
      ?.append(document.createElement('span'))

    return {
      disconnected,
      callbacks,
      after: {
        mutation: counts.mutationCallbacks,
        resize: counts.resizeCallbacks,
      },
    }
  })

  await page.waitForTimeout(100)

  const afterCallbacks = await page.evaluate(() => ({
    mutation: window.__foldkitObserverCounts.mutationCallbacks,
    resize: window.__foldkitObserverCounts.resizeCallbacks,
  }))

  expect(afterUnmount.disconnected.mutation).toBeGreaterThan(0)
  expect(afterUnmount.disconnected.resize).toBeGreaterThan(0)
  expect(afterCallbacks).toEqual(afterUnmount.callbacks)
})

test('Foldkit typed geometry query and refresh settle when its Runtime is disposed', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const measured = await page.evaluate(async () => {
    const harness = window.__flowFoldkitTest

    if (harness === undefined) {
      throw new Error('Missing Foldkit conformance harness')
    }

    const before = await harness.requestSnapshot('uncontrolled', {
      nodeId: 'visible',
    })

    const refreshed = await harness.refreshPublicNode(
      'uncontrolled',
      'visible',
      1
    )

    const stale = await harness.refreshPublicNode('uncontrolled', 'visible', 0)

    const after = await harness.requestSnapshot('uncontrolled', {
      nodeId: 'visible',
    })

    return {
      before,
      refreshed,
      stale,
      after,
      acceptedStates: harness.publicAcceptedStates('uncontrolled'),
    }
  })

  expect(measured.before.nodesInitialized).toBe(false)
  expect(measured.before.internalNode?.measurementStatus).toBe('unmeasured')
  expect(measured.refreshed.status).toBe('measured')
  expect(measured.refreshed.internalNode?.measurementStatus).toBe('measured')
  expect(measured.refreshed.internalNode?.width).toBeGreaterThan(0)
  expect(measured.stale.status).toBe('stale')
  expect(measured.stale.internalNode?.width).toBe(
    measured.refreshed.internalNode?.width
  )
  expect(measured.after.nodesInitialized).toBe(false)
  expect(measured.after.internalNode?.measurementStatus).toBe('measured')
  expect(measured.after.snapshot.document.nodes[0]?.id).toBe('visible')
  expect(measured.acceptedStates).toEqual([])

  const disposed = await page.evaluate(() => {
    const harness = window.__flowFoldkitTest

    if (harness === undefined) {
      throw new Error('Missing Foldkit conformance harness')
    }

    const beforeCount = harness.publicMeasurementResults('uncontrolled').length
    const pending = harness.refreshPublicNode('uncontrolled', 'child')
    harness.disposePublicState()

    return pending.then(async (result) => {
      await harness.settlePublicState()

      return {
        result,
        beforeCount,
        afterCount: harness.publicMeasurementResults('uncontrolled').length,
      }
    })
  })

  expect(disposed.result.status).toBe('disposed')
  expect(disposed.afterCount).toBe(disposed.beforeCount)
})
