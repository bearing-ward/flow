import { expect, test } from '@playwright/test'

import { conformanceFixtures } from '../../../packages/conformance/src/index.ts'
import { runSerially } from '../../shared-e2e/run-serially.ts'
import { createVueConformanceAdapter } from './conformance.ts'

declare global {
  interface Window {
    __dragNode?: HTMLElement | null
  }
}

test('Vue adapter satisfies every shared conformance fixture', async ({
  page,
}) => {
  const adapter = createVueConformanceAdapter(page)

  await runSerially(conformanceFixtures, (fixture) =>
    test.step(fixture.id, async () => {
      await adapter.mount(fixture)

      await runSerially(fixture.expected.preservedIdentityIds ?? [], (id) =>
        adapter.markIdentity(id, 'preserved')
      )

      await runSerially(fixture.actions, async (action) => {
        await adapter.perform(action)

        if (
          fixture.id === 'controlled-acknowledgement' &&
          action.kind === 'drag-node'
        ) {
          const snapshot = await adapter.snapshot()
          expect(snapshot.positions).toEqual([{ id: 'move', x: 80, y: 100 }])
          expect(await adapter.changeKinds()).toEqual(['node-position'])
        }
      })

      await expect
        .poll(() => adapter.snapshot().then(({ nodeIds }) => nodeIds))
        .toEqual(fixture.expected.nodeIds)
      const snapshot = await adapter.snapshot()
      expect(snapshot.nodeIds, fixture.id).toEqual(fixture.expected.nodeIds)
      expect(snapshot.edgeIds, fixture.id).toEqual(fixture.expected.edgeIds)
      expect(snapshot.positions, fixture.id).toEqual(fixture.expected.positions)
      expect(snapshot.identityMarkers, fixture.id).toEqual(
        fixture.expected.preservedIdentityIds ?? []
      )
      expect(await adapter.changeKinds(), fixture.id).toEqual(
        fixture.expected.changeKinds
      )
      const cleanup = await adapter.destroy()
      expect(cleanup.mountedElements, fixture.id).toBe(0)
      expect(cleanup.changesAfterDestroy, fixture.id).toBe(0)
    })
  )
})

test('Vue injection stays canvas-scoped and keyed custom components survive updates', async ({
  page,
}) => {
  await page.goto('/test.html')

  const result = await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)

    return window.__flowVueTest?.smoke()
  })

  expect(result).toEqual({
    leftCount: '2',
    rightCount: '1',
    labelUpdated: true,
    edgeUpdated: true,
    identityPreserved: true,
    mounted: 3,
    unmounted: 3,
    edgeMounted: 1,
    edgeUnmounted: 1,
    remaining: 0,
  })
})

test('Vue nodes and edges bindings render caller state and acknowledge emitted updates', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startSplitModel()
  })
  await expect(page.locator("[data-node-id='split-a']")).toContainText(
    'Split A'
  )
  await expect(page.locator("[data-node-id='split-b']")).toHaveCount(1)
  await page
    .locator("[data-node-id='split-a']")
    .evaluate((node: HTMLElement) => {
      node.dataset.identity = 'caller-node'
    })
  const node = page.locator("[data-node-id='split-a']")
  const nodeBox = await node.boundingBox()

  if (nodeBox === null) {
    throw new Error('Missing split model node')
  }

  const nodeX = nodeBox.x + nodeBox.width / 2
  const nodeY = nodeBox.y + nodeBox.height / 2
  await page.mouse.move(nodeX, nodeY)
  await page.mouse.down()
  await page.mouse.move(nodeX + 40, nodeY + 40, { steps: 3 })
  await page.mouse.up()
  await expect(node).toHaveCSS('left', '60px')
  const source = page.locator("[data-node-id='split-a'] [data-handle-id='out']")
  const target = page.locator("[data-node-id='split-b'] [data-handle-id='in']")
  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()

  if (sourceBox === null || targetBox === null) {
    throw new Error('Missing split model connection handle')
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 3 }
  )
  await page.mouse.up()
  await expect(page.locator('[data-edge-id]')).toHaveCount(1)
  await page.evaluate(() =>
    window.__flowVueTest?.updateSplitDocument({
      nodes: [
        {
          id: 'split-a',
          label: 'Updated split A',
          position: { x: 90, y: 100 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'split-b',
          label: 'Split B',
          position: { x: 240, y: 30 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'split-replacement-edge',
          source: 'split-a',
          target: 'split-b',
          label: 'Replacement edge',
        },
      ],
    })
  )
  await expect(node).toContainText('Updated split A')
  await expect(node).toHaveCSS('left', '90px')
  await expect(
    page.locator("[data-edge-id='split-replacement-edge']")
  ).toHaveCount(1)

  const result = await page.evaluate(() =>
    window.__flowVueTest?.splitModelSnapshot()
  )

  expect(result).toEqual({
    initialRendered: true,
    nodeUpdateAcknowledged: true,
    edgeUpdateAcknowledged: true,
    documentUpdateAcknowledged: true,
    identityPreserved: true,
  })
})

