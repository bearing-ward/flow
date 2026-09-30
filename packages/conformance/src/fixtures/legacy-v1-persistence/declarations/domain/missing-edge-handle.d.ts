import { Schema } from 'effect'
declare const MissingEdgeHandle_base: Schema.Class<
  MissingEdgeHandle,
  Schema.TaggedStruct<
    'MissingEdgeHandle',
    {
      readonly edgeId: Schema.brand<Schema.NonEmptyString, 'EdgeId'>
      readonly endpoint: Schema.Literals<readonly ['source', 'target']>
      readonly handleId: Schema.brand<Schema.NonEmptyString, 'HandleId'>
      readonly nodeId: Schema.brand<Schema.NonEmptyString, 'NodeId'>
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class MissingEdgeHandle extends MissingEdgeHandle_base {}
export {}
