import {
  decodeFlowDocument,
  getBezierPath,
  getOutgoers,
  getViewportForBounds,
} from '@flow/core'
import type { FlowConnection, FlowEdge, FlowNode } from '@flow/core'
import {
  FlowCanvas,
  FlowBaseEdge,
  FlowProvider,
  useFlow,
  useStore,
} from '@flow/vue'
import type {
  FlowActions,
  FlowConnectionEndDetails,
  FlowPosition,
} from '@flow/vue'
import { Effect, Schema as S } from 'effect'
import { toPng } from 'html-to-image'
import { createApp, defineComponent, h, ref } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

const RecipeSchema = S.Literals([
  'delete-edge-on-drop',
  'contextual-zoom',
  'drag-and-drop',
  'preventing-cycles',
  'turbo-flow',
  'download-image',
])

const recipe = S.decodeUnknownSync(RecipeSchema)(
  new URLSearchParams(location.search).get('recipe') ?? 'delete-edge-on-drop'
)

const names = {
  'delete-edge-on-drop': 'Delete Edge on Drop',
  'contextual-zoom': 'Contextual Zoom',
  'drag-and-drop': 'Drag and Drop',
  'preventing-cycles': 'Preventing Cycles',
  'turbo-flow': 'Turbo Flow',
  'download-image': 'Download Image',
}

const handles = [
  { id: 'in', kind: 'target', side: 'left' },
  { id: 'out', kind: 'source', side: 'right' },
] as const

const nodeType = (): string => {
  if (recipe === 'contextual-zoom') {
    return 'contextual'
  }

  return recipe === 'turbo-flow' ? 'turbo' : 'default'
}

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: ['a', 'b', 'c'].map((id, index) => ({
      id,
      label: id.toUpperCase(),
      position: { x: 80 + index * 230, y: 140 + index * 70 },
      size: { width: 130, height: 60 },
      handles,
      type: nodeType(),
    })),
    edges: [
      {
        id: 'ab',
        source: 'a',
        sourceHandle: 'out',
        target: 'b',
        targetHandle: 'in',
        selected: true,
        reconnectable: true,
        type: recipe === 'turbo-flow' ? 'turbo' : 'default',
      },
      ...(recipe === 'preventing-cycles'
        ? [
            {
              id: 'bc',
              source: 'b',
              sourceHandle: 'out',
              target: 'c',
              targetHandle: 'in',
            },
          ]
        : []),
    ],
  })
)

const ContextualNode = defineComponent({
  inheritAttrs: false,
  props: { label: { type: String, required: true } },
  setup(props) {
    const zoom = useStore((state) => state.transform[2])

    return () => {
      let band = 'label'
      let content = props.label

      if (zoom.value < 0.5) {
        band = 'summary'
        content = '•'
      } else if (zoom.value >= 1.5) {
        band = 'details'
        content = `${props.label}: detailed node content`
      }

      return h(
        'div',
        { 'data-testid': 'contextual-content', 'data-band': band },
        content
      )
    }
  },
})

const TurboNode = defineComponent({
  inheritAttrs: false,
  props: { label: { type: String, required: true } },
  setup(props) {
    return () =>
      h('div', { class: 'turbo-node', 'data-testid': 'turbo-node' }, [
        h('strong', props.label),
        h('span', 'Gradient node'),
      ])
  },
})

// SAFETY: FlowCanvas supplies accepted handle side literals to custom edges.
const sideProp = {
  type: String as PropType<FlowPosition>,
  required: true,
} as const

const TurboEdge = defineComponent({
  inheritAttrs: false,
  props: {
    id: { type: String, required: true },
    sourceX: { type: Number, required: true },
    sourceY: { type: Number, required: true },
    targetX: { type: Number, required: true },
    targetY: { type: Number, required: true },
    sourcePosition: sideProp,
    targetPosition: sideProp,
  },
  setup(props) {
    return () => {
      const [path] = getBezierPath(props)
      const gradientId = `turbo-gradient-${props.id}`

      return [
        h('defs', [
          h(
            'linearGradient',
            { id: gradientId, x1: '0%', x2: '100%', y1: '0%', y2: '100%' },
            [
              h('stop', { offset: '0%', 'stop-color': '#ff0072' }),
              h('stop', { offset: '100%', 'stop-color': '#00d4ff' }),
            ]
          ),
        ]),
        h(FlowBaseEdge, {
          path,
          style: { stroke: `url(#${gradientId})`, strokeWidth: 4 },
          'data-testid': 'turbo-edge',
        }),
      ]
    }
  },
})

