import { Schema as S } from 'effect'

import { FlowEdgeSchema, FlowNodeSchema } from './flow.schema.ts'

export const FlowDeleteCandidateSchema = S.Struct({
  nodes: S.Array(FlowNodeSchema),
  edges: S.Array(FlowEdgeSchema),
})

export type FlowDeleteCandidate = typeof FlowDeleteCandidateSchema.Type

/** A boolean approves or denies the eligible candidate; an object narrows it. */
export const FlowDeleteDecisionSchema = S.Union([
  S.Boolean,
  FlowDeleteCandidateSchema,
])

export type FlowDeleteDecision = typeof FlowDeleteDecisionSchema.Type

export const FlowDeleteRequestSchema = S.Struct({
  operationId: S.String,
  baseRevision: S.Int.check(S.isGreaterThanOrEqualTo(0)),
  nodeIds: S.Array(S.String),
  edgeIds: S.Array(S.String),
})

export const FlowDeleteApprovalResponseSchema = S.Union([
  S.Struct({
    kind: S.Literal('approved'),
    operationId: S.String,
    baseRevision: S.Int.check(S.isGreaterThanOrEqualTo(0)),
    decision: FlowDeleteDecisionSchema,
  }),
  S.Struct({ kind: S.Literal('cancelled'), operationId: S.String }),
  S.Struct({
    kind: S.Literal('failed'),
    operationId: S.String,
    reason: S.String,
  }),
])

export type FlowDeleteApprovalResponse =
  typeof FlowDeleteApprovalResponseSchema.Type

export type FlowBeforeDelete = (
  candidate: FlowDeleteCandidate
) => Promise<FlowDeleteDecision>

export interface FlowDeleteLifecycle {
  readonly onBeforeDelete?: FlowBeforeDelete | undefined
  readonly onEdgesDelete?:
    | ((edges: readonly FlowDeleteCandidate['edges'][number][]) => void)
    | undefined
  readonly onNodesDelete?:
    | ((nodes: readonly FlowDeleteCandidate['nodes'][number][]) => void)
    | undefined
  readonly onDelete?: ((deleted: FlowDeleteCandidate) => void) | undefined
}
