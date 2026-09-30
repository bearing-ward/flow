import { Schema } from 'effect'
declare const SelfParentNode_base: Schema.Class<
  SelfParentNode,
  Schema.TaggedStruct<
    'SelfParentNode',
    {
      readonly nodeId: Schema.brand<Schema.NonEmptyString, 'NodeId'>
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class SelfParentNode extends SelfParentNode_base {}
export {}
