import { Schema } from 'effect'

const tagged = Schema.TaggedError

export class FlowDeleteRevisionConflict extends tagged<FlowDeleteRevisionConflict>()(
  'FlowDeleteRevisionConflict',
  {
    operationId: Schema.String,
    expectedRevision: Schema.Finite,
    actualRevision: Schema.Finite,
  }
) {}
