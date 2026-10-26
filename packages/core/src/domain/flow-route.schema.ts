import { Schema as S } from 'effect'

/** Absolute graph-space waypoint, reusable by edge routes and document bundles. */
export const FlowRoutePointSchema = S.Struct({ x: S.Finite, y: S.Finite })

export type FlowRoutePoint = typeof FlowRoutePointSchema.Type

/** Source-to-target interior order; endpoint anchors are derived, never stored. */
export const FlowRoutePointsSchema = S.NonEmptyArray(
  FlowRoutePointSchema
).check(
  S.makeFilter(
    (points) =>
      points.every((point, index) => {
        const previous = points[index - 1]

        return (
          previous === undefined ||
          point.x !== previous.x ||
          point.y !== previous.y
        )
      }) || 'Adjacent route points must differ'
  )
)

export type FlowRoutePoints = typeof FlowRoutePointsSchema.Type

export const FlowEdgeRouteSchema = S.Union([
  S.Struct({ mode: S.Literal('automatic') }),
  S.Struct({ mode: S.Literal('manual'), points: FlowRoutePointsSchema }),
])

export type FlowEdgeRoute = typeof FlowEdgeRouteSchema.Type

export const FlowRouteChangeSchema = S.Union([
  S.Struct({ kind: S.Literal('automatic') }),
  S.Struct({ kind: S.Literal('manual'), points: FlowRoutePointsSchema }),
  S.Struct({ kind: S.Literal('insert'), point: FlowRoutePointSchema }),
  S.Struct({
    kind: S.Literal('move'),
    index: S.Int.check(S.isGreaterThanOrEqualTo(0)),
    point: FlowRoutePointSchema,
  }),
  S.Struct({
    kind: S.Literal('remove'),
    index: S.Int.check(S.isGreaterThanOrEqualTo(0)),
  }),
])

export type FlowRouteChange = typeof FlowRouteChangeSchema.Type
