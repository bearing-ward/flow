import { FlowCanvas, FlowProvider, useFlow, useFlowClipboard } from '@flow/vue'
import {
  createApp,
  defineComponent,
  h,
  getCurrentInstance,
  onMounted,
} from 'vue'

import {
  helperLinesDocument,
  mountHelperControls,
} from '../../shared/helper-lines/demo.ts'

import '@flow/vue/style.css'
import '../../shared/helper-lines/style.css'

const Demo = defineComponent({
  setup() {
    const flow = useFlow()
    const clipboard = useFlowClipboard()
    const instance = getCurrentInstance()
    onMounted(() =>
      mountHelperControls({
        copy: clipboard.copySelection,
        paste: clipboard.pasteSelection,
        undo: flow.undo,
        redo: flow.redo,
        document: () => Promise.resolve(flow.document.value),
        history: () => Promise.resolve(flow.history.value),
        transform: () => flow.setViewport({ x: 100, y: 50, zoom: 0.75 }),
        dispose: () => instance?.appContext.app.unmount(),
      })
    )

    return () =>
      h(FlowCanvas, {
        helperLines: true,
        selectNodesOnDrag: true,
        snapToGrid: new URLSearchParams(location.search).has('grid'),
        snapGrid: [50, 50],
        nodeDragThreshold: 0,
        defaultDocument: helperLinesDocument(),
        defaultViewport: { x: 0, y: 0, zoom: 1 },
        selectionKeyCode: 'Shift',
        multiSelectionKeyCode: 'Meta',
        autoPanOnNodeFocus: false,
      })
  },
})

const app = createApp({
  render: () => h(FlowProvider, null, { default: () => h(Demo) }),
})

app.mount('#app')
