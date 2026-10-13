import type { ConnectionPreviewState } from './flow-connection-preview.schema.ts'
import {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from './flow-edge-path.ts'
import { edgeLabelPosition, resolveEdgeHandles } from './flow-edge.schema.ts'
import type { FlowGraphNode, FlowGraphView } from './flow-graph.ts'
import type {
  EdgeId,
  FlowEdge,
  FlowEdgePath,
  FlowHandle,
  FlowNode,
  HandleId,
  NodeId,
  XYPosition,
} from './flow.schema.ts'

/** The side of a node a handle or edge endpoint attaches to. */
export type FlowPosition = FlowHandle['side']

/** Built-in connection line path kinds, matching React Flow's `ConnectionLineType`. */
export { FlowEdgePathSchema as FlowConnectionLineTypeSchema } from './flow.schema.ts'

export type FlowConnectionLineType = FlowEdgePath

/** Absolute flow-space bounds of a rendered node, for floating edges and connection lines. */
export interface FlowNodeBounds {
  readonly id: NodeId
  readonly node: FlowNode
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export const flowNodeBounds = (graphNode: FlowGraphNode): FlowNodeBounds => ({
  id: graphNode.node.id,
  node: graphNode.node,
  x: graphNode.absolutePosition.x,
  y: graphNode.absolutePosition.y,
  width: graphNode.dimensions.width,
  height: graphNode.dimensions.height,
})

/** Host-neutral props for a custom edge renderer, modeled on React Flow `EdgeProps`. */
export interface FlowEdgeRendererProps {
  readonly id: EdgeId
  readonly type: string
  readonly pathType: FlowEdgePath
  readonly source: NodeId
  readonly target: NodeId
  /**
   * The resolved handle ids. Vanilla and Vue only render edges whose handles
   * resolve, so they always pass ids. Foldkit still draws an edge from a
   * default side when a handle does not resolve and passes null, matching
   * React Flow's `string | null`.
   */
  readonly sourceHandleId: HandleId | null
  readonly targetHandleId: HandleId | null
  readonly sourceX: number
  readonly sourceY: number
  readonly targetX: number
  readonly targetY: number
  readonly sourcePosition: FlowPosition
  readonly targetPosition: FlowPosition
  readonly selected: boolean
  readonly selectable: boolean
  readonly deletable: boolean
  readonly data: FlowEdge['data'] | undefined
  readonly label: string | undefined
  readonly markerStart: string | undefined
  readonly markerEnd: string | undefined
  readonly interactionWidth: number
  readonly labelX: number
  readonly labelY: number
  readonly sourceNode: FlowNodeBounds
  readonly targetNode: FlowNodeBounds
}

export interface FlowEdgeRendererPropsInput {
  readonly edge: FlowEdge
  readonly source: XYPosition
  readonly target: XYPosition
  readonly sourcePosition: FlowPosition
  readonly targetPosition: FlowPosition
  readonly sourceHandleId: HandleId | null
  readonly targetHandleId: HandleId | null
  readonly sourceNode: FlowNodeBounds
  readonly targetNode: FlowNodeBounds
  /** Marker references in `url(#id)` form, as the host registered them. */
  readonly markerStart: string | undefined
  readonly markerEnd: string | undefined
  readonly defaultInteractionWidth: number
  /** Overrides the built-in label anchor when the host already computed one. */
  readonly labelPosition?: XYPosition | undefined
}

const nodeBoundsKeys = [
  'id',
  'node',
  'x',
  'y',
  'width',
  'height',
] as const satisfies readonly (keyof FlowNodeBounds)[]

const edgeRendererPropKeys = [
  'id',
  'type',
  'pathType',
  'source',
  'target',
  'sourceHandleId',
  'targetHandleId',
  'sourceX',
  'sourceY',
  'targetX',
  'targetY',
  'sourcePosition',
  'targetPosition',
  'selected',
  'selectable',
  'deletable',
  'data',
  'label',
  'markerStart',
  'markerEnd',
  'interactionWidth',
  'labelX',
  'labelY',
] as const satisfies readonly Exclude<
  keyof FlowEdgeRendererProps,
  'sourceNode' | 'targetNode'
>[]

const sameNodeBounds = (left: FlowNodeBounds, right: FlowNodeBounds) =>
  left === right || nodeBoundsKeys.every((key) => left[key] === right[key])

/**
 * Whether two edge prop snapshots would render identically: fields compare by
 * identity, `sourceNode`/`targetNode` by their bounds. Hosts use it to keep
 * prop identity across pan and zoom renders and to skip per-frame updates.
 */
export const sameFlowEdgeRendererProps = (
  left: FlowEdgeRendererProps | undefined,
  right: FlowEdgeRendererProps
): boolean =>
  left !== undefined &&
  edgeRendererPropKeys.every((key) => left[key] === right[key]) &&
  sameNodeBounds(left.sourceNode, right.sourceNode) &&
  sameNodeBounds(left.targetNode, right.targetNode)

/** Compute one custom edge renderer's props from resolved edge geometry. */
export const flowEdgeRendererProps = (
  input: FlowEdgeRendererPropsInput
): FlowEdgeRendererProps => {
  const { edge } = input
  const pathType = edge.path ?? 'straight'

  const label =
    input.labelPosition ??
    edgeLabelPosition(
      input.source,
      input.target,
      pathType,
      input.sourcePosition,
      input.targetPosition
    )

  return {
    id: edge.id,
    type: edge.type ?? 'default',
    pathType,
    source: edge.source,
    target: edge.target,
    sourceHandleId: input.sourceHandleId,
    targetHandleId: input.targetHandleId,
    sourceX: input.source.x,
    sourceY: input.source.y,
    targetX: input.target.x,
    targetY: input.target.y,
    sourcePosition: input.sourcePosition,
    targetPosition: input.targetPosition,
    selected: edge.selected === true,
    selectable: edge.selectable !== false,
    deletable: edge.deletable !== false,
    data: edge.data,
    label: edge.label,
    markerStart: input.markerStart,
    markerEnd: input.markerEnd,
    interactionWidth: edge.interactionWidth ?? input.defaultInteractionWidth,
    labelX: label.x,
    labelY: label.y,
    sourceNode: input.sourceNode,
    targetNode: input.targetNode,
  }
}

/**
 * Host-neutral props for a custom node renderer, modeled on React Flow
 * `NodeProps`. `sourcePosition`, `targetPosition` and `dragHandle` are
 * omitted: Flow nodes declare handle sides on `handles` and have no
 * drag-handle selector field.
 */
export interface FlowNodeRendererProps {
  readonly id: NodeId
  readonly type: string
  readonly data: FlowNode['data'] | undefined
  readonly label: string
  readonly parentId: NodeId | undefined
  readonly selected: boolean
  readonly selectable: boolean
  readonly draggable: boolean
  readonly deletable: boolean
  readonly dragging: boolean
  readonly isConnectable: boolean
  readonly zIndex: number
  readonly positionAbsoluteX: number
  readonly positionAbsoluteY: number
  readonly width: number | undefined
  readonly height: number | undefined
}

export interface FlowNodeRendererPropsInput {
  readonly positionAbsolute: XYPosition
  readonly dragging: boolean
  /** Measured size when known, else the declared size. */
  readonly size?:
    | { readonly width: number; readonly height: number }
    | undefined
  /** The canvas-level `nodesConnectable` option. */
  readonly nodesConnectable?: boolean | undefined
}

const nodeRendererPropKeys = [
  'id',
  'type',
  'data',
  'label',
  'parentId',
  'selected',
  'selectable',
  'draggable',
  'deletable',
  'dragging',
  'isConnectable',
  'zIndex',
  'positionAbsoluteX',
  'positionAbsoluteY',
  'width',
  'height',
] as const satisfies readonly (keyof FlowNodeRendererProps)[]

/** Whether two node prop snapshots would render identically (data by reference). */
export const sameFlowNodeRendererProps = (
  left: FlowNodeRendererProps | undefined,
  right: FlowNodeRendererProps
): boolean =>
  left !== undefined &&
  nodeRendererPropKeys.every((key) => left[key] === right[key])

/** Compute one custom node renderer's props from the node and its host state. */
export const flowNodeRendererProps = (
  node: FlowNode,
  input: FlowNodeRendererPropsInput
): FlowNodeRendererProps => {
  const size = input.size ?? node.size

  return {
    id: node.id,
    type: node.type ?? 'default',
    data: node.data,
    label: node.label,
    parentId: node.parentId,
    selected: node.selected === true,
    selectable: node.selectable !== false,
    draggable: node.draggable !== false,
    deletable: node.deletable !== false,
    dragging: input.dragging,
    isConnectable:
      input.nodesConnectable !== false && node.connectable !== false,
    zIndex: node.zIndex ?? 0,
    positionAbsoluteX: input.positionAbsolute.x,
    positionAbsoluteY: input.positionAbsolute.y,
    width: size?.width,
    height: size?.height,
  }
}

const oppositePosition = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
} as const satisfies Record<FlowPosition, FlowPosition>

/** Props for a custom connection line renderer, modeled on `ConnectionLineComponentProps`. */
export interface FlowConnectionLineProps {
  readonly preview: ConnectionPreviewState
  readonly connectionLineType: FlowConnectionLineType
  readonly fromNode: FlowNodeBounds
  readonly fromHandle: FlowHandle
  readonly fromX: number
  readonly fromY: number
  readonly toX: number
  readonly toY: number
  readonly fromPosition: FlowPosition
  readonly toPosition: FlowPosition
  /** Bounds of the hovered node, the same shape as `fromNode`. */
  readonly toNode: FlowNodeBounds | null
  readonly toHandle: FlowHandle | null
  readonly connectionStatus: 'valid' | 'invalid' | null
  readonly pointer: XYPosition
  /** The built-in path for `connectionLineType`. */
  readonly path: string
}

export interface FlowConnectionLinePathParams {
  readonly fromX: number
  readonly fromY: number
  readonly toX: number
  readonly toY: number
  readonly fromPosition: FlowPosition
  readonly toPosition: FlowPosition
}

/** Build the built-in connection line path for one line type, as React Flow's ConnectionLine does. */
export const connectionLinePath = (
  type: FlowConnectionLineType,
  params: FlowConnectionLinePathParams
): string => {
  const pathParams = {
    sourceX: params.fromX,
    sourceY: params.fromY,
    sourcePosition: params.fromPosition,
    targetX: params.toX,
    targetY: params.toY,
    targetPosition: params.toPosition,
  }

  switch (type) {
    case 'bezier': {
      return getBezierPath(pathParams)[0]
    }

    case 'simplebezier': {
      return getSimpleBezierPath(pathParams)[0]
    }

    case 'step': {
      return getSmoothStepPath({ ...pathParams, borderRadius: 0 })[0]
    }

    case 'smoothstep': {
      return getSmoothStepPath(pathParams)[0]
    }

    default: {
      return getStraightPath(pathParams)[0]
    }
  }
}

export interface FlowConnectionLinePropsInput {
  readonly graph: FlowGraphView
  readonly preview: ConnectionPreviewState
  readonly connectionLineType: FlowConnectionLineType
  /** The handle a new connection started from; reconnections derive it from the edge. */
  readonly origin?:
    | { readonly nodeId: string; readonly handleId: string }
    | undefined
}

const graphNodeById = (
  graph: FlowGraphView,
  id: string
): FlowGraphNode | undefined =>
  graph.orderedNodes.find((graphNode) => graphNode.id === id)

const connectionOrigin = (
  input: FlowConnectionLinePropsInput
): { readonly nodeId: string; readonly handleId: string } | undefined => {
  const { preview } = input

  if (preview.kind === 'connect') {
    return input.origin
  }

  const { document } = input.graph
  const edge = document.edges.find(({ id }) => id === preview.edgeId)
  const resolved = edge && resolveEdgeHandles(document, edge)

  if (resolved === undefined) {
    return input.origin
  }

  return preview.endpoint === 'target'
    ? { nodeId: resolved.sourceNode.id, handleId: resolved.sourceHandle.id }
    : { nodeId: resolved.targetNode.id, handleId: resolved.targetHandle.id }
}

/** Compute custom connection line props; undefined when the origin handle is not in the graph. */
export const flowConnectionLineProps = (
  input: FlowConnectionLinePropsInput
): FlowConnectionLineProps | undefined => {
  const { preview } = input
  const origin = connectionOrigin(input)

  const fromGraphNode = origin && graphNodeById(input.graph, origin.nodeId)

  const fromHandle = fromGraphNode?.node.handles?.find(
    ({ id }) => id === origin?.handleId
  )

  if (fromGraphNode === undefined || fromHandle === undefined) {
    return undefined
  }

  const { candidate } = preview

  const fromIsSource =
    candidate !== null &&
    candidate.source === fromGraphNode.node.id &&
    candidate.sourceHandle === fromHandle.id

  let toEnd:
    | { readonly nodeId: NodeId; readonly handleId: HandleId }
    | undefined

  if (candidate !== null) {
    toEnd = fromIsSource
      ? { nodeId: candidate.target, handleId: candidate.targetHandle }
      : { nodeId: candidate.source, handleId: candidate.sourceHandle }
  }

  const toGraphNode =
    toEnd === undefined ? undefined : input.graph.nodes.get(toEnd.nodeId)

  const toHandle = toGraphNode?.node.handles?.find(
    ({ id }) => id === toEnd?.handleId
  )

  const fromPosition = fromHandle.side

  // React Flow takes the hovered handle's side only for a valid connection
  // (XYHandle.ts:192); otherwise the line ends facing the origin handle.
  const toPosition =
    preview.valid === true && toHandle !== undefined
      ? toHandle.side
      : oppositePosition[fromPosition]

  let connectionStatus: FlowConnectionLineProps['connectionStatus'] = null

  if (preview.valid !== null) {
    connectionStatus = preview.valid ? 'valid' : 'invalid'
  }

  const params = {
    fromX: preview.from.x,
    fromY: preview.from.y,
    toX: preview.to.x,
    toY: preview.to.y,
    fromPosition,
    toPosition,
  }

  return {
    preview,
    connectionLineType: input.connectionLineType,
    fromNode: flowNodeBounds(fromGraphNode),
    fromHandle,
    ...params,
    toNode: toGraphNode === undefined ? null : flowNodeBounds(toGraphNode),
    toHandle: toHandle ?? null,
    connectionStatus,
    pointer: preview.to,
    path: connectionLinePath(input.connectionLineType, params),
  }
}
