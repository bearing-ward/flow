import '@flow/vue/style.css'
import { FlowCanvas, FlowProvider, useFlow } from '@flow/vue'
import {
  createApp,
  defineComponent,
  h,
  onMounted,
  onBeforeUnmount,
  shallowRef,
  getCurrentInstance,
} from 'vue'

import {
  initialWorkflowDocument,
  mountWorkflowImports,
  showAcceptedWorkflow,
} from '../../shared/workflow-contracts/owner.ts'

const initial = await initialWorkflowDocument()

const Demo = defineComponent({
  setup() {
    const flow = useFlow()
    const instance = getCurrentInstance()
    const accepted = shallowRef(initial)
    let stop: (() => void) | undefined
    onBeforeUnmount(() => stop?.())
    onMounted(() => {
      showAcceptedWorkflow(flow.document.value)
      stop = flow.subscribeState(({ current }) => {
        accepted.value = current.document
        showAcceptedWorkflow(current.document)
      })
      mountWorkflowImports({
        replace: (document) => {
          flow.updateDocument(document)

          return Promise.resolve()
        },
        dispose: () => instance?.appContext.app.unmount(),
      })
    })

    return () =>
      h(FlowCanvas, {
        defaultDocument: accepted.value,
        defaultViewport: { x: 0, y: 0, zoom: 0.8 },
      })
  },
})

const app = createApp({
  render: () => h(FlowProvider, null, { default: () => h(Demo) }),
})

app.mount('#app')
