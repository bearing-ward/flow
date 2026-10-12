import {
  FlowAttribute,
  FlowCommandSchema,
  HandleIdSchema,
  NodeIdSchema,
  FlowSnapshotSchema,
  FlowDocumentSchema,
  FlowControlModeSchema,
  FitViewPaddingSchema,
  FitViewNodeDimensionsSchema,
  PanExtentSchema,
  NodeExtentSchema,
  NodeResizeDirectionSchema,
  SnapGridSchema,
  ConnectionDragThresholdSchema,
  defaultConnectionDragThreshold,
  connectionDragActivated,
  EdgeIdSchema,
  ReconnectEndpointSchema,
  ConnectionRadiusSchema,
  ConnectionModeSchema,
  SelectionModeSchema,
  FlowSpan,
  ViewportLimitsSchema,
  ViewportSchema,
  XYPositionSchema,
  applyEdgeSelectionChange,
  applyEdgeReconnectChange,
  applyEdgeRemoveChange,
  applyNodeSelectionChange,
  applySelectionSetChange,
  applyNodePositionChange,
  applyNodePositionsChange,
  applyNodeSizeChange,
  applyNodeBoundsChange,
  applyNodeMeasurements,
  areFlowNodesInitialized,
  setNodeMeasurementGenerations,
  calculateNodeResize,
  graphResizeChildExtent,
  createFlowSnapshot,
  createConnectionPreviewSnapshot,
  selectNodesData,
  selectNodeConnections,
  diffNodeConnections,
  FlowHandleConnectionsQuerySchema,
  selectHandleConnections,
  selectFlowSelection,
  flowSelectionEqual,
  encodeSavedFlowSession,
  encodeVersionedFlowSession,
  decodeSavedFlowSession,
  decodeVersionedFlowSession,
  beginNodeDrag,
  beginViewportPan,
  clampViewport,
  constrainViewportToExtent,
  constrainNodePosition,
  constrainNodeGroupDelta,
  fitViewportToNodes,
  getViewportForBounds,
  interpolateViewport,
  ViewportBoundsSchema,
  ViewportOperationResultSchema,
  ViewportPaddingSchema,
  createFlowGraph,
  emptyFlowMeasurementState,
  getFlowInternalNode,
  getFlowMeasuredNodes,
  inferHandleMeasurement,
  graphBounds,
  flowToolbarAnchors,
  prepareFlowCommand,
  prepareFlowEdit,
  prepareFlowDeleteCandidate,
  finalizeFlowDeleteCandidate,
  FlowDeleteRevisionConflict,
  FlowDeleteInvalidCandidate,
  FlowDeleteInProgress,
  FlowDeleteCancelled,
  FlowDeleteApprovalFailed,
  completeNodeDrag,
  moveViewportPan,
  movePinch,
  moveNodeDrag,
  moveNodeGroupDrag,
  moveSelectedNodes,
  nextConnectionEdge,
  findConnectionIssue,
  nearestConnectionTarget,
  normalizeFlowConnection,
  reconnectFlowEdge,
  resolveEdgeHandles,
  canReconnectEdge,
  screenToFlowPosition,
  selectionInRect,
  selectionAutoPanDelta,
  flowToScreenPosition,
  panViewport,
  zoomViewportAt,
  decodeFlowDocument,
  edgeIntersectsViewport,
  nodeIntersectsViewport,
  pruneFlowMeasurements,
  viewportFlowRect,
  connectionFromHandleGesture,
  FlowDefaultEdgeOptionsSchema,
  decodeFlowDefaultEdgeOptions,
  applyDefaultEdgeOptions,
  activateFlowInteraction,
  cancelFlowInteraction,
  finishFlowInteraction,
  replaceFlowInteraction,
  startFlowInteraction,
} from '@flow/core'
import type {
  ActiveNodeDrag,
  ActiveNodeGroupDrag,
  ActiveConnection,
  ActiveClickConnection,
  ActiveEdgeReconnect,
  ActiveViewportPan,
  ActivePinch,
  ActiveSelectionRect,
  ActiveNodeResize,
  FlowChange,
  FlowCommand,
  FlowConnection,
  FlowControlMode,
  FlowDocument,
  FlowEdge,
  FlowHandleConnectionsQuery,
  FlowDefaultEdgeOptions,
  FlowDeleteResult,
  FlowDeleteDecision,
  FlowDeleteLifecycle,
  FlowEditResult,
  FlowEditTransactionInput,
  FlowNode,
  FlowToolbarAnchor,
  NodePositionChange,
  NodePositionsChange,
  NodeBoundsChange,
  NodeResizeDirection,
  MeasuredNode,
  FlowMeasurementState,
  NodeInternalsRefreshResult as CoreNodeInternalsRefreshResult,
  NodeMeasurementGeneration,
  NodeMeasurementInput,
  FlowInternalNode,
  FlowHandle,
  ReconnectEndpoint,
  EdgeId,
  NodeId,
  Viewport,
  SavedFlowSession,
  SavedVersionedFlowSession,
  ViewportBounds,
  ViewportOperationResult,
  ViewportLimits,
  PanExtent,
  NodeExtent,
  SnapGrid,
  ConnectionRadius,
  ConnectionMode,
  ConnectionPreviewState,
  ConnectionPreviewSnapshot,
  MeasuredConnectionHandle,
  XYPosition,
  SelectionMode,
  FlowInteractionSession,
  FlowInteractionSessions,
  FlowInteractionOutcome,
  FlowSnapshot,
  FlowSelection,
  FlowNodeConnection,
  FlowStateChange,
  FlowStateChangeCause,
  FlowNodeSchema,
  FlowEdgeSchema,
} from '@flow/core'
import { Cause, Effect, Exit, Result, Schema as S, Scope } from 'effect'

import { createCanvasUI } from './canvas-ui.ts'
import { createEdgeRenderer, measureNodeHandles } from './edge-renderer.ts'
import { FlowBrowser, FlowBrowserLive } from './flow-browser.ts'
import { observeKeyPress } from './key-press-observer.ts'
import type { FlowKeyCode, FlowKeyPressOptions } from './key-press-observer.ts'

const noActiveGestures = (): boolean => false

const decodeJsonPatch = (
  patch: Partial<FlowNode> | Partial<FlowEdge>
): typeof S.JsonObject.Type =>
  S.decodeUnknownSync(S.JsonObject)(
    Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined)
    )
  )

type NodeUpdaterInput =
  | readonly (typeof FlowNodeSchema.Encoded)[]
  | ((nodes: readonly FlowNode[]) => readonly FlowNode[])

type EdgeUpdaterInput =
  | readonly (typeof FlowEdgeSchema.Encoded)[]
  | ((edges: readonly FlowEdge[]) => readonly FlowEdge[])

type NodePatchInput =
  | Partial<FlowNode>
  | ((node: FlowNode) => Partial<FlowNode>)

type EdgePatchInput =
  | Partial<FlowEdge>
  | ((edge: FlowEdge) => Partial<FlowEdge>)

type NodeDataUpdaterInput =
  | typeof S.JsonObject.Type
  | ((data: NonNullable<FlowNode['data']>) => typeof S.JsonObject.Type)

type EdgeDataUpdaterInput =
  | typeof S.JsonObject.Type
  | ((data: NonNullable<FlowEdge['data']>) => typeof S.JsonObject.Type)

const isNodeUpdater = (
  input: NodeUpdaterInput
): input is (nodes: readonly FlowNode[]) => readonly FlowNode[] =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

const isEdgeUpdater = (
  input: EdgeUpdaterInput
): input is (edges: readonly FlowEdge[]) => readonly FlowEdge[] =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

const isNodePatchUpdater = (
  input: NodePatchInput
): input is (node: FlowNode) => Partial<FlowNode> =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

const isEdgePatchUpdater = (
  input: EdgePatchInput
): input is (edge: FlowEdge) => Partial<FlowEdge> =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

const isNodeDataUpdater = (
  input: NodeDataUpdaterInput
): input is (data: NonNullable<FlowNode['data']>) => typeof S.JsonObject.Type =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

const isEdgeDataUpdater = (
  input: EdgeDataUpdaterInput
): input is (data: NonNullable<FlowEdge['data']>) => typeof S.JsonObject.Type =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof input === 'function'

const flowSnapshotEquivalence = S.toEquivalence(FlowSnapshotSchema)

const flowDocumentEquivalence = S.toEquivalence(FlowDocumentSchema)

type KeyboardResizeKey = 'ArrowUp' | 'ArrowRight' | 'ArrowDown' | 'ArrowLeft'

const noopUnsubscribe = (): boolean => false

const mountedViewportPortalElements = new WeakSet<HTMLElement>()

interface ActiveKeyboardResize {
  readonly nodeId: NodeId
  readonly direction: NodeResizeDirection
  readonly key: KeyboardResizeKey
  readonly step: number
  readonly button: HTMLButtonElement
  readonly positionStart: XYPosition
  readonly sizeStart: { readonly width: number; readonly height: number }
  readonly delta: XYPosition
  readonly change: NodeBoundsChange
  readonly childExtent: ActiveNodeResize['childExtent']
}

const PendingHandleSchema = S.Struct({
  nodeId: NodeIdSchema,
  handleId: HandleIdSchema,
  kind: S.Literals(['source', 'target']),
})

const PendingPointerSchema = S.Struct({
  pointerId: S.Number,
  startX: S.Finite,
  startY: S.Finite,
  threshold: ConnectionDragThresholdSchema,
})

const PendingConnectionSchema = S.Union([
  S.Struct({
    ...PendingPointerSchema.fields,
    kind: S.Literal('connection-pending'),
    from: PendingHandleSchema,
  }),
  S.Struct({
    ...PendingPointerSchema.fields,
    kind: S.Literal('reconnection-pending'),
    edgeId: EdgeIdSchema,
    endpoint: ReconnectEndpointSchema,
    source: PendingHandleSchema,
    target: PendingHandleSchema,
  }),
])

type PendingConnection = typeof PendingConnectionSchema.Type

export const CanvasBackgroundSchema = S.Struct({
  pattern: S.Literals(['dots', 'lines', 'none']),
  spacing: S.optional(S.Finite.check(S.isGreaterThan(0))),
  color: S.optional(S.NonEmptyString),
})

export const CanvasUISchema = S.Struct({
  controls: S.optional(S.Boolean),
  minimap: S.optional(S.Boolean),
})

export const FlowMountOptionsSchema = S.Struct({
  documentMode: FlowControlModeSchema,
  connectionDragThreshold: S.optional(ConnectionDragThresholdSchema),
  nodeDragThreshold: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  connectOnClick: S.optional(S.Boolean),
  panOnDrag: S.optional(
    S.Union([
      S.Literals([true, false]),
      S.Array(
        S.Int.check(S.isGreaterThanOrEqualTo(0), S.isLessThanOrEqualTo(4))
      ),
    ])
  ),
  panActivationModifier: S.optional(
    S.Literals(['shift', 'alt', 'control', 'meta', 'none'])
  ),
  selectionOnDrag: S.optional(S.Boolean),
  selectNodesOnDrag: S.optional(S.Boolean),
  selectionActivationModifier: S.optional(
    S.Literals(['shift', 'alt', 'control', 'meta', 'none'])
  ),
  nodesConnectable: S.optional(S.Boolean),
  panOnScroll: S.optional(S.Boolean),
  panOnScrollSpeed: S.optional(S.Finite.check(S.isGreaterThan(0))),
  panOnScrollMode: S.optional(S.Literals(['free', 'horizontal', 'vertical'])),
  zoomOnScroll: S.optional(S.Boolean),
  zoomOnDoubleClick: S.optional(S.Boolean),
  zoomOnPinch: S.optional(S.Boolean),
  keyboardActivation: S.optional(S.Boolean),
  connectionMode: S.optional(ConnectionModeSchema),
  autoPanOnConnect: S.optional(S.Boolean),
  snapGrid: S.optional(SnapGridSchema),
  connectionRadius: S.optional(ConnectionRadiusSchema),
  nodeExtent: S.optional(NodeExtentSchema),
  renderOnlyVisible: S.optional(S.Boolean),
  defaultEdgeOptions: S.optional(FlowDefaultEdgeOptionsSchema),
  selectionMode: S.optional(SelectionModeSchema),
  background: S.optional(CanvasBackgroundSchema),
  ui: S.optional(CanvasUISchema),
  viewport: S.Struct({
    extent: S.optional(PanExtentSchema),
    initial: ViewportSchema,
    limits: ViewportLimitsSchema,
    mode: FlowControlModeSchema,
  }),
})

export type CanvasPanelPlacement =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface FlowPanelOption {
  readonly id: string
  readonly element: HTMLElement
  readonly placement: CanvasPanelPlacement
}

export class CanvasUIOptionsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CanvasUIOptionsError'
  }
}

const canvasPanelPlacements = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const satisfies readonly CanvasPanelPlacement[]

const isCanvasPanelPlacement = (
  value: unknown
): value is CanvasPanelPlacement =>
  S.is(S.Literals(canvasPanelPlacements))(value)

const validateCanvasPanelOptions = (
  panel: FlowMountOptionsInput['panel'],
  panels: FlowMountOptionsInput['panels']
): readonly FlowPanelOption[] | undefined => {
  if (panel !== undefined && !(panel instanceof globalThis.HTMLElement)) {
    throw new CanvasUIOptionsError('panel must be an HTMLElement')
  }

  if (panel !== undefined && panels !== undefined) {
    throw new CanvasUIOptionsError('Use either panel or panels, not both')
  }

  if (panels === undefined) {
    return undefined
  }

  if (!Array.isArray(panels)) {
    throw new CanvasUIOptionsError('panels must be an array')
  }

  const ids = new Set<string>()
  const elements = new Set<HTMLElement>()

  return panels.map((candidate, index): FlowPanelOption => {
    if (!S.is(S.Struct({}))(candidate)) {
      throw new CanvasUIOptionsError(`panels[${index}] must be an object`)
    }

    const { id, element, placement } = candidate

    if (!S.is(S.String)(id) || id.trim().length === 0) {
      throw new CanvasUIOptionsError(
        `panels[${index}].id must be a non-empty string`
      )
    }

    if (!(element instanceof globalThis.HTMLElement)) {
      throw new CanvasUIOptionsError(
        `panels[${index}].element must be an HTMLElement`
      )
    }

    if (!isCanvasPanelPlacement(placement)) {
      throw new CanvasUIOptionsError(
        `panels[${index}].placement is not supported`
      )
    }

    if (ids.has(id)) {
      throw new CanvasUIOptionsError(`Duplicate panel id: ${id}`)
    }

    if (elements.has(element)) {
      throw new CanvasUIOptionsError('A panel element can only be used once')
    }

    ids.add(id)
    elements.add(element)

    return { id, element, placement }
  })
}

export const FitViewOptionsSchema = S.Struct({
  nodes: S.optional(S.Literals(['all', 'selected'])),
  padding: S.optional(FitViewPaddingSchema),
  fallbackDimensions: S.optional(FitViewNodeDimensionsSchema),
  duration: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  easing: S.optional(S.Literals(['linear', 'ease-in-out'])),
})

export const FitBoundsOptionsSchema = S.Struct({
  padding: S.optional(ViewportPaddingSchema),
  duration: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  easing: S.optional(S.Literals(['linear', 'ease-in-out'])),
})

export type FitBoundsOptions = typeof FitBoundsOptionsSchema.Type

const SetCenterOptionsSchema = S.Struct({
  duration: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  easing: S.optional(S.Literals(['linear', 'ease-in-out'])),
  zoom: S.optional(S.Finite),
})

interface SetCenterOptions {
  duration?: number
  easing?: 'linear' | 'ease-in-out'
  zoom?: number
}

export interface ViewportObservation {
  readonly kind: 'start' | 'change' | 'end'
  readonly source: 'programmatic' | 'user'
  readonly viewport: Viewport
}

export type FlowViewportLifecycleListener = (
  observation: ViewportObservation
) => void

export interface FlowNodeDragPayload {
  readonly nodeIds: readonly NodeId[]
  readonly positions: readonly {
    readonly nodeId: NodeId
    readonly position: XYPosition
  }[]
}

export interface FlowNodeDragStopPayload extends FlowNodeDragPayload {
  readonly outcome: 'proposed' | 'cancelled'
  readonly reason?: string | undefined
}

export interface FlowConnectStartPayload {
  readonly source: NodeId
  readonly sourceHandle: string
  readonly inputKind: 'pointer-connect' | 'click-connect'
}

export interface FlowConnectEndPayload extends FlowConnectStartPayload {
  readonly outcome: 'proposed' | 'rejected' | 'cancelled'
  readonly target?: { readonly nodeId: NodeId; readonly handleId: string }
  readonly reason?: string | undefined
}

export interface FlowReconnectStartPayload {
  readonly edgeId: EdgeId
  readonly endpoint: ReconnectEndpoint
}

export interface FlowReconnectEndPayload extends FlowReconnectStartPayload {
  readonly outcome: 'proposed' | 'rejected' | 'cancelled'
  readonly edge?: FlowEdge
  readonly reason?: string | undefined
}

export interface FlowSelectionRectPayload {
  readonly pointerId: number
  readonly rect: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly nodeIds: readonly NodeId[]
  readonly edgeIds: readonly EdgeId[]
}

export interface FlowSelectionEndPayload extends FlowSelectionRectPayload {
  readonly outcome: 'finished' | 'cancelled'
  readonly reason?: string | undefined
}

export interface FlowSelectionContextMenuPayload {
  readonly nodeIds: readonly string[]
  readonly edgeIds: readonly string[]
  readonly position: XYPosition
}

export interface FlowCanvasEventPayload {
  readonly position: XYPosition
  readonly nodeId?: string | undefined
  readonly edgeId?: string | undefined
}

type FlowCanvasEventListener = (event: FlowCanvasEventPayload) => void

type FlowCanvasEventTarget =
  | { readonly kind: 'pane' }
  | { readonly kind: 'node'; readonly id: string }
  | { readonly kind: 'edge'; readonly id: string }

const getFlowCanvasEventTarget = (
  target: EventTarget | null
): FlowCanvasEventTarget => {
  const element = target instanceof Element ? target : null
  const node = element?.closest<HTMLElement>('.flow-node')

  if (node?.dataset.nodeId !== undefined) {
    return { kind: 'node', id: node.dataset.nodeId }
  }

  const edge = element?.closest<SVGGElement>('.flow-edge-group')

  if (edge?.dataset.edgeId !== undefined) {
    return { kind: 'edge', id: edge.dataset.edgeId }
  }

  return { kind: 'pane' }
}

const flowCanvasEventTargetId = (
  target: FlowCanvasEventTarget
): string | undefined => {
  if (target.kind === 'pane') {
    return undefined
  }

  return target.id
}

export type FitViewOptions = typeof FitViewOptionsSchema.Type

export type FlowMountOptions = typeof FlowMountOptionsSchema.Type

export type FlowConnectionCandidate = Pick<
  FlowEdge,
  'source' | 'sourceHandle' | 'target' | 'targetHandle'
>

export type FlowConnectionValidator = (
  connection: FlowConnectionCandidate
) => boolean

export type FlowConnectionPreviewRenderer = (
  preview: ConnectionPreviewState | null,
  container: SVGSVGElement
) => void

export interface FlowNodeRendererInstance {
  readonly update: (node: FlowNode) => void
  readonly destroy: () => void
}

export type FlowNodeRenderer = (
  node: FlowNode,
  content: HTMLElement
) => FlowNodeRendererInstance

export interface FlowEdgeRenderContext {
  readonly source: XYPosition
  readonly target: XYPosition
  readonly sourceSide: FlowHandle['side']
  readonly targetSide: FlowHandle['side']
  readonly pathData: string
  readonly labelAnchor: XYPosition
}

type SessionPointerIds = readonly [number, ...number[]]

interface NodeDimensions {
  readonly width: number
  readonly height: number
}

const sessionPointerIds = (
  session: FlowInteractionSession
): SessionPointerIds => {
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
      const exhaustive: never = session

      return exhaustive
    }
  }
}

const pointerIdsFromOutcome = (
  outcome: FlowInteractionOutcome,
  fallback: readonly number[]
): readonly number[] =>
  outcome.kind === 'finished' || outcome.kind === 'cancelled'
    ? outcome.pointerIds
    : fallback

export interface FlowEdgeRendererInstance {
  readonly update: (edge: FlowEdge, context: FlowEdgeRenderContext) => void
  readonly destroy: () => void
}

interface FlowInteractionSlots {
  activeDrag: (ActiveNodeDrag | ActiveNodeGroupDrag) | null
  activeConnection: ActiveConnection | null
  activeReconnection: ActiveEdgeReconnect | null
  activeViewportPan: ActiveViewportPan | null
  activePinch: ActivePinch | null
  activeSelectionRect: ActiveSelectionRect | null
  activeNodeResize: ActiveNodeResize | null
}

interface CanvasUIHandle {
  current: ReturnType<typeof createCanvasUI> | undefined
}

interface FitViewControlHandle {
  current: (() => void) | undefined
}

export interface FlowEdgeRenderer {
  readonly geometry?: (
    edge: FlowEdge,
    endpoints: Omit<FlowEdgeRenderContext, 'pathData' | 'labelAnchor'>
  ) => { readonly pathData: string; readonly labelAnchor: XYPosition }
  readonly render?: (
    edge: FlowEdge,
    context: FlowEdgeRenderContext,
    visual: SVGGElement
  ) => FlowEdgeRendererInstance
}

export interface FlowHostOptions {
  readonly documentMode: FlowControlMode
  readonly connectionDragThreshold?:
    | typeof ConnectionDragThresholdSchema.Type
    | undefined
  readonly nodeDragThreshold?: number | undefined
  readonly connectOnClick?: boolean | undefined
  readonly panOnDrag?: boolean | readonly number[] | undefined
  readonly panActivationModifier?:
    | 'shift'
    | 'alt'
    | 'control'
    | 'meta'
    | 'none'
    | undefined
  readonly selectionOnDrag?: boolean | undefined
  readonly selectNodesOnDrag?: boolean | undefined
  readonly selectionActivationModifier?:
    | 'shift'
    | 'alt'
    | 'control'
    | 'meta'
    | 'none'
    | undefined
  readonly nodesConnectable?: boolean | undefined
  readonly panOnScroll?: boolean | undefined
  readonly panOnScrollSpeed?: number | undefined
  readonly panOnScrollMode?: 'free' | 'horizontal' | 'vertical' | undefined
  readonly zoomOnScroll?: boolean | undefined
  readonly zoomOnDoubleClick?: boolean | undefined
  readonly zoomOnPinch?: boolean | undefined
  readonly keyboardActivation?: boolean | undefined
  readonly onMoveStart?: FlowViewportLifecycleListener | undefined
  readonly onMove?: FlowViewportLifecycleListener | undefined
  readonly onMoveEnd?: FlowViewportLifecycleListener | undefined
  readonly onNodeDragStart?: ((drag: FlowNodeDragPayload) => void) | undefined
  readonly onNodeDrag?: ((drag: FlowNodeDragPayload) => void) | undefined
  readonly onNodeDragStop?:
    | ((drag: FlowNodeDragStopPayload) => void)
    | undefined
  readonly onConnectStart?:
    | ((connection: FlowConnectStartPayload) => void)
    | undefined
  readonly onConnect?:
    | ((connection: FlowConnectionCandidate) => void)
    | undefined
  readonly onConnectEnd?:
    | ((connection: FlowConnectEndPayload) => void)
    | undefined
  readonly onReconnectStart?:
    | ((reconnect: FlowReconnectStartPayload) => void)
    | undefined
  readonly onReconnect?: ((reconnect: FlowEdge) => void) | undefined
  readonly onReconnectEnd?:
    | ((reconnect: FlowReconnectEndPayload) => void)
    | undefined
  readonly onSelectionStart?:
    | ((selection: FlowSelectionRectPayload) => void)
    | undefined
  readonly onSelectionDrag?:
    | ((selection: FlowSelectionRectPayload) => void)
    | undefined
  readonly onSelectionEnd?:
    | ((selection: FlowSelectionEndPayload) => void)
    | undefined
  readonly onSelectionContextMenu?:
    | ((selection: FlowSelectionContextMenuPayload) => void)
    | undefined
  readonly onPaneClick?: FlowCanvasEventListener | undefined
  readonly onPaneDoubleClick?: FlowCanvasEventListener | undefined
  readonly onPaneContextMenu?: FlowCanvasEventListener | undefined
  readonly onPaneMouseEnter?: FlowCanvasEventListener | undefined
  readonly onPaneMouseMove?: FlowCanvasEventListener | undefined
  readonly onPaneMouseLeave?: FlowCanvasEventListener | undefined
  readonly onNodeClick?: FlowCanvasEventListener | undefined
  readonly onNodeDoubleClick?: FlowCanvasEventListener | undefined
  readonly onNodeContextMenu?: FlowCanvasEventListener | undefined
  readonly onNodeMouseEnter?: FlowCanvasEventListener | undefined
  readonly onNodeMouseMove?: FlowCanvasEventListener | undefined
  readonly onNodeMouseLeave?: FlowCanvasEventListener | undefined
  readonly onEdgeClick?: FlowCanvasEventListener | undefined
  readonly onEdgeDoubleClick?: FlowCanvasEventListener | undefined
  readonly onEdgeContextMenu?: FlowCanvasEventListener | undefined
  readonly onEdgeMouseEnter?: FlowCanvasEventListener | undefined
  readonly onEdgeMouseMove?: FlowCanvasEventListener | undefined
  readonly onEdgeMouseLeave?: FlowCanvasEventListener | undefined
  readonly onError?: ((error: Error) => void) | undefined
  readonly connectionMode?: ConnectionMode | undefined
  readonly autoPanOnConnect?: boolean | undefined
  readonly snapGrid?: SnapGrid | undefined
  readonly connectionRadius?: ConnectionRadius | undefined
  readonly isValidConnection?: FlowConnectionValidator | undefined
  readonly connectionPreview?: FlowConnectionPreviewRenderer | undefined
  readonly nodeExtent?: NodeExtent | undefined
  readonly renderOnlyVisible?: boolean | undefined
  readonly selectionMode?: SelectionMode | undefined
  readonly defaultEdgeOptions?: FlowDefaultEdgeOptions | undefined
  readonly background?: typeof CanvasBackgroundSchema.Type | undefined
  readonly ui?: typeof CanvasUISchema.Type | undefined
  readonly panel?: HTMLElement | undefined
  readonly panels?: readonly FlowPanelOption[] | undefined
  readonly toolbarContainers?:
    | {
        readonly nodes?: Readonly<Record<string, HTMLElement>> | undefined
        readonly edges?: Readonly<Record<string, HTMLElement>> | undefined
      }
    | undefined
  readonly nodeRenderers?:
    | Readonly<Record<string, FlowNodeRenderer>>
    | undefined
  readonly edgeRenderers?:
    | Readonly<Record<string, FlowEdgeRenderer>>
    | undefined
  readonly onToolbarAnchors?:
    | ((anchors: {
        readonly nodes: readonly FlowToolbarAnchor[]
        readonly edges: readonly FlowToolbarAnchor[]
      }) => void)
    | undefined
  readonly viewport: {
    readonly extent?: PanExtent | undefined
    readonly mode: FlowControlMode
    readonly initial: Viewport
    readonly limits: ViewportLimits
  }
  readonly runEffect: <A>(effect: Effect.Effect<A>) => A
  readonly runTelemetry?: ((effect: Effect.Effect<void>) => void) | undefined
  readonly runPromise?:
    | (<A>(effect: Effect.Effect<A>) => Promise<A>)
    | undefined
}

const isActivationModifierPressed = (
  event: Pick<PointerEvent, 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'>,
  modifier: 'shift' | 'alt' | 'control' | 'meta' | 'none'
): boolean =>
  modifier === 'none' ||
  (modifier === 'shift' && event.shiftKey) ||
  (modifier === 'alt' && event.altKey) ||
  (modifier === 'control' && event.ctrlKey) ||
  (modifier === 'meta' && event.metaKey)

const isPanButtonEnabled = (
  option: boolean | readonly number[] | undefined,
  button: number
): boolean =>
  option !== false &&
  (Array.isArray(option) ? option.includes(button) : button === 0)

const isSelectionActivationEnabled = (
  options: FlowHostOptions,
  event: PointerEvent
): boolean =>
  options.selectionOnDrag !== false &&
  options.selectNodesOnDrag !== false &&
  isActivationModifierPressed(
    event,
    options.selectionActivationModifier ?? 'shift'
  )

const projectHandleConnectionEdges = (edges: readonly FlowEdge[]) =>
  edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
    edgeId: id,
    source,
    target,
    sourceHandle,
    targetHandle,
  }))

export interface FlowController {
  readonly overlayPortal: HTMLElement
  /** Mount caller-owned content in graph coordinates inside this canvas viewport. */
  readonly mountViewportPortal: (element: HTMLElement) => () => void
  readonly getConnectionPreview: () => ConnectionPreviewSnapshot
  readonly subscribeConnectionPreview: (
    listener: (preview: ConnectionPreviewSnapshot) => void
  ) => () => void
  readonly subscribeSelection: (
    listener: (selection: FlowSelection) => void
  ) => () => void
  readonly observeKeyPress: (
    keyCode: FlowKeyCode,
    options: FlowKeyPressOptions,
    listener: (pressed: boolean) => void
  ) => () => void
  readonly getSnapshot: () => FlowSnapshot
  readonly getDocumentRevision: () => number
  readonly getVersionedSavedSession: () => SavedVersionedFlowSession
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Public persistence input is decoded by the versioned session boundary.
  readonly prepareVersionedRestore: (saved: unknown) => Promise<FlowSnapshot>
  readonly getSavedSession: () => SavedFlowSession
  readonly prepareRestore: (saved: SavedFlowSession) => Promise<FlowSnapshot>
  readonly getNodes: () => readonly FlowNode[]
  readonly getEdges: () => readonly FlowEdge[]
  readonly getNode: (id: string) => FlowNode | undefined
  readonly getNodesData: (
    nodeIds: readonly string[]
  ) => ReturnType<typeof selectNodesData>
  readonly getNodeConnections: (options: {
    readonly nodeId: string
    readonly type?: 'source' | 'target'
    readonly handleId?: string | null
  }) => ReturnType<typeof selectNodeConnections>
  readonly observeNodeConnections: (
    options: {
      readonly nodeId: string
      readonly type?: 'source' | 'target'
      readonly handleId?: string | null
    },
    callbacks: {
      readonly onConnect?: (connections: readonly FlowNodeConnection[]) => void
      readonly onDisconnect?: (
        connections: readonly FlowNodeConnection[]
      ) => void
    }
  ) => () => void
  /** Observe accepted changes to one directional handle query. Initial state is silent. */
  readonly observeHandleConnections: (
    query: FlowHandleConnectionsQuery,
    callbacks: {
      readonly onConnect?: (connections: readonly FlowEdge[]) => void
      readonly onDisconnect?: (connections: readonly FlowEdge[]) => void
    }
  ) => () => void
  readonly getHandleConnections: (
    query: FlowHandleConnectionsQuery
  ) => readonly FlowEdge[]
  readonly getInternalNode: (id: string) => FlowInternalNode | undefined
  readonly nodesInitialized: (options?: { includeHidden?: boolean }) => boolean
  readonly updateNodeInternals: (
    nodeIds: string | readonly string[]
  ) => Promise<readonly NodeInternalsRefreshResult[]>
  readonly getEdge: (id: string) => FlowEdge | undefined
  readonly getViewport: () => Viewport
  readonly getViewportLimits: () => ViewportLimits
  readonly getZoom: () => number
  readonly viewportInitialized: boolean
  readonly screenToFlowPosition: (position: XYPosition) => XYPosition
  readonly flowToScreenPosition: (position: XYPosition) => XYPosition
  readonly getViewportForBounds: (
    bounds: ViewportBounds,
    options?: FitBoundsOptions
  ) => Viewport | undefined
  readonly setViewport: (
    viewport: Viewport,
    options?: Pick<FitBoundsOptions, 'duration' | 'easing'>
  ) => Promise<ViewportOperationResult>
  readonly zoomIn: (
    options?: Pick<FitBoundsOptions, 'duration' | 'easing'>
  ) => Promise<ViewportOperationResult>
  readonly zoomOut: (
    options?: Pick<FitBoundsOptions, 'duration' | 'easing'>
  ) => Promise<ViewportOperationResult>
  readonly zoomTo: (
    zoom: number,
    options?: Pick<FitBoundsOptions, 'duration' | 'easing'>
  ) => Promise<ViewportOperationResult>
  readonly setCenter: (
    x: number,
    y: number,
    options?: Pick<FitBoundsOptions, 'duration' | 'easing'> & { zoom?: number }
  ) => Promise<ViewportOperationResult>
  readonly fitBounds: (
    bounds: ViewportBounds,
    options?: FitBoundsOptions
  ) => Promise<ViewportOperationResult>
  readonly fitView: (
    options?: FitViewOptions
  ) => Promise<ViewportOperationResult>
  readonly update: (document: FlowDocument) => void
  readonly applyEdit: (
    transaction: FlowEditTransactionInput
  ) => Promise<FlowEditResult>
  readonly applyEditResolved: (
    resolve: (document: FlowDocument) => FlowEditTransactionInput
  ) => Promise<FlowEditResult>
  readonly withMutation: (mutation: () => void) => void
  readonly updateViewport: (viewport: Viewport) => void
  readonly dispatch: (command: FlowCommand) => void
  readonly subscribe: (listener: (change: FlowChange) => void) => () => void
  readonly subscribeState: (
    listener: (change: FlowStateChange) => void
  ) => () => void
  readonly subscribeViewport: (
    listener: (event: ViewportObservation) => void
  ) => () => void
  readonly destroy: () => void
  readonly destroyAsync: () => Promise<void>
}

