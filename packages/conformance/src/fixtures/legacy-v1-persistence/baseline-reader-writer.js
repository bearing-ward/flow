// @bun
// packages/core/src/domain/flow-persistence.ts
import { Effect as Effect6, Schema as S14 } from 'effect'
// packages/core/src/domain/flow-runtime.schema.ts
import { Effect as Effect5, Schema as S12 } from 'effect'
// packages/core/src/domain/flow-connection.schema.ts
import { Effect, Schema as S2 } from 'effect'

// packages/core/src/telemetry/flow-telemetry.ts
var FlowSpan = {
  browserLifecycleClose: 'flow.browser.lifecycle.close',
  browserPointerCapture: 'flow.browser.pointer-capture',
  browserResizeObserverAcquire: 'flow.browser.resize-observer.acquire',
  controllerDispatch: 'flow.controller.dispatch',
  controllerUpdate: 'flow.controller.update',
  connectionComplete: 'flow.connection.complete',
  connectionStart: 'flow.connection.start',
  connectionValidate: 'flow.connection.validate',
  edgeSelection: 'flow.edge.selection',
  nodeSelection: 'flow.node.selection',
  selectionSet: 'flow.selection.set',
  selectionRectStart: 'flow.selection.rect.start',
  edgeRemove: 'flow.edge.remove',
  editPrepare: 'flow.edit.prepare',
  editFailure: 'flow.edit.failure',
  edgeReconnectStart: 'flow.edge.reconnect.start',
  edgeReconnectComplete: 'flow.edge.reconnect.complete',
  documentDecode: 'flow.document.decode',
  documentIntegrity: 'flow.document.integrity',
  domReconcile: 'flow.dom.reconcile',
  geometryMeasure: 'flow.geometry.measure',
  gestureCancel: 'flow.gesture.cancel',
  hostDestroy: 'flow.host.destroy',
  hostMount: 'flow.host.mount',
  nodeDragComplete: 'flow.node.drag.complete',
  nodeDragStart: 'flow.node.drag.start',
  viewportPanComplete: 'flow.viewport.pan.complete',
  viewportPanStart: 'flow.viewport.pan.start',
  viewportUpdate: 'flow.viewport.update',
  viewportZoom: 'flow.viewport.zoom',
}
var FlowAttribute = {
  browserCapability: 'flow.browser.capability',
  browserOperation: 'flow.browser.operation',
  cancellationReason: 'flow.cancellation.reason',
  changeKind: 'flow.change.kind',
  controlMode: 'flow.control.mode',
  documentIssue: 'flow.document.issue',
  failureName: 'flow.failure.name',
  failureMessage: 'flow.failure.message',
  edgeCount: 'flow.edge.count',
  edgeEndpoint: 'flow.edge.endpoint',
  edgeId: 'flow.edge.id',
  edgeSelected: 'flow.edge.selected',
  nodeSelected: 'flow.node.selected',
  edgesAdded: 'flow.edges.added',
  edgesUpdated: 'flow.edges.updated',
  edgesRemoved: 'flow.edges.removed',
  edgesDeferred: 'flow.edges.deferred',
  handleId: 'flow.handle.id',
  connectionIssue: 'flow.connection.issue',
  connectionTargetNodeId: 'flow.connection.target.node.id',
  connectionTargetHandleId: 'flow.connection.target.handle.id',
  inputKind: 'flow.input.kind',
  editOperationCount: 'flow.edit.operation.count',
  measurementCount: 'flow.measurement.count',
  nodeCount: 'flow.node.count',
  nodeId: 'flow.node.id',
  nodesAdded: 'flow.nodes.added',
  nodesRemoved: 'flow.nodes.removed',
  nodesUpdated: 'flow.nodes.updated',
  pointerId: 'flow.pointer.id',
  positionX: 'flow.position.x',
  positionY: 'flow.position.y',
  viewportX: 'flow.viewport.x',
  viewportY: 'flow.viewport.y',
  viewportZoom: 'flow.viewport.zoom',
  viewportZoomClamped: 'flow.viewport.zoom.clamped',
}

// packages/core/src/domain/flow-values.ts
import { Schema as S } from 'effect'
var NodeIdSchema = S.NonEmptyString.pipe(S.brand('NodeId'))
var EdgeIdSchema = S.NonEmptyString.pipe(S.brand('EdgeId'))
var HandleIdSchema = S.NonEmptyString.pipe(S.brand('HandleId'))
var XYPositionSchema = S.Struct({
  x: S.Number,
  y: S.Number,
})

