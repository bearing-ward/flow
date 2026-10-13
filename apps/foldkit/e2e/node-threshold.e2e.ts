import { test, expect } from '@playwright/test'
import { Match } from 'effect'

import { nodeThresholdContract } from '../../shared-e2e/node-threshold-contract.ts'

nodeThresholdContract('foldkit')

for (const mode of [
  'proposal-replace',
  'acceptance-replace',
  'throw-listener',
  'dispose-listener',
  'protected-error',
  'duplicate-error',
] as const) {
  test(`public publication connector ${mode}`, async ({ page }) => {
    await page.goto('/connection-threshold.html')

    const observed = await page.evaluate(
      async ({ path, probe }) => {
        const harness = await import(path)

        return harness.publicationProbe(probe)
      },
      { path: '/e2e/node-publication-harness.ts', probe: mode }
    )

    const expected = {
      'dispose-listener': ['proposal'],
      'throw-listener': ['proposal', 'accepted:10'],
      'protected-error': ['response:ProtectedDeletionConflict', 'onError'],
      'duplicate-error': ['response:DuplicateNodeId', 'onError'],
      'proposal-replace': ['proposal', 'accepted:10', 'accepted:20'],
      'acceptance-replace': ['proposal', 'accepted:10', 'accepted:20'],
    }[mode]

    expect(observed).toEqual(expected)
  })
}

test('two native canvases isolate capture, coordinates, disposal and fresh remount', async ({
  page,
}) => {
  const path = '/e2e/node-multi-canvas-harness.ts'
  await page.goto('/connection-threshold.html')
  await page.evaluate(async (entry) => {
    const harness = await import(entry)
    await harness.mount()
  }, path)

  const left = await page
    .locator('[data-side="left"] [data-node-id="source"]')
    .boundingBox()

  const right = await page
    .locator('[data-side="right"] [data-node-id="source"]')
    .boundingBox()

  if (left === null || right === null) {
    throw new Error('Missing canvases')
  }

  await page.mouse.move(left.x + 40, left.y + 20)
  await page.mouse.down()
  await page.mouse.move(left.x + 46, left.y + 20)
  await page.mouse.up()

  const readBoth = () =>
    page.evaluate(async (entry) => {
      const harness = await import(entry)

      return harness.read()
    }, path)

  await expect.poll(readBoth).toEqual([
    { position: { x: 66, y: 70 }, changes: ['node-position'] },
    { position: { x: 60, y: 70 }, changes: [] },
  ])
  await page.mouse.move(right.x + 40, right.y + 20)
  await page.mouse.down()
  await page.mouse.move(right.x + 46, right.y + 20)
  await page.evaluate(async (entry) => {
    const harness = await import(entry)
    await harness.replaceLeft()
  }, path)
  await page.mouse.up()
  await expect.poll(readBoth).toEqual([
    { position: { x: 60, y: 70 }, changes: [] },
    { position: { x: 66, y: 70 }, changes: ['node-position'] },
  ])
})

test('injected emitter defect reaches installed Runtime crash reporting with the original error', async ({
  page,
}) => {
  await page.goto('/connection-threshold.html')

  const result = await page.evaluate(async (path) => {
    const harness = await import(path)

    return harness.fatalPublication()
  }, '/e2e/node-failure-harness.ts')

  expect(result).toEqual({
    originalCause: true,
    emitted: ['interaction'],
    count: 2,
    rejected: true,
  })
})

const releaseSnapshot = (x: number) => ({
  document: {
    nodes: [{ id: 'source', label: 'Release', position: { x, y: 70 } }],
    edges: [],
  },
  viewport: { x: 0, y: 0, zoom: 1 },
})

for (const mode of [
  'proposal-replace',
  'acceptance-replace',
  'proposal-dispose',
  'queued-deliver',
  'queued-dispose',
] as const) {
  test(`native node release selected-port history ${mode}`, async ({
    page,
  }) => {
    const path = '/e2e/node-publication-harness.ts'
    await page.goto('/connection-threshold.html')
    await page.evaluate(
      async ({ path: entry, mode: probeMode }) => {
        const harness = await import(entry)

        return harness.mountNodeRelease(probeMode)
      },
      { path, mode }
    )
    const node = page.locator('[data-release-probe] [data-node-id="source"]')
    const box = await node.boundingBox()

    if (box === null) {
      throw new Error('Missing release node')
    }

    await page.mouse.move(box.x + 30, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 42, box.y + 20)
    await page.mouse.up()

    const result = await page.evaluate(async (entry) => {
      const harness = await import(entry)

      return harness.readNodeRelease()
    }, path)

    const start = {
      port: 'interactionEvents',
      event: {
        name: 'onNodeDragStart',
        phase: 'start',
        inputKind: 'pointer',
        nodeId: 'source',
        nodeIds: ['source'],
      },
    }

    const progress = {
      port: 'interactionEvents',
      event: {
        name: 'onNodeDrag',
        phase: 'progress',
        inputKind: 'pointer',
        nodeId: 'source',
        nodeIds: ['source'],
        x: 102,
        y: 90,
      },
    }

    const proposal = {
      port: 'changes',
      change: {
        kind: 'node-position',
        nodeId: 'source',
        position: { x: 72, y: 70 },
      },
    }

    const accepted = {
      port: 'acceptedStates',
      change: {
        previous: releaseSnapshot(60),
        current: releaseSnapshot(72),
        cause: 'semantic-change',
      },
    }

    const terminal = {
      port: 'interactionEvents',
      event: {
        name: 'onNodeDragStop',
        phase: 'end',
        inputKind: 'pointer',
        outcome: 'accepted',
        nodeId: 'source',
        nodeIds: ['source'],
      },
    }

    const request = { port: 'request', kind: 'ReplaceDocument' }

    const replaced = {
      port: 'acceptedStates',
      change: {
        previous: releaseSnapshot(72),
        current: releaseSnapshot(90),
        cause: 'document-update',
      },
    }

    const expected = Match.value(mode).pipe(
      Match.when('proposal-replace', () => [
        start,
        progress,
        proposal,
        request,
        accepted,
        terminal,
        replaced,
      ]),
      Match.when('acceptance-replace', () => [
        start,
        progress,
        proposal,
        accepted,
        request,
        terminal,
        replaced,
      ]),
      Match.when('queued-deliver', () => [
        start,
        progress,
        proposal,
        accepted,
        terminal,
      ]),
      Match.orElse(() => [start, progress, proposal])
    )

    expect(result).toEqual({
      observations: expected,
      capturedAtStart: true,
      disposed: mode === 'proposal-dispose' || mode === 'queued-dispose',
      // The elementChanges port adds one publication to the held window.
      queuedCallbacks: mode.startsWith('queued-') ? 3 : 0,
    })
  })
}

