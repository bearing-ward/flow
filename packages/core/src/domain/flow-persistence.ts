import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { findLegacyEndpointKindIssue } from './flow-legacy-handle-compatibility.ts'
import { NodeOriginSchema } from './flow-origin.schema.ts'
import type { Viewport } from './flow-runtime.schema.ts'
import { SavedFlowFormatError } from './flow-save-format-error.ts'
import type { SavedFlowFormatFailureCode } from './flow-save-format-error.ts'
import { createFlowSnapshot } from './flow-snapshot.ts'
import { FlowClassNameSchema, FlowStyleSchema } from './flow-style.schema.ts'
import {
  EdgeIdSchema,
  HandleIdSchema,
  NodeIdSchema,
  XYPositionSchema,
} from './flow-values.ts'
import {
  decodeFlowDocument,
  decodeLegacyFlowDocument,
  FlowEdgeLabelBgPaddingSchema,
  FlowEdgeMarkerOptionSchema,
  FlowHandleSideSchema,
  validateFlowDocument,
} from './flow.schema.ts'
import type { FlowDocument, FlowEdge, FlowNode } from './flow.schema.ts'

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

// Plan 114 presentation fields. Only the v3 envelope stores them.
const presentationNodeKeys = [
  'style',
  'className',
  'sourcePosition',
  'targetPosition',
  'dragHandle',
  'expandParent',
] as const satisfies readonly (keyof FlowNode)[]

const presentationEdgeKeys = [
  'style',
  'className',
  'animated',
  'labelStyle',
  'labelShowBg',
  'labelBgStyle',
  'labelBgPadding',
  'labelBgBorderRadius',
] as const satisfies readonly (keyof FlowEdge)[]

const isMarkerKind = (
  marker: FlowEdge['markerStart']
): marker is 'arrow' | 'arrowclosed' | undefined =>
  marker === undefined || marker === 'arrow' || marker === 'arrowclosed'

const hasPresentationFields = (document: FlowDocument): boolean =>
  document.nodes.some((node) =>
    presentationNodeKeys.some((key) => Object.hasOwn(node, key))
  ) ||
  document.edges.some(
    (edge) =>
      presentationEdgeKeys.some((key) => Object.hasOwn(edge, key)) ||
      !isMarkerKind(edge.markerStart) ||
      !isMarkerKind(edge.markerEnd)
  )

type LegacyMarkerEdge = Omit<FlowEdge, 'markerStart' | 'markerEnd'> & {
  readonly markerStart?: 'arrow' | 'arrowclosed' | undefined
  readonly markerEnd?: 'arrow' | 'arrowclosed' | undefined
}

const isLegacyMarkerEdge = (
  edge: FlowEdge
): edge is FlowEdge & LegacyMarkerEdge =>
  isMarkerKind(edge.markerStart) && isMarkerKind(edge.markerEnd)

/**
 * Narrow an accepted v1/v2 edge to marker kinds, unchanged (own undefined
 * keys included). Callers route marker configurations to v3 first.
 */
const legacyMarkerEdge = (edge: FlowEdge): LegacyMarkerEdge => {
  if (isLegacyMarkerEdge(edge)) {
    return edge
  }

  const { markerStart: _start, markerEnd: _end, ...rest } = edge

  return rest
}

const versionedFormatReason = (
  document: FlowDocument
): SavedFlowFormatFailureCode | undefined => {
  if (
    Object.hasOwn(document, 'nodeOrigin') ||
    document.nodes.some((node) => Object.hasOwn(node, 'origin'))
  ) {
    return 'origin-requires-versioned-session'
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
    return 'native-fields-require-versioned-session'
  }

  if (findLegacyEndpointKindIssue(document) !== undefined) {
    return 'noncanonical-handles-require-versioned-session'
  }

  if (hasPresentationFields(document)) {
    return 'presentation-fields-require-versioned-session'
  }
}

const assertLegacyFormat = (document: FlowDocument): void => {
  // Supported format reasons describe valid graph extensions, never missing IDs.
  Effect.runSync(validateFlowDocument(document))
  const reason = versionedFormatReason(document)

  if (reason !== undefined) {
    rejectLegacyFormat(reason)
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

  return structuredClone(
    S.encodeSync(SavedFlowDocumentSchema)({
      version: 1,
      document: {
        nodes: document.nodes.map(({ selected: _selected, ...node }) => node),
        edges: document.edges.map(({ selected: _selected, ...edge }) =>
          legacyMarkerEdge(edge)
        ),
      },
    })
  )
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
    Effect.flatMap((saved) => decodeLegacyFlowDocument(saved.document)),
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
      decodeLegacyFlowDocument(saved.document).pipe(
        Effect.map((document) => createFlowSnapshot(document, saved.viewport))
      )
    ),
    Effect.withSpan(FlowSpan.documentDecode, {
      attributes: { [FlowAttribute.inputKind]: 'legacy-session' },
    })
  )

