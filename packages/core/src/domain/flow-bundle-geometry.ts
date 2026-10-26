import type { FlowBundle } from './flow-bundle.schema.ts'
import type { FlowEdgeGeometryOptions } from './flow-edge-geometry.ts'
import {
  edgeAttachmentPosition,
  inferHandleMeasurement,
  resolveEdgeHandles,
} from './flow-edge.schema.ts'
import { createFlowGraph } from './flow-graph.ts'
import { getManualRouteGeometry } from './flow-route-geometry.ts'
import type { MeasuredNode } from './flow-runtime.schema.ts'
import type {
  FlowDocument,
  FlowEdge,
  NodeId,
  XYPosition,
} from './flow.schema.ts'

export const FLOW_BUNDLE_LANE_SPACING = 4

const unit = (x: number, y: number): XYPosition => {
  const length = Math.hypot(x, y)

  return length < 1e-9 ? { x: 1, y: 0 } : { x: x / length, y: y / length }
}

const mean = (
  points: readonly XYPosition[],
  fallback: XYPosition
): XYPosition =>
  points.length === 0
    ? fallback
    : {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      }

export const flowBundleEndpoints = (
  document: FlowDocument,
  bundle: FlowBundle,
  options: FlowEdgeGeometryOptions = {}
) => {
  const measurements = options.measurements ?? new Map<NodeId, MeasuredNode>()

  const graph = createFlowGraph(
    document,
    measurements,
    new Map(
      document.nodes.flatMap(({ id }) => {
        const position = options.positionOverrides?.get(id)

        return position === undefined ? [] : [[id, position] as const]
      })
    )
  )

  const anchors = document.edges
    .filter(({ id }) => bundle.edgeIds.includes(id))
    .flatMap((edge) => {
      const resolved = resolveEdgeHandles(document, edge)
      const source = resolved && graph.nodes.get(resolved.sourceNode.id)
      const target = resolved && graph.nodes.get(resolved.targetNode.id)

      if (
        resolved === undefined ||
        source === undefined ||
        target === undefined
      ) {
        return []
      }

      const point = (
        node: typeof source,
        handle: typeof resolved.sourceHandle
      ) =>
        edgeAttachmentPosition(
          node.absolutePosition,
          handle,
          measurements
            .get(node.id)
            ?.handles?.find(({ handleId }) => handleId === handle.id) ??
            inferHandleMeasurement(node.id, handle, node.dimensions)
        )

      return [
        {
          source: point(source, resolved.sourceHandle),
          target: point(target, resolved.targetHandle),
        },
      ]
    })

  return {
    source: mean(
      anchors.map(({ source }) => source),
      bundle.ties[0]
    ),
    target: mean(
      anchors.map(({ target }) => target),
      bundle.ties[0]
    ),
  }
}

/** All lanes share the same tangent and normal at a tie, even with mixed endpoints. */
export const flowBundleFrame = (
  bundle: FlowBundle,
  index: number,
  endpoints: { readonly source: XYPosition; readonly target: XYPosition },
  orthogonal = false
) => {
  const point = bundle.ties[index] ?? bundle.ties[0]
  const before = bundle.ties[index - 1] ?? endpoints.source
  const after = bundle.ties[index + 1] ?? endpoints.target
  const axis = unit(after.x - before.x, after.y - before.y)

  let tangent = axis

  if (orthogonal) {
    tangent =
      Math.abs(axis.x) >= Math.abs(axis.y)
        ? { x: Math.sign(axis.x), y: 0 }
        : { x: 0, y: Math.sign(axis.y) }
  }

  const normal = { x: -tangent.y, y: tangent.x }

  const halfWidth =
    ((bundle.edgeIds.length - 1) * FLOW_BUNDLE_LANE_SPACING) / 2 + 4

  return {
    point,
    tangent,
    normal,
    start: {
      x: point.x - normal.x * halfWidth,
      y: point.y - normal.y * halfWidth,
    },
    end: {
      x: point.x + normal.x * halfWidth,
      y: point.y + normal.y * halfWidth,
    },
  }
}

type FlowBundleKnot = Pick<
  ReturnType<typeof flowBundleFrame>,
  'point' | 'tangent'
>

export const flowBundleLaneOffset = (
  bundle: FlowBundle,
  edgeId: string
): number =>
  (bundle.edgeIds.map(String).indexOf(edgeId) -
    (bundle.edgeIds.length - 1) / 2) *
  FLOW_BUNDLE_LANE_SPACING

