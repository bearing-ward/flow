import {
  FlowChangeSchema,
  FlowControlModeSchema,
  FlowCommandSchema,
  FlowDocumentSchema,
  FlowEditErrorSchema,
  FlowEditResultSchema,
  FlowEditTransactionSchema,
  FlowSnapshotSchema,
  FlowStateChangeSchema,
  ViewportSchema,
  FlowMeasurementStateSchema,
  NodeIdSchema,
  HandleIdSchema,
  EdgeIdSchema,
  NodeMeasurementInputSchema,
  emptyFlowMeasurementState,
  applyNodeMeasurement,
  pruneFlowMeasurements,
  getFlowInternalNode,
  areFlowNodesInitialized,
  edgeAttachmentPosition,
  edgeLabelPosition,
  resolveEdgeHandles,
  straightEdgePath,
  bezierEdgePath,
  simpleBezierEdgePath,
  stepEdgePath,
  smoothStepEdgePath,
  applyEdgeSelectionChange,
  orderFlowEdges,
  applyNodePositionChange,
  createFlowGraph,
  nextConnectionEdge,
  prepareFlowEdit,
  validateFlowConnection,
} from '@flow/core'
import type {
  FlowChange as CoreFlowChange,
  FlowCommand as CoreFlowCommand,
  FlowDocument,
  FlowEditError,
  FlowEditResult,
  FlowSnapshot,
  FlowStateChange,
  FlowStateChangeCause,
  FlowEdge,
  FlowNode,
  Viewport as CoreViewport,
  FlowGraphNode,
  FlowInternalNode,
  FlowEdgePath,
  NodeId,
  FlowHandle,
} from '@flow/core'
import { Cause, Effect, Exit, Option, Schema, Stream } from 'effect'
import { Message as FoldMessage, Submodel, Subscription } from 'foldkit'
import type { Html as FoldHtml, Update } from 'foldkit'

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
  measurements: FlowMeasurementStateSchema,
  pointerSession: Schema.NullOr(PointerSessionSchema),
})

export type Model = typeof ModelSchema.Type

export const OutMessage = FoldMessage.defineMessageUnion({
  SemanticChange: {
    change: FlowChangeSchema,
    acceptedState: Schema.optional(FlowStateChangeSchema),
  },
  AcceptedState: { change: FlowStateChangeSchema },
  EditCompleted: {
    requestId: Schema.String,
    result: FlowEditResultSchema,
    change: FlowChangeSchema,
    acceptedState: Schema.optional(FlowStateChangeSchema),
  },
  EditFailed: { requestId: Schema.String, error: FlowEditErrorSchema },
})

export type OutMessageData = typeof OutMessage.Type

export const Message = FoldMessage.defineMessageUnion({
  ReplaceDocument: { document: FlowDocumentSchema },
  ReplaceViewport: { viewport: ViewportSchema },
  SetAllowedTargets: { targets: Schema.Array(Schema.String) },
  DispatchCommand: { command: FlowCommandSchema },
  EditRequest: {
    requestId: Schema.String,
    transaction: FlowEditTransactionSchema,
  },
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
  MeasureNode: { measurement: NodeMeasurementInputSchema },
  PruneMeasurements: {},
  SelectEdge: { edgeId: EdgeIdSchema },
})

export type GraphMessageData = typeof Message.Type

