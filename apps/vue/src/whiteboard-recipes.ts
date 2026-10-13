import {
  decodeFlowDocument,
  getFreehandPath,
  getInternalNodeBounds,
  getNodesInsideLasso,
  getPointsBounds,
  getRectFromPoints,
  polylineIntersectsRect,
  polylinesIntersect,
  translatePoints,
} from '@flow/core'
import type { FlowNode, XYPosition } from '@flow/core'
import { FlowCanvas, useFlow } from '@flow/vue'
import type { FlowActions } from '@flow/vue'
import { Effect, Schema as S } from 'effect'
import { computed, createApp, defineComponent, h, ref, shallowRef } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

type Tool = 'select' | 'lasso' | 'eraser' | 'rectangle' | 'freehand'

const tools: readonly Tool[] = [
  'select',
  'lasso',
  'eraser',
  'rectangle',
  'freehand',
]

const activeTool = ref<Tool>('select')

const lassoPartial = ref(false)

/** Space around a freehand stroke so its round caps stay inside the node. */
const strokePadding = 4

const FreehandDataSchema = S.Struct({
  points: S.Array(S.Tuple([S.Finite, S.Finite])),
})

const nodeProps = {
  // SAFETY: FlowCanvas forwards the accepted node's JSON data, or undefined.
  data: { type: Object as PropType<FlowNode['data']>, default: undefined },
} as const

/** Whiteboard "Rectangle": a plain filled shape sized by its node. */
const RectangleNode = defineComponent({
  name: 'RecipeRectangleNode',
  inheritAttrs: false,
  setup() {
    return () =>
      h('div', {
        class: 'recipe-shape recipe-rectangle',
        'data-testid': 'rectangle-shape',
      })
  },
})

/** Whiteboard "Freehand Draw": the stroke, relative to the node, as a smoothed path. */
const FreehandNode = defineComponent({
  name: 'RecipeFreehandNode',
  inheritAttrs: false,
  props: nodeProps,
  setup(props) {
    return () => {
      const { points } = S.decodeUnknownSync(FreehandDataSchema)(props.data)

      return h('svg', { class: 'recipe-shape recipe-freehand' }, [
        h('path', {
          d: getFreehandPath(points.map(([x, y]) => ({ x, y }))),
          fill: 'none',
          stroke: '#0f172a',
          'stroke-width': 3,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'data-testid': 'freehand-path',
        }),
      ])
    }
  },
})

const nodeTypes = { rectangle: RectangleNode, freehand: FreehandNode }

const box = (id: string, x: number, y: number) => ({
  id,
  label: id,
  position: { x, y },
  size: { width: 100, height: 50 },
  handles: [
    { id: 'in', kind: 'target', side: 'left' },
    { id: 'out', kind: 'source', side: 'right' },
  ],
})

const link = (source: string, target: string) => ({
  id: `${source}-${target}`,
  source,
  sourceHandle: 'out',
  target,
  targetHandle: 'in',
})

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      box('A', 40, 40),
      box('B', 200, 40),
      box('X', 400, 40),
      box('C', 40, 200),
      box('Y', 560, 360),
    ],
    edges: [link('A', 'B'), link('B', 'X'), link('X', 'Y'), link('C', 'Y')],
  })
)

const defaultViewport = { x: 40, y: 30, zoom: 1.25 }

const measuredCandidates = (flow: FlowActions) =>
  flow.nodes.value.flatMap(({ id }) => {
    const internal = flow.getInternalNode(id)

    return internal === undefined ? [] : [getInternalNodeBounds(internal)]
  })

/** Rendered edge paths sampled in flow coordinates; the path `d` is in flow space. */
const sampleEdgePaths = (
  root: Element
): readonly { readonly id: string; readonly points: XYPosition[] }[] =>
  [...root.querySelectorAll<SVGGElement>('g[data-edge-id]')].flatMap(
    (group) => {
      const id = group.dataset.edgeId
      const path = group.querySelector('path.flow-vue-edge-path')

      if (id === undefined || !(path instanceof SVGPathElement)) {
        return []
      }

      const total = path.getTotalLength()
      const steps = Math.max(2, Math.ceil(total / 6))
      const points: XYPosition[] = []

      for (let step = 0; step <= steps; step += 1) {
        const { x, y } = path.getPointAtLength((total * step) / steps)
        points.push({ x, y })
      }

      return [{ id, points }]
    }
  )

let drawingCount = 0

