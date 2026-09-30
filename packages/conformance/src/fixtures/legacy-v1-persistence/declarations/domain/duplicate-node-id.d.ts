import { Schema } from 'effect'
declare const DuplicateNodeId_base: Schema.Class<
  DuplicateNodeId,
  Schema.TaggedStruct<
    'DuplicateNodeId',
    {
      readonly nodeId: Schema.brand<Schema.NonEmptyString, 'NodeId'>
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class DuplicateNodeId extends DuplicateNodeId_base {}
export {}
