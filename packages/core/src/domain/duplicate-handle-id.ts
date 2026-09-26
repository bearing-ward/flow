import { Schema } from 'effect'

import { HandleIdSchema, NodeIdSchema } from './flow-values.ts'

const tagged = Schema.TaggedError

export class DuplicateHandleId extends tagged<DuplicateHandleId>()(
  'DuplicateHandleId',
  { handleId: HandleIdSchema, nodeId: NodeIdSchema }
) {}
