import {
  Effect,
  Match,
  Schema as S,
  SchemaParser,
  SchemaTransformation,
} from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { DuplicateEdgeId } from './duplicate-edge-id.ts'
import { DuplicateHandleId } from './duplicate-handle-id.ts'
import { DuplicateNodeId } from './duplicate-node-id.ts'
import { NodeOriginSchema } from './flow-origin.schema.ts'
import {
  EdgeIdSchema,
  HandleIdSchema,
  NodeIdSchema,
  XYPositionSchema,
} from './flow-values.ts'
import type { EdgeId, NodeId } from './flow-values.ts'
import { MissingEdgeEndpoint } from './missing-edge-endpoint.ts'
import { MissingEdgeHandle } from './missing-edge-handle.ts'
import { MissingParentNode } from './missing-parent-node.ts'
import { ParentCycle } from './parent-cycle.ts'
import { ParentExtentWithoutParent } from './parent-extent-without-parent.ts'
import { SelfParentNode } from './self-parent-node.ts'

export { DuplicateEdgeId } from './duplicate-edge-id.ts'

export { DuplicateHandleId } from './duplicate-handle-id.ts'

export { DuplicateNodeId } from './duplicate-node-id.ts'

export { MissingEdgeEndpoint } from './missing-edge-endpoint.ts'

export { MissingEdgeHandle } from './missing-edge-handle.ts'

export { MissingParentNode } from './missing-parent-node.ts'

export { ParentCycle } from './parent-cycle.ts'

export { ParentExtentWithoutParent } from './parent-extent-without-parent.ts'

export { SelfParentNode } from './self-parent-node.ts'

export {
  EdgeIdSchema,
  HandleIdSchema,
  NodeIdSchema,
  XYPositionSchema,
} from './flow-values.ts'

export type { EdgeId, HandleId, NodeId, XYPosition } from './flow-values.ts'

export const FlowHandleSchema = S.Struct({
  id: HandleIdSchema,
  kind: S.Literals(['source', 'target']),
  side: S.Literals(['top', 'right', 'bottom', 'left']),
})

export type FlowHandle = typeof FlowHandleSchema.Type

export const NodeSizeSchema = S.Struct({
  width: S.Finite.check(S.isGreaterThan(0)),
  height: S.Finite.check(S.isGreaterThan(0)),
})

export type NodeSize = typeof NodeSizeSchema.Type

export const FlowNodeSchema = S.Struct({
  id: NodeIdSchema,
  label: S.String,
  position: XYPositionSchema,
  origin: S.optional(NodeOriginSchema),
  parentId: S.optional(NodeIdSchema),
  type: S.optional(S.NonEmptyString),
  data: S.optional(S.JsonObject),
  zIndex: S.optional(S.Finite),
  size: S.optional(NodeSizeSchema),
  extent: S.optional(S.Literals(['parent'])),
  handles: S.optional(S.Array(FlowHandleSchema)),
  selected: S.optional(S.Boolean),
  selectable: S.optional(S.Boolean),
  focusable: S.optional(S.Boolean),
  connectable: S.optional(S.Boolean),
  draggable: S.optional(S.Boolean),
  deletable: S.optional(S.Boolean),
  ariaRole: S.optional(S.String),
  ariaLabel: S.optional(S.String),
  ariaDescription: S.optional(S.String),
  hidden: S.optional(S.Boolean),
})

export type FlowNode = typeof FlowNodeSchema.Type

export const FlowEdgePathSchema = S.Literals([
  'straight',
  'bezier',
  'step',
  'smoothstep',
  'simplebezier',
])

export type FlowEdgePath = typeof FlowEdgePathSchema.Type

export const FlowEdgeMarkerSchema = S.Literals(['arrow', 'arrowclosed'])

export type FlowEdgeMarker = typeof FlowEdgeMarkerSchema.Type

const markerConfiguration = S.Struct({
  type: FlowEdgeMarkerSchema,
  color: S.optional(S.NullOr(S.String)),
  width: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  height: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  markerUnits: S.optional(S.String),
  orient: S.optional(S.String),
  strokeWidth: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  colorPresence: S.optionalKey(S.Never),
})

const markerConfigurationWire = S.Struct({
  ...markerConfiguration.fields,
  colorPresence: S.optionalKey(S.Literal('explicit-undefined')),
}).check(
  S.makeFilter(
    (value) =>
      !Object.hasOwn(value, 'colorPresence') ||
      !Object.hasOwn(value, 'color') ||
      'Marker color flag/value conflict'
  )
)

export const FlowEdgeMarkerConfigurationSchema = S.declareConstructor<
  typeof markerConfiguration.Type,
  typeof markerConfiguration.Encoded
