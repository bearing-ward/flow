import { expect, test } from '@playwright/test'

import { conformanceFixtures } from '../../../packages/conformance/src/index.ts'
import { runSerially } from '../../shared-e2e/run-serially.ts'
import { createVanillaConformanceAdapter } from './controller-conformance.ts'

test('vanilla adapter satisfies every shared conformance fixture', async ({
  page,
}) => {
  const adapter = createVanillaConformanceAdapter(page)

  await runSerially(conformanceFixtures, (fixture) =>
    test.step(fixture.id, async () => {
      await adapter.mount(fixture)

      await runSerially(fixture.expected.preservedIdentityIds ?? [], (id) =>
        adapter.markIdentity(id, 'preserved')
      )

      await runSerially(fixture.actions, (action) => adapter.perform(action))

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
