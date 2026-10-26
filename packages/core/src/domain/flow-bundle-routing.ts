import { Effect } from 'effect'

import { flowBundleLane, flowBundleLaneOffset } from './flow-bundle-geometry.ts'
import {
  flowBundleTrunkLane,
  flowBundleSegmentBlocked,
  flowBundlePortNamespace,
  routeFlowBundleTrunks,
} from './flow-bundle-trunks.ts'
import { getPathPolylines } from './flow-edge-geometry.ts'
import { getManualRouteGeometry } from './flow-route-geometry.ts'
import { FlowRoutingFailure } from './flow-routing.schema.ts'
import type {
  FlowRouterService,
  FlowRoutingPort,
  FlowRoutingRequest,
  FlowRoutingResult,
} from './flow-routing.schema.ts'
import type { XYPosition } from './flow.schema.ts'

const mean = (points: readonly XYPosition[]): XYPosition => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
})

const direction = (tangent: XYPosition): FlowRoutingPort['side'] => {
  if (Math.abs(tangent.x) >= Math.abs(tangent.y)) {
    return tangent.x >= 0 ? 'right' : 'left'
  }

  return tangent.y >= 0 ? 'bottom' : 'top'
}

const endpointExit = (
  port: FlowRoutingPort,
  distance: number
): FlowRoutingPort => {
  const vectors = {
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }

  const vector = vectors[port.side]

  return {
    ...port,
    point: {
      x: port.point.x + vector.x * distance,
      y: port.point.y + vector.y * distance,
    },
  }
}

const bundleLegPorts = (input: {
  readonly constraints: FlowRoutingRequest['constraints']
  readonly source: FlowRoutingPort
  readonly target: FlowRoutingPort
  readonly first: boolean
  readonly last: boolean
}) => {
  const opposite = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  } satisfies Record<FlowRoutingPort['side'], FlowRoutingPort['side']>

  const distance = input.constraints.clearance + input.constraints.portOffset

  return {
    source: input.first ? endpointExit(input.source, distance) : input.source,
    target: input.last
      ? endpointExit(input.target, distance)
      : { ...input.target, side: opposite[input.target.side] },
    prefix: input.first ? [input.source.point] : [],
    suffix: input.last ? [input.target.point] : [],
  }
}

/** Round only inside a four-unit neighbourhood already reserved by router clearance. */
export const smoothFlowBundlePolyline = (input: readonly XYPosition[]) => {
  const unique = input.filter((point, index) => {
    const previous = input[index - 1]

    return (
      previous === undefined || previous.x !== point.x || previous.y !== point.y
    )
  })

  const points = unique.filter((point, index) => {
    const before = unique[index - 1]
    const after = unique[index + 1]

    return (
      before === undefined ||
      after === undefined ||
      (point.x - before.x) * (after.y - point.y) !==
        (point.y - before.y) * (after.x - point.x)
    )
  })

  const first = points[0] ?? { x: 0, y: 0 }
  let path = `M${first.x},${first.y}`

  for (let i = 1; i < points.length - 1; i += 1) {
    const before = points[i - 1] ?? first
    const point = points[i] ?? first
    const after = points[i + 1] ?? point
    const a = Math.hypot(point.x - before.x, point.y - before.y)
    const b = Math.hypot(after.x - point.x, after.y - point.y)

    if (a === 0 || b === 0) {
      continue
    }

    const radius = Math.min(4, a / 3, b / 3)

    const enter = {
      x: point.x + ((before.x - point.x) * radius) / a,
      y: point.y + ((before.y - point.y) * radius) / a,
    }

    const exit = {
      x: point.x + ((after.x - point.x) * radius) / b,
      y: point.y + ((after.y - point.y) * radius) / b,
    }

    path += ` L${enter.x},${enter.y} C${enter.x + ((point.x - enter.x) * 2) / 3},${enter.y + ((point.y - enter.y) * 2) / 3} ${exit.x + ((point.x - exit.x) * 2) / 3},${exit.y + ((point.y - exit.y) * 2) / 3} ${exit.x},${exit.y}`
  }

  const last = points.at(-1) ?? first
  path += ` L${last.x},${last.y}`

  return {
    path,
    label: getManualRouteGeometry(first, last, getPathPolylines(path).flat())
      .label,
  }
}

