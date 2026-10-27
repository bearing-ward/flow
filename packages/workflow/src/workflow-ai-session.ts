import { FlowAttribute, FlowSpan } from '@flow/core'
import { Effect, Fiber, Result, Schema as S, Stream } from 'effect'
import type { Context, Scope } from 'effect'

import { WorkflowAiProvider } from './workflow-ai-provider.ts'
import {
  isolateWorkflowAiValue,
  WorkflowAiError,
  WorkflowAiRequestSchema,
} from './workflow-ai.schema.ts'
import type {
  WorkflowAiEvent,
  WorkflowAiRequest,
  WorkflowAiState,
} from './workflow-ai.schema.ts'

export interface WorkflowAiSession {
  readonly request: WorkflowAiRequest
  readonly cancel: Effect.Effect<void>
  readonly await: Effect.Effect<void>
}

/** The scope owns all provider work. Callers allocate a fresh identity for every request. */
export const startWorkflowAiSession = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Session requests are decoded before any provider work begins.
  input: unknown,
  onEvent: (event: WorkflowAiEvent) => void
): Effect.Effect<
  WorkflowAiSession,
  WorkflowAiError,
  Scope.Scope | Context.Service.Identifier<typeof WorkflowAiProvider>
> =>
  Effect.uninterruptibleMask((restore) =>
    Effect.gen(function* startSession() {
      const decoded = yield* restore(
        S.decodeUnknownEffect(WorkflowAiRequestSchema)(input, {
          onExcessProperty: 'error',
        }).pipe(
          Effect.mapError(
            () => new WorkflowAiError({ code: 'invalid-request' })
          ),
          Effect.withSpan(FlowSpan.workflowAiDecode)
        )
      )

      const request = isolateWorkflowAiValue(decoded)

      const provider = yield* WorkflowAiProvider

      const identity = {
        runId: request.runId,
        revision: request.revision,
        nodeId: request.nodeId,
      }

      const emit = (event: WorkflowAiEvent) =>
        Effect.sync(() => {
          onEvent(isolateWorkflowAiValue({ ...identity, ...event }))
        })

      const execute = Effect.gen(function* executeSession() {
        yield* emit({ ...identity, kind: 'running' })
        yield* Effect.logDebug('Started workflow AI capability')

        const operation =
          request.kind === 'text'
            ? Stream.runForEach(provider.text(request.request), (event) =>
                emit({ ...identity, kind: 'text', event })
              )
            : provider
                .image(request.request)
                .pipe(
                  Effect.flatMap((result) =>
                    emit({ ...identity, kind: 'image', result })
                  )
                )

        const result = yield* Effect.result(operation)

        if (Result.isFailure(result)) {
          yield* emit({
            ...identity,
            kind: 'failed',
            code: result.failure.code,
          })
          yield* Effect.logWarning('Failed workflow AI capability').pipe(
            Effect.annotateLogs({
              [FlowAttribute.failureName]: result.failure.code,
            })
          )
        } else {
          yield* Effect.logDebug('Succeeded workflow AI capability')
        }
      }).pipe(
        Effect.onInterrupt(() =>
          emit({ ...identity, kind: 'cancelled' }).pipe(
            Effect.andThen(Effect.logDebug('Cancelled workflow AI capability'))
          )
        ),
        Effect.annotateLogs({
          [FlowAttribute.workflowRunId]: request.runId,
          [FlowAttribute.workflowRevision]: request.revision,
          [FlowAttribute.nodeId]: request.nodeId,
        }),
        Effect.withSpan(FlowSpan.workflowAi, {
          attributes: {
            [FlowAttribute.workflowRunId]: request.runId,
            [FlowAttribute.workflowRevision]: request.revision,
            [FlowAttribute.nodeId]: request.nodeId,
          },
        })
      )

      const fiber = yield* Effect.forkScoped(restore(execute), {
        startImmediately: true,
      })

      return {
        request,
        cancel: Fiber.interrupt(fiber),
        await: Fiber.join(fiber),
      }
    })
  ).pipe(
    Effect.tapError((rejected) =>
      Effect.logWarning('Rejected workflow AI session').pipe(
        Effect.annotateLogs({ [FlowAttribute.failureName]: rejected.code })
      )
    )
  )

/** An event cannot select its own run identity or revive a completed request. */
export const reduceWorkflowAiEvent = (
  current: WorkflowAiState,
  event: WorkflowAiEvent,
  acceptedRevision: number
): WorkflowAiState => {
  const { identity } = current

  if (
    identity.runId !== event.runId ||
    identity.revision !== event.revision ||
    identity.nodeId !== event.nodeId ||
    identity.revision !== acceptedRevision ||
    (current.state !== 'queued' && current.state !== 'running')
  ) {
    return current
  }

  switch (event.kind) {
    case 'running': {
      return current.state === 'queued'
        ? { ...current, state: 'running' }
        : current
    }

    case 'text': {
      if (current.state !== 'running') {
        return current
      }

      return event.event.kind === 'chunk'
        ? { ...current, text: current.text + event.event.text }
        : { ...current, state: 'succeeded', text: event.event.text }
    }

    case 'image': {
      return current.state === 'running'
        ? { ...current, state: 'succeeded', image: event.result }
        : current
    }

    case 'failed': {
      return { ...current, state: 'failed', failure: event.code }
    }

    case 'cancelled': {
      return { ...current, state: 'cancelled' }
    }

    default: {
      const exhaustive: never = event

      return exhaustive
    }
  }
}
