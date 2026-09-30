import { Schema } from 'effect'
declare const FlowDeleteRevisionConflict_base: Schema.Class<
  FlowDeleteRevisionConflict,
  Schema.TaggedStruct<
    'FlowDeleteRevisionConflict',
    {
      readonly operationId: Schema.String
      readonly expectedRevision: Schema.Finite
      readonly actualRevision: Schema.Finite
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class FlowDeleteRevisionConflict extends FlowDeleteRevisionConflict_base {}
export {}
