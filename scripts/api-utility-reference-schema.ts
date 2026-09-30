import { Schema as S } from 'effect'

export const pinnedApiUtilityReferenceSha =
  '0a1f9575b25679f2880175de8d3eae21aedde921'

const PositionSchema = S.Struct({ x: S.Number, y: S.Number })

const DimensionsSchema = S.Struct({ width: S.Number, height: S.Number })

const ReferenceNodeSchema = S.Struct({
  id: S.String,
  position: PositionSchema,
  data: S.optional(S.JsonObject),
  selected: S.optional(S.Boolean),
  dragging: S.optional(S.Boolean),
  measured: S.optional(DimensionsSchema),
  width: S.optional(S.Number),
  height: S.optional(S.Number),
  resizing: S.optional(S.Boolean),
})

const ReferenceEdgeSchema = S.Struct({
  id: S.String,
  source: S.String,
  target: S.String,
  sourceHandle: S.optional(S.NullOr(S.String)),
  targetHandle: S.optional(S.NullOr(S.String)),
  selected: S.optional(S.Boolean),
})

const DeletionEventSchema = S.Union([
  S.Struct({
    type: S.Literal('before:start'),
    nodes: S.Array(S.String),
    edges: S.Array(S.String),
  }),
  S.Struct({ type: S.Literal('before:resolved') }),
  S.Struct({
    type: S.Literal('edges'),
    beforeCompleted: S.Boolean,
    ids: S.Array(S.String),
  }),
  S.Struct({
    type: S.Literal('nodes'),
    beforeCompleted: S.Boolean,
    ids: S.Array(S.String),
  }),
  S.Struct({
    type: S.Literal('delete'),
    beforeCompleted: S.Boolean,
    nodes: S.Array(S.String),
    edges: S.Array(S.String),
  }),
])

export const ApiUtilityReferenceCasesSchema = S.Struct({
  utilities: S.Struct({
    applyNodeChanges: S.Array(ReferenceNodeSchema),
    applyEdgeChanges: S.Array(ReferenceEdgeSchema),
    inputsUnchanged: S.Struct({
      nodes: S.Array(ReferenceNodeSchema),
      edges: S.Array(ReferenceEdgeSchema),
    }),
    addEdge: S.Array(ReferenceEdgeSchema),
    duplicateAddReturnsSameArray: S.Boolean,
    reconnectEdge: S.Array(ReferenceEdgeSchema),
    missingReconnectReturnsSameArray: S.Boolean,
    typePredicates: S.Struct({
      node: S.Boolean,
      edge: S.Boolean,
      null: S.Struct({ node: S.Boolean, edge: S.Boolean }),
    }),
  }),
  deletion: S.Struct({
    events: S.Array(DeletionEventSchema),
    result: S.Struct({ nodes: S.Array(S.String), edges: S.Array(S.String) }),
  }),
})

export const ApiUtilityReferenceFixtureSchema = S.Struct({
  metadata: S.Struct({
    framework: S.Literal('React'),
    package: S.Literal('@xyflow/react'),
    version: S.String,
    upstreamSha: S.Literal(pinnedApiUtilityReferenceSha),
    browser: S.String,
    normalization: S.String,
    capturedAt: S.String,
  }),
  cases: ApiUtilityReferenceCasesSchema,
  repeatedCaptureMatches: S.Literal(true),
})
