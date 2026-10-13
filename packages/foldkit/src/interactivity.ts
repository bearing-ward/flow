import { FlowAttribute, FlowSpan, resolveFlowInteractivity } from '@flow/core'
import type { FlowInteractivity, FlowInteractivityInput } from '@flow/core'
import { Effect, Exit } from 'effect'
import type { Runtime } from 'foldkit'

import { HostAction } from './application.ts'
import type { ports } from './application.ts'

/** Read and change one Runtime's interaction switches. */
export interface FoldkitInteractivity {
  readonly get: () => FlowInteractivity
  readonly set: (next: FlowInteractivityInput) => void
  readonly subscribe: (
    listener: (interactivity: FlowInteractivity) => void
  ) => () => void
}

/**
 * Host-side switch client: `set` sends `HostAction.SetInteractivity` and
 * remembers the result, so Controls and the app share one source. Pass the
 * same values the program was created with as `initial`.
 */
export const createFoldkitInteractivity = (
  handle: Pick<Runtime.EmbedHandle<typeof ports>['ports'], 'actions'>,
  initial?: FlowInteractivityInput
): FoldkitInteractivity => {
  let current = resolveFlowInteractivity(initial)
  const listeners = new Set<(interactivity: FlowInteractivity) => void>()

  return {
    get: () => current,
    set: (next) => {
      const resolved: FlowInteractivity = {
        nodesDraggable: next.nodesDraggable ?? current.nodesDraggable,
        nodesConnectable: next.nodesConnectable ?? current.nodesConnectable,
        elementsSelectable:
          next.elementsSelectable ?? current.elementsSelectable,
      }

      const sent = handle.actions.send(HostAction.SetInteractivity(resolved))

      if (Exit.isFailure(sent)) {
        throw new Error('Foldkit rejected the interactivity change')
      }

      current = resolved

      const attributes = {
        [FlowAttribute.nodesDraggable]: resolved.nodesDraggable,
        [FlowAttribute.nodesConnectable]: resolved.nodesConnectable,
        [FlowAttribute.elementsSelectable]: resolved.elementsSelectable,
      }

      Effect.runSync(
        Effect.logDebug('Changed flow interactivity').pipe(
          Effect.annotateLogs(attributes),
          Effect.withSpan(FlowSpan.interactivityChange, { attributes })
        )
      )

      for (const listener of listeners) {
        listener(current)
      }
    },
    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}
