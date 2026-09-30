import { Schema as S } from 'effect'

import { getHandleConnections } from './flow-graph.ts'
import { EdgeIdSchema, HandleIdSchema, NodeIdSchema } from './flow-values.ts'
import type { HandleId, NodeId } from './flow-values.ts'
import type { FlowDocument, FlowEdge, FlowNode } from './flow.schema.ts'

export const FlowNodeDataSchema = S.Struct({
  id: NodeIdSchema,
  type: S.optional(S.String),
  data: S.optional(S.JsonObject),
})

/** A serializable connection projection suitable for reactive host selectors. */
export interface FlowNodeConnection {
  readonly edgeId: FlowEdge['id']
  readonly source: FlowEdge['source']
  readonly target: FlowEdge['target']
  readonly sourceHandle: FlowEdge['sourceHandle']
  readonly targetHandle: FlowEdge['targetHandle']
}

export interface FlowNodeConnectionOptions {
  readonly nodeId: NodeId
  readonly type?: 'source' | 'target'
  readonly handleId?: HandleId | null
}

/** Accepted-state connection delta, kept separate from host callback lifecycles. */
export interface FlowNodeConnectionDelta {
  readonly disconnected: readonly FlowNodeConnection[]
  readonly connected: readonly FlowNodeConnection[]
}

/** Compare connection projections by edge identity and endpoints/handles. */
export const diffNodeConnections = (
  previous: readonly FlowNodeConnection[],
  current: readonly FlowNodeConnection[]
): FlowNodeConnectionDelta => {
  const previousById = new Map(
    previous.map((connection) => [connection.edgeId, connection])
  )

  const currentById = new Map(
    current.map((connection) => [connection.edgeId, connection])
  )

  const same = (left: FlowNodeConnection, right: FlowNodeConnection): boolean =>
    left.source === right.source &&
    left.target === right.target &&
    left.sourceHandle === right.sourceHandle &&
    left.targetHandle === right.targetHandle

  return {
    disconnected: previous.filter((connection) => {
      const next = currentById.get(connection.edgeId)

      return next === undefined || !same(connection, next)
    }),
    connected: current.filter((connection) => {
      const before = previousById.get(connection.edgeId)

      return before === undefined || !same(before, connection)
    }),
  }
}

export const FlowNodeConnectionOptionsSchema = S.Struct({
  nodeId: NodeIdSchema,
  type: S.optional(S.Literals(['source', 'target'])),
  handleId: S.optional(S.NullOr(HandleIdSchema)),
})

/** Query for a point-in-time, directional handle connection read. */
export const FlowHandleConnectionsQuerySchema = S.Struct({
  nodeId: NodeIdSchema,
  type: S.Literals(['source', 'target']),
  id: S.optional(S.NullOr(S.Union([S.Literal(''), HandleIdSchema]))),
})

export type FlowHandleConnectionsQuery =
  typeof FlowHandleConnectionsQuerySchema.Encoded

export const FlowNodeConnectionSchema = S.Struct({
  edgeId: EdgeIdSchema,
  source: NodeIdSchema,
  target: NodeIdSchema,
  sourceHandle: S.optional(HandleIdSchema),
  targetHandle: S.optional(HandleIdSchema),
})

export type FlowNodeData = typeof FlowNodeDataSchema.Type

/** Selected graph members projected from accepted document state. */
interface SelectableMember {
  readonly id: string
  readonly selected?: boolean | undefined
}

export interface FlowSelection<
  NodeType extends SelectableMember = FlowNode,
  EdgeType extends SelectableMember = FlowEdge,
> {
  readonly nodes: readonly NodeType[]
  readonly edges: readonly EdgeType[]
}

/** Select the current selected node and edge collections in document order. */
export const selectFlowSelection = <
  NodeType extends SelectableMember,
  EdgeType extends SelectableMember,
>(document: {
  readonly nodes: readonly NodeType[]
  readonly edges: readonly EdgeType[]
}): FlowSelection<NodeType, EdgeType> => ({
  nodes: document.nodes.filter((node) => node.selected === true),
  edges: document.edges.filter((edge) => edge.selected === true),
})

/** Selection subscriptions change when selected IDs or their order changes. */
export const flowSelectionEqual = (
  previous: FlowSelection<SelectableMember, SelectableMember>,
  current: FlowSelection<SelectableMember, SelectableMember>
): boolean =>
  previous.nodes.length === current.nodes.length &&
  previous.edges.length === current.edges.length &&
  previous.nodes.every((node, index) => node.id === current.nodes[index]?.id) &&
  previous.edges.every((edge, index) => edge.id === current.edges[index]?.id)

/** Select data in requested ID order. Missing IDs are omitted. */
export const selectNodesData = (
  document: FlowDocument,
  nodeIds: readonly NodeId[]
): readonly FlowNodeData[] => {
  const nodesById = new Map(document.nodes.map((node) => [node.id, node]))

  return nodeIds.flatMap((id) => {
    const node = nodesById.get(id)

    return node === undefined
      ? []
      : [{ id: node.id, type: node.type, data: node.data }]
  })
}

/** Select edges touching a node, optionally constrained to one direction/handle. */
export const selectNodeConnections = (
  document: FlowDocument,
  options: FlowNodeConnectionOptions
): readonly FlowNodeConnection[] =>
  document.edges.flatMap((edge) => {
    const matchesSource = edge.source === options.nodeId
    const matchesTarget = edge.target === options.nodeId

    const matchesType =
      options.type === undefined ||
      (options.type === 'source' ? matchesSource : matchesTarget)

    let edgeHandle = edge.targetHandle

    if (
      options.type === 'source' ||
      (options.type === undefined && matchesSource)
    ) {
      edgeHandle = edge.sourceHandle
    }

    const matchesHandle =
      options.handleId === undefined ||
      (options.handleId === null
        ? edgeHandle === undefined
        : edgeHandle === options.handleId)

    return (matchesSource || matchesTarget) && matchesType && matchesHandle
      ? [
          {
            edgeId: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
          },
        ]
      : []
  })

/** Select edges connected through one direction; null/empty IDs mean all handles. */
export const selectHandleConnections = (
  document: FlowDocument,
  query: typeof FlowHandleConnectionsQuerySchema.Type
): readonly FlowEdge[] =>
  getHandleConnections(
    query.nodeId,
    query.id === undefined || query.id === null || query.id === ''
      ? undefined
      : query.id,
    query.type,
    document.edges
  )
