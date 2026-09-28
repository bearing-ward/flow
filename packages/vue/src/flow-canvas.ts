import {
  applyNodePositionChange,
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
  getViewportForBounds,
  interpolateViewport,
  FlowSnapshotSchema,
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
  ViewportSchema,
  ViewportBoundsSchema,
  ViewportLimitsSchema,
  ViewportAnimationOptionsSchema,
  ViewportPaddingSchema,
  pruneFlowMeasurements,
  zoomViewportAt,
} from '@flow/core'
import type {
  FlowChange,
  FlowCommand,
  FlowDocument,
  FlowEdge,
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

import { FlowEditorKey } from './use-flow.ts'
import type { FlowEditor } from './use-flow.ts'

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
  readonly captureTarget: HTMLElement
  readonly sourceNode: FlowNode
  readonly sourceHandle: string
  readonly start: { readonly x: number; readonly y: number }
  readonly pointer: { readonly x: number; readonly y: number }
}

const snapshotEquivalence = S.toEquivalence(FlowSnapshotSchema)

const viewportEquivalence = S.toEquivalence(ViewportSchema)

interface PanSession {
  readonly kind: 'pan'
  readonly pointerId: number
  readonly captureTarget: HTMLElement
  readonly startX: number
  readonly startY: number
  readonly viewportStart: Viewport
}

interface NodePositionStyle {
  left: string
  top: string
  width?: string
  height?: string
}

type Session = DragSession | ConnectionSession | PanSession

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

