import {
  FlowChangeSchema,
  FlowCommandSchema,
  FlowDocumentSchema,
  FlowEdgeSchema,
  FlowEditErrorSchema,
  FlowEditResultSchema,
  FlowEditTransactionSchema,
  FlowDeleteRevisionConflict,
  FlowDeleteCancelled,
  FlowDeleteApprovalFailed,
  FlowDeleteInProgress,
  prepareFlowDeleteCandidate,
  finalizeFlowDeleteCandidate,
  FlowNodeSchema,
  FlowSnapshotSchema,
  FlowNodeConnectionOptionsSchema,
  FlowNodeConnectionSchema,
  FlowHandleConnectionsQuerySchema,
  FlowNodeDataSchema,
  ConnectionPreviewSnapshotSchema,
  SavedFlowSessionSchema,
  SavedVersionedFlowSessionSchema,
  SavedFlowFormatError,
  SavedFlowFormatFailureCodeSchema,
  selectNodeConnections,
  selectNodesData,
  getFlowInternalNodes,
  FlowStateChangeSchema,
  ViewportSchema,
  NodeMeasurementInputSchema,
  FlowInternalNodeSchema,
  ViewportAnimationOptionsSchema,
  ViewportBoundsSchema,
  ViewportPaddingSchema,
  ViewportOperationStatusSchema,
  ViewportLimitsSchema,
  getViewportForBounds as calculateViewportForBounds,
  interpolateViewport,
  createFlowGraph,
  createFlowSnapshot,
  graphBounds,
  NodeIdSchema,
  FlowAttribute,
  FlowSpan,
  EdgeChangeSchema,
  NodeChangeSchema,
  flowChangeElementChanges,
  flowNodeHandles,
  FlowColorModeSchema,
  FlowFitViewOptionsSchema,
  flowSelectionEqual,
  resolveEdgeHandles,
  selectFlowSelection,
} from '@flow/core'
import type {
  FlowDocument,
  NodeId,
  Viewport,
  SelectionModeSchema,
} from '@flow/core'
import {
  Cause,
  Data,
  Duration,
  Effect,
  Exit,
  Option,
  Predicate,
  Queue,
  Fiber,
  Stream,
  Scope,
  Schema,
} from 'effect'
import type { Html } from 'foldkit'
import {
  Command,
  Message as FoldMessage,
  Port,
  Runtime,
  Subscription,
  Update,
} from 'foldkit'

import { FoldkitConnectionStateSchema } from './connection-observer.ts'
import { registerConnectionRule } from './connection-rules.ts'
import {
  KeyboardDeleteSelectionSchema,
  DeleteApprovalRequestedSchema,
  DeleteApprovalResponseSchema,
  DeleteCancellationAckSchema,
  DeleteCancellationSchema,
  DeleteRequestSchema,
  DeleteResultSchema,
  DELETE_APPROVAL_TIMEOUT_MS,
  MAX_PENDING_DELETE_APPROVALS,
} from './delete-approval.ts'
import * as Graph from './graph.ts'
import { notifyResizer } from './node-resizer.ts'

