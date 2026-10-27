import {
  bezierEdgePath,
  edgeAttachmentPosition,
  edgeLabelPosition,
  inferHandleMeasurement,
  resolveEdgeHandles,
  simpleBezierEdgePath,
  straightEdgePath,
} from './flow-edge.schema.ts'
import { graphNodeBounds, createFlowGraph } from './flow-graph.ts'
import type { FlowGraphNode, FlowGraphView } from './flow-graph.ts'
import type { FlowIntersectionCandidate } from './flow-intersection.ts'
import type { FlowInternalNode } from './flow-measurement.schema.ts'
import { getManualRouteGeometry } from './flow-route-geometry.ts'
import { getAutomaticRouteGeometry } from './flow-routing-geometry.ts'
import type { FlowRoutingResult } from './flow-routing.schema.ts'
import type { MeasuredNode } from './flow-runtime.schema.ts'
import { smoothStepEdgePath, stepEdgePath } from './flow-step-edge.schema.ts'
import type { FlowRect } from './flow-visibility.schema.ts'
import type {
  EdgeId,
  FlowDocument,
  FlowEdge,
  FlowEdgePath,
  FlowHandle,
  HandleId,
  NodeId,
  XYPosition,
} from './flow.schema.ts'

/** Where and how one edge renders, in absolute flow coordinates. */
export interface FlowEdgeRenderGeometry {
  readonly id: EdgeId
  readonly edge: FlowEdge
  readonly pathType: FlowEdgePath
  /** SVG path data the built-in edge draws, in flow coordinates. */
  readonly path: string
  readonly source: XYPosition
  readonly target: XYPosition
  readonly sourcePosition: FlowHandle['side']
  readonly targetPosition: FlowHandle['side']
  readonly sourceHandleId: HandleId
  readonly targetHandleId: HandleId
  /** The built-in label anchor. */
  readonly label: XYPosition
}

export interface FlowEdgeGeometryOptions {
  readonly edgeRouting?: FlowRoutingResult | null | undefined
  /** Measured node sizes and handle boxes, such as from internal nodes. */
  readonly measurements?: ReadonlyMap<NodeId, MeasuredNode> | undefined
  /** Parent-relative positions by node id that replace document positions, such as a live drag. */
  readonly positionOverrides?: ReadonlyMap<string, XYPosition> | undefined
}

/**
 * Measurements from the internal nodes a host reports. Unmeasured and hidden
 * nodes are left out, so geometry falls back to their declared size.
 */
export const flowMeasurementsFromInternalNodes = (
  internals: Iterable<FlowInternalNode | undefined>
): ReadonlyMap<NodeId, MeasuredNode> => {
  const measurements = new Map<NodeId, MeasuredNode>()

  for (const internal of internals) {
    if (internal?.measurementStatus === 'measured') {
      measurements.set(internal.node.id, {
        nodeId: internal.node.id,
        width: internal.width,
        height: internal.height,
        handles: internal.handles,
      })
    }
  }

  return measurements
}

const pathFor = (
  pathType: FlowEdgePath,
  source: XYPosition,
  target: XYPosition,
  sourceSide: FlowHandle['side'],
  targetSide: FlowHandle['side']
): string => {
  switch (pathType) {
    case 'bezier': {
      return bezierEdgePath(source, target, sourceSide, targetSide)
    }

    case 'simplebezier': {
      return simpleBezierEdgePath(source, target, sourceSide, targetSide)
    }

    case 'step': {
      return stepEdgePath(source, target, sourceSide, targetSide)
    }

    case 'smoothstep': {
      return smoothStepEdgePath(source, target, sourceSide, targetSide)
    }

    default: {
      return straightEdgePath(source, target)
    }
  }
}

const anchor = (
  graphNode: FlowGraphNode,
  handle: FlowHandle,
  measurements: ReadonlyMap<NodeId, MeasuredNode>
): XYPosition =>
  edgeAttachmentPosition(
    graphNode.absolutePosition,
    handle,
    measurements
      .get(graphNode.id)
      ?.handles?.find(({ handleId }) => handleId === handle.id) ??
      inferHandleMeasurement(graphNode.id, handle, graphNode.dimensions),
    { ...graphNode.dimensions, rotation: graphNode.node.rotation }
  )

/** The node graph with measurements and parent-relative overrides applied. */
const geometryGraph = (
  document: FlowDocument,
  options: FlowEdgeGeometryOptions
): FlowGraphView => {
  const overrides = options.positionOverrides

  return createFlowGraph(
    document,
    options.measurements ?? new Map(),
    new Map(
      document.nodes.flatMap(({ id }) => {
        const position = overrides?.get(id)

        return position === undefined ? [] : [[id, position] as const]
      })
    )
  )
}

