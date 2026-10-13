import {
  applyNodePositionChange,
  applyNodeBoundsChange,
  applyEdgeReconnectChange,
  applySelectionSetChange,
  applyNodeMeasurements,
  areFlowNodesInitialized,
  bezierEdgePath,
  createFlowSnapshot,
  createFlowGraph,
  decodeFlowDocument,
  edgeAttachmentPosition,
  edgeLabelPosition,
  fitViewportToNodes,
  emptyFlowMeasurementState,
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
  NodeExtentSchema,
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
} from '@flow/core'
import type {
  FlowChange,
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
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  provide,
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

import { observeKeyPress } from './key-press-observer.ts'
import type { FlowKeyPressOptions } from './key-press-observer.ts'
import { FlowMiniMapContextKey } from './minimap.ts'
import { FlowNodeToolbarContextKey } from './node-toolbar.ts'
import { FlowEditorKey, FlowNodeIdKey } from './use-flow.ts'
import type { FlowEditor } from './use-flow.ts'
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

  if (change.kind === 'node-position' || change.kind === 'node-bounds') {
    return FlowSpan.nodeDragComplete
  }

  return change.kind === 'selection-set'
    ? FlowSpan.selectionSet
    : FlowSpan.editPrepare
}

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

const reconnectAnchorOffsets = {
  top: { x: 0, y: -12 },
  right: { x: 12, y: 0 },
  bottom: { x: 0, y: 12 },
  left: { x: -12, y: 0 },
} satisfies Record<
  FlowHandle['side'],
  { readonly x: number; readonly y: number }
>

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
  duration: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  easing: S.optional(S.Literals(['linear', 'ease-in-out'])),
  nodes: S.optional(
    S.Union([S.Literals(['all', 'selected']), S.Array(S.String)])
  ),
  padding: S.optional(ViewportPaddingSchema),
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

type NodeVisual = Component<{ readonly node: FlowNode }>

type EdgeVisual = Component<{ readonly edge: FlowEdge }>

type ConnectionPreviewVisual = Component<{
  readonly preview: ConnectionPreviewState
}>

type EdgeTypeVisual = Component<{
  readonly edge: FlowEdge
  readonly path: string
  readonly markerStart: string | undefined
  readonly markerEnd: string | undefined
}>

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
    stroke: edge.stroke ?? '#64748b',
    'stroke-width': edge.strokeWidth ?? 1.5,
    'marker-start': markerStart,
    'marker-end': markerEnd,
  })

