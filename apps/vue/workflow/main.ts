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
  computed,
  shallowRef,
} from 'vue'

import {
  mountWorkflowControls,
  workflowDocument,
  workflowCaption,
} from '../../shared/workflow/demo.ts'
import {
  workflowValidationSnapshot,
  workflowDocumentChanged,
  workflowCanvasConnection,
} from '../../shared/workflow/validation.ts'

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
    const revision = shallowRef(0)

    const validation = computed(() =>
      workflowValidationSnapshot(flow.document.value, revision.value)
    )

    let release: (() => void) | undefined
    onMounted(() => {
      const controls = mountWorkflowControls({
        snapshot: () => Promise.resolve(validation.value),
        replace: (document) => {
          flow.updateDocument(document)

          return Promise.resolve()
        },
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

      const stop = flow.subscribeState((change) => {
        if (
          workflowDocumentChanged(
            change.previous.document,
            change.current.document
          )
        ) {
          revision.value += 1
        }

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
        defaultEdgeOptions: {
          data: { workflow: { version: 1, kind: 'data' } },
        },
        isValidConnection: (
          candidate: Parameters<typeof workflowCanvasConnection>[1]
        ) => workflowCanvasConnection(flow.document.value, candidate),
      })
  },
})

createApp({
  render: () => h(FlowProvider, null, { default: () => h(Demo) }),
}).mount('#app')
