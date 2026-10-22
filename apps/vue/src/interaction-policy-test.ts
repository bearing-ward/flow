import { FlowDocumentSchema } from '@flow/core'
import { FlowCanvas } from '@flow/vue'
import { Schema } from 'effect'
import { createApp, defineComponent, h, ref } from 'vue'

import '@flow/vue/style.css'

export const mountInteractionPolicyTest = (root: HTMLElement) => {
  const document = Schema.decodeUnknownSync(FlowDocumentSchema)({
    nodes: [
      { id: 'a', label: 'Disabled', position: { x: 200, y: 100 } },
      { id: 'b', label: 'Target', position: { x: 400, y: 200 } },
    ],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  })

  const enabled = ref(false)

  const record = () => {
    root.dataset.clicks = String(Number(root.dataset.clicks ?? 0) + 1)
  }

  const app = createApp(
    defineComponent({
      setup: () => () =>
        h('div', [
          h(
            'button',
            {
              onClick: () => {
                enabled.value = !enabled.value
              },
            },
            'Toggle callbacks'
          ),
          h(FlowCanvas, {
            document,
            nodesDraggable: false,
            nodesConnectable: false,
            elementsSelectable: false,
            onNodeClick: enabled.value ? record : undefined,
            onEdgeClick: enabled.value ? record : undefined,
            style: 'width:600px;height:400px',
          }),
        ]),
    })
  )

  app.mount(root)
  window.addEventListener('pagehide', () => app.unmount(), { once: true })
}
