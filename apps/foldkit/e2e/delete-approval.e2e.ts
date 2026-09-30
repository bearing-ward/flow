import type { DeleteApprovalResponseSchema } from '@flow/foldkit'
import { expect, test } from '@playwright/test'

import {
  apiUtilityDeletionCallbackReference,
  apiUtilityDeletionReference,
} from '../../shared-e2e/api-utility-reference.ts'
import type { ApiUtilityDeletionEvent } from '../../shared-e2e/api-utility-reference.ts'

declare global {
  interface Window {
    deleteHookCalls?: string[]
  }
}

type DeleteApprovalResponse = typeof DeleteApprovalResponseSchema.Encoded

const normalizeHostDeleteId = (id: string) => {
  if (id === 'candidate') {
    return 'b'
  }

  if (id === 'candidate-edge') {
    return 'ab'
  }

  return id
}

test('Foldkit delete approval uses typed Runtime ports with revision and one-shot settlement', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/delete-approval-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitDeleteHarness?.start()
  })
  expect(
    await page.evaluate(() => window.__flowFoldkitDeleteHarness?.diagnostics())
  ).toEqual(['runtime-embedded', 'ports-ready'])

  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.probeHostAction()
  )

  const baseline = await page.evaluate(() => {
    const harness = window.__flowFoldkitDeleteHarness

    if (harness === undefined) {
      throw new Error('Delete harness did not start')
    }

    const { promise: timeout, resolve } = Promise.withResolvers<{
      readonly timedOut: true
      readonly diagnostics: readonly string[]
    }>()

    setTimeout(() => {
      resolve({ timedOut: true, diagnostics: harness.diagnostics() })
    }, 1200)

    return Promise.race([harness.snapshot('baseline-snapshot'), timeout])
  })

  if ('timedOut' in baseline) {
    throw new Error(`Snapshot port timeout: ${baseline.diagnostics.join(', ')}`)
  }

  expect(baseline.snapshot.document.nodes).toHaveLength(5)
  expect(baseline.snapshot.viewport).toEqual({ x: 12, y: 34, zoom: 1 })

  const startDelete = (
    operationId: string,
    baseRevision: number,
    nodeIds: string[]
  ) =>
    page.evaluate(
      (request) =>
        window.__flowFoldkitDeleteHarness?.startDelete({
          operationId: request.operationId,
          baseRevision: request.baseRevision,
          nodeIds: request.nodeIds,
          edgeIds: [],
        }),
      { operationId, baseRevision, nodeIds }
    )

  const waitResult = (operationId: string) =>
    page.evaluate(
      (id) => window.__flowFoldkitDeleteHarness?.waitResult(id),
      operationId
    )

  const waitApproval = (operationId: string) =>
    page.evaluate(async (id) => {
      const harness = window.__flowFoldkitDeleteHarness

      if (harness === undefined) {
        throw new Error('Delete harness did not start')
      }

      const { promise: timeout, resolve } = Promise.withResolvers<{
        readonly timedOut: true
        readonly diagnostics: readonly string[]
      }>()

      setTimeout(() => {
        resolve({ timedOut: true, diagnostics: harness.diagnostics() })
      }, 1500)

      const request = await Promise.race([harness.waitApproval(id), timeout])

      if ('timedOut' in request) {
        throw new Error(
          `Approval port timeout: ${request.diagnostics.join(', ')}`
        )
      }

      return request
    }, operationId)

  const respond = (response: DeleteApprovalResponse) =>
    page.evaluate(
      (value) => window.__flowFoldkitDeleteHarness?.respond(value),
      response
    )

  await startDelete('delete-narrow', 0, ['candidate', 'independent'])
  const approval = await waitApproval('delete-narrow')

  expect(approval).toMatchObject({
    operationId: 'delete-narrow',
    baseRevision: 0,
    candidate: {
      nodes: [
        expect.objectContaining({ id: 'candidate' }),
        expect.objectContaining({ id: 'independent' }),
      ],
      edges: [expect.objectContaining({ id: 'candidate-edge' })],
    },
  })

  if (approval === undefined) {
    throw new Error('Approval request was not returned')
  }

  const candidateNode = approval.candidate.nodes.find(
    (node) => node.id === 'candidate'
  )

  const candidateEdge = approval.candidate.edges.at(0)

  if (candidateNode === undefined || candidateEdge === undefined) {
    throw new Error('Expected candidate node and edge were not returned')
  }

  await respond({
    kind: 'approved',
    operationId: 'delete-narrow',
    baseRevision: 0,
    decision: {
      nodes: [candidateNode],
      edges: [candidateEdge],
    },
  })

  const firstResult = await waitResult('delete-narrow')
  expect(firstResult).toMatchObject({
    operationId: 'delete-narrow',
    result: {
      deletion: {
        deletedNodeIds: ['candidate'],
        deletedEdgeIds: ['candidate-edge'],
      },
    },
  })

  await startDelete('delete-protected-parent', 1, ['parent'])
  const protectedResult = await waitResult('delete-protected-parent')

  if (protectedResult === undefined) {
    throw new Error('Protected deletion did not return a result')
  }

  if ('result' in protectedResult) {
    throw new Error('Protected deletion unexpectedly succeeded')
  }

  expect(protectedResult.error._tag).toBe('ProtectedDeletionConflict')

  expect(protectedResult.error).toHaveProperty('nodeIds', ['protected'])

  await startDelete('delete-stale', 1, ['independent'])
  await waitApproval('delete-stale')

  const concurrentEdit = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.edit('concurrent-add')
  )

  expect(concurrentEdit).toHaveProperty('result')
  await respond({
    kind: 'approved',
    operationId: 'delete-stale',
    baseRevision: 1,
    decision: true,
  })
  const staleResult = await waitResult('delete-stale')

  if (staleResult === undefined) {
    throw new Error('Stale deletion did not return a result')
  }

  if ('result' in staleResult) {
    throw new Error('Stale deletion unexpectedly succeeded')
  }

  expect(staleResult.error._tag).toBe('FlowDeleteRevisionConflict')
  expect(staleResult.error).toHaveProperty('expectedRevision', 1)
  expect(staleResult.error).toHaveProperty('actualRevision', 2)

  await startDelete('reentrant-first', 2, ['independent'])
  await waitApproval('reentrant-first')
  await startDelete('reentrant-second', 2, ['added-concurrent-add'])
  await waitApproval('reentrant-second')

  await respond({
    kind: 'approved',
    operationId: 'reentrant-first',
    baseRevision: 2,
    decision: true,
  })
  expect(await waitResult('reentrant-first')).toHaveProperty('result')
  await respond({
    kind: 'approved',
    operationId: 'reentrant-second',
    baseRevision: 2,
    decision: true,
  })
  const reentrantResult = await waitResult('reentrant-second')

  if (reentrantResult === undefined) {
    throw new Error('Reentrant deletion did not return a result')
  }

  if ('result' in reentrantResult) {
    throw new Error('Reentrant stale deletion unexpectedly succeeded')
  }

  expect(reentrantResult.error._tag).toBe('FlowDeleteRevisionConflict')
  expect(reentrantResult.error).toHaveProperty('actualRevision', 3)

  const resultCount = await page.evaluate(
    () => window.__flowFoldkitDeleteHarness?.resultEvents().length
  )

  await respond({
    kind: 'approved',
    operationId: 'reentrant-second',
    baseRevision: 2,
    decision: true,
  })
  await page.waitForTimeout(20)
  expect(
    await page.evaluate(
      () => window.__flowFoldkitDeleteHarness?.resultEvents().length
    )
  ).toBe(resultCount)

  const snapshot = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.snapshot('delete-final-state')
  )

  expect(snapshot?.snapshot.document.nodes.map(({ id }) => id)).toEqual([
    'parent',
    'child',
    'protected',
    'added-concurrent-add',
  ])

  const changes = await page.evaluate(
    () => window.__flowFoldkitDeleteHarness?.changes() ?? []
  )

  expect(changes).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: 'edit-proposal' })])
  )

  const acceptedStates = await page.evaluate(
    () => window.__flowFoldkitDeleteHarness?.acceptedStates() ?? []
  )

  expect(acceptedStates.length).toBeGreaterThan(0)

  await page.evaluate(() => window.__flowFoldkitDeleteHarness?.dispose())
})

