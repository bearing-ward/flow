import { getFlowLayoutInput } from '@flow/core'
import type { FlowColorMode, FlowNode } from '@flow/core'

import '@flow/vue/style.css'
import { FlowCanvas, FlowProvider, useFlow, StatusIndicator } from '@flow/vue'
import { makeLocalWorkflowAiProvider } from '@flow/workflow'
import type { WorkflowRunState } from '@flow/workflow'
import { Effect } from 'effect'
import {
  createApp,
  defineComponent,
  h,
  onMounted,
  onScopeDispose,
  getCurrentInstance,
  computed,
  shallowRef,
  nextTick,
} from 'vue'

import {
  mountWorkflowControls,
  workflowDocument,
  workflowCaption,
} from '../../shared/workflow/demo.ts'
import {
  createWorkflowRunOwner,
  workflowStatus,
} from '../../shared/workflow/run-owner.ts'

import '../../shared/workflow/style.css'
import {
  workflowValidationSnapshot,
  workflowDocumentChanged,
  workflowCanvasConnection,
} from '../../shared/workflow/validation.ts'

const initial = workflowDocument()

const Demo = defineComponent({
  setup() {
    const flow = useFlow()
    const instance = getCurrentInstance()
    const revision = shallowRef(0)
    const theme = shallowRef<FlowColorMode>('system')
    const runState = shallowRef<WorkflowRunState | null>(null)
    const failure = new URLSearchParams(location.search).get('local-failure')

    const provider = Effect.runSync(
      makeLocalWorkflowAiProvider(
        failure === 'text' || failure === 'image'
          ? { delayMillis: 250, fail: failure }
          : { delayMillis: 250 }
      )
    )

    const runs = createWorkflowRunOwner(() => revision.value, provider)

    const stopRuns = runs.subscribe(() => {
      runState.value = runs.state()
    })

    const WorkflowNode = defineComponent(
      (props: { node: FlowNode }) => () => {
        const state = runState.value?.nodes[props.node.id]?.state

        return h('div', [
          h('div', { class: 'workflow-card' }, workflowCaption(props.node)),
          h(StatusIndicator, {
            status: state === undefined ? 'waiting' : workflowStatus(state),
            label: props.node.id,
          }),
          h(
            'span',
            { 'data-run-node-state': state ?? 'idle' },
            state ?? 'No run'
          ),
        ])
      },
      { props: ['node'] }
    )

    const validation = computed(() =>
      workflowValidationSnapshot(flow.document.value, revision.value)
    )

    let release: (() => void) | undefined
    onMounted(() => {
      const controls = mountWorkflowControls({
        runs,
        layoutInput: () =>
          Promise.resolve({
            document: flow.document.value,
            input: getFlowLayoutInput(
              flow.document.value,
              flow.getInternalNode
            ),
          }),
        fit: async () => {
          await nextTick()
          await flow.fitView()
          await nextTick()
        },
        theme: (mode) => {
          theme.value = mode
        },
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
          runs.invalidate()
        }

        void controls.refresh()
      })

      release = () => {
        stop()
        controls.dispose()
      }
    })
    onScopeDispose(() => {
      stopRuns()
      void runs.dispose()
      release?.()
    })

    return () =>
      h(FlowCanvas, {
        defaultDocument: initial,
        colorMode: theme.value,
        defaultViewport: { x: 0, y: 0, zoom: 1 },
        nodeTypes: { workflow: WorkflowNode, default: WorkflowNode },
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
