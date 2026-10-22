import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  EdgeIdSchema,
} from '@flow/core'
import {
  FlowCanvas,
  FlowEdgeLabelRenderer,
  useFlow,
  useNodes,
  useEdges,
  useViewport,
} from '@flow/vue'
import {
  createApp,
  defineComponent,
  h,
  ref,
  watchEffect,
  onMounted,
  onUnmounted,
} from 'vue'

import {
  componentCallbacks,
  mountComponentControls,
  componentConfig,
  componentReceipt,
  recordDistinct,
  recordEvent,
  recordViewport,
  recordNodes,
} from '../../shared/upstream/component.ts'
import { prepareUpstreamRoot } from '../../shared/upstream/fixture.ts'

import '@flow/vue/style.css'

const root = prepareUpstreamRoot()

const config = componentConfig(Number(location.pathname.split('/').at(-1)))

const receipt = componentReceipt()

const accepted = ref(config.document)

const key = ref(0)

const Custom = defineComponent({
  setup: () => () => h('div', { class: 'customnode' }, 'custom node'),
})

const Checker = defineComponent({
  setup() {
    const flow = useFlow()

    const check = () =>
      receipt.checks.push({
        nodesLength: flow.getNodes().length,
        lookupSize: flow
          .getNodes()
          .filter((n) => flow.getInternalNode(n.id) !== undefined).length,
      })

    if (config.id === 49) {
      check()
    } else {
      onMounted(check)
    }

    return () => h('div', 'checker')
  },
})

const CustomEdge = defineComponent({
  props: ['id', 'sourceX', 'sourceY', 'targetX', 'targetY', 'path'],
  setup: (props) => () => [
    h('path', {
      d: `M${props.sourceX} ${props.sourceY} L${props.targetX} ${props.targetY}`,
      stroke: 'black',
      'data-component-custom-edge': 'true',
    }),
    ...(config.id === 42
      ? [
          h(FlowEdgeLabelRenderer, null, {
            default: () => h('div', { class: 'label' }, props.id),
          }),
        ]
      : []),
  ],
})

const Probe = defineComponent({
  setup() {
    const flow = useFlow()
    const nodes = useNodes()
    const edges = useEdges()
    const viewport = useViewport()
    watchEffect(() => {
      // Read the composables themselves, then the instance measurement projections.
      // useNodes/getNodes share accepted nodes but have different transient metadata.
      const current = nodes.value
      recordNodes(receipt, current)
      recordDistinct(receipt.edges, edges.value)
      recordViewport(receipt, viewport.value)
    })
    let frame = 0

    const poll = () => {
      recordDistinct(receipt.initialized, flow.nodesInitialized())
      frame = requestAnimationFrame(poll)
    }

    recordDistinct(receipt.initialized, flow.nodesInitialized())
    onMounted(() => {
      poll()
      window.__componentUpdate = async () => {
        await flow.updateNode('1', { style: { width: 200, height: 100 } })
      }

      const ready = async () => {
        if (
          config.document.nodes.length &&
          !config.options.onlyRenderVisibleElements &&
          !flow.nodesInitialized()
        ) {
          frame = requestAnimationFrame(() => {
            void ready()
          })

          return
        }

        if (config.fit) {
          try {
            await flow.fitView(config.fitOptions)
          } catch (error) {
            receipt.errors.push(
              error instanceof Error ? error.message : String(error)
            )
          }
        }

        root.dataset.upstreamReady = 'true'
      }

      void ready()
    })
    onUnmounted(() => cancelAnimationFrame(frame))

    return () => null
  },
})

const eventNames = [
  'onNodeClick',
  'onNodeDoubleClick',
  'onNodeContextMenu',
  'onNodeMouseEnter',
  'onNodeMouseMove',
  'onNodeMouseLeave',
  'onEdgeClick',
  'onEdgeDoubleClick',
  'onEdgeContextMenu',
  'onEdgeMouseEnter',
  'onEdgeMouseMove',
  'onEdgeMouseLeave',
  'onPaneClick',
  'onPaneContextMenu',
  'onNodeDragStart',
  'onNodeDrag',
  'onNodeDragStop',
]