const interactionCompletionSpan = (
  change: typeof FlowChangeSchema.Type
): string => {
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

const logGestureStarted = (lifecycle: {
  readonly span: string
  readonly kind:
    | 'connection'
    | 'reconnection'
    | 'selection'
    | 'node-drag'
    | 'resize'
    | 'keyboard-resize'
    | 'viewport-pan'
  readonly inputKind: string
  readonly entityId?: string | undefined
  readonly controlMode: 'controlled' | 'uncontrolled'
}) => {
  const commonAttributes = {
    [FlowAttribute.changeKind]: lifecycle.kind,
    [FlowAttribute.controlMode]: lifecycle.controlMode,
    [FlowAttribute.inputKind]: lifecycle.inputKind,
  }

  if (lifecycle.entityId === undefined) {
    return Effect.logDebug('Started Foldkit interaction').pipe(
      Effect.annotateLogs(commonAttributes),
      Effect.withSpan(lifecycle.span, { attributes: commonAttributes })
    )
  }

  if (lifecycle.kind === 'reconnection') {
    const attributes = {
      ...commonAttributes,
      [FlowAttribute.edgeId]: lifecycle.entityId,
    }

    return Effect.logDebug('Started Foldkit interaction').pipe(
      Effect.annotateLogs(attributes),
      Effect.withSpan(lifecycle.span, { attributes })
    )
  }

  const attributes = {
    ...commonAttributes,
    [FlowAttribute.nodeId]: lifecycle.entityId,
  }

  return Effect.logDebug('Started Foldkit interaction').pipe(
    Effect.annotateLogs(attributes),
    Effect.withSpan(lifecycle.span, { attributes })
  )
}

const defaultViewportLimits: typeof ViewportLimitsSchema.Type = {
  minZoom: 0.1,
  maxZoom: 2,
}

export const HostAction = FoldMessage.defineMessageUnion({
  RefreshRenderers: {},
  SetCanvasOptions: { options: Graph.CanvasOptionsSchema },
  ReplaceDocument: { document: FlowDocumentSchema },
  ReplaceViewport: { viewport: ViewportSchema },
  SetAllowedTargets: { targets: Schema.Array(Schema.String) },
  DispatchCommand: { command: FlowCommandSchema },
  MeasureNode: {
    requestId: Schema.String,
    measurement: NodeMeasurementInputSchema,
  },
  /** React Flow `colorMode` (`light`, `dark` or `system`) at runtime. */
  SetColorMode: { mode: FlowColorModeSchema },
  /** Change `nodesDraggable`, `nodesConnectable` and `elementsSelectable` at runtime. */
  SetInteractivity: {
    nodesDraggable: Schema.optional(Schema.Boolean),
    nodesConnectable: Schema.optional(Schema.Boolean),
    elementsSelectable: Schema.optional(Schema.Boolean),
  },
})

export type HostActionData = typeof HostAction.Type

/** The Runtime's current interaction switches, published after every `SetInteractivity`. */
export const FoldkitInteractivitySchema = Schema.Struct({
  nodesDraggable: Schema.Boolean,
  nodesConnectable: Schema.Boolean,
  elementsSelectable: Schema.Boolean,
})

export const SnapshotRequestSchema = Schema.Struct({
  requestId: Schema.String,
  nodeId: Schema.optional(Schema.String),
  edgeId: Schema.optional(Schema.String),
  nodeIds: Schema.optional(Schema.Array(Schema.String)),
  connections: Schema.optional(
    Schema.Struct({
      nodeId: Schema.String,
      type: Schema.optional(Schema.Literals(['source', 'target'])),
      handleId: Schema.optional(Schema.NullOr(Schema.String)),
    })
  ),
  handleConnections: Schema.optional(FlowHandleConnectionsQuerySchema),
  includeHiddenNodes: Schema.optional(Schema.Boolean),
  /** Also return every node's internal projection, React Flow's `nodeLookup`. */
  internalNodes: Schema.optional(Schema.Boolean),
})

export const EditRequestSchema = Schema.Struct({
  requestId: Schema.String,
  transaction: FlowEditTransactionSchema,
})

export const EditResponseSchema = Schema.Union([
  Schema.Struct({
    requestId: Schema.String,
    result: FlowEditResultSchema,
  }),
  Schema.Struct({
    requestId: Schema.String,
    error: FlowEditErrorSchema,
  }),
])

export type EditResponse = typeof EditResponseSchema.Encoded

export type SnapshotRequest = typeof SnapshotRequestSchema.Encoded

export const SnapshotResponseSchema = Schema.Struct({
  requestId: Schema.String,
  snapshot: FlowSnapshotSchema,
  node: Schema.optional(FlowNodeSchema),
  edge: Schema.optional(FlowEdgeSchema),
  internalNode: Schema.NullOr(FlowInternalNodeSchema),
  /** Present when the request set `internalNodes: true`. */
  internalNodes: Schema.optional(Schema.Array(FlowInternalNodeSchema)),
  nodesInitialized: Schema.Boolean,
  nodesData: Schema.Array(FlowNodeDataSchema),
  nodeConnections: Schema.Array(FlowNodeConnectionSchema),
  handleConnections: Schema.Array(FlowEdgeSchema),
  connectionPreview: ConnectionPreviewSnapshotSchema,
  savedSession: SavedFlowSessionSchema,
})

export type SnapshotResponse = typeof SnapshotResponseSchema.Type

export const VersionedSnapshotRequestSchema = Schema.Struct({
  ...SnapshotRequestSchema.fields,
})

export const VersionedSnapshotResponseSchema = Schema.Struct({
  ...SnapshotResponseSchema.fields,
  savedSession: SavedVersionedFlowSessionSchema,
})

export type VersionedSnapshotRequest =
  typeof VersionedSnapshotRequestSchema.Encoded

export type VersionedSnapshotResponse =
  typeof VersionedSnapshotResponseSchema.Type

export const LegacySnapshotFailureSchema = Schema.Struct({
  requestId: Schema.String,
  code: SavedFlowFormatFailureCodeSchema,
})

export type LegacySnapshotFailure = typeof LegacySnapshotFailureSchema.Encoded

/** Serializable viewport requests are interpreted by the Foldkit update loop. */
export const ViewportRequestSchema = Schema.Struct({
  requestId: Schema.String,
  kind: Schema.Literals([
    'get',
    'set',
    'zoom',
    'center',
    'fitBounds',
    'fitView',
    'flowToScreen',
    'screenToFlow',
  ]),
  viewport: Schema.optional(ViewportSchema),
  zoom: Schema.optional(Schema.Number),
  point: Schema.optional(Schema.Struct({ x: Schema.Number, y: Schema.Number })),
  bounds: Schema.optional(ViewportBoundsSchema),
  nodes: Schema.optional(
    Schema.Union([
      Schema.Literals(['all', 'selected']),
      Schema.Array(NodeIdSchema),
    ])
  ),
  padding: Schema.optional(ViewportPaddingSchema),
  /** React `FitViewOptions.includeHiddenNodes`, `minZoom` and `maxZoom`. */
  includeHiddenNodes: Schema.optional(Schema.Boolean),
  minZoom: Schema.optional(Schema.Finite.check(Schema.isGreaterThan(0))),
  maxZoom: Schema.optional(Schema.Finite.check(Schema.isGreaterThan(0))),
  animation: Schema.optional(ViewportAnimationOptionsSchema),
  width: Schema.Finite,
  height: Schema.Finite,
  originX: Schema.Finite,
  originY: Schema.Finite,
})

export type ViewportRequest = typeof ViewportRequestSchema.Type

export const ViewportResponseSchema = Schema.Struct({
  complete: Schema.Boolean,
  requestId: Schema.String,
  status: ViewportOperationStatusSchema,
  viewport: ViewportSchema,
  point: Schema.optional(Schema.Struct({ x: Schema.Number, y: Schema.Number })),
  initialized: Schema.Boolean,
})

export const ViewportEventSchema = Schema.Struct({
  kind: Schema.Literals(['start', 'change', 'end']),
  source: Schema.Literals(['programmatic', 'user']),
  viewport: ViewportSchema,
})

export const InteractionEventsSchema = Schema.Array(
  Graph.InteractionEventSchema
)

/**
 * React Flow `onNodesChange`/`onEdgesChange` deltas for one semantic change,
 * derived from the document the change was proposed against.
 */
export const ElementChangesSchema = Schema.Struct({
  nodes: Schema.Array(NodeChangeSchema),
  edges: Schema.Array(EdgeChangeSchema),
})

const ViewportAnimationStateSchema = Schema.Struct({
  requestId: Schema.String,
  from: ViewportSchema,
  to: ViewportSchema,
  elapsed: Schema.Finite,
  duration: Schema.Finite,
  easing: Schema.Literals(['linear', 'ease-in-out']),
  previous: FlowSnapshotSchema,
})

export const MeasurementResultSchema = Schema.Struct({
  requestId: Schema.String,
  nodeId: Schema.String,
  status: Schema.Literals(['measured', 'stale', 'missing', 'disposed']),
  internalNode: Schema.NullOr(FlowInternalNodeSchema),
  nodesInitialized: Schema.Boolean,
})

export const AppMessage = FoldMessage.defineMessageUnion({
  GraphMessage: { message: Graph.Message },
  HostAction: { action: HostAction },
  SnapshotRequest: { request: SnapshotRequestSchema },
  VersionedSnapshotRequest: { request: VersionedSnapshotRequestSchema },
  EditRequest: { request: EditRequestSchema },
  DeleteRequest: { request: DeleteRequestSchema },
  DeleteCancellation: { cancellation: DeleteCancellationSchema },
  DeleteCancellationAckPublished: {},
  DeleteApprovalTimeout: {
    operationId: Schema.String,
    baseRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  },
  DeleteApprovalResponse: { response: DeleteApprovalResponseSchema },
  DeleteApprovalPublished: {},
  DeleteResultPublished: {},
  SnapshotPublished: {},
  ChangePublished: {},
  EditPublished: {},
  MeasurementPublished: {},
  ViewportRequest: { request: ViewportRequestSchema },
  ViewportPublished: {},
  ViewportFrame: { delta: Schema.Finite },
  ViewportEventPublished: {},
  InteractionEventsPublished: {},
})

export type AppMessageData = typeof AppMessage.Type

export const wrapGraphMessage =
  Data.taggedEnum<Extract<AppMessageData, { readonly _tag: 'GraphMessage' }>>()
    .GraphMessage

export const ports = {
  inbound: {
    actions: Port.inbound(HostAction),
    snapshotRequests: Port.inbound(SnapshotRequestSchema),
    versionedSnapshotRequests: Port.inbound(VersionedSnapshotRequestSchema),
    editRequests: Port.inbound(EditRequestSchema),
    deleteRequests: Port.inbound(DeleteRequestSchema),
    deleteCancellations: Port.inbound(DeleteCancellationSchema),
    deleteApprovalResponses: Port.inbound(DeleteApprovalResponseSchema),
    viewportRequests: Port.inbound(ViewportRequestSchema),
  },
  outbound: {
    changes: Port.outbound(FlowChangeSchema),
    snapshots: Port.outbound(SnapshotResponseSchema),
    versionedSnapshots: Port.outbound(VersionedSnapshotResponseSchema),
    snapshotFailures: Port.outbound(LegacySnapshotFailureSchema),
    acceptedStates: Port.outbound(FlowStateChangeSchema),
    editResults: Port.outbound(EditResponseSchema),
    keyboardDeleteRequests: Port.outbound(KeyboardDeleteSelectionSchema),
    deleteApprovalRequests: Port.outbound(DeleteApprovalRequestedSchema),
    deleteResults: Port.outbound(DeleteResultSchema),
    deleteCancellationAcks: Port.outbound(DeleteCancellationAckSchema),
    measurementResults: Port.outbound(MeasurementResultSchema),
    viewportResults: Port.outbound(ViewportResponseSchema),
    viewportEvents: Port.outbound(ViewportEventSchema),
    interactionEvents: Port.outbound(InteractionEventsSchema),
    elementChanges: Port.outbound(ElementChangesSchema),
    connectionStates: Port.outbound(FoldkitConnectionStateSchema),
    interactivityStates: Port.outbound(FoldkitInteractivitySchema),
  },
}

export interface ViewportPaneMetrics {
  readonly width: number
  readonly height: number
  readonly originX: number
  readonly originY: number
}

/** React `FitViewOptions`; `nodes` takes `{ id }` items or `all`/`selected`. */
export type FlowFitViewOptionsInput = typeof FlowFitViewOptionsSchema.Encoded

export interface ViewportClient {
  readonly getViewportLimits: () => typeof ViewportLimitsSchema.Type
  readonly request: (
    request: Omit<
      ViewportRequest,
      'requestId' | 'width' | 'height' | 'originX' | 'originY'
    >
  ) => Promise<typeof ViewportResponseSchema.Type>
  readonly getViewport: () => Promise<typeof ViewportResponseSchema.Type>
  readonly getZoom: () => Promise<number>
  readonly getViewportInitialized: () => Promise<boolean>
  readonly flowToScreen: (point: {
    readonly x: number
    readonly y: number
  }) => Promise<typeof ViewportResponseSchema.Type>
  readonly screenToFlow: (point: {
    readonly x: number
    readonly y: number
  }) => Promise<typeof ViewportResponseSchema.Type>
  readonly setViewport: (
    viewport: Viewport,
    animation?: typeof ViewportAnimationOptionsSchema.Type
  ) => Promise<typeof ViewportResponseSchema.Type>
  readonly zoomTo: (
    zoom: number,
    point?: { readonly x: number; readonly y: number },
    animation?: typeof ViewportAnimationOptionsSchema.Type
  ) => Promise<typeof ViewportResponseSchema.Type>
  readonly zoomIn: (
    point?: { readonly x: number; readonly y: number },
    animation?: typeof ViewportAnimationOptionsSchema.Type
  ) => Promise<typeof ViewportResponseSchema.Type>
  readonly zoomOut: (
    point?: { readonly x: number; readonly y: number },
    animation?: typeof ViewportAnimationOptionsSchema.Type
  ) => Promise<typeof ViewportResponseSchema.Type>
  readonly centerOn: (
    point: { readonly x: number; readonly y: number },
    animation?: typeof ViewportAnimationOptionsSchema.Type
  ) => Promise<typeof ViewportResponseSchema.Type>
  readonly setCenter: (
    point: { readonly x: number; readonly y: number },
    animation?: typeof ViewportAnimationOptionsSchema.Type
  ) => Promise<typeof ViewportResponseSchema.Type>
  readonly fitBounds: (
    bounds: typeof ViewportBoundsSchema.Type,
    padding?: typeof ViewportPaddingSchema.Type,
    animation?: typeof ViewportAnimationOptionsSchema.Type
  ) => Promise<typeof ViewportResponseSchema.Type>
  readonly getViewportForBounds: (
    bounds: typeof ViewportBoundsSchema.Type,
    padding?: typeof ViewportPaddingSchema.Type
  ) => Viewport | undefined
  /**
   * Fit the given nodes, or take React `FitViewOptions` (`padding`, `nodes`,
   * `includeHiddenNodes`, `minZoom`, `maxZoom`, `duration`, `easing`).
   */
  readonly fitView: (
    nodes?: 'all' | 'selected' | readonly string[] | FlowFitViewOptionsInput,
    padding?: typeof ViewportPaddingSchema.Type,
    animation?: typeof ViewportAnimationOptionsSchema.Type
  ) => Promise<typeof ViewportResponseSchema.Type>
  readonly cancelAnimation: () => Promise<typeof ViewportResponseSchema.Type>
  readonly dispose: () => void
}

/** Host-side request facade; disposal settles every outstanding operation. */
export const createViewportClient = (
  handle: Pick<
    Runtime.EmbedHandle<typeof ports>['ports'],
    'viewportResults' | 'viewportRequests'
  >,
  getMetrics: () => ViewportPaneMetrics,
  initialViewport: Viewport,
  limits: typeof ViewportLimitsSchema.Type = defaultViewportLimits
): ViewportClient => {
  let requestNumber = 0
  let viewport = initialViewport
  let disposed = false

  const pending = new Map<
    string,
    (response: typeof ViewportResponseSchema.Type) => void
  >()

  const stopListening = handle.viewportResults.subscribe((response) => {
    if (response.status === 'accepted' || response.status === 'unchanged') {
      const { viewport: acceptedViewport } = response
      viewport = acceptedViewport
    }

    if (response.complete) {
      pending.get(response.requestId)?.(response)
      pending.delete(response.requestId)
    }
  })

  const request: ViewportClient['request'] = (input) => {
    requestNumber += 1
    const requestId = `foldkit-viewport-${requestNumber}`
    const metrics = getMetrics()

    const { promise, resolve } =
      Promise.withResolvers<typeof ViewportResponseSchema.Type>()

    if (disposed) {
      resolve({
        requestId,
        status: 'disposed',
        viewport,
        initialized: false,
        complete: true,
      })

      return promise
    }

    pending.set(requestId, resolve)

    let { animation } = input

    if (
      animation !== undefined &&
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      animation = { ...animation, duration: 0 }
    }

    const sent = handle.viewportRequests.send({
      ...input,
      animation,
      requestId,
      ...metrics,
    })

    if (Exit.isFailure(sent)) {
      pending.delete(requestId)
      resolve({
        requestId,
        status: 'disposed',
        viewport,
        initialized: false,
        complete: true,
      })
    }

    return promise
  }

  return {
    request,
    getViewportLimits: () => limits,
    getViewport: () => request({ kind: 'get' }),
    getZoom: async () => {
      const response = await request({ kind: 'get' })

      return response.viewport.zoom
    },
    getViewportInitialized: async () => {
      const response = await request({ kind: 'get' })

      return response.initialized
    },
    flowToScreen: (point) => request({ kind: 'flowToScreen', point }),
    screenToFlow: (point) => request({ kind: 'screenToFlow', point }),
    setViewport: (nextViewport, animation) =>
      request({ kind: 'set', viewport: nextViewport, animation }),
    zoomTo: (zoom, point, animation) =>
      request({ kind: 'zoom', zoom, point, animation }),
    zoomIn: async (point, animation) => {
      const response = await request({ kind: 'get' })

      return request({
        kind: 'zoom',
        zoom: response.viewport.zoom * 1.2,
        point,
        animation,
      })
    },
    zoomOut: async (point, animation) => {
      const response = await request({ kind: 'get' })

      return request({
        kind: 'zoom',
        zoom: response.viewport.zoom / 1.2,
        point,
        animation,
      })
    },
    centerOn: (point, animation) =>
      request({ kind: 'center', point, animation }),
    setCenter: (point, animation) =>
      request({ kind: 'center', point, animation }),
    fitBounds: (bounds, padding, animation) =>
      request({ kind: 'fitBounds', bounds, padding, animation }),
    getViewportForBounds: (bounds, padding) => {
      const validBounds = Schema.decodeUnknownSync(ViewportBoundsSchema)(bounds)

      const validPadding =
        padding === undefined
          ? undefined
          : Schema.decodeUnknownSync(ViewportPaddingSchema)(padding)

      const metrics = getMetrics()

      return calculateViewportForBounds({
        bounds: validBounds,
        width: metrics.width,
        height: metrics.height,
        limits,
        padding: validPadding,
      })
    },
    fitView: (nodes, padding, animation) => {
      if (
        nodes === undefined ||
        nodes === 'all' ||
        nodes === 'selected' ||
        Array.isArray(nodes)
      ) {
        return request({
          kind: 'fitView',
          nodes:
            nodes === undefined || nodes === 'all' || nodes === 'selected'
              ? nodes
              : nodes.map((id: string) => NodeIdSchema.make(id)),
          padding,
          animation,
        })
      }

      const options = Schema.decodeUnknownSync(FlowFitViewOptionsSchema)(nodes)

      return request({
        kind: 'fitView',
        nodes:
          options.nodes === undefined ||
          options.nodes === 'all' ||
          options.nodes === 'selected'
            ? options.nodes
            : options.nodes.map(({ id }) => id),
        padding: options.padding ?? padding,
        includeHiddenNodes: options.includeHiddenNodes,
        minZoom: options.minZoom,
        maxZoom: options.maxZoom,
        animation:
          options.duration === undefined
            ? animation
            : { duration: options.duration, easing: options.easing },
      })
    },
    cancelAnimation: () =>
      request({ kind: 'set', viewport, animation: { duration: 0 } }),
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      stopListening()

      for (const [requestId, resolve] of pending) {
        resolve({
          requestId,
          status: 'disposed',
          viewport,
          initialized: false,
          complete: true,
        })
      }

      pending.clear()
    },
  }
}

export const ModelSchema = Schema.Struct({
  graph: Graph.ModelSchema,
  changeKinds: Schema.Array(Schema.String),
  viewportAnimation: Schema.NullOr(ViewportAnimationStateSchema),
  viewportLimits: ViewportLimitsSchema,
  lifecycleReady: Schema.Boolean,
  acceptedDocumentRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  pendingDeleteApprovals: Schema.Array(DeleteApprovalRequestedSchema),
  cancelledDeleteOperations: Schema.Array(DeleteCancellationSchema),
})

export type Model = typeof ModelSchema.Type

const ChangePublicationSchema = Schema.Struct({
  kind: Schema.Literal('change'),
  change: Schema.optional(FlowChangeSchema),
  acceptedState: Schema.optional(FlowStateChangeSchema),
  cancellation: Schema.optional(
    Schema.Struct({ kind: Schema.String, reason: Schema.String })
  ),
  lifecycle: Schema.optional(
    Schema.Struct({
      span: Schema.String,
      kind: Schema.Literals([
        'connection',
        'reconnection',
        'selection',
        'node-drag',
        'resize',
        'keyboard-resize',
        'viewport-pan',
      ]),
      inputKind: Schema.String,
      entityId: Schema.optional(Schema.String),
      controlMode: Schema.Literals(['controlled', 'uncontrolled']),
    })
  ),
  controlMode: Schema.optional(Schema.Literals(['controlled', 'uncontrolled'])),
  elementChanges: Schema.optional(ElementChangesSchema),
})

const PublicationSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('keyboard-delete'),
    selection: KeyboardDeleteSelectionSchema,
  }),
  ChangePublicationSchema,
  Schema.Struct({
    kind: Schema.Literal('connection'),
    state: FoldkitConnectionStateSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal('interactivity'),
    state: FoldkitInteractivitySchema,
  }),
  Schema.Struct({
    kind: Schema.Literal('interaction'),
    events: InteractionEventsSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal('edit-failure'),
    response: EditResponseSchema,
    interactionError: Graph.InteractionEventSchema,
  }),
])

type PublicationItem = typeof PublicationSchema.Type

type PublicationBatch = readonly PublicationItem[]

type AppReduction = Update.ReturnWithOutMessage<
  Model,
  AppMessageData,
  PublicationBatch
> & { readonly nativeBarrier?: Graph.NativeBarrier }

const respondEdit = (response: typeof EditResponseSchema.Type) => {
  const emitResponse = Port.emit(ports.outbound.editResults, response).pipe(
    Effect.as(AppMessage.EditPublished())
  )

  if (!('error' in response)) {
    return emitResponse
  }

  return Effect.logError('Foldkit edit failed').pipe(
    Effect.annotateLogs({ [FlowAttribute.failureName]: response.error._tag }),
    Effect.withSpan(FlowSpan.editFailure, {
      attributes: { [FlowAttribute.failureName]: response.error._tag },
    }),
    Effect.andThen(emitResponse)
  )
}

