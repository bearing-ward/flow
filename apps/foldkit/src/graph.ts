import {
  FlowChangeSchema,
  FlowControlModeSchema,
  FlowCommandSchema,
  FlowDocumentSchema,
  ViewportSchema,
  applyNodePositionChange,
  createFlowGraph,
  nextConnectionEdge,
  validateFlowConnection,
} from '@flow/core'
import type {
  FlowChange as CoreFlowChange,
  FlowCommand as CoreFlowCommand,
  FlowDocument,
  FlowNode,
  Viewport as CoreViewport,
} from '@flow/core'
import { Effect, Exit, Option, Schema, Stream } from 'effect'
import type { Update } from 'foldkit'
import { Message as FoldMessage, Submodel, Subscription } from 'foldkit'

const PointerSessionSchema = Schema.Struct({
  pointerId: Schema.Number,
  startX: Schema.Number,
  startY: Schema.Number,
  nodeId: Schema.NullOr(Schema.String),
  sourceHandleId: Schema.NullOr(Schema.String),
})

export const ModelSchema = Schema.Struct({
  document: FlowDocumentSchema,
  viewport: ViewportSchema,
  documentMode: FlowControlModeSchema,
  viewportMode: FlowControlModeSchema,
  allowedConnectionTargets: Schema.Array(Schema.String),
  pointerSession: Schema.NullOr(PointerSessionSchema),
})

export type Model = typeof ModelSchema.Type

export const OutMessage = FoldMessage.defineMessageUnion({
  SemanticChange: { change: FlowChangeSchema },
})

export type OutMessageData = typeof OutMessage.Type

export const Message = FoldMessage.defineMessageUnion({
  ReplaceDocument: { document: FlowDocumentSchema },
  ReplaceViewport: { viewport: ViewportSchema },
  SetAllowedTargets: { targets: Schema.Array(Schema.String) },
  DispatchCommand: { command: FlowCommandSchema },
  PointerDown: {
    pointerId: Schema.Number,
    clientX: Schema.Number,
    clientY: Schema.Number,
    nodeId: Schema.NullOr(Schema.String),
    handleId: Schema.NullOr(Schema.String),
  },
  PointerReleased: {
    pointerId: Schema.Number,
    clientX: Schema.Number,
    clientY: Schema.Number,
    targetNodeId: Schema.NullOr(Schema.String),
    targetHandleId: Schema.NullOr(Schema.String),
  },
  PointerCancelled: {},
  CancelGesture: {},
})

export type GraphMessageData = typeof Message.Type

