import { Effect, Match, Schema as S } from "effect";

import { FlowAttribute, FlowSpan } from "../telemetry/flow-telemetry.ts";
import { DuplicateEdgeId } from "./duplicate-edge-id.ts";
import { DuplicateHandleId } from "./duplicate-handle-id.ts";
import { DuplicateNodeId } from "./duplicate-node-id.ts";
import {
  EdgeIdSchema,
  HandleIdSchema,
  NodeIdSchema,
  XYPositionSchema,
} from "./flow-values.ts";
import type { EdgeId, NodeId } from "./flow-values.ts";
import { MissingEdgeEndpoint } from "./missing-edge-endpoint.ts";
import { MissingEdgeHandle } from "./missing-edge-handle.ts";
import { MissingParentNode } from "./missing-parent-node.ts";
import { ParentCycle } from "./parent-cycle.ts";
import { ParentExtentWithoutParent } from "./parent-extent-without-parent.ts";
import { SelfParentNode } from "./self-parent-node.ts";

export { DuplicateEdgeId } from "./duplicate-edge-id.ts";

export { DuplicateHandleId } from "./duplicate-handle-id.ts";

export { DuplicateNodeId } from "./duplicate-node-id.ts";

export { MissingEdgeEndpoint } from "./missing-edge-endpoint.ts";

export { MissingEdgeHandle } from "./missing-edge-handle.ts";

export { MissingParentNode } from "./missing-parent-node.ts";

export { ParentCycle } from "./parent-cycle.ts";

export { ParentExtentWithoutParent } from "./parent-extent-without-parent.ts";

export { SelfParentNode } from "./self-parent-node.ts";

export {
  EdgeIdSchema,
  HandleIdSchema,
  NodeIdSchema,
  XYPositionSchema,
} from "./flow-values.ts";

export type { EdgeId, HandleId, NodeId, XYPosition } from "./flow-values.ts";

export const FlowHandleSchema = S.Struct({
  id: HandleIdSchema,
  kind: S.Literals(["source", "target"]),
  side: S.Literals(["top", "right", "bottom", "left"]),
});

export type FlowHandle = typeof FlowHandleSchema.Type;

export const NodeSizeSchema = S.Struct({
  width: S.Finite.check(S.isGreaterThan(0)),
  height: S.Finite.check(S.isGreaterThan(0)),
});

export type NodeSize = typeof NodeSizeSchema.Type;

export const FlowNodeSchema = S.Struct({
  id: NodeIdSchema,
  label: S.String,
  position: XYPositionSchema,
  parentId: S.optional(NodeIdSchema),
  type: S.optional(S.NonEmptyString),
  data: S.optional(S.JsonObject),
  zIndex: S.optional(S.Finite),
  size: S.optional(NodeSizeSchema),
  extent: S.optional(S.Literals(["parent"])),
  handles: S.optional(S.Array(FlowHandleSchema)),
  selected: S.optional(S.Boolean),
  selectable: S.optional(S.Boolean),
  focusable: S.optional(S.Boolean),
  draggable: S.optional(S.Boolean),
  ariaLabel: S.optional(S.NonEmptyString),
  ariaDescription: S.optional(S.NonEmptyString),
  hidden: S.optional(S.Boolean),
});

export type FlowNode = typeof FlowNodeSchema.Type;

export const FlowEdgePathSchema = S.Literals([
  "straight",
  "bezier",
  "step",
  "smoothstep",
  "simplebezier",
]);

export type FlowEdgePath = typeof FlowEdgePathSchema.Type;

export const FlowEdgeMarkerSchema = S.Literals(["arrow", "arrowclosed"]);

export type FlowEdgeMarker = typeof FlowEdgeMarkerSchema.Type;

export const FlowEdgeReconnectableSchema = S.Union([
  S.Boolean,
  S.Literals(["source", "target"]),
]);

export type FlowEdgeReconnectable = typeof FlowEdgeReconnectableSchema.Type;

