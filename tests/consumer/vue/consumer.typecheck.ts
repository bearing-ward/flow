import { decodeFlowDocument } from '@flow/core'
import type { FlowDocument, FlowNode } from '@flow/core'
import {
  FlowBaseHandle,
  FlowBaseNode,
  FlowCanvas,
  useFlow,
  FlowControlButton,
  StatusIndicator,
  FlowAppendix,
  FlowTooltip,
  FlowLabeledHandle,
  DatabaseSchema,
  FlowPlaceholder,
} from '@flow/vue'
import type { FlowActions, FlowSelection } from '@flow/vue'
import { Effect } from 'effect'
import { defineComponent, h } from 'vue'

const document: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [{ id: 'vue-type', label: 'Vue', position: { x: 0, y: 0 } }],
    edges: [],
  })
)

export const NodeView = defineComponent({
  setup() {
    const flow: FlowActions = useFlow()

    return () =>
      h(
        FlowBaseNode,
        { title: 'Typed node' },
        {
          default: () => [
            h(StatusIndicator, { status: 'ready', label: 'Schema' }),
            h(
              FlowTooltip,
              { text: 'Refresh schema' },
              {
                default: () =>
                  h(
                    FlowControlButton,
                    {
                      type: 'button',
                      disabled: false,
                      name: 'schema-action',
                      value: 'refresh',
                      'aria-label': 'Refresh schema',
                      style: { color: 'navy' },
                      onClick: (event: MouseEvent) =>
                        flow.updateNode('vue-type', {
                          label: `Button ${event.button}`,
                        }),
                    },
                    { default: () => 'Refresh' }
                  ),
              }
            ),
            h(
              FlowAppendix,
              { id: 'packed-schema-details', label: 'Details' },
              {
                default: () =>
                  h(DatabaseSchema, {
                    table: {
                      name: 'users',
                      fields: [
                        {
                          id: 'id',
                          name: 'id',
                          type: 'uuid',
                          kind: 'source',
                          side: 'right',
                        },
                      ],
                    },
                  }),
              }
            ),
            h(FlowLabeledHandle, {
              id: 'output',
              label: 'Output',
              side: 'right',
            }),
            h(FlowPlaceholder, {
              label: 'Add table',
              disabled: false,
              onActivate: () =>
                flow.updateNode('vue-type', { label: 'New table' }),
            }),
            h(FlowBaseHandle, {
              id: 'output',
              kind: 'source',
              side: 'right',
            }),
          ],
        }
      )
  },
})

const selected: FlowSelection = { nodes: [], edges: [] }

const node: FlowNode | undefined = document.nodes[0]

void [NodeView, selected, FlowBaseHandle, FlowCanvas, node]