const emitPublication = (
  item: PublicationItem
): Effect.Effect<AppMessageData> => {
  if (item.kind === 'keyboard-delete') {
    return Effect.logInfo('Foldkit keyboard deletion requested').pipe(
      Effect.annotateLogs({
        [FlowAttribute.inputKind]: 'keyboard',
        [FlowAttribute.nodeCount]: item.selection.nodeIds.length,
        [FlowAttribute.edgeCount]: item.selection.edgeIds.length,
      }),
      Effect.andThen(
        Port.emit(ports.outbound.keyboardDeleteRequests, item.selection)
      ),
      Effect.withSpan(FlowSpan.editPrepare),
      Effect.as(AppMessage.DeleteApprovalPublished())
    )
  }

  if (item.kind === 'interaction') {
    return Effect.sync(() => {
      for (const event of item.events) {
        if (
          event.resizerId !== undefined &&
          event.resize !== undefined &&
          event.nodeId !== undefined &&
          event.nodeId !== null &&
          (event.name === 'onResizeStart' ||
            event.name === 'onResize' ||
            event.name === 'onResizeEnd')
        ) {
          notifyResizer(event.resizerId, event.name, event.nodeId, event.resize)
        }
      }
    }).pipe(
      Effect.andThen(Port.emit(ports.outbound.interactionEvents, item.events)),
      Effect.as(AppMessage.InteractionEventsPublished())
    )
  }

  if (item.kind === 'connection') {
    return Port.emit(ports.outbound.connectionStates, item.state).pipe(
      Effect.as(AppMessage.ChangePublished())
    )
  }

  if (item.kind === 'interactivity') {
    const attributes = {
      [FlowAttribute.nodesDraggable]: item.state.nodesDraggable,
      [FlowAttribute.nodesConnectable]: item.state.nodesConnectable,
      [FlowAttribute.elementsSelectable]: item.state.elementsSelectable,
    }

    return Effect.logDebug('Published flow interactivity').pipe(
      Effect.annotateLogs(attributes),
      Effect.withSpan(FlowSpan.interactivityChange, { attributes }),
      Effect.andThen(Port.emit(ports.outbound.interactivityStates, item.state)),
      Effect.as(AppMessage.ChangePublished())
    )
  }

  if (item.kind === 'edit-failure') {
    return respondEdit(item.response).pipe(
      Effect.andThen(
        Port.emit(ports.outbound.interactionEvents, [item.interactionError])
      ),
      Effect.as(AppMessage.EditPublished())
    )
  }

  const {
    change,
    acceptedState,
    cancellation,
    lifecycle,
    controlMode,
    elementChanges,
  } = item

  return Effect.gen(function* publishFlowChanges() {
    if (lifecycle !== undefined) {
      yield* logGestureStarted(lifecycle)
    }

    if (cancellation !== undefined) {
      yield* Effect.logDebug('Cancelled Foldkit gesture').pipe(
        Effect.annotateLogs({
          [FlowAttribute.inputKind]: cancellation.kind,
          [FlowAttribute.cancellationReason]: cancellation.reason,
        }),
        Effect.withSpan(FlowSpan.gestureCancel, {
          attributes: {
            [FlowAttribute.inputKind]: cancellation.kind,
            [FlowAttribute.cancellationReason]: cancellation.reason,
          },
        })
      )
    }

    if (change !== undefined) {
      const baseAttributes = {
        [FlowAttribute.changeKind]: change.kind,
      }

      const attributes =
        controlMode === undefined
          ? baseAttributes
          : { ...baseAttributes, [FlowAttribute.controlMode]: controlMode }

      yield* Effect.logDebug('Published Foldkit semantic change').pipe(
        Effect.annotateLogs(attributes),
        Effect.withSpan(interactionCompletionSpan(change), { attributes })
      )
      yield* Port.emit(ports.outbound.changes, change)
    }

    if (elementChanges !== undefined) {
      yield* Port.emit(ports.outbound.elementChanges, elementChanges)
    }

    if (acceptedState !== undefined) {
      yield* Port.emit(ports.outbound.acceptedStates, acceptedState)
    }

    return AppMessage.ChangePublished()
  })
}

// Snapshot reads see an active node drag's live positions, as React Flow's
// `getNodes` and `getInternalNode` do mid-drag.
const selectSnapshotProjection = (
  acceptedGraph: Graph.Model,
  request: typeof SnapshotRequestSchema.Type,
  graph = Graph.selectLiveModel(acceptedGraph)
) =>
  structuredClone({
    requestId: request.requestId,
    snapshot: Graph.selectSnapshot(graph),
    node:
      request.nodeId === undefined
        ? undefined
        : Graph.selectNode(graph, request.nodeId),
    edge:
      request.edgeId === undefined
        ? undefined
        : Graph.selectEdge(graph, request.edgeId),
    internalNode:
      request.nodeId === undefined
        ? null
        : (Graph.selectInternalNode(graph, request.nodeId) ?? null),
    internalNodes:
      request.internalNodes === true
        ? getFlowInternalNodes(graph.document, graph.measurements)
        : undefined,
    nodesInitialized: Graph.selectNodesInitialized(graph, {
      includeHidden: request.includeHiddenNodes === true,
    }),
    nodesData: selectNodesData(
      graph.document,
      (request.nodeIds ?? []).map((id) => NodeIdSchema.make(id))
    ),
    nodeConnections:
      request.connections === undefined
        ? []
        : (() => {
            const options = Schema.decodeUnknownSync(
              FlowNodeConnectionOptionsSchema
            )(request.connections)

            const validatedOptions = {
              nodeId: options.nodeId,
            }

            if (options.type !== undefined) {
              Object.assign(validatedOptions, { type: options.type })
            }

            if (options.handleId !== undefined) {
              Object.assign(validatedOptions, {
                handleId: options.handleId,
              })
            }

            return selectNodeConnections(graph.document, validatedOptions)
          })(),
    handleConnections:
      request.handleConnections === undefined
        ? []
        : Graph.selectHandleConnections(graph, request.handleConnections),
    connectionPreview: Graph.selectConnectionPreview(graph),
  })

const RespondSnapshot = Command.define('RespondFlowSnapshot', {
  args: { response: SnapshotResponseSchema },
  messages: [AppMessage.SnapshotPublished],
  execute: ({ response }) =>
    Port.emit(ports.outbound.snapshots, response).pipe(
      Effect.as(AppMessage.SnapshotPublished())
    ),
})

const RespondVersionedSnapshot = Command.define(
  'RespondVersionedFlowSnapshot',
  {
    args: { response: VersionedSnapshotResponseSchema },
    messages: [AppMessage.SnapshotPublished],
    execute: ({ response }) =>
      Port.emit(ports.outbound.versionedSnapshots, response).pipe(
        Effect.as(AppMessage.SnapshotPublished())
      ),
  }
)

const RespondSnapshotFailure = Command.define('RespondFlowSnapshotFailure', {
  args: { failure: LegacySnapshotFailureSchema },
  messages: [AppMessage.SnapshotPublished],
  execute: ({ failure }) =>
    Effect.gen(function* respondSnapshotFailure() {
      yield* Effect.logError('Foldkit legacy snapshot format rejected').pipe(
        Effect.annotateLogs({
          [FlowAttribute.inputKind]: 'snapshot-request',
          [FlowAttribute.failureName]: 'SavedFlowFormatError',
          [FlowAttribute.failureMessage]: failure.code,
        }),
        Effect.withSpan(FlowSpan.controllerUpdate)
      )
      yield* Port.emit(ports.outbound.snapshotFailures, failure)

      return AppMessage.SnapshotPublished()
    }),
})

const RespondEdit = Command.define('RespondFlowEdit', {
  args: { response: EditResponseSchema },
  messages: [AppMessage.EditPublished],
  execute: ({ response }) => respondEdit(response),
})

const PublishDeleteApproval = Command.define('PublishFoldkitDeleteApproval', {
  args: { request: DeleteApprovalRequestedSchema },
  messages: [AppMessage.DeleteApprovalPublished],
  execute: ({ request }) =>
    Port.emit(ports.outbound.deleteApprovalRequests, request).pipe(
      Effect.as(AppMessage.DeleteApprovalPublished())
    ),
})

const ScheduleDeleteApprovalTimeout = Command.define(
  'ScheduleFoldkitDeleteApprovalTimeout',
  {
    args: {
      operationId: Schema.String,
      baseRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    },
    messages: [AppMessage.DeleteApprovalTimeout],
    execute: ({ operationId, baseRevision }) =>
      Effect.sleep(Duration.millis(DELETE_APPROVAL_TIMEOUT_MS)).pipe(
        Effect.as(
          AppMessage.DeleteApprovalTimeout({ operationId, baseRevision })
        )
      ),
  }
)

const RespondDelete = Command.define('RespondFoldkitDelete', {
  args: { response: DeleteResultSchema },
  messages: [AppMessage.DeleteResultPublished],
  execute: ({ response }) =>
    Port.emit(ports.outbound.deleteResults, response).pipe(
      Effect.as(AppMessage.DeleteResultPublished())
    ),
})

const PublishDeleteCancellationAck = Command.define(
  'PublishFoldkitDeleteCancellationAck',
  {
    args: { acknowledgement: DeleteCancellationAckSchema },
    messages: [AppMessage.DeleteCancellationAckPublished],
    execute: ({ acknowledgement }) =>
      Port.emit(ports.outbound.deleteCancellationAcks, acknowledgement).pipe(
        Effect.as(AppMessage.DeleteCancellationAckPublished())
      ),
  }
)

const RespondMeasurement = Command.define('RespondFlowMeasurement', {
  args: { response: MeasurementResultSchema },
  messages: [AppMessage.MeasurementPublished],
  execute: ({ response }) =>
    Port.emit(ports.outbound.measurementResults, response).pipe(
      Effect.as(AppMessage.MeasurementPublished())
    ),
})

const RespondViewport = Command.define('RespondFlowViewport', {
  args: { response: ViewportResponseSchema },
  messages: [AppMessage.ViewportPublished],
  execute: ({ response }) =>
    Port.emit(ports.outbound.viewportResults, response).pipe(
      Effect.as(AppMessage.ViewportPublished())
    ),
})

const PublishViewportEvent = Command.define('PublishFlowViewportEvent', {
  args: { event: ViewportEventSchema },
  messages: [AppMessage.ViewportEventPublished],
  execute: ({ event }) =>
    Port.emit(ports.outbound.viewportEvents, event).pipe(
      Effect.as(AppMessage.ViewportEventPublished())
    ),
})

const foldGraph = Update.foldChild<
  Model,
  AppMessageData,
  Graph.Model,
  Graph.GraphMessageData,
  Graph.GraphMessageData,
  Graph.OutMessageData,
  PublicationBatch
>({
  update: Graph.update,
  read: (model: Model) => Option.some(model.graph),
  write: (model, graph) => ({ ...model, graph }),
  toParentMessage: (message) => wrapGraphMessage({ message }),
  foldOutMessage:
    (output) =>
    (model): AppReduction =>
      Graph.OutMessage.match(output, {
        GestureCancelled: ({ kind, reason }): AppReduction => ({
          model,
          outMessage: [{ kind: 'change', cancellation: { kind, reason } }],
        }),
        SemanticChange: ({ change, acceptedState }): AppReduction => ({
          model: { ...model, changeKinds: [...model.changeKinds, change.kind] },
          outMessage: [
            {
              kind: 'change',
              change,
              acceptedState,
              controlMode: model.graph.documentMode,
            },
          ],
        }),
        AcceptedState: ({ change }): AppReduction => ({
          model,
          outMessage: [{ kind: 'change', acceptedState: change }],
        }),
        EditCompleted: ({
          requestId,
          result,
          change,
          acceptedState,
        }): AppReduction => ({
          model,
          commands: [RespondEdit({ response: { requestId, result } })],
          outMessage: [
            {
              kind: 'change',
              change,
              acceptedState,
              controlMode: model.graph.documentMode,
            },
          ],
        }),
        EditFailed: ({ requestId, error }): AppReduction => ({
          model,
          outMessage: [
            {
              kind: 'edit-failure',
              response: { requestId, error },
              interactionError: {
                name: 'onError',
                phase: 'event',
                inputKind: 'api',
                reason: error._tag,
              },
            },
          ],
        }),
      }),
})

interface ActiveGestureTelemetry {
  readonly span: string
  readonly kind:
    | 'connection'
    | 'reconnection'
    | 'selection'
    | 'node-drag'
    | 'resize'
    | 'keyboard-resize'
    | 'viewport-pan'
  readonly inputKind: 'pointer' | 'click' | 'keyboard'
  readonly entityId?: string
}