export type FlowDocumentInput = typeof FlowDocumentSchema.Encoded

export type FlowDeleteLifecycleOptions = FlowDeleteLifecycle & {
  readonly signal?: AbortSignal | undefined
}

export type FlowCommandInput = typeof FlowCommandSchema.Encoded

export type ViewportInput = typeof ViewportSchema.Encoded

export type FlowMountOptionsInput = typeof FlowMountOptionsSchema.Encoded & {
  readonly onInit?: ((controller: JavaScriptFlowController) => void) | undefined
  readonly onMoveStart?: FlowViewportLifecycleListener | undefined
  readonly onMove?: FlowViewportLifecycleListener | undefined
  readonly onMoveEnd?: FlowViewportLifecycleListener | undefined
  readonly onNodeDragStart?: ((drag: FlowNodeDragPayload) => void) | undefined
  readonly onNodeDrag?: ((drag: FlowNodeDragPayload) => void) | undefined
  readonly onNodeDragStop?:
    | ((drag: FlowNodeDragStopPayload) => void)
    | undefined
  readonly onConnectStart?:
    | ((connection: FlowConnectStartPayload) => void)
    | undefined
  readonly onConnect?:
    | ((connection: FlowConnectionCandidate) => void)
    | undefined
  readonly onConnectEnd?:
    | ((connection: FlowConnectEndPayload) => void)
    | undefined
  readonly onReconnectStart?:
    | ((reconnect: FlowReconnectStartPayload) => void)
    | undefined
  readonly onReconnect?: ((reconnect: FlowEdge) => void) | undefined
  readonly onReconnectEnd?:
    | ((reconnect: FlowReconnectEndPayload) => void)
    | undefined
  readonly onSelectionStart?:
    | ((selection: FlowSelectionRectPayload) => void)
    | undefined
  readonly onSelectionDrag?:
    | ((selection: FlowSelectionRectPayload) => void)
    | undefined
  readonly onSelectionEnd?:
    | ((selection: FlowSelectionEndPayload) => void)
    | undefined
  readonly onSelectionContextMenu?:
    | ((selection: FlowSelectionContextMenuPayload) => void)
    | undefined
  readonly onPaneClick?: FlowCanvasEventListener | undefined
  readonly onPaneDoubleClick?: FlowCanvasEventListener | undefined
  readonly onPaneContextMenu?: FlowCanvasEventListener | undefined
  readonly onPaneMouseEnter?: FlowCanvasEventListener | undefined
  readonly onPaneMouseMove?: FlowCanvasEventListener | undefined
  readonly onPaneMouseLeave?: FlowCanvasEventListener | undefined
  readonly onNodeClick?: FlowCanvasEventListener | undefined
  readonly onNodeDoubleClick?: FlowCanvasEventListener | undefined
  readonly onNodeContextMenu?: FlowCanvasEventListener | undefined
  readonly onNodeMouseEnter?: FlowCanvasEventListener | undefined
  readonly onNodeMouseMove?: FlowCanvasEventListener | undefined
  readonly onNodeMouseLeave?: FlowCanvasEventListener | undefined
  readonly onEdgeClick?: FlowCanvasEventListener | undefined
  readonly onEdgeDoubleClick?: FlowCanvasEventListener | undefined
  readonly onEdgeContextMenu?: FlowCanvasEventListener | undefined
  readonly onEdgeMouseEnter?: FlowCanvasEventListener | undefined
  readonly onEdgeMouseMove?: FlowCanvasEventListener | undefined
  readonly onEdgeMouseLeave?: FlowCanvasEventListener | undefined
  readonly onError?: ((error: Error) => void) | undefined
  readonly isValidConnection?: FlowConnectionValidator | undefined
  readonly connectionPreview?: FlowConnectionPreviewRenderer | undefined
  readonly nodeRenderers?:
    | Readonly<Record<string, FlowNodeRenderer>>
    | undefined
  readonly edgeRenderers?:
    | Readonly<Record<string, FlowEdgeRenderer>>
    | undefined
  readonly onToolbarAnchors?:
    | ((anchors: {
        readonly nodes: readonly FlowToolbarAnchor[]
        readonly edges: readonly FlowToolbarAnchor[]
      }) => void)
    | undefined
  readonly panel?: HTMLElement | undefined
  readonly panels?: readonly FlowPanelOption[] | undefined
  readonly toolbarContainers?:
    | {
        readonly nodes?: Readonly<Record<string, HTMLElement>> | undefined
        readonly edges?: Readonly<Record<string, HTMLElement>> | undefined
      }
    | undefined
}

export interface JavaScriptFlowController {
  readonly overlayPortal: HTMLElement
  readonly mountViewportPortal: FlowController['mountViewportPortal']
  readonly getConnectionPreview: FlowController['getConnectionPreview']
  readonly subscribeConnectionPreview: FlowController['subscribeConnectionPreview']
  readonly subscribeSelection: FlowController['subscribeSelection']
  readonly observeKeyPress: FlowController['observeKeyPress']
  readonly getSnapshot: () => FlowSnapshot
  readonly getVersionedSavedSession: () => SavedVersionedFlowSession
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Public persistence input is decoded by the versioned session boundary.
  readonly prepareVersionedRestore: (saved: unknown) => Promise<FlowSnapshot>
  readonly getSavedSession: () => SavedFlowSession
  readonly prepareRestore: (saved: SavedFlowSession) => Promise<FlowSnapshot>
  readonly getNodes: () => readonly FlowNode[]
  readonly getEdges: () => readonly FlowEdge[]
  readonly getNode: (id: string) => FlowNode | undefined
  readonly getNodesData: (
    nodeIds: readonly string[]
  ) => ReturnType<typeof selectNodesData>
  readonly getNodeConnections: (options: {
    readonly nodeId: string
    readonly type?: 'source' | 'target'
    readonly handleId?: string | null
  }) => ReturnType<typeof selectNodeConnections>
  readonly observeNodeConnections: FlowController['observeNodeConnections']
  readonly observeHandleConnections: FlowController['observeHandleConnections']
  readonly getHandleConnections: FlowController['getHandleConnections']
  readonly getInternalNode: (id: string) => FlowInternalNode | undefined
  readonly nodesInitialized: (options?: { includeHidden?: boolean }) => boolean
  readonly updateNodeInternals: (
    nodeIds: string | readonly string[]
  ) => Promise<readonly NodeInternalsRefreshResult[]>
  readonly getEdge: (id: string) => FlowEdge | undefined
  readonly getViewport: () => Viewport
  readonly getViewportLimits: () => ViewportLimits
  readonly getZoom: () => number
  readonly viewportInitialized: boolean
  readonly screenToFlowPosition: (position: XYPosition) => XYPosition
  readonly flowToScreenPosition: (position: XYPosition) => XYPosition
  readonly getViewportForBounds: (
    bounds: typeof ViewportBoundsSchema.Encoded,
    options?: typeof FitBoundsOptionsSchema.Encoded
  ) => Viewport | undefined
  readonly setViewport: (
    viewport: ViewportInput,
    options?: typeof FitBoundsOptionsSchema.Encoded
  ) => Promise<ViewportOperationResult>
  readonly zoomIn: (
    options?: typeof FitBoundsOptionsSchema.Encoded
  ) => Promise<ViewportOperationResult>
  readonly zoomOut: (
    options?: typeof FitBoundsOptionsSchema.Encoded
  ) => Promise<ViewportOperationResult>
  readonly zoomTo: (
    zoom: number,
    options?: typeof FitBoundsOptionsSchema.Encoded
  ) => Promise<ViewportOperationResult>
  readonly setCenter: (
    x: number,
    y: number,
    options?: typeof FitBoundsOptionsSchema.Encoded & {
      readonly zoom?: number | undefined
    }
  ) => Promise<ViewportOperationResult>
  readonly fitBounds: (
    bounds: typeof ViewportBoundsSchema.Encoded,
    options?: typeof FitBoundsOptionsSchema.Encoded
  ) => Promise<ViewportOperationResult>
  readonly fitView: (
    options?: typeof FitViewOptionsSchema.Encoded
  ) => Promise<ViewportOperationResult>
  readonly update: (document: FlowDocumentInput) => void
  readonly applyEdit: (
    transaction: FlowEditTransactionInput
  ) => Promise<FlowEditResult>
  readonly setNodes: (
    nodes:
      | readonly (typeof FlowNodeSchema.Encoded)[]
      | ((nodes: readonly FlowNode[]) => readonly FlowNode[])
  ) => Promise<FlowEditResult>
  readonly addNodes: (
    nodes:
      | typeof FlowNodeSchema.Encoded
      | readonly (typeof FlowNodeSchema.Encoded)[]
  ) => Promise<FlowEditResult>
  readonly setEdges: (
    edges:
      | readonly (typeof FlowEdgeSchema.Encoded)[]
      | ((edges: readonly FlowEdge[]) => readonly FlowEdge[])
  ) => Promise<FlowEditResult>
  readonly addEdges: (
    edges:
      | typeof FlowEdgeSchema.Encoded
      | readonly (typeof FlowEdgeSchema.Encoded)[]
  ) => Promise<FlowEditResult>
  readonly updateNode: (
    id: string,
    patch: Partial<FlowNode> | ((node: FlowNode) => Partial<FlowNode>),
    options?: { replace?: boolean }
  ) => Promise<FlowEditResult>
  readonly updateNodeData: (
    id: string,
    data:
      | typeof S.JsonObject.Type
      | ((data: NonNullable<FlowNode['data']>) => typeof S.JsonObject.Type),
    options?: { replace?: boolean }
  ) => Promise<FlowEditResult>
  readonly updateEdge: (
    id: string,
    patch: Partial<FlowEdge> | ((edge: FlowEdge) => Partial<FlowEdge>),
    options?: { replace?: boolean }
  ) => Promise<FlowEditResult>
  readonly updateEdgeData: (
    id: string,
    data:
      | typeof S.JsonObject.Type
      | ((data: NonNullable<FlowEdge['data']>) => typeof S.JsonObject.Type),
    options?: { replace?: boolean }
  ) => Promise<FlowEditResult>
  readonly deleteElements: (
    input: {
      nodeIds?: readonly string[]
      edgeIds?: readonly string[]
    },
    options?: FlowDeleteLifecycleOptions
  ) => Promise<FlowDeleteResult>
  readonly updateViewport: (viewport: ViewportInput) => void
  readonly dispatch: (command: FlowCommandInput) => void
  readonly subscribe: (listener: (change: FlowChange) => void) => () => void
  readonly subscribeState: (
    listener: (change: FlowStateChange) => void
  ) => () => void
  readonly subscribeViewport: (
    listener: (event: ViewportObservation) => void
  ) => () => void
  readonly destroy: () => void
  readonly destroyAsync: () => Promise<void>
}

export type FlowCreateOptions = FlowMountOptionsInput & {
  readonly onChange?: ((change: FlowChange) => void) | undefined
}

interface NodeEntry {
  readonly element: HTMLElement
  readonly content: HTMLElement
  readonly handles: HTMLElement
  readonly release: () => void
  generation: number
  rendererType: string | undefined
  renderer: FlowNodeRendererInstance | undefined
}

export type NodeInternalsRefreshResult = CoreNodeInternalsRefreshResult

const dragAnchorId = (drag: ActiveNodeDrag | ActiveNodeGroupDrag): NodeId =>
  'nodeId' in drag ? drag.nodeId : drag.anchorNodeId

const keyboardArrowDelta = (key: string): XYPosition | null => {
  switch (key) {
    case 'ArrowLeft': {
      return { x: -1, y: 0 }
    }

    case 'ArrowRight': {
      return { x: 1, y: 0 }
    }

    case 'ArrowUp': {
      return { x: 0, y: -1 }
    }

    case 'ArrowDown': {
      return { x: 0, y: 1 }
    }

    default: {
      return null
    }
  }
}

const applyNodePosition = (
  element: HTMLElement,
  position: XYPosition
): void => {
  element.style.transform = `translate(${position.x}px, ${position.y}px)`
}

const applyViewport = (element: HTMLElement, viewport: Viewport): void => {
  element.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
  element.dataset.x = String(viewport.x)
  element.dataset.y = String(viewport.y)
  element.dataset.zoom = String(viewport.zoom)
}

const sameNode = (left: FlowNode | undefined, right: FlowNode): boolean =>
  left?.label === right.label &&
  left.position.x === right.position.x &&
  left.position.y === right.position.y &&
  left.parentId === right.parentId &&
  left.type === right.type &&
  left.zIndex === right.zIndex &&
  JSON.stringify(left.size) === JSON.stringify(right.size) &&
  JSON.stringify(left.data) === JSON.stringify(right.data) &&
  left.extent === right.extent &&
  JSON.stringify(left.handles ?? []) === JSON.stringify(right.handles ?? []) &&
  left.selected === right.selected &&
  left.selectable === right.selectable &&
  left.focusable === right.focusable &&
  left.draggable === right.draggable &&
  left.ariaLabel === right.ariaLabel &&
  left.ariaDescription === right.ariaDescription &&
  left.hidden === right.hidden

const applyNodeInteractionState = (
  element: HTMLElement,
  node: FlowNode
): void => {
  element.classList.toggle('selected', node.selected === true)
  element.tabIndex = node.focusable === false ? -1 : 0
  element.setAttribute('role', node.selectable === false ? 'img' : 'button')
  element.setAttribute('aria-roledescription', 'node')
  element.setAttribute('aria-label', node.ariaLabel ?? node.label)

  if (node.ariaDescription === undefined) {
    element.removeAttribute('aria-description')
  } else {
    element.setAttribute('aria-description', node.ariaDescription)
  }

  if (node.selectable === false) {
    element.removeAttribute('aria-pressed')
  } else {
    element.setAttribute('aria-pressed', String(node.selected === true))
  }
}

const renderDefaultNodeContents = (
  content: HTMLElement,
  node: FlowNode
): void => {
  const label = globalThis.document.createElement('span')
  label.textContent = node.label
  content.replaceChildren(label)
}

const measurementFailure = (cause: unknown, nodeId: string) =>
  Effect.logError('Flow measurement refresh failed', cause).pipe(
    Effect.annotateLogs({
      [FlowAttribute.failureName]:
        cause instanceof Error ? cause.name : 'Unknown',
      [FlowAttribute.nodeId]: nodeId,
    }),
    Effect.withSpan(FlowSpan.geometryMeasure)
  )

const renderNodeHandles = (handles: HTMLElement, node: FlowNode): void => {
  handles.replaceChildren()

  for (const handle of node.handles ?? []) {
    const button = globalThis.document.createElement('button')
    button.type = 'button'
    button.className = `flow-handle flow-handle-${handle.side} flow-handle-${handle.kind}`
    button.dataset.nodeId = node.id
    button.dataset.handleId = handle.id
    button.dataset.kind = handle.kind
    button.dataset.testid = 'flow-handle'
    button.setAttribute('aria-label', `${handle.kind} handle ${handle.id}`)
    handles.append(button)
  }
}

const resizeDirections: readonly NodeResizeDirection[] = [
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left',
]

const renderNodeResizeHandle = (element: HTMLElement, node: FlowNode): void => {
  const existing = new Map(
    [
      ...element.querySelectorAll<HTMLButtonElement>(
        '.flow-node-resize-handle'
      ),
    ].map((handle) => [handle.dataset.direction, handle])
  )

  if (node.selected !== true) {
    for (const handle of existing.values()) {
      handle.remove()
    }

    return
  }

  for (const direction of resizeDirections) {
    const handle =
      existing.get(direction) ?? globalThis.document.createElement('button')

    handle.type = 'button'
    handle.className = `flow-node-resize-handle flow-node-resize-${direction}`
    handle.dataset.testid = 'flow-node-resize-handle'
    handle.dataset.direction = direction
    const label = `Resize ${node.label} from ${direction.replaceAll('-', ' ')}`
    handle.setAttribute('aria-label', label)
    handle.setAttribute('title', label)

    if (!handle.isConnected) {
      element.append(handle)
    }
  }
}

const applyDeclaredNodeSize = (element: HTMLElement, node: FlowNode): void => {
  if (node.size === undefined) {
    element.style.removeProperty('width')
    element.style.removeProperty('height')
    element.style.removeProperty('box-sizing')
    delete element.dataset.sized

    return
  }

  element.style.width = `${node.size.width}px`
  element.style.height = `${node.size.height}px`
  element.style.boxSizing = 'border-box'
  element.dataset.sized = 'true'
}

const isCanvasUiTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('.flow-canvas-ui') !== null

const isCanvasGraphTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  (target.closest('.flow-node') !== null ||
    target.closest('.flow-edge-group') !== null)

const isNodePointerTargetAllowed = (
  content: HTMLElement,
  target: EventTarget | null
): boolean => {
  const contentTarget =
    target instanceof Element && content.contains(target) ? target : null

  const noDragTarget = contentTarget?.closest(
    '[data-flow-no-drag], [data-flow-nodrag], .nodrag'
  )

  if (
    noDragTarget !== null &&
    noDragTarget !== undefined &&
    content.contains(noDragTarget)
  ) {
    return false
  }

  const hasCustomDragHandle =
    content.querySelector('[data-flow-drag-handle]') !== null

  const dragHandle = contentTarget?.closest('[data-flow-drag-handle]')

  if (
    hasCustomDragHandle &&
    (dragHandle === null ||
      dragHandle === undefined ||
      !content.contains(dragHandle))
  ) {
    return false
  }

  const nativeControl = contentTarget?.closest(
    'button, input, select, textarea, a[href], [contenteditable="true"]'
  )

  return (
    nativeControl === null ||
    nativeControl === undefined ||
    nativeControl === dragHandle
  )
}

const isGestureForPointer = (
  gesture: { readonly pointerId: number } | null,
  pointerId: number | undefined
): boolean =>
  gesture !== null &&
  (pointerId === undefined || gesture.pointerId === pointerId)

const changeForFinishedDrag = (
  drag: ActiveNodeDrag | ActiveNodeGroupDrag,
  candidate: NodePositionChange | NodePositionsChange,
  boundGroupChange: (
    drag: ActiveNodeGroupDrag,
    candidate: NodePositionsChange
  ) => NodePositionsChange,
  boundNodePosition: (nodeId: NodeId, position: XYPosition) => XYPosition,
  localPositionFromAbsolute: (
    nodeId: NodeId,
    position: XYPosition
  ) => XYPosition
): NodePositionChange | NodePositionsChange => {
  if (candidate.kind === 'node-positions' && 'positions' in drag) {
    return boundGroupChange(drag, candidate)
  }

  if (candidate.kind === 'node-position') {
    return {
      ...candidate,
      position: boundNodePosition(
        candidate.nodeId,
        localPositionFromAbsolute(candidate.nodeId, candidate.position)
      ),
    }
  }

  return candidate
}

