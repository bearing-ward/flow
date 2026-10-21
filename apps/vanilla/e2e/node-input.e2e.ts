import { expect, test } from '@playwright/test'

import { selectionBoundsContract } from '../../shared-e2e/node-input-contract.ts'
import type * as NodeReentryHarness from './node-reentry-harness.ts'

test.use({ viewport: { width: 1280, height: 720 } })

test('threshold-zero label press and release selects without moving the node', async ({
  page,
}) => {
  await page.goto('/upstream/nodes/general')
  const node = page.locator('.flow-node[data-node-id="Node-1"]')
  const label = node.locator('.flow-node-content')
  await expect(label).toBeVisible()
  const before = await node.boundingBox()
  await label.hover()
  await page.mouse.down()
  await expect(node).toHaveClass(/dragging/u)
  // Pinned packages/system/src/xydrag/XYDrag.ts:282 selects before the zero-threshold drag starts.
  await expect(node).toHaveClass(/selected/u)
  await page.mouse.up()
  await expect(node).toHaveClass(/selected/u)
  await expect(node).not.toHaveClass(/dragging/u)
  await expect(node).toBeFocused()
  expect(await node.boundingBox()).toEqual(before)
})

selectionBoundsContract('vanilla')

test('threshold-zero selection publishes before drag start with capture held', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const path = '/e2e/node-reentry-harness.ts'
    const fixture: typeof NodeReentryHarness = await import(path)
    await fixture.mountNativeCaptureProof(true)
  })

  const node = page.locator(
    '#vanilla-native-proof .flow-node[data-node-id="a"]'
  )

  const bounds = await node.boundingBox()

  if (bounds === null) {
    throw new Error('Missing native node bounds')
  }

  await page.mouse.move(bounds.x + 30, bounds.y + 20)
  await page.mouse.down()

  // Pinned packages/system/src/xydrag/XYDrag.ts:282 selects before onNodeDragStart at :298.
  const receipt = await page
    .locator('#vanilla-native-proof')
    .getAttribute('data-receipt')

  if (receipt === null) {
    throw new Error('Missing native selection receipt')
  }

  expect(JSON.parse(receipt)).toStrictEqual([
    { name: 'native:set', payload: { id: 1, captured: true }, held: true },
    {
      name: 'change',
      payload: { kind: 'node-selection', nodeId: 'a', selected: true },
      held: true,
    },
    {
      name: 'nodeStart',
      payload: {
        nodeIds: ['a'],
        positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
      },
      held: true,
    },
  ])
  await page.mouse.up()
  await page.locator('#vanilla-native-proof').dispatchEvent('proof-cleanup')
})
