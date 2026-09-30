import {
  FlowDeleteCandidateSchema,
  FlowDeleteDecisionSchema,
  FlowDeleteApprovalFailed,
  FlowDeleteCancelled,
  FlowDeleteInProgress,
  FlowEditErrorSchema,
  FlowEditDisposedSchema,
  FlowEditResultSchema,
} from '@flow/core'
import { Exit, Schema } from 'effect'

/** Serializable host request; no callback crosses the Foldkit port boundary. */
export const DeleteApprovalRequestedSchema = Schema.Struct({
  operationId: Schema.String,
  baseRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  candidate: FlowDeleteCandidateSchema,
})

export type DeleteApprovalRequested =
  typeof DeleteApprovalRequestedSchema.Encoded

/** Every outcome echoes both correlation fields so stale replies cannot match. */
export const DeleteApprovalResponseSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('approved'),
    operationId: Schema.String,
    baseRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    decision: FlowDeleteDecisionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal('cancelled'),
    operationId: Schema.String,
    baseRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  }),
  Schema.Struct({
    kind: Schema.Literal('failed'),
    operationId: Schema.String,
    baseRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    reason: Schema.String,
  }),
])

export type DeleteApprovalResponse = typeof DeleteApprovalResponseSchema.Encoded

export const DeleteRequestSchema = Schema.Struct({
  operationId: Schema.String,
  baseRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  nodeIds: Schema.Array(Schema.String),
  edgeIds: Schema.Array(Schema.String),
})

export type DeleteRequest = typeof DeleteRequestSchema.Encoded

export const DeleteCancellationSchema = Schema.Struct({
  operationId: Schema.String,
  baseRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  reason: Schema.Literals(['cancelled', 'timed-out']),
})

export type DeleteCancellation = typeof DeleteCancellationSchema.Encoded

export const DeleteCancellationAckSchema = Schema.Struct({
  operationId: Schema.String,
  baseRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  reason: Schema.Literals(['cancelled', 'timed-out']),
  outcome: Schema.Literals(['cancelled', 'already-settled']),
})

export type DeleteCancellationAck = typeof DeleteCancellationAckSchema.Encoded

export const MAX_PENDING_DELETE_APPROVALS = 32

export const DELETE_APPROVAL_TIMEOUT_MS = 30_000

export const DeleteResultSchema = Schema.Union([
  Schema.Struct({
    operationId: Schema.String,
    result: FlowEditResultSchema,
  }),
  Schema.Struct({
    operationId: Schema.String,
    error: FlowEditErrorSchema,
  }),
])

export type DeleteResult = typeof DeleteResultSchema.Encoded

export interface FoldkitDeleteClient {
  readonly deleteElements: (
    input: Pick<DeleteRequest, 'nodeIds' | 'edgeIds'>,
    options?: { readonly signal?: AbortSignal }
  ) => Promise<DeleteResult>
  readonly cancel: (operationId: string) => boolean
  /** Stops handling approvals, settles calls once, and disposes the Runtime. */
  readonly dispose: () => void
}

interface DeleteApprovalPort<Input> {
  readonly send: (value: Input) => Exit.Exit<void, unknown>
}

interface DeleteApprovalOutputPort<Value> {
  readonly subscribe: (listener: (value: Value) => void) => () => void
}

interface FoldkitDeleteHandle {
  readonly ports: {
    readonly deleteRequests: DeleteApprovalPort<DeleteRequest>
    readonly deleteCancellations: DeleteApprovalPort<DeleteCancellation>
    readonly deleteApprovalResponses: DeleteApprovalPort<DeleteApprovalResponse>
    readonly deleteCancellationAcks: DeleteApprovalOutputPort<DeleteCancellationAck>
    readonly deleteApprovalRequests: DeleteApprovalOutputPort<DeleteApprovalRequested>
    readonly deleteResults: DeleteApprovalOutputPort<DeleteResult>
    readonly acceptedStates: DeleteApprovalOutputPort<{
      readonly cause: string
      readonly previous: { readonly document: unknown }
      readonly current: { readonly document: unknown }
    }>
  }
  readonly dispose: () => void
}

const reportCallbackError = (
  message: string,
  operationId: string,
  callbackName: string
): void => {
  globalThis.console.error('Foldkit deletion callback failed', {
    operationId,
    callback: callbackName,
    message,
  })
}

