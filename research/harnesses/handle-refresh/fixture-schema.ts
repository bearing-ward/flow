import { Schema as S } from 'effect'

const PointSchema = S.Struct({ x: S.Finite, y: S.Finite })

const NodeGeometrySchema = S.Struct({
  absolutePosition: PointSchema,
  width: S.Finite,
  height: S.Finite,
  center: PointSchema,
})

export const HandleRefreshObservationSchema = S.Struct({
  source: NodeGeometrySchema,
  target: NodeGeometrySchema,
  endpoints: S.Struct({ start: PointSchema, end: PointSchema }),
})

export const HandleRefreshCasesSchema = S.Struct({
  initial: HandleRefreshObservationSchema,
  moved: HandleRefreshObservationSchema,
  added: S.Array(S.String),
  removed: S.Array(S.String),
  nodePositions: S.Array(S.Struct({ id: S.String, position: PointSchema })),
  viewport: S.Struct({ x: S.Finite, y: S.Finite, zoom: S.Finite }),
})

export const HandleRefreshFixtureSchema = S.Struct({
  metadata: S.Struct({
    framework: S.Literal('React'),
    package: S.Literal('@xyflow/react'),
    version: S.String,
    upstreamSha: S.String,
    browser: S.String,
    normalization: S.String,
    capturedAt: S.String,
    captureRuns: S.Literal(2),
  }),
  cases: HandleRefreshCasesSchema,
  repeatedCaptureMatches: S.Literal(true),
})