let actions: FlowActions | undefined

let reconnectSucceeded = false

let reconnectEdge: FlowEdge | undefined

const lifecycle: string[] = []

const requireFlow = (): FlowActions => {
  if (actions === undefined) {
    throw new Error('Recipe canvas has not initialized')
  }

  return actions
}

/** Reject a connection if traversing from its target can reach its source. */
const isValidConnection = (connection: FlowConnection): boolean => {
  const flow = requireFlow()
  const nodes = flow.getNodes()
  const edges = flow.getEdges()
  const visited = new Set<string>()

  const reachesSource = (node: FlowNode): boolean => {
    if (node.id === connection.source) {
      return true
    }

    if (visited.has(node.id)) {
      return false
    }

    visited.add(node.id)

    return getOutgoers(node, nodes, edges).some(reachesSource)
  }

  const target = nodes.find(({ id }) => id === connection.target)

  return target !== undefined && !reachesSource(target)
}

const RecipePanel = defineComponent({
  setup() {
    actions = useFlow()
    const flow = actions
    const nodeCount = useStore((state) => state.nodes.length)
    const edgeCount = useStore((state) => state.edges.length)
    const image = ref('')
    const failure = ref('')

    const download = async (): Promise<void> => {
      try {
        const canvasElement =
          globalThis.document.querySelector<HTMLElement>('.flow-vue-canvas')

        const bounds = flow.getNodesBounds(flow.getNodes())

        const viewport = getViewportForBounds({
          bounds,
          width: 800,
          height: 500,
          limits: { minZoom: 0.1, maxZoom: 2 },
          padding: 0.1,
        })

        if (canvasElement === null || viewport === undefined) {
          throw new Error('No viewport to export')
        }

        // Vue renders base edges beside the node viewport. Clone all render
        // layers into an export canvas without changing the live viewport.
        const exportElement = globalThis.document.createElement('div')
        exportElement.className = canvasElement.className
        exportElement.setAttribute('aria-hidden', 'true')
        exportElement.style.cssText =
          'position:relative;left:0;top:0;width:800px;height:500px;margin:0;border:0;'

        for (const child of canvasElement.childNodes) {
          exportElement.append(child.cloneNode(true))
        }

        for (const layer of exportElement.querySelectorAll<
          HTMLElement | SVGElement
        >(
          '.flow-vue-viewport, .flow-vue-edges:not(.flow-vue-edges-elevated), .flow-vue-edge-label-renderer'
        )) {
          layer.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
          layer.style.transformOrigin = '0 0'
        }

        globalThis.document.body.append(exportElement)

        try {
          image.value = await toPng(exportElement, {
            backgroundColor: '#ffffff',
            width: 800,
            height: 500,
            pixelRatio: 1,
            style: { position: 'relative', left: '0', top: '0' },
          })
        } finally {
          exportElement.remove()
        }

        const link = globalThis.document.createElement('a')
        link.download = 'flow.png'
        link.href = image.value
        link.click()
      } catch (error) {
        failure.value = error instanceof Error ? error.message : String(error)
      }
    }

    return () =>
      h('aside', { class: 'closing-panel flow-vue-no-pan flow-vue-no-drag' }, [
        h('h1', names[recipe]),
        h(
          'output',
          {
            'data-testid': 'recipe-status',
            'data-nodes': nodeCount.value,
            'data-edges': edgeCount.value,
          },
          `${nodeCount.value} nodes, ${edgeCount.value} edges`
        ),
        ...Object.entries(names).map(([id, name]) =>
          h('a', { href: `?recipe=${id}` }, name)
        ),
        ...(recipe === 'contextual-zoom'
          ? [0.3, 1, 2].map((zoom) =>
              h(
                'button',
                {
                  type: 'button',
                  onClick: () => flow.setViewport({ x: 0, y: 0, zoom }),
                },
                `Zoom ${zoom}`
              )
            )
          : []),
        ...(recipe === 'drag-and-drop'
          ? [
              h(
                'div',
                {
                  class: 'sidebar-node',
                  draggable: true,
                  'data-testid': 'sidebar-node',
                  onDragstart: (event: DragEvent) => {
                    event.dataTransfer?.setData(
                      'application/flow-node',
                      'Sidebar node'
                    )

                    if (event.dataTransfer !== null) {
                      event.dataTransfer.effectAllowed = 'move'
                    }
                  },
                },
                'Drag a node onto the pane'
              ),
            ]
          : []),
        ...(recipe === 'download-image'
          ? [
              h(
                'button',
                { type: 'button', onClick: download },
                'Download PNG'
              ),
              h(
                'a',
                {
                  'data-testid': 'png-result',
                  href: image.value,
                  download: 'flow.png',
                },
                image.value === '' ? 'No image yet' : 'Save exported PNG'
              ),
              h('output', { 'data-testid': 'export-error' }, failure.value),
            ]
          : []),
      ])
  },
})

