import { FlowAttribute, FlowSpan } from '@flow/core'
import { Effect, Exit, Schema } from 'effect'
import type { Runtime } from 'foldkit'

import { HostAction } from './application.ts'
import type { ports } from './application.ts'
import { InteractionEventSchema } from './graph.ts'
import type { InteractionEvent } from './graph.ts'

/** Optional pointer callbacks. Presence enables the same wrappers as React Flow. */
export type FoldkitInteractionHandlers = Partial<
  Record<
    | 'onNodeClick'
    | 'onNodeMouseEnter'
    | 'onNodeMouseMove'
    | 'onNodeMouseLeave'
    | 'onEdgeClick',
    ((event: InteractionEvent) => void) | undefined
  >
>

/** One callback owner per Runtime. Callbacks remain outside its serializable model. */
export const createFoldkitInteractionHandlers = (
  handle: Pick<
    Runtime.EmbedHandle<typeof ports>['ports'],
    'actions' | 'interactionEvents'
  >,
  initial: FoldkitInteractionHandlers = {}
) => {
  let handlers = { ...initial }
  let disposed = false

  const sendPresence = () => {
    const sent = handle.actions.send(
      HostAction.SetInteractionHandlers({
        nodePointerHandlers:
          handlers.onNodeClick !== undefined ||
          handlers.onNodeMouseEnter !== undefined ||
          handlers.onNodeMouseMove !== undefined ||
          handlers.onNodeMouseLeave !== undefined,
        edgeClickHandler: handlers.onEdgeClick !== undefined,
      })
    )

    if (Exit.isFailure(sent)) {
      throw new Error('Foldkit rejected pointer callback presence')
    }

    Effect.runSync(
      Effect.logDebug('Changed Foldkit pointer callback presence').pipe(
        Effect.annotateLogs({ [FlowAttribute.inputKind]: 'api' }),
        Effect.withSpan(FlowSpan.interactivityChange)
      )
    )
  }

  const stop = handle.interactionEvents.subscribe((events) => {
    for (const event of events) {
      switch (event.name) {
        case 'onNodeClick':
        case 'onNodeMouseEnter':
        case 'onNodeMouseMove':
        case 'onNodeMouseLeave':
        case 'onEdgeClick': {
          try {
            handlers[event.name]?.(
              Schema.decodeUnknownSync(InteractionEventSchema)(event)
            )
          } catch (error) {
            Effect.runSync(
              Effect.logError('Foldkit pointer callback failed', error).pipe(
                Effect.annotateLogs({
                  [FlowAttribute.failureName]:
                    error instanceof Error ? error.name : 'Unknown',
                }),
                Effect.withSpan(FlowSpan.domReconcile)
              )
            )
          }

          break
        }

        default: {
          break
        }
      }
    }
  })

  sendPresence()

  return {
    set: (next: FoldkitInteractionHandlers) => {
      if (!disposed) {
        handlers = { ...next }
        sendPresence()
      }
    },
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      stop()
      handlers = {}
      sendPresence()
    },
  }
}
