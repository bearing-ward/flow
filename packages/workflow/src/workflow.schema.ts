import {
  createFlowDataDocumentSchema,
  createFlowNodeVariantSchema,
  createFlowEdgeVariantSchema,
  FlowNodeSchema,
  HandleIdSchema,
  NodeIdSchema,
  EdgeIdSchema,
} from '@flow/core'
import { Schema as S } from 'effect'

const ports = <F extends S.Struct.Fields>(fields: F) => S.Struct(fields)

const version = S.Literal(1)

const handle = HandleIdSchema

/** Version each semantic variant independently of the generic canvas format. */
export const WorkflowNodeDataSchema = S.Union([
  S.Struct({
    version,
    kind: S.Literal('initial'),
    config: S.Struct({ value: S.String }),
    ports: ports({ output: handle }),
  }),
  S.Struct({
    version,
    kind: S.Literal('transform'),
    config: S.Struct({
      operation: S.Literals(['uppercase', 'lowercase', 'trim']),
    }),
    ports: ports({ input: handle, output: handle }),
  }),
  S.Struct({
    version,
    kind: S.Literal('branch'),
    config: S.Struct({
      operator: S.Literals(['equals', 'contains']),
      value: S.String,
    }),
    ports: ports({ input: handle, true: handle, false: handle }),
  }),
  S.Struct({
    version,
    kind: S.Literal('join'),
    config: S.Struct({ separator: S.String }),
    ports: ports({ input: handle, output: handle }),
  }),
  S.Struct({
    version,
    kind: S.Literal('output'),
    config: S.Struct({ format: S.Literals(['text', 'image']) }),
    ports: ports({ input: handle }),
  }),
  S.Struct({
    version,
    kind: S.Literal('text-input'),
    config: S.Struct({ text: S.String, locked: S.Boolean }),
    ports: ports({ output: handle }),
  }),
  S.Struct({
    version,
    kind: S.Literal('generate-text'),
    config: S.Struct({
      modelId: S.NonEmptyString,
      temperature: S.Finite.check(S.isBetween({ minimum: 0, maximum: 2 })),
      system: S.String,
      prompt: S.String,
    }),
    ports: ports({
      trigger: handle,
      system: handle,
      prompt: handle,
      output: handle,
    }),
  }),
  S.Struct({
    version,
    kind: S.Literal('generate-image'),
    config: S.Struct({
      modelId: S.NonEmptyString,
      width: S.Int.check(S.isGreaterThan(0)),
      height: S.Int.check(S.isGreaterThan(0)),
      prompt: S.String,
    }),
    ports: ports({ trigger: handle, prompt: handle, image: handle }),
  }),
  S.Struct({
    version,
    kind: S.Literal('workflow-trigger'),
    config: S.Struct({ label: S.String }),
    ports: ports({ output: handle }),
  }),
]).annotate({ parseOptions: { onExcessProperty: 'error' } })

export type WorkflowNodeData = typeof WorkflowNodeDataSchema.Type

const nodeData = S.StructWithRest(
  S.Struct({ workflow: S.optional(WorkflowNodeDataSchema) }),
  [S.Record(S.String, S.Json)]
)

/** Workflow semantics are independent of renderer type, tree data and shape data. */
export const WorkflowNodeSchema = createFlowNodeVariantSchema({
  type: S.optional(S.NonEmptyString),
  data: S.optional(nodeData),
}).check(
  S.makeFilter((node) => S.is(FlowNodeSchema)(node) || 'Invalid node extension')
)

export type WorkflowNode = typeof WorkflowNodeSchema.Type

export const WorkflowConnectionDataSchema = S.Struct({
  version,
  kind: S.Literals(['data', 'trigger']),
}).annotate({ parseOptions: { onExcessProperty: 'error' } })

export type WorkflowConnectionData = typeof WorkflowConnectionDataSchema.Type

export const WorkflowEdgeSchema = createFlowEdgeVariantSchema({
  type: S.optional(S.NonEmptyString),
  data: S.optional(
    S.StructWithRest(
      S.Struct({ workflow: S.optional(WorkflowConnectionDataSchema) }),
      [S.Record(S.String, S.Json)]
    )
  ),
})

export type WorkflowEdge = typeof WorkflowEdgeSchema.Type

export const WorkflowDocumentSchema = createFlowDataDocumentSchema({
  nodes: WorkflowNodeSchema,
  edges: WorkflowEdgeSchema,
}).annotate({ parseOptions: { onExcessProperty: 'error' } })

export type WorkflowDocument = typeof WorkflowDocumentSchema.Type

export const WorkflowPortSchema = S.Struct({
  id: HandleIdSchema,
  role: S.Literals([
    'input',
    'output',
    'true',
    'false',
    'system',
    'prompt',
    'image',
    'trigger',
  ]),
  direction: S.Literals(['source', 'target']),
  valueType: S.Literals(['text', 'image', 'trigger']),
  multiple: S.Boolean,
})

export type WorkflowPort = typeof WorkflowPortSchema.Type

export const WorkflowIssueSchema = S.Union([
  S.Struct({ code: S.Literal('empty-workflow') }),
  S.Struct({
    code: S.Literal('missing-input'),
    nodeId: NodeIdSchema,
    portId: HandleIdSchema,
  }),
  S.Struct({ code: S.Literal('unreachable-node'), nodeId: NodeIdSchema }),
  S.Struct({
    code: S.Literal('invalid-setting'),
    nodeId: NodeIdSchema,
    field: S.Literals(['modelId', 'value', 'temperature', 'size']),
  }),
  S.Struct({ code: S.Literal('duplicate-node-id'), nodeId: NodeIdSchema }),
  S.Struct({ code: S.Literal('duplicate-edge-id'), edgeId: EdgeIdSchema }),
  S.Struct({
    code: S.Literal('missing-endpoint'),
    edgeId: EdgeIdSchema,
    nodeId: NodeIdSchema,
  }),
  S.Struct({
    code: S.Literal('missing-workflow-node'),
    edgeId: EdgeIdSchema,
    nodeId: NodeIdSchema,
  }),
  S.Struct({
    code: S.Literal('invalid-port'),
    nodeId: NodeIdSchema,
    portId: S.String,
  }),
  S.Struct({
    code: S.Literal('incompatible-ports'),
    edgeId: EdgeIdSchema,
    nodeId: NodeIdSchema,
    portId: S.String,
    sourceNodeId: NodeIdSchema,
    sourcePortId: S.String,
  }),
  S.Struct({
    code: S.Literal('multiple-inputs'),
    edgeId: EdgeIdSchema,
    nodeId: NodeIdSchema,
    portId: HandleIdSchema,
  }),
  S.Struct({
    code: S.Literal('missing-connection-contract'),
    edgeId: EdgeIdSchema,
  }),
  S.Struct({
    code: S.Literal('cycle'),
    nodeIds: S.Array(NodeIdSchema),
    edgeIds: S.Array(EdgeIdSchema),
  }),
])

export type WorkflowIssue = typeof WorkflowIssueSchema.Type
