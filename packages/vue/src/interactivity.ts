import { FlowAttribute, FlowSpan, resolveFlowInteractivity } from '@flow/core'
import type { FlowInteractivity, FlowInteractivityInput } from '@flow/core'
import { Effect } from 'effect'
import { shallowRef, watch } from 'vue'
import type { ShallowRef } from 'vue'

const switchNames = [
  'nodesDraggable',
  'nodesConnectable',
  'elementsSelectable',
] as const

export interface FlowInteractivityState {
  readonly interactivity: Readonly<ShallowRef<FlowInteractivity>>
  readonly setInteractivity: (next: FlowInteractivityInput) => void
}

/**
 * Runtime `nodesDraggable`, `nodesConnectable` and `elementsSelectable`
 * switches. As in React Flow's store, the latest write wins per switch:
 * a changed prop or a `setInteractivity` call.
 */
export const createFlowInteractivityState = (
  props: () => FlowInteractivity
): FlowInteractivityState => {
  const interactivity = shallowRef(resolveFlowInteractivity(props()))

  const setInteractivity = (next: FlowInteractivityInput): void => {
    const merged = resolveFlowInteractivity({ ...interactivity.value, ...next })

    if (
      switchNames.every((name) => merged[name] === interactivity.value[name])
    ) {
      return
    }

    interactivity.value = merged
    Effect.runSync(
      Effect.logDebug('Changed Vue interaction switches').pipe(
        Effect.annotateLogs({
          [FlowAttribute.inputKind]: switchNames
            .map((name) => `${name}=${String(merged[name])}`)
            .join(','),
        }),
        Effect.withSpan(FlowSpan.controllerUpdate)
      )
    )
  }

  watch(props, (current, previous) => {
    const changed = Object.fromEntries(
      switchNames.flatMap((name) =>
        current[name] === previous[name] ? [] : [[name, current[name]]]
      )
    )

    setInteractivity(changed)
  })

  return { interactivity, setInteractivity }
}
