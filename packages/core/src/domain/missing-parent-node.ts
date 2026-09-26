import { Schema } from 'effect'

import { NodeIdSchema } from './flow-values.ts'

const tagged = Schema.TaggedError

export class MissingParentNode extends tagged<MissingParentNode>()(
  'MissingParentNode',
  { nodeId: NodeIdSchema, parentId: NodeIdSchema }
) {}