// The complete unreleased v2 projection is frozen independently of future live fields.
const SavedOriginFlowNodeSchema = S.Struct({
  ...SavedFlowNodeSchema.fields,
  origin: S.optional(NodeOriginSchema),
  connectable: S.optional(S.Boolean),
  ariaRole: S.optional(S.String),
  ariaLabel: S.optional(S.String),
  ariaDescription: S.optional(S.String),
})

const SavedOriginFlowEdgeSchema = S.Struct({
  ...SavedFlowEdgeSchema.fields,
  ariaRole: S.optional(S.String),
  ariaLabel: S.optional(S.String),
})

const SavedOriginDocumentBodySchema = S.Struct({
  nodeOrigin: S.optional(NodeOriginSchema),
  nodes: S.Array(SavedOriginFlowNodeSchema),
  edges: S.Array(SavedOriginFlowEdgeSchema),
})

// Decode the complete expanded literal1 envelope before ordered integrity.
// Unknown/transient keys still strip; known semantic fields remain inspectable.
const ExpandedLegacyDocumentSchema = S.Struct({
  version: S.Literal(1),
  document: SavedOriginDocumentBodySchema,
})

const ExpandedLegacySessionSchema = S.Struct({
  ...ExpandedLegacyDocumentSchema.fields,
  viewport: SavedViewportSchema,
})

export const SavedOriginFlowDocumentSchema = S.Struct({
  version: S.Literal(2),
  document: SavedOriginDocumentBodySchema,
})

export const SavedOriginFlowSessionSchema = S.Struct({
  ...SavedOriginFlowDocumentSchema.fields,
  viewport: SavedViewportSchema,
})

// v3 adds the Plan 114 presentation fields; selection and `measured` stay transient.
const SavedPresentationFlowNodeSchema = S.Struct({
  ...SavedOriginFlowNodeSchema.fields,
  style: S.optional(FlowStyleSchema),
  className: S.optional(FlowClassNameSchema),
  sourcePosition: S.optional(FlowHandleSideSchema),
  targetPosition: S.optional(FlowHandleSideSchema),
  dragHandle: S.optional(S.NonEmptyString),
  expandParent: S.optional(S.Boolean),
})

const SavedPresentationFlowEdgeSchema = S.Struct({
  ...SavedOriginFlowEdgeSchema.fields,
  markerStart: S.optional(FlowEdgeMarkerOptionSchema),
  markerEnd: S.optional(FlowEdgeMarkerOptionSchema),
  style: S.optional(FlowStyleSchema),
  className: S.optional(FlowClassNameSchema),
  animated: S.optional(S.Boolean),
  labelStyle: S.optional(FlowStyleSchema),
  labelShowBg: S.optional(S.Boolean),
  labelBgStyle: S.optional(FlowStyleSchema),
  labelBgPadding: S.optional(FlowEdgeLabelBgPaddingSchema),
  labelBgBorderRadius: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
})

const SavedPresentationDocumentBodySchema = S.Struct({
  nodeOrigin: S.optional(NodeOriginSchema),
  nodes: S.Array(SavedPresentationFlowNodeSchema),
  edges: S.Array(SavedPresentationFlowEdgeSchema),
})

export const SavedPresentationFlowDocumentSchema = S.Struct({
  version: S.Literal(3),
  document: SavedPresentationDocumentBodySchema,
})

export const SavedPresentationFlowSessionSchema = S.Struct({
  ...SavedPresentationFlowDocumentSchema.fields,
  viewport: SavedViewportSchema,
})

export type SavedPresentationFlowDocument =
  typeof SavedPresentationFlowDocumentSchema.Encoded

export type SavedPresentationFlowSession =
  typeof SavedPresentationFlowSessionSchema.Encoded

export const SavedVersionedFlowDocumentSchema = S.Union([
  SavedFlowDocumentSchema,
  SavedOriginFlowDocumentSchema,
  SavedPresentationFlowDocumentSchema,
])

export const SavedVersionedFlowSessionSchema = S.Union([
  SavedFlowSessionSchema,
  SavedOriginFlowSessionSchema,
  SavedPresentationFlowSessionSchema,
])

export type SavedOriginFlowDocument =
  typeof SavedOriginFlowDocumentSchema.Encoded

export type SavedOriginFlowSession = typeof SavedOriginFlowSessionSchema.Encoded

