import { NodeIdSchema, RevisionSchema } from '@flow/core'
import { Schema as S } from 'effect'

import { WorkflowRunIdSchema } from './workflow-execution.schema.ts'

const dimension = S.Int.check(S.isGreaterThan(0))

const temperature = S.Finite.check(S.isBetween({ minimum: 0, maximum: 2 }))

const size = S.Struct({ width: dimension, height: dimension })

const strict = { parseOptions: { onExcessProperty: 'error' } } as const

export const WorkflowAiCapabilitiesSchema = S.Struct({
  providerId: S.NonEmptyString,
  text: S.Array(
    S.Struct({
      modelId: S.NonEmptyString,
      temperatures: S.Array(temperature).check(S.isMinLength(1)),
    })
  ),
  image: S.Array(
    S.Struct({
      modelId: S.NonEmptyString,
      sizes: S.Array(size).check(S.isMinLength(1)),
    })
  ),
}).annotate(strict)

export type WorkflowAiCapabilities = typeof WorkflowAiCapabilitiesSchema.Type

export const WorkflowAiIdentitySchema = S.Struct({
  runId: WorkflowRunIdSchema,
  revision: RevisionSchema,
  nodeId: NodeIdSchema,
})

export type WorkflowAiIdentity = typeof WorkflowAiIdentitySchema.Type

export const WorkflowTextRequestSchema = S.Struct({
  modelId: S.NonEmptyString,
  temperature,
  system: S.String,
  prompt: S.NonEmptyString,
}).annotate(strict)

export type WorkflowTextRequest = typeof WorkflowTextRequestSchema.Type

export const WorkflowImageRequestSchema = S.Struct({
  modelId: S.NonEmptyString,
  width: dimension,
  height: dimension,
  prompt: S.NonEmptyString,
}).annotate(strict)

export type WorkflowImageRequest = typeof WorkflowImageRequestSchema.Type

export const WorkflowTextEventSchema = S.Union([
  S.Struct({ kind: S.Literal('chunk'), text: S.String }),
  S.Struct({ kind: S.Literal('complete'), text: S.String }),
]).annotate(strict)

export type WorkflowTextEvent = typeof WorkflowTextEventSchema.Type

export const WorkflowImageResultSchema = S.Struct({
  assetId: S.NonEmptyString,
  mediaType: S.Literal('image/png'),
  width: dimension,
  height: dimension,
}).annotate(strict)

export type WorkflowImageResult = typeof WorkflowImageResultSchema.Type

export const WorkflowAiRequestSchema = S.Union([
  S.Struct({
    ...WorkflowAiIdentitySchema.fields,
    kind: S.Literal('text'),
    request: WorkflowTextRequestSchema,
  }),
  S.Struct({
    ...WorkflowAiIdentitySchema.fields,
    kind: S.Literal('image'),
    request: WorkflowImageRequestSchema,
  }),
]).annotate(strict)

export type WorkflowAiRequest = typeof WorkflowAiRequestSchema.Type

const tagged = S.TaggedError

export class WorkflowAiError extends tagged<WorkflowAiError>()(
  'WorkflowAiError',
  {
    code: S.Literals([
      'invalid-capabilities',
      'invalid-request',
      'unsupported-setting',
      'invalid-result',
      'provider-failure',
    ]),
  }
) {}

export const WorkflowAiEventSchema = S.Union([
  S.Struct({
    ...WorkflowAiIdentitySchema.fields,
    kind: S.Literals(['running', 'cancelled']),
  }),
  S.Struct({
    ...WorkflowAiIdentitySchema.fields,
    kind: S.Literal('text'),
    event: WorkflowTextEventSchema,
  }),
  S.Struct({
    ...WorkflowAiIdentitySchema.fields,
    kind: S.Literal('image'),
    result: WorkflowImageResultSchema,
  }),
  S.Struct({
    ...WorkflowAiIdentitySchema.fields,
    kind: S.Literal('failed'),
    code: WorkflowAiError.fields.code,
  }),
]).annotate(strict)

export type WorkflowAiEvent = typeof WorkflowAiEventSchema.Type

export const WorkflowAiStateSchema = S.Struct({
  identity: WorkflowAiIdentitySchema,
  state: S.Literals(['queued', 'running', 'succeeded', 'failed', 'cancelled']),
  text: S.String,
  image: S.NullOr(WorkflowImageResultSchema),
  failure: S.NullOr(WorkflowAiError.fields.code),
})

export type WorkflowAiState = typeof WorkflowAiStateSchema.Type

/** Detach before freezing so a provider or subscriber cannot mutate another owner's data. */
export const isolateWorkflowAiValue = <A>(value: A): A => {
  const detached = structuredClone(value)

  const freeze = <B>(entry: B): void => {
    if (entry === null || entry === undefined || Object.isFrozen(entry)) {
      return
    }

    Object.freeze(entry)

    for (const child of Object.values(entry)) {
      freeze(child)
    }
  }

  freeze(detached)

  return detached
}
