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
  NodeExtentSchema,
  canReconnectEdge,
  reconnectFlowEdge,
  normalizeFlowConnection,
  nearestConnectionTarget,
  ConnectionModeSchema,
  ConnectionRadiusSchema,
  selectionAutoPanDelta,
  NodeIdSchema,
  HandleIdSchema,
  EdgeIdSchema,
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

interface DragSession {
  readonly kind: 'node'
  readonly pointerId: number
  readonly node: FlowNode
  readonly element: HTMLElement
  readonly captureTarget: HTMLElement
  readonly startX: number
  readonly startY: number
  readonly originX: number
  readonly originY: number
}

interface ConnectionSession {
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
}

interface NodePositionStyle {
  left: string
  top: string
  width?: string
  height?: string
}

type Session =
  | DragSession
  | ConnectionSession
  | PanSession
  | SelectionSession
  | ResizeSession
  | KeyboardResizeSession

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
    nodeDragEnd: (_payload: {
      readonly node: FlowNode
      readonly status: 'accepted' | 'proposed' | 'cancelled'
      readonly reason?: string
    }) => true,
    nodeDragStop: (_payload: {
      readonly node: FlowNode
      readonly status: 'accepted' | 'proposed' | 'cancelled'
      readonly reason?: string
    }) => true,
    connectStart: (_payload: {
      readonly node: FlowNode
      readonly handleId: FlowHandle['id']
      readonly activation: 'pointer' | 'keyboard' | 'click'
    }) => true,
    connectProgress: (_payload: { readonly preview: ConnectionPreviewState }) =>
      true,
    connect: (_connection: FlowConnection) => true,
    connectEnd: (_payload: {
      readonly status: 'accepted' | 'proposed' | 'rejected' | 'cancelled'
      readonly reason: string
      readonly connection?: FlowConnection
    }) => true,
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
    reconnectEnd: (_payload: {
      readonly status: 'accepted' | 'proposed' | 'rejected' | 'cancelled'
      readonly reason: string
      readonly connection?: FlowConnection
    }) => true,
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
    selectionEnd: (_payload: {
      readonly status: 'accepted' | 'proposed' | 'cancelled'
      readonly reason: string
    }) => true,
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
    clickConnectEnd: (_payload: {
      readonly status: 'accepted' | 'proposed' | 'rejected' | 'cancelled'
      readonly reason: string
    }) => true,
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
    selectionDragStop: (_payload: {
      readonly status: 'accepted' | 'proposed' | 'cancelled'
      readonly reason: string
    }) => true,
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

    const session = shallowRef<Session>()
    const clickConnection = shallowRef<ConnectionSession>()
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

    const measureNodeHandles = (node: FlowNode, element: HTMLElement): void => {
      const generation = nodeGenerations.get(node.id)

      if (
        generation === undefined ||
        stateDisposed ||
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

        if (node !== undefined) {
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

      emit('change', change)

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

    let activeViewportRequest:
      | {
          readonly requestId: number
          readonly cancelFrame: () => void
          readonly settle: (result: ViewportOperationResult) => void
        }
      | undefined

    let viewportObservationActive = false
    let viewportGestureActive = false
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

    let connectionAutoPanActive = false
    const pressedKeys = new Set<string>()

    let activeConnectionLifecycle:
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
      | undefined

    let activeNodeDrag: FlowNode | undefined
    let nodeDragSelectionApplied = false
    let activeSelection = false
    let validatorFailureReported = false

    const endConnectionLifecycle = (
      status: 'accepted' | 'proposed' | 'rejected' | 'cancelled',
      reason: string,
      connection?: FlowConnection
    ): void => {
      const active = activeConnectionLifecycle

      if (active === undefined) {
        return
      }

      activeConnectionLifecycle = undefined

      if (connection === undefined) {
        if (active.kind === 'connect') {
          emit('connectEnd', { status, reason })
        } else {
          emit('reconnectEnd', { status, reason })
        }
      } else if (active.kind === 'connect') {
        emit('connectEnd', { status, reason, connection })
      } else {
        emit('reconnectEnd', { status, reason, connection })
      }

      if (active.kind === 'connect' && active.activation === 'click') {
        emit('clickConnectEnd', { status, reason })
      }
    }

    const endNodeDrag = (
      status: 'accepted' | 'proposed' | 'cancelled',
      reason?: string
    ): void => {
      const node = activeNodeDrag

      if (node === undefined) {
        return
      }

      activeNodeDrag = undefined
      nodeDragSelectionApplied = false

      if (reason === undefined) {
        emit('nodeDragEnd', { node, status })
        emit('nodeDragStop', { node, status })
      } else {
        emit('nodeDragEnd', { node, status, reason })
        emit('nodeDragStop', { node, status, reason })
      }
    }

    const endSelection = (
      status: 'accepted' | 'proposed' | 'cancelled',
      reason: string
    ): void => {
      if (!activeSelection) {
        return
      }

      activeSelection = false
      emit('selectionEnd', { status, reason })
      emit('selectionDragStop', { status, reason })
    }

    const selectNodeForDrag = (node: FlowNode): void => {
      if (
        !props.selectNodesOnDrag ||
        node.selectable === false ||
        nodeDragSelectionApplied
      ) {
        return
      }

      nodeDragSelectionApplied = true

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

    const validateConnectionAtBoundary = (
      candidate: FlowConnection
    ): boolean => {
      try {
        return props.isValidConnection(candidate)
      } catch (error) {
        const failure =
          error instanceof Error ? error : new Error(String(error))

        if (!validatorFailureReported) {
          validatorFailureReported = true
          recordFlowFailure(
            'Vue connection validator failed',
            FlowSpan.editFailure,
            {
              [FlowAttribute.failureName]: failure.name,
              [FlowAttribute.failureMessage]: failure.message,
            }
          )
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

    const beginViewportObservation = (viewport: Viewport): void => {
      if (viewportObservationActive) {
        return
      }

      viewportObservationActive = true
      emit('viewportStart', viewport)
      emit('moveStart', viewport)
    }

    const changeViewportObservation = (viewport: Viewport): void => {
      emit('viewportChange', viewport)
      emit('move', viewport)
    }

    const endViewportObservation = (
      viewport: Viewport,
      status: ViewportOperationResult['status']
    ): void => {
      if (!viewportObservationActive) {
        return
      }

      viewportObservationActive = false
      emit('viewportEnd', viewport, status)
      emit('moveEnd', viewport, status)
    }

    const settleViewportRequest = (
      status: ViewportOperationResult['status'],
      viewport = activeViewport.value
    ): void => {
      const request = activeViewportRequest

      if (request === undefined) {
        return
      }

      activeViewportRequest = undefined
      request.cancelFrame()
      request.settle({ requestId: request.requestId, status, viewport })
      endViewportObservation(viewport, status)
    }

    const updateViewportValue = (next: Viewport): void => {
      if (props.viewportMode === 'controlled') {
        rememberViewportProposal(next)
        emit('update:viewport', next)
      } else {
        withStateCause('viewport-update', () => {
          ownedViewport.value = next
        })
      }
    }

    const updateViewport = (next: Viewport): void => {
      settleViewportRequest('superseded')
      beginViewportObservation(activeViewport.value)
      changeViewportObservation(next)
      updateViewportValue(next)

      if (!viewportGestureActive) {
        endViewportObservation(
          next,
          props.viewportMode === 'controlled' ? 'proposed' : 'accepted'
        )
      }
    }

    const stopConnectionAutoPan = (
      status: ViewportOperationResult['status']
    ): void => {
      if (!connectionAutoPanActive) {
        return
      }

      connectionAutoPanActive = false
      viewportGestureActive = false
      endViewportObservation(activeViewport.value, status)
    }

    const autoPanConnection = (clientX: number, clientY: number): void => {
      if (!props.autoPanOnConnect) {
        return
      }

      const bounds = canvas.value?.getBoundingClientRect()

      if (bounds === undefined) {
        return
      }

      const delta = selectionAutoPanDelta(
        { x: clientX - bounds.left, y: clientY - bounds.top },
        bounds.width,
        bounds.height
      )

      if (delta.x === 0 && delta.y === 0) {
        return
      }

      if (!connectionAutoPanActive) {
        connectionAutoPanActive = true
        viewportGestureActive = true
        beginViewportObservation(activeViewport.value)
      }

      updateViewport(panViewport(activeViewport.value, delta))
    }

    watch(
      () => props.viewport,
      (next, previous) => {
        if (
          props.viewportMode === 'controlled' &&
          next !== undefined &&
          next !== previous
        ) {
          const hadPendingRequest = activeViewportRequest !== undefined
          settleViewportRequest('superseded', next)

          if (consumeViewportAcknowledgement(next)) {
            return
          }

          if (!hadPendingRequest) {
            beginViewportObservation(previous ?? activeViewport.value)
            changeViewportObservation(next)
            endViewportObservation(next, 'accepted')
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
      const validTarget = S.decodeUnknownSync(ViewportSchema)(target)
      const requestId = allocateViewportRequestId()
      settleViewportRequest('superseded')

      if (!viewportInitialized()) {
        return Promise.resolve({
          requestId,
          status: 'unavailable',
          viewport: activeViewport.value,
        })
      }

      if (viewportEquivalence(activeViewport.value, validTarget)) {
        return Promise.resolve({
          requestId,
          status: 'unchanged',
          viewport: validTarget,
        })
      }

      if (props.viewportMode === 'controlled') {
        beginViewportObservation(activeViewport.value)
        changeViewportObservation(validTarget)
        rememberViewportProposal(validTarget)
        emit('update:viewport', validTarget)
        endViewportObservation(validTarget, 'proposed')

        return Promise.resolve({
          requestId,
          status: 'proposed',
          viewport: validTarget,
        })
      }

      const start = activeViewport.value

      const prefersReducedMotion =
        globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ===
        true

      const duration = prefersReducedMotion
        ? 0
        : Math.max(0, validOptions.duration ?? 0)

      if (duration === 0) {
        beginViewportObservation(start)
        changeViewportObservation(validTarget)
        updateViewportValue(validTarget)
        endViewportObservation(validTarget, 'accepted')

        return Promise.resolve({
          requestId,
          status: 'accepted',
          viewport: validTarget,
        })
      }

      beginViewportObservation(start)

      const { promise, resolve } =
        Promise.withResolvers<ViewportOperationResult>()

      let frame = 0
      let startedAt: number | undefined

      const cancelFrame = (): void => {
        if (frame !== 0) {
          cancelAnimationFrame(frame)
        }
      }

      activeViewportRequest = { requestId, cancelFrame, settle: resolve }

      const tick = (timestamp: number): void => {
        if (activeViewportRequest?.requestId !== requestId || stateDisposed) {
          return
        }

        startedAt ??= timestamp
        const progress = Math.min(1, (timestamp - startedAt) / duration)

        const current = interpolateViewport(
          start,
          validTarget,
          progress,
          validOptions.easing
        )

        changeViewportObservation(current)
        withStateCause('viewport-update', () => {
          ownedViewport.value = current
        })

        if (progress >= 1) {
          settleViewportRequest('accepted', validTarget)
        } else {
          frame = requestAnimationFrame(tick)
        }
      }

      frame = requestAnimationFrame(tick)

      return promise
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

    const drainEditMutations = async (): Promise<void> => {
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
            // Owner mutations are serialized to preserve accepted revision order.
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
          void drainEditMutations()
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
        void drainEditMutations()
      }

      return pending.promise
    }

    const applyEdit = (
      transaction: FlowEditTransactionInput
    ): Promise<FlowEditResult> => applyEditResolved(() => transaction)

    // eslint-disable-next-line complexity -- one cleanup boundary settles every Vue session kind.
    const cleanupPreview = (
      active: Session | undefined = session.value,
      reason = 'superseded',
      terminal = true
    ): void => {
      if (terminal && active !== undefined) {
        if (active.kind === 'connection') {
          endConnectionLifecycle('cancelled', reason)
        } else if (active.kind === 'node') {
          endNodeDrag('cancelled', reason)
        } else if (active.kind === 'selection') {
          endSelection('cancelled', reason)
        }
      } else if (terminal) {
        endConnectionLifecycle('cancelled', reason)
      }

      if (active?.kind === 'node') {
        active.element.style.removeProperty('transform')
      }

      if (active?.kind === 'resize' || active?.kind === 'keyboard-resize') {
        active.element.style.left = `${active.position.x}px`
        active.element.style.top = `${active.position.y}px`
        active.element.style.width = `${active.size.width}px`
        active.element.style.height = `${active.size.height}px`
      }

      if (active?.captureTarget.hasPointerCapture?.(active.pointerId)) {
        active.captureTarget.releasePointerCapture?.(active.pointerId)
      }

      if (session.value === active) {
        session.value = undefined
      }
    }

    watch(
      () =>
        activeDocument.value.nodes.map((node) => ({
          id: node.id,
          handles: (node.handles ?? []).map(({ id, kind }) => `${kind}:${id}`),
        })),
      (nodes, previousNodes) => {
        const active = session.value
        const pending = clickConnection.value
        const nodeIds = nodes.map(({ id }) => id)

        const currentNodeIds = new Set(nodeIds)

        const nodeWasRemoved = previousNodes.some(
          ({ id }) => !currentNodeIds.has(id)
        )

        const sourceStillExists = (connection: ConnectionSession): boolean =>
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
          stopConnectionAutoPan('superseded')
        }

        if (pending !== undefined && !sourceStillExists(pending)) {
          endConnectionLifecycle('cancelled', 'node-removed')
          clickConnection.value = undefined
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
        const active = session.value

        const connection =
          active?.kind === 'connection' ? active : clickConnection.value

        if (connection === undefined) {
          return null
        }

        return createConnectionPreviewSnapshot(
          // The lazy computed getter runs after setup finishes and the local helper is initialized.
          // eslint-disable-next-line no-use-before-define
          connectionPreviewState(connection)
        )
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

                  samples.push({
                    nodeId: node.id,
                    generation,
                    ...size,
                    handles: collectNodeHandles(node, element),
                  })
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

    const onPointerDown = (event: PointerEvent, node: FlowNode): void => {
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

        session.value = {
          kind: 'node',
          pointerId: event.pointerId,
          node,
          element: currentTarget,
          captureTarget: currentTarget,
          startX: event.clientX,
          startY: event.clientY,
          originX: node.position.x,
          originY: node.position.y,
        }
        activeNodeDrag = node
        emit('nodeDragStart', node)

        recordFlowTelemetry('Started Vue node drag', FlowSpan.nodeDragStart, {
          [FlowAttribute.nodeId]: node.id,
          [FlowAttribute.inputKind]: 'pointer',
          [FlowAttribute.controlMode]: documentControlMode(),
        })
      } else {
        const source = graph.value.nodes.get(node.id)

        const sourceHandle = node.handles?.find(
          (candidate) => candidate.id === handleId
        )

        const measured = measuredHandles.value.get(node.id)?.get(handleId)

        if (
          source === undefined ||
          sourceHandle === undefined ||
          measured === undefined
        ) {
          return
        }

        const start = edgeAttachmentPosition(
          source.absolutePosition,
          sourceHandle,
          measured
        )

        const bounds = canvas.value?.getBoundingClientRect()

        const viewport = activeViewport.value

        session.value = {
          kind: 'connection',
          pointerId: event.pointerId,
          captureTarget: currentTarget,
          sourceNode: node,
          sourceHandle: sourceHandle.id,
          start,
          pointer:
            bounds === undefined
              ? start
              : {
                  x: (event.clientX - bounds.left - viewport.x) / viewport.zoom,
                  y: (event.clientY - bounds.top - viewport.y) / viewport.zoom,
                },
        }

        if (activeConnectionLifecycle === undefined) {
          validatorFailureReported = false
          activeConnectionLifecycle = {
            kind: 'connect',
            activation: 'pointer',
            node,
            handleId: sourceHandle.id,
          }
          emit('connectStart', {
            node,
            handleId: sourceHandle.id,
            activation: 'pointer',
          })
        }

        recordFlowTelemetry(
          'Started Vue connection',
          FlowSpan.connectionStart,
          {
            [FlowAttribute.nodeId]: node.id,
            [FlowAttribute.handleId]: sourceHandle.id,
            [FlowAttribute.inputKind]: 'pointer',
            [FlowAttribute.controlMode]: documentControlMode(),
          }
        )
      }

      currentTarget.setPointerCapture?.(event.pointerId)
    }

    const finishReconnection = (
      active: ConnectionSession,
      targetNodeId: string,
      targetHandleId: string
    ): 'accepted' | 'proposed' | 'rejected' => {
      if (active.reconnect === undefined) {
        return 'rejected'
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
        return 'rejected'
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
        !validateConnectionAtBoundary(normalized)
      ) {
        return 'rejected'
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
        const status =
          documentControlMode() === 'controlled' ? 'proposed' : 'accepted'

        emit('reconnect', { edge: result.value, connection: normalized })
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
        endConnectionLifecycle(status, 'valid-reconnection', normalized)

        return status
      }

      return 'rejected'
    }

    const proposeConnection = (
      sourceNode: FlowNode,
      sourceHandleId: string,
      targetNodeId: string,
      targetHandleId: string
    ): 'accepted' | 'proposed' | 'rejected' => {
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
        return 'rejected'
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
        !validateConnectionAtBoundary(validated.value)
      ) {
        return 'rejected'
      }

      const status =
        documentControlMode() === 'controlled' ? 'proposed' : 'accepted'

      emit('connect', validated.value)
      publish({
        kind: 'edge-add',
        edge: applyDefaultEdgeOptions(
          nextConnectionEdge(activeDocument.value, validated.value),
          defaultEdgeOptions.value
        ),
      })
      endConnectionLifecycle(status, 'valid-connection', validated.value)

      return status
    }

    const connectionTargetAt = (
      clientX: number,
      clientY: number,
      source: ConnectionSession
    ): { readonly nodeId: string; readonly handleId: string } | undefined => {
      const targetElement = document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>('[data-handle-id]')

      const directNodeId =
        targetElement?.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId

      const directHandleId = targetElement?.dataset.handleId

      if (directNodeId !== undefined && directHandleId !== undefined) {
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

    const connectionPreviewState = (
      active: ConnectionSession
    ): ConnectionPreviewState => {
      const bounds = canvas.value?.getBoundingClientRect()

      if (bounds === undefined) {
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
          valid = validateConnectionAtBoundary(result.value)
        } else {
          normalized = candidate
          valid = false
        }
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

    // eslint-disable-next-line complexity
    const finishConnection = (
      event: PointerEvent,
      active: ConnectionSession
    ): void => {
      stopConnectionAutoPan(
        props.viewportMode === 'controlled' ? 'proposed' : 'accepted'
      )

      cleanupPreview(active, 'completed', false)

      const source = clickConnection.value ?? active
      const target = connectionTargetAt(event.clientX, event.clientY, source)

      if (target === undefined) {
        endConnectionLifecycle('rejected', 'no-target')

        return
      }

      if (active.reconnect !== undefined) {
        const status = finishReconnection(
          active,
          target.nodeId,
          target.handleId
        )

        endConnectionLifecycle(
          status,
          status === 'rejected' ? 'invalid-target' : 'valid-reconnection'
        )

        return
      }

      if (
        target.nodeId === source.sourceNode.id &&
        target.handleId === source.sourceHandle
      ) {
        if (!props.connectOnClick) {
          endConnectionLifecycle('rejected', 'click-connect-disabled')

          return
        }

        clickConnection.value = source

        if (
          activeConnectionLifecycle?.kind === 'connect' &&
          activeConnectionLifecycle.activation !== 'click'
        ) {
          activeConnectionLifecycle = {
            ...activeConnectionLifecycle,
            activation: 'click',
          }
          emit('clickConnectStart', {
            node: source.sourceNode,
            handleId: source.sourceHandle,
          })
        }

        return
      }

      clickConnection.value = undefined

      const status = proposeConnection(
        source.sourceNode,
        source.sourceHandle,
        target.nodeId,
        target.handleId
      )

      endConnectionLifecycle(
        status,
        status === 'rejected' ? 'invalid-target' : 'valid-connection'
      )
    }

    // eslint-disable-next-line complexity
    const startReconnection = (
      edge: FlowEdge,
      endpoint: 'source' | 'target',
      event: PointerEvent
    ): void => {
      const captureTarget = event.currentTarget
      const resolved = resolveEdgeHandles(activeDocument.value, edge)
      const sourceNode = graph.value.nodes.get(edge.source)
      const targetNode = graph.value.nodes.get(edge.target)

      const sourceMeasured = measuredHandles.value
        .get(edge.source)
        ?.get(resolved?.sourceHandle.id ?? '')

      const targetMeasured = measuredHandles.value
        .get(edge.target)
        ?.get(resolved?.targetHandle.id ?? '')

      if (
        (event.button !== 0 &&
          (event.button === 0 ||
            !Array.isArray(props.panOnDrag) ||
            !props.panOnDrag.includes(event.button))) ||
        edge.selected !== true ||
        !canReconnectEdge(edge, endpoint) ||
        session.value !== undefined ||
        clickConnection.value !== undefined ||
        resolved === undefined ||
        sourceNode === undefined ||
        targetNode === undefined ||
        sourceMeasured === undefined ||
        targetMeasured === undefined ||
        !(captureTarget instanceof SVGElement)
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

      const start = endpoint === 'source' ? targetAnchor : sourceAnchor
      const bounds = canvas.value?.getBoundingClientRect()
      const viewport = activeViewport.value

      session.value = {
        kind: 'connection',
        pointerId: event.pointerId,
        captureTarget,
        sourceNode: resolved.sourceNode,
        sourceHandle: resolved.sourceHandle.id,
        start,
        pointer:
          bounds === undefined
            ? start
            : {
                x: (event.clientX - bounds.left - viewport.x) / viewport.zoom,
                y: (event.clientY - bounds.top - viewport.y) / viewport.zoom,
              },
        reconnect: {
          edgeId: edge.id,
          endpoint,
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

      activeConnectionLifecycle = {
        kind: 'reconnect',
        activation: 'pointer',
        edge,
        endpoint,
      }
      validatorFailureReported = false
      emit('reconnectStart', { edge, endpoint, activation: 'pointer' })

      recordFlowTelemetry(
        'Started Vue edge reconnection',
        FlowSpan.edgeReconnectStart,
        {
          [FlowAttribute.edgeId]: edge.id,
          [FlowAttribute.edgeEndpoint]: endpoint,
          [FlowAttribute.inputKind]: 'pointer',
          [FlowAttribute.controlMode]: documentControlMode(),
        }
      )

      captureTarget.setPointerCapture?.(event.pointerId)
      event.preventDefault()
      event.stopPropagation()
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
      delta: { readonly x: number; readonly y: number }
    ): NodeBoundsChange | undefined => {
      const internal = getFlowInternalNode(
        activeDocument.value,
        measurementState,
        node.id
      )

      const width = node.size?.width ?? internal?.width
      const height = node.size?.height ?? internal?.height

      if (width === undefined || height === undefined) {
        return
      }

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
        positionStart: node.position,
        sizeStart: { width, height },
        delta,
        minimumSize: { width: 40, height: 24 },
        bounds,
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

    const onPointerUp = (event: PointerEvent): void => {
      const active = session.value

      if (
        active === undefined ||
        active.kind === 'keyboard-resize' ||
        active.pointerId !== event.pointerId
      ) {
        return
      }

      if (active.kind === 'connection') {
        finishConnection(event, active)

        return
      }

      if (active.kind === 'pan') {
        updateViewport(
          panViewport(active.viewportStart, {
            x: event.clientX - active.startX,
            y: event.clientY - active.startY,
          })
        )
        cleanupPreview(active)
        viewportGestureActive = false
        endViewportObservation(activeViewport.value, 'accepted')

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

          cleanupPreview(active, 'selection-complete', false)
          publish(selectionInRect(graph.value, rect, props.selectionMode))
          endSelection(
            documentControlMode() === 'controlled' ? 'proposed' : 'accepted',
            'selection-complete'
          )
        } else {
          endSelection('cancelled', 'no-selection-movement')
          cleanupPreview(active, 'no-selection-movement', false)
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

      cleanupPreview(active, 'drag-complete', false)
      const dx = (event.clientX - active.startX) / activeViewport.value.zoom
      const dy = (event.clientY - active.startY) / activeViewport.value.zoom

      if (Math.hypot(dx, dy) < 8) {
        endNodeDrag('cancelled', 'movement-threshold-not-reached')

        return
      }

      selectNodeForDrag(active.node)
      publish({
        kind: 'node-position',
        nodeId: active.node.id,
        position: { x: active.originX + dx, y: active.originY + dy },
      })
      endNodeDrag(
        documentControlMode() === 'controlled' ? 'proposed' : 'accepted',
        'drag-complete'
      )
    }

    // eslint-disable-next-line complexity -- handles keyboard selection as one session lifecycle.
    const onKeyDown = (event: KeyboardEvent): void => {
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
            cleanupPreview(active, 'selection-complete', false)
            publish(selectionInRect(graph.value, rect, props.selectionMode))
            endSelection(
              documentControlMode() === 'controlled' ? 'proposed' : 'accepted',
              'selection-complete'
            )
          } else {
            endSelection('cancelled', 'selection-below-minimum-size')
            cleanupPreview(active, 'selection-below-minimum-size', false)
          }

          return
        }

        const delta = keyboardResizeDelta(event.key, 5)

        if (delta !== undefined) {
          event.preventDefault()
          event.stopPropagation()
          session.value = {
            ...active,
            pointer: {
              x: active.pointer.x + delta.x,
              y: active.pointer.y + delta.y,
            },
          }
          emit('selectionProgress', {
            rect: {
              x: Math.min(active.start.x, active.pointer.x + delta.x),
              y: Math.min(active.start.y, active.pointer.y + delta.y),
              width: Math.abs(active.start.x - active.pointer.x - delta.x),
              height: Math.abs(active.start.y - active.pointer.y - delta.y),
            },
          })
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

          session.value = {
            kind: 'selection',
            pointerId: -1,
            captureTarget: nodeElement,
            startX: 0,
            startY: 0,
            start,
            pointer: start,
          }
          activeSelection = true
          emit('selectionStart', { position: start, activation: 'keyboard' })
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
        cleanupPreview(undefined, 'escape')
        stopConnectionAutoPan('superseded')
        clickConnection.value = undefined
      }
    }

    const cancelActiveSession = (reason = 'superseded'): void => {
      const active = session.value

      if (active !== undefined) {
        recordFlowTelemetry(
          'Cancelled Vue interaction session',
          FlowSpan.gestureCancel,
          {
            [FlowAttribute.cancellationReason]: reason,
            [FlowAttribute.inputKind]: active.kind,
          }
        )
      }

      if (active?.kind === 'pan') {
        viewportGestureActive = false
        endViewportObservation(activeViewport.value, 'superseded')
      }

      cleanupPreview(active, reason)
      stopConnectionAutoPan('superseded')
      clickConnection.value = undefined
    }

    const onWindowBlur = (): void => {
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
          session.value?.kind === 'connection'
        ) {
          cancelActiveSession('configuration-replacement')
        }
      },
      { flush: 'sync' }
    )

    const onWindowKeyUp = (event: KeyboardEvent): void => {
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

    const onCanvasPointerDown = (event: PointerEvent): void => {
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

      const isSelection =
        event.button === 0 && (event.shiftKey || props.selectionOnDrag)

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
            pointerId: event.pointerId,
            captureTarget: currentTarget,
            startX,
            startY,
            start: flowPoint,
            pointer: flowPoint,
          }
        : {
            kind: 'pan',
            pointerId: event.pointerId,
            captureTarget: currentTarget,
            startX,
            startY,
            viewportStart: activeViewport.value,
          }

      if (isSelection) {
        activeSelection = true
        emit('selectionStart', { position: flowPoint, activation: 'pointer' })
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

      if (!isSelection) {
        viewportGestureActive = true
        beginViewportObservation(activeViewport.value)
      }

      currentTarget.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    }

    const onWheel = (event: WheelEvent): void => {
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

      if (reconnect?.kind === 'connection' && reconnect.reconnect) {
        const status = finishReconnection(reconnect, node.id, handle.id)
        cleanupPreview(reconnect, 'keyboard-reconnect-complete', false)
        endConnectionLifecycle(
          status,
          status === 'rejected' ? 'invalid-target' : 'valid-reconnection'
        )

        return
      }

      if (!props.connectOnClick && clickConnection.value === undefined) {
        return
      }

      const pending = clickConnection.value

      if (pending !== undefined) {
        const pendingHandle = pending.sourceNode.handles?.find(
          ({ id }) => id === pending.sourceHandle
        )

        const canComplete =
          pendingHandle !== undefined &&
          (connectionMode.value === 'loose' ||
            (pendingHandle.kind === 'source' && handle.kind === 'target'))

        clickConnection.value = undefined

        if (
          canComplete &&
          (node.id !== pending.sourceNode.id ||
            handle.id !== pending.sourceHandle)
        ) {
          const status = proposeConnection(
            pending.sourceNode,
            pending.sourceHandle,
            node.id,
            handle.id
          )

          endConnectionLifecycle(
            status,
            status === 'rejected' ? 'invalid-target' : 'valid-connection'
          )
        } else {
          endConnectionLifecycle('rejected', 'invalid-target')
        }

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

      clickConnection.value = {
        kind: 'connection',
        pointerId: -1,
        captureTarget: event.currentTarget,
        sourceNode: node,
        sourceHandle: handle.id,
        start,
        pointer: start,
      }

      if (activeConnectionLifecycle === undefined) {
        validatorFailureReported = false
        activeConnectionLifecycle = {
          kind: 'connect',
          activation: 'click',
          node,
          handleId: handle.id,
        }
        emit('connectStart', {
          node,
          handleId: handle.id,
          activation: 'keyboard',
        })
        emit('clickConnectStart', { node, handleId: handle.id })
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
        activeKeyboardResize?.change.position ?? nodePosition(node)

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
                      cumulativeDelta
                    )

                    if (change !== undefined) {
                      const updated = {
                        ...active,
                        delta: cumulativeDelta,
                        change,
                      }

                      session.value = updated
                      updated.element.style.left = `${change.position.x}px`
                      updated.element.style.top = `${change.position.y}px`
                      updated.element.style.width = `${change.size.width}px`
                      updated.element.style.height = `${change.size.height}px`
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
                    node.size ??
                    (internal === undefined
                      ? undefined
                      : { width: internal.width, height: internal.height })

                  if (
                    element === undefined ||
                    initialSize === undefined ||
                    !(event.currentTarget instanceof HTMLElement)
                  ) {
                    return
                  }

                  const change = keyboardResize(node, direction, delta)

                  if (change !== undefined) {
                    const keyboardSession: KeyboardResizeSession = {
                      kind: 'keyboard-resize',
                      pointerId: -1,
                      captureTarget: event.currentTarget,
                      node,
                      element,
                      direction,
                      position: node.position,
                      size: initialSize,
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
                    element.style.left = `${change.position.x}px`
                    element.style.top = `${change.position.y}px`
                    element.style.width = `${change.size.width}px`
                    element.style.height = `${change.size.height}px`
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
                  validatorFailureReported = false
                  activeConnectionLifecycle = {
                    kind: 'reconnect',
                    activation: 'keyboard',
                    edge,
                    endpoint,
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

    onBeforeUnmount(() => {
      stateDisposed = true
      settleViewportRequest('disposed')
      stopConnectionAutoPan('disposed')
      viewportGestureActive = false
      endViewportObservation(activeViewport.value, 'disposed')

      for (const [nodeId, resolve] of pendingInternals) {
        for (const settle of resolve) {
          settle({ nodeId: NodeIdSchema.make(nodeId), status: 'disposed' })
        }
      }

      pendingInternals.clear()

      for (const dispose of keyPressDisposers) {
        dispose()
      }

      keyPressDisposers.clear()
      stateListeners.clear()
      stateQueue.length = 0

      if (canvas.value !== undefined) {
        resizeObserver.unobserve(canvas.value)
      }

      resizeObserver.disconnect()
      globalThis.removeEventListener('keydown', onKeyDown, true)
      globalThis.removeEventListener('blur', onWindowBlur)
      globalThis.removeEventListener('keyup', onWindowKeyUp, true)
      cleanupPreview()
      pressedKeys.clear()
    })

    return () => {
      const connection =
        session.value?.kind === 'connection'
          ? session.value
          : clickConnection.value

      const connectionPreview =
        connection === undefined
          ? []
          : [
              props.connectionPreview === undefined
                ? h('path', {
                    class: 'flow-vue-connection-preview',
                    'data-testid': 'flow-connection-preview',
                    d: straightEdgePath(connection.start, connection.pointer),
                  })
                : h(props.connectionPreview, {
                    preview: connectionPreviewState(connection),
                  }),
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
          onPointermove: (event: PointerEvent) => {
            const active = session.value

            if (
              active === undefined &&
              clickConnection.value !== undefined &&
              canvas.value !== undefined
            ) {
              autoPanConnection(event.clientX, event.clientY)

              const bounds = canvas.value.getBoundingClientRect()
              const viewport = activeViewport.value
              const pending = clickConnection.value

              clickConnection.value = {
                ...pending,
                pointer: {
                  x: (event.clientX - bounds.left - viewport.x) / viewport.zoom,
                  y: (event.clientY - bounds.top - viewport.y) / viewport.zoom,
                },
              }
              emit('connectProgress', {
                preview: connectionPreviewState(clickConnection.value),
              })

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
              updateViewport(
                panViewport(active.viewportStart, {
                  x: event.clientX - active.startX,
                  y: event.clientY - active.startY,
                })
              )

              return
            }

            if (active.kind === 'selection') {
              const pointer = pointerInFlow(event)
              session.value = { ...active, pointer }
              emit('selectionProgress', {
                rect: {
                  x: Math.min(active.start.x, pointer.x),
                  y: Math.min(active.start.y, pointer.y),
                  width: Math.abs(active.start.x - pointer.x),
                  height: Math.abs(active.start.y - pointer.y),
                },
              })
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
                active.element.style.left = `${change.position.x}px`
                active.element.style.top = `${change.position.y}px`
                active.element.style.width = `${change.size.width}px`
                active.element.style.height = `${change.size.height}px`
              }

              return
            }

            if (active.kind === 'connection') {
              autoPanConnection(event.clientX, event.clientY)

              const bounds = canvas.value?.getBoundingClientRect()

              if (bounds !== undefined) {
                const viewport = activeViewport.value

                session.value = {
                  ...active,
                  pointer: {
                    x:
                      (event.clientX - bounds.left - viewport.x) /
                      viewport.zoom,
                    y:
                      (event.clientY - bounds.top - viewport.y) / viewport.zoom,
                  },
                }
                const updated = session.value

                if (updated?.kind === 'connection') {
                  const preview = connectionPreviewState(updated)

                  if (updated.reconnect === undefined) {
                    emit('connectProgress', { preview })
                  } else {
                    emit('reconnectProgress', { preview })
                  }
                }
              }

              return
            }

            const dx =
              (event.clientX - active.startX) / activeViewport.value.zoom

            const dy =
              (event.clientY - active.startY) / activeViewport.value.zoom

            if (Math.hypot(dx, dy) >= 8) {
              selectNodeForDrag(active.node)
            }

            active.element.style.transform = `translate(${dx}px, ${dy}px)`
            emit('nodeDrag', {
              node: active.node,
              position: { x: active.originX + dx, y: active.originY + dy },
            })
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
            if (session.value?.pointerId === event.pointerId) {
              stopConnectionAutoPan('superseded')

              if (session.value.kind === 'pan') {
                viewportGestureActive = false
                endViewportObservation(activeViewport.value, 'superseded')
              }

              cleanupPreview()
              clickConnection.value = undefined
            }
          },
          onLostpointercapture: (event: PointerEvent) => {
            if (session.value?.pointerId === event.pointerId) {
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
