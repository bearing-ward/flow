import { Effect, Schema as S } from "effect";

import { decodeFlowDocument, FlowEdgeSchema, FlowNodeSchema } from "./flow.schema.ts";
import type { FlowDocument } from "./flow.schema.ts";

const SavedFlowNodeSchema = FlowNodeSchema.mapFields(({ selected: _selected, ...fields }) => fields);

const SavedFlowEdgeSchema = FlowEdgeSchema.mapFields(({ selected: _selected, ...fields }) => fields);

const SavedDocumentBodySchema = S.Struct({
  nodes: S.Array(SavedFlowNodeSchema),
  edges: S.Array(SavedFlowEdgeSchema),
});

export const SavedFlowDocumentSchema = S.Struct({
  version: S.Literal(1),
  document: SavedDocumentBodySchema,
});

export type SavedFlowDocument = typeof SavedFlowDocumentSchema.Encoded;

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
