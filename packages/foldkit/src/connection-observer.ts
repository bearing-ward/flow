import { FlowNodeSchema, flowNoConnection } from '@flow/core'
import type { FlowConnectionState } from '@flow/core'
import { Schema } from 'effect'

const SideSchema = Schema.Literals(['top', 'right', 'bottom', 'left'])

const PointSchema = Schema.Struct({ x: Schema.Finite, y: Schema.Finite })

const ConnectionHandleSchema = Schema.Struct({
  id: Schema.String,
  nodeId: Schema.String,
  type: Schema.Literals(['source', 'target']),
  position: SideSchema,
})

/**
 * Port form of React Flow's `ConnectionState`, published while a pointer
 * connection or reconnection is in progress and once when it ends.
 */
export const FoldkitConnectionStateSchema = Schema.Struct({
  inProgress: Schema.Boolean,
  isValid: Schema.NullOr(Schema.Boolean),
  from: Schema.NullOr(PointSchema),
  fromHandle: Schema.NullOr(ConnectionHandleSchema),
  fromPosition: Schema.NullOr(SideSchema),
  fromNode: Schema.NullOr(FlowNodeSchema),
  to: Schema.NullOr(PointSchema),
  toHandle: Schema.NullOr(ConnectionHandleSchema),
  toPosition: Schema.NullOr(SideSchema),
  toNode: Schema.NullOr(FlowNodeSchema),
  pointer: Schema.NullOr(PointSchema),
})

export type FoldkitConnectionStateMessage =
  typeof FoldkitConnectionStateSchema.Type

const decodeConnectionState = Schema.decodeUnknownSync(
  FoldkitConnectionStateSchema
)

/** Rebuild the `ConnectionState` union from its port form. */
export const toFlowConnectionState = (
  message: FoldkitConnectionStateMessage
): FlowConnectionState => {
  const { from, fromHandle, fromPosition, fromNode, to, toPosition, pointer } =
    message

  if (
    !message.inProgress ||
    from === null ||
    fromHandle === null ||
    fromPosition === null ||
    fromNode === null ||
    to === null ||
    toPosition === null ||
    pointer === null
  ) {
    return flowNoConnection
  }

  return {
    inProgress: true,
    isValid: message.isValid,
    from,
    fromHandle,
    fromPosition,
    fromNode,
    to,
    toHandle: message.toHandle,
    toPosition,
    toNode: message.toNode,
    pointer,
  }
}

export interface FoldkitConnectionStateSource {
  readonly subscribe: (
    listener: (state: typeof FoldkitConnectionStateSchema.Encoded) => void
  ) => () => void
}

export interface FoldkitConnectionObserver {
  /** The latest connection state, as React Flow `useConnection()` returns it. */
  readonly getConnection: () => FlowConnectionState
  /** Called with every published connection state; returns an unsubscribe. */
  readonly subscribeConnection: (
    listener: (state: FlowConnectionState) => void
  ) => () => void
  readonly dispose: () => void
}

/** Bind a `useConnection` equivalent to one Runtime's `connectionStates` port. */
export const createFoldkitConnectionObserver = (
  connectionStates: FoldkitConnectionStateSource
): FoldkitConnectionObserver => {
  let current: FlowConnectionState = flowNoConnection
  const listeners = new Set<(state: FlowConnectionState) => void>()

  const stop = connectionStates.subscribe((encoded) => {
    current = toFlowConnectionState(decodeConnectionState(encoded))

    for (const listener of listeners) {
      listener(current)
    }
  })

  return {
    getConnection: () => current,
    subscribeConnection: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    dispose: () => {
      stop()
      listeners.clear()
    },
  }
}
