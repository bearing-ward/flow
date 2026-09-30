import { decodeFlowDocument } from '@flow/core'
import type { FlowDocument, FlowNode } from '@flow/core'
import { FlowCanvas } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, ref } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'
import './style.css'

let acceptReady: ((nodeId: string) => void) | null = null

const CustomStatusNode = defineComponent({
  props: {
    // SAFETY: FlowCanvas supplies each node after decoding its graph snapshot.
    node: { type: Object as PropType<FlowNode>, required: true },
  },
  setup(props) {
    return () =>
      h(
        'section',
        {
          'data-testid': 'custom-node',
          'data-node-id': props.node.id,
          'data-status': String(props.node.data?.['status'] ?? ''),
        },
        [
          h('h2', props.node.label),
          h(
            'p',
            { 'data-testid': 'custom-detail' },
            String(props.node.data?.['detail'] ?? '')
          ),
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'custom-status-control',
              onClick: () => acceptReady?.(props.node.id),
            },
            String(props.node.data?.['status'] ?? '')
          ),
        ]
      )
  },
})

const initialDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'custom-status',
        label: 'Release check',
        type: 'custom-status',
        position: { x: 80, y: 90 },
        data: { status: 'waiting', detail: 'Build is queued' },
      },
    ],
    edges: [],
  })
)

const Root = defineComponent({
  setup() {
    const document = ref<FlowDocument>(initialDocument)
    acceptReady = (nodeId: string) => {
      document.value = Effect.runSync(
        decodeFlowDocument({
          nodes: document.value.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: { status: 'ready', detail: 'All checks passed' },
                }
              : node
          ),
          edges: document.value.edges,
        })
      )
    }

    return () =>
      h(FlowCanvas, {
        document: document.value,
        documentMode: 'controlled',
        nodeTypes: { 'custom-status': CustomStatusNode },
        defaultViewport: { x: 0, y: 0, zoom: 1 },
      })
  },
})

createApp(Root).mount('#app')
