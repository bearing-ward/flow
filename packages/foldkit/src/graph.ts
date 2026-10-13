import {
  flowEdgeMarkerType,
  FlowSpan,
  FlowAttribute,
  FlowChangeSchema,
  FlowControlModeSchema,
  FlowCommandSchema,
  FlowDocumentSchema,
  FlowEditErrorSchema,
  FlowEditResultSchema,
  FlowEditTransactionSchema,
  FlowSnapshotSchema,
  FlowStateChangeSchema,
  ViewportSchema,
  FlowMeasurementStateSchema,
  ConnectionModeSchema,
  NodeDragThresholdSchema,
  defaultNodeDragThreshold,
  decodeNodeDragThreshold,
  nodeDragActivated,
  nodeTopLeftToAnchor,
  NodeOriginSchema,
  resolveNodeOrigin,
  ConnectionDragThresholdSchema,
  defaultConnectionDragThreshold,
  connectionDragActivated,
  ConnectionRadiusSchema,
  NodeIdSchema,
  HandleIdSchema,
  EdgeIdSchema,
  NodeMeasurementInputSchema,
  NodeBoundsChangeSchema,
  emptyFlowMeasurementState,
  applyNodeMeasurement,
  pruneFlowMeasurements,
  getFlowInternalNode,
  getFlowMeasuredNodes,
  inferHandleMeasurement,
  areFlowNodesInitialized,
  edgeAttachmentPosition,
  edgeLabelPosition,
  resolveEdgeHandles,
  straightEdgePath,
  bezierEdgePath,
  simpleBezierEdgePath,
  stepEdgePath,
  smoothStepEdgePath,
  applyEdgeSelectionChange,
  applyEdgeReconnectChange,
  orderFlowEdges,
  applyNodePositionChange,
  applyNodePositionsChange,
  applyNodeBoundsChange,
  applySelectionSetChange,
  calculateNodeResize,
  graphResizeChildExtent,
  NodeResizeCalculationInputSchema,
  selectionInRect,
  NodeResizeDirectionSchema,
  SelectionModeSchema,
  ReconnectEndpointSchema,
  createFlowGraph,
  nextConnectionEdge,
  prepareFlowEdit,
  validateFlowConnection,
  connectionFromHandleGesture,
  normalizeFlowConnection,
  nearestConnectionTarget,
  panViewport,
  selectionAutoPanDelta,
  canReconnectEdge,
  reconnectFlowEdge,
  selectNodesData as selectCoreNodesData,
  selectNodeConnections as selectCoreNodeConnections,
  selectHandleConnections as selectCoreHandleConnections,
  encodeSavedFlowSession,
  encodeVersionedFlowSession,
  decodeSavedFlowSession,
  decodeVersionedFlowSession,
  applyDefaultEdgeOptions,
  decodeFlowDefaultEdgeOptions,
  FlowDefaultEdgeOptionsSchema,
  createConnectionPreviewSnapshot,
  flowConnectionLineProps,
  flowEdgeRendererProps,
  flowNodeBounds,
  flowNodeRendererProps,
  flowConnectionState,
  handleGestureConnectable,
  isEdgeSelectable,
  isHandleConnectable,
  isNodeConnectable,
  isNodeDraggable,
  isNodeSelectable,
  resolveFlowInteractivity,
} from '@flow/core'
import type {
  FlowChange as CoreFlowChange,
  FlowCommand as CoreFlowCommand,
  FlowDocument,
  NodeBoundsChange,
  NodeResizeCalculationInput,
  NodeMeasurementInput,
  FlowEditError,
  FlowEditResult,
  FlowSnapshot,
  SavedFlowSession,
  SavedVersionedFlowSession,
  FlowStateChange,
  FlowStateChangeCause,
  FlowEdge,
  FlowNode,
  Viewport as CoreViewport,
  FlowGraphNode,
  MeasuredNode,
  MeasuredHandle,
  FlowInternalNode,
  FlowEdgePath,
  FlowHandleConnectionsQuerySchema,
  EdgeId,
  HandleId,
  NodeId,
  FlowHandle,
  ReconnectEndpoint,
  ConnectionMode,
  ConnectionRadius,
  ConnectionPreviewState,
  ConnectionPreviewSnapshot,
  FlowConnectionLineProps,
  FlowConnectionLineType,
  FlowGraphView,
  XYPosition,
  FlowEdgeRendererProps,
  FlowNodeRendererProps,
  FlowDefaultEdgeOptions,
  FlowConnectionState,
  FlowInteractivity,
} from '@flow/core'
import {
  Cause,
  Effect,
  Exit,
  Option,
  Predicate,
  Queue,
  Schema,
  Stream,
} from 'effect'
import { Message as FoldMessage, Submodel, Subscription } from 'foldkit'
import type { Html as FoldHtml, Update } from 'foldkit'

import {
  connectionPermitted,
  connectionRuleAccepts,
  connectionTargetOffered,
} from './connection-rules.ts'
import type { FoldkitIsValidConnection } from './connection-rules.ts'
import {
  MouseDetailSchema,
  ObservedMouseNameSchema,
  observeCanvasMouse,
} from './mouse-observation.ts'
import type { ObservedMouse } from './mouse-observation.ts'

const PendingHandleSchema = Schema.Struct({
  nodeId: NodeIdSchema,
  handleId: HandleIdSchema,
  kind: Schema.Literals(['source', 'target']),
})

const PendingPointerSchema = Schema.Struct({
  pointerId: Schema.Number,
  startX: Schema.Finite,
  startY: Schema.Finite,
  threshold: ConnectionDragThresholdSchema,
})

const PendingConnectionSchema = Schema.Union([
  Schema.Struct({
    ...PendingPointerSchema.fields,
    kind: Schema.Literal('connection-pending'),
    from: PendingHandleSchema,
  }),
  Schema.Struct({
    ...PendingPointerSchema.fields,
    kind: Schema.Literal('reconnection-pending'),
    edgeId: EdgeIdSchema,
    endpoint: ReconnectEndpointSchema,
    source: PendingHandleSchema,
    target: PendingHandleSchema,
  }),
])

const PointerClickReceiptSchema = Schema.Struct({
  pointerId: Schema.Number,
  target: Schema.NullOr(PendingHandleSchema),
})

const PointerSessionSchema = Schema.Union([
  PendingConnectionSchema,
  Schema.Struct({
    kind: Schema.Literal('node-pending'),
    pointerId: Schema.Number,
    startX: Schema.Finite,
    startY: Schema.Finite,
    nodeId: NodeIdSchema,
    threshold: NodeDragThresholdSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal('node-drag'),
    pointerId: Schema.Number,
    startX: Schema.Finite,
    startY: Schema.Finite,
    nodeId: NodeIdSchema,
    /** Every dragged node; the pressed node is first when it moves itself. */
    nodeIds: Schema.Array(NodeIdSchema),
    /** Where the drag found each dragged node: relative and absolute top-left. */
    origins: Schema.Array(
      Schema.Struct({
        nodeId: NodeIdSchema,
        x: Schema.Finite,
        y: Schema.Finite,
        absoluteX: Schema.Finite,
        absoluteY: Schema.Finite,
      })
    ),
    /** The pointer's latest client position, for the live drag preview. */
    currentX: Schema.Finite,
    currentY: Schema.Finite,
  }),
  Schema.Struct({
    kind: Schema.Literal('connection'),
    pointerId: Schema.Number,
    startX: Schema.Number,
    startY: Schema.Number,
    nodeId: Schema.String,
    sourceHandleId: Schema.String,
    autoPanDelta: Schema.Struct({ x: Schema.Number, y: Schema.Number }),
    currentX: Schema.Number,
    currentY: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal('reconnection'),
    pointerId: Schema.Number,
    startX: Schema.Number,
    startY: Schema.Number,
    edgeId: EdgeIdSchema,
    endpoint: ReconnectEndpointSchema,
    currentX: Schema.Number,
    currentY: Schema.Number,
  }),
])

const GestureSessionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('selection'),
    pointerId: Schema.Number,
    startX: Schema.Number,
    startY: Schema.Number,
    currentX: Schema.Number,
    currentY: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal('resize'),
    pointerId: Schema.Number,
    nodeId: NodeIdSchema,
    direction: NodeResizeDirectionSchema,
    startX: Schema.Number,
    startY: Schema.Number,
    input: NodeResizeCalculationInputSchema,
    measurement: Schema.optional(NodeMeasurementInputSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal('viewport-pan'),
    pointerId: Schema.Number,
    startX: Schema.Number,
    startY: Schema.Number,
    currentX: Schema.Number,
    currentY: Schema.Number,
    viewportStart: ViewportSchema,
  }),
])

const KeyboardSessionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('connection'),
    sourceNodeId: NodeIdSchema,
    sourceHandleId: HandleIdSchema,
    inputKind: Schema.Literals(['click', 'keyboard']),
  }),
  Schema.Struct({
    kind: Schema.Literal('reconnection'),
    edgeId: EdgeIdSchema,
    endpoint: ReconnectEndpointSchema,
    inputKind: Schema.Literal('keyboard'),
  }),
])

const KeyboardResizeSessionSchema = Schema.Struct({
  nodeId: NodeIdSchema,
  direction: NodeResizeDirectionSchema,
  input: NodeResizeCalculationInputSchema,
  measurement: Schema.optional(NodeMeasurementInputSchema),
})

const ResizeAcceptanceSchema = Schema.Struct({
  change: NodeBoundsChangeSchema,
  measurement: Schema.optional(NodeMeasurementInputSchema),
})

export const ModelSchema = Schema.Struct({
  instanceId: Schema.String,
  document: FlowDocumentSchema,
  viewport: ViewportSchema,
  documentMode: FlowControlModeSchema,
  viewportMode: FlowControlModeSchema,
  allowedConnectionTargets: Schema.Array(Schema.String),
  connectionMode: ConnectionModeSchema,
  nodeDragThreshold: NodeDragThresholdSchema,
  connectionDragThreshold: ConnectionDragThresholdSchema,
  pointerClickReceipt: Schema.NullOr(PointerClickReceiptSchema),
  connectionRadius: ConnectionRadiusSchema,
  autoPanOnConnect: Schema.Boolean,
  panOnDrag: Schema.Boolean,
  selectionOnDrag: Schema.Boolean,
  panOnScroll: Schema.Boolean,
  panOnScrollSpeed: Schema.Finite,
  panOnScrollMode: Schema.Literals(['free', 'vertical', 'horizontal']),
  zoomOnScroll: Schema.Boolean,
  zoomOnDoubleClick: Schema.Boolean,
  keyboardActivation: Schema.Boolean,
  connectOnClick: Schema.Boolean,
  nodesDraggable: Schema.Boolean,
  nodesConnectable: Schema.Boolean,
  elementsSelectable: Schema.Boolean,
  /** Selected nodes show resize controls only when this is on. */
  nodesResizable: Schema.Boolean,
  defaultEdgeOptions: FlowDefaultEdgeOptionsSchema,
  measurements: FlowMeasurementStateSchema,
  pointerSession: Schema.NullOr(PointerSessionSchema),
  gestureSession: Schema.NullOr(GestureSessionSchema),
  keyboardConnectionSession: Schema.NullOr(KeyboardSessionSchema),
  keyboardResizeSession: Schema.NullOr(KeyboardResizeSessionSchema),
  pendingResizeAcceptance: Schema.NullOr(ResizeAcceptanceSchema),
  selectionMode: SelectionModeSchema,
  /** The click that ends a real node drag does not select, as with d3-drag. */
  nodeClickSuppressed: Schema.Boolean,
})

export type Model = typeof ModelSchema.Type

const canvasForInstance = (instanceId: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    `[data-flow-instance="${CSS.escape(instanceId)}"]`
  )

const canvasForModel = (model: Model): HTMLElement | null =>
  canvasForInstance(model.instanceId)

/** The canvas switches `nodesDraggable`, `nodesConnectable` and `elementsSelectable`. */
export const selectInteractivity = (
  model: Pick<Model, keyof FlowInteractivity>
): FlowInteractivity => ({
  nodesDraggable: model.nodesDraggable,
  nodesConnectable: model.nodesConnectable,
  elementsSelectable: model.elementsSelectable,
})

/** Serializable `FinalConnectionState` summary for connection end events. */
export const ConnectionEndStateSchema = Schema.Struct({
  isValid: Schema.NullOr(Schema.Boolean),
  fromNodeId: Schema.String,
  fromHandleId: Schema.String,
  fromHandleType: Schema.Literals(['source', 'target']),
  toNodeId: Schema.NullOr(Schema.String),
  toHandleId: Schema.NullOr(Schema.String),
  toHandleType: Schema.NullOr(Schema.Literals(['source', 'target'])),
})

const XYPositionSchema = Schema.Struct({ x: Schema.Finite, y: Schema.Finite })

/** One dragged node's live position, as React Flow drag handlers receive it. */
export const DraggedNodePositionSchema = Schema.Struct({
  nodeId: Schema.String,
  position: XYPositionSchema,
  positionAbsolute: XYPositionSchema,
})

export type DraggedNodePosition = typeof DraggedNodePositionSchema.Type

/** Serializable lifecycle records emitted by the Foldkit adapter. */
export const InteractionEventSchema = Schema.Struct({
  name: Schema.Literals([
    'onInit',
    'onError',
    'onNodeDragStart',
    'onNodeDrag',
    'onNodeDragStop',
    'onConnectStart',
    'onConnect',
    'onConnectionPreview',
    'onConnectEnd',
    'onReconnectStart',
    'onReconnect',
    'onReconnectPreview',
    'onReconnectEnd',
    'onSelectionStart',
    'onSelectionDrag',
    'onSelectionEnd',
    'onSelectionDragStart',
    'onSelectionDragMove',
    'onSelectionDragStop',
    'onMoveStart',
    'onMove',
    'onMoveEnd',
    'onPaneClick',
    'onPaneContextMenu',
    'onSelectionContextMenu',
    'onSelectionChange',
    'onPaneMouseEnter',
    'onPaneMouseMove',
    'onPaneMouseLeave',
    'onNodeClick',
    'onNodeContextMenu',
    'onNodeMouseEnter',
    'onNodeMouseMove',
    'onNodeMouseLeave',
    'onEdgeClick',
    'onEdgeContextMenu',
    'onEdgeMouseEnter',
    'onEdgeMouseMove',
    'onEdgeMouseLeave',
  ]),
  phase: Schema.Literals(['start', 'progress', 'proposal', 'end', 'event']),
  inputKind: Schema.Literals([
    'pointer',
    'click',
    'keyboard',
    'touch',
    'wheel',
    'api',
    'runtime',
  ]),
  outcome: Schema.optional(
    Schema.Literals(['accepted', 'proposed', 'rejected', 'cancelled'])
  ),
  reason: Schema.optional(Schema.String),
  nodeId: Schema.optional(Schema.NullOr(Schema.String)),
  edgeId: Schema.optional(Schema.NullOr(Schema.String)),
  x: Schema.optional(Schema.Finite),
  y: Schema.optional(Schema.Finite),
  change: Schema.optional(FlowChangeSchema),
  /** Mouse fields: the serializable equivalent of the browser event. */
  clientX: Schema.optional(Schema.Finite),
  clientY: Schema.optional(Schema.Finite),
  button: Schema.optional(Schema.Int),
  altKey: Schema.optional(Schema.Boolean),
  ctrlKey: Schema.optional(Schema.Boolean),
  metaKey: Schema.optional(Schema.Boolean),
  shiftKey: Schema.optional(Schema.Boolean),
  /** Dragged node ids, or the selected node ids for `onSelectionChange`. */
  nodeIds: Schema.optional(Schema.Array(Schema.String)),
  /** Selected edge ids for `onSelectionChange`. */
  edgeIds: Schema.optional(Schema.Array(Schema.String)),
  /** `onConnectEnd`/`onReconnectEnd` final connection state. */
  connectionState: Schema.optional(ConnectionEndStateSchema),
  /** Node drag events: the dragged node's live position. */
  position: Schema.optional(XYPositionSchema),
  /** Node drag events: the dragged node's live absolute top-left. */
  positionAbsolute: Schema.optional(XYPositionSchema),
  /** Node drag events: every dragged node's live position. */
  nodePositions: Schema.optional(Schema.Array(DraggedNodePositionSchema)),
})

export type InteractionEvent = typeof InteractionEventSchema.Type

export const OutMessage = FoldMessage.defineMessageUnion({
  GestureCancelled: { kind: Schema.String, reason: Schema.String },
  SemanticChange: {
    change: FlowChangeSchema,
    acceptedState: Schema.optional(FlowStateChangeSchema),
  },
  AcceptedState: { change: FlowStateChangeSchema },
  EditCompleted: {
    requestId: Schema.String,
    result: FlowEditResultSchema,
    change: FlowChangeSchema,
    acceptedState: Schema.optional(FlowStateChangeSchema),
  },
  EditFailed: { requestId: Schema.String, error: FlowEditErrorSchema },
})

export type OutMessageData = typeof OutMessage.Type

export const Message = FoldMessage.defineMessageUnion({
  IgnoreInput: {},
  ObserveMouse: {
    name: ObservedMouseNameSchema,
    nodeId: Schema.NullOr(Schema.String),
    edgeId: Schema.NullOr(Schema.String),
    pointer: Schema.optional(MouseDetailSchema),
    /** A node click outside Foldkit's own controls, which selects the node. */
    select: Schema.optional(Schema.Boolean),
  },
  SetInteractivity: {
    nodesDraggable: Schema.optional(Schema.Boolean),
    nodesConnectable: Schema.optional(Schema.Boolean),
    elementsSelectable: Schema.optional(Schema.Boolean),
  },
  ReplaceDocument: { document: FlowDocumentSchema },
  ReplaceViewport: { viewport: ViewportSchema },
  SetSelectionMode: { mode: SelectionModeSchema },
  SetAllowedTargets: { targets: Schema.Array(Schema.String) },
  DispatchCommand: { command: FlowCommandSchema },
  EditRequest: {
    requestId: Schema.String,
    transaction: FlowEditTransactionSchema,
  },
  ApplyDeleteResult: {
    result: FlowEditResultSchema,
  },
  PointerDown: {
    pointerId: Schema.Number,
    clientX: Schema.Number,
    clientY: Schema.Number,
    nodeId: Schema.NullOr(Schema.String),
    handleId: Schema.NullOr(Schema.String),
    direction: Schema.NullOr(NodeResizeDirectionSchema),
    edgeId: Schema.NullOr(EdgeIdSchema),
    endpoint: Schema.NullOr(ReconnectEndpointSchema),
  },
  PointerReleased: {
    pointerId: Schema.Number,
    clientX: Schema.Number,
    clientY: Schema.Number,
    targetNodeId: Schema.NullOr(Schema.String),
    targetHandleId: Schema.NullOr(Schema.String),
  },
  PointerCancelled: { pointerId: Schema.Number },
  RoutedPointerClick: { pointerId: Schema.Number },
  ConnectionPointerMoved: {
    pointerId: Schema.Number,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
    autoPanDelta: Schema.Struct({ x: Schema.Number, y: Schema.Number }),
    flowX: Schema.Number,
    flowY: Schema.Number,
  },
  ViewportWheel: {
    deltaX: Schema.Finite,
    deltaY: Schema.Finite,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
  },
  ViewportDoubleClick: {
    clientX: Schema.Finite,
    clientY: Schema.Finite,
  },
  NodeDragMoved: {
    pointerId: Schema.Number,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
    flowX: Schema.Number,
    flowY: Schema.Number,
  },
  ConnectionAutoPanFrame: {},
  GestureDown: {
    pointerId: Schema.Number,
    clientX: Schema.Number,
    clientY: Schema.Number,
    nodeId: Schema.NullOr(Schema.String),
    direction: Schema.NullOr(NodeResizeDirectionSchema),
    allowPan: Schema.Boolean,
    screenX: Schema.Finite,
    screenY: Schema.Finite,
  },
  GestureMoved: {
    pointerId: Schema.Number,
    flowX: Schema.Number,
    flowY: Schema.Number,
    screenX: Schema.Finite,
    screenY: Schema.Finite,
  },
  GestureReleased: {
    pointerId: Schema.Number,
    flowX: Schema.Number,
    flowY: Schema.Number,
    clientX: Schema.Number,
    clientY: Schema.Number,
  },
  CancelGesture: {},
  MeasureNode: { measurement: NodeMeasurementInputSchema },
  PruneMeasurements: {},
  SelectEdge: {
    edgeId: EdgeIdSchema,
    pointer: Schema.optional(MouseDetailSchema),
  },
  ToggleNodeSelection: { nodeId: NodeIdSchema },
  ResizeByKeyboard: {
    nodeId: NodeIdSchema,
    direction: NodeResizeDirectionSchema,
    delta: Schema.Struct({ x: Schema.Number, y: Schema.Number }),
  },
  FinishKeyboardResize: { key: Schema.String },
  KeyboardSelectionKey: {
    key: Schema.String,
    shift: Schema.Boolean,
    nodeId: Schema.NullOr(NodeIdSchema),
  },
  CommitKeyboardSelection: {},
  ActivateHandle: { nodeId: NodeIdSchema, handleId: HandleIdSchema },
  ClickHandle: { nodeId: NodeIdSchema, handleId: HandleIdSchema },
  ActivateReconnect: {
    edgeId: EdgeIdSchema,
    endpoint: ReconnectEndpointSchema,
  },
})

