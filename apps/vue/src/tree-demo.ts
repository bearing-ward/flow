import { getFlowLayoutInput } from '@flow/core'
import { FlowCanvas, FlowProvider, useFlow } from '@flow/vue'
import {
  createApp,
  defineComponent,
  h,
  getCurrentInstance,
  nextTick,
  onMounted,
  onScopeDispose,
} from 'vue'

import { treeDocument, mountTreeControls } from '../../shared/tree/demo.ts'

import '@flow/vue/style.css'

const Demo = defineComponent({
  setup() {
    const flow = useFlow()
    const instance = getCurrentInstance()
    let release: (() => void) | undefined
    onMounted(() => {
      const controls = mountTreeControls({
        read: async () => {
          await nextTick()
          const document = flow.document.value

          return {
            document,
            input: getFlowLayoutInput(document, flow.getInternalNode),
          }
        },
        animate: flow.animateNodePositions,
        edit: async (transaction) => {
          await flow.applyEdit(transaction)
        },
        history: () => Promise.resolve(flow.history.value),
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
        defaultDocument: treeDocument(),
        defaultViewport: { x: 0, y: 0, zoom: 1 },
        autoPanOnNodeFocus: false,
      })
  },
})

const app = createApp({
  render: () => h(FlowProvider, null, { default: () => h(Demo) }),
})

app.mount('#app')

window.addEventListener('pagehide', () => app.unmount(), { once: true })
