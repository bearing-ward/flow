import {
  decodeFlowDocument,
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
  FlowNode,
  FlowRect,
  XYPosition,
} from '@flow/core'
import { FlowCanvas, useFlow } from '@flow/vue'
import type { FlowActions } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, onBeforeUnmount, shallowRef } from 'vue'
import type { VNode } from 'vue'

import '@flow/vue/style.css'

/*
 * Intersection recipes: Intersections, Node Collisions, Edge Intersection
 * and Proximity Connect. Live drag positions come from `nodeDrag`, sizes
 * from internal nodes, and every hit test from the core helpers.
 */

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

const document = Effect.runSync(decodeFlowDocument(initial))

/** The node being dragged and its live parent-relative position. */
const drag = shallowRef<{
  readonly id: string
  readonly position: XYPosition
}>()

/** Bumped when measurements may have changed, so the panel re-renders. */
const tick = shallowRef(0)

let flowActions: FlowActions | undefined

const ids = (items: readonly { readonly id: string }[]): string =>
  items
    .map(({ id }) => id)
    .toSorted()
    .join(',')

/**
 * Measurements and the live drag position. `nodeDrag` reports a
 * parent-relative anchor, the same as `positionOverrides`.
 */
const geometryOptions = (flow: FlowActions) => ({
  measurements: flowMeasurementsFromInternalNodes(
    flow.document.value.nodes.map(({ id }) => flow.getInternalNode(id))
  ),
  positionOverrides: new Map(
    drag.value === undefined ? [] : [[drag.value.id, drag.value.position]]
  ),
})

/** Absolute bounds of every visible node, moved by the live drag. */
const candidates = (flow: FlowActions): readonly FlowIntersectionCandidate[] =>
  getFlowNodeBounds(flow.document.value, geometryOptions(flow))

const proximity = (nodes: readonly FlowIntersectionCandidate[], id: string) => {
  const dragged = nodes.find((node) => node.id === id)

  return dragged === undefined
    ? undefined
    : getProximityConnection(nodes, dragged, {
        maxDistance: proximityDistance,
      })
}

/** Move nodes to resolved bounds through one public edit. */
const resolveCollisions = async (
  flow: FlowActions,
  fixedIds: readonly string[]
) => {
  const before = candidates(flow)
  const resolved = resolveNodeCollisions(before, { margin: 10, fixedIds })

  const moves = new Map(
    resolved.map(({ id, bounds }, index) => {
      const previous = before[index]?.bounds ?? bounds

      return [id, { x: bounds.x - previous.x, y: bounds.y - previous.y }]
    })
  )

  await flow.setNodes((nodes) =>
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
const connectDropped = async (flow: FlowActions, nodeId: string) => {
  const connection = proximity(candidates(flow), nodeId)

  if (
    connection === undefined ||
    flow.edges.value.some(
      ({ source, target }) =>
        source === connection.source && target === connection.target
    )
  ) {
    return
  }

  await flow.addEdges(link(connection.source, connection.target))
}

const center = (rect: FlowRect): XYPosition => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
})

/** Scene readouts: status attributes plus overlay markers and a line in flow space. */
interface SceneReadout {
  readonly attributes: Readonly<Record<string, string>>
  readonly markers: readonly XYPosition[]
  readonly line: readonly [XYPosition, XYPosition] | undefined
}

const sceneReadout = (
  flow: FlowActions,
  nodes: readonly FlowIntersectionCandidate[]
): SceneReadout => {
  const dragged = nodes.find(({ id }) => id === drag.value?.id)

  if (sceneName === 'intersections') {
    return {
      attributes:
        dragged === undefined
          ? {}
          : {
              'data-intersecting': ids(
                getIntersectingNodes(dragged, true, nodes)
              ),
              'data-in-area': String(isNodeIntersecting(dragged, area)),
            },
      markers: [],
      line: undefined,
    }
  }

  if (sceneName === 'node-collisions') {
    const overlapping = nodes.flatMap((first, index) =>
      nodes
        .slice(index + 1)
        .flatMap(({ id, bounds }) =>
          getRectOverlapArea(first.bounds, bounds) > 0
            ? [`${first.id}/${id}`]
            : []
        )
    )

    return {
      attributes: { 'data-overlapping': overlapping.join(',') },
      markers: [],
      line: undefined,
    }
  }

  if (sceneName === 'edge-intersection') {
    const geometry = getEdgesGeometry(
      flow.document.value,
      geometryOptions(flow)
    )

    const crossings = geometry.flatMap((first, index) =>
      geometry
        .slice(index + 1)
        .flatMap((second) => getEdgeIntersections(first, second))
    )

    return {
      attributes: {
        'data-crossings': String(crossings.length),
        'data-under-node':
          dragged === undefined
            ? ''
            : ids(
                geometry.filter((edge) =>
                  isEdgeIntersectingRect(edge, dragged.bounds)
                )
              ),
      },
      markers: crossings,
      line: undefined,
    }
  }

  if (sceneName === 'edge-paths') {
    // Publish the core edge geometry so tests can compare it with the rendered paths.
    return {
      attributes: {
        'data-geometry': JSON.stringify(
          getEdgesGeometry(flow.document.value, geometryOptions(flow)).map(
            ({ id, path }) => ({ id, path })
          )
        ),
      },
      markers: [],
      line: undefined,
    }
  }

  const connection =
    dragged === undefined ? undefined : proximity(nodes, dragged.id)

  const source = nodes.find(({ id }) => id === connection?.source)
  const target = nodes.find(({ id }) => id === connection?.target)

  return {
    attributes: {
      'data-proximity':
        connection === undefined
          ? ''
          : `${connection.source}>${connection.target}`,
    },
    markers: [],
    line:
      source === undefined || target === undefined
        ? undefined
        : [center(source.bounds), center(target.bounds)],
  }
}

