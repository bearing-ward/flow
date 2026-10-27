import '@flow/vue/style.css'
import type { FlowNode } from '@flow/core'
import { FlowCanvas, FlowProvider, useFlow } from '@flow/vue'
import {
  createApp,
  defineComponent,
  h,
  onMounted,
  onScopeDispose,
  getCurrentInstance,
} from 'vue'

import {
  mountWorkflowControls,
  workflowDocument,
  workflowCaption,
} from '../../shared/workflow/demo.ts'

import '../../shared/workflow/style.css'

const WorkflowNode = defineComponent(
  (props: { node: FlowNode }) => () =>
    h('div', { class: 'workflow-card' }, workflowCaption(props.node)),
  { props: ['node'] }
)

const initial = workflowDocument()

const Demo = defineComponent({
  setup() {
    const flow = useFlow()
    const instance = getCurrentInstance()
    let release: (() => void) | undefined
    onMounted(() => {
      const controls = mountWorkflowControls({
        document: () => Promise.resolve(flow.document.value),
        edit: async (transaction) => {
          await flow.applyEdit(transaction)
        },
        flowToScreen: (point) =>
          Promise.resolve(flow.flowToScreenPosition(point)),
        screenToFlow: (point) =>
          Promise.resolve(flow.screenToFlowPosition(point)),
        viewport: async (value) => {
          await flow.setViewport(value)
        },
        undo: flow.undo,
        redo: flow.redo,
        dispose: () => instance?.appContext.app.unmount(),
      })

      const stop = flow.subscribeState(() => {
        void controls.refresh()
      })

      release = () => {
        stop()
        controls.dispose()
      }
    })
    onScopeDispose(() => release?.())

    return () =>
      h(FlowCanvas, {
        defaultDocument: initial,
        defaultViewport: { x: 0, y: 0, zoom: 1 },
        nodeTypes: { workflow: WorkflowNode },
        autoPanOnNodeFocus: false,
      })
  },
})

createApp({
  render: () => h(FlowProvider, null, { default: () => h(Demo) }),
}).mount('#app')
