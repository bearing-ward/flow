import type { ConnectionPreviewSnapshot } from './flow-connection-preview.schema.ts'
import { resolveEdgeHandles } from './flow-edge.schema.ts'
import { flowNodeHandles } from './flow.schema.ts'
import type {
  FlowDocument,
  FlowHandle,
  FlowNode,
  XYPosition,
} from './flow.schema.ts'

type FlowSide = FlowHandle['side']

/** A handle taking part in a connection, modeled on React Flow's `Handle` type. */
export interface FlowConnectionHandle {
  readonly id: string
  readonly nodeId: string
  readonly type: FlowHandle['kind']
  readonly position: FlowSide
}

/** React Flow `NoConnection`. */
export interface FlowNoConnection {
  readonly inProgress: false
  readonly isValid: null
  readonly from: null
  readonly fromHandle: null
  readonly fromPosition: null
  readonly fromNode: null
  readonly to: null
  readonly toHandle: null
  readonly toPosition: null
  readonly toNode: null
  readonly pointer: null
}

/** React Flow `ConnectionInProgress`, with Flow nodes in place of internal nodes. */
export interface FlowConnectionInProgress {
  readonly inProgress: true
  readonly isValid: boolean | null
  readonly from: XYPosition
  readonly fromHandle: FlowConnectionHandle
  readonly fromPosition: FlowSide
  readonly fromNode: FlowNode
  readonly to: XYPosition
  readonly toHandle: FlowConnectionHandle | null
  readonly toPosition: FlowSide
  readonly toNode: FlowNode | null
  readonly pointer: XYPosition
}

/** React Flow `ConnectionState`, read by `useConnection`. */
export type FlowConnectionState = FlowConnectionInProgress | FlowNoConnection

/** React Flow `FinalConnectionState`, passed to `onConnectEnd` and `onReconnectEnd`. */
export type FlowFinalConnectionState =
  | (Omit<FlowConnectionInProgress, 'inProgress' | 'toPosition'> & {
      readonly toPosition: FlowSide | null
    })
  | Omit<FlowNoConnection, 'inProgress'>

export const flowNoConnection: FlowNoConnection = {
  inProgress: false,
  isValid: null,
  from: null,
  fromHandle: null,
  fromPosition: null,
  fromNode: null,
  to: null,
  toHandle: null,
  toPosition: null,
  toNode: null,
  pointer: null,
}

const opposite = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
} as const satisfies Record<FlowSide, FlowSide>

const connectionHandle = (
  node: FlowNode,
  handle: FlowHandle
): FlowConnectionHandle => ({
  id: handle.id,
  nodeId: node.id,
  type: handle.kind,
  position: handle.side,
})

const findEndpoint = (document: FlowDocument, nodeId: string, id: string) => {
  const node = document.nodes.find((item) => item.id === nodeId)
  const handle = flowNodeHandles(node).find((item) => item.id === id)

  return node === undefined || handle === undefined
    ? undefined
    : { node, handle }
}

export interface FlowConnectionStateInput {
  readonly document: FlowDocument
  readonly preview: ConnectionPreviewSnapshot
  /** The handle a new connection started from; reconnections derive it from the edge. */
  readonly origin?:
    | { readonly nodeId: string; readonly handleId: string }
    | undefined
}

const previewOrigin = ({
  document,
  preview,
  origin,
}: FlowConnectionStateInput) => {
  if (preview === null || preview.kind === 'connect') {
    return origin
  }

  const edge = document.edges.find(({ id }) => id === preview.edgeId)
  const resolved = edge && resolveEdgeHandles(document, edge)

  if (resolved === undefined) {
    return origin
  }

  return preview.endpoint === 'target'
    ? { nodeId: resolved.sourceNode.id, handleId: resolved.sourceHandle.id }
    : { nodeId: resolved.targetNode.id, handleId: resolved.targetHandle.id }
}

/**
 * React Flow `ConnectionState` for a host's connection preview: `inProgress`,
 * `fromNode`, `fromHandle`, `toNode`, `toHandle`, positions and validity.
 */
export const flowConnectionState = (
  input: FlowConnectionStateInput
): FlowConnectionState => {
  const { document, preview } = input
  const origin = previewOrigin(input)

  const from =
    origin === undefined
      ? undefined
      : findEndpoint(document, origin.nodeId, origin.handleId)

  if (preview === null || from === undefined) {
    return flowNoConnection
  }

  const { candidate } = preview

  const fromIsSource =
    candidate !== null &&
    candidate.source === from.node.id &&
    candidate.sourceHandle === from.handle.id

  let to: ReturnType<typeof findEndpoint>

  if (candidate !== null) {
    to = fromIsSource
      ? findEndpoint(document, candidate.target, candidate.targetHandle)
      : findEndpoint(document, candidate.source, candidate.sourceHandle)
  }

  return {
    inProgress: true,
    isValid: preview.valid,
    from: preview.from,
    fromHandle: connectionHandle(from.node, from.handle),
    fromPosition: from.handle.side,
    fromNode: from.node,
    to: preview.to,
    toHandle: to === undefined ? null : connectionHandle(to.node, to.handle),
    // React Flow takes the hovered handle's side only for a valid connection
    // (XYHandle.ts:192); otherwise the line ends facing the origin handle.
    toPosition:
      preview.valid === true && to !== undefined
        ? to.handle.side
        : opposite[from.handle.side],
    toNode: to?.node ?? null,
    pointer: preview.to,
  }
}

/** The final state React Flow passes to `onConnectEnd`, from the last in-progress state. */
export const flowFinalConnectionState = (
  state: FlowConnectionState
): FlowFinalConnectionState => {
  if (!state.inProgress) {
    const { inProgress: _idle, ...idle } = state

    return idle
  }

  const { inProgress: _inProgress, ...rest } = state

  return {
    ...rest,
    toPosition: state.toHandle === null ? null : state.toPosition,
  }
}
