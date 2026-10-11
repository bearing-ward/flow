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
  graphBounds,
  NodeIdSchema,
  FlowAttribute,
  FlowSpan,
} from '@flow/core'
import type { FlowDocument, Viewport, SelectionModeSchema } from '@flow/core'
import {
  Cause,
  Duration,
  Effect,
  Exit,
  Option,
  Predicate,
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

import {
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
  ReplaceDocument: { document: FlowDocumentSchema },
  ReplaceViewport: { viewport: ViewportSchema },
  SetAllowedTargets: { targets: Schema.Array(Schema.String) },
  DispatchCommand: { command: FlowCommandSchema },
  MeasureNode: {
    requestId: Schema.String,
    measurement: NodeMeasurementInputSchema,
  },
})

export type HostActionData = typeof HostAction.Type

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
    deleteApprovalRequests: Port.outbound(DeleteApprovalRequestedSchema),
    deleteResults: Port.outbound(DeleteResultSchema),
    deleteCancellationAcks: Port.outbound(DeleteCancellationAckSchema),
    measurementResults: Port.outbound(MeasurementResultSchema),
    viewportResults: Port.outbound(ViewportResponseSchema),
    viewportEvents: Port.outbound(ViewportEventSchema),
    interactionEvents: Port.outbound(InteractionEventsSchema),
  },
}

