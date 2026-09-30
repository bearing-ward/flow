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

test('Foldkit reentrant edit requests settle each request ID in order', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const result = await page.evaluate(() =>
    window.__flowFoldkitTest?.exercisePublicEditReentrancy()
  )

  expect(result).toMatchObject({
    responseOrder: ['edit-1', 'edit-2'],
    firstCount: 1,
    secondCount: 2,
    finalCount: 2,
  })
})

test('Foldkit disposal settles pending reentrant request IDs with typed failures', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const result = await page.evaluate(
    (scenario) =>
      window.__flowFoldkitTest?.exercisePublicEditDisposal(scenario),
    queuedDisposal
  )

  expect(result?.pendingCount).toBe(0)
  expect(result?.responseOrder).toEqual(['edit-1', 'edit-2'])
  expect(result?.responseTags).toEqual(['success', 'FlowEditDisposed'])
  expect(result?.lateNotifications).toBe(
    queuedDisposal.expected.lateNotifications
  )
})

test('Foldkit edit requests return typed results and preserve controlled ownership', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const controlledBefore = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled', {
      nodeId: 'visible',
    })
  )

  const uncontrolled = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestPublicEdit('uncontrolled', {
      operations: [
        {
          kind: 'update-node-data',
          nodeId: 'visible',
          data: { source: 'edit-port' },
        },
      ],
    })
  )

  if (uncontrolled === undefined || !('result' in uncontrolled)) {
    throw new Error('Missing uncontrolled Foldkit edit result')
  }

  expect(uncontrolled.result.document.nodes[0]?.data).toMatchObject({
    alpha: 1,
    beta: 2,
    source: 'edit-port',
  })
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.requestSnapshot('controlled', {
        nodeId: 'visible',
      })
    )
  ).toMatchObject({ node: { data: controlledBefore?.node?.data } })
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowFoldkitTest?.requestSnapshot('uncontrolled', {
          nodeId: 'visible',
        })
      )
    )
    .toMatchObject({
      node: { data: { alpha: 1, beta: 2, source: 'edit-port' } },
    })

  const failure = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestPublicEdit('uncontrolled', {
      operations: [
        {
          kind: 'add-nodes',
          nodes: [
            { id: 'visible', label: 'Duplicate', position: { x: 0, y: 0 } },
          ],
        },
      ],
    })
  )

  expect(failure).toMatchObject({ error: { nodeId: 'visible' } })

  const recoverableErrors = await page.evaluate(
    () =>
      window.__flowFoldkitTest?.publicInteractionEvents('uncontrolled') ?? []
  )

  expect(recoverableErrors.at(-1)).toMatchObject({
    name: 'onError',
    phase: 'event',
    inputKind: 'api',
    reason: 'DuplicateNodeId',
  })

  const controlled = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestPublicEdit('controlled', {
      operations: [
        {
          kind: 'update-node-data',
          nodeId: 'visible',
          data: { source: 'owner-ack' },
        },
      ],
    })
  )

  if (controlled === undefined || !('result' in controlled)) {
    throw new Error('Missing controlled Foldkit edit result')
  }

  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.requestSnapshot('controlled', {
        nodeId: 'visible',
      })
    )
  ).toMatchObject({ node: { data: { alpha: 1, beta: 2 } } })
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.publicAcceptedStates('controlled')
    )
  ).toHaveLength(0)

  await page.evaluate((document) => {
    if (document !== undefined) {
      window.__flowFoldkitTest?.replacePublicDocument('controlled', document)
    }
  }, controlled.result.document)

  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowFoldkitTest?.requestSnapshot('controlled', {
          nodeId: 'visible',
        })
      )
    )
    .toMatchObject({ node: { data: { source: 'owner-ack' } } })
})

