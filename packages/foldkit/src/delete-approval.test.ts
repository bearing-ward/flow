import { FlowDeleteCancelled, FlowDocumentSchema } from '@flow/core'
import type { FlowDeleteDecision, FlowDocument } from '@flow/core'
import { Exit, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import * as Application from './application.ts'
import { createFoldkitDeleteClient } from './delete-approval.ts'
import type {
  DeleteApprovalRequested,
  DeleteApprovalResponse,
  DeleteCancellationAck,
  DeleteCancellation,
  DeleteRequest,
  DeleteResult,
} from './delete-approval.ts'
import * as Graph from './graph.ts'

const document = Schema.decodeUnknownSync(FlowDocumentSchema)({
  nodes: [
    { id: 'parent', label: 'Parent', position: { x: 0, y: 0 } },
    {
      id: 'child',
      label: 'Child',
      parentId: 'parent',
      position: { x: 0, y: 0 },
    },
    {
      id: 'protected',
      label: 'Protected',
      parentId: 'parent',
      deletable: false,
      position: { x: 0, y: 0 },
    },
    { id: 'candidate', label: 'Candidate', position: { x: 100, y: 0 } },
    { id: 'independent', label: 'Independent', position: { x: 200, y: 0 } },
  ],
  edges: [{ id: 'candidate-edge', source: 'candidate', target: 'independent' }],
})

const makeModel = (
  current: FlowDocument = document,
  documentMode: 'controlled' | 'uncontrolled' = 'uncontrolled'
): Application.Model => ({
  ...Application.initialModel(current, { x: 0, y: 0, zoom: 1 }),
  graph: Graph.initialModel(
    current,
    { x: 0, y: 0, zoom: 1 },
    [],
    documentMode,
    'uncontrolled'
  ),
})

const request = (
  operationId: string,
  nodeIds: readonly string[] = ['independent'],
  baseRevision = 0
): DeleteRequest => ({
  operationId,
  baseRevision,
  nodeIds: [...nodeIds],
  edgeIds: [],
})

const begin = (model: Application.Model, value: DeleteRequest) =>
  Application.update(
    model,
    Application.AppMessage.DeleteRequest({ request: value })
  )

const approve = (
  model: Application.Model,
  operationId: string,
  baseRevision = 0,
  decision: FlowDeleteDecision = true
) =>
  Application.update(
    model,
    Application.AppMessage.DeleteApprovalResponse({
      response: {
        kind: 'approved',
        operationId,
        baseRevision,
        decision,
      },
    })
  )

describe('Foldkit delete approval reducer', () => {
  test('prepares a candidate, accepts a narrowed decision, and publishes only an owner proposal when controlled', () => {
    const initial = makeModel(document, 'controlled')

    const pending = begin(
      initial,
      request('narrow', ['candidate', 'independent'])
    )

    const pendingApproval = pending.model.pendingDeleteApprovals.at(0)

    if (pendingApproval === undefined) {
      throw new Error('Delete approval was not queued')
    }

    expect(pendingApproval.candidate.nodes).toStrictEqual([
      expect.objectContaining({ id: 'candidate' }),
      expect.objectContaining({ id: 'independent' }),
    ])

    const eligible = pendingApproval.candidate

    const narrowed = approve(pending.model, 'narrow', 0, {
      nodes: eligible.nodes.filter(({ id }) => id === 'candidate'),
      edges: eligible.edges,
    })

    expect({
      acceptedNodeCount: narrowed.model.graph.document.nodes.length,
      acceptedDocumentRevision: narrowed.model.acceptedDocumentRevision,
      pendingApprovalCount: narrowed.model.pendingDeleteApprovals.length,
      commandCount: narrowed.commands?.length,
    }).toStrictEqual({
      acceptedNodeCount: 5,
      acceptedDocumentRevision: 0,
      pendingApprovalCount: 0,
      commandCount: 2,
    })
  })

  test('rejects stale approvals after a concurrent accepted document edit', () => {
    const pending = begin(makeModel(), request('stale'))

    const replacement = Schema.decodeUnknownSync(FlowDocumentSchema)({
      ...document,
      nodes: [
        ...document.nodes,
        { id: 'added', label: 'Added', position: { x: 0, y: 100 } },
      ],
    })

    const changed = Application.update(
      pending.model,
      Application.AppMessage.HostAction({
        action: Application.HostAction.ReplaceDocument({
          document: replacement,
        }),
      })
    )

    expect(changed.model.acceptedDocumentRevision).toBe(1)
    const late = approve(changed.model, 'stale')

    expect(late.model.graph.document.nodes.map(({ id }) => id)).toContain(
      'independent'
    )
    expect(late.model.pendingDeleteApprovals).toHaveLength(0)
    expect(late.commands).toHaveLength(1)
  })

  test('keeps concurrent and reentrant requests isolated and consumes late duplicates once', () => {
    const first = begin(makeModel(), request('first'))
    const reentrant = begin(first.model, request('reentrant'))

    const firstAccepted = approve(reentrant.model, 'first')
    const secondStale = approve(firstAccepted.model, 'reentrant')
    const duplicate = approve(secondStale.model, 'reentrant')

    expect({
      pendingApprovalsBeforeFinalization:
        reentrant.model.pendingDeleteApprovals.length,
      firstDeletionApplied: !firstAccepted.model.graph.document.nodes.some(
        ({ id }) => id === 'independent'
      ),
      pendingApprovalsAfterStaleResponse:
        secondStale.model.pendingDeleteApprovals.length,
      acceptedDocumentRevision: secondStale.model.acceptedDocumentRevision,
      duplicateIgnored:
        duplicate.model === secondStale.model &&
        duplicate.commands === undefined,
    }).toStrictEqual({
      pendingApprovalsBeforeFinalization: 2,
      firstDeletionApplied: true,
      pendingApprovalsAfterStaleResponse: 0,
      acceptedDocumentRevision: 1,
      duplicateIgnored: true,
    })
  })

  test('rejects protected descendants before emitting an approval request', () => {
    const result = begin(makeModel(), request('protected-delete', ['parent']))

    expect(result.model.pendingDeleteApprovals).toHaveLength(0)
    expect(result.commands).toHaveLength(1)
  })
})

interface PortSource<Value> {
  readonly port: {
    readonly subscribe: (listener: (value: Value) => void) => () => void
  }
  readonly publish: (value: Value) => void
}

const source = <Value>(): PortSource<Value> => {
  const listeners = new Set<(value: Value) => void>()

  return {
    port: {
      subscribe: (listener) => {
        listeners.add(listener)

        return () => listeners.delete(listener)
      },
    },
    publish: (value) => {
      for (const listener of listeners) {
        listener(value)
      }
    },
  }
}

describe('Foldkit delete client disposal', () => {
  test('auto-approves an empty candidate without calling the host hook', async () => {
    const approvalRequests = source<DeleteApprovalRequested>()
    const results = source<DeleteResult>()
    const cancellationAcks = source<DeleteCancellationAck>()

    const acceptedStates = source<{
      readonly cause: string
      readonly previous: { readonly document: unknown }
      readonly current: { readonly document: unknown }
    }>()

    const requests: DeleteRequest[] = []
    const responses: DeleteApprovalResponse[] = []
    let beforeDeleteCalls = 0

    const client = createFoldkitDeleteClient(
      {
        ports: {
          deleteRequests: {
            send: (value) => {
              requests.push(value)

              return Exit.void
            },
          },
          deleteCancellations: { send: () => Exit.void },
          deleteApprovalResponses: {
            send: (value) => {
              responses.push(value)

              return Exit.void
            },
          },
          deleteCancellationAcks: cancellationAcks.port,
          deleteApprovalRequests: approvalRequests.port,
          deleteResults: results.port,
          acceptedStates: acceptedStates.port,
        },
        dispose: () => {},
      },
      () => {
        beforeDeleteCalls += 1

        return false
      }
    )

    const pending = client.deleteElements({ nodeIds: [], edgeIds: [] })
    const [sent] = requests

    if (sent === undefined) {
      throw new Error('Delete request was not sent')
    }

    approvalRequests.publish({
      operationId: sent.operationId,
      baseRevision: sent.baseRevision,
      candidate: { nodes: [], edges: [] },
    })

    expect({ beforeDeleteCalls, responses }).toStrictEqual({
      beforeDeleteCalls: 0,
      responses: [
        {
          kind: 'approved',
          operationId: sent.operationId,
          baseRevision: sent.baseRevision,
          decision: true,
        },
      ],
    })

    client.dispose()
    const result = await pending
    expect('error' in result && result.error._tag).toBe('FlowEditDisposed')
  })

  test('cancels through the typed port, settles once, and ignores a late result', async () => {
    const approvalRequests = source<DeleteApprovalRequested>()
    const results = source<DeleteResult>()
    const cancellationAcks = source<DeleteCancellationAck>()

    const acceptedStates = source<{
      readonly cause: string
      readonly previous: { readonly document: unknown }
      readonly current: { readonly document: unknown }
    }>()

    const cancellations: DeleteCancellation[] = []
    const requests: DeleteRequest[] = []
    const decision = Promise.withResolvers<boolean>()
    let callbackSignal: AbortSignal | undefined

    const client = createFoldkitDeleteClient(
      {
        ports: {
          deleteRequests: {
            send: (value) => {
              requests.push(value)

              return Exit.void
            },
          },
          deleteCancellations: {
            send: (value) => {
              cancellations.push(value)

              return Exit.void
            },
          },
          deleteApprovalResponses: { send: () => Exit.void },
          deleteCancellationAcks: cancellationAcks.port,
          deleteApprovalRequests: approvalRequests.port,
          deleteResults: results.port,
          acceptedStates: acceptedStates.port,
        },
        dispose: () => {},
      },
      (_request, context) => {
        callbackSignal = context.signal

        return decision.promise
      }
    )

    const controller = new AbortController()
    let settlementCount = 0

    const pending = client
      .deleteElements(
        { nodeIds: ['candidate'], edgeIds: [] },
        {
          signal: controller.signal,
        }
      )
      .then((result) => {
        settlementCount += 1

        return result
      })

    const [deleteRequest] = requests

    if (deleteRequest === undefined) {
      throw new Error('Delete request was not sent')
    }

    const candidateNode = document.nodes.find(({ id }) => id === 'candidate')

    if (candidateNode === undefined) {
      throw new Error('Delete candidate was not present')
    }

    approvalRequests.publish({
      operationId: deleteRequest.operationId,
      baseRevision: deleteRequest.baseRevision,
      candidate: { nodes: [candidateNode], edges: [] },
    })
    await Promise.resolve()
    controller.abort()
    const [cancellation] = cancellations

    if (cancellation === undefined) {
      throw new Error('Cancellation was not sent')
    }

    cancellationAcks.publish({ ...cancellation, outcome: 'cancelled' })
    const result = await pending
    results.publish({
      operationId: deleteRequest.operationId,
      error: new FlowDeleteCancelled({
        operationId: deleteRequest.operationId,
      }),
    })

    expect({
      resultTag: 'error' in result ? result.error._tag : 'success',
      cancellation: cancellations[0],
      callbackAborted: callbackSignal?.aborted,
      settlementCount,
    }).toStrictEqual({
      resultTag: 'FlowDeleteCancelled',
      cancellation: {
        operationId: deleteRequest.operationId,
        baseRevision: 0,
        reason: 'cancelled',
      },
      callbackAborted: true,
      settlementCount: 1,
    })
    decision.resolve(true)
    client.dispose()
  })

  test('times out unanswered approvals and bounds pending requests', async () => {
    const approvalRequests = source<DeleteApprovalRequested>()
    const results = source<DeleteResult>()
    const cancellationAcks = source<DeleteCancellationAck>()

    const acceptedStates = source<{
      readonly cause: string
      readonly previous: { readonly document: unknown }
      readonly current: { readonly document: unknown }
    }>()

    const cancellations: DeleteCancellation[] = []
    const requests: DeleteRequest[] = []

    const client = createFoldkitDeleteClient(
      {
        ports: {
          deleteRequests: {
            send: (value) => {
              requests.push(value)

              return Exit.void
            },
          },
          deleteCancellations: {
            send: (value) => {
              cancellations.push(value)
              cancellationAcks.publish({ ...value, outcome: 'cancelled' })

              return Exit.void
            },
          },
          deleteApprovalResponses: { send: () => Exit.void },
          deleteCancellationAcks: cancellationAcks.port,
          deleteApprovalRequests: approvalRequests.port,
          deleteResults: results.port,
          acceptedStates: acceptedStates.port,
        },
        dispose: () => {},
      },
      () => Promise.withResolvers<boolean>().promise,
      { approvalTimeoutMs: 1, maxPending: 1 }
    )

    const unanswered = client.deleteElements({
      nodeIds: ['candidate'],
      edgeIds: [],
    })

    const overflow = await client.deleteElements({
      nodeIds: ['independent'],
      edgeIds: [],
    })

    const timeoutResult = await unanswered

    expect({
      requestsSent: requests.length,
      overflowTag: 'error' in overflow ? overflow.error._tag : 'success',
      timeoutTag:
        'error' in timeoutResult ? timeoutResult.error._tag : 'success',
      cancellationReason: cancellations[0]?.reason,
    }).toStrictEqual({
      requestsSent: 1,
      overflowTag: 'FlowDeleteInProgress',
      timeoutTag: 'FlowDeleteApprovalFailed',
      cancellationReason: 'timed-out',
    })
    client.dispose()
  })

  test('settles exactly once and ignores a callback that resolves after disposal', async () => {
    const approvalRequests = source<DeleteApprovalRequested>()
    const results = source<DeleteResult>()
    const cancellationAcks = source<DeleteCancellationAck>()

    const cancellations: DeleteCancellation[] = []

    const acceptedStates = source<{
      readonly cause: string
      readonly previous: { readonly document: unknown }
      readonly current: { readonly document: unknown }
    }>()

    const deleteRequests: DeleteRequest[] = []
    const responses: DeleteApprovalResponse[] = []
    let runtimeDisposals = 0
    const decision = Promise.withResolvers<boolean>()

    const client = createFoldkitDeleteClient(
      {
        ports: {
          deleteRequests: {
            send: (value) => {
              deleteRequests.push(value)

              return Exit.void
            },
          },
          deleteCancellations: {
            send: (value) => {
              cancellations.push(value)

              return Exit.void
            },
          },
          deleteApprovalResponses: {
            send: (value) => {
              responses.push(value)

              return Exit.void
            },
          },
          deleteCancellationAcks: cancellationAcks.port,
          deleteApprovalRequests: approvalRequests.port,
          deleteResults: results.port,
          acceptedStates: acceptedStates.port,
        },
        dispose: () => {
          runtimeDisposals += 1
        },
      },
      () => decision.promise
    )

    let settlements = 0

    const pending = client
      .deleteElements({ nodeIds: ['independent'], edgeIds: [] })
      .then((result) => {
        settlements += 1

        return result
      })

    const [sent] = deleteRequests

    expect(sent).toBeDefined()

    if (sent === undefined) {
      throw new Error('Delete request was not sent')
    }

    const candidateNode = document.nodes.at(3)

    if (candidateNode === undefined) {
      throw new Error('Test candidate node was not present')
    }

    approvalRequests.publish({
      operationId: sent.operationId,
      baseRevision: sent.baseRevision,
      candidate: { nodes: [candidateNode], edges: [] },
    })
    await Promise.resolve()

    client.dispose()
    client.dispose()
    const result = await pending
    decision.resolve(true)
    await Promise.resolve()

    expect('error' in result).toBeTruthy()
    expect('error' in result && result.error._tag).toBe('FlowEditDisposed')
    expect(settlements).toBe(1)
    expect({ runtimeDisposals, responses }).toStrictEqual({
      runtimeDisposals: 1,
      responses: [],
    })
  })

  test('advances the client revision only when accepted document content changes', async () => {
    const approvalRequests = source<DeleteApprovalRequested>()
    const results = source<DeleteResult>()
    const cancellationAcks = source<DeleteCancellationAck>()

    const cancellations: DeleteCancellation[] = []

    const acceptedStates = source<{
      readonly cause: string
      readonly previous: { readonly document: unknown }
      readonly current: { readonly document: unknown }
    }>()

    const deleteRequests: DeleteRequest[] = []

    const client = createFoldkitDeleteClient(
      {
        ports: {
          deleteRequests: {
            send: (value) => {
              deleteRequests.push(value)

              return Exit.void
            },
          },
          deleteCancellations: {
            send: (value) => {
              cancellations.push(value)

              return Exit.void
            },
          },
          deleteApprovalResponses: { send: () => Exit.void },
          deleteCancellationAcks: cancellationAcks.port,
          deleteApprovalRequests: approvalRequests.port,
          deleteResults: results.port,
          acceptedStates: acceptedStates.port,
        },
        dispose: () => {},
      },
      () => true
    )

    const pending = [
      client.deleteElements({ nodeIds: ['candidate'], edgeIds: [] }),
    ]

    const unchangedDocument = { nodes: document.nodes, edges: document.edges }
    acceptedStates.publish({
      cause: 'semantic-change',
      previous: { document: unchangedDocument },
      current: { document: unchangedDocument },
    })
    pending.push(client.deleteElements({ nodeIds: ['candidate'], edgeIds: [] }))
    acceptedStates.publish({
      cause: 'document-update',
      previous: { document: unchangedDocument },
      current: {
        document: {
          nodes: [
            ...document.nodes,
            { id: 'new', label: 'New', position: { x: 0, y: 0 } },
          ],
          edges: document.edges,
        },
      },
    })
    pending.push(client.deleteElements({ nodeIds: ['candidate'], edgeIds: [] }))

    expect(
      deleteRequests.map(({ baseRevision }) => baseRevision)
    ).toStrictEqual([0, 0, 1])
    client.dispose()
    const settled = await Promise.all(pending)
    expect(settled).toHaveLength(3)
    expect(settled.every((result) => 'error' in result)).toBeTruthy()
  })
})
