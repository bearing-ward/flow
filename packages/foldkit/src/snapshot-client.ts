import {
  FlowAttribute,
  FlowSpan,
  SavedFlowFormatFailureCodeSchema,
} from '@flow/core'
import { Effect, Exit, Schema, Struct } from 'effect'

import {
  LegacySnapshotFailureSchema,
  SnapshotRequestSchema,
  SnapshotResponseSchema,
} from './application.ts'
import type { SnapshotRequest } from './application.ts'

export const SnapshotQuerySchema = Schema.Struct(
  Struct.omit(SnapshotRequestSchema.fields, ['requestId'])
)

export const FoldkitSnapshotResultSchema = Schema.Union([
  Schema.Struct({
    status: Schema.Literal('succeeded'),
    response: SnapshotResponseSchema,
  }),
  Schema.Struct({
    status: Schema.Literal('disposed'),
    requestId: Schema.String,
  }),
  Schema.Struct({
    status: Schema.Literal('failed'),
    requestId: Schema.String,
    reason: Schema.Union([
      Schema.Literals(['invalid-request', 'send-failed']),
      SavedFlowFormatFailureCodeSchema,
    ]),
  }),
])

export type SnapshotQuery = typeof SnapshotQuerySchema.Encoded

export type FoldkitSnapshotResult = typeof FoldkitSnapshotResultSchema.Type

export interface FoldkitSnapshotClient {
  readonly request: (query?: SnapshotQuery) => Promise<FoldkitSnapshotResult>
  readonly dispose: () => void
}

interface SnapshotPorts {
  readonly snapshotFailures: {
    readonly subscribe: (
      listener: (failure: typeof LegacySnapshotFailureSchema.Encoded) => void
    ) => () => void
  }
  readonly snapshots: {
    readonly subscribe: (
      listener: (response: typeof SnapshotResponseSchema.Encoded) => void
    ) => () => void
  }
  readonly snapshotRequests: {
    readonly send: (
      request: SnapshotRequest
    ) => Exit.Exit<void, unknown> | boolean
  }
}

let nextOwnerId = 0

const reportFailure = (
  reason: Extract<FoldkitSnapshotResult, { status: 'failed' }>['reason']
): void => {
  Effect.runFork(
    Effect.logError('Foldkit snapshot request failed').pipe(
      Effect.annotateLogs({
        [FlowAttribute.inputKind]: 'snapshot-request',
        [FlowAttribute.failureName]: reason,
      }),
      Effect.withSpan(FlowSpan.controllerUpdate)
    )
  )
}

/** Correlate one Runtime's public reads and settle requests at its host boundary. */
export const createFoldkitSnapshotClient = (
  ports: SnapshotPorts
): FoldkitSnapshotClient => {
  nextOwnerId += 1
  const ownerId = nextOwnerId
  let requestNumber = 0
  let disposed = false
  const pending = new Map<string, (result: FoldkitSnapshotResult) => void>()

  const settle = (requestId: string, result: FoldkitSnapshotResult): void => {
    const resolve = pending.get(requestId)
    pending.delete(requestId)
    resolve?.(result)
  }

  const stop = ports.snapshots.subscribe((response) => {
    if (!disposed && pending.has(response.requestId)) {
      settle(response.requestId, {
        status: 'succeeded',
        response: Schema.decodeUnknownSync(SnapshotResponseSchema)(response),
      })
    }
  })

  const stopFailures = ports.snapshotFailures.subscribe((failure) => {
    if (!disposed && pending.has(failure.requestId)) {
      const validated = Schema.decodeUnknownSync(LegacySnapshotFailureSchema)(
        failure
      )

      reportFailure(validated.code)
      settle(validated.requestId, {
        status: 'failed',
        requestId: validated.requestId,
        reason: validated.code,
      })
    }
  })

  return {
    request: (query = {}) => {
      requestNumber += 1
      const requestId = `foldkit-snapshot-${ownerId}-${requestNumber}`

      const { promise, resolve } =
        Promise.withResolvers<FoldkitSnapshotResult>()

      if (disposed) {
        resolve({ status: 'disposed', requestId })

        return promise
      }

      let validated: typeof SnapshotQuerySchema.Type

      try {
        validated = Schema.decodeUnknownSync(SnapshotQuerySchema)(query)
      } catch {
        reportFailure('invalid-request')
        resolve({ status: 'failed', requestId, reason: 'invalid-request' })

        return promise
      }

      pending.set(requestId, resolve)

      try {
        const sent = ports.snapshotRequests.send({ ...validated, requestId })

        if (sent === false || (sent !== true && Exit.isFailure(sent))) {
          reportFailure('send-failed')
          settle(requestId, {
            status: 'failed',
            requestId,
            reason: 'send-failed',
          })
        }
      } catch {
        reportFailure('send-failed')
        settle(requestId, {
          status: 'failed',
          requestId,
          reason: 'send-failed',
        })
      }

      return promise
    },
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      stop()
      stopFailures()

      for (const requestId of pending.keys()) {
        settle(requestId, { status: 'disposed', requestId })
      }
    },
  }
}