const noChange = (
  model: Model
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => ({
  model,
})

export const selectSnapshot = (model: Model): FlowSnapshot => ({
  document: model.document,
  viewport: model.viewport,
})

export const selectNodes = (model: Model): readonly FlowNode[] =>
  model.document.nodes

export const selectEdges = (model: Model): readonly FlowEdge[] =>
  model.document.edges

export const selectNode = (model: Model, id: string): FlowNode | undefined =>
  model.document.nodes.find((node) => node.id === id)

export const selectEdge = (model: Model, id: string): FlowEdge | undefined =>
  model.document.edges.find((edge) => edge.id === id)

export const selectViewport = (model: Model): CoreViewport => model.viewport

export const selectInternalNode = (
  model: Model,
  id: string
): FlowInternalNode | undefined =>
  getFlowInternalNode(model.document, model.measurements, NodeIdSchema.make(id))

const selectMountedNodeIds = (model: Model): ReadonlySet<NodeId> => {
  const graph = createFlowGraph(model.document)
  const { zoom } = model.viewport

  return new Set(
    graph.orderedNodes.flatMap(({ node }) => {
      const graphNode = graph.nodes.get(node.id)

      if (graphNode === undefined || graphNode.hidden) {
        return []
      }

      const { x, y } = graphNode.absolutePosition
      const left = x * zoom + model.viewport.x
      const top = y * zoom + model.viewport.y

      const measured = model.measurements.nodes.find(
        ({ measurement }) => measurement.nodeId === node.id
      )?.measurement

      const width = measured?.width ?? node.size?.width ?? 150
      const height = measured?.height ?? node.size?.height ?? 44

      return left < 960 &&
        top < 640 &&
        left + width * zoom > 0 &&
        top + height * zoom > 0
        ? [node.id]
        : []
    })
  )
}

export const selectNodesInitialized = (
  model: Model,
  options: { readonly includeHidden?: boolean } = {}
): boolean =>
  areFlowNodesInitialized(model.document, model.measurements, {
    ...options,
    mountedNodeIds: selectMountedNodeIds(model),
  })

const snapshotEquivalence = Schema.toEquivalence(FlowSnapshotSchema)

const stateChange = (
  previous: Model,
  current: Model,
  cause: FlowStateChangeCause
): FlowStateChange | undefined => {
  const previousSnapshot = selectSnapshot(previous)
  const currentSnapshot = selectSnapshot(current)

  return snapshotEquivalence(previousSnapshot, currentSnapshot)
    ? undefined
    : { previous: previousSnapshot, current: currentSnapshot, cause }
}

const report = (
  previous: Model,
  model: Model,
  change: CoreFlowChange
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => ({
  model,
  outMessage: OutMessage.SemanticChange({
    change,
    acceptedState: stateChange(previous, model, 'semantic-change') ?? undefined,
  }),
})

const acceptReplacement = (
  previous: Model,
  current: Model,
  cause: 'document-update' | 'viewport-update'
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => {
  const change = stateChange(previous, current, cause)

  return change === undefined
    ? { model: current }
    : { model: current, outMessage: OutMessage.AcceptedState({ change }) }
}

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
        model,
        {
          ...model,
          document:
            model.documentMode === 'uncontrolled' ? document : model.document,
        },
        change
      )
}

const dispatchCommand = (model: Model, command: CoreFlowCommand) => {
  if (command.kind === 'edit-transaction') {
    const prepared = Effect.runSync(
      prepareFlowEdit(model.document, command.transaction)
    )

    const change: CoreFlowChange = {
      kind: 'edit-proposal',
      document: prepared.document,
      deletion: prepared.deletion,
    }

    return report(
      model,
      {
        ...model,
        document:
          model.documentMode === 'uncontrolled'
            ? change.document
            : model.document,
      },
      change
    )
  }

  if (command.kind === 'set-viewport') {
    const change: CoreFlowChange = {
      kind: 'viewport',
      viewport: command.viewport,
    }

    const next =
      model.viewportMode === 'uncontrolled'
        ? { ...model, viewport: command.viewport }
        : model

    return report(model, next, change)
  }

  if (command.kind === 'set-node-position') {
    return setNodePosition(model, command.nodeId, command.position)
  }

  const exhaustive: never = command

  return exhaustive
}

const requestEdit = (
  model: Model,
  requestId: string,
  transaction: typeof FlowEditTransactionSchema.Type
): Update.ReturnWithOutMessage<Model, GraphMessageData, OutMessageData> => {
  const exit = Effect.runSyncExit(prepareFlowEdit(model.document, transaction))

  return Exit.match(exit, {
    onFailure: (cause) => {
      const failure = Cause.findErrorOption(cause)

      if (Option.isNone(failure)) {
        throw new Error('FlowEditFailedWithoutTypedError')
      }

      const error: FlowEditError = Schema.decodeUnknownSync(
        FlowEditErrorSchema
      )(failure.value)

      return {
        model,
        outMessage: OutMessage.EditFailed({ requestId, error }),
      }
    },
    onSuccess: (result: FlowEditResult) => {
      const change: CoreFlowChange = {
        kind: 'edit-proposal',
        document: result.document,
        deletion: result.deletion,
      }

      const next = {
        ...model,
        document:
          model.documentMode === 'uncontrolled'
            ? result.document
            : model.document,
      }

      return {
        model: next,
        outMessage: OutMessage.EditCompleted({
          requestId,
          result,
          change,
          acceptedState:
            stateChange(model, next, 'semantic-change') ?? undefined,
        }),
      }
    },
  })
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

  return report(model, { ...cleared, document }, change)
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
    ReplaceDocument: ({ document }) =>
      acceptReplacement(
        model,
        {
          ...model,
          document,
          measurements: pruneFlowMeasurements(document, model.measurements),
          pointerSession: null,
        },
        'document-update'
      ),
    ReplaceViewport: ({ viewport }) =>
      acceptReplacement(model, { ...model, viewport }, 'viewport-update'),
    SetAllowedTargets: ({ targets }) => ({
      model: { ...model, allowedConnectionTargets: targets },
    }),
    DispatchCommand: ({ command }) => dispatchCommand(model, command),
    EditRequest: ({ requestId, transaction }) =>
      requestEdit(model, requestId, transaction),
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
    MeasureNode: ({ measurement }) => ({
      model: {
        ...model,
        measurements: applyNodeMeasurement(
          model.document,
          model.measurements,
          measurement
        ),
      },
    }),
    PruneMeasurements: () => ({
      model: {
        ...model,
        measurements: pruneFlowMeasurements(model.document, model.measurements),
      },
    }),
    SelectEdge: ({ edgeId }) => {
      const change = { kind: 'edge-selection' as const, edgeId, selected: true }
      const document = applyEdgeSelectionChange(model.document, change)

      return document === undefined
        ? noChange(model)
        : report(model, { ...model, document }, change)
    },
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

export interface FoldkitEdgeGeometry {
  readonly path: string
  readonly labelPosition: { readonly x: number; readonly y: number }
  readonly markerStartId: string | undefined
  readonly markerEndId: string | undefined
}

export interface FoldkitRendererRegistry {
  readonly nodeTypes?: Readonly<Record<string, FoldkitNodeRenderer | undefined>>
  readonly edgeTypes?: Readonly<Record<string, FoldkitEdgeRenderer | undefined>>
}

export type FoldkitNodeRenderer = (
  node: FlowNode,
  h: FoldHtml.HtmlBuilder<GraphMessageData>
) => FoldHtml.Html

export type FoldkitEdgeRenderer = (
  edge: FlowEdge,
  geometry: FoldkitEdgeGeometry,
  h: FoldHtml.HtmlBuilder<GraphMessageData>
) => FoldHtml.Html

const defaultHandleSide = (kind: FlowHandle['kind']): FlowHandle['side'] =>
  kind === 'source' ? 'right' : 'left'

const handleOffset = (
  side: FlowHandle['side'],
  size: { readonly width: number; readonly height: number }
) => {
  let x = size.width / 2
  let y = size.height / 2

  switch (side) {
    case 'left': {
      x = 0
      break
    }

    case 'right': {
      x = size.width
      break
    }

    case 'top': {
      y = 0
      break
    }

    case 'bottom': {
      y = size.height
      break
    }

    default: {
      break
    }
  }

  return { x, y }
}

const edgePoint = (
  nodeId: NodeId,
  handleId: string,
  position: { readonly x: number; readonly y: number },
  size: { readonly width: number; readonly height: number },
  side: FlowHandle['side']
) =>
  edgeAttachmentPosition(
    position,
    { id: HandleIdSchema.make(handleId), kind: 'source', side },
    {
      nodeId,
      handleId: HandleIdSchema.make(handleId),
      offset: handleOffset(side, size),
      width: 11,
      height: 11,
    }
  )

const calculateEdgeGeometry = (
  model: Model,
  edge: FlowEdge,
  source: FlowGraphNode,
  target: FlowGraphNode,
  markerScope: string
) => {
  const resolved = resolveEdgeHandles(model.document, edge)
  const sourceHandle = resolved?.sourceHandle
  const targetHandle = resolved?.targetHandle
  const sourceSide = sourceHandle?.side ?? defaultHandleSide('source')
  const targetSide = targetHandle?.side ?? defaultHandleSide('target')

  const sourceSize = model.measurements.nodes.find(
    ({ measurement }) => measurement.nodeId === source.node.id
  )?.measurement ??
    source.node.size ?? { width: 150, height: 44 }

  const targetSize = model.measurements.nodes.find(
    ({ measurement }) => measurement.nodeId === target.node.id
  )?.measurement ??
    target.node.size ?? { width: 150, height: 44 }

  const start = edgePoint(
    source.node.id,
    sourceHandle?.id ?? `${edge.id}-source`,
    source.absolutePosition,
    sourceSize,
    sourceSide
  )

  const end = edgePoint(
    target.node.id,
    targetHandle?.id ?? `${edge.id}-target`,
    target.absolutePosition,
    targetSize,
    targetSide
  )

  const pathType: FlowEdgePath = edge.path ?? 'straight'

  const path = {
    straight: () => straightEdgePath(start, end),
    bezier: () => bezierEdgePath(start, end, sourceSide, targetSide),
    step: () => stepEdgePath(start, end, sourceSide, targetSide),
    smoothstep: () => smoothStepEdgePath(start, end, sourceSide, targetSide),
    simplebezier: () =>
      simpleBezierEdgePath(start, end, sourceSide, targetSide),
  }[pathType]()

  const markerStartId =
    edge.markerStart === undefined
      ? undefined
      : `${markerScope}-${edge.id}-start`

  const markerEndId =
    edge.markerEnd === undefined ? undefined : `${markerScope}-${edge.id}-end`

  const geometry: FoldkitEdgeGeometry = {
    path,
    labelPosition: edgeLabelPosition(
      start,
      end,
      pathType,
      sourceSide,
      targetSide
    ),
    markerStartId,
    markerEndId,
  }

  return { geometry, markerStartId, markerEndId }
}

const markerDefinition = (
  h: FoldHtml.HtmlBuilder<GraphMessageData>,
  id: string,
  marker: 'arrow' | 'arrowclosed',
  stroke: string
): NonNullable<FoldHtml.Html> => {
  const definition = h.marker(
    [
      h.Id(id),
      h.ViewBox('0 0 10 10'),
      h.RefX('10'),
      h.RefY('5'),
      h.MarkerWidth('6'),
      h.MarkerHeight('6'),
      h.MarkerUnits('strokeWidth'),
      h.Attribute('orient', 'auto-start-reverse'),
    ],
    [
      h.path([
        h.D('M 0 0 L 10 5 L 0 10'),
        h.Fill(marker === 'arrowclosed' ? stroke : 'none'),
        h.Stroke(stroke),
      ]),
    ]
  )

  if (definition === null) {
    throw new Error('Foldkit could not create an SVG marker definition')
  }

  return definition
}

const edgeVisuals = (
  edge: FlowEdge,
  geometry: FoldkitEdgeGeometry,
  markerStartId: string | undefined,
  markerEndId: string | undefined,
  renderer: FoldkitEdgeRenderer | undefined,
  h: FoldHtml.HtmlBuilder<GraphMessageData>
) => {
  const ariaLabel = edge.ariaLabel ?? edge.label ?? `Edge ${edge.id}`
  const stroke = edge.stroke ?? '#64748b'

  const markerDefinitions = [
    ...(markerStartId === undefined
      ? []
      : [
          markerDefinition(
            h,
            markerStartId,
            edge.markerStart ?? 'arrow',
            stroke
          ),
        ]),
    ...(markerEndId === undefined
      ? []
      : [markerDefinition(h, markerEndId, edge.markerEnd ?? 'arrow', stroke)]),
  ]

  const hitTarget = h.path([
    h.Class('flow-foldkit-edge-hit-target'),
    h.D(geometry.path),
    h.Fill('none'),
    h.Stroke('transparent'),
    h.StrokeWidth(String(edge.interactionWidth ?? 16)),
    h.PointerEvents('stroke'),
    h.Attribute('role', 'button'),
    h.Attribute('tabindex', '0'),
    h.AriaLabel(ariaLabel),
    h.OnClick(Message.SelectEdge({ edgeId: edge.id })),
    h.OnKeyDownPreventDefault((key) =>
      key === 'Enter' || key === ' '
        ? Option.some(Message.SelectEdge({ edgeId: edge.id }))
        : Option.none()
    ),
  ])

  const renderedEdge =
    renderer === undefined
      ? h.path([
          h.Class('flow-foldkit-edge-path'),
          h.D(geometry.path),
          h.Fill('none'),
          h.Stroke(stroke),
          h.StrokeWidth(String(edge.strokeWidth ?? 2)),
          ...(markerStartId === undefined
            ? []
            : [h.MarkerStart(`url(#${markerStartId})`)]),
          ...(markerEndId === undefined
            ? []
            : [h.MarkerEnd(`url(#${markerEndId})`)]),
        ])
      : renderer(edge, geometry, h)

  return { markerDefinitions, content: [hitTarget, renderedEdge] }
}

const graphView = (
  renderers: FoldkitRendererRegistry = {},
  markerScope = 'flow-foldkit'
) =>
  Submodel.defineView<Model, GraphMessageData>((model, h) => {
    const graph = createFlowGraph(model.document)
    const mountedNodeIds = selectMountedNodeIds(model)

    const nodes = graph.orderedNodes
      .map(({ node }) => node)
      .filter((node) => mountedNodeIds.has(node.id))
      .map((node) => {
        const position =
          graph.nodes.get(node.id)?.absolutePosition ?? node.position

        const measured = model.measurements.nodes.find(
          ({ measurement }) => measurement.nodeId === node.id
        )?.measurement

        const style =
          measured === undefined
            ? {
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: String(node.zIndex ?? 0),
              }
            : {
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${measured.width}px`,
                height: `${measured.height}px`,
                zIndex: String(node.zIndex ?? 0),
              }

        const handles = (node.handles ?? []).map((handle) =>
          h.button([
            h.Class(`flow-foldkit-handle flow-foldkit-handle-${handle.side}`),
            h.DataAttribute('handle-id', handle.id),
            h.DataAttribute('handle-side', handle.side),
            h.AriaLabel(`${handle.kind} handle ${handle.id}`),
          ])
        )

        const renderer =
          node.type === undefined ? undefined : renderers.nodeTypes?.[node.type]

        const contents =
          renderer === undefined ? [node.label] : [renderer(node, h)]

        return h.keyed('div')(
          node.id,
          [
            h.Class('flow-foldkit-node'),
            h.DataAttribute('testid', 'flow-node'),
            h.DataAttribute('node-id', node.id),
            h.Style(style),
          ],
          [...contents, ...handles]
        )
      })

    const edgeLabels: NonNullable<FoldHtml.Html>[] = []

    const visibleEdges = orderFlowEdges(model.document.edges)
      .filter(
        (edge) =>
          edge.hidden !== true &&
          graph.nodes.get(edge.source)?.hidden !== true &&
          graph.nodes.get(edge.target)?.hidden !== true
      )
      .map((edge) => {
        const source = graph.nodes.get(edge.source)
        const target = graph.nodes.get(edge.target)

        if (source === undefined || target === undefined) {
          return null
        }

        const { geometry, markerStartId, markerEndId } = calculateEdgeGeometry(
          model,
          edge,
          source,
          target,
          markerScope
        )

        const renderer =
          edge.type === undefined ? undefined : renderers.edgeTypes?.[edge.type]

        const ariaLabel = edge.ariaLabel ?? edge.label ?? `Edge ${edge.id}`

        if (edge.label !== undefined) {
          const label = h.keyed('div')(
            edge.id,
            [
              h.Class('flow-foldkit-edge-label'),
              h.DataAttribute('edge-id', edge.id),
              h.DataAttribute('label-owner', 'host-overlay'),
              h.Style({
                left: `${geometry.labelPosition.x}px`,
                top: `${geometry.labelPosition.y}px`,
                zIndex: String(
                  (edge.zIndex ?? 0) + (edge.selected === true ? 1000 : 0)
                ),
              }),
            ],
            [edge.label]
          )

          if (label !== null) {
            edgeLabels.push(label)
          }
        }

        const { markerDefinitions, content } = edgeVisuals(
          edge,
          geometry,
          markerStartId,
          markerEndId,
          renderer,
          h
        )

        return h.keyed('svg')(
          edge.id,
          [
            h.Class('flow-foldkit-edge'),
            h.DataAttribute('edge-id', edge.id),
            h.DataAttribute('edge-type', edge.type ?? 'default'),
            h.DataAttribute('edge-path-kind', edge.path ?? 'straight'),
            h.DataAttribute('source-id', edge.source),
            h.DataAttribute('source-handle', edge.sourceHandle ?? ''),
            h.DataAttribute('target-id', edge.target),
            h.DataAttribute('target-handle', edge.targetHandle ?? ''),
            h.DataAttribute('marker-start-kind', edge.markerStart ?? ''),
            h.DataAttribute('marker-end-kind', edge.markerEnd ?? ''),
            h.DataAttribute('selected', String(edge.selected === true)),
            h.DataAttribute('testid', 'flow-edge'),
            h.Attribute('role', 'group'),
            h.AriaLabel(ariaLabel),
            h.Attribute('width', '960'),
            h.Attribute('height', '640'),
            h.ViewBox('0 0 960 640'),
            h.Style({
              overflow: 'visible',
              zIndex: String(
                (edge.zIndex ?? 0) + (edge.selected === true ? 1000 : 0)
              ),
            }),
          ],
          [
            ...(markerDefinitions.length === 0
              ? []
              : [h.defs([], markerDefinitions)]),
            ...content,
          ]
        )
      })

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
          key === 'Escape'
            ? Option.some(Message.CancelGesture())
            : Option.none()
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
          [
            ...visibleEdges.filter(
              (edge): edge is NonNullable<typeof edge> => edge !== null
            ),
            h.div(
              [
                h.Class('flow-foldkit-edge-labels'),
                h.DataAttribute('label-owner', 'host-overlay'),
              ],
              edgeLabels
            ),
            ...nodes,
          ]
        ),
        h.div([h.Class('flow-foldkit-change-kinds'), h.AriaLive('polite')], []),
      ]
    )
  })

export const makeView = (
  renderers?: FoldkitRendererRegistry,
  markerScope?: string
) => graphView(renderers, markerScope)

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
  measurements: emptyFlowMeasurementState(),
  pointerSession: null,
})

export const View = graphView()

export const subscriptions = PointerEvents

export type { FlowChange, FlowCommand, Viewport } from '@flow/core'