test('Foldkit async deletion matches the pinned fixture request, candidate, and approval lifecycle', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/delete-approval-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitDeleteHarness?.start()
    window.__flowFoldkitDeleteHarness?.startPublicDelete('reference')
  })

  await page.waitForFunction(() =>
    window.__flowFoldkitDeleteHarness
      ?.referenceDeleteEvents()
      .some((event) => event.type === 'before:start')
  )

  const request = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.referenceDeleteRequest()
  )

  const pendingEvents = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.referenceDeleteEvents()
  )

  expect({
    nodes: request?.nodeIds.map(normalizeHostDeleteId),
    edges: request?.edgeIds.map(normalizeHostDeleteId),
  }).toEqual(apiUtilityDeletionReference.requested)

  const candidate = pendingEvents?.find(
    (event) => event.type === 'before:start'
  )

  if (candidate === undefined || candidate.type !== 'before:start') {
    throw new Error('Pinned candidate observation was not recorded')
  }

  expect({
    nodes: candidate.nodes.map(normalizeHostDeleteId),
    edges: candidate.edges.map(normalizeHostDeleteId),
  }).toEqual({ nodes: ['b'], edges: ['ab'] })
  expect(pendingEvents).toHaveLength(1)

  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.resolveReferenceApproval()
  )

  const result = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.awaitPublicDelete()
  )

  if (result === undefined || !('result' in result)) {
    throw new Error('Foldkit reference deletion did not commit')
  }

  expect({
    nodes: result.result.deletion.deletedNodeIds.map(normalizeHostDeleteId),
    edges: result.result.deletion.deletedEdgeIds.map(normalizeHostDeleteId),
  }).toEqual(apiUtilityDeletionReference.result)

  const observedEvents = await page.evaluate(
    () => window.__flowFoldkitDeleteHarness?.referenceDeleteEvents() ?? []
  )

  const normalizedEvents: ApiUtilityDeletionEvent[] = observedEvents.map(
    (event) => {
      if (event.type === 'before:start') {
        return {
          ...event,
          nodes: event.nodes.map(normalizeHostDeleteId),
          edges: event.edges.map(normalizeHostDeleteId),
        }
      }

      if (event.type === 'before:resolved') {
        return event
      }

      if (event.type === 'edges' || event.type === 'nodes') {
        return {
          ...event,
          ids: event.ids.map(normalizeHostDeleteId),
        }
      }

      if (event.type === 'delete') {
        return {
          ...event,
          nodes: event.nodes.map(normalizeHostDeleteId),
          edges: event.edges.map(normalizeHostDeleteId),
        }
      }

      return event
    }
  )

  expect(normalizedEvents).toEqual(apiUtilityDeletionReference.events)

  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.disposePublicDelete()
  )
})