// packages/core/src/domain/flow-connection.schema.ts
var ActiveConnectionSchema = S2.Struct({
  pointerId: S2.Number,
  source: NodeIdSchema,
  sourceHandle: HandleIdSchema,
})
var ActiveClickConnectionSchema = S2.Struct({
  source: NodeIdSchema,
  sourceHandle: HandleIdSchema,
})
var ConnectionModeSchema = S2.Literals(['strict', 'loose'])
var FlowConnectionSchema = S2.Struct({
  source: NodeIdSchema,
  sourceHandle: HandleIdSchema,
  target: NodeIdSchema,
  targetHandle: HandleIdSchema,
})
var ConnectionIssueSchema = S2.Literals([
  'missing-source-node',
  'missing-target-node',
  'missing-source-handle',
  'missing-target-handle',
  'duplicate-connection',
  'same-handle',
  'unsupported-handle-combination',
])
var tagged = S2.TaggedError

class InvalidFlowConnection extends tagged()('InvalidFlowConnection', {
  reason: ConnectionIssueSchema,
  source: NodeIdSchema,
  sourceHandle: HandleIdSchema,
  target: NodeIdSchema,
  targetHandle: HandleIdSchema,
}) {}

// packages/core/src/domain/flow-edit.schema.ts
import { Schema as S4 } from 'effect'
// packages/core/src/domain/flow.schema.ts
import { Effect as Effect2, Match, Schema as S3 } from 'effect'
// packages/core/src/domain/duplicate-edge-id.ts
import { Schema } from 'effect'
var tagged2 = Schema.TaggedError

class DuplicateEdgeId extends tagged2()('DuplicateEdgeId', {
  edgeId: EdgeIdSchema,
}) {}

// packages/core/src/domain/duplicate-handle-id.ts
import { Schema as Schema2 } from 'effect'
var tagged3 = Schema2.TaggedError

class DuplicateHandleId extends tagged3()('DuplicateHandleId', {
  handleId: HandleIdSchema,
  nodeId: NodeIdSchema,
}) {}

// packages/core/src/domain/duplicate-node-id.ts
import { Schema as Schema3 } from 'effect'
var tagged4 = Schema3.TaggedError

class DuplicateNodeId extends tagged4()('DuplicateNodeId', {
  nodeId: NodeIdSchema,
}) {}

// packages/core/src/domain/missing-edge-endpoint.ts
import { Schema as Schema4 } from 'effect'
var tagged5 = Schema4.TaggedError

class MissingEdgeEndpoint extends tagged5()('MissingEdgeEndpoint', {
  edgeId: EdgeIdSchema,
  endpoint: Schema4.Literals(['source', 'target']),
  nodeId: NodeIdSchema,
}) {}

// packages/core/src/domain/missing-edge-handle.ts
import { Schema as Schema5 } from 'effect'
var tagged6 = Schema5.TaggedError

class MissingEdgeHandle extends tagged6()('MissingEdgeHandle', {
  edgeId: EdgeIdSchema,
  endpoint: Schema5.Literals(['source', 'target']),
  handleId: HandleIdSchema,
  nodeId: NodeIdSchema,
}) {}

// packages/core/src/domain/missing-parent-node.ts
import { Schema as Schema6 } from 'effect'
var tagged7 = Schema6.TaggedError

class MissingParentNode extends tagged7()('MissingParentNode', {
  nodeId: NodeIdSchema,
  parentId: NodeIdSchema,
}) {}

// packages/core/src/domain/parent-cycle.ts
import { Schema as Schema7 } from 'effect'
var tagged8 = Schema7.TaggedError

class ParentCycle extends tagged8()('ParentCycle', {
  nodeId: NodeIdSchema,
}) {}

// packages/core/src/domain/parent-extent-without-parent.ts
import { Schema as Schema8 } from 'effect'
var tagged9 = Schema8.TaggedError

class ParentExtentWithoutParent extends tagged9()('ParentExtentWithoutParent', {
  nodeId: NodeIdSchema,
}) {}

// packages/core/src/domain/self-parent-node.ts
import { Schema as Schema9 } from 'effect'
var tagged10 = Schema9.TaggedError

class SelfParentNode extends tagged10()('SelfParentNode', {
  nodeId: NodeIdSchema,
}) {}

