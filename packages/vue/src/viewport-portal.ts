import { defineComponent, h, inject, Teleport } from 'vue'
import type { ComputedRef, InjectionKey, ShallowRef } from 'vue'

interface FlowViewportPortalContext {
  readonly target: ShallowRef<HTMLElement | null>
  readonly noPanClassName: ComputedRef<string>
  readonly noDragClassName: ComputedRef<string>
  readonly noWheelClassName: ComputedRef<string>
}

export const FlowViewportPortalContextKey: InjectionKey<FlowViewportPortalContext> =
  Symbol('FlowViewportPortalContext')

/** Render graph-positioned content inside the canvas pan and zoom layer. */
export const FlowViewportPortal = defineComponent({
  name: 'FlowViewportPortal',
  setup(_props, { slots }) {
    const context = inject(FlowViewportPortalContextKey)

    if (context === undefined) {
      throw new Error('FlowViewportPortal must be rendered inside FlowCanvas')
    }

    return () => {
      const portalTarget = context.target.value

      if (portalTarget === null) {
        return null
      }

      return h(
        Teleport,
        { to: portalTarget },
        h(
          'div',
          {
            class: [
              'flow-vue-viewport-portal',
              context.noPanClassName.value,
              context.noDragClassName.value,
              context.noWheelClassName.value,
            ],
          },
          slots.default?.()
        )
      )
    }
  },
})
