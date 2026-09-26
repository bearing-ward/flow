import { Schema } from 'effect'

import { EdgeIdSchema, HandleIdSchema, NodeIdSchema } from './flow-values.ts'

const tagged = Schema.TaggedError

export class MissingEdgeHandle extends tagged<MissingEdgeHandle>()(
  'MissingEdgeHandle',
  {
    edgeId: EdgeIdSchema,
    endpoint: Schema.Literals(['source', 'target']),
    handleId: HandleIdSchema,
    nodeId: NodeIdSchema,
  }
) {}
