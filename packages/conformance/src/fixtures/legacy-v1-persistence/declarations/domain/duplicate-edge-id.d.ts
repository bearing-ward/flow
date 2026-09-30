import { Schema } from 'effect'
declare const DuplicateEdgeId_base: Schema.Class<
  DuplicateEdgeId,
  Schema.TaggedStruct<
    'DuplicateEdgeId',
    {
      readonly edgeId: Schema.brand<Schema.NonEmptyString, 'EdgeId'>
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class DuplicateEdgeId extends DuplicateEdgeId_base {}
export {}
