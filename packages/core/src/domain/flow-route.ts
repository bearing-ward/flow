import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { getEdgeGeometry } from './flow-edge-geometry.ts'
import type { FlowEdgeGeometryOptions } from './flow-edge-geometry.ts'
import type { FlowEditTransaction } from './flow-edit.schema.ts'
import { InvalidEdgeRoute } from './flow-route-error.ts'
import {
  FlowEdgeRouteSchema,
  FlowRouteChangeSchema,
} from './flow-route.schema.ts'
import type { FlowEdgeRoute, FlowRouteChange } from './flow-route.schema.ts'
import type { FlowDocument, XYPosition } from './flow.schema.ts'

export {
  getManualRouteGeometry,
  hitTestRoutePoint,
  sampleRoutePoint,
} from './flow-route-geometry.ts'

const segmentDistance = (
  point: XYPosition,
  from: XYPosition,
  to: XYPosition
): number => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = dx * dx + dy * dy

  const t =
    length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - from.x) * dx + (point.y - from.y) * dy) / length
          )
        )

  return Math.hypot(point.x - from.x - t * dx, point.y - from.y - t * dy)
}

const insertionIndex = (
  source: XYPosition,
  target: XYPosition,
  points: readonly XYPosition[],
  point: XYPosition
): number => {
  const vertices = [source, ...points, target]
  let distance = Number.POSITIVE_INFINITY
  let closest = 0

  for (let index = 0; index < vertices.length - 1; index += 1) {
    const from = vertices[index] ?? source
    const to = vertices[index + 1] ?? target
    const next = segmentDistance(point, from, to)

    if (next < distance) {
      distance = next
      closest = index
    }
  }

  return closest
}

/** Produce one route-only patch against current accepted state. Hosts commit once. */
export const editEdgeRoute = (
  document: FlowDocument,
  edgeId: string,
  input: FlowRouteChange,
  options: FlowEdgeGeometryOptions = {}
) =>
  Effect.gen(function* editRoute() {
    const change = yield* S.decodeUnknownEffect(FlowRouteChangeSchema)(input)
    const edge = document.edges.find(({ id }) => id === edgeId)

    if (edge === undefined) {
      return yield* new InvalidEdgeRoute({ edgeId, reason: 'missing-edge' })
    }

    const geometry = getEdgeGeometry(document, edgeId, options)

    if (geometry === undefined) {
      return yield* new InvalidEdgeRoute({ edgeId, reason: 'unresolved-edge' })
    }

    const points = edge.route?.mode === 'manual' ? [...edge.route.points] : []
    let route: FlowEdgeRoute

    switch (change.kind) {
      case 'automatic': {
        route = { mode: 'automatic' }
        break
      }

      case 'manual': {
        route = { mode: 'manual', points: change.points }
        break
      }

      case 'insert': {
        points.splice(
          insertionIndex(
            geometry.source,
            geometry.target,
            points,
            change.point
          ),
          0,
          change.point
        )
        route = yield* S.decodeUnknownEffect(FlowEdgeRouteSchema)({
          mode: 'manual',
          points,
        })
        break
      }

      case 'move':
      case 'remove': {
        if (points[change.index] === undefined) {
          return yield* new InvalidEdgeRoute({
            edgeId,
            reason: 'invalid-index',
          })
        }

        if (change.kind === 'move') {
          points[change.index] = change.point
        } else {
          points.splice(change.index, 1)
        }

        route = yield* S.decodeUnknownEffect(FlowEdgeRouteSchema)(
          points.length === 0
            ? { mode: 'automatic' }
            : { mode: 'manual', points }
        )
        break
      }

      default: {
        const exhaustive: never = change

        return exhaustive
      }
    }

    if (route.mode === 'manual') {
      const vertices = [geometry.source, ...route.points, geometry.target]

      if (
        vertices.every(
          (point) =>
            point.x === geometry.source.x && point.y === geometry.source.y
        )
      ) {
        return yield* new InvalidEdgeRoute({
          edgeId,
          reason: 'degenerate-route',
        })
      }
    }

    const patch =
      route.mode === 'automatic'
        ? { route: { mode: route.mode } }
        : {
            route: {
              mode: route.mode,
              points: route.points.map(({ x, y }) => ({ x, y })),
            },
          }

    return {
      operations: [{ kind: 'update-edge', edgeId: edge.id, patch }],
    } satisfies FlowEditTransaction
  }).pipe(
    Effect.tapError((failure) =>
      Effect.logWarning('Edge route edit rejected').pipe(
        Effect.annotateLogs({
          [FlowAttribute.edgeId]: edgeId,
          [FlowAttribute.failureName]: failure._tag,
        }),
        Effect.withSpan(FlowSpan.editFailure)
      )
    ),
    Effect.withSpan(FlowSpan.editPrepare, {
      attributes: {
        [FlowAttribute.edgeId]: edgeId,
        [FlowAttribute.changeKind]: 'edge-route',
      },
    })
  )
