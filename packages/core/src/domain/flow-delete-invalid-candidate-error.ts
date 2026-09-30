import { Schema } from 'effect'

import { EdgeIdSchema, NodeIdSchema } from './flow.schema.ts'

const tagged = Schema.TaggedError

export class FlowDeleteInvalidCandidate extends tagged<FlowDeleteInvalidCandidate>()(
  'FlowDeleteInvalidCandidate',
  {
    operationId: Schema.String,
    nodeIds: Schema.Array(NodeIdSchema),
    edgeIds: Schema.Array(EdgeIdSchema),
  }
) {}
