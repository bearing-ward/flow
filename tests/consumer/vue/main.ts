import { decodeFlowDocument } from '@flow/core'
import type { FlowDocument, FlowNode } from '@flow/core'
import {
  FlowBaseNode,
  FlowBaseHandle,
  FlowCanvas,
  useFlow,
  FlowControlButton,
  StatusIndicator,
  FlowTooltip,
  FlowAppendix,
  FlowLabeledHandle,
  DatabaseSchema,
  FlowPlaceholder,
} from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, ref, shallowRef } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

declare global {
  interface Window {
    __flowVueConsumer?: { readonly dispose: () => void }
  }
}

const firstDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'vue-first',
        label: 'Vue first',
        type: 'status',
        position: { x: 30, y: 40 },
        data: { status: 'waiting' },
        handles: [{ id: 'packed-output', kind: 'source', side: 'right' }],
      },
    ],
    edges: [],
  })
)

const secondDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'vue-second',
        label: 'Vue second',
        type: 'status',
        position: { x: 60, y: 80 },
        data: { status: 'independent' },
      },
    ],
    edges: [],
  })
)

const NodeView = defineComponent({
  // SAFETY: FlowCanvas supplies schema-decoded FlowNode values to registered node visuals.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    const flow = useFlow()
    const activated = ref(false)
    const added = ref(false)

    return () =>
      h(
        FlowBaseNode,
        { title: props.node.label },
        {
          default: () => [
            ...(props.node.id === 'vue-first'
              ? [
                  h(
                    'section',
                    { 'data-packed-ui': '', 'data-added': String(added.value) },
                    [
                      h(StatusIndicator, {
                        status: activated.value ? 'ready' : 'waiting',
                        label: 'Packed status',
                      }),
                      h(
                        FlowTooltip,
                        { text: 'Packed tooltip' },
                        {
                          default: () =>
                            h(
                              FlowControlButton,
                              {
                                type: 'button',
                                name: 'packed-action',
                                value: 'refresh',
                                'aria-label': 'Packed action',
                                'data-packed-action': '',
                                onClick: () => {
                                  activated.value = true
                                },
                              },
                              { default: () => 'Refresh' }
                            ),
                        }
                      ),
                      h(
                        FlowAppendix,
                        { id: 'packed-details', label: 'Details' },
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
                      h(FlowBaseHandle, {
                        id: 'packed-output',
                        kind: 'source',
                        side: 'right',
                      }),
                      h(FlowLabeledHandle, {
                        id: 'packed-output',
                        label: 'Packed output',
                        side: 'right',
                      }),
                      h(FlowPlaceholder, {
                        label: 'Add table',
                        'data-packed-placeholder': '',
                        onActivate: () => {
                          added.value = true
                        },
                      }),
                    ]
                  ),
                ]
              : []),
            h(
              'output',
              { 'data-status': props.node.id },
              String(props.node.data?.['status'] ?? '')
            ),
            h(
              'button',
              {
                type: 'button',
                'data-edit': props.node.id,
                onClick: () => {
                  void flow.updateNodeData(props.node.id, { status: 'ready' })
                },
              },
              'Propose status'
            ),
            h(
              'button',
              {
                type: 'button',
                'data-fit': props.node.id,
                onClick: async (event: MouseEvent) => {
                  const button = event.currentTarget
                  await flow.fitView({ duration: 0 })

                  if (button instanceof HTMLButtonElement) {
                    button.dataset['fitStatus'] = 'complete'
                  }
                },
              },
              'Fit graph'
            ),
          ],
        }
      )
  },
})

const App = defineComponent({
  setup() {
    const accepted = shallowRef<FlowDocument>(firstDocument)
    const pending = shallowRef<FlowDocument | null>(null)
    const proposals = ref(0)

    const accept = (): void => {
      if (pending.value !== null) {
        accepted.value = pending.value
        pending.value = null
      }
    }

    return () =>
      h('main', [
        h(
          'button',
          {
            type: 'button',
            'data-accept': '',
            disabled: pending.value === null,
            onClick: accept,
          },
          'Accept proposal'
        ),
        h('output', { 'data-proposals': '' }, String(proposals.value)),
        h(FlowCanvas, {
          document: accepted.value,
          documentMode: 'controlled',
          nodeTypes: { status: NodeView },
          style: { width: '480px', height: '320px' },
          'onUpdate:document': (next: FlowDocument) => {
            proposals.value += 1
            pending.value = next
          },
        }),
        h(FlowCanvas, {
          document: secondDocument,
          nodeTypes: { status: NodeView },
          style: { width: '480px', height: '320px' },
        }),
      ])
  },
})

const app = createApp(App)

const root = document.querySelector<HTMLElement>('#root')

if (root === null) {
  throw new Error('Missing Vue consumer root')
}

app.mount(root)

window.__flowVueConsumer = { dispose: () => app.unmount() }
