import { Schema } from 'effect'

import {
  EdgeIdSchema,
  FlowDocumentIntegrityErrorSchema,
  NodeIdSchema,
} from './flow.schema.ts'

const tagged = Schema.TaggedError

export class ProtectedDeletionConflict extends tagged<ProtectedDeletionConflict>()(
  'ProtectedDeletionConflict',
  {
    nodeIds: Schema.Array(NodeIdSchema),
    edgeIds: Schema.Array(EdgeIdSchema),
  }
) {}

export const FlowEditDisposedSchema = Schema.TaggedStruct(
  'FlowEditDisposed',
  {}
)

export const FlowEditErrorSchema = Schema.Union([
  ProtectedDeletionConflict,
  FlowEditDisposedSchema,
  FlowDocumentIntegrityErrorSchema,
])

export type FlowEditError = typeof FlowEditErrorSchema.Type
