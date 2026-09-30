import { decodeFlowDocument } from '@flow/core'
import type { FlowNode } from '@flow/core'
import {
  FlowBaseHandle,
  FlowBaseNode,
  FlowCanvas,
  FlowControlButton,
} from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'
import './style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Button Handle fixture root')
}

let actions = 0

const NodeView = defineComponent({
  // SAFETY: FlowCanvas supplies schema-decoded FlowNode values to node renderers.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () =>
      h(
        FlowBaseNode,
        { title: props.node.label },
        {
          default: () =>
            h('div', { class: 'flow-vue-button-handle-content' }, [
              h(
                FlowControlButton,
                {
                  'aria-label': 'Run action',
                  'data-flow-no-drag': '',
                  'data-flow-no-pan': '',
                  onClick: () => {
                    actions += 1
                    root.dataset.actionCount = String(actions)
                  },
                },
                { default: () => 'Run action' }
              ),
              ...(props.node.handles ?? []).map((handle) =>
                h(FlowBaseHandle, {
                  key: handle.id,
                  id: handle.id,
                  kind: handle.kind,
                  side: handle.side,
                })
              ),
            ]),
        }
      )
  },
})

const documentModel = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'button-node',
        label: 'Action node',
        type: 'button-action',
        position: { x: 100, y: 120 },
        size: { width: 190, height: 100 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'target-node',
        label: 'Target',
        position: { x: 400, y: 120 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [],
  })
)

const app = createApp(
  defineComponent({
    setup() {
      return () =>
        h(FlowCanvas, {
          document: documentModel,
          nodeTypes: { 'button-action': NodeView },
        })
    },
  })
)

root.dataset.actionCount = '0'

app.mount(root)

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
