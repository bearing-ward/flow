import { expect, test } from '@playwright/test'

import { conformanceFixtures } from '../../../packages/conformance/src/index.ts'
import { runSerially } from '../../shared-e2e/run-serially.ts'
import {
  assertFixtureOutputs,
  createFoldkitConformanceAdapter,
} from './conformance.ts'

test('Foldkit adapter satisfies every shared conformance fixture', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  await runSerially(conformanceFixtures, (fixture) =>
    test.step(fixture.id, async () => {
      await adapter.mount(fixture)

      await runSerially(fixture.expected.preservedIdentityIds ?? [], (nodeId) =>
        adapter.markIdentity(nodeId, 'preserved')
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

      await assertFixtureOutputs(adapter, fixture)
      const cleanup = await adapter.destroy()
      expect(cleanup.mountedElements, fixture.id).toBe(0)
      expect(cleanup.changesAfterDestroy, fixture.id).toBe(0)
    })
  )
})

test('Foldkit demo mounts, updates keyed nodes, reports changes, and disposes', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = conformanceFixtures.find(
    (entry) => entry.id === 'keyed-update'
  )

  if (fixture === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  await adapter.mount(fixture)
  await expect(page.getByTestId('flow-node')).toHaveCount(2)
  await adapter.markIdentity('first', 'preserved')
  const [keyedUpdate] = fixture.actions

  if (keyedUpdate === undefined) {
    throw new Error('Missing keyed-update action')
  }

  await adapter.perform(keyedUpdate)
  await expect
    .poll(() =>
      adapter.snapshot().then(({ identityMarkers }) => identityMarkers)
    )
    .toEqual(['first'])

  const dragFixture = conformanceFixtures.find(
    (entry) => entry.id === 'controlled-acknowledgement'
  )

  if (dragFixture === undefined) {
    throw new Error('Missing controlled-acknowledgement fixture')
  }

  await adapter.destroy()
  await adapter.mount(dragFixture)
  const [movement] = dragFixture.actions

  if (movement?.kind !== 'drag-node') {
    throw new Error('Missing drag-node action')
  }

  await adapter.perform(movement)
  expect(await adapter.changeKinds()).toEqual(['node-position'])
  const cleanup = await adapter.destroy()
  expect(cleanup.mountedElements).toBe(0)
})

test('Foldkit disposal releases an active pointer subscription before pointerup', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = conformanceFixtures.find(
    (entry) => entry.id === 'controlled-acknowledgement'
  )

  if (fixture === undefined) {
    throw new Error('Missing controlled-acknowledgement fixture')
  }

  await adapter.mount(fixture)

  const box = await page.locator("[data-node-id='move']").boundingBox()

  if (box === null) {
    throw new Error('Missing draggable node')
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 32, startY + 20, { steps: 3 })
  expect(await adapter.changeKinds()).toEqual([])

  await page.evaluate(() => window.__flowFoldkitTest?.dispose())
  await page.mouse.up()

  const cleanup = await page.evaluate(
    () =>
      window.__flowFoldkitTest?.finishDestroy() ?? {
        mountedElements: -1,
        changesAfterDestroy: -1,
      }
  )

  expect(cleanup.mountedElements).toBe(0)
  expect(cleanup.changesAfterDestroy).toBe(0)
  expect(await adapter.changeKinds()).toEqual([])
})

test('Foldkit controlled connection emits a candidate and waits for caller acknowledgement', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = conformanceFixtures.find(
    (entry) => entry.id === 'connection-validity'
  )

  if (fixture === undefined) {
    throw new Error('Missing connection-validity fixture')
  }

  const action = fixture.actions.find(
    (entry) => entry.kind === 'connect' && entry.targetNodeId === 'approved'
  )

  if (action === undefined) {
    throw new Error('Missing approved connection action')
  }

  await adapter.mount({ ...fixture, documentMode: 'controlled' })
  await adapter.perform(action)
  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-add'])
  const beforeAcknowledgement = await adapter.snapshot()
  expect(beforeAcknowledgement.edgeIds).toEqual([])

  await adapter.perform({
    kind: 'update-document',
    document: {
      ...fixture.document,
      edges: [
        {
          id: 'edge-1',
          source: 'source',
          sourceHandle: 'out',
          target: 'approved',
          targetHandle: 'in',
        },
      ],
    },
  })
  await expect
    .poll(() => adapter.snapshot().then(({ edgeIds }) => edgeIds))
    .toEqual(['edge-1'])
  expect(await adapter.changeKinds()).toEqual(['edge-add'])
  const cleanup = await adapter.destroy()
  expect(cleanup.mountedElements).toBe(0)
})

test('Foldkit nested drag emits a parent-local position candidate', async ({
  page,
}) => {
  const adapter = createFoldkitConformanceAdapter(page)

  const fixture = conformanceFixtures.find(
    (entry) => entry.id === 'nested-grandchild-parent-update'
  )

  if (fixture === undefined) {
    throw new Error('Missing nested graph fixture')
  }

  await adapter.mount({ ...fixture, documentMode: 'controlled', actions: [] })

  const grandchild = page.locator("[data-node-id='grandchild']")
  const box = await grandchild.boundingBox()

  if (box === null) {
    throw new Error('Missing nested grandchild')
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 20, startY + 15, { steps: 4 })
  await page.mouse.up()

  await expect.poll(() => adapter.changeKinds()).toEqual(['node-position'])

  const changes = await page.evaluate(
    () => window.__flowFoldkitTest?.changes() ?? []
  )

  expect(changes).toEqual([
    { kind: 'node-position', nodeId: 'grandchild', position: { x: 27, y: 24 } },
  ])
  const snapshot = await adapter.snapshot()
  expect(snapshot.positions).toContainEqual({
    id: 'grandchild',
    x: 132,
    y: 154,
  })
  const cleanup = await adapter.destroy()
  expect(cleanup.mountedElements).toBe(0)
})
