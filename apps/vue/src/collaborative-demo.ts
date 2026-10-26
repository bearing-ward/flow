import { flowFigureNodeType } from '@flow/core'

import '@flow/vue/style.css'
import {
  FlowCanvas,
  FlowFigureNode,
  FlowProvider,
  useFlow,
  useFlowClipboard,
} from '@flow/vue'
import {
  createApp,
  defineComponent,
  h,
  onMounted,
  onBeforeUnmount,
  getCurrentInstance,
} from 'vue'

import { mountCollaborativeDemo } from '../../shared/collaborative/demo.ts'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing room canvas')
}

const owner = root

const Demo = defineComponent({
  setup() {
    const flow = useFlow()
    const clipboard = useFlowClipboard()
    const instance = getCurrentInstance()
    let stop: (() => Promise<void>) | undefined
    onBeforeUnmount(() => {
      void stop?.()
    })
    onMounted(async () => {
      stop = await mountCollaborativeDemo({
        owner,
        live: () =>
          Promise.resolve({ ...flow.document.value, nodes: flow.getNodes() }),
        read: () =>
          Promise.resolve({
            document: flow.document.value,
            viewport: flow.getViewport(),
          }),
        replace: (document, context) => {
          flow.updateDocument(document, context)

          return Promise.resolve()
        },
        subscribe: flow.subscribeState,
        apply: async (transaction) => {
          await flow.applyEdit(transaction)
        },
        screenToFlow: (position) =>
          Promise.resolve(flow.screenToFlowPosition(position)),
        copy: clipboard.copySelection,
        paste: async (options) => {
          await clipboard.pasteSelection(options)
        },
        dispose: () => instance?.appContext.app.unmount(),
      })
    })

    return () =>
      h(FlowCanvas, {
        defaultDocument: { nodes: [], edges: [] },
        nodeTypes: { [flowFigureNodeType]: FlowFigureNode },
        defaultViewport: { x: 0, y: 0, zoom: 1 },
        autoPanOnNodeFocus: false,
      })
  },
})

createApp({
  render: () => h(FlowProvider, null, { default: () => h(Demo) }),
}).mount(root)