test('Foldkit production edit ports match the fixed public-edit fixture', async ({
  page,
}) => {
  if (dataEditFixture === undefined) {
    throw new Error('Missing public-edit contract fixture')
  }

  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })
  await page.evaluate((document) => {
    window.__flowFoldkitTest?.replacePublicDocument('uncontrolled', document)
  }, dataEditFixture.document)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const result = await page.evaluate(
    async ({ transaction }) => {
      const harness = window.__flowFoldkitTest

      const [canvas] = document.querySelectorAll<HTMLElement>(
        '[data-testid="flow-canvas"]'
      )

      const stableNode = canvas?.querySelector<HTMLElement>(
        '[data-testid="flow-node"][data-node-id="b"]'
      )

      const changeStart = harness?.publicChanges('uncontrolled').length ?? 0

      const stateStart =
        harness?.publicAcceptedStates('uncontrolled').length ?? 0

      const orderStart = harness?.publicEventOrder('uncontrolled').length ?? 0

      const response = await harness?.requestPublicEdit(
        'uncontrolled',
        transaction
      )

      await harness?.settlePublicState()

      const settledNode = canvas?.querySelector<HTMLElement>(
        '[data-testid="flow-node"][data-node-id="b"]'
      )

      return {
        response,
        changes: harness?.publicChanges('uncontrolled').slice(changeStart),
        acceptedStates: harness
          ?.publicAcceptedStates('uncontrolled')
          .slice(stateStart),
        eventOrder: harness?.publicEventOrder('uncontrolled').slice(orderStart),
        domNodeIds: [
          ...(canvas?.querySelectorAll<HTMLElement>(
            '[data-testid="flow-node"][data-node-id]'
          ) ?? []),
        ].map((element) => element.dataset.nodeId ?? ''),
        retainedDomIdentity: stableNode !== null && stableNode === settledNode,
      }
    },
    { transaction: dataEditFixture.transaction }
  )

  if (result?.response === undefined || !('result' in result.response)) {
    throw new Error('Missing Foldkit fixture edit result')
  }

  expect(result.response.result.document).toStrictEqual(
    dataEditFixture.expected.document
  )
  expect(result.response.result.deletion).toStrictEqual({
    deletedNodeIds: dataEditFixture.expected.deletedNodeIds,
    deletedEdgeIds: dataEditFixture.expected.deletedEdgeIds,
  })
  expect(result.changes?.map(({ kind }) => kind)).toEqual(['edit-proposal'])
  expect(result.acceptedStates?.map(({ cause }) => cause)).toEqual([
    'semantic-change',
  ])
  expect(result.eventOrder).toEqual([
    'change:edit-proposal',
    'state:semantic-change',
  ])
  expect(result.domNodeIds).toEqual(['a', 'b'])
  expect(result.retainedDomIdentity).toBe(true)
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
      )
    )
    .toMatchObject({
      snapshot: { document: dataEditFixture.expected.document },
    })
})

test('Foldkit production cascade matches the fixed public-edit fixture', async ({
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
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })
  await page.evaluate((document) => {
    window.__flowFoldkitTest?.replacePublicDocument('uncontrolled', document)
  }, fixture.document)

  const response = await page.evaluate(
    ({ transaction }) =>
      window.__flowFoldkitTest?.requestPublicEdit('uncontrolled', transaction),
    { transaction: fixture.transaction }
  )

  if (response === undefined || !('result' in response)) {
    throw new Error('Missing Foldkit cascade edit result')
  }

  expect(response.result.document).toStrictEqual(fixture.expected.document)
  expect(response.result.deletion).toStrictEqual({
    deletedNodeIds: fixture.expected.deletedNodeIds,
    deletedEdgeIds: fixture.expected.deletedEdgeIds,
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
      )
    )
    .toMatchObject({ snapshot: { document: fixture.expected.document } })
})

test('Foldkit reports the fixed protected-deletion conflict without mutation', async ({
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
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })
  await page.evaluate((document) => {
    window.__flowFoldkitTest?.replacePublicDocument('uncontrolled', document)
  }, fixture.document)

  const response = await page.evaluate(
    ({ transaction }) =>
      window.__flowFoldkitTest?.requestPublicEdit('uncontrolled', transaction),
    { transaction: fixture.transaction }
  )

  const expectedError = Schema.encodeSync(PublicEditContractFixtureSchema)(
    fixture
  ).expected.error

  expect(response).toMatchObject({ error: expectedError })
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
      )
    )
    .toMatchObject({ snapshot: { document: fixture.expected.document } })
})

test('Foldkit reports the fixed protected-descendant conflict without mutation', async ({
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
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })
  await page.evaluate((document) => {
    window.__flowFoldkitTest?.replacePublicDocument('uncontrolled', document)
  }, fixture.document)

  const response = await page.evaluate(
    ({ transaction }) =>
      window.__flowFoldkitTest?.requestPublicEdit('uncontrolled', transaction),
    { transaction: fixture.transaction }
  )

  const expectedError = Schema.encodeSync(PublicEditContractFixtureSchema)(
    fixture
  ).expected.error

  expect(response).toMatchObject({ error: expectedError })
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
      )
    )
    .toMatchObject({ snapshot: { document: fixture.expected.document } })
})

test('Foldkit reports the fixed invalid-endpoint failure without mutation', async ({
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
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })
  await page.evaluate((document) => {
    window.__flowFoldkitTest?.replacePublicDocument('uncontrolled', document)
  }, fixture.document)

  const response = await page.evaluate(
    ({ transaction }) =>
      window.__flowFoldkitTest?.requestPublicEdit('uncontrolled', transaction),
    { transaction: fixture.transaction }
  )

  const expectedError = Schema.encodeSync(PublicEditContractFixtureSchema)(
    fixture
  ).expected.error

  expect(response).toMatchObject({ error: expectedError })
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
      )
    )
    .toMatchObject({ snapshot: { document: fixture.expected.document } })
})
