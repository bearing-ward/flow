import { readFileSync } from 'node:fs'

import {
  FlowSnapshotSchema,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
} from '@flow/core'
import { expect, test } from '@playwright/test'
import { Schema } from 'effect'

import {
  PublicStateContractFixtureSchema,
  conformanceFixtures,
} from '../../../packages/conformance/src/index.ts'
import type { PublicStateContractFixture } from '../../../packages/conformance/src/index.ts'
import { runSerially } from '../../shared-e2e/run-serially.ts'
import { createVanillaConformanceAdapter } from './controller-conformance.ts'

const publicStateFixtures = Schema.decodeUnknownSync(
  Schema.Struct({
    version: Schema.Literal(1),
    fixtures: Schema.Array(PublicStateContractFixtureSchema),
  })
)(
  JSON.parse(
    readFileSync('research/fixtures/public-state-contract.json', 'utf-8')
  )
)

const assertPublicStateFixture = async (
  adapter: ReturnType<typeof createVanillaConformanceAdapter>,
  fixture: PublicStateContractFixture
): Promise<void> => {
  const initialFixture = fixture.fixture

  const mountFixture = {
    version: initialFixture.version,
    id: initialFixture.id,
    description: initialFixture.description,
    documentMode: initialFixture.documentMode,
    viewportMode: initialFixture.viewportMode,
    document: initialFixture.document,
    actions: [],
    expected: {
      nodeIds: initialFixture.expected.nodeIds,
      edgeIds: initialFixture.expected.edgeIds,
      positions: initialFixture.expected.positions,
      changeKinds: initialFixture.expected.changeKinds,
    },
  }

  if (initialFixture.renderOnlyVisible !== undefined) {
    Object.assign(mountFixture, {
      renderOnlyVisible: initialFixture.renderOnlyVisible,
    })
  }

  await adapter.mount(mountFixture)

  await runSerially(fixture.steps, async (step) => {
    if (step.action !== undefined) {
      await adapter.perform(step.action)
    }

    const read = await adapter.readState(step.query)
    expect(read, `${fixture.id} state read`).toEqual(step.expected.read)
    expect(
      await adapter.changeKinds(),
      `${fixture.id} semantic events`
    ).toEqual(step.expected.semanticKinds)
    expect(
      await adapter.acceptedStates(),
      `${fixture.id} accepted events`
    ).toEqual(step.expected.acceptedStates)

    const currentSnapshot = Schema.decodeUnknownSync(FlowSnapshotSchema)(
      read.snapshot
    )

    const selectedNode = currentSnapshot.document.nodes.find(
      ({ id }) => id === fixture.graphQuery.nodeId
    )

    const neighbors =
      selectedNode === undefined
        ? []
        : [
            ...getIncomers(
              selectedNode,
              currentSnapshot.document.nodes,
              currentSnapshot.document.edges
            ),
            ...getOutgoers(
              selectedNode,
              currentSnapshot.document.nodes,
              currentSnapshot.document.edges
            ),
          ]

    const neighborIdSet = new Set(neighbors.map(({ id }) => id))

    const neighborIds = currentSnapshot.document.nodes
      .filter(({ id }) => neighborIdSet.has(id))
      .map(({ id }) => id)

    const connectedEdges =
      selectedNode === undefined
        ? []
        : getConnectedEdges([selectedNode], currentSnapshot.document.edges)

    expect(neighborIds, `${fixture.id} graph neighbors`).toEqual(
      step.expected.neighborNodeIds
    )
    expect(
      connectedEdges.map(({ id }) => id),
      `${fixture.id} connected edges`
    ).toEqual(step.expected.connectedEdgeIds)

    await expect
      .poll(() => adapter.snapshot().then(({ nodeIds }) => nodeIds))
      .toEqual(step.expected.rendered.nodeIds)
    await expect
      .poll(() => adapter.snapshot().then(({ edgeIds }) => edgeIds))
      .toEqual(step.expected.rendered.edgeIdsByHost.vanilla)
    await expect
      .poll(() => adapter.snapshot().then(({ positions }) => positions))
      .toEqual(step.expected.rendered.positions)
    const rendered = await adapter.snapshot()
    expect(rendered.nodeIds, `${fixture.id} rendered nodes`).toEqual(
      step.expected.rendered.nodeIds
    )
    expect(rendered.edgeIds, `${fixture.id} rendered edges`).toEqual(
      step.expected.rendered.edgeIdsByHost.vanilla
    )
    expect(rendered.positions, `${fixture.id} rendered positions`).toEqual(
      step.expected.rendered.positions
    )
  })

  const cleanup = await adapter.destroy()
  expect(cleanup).toEqual(fixture.expectedDisposal)
}

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

test('vanilla production reads match the shared public-state contract fixtures', async ({
  page,
}) => {
  const adapter = createVanillaConformanceAdapter(page)

  await runSerially(publicStateFixtures.fixtures, (fixture) =>
    test.step(fixture.id, () => assertPublicStateFixture(adapter, fixture))
  )
})
