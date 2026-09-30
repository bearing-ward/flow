import { Schema } from 'effect'
declare const FlowDeleteInvalidCandidate_base: Schema.Class<
  FlowDeleteInvalidCandidate,
  Schema.TaggedStruct<
    'FlowDeleteInvalidCandidate',
    {
      readonly operationId: Schema.String
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
export declare class FlowDeleteInvalidCandidate extends FlowDeleteInvalidCandidate_base {}
export {}