/**
 * Absolute flow-space bounds of every visible node, in document order.
 * Positions in `positionOverrides` are parent-relative anchors, as drag
 * events report them; the node origin and every ancestor's position are
 * applied, so children of a moved parent move with it. Unmeasured nodes use
 * their declared size.
 */
export const getFlowNodeBounds = (
  document: FlowDocument,
  options: FlowEdgeGeometryOptions = {}
): readonly FlowIntersectionCandidate[] => {
  const graph = geometryGraph(document, options)

  return document.nodes.flatMap(({ id }) => {
    const graphNode = graph.nodes.get(id)

    return graphNode === undefined || graphNode.hidden
      ? []
      : [
          {
            id,
            bounds: graphNodeBounds(graphNode),
          },
        ]
  })
}

/**
 * Geometry of every edge the built-in renderers draw, in document order.
 * Hidden edges, edges touching hidden nodes and edges whose handles do not
 * resolve are left out. Unmeasured handles sit at the middle of their side.
 */
export const getEdgesGeometry = (
  document: FlowDocument,
  options: FlowEdgeGeometryOptions = {}
): readonly FlowEdgeRenderGeometry[] => {
  const measurements = options.measurements ?? new Map()
  const graph = geometryGraph(document, options)

  return document.edges.flatMap((edge) => {
    const resolved =
      edge.hidden === true ? undefined : resolveEdgeHandles(document, edge)

    const sourceNode = resolved && graph.nodes.get(resolved.sourceNode.id)
    const targetNode = resolved && graph.nodes.get(resolved.targetNode.id)

    if (
      resolved === undefined ||
      sourceNode === undefined ||
      targetNode === undefined ||
      sourceNode.hidden ||
      targetNode.hidden
    ) {
      return []
    }

    const pathType = edge.path ?? 'straight'
    const source = anchor(sourceNode, resolved.sourceHandle, measurements)
    const target = anchor(targetNode, resolved.targetHandle, measurements)
    const sourcePosition = resolved.sourceHandle.side
    const targetPosition = resolved.targetHandle.side

    const manual =
      edge.route?.mode === 'manual' &&
      !document.bundles?.some(({ edgeIds }) => edgeIds.includes(edge.id))
        ? getManualRouteGeometry(source, target, edge.route.points)
        : getAutomaticRouteGeometry(document, edge, source, target, options)

    return [
      {
        id: edge.id,
        edge,
        pathType,
        path:
          manual?.path ??
          pathFor(pathType, source, target, sourcePosition, targetPosition),
        source,
        target,
        sourcePosition,
        targetPosition,
        sourceHandleId: resolved.sourceHandle.id,
        targetHandleId: resolved.targetHandle.id,
        label:
          manual?.label ??
          edgeLabelPosition(
            source,
            target,
            pathType,
            sourcePosition,
            targetPosition
          ),
      },
    ]
  })
}

/** Geometry of one rendered edge, or undefined when it does not render. */
export const getEdgeGeometry = (
  document: FlowDocument,
  edgeId: string,
  options: FlowEdgeGeometryOptions = {}
): FlowEdgeRenderGeometry | undefined =>
  getEdgesGeometry(
    (options.edgeRouting === null || options.edgeRouting === undefined) &&
      !document.bundles?.some(({ edgeIds }) =>
        edgeIds.some((id) => id === edgeId)
      )
      ? { ...document, edges: document.edges.filter(({ id }) => id === edgeId) }
      : document,
    options
  ).find(({ id }) => id === edgeId)

/* SVG path flattening. */

