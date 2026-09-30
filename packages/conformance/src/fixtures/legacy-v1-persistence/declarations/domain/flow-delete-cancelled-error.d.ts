import { Schema } from 'effect'
declare const FlowDeleteCancelled_base: Schema.Class<
  FlowDeleteCancelled,
  Schema.TaggedStruct<
    'FlowDeleteCancelled',
    {
      readonly operationId: Schema.String
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class FlowDeleteCancelled extends FlowDeleteCancelled_base {}
export {}
