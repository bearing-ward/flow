import { resolveFlowInteractivity } from '@flow/core'
import type { FlowInteractivity, FlowInteractivityInput } from '@flow/core'
import { Exit } from 'effect'
import type { Runtime } from 'foldkit'

import { HostAction } from './application.ts'
import type { ports } from './application.ts'

/** Read and change one Runtime's interaction switches. */
export interface FoldkitInteractivity {
  /** The switches the Runtime last published. */
  readonly get: () => FlowInteractivity
  /** Send a partial patch; the Runtime merges it and publishes the result. */
  readonly set: (next: FlowInteractivityInput) => void
  /** Called with every state the Runtime publishes. */
  readonly subscribe: (
    listener: (interactivity: FlowInteractivity) => void
  ) => () => void
  readonly dispose: () => void
}

/**
 * Host-side switch client. The Runtime model is the only source of truth:
 * `set` sends a partial `HostAction.SetInteractivity` patch that the reducer
 * merges, and the state comes back on the `interactivityStates` port. On
 * creation the client sends an empty patch, so the Runtime publishes its
 * current switches. Until that arrives `get` returns the defaults.
 */
export const createFoldkitInteractivity = (
  handle: Pick<
    Runtime.EmbedHandle<typeof ports>['ports'],
    'actions' | 'interactivityStates'
  >
): FoldkitInteractivity => {
  let current = resolveFlowInteractivity()
  const listeners = new Set<(interactivity: FlowInteractivity) => void>()

  const stop = handle.interactivityStates.subscribe((state) => {
    current = state

    for (const listener of listeners) {
      listener(state)
    }
  })

  const send = (patch: FlowInteractivityInput): void => {
    const fields = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined)
    )

    const sent = handle.actions.send(HostAction.SetInteractivity(fields))

    if (Exit.isFailure(sent)) {
      throw new Error('Foldkit rejected the interactivity change')
    }
  }

  send({})

  return {
    get: () => current,
    set: send,
    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    dispose: () => {
      stop()
      listeners.clear()
    },
  }
}
