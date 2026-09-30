import { Schema } from 'effect'

const tagged = Schema.TaggedError

export class FlowDeleteInProgress extends tagged<FlowDeleteInProgress>()(
  'FlowDeleteInProgress',
  { operationId: Schema.String }
) {}
