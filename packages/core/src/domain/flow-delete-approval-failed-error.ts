import { Schema } from 'effect'

const tagged = Schema.TaggedError

export class FlowDeleteApprovalFailed extends tagged<FlowDeleteApprovalFailed>()(
  'FlowDeleteApprovalFailed',
  { operationId: Schema.String, reason: Schema.String }
) {}
