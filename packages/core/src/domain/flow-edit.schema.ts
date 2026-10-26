import { Schema as S } from 'effect'

import { FlowBundleSchema } from './flow-bundle.schema.ts'
import { FlowTransactionContextSchema } from './flow-transaction-context.schema.ts'
import {
  EdgeIdSchema,
  FlowDocumentSchema,
  FlowEdgeSchema,
  FlowNodeSchema,
  NodeIdSchema,
} from './flow.schema.ts'

export const SetNodesEditSchema = S.Struct({
  kind: S.Literal('set-nodes'),
  nodes: S.Array(FlowNodeSchema),
})

export const AddNodesEditSchema = S.Struct({
  kind: S.Literal('add-nodes'),
  nodes: S.Array(FlowNodeSchema),
})

export const SetEdgesEditSchema = S.Struct({
  kind: S.Literal('set-edges'),
  edges: S.Array(FlowEdgeSchema),
})

export const AddEdgesEditSchema = S.Struct({
  kind: S.Literal('add-edges'),
  edges: S.Array(FlowEdgeSchema),
})

export const UpdateNodeEditSchema = S.Struct({
  kind: S.Literal('update-node'),
  nodeId: NodeIdSchema,
  patch: S.JsonObject,
  replace: S.optional(S.Boolean),
})

export const UpdateEdgeEditSchema = S.Struct({
  kind: S.Literal('update-edge'),
  edgeId: EdgeIdSchema,
  patch: S.JsonObject,
  replace: S.optional(S.Boolean),
})

export const UpdateNodeDataEditSchema = S.Struct({
  kind: S.Literal('update-node-data'),
  nodeId: NodeIdSchema,
  data: S.JsonObject,
  replace: S.optional(S.Boolean),
})

export const UpdateEdgeDataEditSchema = S.Struct({
  kind: S.Literal('update-edge-data'),
  edgeId: EdgeIdSchema,
  data: S.JsonObject,
  replace: S.optional(S.Boolean),
})

export const DeleteElementsEditSchema = S.Struct({
  kind: S.Literal('delete-elements'),
  nodeIds: S.optional(S.Array(NodeIdSchema)),
  edgeIds: S.optional(S.Array(EdgeIdSchema)),
})

export const SetBundlesEditSchema = S.Struct({
  kind: S.Literal('set-bundles'),
  bundles: S.Array(FlowBundleSchema),
})

export const FlowEditOperationSchema = S.Union([
  SetBundlesEditSchema,
  SetNodesEditSchema,
  AddNodesEditSchema,
  SetEdgesEditSchema,
  AddEdgesEditSchema,
  UpdateNodeEditSchema,
  UpdateEdgeEditSchema,
  UpdateNodeDataEditSchema,
  UpdateEdgeDataEditSchema,
  DeleteElementsEditSchema,
])

export type FlowEditOperation = typeof FlowEditOperationSchema.Type

export const FlowEditTransactionSchema = S.Struct({
  operations: S.Array(FlowEditOperationSchema),
  context: S.optional(FlowTransactionContextSchema),
})

export type FlowEditTransaction = typeof FlowEditTransactionSchema.Type

export type FlowEditTransactionInput = typeof FlowEditTransactionSchema.Encoded

export const FlowDeleteResultSchema = S.Struct({
  deletedNodeIds: S.Array(NodeIdSchema),
  deletedEdgeIds: S.Array(EdgeIdSchema),
})

export type FlowDeleteResult = typeof FlowDeleteResultSchema.Type

export const FlowEditResultSchema = S.Struct({
  document: FlowDocumentSchema,
  deletion: FlowDeleteResultSchema,
  context: S.optional(FlowTransactionContextSchema),
})

export type FlowEditResult = typeof FlowEditResultSchema.Type
