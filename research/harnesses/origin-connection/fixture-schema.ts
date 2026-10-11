import { Schema as S } from 'effect'

export const PointSchema = S.Struct({ x: S.Finite, y: S.Finite })

export const OriginSchema = S.Tuple([S.Finite, S.Finite])

export const HandleKindSchema = S.Literals(['source', 'target'])

export const LineTypeSchema = S.Literals([
  'default',
  'straight',
  'step',
  'smoothstep',
  'simplebezier',
])

export const ProbeRequestSchema = S.Struct({
  name: S.String,
  geometry: S.Boolean,
  origin: OriginSchema,
  mode: S.Literals(['strict', 'loose']),
  threshold: S.Finite,
  zoom: S.Finite,
  lineType: S.NullOr(LineTypeSchema),
  custom: S.Boolean,
  styled: S.Boolean,
  unnamed: S.Boolean,
  reject: S.Boolean,
})

export type ProbeRequest = typeof ProbeRequestSchema.Type

const BoundsSchema = S.Struct({
  ...PointSchema.fields,
  width: S.Finite,
  height: S.Finite,
})

const HandleSchema = S.Struct({
  id: S.NullOr(S.String),
  kind: HandleKindSchema,
  side: S.String,
  ...BoundsSchema.fields,
})

const NodeSchema = S.Struct({
  id: S.String,
  parentId: S.optional(S.String),
  position: PointSchema,
  origin: S.optional(OriginSchema),
  ownOrigin: S.Boolean,
  absolutePosition: PointSchema,
  width: S.Finite,
  height: S.Finite,
  domBounds: BoundsSchema,
  handles: S.Array(HandleSchema),
})

const EdgeSchema = S.Struct({
  source: S.String,
  target: S.String,
  sourceHandle: S.optional(S.NullOr(S.String)),
  targetHandle: S.optional(S.NullOr(S.String)),
  ownSourceHandle: S.Boolean,
  ownTargetHandle: S.Boolean,
})

const ConnectionSchema = S.Struct({
  source: S.String,
  target: S.String,
  sourceHandle: S.NullOr(S.String),
  targetHandle: S.NullOr(S.String),
})

const StateSchema = S.Struct({
  inProgress: S.Boolean,
  isValid: S.NullOr(S.Boolean),
  from: S.NullOr(PointSchema),
  to: S.NullOr(PointSchema),
  pointer: S.NullOr(PointSchema),
  fromNode: S.NullOr(S.String),
  toNode: S.NullOr(S.String),
  fromHandle: S.NullOr(HandleSchema),
  toHandle: S.NullOr(HandleSchema),
  fromPosition: S.NullOr(S.String),
  toPosition: S.NullOr(S.String),
})

const CustomSchema = S.Struct({
  lineType: LineTypeSchema,
  status: S.NullOr(S.String),
  from: PointSchema,
  to: PointSchema,
  pointer: PointSchema,
  fromNode: S.String,
  toNode: S.NullOr(S.String),
  fromHandle: HandleSchema,
  toHandle: S.NullOr(HandleSchema),
  fromPosition: S.String,
  toPosition: S.String,
  ownLineStyle: S.Boolean,
  stroke: S.optional(S.String),
})

const RenderedEdgeSchema = S.Struct({
  start: PointSchema,
  end: PointSchema,
  path: S.String,
})

export const ObservationSchema = S.Struct({
  nodes: S.Array(NodeSchema),
  edges: S.Array(EdgeSchema),
  viewport: S.Struct({ ...PointSchema.fields, zoom: S.Finite }),
  state: StateSchema,
  custom: S.NullOr(CustomSchema),
  starts: S.Number,
  ends: S.Number,
  connections: S.Array(ConnectionSchema),
  errors: S.Array(S.String),
  renderedEdges: S.Array(RenderedEdgeSchema),
  previewPath: S.NullOr(S.String),
  previewClass: S.NullOr(S.String),
  containerStyle: S.NullOr(S.String),
  pathStyle: S.NullOr(S.String),
})

export type Observation = typeof ObservationSchema.Type

export const SampleSchema = S.Struct({
  request: ProbeRequestSchema,
  phases: S.Array(S.Struct({ name: S.String, observation: ObservationSchema })),
})

export type Sample = typeof SampleSchema.Type

export const CaptureSchema = S.Array(SampleSchema)

export const FixtureSchema = S.Struct({
  metadata: S.Struct({
    upstreamSha: S.String,
    version: S.String,
    captureRuns: S.Number,
    browser: S.String,
    capturedAt: S.String,
    normalization: S.String,
  }),
  samples: CaptureSchema,
  repeatedCaptureMatches: S.Boolean,
  unverified: S.Array(S.String),
})
