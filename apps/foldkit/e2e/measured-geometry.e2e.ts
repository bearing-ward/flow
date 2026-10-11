import { expect, test } from '@playwright/test'

import {
  assertDynamicHandleRefresh,
  assertHandleMemberAcceptance,
} from '../../shared-e2e/handle-refresh-contract.ts'
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

test('Foldkit refreshes measured node bounds by ID through its production Runtime', async ({
  page,
}) => {
  await page.goto('/')
  const node = page.locator('[data-node-id="validate"]')
  const handle = node.locator('[data-handle-id="out"]')

  const edgePath = page.locator(
    '[data-edge-id="validate-target"] .flow-foldkit-edge-path'
  )

  await expect(node).toBeVisible()
  await expect(edgePath).toBeVisible()
  const beforeHandle = await handle.boundingBox()

  const inspection = page.locator(
    '.flow-state-tools output:not([data-measurement])'
  )

  await page.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(inspection).toContainText('"nodes":3')
  const beforeGraphSnapshot = await inspection.textContent()

  const beforePath = await edgePath.getAttribute('d')
  await page.evaluate(() => {
    const nodeElement = document.querySelector<HTMLElement>(
      '[data-node-id="validate"]'
    )

    const handleElement = nodeElement?.querySelector<HTMLElement>(
      '[data-handle-id="out"]'
    )

    if (
      nodeElement === null ||
      handleElement === null ||
      handleElement === undefined
    ) {
      throw new Error('Missing node or handle to mutate')
    }

    nodeElement.style.width = '220px'
    nodeElement.style.height = '96px'
    handleElement.style.top = '30%'
  })

  await page.getByLabel('Refresh node geometry').fill('validate')
  await page.getByRole('button', { name: 'Refresh node internals' }).click()

  const status = page.locator(
    '.flow-state-tools output:not([data-measurement])'
  )

  await expect(status).toContainText('Measurement measured 220x96')
  await expect.poll(() => edgePath.getAttribute('d')).not.toBe(beforePath)

  const measuredHandle = await handle.boundingBox()
  expect(measuredHandle?.y).not.toBe(beforeHandle?.y)

  await page.getByRole('button', { name: 'Inspect graph' }).click()
  await expect(inspection).toContainText('"nodes":3')
  expect(await inspection.textContent()).toBe(beforeGraphSnapshot)
})

test('Foldkit node internals refresh reports missing IDs and disposal', async ({
  page,
}) => {
  await page.goto('/')

  const status = page.locator(
    '.flow-state-tools output:not([data-measurement])'
  )

  await page.getByLabel('Refresh node geometry').fill('not-mounted')
  await page.getByRole('button', { name: 'Refresh node internals' }).click()
  await expect(status).toHaveText('Measurement missing')

  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
  })
  await page.getByLabel('Refresh node geometry').fill('validate')
  await page.getByRole('button', { name: 'Refresh node internals' }).click()
  await expect(status).toHaveText('Measurement disposed')
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

for (const zoom of [0.5, 2]) {
  for (const controlled of [false, true]) {
    test(`foldkit dynamic handle refresh at zoom ${zoom}, controlled ${
      controlled
    }`, async ({ page }) => {
      await assertDynamicHandleRefresh(page, 'foldkit', zoom, controlled, false)
    })
  }
}

test('Foldkit main wrapper settles both overlapping same-node refresh callers', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.locator('[data-testid="flow-node"][data-node-id="validate"]')
  ).toBeVisible()
  await page.evaluate(() => {
    const output = document.querySelector<HTMLOutputElement>(
      '.flow-state-tools output:not([data-measurement])'
    )

    const button = document.querySelector<HTMLButtonElement>(
      '[data-state="refresh-node"]'
    )

    if (output === null || button === null) {
      throw new Error('Missing main wrapper refresh controls')
    }

    const observer = new MutationObserver((records) => {
      const count = Number(output.dataset.settled ?? '0')
      output.dataset.settled = String(
        count + records.filter(({ type }) => type === 'childList').length
      )
    })

    observer.observe(output, { childList: true })
    button.click()
    button.click()
  })
  await expect(
    page.locator('.flow-state-tools output:not([data-measurement])')
  ).toHaveAttribute('data-settled', '2')
  await expect(
    page.locator('.flow-state-tools output:not([data-measurement])')
  ).toContainText('Measurement measured')
})

test('foldkit actual public geometry and SVG endpoints match pinned equivalent handle layout', async ({
  page,
}) => {
  await assertDynamicHandleRefresh(page, 'foldkit', 1, false, true)
})

for (const zoom of [0.5, 2]) {
  test(`foldkit original 065 member mappings at zoom ${zoom}`, async ({
    page,
  }) => {
    await assertHandleMemberAcceptance(page, 'foldkit', zoom)
  })
}
