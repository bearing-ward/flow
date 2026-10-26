import { Effect } from 'effect'

import {
  FLOW_BUNDLE_LANE_SPACING,
  flowBundleTieLane,
} from './flow-bundle-geometry.ts'
import type { FlowBundle } from './flow-bundle.schema.ts'
import { FlowRoutingFailure } from './flow-routing.schema.ts'
import type {
  FlowRouterService,
  FlowRoutingPort,
  FlowRoutingRequest,
  FlowRoutingResult,
} from './flow-routing.schema.ts'
import type { XYPosition } from './flow.schema.ts'

type Trunk = FlowRoutingResult['paths'][number]

const side = (tangent: XYPosition): FlowRoutingPort['side'] => {
  if (tangent.x !== 0) {
    return tangent.x > 0 ? 'right' : 'left'
  }

  return tangent.y > 0 ? 'bottom' : 'top'
}

/** Axis-aligned segments use the same strict rectangle-clearance boundary as the router. */
export const flowBundleSegmentBlocked = (
  source: XYPosition,
  target: XYPosition,
  obstacles: FlowRoutingRequest['obstacles'],
  clearance: number
): boolean =>
  obstacles.some(
    (obstacle) =>
      Math.max(source.x, target.x) > obstacle.x - clearance &&
      Math.min(source.x, target.x) < obstacle.x + obstacle.width + clearance &&
      Math.max(source.y, target.y) > obstacle.y - clearance &&
      Math.min(source.y, target.y) < obstacle.y + obstacle.height + clearance
  )

const directTrunk = (
  source: ReturnType<typeof flowBundleTieLane>['exit'],
  target: ReturnType<typeof flowBundleTieLane>['entry']
): boolean => {
  const dx = target.point.x - source.point.x
  const dy = target.point.y - source.point.y

  return (
    source.tangent.x === target.tangent.x &&
    source.tangent.y === target.tangent.y &&
    dx * source.tangent.y - dy * source.tangent.x === 0 &&
    dx * source.tangent.x + dy * source.tangent.y > 0
  )
}

/** Virtual ports must never inherit a caller-owned obstacle's endpoint exemptions. */
export const flowBundlePortNamespace = (
  request: FlowRoutingRequest,
  seed: string
): string => {
  let prefix = seed

  while (request.obstacles.some(({ id }) => id.startsWith(prefix))) {
    prefix += ':'
  }

  return prefix
}

/** Route the entire ribbon corridor once, reserving room for its outer lanes and rounding. */
export const routeFlowBundleTrunks = (input: {
  readonly request: FlowRoutingRequest
  readonly bundle: FlowBundle
  readonly endpoints: {
    readonly source: XYPosition
    readonly target: XYPosition
  }
  readonly router: FlowRouterService
  readonly validate: (
    request: FlowRoutingRequest,
    result: FlowRoutingResult
  ) => boolean
}) =>
  Effect.gen(function* routeBundleTrunks() {
    const { request, bundle, endpoints, router, validate } = input
    const trunks = new Map<number, Trunk>()
    const namespace = flowBundlePortNamespace(request, 'bundle:')

    const opposite = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    } satisfies Record<FlowRoutingPort['side'], FlowRoutingPort['side']>

    for (let index = 1; index < bundle.ties.length; index += 1) {
      const { exit: source } = flowBundleTieLane(
        bundle,
        index - 1,
        0,
        endpoints,
        true
      )

      const { entry: target } = flowBundleTieLane(
        bundle,
        index,
        0,
        endpoints,
        true
      )

      const id = `${namespace}${bundle.id}:trunk:${index}`

      const halfWidth =
        ((bundle.edgeIds.length - 1) * FLOW_BUNDLE_LANE_SPACING) / 2

      if (
        directTrunk(source, target) &&
        !flowBundleSegmentBlocked(
          source.point,
          target.point,
          request.obstacles,
          request.constraints.clearance + halfWidth
        )
      ) {
        trunks.set(index * 3 + 1, {
          kind: 'routed',
          id,
          points: [source.point, target.point],
        })
        continue
      }

      const leg: FlowRoutingRequest = {
        revision: request.revision,
        obstacles: request.obstacles,
        constraints: {
          clearance: request.constraints.clearance + halfWidth + 4,
          portOffset: 1,
        },
        connections: [
          {
            id,
            source: {
              nodeId: `${id}:source`,
              point: source.point,
              side: side(source.tangent),
            },
            target: {
              nodeId: `${id}:target`,
              point: target.point,
              side: opposite[side(target.tangent)],
            },
          },
        ],
      }

      const result = yield* router.route(leg)

      if (!validate(leg, result)) {
        return yield* new FlowRoutingFailure({
          reason: 'invalid-result',
          message: 'Bundle trunk violates the reserved ribbon corridor',
        })
      }

      const [path] = result.paths
      trunks.set(
        index * 3 + 1,
        path ?? { kind: 'unreachable', id, reason: 'Missing bundle trunk' }
      )
    }

    return trunks
  })

const normal = (from: XYPosition, to: XYPosition): XYPosition => ({
  x: -Math.sign(to.y - from.y),
  y: Math.sign(to.x - from.x),
})

/** Miter offsets keep all orthogonal lanes on one side of each obstacle in their original order. */
export const flowBundleTrunkLane = (trunk: Trunk, offset: number): Trunk => {
  if (trunk.kind === 'unreachable') {
    return trunk
  }

  const unique = trunk.points.filter((point, index, all) => {
    const previous = all[index - 1]

    return (
      previous === undefined || previous.x !== point.x || previous.y !== point.y
    )
  })

  const points: XYPosition[] = []

  for (const [index, point] of unique.entries()) {
    const before = unique[index - 1]
    const after = unique[index + 1]
    const incoming = before === undefined ? undefined : normal(before, point)
    const outgoing = after === undefined ? undefined : normal(point, after)
    let miter = outgoing ?? incoming ?? { x: 0, y: 0 }

    if (incoming !== undefined && outgoing !== undefined) {
      const denominator = 1 + incoming.x * outgoing.x + incoming.y * outgoing.y

      if (denominator === 0) {
        return {
          kind: 'unreachable',
          id: trunk.id,
          reason: 'Bundle trunk reverses direction',
        }
      }

      miter = {
        x: (incoming.x + outgoing.x) / denominator,
        y: (incoming.y + outgoing.y) / denominator,
      }
    }

    points.push({
      x: point.x + miter.x * offset,
      y: point.y + miter.y * offset,
    })
  }

  return { ...trunk, points }
}