/** The pane tool overlay: owns pointer input while a tool is active. */
const ToolOverlay = defineComponent({
  name: 'WhiteboardToolOverlay',
  setup() {
    const flow = useFlow()
    const overlay = shallowRef<HTMLElement>()
    const screenPoints = shallowRef<readonly XYPosition[]>([])

    const marked = shallowRef<{ nodes: string[]; edges: string[] }>({
      nodes: [],
      edges: [],
    })

    let pointerId: number | undefined

    const local = (event: PointerEvent): XYPosition => {
      const bounds = overlay.value?.getBoundingClientRect()

      return {
        x: event.clientX - (bounds?.left ?? 0),
        y: event.clientY - (bounds?.top ?? 0),
      }
    }

    const toFlow = (points: readonly XYPosition[]): readonly XYPosition[] => {
      const bounds = overlay.value?.getBoundingClientRect()

      return points.map(({ x, y }) =>
        flow.screenToFlowPosition({
          x: x + (bounds?.left ?? 0),
          y: y + (bounds?.top ?? 0),
        })
      )
    }

    const updateEraserMarks = (): void => {
      const trail = toFlow(screenPoints.value)
      const canvas = overlay.value?.closest('.flow-vue-canvas')

      const nodes = measuredCandidates(flow)
        .filter(({ bounds }) => polylineIntersectsRect(trail, bounds))
        .map(({ id }) => id)

      const edges =
        canvas === null || canvas === undefined
          ? []
          : sampleEdgePaths(canvas)
              .filter(({ points }) => polylinesIntersect(trail, points))
              .map(({ id }) => id)

      marked.value = { nodes, edges }
    }

    const finishLasso = async (): Promise<void> => {
      const polygon = toFlow(screenPoints.value)

      const selected = new Set(
        getNodesInsideLasso(measuredCandidates(flow), polygon, {
          partial: lassoPartial.value,
        }).map(({ id }) => id)
      )

      await flow.setNodes((nodes) =>
        nodes.map((node) => ({ ...node, selected: selected.has(node.id) }))
      )
    }

    const finishEraser = async (): Promise<void> => {
      updateEraserMarks()

      const { nodes, edges } = marked.value
      marked.value = { nodes: [], edges: [] }

      if (nodes.length > 0 || edges.length > 0) {
        await flow.deleteElements({ nodeIds: nodes, edgeIds: edges })
      }
    }

    const finishRectangle = async (): Promise<void> => {
      const [first] = screenPoints.value
      const last = screenPoints.value.at(-1)

      if (first === undefined || last === undefined) {
        return
      }

      const screen = getRectFromPoints(first, last)

      if (screen.width < 5 || screen.height < 5) {
        return
      }

      const [start, end] = toFlow([first, last])

      if (start === undefined || end === undefined) {
        return
      }

      const rect = getRectFromPoints(start, end)
      drawingCount += 1

      await flow.addNodes({
        id: `rectangle-${drawingCount}`,
        type: 'rectangle',
        label: `Rectangle ${drawingCount}`,
        position: { x: rect.x, y: rect.y },
        size: { width: rect.width, height: rect.height },
      })
    }

    const finishFreehand = async (): Promise<void> => {
      const points = toFlow(screenPoints.value)
      const bounds = getPointsBounds(points)

      if (bounds === undefined) {
        return
      }

      const origin = {
        x: bounds.x - strokePadding,
        y: bounds.y - strokePadding,
      }

      drawingCount += 1

      await flow.addNodes({
        id: `freehand-${drawingCount}`,
        type: 'freehand',
        label: `Freehand ${drawingCount}`,
        position: origin,
        size: {
          width: bounds.width + strokePadding * 2,
          height: bounds.height + strokePadding * 2,
        },
        data: {
          points: translatePoints(points, origin).map(({ x, y }) => [x, y]),
        },
      })
    }

    const finish = async (): Promise<void> => {
      switch (activeTool.value) {
        case 'lasso': {
          await finishLasso()

          break
        }

        case 'eraser': {
          await finishEraser()

          break
        }

        case 'rectangle': {
          await finishRectangle()

          break
        }

        case 'freehand': {
          await finishFreehand()

          break
        }

        default: {
          break
        }
      }

      screenPoints.value = []
    }

    const onPointerdown = (event: PointerEvent): void => {
      event.stopPropagation()

      if (event.button !== 0 || pointerId !== undefined) {
        return
      }

      if (event.currentTarget instanceof HTMLElement) {
        event.currentTarget.setPointerCapture(event.pointerId)
      }

      const { pointerId: pressed } = event
      pointerId = pressed
      screenPoints.value = [local(event)]
    }

    const onPointermove = (event: PointerEvent): void => {
      event.stopPropagation()

      if (event.pointerId !== pointerId) {
        return
      }

      screenPoints.value = [...screenPoints.value, local(event)]

      if (activeTool.value === 'eraser') {
        updateEraserMarks()
      }
    }

    const onPointerup = (event: PointerEvent): void => {
      event.stopPropagation()

      if (event.pointerId !== pointerId) {
        return
      }

      pointerId = undefined
      screenPoints.value = [...screenPoints.value, local(event)]
      void finish()
    }

    const onPointercancel = (event: PointerEvent): void => {
      event.stopPropagation()

      if (event.pointerId === pointerId) {
        pointerId = undefined
        screenPoints.value = []
        marked.value = { nodes: [], edges: [] }
      }
    }

    const preview = () => {
      const points = screenPoints.value
      const [first] = points
      const last = points.at(-1)

      if (first === undefined || last === undefined) {
        return []
      }

      if (activeTool.value === 'rectangle') {
        const rect = getRectFromPoints(first, last)

        return [
          h('rect', {
            ...rect,
            fill: '#3b82f61a',
            stroke: '#2563eb',
            'data-testid': 'tool-preview',
          }),
        ]
      }

      const line = points.map(({ x, y }) => `${x},${y}`).join(' ')

      return [
        h(activeTool.value === 'lasso' ? 'polygon' : 'polyline', {
          points: line,
          fill: activeTool.value === 'lasso' ? '#3b82f61a' : 'none',
          stroke: activeTool.value === 'eraser' ? '#ef4444' : '#2563eb',
          'stroke-width': 2,
          'stroke-dasharray': activeTool.value === 'lasso' ? '4 3' : undefined,
          'data-testid': 'tool-preview',
        }),
      ]
    }

    const markStyle = computed(() =>
      [
        ...marked.value.nodes.map(
          (id) => `.flow-vue-node[data-node-id="${CSS.escape(id)}"]`
        ),
        ...marked.value.edges.map(
          (id) => `g[data-edge-id="${CSS.escape(id)}"] path`
        ),
      ]
        .map((selector) => `${selector} { opacity: 0.3; }`)
        .join('\n')
    )

    return () => {
      const active = activeTool.value !== 'select'

      return h(
        'div',
        {
          ref: overlay,
          class: ['recipe-tool-overlay', active ? 'flow-vue-no-pan' : ''],
          'data-testid': 'tool-overlay',
          'data-marked-nodes': marked.value.nodes.join(','),
          'data-marked-edges': marked.value.edges.join(','),
          style: {
            pointerEvents: active ? 'auto' : 'none',
            touchAction: active ? 'none' : 'auto',
            cursor: active ? 'crosshair' : 'default',
          },
          onPointerdown,
          onPointermove,
          onPointerup,
          onPointercancel,
        },
        [h('style', markStyle.value), h('svg', preview())]
      )
    }
  },
})