const activeGestureTelemetry = (
  graph: Graph.Model
): ActiveGestureTelemetry | undefined => {
  const pointer = graph.pointerSession

  if (
    pointer !== null &&
    pointer.kind !== 'node-pending' &&
    pointer.kind !== 'connection-pending' &&
    pointer.kind !== 'reconnection-pending'
  ) {
    if (pointer.kind === 'connection') {
      return {
        span: FlowSpan.connectionStart,
        kind: pointer.kind,
        inputKind: 'pointer',
        entityId: pointer.nodeId,
      }
    }

    if (pointer.kind === 'reconnection') {
      return {
        span: FlowSpan.edgeReconnectStart,
        kind: pointer.kind,
        inputKind: 'pointer',
        entityId: pointer.edgeId,
      }
    }

    return {
      span: FlowSpan.nodeDragStart,
      kind: pointer.kind,
      inputKind: 'pointer',
      entityId: pointer.nodeId,
    }
  }

  const gesture = graph.gestureSession

  if (gesture !== null) {
    if (gesture.kind === 'viewport-pan') {
      return {
        span: FlowSpan.viewportPanStart,
        kind: gesture.kind,
        inputKind: 'pointer',
      }
    }

    return gesture.kind === 'selection'
      ? {
          span: FlowSpan.selectionRectStart,
          kind: gesture.kind,
          inputKind: 'pointer',
        }
      : {
          span: FlowSpan.nodeDragStart,
          kind: 'resize',
          inputKind: 'pointer',
          entityId: gesture.nodeId,
        }
  }

  const keyboardConnection = graph.keyboardConnectionSession

  if (keyboardConnection !== null) {
    return keyboardConnection.kind === 'connection'
      ? {
          span: FlowSpan.connectionStart,
          kind: keyboardConnection.kind,
          inputKind: keyboardConnection.inputKind,
          entityId: keyboardConnection.sourceNodeId,
        }
      : {
          span: FlowSpan.edgeReconnectStart,
          kind: keyboardConnection.kind,
          inputKind: keyboardConnection.inputKind,
          entityId: keyboardConnection.edgeId,
        }
  }

  if (graph.keyboardResizeSession !== null) {
    return {
      span: FlowSpan.nodeDragStart,
      kind: 'keyboard-resize',
      inputKind: 'keyboard',
      entityId: graph.keyboardResizeSession.nodeId,
    }
  }
}

const transitionActors = (
  previous: Graph.Model,
  current: Graph.Model,
  message: Graph.GraphMessageData
) => {
  const ownsNode =
    Predicate.isTagged('NodeDragMoved')(message) ||
    previous.pointerSession?.kind === 'node-pending' ||
    previous.pointerSession?.kind === 'node-drag' ||
    current.pointerSession?.kind === 'node-pending' ||
    current.pointerSession?.kind === 'node-drag'

  const project = (graph: Graph.Model) =>
    activeGestureTelemetry(
      ownsNode
        ? {
            ...graph,
            gestureSession: null,
            keyboardConnectionSession: null,
            keyboardResizeSession: null,
          }
        : graph
    )

  return { before: project(previous), after: project(current) }
}

const interactionEventName = (
  kind: ActiveGestureTelemetry['kind'],
  phase: 'start' | 'progress' | 'end'
): Graph.InteractionEvent['name'] => {
  const names: Record<
    ActiveGestureTelemetry['kind'],
    Record<'start' | 'progress' | 'end', Graph.InteractionEvent['name']>
  > = {
    connection: {
      start: 'onConnectStart',
      progress: 'onConnectionPreview',
      end: 'onConnectEnd',
    },
    reconnection: {
      start: 'onReconnectStart',
      progress: 'onReconnectPreview',
      end: 'onReconnectEnd',
    },
    selection: {
      start: 'onSelectionStart',
      progress: 'onSelectionDrag',
      end: 'onSelectionEnd',
    },
    'node-drag': {
      start: 'onNodeDragStart',
      progress: 'onNodeDrag',
      end: 'onNodeDragStop',
    },
    resize: {
      start: 'onNodeDragStart',
      progress: 'onNodeDrag',
      end: 'onNodeDragStop',
    },
    'keyboard-resize': {
      start: 'onNodeDragStart',
      progress: 'onNodeDrag',
      end: 'onNodeDragStop',
    },
    'viewport-pan': {
      start: 'onMoveStart',
      progress: 'onMove',
      end: 'onMoveEnd',
    },
  }

  return names[kind][phase] ?? 'onNodeDrag'
}

const interactionEntity = (
  active: ActiveGestureTelemetry
): Pick<Graph.InteractionEvent, 'nodeId' | 'edgeId' | 'nodeIds'> => {
  if (active.entityId === undefined) {
    return {}
  }

  if (active.kind === 'reconnection') {
    return { edgeId: active.entityId }
  }

  // React Flow drag handlers receive every dragged node; Foldkit drags one.
  return active.kind === 'node-drag' || active.kind === 'resize'
    ? { nodeId: active.entityId, nodeIds: [active.entityId] }
    : { nodeId: active.entityId }
}

type GraphModel = Graph.Model

const handleEndpoint = (
  graph: GraphModel,
  nodeId: string | null,
  handleId: string | null
) => {
  const handle =
    nodeId === null || handleId === null
      ? undefined
      : flowNodeHandles(
          graph.document.nodes.find(({ id }) => id === nodeId)
        ).find(({ id }) => id === handleId)

  return handle === undefined || nodeId === null
    ? undefined
    : { nodeId, handleId: handle.id, type: handle.kind }
}

const reconnectOrigin = (
  graph: GraphModel,
  edgeId: string,
  endpoint: 'source' | 'target'
) => {
  const edge = graph.document.edges.find(({ id }) => id === edgeId)
  const resolved = edge && resolveEdgeHandles(graph.document, edge)

  if (edge === undefined || resolved === undefined) {
    return
  }

  return endpoint === 'target'
    ? handleEndpoint(graph, edge.source, resolved.sourceHandle.id)
    : handleEndpoint(graph, edge.target, resolved.targetHandle.id)
}

const connectionOrigin = (graph: GraphModel) => {
  const pointer = graph.pointerSession
  const keyboard = graph.keyboardConnectionSession

  if (pointer?.kind === 'connection') {
    return handleEndpoint(graph, pointer.nodeId, pointer.sourceHandleId)
  }

  if (pointer?.kind === 'reconnection') {
    return reconnectOrigin(graph, pointer.edgeId, pointer.endpoint)
  }

  if (keyboard?.kind === 'connection') {
    return handleEndpoint(graph, keyboard.sourceNodeId, keyboard.sourceHandleId)
  }

  return keyboard?.kind === 'reconnection'
    ? reconnectOrigin(graph, keyboard.edgeId, keyboard.endpoint)
    : undefined
}

const connectionDrop = (graph: GraphModel, message: Graph.GraphMessageData) => {
  if (Predicate.isTagged('PointerReleased')(message)) {
    return handleEndpoint(graph, message.targetNodeId, message.targetHandleId)
  }

  return Predicate.isTagged('ActivateHandle')(message) ||
    Predicate.isTagged('ClickHandle')(message)
    ? handleEndpoint(graph, message.nodeId, message.handleId)
    : undefined
}

/**
 * Serializable `FinalConnectionState` for `onConnectEnd`/`onReconnectEnd`,
 * plus the release client position React passes as the event.
 */
const connectionEndPayload = (
  previous: GraphModel,
  message: Graph.GraphMessageData,
  connected: boolean,
  cancelled: boolean
): Pick<Graph.InteractionEvent, 'connectionState' | 'clientX' | 'clientY'> => {
  const origin = connectionOrigin(previous)

  const position = Predicate.isTagged('PointerReleased')(message)
    ? { clientX: message.clientX, clientY: message.clientY }
    : {}

  if (origin === undefined) {
    return position
  }

  const drop = cancelled ? undefined : connectionDrop(previous, message)

  return {
    ...position,
    connectionState: {
      isValid: drop === undefined ? null : connected,
      fromNodeId: origin.nodeId,
      fromHandleId: origin.handleId,
      fromHandleType: origin.type,
      toNodeId: drop?.nodeId ?? null,
      toHandleId: drop?.handleId ?? null,
      toHandleType: drop?.type ?? null,
    },
  }
}

const lifecycleMessagePhase = (
  message: Graph.GraphMessageData
): 'progress' | 'release' | 'cancel' | undefined => {
  if (
    Predicate.isTagged('GestureMoved')(message) ||
    Predicate.isTagged('ConnectionPointerMoved')(message) ||
    Predicate.isTagged('NodeDragMoved')(message) ||
    Predicate.isTagged('ResizeByKeyboard')(message)
  ) {
    return 'progress'
  }

  if (
    Predicate.isTagged('PointerReleased')(message) ||
    Predicate.isTagged('GestureReleased')(message) ||
    Predicate.isTagged('RoutedPointerClick')(message)
  ) {
    return 'release'
  }

  if (
    Predicate.isTagged('PointerCancelled')(message) ||
    Predicate.isTagged('CancelGesture')(message)
  ) {
    return 'cancel'
  }

  return undefined
}

const isResizeGesture = (actor: ActiveGestureTelemetry | undefined): boolean =>
  actor?.kind === 'resize' || actor?.kind === 'keyboard-resize'

/** Resize gestures publish no drag events, but still log their start span. */
const resizeLifecycleStarted = (
  route: 'full' | 'node-cancellation',
  before: ActiveGestureTelemetry | undefined,
  after: ActiveGestureTelemetry | undefined
): boolean =>
  route === 'full' &&
  isResizeGesture(after) &&
  (before === undefined || before.kind !== after?.kind)

/** A gesture's start span is logged with its start event, or for a resize. */
const lifecycleStarted = (
  events: readonly Graph.InteractionEvent[],
  route: 'full' | 'node-cancellation',
  before: ActiveGestureTelemetry | undefined,
  after: ActiveGestureTelemetry | undefined
): boolean =>
  events.some((event) => event.phase === 'start') ||
  resizeLifecycleStarted(route, before, after)

// oxlint-disable-next-line complexity
const foldkitLifecycleEvents = (
  previous: Graph.Model,
  current: Graph.Model,
  message: Graph.GraphMessageData,
  result: AppReduction,
  cancellationReason = 'cancelled'
): Graph.InteractionEvent[] => {
  const events: Graph.InteractionEvent[] = []
  const actors = transitionActors(previous, current, message)

  // React fires no node-drag events for NodeResizer or keyboard resizes;
  // resizes report `onResizeStart`/`onResize`/`onResizeEnd` instead.
  const before = isResizeGesture(actors.before) ? undefined : actors.before
  const after = isResizeGesture(actors.after) ? undefined : actors.after
  const explicitPhase = lifecycleMessagePhase(message)

  const phase =
    explicitPhase ??
    (before !== undefined && after === undefined ? 'cancel' : undefined)

  const semanticChange = result.outMessage?.find(
    (item): item is typeof ChangePublicationSchema.Type =>
      item.kind === 'change' && item.change !== undefined
  )

  if (
    'pointerId' in message &&
    current.pointerSession !== null &&
    message.pointerId !== current.pointerSession.pointerId
  ) {
    return []
  }

  const transitioned =
    before !== undefined &&
    after !== undefined &&
    (before.kind !== after.kind ||
      before.inputKind !== after.inputKind ||
      before.entityId !== after.entityId)

  if (transitioned && before !== undefined) {
    events.push({
      name: interactionEventName(before.kind, 'end'),
      phase: 'end',
      inputKind: before.inputKind,
      outcome: 'cancelled',
      reason: 'superseded',
      ...interactionEntity(before),
    })
  }

  if ((before === undefined || transitioned) && after !== undefined) {
    events.push({
      name: interactionEventName(after.kind, 'start'),
      phase: 'start',
      inputKind: after.inputKind,
      ...interactionEntity(after),
    })
  }

  if (
    after !== undefined &&
    phase === 'progress' &&
    current.pointerSession?.kind !== 'connection-pending' &&
    current.pointerSession?.kind !== 'reconnection-pending'
  ) {
    const session = current.gestureSession ?? current.pointerSession

    const progressEvent: Graph.InteractionEvent = {
      name: interactionEventName(after.kind, 'progress'),
      phase: 'progress',
      inputKind: after.inputKind,
      ...interactionEntity(after),
    }

    if (Predicate.isTagged('NodeDragMoved')(message)) {
      events.push({
        ...progressEvent,
        x: message.flowX,
        y: message.flowY,
      })
    } else if (Predicate.isTagged('ResizeByKeyboard')(message)) {
      events.push({
        ...progressEvent,
        x: message.delta.x,
        y: message.delta.y,
      })
    } else if (session !== null && 'currentX' in session) {
      events.push({
        ...progressEvent,
        x: session.currentX,
        y: session.currentY,
      })
    } else {
      events.push(progressEvent)
    }
  }

  if (
    before !== undefined &&
    after === undefined &&
    phase !== undefined &&
    phase !== 'progress'
  ) {
    const snapshotChanged =
      JSON.stringify(Graph.selectSnapshot(previous)) !==
      JSON.stringify(Graph.selectSnapshot(current))

    const viewportChanged =
      previous.gestureSession?.kind === 'viewport-pan' &&
      (previous.gestureSession.viewportStart.x !== current.viewport.x ||
        previous.gestureSession.viewportStart.y !== current.viewport.y)

    const controlledProposal =
      semanticChange?.controlMode === 'controlled' && !snapshotChanged

    const accepted =
      snapshotChanged ||
      viewportChanged ||
      (semanticChange !== undefined && !controlledProposal)

    let outcome: 'accepted' | 'proposed' | 'rejected' | 'cancelled' =
      controlledProposal ? 'proposed' : 'rejected'

    if (phase === 'cancel') {
      outcome = 'cancelled'
    } else if (accepted) {
      outcome = 'accepted'
    }

    const terminal = {
      name: interactionEventName(before.kind, 'end'),
      phase: 'end' as const,
      inputKind: before.inputKind,
      outcome,
      ...interactionEntity(before),
    }

    let terminalEvent: Graph.InteractionEvent =
      before.kind === 'connection' || before.kind === 'reconnection'
        ? {
            ...terminal,
            ...connectionEndPayload(
              previous,
              message,
              semanticChange !== undefined,
              phase === 'cancel'
            ),
          }
        : terminal

    if (phase === 'cancel') {
      terminalEvent = { ...terminalEvent, reason: cancellationReason }
    }

    const proposalChange = Schema.decodeUnknownOption(FlowChangeSchema)(
      semanticChange?.change
    )

    const isConnectionProposal =
      Option.isSome(proposalChange) &&
      ((before.kind === 'connection' &&
        proposalChange.value.kind === 'edge-add') ||
        (before.kind === 'reconnection' &&
          proposalChange.value.kind === 'edge-reconnect'))

    if (phase !== 'cancel' && isConnectionProposal) {
      const proposal: Graph.InteractionEvent = {
        ...terminalEvent,
        name: before.kind === 'connection' ? 'onConnect' : 'onReconnect',
        phase: 'proposal',
      }

      events.push({ ...proposal, change: proposalChange.value })
    }

    events.push(terminalEvent)
  }

  if (
    (Predicate.isTagged('ViewportWheel')(message) ||
      Predicate.isTagged('ViewportDoubleClick')(message)) &&
    (previous.viewport.x !== current.viewport.x ||
      previous.viewport.y !== current.viewport.y ||
      previous.viewport.zoom !== current.viewport.zoom)
  ) {
    const eventInputKind = Predicate.isTagged('ViewportWheel')(message)
      ? 'wheel'
      : 'pointer'

    events.push(
      {
        name: 'onMoveStart',
        phase: 'start',
        inputKind: eventInputKind,
      },
      {
        name: 'onMove',
        phase: 'progress',
        inputKind: eventInputKind,
        x: current.viewport.x,
        y: current.viewport.y,
      },
      {
        name: 'onMoveEnd',
        phase: 'end',
        inputKind: eventInputKind,
        outcome: 'accepted',
      }
    )
  }

  return events
}

