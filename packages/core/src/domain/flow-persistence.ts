import { Effect, Schema as S } from "effect";

import { decodeFlowDocument } from "./flow.schema.ts";
import type { FlowDocument } from "./flow.schema.ts";

const SavedFlowNodeSchema = S.Struct({
  id: S.NonEmptyString,
  label: S.String,
  position: S.Struct({ x: S.Number, y: S.Number }),
  parentId: S.optional(S.NonEmptyString),
  type: S.optional(S.NonEmptyString),
  data: S.optional(S.JsonObject),
  zIndex: S.optional(S.Finite),
  size: S.optional(S.Struct({
    width: S.Finite.check(S.isGreaterThan(0)),
    height: S.Finite.check(S.isGreaterThan(0)),
  })),
  extent: S.optional(S.Literals(["parent"])),
  handles: S.optional(S.Array(S.Struct({
    id: S.NonEmptyString,
    kind: S.Literals(["source", "target"]),
    side: S.Literals(["top", "right", "bottom", "left"]),
  }))),
  selectable: S.optional(S.Boolean),
  focusable: S.optional(S.Boolean),
  ariaLabel: S.optional(S.NonEmptyString),
  hidden: S.optional(S.Boolean),
});

const SavedFlowEdgeSchema = S.Struct({
  id: S.NonEmptyString,
  source: S.NonEmptyString,
  target: S.NonEmptyString,
  type: S.optional(S.NonEmptyString),
  sourceHandle: S.optional(S.NonEmptyString),
  targetHandle: S.optional(S.NonEmptyString),
  path: S.optional(S.Literals(["straight", "bezier", "step", "smoothstep", "simplebezier"])),
  label: S.optional(S.String),
  markerStart: S.optional(S.Literals(["arrow", "arrowclosed"])),
  markerEnd: S.optional(S.Literals(["arrow", "arrowclosed"])),
  stroke: S.optional(S.String),
  strokeWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
  deletable: S.optional(S.Boolean),
  selectable: S.optional(S.Boolean),
  focusable: S.optional(S.Boolean),
  reconnectable: S.optional(S.Union([S.Boolean, S.Literals(["source", "target"])])),
  interactionWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
  ariaLabel: S.optional(S.NonEmptyString),
  hidden: S.optional(S.Boolean),
  zIndex: S.optional(S.Finite),
});

const SavedDocumentBodySchema = S.Struct({
  nodes: S.Array(SavedFlowNodeSchema),
  edges: S.Array(SavedFlowEdgeSchema),
});

export const SavedFlowDocumentSchema = S.Struct({
  version: S.Literal(1),
  document: SavedDocumentBodySchema,
});

export type SavedFlowDocument = typeof SavedFlowDocumentSchema.Type;

/** Encode only declared document fields; transient selection and host state are omitted. */
export const encodeSavedFlowDocument = (document: FlowDocument): SavedFlowDocument =>
  S.encodeSync(SavedFlowDocumentSchema)({
    version: 1,
    document: {
      nodes: document.nodes.map(({ selected: _selected, ...node }) => node),
      edges: document.edges.map(({ selected: _selected, ...edge }) => edge),
    },
  });

/** Decode the versioned envelope, then apply the normal graph integrity workflow. */
export const decodeSavedFlowDocument = (input: unknown) =>
  S.decodeUnknownEffect(SavedFlowDocumentSchema)(input).pipe(
    Effect.flatMap((saved) => decodeFlowDocument(saved.document))
  );
