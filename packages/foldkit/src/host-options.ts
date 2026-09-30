import type {
  DeleteApprovalDecision,
  DeleteApprovalRequested,
} from './delete-approval.ts'

/**
 * Host-facing Foldkit composition API. Approval callbacks execute in the host
 * process; only schema-checked requests and responses cross Runtime ports.
 */
export {
  createFoldkitDeleteClient,
  DeleteApprovalRequestedSchema,
  DeleteApprovalResponseSchema,
  DeleteResultSchema,
  DeleteRequestSchema,
  DeleteCancellationSchema,
  DeleteCancellationAckSchema,
} from './delete-approval.ts'

export interface FoldkitHostOptions {
  readonly beforeDelete?: (
    request: DeleteApprovalRequested,
    context: { readonly signal: AbortSignal }
  ) => Promise<DeleteApprovalDecision> | DeleteApprovalDecision
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
}

declare global {
  interface Window {
    /** Optional host callbacks read during app composition, before Runtime ports are used. */
    flowFoldkitOptions?: FoldkitHostOptions
  }
}

export type {
  DeleteApprovalDecision,
  DeleteApprovalRequested,
  DeleteApprovalResponse,
  DeleteResult,
  FoldkitDeleteClient,
} from './delete-approval.ts'