export type SavedVersionedFlowDocument =
  typeof SavedVersionedFlowDocumentSchema.Encoded

export type SavedVersionedFlowSession =
  typeof SavedVersionedFlowSessionSchema.Encoded

/**
 * Choose the oldest envelope that represents the document: v1, then the v2
 * origin/native body, then the v3 body for presentation fields.
 */
export const encodeVersionedFlowDocument = (
  document: FlowDocument
): SavedVersionedFlowDocument => {
  Effect.runSync(validateFlowDocument(document))

  if (versionedFormatReason(document) === undefined) {
    return encodeSavedFlowDocument(document)
  }

  if (hasPresentationFields(document)) {
    return structuredClone(
      S.encodeSync(SavedPresentationFlowDocumentSchema)({
        version: 3,
        document,
      })
    )
  }

  return structuredClone(
    S.encodeSync(SavedOriginFlowDocumentSchema)({
      version: 2,
      document: { ...document, edges: document.edges.map(legacyMarkerEdge) },
    })
  )
}

export const encodeVersionedFlowSession = (
  document: FlowDocument,
  viewport: Viewport
): SavedVersionedFlowSession => ({
  ...encodeVersionedFlowDocument(document),
  viewport: S.encodeSync(SavedViewportSchema)(viewport),
})

const VersionedEnvelopeHeaderSchema = S.Struct({
  version: S.Literals([1, 2, 3]),
  document: S.Unknown,
})

/** Validate once, inspect known semantics, then project frozen literal1 fields. */
const decodeAdditiveLegacyBody = (input: FlowDocument) =>
  Effect.gen(function* decodeExpandedLegacyBody() {
    const document = yield* decodeLegacyFlowDocument(input)
    const code = versionedFormatReason(document)

    if (code !== undefined) {
      return yield* new SavedFlowFormatError({ code })
    }

    return yield* S.decodeUnknownEffect(SavedDocumentBodySchema)(document)
  })

/** Decode unknown supported envelopes through the same live graph authority. */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the public/schema decode boundary for untrusted persistence input.
export const decodeVersionedFlowDocument = (input: unknown) =>
  Effect.gen(function* decodeVersionedDocument() {
    const header = yield* S.decodeUnknownEffect(VersionedEnvelopeHeaderSchema)(
      input
    )

    if (header.version === 1) {
      const saved = yield* S.decodeUnknownEffect(ExpandedLegacyDocumentSchema)(
        input
      )

      return yield* decodeAdditiveLegacyBody(saved.document)
    }

    const saved = yield* S.decodeUnknownEffect(
      header.version === 2
        ? SavedOriginFlowDocumentSchema
        : SavedPresentationFlowDocumentSchema
    )(input)

    return yield* decodeFlowDocument(saved.document)
  }).pipe(
    Effect.tapError((failure) =>
      Effect.logError('Versioned document decode failed').pipe(
        Effect.annotateLogs({
          [FlowAttribute.inputKind]: 'versioned-document',
          [FlowAttribute.failureName]: failure._tag,
          [FlowAttribute.failureMessage]: failure.message,
        })
      )
    ),
    Effect.withSpan(FlowSpan.documentDecode, {
      attributes: { [FlowAttribute.inputKind]: 'versioned-document' },
    })
  )

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the public/schema decode boundary for untrusted persistence input.
export const decodeVersionedFlowSession = (input: unknown) =>
  Effect.gen(function* decodeVersionedSession() {
    const header = yield* S.decodeUnknownEffect(VersionedEnvelopeHeaderSchema)(
      input
    )

    if (header.version === 1) {
      const saved = yield* S.decodeUnknownEffect(ExpandedLegacySessionSchema)(
        input
      )

      const document = yield* decodeAdditiveLegacyBody(saved.document)

      return createFlowSnapshot(document, saved.viewport)
    }

    const saved = yield* S.decodeUnknownEffect(
      header.version === 2
        ? SavedOriginFlowSessionSchema
        : SavedPresentationFlowSessionSchema
    )(input)

    const document = yield* decodeFlowDocument(saved.document)

    return createFlowSnapshot(document, saved.viewport)
  }).pipe(
    Effect.tapError((failure) =>
      Effect.logError('Versioned session decode failed').pipe(
        Effect.annotateLogs({
          [FlowAttribute.inputKind]: 'versioned-session',
          [FlowAttribute.failureName]: failure._tag,
          [FlowAttribute.failureMessage]: failure.message,
        })
      )
    ),
    Effect.withSpan(FlowSpan.documentDecode, {
      attributes: { [FlowAttribute.inputKind]: 'versioned-session' },
    })
  )
