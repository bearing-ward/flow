import { Predicate, Schema as S } from 'effect'

import { FlowConnectionSchema } from './flow-connection.schema.ts'
import { ReconnectEndpointSchema } from './flow-reconnection.schema.ts'
import { EdgeIdSchema } from './flow-values.ts'
import { XYPositionSchema } from './flow.schema.ts'

const ConnectionPreviewFields = {
  from: XYPositionSchema,
  to: XYPositionSchema,
  candidate: S.NullOr(FlowConnectionSchema),
  valid: S.NullOr(S.Boolean),
}

export const ConnectPreviewStateSchema = S.Struct({
  kind: S.Literal('connect'),
  ...ConnectionPreviewFields,
})

export const ReconnectPreviewStateSchema = S.Struct({
  kind: S.Literal('reconnect'),
  ...ConnectionPreviewFields,
  edgeId: EdgeIdSchema,
  endpoint: ReconnectEndpointSchema,
})

export const ConnectionPreviewStateSchema = S.Union([
  ConnectPreviewStateSchema,
  ReconnectPreviewStateSchema,
])

export type ConnectionPreviewState = typeof ConnectionPreviewStateSchema.Type

export const ConnectionPreviewSnapshotSchema = S.NullOr(
  ConnectionPreviewStateSchema
)

export type ConnectionPreviewSnapshot =
  typeof ConnectionPreviewSnapshotSchema.Type

const freezeRecursively = <Value>(value: Value): Value => {
  if (
    (!Array.isArray(value) && !Predicate.isObject(value)) ||
    Object.isFrozen(value)
  ) {
    return value
  }

  for (const nested of Object.values(value)) {
    freezeRecursively(nested)
  }

  Object.freeze(value)

  return value
}

/** Copy transient connection state into a detached, deeply frozen readonly view. */
export const createConnectionPreviewSnapshot = (
  preview: ConnectionPreviewSnapshot
): ConnectionPreviewSnapshot => {
  if (preview === null) {
    return null
  }

  const snapshot = structuredClone(preview)
  freezeRecursively(snapshot)

  return snapshot
}
