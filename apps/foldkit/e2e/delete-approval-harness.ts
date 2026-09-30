import {
  FlowDocumentSchema,
  FlowEditDisposedSchema,
  NodeIdSchema,
} from '@flow/core'
import {
  HostAction,
  createProgram,
  createFoldkitDeleteClient,
} from '@flow/foldkit'
import type {
  SnapshotResponseSchema,
  DeleteApprovalRequestedSchema,
  DeleteApprovalResponseSchema,
  DeleteRequestSchema,
  DeleteResultSchema,
  EditResponse,
  FoldkitDeleteClient,
  ports,
} from '@flow/foldkit'
import { Exit, Schema } from 'effect'
import { Runtime } from 'foldkit'

interface DeleteHarness {
  readonly start: (
    documentMode?: 'controlled' | 'uncontrolled'
  ) => Promise<void>
  readonly startDelete: (request: typeof DeleteRequestSchema.Encoded) => void
  readonly waitResult: (
    operationId: string
  ) => Promise<typeof DeleteResultSchema.Encoded>
  readonly waitApproval: (
    operationId: string
  ) => Promise<typeof DeleteApprovalRequestedSchema.Encoded>
  readonly respond: (
    response: typeof DeleteApprovalResponseSchema.Encoded
  ) => void
  readonly edit: (requestId: string) => Promise<EditResponse>
  readonly snapshot: (
    requestId: string
  ) => Promise<typeof SnapshotResponseSchema.Encoded>
  readonly probeHostAction: () => void
  readonly approvalWinsCancellationRace: () => Promise<
    typeof DeleteResultSchema.Encoded
  >
  readonly dispose: () => void
  readonly resultEvents: () => readonly ApprovalResult[]
  readonly diagnostics: () => readonly string[]
  readonly changes: () => readonly unknown[]
  readonly acceptedStates: () => readonly unknown[]
  readonly startPublicDelete: (
    decision:
      | 'approve'
      | 'deny'
      | 'pending'
      | 'throw'
      | 'callback-throw'
      | 'narrow-edge'
      | 'reference'
  ) => void
  readonly resolveReferenceApproval: () => void
  readonly awaitPublicDelete: () => Promise<ApprovalResult>
  readonly cancelPublicDelete: () => boolean
  readonly acceptPublicProposal: (
    document: typeof FlowDocumentSchema.Encoded
  ) => void
  readonly disposePublicDelete: () => void
  readonly publicDeleteEvents: () => readonly PublicDeleteEvent[]
  readonly referenceDeleteRequest: () => {
    readonly nodeIds: readonly string[]
    readonly edgeIds: readonly string[]
  }
  readonly referenceDeleteEvents: () => readonly ReferenceDeleteEvent[]
  readonly publicEmptyDelete: () => Promise<{
    readonly result: ApprovalResult
    readonly beforeDeleteCalls: number
  }>
  readonly publicReentrantDelete: () => Promise<{
    readonly outer: ApprovalResult
    readonly nested: ApprovalResult
  }>
}

declare global {
  interface Window {
    __flowFoldkitDeleteHarness?: DeleteHarness
  }
}

let active: Runtime.EmbedHandle<typeof ports> | undefined

let raceClient: FoldkitDeleteClient | undefined

let publicClient: FoldkitDeleteClient | undefined

let publicDeleteResult: Promise<ApprovalResult> | undefined

let publicDecision:
  | 'approve'
  | 'deny'
  | 'pending'
  | 'throw'
  | 'callback-throw'
  | 'narrow-edge'
  | 'reference' = 'deny'

let publicOperationNumber = 0

type ApprovalRequest = typeof DeleteApprovalRequestedSchema.Encoded

type ApprovalResult = typeof DeleteResultSchema.Encoded

type ReferenceRequestIds = Pick<
  typeof DeleteRequestSchema.Encoded,
  'nodeIds' | 'edgeIds'
>

