import type { Effect } from 'effect'
import { Schema as S } from 'effect'

import type {
  FlowDocument,
  FlowDocumentIntegrityError,
  FlowEdge,
  FlowNode,
} from './flow.schema.ts'

export type FlowNodeGeometry = Omit<FlowNode, 'data' | 'type'> & {
  readonly type?: FlowNode['type']
}

export type FlowEdgeGeometry = Omit<FlowEdge, 'data' | 'type'> & {
  readonly type?: FlowEdge['type']
}

export type FlowGraphGeometry = Omit<FlowDocument, 'nodes' | 'edges'> & {
  readonly nodes: readonly FlowNodeGeometry[]
  readonly edges: readonly FlowEdgeGeometry[]
}

export type FlowGraphCodec = S.ConstraintCodec<
  FlowGraphGeometry,
  unknown,
  unknown,
  unknown
>

export type FlowNodeOf<C extends FlowGraphCodec> = C['Type']['nodes'][number]

export type FlowEdgeOf<C extends FlowGraphCodec> = C['Type']['edges'][number]

export const FlowTypedFailureSchema = S.Union([
  S.TaggedStruct('FlowCodecFailure', {
    operation: S.Literals(['decode', 'validate-decoded', 'encode', 'isolate']),
    message: S.String,
  }),
  S.TaggedStruct('FlowCallbackFailure', { message: S.String }),
  S.TaggedStruct('FlowDisposed', {}),
  S.TaggedStruct('FlowRevisionConflict', {
    expected: S.Number,
    actual: S.Number,
  }),
  S.TaggedStruct('FlowProjectionFailure', {
    revision: S.Number,
    message: S.String,
  }),
])

export type FlowTypedFailure = typeof FlowTypedFailureSchema.Type

export type FlowTypedError = FlowTypedFailure | FlowDocumentIntegrityError

export interface FlowIsolation<C extends FlowGraphCodec, RI> {
  readonly detach: (
    value: C['Type']
  ) => Effect.Effect<C['Type'], FlowTypedFailure, RI>
}

export interface FlowDataContract<C extends FlowGraphCodec, RI> {
  readonly id: string
  readonly document: C
  readonly isolation: FlowIsolation<C, RI>
}
