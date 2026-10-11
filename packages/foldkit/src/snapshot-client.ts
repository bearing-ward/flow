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
  VersionedSnapshotResponseSchema,
} from './application.ts'
import type { SnapshotRequest } from './application.ts'

export const SnapshotQuerySchema = Schema.Struct(
  Struct.omit(SnapshotRequestSchema.fields, ['requestId'])
)

const SnapshotDisposedSchema = Schema.Struct({
  status: Schema.Literal('disposed'),
  requestId: Schema.String,
})

const SnapshotFailedSchema = Schema.Struct({
  status: Schema.Literal('failed'),
  requestId: Schema.String,
  reason: Schema.Union([
    Schema.Literals(['invalid-request', 'send-failed']),
    SavedFlowFormatFailureCodeSchema,
  ]),
})

export const FoldkitSnapshotResultSchema = Schema.Union([
  Schema.Struct({
    status: Schema.Literal('succeeded'),
    response: SnapshotResponseSchema,
  }),
  SnapshotDisposedSchema,
  SnapshotFailedSchema,
])

export const FoldkitVersionedSnapshotResultSchema = Schema.Union([
  Schema.Struct({
    status: Schema.Literal('succeeded'),
    response: VersionedSnapshotResponseSchema,
  }),
  SnapshotDisposedSchema,
  SnapshotFailedSchema,
])

export type SnapshotQuery = typeof SnapshotQuerySchema.Encoded

export type FoldkitSnapshotResult = typeof FoldkitSnapshotResultSchema.Type

export type FoldkitVersionedSnapshotResult =
  typeof FoldkitVersionedSnapshotResultSchema.Type

export interface FoldkitSnapshotClient {
  readonly request: (query?: SnapshotQuery) => Promise<FoldkitSnapshotResult>
  readonly dispose: () => void
}

export interface FoldkitVersionedSnapshotClient extends FoldkitSnapshotClient {
  readonly requestVersioned: (
    query?: SnapshotQuery
  ) => Promise<FoldkitVersionedSnapshotResult>
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

interface VersionedSnapshotPorts extends SnapshotPorts {
  readonly versionedSnapshots: {
    readonly subscribe: (
      listener: (
        response: typeof VersionedSnapshotResponseSchema.Encoded
      ) => void
    ) => () => void
  }
  readonly versionedSnapshotRequests: SnapshotPorts['snapshotRequests']
}

type PendingSnapshot =
  | {
      readonly protocol: 'legacy'
      readonly resolve: (result: FoldkitSnapshotResult) => void
    }
  | {
      readonly protocol: 'versioned'
      readonly resolve: (result: FoldkitVersionedSnapshotResult) => void
    }

type SnapshotTerminal =
  | typeof SnapshotDisposedSchema.Type
  | typeof SnapshotFailedSchema.Type

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

/** One owner correlates both public protocols without widening the legacy overload. */
export function createFoldkitSnapshotClient(
  ports: VersionedSnapshotPorts
): FoldkitVersionedSnapshotClient
export function createFoldkitSnapshotClient(
  ports: SnapshotPorts
): FoldkitSnapshotClient
export function createFoldkitSnapshotClient(
  ports: SnapshotPorts | VersionedSnapshotPorts
): FoldkitSnapshotClient | FoldkitVersionedSnapshotClient {
  nextOwnerId += 1
  const ownerId = nextOwnerId
  let requestNumber = 0
  let disposed = false
  const pending = new Map<string, PendingSnapshot>()

  const versionedPorts =
    'versionedSnapshots' in ports && 'versionedSnapshotRequests' in ports
      ? ports
      : undefined

  const settleTerminal = (
    requestId: string,
    result: SnapshotTerminal
  ): void => {
    const entry = pending.get(requestId)
    pending.delete(requestId)
    entry?.resolve(result)
  }

  const stop = ports.snapshots.subscribe((response) => {
    const entry = pending.get(response.requestId)

    if (disposed || entry?.protocol !== 'legacy') {
      return
    }

    const validated = Schema.decodeUnknownSync(SnapshotResponseSchema)(response)
    pending.delete(response.requestId)
    entry.resolve({ status: 'succeeded', response: validated })
  })

  const stopFailures = ports.snapshotFailures.subscribe((failure) => {
    const entry = pending.get(failure.requestId)

    if (disposed || entry?.protocol !== 'legacy') {
      return
    }

    const validated = Schema.decodeUnknownSync(LegacySnapshotFailureSchema)(
      failure
    )

    reportFailure(validated.code)
    settleTerminal(validated.requestId, {
      status: 'failed',
      requestId: validated.requestId,
      reason: validated.code,
    })
  })

  const stopVersioned = versionedPorts?.versionedSnapshots.subscribe(
    (response) => {
      const entry = pending.get(response.requestId)

      if (disposed || entry?.protocol !== 'versioned') {
        return
      }

      const validated = Schema.decodeUnknownSync(
        VersionedSnapshotResponseSchema
      )(response)

      pending.delete(response.requestId)
      entry.resolve({ status: 'succeeded', response: validated })
    }
  )

  function request(
    protocol: 'legacy',
    query?: SnapshotQuery
  ): Promise<FoldkitSnapshotResult>
  function request(
    protocol: 'versioned',
    query?: SnapshotQuery
  ): Promise<FoldkitVersionedSnapshotResult>
  function request(
    protocol: 'legacy' | 'versioned',
    query: SnapshotQuery = {}
  ): Promise<FoldkitSnapshotResult | FoldkitVersionedSnapshotResult> {
    requestNumber += 1
    const requestId = `foldkit-snapshot-${ownerId}-${requestNumber}`

    const { promise, resolve } = Promise.withResolvers<
      FoldkitSnapshotResult | FoldkitVersionedSnapshotResult
    >()

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

    pending.set(
      requestId,
      protocol === 'legacy'
        ? { protocol: 'legacy', resolve }
        : { protocol: 'versioned', resolve }
    )

    try {
      const outbound =
        protocol === 'legacy'
          ? ports.snapshotRequests
          : versionedPorts?.versionedSnapshotRequests

      const sent = outbound?.send({ ...validated, requestId }) ?? false

      if (sent === false || (sent !== true && Exit.isFailure(sent))) {
        reportFailure('send-failed')
        settleTerminal(requestId, {
          status: 'failed',
          requestId,
          reason: 'send-failed',
        })
      }
    } catch {
      reportFailure('send-failed')
      settleTerminal(requestId, {
        status: 'failed',
        requestId,
        reason: 'send-failed',
      })
    }

    return promise
  }

  const client: FoldkitSnapshotClient = {
    request: (query) => request('legacy', query),
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      stop()
      stopFailures()
      stopVersioned?.()

      for (const requestId of pending.keys()) {
        settleTerminal(requestId, { status: 'disposed', requestId })
      }
    },
  }

  return versionedPorts === undefined
    ? client
    : { ...client, requestVersioned: (query) => request('versioned', query) }
}