export const createFlowHost = (
  root: HTMLElement,
  initialDocument: FlowDocument,
  options: FlowHostOptions
) => {
  const connectionDragThreshold = S.decodeUnknownSync(
    ConnectionDragThresholdSchema
  )(
    options.connectionDragThreshold === undefined
      ? defaultConnectionDragThreshold
      : options.connectionDragThreshold
  )

  validateCanvasPanelOptions(options.panel, options.panels)

  return Effect.gen(function* buildFlowHost() {
    const browser = yield* FlowBrowser
    const hostScope = yield* Scope.make('sequential')
    const { documentMode, runEffect } = options

    const runTelemetryEffect =
      options.runTelemetry ??
      ((effect: Effect.Effect<void>): void => {
        Effect.runFork(effect)
      })

    const runPromise =
      options.runPromise ??
      (<A>(effect: Effect.Effect<A>): Promise<A> => Effect.runPromise(effect))

    const panelParent = options.panel?.parentNode ?? undefined
    const panelNextSibling = options.panel?.nextSibling ?? null

    const runTelemetry = (effect: Effect.Effect<void>): void => {
      runTelemetryEffect(effect)
    }

    const viewportMode = options.viewport.mode
    const viewportLimits = options.viewport.limits
    const canvas = globalThis.document.createElement('section')
    canvas.className = 'flow-canvas'
    canvas.tabIndex = -1
    canvas.setAttribute('aria-label', 'Flow canvas')
    canvas.dataset.testid = 'flow-canvas'
    const background = options.background ?? { pattern: 'dots' as const }
    canvas.dataset.background = background.pattern
    canvas.style.setProperty(
      '--flow-background-spacing',
      `${background.spacing ?? 20}px`
    )
    canvas.style.setProperty(
      '--flow-background-color',
      background.color ?? '#cbd5e1'
    )
    const connectionStatus = globalThis.document.createElement('span')
    connectionStatus.className = 'flow-connection-status'
    connectionStatus.dataset.testid = 'flow-connection-status'
    connectionStatus.setAttribute('role', 'status')
    connectionStatus.setAttribute('aria-live', 'polite')
    connectionStatus.setAttribute('aria-atomic', 'true')

    const announceConnection = (message: string): void => {
      connectionStatus.textContent = message
    }

    const constrainViewport = (candidate: Viewport): Viewport => {
      const zoomBounded = clampViewport(candidate, viewportLimits)
      const { extent } = options.viewport

      return extent === undefined
        ? zoomBounded
        : constrainViewportToExtent(
            zoomBounded,
            extent,
            canvas.clientWidth,
            canvas.clientHeight
          )
    }

    const viewport = globalThis.document.createElement('div')
    viewport.className = 'flow-viewport'
    viewport.dataset.testid = 'flow-viewport'

    let pendingConnection: PendingConnection | null = null
    let connectionCapture: number | null = null

    const acquireConnectionCapture = (pointerId: number): boolean => {
      if (!runEffect(browser.capturePointer(canvas, pointerId))) {
        return false
      }

      connectionCapture = pointerId

      return true
    }

    const releaseConnectionCapture = (): void => {
      const pointerId = connectionCapture
      connectionCapture = null

      if (pointerId !== null) {
        runEffect(browser.releasePointer(canvas, pointerId))
      }
    }

    let destroyed = false
    const viewportPortalDisposers = new Set<() => void>()

    const mountViewportPortal = (element: HTMLElement): (() => void) => {
      if (destroyed) {
        return noopUnsubscribe
      }

      if (mountedViewportPortalElements.has(element)) {
        throw new Error('ViewportPortalElementAlreadyMounted')
      }

      const { parentNode: parent, nextSibling } = element
      const layer = globalThis.document.createElement('div')
      layer.className = 'flow-viewport-portal-layer nopan nodrag nowheel'
      layer.dataset.flowNoPan = ''
      layer.dataset.flowNoDrag = ''
      layer.dataset.flowNoWheel = ''
      layer.append(element)
      viewport.append(layer)
      mountedViewportPortalElements.add(element)

      let disposed = false

      const dispose = (): void => {
        if (disposed) {
          return
        }

        disposed = true
        viewportPortalDisposers.delete(dispose)
        layer.remove()
        element.remove()
        mountedViewportPortalElements.delete(element)

        if (
          parent instanceof Element ||
          parent instanceof Document ||
          parent instanceof DocumentFragment
        ) {
          if (
            (nextSibling instanceof Element ||
              nextSibling instanceof CharacterData ||
              nextSibling instanceof Comment) &&
            nextSibling.parentNode === parent
          ) {
            nextSibling.before(element)
          } else {
            parent.append(element)
          }
        }
      }

      viewportPortalDisposers.add(dispose)

      return dispose
    }

    let document = initialDocument
    let measurementState: FlowMeasurementState = emptyFlowMeasurementState()

    let measurements: ReadonlyMap<NodeId, MeasuredNode> = new Map()

    const edgeRenderer = createEdgeRenderer(
      viewport,
      options.edgeRenderers,
      options.defaultEdgeOptions,
      () => measurements
    )

    let authoritativeViewport = clampViewport(
      options.viewport.initial,
      viewportLimits
    )

    let renderedViewport = authoritativeViewport
    applyViewport(viewport, renderedViewport)

    const entries = new Map<NodeId, NodeEntry>()
    let nextMeasurementGeneration = -1

    const pendingMeasurementGenerations = new Map<
      NodeId,
      NodeMeasurementGeneration
    >()

    const advanceMeasurementGeneration = (nodeId: NodeId): number => {
      nextMeasurementGeneration += 1
      pendingMeasurementGenerations.set(nodeId, {
        nodeId,
        generation: nextMeasurementGeneration,
      })
      measurementState = setNodeMeasurementGenerations(measurementState, [
        { nodeId, generation: nextMeasurementGeneration },
      ])
      measurements = getFlowMeasuredNodes(document, measurementState)

      return nextMeasurementGeneration
    }

    let refreshFramePending = false

    const pendingInternals = new Map<
      NodeId,
      ((result: NodeInternalsRefreshResult) => void)[]
    >()

    const renderedNodePositions = new Map<NodeId, XYPosition>()

    const acceptMeasurement = (
      nodeId: NodeId,
      size: {
        readonly width: number
        readonly height: number
        readonly nodeId?: NodeId
      }
    ): void => {
      const node = document.nodes.find(({ id }) => id === nodeId)
      const entry = entries.get(nodeId)

      const generation =
        entry?.generation ??
        pendingMeasurementGenerations.get(nodeId)?.generation

      if (node === undefined || generation === undefined) {
        return
      }

      measurementState = applyNodeMeasurements(document, measurementState, [
        {
          nodeId,
          generation,
          ...size,
          handles:
            entry === undefined
              ? []
              : measureNodeHandles(node, entry.element, renderedViewport.zoom),
        },
      ])
      measurements = getFlowMeasuredNodes(document, measurementState)
    }

    const recordNodeMeasurement = (
      node: FlowNode,
      element: HTMLElement
    ): void => {
      acceptMeasurement(node.id, browser.measure(element))
    }

    let acceptedSnapshot = createFlowSnapshot(document, authoritativeViewport)
    let documentRevision = 0
    let destroyPromise: Promise<void> | undefined

    const findNode = (nodeId: NodeId): FlowNode | undefined =>
      document.nodes.find((node) => node.id === nodeId)

    const dimensionsForNode = (node: FlowNode): NodeDimensions => {
      const measured = measurements.get(node.id)

      return {
        width:
          measured?.width && measured.width > 0
            ? measured.width
            : (node.size?.width ?? 150),
        height:
          measured?.height && measured.height > 0
            ? measured.height
            : (node.size?.height ?? 44),
      }
    }

    const boundedPositionWithinParent = (
      node: FlowNode,
      position: XYPosition,
      dimensions: NodeDimensions
    ): XYPosition | undefined => {
      if (node.parentId === undefined || node.extent !== 'parent') {
        return undefined
      }

      const parent = findNode(node.parentId)

      if (parent === undefined) {
        return undefined
      }

      const parentDimensions = dimensionsForNode(parent)

      return constrainNodePosition(position, dimensions, {
        minX: 0,
        minY: 0,
        maxX: parentDimensions.width,
        maxY: parentDimensions.height,
      })
    }

    const boundedNodePosition = (
      nodeId: NodeId,
      position: XYPosition
    ): XYPosition => {
      const node = findNode(nodeId)

      if (node === undefined) {
        return position
      }

      const dimensions = dimensionsForNode(node)

      if (node.parentId !== undefined) {
        return (
          boundedPositionWithinParent(node, position, dimensions) ?? position
        )
      }

      if (options.nodeExtent === undefined) {
        return position
      }

      return constrainNodePosition(position, dimensions, options.nodeExtent)
    }

    const boundedGroupChange = (
      drag: ActiveNodeGroupDrag,
      change: NodePositionsChange
    ): NodePositionsChange => {
      const [first] = drag.positions
      const [movedFirst] = change.positions

      if (first === undefined || movedFirst === undefined) {
        return change
      }

      const proposedDelta = {
        x: movedFirst.position.x - first.position.x,
        y: movedFirst.position.y - first.position.y,
      }

      const rootItems = drag.positions.flatMap(({ nodeId, position }) => {
        const node = findNode(nodeId)

        if (node?.parentId !== undefined) {
          return []
        }

        const measured = measurements.get(nodeId)

        return [
          {
            position,
            width: measured?.width ?? node?.size?.width ?? 0,
            height: measured?.height ?? node?.size?.height ?? 0,
          },
        ]
      })

      const delta =
        options.nodeExtent === undefined || rootItems.length === 0
          ? proposedDelta
          : constrainNodeGroupDelta(
              rootItems,
              proposedDelta,
              options.nodeExtent
            )

      return {
        kind: 'node-positions',
        positions: drag.positions.map(({ nodeId, position }) => ({
          nodeId,
          position: boundedNodePosition(nodeId, {
            x: position.x + delta.x,
            y: position.y + delta.y,
          }),
        })),
      }
    }

    const listeners = new Set<(change: FlowChange) => void>()
    const stateListeners = new Set<(change: FlowStateChange) => void>()

    const connectionPreviewListeners = new Set<
      (preview: ConnectionPreviewSnapshot) => void
    >()

    const keyPressDisposers = new Set<() => void>()

    const viewportListeners = new Set<(event: ViewportObservation) => void>()
    const callbackStartedNodeDrags = new Set<number>()
    let viewportObservationSource: ViewportObservation['source'] = 'user'
    let userViewportObservationActive = false

    const reportBoundaryCallback = <A>(
      label: string,
      inputKind: string,
      callback: (value: A) => void,
      value: A
    ): void => {
      try {
        // eslint-disable-next-line promise/prefer-await-to-callbacks, node/callback-return -- lifecycle callbacks are synchronous host observers.
        callback(value)
      } catch (error) {
        runTelemetry(
          Effect.logError(`${label} callback failed`).pipe(
            Effect.annotateLogs({
              [FlowAttribute.documentIssue]: String(error),
              [FlowAttribute.inputKind]: inputKind,
            }),
            Effect.withSpan(FlowSpan.viewportUpdate)
          )
        )

        try {
          options.onError?.(
            error instanceof Error ? error : new Error(String(error))
          )
        } catch {
          runTelemetry(
            Effect.logError('Flow error callback failed').pipe(
              Effect.annotateLogs({
                [FlowAttribute.documentIssue]: 'onError callback threw',
              }),
              Effect.withSpan(FlowSpan.viewportUpdate)
            )
          )
        }
      }
    }

    const emitViewportObservation = (
      kind: ViewportObservation['kind'],
      value: Viewport,
      source: ViewportObservation['source'] = viewportObservationSource
    ): void => {
      const event: ViewportObservation = {
        kind,
        source,
        viewport: structuredClone(value),
      }

      const lifecycleListener = {
        start: options.onMoveStart,
        change: options.onMove,
        end: options.onMoveEnd,
      }[kind]

      if (lifecycleListener !== undefined) {
        reportBoundaryCallback(
          'Viewport lifecycle',
          `viewport-${kind}`,
          lifecycleListener,
          event
        )
      }

      const viewportListenerSnapshot = [...viewportListeners]

      for (const listener of viewportListenerSnapshot) {
        if (destroyed || !viewportListeners.has(listener)) {
          continue
        }

        try {
          listener(event)
        } catch (error) {
          runTelemetry(
            Effect.logError('Viewport observer failed').pipe(
              Effect.annotateLogs({
                [FlowAttribute.documentIssue]: String(error),
              }),
              Effect.withSpan(FlowSpan.viewportUpdate)
            )
          )
        }
      }
    }

    const beginUserViewportObservation = (): void => {
      if (userViewportObservationActive) {
        return
      }

      userViewportObservationActive = true
      emitViewportObservation('start', renderedViewport, 'user')
    }

    const endUserViewportObservation = (): void => {
      if (!userViewportObservationActive) {
        return
      }

      userViewportObservationActive = false
      emitViewportObservation('end', renderedViewport, 'user')
    }

    const deferredMutations: (() => void)[] = []
    const pendingEditRejectors = new Set<(reason: Error) => void>()

    let cancelActiveGestures: (reason: string, pointerId?: number) => boolean =
      noActiveGestures

    let mutationDepth = 0
    let drainingMutations = false

    const reportStateListenerFailure = (cause: Cause.Cause<unknown>): void => {
      try {
        runTelemetry(
          Effect.logError('Accepted-state listener failed').pipe(
            Effect.annotateLogs({
              [FlowAttribute.documentIssue]: Cause.pretty(cause),
            })
          )
        )
      } catch {
        // Listener isolation must survive telemetry failures too.
      }
    }

    const publishAcceptedState = (cause: FlowStateChangeCause): void => {
      if (destroyed) {
        return
      }

      const current = createFlowSnapshot(document, authoritativeViewport)

      if (flowSnapshotEquivalence(acceptedSnapshot, current)) {
        return
      }

      if (
        !flowDocumentEquivalence(acceptedSnapshot.document, current.document)
      ) {
        documentRevision += 1
      }

      const change: FlowStateChange = Object.freeze({
        previous: acceptedSnapshot,
        current,
        cause,
      })

      acceptedSnapshot = current

      const notificationListeners = [...stateListeners]

      for (const listener of notificationListeners) {
        if (destroyed) {
          return
        }

        if (!stateListeners.has(listener)) {
          continue
        }

        try {
          listener(change)
        } catch (error) {
          reportStateListenerFailure(Cause.die(error))
        }
      }
    }

    const drainDeferredMutations = (): void => {
      if (mutationDepth > 0 || drainingMutations || destroyed) {
        return
      }

      drainingMutations = true

      try {
        while (deferredMutations.length > 0) {
          if (destroyed) {
            break
          }

          const mutation = deferredMutations.shift()

          if (mutation === undefined) {
            continue
          }

          try {
            mutation()
          } catch (error) {
            reportStateListenerFailure(Cause.die(error))
          }
        }
      } finally {
        drainingMutations = false
      }
    }

    const executeMutation = (mutation: () => void): void => {
      if (destroyed) {
        return
      }

      if (mutationDepth > 0) {
        deferredMutations.push(() => executeMutation(mutation))

        return
      }

      mutationDepth += 1

      try {
        mutation()
      } finally {
        mutationDepth -= 1
        drainDeferredMutations()
      }
    }

    let interactionSessions: FlowInteractionSessions = []

    const changePublisher = {
      publish: (_change: FlowChange): void => {
        throw new Error('Flow change publisher is not initialized')
      },
    }

    const sessionFor = (
      kind: FlowInteractionSession['kind']
    ): FlowInteractionSession | undefined =>
      interactionSessions.find((session) => session.kind === kind)

    const endSession = (
      kind: FlowInteractionSession['kind'],
      pointerId: number,
      terminal: 'finished' | 'cancelled'
    ): FlowInteractionOutcome => {
      const outcome =
        terminal === 'cancelled'
          ? cancelFlowInteraction(interactionSessions, pointerId)
          : finishFlowInteraction(interactionSessions, pointerId)

      if (outcome.kind === terminal && outcome.session.kind === kind) {
        interactionSessions = outcome.sessions

        return outcome
      }

      return { kind: 'unchanged', sessions: interactionSessions }
    }

    const assignSession = (
      kind: FlowInteractionSession['kind'],
      session: FlowInteractionSession | undefined
    ): void => {
      const existing = sessionFor(kind)

      if (session === undefined) {
        if (existing !== undefined) {
          const [pointerId] = sessionPointerIds(existing)

          const outcome = finishFlowInteraction(interactionSessions, pointerId)

          interactionSessions = outcome.sessions
        }

        return
      }

      const outcome =
        existing === undefined
          ? startFlowInteraction(interactionSessions, session)
          : (() => {
              const [pointerId] = sessionPointerIds(existing)

              return replaceFlowInteraction(
                interactionSessions,
                pointerId,
                session
              )
            })()

      if (outcome.kind === 'started') {
        interactionSessions = outcome.sessions
      }
    }

    const interactionSlots: FlowInteractionSlots = {
      get activeDrag() {
        const session = sessionFor('node-drag')

        return session?.kind === 'node-drag' ? session.drag : null
      },
      set activeDrag(value) {
        assignSession(
          'node-drag',
          value === null
            ? undefined
            : { kind: 'node-drag', phase: 'pressed', drag: value }
        )
      },
      get activeConnection() {
        const session = sessionFor('connection')

        return session?.kind === 'connection' ? session.connection : null
      },
      set activeConnection(value) {
        assignSession(
          'connection',
          value === null ? undefined : { kind: 'connection', connection: value }
        )
      },
      get activeReconnection() {
        const session = sessionFor('reconnection')

        return session?.kind === 'reconnection' ? session.reconnection : null
      },
      set activeReconnection(value) {
        assignSession(
          'reconnection',
          value === null
            ? undefined
            : { kind: 'reconnection', reconnection: value }
        )
      },
      get activeViewportPan() {
        const session = sessionFor('pane-pan')

        return session?.kind === 'pane-pan' ? session.pan : null
      },
      set activeViewportPan(value) {
        assignSession(
          'pane-pan',
          value === null ? undefined : { kind: 'pane-pan', pan: value }
        )
      },
      get activePinch() {
        const session = sessionFor('pinch')

        return session?.kind === 'pinch' ? session.pinch : null
      },
      set activePinch(value) {
        assignSession(
          'pinch',
          value === null ? undefined : { kind: 'pinch', pinch: value }
        )
      },
      get activeSelectionRect() {
        const session = sessionFor('selection')

        return session?.kind === 'selection' ? session.selection : null
      },
      set activeSelectionRect(value) {
        assignSession(
          'selection',
          value === null ? undefined : { kind: 'selection', selection: value }
        )
      },
      get activeNodeResize() {
        const session = sessionFor('node-resize')

        return session?.kind === 'node-resize' ? session.resize : null
      },
      set activeNodeResize(value) {
        assignSession(
          'node-resize',
          value === null ? undefined : { kind: 'node-resize', resize: value }
        )
      },
    }

    let activeKeyboardResize: ActiveKeyboardResize | null = null
    let activeKeyboardNodeDrag: FlowNodeDragPayload | null = null

    const adoptedPosition = (node: FlowNode): XYPosition =>
      boundedNodePosition(node.id, node.position)

    const graphFor = (
      target: FlowDocument = document,
      overrides: ReadonlyMap<NodeId, XYPosition> = renderedNodePositions
    ) => createFlowGraph(target, measurements, overrides)

    const canvasUIHandle: CanvasUIHandle = { current: undefined }
    const fitViewControlHandle: FitViewControlHandle = { current: undefined }

    const updateCanvasMinimap = (): void => {
      if (canvasUIHandle.current === undefined) {
        return
      }

      const graph = graphFor()
      const bounds = graphBounds(graph)

      if (bounds === undefined) {
        return
      }

      canvasUIHandle.current.update(
        graph.orderedNodes
          .filter((node) => !node.hidden)
          .map((node) => ({
            id: node.id,
            x: node.absolutePosition.x,
            y: node.absolutePosition.y,
            width: node.dimensions.width,
            height: node.dimensions.height,
          })),
        bounds,
        renderedViewport,
        { width: canvas.clientWidth, height: canvas.clientHeight }
      )
    }

    const absolutePosition = (nodeId: NodeId): XYPosition =>
      graphFor().nodes.get(nodeId)?.absolutePosition ?? { x: 0, y: 0 }

    const updateToolbarAnchors = (target: FlowDocument = document): void => {
      const anchors = flowToolbarAnchors(graphFor(target), renderedViewport)
      const visibleNodes = new Set<string>(entries.keys())

      const edgeIds = new Set<string>(
        target.edges
          .filter(
            (edge) =>
              visibleNodes.has(edge.source) && visibleNodes.has(edge.target)
          )
          .map((edge) => edge.id)
      )

      options.onToolbarAnchors?.({
        nodes: anchors.nodes.filter((anchor) => visibleNodes.has(anchor.id)),
        edges: anchors.edges.filter((anchor) => edgeIds.has(anchor.id)),
      })
      canvasUIHandle.current?.updateToolbars({
        nodes: anchors.nodes.filter((anchor) => visibleNodes.has(anchor.id)),
        edges: anchors.edges.filter((anchor) => edgeIds.has(anchor.id)),
      })
    }

    const localPositionFromAbsolute = (
      nodeId: NodeId,
      absolute: XYPosition
    ): XYPosition => {
      const node = findNode(nodeId)

      const parent =
        node?.parentId === undefined
          ? undefined
          : graphFor().nodes.get(node.parentId)

      return parent === undefined
        ? absolute
        : {
            x: absolute.x - parent.absolutePosition.x,
            y: absolute.y - parent.absolutePosition.y,
          }
    }

    const renderGraphPositions = (target: FlowDocument = document) => {
      const graph = graphFor(target)

      for (const [nodeId, entry] of entries) {
        const resolved = graph.nodes.get(nodeId)

        if (resolved !== undefined) {
          applyNodePosition(entry.element, resolved.absolutePosition)
        }
      }

      updateToolbarAnchors(target)
      updateCanvasMinimap()

      return graph
    }

    const restoreAdoptedPosition = (node: FlowNode): XYPosition => {
      const position = adoptedPosition(node)

      if (position.x === node.position.x && position.y === node.position.y) {
        renderedNodePositions.delete(node.id)
      } else {
        renderedNodePositions.set(node.id, position)
      }

      return position
    }

    const isDraggingNode = (nodeId: NodeId): boolean =>
      (interactionSlots.activeDrag !== null &&
        ('positions' in interactionSlots.activeDrag
          ? interactionSlots.activeDrag.positions.some(
              (item) => item.nodeId === nodeId
            )
          : interactionSlots.activeDrag.nodeId === nodeId)) ||
      (interactionSlots.activeNodeResize !== null &&
        (interactionSlots.activeNodeResize.nodeId === nodeId ||
          document.nodes.some(
            (node) =>
              node.id === nodeId &&
              node.parentId === interactionSlots.activeNodeResize?.nodeId
          ))) ||
      (activeKeyboardResize !== null &&
        (activeKeyboardResize.nodeId === nodeId ||
          document.nodes.some(
            (node) =>
              node.id === nodeId &&
              node.parentId === activeKeyboardResize?.nodeId
          )))

    let dragPointerStart: XYPosition | null = null
    let dragPointer: XYPosition | null = null
    let dragFrame: number | null = null
    let dragFrameScope: Scope.Closeable | null = null
    let connectionPointer: XYPosition | null = null
    let connectionPointerStart: XYPosition | null = null
    let connectionFrame: number | null = null
    let hoveredConnectionHandle: HTMLElement | null = null
    let activeClickConnection: ActiveClickConnection | null = null
    let connectionPreview: SVGSVGElement | null = null
    let connectionLine: SVGLineElement | null = null
    let connectionPreviewState: ConnectionPreviewState | null = null
    const touchPointers = new Map<number, XYPosition>()
    let selectionOverlay: HTMLDivElement | null = null
    let selectionPointer: XYPosition | null = null
    let selectionFrame: number | null = null
    let interactionMode: 'select' | 'pan' = 'select'
    let suppressCanvasClick = false

    const suppressClickUntilPointerUp = (): void => {
      suppressCanvasClick = true
    }

    // eslint-disable-next-line prefer-const -- Assigned after the operations object is initialized.
    let reconcileVisible: (() => void) | undefined

    const clearPendingConnection = (): void => {
      if (pendingConnection !== null) {
        suppressClickUntilPointerUp()
      }

      pendingConnection = null
      releaseConnectionCapture()
    }

    const resizeObserver = yield* browser
      .observeResize((observedEntries) => {
        const acceptedMeasurements: NodeMeasurementInput[] = []

        for (const entry of observedEntries) {
          if (!(entry.target instanceof HTMLElement)) {
            continue
          }

          const element = entry.target
          const { nodeId } = element.dataset

          const node = document.nodes.find(
            (candidate) => candidate.id === nodeId
          )

          const currentEntry =
            node === undefined ? undefined : entries.get(node.id)

          if (currentEntry?.element !== element) {
            continue
          }

          const measurement = browser.measure(element)
          element.dataset.measuredWidth = String(measurement.width)
          element.dataset.measuredHeight = String(measurement.height)
          element.style.visibility = 'visible'

          if (node !== undefined) {
            acceptedMeasurements.push({
              generation: currentEntry.generation,
              handles: measureNodeHandles(node, element, renderedViewport.zoom),
              nodeId: node.id,
              ...measurement,
            })
            runTelemetry(
              Effect.logDebug('Measured flow node geometry').pipe(
                Effect.annotateLogs({
                  [FlowAttribute.nodeId]: node.id,
                  [FlowAttribute.measurementCount]: 1,
                }),
                Effect.withSpan(FlowSpan.geometryMeasure, {
                  attributes: {
                    [FlowAttribute.nodeId]: node.id,
                    [FlowAttribute.measurementCount]: 1,
                  },
                })
              )
            )

            if (!isDraggingNode(node.id)) {
              restoreAdoptedPosition(node)
            }
          }
        }

        if (acceptedMeasurements.length > 0) {
          measurementState = applyNodeMeasurements(
            document,
            measurementState,
            acceptedMeasurements
          )
          measurements = getFlowMeasuredNodes(document, measurementState)
          renderGraphPositions()
        }

        if (options.renderOnlyVisible === true) {
          reconcileVisible?.()
        } else {
          edgeRenderer.reconcile(document, renderedNodePositions)
        }

        runTelemetry(
          Effect.logDebug('Measured flow nodes').pipe(
            Effect.annotateLogs(
              FlowAttribute.measurementCount,
              observedEntries.length
            ),
            Effect.withSpan(FlowSpan.geometryMeasure, {
              attributes: {
                [FlowAttribute.measurementCount]: observedEntries.length,
              },
            })
          )
        )
      })
      .pipe(
        Scope.provide(hostScope),
        Effect.tapError(() => Scope.close(hostScope, Exit.void))
      )

    const pointerInFlow = (event: PointerEvent): XYPosition => {
      const bounds = canvas.getBoundingClientRect()

      return screenToFlowPosition(
        { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
        renderedViewport
      )
    }

    const pointerInCanvas = (event: MouseEvent): XYPosition => {
      const bounds = canvas.getBoundingClientRect()

      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    }

    const renderViewport = (next: Viewport): void => {
      renderedViewport = constrainViewport(next)
      applyViewport(viewport, renderedViewport)
      emitViewportObservation('change', renderedViewport)
      updateToolbarAnchors()
      updateCanvasMinimap()

      if (options.renderOnlyVisible === true) {
        reconcileVisible?.()
      }
    }

    const hasSelectedAncestor = (node: FlowNode): boolean => {
      let { parentId } = node

      while (parentId !== undefined) {
        const parent = findNode(parentId)

        if (parent?.selected === true && parent.draggable !== false) {
          return true
        }

        parentId = parent?.parentId
      }

      return false
    }

    const selectedMovableNodes = (): readonly FlowNode[] =>
      document.nodes.filter(
        (candidate) =>
          candidate.selected === true &&
          candidate.hidden !== true &&
          candidate.draggable !== false &&
          !hasSelectedAncestor(candidate)
      )

    const handleCenterInFlow = (
      element: HTMLElement,
      graph = graphFor()
    ): XYPosition => {
      const node = document.nodes.find(
        ({ id }) => id === element.dataset.nodeId
      )

      const graphNode =
        node === undefined ? undefined : graph.nodes.get(node.id)

      const measured =
        node === undefined
          ? undefined
          : measurements
              .get(node.id)
              ?.handles?.find(
                ({ handleId }) => handleId === element.dataset.handleId
              )

      const handle = node?.handles?.find(
        ({ id }) => id === element.dataset.handleId
      )

      if (
        graphNode === undefined ||
        node === undefined ||
        handle === undefined
      ) {
        throw new Error('Connection handle has no accepted owner')
      }

      const geometry =
        measured ??
        inferHandleMeasurement(node.id, handle, graphNode.dimensions)

      return {
        x: graphNode.absolutePosition.x + geometry.offset.x,
        y: graphNode.absolutePosition.y + geometry.offset.y,
      }
    }

    const connectionTargetAt = (
      source: ActiveClickConnection,
      clientX: number,
      clientY: number
    ): HTMLElement | null => {
      const direct = canvas.ownerDocument
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>('.flow-handle')

      if (direct instanceof HTMLElement && viewport.contains(direct)) {
        return direct
      }

      const elements = [
        ...viewport.querySelectorAll<HTMLElement>('.flow-handle'),
      ]

      const graph = graphFor()
      const candidates: MeasuredConnectionHandle[] = []

      for (const element of elements) {
        const node = document.nodes.find(
          (item) => item.id === element.dataset.nodeId
        )

        const handle = node?.handles?.find(
          (item) => item.id === element.dataset.handleId
        )

        if (
          node === undefined ||
          handle === undefined ||
          node.hidden === true
        ) {
          continue
        }

        const measured = measurements
          .get(node.id)
          ?.handles?.find(({ handleId }) => handleId === handle.id)

        const graphNode = graph.nodes.get(node.id)

        if (
          measured === undefined ||
          graphNode === undefined ||
          graphNode.hidden
        ) {
          continue
        }

        const center = handleCenterInFlow(element, graph)
        const canvasBounds = canvas.getBoundingClientRect()

        candidates.push({
          nodeId: node.id,
          handleId: handle.id,
          kind: handle.kind,
          center: {
            x:
              canvasBounds.left +
              renderedViewport.x +
              center.x * renderedViewport.zoom,
            y:
              canvasBounds.top +
              renderedViewport.y +
              center.y * renderedViewport.zoom,
          },
        })
      }

      const nearest = nearestConnectionTarget({
        source,
        point: { x: clientX, y: clientY },
        candidates,
        // Candidate centers and the pointer are both client-space coordinates.
        radius: options.connectionRadius ?? 20,
        mode: options.connectionMode ?? 'strict',
      })

      if (nearest === undefined) {
        return null
      }

      return (
        elements.find(
          (element) =>
            element.dataset.nodeId === nearest?.nodeId &&
            element.dataset.handleId === nearest.handleId
        ) ?? null
      )
    }

    const clearConnectionHover = (): void => {
      hoveredConnectionHandle?.classList.remove(
        'connection-valid',
        'connection-invalid'
      )
      hoveredConnectionHandle = null
    }

    const validConnectionTarget = (
      source: ActiveClickConnection,
      targetElement: HTMLElement
    ): boolean => {
      const targetNode = document.nodes.find(
        (node) => node.id === targetElement.dataset.nodeId
      )

      const targetHandle = targetNode?.handles?.find(
        (handle) => handle.id === targetElement.dataset.handleId
      )

      if (
        targetNode === undefined ||
        targetHandle === undefined ||
        (options.connectionMode !== 'loose' && targetHandle.kind !== 'target')
      ) {
        return false
      }

      const rawCandidate: FlowConnection = {
        source: source.source,
        sourceHandle: source.sourceHandle,
        target: targetNode.id,
        targetHandle: targetHandle.id,
      }

      const candidate = normalizeFlowConnection(
        document,
        rawCandidate,
        options.connectionMode ?? 'strict'
      )

      if (
        findConnectionIssue(
          document,
          rawCandidate,
          options.connectionMode ?? 'strict'
        ) !== undefined
      ) {
        return false
      }

      try {
        return options.isValidConnection?.(candidate) ?? true
      } catch {
        return false
      }
    }

    const publishConnectionPreview = (
      preview: ConnectionPreviewState | null
    ): void => {
      connectionPreviewState = createConnectionPreviewSnapshot(preview)

      const previewListeners = [...connectionPreviewListeners]

      for (const listener of previewListeners) {
        if (destroyed || !connectionPreviewListeners.has(listener)) {
          continue
        }

        try {
          listener(connectionPreviewState)
        } catch (error) {
          runTelemetry(
            Effect.logWarning('Connection preview listener failed').pipe(
              Effect.annotateLogs({
                [FlowAttribute.failureName]: 'ConnectionPreviewListenerError',
                [FlowAttribute.failureMessage]:
                  error instanceof Error ? error.message : String(error),
              })
            )
          )
        }
      }

      if (
        connectionPreview === null ||
        options.connectionPreview === undefined
      ) {
        return
      }

      try {
        options.connectionPreview(preview, connectionPreview)
      } catch (error) {
        runTelemetry(
          Effect.logWarning('Connection preview renderer failed').pipe(
            Effect.annotateLogs({
              [FlowAttribute.failureName]: 'ConnectionPreviewRendererError',
              [FlowAttribute.failureMessage]:
                error instanceof Error ? error.message : String(error),
            })
          )
        )
      }
    }

    const updateConnectPreviewState = (
      source: ActiveClickConnection,
      target: HTMLElement | null,
      position: XYPosition,
      valid: boolean | null
    ): void => {
      const preview = connectionPreviewState

      if (preview?.kind !== 'connect') {
        return
      }

      const targetNode = document.nodes.find(
        (node) => node.id === target?.dataset.nodeId
      )

      const targetHandle = targetNode?.handles?.find(
        (handle) => handle.id === target?.dataset.handleId
      )

      const candidate =
        targetNode === undefined || targetHandle === undefined
          ? null
          : normalizeFlowConnection(
              document,
              {
                source: source.source,
                sourceHandle: source.sourceHandle,
                target: targetNode.id,
                targetHandle: targetHandle.id,
              },
              options.connectionMode ?? 'strict'
            )

      publishConnectionPreview({
        ...preview,
        to: position,
        candidate,
        valid,
      })
    }

    const acceptsPreviewCandidate = (candidate: FlowConnection): boolean => {
      try {
        return options.isValidConnection?.(candidate) ?? true
      } catch {
        return false
      }
    }

    const updateReconnectPreviewState = (
      active: ActiveEdgeReconnect,
      event: PointerEvent,
      position: XYPosition
    ): void => {
      const preview = connectionPreviewState

      if (preview?.kind !== 'reconnect') {
        return
      }

      const targetElement = canvas.ownerDocument
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('.flow-handle')

      const node = document.nodes.find(
        (item) => item.id === targetElement?.dataset.nodeId
      )

      const handle = node?.handles?.find(
        (item) => item.id === targetElement?.dataset.handleId
      )

      const edge = document.edges.find((item) => item.id === active.edgeId)

      const resolved =
        edge === undefined ? undefined : resolveEdgeHandles(document, edge)

      let candidate: FlowConnection | null = null
      let valid: boolean | null = null

      if (
        node !== undefined &&
        handle !== undefined &&
        edge !== undefined &&
        resolved !== undefined
      ) {
        candidate = {
          source: active.endpoint === 'source' ? node.id : edge.source,
          sourceHandle:
            active.endpoint === 'source' ? handle.id : resolved.sourceHandle.id,
          target: active.endpoint === 'target' ? node.id : edge.target,
          targetHandle:
            active.endpoint === 'target' ? handle.id : resolved.targetHandle.id,
        }

        const reconnect = runEffect(
          Effect.result(
            reconnectFlowEdge(
              document,
              active.edgeId,
              active.endpoint,
              node.id,
              handle.id,
              options.connectionMode ?? 'strict'
            )
          )
        )

        valid = Result.isSuccess(reconnect) && reconnect.success !== undefined

        if (valid) {
          valid = acceptsPreviewCandidate(candidate)
        }
      }

      publishConnectionPreview({
        ...preview,
        to: position,
        candidate,
        valid,
      })
    }

    const updatePointerConnectionPreview = (
      source: ActiveClickConnection,
      clientX: number,
      clientY: number
    ): void => {
      const target = connectionTargetAt(source, clientX, clientY)
      const valid = target !== null && validConnectionTarget(source, target)

      if (hoveredConnectionHandle !== target) {
        clearConnectionHover()
        hoveredConnectionHandle = target
      }

      target?.classList.toggle('connection-valid', valid)
      target?.classList.toggle('connection-invalid', !valid)

      const canvasBounds = canvas.getBoundingClientRect()

      const position =
        target !== null && valid
          ? handleCenterInFlow(target)
          : screenToFlowPosition(
              { x: clientX - canvasBounds.left, y: clientY - canvasBounds.top },
              renderedViewport
            )

      connectionLine?.setAttribute('x2', String(position.x))
      connectionLine?.setAttribute('y2', String(position.y))

      updateConnectPreviewState(
        source,
        target,
        position,
        target === null ? null : valid
      )
    }

    const removeConnectionPreview = (): void => {
      publishConnectionPreview(null)
      connectionPreview?.remove()
      connectionPreview = null
      connectionLine = null
    }

    const notifyConnectStart = (connection: FlowConnectStartPayload): void => {
      if (options.onConnectStart !== undefined) {
        reportBoundaryCallback(
          'Connection start',
          connection.inputKind,
          options.onConnectStart,
          connection
        )
      }
    }

    const notifyConnectEnd = (connection: FlowConnectEndPayload): void => {
      if (options.onConnectEnd !== undefined) {
        reportBoundaryCallback(
          'Connection end',
          connection.inputKind,
          options.onConnectEnd,
          connection
        )
      }
    }

    const notifyReconnectStart = (
      reconnect: FlowReconnectStartPayload
    ): void => {
      if (options.onReconnectStart !== undefined) {
        reportBoundaryCallback(
          'Reconnection start',
          'pointer-reconnect',
          options.onReconnectStart,
          reconnect
        )
      }
    }

    const notifyReconnectEnd = (reconnect: FlowReconnectEndPayload): void => {
      if (options.onReconnectEnd !== undefined) {
        reportBoundaryCallback(
          'Reconnection end',
          'pointer-reconnect',
          options.onReconnectEnd,
          reconnect
        )
      }
    }

    const showConnectionPreview = (
      start: XYPosition,
      session:
        | { readonly kind: 'connect' }
        | {
            readonly kind: 'reconnect'
            readonly edgeId: EdgeId
            readonly endpoint: ReconnectEndpoint
          }
    ): void => {
      const preview = globalThis.document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
      )

      preview.classList.add('flow-connection-preview')
      preview.dataset.testid = 'flow-connection-preview'

      const line = globalThis.document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      )

      line.setAttribute('x1', String(start.x))
      line.setAttribute('y1', String(start.y))
      line.setAttribute('x2', String(start.x))
      line.setAttribute('y2', String(start.y))

      if (options.connectionPreview !== undefined) {
        line.setAttribute('display', 'none')
      }

      preview.append(line)
      viewport.append(preview)
      connectionPreview = preview
      connectionLine = line
      publishConnectionPreview(
        session.kind === 'connect'
          ? {
              kind: 'connect',
              from: start,
              to: start,
              candidate: null,
              valid: null,
            }
          : {
              kind: 'reconnect',
              from: start,
              to: start,
              candidate: null,
              valid: null,
              edgeId: session.edgeId,
              endpoint: session.endpoint,
            }
      )
    }

    const clearConnection = (
      terminal: 'finished' | 'cancelled' = 'finished'
    ): ActiveConnection | null => {
      if (interactionSlots.activeConnection === null) {
        return null
      }

      const connection = interactionSlots.activeConnection
      const outcome = endSession('connection', connection.pointerId, terminal)
      interactionSlots.activeConnection = null
      connectionPointer = null
      connectionPointerStart = null

      if (
        (outcome.kind === 'finished' || outcome.kind === 'cancelled') &&
        outcome.frame === 'connection-autopan' &&
        connectionFrame !== null
      ) {
        globalThis.cancelAnimationFrame(connectionFrame)
        connectionFrame = null
      }

      clearConnectionHover()
      removeConnectionPreview()

      releaseConnectionCapture()

      return connection
    }

    const cancelConnection = (reason: string): void => {
      const connection = clearConnection('cancelled')

      if (connection === null) {
        return
      }

      suppressClickUntilPointerUp()

      if (reason !== 'no-target') {
        renderViewport(authoritativeViewport)
      }

      notifyConnectEnd({
        source: connection.source,
        sourceHandle: connection.sourceHandle,
        inputKind: 'pointer-connect',
        outcome: 'cancelled',
        reason,
      })

      runTelemetry(
        Effect.logDebug('Cancelled connection gesture').pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: connection.source,
            [FlowAttribute.handleId]: connection.sourceHandle,
            [FlowAttribute.cancellationReason]: reason,
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.nodeId]: connection.source,
              [FlowAttribute.handleId]: connection.sourceHandle,
              [FlowAttribute.cancellationReason]: reason,
            },
          })
        )
      )
    }

    const clearClickConnection = (): ActiveClickConnection | null => {
      if (activeClickConnection === null) {
        return null
      }

      const connection = activeClickConnection
      activeClickConnection = null
      removeConnectionPreview()

      const source = entries.get(connection.source)

      for (const handle of source?.element.querySelectorAll<HTMLElement>(
        '.flow-handle'
      ) ?? []) {
        if (handle.dataset.handleId === connection.sourceHandle) {
          handle.classList.remove('connecting')
        }
      }

      return connection
    }

    const clickSourceElement = (
      connection: ActiveClickConnection
    ): HTMLElement | undefined =>
      [
        ...(entries
          .get(connection.source)
          ?.element.querySelectorAll<HTMLElement>('.flow-handle') ?? []),
      ].find((element) => element.dataset.handleId === connection.sourceHandle)

    const cancelClickConnection = (reason: string): void => {
      const connection = clearClickConnection()

      if (connection === null) {
        return
      }

      if (reason !== 'host-destroyed' && reason !== 'window-blur') {
        announceConnection(
          reason === 'source-removed'
            ? 'Connection cancelled because its source was removed.'
            : 'Connection cancelled.'
        )

        const source = clickSourceElement(connection)

        if (
          reason === 'source-removed' ||
          source === undefined ||
          source === null
        ) {
          canvas.focus()
        } else {
          source.focus()
        }
      }

      notifyConnectEnd({
        source: connection.source,
        sourceHandle: connection.sourceHandle,
        inputKind: 'click-connect',
        outcome: 'cancelled',
        reason,
      })

      runTelemetry(
        Effect.logDebug('Cancelled click connection').pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: connection.source,
            [FlowAttribute.handleId]: connection.sourceHandle,
            [FlowAttribute.cancellationReason]: reason,
            [FlowAttribute.inputKind]: 'click-connect',
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.nodeId]: connection.source,
              [FlowAttribute.handleId]: connection.sourceHandle,
              [FlowAttribute.cancellationReason]: reason,
              [FlowAttribute.inputKind]: 'click-connect',
            },
          })
        )
      )
    }

    const clearReconnection = (
      terminal: 'finished' | 'cancelled' = 'finished'
    ): ActiveEdgeReconnect | null => {
      if (interactionSlots.activeReconnection === null) {
        return null
      }

      const reconnect = interactionSlots.activeReconnection
      endSession('reconnection', reconnect.pointerId, terminal)
      interactionSlots.activeReconnection = null
      removeConnectionPreview()

      releaseConnectionCapture()

      return reconnect
    }

    const cancelReconnection = (reason: string): void => {
      const reconnect = clearReconnection('cancelled')

      if (reconnect === null) {
        return
      }

      suppressClickUntilPointerUp()

      const attributes = {
        [FlowAttribute.edgeId]: reconnect.edgeId,
        [FlowAttribute.edgeEndpoint]: reconnect.endpoint,
        [FlowAttribute.cancellationReason]: reason,
      }

      notifyReconnectEnd({
        edgeId: reconnect.edgeId,
        endpoint: reconnect.endpoint,
        outcome: 'cancelled',
        reason,
      })

      runTelemetry(
        Effect.logDebug('Cancelled edge reconnection').pipe(
          Effect.annotateLogs(attributes),
          Effect.withSpan(FlowSpan.gestureCancel, { attributes })
        )
      )
    }

    const pendingHandleElement = (
      identity: typeof PendingHandleSchema.Type,
      next = document
    ): HTMLElement | undefined => {
      const node = next.nodes.find(({ id }) => id === identity.nodeId)

      const handle = node?.handles?.find(
        ({ id, kind }) => id === identity.handleId && kind === identity.kind
      )

      if (
        node?.connectable === false ||
        handle === undefined ||
        createFlowGraph(next, measurements, renderedNodePositions).nodes.get(
          identity.nodeId
        )?.hidden !== false
      ) {
        return undefined
      }

      return [...canvas.querySelectorAll<HTMLElement>('.flow-handle')].find(
        (element) =>
          element.dataset.nodeId === identity.nodeId &&
          element.dataset.handleId === identity.handleId
      )
    }

    const pendingReconnectionEligible = (
      pending: Extract<PendingConnection, { kind: 'reconnection-pending' }>,
      next: FlowDocument
    ): boolean => {
      const edge = next.edges.find(({ id }) => id === pending.edgeId)
      const resolved = edge && resolveEdgeHandles(next, edge)

      return (
        edge !== undefined &&
        edge.selected === true &&
        edge.hidden !== true &&
        canReconnectEdge(edge, pending.endpoint) &&
        resolved !== undefined &&
        edge.source === pending.source.nodeId &&
        edge.target === pending.target.nodeId &&
        resolved.sourceHandle.id === pending.source.handleId &&
        resolved.sourceHandle.kind === pending.source.kind &&
        resolved.targetHandle.id === pending.target.handleId &&
        resolved.targetHandle.kind === pending.target.kind &&
        pendingHandleElement(pending.source, next) !== undefined &&
        pendingHandleElement(pending.target, next) !== undefined
      )
    }

    const pendingConnectionEligible = (
      pending: PendingConnection,
      next = document
    ): boolean => {
      if (
        destroyed ||
        !canvas.isConnected ||
        connectionCapture !== pending.pointerId ||
        !canvas.hasPointerCapture(pending.pointerId)
      ) {
        return false
      }

      if (pending.kind === 'connection-pending') {
        return (
          options.nodesConnectable !== false &&
          (options.connectionMode === 'loose' ||
            pending.from.kind === 'source') &&
          pendingHandleElement(pending.from, next) !== undefined
        )
      }

      return pendingReconnectionEligible(pending, next)
    }

    const promoteConnection = (
      pending: PendingConnection,
      event: PointerEvent
    ): void => {
      if (!pendingConnectionEligible(pending)) {
        clearPendingConnection()

        return
      }

      pendingConnection = null

      if (pending.kind === 'reconnection-pending') {
        const fixed =
          pending.endpoint === 'source' ? pending.target : pending.source

        const element = pendingHandleElement(fixed)

        if (element === undefined) {
          releaseConnectionCapture()

          return
        }

        const active = {
          edgeId: pending.edgeId,
          endpoint: pending.endpoint,
          pointerId: pending.pointerId,
        }

        interactionSlots.activeReconnection = active
        showConnectionPreview(handleCenterInFlow(element), {
          kind: 'reconnect',
          edgeId: pending.edgeId,
          endpoint: pending.endpoint,
        })
        notifyReconnectStart({
          edgeId: pending.edgeId,
          endpoint: pending.endpoint,
        })
        runTelemetry(
          Effect.logDebug('Started edge reconnection').pipe(
            Effect.annotateLogs({
              [FlowAttribute.edgeId]: pending.edgeId,
              [FlowAttribute.edgeEndpoint]: pending.endpoint,
            }),
            Effect.withSpan(FlowSpan.edgeReconnectStart)
          )
        )
      } else {
        const element = pendingHandleElement(pending.from)

        if (element === undefined) {
          releaseConnectionCapture()

          return
        }

        interactionSlots.activeConnection = {
          pointerId: pending.pointerId,
          source: pending.from.nodeId,
          sourceHandle: pending.from.handleId,
        }
        connectionPointer = pointerInCanvas(event)
        const bounds = canvas.getBoundingClientRect()
        connectionPointerStart = {
          x: pending.startX - bounds.left,
          y: pending.startY - bounds.top,
        }
        showConnectionPreview(handleCenterInFlow(element), { kind: 'connect' })
        notifyConnectStart({
          source: pending.from.nodeId,
          sourceHandle: pending.from.handleId,
          inputKind: 'pointer-connect',
        })
        runTelemetry(
          Effect.logDebug('Started connection gesture').pipe(
            Effect.annotateLogs({
              [FlowAttribute.nodeId]: pending.from.nodeId,
              [FlowAttribute.handleId]: pending.from.handleId,
            }),
            Effect.withSpan(FlowSpan.connectionStart)
          )
        )
      }
    }

    const admitConnection = (
      pending: PendingConnection,
      event: PointerEvent
    ): void => {
      if (!acquireConnectionCapture(event.pointerId)) {
        return
      }

      pendingConnection = pending
      event.preventDefault()
      event.stopPropagation()

      if (pending.threshold === 0) {
        promoteConnection(pending, event)
      }
    }

    const startReconnection = (
      anchor: SVGCircleElement,
      event: PointerEvent
    ): void => {
      const group = anchor.closest<SVGGElement>('.flow-edge-anchor-group')
      const { endpoint } = anchor.dataset

      const edge = document.edges.find(
        (candidate) => candidate.id === group?.dataset.edgeId
      )

      if (
        event.button !== 0 ||
        pendingConnection !== null ||
        edge?.selected !== true ||
        (endpoint !== 'source' && endpoint !== 'target') ||
        !canReconnectEdge(edge, endpoint) ||
        interactionSlots.activeReconnection !== null ||
        interactionSlots.activeConnection !== null ||
        activeClickConnection !== null ||
        interactionSlots.activeDrag !== null ||
        interactionSlots.activeViewportPan !== null
      ) {
        return
      }

      const resolved = resolveEdgeHandles(document, edge)

      if (resolved === undefined) {
        return
      }

      admitConnection(
        {
          kind: 'reconnection-pending',
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          threshold: connectionDragThreshold,
          edgeId: edge.id,
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
        },
        event
      )
    }

    const startConnection = (
      node: FlowNode,
      handle: FlowHandle,
      _handleElement: HTMLElement,
      event: PointerEvent
    ): void => {
      if (
        options.nodesConnectable === false ||
        event.button !== 0 ||
        (options.connectionMode !== 'loose' && handle.kind !== 'source') ||
        pendingConnection !== null ||
        interactionSlots.activeConnection !== null ||
        activeClickConnection !== null ||
        interactionSlots.activeReconnection !== null ||
        interactionSlots.activeDrag !== null ||
        interactionSlots.activeViewportPan !== null
      ) {
        return
      }

      admitConnection(
        {
          kind: 'connection-pending',
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          threshold: connectionDragThreshold,
          from: { nodeId: node.id, handleId: handle.id, kind: handle.kind },
        },
        event
      )
    }

    const tickConnectionAutoPan = (): void => {
      connectionFrame = null

      if (
        interactionSlots.activeConnection === null ||
        connectionPointer === null
      ) {
        return
      }

      const delta = selectionAutoPanDelta(
        connectionPointer,
        canvas.clientWidth,
        canvas.clientHeight
      )

      if (delta.x === 0 && delta.y === 0) {
        return
      }

      const previous = renderedViewport
      renderViewport(panViewport(renderedViewport, delta))

      if (
        renderedViewport.x === previous.x &&
        renderedViewport.y === previous.y
      ) {
        return
      }

      const bounds = canvas.getBoundingClientRect()
      updatePointerConnectionPreview(
        interactionSlots.activeConnection,
        bounds.left + connectionPointer.x,
        bounds.top + connectionPointer.y
      )
      connectionFrame = globalThis.requestAnimationFrame(tickConnectionAutoPan)
    }

    const cancelNodeDragFrame = (): void => {
      const scope = dragFrameScope
      dragFrameScope = null
      dragFrame = null

      if (scope !== null) {
        runEffect(Scope.close(scope, Exit.void))
      }
    }

    const nodeDragCallbackPayload = (
      drag: ActiveNodeDrag | ActiveNodeGroupDrag
    ): FlowNodeDragPayload => {
      const nodeIds =
        'positions' in drag
          ? drag.positions.map(({ nodeId }) => nodeId)
          : [drag.nodeId]

      return {
        nodeIds,
        positions: nodeIds.flatMap((nodeId) => {
          const node = findNode(nodeId)
          const position = renderedNodePositions.get(nodeId) ?? node?.position

          return node === undefined || position === undefined
            ? []
            : [{ nodeId, position: { ...position } }]
        }),
      }
    }

    const notifyNodeDragStop = (
      pointerId: number,
      payload: FlowNodeDragPayload,
      outcome: FlowNodeDragStopPayload['outcome'],
      reason?: string
    ): void => {
      if (
        !callbackStartedNodeDrags.delete(pointerId) ||
        options.onNodeDragStop === undefined
      ) {
        return
      }

      reportBoundaryCallback(
        'Node drag stop',
        'node-drag',
        options.onNodeDragStop,
        { ...payload, outcome, reason }
      )
    }

    const updateNodeDragPreview = (
      drag: ActiveNodeDrag | ActiveNodeGroupDrag,
      point: XYPosition
    ): void => {
      if ('positions' in drag) {
        const change = boundedGroupChange(
          drag,
          moveNodeGroupDrag(drag, point, options.snapGrid)
        )

        for (const { nodeId, position } of change.positions) {
          renderedNodePositions.set(nodeId, position)
        }

        const graph = renderGraphPositions()
        edgeRenderer.updatePositions(
          document,
          graph,
          renderedNodePositions,
          new Set(change.positions.map(({ nodeId }) => nodeId))
        )
      } else {
        const position = boundedNodePosition(
          drag.nodeId,
          localPositionFromAbsolute(
            drag.nodeId,
            moveNodeDrag(drag, point, options.snapGrid)
          )
        )

        renderedNodePositions.set(drag.nodeId, position)
        const graph = renderGraphPositions()
        edgeRenderer.updatePositions(
          document,
          graph,
          renderedNodePositions,
          new Set([drag.nodeId])
        )
      }

      if (
        callbackStartedNodeDrags.has(drag.pointerId) &&
        options.onNodeDrag !== undefined
      ) {
        reportBoundaryCallback(
          'Node drag',
          'node-drag',
          options.onNodeDrag,
          nodeDragCallbackPayload(drag)
        )
      }
    }

    const nodeDragAutoPan = {
      tick: (): void => {
        throw new Error('Node drag auto-pan is not initialized')
      },
      schedule: (): void => {
        throw new Error('Node drag auto-pan is not initialized')
      },
    }

    nodeDragAutoPan.tick = (): void => {
      dragFrame = null
      const drag = interactionSlots.activeDrag
      const point = dragPointer
      const nodeDragSession = sessionFor('node-drag')

      if (
        drag === null ||
        point === null ||
        nodeDragSession?.kind !== 'node-drag' ||
        nodeDragSession.phase !== 'active'
      ) {
        return
      }

      if (
        point.x < 0 ||
        point.x > canvas.clientWidth ||
        point.y < 0 ||
        point.y > canvas.clientHeight
      ) {
        return
      }

      const delta = selectionAutoPanDelta(
        point,
        canvas.clientWidth,
        canvas.clientHeight
      )

      if (delta.x === 0 && delta.y === 0) {
        return
      }

      const previous = renderedViewport
      renderViewport(panViewport(renderedViewport, delta))

      if (
        renderedViewport.x === previous.x &&
        renderedViewport.y === previous.y
      ) {
        return
      }

      updateNodeDragPreview(drag, screenToFlowPosition(point, renderedViewport))
      nodeDragAutoPan.schedule()
    }

    nodeDragAutoPan.schedule = (): void => {
      const point = dragPointer
      const nodeDragSession = sessionFor('node-drag')

      if (
        point === null ||
        dragFrame !== null ||
        nodeDragSession?.kind !== 'node-drag' ||
        nodeDragSession.phase !== 'active'
      ) {
        return
      }

      if (
        point.x < 0 ||
        point.x > canvas.clientWidth ||
        point.y < 0 ||
        point.y > canvas.clientHeight
      ) {
        return
      }

      const delta = selectionAutoPanDelta(
        point,
        canvas.clientWidth,
        canvas.clientHeight
      )

      if (delta.x === 0 && delta.y === 0) {
        return
      }

      const frameScope = runEffect(Scope.make('sequential'))
      dragFrameScope = frameScope
      dragFrame = runEffect(
        Scope.provide(
          browser.requestAnimationFrame(() => {
            if (dragFrameScope !== frameScope) {
              return
            }

            dragFrameScope = null
            dragFrame = null
            runEffect(Scope.close(frameScope, Exit.void))
            nodeDragAutoPan.tick()
          }),
          frameScope
        )
      )
    }

    const cancelActiveDrag = (reason: string): void => {
      if (interactionSlots.activeDrag === null) {
        return
      }

      const drag = interactionSlots.activeDrag
      suppressClickUntilPointerUp()
      const outcome = endSession('node-drag', drag.pointerId, 'cancelled')
      const anchorId = dragAnchorId(drag)
      const entry = entries.get(anchorId)
      const node = findNode(anchorId)

      if (entry !== undefined) {
        entry.element.classList.remove('dragging')

        for (const pointerId of pointerIdsFromOutcome(outcome, [
          drag.pointerId,
        ])) {
          runEffect(browser.releasePointer(entry.element, pointerId))
        }

        if (node !== undefined) {
          restoreAdoptedPosition(node)
        }
      }

      interactionSlots.activeDrag = null
      dragPointerStart = null
      dragPointer = null
      cancelNodeDragFrame()

      const movedIds =
        'positions' in drag
          ? drag.positions.map(({ nodeId }) => nodeId)
          : [drag.nodeId]

      for (const nodeId of movedIds) {
        const authoritative = findNode(nodeId)

        if (authoritative !== undefined) {
          restoreAdoptedPosition(authoritative)
        }
      }

      renderGraphPositions()
      edgeRenderer.reconcile(document, renderedNodePositions)

      notifyNodeDragStop(
        drag.pointerId,
        nodeDragCallbackPayload(drag),
        'cancelled',
        reason
      )

      runTelemetry(
        Effect.logDebug('Cancelled node gesture').pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: anchorId,
            [FlowAttribute.pointerId]: drag.pointerId,
            [FlowAttribute.cancellationReason]: reason,
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.nodeId]: anchorId,
              [FlowAttribute.pointerId]: drag.pointerId,
              [FlowAttribute.cancellationReason]: reason,
            },
          })
        )
      )
    }

    const cancelNodeResize = (reason: string): void => {
      const resize = interactionSlots.activeNodeResize

      if (resize === null) {
        return
      }

      const outcome = endSession('node-resize', resize.pointerId, 'cancelled')
      interactionSlots.activeNodeResize = null
      const entry = entries.get(resize.nodeId)
      const node = findNode(resize.nodeId)
      suppressClickUntilPointerUp()

      if (entry !== undefined) {
        entry.element.classList.remove('resizing')
        delete entry.element.dataset.resizing

        if (node === undefined) {
          entry.element.style.width = `${resize.sizeStart.width}px`
          entry.element.style.height = `${resize.sizeStart.height}px`
          entry.element.style.boxSizing = 'border-box'
        } else {
          applyDeclaredNodeSize(entry.element, node)
        }

        acceptMeasurement(resize.nodeId, {
          nodeId: resize.nodeId,
          ...resize.sizeStart,
        })
        renderedNodePositions.delete(resize.nodeId)

        for (const child of document.nodes.filter(
          (item) => item.parentId === resize.nodeId
        )) {
          renderedNodePositions.delete(child.id)
        }

        if (node !== undefined) {
          recordNodeMeasurement(node, entry.element)
        }

        for (const pointerId of pointerIdsFromOutcome(outcome, [
          resize.pointerId,
        ])) {
          runEffect(browser.releasePointer(entry.element, pointerId))
        }
      }

      const graph = renderGraphPositions()
      edgeRenderer.reconcile(document, renderedNodePositions, graph)
      runTelemetry(
        Effect.logDebug('Cancelled node resize').pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: resize.nodeId,
            [FlowAttribute.pointerId]: resize.pointerId,
            [FlowAttribute.inputKind]: 'node-resize',
            [FlowAttribute.cancellationReason]: reason,
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.nodeId]: resize.nodeId,
              [FlowAttribute.pointerId]: resize.pointerId,
              [FlowAttribute.inputKind]: 'node-resize',
              [FlowAttribute.cancellationReason]: reason,
            },
          })
        )
      )
    }

    const keyboardResizeCandidate = (
      resize: Pick<
        ActiveKeyboardResize,
        'nodeId' | 'direction' | 'positionStart' | 'sizeStart' | 'childExtent'
      >,
      delta: XYPosition
    ): NodeBoundsChange | undefined => {
      const current = findNode(resize.nodeId)

      if (current === undefined) {
        return undefined
      }

      const parent =
        current.parentId === undefined
          ? undefined
          : graphFor().nodes.get(current.parentId)

      const bounds =
        current.parentId !== undefined &&
        current.extent === 'parent' &&
        parent !== undefined
          ? {
              minX: 0,
              minY: 0,
              maxX: parent.dimensions.width,
              maxY: parent.dimensions.height,
            }
          : options.nodeExtent

      const result = calculateNodeResize({
        direction: resize.direction,
        positionStart: resize.positionStart,
        sizeStart: resize.sizeStart,
        delta,
        minimumSize: { width: 40, height: 24 },
        bounds,
        childExtent: resize.childExtent,
      })

      if (result.boundsIssues.length > 0) {
        return undefined
      }

      const childPositions = document.nodes
        .filter((candidate) => candidate.parentId === current.id)
        .map((child) => ({
          nodeId: child.id,
          position: {
            x: child.position.x + result.childrenPositionDelta.x,
            y: child.position.y + result.childrenPositionDelta.y,
          },
        }))

      return {
        kind: 'node-bounds',
        nodeId: current.id,
        position: result.position,
        size: result.size,
        childPositions,
      }
    }

    const restoreKeyboardResizePreview = (
      resize: ActiveKeyboardResize,
      focusFallback: boolean
    ): void => {
      renderedNodePositions.delete(resize.nodeId)

      for (const child of document.nodes.filter(
        (node) => node.parentId === resize.nodeId
      )) {
        renderedNodePositions.delete(child.id)
      }

      const node = findNode(resize.nodeId)
      const entry = entries.get(resize.nodeId)

      if (node !== undefined && entry !== undefined) {
        entry.element.classList.remove('resizing')
        delete entry.element.dataset.resizing
        applyDeclaredNodeSize(entry.element, node)
        const measured = browser.measure(entry.element)
        acceptMeasurement(node.id, { nodeId: node.id, ...measured })
        recordNodeMeasurement(node, entry.element)
      }

      const graph = renderGraphPositions()
      edgeRenderer.reconcile(document, renderedNodePositions, graph)

      if (options.renderOnlyVisible === true) {
        reconcileVisible?.()
      }

      if (focusFallback && canvas.isConnected) {
        canvas.focus()
      }
    }

    const previewKeyboardResize = (resize: ActiveKeyboardResize): void => {
      const entry = entries.get(resize.nodeId)

      if (entry === undefined) {
        return
      }

      renderedNodePositions.set(resize.nodeId, resize.change.position)

      for (const child of resize.change.childPositions) {
        renderedNodePositions.set(child.nodeId, child.position)
      }

      entry.element.classList.add('resizing')
      entry.element.dataset.resizing = 'true'
      entry.element.style.width = `${resize.change.size.width}px`
      entry.element.style.height = `${resize.change.size.height}px`
      entry.element.style.boxSizing = 'border-box'
      acceptMeasurement(resize.nodeId, {
        nodeId: resize.nodeId,
        ...resize.change.size,
      })
      const node = findNode(resize.nodeId)

      if (node !== undefined) {
        recordNodeMeasurement(node, entry.element)
      }

      const graph = renderGraphPositions()
      edgeRenderer.reconcile(document, renderedNodePositions, graph)

      if (options.renderOnlyVisible === true) {
        reconcileVisible?.()
      }
    }

    const cancelKeyboardResize = (
      reason: string,
      focusFallback = false
    ): boolean => {
      const resize = activeKeyboardResize

      if (resize === null) {
        return false
      }

      activeKeyboardResize = null

      const controlWillDisappear =
        focusFallback &&
        [
          'node-removed',
          'node-hidden',
          'node-deselected',
          'host-destroyed',
        ].includes(reason)

      restoreKeyboardResizePreview(
        resize,
        focusFallback && (controlWillDisappear || !resize.button.isConnected)
      )

      if (
        !controlWillDisappear &&
        resize.button.isConnected &&
        resize.button.ownerDocument.activeElement !== resize.button
      ) {
        resize.button.focus()
      }

      runTelemetry(
        Effect.logDebug('Cancelled keyboard node resize').pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: resize.nodeId,
            [FlowAttribute.inputKind]: 'keyboard-node-resize',
            [FlowAttribute.cancellationReason]: reason,
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.nodeId]: resize.nodeId,
              [FlowAttribute.inputKind]: 'keyboard-node-resize',
              [FlowAttribute.cancellationReason]: reason,
            },
          })
        )
      )

      return true
    }

    const finishKeyboardResize = (): boolean => {
      const resize = activeKeyboardResize

      if (resize === null) {
        return false
      }

      activeKeyboardResize = null

      const changed =
        resize.change.position.x !== resize.positionStart.x ||
        resize.change.position.y !== resize.positionStart.y ||
        resize.change.size.width !== resize.sizeStart.width ||
        resize.change.size.height !== resize.sizeStart.height

      if (!changed) {
        restoreKeyboardResizePreview(resize, false)

        return true
      }

      const entry = entries.get(resize.nodeId)
      entry?.element.classList.remove('resizing')

      if (entry !== undefined) {
        delete entry.element.dataset.resizing
      }

      changePublisher.publish(resize.change)
      runTelemetry(
        Effect.logDebug('Completed keyboard node resize').pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: resize.nodeId,
            [FlowAttribute.inputKind]: 'keyboard-node-resize',
            [FlowAttribute.changeKind]: resize.change.kind,
          }),
          Effect.withSpan(FlowSpan.nodeDragComplete, {
            attributes: {
              [FlowAttribute.nodeId]: resize.nodeId,
              [FlowAttribute.inputKind]: 'keyboard-node-resize',
              [FlowAttribute.changeKind]: resize.change.kind,
            },
          })
        )
      )
      const ownerElement = entries.get(resize.nodeId)?.element

      const currentButton = ownerElement?.querySelector<HTMLButtonElement>(
        `.flow-node-resize-handle[data-direction="${resize.direction}"]`
      )

      if (currentButton?.isConnected) {
        currentButton.focus()
      }

      return true
    }

    const cancelViewportPan = (reason: string): void => {
      if (interactionSlots.activeViewportPan === null) {
        return
      }

      const pan = interactionSlots.activeViewportPan
      endUserViewportObservation()
      suppressClickUntilPointerUp()
      const outcome = endSession('pane-pan', pan.pointerId, 'cancelled')
      interactionSlots.activeViewportPan = null
      canvas.classList.remove('panning')

      for (const pointerId of pointerIdsFromOutcome(outcome, [pan.pointerId])) {
        runEffect(browser.releasePointer(canvas, pointerId))
      }

      renderViewport(authoritativeViewport)
      runTelemetry(
        Effect.logDebug('Cancelled viewport gesture').pipe(
          Effect.annotateLogs({
            [FlowAttribute.pointerId]: pan.pointerId,
            [FlowAttribute.cancellationReason]: reason,
            [FlowAttribute.inputKind]: 'pointer-pan',
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.pointerId]: pan.pointerId,
              [FlowAttribute.cancellationReason]: reason,
              [FlowAttribute.inputKind]: 'pointer-pan',
            },
          })
        )
      )
    }

    const cancelStaleReconnection = (
      next: FlowDocument,
      previous?: FlowDocument
    ): void => {
      const active = interactionSlots.activeReconnection

      if (active === null) {
        return
      }

      const { edgeId } = active
      const activeEdge = previous?.edges.find((edge) => edge.id === edgeId)
      const nextEdge = next.edges.find((edge) => edge.id === edgeId)

      if (nextEdge === undefined) {
        cancelReconnection('edge-removed')

        return
      }

      const { endpoint } = active

      const endpointNodeId =
        endpoint === 'source' ? nextEdge.source : nextEdge.target

      const endpointHandleId =
        endpoint === 'source' ? nextEdge.sourceHandle : nextEdge.targetHandle

      const endpointNode = next.nodes.find((node) => node.id === endpointNodeId)

      const endpointHandleExists =
        endpointHandleId === undefined ||
        endpointNode?.handles?.some(
          (handle) => handle.id === endpointHandleId && handle.kind === endpoint
        ) === true

      if (
        endpointNode === undefined ||
        endpointNode.hidden === true ||
        !endpointHandleExists
      ) {
        cancelReconnection('handle-removed')

        return
      }

      if (
        nextEdge.selected !== true ||
        !canReconnectEdge(nextEdge, endpoint) ||
        (activeEdge !== undefined &&
          (nextEdge.source !== activeEdge.source ||
            nextEdge.sourceHandle !== activeEdge.sourceHandle ||
            nextEdge.target !== activeEdge.target ||
            nextEdge.targetHandle !== activeEdge.targetHandle))
      ) {
        cancelReconnection('edge-changed')
      }
    }

    const operations = {
      // eslint-disable-next-line complexity -- Reconciliation owns DOM, measurement, and focus lifecycle.
      reconcile(
        next: FlowDocument,
        previous?: FlowDocument,
        quiet = false
      ): void {
        if (
          pendingConnection !== null &&
          !pendingConnectionEligible(pendingConnection, next)
        ) {
          clearPendingConnection()
        }

        const nextIds = new Set(next.nodes.map((node) => node.id))

        const removedNodeIds =
          previous?.nodes
            .filter(({ id }) => !nextIds.has(id))
            .map(({ id }) => id) ?? []

        if (
          removedNodeIds.length > 0 &&
          interactionSlots.activeSelectionRect !== null
        ) {
          // Reconciliation is invoked only after all host handlers initialize.
          // eslint-disable-next-line no-use-before-define
          cancelSelectionGesture(
            'node-removed',
            interactionSlots.activeSelectionRect.pointerId
          )
        }

        const hiddenNextIds = new Set(
          next.nodes.filter((node) => node.hidden === true).map(({ id }) => id)
        )

        const activeResize = interactionSlots.activeNodeResize

        const activeResizeOwner =
          activeResize === null
            ? undefined
            : next.nodes.find((node) => node.id === activeResize.nodeId)

        if (
          activeResize !== null &&
          (activeResizeOwner === undefined || activeResizeOwner.hidden === true)
        ) {
          cancelNodeResize(
            activeResizeOwner === undefined ? 'node-removed' : 'node-hidden'
          )
        }

        const activeKeyboard = activeKeyboardResize

        const activeKeyboardOwner =
          activeKeyboard === null
            ? undefined
            : next.nodes.find((node) => node.id === activeKeyboard.nodeId)

        const activeKeyboardOwnerHidden =
          activeKeyboard === null || activeKeyboardOwner === undefined
            ? false
            : createFlowGraph(
                next,
                measurements,
                renderedNodePositions
              ).nodes.get(activeKeyboard.nodeId)?.hidden === true

        if (
          activeKeyboard !== null &&
          (activeKeyboardOwner === undefined ||
            activeKeyboardOwnerHidden ||
            activeKeyboardOwner.selected !== true)
        ) {
          let reason: 'node-removed' | 'node-hidden' | 'node-deselected'

          if (activeKeyboardOwner === undefined) {
            reason = 'node-removed'
          } else if (activeKeyboardOwnerHidden) {
            reason = 'node-hidden'
          } else {
            reason = 'node-deselected'
          }

          cancelKeyboardResize(reason, true)
        }

        if (previous !== undefined && next !== previous) {
          cancelNodeResize('document-replacement')
          cancelKeyboardResize('document-replacement')
        }

        for (const node of next.nodes) {
          if (!isDraggingNode(node.id)) {
            restoreAdoptedPosition(node)
          }
        }

        const visibleNodes = new Set<NodeId>()
        let visibleEdges: Set<(typeof next.edges)[number]['id']> | null = null
        const visibleEdgeEndpointIds = new Set<NodeId>()
        let graph = createFlowGraph(next, measurements, renderedNodePositions)

        if (options.renderOnlyVisible === true) {
          const rect = viewportFlowRect(
            renderedViewport,
            canvas.clientWidth,
            canvas.clientHeight
          )

          visibleEdges = new Set()

          for (const edge of next.edges) {
            if (edgeIntersectsViewport(graph, edge, rect)) {
              visibleEdges.add(edge.id)
              visibleEdgeEndpointIds.add(edge.source)
              visibleEdgeEndpointIds.add(edge.target)
            }
          }

          for (const node of next.nodes) {
            const graphNode = graph.nodes.get(node.id)

            if (graphNode === undefined || graphNode.hidden) {
              continue
            }

            if (
              nodeIntersectsViewport(graph, node.id, rect) ||
              visibleEdgeEndpointIds.has(node.id)
            ) {
              visibleNodes.add(node.id)
            }
          }
        } else {
          for (const node of next.nodes) {
            if (graph.nodes.get(node.id)?.hidden === false) {
              visibleNodes.add(node.id)
            }
          }
        }

        const resizingNodeId = interactionSlots.activeNodeResize?.nodeId

        const resizingOwner =
          resizingNodeId === undefined
            ? undefined
            : next.nodes.find((node) => node.id === resizingNodeId)

        if (
          resizingNodeId !== undefined &&
          resizingOwner !== undefined &&
          resizingOwner.hidden !== true
        ) {
          visibleNodes.add(resizingNodeId)

          for (const node of next.nodes) {
            if (node.parentId === resizingNodeId && node.hidden !== true) {
              visibleNodes.add(node.id)
            }
          }
        }

        const keyboardResizingNodeId = activeKeyboardResize?.nodeId

        const keyboardResizingOwner =
          keyboardResizingNodeId === undefined
            ? undefined
            : next.nodes.find((node) => node.id === keyboardResizingNodeId)

        if (
          keyboardResizingNodeId !== undefined &&
          keyboardResizingOwner !== undefined &&
          keyboardResizingOwner.hidden !== true
        ) {
          visibleNodes.add(keyboardResizingNodeId)

          for (const node of next.nodes) {
            if (
              node.parentId === keyboardResizingNodeId &&
              node.hidden !== true
            ) {
              visibleNodes.add(node.id)
            }
          }
        }

        edgeRenderer.setVisibleEdges(visibleEdges)

        const previousNodes = new Map(
          previous?.nodes.map((node) => [node.id, node])
        )

        let added = 0
        let updated = 0
        let removed = 0

        if (interactionSlots.activeDrag !== null) {
          const participantIds =
            'positions' in interactionSlots.activeDrag
              ? interactionSlots.activeDrag.positions.map(
                  ({ nodeId }) => nodeId
                )
              : [interactionSlots.activeDrag.nodeId]

          if (participantIds.some((nodeId) => !visibleNodes.has(nodeId))) {
            cancelActiveDrag('node-removed')
            graph = createFlowGraph(next, measurements, renderedNodePositions)
          }
        }

        if (
          interactionSlots.activeNodeResize !== null &&
          !visibleNodes.has(interactionSlots.activeNodeResize.nodeId)
        ) {
          cancelNodeResize('node-removed')
          graph = createFlowGraph(next, measurements, renderedNodePositions)
        }

        if (interactionSlots.activeConnection !== null) {
          const source = next.nodes.find(
            (node) => node.id === interactionSlots.activeConnection?.source
          )

          const sourceStillExists = source?.handles?.some(
            (handle) =>
              handle.id === interactionSlots.activeConnection?.sourceHandle &&
              handle.kind === 'source'
          )

          if (!sourceStillExists || source?.hidden === true) {
            cancelConnection('source-removed')
          }
        }

        if (
          interactionSlots.activeReconnection !== null &&
          !next.edges.some(
            (edge) => edge.id === interactionSlots.activeReconnection?.edgeId
          )
        ) {
          cancelReconnection('edge-removed')
        }

        if (activeClickConnection !== null) {
          const source = next.nodes.find(
            (node) => node.id === activeClickConnection?.source
          )

          const handleExists = source?.handles?.some(
            (handle) =>
              handle.id === activeClickConnection?.sourceHandle &&
              handle.kind === 'source'
          )

          if (!handleExists || source?.hidden === true) {
            cancelClickConnection('source-removed')
          }
        }

        cancelStaleReconnection(next, previous)

        const focusedElement = globalThis.document.activeElement

        const focusedNode =
          focusedElement instanceof HTMLElement
            ? focusedElement.closest<HTMLElement>('.flow-node')
            : null

        for (const [nodeId, entry] of entries) {
          if (nextIds.has(nodeId) && visibleNodes.has(nodeId)) {
            continue
          }

          resizeObserver.unobserve(entry.element)
          entry.release()
          entry.element.remove()
          entries.delete(nodeId)

          if (!nextIds.has(nodeId) || hiddenNextIds.has(nodeId)) {
            renderedNodePositions.delete(nodeId)
          }

          removed += 1
        }

        if (removed > 0) {
          measurementState = pruneFlowMeasurements(next, measurementState)
          measurements = getFlowMeasuredNodes(next, measurementState)
        }

        for (const graphNode of graph.orderedNodes) {
          const { node } = graphNode

          if (!visibleNodes.has(node.id)) {
            continue
          }

          let entry = entries.get(node.id)

          if (entry === undefined) {
            entry = operations.makeNodeEntry(node)
            entries.set(node.id, entry)
            added += 1
          } else if (!sameNode(previousNodes.get(node.id), node)) {
            const previousNode = previousNodes.get(node.id)

            const nextRenderer = options.nodeRenderers?.[node.type ?? 'default']

            const nextRendererType =
              nextRenderer === undefined ? undefined : (node.type ?? 'default')

            if (entry.rendererType !== nextRendererType) {
              entry.generation = advanceMeasurementGeneration(node.id)
              entry.renderer?.destroy()
              entry.content.replaceChildren()
              entry.renderer = nextRenderer?.(node, entry.content)
              entry.rendererType = nextRendererType

              if (nextRenderer === undefined) {
                renderDefaultNodeContents(entry.content, node)
              }
            } else if (entry.renderer !== undefined) {
              entry.renderer.update(node)
            } else if (previousNode?.label !== node.label) {
              renderDefaultNodeContents(entry.content, node)
            }

            if (
              JSON.stringify(previousNode?.handles ?? []) !==
              JSON.stringify(node.handles ?? [])
            ) {
              renderNodeHandles(entry.handles, node)
            }

            applyDeclaredNodeSize(entry.element, node)

            updated += 1
          }

          applyNodePosition(entry.element, graphNode.absolutePosition)

          applyNodeInteractionState(entry.element, node)
          renderNodeResizeHandle(entry.element, node)

          if (
            !(
              isDraggingNode(node.id) &&
              entry.element.parentElement === viewport
            )
          ) {
            viewport.append(entry.element)
          }

          if (entry.element.dataset.measuredWidth !== undefined) {
            recordNodeMeasurement(node, entry.element)
          }
        }

        const focusedEdge =
          globalThis.document.activeElement?.closest<SVGGElement>(
            '.flow-edge-group'
          ) ?? null

        const focusedEdgeRemoved =
          focusedEdge !== null &&
          !next.edges.some((edge) => edge.id === focusedEdge?.dataset.edgeId)

        const edgeStats = edgeRenderer.reconcile(next, renderedNodePositions)

        if (focusedEdgeRemoved) {
          canvas.focus()
        } else if (focusedNode !== null) {
          const focusedNodeRecord = next.nodes.find(
            (node) => node.id === focusedNode.dataset.nodeId
          )

          const focusedEntry =
            focusedNodeRecord === undefined
              ? undefined
              : entries.get(focusedNodeRecord.id)

          if (focusedEntry === undefined) {
            canvas.focus()
          } else if (
            focusedElement instanceof HTMLElement &&
            focusedElement.isConnected
          ) {
            focusedElement.focus()
          } else {
            focusedEntry.element.focus()
          }
        }

        const attributes = {
          [FlowAttribute.nodesAdded]: added,
          [FlowAttribute.nodesUpdated]: updated,
          [FlowAttribute.nodesRemoved]: removed,
          [FlowAttribute.edgesAdded]: edgeStats.added,
          [FlowAttribute.edgesUpdated]: edgeStats.updated,
          [FlowAttribute.edgesRemoved]: edgeStats.removed,
          [FlowAttribute.edgesDeferred]: edgeStats.deferred,
        }

        if (!quiet) {
          runTelemetry(
            Effect.logDebug('Reconciled flow nodes').pipe(
              Effect.annotateLogs(attributes),
              Effect.withSpan(FlowSpan.domReconcile, { attributes })
            )
          )
        }

        if (pendingMeasurementGenerations.size > 0) {
          measurementState = setNodeMeasurementGenerations(measurementState, [
            ...pendingMeasurementGenerations.values(),
          ])
          measurements = getFlowMeasuredNodes(next, measurementState)
          pendingMeasurementGenerations.clear()
        }

        updateToolbarAnchors(next)
      },

      // eslint-disable-next-line complexity -- The change union has one branch per public operation.
      publishChange(change: FlowChange): void {
        if (mutationDepth > 0) {
          const queuedChange = structuredClone(change)
          deferredMutations.push(() => operations.publishChange(queuedChange))

          return
        }

        let publishedChange = change

        switch (change.kind) {
          case 'node-position': {
            const updated = applyNodePositionChange(document, change)

            if (updated === undefined) {
              return
            }

            if (documentMode === 'uncontrolled') {
              const previous = document
              document = updated
              operations.reconcile(document, previous)
            } else {
              const authoritative = findNode(change.nodeId)

              if (authoritative !== undefined) {
                restoreAdoptedPosition(authoritative)
              }

              renderGraphPositions()
              edgeRenderer.reconcile(document, renderedNodePositions)
            }

            break
          }

          case 'node-positions': {
            const updated = applyNodePositionsChange(document, change)

            if (updated === undefined) {
              return
            }

            if (documentMode === 'uncontrolled') {
              const previous = document
              document = updated
              operations.reconcile(document, previous)
            } else {
              for (const { nodeId } of change.positions) {
                const authoritative = findNode(nodeId)

                if (authoritative !== undefined) {
                  restoreAdoptedPosition(authoritative)
                }
              }

              renderGraphPositions()
              edgeRenderer.reconcile(document, renderedNodePositions)
            }

            break
          }

          case 'node-bounds': {
            const updated = applyNodeBoundsChange(document, change)

            if (updated === undefined) {
              return
            }

            if (documentMode === 'uncontrolled') {
              const previous = document
              document = updated
              operations.reconcile(document, previous)
            } else {
              for (const id of [
                change.nodeId,
                ...change.childPositions.map((item) => item.nodeId),
              ]) {
                const authoritative = findNode(id)

                if (authoritative !== undefined) {
                  restoreAdoptedPosition(authoritative)
                }
              }

              const node = findNode(change.nodeId)
              const entry = entries.get(change.nodeId)

              if (node !== undefined && entry !== undefined) {
                applyDeclaredNodeSize(entry.element, node)
                const m = browser.measure(entry.element)
                acceptMeasurement(node.id, { nodeId: node.id, ...m })
                recordNodeMeasurement(node, entry.element)
              }

              renderGraphPositions()
              edgeRenderer.reconcile(document, renderedNodePositions)
            }

            break
          }

          case 'node-size': {
            const updated = applyNodeSizeChange(document, change)

            if (updated === undefined) {
              return
            }

            if (documentMode === 'uncontrolled') {
              const previous = document
              document = updated
              operations.reconcile(document, previous)
            } else {
              const node = findNode(change.nodeId)
              const entry = entries.get(change.nodeId)

              if (node !== undefined && entry !== undefined) {
                applyDeclaredNodeSize(entry.element, node)
                const measurement = browser.measure(entry.element)
                acceptMeasurement(node.id, { nodeId: node.id, ...measurement })
                recordNodeMeasurement(node, entry.element)
              }

              edgeRenderer.reconcile(document, renderedNodePositions)
            }

            break
          }

          case 'viewport': {
            const candidate = constrainViewport(change.viewport)

            if (viewportMode === 'uncontrolled') {
              authoritativeViewport = candidate
            }

            renderViewport(authoritativeViewport)
            publishedChange = { kind: 'viewport', viewport: candidate }
            break
          }

          case 'edge-add': {
            if (documentMode === 'uncontrolled') {
              const previous = document
              document = {
                ...document,
                edges: [...document.edges, change.edge],
              }
              operations.reconcile(document, previous)
            }

            break
          }

          case 'edge-selection': {
            const updated = applyEdgeSelectionChange(document, change)

            if (updated === undefined) {
              return
            }

            if (documentMode === 'uncontrolled') {
              document = updated
              edgeRenderer.reconcile(document, renderedNodePositions)
            }

            const attributes = {
              [FlowAttribute.edgeId]: change.edgeId,
              [FlowAttribute.edgeSelected]: change.selected,
              [FlowAttribute.controlMode]: documentMode,
            }

            runTelemetry(
              Effect.logDebug('Changed edge selection').pipe(
                Effect.annotateLogs(attributes),
                Effect.withSpan(FlowSpan.edgeSelection, { attributes })
              )
            )

            break
          }

          case 'node-selection': {
            const updated = applyNodeSelectionChange(document, change)

            if (updated === undefined) {
              return
            }

            if (documentMode === 'uncontrolled') {
              const previous = document
              document = updated
              operations.reconcile(document, previous)
            }

            const attributes = {
              [FlowAttribute.nodeId]: change.nodeId,
              [FlowAttribute.nodeSelected]: change.selected,
              [FlowAttribute.controlMode]: documentMode,
            }

            runTelemetry(
              Effect.logDebug('Changed node selection').pipe(
                Effect.annotateLogs(attributes),
                Effect.withSpan(FlowSpan.nodeSelection, { attributes })
              )
            )

            break
          }

          case 'selection-set': {
            const updated = applySelectionSetChange(document, change)

            if (updated === undefined) {
              return
            }

            if (documentMode === 'uncontrolled') {
              const previous = document
              document = updated
              operations.reconcile(document, previous)
            }

            const attributes = {
              [FlowAttribute.nodeCount]: change.nodeIds.length,
              [FlowAttribute.edgeCount]: change.edgeIds.length,
              [FlowAttribute.controlMode]: documentMode,
            }

            runTelemetry(
              Effect.logDebug('Changed flow selection').pipe(
                Effect.annotateLogs(attributes),
                Effect.withSpan(FlowSpan.selectionSet, { attributes })
              )
            )

            break
          }

          case 'edge-reconnect': {
            const updated = applyEdgeReconnectChange(document, change)

            if (updated === undefined) {
              return
            }

            if (documentMode === 'uncontrolled') {
              document = updated
              edgeRenderer.reconcile(document, renderedNodePositions)
            }

            break
          }

          case 'edge-remove': {
            const updated = applyEdgeRemoveChange(document, change)

            if (updated === undefined) {
              return
            }

            if (documentMode === 'uncontrolled') {
              document = updated
              edgeRenderer.reconcile(document, renderedNodePositions)
              canvas.focus()
            }

            const attributes = {
              [FlowAttribute.edgeId]: change.edgeId,
              [FlowAttribute.controlMode]: documentMode,
            }

            runTelemetry(
              Effect.logDebug('Removed edge').pipe(
                Effect.annotateLogs(attributes),
                Effect.withSpan(FlowSpan.edgeRemove, { attributes })
              )
            )

            break
          }

          case 'edit-proposal': {
            if (change.deletion.deletedNodeIds.length > 0) {
              cancelActiveGestures('node-removed')
            }

            if (documentMode === 'uncontrolled') {
              const previous = document
              const { document: candidateDocument } = change
              document = candidateDocument
              operations.reconcile(document, previous)
            } else {
              renderGraphPositions()
              edgeRenderer.reconcile(document, renderedNodePositions)
            }

            break
          }

          default: {
            const exhaustive: never = change
            void exhaustive
          }
        }

        executeMutation(() => {
          try {
            for (const listener of listeners) {
              listener(publishedChange)
            }
          } finally {
            publishAcceptedState('semantic-change')
          }
        })
      },
      toggleNodeSelection(node: FlowNode): void {
        operations.publishChange({
          kind: 'selection-set',
          nodeIds: [
            ...document.nodes
              .filter(
                (candidate) =>
                  candidate.selected === true && candidate.id !== node.id
              )
              .map((candidate) => candidate.id),
            ...(node.selected === true ? [] : [node.id]),
          ],
          edgeIds: document.edges
            .filter((edge) => edge.selected === true)
            .map((edge) => edge.id),
        })
      },

      toggleEdgeSelection(edge: FlowEdge): void {
        operations.publishChange({
          kind: 'selection-set',
          nodeIds: document.nodes
            .filter((node) => node.selected === true)
            .map((node) => node.id),
          edgeIds: [
            ...document.edges
              .filter(
                (candidate) =>
                  candidate.selected === true && candidate.id !== edge.id
              )
              .map((candidate) => candidate.id),
            ...(edge.selected === true ? [] : [edge.id]),
          ],
        })
      },

      makeNodeEntry(node: FlowNode): NodeEntry {
        const generation = advanceMeasurementGeneration(node.id)

        const element = globalThis.document.createElement('article')
        const content = globalThis.document.createElement('div')
        content.className = 'flow-node-content'
        const handles = globalThis.document.createElement('div')
        handles.className = 'flow-node-handles'
        element.className = 'flow-node'
        element.dataset.nodeId = node.id
        element.dataset.testid = 'flow-node'
        element.append(content, handles)
        const renderer = options.nodeRenderers?.[node.type ?? 'default']

        const rendererType =
          renderer === undefined ? undefined : (node.type ?? 'default')

        const rendererInstance = renderer?.(node, content)

        if (renderer === undefined) {
          renderDefaultNodeContents(content, node)
        }

        renderNodeHandles(handles, node)
        renderNodeResizeHandle(element, node)
        applyDeclaredNodeSize(element, node)
        applyNodePosition(element, absolutePosition(node.id))

        const activateNodeDrag = (event: PointerEvent): boolean => {
          if (
            interactionSlots.activeDrag === null ||
            dragPointerStart === null
          ) {
            return false
          }

          const drag = interactionSlots.activeDrag

          if (
            !('positions' in drag) &&
            findNode(drag.nodeId)?.draggable === false
          ) {
            return false
          }

          if ('positions' in drag && drag.positions.length === 0) {
            return false
          }

          const dragSession = sessionFor('node-drag')

          if (
            dragSession?.kind === 'node-drag' &&
            dragSession.phase === 'active'
          ) {
            return true
          }

          const position = pointerInCanvas(event)

          const distance = Math.hypot(
            position.x - dragPointerStart.x,
            position.y - dragPointerStart.y
          )

          const threshold = options.nodeDragThreshold ?? 1

          if (threshold > 0 && distance <= threshold) {
            return false
          }

          const activation = activateFlowInteraction(
            interactionSessions,
            event.pointerId
          )

          if (activation.kind !== 'activated') {
            return false
          }

          interactionSessions = activation.sessions
          element.classList.add('dragging')
          runTelemetry(
            Effect.logDebug('Started node drag').pipe(
              Effect.annotateLogs({
                [FlowAttribute.nodeId]: node.id,
                [FlowAttribute.pointerId]: event.pointerId,
              }),
              Effect.withSpan(FlowSpan.nodeDragStart, {
                attributes: {
                  [FlowAttribute.nodeId]: node.id,
                  [FlowAttribute.pointerId]: event.pointerId,
                },
              })
            )
          )

          callbackStartedNodeDrags.add(drag.pointerId)

          if (options.onNodeDragStart !== undefined) {
            reportBoundaryCallback(
              'Node drag start',
              'node-drag',
              options.onNodeDragStart,
              nodeDragCallbackPayload(drag)
            )
          }

          return true
        }

        const resizeCandidate = (
          resize: ActiveNodeResize,
          event: PointerEvent
        ): NodeBoundsChange | undefined => {
          const current = findNode(resize.nodeId)

          if (current === undefined) {
            return undefined
          }

          const parent =
            current.parentId === undefined
              ? undefined
              : graphFor().nodes.get(current.parentId)

          const bounds =
            current.parentId !== undefined &&
            current.extent === 'parent' &&
            parent !== undefined
              ? {
                  minX: 0,
                  minY: 0,
                  maxX: parent.dimensions.width,
                  maxY: parent.dimensions.height,
                }
              : options.nodeExtent

          const result = calculateNodeResize({
            direction: resize.direction,
            positionStart: resize.positionStart,
            sizeStart: resize.sizeStart,
            delta: {
              x: pointerInFlow(event).x - resize.pointerStart.x,
              y: pointerInFlow(event).y - resize.pointerStart.y,
            },
            minimumSize: { width: 40, height: 24 },
            bounds,
            childExtent: resize.childExtent,
          })

          if (result.boundsIssues.length > 0) {
            return undefined
          }

          const childPositions = document.nodes
            .filter((candidate) => candidate.parentId === current.id)
            .map((child) => ({
              nodeId: child.id,
              position: {
                x: child.position.x + result.childrenPositionDelta.x,
                y: child.position.y + result.childrenPositionDelta.y,
              },
            }))

          return {
            kind: 'node-bounds',
            nodeId: resize.nodeId,
            position: result.position,
            size: result.size,
            childPositions,
          }
        }

        const previewResize = (event: PointerEvent): boolean => {
          const resize = interactionSlots.activeNodeResize

          if (
            resize === null ||
            resize.pointerId !== event.pointerId ||
            resize.nodeId !== node.id
          ) {
            return false
          }

          const change = resizeCandidate(resize, event)

          if (change === undefined) {
            return true
          }

          renderedNodePositions.set(node.id, change.position)

          for (const child of change.childPositions) {
            renderedNodePositions.set(child.nodeId, child.position)
          }

          element.style.width = `${change.size.width}px`
          element.style.height = `${change.size.height}px`
          element.style.boxSizing = 'border-box'
          element.dataset.resizing = 'true'
          acceptMeasurement(node.id, { nodeId: node.id, ...change.size })
          recordNodeMeasurement(findNode(node.id) ?? node, element)
          const graph = renderGraphPositions()
          edgeRenderer.reconcile(document, renderedNodePositions, graph)

          if (options.renderOnlyVisible === true) {
            reconcileVisible?.()
          }

          return true
        }

        const finishNodeResize = (event: PointerEvent): boolean => {
          const resize = interactionSlots.activeNodeResize

          if (
            resize === null ||
            resize.pointerId !== event.pointerId ||
            resize.nodeId !== node.id
          ) {
            return false
          }

          const change = resizeCandidate(resize, event)

          if (change === undefined) {
            cancelNodeResize('resize-bounds-conflict')

            return true
          }

          const outcome = endSession('node-resize', event.pointerId, 'finished')

          interactionSlots.activeNodeResize = null
          element.classList.remove('resizing')
          delete element.dataset.resizing

          for (const pointerId of pointerIdsFromOutcome(outcome, [
            event.pointerId,
          ])) {
            runEffect(browser.releasePointer(element, pointerId))
          }

          suppressCanvasClick = true
          globalThis.setTimeout(() => {
            suppressCanvasClick = false
          }, 0)

          if (
            outcome.kind === 'finished' &&
            outcome.semanticEvent === change.kind &&
            (change.position.x !== resize.positionStart.x ||
              change.position.y !== resize.positionStart.y ||
              change.size.width !== resize.sizeStart.width ||
              change.size.height !== resize.sizeStart.height)
          ) {
            operations.publishChange(change)
          }

          runTelemetry(
            Effect.logDebug('Completed node resize').pipe(
              Effect.annotateLogs({
                [FlowAttribute.nodeId]: node.id,
                [FlowAttribute.pointerId]: event.pointerId,
                [FlowAttribute.inputKind]: 'node-resize',
                [FlowAttribute.changeKind]: change.kind,
              }),
              Effect.withSpan(FlowSpan.nodeDragComplete, {
                attributes: {
                  [FlowAttribute.nodeId]: node.id,
                  [FlowAttribute.pointerId]: event.pointerId,
                  [FlowAttribute.inputKind]: 'node-resize',
                  [FlowAttribute.changeKind]: change.kind,
                },
              })
            )
          )

          return true
        }

        const startNodeResizeFromPointer = (
          event: PointerEvent,
          resizeHandle: HTMLButtonElement
        ): void => {
          event.preventDefault()
          event.stopPropagation()
          const current = findNode(node.id)

          if (
            current === undefined ||
            current.selected !== true ||
            interactionSlots.activeNodeResize !== null ||
            activeKeyboardResize !== null ||
            interactionSlots.activeDrag !== null ||
            interactionSlots.activeViewportPan !== null ||
            interactionSlots.activePinch !== null
          ) {
            return
          }

          const measured = measurements.get(node.id) ?? browser.measure(element)

          const sizeStart = {
            width:
              measured.width > 0
                ? measured.width
                : (current.size?.width ?? 150),
            height:
              measured.height > 0
                ? measured.height
                : (current.size?.height ?? 44),
          }

          const direction = Effect.runSync(
            S.decodeUnknownEffect(NodeResizeDirectionSchema)(
              resizeHandle.dataset.direction
            )
          )

          const session = {
            kind: 'node-resize' as const,
            resize: {
              direction,
              nodeId: node.id,
              positionStart: current.position,
              pointerId: event.pointerId,
              pointerStart: pointerInFlow(event),
              sizeStart,
              childExtent: graphResizeChildExtent(
                createFlowGraph(document, measurements),
                node.id
              ),
            },
          }

          const started = startFlowInteraction(interactionSessions, session)

          if (started.kind !== 'started') {
            return
          }

          interactionSessions = started.sessions

          if (!runEffect(browser.capturePointer(element, event.pointerId))) {
            cancelNodeResize('pointer-capture-failed')

            return
          }

          element.classList.add('resizing')
          runTelemetry(
            Effect.logDebug('Started node resize').pipe(
              Effect.annotateLogs({
                [FlowAttribute.nodeId]: node.id,
                [FlowAttribute.pointerId]: event.pointerId,
                [FlowAttribute.inputKind]: 'node-resize',
              }),
              Effect.withSpan(FlowSpan.nodeDragStart, {
                attributes: {
                  [FlowAttribute.nodeId]: node.id,
                  [FlowAttribute.pointerId]: event.pointerId,
                  [FlowAttribute.inputKind]: 'node-resize',
                },
              })
            )
          )
        }

        const startNodeDragFromPointer = (event: PointerEvent): void => {
          if (isNodePointerTargetAllowed(content, event.target) === false) {
            return
          }

          if (
            event.button !== 0 ||
            interactionSlots.activeDrag !== null ||
            interactionSlots.activeReconnection !== null
          ) {
            return
          }

          const current = findNode(node.id)

          if (current === undefined) {
            return
          }

          const selectedNodes =
            current.selected === true ? selectedMovableNodes() : []

          interactionSlots.activeDrag = selectedNodes.some(
            (candidate) => candidate.id !== current.id
          )
            ? {
                anchorNodeId: current.id,
                pointerId: event.pointerId,
                pointerStart: pointerInFlow(event),
                positions: selectedNodes.map((candidate) => ({
                  nodeId: candidate.id,
                  position: adoptedPosition(candidate),
                })),
              }
            : beginNodeDrag(
                node.id,
                absolutePosition(current.id),
                pointerInFlow(event),
                event.pointerId
              )
          dragPointerStart = pointerInCanvas(event)
          dragPointer = dragPointerStart

          if (!runEffect(browser.capturePointer(element, event.pointerId))) {
            cancelActiveDrag('pointer-capture-failed')

            return
          }

          event.preventDefault()

          if (options.nodeDragThreshold === 0) {
            activateNodeDrag(event)
          }
        }

        const onPointerDown = (event: PointerEvent): void => {
          if (pendingConnection !== null) {
            return
          }

          if (activeKeyboardResize?.nodeId === node.id) {
            event.preventDefault()
            event.stopPropagation()

            return
          }

          const resizeHandle =
            event.target instanceof HTMLElement
              ? event.target.closest<HTMLButtonElement>(
                  '.flow-node-resize-handle'
                )
              : null

          if (resizeHandle !== null) {
            startNodeResizeFromPointer(event, resizeHandle)

            return
          }

          const handleElement =
            event.target instanceof HTMLElement
              ? event.target.closest<HTMLElement>('.flow-handle')
              : null

          if (handleElement !== null) {
            const current = findNode(node.id)

            const handle = current?.handles?.find(
              (item) => item.id === handleElement.dataset.handleId
            )

            if (current !== undefined && handle !== undefined) {
              startConnection(current, handle, handleElement, event)
            }

            return
          }

          startNodeDragFromPointer(event)
        }

        const onPointerMove = (event: PointerEvent): void => {
          if (previewResize(event)) {
            return
          }

          if (
            interactionSlots.activeDrag?.pointerId !== event.pointerId ||
            dragAnchorId(interactionSlots.activeDrag) !== node.id
          ) {
            return
          }

          if (!activateNodeDrag(event)) {
            return
          }

          dragPointer = pointerInCanvas(event)

          updateNodeDragPreview(
            interactionSlots.activeDrag,
            pointerInFlow(event)
          )
          nodeDragAutoPan.schedule()
        }

        const finishDrag = (event: PointerEvent): void => {
          if (finishNodeResize(event)) {
            return
          }

          if (
            interactionSlots.activeDrag?.pointerId !== event.pointerId ||
            dragAnchorId(interactionSlots.activeDrag) !== node.id
          ) {
            return
          }

          const wasActivated = activateNodeDrag(event)
          dragPointer = pointerInCanvas(event)
          cancelNodeDragFrame()

          const candidate =
            'positions' in interactionSlots.activeDrag
              ? moveNodeGroupDrag(
                  interactionSlots.activeDrag,
                  pointerInFlow(event),
                  options.snapGrid
                )
              : completeNodeDrag(
                  interactionSlots.activeDrag,
                  pointerInFlow(event),
                  options.snapGrid
                )

          const change = changeForFinishedDrag(
            interactionSlots.activeDrag,
            candidate,
            boundedGroupChange,
            boundedNodePosition,
            localPositionFromAbsolute
          )

          const outcome = endSession('node-drag', event.pointerId, 'finished')
          interactionSlots.activeDrag = null
          dragPointerStart = null
          dragPointer = null

          const changedPositions =
            change.kind === 'node-position'
              ? [{ nodeId: change.nodeId, position: change.position }]
              : change.positions

          for (const { nodeId } of changedPositions) {
            const authoritative = findNode(nodeId)

            if (authoritative !== undefined) {
              restoreAdoptedPosition(authoritative)
            }
          }

          element.classList.remove('dragging')
          runEffect(browser.releasePointer(element, event.pointerId))
          suppressCanvasClick = true
          globalThis.setTimeout(() => {
            suppressCanvasClick = false
          }, 0)

          const current = findNode(node.id)

          if (current !== undefined && !wasActivated) {
            if (current.focusable !== false) {
              element.focus()
            }

            if (
              current.selectable !== false &&
              (event.metaKey || event.ctrlKey)
            ) {
              operations.toggleNodeSelection(current)
            } else if (
              current.selectable !== false &&
              current.selected !== true
            ) {
              operations.publishChange({
                kind: 'node-selection',
                nodeId: current.id,
                selected: true,
              })
            }

            return
          }

          if (!wasActivated) {
            return
          }

          if (
            outcome.kind === 'finished' &&
            outcome.semanticEvent === change.kind
          ) {
            operations.publishChange(change)
          }

          notifyNodeDragStop(
            event.pointerId,
            {
              nodeIds: changedPositions.map(({ nodeId }) => nodeId),
              positions: changedPositions.map(({ nodeId, position }) => ({
                nodeId,
                position: { ...position },
              })),
            },
            'proposed'
          )

          runTelemetry(
            Effect.logDebug('Completed node drag').pipe(
              Effect.annotateLogs({
                [FlowAttribute.nodeId]: node.id,
                [FlowAttribute.nodeCount]: changedPositions.length,
              }),
              Effect.withSpan(FlowSpan.nodeDragComplete, {
                attributes: {
                  [FlowAttribute.nodeId]: node.id,
                  [FlowAttribute.pointerId]: event.pointerId,
                  [FlowAttribute.nodeCount]: changedPositions.length,
                },
              })
            )
          )
        }

        const onPointerCancel = (event: PointerEvent): void => {
          if (
            interactionSlots.activeNodeResize?.pointerId === event.pointerId &&
            interactionSlots.activeNodeResize.nodeId === node.id
          ) {
            cancelNodeResize('pointer-cancel')

            return
          }

          if (
            interactionSlots.activeDrag?.pointerId === event.pointerId &&
            dragAnchorId(interactionSlots.activeDrag) === node.id
          ) {
            cancelActiveDrag('pointer-cancel')
          }
        }

        const nodeScope = runEffect(Scope.make('sequential'))
        runEffect(
          Scope.addFinalizer(hostScope, Scope.close(nodeScope, Exit.void))
        )
        runEffect(
          Scope.provide(
            browser.listen(element, 'pointerdown', onPointerDown),
            nodeScope
          )
        )
        runEffect(
          Scope.provide(
            browser.listen(element, 'pointermove', onPointerMove),
            nodeScope
          )
        )
        runEffect(
          Scope.provide(
            browser.listen(element, 'pointerup', finishDrag),
            nodeScope
          )
        )
        runEffect(
          Scope.provide(
            browser.listen(element, 'pointercancel', onPointerCancel),
            nodeScope
          )
        )
        resizeObserver.observe(element)

        let released = false

        const nodeEntry: NodeEntry = {
          element,
          content,
          handles,
          generation,
          rendererType,
          renderer: rendererInstance,
          release: () => {
            if (released) {
              return
            }

            released = true
            nodeEntry.renderer?.destroy()
            runEffect(Scope.close(nodeScope, Exit.void))
          },
        }

        return nodeEntry
      },
    }

    changePublisher.publish = (change) => operations.publishChange(change)
    reconcileVisible = () => operations.reconcile(document, document, true)

    const selectionRectPayload = (
      selection: ActiveSelectionRect,
      screenEnd: XYPosition,
      selected?: {
        readonly nodeIds: readonly NodeId[]
        readonly edgeIds: readonly EdgeId[]
      }
    ): FlowSelectionRectPayload => {
      const flowEnd = screenToFlowPosition(screenEnd, renderedViewport)

      return {
        pointerId: selection.pointerId,
        rect: {
          x: Math.min(selection.flowStart.x, flowEnd.x),
          y: Math.min(selection.flowStart.y, flowEnd.y),
          width: Math.abs(selection.flowStart.x - flowEnd.x),
          height: Math.abs(selection.flowStart.y - flowEnd.y),
        },
        nodeIds: selected?.nodeIds ?? [],
        edgeIds: selected?.edgeIds ?? [],
      }
    }

    const clearSelectionRect = (
      terminal: 'finished' | 'cancelled' = 'finished',
      selected?: {
        readonly nodeIds: readonly NodeId[]
        readonly edgeIds: readonly EdgeId[]
      },
      reason = 'cancelled'
    ): FlowInteractionOutcome => {
      const selection = interactionSlots.activeSelectionRect

      if (terminal === 'cancelled' && selection !== null) {
        suppressClickUntilPointerUp()
      }

      const outcome =
        selection === null
          ? { kind: 'unchanged' as const, sessions: interactionSessions }
          : endSession('selection', selection.pointerId, terminal)

      const screenEnd = selectionPointer ?? selection?.pointerStart

      if (
        selectionFrame !== null &&
        (selection === null ||
          ((outcome.kind === 'finished' || outcome.kind === 'cancelled') &&
            outcome.frame === 'selection-autopan'))
      ) {
        globalThis.cancelAnimationFrame(selectionFrame)
        selectionFrame = null
      }

      if (selection !== null) {
        for (const pointerId of pointerIdsFromOutcome(outcome, [
          selection.pointerId,
        ])) {
          runEffect(browser.releasePointer(canvas, pointerId))
        }
      }

      interactionSlots.activeSelectionRect = null
      selectionPointer = null
      selectionOverlay?.remove()
      selectionOverlay = null

      if (selection !== null && options.onSelectionEnd !== undefined) {
        const payload = selectionRectPayload(
          selection,
          screenEnd ?? selection.pointerStart,
          selected
        )

        reportBoundaryCallback(
          'Selection end',
          'selection-rectangle',
          options.onSelectionEnd,
          {
            ...payload,
            outcome: terminal,
            reason: terminal === 'cancelled' ? reason : undefined,
          }
        )
      }

      return outcome
    }

    const updateSelectionRect = (position: XYPosition): void => {
      if (
        interactionSlots.activeSelectionRect === null ||
        selectionOverlay === null
      ) {
        return
      }

      selectionPointer = position

      const start = flowToScreenPosition(
        interactionSlots.activeSelectionRect.flowStart,
        renderedViewport
      )

      selectionOverlay.style.left = `${Math.min(start.x, position.x)}px`
      selectionOverlay.style.top = `${Math.min(start.y, position.y)}px`
      selectionOverlay.style.width = `${Math.abs(start.x - position.x)}px`
      selectionOverlay.style.height = `${Math.abs(start.y - position.y)}px`

      if (
        options.onSelectionDrag !== undefined &&
        interactionSlots.activeSelectionRect !== null
      ) {
        reportBoundaryCallback(
          'Selection progress',
          'selection-rectangle',
          options.onSelectionDrag,
          selectionRectPayload(interactionSlots.activeSelectionRect, position)
        )
      }
    }

    const tickSelectionAutoPan = (): void => {
      selectionFrame = null

      if (
        interactionSlots.activeSelectionRect === null ||
        selectionPointer === null
      ) {
        return
      }

      const delta = selectionAutoPanDelta(
        selectionPointer,
        canvas.clientWidth,
        canvas.clientHeight
      )

      if (delta.x === 0 && delta.y === 0) {
        return
      }

      renderViewport(panViewport(renderedViewport, delta))
      updateSelectionRect(selectionPointer)
      selectionFrame = globalThis.requestAnimationFrame(tickSelectionAutoPan)
    }

    const finishSelectionRect = (event: PointerEvent): void => {
      if (interactionSlots.activeSelectionRect?.pointerId !== event.pointerId) {
        return
      }

      const { flowStart } = interactionSlots.activeSelectionRect
      const start = interactionSlots.activeSelectionRect.pointerStart
      const end = pointerInCanvas(event)

      const panned =
        renderedViewport.x !== authoritativeViewport.x ||
        renderedViewport.y !== authoritativeViewport.y

      if (Math.hypot(end.x - start.x, end.y - start.y) < 2) {
        clearSelectionRect('finished')

        if (panned) {
          operations.publishChange({
            kind: 'viewport',
            viewport: renderedViewport,
          })
        }

        return
      }

      suppressCanvasClick = true
      globalThis.setTimeout(() => {
        suppressCanvasClick = false
      }, 0)

      const flowEnd = screenToFlowPosition(end, renderedViewport)

      const graph = createFlowGraph(
        document,
        measurements,
        renderedNodePositions
      )

      const change = selectionInRect(
        graph,
        {
          x: Math.min(flowStart.x, flowEnd.x),
          y: Math.min(flowStart.y, flowEnd.y),
          width: Math.abs(flowStart.x - flowEnd.x),
          height: Math.abs(flowStart.y - flowEnd.y),
        },
        options.selectionMode ?? 'full'
      )

      const outcome = clearSelectionRect('finished', {
        nodeIds: change.nodeIds,
        edgeIds: change.edgeIds,
      })

      if (
        outcome.kind === 'finished' &&
        outcome.semanticEvent === change.kind
      ) {
        operations.publishChange(change)
      }

      if (panned) {
        operations.publishChange({
          kind: 'viewport',
          viewport: renderedViewport,
        })
      }
    }

    const startPinch = (event: PointerEvent): boolean => {
      if (
        !(
          event.pointerType === 'touch' &&
          interactionSlots.activeViewportPan !== null &&
          interactionSlots.activePinch === null &&
          event.pointerId !== interactionSlots.activeViewportPan.pointerId
        )
      ) {
        return false
      }

      const first = touchPointers.get(
        interactionSlots.activeViewportPan.pointerId
      )

      if (
        first !== undefined &&
        runEffect(browser.capturePointer(canvas, event.pointerId))
      ) {
        const second = pointerInCanvas(event)
        const pan = interactionSlots.activeViewportPan

        const pinch: ActivePinch = {
          firstPointerId: pan.pointerId,
          secondPointerId: event.pointerId,
          firstStart: first,
          secondStart: second,
          viewportStart: renderedViewport,
        }

        const transition = replaceFlowInteraction(
          interactionSessions,
          pan.pointerId,
          {
            kind: 'pinch',
            pinch,
          }
        )

        if (transition.kind !== 'started') {
          runEffect(browser.releasePointer(canvas, event.pointerId))

          return true
        }

        interactionSessions = transition.sessions
        touchPointers.set(event.pointerId, second)
        canvas.classList.remove('panning')
        event.preventDefault()
        runTelemetry(
          Effect.logDebug('Started pinch gesture').pipe(
            Effect.annotateLogs(FlowAttribute.inputKind, 'touch-pinch'),
            Effect.withSpan(FlowSpan.viewportPanStart, {
              attributes: { [FlowAttribute.inputKind]: 'touch-pinch' },
            })
          )
        )
      }

      return true
    }

    const hasCanvasPointerGesture = (): boolean =>
      pendingConnection !== null ||
      interactionSlots.activeDrag !== null ||
      interactionSlots.activeConnection !== null ||
      activeClickConnection !== null ||
      interactionSlots.activeReconnection !== null ||
      interactionSlots.activeViewportPan !== null ||
      interactionSlots.activePinch !== null ||
      interactionSlots.activeSelectionRect !== null

    const onCanvasPointerDown = (event: PointerEvent): void => {
      const { target } = event

      if (
        isCanvasUiTarget(target) ||
        (target instanceof Element &&
          target.closest('.nopan, [data-flow-no-pan]') !== null)
      ) {
        return
      }

      if (startPinch(event)) {
        return
      }

      const reconnectAnchor =
        target instanceof Element
          ? target.closest<SVGCircleElement>('.flow-edge-reconnect-anchor')
          : null

      if (reconnectAnchor !== null) {
        startReconnection(reconnectAnchor, event)

        return
      }

      if (
        event.button !== 0 ||
        hasCanvasPointerGesture() ||
        isCanvasGraphTarget(target)
      ) {
        return
      }

      if (isSelectionActivationEnabled(options, event)) {
        const pointerStart = pointerInCanvas(event)

        if (!runEffect(browser.capturePointer(canvas, event.pointerId))) {
          return
        }

        const selection: ActiveSelectionRect = {
          pointerId: event.pointerId,
          pointerStart,
          flowStart: screenToFlowPosition(pointerStart, renderedViewport),
        }

        interactionSlots.activeSelectionRect = selection
        selectionOverlay = globalThis.document.createElement('div')
        selectionOverlay.className = 'flow-selection-rect'
        selectionOverlay.dataset.testid = 'flow-selection-rect'
        canvas.append(selectionOverlay)

        if (options.onSelectionStart !== undefined) {
          reportBoundaryCallback(
            'Selection start',
            'selection-rectangle',
            options.onSelectionStart,
            selectionRectPayload(selection, pointerStart)
          )
        }

        updateSelectionRect(pointerStart)
        event.preventDefault()

        runTelemetry(
          Effect.logDebug('Started selection rectangle').pipe(
            Effect.annotateLogs(FlowAttribute.pointerId, event.pointerId),
            Effect.withSpan(FlowSpan.selectionRectStart, {
              attributes: { [FlowAttribute.pointerId]: event.pointerId },
            })
          )
        )

        return
      }

      if (
        !isPanButtonEnabled(options.panOnDrag, event.button) ||
        !isActivationModifierPressed(
          event,
          options.panActivationModifier ?? 'none'
        )
      ) {
        return
      }

      interactionSlots.activeViewportPan = beginViewportPan(
        renderedViewport,
        pointerInCanvas(event),
        event.pointerId
      )
      beginUserViewportObservation()

      if (!runEffect(browser.capturePointer(canvas, event.pointerId))) {
        cancelViewportPan('pointer-capture-failed')

        return
      }

      if (event.pointerType === 'touch') {
        touchPointers.set(event.pointerId, pointerInCanvas(event))
      }

      canvas.classList.add('panning')
      event.preventDefault()
      runTelemetry(
        Effect.logDebug('Started viewport pan').pipe(
          Effect.annotateLogs({
            [FlowAttribute.controlMode]: viewportMode,
            [FlowAttribute.pointerId]: event.pointerId,
            [FlowAttribute.inputKind]: 'pointer-pan',
          }),
          Effect.withSpan(FlowSpan.viewportPanStart, {
            attributes: {
              [FlowAttribute.controlMode]: viewportMode,
              [FlowAttribute.pointerId]: event.pointerId,
              [FlowAttribute.inputKind]: 'pointer-pan',
            },
          })
        )
      )
    }

    const onCanvasPointerDownCapture = (event: PointerEvent): void => {
      const { target } = event

      if (
        target instanceof Element &&
        target.closest('.flow-canvas-ui, .nopan, [data-flow-no-pan]') !== null
      ) {
        return
      }

      if (
        interactionMode !== 'pan' ||
        !isPanButtonEnabled(options.panOnDrag, event.button) ||
        !isActivationModifierPressed(
          event,
          options.panActivationModifier ?? 'none'
        )
      ) {
        return
      }

      // Keep the existing touch pinch lifecycle; mouse/pen primary drags are
      // captured here so node and edge handlers never start another gesture.
      if (event.pointerType === 'touch' && startPinch(event)) {
        event.stopPropagation()

        return
      }

      event.stopPropagation()
      event.preventDefault()
      suppressClickUntilPointerUp()

      if (
        interactionSlots.activeViewportPan !== null ||
        interactionSlots.activePinch !== null ||
        interactionSlots.activeSelectionRect !== null
      ) {
        return
      }

      interactionSlots.activeViewportPan = beginViewportPan(
        renderedViewport,
        pointerInCanvas(event),
        event.pointerId
      )
      beginUserViewportObservation()

      if (!runEffect(browser.capturePointer(canvas, event.pointerId))) {
        cancelViewportPan('pointer-capture-failed')

        return
      }

      if (event.pointerType === 'touch') {
        touchPointers.set(event.pointerId, pointerInCanvas(event))
      }

      canvas.classList.add('panning')
      runTelemetry(
        Effect.logDebug('Started viewport pan').pipe(
          Effect.annotateLogs({
            [FlowAttribute.controlMode]: viewportMode,
            [FlowAttribute.pointerId]: event.pointerId,
            [FlowAttribute.inputKind]: 'pointer-pan',
          }),
          Effect.withSpan(FlowSpan.viewportPanStart, {
            attributes: {
              [FlowAttribute.controlMode]: viewportMode,
              [FlowAttribute.pointerId]: event.pointerId,
              [FlowAttribute.inputKind]: 'pointer-pan',
            },
          })
        )
      )
    }

    const prepareConnectionMove = (event: PointerEvent): boolean => {
      if (pendingConnection !== null) {
        const pending = pendingConnection

        if (pending.pointerId !== event.pointerId) {
          return false
        }

        if (!pendingConnectionEligible(pending)) {
          clearPendingConnection()

          return false
        }

        if (
          !connectionDragActivated(
            pending.threshold,
            pending.startX,
            pending.startY,
            event.clientX,
            event.clientY
          )
        ) {
          return false
        }

        promoteConnection(pending, event)

        if (destroyed || connectionCapture !== event.pointerId) {
          return false
        }
      }

      return true
    }

    const moveConnectionPreview = (event: PointerEvent): boolean => {
      if (!prepareConnectionMove(event)) {
        return true
      }

      if (
        interactionSlots.activeConnection?.pointerId === event.pointerId ||
        interactionSlots.activeReconnection?.pointerId === event.pointerId
      ) {
        if (interactionSlots.activeConnection?.pointerId === event.pointerId) {
          connectionPointer = pointerInCanvas(event)

          if (options.autoPanOnConnect !== false && connectionFrame === null) {
            connectionFrame = globalThis.requestAnimationFrame(
              tickConnectionAutoPan
            )
          }
        }

        if (interactionSlots.activeConnection?.pointerId === event.pointerId) {
          updatePointerConnectionPreview(
            interactionSlots.activeConnection,
            event.clientX,
            event.clientY
          )
        } else {
          const position = pointerInFlow(event)
          connectionLine?.setAttribute('x2', String(position.x))
          connectionLine?.setAttribute('y2', String(position.y))
          const active = interactionSlots.activeReconnection

          if (active !== null) {
            updateReconnectPreviewState(active, event, position)
          }
        }

        return true
      }

      if (activeClickConnection !== null) {
        const position = pointerInFlow(event)
        connectionLine?.setAttribute('x2', String(position.x))
        connectionLine?.setAttribute('y2', String(position.y))

        const target = connectionTargetAt(
          activeClickConnection,
          event.clientX,
          event.clientY
        )

        const valid =
          target === null
            ? null
            : validConnectionTarget(activeClickConnection, target)

        updateConnectPreviewState(
          activeClickConnection,
          target,
          position,
          valid
        )

        return true
      }

      return false
    }

    const onCanvasPointerMove = (event: PointerEvent): void => {
      if (
        interactionSlots.activePinch !== null &&
        touchPointers.has(event.pointerId)
      ) {
        touchPointers.set(event.pointerId, pointerInCanvas(event))

        const first = touchPointers.get(
          interactionSlots.activePinch.firstPointerId
        )

        const second = touchPointers.get(
          interactionSlots.activePinch.secondPointerId
        )

        if (first !== undefined && second !== undefined) {
          renderViewport(
            movePinch(
              interactionSlots.activePinch,
              first,
              second,
              viewportLimits
            )
          )
        }

        return
      }

      if (interactionSlots.activeSelectionRect?.pointerId === event.pointerId) {
        updateSelectionRect(pointerInCanvas(event))

        if (selectionFrame === null) {
          selectionFrame =
            globalThis.requestAnimationFrame(tickSelectionAutoPan)
        }

        return
      }

      if (moveConnectionPreview(event)) {
        return
      }

      if (interactionSlots.activeViewportPan?.pointerId !== event.pointerId) {
        return
      }

      if (event.pointerType === 'touch') {
        touchPointers.set(event.pointerId, pointerInCanvas(event))
      }

      renderViewport(
        moveViewportPan(
          interactionSlots.activeViewportPan,
          pointerInCanvas(event)
        )
      )
    }

    const finishViewportPan = (event: PointerEvent): void => {
      if (interactionSlots.activeViewportPan?.pointerId !== event.pointerId) {
        return
      }

      const change: FlowChange = {
        kind: 'viewport',
        viewport: moveViewportPan(
          interactionSlots.activeViewportPan,
          pointerInCanvas(event)
        ),
      }

      const outcome = endSession('pane-pan', event.pointerId, 'finished')
      interactionSlots.activeViewportPan = null
      touchPointers.delete(event.pointerId)
      canvas.classList.remove('panning')

      for (const pointerId of pointerIdsFromOutcome(outcome, [
        event.pointerId,
      ])) {
        runEffect(browser.releasePointer(canvas, pointerId))
      }

      if (
        outcome.kind === 'finished' &&
        outcome.semanticEvent === change.kind
      ) {
        operations.publishChange(change)
      }

      endUserViewportObservation()

      runTelemetry(
        Effect.logDebug('Completed viewport pan').pipe(
          Effect.annotateLogs({
            [FlowAttribute.controlMode]: viewportMode,
            [FlowAttribute.viewportX]: change.viewport.x,
            [FlowAttribute.viewportY]: change.viewport.y,
            [FlowAttribute.viewportZoom]: change.viewport.zoom,
          }),
          Effect.withSpan(FlowSpan.viewportPanComplete, {
            attributes: {
              [FlowAttribute.controlMode]: viewportMode,
              [FlowAttribute.pointerId]: event.pointerId,
              [FlowAttribute.viewportX]: change.viewport.x,
              [FlowAttribute.viewportY]: change.viewport.y,
              [FlowAttribute.viewportZoom]: change.viewport.zoom,
            },
          })
        )
      )
    }

    const cancelPinch = (reason: string): void => {
      if (interactionSlots.activePinch === null) {
        return
      }

      const pinch = interactionSlots.activePinch
      suppressClickUntilPointerUp()
      const outcome = endSession('pinch', pinch.firstPointerId, 'cancelled')
      endUserViewportObservation()
      interactionSlots.activePinch = null
      touchPointers.clear()

      for (const pointerId of pointerIdsFromOutcome(outcome, [
        pinch.firstPointerId,
        pinch.secondPointerId,
      ])) {
        runEffect(browser.releasePointer(canvas, pointerId))
      }

      renderViewport(authoritativeViewport)
      runTelemetry(
        Effect.logDebug('Cancelled pinch gesture').pipe(
          Effect.annotateLogs({
            [FlowAttribute.inputKind]: 'touch-pinch',
            [FlowAttribute.cancellationReason]: reason,
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.inputKind]: 'touch-pinch',
              [FlowAttribute.cancellationReason]: reason,
            },
          })
        )
      )
    }

    const isPinchForPointer = (pointerId: number | undefined): boolean =>
      interactionSlots.activePinch !== null &&
      (pointerId === undefined ||
        interactionSlots.activePinch.firstPointerId === pointerId ||
        interactionSlots.activePinch.secondPointerId === pointerId)

    const cancelNodeGestures = (
      reason: string,
      pointerId: number | undefined
    ): void => {
      if (isGestureForPointer(interactionSlots.activeDrag, pointerId)) {
        cancelActiveDrag(reason)
      }

      if (isGestureForPointer(interactionSlots.activeNodeResize, pointerId)) {
        cancelNodeResize(reason)
      }

      if (pointerId === undefined) {
        cancelKeyboardResize(reason)
      }
    }

    const cancelConnectionGestures = (
      reason: string,
      pointerId: number | undefined
    ): void => {
      if (isGestureForPointer(pendingConnection, pointerId)) {
        clearPendingConnection()
      }

      if (isGestureForPointer(interactionSlots.activeConnection, pointerId)) {
        cancelConnection(reason)
      }

      if (isGestureForPointer(interactionSlots.activeReconnection, pointerId)) {
        cancelReconnection(reason)
      }

      if (pointerId === undefined) {
        cancelClickConnection(reason)
      }
    }

    const cancelViewportGestures = (
      reason: string,
      pointerId: number | undefined
    ): void => {
      if (isGestureForPointer(interactionSlots.activeViewportPan, pointerId)) {
        cancelViewportPan(reason)
      }

      if (isPinchForPointer(pointerId)) {
        cancelPinch(reason)
      }
    }

    const cancelSelectionGesture = (
      reason: string,
      pointerId: number | undefined
    ): void => {
      const selection = interactionSlots.activeSelectionRect

      if (!isGestureForPointer(selection, pointerId) || selection === null) {
        return
      }

      clearSelectionRect('cancelled', undefined, reason)
      runTelemetry(
        Effect.logDebug('Cancelled selection rectangle gesture').pipe(
          Effect.annotateLogs({
            [FlowAttribute.pointerId]: selection.pointerId,
            [FlowAttribute.cancellationReason]: reason,
            [FlowAttribute.inputKind]: 'selection-rectangle',
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.pointerId]: selection.pointerId,
              [FlowAttribute.cancellationReason]: reason,
              [FlowAttribute.inputKind]: 'selection-rectangle',
            },
          })
        )
      )
    }

    const hasActivePointerGesture = (pointerId: number | undefined): boolean =>
      [
        isGestureForPointer(pendingConnection, pointerId),
        isGestureForPointer(interactionSlots.activeDrag, pointerId),
        isGestureForPointer(interactionSlots.activeConnection, pointerId),
        isGestureForPointer(interactionSlots.activeReconnection, pointerId),
        isGestureForPointer(interactionSlots.activeViewportPan, pointerId),
        isPinchForPointer(pointerId),
        isGestureForPointer(interactionSlots.activeSelectionRect, pointerId),
        isGestureForPointer(interactionSlots.activeNodeResize, pointerId),
      ].some(Boolean) ||
      (pointerId === undefined && activeKeyboardResize !== null) ||
      (pointerId === undefined && activeClickConnection !== null)

    cancelActiveGestures = (reason: string, pointerId?: number): boolean => {
      if (!hasActivePointerGesture(pointerId)) {
        return false
      }

      cancelNodeGestures(reason, pointerId)
      cancelConnectionGestures(reason, pointerId)
      cancelViewportGestures(reason, pointerId)
      cancelSelectionGesture(reason, pointerId)

      if (pointerId === undefined) {
        touchPointers.clear()
      } else {
        touchPointers.delete(pointerId)
      }

      return true
    }

    const onWindowBlur = (): void => {
      cancelActiveGestures('window-blur')

      if (activeKeyboardNodeDrag !== null) {
        const payload = activeKeyboardNodeDrag
        activeKeyboardNodeDrag = null

        if (options.onNodeDragStop !== undefined) {
          reportBoundaryCallback(
            'Keyboard node drag stop',
            'keyboard-node-drag',
            options.onNodeDragStop,
            { ...payload, outcome: 'cancelled', reason: 'window-blur' }
          )
        }
      }
    }

    const onLostPointerCapture = (event: PointerEvent): void => {
      if (
        connectionCapture === event.pointerId &&
        (event.target !== canvas || canvas.hasPointerCapture(event.pointerId))
      ) {
        return
      }

      cancelActiveGestures('lost-pointer-capture', event.pointerId)
    }

    const onCanvasPointerCancel = (event: PointerEvent): void => {
      cancelActiveGestures('pointer-cancel', event.pointerId)
    }

    const finishPinch = (event: PointerEvent): void => {
      if (
        interactionSlots.activePinch === null ||
        (event.pointerId !== interactionSlots.activePinch.firstPointerId &&
          event.pointerId !== interactionSlots.activePinch.secondPointerId)
      ) {
        return
      }

      const pinch = interactionSlots.activePinch
      const outcome = endSession('pinch', pinch.firstPointerId, 'finished')
      endUserViewportObservation()
      interactionSlots.activePinch = null
      touchPointers.clear()

      for (const pointerId of pointerIdsFromOutcome(outcome, [
        pinch.firstPointerId,
        pinch.secondPointerId,
      ])) {
        runEffect(browser.releasePointer(canvas, pointerId))
      }

      suppressCanvasClick = true
      globalThis.setTimeout(() => {
        suppressCanvasClick = false
      }, 0)

      const change: FlowChange = {
        kind: 'viewport',
        viewport: renderedViewport,
      }

      if (
        outcome.kind === 'finished' &&
        outcome.semanticEvent === change.kind
      ) {
        operations.publishChange(change)
      }

      runTelemetry(
        Effect.logDebug('Completed pinch gesture').pipe(
          Effect.annotateLogs({
            [FlowAttribute.inputKind]: 'touch-pinch',
            [FlowAttribute.viewportZoom]: renderedViewport.zoom,
          }),
          Effect.withSpan(FlowSpan.viewportPanComplete, {
            attributes: {
              [FlowAttribute.inputKind]: 'touch-pinch',
              [FlowAttribute.viewportZoom]: renderedViewport.zoom,
            },
          })
        )
      )
    }

    const acceptsCustomConnection = (
      connection: FlowConnectionCandidate
    ): boolean => {
      if (options.isValidConnection === undefined) {
        return true
      }

      let accepted = false

      try {
        accepted = options.isValidConnection(connection)
      } catch {
        runTelemetry(
          Effect.logWarning('Connection validator failed').pipe(
            Effect.annotateLogs({
              [FlowAttribute.nodeId]: connection.source,
              [FlowAttribute.cancellationReason]: 'validator-threw',
            }),
            Effect.withSpan(FlowSpan.connectionValidate)
          )
        )

        return false
      }

      if (!accepted) {
        runTelemetry(
          Effect.logDebug('Connection rejected by validator').pipe(
            Effect.annotateLogs({
              [FlowAttribute.nodeId]: connection.source,
              [FlowAttribute.cancellationReason]: 'custom-validator',
            }),
            Effect.withSpan(FlowSpan.connectionValidate)
          )
        )
      }

      return accepted
    }

    const commitConnection = (
      started: ActiveClickConnection,
      targetNode: FlowNode,
      targetHandle: FlowHandle,
      inputKind: 'pointer-connect' | 'click-connect'
    ): 'proposed' | 'rejected' => {
      const result = runEffect(
        Effect.result(
          connectionFromHandleGesture(
            {
              document,
              fromNodeId: started.source,
              fromHandleId: started.sourceHandle,
              toNodeId: targetNode.id,
              toHandleId: targetHandle.id,
            },
            options.connectionMode ?? 'strict'
          )
        )
      )

      if (
        Result.isFailure(result) ||
        !acceptsCustomConnection(result.success)
      ) {
        if (inputKind === 'click-connect') {
          announceConnection('Connection rejected.')
        }

        return 'rejected'
      }

      const edge = applyDefaultEdgeOptions(
        nextConnectionEdge(document, result.success),
        options.defaultEdgeOptions
      )

      operations.publishChange({ kind: 'edge-add', edge })

      if (options.onConnect !== undefined) {
        reportBoundaryCallback(
          'Connection proposal',
          inputKind,
          options.onConnect,
          result.success
        )
      }

      if (inputKind === 'click-connect') {
        announceConnection('Connection completed.')
      }

      runTelemetry(
        Effect.logDebug('Completed connection').pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: edge.source,
            [FlowAttribute.edgeId]: edge.id,
            [FlowAttribute.changeKind]: 'edge-add',
            [FlowAttribute.inputKind]: inputKind,
          }),
          Effect.withSpan(FlowSpan.connectionComplete, {
            attributes: {
              [FlowAttribute.nodeId]: edge.source,
              [FlowAttribute.edgeId]: edge.id,
              [FlowAttribute.changeKind]: 'edge-add',
              [FlowAttribute.inputKind]: inputKind,
            },
          })
        )
      )

      return 'proposed'
    }

    const beginClickConnection = (
      node: FlowNode,
      handle: FlowHandle,
      element: HTMLElement
    ): void => {
      activeClickConnection = { source: node.id, sourceHandle: handle.id }
      element.classList.add('connecting')
      announceConnection(
        `Connection started from ${node.label}. Choose a target handle or press Escape to cancel.`
      )

      if (globalThis.document.activeElement !== element) {
        canvas.focus()
      }

      showConnectionPreview(handleCenterInFlow(element), { kind: 'connect' })
      notifyConnectStart({
        source: node.id,
        sourceHandle: handle.id,
        inputKind: 'click-connect',
      })
      runTelemetry(
        Effect.logDebug('Started click connection').pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: node.id,
            [FlowAttribute.handleId]: handle.id,
            [FlowAttribute.inputKind]: 'click-connect',
          }),
          Effect.withSpan(FlowSpan.connectionStart, {
            attributes: {
              [FlowAttribute.nodeId]: node.id,
              [FlowAttribute.handleId]: handle.id,
              [FlowAttribute.inputKind]: 'click-connect',
            },
          })
        )
      )
    }

    // eslint-disable-next-line complexity -- Ordered pointer/click completion must emit one terminal callback after validation.
    const finishConnection = (event: PointerEvent): void => {
      if (pendingConnection?.pointerId === event.pointerId) {
        const pending = pendingConnection
        const eligible = pendingConnectionEligible(pending)
        clearPendingConnection()
        suppressCanvasClick = true
        globalThis.setTimeout(() => {
          suppressCanvasClick = false
        }, 0)

        if (
          eligible &&
          pending.kind === 'connection-pending' &&
          options.connectOnClick === true &&
          Math.hypot(
            event.clientX - pending.startX,
            event.clientY - pending.startY
          ) <= 3
        ) {
          const element = connectionTargetAt(
            {
              source: pending.from.nodeId,
              sourceHandle: pending.from.handleId,
            },
            event.clientX,
            event.clientY
          )

          const node = document.nodes.find(
            ({ id }) => id === pending.from.nodeId
          )

          const handle = node?.handles?.find(
            ({ id }) => id === pending.from.handleId
          )

          if (
            node !== undefined &&
            handle !== undefined &&
            element?.dataset.nodeId === node.id &&
            element.dataset.handleId === handle.id
          ) {
            beginClickConnection(node, handle, element)
          }
        }

        return
      }

      if (interactionSlots.activeConnection?.pointerId !== event.pointerId) {
        return
      }

      const started = interactionSlots.activeConnection
      const pointerStart = connectionPointerStart

      const panned =
        renderedViewport.x !== authoritativeViewport.x ||
        renderedViewport.y !== authoritativeViewport.y

      const targetElement = connectionTargetAt(
        started,
        event.clientX,
        event.clientY
      )

      const targetNode = document.nodes.find(
        (node) => node.id === targetElement?.dataset.nodeId
      )

      const targetHandle = targetNode?.handles?.find(
        (handle) => handle.id === targetElement?.dataset.handleId
      )

      if (
        options.connectOnClick === true &&
        targetNode?.id === started.source &&
        targetHandle?.id === started.sourceHandle &&
        pointerStart !== null &&
        Math.hypot(
          pointerInCanvas(event).x - pointerStart.x,
          pointerInCanvas(event).y - pointerStart.y
        ) <= 3 &&
        targetElement instanceof HTMLElement
      ) {
        clearConnection()

        notifyConnectEnd({
          source: started.source,
          sourceHandle: started.sourceHandle,
          inputKind: 'pointer-connect',
          outcome: 'cancelled',
          reason: 'click-connect-activation',
        })
        beginClickConnection(targetNode, targetHandle, targetElement)
        suppressCanvasClick = true
        globalThis.setTimeout(() => {
          suppressCanvasClick = false
        }, 0)

        return
      }

      if (
        targetNode === undefined ||
        targetHandle === undefined ||
        (options.connectionMode !== 'loose' && targetHandle.kind !== 'target')
      ) {
        cancelConnection('no-target')

        if (panned) {
          operations.publishChange({
            kind: 'viewport',
            viewport: renderedViewport,
          })
        }

        return
      }

      clearConnection()

      const outcome = commitConnection(
        started,
        targetNode,
        targetHandle,
        'pointer-connect'
      )

      notifyConnectEnd({
        source: started.source,
        sourceHandle: started.sourceHandle,
        inputKind: 'pointer-connect',
        outcome,
        target: { nodeId: targetNode.id, handleId: targetHandle.id },
        reason: outcome === 'rejected' ? 'validation-rejected' : undefined,
      })

      if (panned) {
        operations.publishChange({
          kind: 'viewport',
          viewport: renderedViewport,
        })
      }
    }

    const finishReconnection = (event: PointerEvent): void => {
      if (interactionSlots.activeReconnection?.pointerId !== event.pointerId) {
        return
      }

      suppressCanvasClick = true
      globalThis.setTimeout(() => {
        suppressCanvasClick = false
      }, 0)

      const active = interactionSlots.activeReconnection

      const handleElement = canvas.ownerDocument
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('.flow-handle')

      const node = canvas.contains(handleElement ?? null)
        ? document.nodes.find(
            (item) => item.id === handleElement?.dataset.nodeId
          )
        : undefined

      const handle = node?.handles?.find(
        (item) => item.id === handleElement?.dataset.handleId
      )

      if (
        node === undefined ||
        handle === undefined ||
        (options.connectionMode !== 'loose' && handle.kind !== active.endpoint)
      ) {
        cancelReconnection('invalid-target')

        return
      }

      clearReconnection()

      const result = runEffect(
        Effect.result(
          reconnectFlowEdge(
            document,
            active.edgeId,
            active.endpoint,
            node.id,
            handle.id,
            options.connectionMode ?? 'strict'
          )
        )
      )

      if (
        Result.isFailure(result) ||
        result.success === undefined ||
        !acceptsCustomConnection({
          source: result.success.source,
          sourceHandle: result.success.sourceHandle,
          target: result.success.target,
          targetHandle: result.success.targetHandle,
        })
      ) {
        notifyReconnectEnd({
          edgeId: active.edgeId,
          endpoint: active.endpoint,
          outcome: 'rejected',
          reason: 'validation-rejected',
        })

        return
      }

      operations.publishChange({
        kind: 'edge-reconnect',
        edge: result.success,
      })

      if (options.onReconnect !== undefined) {
        reportBoundaryCallback(
          'Reconnection proposal',
          'pointer-reconnect',
          options.onReconnect,
          result.success
        )
      }

      notifyReconnectEnd({
        edgeId: active.edgeId,
        endpoint: active.endpoint,
        outcome: 'proposed',
        edge: result.success,
      })

      const attributes = {
        [FlowAttribute.edgeId]: active.edgeId,
        [FlowAttribute.edgeEndpoint]: active.endpoint,
        [FlowAttribute.nodeId]: node.id,
        [FlowAttribute.handleId]: handle.id,
      }

      runTelemetry(
        Effect.logDebug('Completed edge reconnection').pipe(
          Effect.annotateLogs(attributes),
          Effect.withSpan(FlowSpan.edgeReconnectComplete, { attributes })
        )
      )
    }

    // eslint-disable-next-line complexity -- Strict and loose click-connect activation share one ordered session transition.
    const onHandleClick = (target: EventTarget | null): boolean => {
      const handleElement =
        target instanceof Element
          ? target.closest<HTMLElement>('.flow-handle')
          : null

      if (handleElement === null) {
        return false
      }

      if (options.connectOnClick !== true) {
        return true
      }

      if (options.nodesConnectable === false) {
        return true
      }

      const node = document.nodes.find(
        (candidate) => candidate.id === handleElement.dataset.nodeId
      )

      const handle = node?.handles?.find(
        (candidate) => candidate.id === handleElement.dataset.handleId
      )

      if (node === undefined || handle === undefined) {
        return true
      }

      if (
        activeClickConnection === null &&
        (options.connectionMode === 'loose' || handle.kind === 'source')
      ) {
        beginClickConnection(node, handle, handleElement)

        return true
      }

      if (
        options.connectionMode !== 'loose' &&
        handle.kind === 'source' &&
        activeClickConnection !== null
      ) {
        const sameSource =
          activeClickConnection?.source === node.id &&
          activeClickConnection.sourceHandle === handle.id

        cancelClickConnection('source-changed')

        if (sameSource) {
          return true
        }

        beginClickConnection(node, handle, handleElement)

        return true
      }

      if (
        activeClickConnection?.source === node.id &&
        activeClickConnection.sourceHandle === handle.id
      ) {
        cancelClickConnection('source-changed')

        return true
      }

      const started = clearClickConnection()

      if (started !== null) {
        const outcome = commitConnection(started, node, handle, 'click-connect')

        notifyConnectEnd({
          source: started.source,
          sourceHandle: started.sourceHandle,
          inputKind: 'click-connect',
          outcome,
          target: { nodeId: node.id, handleId: handle.id },
          reason: outcome === 'rejected' ? 'validation-rejected' : undefined,
        })
        clickSourceElement(started)?.focus()
      }

      return true
    }

    // eslint-disable-next-line complexity -- Canvas activation covers pane, node, edge, and modifier selection.
    const onCanvasClick = (event: MouseEvent): void => {
      if (suppressCanvasClick) {
        suppressCanvasClick = false

        return
      }

      const { target } = event

      if (target instanceof Element) {
        const content = target.closest<HTMLElement>('.flow-node-content')

        const nativeControl = target.closest(
          'button, input, select, textarea, a[href], [contenteditable="true"]'
        )

        const noDragTarget = target.closest(
          '[data-flow-no-drag], [data-flow-nodrag], .nodrag'
        )

        if (
          content !== null &&
          ((nativeControl !== null && content.contains(nativeControl)) ||
            (noDragTarget !== null && content.contains(noDragTarget)))
        ) {
          return
        }
      }

      if (onHandleClick(target)) {
        return
      }

      cancelClickConnection('canvas-click')

      const edgeGroup =
        target instanceof Element
          ? target.closest<SVGGElement>('.flow-edge-group')
          : null

      if (edgeGroup !== null) {
        const edge = document.edges.find(
          (candidate) => candidate.id === edgeGroup.dataset.edgeId
        )

        if (edge !== undefined) {
          if (edge.focusable !== false) {
            edgeGroup.focus()
          }

          if (edge.selectable !== false && (event.metaKey || event.ctrlKey)) {
            operations.toggleEdgeSelection(edge)
          } else if (edge.selectable !== false && edge.selected !== true) {
            operations.publishChange({
              kind: 'edge-selection',
              edgeId: edge.id,
              selected: true,
            })
          }
        }

        return
      }

      const nodeElement =
        target instanceof Element
          ? target.closest<HTMLElement>('.flow-node')
          : null

      if (nodeElement !== null) {
        if (target instanceof Element && target.closest('.flow-handle')) {
          return
        }

        const node = document.nodes.find(
          (candidate) => candidate.id === nodeElement.dataset.nodeId
        )

        if (node !== undefined) {
          if (node.focusable !== false) {
            nodeElement.focus()
          }

          if (node.selectable !== false && (event.metaKey || event.ctrlKey)) {
            operations.toggleNodeSelection(node)
          } else if (node.selectable !== false && node.selected !== true) {
            operations.publishChange({
              kind: 'node-selection',
              nodeId: node.id,
              selected: true,
            })
          }
        }

        return
      }

      const selectedNodes = document.nodes.filter(
        (node) => node.selected === true
      )

      const selectedEdges = document.edges.filter(
        (edge) => edge.selected === true
      )

      if (selectedNodes.length + selectedEdges.length > 1) {
        operations.publishChange({
          kind: 'selection-set',
          nodeIds: [],
          edgeIds: [],
        })

        return
      }

      const [selected] = selectedEdges

      if (selected !== undefined) {
        operations.publishChange({
          kind: 'edge-selection',
          edgeId: selected.id,
          selected: false,
        })
      }

      const [selectedNode] = selectedNodes

      if (selectedNode !== undefined) {
        operations.publishChange({
          kind: 'node-selection',
          nodeId: selectedNode.id,
          selected: false,
        })
      }
    }

    // eslint-disable-next-line complexity -- Keyboard actions cover nodes, handles, edges, and the pane.
    const onCanvasKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && cancelActiveGestures('escape')) {
        event.preventDefault()

        return
      }

      if (options.keyboardActivation === false || pendingConnection !== null) {
        return
      }

      const { target } = event

      const resizeButton =
        target instanceof Element
          ? target.closest<HTMLButtonElement>('.flow-node-resize-handle')
          : null

      if (resizeButton !== null) {
        const { key } = event

        const isResizeArrow =
          key === 'ArrowUp' ||
          key === 'ArrowRight' ||
          key === 'ArrowDown' ||
          key === 'ArrowLeft'

        if (isResizeArrow) {
          event.preventDefault()
          event.stopPropagation()

          if (event.metaKey || event.ctrlKey || event.altKey) {
            return
          }

          const active = activeKeyboardResize

          if (active !== null) {
            if (active.key !== key || !event.repeat) {
              return
            }

            let { x } = active.delta
            let { y } = active.delta

            if (key === 'ArrowLeft') {
              x -= active.step
            }

            if (key === 'ArrowRight') {
              x += active.step
            }

            if (key === 'ArrowUp') {
              y -= active.step
            }

            if (key === 'ArrowDown') {
              y += active.step
            }

            const delta = { x, y }

            const change = keyboardResizeCandidate(active, delta)

            if (change !== undefined) {
              activeKeyboardResize = { ...active, delta, change }
              previewKeyboardResize(activeKeyboardResize)
            }

            return
          }

          if (event.repeat) {
            return
          }

          const direction = resizeDirections.find(
            (candidate) => candidate === resizeButton.dataset.direction
          )

          const nodeElement = resizeButton.closest<HTMLElement>('.flow-node')

          if (nodeElement === null) {
            return
          }

          const { nodeId } = nodeElement.dataset

          const current = document.nodes.find(
            (candidate) => candidate.id === nodeId
          )

          if (
            direction === undefined ||
            current === undefined ||
            current.selected !== true ||
            interactionSlots.activeNodeResize !== null ||
            interactionSlots.activeDrag !== null ||
            interactionSlots.activeViewportPan !== null ||
            interactionSlots.activePinch !== null ||
            interactionSlots.activeConnection !== null ||
            interactionSlots.activeReconnection !== null ||
            interactionSlots.activeSelectionRect !== null
          ) {
            return
          }

          const supportsArrow =
            ((direction.includes('top') || direction.includes('bottom')) &&
              (key === 'ArrowUp' || key === 'ArrowDown')) ||
            ((direction.includes('left') || direction.includes('right')) &&
              (key === 'ArrowLeft' || key === 'ArrowRight'))

          if (!supportsArrow) {
            return
          }

          const measured =
            measurements.get(current.id) ?? browser.measure(nodeElement)

          const origin = {
            nodeId: current.id,
            direction,
            positionStart: current.position,
            childExtent: graphResizeChildExtent(
              createFlowGraph(document, measurements),
              current.id
            ),
            sizeStart: {
              width:
                measured.width > 0
                  ? measured.width
                  : (current.size?.width ?? 150),
              height:
                measured.height > 0
                  ? measured.height
                  : (current.size?.height ?? 44),
            },
          }

          const step = event.shiftKey ? 20 : 5

          let x = 0
          let y = 0

          if (key === 'ArrowLeft') {
            x = -step
          }

          if (key === 'ArrowRight') {
            x = step
          }

          if (key === 'ArrowUp') {
            y = -step
          }

          if (key === 'ArrowDown') {
            y = step
          }

          const delta = { x, y }

          const change = keyboardResizeCandidate(origin, delta)

          if (change === undefined) {
            return
          }

          activeKeyboardResize = {
            ...origin,
            key,
            step,
            button: resizeButton,
            delta,
            change,
          }
          previewKeyboardResize(activeKeyboardResize)
          runTelemetry(
            Effect.logDebug('Started keyboard node resize').pipe(
              Effect.annotateLogs({
                [FlowAttribute.nodeId]: current.id,
                [FlowAttribute.inputKind]: 'keyboard-node-resize',
              }),
              Effect.withSpan(FlowSpan.nodeDragStart, {
                attributes: {
                  [FlowAttribute.nodeId]: current.id,
                  [FlowAttribute.inputKind]: 'keyboard-node-resize',
                },
              })
            )
          )

          return
        }

        return
      }

      if (target instanceof Element) {
        const content = target.closest<HTMLElement>('.flow-node-content')

        const nativeControl = target.closest(
          'button, a[href], input, select, textarea'
        )

        const isEditingTarget =
          target instanceof HTMLElement && target.isContentEditable

        if (
          content !== null &&
          ((nativeControl !== null && content.contains(nativeControl)) ||
            (isEditingTarget && content.contains(target)))
        ) {
          return
        }
      }

      const nodeElement =
        target instanceof Element && target.closest('.flow-handle') === null
          ? target.closest<HTMLElement>('.flow-node')
          : null

      if (nodeElement !== null) {
        const node = document.nodes.find(
          (candidate) => candidate.id === nodeElement.dataset.nodeId
        )

        if (node === undefined) {
          return
        }

        const arrowDelta = keyboardArrowDelta(event.key)

        if (
          arrowDelta !== null &&
          node.selected === true &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault()
          const stepX = (options.snapGrid?.x ?? 5) * (event.shiftKey ? 4 : 1)
          const stepY = (options.snapGrid?.y ?? 5) * (event.shiftKey ? 4 : 1)

          const movementDocument = {
            ...document,
            nodes: document.nodes.map((candidate) => ({
              ...candidate,
              position: adoptedPosition(candidate),
            })),
          }

          const change = moveSelectedNodes(
            movementDocument,
            {
              x: arrowDelta.x * stepX,
              y: arrowDelta.y * stepY,
            },
            options.snapGrid
          )

          const keyboardDrag: ActiveNodeGroupDrag = {
            anchorNodeId: node.id,
            pointerId: 0,
            pointerStart: { x: 0, y: 0 },
            positions: selectedMovableNodes().map((candidate) => ({
              nodeId: candidate.id,
              position:
                movementDocument.nodes.find((item) => item.id === candidate.id)
                  ?.position ?? candidate.position,
            })),
          }

          const bounded: NodePositionsChange =
            options.nodeExtent === undefined
              ? {
                  ...change,
                  positions: change.positions.map(({ nodeId, position }) => ({
                    nodeId,
                    position: boundedNodePosition(nodeId, position),
                  })),
                }
              : boundedGroupChange(keyboardDrag, change)

          if (bounded.positions.length === 0) {
            return
          }

          operations.publishChange(bounded)

          const dragPayload: FlowNodeDragPayload = {
            nodeIds: bounded.positions.map(({ nodeId }) => nodeId),
            positions: bounded.positions.map(({ nodeId, position }) => ({
              nodeId,
              position,
            })),
          }

          if (activeKeyboardNodeDrag === null) {
            activeKeyboardNodeDrag = dragPayload

            if (options.onNodeDragStart !== undefined) {
              reportBoundaryCallback(
                'Keyboard node drag start',
                'keyboard-node-drag',
                options.onNodeDragStart,
                dragPayload
              )
            }
          } else {
            activeKeyboardNodeDrag = dragPayload
          }

          if (options.onNodeDrag !== undefined) {
            reportBoundaryCallback(
              'Keyboard node drag progress',
              'keyboard-node-drag',
              options.onNodeDrag,
              dragPayload
            )
          }

          if (node.focusable !== false) {
            runEffect(browser.focus(nodeElement))
          }

          const focusedPosition = bounded.positions.find(
            ({ nodeId }) => nodeId === node.id
          )?.position

          if (focusedPosition !== undefined) {
            const parentPosition =
              node.parentId === undefined
                ? { x: 0, y: 0 }
                : absolutePosition(node.parentId)

            const absolute =
              node.parentId === undefined
                ? focusedPosition
                : {
                    x: parentPosition.x + focusedPosition.x,
                    y: parentPosition.y + focusedPosition.y,
                  }

            const screen = flowToScreenPosition(absolute, renderedViewport)
            const measured = measurements.get(node.id)
            const width = measured?.width ?? node.size?.width ?? 150
            const height = measured?.height ?? node.size?.height ?? 44
            const right = screen.x + width * renderedViewport.zoom
            const bottom = screen.y + height * renderedViewport.zoom

            let dx = 0
            let dy = 0

            if (screen.x < 0) {
              dx = -screen.x
            } else if (right > canvas.clientWidth) {
              dx = canvas.clientWidth - right
            }

            if (screen.y < 0) {
              dy = -screen.y
            } else if (bottom > canvas.clientHeight) {
              dy = canvas.clientHeight - bottom
            }

            if (dx !== 0 || dy !== 0) {
              renderViewport(panViewport(renderedViewport, { x: dx, y: dy }))
            }
          }

          runTelemetry(
            Effect.logDebug('Moved selected nodes with keyboard').pipe(
              Effect.annotateLogs({
                [FlowAttribute.nodeCount]: change.positions.length,
                [FlowAttribute.inputKind]: 'keyboard',
              }),
              Effect.withSpan(FlowSpan.nodeDragComplete, {
                attributes: {
                  [FlowAttribute.nodeCount]: change.positions.length,
                  [FlowAttribute.inputKind]: 'keyboard',
                },
              })
            )
          )

          return
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          nodeElement.blur()

          if (node.selected === true) {
            operations.publishChange({
              kind: 'node-selection',
              nodeId: node.id,
              selected: false,
            })
          }
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()

          if (node.selectable !== false && (event.metaKey || event.ctrlKey)) {
            operations.toggleNodeSelection(node)
          } else if (node.selectable !== false && node.selected !== true) {
            operations.publishChange({
              kind: 'node-selection',
              nodeId: node.id,
              selected: true,
            })
          }
        }

        return
      }

      const edgeGroup =
        target instanceof Element
          ? target.closest<SVGGElement>('.flow-edge-group')
          : null

      if (edgeGroup === null) {
        return
      }

      const edge = document.edges.find(
        (candidate) => candidate.id === edgeGroup.dataset.edgeId
      )

      if (edge === undefined) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        edgeGroup.blur()

        if (edge.selected === true) {
          operations.publishChange({
            kind: 'edge-selection',
            edgeId: edge.id,
            selected: false,
          })
        }
      } else if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        edge.selected === true &&
        edge.deletable !== false
      ) {
        event.preventDefault()

        if (!event.repeat) {
          operations.publishChange({ kind: 'edge-remove', edgeId: edge.id })
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()

        if (edge.selectable !== false && (event.metaKey || event.ctrlKey)) {
          operations.toggleEdgeSelection(edge)
        } else if (edge.selectable !== false && edge.selected !== true) {
          operations.publishChange({
            kind: 'edge-selection',
            edgeId: edge.id,
            selected: true,
          })
        }
      }
    }

    const onWindowKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && cancelActiveGestures('escape')) {
        event.preventDefault()
      }
    }

    const onWindowKeyUp = (event: KeyboardEvent): void => {
      if (activeKeyboardResize?.key === event.key) {
        finishKeyboardResize()
      }

      if (activeKeyboardNodeDrag !== null && event.key.startsWith('Arrow')) {
        const payload = activeKeyboardNodeDrag
        activeKeyboardNodeDrag = null

        if (options.onNodeDragStop !== undefined) {
          reportBoundaryCallback(
            'Keyboard node drag stop',
            'keyboard-node-drag',
            options.onNodeDragStop,
            { ...payload, outcome: 'proposed' }
          )
        }
      }
    }

    const dispatchCanvasEvent = (
      family:
        | 'Click'
        | 'DoubleClick'
        | 'ContextMenu'
        | 'MouseEnter'
        | 'MouseMove'
        | 'MouseLeave',
      event: MouseEvent,
      target = getFlowCanvasEventTarget(event.target)
    ): void => {
      const prefixByKind = { pane: 'Pane', node: 'Node', edge: 'Edge' }
      const prefix = prefixByKind[target.kind]
      // SAFETY: prefix and family are selected from closed unions whose combinations are declared callback fields.
      const callbackName = `on${prefix}${family}` as keyof FlowHostOptions

      // SAFETY: prefix and family are selected from closed unions whose combinations are declared callback fields.
      const callback = options[callbackName] as
        | FlowCanvasEventListener
        | undefined

      if (callback === undefined) {
        return
      }

      const bounds = canvas.getBoundingClientRect()

      const payload: FlowCanvasEventPayload = {
        position: {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        },
      }

      if (target.kind === 'node') {
        Object.assign(payload, { nodeId: target.id })
      }

      if (target.kind === 'edge') {
        Object.assign(payload, { edgeId: target.id })
      }

      reportBoundaryCallback(
        `${target.kind} ${family.toLowerCase()}`,
        'pointer',
        callback,
        payload
      )
    }

    const onCanvasContextMenu = (event: MouseEvent): void => {
      dispatchCanvasEvent('ContextMenu', event)

      if (options.onSelectionContextMenu === undefined) {
        return
      }

      const nodeIds = document.nodes
        .filter((node) => node.selected === true)
        .map((node) => node.id)

      const edgeIds = document.edges
        .filter((edge) => edge.selected === true)
        .map((edge) => edge.id)

      if (nodeIds.length === 0 && edgeIds.length === 0) {
        return
      }

      const bounds = canvas.getBoundingClientRect()
      event.preventDefault()
      reportBoundaryCallback(
        'Selection context menu',
        'context-menu',
        options.onSelectionContextMenu,
        {
          nodeIds,
          edgeIds,
          position: {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          },
        }
      )
    }

    const onCanvasWheel = (event: WheelEvent): void => {
      const { target } = event

      if (target instanceof Element) {
        const nativeControl = target.closest(
          'button, input, select, textarea, a[href], [contenteditable="true"]'
        )

        const noWheelTarget = target.closest(
          '[data-flow-no-wheel], [data-flow-nowheel], .nowheel'
        )

        if (nativeControl !== null || noWheelTarget !== null) {
          return
        }
      }

      if (interactionSlots.activeViewportPan !== null) {
        return
      }

      if (options.panOnScroll === true) {
        beginUserViewportObservation()
        event.preventDefault()
        const speed = options.panOnScrollSpeed ?? 1
        const mode = options.panOnScrollMode ?? 'free'
        const deltaX = mode === 'vertical' ? 0 : event.deltaX
        const deltaY = mode === 'horizontal' ? 0 : event.deltaY
        operations.publishChange({
          kind: 'viewport',
          viewport: constrainViewport(
            panViewport(renderedViewport, {
              x: -deltaX * speed,
              y: -deltaY * speed,
            })
          ),
        })
        endUserViewportObservation()

        return
      }

      if (options.zoomOnScroll === false) {
        return
      }

      let deltaFactor = 0.002

      if (event.deltaMode === 1) {
        deltaFactor = 0.05
      } else if (event.deltaMode === 2) {
        deltaFactor = 1
      }

      const factor = event.ctrlKey ? deltaFactor * 10 : deltaFactor

      const requestedZoom =
        renderedViewport.zoom * 2 ** (-event.deltaY * factor)

      const candidate = zoomViewportAt(
        renderedViewport,
        requestedZoom,
        pointerInCanvas(event),
        viewportLimits
      )

      beginUserViewportObservation()
      event.preventDefault()
      operations.publishChange({ kind: 'viewport', viewport: candidate })
      endUserViewportObservation()
      runTelemetry(
        Effect.logDebug('Zoomed viewport').pipe(
          Effect.annotateLogs({
            [FlowAttribute.controlMode]: viewportMode,
            [FlowAttribute.inputKind]: 'wheel',
            [FlowAttribute.viewportZoom]: candidate.zoom,
            [FlowAttribute.viewportZoomClamped]:
              candidate.zoom !== requestedZoom,
          }),
          Effect.withSpan(FlowSpan.viewportZoom, {
            attributes: {
              [FlowAttribute.controlMode]: viewportMode,
              [FlowAttribute.inputKind]: 'wheel',
              [FlowAttribute.viewportX]: candidate.x,
              [FlowAttribute.viewportY]: candidate.y,
              [FlowAttribute.viewportZoom]: candidate.zoom,
              [FlowAttribute.viewportZoomClamped]:
                candidate.zoom !== requestedZoom,
            },
          })
        )
      )
    }

    yield* Scope.provide(
      browser.listen(canvas, 'pointerdown', onCanvasPointerDownCapture, {
        capture: true,
      }),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerdown', onCanvasPointerDown),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointermove', onCanvasPointerMove),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', finishViewportPan),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', finishPinch),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', finishSelectionRect),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', finishConnection),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', finishReconnection),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', () => {
        if (suppressCanvasClick) {
          globalThis.setTimeout(() => {
            suppressCanvasClick = false
          }, 0)
        }
      }),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointercancel', onCanvasPointerCancel),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'lostpointercapture', onLostPointerCapture),
      hostScope
    )
    yield* Scope.provide(
      browser.listenWindow(globalThis.window, 'blur', onWindowBlur),
      hostScope
    )
    yield* Scope.provide(
      browser.listenWindow(globalThis.window, 'keyup', onWindowKeyUp),
      hostScope
    )
    yield* Scope.provide(
      browser.listenWindow(globalThis.window, 'keydown', onWindowKeyDown),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'click', onCanvasClick),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'click', (event) =>
        dispatchCanvasEvent('Click', event)
      ),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'keydown', onCanvasKeyDown),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'wheel', onCanvasWheel, { passive: false }),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'contextmenu', onCanvasContextMenu),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'mousemove', (event) => {
        dispatchCanvasEvent('MouseMove', event)
      }),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'mouseover', (event) => {
        const current = getFlowCanvasEventTarget(event.target)
        const previous = getFlowCanvasEventTarget(event.relatedTarget)
        const currentId = flowCanvasEventTargetId(current)
        const previousId = flowCanvasEventTargetId(previous)

        if (current.kind !== previous.kind || currentId !== previousId) {
          dispatchCanvasEvent('MouseEnter', event, current)
          dispatchCanvasEvent('MouseLeave', event, previous)
        }
      }),
      hostScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'mouseout', (event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !canvas.contains(event.relatedTarget)
        ) {
          dispatchCanvasEvent('MouseLeave', event)
        }
      }),
      hostScope
    )

    yield* Scope.provide(
      browser.listen(canvas, 'dblclick', (event) => {
        dispatchCanvasEvent('DoubleClick', event)

        if (options.zoomOnDoubleClick === false) {
          return
        }

        if (
          event.target instanceof Element &&
          event.target.closest(
            "button, input, textarea, select, [contenteditable='true']"
          ) !== null
        ) {
          return
        }

        const bounds = canvas.getBoundingClientRect()

        const next = zoomViewportAt(
          renderedViewport,
          renderedViewport.zoom * 1.2,
          {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          },
          viewportLimits
        )

        beginUserViewportObservation()
        operations.publishChange({
          kind: 'viewport',
          viewport: constrainViewport(next),
        })
        endUserViewportObservation()
      }),
      hostScope
    )
    canvasUIHandle.current = createCanvasUI(
      {
        controls: options.ui?.controls === true,
        minimap: options.ui?.minimap === true,
        toolbarContainers: options.toolbarContainers,
        panels: options.panels,
      },
      {
        zoomIn: () => {
          const point = {
            x: canvas.clientWidth / 2,
            y: canvas.clientHeight / 2,
          }

          operations.publishChange({
            kind: 'viewport',
            viewport: constrainViewport(
              zoomViewportAt(
                renderedViewport,
                renderedViewport.zoom * 1.2,
                point,
                viewportLimits
              )
            ),
          })
        },
        zoomOut: () => {
          const point = {
            x: canvas.clientWidth / 2,
            y: canvas.clientHeight / 2,
          }

          operations.publishChange({
            kind: 'viewport',
            viewport: constrainViewport(
              zoomViewportAt(
                renderedViewport,
                renderedViewport.zoom / 1.2,
                point,
                viewportLimits
              )
            ),
          })
        },
        fit: () => {
          fitViewControlHandle.current?.()
        },
        setInteractionMode: (mode) => {
          interactionMode = mode
          canvasUIHandle.current?.setInteractionMode(mode)
        },
        navigate: (x, y) => {
          const bounds = graphBounds(graphFor())

          if (bounds === undefined) {
            return
          }

          operations.publishChange({
            kind: 'viewport',
            viewport: constrainViewport({
              x:
                canvas.clientWidth / 2 -
                (bounds.x + bounds.width * x) * renderedViewport.zoom,
              y:
                canvas.clientHeight / 2 -
                (bounds.y + bounds.height * y) * renderedViewport.zoom,
              zoom: renderedViewport.zoom,
            }),
          })
        },
      },
      options.panel,
      panelParent,
      panelNextSibling
    )
    canvas.append(viewport, connectionStatus, canvasUIHandle.current.element)
    updateCanvasMinimap()
    const cleanupFailures: unknown[] = []
    yield* Scope.addFinalizer(
      hostScope,
      Effect.sync(() => {
        for (const entry of entries.values()) {
          try {
            entry.release()
          } catch (error) {
            cleanupFailures.push(error)
          }
        }

        entries.clear()
        renderedNodePositions.clear()

        try {
          edgeRenderer.destroy()
        } catch (error) {
          cleanupFailures.push(error)
        }

        listeners.clear()
        stateListeners.clear()
        connectionPreviewListeners.clear()
        viewportListeners.clear()

        for (const dispose of viewportPortalDisposers) {
          try {
            dispose()
          } catch (error) {
            cleanupFailures.push(error)
          }
        }

        const restorePanelFocus = canvasUIHandle.current?.captureActiveFocus()

        try {
          root.replaceChildren()
        } catch (error) {
          cleanupFailures.push(error)
        }

        try {
          canvasUIHandle.current?.destroy(restorePanelFocus)
        } catch (error) {
          cleanupFailures.push(error)
        }

        if (cleanupFailures.length > 0) {
          try {
            runTelemetry(
              Effect.logError('Failed to fully clean up flow host').pipe(
                Effect.annotateLogs({
                  [FlowAttribute.documentIssue]: cleanupFailures
                    .map(String)
                    .join('; '),
                  [FlowAttribute.nodeCount]: cleanupFailures.length,
                }),
                Effect.withSpan(FlowSpan.hostDestroy)
              )
            )
          } catch {
            // Cleanup reporting must not replace the mount or destroy outcome.
          }
        }
      })
    )

    try {
      root.replaceChildren(canvas)
      canvasUIHandle.current?.restoreFocus()
      authoritativeViewport = constrainViewport(authoritativeViewport)
      renderViewport(authoritativeViewport)
      operations.reconcile(document)
    } catch (error) {
      try {
        runEffect(Scope.close(hostScope, Exit.fail(error)))
      } catch (cleanupError) {
        try {
          runTelemetry(
            Effect.logError(
              'Failed to close flow host after mount failure'
            ).pipe(
              Effect.annotateLogs({
                [FlowAttribute.documentIssue]: String(cleanupError),
              }),
              Effect.withSpan(FlowSpan.hostMount)
            )
          )
        } catch {
          // Preserve the renderer error even if cleanup reporting fails.
        }
      }

      throw error
    }

    const overlayPortal = canvasUIHandle.current?.portal

    if (overlayPortal === undefined) {
      throw new Error('Canvas UI was not initialized before the controller')
    }

    let nextViewportRequestId = 0

    const allocateViewportRequestId = (): number => {
      nextViewportRequestId += 1

      return nextViewportRequestId
    }

    let activeViewportOperation:
      | {
          readonly requestId: number
          readonly resolve: (result: ViewportOperationResult) => void
          readonly target: Viewport
          readonly from: Viewport
          startedAt: number
          readonly duration: number
          readonly easing: 'linear' | 'ease-in-out'
          frame: number | undefined
        }
      | undefined

    const settleViewportOperation = (
      status: ViewportOperationResult['status']
    ): void => {
      const active = activeViewportOperation

      if (active === undefined) {
        return
      }

      activeViewportOperation = undefined

      if (active.frame !== undefined) {
        globalThis.cancelAnimationFrame(active.frame)
      }

      active.resolve(
        S.decodeUnknownSync(ViewportOperationResultSchema)({
          requestId: active.requestId,
          status,
          viewport:
            status === 'superseded' || status === 'disposed'
              ? authoritativeViewport
              : active.target,
        })
      )

      if (status === 'superseded' || status === 'disposed') {
        emitViewportObservation('end', authoritativeViewport, 'programmatic')
      }
    }

    const paneViewportForBounds = (
      bounds: ViewportBounds,
      padding?: FitBoundsOptions['padding']
    ): Viewport | undefined =>
      getViewportForBounds({
        bounds,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        limits: viewportLimits,
        padding,
      })

    const performViewportOperation = (
      targetInput: Viewport,
      operationOptions: Pick<FitBoundsOptions, 'duration' | 'easing'> = {}
    ): Promise<ViewportOperationResult> => {
      const requestId = allocateViewportRequestId()

      if (destroyed) {
        return Promise.resolve({
          requestId,
          status: 'disposed',
          viewport: authoritativeViewport,
        })
      }

      const target = constrainViewport(
        S.decodeUnknownSync(ViewportSchema)(targetInput)
      )

      if (activeViewportOperation !== undefined) {
        settleViewportOperation('superseded')
      }

      if (
        target.x === authoritativeViewport.x &&
        target.y === authoritativeViewport.y &&
        target.zoom === authoritativeViewport.zoom
      ) {
        return Promise.resolve({
          requestId,
          status: 'unchanged',
          viewport: authoritativeViewport,
        })
      }

      if (viewportMode === 'controlled') {
        emitViewportObservation('start', authoritativeViewport, 'programmatic')
        operations.publishChange({ kind: 'viewport', viewport: target })
        emitViewportObservation('change', target, 'programmatic')
        emitViewportObservation('end', authoritativeViewport, 'programmatic')

        return Promise.resolve({
          requestId,
          status: 'proposed',
          viewport: target,
        })
      }

      const reducedMotion = globalThis.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches

      const duration = reducedMotion ? 0 : (operationOptions.duration ?? 0)
      const easing = operationOptions.easing ?? 'ease-in-out'
      const from = authoritativeViewport

      if (duration === 0) {
        emitViewportObservation('start', from, 'programmatic')
        viewportObservationSource = 'programmatic'
        operations.publishChange({ kind: 'viewport', viewport: target })
        viewportObservationSource = 'user'
        emitViewportObservation('end', target, 'programmatic')

        return Promise.resolve({
          requestId,
          status: 'accepted',
          viewport: target,
        })
      }

      // The RAF callback is the settlement source for an interruptible host animation.
      // eslint-disable-next-line promise/avoid-new -- The host owns frame lifecycle and cancellation.
      return new Promise((resolve) => {
        emitViewportObservation('start', from, 'programmatic')

        const active: NonNullable<typeof activeViewportOperation> = {
          requestId,
          resolve,
          target,
          from,
          startedAt: 0,
          duration,
          easing,
          frame: undefined,
        }

        activeViewportOperation = active

        const tick = (time: number): void => {
          if (activeViewportOperation !== active || destroyed) {
            return
          }

          if (active.startedAt === 0) {
            active.startedAt = time
          }

          const progress = Math.min(1, (time - active.startedAt) / duration)
          const next = interpolateViewport(from, target, progress, easing)
          viewportObservationSource = 'programmatic'
          operations.publishChange({ kind: 'viewport', viewport: next })
          viewportObservationSource = 'user'

          if (progress >= 1) {
            activeViewportOperation = undefined
            emitViewportObservation(
              'end',
              authoritativeViewport,
              'programmatic'
            )
            resolve({
              requestId,
              status: 'accepted',
              viewport: authoritativeViewport,
            })
          } else {
            active.frame = globalThis.requestAnimationFrame(tick)
          }
        }

        active.frame = globalThis.requestAnimationFrame(tick)
      })
    }

    const controller: FlowController = {
      overlayPortal,
      mountViewportPortal,
      getConnectionPreview: () => (destroyed ? null : connectionPreviewState),
      subscribeConnectionPreview: (listener): (() => void) => {
        if (destroyed) {
          return () => connectionPreviewListeners.delete(listener)
        }

        connectionPreviewListeners.add(listener)

        return () => connectionPreviewListeners.delete(listener)
      },
      subscribeSelection: (listener): (() => void) => {
        if (destroyed) {
          return noopUnsubscribe
        }

        let previous = selectFlowSelection(document)

        const unsubscribe = controller.subscribeState(({ current }) => {
          const next = selectFlowSelection(current.document)

          if (!flowSelectionEqual(previous, next)) {
            previous = next
            listener(next)
          }
        })

        listener(previous)

        return unsubscribe
      },
      observeKeyPress: (keyCode, keyOptions, listener): (() => void) => {
        if (destroyed) {
          listener(false)

          return noopUnsubscribe
        }

        let disposed = false
        let disposeObserver: () => void = noopUnsubscribe

        const dispose = (): void => {
          if (disposed) {
            return
          }

          disposed = true
          keyPressDisposers.delete(dispose)
          disposeObserver()
        }

        keyPressDisposers.add(dispose)
        disposeObserver = observeKeyPress(keyCode, listener, keyOptions)

        return dispose
      },
      destroy: (): void => {
        void controller.destroyAsync()
      },
      destroyAsync: (): Promise<void> => {
        if (destroyPromise !== undefined) {
          return destroyPromise
        }

        if (destroyed) {
          return Promise.resolve()
        }

        const destroyCompletion = Promise.withResolvers<null>()
        destroyPromise = (async (): Promise<void> => {
          await destroyCompletion.promise
        })()
        let stateCleanupFailure: unknown
        let stateCleanupFailed = false

        try {
          cancelActiveDrag('host-destroyed')
          cancelNodeResize('host-destroyed')
          cancelKeyboardResize('host-destroyed', true)
          clearPendingConnection()
          cancelConnection('host-destroyed')
          cancelClickConnection('host-destroyed')
          cancelReconnection('host-destroyed')
          cancelViewportPan('host-destroyed')
          cancelPinch('host-destroyed')
          clearSelectionRect('cancelled', undefined, 'host-destroyed')
          settleViewportOperation('disposed')
          destroyed = true

          for (const dispose of keyPressDisposers) {
            dispose()
          }

          keyPressDisposers.clear()
          stateListeners.clear()
          connectionPreviewListeners.clear()
          viewportListeners.clear()

          for (const reject of pendingEditRejectors) {
            reject(new Error('FlowControllerDisposed'))
          }

          pendingEditRejectors.clear()
          deferredMutations.length = 0

          for (const [nodeId, resolve] of pendingInternals) {
            for (const settle of resolve) {
              settle({ nodeId, status: 'disposed' })
            }
          }

          pendingInternals.clear()
        } catch (error) {
          stateCleanupFailure = error
          stateCleanupFailed = true
          destroyed = true
        }

        const closeHostScope = async (): Promise<void> => {
          try {
            await runPromise(
              Scope.close(hostScope, Exit.void).pipe(
                Effect.tap(() => Effect.logDebug('Destroyed flow host')),
                Effect.withSpan(FlowSpan.browserLifecycleClose),
                Effect.withSpan(FlowSpan.hostDestroy)
              )
            )
          } catch (error) {
            destroyCompletion.reject(
              stateCleanupFailed
                ? new AggregateError(
                    [stateCleanupFailure, error],
                    'Flow host teardown failed'
                  )
                : error
            )

            return
          }

          if (stateCleanupFailed) {
            destroyCompletion.reject(stateCleanupFailure)

            return
          }

          destroyCompletion.resolve(null)
        }

        void closeHostScope()

        return destroyPromise
      },
      getSnapshot: () => createFlowSnapshot(document, authoritativeViewport),
      getDocumentRevision: () => documentRevision,
      getVersionedSavedSession: () =>
        encodeVersionedFlowSession(document, authoritativeViewport),
      prepareVersionedRestore: (saved) =>
        Effect.runPromise(decodeVersionedFlowSession(saved)),
      getSavedSession: () =>
        encodeSavedFlowSession(document, authoritativeViewport),
      prepareRestore: (saved) =>
        Effect.runPromise(decodeSavedFlowSession(saved)),
      getNodes: () =>
        createFlowSnapshot(document, authoritativeViewport).document.nodes,
      getEdges: () =>
        createFlowSnapshot(document, authoritativeViewport).document.edges,
      getNode: (id) =>
        createFlowSnapshot(document, authoritativeViewport).document.nodes.find(
          (node) => node.id === id
        ),
      getNodesData: (nodeIds) =>
        selectNodesData(
          document,
          nodeIds.map((id) => S.decodeUnknownSync(NodeIdSchema)(id))
        ),
      getNodeConnections: (query) => {
        const validatedOptions = {
          nodeId: S.decodeUnknownSync(NodeIdSchema)(query.nodeId),
        }

        if (query.type !== undefined) {
          Object.assign(validatedOptions, { type: query.type })
        }

        if (query.handleId !== undefined) {
          Object.assign(validatedOptions, {
            handleId:
              query.handleId === null
                ? null
                : S.decodeUnknownSync(HandleIdSchema)(query.handleId),
          })
        }

        return selectNodeConnections(document, validatedOptions)
      },
      observeNodeConnections: (query, callbacks) => {
        let active = true
        let previous = controller.getNodeConnections(query)

        const unsubscribe = controller.subscribeState(({ current }) => {
          if (!active) {
            return
          }

          const validatedOptions = {
            nodeId: S.decodeUnknownSync(NodeIdSchema)(query.nodeId),
          }

          if (query.type !== undefined) {
            Object.assign(validatedOptions, { type: query.type })
          }

          if (query.handleId !== undefined) {
            Object.assign(validatedOptions, {
              handleId:
                query.handleId === null
                  ? null
                  : S.decodeUnknownSync(HandleIdSchema)(query.handleId),
            })
          }

          const next = selectNodeConnections(current.document, validatedOptions)

          const delta = diffNodeConnections(previous, next)
          previous = next

          if (
            delta.disconnected.length > 0 &&
            callbacks.onDisconnect !== undefined
          ) {
            reportBoundaryCallback(
              'Node connection observer',
              'node-connection-disconnect',
              callbacks.onDisconnect,
              delta.disconnected
            )
          }

          if (delta.connected.length > 0 && callbacks.onConnect !== undefined) {
            reportBoundaryCallback(
              'Node connection observer',
              'node-connection-connect',
              callbacks.onConnect,
              delta.connected
            )
          }
        })

        return () => {
          if (!active) {
            return
          }

          active = false
          unsubscribe()
        }
      },
      observeHandleConnections: (query, callbacks) => {
        const validatedQuery = S.decodeUnknownSync(
          FlowHandleConnectionsQuerySchema
        )(query)

        let active = true
        let previous = controller.getHandleConnections(validatedQuery)

        const unsubscribe = controller.subscribeState(({ current }) => {
          if (!active) {
            return
          }

          const before = previous
          const next = selectHandleConnections(current.document, validatedQuery)

          const delta = diffNodeConnections(
            projectHandleConnectionEdges(before),
            projectHandleConnectionEdges(next)
          )

          const previousById = new Map(before.map((edge) => [edge.id, edge]))
          const edgesById = new Map(next.map((edge) => [edge.id, edge]))

          previous = next

          if (
            delta.disconnected.length > 0 &&
            callbacks.onDisconnect !== undefined
          ) {
            reportBoundaryCallback(
              'Handle connection observer',
              'handle-connection-disconnect',
              callbacks.onDisconnect,
              delta.disconnected.flatMap((connection) => {
                const edge = previousById.get(connection.edgeId)

                return edge === undefined ? [] : [edge]
              })
            )
          }

          if (delta.connected.length > 0 && callbacks.onConnect !== undefined) {
            reportBoundaryCallback(
              'Handle connection observer',
              'handle-connection-connect',
              callbacks.onConnect,
              delta.connected.flatMap((connection) => {
                const edge = edgesById.get(connection.edgeId)

                return edge === undefined ? [] : [edge]
              })
            )
          }
        })

        return () => {
          if (!active) {
            return
          }

          active = false
          unsubscribe()
        }
      },
      getHandleConnections: (query) =>
        selectHandleConnections(
          document,
          S.decodeUnknownSync(FlowHandleConnectionsQuerySchema)(query)
        ),
      getInternalNode: (id) => {
        const node = document.nodes.find((candidate) => candidate.id === id)

        return node === undefined
          ? undefined
          : getFlowInternalNode(document, measurementState, node.id)
      },
      nodesInitialized: (readinessOptions) =>
        areFlowNodesInitialized(document, measurementState, {
          ...readinessOptions,
          mountedNodeIds: new Set(entries.keys()),
        }),
      updateNodeInternals: (requestedIds) => {
        const nodeIds = [
          ...new Set(
            S.decodeUnknownSync(S.Array(NodeIdSchema))(
              Array.isArray(requestedIds) ? requestedIds : [requestedIds]
            )
          ),
        ]

        if (destroyed) {
          return Promise.resolve(
            nodeIds.map((nodeId) => ({ nodeId, status: 'disposed' as const }))
          )
        }

        const requests = nodeIds.map((nodeId) => {
          const { promise, resolve } =
            Promise.withResolvers<NodeInternalsRefreshResult>()

          const waiters = pendingInternals.get(nodeId) ?? []
          waiters.push(resolve)
          pendingInternals.set(nodeId, waiters)

          return promise
        })

        const failQueued = (cause: unknown): void => {
          refreshFramePending = false
          runTelemetry(measurementFailure(cause, 'batch'))

          for (const [nodeId, waiters] of pendingInternals) {
            for (const settle of waiters) {
              settle({ nodeId: NodeIdSchema.make(nodeId), status: 'failed' })
            }
          }

          pendingInternals.clear()
        }

        const flush = (): void => {
          refreshFramePending = false
          const batch = [...pendingInternals]
          pendingInternals.clear()
          const samples: NodeMeasurementInput[] = []
          const results: NodeInternalsRefreshResult[] = []

          for (const [nodeId] of batch) {
            let status: NodeInternalsRefreshResult['status'] = 'disposed'

            try {
              const node = document.nodes.find(({ id }) => id === nodeId)
              const element = entries.get(nodeId)?.element
              const generation = entries.get(nodeId)?.generation

              if (!destroyed) {
                if (node === undefined) {
                  status = 'missing'
                } else if (
                  element === undefined ||
                  !element.isConnected ||
                  generation === undefined
                ) {
                  status = 'failed'
                } else {
                  const size = browser.measure(element)
                  samples.push({
                    nodeId: node.id,
                    generation,
                    ...size,
                    handles: measureNodeHandles(
                      node,
                      element,
                      renderedViewport.zoom
                    ),
                  })
                  status = 'requested'
                }
              }
            } catch (error) {
              status = 'failed'
              runTelemetry(measurementFailure(error, nodeId))
            }

            results.push({ nodeId: NodeIdSchema.make(nodeId), status })
          }

          let projectionFailed = false

          try {
            if (!destroyed && samples.length > 0) {
              measurementState = applyNodeMeasurements(
                document,
                measurementState,
                samples
              )
              measurements = getFlowMeasuredNodes(document, measurementState)
              renderGraphPositions()
              edgeRenderer.reconcile(document, renderedNodePositions)
            }
          } catch (error) {
            runTelemetry(measurementFailure(error, 'batch'))
            projectionFailed = true
          }

          for (const result of results) {
            const waiters =
              batch.find(([nodeId]) => nodeId === result.nodeId)?.[1] ?? []

            for (const settle of waiters) {
              settle(
                projectionFailed && result.status === 'requested'
                  ? { ...result, status: 'failed' }
                  : result
              )
            }
          }
        }

        if (!refreshFramePending && pendingInternals.size > 0) {
          refreshFramePending = true

          try {
            runEffect(
              Scope.provide(browser.requestAnimationFrame(flush), hostScope)
            )
          } catch (error) {
            failQueued(error)
          }
        }

        return Promise.all(requests)
      },
      getEdge: (id) =>
        createFlowSnapshot(document, authoritativeViewport).document.edges.find(
          (edge) => edge.id === id
        ),
      getViewport: () =>
        createFlowSnapshot(document, authoritativeViewport).viewport,
      getViewportLimits: () => ({ ...viewportLimits }),
      getZoom: () => authoritativeViewport.zoom,
      get viewportInitialized() {
        return canvas.clientWidth > 0 && canvas.clientHeight > 0
      },
      screenToFlowPosition: (position) => {
        const rect = canvas.getBoundingClientRect()

        return screenToFlowPosition(
          { x: position.x - rect.left, y: position.y - rect.top },
          authoritativeViewport
        )
      },
      flowToScreenPosition: (position) => {
        const rect = canvas.getBoundingClientRect()
        const panePoint = flowToScreenPosition(position, authoritativeViewport)

        return { x: panePoint.x + rect.left, y: panePoint.y + rect.top }
      },
      getViewportForBounds: (bounds, fitOptions = {}) =>
        paneViewportForBounds(bounds, fitOptions.padding),
      setViewport: (candidate, operationOptions) =>
        performViewportOperation(candidate, operationOptions),
      zoomIn: (operationOptions) =>
        controller.zoomTo(authoritativeViewport.zoom * 1.2, operationOptions),
      zoomOut: (operationOptions) =>
        controller.zoomTo(authoritativeViewport.zoom / 1.2, operationOptions),
      zoomTo: (zoom, operationOptions) => {
        const boundedZoom = Math.max(
          viewportLimits.minZoom,
          Math.min(viewportLimits.maxZoom, zoom)
        )

        const centerX = canvas.clientWidth / 2
        const centerY = canvas.clientHeight / 2

        return performViewportOperation(
          zoomViewportAt(
            authoritativeViewport,
            boundedZoom,
            { x: centerX, y: centerY },
            viewportLimits
          ),
          operationOptions
        )
      },
      setCenter: (x, y, operationOptions = {}) => {
        const zoom = Math.max(
          viewportLimits.minZoom,
          Math.min(
            viewportLimits.maxZoom,
            operationOptions.zoom ?? authoritativeViewport.zoom
          )
        )

        return performViewportOperation(
          {
            x: canvas.clientWidth / 2 - x * zoom,
            y: canvas.clientHeight / 2 - y * zoom,
            zoom,
          },
          operationOptions
        )
      },
      fitBounds: (bounds, fitOptions = {}) => {
        const target = paneViewportForBounds(bounds, fitOptions.padding)

        if (target === undefined) {
          return Promise.resolve({
            requestId: allocateViewportRequestId(),
            status: 'unavailable',
            viewport: authoritativeViewport,
          })
        }

        return performViewportOperation(target, fitOptions)
      },
      fitView: (fitOptions = {}): Promise<ViewportOperationResult> => {
        if (destroyed) {
          return Promise.resolve({
            requestId: allocateViewportRequestId(),
            status: 'disposed',
            viewport: authoritativeViewport,
          })
        }

        if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0) {
          return Promise.resolve({
            requestId: allocateViewportRequestId(),
            status: 'unavailable',
            viewport: authoritativeViewport,
          })
        }

        const nodeIds =
          fitOptions.nodes === 'selected'
            ? new Set(
                document.nodes
                  .filter((node) => node.selected === true)
                  .map((node) => node.id)
              )
            : undefined

        const fitted = fitViewportToNodes({
          document,
          nodeIds,
          measurements,
          positionOverrides: renderedNodePositions,
          currentViewport: authoritativeViewport,
          paneWidth: canvas.clientWidth,
          paneHeight: canvas.clientHeight,
          limits: viewportLimits,
          padding: fitOptions.padding,
          fallbackDimensions: fitOptions.fallbackDimensions ?? {
            width: 150,
            height: 44,
          },
        })

        return performViewportOperation(constrainViewport(fitted), fitOptions)
      },
      dispatch: (command): void => {
        if (destroyed) {
          return
        }

        const change = Effect.runSync(prepareFlowCommand(document, command))
        operations.publishChange(change)
        runTelemetry(
          Effect.logDebug('Dispatched flow command').pipe(
            Effect.annotateLogs({
              [FlowAttribute.changeKind]: change.kind,
            }),
            Effect.withSpan(FlowSpan.controllerDispatch, {
              attributes: {
                [FlowAttribute.changeKind]: change.kind,
              },
            })
          )
        )
      },
      subscribe: (listener): (() => void) => {
        listeners.add(listener)

        return () => listeners.delete(listener)
      },
      subscribeState: (listener): (() => void) => {
        if (destroyed) {
          return () => stateListeners.delete(listener)
        }

        stateListeners.add(listener)

        return () => stateListeners.delete(listener)
      },
      subscribeViewport: (listener): (() => void) => {
        if (destroyed) {
          return () => viewportListeners.delete(listener)
        }

        viewportListeners.add(listener)

        return () => viewportListeners.delete(listener)
      },
      update: (nextDocument): void => {
        if (destroyed) {
          return
        }

        const replacement = structuredClone(nextDocument)

        executeMutation(() => {
          const previous = document
          document = replacement
          operations.reconcile(document, previous)
          publishAcceptedState('document-update')
          runTelemetry(
            Effect.logDebug('Updated flow controller').pipe(
              Effect.annotateLogs({
                [FlowAttribute.controlMode]: documentMode,
                [FlowAttribute.nodeCount]: document.nodes.length,
              }),
              Effect.withSpan(FlowSpan.controllerUpdate, {
                attributes: {
                  [FlowAttribute.controlMode]: documentMode,
                  [FlowAttribute.nodeCount]: document.nodes.length,
                },
              })
            )
          )
        })
      },
      applyEdit: (transaction): Promise<FlowEditResult> =>
        controller.applyEditResolved(() => transaction),
      applyEditResolved: (resolveInput): Promise<FlowEditResult> => {
        const pending = Promise.withResolvers<FlowEditResult>()

        const { resolve, reject } = pending

        const rejectPending = (reason: Error): void => {
          pendingEditRejectors.delete(rejectPending)

          reject(reason)
        }

        const execute = (): void => {
          pendingEditRejectors.delete(rejectPending)

          if (destroyed) {
            reject(new Error('FlowControllerDisposed'))

            return
          }

          try {
            const transaction = resolveInput(
              createFlowSnapshot(document, authoritativeViewport).document
            )

            const result = Effect.runSync(
              prepareFlowEdit(document, transaction)
            )

            operations.publishChange({
              kind: 'edit-proposal',
              document: result.document,
              deletion: result.deletion,
            })
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }

        if (destroyed) {
          reject(new Error('FlowControllerDisposed'))
        } else if (mutationDepth > 0) {
          pendingEditRejectors.add(rejectPending)
          deferredMutations.push(execute)
        } else {
          execute()
        }

        return pending.promise
      },
      withMutation: executeMutation,
      updateViewport: (nextViewport): void => {
        if (destroyed) {
          return
        }

        if (activeViewportOperation !== undefined) {
          settleViewportOperation('superseded')
        }

        const replacement = structuredClone(nextViewport)

        executeMutation(() => {
          authoritativeViewport = constrainViewport(replacement)
          viewportObservationSource = 'programmatic'
          renderViewport(authoritativeViewport)
          viewportObservationSource = 'user'
          publishAcceptedState('viewport-update')
          runTelemetry(
            Effect.logDebug('Updated authoritative viewport').pipe(
              Effect.annotateLogs({
                [FlowAttribute.controlMode]: viewportMode,
                [FlowAttribute.viewportX]: authoritativeViewport.x,
                [FlowAttribute.viewportY]: authoritativeViewport.y,
                [FlowAttribute.viewportZoom]: authoritativeViewport.zoom,
              }),
              Effect.withSpan(FlowSpan.viewportUpdate, {
                attributes: {
                  [FlowAttribute.controlMode]: viewportMode,
                  [FlowAttribute.viewportX]: authoritativeViewport.x,
                  [FlowAttribute.viewportY]: authoritativeViewport.y,
                  [FlowAttribute.viewportZoom]: authoritativeViewport.zoom,
                },
              })
            )
          )
        })
      },
    }

    fitViewControlHandle.current = () => {
      controller.fitView()
    }

    return controller
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug('Mounted flow host').pipe(
        Effect.annotateLogs({
          [FlowAttribute.controlMode]: options.documentMode,
          [FlowAttribute.nodeCount]: initialDocument.nodes.length,
          [FlowAttribute.viewportX]: options.viewport.initial.x,
          [FlowAttribute.viewportY]: options.viewport.initial.y,
          [FlowAttribute.viewportZoom]: options.viewport.initial.zoom,
        })
      )
    ),
    Effect.withSpan(FlowSpan.hostMount, {
      attributes: {
        [FlowAttribute.controlMode]: options.documentMode,
        [FlowAttribute.nodeCount]: initialDocument.nodes.length,
        [FlowAttribute.viewportX]: options.viewport.initial.x,
        [FlowAttribute.viewportY]: options.viewport.initial.y,
        [FlowAttribute.viewportZoom]: options.viewport.initial.zoom,
      },
    })
  )
}

