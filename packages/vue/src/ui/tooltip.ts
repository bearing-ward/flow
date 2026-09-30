import { cloneVNode, defineComponent, h, isVNode, ref, useId } from 'vue'
import type { VNode } from 'vue'

/** A small hover and focus tooltip for a single slotted trigger. */
export const FlowTooltip = defineComponent({
  name: 'FlowTooltip',
  props: {
    text: { type: String, required: true },
  },
  setup(props, { slots }) {
    const id = `flow-tooltip-${useId()}`
    const hovered = ref(false)
    const focused = ref(false)
    const visible = ref(false)

    const setHovered = (next: boolean): void => {
      hovered.value = next
      visible.value = hovered.value || focused.value
    }

    const setFocused = (next: boolean): void => {
      focused.value = next
      visible.value = hovered.value || focused.value
    }

    return () => {
      const children = slots.default?.() ?? []
      const triggerIndex = children.findIndex(isVNode)

      const trigger = triggerIndex === -1 ? null : children[triggerIndex]

      const existingDescription = String(
        trigger?.props?.['aria-describedby'] ?? ''
      )

      const descriptionIds = existingDescription.split(/\s+/u).filter(Boolean)

      const describedBy = [...new Set([...descriptionIds, id])].join(' ')

      const describedTrigger =
        trigger === null
          ? null
          : cloneVNode(
              // SAFETY: `findIndex(isVNode)` guarantees this indexed child is a VNode.
              trigger as VNode,
              { 'aria-describedby': describedBy }
            )

      if (triggerIndex !== -1 && describedTrigger !== null) {
        children[triggerIndex] = describedTrigger
      }

      return h(
        'span',
        {
          class: 'flow-vue-tooltip',
          onPointerenter: () => setHovered(true),
          onPointerleave: () => setHovered(false),
          onFocusin: () => setFocused(true),
          onFocusout: (event: FocusEvent) => {
            const next = event.relatedTarget
            const current = event.currentTarget

            if (
              !(next instanceof Node) ||
              !(current instanceof HTMLElement) ||
              !current.contains(next)
            ) {
              setFocused(false)
            }
          },
          onPointerdown: (event: PointerEvent) => event.stopPropagation(),
          onWheel: (event: WheelEvent) => event.stopPropagation(),
        },
        [
          ...children,
          h(
            'span',
            {
              id,
              class: 'flow-vue-tooltip__content',
              role: 'tooltip',
              hidden: !visible.value,
              'aria-hidden': visible.value ? undefined : 'true',
            },
            props.text
          ),
        ]
      )
    }
  },
})