const commandPattern = /[MmLlHhVvCcQqZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gu

const commandLetter = /^[MmLlHhVvCcQqZz]$/u

const cubicAt = (
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number =>
  (1 - t) ** 3 * p0 +
  3 * (1 - t) ** 2 * t * p1 +
  3 * (1 - t) * t ** 2 * p2 +
  t ** 3 * p3

const quadraticAt = (p0: number, p1: number, p2: number, t: number): number =>
  (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2

export interface FlowPathPolylineOptions {
  /** Straight pieces per curve command. Defaults to 16. */
  readonly curveSegments?: number | undefined
}

/** Parser state while flattening one path. */
interface PathState {
  readonly tokens: readonly string[]
  readonly steps: number
  readonly polylines: XYPosition[][]
  index: number
  current: XYPosition[]
  point: XYPosition
  start: XYPosition
  relative: boolean
}

const readNumber = (state: PathState): number | undefined => {
  const token = state.tokens[state.index]

  if (token === undefined || commandLetter.test(token)) {
    return undefined
  }

  state.index += 1

  return Number(token)
}

const readPoint = (state: PathState): XYPosition | undefined => {
  const x = readNumber(state)
  const y = readNumber(state)

  if (x === undefined || y === undefined) {
    return undefined
  }

  return state.relative
    ? { x: state.point.x + x, y: state.point.y + y }
    : { x, y }
}

const flush = (state: PathState): void => {
  if (state.current.length > 0) {
    state.polylines.push(state.current)
  }

  state.current = []
}

const lineTo = (state: PathState, next: XYPosition): void => {
  if (state.current.length === 0) {
    state.current.push(state.point)
  }

  state.current.push(next)
  state.point = next
}

const moveTo = (state: PathState): boolean => {
  const next = readPoint(state)

  if (next === undefined) {
    return false
  }

  flush(state)
  state.current = [next]
  state.point = next
  state.start = next

  return true
}

const lineCommand = (state: PathState): boolean => {
  const next = readPoint(state)

  if (next !== undefined) {
    lineTo(state, next)
  }

  return next !== undefined
}

const axisCommand =
  (axis: keyof XYPosition) =>
  (state: PathState): boolean => {
    const value = readNumber(state)

    if (value === undefined) {
      return false
    }

    const coordinate = state.relative ? state.point[axis] + value : value

    lineTo(state, { ...state.point, [axis]: coordinate })

    return true
  }

const cubicCommand = (state: PathState): boolean => {
  const from = state.point
  const first = readPoint(state)
  const second = readPoint(state)
  const end = readPoint(state)

  if (first === undefined || second === undefined || end === undefined) {
    return false
  }

  for (let step = 1; step <= state.steps; step += 1) {
    const t = step / state.steps

    lineTo(state, {
      x: cubicAt(from.x, first.x, second.x, end.x, t),
      y: cubicAt(from.y, first.y, second.y, end.y, t),
    })
  }

  return true
}

const quadraticCommand = (state: PathState): boolean => {
  const from = state.point
  const control = readPoint(state)
  const end = readPoint(state)

  if (control === undefined || end === undefined) {
    return false
  }

  for (let step = 1; step <= state.steps; step += 1) {
    const t = step / state.steps

    lineTo(state, {
      x: quadraticAt(from.x, control.x, end.x, t),
      y: quadraticAt(from.y, control.y, end.y, t),
    })
  }

  return true
}

const commands = new Map<string, (state: PathState) => boolean>([
  ['M', moveTo],
  ['L', lineCommand],
  ['H', axisCommand('x')],
  ['V', axisCommand('y')],
  ['C', cubicCommand],
  ['Q', quadraticCommand],
])

/**
 * Flatten SVG path data into polylines, one per subpath. Supports the
 * `M L H V C Q Z` commands, absolute and relative, which every built-in
 * edge path uses. Parsing stops at an unsupported command.
 */
export const getPathPolylines = (
  pathData: string,
  options: FlowPathPolylineOptions = {}
): readonly (readonly XYPosition[])[] => {
  const state: PathState = {
    tokens: pathData.match(commandPattern) ?? [],
    steps: Math.max(1, Math.round(options.curveSegments ?? 16)),
    polylines: [],
    index: 0,
    current: [],
    point: { x: 0, y: 0 },
    start: { x: 0, y: 0 },
    relative: false,
  }

  let command = ''

  while (state.index < state.tokens.length) {
    const token = state.tokens[state.index] ?? ''

    if (commandLetter.test(token)) {
      command = token.toUpperCase()
      state.relative = token !== command
      state.index += 1
    }

    if (command === 'Z') {
      lineTo(state, state.start)
      flush(state)
      command = ''
      continue
    }

    const apply = commands.get(command)

    if (apply === undefined || !apply(state)) {
      break
    }

    // Coordinate pairs after a move are implicit line segments.
    if (command === 'M') {
      command = 'L'
    }
  }

  flush(state)

  return state.polylines
}

/** The edge path flattened into flow-space polylines. */
export const getEdgePolylines = (
  geometry: Pick<FlowEdgeRenderGeometry, 'path'>,
  options?: FlowPathPolylineOptions
): readonly (readonly XYPosition[])[] =>
  getPathPolylines(geometry.path, options)

const pairs = (
  polyline: readonly XYPosition[]
): readonly (readonly [XYPosition, XYPosition])[] =>
  polyline.length === 1 && polyline[0] !== undefined
    ? [[polyline[0], polyline[0]]]
    : polyline.slice(1).flatMap((to, index) => {
        const from = polyline[index]

        return from === undefined ? [] : [[from, to] as const]
      })

const segmentDistance = (
  point: XYPosition,
  from: XYPosition,
  to: XYPosition
): number => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lengthSquared = dx * dx + dy * dy

  const t =
    lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared
          )
        )

  return Math.hypot(point.x - (from.x + t * dx), point.y - (from.y + t * dy))
}