test('Vue nested child dragging publishes local coordinates and renders world coordinates', async ({
  page,
}) => {
  await runSerially(['controlled', 'uncontrolled'] as const, async (mode) => {
    await page.goto('/test.html')
    await page.evaluate(async (documentMode) => {
      await import('../src/test-harness.ts')
      window.__flowVueTest?.startNestedDragCase(documentMode)
    }, mode)
    const child = page.locator("[data-node-id='child:[]']")
    await expect(child).toHaveCSS('left', '120px')
    await expect(child).toHaveCSS('top', '150px')
    const before = await child.boundingBox()

    if (before === null) {
      throw new Error('Missing nested child')
    }

    await page.mouse.move(before.x + 30, before.y + 20)
    await page.mouse.down()
    await page.mouse.move(before.x + 18, before.y + 5, { steps: 3 })
    await page.mouse.up()
    await expect(child).toHaveCSS('left', '108px')
    await expect(child).toHaveCSS('top', '135px')
    expect(
      await page.evaluate(() => window.__flowVueTest?.positionChanges)
    ).toEqual([{ nodeId: 'child:[]', position: { x: 8, y: 15 } }])
    const after = await child.boundingBox()
    expect(after?.x).toBe(before.x - 12)
    expect(after?.y).toBe(before.y - 15)
  })
})

test('Vue cancelled drag previews restore pixels and allow a fresh gesture', async ({
  page,
}) => {
  await runSerially(
    ['escape', 'pointercancel', 'removal', 'unmount'] as const,
    async (cancellation) => {
      await page.goto('/test.html')
      await page.evaluate(async () => {
        await import('../src/test-harness.ts')
        window.__flowVueTest?.startNestedDragCase('controlled')
      })
      const child = page.locator("[data-node-id='child:[]']")
      const before = await child.boundingBox()

      if (before === null) {
        throw new Error('Missing nested child')
      }

      await page.evaluate(() => {
        window.__dragNode = document.querySelector<HTMLElement>(
          "[data-node-id='child:[]']"
        )
      })
      await page.mouse.move(before.x + 30, before.y + 20)
      await page.mouse.down()
      await page.mouse.move(before.x + 45, before.y + 35, { steps: 2 })

      if (cancellation === 'escape') {
        await page.keyboard.press('Escape')
      } else if (cancellation === 'pointercancel') {
        await page
          .locator("[data-testid='flow-canvas']")
          .evaluate((canvas) =>
            canvas.dispatchEvent(
              new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })
            )
          )
      } else if (cancellation === 'removal') {
        await page.evaluate(() =>
          window.__flowVueTest?.updateNestedDragDocument({
            edges: [],
            nodes: [
              { id: 'parent', label: 'Parent', position: { x: 100, y: 120 } },
            ],
          })
        )
        await expect(child).toHaveCount(0)
      } else {
        await page.evaluate(() => window.__flowVueTest?.destroy())
      }

      const cancelled = await page.evaluate(() => {
        const node = window.__dragNode

        return {
          transform: node?.style.transform ?? null,
          rect: node?.getBoundingClientRect().toJSON() ?? null,
          changes: window.__flowVueTest?.positionChanges ?? [],
        }
      })

      expect(cancelled.transform).toBe('')
      expect(cancelled.changes).toEqual([])

      if (cancellation !== 'unmount' && cancellation !== 'removal') {
        expect(cancelled.rect?.x).toBe(before.x)
        expect(cancelled.rect?.y).toBe(before.y)
      }

      if (cancellation === 'escape' || cancellation === 'pointercancel') {
        await page.mouse.up()
        const fresh = await child.boundingBox()

        if (fresh === null) {
          throw new Error('Cancelled gesture removed child')
        }

        await page.mouse.move(fresh.x + 30, fresh.y + 20)
        await page.mouse.down()
        await page.mouse.move(fresh.x + 40, fresh.y + 30, { steps: 2 })
        await page.mouse.up()
        expect(
          await page.evaluate(() => window.__flowVueTest?.positionChanges)
        ).toHaveLength(1)
      }
    }
  )
})
