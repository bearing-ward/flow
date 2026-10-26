import {
  solveFlowAlignment,
  resolveFlowAlignmentGuides,
  FlowEdgeRouteSchema,
  getManualRouteGeometry,
  editEdgeRoute,
  sampleRoutePoint,
  refitFlowGroups,
  createFlowClipboardSession,
  createFlowHistory,
  flowHistoryStatus,
  flowHistoryDocumentsEqual,
  flowHistoryDocument,
  reduceFlowHistory,
  restoreFlowHistoryDocument,
  FlowTransactionContextSchema,
  collectFlowEdgeMarkers,
  resolveFlowEdgeMarker,
  computeFlowStacking,
  FlowExtentInputSchema,
  FlowSnapGridInputSchema,
  FlowFitViewOptionsSchema,
  resolveFitViewNodeIds,
  resolveFlowAriaLabelConfig,
  flowNodeHandles,
  flowClassNames,
  constrainViewportToExtent,
  applyNodePositionChange,
  applyNodePositionsChange,
  applyNodeBoundsChange,
  applyEdgeReconnectChange,
  applySelectionSetChange,
  applyNodeMeasurements,
  areFlowNodesInitialized,
  bezierEdgePath,
  createFlowSnapshot,
  createFlowGraph,
  decodeFlowDocument,
  decodeInitialViewport,
  edgeAttachmentPosition,
  edgeLabelPosition,
  fitViewportToNodes,
  emptyFlowMeasurementState,
  projectFlowInternalNode,
  getFlowInternalNode,
  getFlowMeasuredNodes,
  getViewportForBounds,
  interpolateViewport,
  FlowSnapshotSchema,
  FlowDocumentSchema,
  setNodeMeasurementGenerations,
  nextConnectionEdge,
  panViewport,
  prepareFlowEdit,
  prepareFlowDeleteCandidate,
  resolveEdgeHandles,
  simpleBezierEdgePath,
  smoothStepEdgePath,
  straightEdgePath,
  stepEdgePath,
  validateFlowConnection,
  connectionFromHandleGesture,
  ViewportSchema,
  ViewportBoundsSchema,
  ViewportLimitsSchema,
  ViewportAnimationOptionsSchema,
  ViewportPaddingSchema,
  pruneFlowMeasurements,
  zoomViewportAt,
  selectionInRect,
  calculateNodeResize,
  graphResizeChildExtent,
  canReconnectEdge,
  reconnectFlowEdge,
  normalizeFlowConnection,
  nearestConnectionTarget,
  ConnectionModeSchema,
  NodeDragThresholdSchema,
  NodeOriginSchema,
  FlowNodeSchema,
  resolveNodeOrigin,
  defaultNodeDragThreshold,
  decodeNodeDragThreshold,
  nodeDragActivated,
  ConnectionDragThresholdSchema,
  defaultConnectionDragThreshold,
  connectionDragActivated,
  HandleIdSchema,
  EdgeIdSchema,
  ReconnectEndpointSchema,
  ConnectionRadiusSchema,
  selectionAutoPanDelta,
  NodeIdSchema,
  FlowAttribute,
  FlowSpan,
  applyDefaultEdgeOptions,
  decodeFlowDefaultEdgeOptions,
  createConnectionPreviewSnapshot,
  selectFlowSelection,
  flowSelectionEqual,
  flowConnectionLineProps,
  flowEdgeRendererProps,
  flowNodeBounds,
  graphBounds,
  flowNodeRendererProps,
  sameFlowEdgeRendererProps,
  sameFlowNodeRendererProps,
  flowChangeElementChanges,
  flowResizeCompletionChanges,
  flowConnectionState,
  flowFinalConnectionState,
  handleGestureConnectable,
  isHandleConnectable,
  isNodeConnectable,
  isNodeDraggable,
  isNodeSelectable,
  isEdgeSelectable,
} from '@flow/core'
import type {
  FlowAlignmentGuide,
  FlowHistoryEvent,
  FlowTransactionContext,
  FlowInternalNode,
  CoordinateExtent,
  FlowStyle,
  FlowAriaLabelConfigInput,
  FlowColorMode,
  FlowZIndexMode,
  PanExtent,
  SnapGrid,
  SnapGridTuple,
  EdgeChange,
  FlowChange,
  FlowConnectionState,
  FlowFinalConnectionState,
  FlowGraphNode,
  FlowGraphView,
  NodeChange,
  FlowConnection,
  ConnectionPreviewState,
  ConnectionMode,
  ConnectionRadius,
  FlowCommand,
  FlowDocument,
  FlowEdge,
  FlowDefaultEdgeOptions,
  FlowEditResult,
  FlowEditTransactionInput,
  FlowEdgePath,
  FlowConnectionLineType,
  FlowNodeRendererProps,
  FlowHandle,
  FlowMeasurementState,
  NodeMeasurementGeneration,
  NodeMeasurementInput,
  FlowNode,
  FlowSnapshot,
  FlowStateChange,
  NodeBoundsChange,
  NodeResizeDirection,
  SelectionMode,
  NodeExtent,
  NodeId,
  XYPosition,
  MeasuredHandle,
  Viewport,
  ViewportAnimationOptions,
  ViewportBounds,
  ViewportOperationResult,
  ViewportPadding,
  ViewportLimits,
} from '@flow/core'
import { Effect, Exit, Predicate, Schema as S } from 'effect'
import {
  Fragment,
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowReactive,
  shallowRef,
  nextTick,
  useId,
  watch,
} from 'vue'
import type {
  Component,
  ComponentPublicInstance,
  DeepReadonly,
  PropType,
  SlotsType,
  VNode,
} from 'vue'

import {
  ensureFlowVueThemeStylesheet,
  flowVueEdgeClasses,
  flowVueEdgeLabelBox,
  flowVueLabelStyle,
  flowVueStyle,
  renderFlowEdgeMarker,
  useFlowColorModeClass,
} from './canvas-presentation.ts'
import { constrainFlowVueDrag } from './drag-constraints.ts'
import type { FlowVueDragStep } from './drag-constraints.ts'
import {
  FlowEdgeInteractionRegistryKey,
  FlowEdgeScope,
} from './edge-interaction.ts'
import {
  createEdgeLabelRegistry,
  createRendererPropsCache,
  declaredRendererProps,
  FlowEdgeLabelRendererContextKey,
} from './edge-label-renderer.ts'
import { createVueRouteEditor } from './editable-edges.ts'
import { createFlowInteractivityState } from './interactivity.ts'
import { isInputDOMNode, observeKeyPress } from './key-press-observer.ts'
import type { FlowKeyCode, FlowKeyPressOptions } from './key-press-observer.ts'
import { FlowMiniMapContextKey } from './minimap.ts'
import {
  dragGroupMembers,
  isMultiSelectionEvent,
  isNodeControl,
  selectionAfterEdgeClick,
  selectionAfterNodeClick,
  dragCarriedNodes,
} from './node-drag-group.ts'
import type { DragMember } from './node-drag-group.ts'
import { collectNodeHandles, renderedViewportZoom } from './node-measurement.ts'
import { FlowNodeResizerRegistryKey } from './node-resizer.ts'
import type { FlowNodeResizerHost } from './node-resizer.ts'
import { FlowNodeToolbarContextKey } from './node-toolbar.ts'
import { FlowProviderKey } from './provider.ts'
import { FlowEditorKey, FlowNodeIdKey } from './use-flow.ts'
import type {
  FlowCanvasFitViewOptions,
  FlowEditor,
  FlowErrorBoundary,
  FlowErrorReport,
} from './use-flow.ts'
import { FlowViewportPortalContextKey } from './viewport-portal.ts'

const recordFlowTelemetry = (
  message: string,
  span: string,
  attributes: Readonly<Record<string, string | number | boolean>>,
  cause?: unknown
): void => {
  Effect.runSync(
    (cause === undefined
      ? Effect.logDebug(message)
      : Effect.logError(message, cause)
    ).pipe(
      Effect.annotateLogs(attributes),
      Effect.withSpan(span, { attributes })
    )
  )
}

const recordFlowFailure = (
  message: string,
  span: string,
  attributes: Readonly<Record<string, string | number | boolean>>
): void => {
  Effect.runSync(
    Effect.logError(message).pipe(
      Effect.annotateLogs(attributes),
      Effect.withSpan(span, { attributes })
    )
  )
}

const interactionCompletionSpan = (change: FlowChange): string => {
  if (change.kind === 'edge-add') {
    return FlowSpan.connectionComplete
  }

  if (change.kind === 'edge-reconnect') {
    return FlowSpan.edgeReconnectComplete
  }

  if (
    change.kind === 'node-position' ||
    change.kind === 'node-positions' ||
    change.kind === 'node-bounds'
  ) {
    return FlowSpan.nodeDragComplete
  }

  return change.kind === 'selection-set'
    ? FlowSpan.selectionSet
    : FlowSpan.editPrepare
}

const sameNodeSize = (
  left: FlowNode['size'],
  right: FlowNode['size']
): boolean => left?.width === right?.width && left?.height === right?.height

const NodeFrameSchema = S.Struct({
  origin: NodeOriginSchema,
  parentIds: S.Array(NodeIdSchema),
  parentX: S.Finite,
  parentY: S.Finite,
})

const NodeDragFields = {
  pointerId: S.Number,
  node: FlowNodeSchema,
  startX: S.Finite,
  startY: S.Finite,
  originX: S.Finite,
  originY: S.Finite,
  frame: NodeFrameSchema,
}

const NodeDragSessionSchema = S.Union([
  S.Struct({
    ...NodeDragFields,
    kind: S.Literal('node-pending'),
    threshold: NodeDragThresholdSchema,
  }),
  S.Struct({ ...NodeDragFields, kind: S.Literal('node') }),
])

type DragSession = typeof NodeDragSessionSchema.Type & {
  readonly element: HTMLElement
  readonly captureTarget: HTMLElement
  readonly viewportStart: Viewport
  /** Every node the drag moves, set when the drag activates. */
  readonly members?: readonly DragMember[]
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

type PendingConnectionData = typeof PendingConnectionSchema.Type & {
  readonly freeform?: boolean | undefined
  readonly captureTarget: HTMLElement | SVGElement
}

interface ConnectionData {
  readonly kind: 'connection'
  readonly pointerId: number
  readonly captureTarget: HTMLElement | SVGElement
  readonly sourceNode: FlowNode
  readonly sourceHandle: FlowHandle['id']
  readonly start: { readonly x: number; readonly y: number }
  readonly pointer: { readonly x: number; readonly y: number }
  readonly freeform?: readonly XYPosition[] | undefined
  readonly reconnect?: {
    readonly edgeId: string
    readonly endpoint: 'source' | 'target'
    readonly handleSignature: string
  }
}

const snapshotEquivalence = S.toEquivalence(FlowSnapshotSchema)

const documentEquivalence = S.toEquivalence(FlowDocumentSchema)

const viewportEquivalence = S.toEquivalence(ViewportSchema)

const decodeViewportRequestTarget = S.decodeUnknownSync(
  ViewportSchema.check(
    S.makeFilter((value) => {
      if (!Number.isFinite(value.x)) {
        return { path: ['x'], issue: 'Viewport request x must be finite' }
      }

      if (!Number.isFinite(value.y)) {
        return { path: ['y'], issue: 'Viewport request y must be finite' }
      }

      return true
    })
  )
)

const viewportKey = (viewport: Viewport): string =>
  `${viewport.x},${viewport.y},${viewport.zoom}`

const noopUnsubscribe = (): boolean => false

/** The last canvas focused in each document owns keys from outside controls. */
const focusedCanvasOwners = new WeakMap<Document, HTMLElement>()

const keyboardResizeDelta = (
  key: string,
  step: number
): { readonly x: number; readonly y: number } | undefined => {
  if (key === 'ArrowLeft') {
    return { x: -step, y: 0 }
  }

  if (key === 'ArrowRight') {
    return { x: step, y: 0 }
  }

  if (key === 'ArrowUp') {
    return { x: 0, y: -step }
  }

  if (key === 'ArrowDown') {
    return { x: 0, y: step }
  }

  return undefined
}

/** React `EdgeAnchor` shift: the anchor sits one radius outside its handle side. */
const reconnectAnchorOffset = (
  side: FlowHandle['side'],
  radius: number
): XYPosition => {
  if (side === 'top') {
    return { x: 0, y: -radius }
  }

  if (side === 'bottom') {
    return { x: 0, y: radius }
  }

  return { x: side === 'left' ? -radius : radius, y: 0 }
}

interface PanSession {
  readonly kind: 'pan'
  readonly pointerId: number
  readonly captureTarget: HTMLElement
  readonly startX: number
  readonly startY: number
  readonly viewportStart: Viewport
}

interface SelectionSession {
  readonly kind: 'selection'
  readonly threshold: number
  readonly activated: boolean
  readonly pointerId: number
  readonly captureTarget: HTMLElement
  readonly startX: number
  readonly startY: number
  readonly start: { readonly x: number; readonly y: number }
  readonly pointer: { readonly x: number; readonly y: number }
}

interface ResizeSession {
  readonly kind: 'resize'
  readonly pointerId: number
  readonly captureTarget: HTMLElement
  readonly node: FlowNode
  readonly element: HTMLElement
  readonly direction: NodeResizeDirection
  readonly start: { readonly x: number; readonly y: number }
  readonly position: { readonly x: number; readonly y: number }
  readonly size: { readonly width: number; readonly height: number }
  readonly childExtent: NodeExtent | undefined
}

interface KeyboardResizeSession {
  readonly kind: 'keyboard-resize'
  readonly pointerId: -1
  readonly captureTarget: HTMLElement
  readonly node: FlowNode
  readonly element: HTMLElement
  readonly direction: NodeResizeDirection
  readonly position: { readonly x: number; readonly y: number }
  readonly size: { readonly width: number; readonly height: number }
  readonly key: string
  readonly step: number
  readonly delta: { readonly x: number; readonly y: number }
  readonly change: NodeBoundsChange
  readonly childExtent: NodeExtent | undefined
}

interface NodePositionStyle {
  left: string
  top: string
  width?: string
  height?: string
}

const FitBoundsOptionsSchema = S.Struct({
  duration: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  easing: S.optional(S.Literals(['linear', 'ease-in-out'])),
  padding: S.optional(ViewportPaddingSchema),
})

const FitViewOptionsSchema = S.Struct({
  ...FlowFitViewOptionsSchema.fields,
  nodes: S.optional(
    S.Union([
      S.Literals(['all', 'selected']),
      S.Array(S.String),
      S.Array(S.Struct({ id: S.String })),
    ])
  ),
})

const unwrapReactive = <Value>(value: Value): Value => {
  if (Array.isArray(value)) {
    // SAFETY: Mapping keeps the input array's element type and order.
    return value.map((item) => unwrapReactive(item)) as Value
  }

  if (Predicate.isObject(value)) {
    const plainValue = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, unwrapReactive(item)])
    )

    // SAFETY: This helper only receives acyclic FlowDocument and Viewport schema values.
    return plainValue as Value
  }

  return value
}

/**
 * Renderer components may declare any subset of the renderer props (see
 * FlowNodeProps, FlowEdgeProps and FlowConnectionLineComponentProps), so the
 * registries accept any component.
 */
type NodeVisual = Component

type EdgeVisual = Component<{ readonly edge: FlowEdge }>

type ConnectionPreviewVisual = Component

type EdgeTypeVisual = Component

const edgePath = (
  path: FlowEdgePath | undefined,
  source: { readonly x: number; readonly y: number },
  target: { readonly x: number; readonly y: number },
  sourceSide: FlowHandle['side'],
  targetSide: FlowHandle['side']
): string => {
  const selectedPath = path ?? 'straight'

  switch (selectedPath) {
    case 'bezier': {
      return bezierEdgePath(source, target, sourceSide, targetSide)
    }

    case 'simplebezier': {
      return simpleBezierEdgePath(source, target, sourceSide, targetSide)
    }

    case 'smoothstep': {
      return smoothStepEdgePath(source, target, sourceSide, targetSide)
    }

    case 'step': {
      return stepEdgePath(source, target, sourceSide, targetSide)
    }

    case 'straight': {
      return straightEdgePath(source, target)
    }

    default: {
      const exhaustive: never = selectedPath

      return exhaustive
    }
  }
}

const renderDefaultEdgePath = (
  edge: FlowEdge,
  path: string,
  markerStart: string | undefined,
  markerEnd: string | undefined
): VNode =>
  h('path', {
    class: 'flow-vue-edge-path',
    'data-testid': 'flow-edge-path',
    d: path,
    fill: 'none',
    // Without an explicit stroke the themed CSS default applies.
    stroke: edge.stroke,
    'stroke-width': edge.strokeWidth ?? 1.5,
    style: flowVueStyle(edge.style),
    'marker-start': markerStart,
    'marker-end': markerEnd,
  })

const hasClassAncestor = (
  target: Element,
  className: string | undefined
): boolean =>
  className !== undefined &&
  className.length > 0 &&
  target.closest(`.${CSS.escape(className)}`) !== null

const isNodePointerTargetAllowed = (
  content: HTMLElement,
  target: HTMLElement
): boolean => {
  const dragHandle = target.closest<HTMLElement>('[data-flow-drag-handle]')

  if (
    content.querySelector('[data-flow-drag-handle]') !== null &&
    (dragHandle === null || !content.contains(dragHandle))
  ) {
    return false
  }

  const nativeControl = target.closest(
    'button, input, select, textarea, a[href], [contenteditable="true"]'
  )

  return nativeControl === null || nativeControl === dragHandle
}

/**
 * React `dragHandle`: with a selector, only a press inside a matching
 * element of the node starts a drag. An invalid selector matches nothing.
 */
const insideDragHandle = (
  content: HTMLElement,
  target: HTMLElement,
  dragHandle: string | undefined
): boolean => {
  if (dragHandle === undefined) {
    return true
  }

  try {
    const handle = target.closest(dragHandle)

    return handle !== null && content.contains(handle)
  } catch {
    return false
  }
}

/** The document a change applies to, as both owner modes compute it. */
const applyPublishedChange = (
  base: FlowDocument,
  change: FlowChange
): FlowDocument | undefined => {
  switch (change.kind) {
    case 'node-position': {
      return applyNodePositionChange(base, change)
    }

    case 'node-positions': {
      return applyNodePositionsChange(base, change)
    }

    case 'node-bounds': {
      return applyNodeBoundsChange(base, change)
    }

    case 'selection-set': {
      return applySelectionSetChange(base, change)
    }

    case 'edge-add': {
      return { ...base, edges: [...base.edges, change.edge] }
    }

    case 'edge-reconnect': {
      return applyEdgeReconnectChange(base, change)
    }

    default: {
      return undefined
    }
  }
}

// SAFETY: DefaultNode receives FlowNode values created from the decoded graph.
const DefaultNode = defineComponent({
  name: 'FlowDefaultNode',
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () => h('span', { class: 'flow-vue-node-label' }, props.node.label)
  },
})

const NodeWithIdContext = defineComponent({
  name: 'FlowNodeIdScope',
  props: {
    // SAFETY: NodeWithIdContext is mounted only with FlowNode values from the accepted graph snapshot.
    node: { type: Object as PropType<FlowNode>, required: true },
    // SAFETY: NodeWithIdContext receives only the resolved host renderer component.
    visual: { type: Object as PropType<NodeVisual>, required: true },
    // SAFETY: The canvas computes these props from the same accepted node snapshot.
    rendererProps: {
      type: Object as PropType<FlowNodeRendererProps>,
      required: true,
    },
  },
  setup(scopeProps, { slots: scopedSlots }) {
    provide(FlowNodeIdKey, scopeProps.node.id)

    return () =>
      h(
        scopeProps.visual,
        {
          ...declaredRendererProps(scopeProps.visual, scopeProps.rendererProps),
          node: scopeProps.node,
        },
        scopedSlots
      )
  },
})

const EdgeLabelAnchorSchema = S.Struct({ x: S.Finite, y: S.Finite })

const edgeLabelAnchor = (
  edge: FlowEdge
): { x: number; y: number } | undefined => {
  const anchor = edge.data?.labelAnchor

  return S.is(EdgeLabelAnchorSchema)(anchor) ? anchor : undefined
}

interface ConnectionEndPayload {
  readonly status: 'accepted' | 'proposed' | 'rejected' | 'cancelled'
  readonly reason: string
  readonly connection?: FlowConnection
}

/**
 * Second `connectEnd` and `reconnectEnd` argument, as React Flow's
 * `onConnectEnd(event, connectionState)`.
 */
export interface FlowConnectionEndDetails {
  /** React Flow `FinalConnectionState` from the last in-progress state. */
  readonly connectionState: FlowFinalConnectionState
  /** Release pointer client coordinates; absent for keyboard completion. */
  readonly clientPosition?: { readonly x: number; readonly y: number }
  /** The releasing pointer event; absent for keyboard completion. */
  readonly event?: PointerEvent
}

interface NodeEndPayload {
  readonly node: FlowNode
  readonly status: Exclude<ConnectionEndPayload['status'], 'rejected'>
  readonly reason?: string
}

interface SelectionEndPayload {
  readonly status: NodeEndPayload['status']
  readonly reason: string
}

