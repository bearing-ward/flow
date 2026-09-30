import { Schema } from 'effect'

const tagged = Schema.TaggedError

export class FlowDeleteCancelled extends tagged<FlowDeleteCancelled>()(
  'FlowDeleteCancelled',
  { operationId: Schema.String }
) {}
