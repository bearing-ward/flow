import { decodeFlowDocument } from '@flow/core'
import type { FlowDocument, FlowNode } from '@flow/core'
import { FlowBaseNode, FlowCanvas } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'
import './style.css'

const activate = (event: MouseEvent): void => {
  if (event.currentTarget instanceof HTMLButtonElement) {
    event.currentTarget.dataset['activated'] = 'true'
  }
}

const NodeView = defineComponent({
  // SAFETY: FlowCanvas supplies only schema-decoded FlowNode instances to registered node visuals.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () =>
      h(
        FlowBaseNode,
        { title: props.node.label },
        {
          default: () =>
            h(
              'button',
              { type: 'button', 'data-flow-no-drag': '', onClick: activate },
              'Open details'
            ),
        }
      )
  },
})

const document: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'base-node',
        label: 'Review task',
        type: 'base-node',
        position: { x: 80, y: 80 },
        handles: [{ id: 'output', kind: 'source', side: 'right' }],
      },
    ],
    edges: [],
  })
)

const app = createApp(
  defineComponent(
    () => () =>
      h(FlowCanvas, {
        document,
        nodeTypes: { 'base-node': NodeView },
      })
  )
)

app.mount('#app')

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