const nativeBarrierFor = (
  message: Graph.GraphMessageData
): Graph.NativeBarrier | undefined =>
  Predicate.isTagged('ReplaceDocument')(message) ||
  Predicate.isTagged('ReplaceViewport')(message) ||
  Predicate.isTagged('SetAllowedTargets')(message)
    ? { kind: message._tag }
    : undefined

const selectionDragNames: Partial<
  Record<Graph.InteractionEvent['name'], Graph.InteractionEvent['name']>
> = {
  onNodeDragStart: 'onSelectionDragStart',
  onNodeDrag: 'onSelectionDragMove',
  onNodeDragStop: 'onSelectionDragStop',
}

/**
 * Node drag events carry every dragged node's live position, as React Flow
 * drag handlers receive the dragged nodes. A drag of several nodes also
 * reports the selection drag events with the same payload.
 */
const withNodeDragPayload = (
  events: readonly Graph.InteractionEvent[],
  previous: Graph.Model,
  current: Graph.Model,
  message: Graph.GraphMessageData
): Graph.InteractionEvent[] =>
  events.flatMap((event) => {
    const selectionName = selectionDragNames[event.name]

    if (selectionName === undefined) {
      return [event]
    }

    const graph = event.phase === 'end' ? previous : current
    const session = graph.pointerSession

    if (session?.kind !== 'node-drag') {
      return [event]
    }

    // React Flow reports drag start with the nodes where the press found them.
    let at: { readonly clientX: number; readonly clientY: number } | undefined

    if (event.phase === 'start') {
      at = { clientX: session.startX, clientY: session.startY }
    } else if (
      event.phase === 'end' &&
      Predicate.isTagged('PointerReleased')(message)
    ) {
      at = message
    }

    const positions = Graph.selectNodeDragPositions(graph, at) ?? []

    const primary =
      positions.find(({ nodeId }) => nodeId === session.nodeId) ?? positions[0]

    let enriched: Graph.InteractionEvent = {
      ...event,
      nodeIds: positions.map(({ nodeId }) => nodeId),
      nodePositions: positions,
    }

    if (primary !== undefined) {
      enriched = {
        ...enriched,
        position: primary.position,
        positionAbsolute: primary.positionAbsolute,
      }
    }

    return positions.length > 1
      ? [enriched, { ...enriched, name: selectionName }]
      : [enriched]
  })

/** Attach the React Flow style deltas each semantic change proposes. */
const withElementChanges = (
  document: FlowDocument,
  items: PublicationBatch
): PublicationBatch =>
  items.map((item) => {
    if (item.kind !== 'change' || item.change === undefined) {
      return item
    }

    const elementChanges = flowChangeElementChanges(document, item.change)

    return elementChanges.nodes.length === 0 &&
      elementChanges.edges.length === 0
      ? item
      : { ...item, elementChanges }
  })

type ResizerGesture = Extract<
  NonNullable<Graph.Model['gestureSession']>,
  { kind: 'node-resizer' }
>

const resizerGesture = (graph: Graph.Model): ResizerGesture | undefined =>
  graph.gestureSession?.kind === 'node-resizer'
    ? graph.gestureSession
    : undefined

const resizerEvent = (
  name: 'onResizeStart' | 'onResize' | 'onResizeEnd',
  gesture: ResizerGesture,
  phase: 'start' | 'progress' | 'end',
  resize: NonNullable<Graph.InteractionEvent['resize']>
): Graph.InteractionEvent => ({
  name,
  phase,
  inputKind: 'pointer',
  nodeId: gesture.nodeId,
  resizerId: gesture.resizerId,
  resize,
})

/**
 * React `NodeResizer` callbacks as interaction events: `onResizeStart` on
 * press, `onResize` for each step `shouldResize` allowed, `onResizeEnd` on
 * release when a step was allowed.
 */
const resizerEvents = (
  previous: Graph.Model,
  current: Graph.Model
): readonly Graph.InteractionEvent[] => {
  const before = resizerGesture(previous)
  const after = resizerGesture(current)

  if (before === undefined && after !== undefined) {
    return [
      resizerEvent('onResizeStart', after, 'start', after.resize.previous),
    ]
  }

  if (
    before !== undefined &&
    after !== undefined &&
    after.steps !== before.steps &&
    after.params !== null
  ) {
    return [resizerEvent('onResize', after, 'progress', after.params)]
  }

  if (before !== undefined && after === undefined && before.steps > 0) {
    return [resizerEvent('onResizeEnd', before, 'end', before.resize.previous)]
  }

  return []
}

const resizerPublication = (
  previous: Graph.Model,
  current: Graph.Model
): PublicationBatch => {
  const resized = resizerEvents(previous, current)

  return resized.length === 0
    ? []
    : [{ kind: 'interaction' as const, events: resized }]
}

const graphFold = (
  model: Model,
  message: Graph.GraphMessageData,
  route: 'full' | 'node-cancellation' = 'node-cancellation',
  fullCancellationReason = 'cancelled'
): AppReduction => {
  const result = foldGraph(model, message)

  const { before, after } = transitionActors(
    model.graph,
    result.model.graph,
    message
  )

  const cancellation = result.outMessage?.find(
    (item) => item.kind === 'change' && item.cancellation !== undefined
  )

  const originatingReason =
    cancellation?.kind === 'change'
      ? (cancellation.cancellation?.reason ?? message._tag)
      : message._tag

  const cancellationReason =
    route === 'full' ? fullCancellationReason : originatingReason

  const events =
    route === 'full' ||
    (before?.kind === 'node-drag' && after?.kind !== 'node-drag')
      ? withNodeDragPayload(
          foldkitLifecycleEvents(
            model.graph,
            result.model.graph,
            message,
            result,
            cancellationReason
          ),
          model.graph,
          result.model.graph,
          message
        )
      : []

  const eligible =
    route === 'full'
      ? events
      : events.filter(
          (event) =>
            (event.name === 'onNodeDragStop' ||
              event.name === 'onSelectionDragStop') &&
            event.phase === 'end'
        )

  const started = lifecycleStarted(eligible, route, before, after)

  const nativeBarrier = nativeBarrierFor(message)

  const reduction: AppReduction = {
    ...result,
    outMessage: [
      ...withElementChanges(model.graph.document, result.outMessage ?? []),
      ...(started && after !== undefined
        ? [
            {
              kind: 'change' as const,
              lifecycle: { ...after, controlMode: model.graph.documentMode },
            },
          ]
        : []),
      ...(eligible.length === 0
        ? []
        : [{ kind: 'interaction' as const, events: eligible }]),
      ...resizerPublication(model.graph, result.model.graph),
    ],
  }

  return nativeBarrier === undefined
    ? reduction
    : { ...reduction, nativeBarrier }
}

const hostSubscriptions = Subscription.make<Model, AppMessageData>()(() => ({
  actions: Port.subscriptionEntry(ports.inbound.actions, (action) =>
    AppMessage.HostAction({ action })
  ),
  versionedSnapshotRequests: Port.subscriptionEntry(
    ports.inbound.versionedSnapshotRequests,
    (request) => AppMessage.VersionedSnapshotRequest({ request })
  ),
  snapshotRequests: Port.subscriptionEntry(
    ports.inbound.snapshotRequests,
    (request) => AppMessage.SnapshotRequest({ request })
  ),
  editRequests: Port.subscriptionEntry(ports.inbound.editRequests, (request) =>
    AppMessage.EditRequest({ request })
  ),
  deleteRequests: Port.subscriptionEntry(
    ports.inbound.deleteRequests,
    (request) => AppMessage.DeleteRequest({ request })
  ),
  deleteCancellations: Port.subscriptionEntry(
    ports.inbound.deleteCancellations,
    (cancellation) => AppMessage.DeleteCancellation({ cancellation })
  ),
  deleteApprovalResponses: Port.subscriptionEntry(
    ports.inbound.deleteApprovalResponses,
    (response) => AppMessage.DeleteApprovalResponse({ response })
  ),
  viewportRequests: Port.subscriptionEntry(
    ports.inbound.viewportRequests,
    (request) => AppMessage.ViewportRequest({ request })
  ),
  viewportFrames: Subscription.animationFrameEntry<Model, AppMessageData>({
    isActive: (model) => model.viewportAnimation !== null,
    toMessage: (delta) => AppMessage.ViewportFrame({ delta }),
  }),
}))

const keyboardConnectionOnly = (graph: GraphModel): GraphModel => ({
  ...graph,
  pointerSession: null,
  gestureSession: null,
  keyboardResizeSession: null,
})

/** Pair a click or keyboard connection a host action ended with its terminal. */
const withEndedKeyboardConnection = (
  model: Model,
  result: AppReduction,
  message: Graph.GraphMessageData,
  reason: string
): AppReduction => {
  if (
    model.graph.keyboardConnectionSession === null ||
    result.model.graph.keyboardConnectionSession !== null
  ) {
    return result
  }

  const events = foldkitLifecycleEvents(
    keyboardConnectionOnly(model.graph),
    keyboardConnectionOnly(result.model.graph),
    message,
    result,
    reason
  )

  return events.length === 0
    ? result
    : {
        ...result,
        outMessage: [
          ...(result.outMessage ?? []),
          { kind: 'interaction' as const, events },
        ],
      }
}

/**
 * React Flow's `dimensions` NodeChange when a measurement changes a node's
 * measured size, including its first measurement.
 */
const dimensionsChange = (
  previous: Graph.Model,
  current: Graph.Model,
  nodeId: NodeId
): typeof NodeChangeSchema.Type | undefined => {
  // Raw measurement records: a declared `size` is not a measurement.
  const measured = (graph: Graph.Model) =>
    graph.measurements.nodes.find(
      ({ measurement }) => measurement.nodeId === nodeId
    )?.measurement

  const before = measured(previous)
  const after = measured(current)

  return after === undefined ||
    (before?.width === after.width && before.height === after.height)
    ? undefined
    : {
        id: nodeId,
        type: 'dimensions',
        dimensions: { width: after.width, height: after.height },
      }
}

const calculateFitView = (model: Model, request: ViewportRequest) => {
  let nodeIds: ReadonlySet<typeof NodeIdSchema.Type> | undefined

  if (request.nodes === 'selected') {
    nodeIds = new Set(
      model.graph.document.nodes
        .filter((node) => node.selected === true)
        .map((node) => node.id)
    )
  } else if (request.nodes !== undefined && request.nodes !== 'all') {
    nodeIds = new Set(request.nodes.map((id) => NodeIdSchema.make(id)))
  }

  const measurements = new Map(
    model.graph.measurements.nodes.map(({ measurement }) => [
      measurement.nodeId,
      measurement,
    ])
  )

  const bounds = graphBounds(
    createFlowGraph(model.graph.document, measurements),
    nodeIds,
    { includeHidden: request.includeHiddenNodes === true }
  )

  return bounds === undefined
    ? undefined
    : calculateViewportForBounds({
        bounds,
        width: request.width,
        height: request.height,
        limits: {
          minZoom: request.minZoom ?? model.viewportLimits.minZoom,
          maxZoom: request.maxZoom ?? model.viewportLimits.maxZoom,
        },
        padding: request.padding,
      })
}

