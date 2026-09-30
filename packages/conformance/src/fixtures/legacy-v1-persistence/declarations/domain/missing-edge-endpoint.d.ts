import { Schema } from 'effect'
declare const MissingEdgeEndpoint_base: Schema.Class<
  MissingEdgeEndpoint,
  Schema.TaggedStruct<
    'MissingEdgeEndpoint',
    {
      readonly edgeId: Schema.brand<Schema.NonEmptyString, 'EdgeId'>
      readonly endpoint: Schema.Literals<readonly ['source', 'target']>
      readonly nodeId: Schema.brand<Schema.NonEmptyString, 'NodeId'>
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class MissingEdgeEndpoint extends MissingEdgeEndpoint_base {}
export {}
