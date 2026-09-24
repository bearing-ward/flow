import {
  FlowChangeSchema,
  FlowCommandSchema,
  FlowDocumentSchema,
  ViewportSchema,
  type FlowChange,
  type FlowDocument,
  type Viewport,
} from "@flow/core";
import { Effect, Option, Schema } from "effect";
import { Command, Html, Message as FoldMessage, Port, Runtime, Subscription, Update } from "foldkit";
import * as Graph from "./graph.ts";

export const HostAction = FoldMessage.defineMessageUnion({
  ReplaceDocument: { document: FlowDocumentSchema },
  ReplaceViewport: { viewport: ViewportSchema },
  SetAllowedTargets: { targets: Schema.Array(Schema.String) },
  DispatchCommand: { command: FlowCommandSchema },
});
export type HostAction = typeof HostAction.Type;

export const AppMessage = FoldMessage.defineMessageUnion({
  GraphMessage: { message: Graph.Message },
  HostAction: { action: HostAction },
  ChangePublished: {},
});
export type AppMessage = typeof AppMessage.Type;

export const ports = {
  inbound: { actions: Port.inbound(HostAction) },
  outbound: { changes: Port.outbound(FlowChangeSchema) },
};

export const ModelSchema = Schema.Struct({
  graph: Graph.ModelSchema,
  changeKinds: Schema.Array(Schema.String),
});
export type Model = typeof ModelSchema.Type;

const PublishChange = Command.define("PublishFlowChange", {
  args: { change: FlowChangeSchema },
  messages: [AppMessage.ChangePublished],
  execute: ({ change }) => Port.emit(ports.outbound.changes, change).pipe(Effect.as(AppMessage.ChangePublished())),
});

const graphFold = Update.foldChild({
  update: Graph.update,
  read: (model: Model) => Option.some(model.graph),
  write: (model, graph) => ({ ...model, graph }),
  toParentMessage: (message) => AppMessage.GraphMessage({ message }),
  foldOutMessage: Graph.OutMessage.match({
    SemanticChange: ({ change }) => (model: Model) => ({
      model: { ...model, changeKinds: [...model.changeKinds, change.kind] },
      commands: [PublishChange({ change })],
    }),
  }),
});

const hostSubscriptions = Subscription.make<Model, AppMessage>()(() => ({
  actions: Port.subscription(ports.inbound.actions, (action) => AppMessage.HostAction({ action })),
}));

const routeAction = (model: Model, action: HostAction) => HostAction.match(action, {
  ReplaceDocument: ({ document }) => graphFold(model, Graph.Message.ReplaceDocument({ document })),
  ReplaceViewport: ({ viewport }) => graphFold(model, Graph.Message.ReplaceViewport({ viewport })),
  SetAllowedTargets: ({ targets }) => graphFold(model, Graph.Message.SetAllowedTargets({ targets })),
  DispatchCommand: ({ command }) => graphFold(model, Graph.Message.DispatchCommand({ command })),
});

export const update = (model: Model, message: AppMessage): Update.Return<Model, AppMessage> => AppMessage.match(message, {
  GraphMessage: ({ message: graphMessage }) => graphFold(model, graphMessage),
  HostAction: ({ action }) => routeAction(model, action),
  ChangePublished: () => ({ model }),
});

export const initialModel = (
  document: FlowDocument,
  viewport: Viewport,
  allowedTargets: readonly string[] = [],
): Model => ({
  graph: Graph.initialModel(document, viewport, allowedTargets),
  changeKinds: [],
});

export const view = (model: Model, h: Html.HtmlBuilder<AppMessage>): Html.Html => h.div([
  h.Class("flow-foldkit-root"),
], [h.submodel({
  slotId: "flow-graph",
  model: model.graph,
  view: Graph.View,
  toParentMessage: (message) => AppMessage.GraphMessage({ message }),
})]);

export const createProgram = (
  container: HTMLElement | null,
  document: FlowDocument,
  viewport: Viewport,
  allowedTargets: readonly string[] = [],
  documentMode: "controlled" | "uncontrolled" = "uncontrolled",
  viewportMode: "controlled" | "uncontrolled" = "uncontrolled",
) => Runtime.makeElement({
  Model: ModelSchema,
  ports,
  container,
  init: () => ({ model: {
    graph: Graph.initialModel(document, viewport, allowedTargets, documentMode, viewportMode),
    changeKinds: [],
  } }),
  update,
  view,
  subscriptions: Subscription.aggregate(
    hostSubscriptions,
    Subscription.lift(Graph.subscriptions)({
      toChildModel: (model: Model) => model.graph,
      toParentMessage: (message: Graph.Message) => AppMessage.GraphMessage({ message }),
    }),
  ),
});

export const readChangeKinds = (model: Model): readonly string[] => model.changeKinds;
export type { FlowChange };