test('Foldkit delete reports the committed result when approval beats cancellation', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/delete-approval-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitDeleteHarness?.start()
  })

  const result = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.approvalWinsCancellationRace()
  )

  expect(result).toMatchObject({
    operationId: 'foldkit-delete-1',
    result: {
      deletion: {
        deletedNodeIds: ['candidate'],
        deletedEdgeIds: ['candidate-edge'],
      },
    },
  })

  const snapshot = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.snapshot('race-final-state')
  )

  expect(snapshot?.snapshot.document.nodes.map(({ id }) => id)).not.toContain(
    'candidate'
  )
  expect(
    await page.evaluate(
      () => window.__flowFoldkitDeleteHarness?.diagnostics() ?? []
    )
  ).toContain('race-approval-sent:foldkit-delete-1')

  await page.evaluate(() => window.__flowFoldkitDeleteHarness?.dispose())
})

test('public Foldkit approval callback proposes deletion until the owner acknowledges it', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/delete-approval-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitDeleteHarness?.start('controlled')
    window.__flowFoldkitDeleteHarness?.startPublicDelete('approve')
  })

  const proposed = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.awaitPublicDelete()
  )

  if (proposed === undefined || !('result' in proposed)) {
    throw new Error('Expected a deletion proposal')
  }

  expect(proposed).toHaveProperty('result.deletion.deletedNodeIds', [
    'candidate',
  ])
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitDeleteHarness?.publicDeleteEvents()
    )
  ).toEqual([
    { kind: 'edges', ids: ['candidate-edge'] },
    { kind: 'nodes', ids: ['candidate'] },
    {
      kind: 'delete',
      nodeIds: ['candidate'],
      edgeIds: ['candidate-edge'],
    },
  ])

  const publicEvents = await page.evaluate(
    () => window.__flowFoldkitDeleteHarness?.publicDeleteEvents() ?? []
  )

  expect({
    result: {
      nodes: proposed.result.deletion.deletedNodeIds.map(normalizeHostDeleteId),
      edges: proposed.result.deletion.deletedEdgeIds.map(normalizeHostDeleteId),
    },
    callbackPayloads: publicEvents
      .filter(
        (event) =>
          event.kind === 'edges' ||
          event.kind === 'nodes' ||
          event.kind === 'delete'
      )
      .map((event) =>
        event.kind === 'delete'
          ? {
              type: 'delete',
              nodes: event.nodeIds.map(normalizeHostDeleteId),
              edges: event.edgeIds.map(normalizeHostDeleteId),
            }
          : {
              type: event.kind,
              ids: event.ids.map(normalizeHostDeleteId),
            }
      ),
  }).toEqual({
    result: apiUtilityDeletionReference.result,
    callbackPayloads: apiUtilityDeletionCallbackReference,
  })

  const beforeAcknowledgement = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.snapshot('before-owner-ack')
  )

  expect(
    beforeAcknowledgement?.snapshot.document.nodes.map(({ id }) => id)
  ).toContain('candidate')

  await page.evaluate(
    (document) =>
      window.__flowFoldkitDeleteHarness?.acceptPublicProposal(document),
    proposed.result.document
  )

  const afterAcknowledgement = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.snapshot('after-owner-ack')
  )

  expect(
    afterAcknowledgement?.snapshot.document.nodes.map(({ id }) => id)
  ).not.toContain('candidate')

  const diagnostics = await page.evaluate(
    () => window.__flowFoldkitDeleteHarness?.diagnostics() ?? []
  )

  expect(diagnostics).toContain('public-hook:foldkit-delete-1')
  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.disposePublicDelete()
  )
})

