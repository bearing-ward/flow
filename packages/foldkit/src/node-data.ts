import { NodeIdSchema } from '@flow/core'
import type { Schema } from 'effect'

import { Message } from './graph.ts'
import type { GraphMessageData } from './graph.ts'

export interface UpdateNodeDataOptions {
  /** Replace the node's data instead of merging into it. */
  readonly replace?: boolean
}

/**
 * React Flow `updateNodeData` as a graph message a node view can send, for
 * example from `h.OnInput`. It merges `data` into the node's data, or
 * replaces it with `{ replace: true }`, through one typed edit transaction.
 */
export const updateNodeData = (
  nodeId: string,
  data: typeof Schema.JsonObject.Type,
  options: UpdateNodeDataOptions = {}
): GraphMessageData =>
  Message.DispatchCommand({
    command: {
      kind: 'edit-transaction',
      transaction: {
        operations: [
          {
            kind: 'update-node-data',
            nodeId: NodeIdSchema.make(nodeId),
            data,
            replace: options.replace === true,
          },
        ],
      },
    },
  })
