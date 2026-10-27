import {
  EdgeIdSchema,
  HandleIdSchema,
  NodeIdSchema,
  XYPositionSchema,
  prepareFlowEdit,
  FlowSpan,
  FlowAttribute,
} from '@flow/core'
import type { FlowDocument, FlowEditTransaction } from '@flow/core'
import { Effect, Schema as S } from 'effect'

import { decodeWorkflowDocument } from './workflow-document.ts'
import { workflowPorts } from './workflow-ports.ts'
import {
  WorkflowNodeDataSchema,
  WorkflowNodeSchema,
  WorkflowEdgeSchema,
} from './workflow.schema.ts'
import type {
  WorkflowNodeData,
  WorkflowNode,
  WorkflowEdge,
  WorkflowDocument,
} from './workflow.schema.ts'

export const workflowKinds = [
  'initial',
  'transform',
  'branch',
  'join',
  'output',
  'text-input',
  'generate-text',
  'generate-image',
  'workflow-trigger',
] as const

export const WorkflowKindSchema = S.Literals(workflowKinds)

export type WorkflowKind = typeof WorkflowKindSchema.Type

/** Allocation is application-owned and must return a fresh ID in its namespace. */
export interface WorkflowIds {
  readonly allocate: (namespace: 'node' | 'edge' | 'handle') => string
}

const tagged = S.TaggedError

export class WorkflowEditError extends tagged<WorkflowEditError>()(
  'WorkflowEditError',
  {
    code: S.Literals([
      'missing-node',
      'missing-edge',
      'incompatible-insertion',
      'kind-change',
      'locked-text',
    ]),
  }
) {}

export const WorkflowEditSchema = S.Union([
  S.Struct({
    kind: S.Literal('add'),
    nodeKind: WorkflowKindSchema,
    position: XYPositionSchema,
  }),
  S.Struct({
    kind: S.Literal('append'),
    nodeKind: WorkflowKindSchema,
    edgeId: EdgeIdSchema,
    position: XYPositionSchema,
  }),
  S.Struct({
    kind: S.Literal('delete'),
    nodeId: NodeIdSchema,
    reconnect: S.Boolean,
  }),
  S.Struct({
    kind: S.Literal('configure'),
    nodeId: NodeIdSchema,
    workflow: WorkflowNodeDataSchema,
  }),
])

export type WorkflowEdit = typeof WorkflowEditSchema.Type

const defaults = (kind: WorkflowKind, ids: WorkflowIds): WorkflowNodeData => {
  const handle = () =>
    S.decodeUnknownSync(HandleIdSchema)(ids.allocate('handle'))

  switch (kind) {
    case 'initial': {
      return {
        version: 1,
        kind,
        config: { value: '' },
        ports: { output: handle() },
      }
    }

    case 'transform': {
      return {
        version: 1,
        kind,
        config: { operation: 'uppercase' },
        ports: { input: handle(), output: handle() },
      }
    }

    case 'branch': {
      return {
        version: 1,
        kind,
        config: { operator: 'equals', value: '' },
        ports: { input: handle(), true: handle(), false: handle() },
      }
    }

    case 'join': {
      return {
        version: 1,
        kind,
        config: { separator: ', ' },
        ports: { input: handle(), output: handle() },
      }
    }

    case 'output': {
      return {
        version: 1,
        kind,
        config: { format: 'text' },
        ports: { input: handle() },
      }
    }

    case 'text-input': {
      return {
        version: 1,
        kind,
        config: { text: '', locked: false },
        ports: { output: handle() },
      }
    }

    case 'generate-text': {
      return {
        version: 1,
        kind,
        config: {
          modelId: 'local-text',
          temperature: 0,
          system: '',
          prompt: '',
        },
        ports: {
          trigger: handle(),
          system: handle(),
          prompt: handle(),
          output: handle(),
        },
      }
    }

    case 'generate-image': {
      return {
        version: 1,
        kind,
        config: { modelId: 'local-image', width: 256, height: 256, prompt: '' },
        ports: { trigger: handle(), prompt: handle(), image: handle() },
      }
    }

    case 'workflow-trigger': {
      return {
        version: 1,
        kind,
        config: { label: 'Start' },
        ports: { output: handle() },
      }
    }

    default: {
      const exhaustive: never = kind

      return exhaustive
    }
  }
}

