import {
  EdgeIdSchema,
  HandleIdSchema,
  FlowAttribute,
  FlowSpan,
  NodeIdSchema,
  RevisionSchema,
} from '@flow/core'
import type { FlowDocument } from '@flow/core'
import { Effect, Schema as S } from 'effect'

import { workflowAiSettingIssues } from './workflow-ai-settings.ts'
import type { WorkflowAiCapabilities } from './workflow-ai.schema.ts'
import { decodeWorkflowDocument } from './workflow-document.ts'
import { workflowPorts } from './workflow-ports.ts'
import { WorkflowValidationError } from './workflow-validation-error.ts'
import { workflowIssues } from './workflow-validation.ts'
import {
  WorkflowDocumentSchema,
  WorkflowIssueSchema,
  WorkflowPortSchema,
} from './workflow.schema.ts'
import type {
  WorkflowDocument,
  WorkflowIssue,
  WorkflowNodeData,
} from './workflow.schema.ts'

export const WorkflowValidationReportSchema = S.Struct({
  issues: S.Array(WorkflowIssueSchema),
  reachableNodeIds: S.Array(NodeIdSchema),
})

export type WorkflowValidationReport =
  typeof WorkflowValidationReportSchema.Type

const isEntry = (data: WorkflowNodeData) =>
  data.kind === 'initial' ||
  data.kind === 'text-input' ||
  data.kind === 'workflow-trigger'

const requiredPorts = (
  data: WorkflowNodeData
): readonly (typeof HandleIdSchema.Type)[] => {
  switch (data.kind) {
    case 'initial':
    case 'text-input':
    case 'workflow-trigger': {
      return []
    }

    case 'transform':
    case 'branch':
    case 'join':
    case 'output': {
      return [data.ports.input]
    }

    case 'generate-text':
    case 'generate-image': {
      return data.config.prompt.trim() === ''
        ? [data.ports.trigger, data.ports.prompt]
        : [data.ports.trigger]
    }

    default: {
      const exhaustive: never = data

      return exhaustive
    }
  }
}

const settingIssues = (
  nodeId: WorkflowDocument['nodes'][number]['id'],
  data: WorkflowNodeData
): readonly WorkflowIssue[] => {
  if (
    (data.kind === 'generate-text' || data.kind === 'generate-image') &&
    data.config.modelId.trim() === ''
  ) {
    return [
      {
        code: 'invalid-setting',
        nodeId,
        field: 'modelId',
      },
    ]
  }

  if (
    data.kind === 'branch' &&
    data.config.operator === 'contains' &&
    data.config.value === ''
  ) {
    return [{ code: 'invalid-setting', nodeId, field: 'value' }]
  }

  return []
}