export interface ViewportPaneMetrics {
  readonly width: number
  readonly height: number
  readonly originX: number
  readonly originY: number
}

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
  readonly fitView: (
    nodes?: 'all' | 'selected' | readonly string[],
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
    fitView: (nodes, padding, animation) =>
      request({
        kind: 'fitView',
        nodes:
          nodes === undefined || nodes === 'all' || nodes === 'selected'
            ? nodes
            : nodes.map((id) => NodeIdSchema.make(id)),
        padding,
        animation,
      }),
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

const PublishChanges = Command.define('PublishFlowChanges', {
  args: {
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
    controlMode: Schema.optional(
      Schema.Literals(['controlled', 'uncontrolled'])
    ),
  },
  messages: [AppMessage.ChangePublished],
  execute: ({ change, acceptedState, cancellation, lifecycle, controlMode }) =>
    Effect.gen(function* publishFlowChanges() {
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

      if (acceptedState !== undefined) {
        yield* Port.emit(ports.outbound.acceptedStates, acceptedState)
      }

      return AppMessage.ChangePublished()
    }),
})

const selectSnapshotProjection = (
  graph: Graph.Model,
  request: typeof SnapshotRequestSchema.Type
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
  args: {
    response: EditResponseSchema,
    interactionError: Schema.optional(Graph.InteractionEventSchema),
  },
  messages: [AppMessage.EditPublished],
  execute: ({ response, interactionError }) => {
    const emitResponse = Port.emit(ports.outbound.editResults, response).pipe(
      Effect.as(AppMessage.EditPublished())
    )

    const reportError =
      interactionError === undefined
        ? Effect.void
        : Port.emit(ports.outbound.interactionEvents, [interactionError])

    if (!('error' in response)) {
      return emitResponse.pipe(
        Effect.andThen(reportError),
        Effect.as(AppMessage.EditPublished())
      )
    }

    return Effect.logError('Foldkit edit failed').pipe(
      Effect.annotateLogs({
        [FlowAttribute.failureName]: response.error._tag,
      }),
      Effect.withSpan(FlowSpan.editFailure, {
        attributes: { [FlowAttribute.failureName]: response.error._tag },
      }),
      Effect.andThen(emitResponse),
      Effect.andThen(reportError),
      Effect.as(AppMessage.EditPublished())
    )
  },
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

const PublishInteractionEvents = Command.define(
  'PublishFoldkitInteractionEvents',
  {
    args: { events: InteractionEventsSchema },
    messages: [AppMessage.InteractionEventsPublished],
    execute: ({ events }) =>
      Port.emit(ports.outbound.interactionEvents, events).pipe(
        Effect.as(AppMessage.InteractionEventsPublished())
      ),
  }
)

const graphFold = Update.foldChild<
  Model,
  AppMessageData,
  Graph.Model,
  Graph.GraphMessageData,
  Graph.GraphMessageData,
  Graph.OutMessageData
>({
  update: Graph.update,
  read: (model: Model) => Option.some(model.graph),
  write: (model, graph) => ({ ...model, graph }),
  toParentMessage: (message) => AppMessage.GraphMessage({ message }),
  foldOutMessage: Graph.OutMessage.match({
    GestureCancelled:
      ({ kind, reason }) =>
      (model: Model) => ({
        model,
        commands: [PublishChanges({ cancellation: { kind, reason } })],
      }),
    SemanticChange:
      ({ change, acceptedState }) =>
      (model: Model) => {
        const changeKinds: Model['changeKinds'] = [
          ...model.changeKinds,
          change.kind,
        ]

        return {
          model: { ...model, changeKinds },
          commands: [
            PublishChanges({
              change,
              acceptedState,
              controlMode: model.graph.documentMode,
            }),
          ],
        }
      },
    AcceptedState:
      ({ change }) =>
      (model: Model) => ({
        model,
        commands: [PublishChanges({ acceptedState: change })],
      }),
    EditCompleted:
      ({ requestId, result, change, acceptedState }) =>
      (model: Model) => ({
        model,
        commands: [
          PublishChanges({
            change,
            acceptedState,
            controlMode: model.graph.documentMode,
          }),
          RespondEdit({ response: { requestId, result } }),
        ],
      }),
    EditFailed:
      ({ requestId, error }) =>
      (model: Model) => ({
        model,
        commands: [
          RespondEdit({
            response: { requestId, error },
            interactionError: {
              name: 'onError',
              phase: 'event',
              inputKind: 'api',
              reason: error._tag,
            },
          }),
        ],
      }),
  }),
})

const hostSubscriptions = Subscription.make<Model, AppMessageData>()(() => ({
  actions: Port.subscription(ports.inbound.actions, (action) =>
    AppMessage.HostAction({ action })
  ),
  versionedSnapshotRequests: Port.subscription(
    ports.inbound.versionedSnapshotRequests,
    (request) => AppMessage.VersionedSnapshotRequest({ request })
  ),
  snapshotRequests: Port.subscription(
    ports.inbound.snapshotRequests,
    (request) => AppMessage.SnapshotRequest({ request })
  ),
  editRequests: Port.subscription(ports.inbound.editRequests, (request) =>
    AppMessage.EditRequest({ request })
  ),
  deleteRequests: Port.subscription(ports.inbound.deleteRequests, (request) =>
    AppMessage.DeleteRequest({ request })
  ),
  deleteCancellations: Port.subscription(
    ports.inbound.deleteCancellations,
    (cancellation) => AppMessage.DeleteCancellation({ cancellation })
  ),
  deleteApprovalResponses: Port.subscription(
    ports.inbound.deleteApprovalResponses,
    (response) => AppMessage.DeleteApprovalResponse({ response })
  ),
  viewportRequests: Port.subscription(
    ports.inbound.viewportRequests,
    (request) => AppMessage.ViewportRequest({ request })
  ),
  viewportFrames: Subscription.animationFrame<Model, AppMessageData>({
    isActive: (model) => model.viewportAnimation !== null,
    toMessage: (delta) => AppMessage.ViewportFrame({ delta }),
  }),
}))

const routeAction = (model: Model, action: HostActionData) =>
  HostAction.match(action, {
    ReplaceDocument: ({ document }) =>
      graphFold(model, Graph.Message.ReplaceDocument({ document })),
    ReplaceViewport: ({ viewport }) =>
      graphFold(model, Graph.Message.ReplaceViewport({ viewport })),
    SetAllowedTargets: ({ targets }) =>
      graphFold(model, Graph.Message.SetAllowedTargets({ targets })),
    DispatchCommand: ({ command }) =>
      graphFold(model, Graph.Message.DispatchCommand({ command })),
    MeasureNode: ({ requestId, measurement }) => {
      const result = graphFold(
        model,
        Graph.Message.MeasureNode({ measurement })
      )

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
  result: Update.Return<Model, AppMessageData>,
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
    nodeIds
  )

  return bounds === undefined
    ? undefined
    : calculateViewportForBounds({
        bounds,
        width: request.width,
        height: request.height,
        limits: model.viewportLimits,
        padding: request.padding,
      })
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

  const { proposed, point } = candidate

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

  if (pointer !== null) {
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
          kind: gesture.kind,
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
): Pick<Graph.InteractionEvent, 'nodeId' | 'edgeId'> => {
  if (active.entityId === undefined) {
    return {}
  }

  return active.kind === 'reconnection'
    ? { edgeId: active.entityId }
    : { nodeId: active.entityId }
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
    Predicate.isTagged('GestureReleased')(message)
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

// oxlint-disable-next-line complexity
const foldkitLifecycleEvents = (
  previous: Graph.Model,
  current: Graph.Model,
  message: Graph.GraphMessageData,
  result: Update.Return<Model, AppMessageData>
): Graph.InteractionEvent[] => {
  const events: Graph.InteractionEvent[] = []
  const before = activeGestureTelemetry(previous)
  const after = activeGestureTelemetry(current)
  const explicitPhase = lifecycleMessagePhase(message)

  const phase =
    explicitPhase ??
    (before !== undefined && after === undefined ? 'cancel' : undefined)

  const semanticChange = result.commands?.find(
    (command) =>
      command.name === 'PublishFlowChanges' &&
      command.args?.change !== undefined &&
      command.args.change !== null
  )

  if (before === undefined && after !== undefined) {
    events.push({
      name: interactionEventName(after.kind, 'start'),
      phase: 'start',
      inputKind: after.inputKind,
      ...interactionEntity(after),
    })
  }

  if (after !== undefined && phase === 'progress') {
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
      semanticChange?.args?.controlMode === 'controlled' && !snapshotChanged

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

    let terminalEvent: Graph.InteractionEvent = terminal

    if (phase === 'cancel') {
      terminalEvent = { ...terminal, reason: 'cancelled' }
    }

    const proposalChange = Schema.decodeUnknownOption(FlowChangeSchema)(
      semanticChange?.args?.change
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

const lifecycleStartCandidateTags = new Set([
  'PointerDown',
  'GestureDown',
  'ResizeByKeyboard',
  'KeyboardSelectionKey',
  'ActivateHandle',
  'ActivateReconnect',
])

export const update = (
  model: Model,
  message: AppMessageData
): Update.Return<Model, AppMessageData> => {
  const updateResult = AppMessage.match(message, {
    GraphMessage: ({ message: graphMessage }) => {
      const isLifecycleStartCandidate = lifecycleStartCandidateTags.has(
        graphMessage._tag
      )

      const result = graphFold(model, graphMessage)

      const readyModel = model.lifecycleReady
        ? result.model
        : { ...result.model, lifecycleReady: true }

      const lifecycleEvents = foldkitLifecycleEvents(
        model.graph,
        result.model.graph,
        graphMessage,
        result
      )

      if (
        'name' in graphMessage &&
        'nodeId' in graphMessage &&
        'edgeId' in graphMessage
      ) {
        lifecycleEvents.push({
          name: graphMessage.name,
          phase: 'event',
          inputKind: 'pointer',
          nodeId: graphMessage.nodeId,
          edgeId: graphMessage.edgeId,
        })
      } else if (Predicate.isTagged('SelectEdge')(graphMessage)) {
        lifecycleEvents.push({
          name: 'onEdgeClick',
          phase: 'event',
          inputKind: 'pointer',
          edgeId: graphMessage.edgeId,
        })
      }

      const events: Graph.InteractionEvent[] = [...lifecycleEvents]

      if (model.lifecycleReady === false) {
        events.unshift({
          name: 'onInit',
          phase: 'event',
          inputKind: 'runtime',
        })
      }

      const withLifecycle = {
        ...result,
        model: readyModel,
        commands: [
          ...(result.commands ?? []),
          ...(events.length === 0
            ? []
            : [PublishInteractionEvents({ events })]),
        ],
      }

      const viewportEvents = viewportPanEvents(
        model.graph,
        readyModel.graph,
        graphMessage
      )

      const withViewportEvents = {
        ...withLifecycle,
        commands: [
          ...(withLifecycle.commands ?? []),
          ...viewportEvents.map((event) => PublishViewportEvent({ event })),
        ],
      }

      if (!isLifecycleStartCandidate) {
        return withViewportEvents
      }

      const previous = activeGestureTelemetry(model.graph)
      const current = activeGestureTelemetry(readyModel.graph)

      const started =
        current !== undefined &&
        (previous === undefined ||
          previous.kind !== current.kind ||
          previous.entityId !== current.entityId)

      if (!started || current === undefined) {
        return withLifecycle
      }

      const lifecycle = {
        ...current,
        controlMode: model.graph.documentMode,
      }

      return {
        ...withViewportEvents,
        commands: [
          ...(withViewportEvents.commands ?? []),
          PublishChanges({ lifecycle }),
        ],
      }
    },
    HostAction: ({ action }) => {
      if (Predicate.isTagged('ReplaceDocument')(action)) {
        const result = routeAction(model, action)

        const lifecycleEvents = foldkitLifecycleEvents(
          model.graph,
          result.model.graph,
          Graph.Message.ReplaceDocument({ document: action.document }),
          result
        )

        return {
          ...result,
          commands: [
            ...(result.commands ?? []),
            ...(lifecycleEvents.length === 0
              ? []
              : [PublishInteractionEvents({ events: lifecycleEvents })]),
          ],
        }
      }

      const result = routeAction(model, action)

      return HostAction.match(action, {
        ReplaceDocument: () => result,
        ReplaceViewport: ({ viewport: replacement }) =>
          observeViewportReplacement(
            result,
            model.graph.viewportMode,
            model.graph.viewport,
            replacement
          ),
        SetAllowedTargets: () => result,
        DispatchCommand: () => result,
        MeasureNode: () => result,
      })
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
        commands: [
          PublishViewportEvent({
            event: { kind: 'change', source: 'programmatic', viewport },
          }),
          PublishViewportEvent({
            event: { kind: 'end', source: 'programmatic', viewport },
          }),
          PublishChanges({ change, acceptedState }),
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

  return acceptedDocumentChanged
    ? {
        ...updateResult,
        model: {
          ...updateResult.model,
          acceptedDocumentRevision: model.acceptedDocumentRevision + 1,
        },
      }
    : updateResult
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
  graphView: typeof Graph.View = Graph.View
): Html.Html =>
  h.div(
    [h.Class('flow-foldkit-root')],
    [
      h.submodel({
        slotId: 'flow-graph',
        model: model.graph,
        view: graphView,
        toParentMessage: (message) => AppMessage.GraphMessage({ message }),
      }),
    ]
  )

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

  const graphView = Graph.makeView(rendererRegistry, instanceId)

  return Runtime.makeElement({
    Model: ModelSchema,
    ports,
    container,
    init: () => ({
      model: {
        graph: Graph.initialModel(
          document,
          viewport,
          allowedTargets,
          documentMode,
          viewportMode,
          selectionMode,
          interactionOptions,
          instanceId
        ),
        changeKinds: [],
        viewportAnimation: null,
        viewportLimits,
        lifecycleReady: false,
        acceptedDocumentRevision: 0,
        pendingDeleteApprovals: [],
        cancelledDeleteOperations: [],
      },
    }),
    update,
    view: (model, h) => view(model, h, graphView),
    subscriptions: Subscription.aggregate(
      hostSubscriptions,
      Subscription.lift(Graph.subscriptions)({
        toChildModel: (model: Model) => model.graph,
        toParentMessage: (message: typeof Graph.Message.Type) =>
          AppMessage.GraphMessage({ message }),
      })
    ),
  })
}

export const readChangeKinds = (model: Model): readonly string[] =>
  model.changeKinds

export type { FlowChange } from '@flow/core'
