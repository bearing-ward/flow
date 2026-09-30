import { Schema } from 'effect'

import {
  FlowDeleteApprovalFailed,
  FlowDeleteCancelled,
  FlowDeleteInProgress,
  FlowDeleteInvalidCandidate,
  FlowDeleteRevisionConflict,
} from './flow-delete-error.ts'
import { FlowEditDisposed } from './flow-edit-disposed-error.ts'
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

export {
  FlowDeleteApprovalFailed,
  FlowDeleteCancelled,
  FlowDeleteInProgress,
  FlowDeleteInvalidCandidate,
  FlowDeleteRevisionConflict,
} from './flow-delete-error.ts'

export { FlowEditDisposed } from './flow-edit-disposed-error.ts'

export const FlowEditDisposedSchema = FlowEditDisposed

export const FlowEditErrorSchema = Schema.Union([
  ProtectedDeletionConflict,
  FlowDeleteRevisionConflict,
  FlowDeleteInvalidCandidate,
  FlowDeleteInProgress,
  FlowDeleteCancelled,
  FlowDeleteApprovalFailed,
  FlowEditDisposedSchema,
  FlowDocumentIntegrityErrorSchema,
])

export type FlowEditError = typeof FlowEditErrorSchema.Type
