import { test, expect } from '@playwright/test'

import type { PhysicalActor } from '../../shared-e2e/node-reentry-fixture.ts'
import { nodeThresholdContract } from '../../shared-e2e/node-threshold-contract.ts'
import { representativeCombination } from '../../shared-e2e/representative-cases.ts'
import type * as NodeReentryHarness from './node-reentry-harness.ts'

nodeThresholdContract('vanilla')

for (const [axis0, [actor, threshold]] of (
  [
    ['node', 0],
    ['connection', 5],
    ['connection', 0],
    ['reconnection', 5],
    ['reconnection', 0],
    ['resize', 0],
    ['selection', 0],
    ['pan', 0],
  ] satisfies readonly (readonly [PhysicalActor, number])[]
).entries()) {
  for (const [axis1, complete] of [false, true].entries()) {
    if (!representativeCombination([axis0, axis1])) {
      continue
    }

    test(`synthetic capture: Vanilla disposal ${actor} threshold ${threshold} complete ${complete}`, async ({
      page,
    }) => {
      await page.goto('/connection-threshold.html')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
          const harness = await import(path)

          return harness.physicalReentry(...args)
        },
        [actor, threshold, complete]
      )

      const expected = {
        events: ['start:a', 'stop:a:host-destroyed'],
        captures: ['a'],
        held: 0,
        changes: [],
      }

      expect(result).toEqual({
        afterTrigger: expected,
        ...expected,
        positions: [
          { id: 'a', position: { x: 20, y: 20 } },
          { id: 'b', position: { x: 220, y: 20 } },
          { id: 'c', position: { x: 420, y: 20 } },
        ],
      })

      const fresh = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
          const harness = await import(path)

          return harness.physicalReentry(...args, 'fresh')
        },
        [actor, threshold, false]
      )

      expect(fresh.afterTrigger.held).toBe(1)
      expect(fresh.held).toBe(0)
      expect(
        fresh.changes.map((change: { kind: string }) => change.kind)
      ).toEqual(
        {
          node: ['node-position'],
          connection: ['edge-add'],
          reconnection: ['edge-reconnect'],
          resize: ['node-bounds'],
          selection: ['selection-set'],
          pan: ['viewport'],
        }[actor]
      )
    })
  }
}

test('synthetic capture: Vanilla mounted Stop preserves node replacement', async ({
  page,
}) => {
  await page.goto('/connection-threshold.html')

  const result = await page.evaluate(async () => {
    const path = '/e2e/node-reentry-harness.ts'
    const harness = await import(path)

    return harness.physicalReentry('node', 0, false, 'mounted')
  })

  expect(result.events).toEqual([
    'start:a',
    'stop:a:undefined',
    'start:b',
    'stop:b:undefined',
  ])
  expect(result.changes).toEqual([
    { kind: 'node-position', nodeId: 'a', position: { x: 20, y: 20 } },
    { kind: 'node-position', nodeId: 'b', position: { x: 232, y: 20 } },
  ])
  expect(result.afterTrigger.held).toBe(1)
  expect(result.held).toBe(0)
})

test('native capture release ordering Vanilla', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const path = '/e2e/node-reentry-harness.ts'
    const fixture: typeof NodeReentryHarness = await import(path)
    await fixture.mountNativeCaptureProof()
  })

  const node = page.locator(
    '#vanilla-native-proof .flow-node[data-node-id="a"]'
  )

  const bounds = await node.boundingBox()

  if (bounds === null) {
    throw new Error('Missing node geometry')
  }

  await page.mouse.move(bounds.x + 30, bounds.y + 20)
  await page.mouse.down()
  await page.mouse.up()

  const receipt = await page
    .locator('#vanilla-native-proof')
    .getAttribute('data-receipt')

  if (receipt === null) {
    throw new Error('Missing native receipt')
  }

  await testInfo.attach('native-capture-stream', {
    body: receipt,
    contentType: 'application/json',
  })
  expect(JSON.parse(receipt)).toStrictEqual([
    { name: 'native:set', payload: { id: 1, captured: true }, held: true },
    {
      name: 'nodeStart',
      payload: {
        nodeIds: ['a'],
        positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
      },
      held: true,
    },
    { name: 'native:up', payload: { id: 1, trusted: true }, held: true },
    {
      name: 'native:release',
      payload: { id: 1, captured: false },
      held: false,
    },
    {
      name: 'change',
      payload: {
        kind: 'node-position',
        nodeId: 'a',
        position: { x: 20, y: 20 },
      },
      held: false,
    },
    {
      name: 'nodeStop',
      payload: {
        nodeIds: ['a'],
        positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
        outcome: 'proposed',
      },
      held: false,
    },
    { name: 'native:loss', payload: { id: 1, trusted: true }, held: false },
    // Pinned packages/react/src/components/NodeWrapper/index.tsx:109 selects a stationary click with selectNodesOnDrag=false.
    {
      name: 'change',
      payload: { kind: 'node-selection', nodeId: 'a', selected: true },
      held: false,
    },
  ])
  await page.locator('#vanilla-native-proof').dispatchEvent('proof-cleanup')
})
