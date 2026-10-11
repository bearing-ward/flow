import { Schema as S, Struct } from 'effect'

import type {
  FlowDataContract,
  FlowEdgeGeometry,
  FlowGraphCodec,
  FlowIsolation,
  FlowNodeGeometry,
} from './flow-data-contract.schema.ts'
import {
  FlowDocumentSchema,
  FlowEdgeSchema,
  FlowNodeSchema,
} from './flow.schema.ts'

export const defineFlowDataContract = <C extends FlowGraphCodec, RI>(options: {
  readonly id: string
  readonly document: C
  readonly isolation: FlowIsolation<C, RI>
}): FlowDataContract<C, RI> => ({
  id: options.id,
  document: options.document,
  isolation: options.isolation,
})

type VariantTypeCodec = S.ConstraintCodec<
  string | undefined,
  unknown,
  unknown,
  unknown
>

export const createFlowNodeVariantSchema = <
  const T extends VariantTypeCodec,
  const D extends S.Constraint,
>(options: {
  readonly type: T
  readonly data: D
}) =>
  S.Struct({
    ...Struct.omit(FlowNodeSchema.fields, ['type', 'data']),
    type: options.type,
    data: options.data,
  })

export const createFlowEdgeVariantSchema = <
  const T extends VariantTypeCodec,
  const D extends S.Constraint,
>(options: {
  readonly type: T
  readonly data: D
}) =>
  S.Struct({
    ...Struct.omit(FlowEdgeSchema.fields, ['type', 'data']),
    type: options.type,
    data: options.data,
  })

export const createFlowDataDocumentSchema = <
  const N extends S.ConstraintCodec<
    FlowNodeGeometry,
    unknown,
    unknown,
    unknown
  >,
  const E extends S.ConstraintCodec<
    FlowEdgeGeometry,
    unknown,
    unknown,
    unknown
  >,
>(options: {
  readonly nodes: N
  readonly edges: E
}) =>
  S.Struct({
    ...Struct.omit(FlowDocumentSchema.fields, ['nodes', 'edges']),
    nodes: S.Array(options.nodes),
    edges: S.Array(options.edges),
  })