// packages/core/src/domain/flow.schema.ts
var FlowHandleSchema = S3.Struct({
  id: HandleIdSchema,
  kind: S3.Literals(['source', 'target']),
  side: S3.Literals(['top', 'right', 'bottom', 'left']),
})
var NodeSizeSchema = S3.Struct({
  width: S3.Finite.check(S3.isGreaterThan(0)),
  height: S3.Finite.check(S3.isGreaterThan(0)),
})
var FlowNodeSchema = S3.Struct({
  id: NodeIdSchema,
  label: S3.String,
  position: XYPositionSchema,
  parentId: S3.optional(NodeIdSchema),
  type: S3.optional(S3.NonEmptyString),
  data: S3.optional(S3.JsonObject),
  zIndex: S3.optional(S3.Finite),
  size: S3.optional(NodeSizeSchema),
  extent: S3.optional(S3.Literals(['parent'])),
  handles: S3.optional(S3.Array(FlowHandleSchema)),
  selected: S3.optional(S3.Boolean),
  selectable: S3.optional(S3.Boolean),
  focusable: S3.optional(S3.Boolean),
  draggable: S3.optional(S3.Boolean),
  deletable: S3.optional(S3.Boolean),
  ariaLabel: S3.optional(S3.NonEmptyString),
  ariaDescription: S3.optional(S3.NonEmptyString),
  hidden: S3.optional(S3.Boolean),
})
var FlowEdgePathSchema = S3.Literals([
  'straight',
  'bezier',
  'step',
  'smoothstep',
  'simplebezier',
])
var FlowEdgeMarkerSchema = S3.Literals(['arrow', 'arrowclosed'])
var FlowEdgeReconnectableSchema = S3.Union([
  S3.Boolean,
  S3.Literals(['source', 'target']),
])
var FlowEdgeStrokeSchema = S3.String.check(S3.isPattern(/^#[0-9a-fA-F]{6}$/u))
var FlowEdgeSchema = S3.Struct({
  id: EdgeIdSchema,
  source: NodeIdSchema,
  target: NodeIdSchema,
  type: S3.optional(S3.NonEmptyString),
  sourceHandle: S3.optional(HandleIdSchema),
  targetHandle: S3.optional(HandleIdSchema),
  path: S3.optional(FlowEdgePathSchema),
  label: S3.optional(S3.String),
  data: S3.optional(S3.JsonObject),
  markerStart: S3.optional(FlowEdgeMarkerSchema),
  markerEnd: S3.optional(FlowEdgeMarkerSchema),
  stroke: S3.optional(FlowEdgeStrokeSchema),
  strokeWidth: S3.optional(S3.Finite.check(S3.isGreaterThan(0))),
  selected: S3.optional(S3.Boolean),
  deletable: S3.optional(S3.Boolean),
  selectable: S3.optional(S3.Boolean),
  focusable: S3.optional(S3.Boolean),
  reconnectable: S3.optional(FlowEdgeReconnectableSchema),
  interactionWidth: S3.optional(S3.Finite.check(S3.isGreaterThan(0))),
  ariaLabel: S3.optional(S3.NonEmptyString),
  hidden: S3.optional(S3.Boolean),
  zIndex: S3.optional(S3.Finite),
})
var FlowDocumentSchema = S3.Struct({
  edges: S3.Array(FlowEdgeSchema),
  nodes: S3.Array(FlowNodeSchema),
})
var FlowDocumentIntegrityErrorSchema = S3.Union([
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
var decodeUnknownFlowDocument = S3.decodeUnknownEffect(FlowDocumentSchema)
var indexDocumentNodes = (nodes) => {
  const nodesById = new Map()
  for (const node of nodes) {
    if (nodesById.has(node.id)) {
      return { nodesById, error: new DuplicateNodeId({ nodeId: node.id }) }
    }
    nodesById.set(node.id, node)
  }
  return { nodesById }
}
var findParentReferenceError = (nodes, nodesById) => {
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
  return
}
var findParentCycleError = (nodes, nodesById) => {
  const visited = new Set()
  const visiting = new Set()
  const visitParentChain = (nodeId) => {
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
  return
}
var findDuplicateEdgeId = (edges) => {
  const edgeIds = new Set()
  for (const edge of edges) {
    if (edgeIds.has(edge.id)) {
      return new DuplicateEdgeId({ edgeId: edge.id })
    }
    edgeIds.add(edge.id)
  }
  return
}
var findDuplicateHandleId = (nodes) => {
  for (const node of nodes) {
    const handleIds = new Set()
    for (const handle of node.handles ?? []) {
      if (handleIds.has(handle.id)) {
        return new DuplicateHandleId({ handleId: handle.id, nodeId: node.id })
      }
      handleIds.add(handle.id)
    }
  }
  return
}
var findEdgeReferenceError = (edges, nodesById) => {
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
    for (const endpoint of ['source', 'target']) {
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
      if (handle?.kind !== endpoint) {
        return new MissingEdgeHandle({
          edgeId: edge.id,
          endpoint,
          handleId,
          nodeId,
        })
      }
    }
  }
  return
}
var findDocumentIntegrityError = (document) => {
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
    findEdgeReferenceError(document.edges, nodesById)
  )
}
var integrityAttributes = (error) =>
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
var validateFlowDocument = (document) =>
  Effect2.gen(function* validateDocumentIntegrity() {
    const error = findDocumentIntegrityError(document)
    if (error === undefined) {
      return document
    }
    const attributes = integrityAttributes(error)
    yield* Effect2.logWarning('Rejected flow document integrity').pipe(
      Effect2.annotateLogs(attributes)
    )
    yield* Effect2.annotateCurrentSpan(attributes)
    return yield* error
  }).pipe(Effect2.withSpan(FlowSpan.documentIntegrity))
var decodeFlowDocument = (input) =>
  decodeUnknownFlowDocument(input).pipe(
    Effect2.flatMap(validateFlowDocument),
    Effect2.tap((document) =>
      Effect2.gen(function* annotateDecodedDocument() {
        const attributes = {
          [FlowAttribute.nodeCount]: document.nodes.length,
          [FlowAttribute.edgeCount]: document.edges.length,
        }
        yield* Effect2.annotateCurrentSpan(attributes)
        yield* Effect2.logDebug('Decoded flow document').pipe(
          Effect2.annotateLogs(attributes)
        )
      })
    ),
    Effect2.withSpan(FlowSpan.documentDecode)
  )

// packages/core/src/domain/flow-edit.schema.ts
var SetNodesEditSchema = S4.Struct({
  kind: S4.Literal('set-nodes'),
  nodes: S4.Array(FlowNodeSchema),
})
var AddNodesEditSchema = S4.Struct({
  kind: S4.Literal('add-nodes'),
  nodes: S4.Array(FlowNodeSchema),
})
var SetEdgesEditSchema = S4.Struct({
  kind: S4.Literal('set-edges'),
  edges: S4.Array(FlowEdgeSchema),
})
var AddEdgesEditSchema = S4.Struct({
  kind: S4.Literal('add-edges'),
  edges: S4.Array(FlowEdgeSchema),
})
var UpdateNodeEditSchema = S4.Struct({
  kind: S4.Literal('update-node'),
  nodeId: NodeIdSchema,
  patch: S4.JsonObject,
  replace: S4.optional(S4.Boolean),
})
var UpdateEdgeEditSchema = S4.Struct({
  kind: S4.Literal('update-edge'),
  edgeId: EdgeIdSchema,
  patch: S4.JsonObject,
  replace: S4.optional(S4.Boolean),
})
var UpdateNodeDataEditSchema = S4.Struct({
  kind: S4.Literal('update-node-data'),
  nodeId: NodeIdSchema,
  data: S4.JsonObject,
  replace: S4.optional(S4.Boolean),
})
var UpdateEdgeDataEditSchema = S4.Struct({
  kind: S4.Literal('update-edge-data'),
  edgeId: EdgeIdSchema,
  data: S4.JsonObject,
  replace: S4.optional(S4.Boolean),
})
var DeleteElementsEditSchema = S4.Struct({
  kind: S4.Literal('delete-elements'),
  nodeIds: S4.optional(S4.Array(NodeIdSchema)),
  edgeIds: S4.optional(S4.Array(EdgeIdSchema)),
})
var FlowEditOperationSchema = S4.Union([
  SetNodesEditSchema,
  AddNodesEditSchema,
  SetEdgesEditSchema,
  AddEdgesEditSchema,
  UpdateNodeEditSchema,
  UpdateEdgeEditSchema,
  UpdateNodeDataEditSchema,
  UpdateEdgeDataEditSchema,
  DeleteElementsEditSchema,
])
var FlowEditTransactionSchema = S4.Struct({
  operations: S4.Array(FlowEditOperationSchema),
})
var FlowDeleteResultSchema = S4.Struct({
  deletedNodeIds: S4.Array(NodeIdSchema),
  deletedEdgeIds: S4.Array(EdgeIdSchema),
})
var FlowEditResultSchema = S4.Struct({
  document: S4.Struct({
    nodes: S4.Array(FlowNodeSchema),
    edges: S4.Array(FlowEdgeSchema),
  }),
  deletion: FlowDeleteResultSchema,
})

// packages/core/src/domain/flow-edit.ts
import { Effect as Effect3, Schema as S6 } from 'effect'
// packages/core/src/domain/flow-delete.schema.ts
import { Schema as S5 } from 'effect'
var FlowDeleteCandidateSchema = S5.Struct({
  nodes: S5.Array(FlowNodeSchema),
  edges: S5.Array(FlowEdgeSchema),
})
var FlowDeleteDecisionSchema = S5.Union([S5.Boolean, FlowDeleteCandidateSchema])
var FlowDeleteRequestSchema = S5.Struct({
  operationId: S5.String,
  baseRevision: S5.Int.check(S5.isGreaterThanOrEqualTo(0)),
  nodeIds: S5.Array(S5.String),
  edgeIds: S5.Array(S5.String),
})
var FlowDeleteApprovalResponseSchema = S5.Union([
  S5.Struct({
    kind: S5.Literal('approved'),
    operationId: S5.String,
    baseRevision: S5.Int.check(S5.isGreaterThanOrEqualTo(0)),
    decision: FlowDeleteDecisionSchema,
  }),
  S5.Struct({ kind: S5.Literal('cancelled'), operationId: S5.String }),
  S5.Struct({
    kind: S5.Literal('failed'),
    operationId: S5.String,
    reason: S5.String,
  }),
])

// packages/core/src/domain/flow-edit-error.ts
import { Schema as Schema16 } from 'effect'
// packages/core/src/domain/flow-delete-approval-failed-error.ts
import { Schema as Schema10 } from 'effect'
var tagged11 = Schema10.TaggedError

class FlowDeleteApprovalFailed extends tagged11()('FlowDeleteApprovalFailed', {
  operationId: Schema10.String,
  reason: Schema10.String,
}) {}
// packages/core/src/domain/flow-delete-cancelled-error.ts
import { Schema as Schema11 } from 'effect'
var tagged12 = Schema11.TaggedError

class FlowDeleteCancelled extends tagged12()('FlowDeleteCancelled', {
  operationId: Schema11.String,
}) {}
// packages/core/src/domain/flow-delete-in-progress-error.ts
import { Schema as Schema12 } from 'effect'
var tagged13 = Schema12.TaggedError

class FlowDeleteInProgress extends tagged13()('FlowDeleteInProgress', {
  operationId: Schema12.String,
}) {}
// packages/core/src/domain/flow-delete-invalid-candidate-error.ts
import { Schema as Schema13 } from 'effect'
var tagged14 = Schema13.TaggedError

class FlowDeleteInvalidCandidate extends tagged14()(
  'FlowDeleteInvalidCandidate',
  {
    operationId: Schema13.String,
    nodeIds: Schema13.Array(NodeIdSchema),
    edgeIds: Schema13.Array(EdgeIdSchema),
  }
) {}
// packages/core/src/domain/flow-delete-revision-error.ts
import { Schema as Schema14 } from 'effect'
var tagged15 = Schema14.TaggedError

class FlowDeleteRevisionConflict extends tagged15()(
  'FlowDeleteRevisionConflict',
  {
    operationId: Schema14.String,
    expectedRevision: Schema14.Finite,
    actualRevision: Schema14.Finite,
  }
) {}
// packages/core/src/domain/flow-edit-disposed-error.ts
import { Schema as Schema15 } from 'effect'
var tagged16 = Schema15.TaggedError

class FlowEditDisposed extends tagged16()('FlowEditDisposed', {}) {}

// packages/core/src/domain/flow-edit-error.ts
var tagged17 = Schema16.TaggedError

class ProtectedDeletionConflict extends tagged17()(
  'ProtectedDeletionConflict',
  {
    nodeIds: Schema16.Array(NodeIdSchema),
    edgeIds: Schema16.Array(EdgeIdSchema),
  }
) {}
var FlowEditDisposedSchema = FlowEditDisposed
var FlowEditErrorSchema = Schema16.Union([
  ProtectedDeletionConflict,
  FlowDeleteRevisionConflict,
  FlowDeleteInvalidCandidate,
  FlowDeleteInProgress,
  FlowDeleteCancelled,
  FlowDeleteApprovalFailed,
  FlowEditDisposedSchema,
  FlowDocumentIntegrityErrorSchema,
])

// packages/core/src/domain/flow-node-extent.schema.ts
import { Schema as S8 } from 'effect'
// packages/core/src/domain/flow-pan-extent.schema.ts
import { Schema as S7 } from 'effect'
var PanExtentSchema = S7.Struct({
  minX: S7.Finite,
  minY: S7.Finite,
  maxX: S7.Finite,
  maxY: S7.Finite,
}).check(
  S7.makeFilter((extent) =>
    extent.minX <= extent.maxX && extent.minY <= extent.maxY
      ? undefined
      : 'pan extent minimums must be less than or equal to maximums'
  )
)

// packages/core/src/domain/flow-node-extent.schema.ts
var NodeExtentSchema = PanExtentSchema
var NodeDimensionsSchema = S8.Struct({
  width: S8.Finite.check(S8.isGreaterThanOrEqualTo(0)),
  height: S8.Finite.check(S8.isGreaterThanOrEqualTo(0)),
})
var NodeExtentItemSchema = S8.Struct({
  position: XYPositionSchema,
  ...NodeDimensionsSchema.fields,
})

// packages/core/src/domain/flow-reconnection.schema.ts
import { Effect as Effect4, Schema as S10 } from 'effect'
// packages/core/src/domain/flow-edge.schema.ts
import { Schema as S9 } from 'effect'
var MeasuredHandleSchema = S9.Struct({
  nodeId: NodeIdSchema,
  handleId: HandleIdSchema,
  offset: XYPositionSchema,
  width: S9.Finite.check(S9.isGreaterThanOrEqualTo(0)),
  height: S9.Finite.check(S9.isGreaterThanOrEqualTo(0)),
})

// packages/core/src/domain/flow-reconnection.schema.ts
var ReconnectEndpointSchema = S10.Literals(['source', 'target'])
var ActiveEdgeReconnectSchema = S10.Struct({
  edgeId: EdgeIdSchema,
  endpoint: ReconnectEndpointSchema,
  pointerId: S10.Number,
})

// packages/core/src/domain/flow-snap-grid.schema.ts
import { Schema as S11 } from 'effect'
var SnapGridSchema = S11.Struct({
  x: S11.Finite.check(S11.isGreaterThan(0)),
  y: S11.Finite.check(S11.isGreaterThan(0)),
})

// packages/core/src/domain/flow-runtime.schema.ts
var FlowControlModeSchema = S12.Literals(['controlled', 'uncontrolled'])
var ViewportSchema = S12.Struct({
  x: S12.Number,
  y: S12.Number,
  zoom: S12.Finite.check(S12.isGreaterThan(0)),
})
var ViewportLimitsSchema = S12.Struct({
  maxZoom: S12.Finite.check(S12.isGreaterThan(0)),
  minZoom: S12.Finite.check(S12.isGreaterThan(0)),
}).check(
  S12.makeFilter((limits) =>
    limits.minZoom <= limits.maxZoom
      ? undefined
      : 'minZoom must be less than or equal to maxZoom'
  )
)
var MeasuredNodeSchema = S12.Struct({
  height: S12.Finite.check(S12.isGreaterThanOrEqualTo(0)),
  nodeId: NodeIdSchema,
  width: S12.Finite.check(S12.isGreaterThanOrEqualTo(0)),
})
var ActiveNodeDragSchema = S12.Struct({
  nodeId: NodeIdSchema,
  pointerId: S12.Number,
  pointerOffset: XYPositionSchema,
})
var ActiveNodeGroupDragSchema = S12.Struct({
  anchorNodeId: NodeIdSchema,
  pointerId: S12.Number,
  pointerStart: XYPositionSchema,
  positions: S12.Array(
    S12.Struct({ nodeId: NodeIdSchema, position: XYPositionSchema })
  ),
})
var ActiveViewportPanSchema = S12.Struct({
  pointerId: S12.Number,
  pointerStart: XYPositionSchema,
  viewportStart: ViewportSchema,
})
var ActivePinchSchema = S12.Struct({
  firstPointerId: S12.Number,
  secondPointerId: S12.Number,
  firstStart: XYPositionSchema,
  secondStart: XYPositionSchema,
  viewportStart: ViewportSchema,
})
var ActiveSelectionRectSchema = S12.Struct({
  pointerId: S12.Number,
  pointerStart: XYPositionSchema,
  flowStart: XYPositionSchema,
})
var NodeResizeDirectionSchema = S12.Literals([
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left',
])
var ActiveNodeResizeSchema = S12.Struct({
  direction: NodeResizeDirectionSchema,
  nodeId: NodeIdSchema,
  positionStart: XYPositionSchema,
  pointerId: S12.Number,
  pointerStart: XYPositionSchema,
  sizeStart: NodeSizeSchema,
})
var FlowInteractionSessionSchema = S12.Union([
  S12.Struct({
    kind: S12.Literal('node-drag'),
    phase: S12.Literals(['pressed', 'active']),
    drag: S12.Union([ActiveNodeDragSchema, ActiveNodeGroupDragSchema]),
  }),
  S12.Struct({
    kind: S12.Literal('connection'),
    connection: ActiveConnectionSchema,
  }),
  S12.Struct({
    kind: S12.Literal('reconnection'),
    reconnection: ActiveEdgeReconnectSchema,
  }),
  S12.Struct({ kind: S12.Literal('pane-pan'), pan: ActiveViewportPanSchema }),
  S12.Struct({ kind: S12.Literal('pinch'), pinch: ActivePinchSchema }),
  S12.Struct({
    kind: S12.Literal('selection'),
    selection: ActiveSelectionRectSchema,
  }),
  S12.Struct({
    kind: S12.Literal('node-resize'),
    resize: ActiveNodeResizeSchema,
  }),
])
var pointerIdsForSession = (session) => {
  switch (session.kind) {
    case 'node-drag': {
      return [session.drag.pointerId]
    }
    case 'connection': {
      return [session.connection.pointerId]
    }
    case 'reconnection': {
      return [session.reconnection.pointerId]
    }
    case 'pane-pan': {
      return [session.pan.pointerId]
    }
    case 'pinch': {
      return [session.pinch.firstPointerId, session.pinch.secondPointerId]
    }
    case 'selection': {
      return [session.selection.pointerId]
    }
    case 'node-resize': {
      return [session.resize.pointerId]
    }
    default: {
      const exhaustive = session
      return exhaustive
    }
  }
}
var FlowInteractionSessionsSchema = S12.Array(
  FlowInteractionSessionSchema
).check(
  S12.makeFilter((sessions) => {
    const owned = sessions.flatMap(pointerIdsForSession)
    return new Set(owned).size === owned.length
      ? undefined
      : 'A pointer id can belong to only one interaction session'
  })
)
var NodePositionChangeSchema = S12.Struct({
  kind: S12.Literal('node-position'),
  nodeId: NodeIdSchema,
  position: XYPositionSchema,
})
var NodePositionsChangeSchema = S12.Struct({
  kind: S12.Literal('node-positions'),
  positions: S12.Array(
    S12.Struct({ nodeId: NodeIdSchema, position: XYPositionSchema })
  ),
})
var NodeSizeChangeSchema = S12.Struct({
  kind: S12.Literal('node-size'),
  nodeId: NodeIdSchema,
  size: NodeSizeSchema,
})
var NodeBoundsChangeSchema = S12.Struct({
  kind: S12.Literal('node-bounds'),
  nodeId: NodeIdSchema,
  position: XYPositionSchema,
  size: NodeSizeSchema,
  childPositions: S12.Array(
    S12.Struct({ nodeId: NodeIdSchema, position: XYPositionSchema })
  ),
}).check(
  S12.makeFilter((change) =>
    new Set(change.childPositions.map((item) => item.nodeId)).size ===
    change.childPositions.length
      ? undefined
      : 'childPositions must not contain duplicate node ids'
  )
)
var FinitePositionSchema = S12.Struct({ x: S12.Finite, y: S12.Finite })
var NodeResizeCalculationInputSchema = S12.Struct({
  direction: NodeResizeDirectionSchema,
  positionStart: FinitePositionSchema,
  sizeStart: NodeSizeSchema,
  delta: FinitePositionSchema,
  minimumSize: NodeSizeSchema,
  bounds: S12.optional(NodeExtentSchema),
})
var NodeResizeBoundsIssueSchema = S12.Literals([
  'minimum-exceeds-bounds',
  'stationary-edge-outside-bounds',
  'unresized-axis-outside-bounds',
])
var NodeResizeCalculationSchema = S12.Struct({
  position: FinitePositionSchema,
  size: NodeSizeSchema,
  positionDelta: FinitePositionSchema,
  childrenPositionDelta: FinitePositionSchema,
  boundsIssues: S12.Array(NodeResizeBoundsIssueSchema),
})
var ViewportChangeSchema = S12.Struct({
  kind: S12.Literal('viewport'),
  viewport: ViewportSchema,
})
var EdgeAddChangeSchema = S12.Struct({
  kind: S12.Literal('edge-add'),
  edge: FlowEdgeSchema,
})
var EdgeSelectionChangeSchema = S12.Struct({
  kind: S12.Literal('edge-selection'),
  edgeId: EdgeIdSchema,
  selected: S12.Boolean,
})
var NodeSelectionChangeSchema = S12.Struct({
  kind: S12.Literal('node-selection'),
  nodeId: NodeIdSchema,
  selected: S12.Boolean,
})
var SelectionSetChangeSchema = S12.Struct({
  kind: S12.Literal('selection-set'),
  nodeIds: S12.Array(NodeIdSchema),
  edgeIds: S12.Array(EdgeIdSchema),
})
var EdgeReconnectChangeSchema = S12.Struct({
  kind: S12.Literal('edge-reconnect'),
  edge: FlowEdgeSchema,
})
var EdgeRemoveChangeSchema = S12.Struct({
  kind: S12.Literal('edge-remove'),
  edgeId: EdgeIdSchema,
})
var FlowEditProposalChangeSchema = S12.Struct({
  kind: S12.Literal('edit-proposal'),
  document: FlowDocumentSchema,
  deletion: FlowDeleteResultSchema,
})
var FlowChangeSchema = S12.Union([
  NodePositionChangeSchema,
  NodePositionsChangeSchema,
  NodeSizeChangeSchema,
  NodeBoundsChangeSchema,
  ViewportChangeSchema,
  EdgeAddChangeSchema,
  EdgeSelectionChangeSchema,
  NodeSelectionChangeSchema,
  SelectionSetChangeSchema,
  EdgeReconnectChangeSchema,
  EdgeRemoveChangeSchema,
  FlowEditProposalChangeSchema,
])
var SetNodePositionCommandSchema = S12.Struct({
  kind: S12.Literal('set-node-position'),
  nodeId: NodeIdSchema,
  position: XYPositionSchema,
})
var SetViewportCommandSchema = S12.Struct({
  kind: S12.Literal('set-viewport'),
  viewport: ViewportSchema,
})
var EditTransactionCommandSchema = S12.Struct({
  kind: S12.Literal('edit-transaction'),
  transaction: FlowEditTransactionSchema,
})
var FlowCommandSchema = S12.Union([
  SetNodePositionCommandSchema,
  SetViewportCommandSchema,
  EditTransactionCommandSchema,
])

// packages/core/src/domain/flow-snapshot.ts
import { Predicate, Schema as S13 } from 'effect'
var FlowSnapshotSchema = S13.Struct({
  document: FlowDocumentSchema,
  viewport: ViewportSchema,
})
var FlowStateChangeCauseSchema = S13.Literals([
  'document-update',
  'viewport-update',
  'semantic-change',
])
var FlowStateChangeSchema = S13.Struct({
  previous: FlowSnapshotSchema,
  current: FlowSnapshotSchema,
  cause: FlowStateChangeCauseSchema,
})
var freezeRecursively = (value) => {
  if (
    (!Array.isArray(value) && !Predicate.isObject(value)) ||
    Object.isFrozen(value)
  ) {
    return value
  }
  for (const nested of Object.values(value)) {
    freezeRecursively(nested)
  }
  Object.freeze(value)
  return value
}
var createFlowSnapshot = (document, viewport) => {
  const snapshot = structuredClone({ document, viewport })
  freezeRecursively(snapshot)
  return snapshot
}

// packages/core/src/domain/flow-persistence.ts
var SavedFlowNodeSchema = FlowNodeSchema.mapFields(
  ({ selected: _selected, ...fields }) => fields
)
var SavedFlowEdgeSchema = FlowEdgeSchema.mapFields(
  ({ selected: _selected, ...fields }) => fields
)
var SavedDocumentBodySchema = S14.Struct({
  nodes: S14.Array(SavedFlowNodeSchema),
  edges: S14.Array(SavedFlowEdgeSchema),
})
var SavedFlowSessionSchema = S14.Struct({
  version: S14.Literal(1),
  document: SavedDocumentBodySchema,
  viewport: ViewportSchema,
})
var SavedFlowDocumentSchema = S14.Struct({
  version: S14.Literal(1),
  document: SavedDocumentBodySchema,
})
var encodeSavedFlowDocument = (document) =>
  S14.encodeSync(SavedFlowDocumentSchema)({
    version: 1,
    document: {
      nodes: document.nodes.map(({ selected: _selected, ...node }) => node),
      edges: document.edges.map(({ selected: _selected, ...edge }) => edge),
    },
  })
var decodeSavedFlowDocument = (savedFlowDocument) =>
  S14.decodeUnknownEffect(SavedFlowDocumentSchema)(savedFlowDocument).pipe(
    Effect6.flatMap((saved) => decodeFlowDocument(saved.document))
  )
var encodeSavedFlowSession = (document, viewport) => ({
  ...encodeSavedFlowDocument(document),
  viewport: S14.encodeSync(ViewportSchema)(viewport),
})
var decodeSavedFlowSession = (savedFlowSession) =>
  S14.decodeUnknownEffect(SavedFlowSessionSchema)(savedFlowSession).pipe(
    Effect6.flatMap((saved) =>
      decodeFlowDocument(saved.document).pipe(
        Effect6.map((document) => createFlowSnapshot(document, saved.viewport))
      )
    )
  )
export {
  SavedFlowDocumentSchema,
  SavedFlowSessionSchema,
  decodeSavedFlowDocument,
  decodeSavedFlowSession,
  encodeSavedFlowDocument,
  encodeSavedFlowSession,
}
