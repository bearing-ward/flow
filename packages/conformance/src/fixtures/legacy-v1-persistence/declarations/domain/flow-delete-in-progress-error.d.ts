import { Schema } from 'effect'
declare const FlowDeleteInProgress_base: Schema.Class<
  FlowDeleteInProgress,
  Schema.TaggedStruct<
    'FlowDeleteInProgress',
    {
      readonly operationId: Schema.String
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class FlowDeleteInProgress extends FlowDeleteInProgress_base {}
export {}
