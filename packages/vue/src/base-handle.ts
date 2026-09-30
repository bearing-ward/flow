import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'

type HandleKind = 'source' | 'target'

type HandleSide = 'top' | 'right' | 'bottom' | 'left'

/**
 * Original, non-interactive label for a handle declared on a FlowNode.
 * FlowCanvas owns the actual focusable handle and connection lifecycle.
 */
export const FlowBaseHandle = defineComponent({
  name: 'FlowBaseHandle',
  props: {
    id: { type: String, required: true },
    // SAFETY: Vue's runtime String constructor needs PropType to retain these API unions.
    kind: { type: String as PropType<HandleKind>, required: true },
    // SAFETY: Vue's runtime String constructor needs PropType to retain these API unions.
    side: { type: String as PropType<HandleSide>, required: true },
    label: { type: String, default: undefined },
  },
  setup(props) {
    return () =>
      h(
        'span',
        {
          class: ['flow-vue-base-handle', `flow-vue-base-handle-${props.kind}`],
          'data-flow-base-handle': props.id,
          'data-handle-kind': props.kind,
          'data-handle-side': props.side,
        },
        [
          h('span', {
            class: 'flow-vue-base-handle-indicator',
            'aria-hidden': 'true',
          }),
          h(
            'span',
            { class: 'flow-vue-base-handle-label' },
            props.label ?? props.id
          ),
          h(
            'span',
            { class: 'flow-vue-base-handle-meta' },
            `${props.kind} · ${props.side}`
          ),
        ]
      )
  },
})
