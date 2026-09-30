import { Schema } from 'effect'
declare const MissingParentNode_base: Schema.Class<
  MissingParentNode,
  Schema.TaggedStruct<
    'MissingParentNode',
    {
      readonly nodeId: Schema.brand<Schema.NonEmptyString, 'NodeId'>
      readonly parentId: Schema.brand<Schema.NonEmptyString, 'NodeId'>
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class MissingParentNode extends MissingParentNode_base {}
export {}
