import {
  FlowNodeSchema,
  FlowEdgeSchema,
  MeasuredNodeSchema,
  FlowAttribute,
  FlowCommandSchema,
  HandleIdSchema,
  NodeIdSchema,
  FlowSnapshotSchema,
  FlowDocumentSchema,
  FlowControlModeSchema,
  FitViewNodeDimensionsSchema,
  FlowFitViewOptionsSchema,
  resolveFitViewNodeIds,
  FlowAriaLabelTextConfigSchema,
  FlowPanelPositionSchema,
  NodeResizeDirectionSchema,
  FlowSnapGridInputSchema,
  FlowExtentInputSchema,
  FlowColorModeSchema,
  FlowZIndexModeSchema,
  NodeDragThresholdSchema,
  decodeNodeDragThreshold,
  nodeDragActivated,
  nodeTopLeftToAnchor,
  nodeAnchorToTopLeft,
  resolveNodeOrigin,
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
  decodeInitialViewport,
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
  projectFlowInternalNode,
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
  FlowConnectionLineTypeSchema,
  flowConnectionLineProps,
  flowNodeRendererProps,
  sameFlowNodeRendererProps,
  flowChangeElementChanges,
  flowConnectionState,
  flowFinalConnectionState,
  flowNoConnection,
  handleGestureConnectable,
  isEdgeSelectable,
  isHandleConnectable,
  isNodeDraggable,
  isNodeSelectable,
  flowStyleDeclarations,
  resolveFlowInteractivity,
  flowNodeHandles,
  computeFlowStacking,
  calculateFlowExpandParent,
  applyFlowChangeToDocument,
  startFlowNodeResize,
  stepFlowNodeResize,
  snapPosition,
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
  FlowColorMode,
  FlowZIndexMode,
  FlowAriaLabelConfigInput,
  FlowAriaLabelConfig,
  FlowPanelPosition,
  FlowNodeResizeSession,
  FlowNodeResizeStart,
  FlowExpandParentChild,
  FlowRect,
  FlowResizeParams,
  FlowResizeParamsWithDirection,
  FlowResizeControlPosition,
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
  FlowConnectionLineProps,
  FlowConnectionLineType,
  FlowEdgeRendererProps,
  FlowGraphView,
  FlowNodeRendererProps,
  FlowConnectionState,
  FlowInteractivity,
  FlowInteractivityInput,
} from '@flow/core'
import {
  Cause,
  Effect,
  Exit,
  Predicate,
  Result,
  Schema as S,
  Scope,
} from 'effect'

import {
  createA11yDescriptions,
  resolveVanillaAriaLabels,
} from './aria-labels.ts'
import type { FlowResolvedAriaLabels } from './aria-labels.ts'
import {
  CanvasInteractionOptionsSchema,
  bindCanvasKeys,
  focusPanDelta,
  allowsCanvasWheel,
  noGestureSelector,
  reconnectableEdge,
} from './canvas-interaction-options.ts'
import type { CanvasInteractionOptions } from './canvas-interaction-options.ts'
import { createCanvasUI } from './canvas-ui.ts'
import { bindFlowColorMode } from './color-mode.ts'
import { createEdgeRenderer, measureNodeHandles } from './edge-renderer.ts'
import { FlowBrowser, FlowBrowserLive } from './flow-browser.ts'
import type {
  FlowConnectionEndDetails,
  FlowEdgesChangeListener,
  FlowNodesChangeListener,
  FlowReconnectDetails,
} from './flow-changes.ts'
import { createFlowGraphCache } from './flow-graph-cache.ts'
import { createFlowInstanceApi } from './instance-api.ts'
import type { FlowInstanceApi } from './instance-api.ts'
import { isInputDOMNode, observeKeyPress } from './key-press-observer.ts'
import type { FlowKeyCode, FlowKeyPressOptions } from './key-press-observer.ts'
import { createMeasuredDimensionsTracker } from './measured-dimensions.ts'
import { applyFlowStyle, applyNodePresentation } from './presentation.ts'
import { renderRegisteredResizeControls } from './resize-controls.ts'
import type {
  FlowNodeResizerHandle,
  FlowNodeResizerRegistration,
} from './resize-controls.ts'

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

const ignoreNodeChanges = (): void => undefined

const neverHeld = (): boolean => false

const ignoreCallbackFailure = (): void => undefined

const rethrowFailure = (error: Error): void => {
  throw error
}

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
  ...CanvasInteractionOptionsSchema.fields,
  documentMode: FlowControlModeSchema,
  connectionDragThreshold: S.optional(ConnectionDragThresholdSchema),
  nodeDragThreshold: S.optional(NodeDragThresholdSchema),
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
  nodesDraggable: S.optional(S.Boolean),
  elementsSelectable: S.optional(S.Boolean),
  /** React Flow `NodeResizer`: resize controls on selected nodes. Off by default. */
  nodesResizable: S.optional(S.Boolean),
  panOnScroll: S.optional(S.Boolean),
  panOnScrollSpeed: S.optional(S.Finite.check(S.isGreaterThan(0))),
  panOnScrollMode: S.optional(S.Literals(['free', 'horizontal', 'vertical'])),
  zoomOnScroll: S.optional(S.Boolean),
  zoomOnDoubleClick: S.optional(S.Boolean),
  zoomOnPinch: S.optional(S.Boolean),
  keyboardActivation: S.optional(S.Boolean),
  connectionMode: S.optional(ConnectionModeSchema),
  connectionLineType: S.optional(FlowConnectionLineTypeSchema),
  autoPanOnConnect: S.optional(S.Boolean),
  /** The `{ x, y }` record or React's `[x, y]` tuple. */
  snapGrid: S.optional(FlowSnapGridInputSchema),
  /** React `snapToGrid`: `false` ignores `snapGrid`; `true` alone snaps to 15x15. */
  snapToGrid: S.optional(S.Boolean),
  connectionRadius: S.optional(ConnectionRadiusSchema),
  /** The `{ minX, … }` record or React's `[[minX, minY], [maxX, maxY]]`. */
  nodeExtent: S.optional(FlowExtentInputSchema),
  /** React `translateExtent`; overrides `viewport.extent` when both are set. */
  translateExtent: S.optional(FlowExtentInputSchema),
  renderOnlyVisible: S.optional(S.Boolean),
  defaultEdgeOptions: S.optional(FlowDefaultEdgeOptionsSchema),
  /** React `defaultMarkerColor`: markers without a color and edge stroke use it. */
  defaultMarkerColor: S.optional(S.NonEmptyString),
  selectionMode: S.optional(SelectionModeSchema),
  /** React `colorMode`; defaults to `light`. */
  colorMode: S.optional(FlowColorModeSchema),
  /** React `zIndexMode`; defaults to `basic`. */
  zIndexMode: S.optional(FlowZIndexModeSchema),
  elevateNodesOnSelect: S.optional(S.Boolean),
  elevateEdgesOnSelect: S.optional(S.Boolean),
  /** React `nodesFocusable`: the default for nodes without `focusable`. */
  nodesFocusable: S.optional(S.Boolean),
  /** React `edgesFocusable`: the default for edges without `focusable`. */
  edgesFocusable: S.optional(S.Boolean),
  /** React `fitView`: fit once every visible node is measured. */
  fitView: S.optional(S.Boolean),
  background: S.optional(CanvasBackgroundSchema),
  ui: S.optional(CanvasUISchema),
  viewport: S.Struct({
    extent: S.optional(FlowExtentInputSchema),
    initial: S.Struct({ ...ViewportSchema.fields, zoom: S.Finite }),
    limits: ViewportLimitsSchema,
    mode: FlowControlModeSchema,
  }),
})

/** React `PanelPosition`, including `center-left` and `center-right`. */
export type CanvasPanelPlacement = FlowPanelPosition

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

const isCanvasPanelPlacement = (
  value: unknown
): value is CanvasPanelPlacement => S.is(FlowPanelPositionSchema)(value)

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

/**
 * React `FitViewOptions` (`FlowFitViewOptionsSchema`: `nodes` as `all`,
 * `selected` or `{ id }` items, `includeHiddenNodes`, `minZoom`, `maxZoom`)
 * plus Vanilla's `fallbackDimensions` for unmeasured nodes.
 */
