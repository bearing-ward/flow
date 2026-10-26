import { flowFigureNodeType } from '@flow/core'
import {
  FlowCanvas,
  FlowProvider,
  FlowFigureNode,
  useFlowImageExport,
  useFlow,
} from '@flow/vue'
import {
  createApp,
  defineComponent,
  h,
  onMounted,
  watch,
  shallowRef,
  nextTick,
  getCurrentInstance,
} from 'vue'

import { installImageHost } from '../../shared/image-service/bridge.ts'
import type { ImageHostMount } from '../../shared/image-service/bridge.ts'

import '@flow/vue/style.css'

const Card = defineComponent({
  props: ['node'],
  setup(props) {
    return () =>
      h('div', { class: 'export-card' }, [
        h('img', { src: '/image-service/assets/flow-mark.svg', alt: '' }),
        h('div', [
          h('strong', props.node.label),
          h('small', String(props.node.data?.detail ?? '')),
        ]),
      ])
  },
})

await installImageHost('vue', (root, prepared) => {
  const routes = shallowRef(prepared.request.scene.edgeRouting)

  const ready = Promise.withResolvers<ImageHostMount>()

  const Demo = defineComponent({
    setup() {
      const instance = getCurrentInstance()
      const flow = useFlow()
      const exportRequest = useFlowImageExport()
      onMounted(() =>
        ready.resolve({
          exportRequest: (options) => Promise.resolve(exportRequest(options)),
          routing: (result) => {
            routes.value = result
          },
          subscribe: (listener) => watch(flow.document, listener),
          document: () =>
            Promise.resolve(flow.toObject()).then(
              ({ viewport: _viewport, ...document }) => document
            ),
          internals: () =>
            Promise.resolve(
              flow.document.value.nodes.map(({ id }) =>
                flow.getInternalNode(id)
              )
            ),
          refresh: async () => {
            await nextTick()
            await flow.updateNodeInternals(
              prepared.document.nodes.map(({ id }) => id)
            )
          },
          edit: async (transaction) => {
            await flow.applyEdit(transaction)
          },
          history: () => Promise.resolve(flow.history.value),
          undo: flow.undo,
          redo: flow.redo,
          dispose: () => instance?.appContext.app.unmount(),
        })
      )

      return () =>
        h(FlowCanvas, {
          defaultDocument: prepared.document,
          defaultViewport: prepared.viewport,
          minZoom: 0.01,
          maxZoom: 10,
          autoPanOnNodeFocus: false,
          edgeRouting: routes.value,
          nodeTypes: {
            [flowFigureNodeType]: FlowFigureNode,
            'export-card': Card,
          },
        })
    },
  })

  const app = createApp({
    render: () => h(FlowProvider, null, { default: () => h(Demo) }),
  })

  app.mount(root)

  return ready.promise
})
