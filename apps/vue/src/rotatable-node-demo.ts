import { flowFigureNodeType } from '@flow/core'
import { FlowCanvas, FlowProvider, FlowFigureNode, useFlow } from '@flow/vue'
import {
  createApp,
  defineComponent,
  h,
  getCurrentInstance,
  onMounted,
  onScopeDispose,
} from 'vue'

import {
  rotationDocument,
  mountRotationControls,
} from '../../shared/rotatable-node/demo.ts'

import '@flow/vue/style.css'

const Demo = defineComponent({
  setup() {
    const flow = useFlow()
    const instance = getCurrentInstance()
    let release: (() => void) | undefined
    onMounted(() => {
      const controls = mountRotationControls({
        refresh: async (id) => {
          await flow.updateNodeInternals(id)
        },
        document: () => Promise.resolve(flow.document.value),
        history: () => Promise.resolve(flow.history.value),
        edit: async (transaction) => {
          await flow.applyEdit(transaction)
        },
        undo: flow.undo,
        redo: flow.redo,
        copy: flow.copySelection,
        paste: flow.pasteSelection,
        viewport: flow.setViewport,
        dispose: () => instance?.appContext.app.unmount(),
      })

      release = controls.dispose
    })
    onScopeDispose(() => release?.())

    return () =>
      h(FlowCanvas, {
        defaultDocument: rotationDocument(),
        defaultViewport: { x: 0, y: 0, zoom: 1 },
        nodeTypes: { [flowFigureNodeType]: FlowFigureNode },
        autoPanOnNodeFocus: false,
      })
  },
})

const app = createApp({
  render: () => h(FlowProvider, null, { default: () => h(Demo) }),
})

app.mount('#app')

window.addEventListener('pagehide', () => app.unmount(), { once: true })