/** Editable integrity is separate from readiness. Every report uses physical, stable IDs. */
export const workflowValidationReport = (
  document: WorkflowDocument,
  capabilities?: WorkflowAiCapabilities
): WorkflowValidationReport => {
  const issues: WorkflowIssue[] = [
    ...workflowIssues({
      ...document,
      nodes: document.nodes.toSorted((a, b) => a.id.localeCompare(b.id)),
      edges: document.edges.toSorted((a, b) => a.id.localeCompare(b.id)),
    }),
  ]

  const executable = document.nodes.filter(
    (node) => node.data?.workflow !== undefined
  )

  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, Set<string>>()

  for (const edge of document.edges) {
    if (edge.data?.workflow === undefined) {
      continue
    }

    outgoing.set(edge.source, [
      ...(outgoing.get(edge.source) ?? []),
      edge.target,
    ])
    const ports = incoming.get(edge.target) ?? new Set<string>()

    if (edge.targetHandle !== undefined) {
      ports.add(edge.targetHandle)
    }

    incoming.set(edge.target, ports)
  }

  const reachable = new Set<string>()

  const pending: string[] = executable.flatMap((node) =>
    node.data?.workflow !== undefined && isEntry(node.data.workflow)
      ? [node.id]
      : []
  )

  while (pending.length > 0) {
    const id = pending.pop()

    if (id === undefined || reachable.has(id)) {
      continue
    }

    reachable.add(id)
    pending.push(...(outgoing.get(id) ?? []))
  }

  if (executable.length === 0) {
    issues.push({ code: 'empty-workflow' })
  }

  for (const node of executable) {
    const data = node.data?.workflow

    if (data === undefined) {
      continue
    }

    for (const portId of requiredPorts(data)) {
      const port = workflowPorts(data).find((item) => item.id === portId)

      if (port !== undefined && !incoming.get(node.id)?.has(portId)) {
        issues.push({ code: 'missing-input', nodeId: node.id, portId: port.id })
      }
    }

    if (!reachable.has(node.id)) {
      issues.push({ code: 'unreachable-node', nodeId: node.id })
    }

    issues.push(
      ...settingIssues(node.id, data),
      ...workflowAiSettingIssues(node.id, data, capabilities)
    )
  }

  return {
    issues: issues.toSorted((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    ),
    reachableNodeIds: executable
      .filter((node) => reachable.has(node.id))
      .map((node) => node.id)
      .toSorted(),
  }
}

export const WorkflowExecutionPlanSchema = S.Struct({
  revision: RevisionSchema,
  document: WorkflowDocumentSchema,
  policy: S.Struct({
    scheduling: S.Literal('sequential-node-id'),
    inactiveBranch: S.Literal('skip'),
    join: S.Literal('settle-all-use-active'),
    noActiveInput: S.Literal('skip'),
  }),
  steps: S.Array(
    S.Struct({
      nodeId: NodeIdSchema,
      requiredPortIds: S.Array(HandleIdSchema),
      inputs: S.Array(
        S.Struct({
          edgeId: EdgeIdSchema,
          sourceNodeId: NodeIdSchema,
          sourcePort: WorkflowPortSchema,
          targetPort: WorkflowPortSchema,
        })
      ),
      outputs: S.Array(WorkflowPortSchema),
    })
  ),
})

export type WorkflowExecutionPlan = typeof WorkflowExecutionPlanSchema.Type

export const WorkflowPreparationSchema = S.Union([
  S.Struct({
    kind: S.Literal('invalid'),
    report: WorkflowValidationReportSchema,
  }),
  S.Struct({ kind: S.Literal('ready'), plan: WorkflowExecutionPlanSchema }),
])

export type WorkflowPreparation = typeof WorkflowPreparationSchema.Type

/** Pure deterministic preparation. A detached snapshot prevents later edits changing the plan. */
export const createWorkflowExecutionPlan = (
  document: WorkflowDocument,
  revision: number,
  capabilities?: WorkflowAiCapabilities
): WorkflowPreparation => {
  const report = workflowValidationReport(document, capabilities)

  if (report.issues.length > 0) {
    return { kind: 'invalid', report }
  }

  const nodes = new Map(
    document.nodes.flatMap((node) =>
      node.data?.workflow === undefined
        ? []
        : [[node.id, node.data.workflow] as const]
    )
  )

  const remaining = new Set(nodes.keys())
  const completed = new Set<string>()
  const steps: WorkflowExecutionPlan['steps'][number][] = []

  while (remaining.size > 0) {
    const id = [...remaining]
      .toSorted()
      .find((nodeId) =>
        document.edges.every(
          (edge) =>
            edge.data?.workflow === undefined ||
            edge.target !== nodeId ||
            completed.has(edge.source)
        )
      )

    if (id === undefined) {
      break
    }

    const data = nodes.get(id)

    if (data === undefined) {
      break
    }

    const inputs = document.edges
      .filter((edge) => edge.data?.workflow !== undefined && edge.target === id)
      .flatMap((edge) => {
        const source = nodes.get(edge.source)

        const sourcePort =
          source === undefined
            ? undefined
            : workflowPorts(source).find(
                (port) => port.id === edge.sourceHandle
              )

        const targetPort = workflowPorts(data).find(
          (port) => port.id === edge.targetHandle
        )

        return sourcePort === undefined || targetPort === undefined
          ? []
          : [
              {
                edgeId: edge.id,
                sourceNodeId: edge.source,
                sourcePort,
                targetPort,
              },
            ]
      })
      .toSorted(
        (a, b) =>
          a.sourceNodeId.localeCompare(b.sourceNodeId) ||
          a.edgeId.localeCompare(b.edgeId)
      )

    steps.push({
      nodeId: id,
      requiredPortIds: requiredPorts(data),
      inputs,
      outputs: workflowPorts(data).filter(
        (port) => port.direction === 'source'
      ),
    })
    remaining.delete(id)
    completed.add(id)
  }

  return {
    kind: 'ready',
    plan: {
      revision,
      document: structuredClone(document),
      policy: {
        scheduling: 'sequential-node-id',
        inactiveBranch: 'skip',
        join: 'settle-all-use-active',
        noActiveInput: 'skip',
      },
      steps,
    },
  }
}

const tagged = S.TaggedError

export class WorkflowRevisionError extends tagged<WorkflowRevisionError>()(
  'WorkflowRevisionError',
  {
    expectedRevision: RevisionSchema,
    acceptedRevision: RevisionSchema,
  }
) {}

export type WorkflowPreparationFailure =
  | WorkflowRevisionError
  | WorkflowValidationError
  | S.SchemaError
  | Effect.Error<ReturnType<typeof decodeWorkflowDocument>>

/** Call with a fresh atomic owner snapshot immediately before starting a run. */
export const prepareWorkflowExecution = (
  accepted: { readonly revision: number; readonly document: FlowDocument },
  expectedRevision: number,
  capabilities?: WorkflowAiCapabilities
): Effect.Effect<WorkflowExecutionPlan, WorkflowPreparationFailure> =>
  Effect.gen(function* prepareExecution() {
    yield* S.decodeUnknownEffect(RevisionSchema)(accepted.revision)
    yield* S.decodeUnknownEffect(RevisionSchema)(expectedRevision)

    if (accepted.revision !== expectedRevision) {
      return yield* new WorkflowRevisionError({
        expectedRevision,
        acceptedRevision: accepted.revision,
      })
    }

    const document = yield* decodeWorkflowDocument(accepted.document)

    const result = createWorkflowExecutionPlan(
      document,
      accepted.revision,
      capabilities
    )

    if (result.kind === 'invalid') {
      return yield* new WorkflowValidationError({
        issues: result.report.issues,
      })
    }

    yield* Effect.logDebug('Prepared workflow execution').pipe(
      Effect.annotateLogs({
        [FlowAttribute.nodeCount]: result.plan.steps.length,
      })
    )

    return result.plan
  }).pipe(
    Effect.tapError((failure) =>
      Effect.logWarning('Rejected workflow preparation').pipe(
        Effect.annotateLogs({
          [FlowAttribute.failureName]: failure._tag,
          [FlowAttribute.inputKind]: 'workflow-preparation',
        })
      )
    ),
    Effect.withSpan(FlowSpan.documentIntegrity)
  )