// SAFETY: DefaultNode receives FlowNode values created from the decoded graph.
const DefaultNode = defineComponent({
  name: 'FlowDefaultNode',
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () => h('span', { class: 'flow-vue-node-label' }, props.node.label)
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
    isValidConnection: {
      type: Function as PropType<(targetNodeId: string) => boolean>,
      default: () => true,
    },
    renderOnlyVisible: { type: Boolean, default: false },
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
    edgeClick: (_edge: FlowEdge) => true,
  },
  setup(props, { emit, slots, expose }) {
    const canvasId = `flow-vue-${useId()}`

    const viewportLimits = S.decodeUnknownSync(ViewportLimitsSchema)(
      props.viewportLimits
    )

    const initialDocument = props.document ?? props.defaultDocument
    const hasSplitModel = props.nodes !== undefined || props.edges !== undefined

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
    let acceptedSnapshot = stateSnapshot.value
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
              console.error('Accepted-state listener failed', error)
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

    const graph = computed(() => createFlowGraph(activeDocument.value))
    const session = shallowRef<Session>()
    const clickConnection = shallowRef<ConnectionSession>()
    const canvas = shallowRef<HTMLElement>()
    const canvasWidth = shallowRef(960)
    const canvasHeight = shallowRef(640)

    const measuredHandles = shallowRef<
      ReadonlyMap<string, ReadonlyMap<string, MeasuredHandle>>
    >(new Map())

    const nodeElements = new Map<string, HTMLElement>()
    let measurementState: FlowMeasurementState = emptyFlowMeasurementState()
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

    const measureNodeHandles = (node: FlowNode, element: HTMLElement): void => {
      const nodeBounds = element.getBoundingClientRect()
      const { zoom } = activeViewport.value
      const measurements: [string, MeasuredHandle][] = []

      for (const handleElement of element.querySelectorAll<HTMLElement>(
        '[data-handle-id]'
      )) {
        const handle = node.handles?.find(
          (candidate) => candidate.id === handleElement.dataset.handleId
        )

        if (handle === undefined) {
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

      const handles = new Map(measurements)

      const previous = measuredHandles.value.get(node.id)

      const unchanged =
        previous?.size === handles.size &&
        [...handles].every(([id, next]) => {
          const old = previous.get(id)

          return (
            old !== undefined &&
            old.offset.x === next.offset.x &&
            old.offset.y === next.offset.y &&
            old.width === next.width &&
            old.height === next.height
          )
        })

      if (!unchanged) {
        const next = new Map([
          ...measuredHandles.value,
          [node.id, handles] as const,
        ])

        measuredHandles.value = next
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
            width: bounds.width / activeViewport.value.zoom,
            height: bounds.height / activeViewport.value.zoom,
          })
          measureNodeHandles(node, entry.target)
        }
      }

      if (measurements.length > 0) {
        measurementState = applyNodeMeasurements(
          document,
          measurementState,
          measurements
        )
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

        if (measuredHandles.value.has(node.id)) {
          const next = new Map(measuredHandles.value)
          next.delete(node.id)
          measuredHandles.value = next
        }
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

    const publish = (change: FlowChange): void => {
      emit('change', change)

      if (hasSplitModel || props.documentMode === 'controlled') {
        let next: FlowDocument | undefined

        if (change.kind === 'node-position') {
          next = applyNodePositionChange(activeDocument.value, change)
        } else if (change.kind === 'edge-add') {
          next = {
            ...activeDocument.value,
            edges: [...activeDocument.value.edges, change.edge],
          }
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

    const beginViewportObservation = (viewport: Viewport): void => {
      if (viewportObservationActive) {
        return
      }

      viewportObservationActive = true
      emit('viewportStart', viewport)
    }

    const changeViewportObservation = (viewport: Viewport): void => {
      emit('viewportChange', viewport)
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

    const applyEditResolved = async (
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

    const applyEdit = (
      transaction: FlowEditTransactionInput
    ): Promise<FlowEditResult> => applyEditResolved(() => transaction)

    const cleanupPreview = (
      active: Session | undefined = session.value
    ): void => {
      if (active?.kind === 'node') {
        active.element.style.removeProperty('transform')
      }

      if (active?.captureTarget.hasPointerCapture?.(active.pointerId)) {
        active.captureTarget.releasePointerCapture?.(active.pointerId)
      }

      if (session.value === active) {
        session.value = undefined
      }
    }

    watch(
      () => activeDocument.value.nodes.map(({ id }) => id),
      (ids) => {
        const active = session.value
        const pending = clickConnection.value

        if (active?.kind === 'node' && !ids.includes(active.node.id)) {
          cleanupPreview(active)
        }

        if (pending !== undefined && !ids.includes(pending.sourceNode.id)) {
          clickConnection.value = undefined
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
      subscribeState,
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
      updateNodeInternals: (nodeIds) => {
        if (stateDisposed) {
          return Promise.resolve(
            nodeIds.map((nodeId) => ({ nodeId, status: 'disposed' as const }))
          )
        }

        const requests = nodeIds.map((nodeId) => {
          const node = activeDocument.value.nodes.find(
            (candidate) => candidate.id === nodeId
          )

          if (node === undefined) {
            return Promise.resolve({ nodeId, status: 'missing' as const })
          }

          if (!nodeElements.has(node.id)) {
            return Promise.resolve({ nodeId, status: 'unrendered' as const })
          }

          const pending =
            Promise.withResolvers<
              Awaited<ReturnType<FlowEditor['updateNodeInternals']>>[number]
            >()

          const waiters = pendingInternals.get(node.id) ?? []
          waiters.push(pending.resolve)
          pendingInternals.set(node.id, waiters)

          return pending.promise
        })

        if (!refreshScheduled && pendingInternals.size > 0) {
          refreshScheduled = true
          void nextTick(() => {
            refreshScheduled = false
            const document = activeDocument.value
            const measurements: NodeMeasurementInput[] = []

            for (const [nodeId, settle] of pendingInternals) {
              const node = activeNodesById.get(nodeId)

              const element = nodeElements.get(nodeId)

              if (stateDisposed) {
                for (const resolve of settle) {
                  resolve({ nodeId, status: 'disposed' })
                }
              } else if (node === undefined) {
                for (const resolve of settle) {
                  resolve({ nodeId, status: 'missing' })
                }
              } else if (element === undefined || !element.isConnected) {
                for (const resolve of settle) {
                  resolve({ nodeId, status: 'unrendered' })
                }
              } else {
                const bounds = element.getBoundingClientRect()

                const generation = nodeGenerations.get(node.id)

                if (generation === undefined) {
                  for (const resolve of settle) {
                    resolve({ nodeId, status: 'unrendered' })
                  }

                  continue
                }

                measurements.push({
                  nodeId: node.id,
                  generation,
                  width: bounds.width / activeViewport.value.zoom,
                  height: bounds.height / activeViewport.value.zoom,
                })
                measureNodeHandles(node, element)

                for (const resolve of settle) {
                  resolve({ nodeId, status: 'refreshed' })
                }
              }
            }

            if (!stateDisposed && measurements.length > 0) {
              measurementState = applyNodeMeasurements(
                document,
                measurementState,
                measurements
              )
            }

            pendingInternals.clear()
          })
        }

        return Promise.all(requests)
      },
    }

    provide(FlowEditorKey, editor)
    expose({ editor })

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

      const isNativeControl =
        target.closest(
          'button, input, select, textarea, a, [contenteditable="true"], [data-flow-nodrag]'
        ) !== null

      if (isNativeControl && handle === null) {
        return
      }

      const handleId = handle?.dataset.handleId

      const { currentTarget } = event

      if (!(currentTarget instanceof HTMLElement)) {
        return
      }

      if (handleId === undefined) {
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
          sourceHandle: handleId,
          start,
          pointer:
            bounds === undefined
              ? start
              : {
                  x: (event.clientX - bounds.left - viewport.x) / viewport.zoom,
                  y: (event.clientY - bounds.top - viewport.y) / viewport.zoom,
                },
        }
      }

      currentTarget.setPointerCapture?.(event.pointerId)
    }

    const finishConnection = (
      event: PointerEvent,
      active: ConnectionSession
    ): void => {
      const pending = clickConnection.value

      cleanupPreview(active)

      const targetElement = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-handle-id]')

      const targetNodeElement =
        targetElement?.closest<HTMLElement>('[data-node-id]')

      const targetNodeId = targetNodeElement?.dataset.nodeId
      const targetHandleId = targetElement?.dataset.handleId

      if (targetNodeId === undefined || targetHandleId === undefined) {
        return
      }

      const source = pending ?? active

      if (targetNodeId === source.sourceNode.id) {
        const candidateHandle = source.sourceNode.handles?.find(
          (handle) =>
            handle.id === source.sourceHandle && handle.kind === 'source'
        )

        if (
          candidateHandle !== undefined &&
          targetHandleId === source.sourceHandle
        ) {
          clickConnection.value = source
        }

        return
      }

      clickConnection.value = undefined

      if (!props.isValidConnection(targetNodeId)) {
        return
      }

      const targetNode = activeDocument.value.nodes.find(
        (node) => node.id === targetNodeId
      )

      const sourceHandle = source.sourceNode.handles?.find(
        (handle) =>
          handle.id === source.sourceHandle && handle.kind === 'source'
      )

      const targetHandle = targetNode?.handles?.find(
        (handle) => handle.id === targetHandleId && handle.kind === 'target'
      )

      if (
        targetNode === undefined ||
        sourceHandle === undefined ||
        targetHandle === undefined
      ) {
        return
      }

      const connection = {
        source: source.sourceNode.id,
        sourceHandle: sourceHandle.id,
        target: targetNode.id,
        targetHandle: targetHandle.id,
      }

      if (
        Exit.isFailure(
          Effect.runSyncExit(
            validateFlowConnection(activeDocument.value, connection)
          )
        )
      ) {
        return
      }

      publish({
        kind: 'edge-add',
        edge: nextConnectionEdge(activeDocument.value, connection),
      })
    }

    const onPointerUp = (event: PointerEvent): void => {
      const active = session.value

      if (active === undefined || active.pointerId !== event.pointerId) {
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

      cleanupPreview(active)
      const dx = (event.clientX - active.startX) / activeViewport.value.zoom
      const dy = (event.clientY - active.startY) / activeViewport.value.zoom

      if (Math.hypot(dx, dy) < 8) {
        return
      }

      publish({
        kind: 'node-position',
        nodeId: active.node.id,
        position: { x: active.originX + dx, y: active.originY + dy },
      })
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        cleanupPreview()
        clickConnection.value = undefined
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

      session.value = {
        kind: 'pan',
        pointerId: event.pointerId,
        captureTarget: currentTarget,
        startX: event.clientX,
        startY: event.clientY,
        viewportStart: activeViewport.value,
      }
      viewportGestureActive = true
      beginViewportObservation(activeViewport.value)
      currentTarget.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    }

    const onWheel = (event: WheelEvent): void => {
      const bounds = canvas.value?.getBoundingClientRect()

      if (bounds === undefined) {
        return
      }

      const anchor = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      }

      const zoom = activeViewport.value.zoom * Math.exp(-event.deltaY * 0.001)

      updateViewport(
        zoomViewportAt(activeViewport.value, zoom, anchor, viewportLimits)
      )
      event.preventDefault()
    }

    const renderNode = (node: FlowNode): VNode | null => {
      if (graph.value.nodes.get(node.id)?.hidden === true || !visible(node)) {
        return null
      }

      const position = nodePosition(node)

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
        })
      )

      const style: NodePositionStyle = {
        left: `${position.x}px`,
        top: `${position.y}px`,
      }

      if (node.size !== undefined) {
        style.width = `${node.size.width}px`
        style.height = `${node.size.height}px`
      }

      return h(
        'div',
        {
          key: node.id,
          class: 'flow-vue-node',
          'data-testid': 'flow-node',
          'data-node-id': node.id,
          ref: nodeRef(node),
          style,
          onPointerdown: (event: PointerEvent) => onPointerDown(event, node),
        },
        [
          h(Node, { node, key: `visual-${node.id}` }, nodeSlots),
          ...handleChildren,
        ]
      )
    }

    const renderMarkers = (): VNode[] => {
      const markers = new Map<string, VNode>()

      for (const edge of activeDocument.value.edges) {
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
      viewportGestureActive = false
      endViewportObservation(activeViewport.value, 'disposed')

      for (const [nodeId, resolve] of pendingInternals) {
        for (const settle of resolve) {
          settle({ nodeId, status: 'disposed' })
        }
      }

      pendingInternals.clear()
      stateListeners.clear()
      stateQueue.length = 0

      if (canvas.value !== undefined) {
        resizeObserver.unobserve(canvas.value)
      }

      resizeObserver.disconnect()
      globalThis.removeEventListener('keydown', onKeyDown, true)
      cleanupPreview()
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
              h('path', {
                class: 'flow-vue-connection-preview',
                'data-testid': 'flow-connection-preview',
                d: straightEdgePath(connection.start, connection.pointer),
              }),
            ]

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

              return
            }

            if (active === undefined || active.pointerId !== event.pointerId) {
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

            if (active.kind === 'connection') {
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
              }

              return
            }

            const dx =
              (event.clientX - active.startX) / activeViewport.value.zoom

            const dy =
              (event.clientY - active.startY) / activeViewport.value.zoom

            active.element.style.transform = `translate(${dx}px, ${dy}px)`
          },
          onPointerdown: onCanvasPointerDown,
          onPointerup: onPointerUp,
          onWheel,
          onPointercancel: (event: PointerEvent) => {
            if (session.value?.pointerId === event.pointerId) {
              if (session.value.kind === 'pan') {
                viewportGestureActive = false
                endViewportObservation(activeViewport.value, 'superseded')
              }

              cleanupPreview()
              clickConnection.value = undefined
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
              ...activeDocument.value.edges.map(renderEdge),
              ...connectionPreview,
            ]
          ),
          h(
            'div',
            {
              class: 'flow-vue-viewport',
              style: {
                transform: `translate(${activeViewport.value.x}px, ${activeViewport.value.y}px) scale(${activeViewport.value.zoom})`,
              },
            },
            graph.value.orderedNodes.map(({ node }) => renderNode(node))
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
            activeDocument.value.edges.map(renderEdgeLabel)
          ),
          slots.default?.({}),
        ]
      )
    }
  },
})
