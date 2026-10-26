import type { FlowRoutingResult } from '@flow/core'
import { FlowCanvas, FlowProvider, useFlow } from '@flow/vue'
import {
  createApp,
  defineComponent,
  h,
  onMounted,
  onBeforeUnmount,
  getCurrentInstance,
  shallowRef,
} from 'vue'

import {
  edgeRoutingDocument,
  mountEdgeRoutingDemo,
} from '../../shared/edge-routing/demo.ts'

import '@flow/vue/style.css'

const Demo = defineComponent({
  setup() {
    const flow = useFlow()
    const instance = getCurrentInstance()
    let unmounting = false
    let stop: (() => void) | undefined
    onBeforeUnmount(() => {
      unmounting = true
      stop?.()
    })
    const routes = shallowRef<FlowRoutingResult>()
    onMounted(() => {
      stop = mountEdgeRoutingDemo({
        read: () => Promise.resolve(flow.document.value),
        internals: () =>
          Promise.resolve(
            flow.document.value.nodes.flatMap(({ id }) => {
              const internal = flow.getInternalNode(id)

              return internal === undefined ? [] : [internal]
            })
          ),
        publish: (result) => {
          routes.value = result
        },
        apply: async (document) => {
          await flow.applyEdit({
            operations: [
              { kind: 'set-nodes', nodes: document.nodes },
              { kind: 'set-edges', edges: document.edges },
            ],
          })
        },
        viewport: (viewport) => {
          void flow.setViewport(viewport)
        },
        dispose: () => {
          if (!unmounting) {
            instance?.appContext.app.unmount()
          }
        },
      })
    })

    return () =>
      h(FlowCanvas, {
        defaultDocument: edgeRoutingDocument(),
        defaultViewport: { x: 0, y: 0, zoom: 1 },
        editableEdges: true,
        edgeRouting: routes.value ?? null,
        autoPanOnNodeFocus: false,
      })
  },
})

const app = createApp({
  render: () => h(FlowProvider, null, { default: () => h(Demo) }),
})

app.mount('#app')
