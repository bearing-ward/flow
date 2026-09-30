import { Effect, Schema as S } from 'effect'

import { ViewportSchema } from './flow-runtime.schema.ts'
import type { Viewport } from './flow-runtime.schema.ts'
import { createFlowSnapshot } from './flow-snapshot.ts'
import {
  decodeFlowDocument,
  FlowEdgeSchema,
  FlowNodeSchema,
} from './flow.schema.ts'
import type { FlowDocument } from './flow.schema.ts'

const SavedFlowNodeSchema = FlowNodeSchema.mapFields(
  ({ selected: _selected, ...fields }) => fields
)

const SavedFlowEdgeSchema = FlowEdgeSchema.mapFields(
  ({ selected: _selected, ...fields }) => fields
)

const SavedDocumentBodySchema = S.Struct({
  nodes: S.Array(SavedFlowNodeSchema),
  edges: S.Array(SavedFlowEdgeSchema),
})

/** Session envelope composes the v1 saved document with viewport state. */
export const SavedFlowSessionSchema = S.Struct({
  version: S.Literal(1),
  document: SavedDocumentBodySchema,
  viewport: ViewportSchema,
})

export type SavedFlowSession = typeof SavedFlowSessionSchema.Encoded

export const SavedFlowDocumentSchema = S.Struct({
  version: S.Literal(1),
  document: SavedDocumentBodySchema,
})

export type SavedFlowDocument = typeof SavedFlowDocumentSchema.Encoded

/** Encode only declared document fields; transient selection and host state are omitted. */
export const encodeSavedFlowDocument = (
  document: FlowDocument
): SavedFlowDocument =>
  S.encodeSync(SavedFlowDocumentSchema)({
    version: 1,
    document: {
      nodes: document.nodes.map(({ selected: _selected, ...node }) => node),
      edges: document.edges.map(({ selected: _selected, ...edge }) => edge),
    },
  })

/** Decode the versioned envelope, then apply the normal graph integrity workflow. */
export const decodeSavedFlowDocument = <Input>(savedFlowDocument: Input) =>
  S.decodeUnknownEffect(SavedFlowDocumentSchema)(savedFlowDocument).pipe(
    Effect.flatMap((saved) => decodeFlowDocument(saved.document))
  )

/** Encode accepted graph content and viewport; selection remains transient. */
export const encodeSavedFlowSession = (
  document: FlowDocument,
  viewport: Viewport
): SavedFlowSession => ({
  ...encodeSavedFlowDocument(document),
  viewport: S.encodeSync(ViewportSchema)(viewport),
})

/** Decode and validate a saved session through the normal document boundary. */
export const decodeSavedFlowSession = <Input>(savedFlowSession: Input) =>
  S.decodeUnknownEffect(SavedFlowSessionSchema)(savedFlowSession).pipe(
    Effect.flatMap((saved) =>
      decodeFlowDocument(saved.document).pipe(
        Effect.map((document) => createFlowSnapshot(document, saved.viewport))
      )
    )
  )
