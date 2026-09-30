import { defineComponent, h, onBeforeUnmount, onMounted } from 'vue'
import type { PropType } from 'vue'

import { useFlow } from '../use-flow'

type HandleSide = 'top' | 'right' | 'bottom' | 'left'

/** Label for a FlowCanvas handle; the canvas owns its connection button. */
export const FlowLabeledHandle = defineComponent({
  name: 'FlowLabeledHandle',
  props: {
    id: { type: String, required: true },
    label: { type: String, required: true },
    // SAFETY: Vue's runtime String constructor needs PropType to retain the side union.
    side: { type: String as PropType<HandleSide>, required: true },
  },
  setup(props) {
    const flow = useFlow()
    const labelId = `flow-handle-label-${props.id}`
    let describedButton: HTMLButtonElement | null | undefined

    onMounted(() => {
      describedButton = globalThis.document.querySelector<HTMLButtonElement>(
        `[data-handle-id="${props.id}"]`
      )

      if (describedButton !== null && describedButton !== undefined) {
        const tokens = (describedButton.getAttribute('aria-describedby') ?? '')
          .split(/\s+/u)
          .filter(Boolean)

        if (!tokens.includes(labelId)) {
          describedButton.setAttribute(
            'aria-describedby',
            [...tokens, labelId].join(' ')
          )
        }
      }
    })

    onBeforeUnmount(() => {
      if (describedButton === undefined || describedButton === null) {
        return
      }

      const tokens = (describedButton.getAttribute('aria-describedby') ?? '')
        .split(/\s+/u)
        .filter((token) => token.length > 0 && token !== labelId)

      if (tokens.length === 0) {
        describedButton.removeAttribute('aria-describedby')
      } else {
        describedButton.setAttribute('aria-describedby', tokens.join(' '))
      }

      describedButton = undefined
    })

    return () =>
      h(
        'span',
        {
          id: labelId,
          class: ['flow-labeled-handle', `flow-labeled-handle-${props.side}`],
          style: {
            transform: `scale(${1 / flow.viewport.value.zoom})`,
            transformOrigin: 'center',
          },
          'data-flow-labeled-handle': props.id,
        },
        props.label
      )
  },
})
