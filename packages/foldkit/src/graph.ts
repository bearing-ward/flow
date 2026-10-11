import {
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
  ConnectionRadiusSchema,
  NodeIdSchema,
  HandleIdSchema,
  EdgeIdSchema,
  NodeMeasurementInputSchema,
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
  applyNodeBoundsChange,
  applySelectionSetChange,
  calculateNodeResize,
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
} from '@flow/core'
import type {
  FlowChange as CoreFlowChange,
  FlowCommand as CoreFlowCommand,
  FlowDocument,
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
  FlowDefaultEdgeOptions,
} from '@flow/core'
import { Cause, Effect, Exit, Option, Schema, Stream } from 'effect'
import { Message as FoldMessage, Submodel, Subscription } from 'foldkit'
import type { Html as FoldHtml, Update } from 'foldkit'

const PointerSessionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('node-drag'),
    pointerId: Schema.Number,
    startX: Schema.Number,
    startY: Schema.Number,
    nodeId: Schema.String,
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
    nodeId: Schema.String,
    direction: NodeResizeDirectionSchema,
    startX: Schema.Number,
    startY: Schema.Number,
    position: Schema.Struct({ x: Schema.Number, y: Schema.Number }),
    size: Schema.Struct({ width: Schema.Number, height: Schema.Number }),
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
  delta: Schema.Struct({ x: Schema.Number, y: Schema.Number }),
})

export const ModelSchema = Schema.Struct({
  instanceId: Schema.String,
  document: FlowDocumentSchema,
  viewport: ViewportSchema,
  documentMode: FlowControlModeSchema,
  viewportMode: FlowControlModeSchema,
  allowedConnectionTargets: Schema.Array(Schema.String),
  connectionMode: ConnectionModeSchema,
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
  defaultEdgeOptions: FlowDefaultEdgeOptionsSchema,
  measurements: FlowMeasurementStateSchema,
  pointerSession: Schema.NullOr(PointerSessionSchema),
  gestureSession: Schema.NullOr(GestureSessionSchema),
  keyboardConnectionSession: Schema.NullOr(KeyboardSessionSchema),
  keyboardResizeSession: Schema.NullOr(KeyboardResizeSessionSchema),
  selectionMode: SelectionModeSchema,
})

export type Model = typeof ModelSchema.Type

const canvasForInstance = (instanceId: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    `[data-flow-instance="${CSS.escape(instanceId)}"]`
  )

const canvasForModel = (model: Model): HTMLElement | null =>
  canvasForInstance(model.instanceId)

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
    'onMoveStart',
    'onMove',
    'onMoveEnd',
    'onPaneClick',
    'onSelectionContextMenu',
    'onPaneMouseEnter',
    'onPaneMouseMove',
    'onPaneMouseLeave',
    'onNodeClick',
    'onNodeMouseEnter',
    'onNodeMouseMove',
    'onNodeMouseLeave',
    'onEdgeClick',
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
    name: Schema.Literals([
      'onPaneClick',
      'onSelectionContextMenu',
      'onPaneMouseEnter',
      'onPaneMouseMove',
      'onPaneMouseLeave',
      'onNodeClick',
      'onNodeMouseEnter',
      'onNodeMouseMove',
      'onNodeMouseLeave',
      'onEdgeMouseEnter',
      'onEdgeMouseMove',
      'onEdgeMouseLeave',
    ]),
    nodeId: Schema.NullOr(Schema.String),
    edgeId: Schema.NullOr(Schema.String),
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
  ConnectionPointerMoved: {
    pointerId: Schema.Number,
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
  SelectEdge: { edgeId: EdgeIdSchema },
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
}