let dropped = 0

const app = createApp(
  defineComponent({
    setup() {
      return () =>
        h(FlowProvider, null, {
          default: () => [
            h(FlowCanvas, {
              defaultDocument: document,
              class: `closing-${recipe}`,
              nodeTypes: { contextual: ContextualNode, turbo: TurboNode },
              edgeTypes: { turbo: TurboEdge },
              autoPanOnConnect: false,
              isValidConnection:
                recipe === 'preventing-cycles' ? isValidConnection : () => true,
              onReconnectStart: ({ edge }: { readonly edge: FlowEdge }) => {
                reconnectSucceeded = false
                reconnectEdge = edge
                lifecycle.push('start')
              },
              onReconnect: () => {
                reconnectSucceeded = true
                lifecycle.push('reconnect')
              },
              onReconnectEnd: (
                _payload: { readonly status: string },
                details?: FlowConnectionEndDetails
              ) => {
                lifecycle.push('end')

                if (
                  recipe === 'delete-edge-on-drop' &&
                  !reconnectSucceeded &&
                  reconnectEdge !== undefined &&
                  details?.event !== undefined &&
                  details.connectionState.toNode === null
                ) {
                  void requireFlow().deleteElements({
                    edgeIds: [reconnectEdge.id],
                  })
                }
              },
              onDragover: (event: DragEvent) => {
                if (recipe === 'drag-and-drop') {
                  event.preventDefault()

                  if (event.dataTransfer !== null) {
                    event.dataTransfer.dropEffect = 'move'
                  }
                }
              },
              onDrop: (event: DragEvent) => {
                if (recipe !== 'drag-and-drop') {
                  return
                }

                event.preventDefault()

                const label = event.dataTransfer?.getData(
                  'application/flow-node'
                )

                if (label !== 'Sidebar node') {
                  return
                }

                const flow = requireFlow()

                const position = flow.screenToFlowPosition({
                  x: event.clientX,
                  y: event.clientY,
                })

                dropped += 1
                void flow.addNodes({
                  id: `dropped-${dropped}`,
                  label,
                  position,
                  size: { width: 130, height: 60 },
                  handles,
                })
              },
            }),
            h(RecipePanel),
          ],
        })
    },
  })
)

const root = globalThis.document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing closing recipes root')
}

app.mount(root)

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })

/** Browser tests read the same public instance used by the recipe controls. */
declare global {
  interface Window {
    __flowVueClosingRecipes?: {
      readonly flow: () => FlowActions
      readonly lifecycle: () => readonly string[]
    }
  }
}

window.__flowVueClosingRecipes = {
  flow: requireFlow,
  lifecycle: () => [...lifecycle],
}