/** Route fan sections and inter-tie sections through the configured capability. */
export const routeFlowBundlePaths = (
  request: FlowRoutingRequest,
  router: FlowRouterService,
  validate: (request: FlowRoutingRequest, result: FlowRoutingResult) => boolean
) =>
  Effect.gen(function* routeWireBundles() {
    const bundlePaths: { id: string; path: string; label: XYPosition }[] = []
    const unreachable = new Map<string, string>()
    const portNamespace = flowBundlePortNamespace(request, 'wire-tie:')

    for (const bundle of request.wireBundles ?? []) {
      const members = request.connections.filter(({ id }) =>
        bundle.edgeIds.some((edgeId) => edgeId === id)
      )

      if (members.length !== bundle.edgeIds.length) {
        continue
      }

      const endpoints = {
        source: mean(members.map(({ source }) => source.point)),
        target: mean(members.map(({ target }) => target.point)),
      }

      const trunks = yield* routeFlowBundleTrunks({
        request,
        bundle,
        endpoints,
        router,
        validate,
      })

      for (const member of members) {
        const lane = flowBundleLane(bundle, member.id, endpoints, true)

        const anchors: FlowRoutingPort[] = [
          member.source,
          ...lane.map(({ point, tangent }, index): FlowRoutingPort => ({
            nodeId: `${portNamespace}${bundle.id}:${index}`,
            point,
            side: direction(tangent),
          })),
          member.target,
        ]

        const points: XYPosition[] = []

        for (let i = 1; i < anchors.length; i += 1) {
          const source = anchors[i - 1]
          const target = anchors[i]

          if (source === undefined || target === undefined) {
            continue
          }

          const withinTie = i > 1 && i < anchors.length - 1 && (i - 2) % 3 < 2

          if (withinTie) {
            const blocked = flowBundleSegmentBlocked(
              source.point,
              target.point,
              request.obstacles,
              request.constraints.clearance
            )

            if (blocked) {
              unreachable.set(member.id, 'Tie lies inside obstacle clearance')
              break
            }

            points.push(source.point, target.point)
            continue
          }

          const trunk = trunks.get(i)

          if (trunk !== undefined) {
            const routed = flowBundleTrunkLane(
              trunk,
              flowBundleLaneOffset(bundle, member.id)
            )

            if (routed.kind === 'unreachable') {
              unreachable.set(member.id, routed.reason)
              break
            }

            points.push(...routed.points)
            continue
          }

          const ports = bundleLegPorts({
            constraints: request.constraints,
            source,
            target,
            first: i === 1,
            last: i === anchors.length - 1,
          })

          const leg: FlowRoutingRequest = {
            revision: request.revision,
            obstacles: request.obstacles,
            constraints: {
              clearance: request.constraints.clearance + 4,
              portOffset: 1,
            },
            connections: [
              {
                id: member.id,
                source: ports.source,
                target: ports.target,
              },
            ],
          }

          const result = yield* router.route(leg)

          if (!validate(leg, result)) {
            return yield* new FlowRoutingFailure({
              reason: 'invalid-result',
              message: 'Wire bundle router violated leg constraints',
            })
          }

          const [routed] = result.paths

          if (routed?.kind !== 'routed') {
            unreachable.set(
              member.id,
              routed?.reason ?? 'Bundle leg is unreachable'
            )
            break
          }

          points.push(
            ...ports.prefix,
            ...routed.points.filter((point) => {
              const last = points.at(-1)

              return (
                last === undefined || last.x !== point.x || last.y !== point.y
              )
            }),
            ...ports.suffix
          )
        }

        if (!unreachable.has(member.id)) {
          bundlePaths.push({
            id: member.id,
            ...smoothFlowBundlePolyline(points),
          })
        }
      }
    }

    return { bundlePaths, unreachable }
  })