export const FlowEdgeStrokeSchema = S.String.check(
  S.isPattern(/^#[0-9a-fA-F]{6}$/u)
);

export const FlowEdgeSchema = S.Struct({
  id: EdgeIdSchema,
  source: NodeIdSchema,
  target: NodeIdSchema,
  type: S.optional(S.NonEmptyString),
  sourceHandle: S.optional(HandleIdSchema),
  targetHandle: S.optional(HandleIdSchema),
  path: S.optional(FlowEdgePathSchema),
  label: S.optional(S.String),
  markerStart: S.optional(FlowEdgeMarkerSchema),
  markerEnd: S.optional(FlowEdgeMarkerSchema),
  stroke: S.optional(FlowEdgeStrokeSchema),
  strokeWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
  selected: S.optional(S.Boolean),
  deletable: S.optional(S.Boolean),
  selectable: S.optional(S.Boolean),
  focusable: S.optional(S.Boolean),
  reconnectable: S.optional(FlowEdgeReconnectableSchema),
  interactionWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
  ariaLabel: S.optional(S.NonEmptyString),
  hidden: S.optional(S.Boolean),
  zIndex: S.optional(S.Finite),
});

export type FlowEdge = typeof FlowEdgeSchema.Type;

export const FlowDocumentSchema = S.Struct({
  edges: S.Array(FlowEdgeSchema),
  nodes: S.Array(FlowNodeSchema),
});

export type FlowDocument = typeof FlowDocumentSchema.Type;

export const FlowDocumentIntegrityErrorSchema = S.Union([
  DuplicateNodeId,
  DuplicateEdgeId,
  DuplicateHandleId,
  MissingEdgeEndpoint,
  MissingEdgeHandle,
  MissingParentNode,
  SelfParentNode,
  ParentCycle,
  ParentExtentWithoutParent,
]);

export type FlowDocumentIntegrityError =
  typeof FlowDocumentIntegrityErrorSchema.Type;

const decodeUnknownFlowDocument = S.decodeUnknownEffect(FlowDocumentSchema);

const findDocumentIntegrityError = (
  document: FlowDocument
): FlowDocumentIntegrityError | undefined => {
  const nodesById = new Map<NodeId, FlowNode>();

  for (const node of document.nodes) {
    if (nodesById.has(node.id)) {
      return new DuplicateNodeId({ nodeId: node.id });
    }

    nodesById.set(node.id, node);
  }

  for (const node of document.nodes) {
    if (node.parentId === undefined) {
      if (node.extent === "parent") {
        return new ParentExtentWithoutParent({ nodeId: node.id });
      }
      continue;
    }

    if (node.parentId === node.id) {
      return new SelfParentNode({ nodeId: node.id });
    }

    if (!nodesById.has(node.parentId)) {
      return new MissingParentNode({ nodeId: node.id, parentId: node.parentId });
    }
  }

  const visited = new Set<NodeId>();
  const visiting = new Set<NodeId>();
  const visitParentChain = (nodeId: NodeId): NodeId | undefined => {
    if (visiting.has(nodeId)) return nodeId;
    if (visited.has(nodeId)) return;

    visiting.add(nodeId);
    const parentId = nodesById.get(nodeId)?.parentId;
    const cycleNode = parentId === undefined ? undefined : visitParentChain(parentId);
    visiting.delete(nodeId);
    visited.add(nodeId);
    return cycleNode;
  };

  for (const node of document.nodes) {
    const cycleNode = visitParentChain(node.id);
    if (cycleNode !== undefined) return new ParentCycle({ nodeId: cycleNode });
  }

  const edgeIds = new Set<EdgeId>();

  for (const edge of document.edges) {
    if (edgeIds.has(edge.id)) {
      return new DuplicateEdgeId({ edgeId: edge.id });
    }

    edgeIds.add(edge.id);
  }

  for (const node of document.nodes) {
    const handleIds = new Set<string>();

    for (const handle of node.handles ?? []) {
      if (handleIds.has(handle.id)) {
        return new DuplicateHandleId({ handleId: handle.id, nodeId: node.id });
      }

      handleIds.add(handle.id);
    }
  }

  for (const edge of document.edges) {
    if (!nodesById.has(edge.source)) {
      return new MissingEdgeEndpoint({
        edgeId: edge.id,
        endpoint: "source",
        nodeId: edge.source,
      });
    }

    if (!nodesById.has(edge.target)) {
      return new MissingEdgeEndpoint({
        edgeId: edge.id,
        endpoint: "target",
        nodeId: edge.target,
      });
    }

    for (const endpoint of ["source", "target"] as const) {
      const handleId =
        endpoint === "source" ? edge.sourceHandle : edge.targetHandle;

      if (handleId === undefined) {
        continue;
      }

      const nodeId = edge[endpoint];
      const node = nodesById.get(nodeId);

      const handle = node?.handles?.find(
        (candidate) => candidate.id === handleId
      );

      if (handle?.kind !== endpoint) {
        return new MissingEdgeHandle({
          edgeId: edge.id,
          endpoint,
          handleId,
          nodeId,
        });
      }
    }
  }
};

const integrityAttributes = (error: FlowDocumentIntegrityError) =>
  Match.value(error).pipe(
    Match.tagsExhaustive({
      DuplicateNodeId: (duplicate) => ({
        [FlowAttribute.documentIssue]: "duplicate-node-id",
        [FlowAttribute.nodeId]: duplicate.nodeId,
      }),
      DuplicateEdgeId: (duplicate) => ({
        [FlowAttribute.documentIssue]: "duplicate-edge-id",
        [FlowAttribute.edgeId]: duplicate.edgeId,
      }),
      DuplicateHandleId: (duplicate) => ({
        [FlowAttribute.documentIssue]: "duplicate-handle-id",
        [FlowAttribute.nodeId]: duplicate.nodeId,
        [FlowAttribute.handleId]: duplicate.handleId,
      }),
      MissingEdgeEndpoint: (missing) => ({
        [FlowAttribute.documentIssue]: "missing-edge-endpoint",
        [FlowAttribute.edgeId]: missing.edgeId,
        [FlowAttribute.edgeEndpoint]: missing.endpoint,
        [FlowAttribute.nodeId]: missing.nodeId,
      }),
      MissingEdgeHandle: (missing) => ({
        [FlowAttribute.documentIssue]: "missing-edge-handle",
        [FlowAttribute.edgeId]: missing.edgeId,
        [FlowAttribute.edgeEndpoint]: missing.endpoint,
        [FlowAttribute.nodeId]: missing.nodeId,
        [FlowAttribute.handleId]: missing.handleId,
      }),
      MissingParentNode: (missing) => ({
        [FlowAttribute.documentIssue]: `missing-parent-node:${missing.parentId}`,
        [FlowAttribute.nodeId]: missing.nodeId,
      }),
      SelfParentNode: (invalid) => ({
        [FlowAttribute.documentIssue]: "self-parent-node",
        [FlowAttribute.nodeId]: invalid.nodeId,
      }),
      ParentCycle: (invalid) => ({
        [FlowAttribute.documentIssue]: "parent-cycle",
        [FlowAttribute.nodeId]: invalid.nodeId,
      }),
      ParentExtentWithoutParent: (invalid) => ({
        [FlowAttribute.documentIssue]: "parent-extent-without-parent",
        [FlowAttribute.nodeId]: invalid.nodeId,
      }),
    })
  );

export const validateFlowDocument = (
  document: FlowDocument
): Effect.Effect<FlowDocument, FlowDocumentIntegrityError> =>
  Effect.gen(function* validateDocumentIntegrity() {
    const error = findDocumentIntegrityError(document);

    if (error === undefined) {
      return document;
    }

    const attributes = integrityAttributes(error);
    yield* Effect.logWarning("Rejected flow document integrity").pipe(
      Effect.annotateLogs(attributes)
    );
    yield* Effect.annotateCurrentSpan(attributes);

    return yield* error;
  }).pipe(Effect.withSpan(FlowSpan.documentIntegrity));

export type FlowDocumentInput = Parameters<typeof decodeUnknownFlowDocument>[0];

export const decodeFlowDocument = (input: FlowDocumentInput) =>
  decodeUnknownFlowDocument(input).pipe(
    Effect.flatMap(validateFlowDocument),
    Effect.tap((document) =>
      Effect.gen(function* annotateDecodedDocument() {
        const attributes = {
          [FlowAttribute.nodeCount]: document.nodes.length,
          [FlowAttribute.edgeCount]: document.edges.length,
        };

        yield* Effect.annotateCurrentSpan(attributes);
        yield* Effect.logDebug("Decoded flow document").pipe(
          Effect.annotateLogs(attributes)
        );
      })
    ),
    Effect.withSpan(FlowSpan.documentDecode)
  );
