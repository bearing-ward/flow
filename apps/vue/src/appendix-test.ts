import { decodeFlowDocument } from '@flow/core'
import type { FlowDocument, FlowNode } from '@flow/core'
import { FlowAppendix, FlowCanvas } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'
import './style.css'

const NodeView = defineComponent({
  // SAFETY: FlowCanvas supplies only schema-decoded FlowNode instances.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup() {
    return () =>
      h('article', { class: 'appendix-recipe-card' }, [
        h('h2', 'Deployment'),
        h('p', 'Review the deployment before publishing.'),
        h(
          FlowAppendix,
          { id: 'deployment-appendix', label: 'Deployment notes' },
          {
            default: () =>
              h(
                'p',
                { 'data-testid': 'appendix-details' },
                'The staging environment is ready for review.'
              ),
          }
        ),
      ])
  },
})

const document: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'appendix-node',
        label: 'Deployment',
        type: 'appendix-node',
        position: { x: 180, y: 130 },
        size: { width: 300, height: 190 },
      },
    ],
    edges: [],
  })
)

const app = createApp(
  defineComponent(
    () => () =>
      h(FlowCanvas, { document, nodeTypes: { 'appendix-node': NodeView } })
  )
)

app.mount('#app')

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
