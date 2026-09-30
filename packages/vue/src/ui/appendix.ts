import { defineComponent, h, ref } from 'vue'

/** A compact disclosure for optional details placed inside a Flow node. */
export const FlowAppendix = defineComponent({
  name: 'FlowAppendix',
  inheritAttrs: false,
  props: {
    id: { type: String, required: true },
    label: { type: String, default: 'Appendix' },
  },
  setup(props, { attrs, slots }) {
    const expanded = ref(false)

    return () =>
      h(
        'section',
        {
          ...attrs,
          class: ['flow-vue-appendix', attrs.class],
          'data-flow-no-drag': '',
        },
        [
          h(
            'button',
            {
              type: 'button',
              class: 'flow-vue-appendix__trigger',
              'aria-expanded': String(expanded.value),
              'aria-controls': props.id,
              onClick: () => {
                expanded.value = !expanded.value
              },
            },
            props.label
          ),
          h(
            'div',
            {
              id: props.id,
              class: 'flow-vue-appendix__content',
              role: 'region',
              'aria-label': props.label,
              hidden: !expanded.value,
            },
            slots.default?.()
          ),
        ]
      )
  },
})
