import { Effect, Exit, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { getFlowRoutingEdges } from './flow-bundle-routing-input.ts'
import { routeFlowBundlePaths } from './flow-bundle-routing.ts'
import { findFlowBundleIssue } from './flow-bundle.schema.ts'
import { getFlowNodeBounds } from './flow-edge-geometry.ts'
import type { FlowEdgeGeometryOptions } from './flow-edge-geometry.ts'
import { flowRoutingRevision } from './flow-routing-geometry.ts'
import {
  FlowRouter,
  FlowRoutingFailure,
  FlowRoutingRequestSchema,
  FlowRoutingResultSchema,
} from './flow-routing.schema.ts'
import type {
  FlowRoutingRequest,
  FlowRoutingResult,
  FlowRoutingObstacle,
  FlowRoutingPort,
} from './flow-routing.schema.ts'
import type { FlowDocument, XYPosition } from './flow.schema.ts'

const portVectors = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
}

export const flowRoutingPortExit = (
  port: FlowRoutingPort,
  distance: number
): XYPosition => ({
  x: port.point.x + portVectors[port.side].x * distance,
  y: port.point.y + portVectors[port.side].y * distance,
})

const defaultRoutingConstraints: FlowRoutingRequest['constraints'] = {
  clearance: 8,
  portOffset: 20,
}

const distanceAlong = (
  from: XYPosition,
  to: XYPosition,
  exit: XYPosition
): number =>
  (exit.x - from.x) * (to.x - from.x) + (exit.y - from.y) * (to.y - from.y)

const decodeRoutingRequest = S.decodeUnknownEffect(FlowRoutingRequestSchema)

export const flowRoutingSegmentIntersects = (
  a: XYPosition,
  b: XYPosition,
  rect: FlowRoutingObstacle,
  clearance = 0
): boolean => {
  const left = rect.x - clearance
  const right = rect.x + rect.width + clearance
  const top = rect.y - clearance
  const bottom = rect.y + rect.height + clearance

  return a.x === b.x
    ? a.x > left &&
        a.x < right &&
        Math.max(a.y, b.y) > top &&
        Math.min(a.y, b.y) < bottom
    : a.y === b.y &&
        a.y > top &&
        a.y < bottom &&
        Math.max(a.x, b.x) > left &&
        Math.min(a.x, b.x) < right
}

export const createFlowRoutingRequest = (
  document: FlowDocument,
  options: FlowEdgeGeometryOptions = {},
  constraints: FlowRoutingRequest['constraints'] = defaultRoutingConstraints
): FlowRoutingRequest => ({
  revision: flowRoutingRevision(document, options),
  ...(document.bundles === undefined
    ? undefined
    : { wireBundles: document.bundles }),
  constraints,
  obstacles: getFlowNodeBounds(document, options).map(({ id, bounds }) => ({
    id,
    ...bounds,
  })),
  connections: getFlowRoutingEdges(document, {
    ...options,
    edgeRouting: undefined,
  }).flatMap((geometry) =>
    geometry.edge.route?.mode === 'manual' &&
    !document.bundles?.some(({ edgeIds }) => edgeIds.includes(geometry.id))
      ? []
      : [
          {
            id: geometry.id,
            source: {
              nodeId: geometry.edge.source,
              point: geometry.source,
              side: geometry.sourcePosition,
            },
            target: {
              nodeId: geometry.edge.target,
              point: geometry.target,
              side: geometry.targetPosition,
            },
          },
        ]
  ),
})

