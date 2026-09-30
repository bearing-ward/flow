import { Schema } from 'effect'

import {
  FlowDeleteApprovalFailed,
  FlowDeleteCancelled,
  FlowDeleteInProgress,
  FlowDeleteInvalidCandidate,
  FlowDeleteRevisionConflict,
} from './flow-delete-error.ts'
import { FlowEditDisposed } from './flow-edit-disposed-error.ts'
declare const ProtectedDeletionConflict_base: Schema.Class<
  ProtectedDeletionConflict,
  Schema.TaggedStruct<
    'ProtectedDeletionConflict',
    {
      readonly nodeIds: Schema.$Array<
        Schema.brand<Schema.NonEmptyString, 'NodeId'>
      >
      readonly edgeIds: Schema.$Array<
        Schema.brand<Schema.NonEmptyString, 'EdgeId'>
      >
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class ProtectedDeletionConflict extends ProtectedDeletionConflict_base {}
export {
  FlowDeleteApprovalFailed,
  FlowDeleteCancelled,
  FlowDeleteInProgress,
  FlowDeleteInvalidCandidate,
  FlowDeleteRevisionConflict,
} from './flow-delete-error.ts'
export { FlowEditDisposed } from './flow-edit-disposed-error.ts'
export declare const FlowEditDisposedSchema: typeof FlowEditDisposed
export declare const FlowEditErrorSchema: Schema.Union<
  readonly [
    typeof ProtectedDeletionConflict,
    typeof FlowDeleteRevisionConflict,
    typeof FlowDeleteInvalidCandidate,
    typeof FlowDeleteInProgress,
    typeof FlowDeleteCancelled,
    typeof FlowDeleteApprovalFailed,
    typeof FlowEditDisposed,
    Schema.Union<
      readonly [
        typeof import('./duplicate-node-id.ts').DuplicateNodeId,
        typeof import('./duplicate-edge-id.ts').DuplicateEdgeId,
        typeof import('./duplicate-handle-id.ts').DuplicateHandleId,
        typeof import('./missing-edge-endpoint.ts').MissingEdgeEndpoint,
        typeof import('./missing-edge-handle.ts').MissingEdgeHandle,
        typeof import('./missing-parent-node.ts').MissingParentNode,
        typeof import('./self-parent-node.ts').SelfParentNode,
        typeof import('./parent-cycle.ts').ParentCycle,
        typeof import('./parent-extent-without-parent.ts').ParentExtentWithoutParent,
      ]
    >,
  ]
>
export type FlowEditError = typeof FlowEditErrorSchema.Type