export const createWorkflowNode = (
  options: {
    readonly kind: WorkflowKind
    readonly position: typeof XYPositionSchema.Type
  },
  ids: WorkflowIds
): WorkflowNode => {
  const workflow = defaults(options.kind, ids)
  const declared = workflowPorts(workflow)

  return S.decodeUnknownSync(WorkflowNodeSchema)({
    id: ids.allocate('node'),
    label: options.kind,
    type: 'workflow',
    position: options.position,
    size: { width: 200, height: 120 },
    handles: declared.map((port) => ({
      id: port.id,
      kind: port.direction,
      side: port.direction === 'source' ? 'right' : 'left',
    })),
    data: { workflow },
  })
}

const connectedPort = (
  document: WorkflowDocument,
  edge: WorkflowEdge,
  direction: 'source' | 'target'
) => {
  const data = document.nodes.find((node) => node.id === edge[direction])?.data
    ?.workflow

  return data === undefined
    ? undefined
    : workflowPorts(data).find(
        (port) =>
          port.id ===
          edge[direction === 'source' ? 'sourceHandle' : 'targetHandle']
      )
}

const reconnectEdges = (
  document: WorkflowDocument,
  node: WorkflowNode,
  reconnect: boolean,
  ids: WorkflowIds
) => {
  const reconnected: WorkflowEdge[] = []

  if (reconnect) {
    for (const incoming of document.edges.filter(
      (edge) => edge.target === node.id
    )) {
      for (const outgoing of document.edges.filter(
        (edge) => edge.source === node.id
      )) {
        const source = connectedPort(document, incoming, 'source')
        const target = connectedPort(document, outgoing, 'target')

        if (
          source === undefined ||
          target === undefined ||
          source.valueType !== target.valueType
        ) {
          continue
        }

        if (
          reconnected.some(
            (edge) =>
              edge.source === incoming.source &&
              edge.sourceHandle === incoming.sourceHandle &&
              edge.target === outgoing.target &&
              edge.targetHandle === outgoing.targetHandle
          )
        ) {
          continue
        }

        reconnected.push({
          ...incoming,
          id: S.decodeUnknownSync(EdgeIdSchema)(ids.allocate('edge')),
          target: outgoing.target,
          targetHandle: outgoing.targetHandle,
        })
      }
    }
  }

  return reconnected
}

