import {
  FlowChangeSchema,
  FlowCommandSchema,
  FlowDocumentSchema,
  FlowEdgeSchema,
  FlowEditErrorSchema,
  FlowEditResultSchema,
  FlowEditTransactionSchema,
  FlowNodeSchema,
  FlowSnapshotSchema,
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
} from '@flow/core'
import type { FlowDocument, Viewport } from '@flow/core'
import { Effect, Exit, Option, Schema } from 'effect'
import type { Html } from 'foldkit'
import {
  Command,
  Message as FoldMessage,
  Port,
  Runtime,
  Subscription,
  Update,
} from 'foldkit'

import * as Graph from './graph.ts'

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

export type SnapshotRequest = typeof SnapshotRequestSchema.Type

export const SnapshotResponseSchema = Schema.Struct({
  requestId: Schema.String,
  snapshot: FlowSnapshotSchema,
  node: Schema.optional(FlowNodeSchema),
  edge: Schema.optional(FlowEdgeSchema),
  internalNode: Schema.NullOr(FlowInternalNodeSchema),
  nodesInitialized: Schema.Boolean,
})

export type SnapshotResponse = typeof SnapshotResponseSchema.Type

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
  EditRequest: { request: EditRequestSchema },
  SnapshotPublished: {},
  ChangePublished: {},
  EditPublished: {},
  MeasurementPublished: {},
  ViewportRequest: { request: ViewportRequestSchema },
  ViewportPublished: {},
  ViewportFrame: { delta: Schema.Finite },
  ViewportEventPublished: {},
})

export type AppMessageData = typeof AppMessage.Type

export const ports = {
  inbound: {
    actions: Port.inbound(HostAction),
    snapshotRequests: Port.inbound(SnapshotRequestSchema),
    editRequests: Port.inbound(EditRequestSchema),
    viewportRequests: Port.inbound(ViewportRequestSchema),
  },
  outbound: {
    changes: Port.outbound(FlowChangeSchema),
    snapshots: Port.outbound(SnapshotResponseSchema),
    acceptedStates: Port.outbound(FlowStateChangeSchema),
    editResults: Port.outbound(EditResponseSchema),
    measurementResults: Port.outbound(MeasurementResultSchema),
    viewportResults: Port.outbound(ViewportResponseSchema),
    viewportEvents: Port.outbound(ViewportEventSchema),
  },
}

export interface ViewportPaneMetrics {
  readonly width: number
  readonly height: number
  readonly originX: number
  readonly originY: number
}

export interface ViewportClient {
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
})

export type Model = typeof ModelSchema.Type

const PublishChanges = Command.define('PublishFlowChanges', {
  args: {
    change: Schema.optional(FlowChangeSchema),
    acceptedState: Schema.optional(FlowStateChangeSchema),
  },
  messages: [AppMessage.ChangePublished],
  execute: ({ change, acceptedState }) =>
    Effect.gen(function* publishFlowChanges() {
      if (change !== undefined) {
        yield* Port.emit(ports.outbound.changes, change)
      }

      if (acceptedState !== undefined) {
        yield* Port.emit(ports.outbound.acceptedStates, acceptedState)
      }

      return AppMessage.ChangePublished()
    }),
})

const RespondSnapshot = Command.define('RespondFlowSnapshot', {
  args: { response: SnapshotResponseSchema },
  messages: [AppMessage.SnapshotPublished],
  execute: ({ response }) =>
    Port.emit(ports.outbound.snapshots, response).pipe(
      Effect.as(AppMessage.SnapshotPublished())
    ),
})

const RespondEdit = Command.define('RespondFlowEdit', {
  args: { response: EditResponseSchema },
  messages: [AppMessage.EditPublished],
  execute: ({ response }) =>
    Port.emit(ports.outbound.editResults, response).pipe(
      Effect.as(AppMessage.EditPublished())
    ),
})

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
    SemanticChange:
      ({ change, acceptedState }) =>
      (model: Model) => {
        const changeKinds: Model['changeKinds'] = [
          ...model.changeKinds,
          change.kind,
        ]

        return {
          model: { ...model, changeKinds },
          commands: [PublishChanges({ change, acceptedState })],
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
          PublishChanges({ change, acceptedState }),
          RespondEdit({ response: { requestId, result } }),
        ],
      }),
    EditFailed:
      ({ requestId, error }) =>
      (model: Model) => ({
        model,
        commands: [RespondEdit({ response: { requestId, error } })],
      }),
  }),
})

const hostSubscriptions = Subscription.make<Model, AppMessageData>()(() => ({
  actions: Port.subscription(ports.inbound.actions, (action) =>
    AppMessage.HostAction({ action })
  ),
  snapshotRequests: Port.subscription(
    ports.inbound.snapshotRequests,
    (request) => AppMessage.SnapshotRequest({ request })
  ),
  editRequests: Port.subscription(ports.inbound.editRequests, (request) =>
    AppMessage.EditRequest({ request })
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
        internalNode.measurementStatus === 'measured'
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
  previous: Viewport,
  replacement: Viewport
) => {
  if (
    replacement.x === previous.x &&
    replacement.y === previous.y &&
    replacement.zoom === previous.zoom
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

export const update = (
  model: Model,
  message: AppMessageData
): Update.Return<Model, AppMessageData> =>
  AppMessage.match(message, {
    GraphMessage: ({ message: graphMessage }) => graphFold(model, graphMessage),
    HostAction: ({ action }) => {
      const result = routeAction(model, action)

      return HostAction.match(action, {
        ReplaceDocument: () => result,
        ReplaceViewport: ({ viewport: replacement }) =>
          observeViewportReplacement(result, model.graph.viewport, replacement),
        SetAllowedTargets: () => result,
        DispatchCommand: () => result,
        MeasureNode: () => result,
      })
    },
    SnapshotRequest: ({ request }) => ({
      model,
      commands: [
        RespondSnapshot({
          response: {
            requestId: request.requestId,
            snapshot: Graph.selectSnapshot(model.graph),
            node:
              request.nodeId === undefined
                ? undefined
                : Graph.selectNode(model.graph, request.nodeId),
            edge:
              request.edgeId === undefined
                ? undefined
                : Graph.selectEdge(model.graph, request.edgeId),
            internalNode:
              request.nodeId === undefined
                ? null
                : (Graph.selectInternalNode(model.graph, request.nodeId) ??
                  null),
            nodesInitialized: Graph.selectNodesInitialized(model.graph, {
              includeHidden: request.includeHiddenNodes === true,
            }),
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
    SnapshotPublished: () => ({ model }),
    ChangePublished: () => ({ model }),
    EditPublished: () => ({ model }),
    MeasurementPublished: () => ({ model }),
    ViewportPublished: () => ({ model }),
    ViewportEventPublished: () => ({ model }),
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
        status === 'accepted' && viewportChanged
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

export const initialModel = (
  document: FlowDocument,
  viewport: Viewport,
  allowedTargets: readonly string[] = [],
  viewportLimits: typeof ViewportLimitsSchema.Type = defaultViewportLimits
): Model => ({
  graph: Graph.initialModel(document, viewport, allowedTargets),
  changeKinds: [],
  viewportAnimation: null,
  viewportLimits,
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
  viewportLimits: typeof ViewportLimitsSchema.Type = defaultViewportLimits
) => {
  rendererInstanceNumber += 1

  const graphView = Graph.makeView(
    rendererRegistry,
    `flow-foldkit-${rendererInstanceNumber}`
  )

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
          viewportMode
        ),
        changeKinds: [],
        viewportAnimation: null,
        viewportLimits,
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
