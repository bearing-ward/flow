import { Schema } from 'effect'

import { NodeIdSchema } from './flow-values.ts'

const tagged = Schema.TaggedError

export class SelfParentNode extends tagged<SelfParentNode>()('SelfParentNode', {
  nodeId: NodeIdSchema,
}) {}
