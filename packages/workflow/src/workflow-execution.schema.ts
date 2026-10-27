import { NodeIdSchema, RevisionSchema } from '@flow/core'
import { Schema as S } from 'effect'

import { WorkflowDocumentSchema } from './workflow.schema.ts'

export const WorkflowRunIdSchema = S.NonEmptyString.pipe(
  S.brand('WorkflowRunId')
)

export type WorkflowRunId = typeof WorkflowRunIdSchema.Type

/** Requests capture one accepted revision. Runtime sessions are never document fields. */
export const WorkflowRunRequestSchema = S.Struct({
  runId: WorkflowRunIdSchema,
  revision: RevisionSchema,
  document: WorkflowDocumentSchema,
})

export type WorkflowRunRequest = typeof WorkflowRunRequestSchema.Type

export const WorkflowValueSchema = S.Union([
  S.Struct({ kind: S.Literal('text'), text: S.String }),
  S.Struct({
    kind: S.Literal('image'),
    assetId: S.NonEmptyString,
    mediaType: S.Literal('image/png'),
    width: S.Int.check(S.isGreaterThan(0)),
    height: S.Int.check(S.isGreaterThan(0)),
  }),
  S.Struct({ kind: S.Literal('trigger') }),
])

export type WorkflowValue = typeof WorkflowValueSchema.Type

const identity = {
  runId: WorkflowRunIdSchema,
  revision: RevisionSchema,
  nodeId: NodeIdSchema,
}

export const WorkflowNodeEventSchema = S.Union([
  S.Struct({
    ...identity,
    state: S.Literals(['queued', 'cancelled', 'skipped']),
  }),
  S.Struct({
    ...identity,
    state: S.Literal('running'),
    text: S.optional(S.String),
  }),
  S.Struct({
    ...identity,
    state: S.Literal('succeeded'),
    outputs: S.Record(S.String, WorkflowValueSchema),
  }),
  S.Struct({
    ...identity,
    state: S.Literal('failed'),
    failure: S.Struct({ code: S.NonEmptyString }),
  }),
])

export type WorkflowNodeEvent = typeof WorkflowNodeEventSchema.Type

export const WorkflowOutputsSchema = S.Record(S.String, WorkflowValueSchema)

export type WorkflowOutputs = typeof WorkflowOutputsSchema.Type

export const WorkflowRunEventSchema = S.Union([
  S.Struct({ kind: S.Literal('node'), event: WorkflowNodeEventSchema }),
  S.Struct({
    kind: S.Literal('run'),
    runId: WorkflowRunIdSchema,
    revision: RevisionSchema,
    state: S.Literals(['queued', 'running', 'succeeded', 'cancelled']),
  }),
  S.Struct({
    kind: S.Literal('run'),
    runId: WorkflowRunIdSchema,
    revision: RevisionSchema,
    state: S.Literal('failed'),
    failure: S.Struct({ code: S.NonEmptyString }),
  }),
])

export type WorkflowRunEvent = typeof WorkflowRunEventSchema.Type

export const WorkflowRunStateSchema = S.Struct({
  runId: WorkflowRunIdSchema,
  revision: RevisionSchema,
  state: S.Literals(['queued', 'running', 'succeeded', 'failed', 'cancelled']),
  nodes: S.Record(S.String, WorkflowNodeEventSchema),
})

export type WorkflowRunState = typeof WorkflowRunStateSchema.Type

const tagged = S.TaggedError

export class WorkflowRuntimeError extends tagged<WorkflowRuntimeError>()(
  'WorkflowRuntimeError',
  { code: S.NonEmptyString }
) {}
