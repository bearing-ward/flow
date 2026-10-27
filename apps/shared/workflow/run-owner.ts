import {
  evaluateOfflineWorkflowNode,
  reduceWorkflowRunEvent,
  startWorkflowRun,
  WorkflowRevisionError,
  WorkflowRunIdSchema,
} from '@flow/workflow'
import type { WorkflowNodeEvent, WorkflowRunState } from '@flow/workflow'
import { Effect, Exit, Schema as S, Scope } from 'effect'

import type { WorkflowValidationSnapshot } from './validation.ts'

export const workflowStatus = (state: WorkflowNodeEvent['state']) => {
  switch (state) {
    case 'succeeded': {
      return 'ready'
    }

    case 'failed': {
      return 'error'
    }

    default: {
      return 'waiting'
    }
  }
}

/** Browser composition owns this scope. Nothing here writes to the document owner. */
export const createWorkflowRunOwner = (revision: () => number) => {
  let state: WorkflowRunState | null = null
  let scope: Scope.Closeable | undefined
  let generation = 0
  let disposed = false
  const listeners = new Set<() => void>()

  const publish = () => {
    for (const listener of listeners) {
      listener()
    }
  }

  const close = () => {
    const previous = scope
    scope = undefined

    return previous === undefined
      ? Promise.resolve()
      : Effect.runPromise(Scope.close(previous, Exit.void))
  }

  return {
    state: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    start: async (
      snapshot: WorkflowValidationSnapshot,
      expectedRevision: number
    ) => {
      generation += 1
      const token = generation
      await close()

      if (disposed || token !== generation) {
        return
      }

      if (revision() !== expectedRevision) {
        throw new WorkflowRevisionError({
          expectedRevision,
          acceptedRevision: revision(),
        })
      }

      const runId = S.decodeUnknownSync(WorkflowRunIdSchema)(`local-${token}`)
      state = { runId, revision: snapshot.revision, state: 'queued', nodes: {} }
      publish()
      const acquired = Scope.makeUnsafe()
      scope = acquired

      try {
        await Effect.runPromise(
          startWorkflowRun(snapshot, {
            runId,
            expectedRevision,
            // The demo deliberately paces local evaluation so running/cancel are observable.
            evaluate: (evaluation) =>
              Effect.sleep('200 millis').pipe(
                Effect.andThen(() => evaluateOfflineWorkflowNode(evaluation))
              ),
            onEvent: (event) => {
              if (disposed || token !== generation || state === null) {
                return
              }

              const next = reduceWorkflowRunEvent(state, event, revision())

              if (next !== state) {
                state = next
                publish()
              }
            },
          }).pipe(Effect.provideService(Scope.Scope, acquired))
        )
      } catch (error) {
        if (token === generation) {
          state = null
          publish()
          await close()
        }

        throw error
      }
    },
    cancel: close,
    invalidate: () => {
      if (state !== null && state.revision !== revision()) {
        generation += 1
        state = null
        publish()
        void close()
      }
    },
    dispose: () => {
      disposed = true
      generation += 1
      listeners.clear()

      return close()
    },
  }
}

export type WorkflowRunOwner = ReturnType<typeof createWorkflowRunOwner>