export const validateFlowRoutingResult = (
  request: FlowRoutingRequest,
  result: FlowRoutingResult
): boolean => {
  if (
    !S.is(FlowRoutingResultSchema)(result) ||
    result.revision !== request.revision ||
    result.paths.length !== request.connections.length ||
    new Set(result.paths.map(({ id }) => id)).size !== result.paths.length
  ) {
    return false
  }

  return request.connections.every((connection) => {
    const route = result.paths.find(({ id }) => id === connection.id)

    if (route === undefined) {
      return false
    }

    if (route.kind === 'unreachable') {
      return true
    }

    const [first, second] = route.points
    const last = route.points.at(-1)
    const penultimate = route.points.at(-2)
    const sourceExit = flowRoutingPortExit(connection.source, 1)
    const targetExit = flowRoutingPortExit(connection.target, 1)

    if (
      first?.x !== connection.source.point.x ||
      first.y !== connection.source.point.y ||
      last?.x !== connection.target.point.x ||
      last.y !== connection.target.point.y ||
      second === undefined ||
      penultimate === undefined
    ) {
      return false
    }

    if (
      distanceAlong(first, second, sourceExit) + 1e-9 <
        request.constraints.clearance + request.constraints.portOffset ||
      distanceAlong(last, penultimate, targetExit) + 1e-9 <
        request.constraints.clearance + request.constraints.portOffset
    ) {
      return false
    }

    return route.points.every((point, index) => {
      const previous = route.points[index - 1]

      return (
        previous === undefined ||
        ((point.x === previous.x || point.y === previous.y) &&
          !request.obstacles.some((obstacle) => {
            if (
              (index === 1 && obstacle.id === connection.source.nodeId) ||
              (index === route.points.length - 1 &&
                obstacle.id === connection.target.nodeId)
            ) {
              return false
            }

            return flowRoutingSegmentIntersects(
              previous,
              point,
              obstacle,
              request.constraints.clearance
            )
          }))
      )
    })
  })
}

export const routeFlowEdges = Effect.fn(FlowSpan.editPrepare)(
  function* routeFlowEdges(input: Parameters<typeof decodeRoutingRequest>[0]) {
    const request = yield* decodeRoutingRequest(input).pipe(
      Effect.mapError(
        (error) =>
          new FlowRoutingFailure({
            reason: 'invalid-request',
            message: String(error),
          })
      ),
      Effect.withSpan(FlowSpan.documentDecode)
    )

    const bundleIssue = findFlowBundleIssue({
      edges: request.connections,
      bundles: request.wireBundles,
    })

    if (bundleIssue !== undefined) {
      return yield* new FlowRoutingFailure({
        reason: 'invalid-request',
        message: bundleIssue.reason,
      })
    }

    const router = yield* FlowRouter

    const result = yield* router.route(request).pipe(
      Effect.tapError((error) =>
        Effect.logWarning('Automatic edge routing failed').pipe(
          Effect.annotateLogs({
            [FlowAttribute.failureName]: error._tag,
            [FlowAttribute.failureMessage]: error.message,
          }),
          Effect.withSpan(FlowSpan.editFailure)
        )
      )
    )

    if (!validateFlowRoutingResult(request, result)) {
      return yield* Effect.fail(
        new FlowRoutingFailure({
          reason: 'invalid-result',
          message:
            'Router result violates revision, endpoint, direction or clearance constraints',
        })
      )
    }

    yield* Effect.logInfo('Automatic edge routes derived').pipe(
      Effect.annotateLogs({
        [FlowAttribute.changeKind]: 'edge-routing',
        [FlowAttribute.edgeCount]: result.paths.length,
      })
    )

    if ((request.wireBundles?.length ?? 0) > 0) {
      const derived = yield* routeFlowBundlePaths(
        request,
        router,
        validateFlowRoutingResult
      )

      return {
        ...result,
        bundlePaths: derived.bundlePaths,
        paths: result.paths.map((path) => {
          const reason = derived.unreachable.get(path.id)

          return reason === undefined
            ? path
            : { kind: 'unreachable' as const, id: path.id, reason }
        }),
      }
    }

    return result
  }
)

/** Native Effect interruption plus explicit session cancellation, with latest-result ownership. */
export const createFlowRoutingSession = () => {
  let generation = 0
  let disposed = false

  return {
    cancel: () => {
      generation += 1
    },
    dispose: () => {
      disposed = true
      generation += 1
    },
    run: (request: FlowRoutingRequest, currentRevision: () => string) =>
      Effect.gen(function* runRouting() {
        generation += 1
        const ticket = generation

        if (disposed) {
          return { kind: 'cancelled', revision: request.revision } as const
        }

        const output = yield* Effect.exit(routeFlowEdges(request))

        if (
          disposed ||
          ticket !== generation ||
          request.revision !== currentRevision()
        ) {
          return { kind: 'cancelled', revision: request.revision } as const
        }

        if (Exit.isFailure(output)) {
          return yield* Effect.failCause(output.cause)
        }

        return { kind: 'accepted', result: output.value } as const
      }),
  }
}
