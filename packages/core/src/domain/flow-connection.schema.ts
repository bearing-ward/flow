import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { resolveEdgeHandles } from './flow-edge.schema.ts'
import { EdgeIdSchema, HandleIdSchema, NodeIdSchema } from './flow-values.ts'
import type { FlowDocument, FlowEdge } from './flow.schema.ts'

export const ActiveConnectionSchema = S.Struct({
  pointerId: S.Number,
  source: NodeIdSchema,
  sourceHandle: HandleIdSchema,
})

export type ActiveConnection = typeof ActiveConnectionSchema.Type

export const ActiveClickConnectionSchema = S.Struct({
  source: NodeIdSchema,
  sourceHandle: HandleIdSchema,
})

export type ActiveClickConnection = typeof ActiveClickConnectionSchema.Type

export const ConnectionModeSchema = S.Literals(['strict', 'loose'])

export type ConnectionMode = typeof ConnectionModeSchema.Type

export const FlowConnectionSchema = S.Struct({
  source: NodeIdSchema,
  sourceHandle: HandleIdSchema,
  target: NodeIdSchema,
  targetHandle: HandleIdSchema,
})

export type FlowConnection = typeof FlowConnectionSchema.Type

const FlowHandleGestureSchema = S.Struct({
  fromNodeId: NodeIdSchema,
  fromHandleId: HandleIdSchema,
  toNodeId: NodeIdSchema,
  toHandleId: HandleIdSchema,
})

type FlowHandleGesture = typeof FlowHandleGestureSchema.Type

export const ConnectionIssueSchema = S.Literals([
  'missing-source-node',
  'missing-target-node',
  'missing-source-handle',
  'missing-target-handle',
  'duplicate-connection',
  'same-handle',
  'unsupported-handle-combination',
])

export type ConnectionIssue = typeof ConnectionIssueSchema.Type

const tagged = S.TaggedError

export class InvalidFlowConnection extends tagged<InvalidFlowConnection>()(
  'InvalidFlowConnection',
  {
    reason: ConnectionIssueSchema,
    source: NodeIdSchema,
    sourceHandle: HandleIdSchema,
    target: NodeIdSchema,
    targetHandle: HandleIdSchema,
  }
) {}

/** Canonicalize only reversed opposite-kind pairs; directed validation never uses this. */
export const normalizeFlowConnection = (
  document: FlowDocument,
  connection: FlowConnection,
  mode: ConnectionMode = 'strict'
): FlowConnection => {
  if (mode !== 'loose') {
    return connection
  }

  const source = document.nodes.find((node) => node.id === connection.source)

  const sourceHandle = source?.handles?.find(
    (handle) => handle.id === connection.sourceHandle
  )

  const target = document.nodes.find((node) => node.id === connection.target)

  const targetHandle = target?.handles?.find(
    (handle) => handle.id === connection.targetHandle
  )

  if (sourceHandle?.kind !== 'target' || targetHandle?.kind !== 'source') {
    return connection
  }

  return {
    source: connection.target,
    sourceHandle: connection.targetHandle,
    target: connection.source,
    targetHandle: connection.sourceHandle,
  }
}

export const findConnectionIssue = (
  document: FlowDocument,
  connection: FlowConnection,
  mode: ConnectionMode = 'strict'
): ConnectionIssue | undefined => {
  const source = document.nodes.find((node) => node.id === connection.source)

  if (source === undefined) {
    return 'missing-source-node'
  }

  const target = document.nodes.find((node) => node.id === connection.target)

  if (target === undefined) {
    return 'missing-target-node'
  }

  const sourceHandle = source.handles?.find(
    (handle) => handle.id === connection.sourceHandle
  )

  if (
    sourceHandle === undefined ||
    (mode === 'strict' && sourceHandle.kind !== 'source')
  ) {
    return 'missing-source-handle'
  }

  const targetHandle = target.handles?.find(
    (handle) => handle.id === connection.targetHandle
  )

  if (
    targetHandle === undefined ||
    (mode === 'strict' && targetHandle.kind !== 'target')
  ) {
    return 'missing-target-handle'
  }

  if (
    connection.source === connection.target &&
    connection.sourceHandle === connection.targetHandle
  ) {
    return 'same-handle'
  }

  if (
    document.edges.some((edge) => {
      if (
        edge.source !== connection.source ||
        edge.target !== connection.target
      ) {
        return false
      }

      const resolved = resolveEdgeHandles(document, edge)

      return (
        resolved?.sourceHandle.id === connection.sourceHandle &&
        resolved.targetHandle.id === connection.targetHandle
      )
    })
  ) {
    return 'duplicate-connection'
  }
}

export const validateFlowConnection = (
  document: FlowDocument,
  connection: FlowConnection,
  mode: ConnectionMode = 'strict'
): Effect.Effect<FlowConnection, InvalidFlowConnection> =>
  Effect.gen(function* validateConnection() {
    const reason = findConnectionIssue(document, connection, mode)

    if (reason === undefined) {
      return connection
    }

    const attributes = {
      [FlowAttribute.connectionIssue]: reason,
      [FlowAttribute.nodeId]: connection.source,
      [FlowAttribute.handleId]: connection.sourceHandle,
      [FlowAttribute.connectionTargetNodeId]: connection.target,
      [FlowAttribute.connectionTargetHandleId]: connection.targetHandle,
    }

    yield* Effect.annotateCurrentSpan(attributes)
    yield* Effect.logWarning('Rejected flow connection').pipe(
      Effect.annotateLogs(attributes)
    )

    return yield* new InvalidFlowConnection({ ...connection, reason })
  }).pipe(Effect.withSpan(FlowSpan.connectionValidate))

/** Construct fresh gesture direction once, then validate the directed pair. */
export const connectionFromHandleGesture = (
  {
    document,
    ...gesture
  }: FlowHandleGesture & { readonly document: FlowDocument },
  mode: ConnectionMode = 'strict'
): Effect.Effect<FlowConnection, InvalidFlowConnection> => {
  const fromHandle = document.nodes
    .find((node) => node.id === gesture.fromNodeId)
    ?.handles?.find((handle) => handle.id === gesture.fromHandleId)

  const from = { nodeId: gesture.fromNodeId, handleId: gesture.fromHandleId }
  const to = { nodeId: gesture.toNodeId, handleId: gesture.toHandleId }
  const source = fromHandle?.kind === 'target' ? to : from
  const target = fromHandle?.kind === 'target' ? from : to

  return validateFlowConnection(
    document,
    {
      source: source.nodeId,
      sourceHandle: source.handleId,
      target: target.nodeId,
      targetHandle: target.handleId,
    },
    mode
  )
}

export const nextConnectionEdge = (
  document: FlowDocument,
  connection: FlowConnection
): FlowEdge => {
  const ids = new Set(document.edges.map((edge) => edge.id))
  let ordinal = document.edges.length + 1
  let id = S.decodeSync(EdgeIdSchema)(`edge-${ordinal}`)

  while (ids.has(id)) {
    ordinal += 1
    id = S.decodeSync(EdgeIdSchema)(`edge-${ordinal}`)
  }

  return { id, ...connection }
}
