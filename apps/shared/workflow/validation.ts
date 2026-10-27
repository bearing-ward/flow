import { FlowDocumentSchema, flowHistoryDocument } from '@flow/core'
import type { FlowDocument, FlowEdge } from '@flow/core'
import {
  workflowValidationReport,
  localWorkflowAiCapabilities,
  WorkflowDocumentSchema,
  workflowIssues,
  workflowPorts,
} from '@flow/workflow'
import { Option, Schema as S } from 'effect'

const sameDocument = S.toEquivalence(FlowDocumentSchema)

export const workflowDocumentChanged = (
  previous: FlowDocument,
  current: FlowDocument
) => !sameDocument(flowHistoryDocument(previous), flowHistoryDocument(current))

export const workflowValidationSnapshot = (
  document: FlowDocument,
  revision: number
) => {
  const decoded = S.decodeUnknownSync(WorkflowDocumentSchema)(document)

  return {
    document: decoded,
    revision,
    report: workflowValidationReport(decoded, localWorkflowAiCapabilities),
  }
}

export type WorkflowValidationSnapshot = ReturnType<
  typeof workflowValidationSnapshot
>

/** Canvas defaults create data edges. Trigger edges use the explicit typed port controls. */
export const workflowCanvasConnection = (
  document: FlowDocument,
  connection: Pick<
    FlowEdge,
    'source' | 'sourceHandle' | 'target' | 'targetHandle'
  >
) => {
  const candidate = S.decodeUnknownOption(WorkflowDocumentSchema)({
    ...document,
    edges: [
      ...document.edges,
      {
        ...connection,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        id: 'workflow-candidate',
        data: { workflow: { version: 1, kind: 'data' } },
      },
    ],
  })

  return (
    Option.isSome(candidate) && workflowIssues(candidate.value).length === 0
  )
}

export const workflowConnectionOptions = (
  snapshot: WorkflowValidationSnapshot,
  direction: 'source' | 'target'
) =>
  snapshot.document.nodes.flatMap((node) =>
    node.data?.workflow === undefined
      ? []
      : workflowPorts(node.data.workflow)
          .filter((port) => port.direction === direction)
          .map((port) => ({
            nodeId: node.id,
            port,
            label: `${node.id} ${port.role}`,
          }))
  )