// SAFETY: FlowCanvas decodes document, node, and edge props before graph use; Vue's PropType supplies their static contracts.
export const FlowCanvas = defineComponent({
  name: 'FlowCanvas',
  props: {
    historyCapacity: { type: Number, default: 100 },
    documentContext: {
      type: Object as PropType<FlowTransactionContext>,
      default: undefined,
    },
    document: { type: Object as PropType<FlowDocument>, default: undefined },
    defaultDocument: {
      type: Object as PropType<FlowDocument>,
      default: undefined,
    },
    documentMode: {
      type: String as PropType<'controlled' | 'uncontrolled'>,
      default: 'uncontrolled',
    },
    nodes: { type: Array as PropType<readonly FlowNode[]>, default: undefined },
    edges: { type: Array as PropType<readonly FlowEdge[]>, default: undefined },
    viewport: { type: Object as PropType<Viewport>, default: undefined },
    defaultViewport: {
      type: Object as PropType<Viewport>,
      default: () => ({ x: 0, y: 0, zoom: 1 }),
    },
    viewportMode: {
      type: String as PropType<'controlled' | 'uncontrolled'>,
      default: 'uncontrolled',
    },
    viewportLimits: {
      type: Object as PropType<ViewportLimits>,
      default: () => ({ minZoom: 0.4, maxZoom: 2 }),
    },
    nodeComponent: {
      type: [Object, Function] as PropType<NodeVisual>,
      default: undefined,
    },
    edgeComponent: {
      type: [Object, Function] as PropType<EdgeVisual>,
      default: undefined,
    },
    nodeTypes: {
      type: Object as PropType<Readonly<Record<string, NodeVisual>>>,
      default: undefined,
    },
    edgeTypes: {
      type: Object as PropType<Readonly<Record<string, EdgeTypeVisual>>>,
      default: undefined,
    },
    defaultEdgeOptions: {
      type: Object as PropType<FlowDefaultEdgeOptions>,
      default: undefined,
    },
    isValidConnection: {
      type: Function as PropType<(candidate: FlowConnection) => boolean>,
      default: () => true,
    },
    connectionPreview: {
      type: [Object, Function] as PropType<ConnectionPreviewVisual>,
      default: undefined,
    },
    /** Built-in connection line path; the default keeps the straight preview. */
    connectionLineType: {
      type: String as PropType<FlowConnectionLineType>,
      default: undefined,
    },
    connectionMode: {
      type: String as PropType<ConnectionMode>,
      default: 'strict',
    },
    nodeDragThreshold: { type: Number, default: defaultNodeDragThreshold },
    connectionDragThreshold: {
      type: Number,
      default: defaultConnectionDragThreshold,
    },
    connectionRadius: {
      type: Number as PropType<ConnectionRadius>,
      default: 20,
    },
    autoPanOnConnect: { type: Boolean, default: true },
    /** Enable viewport dragging with the primary button or an explicit button list. */
    panOnDrag: {
      type: [Boolean, Array] as PropType<boolean | readonly number[]>,
      default: true,
    },
    /** Start a selection rectangle on an unmodified primary-button drag. */
    selectionOnDrag: { type: Boolean, default: false },
    /** Pan the viewport with wheel input instead of zooming. */
    panOnScroll: { type: Boolean, default: false },
    /** Scale wheel pan distance. */
    panOnScrollSpeed: { type: Number, default: 1 },
    /** Restrict wheel pan to one axis. */
    panOnScrollMode: {
      type: String as PropType<'free' | 'horizontal' | 'vertical'>,
      default: 'free',
    },
    /** Select a node when a drag begins on it. */
    selectNodesOnDrag: { type: Boolean, default: false },
    /** Allow a click on a source handle to begin a two-click connection. */
    connectOnClick: { type: Boolean, default: true },
    /** Zoom the viewport with wheel input. */
    zoomOnScroll: { type: Boolean, default: true },
    /** Zoom in around a pane double-click. */
    zoomOnDoubleClick: { type: Boolean, default: false },
    /** Optional key names required to activate viewport pan or zoom. */
    panActivationKeyCode: { type: String, default: undefined },
    zoomActivationKeyCode: { type: String, default: undefined },
    /** Optional class names whose descendants cannot start the matching gesture. */
    noPanClassName: { type: String, default: 'flow-vue-no-pan' },
    noDragClassName: { type: String, default: 'flow-vue-no-drag' },
    noWheelClassName: { type: String, default: 'flow-vue-no-wheel' },
    renderOnlyVisible: { type: Boolean, default: false },
    selectionMode: { type: String as PropType<SelectionMode>, default: 'full' },
    /** Node drag and resize bounds: React `[[minX, minY], [maxX, maxY]]` or `{ minX, minY, maxX, maxY }`. */
    nodeExtent: {
      type: [Object, Array] as PropType<NodeExtent | CoordinateExtent>,
      default: undefined,
    },
    /** Viewport pan bounds in flow coordinates, React `translateExtent`. */
    translateExtent: {
      type: [Object, Array] as PropType<PanExtent | CoordinateExtent>,
      default: undefined,
    },
    /** Show node-relative alignment guides and snap during pointer drags. */
    helperLines: { type: Boolean, default: false },
    /** Snap node drags and resizes to `snapGrid`. */
    snapToGrid: { type: Boolean, default: false },
    /** Grid step: React `[x, y]` or `{ x, y }`. */
    snapGrid: {
      type: [Array, Object] as PropType<SnapGridTuple | SnapGrid>,
      default: () => [15, 15],
    },
    /** React `colorMode`: toggles the `dark` theme defaults on the canvas root. */
    colorMode: {
      type: String as PropType<FlowColorMode>,
      default: 'light',
    },
    /** React `zIndexMode`. */
    zIndexMode: {
      type: String as PropType<FlowZIndexMode>,
      default: 'basic',
    },
    elevateNodesOnSelect: { type: Boolean, default: true },
    elevateEdgesOnSelect: { type: Boolean, default: false },
    /** Partial React `ariaLabelConfig`; explicit component `ariaLabel` props win. */
    ariaLabelConfig: {
      type: Object as PropType<FlowAriaLabelConfigInput>,
      default: undefined,
    },
    /** Marker colour for markers without their own colour on edges without a stroke. */
    defaultMarkerColor: { type: String, default: undefined },
    /** Fit the view to the nodes once they are first measured, React `fitView`. */
    fitView: { type: Boolean, default: false },
    /** Options of the initial `fitView` (React `FitViewOptions`). */
    fitViewOptions: {
      type: Object as PropType<FlowCanvasFitViewOptions>,
      default: undefined,
    },
    /** React `minZoom`/`maxZoom`; override `viewportLimits` when set. */
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    /** React `nodesFocusable`; a node's own `focusable` wins. */
    nodesFocusable: { type: Boolean, default: true },
    /** React `edgesFocusable`; an edge's own `focusable` wins. */
    edgesFocusable: { type: Boolean, default: true },
    /** React `edgesReconnectable`; an edge's own `reconnectable` wins. */
    edgesReconnectable: { type: Boolean, default: true },
    /** Enable manual route-point editing and Space-held freeform connections. */
    editableEdges: { type: Boolean, default: false },
    /**
     * React `deleteKeyCode`: document-level deletion of selected, deletable
     * elements outside editable controls. `null` disables it.
     */
    deleteKeyCode: {
      type: [String, Array, null] as PropType<FlowKeyCode>,
      default: 'Backspace',
    },
    /** React `selectionKeyCode`: held to draw a selection box. `null` disables it. */
    selectionKeyCode: {
      type: [String, null] as PropType<string | null>,
      default: 'Shift',
    },
    /**
     * React `multiSelectionKeyCode`: held to toggle a clicked element in the
     * selection. Defaults to Meta or Control; `null` disables it.
     */
    multiSelectionKeyCode: {
      type: [String, null] as PropType<string | null>,
      default: undefined,
    },
    /** React `zoomOnPinch`: trackpad pinch (Control + wheel) zooms. */
    zoomOnPinch: { type: Boolean, default: true },
    /** React `preventScrolling`: wheel input over the pane never scrolls the page. */
    preventScrolling: { type: Boolean, default: true },
    /** React `autoPanSpeed`: auto-pan step in pixels near the pane edge. */
    autoPanSpeed: { type: Number, default: 15 },
    /** React `connectionLineStyle` for the built-in connection line. */
    connectionLineStyle: {
      type: Object as PropType<FlowStyle>,
      default: undefined,
    },
    /** React `connectionLineContainerStyle`: style of the group holding the connection line. */
    connectionLineContainerStyle: {
      // SAFETY: Vue validates an object prop; FlowStyle is the public style contract.
      type: Object as PropType<FlowStyle>,
      default: undefined,
    },
    /** React `autoPanOnNodeDrag`: pan when a dragged node nears the pane edge. */
    autoPanOnNodeDrag: { type: Boolean, default: true },
    /** React `autoPanOnSelection`: pan when a selection box nears the pane edge. */
    autoPanOnSelection: { type: Boolean, default: true },
    /** React `autoPanOnNodeFocus`: centre a keyboard-focused node outside the view. */
    autoPanOnNodeFocus: { type: Boolean, default: true },
    /** React `paneClickDistance`: pointer travel, in pixels, after which a pane press is no click. */
    paneClickDistance: { type: Number, default: 1 },
    /** React `nodeClickDistance`: pointer travel, in pixels, after which a node press is no click. */
    nodeClickDistance: { type: Number, default: 0 },
    /** React `reconnectRadius`: radius of the reconnect anchors at a selected edge's ends. */
    reconnectRadius: { type: Number, default: 10 },
    /**
     * React `disableKeyboardA11y`: turns off keyboard selection, arrow-key
     * node moves, the move announcements and node focus auto-pan.
     */
    disableKeyboardA11y: { type: Boolean, default: false },
    // These callback props affect hit testing. Vue can skip updates for emit-only listeners.
    onNodeClick: {
      type: Function as PropType<
        ((node: FlowNode, event?: MouseEvent) => void) | undefined
      >,
      default: undefined,
    },
    onNodeMouseEnter: {
      type: Function as PropType<
        ((node: FlowNode, event?: MouseEvent) => void) | undefined
      >,
      default: undefined,
    },
    onNodeMouseMove: {
      type: Function as PropType<
        ((node: FlowNode, event?: MouseEvent) => void) | undefined
      >,
      default: undefined,
    },
    onNodeMouseLeave: {
      type: Function as PropType<
        ((node: FlowNode, event?: MouseEvent) => void) | undefined
      >,
      default: undefined,
    },
    onEdgeClick: {
      type: Function as PropType<
        | ((edge: FlowEdge, event?: PointerEvent | KeyboardEvent) => void)
        | undefined
      >,
      default: undefined,
    },
    /** Let nodes be dragged; a node's own `draggable` wins. */
    nodesDraggable: { type: Boolean, default: true },
    /** Let handles start and finish connections; node and handle flags win. */
    nodesConnectable: { type: Boolean, default: true },
    /** Let nodes and edges be selected; an element's own `selectable` wins. */
    elementsSelectable: { type: Boolean, default: true },
    /** Show resize controls on selected nodes, as a React Flow `NodeResizer` would. */
    nodesResizable: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{
    default: Record<string, never>
    node: { readonly node: FlowNode }
    edge: { readonly edge: FlowEdge }
  }>,
  emits: {
    change: (_change: FlowChange) => true,
    /** React Flow `onNodesChange` deltas for each semantic change. */
    nodesChange: (_changes: readonly NodeChange[]) => true,
    /** React Flow `onEdgesChange` deltas for each semantic change. */
    edgesChange: (_changes: readonly EdgeChange[]) => true,
    'update:document': (_document: FlowDocument) => true,
    'update:nodes': (_nodes: readonly FlowNode[]) => true,
    'update:edges': (_edges: readonly FlowEdge[]) => true,
    'update:viewport': (_viewport: Viewport) => true,
    // These describe proposals and transition frames; they are not accepted-state notifications.
    viewportStart: (_viewport: Viewport) => true,
    viewportChange: (_viewport: Viewport) => true,
    viewportEnd: (
      _viewport: Viewport,
      _status: ViewportOperationResult['status']
    ) => true,
    moveStart: (_viewport: Viewport) => true,
    move: (_viewport: Viewport) => true,
    moveEnd: (
      _viewport: Viewport,
      _status: ViewportOperationResult['status']
    ) => true,
    nodeDragStart: (_node: FlowNode, _event?: PointerEvent) => true,
    nodeDrag: (
      _payload: {
        readonly node: FlowNode
        readonly position: { readonly x: number; readonly y: number }
      },
      _event?: PointerEvent
    ) => true,
    nodeDragEnd: (_payload: NodeEndPayload) => true,
    nodeDragStop: (_payload: NodeEndPayload) => true,
    connectStart: (_payload: {
      readonly node: FlowNode
      readonly handleId: FlowHandle['id']
      readonly activation: 'pointer' | 'keyboard' | 'click'
    }) => true,
    connectProgress: (_payload: { readonly preview: ConnectionPreviewState }) =>
      true,
    connect: (_connection: FlowConnection) => true,
    connectEnd: (
      _payload: ConnectionEndPayload,
      _details?: FlowConnectionEndDetails
    ) => true,
    reconnectStart: (_payload: {
      readonly edge: FlowEdge
      readonly endpoint: 'source' | 'target'
      readonly activation: 'pointer' | 'keyboard'
    }) => true,
    reconnectProgress: (_payload: {
      readonly preview: ConnectionPreviewState
    }) => true,
    reconnect: (_payload: {
      readonly edge: FlowEdge
      readonly connection: FlowConnection
    }) => true,
    reconnectEnd: (
      _payload: ConnectionEndPayload,
      _details?: FlowConnectionEndDetails
    ) => true,
    selectionStart: (_payload: {
      readonly position: { readonly x: number; readonly y: number }
      readonly activation: 'pointer' | 'keyboard'
    }) => true,
    selectionProgress: (_payload: {
      readonly rect: {
        readonly x: number
        readonly y: number
        readonly width: number
        readonly height: number
      }
    }) => true,
    selectionEnd: (_payload: SelectionEndPayload) => true,
    selectionChange: (_payload: {
      readonly nodes: readonly FlowNode[]
      readonly edges: readonly FlowEdge[]
    }) => true,
    init: (_editor: FlowEditor) => true,
    error: (_error: FlowErrorReport) => true,
    paneClick: (_position: { readonly x: number; readonly y: number }) => true,
    paneMouseDown: (_position: { readonly x: number; readonly y: number }) =>
      true,
    paneMouseUp: (_position: { readonly x: number; readonly y: number }) =>
      true,
    paneMouseMove: (_position: { readonly x: number; readonly y: number }) =>
      true,
    paneMouseEnter: (_position: { readonly x: number; readonly y: number }) =>
      true,
    paneMouseLeave: (_position: { readonly x: number; readonly y: number }) =>
      true,
    paneContextMenu: (
      _position: { readonly x: number; readonly y: number },
      _event: MouseEvent
    ) => true,
    paneScroll: (_payload: {
      readonly position: { readonly x: number; readonly y: number }
      readonly deltaX: number
      readonly deltaY: number
    }) => true,
    nodeMouseDown: (_node: FlowNode, _event?: MouseEvent) => true,
    nodeMouseUp: (_node: FlowNode, _event?: MouseEvent) => true,
    nodeDoubleClick: (_node: FlowNode, _event?: MouseEvent) => true,
    nodeContextMenu: (_node: FlowNode, _event?: MouseEvent) => true,
    edgeMouseDown: (_edge: FlowEdge, _event?: MouseEvent) => true,
    edgeMouseUp: (_edge: FlowEdge, _event?: MouseEvent) => true,
    edgeMouseMove: (_edge: FlowEdge, _event?: MouseEvent) => true,
    edgeMouseEnter: (_edge: FlowEdge, _event?: MouseEvent) => true,
    edgeMouseLeave: (_edge: FlowEdge, _event?: MouseEvent) => true,
    edgeDoubleClick: (_edge: FlowEdge, _event?: MouseEvent) => true,
    edgeContextMenu: (_edge: FlowEdge, _event?: MouseEvent) => true,
    selectionContextMenu: (_payload: {
      readonly rect: {
        readonly x: number
        readonly y: number
        readonly width: number
        readonly height: number
      }
    }) => true,
    clickConnectStart: (_payload: {
      readonly node: FlowNode
      readonly handleId: FlowHandle['id']
    }) => true,
    clickConnectEnd: (
      _payload: Pick<ConnectionEndPayload, 'status' | 'reason'>
    ) => true,
    selectionDragStart: (_payload: {
      readonly position: { readonly x: number; readonly y: number }
    }) => true,
    selectionDrag: (_payload: {
      readonly rect: {
        readonly x: number
        readonly y: number
        readonly width: number
        readonly height: number
      }
    }) => true,
    selectionDragStop: (_payload: SelectionEndPayload) => true,
    /** React Flow `onSelectionDragStart`: a drag of several selected nodes began. */
    selectedNodesDragStart: (
      _payload: { readonly nodes: readonly FlowNode[] },
      _event?: PointerEvent
    ) => true,
    /** React Flow `onSelectionDrag`, with the dragged nodes at their drag positions. */
    selectedNodesDrag: (
      _payload: { readonly nodes: readonly FlowNode[] },
      _event?: PointerEvent
    ) => true,
    /** React Flow `onSelectionDragStop`, with the drag outcome. */
    selectedNodesDragStop: (
      _payload: NodeEndPayload & { readonly nodes: readonly FlowNode[] }
    ) => true,
  },
  // eslint-disable-next-line complexity -- the Vue boundary coordinates host lifecycles and core operations.
  setup(props, { emit, slots, expose }) {
    const hasNodePointerHandlers = () =>
      Boolean(
        props.onNodeClick ||
        props.onNodeMouseEnter ||
        props.onNodeMouseMove ||
        props.onNodeMouseLeave
      )

    const hasEdgeClickHandler = () => props.onEdgeClick !== undefined

    const canvasId = `flow-vue-${useId()}`

    const defaultEdgeOptions = computed(() =>
      props.defaultEdgeOptions === undefined
        ? undefined
        : Effect.runSync(decodeFlowDefaultEdgeOptions(props.defaultEdgeOptions))
    )

    const withEdgeDefaults = (edge: FlowEdge): FlowEdge =>
      applyDefaultEdgeOptions(edge, defaultEdgeOptions.value)

    const viewportLimits = S.decodeUnknownSync(ViewportLimitsSchema)({
      minZoom: props.minZoom ?? props.viewportLimits.minZoom,
      maxZoom: props.maxZoom ?? props.viewportLimits.maxZoom,
    })

    const nodeExtent: NodeExtent | undefined =
      props.nodeExtent === undefined
        ? undefined
        : S.decodeUnknownSync(FlowExtentInputSchema)(props.nodeExtent)

    const translateExtent = computed(() =>
      props.translateExtent === undefined
        ? undefined
        : S.decodeUnknownSync(FlowExtentInputSchema)(props.translateExtent)
    )

    const snapGrid = computed(() =>
      S.decodeUnknownSync(FlowSnapGridInputSchema)(props.snapGrid)
    )

    const ariaLabelConfig = computed(() =>
      resolveFlowAriaLabelConfig(props.ariaLabelConfig)
    )

    const colorModeClass = useFlowColorModeClass(() => props.colorMode)

    const initialDocument = props.document ?? props.defaultDocument
    const hasSplitModel = props.nodes !== undefined || props.edges !== undefined

    const documentControlMode = (): 'controlled' | 'uncontrolled' =>
      hasSplitModel || props.documentMode === 'controlled'
        ? 'controlled'
        : 'uncontrolled'

    if (
      hasSplitModel &&
      (props.nodes === undefined || props.edges === undefined)
    ) {
      throw new Error(
        'FlowCanvas requires both nodes and edges for split model binding'
      )
    }

    if (hasSplitModel && initialDocument !== undefined) {
      throw new Error(
        'FlowCanvas accepts either document or nodes/edges binding, not both'
      )
    }

    if (initialDocument === undefined && !hasSplitModel) {
      throw new Error(
        'FlowCanvas requires document/defaultDocument or nodes and edges'
      )
    }

    if (
      !hasSplitModel &&
      props.documentMode === 'controlled' &&
      props.document === undefined
    ) {
      throw new Error('Controlled FlowCanvas requires document')
    }

    const initialOwnedDocument =
      initialDocument ??
      (hasSplitModel
        ? Effect.runSync(
            decodeFlowDocument({
              nodes: props.nodes ?? [],
              edges: props.edges ?? [],
            })
          )
        : undefined)

    if (initialOwnedDocument === undefined) {
      throw new Error('FlowCanvas has no initial document state')
    }

    const ownedDocument = shallowRef(initialOwnedDocument)

    const ownedViewport = shallowRef(
      props.viewport ??
        Effect.runSync(
          decodeInitialViewport(props.defaultViewport, viewportLimits)
        )
    )

    const activeDocument = computed(() => {
      if (hasSplitModel) {
        return {
          ...ownedDocument.value,
          nodes: props.nodes ?? [],
          edges: props.edges ?? [],
        }
      }

      if (props.documentMode === 'controlled') {
        return props.document ?? ownedDocument.value
      }

      return ownedDocument.value
    })

    const activeViewport = computed(() =>
      props.viewportMode === 'controlled'
        ? (props.viewport ?? ownedViewport.value)
        : ownedViewport.value
    )

    const stateSnapshot = computed<DeepReadonly<FlowSnapshot>>(() => {
      const document = unwrapReactive(activeDocument.value)
      const viewport = unwrapReactive(activeViewport.value)

      return createFlowSnapshot(document, viewport)
    })

    const stateListeners = new Set<(change: FlowStateChange) => void>()
    const stateQueue: FlowStateChange[] = []
    const keyPressDisposers = new Set<() => void>()
    const canvas = shallowRef<HTMLElement>()
    const viewportPortalTarget = shallowRef<HTMLElement | null>(null)
    const edgeLabelRegistry = createEdgeLabelRegistry()
    const toolbarOverlayTarget = shallowRef<HTMLElement | null>(null)
    const selectionBoundsActive = shallowRef(false)

    const historyState = shallowRef(
      createFlowHistory(stateSnapshot.value.document, {
        capacity: props.historyCapacity,
        session: crypto.randomUUID(),
      })
    )

    recordFlowTelemetry('Mounted Vue history', FlowSpan.hostMount, {
      [FlowAttribute.inputKind]: 'history',
      [FlowAttribute.controlMode]: documentControlMode(),
      [FlowAttribute.nodeCount]: historyState.value.present.nodes.length,
      [FlowAttribute.edgeCount]: historyState.value.present.edges.length,
    })

    const history = computed(() => flowHistoryStatus(historyState.value))
    let acceptedContext: FlowTransactionContext | undefined

    let pendingDocumentReceipt:
      | {
          readonly document: FlowDocument
          readonly context: FlowTransactionContext
        }
      | undefined

    let keyboardHistoryGesture:
      | { readonly key: string; readonly id: string }
      | undefined

    const localContext = (gestureId?: string): FlowTransactionContext => {
      const context: FlowTransactionContext = {
        transactionId: crypto.randomUUID(),
        origin: { kind: 'local', actorId: historyState.value.session },
      }

      return gestureId === undefined ? context : { ...context, gestureId }
    }

    const historyEvent = (event: FlowHistoryEvent) => {
      const previous = historyState.value
      const result = reduceFlowHistory(previous, event)
      historyState.value = result.state

      if (result.state !== previous && event.kind !== 'gesture') {
        recordFlowTelemetry(
          'Vue history transition',
          event.kind === 'dispose'
            ? FlowSpan.hostDestroy
            : FlowSpan.controllerUpdate,
          {
            [FlowAttribute.changeKind]: `history-${event.kind}`,
            [FlowAttribute.nodeCount]: result.state.present.nodes.length,
            [FlowAttribute.edgeCount]: result.state.present.edges.length,
          }
        )
      }

      return result
    }

    const rejectHistory = (transactionId: string): void => {
      if (pendingDocumentReceipt?.context.transactionId === transactionId) {
        pendingDocumentReceipt = undefined
      }

      historyEvent({ kind: 'rejected', transactionId })
    }

    const finishKeyboardHistory = (): void => {
      if (keyboardHistoryGesture !== undefined) {
        historyEvent({
          kind: 'gesture',
          action: 'end',
          gestureId: keyboardHistoryGesture.id,
        })
        keyboardHistoryGesture = undefined
      }
    }

    let acceptedSnapshot = stateSnapshot.value
    let documentRevision = 0
    let deleteApprovalPending = false
    let editMutationDepth = 0
    let drainingEditMutations = false
    const pendingEditMutations: (() => Promise<void>)[] = []
    const pendingHistoryReplays = new Set<() => void>()
    const pendingEditSettlers = new Set<() => void>()
    let publishingState = false
    let stateDisposed = false
    let requestedStateCause: FlowStateChange['cause'] | undefined

    const { interactivity, setInteractivity } = createFlowInteractivityState(
      () => ({
        nodesDraggable: props.nodesDraggable,
        nodesConnectable: props.nodesConnectable,
        elementsSelectable: props.elementsSelectable,
      })
    )

    const reportError = (error: Error, boundary: FlowErrorBoundary): void => {
      if (stateDisposed) {
        return
      }

      recordFlowFailure('Vue flow failure reported', FlowSpan.editFailure, {
        [FlowAttribute.failureName]: error.name,
        [FlowAttribute.failureMessage]: error.message,
        [FlowAttribute.inputKind]: boundary,
      })
      emit('error', { name: error.name, message: error.message, boundary })
    }

    const drainStateQueue = (): void => {
      if (publishingState || stateDisposed) {
        return
      }

      publishingState = true

      try {
        while (stateQueue.length > 0) {
          if (stateDisposed) {
            return
          }

          const change = stateQueue.shift()

          if (change === undefined) {
            continue
          }

          const notificationListeners = [...stateListeners]

          for (const listener of notificationListeners) {
            if (stateDisposed) {
              break
            }

            if (!stateListeners.has(listener)) {
              continue
            }

            try {
              listener(change)
            } catch (error) {
              const failure =
                error instanceof Error ? error : new Error(String(error))

              Effect.runSync(
                Effect.logError('Accepted-state listener failed').pipe(
                  Effect.annotateLogs({
                    [FlowAttribute.failureName]: failure.name,
                    [FlowAttribute.failureMessage]: failure.message,
                  }),
                  Effect.withSpan(FlowSpan.editFailure, {
                    attributes: {
                      [FlowAttribute.failureName]: failure.name,
                    },
                  })
                )
              )
              reportError(failure, 'state-listener')
            }
          }
        }
      } finally {
        publishingState = false
      }
    }

    const withStateCause = <Value>(
      cause: FlowStateChange['cause'],
      action: () => Value
    ): Value => {
      const previousCause = requestedStateCause
      requestedStateCause = cause

      try {
        return action()
      } finally {
        requestedStateCause = previousCause
      }
    }

    const acceptHistoryDocument = (
      document: FlowDocument,
      context?: FlowTransactionContext,
      contextChanged = false
    ): void => {
      const ownerReceipt =
        context === undefined
          ? undefined
          : S.decodeUnknownSync(FlowTransactionContextSchema)(context)

      const proposalReceipt =
        pendingDocumentReceipt !== undefined &&
        flowHistoryDocumentsEqual(pendingDocumentReceipt.document, document)
          ? pendingDocumentReceipt.context
          : undefined

      const receipt = ownerReceipt ?? acceptedContext ?? proposalReceipt

      const explicitBaseline =
        contextChanged &&
        receipt !== undefined &&
        receipt.origin.kind !== 'local'

      if (
        stateDisposed ||
        (flowHistoryDocumentsEqual(historyState.value.present, document) &&
          !history.value.pending &&
          !explicitBaseline)
      ) {
        return
      }

      pendingDocumentReceipt = undefined

      historyEvent({
        kind: 'accepted',
        document,
        context: receipt ?? localContext(keyboardHistoryGesture?.id),
      })
    }

    watch(
      [stateSnapshot, () => props.documentContext],
      ([current, context], [, previousContext]) => {
        if (documentControlMode() === 'controlled') {
          acceptHistoryDocument(
            current.document,
            context,
            context !== previousContext
          )
        }
      },
      { flush: 'post' }
    )

    watch(
      stateSnapshot,
      (current) => {
        const previous = acceptedSnapshot

        if (documentControlMode() === 'uncontrolled') {
          acceptHistoryDocument(current.document)
        }

        if (snapshotEquivalence(previous, current)) {
          return
        }

        if (!documentEquivalence(previous.document, current.document)) {
          documentRevision += 1
        }

        acceptedSnapshot = current

        const viewportChanged = !viewportEquivalence(
          previous.viewport,
          current.viewport
        )

        stateQueue.push(
          Object.freeze({
            previous,
            current,
            cause:
              requestedStateCause ??
              (viewportChanged ? 'viewport-update' : 'document-update'),
          })
        )
        drainStateQueue()
      },
      { flush: 'sync' }
    )

    const subscribeState: FlowEditor['subscribeState'] = (listener) => {
      if (stateDisposed) {
        return () => stateListeners.delete(listener)
      }

      stateListeners.add(listener)

      return () => stateListeners.delete(listener)
    }

    const subscribeSelection: FlowEditor['subscribeSelection'] = (listener) => {
      if (stateDisposed) {
        return noopUnsubscribe
      }

      let previous = selectFlowSelection(stateSnapshot.value.document)

      const unsubscribe = subscribeState(({ current }) => {
        const next = selectFlowSelection(current.document)

        if (!flowSelectionEqual(previous, next)) {
          previous = next
          listener(next)
        }
      })

      listener(previous)

      return unsubscribe
    }

    const observeOwnedKeyPress: FlowEditor['observeKeyPress'] = (
      keyCode,
      options,
      listener
    ) => {
      if (stateDisposed) {
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

      const targetOptions: FlowKeyPressOptions = {
        ...options,
        target: options.target ?? canvas.value?.ownerDocument ?? document,
      }

      disposeObserver = observeKeyPress(keyCode, listener, targetOptions)

      return dispose
    }

    let measurementState: FlowMeasurementState = emptyFlowMeasurementState()
    const measurementRevision = shallowRef(0)

    const measuredNodes = computed(() => {
      void measurementRevision.value

      return getFlowMeasuredNodes(activeDocument.value, measurementState)
    })

    /** React Flow `onNodesChange` and `onEdgesChange` next to each FlowChange. */
    const emitElementChanges = (
      before: FlowDocument,
      change: FlowChange
    ): void => {
      const { nodes, edges } = flowChangeElementChanges(
        before,
        change,
        measuredNodes.value
      )

      if (nodes.length > 0 && !stateDisposed) {
        emit('nodesChange', nodes)
      }

      if (edges.length > 0 && !stateDisposed) {
        emit('edgesChange', edges)
      }
    }

    /**
     * The graph at drag start. Preview renders are measured while the drag
     * runs, so later graphs would already contain a previewed parent growth.
     */
    const helperGuides = shallowRef<readonly FlowAlignmentGuide[]>([])
    let dragStartGraph: FlowGraphView | undefined

    /**
     * A pointer drag in progress: its members, every node they carry along
     * (members and their descendants) and the flow-space delta so far.
     */
    const dragPreview = shallowRef<{
      readonly members: ReadonlySet<FlowNode['id']>
      readonly moved: ReadonlySet<FlowNode['id']>
      readonly delta: XYPosition
      /** Absolute travel of each moved node when members move differently. */
      readonly deltas?: ReadonlyMap<FlowNode['id'], XYPosition>
      /** A whole preview graph while `expandParent` grows a parent. */
      readonly graph?: ReturnType<typeof createFlowGraph>
    }>()

    const graph = computed(() => {
      const measurements = new Map(measuredNodes.value)
      const preview = dragPreview.value?.graph

      // DOM samples of expandParent previews must not reclamp the accepted
      // parent and invalidate its child's drag frame before the drop commits.
      if (preview !== undefined && dragStartGraph !== undefined) {
        for (const node of activeDocument.value.nodes) {
          const start = dragStartGraph.nodes.get(node.id)
          const next = preview.nodes.get(node.id)?.node
          const measured = measurements.get(node.id)

          if (
            measured !== undefined &&
            start !== undefined &&
            sameNodeSize(node.size, start.node.size) &&
            !sameNodeSize(next?.size, node.size)
          ) {
            measurements.set(node.id, { ...measured, ...start.dimensions })
          }
        }
      }

      return createFlowGraph(
        activeDocument.value,
        measurements,
        undefined,
        undefined,
        nodeExtent
      )
    })

    /** React z-index stacking for node wrappers and edge layers. */
    const stacking = computed(() =>
      computeFlowStacking({
        nodes: activeDocument.value.nodes,
        edges: activeDocument.value.edges.map(withEdgeDefaults),
        zIndexMode: props.zIndexMode,
        elevateNodesOnSelect: props.elevateNodesOnSelect,
        elevateEdgesOnSelect: props.elevateEdgesOnSelect,
      })
    )

    /** Nodes that render their own `FlowNodeResizer` or `FlowNodeResizeControl`. */
    const nodeResizers = shallowReactive(new Map<FlowNode['id'], number>())

    /**
     * The graph node rendering uses. Only nodes a drag carries are offset, so
     * a pointer move does no work for the rest of the graph.
     */
    const renderGraphNode = (id: FlowNode['id']): FlowGraphNode | undefined => {
      const graphNode = graph.value.nodes.get(id)
      const preview = dragPreview.value

      if (preview?.graph !== undefined) {
        return preview.graph.nodes.get(id) ?? graphNode
      }

      if (graphNode === undefined || preview?.moved.has(id) !== true) {
        return graphNode
      }

      const delta = preview.deltas?.get(id) ?? preview.delta

      return {
        ...graphNode,
        node: preview.members.has(id)
          ? {
              ...graphNode.node,
              position: {
                x: graphNode.node.position.x + delta.x,
                y: graphNode.node.position.y + delta.y,
              },
            }
          : graphNode.node,
        absolutePosition: {
          x: graphNode.absolutePosition.x + delta.x,
          y: graphNode.absolutePosition.y + delta.y,
        },
      }
    }

    const visibleHelperGuides = computed(() => {
      if (helperGuides.value.length === 0) {
        return []
      }

      const current = graph.value

      const nodes = new Map(
        current.orderedNodes.map((node) => [
          node.id,
          renderGraphNode(node.id) ?? node,
        ])
      )

      return resolveFlowAlignmentGuides(
        { ...current, nodes },
        helperGuides.value
      )
    })

    const connectionMode = computed(() =>
      S.decodeUnknownSync(ConnectionModeSchema)(props.connectionMode)
    )

    const connectionRadius = computed(() =>
      S.decodeUnknownSync(ConnectionRadiusSchema)(props.connectionRadius)
    )

    type ConnectionLifecycle =
      | {
          readonly kind: 'connect'
          readonly activation: 'pointer' | 'keyboard' | 'click'
          readonly node: FlowNode
          readonly handleId: FlowHandle['id']
        }
      | {
          readonly kind: 'reconnect'
          readonly activation: 'pointer' | 'keyboard'
          readonly edge: FlowEdge
          readonly endpoint: 'source' | 'target'
        }

    interface ConnectionPress {
      readonly pointerId: PendingConnectionData['pointerId']
      readonly captureTarget: PendingConnectionData['captureTarget']
      state: 'held' | 'released'
    }

    type ViewportTerminalHolder =
      | { readonly kind: 'instant-family'; readonly family: InstantFamily }
      | { readonly kind: 'pan'; readonly owner: PanOwner }
      | { readonly kind: 'connection'; readonly owner: ConnectionOwner }
      | { readonly kind: 'request'; readonly request: ViewportRequestOwner }

    interface InstantFamily {
      readonly observation: ViewportObservation
      readonly running: Set<InstantCall>
      completion:
        | { readonly kind: 'accepted' }
        | { readonly kind: 'proposed'; readonly viewport: Viewport }
    }

    interface InstantCall {
      state: 'live' | 'finished'
      family: InstantFamily | null
    }

    interface ViewportObservation {
      state:
        | {
            readonly kind: 'unstarted'
            readonly start: Viewport
            terminal: ViewportTerminalHolder | null
          }
        | {
            readonly kind: 'viewport-started' | 'both-started'
            readonly last: Viewport
            terminal: ViewportTerminalHolder | null
          }
        | { readonly kind: 'ended' }
    }

    interface ConnectionOwner {
      state:
        | {
            readonly kind: 'live'
            readonly residence:
              | { readonly kind: 'pointer'; readonly press: ConnectionPress }
              | { readonly kind: 'retained' | 'keyboard' }
            readonly lifecycle: ConnectionLifecycle
            autoPan: ViewportObservation | null
          }
        | { readonly kind: 'completing'; readonly claim: ConnectionClaim }
        | { readonly kind: 'ended' }
      validationFailure: 'unreported' | 'reported'
    }

    interface RetainedSource {
      readonly kind: 'retained'
      readonly owner: ConnectionOwner
      readonly data: ConnectionData
    }

    type PendingSource =
      | { readonly kind: 'fresh' }
      | { readonly kind: 'retained'; readonly source: RetainedSource }

    type PendingConnection =
      | (Extract<PendingConnectionData, { kind: 'connection-pending' }> & {
          readonly press: ConnectionPress
          readonly sourceAssociation: PendingSource
        })
      | (Extract<PendingConnectionData, { kind: 'reconnection-pending' }> & {
          readonly press: ConnectionPress
          readonly sourceAssociation: { readonly kind: 'fresh' }
        })

    type ActiveSource =
      | { readonly kind: 'own'; readonly owner: ConnectionOwner }
      | { readonly kind: 'retained'; readonly source: RetainedSource }

    type PhysicalConnection = ConnectionData & {
      readonly route: 'pointer'
      readonly press: ConnectionPress
      readonly source: ActiveSource
    }

    type KeyboardReconnection = ConnectionData & {
      readonly route: 'keyboard'
      readonly owner: ConnectionOwner
      readonly reconnect: NonNullable<ConnectionData['reconnect']>
    }

    type ConnectionSession = PhysicalConnection | KeyboardReconnection

    type CompletionTarget = NonNullable<ReturnType<typeof connectionTargetAt>>

    interface ConnectionClaim {
      readonly owner: ConnectionOwner
      readonly lifecycle: ConnectionLifecycle
      readonly source: ConnectionData
      readonly target: CompletionTarget | null
      readonly resources: {
        readonly press: ConnectionPress | null
        readonly autoPan: ViewportObservation | null
        readonly physicalView: PendingConnection | ConnectionSession | undefined
        readonly retainedView: RetainedSource | undefined
      }
    }

    type ConnectionResult =
      | {
          readonly kind: 'success'
          readonly status: 'accepted' | 'proposed'
          readonly reason: 'valid-connection' | 'valid-reconnection'
          readonly connection: FlowConnection
        }
      | { readonly kind: 'rejected' | 'cancelled'; readonly reason: string }

    type ConnectionCompletionInput =
      | {
          readonly kind: 'pointer'
          readonly active: PhysicalConnection
          readonly release: PointerEvent
        }
      | {
          readonly kind: 'pending'
          readonly pending: PendingConnection
          readonly release: PointerEvent
        }
      | {
          readonly kind: 'retained-keyboard'
          readonly source: RetainedSource
          readonly target: CompletionTarget
        }
      | {
          readonly kind: 'physical-reconnect-target'
          readonly active: PhysicalConnection & {
            readonly reconnect: NonNullable<ConnectionData['reconnect']>
          }
          readonly target: CompletionTarget
        }
      | {
          readonly kind: 'keyboard-reconnect'
          readonly active: KeyboardReconnection
          readonly target: CompletionTarget
        }

    type CompletionRoute =
      | { readonly kind: 'quiet'; readonly pending: PendingConnection }
      | {
          readonly kind: 'fresh-click'
          readonly pending: PendingConnection
          readonly candidate: ConnectionData
          readonly target: CompletionTarget | undefined
        }
      | {
          readonly kind: 'physical'
          readonly active: PhysicalConnection
          readonly physicalView: PhysicalConnection
          readonly target: CompletionTarget | undefined
        }
      | {
          readonly kind: 'retained-target'
          readonly pending: PendingConnection
          readonly candidate: ConnectionData
          readonly source: RetainedSource
          readonly target: CompletionTarget | undefined
        }
      | {
          readonly kind: 'retained-keyboard'
          readonly source: RetainedSource
          readonly target: CompletionTarget
        }
      | {
          readonly kind: 'keyboard-reconnect'
          readonly active: KeyboardReconnection
          readonly target: CompletionTarget
        }

    interface SelectionOwner {
      state:
        | { readonly kind: 'live' }
        | { readonly kind: 'completing'; readonly claim: SelectionClaim }
        | { readonly kind: 'ended' }
    }

    type OwnedSelection = SelectionSession & { readonly owner: SelectionOwner }

    interface SelectionClaim {
      readonly owner: SelectionOwner
      readonly active: OwnedSelection
    }

    interface PanOwner {
      state:
        | { readonly kind: 'live'; readonly observation: ViewportObservation }
        | { readonly kind: 'ended' }
    }

    type OwnedPan = PanSession & { readonly owner: PanOwner }

    type Session =
      | DragSession
      | ConnectionSession
      | PendingConnection
      | OwnedPan
      | OwnedSelection
      | ResizeSession
      | KeyboardResizeSession

    interface ViewportRequestOwner {
      readonly requestId: ViewportOperationResult['requestId']
      readonly result: {
        readonly promise: Promise<ViewportOperationResult>
        readonly resolve: (result: ViewportOperationResult) => void
        readonly reject: (cause: unknown) => void
        exposure: 'constructing' | 'returned' | 'abandoned'
      }
      state:
        | { readonly kind: 'incoming' }
        | {
            readonly kind: 'active'
            readonly write: ViewportWrite
            frame: RequestFrame
          }
        | { readonly kind: 'settling'; readonly taken: TakenRequestSettlement }
        | { readonly kind: 'settled'; readonly result: ViewportOperationResult }
        | { readonly kind: 'aborted'; readonly cause: unknown }
    }

    type RequestFrame =
      | { readonly kind: 'none' }
      | {
          readonly kind: 'registering'
          readonly registration: RequestRegistration
        }
      | {
          readonly kind: 'scheduled'
          readonly registration: RequestRegistration
          readonly handle: number
        }
      | {
          readonly kind: 'executing'
          readonly registration: RequestRegistration
        }

    interface RequestRegistration {
      state: 'acquiring' | 'scheduled' | 'executing' | 'revoked'
    }

    interface TakenRequestSettlement {
      readonly owner: ViewportRequestOwner
      readonly result: ViewportOperationResult
      readonly frame: RequestFrame
      readonly ports: readonly TerminalPort[]
      progress:
        | { readonly kind: 'cancel-frame' }
        | { readonly kind: 'resolve' }
        | { readonly kind: 'mounted-pair'; nextPort: number }
        | { readonly kind: 'done' }
      failure:
        | { readonly kind: 'none' }
        | { readonly kind: 'cause'; readonly cause: unknown }
    }

    type ConnectionMovement =
      | { readonly kind: 'physical'; readonly active: PhysicalConnection }
      | { readonly kind: 'retained'; readonly source: RetainedSource }

    type ConnectionPreviewOwner =
      | ConnectionMovement
      | { readonly kind: 'keyboard'; readonly active: KeyboardReconnection }

    // eslint-disable-next-line prefer-const -- The mutually recursive preview and completion entries bind before listeners are installed.
    let currentConnectionPreviewOwner: () => ConnectionPreviewOwner | undefined

    // eslint-disable-next-line prefer-const -- The mutually recursive preview and completion entries bind before listeners are installed.
    let connectionPreviewState: (
      initiating: ConnectionPreviewOwner
    ) => ConnectionPreviewState | null

    const connectionOrigin = (initiating: ConnectionPreviewOwner) => {
      const data =
        initiating.kind === 'retained'
          ? initiating.source.data
          : initiating.active

      return { nodeId: data.sourceNode.id, handleId: data.sourceHandle }
    }

    type ValidationOwner =
      | {
          readonly kind: 'preview'
          readonly initiating: ConnectionPreviewOwner
        }
      | { readonly kind: 'completion'; readonly claim: ConnectionClaim }

    type ViewportInitiator =
      | { readonly kind: 'pan'; readonly active: OwnedPan }
      | {
          readonly kind: 'connection'
          readonly continuation: ConnectionMovement
        }
      | { readonly kind: 'request'; readonly request: ViewportRequestOwner }
      | {
          readonly kind: 'instant'
          readonly operation: InstantCall
        }

    interface WriteReservation {
      readonly initiator: ViewportInitiator
      state: 'reserved' | 'bound' | 'revoked'
    }

    interface ViewportWrite {
      readonly reservation: WriteReservation
      readonly observation: ViewportObservation
    }

    interface ProducingWrite {
      readonly write: ViewportWrite
      readonly key: string
      readonly request: ViewportRequestOwner | undefined
    }

    type ViewportStep = 'current' | 'superseded-live' | 'revoked'

    const pendingConnectionClaims = new Set<ConnectionClaim>()
    let currentViewportWrite: WriteReservation | undefined
    let producingViewportWrite: ProducingWrite | undefined
    let viewportObservation: ViewportObservation | undefined

    const session = shallowRef<Session>()

    let nodeDragThreshold: number | undefined = decodeNodeDragThreshold(
      props.nodeDragThreshold
    )

    let connectionDragThreshold: number | undefined = S.decodeUnknownSync(
      ConnectionDragThresholdSchema
    )(props.connectionDragThreshold)

    const releaseConnectionPress = (press: ConnectionPress): void => {
      if (press.state !== 'held') {
        return
      }

      press.state = 'released'

      if (press.captureTarget.hasPointerCapture(press.pointerId)) {
        press.captureTarget.releasePointerCapture(press.pointerId)
      }
    }

    const acquireConnectionPress = (
      captureTarget: PendingConnectionData['captureTarget'],
      pointerId: PendingConnectionData['pointerId']
    ): ConnectionPress | undefined => {
      if (stateDisposed) {
        return undefined
      }

      try {
        captureTarget.setPointerCapture(pointerId)

        if (!captureTarget.hasPointerCapture(pointerId)) {
          return undefined
        }

        return { captureTarget, pointerId, state: 'held' }
      } catch (error) {
        recordFlowTelemetry(
          'Vue connection capture failed',
          FlowSpan.gestureCancel,
          {
            [FlowAttribute.pointerId]: pointerId,
            [FlowAttribute.cancellationReason]: String(error),
          }
        )

        return undefined
      }
    }

    const clickConnection = shallowRef<RetainedSource>()
    const canvasWidth = shallowRef(960)
    const canvasHeight = shallowRef(640)

    /** React `translateExtent`: every viewport write stays inside it. */
    const constrainTranslate = (viewport: Viewport): Viewport => {
      const extent = translateExtent.value

      return extent === undefined ||
        canvasWidth.value <= 0 ||
        canvasHeight.value <= 0
        ? viewport
        : constrainViewportToExtent(
            viewport,
            extent,
            canvasWidth.value,
            canvasHeight.value
          )
    }

    const nodeElements = new Map<string, HTMLElement>()

    const measuredHandles = computed<
      ReadonlyMap<string, ReadonlyMap<string, MeasuredHandle>>
    >(() => {
      void measurementRevision.value

      return new Map(
        [...getFlowMeasuredNodes(activeDocument.value, measurementState)].map(
          ([nodeId, measured]) => [
            nodeId,
            new Map(
              (measured.handles ?? []).map((handle) => [
                handle.handleId,
                handle,
              ])
            ),
          ]
        )
      )
    })

    const nodeGenerations = new Map<string, number>()
    const pendingGenerations = new Map<string, NodeMeasurementGeneration>()
    let nextNodeGeneration = 0
    let generationFlushScheduled = false

    let activeNodesById = new Map<string, FlowNode>(
      activeDocument.value.nodes.map((node) => [node.id, node])
    )

    let refreshScheduled = false

    const pendingInternals = new Map<
      string,
      ((
        result: Awaited<ReturnType<FlowEditor['updateNodeInternals']>>[number]
      ) => void)[]
    >()

    const flushNodeGenerations = (): void => {
      if (generationFlushScheduled) {
        return
      }

      generationFlushScheduled = true
      queueMicrotask(() => {
        generationFlushScheduled = false

        if (stateDisposed || pendingGenerations.size === 0) {
          pendingGenerations.clear()

          return
        }

        measurementState = setNodeMeasurementGenerations(measurementState, [
          ...pendingGenerations.values(),
        ])
        pendingGenerations.clear()
      })
    }

    /**
     * The node's laid-out box in flow units. A node rendered before its canvas
     * joins the document has no layout yet, so that reading is skipped and the
     * ResizeObserver's first delivery measures it; a connected node's box,
     * including an empty or hidden one, is real. Client rects are divided by
     * the zoom of the rendered viewport transform, which can lag the reactive
     * viewport right after a viewport change.
     */
    const readNodeMeasurement = (
      node: FlowNode,
      element: HTMLElement,
      generation: number
    ): NodeMeasurementInput | undefined => {
      if (!element.isConnected) {
        return undefined
      }

      const bounds = element.getBoundingClientRect()
      const zoom = renderedViewportZoom(element, activeViewport.value.zoom)

      return {
        nodeId: node.id,
        generation,
        width: bounds.width / zoom,
        height: bounds.height / zoom,
        handles: collectNodeHandles(node, element, bounds, zoom),
      }
    }

    /** Last measured size reported through `nodesChange`, by node id. */
    const reportedDimensions = new Map<
      NodeId,
      { readonly width: number; readonly height: number }
    >()

    let dimensionsFlushScheduled = false

    /** React Flow `dimensions` NodeChanges for measured sizes that changed. */
    const flushDimensionChanges = (): void => {
      dimensionsFlushScheduled = false

      if (stateDisposed) {
        return
      }

      const measured = getFlowMeasuredNodes(
        activeDocument.value,
        measurementState
      )

      for (const nodeId of reportedDimensions.keys()) {
        if (!measured.has(nodeId)) {
          reportedDimensions.delete(nodeId)
        }
      }

      const changes: NodeChange[] = []

      for (const [nodeId, { width, height }] of measured) {
        const previous = reportedDimensions.get(nodeId)

        if (previous?.width === width && previous.height === height) {
          continue
        }

        reportedDimensions.set(nodeId, { width, height })
        changes.push({
          id: nodeId,
          type: 'dimensions',
          dimensions: { width, height },
        })
      }

      if (changes.length > 0) {
        emit('nodesChange', changes)
      }
    }

    const commitMeasurements = (
      measurements: readonly NodeMeasurementInput[],
      document: FlowDocument = activeDocument.value
    ): void => {
      const previousRevision = measurementState.revision
      measurementState = applyNodeMeasurements(
        document,
        measurementState,
        measurements
      )

      if (measurementState.revision === previousRevision) {
        return
      }

      measurementRevision.value += 1

      if (documentControlMode() === 'uncontrolled') {
        const fitted = refitFlowGroups(
          activeDocument.value,
          getFlowMeasuredNodes(activeDocument.value, measurementState)
        )

        if (fitted !== activeDocument.value) {
          historyEvent({ kind: 'accepted', document: fitted, derived: true })
          ownedDocument.value = fitted
        }
      }

      if (!dimensionsFlushScheduled) {
        dimensionsFlushScheduled = true
        queueMicrotask(flushDimensionChanges)
      }
    }

    const isResizePreviewNode = (nodeId: string): boolean => {
      const active = session.value

      return (
        (active?.kind === 'resize' || active?.kind === 'keyboard-resize') &&
        active.node.id === nodeId
      )
    }

    const measureNodeHandles = (node: FlowNode, element: HTMLElement): void => {
      const generation = nodeGenerations.get(node.id)

      if (
        generation === undefined ||
        stateDisposed ||
        isResizePreviewNode(node.id) ||
        nodeElements.get(node.id) !== element
      ) {
        return
      }

      measurementState = setNodeMeasurementGenerations(measurementState, [
        { nodeId: node.id, generation },
      ])

      const measurement = readNodeMeasurement(node, element, generation)

      if (measurement !== undefined) {
        commitMeasurements([measurement])
      }
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (stateDisposed) {
        return
      }

      const document = activeDocument.value
      const measurements: NodeMeasurementInput[] = []

      for (const entry of entries) {
        if (entry.target === canvas.value) {
          canvasWidth.value = entry.contentRect.width
          canvasHeight.value = entry.contentRect.height
          continue
        }

        if (!(entry.target instanceof HTMLElement)) {
          continue
        }

        const { nodeId } = entry.target.dataset

        const node =
          nodeId === undefined ? undefined : activeNodesById.get(nodeId)

        if (node !== undefined && !isResizePreviewNode(node.id)) {
          const currentElement = nodeElements.get(node.id)

          if (currentElement !== entry.target) {
            continue
          }

          const generation = nodeGenerations.get(node.id)

          if (generation === undefined) {
            continue
          }

          const measurement = readNodeMeasurement(
            node,
            currentElement,
            generation
          )

          if (measurement !== undefined) {
            measurements.push(measurement)
          }
        }
      }

      if (measurements.length > 0) {
        commitMeasurements(measurements, document)
      }
    })

    watch(
      () => activeDocument.value.nodes,
      (nodes) => {
        activeNodesById = new Map<string, FlowNode>(
          nodes.map((node) => [node.id, node])
        )
        measurementState = pruneFlowMeasurements(
          activeDocument.value,
          measurementState
        )
        measurementRevision.value += 1

        for (const [nodeId, element] of nodeElements) {
          const node = nodes.find((candidate) => candidate.id === nodeId)

          if (node !== undefined) {
            measureNodeHandles(node, element)
          }
        }
      },
      { flush: 'sync' }
    )

    watch(
      () =>
        activeDocument.value.nodes.map(
          ({ id, handles }) => [id, handles] as const
        ),
      async (nodes) => {
        await nextTick()

        if (stateDisposed) {
          return
        }

        for (const [nodeId] of nodes) {
          const node = activeNodesById.get(nodeId)
          const element = nodeElements.get(nodeId)

          if (node !== undefined && element !== undefined) {
            measureNodeHandles(node, element)
          }
        }
      },
      { flush: 'post' }
    )

    const nodeRefCallbacks = new Map<
      string,
      (element: Element | ComponentPublicInstance | null) => void
    >()

    const nodeRef = (
      node: FlowNode
    ): ((element: Element | ComponentPublicInstance | null) => void) => {
      const existing = nodeRefCallbacks.get(node.id)

      if (existing !== undefined) {
        return existing
      }

      const callback = (element: Element | ComponentPublicInstance | null) => {
        if (stateDisposed) {
          return
        }

        if (element instanceof HTMLElement) {
          if (nodeElements.get(node.id) === element) {
            return
          }

          const generation = nextNodeGeneration
          nextNodeGeneration += 1
          nodeGenerations.set(node.id, generation)
          pendingGenerations.set(node.id, { nodeId: node.id, generation })
          flushNodeGenerations()
          nodeElements.set(node.id, element)
          resizeObserver.observe(element)

          const currentNode = activeNodesById.get(node.id)

          if (currentNode !== undefined) {
            measureNodeHandles(currentNode, element)
          }

          return
        }

        const previous = nodeElements.get(node.id)

        if (previous !== undefined) {
          resizeObserver.unobserve(previous)
          nodeElements.delete(node.id)
        }

        const generation = nextNodeGeneration
        nextNodeGeneration += 1
        nodeGenerations.delete(node.id)
        measurementState = setNodeMeasurementGenerations(measurementState, [
          { nodeId: node.id, generation },
        ])
        measurementRevision.value += 1
      }

      nodeRefCallbacks.set(node.id, callback)

      return callback
    }

    watch(
      () => props.document,
      (next) => {
        if (next !== undefined) {
          ownedDocument.value = next
        }
      }
    )
    watch(
      () => props.viewport,
      (next) => {
        if (next !== undefined) {
          ownedViewport.value = next
        }
      }
    )

    /**
     * An open multi-change commit: each change applies to the previous
     * one's result, and the owner sees one proposal or one accepted state.
     */
    let publishBatch:
      | { document: FlowDocument; nodes: boolean; edges: boolean }
      | undefined

    /** Hand one change's result to the document owner. */
    const commitPublished = (
      next: FlowDocument | undefined,
      change: FlowChange
    ): void => {
      if (next === undefined) {
        return
      }

      const fitted = refitFlowGroups(
        next,
        getFlowMeasuredNodes(next, measurementState)
      )

      if (hasSplitModel) {
        if (
          change.kind === 'node-position' ||
          change.kind === 'node-positions' ||
          change.kind === 'node-bounds'
        ) {
          emit('update:nodes', fitted.nodes)
        }

        if (change.kind === 'edge-add') {
          emit('update:edges', fitted.edges)
        }

        return
      }

      if (props.documentMode === 'controlled') {
        emit('update:document', fitted)

        return
      }

      withStateCause('semantic-change', () => {
        ownedDocument.value = fitted
      })
    }

    // eslint-disable-next-line complexity
    const publish = (change: FlowChange): void => {
      if (stateDisposed) {
        return
      }

      recordFlowTelemetry(
        'Completed Vue interaction proposal',
        interactionCompletionSpan(change),
        {
          [FlowAttribute.changeKind]: change.kind,
          [FlowAttribute.controlMode]: documentControlMode(),
        }
      )

      // Inside a batch, a change sees the earlier changes' result, not the
      // owner's document, which a controlled owner has not updated yet.
      const base = publishBatch?.document ?? activeDocument.value

      if (change.kind === 'selection-set') {
        const selected = applySelectionSetChange(base, change)

        if (selected !== undefined) {
          emit('selectionChange', {
            nodes: selected.nodes.filter(
              ({ selected: isSelected }) => isSelected === true
            ),
            edges: selected.edges.filter(
              ({ selected: isSelected }) => isSelected === true
            ),
          })
        }
      }

      if (stateDisposed) {
        return
      }

      emit('change', change)
      emitElementChanges(base, change)

      if (stateDisposed) {
        return
      }

      const next = applyPublishedChange(base, change)
      const batch = publishBatch

      if (batch === undefined) {
        commitPublished(next, change)

        return
      }

      if (next !== undefined) {
        batch.document = next
        batch.nodes ||= change.kind !== 'edge-add'
        batch.edges ||=
          change.kind === 'edge-add' || change.kind === 'edge-reconnect'
      }
    }

    /**
     * Publish several changes as one commit: every `change` event fires,
     * but the owner receives one composed proposal (controlled and split
     * models) or one accepted state (uncontrolled).
     */
    const publishAll = (changes: readonly FlowChange[]): void => {
      if (changes.length <= 1 || publishBatch !== undefined) {
        for (const change of changes) {
          publish(change)
        }

        return
      }

      const batch = {
        document: activeDocument.value,
        nodes: false,
        edges: false,
      }

      publishBatch = batch

      try {
        for (const change of changes) {
          publish(change)
        }
      } finally {
        publishBatch = undefined
      }

      if (stateDisposed || (!batch.nodes && !batch.edges)) {
        return
      }

      if (hasSplitModel) {
        if (batch.nodes) {
          emit('update:nodes', batch.document.nodes)
        }

        if (batch.edges) {
          emit('update:edges', batch.document.edges)
        }
      } else if (props.documentMode === 'controlled') {
        emit('update:document', batch.document)
      } else {
        withStateCause('semantic-change', () => {
          ownedDocument.value = batch.document
        })
      }
    }

    const updateDocument = (
      next: FlowDocument,
      context?: FlowTransactionContext
    ): void => {
      if (stateDisposed) {
        return
      }

      const validContext =
        context === undefined
          ? undefined
          : S.decodeUnknownSync(FlowTransactionContextSchema)(context)

      pendingDocumentReceipt =
        validContext === undefined
          ? undefined
          : {
              document: flowHistoryDocument(next),
              context: validContext,
            }

      if (hasSplitModel) {
        emit('update:nodes', next.nodes)
        emit('update:edges', next.edges)
      } else if (props.documentMode === 'controlled') {
        emit('update:document', next)
      } else {
        withStateCause('document-update', () => {
          ownedDocument.value = next
        })
      }
    }

    let nextViewportRequestId = 0

    let activeViewportRequest: ViewportRequestOwner | undefined

    const pendingViewportAcknowledgements: string[] = []

    const rememberViewportProposal = (viewport: Viewport): void => {
      pendingViewportAcknowledgements.push(viewportKey(viewport))

      if (pendingViewportAcknowledgements.length > 64) {
        pendingViewportAcknowledgements.shift()
      }
    }

    const consumeViewportAcknowledgement = (viewport: Viewport): boolean => {
      const index = pendingViewportAcknowledgements.indexOf(
        viewportKey(viewport)
      )

      if (index === -1) {
        pendingViewportAcknowledgements.length = 0

        return false
      }

      pendingViewportAcknowledgements.splice(0, index + 1)

      return true
    }

    const pressedKeys = shallowReactive(new Set<string>())
    const keyboardPressedCodes = new Map<string, string>()

    /** Whether a key name is held, reading modifiers from the event. */
    const keyHeld = (
      key: string,
      event: Pick<MouseEvent, 'shiftKey' | 'metaKey' | 'ctrlKey' | 'altKey'>
    ): boolean => {
      switch (key) {
        case 'Shift': {
          return event.shiftKey
        }

        case 'Meta': {
          return event.metaKey
        }

        case 'Control': {
          return event.ctrlKey
        }

        case 'Alt': {
          return event.altKey
        }

        default: {
          return pressedKeys.has(key)
        }
      }
    }

    /** React `selectionKeyCode`. */
    const selectionKeyHeld = (event: MouseEvent): boolean =>
      props.selectionKeyCode !== null &&
      (pressedKeys.has(props.selectionKeyCode) ||
        keyHeld(props.selectionKeyCode, event))

    const paneIsSelecting = computed(
      () =>
        (props.selectionKeyCode !== null &&
          pressedKeys.has(props.selectionKeyCode)) ||
        session.value?.kind === 'selection' ||
        (props.selectionOnDrag &&
          props.panOnDrag !== true &&
          !(
            props.panActivationKeyCode !== undefined &&
            pressedKeys.has(props.panActivationKeyCode)
          ))
    )

    /** React `multiSelectionKeyCode`; Meta or Control unless set. */
    const multiSelectionKeyHeld = (event: MouseEvent): boolean => {
      const key = props.multiSelectionKeyCode

      if (key === undefined) {
        return isMultiSelectionEvent(event)
      }

      return key !== null && keyHeld(key, event)
    }

    /** React `deleteKeyCode` matching: one key or `+` combination per alternative. */
    const deleteKeyMatches = (): boolean => {
      const code = props.deleteKeyCode

      if (code === null) {
        return false
      }

      const alternatives: readonly string[] = Array.isArray(code)
        ? code
        : [code]

      const keysToWatch = new Set(
        alternatives.flatMap((value) => value.split('+'))
      )

      const pressed = new Set(
        [...keyboardPressedCodes].map(([key, eventCode]) =>
          keysToWatch.has(eventCode) ? eventCode : key
        )
      )

      return alternatives.some((alternative: string) => {
        const keys = alternative.split('+')

        return (
          keys.length === pressed.size && keys.every((key) => pressed.has(key))
        )
      })
    }

    /** The dragged nodes at the given positions, or at drag start. */
    const draggedNodes = (
      active: DragSession,
      positions?: ReadonlyMap<FlowNode['id'], XYPosition>
    ): FlowNode[] =>
      (active.members ?? []).flatMap(({ nodeId, origin }) => {
        const current = activeDocument.value.nodes.find(
          ({ id }) => id === nodeId
        )

        return current === undefined
          ? []
          : [{ ...current, position: positions?.get(nodeId) ?? origin }]
      })

    const endNodeDrag = (
      active: DragSession,
      status: 'accepted' | 'proposed' | 'cancelled',
      reason?: string,
      positions?: ReadonlyMap<FlowNode['id'], XYPosition>
    ): void => {
      const { node } = active

      if (active.kind !== 'node') {
        return
      }

      if (reason === undefined) {
        emit('nodeDragEnd', { node, status })
        emit('nodeDragStop', { node, status })
      } else {
        emit('nodeDragEnd', { node, status, reason })
        emit('nodeDragStop', { node, status, reason })
      }

      if ((active.members?.length ?? 0) < 2) {
        return
      }

      const nodes = draggedNodes(active, positions)

      emit(
        'selectedNodesDragStop',
        reason === undefined
          ? { node, status, nodes }
          : { node, status, reason, nodes }
      )
    }

    const selectNodeForDrag = (node: FlowNode): void => {
      if (
        !props.selectNodesOnDrag ||
        !isNodeSelectable(interactivity.value, node)
      ) {
        return
      }

      const selectedNodeIds = activeDocument.value.nodes
        .filter((candidate) => isNodeSelectable(interactivity.value, candidate))
        .filter((candidate) => candidate.id === node.id || candidate.selected)
        .map(({ id }) => id)

      const edgeIds = activeDocument.value.edges
        .filter((edge) => edge.selected === true)
        .map(({ id }) => id)

      publish({ kind: 'selection-set', nodeIds: selectedNodeIds, edgeIds })
    }

    /** Primary press origin and travel before capture retargets its click. */
    let panePress:
      | {
          readonly x: number
          readonly y: number
          readonly distance: number
          readonly onPane: boolean
        }
      | undefined

    const rememberPanePress = (event: PointerEvent): void => {
      if (stateDisposed) {
        return
      }

      panePress =
        event.button === 0
          ? {
              x: event.clientX,
              y: event.clientY,
              distance: 0,
              onPane: event.target === canvas.value,
            }
          : undefined
    }

    /** React `ariaLiveMessage`: the last keyboard node move announcement. */
    const ariaLiveMessage = shallowRef('')

    /** Client position of the last primary press on a node. */
    let nodePress:
      | {
          readonly x: number
          readonly y: number
          /**
           * The document at press. A threshold-0 drag can select on press
           * (`selectNodesOnDrag`), so the click reads the selection from before.
           */
          readonly document: FlowDocument
          readonly distance: number
          /**
           * Whether the press began on a control inside the node. A pending
           * connection captures the pointer on the node, so the click that
           * follows a handle press targets the node, not the handle.
           */
          readonly onControl: boolean
        }
      | undefined

    // Measure travel entirely with pointer events. Compatibility mouse events
    // round fractional client coordinates, which would reject stationary clicks.
    const trackClickTravel = (event: PointerEvent): void => {
      if (panePress !== undefined) {
        panePress = {
          ...panePress,
          distance: Math.max(
            panePress.distance,
            Math.hypot(event.clientX - panePress.x, event.clientY - panePress.y)
          ),
        }
      }

      if (nodePress !== undefined) {
        nodePress = {
          ...nodePress,
          distance: Math.max(
            nodePress.distance,
            Math.hypot(event.clientX - nodePress.x, event.clientY - nodePress.y)
          ),
        }
      }
    }

    /**
     * A click that did not move past nodeClickDistance selects the node.
     * Controls inside the node, including handles and resize controls, keep
     * their own click behaviour.
     */
    const selectNodeOnClick = (node: FlowNode, event: MouseEvent): void => {
      selectionBoundsActive.value = false
      const press = nodePress
      nodePress = undefined

      if (
        stateDisposed ||
        press === undefined ||
        press.onControl ||
        event.button !== 0 ||
        (isNodeDraggable(interactivity.value, node) &&
          press.distance > props.nodeClickDistance) ||
        isNodeControl(event.target, event.currentTarget)
      ) {
        return
      }

      const pressed = press.document.nodes.find(({ id }) => id === node.id)

      const next =
        pressed === undefined
          ? undefined
          : selectionAfterNodeClick(
              press.document,
              interactivity.value,
              pressed,
              multiSelectionKeyHeld(event)
            )

      const current = activeDocument.value
      const nodeIds = new Set(current.nodes.map(({ id }) => id))
      const edgeIds = new Set(current.edges.map(({ id }) => id))

      if (next === undefined || !nodeIds.has(node.id)) {
        return
      }

      const selection = {
        nodeIds: next.nodeIds.filter((id) => nodeIds.has(id)),
        edgeIds: next.edgeIds.filter((id) => edgeIds.has(id)),
      }

      const unchanged =
        current.nodes.every(
          ({ id, selected }) =>
            (selected === true) === selection.nodeIds.includes(id)
        ) &&
        current.edges.every(
          ({ id, selected }) =>
            (selected === true) === selection.edgeIds.includes(id)
        )

      if (!unchanged) {
        publish({ kind: 'selection-set', ...selection })
      }
    }

    const selectEdgeOnClick = (edge: FlowEdge, event: MouseEvent): void => {
      const current = activeDocument.value.edges.find(
        ({ id }) => id === edge.id
      )

      const next =
        stateDisposed || current === undefined
          ? undefined
          : selectionAfterEdgeClick(
              activeDocument.value,
              interactivity.value,
              current,
              multiSelectionKeyHeld(event)
            )

      if (next !== undefined) {
        publish({ kind: 'selection-set', ...next })
      }
    }

    /**
     * Select the edge when the press is released on the same edge without
     * moving, as a click would. The pane captures the pointer on press, so the
     * browser's own click lands on the canvas, not on the edge.
     */
    const awaitEdgeClick = (edge: FlowEdge, press: PointerEvent): void => {
      const view = canvas.value?.ownerDocument.defaultView

      if (view === null || view === undefined) {
        return
      }

      const release = (event: PointerEvent): void => {
        if (event.pointerId !== press.pointerId) {
          return
        }

        view.removeEventListener('pointerup', release, true)

        const { target } = event

        const hit =
          (target instanceof Element
            ? target.closest<SVGElement | HTMLElement>(
                '[data-flow-edge-hit], [data-flow-edge-label], .flow-vue-edge-textwrapper'
              )
            : null) ??
          view.document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<SVGElement | HTMLElement>(
              '[data-flow-edge-hit], [data-flow-edge-label], .flow-vue-edge-textwrapper'
            )

        if (
          !stateDisposed &&
          (hit?.dataset.flowEdgeHit ??
            hit?.dataset.flowEdgeLabel ??
            hit?.closest<SVGElement>('.flow-vue-edge')?.dataset.edgeId) ===
            edge.id &&
          Math.hypot(
            event.clientX - press.clientX,
            event.clientY - press.clientY
          ) <= 1
        ) {
          selectEdgeOnClick(edge, event)
        }
      }

      view.addEventListener('pointerup', release, true)
    }

    const activationKeyIsPressed = (key: string | undefined): boolean =>
      key === undefined || pressedKeys.has(key)

    const connectionOwner = (active: ConnectionSession): ConnectionOwner => {
      if (active.route === 'keyboard') {
        return active.owner
      }

      return active.source.kind === 'own'
        ? active.source.owner
        : active.source.source.owner
    }

    /** The last preview of each gesture, for React Flow's final connection state. */
    const lastConnectionPreviews = new WeakMap<
      ConnectionOwner,
      ConnectionPreviewState
    >()

    const rememberConnectionPreview = (
      initiating: ConnectionPreviewOwner,
      preview: ConnectionPreviewState
    ): void => {
      lastConnectionPreviews.set(
        initiating.kind === 'retained'
          ? initiating.source.owner
          : connectionOwner(initiating.active),
        preview
      )
    }

    const previewOwnerLive = (initiating: ConnectionPreviewOwner): boolean => {
      if (stateDisposed) {
        return false
      }

      if (initiating.kind === 'retained') {
        return (
          clickConnection.value === initiating.source &&
          initiating.source.owner.state.kind === 'live'
        )
      }

      return (
        session.value === initiating.active &&
        connectionOwner(initiating.active).state.kind === 'live'
      )
    }

    const claimLive = (claim: ConnectionClaim): boolean =>
      !stateDisposed &&
      claim.owner.state.kind === 'completing' &&
      claim.owner.state.claim === claim

    const validationLive = (owner: ValidationOwner): boolean =>
      owner.kind === 'completion'
        ? claimLive(owner.claim)
        : previewOwnerLive(owner.initiating)

    const validateConnectionAtBoundary = (
      candidate: FlowConnection,
      authority: ValidationOwner
    ): boolean => {
      if (!validationLive(authority)) {
        return false
      }

      let owner: ConnectionOwner

      if (authority.kind === 'completion') {
        ;({ owner } = authority.claim)
      } else if (authority.initiating.kind === 'retained') {
        ;({ owner } = authority.initiating.source)
      } else {
        owner = connectionOwner(authority.initiating.active)
      }

      try {
        const valid = props.isValidConnection(candidate)

        return validationLive(authority) && valid
      } catch (error) {
        if (!validationLive(authority)) {
          return false
        }

        const failure =
          error instanceof Error ? error : new Error(String(error))

        if (owner.validationFailure === 'unreported') {
          owner.validationFailure = 'reported'
          recordFlowFailure(
            'Vue connection validator failed',
            FlowSpan.editFailure,
            {
              [FlowAttribute.failureName]: failure.name,
              [FlowAttribute.failureMessage]: failure.message,
            }
          )

          if (!validationLive(authority)) {
            return false
          }

          emit('error', {
            name: failure.name,
            message: failure.message,
            boundary: 'connection-validator',
          })
        }

        return false
      }
    }

    const clientToFlow = (clientX: number, clientY: number) => {
      const bounds = canvas.value?.getBoundingClientRect()

      if (bounds === undefined) {
        return { x: 0, y: 0 }
      }

      const viewport = activeViewport.value

      return {
        x: (clientX - bounds.left - viewport.x) / viewport.zoom,
        y: (clientY - bounds.top - viewport.y) / viewport.zoom,
      }
    }

    // eslint-disable-next-line unicorn/consistent-function-scoping -- The observation type and its owners are private to this mounted canvas.
    const newViewportObservation = (start: Viewport): ViewportObservation => ({
      state: { kind: 'unstarted', start, terminal: null },
    })

    const viewportInitiatorLive = (initiator: ViewportInitiator): boolean => {
      if (stateDisposed) {
        return false
      }

      switch (initiator.kind) {
        case 'pan': {
          return initiator.active.owner.state.kind === 'live'
        }

        case 'connection': {
          return previewOwnerLive(initiator.continuation)
        }

        case 'request': {
          return (
            (initiator.request.state.kind === 'incoming' ||
              initiator.request.state.kind === 'active') &&
            activeViewportRequest === initiator.request
          )
        }

        case 'instant': {
          return initiator.operation.state === 'live'
        }

        default: {
          const exhausted: never = initiator

          return exhausted
        }
      }
    }

    const viewportStep = (write: ViewportWrite): ViewportStep => {
      if (!viewportInitiatorLive(write.reservation.initiator)) {
        return 'revoked'
      }

      return currentViewportWrite === write.reservation
        ? 'current'
        : 'superseded-live'
    }

    const beginViewportObservation = (write: ViewportWrite): ViewportStep => {
      const { observation } = write

      if (viewportStep(write) !== 'current') {
        return viewportStep(write)
      }

      if (observation.state.kind === 'unstarted') {
        const viewport = observation.state.start
        observation.state = {
          kind: 'viewport-started',
          last: viewport,
          terminal: observation.state.terminal,
        }
        emit('viewportStart', viewport)
      }

      if (viewportStep(write) !== 'current') {
        return viewportStep(write)
      }

      if (observation.state.kind === 'viewport-started') {
        const viewport = observation.state.last
        observation.state = {
          kind: 'both-started',
          last: viewport,
          terminal: observation.state.terminal,
        }
        emit('moveStart', viewport)
      }

      return viewportStep(write)
    }

    const changeViewportObservation = (
      write: ViewportWrite,
      viewport: Viewport
    ): ViewportStep => {
      if (
        viewportStep(write) !== 'current' ||
        write.observation.state.kind === 'ended'
      ) {
        return viewportStep(write)
      }

      if (write.observation.state.kind !== 'unstarted') {
        write.observation.state = { ...write.observation.state, last: viewport }
      }

      emit('viewportChange', viewport)

      if (viewportStep(write) !== 'current') {
        return viewportStep(write)
      }

      emit('move', viewport)

      return viewportStep(write)
    }

    const cancelRequestFrame = (frame: RequestFrame): void => {
      if (frame.kind === 'none') {
        return
      }

      frame.registration.state = 'revoked'

      if (frame.kind === 'scheduled') {
        cancelAnimationFrame(frame.handle)
      }
    }

    const deliverTerminal = (port: TerminalPort): void => {
      switch (port.kind) {
        case 'viewportEnd': {
          emit('viewportEnd', port.viewport, port.status)
          break
        }

        case 'moveEnd': {
          emit('moveEnd', port.viewport, port.status)
          break
        }

        case 'connectEnd': {
          emit('connectEnd', port.payload, port.details)
          break
        }

        case 'reconnectEnd': {
          emit('reconnectEnd', port.payload, port.details)
          break
        }

        case 'clickConnectEnd': {
          emit('clickConnectEnd', {
            status: port.payload.status,
            reason: port.payload.reason,
          })
          break
        }

        case 'nodeDragEnd': {
          emit('nodeDragEnd', port.payload)
          break
        }

        case 'nodeDragStop': {
          emit('nodeDragStop', port.payload)
          break
        }

        case 'selectionEnd': {
          emit('selectionEnd', port.payload)
          break
        }

        case 'selectionDragStop': {
          emit('selectionDragStop', port.payload)
          break
        }

        default: {
          const exhausted: never = port

          return exhausted
        }
      }
    }

    const takeObservationPorts = (
      observation: ViewportObservation | null | undefined,
      viewport: Viewport,
      status: ViewportOperationResult['status']
    ): TerminalPort[] => {
      if (observation === null || observation === undefined) {
        return []
      }

      const phase = observation.state.kind
      observation.state = { kind: 'ended' }

      if (viewportObservation === observation) {
        viewportObservation = undefined
      }

      if (phase === 'both-started') {
        return [
          { kind: 'viewportEnd', viewport, status },
          { kind: 'moveEnd', viewport, status },
        ]
      }

      return phase === 'viewport-started'
        ? [{ kind: 'viewportEnd', viewport, status }]
        : []
    }

    const takeOwnedObservationPorts = (
      observation: ViewportObservation | null,
      holder: ViewportTerminalHolder,
      viewport: Viewport,
      status: ViewportOperationResult['status']
    ): TerminalPort[] => {
      if (observation === null || observation.state.kind === 'ended') {
        return []
      }

      const current = observation.state.terminal

      const owns =
        current !== null &&
        ((current.kind === 'instant-family' &&
          holder.kind === 'instant-family' &&
          current.family === holder.family) ||
          (current.kind === 'pan' &&
            holder.kind === 'pan' &&
            current.owner === holder.owner) ||
          (current.kind === 'connection' &&
            holder.kind === 'connection' &&
            current.owner === holder.owner) ||
          (current.kind === 'request' &&
            holder.kind === 'request' &&
            current.request === holder.request))

      return owns ? takeObservationPorts(observation, viewport, status) : []
    }

    const finishInstantCall = (
      operation: InstantCall,
      normal: boolean
    ): void => {
      operation.state = 'finished'
      const { family } = operation

      if (family === null) {
        return
      }

      family.running.delete(operation)
      const { observation } = family

      if (
        observation.state.kind === 'ended' ||
        observation.state.terminal?.kind !== 'instant-family' ||
        observation.state.terminal.family !== family
      ) {
        return
      }

      if (!normal) {
        observation.state.terminal = null

        return
      }

      if (family.running.size > 0 || stateDisposed) {
        return
      }

      const completion =
        props.viewportMode === 'controlled'
          ? family.completion
          : ({ kind: 'accepted' } satisfies InstantFamily['completion'])

      const ports = takeOwnedObservationPorts(
        observation,
        { kind: 'instant-family', family },
        completion.kind === 'proposed'
          ? completion.viewport
          : activeViewport.value,
        completion.kind
      )

      for (const port of ports) {
        deliverTerminal(port)
      }
    }

    const takeRequestSettlement = (
      request: ViewportRequestOwner | undefined,
      status: ViewportOperationResult['status'],
      viewport: Viewport
    ): TakenRequestSettlement | undefined => {
      if (
        request === undefined ||
        (request.state.kind !== 'incoming' && request.state.kind !== 'active')
      ) {
        return undefined
      }

      const active = request.state

      const taken: TakenRequestSettlement = {
        owner: request,
        result: { requestId: request.requestId, status, viewport },
        frame: active.kind === 'active' ? active.frame : { kind: 'none' },
        ports:
          active.kind === 'active'
            ? takeOwnedObservationPorts(
                active.write.observation,
                { kind: 'request', request },
                viewport,
                status
              )
            : [],
        progress: { kind: 'cancel-frame' },
        failure: { kind: 'none' },
      }

      request.state = { kind: 'settling', taken }

      if (activeViewportRequest === request) {
        activeViewportRequest = undefined
      }

      return taken
    }

    const resolveTakenRequest = (taken: TakenRequestSettlement): void => {
      if (taken.progress.kind !== 'resolve') {
        return
      }

      taken.progress = { kind: 'mounted-pair', nextPort: 0 }
      taken.owner.state = { kind: 'settled', result: taken.result }
      taken.owner.result.resolve(taken.result)
    }

    const deliverRequestSettlement = (
      taken: TakenRequestSettlement | undefined
    ): void => {
      if (taken === undefined) {
        return
      }

      if (taken.progress.kind === 'cancel-frame') {
        taken.progress = { kind: 'resolve' }

        try {
          cancelRequestFrame(taken.frame)
        } catch (error) {
          taken.failure = { kind: 'cause', cause: error }
        } finally {
          resolveTakenRequest(taken)
        }
      }

      resolveTakenRequest(taken)

      while (
        taken.progress.kind === 'mounted-pair' &&
        taken.progress.nextPort < taken.ports.length
      ) {
        const port = taken.ports[taken.progress.nextPort]
        taken.progress.nextPort += 1

        if (port !== undefined) {
          deliverTerminal(port)
        }
      }

      taken.progress = { kind: 'done' }

      if (taken.failure.kind === 'cause') {
        throw taken.failure.cause
      }
    }

    const settleViewportRequest = (
      request: ViewportRequestOwner | undefined,
      status: ViewportOperationResult['status'],
      viewport: Viewport
    ): void =>
      deliverRequestSettlement(takeRequestSettlement(request, status, viewport))

    const acquireViewportWrite = (
      initiator: ViewportInitiator
    ): WriteReservation | undefined => {
      if (!viewportInitiatorLive(initiator)) {
        return undefined
      }

      const reservation: WriteReservation = { initiator, state: 'reserved' }
      const previous = activeViewportRequest
      currentViewportWrite = reservation

      if (initiator.kind !== 'request' || previous !== initiator.request) {
        settleViewportRequest(previous, 'superseded', activeViewport.value)
      }

      return reservation
    }

    const bindTerminalHolder = (
      observation: ViewportObservation,
      initiator: ViewportInitiator
    ): void => {
      if (observation.state.kind !== 'ended') {
        const { terminal } = observation.state

        if (initiator.kind === 'request') {
          observation.state.terminal = {
            kind: 'request',
            request: initiator.request,
          }
        } else if (initiator.kind === 'instant') {
          if (terminal === null || terminal.kind === 'instant-family') {
            const family: InstantFamily = terminal?.family ?? {
              observation,
              running: new Set(),
              completion: { kind: 'accepted' },
            }

            family.running.add(initiator.operation)
            initiator.operation.family = family
            observation.state.terminal = { kind: 'instant-family', family }
          }
        } else if (terminal === null || terminal.kind === 'instant-family') {
          observation.state.terminal =
            initiator.kind === 'pan'
              ? { kind: 'pan', owner: initiator.active.owner }
              : {
                  kind: 'connection',
                  owner:
                    initiator.continuation.kind === 'retained'
                      ? initiator.continuation.source.owner
                      : connectionOwner(initiator.continuation.active),
                }
        }
      }
    }

    const bindViewportObservation = (
      reservation: WriteReservation
    ): ViewportWrite | undefined => {
      if (
        currentViewportWrite !== reservation ||
        !viewportInitiatorLive(reservation.initiator)
      ) {
        return undefined
      }

      const { initiator } = reservation
      let existing: ViewportObservation | null | undefined

      if (
        initiator.kind === 'pan' &&
        initiator.active.owner.state.kind === 'live'
      ) {
        existing = initiator.active.owner.state.observation
      } else if (initiator.kind === 'connection') {
        const owner =
          initiator.continuation.kind === 'retained'
            ? initiator.continuation.source.owner
            : connectionOwner(initiator.continuation.active)

        if (owner.state.kind !== 'live') {
          return undefined
        }

        existing = owner.state.autoPan
      } else {
        existing = viewportObservation
      }

      const observation =
        existing !== undefined &&
        existing !== null &&
        existing.state.kind !== 'ended'
          ? existing
          : newViewportObservation(activeViewport.value)

      const write: ViewportWrite = {
        reservation,
        observation,
      }

      bindTerminalHolder(observation, initiator)

      reservation.state = 'bound'
      viewportObservation = observation

      if (
        initiator.kind === 'pan' &&
        initiator.active.owner.state.kind === 'live'
      ) {
        initiator.active.owner.state = { kind: 'live', observation }
      } else if (initiator.kind === 'connection') {
        const owner =
          initiator.continuation.kind === 'retained'
            ? initiator.continuation.source.owner
            : connectionOwner(initiator.continuation.active)

        if (owner.state.kind === 'live') {
          owner.state.autoPan = observation
        }
      }

      return write
    }

    const updateViewportValue = (
      write: ViewportWrite,
      next: Viewport
    ): void => {
      if (viewportStep(write) !== 'current') {
        return
      }

      if (props.viewportMode === 'controlled') {
        const previous = producingViewportWrite
        const { initiator } = write.reservation
        producingViewportWrite = {
          write,
          key: viewportKey(next),
          request: initiator.kind === 'request' ? initiator.request : undefined,
        }

        if (
          initiator.kind === 'instant' &&
          initiator.operation.family !== null
        ) {
          initiator.operation.family.completion = {
            kind: 'proposed',
            viewport: next,
          }
        }

        try {
          rememberViewportProposal(next)
          emit('update:viewport', next)
        } finally {
          producingViewportWrite = previous
        }
      } else {
        withStateCause('viewport-update', () => {
          ownedViewport.value = next
        })
      }
    }

    const writeViewport = (
      proposed: Viewport,
      initiator: ViewportInitiator
    ): ViewportStep => {
      const next = constrainTranslate(proposed)
      const reservation = acquireViewportWrite(initiator)

      if (reservation === undefined) {
        return 'revoked'
      }

      const write = bindViewportObservation(reservation)

      if (write === undefined) {
        return viewportInitiatorLive(initiator) ? 'superseded-live' : 'revoked'
      }

      if (beginViewportObservation(write) !== 'current') {
        return viewportStep(write)
      }

      if (changeViewportObservation(write, next) !== 'current') {
        return viewportStep(write)
      }

      updateViewportValue(write, next)

      return viewportStep(write)
    }

    const updateViewport = (next: Viewport): void => {
      const operation: InstantCall = { state: 'live', family: null }
      let normal = false

      try {
        writeViewport(next, { kind: 'instant', operation })
        normal = true
      } finally {
        finishInstantCall(operation, normal)
      }
    }

    const panToFocusedNode = (node: FlowNode, event: FocusEvent): void => {
      const element = event.currentTarget

      if (
        props.disableKeyboardA11y ||
        !props.autoPanOnNodeFocus ||
        !(element instanceof HTMLElement) ||
        !element.matches(':focus-visible')
      ) {
        return
      }

      const internal = graph.value.nodes.get(node.id)

      if (internal === undefined) {
        return
      }

      const viewport = activeViewport.value
      const x = internal.absolutePosition.x * viewport.zoom + viewport.x
      const y = internal.absolutePosition.y * viewport.zoom + viewport.y

      if (
        x + internal.dimensions.width * viewport.zoom > 0 &&
        y + internal.dimensions.height * viewport.zoom > 0 &&
        x < canvasWidth.value &&
        y < canvasHeight.value
      ) {
        return
      }

      updateViewport({
        x:
          canvasWidth.value / 2 -
          (internal.absolutePosition.x + internal.dimensions.width / 2) *
            viewport.zoom,
        y:
          canvasHeight.value / 2 -
          (internal.absolutePosition.y + internal.dimensions.height / 2) *
            viewport.zoom,
        zoom: viewport.zoom,
      })
    }

    const autoPanConnection = (
      continuation: ConnectionMovement,
      clientX: number,
      clientY: number
    ): boolean => {
      if (!previewOwnerLive(continuation)) {
        return false
      }

      if (!props.autoPanOnConnect) {
        return true
      }

      const bounds = canvas.value?.getBoundingClientRect()

      if (bounds === undefined) {
        return true
      }

      const delta = selectionAutoPanDelta(
        { x: clientX - bounds.left, y: clientY - bounds.top },
        bounds.width,
        bounds.height,
        40,
        props.autoPanSpeed
      )

      if (delta.x === 0 && delta.y === 0) {
        return true
      }

      const owner =
        continuation.kind === 'retained'
          ? continuation.source.owner
          : connectionOwner(continuation.active)

      if (owner.state.kind !== 'live') {
        return false
      }

      return (
        writeViewport(panViewport(activeViewport.value, delta), {
          kind: 'connection',
          continuation,
        }) === 'current' && previewOwnerLive(continuation)
      )
    }

    watch(
      () => props.viewport,
      (next, previous) => {
        if (
          stateDisposed ||
          props.viewportMode !== 'controlled' ||
          next === undefined ||
          next === previous
        ) {
          return
        }

        const request = activeViewportRequest
        const hadPendingRequest = request !== undefined
        const producing = producingViewportWrite

        if (
          producing !== undefined &&
          producing.key === viewportKey(next) &&
          producing.request === request &&
          viewportStep(producing.write) === 'current' &&
          producing.write.observation.state.kind !== 'ended'
        ) {
          consumeViewportAcknowledgement(next)

          return
        }

        settleViewportRequest(request, 'superseded', next)

        if (consumeViewportAcknowledgement(next)) {
          return
        }

        if (stateDisposed) {
          return
        }

        if (!hadPendingRequest) {
          const operation: Extract<
            ViewportInitiator,
            { kind: 'instant' }
          >['operation'] = { state: 'live', family: null }

          const observation = newViewportObservation(
            previous ?? activeViewport.value
          )

          const reservation: WriteReservation = {
            initiator: { kind: 'instant', operation },
            state: 'bound',
          }

          const write: ViewportWrite = {
            reservation,
            observation,
          }

          const family: InstantFamily = {
            observation,
            running: new Set([operation]),
            completion: { kind: 'accepted' },
          }

          operation.family = family

          if (observation.state.kind !== 'ended') {
            observation.state.terminal = { kind: 'instant-family', family }
          }

          currentViewportWrite = reservation
          viewportObservation = observation
          let normal = false

          try {
            if (beginViewportObservation(write) === 'current') {
              changeViewportObservation(write, next)
            }

            normal = true
          } finally {
            finishInstantCall(operation, normal)
          }
        }
      },
      { flush: 'sync' }
    )

    const getViewport = (): Viewport => activeViewport.value
    const getZoom = (): number => activeViewport.value.zoom

    const viewportInitialized = (): boolean =>
      canvas.value !== undefined &&
      canvasWidth.value > 0 &&
      canvasHeight.value > 0

    const allocateViewportRequestId = (): number => {
      nextViewportRequestId += 1

      return nextViewportRequestId
    }

    const screenToFlowPosition = (position: { x: number; y: number }) => {
      const bounds = canvas.value?.getBoundingClientRect()
      const viewport = activeViewport.value

      return {
        x: (position.x - (bounds?.left ?? 0) - viewport.x) / viewport.zoom,
        y: (position.y - (bounds?.top ?? 0) - viewport.y) / viewport.zoom,
      }
    }

    const flowToScreenPosition = (position: { x: number; y: number }) => {
      const bounds = canvas.value?.getBoundingClientRect()
      const viewport = activeViewport.value

      return {
        x: (bounds?.left ?? 0) + position.x * viewport.zoom + viewport.x,
        y: (bounds?.top ?? 0) + position.y * viewport.zoom + viewport.y,
      }
    }

    const calculateViewportForBounds = (
      bounds: ViewportBounds,
      padding?: ViewportPadding
    ): Viewport | undefined => {
      if (!viewportInitialized()) {
        return undefined
      }

      return getViewportForBounds({
        bounds,
        width: canvasWidth.value,
        height: canvasHeight.value,
        limits: viewportLimits,
        padding,
      })
    }

    const getViewportForBoundsInCanvas = (
      bounds: ViewportBounds,
      options?: { padding?: ViewportPadding }
    ): Viewport | undefined => {
      const validBounds = S.decodeUnknownSync(ViewportBoundsSchema)(bounds)

      const padding =
        options?.padding === undefined
          ? undefined
          : S.decodeUnknownSync(ViewportPaddingSchema)(options.padding)

      return calculateViewportForBounds(validBounds, padding)
    }

    const requestViewport = (
      target: Viewport,
      validOptions: ViewportAnimationOptions
    ): Promise<ViewportOperationResult> => {
      const validTarget = constrainTranslate(
        decodeViewportRequestTarget(target)
      )

      const requestId = allocateViewportRequestId()

      if (stateDisposed) {
        return Promise.resolve({
          requestId,
          status: 'disposed',
          viewport: activeViewport.value,
        })
      }

      const deferred = Promise.withResolvers<ViewportOperationResult>()

      const request: ViewportRequestOwner = {
        requestId,
        result: { ...deferred, exposure: 'constructing' },
        state: { kind: 'incoming' },
      }

      const previous = activeViewportRequest
      activeViewportRequest = request

      const exposeRequest = (): Promise<ViewportOperationResult> => {
        request.result.exposure = 'returned'

        return request.result.promise
      }

      const owned = (): boolean =>
        activeViewportRequest === request &&
        (request.state.kind === 'incoming' || request.state.kind === 'active')

      const abort = (cause: unknown): void => {
        if (!owned()) {
          return
        }

        const frame: RequestFrame =
          request.state.kind === 'active'
            ? request.state.frame
            : { kind: 'none' }

        request.state = { kind: 'aborted', cause }
        activeViewportRequest = undefined
        cancelRequestFrame(frame)
      }

      try {
        settleViewportRequest(previous, 'superseded', activeViewport.value)

        if (!owned()) {
          return exposeRequest()
        }

        if (!viewportInitialized()) {
          settleViewportRequest(request, 'unavailable', activeViewport.value)

          return exposeRequest()
        }

        if (viewportEquivalence(activeViewport.value, validTarget)) {
          settleViewportRequest(request, 'unchanged', validTarget)

          return exposeRequest()
        }

        const start = activeViewport.value

        const duration =
          globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
            .matches === true
            ? 0
            : Math.max(0, validOptions.duration ?? 0)

        if (!owned()) {
          return exposeRequest()
        }

        const reservation = acquireViewportWrite({ kind: 'request', request })

        const write =
          reservation === undefined
            ? undefined
            : bindViewportObservation(reservation)

        if (write === undefined) {
          return exposeRequest()
        }

        request.state = { kind: 'active', write, frame: { kind: 'none' } }

        if (beginViewportObservation(write) !== 'current') {
          return exposeRequest()
        }

        if (props.viewportMode === 'controlled' || duration === 0) {
          if (changeViewportObservation(write, validTarget) !== 'current') {
            return exposeRequest()
          }

          updateViewportValue(write, validTarget)

          if (viewportStep(write) === 'current') {
            settleViewportRequest(
              request,
              props.viewportMode === 'controlled' ? 'proposed' : 'accepted',
              validTarget
            )
          }

          return exposeRequest()
        }

        let startedAt: number | undefined

        const schedule = (): void => {
          if (
            request.state.kind !== 'active' ||
            viewportStep(write) !== 'current'
          ) {
            return
          }

          const registration: RequestRegistration = { state: 'acquiring' }
          request.state.frame = { kind: 'registering', registration }
          let early: number | undefined

          const deliver = (timestamp: number): void => {
            if (registration.state === 'acquiring') {
              early = timestamp

              return
            }

            if (
              registration.state !== 'scheduled' ||
              request.state.kind !== 'active' ||
              viewportStep(write) !== 'current'
            ) {
              return
            }

            registration.state = 'executing'
            request.state.frame = { kind: 'executing', registration }

            try {
              startedAt ??= timestamp
              const progress = Math.min(1, (timestamp - startedAt) / duration)

              const current = interpolateViewport(
                start,
                validTarget,
                progress,
                validOptions.easing
              )

              if (changeViewportObservation(write, current) !== 'current') {
                return
              }

              updateViewportValue(write, current)

              if (viewportStep(write) !== 'current') {
                return
              }

              if (progress >= 1) {
                settleViewportRequest(request, 'accepted', validTarget)
              } else {
                schedule()
              }
            } finally {
              if (
                request.state.kind === 'active' &&
                request.state.frame.kind === 'executing' &&
                request.state.frame.registration === registration
              ) {
                request.state.frame = { kind: 'none' }
              }

              registration.state = 'revoked'
            }
          }

          let handle: number

          try {
            handle = requestAnimationFrame(deliver)
          } catch (error) {
            if (request.result.exposure === 'returned' && owned()) {
              abort(error)
              request.result.reject(error)

              return
            }

            throw error
          }

          if (
            registration.state !== 'acquiring' ||
            request.state.kind !== 'active' ||
            viewportStep(write) !== 'current'
          ) {
            registration.state = 'revoked'
            cancelAnimationFrame(handle)

            return
          }

          registration.state = 'scheduled'
          request.state.frame = { kind: 'scheduled', registration, handle }

          if (early !== undefined) {
            deliver(early)
          }
        }

        schedule()

        return exposeRequest()
      } catch (error) {
        request.result.exposure = 'abandoned'
        abort(error)
        throw error
      }
    }

    const setViewport = (
      target: Viewport,
      options?: ViewportAnimationOptions
    ): Promise<ViewportOperationResult> =>
      requestViewport(
        target,
        S.decodeUnknownSync(ViewportAnimationOptionsSchema)(options ?? {})
      )

    const zoomTo = (zoom: number, options?: ViewportAnimationOptions) =>
      setViewport(
        zoomViewportAt(
          activeViewport.value,
          zoom,
          { x: canvasWidth.value / 2, y: canvasHeight.value / 2 },
          viewportLimits
        ),
        options
      )

    const zoomIn = (options?: ViewportAnimationOptions) =>
      zoomTo(activeViewport.value.zoom * 1.2, options)

    const zoomOut = (options?: ViewportAnimationOptions) =>
      zoomTo(activeViewport.value.zoom / 1.2, options)

    const setCenter = (
      x: number,
      y: number,
      options?: ViewportAnimationOptions & { zoom?: number }
    ) => {
      const zoom = options?.zoom ?? activeViewport.value.zoom

      return setViewport(
        {
          x: canvasWidth.value / 2 - x * zoom,
          y: canvasHeight.value / 2 - y * zoom,
          zoom,
        },
        options
      )
    }

    const fitBounds = (
      bounds: ViewportBounds,
      options?: ViewportAnimationOptions & { padding?: ViewportPadding }
    ) => {
      const validBounds = S.decodeUnknownSync(ViewportBoundsSchema)(bounds)

      const validOptions = S.decodeUnknownSync(FitBoundsOptionsSchema)(
        options ?? {}
      )

      const target = calculateViewportForBounds(
        validBounds,
        validOptions.padding
      )

      return target === undefined
        ? Promise.resolve({
            requestId: allocateViewportRequestId(),
            status: 'unavailable' as const,
            viewport: activeViewport.value,
          })
        : requestViewport(target, {
            duration: validOptions.duration,
            easing: validOptions.easing,
          })
    }

    const fitView = (options?: FlowCanvasFitViewOptions) => {
      const validOptions = S.decodeUnknownSync(FitViewOptionsSchema)(
        options ?? {}
      )

      if (!viewportInitialized()) {
        return Promise.resolve({
          requestId: allocateViewportRequestId(),
          status: 'unavailable' as const,
          viewport: activeViewport.value,
        })
      }

      const nodeSelection = validOptions.nodes

      const selectedIds =
        nodeSelection === 'all' ||
        nodeSelection === 'selected' ||
        nodeSelection === undefined
          ? resolveFitViewNodeIds(activeDocument.value, nodeSelection)
          : resolveFitViewNodeIds(
              activeDocument.value,
              nodeSelection.map((item: string | { readonly id: string }) =>
                Predicate.isString(item)
                  ? { id: NodeIdSchema.make(item) }
                  : { id: NodeIdSchema.make(item.id) }
              )
            )

      const target = fitViewportToNodes({
        document: activeDocument.value,
        nodeIds: selectedIds,
        measurements: new Map(
          measurementState.nodes.map(({ measurement }) => [
            measurement.nodeId,
            measurement,
          ])
        ),
        currentViewport: activeViewport.value,
        paneWidth: canvasWidth.value,
        paneHeight: canvasHeight.value,
        limits: viewportLimits,
        padding: validOptions.padding,
        includeHiddenNodes: validOptions.includeHiddenNodes,
        minZoom: validOptions.minZoom,
        maxZoom: validOptions.maxZoom,
      })

      return requestViewport(target, {
        duration: validOptions.duration,
        easing: validOptions.easing,
      })
    }

    const drainSerialEditMutations = async (): Promise<void> => {
      if (editMutationDepth > 0 || drainingEditMutations || stateDisposed) {
        return
      }

      drainingEditMutations = true

      try {
        while (pendingEditMutations.length > 0) {
          if (stateDisposed) {
            break
          }

          const mutation = pendingEditMutations.shift()

          if (mutation !== undefined) {
            // oxlint-disable-next-line no-await-in-loop
            await mutation()
          }
        }
      } finally {
        drainingEditMutations = false
      }
    }

    const withEditMutation = (mutation: () => void): void => {
      editMutationDepth += 1

      try {
        mutation()
      } finally {
        editMutationDepth -= 1

        if (editMutationDepth === 0) {
          void drainSerialEditMutations()
        }
      }
    }

    const applyEditResolvedNow = async (
      resolveInput: (document: FlowDocument) => FlowEditTransactionInput
    ): Promise<FlowEditResult> => {
      if (stateDisposed) {
        throw new Error('FlowCanvasDisposed')
      }

      const currentDocument = createFlowSnapshot(
        unwrapReactive(activeDocument.value),
        unwrapReactive(activeViewport.value)
      ).document

      const input = resolveInput(currentDocument)
      const transaction = { ...input, context: input.context ?? localContext() }

      let result: FlowEditResult

      try {
        result = await Effect.runPromise(
          prepareFlowEdit(currentDocument, transaction)
        )
      } catch (error) {
        reportError(
          error instanceof Error ? error : new Error(String(error)),
          'edit'
        )

        throw error
      }

      if (stateDisposed) {
        throw new Error('FlowCanvasDisposed')
      }

      if (hasSplitModel || props.documentMode === 'controlled') {
        const proposal: FlowChange = {
          kind: 'edit-proposal',
          document: result.document,
          deletion: result.deletion,
          context: result.context,
        }

        emit('change', proposal)
        emitElementChanges(currentDocument, proposal)

        if (hasSplitModel) {
          emit('update:nodes', result.document.nodes)
          emit('update:edges', result.document.edges)
        } else {
          emit('update:document', result.document)
        }

        return result
      }

      const proposal: FlowChange = {
        kind: 'edit-proposal',
        document: result.document,
        deletion: result.deletion,
        context: result.context,
      }

      emit('change', proposal)
      emitElementChanges(currentDocument, proposal)

      acceptedContext = result.context

      try {
        withStateCause('semantic-change', () => {
          ownedDocument.value = result.document
        })
      } finally {
        acceptedContext = undefined
      }

      return result
    }

    const applyEditResolved = (
      resolveInput: (document: FlowDocument) => FlowEditTransactionInput
    ): Promise<FlowEditResult> => {
      if (stateDisposed) {
        return Promise.reject(new Error('FlowCanvasDisposed'))
      }

      const pending = Promise.withResolvers<FlowEditResult>()

      const dispose = (): void =>
        pending.reject(new Error('FlowCanvasDisposed'))

      pendingEditSettlers.add(dispose)

      pendingEditMutations.push(async () => {
        pendingEditSettlers.delete(dispose)

        try {
          pending.resolve(await applyEditResolvedNow(resolveInput))
        } catch (error) {
          pending.reject(error)
        }
      })

      if (editMutationDepth === 0) {
        void drainSerialEditMutations()
      }

      return pending.promise
    }

    const applyEdit = (
      transaction: FlowEditTransactionInput
    ): Promise<FlowEditResult> => applyEditResolved(() => transaction)

    const routeEditor = createVueRouteEditor({
      enabled: () => props.editableEdges,
      available: () =>
        !stateDisposed &&
        session.value === undefined &&
        clickConnection.value === undefined,
      edge: (id) => activeDocument.value.edges.find((edge) => edge.id === id),
      owns: (target) => canvas.value?.contains(target) === true,
      observe: (phase, edgeId, pointerId) =>
        recordFlowTelemetry(
          phase === 'start'
            ? 'Started Vue route-point drag'
            : 'Cancelled Vue route-point drag',
          phase === 'start'
            ? FlowSpan.browserPointerCapture
            : FlowSpan.gestureCancel,
          {
            [FlowAttribute.edgeId]: edgeId,
            [FlowAttribute.pointerId]: pointerId,
            [FlowAttribute.inputKind]: 'pointer',
          }
        ),
      captureFailed: (error) =>
        recordFlowFailure(
          'Vue route-point capture failed',
          FlowSpan.browserPointerCapture,
          { [FlowAttribute.failureMessage]: error.message }
        ),
      point: (event) => clientToFlow(event.clientX, event.clientY),
      autoPan: (event) => {
        const bounds = canvas.value?.getBoundingClientRect()

        if (!props.autoPanOnConnect || bounds === undefined) {
          return false
        }

        const delta = selectionAutoPanDelta(
          { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
          bounds.width,
          bounds.height,
          40,
          props.autoPanSpeed
        )

        if (delta.x === 0 && delta.y === 0) {
          return false
        }

        updateViewport(panViewport(activeViewport.value, delta))

        return !stateDisposed
      },
      commit: async (edgeId, command) => {
        try {
          await applyEditResolved((document) =>
            Effect.runSync(
              editEdgeRoute(document, edgeId, command, {
                measurements: getFlowMeasuredNodes(document, measurementState),
              })
            )
          )
        } catch (error) {
          reportError(
            error instanceof Error ? error : new Error(String(error)),
            'edit'
          )
        }
      },
    })

    watch(
      () => props.editableEdges,
      () => routeEditor.cancel(),
      { flush: 'sync' }
    )
    watch(
      () => activeDocument.value,
      () => routeEditor.cancel(),
      { flush: 'sync' }
    )
    onBeforeUnmount(routeEditor.cancel)

    const liveResizePreview = shallowRef<{
      readonly change: NodeBoundsChange
      readonly graph: FlowGraphView
      readonly size: { readonly width: number; readonly height: number }
    }>()

    const resizePreviewGraph = (change: NodeBoundsChange) => {
      const positions = new Map([
        ...change.childPositions.map(
          ({ nodeId, position }) =>
            [nodeId, position] satisfies [NodeId, XYPosition]
        ),
        [change.nodeId, change.position],
      ])

      return createFlowGraph(
        activeDocument.value,
        getFlowMeasuredNodes(activeDocument.value, measurementState),
        positions,
        undefined,
        nodeExtent
      )
    }

    const resizePreviewPosition = (change: NodeBoundsChange | undefined) =>
      change === undefined
        ? undefined
        : resizePreviewGraph(change).nodes.get(change.nodeId)?.absolutePosition

    const previewNodeBounds = (
      element: HTMLElement,
      change: NodeBoundsChange
    ): void => {
      const previewGraph = resizePreviewGraph(change)
      const position = previewGraph.nodes.get(change.nodeId)?.absolutePosition

      if (position === undefined) {
        return
      }

      element.style.left = `${position.x}px`
      element.style.top = `${position.y}px`
      element.style.width = `${change.size.width}px`
      element.style.height = `${change.size.height}px`
      const rect = element.getBoundingClientRect()
      const zoom = renderedViewportZoom(element, activeViewport.value.zoom)
      liveResizePreview.value = {
        change,
        graph: previewGraph,
        size: {
          width: rect.width / zoom,
          height: rect.height / zoom,
        },
      }
    }

    type TerminalPort =
      | {
          readonly kind: 'viewportEnd' | 'moveEnd'
          readonly viewport: Viewport
          readonly status: ViewportOperationResult['status']
        }
      | {
          readonly kind: 'connectEnd' | 'reconnectEnd' | 'clickConnectEnd'
          readonly payload: ConnectionEndPayload
          readonly details?: FlowConnectionEndDetails
        }
      | {
          readonly kind: 'nodeDragEnd' | 'nodeDragStop'
          readonly payload: NodeEndPayload
        }
      | {
          readonly kind: 'selectionEnd' | 'selectionDragStop'
          readonly payload: SelectionEndPayload
        }

    type DisposalResource =
      | { readonly kind: 'history' }
      | {
          readonly kind: 'request-frame'
          readonly taken: TakenRequestSettlement
        }
      | { readonly kind: 'key-observer'; readonly dispose: () => void }
      | {
          readonly kind: 'unobserve-canvas'
          readonly observer: ResizeObserver
          readonly element: HTMLElement
        }
      | {
          readonly kind: 'disconnect-observer'
          readonly observer: ResizeObserver
        }
      | {
          readonly kind: 'remove-keydown'
          readonly target: typeof globalThis
          readonly listener: typeof onKeyDown
        }
      | {
          readonly kind: 'remove-pointerdown'
          readonly target: HTMLElement
          readonly listener: typeof rememberPanePress
        }
      | {
          readonly kind: 'remove-keyup'
          readonly target: typeof globalThis
          readonly listener: typeof onWindowKeyUp
        }
      | {
          readonly kind: 'remove-blur'
          readonly target: typeof globalThis
          readonly listener: typeof onWindowBlur
        }
      | { readonly kind: 'connection-capture'; readonly press: ConnectionPress }
      | {
          readonly kind: 'session-capture'
          readonly target: DragSession['captureTarget']
          readonly pointerId: DragSession['pointerId']
        }
      | {
          readonly kind: 'remove-node-transform'
          readonly element: HTMLElement
        }
      | {
          readonly kind: 'resize-style'
          readonly element: HTMLElement
          readonly property: 'left' | 'top' | 'width' | 'height'
          readonly value: string
        }
      | { readonly kind: 'clear-session-view'; readonly view: Session }
      | { readonly kind: 'clear-retained-view'; readonly view: RetainedSource }

    type InternalsSettler = NonNullable<
      ReturnType<typeof pendingInternals.get>
    >[number]

    type DisposalStep =
      | { readonly kind: 'resource'; readonly resource: DisposalResource }
      | { readonly kind: 'terminal'; readonly port: TerminalPort }
      | { readonly kind: 'connection-claim'; readonly claim: ConnectionClaim }
      | {
          readonly kind: 'request-settlement'
          readonly taken: TakenRequestSettlement
        }
      | {
          readonly kind: 'internals-settlement'
          readonly settle: InternalsSettler
          readonly result: Parameters<InternalsSettler>[0]
        }

    interface CapturedDisposal {
      readonly steps: DisposalStep[]
      next: number
    }

    let capturedDisposal: CapturedDisposal | undefined

    /** Pointer releases that completed a connection claim. */
    const connectionReleases = new WeakMap<ConnectionClaim, PointerEvent>()

    const finalConnectionState = (
      claim: ConnectionClaim,
      result: ConnectionResult
    ): FlowFinalConnectionState => {
      const { source } = claim
      const last = lastConnectionPreviews.get(claim.owner)

      const fallback: ConnectionPreviewState =
        source.reconnect === undefined
          ? {
              kind: 'connect',
              from: source.start,
              to: source.pointer,
              candidate: null,
              valid: null,
            }
          : {
              kind: 'reconnect',
              from: source.start,
              to: source.pointer,
              candidate: null,
              valid: null,
              edgeId: S.decodeUnknownSync(EdgeIdSchema)(
                source.reconnect.edgeId
              ),
              endpoint: source.reconnect.endpoint,
            }

      const base = last ?? fallback

      const preview: ConnectionPreviewState =
        result.kind === 'success'
          ? { ...base, candidate: result.connection, valid: true }
          : base

      return flowFinalConnectionState(
        flowConnectionState({
          document: activeDocument.value,
          preview: createConnectionPreviewSnapshot(preview),
          origin: {
            nodeId: source.sourceNode.id,
            handleId: source.sourceHandle,
          },
        })
      )
    }

    const finishConnectionClaim = (
      claim: ConnectionClaim,
      result: ConnectionResult,
      packet?: CapturedDisposal
    ): void => {
      if (
        claim.owner.state.kind !== 'completing' ||
        claim.owner.state.claim !== claim
      ) {
        return
      }

      claim.owner.state = { kind: 'ended' }
      pendingConnectionClaims.delete(claim)

      const release = connectionReleases.get(claim)

      const payload: ConnectionEndPayload =
        result.kind === 'success'
          ? {
              status: result.status,
              reason: result.reason,
              connection: result.connection,
            }
          : { status: result.kind, reason: result.reason }

      const connectionState = finalConnectionState(claim, result)

      const details: FlowConnectionEndDetails =
        release === undefined
          ? { connectionState }
          : {
              connectionState,
              clientPosition: { x: release.clientX, y: release.clientY },
              event: release,
            }

      const ports: TerminalPort[] = [
        {
          kind:
            claim.lifecycle.kind === 'connect' ? 'connectEnd' : 'reconnectEnd',
          payload,
          details,
        },
      ]

      if (
        claim.lifecycle.kind === 'connect' &&
        claim.lifecycle.activation === 'click'
      ) {
        ports.push({
          kind: 'clickConnectEnd',
          payload: { status: payload.status, reason: payload.reason },
        })
      }

      if (packet === undefined) {
        for (const port of ports) {
          deliverTerminal(port)
        }
      } else {
        packet.steps.splice(
          packet.next,
          0,
          ...ports.map((port): DisposalStep => ({ kind: 'terminal', port }))
        )
      }
    }

    const claimConnection = (
      owner: ConnectionOwner,
      source: ConnectionData,
      target: CompletionTarget | null,
      physicalView: PendingConnection | ConnectionSession | undefined,
      retainedView: RetainedSource | undefined
    ): ConnectionClaim | undefined => {
      if (owner.state.kind !== 'live') {
        return undefined
      }

      const live = owner.state

      let press =
        live.residence.kind === 'pointer' ? live.residence.press : null

      if (
        physicalView !== undefined &&
        (physicalView.kind !== 'connection' || physicalView.route === 'pointer')
      ) {
        ;({ press } = physicalView)
      }

      const claim: ConnectionClaim = {
        owner,
        lifecycle: live.lifecycle,
        source,
        target,
        resources: {
          press,
          autoPan: live.autoPan,
          physicalView,
          retainedView,
        },
      }

      owner.state = { kind: 'completing', claim }
      pendingConnectionClaims.add(claim)

      return claim
    }

    const clearClaimPresentation = (claim: ConnectionClaim): void => {
      if (claim.resources.press !== null) {
        releaseConnectionPress(claim.resources.press)
      }

      if (!claimLive(claim)) {
        return
      }

      if (session.value === claim.resources.physicalView) {
        session.value = undefined
      }

      if (!claimLive(claim)) {
        return
      }

      if (clickConnection.value === claim.resources.retainedView) {
        clickConnection.value = undefined
      }
    }

    const detachSessionView = (active: Session): void => {
      if (session.value !== active) {
        return
      }

      if (
        active.kind === 'connection-pending' ||
        active.kind === 'reconnection-pending' ||
        (active.kind === 'connection' && active.route === 'pointer')
      ) {
        releaseConnectionPress(active.press)
      } else if (active.captureTarget.hasPointerCapture?.(active.pointerId)) {
        active.captureTarget.releasePointerCapture?.(active.pointerId)
      }

      if (stateDisposed) {
        return
      }

      if (session.value === active) {
        session.value = undefined
      }

      if (stateDisposed) {
        return
      }

      if (active.kind === 'node' || active.kind === 'node-pending') {
        helperGuides.value = []
        dragPreview.value = undefined
      }

      if (active.kind === 'resize' || active.kind === 'keyboard-resize') {
        previewNodeBounds(active.element, {
          kind: 'node-bounds',
          nodeId: active.node.id,
          position: active.position,
          size: active.size,
          childPositions: [],
        })
        liveResizePreview.value = undefined
      }
    }

    const takeSelection = (
      active: OwnedSelection
    ): SelectionClaim | undefined => {
      if (stateDisposed || active.owner.state.kind !== 'live') {
        return undefined
      }

      const claim: SelectionClaim = { owner: active.owner, active }
      active.owner.state = { kind: 'completing', claim }
      detachSessionView(active)

      return claim
    }

    const finishSelection = (
      claim: SelectionClaim,
      status: SelectionEndPayload['status'],
      reason: string
    ): void => {
      if (
        claim.owner.state.kind !== 'completing' ||
        claim.owner.state.claim !== claim
      ) {
        return
      }

      claim.owner.state = { kind: 'ended' }
      emit('selectionEnd', { status, reason })
      emit('selectionDragStop', { status, reason })
    }

    const cancelConnectionClaim = (
      claim: ConnectionClaim,
      reason: string
    ): void => {
      if (!claimLive(claim)) {
        return
      }

      clearClaimPresentation(claim)

      if (!claimLive(claim)) {
        return
      }

      if (claim.resources.autoPan !== null) {
        for (const port of takeOwnedObservationPorts(
          claim.resources.autoPan,
          { kind: 'connection', owner: claim.owner },
          activeViewport.value,
          'superseded'
        )) {
          deliverTerminal(port)
        }
      }

      if (claimLive(claim)) {
        finishConnectionClaim(claim, { kind: 'cancelled', reason })
      }
    }

    // eslint-disable-next-line complexity -- All existing session variants detach their exact presentation before their terminal callback.
    const cleanupPreview = (
      active: Session | undefined = session.value,
      reason = 'superseded'
    ): void => {
      if (stateDisposed || active === undefined || session.value !== active) {
        return
      }

      if (active.kind === 'connection') {
        const retained =
          active.route === 'pointer' && active.source.kind === 'retained'
            ? active.source.source
            : undefined

        const claim = claimConnection(
          connectionOwner(active),
          retained?.data ?? active,
          null,
          active,
          retained
        )

        if (claim === undefined) {
          return
        }

        cancelConnectionClaim(claim, reason)

        return
      }

      if (active.kind === 'selection') {
        const claim = takeSelection(active)

        if (claim !== undefined && !stateDisposed) {
          finishSelection(claim, 'cancelled', reason)
        }

        return
      }

      if (active.kind === 'pan') {
        if (active.owner.state.kind !== 'live') {
          return
        }

        const ports = takeOwnedObservationPorts(
          active.owner.state.observation,
          { kind: 'pan', owner: active.owner },
          activeViewport.value,
          'superseded'
        )

        active.owner.state = { kind: 'ended' }
        detachSessionView(active)

        if (!stateDisposed) {
          for (const port of ports) {
            deliverTerminal(port)
          }
        }

        return
      }

      detachSessionView(active)

      if (
        !stateDisposed &&
        (active.kind === 'node' || active.kind === 'node-pending')
      ) {
        endNodeDrag(active, 'cancelled', reason)
      }
    }

    const cancelRetained = (retained: RetainedSource, reason: string): void => {
      const claim = claimConnection(
        retained.owner,
        retained.data,
        null,
        undefined,
        retained
      )

      if (claim !== undefined) {
        cancelConnectionClaim(claim, reason)
      }
    }

    const cancelActiveSession = (reason = 'superseded'): void => {
      routeEditor.cancel()

      if (stateDisposed) {
        return
      }

      const active = session.value
      const retained = clickConnection.value
      let activeClaim: ConnectionClaim | undefined

      if (active?.kind === 'connection') {
        const source =
          active.route === 'pointer' && active.source.kind === 'retained'
            ? active.source.source
            : undefined

        activeClaim = claimConnection(
          connectionOwner(active),
          source?.data ?? active,
          null,
          active,
          source
        )
      }

      const retainedClaim =
        retained !== undefined && retained.owner !== activeClaim?.owner
          ? claimConnection(
              retained.owner,
              retained.data,
              null,
              undefined,
              retained
            )
          : undefined

      if (activeClaim !== undefined) {
        cancelConnectionClaim(activeClaim, reason)
      } else if (active !== undefined) {
        cleanupPreview(active, reason)
      }

      if (retainedClaim !== undefined) {
        cancelConnectionClaim(retainedClaim, reason)
      }
    }

    watch(
      () => activeDocument.value,
      () => {
        const active = session.value

        if (active?.kind === 'resize' || active?.kind === 'keyboard-resize') {
          cleanupPreview(active, 'document-replacement')
        }
      },
      { flush: 'sync' }
    )

    watch(
      () =>
        activeDocument.value.nodes.map((node) => ({
          id: node.id,
          handles: flowNodeHandles(node).map(({ id, kind }) => `${kind}:${id}`),
        })),
      // eslint-disable-next-line complexity -- This watcher settles the existing node, selection and connection ownership slots together.
      (nodes, previousNodes) => {
        const active = session.value
        const pending = clickConnection.value
        const nodeIds = nodes.map(({ id }) => id)

        const currentNodeIds = new Set(nodeIds)

        const nodeWasRemoved = previousNodes.some(
          ({ id }) => !currentNodeIds.has(id)
        )

        const sourceStillExists = (connection: ConnectionData): boolean =>
          nodes.some(
            ({ id, handles }) =>
              id === connection.sourceNode.id &&
              handles.includes(`source:${connection.sourceHandle}`)
          )

        const currentHandleSignature = nodes
          .map(({ id, handles }) => `${id}:${handles.toSorted().join(',')}`)
          .join('|')

        const fixedReconnectEndpointStillExists = (
          connection: ConnectionSession
        ): boolean => {
          if (connection.reconnect === undefined) {
            return true
          }

          const edge = activeDocument.value.edges.find(
            ({ id }) => id === connection.reconnect?.edgeId
          )

          if (edge === undefined) {
            return false
          }

          const nodeId =
            connection.reconnect.endpoint === 'source'
              ? edge.target
              : edge.source

          const handleId =
            connection.reconnect.endpoint === 'source'
              ? edge.targetHandle
              : edge.sourceHandle

          const kind =
            connection.reconnect.endpoint === 'source' ? 'target' : 'source'

          return (
            handleId !== undefined &&
            nodes.some(
              ({ id, handles }) =>
                id === nodeId && handles.includes(`${kind}:${handleId}`)
            )
          )
        }

        if (
          (active?.kind === 'node' ||
            active?.kind === 'node-pending' ||
            active?.kind === 'resize' ||
            active?.kind === 'keyboard-resize') &&
          !nodeIds.includes(active.node.id)
        ) {
          cleanupPreview(active, 'node-removed')
        }

        if (active?.kind === 'selection' && nodeWasRemoved) {
          cleanupPreview(active, 'node-removed')
        }

        if (
          active?.kind === 'connection' &&
          (!sourceStillExists(active) ||
            !fixedReconnectEndpointStillExists(active) ||
            (active.reconnect !== undefined &&
              active.reconnect.handleSignature !== currentHandleSignature))
        ) {
          cleanupPreview(active, 'configuration-replacement')
        }

        if (
          pending !== undefined &&
          clickConnection.value === pending &&
          !sourceStillExists(pending.data)
        ) {
          cancelRetained(pending, 'node-removed')
        }
      }
    )

    watch(
      () => props.selectionMode,
      () => {
        if (session.value?.kind === 'selection') {
          cleanupPreview(undefined, 'configuration-replacement')
        }
      }
    )

    const dispatch = (command: FlowCommand): void => {
      if (command.kind === 'set-viewport') {
        updateViewport(command.viewport)
      }

      if (command.kind === 'set-node-position') {
        const node = activeDocument.value.nodes.find(
          (candidate) => candidate.id === command.nodeId
        )

        if (node !== undefined) {
          publish({
            kind: 'node-position',
            nodeId: node.id,
            position: command.position,
          })
        }
      }
    }

    const liveConnectionPreview = computed(() => {
      const initiating = currentConnectionPreviewOwner()

      if (initiating === undefined) {
        return { initiating, snapshot: null }
      }

      const preview = connectionPreviewState(initiating)

      return {
        initiating,
        snapshot:
          preview === null ? null : createConnectionPreviewSnapshot(preview),
      }
    })

    const connectionState = computed((): FlowConnectionState =>
      flowConnectionState({
        document: activeDocument.value,
        preview: liveConnectionPreview.value.snapshot,
        origin:
          liveConnectionPreview.value.initiating === undefined
            ? undefined
            : connectionOrigin(liveConnectionPreview.value.initiating),
      })
    )

    const readInternalNode = (id: string): FlowInternalNode | undefined => {
      const nodeId = NodeIdSchema.make(id)
      const resize = liveResizePreview.value
      const item = resize?.graph.nodes.get(nodeId) ?? renderGraphNode(nodeId)

      if (item === undefined) {
        return undefined
      }

      const measured = measuredNodes.value.get(nodeId)
      const change = resize?.change

      const position =
        change?.nodeId === nodeId
          ? change.position
          : change?.childPositions.find((child) => child.nodeId === nodeId)
              ?.position

      return projectFlowInternalNode(
        item,
        change?.nodeId === nodeId
          ? {
              ...measured,
              nodeId,
              ...(resize?.size ?? change.size),
              handles: measured?.handles ?? [],
            }
          : measured,
        position,
        change?.nodeId === nodeId ? resize?.size : undefined
      )
    }

    const replayHistory = (direction: 'undo' | 'redo'): Promise<void> => {
      if (stateDisposed) {
        return Promise.resolve()
      }

      const pending: PromiseWithResolvers<void> = Promise.withResolvers()
      const { resolve, reject } = pending

      const settle = (): void => {
        pendingHistoryReplays.delete(settle)
        resolve()
      }

      pendingHistoryReplays.add(settle)
      pendingEditMutations.push(async () => {
        let transactionId: string | undefined

        try {
          cancelActiveSession('history-replay')
          finishKeyboardHistory()

          const replay = historyEvent({
            kind: 'replay',
            direction,
            transactionId: crypto.randomUUID(),
          })

          if (replay.replacement !== undefined) {
            const { context } = replay.replacement
            const { transactionId: replayTransactionId } = context

            transactionId = replayTransactionId

            const document = await Effect.runPromise(
              decodeFlowDocument(
                restoreFlowHistoryDocument(
                  replay.replacement.document,
                  stateSnapshot.value.document
                )
              )
            )

            if (
              stateDisposed ||
              historyState.value.phase.kind !== 'pending' ||
              historyState.value.phase.context.transactionId !==
                replayTransactionId
            ) {
              settle()

              return
            }

            const proposal: FlowChange = {
              kind: 'edit-proposal',
              document,
              context,
              deletion: {
                deletedNodeIds: activeDocument.value.nodes
                  .filter(
                    (node) =>
                      !document.nodes.some((next) => next.id === node.id)
                  )
                  .map((node) => node.id),
                deletedEdgeIds: activeDocument.value.edges
                  .filter(
                    (edge) =>
                      !document.edges.some((next) => next.id === edge.id)
                  )
                  .map((edge) => edge.id),
              },
            }

            emit('change', proposal)
            emitElementChanges(activeDocument.value, proposal)

            if (!stateDisposed) {
              if (hasSplitModel || props.documentMode === 'controlled') {
                if (hasSplitModel) {
                  emit('update:nodes', document.nodes)
                  emit('update:edges', document.edges)
                } else {
                  emit('update:document', document)
                }
              } else {
                acceptedContext = context

                try {
                  withStateCause('semantic-change', () => {
                    ownedDocument.value = document
                  })
                } finally {
                  acceptedContext = undefined
                }
              }
            }
          }

          settle()
        } catch (error) {
          if (transactionId !== undefined) {
            rejectHistory(transactionId)
          }

          reportError(
            error instanceof Error ? error : new Error(String(error)),
            'edit'
          )
          pendingHistoryReplays.delete(settle)
          reject(error)
        }
      })
      void drainSerialEditMutations()

      return pending.promise
    }

    const clipboard = createFlowClipboardSession({
      getDocument: () => stateSnapshot.value.document,
      applyEdit: applyEditResolved,
      isDisposed: () => stateDisposed,
    })

    const editor: FlowEditor = {
      ...clipboard,
      document: computed(() => stateSnapshot.value.document),
      viewport: computed(() => stateSnapshot.value.viewport),
      snapshot: stateSnapshot,
      history,
      undo: () => replayHistory('undo'),
      redo: () => replayHistory('redo'),
      rejectHistory,
      getDocumentRevision: () => documentRevision,
      beginDeleteApproval: () => {
        if (stateDisposed || deleteApprovalPending) {
          return false
        }

        deleteApprovalPending = true

        return true
      },
      endDeleteApproval: () => {
        deleteApprovalPending = false
      },
      withEditMutation,
      connectionPreview: computed(() => liveConnectionPreview.value.snapshot),
      connectionState,
      interactivity,
      setInteractivity,
      reportError,
      subscribeState,
      subscribeSelection,
      observeKeyPress: observeOwnedKeyPress,
      dispatch,
      updateDocument,
      applyEdit,
      applyEditResolved,
      updateViewport,
      getViewport,
      getViewportLimits: () => viewportLimits,
      getZoom,
      viewportInitialized,
      screenToFlowPosition,
      flowToScreenPosition,
      setViewport,
      zoomIn,
      zoomOut,
      zoomTo,
      setCenter,
      fitBounds,
      fitView,
      getViewportForBounds: getViewportForBoundsInCanvas,
      publish,
      getInternalNodes: () =>
        new Map(
          activeDocument.value.nodes.flatMap((node) => {
            const internal = readInternalNode(node.id)

            return internal === undefined ? [] : [[node.id, internal] as const]
          })
        ),
      measuredSizes: computed(
        () =>
          new Map(
            [...measuredNodes.value].map(([id, measured]) => [
              id,
              { width: measured.width, height: measured.height },
            ])
          )
      ),
      ariaLabelConfig,
      getInternalNode: readInternalNode,
      nodesInitialized: (options) =>
        areFlowNodesInitialized(activeDocument.value, measurementState, {
          ...options,
          mountedNodeIds: new Set(
            activeDocument.value.nodes
              .filter((node) => nodeElements.has(node.id))
              .map((node) => node.id)
          ),
        }),
      updateNodeInternals: (requestedIds) => {
        const nodeIds = [
          ...new Set(
            S.decodeUnknownSync(S.Array(NodeIdSchema))(
              Array.isArray(requestedIds) ? requestedIds : [requestedIds]
            )
          ),
        ]

        if (stateDisposed) {
          return Promise.resolve(
            nodeIds.map((nodeId) => ({ nodeId, status: 'disposed' as const }))
          )
        }

        const requests = nodeIds.map((nodeId) => {
          const { promise, resolve } =
            Promise.withResolvers<
              Awaited<ReturnType<FlowEditor['updateNodeInternals']>>[number]
            >()

          const waiters = pendingInternals.get(nodeId) ?? []
          waiters.push(resolve)
          pendingInternals.set(nodeId, waiters)

          return promise
        })

        const failQueued = (cause: unknown): void => {
          refreshScheduled = false
          recordFlowTelemetry(
            'Vue measurement refresh failed',
            FlowSpan.geometryMeasure,
            {
              [FlowAttribute.failureName]:
                cause instanceof Error ? cause.name : 'Unknown',
              [FlowAttribute.nodeId]: 'batch',
            },
            cause
          )

          for (const [nodeId, waiters] of pendingInternals) {
            for (const settle of waiters) {
              settle({ nodeId: NodeIdSchema.make(nodeId), status: 'failed' })
            }
          }

          pendingInternals.clear()
        }

        // eslint-disable-next-line complexity -- One refresh batch settles every waiter after measuring.
        const flush = (): void => {
          refreshScheduled = false
          const batch = [...pendingInternals]
          pendingInternals.clear()
          const samples: NodeMeasurementInput[] = []

          const results: Awaited<
            ReturnType<FlowEditor['updateNodeInternals']>
          >[number][] = []

          for (const [nodeId] of batch) {
            let status: Awaited<
              ReturnType<FlowEditor['updateNodeInternals']>
            >[number]['status'] = 'disposed'

            try {
              const node = activeNodesById.get(nodeId)
              const element = nodeElements.get(nodeId)
              const generation = nodeGenerations.get(nodeId)

              if (!stateDisposed) {
                if (node === undefined) {
                  status = 'missing'
                } else if (
                  element === undefined ||
                  !element.isConnected ||
                  generation === undefined
                ) {
                  status = 'failed'
                } else {
                  const sample = isResizePreviewNode(node.id)
                    ? undefined
                    : readNodeMeasurement(node, element, generation)

                  if (sample !== undefined) {
                    samples.push(sample)
                  }

                  status = 'requested'
                }
              }
            } catch (error) {
              status = 'failed'
              recordFlowTelemetry(
                'Vue measurement refresh failed',
                FlowSpan.geometryMeasure,
                {
                  [FlowAttribute.failureName]:
                    error instanceof Error ? error.name : 'Unknown',
                }
              )
            }

            results.push({ nodeId: NodeIdSchema.make(nodeId), status })
          }

          let projectionFailed = false

          try {
            if (!stateDisposed && samples.length > 0) {
              commitMeasurements(samples)
            }
          } catch (error) {
            recordFlowTelemetry(
              'Vue measurement refresh failed',
              FlowSpan.geometryMeasure,
              {
                [FlowAttribute.failureName]:
                  error instanceof Error ? error.name : 'Unknown',
              }
            )
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

        if (!refreshScheduled && pendingInternals.size > 0) {
          refreshScheduled = true

          try {
            requestAnimationFrame(flush)
          } catch (error) {
            failQueued(error)
          }
        }

        return Promise.all(requests)
      },
    }

    const provider = inject(FlowProviderKey, null)

    if (provider !== null) {
      const release = provider.register(editor)
      onBeforeUnmount(release)
    }

    provide(FlowProviderKey, null)
    provide(FlowEditorKey, editor)
    provide(FlowEdgeLabelRendererContextKey, edgeLabelRegistry.context)
    provide(FlowViewportPortalContextKey, {
      target: viewportPortalTarget,
      noPanClassName: computed(() => props.noPanClassName),
      noDragClassName: computed(() => props.noDragClassName),
      noWheelClassName: computed(() => props.noWheelClassName),
    })

    const miniMapProjection = computed(() => ({
      revision: measurementRevision.value,
      graph: createFlowGraph(
        activeDocument.value,
        new Map(
          measurementState.nodes.map(({ measurement }) => [
            measurement.nodeId,
            measurement,
          ])
        ),
        undefined,
        undefined,
        nodeExtent
      ),
    }))

    const miniMapGraph = computed(() => miniMapProjection.value.graph)
    provide(FlowNodeToolbarContextKey, {
      target: toolbarOverlayTarget,
      graph: miniMapGraph,
      noPanClassName: computed(() => props.noPanClassName),
      noDragClassName: computed(() => props.noDragClassName),
      noWheelClassName: computed(() => props.noWheelClassName),
    })
    provide(FlowMiniMapContextKey, {
      graph: miniMapGraph,
      canvasSize: computed(() => ({
        width: canvasWidth.value,
        height: canvasHeight.value,
      })),
    })

    const resizerHost: FlowNodeResizerHost = {
      register: (nodeId) => {
        const id = NodeIdSchema.make(nodeId)
        nodeResizers.set(id, (nodeResizers.get(id) ?? 0) + 1)

        return () => {
          const count = (nodeResizers.get(id) ?? 1) - 1

          if (count <= 0) {
            nodeResizers.delete(id)
          } else {
            nodeResizers.set(id, count)
          }
        }
      },
      graph: () => graph.value,
      zoom: () => activeViewport.value.zoom,
      pointerToFlow: (clientX, clientY) => clientToFlow(clientX, clientY),
      snapGrid: () => (props.snapToGrid ? snapGrid.value : undefined),
      publish: (changes) => publishAll(changes),
      complete: (nodeId, accepted) => {
        if (!stateDisposed && graph.value.nodes.has(nodeId)) {
          emit('nodesChange', flowResizeCompletionChanges(nodeId, accepted))
        }
      },
    }

    provide(FlowNodeResizerRegistryKey, resizerHost)

    expose({ editor })
    onMounted(() => emit('init', editor))

    // React `fitView`: fit once, when the nodes are first measured.
    let initialFitPending = props.fitView

    watch(
      measurementRevision,
      () => {
        if (
          !initialFitPending ||
          stateDisposed ||
          !viewportInitialized() ||
          !editor.nodesInitialized()
        ) {
          return
        }

        initialFitPending = false
        void fitView(props.fitViewOptions)
      },
      { flush: 'post' }
    )

    const nodePosition = (node: FlowNode): { x: number; y: number } =>
      renderGraphNode(node.id)?.absolutePosition ?? node.position

    const visible = (node: FlowNode): boolean => {
      if (graph.value.nodes.get(node.id)?.hidden === true) {
        return false
      }

      if (!props.renderOnlyVisible) {
        return true
      }

      const position = nodePosition(node)
      const viewport = activeViewport.value
      const left = position.x * viewport.zoom + viewport.x
      const top = position.y * viewport.zoom + viewport.y

      return (
        left < canvasWidth.value &&
        top < canvasHeight.value &&
        left + 150 * viewport.zoom > 0 &&
        top + 44 * viewport.zoom > 0
      )
    }

    const resolvePendingHandle = (
      identity: typeof PendingHandleSchema.Type
    ) => {
      const node = activeDocument.value.nodes.find(
        ({ id }) => id === identity.nodeId
      )

      const handle = flowNodeHandles(node).find(
        ({ id, kind }) => id === identity.handleId && kind === identity.kind
      )

      const current = graph.value.nodes.get(identity.nodeId)

      const measured = measuredHandles.value
        .get(identity.nodeId)
        ?.get(identity.handleId)

      const mounted = [
        ...(canvas.value?.querySelectorAll<HTMLElement>('[data-handle-id]') ??
          []),
      ].some(
        (element) =>
          element.dataset.handleId === identity.handleId &&
          element.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId ===
            identity.nodeId
      )

      if (
        node === undefined ||
        handle === undefined ||
        current === undefined ||
        current.hidden ||
        measured === undefined ||
        !mounted
      ) {
        return
      }

      return {
        node,
        handle,
        start: edgeAttachmentPosition(
          current.absolutePosition,
          handle,
          measured
        ),
      }
    }

    const pendingAsReconnection = (
      pending: Extract<PendingConnection, { kind: 'reconnection-pending' }>
    ): ConnectionData | undefined => {
      const edge = activeDocument.value.edges.find(
        ({ id }) => id === pending.edgeId
      )

      const resolved = edge && resolveEdgeHandles(activeDocument.value, edge)
      const source = resolvePendingHandle(pending.source)
      const target = resolvePendingHandle(pending.target)

      if (
        edge === undefined ||
        edge.hidden === true ||
        edge.selected !== true ||
        !canReconnectEdge(edge, pending.endpoint) ||
        resolved === undefined ||
        source === undefined ||
        target === undefined ||
        source.node.connectable === false ||
        target.node.connectable === false ||
        edge.source !== pending.source.nodeId ||
        edge.target !== pending.target.nodeId ||
        resolved.sourceHandle.id !== pending.source.handleId ||
        resolved.targetHandle.id !== pending.target.handleId
      ) {
        return undefined
      }

      const start = pending.endpoint === 'source' ? target.start : source.start

      return {
        kind: 'connection',
        pointerId: pending.pointerId,
        captureTarget: pending.captureTarget,
        sourceNode: source.node,
        sourceHandle: source.handle.id,
        start,
        pointer: start,
        reconnect: {
          edgeId: edge.id,
          endpoint: pending.endpoint,
          handleSignature: activeDocument.value.nodes
            .map(
              (node) =>
                `${node.id}:${flowNodeHandles(node)
                  .map(({ kind, id }) => `${kind}:${id}`)
                  .toSorted()
                  .join(',')}`
            )
            .join('|'),
        },
      }
    }

    const pendingAsConnection = (
      pending: PendingConnection
    ): ConnectionData | undefined => {
      if (
        stateDisposed ||
        !pending.captureTarget.isConnected ||
        !pending.captureTarget.hasPointerCapture(pending.pointerId)
      ) {
        return undefined
      }

      if (pending.kind === 'connection-pending') {
        const source = resolvePendingHandle(pending.from)

        if (
          source === undefined ||
          (pending.sourceAssociation.kind === 'fresh' &&
            !isHandleConnectable(
              interactivity.value,
              source.node,
              source.handle,
              'start'
            ))
        ) {
          return undefined
        }

        return {
          kind: 'connection',
          pointerId: pending.pointerId,
          captureTarget: pending.captureTarget,
          sourceNode: source.node,
          sourceHandle: source.handle.id,
          start: source.start,
          pointer: source.start,
          freeform: pending.freeform === true ? [] : undefined,
        }
      }

      return pendingAsReconnection(pending)
    }

    const newConnectionOwner = (
      lifecycle: ConnectionLifecycle,
      residence: Extract<
        ConnectionOwner['state'],
        { kind: 'live' }
      >['residence']
    ): ConnectionOwner => ({
      state: { kind: 'live', lifecycle, residence, autoPan: null },
      validationFailure: 'unreported',
    })

    const promoteConnection = (
      pending: PendingConnection
    ): PhysicalConnection | undefined => {
      if (stateDisposed || session.value !== pending) {
        return undefined
      }

      const data = pendingAsConnection(pending)

      if (data === undefined) {
        cleanupPreview(pending)

        return undefined
      }

      let source: ActiveSource
      let lifecycle: ConnectionLifecycle | undefined

      if (pending.sourceAssociation.kind === 'retained') {
        if (
          pending.sourceAssociation.source.owner.state.kind !== 'live' ||
          clickConnection.value !== pending.sourceAssociation.source
        ) {
          cleanupPreview(pending)

          return undefined
        }

        source = { kind: 'retained', source: pending.sourceAssociation.source }
      } else {
        if (pending.kind === 'reconnection-pending') {
          const edge = activeDocument.value.edges.find(
            ({ id }) => id === pending.edgeId
          )

          if (edge === undefined) {
            cleanupPreview(pending)

            return undefined
          }

          lifecycle = {
            kind: 'reconnect',
            activation: 'pointer',
            edge,
            endpoint: pending.endpoint,
          }
        } else {
          lifecycle = {
            kind: 'connect',
            activation: 'pointer',
            node: data.sourceNode,
            handleId: data.sourceHandle,
          }
        }

        source = {
          kind: 'own',
          owner: newConnectionOwner(lifecycle, {
            kind: 'pointer',
            press: pending.press,
          }),
        }
      }

      const geometry =
        source.kind === 'retained'
          ? {
              ...data,
              sourceNode: source.source.data.sourceNode,
              sourceHandle: source.source.data.sourceHandle,
              start: source.source.data.start,
            }
          : data

      const active: PhysicalConnection = {
        ...geometry,
        route: 'pointer',
        press: pending.press,
        source,
      }

      session.value = active

      if (!previewOwnerLive({ kind: 'physical', active })) {
        return undefined
      }

      if (lifecycle?.kind === 'reconnect') {
        emit('reconnectStart', {
          edge: lifecycle.edge,
          endpoint: lifecycle.endpoint,
          activation: 'pointer',
        })
      } else if (lifecycle?.kind === 'connect') {
        emit('connectStart', {
          node: lifecycle.node,
          handleId: lifecycle.handleId,
          activation: 'pointer',
        })
      }

      if (!previewOwnerLive({ kind: 'physical', active })) {
        return undefined
      }

      recordFlowTelemetry(
        'Started Vue pointer connection',
        pending.kind === 'reconnection-pending'
          ? FlowSpan.edgeReconnectStart
          : FlowSpan.connectionStart,
        {
          [FlowAttribute.pointerId]: pending.pointerId,
          [FlowAttribute.inputKind]: 'pointer',
        }
      )

      return previewOwnerLive({ kind: 'physical', active }) ? active : undefined
    }

    const admitConnection = (
      data: PendingConnectionData,
      event: PointerEvent
    ): void => {
      if (stateDisposed) {
        return
      }

      const retained = clickConnection.value
      const press = acquireConnectionPress(data.captureTarget, data.pointerId)

      if (press === undefined) {
        return
      }

      if (stateDisposed || session.value !== undefined) {
        releaseConnectionPress(press)

        return
      }

      const pending: PendingConnection =
        data.kind === 'reconnection-pending'
          ? { ...data, press, sourceAssociation: { kind: 'fresh' } }
          : {
              ...data,
              press,
              sourceAssociation:
                retained === undefined || retained.owner.state.kind !== 'live'
                  ? { kind: 'fresh' }
                  : { kind: 'retained', source: retained },
            }

      session.value = pending
      event.preventDefault()
      event.stopPropagation()

      if (
        !stateDisposed &&
        session.value === pending &&
        pending.threshold === 0
      ) {
        promoteConnection(pending)
      }
    }

    watch(
      () => props.connectionDragThreshold,
      (value) => {
        connectionDragThreshold = undefined
        const result = S.decodeUnknownExit(ConnectionDragThresholdSchema)(value)

        if (Exit.isFailure(result)) {
          const active = session.value

          if (
            active?.kind === 'connection' ||
            active?.kind === 'connection-pending' ||
            active?.kind === 'reconnection-pending'
          ) {
            cancelActiveSession('invalid-configuration')
          }

          S.decodeUnknownSync(ConnectionDragThresholdSchema)(value)

          return
        }

        connectionDragThreshold = result.value
        const active = session.value

        if (
          active?.kind === 'connection-pending' ||
          active?.kind === 'reconnection-pending'
        ) {
          cleanupPreview(active, 'configuration-replacement')
        }
      },
      { flush: 'sync' }
    )
    watch(
      () => activeDocument.value,
      () => {
        const active = session.value

        if (
          (active?.kind === 'connection-pending' ||
            active?.kind === 'reconnection-pending') &&
          pendingAsConnection(active) === undefined
        ) {
          cleanupPreview(active, 'document-replacement')
        }
      },
      { flush: 'sync' }
    )

    const nodeFrame = (
      id: FlowNode['id']
    ): typeof NodeFrameSchema.Type | undefined => {
      const resolved = graph.value.nodes.get(id)

      if (
        resolved === undefined ||
        resolved.hidden ||
        !isNodeDraggable(interactivity.value, resolved.node)
      ) {
        return undefined
      }

      const parentIds: FlowNode['id'][] = []
      let { parentId } = resolved

      while (parentId !== undefined) {
        parentIds.push(parentId)
        parentId = graph.value.nodes.get(parentId)?.parentId
      }

      const parent =
        resolved.parentId === undefined
          ? undefined
          : graph.value.nodes.get(resolved.parentId)

      const origin = resolveNodeOrigin(resolved.node, activeDocument.value)

      return {
        origin: [origin[0], origin[1]],
        parentIds,
        parentX: parent?.absolutePosition.x ?? 0,
        parentY: parent?.absolutePosition.y ?? 0,
      }
    }

    const nodeStillValid = (active: DragSession): boolean => {
      const frame = nodeFrame(active.node.id)

      return (
        frame !== undefined &&
        active.element.isConnected &&
        canvas.value?.contains(active.element) === true &&
        canvas.value.querySelector(
          `[data-node-id="${CSS.escape(active.node.id)}"]`
        ) === active.element &&
        JSON.stringify(frame) === JSON.stringify(active.frame)
      )
    }

    const continueNode = (active: DragSession): boolean => {
      if (stateDisposed || session.value !== active) {
        return false
      }

      if (nodeStillValid(active)) {
        return true
      }

      cleanupPreview(active, 'node-frame-invalid')

      return false
    }

    const promoteNode = (
      pending: DragSession,
      event: PointerEvent
    ): DragSession | undefined => {
      if (pending.kind !== 'node-pending' || !continueNode(pending)) {
        return undefined
      }

      const { threshold: _threshold, ...fields } = pending

      const active: DragSession = {
        ...fields,
        kind: 'node',
        members: dragGroupMembers(
          activeDocument.value,
          interactivity.value,
          pending.node,
          graph.value
        ),
      }

      session.value = active

      const memberIds = new Set(
        (active.members ?? []).map(({ nodeId }) => nodeId)
      )

      dragStartGraph = graph.value
      dragPreview.value = {
        members: memberIds,
        moved: dragCarriedNodes(activeDocument.value, memberIds),
        delta: { x: 0, y: 0 },
      }
      emit('nodeDragStart', active.node, event)

      if (!continueNode(active)) {
        return undefined
      }

      if ((active.members?.length ?? 0) > 1) {
        emit('selectedNodesDragStart', { nodes: draggedNodes(active) }, event)

        if (!continueNode(active)) {
          return undefined
        }
      }

      selectNodeForDrag(active.node)

      if (!continueNode(active)) {
        return undefined
      }

      recordFlowTelemetry('Started Vue node drag', FlowSpan.nodeDragStart, {
        [FlowAttribute.nodeId]: active.node.id,
        [FlowAttribute.inputKind]: 'pointer',
        [FlowAttribute.controlMode]: documentControlMode(),
      })

      return active
    }

    /** Snap, extent and `expandParent` rules for one drag step. */
    const constrainedDragStep = (
      members: readonly DragMember[],
      anchor: FlowNode,
      delta: XYPosition
    ): FlowVueDragStep => {
      const start = dragStartGraph ?? graph.value

      const alignment = props.helperLines
        ? solveFlowAlignment({
            graph: start,
            nodeIds: members.map(({ nodeId }) => nodeId),
            delta,
            zoom: activeViewport.value.zoom,
            snapGrid: props.snapToGrid ? snapGrid.value : undefined,
          })
        : undefined

      helperGuides.value = alignment?.guides ?? []

      return constrainFlowVueDrag({
        graph: start,
        members,
        anchorId: anchor.id,
        delta: alignment?.delta ?? delta,
        snapGrid:
          props.snapToGrid && !props.helperLines ? snapGrid.value : undefined,
        nodeExtent,
      })
    }

    /** The documents a drag step would commit, for previews and the drop. */
    const documentForDragStep = (step: FlowVueDragStep): FlowDocument => {
      const positions = new Map(step.positions)
      const sizes = new Map<FlowNode['id'], { width: number; height: number }>()

      for (const change of step.expand) {
        if (change.kind === 'position') {
          positions.set(change.nodeId, change.position)
        } else {
          sizes.set(change.nodeId, { ...change.size })
        }
      }

      return {
        ...activeDocument.value,
        nodes: activeDocument.value.nodes.map((node) => {
          const position = positions.get(node.id)
          const size = sizes.get(node.id)

          const next = { ...node }

          if (position !== undefined) {
            Object.assign(next, { position })
          }

          if (size !== undefined) {
            Object.assign(next, { size })
          }

          return next
        }),
      }
    }

    /**
     * Commit a drop. Without `expandParent` growth this is one position
     * change; with it, each grown parent commits as one `node-bounds` change
     * carrying its children, so the drop and the growth land together.
     */
    const publishDragCommit = (
      committed: readonly {
        readonly nodeId: FlowNode['id']
        readonly position: XYPosition
      }[],
      step: FlowVueDragStep
    ): void => {
      const grown = [
        ...new Set(
          step.expand
            .filter((change) => change.kind === 'size')
            .map(({ nodeId }) => nodeId)
        ),
      ]

      const next = grown.length === 0 ? undefined : documentForDragStep(step)
      const covered = new Set<FlowNode['id']>()
      const changes: FlowChange[] = []

      for (const parentId of grown) {
        const parent = next?.nodes.find(({ id }) => id === parentId)

        if (parent?.size === undefined) {
          continue
        }

        covered.add(parentId)

        const childPositions = (next?.nodes ?? [])
          .filter((node) => node.parentId === parentId)
          .map(({ id, position }) => {
            covered.add(id)

            return { nodeId: id, position }
          })

        changes.push({
          kind: 'node-bounds',
          nodeId: parentId,
          position: parent.position,
          size: parent.size,
          childPositions,
        })
      }

      const rest = committed.filter(({ nodeId }) => !covered.has(nodeId))
      const [only] = rest

      if (rest.length === 1 && only !== undefined) {
        changes.push({ kind: 'node-position', ...only })
      } else if (rest.length > 1) {
        changes.push({ kind: 'node-positions', positions: rest })
      }

      publishAll(changes)
    }

    const moveSelectedNodesByKey = (
      node: FlowNode,
      event: KeyboardEvent
    ): void => {
      if (
        session.value !== undefined ||
        node.selected !== true ||
        !isNodeDraggable(interactivity.value, node)
      ) {
        return
      }

      const delta = keyboardResizeDelta(event.key, event.shiftKey ? 4 : 1)

      if (delta === undefined) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      const internal = graph.value.nodes.get(node.id)

      if (internal === undefined) {
        return
      }

      const message = ariaLabelConfig.value[
        'node.a11yDescription.ariaLiveMessage'
      ]({
        direction: event.key.replace('Arrow', '').toLowerCase(),
        x: Math.trunc(internal.absolutePosition.x),
        y: Math.trunc(internal.absolutePosition.y),
      })

      if (stateDisposed) {
        return
      }

      const step = constrainFlowVueDrag({
        graph: graph.value,
        members: dragGroupMembers(
          activeDocument.value,
          interactivity.value,
          node,
          graph.value
        ),
        anchorId: node.id,
        delta: {
          x: delta.x * (props.snapToGrid ? snapGrid.value.x : 5),
          y: delta.y * (props.snapToGrid ? snapGrid.value.y : 5),
        },
        snapGrid: props.snapToGrid ? snapGrid.value : undefined,
        individualNodes: true,
        nodeExtent,
      })

      if (
        keyboardHistoryGesture?.key !== event.key ||
        historyState.value.gesture?.gestureId !== keyboardHistoryGesture?.id
      ) {
        finishKeyboardHistory()
        keyboardHistoryGesture = { key: event.key, id: crypto.randomUUID() }
        historyEvent({
          kind: 'gesture',
          action: 'begin',
          gestureId: keyboardHistoryGesture.id,
        })
      }

      publishDragCommit(
        [...step.positions].map(([nodeId, position]) => ({ nodeId, position })),
        step
      )
      ariaLiveMessage.value = message
    }

    const previewForDragStep = (
      preview: NonNullable<typeof dragPreview.value>,
      members: readonly DragMember[],
      step: FlowVueDragStep
    ): NonNullable<typeof dragPreview.value> => {
      if (step.expand.length > 0) {
        return {
          members: preview.members,
          moved: preview.moved,
          delta: preview.delta,
          graph: createFlowGraph(
            documentForDragStep(step),
            measuredNodes.value,
            undefined,
            undefined,
            nodeExtent
          ),
        }
      }

      const memberDeltas = new Map(
        members.map(({ nodeId, origin }) => {
          const position = step.positions.get(nodeId) ?? origin

          return [
            nodeId,
            { x: position.x - origin.x, y: position.y - origin.y },
          ] as const
        })
      )

      const deltas = new Map<FlowNode['id'], XYPosition>()

      for (const id of preview.moved) {
        let current: FlowNode['id'] | undefined = id
        const seen = new Set<FlowNode['id']>()

        while (current !== undefined && !seen.has(current)) {
          const memberDelta = memberDeltas.get(current)

          if (memberDelta !== undefined) {
            deltas.set(id, memberDelta)
            break
          }

          seen.add(current)
          current = graph.value.nodes.get(current)?.parentId
        }
      }

      const [first] = memberDeltas.values()

      return {
        members: preview.members,
        moved: preview.moved,
        delta: first ?? preview.delta,
        deltas,
      }
    }

    const nodePointerDelta = (
      active: DragSession,
      event: PointerEvent
    ): XYPosition => {
      const bounds = canvas.value?.getBoundingClientRect()

      const start = {
        x:
          (active.startX - (bounds?.left ?? 0) - active.viewportStart.x) /
          active.viewportStart.zoom,
        y:
          (active.startY - (bounds?.top ?? 0) - active.viewportStart.y) /
          active.viewportStart.zoom,
      }

      const pointer = clientToFlow(event.clientX, event.clientY)

      return { x: pointer.x - start.x, y: pointer.y - start.y }
    }

    const moveNode = (active: Session, event: PointerEvent): void => {
      if (active.kind !== 'node' && active.kind !== 'node-pending') {
        return
      }

      if (!continueNode(active)) {
        return
      }

      let dragging: DragSession | undefined = active

      if (active.kind === 'node-pending') {
        dragging = nodeDragActivated(
          active.threshold,
          active.startX,
          active.startY,
          event.clientX,
          event.clientY
        )
          ? promoteNode(active, event)
          : undefined
      }

      if (dragging === undefined || !continueNode(dragging)) {
        return
      }

      const { x: dx, y: dy } = nodePointerDelta(dragging, event)

      const step = constrainedDragStep(dragging.members ?? [], dragging.node, {
        x: dx,
        y: dy,
      })

      const { positions } = step

      if (dragPreview.value !== undefined) {
        dragPreview.value = previewForDragStep(
          dragPreview.value,
          dragging.members ?? [],
          step
        )
      }

      emit(
        'nodeDrag',
        {
          node: dragging.node,
          position: positions.get(dragging.node.id) ?? {
            x: dragging.originX + dx,
            y: dragging.originY + dy,
          },
        },
        event
      )

      if ((dragging.members?.length ?? 0) > 1 && session.value === dragging) {
        emit(
          'selectedNodesDrag',
          { nodes: draggedNodes(dragging, positions) },
          event
        )
      }
    }

    watch(
      () => props.nodeDragThreshold,
      (value) => {
        nodeDragThreshold = undefined

        const decoded = S.decodeUnknownExit(NodeDragThresholdSchema)(
          value === undefined ? defaultNodeDragThreshold : value
        )

        if (Exit.isFailure(decoded)) {
          const active = session.value

          if (active?.kind === 'node' || active?.kind === 'node-pending') {
            cleanupPreview(active, 'invalid-configuration')
          }

          decodeNodeDragThreshold(value)

          return
        }

        nodeDragThreshold = decoded.value
      },
      { flush: 'sync' }
    )
    watch(
      graph,
      () => {
        const active = session.value

        if (active?.kind === 'node' || active?.kind === 'node-pending') {
          continueNode(active)
        }
      },
      { flush: 'sync' }
    )

    const admitNode = (
      node: FlowNode,
      currentTarget: HTMLElement,
      event: PointerEvent
    ): void => {
      if (stateDisposed || nodeDragThreshold === undefined) {
        return
      }

      const frame = nodeFrame(node.id)

      if (frame === undefined) {
        return
      }

      try {
        currentTarget.setPointerCapture(event.pointerId)

        if (!currentTarget.hasPointerCapture(event.pointerId)) {
          return
        }
      } catch (error) {
        recordFlowFailure(
          'Vue node capture failed',
          FlowSpan.browserPointerCapture,
          {
            [FlowAttribute.failureMessage]: String(error),
          }
        )

        return
      }

      const pending: DragSession = {
        kind: 'node-pending',
        threshold: nodeDragThreshold,
        pointerId: event.pointerId,
        node,
        element: currentTarget,
        captureTarget: currentTarget,
        startX: event.clientX,
        startY: event.clientY,
        originX: node.position.x,
        originY: node.position.y,
        frame,
        viewportStart: activeViewport.value,
      }

      session.value = pending

      if (pending.threshold === 0) {
        promoteNode(pending, event)
      }
    }

    // eslint-disable-next-line complexity -- One pointer entry admits node drags and handle connections under the interaction switches.
    const onPointerDown = (event: PointerEvent, node: FlowNode): void => {
      if (
        stateDisposed ||
        event.button !== 0 ||
        session.value !== undefined ||
        routeEditor.dragging()
      ) {
        return
      }

      const { target } = event

      if (!(target instanceof HTMLElement)) {
        return
      }

      const handle = target.closest<HTMLElement>('[data-handle-id]')

      const isExplicitNoDrag =
        target.closest('[data-flow-nodrag], [data-flow-no-drag]') !== null ||
        hasClassAncestor(target, props.noDragClassName)

      if (isExplicitNoDrag && handle === null) {
        return
      }

      const handleId = handle?.dataset.handleId

      // A node that cannot be dragged leaves the press to the pane, which
      // pans as in React Flow.
      if (
        handleId === undefined &&
        !isNodeDraggable(interactivity.value, node)
      ) {
        return
      }

      const { currentTarget } = event

      if (!(currentTarget instanceof HTMLElement)) {
        return
      }

      if (handleId === undefined) {
        if (
          !isNodePointerTargetAllowed(currentTarget, target) ||
          !insideDragHandle(currentTarget, target, node.dragHandle)
        ) {
          return
        }

        admitNode(node, currentTarget, event)

        return
      }

      const sourceHandle = flowNodeHandles(node).find(
        ({ id }) => id === handleId
      )

      if (
        sourceHandle === undefined ||
        connectionDragThreshold === undefined ||
        (clickConnection.value === undefined &&
          !isHandleConnectable(
            interactivity.value,
            node,
            sourceHandle,
            'start'
          ))
      ) {
        return
      }

      admitConnection(
        {
          kind: 'connection-pending',
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          threshold:
            props.editableEdges && pressedKeys.has('Space')
              ? 0
              : connectionDragThreshold,
          freeform: props.editableEdges && pressedKeys.has('Space'),
          captureTarget: currentTarget,
          from: {
            nodeId: node.id,
            handleId: sourceHandle.id,
            kind: sourceHandle.kind,
          },
        },
        event
      )
    }

    // eslint-disable-next-line complexity -- Validation, reconstruction and proposal retain their public callback ordering in one completion boundary.
    const finishReconnection = (
      claim: ConnectionClaim,
      targetNodeId: string,
      targetHandleId: string
    ): ConnectionResult => {
      const active = claim.source

      if (active.reconnect === undefined) {
        return { kind: 'rejected', reason: 'invalid-target' }
      }

      const edge = activeDocument.value.edges.find(
        ({ id }) => id === active.reconnect?.edgeId
      )

      const targetNode = activeDocument.value.nodes.find(
        ({ id }) => id === targetNodeId
      )

      const targetHandle = flowNodeHandles(targetNode).find(
        ({ id, kind }) =>
          id === targetHandleId &&
          (connectionMode.value === 'loose' ||
            kind === active.reconnect?.endpoint)
      )

      const resolved = edge && resolveEdgeHandles(activeDocument.value, edge)

      if (
        edge === undefined ||
        targetNode === undefined ||
        targetHandle === undefined ||
        resolved === undefined ||
        !isHandleConnectable(
          interactivity.value,
          targetNode,
          targetHandle,
          'end'
        )
      ) {
        return { kind: 'rejected', reason: 'invalid-target' }
      }

      const connection: FlowConnection =
        active.reconnect.endpoint === 'source'
          ? {
              source: targetNode.id,
              sourceHandle: targetHandle.id,
              target: resolved.targetNode.id,
              targetHandle: resolved.targetHandle.id,
            }
          : {
              source: resolved.sourceNode.id,
              sourceHandle: resolved.sourceHandle.id,
              target: targetNode.id,
              targetHandle: targetHandle.id,
            }

      const normalized = normalizeFlowConnection(
        activeDocument.value,
        connection,
        connectionMode.value
      )

      const validation = Effect.runSyncExit(
        validateFlowConnection(
          {
            ...activeDocument.value,
            edges: activeDocument.value.edges.filter(
              (candidate) => candidate.id !== edge.id
            ),
          },
          connection,
          connectionMode.value
        )
      )

      if (
        Exit.isFailure(validation) ||
        !validateConnectionAtBoundary(normalized, { kind: 'completion', claim })
      ) {
        return { kind: 'rejected', reason: 'invalid-target' }
      }

      if (!claimLive(claim)) {
        return { kind: 'cancelled', reason: 'superseded' }
      }

      const result = Effect.runSyncExit(
        reconnectFlowEdge(
          activeDocument.value,
          edge.id,
          active.reconnect.endpoint,
          targetNode.id,
          targetHandle.id,
          connectionMode.value
        )
      )

      if (Exit.isSuccess(result) && result.value !== undefined) {
        if (
          result.value.source !== normalized.source ||
          result.value.target !== normalized.target ||
          result.value.sourceHandle !== normalized.sourceHandle ||
          result.value.targetHandle !== normalized.targetHandle
        ) {
          return { kind: 'rejected', reason: 'invalid-target' }
        }

        const status =
          documentControlMode() === 'controlled' ? 'proposed' : 'accepted'

        emit('reconnect', { edge: result.value, connection: normalized })

        if (!claimLive(claim)) {
          return { kind: 'cancelled', reason: 'superseded' }
        }

        const currentEdge = activeDocument.value.edges.find(
          (candidate) => candidate.id === edge.id
        )

        const currentNormalized = normalizeFlowConnection(
          activeDocument.value,
          normalized,
          connectionMode.value
        )

        const currentValidation = Effect.runSyncExit(
          validateFlowConnection(
            {
              ...activeDocument.value,
              edges: activeDocument.value.edges.filter(
                (candidate) => candidate.id !== edge.id
              ),
            },
            normalized,
            connectionMode.value
          )
        )

        if (
          currentEdge === undefined ||
          !canReconnectEdge(currentEdge, active.reconnect.endpoint) ||
          Exit.isFailure(currentValidation) ||
          currentNormalized.source !== normalized.source ||
          currentNormalized.target !== normalized.target ||
          currentNormalized.sourceHandle !== normalized.sourceHandle ||
          currentNormalized.targetHandle !== normalized.targetHandle
        ) {
          return { kind: 'rejected', reason: 'invalid-target' }
        }

        publish({
          kind: 'edge-reconnect',
          edge: {
            ...result.value,
            source: normalized.source,
            sourceHandle: normalized.sourceHandle,
            target: normalized.target,
            targetHandle: normalized.targetHandle,
          },
        })

        return {
          kind: 'success',
          status,
          reason: 'valid-reconnection',
          connection: normalized,
        }
      }

      return { kind: 'rejected', reason: 'invalid-target' }
    }

    const proposeConnection = (
      claim: ConnectionClaim,
      sourceNode: FlowNode,
      sourceHandleId: string,
      targetNodeId: string,
      targetHandleId: string
    ): ConnectionResult => {
      const sourceHandle = flowNodeHandles(sourceNode).find(
        ({ id }) => id === sourceHandleId
      )

      const targetNode = activeDocument.value.nodes.find(
        ({ id }) => id === targetNodeId
      )

      const targetHandle = flowNodeHandles(targetNode).find(
        ({ id }) => id === targetHandleId
      )

      if (
        sourceHandle === undefined ||
        targetNode === undefined ||
        targetHandle === undefined
      ) {
        return { kind: 'rejected', reason: 'invalid-target' }
      }

      const validated = Effect.runSyncExit(
        connectionFromHandleGesture(
          {
            document: activeDocument.value,
            interactivity: interactivity.value,
            fromNodeId: sourceNode.id,
            fromHandleId: sourceHandle.id,
            toNodeId: targetNode.id,
            toHandleId: targetHandle.id,
          },
          connectionMode.value
        )
      )

      if (
        Exit.isFailure(validated) ||
        !validateConnectionAtBoundary(validated.value, {
          kind: 'completion',
          claim,
        })
      ) {
        return { kind: 'rejected', reason: 'invalid-target' }
      }

      if (!claimLive(claim)) {
        return { kind: 'cancelled', reason: 'superseded' }
      }

      const status =
        documentControlMode() === 'controlled' ? 'proposed' : 'accepted'

      emit('connect', validated.value)

      if (!claimLive(claim)) {
        return { kind: 'cancelled', reason: 'superseded' }
      }

      const rechecked = Effect.runSyncExit(
        connectionFromHandleGesture(
          {
            document: activeDocument.value,
            interactivity: interactivity.value,
            fromNodeId: sourceNode.id,
            fromHandleId: sourceHandle.id,
            toNodeId: targetNode.id,
            toHandleId: targetHandle.id,
          },
          connectionMode.value
        )
      )

      if (
        Exit.isFailure(rechecked) ||
        rechecked.value.source !== validated.value.source ||
        rechecked.value.target !== validated.value.target ||
        rechecked.value.sourceHandle !== validated.value.sourceHandle ||
        rechecked.value.targetHandle !== validated.value.targetHandle
      ) {
        return { kind: 'rejected', reason: 'invalid-target' }
      }

      let edge = nextConnectionEdge(activeDocument.value, validated.value)

      if (claim.source.freeform !== undefined) {
        const route = S.decodeUnknownExit(FlowEdgeRouteSchema)({
          mode: 'manual',
          points:
            validated.value.source === sourceNode.id &&
            validated.value.sourceHandle === sourceHandleId
              ? claim.source.freeform
              : claim.source.freeform.toReversed(),
        })

        if (Exit.isFailure(route)) {
          return { kind: 'rejected', reason: 'invalid-route' }
        }

        edge = { ...edge, route: route.value }
      }

      publish({
        kind: 'edge-add',
        edge: applyDefaultEdgeOptions(edge, defaultEdgeOptions.value),
      })

      return {
        kind: 'success',
        status,
        reason: 'valid-connection',
        connection: validated.value,
      }
    }

    const connectionTargetAt = (
      clientX: number,
      clientY: number,
      source: ConnectionData
    ): { readonly nodeId: string; readonly handleId: string } | undefined => {
      const targetElement = canvas.value?.ownerDocument
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>('[data-handle-id]')

      const directNodeId =
        targetElement?.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId

      const directHandleId = targetElement?.dataset.handleId

      if (
        directNodeId !== undefined &&
        directHandleId !== undefined &&
        canvas.value?.contains(targetElement ?? null)
      ) {
        return { nodeId: directNodeId, handleId: directHandleId }
      }

      const bounds = canvas.value?.getBoundingClientRect()

      if (bounds === undefined) {
        return
      }

      const viewport = activeViewport.value

      const point = {
        x: (clientX - bounds.left - viewport.x) / viewport.zoom,
        y: (clientY - bounds.top - viewport.y) / viewport.zoom,
      }

      const candidates = activeDocument.value.nodes.flatMap((node) => {
        const graphNode = graph.value.nodes.get(node.id)

        return flowNodeHandles(node).flatMap((handle) => {
          const reconnectSource = source.reconnect?.endpoint === 'source'

          if (
            reconnectSource &&
            connectionMode.value === 'strict' &&
            handle.kind !== 'source'
          ) {
            return []
          }

          const measured = measuredHandles.value.get(node.id)?.get(handle.id)

          if (graphNode === undefined || measured === undefined) {
            return []
          }

          return [
            {
              nodeId: node.id,
              handleId: handle.id,
              kind: handle.kind,
              center: {
                x: graphNode.absolutePosition.x + measured.offset.x,
                y: graphNode.absolutePosition.y + measured.offset.y,
              },
            },
          ]
        })
      })

      const target = nearestConnectionTarget({
        source: {
          source: source.sourceNode.id,
          sourceHandle: source.sourceHandle,
        },
        point,
        candidates,
        radius: connectionRadius.value / viewport.zoom,
        mode:
          source.reconnect?.endpoint === 'source' &&
          connectionMode.value === 'strict'
            ? 'loose'
            : connectionMode.value,
      })

      return target === undefined
        ? undefined
        : { nodeId: target.nodeId, handleId: target.handleId }
    }

    currentConnectionPreviewOwner = (): ConnectionPreviewOwner | undefined => {
      const active = session.value
      const retained = clickConnection.value

      if (stateDisposed) {
        return undefined
      }

      if (
        active?.kind === 'connection' &&
        connectionOwner(active).state.kind === 'live'
      ) {
        return active.route === 'pointer'
          ? { kind: 'physical', active }
          : { kind: 'keyboard', active }
      }

      return retained !== undefined && retained.owner.state.kind === 'live'
        ? { kind: 'retained', source: retained }
        : undefined
    }

    /** Handle connectability of a preview target, as React Flow's valid-handle check. */
    const targetConnectable = (
      active: ConnectionData,
      target: { readonly nodeId: string; readonly handleId: string } | undefined
    ): boolean => {
      if (target === undefined) {
        return true
      }

      if (active.reconnect === undefined) {
        return handleGestureConnectable(
          activeDocument.value,
          {
            fromNodeId: active.sourceNode.id,
            fromHandleId: active.sourceHandle,
            toNodeId: target.nodeId,
            toHandleId: target.handleId,
          },
          interactivity.value
        )
      }

      const node = activeDocument.value.nodes.find(
        ({ id }) => id === target.nodeId
      )

      const handle = flowNodeHandles(node).find(
        ({ id }) => id === target.handleId
      )

      return (
        node === undefined ||
        handle === undefined ||
        isHandleConnectable(interactivity.value, node, handle, 'end')
      )
    }

    connectionPreviewState = (
      initiating: ConnectionPreviewOwner
    ): ConnectionPreviewState | null => {
      if (!previewOwnerLive(initiating)) {
        return null
      }

      const active =
        initiating.kind === 'retained'
          ? initiating.source.data
          : initiating.active

      const bounds = canvas.value?.getBoundingClientRect()

      if (bounds === undefined) {
        if (!previewOwnerLive(initiating)) {
          return null
        }

        return active.reconnect === undefined
          ? {
              kind: 'connect',
              from: active.start,
              to: active.pointer,
              candidate: null,
              valid: null,
            }
          : {
              kind: 'reconnect',
              from: active.start,
              to: active.pointer,
              candidate: null,
              valid: null,
              edgeId: S.decodeUnknownSync(EdgeIdSchema)(
                active.reconnect.edgeId
              ),
              endpoint: active.reconnect.endpoint,
            }
      }

      const viewport = activeViewport.value

      const target = connectionTargetAt(
        bounds.left + active.pointer.x * viewport.zoom + viewport.x,
        bounds.top + active.pointer.y * viewport.zoom + viewport.y,
        active
      )

      const edge =
        active.reconnect === undefined
          ? undefined
          : activeDocument.value.edges.find(
              ({ id }) => id === active.reconnect?.edgeId
            )

      const resolvedReconnect =
        edge === undefined
          ? undefined
          : resolveEdgeHandles(activeDocument.value, edge)

      let candidate: FlowConnection | undefined

      if (target !== undefined) {
        const targetNodeId = S.decodeUnknownSync(NodeIdSchema)(target.nodeId)

        const targetHandleId = S.decodeUnknownSync(HandleIdSchema)(
          target.handleId
        )

        candidate =
          active.reconnect?.endpoint === 'source' &&
          edge !== undefined &&
          resolvedReconnect !== undefined
            ? {
                source: targetNodeId,
                sourceHandle: targetHandleId,
                target: edge.target,
                targetHandle: resolvedReconnect.targetHandle.id,
              }
            : {
                source: active.sourceNode.id,
                sourceHandle: active.sourceHandle,
                target: targetNodeId,
                targetHandle: targetHandleId,
              }
      }

      let normalized: FlowConnection | null = null
      let valid: boolean | null = null

      if (candidate !== undefined) {
        const result = Effect.runSyncExit(
          validateFlowConnection(
            activeDocument.value,
            candidate,
            connectionMode.value
          )
        )

        if (Exit.isSuccess(result) && !targetConnectable(active, target)) {
          normalized = result.value
          valid = false
        } else if (Exit.isSuccess(result)) {
          normalized = result.value
          valid = validateConnectionAtBoundary(result.value, {
            kind: 'preview',
            initiating,
          })
        } else {
          normalized = candidate
          valid = false
        }
      }

      if (!previewOwnerLive(initiating)) {
        return null
      }

      return active.reconnect === undefined
        ? {
            kind: 'connect',
            from: active.start,
            to: active.pointer,
            candidate: normalized,
            valid,
          }
        : {
            kind: 'reconnect',
            from: active.start,
            to: active.pointer,
            candidate: normalized,
            valid,
            edgeId: S.decodeUnknownSync(EdgeIdSchema)(active.reconnect.edgeId),
            endpoint: active.reconnect.endpoint,
          }
    }

    const resolveCompletion = (
      input: ConnectionCompletionInput
    ): CompletionRoute | undefined => {
      if (input.kind === 'retained-keyboard') {
        if (
          clickConnection.value !== input.source ||
          input.source.owner.state.kind !== 'live'
        ) {
          return undefined
        }

        return input
      }

      if (input.kind === 'pending') {
        const { pending } = input

        if (session.value !== pending) {
          return undefined
        }

        const candidate = pendingAsConnection(pending)

        if (
          candidate === undefined ||
          pending.kind === 'reconnection-pending'
        ) {
          return { kind: 'quiet', pending }
        }

        if (pending.sourceAssociation.kind === 'retained') {
          const { source } = pending.sourceAssociation

          if (
            clickConnection.value !== source ||
            source.owner.state.kind !== 'live'
          ) {
            return { kind: 'quiet', pending }
          }

          return {
            kind: 'retained-target',
            pending,
            candidate,
            source,
            target: connectionTargetAt(
              input.release.clientX,
              input.release.clientY,
              source.data
            ),
          }
        }

        return {
          kind: 'fresh-click',
          pending,
          candidate,
          target: connectionTargetAt(
            input.release.clientX,
            input.release.clientY,
            candidate
          ),
        }
      }

      if (input.kind === 'keyboard-reconnect') {
        return session.value === input.active ? input : undefined
      }

      const physicalView = session.value

      if (
        physicalView?.kind !== 'connection' ||
        physicalView.route !== 'pointer' ||
        physicalView.press !== input.active.press ||
        connectionOwner(physicalView) !== connectionOwner(input.active)
      ) {
        return undefined
      }

      const source =
        input.active.source.kind === 'retained'
          ? input.active.source.source.data
          : input.active

      const target =
        input.kind === 'pointer'
          ? connectionTargetAt(
              input.release.clientX,
              input.release.clientY,
              source
            )
          : input.target

      return { kind: 'physical', active: input.active, physicalView, target }
    }

    const completionAuthority = (
      route: Exclude<CompletionRoute, { kind: 'quiet' }>
    ) => {
      switch (route.kind) {
        case 'fresh-click': {
          return {
            source: route.candidate,
            owner: undefined,
            physicalView: route.pending,
            retainedView: undefined,
          }
        }

        case 'retained-target': {
          return {
            source: route.source.data,
            owner: route.source.owner,
            physicalView: route.pending,
            retainedView: route.source,
          }
        }

        case 'retained-keyboard': {
          return {
            source: route.source.data,
            owner: route.source.owner,
            physicalView: undefined,
            retainedView: route.source,
          }
        }

        case 'keyboard-reconnect': {
          return {
            source: route.active,
            owner: route.active.owner,
            physicalView: route.active,
            retainedView: undefined,
          }
        }

        case 'physical': {
          const retainedView =
            route.active.source.kind === 'retained'
              ? route.active.source.source
              : undefined

          return {
            source: retainedView?.data ?? route.active,
            owner: connectionOwner(route.active),
            physicalView: route.physicalView,
            retainedView,
          }
        }

        default: {
          const exhausted: never = route

          return exhausted
        }
      }
    }

    const retainSameHandle = (
      source: ConnectionData,
      owner: ConnectionOwner | undefined,
      physicalView: PendingConnection | ConnectionSession | undefined,
      freshPending: boolean
    ): void => {
      const lifecycle: ConnectionLifecycle = {
        kind: 'connect',
        activation: 'click',
        node: source.sourceNode,
        handleId: source.sourceHandle,
      }

      const transferOwner =
        owner ?? newConnectionOwner(lifecycle, { kind: 'retained' })

      if (transferOwner.state.kind !== 'live') {
        return
      }

      const previous = transferOwner.state
      transferOwner.state = {
        ...previous,
        residence: { kind: 'retained' },
        lifecycle,
      }

      const retained: RetainedSource = {
        kind: 'retained',
        owner: transferOwner,
        data: source,
      }

      if (
        physicalView !== undefined &&
        (physicalView.kind !== 'connection' || physicalView.route === 'pointer')
      ) {
        releaseConnectionPress(physicalView.press)
      }

      if (stateDisposed || transferOwner.state.kind !== 'live') {
        return
      }

      clickConnection.value = retained

      if (stateDisposed || transferOwner.state.kind !== 'live') {
        return
      }

      if (session.value === physicalView) {
        session.value = undefined
      }

      if (!previewOwnerLive({ kind: 'retained', source: retained })) {
        return
      }

      for (const port of takeOwnedObservationPorts(
        previous.autoPan,
        { kind: 'connection', owner: transferOwner },
        activeViewport.value,
        props.viewportMode === 'controlled' ? 'proposed' : 'accepted'
      )) {
        deliverTerminal(port)
      }

      if (!previewOwnerLive({ kind: 'retained', source: retained })) {
        return
      }

      if (freshPending) {
        emit('connectStart', {
          node: source.sourceNode,
          handleId: source.sourceHandle,
          activation: 'click',
        })
      }

      if (!previewOwnerLive({ kind: 'retained', source: retained })) {
        return
      }

      if (
        freshPending ||
        (previous.lifecycle.kind === 'connect' &&
          previous.lifecycle.activation !== 'click')
      ) {
        emit('clickConnectStart', {
          node: source.sourceNode,
          handleId: source.sourceHandle,
        })
      }
    }

    // eslint-disable-next-line complexity -- One domain entry distinguishes quiet release, same-handle transfer and terminal claims without advancing callback-sensitive semantic reads.
    const completeConnection = (input: ConnectionCompletionInput): void => {
      if (stateDisposed) {
        return
      }

      const route = resolveCompletion(input)

      if (route === undefined) {
        return
      }

      if (route.kind === 'quiet') {
        detachSessionView(route.pending)

        return
      }

      const { source, owner, physicalView, retainedView } =
        completionAuthority(route)

      const { target } = route
      const freshPending = route.kind === 'fresh-click'

      const sameHandle =
        target !== undefined &&
        target.nodeId === source.sourceNode.id &&
        target.handleId === source.sourceHandle &&
        source.reconnect === undefined

      if (freshPending && (!sameHandle || !props.connectOnClick)) {
        if (physicalView !== undefined) {
          detachSessionView(physicalView)
        }

        return
      }

      if (
        sameHandle &&
        source.freeform === undefined &&
        props.connectOnClick &&
        input.kind !== 'retained-keyboard'
      ) {
        retainSameHandle(source, owner, physicalView, freshPending)

        return
      }

      if (owner === undefined) {
        return
      }

      const claim = claimConnection(
        owner,
        source,
        target ?? null,
        physicalView,
        retainedView
      )

      if (claim === undefined) {
        return
      }

      if (input.kind === 'pointer' || input.kind === 'pending') {
        connectionReleases.set(claim, input.release)
      }

      clearClaimPresentation(claim)

      if (!claimLive(claim)) {
        return
      }

      if (claim.resources.autoPan !== null) {
        for (const port of takeOwnedObservationPorts(
          claim.resources.autoPan,
          { kind: 'connection', owner: claim.owner },
          activeViewport.value,
          props.viewportMode === 'controlled' ? 'proposed' : 'accepted'
        )) {
          deliverTerminal(port)
        }
      }

      if (!claimLive(claim)) {
        return
      }

      let result: ConnectionResult

      if (target === undefined) {
        result = { kind: 'rejected', reason: 'no-target' }
      } else if (sameHandle) {
        result = {
          kind: 'rejected',
          reason:
            input.kind === 'retained-keyboard'
              ? 'invalid-target'
              : 'click-connect-disabled',
        }
      } else if (source.reconnect === undefined) {
        result = proposeConnection(
          claim,
          source.sourceNode,
          source.sourceHandle,
          target.nodeId,
          target.handleId
        )
      } else {
        result = finishReconnection(claim, target.nodeId, target.handleId)
      }

      if (claimLive(claim)) {
        finishConnectionClaim(claim, result)
      }
    }

    const startReconnection = (
      edge: FlowEdge,
      endpoint: 'source' | 'target',
      event: PointerEvent
    ): void => {
      const captureTarget = event.currentTarget

      const currentEdge = activeDocument.value.edges.find(
        ({ id }) => id === edge.id
      )

      if (currentEdge === undefined) {
        return
      }

      const resolved = resolveEdgeHandles(activeDocument.value, currentEdge)

      if (
        stateDisposed ||
        routeEditor.dragging() ||
        event.button !== 0 ||
        currentEdge.selected !== true ||
        !canReconnectEdge(currentEdge, endpoint) ||
        session.value !== undefined ||
        clickConnection.value !== undefined ||
        resolved === undefined ||
        connectionDragThreshold === undefined ||
        !(captureTarget instanceof SVGElement)
      ) {
        return
      }

      admitConnection(
        {
          kind: 'reconnection-pending',
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          threshold: connectionDragThreshold,
          captureTarget,
          edgeId: currentEdge.id,
          endpoint,
          source: {
            nodeId: currentEdge.source,
            handleId: resolved.sourceHandle.id,
            kind: resolved.sourceHandle.kind,
          },
          target: {
            nodeId: currentEdge.target,
            handleId: resolved.targetHandle.id,
            kind: resolved.targetHandle.kind,
          },
        },
        event
      )
    }

    const pointerInFlow = (event: PointerEvent) => {
      const bounds = canvas.value?.getBoundingClientRect()

      if (bounds === undefined) {
        return { x: 0, y: 0 }
      }

      const viewport = activeViewport.value

      return {
        x: (event.clientX - bounds.left - viewport.x) / viewport.zoom,
        y: (event.clientY - bounds.top - viewport.y) / viewport.zoom,
      }
    }

    const resizeCandidate = (
      active: ResizeSession,
      event: PointerEvent
    ): NodeBoundsChange | undefined => {
      const point = pointerInFlow(event)

      const parent =
        active.node.parentId === undefined
          ? undefined
          : getFlowInternalNode(
              activeDocument.value,
              measurementState,
              active.node.parentId
            )

      const bounds =
        active.node.parentId !== undefined &&
        active.node.extent === 'parent' &&
        parent !== undefined
          ? {
              minX: 0,
              minY: 0,
              maxX: parent.width,
              maxY: parent.height,
            }
          : nodeExtent

      const result = calculateNodeResize({
        direction: active.direction,
        positionStart: active.position,
        sizeStart: active.size,
        delta: { x: point.x - active.start.x, y: point.y - active.start.y },
        minimumSize: { width: 40, height: 24 },
        bounds,
        childExtent: active.childExtent,
      })

      if (result.boundsIssues.length > 0) {
        return undefined
      }

      return {
        kind: 'node-bounds',
        nodeId: active.node.id,
        position: result.position,
        size: result.size,
        childPositions: activeDocument.value.nodes
          .filter((candidate) => candidate.parentId === active.node.id)
          .map((child) => ({
            nodeId: child.id,
            position: {
              x: child.position.x + result.childrenPositionDelta.x,
              y: child.position.y + result.childrenPositionDelta.y,
            },
          })),
      }
    }

    const keyboardResize = (
      node: FlowNode,
      direction: NodeResizeDirection,
      delta: { readonly x: number; readonly y: number },
      origin: Pick<KeyboardResizeSession, 'position' | 'size' | 'childExtent'>
    ): NodeBoundsChange | undefined => {
      const parent =
        node.parentId === undefined
          ? undefined
          : getFlowInternalNode(
              activeDocument.value,
              measurementState,
              node.parentId
            )

      const bounds =
        node.parentId !== undefined &&
        node.extent === 'parent' &&
        parent !== undefined
          ? {
              minX: 0,
              minY: 0,
              maxX: parent.width,
              maxY: parent.height,
            }
          : nodeExtent

      const result = calculateNodeResize({
        direction,
        positionStart: origin.position,
        sizeStart: origin.size,
        delta,
        minimumSize: { width: 40, height: 24 },
        bounds,
        childExtent: origin.childExtent,
      })

      if (result.boundsIssues.length > 0) {
        return
      }

      return {
        kind: 'node-bounds',
        nodeId: node.id,
        position: result.position,
        size: result.size,
        childPositions: activeDocument.value.nodes
          .filter((candidate) => candidate.parentId === node.id)
          .map((child) => ({
            nodeId: child.id,
            position: {
              x: child.position.x + result.childrenPositionDelta.x,
              y: child.position.y + result.childrenPositionDelta.y,
            },
          })),
      }
    }

    const startResize = (
      event: PointerEvent,
      node: FlowNode,
      element: HTMLElement,
      direction: NodeResizeDirection
    ): void => {
      if (stateDisposed) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const internal = getFlowInternalNode(
        activeDocument.value,
        measurementState,
        node.id
      )

      if (internal === undefined) {
        return
      }

      const captureTarget = event.currentTarget

      if (!(captureTarget instanceof HTMLElement)) {
        return
      }

      session.value = {
        kind: 'resize',
        pointerId: event.pointerId,
        captureTarget,
        node,
        element,
        direction,
        start: pointerInFlow(event),
        position: node.position,
        childExtent: graphResizeChildExtent(
          createFlowGraph(
            activeDocument.value,
            getFlowMeasuredNodes(activeDocument.value, measurementState),
            undefined,
            undefined,
            nodeExtent
          ),
          node.id
        ),
        size: {
          width: internal.width,
          height: internal.height,
        },
      }

      recordFlowTelemetry('Started Vue node resize', FlowSpan.nodeDragStart, {
        [FlowAttribute.nodeId]: node.id,
        [FlowAttribute.inputKind]: 'pointer',
        [FlowAttribute.controlMode]: documentControlMode(),
      })

      captureTarget.setPointerCapture?.(event.pointerId)
    }

    const prepareConnectionMove = (event: PointerEvent): boolean => {
      if (stateDisposed) {
        return false
      }

      const active = session.value

      if (
        active?.kind === 'connection-pending' ||
        active?.kind === 'reconnection-pending'
      ) {
        if (active.pointerId !== event.pointerId) {
          return false
        }

        if (pendingAsConnection(active) === undefined) {
          cleanupPreview(active)

          return false
        }

        if (
          !connectionDragActivated(
            active.threshold,
            active.startX,
            active.startY,
            event.clientX,
            event.clientY
          )
        ) {
          return false
        }

        return promoteConnection(active) !== undefined
      }

      return true
    }

    // eslint-disable-next-line complexity -- The native release entry dispatches the closed session union and preserves branch-specific terminal ordering.
    const onPointerUp = (event: PointerEvent): void => {
      if (stateDisposed) {
        return
      }

      trackClickTravel(event)
      const active = session.value

      if (
        active === undefined ||
        active.kind === 'keyboard-resize' ||
        active.pointerId !== event.pointerId
      ) {
        return
      }

      if (
        active.kind === 'connection-pending' ||
        active.kind === 'reconnection-pending'
      ) {
        completeConnection({ kind: 'pending', pending: active, release: event })

        return
      }

      if (active.kind === 'connection') {
        if (active.route === 'pointer') {
          completeConnection({ kind: 'pointer', active, release: event })
        }

        return
      }

      if (active.kind === 'pan') {
        if (active.owner.state.kind !== 'live') {
          return
        }

        // Pinned packages/system/src/xypanzoom/eventhandler.ts:238 ends with the last transform.
        const result = writeViewport(activeViewport.value, {
          kind: 'pan',
          active,
        })

        if (result === 'revoked' || active.owner.state.kind !== 'live') {
          return
        }

        const ports = takeOwnedObservationPorts(
          active.owner.state.observation,
          { kind: 'pan', owner: active.owner },
          activeViewport.value,
          'accepted'
        )

        active.owner.state = { kind: 'ended' }
        detachSessionView(active)

        if (!stateDisposed) {
          for (const port of ports) {
            deliverTerminal(port)
          }
        }

        return
      }

      if (active.kind === 'selection') {
        if (
          Math.hypot(
            event.clientX - active.startX,
            event.clientY - active.startY
          ) >= 2 &&
          (active.activated ||
            Math.hypot(
              event.clientX - active.startX,
              event.clientY - active.startY
            ) > active.threshold)
        ) {
          const end = pointerInFlow(event)

          const rect = {
            x: Math.min(active.start.x, end.x),
            y: Math.min(active.start.y, end.y),
            width: Math.abs(active.start.x - end.x),
            height: Math.abs(active.start.y - end.y),
          }

          const claim = takeSelection(active)

          if (claim === undefined || stateDisposed) {
            return
          }

          selectionBoundsActive.value = true
          publish(selectionInRect(graph.value, rect, props.selectionMode))
          finishSelection(
            claim,
            documentControlMode() === 'controlled' ? 'proposed' : 'accepted',
            'selection-complete'
          )
        } else {
          cleanupPreview(active, 'no-selection-movement')
        }

        return
      }

      if (active.kind === 'resize') {
        const change = resizeCandidate(active, event)
        cleanupPreview(active)

        if (change !== undefined) {
          publish(change)
        }

        return
      }

      if (!continueNode(active)) {
        return
      }

      if (active.kind === 'node-pending') {
        detachSessionView(active)

        return
      }

      const { x: dx, y: dy } = nodePointerDelta(active, event)

      if (!nodeStillValid(active)) {
        endNodeDrag(active, 'cancelled', 'node-frame-invalid')

        return
      }

      const nodeIds = new Set(activeDocument.value.nodes.map(({ id }) => id))

      const members = (active.members ?? []).filter(({ nodeId }) =>
        nodeIds.has(nodeId)
      )

      const step = constrainedDragStep(members, active.node, { x: dx, y: dy })
      const { positions } = step

      // Commit every drag member; the anchor is not one when its ancestor moves.
      const committed = members.flatMap(({ nodeId }) => {
        const position = positions.get(nodeId)

        return position === undefined ? [] : [{ nodeId, position }]
      })

      detachSessionView(active)
      dragStartGraph = undefined
      publishDragCommit(committed, step)

      endNodeDrag(
        active,
        documentControlMode() === 'controlled' ? 'proposed' : 'accepted',
        'drag-complete',
        positions
      )
    }

    /**
     * React `deleteKeyCode`: delete the selected nodes and edges that are
     * deletable, with the edges of deleted nodes, as one edit.
     */
    const deleteSelectedElements = async (): Promise<void> => {
      const document = activeDocument.value

      const prepared = await Effect.runPromise(
        prepareFlowDeleteCandidate(document, {
          nodeIds: document.nodes
            .filter(({ selected }) => selected === true)
            .map(({ id }) => id),
          edgeIds: document.edges
            .filter(({ selected }) => selected === true)
            .map(({ id }) => id),
        })
      )

      if (
        stateDisposed ||
        (prepared.candidate.nodes.length === 0 &&
          prepared.candidate.edges.length === 0)
      ) {
        return
      }

      try {
        await applyEdit({
          operations: [
            {
              kind: 'delete-elements',
              nodeIds: prepared.candidate.nodes.map(({ id }) => id),
              edgeIds: prepared.candidate.edges.map(({ id }) => id),
            },
          ],
        })
      } catch (error) {
        reportError(
          error instanceof Error ? error : new Error(String(error)),
          'delete'
        )
      }
    }

    const replayHistoryFromKeyboard = async (
      direction: 'undo' | 'redo'
    ): Promise<boolean> => {
      try {
        await replayHistory(direction)

        return true
      } catch {
        return false
      }
    }

    // eslint-disable-next-line complexity -- handles keyboard selection as one session lifecycle.
    const onKeyDown = (event: KeyboardEvent): void => {
      if (stateDisposed) {
        return
      }

      const path = event.composedPath()
      const target = path[0] ?? event.target

      if (
        target instanceof Element &&
        target.closest('.flow-vue-minimap') !== null
      ) {
        return
      }

      keyboardPressedCodes.set(event.key, event.code)
      pressedKeys.add(event.key)
      pressedKeys.add(event.code)

      if (
        props.editableEdges &&
        event.code === 'Space' &&
        !isInputDOMNode(event) &&
        ((target instanceof Element && canvas.value?.contains(target)) ||
          canvas.value?.matches(':hover'))
      ) {
        event.preventDefault()
      }

      if (routeEditor.keyboard(event)) {
        return
      }

      const active = session.value

      const eventCanvas = path.find(
        (element) =>
          element instanceof HTMLElement &&
          element.classList.contains('flow-vue-canvas')
      )

      const focusedOwner =
        canvas.value === undefined
          ? undefined
          : focusedCanvasOwners.get(canvas.value.ownerDocument)

      let ownsDelete = eventCanvas === canvas.value

      if (eventCanvas === undefined) {
        ownsDelete =
          focusedOwner?.isConnected === true
            ? focusedOwner === canvas.value
            : canvas.value?.ownerDocument.querySelectorAll('.flow-vue-canvas')
                .length === 1
      }

      if (
        (eventCanvas === canvas.value ||
          (eventCanvas === undefined &&
            focusedOwner === canvas.value &&
            canvas.value?.isConnected === true)) &&
        !event.defaultPrevented &&
        !event.isComposing &&
        !event.repeat &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable], .nokey') ===
          null
      ) {
        const key = event.key.toLowerCase()

        if ((key === 'c' || key === 'v') && !event.shiftKey) {
          event.preventDefault()
          event.stopPropagation()

          try {
            if (key === 'c') {
              clipboard.copySelection()
            } else {
              void (async () => {
                try {
                  await clipboard.pasteSelection()
                } catch (error) {
                  reportError(
                    error instanceof Error ? error : new Error(String(error)),
                    'edit'
                  )
                }
              })()
            }
          } catch (error) {
            reportError(
              error instanceof Error ? error : new Error(String(error)),
              'edit'
            )
          }

          return
        }

        if (key === 'z' || key === 'y') {
          event.preventDefault()
          event.stopPropagation()
          void replayHistoryFromKeyboard(
            key === 'y' || event.shiftKey ? 'redo' : 'undo'
          )

          return
        }
      }

      // The nearest canvas in the composed path owns a nested or shadow-DOM event.
      if (
        active === undefined &&
        !event.repeat &&
        !event.defaultPrevented &&
        ownsDelete &&
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable], .nokey') ===
          null &&
        deleteKeyMatches()
      ) {
        event.preventDefault()
        event.stopPropagation()
        void deleteSelectedElements()

        return
      }

      if (active?.kind === 'selection' && active.pointerId === -1) {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          cleanupPreview(active, 'escape')

          return
        }

        if (event.key === 'Enter') {
          event.preventDefault()
          event.stopPropagation()

          const rect = {
            x: Math.min(active.start.x, active.pointer.x),
            y: Math.min(active.start.y, active.pointer.y),
            width: Math.abs(active.start.x - active.pointer.x),
            height: Math.abs(active.start.y - active.pointer.y),
          }

          if (Math.hypot(rect.width, rect.height) >= 2) {
            const claim = takeSelection(active)

            if (claim === undefined || stateDisposed) {
              return
            }

            publish(selectionInRect(graph.value, rect, props.selectionMode))
            finishSelection(
              claim,
              documentControlMode() === 'controlled' ? 'proposed' : 'accepted',
              'selection-complete'
            )
          } else {
            cleanupPreview(active, 'selection-below-minimum-size')
          }

          return
        }

        const delta = keyboardResizeDelta(event.key, 5)

        if (delta !== undefined) {
          event.preventDefault()
          event.stopPropagation()

          const updated: OwnedSelection = {
            ...active,
            pointer: {
              x: active.pointer.x + delta.x,
              y: active.pointer.y + delta.y,
            },
          }

          session.value = updated

          if (
            stateDisposed ||
            session.value !== updated ||
            active.owner.state.kind !== 'live'
          ) {
            return
          }

          emit('selectionProgress', {
            rect: {
              x: Math.min(active.start.x, active.pointer.x + delta.x),
              y: Math.min(active.start.y, active.pointer.y + delta.y),
              width: Math.abs(active.start.x - active.pointer.x - delta.x),
              height: Math.abs(active.start.y - active.pointer.y - delta.y),
            },
          })

          if (
            stateDisposed ||
            session.value !== updated ||
            active.owner.state.kind !== 'live'
          ) {
            return
          }

          emit('selectionDrag', {
            rect: {
              x: Math.min(active.start.x, active.pointer.x + delta.x),
              y: Math.min(active.start.y, active.pointer.y + delta.y),
              width: Math.abs(active.start.x - active.pointer.x - delta.x),
              height: Math.abs(active.start.y - active.pointer.y - delta.y),
            },
          })
        }

        return
      }

      if (event.key === ' ' && event.shiftKey && target instanceof Element) {
        const nodeElement = target.closest<HTMLElement>('[data-node-id]')
        const nodeId = nodeElement?.dataset.nodeId

        const node = activeDocument.value.nodes.find(
          (candidate) => candidate.id === nodeId
        )

        const graphNode =
          node === undefined ? undefined : graph.value.nodes.get(node.id)

        if (
          nodeElement !== null &&
          nodeElement !== undefined &&
          graphNode !== undefined &&
          isNodeSelectable(interactivity.value, graphNode.node) &&
          target.closest(
            'input, textarea, select, button, a[href], [contenteditable="true"], [data-flow-nodrag], [data-flow-no-drag]'
          ) === null &&
          !hasClassAncestor(target, props.noDragClassName) &&
          session.value === undefined
        ) {
          event.preventDefault()
          event.stopPropagation()

          const start = {
            x: graphNode.absolutePosition.x + graphNode.dimensions.width / 2,
            y: graphNode.absolutePosition.y + graphNode.dimensions.height / 2,
          }

          const admitted: OwnedSelection = {
            kind: 'selection',
            threshold: 0,
            activated: true,
            owner: { state: { kind: 'live' } },
            pointerId: -1,
            captureTarget: nodeElement,
            startX: 0,
            startY: 0,
            start,
            pointer: start,
          }

          session.value = admitted

          if (stateDisposed || session.value !== admitted) {
            return
          }

          emit('selectionStart', { position: start, activation: 'keyboard' })

          if (
            stateDisposed ||
            session.value !== admitted ||
            admitted.owner.state.kind !== 'live'
          ) {
            return
          }

          emit('selectionDragStart', { position: start })

          recordFlowTelemetry(
            'Started Vue keyboard rectangle selection',
            FlowSpan.selectionRectStart,
            {
              [FlowAttribute.nodeId]: graphNode.node.id,
              [FlowAttribute.inputKind]: 'keyboard',
              [FlowAttribute.controlMode]: documentControlMode(),
            }
          )
        }

        return
      }

      const ownsKeyboardInput =
        target instanceof Element &&
        (target.closest(
          'input, textarea, select, button, a[href], [contenteditable="true"], [data-flow-nodrag], [data-flow-no-drag]'
        ) !== null ||
          hasClassAncestor(target, props.noDragClassName))

      const resizeControl =
        target instanceof Element &&
        target.closest('.flow-vue-resize-handle') !== null

      const connectionControl =
        target instanceof Element &&
        target.closest('.flow-vue-handle, .flow-vue-edge-reconnect-anchor') !==
          null

      if (
        event.key === 'Escape' &&
        (!ownsKeyboardInput || resizeControl || connectionControl)
      ) {
        cancelActiveSession('escape')
      }
    }

    const onWindowBlur = (): void => {
      if (stateDisposed) {
        return
      }

      pressedKeys.clear()
      keyboardPressedCodes.clear()
      finishKeyboardHistory()
      cancelActiveSession('blur')
    }

    watch(
      () =>
        [
          connectionMode.value,
          connectionRadius.value,
          props.autoPanOnConnect,
          props.editableEdges,
        ] as const,
      (current, previous) => {
        if (
          current.some((value, index) => value !== previous[index]) &&
          (session.value?.kind === 'connection' ||
            session.value?.kind === 'connection-pending' ||
            session.value?.kind === 'reconnection-pending')
        ) {
          cancelActiveSession('configuration-replacement')
        }
      },
      { flush: 'sync' }
    )

    const onWindowKeyUp = (event: KeyboardEvent): void => {
      if (stateDisposed) {
        return
      }

      if (keyboardHistoryGesture?.key === event.key) {
        finishKeyboardHistory()
      }

      keyboardPressedCodes.delete(event.key)

      if (event.key === 'Meta') {
        keyboardPressedCodes.clear()
      }

      pressedKeys.delete(event.key)
      pressedKeys.delete(event.code)
      const active = session.value

      if (active?.kind !== 'keyboard-resize' || active.key !== event.key) {
        return
      }

      cleanupPreview(active)
      publish(active.change)

      if (active.captureTarget.isConnected) {
        active.captureTarget.focus({ preventScroll: true })
      }
    }

    /**
     * A press on a node that cannot be dragged pans the viewport, as React
     * Flow marks only draggable nodes `nopan`. Handles, form controls and
     * no-drag content keep the press.
     */
    const pansFromNode = (target: Element): boolean => {
      const nodeId =
        target.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId

      const node = activeDocument.value.nodes.find(({ id }) => id === nodeId)

      return (
        node !== undefined &&
        !isNodeDraggable(interactivity.value, node) &&
        target.closest(
          '[data-handle-id], .flow-vue-resize-handle, button, input, select, textarea, a[href], [contenteditable="true"], [data-flow-nodrag], [data-flow-no-drag]'
        ) === null
      )
    }

    // eslint-disable-next-line complexity -- The public pointer admission entry preserves the existing selection, pan and interactive-target policies.
    const onCanvasPointerDown = (event: PointerEvent): void => {
      if (stateDisposed || routeEditor.dragging()) {
        return
      }

      const { target, currentTarget } = event

      if (
        session.value !== undefined ||
        !(target instanceof Element) ||
        !(currentTarget instanceof HTMLElement)
      ) {
        return
      }

      const nodeElement = target.closest<HTMLElement>('[data-node-id]')
      const onNode = nodeElement !== null

      if (event.button !== 1 && onNode && !pansFromNode(target)) {
        return
      }

      // Capturing on the node keeps its click and mouse events for callers.
      const panCaptureTarget = nodeElement ?? currentTarget

      const excludedFromPan =
        (event.button !== 1 ||
          target.closest('[data-node-id], .flow-vue-edge') === null) &&
        hasClassAncestor(target, props.noPanClassName)

      const excludedFromDrag = hasClassAncestor(target, props.noDragClassName)

      const panKeyActive =
        props.panActivationKeyCode !== undefined &&
        activationKeyIsPressed(props.panActivationKeyCode)

      // React Flow draws a selection box only while elements are selectable,
      // and only from the pane.
      const isSelection =
        event.button === 0 &&
        !onNode &&
        interactivity.value.elementsSelectable &&
        (selectionKeyHeld(event) ||
          (props.selectionOnDrag &&
            props.panOnDrag !== true &&
            !panKeyActive &&
            !(event.pointerType === 'touch' && props.panOnDrag !== false)))

      const panButtonEnabled =
        panKeyActive ||
        (Array.isArray(props.panOnDrag)
          ? event.pointerType === 'touch' ||
            props.panOnDrag.includes(event.button)
          : props.panOnDrag && event.button <= 1)

      if (
        excludedFromDrag ||
        (!isSelection &&
          (selectionKeyHeld(event) || excludedFromPan || !panButtonEnabled))
      ) {
        return
      }

      const bounds = currentTarget.getBoundingClientRect()
      const startX = event.clientX
      const startY = event.clientY

      const flowPoint = {
        x:
          (startX - bounds.left - activeViewport.value.x) /
          activeViewport.value.zoom,
        y:
          (startY - bounds.top - activeViewport.value.y) /
          activeViewport.value.zoom,
      }

      session.value = isSelection
        ? {
            kind: 'selection',
            threshold: selectionKeyHeld(event) ? 0 : props.paneClickDistance,
            activated: false,
            owner: { state: { kind: 'live' } },
            pointerId: event.pointerId,
            captureTarget: currentTarget,
            startX,
            startY,
            start: flowPoint,
            pointer: flowPoint,
          }
        : {
            kind: 'pan',
            owner: {
              state: {
                kind: 'live',
                observation: newViewportObservation(activeViewport.value),
              },
            },
            pointerId: event.pointerId,
            captureTarget: panCaptureTarget,
            startX,
            startY,
            viewportStart: activeViewport.value,
          }

      const admitted = session.value

      if (isSelection) {
        selectionBoundsActive.value = false
      }

      panCaptureTarget.setPointerCapture?.(event.pointerId)

      if (isSelection) {
        emit('selectionStart', { position: flowPoint, activation: 'pointer' })

        if (stateDisposed || session.value !== admitted) {
          return
        }

        emit('selectionDragStart', { position: flowPoint })
      }

      if (isSelection) {
        recordFlowTelemetry(
          'Started Vue pointer rectangle selection',
          FlowSpan.selectionRectStart,
          {
            [FlowAttribute.inputKind]: 'pointer',
            [FlowAttribute.controlMode]: documentControlMode(),
          }
        )
      }

      if (
        admitted?.kind === 'pan' &&
        admitted.owner.state.kind === 'live' &&
        !stateDisposed &&
        session.value === admitted
      ) {
        const reservation = acquireViewportWrite({
          kind: 'pan',
          active: admitted,
        })

        const write =
          reservation === undefined
            ? undefined
            : bindViewportObservation(reservation)

        if (write !== undefined) {
          beginViewportObservation(write)
        }
      }

      if (!onNode) {
        event.preventDefault()
      }
    }

    // eslint-disable-next-line complexity -- one wheel entry routes pinch, pan, zoom and page-scroll policy.
    const onWheel = (event: WheelEvent): void => {
      if (stateDisposed) {
        return
      }

      const { target } = event

      if (
        target instanceof Element &&
        (target.closest(
          'input, textarea, select, button, a[href], [contenteditable="true"], [data-flow-nodrag], [data-flow-no-drag]'
        ) !== null ||
          hasClassAncestor(target, props.noWheelClassName))
      ) {
        return
      }

      emit('paneScroll', {
        position: clientToFlow(event.clientX, event.clientY),
        deltaX: event.deltaX,
        deltaY: event.deltaY,
      })

      // React `zoomOnPinch`: a trackpad pinch arrives as Control + wheel,
      // unless Control is configured as the pan or zoom activation key.
      const pinch =
        event.ctrlKey &&
        props.panActivationKeyCode !== 'Control' &&
        props.zoomActivationKeyCode !== 'Control'

      // React `preventScrolling`: wheel input the pane ignores still does
      // not scroll the page unless asked to.
      const ignore = (): void => {
        if (props.preventScrolling) {
          event.preventDefault()
        }
      }

      if (pinch && !props.zoomOnPinch) {
        ignore()

        return
      }

      if (
        !pinch &&
        ((props.panOnScroll &&
          !activationKeyIsPressed(props.panActivationKeyCode)) ||
          (!props.panOnScroll &&
            props.zoomOnScroll &&
            !activationKeyIsPressed(props.zoomActivationKeyCode)))
      ) {
        ignore()

        return
      }

      if (!pinch && !props.panOnScroll && !props.zoomOnScroll) {
        ignore()

        return
      }

      const bounds = canvas.value?.getBoundingClientRect()

      if (bounds === undefined) {
        return
      }

      const anchor = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      }

      if (props.panOnScroll && !pinch) {
        const delta = {
          x:
            props.panOnScrollMode === 'vertical'
              ? 0
              : -event.deltaX * props.panOnScrollSpeed,
          y:
            props.panOnScrollMode === 'horizontal'
              ? 0
              : -event.deltaY * props.panOnScrollSpeed,
        }

        updateViewport(panViewport(activeViewport.value, delta))
      } else {
        const zoom = activeViewport.value.zoom * Math.exp(-event.deltaY * 0.001)
        updateViewport(
          zoomViewportAt(activeViewport.value, zoom, anchor, viewportLimits)
        )
      }

      event.preventDefault()
    }

    // eslint-disable-next-line complexity
    const onConnectionHandleKeydown = (
      node: FlowNode,
      handle: FlowHandle,
      event: KeyboardEvent
    ): void => {
      if (props.editableEdges && event.key === ' ') {
        event.preventDefault()

        return
      }

      if (
        stateDisposed ||
        (event.key !== 'Enter' && event.key !== ' ') ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const reconnect = session.value

      if (
        reconnect?.kind === 'connection-pending' ||
        reconnect?.kind === 'reconnection-pending'
      ) {
        return
      }

      if (
        reconnect?.kind === 'connection' &&
        reconnect.reconnect !== undefined
      ) {
        if (reconnect.route === 'keyboard') {
          completeConnection({
            kind: 'keyboard-reconnect',
            active: reconnect,
            target: { nodeId: node.id, handleId: handle.id },
          })
        } else {
          completeConnection({
            kind: 'physical-reconnect-target',
            active: { ...reconnect, reconnect: reconnect.reconnect },
            target: { nodeId: node.id, handleId: handle.id },
          })
        }

        return
      }

      if (!props.connectOnClick && clickConnection.value === undefined) {
        return
      }

      const pending = clickConnection.value

      if (pending !== undefined) {
        completeConnection({
          kind: 'retained-keyboard',
          source: pending,
          target: { nodeId: node.id, handleId: handle.id },
        })

        return
      }

      if (
        (connectionMode.value === 'strict' && handle.kind !== 'source') ||
        session.value !== undefined ||
        !isHandleConnectable(interactivity.value, node, handle, 'start')
      ) {
        return
      }

      const graphNode = graph.value.nodes.get(node.id)
      let measured = measuredHandles.value.get(node.id)?.get(handle.id)

      if (measured === undefined) {
        const element = nodeElements.get(node.id)

        if (element !== undefined) {
          measureNodeHandles(node, element)
          measured = measuredHandles.value.get(node.id)?.get(handle.id)
        }
      }

      if (graphNode === undefined || measured === undefined) {
        return
      }

      const start = edgeAttachmentPosition(
        graphNode.absolutePosition,
        handle,
        measured
      )

      if (!(event.currentTarget instanceof HTMLElement)) {
        return
      }

      const data: ConnectionData = {
        kind: 'connection',
        pointerId: -1,
        captureTarget: event.currentTarget,
        sourceNode: node,
        sourceHandle: handle.id,
        start,
        pointer: start,
      }

      const retained: RetainedSource = {
        kind: 'retained',
        data,
        owner: newConnectionOwner(
          { kind: 'connect', activation: 'click', node, handleId: handle.id },
          { kind: 'retained' }
        ),
      }

      clickConnection.value = retained

      if (!previewOwnerLive({ kind: 'retained', source: retained })) {
        return
      }

      emit('connectStart', {
        node,
        handleId: handle.id,
        activation: 'keyboard',
      })

      if (!previewOwnerLive({ kind: 'retained', source: retained })) {
        return
      }

      emit('clickConnectStart', { node, handleId: handle.id })

      if (!previewOwnerLive({ kind: 'retained', source: retained })) {
        return
      }

      recordFlowTelemetry(
        'Started Vue click connection',
        FlowSpan.connectionStart,
        {
          [FlowAttribute.nodeId]: node.id,
          [FlowAttribute.handleId]: handle.id,
          [FlowAttribute.inputKind]: 'keyboard',
          [FlowAttribute.controlMode]: documentControlMode(),
        }
      )
    }

    // Unchanged renderer props keep their identity, so pan and zoom renders
    // do not re-render every custom node and edge.
    const nodeRendererPropsCache = createRendererPropsCache(
      sameFlowNodeRendererProps
    )

    const edgeRendererPropsCache = createRendererPropsCache(
      sameFlowEdgeRendererProps
    )

    watch(activeDocument, (next) => {
      nodeRendererPropsCache.retain(new Set(next.nodes.map(({ id }) => id)))
      edgeRendererPropsCache.retain(new Set(next.edges.map(({ id }) => id)))
    })

    const nodeRendererProps = (
      node: FlowNode,
      position: XYPosition,
      resizePreview: KeyboardResizeSession | undefined
    ): FlowNodeRendererProps =>
      nodeRendererPropsCache.keep(
        node.id,
        flowNodeRendererProps(node, {
          positionAbsolute: position,
          dragging:
            session.value?.kind === 'node' &&
            dragPreview.value?.members.has(node.id) === true,
          size:
            resizePreview?.change.size ??
            measuredNodes.value.get(node.id) ??
            node.size,
        })
      )

    /** Preview state is only computed when a renderer or line type consumes it. */
    const connectionLinePreview = (
      owner: ConnectionPreviewOwner | undefined
    ): ConnectionPreviewState | null =>
      owner === undefined ||
      (props.connectionPreview === undefined &&
        props.connectionLineType === undefined)
        ? null
        : connectionPreviewState(owner)

    const renderConnectionLine = (
      connection: ConnectionData,
      renderPreview: ConnectionPreviewState | null
    ): VNode[] => {
      const lineProps =
        renderPreview === null
          ? undefined
          : flowConnectionLineProps({
              graph: graph.value,
              preview: renderPreview,
              connectionLineType: props.connectionLineType ?? 'straight',
              origin: {
                nodeId: connection.sourceNode.id,
                handleId: connection.sourceHandle,
              },
            })

      if (props.connectionPreview === undefined) {
        const typedPath =
          props.connectionLineType === undefined ? undefined : lineProps?.path

        return [
          h('path', {
            class: 'flow-vue-connection-preview',
            'data-testid': 'flow-connection-preview',
            style: flowVueStyle(props.connectionLineStyle),
            'data-connection-line-type': props.connectionLineType,
            d:
              connection.freeform === undefined
                ? (typedPath ??
                  straightEdgePath(connection.start, connection.pointer))
                : getManualRouteGeometry(
                    connection.start,
                    connection.pointer,
                    connection.freeform
                  ).path,
          }),
        ]
      }

      if (renderPreview === null) {
        return []
      }

      const declared =
        lineProps === undefined
          ? undefined
          : declaredRendererProps(props.connectionPreview, lineProps)

      return [
        h(props.connectionPreview, { ...declared, preview: renderPreview }),
      ]
    }

    // eslint-disable-next-line complexity -- One node render resolves preview geometry, renderer props and its controls.
    const renderNode = (node: FlowNode): VNode | null => {
      if (graph.value.nodes.get(node.id)?.hidden === true || !visible(node)) {
        return null
      }

      const activeKeyboardResize =
        session.value?.kind === 'keyboard-resize' &&
        session.value.node.id === node.id
          ? session.value
          : undefined

      const position =
        resizePreviewPosition(activeKeyboardResize?.change) ??
        nodePosition(node)

      const size =
        activeKeyboardResize?.change.size ??
        dragPreview.value?.graph?.nodes.get(node.id)?.node.size ??
        node.size

      const Node: NodeVisual =
        props.nodeTypes?.[node.type ?? 'default'] ??
        props.nodeComponent ??
        DefaultNode

      const nodeSlots =
        slots.node === undefined
          ? undefined
          : { default: () => slots.node?.({ node }) }

      const handleChildren = flowNodeHandles(node).map((handle) =>
        h('button', {
          key: handle.id,
          type: 'button',
          class: [
            'flow-vue-handle',
            `flow-vue-handle-${handle.side}`,
            {
              // React Flow's Handle classes, for styling and tests.
              connectable:
                handle.connectable ??
                isNodeConnectable(interactivity.value, node),
              connectablestart: handle.connectableStart !== false,
              connectableend: handle.connectableEnd !== false,
            },
          ],
          'data-handle-id': handle.id,
          'data-handle-kind': handle.kind,
          'aria-label':
            props.ariaLabelConfig?.['handle.ariaLabel'] ??
            `${handle.kind} handle ${handle.id}`,
          onKeydown: (event: KeyboardEvent) =>
            onConnectionHandleKeydown(node, handle, event),
        })
      )

      const resizeChildren =
        props.nodesResizable &&
        node.selected === true &&
        !nodeResizers.has(node.id)
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
              h('button', {
                key: `resize-${direction}`,
                type: 'button',
                class: [
                  'flow-vue-resize-handle',
                  `flow-vue-resize-${direction}`,
                ],
                'data-testid': 'flow-node-resize-handle',
                'data-direction': direction,
                'aria-label': `Resize ${node.label} from ${direction.replaceAll('-', ' ')}`,
                onPointerdown: (event: PointerEvent) => {
                  const element = nodeElements.get(node.id)

                  if (element !== undefined) {
                    startResize(event, node, element, direction)
                  }
                },
                onKeydown: (event: KeyboardEvent) => {
                  if (
                    node.selected !== true ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.altKey
                  ) {
                    return
                  }

                  const step = event.shiftKey ? 20 : 5
                  const delta = keyboardResizeDelta(event.key, step)

                  if (delta === undefined) {
                    return
                  }

                  event.preventDefault()
                  event.stopPropagation()

                  const active = session.value

                  if (active?.kind === 'keyboard-resize') {
                    if (active.key !== event.key) {
                      return
                    }

                    const repeatDelta = keyboardResizeDelta(
                      event.key,
                      active.step
                    )

                    if (repeatDelta === undefined) {
                      return
                    }

                    const cumulativeDelta = {
                      x: active.delta.x + repeatDelta.x,
                      y: active.delta.y + repeatDelta.y,
                    }

                    const change = keyboardResize(
                      active.node,
                      active.direction,
                      cumulativeDelta,
                      active
                    )

                    if (change !== undefined) {
                      const updated = {
                        ...active,
                        delta: cumulativeDelta,
                        change,
                      }

                      session.value = updated
                      previewNodeBounds(updated.element, change)
                    }

                    return
                  }

                  if (active !== undefined || event.repeat) {
                    return
                  }

                  const element = nodeElements.get(node.id)

                  const internal = getFlowInternalNode(
                    activeDocument.value,
                    measurementState,
                    node.id
                  )

                  const initialSize =
                    internal === undefined
                      ? undefined
                      : { width: internal.width, height: internal.height }

                  if (
                    element === undefined ||
                    initialSize === undefined ||
                    !(event.currentTarget instanceof HTMLElement)
                  ) {
                    return
                  }

                  const origin = {
                    position: node.position,
                    size: initialSize,
                    childExtent: graphResizeChildExtent(
                      createFlowGraph(
                        activeDocument.value,
                        getFlowMeasuredNodes(
                          activeDocument.value,
                          measurementState
                        ),
                        undefined,
                        undefined,
                        nodeExtent
                      ),
                      node.id
                    ),
                  }

                  const change = keyboardResize(node, direction, delta, origin)

                  if (change !== undefined) {
                    const keyboardSession: KeyboardResizeSession = {
                      kind: 'keyboard-resize',
                      pointerId: -1,
                      captureTarget: event.currentTarget,
                      node,
                      element,
                      direction,
                      ...origin,
                      key: event.key,
                      step,
                      delta,
                      change,
                    }

                    session.value = keyboardSession

                    recordFlowTelemetry(
                      'Started Vue keyboard node resize',
                      FlowSpan.nodeDragStart,
                      {
                        [FlowAttribute.nodeId]: node.id,
                        [FlowAttribute.inputKind]: 'keyboard',
                        [FlowAttribute.controlMode]: documentControlMode(),
                      }
                    )
                    previewNodeBounds(element, change)
                  }
                },
              })
            )
          : []

      const style: NodePositionStyle = {
        left: `${position.x}px`,
        top: `${position.y}px`,
      }

      if (size !== undefined) {
        style.width = `${size.width}px`
        style.height = `${size.height}px`
      }

      const focusable = node.focusable ?? props.nodesFocusable

      return h(
        'div',
        {
          key: node.id,
          class: [
            'flow-vue-node',
            {
              selected: node.selected === true,
              draggable: isNodeDraggable(interactivity.value, node),
              selectable: isNodeSelectable(interactivity.value, node),
              [props.noPanClassName]: isNodeDraggable(
                interactivity.value,
                node
              ),
            },
            flowClassNames(node.className),
          ],
          'data-testid': 'flow-node',
          'data-node-id': node.id,
          'data-height-declared':
            size !== undefined || node.style?.height !== undefined,
          tabindex: focusable ? 0 : undefined,
          // React `NodeWrapper` roles and labels; a node's own
          // `ariaDescription` replaces the shared description.
          role: node.ariaRole ?? (focusable ? 'group' : undefined),
          'aria-roledescription': 'node',
          'aria-label': node.ariaLabel,
          'aria-description': node.ariaDescription || undefined,
          'aria-describedby':
            props.disableKeyboardA11y || Boolean(node.ariaDescription)
              ? undefined
              : `${canvasId}-node-description`,
          ref: nodeRef(node),
          // React order: z-index, then the node style, then position and size.
          style: [
            {
              zIndex: stacking.value.nodes.get(node.id) ?? 0,
              pointerEvents:
                isNodeDraggable(interactivity.value, node) ||
                isNodeSelectable(interactivity.value, node) ||
                hasNodePointerHandlers()
                  ? 'all'
                  : 'none',
            },
            flowVueStyle(node.style),
            style,
          ],
          onPointerdown: (event: PointerEvent) => {
            nodePress = {
              x: event.clientX,
              y: event.clientY,
              document: activeDocument.value,
              distance: 0,
              onControl: isNodeControl(event.target, event.currentTarget),
            }
            onPointerDown(event, node)
          },
          onMousedown: (event: MouseEvent) =>
            emit('nodeMouseDown', node, event),
          onMouseup: (event: MouseEvent) => emit('nodeMouseUp', node, event),
          onMousemove: (event: MouseEvent) =>
            props.onNodeMouseMove?.(node, event),
          onMouseenter: (event: MouseEvent) =>
            props.onNodeMouseEnter?.(node, event),
          onMouseleave: (event: MouseEvent) =>
            props.onNodeMouseLeave?.(node, event),
          onClick: (event: MouseEvent) => {
            // React `nodeClickDistance`: a press that travelled further is a
            // drag, not a click.
            if (
              isNodeDraggable(interactivity.value, node) &&
              nodePress !== undefined &&
              nodePress.distance > props.nodeClickDistance
            ) {
              nodePress = undefined

              return
            }

            props.onNodeClick?.(node, event)
            selectNodeOnClick(node, event)
          },
          onFocus: focusable
            ? (event: FocusEvent) => panToFocusedNode(node, event)
            : undefined,
          onDblclick: (event: MouseEvent) =>
            emit('nodeDoubleClick', node, event),
          onContextmenu: (event: MouseEvent) =>
            emit('nodeContextMenu', node, event),
          onKeydown: focusable
            ? (event: KeyboardEvent) => {
                if (
                  event.target !== event.currentTarget ||
                  props.disableKeyboardA11y
                ) {
                  return
                }

                if (keyboardResizeDelta(event.key, 1) !== undefined) {
                  moveSelectedNodesByKey(node, event)

                  return
                }

                if (
                  !isNodeSelectable(interactivity.value, node) ||
                  (event.key !== ' ' && event.key !== 'Enter')
                ) {
                  return
                }

                event.preventDefault()

                const nodeIds = activeDocument.value.nodes
                  .filter(
                    (candidate) =>
                      isNodeSelectable(interactivity.value, candidate) &&
                      (candidate.id === node.id
                        ? candidate.selected !== true
                        : candidate.selected === true)
                  )
                  .map(({ id }) => id)

                const edgeIds = activeDocument.value.edges
                  .filter((edge) => edge.selected === true)
                  .map(({ id }) => id)

                publish({ kind: 'selection-set', nodeIds, edgeIds })
              }
            : undefined,
        },
        [
          h(
            NodeWithIdContext,
            {
              node,
              visual: Node,
              key: `visual-${node.id}`,
              rendererProps: nodeRendererProps(
                node,
                position,
                activeKeyboardResize
              ),
            },
            nodeSlots
          ),
          ...handleChildren,
          ...resizeChildren,
        ]
      )
    }

    const renderMarkers = (): VNode[] => {
      const options = { scope: canvasId }

      if (props.defaultMarkerColor !== undefined) {
        Object.assign(options, { defaultColor: props.defaultMarkerColor })
      }

      return collectFlowEdgeMarkers(
        activeDocument.value.edges.map(withEdgeDefaults),
        options
      ).map(renderFlowEdgeMarker)
    }

    const resolveRenderedEdge = (edge: FlowEdge) => {
      const resolved = resolveEdgeHandles(activeDocument.value, edge)

      if (resolved === undefined) {
        return
      }

      const sourceNode = renderGraphNode(resolved.sourceNode.id)
      const targetNode = renderGraphNode(resolved.targetNode.id)

      const sourceMeasured = measuredHandles.value
        .get(resolved.sourceNode.id)
        ?.get(resolved.sourceHandle.id)

      const targetMeasured = measuredHandles.value
        .get(resolved.targetNode.id)
        ?.get(resolved.targetHandle.id)

      if (
        sourceNode === undefined ||
        targetNode === undefined ||
        sourceMeasured === undefined ||
        targetMeasured === undefined
      ) {
        return
      }

      const sourceAnchor = edgeAttachmentPosition(
        sourceNode.absolutePosition,
        resolved.sourceHandle,
        sourceMeasured
      )

      const targetAnchor = edgeAttachmentPosition(
        targetNode.absolutePosition,
        resolved.targetHandle,
        targetMeasured
      )

      return {
        path:
          routeEditor.points(edge) === undefined
            ? edgePath(
                edge.path,
                sourceAnchor,
                targetAnchor,
                resolved.sourceHandle.side,
                resolved.targetHandle.side
              )
            : getManualRouteGeometry(
                sourceAnchor,
                targetAnchor,
                routeEditor.points(edge) ?? []
              ).path,
        sourceNode,
        targetNode,
        sourceAnchor,
        targetAnchor,
        sourceHandle: resolved.sourceHandle,
        targetHandle: resolved.targetHandle,
      }
    }

    /** Paths custom edges draw, which their hit targets follow. */
    const edgeInteractionPaths = shallowReactive(new Map<string, string>())

    provide(FlowEdgeInteractionRegistryKey, {
      set: (edgeId, path) => {
        if (path === undefined) {
          edgeInteractionPaths.delete(edgeId)
        } else if (edgeInteractionPaths.get(edgeId) !== path) {
          edgeInteractionPaths.set(edgeId, path)
        }
      },
    })

    const renderEdgeHitTarget = (
      edge: FlowEdge,
      path: string,
      sourceLabel: string,
      targetLabel: string
    ): VNode =>
      h('path', {
        class: 'flow-vue-edge-hit-target',
        'data-testid': 'flow-edge-hit-target',
        'data-flow-edge-hit': edge.id,
        d: path,
        fill: 'none',
        stroke: 'rgba(0, 0, 0, 0.001)',
        'stroke-width': edge.interactionWidth ?? 20,
        'pointer-events': 'inherit',
        tabindex: (edge.focusable ?? props.edgesFocusable) ? 0 : -1,
        role: edge.ariaRole ?? (edge.selectable === false ? 'img' : 'button'),
        'aria-roledescription': 'edge',
        'aria-describedby': `${canvasId}-edge-description`,
        'aria-label':
          edge.ariaLabel ?? `Edge from ${sourceLabel} to ${targetLabel}`,
        onPointerdown: (event: PointerEvent) => {
          if (event.button === 0) {
            event.preventDefault()
            props.onEdgeClick?.(edge, event)
            awaitEdgeClick(edge, event)
          }
        },
        onMousedown: (event: MouseEvent) => emit('edgeMouseDown', edge, event),
        onMouseup: (event: MouseEvent) => emit('edgeMouseUp', edge, event),
        onMousemove: (event: MouseEvent) => emit('edgeMouseMove', edge, event),
        onMouseenter: (event: MouseEvent) =>
          emit('edgeMouseEnter', edge, event),
        onMouseleave: (event: MouseEvent) =>
          emit('edgeMouseLeave', edge, event),
        onDblclick: (event: MouseEvent) => {
          routeEditor.insert(edge, event)
          emit('edgeDoubleClick', edge, event)
        },
        onContextmenu: (event: MouseEvent) =>
          emit('edgeContextMenu', edge, event),
        onKeydown: (event: KeyboardEvent) => {
          if (props.editableEdges && event.key === ' ') {
            event.preventDefault()

            return
          }

          if (props.editableEdges && event.key === 'Enter') {
            const geometry = resolveRenderedEdge(edge)

            if (geometry !== undefined) {
              const points = routeEditor.points(edge)

              const position =
                points === undefined
                  ? edgeLabelPosition(
                      geometry.sourceAnchor,
                      geometry.targetAnchor,
                      edge.path ?? 'straight',
                      geometry.sourceHandle.side,
                      geometry.targetHandle.side
                    )
                  : getManualRouteGeometry(
                      geometry.sourceAnchor,
                      geometry.targetAnchor,
                      points
                    ).label

              event.preventDefault()
              event.stopPropagation()
              routeEditor.insertPoint(edge, position)
            }

            return
          }

          if (
            !props.disableKeyboardA11y &&
            (event.key === 'Enter' || event.key === ' ')
          ) {
            event.preventDefault()
            event.stopPropagation()
            props.onEdgeClick?.(edge, event)
          }
        },
      })

    const edgeMarkers = (edge: FlowEdge) => {
      const markerUrl = (marker: FlowEdge['markerStart']) => {
        const resolved = resolveFlowEdgeMarker(marker, {
          scope: canvasId,
          defaultColor: edge.stroke ?? props.defaultMarkerColor,
        })

        return resolved === undefined ? undefined : `url(#${resolved.id})`
      }

      return {
        markerStart: markerUrl(edge.markerStart),
        markerEnd: markerUrl(edge.markerEnd),
      }
    }

    const reconnectAnchorPosition = (
      edge: FlowEdge,
      endpoint: 'source' | 'target',
      anchor: { readonly x: number; readonly y: number }
    ) => {
      const resolved = resolveEdgeHandles(activeDocument.value, edge)

      const handle =
        endpoint === 'source' ? resolved?.sourceHandle : resolved?.targetHandle

      if (handle === undefined) {
        return anchor
      }

      const offset = reconnectAnchorOffset(handle.side, props.reconnectRadius)

      return { x: anchor.x + offset.x, y: anchor.y + offset.y }
    }

    const renderEdgeReconnectControls = (
      edge: FlowEdge,
      geometry: ReturnType<typeof resolveRenderedEdge>
    ): VNode[] => {
      if (
        geometry === undefined ||
        edge.hidden === true ||
        geometry.sourceNode.hidden === true ||
        geometry.targetNode.hidden === true
      ) {
        return []
      }

      const controls: VNode[] = routeEditor.render(edge)

      if (edge.selected === true) {
        for (const endpoint of ['source', 'target'] as const) {
          if (
            (edge.reconnectable === undefined && !props.edgesReconnectable) ||
            !canReconnectEdge(edge, endpoint)
          ) {
            continue
          }

          const anchor =
            endpoint === 'source'
              ? geometry?.sourceAnchor
              : geometry?.targetAnchor

          if (anchor === undefined) {
            continue
          }

          controls.push(
            h('circle', {
              key: `reconnect-${endpoint}`,
              class: 'flow-vue-edge-reconnect-anchor',
              'data-testid': 'flow-edge-reconnect-anchor',
              'data-endpoint': endpoint,
              'data-edge-endpoint': endpoint,
              'data-edge-id': edge.id,
              tabindex: 0,
              role: 'button',
              'aria-label': `Reconnect ${endpoint} of edge ${edge.id}`,
              cx: reconnectAnchorPosition(edge, endpoint, anchor).x,
              cy: reconnectAnchorPosition(edge, endpoint, anchor).y,
              r: props.reconnectRadius,
              onPointerdown: (event: PointerEvent) =>
                startReconnection(edge, endpoint, event),
              // eslint-disable-next-line complexity, no-loop-func -- one callback coordinates this block-scoped edge's keyboard lifecycle.
              onKeydown: (event: KeyboardEvent) => {
                if (
                  stateDisposed ||
                  (event.key !== 'Enter' && event.key !== ' ') ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.altKey ||
                  session.value !== undefined
                ) {
                  return
                }

                event.preventDefault()
                event.stopPropagation()

                const captureTarget = event.currentTarget

                const resolved = resolveEdgeHandles(activeDocument.value, edge)

                const graphSourceNode = graph.value.nodes.get(edge.source)
                const graphTargetNode = graph.value.nodes.get(edge.target)

                if (
                  !(captureTarget instanceof SVGElement) ||
                  resolved === undefined ||
                  graphSourceNode === undefined ||
                  graphTargetNode === undefined
                ) {
                  return
                }

                let sourceMeasured = measuredHandles.value
                  .get(edge.source)
                  ?.get(resolved.sourceHandle.id)

                let targetMeasured = measuredHandles.value
                  .get(edge.target)
                  ?.get(resolved.targetHandle.id)

                if (
                  sourceMeasured === undefined ||
                  targetMeasured === undefined
                ) {
                  const sourceDocumentNode = activeDocument.value.nodes.find(
                    ({ id }) => id === edge.source
                  )

                  const targetDocumentNode = activeDocument.value.nodes.find(
                    ({ id }) => id === edge.target
                  )

                  const sourceElement = nodeElements.get(edge.source)
                  const targetElement = nodeElements.get(edge.target)

                  if (
                    sourceDocumentNode !== undefined &&
                    sourceElement !== undefined
                  ) {
                    measureNodeHandles(sourceDocumentNode, sourceElement)
                  }

                  if (
                    targetDocumentNode !== undefined &&
                    targetElement !== undefined
                  ) {
                    measureNodeHandles(targetDocumentNode, targetElement)
                  }

                  sourceMeasured = measuredHandles.value
                    .get(edge.source)
                    ?.get(resolved.sourceHandle.id)
                  targetMeasured = measuredHandles.value
                    .get(edge.target)
                    ?.get(resolved.targetHandle.id)
                }

                if (
                  sourceMeasured === undefined ||
                  targetMeasured === undefined
                ) {
                  return
                }

                const sourceAnchor = edgeAttachmentPosition(
                  graphSourceNode.absolutePosition,
                  resolved.sourceHandle,
                  sourceMeasured
                )

                const targetAnchor = edgeAttachmentPosition(
                  graphTargetNode.absolutePosition,
                  resolved.targetHandle,
                  targetMeasured
                )

                const start =
                  endpoint === 'source' ? targetAnchor : sourceAnchor

                const handleSignature = activeDocument.value.nodes
                  .map(
                    (candidate) =>
                      `${candidate.id}:${flowNodeHandles(candidate)
                        .map(({ kind, id }) => `${kind}:${id}`)
                        .toSorted()
                        .join(',')}`
                  )
                  .join('|')

                session.value = {
                  kind: 'connection',
                  route: 'keyboard',
                  owner: newConnectionOwner(
                    {
                      kind: 'reconnect',
                      activation: 'keyboard',
                      edge,
                      endpoint,
                    },
                    { kind: 'keyboard' }
                  ),
                  pointerId: -1,
                  captureTarget,
                  sourceNode: resolved.sourceNode,
                  sourceHandle: resolved.sourceHandle.id,
                  start,
                  pointer: start,
                  reconnect: {
                    edgeId: edge.id,
                    endpoint,
                    handleSignature,
                  },
                }
                emit('reconnectStart', {
                  edge,
                  endpoint,
                  activation: 'keyboard',
                })

                recordFlowTelemetry(
                  'Started Vue keyboard edge reconnection',
                  FlowSpan.edgeReconnectStart,
                  {
                    [FlowAttribute.edgeId]: edge.id,
                    [FlowAttribute.edgeEndpoint]: endpoint,
                    [FlowAttribute.inputKind]: 'keyboard',
                    [FlowAttribute.controlMode]: documentControlMode(),
                  }
                )
              },
            })
          )
        }
      }

      return controls
    }

    // eslint-disable-next-line complexity
    const renderEdge = (
      edge: FlowEdge,
      geometry: ReturnType<typeof resolveRenderedEdge>
    ): VNode | null => {
      const source = renderGraphNode(edge.source)
      const target = renderGraphNode(edge.target)

      if (
        edge.hidden === true ||
        source?.hidden === true ||
        target?.hidden === true
      ) {
        return null
      }

      const Edge = props.edgeTypes?.[edge.type ?? 'default']
      const LegacyEdge = Edge === undefined ? props.edgeComponent : undefined

      const edgeSlots =
        slots.edge === undefined
          ? undefined
          : { default: () => slots.edge?.({ edge }) }

      const path = geometry?.path
      const sourceNode = geometry?.sourceNode
      const targetNode = geometry?.targetNode

      let edgeChildren: VNode[] = []

      const { markerStart, markerEnd } = edgeMarkers(edge)

      if (geometry !== undefined && Edge !== undefined) {
        const rendererProps = edgeRendererPropsCache.keep(
          edge.id,
          flowEdgeRendererProps({
            edge,
            source: geometry.sourceAnchor,
            target: geometry.targetAnchor,
            sourcePosition: geometry.sourceHandle.side,
            targetPosition: geometry.targetHandle.side,
            sourceHandleId: geometry.sourceHandle.id,
            targetHandleId: geometry.targetHandle.id,
            sourceNode: flowNodeBounds(geometry.sourceNode),
            targetNode: flowNodeBounds(geometry.targetNode),
            markerStart,
            markerEnd,
            defaultInteractionWidth: 20,
          })
        )

        edgeChildren = [
          h(
            FlowEdgeScope,
            { edgeId: edge.id, key: `scope-${edge.id}` },
            {
              default: () =>
                h(
                  Edge,
                  {
                    ...declaredRendererProps(Edge, rendererProps),
                    edge,
                    path: geometry.path,
                    markerStart,
                    markerEnd,
                  },
                  edgeSlots
                ),
            }
          ),
        ]
      } else if (LegacyEdge !== undefined) {
        edgeChildren = [h(LegacyEdge, { edge }, edgeSlots)]
      } else if (path !== undefined) {
        edgeChildren = [
          renderDefaultEdgePath(edge, path, markerStart, markerEnd),
        ]
      }

      if (
        path !== undefined &&
        sourceNode !== undefined &&
        targetNode !== undefined
      ) {
        edgeChildren.push(
          renderEdgeHitTarget(
            edge,
            (Edge === undefined
              ? undefined
              : edgeInteractionPaths.get(edge.id)) ?? path,
            sourceNode.node.label,
            targetNode.node.label
          )
        )
      }

      return h(
        'g',
        {
          key: edge.id,
          onDblclick: (event: MouseEvent) => {
            if (
              event.target instanceof Element &&
              event.target.closest('.flow-vue-edge-path') !== null
            ) {
              routeEditor.insert(edge, event)
              emit('edgeDoubleClick', edge, event)
            }
          },
          onPointerdown: (event: PointerEvent) => {
            if (
              !(event.target instanceof Element) ||
              event.target.closest('.flow-vue-edge-textwrapper') === null
            ) {
              return
            }

            event.stopPropagation()

            if (event.button === 0) {
              event.preventDefault()
              props.onEdgeClick?.(edge, event)
              awaitEdgeClick(edge, event)
            }
          },
          class: [
            flowVueEdgeClasses(edge),
            props.noPanClassName,
            {
              selectable: isEdgeSelectable(interactivity.value, edge),
              inactive:
                !isEdgeSelectable(interactivity.value, edge) &&
                !hasEdgeClickHandler(),
            },
          ],
          'aria-label':
            edge.ariaLabel ??
            `Edge from ${source?.node.label ?? edge.source} to ${target?.node.label ?? edge.target}`,
          'data-testid': 'flow-edge',
          'data-edge-id': edge.id,
        },
        edgeChildren
      )
    }

    const resolveEdgeLabelPosition = (
      edge: FlowEdge
    ): { readonly x: number; readonly y: number } | undefined => {
      if (edge.label === undefined || edge.label.length === 0 || edge.hidden) {
        return undefined
      }

      const resolved = resolveEdgeHandles(activeDocument.value, edge)

      if (resolved === undefined) {
        return undefined
      }

      const sourceNode = renderGraphNode(resolved.sourceNode.id)
      const targetNode = renderGraphNode(resolved.targetNode.id)

      if (
        sourceNode === undefined ||
        targetNode === undefined ||
        sourceNode.hidden ||
        targetNode.hidden
      ) {
        return undefined
      }

      const sourceMeasured = measuredHandles.value
        .get(resolved.sourceNode.id)
        ?.get(resolved.sourceHandle.id)

      const targetMeasured = measuredHandles.value
        .get(resolved.targetNode.id)
        ?.get(resolved.targetHandle.id)

      if (sourceMeasured === undefined || targetMeasured === undefined) {
        return undefined
      }

      const source = edgeAttachmentPosition(
        sourceNode.absolutePosition,
        resolved.sourceHandle,
        sourceMeasured
      )

      const target = edgeAttachmentPosition(
        targetNode.absolutePosition,
        resolved.targetHandle,
        targetMeasured
      )

      return (
        edgeLabelAnchor(edge) ??
        (routeEditor.points(edge) === undefined
          ? edgeLabelPosition(
              source,
              target,
              edge.path ?? 'straight',
              resolved.sourceHandle.side,
              resolved.targetHandle.side
            )
          : getManualRouteGeometry(
              source,
              target,
              routeEditor.points(edge) ?? []
            ).label)
      )
    }

    const renderEdgeLabel = (edge: FlowEdge): VNode | null => {
      const position = resolveEdgeLabelPosition(edge)

      if (position === undefined || edge.label === undefined) {
        return null
      }

      return h(
        'div',
        {
          key: edge.id,
          class: ['flow-vue-edge-label', props.noPanClassName],
          onPointerdown: (event: PointerEvent) => {
            // Pinned EdgeText + EdgeWrapper: labels activate their owning edge.
            event.stopPropagation()

            if (event.button === 0) {
              event.preventDefault()
              props.onEdgeClick?.(edge, event)
              awaitEdgeClick(edge, event)
            }
          },
          onMousedown: (event: MouseEvent) =>
            emit('edgeMouseDown', edge, event),
          onMouseup: (event: MouseEvent) => emit('edgeMouseUp', edge, event),
          onMousemove: (event: MouseEvent) =>
            emit('edgeMouseMove', edge, event),
          onMouseenter: (event: MouseEvent) =>
            emit('edgeMouseEnter', edge, event),
          onMouseleave: (event: MouseEvent) =>
            emit('edgeMouseLeave', edge, event),
          onDblclick: (event: MouseEvent) =>
            emit('edgeDoubleClick', edge, event),
          onContextmenu: (event: MouseEvent) =>
            emit('edgeContextMenu', edge, event),
          'data-testid': 'flow-edge-label',
          'data-flow-edge-label': edge.id,
          style: {
            left: `${position.x}px`,
            top: `${position.y}px`,
            ...flowVueEdgeLabelBox(edge),
          },
        },
        [
          edge.labelShowBg === false
            ? null
            : h('span', {
                class: 'flow-vue-edge-label-bg',
                style: flowVueLabelStyle(edge.labelBgStyle, 'background'),
              }),
          h(
            'span',
            {
              class: 'flow-vue-edge-label-text',
              style: flowVueLabelStyle(edge.labelStyle, 'text'),
            },
            edge.label
          ),
        ]
      )
    }

    // eslint-disable-next-line complexity -- The complete raw authority and resource packet must be captured without callback-capable intermediate helpers.
    const captureDisposal = (): CapturedDisposal => {
      stateDisposed = true
      keyboardHistoryGesture = undefined
      pendingDocumentReceipt = undefined

      for (const settle of pendingHistoryReplays) {
        settle()
      }

      pendingHistoryReplays.clear()

      for (const settle of pendingEditSettlers) {
        settle()
      }

      pendingEditSettlers.clear()
      pendingEditMutations.length = 0
      const active = session.value
      const retained = clickConnection.value
      const originalClaims = [...pendingConnectionClaims]
      const viewport = activeViewport.value
      const request = activeViewportRequest
      const observation = viewportObservation
      const resources: DisposalResource[] = [{ kind: 'history' }]
      const notifications: DisposalStep[] = []
      const clears: DisposalResource[] = []
      const liveClaims: ConnectionClaim[] = []
      const livePorts: TerminalPort[] = []

      const taken = takeRequestSettlement(request, 'disposed', viewport)

      if (taken !== undefined) {
        resources.push({ kind: 'request-frame', taken })
        notifications.push(
          { kind: 'request-settlement', taken },
          ...taken.ports.map((port): DisposalStep => ({
            kind: 'terminal',
            port,
          }))
        )
      }

      activeViewportRequest = undefined
      currentViewportWrite = undefined

      for (const dispose of keyPressDisposers) {
        resources.push({ kind: 'key-observer', dispose })
      }

      keyPressDisposers.clear()

      if (canvas.value !== undefined) {
        resources.push(
          {
            kind: 'remove-pointerdown',
            target: canvas.value,
            listener: rememberPanePress,
          },
          {
            kind: 'unobserve-canvas',
            observer: resizeObserver,
            element: canvas.value,
          }
        )
      }

      resources.push(
        { kind: 'disconnect-observer', observer: resizeObserver },
        { kind: 'remove-keydown', target: globalThis, listener: onKeyDown },
        { kind: 'remove-keyup', target: globalThis, listener: onWindowKeyUp },
        { kind: 'remove-blur', target: globalThis, listener: onWindowBlur }
      )

      if (active !== undefined) {
        clears.push({ kind: 'clear-session-view', view: active })

        if (active.kind === 'connection') {
          const owner = connectionOwner(active)

          const source =
            active.route === 'pointer' && active.source.kind === 'retained'
              ? active.source.source
              : undefined

          const claim = claimConnection(
            owner,
            source?.data ?? active,
            null,
            active,
            source
          )

          if (claim !== undefined) {
            liveClaims.push(claim)
          }

          if (active.route === 'pointer') {
            resources.push({ kind: 'connection-capture', press: active.press })
          }
        } else if (
          active.kind === 'connection-pending' ||
          active.kind === 'reconnection-pending'
        ) {
          resources.push({ kind: 'connection-capture', press: active.press })
        } else {
          resources.push({
            kind: 'session-capture',
            target: active.captureTarget,
            pointerId: active.pointerId,
          })

          if (active.kind === 'node' || active.kind === 'node-pending') {
            resources.push({
              kind: 'remove-node-transform',
              element: active.element,
            })

            if (active.kind === 'node') {
              const payload: NodeEndPayload = {
                node: active.node,
                status: 'cancelled',
                reason: 'superseded',
              }

              livePorts.push(
                { kind: 'nodeDragEnd', payload },
                { kind: 'nodeDragStop', payload }
              )
            }
          } else if (
            active.kind === 'selection' &&
            active.owner.state.kind === 'live'
          ) {
            active.owner.state = { kind: 'ended' }

            const payload: SelectionEndPayload = {
              status: 'cancelled',
              reason: 'superseded',
            }

            livePorts.push(
              { kind: 'selectionEnd', payload },
              { kind: 'selectionDragStop', payload }
            )
          } else if (
            active.kind === 'pan' &&
            active.owner.state.kind === 'live'
          ) {
            const panObservation = active.owner.state.observation
            active.owner.state = { kind: 'ended' }
            livePorts.push(
              ...takeObservationPorts(panObservation, viewport, 'disposed')
            )
          } else if (
            active.kind === 'resize' ||
            active.kind === 'keyboard-resize'
          ) {
            const position = resizePreviewGraph({
              kind: 'node-bounds',
              nodeId: active.node.id,
              position: active.position,
              size: active.size,
              childPositions: [],
            }).nodes.get(active.node.id)?.absolutePosition

            if (position !== undefined) {
              resources.push(
                {
                  kind: 'resize-style',
                  element: active.element,
                  property: 'left',
                  value: `${position.x}px`,
                },
                {
                  kind: 'resize-style',
                  element: active.element,
                  property: 'top',
                  value: `${position.y}px`,
                },
                {
                  kind: 'resize-style',
                  element: active.element,
                  property: 'width',
                  value: `${active.size.width}px`,
                },
                {
                  kind: 'resize-style',
                  element: active.element,
                  property: 'height',
                  value: `${active.size.height}px`,
                }
              )
            }
          }
        }
      }

      if (retained !== undefined) {
        clears.push({ kind: 'clear-retained-view', view: retained })

        const physical =
          active?.kind === 'connection-pending' &&
          active.sourceAssociation.kind === 'retained' &&
          active.sourceAssociation.source === retained
            ? active
            : undefined

        const claim = claimConnection(
          retained.owner,
          retained.data,
          null,
          physical,
          retained
        )

        if (claim !== undefined) {
          liveClaims.push(claim)
        }
      }

      for (const claim of [...liveClaims, ...originalClaims]) {
        if (claim.resources.press !== null) {
          resources.push({
            kind: 'connection-capture',
            press: claim.resources.press,
          })
        }

        if (claim.resources.physicalView !== undefined) {
          clears.push({
            kind: 'clear-session-view',
            view: claim.resources.physicalView,
          })
        }

        if (claim.resources.retainedView !== undefined) {
          clears.push({
            kind: 'clear-retained-view',
            view: claim.resources.retainedView,
          })
        }

        notifications.push(
          ...takeObservationPorts(
            claim.resources.autoPan,
            viewport,
            'disposed'
          ).map((port): DisposalStep => ({ kind: 'terminal', port }))
        )
      }

      notifications.push(
        ...takeObservationPorts(observation, viewport, 'disposed').map(
          (port): DisposalStep => ({ kind: 'terminal', port })
        )
      )

      for (const [nodeId, settlers] of pendingInternals) {
        for (const settle of settlers) {
          notifications.push({
            kind: 'internals-settlement',
            settle,
            result: { nodeId: NodeIdSchema.make(nodeId), status: 'disposed' },
          })
        }
      }

      pendingInternals.clear()
      nodeElements.clear()
      nodeRefCallbacks.clear()
      pendingGenerations.clear()

      if (
        canvas.value !== undefined &&
        focusedCanvasOwners.get(canvas.value.ownerDocument) === canvas.value
      ) {
        focusedCanvasOwners.delete(canvas.value.ownerDocument)
      }

      stateListeners.clear()
      stateQueue.length = 0
      pressedKeys.clear()
      keyboardPressedCodes.clear()

      return {
        next: 0,
        steps: [
          ...resources.map((resource): DisposalStep => ({
            kind: 'resource',
            resource,
          })),
          ...clears.map((resource): DisposalStep => ({
            kind: 'resource',
            resource,
          })),
          ...notifications,
          ...liveClaims.map((claim): DisposalStep => ({
            kind: 'connection-claim',
            claim,
          })),
          ...livePorts.map((port): DisposalStep => ({
            kind: 'terminal',
            port,
          })),
          ...originalClaims.map((claim): DisposalStep => ({
            kind: 'connection-claim',
            claim,
          })),
        ],
      }
    }

    // eslint-disable-next-line complexity -- Each captured resource owns one disposal action; history is delivered only after raw capture completes.
    const applyDisposalResource = (resource: DisposalResource): void => {
      if (resource.kind === 'history') {
        historyEvent({ kind: 'dispose' })

        return
      }

      switch (resource.kind) {
        case 'request-frame': {
          resource.taken.progress = { kind: 'resolve' }
          cancelRequestFrame(resource.taken.frame)
          break
        }

        case 'key-observer': {
          resource.dispose()
          break
        }

        case 'unobserve-canvas': {
          resource.observer.unobserve(resource.element)
          break
        }

        case 'disconnect-observer': {
          resource.observer.disconnect()
          break
        }

        case 'remove-keydown': {
          resource.target.removeEventListener(
            'keydown',
            resource.listener,
            true
          )
          break
        }

        case 'remove-pointerdown': {
          resource.target.removeEventListener(
            'pointerdown',
            resource.listener,
            true
          )
          break
        }

        case 'remove-keyup': {
          resource.target.removeEventListener('keyup', resource.listener, true)
          break
        }

        case 'remove-blur': {
          resource.target.removeEventListener('blur', resource.listener)
          break
        }

        case 'connection-capture': {
          releaseConnectionPress(resource.press)
          break
        }

        case 'session-capture': {
          if (resource.target.hasPointerCapture?.(resource.pointerId)) {
            resource.target.releasePointerCapture?.(resource.pointerId)
          }

          break
        }

        case 'remove-node-transform': {
          resource.element.style.removeProperty('transform')
          break
        }

        case 'resize-style': {
          resource.element.style.setProperty(resource.property, resource.value)
          break
        }

        case 'clear-session-view': {
          if (session.value === resource.view) {
            session.value = undefined
          }

          break
        }

        case 'clear-retained-view': {
          if (clickConnection.value === resource.view) {
            clickConnection.value = undefined
          }

          break
        }

        default: {
          const exhausted: never = resource

          return exhausted
        }
      }
    }

    const disposeComponent = (): void => {
      capturedDisposal ??= captureDisposal()
      const packet = capturedDisposal

      while (packet.next < packet.steps.length) {
        const step = packet.steps[packet.next]
        packet.next += 1

        if (step === undefined) {
          continue
        }

        switch (step.kind) {
          case 'resource': {
            let failure: { cause: unknown } | undefined

            try {
              applyDisposalResource(step.resource)
            } catch (error) {
              failure = { cause: error }
            } finally {
              if (failure !== undefined) {
                disposeComponent()
              }
            }

            if (failure !== undefined) {
              throw failure.cause
            }

            break
          }

          case 'terminal': {
            deliverTerminal(step.port)
            break
          }

          case 'connection-claim': {
            finishConnectionClaim(
              step.claim,
              { kind: 'cancelled', reason: 'superseded' },
              packet
            )
            break
          }

          case 'request-settlement': {
            resolveTakenRequest(step.taken)
            break
          }

          case 'internals-settlement': {
            step.settle(step.result)
            break
          }

          default: {
            const exhausted: never = step

            return exhausted
          }
        }
      }
    }

    onBeforeUnmount(disposeComponent)

    let gesturePanFrame: number | undefined
    let gesturePanEvent: PointerEvent | undefined

    const stopGesturePan = (): void => {
      if (gesturePanFrame !== undefined) {
        cancelAnimationFrame(gesturePanFrame)
      }

      gesturePanFrame = undefined
      gesturePanEvent = undefined
    }

    // eslint-disable-next-line complexity -- A frame checks gesture identity, configuration and ownership before and after viewport callbacks.
    const panGestureFrame = (): void => {
      gesturePanFrame = undefined
      const event = gesturePanEvent
      const active = session.value
      const bounds = canvas.value?.getBoundingClientRect()

      if (
        stateDisposed ||
        event === undefined ||
        bounds === undefined ||
        active === undefined ||
        active.pointerId !== event.pointerId ||
        !(
          (active.kind === 'node' && props.autoPanOnNodeDrag) ||
          (active.kind === 'selection' && props.autoPanOnSelection)
        )
      ) {
        stopGesturePan()

        return
      }

      const delta = selectionAutoPanDelta(
        { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
        bounds.width,
        bounds.height,
        40,
        props.autoPanSpeed
      )

      if (delta.x === 0 && delta.y === 0) {
        stopGesturePan()

        return
      }

      if (active.kind === 'node' && !continueNode(active)) {
        stopGesturePan()

        return
      }

      updateViewport(panViewport(activeViewport.value, delta))

      // Viewport listeners may replace the graph, end the gesture or unmount.
      if (stateDisposed || session.value !== active) {
        stopGesturePan()

        return
      }

      if (active.kind === 'node') {
        moveNode(active, event)
      } else if (active.owner.state.kind === 'live') {
        session.value = { ...active, pointer: pointerInFlow(event) }
      }

      const current = session.value

      if (
        !stateDisposed &&
        ((active.kind === 'node' && current === active) ||
          (active.kind === 'selection' &&
            current?.kind === 'selection' &&
            current.owner === active.owner &&
            active.owner.state.kind === 'live'))
      ) {
        gesturePanFrame = requestAnimationFrame(panGestureFrame)
      }
    }

    const scheduleGesturePan = (event: PointerEvent): void => {
      gesturePanEvent = event

      if (gesturePanFrame === undefined) {
        gesturePanFrame = requestAnimationFrame(panGestureFrame)
      }
    }

    watch(
      session,
      (active) => {
        if (active?.kind !== 'node' && active?.kind !== 'selection') {
          stopGesturePan()
        }
      },
      { flush: 'sync' }
    )

    onBeforeUnmount(stopGesturePan)

    return () => {
      const renderOwner = currentConnectionPreviewOwner()

      const renderPreview = connectionLinePreview(renderOwner)

      if (stateDisposed) {
        return null
      }

      let connection: ConnectionData | undefined

      if (renderOwner !== undefined && previewOwnerLive(renderOwner)) {
        connection =
          renderOwner.kind === 'retained'
            ? renderOwner.source.data
            : renderOwner.active
      }

      // A separate SVG lets container layout styles leave graph edges untouched.
      const connectionPreview =
        connection === undefined
          ? []
          : [
              h(
                'svg',
                {
                  class: 'flow-vue-connection-line',
                  'data-testid': 'flow-connection-line-container',
                  width: canvasWidth.value,
                  height: canvasHeight.value,
                  style: [
                    {
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      overflow: 'visible',
                      pointerEvents: 'none',
                    },
                    flowVueStyle(props.connectionLineContainerStyle),
                  ],
                },
                [
                  h(
                    'g',
                    {
                      transform: `translate(${activeViewport.value.x} ${activeViewport.value.y}) scale(${activeViewport.value.zoom})`,
                    },
                    renderConnectionLine(connection, renderPreview)
                  ),
                ]
              ),
            ]

      const connectionKeyboardStatus =
        connection?.pointerId === -1
          ? [
              h(
                'div',
                {
                  role: 'status',
                  'aria-live': 'polite',
                  'data-testid': 'flow-connection-keyboard-status',
                  style: {
                    position: 'absolute',
                    left: `${connection.start.x}px`,
                    top: `${connection.start.y}px`,
                    transform: `translate(${activeViewport.value.x}px, ${activeViewport.value.y}px) scale(${activeViewport.value.zoom})`,
                  },
                },
                'Choose a target handle'
              ),
            ]
          : []

      const selection =
        session.value?.kind === 'selection' ? session.value : undefined

      const selectionPreview =
        selection === undefined
          ? []
          : [
              h('div', {
                class: 'flow-vue-selection-rect',
                'data-testid': 'flow-selection-rect',
                style: {
                  left: `${Math.min(selection.start.x, selection.pointer.x)}px`,
                  top: `${Math.min(selection.start.y, selection.pointer.y)}px`,
                  width: `${Math.abs(selection.start.x - selection.pointer.x)}px`,
                  height: `${Math.abs(selection.start.y - selection.pointer.y)}px`,
                  transform: `translate(${activeViewport.value.x}px, ${activeViewport.value.y}px) scale(${activeViewport.value.zoom})`,
                },
                onContextmenu: () => {
                  const current = session.value

                  if (current?.kind === 'selection') {
                    emit('selectionContextMenu', {
                      rect: {
                        x: Math.min(current.start.x, current.pointer.x),
                        y: Math.min(current.start.y, current.pointer.y),
                        width: Math.abs(current.start.x - current.pointer.x),
                        height: Math.abs(current.start.y - current.pointer.y),
                      },
                    })
                  }
                },
              }),
            ]

      const selectedBounds =
        selectionBoundsActive.value && selection === undefined
          ? graphBounds(
              graph.value,
              new Set(
                activeDocument.value.nodes
                  .filter((node) => node.selected)
                  .map(({ id }) => id)
              )
            )
          : undefined

      const selectionBounds =
        selectedBounds === undefined
          ? []
          : [
              h('div', {
                class: 'flow-vue-selection-box',
                style: {
                  left: `${selectedBounds.x * activeViewport.value.zoom + activeViewport.value.x}px`,
                  top: `${selectedBounds.y * activeViewport.value.zoom + activeViewport.value.y}px`,
                  width: `${selectedBounds.width * activeViewport.value.zoom}px`,
                  height: `${selectedBounds.height * activeViewport.value.zoom}px`,
                },
              }),
            ]

      const selectionKeyboardStatus =
        selection?.pointerId === -1
          ? [
              h(
                'div',
                {
                  role: 'status',
                  'aria-live': 'polite',
                  'data-testid': 'flow-selection-keyboard-status',
                },
                'Selection active. Use arrow keys to extend; Enter selects; Escape cancels.'
              ),
            ]
          : []

      const edges = activeDocument.value.edges.map(withEdgeDefaults)

      return h(
        'div',
        {
          ref: (element: Element | ComponentPublicInstance | null) => {
            if (stateDisposed) {
              return
            }

            if (element instanceof HTMLElement && canvas.value !== element) {
              ensureFlowVueThemeStylesheet(element.ownerDocument)

              if (canvas.value !== undefined) {
                canvas.value.removeEventListener(
                  'pointerdown',
                  rememberPanePress,
                  true
                )
                resizeObserver.unobserve(canvas.value)
              }

              canvas.value = element
              // Native capture preserves origin without Vue's same-tick invoker stamp.
              element.addEventListener('pointerdown', rememberPanePress, true)
              resizeObserver.observe(element)
              globalThis.addEventListener('keydown', onKeyDown, true)
              globalThis.addEventListener('blur', onWindowBlur)
              globalThis.addEventListener('keyup', onWindowKeyUp, true)
            }
          },
          class: [
            'flow-vue-canvas',
            colorModeClass.value,
            { selection: paneIsSelecting.value },
          ],
          'data-testid': 'flow-canvas',
          'data-color-mode': colorModeClass.value,
          // eslint-disable-next-line complexity -- Movement dispatches the closed session union with owner checks after observable effects.
          onPointermove: (event: PointerEvent) => {
            trackClickTravel(event)

            if (!prepareConnectionMove(event)) {
              return
            }

            const active = session.value

            const retained = clickConnection.value

            if (
              active === undefined &&
              retained !== undefined &&
              canvas.value !== undefined
            ) {
              const continuation: ConnectionMovement = {
                kind: 'retained',
                source: retained,
              }

              if (
                !autoPanConnection(continuation, event.clientX, event.clientY)
              ) {
                return
              }

              const pointer = clientToFlow(event.clientX, event.clientY)

              const updated: RetainedSource = {
                ...retained,
                data: { ...retained.data, pointer },
              }

              clickConnection.value = updated

              const initiating: ConnectionPreviewOwner = {
                kind: 'retained',
                source: updated,
              }

              const preview = connectionPreviewState(initiating)

              if (preview !== null && previewOwnerLive(initiating)) {
                rememberConnectionPreview(initiating, preview)
                emit('connectProgress', { preview })
              }

              return
            }

            if (
              active === undefined ||
              active.kind === 'keyboard-resize' ||
              active.pointerId !== event.pointerId
            ) {
              return
            }

            if (active.kind === 'pan') {
              if (active.owner.state.kind === 'live') {
                writeViewport(
                  panViewport(active.viewportStart, {
                    x: event.clientX - active.startX,
                    y: event.clientY - active.startY,
                  }),
                  { kind: 'pan', active }
                )
              }

              return
            }

            if (active.kind === 'selection') {
              if (
                !active.activated &&
                Math.hypot(
                  event.clientX - active.startX,
                  event.clientY - active.startY
                ) <= active.threshold
              ) {
                return
              }

              scheduleGesturePan(event)
              const pointer = pointerInFlow(event)

              const updated: OwnedSelection = {
                ...active,
                pointer,
                activated: true,
              }

              session.value = updated

              if (
                stateDisposed ||
                session.value !== updated ||
                active.owner.state.kind !== 'live'
              ) {
                return
              }

              emit('selectionProgress', {
                rect: {
                  x: Math.min(active.start.x, pointer.x),
                  y: Math.min(active.start.y, pointer.y),
                  width: Math.abs(active.start.x - pointer.x),
                  height: Math.abs(active.start.y - pointer.y),
                },
              })

              if (
                stateDisposed ||
                session.value !== updated ||
                active.owner.state.kind !== 'live'
              ) {
                return
              }

              emit('selectionDrag', {
                rect: {
                  x: Math.min(active.start.x, pointer.x),
                  y: Math.min(active.start.y, pointer.y),
                  width: Math.abs(active.start.x - pointer.x),
                  height: Math.abs(active.start.y - pointer.y),
                },
              })

              return
            }

            if (active.kind === 'resize') {
              const change = resizeCandidate(active, event)

              if (change !== undefined) {
                previewNodeBounds(active.element, change)
              }

              return
            }

            if (active.kind === 'connection') {
              if (active.route !== 'pointer') {
                return
              }

              const continuation: ConnectionMovement = {
                kind: 'physical',
                active,
              }

              if (
                !autoPanConnection(continuation, event.clientX, event.clientY)
              ) {
                return
              }

              const updated: PhysicalConnection = {
                ...active,
                pointer: clientToFlow(event.clientX, event.clientY),
                freeform:
                  active.freeform === undefined
                    ? undefined
                    : sampleRoutePoint(
                        active.freeform,
                        clientToFlow(event.clientX, event.clientY),
                        8
                      ),
              }

              session.value = updated

              const initiating: ConnectionPreviewOwner = {
                kind: 'physical',
                active: updated,
              }

              const preview = connectionPreviewState(initiating)

              if (preview !== null && previewOwnerLive(initiating)) {
                rememberConnectionPreview(initiating, preview)

                if (updated.reconnect === undefined) {
                  emit('connectProgress', { preview })
                } else {
                  emit('reconnectProgress', { preview })
                }
              }

              return
            }

            moveNode(active, event)

            if (session.value?.kind === 'node') {
              scheduleGesturePan(event)
            }
          },
          onFocusin: (event: FocusEvent) => {
            const owner = event
              .composedPath()
              .find(
                (element) =>
                  element instanceof HTMLElement &&
                  element.classList.contains('flow-vue-canvas')
              )

            if (owner === canvas.value && canvas.value !== undefined) {
              focusedCanvasOwners.set(canvas.value.ownerDocument, canvas.value)
            }
          },
          onPointerdown: onCanvasPointerDown,
          onMousedown: (event: MouseEvent) => {
            const { target } = event

            if (
              target instanceof Element &&
              target.closest(
                '[data-node-id], [data-flow-edge-hit], [data-flow-edge-label], .flow-vue-edge-textwrapper'
              ) === null
            ) {
              emit('paneMouseDown', clientToFlow(event.clientX, event.clientY))
            }
          },
          onMouseup: (event: MouseEvent) => {
            const { target } = event

            if (
              target instanceof Element &&
              target.closest(
                '[data-node-id], [data-flow-edge-hit], [data-flow-edge-label], .flow-vue-edge-textwrapper'
              ) === null
            ) {
              emit('paneMouseUp', clientToFlow(event.clientX, event.clientY))
            }
          },
          onClick: (event: MouseEvent) => {
            const { target } = event
            const press = panePress
            panePress = undefined

            if (
              target instanceof Element &&
              target.closest(
                '[data-node-id], [data-flow-edge-hit], [data-flow-edge-label], .flow-vue-edge-textwrapper'
              ) === null &&
              (press === undefined || press.distance <= props.paneClickDistance)
            ) {
              selectionBoundsActive.value = false
              emit('paneClick', clientToFlow(event.clientX, event.clientY))

              if (
                target === canvas.value &&
                (press?.onPane === true ||
                  (press === undefined && event.detail === 0)) &&
                !stateDisposed &&
                interactivity.value.elementsSelectable &&
                (activeDocument.value.nodes.some(
                  (node) => node.selected === true
                ) ||
                  activeDocument.value.edges.some(
                    (edge) => edge.selected === true
                  ))
              ) {
                publish({ kind: 'selection-set', nodeIds: [], edgeIds: [] })
              }
            }
          },
          onMousemove: (event: MouseEvent) => {
            const { target } = event

            if (
              target instanceof Element &&
              target.closest(
                '[data-node-id], [data-flow-edge-hit], [data-flow-edge-label], .flow-vue-edge-textwrapper'
              ) === null
            ) {
              emit('paneMouseMove', clientToFlow(event.clientX, event.clientY))
            }
          },
          onMouseenter: (event: MouseEvent) => {
            emit('paneMouseEnter', clientToFlow(event.clientX, event.clientY))
          },
          onMouseleave: (event: MouseEvent) => {
            emit('paneMouseLeave', clientToFlow(event.clientX, event.clientY))
          },
          onContextmenu: (event: MouseEvent) => {
            const { target } = event

            if (
              target instanceof Element &&
              target.closest(
                '[data-node-id], [data-flow-edge-hit], [data-flow-edge-label], .flow-vue-edge-textwrapper'
              ) === null
            ) {
              if (
                Array.isArray(props.panOnDrag) &&
                props.panOnDrag.includes(2)
              ) {
                event.preventDefault()

                return
              }

              emit(
                'paneContextMenu',
                clientToFlow(event.clientX, event.clientY),
                event
              )
            }
          },
          onDblclick: (event: MouseEvent) => {
            const { target } = event

            if (
              !props.zoomOnDoubleClick ||
              !activationKeyIsPressed(props.zoomActivationKeyCode) ||
              !(target instanceof Element) ||
              target.closest(
                '[data-node-id], [data-flow-edge-hit], [data-flow-edge-label], .flow-vue-edge-textwrapper'
              ) !== null
            ) {
              return
            }

            const bounds = canvas.value?.getBoundingClientRect()

            if (bounds !== undefined) {
              const anchor = {
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
              }

              updateViewport(
                zoomViewportAt(
                  activeViewport.value,
                  activeViewport.value.zoom * (event.shiftKey ? 0.5 : 2),
                  anchor,
                  viewportLimits
                )
              )
              event.preventDefault()
            }
          },
          onPointerup: onPointerUp,
          onWheel,
          onPointercancel: (event: PointerEvent) => {
            if (
              !stateDisposed &&
              session.value?.pointerId === event.pointerId
            ) {
              cancelActiveSession('pointer-cancel')
            }
          },
          onLostpointercapture: (event: PointerEvent) => {
            if (
              !stateDisposed &&
              session.value?.pointerId === event.pointerId &&
              ((session.value.kind !== 'connection-pending' &&
                session.value.kind !== 'reconnection-pending') ||
                session.value.press.state === 'held') &&
              (session.value.kind !== 'connection' ||
                (connectionOwner(session.value).state.kind === 'live' &&
                  (session.value.route !== 'pointer' ||
                    session.value.press.state === 'held'))) &&
              event.target === session.value.captureTarget &&
              !session.value.captureTarget.hasPointerCapture(event.pointerId)
            ) {
              cancelActiveSession('pointer-cancel')
            }
          },
        },
        [
          h(
            'svg',
            {
              class: 'flow-vue-edges',
              style: {
                transform: `translate(${activeViewport.value.x}px, ${activeViewport.value.y}px) scale(${activeViewport.value.zoom})`,
                transformOrigin: '0 0',
              },
            },
            [h('defs', renderMarkers())]
          ),
          ...connectionPreview,
          ...connectionKeyboardStatus,
          ...selectionPreview,
          ...selectionBounds,
          ...selectionKeyboardStatus,
          h(
            'div',
            {
              class: 'flow-vue-viewport',
              style: {
                transform: `translate(${activeViewport.value.x}px, ${activeViewport.value.y}px) scale(${activeViewport.value.zoom})`,
              },
            },
            [
              // Pinned EdgeRenderer/index.tsx:66 and EdgeWrapper/index.tsx:183
              // retain document order and change only each SVG's z-index.
              edges.map((edge) => {
                const geometry = resolveRenderedEdge(edge)
                const zIndex = stacking.value.edges.get(edge.id) ?? 0

                return h(Fragment, { key: edge.id }, [
                  h(
                    'svg',
                    {
                      class: [
                        'flow-vue-edges',
                        { 'flow-vue-edges-elevated': zIndex > 0 },
                      ],
                      'data-z-index': zIndex,
                      style: { zIndex, overflow: 'visible' },
                    },
                    [renderEdge(edge, geometry)]
                  ),
                  h(
                    'div',
                    {
                      class: [
                        'flow-vue-edge-labels',
                        { 'flow-vue-edge-labels-elevated': zIndex > 0 },
                      ],
                      'aria-hidden': 'true',
                      'data-z-index': zIndex,
                      style: { zIndex },
                    },
                    [renderEdgeLabel(edge)]
                  ),
                  // Keep controls after HTML labels, matching EdgeWrapper's
                  // EdgeText -> EdgeUpdateAnchors paint order at the same level.
                  h(
                    'svg',
                    {
                      class: 'flow-vue-edge-controls',
                      'data-flow-edge-controls': edge.id,
                      style: { zIndex },
                    },
                    renderEdgeReconnectControls(edge, geometry)
                  ),
                ])
              }),
              h(
                'div',
                {
                  class: 'flow-vue-edge-label-renderer',
                  'data-testid': 'flow-edge-label-renderer',
                },
                edgeLabelRegistry.render()
              ),
              ...visibleHelperGuides.value.map((guide) =>
                h('div', {
                  'data-helper-axis': guide.axis,
                  'data-coordinate': guide.coordinate,
                  style: {
                    position: 'absolute',
                    pointerEvents: 'none',
                    zIndex: 10_000,
                    background: '#f43f5e',
                    left: `${guide.axis === 'x' ? guide.coordinate : guide.from}px`,
                    top: `${guide.axis === 'y' ? guide.coordinate : guide.from}px`,
                    width: `${guide.axis === 'x' ? 1 / activeViewport.value.zoom : guide.to - guide.from}px`,
                    height: `${guide.axis === 'y' ? 1 / activeViewport.value.zoom : guide.to - guide.from}px`,
                  },
                })
              ),
              ...graph.value.orderedNodes.map(({ node }) => renderNode(node)),
              h('div', {
                class: 'flow-vue-viewport-portal-target',
                ref: (element: Element | ComponentPublicInstance | null) => {
                  if (stateDisposed) {
                    return
                  }

                  viewportPortalTarget.value =
                    element instanceof HTMLElement ? element : null
                },
              }),
            ]
          ),
          h('div', {
            class: 'flow-vue-node-toolbar-layer',
            ref: (element: Element | ComponentPublicInstance | null) => {
              if (stateDisposed) {
                return
              }

              toolbarOverlayTarget.value =
                element instanceof HTMLElement ? element : null
            },
          }),
          // React's key names are swapped: with keyboard support the node
          // description reads the `keyboardDisabled` text, which explains
          // the arrow keys.
          h(
            'div',
            {
              id: `${canvasId}-node-description`,
              class: 'flow-vue-a11y-description',
              'data-testid': 'flow-node-description',
            },
            props.disableKeyboardA11y
              ? ariaLabelConfig.value['node.a11yDescription.default']
              : ariaLabelConfig.value['node.a11yDescription.keyboardDisabled']
          ),
          h(
            'div',
            {
              id: `${canvasId}-edge-description`,
              class: 'flow-vue-a11y-description',
            },
            ariaLabelConfig.value['edge.a11yDescription.default']
          ),
          ...(props.disableKeyboardA11y
            ? []
            : [
                h(
                  'div',
                  {
                    class: 'flow-vue-aria-live',
                    'data-testid': 'flow-aria-live',
                    'aria-live': 'assertive',
                    'aria-atomic': 'true',
                  },
                  ariaLiveMessage.value
                ),
              ]),
          slots.default?.({}),
        ]
      )
    }
  },
})
