import type { Effect } from 'effect'
import { Context, Schema as S } from 'effect'

import { FlowBundleSchema } from './flow-bundle.schema.ts'
import { FlowRoutePointSchema } from './flow-route.schema.ts'

export const FlowRoutingObstacleSchema = S.Struct({
  id: S.String,
  x: S.Finite,
  y: S.Finite,
  width: S.Finite.check(S.isGreaterThan(0)),
  height: S.Finite.check(S.isGreaterThan(0)),
})

export const FlowRoutingPortSchema = S.Struct({
  nodeId: S.String,
  point: FlowRoutePointSchema,
  side: S.Literals(['top', 'right', 'bottom', 'left']),
})

export const FlowRoutingRequestSchema = S.Struct({
  wireBundles: S.optional(S.Array(FlowBundleSchema)),
  revision: S.String,
  obstacles: S.Array(FlowRoutingObstacleSchema),
  connections: S.Array(
    S.Struct({
      id: S.String,
      source: FlowRoutingPortSchema,
      target: FlowRoutingPortSchema,
    })
  ),
  constraints: S.Struct({
    clearance: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
    portOffset: S.Finite.check(S.isGreaterThan(0)),
  }),
})

export const FlowRoutingPathSchema = S.Union([
  S.Struct({
    kind: S.Literal('routed'),
    id: S.String,
    points: S.Array(FlowRoutePointSchema).check(S.isMinLength(2)),
  }),
  S.Struct({ kind: S.Literal('unreachable'), id: S.String, reason: S.String }),
])

export const FlowRoutingResultSchema = S.Struct({
  bundlePaths: S.optional(
    S.Array(
      S.Struct({ id: S.String, path: S.String, label: FlowRoutePointSchema })
    )
  ),
  revision: S.String,
  paths: S.Array(FlowRoutingPathSchema),
})

export type FlowRoutingRequest = typeof FlowRoutingRequestSchema.Type

export type FlowRoutingResult = typeof FlowRoutingResultSchema.Type

export type FlowRoutingPort = typeof FlowRoutingPortSchema.Type

export type FlowRoutingObstacle = typeof FlowRoutingObstacleSchema.Type

const makeRoutingError = S.TaggedError

export class FlowRoutingFailure extends makeRoutingError<FlowRoutingFailure>()(
  'FlowRoutingFailure',
  {
    reason: S.Literals(['invalid-request', 'engine', 'invalid-result']),
    message: S.String,
  }
) {}

export const FlowRouter = Context.Service<
  'flow/FlowRouter',
  {
    readonly route: (
      request: FlowRoutingRequest
    ) => Effect.Effect<FlowRoutingResult, FlowRoutingFailure>
  }
>('flow/FlowRouter')

export type FlowRouterService = typeof FlowRouter.Service