const nodeProgress = (x: number) => ({
  name: 'onNodeDrag',
  phase: 'progress',
  inputKind: 'pointer',
  nodeId: 'source',
  nodeIds: ['source'],
  x,
  y: 90,
})

for (const sourceKind of ['click', 'keyboard'] as const) {
  test(`native node lifecycle and synthetic cancel preserve retained ${sourceKind} connection`, async ({
    page,
  }) => {
    const path = '/e2e/connection-threshold-harness.ts'
    await page.goto('/connection-threshold.html')
    await page.evaluate(async (entry) => {
      const harness = await import(entry)

      return harness.mount('foldkit', {
        nodeThreshold: 5,
        threshold: 5,
        click: true,
      })
    }, path)

    const read = () =>
      page.evaluate(async (entry) => {
        const harness = await import(entry)

        return harness.read()
      }, path)

    const lifecycle = async () => {
      const receipt = await read()

      return receipt.rawEvents.filter(
        (event: { phase: string }) => event.phase !== 'event'
      )
    }

    const source = page.locator(
      '[data-node-id="source"] [data-handle-id="out"]'
    )

    if (sourceKind === 'click') {
      await source.click()
    } else {
      await source.focus()
      await page.keyboard.press('Enter')
    }

    const connectionStart = {
      name: 'onConnectStart',
      phase: 'start',
      inputKind: sourceKind,
      nodeId: 'source',
    }

    await expect.poll(lifecycle).toEqual([connectionStart])
    const node = page.locator('[data-node-id="source"]')
    const box = await node.boundingBox()

    if (box === null) {
      throw new Error('Missing retained-source node')
    }

    await page.mouse.move(box.x + 30, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 32, box.y + 20)
    await page.mouse.move(box.x + 33, box.y + 24)
    await page.mouse.up()
    await expect
      .poll(async () => {
        const receipt = await read()

        return receipt.rawEvents.filter(
          (event: { name: string }) => event.name === 'onNodeClick'
        ).length
      })
      .toBe(1)
    expect(await lifecycle()).toEqual([connectionStart])
    const pendingReceipt = await read()
    expect(pendingReceipt.changes).toEqual([])
    await page.mouse.move(box.x + 30, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 36, box.y + 20)
    await page.mouse.move(box.x + 31, box.y + 20)
    await page.mouse.up()

    const start = {
      name: 'onNodeDragStart',
      phase: 'start',
      inputKind: 'pointer',
      nodeId: 'source',
      nodeIds: ['source'],
    }

    const stop = {
      name: 'onNodeDragStop',
      phase: 'end',
      inputKind: 'pointer',
      nodeId: 'source',
      nodeIds: ['source'],
      outcome: 'accepted',
    }

    const released = [
      connectionStart,
      start,
      nodeProgress(96),
      nodeProgress(91),
      stop,
    ]

    await expect.poll(lifecycle).toEqual(released)
    const releaseReceipt = await read()
    expect(releaseReceipt.changes).toEqual([
      { kind: 'node-position', nodeId: 'source', position: { x: 61, y: 70 } },
    ])
    await page.mouse.move(box.x + 31, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 37, box.y + 20)
    await node.dispatchEvent('pointercancel', { pointerId: 1, bubbles: true })
    await page.mouse.up()

    const cancelled = [
      ...released,
      start,
      nodeProgress(97),
      { ...stop, outcome: 'cancelled', reason: 'cancelled' },
    ]

    await expect.poll(lifecycle).toEqual(cancelled)
    const target = page.locator('[data-node-id="target"] [data-handle-id="in"]')

    if (sourceKind === 'click') {
      await target.click()
    } else {
      await target.focus()
      await page.keyboard.press('Enter')
    }

    await expect
      .poll(async () => {
        const receipt = await read()

        return receipt.state.document.edges.map(
          (edge: { source: string; target: string }) => [
            edge.source,
            edge.target,
          ]
        )
      })
      .toEqual([['source', 'target']])
    const completed = await lifecycle()
    expect(completed.slice(0, cancelled.length)).toEqual(cancelled)
    expect(
      completed
        .slice(cancelled.length)
        .map(
          (event: {
            name: string
            phase: string
            inputKind: string
            outcome: string
          }) => [event.name, event.phase, event.inputKind, event.outcome]
        )
    ).toEqual(
      sourceKind === 'click'
        ? [
            ['onConnect', 'proposal', 'click', 'accepted'],
            ['onConnectEnd', 'end', 'click', 'accepted'],
          ]
        : [['onConnectEnd', 'end', 'keyboard', 'cancelled']]
    )
  })
}
