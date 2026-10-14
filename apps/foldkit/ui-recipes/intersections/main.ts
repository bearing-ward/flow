import {
  flowMeasurementsFromInternalNodes,
  getEdgeIntersections,
  getEdgesGeometry,
  getFlowNodeBounds,
  getIntersectingNodes,
  getNodesBounds,
  getProximityConnection,
  getRectOverlapArea,
  isEdgeIntersectingRect,
  isNodeIntersecting,
  resolveNodeCollisions,
  toFlowObject,
} from '@flow/core'
import type {
  FlowIntersectionCandidate,
  FlowRect,
  XYPosition,
} from '@flow/core'

import { mountRecipeHost } from '../recipe-host.ts'
import type { MeasuredState } from '../recipe-host.ts'

import './intersections.css'

/*
 * Intersection recipes: Intersections, Node Collisions, Edge Intersection
 * and Proximity Connect. Foldkit's `onNodeDrag` event carries the dragged
 * node's live position, which overrides its committed one while it moves.
 * Sizes come from the snapshot port and every hit test from the core helpers.
 */

const svgNamespace = 'http://www.w3.org/2000/svg'

const handles = [
  { id: 'in', kind: 'target', side: 'left' },
  { id: 'out', kind: 'source', side: 'right' },
] as const

const box = (id: string, x: number, y: number, width = 120, height = 50) => ({
  id,
  label: id,
  position: { x, y },
  size: { width, height },
  handles,
})

const link = (source: string, target: string) => ({
  id: `${source}-${target}`,
  source,
  target,
  sourceHandle: 'out',
  targetHandle: 'in',
})

/** Nodes with a handle on every side, for the edge-paths scene. */
const pathNode = (id: string, x: number, y: number) => ({
  ...box(id, x, y),
  handles: [
    ...handles,
    { id: 'top', kind: 'target', side: 'top' },
    { id: 'bottom', kind: 'source', side: 'bottom' },
  ] as const,
})

const pathEdge = (
  path: 'bezier' | 'step' | 'smoothstep' | 'simplebezier' | 'straight',
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string
) => ({ id: path, source, sourceHandle, target, targetHandle, path })

/** The fixed area of the Intersections scene, in flow coordinates. */
const area: FlowRect = { x: 40, y: 40, width: 100, height: 100 }

/** Proximity Connect connects nodes whose top-left corners are this close. */
const proximityDistance = 150

const documents = {
  intersections: {
    nodes: [
      {
        ...box('area', area.x, area.y, area.width, area.height),
        draggable: false,
      },
      box('1', 240, 40),
      box('2', 240, 200),
      box('3', 460, 40),
      box('4', 460, 200, 50, 50),
    ],
    edges: [],
  },
  'node-collisions': {
    nodes: [
      box('A', 100, 100),
      box('B', 150, 120),
      box('C', 130, 140),
      box('D', 500, 100),
    ],
    edges: [],
  },
  'edge-intersection': {
    nodes: [
      box('A', 40, 40),
      box('B', 440, 300),
      box('C', 40, 300),
      box('D', 440, 40),
      box('X', 640, 420, 60, 40),
    ],
    edges: [link('A', 'B'), link('C', 'D')],
  },
  'proximity-connect': {
    nodes: [box('A', 40, 200), box('B', 400, 40), box('C', 400, 360)],
    edges: [],
  },
  'edge-paths': {
    nodes: [
      pathNode('S1', 40, 40),
      pathNode('T1', 360, 140),
      pathNode('S2', 40, 220),
      pathNode('T2', 360, 320),
      pathNode('S3', 560, 40),
      pathNode('T3', 760, 200),
      pathNode('S4', 560, 300),
      pathNode('T4', 760, 440),
    ],
    edges: [
      pathEdge('bezier', 'S1', 'out', 'T1', 'in'),
      pathEdge('step', 'S2', 'out', 'T2', 'top'),
      pathEdge('smoothstep', 'S3', 'bottom', 'T3', 'in'),
      pathEdge('simplebezier', 'S4', 'out', 'T4', 'top'),
      pathEdge('straight', 'S1', 'bottom', 'T2', 'in'),
    ],
  },
}

const sceneName =
  new URLSearchParams(globalThis.location.search).get('scene') ??
  'intersections'

const initial = Object.entries(documents).find(
  ([name]) => name === sceneName
)?.[1]

if (initial === undefined) {
  throw new Error(`Unknown intersection recipe scene: ${sceneName}`)
}

const host = mountRecipeHost({ page: 'intersections-page', document: initial })

