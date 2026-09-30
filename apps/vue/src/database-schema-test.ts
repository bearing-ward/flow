import { decodeFlowDocument, HandleIdSchema } from '@flow/core'
import type { FlowDocument, FlowNode } from '@flow/core'
import { DatabaseSchema, FlowCanvas, useFlow } from '@flow/vue'
import type { DatabaseSchemaTable } from '@flow/vue'
import { Effect, Schema } from 'effect'
import { createApp, defineComponent, h } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'
import './style.css'

const decodeHandleId = Schema.decodeUnknownSync(HandleIdSchema)

const updated = (revision: number): DatabaseSchemaTable => ({
  name: 'users',
  fields:
    revision === 0
      ? [
          {
            id: 'name-out',
            name: 'name',
            type: 'text',
            kind: 'source',
            side: 'right',
          },
          {
            id: 'legacy-in',
            name: 'legacy_id',
            type: 'integer',
            kind: 'target',
            side: 'left',
          },
        ]
      : [
          {
            id: 'email-out',
            name: 'email',
            type: 'text',
            kind: 'source',
            side: 'bottom',
          },
          {
            id: 'created-in',
            name: 'created_at',
            type: 'timestamp',
            kind: 'target',
            side: 'top',
          },
        ],
})

const NodeView = defineComponent({
  // SAFETY: FlowCanvas validates node values against FlowNodeSchema before rendering the node type.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    const flow = useFlow()

    return () =>
      h('div', [
        h(DatabaseSchema, {
          table: updated(props.node.data?.['revision'] === 1 ? 1 : 0),
        }),
        h(
          'button',
          {
            type: 'button',
            'data-edit-schema': '',
            onClick: async () =>
              await flow.updateNode(props.node.id, {
                data: { revision: 1 },
                handles: [
                  {
                    id: decodeHandleId('email-out'),
                    kind: 'source',
                    side: 'bottom',
                  },
                  {
                    id: decodeHandleId('created-in'),
                    kind: 'target',
                    side: 'top',
                  },
                ],
              }),
          },
          'Update schema'
        ),
        h(
          'button',
          {
            type: 'button',
            'data-connect': '',
            onClick: async () =>
              await flow.addEdges({
                id: 'email-edge',
                source: 'users',
                sourceHandle: decodeHandleId('email-out'),
                target: 'consumer',
                targetHandle: decodeHandleId('input'),
              }),
          },
          'Connect email'
        ),
      ])
  },
})

const document: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'users',
        label: 'users',
        type: 'schema',
        position: { x: 80, y: 80 },
        data: { revision: 0 },
        handles: [
          { id: 'name-out', kind: 'source', side: 'right' },
          { id: 'legacy-in', kind: 'target', side: 'left' },
        ],
      },
      {
        id: 'consumer',
        label: 'consumer',
        position: { x: 500, y: 100 },
        handles: [{ id: 'input', kind: 'target', side: 'left' }],
      },
    ],
    edges: [],
  })
)

const app = createApp(
  defineComponent(
    () => () => h(FlowCanvas, { document, nodeTypes: { schema: NodeView } })
  )
)

app.mount('#app')

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
