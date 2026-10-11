import { Effect, Schema as S } from 'effect'

import { validateFlowConnection } from './flow-connection.schema.ts'
import type {
  ConnectionMode,
  FlowConnection,
  InvalidFlowConnection,
} from './flow-connection.schema.ts'
import { resolveEdgeHandles } from './flow-edge.schema.ts'
import { EdgeIdSchema } from './flow-values.ts'
import type { EdgeId, HandleId, NodeId } from './flow-values.ts'
import type { FlowDocument, FlowEdge } from './flow.schema.ts'

export const ReconnectEndpointSchema = S.Literals(['source', 'target'])

export type ReconnectEndpoint = typeof ReconnectEndpointSchema.Type

export const ActiveEdgeReconnectSchema = S.Struct({
  edgeId: EdgeIdSchema,
  endpoint: ReconnectEndpointSchema,
  pointerId: S.Number,
})

export type ActiveEdgeReconnect = typeof ActiveEdgeReconnectSchema.Type

export const canReconnectEdge = (
  edge: FlowEdge,
  endpoint: ReconnectEndpoint
): boolean =>
  edge.reconnectable === undefined ||
  edge.reconnectable === true ||
  edge.reconnectable === endpoint

export const reconnectFlowEdge = (
  document: FlowDocument,
  edgeId: EdgeId,
  endpoint: ReconnectEndpoint,
  nodeId: NodeId,
  handleId: HandleId,
  mode: ConnectionMode = 'strict'
): Effect.Effect<FlowEdge | undefined, InvalidFlowConnection> =>
  Effect.gen(function* reconnectEdge() {
    const edge = document.edges.find((item) => item.id === edgeId)
    const resolved = edge && resolveEdgeHandles(document, edge)

    if (
      edge === undefined ||
      !canReconnectEdge(edge, endpoint) ||
      resolved === undefined
    ) {
      return
    }

    const connection: FlowConnection = {
      source: endpoint === 'source' ? nodeId : edge.source,
      sourceHandle: endpoint === 'source' ? handleId : resolved.sourceHandle.id,
      target: endpoint === 'target' ? nodeId : edge.target,
      targetHandle: endpoint === 'target' ? handleId : resolved.targetHandle.id,
    }

    if (
      connection.source === edge.source &&
      connection.sourceHandle === resolved.sourceHandle.id &&
      connection.target === edge.target &&
      connection.targetHandle === resolved.targetHandle.id
    ) {
      return
    }

    const validated = yield* validateFlowConnection(
      {
        ...document,
        edges: document.edges.filter((item) => item.id !== edgeId),
      },
      connection,
      mode
    )

    return endpoint === 'source'
      ? {
          ...edge,
          source: validated.source,
          sourceHandle: validated.sourceHandle,
        }
      : {
          ...edge,
          target: validated.target,
          targetHandle: validated.targetHandle,
        }
  })
