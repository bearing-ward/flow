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
} from '@flow/core'
import type { FlowDocument, Viewport } from '@flow/core'
import { Effect, Option, Schema } from 'effect'
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

export const HostAction = FoldMessage.defineMessageUnion({
  ReplaceDocument: { document: FlowDocumentSchema },
  ReplaceViewport: { viewport: ViewportSchema },
  SetAllowedTargets: { targets: Schema.Array(Schema.String) },
  DispatchCommand: { command: FlowCommandSchema },
})

export type HostActionData = typeof HostAction.Type

export const SnapshotRequestSchema = Schema.Struct({
  requestId: Schema.String,
  nodeId: Schema.optional(Schema.String),
  edgeId: Schema.optional(Schema.String),
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
})

export type SnapshotResponse = typeof SnapshotResponseSchema.Type

export const AppMessage = FoldMessage.defineMessageUnion({
  GraphMessage: { message: Graph.Message },
  HostAction: { action: HostAction },
  SnapshotRequest: { request: SnapshotRequestSchema },
  EditRequest: { request: EditRequestSchema },
  SnapshotPublished: {},
  ChangePublished: {},
  EditPublished: {},
})

export type AppMessageData = typeof AppMessage.Type

export const ports = {
  inbound: {
    actions: Port.inbound(HostAction),
    snapshotRequests: Port.inbound(SnapshotRequestSchema),
    editRequests: Port.inbound(EditRequestSchema),
  },
  outbound: {
    changes: Port.outbound(FlowChangeSchema),
    snapshots: Port.outbound(SnapshotResponseSchema),
    acceptedStates: Port.outbound(FlowStateChangeSchema),
    editResults: Port.outbound(EditResponseSchema),
  },
}

export const ModelSchema = Schema.Struct({
  graph: Graph.ModelSchema,
  changeKinds: Schema.Array(Schema.String),
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
  })

export const update = (
  model: Model,
  message: AppMessageData
): Update.Return<Model, AppMessageData> =>
  AppMessage.match(message, {
    GraphMessage: ({ message: graphMessage }) => graphFold(model, graphMessage),
    HostAction: ({ action }) => routeAction(model, action),
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
  })

export const initialModel = (
  document: FlowDocument,
  viewport: Viewport,
  allowedTargets: readonly string[] = []
): Model => ({
  graph: Graph.initialModel(document, viewport, allowedTargets),
  changeKinds: [],
})

export const view = (
  model: Model,
  h: Html.HtmlBuilder<AppMessageData>
): Html.Html =>
  h.div(
    [h.Class('flow-foldkit-root')],
    [
      h.submodel({
        slotId: 'flow-graph',
        model: model.graph,
        view: Graph.View,
        toParentMessage: (message) => AppMessage.GraphMessage({ message }),
      }),
    ]
  )

export const createProgram = (
  container: HTMLElement | null,
  document: FlowDocument,
  viewport: Viewport,
  allowedTargets: readonly string[] = [],
  documentMode: 'controlled' | 'uncontrolled' = 'uncontrolled',
  viewportMode: 'controlled' | 'uncontrolled' = 'uncontrolled'
) =>
  Runtime.makeElement({
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
      },
    }),
    update,
    view,
    subscriptions: Subscription.aggregate(
      hostSubscriptions,
      Subscription.lift(Graph.subscriptions)({
        toChildModel: (model: Model) => model.graph,
        toParentMessage: (message: typeof Graph.Message.Type) =>
          AppMessage.GraphMessage({ message }),
      })
    ),
  })

export const readChangeKinds = (model: Model): readonly string[] =>
  model.changeKinds

export type { FlowChange } from '@flow/core'