>()(
  [markerConfiguration],
  ([configuration]) =>
    (input, _ast, options) =>
      SchemaParser.decodeUnknownEffect(configuration)(input, options),
  {
    toEquivalence: ([equivalence]) => equivalence,
    toCodecJson: () =>
      S.link<typeof markerConfiguration.Type>()(
        markerConfigurationWire,
        SchemaTransformation.transformEffect({
          decode: (value, options) => {
            const { colorPresence, ...rest } = value

            return SchemaParser.decodeUnknownEffect(markerConfiguration)(
              colorPresence === 'explicit-undefined'
                ? { ...rest, color: undefined }
                : rest,
              options
            )
          },
          encode: (value, options) => {
            const { color, colorPresence: _reserved, ...rest } = value

            let projected: typeof markerConfigurationWire.Type

            if (!Object.hasOwn(value, 'color')) {
              projected = rest
            } else if (color === undefined) {
              projected = { ...rest, colorPresence: 'explicit-undefined' }
            } else {
              projected = { ...rest, color }
            }

            return SchemaParser.decodeUnknownEffect(markerConfigurationWire)(
              projected,
              options
            )
          },
        })
      ),
  }
)

export type FlowEdgeMarkerConfiguration =
  typeof FlowEdgeMarkerConfigurationSchema.Type

export const FlowEdgeMarkerValueSchema = S.Union([
  S.String,
  FlowEdgeMarkerConfigurationSchema,
])

export type FlowEdgeMarkerValue = typeof FlowEdgeMarkerValueSchema.Type

export const FlowEdgeReconnectableSchema = S.Union([
  S.Boolean,
  S.Literals(['source', 'target']),
])

export type FlowEdgeReconnectable = typeof FlowEdgeReconnectableSchema.Type

