import { defineComponent, h } from 'vue'

/** Native empty-canvas action. The caller owns the graph edit performed on activation. */
export const FlowPlaceholder = defineComponent({
  name: 'FlowPlaceholder',
  props: {
    label: { type: String, default: 'Add your first node' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['activate'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        {
          type: 'button',
          class: 'flow-vue-placeholder',
          'aria-label': props.label,
          disabled: props.disabled,
          onClick: () => emit('activate'),
        },
        props.label
      )
  },
})