const markerId = (
  canvasId: string,
  kind: 'arrow' | 'arrowclosed',
  stroke: string
): string => `${canvasId}-marker-${kind}-${stroke.slice(1)}`

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
  },
  setup(scopeProps, { slots: scopedSlots }) {
    provide(FlowNodeIdKey, scopeProps.node.id)

    return () => h(scopeProps.visual, { node: scopeProps.node }, scopedSlots)
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
    /** Enable primary-button viewport dragging. Shift-drag remains available for selection. */
    panOnDrag: {
      type: Boolean,
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
    nodeExtent: { type: Object as PropType<NodeExtent>, default: undefined },
  },
  slots: Object as SlotsType<{
    default: Record<string, never>
    node: { readonly node: FlowNode }
    edge: { readonly edge: FlowEdge }
  }>,
  emits: {
    change: (_change: FlowChange) => true,
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
    nodeDragStart: (_node: FlowNode) => true,
    nodeDrag: (_payload: {
      readonly node: FlowNode
      readonly position: { readonly x: number; readonly y: number }
    }) => true,
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
    connectEnd: (_payload: ConnectionEndPayload) => true,
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
    reconnectEnd: (_payload: ConnectionEndPayload) => true,
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
    error: (_error: {
      readonly name: string
      readonly message: string
      readonly boundary: 'connection-validator'
    }) => true,
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
    paneContextMenu: (_position: { readonly x: number; readonly y: number }) =>
      true,
    paneScroll: (_payload: {
      readonly position: { readonly x: number; readonly y: number }
      readonly deltaX: number
      readonly deltaY: number
    }) => true,
    nodeMouseDown: (_node: FlowNode) => true,
    nodeMouseUp: (_node: FlowNode) => true,
    nodeMouseMove: (_node: FlowNode) => true,
    nodeMouseEnter: (_node: FlowNode) => true,
    nodeMouseLeave: (_node: FlowNode) => true,
    nodeDoubleClick: (_node: FlowNode) => true,
    nodeContextMenu: (_node: FlowNode) => true,
    edgeMouseDown: (_edge: FlowEdge) => true,
    edgeMouseUp: (_edge: FlowEdge) => true,
    edgeMouseMove: (_edge: FlowEdge) => true,
    edgeMouseEnter: (_edge: FlowEdge) => true,
    edgeMouseLeave: (_edge: FlowEdge) => true,
    edgeDoubleClick: (_edge: FlowEdge) => true,
    edgeContextMenu: (_edge: FlowEdge) => true,
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
    nodeClick: (_node: FlowNode) => true,
    edgeClick: (_edge: FlowEdge) => true,
  },
  // eslint-disable-next-line complexity -- the Vue boundary coordinates host lifecycles and core operations.
  setup(props, { emit, slots, expose }) {
    const canvasId = `flow-vue-${useId()}`

    const defaultEdgeOptions = computed(() =>
      props.defaultEdgeOptions === undefined
        ? undefined
        : Effect.runSync(decodeFlowDefaultEdgeOptions(props.defaultEdgeOptions))
    )

    const withEdgeDefaults = (edge: FlowEdge): FlowEdge =>
      applyDefaultEdgeOptions(edge, defaultEdgeOptions.value)

    const viewportLimits = S.decodeUnknownSync(ViewportLimitsSchema)(
      props.viewportLimits
    )

    const nodeExtent =
      props.nodeExtent === undefined
        ? undefined
        : S.decodeUnknownSync(NodeExtentSchema)(props.nodeExtent)

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
    const ownedViewport = shallowRef(props.viewport ?? props.defaultViewport)

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
    const toolbarOverlayTarget = shallowRef<HTMLElement | null>(null)
    let acceptedSnapshot = stateSnapshot.value
    let documentRevision = 0
    let deleteApprovalPending = false
    let editMutationDepth = 0
    let drainingEditMutations = false
    const pendingEditMutations: (() => Promise<void>)[] = []
    let publishingState = false
    let stateDisposed = false
    let requestedStateCause: FlowStateChange['cause'] | undefined

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

    watch(
      stateSnapshot,
      (current) => {
        const previous = acceptedSnapshot

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

    const graph = computed(() => {
      void measurementRevision.value

      return createFlowGraph(
        activeDocument.value,
        getFlowMeasuredNodes(activeDocument.value, measurementState)
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

    const collectNodeHandles = (
      node: FlowNode,
      element: HTMLElement
    ): readonly MeasuredHandle[] => {
      const nodeBounds = element.getBoundingClientRect()
      const { zoom } = activeViewport.value
      const measurements: [string, MeasuredHandle][] = []

      for (const handleElement of element.querySelectorAll<HTMLElement>(
        '[data-handle-id]'
      )) {
        const handle = node.handles?.find(
          (candidate) => candidate.id === handleElement.dataset.handleId
        )

        if (
          handle === undefined ||
          handleElement.closest('[data-testid="flow-node"]') !== element ||
          handleElement.getClientRects().length === 0
        ) {
          continue
        }

        const bounds = handleElement.getBoundingClientRect()
        measurements.push([
          handle.id,
          {
            nodeId: node.id,
            handleId: handle.id,
            offset: {
              x: (bounds.left + bounds.width / 2 - nodeBounds.left) / zoom,
              y: (bounds.top + bounds.height / 2 - nodeBounds.top) / zoom,
            },
            width: bounds.width / zoom,
            height: bounds.height / zoom,
          },
        ])
      }

      return [...new Map(measurements).values()]
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
      const bounds = element.getBoundingClientRect()
      const previousRevision = measurementState.revision
      measurementState = applyNodeMeasurements(
        activeDocument.value,
        measurementState,
        [
          {
            nodeId: node.id,
            generation,
            width: bounds.width / activeViewport.value.zoom,
            height: bounds.height / activeViewport.value.zoom,
            handles: collectNodeHandles(node, element),
          },
        ]
      )

      if (measurementState.revision !== previousRevision) {
        measurementRevision.value += 1
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

          const bounds = currentElement.getBoundingClientRect()

          const generation = nodeGenerations.get(node.id)

          if (generation === undefined) {
            continue
          }

          measurements.push({
            nodeId: node.id,
            generation,
            handles: collectNodeHandles(node, currentElement),
            width: bounds.width / activeViewport.value.zoom,
            height: bounds.height / activeViewport.value.zoom,
          })
        }
      }

      if (measurements.length > 0) {
        const previousRevision = measurementState.revision
        measurementState = applyNodeMeasurements(
          document,
          measurementState,
          measurements
        )

        if (measurementState.revision !== previousRevision) {
          measurementRevision.value += 1
        }
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

      if (change.kind === 'selection-set') {
        const selected = applySelectionSetChange(activeDocument.value, change)

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

      if (stateDisposed) {
        return
      }

      if (hasSplitModel || props.documentMode === 'controlled') {
        let next: FlowDocument | undefined

        if (change.kind === 'node-position') {
          next = applyNodePositionChange(activeDocument.value, change)
        } else if (change.kind === 'node-bounds') {
          next = applyNodeBoundsChange(activeDocument.value, change)
        } else if (change.kind === 'selection-set') {
          next = applySelectionSetChange(activeDocument.value, change)
        } else if (change.kind === 'edge-add') {
          next = {
            ...activeDocument.value,
            edges: [...activeDocument.value.edges, change.edge],
          }
        } else if (change.kind === 'edge-reconnect') {
          next = applyEdgeReconnectChange(activeDocument.value, change)
        }

        if (next !== undefined && hasSplitModel) {
          if (change.kind === 'node-position') {
            emit('update:nodes', next.nodes)
          }

          if (change.kind === 'edge-add') {
            emit('update:edges', next.edges)
          }
        } else if (next !== undefined) {
          emit('update:document', next)
        }

        return
      }

      if (change.kind === 'node-position') {
        const updated = applyNodePositionChange(activeDocument.value, change)

        if (updated !== undefined) {
          withStateCause('semantic-change', () => {
            ownedDocument.value = updated
          })
        }
      } else if (change.kind === 'edge-add') {
        withStateCause('semantic-change', () => {
          ownedDocument.value = {
            ...activeDocument.value,
            edges: [...activeDocument.value.edges, change.edge],
          }
        })
      } else if (change.kind === 'edge-reconnect') {
        const updated = applyEdgeReconnectChange(activeDocument.value, change)

        if (updated !== undefined) {
          withStateCause('semantic-change', () => {
            ownedDocument.value = updated
          })
        }
      } else if (change.kind === 'node-bounds') {
        const updated = applyNodeBoundsChange(activeDocument.value, change)

        if (updated !== undefined) {
          withStateCause('semantic-change', () => {
            ownedDocument.value = updated
          })
        }
      } else if (change.kind === 'selection-set') {
        const updated = applySelectionSetChange(activeDocument.value, change)

        if (updated !== undefined) {
          withStateCause('semantic-change', () => {
            ownedDocument.value = updated
          })
        }
      }
    }

    const updateDocument = (next: FlowDocument): void => {
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

    const pressedKeys = new Set<string>()

    const endNodeDrag = (
      active: DragSession,
      status: 'accepted' | 'proposed' | 'cancelled',
      reason?: string
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
    }

    const selectNodeForDrag = (node: FlowNode): void => {
      if (!props.selectNodesOnDrag || node.selectable === false) {
        return
      }

      const selectedNodeIds = activeDocument.value.nodes
        .filter((candidate) => candidate.selectable !== false)
        .filter((candidate) => candidate.id === node.id || candidate.selected)
        .map(({ id }) => id)

      const edgeIds = activeDocument.value.edges
        .filter((edge) => edge.selected === true)
        .map(({ id }) => id)

      publish({ kind: 'selection-set', nodeIds: selectedNodeIds, edgeIds })
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
          emit('connectEnd', port.payload)
          break
        }

        case 'reconnectEnd': {
          emit('reconnectEnd', port.payload)
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
      next: Viewport,
      initiator: ViewportInitiator
    ): ViewportStep => {
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
        bounds.height
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
      const validTarget = decodeViewportRequestTarget(target)
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

    const fitView = (
      options?: ViewportAnimationOptions & {
        padding?: ViewportPadding
        nodes?: 'all' | 'selected' | readonly string[]
      }
    ) => {
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

      let selectedIds:
        | Set<(typeof activeDocument.value.nodes)[number]['id']>
        | undefined

      if (nodeSelection === 'selected') {
        selectedIds = new Set(
          activeDocument.value.nodes
            .filter(({ selected }) => selected === true)
            .map(({ id }) => id)
        )
      } else if (Array.isArray(nodeSelection)) {
        selectedIds = new Set(
          activeDocument.value.nodes
            .filter(({ id }) => nodeSelection.includes(id))
            .map(({ id }) => id)
        )
      }

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

      const transaction = resolveInput(currentDocument)

      const result = await Effect.runPromise(
        prepareFlowEdit(currentDocument, transaction)
      )

      if (stateDisposed) {
        throw new Error('FlowCanvasDisposed')
      }

      if (hasSplitModel || props.documentMode === 'controlled') {
        const proposal: FlowChange = {
          kind: 'edit-proposal',
          document: result.document,
          deletion: result.deletion,
        }

        emit('change', proposal)

        if (hasSplitModel) {
          emit('update:nodes', result.document.nodes)
          emit('update:edges', result.document.edges)
        } else {
          emit('update:document', result.document)
        }

        return result
      }

      emit('change', {
        kind: 'edit-proposal',
        document: result.document,
        deletion: result.deletion,
      })

      withStateCause('semantic-change', () => {
        ownedDocument.value = result.document
      })

      return result
    }

    const applyEditResolved = (
      resolveInput: (document: FlowDocument) => FlowEditTransactionInput
    ): Promise<FlowEditResult> => {
      if (editMutationDepth === 0 && !drainingEditMutations) {
        return applyEditResolvedNow(resolveInput)
      }

      const pending = Promise.withResolvers<FlowEditResult>()

      pendingEditMutations.push(async () => {
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
        positions
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
      const position = resizePreviewGraph(change).nodes.get(
        change.nodeId
      )?.absolutePosition

      if (position === undefined) {
        return
      }

      element.style.left = `${position.x}px`
      element.style.top = `${position.y}px`
      element.style.width = `${change.size.width}px`
      element.style.height = `${change.size.height}px`
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

      const payload: ConnectionEndPayload =
        result.kind === 'success'
          ? {
              status: result.status,
              reason: result.reason,
              connection: result.connection,
            }
          : { status: result.kind, reason: result.reason }

      const ports: TerminalPort[] = [
        {
          kind:
            claim.lifecycle.kind === 'connect' ? 'connectEnd' : 'reconnectEnd',
          payload,
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
        active.element.style.removeProperty('transform')
      }

      if (active.kind === 'resize' || active.kind === 'keyboard-resize') {
        previewNodeBounds(active.element, {
          kind: 'node-bounds',
          nodeId: active.node.id,
          position: active.position,
          size: active.size,
          childPositions: [],
        })
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
          handles: (node.handles ?? []).map(({ id, kind }) => `${kind}:${id}`),
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

    const editor: FlowEditor = {
      document: computed(() => stateSnapshot.value.document),
      viewport: computed(() => stateSnapshot.value.viewport),
      snapshot: stateSnapshot,
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
      connectionPreview: computed(() => {
        const initiating = currentConnectionPreviewOwner()

        if (initiating === undefined) {
          return null
        }

        const preview = connectionPreviewState(initiating)

        return preview === null
          ? null
          : createConnectionPreviewSnapshot(preview)
      }),
      subscribeState,
      subscribeSelection,
      observeKeyPress: observeOwnedKeyPress,
      dispatch,
      updateDocument,
      applyEdit,
      applyEditResolved,
      updateViewport,
      getViewport,
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
      getInternalNode: (id) => {
        const node = activeDocument.value.nodes.find(
          (candidate) => candidate.id === id
        )

        return node === undefined
          ? undefined
          : getFlowInternalNode(activeDocument.value, measurementState, node.id)
      },
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
                  const bounds = element.getBoundingClientRect()

                  const size = {
                    width: bounds.width / activeViewport.value.zoom,
                    height: bounds.height / activeViewport.value.zoom,
                  }

                  if (!isResizePreviewNode(node.id)) {
                    samples.push({
                      nodeId: node.id,
                      generation,
                      ...size,
                      handles: collectNodeHandles(node, element),
                    })
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
              measurementState = applyNodeMeasurements(
                activeDocument.value,
                measurementState,
                samples
              )
              measurementRevision.value += 1
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

    provide(FlowEditorKey, editor)
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
        )
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
    expose({ editor })
    onMounted(() => emit('init', editor))

    const nodePosition = (node: FlowNode): { x: number; y: number } =>
      graph.value.nodes.get(node.id)?.absolutePosition ?? node.position

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

      const handle = node?.handles?.find(
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
        node.connectable === false ||
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
                `${node.id}:${(node.handles ?? [])
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
          (connectionMode.value === 'strict' &&
            source.handle.kind !== 'source' &&
            pending.sourceAssociation.kind === 'fresh')
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
        resolved.node.draggable === false
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

    const promoteNode = (pending: DragSession): DragSession | undefined => {
      if (pending.kind !== 'node-pending' || !continueNode(pending)) {
        return undefined
      }

      const { threshold: _threshold, ...fields } = pending
      const active: DragSession = { ...fields, kind: 'node' }
      session.value = active
      emit('nodeDragStart', active.node)

      if (!continueNode(active)) {
        return undefined
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
          ? promoteNode(active)
          : undefined
      }

      if (dragging === undefined || !continueNode(dragging)) {
        return
      }

      const dx = (event.clientX - dragging.startX) / activeViewport.value.zoom

      const dy = (event.clientY - dragging.startY) / activeViewport.value.zoom

      active.element.style.transform = `translate(${dx}px, ${dy}px)`
      emit('nodeDrag', {
        node: active.node,
        position: { x: active.originX + dx, y: active.originY + dy },
      })
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
      }

      session.value = pending

      if (pending.threshold === 0) {
        promoteNode(pending)
      }
    }

    const onPointerDown = (event: PointerEvent, node: FlowNode): void => {
      if (stateDisposed || event.button !== 0 || session.value !== undefined) {
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

      if (handleId === undefined && node.draggable === false) {
        return
      }

      const { currentTarget } = event

      if (!(currentTarget instanceof HTMLElement)) {
        return
      }

      if (handleId === undefined) {
        if (!isNodePointerTargetAllowed(currentTarget, target)) {
          return
        }

        admitNode(node, currentTarget, event)

        return
      }

      const sourceHandle = node.handles?.find(({ id }) => id === handleId)

      if (
        sourceHandle === undefined ||
        connectionDragThreshold === undefined ||
        (connectionMode.value === 'strict' &&
          sourceHandle.kind !== 'source' &&
          clickConnection.value === undefined)
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

      const targetHandle = targetNode?.handles?.find(
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
        resolved === undefined
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
      const sourceHandle = sourceNode.handles?.find(
        ({ id }) => id === sourceHandleId
      )

      const targetNode = activeDocument.value.nodes.find(
        ({ id }) => id === targetNodeId
      )

      const targetHandle = targetNode?.handles?.find(
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

      publish({
        kind: 'edge-add',
        edge: applyDefaultEdgeOptions(
          nextConnectionEdge(activeDocument.value, validated.value),
          defaultEdgeOptions.value
        ),
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

        return (node.handles ?? []).flatMap((handle) => {
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

        if (Exit.isSuccess(result)) {
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
            getFlowMeasuredNodes(activeDocument.value, measurementState)
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

        const result = writeViewport(
          panViewport(active.viewportStart, {
            x: event.clientX - active.startX,
            y: event.clientY - active.startY,
          }),
          { kind: 'pan', active }
        )

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
          ) >= 2
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

      detachSessionView(active)

      if (active.kind === 'node-pending') {
        return
      }

      const dx = (event.clientX - active.startX) / activeViewport.value.zoom
      const dy = (event.clientY - active.startY) / activeViewport.value.zoom

      if (!nodeStillValid(active)) {
        endNodeDrag(active, 'cancelled', 'node-frame-invalid')

        return
      }

      publish({
        kind: 'node-position',
        nodeId: active.node.id,
        position: { x: active.originX + dx, y: active.originY + dy },
      })
      endNodeDrag(
        active,
        documentControlMode() === 'controlled' ? 'proposed' : 'accepted',
        'drag-complete'
      )
    }

    // eslint-disable-next-line complexity -- handles keyboard selection as one session lifecycle.
    const onKeyDown = (event: KeyboardEvent): void => {
      if (stateDisposed) {
        return
      }

      const { target } = event

      if (
        target instanceof Element &&
        target.closest('.flow-vue-minimap') !== null
      ) {
        return
      }

      pressedKeys.add(event.key)
      pressedKeys.add(event.code)

      const active = session.value

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
          graphNode.node.selectable !== false &&
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
      cancelActiveSession('blur')
    }

    watch(
      () =>
        [
          connectionMode.value,
          connectionRadius.value,
          props.autoPanOnConnect,
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

    // eslint-disable-next-line complexity -- The public pointer admission entry preserves the existing selection, pan and interactive-target policies.
    const onCanvasPointerDown = (event: PointerEvent): void => {
      if (stateDisposed) {
        return
      }

      const { target, currentTarget } = event

      if (
        event.button !== 0 ||
        session.value !== undefined ||
        !(target instanceof Element) ||
        !(currentTarget instanceof HTMLElement) ||
        target.closest('[data-node-id]') !== null
      ) {
        return
      }

      const excludedFromPan = hasClassAncestor(target, props.noPanClassName)
      const excludedFromDrag = hasClassAncestor(target, props.noDragClassName)

      const panKeyRequired = props.panActivationKeyCode
      const panKeyActive = activationKeyIsPressed(panKeyRequired)

      const isSelection = event.shiftKey || props.selectionOnDrag

      if (
        excludedFromDrag ||
        (!isSelection && (excludedFromPan || !props.panOnDrag || !panKeyActive))
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
            captureTarget: currentTarget,
            startX,
            startY,
            viewportStart: activeViewport.value,
          }

      const admitted = session.value
      currentTarget.setPointerCapture?.(event.pointerId)

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

      event.preventDefault()
    }

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

      if (
        (props.panOnScroll &&
          !activationKeyIsPressed(props.panActivationKeyCode)) ||
        (!props.panOnScroll &&
          props.zoomOnScroll &&
          !activationKeyIsPressed(props.zoomActivationKeyCode))
      ) {
        return
      }

      if (!props.panOnScroll && !props.zoomOnScroll) {
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

      if (props.panOnScroll) {
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
      } else if (props.zoomOnScroll) {
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
        session.value !== undefined
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

      const size = activeKeyboardResize?.change.size ?? node.size

      const Node: NodeVisual =
        props.nodeTypes?.[node.type ?? 'default'] ??
        props.nodeComponent ??
        DefaultNode

      const nodeSlots =
        slots.node === undefined
          ? undefined
          : { default: () => slots.node?.({ node }) }

      const handleChildren = (node.handles ?? []).map((handle) =>
        h('button', {
          key: handle.id,
          type: 'button',
          class: ['flow-vue-handle', `flow-vue-handle-${handle.side}`],
          'data-handle-id': handle.id,
          'data-handle-kind': handle.kind,
          'aria-label': `${handle.kind} handle ${handle.id}`,
          onKeydown: (event: KeyboardEvent) =>
            onConnectionHandleKeydown(node, handle, event),
        })
      )

      const resizeChildren =
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
                        )
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

      return h(
        'div',
        {
          key: node.id,
          class: 'flow-vue-node',
          'data-testid': 'flow-node',
          'data-node-id': node.id,
          tabindex: node.focusable === false ? -1 : 0,
          ref: nodeRef(node),
          style,
          onPointerdown: (event: PointerEvent) => onPointerDown(event, node),
          onMousedown: () => emit('nodeMouseDown', node),
          onMouseup: () => emit('nodeMouseUp', node),
          onMousemove: () => emit('nodeMouseMove', node),
          onMouseenter: () => emit('nodeMouseEnter', node),
          onMouseleave: () => emit('nodeMouseLeave', node),
          onClick: () => emit('nodeClick', node),
          onDblclick: () => emit('nodeDoubleClick', node),
          onContextmenu: () => emit('nodeContextMenu', node),
          onKeydown: (event: KeyboardEvent) => {
            if (
              event.target !== event.currentTarget ||
              node.selectable === false ||
              (event.key !== ' ' && event.key !== 'Enter')
            ) {
              return
            }

            event.preventDefault()

            const nodeIds = activeDocument.value.nodes
              .filter(
                (candidate) =>
                  candidate.selectable !== false &&
                  (candidate.id === node.id
                    ? candidate.selected !== true
                    : candidate.selected === true)
              )
              .map(({ id }) => id)

            const edgeIds = activeDocument.value.edges
              .filter((edge) => edge.selected === true)
              .map(({ id }) => id)

            publish({ kind: 'selection-set', nodeIds, edgeIds })
          },
        },
        [
          h(
            NodeWithIdContext,
            { node, visual: Node, key: `visual-${node.id}` },
            nodeSlots
          ),
          ...handleChildren,
          ...resizeChildren,
        ]
      )
    }

    const renderMarkers = (): VNode[] => {
      const markers = new Map<string, VNode>()

      for (const storedEdge of activeDocument.value.edges) {
        const edge = withEdgeDefaults(storedEdge)
        const stroke = edge.stroke ?? '#64748b'

        for (const kind of [edge.markerStart, edge.markerEnd]) {
          if (kind === undefined) {
            continue
          }

          const id = markerId(canvasId, kind, stroke)

          if (markers.has(id)) {
            continue
          }

          markers.set(
            id,
            h(
              'marker',
              {
                id,
                key: id,
                markerWidth: 10,
                markerHeight: 10,
                refX: 9,
                refY: 5,
                orient: 'auto-start-reverse',
                markerUnits: 'strokeWidth',
                viewBox: '0 0 10 10',
              },
              [
                h('path', {
                  d:
                    kind === 'arrowclosed'
                      ? 'M 0 0 L 10 5 L 0 10 z'
                      : 'M 0 0 L 10 5 L 0 10',
                  fill: kind === 'arrowclosed' ? stroke : 'none',
                  stroke,
                }),
              ]
            )
          )
        }
      }

      return [...markers.values()]
    }

    const resolveRenderedEdge = (edge: FlowEdge) => {
      const resolved = resolveEdgeHandles(activeDocument.value, edge)

      if (resolved === undefined) {
        return
      }

      const sourceNode = graph.value.nodes.get(resolved.sourceNode.id)
      const targetNode = graph.value.nodes.get(resolved.targetNode.id)

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
        path: edgePath(
          edge.path,
          sourceAnchor,
          targetAnchor,
          resolved.sourceHandle.side,
          resolved.targetHandle.side
        ),
        sourceNode,
        targetNode,
        sourceAnchor,
        targetAnchor,
      }
    }

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
        'pointer-events': 'stroke',
        tabindex: edge.focusable === false ? -1 : 0,
        role: edge.selectable === false ? 'img' : 'button',
        'aria-label':
          edge.ariaLabel ?? `Edge from ${sourceLabel} to ${targetLabel}`,
        onPointerdown: (event: PointerEvent) => {
          if (event.button === 0) {
            event.preventDefault()
            emit('edgeClick', edge)
          }
        },
        onMousedown: () => emit('edgeMouseDown', edge),
        onMouseup: () => emit('edgeMouseUp', edge),
        onMousemove: () => emit('edgeMouseMove', edge),
        onMouseenter: () => emit('edgeMouseEnter', edge),
        onMouseleave: () => emit('edgeMouseLeave', edge),
        onDblclick: () => emit('edgeDoubleClick', edge),
        onContextmenu: () => emit('edgeContextMenu', edge),
        onKeydown: (event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            event.stopPropagation()
            emit('edgeClick', edge)
          }
        },
      })

    const edgeMarkers = (edge: FlowEdge) => {
      const stroke = edge.stroke ?? '#64748b'

      return {
        markerStart:
          edge.markerStart === undefined
            ? undefined
            : `url(#${markerId(canvasId, edge.markerStart, stroke)})`,
        markerEnd:
          edge.markerEnd === undefined
            ? undefined
            : `url(#${markerId(canvasId, edge.markerEnd, stroke)})`,
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

      const offset = reconnectAnchorOffsets[handle.side]

      return { x: anchor.x + offset.x, y: anchor.y + offset.y }
    }

    // eslint-disable-next-line complexity
    const renderEdge = (edge: FlowEdge): VNode | null => {
      const source = graph.value.nodes.get(edge.source)
      const target = graph.value.nodes.get(edge.target)

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

      const geometry = resolveRenderedEdge(edge)
      const path = geometry?.path
      const sourceNode = geometry?.sourceNode
      const targetNode = geometry?.targetNode

      let edgeChildren: VNode[] = []

      const { markerStart, markerEnd } = edgeMarkers(edge)

      if (path !== undefined && Edge !== undefined) {
        edgeChildren = [
          h(Edge, { edge, path, markerStart, markerEnd }, edgeSlots),
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
            path,
            sourceNode.node.label,
            targetNode.node.label
          )
        )

        if (edge.selected === true) {
          for (const endpoint of ['source', 'target'] as const) {
            if (!canReconnectEdge(edge, endpoint)) {
              continue
            }

            const anchor =
              endpoint === 'source'
                ? geometry?.sourceAnchor
                : geometry?.targetAnchor

            if (anchor === undefined) {
              continue
            }

            edgeChildren.push(
              h('circle', {
                key: `reconnect-${endpoint}`,
                class: 'flow-vue-edge-reconnect-anchor',
                'data-testid': 'flow-edge-reconnect-anchor',
                'data-endpoint': endpoint,
                'data-edge-id': edge.id,
                tabindex: 0,
                role: 'button',
                'aria-label': `Reconnect ${endpoint} of edge ${edge.id}`,
                cx: reconnectAnchorPosition(edge, endpoint, anchor).x,
                cy: reconnectAnchorPosition(edge, endpoint, anchor).y,
                r: 7,
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

                  const resolved = resolveEdgeHandles(
                    activeDocument.value,
                    edge
                  )

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
                        `${candidate.id}:${(candidate.handles ?? [])
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
      }

      return h(
        'g',
        { key: edge.id, 'data-testid': 'flow-edge', 'data-edge-id': edge.id },
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

      const sourceNode = graph.value.nodes.get(resolved.sourceNode.id)
      const targetNode = graph.value.nodes.get(resolved.targetNode.id)

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
        edgeLabelPosition(
          source,
          target,
          edge.path ?? 'straight',
          resolved.sourceHandle.side,
          resolved.targetHandle.side
        )
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
          class: 'flow-vue-edge-label',
          'data-testid': 'flow-edge-label',
          'data-flow-edge-label': edge.id,
          style: {
            left: `${position.x}px`,
            top: `${position.y}px`,
          },
        },
        edge.label
      )
    }

    // eslint-disable-next-line complexity -- The complete raw authority and resource packet must be captured without callback-capable intermediate helpers.
    const captureDisposal = (): CapturedDisposal => {
      stateDisposed = true
      const active = session.value
      const retained = clickConnection.value
      const originalClaims = [...pendingConnectionClaims]
      const viewport = activeViewport.value
      const request = activeViewportRequest
      const observation = viewportObservation
      const resources: DisposalResource[] = []
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
        resources.push({
          kind: 'unobserve-canvas',
          observer: resizeObserver,
          element: canvas.value,
        })
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
      stateListeners.clear()
      stateQueue.length = 0
      pressedKeys.clear()

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

    const applyDisposalResource = (resource: DisposalResource): void => {
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

    return () => {
      const renderOwner = currentConnectionPreviewOwner()

      const renderPreview =
        renderOwner === undefined || props.connectionPreview === undefined
          ? null
          : connectionPreviewState(renderOwner)

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

      const connectionPreview = []

      if (connection !== undefined) {
        if (props.connectionPreview === undefined) {
          connectionPreview.push(
            h('path', {
              class: 'flow-vue-connection-preview',
              'data-testid': 'flow-connection-preview',
              d: straightEdgePath(connection.start, connection.pointer),
            })
          )
        } else if (renderPreview !== null) {
          connectionPreview.push(
            h(props.connectionPreview, { preview: renderPreview })
          )
        }
      }

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

      return h(
        'div',
        {
          ref: (element: Element | ComponentPublicInstance | null) => {
            if (stateDisposed) {
              return
            }

            if (element instanceof HTMLElement && canvas.value !== element) {
              if (canvas.value !== undefined) {
                resizeObserver.unobserve(canvas.value)
              }

              canvas.value = element
              resizeObserver.observe(element)
              globalThis.addEventListener('keydown', onKeyDown, true)
              globalThis.addEventListener('blur', onWindowBlur)
              globalThis.addEventListener('keyup', onWindowKeyUp, true)
            }
          },
          class: 'flow-vue-canvas',
          'data-testid': 'flow-canvas',
          // eslint-disable-next-line complexity -- Movement dispatches the closed session union with owner checks after observable effects.
          onPointermove: (event: PointerEvent) => {
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
              const pointer = pointerInFlow(event)
              const updated: OwnedSelection = { ...active, pointer }
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
              }

              session.value = updated

              const initiating: ConnectionPreviewOwner = {
                kind: 'physical',
                active: updated,
              }

              const preview = connectionPreviewState(initiating)

              if (preview !== null && previewOwnerLive(initiating)) {
                if (updated.reconnect === undefined) {
                  emit('connectProgress', { preview })
                } else {
                  emit('reconnectProgress', { preview })
                }
              }

              return
            }

            moveNode(active, event)
          },
          onPointerdown: onCanvasPointerDown,
          onMousedown: (event: MouseEvent) => {
            const { target } = event

            if (
              target instanceof Element &&
              target.closest('[data-node-id], [data-flow-edge-hit]') === null
            ) {
              emit('paneMouseDown', clientToFlow(event.clientX, event.clientY))
            }
          },
          onMouseup: (event: MouseEvent) => {
            const { target } = event

            if (
              target instanceof Element &&
              target.closest('[data-node-id], [data-flow-edge-hit]') === null
            ) {
              emit('paneMouseUp', clientToFlow(event.clientX, event.clientY))
            }
          },
          onClick: (event: MouseEvent) => {
            const { target } = event

            if (
              target instanceof Element &&
              target.closest('[data-node-id], [data-flow-edge-hit]') === null
            ) {
              emit('paneClick', clientToFlow(event.clientX, event.clientY))
            }
          },
          onMousemove: (event: MouseEvent) => {
            const { target } = event

            if (
              target instanceof Element &&
              target.closest('[data-node-id], [data-flow-edge-hit]') === null
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
              target.closest('[data-node-id], [data-flow-edge-hit]') === null
            ) {
              emit(
                'paneContextMenu',
                clientToFlow(event.clientX, event.clientY)
              )
            }
          },
          onDblclick: (event: MouseEvent) => {
            const { target } = event

            if (
              !props.zoomOnDoubleClick ||
              !activationKeyIsPressed(props.zoomActivationKeyCode) ||
              !(target instanceof Element) ||
              target.closest('[data-node-id], [data-flow-edge-hit]') !== null
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
                  activeViewport.value.zoom * 1.2,
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
            [
              h('defs', renderMarkers()),
              ...activeDocument.value.edges.map((edge) =>
                renderEdge(withEdgeDefaults(edge))
              ),
              ...connectionPreview,
            ]
          ),
          ...connectionKeyboardStatus,
          ...selectionPreview,
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
          h(
            'div',
            {
              class: 'flow-vue-edge-labels',
              'aria-hidden': 'true',
              style: {
                transform: `translate(${activeViewport.value.x}px, ${activeViewport.value.y}px) scale(${activeViewport.value.zoom})`,
              },
            },
            activeDocument.value.edges.map((edge) =>
              renderEdgeLabel(withEdgeDefaults(edge))
            )
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
          slots.default?.({}),
        ]
      )
    }
  },
})