const { status, frame } = host

status.dataset.scene = sceneName

const overlay = document.createElementNS(svgNamespace, 'svg')

overlay.classList.add('intersection-overlay')

frame.append(overlay)

/** Accepted document and measured internal nodes, refreshed after each change. */
let latest: MeasuredState | undefined

/** The node being dragged and its live parent-relative position. */
let drag: { readonly id: string; readonly position: XYPosition } | undefined

const ids = (items: readonly { readonly id: string }[]): string =>
  items
    .map(({ id }) => id)
    .toSorted()
    .join(',')

/** Measurements and the live drag position from `onNodeDrag`. */
const geometryOptions = (state: MeasuredState) => ({
  measurements: flowMeasurementsFromInternalNodes(state.internals.values()),
  positionOverrides: new Map(
    drag === undefined ? [] : [[drag.id, drag.position]]
  ),
})

/** Absolute bounds of every visible node, moved by the live drag. */
const candidates = (): readonly FlowIntersectionCandidate[] =>
  latest === undefined
    ? []
    : getFlowNodeBounds(latest.document, geometryOptions(latest))

const toFrame = (point: XYPosition): XYPosition => {
  const { x, y, zoom } = host.viewport()

  return { x: point.x * zoom + x, y: point.y * zoom + y }
}

const drawOverlay = (
  markers: readonly XYPosition[],
  line: readonly [XYPosition, XYPosition] | undefined
): void => {
  const circles = markers.map((point) => {
    const circle = document.createElementNS(svgNamespace, 'circle')
    const { x, y } = toFrame(point)

    circle.dataset.testid = 'edge-crossing'
    circle.setAttribute('cx', String(x))
    circle.setAttribute('cy', String(y))
    circle.setAttribute('r', '6')

    return circle
  })

  const lines = (line === undefined ? [] : [line]).map(([start, end]) => {
    const element = document.createElementNS(svgNamespace, 'line')
    const from = toFrame(start)
    const to = toFrame(end)

    element.dataset.testid = 'proximity-preview'
    element.setAttribute('x1', String(from.x))
    element.setAttribute('y1', String(from.y))
    element.setAttribute('x2', String(to.x))
    element.setAttribute('y2', String(to.y))

    return element
  })

  overlay.replaceChildren(...circles, ...lines)
}

const center = (rect: FlowRect): XYPosition => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
})

const proximity = (nodes: readonly FlowIntersectionCandidate[], id: string) => {
  const dragged = nodes.find((node) => node.id === id)

  return dragged === undefined
    ? undefined
    : getProximityConnection(nodes, dragged, {
        maxDistance: proximityDistance,
      })
}

const reportIntersections = (nodes: readonly FlowIntersectionCandidate[]) => {
  const dragged = nodes.find(({ id }) => id === drag?.id)

  if (dragged !== undefined) {
    status.dataset.intersecting = ids(
      getIntersectingNodes(dragged, true, nodes)
    )
    status.dataset.inArea = String(isNodeIntersecting(dragged, area))
  }
}

const reportCollisions = (nodes: readonly FlowIntersectionCandidate[]) => {
  status.dataset.overlapping = nodes
    .flatMap((first, index) =>
      nodes
        .slice(index + 1)
        .flatMap(({ id, bounds }) =>
          getRectOverlapArea(first.bounds, bounds) > 0
            ? [`${first.id}/${id}`]
            : []
        )
    )
    .join(',')
}

const reportEdges = (nodes: readonly FlowIntersectionCandidate[]) => {
  if (latest === undefined) {
    return
  }

  const dragged = nodes.find(({ id }) => id === drag?.id)
  const geometry = getEdgesGeometry(latest.document, geometryOptions(latest))

  const crossings = geometry.flatMap((first, index) =>
    geometry
      .slice(index + 1)
      .flatMap((second) => getEdgeIntersections(first, second))
  )

  status.dataset.crossings = String(crossings.length)
  status.dataset.underNode =
    dragged === undefined
      ? ''
      : ids(
          geometry.filter((edge) =>
            isEdgeIntersectingRect(edge, dragged.bounds)
          )
        )
  drawOverlay(crossings)
}

const reportProximity = (nodes: readonly FlowIntersectionCandidate[]) => {
  const connection = drag === undefined ? undefined : proximity(nodes, drag.id)
  const source = nodes.find(({ id }) => id === connection?.source)
  const target = nodes.find(({ id }) => id === connection?.target)

  status.dataset.proximity =
    connection === undefined ? '' : `${connection.source}>${connection.target}`
  drawOverlay(
    [],
    source === undefined || target === undefined
      ? undefined
      : [center(source.bounds), center(target.bounds)]
  )
}

