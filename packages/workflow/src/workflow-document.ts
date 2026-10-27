import {
  defineFlowDataContract,
  validateFlowGraphDocument,
  FlowAttribute,
  FlowSpan,
} from '@flow/core'
import type {
  FlowDocument,
  FlowClipboardExtension,
  FlowDocumentIntegrityError,
  FlowDataContract,
} from '@flow/core'
import { Effect, Option, Schema as S } from 'effect'

import { WorkflowDecodeError } from './workflow-decode-error.ts'
import { WorkflowValidationError } from './workflow-validation-error.ts'
import { workflowIssues } from './workflow-validation.ts'
import {
  WorkflowDocumentSchema,
  WorkflowNodeDataSchema,
} from './workflow.schema.ts'
import type { WorkflowDocument } from './workflow.schema.ts'

export const validateWorkflowDocument = (
  document: WorkflowDocument
): Effect.Effect<
  WorkflowDocument,
  WorkflowValidationError | FlowDocumentIntegrityError
> =>
  Effect.gen(function* validateWorkflow() {
    const issues = workflowIssues(document)

    if (issues.length > 0) {
      return yield* new WorkflowValidationError({ issues })
    }

    return yield* validateFlowGraphDocument(document)
  }).pipe(
    Effect.tapError(() =>
      Effect.logWarning('Rejected workflow integrity').pipe(
        Effect.annotateLogs({
          [FlowAttribute.documentIssue]: 'workflow-integrity',
        })
      )
    ),
    Effect.withSpan(FlowSpan.documentIntegrity)
  )

export const decodeWorkflowDocument = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Untrusted workflow imports enter through this Schema boundary.
  input: unknown
): Effect.Effect<
  WorkflowDocument,
  WorkflowDecodeError | WorkflowValidationError | FlowDocumentIntegrityError
> =>
  S.decodeUnknownEffect(WorkflowDocumentSchema)(input, {
    onExcessProperty: 'error',
  }).pipe(
    Effect.mapError(
      () => new WorkflowDecodeError({ code: 'invalid-document' })
    ),
    Effect.flatMap(validateWorkflowDocument),
    Effect.tap((document) =>
      Effect.logDebug('Decoded workflow document').pipe(
        Effect.annotateLogs({
          [FlowAttribute.nodeCount]: document.nodes.length,
          [FlowAttribute.edgeCount]: document.edges.length,
        })
      )
    ),
    Effect.tapError(() =>
      Effect.logWarning('Rejected workflow document').pipe(
        Effect.annotateLogs({ [FlowAttribute.inputKind]: 'workflow' })
      )
    ),
    Effect.withSpan(FlowSpan.documentDecode, {
      attributes: { [FlowAttribute.inputKind]: 'workflow' },
    })
  )

/** Typed actor replacements use the same semantic acceptance policy as imports. */
export const workflowDataContract: FlowDataContract<
  typeof WorkflowDocumentSchema,
  never
> = defineFlowDataContract({
  id: '@flow/workflow/1',
  document: WorkflowDocumentSchema.check(
    S.makeFilter(
      (document) =>
        workflowIssues(document).length === 0 || 'Invalid workflow integrity'
    )
  ),
  isolation: {
    detach: (document: WorkflowDocument) =>
      Effect.sync(() => structuredClone(document)),
  },
})

/** Project accepted semantics through existing canvas geometry without executing nodes. */
export const projectWorkflowDocument = (
  document: WorkflowDocument
): FlowDocument => structuredClone(document)

/** Only workflow-owned physical handle bindings are rewritten; opaque metadata stays opaque. */
export const workflowClipboardExtension: FlowClipboardExtension = {
  remapNode: (node, references) => {
    const decoded = S.decodeUnknownOption(WorkflowNodeDataSchema)(
      node.data?.workflow
    )

    if (Option.isNone(decoded)) {
      return node
    }

    const data = decoded.value

    // Clipboard invokes extensions after replacing node.id. Locate the source by its allocated ID.
    const original = [...references.nodeIds].find(
      ([, allocated]) => allocated === node.id
    )?.[0]

    const handles =
      original === undefined ? undefined : references.handleIds.get(original)

    return {
      ...node,
      data: {
        ...node.data,
        workflow: {
          ...data,
          ports: Object.fromEntries(
            Object.entries(data.ports).map(([role, id]) => [
              role,
              handles?.get(id) ?? id,
            ])
          ),
        },
      },
    }
  },
}
