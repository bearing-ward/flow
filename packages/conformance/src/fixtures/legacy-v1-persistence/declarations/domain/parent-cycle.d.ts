import { Schema } from 'effect'
declare const ParentCycle_base: Schema.Class<
  ParentCycle,
  Schema.TaggedStruct<
    'ParentCycle',
    {
      readonly nodeId: Schema.brand<Schema.NonEmptyString, 'NodeId'>
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class ParentCycle extends ParentCycle_base {}
export {}