/** Publish the core edge geometry so tests can compare it with the rendered paths. */
const reportPaths = () => {
  if (latest !== undefined) {
    status.dataset.geometry = JSON.stringify(
      getEdgesGeometry(latest.document, geometryOptions(latest)).map(
        ({ id, path }) => ({ id, path })
      )
    )
  }
}

const reporters = {
  intersections: reportIntersections,
  'node-collisions': reportCollisions,
  'edge-intersection': reportEdges,
  'proximity-connect': reportProximity,
  'edge-paths': reportPaths,
}

const report = (): void => {
  const nodes = candidates()
  const bounds = getNodesBounds(nodes)
  const document = latest?.document ?? host.document()

  status.value = `nodes:${nodes.length}`
  status.dataset.nodes = ids(document.nodes)
  status.dataset.edges = ids(document.edges)
  status.dataset.bounds = [bounds.x, bounds.y, bounds.width, bounds.height]
    .map(Math.round)
    .join(',')
  Object.entries(reporters).find(([name]) => name === sceneName)?.[1](nodes)
}

let refreshes = 0

/** Re-read the snapshot port; only the newest read reports. */
const refresh = async (): Promise<MeasuredState> => {
  refreshes += 1
  const mine = refreshes
  const state = await host.measuredState()

  if (mine === refreshes) {
    latest = state
    report()
  }

  return state
}

/** Move nodes to resolved bounds through one public edit. */
const resolveCollisions = async (fixedIds: readonly string[]) => {
  const before = candidates()
  const resolved = resolveNodeCollisions(before, { margin: 10, fixedIds })

  const operations = resolved.flatMap(({ id, bounds }, index) => {
    const previous = before[index]?.bounds
    const flowNode = latest?.document.nodes.find((node) => node.id === id)

    if (
      previous === undefined ||
      flowNode === undefined ||
      (previous.x === bounds.x && previous.y === bounds.y)
    ) {
      return []
    }

    return [
      {
        kind: 'update-node' as const,
        nodeId: id,
        patch: {
          position: {
            x: flowNode.position.x + bounds.x - previous.x,
            y: flowNode.position.y + bounds.y - previous.y,
          },
        },
      },
    ]
  })

  if (operations.length > 0) {
    await host.edit(operations)
  }
}

/** Proximity Connect adds the offered edge on drop, unless it exists. */
const connectDropped = async (nodeId: string) => {
  const connection = proximity(candidates(), nodeId)

  if (
    connection === undefined ||
    latest?.document.edges.some(
      ({ source, target }) =>
        source === connection.source && target === connection.target
    ) === true
  ) {
    return
  }

  await host.edit([
    { kind: 'add-edges', edges: [link(connection.source, connection.target)] },
  ])
}

host.runtime.ports.interactionEvents.subscribe((events) => {
  for (const { name, nodeId, position } of events) {
    if (name === 'onNodeDragStop') {
      drag = undefined
      report()
    } else if (
      name === 'onNodeDrag' &&
      nodeId !== undefined &&
      nodeId !== null &&
      position !== undefined
    ) {
      drag = { id: nodeId, position }
      report()
    }
  }
})

/** After a committed drop, resolve collisions or connect by proximity. */
const dropped = async (nodeId: string): Promise<void> => {
  // Act on this read, even when a concurrent refresh is newer.
  latest = await refresh()

  if (sceneName === 'node-collisions') {
    await resolveCollisions([nodeId])
  } else if (sceneName === 'proximity-connect') {
    await connectDropped(nodeId)
  }
}

// A committed drag arrives as a node-position change; act on the dropped node.
host.onChange((change) => {
  if (change.kind === 'node-position') {
    drag = undefined
    void dropped(change.nodeId)
  }
})

host.onAccepted(() => {
  void refresh()
})

host.onMeasured(() => {
  void refresh()
})

if (sceneName === 'node-collisions') {
  host
    .button('resolve-collisions', 'Resolve collisions')
    .addEventListener('click', () => {
      void resolveCollisions([])
    })
}

host.button('to-object', 'To object').addEventListener('click', async () => {
  const result = await host.snapshots.requestVersioned({})

  if (result.status === 'succeeded') {
    const object = toFlowObject(result.response.snapshot)

    status.dataset.object = `${object.nodes.length}:${object.edges.length}:${object.viewport.zoom}`
  }
})

void refresh()
