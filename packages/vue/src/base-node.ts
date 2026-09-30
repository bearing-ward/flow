import { defineComponent, h } from 'vue'

/** Caller-composed accessible shell for content rendered inside a FlowCanvas node. */
export const FlowBaseNode = defineComponent({
  name: 'FlowBaseNode',
  inheritAttrs: false,
  props: {
    title: { type: String, required: true },
    ariaLabel: { type: String, default: undefined },
    className: { type: String, default: '' },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'section',
        {
          ...attrs,
          class: ['flow-vue-base-node', props.className, attrs.class],
          role: 'group',
          'aria-label': props.ariaLabel ?? props.title,
          'data-flow-base-node': '',
        },
        [
          h('h2', { class: 'flow-vue-base-node-title' }, props.title),
          h('div', { class: 'flow-vue-base-node-content' }, slots.default?.()),
        ]
      )
  },
})
