import { defineComponent, inject, onBeforeUnmount, provide, watch } from 'vue'
import type { InjectionKey } from 'vue'

/** Interaction paths drawn by custom edges, keyed by edge id. */
export interface FlowEdgeInteractionRegistry {
  readonly set: (edgeId: string, path: string | undefined) => void
}

export const FlowEdgeInteractionRegistryKey: InjectionKey<FlowEdgeInteractionRegistry> =
  Symbol('FlowEdgeInteractionRegistry')

const FlowEdgeScopeKey: InjectionKey<() => string> = Symbol('FlowEdgeScope')

/** Gives a custom edge renderer its edge id, so its parts can report to the canvas. */
export const FlowEdgeScope = defineComponent({
  name: 'FlowEdgeScope',
  props: { edgeId: { type: String, required: true } },
  setup(props, { slots }) {
    provide(FlowEdgeScopeKey, () => props.edgeId)

    return () => slots.default?.()
  },
})

/**
 * Report the path a custom edge draws, so the canvas hit target, hover and
 * focus follow it instead of the handle-to-handle route. Outside a canvas
 * edge scope this does nothing.
 */
export const useEdgeInteractionPath = (
  path: () => string | undefined
): void => {
  // A null default keeps Vue from warning when an edge renders outside a canvas.
  const registry = inject(FlowEdgeInteractionRegistryKey, null)
  const edgeId = inject(FlowEdgeScopeKey, null)

  if (registry === null || edgeId === null) {
    return
  }

  let reported = edgeId()

  watch(
    [edgeId, path],
    ([id, next]) => {
      if (id !== reported) {
        registry.set(reported, undefined)
        reported = id
      }

      registry.set(id, next)
    },
    { immediate: true }
  )
  onBeforeUnmount(() => registry.set(reported, undefined))
}
