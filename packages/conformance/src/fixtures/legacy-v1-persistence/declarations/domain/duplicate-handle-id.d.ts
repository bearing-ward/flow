import { Schema } from 'effect'
declare const DuplicateHandleId_base: Schema.Class<
  DuplicateHandleId,
  Schema.TaggedStruct<
    'DuplicateHandleId',
    {
      readonly handleId: Schema.brand<Schema.NonEmptyString, 'HandleId'>
      readonly nodeId: Schema.brand<Schema.NonEmptyString, 'NodeId'>
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class DuplicateHandleId extends DuplicateHandleId_base {}
export {}