/** Host facade for the typed Runtime protocol; callback functions stay local. */
export const createFoldkitDeleteClient = (
  handle: FoldkitDeleteHandle,
  beforeDelete: (
    request: DeleteApprovalRequested,
    context: { readonly signal: AbortSignal }
  ) => Promise<DeleteApprovalDecision> | DeleteApprovalDecision,
  options: {
    readonly approvalTimeoutMs?: number
    readonly maxPending?: number
    readonly onEdgesDelete?: (
      edges: readonly DeleteApprovalRequested['candidate']['edges'][number][]
    ) => void
    readonly onNodesDelete?: (
      nodes: readonly DeleteApprovalRequested['candidate']['nodes'][number][]
    ) => void
    readonly onDelete?: (deleted: DeleteApprovalRequested['candidate']) => void
    readonly onCallbackError?: (
      message: string,
      context: {
        readonly operationId: string
        readonly callback: 'onEdgesDelete' | 'onNodesDelete' | 'onDelete'
      }
    ) => void
  } = {}
): FoldkitDeleteClient => {
  let requestNumber = 0
  let revision = 0
  let disposed = false

  interface PendingDelete {
    readonly resolve: (result: DeleteResult) => void
    readonly baseRevision: number
    readonly abortController: AbortController
    cancellationRequested: boolean
    signal?: AbortSignal
    onAbort?: () => void
    timeoutId: ReturnType<typeof setTimeout> | undefined
  }

  const pending = new Map<string, PendingDelete>()

  const approvedCandidates = new Map<
    string,
    DeleteApprovalRequested['candidate']
  >()

  const approvalTimeoutMs =
    options.approvalTimeoutMs ?? DELETE_APPROVAL_TIMEOUT_MS

  const maxPending = options.maxPending ?? MAX_PENDING_DELETE_APPROVALS

  const settle = (operationId: string, result: DeleteResult): boolean => {
    const entry = pending.get(operationId)

    if (entry === undefined) {
      return false
    }

    pending.delete(operationId)

    approvedCandidates.delete(operationId)

    if (entry.timeoutId !== undefined) {
      clearTimeout(entry.timeoutId)
    }

    if (entry.signal !== undefined && entry.onAbort !== undefined) {
      entry.signal.removeEventListener('abort', entry.onAbort)
    }

    entry.abortController.abort()
    entry.resolve(result)

    return true
  }

  const cancel = (
    operationId: string,
    reason: DeleteCancellation['reason'] = 'cancelled'
  ): boolean => {
    const entry = pending.get(operationId)

    if (entry === undefined) {
      return false
    }

    entry.cancellationRequested = true
    entry.abortController.abort()

    const sent = handle.ports.deleteCancellations.send({
      operationId,
      baseRevision: entry.baseRevision,
      reason,
    })

    if (Exit.isFailure(sent)) {
      settle(operationId, {
        operationId,
        error: FlowEditDisposedSchema.make({}),
      })
    }

    return true
  }

  const stopApprovals = handle.ports.deleteApprovalRequests.subscribe(
    (request: DeleteApprovalRequested) => {
      if (disposed) {
        return
      }

      const entry = pending.get(request.operationId)

      if (entry === undefined) {
        return
      }

      void (async () => {
        let response: DeleteApprovalResponse

        const hasCandidates =
          request.candidate.nodes.length > 0 ||
          request.candidate.edges.length > 0

        try {
          const decision = hasCandidates
            ? await beforeDelete(request, {
                signal: entry.abortController.signal,
              })
            : true

          response = {
            kind: 'approved',
            operationId: request.operationId,
            baseRevision: request.baseRevision,
            decision,
          }
        } catch (error) {
          response = {
            kind: 'failed',
            operationId: request.operationId,
            baseRevision: request.baseRevision,
            reason: error instanceof Error ? error.message : String(error),
          }
        }

        if (
          disposed ||
          entry.cancellationRequested ||
          pending.get(request.operationId) !== entry
        ) {
          return
        }

        if (
          hasCandidates &&
          response.kind === 'approved' &&
          response.decision !== false
        ) {
          approvedCandidates.set(request.operationId, request.candidate)
        }

        const sent = handle.ports.deleteApprovalResponses.send(response)

        if (Exit.isFailure(sent)) {
          settle(request.operationId, {
            operationId: request.operationId,
            error: FlowEditDisposedSchema.make({}),
          })
        }
      })()
    }
  )

  const stopResults = handle.ports.deleteResults.subscribe(
    (result: DeleteResult) => {
      const candidate = approvedCandidates.get(result.operationId)

      const callbackErrors: {
        readonly message: string
        readonly callback: 'onEdgesDelete' | 'onNodesDelete' | 'onDelete'
      }[] = []

      approvedCandidates.delete(result.operationId)

      if ('result' in result && candidate !== undefined) {
        const deletedNodeIds = new Set(result.result.deletion.deletedNodeIds)
        const deletedEdgeIds = new Set(result.result.deletion.deletedEdgeIds)

        const deletedNodes = candidate.nodes.filter(({ id }) =>
          deletedNodeIds.has(id)
        )

        const deletedEdges = candidate.edges.filter(({ id }) =>
          deletedEdgeIds.has(id)
        )

        const invoke = (
          callback: 'onEdgesDelete' | 'onNodesDelete' | 'onDelete',
          run: () => void
        ): void => {
          try {
            run()
          } catch (error) {
            callbackErrors.push({ message: String(error), callback })
          }
        }

        if (deletedEdges.length > 0 && options.onEdgesDelete !== undefined) {
          invoke('onEdgesDelete', () => options.onEdgesDelete?.(deletedEdges))
        }

        if (deletedNodes.length > 0 && options.onNodesDelete !== undefined) {
          invoke('onNodesDelete', () => options.onNodesDelete?.(deletedNodes))
        }

        if (
          (deletedNodes.length > 0 || deletedEdges.length > 0) &&
          options.onDelete !== undefined
        ) {
          invoke('onDelete', () =>
            options.onDelete?.({ nodes: deletedNodes, edges: deletedEdges })
          )
        }
      }

      settle(result.operationId, result)

      for (const failure of callbackErrors) {
        try {
          if (options.onCallbackError === undefined) {
            reportCallbackError(
              failure.message,
              result.operationId,
              failure.callback
            )
          } else {
            options.onCallbackError(failure.message, {
              operationId: result.operationId,
              callback: failure.callback,
            })
          }
        } catch (error) {
          reportCallbackError(
            String(error),
            result.operationId,
            'onCallbackError'
          )
        }
      }
    }
  )

  const stopCancellationAcks = handle.ports.deleteCancellationAcks.subscribe(
    (ack: DeleteCancellationAck) => {
      if (ack.outcome !== 'cancelled') {
        return
      }

      settle(ack.operationId, {
        operationId: ack.operationId,
        error:
          ack.reason === 'timed-out'
            ? new FlowDeleteApprovalFailed({
                operationId: ack.operationId,
                reason: 'ApprovalTimedOut',
              })
            : new FlowDeleteCancelled({ operationId: ack.operationId }),
      })
    }
  )

  const stopAcceptedStates = handle.ports.acceptedStates.subscribe((change) => {
    if (
      JSON.stringify(change.previous.document) !==
      JSON.stringify(change.current.document)
    ) {
      revision += 1
    }
  })

  return {
    deleteElements: ({ nodeIds, edgeIds }, requestOptions = {}) => {
      requestNumber += 1
      const operationId = `foldkit-delete-${requestNumber}`
      const { promise, resolve } = Promise.withResolvers<DeleteResult>()
      const { signal } = requestOptions

      if (disposed) {
        resolve({
          operationId,
          error: FlowEditDisposedSchema.make({}),
        })

        return promise
      }

      if (signal?.aborted) {
        resolve({
          operationId,
          error: new FlowDeleteCancelled({ operationId }),
        })

        return promise
      }

      if (pending.size >= maxPending) {
        resolve({
          operationId,
          error: new FlowDeleteInProgress({ operationId }),
        })

        return promise
      }

      const abortController = new AbortController()

      const onAbort =
        signal === undefined ? undefined : () => cancel(operationId)

      const entry: PendingDelete = {
        resolve,
        baseRevision: revision,
        abortController,
        cancellationRequested: false,
        timeoutId: undefined,
      }

      if (signal !== undefined && onAbort !== undefined) {
        entry.signal = signal
        entry.onAbort = onAbort
      }

      pending.set(operationId, entry)

      if (signal !== undefined && onAbort !== undefined) {
        signal.addEventListener('abort', onAbort, { once: true })
      }

      entry.timeoutId = setTimeout(() => {
        cancel(operationId, 'timed-out')
      }, approvalTimeoutMs)

      const sent = handle.ports.deleteRequests.send({
        operationId,
        baseRevision: entry.baseRevision,
        nodeIds: [...nodeIds],
        edgeIds: [...edgeIds],
      })

      if (Exit.isFailure(sent)) {
        settle(operationId, {
          operationId,
          error: FlowEditDisposedSchema.make({}),
        })
      }

      return promise
    },
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      stopApprovals()
      stopResults()
      stopCancellationAcks()
      stopAcceptedStates()

      for (const operationId of pending.keys()) {
        settle(operationId, {
          operationId,
          error: FlowEditDisposedSchema.make({}),
        })
      }

      handle.dispose()
    },
    cancel: (operationId) => cancel(operationId),
  }
}

export type DeleteApprovalDecision = typeof FlowDeleteDecisionSchema.Encoded
