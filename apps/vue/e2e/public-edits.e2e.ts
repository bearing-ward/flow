import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'
import { Schema } from 'effect'

import {
  PublicEditContractFixtureSchema,
  PublicEditQueuedDisposalSchema,
} from '../../../packages/conformance/src/index.ts'
import {
  apiUtilityDeletionReference,
  normalizeVueDeletionEvent,
} from '../../shared-e2e/api-utility-reference.ts'

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

  expect(result?.document.nodes[0]?.data).toEqual({
    tag: 'left',
    label: 'edited',
  })
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({
    firstNodeData: { tag: 'left' },
    notifications: 0,
    events: ['proposal'],
  })

  await page.evaluate(() => window.__flowVueTest?.acknowledgePublicEdit())
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({
      firstNodeData: { tag: 'left', label: 'edited' },
      notifications: 1,
      events: ['proposal', 'accepted'],
    })
})

test('Vue async pre-delete narrows through useFlow and keeps controlled owner state', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.exercisePreDeleteApproval()
  )

  if (result === undefined) {
    throw new Error('Missing Vue deletion result')
  }

  expect(result).toMatchObject({
    result: {
      deletedNodeIds: ['left-visible'],
      deletedEdgeIds: ['left-edge'],
    },
    candidateNodes: ['left-visible'],
    candidateEdges: ['left-edge'],
    order: ['edges', 'nodes', 'combined'],
    acceptedNodeIds: ['left-visible', 'left-hidden'],
    acceptedEdgeIds: ['left-edge'],
    ownerNodeIds: ['left-visible', 'left-hidden'],
  })
  expect({
    requested: {
      nodes: result.requested.nodes.map((id) =>
        id === 'left-visible' ? 'b' : id
      ),
      edges: result.requested.edges,
    },
    events: result.referenceEvents.map(normalizeVueDeletionEvent),
    result: {
      nodes: result.result.deletedNodeIds.map((id) =>
        id === 'left-visible' ? 'b' : id
      ),
      edges: result.result.deletedEdgeIds.map((id) =>
        id === 'left-edge' ? 'ab' : id
      ),
    },
  }).toEqual(apiUtilityDeletionReference)
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left').events)
  ).toEqual(['proposal'])

  await page.evaluate(() => window.__flowVueTest?.acknowledgePublicEdit())
  await expect
    .poll(() => page.evaluate(() => window.__flowVueTest?.publicState('left')))
    .toMatchObject({
      nodeIds: ['left-hidden'],
      edgeIds: [],
      notifications: 1,
      events: ['proposal', 'accepted'],
    })
})

test('Vue controlled delete proposal stays unaccepted when the owner does not acknowledge', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const proposal = await page.evaluate(() =>
    window.__flowVueTest?.exercisePreDeleteApproval()
  )

  expect(proposal?.result).toEqual({
    deletedNodeIds: ['left-visible'],
    deletedEdgeIds: ['left-edge'],
  })
  expect(proposal?.ownerNodeIds).toEqual(['left-visible', 'left-hidden'])
  expect(proposal?.acceptedNodeIds).toEqual(['left-visible', 'left-hidden'])
  expect(proposal?.acceptedEdgeIds).toEqual(['left-edge'])
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left'))
  ).toMatchObject({
    nodeIds: ['left-visible', 'left-hidden'],
    edgeIds: ['left-edge'],
    notifications: 0,
    events: ['proposal'],
  })
})

test('Vue empty delete requests skip callbacks and callback failures prevent publication', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.exercisePreDeleteCallbackOutcomes()
  )

  expect(result).toEqual({
    empty: {
      result: { deletedNodeIds: [], deletedEdgeIds: [] },
      callbacks: [],
    },
    failed: 'edge callback failed',
    callbacks: ['edges'],
    ownerNodeIds: ['left-visible', 'left-hidden'],
    acceptedNodeIds: ['left-visible', 'left-hidden'],
    acceptedEdgeIds: ['left-edge'],
  })
})