const events = Object.fromEntries(
  eventNames
    .values()
    .filter((name) => componentCallbacks(config.id).includes(name))
    .map((name) => [name, () => recordEvent(receipt, name)])
    .toArray()
)

const canvasHeight = () => {
  if (config.id === 42) {
    return '50%'
  }

  if (config.id === 73 || config.id === 74) {
    return '500px'
  }

  return '100%'
}

const canvasDocument = (edgeId?: string) => {
  if (edgeId) {
    return {
      ...accepted.value,
      edges: accepted.value.edges.map((e) => ({
        ...e,
        id: EdgeIdSchema.make(edgeId),
      })),
    }
  }

  return config.controlled ? accepted.value : undefined
}

const canvas = (edgeId?: string) =>
  h(
    FlowCanvas,
    {
      key: edgeId ?? key.value,
      ...config.options,
      renderOnlyVisible: config.options.onlyRenderVisibleElements,
      document: canvasDocument(edgeId),
      defaultDocument: config.controlled ? undefined : accepted.value,
      documentMode: config.controlled ? 'controlled' : 'uncontrolled',
      defaultViewport: config.initial,
      viewportLimits: { minZoom: config.minZoom, maxZoom: config.maxZoom },
      fitView: false,
      ...events,
      onInit: () => recordEvent(receipt, 'onInit'),
      onMoveStart: (viewport) => {
        receipt.starts.push(viewport)
        recordEvent(receipt, 'onMoveStart')
      },
      onMove: (viewport) => {
        receipt.changes.push(viewport)
        recordEvent(receipt, 'onMove')
      },
      onMoveEnd: (viewport) => {
        receipt.ends.push(viewport)
        recordEvent(receipt, 'onMoveEnd')
      },
      onNodesChange: (changes) => {
        receipt.nodeChanges.push(changes)

        if (config.controlled && config.applyNodes) {
          accepted.value = {
            ...accepted.value,
            nodes: applyNodeChanges(changes, accepted.value.nodes),
          }
        }
      },
      onEdgesChange: (changes) => {
        if (config.controlled && config.applyEdges) {
          accepted.value = {
            ...accepted.value,
            // ControlledFlow.tsx:45: onConnect owns connection additions.
            edges: applyEdgeChanges(
              changes.filter((change) => change.type !== 'add'),
              accepted.value.edges
            ),
          }
        }
      },
      onConnect: (connection) => {
        if (config.controlled && config.applyConnect) {
          accepted.value = {
            ...accepted.value,
            edges: addEdge(connection, accepted.value.edges),
          }
        }
      },
      nodeTypes: { custom: Custom, checker: Checker },
      edgeTypes:
        config.id === 42
          ? { custom: CustomEdge, default: CustomEdge }
          : { custom: CustomEdge },
      class: config.id === 33 ? 'custom' : undefined,
      style: {
        width: '100%',
        height: canvasHeight(),
        border: 0,
        borderRadius: 0,
        minHeight: 0,
        margin: 0,
        backgroundColor: config.id === 32 ? 'red' : undefined,
      },
    } satisfies InstanceType<typeof FlowCanvas>['$props'],
    { default: () => h(Probe) }
  )

if (config.id === 73 || config.id === 74) {
  root.style.height = '2000px'
}

const app = createApp(
  defineComponent({
    setup: () => () =>
      config.id === 42 ? [canvas('edge1'), canvas('edge2')] : canvas(),
  })
)

try {
  app.mount(root)
} catch (error) {
  receipt.errors.push(error instanceof Error ? error.message : String(error))
  root.dataset.upstreamReady = 'true'
}

window.__componentRemount = () => {
  receipt.checks.length = 0
  root.dataset.upstreamReady = 'false'
  key.value += 1
}

mountComponentControls(root, config.id)

window.addEventListener('pagehide', () => app.unmount(), { once: true })
