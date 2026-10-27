import {
  decodeVersionedFlowDocument,
  encodeVersionedFlowDocument,
  FlowAttribute,
  FlowColorModeSchema,
  FlowSpan,
  SavedVersionedFlowDocumentSchema,
} from '@flow/core'
import type { FlowDocument } from '@flow/core'
import { Effect, Schema as S } from 'effect'

import { decodeWorkflowDocument } from './workflow-document.ts'
import type { WorkflowDocument } from './workflow.schema.ts'

/** Workflow versions evolve independently of the frozen graph envelopes. */
export const SavedWorkflowSchema = S.Struct({
  format: S.Literal('@flow/workflow'),
  version: S.Literal(1),
  workflowVersion: S.Literal(1),
  graph: SavedVersionedFlowDocumentSchema,
  theme: FlowColorModeSchema,
}).annotate({ parseOptions: { onExcessProperty: 'error' } })

export type SavedWorkflow = typeof SavedWorkflowSchema.Encoded

type WorkflowDocumentFailure = Effect.Error<
  ReturnType<typeof decodeWorkflowDocument>
>

const tagged = S.TaggedError

export class WorkflowPersistenceError extends tagged<WorkflowPersistenceError>()(
  'WorkflowPersistenceError',
  { code: S.Literal('invalid-workflow-envelope') }
) {}

/** Only accepted semantic data and core's declared saved fields leave the owner. */
export const encodeSavedWorkflow = (
  document: FlowDocument,
  theme: SavedWorkflow['theme'] = 'system'
): Effect.Effect<SavedWorkflow, WorkflowDocumentFailure> =>
  decodeWorkflowDocument(document).pipe(
    Effect.map((accepted): SavedWorkflow => ({
      format: '@flow/workflow',
      version: 1,
      workflowVersion: 1,
      graph: encodeVersionedFlowDocument(accepted),
      theme,
    })),
    Effect.tap(() => Effect.logDebug('Encoded local workflow')),
    Effect.withSpan(FlowSpan.documentDecode, {
      attributes: { [FlowAttribute.inputKind]: 'workflow-export' },
    })
  )

/** No implicit migration of unknown workflow versions or generic graph saves. */
export const decodeSavedWorkflow = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Local files cross the workflow persistence Schema boundary here.
  input: unknown
): Effect.Effect<
  {
    readonly document: WorkflowDocument
    readonly theme: SavedWorkflow['theme']
  },
  | WorkflowPersistenceError
  | WorkflowDocumentFailure
  | Effect.Error<ReturnType<typeof decodeVersionedFlowDocument>>
> =>
  S.decodeUnknownEffect(SavedWorkflowSchema)(input, {
    onExcessProperty: 'error',
  }).pipe(
    Effect.mapError(
      () => new WorkflowPersistenceError({ code: 'invalid-workflow-envelope' })
    ),
    Effect.flatMap((saved) =>
      decodeVersionedFlowDocument(saved.graph).pipe(
        Effect.flatMap(decodeWorkflowDocument),
        Effect.map((document) => ({ document, theme: saved.theme }))
      )
    ),
    Effect.tap(() => Effect.logDebug('Restored local workflow')),
    Effect.tapError(() =>
      Effect.logWarning('Rejected local workflow envelope').pipe(
        Effect.annotateLogs({ [FlowAttribute.inputKind]: 'workflow-import' })
      )
    ),
    Effect.withSpan(FlowSpan.documentDecode, {
      attributes: { [FlowAttribute.inputKind]: 'workflow-import' },
    })
  )
