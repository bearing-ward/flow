import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import {
  ConnectionIssueSchema,
  validateFlowConnection,
} from './flow-connection.schema.ts'
import type {
  ConnectionIssue,
  ConnectionMode,
} from './flow-connection.schema.ts'
import { HandleIdSchema, NodeIdSchema } from './flow-values.ts'
import type { FlowDocument } from './flow.schema.ts'

/** Public default selection is distinct from a resolved physical connection. */
export const FlowConnectionRequestSchema = S.Struct({
  source: NodeIdSchema,
  sourceHandle: S.NullOr(HandleIdSchema),
  target: NodeIdSchema,
  targetHandle: S.NullOr(HandleIdSchema),
})

export type FlowConnectionRequest = typeof FlowConnectionRequestSchema.Type

const tagged = S.TaggedError

/** Default resolution can fail before branded physical handles exist. */
export class InvalidFlowConnectionRequest extends tagged<InvalidFlowConnectionRequest>()(
  'InvalidFlowConnectionRequest',
  { ...FlowConnectionRequestSchema.fields, reason: ConnectionIssueSchema }
) {}

const decodeUnknownFlowConnectionRequest = S.decodeUnknownEffect(
  FlowConnectionRequestSchema
)

type FlowConnectionRequestInput = Parameters<
  typeof decodeUnknownFlowConnectionRequest
>[0]

const rejectConnectionRequest = (
  request: FlowConnectionRequest,
  reason: ConnectionIssue
) => {
  const attributes = {
    [FlowAttribute.connectionIssue]: reason,
    [FlowAttribute.nodeId]: request.source,
    [FlowAttribute.connectionTargetNodeId]: request.target,
  }

  return Effect.annotateCurrentSpan(attributes).pipe(
    Effect.andThen(
      Effect.logWarning('Rejected flow connection request').pipe(
        Effect.annotateLogs(attributes)
      )
    ),
    Effect.andThen(
      Effect.fail(new InvalidFlowConnectionRequest({ ...request, reason }))
    )
  )
}

/** Decode a request once and retain the selected named identities in the result. */
export const resolveFlowConnectionRequest = (
  document: FlowDocument,
  input: FlowConnectionRequestInput,
  mode: ConnectionMode = 'strict'
) =>
  Effect.gen(function* resolveConnectionRequest() {
    const request = yield* decodeUnknownFlowConnectionRequest(input).pipe(
      Effect.tapError((failure) =>
        Effect.logWarning('Rejected flow connection request decode').pipe(
          Effect.annotateLogs({
            [FlowAttribute.inputKind]: 'connection-request',
            [FlowAttribute.failureName]: failure._tag,
            [FlowAttribute.failureMessage]: failure.message,
          })
        )
      )
    )

    const source = document.nodes.find((node) => node.id === request.source)
    const target = document.nodes.find((node) => node.id === request.target)

    if (source === undefined) {
      return yield* rejectConnectionRequest(request, 'missing-source-node')
    }

    if (target === undefined) {
      return yield* rejectConnectionRequest(request, 'missing-target-node')
    }

    const sourceHandle = source?.handles?.find((handle) =>
      request.sourceHandle === null
        ? handle.kind === 'source'
        : handle.id === request.sourceHandle
    )

    const targetHandle = target?.handles?.find((handle) =>
      request.targetHandle === null
        ? handle.kind === 'target'
        : handle.id === request.targetHandle
    )

    if (sourceHandle === undefined) {
      return yield* rejectConnectionRequest(request, 'missing-source-handle')
    }

    if (targetHandle === undefined) {
      return yield* rejectConnectionRequest(request, 'missing-target-handle')
    }

    return yield* validateFlowConnection(
      document,
      {
        source: request.source,
        sourceHandle: sourceHandle.id,
        target: request.target,
        targetHandle: targetHandle.id,
      },
      mode
    )
  }).pipe(Effect.withSpan(FlowSpan.connectionValidate))
