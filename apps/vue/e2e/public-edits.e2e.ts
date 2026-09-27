import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'
import { Schema } from 'effect'

import {
  PublicEditContractFixtureSchema,
  PublicEditQueuedDisposalSchema,
} from '../../../packages/conformance/src/index.ts'

const {
  fixtures: [dataEditFixture],
  queuedDisposal,
} = Schema.decodeUnknownSync(
  Schema.Struct({
    version: Schema.Literal(1),
    fixtures: Schema.Array(PublicEditContractFixtureSchema),
    queuedDisposal: PublicEditQueuedDisposalSchema,
  })
)(
  JSON.parse(
    readFileSync('research/fixtures/public-edit-contract.json', 'utf-8')
  )
)

test('Vue edit proposals use the owner document until acknowledgement', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.proposePublicDataEdit()
  )

  expect(result?.document.nodes[0]?.data).toEqual({ label: 'edited' })
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({
    firstNodeData: null,
    notifications: 0,
    events: ['proposal'],
  })

  await page.evaluate(() => window.__flowVueTest?.acknowledgePublicEdit())
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({
      firstNodeData: { label: 'edited' },
      notifications: 1,
      events: ['proposal', 'accepted'],
    })
})

test('Vue updater callbacks run once with protected accepted snapshots', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.exerciseFunctionalEditUpdaters()
  )

  expect(result).toEqual({ calls: 2, count: 2, mutationBlocked: true })
})

test('Vue unmount settles prepared edits without proposal or accepted events', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(
    (scenario) => window.__flowVueTest?.disposeDuringEditPreparation(scenario),
    queuedDisposal
  )

  expect(result).toEqual({
    error: 'FlowCanvasDisposed',
    events: ['accepted:trigger'],
  })
  expect(queuedDisposal.expected).toEqual({
    triggerOutcome: 'accepted',
    queuedOutcome: 'disposed',
    lateNotifications: 0,
  })
})

test('Vue edits remain scoped to their providing canvas', async ({ page }) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.exercisePublicEditIsolation()
  )

  expect(result).toEqual({
    leftNodeIds: ['left-visible', 'left-hidden'],
    rightData: { isolatedEdit: true },
    leftEvents: [],
    rightEvents: ['proposal', 'accepted'],
  })
})

test('Vue split bindings acknowledge one atomic node and edge candidate in the same tick', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startSplitModel()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.applySplitEdit()
  )

  expect(result?.document.nodes.map(({ id }) => id)).toEqual([
    'split-a',
    'split-c',
  ])
  expect(result?.document.edges.map(({ id }) => id)).toEqual([
    'split-reconnected-edge',
  ])
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.splitEditSnapshot()))
    .toMatchObject({
      nodeIds: ['split-a', 'split-c'],
      edgeIds: ['split-reconnected-edge'],
      nodeUpdates: 1,
      edgeUpdates: 1,
      proposals: 1,
    })
})

test('Vue production edit preparation matches the fixed public-edit fixture', async ({
  page,
}) => {
  if (dataEditFixture === undefined) {
    throw new Error('Missing public-edit contract fixture')
  }

  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(
    ({ document, transaction }) =>
      window.__flowVueTest?.applyPublicEditFixture(document, transaction),
    {
      document: dataEditFixture.document,
      transaction: dataEditFixture.transaction,
    }
  )

  expect(result?.document).toStrictEqual(dataEditFixture.expected.document)
  expect(result?.deletion).toStrictEqual({
    deletedNodeIds: dataEditFixture.expected.deletedNodeIds,
    deletedEdgeIds: dataEditFixture.expected.deletedEdgeIds,
  })
  expect(result?.events).toEqual(['proposal'])
  expect(result?.domNodeIds).toEqual(['a', 'b'])
  expect(result?.retainedDomIdentity).toBe(true)
  expect(result?.acceptedDocument.nodes[0]?.data).toEqual({
    keep: true,
    value: 1,
  })
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({
      nodeIds: dataEditFixture.document.nodes.map(({ id }) => id),
      edgeIds: dataEditFixture.document.edges.map(({ id }) => id),
    })
})