const transactionFor = (
  document: WorkflowDocument,
  edit: WorkflowEdit,
  ids: WorkflowIds
) =>
  Effect.gen(function* workflowTransaction() {
    if (edit.kind === 'add' || edit.kind === 'append') {
      const node = createWorkflowNode(
        { kind: edit.nodeKind, position: edit.position },
        ids
      )

      if (edit.kind === 'add') {
        return {
          operations: [{ kind: 'add-nodes', nodes: [node] }],
        } satisfies FlowEditTransaction
      }

      const edge = document.edges.find((item) => item.id === edit.edgeId)

      if (edge === undefined) {
        return yield* new WorkflowEditError({ code: 'missing-edge' })
      }

      const source = connectedPort(document, edge, 'source')
      const target = connectedPort(document, edge, 'target')

      const ports =
        node.data?.workflow === undefined
          ? []
          : workflowPorts(node.data.workflow)

      const input = ports.find(
        (port) =>
          port.direction === 'target' && port.valueType === source?.valueType
      )

      const output = ports.find(
        (port) =>
          port.direction === 'source' && port.valueType === target?.valueType
      )

      if (input === undefined || output === undefined) {
        return yield* new WorkflowEditError({ code: 'incompatible-insertion' })
      }

      const downstream: WorkflowEdge = {
        ...edge,
        id: S.decodeUnknownSync(EdgeIdSchema)(ids.allocate('edge')),
        source: node.id,
        sourceHandle: output.id,
      }

      return {
        operations: [
          { kind: 'add-nodes', nodes: [node] },
          {
            kind: 'update-edge',
            edgeId: edge.id,
            patch: { target: node.id, targetHandle: input.id },
          },
          { kind: 'add-edges', edges: [downstream] },
        ],
      } satisfies FlowEditTransaction
    }

    const node = document.nodes.find((item) => item.id === edit.nodeId)

    if (node === undefined || node.data?.workflow === undefined) {
      return yield* new WorkflowEditError({ code: 'missing-node' })
    }

    if (edit.kind === 'configure') {
      const current = node.data.workflow

      if (current.kind !== edit.workflow.kind) {
        return yield* new WorkflowEditError({ code: 'kind-change' })
      }

      if (
        current.kind === 'text-input' &&
        current.config.locked &&
        edit.workflow.kind === 'text-input' &&
        current.config.text !== edit.workflow.config.text
      ) {
        return yield* new WorkflowEditError({ code: 'locked-text' })
      }

      const workflow = yield* S.decodeUnknownEffect(WorkflowNodeDataSchema)({
        ...edit.workflow,
        ports: current.ports,
      })

      return {
        operations: [
          { kind: 'update-node-data', nodeId: node.id, data: { workflow } },
        ],
      } satisfies FlowEditTransaction
    }

    const reconnected = reconnectEdges(document, node, edit.reconnect, ids)

    return {
      operations: [
        { kind: 'delete-elements', nodeIds: [node.id] },
        { kind: 'add-edges', edges: reconnected },
      ],
    } satisfies FlowEditTransaction
  })

export type WorkflowEditFailure =
  | WorkflowEditError
  | S.SchemaError
  | Effect.Error<ReturnType<typeof decodeWorkflowDocument>>
  | Effect.Error<ReturnType<typeof prepareFlowEdit>>

/** Prepare one validated transaction. The host owns acceptance, revision and history. */
export const prepareWorkflowEdit = (
  document: FlowDocument,
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Public edit commands are decoded at this boundary.
  input: unknown,
  ids: WorkflowIds
): Effect.Effect<FlowEditTransaction, WorkflowEditFailure> =>
  Effect.gen(function* prepareWorkflowTransaction() {
    const edit = yield* S.decodeUnknownEffect(WorkflowEditSchema)(input)
    const accepted = yield* decodeWorkflowDocument(document)
    const transaction = yield* transactionFor(accepted, edit, ids)
    const result = yield* prepareFlowEdit(document, transaction)
    yield* decodeWorkflowDocument(result.document)
    yield* Effect.logDebug('Prepared workflow edit').pipe(
      Effect.annotateLogs({ [FlowAttribute.inputKind]: edit.kind })
    )

    return transaction
  }).pipe(
    Effect.tapError((failure) =>
      Effect.logWarning('Rejected workflow edit').pipe(
        Effect.annotateLogs({
          [FlowAttribute.failureName]: failure._tag,
          [FlowAttribute.inputKind]: 'workflow-edit',
        }),
        Effect.withSpan(FlowSpan.editFailure)
      )
    ),
    Effect.withSpan(FlowSpan.editPrepare)
  )

/** Typed connections use the same structural policy as imported documents. */
export const prepareWorkflowConnection = (
  document: FlowDocument,
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Connections are decoded before preparing a transaction.
  input: unknown
) =>
  Effect.gen(function* prepareConnection() {
    const edge = yield* S.decodeUnknownEffect(WorkflowEdgeSchema)(input)

    const transaction: FlowEditTransaction = {
      operations: [{ kind: 'add-edges', edges: [edge] }],
    }

    const result = yield* prepareFlowEdit(document, transaction)
    yield* decodeWorkflowDocument(result.document)

    return transaction
  }).pipe(
    Effect.tapError((failure) =>
      Effect.logWarning('Rejected workflow connection').pipe(
        Effect.annotateLogs({
          [FlowAttribute.failureName]: failure._tag,
          [FlowAttribute.inputKind]: 'workflow-connection',
        })
      )
    ),
    Effect.withSpan(FlowSpan.connectionValidate)
  )