type PublicDeleteEvent =
  | { readonly kind: 'edges'; readonly ids: readonly string[] }
  | { readonly kind: 'nodes'; readonly ids: readonly string[] }
  | {
      readonly kind: 'delete'
      readonly nodeIds: readonly string[]
      readonly edgeIds: readonly string[]
    }
  | {
      readonly kind: 'callback-error'
      readonly callback: 'onEdgesDelete' | 'onNodesDelete' | 'onDelete'
    }

type ReferenceDeleteEvent =
  | {
      readonly type: 'before:start'
      readonly nodes: readonly string[]
      readonly edges: readonly string[]
    }
  | { readonly type: 'before:resolved' }
  | {
      readonly type: 'edges' | 'nodes'
      readonly beforeCompleted: boolean
      readonly ids: readonly string[]
    }
  | {
      readonly type: 'delete'
      readonly beforeCompleted: boolean
      readonly nodes: readonly string[]
      readonly edges: readonly string[]
    }

const publicDeleteEvents: PublicDeleteEvent[] = []

const referenceDeleteEvents: ReferenceDeleteEvent[] = []

let referenceApprovalResolver: (() => void) | undefined

let referenceApprovalCompleted = false

let referenceRequestIds: ReferenceRequestIds = {
  nodeIds: ['candidate'],
  edgeIds: [],
}

const approvals = new Map<string, ApprovalRequest>()

const approvalWaiters = new Map<string, (request: ApprovalRequest) => void>()

const resultEvents: ApprovalResult[] = []

const resultWaiters = new Map<string, (result: ApprovalResult) => void>()

const resultPromises = new Map<string, Promise<ApprovalResult>>()

const arrivedResults = new Map<string, ApprovalResult>()

const editWaiters = new Map<string, (response: EditResponse) => void>()

const snapshotWaiters = new Map<
  string,
  (response: typeof SnapshotResponseSchema.Encoded) => void
>()

const changes: unknown[] = []

const acceptedStates: unknown[] = []

const diagnostics: string[] = []

const waitNextFrame = () => {
  const { promise, resolve } = Promise.withResolvers<null>()

  requestAnimationFrame(() => resolve(null))

  return promise
}

