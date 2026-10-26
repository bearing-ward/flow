import {
  decodeVersionedFlowDocument,
  encodeVersionedFlowDocument,
  HandleIdSchema,
  NodeIdSchema,
} from '@flow/core'
import { FlowCanvas, FlowProvider, useFlow, useFlowClipboard } from '@flow/vue'
import { Effect } from 'effect'
import {
  createApp,
  defineComponent,
  getCurrentInstance,
  h,
  onMounted,
} from 'vue'

import {
  editableEdgesDocument,
  mountEditableEdgesControls,
} from '../../shared/editable-edges/demo.ts'

import '@flow/vue/style.css'
import '../../shared/editable-edges/style.css'

const Demo = defineComponent({
  setup() {
    const flow = useFlow()
    const clipboard = useFlowClipboard()
    const instance = getCurrentInstance()
    let saved: unknown

    onMounted(() =>
      mountEditableEdgesControls({
        document: () => Promise.resolve(flow.document.value),
        history: () => Promise.resolve(flow.history.value),
        undo: flow.undo,
        redo: flow.redo,
        transform: () => {
          void flow.setViewport({ x: 100, y: 50, zoom: 0.75 })
        },
        save: () => {
          saved = encodeVersionedFlowDocument(flow.document.value)

          return Promise.resolve()
        },
        load: async () => {
          const document = await Effect.runPromise(
            decodeVersionedFlowDocument(saved)
          )

          await flow.applyEdit({
            operations: [
              { kind: 'set-nodes', nodes: document.nodes },
              { kind: 'set-edges', edges: document.edges },
            ],
          })
        },
        copy: clipboard.copySelection,
        paste: () => {
          void clipboard.pasteSelection()
        },
        moveEndpoint: () => {
          void flow.updateNode('a', { position: { x: 110, y: 130 } })
        },
        reconnect: () => {
          void flow.updateEdge('ab', {
            target: NodeIdSchema.make('c'),
            targetHandle: HandleIdSchema.make('in'),
          })
        },
        dispose: () => instance?.appContext.app.unmount(),
      })
    )

    return () =>
      h(FlowCanvas, {
        defaultDocument: editableEdgesDocument(),
        defaultViewport: { x: 0, y: 0, zoom: 1 },
        editableEdges: true,
        connectionMode: new URLSearchParams(location.search).has('loose')
          ? 'loose'
          : 'strict',
        autoPanOnNodeFocus: false,
        selectionKeyCode: 'Shift',
        multiSelectionKeyCode: 'Meta',
      })
  },
})

createApp({
  render: () => h(FlowProvider, null, { default: () => h(Demo) }),
}).mount('#app')