const ids = (items: readonly { readonly id: string }[]): string =>
  items
    .map(({ id }) => id)
    .toSorted()
    .join(',')

/** Tool bar and status, driven by the public `useFlow` state. */
const Toolbar = defineComponent({
  name: 'WhiteboardToolbar',
  setup() {
    const flow = useFlow()

    const selected = computed(() =>
      ids(flow.nodes.value.filter((node) => node.selected === true))
    )

    const nodes = computed(() => ids(flow.nodes.value))
    const edges = computed(() => ids(flow.edges.value))

    return () =>
      h('div', { class: 'recipe-toolbar flow-vue-no-pan' }, [
        ...tools.map((tool) =>
          h(
            'button',
            {
              type: 'button',
              'data-testid': `tool-${tool}`,
              'aria-pressed': activeTool.value === tool ? 'true' : 'false',
              onClick: () => {
                activeTool.value = tool
              },
            },
            tool
          )
        ),
        h('label', [
          h('input', {
            type: 'checkbox',
            'data-testid': 'lasso-partial',
            checked: lassoPartial.value,
            onChange: (event: Event) => {
              if (event.target instanceof HTMLInputElement) {
                lassoPartial.value = event.target.checked
              }
            },
          }),
          ' partial',
        ]),
        h(
          'output',
          {
            'data-testid': 'recipe-status',
            'data-tool': activeTool.value,
            'data-selected': selected.value,
            'data-nodes': nodes.value,
            'data-edges': edges.value,
            'aria-live': 'polite',
          },
          `selected:${selected.value}`
        ),
      ])
  },
})

const root = globalThis.document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Vue whiteboard recipes root')
}

const app = createApp(
  defineComponent({
    name: 'WhiteboardRecipes',
    setup() {
      return () =>
        h('div', { class: 'recipe-root' }, [
          h(
            FlowCanvas,
            { defaultDocument: document, defaultViewport, nodeTypes },
            { default: () => [h(ToolOverlay), h(Toolbar)] }
          ),
        ])
    },
  })
)

app.mount(root)

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