export const FitViewOptionsSchema = S.Struct({
  ...FlowFitViewOptionsSchema.fields,
  fallbackDimensions: S.optional(FitViewNodeDimensionsSchema),
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

/**
 * Group drag payload, React Flow's `SelectionDragHandler`: `nodes` are the
 * dragged selected nodes at their drag positions.
 */
export type FlowSelectionDragPayload = FlowNodeDragPayload & {
  readonly nodes: readonly FlowNode[]
}

export type FlowSelectionDragStopPayload = FlowNodeDragStopPayload & {
  readonly nodes: readonly FlowNode[]
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
  readonly event: MouseEvent
  readonly nodeIds: readonly string[]
  readonly edgeIds: readonly string[]
  readonly position: XYPosition
}

export interface FlowCanvasEventPayload {
  readonly event: MouseEvent
  readonly position: XYPosition
  readonly nodeId?: string | undefined
  readonly edgeId?: string | undefined
}

export interface FlowPaneScrollPayload extends FlowCanvasEventPayload {
  readonly event: WheelEvent
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

/**
 * Draws a custom connection preview. `line` carries React Flow style
 * ConnectionLineComponentProps once the origin handle resolves.
 */
export type FlowConnectionPreviewRenderer = (
  preview: ConnectionPreviewState | null,
  container: SVGSVGElement,
  line: FlowConnectionLineProps | null
) => void

export interface FlowNodeRendererInstance {
  /**
   * Runs when the node changes in the document. `props` carries React Flow
   * style NodeProps such as `selected`. It does not run for position-only
   * changes such as drag frames, so renderers that rebuild their DOM here keep
   * focus and input state during a drag.
   */
  readonly update: (node: FlowNode, props: FlowNodeRendererProps) => void
  /**
   * Opt-in: runs with fresh NodeProps whenever they change between document
   * updates, such as `dragging` and `positionAbsoluteX/Y` on every drag frame.
   * Keep it cheap and avoid rebuilding DOM here.
   */
  readonly updateProps?: ((props: FlowNodeRendererProps) => void) | undefined
  readonly destroy: () => void
}

export type FlowNodeRenderer = (
  node: FlowNode,
  content: HTMLElement,
  props: FlowNodeRendererProps
) => FlowNodeRendererInstance

/** Endpoint geometry a custom edge `geometry` hook receives. */
export interface FlowEdgeRenderEndpoints {
  readonly source: XYPosition
  readonly target: XYPosition
  readonly sourceSide: FlowHandle['side']
  readonly targetSide: FlowHandle['side']
}

/**
 * Custom edge render context: endpoint geometry, the resolved path, and React
 * Flow style EdgeProps in `props` (pass them to `getBezierPath` and friends).
 * `edgeLabelRenderer` is a per-canvas HTML layer in flow coordinates above
 * the edges that follows pan and zoom, like React Flow's `<EdgeLabelRenderer />`.
 */
export interface FlowEdgeRenderContext extends FlowEdgeRenderEndpoints {
  readonly pathData: string
  readonly labelAnchor: XYPosition
  readonly props: FlowEdgeRendererProps
  readonly edgeLabelRenderer: HTMLElement
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
  /** Runs when the edge or its endpoints change outside a drag frame. */
  readonly update: (edge: FlowEdge, context: FlowEdgeRenderContext) => void
  /**
   * Opt-in: runs with fresh EdgeProps when they change on a position-only
   * pass, such as every frame of a node drag, so `getBezierPath(props)`
   * edges follow the dragged node. `update` does not run on those passes.
   */
  readonly updateProps?:
    | ((props: FlowEdgeRendererProps, context: FlowEdgeRenderContext) => void)
    | undefined
  /**
   * The SVG path the host hit target follows, for edges drawn away from the
   * handle route, such as floating edges. Without it the host uses the
   * `createFlowBaseEdge` interaction path drawn in the visual, then the
   * handle route.
   */
  readonly interactionPath?: (() => string | undefined) | undefined
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
    endpoints: FlowEdgeRenderEndpoints
  ) => { readonly pathData: string; readonly labelAnchor: XYPosition }
  readonly render?: (
    edge: FlowEdge,
    context: FlowEdgeRenderContext,
    visual: SVGGElement
  ) => FlowEdgeRendererInstance
}

export interface FlowHostOptions extends CanvasInteractionOptions {
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
  readonly nodesDraggable?: boolean | undefined
  readonly elementsSelectable?: boolean | undefined
  /** React Flow `NodeResizer`: resize controls on selected nodes. Off by default. */
  readonly nodesResizable?: boolean | undefined
  readonly onNodesChange?: FlowNodesChangeListener | undefined
  readonly onEdgesChange?: FlowEdgesChangeListener | undefined
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
  readonly onClickConnectStart?:
    | ((connection: FlowConnectStartPayload) => void)
    | undefined
  readonly onConnect?:
    | ((connection: FlowConnectionCandidate) => void)
    | undefined
  /** The end payload, then React Flow's final connection state and release. */
  readonly onConnectEnd?:
    | ((
        connection: FlowConnectEndPayload,
        details: FlowConnectionEndDetails
      ) => void)
    | undefined
  readonly onClickConnectEnd?:
    | ((
        connection: FlowConnectEndPayload,
        details: FlowConnectionEndDetails
      ) => void)
    | undefined
  readonly onReconnectStart?:
    | ((reconnect: FlowReconnectStartPayload) => void)
    | undefined
  readonly onReconnect?:
    | ((reconnect: FlowEdge, details: FlowReconnectDetails) => void)
    | undefined
  readonly onReconnectEnd?:
    | ((
        reconnect: FlowReconnectEndPayload,
        details: FlowConnectionEndDetails
      ) => void)
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
  readonly onPaneScroll?: ((payload: FlowPaneScrollPayload) => void) | undefined
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
  /** Built-in connection line path; unset keeps the straight preview line. */
  readonly connectionLineType?: FlowConnectionLineType | undefined
  readonly autoPanOnConnect?: boolean | undefined
  readonly snapToGrid?: boolean | undefined
  readonly snapGrid?: SnapGrid | undefined
  readonly connectionRadius?: ConnectionRadius | undefined
  readonly isValidConnection?: FlowConnectionValidator | undefined
  readonly connectionPreview?: FlowConnectionPreviewRenderer | undefined
  readonly nodeExtent?: NodeExtent | undefined
  readonly renderOnlyVisible?: boolean | undefined
  readonly selectionMode?: SelectionMode | undefined
  readonly defaultEdgeOptions?: FlowDefaultEdgeOptions | undefined
  readonly defaultMarkerColor?: string | undefined
  readonly colorMode?: FlowColorMode | undefined
  readonly zIndexMode?: FlowZIndexMode | undefined
  readonly elevateNodesOnSelect?: boolean | undefined
  readonly elevateEdgesOnSelect?: boolean | undefined
  readonly nodesFocusable?: boolean | undefined
  readonly edgesFocusable?: boolean | undefined
  /** Partial React `ariaLabelConfig`; unset entries keep Vanilla's labels. */
  readonly ariaLabelConfig?: FlowAriaLabelConfigInput | undefined
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
  /** Style each host-owned handle without querying canvas DOM. */
  readonly onHandleRender?:
    | ((node: FlowNode, handle: FlowHandle, element: HTMLButtonElement) => void)
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
  (Array.isArray(option) ? option.includes(button) : button <= 1)

const panModifierPressed = (
  options: FlowHostOptions,
  event: Pick<PointerEvent, 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'>
): boolean =>
  options.panActivationModifier !== undefined &&
  options.panActivationModifier !== 'none' &&
  isActivationModifierPressed(event, options.panActivationModifier)

const isPanePanEnabled = (
  options: FlowHostOptions,
  event: PointerEvent
): boolean =>
  panModifierPressed(options, event) ||
  (event.pointerType === 'touch'
    ? options.panOnDrag !== false
    : isPanButtonEnabled(options.panOnDrag, event.button))

const isSelectionActivationEnabled = (
  options: FlowHostOptions,
  event: PointerEvent,
  selectionHeld: boolean
): boolean => {
  const keyHeld =
    options.selectionKeyCode === undefined
      ? selectionHeld ||
        isActivationModifierPressed(
          event,
          options.selectionActivationModifier ?? 'shift'
        )
      : selectionHeld

  return (
    keyHeld ||
    (options.selectionOnDrag === true &&
      (options.panOnDrag ?? true) !== true &&
      !panModifierPressed(options, event) &&
      !(event.pointerType === 'touch' && options.panOnDrag !== false))
  )
}

/** Runtime canvas settings share the mount boundary's schemas and defaults. */
export const FlowCanvasOptionsSchema = S.Struct({
  snapGrid: FlowMountOptionsSchema.fields.snapGrid,
  snapToGrid: FlowMountOptionsSchema.fields.snapToGrid,
  panOnScroll: FlowMountOptionsSchema.fields.panOnScroll,
  panOnScrollSpeed: FlowMountOptionsSchema.fields.panOnScrollSpeed,
  panOnScrollMode: FlowMountOptionsSchema.fields.panOnScrollMode,
  zoomOnScroll: FlowMountOptionsSchema.fields.zoomOnScroll,
  zoomOnPinch: FlowMountOptionsSchema.fields.zoomOnPinch,
  zoomOnDoubleClick: FlowMountOptionsSchema.fields.zoomOnDoubleClick,
  renderOnlyVisible: FlowMountOptionsSchema.fields.renderOnlyVisible,
  preventScrolling: FlowMountOptionsSchema.fields.preventScrolling,
})

export type FlowCanvasOptionsInput = typeof FlowCanvasOptionsSchema.Encoded

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
  /** The resolved `ariaLabelConfig`, for UI components mounted on this canvas. */
  readonly getAriaLabelConfig: () => FlowAriaLabelConfig
  /** React `colorMode`: the configured mode and the class it resolved to. */
  readonly getColorMode: () => {
    readonly mode: FlowColorMode
    readonly resolved: 'light' | 'dark'
  }
  readonly setColorMode: (mode: FlowColorMode) => void
  /** Update canvas settings without replacing the host or interrupting gestures. */
  readonly setCanvasOptions: (next: FlowCanvasOptionsInput) => void
  /**
   * Stored positions as currently drawn: drag and resize previews override
   * the accepted ones (parent-relative anchors, like `node.position`).
   */
  readonly getRenderedNodePositions: () => ReadonlyMap<string, XYPosition>
  /** Called after every drawn position frame, including drag previews. */
  readonly subscribeRenderedPositions: (listener: () => void) => () => void
  /**
   * Render resize controls in one node and drive them with the core resizer
   * session. `createFlowNodeResizer`/`createFlowNodeResizeControl` call it.
   */
  readonly registerNodeResizer: (
    nodeId: string,
    registration: FlowNodeResizerRegistration
  ) => FlowNodeResizerHandle
  /** Mount caller-owned content in graph coordinates inside this canvas viewport. */
  readonly mountViewportPortal: (element: HTMLElement) => () => void
  readonly getConnectionPreview: () => ConnectionPreviewSnapshot
  readonly subscribeConnectionPreview: (
    listener: (preview: ConnectionPreviewSnapshot) => void
  ) => () => void
  /** React Flow `useConnection` state for the current connection gesture. */
  readonly getConnection: () => FlowConnectionState
  readonly subscribeConnection: (
    listener: (state: FlowConnectionState) => void
  ) => () => void
  /** Current `nodesDraggable`, `nodesConnectable` and `elementsSelectable`. */
  readonly getInteractivity: () => FlowInteractivity
  /** Change interaction switches at runtime; unset fields keep their value. */
  readonly setInteractivity: (next: FlowInteractivityInput) => void
  readonly subscribeInteractivity: (
    listener: (interactivity: FlowInteractivity) => void
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
  /** React `fitViewOptions` for the initial `fitView`. */
  readonly fitViewOptions?: typeof FitViewOptionsSchema.Encoded | undefined
  /** React `ariaLabelConfig`: partial labels; unset entries keep Vanilla's. */
  readonly ariaLabelConfig?: FlowAriaLabelConfigInput | undefined
  /** React `onSelectionChange`: the selected nodes and edges after each change. */
  readonly onSelectionChange?: ((selection: FlowSelection) => void) | undefined
  /** React Flow `onNodesChange`: node deltas next to the `FlowChange` stream. */
  readonly onNodesChange?: FlowNodesChangeListener | undefined
  /** React Flow `onEdgesChange`: edge deltas next to the `FlowChange` stream. */
  readonly onEdgesChange?: FlowEdgesChangeListener | undefined
  readonly onMoveStart?: FlowViewportLifecycleListener | undefined
  readonly onMove?: FlowViewportLifecycleListener | undefined
  readonly onMoveEnd?: FlowViewportLifecycleListener | undefined
  readonly onNodeDragStart?: ((drag: FlowNodeDragPayload) => void) | undefined
  readonly onNodeDrag?: ((drag: FlowNodeDragPayload) => void) | undefined
  readonly onNodeDragStop?:
    | ((drag: FlowNodeDragStopPayload) => void)
    | undefined
  /** React Flow `onSelectionDragStart`: a drag of several selected nodes began. */
  readonly onSelectionDragStart?:
    | ((drag: FlowSelectionDragPayload) => void)
    | undefined
  /**
   * React Flow `onSelectionDrag`. Named `Move` because `onSelectionDrag`
   * already reports selection rectangle progress in this host.
   */
  readonly onSelectionDragMove?:
    | ((drag: FlowSelectionDragPayload) => void)
    | undefined
  /** React Flow `onSelectionDragStop`, with the drag outcome. */
  readonly onSelectionDragStop?:
    | ((drag: FlowSelectionDragStopPayload) => void)
    | undefined
  readonly onConnectStart?:
    | ((connection: FlowConnectStartPayload) => void)
    | undefined
  readonly onClickConnectStart?:
    | ((connection: FlowConnectStartPayload) => void)
    | undefined
  readonly onConnect?:
    | ((connection: FlowConnectionCandidate) => void)
    | undefined
  /** The end payload, then React Flow's final connection state and release. */
  readonly onConnectEnd?:
    | ((
        connection: FlowConnectEndPayload,
        details: FlowConnectionEndDetails
      ) => void)
    | undefined
  readonly onClickConnectEnd?:
    | ((
        connection: FlowConnectEndPayload,
        details: FlowConnectionEndDetails
      ) => void)
    | undefined
  readonly onReconnectStart?:
    | ((reconnect: FlowReconnectStartPayload) => void)
    | undefined
  /** The new edge, then React Flow's `(oldEdge, newConnection)` as details. */
  readonly onReconnect?:
    | ((reconnect: FlowEdge, details: FlowReconnectDetails) => void)
    | undefined
  readonly onReconnectEnd?:
    | ((
        reconnect: FlowReconnectEndPayload,
        details: FlowConnectionEndDetails
      ) => void)
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
  readonly onPaneScroll?: ((payload: FlowPaneScrollPayload) => void) | undefined
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
  /** Style each host-owned handle without querying canvas DOM. */
  readonly onHandleRender?:
    | ((node: FlowNode, handle: FlowHandle, element: HTMLButtonElement) => void)
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
  readonly panel?: HTMLElement | undefined
  readonly panels?: readonly FlowPanelOption[] | undefined
  readonly toolbarContainers?:
    | {
        readonly nodes?: Readonly<Record<string, HTMLElement>> | undefined
        readonly edges?: Readonly<Record<string, HTMLElement>> | undefined
      }
    | undefined
}

export interface JavaScriptFlowController extends FlowInstanceApi {
  readonly overlayPortal: HTMLElement
  readonly getAriaLabelConfig: FlowController['getAriaLabelConfig']
  readonly getColorMode: FlowController['getColorMode']
  readonly setColorMode: FlowController['setColorMode']
  readonly setCanvasOptions: FlowController['setCanvasOptions']
  readonly getRenderedNodePositions: FlowController['getRenderedNodePositions']
  readonly subscribeRenderedPositions: FlowController['subscribeRenderedPositions']
  readonly registerNodeResizer: FlowController['registerNodeResizer']
  readonly mountViewportPortal: FlowController['mountViewportPortal']
  readonly getConnectionPreview: FlowController['getConnectionPreview']
  readonly subscribeConnectionPreview: FlowController['subscribeConnectionPreview']
  readonly getConnection: FlowController['getConnection']
  readonly subscribeConnection: FlowController['subscribeConnection']
  readonly getInteractivity: FlowController['getInteractivity']
  readonly setInteractivity: FlowController['setInteractivity']
  readonly subscribeInteractivity: FlowController['subscribeInteractivity']
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
  readonly rendererScope: Scope.Closeable
  readonly browserScope: Scope.Closeable
  state: 'owned' | 'retired'
  renderer:
    | { readonly kind: 'awaiting-factory' }
    | { readonly kind: 'default' }
    | { readonly kind: 'custom'; readonly instance: FlowNodeRendererInstance }
}

type ReadyNodeEntry = NodeEntry & {
  renderer: Exclude<
    NodeEntry['renderer'],
    { readonly kind: 'awaiting-factory' }
  >
}

type NodeEntrySlot =
  | { readonly kind: 'ready'; readonly entry: ReadyNodeEntry }
  | {
      readonly kind: 'reserved'
      readonly entry: NodeEntry
      readonly operation: 'factory' | 'update' | 'remove'
    }

type ExpectedNodeSlot =
  | { readonly kind: 'absent' }
  | { readonly kind: 'present'; readonly slot: NodeEntrySlot }

type InitialNodeReservation = Extract<
  NodeEntrySlot,
  { readonly kind: 'reserved' }
> & {
  readonly operation: 'factory'
  readonly old: undefined
}

type NodeSlotInstall =
  | {
      readonly expected: Extract<ExpectedNodeSlot, { readonly kind: 'absent' }>
      readonly next: InitialNodeReservation
    }
  | {
      readonly expected: Extract<ExpectedNodeSlot, { readonly kind: 'present' }>
      readonly next: NodeEntrySlot
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
  // React NodeResizeControl `autoScale`: handles keep their screen size when zoomed out.
  element.style.setProperty(
    '--flow-resize-control-scale',
    String(Math.max(1 / viewport.zoom, 1))
  )
}

/** A gesture that can grow `expandParent` parents. */
type ExpandParentGesture =
  | ActiveNodeDrag
  | ActiveNodeGroupDrag
  | ActiveNodeResize

/** The smallest rectangle around both. */
const unionRect = (first: FlowRect, second: FlowRect): FlowRect => {
  const x = Math.min(first.x, second.x)
  const y = Math.min(first.y, second.y)

  return {
    x,
    y,
    width: Math.max(first.x + first.width, second.x + second.width) - x,
    height: Math.max(first.y + first.height, second.y + second.height) - y,
  }
}

/** Invoke a parameterless observer through the boundary reporter. */
const callObserver = (observer: () => void): void => {
  observer()
}

// eslint-disable-next-line complexity -- one comparison per rendered node field.
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
  left.hidden === right.hidden &&
  JSON.stringify(left.style) === JSON.stringify(right.style) &&
  left.className === right.className &&
  left.sourcePosition === right.sourcePosition &&
  left.targetPosition === right.targetPosition &&
  left.dragHandle === right.dragHandle &&
  left.expandParent === right.expandParent

const applyNodeInteractionState = (
  element: HTMLElement,
  node: FlowNode,
  canvas: {
    readonly nodesFocusable: boolean | undefined
    readonly descriptionId: string
    readonly interactivity: FlowInteractivity
    readonly hasPointerHandlers: boolean
    readonly noPanClassName: string | undefined
  }
): void => {
  const userClasses = new Set(node.className?.split(/\s+/u))
  const draggable = isNodeDraggable(canvas.interactivity, node)
  const selectable = isNodeSelectable(canvas.interactivity, node)

  const classes = {
    [canvas.noPanClassName ?? 'nopan']: draggable,
    selected: node.selected === true,
    draggable,
    selectable,
  }

  for (const [className, enabled] of Object.entries(classes)) {
    if (className !== '') {
      element.classList.toggle(className, enabled || userClasses.has(className))
    }
  }

  element.style.pointerEvents =
    flowStyleDeclarations(node.style).find(
      ({ property }) => property === 'pointer-events'
    )?.value ??
    (draggable || selectable || canvas.hasPointerHandlers ? 'all' : 'none')
  element.tabIndex =
    (node.focusable ?? canvas.nodesFocusable) === false ? -1 : 0

  // React's shared node description; a node's own `ariaDescription` wins.
  if (node.ariaDescription === undefined) {
    element.setAttribute('aria-describedby', canvas.descriptionId)
  } else {
    element.removeAttribute('aria-describedby')
  }

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

/** React Flow's Handle classes: `connectable`, `connectablestart`, `connectableend`. */
const markHandleConnectability = (
  button: HTMLElement,
  node: FlowNode,
  handle: FlowHandle,
  interactivity: FlowInteractivity
): void => {
  const start = isHandleConnectable(interactivity, node, handle, 'start')
  const end = isHandleConnectable(interactivity, node, handle, 'end')
  button.classList.toggle('connectable', start || end)
  button.classList.toggle('connectablestart', start)
  button.classList.toggle('connectableend', end)
}

const renderNodeHandles = (
  handles: HTMLElement,
  node: FlowNode,
  interactivity: FlowInteractivity,
  labels: FlowResolvedAriaLabels,
  onHandleRender: FlowHostOptions['onHandleRender']
): void => {
  handles.replaceChildren()

  for (const handle of flowNodeHandles(node)) {
    const button = globalThis.document.createElement('button')
    button.type = 'button'
    button.className = `flow-handle flow-handle-${handle.side} flow-handle-${handle.kind}`
    button.dataset.nodeId = node.id
    button.dataset.handleId = handle.id
    button.dataset.kind = handle.kind
    button.dataset.testid = 'flow-handle'
    button.setAttribute(
      'aria-label',
      labels.handleLabelConfigured
        ? labels.config['handle.ariaLabel']
        : `${handle.kind} handle ${handle.id}`
    )
    markHandleConnectability(button, node, handle, interactivity)
    onHandleRender?.(node, handle, button)
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

/**
 * Resize controls on a selected node. `enabled` is the `nodesResizable`
 * mount option, React Flow's opt-in `NodeResizer`.
 */
const renderNodeResizeHandle = (
  element: HTMLElement,
  node: FlowNode,
  enabled: boolean
): void => {
  const existing = new Map(
    [
      ...element.querySelectorAll<HTMLButtonElement>(
        '.flow-node-resize-handle'
      ),
    ].map((handle) => [handle.dataset.direction, handle])
  )

  if (node.selected !== true || !enabled) {
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
    // A mid-side control moves out past that side's connection handles.
    handle.classList.toggle(
      'flow-node-resize-clear',
      flowNodeHandles(node).some(({ side }) => side === direction)
    )
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
  target: EventTarget | null,
  noDragClassName: string | undefined
): boolean => {
  const contentTarget =
    target instanceof Element && content.contains(target) ? target : null

  const noDragTarget = contentTarget?.closest(
    noGestureSelector('drag', noDragClassName)
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

/**
 * React `dragHandle`: with a selector, only a pointer-down inside a matching
 * element within the node starts a drag (XYDrag `hasSelector`).
 */
const isInsideDragHandle = (
  element: HTMLElement,
  target: EventTarget | null,
  selector: string | undefined
): boolean => {
  if (selector === undefined) {
    return true
  }

  const handle = target instanceof Element ? target.closest(selector) : null

  return handle !== null && element.contains(handle)
}

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

const copyNodeRead = (node: FlowNode): FlowNode => {
  const { data: _data, ...values } = node

  return { ...node, ...structuredClone(values) }
}

const pointMatches = (
  left: XYPosition | undefined,
  right: XYPosition | undefined
): boolean => left?.x === right?.x && left?.y === right?.y

const nodeGeometryMatches = (captured: FlowNode, current: FlowNode): boolean =>
  pointMatches(captured.position, current.position) &&
  captured.parentId === current.parentId &&
  captured.size?.width === current.size?.width &&
  captured.size?.height === current.size?.height &&
  captured.origin?.[0] === current.origin?.[0] &&
  captured.origin?.[1] === current.origin?.[1] &&
  captured.hidden === current.hidden

const attemptOptionalFailureReport = (report: () => void): boolean => {
  try {
    report()

    return true
  } catch {
    return false
  }
}

type CanvasTargetKind = FlowCanvasEventTarget['kind']

type CanvasCandidateKey = Extract<
  keyof FlowHostOptions,
  `on${Capitalize<CanvasTargetKind>}${string}`
>

type CanvasCallbackKey = {
  [Key in CanvasCandidateKey]: NonNullable<
    FlowHostOptions[Key]
  > extends FlowCanvasEventListener
    ? FlowCanvasEventListener extends NonNullable<FlowHostOptions[Key]>
      ? Key
      : never
    : never
}[CanvasCandidateKey]

type CanvasFamilyOf<Key> =
  Key extends `on${Capitalize<CanvasTargetKind>}${infer Family}`
    ? Family
    : never

type CanvasCallbackFamily = Exclude<CanvasFamilyOf<CanvasCallbackKey>, 'Scroll'>

type CanvasCallbackKeys = {
  readonly [Kind in CanvasTargetKind]: {
    readonly [Family in CanvasCallbackFamily]: Extract<
      CanvasCallbackKey,
      `on${Capitalize<Kind>}${Family}`
    >
  }
}

const canvasCallbackKeys = {
  pane: {
    Click: 'onPaneClick',
    DoubleClick: 'onPaneDoubleClick',
    ContextMenu: 'onPaneContextMenu',
    MouseEnter: 'onPaneMouseEnter',
    MouseMove: 'onPaneMouseMove',
    MouseLeave: 'onPaneMouseLeave',
  },
  node: {
    Click: 'onNodeClick',
    DoubleClick: 'onNodeDoubleClick',
    ContextMenu: 'onNodeContextMenu',
    MouseEnter: 'onNodeMouseEnter',
    MouseMove: 'onNodeMouseMove',
    MouseLeave: 'onNodeMouseLeave',
  },
  edge: {
    Click: 'onEdgeClick',
    DoubleClick: 'onEdgeDoubleClick',
    ContextMenu: 'onEdgeContextMenu',
    MouseEnter: 'onEdgeMouseEnter',
    MouseMove: 'onEdgeMouseMove',
    MouseLeave: 'onEdgeMouseLeave',
  },
} satisfies CanvasCallbackKeys

/** React's default `snapGrid` when only `snapToGrid` is set. */
const defaultSnapGrid: SnapGrid = { x: 15, y: 15 }

/** `snapToGrid: false` turns `snapGrid` off; `true` alone uses 15x15. */
const resolveSnapGrid = (options: {
  readonly snapGrid?: SnapGrid | undefined
  readonly snapToGrid?: boolean | undefined
}): SnapGrid | undefined => {
  if (options.snapToGrid === false) {
    return undefined
  }

  return (
    options.snapGrid ??
    (options.snapToGrid === true ? defaultSnapGrid : undefined)
  )
}

export const createFlowHost = (
  root: HTMLElement,
  initialDocument: FlowDocument,
  initialOptions: FlowHostOptions
) => {
  const nodeDragThreshold = decodeNodeDragThreshold(
    initialOptions.nodeDragThreshold
  )

  const connectionDragThreshold = S.decodeUnknownSync(
    ConnectionDragThresholdSchema
  )(
    initialOptions.connectionDragThreshold === undefined
      ? defaultConnectionDragThreshold
      : initialOptions.connectionDragThreshold
  )

  validateCanvasPanelOptions(initialOptions.panel, initialOptions.panels)

  return Effect.gen(function* buildFlowHost() {
    let configuredCanvasOptions = S.decodeUnknownSync(FlowCanvasOptionsSchema)(
      initialOptions
    )

    let options = {
      ...initialOptions,
      snapGrid: resolveSnapGrid(configuredCanvasOptions),
    }

    const browser = yield* FlowBrowser
    const { documentMode, runEffect } = options
    let interactivity: FlowInteractivity = resolveFlowInteractivity(options)

    const interactivityListeners = new Set<(next: FlowInteractivity) => void>()

    // The last in-progress connection, kept for the end payload after the preview clears.
    let lastConnectionState: FlowConnectionState = flowNoConnection
    // The browser event ending the current gesture, read by end notifications.
    let connectionEndEvent: MouseEvent | KeyboardEvent | undefined
    const hostScope = runEffect(Scope.make('sequential'))

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

    if (background.color !== undefined) {
      canvas.style.setProperty(
        '--flow-background-pattern-color',
        background.color
      )
    }

    const colorMode = bindFlowColorMode(canvas, options.colorMode)
    const ariaLabels = resolveVanillaAriaLabels(options.ariaLabelConfig)

    const a11yDescriptions = createA11yDescriptions(
      canvas,
      ariaLabels,
      options.keyboardActivation !== false
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

    let destroyed = false
    let pendingConnection: PendingConnection | null = null
    let connectionCapture: number | null = null

    const acquireConnectionCapture = (pointerId: number): boolean => {
      if (destroyed) {
        return false
      }

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

    let authoritativeViewport = clampViewport(
      options.viewport.initial,
      viewportLimits
    )

    let renderedViewport = authoritativeViewport
    applyViewport(viewport, renderedViewport)

    const nodeSlots = new Map<NodeId, NodeEntrySlot>()

    const entries = {
      get: (id: NodeId): ReadyNodeEntry | undefined => {
        const slot = nodeSlots.get(id)

        return slot?.kind === 'ready' ? slot.entry : undefined
      },
      *[Symbol.iterator](): Generator<[NodeId, ReadyNodeEntry]> {
        for (const [id, slot] of nodeSlots) {
          if (slot.kind === 'ready') {
            yield [id, slot.entry]
          }
        }
      },
      *keys(): Generator<NodeId> {
        for (const [id] of this) {
          yield id
        }
      },
      get size(): number {
        return [...this].length
      },
    }

    const draggingNodeIds = new Set<NodeId>()

    const sentNodeRendererProps = new WeakMap<
      NodeEntry,
      FlowNodeRendererProps
    >()

    const nodeRendererPropsFor = (
      node: FlowNode,
      graph: FlowGraphView
    ): FlowNodeRendererProps =>
      flowNodeRendererProps(node, {
        positionAbsolute:
          graph.nodes.get(node.id)?.absolutePosition ?? node.position,
        dragging: draggingNodeIds.has(node.id),
        size: measurements.get(node.id) ?? node.size,
        ...interactivity,
      })

    /** Push changed NodeProps to an opted-in custom renderer between document updates. */
    const refreshNodeRendererProps = (
      entry: NodeEntry,
      node: FlowNode | undefined,
      graph: FlowGraphView
    ): void => {
      const updateProps =
        entry.renderer.kind === 'custom'
          ? entry.renderer.instance.updateProps
          : undefined

      // Renderers without `updateProps` only hear about document changes.
      if (updateProps === undefined || node === undefined) {
        return
      }

      const props = nodeRendererPropsFor(node, graph)

      if (sameFlowNodeRendererProps(sentNodeRendererProps.get(entry), props)) {
        return
      }

      sentNodeRendererProps.set(entry, props)

      try {
        updateProps(props)
      } catch (error) {
        runTelemetry(
          Effect.logWarning('Node renderer update failed').pipe(
            Effect.annotateLogs({
              [FlowAttribute.nodeId]: node.id,
              [FlowAttribute.failureName]: 'NodeRendererUpdateError',
              [FlowAttribute.failureMessage]:
                error instanceof Error ? error.message : String(error),
            })
          )
        )
      }
    }

    const installNodeReservation = (
      id: NodeId,
      transition: NodeSlotInstall,
      pass?: HostProjection
    ): boolean => {
      if (destroyed) {
        return false
      }

      const matches =
        transition.expected.kind === 'absent'
          ? !nodeSlots.has(id)
          : nodeSlots.get(id) === transition.expected.slot

      if (!matches) {
        return false
      }

      nodeSlots.set(id, transition.next)
      pass?.entryClaims.nodes.set(id, transition.next)

      return true
    }

    const reserveNodeCandidate = (
      nodeId: NodeId,
      expected: NodeEntrySlot | undefined,
      entry: NodeEntry,
      pass: HostProjection
    ): Extract<NodeEntrySlot, { readonly kind: 'reserved' }> | undefined => {
      if (expected === undefined) {
        const initial: InitialNodeReservation = {
          kind: 'reserved',
          operation: 'factory',
          old: undefined,
          entry,
        }

        return installNodeReservation(
          nodeId,
          {
            expected: { kind: 'absent' },
            next: initial,
          },
          pass
        )
          ? initial
          : undefined
      }

      const replacement: Extract<NodeEntrySlot, { readonly kind: 'reserved' }> =
        { kind: 'reserved', operation: 'factory', entry }

      return installNodeReservation(
        nodeId,
        {
          expected: { kind: 'present', slot: expected },
          next: replacement,
        },
        pass
      )
        ? replacement
        : undefined
    }

    const measuredDimensions = createMeasuredDimensionsTracker()
    let measuredDimensionsPending = false

    /** Bound to the active resize slots once they are defined below. */
    let measuredDimensionsHeld: () => boolean = neverHeld

    /** Bound to the boundary callback reporter once it is defined below. */
    let reportMeasuredDimensions: (
      changes: Parameters<FlowNodesChangeListener>[0]
    ) => void = ignoreNodeChanges

    /**
     * React Flow `dimensions` node changes. Measurement lands from render
     * passes, observers and refreshes; one microtask reports the net size
     * changes, so a controlled `onNodesChange` never re-enters a render pass.
     * While a pointer or keyboard resize is active the report waits for the
     * gesture to end: a controlled owner applying it would replace the
     * document and cancel the resize. The resize commit carries the size.
     */
    const flushMeasuredDimensions = (): void => {
      measuredDimensionsPending = false

      if (destroyed) {
        return
      }

      if (measuredDimensionsHeld()) {
        measuredDimensionsPending = true
        globalThis.requestAnimationFrame(flushMeasuredDimensions)

        return
      }

      const changes = measuredDimensions.changes(measurements)

      if (changes.length > 0) {
        reportMeasuredDimensions(changes)
      }
    }

    const scheduleMeasuredDimensions = (): void => {
      if (measuredDimensionsPending || options.onNodesChange === undefined) {
        return
      }

      measuredDimensionsPending = true
      globalThis.queueMicrotask(flushMeasuredDimensions)
    }

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
      scheduleMeasuredDimensions()
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

    /** React `node.measured`: the last DOM measurement on public reads. */
    const withMeasured = (
      node: FlowNode,
      measured:
        | { readonly width: number; readonly height: number }
        | undefined = measurements.get(node.id)
    ): FlowNode =>
      measured === undefined
        ? node
        : {
            ...node,
            measured: { width: measured.width, height: measured.height },
          }

    // Accepted documents are replaced, never mutated, so an index per
    // document identity keeps node lookups constant-time on hot paths.
    let indexedNodes: readonly FlowNode[] | undefined
    let nodeIndex = new Map<NodeId, FlowNode>()

    /** Observers of preview frames (drags, resizes) for overview UI. */
    const renderedPositionListeners = new Set<() => void>()

    const findNode = (nodeId: NodeId): FlowNode | undefined => {
      if (indexedNodes !== document.nodes) {
        indexedNodes = document.nodes
        nodeIndex = new Map(document.nodes.map((node) => [node.id, node]))
      }

      return nodeIndex.get(nodeId)
    }

    // Per-node resizers (`createFlowNodeResizer`/`createFlowNodeResizeControl`).
    const nodeResizers = new Map<
      NodeId,
      Map<number, FlowNodeResizerRegistration>
    >()

    let nextResizerId = 0

    /**
     * A node with a registered resizer shows only its controls; otherwise
     * `nodesResizable` shows the built-in controls on the selected node.
     */
    const renderResizeControls = (
      element: HTMLElement,
      node: FlowNode
    ): void => {
      const registered = renderRegisteredResizeControls(
        element,
        node.label,
        nodeResizers.get(node.id)
      )

      renderNodeResizeHandle(
        element,
        node,
        !registered && options.nodesResizable === true
      )
    }

    const refreshResizeControls = (nodeId: NodeId): void => {
      const entry = entries.get(nodeId)
      const node = findNode(nodeId)

      if (entry !== undefined && node !== undefined) {
        renderResizeControls(entry.element, node)
      }
    }

    const registerNodeResizer = (
      nodeId: NodeId,
      registration: FlowNodeResizerRegistration
    ): FlowNodeResizerHandle => {
      nextResizerId += 1
      const id = nextResizerId
      const forNode = nodeResizers.get(nodeId) ?? new Map()
      forNode.set(id, registration)
      nodeResizers.set(nodeId, forNode)
      refreshResizeControls(nodeId)

      return {
        update: (next) => {
          const current = nodeResizers.get(nodeId)

          if (current?.has(id) === true) {
            current.set(id, next)
            refreshResizeControls(nodeId)
          }
        },
        remove: () => {
          const current = nodeResizers.get(nodeId)

          if (current?.delete(id) !== true) {
            return
          }

          if (current.size === 0) {
            nodeResizers.delete(nodeId)
          }

          refreshResizeControls(nodeId)
        },
      }
    }

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

    const captureResizeRestoration = (
      nodeId: NodeId,
      sizeStart: NodeDimensions
    ) =>
      document.nodes
        .filter((node) => node.id === nodeId || node.parentId === nodeId)
        .flatMap((node) => {
          const entry = entries.get(node.id)

          if (entry === undefined) {
            return []
          }

          const position = renderedNodePositions.get(node.id)

          const accepted = measurementState.nodes.find(
            (value) =>
              value.measurement.nodeId === node.id &&
              value.generation === entry.generation
          )

          return [
            {
              nodeId: node.id,
              entry,
              position: position === undefined ? undefined : { ...position },
              styles: [
                'width',
                'height',
                'min-width',
                'max-width',
                'min-height',
                'max-height',
                'box-sizing',
                'transform',
              ].map((name) => ({
                name,
                value: entry.element.style.getPropertyValue(name),
                priority: entry.element.style.getPropertyPriority(name),
              })),
              resizing: entry.element.classList.contains('resizing'),
              dataResizing: entry.element.dataset.resizing,
              dataSized: entry.element.dataset.sized,
              measurement:
                accepted === undefined
                  ? {
                      nodeId: node.id,
                      generation: entry.generation,
                      ...(node.id === nodeId
                        ? sizeStart
                        : dimensionsForNode(node)),
                      handles: measureNodeHandles(
                        node,
                        entry.element,
                        renderedViewport.zoom
                      ),
                    }
                  : {
                      ...structuredClone(accepted.measurement),
                      generation: accepted.generation,
                    },
            },
          ]
        })

    const resizeRestorations = new WeakMap<
      ActiveNodeResize | ActiveKeyboardResize,
      ReturnType<typeof captureResizeRestoration>
    >()

    const restoreResizePrimitives = (
      resize: ActiveNodeResize | ActiveKeyboardResize
    ): boolean => {
      const captured = resizeRestorations.get(resize)

      if (captured === undefined) {
        return false
      }

      resizeRestorations.delete(resize)
      const restoredMeasurements: NodeMeasurementInput[] = []

      for (const item of captured) {
        for (const style of item.styles) {
          item.entry.element.style.setProperty(
            style.name,
            style.value,
            style.priority
          )
        }

        item.entry.element.classList.toggle('resizing', item.resizing)

        if (item.dataResizing === undefined) {
          delete item.entry.element.dataset.resizing
        } else {
          item.entry.element.dataset.resizing = item.dataResizing
        }

        if (item.dataSized === undefined) {
          delete item.entry.element.dataset.sized
        } else {
          item.entry.element.dataset.sized = item.dataSized
        }

        if (entries.get(item.nodeId) !== item.entry) {
          continue
        }

        if (item.position === undefined) {
          renderedNodePositions.delete(item.nodeId)
        } else {
          renderedNodePositions.set(item.nodeId, item.position)
        }

        restoredMeasurements.push(item.measurement)
      }

      measurementState = applyNodeMeasurements(
        document,
        measurementState,
        restoredMeasurements
      )
      measurements = getFlowMeasuredNodes(document, measurementState)
      scheduleMeasuredDimensions()

      return true
    }

    const boundedPositionWithinParent = (
      node: FlowNode,
      position: XYPosition,
      dimensions: NodeDimensions
    ): XYPosition | undefined => {
      // React skips the parent clamp for `expandParent` children: they grow it.
      if (
        node.parentId === undefined ||
        node.extent !== 'parent' ||
        node.expandParent === true
      ) {
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

    let selectionKeyPressed = false
    let panKeyPressed = false

    const renderPaneSelectionClass = (): void => {
      canvas.classList.toggle(
        'selection',
        selectionKeyPressed ||
          (options.selectionOnDrag === true &&
            (options.panOnDrag ?? true) !== true &&
            !panKeyPressed)
      )
    }

    const canvasKeys = bindCanvasKeys(options, keyPressDisposers, (held) => {
      if (options.selectionKeyCode !== undefined) {
        selectionKeyPressed = held
      }

      renderPaneSelectionClass()
    })

    const observePaneModifiers = (event: KeyboardEvent): void => {
      if (options.selectionKeyCode === undefined) {
        selectionKeyPressed = isActivationModifierPressed(
          event,
          options.selectionActivationModifier ?? 'shift'
        )
      }

      panKeyPressed = panModifierPressed(options, event)
      renderPaneSelectionClass()
    }

    const viewportListeners = new Set<(event: ViewportObservation) => void>()

    const canvasUIHandle: CanvasUIHandle = { current: undefined }
    let rootAttached = false
    const cleanupFailures: unknown[] = []
    yield* Scope.addFinalizer(
      hostScope,
      Effect.sync(() => {
        colorMode.dispose()
        renderedPositionListeners.clear()
        nodeSlots.clear()
        renderedNodePositions.clear()

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
          if (rootAttached) {
            root.replaceChildren()
          }
        } catch (error) {
          cleanupFailures.push(error)
        }

        try {
          canvasUIHandle.current?.destroy(restorePanelFocus)
        } catch (error) {
          cleanupFailures.push(error)
        }

        if (cleanupFailures.length > 0) {
          attemptOptionalFailureReport(() => {
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
          })
        }
      })
    )

    const hostRendererScope = runEffect(Scope.fork(hostScope, 'sequential'))
    const hostBrowserScope = runEffect(Scope.fork(hostScope, 'sequential'))
    yield* Scope.addFinalizer(
      hostBrowserScope,
      Effect.sync(() => {
        for (const dispose of keyPressDisposers) {
          dispose()
        }

        keyPressDisposers.clear()
      })
    )

    let interactionSessions: FlowInteractionSessions = []

    const sessionFor = (
      kind: FlowInteractionSession['kind']
    ): FlowInteractionSession | undefined =>
      interactionSessions.find((session) => session.kind === kind)

    let nodeSample: NodeSample | undefined

    let activeClickConnection: ActiveClickConnection | null = null

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

    const nodeSampleLive = (sample: NodeSample): boolean =>
      !destroyed &&
      nodeSample === sample &&
      sessionFor('node-drag') === sample.session &&
      sample.session.kind === 'node-drag' &&
      sample.session.drag === sample.drag &&
      sample.session.phase === 'active'

    type PaintOrigin =
      | {
          readonly kind: 'semantic' | 'retired'
          readonly document: FlowDocument
        }
      | { readonly kind: 'node'; readonly sample: NodeSample }
      | {
          readonly kind: 'viewport'
          readonly document: FlowDocument
          readonly owners: FlowInteractionSessions
          readonly request: typeof activeViewportOperation
          readonly retained: ActiveClickConnection | null
        }

    const nodeReadEqual = S.toEquivalence(FlowNodeSchema)
    const edgeReadEqual = S.toEquivalence(FlowEdgeSchema)
    const measurementReadEqual = S.toEquivalence(MeasuredNodeSchema)

    const defaultsReadEqual = S.toEquivalence(
      S.UndefinedOr(FlowDefaultEdgeOptionsSchema)
    )

    const uiReadEqual = S.toEquivalence(S.UndefinedOr(CanvasUISchema))

    const originMatches = (origin: PaintOrigin): boolean => {
      if (destroyed) {
        return false
      }

      switch (origin.kind) {
        case 'semantic':
        case 'retired': {
          return origin.document === document
        }

        case 'node': {
          return nodeSampleLive(origin.sample)
        }

        case 'viewport': {
          return (
            origin.document === document &&
            origin.owners === interactionSessions &&
            origin.request === activeViewportOperation &&
            origin.retained === activeClickConnection
          )
        }

        default: {
          const exhausted: never = origin

          return exhausted
        }
      }
    }

    const measurementMatches = (pass: HostProjection, id: NodeId): boolean => {
      const captured = pass.inputs.measurements.get(id)
      const current = measurements.get(id)

      return captured === undefined || current === undefined
        ? captured === current
        : measurementReadEqual(captured, current)
    }

    const nodeDependenciesMatch = (
      pass: HostProjection,
      id: NodeId
    ): boolean => {
      let currentId: NodeId | undefined = id

      while (currentId !== undefined) {
        const captured: FlowNode | undefined =
          pass.graph.nodes.get(currentId)?.node

        const idToRead = currentId
        const current = document.nodes.find((node) => node.id === idToRead)

        if (captured === undefined || current === undefined) {
          return captured === current
        }

        if (
          currentId === id &&
          (captured.data !== current.data ||
            !nodeReadEqual(
              { ...captured, data: undefined },
              { ...current, data: undefined }
            ) ||
            pass.inputs.nodeRenderers.get(captured.type ?? 'default') !==
              options.nodeRenderers?.[current.type ?? 'default'])
        ) {
          return false
        }

        if (!nodeGeometryMatches(captured, current)) {
          return false
        }

        if (
          !pointMatches(
            pass.inputs.positions.get(currentId),
            renderedNodePositions.get(currentId)
          )
        ) {
          return false
        }

        if (!measurementMatches(pass, currentId)) {
          return false
        }

        currentId = captured.parentId
      }

      return (
        pass.inputs.document.nodeOrigin?.[0] === document.nodeOrigin?.[0] &&
        pass.inputs.document.nodeOrigin?.[1] === document.nodeOrigin?.[1]
      )
    }

    const edgeDependenciesMatch = (
      pass: HostProjection,
      id: EdgeId
    ): boolean => {
      const captured = pass.inputs.document.edges.find((edge) => edge.id === id)
      const current = document.edges.find((edge) => edge.id === id)

      if (captured === undefined || current === undefined) {
        return captured === current
      }

      const capturedType = applyDefaultEdgeOptions(
        captured,
        pass.inputs.defaults
      ).type

      const currentType = applyDefaultEdgeOptions(
        current,
        options.defaultEdgeOptions
      ).type

      const renderer =
        capturedType === undefined
          ? undefined
          : pass.inputs.edgeRenderers.get(capturedType)

      const actualRenderer =
        currentType === undefined
          ? undefined
          : options.edgeRenderers?.[currentType]

      return (
        captured.data === current.data &&
        edgeReadEqual(
          { ...captured, data: undefined },
          { ...current, data: undefined }
        ) &&
        defaultsReadEqual(pass.inputs.defaults, options.defaultEdgeOptions) &&
        renderer?.geometry === actualRenderer?.geometry &&
        renderer?.render === actualRenderer?.render &&
        nodeDependenciesMatch(pass, captured.source) &&
        nodeDependenciesMatch(pass, captured.target)
      )
    }

    const projectionMatches = (
      pass: HostProjection,
      dependency: ProjectionDependency
    ): boolean => {
      if (!originMatches(pass.origin)) {
        return false
      }

      if (dependency.kind === 'node') {
        return nodeDependenciesMatch(pass, dependency.id)
      }

      if (dependency.kind === 'edge') {
        return edgeDependenciesMatch(pass, dependency.id)
      }

      if (
        dependency.kind !== 'viewport' &&
        (pass.inputs.document.nodes.length !== document.nodes.length ||
          pass.inputs.document.edges.length !== document.edges.length ||
          !pass.inputs.document.nodes.every((node) =>
            nodeDependenciesMatch(pass, node.id)
          ) ||
          !pass.inputs.document.edges.every((edge) =>
            edgeDependenciesMatch(pass, edge.id)
          ))
      ) {
        return false
      }

      if (dependency.kind === 'graph') {
        return true
      }

      const { pane, viewport: captured } = pass.inputs
      const rect = canvas.getBoundingClientRect()

      if (
        !pointMatches(captured, renderedViewport) ||
        captured.zoom !== renderedViewport.zoom ||
        pane.x !== rect.x ||
        pane.y !== rect.y ||
        pane.width !== canvas.clientWidth ||
        pane.height !== canvas.clientHeight
      ) {
        return false
      }

      if (dependency.kind === 'visibility') {
        return (
          pass.inputs.renderOnlyVisible === (options.renderOnlyVisible === true)
        )
      }

      if (dependency.kind === 'viewport') {
        return true
      }

      return (
        pass.inputs.uiHandle === canvasUIHandle.current &&
        uiReadEqual(pass.inputs.ui, options.ui)
      )
    }

    /** Bound to the boundary callback reporter once it is defined below. */
    let reportEdgeCallbackFailure: (label: string, error: Error) => void =
      ignoreCallbackFailure

    const edgeRenderer: ReturnType<
      typeof createEdgeRenderer<
        PaintOrigin,
        NodeEntrySlot,
        CanvasUIHandle['current']
      >
    > = createEdgeRenderer<
      PaintOrigin,
      NodeEntrySlot,
      CanvasUIHandle['current']
    >(
      viewport,
      hostRendererScope,
      runEffect,
      (pass, dependency) => projectionMatches(pass, dependency),
      () => destroyed,
      cleanupFailures,
      (label, error) => reportEdgeCallbackFailure(label, error),
      () => ({
        zIndexMode: options.zIndexMode,
        elevateEdgesOnSelect: options.elevateEdgesOnSelect,
        defaultMarkerColor: options.defaultMarkerColor,
        edgesFocusable: options.edgesFocusable,
        edgesReconnectable: options.edgesReconnectable,
        reconnectRadius: options.reconnectRadius,
        edgeDescriptionId: a11yDescriptions.edgeDescriptionId,
        elementsSelectable: interactivity.elementsSelectable,
        hasClickHandler: options.onEdgeClick !== undefined,
        noPanClassName: options.noPanClassName,
      })
    )

    let instanceProjection:
      | {
          readonly document: FlowDocument
          readonly measurements: typeof measurements
          readonly pass: HostProjection
        }
      | undefined

    const captureProjection = (
      target: FlowDocument = document,
      origin?: PaintOrigin
    ): HostProjection => {
      const values: FlowDocument = {
        ...target,
        nodeOrigin:
          target.nodeOrigin === undefined
            ? undefined
            : [target.nodeOrigin[0], target.nodeOrigin[1]],
        nodes: target.nodes.map(copyNodeRead),
        edges: target.edges.map((edge) => ({ ...edge })),
      }

      const positions = new Map(
        [...renderedNodePositions].map(([id, point]) => [id, { ...point }])
      )

      const measured = new Map(
        [...measurements].map(([id, value]) => [id, structuredClone(value)])
      )

      const rect = canvas.getBoundingClientRect()
      const nodes = new Map(nodeSlots)
      const edges = edgeRenderer.captureEntryCohort()

      const pass: HostProjection = {
        origin: origin ?? { kind: 'semantic', document: target },
        graph: createFlowGraph(values, measured, positions),
        inputs: {
          document: values,
          measurements: measured,
          positions,
          viewport: { ...renderedViewport },
          pane: {
            x: rect.x,
            y: rect.y,
            width: canvas.clientWidth,
            height: canvas.clientHeight,
          },
          renderOnlyVisible: options.renderOnlyVisible === true,
          nodeRenderers: new Map(Object.entries(options.nodeRenderers ?? {})),
          edgeRenderers: new Map(
            Object.entries(options.edgeRenderers ?? {}).map(([key, value]) => [
              key,
              { geometry: value.geometry, render: value.render },
            ])
          ),
          defaults:
            options.defaultEdgeOptions === undefined
              ? undefined
              : { ...options.defaultEdgeOptions },
          ui: options.ui === undefined ? undefined : { ...options.ui },
          uiHandle: canvasUIHandle.current,
        },
        cohort: { nodes, edges },
        entryClaims: { nodes: new Map(nodes), edges: new Map(edges) },
      }

      if (target === document) {
        instanceProjection = { document, measurements, pass }
      }

      return pass
    }

    type HostProjection = Parameters<typeof edgeRenderer.reconcile>[0]

    type ProjectionDependency = Parameters<
      Parameters<
        typeof createEdgeRenderer<
          PaintOrigin,
          NodeEntrySlot,
          CanvasUIHandle['current']
        >
      >[3]
    >[1]

    yield* Scope.addFinalizer(
      hostRendererScope,
      Effect.sync(() => {
        try {
          edgeRenderer.destroy()
        } catch (error) {
          cleanupFailures.push(error)
        }
      })
    )

    const callbackStartedNodeDrags = new Set<
      ActiveNodeDrag | ActiveNodeGroupDrag
    >()

    let viewportObservationSource: ViewportObservation['source'] = 'user'

    interface VanillaObservation {
      state: 'open' | 'ended'
    }

    let userViewportObservation: VanillaObservation | null = null

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

    reportEdgeCallbackFailure = (label, error) =>
      reportBoundaryCallback(label, 'renderer', rethrowFailure, error)

    reportMeasuredDimensions = (changes) => {
      const { onNodesChange } = options

      if (onNodesChange !== undefined) {
        reportBoundaryCallback(
          'Nodes change',
          'measurement',
          onNodesChange,
          changes
        )
      }
    }

    /** React Flow `onNodesChange` / `onEdgesChange` deltas for one published change. */
    const notifyElementChanges = (base: FlowDocument, change: FlowChange) => {
      const { onNodesChange, onEdgesChange } = options

      if (onNodesChange === undefined && onEdgesChange === undefined) {
        return
      }

      const { nodes, edges } = flowChangeElementChanges(base, change)

      if (onNodesChange !== undefined && nodes.length > 0) {
        reportBoundaryCallback(
          'Nodes change',
          'semantic-change',
          onNodesChange,
          nodes
        )
      }

      if (onEdgesChange !== undefined && edges.length > 0) {
        reportBoundaryCallback(
          'Edges change',
          'semantic-change',
          onEdgesChange,
          edges
        )
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

    const beginUserViewportObservation = (): VanillaObservation => {
      if (userViewportObservation !== null) {
        return userViewportObservation
      }

      const owner: VanillaObservation = { state: 'open' }
      userViewportObservation = owner
      emitViewportObservation('start', renderedViewport, 'user')

      return owner
    }

    const endUserViewportObservation = (
      owner = userViewportObservation,
      terminalViewport = renderedViewport
    ): void => {
      if (owner === null || owner.state !== 'open') {
        return
      }

      owner.state = 'ended'

      if (userViewportObservation === owner) {
        userViewportObservation = null
      }

      emitViewportObservation('end', terminalViewport, 'user')
    }

    const deferredMutations: (() => void)[] = []
    const pendingEditRejectors = new Set<(reason: Error) => void>()

    let cancelActiveGestures: (reason: string, pointerId?: number) => boolean =
      noActiveGestures

    let mutationDepth = 0
    let drainingMutations = false

    const reportStateListenerFailure = (cause: Cause.Cause<unknown>): void => {
      attemptOptionalFailureReport(() => {
        runTelemetry(
          Effect.logError('Accepted-state listener failed').pipe(
            Effect.annotateLogs({
              [FlowAttribute.documentIssue]: Cause.pretty(cause),
            })
          )
        )
      })
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

    const changePublisher = {
      publish: (_change: FlowChange): void => {
        throw new Error('Flow change publisher is not initialized')
      },
    }

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

    measuredDimensionsHeld = () =>
      interactionSlots.activeNodeResize !== null ||
      activeKeyboardResize !== null
    let activeKeyboardNodeDrag: FlowNodeDragPayload | null = null

    const adoptedPosition = (node: FlowNode): XYPosition =>
      boundedNodePosition(node.id, node.position)

    const graphFor = (
      target: FlowDocument = document,
      overrides: ReadonlyMap<NodeId, XYPosition> = renderedNodePositions
    ) => createFlowGraph(target, measurements, overrides)

    let selectionBoundsActive = false
    const selectionBox = globalThis.document.createElement('div')

    selectionBox.className = 'flow-selection-box'
    selectionBox.hidden = true

    const renderSelectionBounds = (graph = graphFor()): void => {
      const ids = new Set(
        graph.document.nodes.filter((node) => node.selected).map(({ id }) => id)
      )

      const bounds = selectionBoundsActive ? graphBounds(graph, ids) : undefined

      selectionBox.hidden =
        bounds === undefined || interactionSlots.activeSelectionRect !== null

      if (selectionBox.hidden) {
        selectionBox.remove()
      } else if (selectionBox.parentElement !== viewport) {
        viewport.append(selectionBox)
      }

      if (bounds !== undefined) {
        Object.assign(selectionBox.style, {
          left: `${bounds.x}px`,
          top: `${bounds.y}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        })
      }
    }

    let acceptedInstanceGraph:
      | {
          readonly document: FlowDocument
          readonly measurements: typeof measurements
          readonly graph: ReturnType<typeof createFlowGraph>
        }
      | undefined

    const readInternalNode = (id: string): FlowInternalNode | undefined => {
      const resize = interactionSlots.activeNodeResize ?? activeKeyboardResize

      const previewActive =
        interactionSlots.activeDrag !== null || resize !== null

      const pass =
        instanceProjection?.document === document &&
        instanceProjection.measurements === measurements
          ? instanceProjection.pass
          : captureProjection()

      if (
        !previewActive &&
        (acceptedInstanceGraph?.document !== document ||
          acceptedInstanceGraph.measurements !== measurements)
      ) {
        acceptedInstanceGraph = {
          document,
          measurements,
          graph: createFlowGraph(document, measurements),
        }
      }

      const graph = previewActive ? pass.graph : acceptedInstanceGraph?.graph
      const item = graph?.nodes.get(NodeIdSchema.make(id))

      const measured =
        item === undefined ? undefined : pass.inputs.measurements.get(item.id)

      const resizeId = resize?.nodeId

      return item === undefined
        ? undefined
        : projectFlowInternalNode(
            item,
            measured,
            previewActive ? pass.inputs.positions.get(item.id) : undefined,
            item.id === resizeId && measured !== undefined
              ? { width: measured.width, height: measured.height }
              : undefined
          )
    }

    const fitViewControlHandle: FitViewControlHandle = { current: undefined }

    const updateCanvasMinimap = (pass = captureProjection()): void => {
      if (canvasUIHandle.current === undefined) {
        return
      }

      const { graph } = pass
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

    const updateToolbarAnchors = (pass = captureProjection()): void => {
      renderSelectionBounds(pass.graph)
      const target = pass.inputs.document
      const anchors = flowToolbarAnchors(pass.graph, pass.inputs.viewport)
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

      if (!projectionMatches(pass, { kind: 'toolbar' })) {
        return
      }

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

      const resolved = graphFor().nodes.get(nodeId)

      if (resolved === undefined || node === undefined) {
        throw new Error(`Missing dragged node ${nodeId}`)
      }

      return nodeTopLeftToAnchor(
        parent === undefined
          ? absolute
          : {
              x: absolute.x - parent.absolutePosition.x,
              y: absolute.y - parent.absolutePosition.y,
            },
        resolved.dimensions,
        resolveNodeOrigin(node, document)
      )
    }

    const renderGraphPositions = (pass = captureProjection()) => {
      const { graph } = pass

      for (const [nodeId, slot] of pass.entryClaims.nodes) {
        const resolved = graph.nodes.get(nodeId)

        if (
          nodeSlots.get(nodeId) === slot &&
          slot.entry.renderer.kind !== 'awaiting-factory' &&
          slot.entry.state === 'owned' &&
          resolved !== undefined
        ) {
          applyNodePosition(slot.entry.element, resolved.absolutePosition)
          refreshNodeRendererProps(slot.entry, resolved.node, graph)
        }
      }

      updateToolbarAnchors(pass)

      if (projectionMatches(pass, { kind: 'minimap' })) {
        updateCanvasMinimap(pass)
      }

      for (const listener of renderedPositionListeners) {
        reportBoundaryCallback(
          'Rendered positions observer',
          'rendered-positions',
          callObserver,
          listener
        )
      }

      return graph
    }

    const renderGraphEdges = (pass = captureProjection()): boolean => {
      renderGraphPositions(pass)

      if (!projectionMatches(pass, { kind: 'graph' })) {
        return false
      }

      edgeRenderer.reconcile(pass)

      return projectionMatches(pass, { kind: 'graph' })
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

    /**
     * True when appending `element` after `previous` would not change the
     * node order: it already follows the previously placed node, or, for the
     * first node, only node elements follow it. Node drags keep the original
     * append-everything order, so this only applies while no node moves.
     */
    const nodeElementInPlace = (
      element: HTMLElement,
      previous: HTMLElement | null
    ): boolean => {
      if (
        element.parentElement !== viewport ||
        interactionSlots.activeDrag !== null ||
        interactionSlots.activeNodeResize !== null ||
        activeKeyboardResize !== null
      ) {
        return false
      }

      if (previous !== null) {
        return element.previousElementSibling === previous
      }

      for (
        let sibling = element.nextElementSibling;
        sibling !== null;
        sibling = sibling.nextElementSibling
      ) {
        if (!sibling.classList.contains('flow-node')) {
          return false
        }
      }

      return true
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

    interface NodeSample {
      readonly drag: NonNullable<FlowInteractionSlots['activeDrag']>
      readonly session: NonNullable<ReturnType<typeof sessionFor>>
      readonly pointerId: number
      readonly rawClient: XYPosition
      readonly canvasPoint: XYPosition
    }

    interface NodeFrameTicket {
      readonly drag: NodeSample['drag']
      readonly pointerId: number
      readonly registrationScope: Scope.Closeable
      state:
        | {
            readonly kind: 'registering'
            latestSample: NodeSample
            delivery:
              | { readonly kind: 'none' }
              | { readonly kind: 'early'; readonly timestamp: number }
          }
        | {
            readonly kind: 'scheduled'
            readonly handle: number
            latestSample: NodeSample
          }
        | { readonly kind: 'executing'; readonly sample: NodeSample }
        | { readonly kind: 'revoked' }
    }

    let nodeFrame: NodeFrameTicket | undefined
    let connectionPointer: XYPosition | null = null
    let connectionPointerStart: XYPosition | null = null
    let connectionFrame: number | null = null
    let hoveredConnectionHandle: HTMLElement | null = null

    let connectionPreview: SVGSVGElement | null = null
    let connectionLine: SVGLineElement | null = null
    let connectionPreviewState: ConnectionPreviewState | null = null
    const touchPointers = new Map<number, XYPosition>()
    let selectionOverlay: HTMLDivElement | null = null
    let selectionPointer: XYPosition | null = null
    let selectionFrame: number | null = null
    let interactionMode: 'select' | 'pan' = 'select'

    /**
     * `gesture` marks a click that ends a node drag, resize, pan or
     * connection. It also suppresses the click callbacks, as React Flow does.
     * Without it the release already handled selection, so only canvas
     * selection skips the click.
     */
    interface ClickSuppressionReceipt {
      readonly kind: 'click-suppression'
      readonly gesture: boolean
    }

    let clickSuppression: ClickSuppressionReceipt | null = null

    let clickStart:
      | {
          readonly x: number
          readonly y: number
          readonly kind: 'pane' | 'node' | 'edge'
          readonly pointerId: number
          maxDistance: number
        }
      | undefined

    const clickWithinDistance = (event: MouseEvent): boolean => {
      const start = clickStart
      clickStart = undefined

      if (start === undefined || event.detail === 0) {
        return true
      }

      let distance: number | undefined

      if (start.kind === 'node') {
        distance = options.nodeClickDistance
      } else if (start.kind === 'pane') {
        distance = options.paneClickDistance
      }

      return (
        distance === undefined ||
        Math.max(
          start.maxDistance,
          Math.hypot(event.clientX - start.x, event.clientY - start.y)
        ) <= distance
      )
    }

    const suppressClickThroughDispatch = (gesture = false): void => {
      const receipt: ClickSuppressionReceipt = {
        kind: 'click-suppression',
        gesture,
      }

      clickSuppression = receipt
      globalThis.setTimeout(() => {
        if (clickSuppression === receipt) {
          clickSuppression = null
        }
      }, 0)
    }

    const suppressClickUntilPointerUp = (gesture = false): void => {
      clickSuppression = { kind: 'click-suppression', gesture }
    }

    type VanillaRecords = FlowInteractionSlots & {
      pendingConnection: PendingConnection | null
      activeClickConnection: ActiveClickConnection | null
      activeKeyboardResize: ActiveKeyboardResize | null
      activeKeyboardNodeDrag: FlowNodeDragPayload | null
    }

    type VanillaActor = {
      [K in keyof VanillaRecords]: {
        readonly kind: K
        readonly record: NonNullable<VanillaRecords[K]>
      }
    }[keyof VanillaRecords]

    interface CapturedTouch {
      readonly pointerId: number
      readonly point: XYPosition
    }

    interface CaptureReceipt {
      readonly target: HTMLElement
      readonly pointerId: number
    }

    type VanillaResource =
      | {
          readonly kind: 'click-source'
          readonly element: HTMLElement
        }
      | {
          readonly kind: 'node-frame'
          readonly ticket: NodeFrameTicket
        }
      | {
          readonly kind: 'connection-frame' | 'selection-frame'
          readonly handle: number
        }
      | {
          readonly kind: 'preview'
          readonly element: SVGSVGElement
          readonly line: SVGLineElement | null
          readonly hover: HTMLElement | null
        }
      | {
          readonly kind: 'selection-overlay'
          readonly element: HTMLDivElement
          readonly point: XYPosition | null
        }
      | {
          readonly kind: 'viewport'
          readonly owner: VanillaObservation
          readonly viewport: Viewport
        }

    interface CapturedActor {
      readonly actor: VanillaActor
      readonly captures: readonly CaptureReceipt[]
      readonly resources: readonly VanillaResource[]
    }

    interface EntryOwners {
      readonly actors: readonly CapturedActor[]
      readonly touches: readonly CapturedTouch[]
      readonly suppression: ClickSuppressionReceipt | null
    }

    interface DispatchEntry {
      readonly event: PointerEvent | KeyboardEvent
      readonly owners: EntryOwners
      readonly matchedAtEntry: boolean
    }

    // eslint-disable-next-line prefer-const -- Cancellation binds once after its actor-specific terminal functions and before input listeners.
    let cancelCaptured: (owners: EntryOwners, reason: string) => void

    const terminalDispatches = new WeakMap<Event, DispatchEntry>()

    const clickSourceElement = (
      connection: ActiveClickConnection
    ): HTMLElement | undefined =>
      [
        ...(entries
          .get(connection.source)
          ?.element.querySelectorAll<HTMLElement>('.flow-handle') ?? []),
      ].find((element) => element.dataset.handleId === connection.sourceHandle)

    const snapshotEntry = (pointerId?: number): EntryOwners => {
      const actors: CapturedActor[] = []

      const add = (
        actor: VanillaActor,
        target: HTMLElement | undefined,
        pointerIds: readonly number[]
      ): void => {
        if (pointerId !== undefined && !pointerIds.includes(pointerId)) {
          return
        }

        const resources: VanillaResource[] = []

        if (
          actor.kind === 'activeDrag' &&
          nodeFrame !== undefined &&
          nodeFrame.drag === actor.record
        ) {
          resources.push({ kind: 'node-frame', ticket: nodeFrame })
        }

        if (
          actor.kind === 'activeConnection' ||
          actor.kind === 'activeReconnection' ||
          actor.kind === 'activeClickConnection'
        ) {
          if (connectionFrame !== null) {
            resources.push({
              kind: 'connection-frame',
              handle: connectionFrame,
            })
          }

          if (connectionPreview !== null) {
            resources.push({
              kind: 'preview',
              element: connectionPreview,
              line: connectionLine,
              hover: hoveredConnectionHandle,
            })
          }
        }

        if (actor.kind === 'activeClickConnection') {
          const source = clickSourceElement(actor.record)

          if (source !== undefined) {
            resources.push({ kind: 'click-source', element: source })
          }
        }

        if (actor.kind === 'activeSelectionRect') {
          if (selectionFrame !== null) {
            resources.push({ kind: 'selection-frame', handle: selectionFrame })
          }

          if (selectionOverlay !== null) {
            resources.push({
              kind: 'selection-overlay',
              element: selectionOverlay,
              point: selectionPointer,
            })
          }
        }

        if (
          (actor.kind === 'activeViewportPan' ||
            actor.kind === 'activePinch') &&
          userViewportObservation !== null
        ) {
          resources.push({
            kind: 'viewport',
            owner: userViewportObservation,
            viewport: renderedViewport,
          })
        }

        actors.push({
          actor,
          resources,
          captures:
            target === undefined
              ? []
              : pointerIds.map((id) => ({ target, pointerId: id })),
        })
      }

      const drag = interactionSlots.activeDrag

      if (drag !== null) {
        add(
          { kind: 'activeDrag', record: drag },
          entries.get(dragAnchorId(drag))?.element,
          [drag.pointerId]
        )
      }

      const resize = interactionSlots.activeNodeResize

      if (resize !== null) {
        add(
          { kind: 'activeNodeResize', record: resize },
          entries.get(resize.nodeId)?.element,
          [resize.pointerId]
        )
      }

      if (activeKeyboardResize !== null) {
        add(
          { kind: 'activeKeyboardResize', record: activeKeyboardResize },
          undefined,
          []
        )
      }

      if (pendingConnection !== null) {
        add({ kind: 'pendingConnection', record: pendingConnection }, canvas, [
          pendingConnection.pointerId,
        ])
      }

      const connection = interactionSlots.activeConnection

      if (connection !== null) {
        add({ kind: 'activeConnection', record: connection }, canvas, [
          connection.pointerId,
        ])
      }

      const reconnect = interactionSlots.activeReconnection

      if (reconnect !== null) {
        add({ kind: 'activeReconnection', record: reconnect }, canvas, [
          reconnect.pointerId,
        ])
      }

      if (activeClickConnection !== null) {
        add(
          { kind: 'activeClickConnection', record: activeClickConnection },
          undefined,
          []
        )
      }

      const pan = interactionSlots.activeViewportPan

      if (pan !== null) {
        add({ kind: 'activeViewportPan', record: pan }, canvas, [pan.pointerId])
      }

      const pinch = interactionSlots.activePinch

      if (pinch !== null) {
        add({ kind: 'activePinch', record: pinch }, canvas, [
          pinch.firstPointerId,
          pinch.secondPointerId,
        ])
      }

      const selection = interactionSlots.activeSelectionRect

      if (selection !== null) {
        add({ kind: 'activeSelectionRect', record: selection }, canvas, [
          selection.pointerId,
        ])
      }

      if (activeKeyboardNodeDrag !== null) {
        add(
          { kind: 'activeKeyboardNodeDrag', record: activeKeyboardNodeDrag },
          undefined,
          []
        )
      }

      return {
        actors,
        suppression: clickSuppression,
        touches: touchPointers
          .entries()
          .filter(
            ([id]) =>
              pointerId === undefined ||
              id === pointerId ||
              actors.some(({ captures }) =>
                captures.some((receipt) => receipt.pointerId === id)
              )
          )
          .map(([id, point]) => ({ pointerId: id, point }))
          .toArray(),
      }
    }

    const actorOwned = (actor: VanillaActor): boolean => {
      switch (actor.kind) {
        case 'pendingConnection': {
          return pendingConnection === actor.record
        }

        case 'activeClickConnection': {
          return activeClickConnection === actor.record
        }

        case 'activeKeyboardResize': {
          return activeKeyboardResize === actor.record
        }

        case 'activeKeyboardNodeDrag': {
          return activeKeyboardNodeDrag === actor.record
        }

        default: {
          return interactionSlots[actor.kind] === actor.record
        }
      }
    }

    const rememberDispatch = (event: PointerEvent | KeyboardEvent): void => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') {
        return
      }

      const owners = snapshotEntry(
        event instanceof PointerEvent ? event.pointerId : undefined
      )

      const matching: EntryOwners =
        event.type === 'lostpointercapture' && event instanceof PointerEvent
          ? {
              ...owners,
              actors: owners.actors.filter(({ captures }) =>
                captures.some(
                  ({ target, pointerId }) =>
                    pointerId === event.pointerId &&
                    target === event.target &&
                    !target.hasPointerCapture(pointerId)
                )
              ),
            }
          : owners

      terminalDispatches.set(event, {
        event,
        owners: matching,
        matchedAtEntry: matching.actors.length > 0,
      })
    }

    const dispatchOwns = (event: Event, kind: VanillaActor['kind']): boolean =>
      terminalDispatches
        .get(event)
        ?.owners.actors.some(
          ({ actor }) => actor.kind === kind && actorOwned(actor)
        ) === true

    // eslint-disable-next-line func-style -- Reconciliation calls this private cancellation entry before its lexical declaration.
    function cancelSelectionGesture(reason: string, pointerId?: number): void {
      const owners = snapshotEntry(pointerId)
      cancelCaptured(
        {
          ...owners,
          actors: owners.actors.filter(
            ({ actor }) => actor.kind === 'activeSelectionRect'
          ),
        },
        reason
      )
    }

    // eslint-disable-next-line func-style -- Actor cancellation entries are hoisted for earlier input and reconciliation callers.
    function cancelActorKind(kind: VanillaActor['kind'], reason: string): void {
      const owners = snapshotEntry()
      cancelCaptured(
        {
          ...owners,
          actors: owners.actors.filter(({ actor }) => actor.kind === kind),
          touches: [],
        },
        reason
      )
    }

    const cancelCapturedEscape = (event: KeyboardEvent): boolean => {
      const entry = terminalDispatches.get(event)

      if (entry === undefined || entry.event !== event) {
        return false
      }

      cancelCaptured(entry.owners, 'escape')

      return entry.matchedAtEntry
    }

    // eslint-disable-next-line prefer-const -- Assigned after the operations object is initialized.
    let reconcileVisible: (() => void) | undefined

    const clearPendingConnection = (): void => {
      if (pendingConnection !== null) {
        suppressClickUntilPointerUp(true)
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
            const measuredDocument = document
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

            if (
              !destroyed &&
              document === measuredDocument &&
              entries.get(node.id) === currentEntry &&
              !isDraggingNode(node.id)
            ) {
              restoreAdoptedPosition(node)
            }
          }
        }

        let projectionCurrent: (() => boolean) | undefined

        if (acceptedMeasurements.length > 0) {
          measurementState = applyNodeMeasurements(
            document,
            measurementState,
            acceptedMeasurements
          )
          measurements = getFlowMeasuredNodes(document, measurementState)
          scheduleMeasuredDimensions()
          const pass = captureProjection()
          projectionCurrent = () => projectionMatches(pass, { kind: 'graph' })
          renderGraphPositions(pass)
        }

        if (projectionCurrent !== undefined && !projectionCurrent()) {
          return
        }

        if (options.renderOnlyVisible === true) {
          reconcileVisible?.()
        } else {
          edgeRenderer.reconcile(captureProjection())
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
        Scope.provide(hostBrowserScope),
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
      const drag = interactionSlots.activeDrag
      const sample = nodeSample
      const frame = nodeFrame
      const connection = interactionSlots.activeConnection
      const reconnect = interactionSlots.activeReconnection
      const retained = activeClickConnection
      const connectionPoint = connectionPointer
      const connectionHandle = connectionFrame
      const pan = interactionSlots.activeViewportPan
      const pinch = interactionSlots.activePinch
      const selection = interactionSlots.activeSelectionRect
      const selectionPoint = selectionPointer
      const selectionHandle = selectionFrame
      const request = activeViewportOperation
      const touches = new Map(touchPointers)

      const ownerCurrent = (): boolean =>
        drag === interactionSlots.activeDrag &&
        sample === nodeSample &&
        frame === nodeFrame &&
        connection === interactionSlots.activeConnection &&
        reconnect === interactionSlots.activeReconnection &&
        retained === activeClickConnection &&
        connectionPoint === connectionPointer &&
        connectionHandle === connectionFrame &&
        pan === interactionSlots.activeViewportPan &&
        pinch === interactionSlots.activePinch &&
        selection === interactionSlots.activeSelectionRect &&
        selectionPoint === selectionPointer &&
        selectionHandle === selectionFrame &&
        request === activeViewportOperation &&
        touches.size === touchPointers.size &&
        [...touches].every(([id, point]) => touchPointers.get(id) === point)

      renderedViewport = constrainViewport(next)
      applyViewport(viewport, renderedViewport)

      const paintPass = captureProjection(document, {
        kind: 'viewport',
        document,
        owners: interactionSessions,
        request,
        retained,
      })

      const current = () => projectionMatches(paintPass, { kind: 'viewport' })
      emitViewportObservation('change', renderedViewport)

      if (!ownerCurrent() || !current()) {
        return
      }

      renderGraphPositions(paintPass)

      if (!ownerCurrent() || !current()) {
        return
      }

      edgeRenderer.reconcile(paintPass, undefined, true)

      if (options.renderOnlyVisible === true) {
        reconcileVisible?.()
      }
    }

    const hasSelectedAncestor = (node: FlowNode): boolean => {
      let { parentId } = node

      while (parentId !== undefined) {
        const parent = findNode(parentId)

        if (
          parent?.selected === true &&
          isNodeDraggable(interactivity, parent)
        ) {
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
          isNodeDraggable(interactivity, candidate) &&
          !hasSelectedAncestor(candidate)
      )

    const nodeIsDraggable = (id: NodeId): boolean => {
      const candidate = findNode(id)

      return (
        candidate !== undefined && isNodeDraggable(interactivity, candidate)
      )
    }

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

      const handle = flowNodeHandles(node).find(
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

        const handle = flowNodeHandles(node).find(
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

      const targetHandle = flowNodeHandles(targetNode).find(
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
        ) !== undefined ||
        !handleGestureConnectable(
          document,
          {
            fromNodeId: source.source,
            fromHandleId: source.sourceHandle,
            toNodeId: targetNode.id,
            toHandleId: targetHandle.id,
          },
          interactivity
        )
      ) {
        return false
      }

      try {
        return options.isValidConnection?.(candidate) ?? true
      } catch {
        return false
      }
    }

    const connectionLineOrigin = ():
      | { readonly nodeId: NodeId; readonly handleId: string }
      | undefined => {
      const active = interactionSlots.activeConnection ?? activeClickConnection

      return active === null
        ? undefined
        : { nodeId: active.source, handleId: active.sourceHandle }
    }

    const currentConnectionState = (): FlowConnectionState =>
      flowConnectionState({
        document,
        preview: connectionPreviewState,
        origin: connectionLineOrigin(),
      })

    /** Apply runtime switches, restyle handles and push node props. */
    const applyInteractivity = (next: FlowInteractivityInput): void => {
      const resolved: FlowInteractivity = {
        nodesDraggable: next.nodesDraggable ?? interactivity.nodesDraggable,
        nodesConnectable:
          next.nodesConnectable ?? interactivity.nodesConnectable,
        elementsSelectable:
          next.elementsSelectable ?? interactivity.elementsSelectable,
      }

      if (
        resolved.nodesDraggable === interactivity.nodesDraggable &&
        resolved.nodesConnectable === interactivity.nodesConnectable &&
        resolved.elementsSelectable === interactivity.elementsSelectable
      ) {
        return
      }

      interactivity = resolved

      for (const button of canvas.querySelectorAll<HTMLElement>(
        '.flow-handle'
      )) {
        const owner = document.nodes.find(
          ({ id }) => id === button.dataset.nodeId
        )

        const handle = flowNodeHandles(owner).find(
          ({ id }) => id === button.dataset.handleId
        )

        if (owner !== undefined && handle !== undefined) {
          markHandleConnectability(button, owner, handle, interactivity)
        }
      }

      const graph = graphFor()

      for (const [id, entry] of entries) {
        const node = findNode(id)
        refreshNodeRendererProps(entry, node, graph)

        if (node !== undefined) {
          applyNodeInteractionState(entry.element, node, {
            nodesFocusable: options.nodesFocusable,
            descriptionId: a11yDescriptions.nodeDescriptionId,
            interactivity,
            hasPointerHandlers:
              options.onNodeClick !== undefined ||
              options.onNodeMouseEnter !== undefined ||
              options.onNodeMouseMove !== undefined ||
              options.onNodeMouseLeave !== undefined,
            noPanClassName: options.noPanClassName,
          })
        }
      }

      edgeRenderer.reconcile(captureProjection())

      const attributes = {
        [FlowAttribute.nodesDraggable]: interactivity.nodesDraggable,
        [FlowAttribute.nodesConnectable]: interactivity.nodesConnectable,
        [FlowAttribute.elementsSelectable]: interactivity.elementsSelectable,
      }

      runTelemetry(
        Effect.logDebug('Changed flow interactivity').pipe(
          Effect.annotateLogs(attributes),
          Effect.withSpan(FlowSpan.interactivityChange, { attributes })
        )
      )

      for (const listener of interactivityListeners) {
        reportBoundaryCallback(
          'Interactivity change',
          'interactivity',
          listener,
          interactivity
        )
      }
    }

    const connectionLineGraph = createFlowGraphCache()

    /**
     * Line props are only built when a custom preview or a typed built-in
     * line consumes them, from a graph cached per document and measurements.
     */
    const connectionLineProps = (
      value: ConnectionPreviewState | null,
      customPreview: boolean
    ): FlowConnectionLineProps | null =>
      value === null ||
      (!customPreview && options.connectionLineType === undefined)
        ? null
        : (flowConnectionLineProps({
            graph: connectionLineGraph(
              document,
              measurements,
              renderedNodePositions
            ),
            preview: value,
            connectionLineType: options.connectionLineType ?? 'straight',
            origin: connectionLineOrigin(),
          }) ?? null)

    const publishConnectionPreview = (
      preview: ConnectionPreviewState | null,
      element = connectionPreview
    ): void => {
      const value = createConnectionPreviewSnapshot(preview)
      connectionPreviewState = value

      if (value !== null) {
        lastConnectionState = currentConnectionState()
      }

      const previewListeners = [...connectionPreviewListeners]

      for (const listener of previewListeners) {
        if (destroyed || !connectionPreviewListeners.has(listener)) {
          continue
        }

        try {
          listener(value)
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

      const line = connectionLineProps(
        value,
        element !== null && options.connectionPreview !== undefined
      )

      if (options.connectionLineType !== undefined && line !== null) {
        element
          ?.querySelector('.flow-connection-preview-path')
          ?.setAttribute('d', line.path)
      }

      if (element === null || options.connectionPreview === undefined) {
        return
      }

      try {
        options.connectionPreview(value, element, line)
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

      const targetHandle = flowNodeHandles(targetNode).find(
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

      const handle = flowNodeHandles(node).find(
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
      const element = connectionPreview
      connectionPreview = null
      connectionLine = null
      element?.remove()
      publishConnectionPreview(null, element)
    }

    const notifyConnectStart = (connection: FlowConnectStartPayload): void => {
      connectionEndEvent = undefined

      if (
        connection.inputKind === 'click-connect' &&
        options.onClickConnectStart !== undefined
      ) {
        reportBoundaryCallback(
          'Click connection start',
          connection.inputKind,
          options.onClickConnectStart,
          connection
        )
      }

      if (options.onConnectStart !== undefined) {
        reportBoundaryCallback(
          'Connection start',
          connection.inputKind,
          options.onConnectStart,
          connection
        )
      }
    }

    /** React Flow `FinalConnectionState`, release position and event for end payloads. */
    const connectionEndDetails = (): FlowConnectionEndDetails => {
      const event = connectionEndEvent
      const connectionState = flowFinalConnectionState(lastConnectionState)
      lastConnectionState = flowNoConnection
      connectionEndEvent = undefined

      if (!(event instanceof MouseEvent)) {
        return { connectionState, event }
      }

      const clientPosition = { x: event.clientX, y: event.clientY }

      return {
        connectionState,
        clientPosition,
        position: screenToFlowPosition(
          pointerInCanvas(event),
          renderedViewport
        ),
        event,
      }
    }

    const notifyConnectEnd = (connection: FlowConnectEndPayload): void => {
      const details = connectionEndDetails()

      if (
        connection.inputKind === 'click-connect' &&
        options.onClickConnectEnd !== undefined
      ) {
        reportBoundaryCallback(
          'Click connection end',
          connection.inputKind,
          (payload: FlowConnectEndPayload) =>
            options.onClickConnectEnd?.(payload, details),
          connection
        )
      }

      const { onConnectEnd } = options

      if (onConnectEnd !== undefined) {
        reportBoundaryCallback(
          'Connection end',
          connection.inputKind,
          (payload: FlowConnectEndPayload) => onConnectEnd(payload, details),
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
      const details = connectionEndDetails()
      const { onReconnectEnd } = options

      if (onReconnectEnd !== undefined) {
        reportBoundaryCallback(
          'Reconnection end',
          'pointer-reconnect',
          (payload: FlowReconnectEndPayload) =>
            onReconnectEnd(payload, details),
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
      applyFlowStyle(preview, options.connectionLineContainerStyle)

      const line = globalThis.document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      )

      line.setAttribute('x1', String(start.x))
      line.setAttribute('y1', String(start.y))
      line.setAttribute('x2', String(start.x))
      line.setAttribute('y2', String(start.y))

      if (
        options.connectionPreview !== undefined ||
        options.connectionLineType !== undefined
      ) {
        line.setAttribute('display', 'none')
      }

      applyFlowStyle(line, options.connectionLineStyle)
      preview.append(line)

      if (
        options.connectionPreview === undefined &&
        options.connectionLineType !== undefined
      ) {
        const typedLine = globalThis.document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path'
        )

        typedLine.classList.add('flow-connection-preview-path')
        typedLine.dataset.connectionLineType = options.connectionLineType
        applyFlowStyle(typedLine, options.connectionLineStyle)
        preview.append(typedLine)
      }

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
      const capturedPointerId = connectionCapture
      connectionCapture = null
      const element = connectionPreview
      connectionPreview = null
      connectionLine = null

      if (capturedPointerId !== null) {
        runEffect(browser.releasePointer(canvas, capturedPointerId))
      }

      element?.remove()
      publishConnectionPreview(null, element)

      return connection
    }

    const cancelConnection = (reason: string): void =>
      cancelActorKind('activeConnection', reason)

    const notifyCancelConnection = (
      connection: ActiveConnection,
      reason: string
    ): void => {
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

      const source = entries.get(connection.source)

      for (const handle of source?.element.querySelectorAll<HTMLElement>(
        '.flow-handle'
      ) ?? []) {
        if (handle.dataset.handleId === connection.sourceHandle) {
          handle.classList.remove('connecting')
        }
      }

      removeConnectionPreview()

      return connection
    }

    const cancelClickConnection = (reason: string): void =>
      cancelActorKind('activeClickConnection', reason)

    const notifyCancelClickConnection = (
      connection: ActiveClickConnection,
      reason: string
    ): void => {
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
      const capturedPointerId = connectionCapture
      connectionCapture = null
      const element = connectionPreview
      connectionPreview = null
      connectionLine = null

      if (capturedPointerId !== null) {
        runEffect(browser.releasePointer(canvas, capturedPointerId))
      }

      element?.remove()
      publishConnectionPreview(null, element)

      return reconnect
    }

    const cancelReconnection = (reason: string): void =>
      cancelActorKind('activeReconnection', reason)

    const notifyCancelReconnection = (
      reconnect: ActiveEdgeReconnect,
      reason: string
    ): void => {
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

      const handle = flowNodeHandles(node).find(
        ({ id, kind }) => id === identity.handleId && kind === identity.kind
      )

      if (
        (node?.connectable === false && handle?.connectable !== true) ||
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
        canReconnectEdge(
          reconnectableEdge(edge, options.edgesReconnectable),
          pending.endpoint
        ) &&
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
        const fromNode = next.nodes.find(({ id }) => id === pending.from.nodeId)

        const fromHandle = flowNodeHandles(fromNode).find(
          ({ id }) => id === pending.from.handleId
        )

        return (
          fromNode !== undefined &&
          fromHandle !== undefined &&
          isHandleConnectable(interactivity, fromNode, fromHandle, 'start') &&
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
      if (destroyed) {
        return
      }

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
      if (destroyed) {
        return
      }

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
        !canReconnectEdge(
          reconnectableEdge(edge, options.edgesReconnectable),
          endpoint
        ) ||
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
      if (destroyed) {
        return
      }

      if (
        !isHandleConnectable(interactivity, node, handle, 'start') ||
        event.button !== 0 ||
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

    const scheduleConnectionFrame = (
      active: NonNullable<FlowInteractionSlots['activeConnection']>
    ): void => {
      const handle = globalThis.requestAnimationFrame(() => {
        if (
          destroyed ||
          connectionFrame !== handle ||
          interactionSlots.activeConnection !== active
        ) {
          return
        }

        connectionFrame = null
        const pointer = connectionPointer

        if (pointer === null) {
          return
        }

        const delta = selectionAutoPanDelta(
          pointer,
          canvas.clientWidth,
          canvas.clientHeight,
          40,
          options.autoPanSpeed ?? 15
        )

        if (delta.x === 0 && delta.y === 0) {
          return
        }

        const previous = renderedViewport
        renderViewport(panViewport(renderedViewport, delta))

        if (
          destroyed ||
          interactionSlots.activeConnection !== active ||
          connectionFrame !== null ||
          connectionPointer !== pointer
        ) {
          return
        }

        if (
          renderedViewport.x === previous.x &&
          renderedViewport.y === previous.y
        ) {
          return
        }

        const bounds = canvas.getBoundingClientRect()
        updatePointerConnectionPreview(
          active,
          bounds.left + pointer.x,
          bounds.top + pointer.y
        )

        if (
          !destroyed &&
          interactionSlots.activeConnection === active &&
          connectionFrame === null &&
          connectionPointer === pointer
        ) {
          scheduleConnectionFrame(active)
        }
      })

      connectionFrame = handle
    }

    const revokeNodeFrame = (ticket: NodeFrameTicket): void => {
      ticket.state = { kind: 'revoked' }

      if (nodeFrame === ticket) {
        nodeFrame = undefined
      }

      runEffect(Scope.close(ticket.registrationScope, Exit.void))
    }

    const cancelNodeDragFrame = (): void => {
      nodeSample = undefined

      if (nodeFrame !== undefined) {
        revokeNodeFrame(nodeFrame)
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

    /**
     * React `expandParent`: every drag or resize step grows (and for up/left
     * moves, shifts) the parent around the child and compensates its other
     * children; React commits each step. Vanilla previews the growth and
     * commits it with the gesture in one proposal. `base` is the graph at
     * gesture start; growth is computed against it with the union of every
     * rectangle so far, so the parent never shrinks back within a gesture.
     */
    interface ExpandParentPreview {
      readonly base: FlowGraphView
      readonly expanded: Map<NodeId, FlowRect>
      readonly parents: Map<
        NodeId,
        {
          position: XYPosition
          size: { readonly width: number; readonly height: number }
        }
      >
      readonly siblings: Map<NodeId, XYPosition>
    }

    /** Previews by gesture record (node drag or node resize). */
    const expandParentPreviews = new WeakMap<
      ExpandParentGesture,
      ExpandParentPreview
    >()

    const expandsParent = (nodeId: NodeId): boolean => {
      const node = findNode(nodeId)

      return node?.expandParent === true && node.parentId !== undefined
    }

    /** The parent's absolute top-left in the preview. */
    const previewParentTopLeft = (
      preview: ExpandParentPreview,
      parentId: NodeId
    ): XYPosition | undefined => {
      const parent = preview.base.nodes.get(parentId)

      if (parent === undefined) {
        return undefined
      }

      const moved = preview.parents.get(parentId)

      if (moved === undefined) {
        return parent.absolutePosition
      }

      const origin = resolveNodeOrigin(parent.node, document)

      const stored = nodeAnchorToTopLeft(
        parent.node.position,
        parent.dimensions,
        origin
      )

      const next = nodeAnchorToTopLeft(moved.position, moved.size, origin)

      return {
        x: parent.absolutePosition.x - stored.x + next.x,
        y: parent.absolutePosition.y - stored.y + next.y,
      }
    }

    /** Grow the parents of `children` (stored, unclamped positions) for one step. */
    // eslint-disable-next-line complexity -- one pass maps each core change kind onto the preview.
    const growExpandParents = (
      gesture: ExpandParentGesture,
      children: readonly {
        readonly node: FlowNode
        readonly position: XYPosition
        readonly size: { readonly width: number; readonly height: number }
      }[]
    ): void => {
      let preview = expandParentPreviews.get(gesture)

      if (preview === undefined) {
        preview = {
          base: createFlowGraph(document, measurements),
          expanded: new Map(),
          parents: new Map(),
          siblings: new Map(),
        }
        expandParentPreviews.set(gesture, preview)
      }

      const current = preview
      const rects: FlowExpandParentChild[] = []

      for (const { node, position, size } of children) {
        const parentTopLeft =
          node.parentId === undefined
            ? undefined
            : previewParentTopLeft(current, node.parentId)

        if (node.parentId === undefined || parentTopLeft === undefined) {
          continue
        }

        const topLeft = nodeAnchorToTopLeft(
          position,
          size,
          resolveNodeOrigin(node, document)
        )

        rects.push({
          id: node.id,
          parentId: node.parentId,
          rect: {
            x: parentTopLeft.x + topLeft.x,
            y: parentTopLeft.y + topLeft.y,
            ...size,
          },
        })
      }

      // Earlier steps' growth stays: their union rides along as one more child.
      const previous = [...current.expanded].flatMap(([parentId, rect]) => {
        const child = rects.find((item) => item.parentId === parentId)

        return child === undefined ? [] : [{ ...child, rect }]
      })

      for (const { parentId, rect } of rects) {
        const parent = current.base.nodes.get(parentId)

        if (parent !== undefined) {
          current.expanded.set(
            parentId,
            unionRect(
              current.expanded.get(parentId) ?? {
                ...parent.absolutePosition,
                ...parent.dimensions,
              },
              rect
            )
          )
        }
      }

      const parentIds = new Set(rects.map(({ parentId }) => parentId))

      for (const change of calculateFlowExpandParent(current.base, [
        ...rects,
        ...previous,
      ])) {
        const parentPreview = current.parents.get(change.nodeId)

        if (change.kind === 'size') {
          const parent = current.base.nodes.get(change.nodeId)
          const entry = entries.get(change.nodeId)

          current.parents.set(change.nodeId, {
            position: parentPreview?.position ??
              parent?.node.position ?? {
                x: 0,
                y: 0,
              },
            size: change.size,
          })

          if (entry !== undefined) {
            entry.element.style.width = `${change.size.width}px`
            entry.element.style.height = `${change.size.height}px`
            entry.element.style.boxSizing = 'border-box'
            entry.element.dataset.sized = 'true'
          }

          acceptMeasurement(change.nodeId, change.size)
        } else if (parentIds.has(change.nodeId)) {
          current.parents.set(change.nodeId, {
            position: change.position,
            size: parentPreview?.size ??
              current.base.nodes.get(change.nodeId)?.dimensions ?? {
                width: 0,
                height: 0,
              },
          })
          renderedNodePositions.set(change.nodeId, change.position)
        } else {
          current.siblings.set(change.nodeId, change.position)
          renderedNodePositions.set(change.nodeId, change.position)
        }
      }
    }

    /**
     * One drag step: React `updateNodePositions` clamps an `expandParent`
     * child at its parent's origin and grows the parent from the unclamped
     * rectangle. Returns the positions to preview.
     */
    const previewExpandParent = (
      drag: ActiveNodeDrag | ActiveNodeGroupDrag,
      items: readonly {
        readonly nodeId: NodeId
        readonly position: XYPosition
      }[]
    ): readonly {
      readonly nodeId: NodeId
      readonly position: XYPosition
    }[] => {
      const growing = items.flatMap((item) => {
        const node = findNode(item.nodeId)

        return node?.expandParent === true && node.parentId !== undefined
          ? [{ node, position: item.position, size: dimensionsForNode(node) }]
          : []
      })

      if (growing.length === 0) {
        return items
      }

      growExpandParents(drag, growing)

      return items.map((item) =>
        expandsParent(item.nodeId)
          ? {
              nodeId: item.nodeId,
              position: {
                x: Math.max(0, item.position.x),
                y: Math.max(0, item.position.y),
              },
            }
          : item
      )
    }

    /** Drop a gesture's expand-parent preview after its commit or cancel. */
    const revertExpandParentPreview = (
      gesture: ExpandParentGesture | undefined
    ): void => {
      const preview =
        gesture === undefined ? undefined : expandParentPreviews.get(gesture)

      if (gesture === undefined || preview === undefined) {
        return
      }

      expandParentPreviews.delete(gesture)

      for (const nodeId of [
        ...preview.parents.keys(),
        ...preview.siblings.keys(),
      ]) {
        const node = findNode(nodeId)
        const entry = entries.get(nodeId)

        if (node === undefined) {
          continue
        }

        restoreAdoptedPosition(node)

        if (entry !== undefined && preview.parents.has(nodeId)) {
          applyDeclaredNodeSize(entry.element, node)
          recordNodeMeasurement(node, entry.element)
        }
      }
    }

    /**
     * The gesture's own change plus every grown parent as one proposal, so
     * an owner that applies only the latest proposal keeps all of it (React
     * batches these node changes). Without growth it is the change itself.
     */
    const withExpandParentCommit = (
      gesture: ExpandParentGesture,
      change: FlowChange
    ): FlowChange => {
      const preview = expandParentPreviews.get(gesture)

      if (preview === undefined || preview.parents.size === 0) {
        return change
      }

      let proposed = applyFlowChangeToDocument(document, change) ?? document

      for (const [nodeId, parent] of preview.parents) {
        proposed =
          applyNodeBoundsChange(proposed, {
            kind: 'node-bounds',
            nodeId,
            position: parent.position,
            size: parent.size,
            childPositions: [...preview.siblings].flatMap(
              ([siblingId, position]) =>
                findNode(siblingId)?.parentId === nodeId
                  ? [{ nodeId: siblingId, position }]
                  : []
            ),
          }) ?? proposed
      }

      return {
        kind: 'edit-proposal',
        document: proposed,
        deletion: { deletedNodeIds: [], deletedEdgeIds: [] },
      }
    }

    const notifyNodeDragStop = (
      drag: ActiveNodeDrag | ActiveNodeGroupDrag,
      payload: FlowNodeDragPayload,
      outcome: FlowNodeDragStopPayload['outcome'],
      reason?: string
    ): void => {
      if (
        !callbackStartedNodeDrags.delete(drag) ||
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
      sample: NodeSample,
      point: XYPosition
    ): void => {
      if (!nodeSampleLive(sample)) {
        return
      }

      const { drag } = sample

      if ('positions' in drag) {
        const change = boundedGroupChange(
          drag,
          moveNodeGroupDrag(drag, point, options.snapGrid)
        )

        for (const { nodeId, position } of previewExpandParent(
          drag,
          change.positions
        )) {
          renderedNodePositions.set(nodeId, position)
        }

        const paintPass = captureProjection(document, { kind: 'node', sample })
        const current = () => projectionMatches(paintPass, { kind: 'graph' })
        renderGraphPositions(paintPass)

        if (!nodeSampleLive(sample) || !current()) {
          return
        }

        edgeRenderer.updatePositions(
          paintPass,
          new Set(change.positions.map(({ nodeId }) => nodeId))
        )
      } else {
        const bounded = boundedNodePosition(
          drag.nodeId,
          localPositionFromAbsolute(
            drag.nodeId,
            moveNodeDrag(drag, point, options.snapGrid)
          )
        )

        const [expanded] = previewExpandParent(drag, [
          { nodeId: drag.nodeId, position: bounded },
        ])

        renderedNodePositions.set(drag.nodeId, expanded?.position ?? bounded)
        const paintPass = captureProjection(document, { kind: 'node', sample })
        const current = () => projectionMatches(paintPass, { kind: 'graph' })
        renderGraphPositions(paintPass)

        if (!nodeSampleLive(sample) || !current()) {
          return
        }

        edgeRenderer.updatePositions(paintPass, new Set([drag.nodeId]))
      }

      if (
        nodeSampleLive(sample) &&
        callbackStartedNodeDrags.has(drag) &&
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

    const scheduleNodeFrame = (sample: NodeSample): void => {
      if (!nodeSampleLive(sample) || options.autoPanOnNodeDrag === false) {
        return
      }

      const admissionPoint = sample.canvasPoint

      if (
        admissionPoint.x < 0 ||
        admissionPoint.x > canvas.clientWidth ||
        admissionPoint.y < 0 ||
        admissionPoint.y > canvas.clientHeight
      ) {
        return
      }

      const admissionDelta = selectionAutoPanDelta(
        admissionPoint,
        canvas.clientWidth,
        canvas.clientHeight,
        40,
        options.autoPanSpeed ?? 15
      )

      if (admissionDelta.x === 0 && admissionDelta.y === 0) {
        return
      }

      const previousFrame = nodeFrame

      if (previousFrame !== undefined) {
        if (
          previousFrame.drag === sample.drag &&
          previousFrame.pointerId === sample.pointerId &&
          (previousFrame.state.kind === 'scheduled' ||
            previousFrame.state.kind === 'registering')
        ) {
          previousFrame.state.latestSample = sample

          return
        }

        revokeNodeFrame(previousFrame)

        if (!nodeSampleLive(sample)) {
          return
        }
      }

      const registrationScope = runEffect(
        Scope.fork(hostBrowserScope, 'sequential')
      )

      const ticket: NodeFrameTicket = {
        drag: sample.drag,
        pointerId: sample.pointerId,
        registrationScope,
        state: {
          kind: 'registering',
          latestSample: sample,
          delivery: { kind: 'none' },
        },
      }

      nodeFrame = ticket

      const deliver = (timestamp: number): void => {
        if (ticket.state.kind === 'registering') {
          ticket.state.delivery = { kind: 'early', timestamp }

          return
        }

        if (nodeFrame !== ticket || ticket.state.kind !== 'scheduled') {
          return
        }

        const executing = ticket.state.latestSample
        ticket.state = { kind: 'executing', sample: executing }

        try {
          runEffect(Scope.close(registrationScope, Exit.void))
        } catch (error) {
          ticket.state = { kind: 'revoked' }

          if (nodeFrame === ticket) {
            nodeFrame = undefined
          }

          throw error
        }

        if (
          nodeFrame !== ticket ||
          ticket.state.kind !== 'executing' ||
          !nodeSampleLive(executing)
        ) {
          return
        }

        const point = executing.canvasPoint

        const delta = selectionAutoPanDelta(
          point,
          canvas.clientWidth,
          canvas.clientHeight,
          40,
          options.autoPanSpeed ?? 15
        )

        const previous = renderedViewport
        renderViewport(panViewport(renderedViewport, delta))

        if (
          nodeFrame !== ticket ||
          ticket.state.kind !== 'executing' ||
          !nodeSampleLive(executing)
        ) {
          return
        }

        if (
          renderedViewport.x === previous.x &&
          renderedViewport.y === previous.y
        ) {
          return
        }

        updateNodeDragPreview(
          executing,
          screenToFlowPosition(point, renderedViewport)
        )

        if (
          nodeFrame !== ticket ||
          ticket.state.kind !== 'executing' ||
          !nodeSampleLive(executing)
        ) {
          return
        }

        nodeFrame = undefined
        ticket.state = { kind: 'revoked' }
        scheduleNodeFrame(executing)
      }

      try {
        const handle = runEffect(
          Scope.provide(
            browser.requestAnimationFrame(deliver),
            registrationScope
          )
        )

        if (ticket.state.kind !== 'registering' || nodeFrame !== ticket) {
          return
        }

        const { latestSample, delivery } = ticket.state
        ticket.state = { kind: 'scheduled', handle, latestSample }

        if (delivery.kind === 'early') {
          deliver(delivery.timestamp)
        }
      } catch (error) {
        revokeNodeFrame(ticket)
        throw error
      }
    }

    const onNodePointerCancel = (event: PointerEvent): void => {
      const entry = terminalDispatches.get(event)

      if (entry !== undefined) {
        cancelCaptured(entry.owners, 'pointer-cancel')
      }
    }

    const cancelActiveDrag = (reason: string): void =>
      cancelActorKind('activeDrag', reason)

    const notifyCancelledDrag = (
      drag: NonNullable<FlowInteractionSlots['activeDrag']>,
      payload: FlowNodeDragPayload,
      reason: string
    ): void => {
      const anchorId = dragAnchorId(drag)
      notifyNodeDragStop(drag, payload, 'cancelled', reason)

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

    const cancelNodeResize = (reason: string): void =>
      cancelActorKind('activeNodeResize', reason)

    const notifyCancelledResize = (
      resize: ActiveNodeResize,
      reason: string
    ): void => {
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
      restoreResizePrimitives(resize)

      if (!renderGraphEdges()) {
        return
      }

      const paintPass = captureProjection()
      const current = () => projectionMatches(paintPass, { kind: 'toolbar' })

      if (options.renderOnlyVisible === true) {
        reconcileVisible?.()
      }

      if (current() && focusFallback && canvas.isConnected) {
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

      if (renderGraphEdges() && options.renderOnlyVisible === true) {
        reconcileVisible?.()
      }
    }

    const cancelKeyboardResize = (
      reason: string,
      focusFallback = false,
      captured?: ActiveKeyboardResize
    ): boolean => {
      const resize = captured ?? activeKeyboardResize

      if (resize === null) {
        return false
      }

      if (activeKeyboardResize === resize) {
        activeKeyboardResize = null
      }

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

    const cancelViewportPan = (reason: string): void =>
      cancelActorKind('activeViewportPan', reason)

    /** Start a viewport pan for a pointer that began elsewhere, such as on a fixed node. */
    const beginPanFromPointer = (
      event: PointerEvent,
      start: XYPosition
    ): boolean => {
      if (
        destroyed ||
        interactionSlots.activeViewportPan !== null ||
        interactionSlots.activePinch !== null ||
        interactionSlots.activeSelectionRect !== null
      ) {
        return false
      }

      const admittedPan = beginViewportPan(
        renderedViewport,
        start,
        event.pointerId
      )

      interactionSlots.activeViewportPan = admittedPan
      beginUserViewportObservation()

      if (destroyed || interactionSlots.activeViewportPan !== admittedPan) {
        return false
      }

      if (!runEffect(browser.capturePointer(canvas, event.pointerId))) {
        cancelViewportPan('pointer-capture-failed')

        return false
      }

      canvas.classList.add('panning')
      suppressClickUntilPointerUp(true)

      return true
    }

    const notifyCancelViewportPan = (
      pan: ActiveViewportPan,
      reason: string
    ): void => {
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
        flowNodeHandles(endpointNode).some(
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
        !canReconnectEdge(
          reconnectableEdge(nextEdge, options.edgesReconnectable),
          endpoint
        ) ||
        (activeEdge !== undefined &&
          (nextEdge.source !== activeEdge.source ||
            nextEdge.sourceHandle !== activeEdge.sourceHandle ||
            nextEdge.target !== activeEdge.target ||
            nextEdge.targetHandle !== activeEdge.targetHandle))
      ) {
        cancelReconnection('edge-changed')
      }
    }

    /** A pointer resize from a registered control: React `XYResizer` state. */
    interface RegisteredResize {
      readonly registration: FlowNodeResizerRegistration
      readonly pointerStart: XYPosition
      session: FlowNodeResizeSession
      params: FlowResizeParams
      candidate: NodeBoundsChange
      resized: boolean
    }

    const registeredResizes = new WeakMap<ActiveNodeResize, RegisteredResize>()

    /** React `getPointerPosition`: the flow point, snapped when snapping is on. */
    const snappedFlowPoint = (point: XYPosition): XYPosition =>
      options.snapGrid === undefined
        ? point
        : snapPosition(point, options.snapGrid)

    /**
     * Begin a registered resize (React `XYResizer` drag start): the parent box
     * is the extent for `extent: 'parent'`, children compensate top/left
     * moves, and `expandParent` children clamp at the parent origin.
     */
    const beginRegisteredResize = (
      resize: ActiveNodeResize,
      registration: FlowNodeResizerRegistration,
      control: FlowResizeControlPosition,
      event: PointerEvent
    ): void => {
      const node = findNode(resize.nodeId)

      if (node === undefined) {
        return
      }

      const parent =
        node.parentId === undefined ? undefined : findNode(node.parentId)

      const parentSize =
        parent === undefined ? undefined : dimensionsForNode(parent)

      const start = {
        x: resize.positionStart.x,
        y: resize.positionStart.y,
        width: resize.sizeStart.width,
        height: resize.sizeStart.height,
      }

      const input: MutableResizeStart = {
        controlPosition: control,
        start,
        constraints: registration.constraints,
        nodeOrigin: resolveNodeOrigin(node, document),
        children: document.nodes.flatMap((child) =>
          child.parentId === node.id
            ? [{ id: child.id, position: child.position }]
            : []
        ),
        expandParent: node.parentId !== undefined && node.expandParent === true,
      }

      if (registration.resizeDirection !== undefined) {
        input.resizeDirection = registration.resizeDirection
      }

      if (node.extent === 'parent' && parentSize !== undefined) {
        input.extent = {
          minX: 0,
          minY: 0,
          maxX: parentSize.width,
          maxY: parentSize.height,
        }
      }

      if (resize.childExtent !== undefined) {
        input.childExtent = resize.childExtent
      }

      const session = startFlowNodeResize(input)

      registeredResizes.set(resize, {
        registration,
        pointerStart: snappedFlowPoint(resize.pointerStart),
        session,
        params: session.previous,
        candidate: {
          kind: 'node-bounds',
          nodeId: node.id,
          position: resize.positionStart,
          size: resize.sizeStart,
          childPositions: [],
        },
        resized: false,
      })

      if (registration.onResizeStart !== undefined) {
        reportBoundaryCallback(
          'Node resize start',
          'node-resize',
          (params: FlowResizeParams) =>
            registration.onResizeStart?.(event, params),
          session.previous
        )
      }
    }

    /** One registered resize step; `shouldResize` may veto it. */
    const registeredResizeCandidate = (
      resize: ActiveNodeResize,
      gesture: RegisteredResize,
      event: PointerEvent
    ): NodeBoundsChange => {
      const point = snappedFlowPoint(pointerInFlow(event))

      const { session, step } = stepFlowNodeResize(gesture.session, {
        x: point.x - gesture.pointerStart.x,
        y: point.y - gesture.pointerStart.y,
      })

      gesture.session = session

      if (
        step === undefined ||
        gesture.registration.shouldResize?.(event, step.params) === false
      ) {
        return gesture.candidate
      }

      gesture.params = {
        x: step.params.x,
        y: step.params.y,
        width: step.params.width,
        height: step.params.height,
      }
      gesture.resized = true

      const size = step.size ?? gesture.candidate.size
      let nextPosition = step.position ?? gesture.candidate.position
      const node = findNode(resize.nodeId)

      // React NodeResizeControl: an `expandParent` child grows its parent on
      // every step, then clamps at `origin * size` inside the grown parent.
      if (node?.expandParent === true && node.parentId !== undefined) {
        growExpandParents(resize, [{ node, position: nextPosition, size }])

        if (step.position !== undefined) {
          const origin = resolveNodeOrigin(node, document)

          nextPosition = {
            x: Math.max(origin[0] * size.width, nextPosition.x),
            y: Math.max(origin[1] * size.height, nextPosition.y),
          }
        }
      }

      gesture.candidate = {
        ...gesture.candidate,
        position: nextPosition,
        size,
        childPositions:
          step.childPositions.length === 0
            ? gesture.candidate.childPositions
            : step.childPositions.map(({ id, position }) => ({
                nodeId: id,
                position,
              })),
      }

      if (gesture.registration.onResize !== undefined) {
        reportBoundaryCallback(
          'Node resize',
          'node-resize',
          (params: FlowResizeParamsWithDirection) =>
            gesture.registration.onResize?.(event, params),
          step.params
        )
      }

      return gesture.candidate
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

        const captureVisibility = () => {
          const visibleNodes = new Set<NodeId>()
          let visibleEdges: Set<(typeof next.edges)[number]['id']> | null = null
          const visibleEdgeEndpointIds = new Set<NodeId>()
          const pass = captureProjection(next)
          const { graph } = pass

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

          const pinResizeOwner = (id: NodeId | undefined): void => {
            const owner = next.nodes.find((node) => node.id === id)

            if (
              id === undefined ||
              owner === undefined ||
              owner.hidden === true
            ) {
              return
            }

            visibleNodes.add(id)

            for (const node of next.nodes) {
              if (node.parentId === id && node.hidden !== true) {
                visibleNodes.add(node.id)
              }
            }
          }

          pinResizeOwner(interactionSlots.activeNodeResize?.nodeId)
          pinResizeOwner(activeKeyboardResize?.nodeId)

          const removalNodes = [...pass.cohort.nodes].filter(
            ([id]) => !nextIds.has(id) || !visibleNodes.has(id)
          )

          return { pass, graph, visibleNodes, visibleEdges, removalNodes }
        }

        // Project measurements against the incoming document before capturing
        // the pass; otherwise pruning below invalidates the pass it belongs to.
        measurementState = pruneFlowMeasurements(next, measurementState)
        measurements = getFlowMeasuredNodes(next, measurementState)

        let { pass, graph, visibleNodes, visibleEdges, removalNodes } =
          captureVisibility()

        const removalCohort = new Map(removalNodes)

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
          }
        }

        if (
          interactionSlots.activeNodeResize !== null &&
          !visibleNodes.has(interactionSlots.activeNodeResize.nodeId)
        ) {
          cancelNodeResize('node-removed')
        }

        if (interactionSlots.activeConnection !== null) {
          const source = next.nodes.find(
            (node) => node.id === interactionSlots.activeConnection?.source
          )

          const sourceStillExists = flowNodeHandles(source).some(
            (handle) =>
              handle.id === interactionSlots.activeConnection?.sourceHandle
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

          const handleExists = flowNodeHandles(source).some(
            (handle) =>
              handle.id === activeClickConnection?.sourceHandle &&
              handle.kind === 'source'
          )

          if (!handleExists || source?.hidden === true) {
            cancelClickConnection('source-removed')
          }
        }

        cancelStaleReconnection(next, previous)

        if (!projectionMatches(pass, { kind: 'visibility' })) {
          if (document !== next || destroyed) {
            return
          }

          const currentDecision = captureVisibility()

          ;({ pass, graph, visibleNodes, visibleEdges } = currentDecision)
          removalNodes = currentDecision.removalNodes.filter(
            ([id, slot]) => removalCohort.get(id) === slot
          )
        }

        edgeRenderer.setVisibleEdges(visibleEdges)

        const focusedElement = globalThis.document.activeElement

        const focusedNode =
          focusedElement instanceof HTMLElement
            ? focusedElement.closest<HTMLElement>('.flow-node')
            : null

        for (const [nodeId, capturedSlot] of removalNodes) {
          const { entry } = capturedSlot
          const expected = nodeSlots.get(nodeId)

          if (expected !== capturedSlot) {
            continue
          }

          if (expected === undefined) {
            continue
          }

          const reservation: Extract<NodeEntrySlot, { kind: 'reserved' }> = {
            kind: 'reserved',
            entry,
            operation: 'remove',
          }

          if (
            !installNodeReservation(
              nodeId,
              {
                expected: { kind: 'present', slot: expected },
                next: reservation,
              },
              pass
            )
          ) {
            continue
          }

          let retiredCurrent = false

          try {
            entry.release()
            retiredCurrent =
              nodeSlots.get(nodeId) === reservation &&
              projectionMatches(pass, { kind: 'visibility' })
          } finally {
            if (nodeSlots.get(nodeId) === reservation) {
              nodeSlots.delete(nodeId)
              pass.entryClaims.nodes.delete(nodeId)
            }
          }

          if (!retiredCurrent) {
            return
          }

          if (!nextIds.has(nodeId) || hiddenNextIds.has(nodeId)) {
            renderedNodePositions.delete(nodeId)
          }

          removed += 1
        }

        if (removed > 0) {
          measurementState = pruneFlowMeasurements(next, measurementState)
          measurements = getFlowMeasuredNodes(next, measurementState)
        }

        // Moving a node element detaches it, and Chrome then drops the pending
        // click; nodes that already sit in order stay put (see nodeElementInPlace).
        let placedNodeElement: HTMLElement | null = null

        const nodeStacking = computeFlowStacking({
          nodes: next.nodes,
          zIndexMode: options.zIndexMode ?? 'basic',
          elevateNodesOnSelect: options.elevateNodesOnSelect ?? true,
        }).nodes

        for (const graphNode of graph.orderedNodes) {
          const { node } = graphNode

          if (!visibleNodes.has(node.id)) {
            continue
          }

          const expected = pass.entryClaims.nodes.get(node.id)

          if (nodeSlots.get(node.id) !== expected) {
            return
          }

          let entry = expected?.kind === 'ready' ? expected.entry : undefined
          const previousNode = previousNodes.get(node.id)
          const nextRenderer = options.nodeRenderers?.[node.type ?? 'default']

          const nextRendererType =
            nextRenderer === undefined ? undefined : (node.type ?? 'default')

          if (entry === undefined || entry.rendererType !== nextRendererType) {
            const made = operations.makeNodeEntry(node, expected, pass)

            if (made === undefined) {
              return
            }

            ;({ entry, pass } = made)
            ;({ graph } = pass)
            added += 1
          } else if (expected !== undefined && !sameNode(previousNode, node)) {
            const reservation: Extract<NodeEntrySlot, { kind: 'reserved' }> = {
              kind: 'reserved',
              entry,
              operation: 'update',
            }

            if (
              !installNodeReservation(
                node.id,
                {
                  expected: { kind: 'present', slot: expected },
                  next: reservation,
                },
                pass
              )
            ) {
              return
            }

            try {
              if (entry.renderer.kind === 'custom') {
                const rendererProps = nodeRendererPropsFor(node, graph)
                sentNodeRendererProps.set(entry, rendererProps)
                entry.renderer.instance.update(node, rendererProps)
              } else if (previousNode?.label !== node.label) {
                renderDefaultNodeContents(entry.content, node)
              }
            } catch (error) {
              const primaryError = error

              if (nodeSlots.get(node.id) === reservation) {
                nodeSlots.delete(node.id)
              }

              try {
                entry.release()
              } catch (cleanupError) {
                // eslint-disable-next-line preserve-caught-error -- The renderer error stays primary; the caught cleanup error is retained in errors[1].
                throw new AggregateError(
                  [primaryError, cleanupError],
                  'Node renderer and cleanup failed',
                  { cause: primaryError }
                )
              }

              throw error
            }

            if (
              nodeSlots.get(node.id) !== reservation ||
              entry.state !== 'owned' ||
              !projectionMatches(pass, { kind: 'node', id: node.id })
            ) {
              if (
                nodeSlots.get(node.id) === reservation &&
                entry.state === 'owned'
              ) {
                installNodeReservation(
                  node.id,
                  {
                    expected: { kind: 'present', slot: reservation },
                    next: expected,
                  },
                  pass
                )
              }

              return
            }

            if (
              JSON.stringify(flowNodeHandles(previousNode)) !==
              JSON.stringify(flowNodeHandles(node))
            ) {
              renderNodeHandles(
                entry.handles,
                node,
                interactivity,
                ariaLabels,
                options.onHandleRender
              )
            } else if (
              options.onHandleRender !== undefined &&
              JSON.stringify(previousNode?.data) !== JSON.stringify(node.data)
            ) {
              for (const handle of flowNodeHandles(node)) {
                const button = [...entry.handles.children].find(
                  (child) =>
                    child instanceof HTMLButtonElement &&
                    child.dataset.handleId === handle.id &&
                    child.dataset.kind === handle.kind
                )

                if (button instanceof HTMLButtonElement) {
                  options.onHandleRender(node, handle, button)
                }
              }
            }

            applyDeclaredNodeSize(entry.element, node)

            if (
              !installNodeReservation(
                node.id,
                {
                  expected: { kind: 'present', slot: reservation },
                  next: { kind: 'ready', entry },
                },
                pass
              )
            ) {
              return
            }

            updated += 1
          }

          applyNodePosition(
            entry.element,
            graph.nodes.get(node.id)?.absolutePosition ??
              graphNode.absolutePosition
          )

          applyNodePresentation(
            entry.element,
            node,
            (nodeStacking.get(node.id) ?? 0) + 1
          )
          applyNodeInteractionState(entry.element, node, {
            nodesFocusable: options.nodesFocusable,
            descriptionId: a11yDescriptions.nodeDescriptionId,
            interactivity,
            hasPointerHandlers:
              options.onNodeClick !== undefined ||
              options.onNodeMouseEnter !== undefined ||
              options.onNodeMouseMove !== undefined ||
              options.onNodeMouseLeave !== undefined,
            noPanClassName: options.noPanClassName,
          })
          renderResizeControls(entry.element, node)

          if (
            !(
              isDraggingNode(node.id) &&
              entry.element.parentElement === viewport
            )
          ) {
            if (!nodeElementInPlace(entry.element, placedNodeElement)) {
              viewport.append(entry.element)
            }

            placedNodeElement = entry.element
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

        const edgePass = captureProjection(next)

        const currentAfterEdges = () =>
          projectionMatches(edgePass, { kind: 'graph' })

        const edgeStats = edgeRenderer.reconcile(edgePass)

        if (!currentAfterEdges()) {
          return
        }

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

        updateToolbarAnchors(captureProjection(next))
      },

      // eslint-disable-next-line complexity -- The change union has one branch per public operation.
      publishChange(change: FlowChange): void {
        if (mutationDepth > 0) {
          const queuedChange = structuredClone(change)
          deferredMutations.push(() => operations.publishChange(queuedChange))

          return
        }

        let publishedChange = change
        const changeBase = document

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

              renderGraphEdges()
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

              renderGraphEdges()
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

              renderGraphEdges()
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

              edgeRenderer.reconcile(captureProjection())
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
              edgeRenderer.reconcile(captureProjection())
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
              edgeRenderer.reconcile(captureProjection())
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
              edgeRenderer.reconcile(captureProjection())
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
              renderGraphEdges()
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
            notifyElementChanges(changeBase, publishedChange)

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

      // eslint-disable-next-line complexity -- Acquisition must cover reserved, returned, superseded and closed owners before adoption.
      makeNodeEntry(
        node: FlowNode,
        expected: NodeEntrySlot | undefined,
        pass: HostProjection
      ): { entry: ReadyNodeEntry; pass: HostProjection } | undefined {
        const previousMeasurement = measurements.get(node.id)
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

        applyDeclaredNodeSize(element, node)
        applyNodePosition(
          element,
          pass.graph.nodes.get(node.id)?.absolutePosition ?? node.position
        )

        const rendererScope = runEffect(
          Scope.fork(hostRendererScope, 'sequential')
        )

        const nodeScope = runEffect(Scope.fork(hostBrowserScope, 'sequential'))

        const nodeEntry: NodeEntry = {
          element,
          content,
          handles,
          generation,
          rendererType,
          rendererScope,
          browserScope: nodeScope,
          state: 'owned',
          renderer: { kind: 'awaiting-factory' },
          release: () => {
            if (nodeEntry.state === 'retired') {
              return
            }

            nodeEntry.state = 'retired'

            try {
              runEffect(Scope.close(nodeScope, Exit.void))
            } finally {
              try {
                runEffect(Scope.close(rendererScope, Exit.void))
              } finally {
                element.remove()
              }
            }
          },
        }

        const reservation = reserveNodeCandidate(
          node.id,
          expected,
          nodeEntry,
          pass
        )

        if (reservation === undefined) {
          nodeEntry.release()

          return undefined
        }

        let acquisition: 'acquiring' | 'adopted' = 'acquiring'

        const retireUnfinished = () => {
          if (nodeSlots.get(node.id) === reservation) {
            nodeSlots.delete(node.id)
          }

          nodeEntry.release()
        }

        try {
          const candidatePass =
            previousMeasurement === undefined
              ? pass
              : captureProjection(document, pass.origin)

          const candidateCurrent = () =>
            projectionMatches(candidatePass, { kind: 'node', id: node.id })

          if (expected !== undefined) {
            expected.entry.release()
          }

          if (
            destroyed ||
            nodeSlots.get(node.id) !== reservation ||
            !candidateCurrent()
          ) {
            return undefined
          }

          const initialRendererProps = nodeRendererPropsFor(
            node,
            candidatePass.graph
          )

          const instance = renderer?.(node, content, initialRendererProps)

          sentNodeRendererProps.set(nodeEntry, initialRendererProps)

          if (instance === undefined) {
            nodeEntry.renderer = { kind: 'default' }
            renderDefaultNodeContents(content, node)
          } else {
            runEffect(
              Scope.addFinalizer(
                rendererScope,
                Effect.sync(() => {
                  try {
                    instance.destroy()
                  } catch (error) {
                    if (destroyed) {
                      cleanupFailures.push(error)
                    } else {
                      throw error
                    }
                  }
                })
              )
            )
            nodeEntry.renderer = { kind: 'custom', instance }
          }

          if (
            destroyed ||
            nodeSlots.get(node.id) !== reservation ||
            nodeEntry.state !== 'owned' ||
            !candidateCurrent()
          ) {
            return undefined
          }

          renderNodeHandles(
            handles,
            node,
            interactivity,
            ariaLabels,
            options.onHandleRender
          )
          renderResizeControls(element, node)

          // The press started outside the node's `dragHandle` selector.
          let pressOutsideDragHandle = false

          // eslint-disable-next-line complexity -- Activation checks the existing phase, geometry and callback ownership.
          const activateNodeDrag = (event: PointerEvent): boolean => {
            if (destroyed) {
              return false
            }

            if (
              interactionSlots.activeDrag === null ||
              dragPointerStart === null
            ) {
              return false
            }

            const drag = interactionSlots.activeDrag

            if (pressOutsideDragHandle) {
              return false
            }

            if (!('positions' in drag) && !nodeIsDraggable(drag.nodeId)) {
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

            if (
              nodeDragThreshold !== 0 &&
              !nodeDragActivated(
                nodeDragThreshold,
                dragPointerStart.x,
                dragPointerStart.y,
                event.clientX,
                event.clientY
              )
            ) {
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

            // Pinned packages/system/src/xydrag/XYDrag.ts:282 selects before drag-start callbacks.
            if (
              nodeDragThreshold === 0 &&
              options.selectNodesOnDrag !== false
            ) {
              const current = findNode(node.id)
              selectionBoundsActive = false
              renderSelectionBounds()

              if (current?.focusable !== false) {
                element.focus()
              }

              if (
                current !== undefined &&
                isNodeSelectable(interactivity, current)
              ) {
                if (canvasKeys.multiSelection(event)) {
                  operations.toggleNodeSelection(current)
                } else if (current.selected !== true) {
                  operations.publishChange({
                    kind: 'node-selection',
                    nodeId: current.id,
                    selected: true,
                  })
                }
              }

              if (destroyed || interactionSlots.activeDrag !== drag) {
                return false
              }
            }

            element.classList.add('dragging')
            draggingNodeIds.add(node.id)
            refreshNodeRendererProps(nodeEntry, findNode(node.id), graphFor())
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

            callbackStartedNodeDrags.add(drag)

            if (options.onNodeDragStart !== undefined) {
              reportBoundaryCallback(
                'Node drag start',
                'node-drag',
                options.onNodeDragStart,
                nodeDragCallbackPayload(drag)
              )
            }

            return (
              !destroyed &&
              interactionSlots.activeDrag === drag &&
              nodeIsDraggable(dragAnchorId(drag)) &&
              graphFor().nodes.get(dragAnchorId(drag))?.hidden === false &&
              element.isConnected
            )
          }

          const resizeCandidate = (
            resize: ActiveNodeResize,
            event: PointerEvent
          ): NodeBoundsChange | undefined => {
            const registered = registeredResizes.get(resize)

            if (registered !== undefined) {
              return registeredResizeCandidate(resize, registered, event)
            }

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
            if (destroyed) {
              return false
            }

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

            if (renderGraphEdges() && options.renderOnlyVisible === true) {
              reconcileVisible?.()
            }

            return true
          }

          const finishNodeResize = (event: PointerEvent): boolean => {
            if (!dispatchOwns(event, 'activeNodeResize')) {
              return false
            }

            if (destroyed) {
              return false
            }

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

            const outcome = endSession(
              'node-resize',
              event.pointerId,
              'finished'
            )

            interactionSlots.activeNodeResize = null
            element.classList.remove('resizing')
            delete element.dataset.resizing

            for (const pointerId of pointerIdsFromOutcome(outcome, [
              event.pointerId,
            ])) {
              runEffect(browser.releasePointer(element, pointerId))
            }

            suppressClickThroughDispatch(true)

            if (
              outcome.kind === 'finished' &&
              outcome.semanticEvent === change.kind &&
              (change.position.x !== resize.positionStart.x ||
                change.position.y !== resize.positionStart.y ||
                change.size.width !== resize.sizeStart.width ||
                change.size.height !== resize.sizeStart.height)
            ) {
              operations.publishChange(withExpandParentCommit(resize, change))
            }

            revertExpandParentPreview(resize)

            const registered = registeredResizes.get(resize)

            if (
              registered?.resized === true &&
              registered.registration.onResizeEnd !== undefined
            ) {
              reportBoundaryCallback(
                'Node resize end',
                'node-resize',
                (params: FlowResizeParams) =>
                  registered.registration.onResizeEnd?.(event, params),
                registered.params
              )
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

          // eslint-disable-next-line complexity -- one guard covers built-in and registered controls and every competing gesture.
          const startNodeResizeFromPointer = (
            event: PointerEvent,
            resizeHandle: HTMLElement
          ): void => {
            if (destroyed) {
              return
            }

            event.preventDefault()
            event.stopPropagation()
            const current = findNode(node.id)

            const registration =
              resizeHandle.dataset.resizerId === undefined
                ? undefined
                : nodeResizers
                    .get(node.id)
                    ?.get(Number(resizeHandle.dataset.resizerId))

            if (
              current === undefined ||
              (registration === undefined && current.selected !== true) ||
              (resizeHandle.dataset.resizerId !== undefined &&
                registration === undefined) ||
              interactionSlots.activeNodeResize !== null ||
              activeKeyboardResize !== null ||
              interactionSlots.activeDrag !== null ||
              interactionSlots.activeViewportPan !== null ||
              interactionSlots.activePinch !== null
            ) {
              return
            }

            const measured =
              measurements.get(node.id) ?? browser.measure(element)

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

            resizeRestorations.set(
              session.resize,
              captureResizeRestoration(node.id, sizeStart)
            )
            interactionSessions = started.sessions

            if (registration !== undefined) {
              beginRegisteredResize(
                session.resize,
                registration,
                direction,
                event
              )
            }

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

          // Whether this press may become a pan if the node is not draggable:
          // the pane's activation modifier and no-pan opt-outs apply here too.
          let panHandOffAllowed = false

          const startNodeDragFromPointer = (event: PointerEvent): void => {
            if (destroyed) {
              return
            }

            if (
              isNodePointerTargetAllowed(
                content,
                event.target,
                options.noDragClassName
              ) === false
            ) {
              return
            }

            // React `dragHandle`: a press elsewhere on the node still selects
            // on release, but never drags or pans.
            pressOutsideDragHandle = !isInsideDragHandle(
              element,
              event.target,
              findNode(node.id)?.dragHandle
            )

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
              current.selected === true && nodeIsDraggable(current.id)
                ? selectedMovableNodes()
                : []

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
            dragPointerStart = { x: event.clientX, y: event.clientY }

            panHandOffAllowed =
              !pressOutsideDragHandle &&
              isPanePanEnabled(options, event) &&
              !(
                event.target instanceof Element &&
                event.target.closest(
                  noGestureSelector('pan', options.noPanClassName)
                ) !== null
              )
            dragPointer = pointerInCanvas(event)

            if (!runEffect(browser.capturePointer(element, event.pointerId))) {
              cancelActiveDrag('pointer-capture-failed')

              return
            }

            event.preventDefault()

            if (nodeDragThreshold === 0) {
              activateNodeDrag(event)
            }
          }

          const onPointerDown = (event: PointerEvent): void => {
            if (destroyed) {
              return
            }

            if (pendingConnection !== null) {
              return
            }

            if (activeKeyboardResize?.nodeId === node.id) {
              event.preventDefault()
              event.stopPropagation()

              return
            }

            const resizeHandle =
              event.target instanceof Element
                ? event.target.closest<HTMLElement>(
                    '.flow-node-resize-handle, .flow-resize-control'
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

              const handle = flowNodeHandles(current).find(
                (item) => item.id === handleElement.dataset.handleId
              )

              if (current !== undefined && handle !== undefined) {
                startConnection(current, handle, handleElement, event)
              }

              return
            }

            startNodeDragFromPointer(event)
          }

          /**
           * A node that is not draggable does not block panning, as in React
           * Flow: past the drag threshold its pointer becomes a viewport pan.
           */
          const handOffNodePointerToPan = (event: PointerEvent): boolean => {
            const drag = interactionSlots.activeDrag
            const start = dragPointer

            if (
              drag === null ||
              'positions' in drag ||
              drag.nodeId !== node.id ||
              dragPointerStart === null ||
              start === null ||
              nodeIsDraggable(drag.nodeId) ||
              !panHandOffAllowed ||
              !nodeDragActivated(
                Math.max(nodeDragThreshold, 1),
                dragPointerStart.x,
                dragPointerStart.y,
                event.clientX,
                event.clientY
              )
            ) {
              return false
            }

            cancelActiveDrag('pan-handoff')
            dragPointerStart = null
            dragPointer = null

            return beginPanFromPointer(event, start)
          }

          const onPointerMove = (event: PointerEvent): void => {
            if (destroyed) {
              return
            }

            if (previewResize(event)) {
              return
            }

            if (
              interactionSlots.activeDrag?.pointerId !== event.pointerId ||
              dragAnchorId(interactionSlots.activeDrag) !== node.id
            ) {
              return
            }

            if (handOffNodePointerToPan(event)) {
              return
            }

            if (!activateNodeDrag(event)) {
              return
            }

            dragPointer = pointerInCanvas(event)

            const drag = interactionSlots.activeDrag
            const session = sessionFor('node-drag')

            if (
              drag === null ||
              session?.kind !== 'node-drag' ||
              session.phase !== 'active'
            ) {
              return
            }

            const sample: NodeSample = {
              drag,
              session,
              pointerId: event.pointerId,
              rawClient: { x: event.clientX, y: event.clientY },
              canvasPoint: dragPointer,
            }

            nodeSample = sample
            updateNodeDragPreview(sample, pointerInFlow(event))
            scheduleNodeFrame(sample)
          }

          // eslint-disable-next-line complexity -- Release settles capture, selection and the detached drag in one transition.
          const finishDrag = (event: PointerEvent): void => {
            if (destroyed) {
              return
            }

            if (finishNodeResize(event)) {
              return
            }

            if (!dispatchOwns(event, 'activeDrag')) {
              return
            }

            if (
              interactionSlots.activeDrag?.pointerId !== event.pointerId ||
              dragAnchorId(interactionSlots.activeDrag) !== node.id
            ) {
              return
            }

            const drag = interactionSlots.activeDrag
            const dragSession = sessionFor('node-drag')

            const wasActivated =
              dragSession?.kind === 'node-drag' &&
              dragSession.phase === 'active'

            // Pinned packages/react/src/components/NodeWrapper/index.tsx:123-124 calls onClick even when drag-start selection already ran.
            const stationaryClick =
              wasActivated &&
              nodeDragThreshold === 0 &&
              (clickStart?.maxDistance ?? 0) <= (options.nodeClickDistance ?? 0)

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

            const boundedChange = changeForFinishedDrag(
              interactionSlots.activeDrag,
              candidate,
              boundedGroupChange,
              boundedNodePosition,
              localPositionFromAbsolute
            )

            const boundedPositions =
              boundedChange.kind === 'node-position'
                ? [
                    {
                      nodeId: boundedChange.nodeId,
                      position: boundedChange.position,
                    },
                  ]
                : boundedChange.positions

            const expandedPositions = wasActivated
              ? previewExpandParent(drag, boundedPositions)
              : boundedPositions

            const change: NodePositionChange | NodePositionsChange =
              boundedChange.kind === 'node-position'
                ? {
                    ...boundedChange,
                    position:
                      expandedPositions[0]?.position ?? boundedChange.position,
                  }
                : { ...boundedChange, positions: expandedPositions }

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
            draggingNodeIds.delete(node.id)
            refreshNodeRendererProps(nodeEntry, findNode(node.id), graphFor())

            if (!stationaryClick) {
              suppressClickThroughDispatch(wasActivated)
            }

            runEffect(browser.releasePointer(element, event.pointerId))

            const current = findNode(node.id)

            if (current !== undefined && !wasActivated) {
              selectionBoundsActive = false
              renderSelectionBounds()

              if (current.focusable !== false) {
                element.focus()
              }

              if (
                isNodeSelectable(interactivity, current) &&
                canvasKeys.multiSelection(event)
              ) {
                operations.toggleNodeSelection(current)
              } else if (
                isNodeSelectable(interactivity, current) &&
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
              operations.publishChange(withExpandParentCommit(drag, change))
            }

            revertExpandParentPreview(drag)

            notifyNodeDragStop(
              drag,
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
              browser.listen(element, 'pointercancel', onNodePointerCancel),
              nodeScope
            )
          )
          runEffect(
            Scope.provide(
              Effect.acquireRelease(
                Effect.sync(() => {
                  resizeObserver.observe(element)

                  return element
                }),
                (observed) =>
                  Effect.sync(() => resizeObserver.unobserve(observed))
              ),
              nodeScope
            )
          )

          if (
            destroyed ||
            nodeSlots.get(node.id) !== reservation ||
            nodeEntry.state !== 'owned' ||
            !candidateCurrent()
          ) {
            return undefined
          }

          const ready: ReadyNodeEntry = Object.assign(nodeEntry, {
            renderer: nodeEntry.renderer,
          })

          if (
            !installNodeReservation(
              node.id,
              {
                expected: { kind: 'present', slot: reservation },
                next: { kind: 'ready', entry: ready },
              },
              candidatePass
            )
          ) {
            return undefined
          }

          acquisition = 'adopted'

          return { entry: ready, pass: candidatePass }
        } catch (error) {
          const primaryError = error

          try {
            retireUnfinished()
          } catch (cleanupError) {
            // eslint-disable-next-line preserve-caught-error -- The renderer error stays primary; the caught cleanup error is retained in errors[1].
            throw new AggregateError(
              [primaryError, cleanupError],
              'Node renderer and cleanup failed',
              { cause: primaryError }
            )
          }

          throw error
        } finally {
          if (acquisition === 'acquiring') {
            retireUnfinished()
          }
        }
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
      const overlay = selectionOverlay
      selectionPointer = null
      selectionOverlay = null
      interactionSlots.activeSelectionRect = null

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

      overlay?.remove()

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

    const scheduleSelectionFrame = (
      active: NonNullable<FlowInteractionSlots['activeSelectionRect']>
    ): void => {
      if (options.autoPanOnSelection === false) {
        return
      }

      const handle = globalThis.requestAnimationFrame(() => {
        if (
          destroyed ||
          selectionFrame !== handle ||
          interactionSlots.activeSelectionRect !== active
        ) {
          return
        }

        selectionFrame = null
        const pointer = selectionPointer

        if (pointer === null) {
          return
        }

        const delta = selectionAutoPanDelta(
          pointer,
          canvas.clientWidth,
          canvas.clientHeight,
          40,
          options.autoPanSpeed ?? 15
        )

        if (delta.x === 0 && delta.y === 0) {
          return
        }

        renderViewport(panViewport(renderedViewport, delta))

        if (
          destroyed ||
          interactionSlots.activeSelectionRect !== active ||
          selectionFrame !== null ||
          selectionPointer !== pointer
        ) {
          return
        }

        updateSelectionRect(pointer)

        if (
          !destroyed &&
          interactionSlots.activeSelectionRect === active &&
          selectionFrame === null &&
          selectionPointer === pointer
        ) {
          scheduleSelectionFrame(active)
        }
      })

      selectionFrame = handle
    }

    const finishSelectionRect = (event: PointerEvent): void => {
      if (!dispatchOwns(event, 'activeSelectionRect')) {
        return
      }

      if (destroyed) {
        return
      }

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

      suppressClickThroughDispatch()

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
        selectionBoundsActive = change.nodeIds.length > 0
        operations.publishChange(change)
        renderSelectionBounds()
      }

      if (panned) {
        operations.publishChange({
          kind: 'viewport',
          viewport: renderedViewport,
        })
      }
    }

    const startPinch = (event: PointerEvent): boolean => {
      if (destroyed) {
        return false
      }

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

    // eslint-disable-next-line complexity -- Keep capture admission and exact-owner continuation checks in the canvas entry.
    // eslint-disable-next-line complexity -- Pane pointer entry orders pinch, reconnect, selection and pan admission.
    const onCanvasPointerDown = (event: PointerEvent): void => {
      if (destroyed) {
        return
      }

      const { target } = event

      if (
        isCanvasUiTarget(target) ||
        (target instanceof Element &&
          (event.button !== 1 || !isCanvasGraphTarget(target)) &&
          target.closest(noGestureSelector('pan', options.noPanClassName)) !==
            null)
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
        hasCanvasPointerGesture() ||
        (event.button !== 1 && isCanvasGraphTarget(target))
      ) {
        return
      }

      if (
        event.button === 0 &&
        interactivity.elementsSelectable &&
        isSelectionActivationEnabled(options, event, selectionKeyPressed)
      ) {
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
        selectionBoundsActive = false
        renderSelectionBounds()
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

      if (selectionKeyPressed || !isPanePanEnabled(options, event)) {
        return
      }

      const admittedPan = beginViewportPan(
        renderedViewport,
        pointerInCanvas(event),
        event.pointerId
      )

      interactionSlots.activeViewportPan = admittedPan
      beginUserViewportObservation()

      if (destroyed || interactionSlots.activeViewportPan !== admittedPan) {
        return
      }

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
      if (destroyed) {
        return
      }

      const { target } = event

      const noPanTarget =
        target instanceof Element
          ? target.closest(noGestureSelector('pan', options.noPanClassName))
          : null

      if (
        isCanvasUiTarget(target) ||
        (noPanTarget !== null &&
          // Pan mode owns node gestures even when a draggable node carries
          // the upstream nopan class. Embedded nopan controls still opt out.
          !noPanTarget.matches('.flow-node.draggable'))
      ) {
        return
      }

      if (interactionMode !== 'pan' || !isPanePanEnabled(options, event)) {
        return
      }

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
      if (destroyed) {
        return false
      }

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
            scheduleConnectionFrame(interactionSlots.activeConnection)
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
      if (destroyed) {
        return
      }

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
          scheduleSelectionFrame(interactionSlots.activeSelectionRect)
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
      if (!dispatchOwns(event, 'activeViewportPan')) {
        return
      }

      if (destroyed) {
        return
      }

      if (interactionSlots.activeViewportPan?.pointerId !== event.pointerId) {
        return
      }

      const change: FlowChange = {
        kind: 'viewport',
        // Pinned packages/system/src/xypanzoom/eventhandler.ts:238 retains the last transform.
        viewport: renderedViewport,
      }

      const observation = userViewportObservation
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

      endUserViewportObservation(observation)

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

    const notifyCancelPinch = (pinch: ActivePinch, reason: string): void => {
      runTelemetry(
        Effect.logDebug('Cancelled pinch gesture').pipe(
          Effect.annotateLogs({
            [FlowAttribute.inputKind]: 'touch-pinch',
            [FlowAttribute.pointerId]: pinch.firstPointerId,
            [FlowAttribute.cancellationReason]: reason,
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.inputKind]: 'touch-pinch',
              [FlowAttribute.pointerId]: pinch.firstPointerId,
              [FlowAttribute.cancellationReason]: reason,
            },
          })
        )
      )
    }

    // eslint-disable-next-line complexity -- Every captured actor is taken before resource release and before any preview or terminal callback.
    cancelCaptured = (owners: EntryOwners, reason: string): void => {
      const taken = owners.actors.filter(({ actor }) => actorOwned(actor))

      if (taken.length === 0) {
        return
      }

      const captures = taken.flatMap(({ captures: receipts }) => receipts)
      const resources: VanillaResource[] = []

      for (const captured of taken) {
        for (const resource of captured.resources) {
          switch (resource.kind) {
            case 'click-source': {
              resources.push(resource)
              break
            }

            case 'node-frame': {
              if (nodeFrame === resource.ticket) {
                nodeFrame = undefined
                resource.ticket.state = { kind: 'revoked' }
                resources.push(resource)
              }

              break
            }

            case 'connection-frame': {
              if (connectionFrame === resource.handle) {
                connectionFrame = null
                resources.push(resource)
              }

              break
            }

            case 'selection-frame': {
              if (selectionFrame === resource.handle) {
                selectionFrame = null
                resources.push(resource)
              }

              break
            }

            case 'preview': {
              if (connectionPreview === resource.element) {
                connectionPreview = null
                connectionLine = null
                hoveredConnectionHandle = null
                resources.push(resource)
              }

              break
            }

            case 'selection-overlay': {
              if (selectionOverlay === resource.element) {
                selectionOverlay = null
                selectionPointer = null
                resources.push(resource)
              }

              break
            }

            case 'viewport': {
              if (resource.owner.state === 'open') {
                resource.owner.state = 'ended'

                if (userViewportObservation === resource.owner) {
                  userViewportObservation = null
                }

                resources.push(resource)
              }

              break
            }

            default: {
              const exhausted: never = resource

              return exhausted
            }
          }
        }
      }

      for (const { actor } of taken) {
        switch (actor.kind) {
          case 'activeDrag': {
            revertExpandParentPreview(actor.record)
            endSession('node-drag', actor.record.pointerId, 'cancelled')
            dragPointerStart = null
            dragPointer = null
            nodeSample = undefined
            break
          }

          case 'activeNodeResize': {
            revertExpandParentPreview(actor.record)
            endSession('node-resize', actor.record.pointerId, 'cancelled')
            break
          }

          case 'activeKeyboardResize': {
            activeKeyboardResize = null
            break
          }

          case 'activeKeyboardNodeDrag': {
            activeKeyboardNodeDrag = null
            break
          }

          case 'pendingConnection': {
            pendingConnection = null
            connectionCapture = null
            break
          }

          case 'activeConnection': {
            endSession('connection', actor.record.pointerId, 'cancelled')
            connectionCapture = null
            connectionPointer = null
            connectionPointerStart = null
            break
          }

          case 'activeReconnection': {
            endSession('reconnection', actor.record.pointerId, 'cancelled')
            connectionCapture = null
            break
          }

          case 'activeClickConnection': {
            activeClickConnection = null
            break
          }

          case 'activeViewportPan': {
            endSession('pane-pan', actor.record.pointerId, 'cancelled')
            break
          }

          case 'activePinch': {
            endSession('pinch', actor.record.firstPointerId, 'cancelled')
            break
          }

          case 'activeSelectionRect': {
            endSession('selection', actor.record.pointerId, 'cancelled')
            break
          }

          default: {
            const exhausted: never = actor

            return exhausted
          }
        }
      }

      for (const touch of owners.touches) {
        if (touchPointers.get(touch.pointerId) === touch.point) {
          touchPointers.delete(touch.pointerId)
        }
      }

      const dragTerminals = new Map<NodeSample['drag'], FlowNodeDragPayload>()
      let restoredViewport: Viewport | undefined

      for (const { actor } of taken) {
        if (actor.kind === 'activeDrag') {
          const drag = actor.record

          if (
            interactionSlots.activeViewportPan === null &&
            interactionSlots.activePinch === null
          ) {
            renderedViewport = constrainViewport(authoritativeViewport)
            applyViewport(viewport, renderedViewport)
          }

          const draggedEntry = entries.get(dragAnchorId(drag))
          draggedEntry?.element.classList.remove('dragging')
          draggingNodeIds.delete(dragAnchorId(drag))

          if (draggedEntry !== undefined) {
            refreshNodeRendererProps(
              draggedEntry,
              findNode(dragAnchorId(drag)),
              graphFor()
            )
          }

          const ids =
            'positions' in drag
              ? drag.positions.map((item) => item.nodeId)
              : [drag.nodeId]

          for (const id of ids) {
            const node = findNode(id)

            if (node !== undefined) {
              restoreAdoptedPosition(node)
            }
          }

          dragTerminals.set(drag, nodeDragCallbackPayload(drag))
        } else if (actor.kind === 'activeNodeResize') {
          restoreResizePrimitives(actor.record)
        } else if (actor.kind === 'activeKeyboardResize') {
          restoreResizePrimitives(actor.record)
        } else if (
          actor.kind === 'activeViewportPan' ||
          actor.kind === 'activePinch'
        ) {
          renderedViewport = constrainViewport(authoritativeViewport)
          applyViewport(viewport, renderedViewport)
          restoredViewport = renderedViewport
        }
      }

      const retirementPass = captureProjection(document, {
        kind: 'retired',
        document,
      })

      const retiredGraph = retirementPass.graph

      for (const [id, entry] of entries) {
        const resolved = retiredGraph.nodes.get(id)

        if (resolved !== undefined) {
          applyNodePosition(entry.element, resolved.absolutePosition)
        }
      }

      const retirementCurrent = () =>
        projectionMatches(retirementPass, { kind: 'toolbar' })

      // Keyboard-owned sessions never receive a pointerup, so suppressing here
      // would swallow the next keyboard-generated click.
      if (
        taken.some(
          ({ actor }) =>
            actor.kind !== 'activeClickConnection' &&
            actor.kind !== 'activeKeyboardResize'
        )
      ) {
        suppressClickUntilPointerUp()
      }

      for (const resource of resources) {
        if (resource.kind === 'click-source') {
          resource.element.classList.remove('connecting')
        } else if (resource.kind === 'preview') {
          resource.hover?.classList.remove(
            'connection-valid',
            'connection-invalid'
          )
        } else if (resource.kind === 'viewport') {
          canvas.classList.remove('panning')
        }
      }

      let resourceFailure: { readonly cause: unknown } | undefined

      const retireResource = (retire: () => void): void => {
        try {
          retire()
        } catch (error) {
          resourceFailure ??= { cause: error }
        }
      }

      for (const resource of resources) {
        if (resource.kind === 'node-frame') {
          retireResource(() => {
            runEffect(Scope.close(resource.ticket.registrationScope, Exit.void))
          })
        } else if (
          resource.kind === 'connection-frame' ||
          resource.kind === 'selection-frame'
        ) {
          retireResource(() => globalThis.cancelAnimationFrame(resource.handle))
        }
      }

      for (const { target, pointerId } of captures) {
        if (target.hasPointerCapture(pointerId)) {
          retireResource(() => {
            runEffect(browser.releasePointer(target, pointerId))
          })
        }
      }

      for (const resource of resources) {
        if (resource.kind === 'preview') {
          resource.element.remove()
        } else if (resource.kind === 'selection-overlay') {
          resource.element.remove()
        }
      }

      if (retirementCurrent()) {
        updateToolbarAnchors(retirementPass)

        if (retirementCurrent()) {
          updateCanvasMinimap(retirementPass)
        }

        if (retirementCurrent()) {
          edgeRenderer.reconcile(retirementPass)
        }
      }

      for (const resource of resources) {
        if (resource.kind === 'preview') {
          publishConnectionPreview(null, resource.element)
        } else if (resource.kind === 'viewport') {
          emitViewportObservation('end', resource.viewport, 'user')
        }
      }

      for (const { actor } of taken) {
        switch (actor.kind) {
          case 'activeDrag': {
            const payload = dragTerminals.get(actor.record)

            if (payload !== undefined) {
              notifyCancelledDrag(actor.record, payload, reason)
            }

            break
          }

          case 'activeNodeResize': {
            notifyCancelledResize(actor.record, reason)
            break
          }

          case 'activeKeyboardResize': {
            if (
              reason !== 'host-destroyed' &&
              actor.record.button.isConnected
            ) {
              actor.record.button.focus()
            }

            runTelemetry(
              Effect.logDebug('Cancelled keyboard node resize').pipe(
                Effect.annotateLogs({
                  [FlowAttribute.nodeId]: actor.record.nodeId,
                  [FlowAttribute.inputKind]: 'keyboard-node-resize',
                  [FlowAttribute.cancellationReason]: reason,
                }),
                Effect.withSpan(FlowSpan.gestureCancel, {
                  attributes: {
                    [FlowAttribute.nodeId]: actor.record.nodeId,
                    [FlowAttribute.inputKind]: 'keyboard-node-resize',
                    [FlowAttribute.cancellationReason]: reason,
                  },
                })
              )
            )
            break
          }

          case 'pendingConnection': {
            break
          }

          case 'activeConnection': {
            notifyCancelConnection(actor.record, reason)
            break
          }

          case 'activeReconnection': {
            notifyCancelReconnection(actor.record, reason)
            break
          }

          case 'activeClickConnection': {
            notifyCancelClickConnection(actor.record, reason)
            break
          }

          case 'activeViewportPan': {
            if (restoredViewport !== undefined) {
              emitViewportObservation('change', restoredViewport)
            }

            notifyCancelViewportPan(actor.record, reason)
            break
          }

          case 'activePinch': {
            if (restoredViewport !== undefined) {
              emitViewportObservation('change', restoredViewport)
            }

            notifyCancelPinch(actor.record, reason)
            break
          }

          case 'activeSelectionRect': {
            if (options.onSelectionEnd !== undefined) {
              reportBoundaryCallback(
                'Selection end',
                'selection-rectangle',
                options.onSelectionEnd,
                {
                  ...selectionRectPayload(
                    actor.record,
                    resources.find(
                      (resource) => resource.kind === 'selection-overlay'
                    )?.point ?? actor.record.pointerStart
                  ),
                  outcome: 'cancelled',
                  reason,
                }
              )
            }

            runTelemetry(
              Effect.logDebug('Cancelled selection rectangle gesture').pipe(
                Effect.annotateLogs({
                  [FlowAttribute.pointerId]: actor.record.pointerId,
                  [FlowAttribute.cancellationReason]: reason,
                  [FlowAttribute.inputKind]: 'selection-rectangle',
                }),
                Effect.withSpan(FlowSpan.gestureCancel)
              )
            )
            break
          }

          case 'activeKeyboardNodeDrag': {
            if (options.onNodeDragStop !== undefined) {
              reportBoundaryCallback(
                'Keyboard node drag stop',
                'keyboard-node-drag',
                options.onNodeDragStop,
                { ...actor.record, outcome: 'cancelled', reason }
              )
            }

            break
          }

          default: {
            const exhausted: never = actor

            return exhausted
          }
        }
      }

      if (resourceFailure !== undefined) {
        throw resourceFailure.cause
      }
    }

    cancelActiveGestures = (reason: string, pointerId?: number): boolean => {
      const owners = snapshotEntry(pointerId)
      cancelCaptured(owners, reason)

      return owners.actors.length > 0
    }

    const onWindowBlur = (): void => {
      selectionKeyPressed = false
      panKeyPressed = false
      renderPaneSelectionClass()
      cancelCaptured(snapshotEntry(), 'window-blur')
    }

    const onLostPointerCapture = (event: PointerEvent): void => {
      const entry = terminalDispatches.get(event)

      if (entry !== undefined) {
        cancelCaptured(entry.owners, 'lost-pointer-capture')
      }
    }

    const onCanvasPointerCancel = (event: PointerEvent): void => {
      const entry = terminalDispatches.get(event)

      if (entry !== undefined) {
        cancelCaptured(entry.owners, 'pointer-cancel')
      }
    }

    const finishPinch = (event: PointerEvent): void => {
      if (!dispatchOwns(event, 'activePinch')) {
        return
      }

      if (destroyed) {
        return
      }

      if (
        interactionSlots.activePinch === null ||
        (event.pointerId !== interactionSlots.activePinch.firstPointerId &&
          event.pointerId !== interactionSlots.activePinch.secondPointerId)
      ) {
        return
      }

      const pinch = interactionSlots.activePinch
      const observation = userViewportObservation
      const outcome = endSession('pinch', pinch.firstPointerId, 'finished')
      interactionSlots.activePinch = null

      for (const touch of terminalDispatches.get(event)?.owners.touches ?? []) {
        if (touchPointers.get(touch.pointerId) === touch.point) {
          touchPointers.delete(touch.pointerId)
        }
      }

      for (const pointerId of pointerIdsFromOutcome(outcome, [
        pinch.firstPointerId,
        pinch.secondPointerId,
      ])) {
        runEffect(browser.releasePointer(canvas, pointerId))
      }

      endUserViewportObservation(observation)
      suppressClickThroughDispatch(true)

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
              interactivity,
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
      if (
        !dispatchOwns(event, 'pendingConnection') &&
        !dispatchOwns(event, 'activeConnection')
      ) {
        return
      }

      if (destroyed) {
        return
      }

      if (pendingConnection?.pointerId === event.pointerId) {
        const pending = pendingConnection
        const eligible = pendingConnectionEligible(pending)
        clearPendingConnection()
        suppressClickThroughDispatch()

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

          const handle = flowNodeHandles(node).find(
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
      connectionEndEvent = event

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

      const targetHandle = flowNodeHandles(targetNode).find(
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
        suppressClickThroughDispatch()

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
      if (!dispatchOwns(event, 'activeReconnection')) {
        return
      }

      if (destroyed) {
        return
      }

      if (interactionSlots.activeReconnection?.pointerId !== event.pointerId) {
        return
      }

      suppressClickThroughDispatch(true)

      const active = interactionSlots.activeReconnection
      connectionEndEvent = event

      const handleElement = canvas.ownerDocument
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('.flow-handle')

      const node = canvas.contains(handleElement ?? null)
        ? document.nodes.find(
            (item) => item.id === handleElement?.dataset.nodeId
          )
        : undefined

      const handle = flowNodeHandles(node).find(
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
      const oldEdge = document.edges.find(({ id }) => id === active.edgeId)

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

      const { onReconnect } = options

      if (onReconnect !== undefined && oldEdge !== undefined) {
        const { source, sourceHandle, target, targetHandle } = result.success

        reportBoundaryCallback(
          'Reconnection proposal',
          'pointer-reconnect',
          (edge: FlowEdge) =>
            onReconnect(edge, {
              oldEdge,
              newConnection: { source, sourceHandle, target, targetHandle },
            }),
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

      const node = document.nodes.find(
        (candidate) => candidate.id === handleElement.dataset.nodeId
      )

      const handle = flowNodeHandles(node).find(
        (candidate) => candidate.id === handleElement.dataset.handleId
      )

      if (
        node === undefined ||
        handle === undefined ||
        (activeClickConnection === null &&
          !isHandleConnectable(interactivity, node, handle, 'start'))
      ) {
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
      if (clickSuppression !== null) {
        clickSuppression = null

        return
      }

      selectionBoundsActive = false
      renderSelectionBounds()

      const { target } = event

      if (target instanceof Element) {
        const content = target.closest<HTMLElement>('.flow-node-content')

        const nativeControl = target.closest(
          'button, input, select, textarea, a[href], [contenteditable="true"]'
        )

        const noDragTarget = target.closest(
          noGestureSelector('drag', options.noDragClassName)
        )

        if (
          content !== null &&
          ((nativeControl !== null && content.contains(nativeControl)) ||
            (noDragTarget !== null && content.contains(noDragTarget)))
        ) {
          return
        }
      }

      connectionEndEvent = event

      if (onHandleClick(target)) {
        return
      }

      connectionEndEvent = undefined

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

          if (
            isEdgeSelectable(interactivity, edge) &&
            canvasKeys.multiSelection(event)
          ) {
            operations.toggleEdgeSelection(edge)
          } else if (
            isEdgeSelectable(interactivity, edge) &&
            edge.selected !== true
          ) {
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

          if (
            isNodeSelectable(interactivity, node) &&
            canvasKeys.multiSelection(event)
          ) {
            operations.toggleNodeSelection(node)
          } else if (
            isNodeSelectable(interactivity, node) &&
            node.selected !== true
          ) {
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
      if (event.key === 'Escape' && cancelCapturedEscape(event)) {
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
              const restoration = resizeRestorations.get(active)

              if (restoration !== undefined) {
                resizeRestorations.set(activeKeyboardResize, restoration)
              }

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
          resizeRestorations.set(
            activeKeyboardResize,
            captureResizeRestoration(current.id, origin.sizeStart)
          )
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

      if (canvasKeys.deletePressed(event)) {
        if (isInputDOMNode(event)) {
          return
        }

        if (options.deleteKeyCode === undefined) {
          const edgeGroup =
            target instanceof Element
              ? target.closest<SVGGElement>('.flow-edge-group')
              : null

          const edge = document.edges.find(
            (candidate) => candidate.id === edgeGroup?.dataset.edgeId
          )

          if (edge?.selected === true && edge.deletable !== false) {
            event.preventDefault()

            if (!event.repeat) {
              operations.publishChange({ kind: 'edge-remove', edgeId: edge.id })
            }
          }

          return
        }

        event.preventDefault()

        if (!event.repeat) {
          const nodeIds = document.nodes
            .filter(
              (node) => node.selected === true && node.deletable !== false
            )
            .map((node) => node.id)

          const edgeIds = document.edges
            .filter(
              (edge) => edge.selected === true && edge.deletable !== false
            )
            .map((edge) => edge.id)

          const [edgeId] = edgeIds

          if (
            nodeIds.length === 0 &&
            edgeIds.length === 1 &&
            edgeId !== undefined
          ) {
            operations.publishChange({ kind: 'edge-remove', edgeId })
          } else if (nodeIds.length + edgeIds.length > 0) {
            reportBoundaryCallback(
              'Keyboard deletion',
              'keyboard',
              () => {
                const result = Effect.runSync(
                  prepareFlowEdit(document, {
                    operations: [{ kind: 'delete-elements', nodeIds, edgeIds }],
                  })
                )

                operations.publishChange({
                  kind: 'edit-proposal',
                  document: result.document,
                  deletion: result.deletion,
                })
              },
              event
            )
          }
        }

        return
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
              draggable: isNodeDraggable(interactivity, candidate),
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

            a11yDescriptions.announceNodeMove({ key: event.key, ...absolute })

            if (options.autoPanOnNodeFocus !== false) {
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

          if (
            isNodeSelectable(interactivity, node) &&
            canvasKeys.multiSelection(event)
          ) {
            operations.toggleNodeSelection(node)
          } else if (
            isNodeSelectable(interactivity, node) &&
            node.selected !== true
          ) {
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
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()

        if (
          isEdgeSelectable(interactivity, edge) &&
          canvasKeys.multiSelection(event)
        ) {
          operations.toggleEdgeSelection(edge)
        } else if (
          isEdgeSelectable(interactivity, edge) &&
          edge.selected !== true
        ) {
          operations.publishChange({
            kind: 'edge-selection',
            edgeId: edge.id,
            selected: true,
          })
        }
      }
    }

    const onWindowKeyDown = (event: KeyboardEvent): void => {
      observePaneModifiers(event)

      if (event.key === 'Escape' && cancelCapturedEscape(event)) {
        event.preventDefault()
      }
    }

    const onWindowKeyUp = (event: KeyboardEvent): void => {
      observePaneModifiers(event)

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
      family: CanvasCallbackFamily,
      event: MouseEvent,
      target = getFlowCanvasEventTarget(event.target)
    ): void => {
      const callback = options[canvasCallbackKeys[target.kind][family]]

      if (callback === undefined) {
        return
      }

      const bounds = canvas.getBoundingClientRect()

      const payload: FlowCanvasEventPayload = {
        event,
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
      const target = getFlowCanvasEventTarget(event.target)

      if (
        target.kind === 'pane' &&
        Array.isArray(options.panOnDrag) &&
        options.panOnDrag.includes(2)
      ) {
        event.preventDefault()

        return
      }

      dispatchCanvasEvent('ContextMenu', event, target)

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
          event,
          nodeIds,
          edgeIds,
          position: {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          },
        }
      )
    }

    // eslint-disable-next-line complexity -- Wheel entry orders embedded controls, active gestures, scrolling, pinch and zoom modes.
    const onCanvasWheel = (event: WheelEvent): void => {
      if (destroyed) {
        return
      }

      if (
        (event.target === canvas || event.target === viewport) &&
        options.onPaneScroll !== undefined
      ) {
        reportBoundaryCallback('Pane scroll', 'wheel', options.onPaneScroll, {
          event,
          position: pointerInCanvas(event),
        })
      }

      if (!allowsCanvasWheel(event.target, options.noWheelClassName)) {
        return
      }

      if (interactionSlots.activeViewportPan !== null) {
        return
      }

      if (options.preventScrolling !== false) {
        event.preventDefault()
      }

      const zoomActive =
        canvasKeys.zoomHeld ||
        (options.zoomActivationKeyCode === undefined &&
          (event.ctrlKey || event.metaKey))

      if (options.panOnScroll === true && !zoomActive && !event.ctrlKey) {
        const observation = beginUserViewportObservation()

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
        endUserViewportObservation(observation)

        return
      }

      if (
        event.ctrlKey
          ? options.zoomOnPinch === false
          : options.zoomOnScroll === false && !zoomActive
      ) {
        return
      }

      if (options.preventScrolling === false && !event.ctrlKey) {
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

      const observation = beginUserViewportObservation()

      event.preventDefault()

      operations.publishChange({ kind: 'viewport', viewport: candidate })
      endUserViewportObservation(observation)
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
      browser.listenWindow(globalThis.window, 'keydown', rememberDispatch, {
        capture: true,
      }),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', rememberDispatch, { capture: true }),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointercancel', rememberDispatch, {
        capture: true,
      }),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'lostpointercapture', rememberDispatch, {
        capture: true,
      }),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerdown', onCanvasPointerDownCapture, {
        capture: true,
      }),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerdown', onCanvasPointerDown),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointermove', onCanvasPointerMove),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', finishViewportPan),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', finishPinch),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', finishSelectionRect),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', finishConnection),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', finishReconnection),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointerup', (event) => {
        const receipt = terminalDispatches.get(event)?.owners.suppression

        if (receipt !== undefined && receipt !== null) {
          globalThis.setTimeout(() => {
            if (clickSuppression === receipt) {
              clickSuppression = null
            }
          }, 0)
        }
      }),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'pointercancel', onCanvasPointerCancel),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'lostpointercapture', onLostPointerCapture),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listenWindow(globalThis.window, 'blur', onWindowBlur),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listenWindow(globalThis.window, 'keyup', onWindowKeyUp),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listenWindow(globalThis.window, 'keydown', onWindowKeyDown),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(
        canvas,
        'pointerdown',
        (event) => {
          clickStart = {
            x: event.clientX,
            y: event.clientY,
            kind: getFlowCanvasEventTarget(event.target).kind,
            pointerId: event.pointerId,
            maxDistance: 0,
          }
        },
        { capture: true }
      ),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(
        canvas,
        'pointermove',
        (event) => {
          if (clickStart?.pointerId === event.pointerId) {
            clickStart.maxDistance = Math.max(
              clickStart.maxDistance,
              Math.hypot(
                event.clientX - clickStart.x,
                event.clientY - clickStart.y
              )
            )
          }
        },
        { capture: true }
      ),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'click', (event) => {
        // A click that ends a drag, resize, pan or connection reaches neither
        // selection nor the click callbacks, as in React Flow.
        const suppressed = clickSuppression?.gesture === true

        if (!clickWithinDistance(event)) {
          clickSuppression = null

          return
        }

        onCanvasClick(event)

        if (!suppressed) {
          dispatchCanvasEvent('Click', event)
        }
      }),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'focusin', (event) => {
        if (
          options.autoPanOnNodeFocus === false ||
          !(event.target instanceof HTMLElement)
        ) {
          return
        }

        const node = event.target.closest<HTMLElement>('.flow-node')

        if (
          node === null ||
          options.keyboardActivation === false ||
          !node.matches(':focus-visible')
        ) {
          return
        }

        canvas.scrollLeft = 0
        canvas.scrollTop = 0

        const box = node.getBoundingClientRect()
        const pane = canvas.getBoundingClientRect()
        const { x: dx, y: dy } = focusPanDelta(box, pane)

        if (dx !== 0 || dy !== 0) {
          const observation = beginUserViewportObservation()

          operations.publishChange({
            kind: 'viewport',
            viewport: constrainViewport(
              panViewport(renderedViewport, { x: dx, y: dy })
            ),
          })
          endUserViewportObservation(observation)
        }
      }),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'keydown', onCanvasKeyDown),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'wheel', onCanvasWheel, { passive: false }),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'contextmenu', onCanvasContextMenu),
      hostBrowserScope
    )
    yield* Scope.provide(
      browser.listen(canvas, 'mousemove', (event) => {
        dispatchCanvasEvent('MouseMove', event)
      }),
      hostBrowserScope
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
      hostBrowserScope
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
      hostBrowserScope
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

        const observation = beginUserViewportObservation()
        operations.publishChange({
          kind: 'viewport',
          viewport: constrainViewport(next),
        })
        endUserViewportObservation(observation)
      }),
      hostBrowserScope
    )
    canvasUIHandle.current = createCanvasUI(
      {
        controls: options.ui?.controls === true,
        minimap: options.ui?.minimap === true,
        ariaLabels: ariaLabels.config,
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
    canvas.append(
      viewport,
      connectionStatus,
      ...a11yDescriptions.elements,
      canvasUIHandle.current.element
    )
    updateCanvasMinimap()

    try {
      root.replaceChildren(canvas)
      rootAttached = true
      canvasUIHandle.current?.restoreFocus()
      authoritativeViewport = constrainViewport(authoritativeViewport)
      renderViewport(authoritativeViewport)
      operations.reconcile(document)
    } catch (error) {
      try {
        runEffect(Scope.close(hostScope, Exit.fail(error)))
      } catch (cleanupError) {
        attemptOptionalFailureReport(() => {
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
        })
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
      getConnection: () =>
        destroyed ? flowNoConnection : currentConnectionState(),
      subscribeConnection: (listener) =>
        controller.subscribeConnectionPreview(() =>
          listener(currentConnectionState())
        ),
      getInteractivity: () => interactivity,
      setInteractivity: (next) => {
        if (!destroyed) {
          applyInteractivity(next)
        }
      },
      setCanvasOptions: (next) => {
        const decoded = Effect.runSync(
          S.decodeUnknownEffect(FlowCanvasOptionsSchema)(next).pipe(
            // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Effect observes typed schema failures synchronously, not through a Promise callback.
            Effect.tapError((error) =>
              Effect.logWarning('Invalid flow canvas options').pipe(
                Effect.annotateLogs({
                  [FlowAttribute.changeKind]: 'canvas-options-decode',
                  [FlowAttribute.failureName]: error.name,
                  [FlowAttribute.failureMessage]: error.message,
                })
              )
            ),
            Effect.withSpan(FlowSpan.controllerUpdate, {
              attributes: {
                [FlowAttribute.changeKind]: 'canvas-options-decode',
              },
            })
          )
        )

        if (destroyed) {
          return
        }

        const previousCulling = options.renderOnlyVisible
        configuredCanvasOptions = { ...configuredCanvasOptions, ...decoded }
        options = {
          ...options,
          ...configuredCanvasOptions,
          snapGrid: resolveSnapGrid(configuredCanvasOptions),
        }

        const attributes = { [FlowAttribute.changeKind]: 'canvas-options' }
        runTelemetry(
          Effect.logDebug('Changed flow canvas options').pipe(
            Effect.annotateLogs(attributes),
            Effect.withSpan(FlowSpan.controllerUpdate, { attributes })
          )
        )

        if (previousCulling !== options.renderOnlyVisible) {
          reconcileVisible?.()
        }
      },
      subscribeInteractivity: (listener) => {
        if (destroyed) {
          return noopUnsubscribe
        }

        interactivityListeners.add(listener)

        return () => interactivityListeners.delete(listener)
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

        destroyed = true

        try {
          cancelCaptured(snapshotEntry(), 'host-destroyed')
          settleViewportOperation('disposed')

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
      getAriaLabelConfig: () => ariaLabels.config,
      getRenderedNodePositions: () =>
        new Map(
          [...renderedNodePositions].map(([id, position]) => [
            id,
            { ...position },
          ])
        ),
      subscribeRenderedPositions: (listener) => {
        if (!destroyed) {
          renderedPositionListeners.add(listener)
        }

        return () => {
          renderedPositionListeners.delete(listener)
        }
      },
      registerNodeResizer: (nodeId, registration) =>
        registerNodeResizer(
          S.decodeUnknownSync(NodeIdSchema)(nodeId),
          registration
        ),
      getColorMode: () => ({
        mode: colorMode.get(),
        resolved: colorMode.resolved(),
      }),
      setColorMode: (mode) => {
        if (!destroyed) {
          colorMode.set(mode)
        }
      },
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
        document.nodes.flatMap((node) => {
          const internal = readInternalNode(node.id)

          return internal === undefined
            ? []
            : [
                withMeasured(
                  internal.node,
                  internal.measurementStatus === 'measured'
                    ? internal
                    : undefined
                ),
              ]
        }),
      getEdges: () =>
        createFlowSnapshot(document, authoritativeViewport).document.edges,
      getNode: (id) => {
        const internal = readInternalNode(id)

        return internal === undefined
          ? undefined
          : withMeasured(
              internal.node,
              internal.measurementStatus === 'measured' ? internal : undefined
            )
      },
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
      getInternalNode: readInternalNode,
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
              scheduleMeasuredDimensions()
              renderGraphEdges()
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
              Scope.provide(
                browser.requestAnimationFrame(flush),
                hostBrowserScope
              )
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

        const nodeIds = resolveFitViewNodeIds(document, fitOptions.nodes)

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
          includeHiddenNodes: fitOptions.includeHiddenNodes,
          minZoom: fitOptions.minZoom,
          maxZoom: fitOptions.maxZoom,
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
          [FlowAttribute.controlMode]: initialOptions.documentMode,
          [FlowAttribute.nodeCount]: initialDocument.nodes.length,
          [FlowAttribute.viewportX]: initialOptions.viewport.initial.x,
          [FlowAttribute.viewportY]: initialOptions.viewport.initial.y,
          [FlowAttribute.viewportZoom]: initialOptions.viewport.initial.zoom,
        })
      )
    ),
    Effect.withSpan(FlowSpan.hostMount, {
      attributes: {
        [FlowAttribute.controlMode]: initialOptions.documentMode,
        [FlowAttribute.nodeCount]: initialDocument.nodes.length,
        [FlowAttribute.viewportX]: initialOptions.viewport.initial.x,
        [FlowAttribute.viewportY]: initialOptions.viewport.initial.y,
        [FlowAttribute.viewportZoom]: initialOptions.viewport.initial.zoom,
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

/** `FlowNodeResizeStart` built field by field for optional constraints. */
type MutableResizeStart = {
  -readonly [Key in keyof FlowNodeResizeStart]: FlowNodeResizeStart[Key]
}

/** Decode the text entries; the live-message builder must be a function. */
const decodeAriaLabelConfig = (
  input: FlowAriaLabelConfigInput | undefined
): FlowAriaLabelConfigInput | undefined => {
  if (input === undefined) {
    return undefined
  }

  const { 'node.a11yDescription.ariaLiveMessage': liveMessage, ...text } = input

  if (liveMessage !== undefined && !Predicate.isFunction(liveMessage)) {
    throw new CanvasUIOptionsError(
      'ariaLabelConfig node.a11yDescription.ariaLiveMessage must be a function'
    )
  }

  // Validates the text entries; the input itself already has the right shape.
  S.decodeUnknownSync(FlowAriaLabelTextConfigSchema)(text)

  return input
}

/** Frames to wait for node measurements before the initial fit gives up waiting. */
const initialFitViewFrames = 60

/**
 * React `fitView` prop: fit once every visible node has been measured (or
 * after `initialFitViewFrames` frames), as React queues the fit until the
 * nodes are initialized.
 */
const scheduleInitialFitView = (
  host: Pick<FlowController, 'nodesInitialized' | 'fitView'>,
  fitOptions: FitViewOptions,
  disposed: () => boolean
): void => {
  const fitOnce = async (): Promise<void> => {
    try {
      await host.fitView(fitOptions)
    } catch {
      // The initial fit is best effort; a disposed or detached canvas skips it.
    }
  }

  const attempt = (frame: number): void => {
    if (disposed()) {
      return
    }

    if (host.nodesInitialized() || frame >= initialFitViewFrames) {
      void fitOnce()

      return
    }

    globalThis.requestAnimationFrame(() => attempt(frame + 1))
  }

  globalThis.requestAnimationFrame(() => attempt(0))
}

/** Late-bound host that drag listeners read their dragged nodes from. */
interface DraggedNodesSource {
  current: FlowController | undefined
}

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

  const decodedOptions = Effect.runSync(
    S.decodeUnknownEffect(FlowMountOptionsSchema)(inputOptions)
  )

  const options = {
    ...decodedOptions,
    viewport: {
      ...decodedOptions.viewport,
      initial: Effect.runSync(
        decodeInitialViewport(
          decodedOptions.viewport.initial,
          decodedOptions.viewport.limits
        )
      ),
      extent: decodedOptions.translateExtent ?? decodedOptions.viewport.extent,
    },
    ariaLabelConfig: decodeAriaLabelConfig(inputOptions.ariaLabelConfig),
  }

  const initialFitViewOptions = Effect.runSync(
    S.decodeUnknownEffect(FitViewOptionsSchema)(
      inputOptions.fitViewOptions ?? {}
    )
  )

  const document = Effect.runSync(decodeFlowDocument(input))

  // Bound once the host exists; drag listeners only run after mounting.
  const draggedNodesSource: DraggedNodesSource = { current: undefined }

  /** Node drag listener that also reports group drags as selection drags. */
  const withSelectionDrag = <P extends FlowNodeDragPayload>(
    nodeListener: ((drag: P) => void) | undefined,
    selectionListener:
      | ((drag: P & { readonly nodes: readonly FlowNode[] }) => void)
      | undefined
  ): ((drag: P) => void) | undefined => {
    if (nodeListener === undefined && selectionListener === undefined) {
      return undefined
    }

    return (drag) => {
      nodeListener?.(drag)

      if (selectionListener === undefined || drag.nodeIds.length < 2) {
        return
      }

      selectionListener({
        ...drag,
        nodes: drag.positions.flatMap(({ nodeId, position }) => {
          const node = draggedNodesSource.current?.getNode(nodeId)

          return node === undefined ? [] : [{ ...node, position }]
        }),
      })
    }
  }

  const host = Effect.runSync(
    createFlowHost(root, document, {
      ...options,
      defaultEdgeOptions,
      onNodesChange: inputOptions.onNodesChange,
      onEdgesChange: inputOptions.onEdgesChange,
      onMoveStart: inputOptions.onMoveStart,
      onMove: inputOptions.onMove,
      onMoveEnd: inputOptions.onMoveEnd,
      onNodeDragStart: withSelectionDrag(
        inputOptions.onNodeDragStart,
        inputOptions.onSelectionDragStart
      ),
      onNodeDrag: withSelectionDrag(
        inputOptions.onNodeDrag,
        inputOptions.onSelectionDragMove
      ),
      onNodeDragStop: withSelectionDrag(
        inputOptions.onNodeDragStop,
        inputOptions.onSelectionDragStop
      ),
      onConnectStart: inputOptions.onConnectStart,
      onClickConnectStart: inputOptions.onClickConnectStart,
      onConnect: inputOptions.onConnect,
      onConnectEnd: inputOptions.onConnectEnd,
      onClickConnectEnd: inputOptions.onClickConnectEnd,
      onReconnectStart: inputOptions.onReconnectStart,
      onReconnect: inputOptions.onReconnect,
      onReconnectEnd: inputOptions.onReconnectEnd,
      onSelectionStart: inputOptions.onSelectionStart,
      onSelectionDrag: inputOptions.onSelectionDrag,
      onSelectionEnd: inputOptions.onSelectionEnd,
      onSelectionContextMenu: inputOptions.onSelectionContextMenu,
      onPaneClick: inputOptions.onPaneClick,
      onPaneScroll: inputOptions.onPaneScroll,
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
      onHandleRender: inputOptions.onHandleRender,
      nodeRenderers: inputOptions.nodeRenderers,
      edgeRenderers: inputOptions.edgeRenderers,
      onToolbarAnchors: inputOptions.onToolbarAnchors,
      panel: inputOptions.panel,
      panels: inputOptions.panels,
      toolbarContainers: inputOptions.toolbarContainers,
      runEffect: Effect.runSync,
    }).pipe(Effect.provide(FlowBrowserLive))
  )

  draggedNodesSource.current = host
  let deleteSequence = 0
  let controllerDisposed = false
  const pendingDeleteRejectors = new Set<(error: Error) => void>()

  const controller: JavaScriptFlowController = {
    ...createFlowInstanceApi(host),
    overlayPortal: host.overlayPortal,
    getAriaLabelConfig: host.getAriaLabelConfig,
    getRenderedNodePositions: host.getRenderedNodePositions,
    subscribeRenderedPositions: host.subscribeRenderedPositions,
    registerNodeResizer: host.registerNodeResizer,
    getColorMode: host.getColorMode,
    setColorMode: (mode) =>
      host.setColorMode(S.decodeUnknownSync(FlowColorModeSchema)(mode)),
    mountViewportPortal: host.mountViewportPortal,
    getConnectionPreview: host.getConnectionPreview,
    subscribeConnectionPreview: host.subscribeConnectionPreview,
    getConnection: host.getConnection,
    subscribeConnection: host.subscribeConnection,
    getInteractivity: host.getInteractivity,
    setInteractivity: host.setInteractivity,
    setCanvasOptions: host.setCanvasOptions,
    subscribeInteractivity: host.subscribeInteractivity,
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

        const approval = {
          settle(
            outcome:
              | { readonly kind: 'rejected'; readonly error: Error }
              | { readonly kind: 'resolved'; readonly result: FlowDeleteResult }
          ): void {
            if (settled) {
              return
            }

            settled = true
            pendingDeleteRejectors.delete(approval.reject)
            lifecycle?.signal?.removeEventListener('abort', approval.abort)

            if (outcome.kind === 'rejected') {
              pending.reject(outcome.error)
            } else {
              pending.resolve(outcome.result)
            }
          },
          reject(error: Error): void {
            approval.settle({ kind: 'rejected', error })
          },
          abort(): void {
            approval.reject(new FlowDeleteCancelled({ operationId }))
          },
        }

        pendingDeleteRejectors.add(approval.reject)
        lifecycle.signal?.addEventListener('abort', approval.abort, {
          once: true,
        })
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

              approval.settle({ kind: 'resolved', result: result.deletion })

              return
            }

            approval.settle({
              kind: 'resolved',
              result: { deletedNodeIds: [], deletedEdgeIds: [] },
            })
          } catch (error) {
            approval.reject(
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

  if (inputOptions.onSelectionChange !== undefined) {
    host.subscribeSelection(inputOptions.onSelectionChange)
  }

  if (decodedOptions.fitView === true) {
    scheduleInitialFitView(
      host,
      initialFitViewOptions,
      () => controllerDisposed
    )
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
