import { Predicate, Schema as S } from 'effect'

import type { Viewport } from './flow-runtime.schema.ts'
import { ViewportSchema } from './flow-runtime.schema.ts'
import type { FlowDocument } from './flow.schema.ts'
import { FlowDocumentSchema } from './flow.schema.ts'

export const FlowSnapshotSchema = S.Struct({
  document: FlowDocumentSchema,
  viewport: ViewportSchema,
})

export type FlowSnapshot = typeof FlowSnapshotSchema.Type

export const FlowStateChangeCauseSchema = S.Literals([
  'document-update',
  'viewport-update',
  'semantic-change',
])

export type FlowStateChangeCause = typeof FlowStateChangeCauseSchema.Type

export const FlowStateChangeSchema = S.Struct({
  previous: FlowSnapshotSchema,
  current: FlowSnapshotSchema,
  cause: FlowStateChangeCauseSchema,
})

export type FlowStateChange = typeof FlowStateChangeSchema.Type

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

/** Create a detached, deeply frozen projection of accepted document and viewport state. */
export const createFlowSnapshot = (
  document: FlowDocument,
  viewport: Viewport
): FlowSnapshot => {
  const snapshot = structuredClone({ document, viewport })
  freezeRecursively(snapshot)

  return snapshot
}
