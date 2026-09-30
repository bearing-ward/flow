import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import type { Viewport } from './flow-runtime.schema.ts'
import { SavedFlowFormatError } from './flow-save-format-error.ts'
import type { SavedFlowFormatFailureCode } from './flow-save-format-error.ts'
import { createFlowSnapshot } from './flow-snapshot.ts'
import {
  EdgeIdSchema,
  HandleIdSchema,
  NodeIdSchema,
  XYPositionSchema,
} from './flow-values.ts'
import { decodeFlowDocument } from './flow.schema.ts'
import type { FlowDocument } from './flow.schema.ts'

// Literal-v1 fields and nested constraints are frozen to de36b4f. Live node/edge
// schemas may evolve independently. IDs and XYPosition retain their stable contracts.
const SavedFlowNodeSchema = S.Struct({
  id: NodeIdSchema,
  label: S.String,
  position: XYPositionSchema,
  parentId: S.optional(NodeIdSchema),
  type: S.optional(S.NonEmptyString),
  data: S.optional(S.JsonObject),
  zIndex: S.optional(S.Finite),
  size: S.optional(
    S.Struct({
      width: S.Finite.check(S.isGreaterThan(0)),
      height: S.Finite.check(S.isGreaterThan(0)),
    })
  ),
  extent: S.optional(S.Literals(['parent'])),
  handles: S.optional(
    S.Array(
      S.Struct({
        id: HandleIdSchema,
        kind: S.Literals(['source', 'target']),
        side: S.Literals(['top', 'right', 'bottom', 'left']),
      })
    )
  ),
  selectable: S.optional(S.Boolean),
  focusable: S.optional(S.Boolean),
  draggable: S.optional(S.Boolean),
  deletable: S.optional(S.Boolean),
  ariaLabel: S.optional(S.NonEmptyString),
  ariaDescription: S.optional(S.NonEmptyString),
  hidden: S.optional(S.Boolean),
})

const SavedFlowEdgeSchema = S.Struct({
  id: EdgeIdSchema,
  source: NodeIdSchema,
  target: NodeIdSchema,
  type: S.optional(S.NonEmptyString),
  sourceHandle: S.optional(HandleIdSchema),
  targetHandle: S.optional(HandleIdSchema),
  path: S.optional(
    S.Literals(['straight', 'bezier', 'step', 'smoothstep', 'simplebezier'])
  ),
  label: S.optional(S.String),
  data: S.optional(S.JsonObject),
  markerStart: S.optional(S.Literals(['arrow', 'arrowclosed'])),
  markerEnd: S.optional(S.Literals(['arrow', 'arrowclosed'])),
  stroke: S.optional(S.String.check(S.isPattern(/^#[0-9a-fA-F]{6}$/u))),
  strokeWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
  deletable: S.optional(S.Boolean),
  selectable: S.optional(S.Boolean),
  focusable: S.optional(S.Boolean),
  reconnectable: S.optional(
    S.Union([S.Boolean, S.Literals(['source', 'target'])])
  ),
  interactionWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
  ariaLabel: S.optional(S.NonEmptyString),
  hidden: S.optional(S.Boolean),
  zIndex: S.optional(S.Finite),
})

const SavedViewportSchema = S.Struct({
  x: S.Number,
  y: S.Number,
  zoom: S.Finite.check(S.isGreaterThan(0)),
})

const rejectLegacyFormat = (code: SavedFlowFormatFailureCode): never => {
  Effect.runSync(
    Effect.logError(
      'Legacy saved format cannot represent document semantics'
    ).pipe(
      Effect.annotateLogs({
        [FlowAttribute.inputKind]: 'legacy-save',
        [FlowAttribute.failureName]: 'SavedFlowFormatError',
        [FlowAttribute.failureMessage]: code,
      }),
      Effect.withSpan(FlowSpan.editFailure)
    )
  )
  throw new SavedFlowFormatError({ code })
}

const assertLegacyFormat = (document: FlowDocument): void => {
  if (
    Object.hasOwn(document, 'nodeOrigin') ||
    document.nodes.some((node) => Object.hasOwn(node, 'origin'))
  ) {
    rejectLegacyFormat('origin-requires-versioned-session')
  }

  if (
    document.nodes.some(
      (node) =>
        Object.hasOwn(node, 'connectable') ||
        Object.hasOwn(node, 'ariaRole') ||
        node.ariaDescription === '' ||
        node.ariaLabel === ''
    ) ||
    document.edges.some(
      (edge) => Object.hasOwn(edge, 'ariaRole') || edge.ariaLabel === ''
    )
  ) {
    rejectLegacyFormat('native-fields-require-versioned-session')
  }
}

const SavedDocumentBodySchema = S.Struct({
  nodes: S.Array(SavedFlowNodeSchema),
  edges: S.Array(SavedFlowEdgeSchema),
})

/** Session envelope composes the v1 saved document with viewport state. */
export const SavedFlowSessionSchema = S.Struct({
  version: S.Literal(1),
  document: SavedDocumentBodySchema,
  viewport: SavedViewportSchema,
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
): SavedFlowDocument => {
  assertLegacyFormat(document)

  return S.encodeSync(SavedFlowDocumentSchema)({
    version: 1,
    document: {
      nodes: document.nodes.map(({ selected: _selected, ...node }) => node),
      edges: document.edges.map(({ selected: _selected, ...edge }) => edge),
    },
  })
}

/** Decode the versioned envelope, then apply the normal graph integrity workflow. */
export const decodeSavedFlowDocument = <Input>(savedFlowDocument: Input) =>
  S.decodeUnknownEffect(SavedFlowDocumentSchema)(savedFlowDocument).pipe(
    Effect.tapError((failure) =>
      Effect.logError('Legacy document envelope decode failed').pipe(
        Effect.annotateLogs({
          [FlowAttribute.inputKind]: 'legacy-document',
          [FlowAttribute.failureName]: failure._tag,
          [FlowAttribute.failureMessage]: failure.message,
        })
      )
    ),
    Effect.flatMap((saved) => decodeFlowDocument(saved.document)),
    Effect.withSpan(FlowSpan.documentDecode, {
      attributes: { [FlowAttribute.inputKind]: 'legacy-document' },
    })
  )

/** Encode accepted graph content and viewport; selection remains transient. */
export const encodeSavedFlowSession = (
  document: FlowDocument,
  viewport: Viewport
): SavedFlowSession => ({
  ...encodeSavedFlowDocument(document),
  viewport: S.encodeSync(SavedViewportSchema)(viewport),
})

/** Decode and validate a saved session through the normal document boundary. */
export const decodeSavedFlowSession = <Input>(savedFlowSession: Input) =>
  S.decodeUnknownEffect(SavedFlowSessionSchema)(savedFlowSession).pipe(
    Effect.tapError((failure) =>
      Effect.logError('Legacy session envelope decode failed').pipe(
        Effect.annotateLogs({
          [FlowAttribute.inputKind]: 'legacy-session',
          [FlowAttribute.failureName]: failure._tag,
          [FlowAttribute.failureMessage]: failure.message,
        })
      )
    ),
    Effect.flatMap((saved) =>
      decodeFlowDocument(saved.document).pipe(
        Effect.map((document) => createFlowSnapshot(document, saved.viewport))
      )
    ),
    Effect.withSpan(FlowSpan.documentDecode, {
      attributes: { [FlowAttribute.inputKind]: 'legacy-session' },
    })
  )