// oxlint-disable-next-line complexity -- Initial fitting combines measurement readiness, pane readiness and optional fitting parameters.
const fitInitialView = (model: Model, initial: AppReduction): AppReduction => {
  let measured = initial

  if (
    measured.model.graph.fitViewPending &&
    Graph.selectNodesInitialized(measured.model.graph)
  ) {
    const { graph } = measured.model

    if (graph.paneSize.width > 0 && graph.paneSize.height > 0) {
      const options = graph.fitViewOptions

      const viewport = calculateFitView(measured.model, {
        requestId: 'initial-fit',
        kind: 'fitView',
        width: graph.paneSize.width,
        height: graph.paneSize.height,
        originX: 0,
        originY: 0,
        padding: options.padding ?? 0.1,
        includeHiddenNodes: options.includeHiddenNodes ?? false,
        minZoom: options.minZoom ?? model.viewportLimits.minZoom,
        maxZoom: options.maxZoom ?? model.viewportLimits.maxZoom,
        nodes:
          options.nodes === undefined ||
          options.nodes === 'all' ||
          options.nodes === 'selected'
            ? options.nodes
            : options.nodes.map(({ id }) => id),
      })

      const fitted =
        viewport === undefined
          ? measured
          : graphFold(
              measured.model,
              Graph.Message.ReplaceViewport({ viewport })
            )

      measured = {
        ...fitted,
        model: {
          ...fitted.model,
          graph: { ...fitted.model.graph, fitViewPending: false },
        },
        outMessage: [
          ...(measured.outMessage ?? []),
          ...(fitted === measured ? [] : (fitted.outMessage ?? [])),
        ],
        commands: [
          ...(measured.commands ?? []),
          ...(fitted === measured ? [] : (fitted.commands ?? [])),
        ],
      }
    }
  }

  return measured
}

const routeAction = (model: Model, action: HostActionData) =>
  HostAction.match(action, {
    ReplaceDocument: ({ document }) =>
      graphFold(model, Graph.Message.ReplaceDocument({ document }), 'full'),
    ReplaceViewport: ({ viewport }) =>
      graphFold(model, Graph.Message.ReplaceViewport({ viewport })),
    // Replacing the targets keeps pointer and pane lifecycles silent, but a
    // click or keyboard connection it ends gets a cancelled onConnectEnd.
    SetAllowedTargets: ({ targets }) => {
      const message = Graph.Message.SetAllowedTargets({ targets })

      return withEndedKeyboardConnection(
        model,
        graphFold(model, message),
        message,
        'allowed-targets-changed'
      )
    },
    SetCanvasOptions: ({ options }) =>
      graphFold(model, Graph.Message.SetCanvasOptions({ options })),
    RefreshRenderers: () => graphFold(model, Graph.Message.RefreshRenderers()),
    DispatchCommand: ({ command }) =>
      graphFold(model, Graph.Message.DispatchCommand({ command })),
    SetColorMode: ({ mode }) =>
      graphFold(model, Graph.Message.SetColorMode({ mode })),
    // Merges a partial patch, ends a click or keyboard connection that can no
    // longer finish, and publishes the resulting switches. An empty patch
    // just publishes the current switches.
    SetInteractivity: ({ _tag: _action, ...switches }) => {
      const result = graphFold(
        model,
        Graph.Message.SetInteractivity(switches),
        'full',
        'interactivity-changed'
      )

      const { nodesDraggable, nodesConnectable, elementsSelectable } =
        result.model.graph

      return {
        ...result,
        outMessage: [
          ...(result.outMessage ?? []),
          {
            kind: 'interactivity' as const,
            state: { nodesDraggable, nodesConnectable, elementsSelectable },
          },
        ],
      }
    },
    MeasureNode: ({ requestId, measurement }) => {
      let measured = graphFold(
        model,
        Graph.Message.MeasureNode({ measurement })
      )

      measured = fitInitialView(model, measured)

      const dimensions = dimensionsChange(
        model.graph,
        measured.model.graph,
        measurement.nodeId
      )

      const result: AppReduction =
        dimensions === undefined
          ? measured
          : {
              ...measured,
              outMessage: [
                ...(measured.outMessage ?? []),
                {
                  kind: 'change',
                  elementChanges: { nodes: [dimensions], edges: [] },
                },
              ],
            }

      const internalNode =
        Graph.selectInternalNode(result.model.graph, measurement.nodeId) ?? null

      const acceptedGeneration = result.model.graph.measurements.nodes.find(
        ({ measurement: accepted }) => accepted.nodeId === measurement.nodeId
      )?.generation

      let status: 'measured' | 'stale' | 'missing' = 'stale'

      if (internalNode === null) {
        status = 'missing'
      } else if (
        acceptedGeneration === measurement.generation &&
        internalNode.measurementStatus === 'measured' &&
        internalNode.width === measurement.width &&
        internalNode.height === measurement.height
      ) {
        status = 'measured'
      }

      return {
        ...result,
        commands: [
          ...(result.commands ?? []),
          RespondMeasurement({
            response: {
              requestId,
              nodeId: measurement.nodeId,
              status,
              internalNode,
              nodesInitialized: Graph.selectNodesInitialized(
                result.model.graph
              ),
            },
          }),
        ],
      }
    },
  })

const observeViewportReplacement = (
  result: AppReduction,
  viewportMode: Model['graph']['viewportMode'],
  previous: Viewport,
  replacement: Viewport
) => {
  if (
    viewportMode === 'controlled' ||
    (replacement.x === previous.x &&
      replacement.y === previous.y &&
      replacement.zoom === previous.zoom)
  ) {
    return result
  }

  return {
    ...result,
    commands: [
      ...(result.commands ?? []),
      PublishViewportEvent({
        event: { kind: 'start', source: 'programmatic', viewport: previous },
      }),
      PublishViewportEvent({
        event: {
          kind: 'change',
          source: 'programmatic',
          viewport: replacement,
        },
      }),
      PublishViewportEvent({
        event: { kind: 'end', source: 'programmatic', viewport: replacement },
      }),
    ],
  }
}

const viewportPanValue = (graph: Graph.Model): Viewport | undefined => {
  const gesture = graph.gestureSession

  if (gesture?.kind !== 'viewport-pan') {
    return undefined
  }

  if (graph.viewportMode === 'uncontrolled') {
    return graph.viewport
  }

  return {
    ...gesture.viewportStart,
    x: gesture.viewportStart.x + gesture.currentX - gesture.startX,
    y: gesture.viewportStart.y + gesture.currentY - gesture.startY,
  }
}

const viewportPanEvents = (
  previous: Graph.Model,
  current: Graph.Model,
  message: Graph.GraphMessageData
): readonly (typeof ViewportEventSchema.Type)[] => {
  const previousGesture = previous.gestureSession
  const currentGesture = current.gestureSession
  const beforePan = previousGesture?.kind === 'viewport-pan'
  const afterPan = currentGesture?.kind === 'viewport-pan'

  if (!beforePan && afterPan) {
    return [{ kind: 'start', source: 'user', viewport: previous.viewport }]
  }

  if (Predicate.isTagged('GestureMoved')(message) && beforePan && afterPan) {
    const previousValue = viewportPanValue(previous)
    const currentValue = viewportPanValue(current)

    if (
      previousValue === undefined ||
      currentValue === undefined ||
      (previousValue.x === currentValue.x &&
        previousValue.y === currentValue.y &&
        previousValue.zoom === currentValue.zoom)
    ) {
      return []
    }

    return [{ kind: 'change', source: 'user', viewport: currentValue }]
  }

  if (
    beforePan &&
    !afterPan &&
    (Predicate.isTagged('GestureReleased')(message) ||
      Predicate.isTagged('PointerCancelled')(message) ||
      Predicate.isTagged('CancelGesture')(message))
  ) {
    const viewport = viewportPanValue(previous) ?? current.viewport

    return [{ kind: 'end', source: 'user', viewport }]
  }

  return []
}

interface ViewportCandidate {
  readonly proposed: Viewport
  readonly point?: { readonly x: number; readonly y: number } | undefined
}

const calculateCandidate = (
  model: Model,
  request: ViewportRequest,
  current: Viewport
): ViewportCandidate => {
  switch (request.kind) {
    case 'get': {
      return { proposed: current }
    }

    case 'flowToScreen': {
      return {
        proposed: current,
        point:
          request.point === undefined
            ? undefined
            : {
                x: request.originX + current.x + request.point.x * current.zoom,
                y: request.originY + current.y + request.point.y * current.zoom,
              },
      }
    }

    case 'screenToFlow': {
      return {
        proposed: current,
        point:
          request.point === undefined
            ? undefined
            : {
                x:
                  (request.point.x - request.originX - current.x) /
                  current.zoom,
                y:
                  (request.point.y - request.originY - current.y) /
                  current.zoom,
              },
      }
    }

    case 'set': {
      return { proposed: request.viewport ?? current }
    }

    case 'zoom': {
      const zoom = Math.min(
        model.viewportLimits.maxZoom,
        Math.max(model.viewportLimits.minZoom, request.zoom ?? current.zoom)
      )

      const center = request.point ?? {
        x: request.width / 2,
        y: request.height / 2,
      }

      return {
        proposed: {
          zoom,
          x: center.x - ((center.x - current.x) / current.zoom) * zoom,
          y: center.y - ((center.y - current.y) / current.zoom) * zoom,
        },
      }
    }

    case 'center': {
      return {
        proposed:
          request.point === undefined
            ? current
            : {
                ...current,
                x: request.width / 2 - request.point.x * current.zoom,
                y: request.height / 2 - request.point.y * current.zoom,
              },
      }
    }

    case 'fitBounds': {
      return {
        proposed:
          request.bounds === undefined
            ? current
            : (calculateViewportForBounds({
                bounds: request.bounds,
                width: request.width,
                height: request.height,
                limits: model.viewportLimits,
                padding: request.padding,
              }) ?? current),
      }
    }

    case 'fitView': {
      return { proposed: calculateFitView(model, request) ?? current }
    }

    default: {
      const exhaustive: never = request.kind

      return exhaustive
    }
  }
}

const isValidViewportRequest = (request: ViewportRequest) => {
  const requiresPoint =
    request.kind === 'center' ||
    request.kind === 'flowToScreen' ||
    request.kind === 'screenToFlow'

  return (
    !(request.kind === 'set' && request.viewport === undefined) &&
    !(requiresPoint && request.point === undefined) &&
    !(
      request.kind === 'zoom' &&
      (request.zoom === undefined || request.zoom <= 0)
    ) &&
    request.width >= 0 &&
    request.height >= 0
  )
}

const getViewportProposal = (model: Model, request: ViewportRequest) => {
  const current = model.graph.viewport
  let status: typeof ViewportOperationStatusSchema.Type = 'unchanged'

  if (!isValidViewportRequest(request)) {
    status = 'rejected'
  }

  const candidate =
    status === 'rejected'
      ? { proposed: current }
      : calculateCandidate(model, request, current)

  const { point } = candidate

  // React applies `translateExtent` to every viewport the d3-zoom behaviour
  // sets, including programmatic ones.
  const proposed =
    request.kind === 'get' ||
    request.kind === 'flowToScreen' ||
    request.kind === 'screenToFlow'
      ? candidate.proposed
      : Graph.constrainViewportToTranslateExtent(
          model.graph,
          candidate.proposed,
          { width: request.width, height: request.height }
        )

  const mutating =
    request.kind === 'set' ||
    request.kind === 'zoom' ||
    request.kind === 'center' ||
    request.kind === 'fitBounds' ||
    request.kind === 'fitView'

  const changed =
    proposed.x !== current.x ||
    proposed.y !== current.y ||
    proposed.zoom !== current.zoom

  if (status === 'unchanged' && mutating && changed) {
    status = model.graph.viewportMode === 'controlled' ? 'proposed' : 'accepted'
  }

  return { current, proposed, point, status, mutating, changed }
}

const isConnecting = (graph: GraphModel): boolean =>
  graph.pointerSession?.kind === 'connection' ||
  graph.pointerSession?.kind === 'reconnection'

/** `useConnection` updates while a pointer connection or reconnection runs. */
const connectionStatePublication = (
  previous: GraphModel,
  current: GraphModel
): PublicationBatch =>
  previous.pointerSession !== current.pointerSession &&
  (isConnecting(previous) || isConnecting(current))
    ? [{ kind: 'connection', state: Graph.selectConnectionState(current) }]
    : []

/** React Flow `onSelectionChange`, from the accepted document's selection. */
const selectionChangePublication = (
  previous: FlowDocument,
  current: FlowDocument
): PublicationItem | undefined => {
  const before = selectFlowSelection(previous)
  const after = selectFlowSelection(current)

  return flowSelectionEqual(before, after)
    ? undefined
    : {
        kind: 'interaction',
        events: [
          {
            name: 'onSelectionChange',
            phase: 'event',
            inputKind: 'runtime',
            nodeIds: after.nodes.map(({ id }) => id),
            edgeIds: after.edges.map(({ id }) => id),
          },
        ],
      }
}

