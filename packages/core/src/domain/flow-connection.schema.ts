import { Effect, Schema as S } from "effect";

import { FlowAttribute, FlowSpan } from "../telemetry/flow-telemetry.ts";
import { EdgeIdSchema, HandleIdSchema, NodeIdSchema } from "./flow-values.ts";
import type { FlowDocument, FlowEdge } from "./flow.schema.ts";

export const ActiveConnectionSchema = S.Struct({
  pointerId: S.Number,
  source: NodeIdSchema,
  sourceHandle: HandleIdSchema,
});

export type ActiveConnection = typeof ActiveConnectionSchema.Type;

export const ActiveClickConnectionSchema = S.Struct({
  source: NodeIdSchema,
  sourceHandle: HandleIdSchema,
});

export type ActiveClickConnection = typeof ActiveClickConnectionSchema.Type;

export const FlowConnectionSchema = S.Struct({
  source: NodeIdSchema,
  sourceHandle: HandleIdSchema,
  target: NodeIdSchema,
  targetHandle: HandleIdSchema,
});

export type FlowConnection = typeof FlowConnectionSchema.Type;

export const ConnectionIssueSchema = S.Literals([
  "missing-source-node",
  "missing-target-node",
  "missing-source-handle",
  "missing-target-handle",
  "duplicate-connection",
]);

export type ConnectionIssue = typeof ConnectionIssueSchema.Type;

const tagged = S.TaggedError;

export class InvalidFlowConnection extends tagged<InvalidFlowConnection>()(
  "InvalidFlowConnection",
  {
    reason: ConnectionIssueSchema,
    source: NodeIdSchema,
    sourceHandle: HandleIdSchema,
    target: NodeIdSchema,
    targetHandle: HandleIdSchema,
  }
) {}

export const findConnectionIssue = (
  document: FlowDocument,
  connection: FlowConnection
): ConnectionIssue | undefined => {
  const source = document.nodes.find((node) => node.id === connection.source);

  if (source === undefined) {
    return "missing-source-node";
  }

  const target = document.nodes.find((node) => node.id === connection.target);

  if (target === undefined) {
    return "missing-target-node";
  }

  if (
    !source.handles?.some(
      (handle) =>
        handle.id === connection.sourceHandle && handle.kind === "source"
    )
  ) {
    return "missing-source-handle";
  }

  if (
    !target.handles?.some(
      (handle) =>
        handle.id === connection.targetHandle && handle.kind === "target"
    )
  ) {
    return "missing-target-handle";
  }

  if (
    document.edges.some(
      (edge) =>
        edge.source === connection.source &&
        edge.sourceHandle === connection.sourceHandle &&
        edge.target === connection.target &&
        edge.targetHandle === connection.targetHandle
    )
  ) {
    return "duplicate-connection";
  }
};

export const validateFlowConnection = (
  document: FlowDocument,
  connection: FlowConnection
): Effect.Effect<FlowConnection, InvalidFlowConnection> =>
  Effect.gen(function* validateConnection() {
    const reason = findConnectionIssue(document, connection);

    if (reason === undefined) {
      return connection;
    }

    const attributes = {
      [FlowAttribute.connectionIssue]: reason,
      [FlowAttribute.nodeId]: connection.source,
      [FlowAttribute.handleId]: connection.sourceHandle,
      [FlowAttribute.connectionTargetNodeId]: connection.target,
      [FlowAttribute.connectionTargetHandleId]: connection.targetHandle,
    };

    yield* Effect.annotateCurrentSpan(attributes);
    yield* Effect.logWarning("Rejected flow connection").pipe(
      Effect.annotateLogs(attributes)
    );

    return yield* new InvalidFlowConnection({ ...connection, reason });
  }).pipe(Effect.withSpan(FlowSpan.connectionValidate));

export const nextConnectionEdge = (
  document: FlowDocument,
  connection: FlowConnection
): FlowEdge => {
  const ids = new Set(document.edges.map((edge) => edge.id));
  let ordinal = document.edges.length + 1;
  let id = S.decodeSync(EdgeIdSchema)(`edge-${ordinal}`);

  while (ids.has(id)) {
    ordinal += 1;
    id = S.decodeSync(EdgeIdSchema)(`edge-${ordinal}`);
  }

  return { id, ...connection };
};
