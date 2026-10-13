import {
  flowMeasurementsFromInternalNodes,
  getEdgeIntersections,
  getEdgesGeometry,
  getInternalNodeBounds,
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
import { mountFlow } from '@flow/vanilla'
import type { JavaScriptFlowController } from '@flow/vanilla'

import './intersection-recipes.css'
import {
  createRecipePage,
  everyFrame,
  measuredNode,
  pageButton,
  sceneParameter,
} from './recipe-page.ts'
import type { RecipeCanvasOwner } from './recipe-page.ts'

/*
 * Intersection recipes: Intersections, Node Collisions, Edge Intersection
 * and Proximity Connect. Live drag positions come from `onNodeDrag`, sizes
 * from internal nodes, and every hit test from the core helpers.
 */

const page = createRecipePage('intersections')

const { canvas, status, toolbar } = page

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
}

const sceneName = sceneParameter('intersections')

const initial = Object.entries(documents).find(
  ([name]) => name === sceneName
)?.[1]

if (initial === undefined) {
  throw new Error(`Unknown intersection recipe scene: ${sceneName}`)
}

page.root.dataset.scene = sceneName

/** Live parent-relative positions of the nodes being dragged. */
const live = new Map<string, XYPosition>()

let draggedId: string | undefined

const overlay = document.createElementNS(svgNamespace, 'svg')

overlay.classList.add('intersection-overlay')

const flow: RecipeCanvasOwner = { current: undefined }

const mounted = (): JavaScriptFlowController => {
  if (flow.current === undefined) {
    throw new Error('Intersection recipe canvas is not mounted')
  }

  return flow.current
}

/** Measured absolute bounds of every node, with live drag positions applied. */
const candidates = (): readonly FlowIntersectionCandidate[] =>
  mounted()
    .getNodes()
    .flatMap((node) => {
      const internal = measuredNode(mounted(), node.id)

      if (internal === undefined) {
        return []
      }

      const { bounds } = getInternalNodeBounds(internal)
      const position = live.get(node.id)

      return [
        {
          id: node.id,
          bounds: position === undefined ? bounds : { ...bounds, ...position },
        },
      ]
    })

const ids = (items: readonly { readonly id: string }[]): string =>
  items
    .map(({ id }) => id)
    .toSorted()
    .join(',')

const screenPoint = (point: XYPosition): XYPosition => {
  const screen = mounted().flowToScreenPosition(point)
  const rect = canvas.getBoundingClientRect()

  return { x: screen.x - rect.left, y: screen.y - rect.top }
}

const drawOverlay = (
  markers: readonly XYPosition[],
  line?: readonly [XYPosition, XYPosition]
): void => {
  overlay.replaceChildren(
    ...markers.map((point) => {
      const circle = document.createElementNS(svgNamespace, 'circle')
      const { x, y } = screenPoint(point)

      circle.dataset.testid = 'edge-crossing'
      circle.setAttribute('cx', String(x))
      circle.setAttribute('cy', String(y))
      circle.setAttribute('r', '6')

      return circle
    }),
    ...(line === undefined
      ? []
      : [
          (() => {
            const element = document.createElementNS(svgNamespace, 'line')
            const from = screenPoint(line[0])
            const to = screenPoint(line[1])

            element.dataset.testid = 'proximity-preview'
            element.setAttribute('x1', String(from.x))
            element.setAttribute('y1', String(from.y))
            element.setAttribute('x2', String(to.x))
            element.setAttribute('y2', String(to.y))

            return element
          })(),
        ])
  )
}

const center = (rect: FlowRect): XYPosition => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
})

const reportIntersections = (nodes: readonly FlowIntersectionCandidate[]) => {
  const dragged = nodes.find(({ id }) => id === draggedId)

  if (dragged !== undefined) {
    status.dataset.intersecting = ids(
      getIntersectingNodes(dragged, true, nodes)
    )
    status.dataset.inArea = String(
      dragged.id !== 'area' && isNodeIntersecting(dragged, area)
    )
  }
}

const reportCollisions = (nodes: readonly FlowIntersectionCandidate[]) => {
  const overlapping = nodes.flatMap((first, index) =>
    nodes
      .slice(index + 1)
      .flatMap(({ id, bounds }) =>
        getRectOverlapArea(first.bounds, bounds) > 0
          ? [`${first.id}/${id}`]
          : []
      )
  )

  status.dataset.overlapping = overlapping.join(',')
}

