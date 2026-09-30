import { decodeFlowDocument } from '@flow/core'
import type { FlowDocument, FlowNode } from '@flow/core'
import { FlowCanvas, StatusIndicator, useFlow } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'
import './style.css'

const NodeView = defineComponent({
  // SAFETY: FlowCanvas supplies only schema-decoded FlowNode instances.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    const flow = useFlow()

    const setStatus = (status: 'waiting' | 'ready' | 'error'): void => {
      void flow.updateNodeData(props.node.id, { status })
    }

    return () => {
      const status = props.node.data?.['status']

      const current =
        status === 'ready' || status === 'error' ? status : 'waiting'

      return h(
        'section',
        { class: 'status-recipe-card', 'aria-label': 'Worker node' },
        [
          h('h2', 'Worker'),
          h(StatusIndicator, { status: current, label: 'Worker status' }),
          h(
            'div',
            {
              class: 'status-recipe-controls',
              'aria-label': 'Set worker status',
            },
            [
              ...(['waiting', 'ready', 'error'] as const).map((nextStatus) =>
                h(
                  'button',
                  {
                    type: 'button',
                    'data-set-status': nextStatus,
                    onClick: () => setStatus(nextStatus),
                  },
                  nextStatus[0]?.toUpperCase() + nextStatus.slice(1)
                )
              ),
              h(
                'button',
                {
                  type: 'button',
                  'data-reset-status': '',
                  onClick: () => setStatus('waiting'),
                },
                'Reset status'
              ),
            ]
          ),
        ]
      )
    }
  },
})

const document: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'status-worker',
        label: 'Worker',
        type: 'status-worker',
        position: { x: 100, y: 100 },
        data: { status: 'waiting' },
      },
    ],
    edges: [],
  })
)

const app = createApp(
  defineComponent(
    () => () =>
      h(FlowCanvas, { document, nodeTypes: { 'status-worker': NodeView } })
  )
)

app.mount('#app')

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
