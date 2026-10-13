import { applyEdgeChanges, applyNodeChanges } from '@flow/core'
import type {
  EdgeChange,
  FlowEdge,
  FlowFinalConnectionState,
  FlowNode,
  NodeChange,
  XYPosition,
} from '@flow/core'

/** React Flow `OnNodesChange`: node deltas for one accepted or proposed change. */
export type FlowNodesChangeListener = (changes: readonly NodeChange[]) => void

/** React Flow `OnEdgesChange`: edge deltas for one accepted or proposed change. */
export type FlowEdgesChangeListener = (changes: readonly EdgeChange[]) => void

/** Fields every connection or reconnection end payload carries. */
export interface FlowConnectionEndDetails {
  /** React Flow `FinalConnectionState` from the last in-progress state. */
  readonly connectionState: FlowFinalConnectionState
  /** Release pointer in client coordinates; absent for keyboard or API ends. */
  readonly clientPosition?: XYPosition | undefined
  /** Release pointer in flow coordinates; absent for keyboard or API ends. */
  readonly position?: XYPosition | undefined
  /** The browser event that ended the gesture, when there was one. */
  readonly event?: MouseEvent | KeyboardEvent | undefined
}

/** Second `onReconnect` argument, React Flow's `(oldEdge, newConnection)`. */
export interface FlowReconnectDetails {
  readonly oldEdge: FlowEdge
  readonly newConnection: Pick<
    FlowEdge,
    'source' | 'sourceHandle' | 'target' | 'targetHandle'
  >
}

interface FlowElementsState<T, C> {
  /** Current elements. */
  readonly get: () => readonly T[]
  /** Replace the elements, like React's `setNodes(nodes)`. */
  readonly set: (next: readonly T[]) => void
  /** Derive the next elements, like React's `setNodes((nodes) => ...)`. */
  readonly update: (next: (current: readonly T[]) => readonly T[]) => void
  /** Pass as `onNodesChange` / `onEdgesChange`; applies the deltas. */
  readonly onChange: (changes: readonly C[]) => void
  /** Called after every `set` or applied delta batch. */
  readonly subscribe: (listener: (elements: readonly T[]) => void) => () => void
}

const createElementsState = <T, C>(
  initial: readonly T[],
  apply: (changes: readonly C[], elements: readonly T[]) => readonly T[]
): FlowElementsState<T, C> => {
  let elements = initial
  const listeners = new Set<(elements: readonly T[]) => void>()

  const set: FlowElementsState<T, C>['set'] = (next) => {
    elements = next

    for (const listener of listeners) {
      listener(next)
    }
  }

  return {
    get: () => elements,
    set,
    update: (next) => set(next(elements)),
    onChange: (changes) => {
      if (changes.length > 0) {
        set(apply(changes, elements))
      }
    },
    subscribe: (listener) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
  }
}

/**
 * Controlled node state, the Vanilla counterpart of React Flow's
 * `useNodesState`: `nodes = applyNodeChanges(changes, nodes)`.
 */
export const createFlowNodesState = (
  initial: readonly FlowNode[]
): FlowElementsState<FlowNode, NodeChange> =>
  createElementsState<FlowNode, NodeChange>(initial, (changes, nodes) =>
    applyNodeChanges(changes, nodes)
  )

/** Controlled edge state, the Vanilla counterpart of React Flow's `useEdgesState`. */
export const createFlowEdgesState = (
  initial: readonly FlowEdge[]
): FlowElementsState<FlowEdge, EdgeChange> =>
  createElementsState<FlowEdge, EdgeChange>(initial, (changes, edges) =>
    applyEdgeChanges(changes, edges)
  )

export type FlowNodesState = ReturnType<typeof createFlowNodesState>

export type FlowEdgesState = ReturnType<typeof createFlowEdgesState>
