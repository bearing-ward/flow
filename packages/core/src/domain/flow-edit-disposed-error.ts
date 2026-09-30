import { Schema } from 'effect'

const tagged = Schema.TaggedError

export class FlowEditDisposed extends tagged<FlowEditDisposed>()(
  'FlowEditDisposed',
  {}
) {}
