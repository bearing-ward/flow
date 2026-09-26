import { Schema } from 'effect'

import { EdgeIdSchema, NodeIdSchema } from './flow-values.ts'

const tagged = Schema.TaggedError

export class MissingEdgeEndpoint extends tagged<MissingEdgeEndpoint>()(
  'MissingEdgeEndpoint',
  {
    edgeId: EdgeIdSchema,
    endpoint: Schema.Literals(['source', 'target']),
    nodeId: NodeIdSchema,
  }
) {}