test('Vue rejects async delete approval after accepted state changes away and back', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.exerciseStalePreDeleteApproval()
  )

  expect(result).toContain('FlowDeleteRevisionConflict')
  expect(
    await page.evaluate(() => window.__flowVueTest?.publicState('left').nodeIds)
  ).toEqual(['left-visible', 'left-hidden'])
})

test('Vue unmount settles pending pre-delete approval and ignores late response', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.disposeDuringPreDeleteApproval()
  )

  expect(result).toEqual({
    error: 'FlowEditDisposed',
    approvalResolved: true,
    nodeIds: ['left-visible', 'left-hidden'],
  })
})

test('Vue denial, invalid widening, and hook rejection preserve the accepted graph', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.exercisePreDeleteDecisions()
  )

  expect(result).toMatchObject({
    denied: { deletedNodeIds: [], deletedEdgeIds: [] },
    acceptedNodeIds: ['left-visible', 'left-hidden'],
    acceptedEdgeIds: ['left-edge'],
  })
  expect(result?.widened).toContain('FlowDeleteInvalidCandidate')
  expect(result?.rejected).toContain('FlowDeleteApprovalFailed')
})

test('Vue reentrant delete settles inner edit and rejects stale outer proposal', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.exerciseReentrantPreDelete()
  )

  expect(result?.outer).toContain('FlowDeleteRevisionConflict')
  expect(result?.inner).toEqual({
    deletedNodeIds: ['right-other'],
    deletedEdgeIds: [],
  })
  expect(result?.callbacks).toEqual([])
  expect(result?.acceptedNodeIds).toEqual(['right-node'])
})

test('Vue callback cancellation preserves the accepted graph without a pre-delete hook', async ({
  page,
}) => {
  await page.goto('/test.html')

  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const results = await page.evaluate(() =>
    window.__flowVueTest?.exerciseDeleteCallbackCancellation()
  )

  expect(results).toEqual([
    {
      trigger: 'edges',
      result: expect.stringContaining('FlowDeleteCancelled'),
      callbacks: ['edges'],
      nodeIds: ['right-node', 'right-other'],
      edgeIds: ['right-edge'],
    },
    {
      trigger: 'nodes',
      result: expect.stringContaining('FlowDeleteCancelled'),
      callbacks: ['edges', 'nodes'],
      nodeIds: ['right-node', 'right-other'],
      edgeIds: ['right-edge'],
    },
    {
      trigger: 'combined',
      result: expect.stringContaining('FlowDeleteCancelled'),
      callbacks: ['edges', 'nodes', 'combined'],
      nodeIds: ['right-node', 'right-other'],
      edgeIds: ['right-edge'],
    },
  ])
})

test('Vue callback-triggered delete runs after the outer publication without deadlock', async ({
  page,
}) => {
  await page.goto('/test.html')

  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.exerciseCallbackReentrantDelete()
  )

  expect(result).toEqual({
    outer: { deletedNodeIds: ['right-node'], deletedEdgeIds: [] },
    inner: { deletedNodeIds: ['right-other'], deletedEdgeIds: [] },
    nodeIds: [],
  })
})

test('Vue async delete approval reports edges, nodes, and combined candidate in order', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    window.__flowVueTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowVueTest?.exercisePreDeleteApproval()
  )

  expect(result?.candidateNodes).toEqual(['left-visible'])
  expect(result?.candidateEdges).toEqual(['left-edge'])
  expect(result?.order).toEqual(['edges', 'nodes', 'combined'])
  expect(result?.result).toMatchObject({
    deletedNodeIds: ['left-visible'],
    deletedEdgeIds: ['left-edge'],
  })
  expect(result?.acceptedNodeIds).toEqual(['left-visible', 'left-hidden'])
  expect(result?.acceptedEdgeIds).toEqual(['left-edge'])
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
