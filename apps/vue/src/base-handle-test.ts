import { decodeFlowDocument } from '@flow/core'
import type { FlowDocument, FlowNode } from '@flow/core'
import {
  FlowBaseHandle,
  FlowBaseNode,
  FlowCanvas,
  FlowLabeledHandle,
} from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, ref } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'
import './style.css'

const showLabeledHandle = ref(true)

const NodeView = defineComponent({
  // SAFETY: FlowCanvas supplies schema-decoded FlowNode instances to node visuals.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () => {
      const handles = props.node.handles ?? []

      return h(
        FlowBaseNode,
        { title: props.node.label },
        {
          default: () =>
            h(
              'div',
              { class: 'flow-vue-base-handle-list' },
              handles.flatMap((handle) => [
                h(FlowBaseHandle, {
                  key: handle.id,
                  id: handle.id,
                  kind: handle.kind,
                  side: handle.side,
                }),
                handle.id === 'send' && showLabeledHandle.value
                  ? h(FlowLabeledHandle, {
                      id: handle.id,
                      side: handle.side,
                      label: 'Result',
                    })
                  : null,
              ])
            ),
        }
      )
    }
  },
})

const document: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'source-node',
        label: 'Send data',
        type: 'handle-recipe',
        position: { x: 100, y: 180 },
        handles: [{ id: 'send', kind: 'source', side: 'right' }],
      },
      {
        id: 'rejected-node',
        label: 'Blocked destination',
        type: 'handle-recipe',
        position: { x: 390, y: 80 },
        // A source-to-source candidate is rejected by FlowCanvas strict mode.
        handles: [{ id: 'blocked', kind: 'source', side: 'top' }],
      },
      {
        id: 'accepted-node',
        label: 'Ready destination',
        type: 'handle-recipe',
        position: { x: 390, y: 300 },
        handles: [{ id: 'ready', kind: 'target', side: 'left' }],
      },
    ],
    edges: [],
  })
)

const app = createApp(
  defineComponent({
    setup() {
      return () =>
        h('div', [
          h(
            'button',
            {
              type: 'button',
              'aria-label': 'Toggle labeled handle description',
              onClick: () =>
                (showLabeledHandle.value = !showLabeledHandle.value),
            },
            'Toggle label'
          ),
          h(FlowCanvas, {
            document,
            nodeTypes: { 'handle-recipe': NodeView },
          }),
        ])
    },
  })
)

app.mount('#app')

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
