import { flowFigureNodeType } from '@flow/core'
import type { FlowMiniMapNodeProps } from '@flow/core'
import {
  FlowCanvas,
  FlowMiniMap,
  FlowProvider,
  FlowFigureNode,
  renderFlowFigureMiniMapNode,
  useFlow,
} from '@flow/vue'
import {
  createApp,
  defineComponent,
  getCurrentInstance,
  h,
  onMounted,
  onScopeDispose,
  watch,
} from 'vue'

import {
  mountFiguresControls,
  figuresDocument,
} from '../../shared/shapes/demo.ts'

import '@flow/vue/style.css'
import '../../shared/shapes/style.css'

const Demo = defineComponent({
  setup() {
    const flow = useFlow()
    const instance = getCurrentInstance()
    let disposeControls: (() => void) | undefined

    onMounted(() => {
      const controls = mountFiguresControls({
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

      const stop = watch(flow.document, controls.refresh)
      disposeControls = () => {
        stop()
        controls.dispose()
      }
    })
    onScopeDispose(() => disposeControls?.())

    return () =>
      h(
        FlowCanvas,
        {
          defaultDocument: figuresDocument(),
          defaultViewport: { x: 0, y: 0, zoom: 1 },
          nodeTypes: { [flowFigureNodeType]: FlowFigureNode },
          nodesResizable: true,
          autoPanOnNodeFocus: false,
        },
        {
          default: () =>
            h(
              FlowMiniMap,
              {},
              {
                node: (props: FlowMiniMapNodeProps) =>
                  renderFlowFigureMiniMapNode(props, flow.getNode(props.id)),
              }
            ),
        }
      )
  },
})

const app = createApp({
  render: () => h(FlowProvider, null, { default: () => h(Demo) }),
})

app.mount('#app')

window.addEventListener('pagehide', () => app.unmount(), { once: true })
