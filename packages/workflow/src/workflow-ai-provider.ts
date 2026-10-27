import { FlowAttribute, FlowSpan } from '@flow/core'
import { Context, Effect, Layer, Schema as S, Stream } from 'effect'

import {
  isolateWorkflowAiValue,
  WorkflowAiCapabilitiesSchema,
  WorkflowAiError,
  WorkflowImageRequestSchema,
  WorkflowImageResultSchema,
  WorkflowTextEventSchema,
  WorkflowTextRequestSchema,
} from './workflow-ai.schema.ts'
import type {
  WorkflowAiCapabilities,
  WorkflowImageRequest,
  WorkflowImageResult,
  WorkflowTextEvent,
  WorkflowTextRequest,
} from './workflow-ai.schema.ts'

export const WorkflowAiProvider = Context.Service<
  'flow/WorkflowAiProvider',
  {
    readonly capabilities: WorkflowAiCapabilities
    readonly text: (
      // oxlint-disable-next-line anti-slop/no-unknown-parameters -- This public I/O boundary decodes untrusted data with Effect Schema.
      request: unknown
    ) => Stream.Stream<WorkflowTextEvent, WorkflowAiError>
    readonly image: (
      // oxlint-disable-next-line anti-slop/no-unknown-parameters -- This public I/O boundary decodes untrusted data with Effect Schema.
      request: unknown
    ) => Effect.Effect<WorkflowImageResult, WorkflowAiError>
  }
>('flow/WorkflowAiProvider')

export type WorkflowAiProviderService = typeof WorkflowAiProvider.Service

/** Implementations return unknown values. Only the decoded service crosses into callers. */
export interface WorkflowAiImplementation {
  readonly text: (
    request: WorkflowTextRequest
  ) => Stream.Stream<unknown, WorkflowAiError>
  readonly image: (
    request: WorkflowImageRequest
  ) => Effect.Effect<unknown, WorkflowAiError>
}

const failure = (code: WorkflowAiError['code']) => new WorkflowAiError({ code })

const decode = <A, I>(
  schema: S.Codec<A, I>,
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- This public I/O boundary decodes untrusted data with Effect Schema.
  input: unknown,
  code: WorkflowAiError['code']
) =>
  S.decodeUnknownEffect(schema)(input, { onExcessProperty: 'error' }).pipe(
    Effect.mapError(() => failure(code)),
    Effect.tapError((rejected) =>
      Effect.logWarning('Rejected workflow AI boundary').pipe(
        Effect.annotateLogs({ [FlowAttribute.failureName]: rejected.code })
      )
    ),
    Effect.withSpan(FlowSpan.workflowAiDecode)
  )

/** No provider exception or schema issue is copied into diagnostics or failures. */
export const makeWorkflowAiProvider = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- This public I/O boundary decodes untrusted data with Effect Schema.
  capabilities: unknown,
  implementation: WorkflowAiImplementation
): Effect.Effect<WorkflowAiProviderService, WorkflowAiError> =>
  Effect.gen(function* makeProvider() {
    const decoded = yield* decode(
      WorkflowAiCapabilitiesSchema,
      capabilities,
      'invalid-capabilities'
    )

    const supported = isolateWorkflowAiValue(decoded)

    return {
      capabilities: supported,
      text: (input) =>
        Stream.suspend(() => {
          let text = ''
          let completed = false

          const request = decode(
            WorkflowTextRequestSchema,
            input,
            'invalid-request'
          ).pipe(
            Effect.flatMap((value) =>
              supported.text.some(
                (model) =>
                  model.modelId === value.modelId &&
                  model.temperatures.includes(value.temperature)
              )
                ? Effect.succeed(value)
                : Effect.fail(failure('unsupported-setting'))
            )
          )

          return Stream.unwrap(
            request.pipe(
              Effect.map((value) =>
                Stream.suspend(() => implementation.text(value))
              )
            )
          ).pipe(
            Stream.mapEffect((raw) =>
              decode(WorkflowTextEventSchema, raw, 'invalid-result')
            ),
            Stream.mapEffect((event) => {
              if (
                completed ||
                (event.kind === 'complete' && event.text !== text)
              ) {
                return Effect.fail(failure('invalid-result'))
              }

              if (event.kind === 'chunk') {
                text += event.text
              } else {
                completed = true
              }

              return Effect.succeed(event)
            }),
            Stream.filter((event) => event.kind === 'chunk'),
            Stream.concat(
              Stream.unwrap(
                Effect.suspend(() =>
                  completed
                    ? Effect.succeed(
                        Stream.succeed<WorkflowTextEvent>({
                          kind: 'complete',
                          text,
                        })
                      )
                    : Effect.fail(failure('invalid-result'))
                )
              )
            ),
            Stream.catchDefect(() => Stream.fail(failure('provider-failure')))
          )
        }),
      image: (input) =>
        decode(WorkflowImageRequestSchema, input, 'invalid-request').pipe(
          Effect.flatMap((request) => {
            const supportedSize = supported.image.some(
              (model) =>
                model.modelId === request.modelId &&
                model.sizes.some(
                  (candidate) =>
                    candidate.width === request.width &&
                    candidate.height === request.height
                )
            )

            if (!supportedSize) {
              return Effect.fail(failure('unsupported-setting'))
            }

            return Effect.suspend(() => implementation.image(request)).pipe(
              Effect.flatMap((raw) =>
                decode(WorkflowImageResultSchema, raw, 'invalid-result')
              ),
              Effect.flatMap((result) =>
                result.width === request.width &&
                result.height === request.height
                  ? Effect.succeed(result)
                  : Effect.fail(failure('invalid-result'))
              )
            )
          }),
          Effect.catchDefect(() => Effect.fail(failure('provider-failure')))
        ),
    }
  })

export const workflowAiProviderLayer = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Provider capability data is decoded by the owning constructor.
  capabilities: unknown,
  implementation: WorkflowAiImplementation
) =>
  Layer.effect(
    WorkflowAiProvider,
    makeWorkflowAiProvider(capabilities, implementation)
  )