export const update = (model: Model, message: AppMessageData): AppReduction => {
  const updateResult = AppMessage.match<AppReduction>(message, {
    GraphMessage: ({ message: graphMessage }) => {
      if (Predicate.isTagged('DeleteSelected')(graphMessage)) {
        return {
          model,
          outMessage: [
            {
              kind: 'keyboard-delete',
              selection: {
                nodeIds: model.graph.document.nodes
                  .filter(({ selected }) => selected === true)
                  .map(({ id }) => id),
                edgeIds: model.graph.document.edges
                  .filter(({ selected }) => selected === true)
                  .map(({ id }) => id),
              },
            },
          ],
        }
      }

      const folded = graphFold(model, graphMessage, 'full')

      const result = Predicate.isTagged('PaneResized')(graphMessage)
        ? fitInitialView(model, folded)
        : folded

      const readyModel = model.lifecycleReady
        ? result.model
        : { ...result.model, lifecycleReady: true }

      const lifecycleEvents: Graph.InteractionEvent[] = []

      if (Predicate.isTagged('ObserveMouse')(graphMessage)) {
        const observed: Graph.InteractionEvent = {
          name: graphMessage.name,
          phase: 'event',
          inputKind: 'pointer',
          nodeId: graphMessage.nodeId,
          edgeId: graphMessage.edgeId,
          ...graphMessage.pointer,
        }

        lifecycleEvents.push(observed)

        // Every canvas context menu still reports the legacy selection event.
        if (
          graphMessage.name === 'onNodeContextMenu' ||
          graphMessage.name === 'onEdgeContextMenu' ||
          graphMessage.name === 'onPaneContextMenu'
        ) {
          lifecycleEvents.push({ ...observed, name: 'onSelectionContextMenu' })
        }
      } else if (Predicate.isTagged('SelectEdge')(graphMessage)) {
        lifecycleEvents.push({
          name: 'onEdgeClick',
          phase: 'event',
          inputKind: 'pointer',
          edgeId: graphMessage.edgeId,
          ...graphMessage.pointer,
        })
      }

      const events: Graph.InteractionEvent[] = [...lifecycleEvents]

      const connectionState = connectionStatePublication(
        model.graph,
        readyModel.graph
      )

      const viewportEvents = viewportPanEvents(
        model.graph,
        readyModel.graph,
        graphMessage
      )

      return {
        ...result,
        model: readyModel,
        outMessage: [
          ...(model.lifecycleReady
            ? []
            : [
                {
                  kind: 'interaction' as const,
                  events: [
                    {
                      name: 'onInit' as const,
                      phase: 'event' as const,
                      inputKind: 'runtime' as const,
                    },
                  ],
                },
              ]),
          ...(result.outMessage ?? []),
          ...(events.length === 0
            ? []
            : [{ kind: 'interaction' as const, events }]),
          ...connectionState,
        ],
        commands: [
          ...(result.commands ?? []),
          ...viewportEvents.map((event) => PublishViewportEvent({ event })),
        ],
      }
    },
    HostAction: ({ action }) => {
      const result = routeAction(model, action)

      return Predicate.isTagged('ReplaceViewport')(action)
        ? observeViewportReplacement(
            result,
            model.graph.viewportMode,
            model.graph.viewport,
            action.viewport
          )
        : result
    },
    SnapshotRequest: ({ request }) => {
      let savedSession: typeof SavedFlowSessionSchema.Type

      try {
        savedSession = Schema.decodeUnknownSync(SavedFlowSessionSchema)(
          Graph.selectSavedSession(model.graph)
        )
      } catch (error) {
        if (!(error instanceof SavedFlowFormatError)) {
          throw error
        }

        return {
          model,
          commands: [
            RespondSnapshotFailure({
              failure: { requestId: request.requestId, code: error.code },
            }),
          ],
        }
      }

      return {
        model,
        commands: [
          RespondSnapshot({
            response: {
              ...selectSnapshotProjection(model.graph, request),
              savedSession,
            },
          }),
        ],
      }
    },
    VersionedSnapshotRequest: ({ request }) => ({
      model,
      commands: [
        RespondVersionedSnapshot({
          response: {
            ...selectSnapshotProjection(model.graph, request),
            savedSession: Schema.decodeUnknownSync(
              SavedVersionedFlowSessionSchema
            )(Graph.selectVersionedSavedSession(model.graph)),
          },
        }),
      ],
    }),
    EditRequest: ({ request }) =>
      graphFold(
        model,
        Graph.Message.EditRequest({
          requestId: request.requestId,
          transaction: request.transaction,
        })
      ),
    DeleteRequest: ({ request }) => {
      if (
        model.pendingDeleteApprovals.some(
          (pending) => pending.operationId === request.operationId
        )
      ) {
        return { model }
      }

      const cancellation = model.cancelledDeleteOperations.find(
        (item) => item.operationId === request.operationId
      )

      if (cancellation !== undefined) {
        const error =
          cancellation.reason === 'timed-out'
            ? new FlowDeleteApprovalFailed({
                operationId: request.operationId,
                reason: 'ApprovalTimedOut',
              })
            : new FlowDeleteCancelled({ operationId: request.operationId })

        return {
          model: {
            ...model,
            cancelledDeleteOperations: model.cancelledDeleteOperations.filter(
              (item) => item !== cancellation
            ),
          },
          commands: [
            RespondDelete({
              response: { operationId: request.operationId, error },
            }),
          ],
        }
      }

      if (model.pendingDeleteApprovals.length >= MAX_PENDING_DELETE_APPROVALS) {
        const error = new FlowDeleteInProgress({
          operationId: request.operationId,
        })

        return {
          model,
          commands: [
            RespondDelete({
              response: { operationId: request.operationId, error },
            }),
          ],
        }
      }

      if (request.baseRevision !== model.acceptedDocumentRevision) {
        const error = new FlowDeleteRevisionConflict({
          operationId: request.operationId,
          expectedRevision: request.baseRevision,
          actualRevision: model.acceptedDocumentRevision,
        })

        return {
          model,
          commands: [
            RespondDelete({
              response: { operationId: request.operationId, error },
            }),
          ],
        }
      }

      const exit = Effect.runSyncExit(
        prepareFlowDeleteCandidate(model.graph.document, request)
      )

      return Exit.match(exit, {
        onFailure: (cause) => {
          const failure = Cause.findErrorOption(cause)

          if (Option.isNone(failure)) {
            throw new Error('FoldkitDeleteCandidateFailedWithoutTypedError')
          }

          const error = Schema.decodeUnknownSync(FlowEditErrorSchema)(
            failure.value
          )

          return {
            model,
            commands: [
              RespondDelete({
                response: { operationId: request.operationId, error },
              }),
            ],
          }
        },
        onSuccess: ({ candidate }) => {
          const approval = {
            operationId: request.operationId,
            baseRevision: request.baseRevision,
            candidate,
          }

          return {
            model: {
              ...model,
              pendingDeleteApprovals: [
                ...model.pendingDeleteApprovals,
                approval,
              ],
            },
            commands: [
              PublishDeleteApproval({ request: approval }),
              ScheduleDeleteApprovalTimeout({
                operationId: request.operationId,
                baseRevision: request.baseRevision,
              }),
            ],
          }
        },
      })
    },
    DeleteCancellation: ({ cancellation }) => {
      const pending = model.pendingDeleteApprovals.find(
        (item) => item.operationId === cancellation.operationId
      )

      const acknowledgement = (outcome: 'cancelled' | 'already-settled') =>
        PublishDeleteCancellationAck({
          acknowledgement: {
            operationId: cancellation.operationId,
            baseRevision: cancellation.baseRevision,
            reason: cancellation.reason,
            outcome,
          },
        })

      if (pending === undefined) {
        const alreadyCancelled = model.cancelledDeleteOperations.some(
          (item) => item.operationId === cancellation.operationId
        )

        if (alreadyCancelled) {
          return { model, commands: [acknowledgement('cancelled')] }
        }

        if (
          model.cancelledDeleteOperations.length >= MAX_PENDING_DELETE_APPROVALS
        ) {
          return { model, commands: [acknowledgement('already-settled')] }
        }

        return {
          model: {
            ...model,
            cancelledDeleteOperations: [
              ...model.cancelledDeleteOperations,
              cancellation,
            ],
          },
          commands: [acknowledgement('cancelled')],
        }
      }

      if (pending.baseRevision !== cancellation.baseRevision) {
        return { model, commands: [acknowledgement('already-settled')] }
      }

      const error =
        cancellation.reason === 'timed-out'
          ? new FlowDeleteApprovalFailed({
              operationId: cancellation.operationId,
              reason: 'ApprovalTimedOut',
            })
          : new FlowDeleteCancelled({ operationId: cancellation.operationId })

      return {
        model: {
          ...model,
          pendingDeleteApprovals: model.pendingDeleteApprovals.filter(
            (item) => item.operationId !== cancellation.operationId
          ),
        },
        commands: [
          RespondDelete({
            response: { operationId: cancellation.operationId, error },
          }),
          acknowledgement('cancelled'),
        ],
      }
    },
    DeleteApprovalTimeout: ({ operationId, baseRevision }) => {
      const pending = model.pendingDeleteApprovals.find(
        (item) =>
          item.operationId === operationId && item.baseRevision === baseRevision
      )

      if (pending === undefined) {
        return { model }
      }

      return {
        model: {
          ...model,
          pendingDeleteApprovals: model.pendingDeleteApprovals.filter(
            (item) => item.operationId !== operationId
          ),
        },
        commands: [
          RespondDelete({
            response: {
              operationId,
              error: new FlowDeleteApprovalFailed({
                operationId,
                reason: 'ApprovalTimedOut',
              }),
            },
          }),
        ],
      }
    },
    DeleteApprovalResponse: ({ response }) => {
      const pending = model.pendingDeleteApprovals.find(
        (item) => item.operationId === response.operationId
      )

      if (pending === undefined) {
        return { model }
      }

      const withoutPending = {
        ...model,
        pendingDeleteApprovals: model.pendingDeleteApprovals.filter(
          (item) => item.operationId !== response.operationId
        ),
      }

      const fail = (error: typeof FlowEditErrorSchema.Type) => ({
        model: withoutPending,
        commands: [
          RespondDelete({
            response: { operationId: response.operationId, error },
          }),
        ],
      })

      if (
        response.baseRevision !== pending.baseRevision ||
        model.acceptedDocumentRevision !== pending.baseRevision
      ) {
        return fail(
          new FlowDeleteRevisionConflict({
            operationId: response.operationId,
            expectedRevision: pending.baseRevision,
            actualRevision: model.acceptedDocumentRevision,
          })
        )
      }

      if (response.kind === 'cancelled') {
        return fail(
          new FlowDeleteCancelled({ operationId: response.operationId })
        )
      }

      if (response.kind === 'failed') {
        return fail(
          new FlowDeleteApprovalFailed({
            operationId: response.operationId,
            reason: response.reason,
          })
        )
      }

      if (response.decision === false) {
        return fail(
          new FlowDeleteCancelled({ operationId: response.operationId })
        )
      }

      const exit = Effect.runSyncExit(
        finalizeFlowDeleteCandidate(
          model.graph.document,
          pending.candidate,
          response.decision,
          response.operationId
        )
      )

      return Exit.match(exit, {
        onFailure: (cause) => {
          const failure = Cause.findErrorOption(cause)

          if (Option.isNone(failure)) {
            throw new Error('FoldkitDeleteApprovalFailedWithoutTypedError')
          }

          const error = Schema.decodeUnknownSync(FlowEditErrorSchema)(
            failure.value
          )

          return fail(error)
        },
        onSuccess: (deleteResult) => {
          const deleted = graphFold(
            withoutPending,
            Graph.Message.ApplyDeleteResult({
              result: deleteResult,
            })
          )

          return {
            ...deleted,
            commands: [
              ...(deleted.commands ?? []),
              RespondDelete({
                response: {
                  operationId: response.operationId,
                  result: deleteResult,
                },
              }),
            ],
          }
        },
      })
    },
    DeleteApprovalPublished: () => ({ model }),
    DeleteCancellationAckPublished: () => ({ model }),
    DeleteResultPublished: () => ({ model }),
    SnapshotPublished: () => ({ model }),
    ChangePublished: () => ({ model }),
    EditPublished: () => ({ model }),
    MeasurementPublished: () => ({ model }),
    ViewportPublished: () => ({ model }),
    ViewportEventPublished: () => ({ model }),
    InteractionEventsPublished: () => ({ model }),
    ViewportFrame: ({ delta }) => {
      const animation = model.viewportAnimation

      if (animation === null) {
        return { model }
      }

      const elapsed = animation.elapsed + Math.min(64, Math.max(0, delta))
      const progress = Math.min(1, elapsed / animation.duration)

      const viewport = interpolateViewport(
        animation.from,
        animation.to,
        progress,
        animation.easing
      )

      const graph = { ...model.graph, viewport }

      if (progress < 1) {
        return {
          model: {
            ...model,
            graph,
            viewportAnimation: { ...animation, elapsed },
          },
          commands: [
            PublishViewportEvent({
              event: { kind: 'change', source: 'programmatic', viewport },
            }),
            RespondViewport({
              response: {
                requestId: animation.requestId,
                status: 'accepted',
                viewport,
                initialized: true,
                complete: false,
              },
            }),
          ],
        }
      }

      const acceptedState = {
        previous: animation.previous,
        current: { document: graph.document, viewport },
        cause: 'viewport-update' as const,
      }

      const change: typeof FlowChangeSchema.Type = {
        kind: 'viewport',
        viewport,
      }

      return {
        model: { ...model, graph, viewportAnimation: null },
        outMessage: [{ kind: 'change' as const, change, acceptedState }],
        commands: [
          PublishViewportEvent({
            event: { kind: 'change', source: 'programmatic', viewport },
          }),
          PublishViewportEvent({
            event: { kind: 'end', source: 'programmatic', viewport },
          }),
          RespondViewport({
            response: {
              requestId: animation.requestId,
              status: 'accepted',
              viewport,
              initialized: true,
              complete: true,
            },
          }),
        ],
      }
    },
    ViewportRequest: ({ request }) => {
      const {
        current,
        proposed,
        point,
        status,
        mutating,
        changed: viewportChanged,
      } = getViewportProposal(model, request)

      const animated =
        request.animation !== undefined && request.animation.duration !== 0

      const response = {
        requestId: request.requestId,
        status,
        viewport: proposed,
        point,
        initialized: request.width > 0 && request.height > 0,
        complete: true,
      }

      const priorAnimation = model.viewportAnimation

      const superseded =
        priorAnimation !== null && mutating
          ? [
              PublishViewportEvent({
                event: {
                  kind: 'end',
                  source: 'programmatic',
                  viewport: current,
                },
              }),
              RespondViewport({
                response: {
                  requestId: priorAnimation.requestId,
                  status: 'superseded',
                  viewport: current,
                  initialized: true,
                  complete: true,
                },
              }),
            ]
          : []

      const animateNow =
        status === 'accepted' &&
        animated &&
        viewportChanged &&
        model.graph.viewportMode === 'uncontrolled'

      if (animateNow) {
        const next = {
          requestId: request.requestId,
          from: current,
          to: proposed,
          elapsed: 0,
          duration: request.animation?.duration ?? 300,
          easing: request.animation?.easing ?? ('linear' as const),
          previous: Graph.selectSnapshot(model.graph),
        }

        return {
          model: { ...model, viewportAnimation: next },
          commands: [
            ...superseded,
            PublishViewportEvent({
              event: {
                kind: 'start',
                source: 'programmatic',
                viewport: current,
              },
            }),
          ],
        }
      }

      const base =
        priorAnimation !== null && mutating
          ? { ...model, viewportAnimation: null }
          : model

      const changed =
        status === 'accepted'
          ? routeAction(
              base,
              HostAction.ReplaceViewport({ viewport: proposed })
            )
          : { model: base }

      const immediateEvents =
        (status === 'accepted' || status === 'proposed') && viewportChanged
          ? [
              PublishViewportEvent({
                event: {
                  kind: 'start',
                  source: 'programmatic',
                  viewport: current,
                },
              }),
              PublishViewportEvent({
                event: {
                  kind: 'change',
                  source: 'programmatic',
                  viewport: proposed,
                },
              }),
              PublishViewportEvent({
                event: {
                  kind: 'end',
                  source: 'programmatic',
                  viewport: proposed,
                },
              }),
            ]
          : []

      return {
        ...changed,
        commands: [
          ...superseded,
          ...(changed.commands ?? []),
          ...immediateEvents,
          RespondViewport({ response }),
        ],
      }
    },
  })

  const acceptedDocumentChanged =
    JSON.stringify(updateResult.model.graph.document) !==
    JSON.stringify(model.graph.document)

  if (!acceptedDocumentChanged) {
    return updateResult
  }

  const selection = selectionChangePublication(
    model.graph.document,
    updateResult.model.graph.document
  )

  const revised = {
    ...updateResult,
    model: {
      ...updateResult.model,
      acceptedDocumentRevision: model.acceptedDocumentRevision + 1,
    },
  }

  if (selection === undefined) {
    return revised
  }

  const published = 'outMessage' in updateResult ? updateResult.outMessage : []

  return { ...revised, outMessage: [...(published ?? []), selection] }
}

