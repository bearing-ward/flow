import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
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

/** Canonicalize loose target-origin gestures to Flow's directed edge shape. */
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

  if (sourceHandle?.kind !== 'target') {
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
  const normalized = normalizeFlowConnection(document, connection, mode)
  const source = document.nodes.find((node) => node.id === normalized.source)

  if (source === undefined) {
    return 'missing-source-node'
  }

  const target = document.nodes.find((node) => node.id === normalized.target)

  if (target === undefined) {
    return 'missing-target-node'
  }

  const sourceHandle = source.handles?.find(
    (handle) => handle.id === normalized.sourceHandle
  )

  if (
    sourceHandle === undefined ||
    (mode === 'strict' && sourceHandle.kind !== 'source')
  ) {
    return 'missing-source-handle'
  }

  const targetHandle = target.handles?.find(
    (handle) => handle.id === normalized.targetHandle
  )

  if (
    targetHandle === undefined ||
    (mode === 'strict' && targetHandle.kind !== 'target')
  ) {
    return 'missing-target-handle'
  }

  if (
    normalized.source === normalized.target &&
    normalized.sourceHandle === normalized.targetHandle
  ) {
    return 'same-handle'
  }

  if (
    mode === 'loose' &&
    sourceHandle.kind === 'target' &&
    targetHandle.kind === 'target'
  ) {
    return 'unsupported-handle-combination'
  }

  if (
    document.edges.some(
      (edge) =>
        edge.source === normalized.source &&
        edge.sourceHandle === normalized.sourceHandle &&
        edge.target === normalized.target &&
        edge.targetHandle === normalized.targetHandle
    )
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
    const normalized = normalizeFlowConnection(document, connection, mode)
    const reason = findConnectionIssue(document, connection, mode)

    if (reason === undefined) {
      return normalized
    }

    const attributes = {
      [FlowAttribute.connectionIssue]: reason,
      [FlowAttribute.nodeId]: normalized.source,
      [FlowAttribute.handleId]: normalized.sourceHandle,
      [FlowAttribute.connectionTargetNodeId]: normalized.target,
      [FlowAttribute.connectionTargetHandleId]: normalized.targetHandle,
    }

    yield* Effect.annotateCurrentSpan(attributes)
    yield* Effect.logWarning('Rejected flow connection').pipe(
      Effect.annotateLogs(attributes)
    )

    return yield* new InvalidFlowConnection({ ...normalized, reason })
  }).pipe(Effect.withSpan(FlowSpan.connectionValidate))

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