const reportEdges = (nodes: readonly FlowIntersectionCandidate[]) => {
  const { document: flowDocument } = mounted().getSnapshot()

  const geometry = getEdgesGeometry(flowDocument, {
    measurements: flowMeasurementsFromInternalNodes(
      flowDocument.nodes.map(({ id }) => mounted().getInternalNode(id))
    ),
    positionOverrides: live,
  })

  const crossings = geometry.flatMap((first, index) =>
    geometry
      .slice(index + 1)
      .flatMap((second) => getEdgeIntersections(first, second))
  )

  const dragged = nodes.find(({ id }) => id === draggedId)

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

const proximity = (nodes: readonly FlowIntersectionCandidate[]) => {
  const dragged = nodes.find(({ id }) => id === draggedId)

  return dragged === undefined
    ? undefined
    : getProximityConnection(nodes, dragged, {
        maxDistance: proximityDistance,
      })
}

const reportProximity = (nodes: readonly FlowIntersectionCandidate[]) => {
  const connection = live.size === 0 ? undefined : proximity(nodes)
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

const reporters = {
  intersections: reportIntersections,
  'node-collisions': reportCollisions,
  'edge-intersection': reportEdges,
  'proximity-connect': reportProximity,
}

const report = (): void => {
  const nodes = candidates()
  const bounds = getNodesBounds(nodes)

  status.value = `nodes:${nodes.length}`
  status.dataset.nodes = ids(mounted().getNodes())
  status.dataset.edges = ids(mounted().getEdges())
  status.dataset.bounds = [bounds.x, bounds.y, bounds.width, bounds.height]
    .map(Math.round)
    .join(',')
  Object.entries(reporters).find(([name]) => name === sceneName)?.[1](nodes)
}

/** Move nodes to resolved bounds through one public edit. */
const resolveCollisions = async (fixedIds: readonly string[]) => {
  const before = candidates()
  const resolved = resolveNodeCollisions(before, { margin: 10, fixedIds })

  const moves = new Map(
    resolved.map(({ id, bounds }, index) => {
      const previous = before[index]?.bounds ?? bounds

      return [id, { x: bounds.x - previous.x, y: bounds.y - previous.y }]
    })
  )

  await mounted().setNodes((nodes) =>
    nodes.map((node) => {
      const move = moves.get(node.id)

      return move === undefined || (move.x === 0 && move.y === 0)
        ? node
        : {
            ...node,
            position: {
              x: node.position.x + move.x,
              y: node.position.y + move.y,
            },
          }
    })
  )
}

/** Proximity Connect adds the offered edge on drop, unless it exists. */
const connectDropped = async (nodeId: string) => {
  draggedId = nodeId
  const connection = proximity(candidates())

  if (
    connection === undefined ||
    mounted()
      .getEdges()
      .some(
        ({ source, target }) =>
          source === connection.source && target === connection.target
      )
  ) {
    return
  }

  await mounted().addEdges(link(connection.source, connection.target))
}

const dropped = async (nodeIds: readonly string[]): Promise<void> => {
  const [nodeId] = nodeIds

  if (nodeId === undefined) {
    return
  }

  if (sceneName === 'node-collisions') {
    await resolveCollisions([nodeId])
  } else if (sceneName === 'proximity-connect') {
    await connectDropped(nodeId)
  }
}

flow.current = mountFlow(canvas, initial, {
  documentMode: 'uncontrolled',
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
  onNodeDrag: ({ nodeIds, positions }) => {
    ;[draggedId] = nodeIds

    for (const { nodeId, position } of positions) {
      live.set(nodeId, position)
    }

    report()
  },
  onNodeDragStop: ({ nodeIds, outcome }) => {
    live.clear()
    report()

    if (outcome === 'proposed') {
      void dropped(nodeIds)
    }

    draggedId = undefined
  },
})

// Mounting replaces the container's children, so the overlay joins afterwards.
canvas.append(overlay)

if (sceneName === 'node-collisions') {
  toolbar.append(
    pageButton('resolve-collisions', 'Resolve collisions', () => {
      void resolveCollisions([])
    })
  )
}

toolbar.append(
  pageButton('to-object', 'To object', () => {
    const object = toFlowObject(mounted().getSnapshot())

    status.dataset.object = `${object.nodes.length}:${object.edges.length}:${object.viewport.zoom}`
  })
)

report()

mounted().subscribeState(report)

// No host event reports measurements, so report once every node is measured.
const stopWaiting = everyFrame(() => {
  if (mounted().nodesInitialized()) {
    stopWaiting()
    report()
  }
})

globalThis.addEventListener('pagehide', () => flow.current?.destroy(), {
  once: true,
})