export type GraphMessageData = typeof Message.Type

const noChange = (
  model: Model
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => ({
  model,
})

export interface GraphInteractionOptions {
  readonly nodeDragThreshold?: typeof NodeDragThresholdSchema.Type | undefined
  readonly connectionDragThreshold?:
    | typeof ConnectionDragThresholdSchema.Type
    | undefined
  readonly connectionMode: ConnectionMode
  readonly connectionRadius: ConnectionRadius
  readonly autoPanOnConnect: boolean
  readonly panOnDrag?: boolean
  readonly selectionOnDrag?: boolean
  readonly panOnScroll?: boolean
  readonly panOnScrollSpeed?: number
  readonly panOnScrollMode?: 'free' | 'vertical' | 'horizontal'
  readonly zoomOnScroll?: boolean
  readonly zoomOnDoubleClick?: boolean
  readonly keyboardActivation?: boolean
  readonly connectOnClick?: boolean
  readonly defaultEdgeOptions?: FlowDefaultEdgeOptions
  /** React Flow `nodesDraggable`; a node's own `draggable` wins. Defaults to true. */
  readonly nodesDraggable?: boolean
  /** React Flow `nodesConnectable`; node and handle flags win. Defaults to true. */
  readonly nodesConnectable?: boolean
  /** React Flow `elementsSelectable`; element `selectable` wins. Defaults to true. */
  readonly elementsSelectable?: boolean
  /**
   * Show resize controls on selected nodes and accept resize gestures.
   * Defaults to false: React Flow shows resize controls only with a
   * `NodeResizer`.
   */
  readonly nodesResizable?: boolean
  /**
   * React Flow `isValidConnection`. When set it replaces the static
   * `allowedConnectionTargets` list. Registered by `createProgram`; it never
   * enters the schema-checked model.
   */
  readonly isValidConnection?: FoldkitIsValidConnection
}

export const defaultInteractionOptions: GraphInteractionOptions = {
  nodeDragThreshold: defaultNodeDragThreshold,
  connectionDragThreshold: defaultConnectionDragThreshold,
  connectionMode: 'strict',
  connectionRadius: 20,
  autoPanOnConnect: true,
  panOnDrag: false,
  selectionOnDrag: true,
  panOnScroll: false,
  panOnScrollSpeed: 1,
  panOnScrollMode: 'free',
  zoomOnScroll: false,
  zoomOnDoubleClick: false,
  keyboardActivation: true,
  connectOnClick: true,
  defaultEdgeOptions: {},
  nodesDraggable: true,
  nodesConnectable: true,
  elementsSelectable: true,
  nodesResizable: false,
}

export const selectSnapshot = (model: Model): FlowSnapshot => ({
  document: model.document,
  viewport: model.viewport,
})

export const selectSavedSession = (model: Model): SavedFlowSession =>
  encodeSavedFlowSession(model.document, model.viewport)

export const selectVersionedSavedSession = (
  model: Model
): SavedVersionedFlowSession =>
  encodeVersionedFlowSession(model.document, model.viewport)

/** Decode unknown versioned data without installing or acknowledging a graph. */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the public/schema decode boundary for untrusted persistence input.
export const prepareVersionedSavedSession = (saved: unknown) =>
  decodeVersionedFlowSession(saved)

/** Decode a session into an owner proposal; the Runtime model remains unchanged. */
export const prepareSavedSession = (saved: SavedFlowSession) =>
  Effect.runPromise(decodeSavedFlowSession(saved))

export const selectNodes = (model: Model): readonly FlowNode[] =>
  model.document.nodes

export const selectEdges = (model: Model): readonly FlowEdge[] =>
  model.document.edges

/** Pure projection over this Runtime's accepted document. */
export const selectNodesData = (model: Model, nodeIds: readonly string[]) =>
  selectCoreNodesData(
    model.document,
    nodeIds.map((id) => NodeIdSchema.make(id))
  )

/** Pure connection projection over this Runtime's accepted document. */
export const selectNodeConnections = (
  model: Model,
  options: {
    readonly nodeId: string
    readonly type?: 'source' | 'target'
    readonly handleId?: string | null
  }
) => {
  const validatedOptions = {
    nodeId: NodeIdSchema.make(options.nodeId),
  }

  if (options.type !== undefined) {
    Object.assign(validatedOptions, { type: options.type })
  }

  if (options.handleId !== undefined) {
    Object.assign(validatedOptions, {
      handleId:
        options.handleId === null
          ? null
          : HandleIdSchema.make(options.handleId),
    })
  }

  return selectCoreNodeConnections(model.document, validatedOptions)
}

/** Point-in-time directional handle connections from this Runtime's document. */
export const selectHandleConnections = (
  model: Model,
  query: typeof FlowHandleConnectionsQuerySchema.Type
) => selectCoreHandleConnections(model.document, query)

export const selectNode = (model: Model, id: string): FlowNode | undefined =>
  model.document.nodes.find((node) => node.id === id)

export const selectEdge = (model: Model, id: string): FlowEdge | undefined =>
  model.document.edges.find((edge) => edge.id === id)

export const selectViewport = (model: Model): CoreViewport => model.viewport

export const selectInternalNode = (
  model: Model,
  id: string
): FlowInternalNode | undefined => {
  const nodeId = Option.getOrUndefined(
    Schema.decodeUnknownOption(NodeIdSchema)(id)
  )

  return nodeId === undefined
    ? undefined
    : getFlowInternalNode(model.document, model.measurements, nodeId)
}

const selectMountedNodeIds = (
  model: Model,
  measurements = getFlowMeasuredNodes(model.document, model.measurements),
  graph = createFlowGraph(model.document, measurements)
): ReadonlySet<NodeId> => {
  const { zoom } = model.viewport

  return new Set(
    graph.orderedNodes.flatMap(({ node }) => {
      const graphNode = graph.nodes.get(node.id)

      if (graphNode === undefined || graphNode.hidden) {
        return []
      }

      const { x, y } = graphNode.absolutePosition
      const left = x * zoom + model.viewport.x
      const top = y * zoom + model.viewport.y

      const measured = measurements.get(node.id)

      const width = measured?.width ?? node.size?.width ?? 150
      const height = measured?.height ?? node.size?.height ?? 44

      return left < 960 &&
        top < 640 &&
        left + width * zoom > 0 &&
        top + height * zoom > 0
        ? [node.id]
        : []
    })
  )
}

export const selectNodesInitialized = (
  model: Model,
  options: { readonly includeHidden?: boolean } = {}
): boolean =>
  areFlowNodesInitialized(model.document, model.measurements, {
    ...options,
    mountedNodeIds: selectMountedNodeIds(model),
  })

const snapshotEquivalence = Schema.toEquivalence(FlowSnapshotSchema)

const stateChange = (
  previous: Model,
  current: Model,
  cause: FlowStateChangeCause
): FlowStateChange | undefined => {
  const previousSnapshot = selectSnapshot(previous)
  const currentSnapshot = selectSnapshot(current)

  return snapshotEquivalence(previousSnapshot, currentSnapshot)
    ? undefined
    : { previous: previousSnapshot, current: currentSnapshot, cause }
}

const report = (
  previous: Model,
  model: Model,
  change: CoreFlowChange
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => ({
  model,
  outMessage: OutMessage.SemanticChange({
    change,
    acceptedState: stateChange(previous, model, 'semantic-change') ?? undefined,
  }),
})

const acceptReplacement = (
  previous: Model,
  current: Model,
  cause: 'document-update' | 'viewport-update'
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => {
  const change = stateChange(previous, current, cause)

  return change === undefined
    ? { model: current }
    : { model: current, outMessage: OutMessage.AcceptedState({ change }) }
}

const setNodePosition = (
  model: Model,
  nodeId: string,
  position: { readonly x: number; readonly y: number }
) => {
  const node = model.document.nodes.find((candidate) => candidate.id === nodeId)

  if (node === undefined) {
    return noChange(model)
  }

  const change: CoreFlowChange = {
    kind: 'node-position',
    nodeId: node.id,
    position,
  }

  const document = applyNodePositionChange(model.document, change)

  return document === undefined
    ? noChange(model)
    : report(
        model,
        {
          ...model,
          document:
            model.documentMode === 'uncontrolled' ? document : model.document,
        },
        change
      )
}

const dispatchCommand = (model: Model, command: CoreFlowCommand) => {
  if (command.kind === 'edit-transaction') {
    const prepared = Effect.runSync(
      prepareFlowEdit(model.document, command.transaction)
    )

    const change: CoreFlowChange = {
      kind: 'edit-proposal',
      document: prepared.document,
      deletion: prepared.deletion,
    }

    return report(
      model,
      {
        ...model,
        document:
          model.documentMode === 'uncontrolled'
            ? change.document
            : model.document,
      },
      change
    )
  }

  if (command.kind === 'set-viewport') {
    const change: CoreFlowChange = {
      kind: 'viewport',
      viewport: command.viewport,
    }

    const next =
      model.viewportMode === 'uncontrolled'
        ? { ...model, viewport: command.viewport }
        : model

    return report(model, next, change)
  }

  if (command.kind === 'set-node-position') {
    return setNodePosition(model, command.nodeId, command.position)
  }

  const exhaustive: never = command

  return exhaustive
}

const requestEdit = (
  model: Model,
  requestId: string,
  transaction: typeof FlowEditTransactionSchema.Type
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => {
  const exit = Effect.runSyncExit(prepareFlowEdit(model.document, transaction))

  return Exit.match(exit, {
    onFailure: (cause) => {
      const failure = Cause.findErrorOption(cause)

      if (Option.isNone(failure)) {
        throw new Error('FlowEditFailedWithoutTypedError')
      }

      const error: FlowEditError = Schema.decodeUnknownSync(
        FlowEditErrorSchema
      )(failure.value)

      return {
        model,
        outMessage: OutMessage.EditFailed({ requestId, error }),
      }
    },
    onSuccess: (result: FlowEditResult) => {
      const change: CoreFlowChange = {
        kind: 'edit-proposal',
        document: result.document,
        deletion: result.deletion,
      }

      const next = {
        ...model,
        document:
          model.documentMode === 'uncontrolled'
            ? result.document
            : model.document,
      }

      return {
        model: next,
        outMessage: OutMessage.EditCompleted({
          requestId,
          result,
          change,
          acceptedState:
            stateChange(model, next, 'semantic-change') ?? undefined,
        }),
      }
    },
  })
}

type PointerReleased = Extract<
  GraphMessageData,
  { readonly _tag: 'PointerReleased' }
>

const finishConnection = (
  model: Model,
  cleared: Model & { readonly pointerSession: null },
  session: Extract<
    NonNullable<Model['pointerSession']>,
    { kind: 'connection' }
  >,
  message: PointerReleased
) => {
  const source = model.document.nodes.find((node) => node.id === session.nodeId)

  const target =
    message.targetNodeId === null
      ? undefined
      : model.document.nodes.find((node) => node.id === message.targetNodeId)

  const sourceHandle = source?.handles?.find(
    (handle) => handle.id === session.sourceHandleId
  )

  const targetHandle = target?.handles?.find(
    (handle) => handle.id === message.targetHandleId
  )

  if (
    source === undefined ||
    target === undefined ||
    sourceHandle === undefined ||
    targetHandle === undefined
  ) {
    return { model: cleared }
  }

  const validated = Effect.runSyncExit(
    connectionFromHandleGesture(
      {
        document: model.document,
        interactivity: selectInteractivity(model),
        fromNodeId: source.id,
        fromHandleId: sourceHandle.id,
        toNodeId: target.id,
        toHandleId: targetHandle.id,
      },
      model.connectionMode
    )
  )

  if (
    Exit.isFailure(validated) ||
    !connectionPermitted(
      model.instanceId,
      model.allowedConnectionTargets,
      target.id,
      validated.value,
      model.document
    )
  ) {
    return { model: cleared }
  }

  const connection = validated.value

  const edge = applyDefaultEdgeOptions(
    nextConnectionEdge(model.document, connection),
    model.defaultEdgeOptions
  )

  const change: CoreFlowChange = { kind: 'edge-add', edge }

  const document =
    model.documentMode === 'uncontrolled'
      ? { ...model.document, edges: [...model.document.edges, edge] }
      : model.document

  return report(model, { ...cleared, document }, change)
}

const completeKeyboardConnection = (
  model: Model,
  session: Extract<
    typeof KeyboardSessionSchema.Type,
    { readonly kind: 'connection' }
  >,
  targetNodeId: string,
  targetHandleId: string
) =>
  finishConnection(
    model,
    { ...model, pointerSession: null, keyboardConnectionSession: null },
    {
      kind: 'connection',
      pointerId: -1,
      startX: 0,
      startY: 0,
      nodeId: session.sourceNodeId,
      sourceHandleId: session.sourceHandleId,
      autoPanDelta: { x: 0, y: 0 },
      currentX: 0,
      currentY: 0,
    },
    Message.PointerReleased({
      pointerId: -1,
      clientX: 0,
      clientY: 0,
      targetNodeId,
      targetHandleId,
    })
  )

/** A reconnection's new endpoint must accept connections and pass the rule. */
const reconnectionAllowed = (
  model: Model,
  edge: FlowEdge,
  nodeId: string,
  handleId: string
): boolean => {
  const node = model.document.nodes.find(({ id }) => id === nodeId)
  const handle = node?.handles?.find(({ id }) => id === handleId)

  return (
    node !== undefined &&
    handle !== undefined &&
    isHandleConnectable(selectInteractivity(model), node, handle, 'end') &&
    connectionRuleAccepts(
      model.instanceId,
      {
        source: edge.source,
        sourceHandle: HandleIdSchema.make(edge.sourceHandle ?? ''),
        target: edge.target,
        targetHandle: HandleIdSchema.make(edge.targetHandle ?? ''),
      },
      model.document
    )
  )
}

/** Whether a click or keyboard connection may start from this handle. */
const handleStartable = (
  model: Model,
  node: FlowNode | undefined,
  handle: FlowHandle | undefined
): boolean =>
  node !== undefined &&
  handle !== undefined &&
  isHandleConnectable(selectInteractivity(model), node, handle, 'start')

const completeKeyboardReconnection = (
  model: Model,
  session: Extract<
    typeof KeyboardSessionSchema.Type,
    { readonly kind: 'reconnection' }
  >,
  targetNodeId: NodeId,
  targetHandleId: HandleId
) => {
  const exit = Effect.runSyncExit(
    reconnectFlowEdge(
      model.document,
      session.edgeId,
      session.endpoint,
      targetNodeId,
      targetHandleId,
      model.connectionMode
    )
  )

  if (
    Exit.isFailure(exit) ||
    exit.value === undefined ||
    !reconnectionAllowed(model, exit.value, targetNodeId, targetHandleId)
  ) {
    return { model: { ...model, keyboardConnectionSession: null } }
  }

  const change = { kind: 'edge-reconnect' as const, edge: exit.value }
  const document = applyEdgeReconnectChange(model.document, change)

  return document === undefined
    ? { model: { ...model, keyboardConnectionSession: null } }
    : report(
        model,
        {
          ...model,
          keyboardConnectionSession: null,
          document:
            model.documentMode === 'uncontrolled' ? document : model.document,
        },
        change
      )
}

type NodeDragSession = Extract<
  NonNullable<Model['pointerSession']>,
  { kind: 'node-drag' }
>

/**
 * The nodes a press on `nodeId` drags, as React Flow's `getDragItems`: a
 * selected node drags every selected, draggable, visible node that has no
 * selected ancestor; an unselected node drags alone. Each item records where
 * the drag found it, so every frame is an offset from there.
 */
const nodeDragStart = (
  model: Model,
  nodeId: NodeId
): Pick<NodeDragSession, 'nodeIds' | 'origins'> => {
  const interactivity = selectInteractivity(model)

  const graph = createFlowGraph(
    model.document,
    getFlowMeasuredNodes(model.document, model.measurements)
  )

  const pressed = graph.nodes.get(nodeId)?.node

  const candidates = new Set(
    pressed?.selected === true
      ? model.document.nodes
          .filter(
            (node) =>
              (node.selected === true || node.id === nodeId) &&
              isNodeDraggable(interactivity, node) &&
              graph.nodes.get(node.id)?.hidden === false
          )
          .map(({ id }) => id)
      : [nodeId]
  )

  const hasDraggedAncestor = (id: NodeId): boolean => {
    let parentId = graph.nodes.get(id)?.parentId

    while (parentId !== undefined) {
      if (candidates.has(parentId)) {
        return true
      }

      parentId = graph.nodes.get(parentId)?.parentId
    }

    return false
  }

  const items = [...candidates].filter((id) => !hasDraggedAncestor(id))

  const nodeIds = items.includes(nodeId)
    ? [nodeId, ...items.filter((id) => id !== nodeId)]
    : items

  const origins = nodeIds.flatMap((id) => {
    const resolved = graph.nodes.get(id)

    if (resolved === undefined || resolved.hidden) {
      return []
    }

    const parent =
      resolved.parentId === undefined
        ? undefined
        : graph.nodes.get(resolved.parentId)

    const position = nodeTopLeftToAnchor(
      {
        x: resolved.absolutePosition.x - (parent?.absolutePosition.x ?? 0),
        y: resolved.absolutePosition.y - (parent?.absolutePosition.y ?? 0),
      },
      resolved.dimensions,
      resolveNodeOrigin(resolved.node, model.document)
    )

    return [
      {
        nodeId: id,
        x: position.x,
        y: position.y,
        absoluteX: resolved.absolutePosition.x,
        absoluteY: resolved.absolutePosition.y,
      },
    ]
  })

  return { nodeIds, origins }
}

/**
 * Each dragged node's position once the pointer is at `clientX`/`clientY`:
 * its drag origin plus the pointer travel, so a frame costs O(dragged nodes)
 * plus one id lookup per node.
 */
const nodeDragPositions = (
  model: Model,
  session: NodeDragSession,
  clientX: number,
  clientY: number
): readonly {
  readonly nodeId: NodeId
  readonly position: XYPosition
  readonly positionAbsolute: XYPosition
}[] => {
  const dx = (clientX - session.startX) / model.viewport.zoom
  const dy = (clientY - session.startY) / model.viewport.zoom
  const interactivity = selectInteractivity(model)
  const nodes = new Map(model.document.nodes.map((node) => [node.id, node]))

  return session.origins.flatMap(({ nodeId, x, y, absoluteX, absoluteY }) => {
    const node = nodes.get(nodeId)

    return node === undefined ||
      node.hidden === true ||
      !isNodeDraggable(interactivity, node)
      ? []
      : [
          {
            nodeId,
            position: { x: x + dx, y: y + dy },
            positionAbsolute: { x: absoluteX + dx, y: absoluteY + dy },
          },
        ]
  })
}

/** The semantic change a node drag proposes with the pointer at a client point. */
const nodeDragChange = (
  model: Model,
  session: NodeDragSession,
  clientX: number,
  clientY: number
): CoreFlowChange | undefined => {
  const positions = nodeDragPositions(model, session, clientX, clientY).map(
    ({ nodeId, position }) => ({ nodeId, position })
  )

  const [first] = positions

  if (first === undefined) {
    return undefined
  }

  return positions.length === 1
    ? { kind: 'node-position', nodeId: first.nodeId, position: first.position }
    : { kind: 'node-positions', positions }
}

const applyNodeDragChange = (
  document: FlowDocument,
  change: CoreFlowChange
): FlowDocument | undefined => {
  if (change.kind === 'node-position') {
    return applyNodePositionChange(document, change)
  }

  return change.kind === 'node-positions'
    ? applyNodePositionsChange(document, change)
    : undefined
}

/**
 * The document with an active node drag's live positions applied: the drag
 * preview. It moves the same nodes to the same positions the release commit
 * does, in one pass over the nodes and without building a graph.
 */
export const selectLiveDocument = (model: Model): FlowDocument => {
  const session = model.pointerSession

  if (session?.kind !== 'node-drag') {
    return model.document
  }

  const moved = new Map(
    nodeDragPositions(model, session, session.currentX, session.currentY).map(
      ({ nodeId, position }) => [nodeId, position]
    )
  )

  if (moved.size === 0) {
    return model.document
  }

  return {
    ...model.document,
    nodes: model.document.nodes.map((node) => {
      const position = moved.get(node.id)

      return position === undefined ? node : { ...node, position }
    }),
  }
}

/** The model as a reader sees it mid-drag: live positions, same everything else. */
export const selectLiveModel = (model: Model): Model => {
  const document = selectLiveDocument(model)

  return document === model.document ? model : { ...model, document }
}

/**
 * Live positions of every dragged node, with the pointer at `at` or at the
 * session's latest point. Undefined when no node drag is active.
 */
export const selectNodeDragPositions = (
  model: Model,
  at?: { readonly clientX: number; readonly clientY: number }
): readonly DraggedNodePosition[] | undefined => {
  const session = model.pointerSession

  return session?.kind === 'node-drag'
    ? nodeDragPositions(
        model,
        session,
        at?.clientX ?? session.currentX,
        at?.clientY ?? session.currentY
      )
    : undefined
}

/** Whether the pointer moved after the press; d3-drag then swallows the click. */
const nodeDragMoved = (
  session: NodeDragSession,
  message: PointerReleased
): boolean =>
  session.currentX !== session.startX ||
  session.currentY !== session.startY ||
  message.clientX !== session.startX ||
  message.clientY !== session.startY

const finishNodeDrag = (
  model: Model,
  cleared: Model & { readonly pointerSession: null },
  session: NodeDragSession,
  message: PointerReleased
) => {
  const change = nodeDragChange(
    model,
    session,
    message.clientX,
    message.clientY
  )

  const document =
    change === undefined
      ? undefined
      : applyNodeDragChange(model.document, change)

  if (change === undefined || document === undefined) {
    return { model: cleared }
  }

  return report(
    model,
    {
      ...cleared,
      document:
        model.documentMode === 'uncontrolled' ? document : model.document,
    },
    change
  )
}

const finishKeyboardTargetClick = (
  model: Model,
  session: NonNullable<Model['pointerSession']>,
  message: PointerReleased
) => {
  const keyboardSession = model.keyboardConnectionSession

  if (
    session.kind === 'connection' &&
    keyboardSession?.kind === 'connection' &&
    message.targetNodeId === session.nodeId &&
    message.targetHandleId === session.sourceHandleId
  ) {
    const node = model.document.nodes.find(
      (candidate) => candidate.id === session.nodeId
    )

    const handle = node?.handles?.find(
      (candidate) => candidate.id === session.sourceHandleId
    )

    if (handle?.kind === 'target') {
      return completeKeyboardConnection(
        model,
        keyboardSession,
        message.targetNodeId,
        message.targetHandleId
      )
    }
  }

  return null
}

const pendingEligible = (
  model: Model,
  pending: typeof PendingConnectionSchema.Type
): boolean => {
  const graph = createFlowGraph(
    model.document,
    getFlowMeasuredNodes(model.document, model.measurements)
  )

  const interactivity = selectInteractivity(model)

  const eligible = (identity: typeof PendingHandleSchema.Type): boolean => {
    const node = model.document.nodes.find(({ id }) => id === identity.nodeId)

    return (
      graph.nodes.get(identity.nodeId)?.hidden === false &&
      node !== undefined &&
      node.handles?.some(
        ({ id, kind }) => id === identity.handleId && kind === identity.kind
      ) === true
    )
  }

  const startable = (identity: typeof PendingHandleSchema.Type): boolean => {
    const node = model.document.nodes.find(({ id }) => id === identity.nodeId)
    const handle = node?.handles?.find(({ id }) => id === identity.handleId)

    return (
      node !== undefined &&
      handle !== undefined &&
      isHandleConnectable(interactivity, node, handle, 'start')
    )
  }

  if (pending.kind === 'connection-pending') {
    return (
      eligible(pending.from) &&
      (model.keyboardConnectionSession !== null || startable(pending.from)) &&
      (model.connectionMode === 'loose' ||
        pending.from.kind === 'source' ||
        model.keyboardConnectionSession !== null)
    )
  }

  const edge = model.document.edges.find(({ id }) => id === pending.edgeId)
  const resolved = edge && resolveEdgeHandles(model.document, edge)

  return (
    edge !== undefined &&
    edge.hidden !== true &&
    edge.selected === true &&
    canReconnectEdge(edge, pending.endpoint) &&
    resolved !== undefined &&
    edge.source === pending.source.nodeId &&
    edge.target === pending.target.nodeId &&
    resolved.sourceHandle.id === pending.source.handleId &&
    resolved.targetHandle.id === pending.target.handleId &&
    eligible(pending.source) &&
    eligible(pending.target) &&
    [pending.source, pending.target].every((identity) => {
      const node = model.document.nodes.find(({ id }) => id === identity.nodeId)

      return node !== undefined && isNodeConnectable(interactivity, node)
    })
  )
}

const finishPendingPointer = (
  model: Model,
  session: typeof PendingConnectionSchema.Type,
  message: PointerReleased
) => {
  const target =
    session.kind === 'connection-pending' &&
    pendingEligible(model, session) &&
    message.targetNodeId === session.from.nodeId &&
    message.targetHandleId === session.from.handleId
      ? session.from
      : null

  return {
    model: {
      ...model,
      pointerSession: null,
      pointerClickReceipt: { pointerId: session.pointerId, target },
    },
  }
}

const activePointerClickTarget = (
  model: Model,
  session: NonNullable<Model['pointerSession']>,
  message: PointerReleased
): typeof PendingHandleSchema.Type | null => {
  if (
    session.kind !== 'connection' ||
    message.targetNodeId !== session.nodeId ||
    message.targetHandleId !== session.sourceHandleId
  ) {
    return null
  }

  const node = model.document.nodes.find(
    (candidate) => candidate.id === session.nodeId
  )

  const handle = node?.handles?.find(
    (candidate) => candidate.id === session.sourceHandleId
  )

  return node === undefined || handle === undefined
    ? null
    : { nodeId: node.id, handleId: handle.id, kind: handle.kind }
}

const finishPointer = (model: Model, message: PointerReleased) => {
  const session = model.pointerSession

  if (session === null || session.pointerId !== message.pointerId) {
    return noChange(model)
  }

  if (
    session.kind === 'connection-pending' ||
    session.kind === 'reconnection-pending'
  ) {
    return finishPendingPointer(model, session, message)
  }

  if (session.kind === 'node-pending') {
    return { model: { ...model, pointerSession: null } }
  }

  if (session.kind === 'node-drag') {
    return finishNodeDrag(
      model,
      {
        ...model,
        pointerSession: null,
        pointerClickReceipt: null,
        nodeClickSuppressed: nodeDragMoved(session, message),
      },
      session,
      message
    )
  }

  const cleared = {
    ...model,
    pointerSession: null,
    pointerClickReceipt: {
      pointerId: session.pointerId,
      target: activePointerClickTarget(model, session, message),
    },
    keyboardConnectionSession: null,
  }

  const keyboardTargetClick = finishKeyboardTargetClick(model, session, message)

  if (keyboardTargetClick !== null) {
    return keyboardTargetClick
  }

  switch (session.kind) {
    case 'connection': {
      return finishConnection(model, cleared, session, message)
    }

    case 'reconnection': {
      const targetNodeId =
        message.targetNodeId === null
          ? null
          : Option.getOrNull(
              Schema.decodeUnknownOption(NodeIdSchema)(message.targetNodeId)
            )

      const targetHandleId =
        message.targetHandleId === null
          ? null
          : Option.getOrNull(
              Schema.decodeUnknownOption(HandleIdSchema)(message.targetHandleId)
            )

      if (targetNodeId === null || targetHandleId === null) {
        return { model: cleared }
      }

      const result = Effect.runSyncExit(
        reconnectFlowEdge(
          model.document,
          session.edgeId,
          session.endpoint,
          targetNodeId,
          targetHandleId,
          model.connectionMode
        )
      )

      if (
        Exit.isFailure(result) ||
        result.value === undefined ||
        !reconnectionAllowed(model, result.value, targetNodeId, targetHandleId)
      ) {
        return { model: cleared }
      }

      const change = {
        kind: 'edge-reconnect' as const,
        edge: result.value,
      }

      const document = applyEdgeReconnectChange(model.document, change)

      return document === undefined
        ? { model: cleared }
        : report(
            model,
            {
              ...cleared,
              document:
                model.documentMode === 'uncontrolled'
                  ? document
                  : model.document,
            },
            change
          )
    }

    default: {
      const exhaustive: never = session

      return exhaustive
    }
  }
}

const flowPoint = (
  clientX: number,
  clientY: number,
  viewport: CoreViewport,
  canvas?: HTMLElement | null
) => {
  const bounds = (
    canvas ?? document.querySelector<HTMLElement>('.flow-foldkit-canvas')
  )?.getBoundingClientRect()

  return {
    x: (clientX - (bounds?.left ?? 0) - viewport.x) / viewport.zoom,
    y: (clientY - (bounds?.top ?? 0) - viewport.y) / viewport.zoom,
  }
}

const zoomViewportAt = (
  model: Model,
  clientX: number,
  clientY: number,
  factor: number
): CoreViewport => {
  const canvas = document.querySelector<HTMLElement>('.flow-foldkit-canvas')
  const bounds = canvas?.getBoundingClientRect()
  const screenX = clientX - (bounds?.left ?? 0)
  const screenY = clientY - (bounds?.top ?? 0)
  const zoom = Math.min(2, Math.max(0.1, model.viewport.zoom * factor))
  const ratio = zoom / model.viewport.zoom

  return {
    zoom,
    x: screenX - (screenX - model.viewport.x) * ratio,
    y: screenY - (screenY - model.viewport.y) * ratio,
  }
}

const measurementsForResize = (
  model: Model,
  document: FlowDocument,
  change: NodeBoundsChange,
  measurement: NodeMeasurementInput | undefined
) => {
  const measurements = pruneFlowMeasurements(document, model.measurements)

  const current = getFlowMeasuredNodes(document, measurements).get(
    change.nodeId
  )

  if (
    current?.width === change.size.width &&
    current.height === change.size.height
  ) {
    return measurements
  }

  const sampled =
    measurement?.width === change.size.width &&
    measurement.height === change.size.height
      ? applyNodeMeasurement(document, measurements, measurement)
      : measurements

  const accepted = getFlowMeasuredNodes(document, sampled).get(change.nodeId)

  if (
    accepted?.width === change.size.width &&
    accepted.height === change.size.height
  ) {
    return sampled
  }

  const nodes = sampled.nodes.filter(
    ({ measurement: node }) => node.nodeId !== change.nodeId
  )

  return nodes.length === sampled.nodes.length
    ? sampled
    : { ...sampled, nodes, revision: sampled.revision + 1 }
}

const measurementsForDocument = (model: Model, document: FlowDocument) => {
  const pending = model.pendingResizeAcceptance

  if (pending === null) {
    return pruneFlowMeasurements(document, model.measurements)
  }

  const { change } = pending
  const nodes = new Map(document.nodes.map((node) => [node.id, node]))
  const resized = nodes.get(change.nodeId)

  const accepted =
    resized?.position.x === change.position.x &&
    resized.position.y === change.position.y &&
    resized.size?.width === change.size.width &&
    resized.size.height === change.size.height &&
    change.childPositions.every(({ nodeId, position }) => {
      const child = nodes.get(nodeId)

      return (
        child?.parentId === change.nodeId &&
        child.position.x === position.x &&
        child.position.y === position.y
      )
    })

  return accepted
    ? measurementsForResize(model, document, change, pending.measurement)
    : pruneFlowMeasurements(document, model.measurements)
}

const resizeInput = (
  model: Model,
  node: FlowNode,
  direction: NodeResizeCalculationInput['direction']
): NodeResizeCalculationInput => {
  const graph = createFlowGraph(
    model.document,
    getFlowMeasuredNodes(model.document, model.measurements)
  )

  const parent =
    node.parentId === undefined ? undefined : graph.nodes.get(node.parentId)

  return {
    direction,
    positionStart: node.position,
    sizeStart: graph.nodes.get(node.id)?.dimensions ?? {
      width: 150,
      height: 44,
    },
    minimumSize: { width: 40, height: 24 },
    delta: { x: 0, y: 0 },
    childExtent: graphResizeChildExtent(graph, node.id),
    bounds:
      node.extent === 'parent' && parent !== undefined
        ? {
            minX: 0,
            minY: 0,
            maxX: parent.dimensions.width,
            maxY: parent.dimensions.height,
          }
        : undefined,
  }
}

const resizeProposal = (
  document: FlowDocument,
  nodeId: NodeId,
  input: NodeResizeCalculationInput
): NodeBoundsChange | undefined => {
  const result = calculateNodeResize(input)

  if (result.boundsIssues.length > 0) {
    return undefined
  }

  return {
    kind: 'node-bounds',
    nodeId,
    position: result.position,
    size: result.size,
    childPositions: document.nodes
      .filter((child) => child.parentId === nodeId)
      .map((child) => ({
        nodeId: child.id,
        position: {
          x: child.position.x + result.childrenPositionDelta.x,
          y: child.position.y + result.childrenPositionDelta.y,
        },
      })),
  }
}

const activatePending = (
  pending: typeof PendingConnectionSchema.Type,
  flowX: number,
  flowY: number
): NonNullable<Model['pointerSession']> =>
  pending.kind === 'connection-pending'
    ? {
        kind: 'connection',
        pointerId: pending.pointerId,
        startX: pending.startX,
        startY: pending.startY,
        nodeId: pending.from.nodeId,
        sourceHandleId: pending.from.handleId,
        currentX: flowX,
        currentY: flowY,
        autoPanDelta: { x: 0, y: 0 },
      }
    : {
        kind: 'reconnection',
        pointerId: pending.pointerId,
        startX: pending.startX,
        startY: pending.startY,
        edgeId: pending.edgeId,
        endpoint: pending.endpoint,
        currentX: flowX,
        currentY: flowY,
      }

/** Add or remove one node from the selection, keeping the rest. */
const toggleNodeSelection = (
  model: Model,
  nodeId: string
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => {
  const node = model.document.nodes.find((candidate) => candidate.id === nodeId)

  const interactivity = selectInteractivity(model)

  if (
    node === undefined ||
    !isNodeSelectable(interactivity, node) ||
    node.hidden === true
  ) {
    return noChange(model)
  }

  const change = {
    kind: 'selection-set' as const,
    nodeIds: model.document.nodes
      .filter(
        (candidate) =>
          isNodeSelectable(interactivity, candidate) &&
          candidate.hidden !== true &&
          (candidate.id === nodeId
            ? candidate.selected !== true
            : candidate.selected === true)
      )
      .map((candidate) => candidate.id),
    edgeIds: model.document.edges
      .filter((edge) => edge.selected === true)
      .map((edge) => edge.id),
  }

  const document = applySelectionSetChange(model.document, change)

  // Controlled documents publish the proposal and keep the accepted document.
  return document === undefined
    ? noChange(model)
    : report(
        model,
        {
          ...model,
          document:
            model.documentMode === 'uncontrolled' ? document : model.document,
        },
        change
      )
}

type ObserveMouseMessage = Extract<
  GraphMessageData,
  { readonly _tag: 'ObserveMouse' }
>

/**
 * React Flow `handleNodeClick`: a click selects only the node, or toggles it
 * while Meta or Control is held. The click that ends a node drag is consumed.
 */
const selectClickedNode = (
  model: Model,
  observed: ObserveMouseMessage
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => {
  if (observed.name !== 'onNodeClick') {
    return noChange(model)
  }

  if (model.nodeClickSuppressed) {
    return { model: { ...model, nodeClickSuppressed: false } }
  }

  const interactivity = selectInteractivity(model)
  const node = model.document.nodes.find(({ id }) => id === observed.nodeId)

  if (
    observed.select !== true ||
    node === undefined ||
    node.hidden === true ||
    !isNodeSelectable(interactivity, node)
  ) {
    return noChange(model)
  }

  const multi =
    observed.pointer?.metaKey === true || observed.pointer?.ctrlKey === true

  if (multi) {
    return toggleNodeSelection(model, node.id)
  }

  const change = {
    kind: 'selection-set' as const,
    nodeIds: [node.id],
    edgeIds: [],
  }

  const alreadyOnly =
    node.selected === true &&
    model.document.nodes.every(
      (candidate) => candidate.id === node.id || candidate.selected !== true
    ) &&
    model.document.edges.every((edge) => edge.selected !== true)

  const document = alreadyOnly
    ? undefined
    : applySelectionSetChange(model.document, change)

  return document === undefined
    ? noChange(model)
    : report(
        model,
        {
          ...model,
          document:
            model.documentMode === 'uncontrolled' ? document : model.document,
        },
        change
      )
}

const updateState = (
  model: Model,
  message: GraphMessageData
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> =>
  Message.match(message, {
    IgnoreInput: () => noChange(model),
    ObserveMouse: (observed) => selectClickedNode(model, observed),
    ViewportWheel: ({ deltaX, deltaY, clientX, clientY }) => {
      if (model.viewportMode === 'controlled') {
        return noChange(model)
      }

      const { viewport: currentViewport } = model
      let viewport = currentViewport

      if (model.zoomOnScroll) {
        viewport = zoomViewportAt(
          model,
          clientX,
          clientY,
          Math.exp(-deltaY * 0.002)
        )
      } else if (model.panOnScroll) {
        let scrollDelta = { x: -deltaX, y: -deltaY }

        if (model.panOnScrollMode === 'vertical') {
          scrollDelta = { x: 0, y: -deltaY }
        } else if (model.panOnScrollMode === 'horizontal') {
          scrollDelta = { x: -deltaX, y: 0 }
        }

        viewport = panViewport(model.viewport, {
          x: scrollDelta.x * model.panOnScrollSpeed,
          y: scrollDelta.y * model.panOnScrollSpeed,
        })
      }

      return acceptReplacement(model, { ...model, viewport }, 'viewport-update')
    },
    ViewportDoubleClick: ({ clientX, clientY }) => {
      if (!model.zoomOnDoubleClick || model.viewportMode === 'controlled') {
        return noChange(model)
      }

      return acceptReplacement(
        model,
        {
          ...model,
          viewport: zoomViewportAt(model, clientX, clientY, 1.2),
        },
        'viewport-update'
      )
    },
    ReplaceDocument: ({ document }) =>
      acceptReplacement(
        model,
        {
          ...model,
          document,
          measurements: measurementsForDocument(model, document),
          pendingResizeAcceptance: null,
          pointerSession: null,
          pointerClickReceipt: null,
          gestureSession: null,
          keyboardConnectionSession: null,
          keyboardResizeSession: null,
        },
        'document-update'
      ),
    ReplaceViewport: ({ viewport }) =>
      acceptReplacement(
        model,
        {
          ...model,
          viewport,
          pointerSession: null,
          pointerClickReceipt: null,
          gestureSession: null,
          keyboardConnectionSession: null,
        },
        'viewport-update'
      ),
    SetSelectionMode: ({ mode }) => ({
      model: {
        ...model,
        selectionMode: mode,
        pointerSession: null,
        pointerClickReceipt: null,
        gestureSession: null,
        keyboardConnectionSession: null,
      },
    }),
    SetInteractivity: (next) => {
      const interactivity = {
        nodesDraggable: next.nodesDraggable ?? model.nodesDraggable,
        nodesConnectable: next.nodesConnectable ?? model.nodesConnectable,
        elementsSelectable: next.elementsSelectable ?? model.elementsSelectable,
      }

      // A pending click or keyboard connection cannot finish once
      // connections are switched off, so it ends with the switch.
      return {
        model: {
          ...model,
          ...interactivity,
          keyboardConnectionSession: interactivity.nodesConnectable
            ? model.keyboardConnectionSession
            : null,
          gestureSession:
            !interactivity.elementsSelectable &&
            model.gestureSession?.kind === 'selection'
              ? null
              : model.gestureSession,
        },
      }
    },
    SetAllowedTargets: ({ targets }) => ({
      model: {
        ...model,
        allowedConnectionTargets: targets,
        pointerSession: null,
        pointerClickReceipt: null,
        gestureSession: null,
        keyboardConnectionSession: null,
      },
    }),
    DispatchCommand: ({ command }) => dispatchCommand(model, command),
    EditRequest: ({ requestId, transaction }) =>
      requestEdit(model, requestId, transaction),
    ApplyDeleteResult: ({ result }) => {
      const change: CoreFlowChange = {
        kind: 'edit-proposal',
        document: result.document,
        deletion: result.deletion,
      }

      const next = {
        ...model,
        document:
          model.documentMode === 'uncontrolled'
            ? result.document
            : model.document,
      }

      return {
        model: next,
        outMessage: OutMessage.SemanticChange({
          change,
          acceptedState:
            stateChange(model, next, 'semantic-change') ?? undefined,
        }),
      }
    },
    PointerDown: ({
      pointerId,
      clientX,
      clientY,
      nodeId,
      handleId,
      edgeId,
      endpoint,
    }) => {
      if (model.pointerSession !== null || model.gestureSession !== null) {
        return noChange(model)
      }

      if (model.nodeClickSuppressed) {
        return updateState(
          { ...model, nodeClickSuppressed: false },
          Message.PointerDown({
            pointerId,
            clientX,
            clientY,
            nodeId,
            handleId,
            direction: null,
            edgeId,
            endpoint,
          })
        )
      }

      const origin = {
        pointerId,
        startX: clientX,
        startY: clientY,
        threshold: model.connectionDragThreshold,
      }

      let pending: typeof PendingConnectionSchema.Type

      if (edgeId !== null && endpoint !== null) {
        const edge = model.document.edges.find(({ id }) => id === edgeId)
        const resolved = edge && resolveEdgeHandles(model.document, edge)

        if (
          edge === undefined ||
          resolved === undefined ||
          model.keyboardConnectionSession !== null
        ) {
          return noChange(model)
        }

        pending = {
          ...origin,
          kind: 'reconnection-pending',
          edgeId,
          endpoint,
          source: {
            nodeId: edge.source,
            handleId: resolved.sourceHandle.id,
            kind: resolved.sourceHandle.kind,
          },
          target: {
            nodeId: edge.target,
            handleId: resolved.targetHandle.id,
            kind: resolved.targetHandle.kind,
          },
        }
      } else {
        const node = model.document.nodes.find(({ id }) => id === nodeId)

        if (node === undefined) {
          return noChange(model)
        }

        if (handleId === null) {
          return isNodeDraggable(selectInteractivity(model), node)
            ? {
                model: {
                  ...model,
                  pointerClickReceipt: null,
                  pointerSession: {
                    ...(model.nodeDragThreshold === 0
                      ? {
                          kind: 'node-drag' as const,
                          ...nodeDragStart(model, node.id),
                          currentX: clientX,
                          currentY: clientY,
                        }
                      : {
                          kind: 'node-pending' as const,
                          threshold: model.nodeDragThreshold,
                        }),
                    pointerId,
                    startX: clientX,
                    startY: clientY,
                    nodeId: node.id,
                  },
                },
              }
            : noChange(model)
        }

        const handle = node.handles?.find(({ id }) => id === handleId)

        if (handle === undefined) {
          return noChange(model)
        }

        pending = {
          ...origin,
          kind: 'connection-pending',
          from: { nodeId: node.id, handleId: handle.id, kind: handle.kind },
        }
      }

      if (!pendingEligible(model, pending)) {
        return noChange(model)
      }

      const point = flowPoint(
        clientX,
        clientY,
        model.viewport,
        canvasForModel(model)
      )

      return {
        model: {
          ...model,
          pointerClickReceipt: null,
          pointerSession:
            model.connectionDragThreshold === 0
              ? activatePending(pending, point.x, point.y)
              : pending,
        },
      }
    },
    ConnectionPointerMoved: ({
      pointerId,
      clientX,
      clientY,
      autoPanDelta,
      flowX,
      flowY,
    }) => {
      let session = model.pointerSession

      if (
        session === null ||
        session.pointerId !== pointerId ||
        session.kind === 'node-drag' ||
        session.kind === 'node-pending'
      ) {
        return noChange(model)
      }

      if (
        session.kind === 'connection-pending' ||
        session.kind === 'reconnection-pending'
      ) {
        if (!pendingEligible(model, session)) {
          return {
            model: {
              ...model,
              pointerSession: null,
              pointerClickReceipt: null,
            },
          }
        }

        if (
          !connectionDragActivated(
            session.threshold,
            session.startX,
            session.startY,
            clientX,
            clientY
          )
        ) {
          return noChange(model)
        }

        session = activatePending(session, flowX, flowY)
      }

      const pointerSession =
        session.kind === 'connection'
          ? { ...session, autoPanDelta, currentX: flowX, currentY: flowY }
          : { ...session, currentX: flowX, currentY: flowY }

      return { model: { ...model, pointerSession } }
    },
    RoutedPointerClick: ({ pointerId }) => {
      const receipt = model.pointerClickReceipt

      if (receipt === null || receipt.pointerId !== pointerId) {
        return noChange(model)
      }

      const cleared = { ...model, pointerClickReceipt: null }

      if (receipt.target === null) {
        return { model: cleared }
      }

      const keyboardSession = cleared.keyboardConnectionSession

      if (
        receipt.target.kind === 'target' &&
        cleared.connectionMode === 'loose' &&
        keyboardSession?.kind === 'connection' &&
        keyboardSession.inputKind === 'keyboard'
      ) {
        return completeKeyboardConnection(
          cleared,
          keyboardSession,
          receipt.target.nodeId,
          receipt.target.handleId
        )
      }

      return updateState(
        cleared,
        Message.ClickHandle({
          nodeId: receipt.target.nodeId,
          handleId: receipt.target.handleId,
        })
      )
    },
    NodeDragMoved: (moved) => {
      const pending = model.pointerSession

      if (
        pending?.kind === 'node-drag' &&
        pending.pointerId === moved.pointerId
      ) {
        return pending.currentX === moved.clientX &&
          pending.currentY === moved.clientY
          ? noChange(model)
          : {
              model: {
                ...model,
                pointerSession: {
                  ...pending,
                  currentX: moved.clientX,
                  currentY: moved.clientY,
                },
              },
            }
      }

      if (
        pending?.kind !== 'node-pending' ||
        pending.pointerId !== moved.pointerId ||
        !nodeDragActivated(
          pending.threshold,
          pending.startX,
          pending.startY,
          moved.clientX,
          moved.clientY
        )
      ) {
        return noChange(model)
      }

      return {
        model: {
          ...model,
          pointerSession: {
            kind: 'node-drag' as const,
            pointerId: pending.pointerId,
            nodeId: pending.nodeId,
            ...nodeDragStart(model, pending.nodeId),
            startX: pending.startX,
            startY: pending.startY,
            currentX: moved.clientX,
            currentY: moved.clientY,
          },
        },
      }
    },
    ConnectionAutoPanFrame: () => {
      const session = model.pointerSession

      if (
        !model.autoPanOnConnect ||
        model.viewportMode !== 'uncontrolled' ||
        session?.kind !== 'connection' ||
        (session.autoPanDelta.x === 0 && session.autoPanDelta.y === 0)
      ) {
        return noChange(model)
      }

      return acceptReplacement(
        model,
        {
          ...model,
          viewport: panViewport(model.viewport, session.autoPanDelta),
        },
        'viewport-update'
      )
    },
    ActivateHandle: ({ nodeId, handleId }) => {
      if (!model.keyboardActivation) {
        return noChange(model)
      }

      if (model.pointerSession !== null || model.gestureSession !== null) {
        return noChange(model)
      }

      const node = model.document.nodes.find(
        (candidate) => candidate.id === nodeId
      )

      const handle = node?.handles?.find(
        (candidate) => candidate.id === handleId
      )

      const pending = model.keyboardConnectionSession

      const startable = handleStartable(model, node, handle)

      if (pending === null) {
        return handle?.kind === 'source' && startable
          ? {
              model: {
                ...model,
                keyboardConnectionSession: {
                  kind: 'connection',
                  sourceNodeId: nodeId,
                  sourceHandleId: handleId,
                  inputKind: 'keyboard',
                },
              },
            }
          : noChange(model)
      }

      if (pending.kind === 'reconnection') {
        const expectedKind = pending.endpoint === 'source' ? 'source' : 'target'

        return handle?.kind === expectedKind
          ? completeKeyboardReconnection(model, pending, nodeId, handleId)
          : { model: { ...model, keyboardConnectionSession: null } }
      }

      if (handle?.kind === 'source' && startable) {
        return {
          model: {
            ...model,
            keyboardConnectionSession: {
              kind: 'connection',
              sourceNodeId: nodeId,
              sourceHandleId: handleId,
              inputKind: 'keyboard',
            },
          },
        }
      }

      if (handle?.kind !== 'target') {
        return { model: { ...model, keyboardConnectionSession: null } }
      }

      return completeKeyboardConnection(model, pending, nodeId, handleId)
    },
    ClickHandle: ({ nodeId, handleId }) => {
      if (!model.connectOnClick) {
        return noChange(model)
      }

      const result = updateState(
        { ...model, keyboardActivation: true },
        Message.ActivateHandle({ nodeId, handleId })
      )

      const nextSession = result.model.keyboardConnectionSession

      const keyboardConnectionSession =
        nextSession?.kind === 'connection'
          ? {
              ...nextSession,
              inputKind: model.keyboardConnectionSession?.inputKind ?? 'click',
            }
          : nextSession

      return {
        ...result,
        model: {
          ...result.model,
          keyboardActivation: model.keyboardActivation,
          keyboardConnectionSession,
        },
      }
    },
    ActivateReconnect: ({ edgeId, endpoint }) => {
      if (!model.keyboardActivation) {
        return noChange(model)
      }

      if (model.pointerSession !== null || model.gestureSession !== null) {
        return noChange(model)
      }

      const edge = model.document.edges.find(
        (candidate) => candidate.id === edgeId
      )

      return edge !== undefined && canReconnectEdge(edge, endpoint)
        ? {
            model: {
              ...model,
              keyboardConnectionSession: {
                kind: 'reconnection',
                edgeId,
                endpoint,
                inputKind: 'keyboard',
              },
            },
          }
        : noChange(model)
    },
    GestureDown: ({
      pointerId,
      clientX,
      clientY,
      nodeId,
      direction,
      allowPan,
      screenX,
      screenY,
    }) => {
      if (model.gestureSession !== null || model.pointerSession !== null) {
        return noChange(model)
      }

      if (nodeId === null) {
        if (allowPan && model.panOnDrag) {
          return {
            model: {
              ...model,
              keyboardConnectionSession: null,
              gestureSession: {
                kind: 'viewport-pan',
                pointerId,
                startX: screenX,
                startY: screenY,
                currentX: screenX,
                currentY: screenY,
                viewportStart: model.viewport,
              },
            },
          }
        }

        if (!model.selectionOnDrag || !model.elementsSelectable) {
          return noChange(model)
        }

        return {
          model: {
            ...model,
            keyboardConnectionSession: null,
            gestureSession: {
              kind: 'selection',
              pointerId,
              startX: clientX,
              startY: clientY,
              currentX: clientX,
              currentY: clientY,
            },
          },
        }
      }

      if (direction === null || !model.nodesResizable) {
        return noChange(model)
      }

      const node = model.document.nodes.find(
        (candidate) => candidate.id === nodeId
      )

      if (node === undefined || node.selected !== true) {
        return noChange(model)
      }

      return {
        model: {
          ...model,
          keyboardConnectionSession: null,
          pendingResizeAcceptance: null,
          gestureSession: {
            kind: 'resize',
            pointerId,
            nodeId: node.id,
            direction,
            startX: clientX,
            startY: clientY,
            input: resizeInput(model, node, direction),
          },
        },
      }
    },
    GestureMoved: ({ pointerId, flowX, flowY, screenX, screenY }) => {
      const session = model.gestureSession

      if (session === null || session.pointerId !== pointerId) {
        return noChange(model)
      }

      if (session.kind === 'viewport-pan') {
        if (model.viewportMode === 'controlled') {
          return {
            model: {
              ...model,
              gestureSession: {
                ...session,
                currentX: screenX,
                currentY: screenY,
              },
            },
          }
        }

        return acceptReplacement(
          model,
          {
            ...model,
            viewport: {
              ...session.viewportStart,
              x: session.viewportStart.x + screenX - session.startX,
              y: session.viewportStart.y + screenY - session.startY,
            },
            gestureSession: {
              ...session,
              currentX: screenX,
              currentY: screenY,
            },
          },
          'viewport-update'
        )
      }

      if (session.kind === 'resize') {
        return {
          model: {
            ...model,
            gestureSession: {
              ...session,
              input: {
                ...session.input,
                delta: {
                  x: (screenX - session.startX) / model.viewport.zoom,
                  y: (screenY - session.startY) / model.viewport.zoom,
                },
              },
            },
          },
        }
      }

      if (session.kind !== 'selection') {
        return noChange(model)
      }

      return {
        model: {
          ...model,
          gestureSession: { ...session, currentX: flowX, currentY: flowY },
        },
      }
    },
    PointerReleased: (released) => finishPointer(model, released),
    GestureReleased: (released) => {
      const gesture = model.gestureSession

      if (gesture === null || gesture.pointerId !== released.pointerId) {
        return noChange(model)
      }

      const cleared = { ...model, gestureSession: null }

      if (gesture.kind === 'viewport-pan') {
        return { model: cleared }
      }

      if (gesture.kind === 'selection') {
        const dx = released.flowX - gesture.startX
        const dy = released.flowY - gesture.startY

        if (Math.hypot(dx, dy) < 2) {
          return { model: cleared }
        }

        const change = selectionInRect(
          createFlowGraph(
            model.document,
            getFlowMeasuredNodes(model.document, model.measurements)
          ),
          {
            x: Math.min(gesture.startX, released.flowX),
            y: Math.min(gesture.startY, released.flowY),
            width: Math.abs(dx),
            height: Math.abs(dy),
          },
          model.selectionMode
        )

        const document = applySelectionSetChange(model.document, change)

        return document === undefined
          ? { model: cleared }
          : report(
              model,
              {
                ...cleared,
                document:
                  model.documentMode === 'uncontrolled'
                    ? document
                    : model.document,
              },
              change
            )
      }

      const dx = (released.clientX - gesture.startX) / model.viewport.zoom
      const dy = (released.clientY - gesture.startY) / model.viewport.zoom

      const node = model.document.nodes.find(({ id }) => id === gesture.nodeId)

      if (node === undefined) {
        return { model: cleared }
      }

      const change = resizeProposal(model.document, node.id, {
        ...gesture.input,
        delta: { x: dx, y: dy },
      })

      if (change === undefined) {
        return { model: cleared }
      }

      const document = applyNodeBoundsChange(model.document, change)

      return document === undefined
        ? { model: cleared }
        : report(
            model,
            {
              ...cleared,
              pendingResizeAcceptance:
                model.documentMode === 'controlled'
                  ? { change, measurement: gesture.measurement }
                  : null,
              measurements:
                model.documentMode === 'uncontrolled'
                  ? measurementsForResize(
                      model,
                      document,
                      change,
                      gesture.measurement
                    )
                  : model.measurements,
              document:
                model.documentMode === 'uncontrolled'
                  ? document
                  : model.document,
            },
            change
          )
    },
    PointerCancelled: ({ pointerId }) => {
      if (model.gestureSession?.pointerId === pointerId) {
        return {
          model: { ...model, gestureSession: null },
          outMessage: OutMessage.GestureCancelled({
            kind: model.gestureSession.kind,
            reason: 'pointer-cancel',
          }),
        }
      }

      if (model.pointerSession?.pointerId === pointerId) {
        if (
          model.pointerSession.kind === 'connection-pending' ||
          model.pointerSession.kind === 'reconnection-pending'
        ) {
          return {
            model: {
              ...model,
              pointerSession: null,
              pointerClickReceipt: null,
            },
          }
        }

        return {
          model: {
            ...model,
            pointerSession: null,
            pointerClickReceipt: null,
            // A cancelled drag moved the pointer; its trailing click is no select.
            nodeClickSuppressed:
              model.nodeClickSuppressed ||
              (model.pointerSession.kind === 'node-drag' &&
                (model.pointerSession.currentX !==
                  model.pointerSession.startX ||
                  model.pointerSession.currentY !==
                    model.pointerSession.startY)),
          },
          outMessage: OutMessage.GestureCancelled({
            kind: model.pointerSession.kind,
            reason: 'pointer-cancel',
          }),
        }
      }

      return noChange(model)
    },
    CancelGesture: () => {
      let activeKind: string | undefined

      if (model.gestureSession !== null) {
        activeKind = model.gestureSession.kind
      } else if (model.pointerSession !== null) {
        activeKind = model.pointerSession.kind
      } else if (model.keyboardConnectionSession !== null) {
        activeKind = model.keyboardConnectionSession.kind
      } else if (model.keyboardResizeSession !== null) {
        activeKind = 'keyboard-resize'
      }

      const cleared = {
        ...model,
        pointerSession: null,
        pointerClickReceipt: null,
        gestureSession: null,
        keyboardConnectionSession: null,
        keyboardResizeSession: null,
        pendingResizeAcceptance: null,
        nodeClickSuppressed:
          model.nodeClickSuppressed ||
          (model.pointerSession?.kind === 'node-drag' &&
            (model.pointerSession.currentX !== model.pointerSession.startX ||
              model.pointerSession.currentY !== model.pointerSession.startY)),
      }

      if (
        activeKind === undefined ||
        activeKind === 'connection-pending' ||
        activeKind === 'reconnection-pending'
      ) {
        return { model: cleared }
      }

      return {
        model: cleared,
        outMessage: OutMessage.GestureCancelled({
          kind: activeKind,
          reason: 'cancel-gesture',
        }),
      }
    },
    MeasureNode: ({ measurement }) => {
      const resizeNodeId =
        model.gestureSession?.kind === 'resize'
          ? model.gestureSession.nodeId
          : model.keyboardResizeSession?.nodeId

      if (resizeNodeId === measurement.nodeId) {
        return {
          model: {
            ...model,
            gestureSession:
              model.gestureSession?.kind === 'resize'
                ? { ...model.gestureSession, measurement }
                : model.gestureSession,
            keyboardResizeSession:
              model.keyboardResizeSession === null
                ? null
                : { ...model.keyboardResizeSession, measurement },
          },
        }
      }

      return {
        model: {
          ...model,
          measurements: applyNodeMeasurement(
            model.document,
            model.measurements,
            measurement
          ),
        },
      }
    },
    PruneMeasurements: () => ({
      model: {
        ...model,
        measurements: pruneFlowMeasurements(model.document, model.measurements),
      },
    }),
    SelectEdge: ({ edgeId }) => {
      const edge = model.document.edges.find(
        (candidate) => candidate.id === edgeId
      )

      if (
        edge === undefined ||
        !isEdgeSelectable(selectInteractivity(model), edge)
      ) {
        return noChange(model)
      }

      const change = { kind: 'edge-selection' as const, edgeId, selected: true }
      const document = applyEdgeSelectionChange(model.document, change)

      return document === undefined
        ? noChange(model)
        : report(model, { ...model, document }, change)
    },
    ToggleNodeSelection: ({ nodeId }) => toggleNodeSelection(model, nodeId),
    // oxlint-disable-next-line complexity
    KeyboardSelectionKey: ({ key, shift, nodeId }) => {
      if (!model.keyboardActivation) {
        return noChange(model)
      }

      if (key === ' ' && shift && nodeId !== null) {
        const node = model.document.nodes.find(({ id }) => id === nodeId)

        if (
          node === undefined ||
          !model.elementsSelectable ||
          !isNodeSelectable(selectInteractivity(model), node)
        ) {
          return noChange(model)
        }

        const graphNode = createFlowGraph(
          model.document,
          getFlowMeasuredNodes(model.document, model.measurements)
        ).nodes.get(nodeId)

        const measured = getFlowMeasuredNodes(
          model.document,
          model.measurements
        ).get(nodeId)

        const size = measured ?? node.size ?? { width: 150, height: 44 }

        const startX =
          (graphNode?.absolutePosition.x ?? node.position.x) + size.width / 2

        const startY =
          (graphNode?.absolutePosition.y ?? node.position.y) + size.height / 2

        return {
          model: {
            ...model,
            gestureSession: {
              kind: 'selection',
              pointerId: -2,
              startX,
              startY,
              currentX: startX,
              currentY: startY,
            },
          },
        }
      }

      const session = model.gestureSession

      if (session?.kind === 'selection' && session.pointerId === -2) {
        if (key === 'Enter') {
          return updateState(model, Message.CommitKeyboardSelection({}))
        }

        // oxlint-disable require-readable-spacing
        const delta = (() => {
          switch (key) {
            case 'ArrowLeft': {
              return { x: -5, y: 0 }
            }

            case 'ArrowRight': {
              return { x: 5, y: 0 }
            }

            case 'ArrowUp': {
              return { x: 0, y: -5 }
            }

            case 'ArrowDown': {
              return { x: 0, y: 5 }
            }

            default: {
              return null
            }
          }
        })()
        // oxlint-enable require-readable-spacing

        return delta === null
          ? noChange(model)
          : {
              model: {
                ...model,
                gestureSession: {
                  ...session,
                  currentX: session.currentX + delta.x,
                  currentY: session.currentY + delta.y,
                },
              },
            }
      }

      if (key === ' ' && !shift && nodeId !== null) {
        return updateState(model, Message.ToggleNodeSelection({ nodeId }))
      }

      return noChange(model)
    },
    CommitKeyboardSelection: () => {
      const gesture = model.gestureSession

      if (gesture?.kind !== 'selection' || gesture.pointerId !== -2) {
        return noChange(model)
      }

      const cleared = { ...model, gestureSession: null }

      const dx = gesture.currentX - gesture.startX
      const dy = gesture.currentY - gesture.startY

      const change = selectionInRect(
        createFlowGraph(
          model.document,
          getFlowMeasuredNodes(model.document, model.measurements)
        ),
        {
          x: Math.min(gesture.startX, gesture.currentX),
          y: Math.min(gesture.startY, gesture.currentY),
          width: Math.abs(dx),
          height: Math.abs(dy),
        },
        model.selectionMode
      )

      const document = applySelectionSetChange(model.document, change)

      return document === undefined
        ? { model: cleared }
        : report(
            model,
            {
              ...cleared,
              document:
                model.documentMode === 'uncontrolled'
                  ? document
                  : model.document,
            },
            change
          )
    },
    ResizeByKeyboard: ({ nodeId, direction, delta }) => {
      if (!model.keyboardActivation || !model.nodesResizable) {
        return noChange(model)
      }

      const node = model.document.nodes.find(
        (candidate) => candidate.id === nodeId
      )

      if (node === undefined || node.selected !== true) {
        return noChange(model)
      }

      const current = model.keyboardResizeSession

      return {
        model: {
          ...model,
          pendingResizeAcceptance: null,
          keyboardResizeSession: {
            nodeId,
            direction,
            measurement:
              current?.nodeId === nodeId && current.direction === direction
                ? current.measurement
                : undefined,
            input:
              current?.nodeId === nodeId && current.direction === direction
                ? {
                    ...current.input,
                    delta: {
                      x: current.input.delta.x + delta.x,
                      y: current.input.delta.y + delta.y,
                    },
                  }
                : { ...resizeInput(model, node, direction), delta },
          },
        },
      }
    },
    FinishKeyboardResize: ({ key }) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
        return noChange(model)
      }

      const session = model.keyboardResizeSession

      if (session === null) {
        return noChange(model)
      }

      const cleared = { ...model, keyboardResizeSession: null }

      const node = model.document.nodes.find(
        (candidate) => candidate.id === session.nodeId
      )

      if (node === undefined || node.selected !== true) {
        return { model: cleared }
      }

      const change = resizeProposal(model.document, node.id, session.input)

      if (change === undefined) {
        return { model: cleared }
      }

      const document = applyNodeBoundsChange(model.document, change)

      return document === undefined
        ? { model: cleared }
        : report(
            model,
            {
              ...cleared,
              pendingResizeAcceptance:
                model.documentMode === 'controlled'
                  ? { change, measurement: session.measurement }
                  : null,
              measurements:
                model.documentMode === 'uncontrolled'
                  ? measurementsForResize(
                      model,
                      document,
                      change,
                      session.measurement
                    )
                  : model.measurements,
              document:
                model.documentMode === 'uncontrolled'
                  ? document
                  : model.document,
            },
            change
          )
    },
  })

export const update = (
  model: Model,
  message: GraphMessageData
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => {
  const result = updateState(model, message)
  const pending = result.model.pointerSession

  if (
    (pending?.kind === 'connection-pending' ||
      pending?.kind === 'reconnection-pending') &&
    !pendingEligible(result.model, pending)
  ) {
    return {
      ...result,
      model: {
        ...result.model,
        pointerSession: null,
        pointerClickReceipt: null,
      },
    }
  }

  return result
}

interface GraphTarget {
  readonly nodeId: string | null
  readonly handleId: string | null
  readonly direction: typeof NodeResizeDirectionSchema.Type | null
  readonly edgeId: EdgeId | null
  readonly endpoint: ReconnectEndpoint | null
}

const readTarget = (target: EventTarget | null): GraphTarget => {
  if (!(target instanceof Element)) {
    return {
      nodeId: null,
      handleId: null,
      direction: null,
      edgeId: null,
      endpoint: null,
    }
  }

  const node = target.closest<HTMLElement>('[data-node-id]')
  const handle = target.closest<HTMLElement>('[data-handle-id]')
  const resize = target.closest<HTMLElement>('[data-resize-direction]')
  const reconnect = target.closest<HTMLElement>('[data-edge-endpoint]')
  const directionValue = resize?.dataset.resizeDirection
  const endpointValue = reconnect?.dataset.edgeEndpoint

  const direction =
    directionValue === undefined
      ? null
      : Option.getOrNull(
          Schema.decodeUnknownOption(NodeResizeDirectionSchema)(directionValue)
        )

  const endpoint =
    endpointValue === undefined
      ? null
      : Option.getOrNull(
          Schema.decodeUnknownOption(ReconnectEndpointSchema)(endpointValue)
        )

  return {
    nodeId: node?.dataset.nodeId ?? null,
    handleId: handle?.dataset.handleId ?? null,
    direction,
    edgeId:
      reconnect?.dataset.edgeId === undefined
        ? null
        : Option.getOrNull(
            Schema.decodeUnknownOption(EdgeIdSchema)(reconnect.dataset.edgeId)
          ),
    endpoint,
  }
}

const shouldIgnoreNodePointer = (target: Element): boolean => {
  const node = target.closest<HTMLElement>('[data-node-id]')

  const markedDragHandle =
    node === null
      ? null
      : target.closest<HTMLElement>('[data-flow-drag-handle]')

  const isMarkedDragHandle =
    markedDragHandle !== null && node?.contains(markedDragHandle) === true

  const hasMarkedDragHandle =
    node !== null && node.querySelector('[data-flow-drag-handle]') !== null

  const nativeControl = target.closest(
    'input, textarea, select, button, a[href], [contenteditable="true"], [data-flow-no-drag], [data-flow-nodrag], .flow-flow__nodrag, .flow-foldkit-nodrag'
  )

  const noDragControl = target.closest(
    '[data-flow-no-drag], [data-flow-nodrag], .flow-flow__nodrag, .flow-foldkit-nodrag'
  )

  return (
    noDragControl !== null ||
    (hasMarkedDragHandle && isMarkedDragHandle === false) ||
    (nativeControl !== null && isMarkedDragHandle === false)
  )
}

const beginPointer = (
  pointerId: number,
  clientX: number,
  clientY: number,
  target: EventTarget | null,
  viewport: CoreViewport
): Option.Option<GraphMessageData> => {
  let targetElement: Element | null = null

  if (target instanceof Element) {
    targetElement = target
  }

  const interactionControl =
    targetElement === null
      ? null
      : targetElement.closest(
          '[data-handle-id], [data-resize-direction], [data-edge-endpoint]'
        )

  if (
    interactionControl === null &&
    targetElement !== null &&
    shouldIgnoreNodePointer(targetElement)
  ) {
    return Option.none()
  }

  const { nodeId, handleId, direction, edgeId, endpoint } = readTarget(target)

  let canvas: HTMLElement | null = null

  if (targetElement !== null) {
    canvas = targetElement.closest<HTMLElement>('.flow-foldkit-canvas')
  }

  const bounds = canvas?.getBoundingClientRect()
  const flowX = (clientX - (bounds?.left ?? 0) - viewport.x) / viewport.zoom
  const flowY = (clientY - (bounds?.top ?? 0) - viewport.y) / viewport.zoom

  if (edgeId !== null && endpoint !== null) {
    return Option.some(
      Message.PointerDown({
        pointerId,
        clientX,
        clientY,
        nodeId: null,
        handleId: null,
        direction: null,
        edgeId,
        endpoint,
      })
    )
  }

  if (nodeId === null) {
    return Option.some(
      Message.GestureDown({
        pointerId,
        clientX: flowX,
        clientY: flowY,
        nodeId,
        direction: null,
        allowPan:
          !(target instanceof Element) ||
          target.closest(
            '[data-flow-no-pan], .flow-flow__nopan, .flow-foldkit-nopan'
          ) === null,
        screenX: clientX,
        screenY: clientY,
      })
    )
  }

  if (direction !== null) {
    return Option.some(
      Message.GestureDown({
        pointerId,
        clientX,
        clientY,
        nodeId,
        direction,
        allowPan: false,
        screenX: clientX,
        screenY: clientY,
      })
    )
  }

  return Option.some(
    Message.PointerDown({
      pointerId,
      clientX,
      clientY,
      nodeId,
      handleId,
      direction: null,
      edgeId: null,
      endpoint: null,
    })
  )
}

export interface FoldkitEdgeGeometry {
  readonly path: string
  readonly labelPosition: { readonly x: number; readonly y: number }
  readonly start: { readonly x: number; readonly y: number }
  readonly end: { readonly x: number; readonly y: number }
  readonly markerStartId: string | undefined
  readonly markerEndId: string | undefined
  /** React Flow style EdgeProps, including endpoint node bounds for floating edges. */
  readonly props: FlowEdgeRendererProps
}

export interface FoldkitRendererRegistry {
  readonly nodeTypes?: FoldkitNodeTypes
  readonly edgeTypes?: FoldkitEdgeTypes
  readonly connectionPreview?: FoldkitConnectionPreviewRenderer
  /** Built-in connection line path; unset keeps the straight preview line. */
  readonly connectionLineType?: FlowConnectionLineType
}

export type FoldkitNodeTypes = Readonly<
  Record<string, FoldkitNodeRenderer | undefined>
>

export type FoldkitEdgeTypes = Readonly<
  Record<string, FoldkitEdgeRenderer | undefined>
>

/** `props` carries React Flow style NodeProps such as `selected` and `dragging`. */
export type FoldkitNodeRenderer = (
  node: FlowNode,
  h: FoldHtml.HtmlBuilder<GraphMessageData>,
  props: FlowNodeRendererProps
) => FoldHtml.Html

/**
 * Adds HTML to the canvas edge label layer, which sits above the edges in
 * flow coordinates and follows pan and zoom, like `<EdgeLabelRenderer />`.
 */
export type FoldkitEdgeLabelRenderer = (
  content: FoldHtml.Html | readonly FoldHtml.Html[]
) => void

/**
 * Sets the path the edge's built-in hit target follows, like the interaction
 * path React Flow's `BaseEdge` draws along a custom path. Unset, the hit
 * target follows `geometry.path`.
 */
export type FoldkitEdgeInteraction = (path: string) => void

export type FoldkitEdgeRenderer = (
  edge: FlowEdge,
  geometry: FoldkitEdgeGeometry,
  h: FoldHtml.HtmlBuilder<GraphMessageData>,
  edgeLabelRenderer: FoldkitEdgeLabelRenderer,
  edgeInteraction: FoldkitEdgeInteraction
) => FoldHtml.Html

/** `line` carries ConnectionLineComponentProps once the origin handle resolves. */
export type FoldkitConnectionPreviewRenderer = (
  state: ConnectionPreviewState,
  h: FoldHtml.HtmlBuilder<GraphMessageData>,
  line: FlowConnectionLineProps | null
) => FoldHtml.Html

const flowPointForElement = (
  element: HTMLElement,
  graph: ReturnType<typeof createFlowGraph>,
  measurements: ReadonlyMap<NodeId, MeasuredNode>
) => {
  const nodeId = element.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId

  const decodedNodeId = Option.getOrUndefined(
    Schema.decodeUnknownOption(NodeIdSchema)(nodeId)
  )

  const graphNode =
    decodedNodeId === undefined ? undefined : graph.nodes.get(decodedNodeId)

  const handle = graphNode?.node.handles?.find(
    ({ id }) => id === element.dataset.handleId
  )

  if (graphNode !== undefined && !graphNode.hidden && handle !== undefined) {
    const measured =
      measurements
        .get(graphNode.id)
        ?.handles?.find(({ handleId }) => handleId === handle.id) ??
      inferHandleMeasurement(graphNode.id, handle, graphNode.dimensions)

    return {
      x: graphNode.absolutePosition.x + measured.offset.x,
      y: graphNode.absolutePosition.y + measured.offset.y,
    }
  }
}

const handleElement = (
  canvas: HTMLElement | null,
  nodeId: string,
  handleId: string
) =>
  canvas?.querySelector<HTMLElement>(
    `[data-node-id="${CSS.escape(nodeId)}"] [data-handle-id="${CSS.escape(handleId)}"]`
  )

const defaultHandleSide = (kind: FlowHandle['kind']): FlowHandle['side'] =>
  kind === 'source' ? 'right' : 'left'

const handleOffset = (
  side: FlowHandle['side'],
  size: { readonly width: number; readonly height: number }
) => {
  let x = size.width / 2
  let y = size.height / 2

  switch (side) {
    case 'left': {
      x = 0
      break
    }

    case 'right': {
      x = size.width
      break
    }

    case 'top': {
      y = 0
      break
    }

    case 'bottom': {
      y = size.height
      break
    }

    default: {
      break
    }
  }

  return { x, y }
}

const edgePoint = (
  nodeId: NodeId,
  handleId: string,
  position: { readonly x: number; readonly y: number },
  size: { readonly width: number; readonly height: number },
  side: FlowHandle['side'],
  measured?: MeasuredHandle
) =>
  edgeAttachmentPosition(
    position,
    { id: HandleIdSchema.make(handleId), kind: 'source', side },
    measured ?? {
      nodeId,
      handleId: HandleIdSchema.make(handleId),
      offset: handleOffset(side, size),
      width: 11,
      height: 11,
    }
  )

// oxlint-disable-next-line complexity
const calculateEdgeGeometry = (
  document: FlowDocument,
  measurements: ReadonlyMap<NodeId, MeasuredNode>,
  edge: FlowEdge,
  source: FlowGraphNode,
  target: FlowGraphNode,
  markerScope: string
) => {
  const resolved = resolveEdgeHandles(document, edge)
  const sourceHandle = resolved?.sourceHandle
  const targetHandle = resolved?.targetHandle
  const sourceSide = sourceHandle?.side ?? defaultHandleSide('source')
  const targetSide = targetHandle?.side ?? defaultHandleSide('target')

  const sourceSize = measurements.get(source.node.id) ??
    source.node.size ?? { width: 150, height: 44 }

  const targetSize = measurements.get(target.node.id) ??
    target.node.size ?? { width: 150, height: 44 }

  const start = edgePoint(
    source.node.id,
    sourceHandle?.id ?? `${edge.id}-source`,
    source.absolutePosition,
    sourceSize,
    sourceSide,
    measurements
      .get(source.node.id)
      ?.handles?.find(({ handleId }) => handleId === sourceHandle?.id)
  )

  const end = edgePoint(
    target.node.id,
    targetHandle?.id ?? `${edge.id}-target`,
    target.absolutePosition,
    targetSize,
    targetSide,
    measurements
      .get(target.node.id)
      ?.handles?.find(({ handleId }) => handleId === targetHandle?.id)
  )

  const pathType: FlowEdgePath = edge.path ?? 'straight'

  const path = {
    straight: () => straightEdgePath(start, end),
    bezier: () => bezierEdgePath(start, end, sourceSide, targetSide),
    step: () => stepEdgePath(start, end, sourceSide, targetSide),
    smoothstep: () => smoothStepEdgePath(start, end, sourceSide, targetSide),
    simplebezier: () =>
      simpleBezierEdgePath(start, end, sourceSide, targetSide),
  }[pathType]()

  const markerStartId =
    edge.markerStart === undefined
      ? undefined
      : `${markerScope}-${edge.id}-start`

  const markerEndId =
    edge.markerEnd === undefined ? undefined : `${markerScope}-${edge.id}-end`

  const labelPosition = edgeLabelPosition(
    start,
    end,
    pathType,
    sourceSide,
    targetSide
  )

  const geometry: FoldkitEdgeGeometry = {
    path,
    start,
    end,
    labelPosition,
    markerStartId,
    markerEndId,
    props: flowEdgeRendererProps({
      edge,
      source: start,
      target: end,
      sourcePosition: sourceSide,
      targetPosition: targetSide,
      sourceHandleId: sourceHandle?.id ?? null,
      targetHandleId: targetHandle?.id ?? null,
      sourceNode: flowNodeBounds(source),
      targetNode: flowNodeBounds(target),
      markerStart:
        markerStartId === undefined ? undefined : `url(#${markerStartId})`,
      markerEnd: markerEndId === undefined ? undefined : `url(#${markerEndId})`,
      defaultInteractionWidth: 16,
      labelPosition,
    }),
  }

  return { geometry, markerStartId, markerEndId }
}

// oxlint-disable-next-line complexity
const connectionPreviewState = (
  model: Model
): ConnectionPreviewState | null => {
  const session = model.pointerSession

  if (session?.kind !== 'connection' && session?.kind !== 'reconnection') {
    return null
  }

  const to = { x: session.currentX, y: session.currentY }
  const canvas = canvasForModel(model)

  if (canvas === null) {
    return session.kind === 'connection'
      ? { kind: 'connect', from: to, to, candidate: null, valid: null }
      : {
          kind: 'reconnect',
          from: to,
          to,
          candidate: null,
          valid: null,
          edgeId: session.edgeId,
          endpoint: session.endpoint,
        }
  }

  const fromElement =
    session.kind === 'connection'
      ? handleElement(canvas, session.nodeId, session.sourceHandleId)
      : canvas.querySelector<HTMLElement>(
          `.flow-foldkit-reconnect-handle[data-edge-id="${CSS.escape(session.edgeId)}"][data-edge-endpoint="${session.endpoint}"]`
        )

  const measurements = getFlowMeasuredNodes(model.document, model.measurements)
  const graph = createFlowGraph(model.document, measurements)

  const reconnectEdge =
    session.kind === 'reconnection'
      ? model.document.edges.find(({ id }) => id === session.edgeId)
      : undefined

  const reconnectSource =
    reconnectEdge === undefined
      ? undefined
      : graph.nodes.get(reconnectEdge.source)

  const reconnectTarget =
    reconnectEdge === undefined
      ? undefined
      : graph.nodes.get(reconnectEdge.target)

  const reconnectGeometry =
    reconnectEdge === undefined ||
    reconnectSource === undefined ||
    reconnectTarget === undefined
      ? undefined
      : calculateEdgeGeometry(
          model.document,
          measurements,
          reconnectEdge,
          reconnectSource,
          reconnectTarget,
          'preview'
        ).geometry

  let from = to

  if (session.kind === 'reconnection') {
    from =
      reconnectGeometry?.[session.endpoint === 'source' ? 'start' : 'end'] ?? to
  } else if (fromElement !== null && fromElement !== undefined) {
    from = flowPointForElement(fromElement, graph, measurements) ?? to
  }

  const candidates = [
    ...canvas.querySelectorAll<HTMLElement>('[data-handle-id]'),
  ].flatMap((element) => {
    const { nodeId } =
      element.closest<HTMLElement>('[data-node-id]')?.dataset ?? {}

    const { handleId } = element.dataset

    const node = model.document.nodes.find(
      (candidate) => candidate.id === nodeId
    )

    const handle = node?.handles?.find((candidate) => candidate.id === handleId)

    if (
      nodeId === undefined ||
      handleId === undefined ||
      handle === undefined ||
      !connectionTargetOffered(
        model.instanceId,
        model.allowedConnectionTargets,
        nodeId
      )
    ) {
      return []
    }

    const decodedNodeId = Option.getOrNull(
      Schema.decodeUnknownOption(NodeIdSchema)(nodeId)
    )

    const decodedHandleId = Option.getOrNull(
      Schema.decodeUnknownOption(HandleIdSchema)(handleId)
    )

    const center = flowPointForElement(element, graph, measurements)

    return decodedNodeId === null ||
      decodedHandleId === null ||
      center === undefined
      ? []
      : [
          {
            nodeId: decodedNodeId,
            handleId: decodedHandleId,
            kind: handle.kind,
            center,
          },
        ]
  })

  if (session.kind === 'connection') {
    const nearest = nearestConnectionTarget({
      source: {
        source: Schema.decodeUnknownSync(NodeIdSchema)(session.nodeId),
        sourceHandle: Schema.decodeUnknownSync(HandleIdSchema)(
          session.sourceHandleId
        ),
      },
      point: to,
      candidates,
      radius: model.connectionRadius / model.viewport.zoom,
      mode: model.connectionMode,
    })

    const source = model.document.nodes.find(
      (node) => node.id === session.nodeId
    )

    const target = model.document.nodes.find(
      (node) => node.id === nearest?.nodeId
    )

    const connection =
      source === undefined || target === undefined || nearest === undefined
        ? null
        : normalizeFlowConnection(
            model.document,
            {
              source: source.id,
              sourceHandle: Schema.decodeUnknownSync(HandleIdSchema)(
                session.sourceHandleId
              ),
              target: target.id,
              targetHandle: Schema.decodeUnknownSync(HandleIdSchema)(
                nearest.handleId
              ),
            },
            model.connectionMode
          )

    const valid =
      connection === null || nearest === undefined
        ? null
        : handleGestureConnectable(
            model.document,
            {
              fromNodeId: session.nodeId,
              fromHandleId: session.sourceHandleId,
              toNodeId: nearest.nodeId,
              toHandleId: nearest.handleId,
            },
            selectInteractivity(model)
          ) &&
          Exit.isSuccess(
            Effect.runSyncExit(
              validateFlowConnection(
                model.document,
                connection,
                model.connectionMode
              )
            )
          ) &&
          connectionPermitted(
            model.instanceId,
            model.allowedConnectionTargets,
            nearest.nodeId,
            connection,
            model.document
          )

    return { kind: 'connect', from, to, candidate: connection, valid }
  }

  const edge = model.document.edges.find(({ id }) => id === session.edgeId)

  const [nearest] = candidates
    .flatMap((candidate) => {
      const distance = Math.hypot(
        candidate.center.x - to.x,
        candidate.center.y - to.y
      )

      return distance <= model.connectionRadius / model.viewport.zoom
        ? [{ ...candidate, distance }]
        : []
    })
    .toSorted((left, right) => left.distance - right.distance)

  const candidate =
    edge === undefined || nearest === undefined
      ? null
      : normalizeFlowConnection(
          model.document,
          {
            source:
              session.endpoint === 'source' ? nearest.nodeId : edge.source,
            sourceHandle:
              session.endpoint === 'source'
                ? nearest.handleId
                : Schema.decodeUnknownSync(HandleIdSchema)(
                    edge.sourceHandle ?? ''
                  ),
            target:
              session.endpoint === 'target' ? nearest.nodeId : edge.target,
            targetHandle:
              session.endpoint === 'target'
                ? nearest.handleId
                : Schema.decodeUnknownSync(HandleIdSchema)(
                    edge.targetHandle ?? ''
                  ),
          },
          model.connectionMode
        )

  const reconnected =
    edge === undefined || nearest === undefined
      ? undefined
      : Effect.runSyncExit(
          reconnectFlowEdge(
            model.document,
            session.edgeId,
            session.endpoint,
            nearest.nodeId,
            nearest.handleId,
            model.connectionMode
          )
        )

  const valid =
    reconnected === undefined || nearest === undefined
      ? null
      : Exit.isSuccess(reconnected) &&
        reconnected.value !== undefined &&
        reconnectionAllowed(
          model,
          reconnected.value,
          nearest.nodeId,
          nearest.handleId
        )

  return {
    kind: 'reconnect',
    edgeId: session.edgeId,
    endpoint: session.endpoint,
    from,
    to,
    candidate,
    valid,
  }
}

export const selectConnectionPreview = (
  model: Model
): ConnectionPreviewSnapshot =>
  createConnectionPreviewSnapshot(connectionPreviewState(model))

/** React Flow `ConnectionState` for the active pointer connection, as `useConnection` reads it. */
export const selectConnectionState = (model: Model): FlowConnectionState => {
  const session = model.pointerSession

  if (session?.kind !== 'connection' && session?.kind !== 'reconnection') {
    return flowConnectionState({
      document: model.document,
      preview: null,
    })
  }

  return flowConnectionState({
    document: model.document,
    preview: selectConnectionPreview(model),
    origin:
      session.kind === 'connection'
        ? { nodeId: session.nodeId, handleId: session.sourceHandleId }
        : undefined,
  })
}

const markerDefinition = (
  h: FoldHtml.HtmlBuilder<GraphMessageData>,
  id: string,
  marker: 'arrow' | 'arrowclosed',
  stroke: string
): NonNullable<FoldHtml.Html> => {
  const definition = h.marker(
    [
      h.Id(id),
      h.ViewBox('0 0 10 10'),
      h.RefX('10'),
      h.RefY('5'),
      h.MarkerWidth('6'),
      h.MarkerHeight('6'),
      h.MarkerUnits('strokeWidth'),
      h.Attribute('orient', 'auto-start-reverse'),
    ],
    [
      h.path([
        h.D('M 0 0 L 10 5 L 0 10'),
        h.Fill(marker === 'arrowclosed' ? stroke : 'none'),
        h.Stroke(stroke),
      ]),
    ]
  )

  if (definition === null) {
    throw new Error('Foldkit could not create an SVG marker definition')
  }

  return definition
}

const edgeVisuals = (
  edge: FlowEdge,
  geometry: FoldkitEdgeGeometry,
  markerStartId: string | undefined,
  markerEndId: string | undefined,
  renderer: FoldkitEdgeRenderer | undefined,
  h: FoldHtml.HtmlBuilder<GraphMessageData>,
  edgeLabelRenderer: FoldkitEdgeLabelRenderer
) => {
  const ariaLabel = edge.ariaLabel ?? edge.label ?? `Edge ${edge.id}`
  const stroke = edge.stroke ?? '#64748b'

  const markerDefinitions = [
    ...(markerStartId === undefined
      ? []
      : [
          markerDefinition(
            h,
            markerStartId,
            flowEdgeMarkerType(edge.markerStart) ?? 'arrow',
            stroke
          ),
        ]),
    ...(markerEndId === undefined
      ? []
      : [
          markerDefinition(
            h,
            markerEndId,
            flowEdgeMarkerType(edge.markerEnd) ?? 'arrow',
            stroke
          ),
        ]),
  ]

  let interactionPath = geometry.path

  const renderedEdge =
    renderer === undefined
      ? h.path([
          h.Class('flow-foldkit-edge-path'),
          h.D(geometry.path),
          h.Fill('none'),
          h.Stroke(stroke),
          h.StrokeWidth(String(edge.strokeWidth ?? 2)),
          ...(markerStartId === undefined
            ? []
            : [h.MarkerStart(`url(#${markerStartId})`)]),
          ...(markerEndId === undefined
            ? []
            : [h.MarkerEnd(`url(#${markerEndId})`)]),
        ])
      : renderer(edge, geometry, h, edgeLabelRenderer, (path) => {
          interactionPath = path
        })

  const hitTarget = h.path([
    h.Class('flow-foldkit-edge-hit-target'),
    h.D(interactionPath),
    h.Fill('none'),
    h.Stroke('transparent'),
    h.StrokeWidth(String(edge.interactionWidth ?? 16)),
    h.PointerEvents('stroke'),
    h.Attribute('role', edge.selectable === false ? 'img' : 'button'),
    h.Attribute('tabindex', edge.focusable === false ? '-1' : '0'),
    h.AriaLabel(ariaLabel),
    // Clicks and mouse movement are observed by the pointer resource, which
    // reads client positions and modifier keys from the native event.
    h.OnKeyDownPreventDefault((key) =>
      key === 'Enter' || key === ' '
        ? Option.some(Message.SelectEdge({ edgeId: edge.id }))
        : Option.none()
    ),
  ])

  return { markerDefinitions, content: [hitTarget, renderedEdge] }
}

const edgeReconnectControls = (
  edge: FlowEdge,
  geometry: FoldkitEdgeGeometry,
  ariaLabel: string,
  h: FoldHtml.HtmlBuilder<GraphMessageData>
): NonNullable<FoldHtml.Html>[] => {
  if (edge.selected !== true) {
    return []
  }

  const endpoints = [
    ['source', geometry.start],
    ['target', geometry.end],
  ] as const

  return endpoints.flatMap(([endpoint, point]) => {
    if (!canReconnectEdge(edge, endpoint)) {
      return []
    }

    const control = h.button([
      h.Class('flow-foldkit-reconnect-handle'),
      h.DataAttribute('edge-id', edge.id),
      h.DataAttribute('edge-endpoint', endpoint),
      h.Attribute('type', 'button'),
      h.AriaLabel(`Reconnect ${endpoint} of ${ariaLabel}`),
      h.Style({
        left: `${point.x}px`,
        top: `${point.y}px`,
        zIndex: String(
          (edge.zIndex ?? 0) + (edge.selected === true ? 1000 : 0) + 1
        ),
      }),
      h.OnKeyDownPreventDefault((key) =>
        key === 'Enter' || key === ' '
          ? Option.some(
              Message.ActivateReconnect({ edgeId: edge.id, endpoint })
            )
          : Option.none()
      ),
    ])

    return control === null ? [] : [control]
  })
}

// oxlint-disable-next-line complexity
const connectionReleaseTarget = (
  model: Pick<
    Model,
    | 'instanceId'
    | 'document'
    | 'measurements'
    | 'pointerSession'
    | 'viewport'
    | 'allowedConnectionTargets'
    | 'connectionMode'
    | 'connectionRadius'
  >,
  event: PointerReleased,
  connectionCanvas: HTMLElement
) => {
  const {
    document: flowDocument,
    pointerSession,
    viewport,
    allowedConnectionTargets,
    connectionMode,
    connectionRadius,
  } = model

  const measurements = getFlowMeasuredNodes(flowDocument, model.measurements)
  const graph = createFlowGraph(flowDocument, measurements)
  let nodeId = event.targetNodeId
  let handleId = event.targetHandleId

  if (
    pointerSession?.kind === 'connection' &&
    pointerSession.pointerId === event.pointerId &&
    !(
      nodeId === pointerSession.nodeId &&
      handleId === pointerSession.sourceHandleId
    )
  ) {
    const sourceNode = flowDocument.nodes.find(
      (node) => node.id === pointerSession.nodeId
    )

    const sourceHandle = sourceNode?.handles?.find(
      (handle) => handle.id === pointerSession.sourceHandleId
    )

    const bounds = connectionCanvas?.getBoundingClientRect()

    const point = {
      x: (event.clientX - (bounds?.left ?? 0) - viewport.x) / viewport.zoom,
      y: (event.clientY - (bounds?.top ?? 0) - viewport.y) / viewport.zoom,
    }

    const candidates = [
      ...(connectionCanvas?.querySelectorAll<HTMLElement>('[data-handle-id]') ??
        []),
    ].flatMap((element) => {
      const targetNodeElement = element.closest<HTMLElement>('[data-node-id]')

      const targetNodeId = targetNodeElement?.dataset.nodeId

      const targetHandleId = element.dataset.handleId

      const targetNode = flowDocument.nodes.find(
        (node) => node.id === targetNodeId
      )

      const targetHandle = targetNode?.handles?.find(
        (handle) => handle.id === targetHandleId
      )

      if (
        targetNodeId === undefined ||
        targetHandleId === undefined ||
        targetHandle === undefined ||
        !connectionTargetOffered(
          model.instanceId,
          allowedConnectionTargets,
          targetNodeId
        )
      ) {
        return []
      }

      const decodedNodeId = Option.getOrNull(
        Schema.decodeUnknownOption(NodeIdSchema)(targetNodeId)
      )

      const decodedHandleId = Option.getOrNull(
        Schema.decodeUnknownOption(HandleIdSchema)(targetHandleId)
      )

      const center = flowPointForElement(element, graph, measurements)

      if (
        decodedNodeId === null ||
        decodedHandleId === null ||
        center === undefined
      ) {
        return []
      }

      return [
        {
          nodeId: decodedNodeId,
          handleId: decodedHandleId,
          kind: targetHandle.kind,
          center,
        },
      ]
    })

    const nearest =
      sourceHandle === undefined
        ? undefined
        : nearestConnectionTarget({
            source: {
              source: Schema.decodeUnknownSync(NodeIdSchema)(
                pointerSession.nodeId
              ),
              sourceHandle: Schema.decodeUnknownSync(HandleIdSchema)(
                sourceHandle.id
              ),
            },
            point,
            candidates,
            radius: connectionRadius / viewport.zoom,
            mode: connectionMode,
          })

    nodeId = nearest?.nodeId ?? null

    handleId = nearest?.handleId ?? null
  }

  return { nodeId, handleId }
}

const qualifiesEscape = (event: KeyboardEvent): boolean => {
  if (event.key !== 'Escape' || event.defaultPrevented) {
    return false
  }

  const { target } = event

  const nativeControl =
    target instanceof Element
      ? target.closest(
          'input, textarea, select, button:not(.flow-foldkit-select-node), a[href], [contenteditable="true"], [data-flow-no-drag], [data-flow-nodrag]'
        )
      : null

  const interactionControl =
    target instanceof Element
      ? target.closest(
          '[data-handle-id], [data-resize-direction], [data-edge-endpoint], .flow-foldkit-select-node'
        )
      : null

  return nativeControl === null || interactionControl !== null
}

const pendingMounted = (
  pending: typeof PendingConnectionSchema.Type,
  owner: HTMLElement
): boolean => {
  const identities =
    pending.kind === 'connection-pending'
      ? [pending.from]
      : [pending.source, pending.target]

  return (
    owner.isConnected &&
    identities.every((identity) =>
      [...owner.querySelectorAll<HTMLElement>('[data-handle-id]')].some(
        (element) =>
          element.dataset.handleId === identity.handleId &&
          element.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId ===
            identity.nodeId
      )
    )
  )
}

const NodeFrameSchema = Schema.Struct({
  origin: NodeOriginSchema,
  parentIds: Schema.Array(NodeIdSchema),
  parentX: Schema.Finite,
  parentY: Schema.Finite,
})

type PointerDownMessage = Extract<GraphMessageData, { _tag: 'PointerDown' }>

type GestureDownMessage = Extract<GraphMessageData, { _tag: 'GestureDown' }>

interface OriginBase {
  readonly coordinateCanvas: HTMLElement
  admission: 'awaiting' | 'admitted' | 'retired'
}

type NativeOrigin = OriginBase &
  (
    | {
        readonly kind: 'node'
        readonly down: PointerDownMessage
        readonly captureTarget: HTMLElement
        readonly frame: typeof NodeFrameSchema.Type
        native: 'pressed' | 'released' | 'cancelled'
      }
    | {
        readonly kind: 'connection'
        readonly down: PointerDownMessage
        readonly captureTarget: HTMLElement
        native: 'pressed' | 'released' | 'cancelled' | 'click-queued'
        clickSession?: NonNullable<Model['keyboardConnectionSession']>
      }
    | {
        readonly kind: 'observed'
        readonly down: GestureDownMessage
        native: 'pressed' | 'released' | 'cancelled'
      }
  )

const nodeFrame = (
  model: Model,
  nodeId: string | null
): typeof NodeFrameSchema.Type | undefined => {
  const node = model.document.nodes.find(({ id }) => id === nodeId)

  if (
    node === undefined ||
    !isNodeDraggable(selectInteractivity(model), node)
  ) {
    return undefined
  }

  const graph = createFlowGraph(
    model.document,
    getFlowMeasuredNodes(model.document, model.measurements)
  )

  const resolved = graph.nodes.get(node.id)

  if (resolved === undefined || resolved.hidden) {
    return undefined
  }

  const parentIds: NodeId[] = []
  let { parentId } = resolved

  while (parentId !== undefined) {
    parentIds.push(parentId)
    parentId = graph.nodes.get(parentId)?.parentId
  }

  const parent =
    resolved.parentId === undefined
      ? undefined
      : graph.nodes.get(resolved.parentId)

  const origin = resolveNodeOrigin(node, model.document)

  return {
    origin: [origin[0], origin[1]],
    parentIds,
    parentX: parent?.absolutePosition.x ?? 0,
    parentY: parent?.absolutePosition.y ?? 0,
  }
}

const capturePointer = (
  captureTarget: HTMLElement,
  pointerId: number
): boolean => {
  try {
    captureTarget.setPointerCapture(pointerId)

    if (!captureTarget.hasPointerCapture(pointerId)) {
      return false
    }
  } catch (error) {
    Effect.runSync(
      Effect.logWarning('Foldkit pointer capture failed').pipe(
        Effect.annotateLogs({
          [FlowAttribute.pointerId]: pointerId,
          [FlowAttribute.failureMessage]: String(error),
        }),
        Effect.withSpan(FlowSpan.browserPointerCapture)
      )
    )

    return false
  }

  return true
}

export const NativeBarrierSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal('ReplaceDocument') }),
  Schema.Struct({ kind: Schema.Literal('ReplaceViewport') }),
  Schema.Struct({ kind: Schema.Literal('SetAllowedTargets') }),
])

export type NativeBarrier = typeof NativeBarrierSchema.Type

export const createPointerResource = (initial: Model) => {
  let current = initial
  let ready = false
  let closed = false
  let nativeCurrent: NativeOrigin | undefined
  let admittedCurrent: NativeOrigin | undefined
  let removeListeners: (() => void) | undefined

  const outstanding = new Set<NativeOrigin>()
  const origins = new WeakMap<GraphMessageData, NativeOrigin>()
  const observations = new WeakMap<GraphMessageData, 'queued' | 'consumed'>()
  const queue = Effect.runSync(Queue.unbounded<GraphMessageData>())

  const associate = (message: GraphMessageData, origin: NativeOrigin) => {
    origins.set(message, origin)

    return message
  }

  const offer = (origin: NativeOrigin, message: GraphMessageData): void => {
    if (!closed) {
      Queue.offerUnsafe(queue, associate(message, origin))
    }
  }

  const releaseCapture = (origin: NativeOrigin): void => {
    if (nativeCurrent !== origin) {
      return
    }

    nativeCurrent = undefined

    if (
      origin.kind !== 'observed' &&
      origin.captureTarget.hasPointerCapture(origin.down.pointerId)
    ) {
      origin.captureTarget.releasePointerCapture(origin.down.pointerId)
    }
  }

  const retire = (origin: NativeOrigin): void => {
    origin.admission = 'retired'
    outstanding.delete(origin)

    if (admittedCurrent === origin) {
      admittedCurrent = undefined
    }

    releaseCapture(origin)
  }

  const invalidate = (): void => {
    for (const origin of outstanding) {
      retire(origin)
    }
  }

  const close = (): void => {
    if (closed) {
      return
    }

    closed = true
    ready = false
    invalidate()
    removeListeners?.()
    Effect.runSync(
      Queue.shutdown(queue).pipe(
        Effect.withSpan(FlowSpan.browserLifecycleClose)
      )
    )
  }

  const validNode = (
    origin: Extract<NativeOrigin, { kind: 'node' }>
  ): boolean =>
    origin.captureTarget.isConnected &&
    origin.coordinateCanvas.isConnected &&
    origin.coordinateCanvas.contains(origin.captureTarget) &&
    origin.captureTarget.closest('.flow-foldkit-canvas') ===
      origin.coordinateCanvas &&
    JSON.stringify(nodeFrame(current, origin.down.nodeId)) ===
      JSON.stringify(origin.frame)

  const matchesObserved = (
    origin: Extract<NativeOrigin, { kind: 'observed' }>,
    model: Model
  ): boolean => {
    const session = model.gestureSession

    if (session === null || session.pointerId !== origin.down.pointerId) {
      return false
    }

    const expectedX =
      session.kind === 'viewport-pan'
        ? origin.down.screenX
        : origin.down.clientX

    const expectedY =
      session.kind === 'viewport-pan'
        ? origin.down.screenY
        : origin.down.clientY

    if (session.startX !== expectedX || session.startY !== expectedY) {
      return false
    }

    if (origin.down.direction !== null) {
      return (
        session.kind === 'resize' &&
        session.nodeId === origin.down.nodeId &&
        session.direction === origin.down.direction
      )
    }

    return session.kind === 'selection' || session.kind === 'viewport-pan'
  }

  const matches = (origin: NativeOrigin, model: Model): boolean => {
    if (origin.kind === 'observed') {
      return matchesObserved(origin, model)
    }

    const session = model.pointerSession

    if (
      session === null ||
      session.pointerId !== origin.down.pointerId ||
      session.startX !== origin.down.clientX ||
      session.startY !== origin.down.clientY
    ) {
      return false
    }

    if (origin.kind === 'node') {
      return (
        (session.kind === 'node-pending' || session.kind === 'node-drag') &&
        session.nodeId === origin.down.nodeId
      )
    }

    if (session.kind === 'node-pending' || session.kind === 'node-drag') {
      return false
    }

    if (origin.down.edgeId !== null) {
      return (
        (session.kind === 'reconnection' ||
          session.kind === 'reconnection-pending') &&
        session.edgeId === origin.down.edgeId &&
        session.endpoint === origin.down.endpoint
      )
    }

    return session.kind === 'connection-pending'
      ? session.from.nodeId === origin.down.nodeId &&
          session.from.handleId === origin.down.handleId
      : session.kind === 'connection' &&
          session.nodeId === origin.down.nodeId &&
          session.sourceHandleId === origin.down.handleId
  }

  const admit = (origin: NativeOrigin, previous: Model): void => {
    const before =
      origin.kind === 'observed'
        ? previous.gestureSession
        : previous.pointerSession

    const after =
      origin.kind === 'observed'
        ? current.gestureSession
        : current.pointerSession

    const phaseMatches =
      origin.kind !== 'node' ||
      current.pointerSession?.kind ===
        (current.nodeDragThreshold === 0 ? 'node-drag' : 'node-pending')

    if (before === after || !phaseMatches || !matches(origin, current)) {
      retire(origin)
    } else {
      if (admittedCurrent !== undefined && admittedCurrent !== origin) {
        retire(admittedCurrent)
      }

      admittedCurrent = origin
      origin.admission = 'admitted'
    }
  }

  const rememberClickSession = (
    origin: NativeOrigin | undefined,
    previous: Model,
    message: GraphMessageData | undefined
  ): void => {
    if (
      origin?.kind === 'connection' &&
      message !== undefined &&
      Predicate.isTagged('RoutedPointerClick')(message) &&
      current.keyboardConnectionSession !== null &&
      current.keyboardConnectionSession !== previous.keyboardConnectionSession
    ) {
      origin.clickSession = current.keyboardConnectionSession
    }
  }

  const reconcile = (input: {
    readonly previous: Model
    readonly current: Model
    readonly message?: GraphMessageData | undefined
    readonly nativeBarrier?: NativeBarrier | undefined
  }): void => {
    ;({ current } = input)
    const { message } = input
    const origin = message === undefined ? undefined : origins.get(message)

    if (message !== undefined && observations.has(message)) {
      observations.set(message, 'consumed')
    }

    if (
      input.nativeBarrier !== undefined ||
      (origin === undefined &&
        message !== undefined &&
        Predicate.isTagged('CancelGesture')(message))
    ) {
      invalidate()

      return
    }

    if (
      origin !== undefined &&
      message === origin.down &&
      origin.admission === 'awaiting'
    ) {
      admit(origin, input.previous)
    }

    rememberClickSession(origin, input.previous, message)

    for (const candidate of outstanding) {
      if (candidate.admission === 'awaiting') {
        continue
      }

      if (
        candidate.kind === 'connection' &&
        current.pointerClickReceipt?.pointerId === candidate.down.pointerId
      ) {
        continue
      }

      if (!matches(candidate, current)) {
        retire(candidate)
      }
    }
  }

  const prepareMovement = (
    message: Extract<
      GraphMessageData,
      { _tag: 'NodeDragMoved' | 'ConnectionPointerMoved' }
    >,
    origin: NativeOrigin
  ): Option.Option<GraphMessageData> => {
    const point = flowPoint(
      message.clientX,
      message.clientY,
      current.viewport,
      origin.coordinateCanvas
    )

    if (Predicate.isTagged('NodeDragMoved')(message)) {
      return Option.some(
        associate(
          Message.NodeDragMoved({
            ...message,
            flowX: point.x,
            flowY: point.y,
          }),
          origin
        )
      )
    }

    const pending = current.pointerSession

    if (
      pending !== null &&
      (pending.kind === 'connection-pending' ||
        pending.kind === 'reconnection-pending') &&
      !pendingMounted(pending, origin.coordinateCanvas)
    ) {
      return Option.some(
        associate(
          Message.PointerCancelled({ pointerId: message.pointerId }),
          origin
        )
      )
    }

    const bounds = origin.coordinateCanvas.getBoundingClientRect()

    return Option.some(
      associate(
        Message.ConnectionPointerMoved({
          ...message,
          flowX: point.x,
          flowY: point.y,
          autoPanDelta:
            origin.kind === 'connection' && origin.down.edgeId === null
              ? selectionAutoPanDelta(
                  {
                    x: message.clientX - bounds.left,
                    y: message.clientY - bounds.top,
                  },
                  origin.coordinateCanvas.clientWidth,
                  origin.coordinateCanvas.clientHeight
                )
              : { x: 0, y: 0 },
        }),
        origin
      )
    )
  }

  const brokerObservation = (
    message: Extract<GraphMessageData, { _tag: 'ObserveMouse' }>
  ): Option.Option<GraphMessageData> => {
    const deliveryState = observations.get(message)

    if (deliveryState !== undefined) {
      return deliveryState === 'queued' ? Option.some(message) : Option.none()
    }

    const { _tag: _observed, ...observation } = message
    const delivery = Message.ObserveMouse(observation)

    observations.set(delivery, 'queued')
    Queue.offerUnsafe(queue, delivery)

    return Option.none()
  }

  const prepareUnowned = (
    message: GraphMessageData
  ): Option.Option<GraphMessageData> => {
    const owned = new Set<GraphMessageData['_tag']>([
      'PointerCancelled',
      'PointerDown',
      'GestureDown',
      'NodeDragMoved',
      'ConnectionPointerMoved',
      'PointerReleased',
      'GestureMoved',
      'GestureReleased',
      'RoutedPointerClick',
    ])

    const pointerEscape =
      Predicate.isTagged('CancelGesture')(message) &&
      (nativeCurrent !== undefined || admittedCurrent !== undefined)

    return owned.has(message._tag) || pointerEscape
      ? Option.none()
      : Option.some(message)
  }

  const matchesClickCancellation = (
    origin: NativeOrigin,
    message: GraphMessageData
  ): boolean =>
    origin.kind === 'connection' &&
    Predicate.isTagged('CancelGesture')(message) &&
    origin.clickSession !== undefined &&
    current.keyboardConnectionSession === origin.clickSession &&
    current.pointerSession === null &&
    current.gestureSession === null

  const prepareInvalidNode = (
    origin: Extract<NativeOrigin, { kind: 'node' }>,
    message: GraphMessageData
  ): Option.Option<GraphMessageData> => {
    if (message === origin.down) {
      retire(origin)

      return Option.none()
    }

    return Option.some(
      associate(
        Message.PointerCancelled({ pointerId: origin.down.pointerId }),
        origin
      )
    )
  }

  const prepare = (
    message: GraphMessageData
  ): Option.Option<GraphMessageData> => {
    if (closed) {
      return Option.none()
    }

    if (
      Predicate.isTagged('ObserveMouse')(message) &&
      message.name === 'onNodeClick'
    ) {
      return brokerObservation(message)
    }

    const origin = origins.get(message)

    if (origin === undefined) {
      return prepareUnowned(message)
    }

    if (matchesClickCancellation(origin, message)) {
      return Option.some(message)
    }

    if (
      origin.admission === 'retired' ||
      (message !== origin.down && admittedCurrent !== origin)
    ) {
      return Option.none()
    }

    if (origin.kind === 'node' && !validNode(origin)) {
      return prepareInvalidNode(origin, message)
    }

    if (
      Predicate.isTagged('NodeDragMoved')(message) ||
      Predicate.isTagged('ConnectionPointerMoved')(message)
    ) {
      return prepareMovement(message, origin)
    }

    if (
      Predicate.isTagged('PointerReleased')(message) &&
      origin.kind === 'connection'
    ) {
      const target = connectionReleaseTarget(
        current,
        message,
        origin.coordinateCanvas
      )

      return Option.some(
        associate(
          Message.PointerReleased({
            ...message,
            targetNodeId: target.nodeId,
            targetHandleId: target.handleId,
          }),
          origin
        )
      )
    }

    if (
      Predicate.isTagged('GestureMoved')(message) ||
      Predicate.isTagged('GestureReleased')(message)
    ) {
      const x = Predicate.isTagged('GestureMoved')(message)
        ? message.screenX
        : message.clientX

      const y = Predicate.isTagged('GestureMoved')(message)
        ? message.screenY
        : message.clientY

      const point = flowPoint(x, y, current.viewport, origin.coordinateCanvas)

      return Option.some(
        associate(
          Predicate.isTagged('GestureMoved')(message)
            ? Message.GestureMoved({
                ...message,
                flowX: point.x,
                flowY: point.y,
              })
            : Message.GestureReleased({
                ...message,
                flowX: point.x,
                flowY: point.y,
              }),
          origin
        )
      )
    }

    return Option.some(message)
  }

  const nodePanGesture = (
    raw: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY' | 'target'>,
    canvas: HTMLElement
  ): GestureDownMessage | undefined => {
    if (
      !current.panOnDrag ||
      !(raw.target instanceof Element) ||
      raw.target.closest(
        '[data-flow-no-pan], .flow-flow__nopan, .flow-foldkit-nopan'
      ) !== null
    ) {
      return undefined
    }

    const point = flowPoint(raw.clientX, raw.clientY, current.viewport, canvas)

    return Message.GestureDown({
      pointerId: raw.pointerId,
      clientX: point.x,
      clientY: point.y,
      nodeId: null,
      direction: null,
      allowPan: true,
      screenX: raw.clientX,
      screenY: raw.clientY,
    })
  }

  const observeMouse = (record: ObservedMouse): void => {
    if (closed) {
      return
    }

    const message =
      record.kind === 'select-edge'
        ? Message.SelectEdge({
            edgeId: EdgeIdSchema.make(record.edgeId),
            pointer: record.pointer,
          })
        : Message.ObserveMouse({
            name: record.name,
            nodeId: record.nodeId,
            edgeId: record.edgeId,
            pointer: record.pointer,
            select: record.select,
          })

    // Node clicks follow the pointer release already queued here.
    observations.set(message, 'queued')
    Queue.offerUnsafe(queue, message)
  }

  const admissionOpen = (): boolean =>
    ready && !closed && nativeCurrent?.native !== 'pressed'

  const begin = (
    raw: Pick<
      PointerEvent,
      'button' | 'pointerId' | 'clientX' | 'clientY' | 'target'
    >
  ): Option.Option<never> => {
    if (!admissionOpen() || raw.button !== 0) {
      return Option.none()
    }

    const canvas = canvasForModel(current)

    if (
      canvas === null ||
      !(raw.target instanceof Element) ||
      raw.target.closest('.flow-foldkit-canvas') !== canvas
    ) {
      return Option.none()
    }

    const classified = beginPointer(
      raw.pointerId,
      raw.clientX,
      raw.clientY,
      raw.target,
      current.viewport
    )

    if (Option.isNone(classified)) {
      return Option.none()
    }

    const down = classified.value

    if (nativeCurrent !== undefined) {
      releaseCapture(nativeCurrent)
    }

    let origin: NativeOrigin

    if (Predicate.isTagged('GestureDown')(down)) {
      origin = {
        kind: 'observed',
        down,
        coordinateCanvas: canvas,
        native: 'pressed',
        admission: 'awaiting',
      }
    } else if (Predicate.isTagged('PointerDown')(down)) {
      const isNode = down.handleId === null && down.edgeId === null

      const captureTarget = isNode
        ? raw.target.closest<HTMLElement>('[data-node-id]')
        : canvas

      if (captureTarget === null) {
        return Option.none()
      }

      const frame = isNode ? nodeFrame(current, down.nodeId) : undefined

      if (isNode && frame === undefined) {
        // A node that cannot be dragged does not block the pane: with
        // panOnDrag the press pans the viewport, as in React Flow.
        const pan = nodePanGesture(raw, canvas)

        if (pan === undefined) {
          return Option.none()
        }

        origin = {
          kind: 'observed',
          down: pan,
          coordinateCanvas: canvas,
          native: 'pressed',
          admission: 'awaiting',
        }
        nativeCurrent = origin
        outstanding.add(origin)
        offer(origin, pan)

        return Option.none()
      }

      if (!capturePointer(captureTarget, down.pointerId)) {
        return Option.none()
      }

      origin =
        isNode && frame !== undefined
          ? {
              kind: 'node',
              down,
              coordinateCanvas: canvas,
              captureTarget,
              frame,
              native: 'pressed',
              admission: 'awaiting',
            }
          : {
              kind: 'connection',
              down,
              coordinateCanvas: canvas,
              captureTarget,
              native: 'pressed',
              admission: 'awaiting',
            }
    } else {
      return Option.none()
    }

    nativeCurrent = origin
    outstanding.add(origin)
    offer(origin, down)

    return Option.none()
  }

  const pressed = (event: PointerEvent) =>
    nativeCurrent?.native === 'pressed' &&
    nativeCurrent.down.pointerId === event.pointerId
      ? nativeCurrent
      : undefined

  const cancel = (origin: NativeOrigin, message: GraphMessageData): void => {
    origin.native = 'cancelled'
    offer(origin, message)
  }

  const captured = (origin: NativeOrigin): boolean =>
    origin.coordinateCanvas.isConnected &&
    (origin.kind === 'observed' ||
      (origin.captureTarget.isConnected &&
        origin.captureTarget.hasPointerCapture(origin.down.pointerId)))

  const move = (event: PointerEvent): void => {
    const origin = pressed(event)

    if (origin === undefined) {
      return
    }

    if (!captured(origin)) {
      cancel(origin, Message.PointerCancelled({ pointerId: event.pointerId }))

      return
    }

    const common = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      flowX: 0,
      flowY: 0,
    }

    switch (origin.kind) {
      case 'node': {
        offer(origin, Message.NodeDragMoved(common))

        return
      }

      case 'connection': {
        offer(
          origin,
          Message.ConnectionPointerMoved({
            ...common,
            autoPanDelta: { x: 0, y: 0 },
          })
        )

        return
      }

      case 'observed': {
        offer(
          origin,
          Message.GestureMoved({
            ...common,
            screenX: event.clientX,
            screenY: event.clientY,
          })
        )

        return
      }

      default: {
        const exhaustive: never = origin

        return exhaustive
      }
    }
  }

  const up = (event: PointerEvent): void => {
    const origin = pressed(event)

    if (origin === undefined) {
      return
    }

    if (!captured(origin)) {
      cancel(origin, Message.PointerCancelled({ pointerId: event.pointerId }))

      return
    }

    origin.native = 'released'

    const physical = origin.coordinateCanvas.ownerDocument.elementFromPoint(
      event.clientX,
      event.clientY
    )

    const target = readTarget(
      physical !== null && origin.coordinateCanvas.contains(physical)
        ? physical
        : null
    )

    offer(
      origin,
      origin.kind === 'observed'
        ? Message.GestureReleased({
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            flowX: 0,
            flowY: 0,
          })
        : Message.PointerReleased({
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            targetNodeId: target.nodeId,
            targetHandleId: target.handleId,
          })
    )
  }

  const pointerCancel = (event: PointerEvent): void => {
    const origin = pressed(event)

    if (origin !== undefined) {
      cancel(origin, Message.PointerCancelled({ pointerId: event.pointerId }))
    }
  }

  const loss = (event: PointerEvent): void => {
    const origin = pressed(event)

    if (
      origin !== undefined &&
      origin.kind !== 'observed' &&
      event.target === origin.captureTarget &&
      !origin.captureTarget.hasPointerCapture(event.pointerId)
    ) {
      pointerCancel(event)
    }
  }

  const blur = (): void => {
    if (nativeCurrent !== undefined && nativeCurrent.native !== 'cancelled') {
      cancel(nativeCurrent, Message.CancelGesture({}))
    }
  }

  const escape = (event: KeyboardEvent): void => {
    if (
      nativeCurrent !== undefined &&
      nativeCurrent.native !== 'cancelled' &&
      qualifiesEscape(event)
    ) {
      event.preventDefault()
      cancel(nativeCurrent, Message.CancelGesture({}))
    }
  }

  const click = (event: MouseEvent): void => {
    const origin = nativeCurrent

    if (
      origin?.kind !== 'connection' ||
      origin.native !== 'released' ||
      event.detail === 0 ||
      !(event.target instanceof Node) ||
      !origin.coordinateCanvas.contains(event.target) ||
      (event instanceof PointerEvent &&
        event.pointerId !== origin.down.pointerId)
    ) {
      return
    }

    event.stopImmediatePropagation()
    origin.native = 'click-queued'
    offer(
      origin,
      Message.RoutedPointerClick({ pointerId: origin.down.pointerId })
    )
  }

  const acquire = Effect.acquireRelease(
    Effect.sync(() => {
      if (closed || ready) {
        throw new Error('Pointer resource cannot be reacquired')
      }

      document.addEventListener('pointermove', move, true)
      document.addEventListener('pointerup', up, true)
      document.addEventListener('pointercancel', pointerCancel, true)
      document.addEventListener('lostpointercapture', loss, true)
      document.addEventListener('keydown', escape, true)
      document.addEventListener('click', click, true)
      window.addEventListener('blur', blur)

      const stopMouse = observeCanvasMouse(
        document,
        () => canvasForModel(current),
        observeMouse
      )

      removeListeners = () => {
        stopMouse()
        document.removeEventListener('pointermove', move, true)
        document.removeEventListener('pointerup', up, true)
        document.removeEventListener('pointercancel', pointerCancel, true)
        document.removeEventListener('lostpointercapture', loss, true)
        document.removeEventListener('keydown', escape, true)
        document.removeEventListener('click', click, true)
        window.removeEventListener('blur', blur)
      }

      ready = true

      return Stream.fromQueue(queue)
    }),
    () => Effect.sync(close)
  )

  return { begin, prepare, reconcile, acquire, close }
}

/** React Flow Handle classes: `connectable`, `connectablestart`, `connectableend`. */
const handleConnectabilityClasses = (
  interactivity: FlowInteractivity,
  node: FlowNode,
  handle: FlowHandle
): readonly string[] => {
  const connectable =
    handle.connectable ?? isNodeConnectable(interactivity, node)

  return [
    ...(connectable ? ['connectable'] : []),
    ...(isHandleConnectable(interactivity, node, handle, 'start')
      ? ['connectablestart']
      : []),
    ...(isHandleConnectable(interactivity, node, handle, 'end')
      ? ['connectableend']
      : []),
  ]
}

const nodeRendererProps = (
  model: Model,
  node: FlowNode,
  position: XYPosition,
  size: { readonly width: number; readonly height: number } | undefined
): FlowNodeRendererProps =>
  flowNodeRendererProps(node, {
    positionAbsolute: position,
    dragging:
      model.pointerSession?.kind === 'node-drag' &&
      model.pointerSession.nodeIds.includes(node.id),
    size,
  })

/** Collects one edge renderer's HTML labels into a keyed group for the label layer. */
const createEdgeLabelCollector = (
  h: FoldHtml.HtmlBuilder<GraphMessageData>,
  edgeId: string
) => {
  const items: NonNullable<FoldHtml.Html>[] = []

  const collect: FoldkitEdgeLabelRenderer = (content) => {
    for (const item of [content].flat()) {
      if (item !== null) {
        items.push(item)
      }
    }
  }

  const group = (): NonNullable<FoldHtml.Html>[] => {
    if (items.length === 0) {
      return []
    }

    const element = h.keyed('div')(
      edgeId,
      [
        h.Class('flow-foldkit-edge-label-renderer-group'),
        h.DataAttribute('edge-id', edgeId),
      ],
      items
    )

    return element === null ? [] : [element]
  }

  return { collect, group }
}

const connectionLineView = (
  model: Model,
  graph: FlowGraphView,
  connectionLineType: FlowConnectionLineType | undefined,
  previewState: ConnectionPreviewState | null
) => {
  const lineTypeAttribute = connectionLineType ?? ''

  if (previewState === null) {
    return { connectionLine: null, builtinPreviewPath: '', lineTypeAttribute }
  }

  const session = model.pointerSession

  const connectionLine =
    flowConnectionLineProps({
      graph,
      preview: previewState,
      connectionLineType: connectionLineType ?? 'straight',
      origin:
        session?.kind === 'connection'
          ? { nodeId: session.nodeId, handleId: session.sourceHandleId }
          : undefined,
    }) ?? null

  const straight = `M ${previewState.from.x} ${previewState.from.y} L ${previewState.to.x} ${previewState.to.y}`

  return {
    connectionLine,
    lineTypeAttribute,
    builtinPreviewPath:
      connectionLineType === undefined || connectionLine === null
        ? straight
        : connectionLine.path,
  }
}

const graphView = (
  renderers: FoldkitRendererRegistry,
  markerScope: string,
  pointerResource: ReturnType<typeof createPointerResource>
) =>
  Submodel.defineView<Model, GraphMessageData>((model, h) => {
    const measurements = getFlowMeasuredNodes(
      model.document,
      model.measurements
    )

    const resizeSession =
      model.gestureSession?.kind === 'resize'
        ? model.gestureSession
        : model.keyboardResizeSession

    const resizeChange =
      resizeSession === null
        ? undefined
        : resizeProposal(
            model.document,
            resizeSession.nodeId,
            resizeSession.input
          )

    const liveDocument = selectLiveDocument(model)

    const renderDocument =
      resizeChange === undefined
        ? liveDocument
        : (applyNodeBoundsChange(liveDocument, resizeChange) ?? liveDocument)

    const renderMeasurements = new Map(measurements)

    if (resizeChange !== undefined) {
      renderMeasurements.delete(resizeChange.nodeId)
    }

    const graph = createFlowGraph(renderDocument, renderMeasurements)
    const mountedNodeIds = selectMountedNodeIds(model, measurements, graph)

    const nodes = graph.orderedNodes
      .map(({ node }) => node)
      .filter((node) => mountedNodeIds.has(node.id))
      // oxlint-disable-next-line complexity
      .map((node) => {
        const position =
          graph.nodes.get(node.id)?.absolutePosition ?? node.position

        const measured = measurements.get(node.id)

        const size = measured ?? node.size

        const renderPosition = position

        const renderSize =
          resizeChange?.nodeId === node.id ? resizeChange.size : size

        const style =
          renderSize === undefined
            ? {
                left: `${renderPosition.x}px`,
                top: `${renderPosition.y}px`,
                zIndex: String(node.zIndex ?? 0),
              }
            : {
                left: `${renderPosition.x}px`,
                top: `${renderPosition.y}px`,
                width: `${renderSize.width}px`,
                height: `${renderSize.height}px`,
                zIndex: String(node.zIndex ?? 0),
              }

        const interactivity = selectInteractivity(model)

        const handles = (node.handles ?? []).map((handle) =>
          h.button([
            h.Class(
              [
                'flow-foldkit-handle',
                `flow-foldkit-handle-${handle.side}`,
                ...handleConnectabilityClasses(interactivity, node, handle),
              ].join(' ')
            ),
            h.DataAttribute('handle-id', handle.id),
            h.DataAttribute('handle-side', handle.side),
            h.AriaLabel(`${handle.kind} handle ${handle.id}`),
            h.OnClick(
              Message.ClickHandle({ nodeId: node.id, handleId: handle.id })
            ),
            h.OnKeyDownPreventDefault((key) =>
              key === 'Enter' || key === ' '
                ? Option.some(
                    Message.ActivateHandle({
                      nodeId: node.id,
                      handleId: handle.id,
                    })
                  )
                : Option.none()
            ),
          ])
        )

        const resizeHandles =
          model.nodesResizable && node.selected === true
            ? (
                [
                  'top',
                  'right',
                  'bottom',
                  'left',
                  'top-left',
                  'top-right',
                  'bottom-right',
                  'bottom-left',
                ] as const
              ).map((direction) =>
                h.button([
                  h.Class(
                    `flow-foldkit-resize flow-foldkit-resize-${direction}`
                  ),
                  h.DataAttribute('resize-direction', direction),
                  h.AriaLabel(
                    `Resize ${node.label} from ${direction.replaceAll('-', ' ')}`
                  ),
                  h.Attribute('type', 'button'),
                  h.Attribute('tabindex', '0'),
                  h.OnKeyDownPreventDefault((key) => {
                    const delta = (() => {
                      switch (key) {
                        case 'ArrowLeft': {
                          return { x: -5, y: 0 }
                        }

                        case 'ArrowRight': {
                          return { x: 5, y: 0 }
                        }

                        case 'ArrowUp': {
                          return { x: 0, y: -5 }
                        }

                        case 'ArrowDown': {
                          return { x: 0, y: 5 }
                        }

                        default: {
                          return { x: 0, y: 0 }
                        }
                      }
                    })()

                    const horizontal =
                      direction.includes('left') || direction.includes('right')

                    const vertical =
                      direction.includes('top') || direction.includes('bottom')

                    const supported =
                      (horizontal && delta.x !== 0) ||
                      (vertical && delta.y !== 0)

                    return supported
                      ? Option.some(
                          Message.ResizeByKeyboard({
                            nodeId: node.id,
                            direction,
                            delta,
                          })
                        )
                      : Option.none()
                  }),
                ])
              )
            : []

        const selectionControl =
          node.selectable === false
            ? []
            : [
                h.button([
                  h.Class('flow-foldkit-select-node'),
                  h.Attribute('type', 'button'),
                  h.AriaDisabled(!isNodeSelectable(interactivity, node)),
                  h.AriaLabel(`Toggle selection for ${node.label}`),
                  h.OnClick(Message.ToggleNodeSelection({ nodeId: node.id })),
                ]),
              ]

        const renderer =
          node.type === undefined ? undefined : renderers.nodeTypes?.[node.type]

        const contents =
          renderer === undefined
            ? [node.label]
            : [
                renderer(
                  node,
                  h,
                  nodeRendererProps(model, node, renderPosition, renderSize)
                ),
              ]

        return h.keyed('div')(
          node.id,
          [
            h.Class(
              model.pointerSession?.kind === 'node-drag' &&
                model.pointerSession.nodeIds.includes(node.id)
                ? 'flow-foldkit-node dragging'
                : 'flow-foldkit-node'
            ),
            h.DataAttribute('testid', 'flow-node'),
            h.DataAttribute('node-id', node.id),
            h.Attribute('tabindex', node.focusable === false ? '-1' : '0'),
            h.Style(style),
          ],
          [...contents, ...handles, ...resizeHandles, ...selectionControl]
        )
      })

    const edgeLabels: NonNullable<FoldHtml.Html>[] = []
    const customEdgeLabels: NonNullable<FoldHtml.Html>[] = []
    const reconnectControls: NonNullable<FoldHtml.Html>[] = []

    const visibleEdges = orderFlowEdges(
      model.document.edges.map((edge) =>
        applyDefaultEdgeOptions(edge, model.defaultEdgeOptions)
      )
    )
      .filter(
        (edge) =>
          edge.hidden !== true &&
          graph.nodes.get(edge.source)?.hidden !== true &&
          graph.nodes.get(edge.target)?.hidden !== true
      )
      .map((edge) => {
        const source = graph.nodes.get(edge.source)
        const target = graph.nodes.get(edge.target)

        if (source === undefined || target === undefined) {
          return null
        }

        const edgeGeometry = calculateEdgeGeometry(
          model.document,
          measurements,
          edge,
          source,
          target,
          markerScope
        )

        const { geometry, markerStartId, markerEndId } = edgeGeometry

        const renderer =
          edge.type === undefined ? undefined : renderers.edgeTypes?.[edge.type]

        const ariaLabel = edge.ariaLabel ?? edge.label ?? `Edge ${edge.id}`

        reconnectControls.push(
          ...edgeReconnectControls(edge, geometry, ariaLabel, h)
        )

        if (edge.label !== undefined) {
          const label = h.keyed('div')(
            edge.id,
            [
              h.Class('flow-foldkit-edge-label'),
              h.DataAttribute('edge-id', edge.id),
              h.DataAttribute('label-owner', 'host-overlay'),
              h.Style({
                left: `${geometry.labelPosition.x}px`,
                top: `${geometry.labelPosition.y}px`,
                zIndex: String(
                  (edge.zIndex ?? 0) + (edge.selected === true ? 1000 : 0)
                ),
              }),
            ],
            [edge.label]
          )

          if (label !== null) {
            edgeLabels.push(label)
          }
        }

        const htmlLabels = createEdgeLabelCollector(h, edge.id)

        const { markerDefinitions, content } = edgeVisuals(
          edge,
          geometry,
          markerStartId,
          markerEndId,
          renderer,
          h,
          htmlLabels.collect
        )

        customEdgeLabels.push(...htmlLabels.group())

        return h.keyed('svg')(
          edge.id,
          [
            h.Class('flow-foldkit-edge'),
            h.DataAttribute('edge-id', edge.id),
            h.DataAttribute('edge-type', edge.type ?? 'default'),
            h.DataAttribute('edge-path-kind', edge.path ?? 'straight'),
            h.DataAttribute('source-id', edge.source),
            h.DataAttribute('source-handle', edge.sourceHandle ?? ''),
            h.DataAttribute('target-id', edge.target),
            h.DataAttribute('target-handle', edge.targetHandle ?? ''),
            h.DataAttribute(
              'marker-start-kind',
              flowEdgeMarkerType(edge.markerStart) ?? ''
            ),
            h.DataAttribute(
              'marker-end-kind',
              flowEdgeMarkerType(edge.markerEnd) ?? ''
            ),
            h.DataAttribute('selected', String(edge.selected === true)),
            h.DataAttribute('testid', 'flow-edge'),
            h.Attribute('role', 'group'),
            h.AriaLabel(ariaLabel),
            h.Attribute('width', '960'),
            h.Attribute('height', '640'),
            h.ViewBox('0 0 960 640'),
            h.Style({
              overflow: 'visible',
              zIndex: String(
                (edge.zIndex ?? 0) + (edge.selected === true ? 1000 : 0)
              ),
            }),
          ],
          [
            ...(markerDefinitions.length === 0
              ? []
              : [h.defs([], markerDefinitions)]),
            ...content,
          ]
        )
      })

    const previewState = connectionPreviewState(model)

    const { connectionLine, builtinPreviewPath, lineTypeAttribute } =
      connectionLineView(
        model,
        graph,
        renderers.connectionLineType,
        previewState
      )

    const connectionPreview =
      previewState === null
        ? null
        : (renderers.connectionPreview?.(previewState, h, connectionLine) ??
          h.svg(
            [
              h.Class('flow-foldkit-connection-preview'),
              h.DataAttribute('preview-kind', previewState.kind),
              h.DataAttribute(
                'preview-valid',
                previewState.valid === null
                  ? 'pending'
                  : String(previewState.valid)
              ),
              h.Attribute('aria-hidden', 'true'),
              h.Attribute('width', '960'),
              h.Attribute('height', '640'),
              h.ViewBox('0 0 960 640'),
              h.Style({ overflow: 'visible', pointerEvents: 'none' }),
            ],
            [
              h.path([
                h.Class('flow-foldkit-connection-preview-path'),
                h.DataAttribute('connection-line-type', lineTypeAttribute),
                h.D(builtinPreviewPath),
                h.Fill('none'),
                h.Stroke(previewState.valid === false ? '#dc2626' : '#2563eb'),
                h.StrokeWidth('2'),
                h.StrokeDasharray('6 4'),
              ]),
            ]
          ))

    return h.div(
      [
        h.Class('flow-foldkit-canvas'),
        h.DataAttribute('flow-instance', model.instanceId),
        h.DataAttribute('testid', 'flow-canvas'),
        h.Tabindex(0),
        h.OnPointerDown(
          (
            _,
            button,
            _screenX,
            _screenY,
            _timeStamp,
            clientX,
            clientY,
            pointerId,
            target
          ) =>
            pointerResource.begin({
              button,
              pointerId,
              clientX,
              clientY,
              target,
            })
        ),
      ],
      [
        h.div(
          [
            h.Class('flow-foldkit-viewport'),
            h.Style({
              transform: `translate(${model.viewport.x}px, ${model.viewport.y}px) scale(${model.viewport.zoom})`,
            }),
          ],
          [
            ...visibleEdges.filter(
              (edge): edge is NonNullable<typeof edge> => edge !== null
            ),
            h.div(
              [
                h.Class('flow-foldkit-edge-labels'),
                h.DataAttribute('label-owner', 'host-overlay'),
              ],
              edgeLabels
            ),
            h.div(
              [
                h.Class('flow-foldkit-edge-label-renderer'),
                h.DataAttribute('testid', 'flow-edge-label-renderer'),
              ],
              customEdgeLabels
            ),
            ...nodes,
            ...reconnectControls,
            ...(connectionPreview === null ? [] : [connectionPreview]),
          ]
        ),
        ...(model.gestureSession?.kind === 'selection'
          ? [
              h.div(
                [
                  h.Class('flow-foldkit-selection-rect'),
                  h.DataAttribute('selection-mode', model.selectionMode),
                  h.Style({
                    left: `${Math.min(model.gestureSession.startX, model.gestureSession.currentX) * model.viewport.zoom + model.viewport.x}px`,
                    top: `${Math.min(model.gestureSession.startY, model.gestureSession.currentY) * model.viewport.zoom + model.viewport.y}px`,
                    width: `${Math.abs(model.gestureSession.currentX - model.gestureSession.startX) * model.viewport.zoom}px`,
                    height: `${Math.abs(model.gestureSession.currentY - model.gestureSession.startY) * model.viewport.zoom}px`,
                  }),
                ],
                []
              ),
            ]
          : []),
        h.div([h.Class('flow-foldkit-change-kinds'), h.AriaLive('polite')], []),
      ]
    )
  })

export const makeView = (
  renderers: FoldkitRendererRegistry,
  markerScope: string,
  pointerResource: ReturnType<typeof createPointerResource>
) => graphView(renderers, markerScope, pointerResource)

// oxlint-disable anti-slop(require-readable-spacing)
const PointerEvents = Subscription.make<Model, GraphMessageData>()((entry) => ({
  escapeCancellation: entry(
    { active: Schema.Boolean },
    {
      modelToDependencies: (model) => ({
        // Pointer-owned gestures cancel through the native escape handler;
        // keyboard-owned sessions, including Shift+Space rectangle selection
        // (pointerId -2), have no native owner and cancel here.
        active:
          model.pointerSession === null &&
          (model.gestureSession === null
            ? model.keyboardConnectionSession !== null ||
              model.keyboardResizeSession !== null
            : model.gestureSession.kind === 'selection' &&
              model.gestureSession.pointerId === -2),
      }),
      dependenciesToStream: ({ active }) =>
        active
          ? Subscription.fromEventFilterMapPreventDefault({
              target: document,
              type: 'keydown',
              filterMapEvent: (event): Option.Option<GraphMessageData> =>
                qualifiesEscape(event)
                  ? Option.some(Message.CancelGesture({}))
                  : Option.none(),
            })
          : Stream.empty,
    }
  ),
  viewportGestures: entry(
    {
      panOnScroll: Schema.Boolean,
      zoomOnScroll: Schema.Boolean,
      zoomOnDoubleClick: Schema.Boolean,
    },
    {
      modelToDependencies: (model) => ({
        panOnScroll: model.panOnScroll,
        zoomOnScroll: model.zoomOnScroll,
        zoomOnDoubleClick: model.zoomOnDoubleClick,
      }),
      dependenciesToStream: ({
        panOnScroll,
        zoomOnScroll,
        zoomOnDoubleClick,
      }) => {
        const events: Stream.Stream<GraphMessageData>[] = []

        if (panOnScroll || zoomOnScroll) {
          events.push(
            Subscription.fromEventFilterMapPreventDefault({
              target: document,
              type: 'wheel',
              filterMapEvent: (event): Option.Option<GraphMessageData> => {
                const { target } = event

                const canvas =
                  target instanceof Element
                    ? target.closest('.flow-foldkit-canvas')
                    : null

                const noWheel =
                  target instanceof Element
                    ? target.closest(
                        '[data-flow-no-wheel], .flow-flow__nowheel, .flow-foldkit-nowheel'
                      )
                    : null

                if (canvas === null || noWheel !== null) {
                  return Option.none()
                }

                return Option.some(
                  Message.ViewportWheel({
                    deltaX: event.deltaX,
                    deltaY: event.deltaY,
                    clientX: event.clientX,
                    clientY: event.clientY,
                  })
                )
              },
            })
          )
        }

        if (zoomOnDoubleClick) {
          events.push(
            Subscription.fromEventFilterMapPreventDefault({
              target: document,
              type: 'dblclick',
              filterMapEvent: (event): Option.Option<GraphMessageData> => {
                const { target } = event

                const canvas =
                  target instanceof Element
                    ? target.closest('.flow-foldkit-canvas')
                    : null

                const noWheel =
                  target instanceof Element
                    ? target.closest(
                        '[data-flow-no-wheel], .flow-flow__nowheel, .flow-foldkit-nowheel'
                      )
                    : null

                return canvas === null || noWheel !== null
                  ? Option.none()
                  : Option.some(
                      Message.ViewportDoubleClick({
                        clientX: event.clientX,
                        clientY: event.clientY,
                      })
                    )
              },
            })
          )
        }

        return events.length === 0
          ? Stream.empty
          : Stream.mergeAll(events, { concurrency: 'unbounded' })
      },
    }
  ),
  connectionAutoPan: Subscription.animationFrame<Model, GraphMessageData>({
    isActive: (model) => {
      const session = model.pointerSession

      return (
        model.autoPanOnConnect &&
        model.viewportMode === 'uncontrolled' &&
        session?.kind === 'connection' &&
        (session.autoPanDelta.x !== 0 || session.autoPanDelta.y !== 0)
      )
    },
    toMessage: () => Message.ConnectionAutoPanFrame({}),
  }),
  keyboardResizeEvents: entry(
    { active: Schema.Boolean },
    {
      modelToDependencies: (model) => ({
        active: model.keyboardResizeSession !== null,
      }),
      dependenciesToStream: ({ active }) =>
        active
          ? Stream.mergeAll(
              [
                Subscription.fromEvent({
                  target: document,
                  type: 'keyup',
                  mapEvent: (event: KeyboardEvent): GraphMessageData =>
                    Message.FinishKeyboardResize({ key: event.key }),
                }),
                Subscription.fromEvent({
                  target: window,
                  type: 'blur',
                  mapEvent: (): GraphMessageData => Message.CancelGesture({}),
                }),
              ],
              { concurrency: 'unbounded' }
            )
          : Stream.empty,
    }
  ),
  keyboardSelectionEvents: entry(
    { active: Schema.Boolean },
    {
      modelToDependencies: () => ({ active: true }),
      dependenciesToStream: ({ active }) =>
        active
          ? Subscription.fromEvent({
              target: document,
              type: 'keydown',
              mapEvent: (event: KeyboardEvent): GraphMessageData => {
                const { target } = event

                const nativeControl =
                  target instanceof Element
                    ? target.closest(
                        'input, textarea, select, button:not(.flow-foldkit-select-node), a[href], [contenteditable="true"], [data-flow-no-drag], [data-flow-nodrag]'
                      )
                    : null

                if (nativeControl !== null) {
                  return Message.IgnoreInput({})
                }

                const control =
                  target instanceof Element
                    ? target.closest<HTMLElement>('.flow-foldkit-select-node')
                    : null

                const nodeId =
                  control?.closest<HTMLElement>('[data-node-id]')?.dataset
                    .nodeId

                if (
                  (event.key === ' ' || event.key === 'Enter') &&
                  control !== null
                ) {
                  event.preventDefault()
                }

                return Message.KeyboardSelectionKey({
                  key: event.key,
                  shift: event.shiftKey,
                  nodeId:
                    nodeId === undefined
                      ? null
                      : Schema.decodeUnknownSync(NodeIdSchema)(nodeId),
                })
              },
            })
          : Stream.empty,
    }
  ),
}))
// oxlint-enable anti-slop(require-readable-spacing)

/** Host callbacks stay outside the schema-checked model. */
const withoutCallbacks = ({
  isValidConnection: _callback,
  ...options
}: GraphInteractionOptions) => options

export const initialModel = (
  document: FlowDocument,
  viewport: CoreViewport,
  allowedTargets: readonly string[] = [],
  documentMode: 'controlled' | 'uncontrolled' = 'uncontrolled',
  viewportMode: 'controlled' | 'uncontrolled' = 'uncontrolled',
  selectionMode: typeof SelectionModeSchema.Type = 'full',
  interactionOptions: GraphInteractionOptions = defaultInteractionOptions,
  instanceId = 'flow-foldkit-default'
): Model => ({
  instanceId,
  document,
  viewport,
  documentMode,
  viewportMode,
  allowedConnectionTargets: allowedTargets,
  ...withoutCallbacks(defaultInteractionOptions),
  ...withoutCallbacks(interactionOptions),
  ...resolveFlowInteractivity(interactionOptions),
  connectionDragThreshold: Schema.decodeUnknownSync(
    ConnectionDragThresholdSchema
  )(
    interactionOptions.connectionDragThreshold === undefined
      ? defaultConnectionDragThreshold
      : interactionOptions.connectionDragThreshold
  ),
  nodeDragThreshold: decodeNodeDragThreshold(
    interactionOptions.nodeDragThreshold
  ),
  pointerClickReceipt: null,
  panOnDrag: interactionOptions.panOnDrag ?? false,
  selectionOnDrag: interactionOptions.selectionOnDrag ?? true,
  panOnScroll: interactionOptions.panOnScroll ?? false,
  panOnScrollSpeed: interactionOptions.panOnScrollSpeed ?? 1,
  panOnScrollMode: interactionOptions.panOnScrollMode ?? 'free',
  zoomOnScroll: interactionOptions.zoomOnScroll ?? false,
  zoomOnDoubleClick: interactionOptions.zoomOnDoubleClick ?? false,
  keyboardActivation: interactionOptions.keyboardActivation ?? true,
  connectOnClick: interactionOptions.connectOnClick ?? true,
  nodesResizable: interactionOptions.nodesResizable ?? false,
  defaultEdgeOptions: Effect.runSync(
    decodeFlowDefaultEdgeOptions(interactionOptions.defaultEdgeOptions ?? {})
  ),
  measurements: emptyFlowMeasurementState(),
  pointerSession: null,
  gestureSession: null,
  keyboardConnectionSession: null,
  keyboardResizeSession: null,
  pendingResizeAcceptance: null,
  selectionMode,
  nodeClickSuppressed: false,
})

export const subscriptions = PointerEvents

export type {
  FlowChange,
  FlowCommand,
  SelectionMode,
  Viewport,
} from '@flow/core'