export const initialModel = (
  document: FlowDocument,
  viewport: Viewport,
  allowedTargets: readonly string[] = [],
  viewportLimits: typeof ViewportLimitsSchema.Type = defaultViewportLimits,
  selectionMode: typeof SelectionModeSchema.Type = 'full',
  interactionOptions: Graph.GraphInteractionOptions = Graph.defaultInteractionOptions
): Model => ({
  graph: Graph.initialModel(
    document,
    viewport,
    allowedTargets,
    'uncontrolled',
    'uncontrolled',
    selectionMode,
    interactionOptions
  ),
  changeKinds: [],
  viewportAnimation: null,
  viewportLimits,
  lifecycleReady: false,
  acceptedDocumentRevision: 0,
  pendingDeleteApprovals: [],
  cancelledDeleteOperations: [],
})

export const view = (
  model: Model,
  h: Html.HtmlBuilder<AppMessageData>,
  graphView: ReturnType<typeof Graph.makeView>
): Html.Html =>
  h.div(
    [h.Class('flow-foldkit-root')],
    [
      h.submodel({
        slotId: 'flow-graph',
        model: model.graph,
        view: graphView,
        toParentMessage: (message) => wrapGraphMessage({ message }),
      }),
    ]
  )

const freezePublication = <A>(value: A): A => {
  if (Predicate.isObject(value)) {
    for (const child of Object.values(value)) {
      freezePublication(child)
    }

    Object.freeze(value)
  }

  return value
}

const detachPublication = (item: PublicationItem): PublicationItem => {
  if (item.kind === 'edit-failure') {
    const encoded = Schema.encodeSync(EditResponseSchema)(item.response)

    const response = Schema.decodeUnknownSync(EditResponseSchema)(
      structuredClone(encoded)
    )

    return freezePublication({
      ...item,
      response,
      interactionError: Schema.decodeUnknownSync(Graph.InteractionEventSchema)(
        structuredClone(
          Schema.encodeSync(Graph.InteractionEventSchema)(item.interactionError)
        )
      ),
    })
  }

  const copied = structuredClone(item)

  if (copied.kind === 'change' && copied.acceptedState !== undefined) {
    const state = copied.acceptedState

    return freezePublication({
      ...copied,
      acceptedState: {
        ...state,
        previous: createFlowSnapshot(
          state.previous.document,
          state.previous.viewport
        ),
        current: createFlowSnapshot(
          state.current.document,
          state.current.viewport
        ),
      },
    })
  }

  return freezePublication(copied)
}

export const createProgramPublication = (
  pointer: ReturnType<typeof Graph.createPointerResource>,
  emit: typeof emitPublication = emitPublication
) => {
  const queue = Effect.runSync(Queue.unbounded<PublicationBatch>())
  let closed = false
  let failure: Cause.Cause<never> | undefined
  let worker: Fiber.Fiber<void> | undefined

  const close = (interrupt = true): void => {
    if (closed) {
      return
    }

    closed = true
    pointer.close()
    Effect.runSync(Queue.shutdown(queue))

    if (interrupt) {
      worker?.interruptUnsafe()
    }
  }

  const enqueue = (batch: PublicationBatch | undefined): void => {
    if (closed) {
      throw new Error('Publication lane is closed')
    }

    if (batch === undefined || batch.length === 0) {
      return
    }

    try {
      const detached = Object.freeze(batch.map(detachPublication))

      if (!Queue.offerUnsafe(queue, detached)) {
        throw new Error('Publication queue rejected batch')
      }
    } catch (error) {
      close()
      throw error
    }
  }

  const stream = Stream.unwrap(
    Effect.gen(function* stream() {
      const scope = yield* Effect.acquireRelease(
        Scope.make('sequential'),
        (acquiredScope) => Scope.close(acquiredScope, Exit.void)
      )

      yield* Scope.addFinalizer(
        scope,
        Effect.sync(() => close())
      )

      const input = yield* pointer.acquire.pipe(
        Effect.provideService(Scope.Scope, scope)
      )

      worker = yield* Stream.fromQueue(queue).pipe(
        Stream.runForEach((batch) =>
          Effect.gen(function* emitBatch() {
            yield* Effect.yieldNow

            for (const item of batch) {
              if (closed) {
                return
              }

              yield* emit(item)
            }
          })
        ),
        Effect.catchCause((cause) =>
          Effect.gen(function* emitBatch() {
            failure = cause
            const error = Cause.squash(cause)
            close(false)
            yield* Effect.logError('Foldkit publication failed').pipe(
              Effect.annotateLogs({
                [FlowAttribute.failureMessage]: Cause.pretty(cause),
                [FlowAttribute.failureName]:
                  error instanceof Error ? error.name : 'Unknown',
              }),
              Effect.withSpan(FlowSpan.editFailure)
            )

            return yield* Effect.failCause(cause)
          })
        ),
        Effect.forkIn(scope)
      )

      return Stream.merge(
        input.pipe(Stream.map((message) => wrapGraphMessage({ message }))),
        Stream.fromEffect(
          Fiber.join(worker).pipe(Effect.as(AppMessage.ChangePublished()))
        )
      )
    })
  ).pipe(Stream.catchCause((cause) => Stream.failCause(failure ?? cause)))

  return { enqueue, stream, close }
}

export const createProgramUpdate =
  (
    pointerResource: ReturnType<typeof Graph.createPointerResource>,
    publication: Pick<
      ReturnType<typeof createProgramPublication>,
      'enqueue' | 'close'
    >
  ) =>
  (model: Model, message: AppMessageData) => {
    try {
      let preparedMessage = message

      if (Predicate.isTagged('GraphMessage')(message)) {
        const prepared = pointerResource.prepare(message.message)

        if (Option.isNone(prepared)) {
          return { model }
        }

        preparedMessage = wrapGraphMessage({ message: prepared.value })
      }

      const result = update(model, preparedMessage)
      pointerResource.reconcile({
        previous: model.graph,
        current: result.model.graph,
        message: Predicate.isTagged('GraphMessage')(preparedMessage)
          ? preparedMessage.message
          : undefined,
        nativeBarrier: result.nativeBarrier,
      })
      publication.enqueue(result.outMessage)

      return { model: result.model, commands: result.commands ?? [] }
    } catch (error) {
      publication.close()
      throw error
    }
  }

let rendererInstanceNumber = 0

export const createProgram = (
  container: HTMLElement | null,
  document: FlowDocument,
  viewport: Viewport,
  allowedTargets: readonly string[] = [],
  documentMode: 'controlled' | 'uncontrolled' = 'uncontrolled',
  viewportMode: 'controlled' | 'uncontrolled' = 'uncontrolled',
  rendererRegistry: Graph.FoldkitRendererRegistry = {},
  viewportLimits: typeof ViewportLimitsSchema.Type = defaultViewportLimits,
  selectionMode: typeof SelectionModeSchema.Type = 'full',
  interactionOptions: Graph.GraphInteractionOptions = Graph.defaultInteractionOptions
) => {
  rendererInstanceNumber += 1
  const instanceId = `flow-foldkit-runtime-${rendererInstanceNumber}`
  registerConnectionRule(instanceId, interactionOptions.isValidConnection)

  const initialGraph = Graph.initialModel(
    document,
    viewport,
    allowedTargets,
    documentMode,
    viewportMode,
    selectionMode,
    interactionOptions,
    instanceId
  )

  const pointerResource = Graph.createPointerResource(initialGraph)

  const publication = createProgramPublication(pointerResource)

  // The rule lives as long as the Runtime's program stream; disposing the
  // Runtime interrupts it and removes the rule.
  const programStream = Stream.unwrap(
    Effect.sync(() => {
      registerConnectionRule(instanceId, interactionOptions.isValidConnection)

      return publication.stream
    })
  ).pipe(Stream.ensuring(Effect.sync(() => registerConnectionRule(instanceId))))

  const graphView = Graph.makeView(
    rendererRegistry,
    instanceId,
    pointerResource,
    interactionOptions.ariaLabelConfig?.['node.a11yDescription.ariaLiveMessage']
  )

  return Runtime.makeElement({
    Model: ModelSchema,
    ports,
    container,
    init: () => ({
      model: {
        graph: initialGraph,
        changeKinds: [],
        viewportAnimation: null,
        viewportLimits,
        lifecycleReady: false,
        acceptedDocumentRevision: 0,
        pendingDeleteApprovals: [],
        cancelledDeleteOperations: [],
      },
    }),
    update: createProgramUpdate(pointerResource, publication),
    view: (model, h) => view(model, h, graphView),
    subscriptions: Subscription.aggregate(
      hostSubscriptions,
      Subscription.make<Model, AppMessageData>()((entry) => ({
        programIo: entry(
          { instanceId: Schema.String },
          {
            modelToDependencies: (model) => ({
              instanceId: model.graph.instanceId,
            }),
            dependenciesToStream: () => programStream,
          }
        ),
      })),
      Subscription.lift(Graph.subscriptions)({
        read: (model: Model) => Option.some(model.graph),
        toParentMessage: (message: typeof Graph.Message.Type) =>
          wrapGraphMessage({ message }),
      })
    ),
  })
}

export const readChangeKinds = (model: Model): readonly string[] =>
  model.changeKinds

export type { FlowChange } from '@flow/core'