const harness: DeleteHarness = {
  start: async (documentMode = 'uncontrolled') => {
    window.addEventListener('error', (event) => {
      diagnostics.push(`window-error:${event.message}`)
    })
    window.addEventListener('unhandledrejection', (event) => {
      diagnostics.push(`unhandled-rejection:${String(event.reason)}`)
    })
    const container = document.querySelector<HTMLElement>('#app')

    if (container === null) {
      throw new Error('Missing Foldkit delete test host')
    }

    container.replaceChildren()

    const flowDocument = Schema.decodeUnknownSync(FlowDocumentSchema)({
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
      edges: [
        { id: 'candidate-edge', source: 'candidate', target: 'independent' },
      ],
    })

    active = Runtime.embed<typeof ports, never, 'Element'>(
      createProgram(
        container,
        flowDocument,
        { x: 0, y: 0, zoom: 1 },
        [],
        documentMode
      )
    )
    diagnostics.push('runtime-embedded')
    active.ports.deleteApprovalRequests.subscribe(
      (request: ApprovalRequest) => {
        diagnostics.push(`approval:${request.operationId}`)
        const resolve = approvalWaiters.get(request.operationId)

        if (resolve) {
          approvalWaiters.delete(request.operationId)
          resolve(request)
        } else {
          approvals.set(request.operationId, request)
        }
      }
    )
    active.ports.deleteResults.subscribe((result: ApprovalResult) => {
      diagnostics.push(
        `result:${result.operationId}:${'error' in result ? result.error._tag : 'success'}`
      )
      resultEvents.push(result)
      const resolve = resultWaiters.get(result.operationId)

      if (resolve) {
        resultWaiters.delete(result.operationId)
        resolve(result)
      } else {
        arrivedResults.set(result.operationId, result)
      }
    })
    active.ports.editResults.subscribe((response) => {
      const resolve = editWaiters.get(response.requestId)

      if (resolve !== undefined) {
        editWaiters.delete(response.requestId)
        resolve(response)
      }
    })
    active.ports.snapshots.subscribe((response) => {
      const resolve = snapshotWaiters.get(response.requestId)

      if (resolve !== undefined) {
        snapshotWaiters.delete(response.requestId)
        resolve(response)
      }
    })
    active.ports.changes.subscribe((change) => changes.push(change))
    active.ports.acceptedStates.subscribe((change) =>
      acceptedStates.push(change)
    )
    await Promise.resolve()
    await waitNextFrame()
    await waitNextFrame()
    diagnostics.push('ports-ready')
  },
  startDelete: (request) => {
    const handle = active

    if (handle === undefined) {
      throw new Error('Delete runtime is not started')
    }

    const { promise, resolve } = Promise.withResolvers<ApprovalResult>()
    resultPromises.set(request.operationId, promise)
    resultWaiters.set(request.operationId, resolve)
    const sent = handle.ports.deleteRequests.send(request)
    diagnostics.push(
      Exit.isFailure(sent)
        ? `send-failed:${request.operationId}`
        : `sent:${request.operationId}`
    )

    if (Exit.isFailure(sent)) {
      resultWaiters.delete(request.operationId)
      resolve({
        operationId: request.operationId,
        error: FlowEditDisposedSchema.make({}),
      })
    }
  },
  waitResult: (operationId) => {
    const arrived = arrivedResults.get(operationId)

    if (arrived !== undefined) {
      arrivedResults.delete(operationId)

      return Promise.resolve(arrived)
    }

    const existing = resultPromises.get(operationId)

    if (existing !== undefined) {
      return existing
    }

    const { promise, resolve } = Promise.withResolvers<ApprovalResult>()

    resultWaiters.set(operationId, resolve)

    return promise
  },
  waitApproval: (operationId) => {
    const existing = approvals.get(operationId)

    if (existing !== undefined) {
      approvals.delete(operationId)

      return Promise.resolve(existing)
    }

    const { promise, resolve } = Promise.withResolvers<ApprovalRequest>()

    approvalWaiters.set(operationId, resolve)

    return promise
  },
  respond: (response) => {
    if (active === undefined) {
      throw new Error('Delete runtime is not started')
    }

    active.ports.deleteApprovalResponses.send(response)
  },
  edit: (requestId) => {
    if (active === undefined) {
      throw new Error('Delete runtime is not started')
    }

    const { promise, resolve } = Promise.withResolvers<EditResponse>()

    editWaiters.set(requestId, resolve)
    active.ports.editRequests.send({
      requestId,
      transaction: {
        operations: [
          {
            kind: 'add-nodes',
            nodes: [
              {
                id: NodeIdSchema.make(`added-${requestId}`),
                label: 'Added',
                position: { x: 400, y: 0 },
              },
            ],
          },
        ],
      },
    })

    return promise
  },
  snapshot: (requestId) => {
    if (active === undefined) {
      throw new Error('Delete runtime is not started')
    }

    const { promise, resolve } =
      Promise.withResolvers<typeof SnapshotResponseSchema.Encoded>()

    snapshotWaiters.set(requestId, resolve)
    active.ports.snapshotRequests.send({ requestId })

    return promise
  },
  probeHostAction: () => {
    if (active === undefined) {
      throw new Error('Delete runtime is not started')
    }

    const sent = active.ports.actions.send(
      HostAction.ReplaceViewport({
        viewport: { x: 12, y: 34, zoom: 1 },
      })
    )

    diagnostics.push(
      Exit.isFailure(sent) ? 'host-action-failed' : 'host-action-sent'
    )
  },
  approvalWinsCancellationRace: () => {
    const handle = active

    if (handle === undefined) {
      throw new Error('Delete runtime is not started')
    }

    raceClient = createFoldkitDeleteClient(handle, (request) => {
      const sent = handle.ports.deleteApprovalResponses.send({
        kind: 'approved',
        operationId: request.operationId,
        baseRevision: request.baseRevision,
        decision: true,
      })

      diagnostics.push(
        Exit.isFailure(sent)
          ? `race-approval-failed:${request.operationId}`
          : `race-approval-sent:${request.operationId}`
      )
      raceClient?.cancel(request.operationId)

      return true
    })

    return raceClient.deleteElements({ nodeIds: ['candidate'], edgeIds: [] })
  },
  startPublicDelete: (decision) => {
    const handle = active

    if (handle === undefined) {
      throw new Error('Delete runtime is not started')
    }

    publicDecision = decision

    if (decision === 'reference') {
      referenceDeleteEvents.length = 0
      referenceApprovalResolver = undefined
      referenceApprovalCompleted = false
      referenceRequestIds = { nodeIds: ['candidate'], edgeIds: [] }
    }

    const clientHandle =
      decision === 'reference'
        ? {
            ...handle,
            ports: {
              ...handle.ports,
              deleteRequests: {
                send: (request: typeof DeleteRequestSchema.Encoded) => {
                  referenceRequestIds = {
                    nodeIds: [...request.nodeIds],
                    edgeIds: [...request.edgeIds],
                  }

                  return handle.ports.deleteRequests.send(request)
                },
              },
            },
          }
        : handle

    publicClient ??= createFoldkitDeleteClient(
      clientHandle,
      async (request, context) => {
        diagnostics.push(`public-hook:${request.operationId}`)

        if (publicDecision === 'reference') {
          referenceDeleteEvents.push({
            type: 'before:start',
            nodes: request.candidate.nodes.map(({ id }) => id),
            edges: request.candidate.edges.map(({ id }) => id),
          })
          const { promise, resolve } = Promise.withResolvers<null>()
          referenceApprovalResolver = () => resolve(null)
          context.signal.addEventListener('abort', () => resolve(null), {
            once: true,
          })
          await promise
          referenceApprovalCompleted = true
          referenceDeleteEvents.push({ type: 'before:resolved' })

          return true
        }

        if (publicDecision === 'pending') {
          const { promise, resolve } = Promise.withResolvers<undefined>()
          context.signal.addEventListener('abort', () => resolve(), {
            once: true,
          })
          await promise

          return false
        }

        if (publicDecision === 'throw') {
          throw new Error('HostApprovalFailure')
        }

        if (publicDecision === 'narrow-edge') {
          return { nodes: [], edges: request.candidate.edges }
        }

        return (
          publicDecision === 'approve' || publicDecision === 'callback-throw'
        )
      },
      {
        onEdgesDelete: (edges) => {
          if (publicDecision === 'reference') {
            referenceDeleteEvents.push({
              type: 'edges',
              beforeCompleted: referenceApprovalCompleted,
              ids: edges.map(({ id }) => id),
            })
          }

          publicDeleteEvents.push({
            kind: 'edges',
            ids: edges.map(({ id }) => id),
          })

          if (publicDecision === 'callback-throw') {
            throw new Error('onEdgesDelete failed')
          }
        },
        onNodesDelete: (nodes) => {
          if (publicDecision === 'reference') {
            referenceDeleteEvents.push({
              type: 'nodes',
              beforeCompleted: referenceApprovalCompleted,
              ids: nodes.map(({ id }) => id),
            })
          }

          publicDeleteEvents.push({
            kind: 'nodes',
            ids: nodes.map(({ id }) => id),
          })
        },
        onDelete: ({ nodes, edges }) => {
          if (publicDecision === 'reference') {
            referenceDeleteEvents.push({
              type: 'delete',
              beforeCompleted: referenceApprovalCompleted,
              nodes: nodes.map(({ id }) => id),
              edges: edges.map(({ id }) => id),
            })
          }

          publicDeleteEvents.push({
            kind: 'delete',
            nodeIds: nodes.map(({ id }) => id),
            edgeIds: edges.map(({ id }) => id),
          })
        },
        onCallbackError: (_error, context) =>
          publicDeleteEvents.push({
            kind: 'callback-error',
            callback: context.callback,
          }),
      }
    )
    publicOperationNumber += 1
    publicDeleteResult = publicClient.deleteElements({
      nodeIds: ['candidate'],
      edgeIds: [],
    })
  },
  resolveReferenceApproval: () => {
    const resolve = referenceApprovalResolver
    referenceApprovalResolver = undefined
    resolve?.()
  },
  awaitPublicDelete: async () => {
    if (publicDeleteResult === undefined) {
      throw new Error('Public delete was not started')
    }

    const result = await publicDeleteResult

    if ('error' in result) {
      const { operationId, error } = result

      // SAFETY: this is a browser-test diagnostic projection of a typed error.
      return {
        operationId,
        error: { ...error, _tag: error._tag },
      } as ApprovalResult
    }

    // SAFETY: successful results are schema-encoded before Playwright serialization.
    return structuredClone(result) as ApprovalResult
  },
  cancelPublicDelete: () =>
    publicClient?.cancel(`foldkit-delete-${publicOperationNumber}`) ?? false,
  acceptPublicProposal: (document) => {
    if (active === undefined) {
      throw new Error('Delete runtime is not started')
    }

    active.ports.actions.send(
      HostAction.ReplaceDocument({
        document: Schema.decodeUnknownSync(FlowDocumentSchema)(document),
      })
    )
  },
  disposePublicDelete: () => publicClient?.dispose(),
  publicDeleteEvents: () => [...publicDeleteEvents],
  referenceDeleteRequest: () => ({
    nodeIds: [...referenceRequestIds.nodeIds],
    edgeIds: [...referenceRequestIds.edgeIds],
  }),
  referenceDeleteEvents: () => [...referenceDeleteEvents],
  publicEmptyDelete: async () => {
    const handle = active

    if (handle === undefined) {
      throw new Error('Delete runtime is not started')
    }

    let beforeDeleteCalls = 0

    const client = createFoldkitDeleteClient(
      handle,
      () => {
        beforeDeleteCalls += 1

        return true
      },
      {
        onEdgesDelete: (edges) =>
          publicDeleteEvents.push({
            kind: 'edges',
            ids: edges.map(({ id }) => id),
          }),
        onNodesDelete: (nodes) =>
          publicDeleteEvents.push({
            kind: 'nodes',
            ids: nodes.map(({ id }) => id),
          }),
        onDelete: ({ nodes, edges }) =>
          publicDeleteEvents.push({
            kind: 'delete',
            nodeIds: nodes.map(({ id }) => id),
            edgeIds: edges.map(({ id }) => id),
          }),
      }
    )

    try {
      const result = structuredClone(
        await client.deleteElements({ nodeIds: [], edgeIds: [] })
      )

      return { result, beforeDeleteCalls }
    } finally {
      client.dispose()
    }
  },
  publicReentrantDelete: async () => {
    const handle = active

    if (handle === undefined) {
      throw new Error('Delete runtime is not started')
    }

    let nestedResult: Promise<ApprovalResult> | undefined
    let nestedStarted = false

    const client = createFoldkitDeleteClient(handle, () => true, {
      onEdgesDelete: (edges) =>
        publicDeleteEvents.push({
          kind: 'edges',
          ids: edges.map(({ id }) => id),
        }),
      onNodesDelete: (nodes) => {
        publicDeleteEvents.push({
          kind: 'nodes',
          ids: nodes.map(({ id }) => id),
        })

        if (!nestedStarted && nodes.some(({ id }) => id === 'candidate')) {
          nestedStarted = true
          nestedResult = client.deleteElements({
            nodeIds: ['independent'],
            edgeIds: [],
          })
        }
      },
      onDelete: ({ nodes, edges }) =>
        publicDeleteEvents.push({
          kind: 'delete',
          nodeIds: nodes.map(({ id }) => id),
          edgeIds: edges.map(({ id }) => id),
        }),
    })

    try {
      const outer = structuredClone(
        await client.deleteElements({ nodeIds: ['candidate'], edgeIds: [] })
      )

      if (nestedResult === undefined) {
        throw new Error('Nested deletion was not started from the callback')
      }

      return {
        outer,
        nested: structuredClone(await nestedResult),
      }
    } finally {
      client.dispose()
    }
  },
  dispose: () => {
    if (raceClient === undefined) {
      active?.dispose()
    } else {
      raceClient.dispose()
      raceClient = undefined
    }

    active = undefined
  },
  resultEvents: () => [...resultEvents],
  diagnostics: () => [...diagnostics],
  changes: () => [...changes],
  acceptedStates: () => [...acceptedStates],
}

window.__flowFoldkitDeleteHarness = harness
