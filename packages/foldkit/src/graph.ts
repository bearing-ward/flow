import {
  calculateFlowExpandParent,
  decodeInitialViewport,
  calculateFlowExpandParentDrag,
  FlowResizeParamsWithDirectionSchema,
  snapPosition,
  startFlowNodeResize,
  stepFlowNodeResize,
  computeFlowStacking,
  constrainViewportToExtent,
  flowClassNames,
  flowColorModeMediaQuery,
  FlowColorModeSchema,
  flowEdgeMarkerType,
  FlowExtentInputSchema,
  flowNodeHandles,
  FlowSnapGridInputSchema,
  FlowZIndexModeSchema,
  FlowAriaLabelTextConfigSchema,
  PanExtentSchema,
  defaultFlowAriaLabelConfig,
  resolveFlowColorMode,
  resolveFlowEdgeMarker,
  SnapGridSchema,
  FlowSpan,
  FlowAttribute,
  FlowChangeSchema,
  FlowControlModeSchema,
  FlowCommandSchema,
  FlowDocumentSchema,
  FlowEditErrorSchema,
  FlowEditResultSchema,
  FlowEditTransactionSchema,
  FlowTransactionContextSchema,
  FlowSnapshotSchema,
  FlowStateChangeSchema,
  ViewportSchema,
  ViewportLimitsSchema,
  FlowMeasurementStateSchema,
  ConnectionModeSchema,
  NodeDragThresholdSchema,
  defaultNodeDragThreshold,
  decodeNodeDragThreshold,
  nodeDragActivated,
  nodeTopLeftToAnchor,
  nodeAnchorToTopLeft,
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
  projectFlowInternalNode,
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
  graphBounds,
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
  ResolvedFlowEdgeMarker,
  FlowAriaLabelConfigInput,
  FlowColorMode,
  FlowZIndexMode,
  PanExtent,
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
import { Dom, Message as FoldMessage, Submodel, Subscription } from 'foldkit'
import type { Html as FoldHtml, Update } from 'foldkit'

import { observeCanvasInput } from './canvas-input.ts'
import {
  ClosingOptionsSchema,
  defaultClosingOptions,
} from './closing-options.ts'
import type { ClosingOptions } from './closing-options.ts'
import {
  connectionPermitted,
  connectionRuleAccepts,
  connectionTargetOffered,
} from './connection-rules.ts'
import type { FoldkitIsValidConnection } from './connection-rules.ts'
import {
  dragGroupBox,
  dragItemExtent,
  NodeDragOriginSchema,
  placeDraggedNodes,
} from './drag-constraints.ts'
import { firstEventElement, isInputDOMNode } from './key-press-observer.ts'
import {
  MouseDetailSchema,
  ObservedMouseNameSchema,
  observeCanvasMouse,
} from './mouse-observation.ts'
import type { ObservedMouse } from './mouse-observation.ts'
import {
  FlowNodeResizeSessionSchema,
  readResizerControl,
  resizerAllows,
  ResizerControlSchema,
} from './node-resizer.ts'
import type { ResizerControl } from './node-resizer.ts'
import { edgeLabelPresentation, foldkitStyle } from './presentation.ts'

/** One node's gesture-owned position and size during an `expandParent` resize. */
const ResizerPatchSchema = Schema.Struct({
  nodeId: NodeIdSchema,
  position: Schema.optional(
    Schema.Struct({ x: Schema.Finite, y: Schema.Finite })
  ),
  size: Schema.optional(
    Schema.Struct({ width: Schema.Finite, height: Schema.Finite })
  ),
})

type ResizerPatch = typeof ResizerPatchSchema.Type

/** Apply an `expandParent` resize's patches to the current document. */
const applyResizerPatches = (
  document: FlowDocument,
  patches: readonly ResizerPatch[]
): FlowDocument => {
  if (patches.length === 0) {
    return document
  }

  const byId = new Map(patches.map((patch) => [patch.nodeId, patch]))

  return {
    ...document,
    nodes: document.nodes.map((node) => {
      const patch = byId.get(node.id)

      if (patch === undefined) {
        return node
      }

      let next = node

      if (patch.position !== undefined) {
        next = { ...next, position: patch.position }
      }

      if (patch.size !== undefined) {
        next = { ...next, size: patch.size }
      }

      return next
    }),
  }
}

/** Fold the position and size differences between two documents into patches. */
const mergeResizerPatches = (
  patches: readonly ResizerPatch[],
  before: FlowDocument,
  after: FlowDocument
): readonly ResizerPatch[] => {
  const merged = new Map(patches.map((patch) => [patch.nodeId, patch]))
  const previous = new Map(before.nodes.map((node) => [node.id, node]))

  for (const node of after.nodes) {
    const old = previous.get(node.id)

    if (old === undefined) {
      continue
    }

    const moved =
      old.position.x !== node.position.x || old.position.y !== node.position.y

    const resized =
      node.size !== undefined &&
      (old.size?.width !== node.size.width ||
        old.size.height !== node.size.height)

    if (moved || resized) {
      const patch = { ...merged.get(node.id), nodeId: node.id }

      if (moved) {
        Object.assign(patch, { position: node.position })
      }

      if (resized) {
        Object.assign(patch, { size: node.size })
      }

      merged.set(node.id, patch)
    }
  }

  return [...merged.values()]
}

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
    /** Where the drag found each dragged node, with its size and extent. */
    origins: Schema.Array(NodeDragOriginSchema),
    startMeasurements: Schema.optional(FlowMeasurementStateSchema),
    panOffset: Schema.optional(
      Schema.Struct({ x: Schema.Finite, y: Schema.Finite })
    ),
    /** A dragged node has `expandParent`, so frames may grow its parent. */
    expandParent: Schema.optional(Schema.Boolean),
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
    /** A React `NodeResizer`/`NodeResizeControl` gesture (core resize session). */
    kind: Schema.Literal('node-resizer'),
    pointerId: Schema.Number,
    nodeId: NodeIdSchema,
    resizerId: Schema.String,
    /** Pointer client position and snapped flow position at the press. */
    startX: Schema.Finite,
    startY: Schema.Finite,
    startFlow: Schema.Struct({ x: Schema.Finite, y: Schema.Finite }),
    resize: FlowNodeResizeSessionSchema,
    /** The bounds of the last step `shouldResize` allowed: the live preview. */
    preview: Schema.NullOr(NodeBoundsChangeSchema),
    /**
     * With `expandParent`, the position and size changes every allowed step
     * made (child, its children, the grown parent and shifted siblings), as
     * React commits each step; released as one edit transaction. Only these
     * fields are patched, so edits accepted mid-gesture survive.
     */
    expandPatches: Schema.NullOr(Schema.Array(ResizerPatchSchema)),
    /** Allowed steps so far; each one is an `onResize`. */
    steps: Schema.Int,
    params: Schema.NullOr(FlowResizeParamsWithDirectionSchema),
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

const PaneSizeSchema = Schema.Struct({
  width: Schema.Finite,
  height: Schema.Finite,
  bounds: Schema.Struct({ width: Schema.Finite, height: Schema.Finite }),
})

export const ModelSchema = Schema.Struct({
  ...ClosingOptionsSchema.fields,
  fitViewPending: Schema.Boolean,
  paneSize: PaneSizeSchema,
  rendererRevision: Schema.Number,
  selectionKeyPressed: Schema.Boolean,
  panKeyPressed: Schema.Boolean,
  viewportLimits: ViewportLimitsSchema,
  multiSelectionKeyPressed: Schema.Boolean,
  zoomKeyPressed: Schema.Boolean,
  ariaLiveMessage: Schema.NullOr(
    Schema.Struct({
      direction: Schema.String,
      x: Schema.Number,
      y: Schema.Number,
    })
  ),
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
  panOnDrag: Schema.Union([
    Schema.Boolean,
    Schema.Array(
      Schema.Int.check(
        Schema.isGreaterThanOrEqualTo(0),
        Schema.isLessThanOrEqualTo(4)
      )
    ),
  ]),
  selectionOnDrag: Schema.Boolean,
  selectNodesOnDrag: Schema.Boolean,
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
  nodePointerHandlers: Schema.Boolean,
  edgeClickHandler: Schema.Boolean,
  /** Selected nodes show resize controls only when this is on. */
  nodesResizable: Schema.Boolean,
  defaultEdgeOptions: FlowDefaultEdgeOptionsSchema,
  /** React Flow `snapToGrid` and `snapGrid` for node drags and resizes. */
  snapToGrid: Schema.Boolean,
  snapGrid: SnapGridSchema,
  /** React Flow `nodeExtent`, absolute; `null` is unbounded. */
  nodeExtent: Schema.NullOr(PanExtentSchema),
  /** React Flow `translateExtent`; `null` is unbounded. */
  translateExtent: Schema.NullOr(PanExtentSchema),
  colorMode: FlowColorModeSchema,
  /** The `prefers-color-scheme: dark` match, followed while `colorMode` is `system`. */
  prefersDark: Schema.Boolean,
  zIndexMode: FlowZIndexModeSchema,
  elevateNodesOnSelect: Schema.Boolean,
  elevateEdgesOnSelect: Schema.Boolean,
  /** The text entries of React Flow `ariaLabelConfig` the host overrode. */
  ariaLabelConfig: FlowAriaLabelTextConfigSchema,
  /** React Flow `defaultMarkerColor`; `null` uses each edge's stroke. */
  defaultMarkerColor: Schema.NullOr(Schema.String),
  measurements: FlowMeasurementStateSchema,
  pointerSession: Schema.NullOr(PointerSessionSchema),
  gestureSession: Schema.NullOr(GestureSessionSchema),
  keyboardConnectionSession: Schema.NullOr(KeyboardSessionSchema),
  keyboardResizeSession: Schema.NullOr(KeyboardResizeSessionSchema),
  pendingResizeAcceptance: Schema.NullOr(ResizeAcceptanceSchema),
  selectionMode: SelectionModeSchema,
  /** The click that ends a real node drag does not select, as with d3-drag. */
  nodeClickSuppressed: Schema.Boolean,
  selectionBoundsActive: Schema.Boolean,
})

const prefersDarkColorScheme = (): boolean =>
  globalThis.matchMedia?.(flowColorModeMediaQuery).matches === true

export type Model = typeof ModelSchema.Type

/** Runtime canvas patches retain the active gesture and disabled snap grid. */
export const CanvasOptionsSchema = Schema.Struct({
  snapToGrid: Schema.optional(ModelSchema.fields.snapToGrid),
  snapGrid: Schema.optional(FlowSnapGridInputSchema),
  panOnDrag: Schema.optional(ModelSchema.fields.panOnDrag),
  selectionOnDrag: Schema.optional(ModelSchema.fields.selectionOnDrag),
  selectNodesOnDrag: Schema.optional(ModelSchema.fields.selectNodesOnDrag),
  panOnScroll: Schema.optional(ModelSchema.fields.panOnScroll),
  panOnScrollSpeed: Schema.optional(ModelSchema.fields.panOnScrollSpeed),
  panOnScrollMode: Schema.optional(ModelSchema.fields.panOnScrollMode),
  zoomOnScroll: Schema.optional(ModelSchema.fields.zoomOnScroll),
  zoomOnDoubleClick: Schema.optional(ModelSchema.fields.zoomOnDoubleClick),
  onlyRenderVisibleElements: Schema.optional(
    ModelSchema.fields.onlyRenderVisibleElements
  ),
})

const canvasForInstance = (instanceId: string): HTMLElement | null =>
  globalThis.document?.querySelector<HTMLElement>(
    `[data-flow-instance="${CSS.escape(instanceId)}"]`
  ) ?? null

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
    'onNodeDoubleClick',
    'onNodeContextMenu',
    'onNodeMouseEnter',
    'onNodeMouseMove',
    'onNodeMouseLeave',
    'onEdgeClick',
    'onEdgeContextMenu',
    'onEdgeMouseEnter',
    'onEdgeMouseMove',
    'onEdgeMouseLeave',
    'onResizeStart',
    'onResize',
    'onResizeEnd',
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
  /** Resize events: the `NodeResizer` that owns the gesture. */
  resizerId: Schema.optional(Schema.String),
  /** Resize events: React `ResizeParams`, with `direction` for `onResize`. */
  resize: Schema.optional(
    Schema.Struct({
      x: Schema.Finite,
      y: Schema.Finite,
      width: Schema.Finite,
      height: Schema.Finite,
      direction: Schema.optional(Schema.Tuple([Schema.Finite, Schema.Finite])),
    })
  ),
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
  ClearClickSuppression: {},
  RefreshRenderers: {},
  SetInteractionHandlers: {
    nodePointerHandlers: Schema.Boolean,
    edgeClickHandler: Schema.Boolean,
  },
  DeleteSelected: {},
  SetCanvasKey: {
    kind: Schema.Literals(['selection', 'multiSelection', 'zoom', 'pan']),
    pressed: Schema.Boolean,
  },
  MoveNodeByKeyboard: {
    context: Schema.optional(FlowTransactionContextSchema),
    nodeId: NodeIdSchema,
    key: Schema.String,
    shift: Schema.optional(Schema.Boolean),
  },
  AutoPan: { x: Schema.Finite, y: Schema.Finite },
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
  /** React Flow `colorMode` changed at runtime. */
  SetCanvasOptions: { options: CanvasOptionsSchema },
  SetColorMode: { mode: FlowColorModeSchema },
  /** The `prefers-color-scheme: dark` match changed. */
  SystemColorScheme: { prefersDark: Schema.Boolean },
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
    shiftKey: Schema.optional(Schema.Boolean),
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
    button: Schema.optional(Schema.Number),
    pointerType: Schema.optional(Schema.String),
    screenX: Schema.Finite,
    screenY: Schema.Finite,
    /** Set when the press is on a node view's resizer control. */
    resizer: Schema.optional(ResizerControlSchema),
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
  PaneResized: PaneSizeSchema.fields,
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

export interface GraphInteractionOptions extends Partial<ClosingOptions> {
  readonly nodeDragThreshold?: typeof NodeDragThresholdSchema.Type | undefined
  readonly connectionDragThreshold?:
    | typeof ConnectionDragThresholdSchema.Type
    | undefined
  readonly connectionMode: ConnectionMode
  readonly connectionRadius: ConnectionRadius
  readonly autoPanOnConnect: boolean
  /** Boolean pane panning or the allowed mouse buttons; arrays do not restrict touch. */
  readonly panOnDrag?: typeof ModelSchema.fields.panOnDrag.Type
  readonly selectionOnDrag?: boolean
  readonly selectNodesOnDrag?: typeof ModelSchema.fields.selectNodesOnDrag.Type
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
  /** React Flow `snapToGrid`. Defaults to false. */
  readonly snapToGrid?: boolean
  /** React Flow `snapGrid`: `[x, y]` or `{ x, y }`. Defaults to `[15, 15]`. */
  readonly snapGrid?: typeof FlowSnapGridInputSchema.Encoded
  /** React Flow `nodeExtent`: `[[minX, minY], [maxX, maxY]]` or a record. */
  readonly nodeExtent?: typeof FlowExtentInputSchema.Encoded
  /** React Flow `translateExtent`: the pannable flow area. */
  readonly translateExtent?: typeof FlowExtentInputSchema.Encoded
  /** React Flow `colorMode`. Defaults to `light`. */
  readonly colorMode?: FlowColorMode
  /** React Flow `zIndexMode`. Defaults to `basic`. */
  readonly zIndexMode?: FlowZIndexMode
  /** React Flow `elevateNodesOnSelect`. Defaults to true. */
  readonly elevateNodesOnSelect?: boolean
  /** React Flow `elevateEdgesOnSelect`. Defaults to false. */
  readonly elevateEdgesOnSelect?: boolean
  /**
   * React Flow `ariaLabelConfig`. Text entries label handles and describe
   * nodes and edges; the canvas UI helpers take the same object.
   */
  readonly ariaLabelConfig?: FlowAriaLabelConfigInput
  /** React Flow `defaultMarkerColor`. Unset, markers use the edge stroke. */
  readonly defaultMarkerColor?: string
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
  selectNodesOnDrag: false,
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

/** React `getNode`: the node with `measured` from the host's last measurement. */
export const selectNode = (model: Model, id: string): FlowNode | undefined => {
  const node = model.document.nodes.find((candidate) => candidate.id === id)

  const measured =
    node === undefined
      ? undefined
      : getFlowMeasuredNodes(model.document, model.measurements).get(node.id)

  return node === undefined || measured === undefined
    ? node
    : { ...node, measured: { width: measured.width, height: measured.height } }
}

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

  if (nodeId === undefined) {
    return undefined
  }

  const measurements = getFlowMeasuredNodes(model.document, model.measurements)

  const graph = createFlowGraph(
    model.document,
    measurements,
    undefined,
    undefined,
    model.nodeExtent ?? undefined
  )

  const item = graph.nodes.get(nodeId)

  return item === undefined
    ? undefined
    : projectFlowInternalNode(item, measurements.get(nodeId))
}

const edgeCrossesViewport = (
  model: Model,
  graph: FlowGraphView,
  edge: FlowEdge
): boolean => {
  const source = graph.nodes.get(edge.source)
  const target = graph.nodes.get(edge.target)

  if (source === undefined || target === undefined) {
    return false
  }

  const left =
    Math.min(source.absolutePosition.x, target.absolutePosition.x) *
      model.viewport.zoom +
    model.viewport.x

  const top =
    Math.min(source.absolutePosition.y, target.absolutePosition.y) *
      model.viewport.zoom +
    model.viewport.y

  const right =
    Math.max(
      source.absolutePosition.x + source.dimensions.width,
      target.absolutePosition.x + target.dimensions.width
    ) *
      model.viewport.zoom +
    model.viewport.x

  const bottom =
    Math.max(
      source.absolutePosition.y + source.dimensions.height,
      target.absolutePosition.y + target.dimensions.height
    ) *
      model.viewport.zoom +
    model.viewport.y

  return (
    left < model.paneSize.width &&
    top < model.paneSize.height &&
    right > 0 &&
    bottom > 0
  )
}

// oxlint-disable-next-line complexity -- Visibility combines hidden state, initial fitting and viewport bounds.
const selectMountedNodeIds = (
  model: Model,
  measurements = getFlowMeasuredNodes(model.document, model.measurements),
  graph = createFlowGraph(
    model.document,
    measurements,
    undefined,
    undefined,
    model.nodeExtent ?? undefined
  )
): ReadonlySet<NodeId> => {
  const { zoom } = model.viewport

  return new Set(
    // oxlint-disable-next-line complexity -- Visibility combines hidden state, initial fitting and viewport bounds.
    graph.orderedNodes.flatMap(({ node }) => {
      const graphNode = graph.nodes.get(node.id)

      if (graphNode === undefined || graphNode.hidden) {
        return []
      }

      if (
        !model.onlyRenderVisibleElements ||
        model.fitViewPending ||
        model.paneSize.width === 0 ||
        model.paneSize.height === 0
      ) {
        return [node.id]
      }

      const { x, y } = graphNode.absolutePosition
      const left = x * zoom + model.viewport.x
      const top = y * zoom + model.viewport.y

      const { width, height } = graphNode.dimensions

      return left < model.paneSize.width &&
        top < model.paneSize.height &&
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
      prepareFlowEdit(model.document, {
        ...command.transaction,
        context: command.transaction.context ?? {
          transactionId: crypto.randomUUID(),
          origin: { kind: 'local', actorId: model.instanceId },
        },
      })
    )

    const change: CoreFlowChange = {
      kind: 'edit-proposal',
      document: prepared.document,
      deletion: prepared.deletion,
      context: prepared.context,
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
  const exit = Effect.runSyncExit(
    prepareFlowEdit(model.document, {
      ...transaction,
      context: transaction.context ?? {
        transactionId: crypto.randomUUID(),
        origin: { kind: 'local', actorId: model.instanceId },
      },
    })
  )

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
        context: result.context,
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

  const sourceHandle = flowNodeHandles(source).find(
    (handle) => handle.id === session.sourceHandleId
  )

  const targetHandle = flowNodeHandles(target).find(
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
  const handle = flowNodeHandles(node).find(({ id }) => id === handleId)

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
  nodeId: NodeId,
  placement: 'pointer' | 'keyboard' = 'pointer'
): Pick<
  NodeDragSession,
  'nodeIds' | 'origins' | 'expandParent' | 'startMeasurements'
> => {
  const interactivity = selectInteractivity(model)

  const graph = createFlowGraph(
    model.document,
    getFlowMeasuredNodes(model.document, model.measurements),
    undefined,
    undefined,
    model.nodeExtent ?? undefined
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

  const items = [...candidates].filter(
    (id) => placement === 'keyboard' || !hasDraggedAncestor(id)
  )

  const nodeIds = items.includes(nodeId)
    ? [nodeId, ...items.filter((id) => id !== nodeId)]
    : items

  const resolvedItems = nodeIds.flatMap((id) => {
    const resolved = graph.nodes.get(id)

    return resolved === undefined || resolved.hidden ? [] : [resolved]
  })

  // React `getInternalNodesBounds(dragItems)`: the group box a multi-node
  // drag keeps inside `nodeExtent`.
  const groupBox =
    placement === 'keyboard' ||
    resolvedItems.length < 2 ||
    model.nodeExtent === null
      ? undefined
      : dragGroupBox(
          resolvedItems.map((item) => ({
            ...item.absolutePosition,
            ...item.dimensions,
          }))
        )

  const origins = resolvedItems.map((resolved) => {
    const parent =
      resolved.parentId === undefined
        ? undefined
        : graph.nodes.get(resolved.parentId)

    const nodeOrigin = resolveNodeOrigin(resolved.node, model.document)

    const position = nodeTopLeftToAnchor(
      {
        x: resolved.absolutePosition.x - (parent?.absolutePosition.x ?? 0),
        y: resolved.absolutePosition.y - (parent?.absolutePosition.y ?? 0),
      },
      resolved.dimensions,
      nodeOrigin
    )

    const extent = dragItemExtent({
      parentBox:
        parent === undefined
          ? undefined
          : { ...parent.absolutePosition, ...parent.dimensions },
      extentParent: resolved.node.extent === 'parent',
      expandParent: resolved.node.expandParent === true,
      nodeExtent: model.nodeExtent ?? undefined,
      item: { ...resolved.absolutePosition, ...resolved.dimensions },
      groupBox,
    })

    return {
      nodeId: resolved.id,
      x: position.x,
      y: position.y,
      absoluteX: resolved.absolutePosition.x,
      absoluteY: resolved.absolutePosition.y,
      width: resolved.dimensions.width,
      height: resolved.dimensions.height,
      originX: nodeOrigin[0],
      originY: nodeOrigin[1],
      parentX: parent?.absolutePosition.x ?? 0,
      parentY: parent?.absolutePosition.y ?? 0,
      extent: extent ?? null,
    }
  })

  const expandParent = resolvedItems.some(
    (item) => item.parentId !== undefined && item.node.expandParent === true
  )

  if (expandParent) {
    return {
      nodeIds,
      origins,
      expandParent,
      startMeasurements: {
        ...model.measurements,
        nodes: model.measurements.nodes.filter(({ measurement }) =>
          resolvedItems.some(
            (item) =>
              item.node.expandParent === true &&
              item.parentId === measurement.nodeId
          )
        ),
      },
    }
  }

  return { nodeIds, origins, expandParent }
}

/**
 * Each dragged node's position once the pointer is at `clientX`/`clientY`:
 * its drag origin plus the pointer travel, snapped and clamped as React
 * `XYDrag` does, so a frame costs O(dragged nodes) plus one id lookup.
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
  const interactivity = selectInteractivity(model)
  const nodes = new Map(model.document.nodes.map((node) => [node.id, node]))

  const origins = session.origins.filter(({ nodeId }) => {
    const node = nodes.get(nodeId)

    return (
      node !== undefined &&
      node.hidden !== true &&
      isNodeDraggable(interactivity, node)
    )
  })

  return placeDraggedNodes(
    origins,
    {
      x:
        (clientX - session.startX - (session.panOffset?.x ?? 0)) /
        model.viewport.zoom,
      y:
        (clientY - session.startY - (session.panOffset?.y ?? 0)) /
        model.viewport.zoom,
    },
    model.snapToGrid ? model.snapGrid : undefined
  )
}

/** Keep expandParent's accepted parent dimensions while observing live node and handle geometry. */
const dragMeasurements = (model: Model): Model['measurements'] => {
  const frozen =
    model.pointerSession?.kind === 'node-drag'
      ? model.pointerSession.startMeasurements
      : undefined

  if (frozen === undefined) {
    return model.measurements
  }

  return {
    ...model.measurements,
    nodes: model.measurements.nodes.map((entry) => {
      const parent = frozen.nodes.find(
        ({ measurement }) => measurement.nodeId === entry.measurement.nodeId
      )

      return parent === undefined
        ? entry
        : {
            ...entry,
            measurement: {
              ...entry.measurement,
              width: parent.measurement.width,
              height: parent.measurement.height,
            },
          }
    }),
  }
}

/**
 * React `updateNodePositions` with `expandParent`: the dragged positions,
 * the parent growth and the sibling shifts, applied to the document.
 */
const expandParentDragDocument = (
  model: Model,
  positions: readonly {
    readonly nodeId: NodeId
    readonly position: XYPosition
  }[]
): FlowDocument => {
  const graph = createFlowGraph(
    model.document,
    getFlowMeasuredNodes(model.document, dragMeasurements(model)),
    undefined,
    undefined,
    model.nodeExtent ?? undefined
  )

  const changes = calculateFlowExpandParentDrag(
    graph,
    positions.map(({ nodeId, position }) => ({ id: nodeId, position }))
  )

  const moved = new Map<NodeId, XYPosition>()

  const sized = new Map<
    NodeId,
    { readonly width: number; readonly height: number }
  >()

  for (const change of changes) {
    if (change.kind === 'position') {
      moved.set(change.nodeId, change.position)
    } else {
      sized.set(change.nodeId, change.size)
    }
  }

  return {
    ...model.document,
    nodes: model.document.nodes.map((node) => {
      const position = moved.get(node.id)
      const size = sized.get(node.id)

      let next = node

      if (position !== undefined) {
        next = { ...next, position }
      }

      if (size !== undefined) {
        next = { ...next, size }
      }

      return next
    }),
  }
}

/**
 * A drag that grows a parent changes positions and sizes together, so it
 * commits as one edit transaction of `update-node` patches.
 */
const expandParentDragChange = (
  model: Model,
  positions: readonly {
    readonly nodeId: NodeId
    readonly position: XYPosition
  }[]
): CoreFlowChange => {
  const document = expandParentDragDocument(model, positions)
  const before = new Map(model.document.nodes.map((node) => [node.id, node]))

  const operations = document.nodes.flatMap((node) =>
    before.get(node.id) === node
      ? []
      : [
          {
            kind: 'update-node' as const,
            nodeId: node.id,
            patch:
              node.size === undefined
                ? { position: node.position }
                : { position: node.position, size: node.size },
          },
        ]
  )

  const prepared = Effect.runSync(
    prepareFlowEdit(model.document, { operations })
  )

  return {
    kind: 'edit-proposal',
    document: prepared.document,
    deletion: prepared.deletion,
  }
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

  if (session.expandParent === true) {
    return expandParentDragChange(model, positions)
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

  if (change.kind === 'edit-proposal') {
    return change.document
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
  const gesture = model.gestureSession

  if (gesture?.kind === 'node-resizer' && gesture.expandPatches !== null) {
    return applyResizerPatches(model.document, gesture.expandPatches)
  }

  const session = model.pointerSession

  if (session?.kind !== 'node-drag') {
    return model.document
  }

  const positions = nodeDragPositions(
    model,
    session,
    session.currentX,
    session.currentY
  )

  if (positions.length === 0) {
    return model.document
  }

  if (session.expandParent === true) {
    return expandParentDragDocument(model, positions)
  }

  const moved = new Map(
    positions.map(({ nodeId, position }) => [nodeId, position])
  )

  return {
    ...model.document,
    nodes: model.document.nodes.map((node) => {
      const position = moved.get(node.id)

      return position === undefined ? node : { ...node, position }
    }),
  }
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

    const handle = flowNodeHandles(node).find(
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

// oxlint-disable-next-line complexity -- Pending promotion rechecks endpoint and host eligibility.
const pendingEligible = (
  model: Model,
  pending: typeof PendingConnectionSchema.Type
): boolean => {
  const graph = createFlowGraph(
    model.document,
    getFlowMeasuredNodes(model.document, model.measurements),
    undefined,
    undefined,
    model.nodeExtent ?? undefined
  )

  const interactivity = selectInteractivity(model)

  const eligible = (identity: typeof PendingHandleSchema.Type): boolean => {
    const node = model.document.nodes.find(({ id }) => id === identity.nodeId)

    return (
      graph.nodes.get(identity.nodeId)?.hidden === false &&
      node !== undefined &&
      flowNodeHandles(node).some(
        ({ id, kind }) => id === identity.handleId && kind === identity.kind
      ) === true
    )
  }

  const startable = (identity: typeof PendingHandleSchema.Type): boolean => {
    const node = model.document.nodes.find(({ id }) => id === identity.nodeId)

    const handle = flowNodeHandles(node).find(
      ({ id }) => id === identity.handleId
    )

    return (
      node !== undefined &&
      handle !== undefined &&
      isHandleConnectable(interactivity, node, handle, 'start')
    )
  }

  if (pending.kind === 'connection-pending') {
    return (
      eligible(pending.from) &&
      (model.keyboardConnectionSession !== null || startable(pending.from))
    )
  }

  const edge = model.document.edges.find(({ id }) => id === pending.edgeId)
  const resolved = edge && resolveEdgeHandles(model.document, edge)

  return (
    edge !== undefined &&
    edge.hidden !== true &&
    edge.selected === true &&
    (edge.reconnectable ?? model.edgesReconnectable) !== false &&
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

  const handle = flowNodeHandles(node).find(
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
    canvas ??
    globalThis.document?.querySelector<HTMLElement>('.flow-foldkit-canvas')
  )?.getBoundingClientRect()

  return {
    x: (clientX - (bounds?.left ?? 0) - viewport.x) / viewport.zoom,
    y: (clientY - (bounds?.top ?? 0) - viewport.y) / viewport.zoom,
  }
}

/**
 * React `translateExtent`: keep the visible flow area inside the extent, as
 * d3-zoom's constrain does for user pans and zooms.
 */
export const constrainViewportToTranslateExtent = (
  model: Pick<Model, 'translateExtent'>,
  viewport: CoreViewport,
  pane: { readonly width: number; readonly height: number } | undefined
): CoreViewport =>
  model.translateExtent === null || pane === undefined
    ? viewport
    : constrainViewportToExtent(
        viewport,
        model.translateExtent,
        pane.width,
        pane.height
      )

const translateConstrained = (
  model: Model,
  viewport: CoreViewport
): CoreViewport =>
  constrainViewportToTranslateExtent(
    model,
    viewport,
    model.paneSize.width > 0 && model.paneSize.height > 0
      ? model.paneSize.bounds
      : undefined
  )

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

  const zoom = Math.min(
    model.viewportLimits.maxZoom,
    Math.max(model.viewportLimits.minZoom, model.viewport.zoom * factor)
  )

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
  measurement?: NodeMeasurementInput
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
    getFlowMeasuredNodes(model.document, model.measurements),
    undefined,
    undefined,
    model.nodeExtent ?? undefined
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

type ResizerSession = Extract<
  NonNullable<Model['gestureSession']>,
  { kind: 'node-resizer' }
>

/** The live bounds of an active `NodeResizer` gesture, for the view. */
export const selectResizerPreview = (
  model: Model
): NodeBoundsChange | undefined =>
  model.gestureSession?.kind === 'node-resizer'
    ? (model.gestureSession.preview ?? undefined)
    : undefined

const snappedFlowPoint = (model: Model, point: XYPosition): XYPosition =>
  model.snapToGrid ? snapPosition(point, model.snapGrid) : point

/**
 * React `XYResizer` start: stored position and measured size, the parent
 * box for `extent: 'parent'`, the child extent, the children and
 * `expandParent`.
 */
const startResizer = (
  model: Model,
  press: {
    readonly pointerId: number
    readonly clientX: number
    readonly clientY: number
    readonly nodeId: string
    readonly direction: NodeResizeCalculationInput['direction']
    readonly resizer: ResizerControl
  }
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => {
  const graph = createFlowGraph(
    model.document,
    getFlowMeasuredNodes(model.document, model.measurements),
    undefined,
    undefined,
    model.nodeExtent ?? undefined
  )

  const resolved = graph.nodes.get(NodeIdSchema.make(press.nodeId))

  if (resolved === undefined) {
    return noChange(model)
  }

  const { node } = resolved

  const parent =
    node.parentId === undefined ? undefined : graph.nodes.get(node.parentId)

  const extent =
    parent !== undefined && node.extent === 'parent'
      ? {
          minX: 0,
          minY: 0,
          maxX: parent.dimensions.width,
          maxY: parent.dimensions.height,
        }
      : undefined

  const startInput: Parameters<typeof startFlowNodeResize>[0] = {
    controlPosition: press.direction,
    start: {
      x: node.position.x,
      y: node.position.y,
      width: resolved.dimensions.width,
      height: resolved.dimensions.height,
    },
    constraints: press.resizer.constraints,
    nodeOrigin: resolveNodeOrigin(node, model.document),
    children: model.document.nodes
      .filter((child) => child.parentId === node.id)
      .map((child) => ({ id: child.id, position: child.position })),
    expandParent: parent !== undefined && node.expandParent === true,
  }

  const childExtent = graphResizeChildExtent(graph, node.id)

  const resize = startFlowNodeResize(
    Object.assign(
      startInput,
      press.resizer.resizeDirection === undefined
        ? undefined
        : { resizeDirection: press.resizer.resizeDirection },
      extent === undefined ? undefined : { extent },
      childExtent === undefined ? undefined : { childExtent }
    )
  )

  return {
    model: {
      ...model,
      keyboardConnectionSession: null,
      pendingResizeAcceptance: null,
      gestureSession: {
        kind: 'node-resizer',
        pointerId: press.pointerId,
        nodeId: node.id,
        resizerId: press.resizer.resizerId,
        startX: press.clientX,
        startY: press.clientY,
        startFlow: snappedFlowPoint(
          model,
          flowPoint(
            press.clientX,
            press.clientY,
            model.viewport,
            canvasForModel(model)
          )
        ),
        resize,
        preview: null,
        expandPatches: null,
        steps: 0,
        params: null,
      },
    },
  }
}

/** Apply `calculateFlowExpandParent` position and size changes. */
const applyExpandParentChanges = (
  document: FlowDocument,
  changes: readonly (
    | {
        readonly kind: 'position'
        readonly nodeId: NodeId
        readonly position: XYPosition
      }
    | {
        readonly kind: 'size'
        readonly nodeId: NodeId
        readonly size: { readonly width: number; readonly height: number }
      }
  )[]
): FlowDocument => {
  if (changes.length === 0) {
    return document
  }

  return {
    ...document,
    nodes: document.nodes.map((node) => {
      let current = node

      for (const change of changes) {
        if (change.nodeId === node.id) {
          current =
            change.kind === 'position'
              ? { ...current, position: change.position }
              : { ...current, size: change.size }
        }
      }

      return current
    }),
  }
}

const previewMeasurements = (model: Model, document: FlowDocument) => {
  const measurements = new Map(
    getFlowMeasuredNodes(document, model.measurements)
  )

  const acceptedSizes = new Map(
    model.document.nodes.map(({ id, size }) => [id, size])
  )

  for (const node of document.nodes) {
    const accepted = acceptedSizes.get(node.id)

    if (
      node.size?.width !== accepted?.width ||
      node.size?.height !== accepted?.height
    ) {
      const measured = measurements.get(node.id)

      if (measured !== undefined && node.size !== undefined) {
        const { size } = node
        measurements.set(node.id, {
          ...measured,
          ...size,
          handles: measured.handles?.map((handle) => ({
            ...handle,
            offset: {
              x:
                handle.offset.x +
                (flowNodeHandles(node).find(({ id }) => id === handle.handleId)
                  ?.side === 'right'
                  ? size.width - measured.width
                  : 0),
              y:
                handle.offset.y +
                (flowNodeHandles(node).find(({ id }) => id === handle.handleId)
                  ?.side === 'bottom'
                  ? size.height - measured.height
                  : 0),
            },
          })),
        })
      }
    }
  }

  return measurements
}

/** The geometry shared by view rendering and public instance reads. Accepted state stays untouched. */
export const selectLiveModel = (model: Model): Model => {
  const resizeSession =
    model.gestureSession?.kind === 'resize'
      ? model.gestureSession
      : model.keyboardResizeSession

  const change =
    resizeSession === null
      ? selectResizerPreview(model)
      : resizeProposal(
          model.document,
          resizeSession.nodeId,
          resizeSession.input
        )

  const live = selectLiveDocument(model)

  const document =
    change === undefined ? live : (applyNodeBoundsChange(live, change) ?? live)

  if (document === model.document) {
    return model
  }

  if (
    change === undefined &&
    model.pointerSession?.kind === 'node-drag' &&
    model.pointerSession.expandParent !== true
  ) {
    return { ...model, document }
  }

  const samples = previewMeasurements(model, document)
  const gesture = model.gestureSession

  const measurement =
    gesture?.kind === 'resize'
      ? gesture.measurement
      : model.keyboardResizeSession?.measurement

  if (measurement !== undefined) {
    const node = document.nodes.find(({ id }) => id === measurement.nodeId)

    if (
      node !== undefined &&
      node.size !== undefined &&
      node.size.width === measurement.width &&
      node.size.height === measurement.height
    ) {
      samples.set(measurement.nodeId, measurement)
    }
  }

  return {
    ...model,
    document,
    measurements: {
      ...model.measurements,
      nodes: [...samples].map(([nodeId, sample]) => ({
        generation:
          model.measurements.generations.find(
            (entry) => entry.nodeId === nodeId
          )?.generation ?? 0,
        measurement: sample,
        handleDeclarations: flowNodeHandles(
          document.nodes.find((node) => node.id === nodeId)
        ),
      })),
    },
  }
}

/**
 * React `NodeResizeControl` `onChange` for an `expandParent` child
 * (`NodeResizeControl.tsx:88-120`): grow the parent around the child's
 * unclamped rectangle, then clamp the child to `max(origin * size, x)`.
 * Steps accumulate on the previous step's document, as React commits each
 * step before the next one.
 */
const expandParentResizeStep = (
  model: Model,
  session: ResizerSession,
  step: NonNullable<ReturnType<typeof stepFlowNodeResize>['step']>
): FlowDocument => {
  const base = applyResizerPatches(model.document, session.expandPatches ?? [])

  const graph = createFlowGraph(
    base,
    previewMeasurements(model, base),
    undefined,
    undefined,
    model.nodeExtent ?? undefined
  )

  const resolved = graph.nodes.get(session.nodeId)

  const parent =
    resolved?.parentId === undefined
      ? undefined
      : graph.nodes.get(resolved.parentId)

  if (resolved === undefined || parent === undefined) {
    return base
  }

  const { node } = resolved
  const origin = resolveNodeOrigin(node, base)
  const width = step.size?.width ?? resolved.dimensions.width
  const height = step.size?.height ?? resolved.dimensions.height

  const topLeft = nodeAnchorToTopLeft(
    {
      x: step.position?.x ?? node.position.x,
      y: step.position?.y ?? node.position.y,
    },
    { width, height },
    origin
  )

  const grown = applyExpandParentChanges(
    base,
    calculateFlowExpandParent(graph, [
      {
        id: node.id,
        parentId: parent.id,
        rect: {
          x: parent.absolutePosition.x + topLeft.x,
          y: parent.absolutePosition.y + topLeft.y,
          width,
          height,
        },
      },
    ])
  )

  // React only moves the child when both clamped coordinates are set; a
  // zero coordinate counts as unset there.
  const x =
    step.position === undefined || step.position.x === 0
      ? undefined
      : Math.max(origin[0] * width, step.position.x)

  const y =
    step.position === undefined || step.position.y === 0
      ? undefined
      : Math.max(origin[1] * height, step.position.y)

  const children = new Map(
    step.childPositions.map(({ id, position }) => [id, position])
  )

  return {
    ...grown,
    nodes: grown.nodes.map((candidate) => {
      if (candidate.id === node.id) {
        let next = candidate

        if (x !== undefined && y !== undefined) {
          next = { ...next, position: { x, y } }
        }

        if (step.size !== undefined) {
          next = { ...next, size: step.size }
        }

        return next
      }

      const position = children.get(candidate.id)

      return position === undefined ? candidate : { ...candidate, position }
    }),
  }
}

/**
 * One React `XYResizer` drag step. The session and preview advance only
 * when `shouldResize` accepts the proposal.
 */
const stepResizer = (
  model: Model,
  session: ResizerSession,
  screenX: number,
  screenY: number
): Model => {
  const pointer = snappedFlowPoint(model, {
    x: session.startFlow.x + (screenX - session.startX) / model.viewport.zoom,
    y: session.startFlow.y + (screenY - session.startY) / model.viewport.zoom,
  })

  const { session: resize, step } = stepFlowNodeResize(session.resize, {
    x: pointer.x - session.startFlow.x,
    y: pointer.y - session.startFlow.y,
  })

  if (step === undefined) {
    return model
  }

  if (!resizerAllows(session.resizerId, session.nodeId, step.params)) {
    return model
  }

  const { previous } = resize

  const childPositions =
    resize.children.length === 0
      ? []
      : resize.children.map(({ id, position }) => ({ nodeId: id, position }))

  if (resize.expandParent) {
    const base = applyResizerPatches(
      model.document,
      session.expandPatches ?? []
    )

    const expanded = expandParentResizeStep(model, session, step)
    const resized = expanded.nodes.find(({ id }) => id === session.nodeId)

    return {
      ...model,
      gestureSession: {
        ...session,
        resize,
        steps: session.steps + 1,
        params: step.params,
        expandPatches: mergeResizerPatches(
          session.expandPatches ?? [],
          base,
          expanded
        ),
        preview: {
          kind: 'node-bounds',
          nodeId: session.nodeId,
          position: resized?.position ?? { x: previous.x, y: previous.y },
          size: {
            width: Math.max(previous.width, Number.EPSILON),
            height: Math.max(previous.height, Number.EPSILON),
          },
          childPositions,
        },
      },
    }
  }

  return {
    ...model,
    gestureSession: {
      ...session,
      resize,
      steps: session.steps + 1,
      params: step.params,
      preview: {
        kind: 'node-bounds',
        nodeId: session.nodeId,
        position: { x: previous.x, y: previous.y },
        size: {
          width: Math.max(previous.width, Number.EPSILON),
          height: Math.max(previous.height, Number.EPSILON),
        },
        childPositions,
      },
    },
  }
}

/**
 * Commit the last allowed resize step. A node with `expandParent` also
 * grows its parent (React `handleExpandParent`), which changes several
 * nodes' positions and sizes, so that commit is one edit transaction.
 */
const finishResizer = (
  model: Model,
  cleared: Model,
  session: ResizerSession
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => {
  const change = session.preview

  if (change === null) {
    return { model: cleared }
  }

  if (session.expandPatches !== null) {
    // Only the gesture's own position and size changes, applied to the
    // current document, so edits accepted mid-gesture are kept.
    const present = new Set(model.document.nodes.map(({ id }) => id))

    const operations = session.expandPatches
      .filter(({ nodeId }) => present.has(nodeId))
      .map(({ nodeId, position, size }) => ({
        kind: 'update-node' as const,
        nodeId,
        patch: {
          ...(position === undefined ? undefined : { position }),
          ...(size === undefined ? undefined : { size }),
        },
      }))

    const prepared = Effect.runSync(
      prepareFlowEdit(model.document, { operations })
    )

    return report(
      model,
      {
        ...cleared,
        // Controlled: keep the proposed size until the owner acknowledges.
        pendingResizeAcceptance:
          model.documentMode === 'controlled' ? { change } : null,
        measurements:
          model.documentMode === 'uncontrolled'
            ? measurementsForResize(model, prepared.document, change)
            : model.measurements,
        document:
          model.documentMode === 'uncontrolled'
            ? prepared.document
            : model.document,
      },
      {
        kind: 'edit-proposal',
        document: prepared.document,
        deletion: prepared.deletion,
        context: prepared.context,
      }
    )
  }

  const document = applyNodeBoundsChange(model.document, change)

  return document === undefined
    ? { model: cleared }
    : report(
        model,
        {
          ...cleared,
          pendingResizeAcceptance:
            model.documentMode === 'controlled' ? { change } : null,
          measurements:
            model.documentMode === 'uncontrolled'
              ? measurementsForResize(model, document, change)
              : model.measurements,
          document:
            model.documentMode === 'uncontrolled' ? document : model.document,
        },
        change
      )
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

const selectNodeForInput = (
  model: Model,
  node: FlowNode,
  multi: boolean
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => {
  if (multi) {
    return toggleNodeSelection(
      { ...model, selectionBoundsActive: false },
      node.id
    )
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
    ? { model: { ...model, selectionBoundsActive: false } }
    : report(
        model,
        {
          ...model,
          selectionBoundsActive: false,
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
  const controlClick =
    observed.name === 'onNodeContextMenu' &&
    observed.pointer?.button === 0 &&
    observed.pointer.ctrlKey &&
    [model.multiSelectionKeyCode].flat().includes('Control')

  if (observed.name !== 'onNodeClick' && !controlClick) {
    return noChange(model)
  }

  if (model.nodeClickSuppressed) {
    return { model: { ...model, nodeClickSuppressed: false } }
  }

  const interactivity = selectInteractivity(model)
  const node = model.document.nodes.find(({ id }) => id === observed.nodeId)

  if (
    (observed.select !== true && !controlClick) ||
    node === undefined ||
    node.hidden === true ||
    !isNodeSelectable(interactivity, node) ||
    (model.selectNodesOnDrag &&
      model.nodeDragThreshold === 0 &&
      isNodeDraggable(interactivity, node))
  ) {
    return noChange(model)
  }

  const multi =
    model.multiSelectionKeyPressed ||
    [model.multiSelectionKeyCode]
      .flat()
      .some(
        (key) =>
          (key === 'Meta' && observed.pointer?.metaKey === true) ||
          (key === 'Control' && observed.pointer?.ctrlKey === true) ||
          (key === 'Alt' && observed.pointer?.altKey === true) ||
          (key === 'Shift' && observed.pointer?.shiftKey === true)
      )

  return selectNodeForInput(model, node, multi)
}

const panePanEnabled = (
  model: Model,
  button: number,
  pointerType: string
): boolean =>
  model.panKeyPressed ||
  (Array.isArray(model.panOnDrag)
    ? pointerType === 'touch' || model.panOnDrag.includes(button)
    : model.panOnDrag === true)

const paneDragSelectionEnabled = (model: Model): boolean =>
  model.selectionOnDrag && model.panOnDrag !== true && !model.panKeyPressed

const paneSelectionEnabled = (
  model: Model,
  button: number,
  pointerType: string
): boolean =>
  button === 0 &&
  model.elementsSelectable &&
  (model.selectionKeyPressed ||
    (paneDragSelectionEnabled(model) &&
      !(pointerType === 'touch' && model.panOnDrag !== false)))

const paneIsSelecting = (model: Model): boolean =>
  model.selectionKeyPressed ||
  model.gestureSession?.kind === 'selection' ||
  paneDragSelectionEnabled(model)

const updateState = (
  model: Model,
  message: GraphMessageData
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> =>
  Message.match<
    Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData>
  >(message, {
    ClearClickSuppression: () => ({
      model: { ...model, nodeClickSuppressed: false },
    }),
    SetInteractionHandlers: ({ nodePointerHandlers, edgeClickHandler }) => ({
      model: { ...model, nodePointerHandlers, edgeClickHandler },
    }),
    RefreshRenderers: () => ({
      model: { ...model, rendererRevision: model.rendererRevision + 1 },
    }),
    DeleteSelected: () => noChange(model),
    SetCanvasKey: ({ kind, pressed }) => ({
      model: { ...model, [`${kind}KeyPressed`]: pressed },
    }),
    AutoPan: ({ x, y }) => {
      if (model.viewportMode === 'controlled') {
        return noChange(model)
      }

      const viewport = translateConstrained(
        model,
        panViewport(model.viewport, { x, y })
      )

      const dx = viewport.x - model.viewport.x
      const dy = viewport.y - model.viewport.y
      const session = model.pointerSession
      const gesture = model.gestureSession

      return acceptReplacement(
        model,
        {
          ...model,
          viewport,
          pointerSession:
            session?.kind === 'node-drag'
              ? {
                  ...session,
                  panOffset: {
                    x: (session.panOffset?.x ?? 0) + dx,
                    y: (session.panOffset?.y ?? 0) + dy,
                  },
                }
              : session,
          gestureSession:
            gesture?.kind === 'selection'
              ? {
                  ...gesture,
                  currentX: gesture.currentX - dx / viewport.zoom,
                  currentY: gesture.currentY - dy / viewport.zoom,
                }
              : gesture,
        },
        'viewport-update'
      )
    },
    PaneResized: ({ width, height, bounds }) => ({
      model: { ...model, paneSize: { width, height, bounds } },
    }),
    MoveNodeByKeyboard: ({ nodeId, key, shift, context }) => {
      if (model.disableKeyboardA11y || !model.keyboardActivation) {
        return noChange(model)
      }

      if (
        model.gestureSession?.kind === 'selection' &&
        model.gestureSession.pointerId === -2
      ) {
        return updateState(
          model,
          Message.KeyboardSelectionKey({ nodeId, key, shift: shift ?? false })
        )
      }

      const node = model.document.nodes.find(({ id }) => id === nodeId)

      const deltas = new Map<string, XYPosition>(
        Object.entries({
          ArrowLeft: { x: -5, y: 0 },
          ArrowRight: { x: 5, y: 0 },
          ArrowUp: { x: 0, y: -5 },
          ArrowDown: { x: 0, y: 5 },
        })
      )

      const delta = deltas.get(key)

      if (
        node === undefined ||
        node.focusable === false ||
        node.selected !== true ||
        !isNodeDraggable(selectInteractivity(model), node) ||
        delta === undefined
      ) {
        return noChange(model)
      }

      const factor = shift === true ? 4 : 1

      const velocity = {
        x: (delta.x / 5) * (model.snapToGrid ? model.snapGrid.x : 5) * factor,
        y: (delta.y / 5) * (model.snapToGrid ? model.snapGrid.y : 5) * factor,
      }

      const items = nodeDragStart(model, nodeId, 'keyboard')

      const graph = createFlowGraph(
        model.document,
        getFlowMeasuredNodes(model.document, model.measurements),
        undefined,
        undefined,
        model.nodeExtent ?? undefined
      )

      const origins = new Map(
        items.origins.map((origin) => [origin.nodeId, origin])
      )

      const updatedAbsolute = new Map<NodeId, XYPosition>()

      const positions = graph.orderedNodes.flatMap((resolved) => {
        const currentNode = resolved.node
        const origin = origins.get(currentNode.id)

        const originalParent =
          currentNode.parentId === undefined
            ? { x: 0, y: 0 }
            : (graph.nodes.get(currentNode.parentId)?.absolutePosition ?? {
                x: 0,
                y: 0,
              })

        const parent =
          currentNode.parentId === undefined
            ? originalParent
            : (updatedAbsolute.get(currentNode.parentId) ?? originalParent)

        if (origin === undefined) {
          updatedAbsolute.set(currentNode.id, {
            x: resolved.absolutePosition.x + parent.x - originalParent.x,
            y: resolved.absolutePosition.y + parent.y - originalParent.y,
          })

          return []
        }

        const extent =
          currentNode.extent === 'parent' && origin.extent !== null
            ? {
                minX: origin.extent.minX + parent.x - originalParent.x,
                minY: origin.extent.minY + parent.y - originalParent.y,
                maxX: origin.extent.maxX + parent.x - originalParent.x,
                maxY: origin.extent.maxY + parent.y - originalParent.y,
              }
            : origin.extent

        const placed = placeDraggedNodes(
          [{ ...origin, parentX: parent.x, parentY: parent.y, extent }],
          velocity,
          model.snapToGrid ? model.snapGrid : undefined
        )

        const [moved] = placed

        if (moved !== undefined) {
          updatedAbsolute.set(moved.nodeId, moved.positionAbsolute)
        }

        return placed
      })

      const absolute =
        updatedAbsolute.get(nodeId) ??
        graph.nodes.get(nodeId)?.absolutePosition ??
        node.position

      const result = updateState(
        model,
        Message.EditRequest({
          requestId: 'keyboard-move',
          transaction: {
            context,
            operations: positions.map(({ nodeId: id, position }) => ({
              kind: 'update-node',
              nodeId: id,
              patch: { position },
            })),
          },
        })
      )

      if (result.model.document === model.document) {
        return result
      }

      return {
        ...result,
        model: {
          ...result.model,
          ariaLiveMessage: {
            direction: key.slice(5).toLowerCase(),
            x: Math.trunc(absolute.x),
            y: Math.trunc(absolute.y),
          },
        },
      }
    },
    IgnoreInput: () => noChange(model),
    SetCanvasOptions: ({ options }) => ({
      model: {
        ...model,
        snapToGrid: options.snapToGrid ?? model.snapToGrid,
        panOnDrag: options.panOnDrag ?? model.panOnDrag,
        selectionOnDrag: options.selectionOnDrag ?? model.selectionOnDrag,
        selectNodesOnDrag: options.selectNodesOnDrag ?? model.selectNodesOnDrag,
        panOnScroll: options.panOnScroll ?? model.panOnScroll,
        panOnScrollSpeed: options.panOnScrollSpeed ?? model.panOnScrollSpeed,
        panOnScrollMode: options.panOnScrollMode ?? model.panOnScrollMode,
        zoomOnScroll: options.zoomOnScroll ?? model.zoomOnScroll,
        zoomOnDoubleClick: options.zoomOnDoubleClick ?? model.zoomOnDoubleClick,
        onlyRenderVisibleElements:
          options.onlyRenderVisibleElements ?? model.onlyRenderVisibleElements,
        snapGrid:
          options.snapGrid === undefined
            ? model.snapGrid
            : Schema.decodeUnknownSync(FlowSnapGridInputSchema)(
                options.snapGrid
              ),
      },
    }),
    SetColorMode: ({ mode }) => ({
      model: {
        ...model,
        colorMode: mode,
        prefersDark: mode === 'system' && prefersDarkColorScheme(),
      },
    }),
    SystemColorScheme: ({ prefersDark }) => ({
      model: { ...model, prefersDark },
    }),
    ObserveMouse: (observed) => {
      if (observed.name !== 'onPaneClick') {
        return selectClickedNode(model, observed)
      }

      const cleared = { ...model, selectionBoundsActive: false }

      if (
        !model.elementsSelectable ||
        (!model.document.nodes.some((node) => node.selected === true) &&
          !model.document.edges.some((edge) => edge.selected === true))
      ) {
        return { model: cleared }
      }

      const change = {
        kind: 'selection-set' as const,
        nodeIds: [],
        edgeIds: [],
      }

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
    ViewportWheel: ({ deltaX, deltaY, clientX, clientY }) => {
      if (model.viewportMode === 'controlled') {
        return noChange(model)
      }

      const { viewport: currentViewport } = model
      let viewport = currentViewport

      if (model.zoomOnScroll || model.zoomKeyPressed) {
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

      return acceptReplacement(
        model,
        { ...model, viewport: translateConstrained(model, viewport) },
        'viewport-update'
      )
    },
    ViewportDoubleClick: ({ clientX, clientY, shiftKey }) => {
      if (!model.zoomOnDoubleClick || model.viewportMode === 'controlled') {
        return noChange(model)
      }

      return acceptReplacement(
        model,
        {
          ...model,
          viewport: translateConstrained(
            model,
            // Pinned xyflow XYPanZoom.ts:103 retains d3-zoom 3.0.0's 2/0.5 targets.
            zoomViewportAt(model, clientX, clientY, shiftKey === true ? 0.5 : 2)
          ),
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
        context: result.context,
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

        const handle = flowNodeHandles(node).find(({ id }) => id === handleId)

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
          viewport: translateConstrained(
            model,
            panViewport(model.viewport, session.autoPanDelta)
          ),
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

      const handle = flowNodeHandles(node).find(
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

      return edge !== undefined &&
        (edge.reconnectable ?? model.edgesReconnectable) !== false &&
        canReconnectEdge(edge, endpoint)
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
      button = 0,
      pointerType = 'mouse',
      screenX,
      screenY,
      resizer,
    }) => {
      if (model.gestureSession !== null || model.pointerSession !== null) {
        return noChange(model)
      }

      if (nodeId === null) {
        const panEnabled = panePanEnabled(model, button, pointerType)

        const selectionEnabled = paneSelectionEnabled(
          model,
          button,
          pointerType
        )

        if (
          allowPan &&
          panEnabled &&
          !selectionEnabled &&
          !model.selectionKeyPressed
        ) {
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

        if (!selectionEnabled) {
          return noChange(model)
        }

        return {
          model: {
            ...model,
            keyboardConnectionSession: null,
            selectionBoundsActive: false,
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

      if (direction !== null && resizer !== undefined) {
        return startResizer(model, {
          pointerId,
          clientX,
          clientY,
          nodeId,
          direction,
          resizer,
        })
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
            viewport: translateConstrained(model, {
              ...session.viewportStart,
              x: session.viewportStart.x + screenX - session.startX,
              y: session.viewportStart.y + screenY - session.startY,
            }),
            gestureSession: {
              ...session,
              currentX: screenX,
              currentY: screenY,
            },
          },
          'viewport-update'
        )
      }

      if (session.kind === 'node-resizer') {
        return { model: stepResizer(model, session, screenX, screenY) }
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

      if (gesture.kind === 'node-resizer') {
        return finishResizer(model, cleared, gesture)
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
            getFlowMeasuredNodes(model.document, model.measurements),
            undefined,
            undefined,
            model.nodeExtent ?? undefined
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
                selectionBoundsActive: change.nodeIds.length > 0,
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
    SelectEdge: ({ edgeId, pointer }) => {
      const edge = model.document.edges.find(
        (candidate) => candidate.id === edgeId
      )

      if (
        edge === undefined ||
        !isEdgeSelectable(selectInteractivity(model), edge)
      ) {
        return noChange(model)
      }

      const multi =
        model.multiSelectionKeyPressed ||
        [model.multiSelectionKeyCode]
          .flat()
          .some(
            (key) =>
              (key === 'Meta' && pointer?.metaKey === true) ||
              (key === 'Control' && pointer?.ctrlKey === true) ||
              (key === 'Alt' && pointer?.altKey === true) ||
              (key === 'Shift' && pointer?.shiftKey === true)
          )

      const change: CoreFlowChange = multi
        ? {
            kind: 'selection-set',
            nodeIds: model.document.nodes
              .filter((node) => node.selected === true)
              .map((node) => node.id),
            edgeIds: model.document.edges
              .filter((candidate) =>
                candidate.id === edgeId
                  ? candidate.selected !== true
                  : candidate.selected === true
              )
              .map((candidate) => candidate.id),
          }
        : {
            kind: 'edge-selection',
            edgeId,
            selected: true,
          }

      const document =
        change.kind === 'selection-set'
          ? applySelectionSetChange(model.document, change)
          : applyEdgeSelectionChange(model.document, change)

      return document === undefined
        ? noChange(model)
        : report(
            model,
            {
              ...model,
              document:
                model.documentMode === 'uncontrolled'
                  ? document
                  : model.document,
            },
            change
          )
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
          getFlowMeasuredNodes(model.document, model.measurements),
          undefined,
          undefined,
          model.nodeExtent ?? undefined
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

      if ((key === ' ' || key === 'Enter') && !shift && nodeId !== null) {
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
          getFlowMeasuredNodes(model.document, model.measurements),
          undefined,
          undefined,
          model.nodeExtent ?? undefined
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
    result.model.selectNodesOnDrag &&
    pending?.kind === 'node-drag' &&
    model.pointerSession?.kind !== 'node-drag'
  ) {
    const node = result.model.document.nodes.find(
      ({ id }) => id === pending.nodeId
    )

    if (
      node !== undefined &&
      isNodeSelectable(selectInteractivity(result.model), node) &&
      (node.selected !== true || result.model.multiSelectionKeyPressed)
    ) {
      return selectNodeForInput(
        result.model,
        node,
        result.model.multiSelectionKeyPressed
      )
    }
  }

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

/**
 * React `node.dragHandle`: a node with a drag-handle selector drags only
 * from an element inside it that matches the selector (`hasSelector`).
 */
const outsideNodeDragHandle = (
  node: HTMLElement | null,
  target: Element
): boolean => {
  const selector = node?.dataset.dragHandle

  if (node === null || selector === undefined || selector === '') {
    return false
  }

  try {
    const handle = target.closest(selector)

    return handle === null || !node.contains(handle)
  } catch {
    // An invalid selector matches nothing, so the node cannot be dragged.
    return true
  }
}

const matchesCanvasClass = (
  target: Element,
  key: 'noDragClass' | 'noPanClass' | 'noWheelClass'
): boolean => {
  const name = target.closest<HTMLElement>('.flow-foldkit-canvas')?.dataset[key]

  return (
    name !== undefined &&
    name !== '' &&
    target.closest(`.${CSS.escape(name)}`) !== null
  )
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
    matchesCanvasClass(target, 'noDragClass') ||
    noDragControl !== null ||
    outsideNodeDragHandle(node, target) ||
    (hasMarkedDragHandle && isMarkedDragHandle === false) ||
    (nativeControl !== null && isMarkedDragHandle === false)
  )
}

type PanePointer = Pick<
  PointerEvent,
  'button' | 'pointerId' | 'clientX' | 'clientY' | 'target'
> & { readonly pointerType?: string }

const beginPointer = (
  raw: PanePointer,
  viewport: CoreViewport
): Option.Option<GraphMessageData> => {
  const { pointerId, clientX, clientY, target, button, pointerType } = raw

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
        button,
        pointerType,
        clientX: flowX,
        clientY: flowY,
        nodeId,
        direction: null,
        allowPan:
          !(target instanceof Element) ||
          (!matchesCanvasClass(target, 'noPanClass') &&
            target.closest(
              '[data-flow-no-pan], .flow-flow__nopan, .flow-foldkit-nopan'
            ) === null),
        screenX: clientX,
        screenY: clientY,
      })
    )
  }

  if (direction !== null) {
    const resizer = readResizerControl(
      targetElement?.closest<HTMLElement>('[data-resize-direction]') ?? null
    )

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
        resizer,
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
  /** Detached endpoint projections from this render, including resize previews. */
  readonly sourceNode: FlowInternalNode
  readonly targetNode: FlowInternalNode
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
  /** Attributes for the runtime-owned connection buttons, recomputed each view. */
  readonly handleAttributes?: (
    node: FlowNode,
    handle: FlowHandle,
    h: FoldHtml.HtmlBuilder<GraphMessageData>
  ) => readonly FoldHtml.Attribute<GraphMessageData>[]
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

/**
 * React Flow NodeProps plus the viewport `zoom`, which a node view reads as
 * React nodes read `useStore((s) => s.transform[2])` (Contextual Zoom).
 */
export interface FoldkitNodeRendererProps extends FlowNodeRendererProps {
  readonly zoom: number
}

/** `props` carries React Flow style NodeProps such as `selected` and `dragging`. */
export type FoldkitNodeRenderer = (
  node: FlowNode,
  h: FoldHtml.HtmlBuilder<GraphMessageData>,
  props: FoldkitNodeRendererProps
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

  const handle = flowNodeHandles(graphNode?.node).find(
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
    sourceNode: projectFlowInternalNode(
      source,
      measurements.get(source.node.id)
    ),
    targetNode: projectFlowInternalNode(
      target,
      measurements.get(target.node.id)
    ),
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

  const graph = createFlowGraph(
    model.document,
    measurements,
    undefined,
    undefined,
    model.nodeExtent ?? undefined
  )

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

    const handle = flowNodeHandles(node).find(
      (candidate) => candidate.id === handleId
    )

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

/**
 * React `MarkerDefinitions` symbol for one resolved marker. A marker without
 * a colour follows the themed edge stroke through CSS.
 */
const markerDefinition = (
  h: FoldHtml.HtmlBuilder<GraphMessageData>,
  id: string,
  marker: ResolvedFlowEdgeMarker
): NonNullable<FoldHtml.Html> => {
  const closed = marker.type === 'arrowclosed'

  const paint = marker.color === undefined ? [] : [h.Stroke(marker.color)]

  const fill = closed ? (marker.color ?? 'currentColor') : 'none'

  const definition = h.marker(
    [
      h.Id(id),
      h.Class(
        flowClassNames(
          'flow-foldkit-marker',
          `flow-foldkit-marker-${marker.type}`,
          marker.color === undefined && 'flow-foldkit-marker-themed'
        )
      ),
      h.ViewBox('-10 -10 20 20'),
      h.RefX('0'),
      h.RefY('0'),
      h.MarkerWidth(String(marker.width)),
      h.MarkerHeight(String(marker.height)),
      h.MarkerUnits(marker.markerUnits),
      h.Attribute('orient', marker.orient),
    ],
    [
      h.polyline([
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
        h.StrokeWidth(String(marker.strokeWidth)),
        h.Fill(fill),
        h.Points(closed ? '-5,-4 0,0 -5,4 -5,-4' : '-5,-4 0,0 -5,4'),
        ...paint,
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
  edgeLabelRenderer: FoldkitEdgeLabelRenderer,
  options: {
    readonly defaultMarkerColor: string | undefined
    readonly descriptionId: string
    readonly disableKeyboardA11y: boolean
  }
) => {
  const ariaLabel = edge.ariaLabel ?? edge.label ?? `Edge ${edge.id}`
  const stroke = edge.stroke ?? '#64748b'
  const markerColor = edge.stroke ?? options.defaultMarkerColor

  const marker = (id: string, option: FlowEdge['markerEnd']) => {
    const resolved = resolveFlowEdgeMarker(option, {
      defaultColor: markerColor,
    })

    return resolved === undefined ? [] : [markerDefinition(h, id, resolved)]
  }

  const markerDefinitions = [
    ...(markerStartId === undefined
      ? []
      : marker(markerStartId, edge.markerStart)),
    ...(markerEndId === undefined ? [] : marker(markerEndId, edge.markerEnd)),
  ]

  // React BaseEdge: `style` on the visible path, after the stroke defaults.
  const strokeDefaults: Record<string, string> = {}

  if (edge.stroke !== undefined) {
    strokeDefaults['stroke'] = edge.stroke
  }

  if (edge.strokeWidth !== undefined) {
    strokeDefaults['stroke-width'] = String(edge.strokeWidth)
  }

  const pathStyle = { ...strokeDefaults, ...foldkitStyle(edge.style) }

  let interactionPath = geometry.path

  const renderedEdge =
    renderer === undefined
      ? h.path([
          h.Class('flow-foldkit-edge-path'),
          h.D(geometry.path),
          h.Fill('none'),
          h.Stroke(stroke),
          h.StrokeWidth(String(edge.strokeWidth ?? 2)),
          ...(Object.keys(pathStyle).length === 0 ? [] : [h.Style(pathStyle)]),
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
    h.StrokeWidth(String(edge.interactionWidth ?? 20)),
    h.PointerEvents('inherit'),
    h.Attribute('role', edge.selectable === false ? 'img' : 'button'),
    h.Attribute('tabindex', edge.focusable === false ? '-1' : '0'),
    h.AriaLabel(ariaLabel),
    h.AriaDescribedBy(options.descriptionId),
    // Clicks and mouse movement are observed by the pointer resource, which
    // reads client positions and modifier keys from the native event.
    h.OnKeyDownPreventDefault((key) =>
      !options.disableKeyboardA11y && (key === 'Enter' || key === ' ')
        ? Option.some(Message.SelectEdge({ edgeId: edge.id }))
        : Option.none()
    ),
  ])

  return { markerDefinitions, content: [renderedEdge, hitTarget] }
}

const edgeReconnectControls = (
  edge: FlowEdge,
  geometry: FoldkitEdgeGeometry,
  ariaLabel: string,
  h: FoldHtml.HtmlBuilder<GraphMessageData>,
  zIndex: number,
  model: Model
): NonNullable<FoldHtml.Html>[] => {
  if (edge.selected !== true) {
    return []
  }

  const endpoints = [
    ['source', geometry.start],
    ['target', geometry.end],
  ] as const

  return endpoints.flatMap(([endpoint, point]) => {
    if (
      !(edge.reconnectable ?? model.edgesReconnectable) ||
      !canReconnectEdge(edge, endpoint)
    ) {
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
        zIndex: String(zIndex),
        width: `${model.reconnectRadius * 2}px`,
        height: `${model.reconnectRadius * 2}px`,
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
    | 'nodeExtent'
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

  const graph = createFlowGraph(
    flowDocument,
    measurements,
    undefined,
    undefined,
    model.nodeExtent ?? undefined
  )

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

    const sourceHandle = flowNodeHandles(sourceNode).find(
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

      const targetHandle = flowNodeHandles(targetNode).find(
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

  const target = firstEventElement(event)

  const nativeControl =
    target instanceof Element
      ? target.closest(
          'button:not(.flow-foldkit-select-node), a[href], [data-flow-no-drag], [data-flow-nodrag]'
        )
      : null

  const interactionControl =
    target instanceof Element
      ? target.closest(
          '[data-handle-id], [data-resize-direction], [data-edge-endpoint], .flow-foldkit-select-node'
        )
      : null

  return (
    !isInputDOMNode(event) &&
    (nativeControl === null || interactionControl !== null)
  )
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
    getFlowMeasuredNodes(model.document, dragMeasurements(model)),
    undefined,
    undefined,
    model.nodeExtent ?? undefined
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
      if (session.kind === 'node-resizer') {
        return (
          session.nodeId === origin.down.nodeId &&
          session.resize.controlPosition === origin.down.direction
        )
      }

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
                  origin.coordinateCanvas.clientHeight,
                  40,
                  current.autoPanSpeed
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
    raw: PanePointer,
    canvas: HTMLElement
  ): GestureDownMessage | undefined => {
    if (
      !panePanEnabled(current, raw.button, raw.pointerType ?? 'mouse') ||
      (raw.button !== 1 &&
        raw.target instanceof Element &&
        current.noPanClassName !== '' &&
        raw.target.closest(`.${CSS.escape(current.noPanClassName)}`) !==
          null) ||
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
      button: raw.button,
      pointerType: raw.pointerType ?? 'mouse',
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

  const classifyPress = (
    raw: PanePointer,
    canvas: HTMLElement
  ): Option.Option<GraphMessageData> => {
    if (
      raw.target instanceof Element &&
      raw.target.closest(
        '.flow-foldkit-edge-label, .flow-foldkit-edge-textwrapper'
      ) !== null
    ) {
      return Option.none()
    }

    return raw.button === 0
      ? beginPointer(raw, current.viewport)
      : Option.fromUndefinedOr(nodePanGesture(raw, canvas))
  }

  const nativeButtonAllowed = (button: number): boolean =>
    button <= 1 ||
    (Array.isArray(current.panOnDrag) && current.panOnDrag.includes(button))

  const begin = (raw: PanePointer): Option.Option<never> => {
    if (!admissionOpen() || !nativeButtonAllowed(raw.button)) {
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

    const classified = classifyPress(raw, canvas)

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

      const stopCanvasInput = observeCanvasInput(
        Message,
        () => current,
        () => canvasForModel(current),
        () => nativeCurrent?.native === 'pressed',
        (message) => {
          Queue.offerUnsafe(queue, message)
        }
      )

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
        observeMouse,
        () => ({
          paneClickDistance: current.paneClickDistance,
          nodeClickDistance: current.nodeClickDistance,
        }),
        () => {
          Queue.offerUnsafe(queue, Message.ClearClickSuppression())
        }
      )

      removeListeners = () => {
        stopMouse()
        stopCanvasInput()
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
): FoldkitNodeRendererProps => ({
  ...flowNodeRendererProps(node, {
    positionAbsolute: position,
    dragging:
      model.pointerSession?.kind === 'node-drag' &&
      model.pointerSession.nodeIds.includes(node.id),
    size,
  }),
  zoom: model.viewport.zoom,
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

/** What Foldkit's own node keys do: select, rectangle-select and cancel. */
const foldkitNodeDescription =
  'Press enter or space on the selection control to select a node. Press shift and space to start a rectangle selection, then use the arrow keys and enter. Press escape to cancel.'

const graphView = (
  renderers: FoldkitRendererRegistry,
  markerScope: string,
  pointerResource: ReturnType<typeof createPointerResource>,
  ariaLive: NonNullable<
    FlowAriaLabelConfigInput['node.a11yDescription.ariaLiveMessage']
  > = defaultFlowAriaLabelConfig['node.a11yDescription.ariaLiveMessage']
) =>
  Submodel.defineView<Model, GraphMessageData>((model, h) => {
    const measurements = getFlowMeasuredNodes(
      model.document,
      model.measurements
    )

    const liveModel = selectLiveModel(model)
    const renderDocument = liveModel.document

    const renderMeasurements = getFlowMeasuredNodes(
      renderDocument,
      liveModel.measurements
    )

    // React `ariaLabelConfig` text entries over the English defaults.
    const ariaLabels = {
      ...defaultFlowAriaLabelConfig,
      ...Object.fromEntries(
        Object.entries(model.ariaLabelConfig).filter(
          ([, value]) => value !== undefined
        )
      ),
    }

    const nodeDescriptionId = `${model.instanceId}-node-desc`

    const edgeDescriptionId = `${model.instanceId}-edge-desc`

    const graph = createFlowGraph(
      renderDocument,
      renderMeasurements,
      undefined,
      undefined,
      model.nodeExtent ?? undefined
    )

    const mountedNodeIds = selectMountedNodeIds(model, measurements, graph)

    const renderEdges = model.document.edges.map((edge) =>
      applyDefaultEdgeOptions(edge, model.defaultEdgeOptions)
    )

    const stacking = computeFlowStacking({
      nodes: renderDocument.nodes,
      edges: renderEdges,
      zIndexMode: model.zIndexMode,
      elevateNodesOnSelect: model.elevateNodesOnSelect,
      elevateEdgesOnSelect: model.elevateEdgesOnSelect,
    })

    const nodes = graph.orderedNodes
      .map(({ node }) => node)
      .filter((node) => mountedNodeIds.has(node.id))
      // oxlint-disable-next-line complexity
      .map((node) => {
        const position =
          graph.nodes.get(node.id)?.absolutePosition ?? node.position

        const measured = renderMeasurements.get(node.id)

        const size = measured ?? node.size

        const renderPosition = position

        const renderSize = size

        // React NodeWrapper: user style first, then position, stacking and
        // dimensions win.
        const style = {
          'pointer-events':
            isNodeDraggable(selectInteractivity(model), node) ||
            isNodeSelectable(selectInteractivity(model), node) ||
            model.nodePointerHandlers
              ? 'all'
              : 'none',
          ...foldkitStyle(node.style),
          left: `${renderPosition.x}px`,
          top: `${renderPosition.y}px`,
          'z-index': String(stacking.nodes.get(node.id) ?? node.zIndex ?? 0),
        }

        if (renderSize !== undefined) {
          if (node.size !== undefined || node.style?.width === undefined) {
            Object.assign(style, { width: `${renderSize.width}px` })
          }

          if (node.size !== undefined || node.style?.height === undefined) {
            Object.assign(style, { height: `${renderSize.height}px` })
          }
        }

        const interactivity = selectInteractivity(model)

        const handles = flowNodeHandles(node).map((handle) =>
          h.button([
            h.Class(
              [
                'flow-foldkit-handle',
                `flow-foldkit-handle-${handle.side}`,
                ...handleConnectabilityClasses(interactivity, node, handle),
              ].join(' ')
            ),
            ...(renderers.handleAttributes?.(node, handle, h) ?? []),
            h.DataAttribute('handle-id', handle.id),
            h.DataAttribute('handle-side', handle.side),
            h.AriaLabel(
              model.ariaLabelConfig['handle.ariaLabel'] ??
                `${handle.kind} handle ${handle.id}`
            ),
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
                  h.Tabindex(model.disableKeyboardA11y ? -1 : 0),
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
              flowClassNames(
                'flow-foldkit-node',
                node.selected === true && 'selected',
                isNodeDraggable(interactivity, node) && 'draggable',
                isNodeDraggable(interactivity, node) && model.noPanClassName,
                isNodeSelectable(interactivity, node) && 'selectable',
                model.pointerSession?.kind === 'node-drag' &&
                  model.pointerSession.nodeIds.includes(node.id) &&
                  'dragging',
                node.className
              )
            ),
            h.DataAttribute('testid', 'flow-node'),
            h.DataAttribute('node-id', node.id),
            h.DataAttribute(
              'height-declared',
              String(
                node.size !== undefined || node.style?.height !== undefined
              )
            ),
            ...(node.dragHandle === undefined
              ? []
              : [h.DataAttribute('drag-handle', node.dragHandle)]),
            ...(node.focusable === false ? [] : [h.Attribute('tabindex', '0')]),
            h.DataAttribute(
              'draggable',
              String(isNodeDraggable(selectInteractivity(model), node))
            ),
            h.Attribute('role', node.ariaRole ?? 'group'),
            ...(node.ariaLabel === undefined
              ? []
              : [h.AriaLabel(node.ariaLabel)]),
            ...(node.ariaDescription === undefined
              ? []
              : [h.Attribute('aria-description', node.ariaDescription)]),
            ...(model.disableKeyboardA11y
              ? []
              : [h.AriaDescribedBy(nodeDescriptionId)]),
            h.Style(style),
          ],
          [...contents, ...handles, ...resizeHandles, ...selectionControl]
        )
      })

    const topNodeZ = Math.max(0, ...stacking.nodes.values())

    const edgeLabels: NonNullable<FoldHtml.Html>[] = []
    const customEdgeLabels: NonNullable<FoldHtml.Html>[] = []
    const reconnectControls: NonNullable<FoldHtml.Html>[] = []

    const visibleEdges = renderEdges
      .filter(
        (edge) =>
          (!model.onlyRenderVisibleElements ||
            mountedNodeIds.has(edge.source) ||
            mountedNodeIds.has(edge.target) ||
            edgeCrossesViewport(model, graph, edge)) &&
          edge.hidden !== true &&
          graph.nodes.get(edge.source)?.hidden !== true &&
          graph.nodes.get(edge.target)?.hidden !== true
      )
      // oxlint-disable-next-line complexity -- Edge presentation combines visibility, labels, markers and custom renderers.
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

        const renderer = renderers.edgeTypes?.[edge.type ?? 'default']

        const ariaLabel = edge.ariaLabel ?? edge.label ?? `Edge ${edge.id}`

        const edgeZ = stacking.edges.get(edge.id) ?? edge.zIndex ?? 0

        // Reconnect anchors sit above every node, including elevated
        // selected nodes, so a selected endpoint node never covers them.
        reconnectControls.push(
          ...edgeReconnectControls(
            edge,
            geometry,
            ariaLabel,
            h,
            Math.max(edgeZ, topNodeZ) + 1,
            model
          )
        )

        if (edge.label !== undefined) {
          const presentation = edgeLabelPresentation(edge)

          const label = h.keyed('div')(
            edge.id,
            [
              h.Class(
                flowClassNames('flow-foldkit-edge-label', model.noPanClassName)
              ),
              h.DataAttribute('flow-no-pan', ''),
              h.DataAttribute('edge-id', edge.id),
              h.DataAttribute('label-owner', 'host-overlay'),
              h.Style({
                ...presentation.box,
                left: `${geometry.labelPosition.x}px`,
                top: `${geometry.labelPosition.y}px`,
                'z-index': String(edgeZ),
              }),
            ],
            [
              h.span(
                [
                  h.Class('flow-foldkit-edge-label-text'),
                  h.Style(presentation.text),
                ],
                [edge.label]
              ),
            ]
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
          htmlLabels.collect,
          {
            defaultMarkerColor: model.defaultMarkerColor ?? undefined,
            descriptionId: edgeDescriptionId,
            disableKeyboardA11y: model.disableKeyboardA11y,
          }
        )

        customEdgeLabels.push(...htmlLabels.group())

        return h.keyed('svg')(
          edge.id,
          [
            h.Class(
              flowClassNames(
                'flow-foldkit-edge',
                model.noPanClassName,
                isEdgeSelectable(selectInteractivity(model), edge) &&
                  'selectable',
                !isEdgeSelectable(selectInteractivity(model), edge) &&
                  !model.edgeClickHandler &&
                  'inactive',
                edge.selected === true && 'selected',
                edge.animated === true && 'animated',
                edge.className
              )
            ),
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
            h.Attribute('role', edge.ariaRole ?? 'group'),
            h.AriaLabel(ariaLabel),
            // Keep the SVG's own hit box off the graph; paths can paint and
            // receive input outside this one-pixel viewport.
            h.Attribute('width', '1'),
            h.Attribute('height', '1'),
            h.ViewBox('0 0 1 1'),
            h.Style({
              overflow: 'visible',
              'z-index': String(edgeZ),
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
              h.Style({
                ...foldkitStyle(model.connectionLineContainerStyle),
                overflow: 'visible',
                pointerEvents: 'none',
              }),
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
                h.Style(foldkitStyle(model.connectionLineStyle)),
              ]),
            ]
          ))

    const selectedBounds =
      model.selectionBoundsActive && model.gestureSession?.kind !== 'selection'
        ? graphBounds(
            graph,
            new Set(
              model.document.nodes
                .filter((node) => node.selected)
                .map(({ id }) => id)
            )
          )
        : undefined

    return h.div(
      [
        h.Class(
          flowClassNames(
            'flow-foldkit-canvas',
            resolveFlowColorMode(model.colorMode, model.prefersDark),
            paneIsSelecting(model) ? 'selection' : ''
          )
        ),
        h.DataAttribute('color-mode', model.colorMode),
        h.DataAttribute('flow-instance', model.instanceId),
        h.DataAttribute('no-drag-class', model.noDragClassName),
        h.DataAttribute('no-pan-class', model.noPanClassName),
        h.DataAttribute('no-wheel-class', model.noWheelClassName),
        h.DataAttribute('testid', 'flow-canvas'),
        h.Tabindex(0),
        h.OnPointerDown(
          (
            pointerType,
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
              pointerType,
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
            ...(selectedBounds === undefined
              ? []
              : [
                  h.div(
                    [
                      h.Class('flow-foldkit-selection-box'),
                      h.Style({
                        left: `${selectedBounds.x}px`,
                        top: `${selectedBounds.y}px`,
                        width: `${selectedBounds.width}px`,
                        height: `${selectedBounds.height}px`,
                      }),
                    ],
                    []
                  ),
                ]),
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
        ...(model.disableKeyboardA11y
          ? []
          : [
              h.div(
                [
                  h.Class('flow-foldkit-change-kinds'),
                  h.AriaLive('assertive'),
                  h.Attribute('aria-atomic', 'true'),
                ],
                [
                  model.ariaLiveMessage === null
                    ? ''
                    : ariaLive(model.ariaLiveMessage),
                ]
              ),
            ]),
        // React A11yDescriptions: the texts nodes and edges are described by.
        h.div(
          [
            h.Id(nodeDescriptionId),
            h.Class('flow-foldkit-a11y-description'),
            h.Style({ display: 'none' }),
          ],
          [
            // The delete key routes through the composed approval client.
            model.disableKeyboardA11y
              ? ariaLabels['node.a11yDescription.default']
              : (model.ariaLabelConfig[
                  'node.a11yDescription.keyboardDisabled'
                ] ??
                model.ariaLabelConfig['node.a11yDescription.default'] ??
                foldkitNodeDescription),
          ]
        ),
        h.div(
          [
            h.Id(edgeDescriptionId),
            h.Class('flow-foldkit-a11y-description'),
            h.Style({ display: 'none' }),
          ],
          [ariaLabels['edge.a11yDescription.default']]
        ),
      ]
    )
  })

export const makeView = (
  renderers: FoldkitRendererRegistry,
  markerScope: string,
  pointerResource: ReturnType<typeof createPointerResource>,
  ariaLive?: FlowAriaLabelConfigInput['node.a11yDescription.ariaLiveMessage']
) => graphView(renderers, markerScope, pointerResource, ariaLive)

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
          ? Dom.streamFromEventFilterMapPreventDefault({
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
      instanceId: Schema.String,
      panOnScroll: Schema.Boolean,
      zoomOnScroll: Schema.Boolean,
      zoomOnDoubleClick: Schema.Boolean,
    },
    {
      modelToDependencies: (model) => ({
        instanceId: model.instanceId,
        panOnScroll: model.panOnScroll,
        zoomOnScroll: model.zoomOnScroll || model.zoomKeyPressed,
        zoomOnDoubleClick: model.zoomOnDoubleClick,
      }),
      dependenciesToStream: ({
        instanceId,
        panOnScroll,
        zoomOnScroll,
        zoomOnDoubleClick,
      }) => {
        const events: Stream.Stream<GraphMessageData>[] = []

        if (panOnScroll || zoomOnScroll) {
          events.push(
            Dom.streamFromEventFilterMapPreventDefault({
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

                if (
                  canvas === null ||
                  !(canvas instanceof HTMLElement) ||
                  canvas.dataset.flowInstance !== instanceId ||
                  noWheel !== null ||
                  (target instanceof Element &&
                    matchesCanvasClass(target, 'noWheelClass'))
                ) {
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
            Dom.streamFromEventFilterMapPreventDefault({
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

                return canvas === null ||
                  !(canvas instanceof HTMLElement) ||
                  canvas.dataset.flowInstance !== instanceId ||
                  noWheel !== null ||
                  (target instanceof Element &&
                    matchesCanvasClass(target, 'noWheelClass'))
                  ? Option.none()
                  : Option.some(
                      Message.ViewportDoubleClick({
                        clientX: event.clientX,
                        clientY: event.clientY,
                        shiftKey: event.shiftKey,
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
  // React `useColorModeClass`: follow the system scheme while `system`.
  systemColorScheme: entry(
    { active: Schema.Boolean },
    {
      modelToDependencies: (model) => ({
        active: model.colorMode === 'system',
      }),
      dependenciesToStream: ({ active }) => {
        const query = globalThis.matchMedia?.(flowColorModeMediaQuery)

        return active && query !== undefined
          ? Dom.streamFromEvent({
              target: query,
              type: 'change',
              mapEvent: (event: MediaQueryListEvent): GraphMessageData =>
                Message.SystemColorScheme({ prefersDark: event.matches }),
            })
          : Stream.empty
      },
    }
  ),
  connectionAutoPan: Subscription.animationFrameEntry<Model, GraphMessageData>({
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
                Dom.streamFromEvent({
                  target: document,
                  type: 'keyup',
                  mapEvent: (event: KeyboardEvent): GraphMessageData =>
                    Message.FinishKeyboardResize({ key: event.key }),
                }),
                Dom.streamFromEvent({
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
    {
      active: Schema.Boolean,
      instanceId: Schema.String,
      keyboardActivation: Schema.Boolean,
      keyboardSelection: Schema.Boolean,
      nonFocusableNodeIds: Schema.Array(Schema.String),
      movableNodeIds: Schema.Array(Schema.String),
    },
    {
      modelToDependencies: (model) => ({
        active: !model.disableKeyboardA11y,
        instanceId: model.instanceId,
        keyboardActivation: model.keyboardActivation,
        keyboardSelection:
          model.gestureSession?.kind === 'selection' &&
          model.gestureSession.pointerId === -2,
        nonFocusableNodeIds: model.document.nodes
          .filter((node) => node.focusable === false)
          .map(({ id }) => id),
        movableNodeIds: model.document.nodes
          .filter(
            (node) =>
              node.selected === true &&
              isNodeDraggable(selectInteractivity(model), node)
          )
          .map(({ id }) => id),
      }),
      dependenciesToStream: ({
        active,
        instanceId,
        keyboardActivation,
        keyboardSelection,
        nonFocusableNodeIds,
        movableNodeIds,
      }) =>
        active
          ? Dom.streamFromEvent({
              target: document,
              type: 'keydown',
              mapEvent: (event: KeyboardEvent): GraphMessageData => {
                const target = firstEventElement(event)
                const path = event.composedPath()

                const canvas = path.find(
                  (element) =>
                    element instanceof HTMLElement &&
                    element.dataset.flowInstance === instanceId
                )

                if (
                  target === null ||
                  canvas === undefined ||
                  isInputDOMNode(event)
                ) {
                  return Message.IgnoreInput({})
                }

                const nativeControl = target.closest(
                  'button:not(.flow-foldkit-select-node), a[href], [data-flow-no-drag], [data-flow-nodrag]'
                )

                if (nativeControl !== null) {
                  return Message.IgnoreInput({})
                }

                const control = target.closest<HTMLElement>(
                  '.flow-foldkit-select-node'
                )

                const nodeElement = path.find(
                  (element): element is HTMLElement =>
                    element instanceof HTMLElement &&
                    Object.hasOwn(element.dataset, 'nodeId')
                )

                const nodeId = nodeElement?.dataset.nodeId

                if (
                  nodeId !== undefined &&
                  nonFocusableNodeIds.includes(nodeId)
                ) {
                  return Message.IgnoreInput({})
                }

                if (
                  (event.key === ' ' || event.key === 'Enter') &&
                  nodeId !== undefined
                ) {
                  event.preventDefault()
                }

                if (
                  nodeId !== undefined &&
                  control === null &&
                  ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
                    event.key
                  )
                ) {
                  if (
                    !keyboardActivation ||
                    (!keyboardSelection && !movableNodeIds.includes(nodeId))
                  ) {
                    return Message.IgnoreInput({})
                  }

                  event.preventDefault()

                  return Message.MoveNodeByKeyboard({
                    nodeId: Schema.decodeUnknownSync(NodeIdSchema)(nodeId),
                    key: event.key,
                    shift: event.shiftKey,
                  })
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

/** Host callbacks and raw option inputs stay outside the schema-checked model. */
const withoutCallbacks = ({
  isValidConnection: _callback,
  snapGrid: _snapGrid,
  nodeExtent: _nodeExtent,
  translateExtent: _translateExtent,
  ariaLabelConfig: _ariaLabelConfig,
  defaultMarkerColor: _defaultMarkerColor,
  ...options
}: GraphInteractionOptions) => options

const decodeExtent = (
  input: GraphInteractionOptions['nodeExtent']
): PanExtent | null =>
  input === undefined
    ? null
    : Schema.decodeUnknownSync(FlowExtentInputSchema)(input)

/** The text entries of a partial `ariaLabelConfig`; the live message is a function. */
const ariaLabelTextConfig = (input: FlowAriaLabelConfigInput | undefined) =>
  Schema.decodeUnknownSync(FlowAriaLabelTextConfigSchema)(
    Object.fromEntries(
      Object.entries(input ?? {}).filter(
        ([key, value]) =>
          key !== 'node.a11yDescription.ariaLiveMessage' && value !== undefined
      )
    )
  )

const platformModifier = (): string =>
  globalThis.navigator?.userAgent.includes('Mac') === true ? 'Meta' : 'Control'

const defaultViewportLimits: typeof ViewportLimitsSchema.Type = {
  minZoom: 0.1,
  maxZoom: 2,
}

// oxlint-disable-next-line complexity -- one default per canvas option.
export const initialModel = (
  document: FlowDocument,
  viewport: CoreViewport,
  allowedTargets: readonly string[] = [],
  documentMode: 'controlled' | 'uncontrolled' = 'uncontrolled',
  viewportMode: 'controlled' | 'uncontrolled' = 'uncontrolled',
  selectionMode: typeof SelectionModeSchema.Type = 'full',
  interactionOptions: GraphInteractionOptions = defaultInteractionOptions,
  instanceId = 'flow-foldkit-default',
  viewportLimits: typeof ViewportLimitsSchema.Type = defaultViewportLimits
): Model => ({
  ...Schema.decodeUnknownSync(ClosingOptionsSchema)({
    ...defaultClosingOptions,
    ...interactionOptions,
  }),
  zoomActivationKeyCode:
    interactionOptions.zoomActivationKeyCode === undefined
      ? platformModifier()
      : interactionOptions.zoomActivationKeyCode,
  fitViewPending: interactionOptions.fitView === true,
  paneSize: { width: 0, height: 0, bounds: { width: 0, height: 0 } },
  rendererRevision: 0,
  selectionKeyPressed: false,
  panKeyPressed: false,
  viewportLimits,
  multiSelectionKeyPressed: false,
  zoomKeyPressed: false,
  ariaLiveMessage: null,
  instanceId,
  document,
  viewport: Effect.runSync(decodeInitialViewport(viewport, viewportLimits)),
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
  panOnDrag: Schema.decodeUnknownSync(ModelSchema.fields.panOnDrag)(
    interactionOptions.panOnDrag ?? false
  ),
  selectionOnDrag: interactionOptions.selectionOnDrag ?? true,
  selectNodesOnDrag: interactionOptions.selectNodesOnDrag ?? false,
  panOnScroll: interactionOptions.panOnScroll ?? false,
  panOnScrollSpeed: interactionOptions.panOnScrollSpeed ?? 1,
  panOnScrollMode: interactionOptions.panOnScrollMode ?? 'free',
  zoomOnScroll: interactionOptions.zoomOnScroll ?? false,
  zoomOnDoubleClick: interactionOptions.zoomOnDoubleClick ?? false,
  keyboardActivation:
    interactionOptions.disableKeyboardA11y === true
      ? false
      : (interactionOptions.keyboardActivation ?? true),
  connectOnClick: interactionOptions.connectOnClick ?? true,
  nodesResizable: interactionOptions.nodesResizable ?? false,
  snapToGrid: interactionOptions.snapToGrid ?? false,
  snapGrid: Schema.decodeUnknownSync(FlowSnapGridInputSchema)(
    interactionOptions.snapGrid ?? [15, 15]
  ),
  nodeExtent: decodeExtent(interactionOptions.nodeExtent),
  translateExtent: decodeExtent(interactionOptions.translateExtent),
  colorMode: interactionOptions.colorMode ?? 'light',
  prefersDark:
    interactionOptions.colorMode === 'system' && prefersDarkColorScheme(),
  zIndexMode: interactionOptions.zIndexMode ?? 'basic',
  elevateNodesOnSelect: interactionOptions.elevateNodesOnSelect ?? true,
  elevateEdgesOnSelect: interactionOptions.elevateEdgesOnSelect ?? false,
  ariaLabelConfig: ariaLabelTextConfig(interactionOptions.ariaLabelConfig),
  defaultMarkerColor: interactionOptions.defaultMarkerColor ?? null,
  fitViewOptions: Schema.decodeUnknownSync(
    ClosingOptionsSchema.fields.fitViewOptions
  )(interactionOptions.fitViewOptions ?? {}),
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
  nodePointerHandlers: false,
  edgeClickHandler: false,
  selectionBoundsActive: false,
})

export const subscriptions = PointerEvents

export type {
  FlowChange,
  FlowCommand,
  SelectionMode,
  Viewport,
} from '@flow/core'
