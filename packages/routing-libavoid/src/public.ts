import {
  FlowRouter,
  FlowRoutingFailure,
  FlowRoutingResultSchema,
  flowRoutingPortExit,
  flowRoutingSegmentIntersects,
} from '@flow/core'
import type { FlowRouterService, FlowRoutingResult } from '@flow/core'
import { Effect, Layer, Predicate, Schema as S } from 'effect'

interface Disposable {
  readonly delete: () => void
}

interface Point extends Disposable {
  readonly x: number
  readonly y: number
}

interface Polygon extends Disposable {
  readonly size: () => number
  readonly at: (index: number) => Point
}

interface NativeRoutingType {
  readonly value: number
}

interface Connector {
  readonly setRoutingType: (type: NativeRoutingType) => void
  readonly displayRoute: () => Polygon
}

interface Router extends Disposable {
  readonly processTransaction: () => void
}

const constructor = <A, Args extends readonly unknown[]>() =>
  S.declare<new (...args: Args) => A>(
    (value): value is new (...args: Args) => A => Predicate.isFunction(value)
  )

const obstacleConstructorKey = 'ShapeRef'

const NamespaceSchema = S.Struct({
  Point: constructor<Point, [number, number]>(),
  Rectangle: constructor<Disposable, [Point, Point]>(),
  Router: constructor<Router, [number]>(),
  [obstacleConstructorKey]: constructor<object, [Router, Disposable]>(),
  ConnEnd: constructor<Disposable, [Point]>(),
  ConnRef: constructor<Connector, [Router, Disposable, Disposable]>(),
  RouterFlag: S.declare<{
    readonly OrthogonalRouting: { readonly value: number }
  }>(
    (
      value
    ): value is { readonly OrthogonalRouting: { readonly value: number } } =>
      (Predicate.isFunction(value) || Predicate.isObject(value)) &&
      'OrthogonalRouting' in value &&
      S.is(S.Struct({ value: S.Number }))(value.OrthogonalRouting)
  ),
  ConnType: S.declare<{ readonly ConnType_Orthogonal: NativeRoutingType }>(
    (value): value is { readonly ConnType_Orthogonal: NativeRoutingType } =>
      (Predicate.isFunction(value) || Predicate.isObject(value)) &&
      'ConnType_Orthogonal' in value &&
      S.is(S.Struct({ value: S.Finite }))(value.ConnType_Orthogonal)
  ),
})

let loading: Promise<typeof NamespaceSchema.Type> | undefined

const initialize = async (wasmUrl: string) => {
  const { AvoidLib } = await import('libavoid-js')
  await AvoidLib.load(wasmUrl)

  return S.decodeUnknownSync(NamespaceSchema)(AvoidLib.getInstance())
}

const load = async (wasmUrl: string) => {
  loading ??= initialize(wasmUrl)

  try {
    return await loading
  } catch (error) {
    loading = undefined
    throw error
  }
}

/** Install this package explicitly. The application owns the replaceable WASM URL. */
export const createLibavoidRouter = (options: {
  readonly wasmUrl: string
}): FlowRouterService => ({
  route: (request) =>
    Effect.tryPromise({
      try: async (signal) => {
        const avoid = await load(options.wasmUrl)

        if (signal.aborted) {
          throw signal.reason
        }

        const router = new avoid.Router(
          avoid.RouterFlag.OrthogonalRouting.value
        )

        const temporary: Disposable[] = []
        const nativeObstacles: object[] = []

        const point = (x: number, y: number): Point => {
          const value = new avoid.Point(x, y)
          temporary.push(value)

          return value
        }

        try {
          for (const obstacle of request.obstacles) {
            const margin = request.constraints.clearance

            const polygon = new avoid.Rectangle(
              point(obstacle.x - margin, obstacle.y - margin),
              point(
                obstacle.x + obstacle.width + margin,
                obstacle.y + obstacle.height + margin
              )
            )

            temporary.push(polygon)
            nativeObstacles.push(new avoid.ShapeRef(router, polygon))
          }

          const connections = new Map<string, Connector>()
          const paths: FlowRoutingResult['paths'][number][] = []

          for (const connection of request.connections) {
            const distance =
              request.constraints.clearance + request.constraints.portOffset

            const from = flowRoutingPortExit(connection.source, distance)
            const to = flowRoutingPortExit(connection.target, distance)

            const blocked = request.obstacles.some(
              (obstacle) =>
                flowRoutingSegmentIntersects(
                  from,
                  from,
                  obstacle,
                  request.constraints.clearance
                ) ||
                flowRoutingSegmentIntersects(
                  to,
                  to,
                  obstacle,
                  request.constraints.clearance
                ) ||
                (obstacle.id !== connection.source.nodeId &&
                  flowRoutingSegmentIntersects(
                    connection.source.point,
                    from,
                    obstacle,
                    request.constraints.clearance
                  )) ||
                (obstacle.id !== connection.target.nodeId &&
                  flowRoutingSegmentIntersects(
                    to,
                    connection.target.point,
                    obstacle,
                    request.constraints.clearance
                  ))
            )

            if (blocked) {
              paths.push({
                kind: 'unreachable',
                id: connection.id,
                reason: 'An obstacle blocks a port or its required exit',
              })
              continue
            }

            const source = new avoid.ConnEnd(point(from.x, from.y))
            const target = new avoid.ConnEnd(point(to.x, to.y))
            temporary.push(source, target)
            const native = new avoid.ConnRef(router, source, target)
            native.setRoutingType(avoid.ConnType.ConnType_Orthogonal)
            connections.set(connection.id, native)
          }

          router.processTransaction()

          for (const connection of request.connections) {
            const native = connections.get(connection.id)

            if (native === undefined) {
              continue
            }

            const route = native.displayRoute()
            temporary.push(route)
            const points = [connection.source.point]

            for (let index = 0; index < route.size(); index += 1) {
              const value = route.at(index)
              temporary.push(value)
              points.push({ x: value.x, y: value.y })
            }

            points.push(connection.target.point)
            paths.push({
              kind: 'routed',
              id: connection.id,
              points: points.filter(
                (value, index) =>
                  index === 0 ||
                  value.x !== points[index - 1]?.x ||
                  value.y !== points[index - 1]?.y
              ),
            })
          }

          return S.decodeUnknownSync(FlowRoutingResultSchema)({
            revision: request.revision,
            paths,
          })
        } finally {
          router.delete()

          for (const value of temporary.toReversed()) {
            value.delete()
          }
        }
      },
      catch: (error) =>
        new FlowRoutingFailure({ reason: 'engine', message: String(error) }),
    }),
})

export const libavoidRouterLayer = (
  options: Parameters<typeof createLibavoidRouter>[0]
) => Layer.succeed(FlowRouter, createLibavoidRouter(options))