/** Status, page controls and the overlay, driven by the public `useFlow` state. */
const RecipePanel = defineComponent({
  name: 'IntersectionRecipePanel',
  setup() {
    const flow = useFlow()
    const object = shallowRef('')
    flowActions = flow

    // No host event reports measurement changes, and Vue can report 0x0 sizes
    // right after mount, so re-render whenever measured geometry changes.
    let measured = ''

    let frame = requestAnimationFrame(function watch() {
      const next = flow.nodes.value
        .map(({ id }) => {
          const internal = flow.getInternalNode(id)

          return `${id}:${internal?.measurementStatus}:${internal?.width}x${internal?.height}:${JSON.stringify(internal?.handles)}`
        })
        .join('|')

      if (next !== measured) {
        measured = next
        tick.value += 1
      }

      frame = requestAnimationFrame(watch)
    })

    onBeforeUnmount(() => cancelAnimationFrame(frame))

    const toScreen = (point: XYPosition): XYPosition => {
      const { x, y, zoom } = flow.viewport.value

      return { x: point.x * zoom + x, y: point.y * zoom + y }
    }

    const overlay = (
      markers: readonly XYPosition[],
      line: readonly [XYPosition, XYPosition] | undefined
    ): VNode => {
      const ends = line?.map(toScreen)

      return h('svg', { class: 'intersection-overlay' }, [
        ...markers.map((point) => {
          const { x, y } = toScreen(point)

          return h('circle', {
            'data-testid': 'edge-crossing',
            cx: x,
            cy: y,
            r: 6,
          })
        }),
        ...(ends?.[0] === undefined || ends[1] === undefined
          ? []
          : [
              h('line', {
                'data-testid': 'proximity-preview',
                x1: ends[0].x,
                y1: ends[0].y,
                x2: ends[1].x,
                y2: ends[1].y,
              }),
            ]),
      ])
    }

    return () => {
      // Read the tick so measurement polling re-renders the readouts.
      void tick.value

      const nodes = candidates(flow)
      const bounds = getNodesBounds(nodes)
      const readout = sceneReadout(flow, nodes)

      return h('div', { class: 'intersection-recipe' }, [
        overlay(readout.markers, readout.line),
        h('div', { class: 'recipe-panel flow-vue-no-pan' }, [
          ...(sceneName === 'node-collisions'
            ? [
                h(
                  'button',
                  {
                    type: 'button',
                    'data-testid': 'resolve-collisions',
                    onClick: () => resolveCollisions(flow, []),
                  },
                  'Resolve collisions'
                ),
              ]
            : []),
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'to-object',
              onClick: () => {
                const result = toFlowObject(flow.getSnapshot())

                object.value = `${result.nodes.length}:${result.edges.length}:${result.viewport.zoom}`
              },
            },
            'To object'
          ),
          h(
            'output',
            {
              'data-testid': 'recipe-status',
              'data-nodes': ids(flow.nodes.value),
              'data-edges': ids(flow.edges.value),
              'data-bounds': [bounds.x, bounds.y, bounds.width, bounds.height]
                .map(Math.round)
                .join(','),
              'data-object': object.value,
              ...readout.attributes,
              'aria-live': 'polite',
            },
            `nodes:${nodes.length}`
          ),
        ]),
      ])
    }
  },
})

const onNodeDrag = (payload: {
  readonly node: FlowNode
  readonly position: XYPosition
}): void => {
  drag.value = { id: payload.node.id, position: payload.position }
}

const onNodeDragStop = (payload: {
  readonly node: FlowNode
  readonly status: string
}): void => {
  const flow = flowActions
  const { id } = payload.node

  // Vue commits the drop position on release; read it on the next frame.
  requestAnimationFrame(() => {
    drag.value = undefined

    if (flow === undefined || payload.status !== 'accepted') {
      return
    }

    if (sceneName === 'node-collisions') {
      void resolveCollisions(flow, [id])
    } else if (sceneName === 'proximity-connect') {
      void connectDropped(flow, id)
    }
  })
}

const root = globalThis.document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Vue intersection recipes root')
}

const app = createApp(
  defineComponent({
    name: 'IntersectionRecipes',
    setup() {
      return () =>
        h('div', { class: 'recipe-root' }, [
          h(
            FlowCanvas,
            {
              defaultDocument: document,
              defaultViewport: { x: 0, y: 0, zoom: 1 },
              onNodeDrag,
              onNodeDragStop,
            },
            { default: () => h(RecipePanel) }
          ),
        ])
    },
  })
)

app.mount(root)

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