test('public Foldkit approval denial and cancellation return typed errors', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/delete-approval-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitDeleteHarness?.start()
    window.__flowFoldkitDeleteHarness?.startPublicDelete('deny')
  })

  const denied = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.awaitPublicDelete()
  )

  expect(denied).toHaveProperty('error._tag', 'FlowDeleteCancelled')

  const afterDenial = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.snapshot('after-denial')
  )

  expect(afterDenial?.snapshot.document.nodes.map(({ id }) => id)).toContain(
    'candidate'
  )

  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.startPublicDelete('pending')
  )
  await page.waitForFunction(() =>
    window.__flowFoldkitDeleteHarness
      ?.diagnostics()
      .includes('public-hook:foldkit-delete-2')
  )
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitDeleteHarness?.cancelPublicDelete()
    )
  ).toBe(true)

  const cancelled = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.awaitPublicDelete()
  )

  expect(cancelled).toHaveProperty('error._tag', 'FlowDeleteCancelled')

  const afterCancellation = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.snapshot('after-cancellation')
  )

  expect(
    afterCancellation?.snapshot.document.nodes.map(({ id }) => id)
  ).toContain('candidate')

  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.startPublicDelete('throw')
  )

  const failed = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.awaitPublicDelete()
  )

  expect(failed).toHaveProperty('error._tag', 'FlowDeleteApprovalFailed')
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitDeleteHarness?.publicDeleteEvents()
    )
  ).toEqual([])
  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.disposePublicDelete()
  )
})

test('Foldkit deletion callbacks use the accepted narrowed candidate', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/delete-approval-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitDeleteHarness?.start()
    window.__flowFoldkitDeleteHarness?.startPublicDelete('narrow-edge')
  })

  const proposal = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.awaitPublicDelete()
  )

  expect(proposal).toHaveProperty('result.deletion.deletedNodeIds', [])
  expect(proposal).toHaveProperty('result.deletion.deletedEdgeIds', [
    'candidate-edge',
  ])
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitDeleteHarness?.publicDeleteEvents()
    )
  ).toEqual([
    { kind: 'edges', ids: ['candidate-edge'] },
    { kind: 'delete', nodeIds: [], edgeIds: ['candidate-edge'] },
  ])

  const snapshot = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.snapshot('narrow-edge-state')
  )

  expect(snapshot?.snapshot.document.nodes.map(({ id }) => id)).toContain(
    'candidate'
  )
  expect(snapshot?.snapshot.document.edges.map(({ id }) => id)).not.toContain(
    'candidate-edge'
  )
  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.disposePublicDelete()
  )
})

test('public Foldkit client settles an empty deletion without callbacks', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/delete-approval-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitDeleteHarness?.start()
  })

  const result = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.publicEmptyDelete()
  )

  expect(result).toHaveProperty('result.result.deletion.deletedNodeIds', [])
  expect(result).toHaveProperty('result.result.deletion.deletedEdgeIds', [])
  expect(result?.beforeDeleteCalls).toBe(0)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitDeleteHarness?.publicDeleteEvents()
    )
  ).toEqual([])
  await page.evaluate(() => window.__flowFoldkitDeleteHarness?.dispose())
})

