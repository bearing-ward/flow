import { decodeFlowDocument, getBezierPath } from '@flow/core'
import type { FlowNode } from '@flow/core'
import {
  FlowBackground,
  FlowBaseEdge,
  FlowCanvas,
  FlowControls,
  FlowEdgeLabelRenderer,
  FlowMiniMap,
  FlowNodeToolbar,
  FlowPanel,
  useFlow,
} from '@flow/vue'
import type { FlowActions, FlowPosition } from '@flow/vue'
import { Effect, Schema as S } from 'effect'
import { computed, createApp, defineComponent, h, onScopeDispose } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

const AnnotationDataSchema = S.Struct({ text: S.String })

/** Overview "annotation" node: its own markup instead of the default label. */
const AnnotationNode = defineComponent({
  name: 'RecipeAnnotationNode',
  inheritAttrs: false,
  props: {
    label: { type: String, required: true },
    // SAFETY: FlowCanvas forwards the accepted node's JSON data, or undefined.
    data: { type: Object as PropType<FlowNode['data']>, default: undefined },
  },
  setup(props) {
    return () => {
      const { text } = S.decodeUnknownSync(AnnotationDataSchema)(props.data)

      return h(
        'div',
        { class: 'recipe-annotation', 'data-testid': 'custom-node' },
        [h('strong', props.label), h('span', text)]
      )
    }
  },
})

// SAFETY: FlowCanvas supplies side literals from accepted handles.
const sideProp = {
  type: String as PropType<FlowPosition>,
  required: true,
} as const

/** Overview "button edge": a bezier edge with an HTML delete button at its midpoint. */
const ButtonEdge = defineComponent({
  name: 'RecipeOverviewButtonEdge',
  inheritAttrs: false,
  props: {
    id: { type: String, required: true },
    sourceX: { type: Number, required: true },
    sourceY: { type: Number, required: true },
    targetX: { type: Number, required: true },
    targetY: { type: Number, required: true },
    sourcePosition: sideProp,
    targetPosition: sideProp,
    markerEnd: { type: String, default: undefined },
  },
  setup(props) {
    const flow = useFlow()

    return () => {
      const [path, labelX, labelY] = getBezierPath(props)

      return [
        h(FlowBaseEdge, {
          path,
          markerEnd: props.markerEnd,
          'data-testid': 'custom-edge',
        }),
        h(FlowEdgeLabelRenderer, null, {
          default: () =>
            h(
              'button',
              {
                type: 'button',
                class: 'recipe-edge-button flow-vue-no-pan',
                'aria-label': `Delete edge ${props.id}`,
                style: {
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                  pointerEvents: 'all',
                },
                onClick: () => flow.deleteElements({ edgeIds: [props.id] }),
              },
              '×'
            ),
        }),
      ]
    }
  },
})

const handles = [
  { id: 'in', kind: 'target', side: 'left' },
  { id: 'out', kind: 'source', side: 'right' },
] as const

const plain = (id: string, label: string, x: number, y: number) => ({
  id,
  label,
  position: { x, y },
  size: { width: 150, height: 50 },
  handles,
})

const link = (id: string, source: string, target: string) => ({
  id,
  source,
  sourceHandle: 'out',
  target,
  targetHandle: 'in',
})

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'annotation',
        type: 'annotation',
        label: 'Annotation',
        data: { text: 'Custom node markup' },
        position: { x: 0, y: -140 },
        size: { width: 200, height: 70 },
      },
      plain('input', 'Input', 0, 0),
      plain('default', 'Default', 260, 0),
      plain('output', 'Output', 520, -80),
      plain('other', 'Other output', 520, 80),
    ],
    edges: [
      { ...link('e-input', 'input', 'default'), markerEnd: 'arrowclosed' },
      {
        ...link('e-step', 'default', 'output'),
        path: 'smoothstep',
        markerEnd: 'arrow',
        stroke: '#2563eb',
      },
      { ...link('e-button', 'default', 'other'), type: 'button' },
    ],
  })
)

/** Select only the clicked node; the Vue canvas does not select on click. */
const selectOnly = (flow: FlowActions, nodeId: string) =>
  flow.setNodes((nodes) =>
    nodes.map((node) => ({ ...node, selected: node.id === nodeId }))
  )

let flowActions: FlowActions | undefined

/** Panel, toolbars, minimap, controls and background, all from the public entry. */
const Overview = defineComponent({
  name: 'FeatureOverview',
  setup() {
    const flow = useFlow()
    flowActions = flow

    // Fit the view once every node has a measurement.
    let frame = requestAnimationFrame(function fitWhenMeasured() {
      if (flow.nodesInitialized()) {
        void flow.fitView()
      } else {
        frame = requestAnimationFrame(fitWhenMeasured)
      }
    })

    onScopeDispose(() => cancelAnimationFrame(frame))

    const zoom = computed(() => String(flow.viewport.value.zoom))

    return () => [
      h(FlowBackground, { variant: 'dots', gap: 20 }),
      h(FlowMiniMap),
      h(FlowControls, { position: 'bottom-left' }),
      h(
        FlowPanel,
        { position: 'top-left', 'data-testid': 'overview-panel' },
        {
          default: () =>
            h('div', { class: 'recipe-overview-panel' }, [
              h('h1', 'Feature overview'),
              h(
                'output',
                {
                  'data-testid': 'recipe-status',
                  'data-zoom': zoom.value,
                  'data-nodes': String(flow.nodes.value.length),
                },
                'Click a node for its toolbar; drag its corner to resize.'
              ),
            ]),
        }
      ),
      ...flow.nodes.value.map(({ id }) =>
        h(
          FlowNodeToolbar,
          {
            key: id,
            nodeId: id,
            'data-testid': 'overview-node-toolbar',
            'data-toolbar-node': id,
          },
          {
            default: () =>
              h(
                'button',
                {
                  type: 'button',
                  class: 'recipe-toolbar-button',
                  onClick: () => flow.deleteElements({ nodeIds: [id] }),
                },
                'Delete'
              ),
          }
        )
      ),
    ]
  },
})

const root = globalThis.document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Vue feature overview root')
}

const app = createApp(
  defineComponent({
    name: 'FeatureOverviewRecipe',
    setup() {
      return () =>
        h('div', { class: 'recipe-root' }, [
          h(
            FlowCanvas,
            {
              defaultDocument: document,
              nodeTypes: { annotation: AnnotationNode },
              edgeTypes: { button: ButtonEdge },
              onNodeClick: (node: FlowNode) => {
                if (flowActions !== undefined) {
                  void selectOnly(flowActions, node.id)
                }
              },
            },
            { default: () => h(Overview) }
          ),
        ])
    },
  })
)

app.mount(root)

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
