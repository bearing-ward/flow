import { decodeFlowDocument } from '@flow/core'
import { FlowCanvas, FlowPanel } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, ref } from 'vue'

import '@flow/vue/style.css'

const document = Effect.runSync(decodeFlowDocument({ nodes: [], edges: [] }))

const TestApp = defineComponent({
  setup() {
    const position = ref<
      | 'top-left'
      | 'top-center'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-center'
      | 'bottom-right'
    >('top-left')

    const visible = ref(true)

    const positions = [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ] as const

    return () =>
      h('main', [
        h('div', { 'data-testid': 'outside-controls' }, [
          ...positions.map((nextPosition) =>
            h(
              'button',
              {
                type: 'button',
                'data-testid': `set-${nextPosition}`,
                onClick: () => (position.value = nextPosition),
              },
              nextPosition
            )
          ),
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'toggle-panel',
              onClick: () => (visible.value = !visible.value),
            },
            'Toggle panel'
          ),
        ]),
        h(
          FlowCanvas,
          { defaultDocument: document },
          {
            default: () =>
              visible.value
                ? [
                    h(
                      FlowPanel,
                      {
                        position: position.value,
                        id: 'contract-panel',
                        class: 'consumer-class',
                        style: { backgroundColor: 'rgb(240, 248, 255)' },
                        'aria-label': 'Panel tools',
                        'data-testid': 'flow-panel',
                      },
                      {
                        default: () => [
                          h('label', { for: 'panel-input' }, 'Panel input'),
                          h('input', { id: 'panel-input', value: 'editable' }),
                          h(
                            'button',
                            { type: 'button', 'data-testid': 'panel-action' },
                            'Panel action'
                          ),
                        ],
                      }
                    ),
                  ]
                : [],
          }
        ),
      ])
  },
})

createApp(TestApp).mount('#app')