/** Free splines share a straight reach; configured routers own their port exits. */
export const flowBundleTieLane = (
  bundle: FlowBundle,
  index: number,
  offset: number,
  endpoints: { readonly source: XYPosition; readonly target: XYPosition },
  orthogonal = false
) => {
  const frame = flowBundleFrame(bundle, index, endpoints, orthogonal)
  const before = bundle.ties[index - 1] ?? endpoints.source
  const after = bundle.ties[index + 1] ?? endpoints.target

  const reach = orthogonal
    ? 0
    : Math.min(
        24,
        Math.hypot(frame.point.x - before.x, frame.point.y - before.y) / 4,
        Math.hypot(after.x - frame.point.x, after.y - frame.point.y) / 4
      )

  const knot = (distance: number): FlowBundleKnot => ({
    point: {
      x: frame.point.x + frame.normal.x * offset + frame.tangent.x * distance,
      y: frame.point.y + frame.normal.y * offset + frame.tangent.y * distance,
    },
    tangent: frame.tangent,
  })

  return { entry: knot(-reach), center: knot(0), exit: knot(reach) }
}

/** The straight section around each tie gives a visible, evenly spaced ribbon. */
export const flowBundleLane = (
  bundle: FlowBundle,
  edgeId: string,
  endpoints: { readonly source: XYPosition; readonly target: XYPosition },
  orthogonal = false
) =>
  bundle.ties.flatMap((_, index) => {
    const { entry, center, exit } = flowBundleTieLane(
      bundle,
      index,
      flowBundleLaneOffset(bundle, edgeId),
      endpoints,
      orthogonal
    )

    return [entry, center, exit]
  })

const sideVectors = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
}

/** Cubic Hermite interpolation. Adjacent segments have identical derivatives at every knot. */
export const flowBundleSpline = (
  knots: readonly { readonly point: XYPosition; readonly tangent: XYPosition }[]
) => {
  const derivatives = knots.map(({ point, tangent }, index) => {
    const before = knots[index - 1]?.point
    const after = knots[index + 1]?.point

    const lengths = [before, after].flatMap((other) =>
      other === undefined
        ? []
        : [Math.hypot(other.x - point.x, other.y - point.y)]
    )

    const magnitude = Math.min(...lengths) * 0.8

    return { x: tangent.x * magnitude, y: tangent.y * magnitude }
  })

  const samples: XYPosition[] = []
  const first = knots[0]?.point ?? { x: 0, y: 0 }
  let path = `M${first.x},${first.y}`

  for (let i = 1; i < knots.length; i += 1) {
    const a = knots[i - 1]?.point ?? first
    const b = knots[i]?.point ?? first
    const da = derivatives[i - 1] ?? { x: 0, y: 0 }
    const db = derivatives[i] ?? { x: 0, y: 0 }
    const c1 = { x: a.x + da.x / 3, y: a.y + da.y / 3 }
    const c2 = { x: b.x - db.x / 3, y: b.y - db.y / 3 }
    path += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`

    for (let j = 0; j <= 24; j += 1) {
      const t = j / 24
      const u = 1 - t
      samples.push({
        x:
          u ** 3 * a.x +
          3 * u * u * t * c1.x +
          3 * u * t * t * c2.x +
          t ** 3 * b.x,
        y:
          u ** 3 * a.y +
          3 * u * u * t * c1.y +
          3 * u * t * t * c2.y +
          t ** 3 * b.y,
      })
    }
  }

  const last = knots.at(-1)?.point ?? first

  return { path, label: getManualRouteGeometry(first, last, samples).label }
}

export const getBundleRouteGeometry = (
  document: FlowDocument,
  edge: FlowEdge,
  source: XYPosition,
  target: XYPosition,
  options: FlowEdgeGeometryOptions = {}
) => {
  const bundle = document.bundles?.find(({ edgeIds }) =>
    edgeIds.includes(edge.id)
  )

  if (bundle === undefined) {
    return
  }

  const endpoints = flowBundleEndpoints(document, bundle, options)
  const resolved = resolveEdgeHandles(document, edge)
  const start = sideVectors[resolved?.sourceHandle.side ?? 'right']
  const end = sideVectors[resolved?.targetHandle.side ?? 'left']

  return flowBundleSpline([
    { point: source, tangent: start },
    ...flowBundleLane(bundle, edge.id, endpoints),
    { point: target, tangent: { x: -end.x, y: -end.y } },
  ])
}