/** Shortest flow-space distance from a point to the edge path. */
export const getEdgeDistanceToPoint = (
  geometry: Pick<FlowEdgeRenderGeometry, 'path'>,
  point: XYPosition
): number =>
  Math.min(
    Number.POSITIVE_INFINITY,
    ...getEdgePolylines(geometry).flatMap((polyline) =>
      pairs(polyline).map(([from, to]) => segmentDistance(point, from, to))
    )
  )

/** Whether a point lies within `tolerance` flow units of the edge path. */
export const isPointNearEdge = (
  geometry: Pick<FlowEdgeRenderGeometry, 'path'>,
  point: XYPosition,
  tolerance: number
): boolean => getEdgeDistanceToPoint(geometry, point) <= tolerance

const crossing = (
  a1: XYPosition,
  a2: XYPosition,
  b1: XYPosition,
  b2: XYPosition
): XYPosition | undefined => {
  const r = { x: a2.x - a1.x, y: a2.y - a1.y }
  const s = { x: b2.x - b1.x, y: b2.y - b1.y }
  const denominator = r.x * s.y - r.y * s.x

  if (denominator === 0) {
    return undefined
  }

  const qp = { x: b1.x - a1.x, y: b1.y - a1.y }
  const t = (qp.x * s.y - qp.y * s.x) / denominator
  const u = (qp.x * r.y - qp.y * r.x) / denominator

  return t >= 0 && t <= 1 && u >= 0 && u <= 1
    ? { x: a1.x + t * r.x, y: a1.y + t * r.y }
    : undefined
}

const isPointInRect = (point: XYPosition, rect: FlowRect): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height

const rectSides = (
  rect: FlowRect
): readonly (readonly [XYPosition, XYPosition])[] => {
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height

  return [
    [
      { x: rect.x, y: rect.y },
      { x: right, y: rect.y },
    ],
    [
      { x: right, y: rect.y },
      { x: right, y: bottom },
    ],
    [
      { x: right, y: bottom },
      { x: rect.x, y: bottom },
    ],
    [
      { x: rect.x, y: bottom },
      { x: rect.x, y: rect.y },
    ],
  ]
}

/** Whether the edge path enters a flow-space rectangle or crosses its border. */
export const isEdgeIntersectingRect = (
  geometry: Pick<FlowEdgeRenderGeometry, 'path'>,
  rect: FlowRect
): boolean =>
  getEdgePolylines(geometry).some(
    (polyline) =>
      polyline.some((point) => isPointInRect(point, rect)) ||
      pairs(polyline).some(([from, to]) =>
        rectSides(rect).some(
          ([side1, side2]) => crossing(from, to, side1, side2) !== undefined
        )
      )
  )

const samePoint = (first: XYPosition, second: XYPosition): boolean =>
  Math.abs(first.x - second.x) < 1e-6 && Math.abs(first.y - second.y) < 1e-6

/** First and last point of every subpath: where an edge starts or ends. */
const pathEnds = (
  polylines: readonly (readonly XYPosition[])[]
): readonly XYPosition[] =>
  polylines.flatMap((polyline) => {
    const [start] = polyline
    const end = polyline.at(-1)

    return start === undefined || end === undefined ? [] : [start, end]
  })

/**
 * Points where two edge paths properly cross, along the first path. Points
 * where either path starts or ends never count, so edges that share a
 * handle anchor, or where one edge only touches the other with its end, do
 * not cross. Collinear overlapping pieces report no point. A crossing found
 * twice at a polyline vertex is reported once.
 */
export const getEdgeIntersections = (
  first: Pick<FlowEdgeRenderGeometry, 'path'>,
  second: Pick<FlowEdgeRenderGeometry, 'path'>
): readonly XYPosition[] => {
  const firstPolylines = getEdgePolylines(first)
  const secondPolylines = getEdgePolylines(second)
  const ends = [...pathEnds(firstPolylines), ...pathEnds(secondPolylines)]
  const secondPairs = secondPolylines.flatMap(pairs)
  const found: XYPosition[] = []

  for (const [a1, a2] of firstPolylines.flatMap(pairs)) {
    for (const [b1, b2] of secondPairs) {
      const point = crossing(a1, a2, b1, b2)

      if (
        point !== undefined &&
        !ends.some((end) => samePoint(end, point)) &&
        !found.some((existing) => samePoint(existing, point))
      ) {
        found.push(point)
      }
    }
  }

  return found
}
