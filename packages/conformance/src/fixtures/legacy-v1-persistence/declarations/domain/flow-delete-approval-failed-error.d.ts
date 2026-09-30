import { Schema } from 'effect'
declare const FlowDeleteApprovalFailed_base: Schema.Class<
  FlowDeleteApprovalFailed,
  Schema.TaggedStruct<
    'FlowDeleteApprovalFailed',
    {
      readonly operationId: Schema.String
      readonly reason: Schema.String
    }
  >,
  import('effect/Cause').YieldableError
>
export declare class FlowDeleteApprovalFailed extends FlowDeleteApprovalFailed_base {}
export {}