export const defaultInteractionOptions: GraphInteractionOptions = {
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
    targetHandle === undefined ||
    !model.allowedConnectionTargets.includes(target.id)
  ) {
    return { model: cleared }
  }

  const validated = Effect.runSyncExit(
    connectionFromHandleGesture(
      {
        document: model.document,
        fromNodeId: source.id,
        fromHandleId: sourceHandle.id,
        toNodeId: target.id,
        toHandleId: targetHandle.id,
      },
      model.connectionMode
    )
  )

  if (Exit.isFailure(validated)) {
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

  if (Exit.isFailure(exit) || exit.value === undefined) {
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

const finishNodeDrag = (
  model: Model,
  cleared: Model & { readonly pointerSession: null },
  session: Extract<NonNullable<Model['pointerSession']>, { kind: 'node-drag' }>,
  message: PointerReleased
) => {
  const node = model.document.nodes.find(
    (candidate) => candidate.id === session.nodeId
  )

  if (node === undefined) {
    return { model: cleared }
  }

  const dx = (message.clientX - session.startX) / model.viewport.zoom
  const dy = (message.clientY - session.startY) / model.viewport.zoom

  if (Math.hypot(dx, dy) < 8) {
    return { model: cleared }
  }

  const graph = createFlowGraph(
    model.document,
    getFlowMeasuredNodes(model.document, model.measurements)
  )

  const absoluteOrigin =
    graph.nodes.get(node.id)?.absolutePosition ?? node.position

  const parent =
    node.parentId === undefined ? undefined : graph.nodes.get(node.parentId)

  return setNodePosition(cleared, node.id, {
    x: absoluteOrigin.x + dx - (parent?.absolutePosition.x ?? 0),
    y: absoluteOrigin.y + dy - (parent?.absolutePosition.y ?? 0),
  })
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

const finishPointer = (model: Model, message: PointerReleased) => {
  const session = model.pointerSession

  if (session === null || session.pointerId !== message.pointerId) {
    return noChange(model)
  }

  const cleared = {
    ...model,
    pointerSession: null,
    keyboardConnectionSession: null,
  }

  const keyboardTargetClick = finishKeyboardTargetClick(model, session, message)

  if (keyboardTargetClick !== null) {
    return keyboardTargetClick
  }

  switch (session.kind) {
    case 'node-drag': {
      return finishNodeDrag(model, cleared, session, message)
    }

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

      if (Exit.isFailure(result) || result.value === undefined) {
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

export const update = (
  model: Model,
  message: GraphMessageData
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> =>
  Message.match(message, {
    IgnoreInput: () => noChange(model),
    ObserveMouse: () => noChange(model),
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
          measurements: pruneFlowMeasurements(document, model.measurements),
          pointerSession: null,
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
        gestureSession: null,
        keyboardConnectionSession: null,
      },
    }),
    SetAllowedTargets: ({ targets }) => ({
      model: {
        ...model,
        allowedConnectionTargets: targets,
        pointerSession: null,
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

      if (edgeId !== null && endpoint !== null) {
        const edge = model.document.edges.find(
          (candidate) => candidate.id === edgeId
        )

        if (edge === undefined || !canReconnectEdge(edge, endpoint)) {
          return noChange(model)
        }

        return {
          model: {
            ...model,
            pointerSession: {
              kind: 'reconnection',
              pointerId,
              startX: clientX,
              startY: clientY,
              edgeId,
              endpoint,
              currentX: flowPoint(
                clientX,
                clientY,
                model.viewport,
                canvasForModel(model)
              ).x,
              currentY: flowPoint(
                clientX,
                clientY,
                model.viewport,
                canvasForModel(model)
              ).y,
            },
          },
        }
      }

      if (nodeId === null) {
        return noChange(model)
      }

      const node = model.document.nodes.find(
        (candidate) => candidate.id === nodeId
      )

      const handle =
        handleId === null
          ? undefined
          : node?.handles?.find((candidate) => candidate.id === handleId)

      if (handleId === null && node?.draggable === false) {
        return noChange(model)
      }

      if (
        handleId !== null &&
        (handle === undefined ||
          (model.connectionMode === 'strict' && handle.kind !== 'source'))
      ) {
        return noChange(model)
      }

      return {
        model: {
          ...model,
          pointerSession:
            handleId === null
              ? {
                  kind: 'node-drag',
                  pointerId,
                  startX: clientX,
                  startY: clientY,
                  nodeId,
                }
              : {
                  kind: 'connection',
                  pointerId,
                  startX: clientX,
                  startY: clientY,
                  nodeId,
                  sourceHandleId: handleId,
                  autoPanDelta: { x: 0, y: 0 },
                  currentX: flowPoint(
                    clientX,
                    clientY,
                    model.viewport,
                    canvasForModel(model)
                  ).x,
                  currentY: flowPoint(
                    clientX,
                    clientY,
                    model.viewport,
                    canvasForModel(model)
                  ).y,
                },
        },
      }
    },
    ConnectionPointerMoved: ({ pointerId, autoPanDelta, flowX, flowY }) => {
      const session = model.pointerSession

      if (
        session === null ||
        session.pointerId !== pointerId ||
        (session.kind !== 'connection' && session.kind !== 'reconnection')
      ) {
        return noChange(model)
      }

      const pointerSession =
        session.kind === 'connection'
          ? { ...session, autoPanDelta, currentX: flowX, currentY: flowY }
          : { ...session, currentX: flowX, currentY: flowY }

      return { model: { ...model, pointerSession } }
    },
    NodeDragMoved: () => noChange(model),
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

      if (pending === null) {
        return handle?.kind === 'source'
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

      if (handle?.kind === 'source') {
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

      const result = update(
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

        if (!model.selectionOnDrag) {
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

      if (direction === null) {
        return noChange(model)
      }

      const node = model.document.nodes.find(
        (candidate) => candidate.id === nodeId
      )

      if (node === undefined || node.selected !== true) {
        return noChange(model)
      }

      const measured = getFlowMeasuredNodes(
        model.document,
        model.measurements
      ).get(node.id)

      const size = measured ?? node.size ?? { width: 150, height: 44 }

      const position =
        createFlowGraph(
          model.document,
          getFlowMeasuredNodes(model.document, model.measurements)
        ).nodes.get(node.id)?.absolutePosition ?? node.position

      return {
        model: {
          ...model,
          keyboardConnectionSession: null,
          gestureSession: {
            kind: 'resize',
            pointerId,
            nodeId,
            direction,
            startX: clientX,
            startY: clientY,
            position,
            size,
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

      const result = calculateNodeResize({
        direction: gesture.direction,
        positionStart: gesture.position,
        sizeStart: gesture.size,
        delta: { x: dx, y: dy },
        minimumSize: { width: 40, height: 24 },
      })

      const node = model.document.nodes.find(({ id }) => id === gesture.nodeId)

      if (node === undefined || result.boundsIssues.length > 0) {
        return { model: cleared }
      }

      const childPositions = model.document.nodes
        .filter(({ parentId }) => parentId === node.id)
        .map((child) => ({
          nodeId: child.id,
          position: {
            x: child.position.x + result.childrenPositionDelta.x,
            y: child.position.y + result.childrenPositionDelta.y,
          },
        }))

      const change = {
        kind: 'node-bounds' as const,
        nodeId: node.id,
        position: result.position,
        size: result.size,
        childPositions,
      }

      const document = applyNodeBoundsChange(model.document, change)

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
        return {
          model: { ...model, pointerSession: null },
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
        gestureSession: null,
        keyboardConnectionSession: null,
        keyboardResizeSession: null,
      }

      if (activeKind === undefined) {
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
    MeasureNode: ({ measurement }) => ({
      model: {
        ...model,
        measurements: applyNodeMeasurement(
          model.document,
          model.measurements,
          measurement
        ),
      },
    }),
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

      if (edge === undefined || edge.selectable === false) {
        return noChange(model)
      }

      const change = { kind: 'edge-selection' as const, edgeId, selected: true }
      const document = applyEdgeSelectionChange(model.document, change)

      return document === undefined
        ? noChange(model)
        : report(model, { ...model, document }, change)
    },
    ToggleNodeSelection: ({ nodeId }) => {
      const node = model.document.nodes.find(
        (candidate) => candidate.id === nodeId
      )

      if (
        node === undefined ||
        node.selectable === false ||
        node.hidden === true
      ) {
        return noChange(model)
      }

      const change = {
        kind: 'selection-set' as const,
        nodeIds: model.document.nodes
          .filter(
            (candidate) =>
              candidate.selectable !== false &&
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

      return document === undefined
        ? noChange(model)
        : report(model, { ...model, document }, change)
    },
    // oxlint-disable-next-line complexity
    KeyboardSelectionKey: ({ key, shift, nodeId }) => {
      if (!model.keyboardActivation) {
        return noChange(model)
      }

      if (key === ' ' && shift && nodeId !== null) {
        const node = model.document.nodes.find(({ id }) => id === nodeId)

        if (node === undefined || node.selectable === false) {
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
          return update(model, Message.CommitKeyboardSelection({}))
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
        return update(model, Message.ToggleNodeSelection({ nodeId }))
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
      if (!model.keyboardActivation) {
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
          keyboardResizeSession: {
            nodeId,
            direction,
            delta:
              current?.nodeId === nodeId && current.direction === direction
                ? { x: current.delta.x + delta.x, y: current.delta.y + delta.y }
                : delta,
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

      const measured = getFlowMeasuredNodes(
        model.document,
        model.measurements
      ).get(node.id)

      const size = measured ?? node.size ?? { width: 150, height: 44 }
      const { position } = node

      const result = calculateNodeResize({
        direction: session.direction,
        positionStart: position,
        sizeStart: size,
        delta: session.delta,
        minimumSize: { width: 40, height: 24 },
      })

      if (result.boundsIssues.length > 0) {
        return noChange(model)
      }

      const change = {
        kind: 'node-bounds' as const,
        nodeId: node.id,
        position: result.position,
        size: result.size,
        childPositions: model.document.nodes
          .filter((child) => child.parentId === node.id)
          .map((child) => ({
            nodeId: child.id,
            position: {
              x: child.position.x + result.childrenPositionDelta.x,
              y: child.position.y + result.childrenPositionDelta.y,
            },
          })),
      }

      const document = applyNodeBoundsChange(model.document, change)

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
  })

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
) => {
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
}

export interface FoldkitRendererRegistry {
  readonly nodeTypes?: Readonly<Record<string, FoldkitNodeRenderer | undefined>>
  readonly edgeTypes?: Readonly<Record<string, FoldkitEdgeRenderer | undefined>>
  readonly connectionPreview?: FoldkitConnectionPreviewRenderer
}

export type FoldkitNodeRenderer = (
  node: FlowNode,
  h: FoldHtml.HtmlBuilder<GraphMessageData>
) => FoldHtml.Html

export type FoldkitEdgeRenderer = (
  edge: FlowEdge,
  geometry: FoldkitEdgeGeometry,
  h: FoldHtml.HtmlBuilder<GraphMessageData>
) => FoldHtml.Html

export type FoldkitConnectionPreviewRenderer = (
  state: ConnectionPreviewState,
  h: FoldHtml.HtmlBuilder<GraphMessageData>
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

  const geometry: FoldkitEdgeGeometry = {
    path,
    start,
    end,
    labelPosition: edgeLabelPosition(
      start,
      end,
      pathType,
      sourceSide,
      targetSide
    ),
    markerStartId,
    markerEndId,
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
      !model.allowedConnectionTargets.includes(nodeId)
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
      connection === null
        ? null
        : Exit.isSuccess(
            Effect.runSyncExit(
              validateFlowConnection(
                model.document,
                connection,
                model.connectionMode
              )
            )
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

  const valid =
    edge === undefined || nearest === undefined
      ? null
      : Exit.isSuccess(
          Effect.runSyncExit(
            reconnectFlowEdge(
              model.document,
              session.edgeId,
              session.endpoint,
              nearest.nodeId,
              nearest.handleId,
              model.connectionMode
            )
          )
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
  h: FoldHtml.HtmlBuilder<GraphMessageData>
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
            edge.markerStart ?? 'arrow',
            stroke
          ),
        ]),
    ...(markerEndId === undefined
      ? []
      : [markerDefinition(h, markerEndId, edge.markerEnd ?? 'arrow', stroke)]),
  ]

  const hitTarget = h.path([
    h.Class('flow-foldkit-edge-hit-target'),
    h.D(geometry.path),
    h.Fill('none'),
    h.Stroke('transparent'),
    h.StrokeWidth(String(edge.interactionWidth ?? 16)),
    h.PointerEvents('stroke'),
    h.Attribute('role', edge.selectable === false ? 'img' : 'button'),
    h.Attribute('tabindex', edge.focusable === false ? '-1' : '0'),
    h.AriaLabel(ariaLabel),
    h.OnClick(Message.SelectEdge({ edgeId: edge.id }), {
      propagation: 'Stop',
    }),
    h.OnMouseEnter(
      Message.ObserveMouse({
        name: 'onEdgeMouseEnter',
        nodeId: null,
        edgeId: edge.id,
      })
    ),
    h.OnMouseMove(
      Message.ObserveMouse({
        name: 'onEdgeMouseMove',
        nodeId: null,
        edgeId: edge.id,
      })
    ),
    h.OnMouseLeave(
      Message.ObserveMouse({
        name: 'onEdgeMouseLeave',
        nodeId: null,
        edgeId: edge.id,
      })
    ),
    h.OnKeyDownPreventDefault((key) =>
      key === 'Enter' || key === ' '
        ? Option.some(Message.SelectEdge({ edgeId: edge.id }))
        : Option.none()
    ),
  ])

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
      : renderer(edge, geometry, h)

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
      h.Style({ left: `${point.x}px`, top: `${point.y}px` }),
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

const graphView = (
  renderers: FoldkitRendererRegistry = {},
  markerScope = 'flow-foldkit'
) =>
  Submodel.defineView<Model, GraphMessageData>((model, h) => {
    const measurements = getFlowMeasuredNodes(
      model.document,
      model.measurements
    )

    const graph = createFlowGraph(model.document, measurements)
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

        const keyboardResize = model.keyboardResizeSession

        const keyboardResizeResult =
          keyboardResize?.nodeId === node.id
            ? calculateNodeResize({
                direction: keyboardResize.direction,
                positionStart: node.position,
                sizeStart: size ?? { width: 150, height: 44 },
                delta: keyboardResize.delta,
                minimumSize: { width: 40, height: 24 },
              })
            : undefined

        const renderPosition = keyboardResizeResult?.position ?? position
        const renderSize = keyboardResizeResult?.size ?? size

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

        const handles = (node.handles ?? []).map((handle) =>
          h.button([
            h.Class(`flow-foldkit-handle flow-foldkit-handle-${handle.side}`),
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
          node.selected === true
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
                  h.AriaLabel(`Toggle selection for ${node.label}`),
                  h.OnClick(Message.ToggleNodeSelection({ nodeId: node.id })),
                ]),
              ]

        const renderer =
          node.type === undefined ? undefined : renderers.nodeTypes?.[node.type]

        const contents =
          renderer === undefined ? [node.label] : [renderer(node, h)]

        return h.keyed('div')(
          node.id,
          [
            h.Class('flow-foldkit-node'),
            h.DataAttribute('testid', 'flow-node'),
            h.DataAttribute('node-id', node.id),
            h.Attribute('tabindex', node.focusable === false ? '-1' : '0'),
            h.Style(style),
            h.OnClick(
              Message.ObserveMouse({
                name: 'onNodeClick',
                nodeId: node.id,
                edgeId: null,
              }),
              { propagation: 'Stop' }
            ),
            h.OnMouseEnter(
              Message.ObserveMouse({
                name: 'onNodeMouseEnter',
                nodeId: node.id,
                edgeId: null,
              })
            ),
            h.OnMouseMove(
              Message.ObserveMouse({
                name: 'onNodeMouseMove',
                nodeId: node.id,
                edgeId: null,
              })
            ),
            h.OnMouseLeave(
              Message.ObserveMouse({
                name: 'onNodeMouseLeave',
                nodeId: node.id,
                edgeId: null,
              })
            ),
          ],
          [...contents, ...handles, ...resizeHandles, ...selectionControl]
        )
      })

    const edgeLabels: NonNullable<FoldHtml.Html>[] = []

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

        edgeLabels.push(...edgeReconnectControls(edge, geometry, ariaLabel, h))

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

        const { markerDefinitions, content } = edgeVisuals(
          edge,
          geometry,
          markerStartId,
          markerEndId,
          renderer,
          h
        )

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
            h.DataAttribute('marker-start-kind', edge.markerStart ?? ''),
            h.DataAttribute('marker-end-kind', edge.markerEnd ?? ''),
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

    const connectionPreview =
      previewState === null
        ? null
        : (renderers.connectionPreview?.(previewState, h) ??
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
                h.D(
                  `M ${previewState.from.x} ${previewState.from.y} L ${previewState.to.x} ${previewState.to.y}`
                ),
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
        h.OnClick(
          Message.ObserveMouse({
            name: 'onPaneClick',
            nodeId: null,
            edgeId: null,
          })
        ),
        h.OnMouseEnter(
          Message.ObserveMouse({
            name: 'onPaneMouseEnter',
            nodeId: null,
            edgeId: null,
          })
        ),
        h.OnMouseMove(
          Message.ObserveMouse({
            name: 'onPaneMouseMove',
            nodeId: null,
            edgeId: null,
          })
        ),
        h.OnMouseLeave(
          Message.ObserveMouse({
            name: 'onPaneMouseLeave',
            nodeId: null,
            edgeId: null,
          })
        ),
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
            button === 0
              ? beginPointer(
                  pointerId,
                  clientX,
                  clientY,
                  target,
                  model.viewport
                )
              : Option.none()
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
            ...nodes,
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
  renderers?: FoldkitRendererRegistry,
  markerScope?: string
) => graphView(renderers, markerScope)

// oxlint-disable anti-slop(require-readable-spacing)
const PointerEvents = Subscription.make<Model, GraphMessageData>()((entry) => ({
  pointerEvents: entry(
    {
      active: Schema.Boolean,
      gestureActive: Schema.Boolean,
      viewport: ViewportSchema,
      document: FlowDocumentSchema,
      measurements: FlowMeasurementStateSchema,
      pointerSession: Schema.NullOr(PointerSessionSchema),
      connectionMode: ConnectionModeSchema,
      connectionRadius: ConnectionRadiusSchema,
      allowedConnectionTargets: Schema.Array(Schema.String),
      instanceId: Schema.String,
    },
    {
      modelToDependencies: (model) => ({
        active: model.pointerSession !== null || model.gestureSession !== null,
        gestureActive: model.gestureSession !== null,
        viewport: model.viewport,
        document: model.document,
        measurements: model.measurements,
        pointerSession: model.pointerSession,
        connectionMode: model.connectionMode,
        connectionRadius: model.connectionRadius,
        allowedConnectionTargets: model.allowedConnectionTargets,
        instanceId: model.instanceId,
      }),
      dependenciesToStream: ({
        active,
        gestureActive,
        viewport,
        document: flowDocument,
        measurements: measurementState,
        pointerSession,
        connectionMode,
        connectionRadius,
        allowedConnectionTargets,
        instanceId,
      }) => {
        if (!active) {
          return Stream.empty
        }

        const measurements = getFlowMeasuredNodes(
          flowDocument,
          measurementState
        )

        const graph = createFlowGraph(flowDocument, measurements)

        const events: Stream.Stream<GraphMessageData>[] = [
          Subscription.fromEvent({
            target: window,
            type: 'blur',
            mapEvent: (): GraphMessageData => Message.CancelGesture({}),
          }),
          Subscription.fromEvent({
            target: document,
            type: 'pointerup',
            // oxlint-disable-next-line complexity
            mapEvent: (event: PointerEvent): GraphMessageData => {
              let { nodeId, handleId } = readTarget(event.target)

              const connectionCanvas = canvasForInstance(instanceId)

              if (
                !(event.target instanceof Node) ||
                connectionCanvas === null ||
                !connectionCanvas.contains(event.target)
              ) {
                nodeId = null
                handleId = null
              }

              if (
                pointerSession?.kind === 'connection' &&
                pointerSession.pointerId === event.pointerId
              ) {
                const sourceNode = flowDocument.nodes.find(
                  (node) => node.id === pointerSession.nodeId
                )

                const sourceHandle = sourceNode?.handles?.find(
                  (handle) => handle.id === pointerSession.sourceHandleId
                )

                const bounds = connectionCanvas?.getBoundingClientRect()

                const point = {
                  x:
                    (event.clientX - (bounds?.left ?? 0) - viewport.x) /
                    viewport.zoom,
                  y:
                    (event.clientY - (bounds?.top ?? 0) - viewport.y) /
                    viewport.zoom,
                }

                const candidates = [
                  ...(connectionCanvas?.querySelectorAll<HTMLElement>(
                    '[data-handle-id]'
                  ) ?? []),
                ].flatMap((element) => {
                  const targetNodeElement =
                    element.closest<HTMLElement>('[data-node-id]')

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
                    !allowedConnectionTargets.includes(targetNodeId)
                  ) {
                    return []
                  }

                  const decodedNodeId = Option.getOrNull(
                    Schema.decodeUnknownOption(NodeIdSchema)(targetNodeId)
                  )

                  const decodedHandleId = Option.getOrNull(
                    Schema.decodeUnknownOption(HandleIdSchema)(targetHandleId)
                  )

                  const center = flowPointForElement(
                    element,
                    graph,
                    measurements
                  )

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
                          sourceHandle: Schema.decodeUnknownSync(
                            HandleIdSchema
                          )(sourceHandle.id),
                        },
                        point,
                        candidates,
                        radius: connectionRadius / viewport.zoom,
                        mode: connectionMode,
                      })

                nodeId = nearest?.nodeId ?? null

                handleId = nearest?.handleId ?? null
              }

              if (!gestureActive) {
                return Message.PointerReleased({
                  pointerId: event.pointerId,
                  clientX: event.clientX,
                  clientY: event.clientY,
                  targetNodeId: nodeId,
                  targetHandleId: handleId,
                })
              }

              const canvas = document.querySelector<HTMLElement>(
                '.flow-foldkit-canvas'
              )

              const bounds = canvas?.getBoundingClientRect()

              return Message.GestureReleased({
                pointerId: event.pointerId,
                flowX:
                  (event.clientX - (bounds?.left ?? 0) - viewport.x) /
                  viewport.zoom,
                flowY:
                  (event.clientY - (bounds?.top ?? 0) - viewport.y) /
                  viewport.zoom,
                clientX: event.clientX,
                clientY: event.clientY,
              })
            },
          }),
          Subscription.fromEvent({
            target: document,
            type: 'pointercancel',
            mapEvent: (event: PointerEvent) =>
              Message.PointerCancelled({ pointerId: event.pointerId }),
          }),
          Subscription.fromEvent({
            target: document,
            type: 'lostpointercapture',
            mapEvent: (event: PointerEvent) =>
              Message.PointerCancelled({ pointerId: event.pointerId }),
          }),
        ]

        if (gestureActive) {
          events.push(
            Subscription.fromEvent({
              target: document,
              type: 'pointermove',
              mapEvent: (event: PointerEvent) => {
                const canvas = document.querySelector<HTMLElement>(
                  '.flow-foldkit-canvas'
                )

                const bounds = canvas?.getBoundingClientRect()

                return Message.GestureMoved({
                  pointerId: event.pointerId,
                  flowX:
                    (event.clientX - (bounds?.left ?? 0) - viewport.x) /
                    viewport.zoom,
                  flowY:
                    (event.clientY - (bounds?.top ?? 0) - viewport.y) /
                    viewport.zoom,
                  screenX: event.clientX,
                  screenY: event.clientY,
                })
              },
            })
          )
        }

        if (pointerSession?.kind === 'node-drag') {
          events.push(
            Subscription.fromEvent({
              target: document,
              type: 'pointermove',
              mapEvent: (event: PointerEvent): GraphMessageData => {
                const canvas = document.querySelector<HTMLElement>(
                  '.flow-foldkit-canvas'
                )

                const bounds = canvas?.getBoundingClientRect()

                return Message.NodeDragMoved({
                  pointerId: event.pointerId,
                  flowX:
                    (event.clientX - (bounds?.left ?? 0) - viewport.x) /
                    viewport.zoom,
                  flowY:
                    (event.clientY - (bounds?.top ?? 0) - viewport.y) /
                    viewport.zoom,
                })
              },
            })
          )
        }

        if (
          pointerSession?.kind === 'connection' ||
          pointerSession?.kind === 'reconnection'
        ) {
          events.push(
            Subscription.fromEvent({
              target: document,
              type: 'pointermove',
              mapEvent: (event: PointerEvent) => {
                const canvas = canvasForInstance(instanceId)

                const bounds = canvas?.getBoundingClientRect()

                return Message.ConnectionPointerMoved({
                  pointerId: event.pointerId,
                  flowX: flowPoint(
                    event.clientX,
                    event.clientY,
                    viewport,
                    canvas
                  ).x,
                  flowY: flowPoint(
                    event.clientX,
                    event.clientY,
                    viewport,
                    canvas
                  ).y,
                  autoPanDelta:
                    pointerSession.kind === 'connection'
                      ? selectionAutoPanDelta(
                          {
                            x: event.clientX - (bounds?.left ?? 0),
                            y: event.clientY - (bounds?.top ?? 0),
                          },
                          canvas?.clientWidth ?? 0,
                          canvas?.clientHeight ?? 0
                        )
                      : { x: 0, y: 0 },
                })
              },
            })
          )
        }

        return Stream.mergeAll(events, { concurrency: 'unbounded' })
      },
    }
  ),
  escapeCancellation: entry(
    { active: Schema.Boolean },
    {
      modelToDependencies: (model) => ({
        active:
          model.pointerSession !== null ||
          model.gestureSession !== null ||
          model.keyboardConnectionSession !== null ||
          model.keyboardResizeSession !== null,
      }),
      dependenciesToStream: ({ active }) =>
        active
          ? Subscription.fromEventFilterMapPreventDefault({
              target: document,
              type: 'keydown',
              filterMapEvent: (event): Option.Option<GraphMessageData> => {
                if (event.key !== 'Escape') {
                  return Option.none()
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
                  ? Option.some(Message.CancelGesture({}))
                  : Option.none()
              },
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
  selectionContextMenu: entry(
    { enabled: Schema.Boolean },
    {
      modelToDependencies: () => ({ enabled: true }),
      dependenciesToStream: () =>
        Subscription.fromEventFilterMapPreventDefault({
          target: document,
          type: 'contextmenu',
          filterMapEvent: (event): Option.Option<GraphMessageData> => {
            const { target } = event

            const canvas =
              target instanceof Element
                ? target.closest('.flow-foldkit-canvas')
                : null

            if (canvas === null || !(target instanceof Element)) {
              return Option.none()
            }

            const node = target.closest<HTMLElement>('[data-node-id]')
            const edge = target.closest<HTMLElement>('[data-edge-id]')

            return Option.some(
              Message.ObserveMouse({
                name: 'onSelectionContextMenu',
                nodeId: node?.dataset.nodeId ?? null,
                edgeId: edge?.dataset.edgeId ?? null,
              })
            )
          },
        }),
    }
  ),
}))
// oxlint-enable anti-slop(require-readable-spacing)

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
  ...defaultInteractionOptions,
  ...interactionOptions,
  panOnDrag: interactionOptions.panOnDrag ?? false,
  selectionOnDrag: interactionOptions.selectionOnDrag ?? true,
  panOnScroll: interactionOptions.panOnScroll ?? false,
  panOnScrollSpeed: interactionOptions.panOnScrollSpeed ?? 1,
  panOnScrollMode: interactionOptions.panOnScrollMode ?? 'free',
  zoomOnScroll: interactionOptions.zoomOnScroll ?? false,
  zoomOnDoubleClick: interactionOptions.zoomOnDoubleClick ?? false,
  keyboardActivation: interactionOptions.keyboardActivation ?? true,
  connectOnClick: interactionOptions.connectOnClick ?? true,
  defaultEdgeOptions: Effect.runSync(
    decodeFlowDefaultEdgeOptions(interactionOptions.defaultEdgeOptions ?? {})
  ),
  measurements: emptyFlowMeasurementState(),
  pointerSession: null,
  gestureSession: null,
  keyboardConnectionSession: null,
  keyboardResizeSession: null,
  selectionMode,
})

export const View = graphView()

export const subscriptions = PointerEvents

export type {
  FlowChange,
  FlowCommand,
  SelectionMode,
  Viewport,
} from '@flow/core'
