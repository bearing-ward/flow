import type { FlowChange } from '@flow/core'
import {
  FlowCanvas,
  FlowControls,
  FlowMiniMap,
  FlowBackground,
  useFlow,
} from '@flow/vue'
import { createApp, defineComponent, h, ref, onMounted, onUnmounted } from 'vue'

import { upstreamExampleConfig } from '../../../packages/conformance/src/upstream-examples/index.ts'
import { applyUpstreamChange } from '../../../packages/conformance/src/upstream-generic/index.ts'
import {
  exampleOptions,
  mountExamplePanel,
  prepareExampleRoot,
  renderedExampleReady,
} from '../../shared/upstream/examples.ts'

import '@flow/vue/style.css'

const root = prepareExampleRoot()

const name = location.pathname.slice('/upstream-examples/'.length)

const config = upstreamExampleConfig(name)

const { minZoom, maxZoom, multiSelectionKeyCode, ...options } = exampleOptions(
  name,
  config
)

const multiSelectionProps: Pick<
  InstanceType<typeof FlowCanvas>['$props'],
  'multiSelectionKeyCode'
> = {}

if (multiSelectionKeyCode) {
  multiSelectionProps.multiSelectionKeyCode = multiSelectionKeyCode[0] ?? 'Meta'
}

const accepted = ref(config.document)

const switches = ref({
  nodesDraggable: options.nodesDraggable ?? true,
  nodesConnectable: options.nodesConnectable ?? true,
  elementsSelectable: options.elementsSelectable ?? true,
})

const canvasOptions = ref({
  zoomOnScroll: options.zoomOnScroll ?? true,
  zoomOnDoubleClick: options.zoomOnDoubleClick ?? true,
})

const captureClicks = ref(false)

const DragHandleNode = defineComponent({
  setup: () => () =>
    h('div', { class: 'upstream-custom-drag-content' }, [
      'Only draggable here → ',
      h('span', { class: 'custom-drag-handle' }),
    ]),
})

let stopReady: (() => void) | undefined

const Ready = defineComponent({
  setup() {
    const flow = useFlow()
    let disposed = false
    onMounted(() => {
      const ready = async () => {
        if (disposed) {
          return
        }

        if (
          config.document.nodes.some((node) => !node.hidden) &&
          !flow.nodesInitialized()
        ) {
          requestAnimationFrame(() => {
            void ready()
          })

          return
        }

        if (options.fitView) {
          await flow.fitView(options.fitViewOptions)
        }

        stopReady = renderedExampleReady(
          root,
          '.flow-vue-viewport',
          flow.viewport.value
        )
      }

      void ready()
    })
    onUnmounted(() => {
      disposed = true
    })

    return () => null
  },
})

const recordClick = () => {
  root.dataset.clicks = String(Number(root.dataset.clicks ?? 0) + 1)
}

const canvasProps = () => {
  const callbacks = captureClicks.value
    ? { onNodeClick: recordClick, onEdgeClick: recordClick }
    : undefined

  return {
    ...options,
    ...multiSelectionProps,
    fitView: false,
    documentMode: 'controlled',
    ...switches.value,
    ...canvasOptions.value,
    document: accepted.value,
    onChange: (change: FlowChange) => {
      accepted.value = applyUpstreamChange(accepted.value, change)
    },
    class: config.className,
    defaultViewport: { x: 0, y: 0, zoom: 1 },
    viewportLimits: { minZoom: minZoom ?? 0.5, maxZoom: maxZoom ?? 2 },
    nodeTypes: { dragHandleNode: DragHandleNode },
    ...callbacks,
    style: {
      width: '100%',
      height: '100%',
      border: 0,
      borderRadius: 0,
      minHeight: 0,
      margin: 0,
    },
  } satisfies InstanceType<typeof FlowCanvas>['$props']
}

const app = createApp(
  defineComponent({
    setup: () => () =>
      h(FlowCanvas, canvasProps(), {
        default: () => [
          h(Ready),
          ...(config.controls ? [h(FlowControls)] : []),
          ...(config.minimap ? [h(FlowMiniMap)] : []),
          ...(config.background
            ? [h(FlowBackground, { variant: config.background })]
            : []),
        ],
      }),
  })
)

app.mount(root)

const stopPanel = mountExamplePanel(root, name, {
  getDocument: () => accepted.value,
  replaceDocument: (document) => {
    accepted.value = document
  },
  setInteractivity: (patch) => {
    switches.value = { ...switches.value, ...patch }
  },
  setCanvasOptions: (patch) => {
    canvasOptions.value = { ...canvasOptions.value, ...patch }
  },
  setCaptureClicks: (capture) => {
    captureClicks.value = capture
  },
})

window.addEventListener(
  'pagehide',
  () => {
    stopReady?.()
    stopPanel()
    app.unmount()
  },
  { once: true }
)