test('controlled Foldkit deletion remains a proposal when the owner rejects it', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/delete-approval-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitDeleteHarness?.start('controlled')
  })

  const before = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.snapshot('before-owner-rejection')
  )

  const acceptedStateCount = await page.evaluate(
    () => window.__flowFoldkitDeleteHarness?.acceptedStates().length
  )

  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.startPublicDelete('approve')
  )

  const proposal = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.awaitPublicDelete()
  )

  expect(proposal).toHaveProperty('result.deletion.deletedNodeIds', [
    'candidate',
  ])

  const after = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.snapshot('after-owner-rejection')
  )

  expect(after?.snapshot.document).toEqual(before?.snapshot.document)

  expect(
    await page.evaluate(
      () => window.__flowFoldkitDeleteHarness?.acceptedStates().length
    )
  ).toBe(acceptedStateCount)
  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.disposePublicDelete()
  )
})

test('public Foldkit callbacks can start a nested deletion and settle both exactly once', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/delete-approval-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitDeleteHarness?.start()
  })

  const results = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.publicReentrantDelete()
  )

  expect(results).toHaveProperty('outer.result.deletion.deletedNodeIds', [
    'candidate',
  ])
  expect(results).toHaveProperty('nested.result.deletion.deletedNodeIds', [
    'independent',
  ])
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitDeleteHarness?.publicDeleteEvents()
    )
  ).toEqual([
    { kind: 'edges', ids: ['candidate-edge'] },
    { kind: 'nodes', ids: ['candidate'] },
    { kind: 'delete', nodeIds: ['candidate'], edgeIds: ['candidate-edge'] },
    { kind: 'nodes', ids: ['independent'] },
    { kind: 'delete', nodeIds: ['independent'], edgeIds: [] },
  ])
  await page.evaluate(() => window.__flowFoldkitDeleteHarness?.dispose())
})

test('public Foldkit client disposal settles pending approval with a typed error', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/delete-approval-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitDeleteHarness?.start()
    window.__flowFoldkitDeleteHarness?.startPublicDelete('pending')
  })
  await page.waitForFunction(() =>
    window.__flowFoldkitDeleteHarness
      ?.diagnostics()
      .includes('public-hook:foldkit-delete-1')
  )
  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.disposePublicDelete()
  )

  const disposed = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.awaitPublicDelete()
  )

  expect(disposed).toHaveProperty('error._tag', 'FlowEditDisposed')
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitDeleteHarness?.publicDeleteEvents()
    )
  ).toEqual([])
})

test('Foldkit lifecycle callback failures are reported without losing proposal settlement', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/delete-approval-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitDeleteHarness?.start('controlled')
    window.__flowFoldkitDeleteHarness?.startPublicDelete('callback-throw')
  })

  const proposal = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.awaitPublicDelete()
  )

  expect(proposal).toHaveProperty('result.deletion.deletedNodeIds', [
    'candidate',
  ])
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitDeleteHarness?.publicDeleteEvents()
    )
  ).toEqual([
    { kind: 'edges', ids: ['candidate-edge'] },
    { kind: 'nodes', ids: ['candidate'] },
    {
      kind: 'delete',
      nodeIds: ['candidate'],
      edgeIds: ['candidate-edge'],
    },
    { kind: 'callback-error', callback: 'onEdgesDelete' },
  ])

  const stateBeforeOwnerAcknowledgement = await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.snapshot('callback-throw-proposal')
  )

  expect(
    stateBeforeOwnerAcknowledgement?.snapshot.document.nodes.map(({ id }) => id)
  ).toContain('candidate')
  await page.evaluate(() =>
    window.__flowFoldkitDeleteHarness?.disposePublicDelete()
  )
})

test('Foldkit playground uses the configured host approval callback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.flowFoldkitOptions = {
      beforeDelete: (request) => {
        let calls = window.deleteHookCalls

        if (calls === undefined) {
          calls = []
          window.deleteHookCalls = calls
        }

        calls.push(request.operationId)

        return false
      },
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add node' }).click()
  await page.getByRole('button', { name: 'Remove added node' }).click()

  await expect(
    page.locator('.flow-state-tools output:not([data-measurement])')
  ).toHaveText('FlowDeleteCancelled')
  expect(await page.evaluate(() => window.deleteHookCalls)).toEqual([
    'foldkit-delete-1',
  ])
})