export const FlowEdgeStrokeSchema = S.String.check(
  S.isPattern(/^#[0-9a-fA-F]{6}$/u)
)

export const FlowEdgeSchema = S.Struct({
  id: EdgeIdSchema,
  source: NodeIdSchema,
  target: NodeIdSchema,
  type: S.optional(S.NonEmptyString),
  sourceHandle: S.optional(HandleIdSchema),
  targetHandle: S.optional(HandleIdSchema),
  path: S.optional(FlowEdgePathSchema),
  label: S.optional(S.String),
  data: S.optional(S.JsonObject),
  markerStart: S.optional(FlowEdgeMarkerSchema),
  markerEnd: S.optional(FlowEdgeMarkerSchema),
  stroke: S.optional(FlowEdgeStrokeSchema),
  strokeWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
  selected: S.optional(S.Boolean),
  deletable: S.optional(S.Boolean),
  selectable: S.optional(S.Boolean),
  focusable: S.optional(S.Boolean),
  reconnectable: S.optional(FlowEdgeReconnectableSchema),
  interactionWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
  ariaRole: S.optional(S.String),
  ariaLabel: S.optional(S.String),
  hidden: S.optional(S.Boolean),
  zIndex: S.optional(S.Finite),
})

export type FlowEdge = typeof FlowEdgeSchema.Type

export const FlowDocumentSchema = S.Struct({
  edges: S.Array(FlowEdgeSchema),
  nodeOrigin: S.optional(NodeOriginSchema),
  nodes: S.Array(FlowNodeSchema),
})

export type FlowDocument = typeof FlowDocumentSchema.Type

export type FlowIntegrityNode = Pick<
  FlowNode,
  'id' | 'parentId' | 'extent' | 'handles'
>

export type FlowIntegrityEdge = Pick<
  FlowEdge,
  'id' | 'source' | 'target' | 'sourceHandle' | 'targetHandle'
>

export interface FlowIntegrityDocument {
  readonly nodes: readonly FlowIntegrityNode[]
  readonly edges: readonly FlowIntegrityEdge[]
}

export const FlowDocumentIntegrityErrorSchema = S.Union([
  DuplicateNodeId,
  DuplicateEdgeId,
  DuplicateHandleId,
  MissingEdgeEndpoint,
  MissingEdgeHandle,
  MissingParentNode,
  SelfParentNode,
  ParentCycle,
  ParentExtentWithoutParent,
])

export type FlowDocumentIntegrityError =
  typeof FlowDocumentIntegrityErrorSchema.Type

const decodeUnknownFlowDocument = S.decodeUnknownEffect(FlowDocumentSchema)

const indexDocumentNodes = <N extends FlowIntegrityNode>(
  nodes: readonly N[]
):
  | { readonly nodesById: ReadonlyMap<NodeId, N> }
  | {
      readonly nodesById: ReadonlyMap<NodeId, N>
      readonly error: DuplicateNodeId
    } => {
  const nodesById = new Map<NodeId, N>()

  for (const node of nodes) {
    if (nodesById.has(node.id)) {
      return { nodesById, error: new DuplicateNodeId({ nodeId: node.id }) }
    }

    nodesById.set(node.id, node)
  }

  return { nodesById }
}

const findParentReferenceError = (
  nodes: readonly FlowIntegrityNode[],
  nodesById: ReadonlyMap<NodeId, FlowIntegrityNode>
): FlowDocumentIntegrityError | undefined => {
  for (const node of nodes) {
    if (node.parentId === undefined) {
      if (node.extent === 'parent') {
        return new ParentExtentWithoutParent({ nodeId: node.id })
      }

      continue
    }

    if (node.parentId === node.id) {
      return new SelfParentNode({ nodeId: node.id })
    }

    if (!nodesById.has(node.parentId)) {
      return new MissingParentNode({ nodeId: node.id, parentId: node.parentId })
    }
  }

  return undefined
}

const findParentCycleError = (
  nodes: readonly FlowIntegrityNode[],
  nodesById: ReadonlyMap<NodeId, FlowIntegrityNode>
): ParentCycle | undefined => {
  const visited = new Set<NodeId>()
  const visiting = new Set<NodeId>()

  const visitParentChain = (nodeId: NodeId): NodeId | undefined => {
    if (visiting.has(nodeId)) {
      return nodeId
    }

    if (visited.has(nodeId)) {
      return
    }

    visiting.add(nodeId)
    const parentId = nodesById.get(nodeId)?.parentId

    const cycleNode =
      parentId === undefined ? undefined : visitParentChain(parentId)

    visiting.delete(nodeId)
    visited.add(nodeId)

    return cycleNode
  }

  for (const node of nodes) {
    const cycleNode = visitParentChain(node.id)

    if (cycleNode !== undefined) {
      return new ParentCycle({ nodeId: cycleNode })
    }
  }

  return undefined
}

const findDuplicateEdgeId = (
  edges: readonly FlowIntegrityEdge[]
): DuplicateEdgeId | undefined => {
  const edgeIds = new Set<EdgeId>()

  for (const edge of edges) {
    if (edgeIds.has(edge.id)) {
      return new DuplicateEdgeId({ edgeId: edge.id })
    }

    edgeIds.add(edge.id)
  }

  return undefined
}

const findDuplicateHandleId = (
  nodes: readonly FlowIntegrityNode[]
): DuplicateHandleId | undefined => {
  for (const node of nodes) {
    const handleIds = new Set<string>()

    for (const handle of node.handles ?? []) {
      if (handleIds.has(handle.id)) {
        return new DuplicateHandleId({ handleId: handle.id, nodeId: node.id })
      }

      handleIds.add(handle.id)
    }
  }

  return undefined
}

type EndpointHandlePolicy =
  | { readonly kind: 'physical-id' }
  | { readonly kind: 'canonical-kind' }

const findEdgeReferenceError = (
  edges: readonly FlowIntegrityEdge[],
  nodesById: ReadonlyMap<NodeId, FlowIntegrityNode>,
  policy: EndpointHandlePolicy
): FlowDocumentIntegrityError | undefined => {
  for (const edge of edges) {
    if (!nodesById.has(edge.source)) {
      return new MissingEdgeEndpoint({
        edgeId: edge.id,
        endpoint: 'source',
        nodeId: edge.source,
      })
    }

    if (!nodesById.has(edge.target)) {
      return new MissingEdgeEndpoint({
        edgeId: edge.id,
        endpoint: 'target',
        nodeId: edge.target,
      })
    }

    for (const endpoint of ['source', 'target'] as const) {
      const handleId =
        endpoint === 'source' ? edge.sourceHandle : edge.targetHandle

      if (handleId === undefined) {
        continue
      }

      const nodeId = edge[endpoint]
      const node = nodesById.get(nodeId)

      const handle = node?.handles?.find(
        (candidate) => candidate.id === handleId
      )

      if (
        handle === undefined ||
        (policy.kind === 'canonical-kind' && handle.kind !== endpoint)
      ) {
        return new MissingEdgeHandle({
          edgeId: edge.id,
          endpoint,
          handleId,
          nodeId,
        })
      }
    }
  }

  return undefined
}

const findDocumentIntegrityError = (
  document: FlowIntegrityDocument,
  policy: EndpointHandlePolicy
): FlowDocumentIntegrityError | undefined => {
  const nodeIndex = indexDocumentNodes(document.nodes)

  if ('error' in nodeIndex) {
    return nodeIndex.error
  }

  const { nodesById } = nodeIndex

  return (
    findParentReferenceError(document.nodes, nodesById) ??
    findParentCycleError(document.nodes, nodesById) ??
    findDuplicateEdgeId(document.edges) ??
    findDuplicateHandleId(document.nodes) ??
    findEdgeReferenceError(document.edges, nodesById, policy)
  )
}

const integrityAttributes = (error: FlowDocumentIntegrityError) =>
  Match.value(error).pipe(
    Match.tagsExhaustive({
      DuplicateNodeId: (duplicate) => ({
        [FlowAttribute.documentIssue]: 'duplicate-node-id',
        [FlowAttribute.nodeId]: duplicate.nodeId,
      }),
      DuplicateEdgeId: (duplicate) => ({
        [FlowAttribute.documentIssue]: 'duplicate-edge-id',
        [FlowAttribute.edgeId]: duplicate.edgeId,
      }),
      DuplicateHandleId: (duplicate) => ({
        [FlowAttribute.documentIssue]: 'duplicate-handle-id',
        [FlowAttribute.nodeId]: duplicate.nodeId,
        [FlowAttribute.handleId]: duplicate.handleId,
      }),
      MissingEdgeEndpoint: (missing) => ({
        [FlowAttribute.documentIssue]: 'missing-edge-endpoint',
        [FlowAttribute.edgeId]: missing.edgeId,
        [FlowAttribute.edgeEndpoint]: missing.endpoint,
        [FlowAttribute.nodeId]: missing.nodeId,
      }),
      MissingEdgeHandle: (missing) => ({
        [FlowAttribute.documentIssue]: 'missing-edge-handle',
        [FlowAttribute.edgeId]: missing.edgeId,
        [FlowAttribute.edgeEndpoint]: missing.endpoint,
        [FlowAttribute.nodeId]: missing.nodeId,
        [FlowAttribute.handleId]: missing.handleId,
      }),
      MissingParentNode: (missing) => ({
        [FlowAttribute.documentIssue]: `missing-parent-node:${missing.parentId}`,
        [FlowAttribute.nodeId]: missing.nodeId,
      }),
      SelfParentNode: (invalid) => ({
        [FlowAttribute.documentIssue]: 'self-parent-node',
        [FlowAttribute.nodeId]: invalid.nodeId,
      }),
      ParentCycle: (invalid) => ({
        [FlowAttribute.documentIssue]: 'parent-cycle',
        [FlowAttribute.nodeId]: invalid.nodeId,
      }),
      ParentExtentWithoutParent: (invalid) => ({
        [FlowAttribute.documentIssue]: 'parent-extent-without-parent',
        [FlowAttribute.nodeId]: invalid.nodeId,
      }),
    })
  )

const validateDocumentWithPolicy = <D extends FlowIntegrityDocument>(
  document: D,
  policy: EndpointHandlePolicy
): Effect.Effect<D, FlowDocumentIntegrityError> =>
  Effect.gen(function* validateDocumentIntegrity() {
    const error = findDocumentIntegrityError(document, policy)

    if (error === undefined) {
      return document
    }

    const attributes = integrityAttributes(error)
    yield* Effect.logWarning('Rejected flow document integrity').pipe(
      Effect.annotateLogs(attributes)
    )
    yield* Effect.annotateCurrentSpan(attributes)

    return yield* error
  }).pipe(Effect.withSpan(FlowSpan.documentIntegrity))

export const validateFlowGraphDocument = <D extends FlowIntegrityDocument>(
  document: D
): Effect.Effect<D, FlowDocumentIntegrityError> =>
  validateDocumentWithPolicy(document, { kind: 'physical-id' })

export const validateFlowDocument = (
  document: FlowDocument
): Effect.Effect<FlowDocument, FlowDocumentIntegrityError> =>
  validateDocumentWithPolicy(document, { kind: 'physical-id' })

export type FlowDocumentInput = Parameters<typeof decodeUnknownFlowDocument>[0]

const decodeDocumentWithPolicy = (
  input: FlowDocumentInput,
  policy: EndpointHandlePolicy
) =>
  decodeUnknownFlowDocument(input).pipe(
    Effect.flatMap((document) => validateDocumentWithPolicy(document, policy)),
    Effect.tap((document) =>
      Effect.gen(function* annotateDecodedDocument() {
        const attributes = {
          [FlowAttribute.nodeCount]: document.nodes.length,
          [FlowAttribute.edgeCount]: document.edges.length,
        }

        yield* Effect.annotateCurrentSpan(attributes)
        yield* Effect.logDebug('Decoded flow document').pipe(
          Effect.annotateLogs(attributes)
        )
      })
    ),
    Effect.withSpan(FlowSpan.documentDecode)
  )

export const decodeFlowDocument = (input: FlowDocumentInput) =>
  decodeDocumentWithPolicy(input, { kind: 'physical-id' })

/** Internal persistence boundary; literal1 retains the frozen ordered kind policy. */
export const decodeLegacyFlowDocument = (input: FlowDocumentInput) =>
  decodeDocumentWithPolicy(input, { kind: 'canonical-kind' })