export const acquireFlowHost = (
  root: HTMLElement,
  initialDocument: FlowDocument,
  options: FlowHostOptions
) =>
  Effect.acquireRelease(
    createFlowHost(root, initialDocument, options),
    (host) => Effect.promise(() => host.destroyAsync())
  )

export const mountFlow = (
  root: HTMLElement,
  input: FlowDocumentInput,
  inputOptions: FlowMountOptionsInput
): JavaScriptFlowController => {
  const defaultEdgeOptions =
    inputOptions.defaultEdgeOptions === undefined
      ? undefined
      : Effect.runSync(
          decodeFlowDefaultEdgeOptions(inputOptions.defaultEdgeOptions)
        )

  const options = Effect.runSync(
    S.decodeUnknownEffect(FlowMountOptionsSchema)(inputOptions)
  )

  const document = Effect.runSync(decodeFlowDocument(input))

  const host = Effect.runSync(
    createFlowHost(root, document, {
      ...options,
      defaultEdgeOptions,
      onMoveStart: inputOptions.onMoveStart,
      onMove: inputOptions.onMove,
      onMoveEnd: inputOptions.onMoveEnd,
      onNodeDragStart: inputOptions.onNodeDragStart,
      onNodeDrag: inputOptions.onNodeDrag,
      onNodeDragStop: inputOptions.onNodeDragStop,
      onConnectStart: inputOptions.onConnectStart,
      onConnect: inputOptions.onConnect,
      onConnectEnd: inputOptions.onConnectEnd,
      onReconnectStart: inputOptions.onReconnectStart,
      onReconnect: inputOptions.onReconnect,
      onReconnectEnd: inputOptions.onReconnectEnd,
      onSelectionStart: inputOptions.onSelectionStart,
      onSelectionDrag: inputOptions.onSelectionDrag,
      onSelectionEnd: inputOptions.onSelectionEnd,
      onSelectionContextMenu: inputOptions.onSelectionContextMenu,
      onPaneClick: inputOptions.onPaneClick,
      onPaneDoubleClick: inputOptions.onPaneDoubleClick,
      onPaneContextMenu: inputOptions.onPaneContextMenu,
      onPaneMouseEnter: inputOptions.onPaneMouseEnter,
      onPaneMouseMove: inputOptions.onPaneMouseMove,
      onPaneMouseLeave: inputOptions.onPaneMouseLeave,
      onNodeClick: inputOptions.onNodeClick,
      onNodeDoubleClick: inputOptions.onNodeDoubleClick,
      onNodeContextMenu: inputOptions.onNodeContextMenu,
      onNodeMouseEnter: inputOptions.onNodeMouseEnter,
      onNodeMouseMove: inputOptions.onNodeMouseMove,
      onNodeMouseLeave: inputOptions.onNodeMouseLeave,
      onEdgeClick: inputOptions.onEdgeClick,
      onEdgeDoubleClick: inputOptions.onEdgeDoubleClick,
      onEdgeContextMenu: inputOptions.onEdgeContextMenu,
      onEdgeMouseEnter: inputOptions.onEdgeMouseEnter,
      onEdgeMouseMove: inputOptions.onEdgeMouseMove,
      onEdgeMouseLeave: inputOptions.onEdgeMouseLeave,
      onError: inputOptions.onError,
      isValidConnection: inputOptions.isValidConnection,
      connectionPreview: inputOptions.connectionPreview,
      nodeRenderers: inputOptions.nodeRenderers,
      edgeRenderers: inputOptions.edgeRenderers,
      onToolbarAnchors: inputOptions.onToolbarAnchors,
      panel: inputOptions.panel,
      panels: inputOptions.panels,
      toolbarContainers: inputOptions.toolbarContainers,
      runEffect: Effect.runSync,
    }).pipe(Effect.provide(FlowBrowserLive))
  )

  let deleteSequence = 0
  let controllerDisposed = false
  const pendingDeleteRejectors = new Set<(error: Error) => void>()

  const controller: JavaScriptFlowController = {
    overlayPortal: host.overlayPortal,
    mountViewportPortal: host.mountViewportPortal,
    getConnectionPreview: host.getConnectionPreview,
    subscribeConnectionPreview: host.subscribeConnectionPreview,
    subscribeSelection: host.subscribeSelection,
    observeKeyPress: host.observeKeyPress,
    getSnapshot: host.getSnapshot,
    getVersionedSavedSession: host.getVersionedSavedSession,
    prepareVersionedRestore: host.prepareVersionedRestore,
    getSavedSession: host.getSavedSession,
    prepareRestore: host.prepareRestore,
    getNodes: host.getNodes,
    getEdges: host.getEdges,
    getNode: host.getNode,
    getNodesData: host.getNodesData,
    getNodeConnections: host.getNodeConnections,
    observeNodeConnections: host.observeNodeConnections,
    observeHandleConnections: host.observeHandleConnections,
    getHandleConnections: host.getHandleConnections,
    getInternalNode: host.getInternalNode,
    nodesInitialized: host.nodesInitialized,
    updateNodeInternals: host.updateNodeInternals,
    getEdge: host.getEdge,
    getViewport: host.getViewport,
    getViewportLimits: host.getViewportLimits,
    getZoom: host.getZoom,
    get viewportInitialized() {
      return host.viewportInitialized
    },
    screenToFlowPosition: (position) =>
      host.screenToFlowPosition(
        Effect.runSync(S.decodeUnknownEffect(XYPositionSchema)(position))
      ),
    flowToScreenPosition: (position) =>
      host.flowToScreenPosition(
        Effect.runSync(S.decodeUnknownEffect(XYPositionSchema)(position))
      ),
    getViewportForBounds: (bounds, fitOptions) =>
      host.getViewportForBounds(
        Effect.runSync(S.decodeUnknownEffect(ViewportBoundsSchema)(bounds)),
        Effect.runSync(
          S.decodeUnknownEffect(FitBoundsOptionsSchema)(fitOptions ?? {})
        )
      ),
    setViewport: (viewport, fitOptions) =>
      host.setViewport(
        Effect.runSync(S.decodeUnknownEffect(ViewportSchema)(viewport)),
        Effect.runSync(
          S.decodeUnknownEffect(FitBoundsOptionsSchema)(fitOptions ?? {})
        )
      ),
    zoomIn: (fitOptions) =>
      host.zoomIn(
        Effect.runSync(
          S.decodeUnknownEffect(FitBoundsOptionsSchema)(fitOptions ?? {})
        )
      ),
    zoomOut: (fitOptions) =>
      host.zoomOut(
        Effect.runSync(
          S.decodeUnknownEffect(FitBoundsOptionsSchema)(fitOptions ?? {})
        )
      ),
    zoomTo: (zoom, fitOptions) =>
      host.zoomTo(
        Effect.runSync(S.decodeUnknownEffect(S.Finite)(zoom)),
        Effect.runSync(
          S.decodeUnknownEffect(FitBoundsOptionsSchema)(fitOptions ?? {})
        )
      ),
    setCenter: (x, y, fitOptions) => {
      const decoded = Effect.runSync(
        S.decodeUnknownEffect(SetCenterOptionsSchema)(fitOptions ?? {})
      )

      const normalized: SetCenterOptions = {}

      if (decoded.duration !== undefined) {
        normalized.duration = decoded.duration
      }

      if (decoded.easing !== undefined) {
        normalized.easing = decoded.easing
      }

      if (decoded.zoom !== undefined) {
        normalized.zoom = decoded.zoom
      }

      return host.setCenter(
        Effect.runSync(S.decodeUnknownEffect(S.Finite)(x)),
        Effect.runSync(S.decodeUnknownEffect(S.Finite)(y)),
        normalized
      )
    },
    fitBounds: (bounds, fitOptions) =>
      host.fitBounds(
        Effect.runSync(S.decodeUnknownEffect(ViewportBoundsSchema)(bounds)),
        Effect.runSync(
          S.decodeUnknownEffect(FitBoundsOptionsSchema)(fitOptions ?? {})
        )
      ),
    destroy: (): void => {
      controllerDisposed = true

      for (const reject of pendingDeleteRejectors) {
        reject(new Error('FlowControllerDisposed'))
      }

      host.destroy()
    },
    destroyAsync: (): Promise<void> => {
      controllerDisposed = true

      for (const reject of pendingDeleteRejectors) {
        reject(new Error('FlowControllerDisposed'))
      }

      return host.destroyAsync()
    },
    setNodes: (nodes) =>
      isNodeUpdater(nodes)
        ? host.applyEditResolved((currentDocument) => ({
            operations: [
              { kind: 'set-nodes', nodes: nodes(currentDocument.nodes) },
            ],
          }))
        : host.applyEdit({ operations: [{ kind: 'set-nodes', nodes }] }),
    addNodes: (nodes) =>
      host.applyEdit({
        operations: [
          {
            kind: 'add-nodes',
            nodes: Array.isArray(nodes) ? nodes : [nodes],
          },
        ],
      }),
    setEdges: (edges) =>
      isEdgeUpdater(edges)
        ? host.applyEditResolved((currentDocument) => ({
            operations: [
              { kind: 'set-edges', edges: edges(currentDocument.edges) },
            ],
          }))
        : host.applyEdit({ operations: [{ kind: 'set-edges', edges }] }),
    addEdges: (edges) =>
      host.applyEdit({
        operations: [
          {
            kind: 'add-edges',
            edges: Array.isArray(edges) ? edges : [edges],
          },
        ],
      }),
    updateNode: (id, patch, updateOptions) =>
      host.applyEditResolved((currentDocument) => {
        const node = currentDocument.nodes.find(
          (candidate) => candidate.id === id
        )

        if (node === undefined) {
          return { operations: [] }
        }

        const resolvedPatch = isNodePatchUpdater(patch) ? patch(node) : patch

        return {
          operations: [
            {
              kind: 'update-node',
              nodeId: id,
              patch: decodeJsonPatch(resolvedPatch),
              replace: updateOptions?.replace,
            },
          ],
        }
      }),
    updateNodeData: (id, data, updateOptions) =>
      host.applyEditResolved((currentDocument) => {
        const node = currentDocument.nodes.find(
          (candidate) => candidate.id === id
        )

        if (node === undefined) {
          return { operations: [] }
        }

        const resolvedData = isNodeDataUpdater(data)
          ? data(node.data ?? {})
          : data

        return {
          operations: [
            {
              kind: 'update-node-data',
              nodeId: id,
              data: resolvedData,
              replace: updateOptions?.replace,
            },
          ],
        }
      }),
    updateEdge: (id, patch, updateOptions) =>
      host.applyEditResolved((currentDocument) => {
        const edge = currentDocument.edges.find(
          (candidate) => candidate.id === id
        )

        if (edge === undefined) {
          return { operations: [] }
        }

        const resolvedPatch = isEdgePatchUpdater(patch) ? patch(edge) : patch

        return {
          operations: [
            {
              kind: 'update-edge',
              edgeId: id,
              patch: decodeJsonPatch(resolvedPatch),
              replace: updateOptions?.replace,
            },
          ],
        }
      }),
    updateEdgeData: (id, data, updateOptions) =>
      host.applyEditResolved((currentDocument) => {
        const edge = currentDocument.edges.find(
          (candidate) => candidate.id === id
        )

        if (edge === undefined) {
          return { operations: [] }
        }

        const resolvedData = isEdgeDataUpdater(data)
          ? data(edge.data ?? {})
          : data

        return {
          operations: [
            {
              kind: 'update-edge-data',
              edgeId: id,
              data: resolvedData,
              replace: updateOptions?.replace,
            },
          ],
        }
      }),
    // eslint-disable-next-line complexity -- one boundary owns approval, revision, lifecycle, and publication checks.
    deleteElements: async (request, lifecycle) => {
      deleteSequence += 1
      const operationId = `vanilla-delete-${deleteSequence}`

      if (controllerDisposed) {
        throw new Error('FlowControllerDisposed')
      }

      if (
        pendingDeleteRejectors.size > 0 &&
        lifecycle?.onBeforeDelete !== undefined
      ) {
        throw new FlowDeleteInProgress({ operationId })
      }

      const captured = host.getSnapshot().document
      const capturedRevision = host.getDocumentRevision()

      const isCapturedRevisionCurrent = (): boolean =>
        host.getDocumentRevision() === capturedRevision

      const assertDeleteCanPublish = (
        hooks: FlowDeleteLifecycleOptions | undefined
      ): void => {
        if (controllerDisposed) {
          throw new Error('FlowControllerDisposed')
        }

        if (hooks?.signal?.aborted) {
          throw new FlowDeleteCancelled({ operationId })
        }

        if (
          hooks?.onBeforeDelete !== undefined &&
          !isCapturedRevisionCurrent()
        ) {
          throw new FlowDeleteRevisionConflict({
            operationId,
            expectedRevision: capturedRevision,
            actualRevision: host.getDocumentRevision(),
          })
        }
      }

      const assertDeleteNotCancelled = (
        hooks: FlowDeleteLifecycleOptions | undefined
      ): void => {
        if (hooks?.signal?.aborted) {
          throw new FlowDeleteCancelled({ operationId })
        }
      }

      const notifyDeleteCandidate = (
        candidate: {
          readonly nodes: readonly FlowNode[]
          readonly edges: readonly FlowEdge[]
        },
        hooks: FlowDeleteLifecycleOptions | undefined
      ): Error | undefined => {
        try {
          if (candidate.edges.length > 0) {
            hooks?.onEdgesDelete?.(candidate.edges)
          }

          assertDeleteNotCancelled(hooks)

          if (candidate.nodes.length > 0) {
            hooks?.onNodesDelete?.(candidate.nodes)
          }

          assertDeleteNotCancelled(hooks)
          hooks?.onDelete?.(candidate)
          assertDeleteNotCancelled(hooks)

          return undefined
        } catch (error) {
          return error instanceof Error ? error : new Error(String(error))
        }
      }

      const publishDeleteCandidate = (
        candidate: {
          readonly nodes: readonly FlowNode[]
          readonly edges: readonly FlowEdge[]
        },
        hooks: FlowDeleteLifecycleOptions | undefined
      ): Promise<FlowEditResult> => {
        const pending = Promise.withResolvers<FlowEditResult>()

        interface DeleteCallbackOutcome {
          failure: Error | undefined
          ready: boolean
        }

        host.withMutation(() => {
          try {
            assertDeleteCanPublish(hooks)

            const callbackOutcome: DeleteCallbackOutcome = {
              failure: undefined,
              ready: false,
            }

            const result = host.applyEditResolved(() => {
              if (callbackOutcome.failure !== undefined) {
                throw callbackOutcome.failure
              }

              if (!callbackOutcome.ready) {
                throw new FlowDeleteCancelled({ operationId })
              }

              assertDeleteCanPublish(hooks)

              return {
                operations: [
                  {
                    kind: 'delete-elements',
                    nodeIds: candidate.nodes.map(({ id }) => id),
                    edgeIds: candidate.edges.map(({ id }) => id),
                  },
                ],
              }
            })

            callbackOutcome.failure = notifyDeleteCandidate(candidate, hooks)
            callbackOutcome.ready = callbackOutcome.failure === undefined

            const settle = async (): Promise<void> => {
              try {
                pending.resolve(await result)
              } catch (error) {
                pending.reject(error)
              }
            }

            void settle()
          } catch (error) {
            pending.reject(error)
          }
        })

        return pending.promise
      }

      const prepared = Effect.runSync(
        prepareFlowDeleteCandidate(captured, request)
      )

      const eligible = prepared.candidate

      if (eligible.nodes.length === 0 && eligible.edges.length === 0) {
        return prepared.result.deletion
      }

      if (lifecycle?.signal?.aborted) {
        throw new FlowDeleteCancelled({ operationId })
      }

      let decision: FlowDeleteDecision = true

      if (lifecycle?.onBeforeDelete !== undefined) {
        const pending = Promise.withResolvers<FlowDeleteResult>()
        let settled = false

        const settlePending = (
          outcome:
            | { readonly kind: 'rejected'; readonly error: Error }
            | { readonly kind: 'resolved'; readonly result: FlowDeleteResult }
        ): void => {
          if (settled) {
            return
          }

          settled = true
          // eslint-disable-next-line no-use-before-define -- All settlement outcomes unregister the same approval rejector.
          pendingDeleteRejectors.delete(rejectPending)
          // eslint-disable-next-line no-use-before-define -- The signal listener is removed through the shared settlement path.
          lifecycle.signal?.removeEventListener('abort', onAbort)

          if (outcome.kind === 'rejected') {
            pending.reject(outcome.error)
          } else {
            pending.resolve(outcome.result)
          }
        }

        const rejectPending = (error: Error): void => {
          settlePending({ kind: 'rejected', error })
        }

        const onAbort = (): void => {
          rejectPending(new FlowDeleteCancelled({ operationId }))
        }

        pendingDeleteRejectors.add(rejectPending)
        lifecycle.signal?.addEventListener('abort', onAbort, { once: true })
        // eslint-disable-next-line complexity -- asynchronous approval is isolated from publication.
        void (async () => {
          try {
            const { onBeforeDelete } = lifecycle

            if (onBeforeDelete === undefined) {
              throw new Error('FlowDeleteBeforeDeleteUnavailable')
            }

            decision = await onBeforeDelete(structuredClone(eligible))

            if (settled) {
              return
            }

            if (controllerDisposed) {
              throw new Error('FlowControllerDisposed')
            }

            if (lifecycle.signal?.aborted) {
              throw new FlowDeleteCancelled({ operationId })
            }

            if (!isCapturedRevisionCurrent()) {
              throw new FlowDeleteRevisionConflict({
                operationId,
                expectedRevision: capturedRevision,
                actualRevision: host.getDocumentRevision(),
              })
            }

            const finalized = Effect.runSync(
              finalizeFlowDeleteCandidate(
                captured,
                eligible,
                decision,
                operationId
              )
            )

            const candidate = {
              nodes: captured.nodes.filter(({ id }) =>
                finalized.deletion.deletedNodeIds.includes(id)
              ),
              edges: captured.edges.filter(({ id }) =>
                finalized.deletion.deletedEdgeIds.includes(id)
              ),
            }

            if (candidate.nodes.length > 0 || candidate.edges.length > 0) {
              const result = await publishDeleteCandidate(candidate, lifecycle)

              if (settled) {
                return
              }

              settlePending({ kind: 'resolved', result: result.deletion })

              return
            }

            settlePending({
              kind: 'resolved',
              result: { deletedNodeIds: [], deletedEdgeIds: [] },
            })
          } catch (error) {
            rejectPending(
              error instanceof FlowDeleteInvalidCandidate ||
                error instanceof FlowDeleteRevisionConflict ||
                error instanceof FlowDeleteCancelled ||
                error instanceof FlowDeleteInProgress ||
                error instanceof FlowDeleteApprovalFailed
                ? error
                : new FlowDeleteApprovalFailed({
                    operationId,
                    reason:
                      error instanceof Error ? error.message : String(error),
                  })
            )
          }
        })()

        return pending.promise
      }

      const finalized = Effect.runSync(
        finalizeFlowDeleteCandidate(captured, eligible, decision, operationId)
      )

      const candidate = {
        nodes: captured.nodes.filter(({ id }) =>
          finalized.deletion.deletedNodeIds.includes(id)
        ),
        edges: captured.edges.filter(({ id }) =>
          finalized.deletion.deletedEdgeIds.includes(id)
        ),
      }

      if (candidate.nodes.length === 0 && candidate.edges.length === 0) {
        return finalized.deletion
      }

      const result = await publishDeleteCandidate(candidate, lifecycle)

      return result.deletion
    },
    applyEdit: (transaction) => host.applyEdit(transaction),
    fitView: (fitOptions) =>
      host.fitView(
        Effect.runSync(
          S.decodeUnknownEffect(FitViewOptionsSchema)(fitOptions ?? {})
        )
      ),
    dispatch: (commandInput): void => {
      host.dispatch(
        Effect.runSync(S.decodeUnknownEffect(FlowCommandSchema)(commandInput))
      )
    },
    subscribe: host.subscribe,
    subscribeState: host.subscribeState,
    subscribeViewport: host.subscribeViewport,
    update: (nextInput): void => {
      host.update(Effect.runSync(decodeFlowDocument(nextInput)))
    },
    updateViewport: (viewportInput): void => {
      host.updateViewport(
        Effect.runSync(S.decodeUnknownEffect(ViewportSchema)(viewportInput))
      )
    },
  }

  try {
    inputOptions.onInit?.(controller)
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error))

    if (inputOptions.onError === undefined) {
      throw failure
    }

    inputOptions.onError(failure)
  }

  return controller
}

/** Promise-based JavaScript entry point. Controller methods remain synchronous. */
export const createFlow = (
  root: HTMLElement,
  input: FlowDocumentInput,
  inputOptions: FlowCreateOptions
): Promise<JavaScriptFlowController> => {
  const { onChange, ...mountOptions } = inputOptions

  return Promise.resolve().then(() => {
    const controller = mountFlow(root, input, mountOptions)

    const unsubscribe =
      onChange === undefined ? undefined : controller.subscribe(onChange)

    return {
      ...controller,
      get viewportInitialized() {
        return controller.viewportInitialized
      },
      destroy: (): void => {
        unsubscribe?.()
        controller.destroy()
      },
      destroyAsync: (): Promise<void> => {
        unsubscribe?.()

        return controller.destroyAsync()
      },
    }
  })
}
