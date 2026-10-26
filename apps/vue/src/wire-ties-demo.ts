import '@flow/vue/style.css'
import type { FlowRoutingResult } from '@flow/core'
import { flowMeasurementsFromInternalNodes } from '@flow/core'
import { FlowCanvas, FlowProvider, useFlow, useFlowClipboard } from '@flow/vue'
import {
  createApp,
  defineComponent,
  h,
  onMounted,
  onBeforeUnmount,
  getCurrentInstance,
  shallowRef,
} from 'vue'

import { mountWireTiesDemo } from '../../shared/wire-ties/demo.ts'
import { wireTiesDocument } from '../../shared/wire-ties/document.ts'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing wire tie root')
}

const owner = root

let stop: (() => void) | undefined

const Demo = defineComponent({
  setup() {
    const routes = shallowRef<FlowRoutingResult>()
    const instance = getCurrentInstance()
    const flow = useFlow()
    const clipboard = useFlowClipboard()
    onBeforeUnmount(() => stop?.())
    onMounted(async () => {
      stop = await mountWireTiesDemo({
        owner,
        publishRouting: (result) => {
          routes.value = result
        },
        object: () => Promise.resolve(flow.toObject()),
        read: () =>
          Promise.resolve({
            document: flow.document.value,
            viewport: flow.getViewport(),
          }),
        geometry: () =>
          Promise.resolve({
            edgeRouting: routes.value,
            measurements: flowMeasurementsFromInternalNodes(
              flow.document.value.nodes.map(({ id }) =>
                flow.getInternalNode(id)
              )
            ),
          }),
        apply: async (transaction) => {
          await flow.applyEdit(transaction)
        },
        viewport: (viewport) => {
          void flow.setViewport(viewport)
        },
        history: () => Promise.resolve(flow.history.value),
        undo: flow.undo,
        redo: flow.redo,
        copy: clipboard.copySelection,
        paste: () => {
          void clipboard.pasteSelection()
        },
        dispose: () => instance?.appContext.app.unmount(),
      })
    })

    return () =>
      h(FlowCanvas, {
        edgeRouting: routes.value ?? null,
        defaultDocument: wireTiesDocument(),
        defaultViewport: { x: 0, y: 0, zoom: 1 },
        autoPanOnNodeFocus: false,
        selectionKeyCode: 'Shift',
      })
  },
})

const app = createApp({
  render: () => h(FlowProvider, null, { default: () => h(Demo) }),
})

app.mount(root)