test('Vue production cascade matches the fixed public-edit fixture', async ({
  page,
}) => {
  const fixture = Schema.decodeUnknownSync(
    Schema.Struct({
      version: Schema.Literal(1),
      fixtures: Schema.Array(PublicEditContractFixtureSchema),
    })
  )(
    JSON.parse(
      readFileSync('research/fixtures/public-edit-contract.json', 'utf-8')
    )
  ).fixtures.find(({ id }) => id === 'cascade-delete')

  if (fixture === undefined) {
    throw new Error('Missing cascade public-edit fixture')
  }

  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(
    ({ document, transaction }) =>
      window.__flowVueTest?.applyPublicEditFixture(document, transaction),
    { document: fixture.document, transaction: fixture.transaction }
  )

  expect(result?.document).toStrictEqual(fixture.expected.document)
  expect(result?.deletion).toStrictEqual({
    deletedNodeIds: fixture.expected.deletedNodeIds,
    deletedEdgeIds: fixture.expected.deletedEdgeIds,
  })
})

test('Vue rejects the fixed protected-deletion fixture without changing owner state', async ({
  page,
}) => {
  const fixture = Schema.decodeUnknownSync(
    Schema.Struct({
      version: Schema.Literal(1),
      fixtures: Schema.Array(PublicEditContractFixtureSchema),
    })
  )(
    JSON.parse(
      readFileSync('research/fixtures/public-edit-contract.json', 'utf-8')
    )
  ).fixtures.find(({ id }) => id === 'protected-edge-conflict')

  if (fixture === undefined) {
    throw new Error('Missing protected-deletion fixture')
  }

  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const failureName = await page.evaluate(
    async ({ document, transaction }) => {
      try {
        await window.__flowVueTest?.applyPublicEditFixture(
          document,
          transaction
        )
      } catch (error) {
        if (error instanceof Error) {
          return error.name
        }

        return null
      }

      return null
    },
    { document: fixture.document, transaction: fixture.transaction }
  )

  expect(failureName).toBe(fixture.expected.error?._tag)
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({
    document: fixture.expected.document,
    nodeIds: fixture.document.nodes.map(({ id }) => id),
    edgeIds: fixture.document.edges.map(({ id }) => id),
  })
})

test('Vue rejects the fixed protected-descendant fixture without changing owner state', async ({
  page,
}) => {
  const fixture = Schema.decodeUnknownSync(
    Schema.Struct({
      version: Schema.Literal(1),
      fixtures: Schema.Array(PublicEditContractFixtureSchema),
    })
  )(
    JSON.parse(
      readFileSync('research/fixtures/public-edit-contract.json', 'utf-8')
    )
  ).fixtures.find(({ id }) => id === 'protected-descendant-conflict')

  if (fixture === undefined) {
    throw new Error('Missing protected-deletion fixture')
  }

  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const failureName = await page.evaluate(
    async ({ document, transaction }) => {
      try {
        await window.__flowVueTest?.applyPublicEditFixture(
          document,
          transaction
        )
      } catch (error) {
        if (error instanceof Error) {
          return error.name
        }

        return null
      }

      return null
    },
    { document: fixture.document, transaction: fixture.transaction }
  )

  expect(failureName).toBe(fixture.expected.error?._tag)
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({
    document: fixture.expected.document,
    nodeIds: fixture.document.nodes.map(({ id }) => id),
    edgeIds: fixture.document.edges.map(({ id }) => id),
  })
})

test('Vue rejects the fixed invalid-endpoint fixture without changing owner state', async ({
  page,
}) => {
  const fixture = Schema.decodeUnknownSync(
    Schema.Struct({
      version: Schema.Literal(1),
      fixtures: Schema.Array(PublicEditContractFixtureSchema),
    })
  )(
    JSON.parse(
      readFileSync('research/fixtures/public-edit-contract.json', 'utf-8')
    )
  ).fixtures.find(({ id }) => id === 'invalid-final-endpoint-rollback')

  if (fixture === undefined) {
    throw new Error('Missing invalid-endpoint fixture')
  }

  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const failureName = await page.evaluate(
    async ({ document, transaction }) => {
      try {
        await window.__flowVueTest?.applyPublicEditFixture(
          document,
          transaction
        )
      } catch (error) {
        return error instanceof Error ? error.name : null
      }

      return null
    },
    { document: fixture.document, transaction: fixture.transaction }
  )

  expect(failureName).toBe(fixture.expected.error?._tag)
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({
    nodeIds: fixture.document.nodes.map(({ id }) => id),
    edgeIds: fixture.document.edges.map(({ id }) => id),
  })
})
