import { Schema } from 'effect'
declare const ParentExtentWithoutParent_base: Schema.Class<
  ParentExtentWithoutParent,
  Schema.TaggedStruct<
    'ParentExtentWithoutParent',
    {
      readonly nodeId: Schema.brand<Schema.NonEmptyString, 'NodeId'>
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class ParentExtentWithoutParent extends ParentExtentWithoutParent_base {}
export {}