const noChange = (
  model: Model
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => ({
  model,
})

const report = (
  model: Model,
  change: CoreFlowChange
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => ({
  model,
  outMessage: OutMessage.SemanticChange({ change }),
})

const setNodePosition = (
  model: Model,
  nodeId: string,
  position: { readonly x: number; readonly y: number }
) => {
  const node = model.document.nodes.find((candidate) => candidate.id === nodeId)

  if (node === undefined) {
    return noChange(model)
  }

  const change: CoreFlowChange = {
    kind: 'node-position',
    nodeId: node.id,
    position,
  }

  const document = applyNodePositionChange(model.document, change)

  return document === undefined
    ? noChange(model)
    : report(
        {
          ...model,
          document:
            model.documentMode === 'uncontrolled' ? document : model.document,
        },
        change
      )
}

const dispatchCommand = (model: Model, command: CoreFlowCommand) => {
  if (command.kind === 'set-viewport') {
    const change: CoreFlowChange = {
      kind: 'viewport',
      viewport: command.viewport,
    }

    return model.viewportMode === 'uncontrolled'
      ? report({ ...model, viewport: command.viewport }, change)
      : report(model, change)
  }

  if (command.kind === 'set-node-position') {
    return setNodePosition(model, command.nodeId, command.position)
  }

  const exhaustive: never = command

  return exhaustive
}

type PointerReleased = Extract<
  GraphMessageData,
  { readonly _tag: 'PointerReleased' }
>

const finishConnection = (
  model: Model,
  cleared: Model & { readonly pointerSession: null },
  session: NonNullable<Model['pointerSession']>,
  message: PointerReleased
) => {
  const source = model.document.nodes.find((node) => node.id === session.nodeId)

  const target =
    message.targetNodeId === null
      ? undefined
      : model.document.nodes.find((node) => node.id === message.targetNodeId)

  const sourceHandle = source?.handles?.find(
    (handle) => handle.id === session.sourceHandleId && handle.kind === 'source'
  )

  const targetHandle = target?.handles?.find(
    (handle) => handle.id === message.targetHandleId && handle.kind === 'target'
  )

  if (
    source === undefined ||
    target === undefined ||
    sourceHandle === undefined ||
    targetHandle === undefined ||
    !model.allowedConnectionTargets.includes(target.id)
  ) {
    return { model: cleared }
  }

  const connection = {
    source: source.id,
    sourceHandle: sourceHandle.id,
    target: target.id,
    targetHandle: targetHandle.id,
  }

  if (
    Exit.isFailure(
      Effect.runSyncExit(validateFlowConnection(model.document, connection))
    )
  ) {
    return { model: cleared }
  }

  const edge = nextConnectionEdge(model.document, connection)
  const change: CoreFlowChange = { kind: 'edge-add', edge }

  const document =
    model.documentMode === 'uncontrolled'
      ? { ...model.document, edges: [...model.document.edges, edge] }
      : model.document

  return report({ ...cleared, document }, change)
}

const finishNodeDrag = (
  model: Model,
  cleared: Model & { readonly pointerSession: null },
  session: NonNullable<Model['pointerSession']>,
  message: PointerReleased
) => {
  if (session.nodeId === null) {
    return { model: cleared }
  }

  const node = model.document.nodes.find(
    (candidate) => candidate.id === session.nodeId
  )

  if (node === undefined) {
    return { model: cleared }
  }

  const dx = (message.clientX - session.startX) / model.viewport.zoom
  const dy = (message.clientY - session.startY) / model.viewport.zoom

  if (Math.hypot(dx, dy) < 8) {
    return { model: cleared }
  }

  const graph = createFlowGraph(model.document)

  const absoluteOrigin =
    graph.nodes.get(node.id)?.absolutePosition ?? node.position

  const parent =
    node.parentId === undefined ? undefined : graph.nodes.get(node.parentId)

  return setNodePosition(cleared, node.id, {
    x: absoluteOrigin.x + dx - (parent?.absolutePosition.x ?? 0),
    y: absoluteOrigin.y + dy - (parent?.absolutePosition.y ?? 0),
  })
}

const finishPointer = (model: Model, message: PointerReleased) => {
  const session = model.pointerSession

  if (session === null || session.pointerId !== message.pointerId) {
    return noChange(model)
  }

  const cleared = { ...model, pointerSession: null }

  return session.sourceHandleId === null
    ? finishNodeDrag(model, cleared, session, message)
    : finishConnection(model, cleared, session, message)
}

export const update = (
  model: Model,
  message: GraphMessageData
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> =>
  Message.match(message, {
    ReplaceDocument: ({ document }) => ({
      model: { ...model, document, pointerSession: null },
    }),
    ReplaceViewport: ({ viewport }) => ({ model: { ...model, viewport } }),
    SetAllowedTargets: ({ targets }) => ({
      model: { ...model, allowedConnectionTargets: targets },
    }),
    DispatchCommand: ({ command }) => dispatchCommand(model, command),
    PointerDown: ({ pointerId, clientX, clientY, nodeId, handleId }) => {
      if (nodeId === null) {
        return noChange(model)
      }

      return {
        model: {
          ...model,
          pointerSession: {
            pointerId,
            startX: clientX,
            startY: clientY,
            nodeId,
            sourceHandleId: handleId,
          },
        },
      }
    },
    PointerReleased: (released) => finishPointer(model, released),
    PointerCancelled: () => ({ model: { ...model, pointerSession: null } }),
    CancelGesture: () => ({ model: { ...model, pointerSession: null } }),
  })

interface GraphTarget {
  readonly nodeId: string | null
  readonly handleId: string | null
}

const readTarget = (target: EventTarget | null): GraphTarget => {
  if (!(target instanceof Element)) {
    return { nodeId: null, handleId: null }
  }

  const node = target.closest<HTMLElement>('[data-node-id]')
  const handle = target.closest<HTMLElement>('[data-handle-id]')

  return {
    nodeId: node?.dataset.nodeId ?? null,
    handleId: handle?.dataset.handleId ?? null,
  }
}

const beginPointer = (
  pointerId: number,
  clientX: number,
  clientY: number,
  target: EventTarget | null
) => {
  const { nodeId, handleId } = readTarget(target)

  return nodeId === null
    ? Option.none()
    : Option.some(
        Message.PointerDown({ pointerId, clientX, clientY, nodeId, handleId })
      )
}

const graphView = Submodel.defineView<Model, GraphMessageData>((model, h) => {
  const graph = createFlowGraph(model.document)

  const visibleNode = (node: FlowNode): boolean => {
    const graphNode = graph.nodes.get(node.id)

    if (graphNode === undefined || graphNode.hidden) {
      return false
    }

    const position = graphNode.absolutePosition
    const left = position.x * model.viewport.zoom + model.viewport.x
    const top = position.y * model.viewport.zoom + model.viewport.y

    return (
      left < 960 &&
      top < 640 &&
      left + 150 * model.viewport.zoom > 0 &&
      top + 44 * model.viewport.zoom > 0
    )
  }

  const nodes = graph.orderedNodes
    .map(({ node }) => node)
    .filter(visibleNode)
    .map((node) => {
      const position =
        graph.nodes.get(node.id)?.absolutePosition ?? node.position

      const handles = (node.handles ?? []).map((handle) =>
        h.button([
          h.Class(`flow-foldkit-handle flow-foldkit-handle-${handle.side}`),
          h.DataAttribute('handle-id', handle.id),
          h.AriaLabel(`${handle.kind} handle ${handle.id}`),
        ])
      )

      return h.keyed('div')(
        node.id,
        [
          h.Class('flow-foldkit-node'),
          h.DataAttribute('testid', 'flow-node'),
          h.DataAttribute('node-id', node.id),
          h.Style({ left: `${position.x}px`, top: `${position.y}px` }),
        ],
        [node.label, ...handles]
      )
    })

  const edges = model.document.edges
    .filter(
      (edge) =>
        edge.hidden !== true &&
        graph.nodes.get(edge.source)?.hidden !== true &&
        graph.nodes.get(edge.target)?.hidden !== true
    )
    .map((edge) =>
      h.keyed('div')(
        edge.id,
        [
          h.Class('flow-foldkit-edge'),
          h.DataAttribute('edge-id', edge.id),
          h.DataAttribute('testid', 'flow-edge'),
        ],
        [edge.label ?? '']
      )
    )

  return h.div(
    [
      h.Class('flow-foldkit-canvas'),
      h.DataAttribute('testid', 'flow-canvas'),
      h.Tabindex(0),
      h.OnPointerDown(
        (
          _,
          button,
          _screenX,
          _screenY,
          _timeStamp,
          clientX,
          clientY,
          pointerId,
          target
        ) =>
          button === 0
            ? beginPointer(pointerId, clientX, clientY, target)
            : Option.none()
      ),
      h.OnKeyDownPreventDefault((key) =>
        key === 'Escape' ? Option.some(Message.CancelGesture()) : Option.none()
      ),
    ],
    [
      h.div(
        [
          h.Class('flow-foldkit-viewport'),
          h.Style({
            transform: `translate(${model.viewport.x}px, ${model.viewport.y}px) scale(${model.viewport.zoom})`,
          }),
        ],
        [...edges, ...nodes]
      ),
      h.div([h.Class('flow-foldkit-change-kinds'), h.AriaLive('polite')], []),
    ]
  )
})

const PointerEvents = Subscription.make<Model, GraphMessageData>()((entry) => ({
  pointerEvents: entry(
    { active: Schema.Boolean },
    {
      modelToDependencies: (model) => ({
        active: model.pointerSession !== null,
      }),
      dependenciesToStream: ({ active }) =>
        active
          ? Stream.merge(
              Subscription.fromEventFilterMap({
                target: document,
                type: 'pointerup',
                filterMapEvent: (event: PointerEvent) => {
                  const { nodeId, handleId } = readTarget(event.target)

                  return Option.some(
                    Message.PointerReleased({
                      pointerId: event.pointerId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                      targetNodeId: nodeId,
                      targetHandleId: handleId,
                    })
                  )
                },
              }),
              Subscription.fromEvent({
                target: document,
                type: 'pointercancel',
                mapEvent: () => Message.PointerCancelled(),
              })
            )
          : Stream.empty,
    }
  ),
}))

export const initialModel = (
  document: FlowDocument,
  viewport: CoreViewport,
  allowedTargets: readonly string[] = [],
  documentMode: 'controlled' | 'uncontrolled' = 'uncontrolled',
  viewportMode: 'controlled' | 'uncontrolled' = 'uncontrolled'
): Model => ({
  document,
  viewport,
  documentMode,
  viewportMode,
  allowedConnectionTargets: allowedTargets,
  pointerSession: null,
})

export const View = graphView

export const subscriptions = PointerEvents

export type { FlowChange, FlowCommand, Viewport } from '@flow/core'
