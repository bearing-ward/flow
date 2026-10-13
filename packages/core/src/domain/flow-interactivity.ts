import type { FlowEdge, FlowHandle, FlowNode } from './flow.schema.ts'

/**
 * Canvas-wide interaction switches, as React Flow's `nodesDraggable`,
 * `nodesConnectable` and `elementsSelectable`. Hosts may change them at
 * runtime; the Controls lock toggles all three together.
 */
export interface FlowInteractivity {
  readonly nodesDraggable: boolean
  readonly nodesConnectable: boolean
  readonly elementsSelectable: boolean
}

/** Optional switches; an unset or undefined switch keeps its default. */
export interface FlowInteractivityInput {
  readonly nodesDraggable?: boolean | undefined
  readonly nodesConnectable?: boolean | undefined
  readonly elementsSelectable?: boolean | undefined
}

export const defaultFlowInteractivity: FlowInteractivity = {
  nodesDraggable: true,
  nodesConnectable: true,
  elementsSelectable: true,
}

/** Fill unset switches with React Flow's defaults (all true). */
export const resolveFlowInteractivity = (
  input?: FlowInteractivityInput
): FlowInteractivity => ({
  nodesDraggable: input?.nodesDraggable ?? true,
  nodesConnectable: input?.nodesConnectable ?? true,
  elementsSelectable: input?.elementsSelectable ?? true,
})

/** React Flow Controls' `isInteractive`: any of the three switches is on. */
export const isFlowInteractive = (interactivity: FlowInteractivity): boolean =>
  interactivity.nodesDraggable ||
  interactivity.nodesConnectable ||
  interactivity.elementsSelectable

/** The switches the Controls lock button sets: all on or all off. */
export const flowInteractivityFor = (
  interactive: boolean
): FlowInteractivity => ({
  nodesDraggable: interactive,
  nodesConnectable: interactive,
  elementsSelectable: interactive,
})

/** A node's own `draggable` wins over the canvas switch, as in React Flow. */
export const isNodeDraggable = (
  interactivity: FlowInteractivityInput | undefined,
  node: Pick<FlowNode, 'draggable'>
): boolean => node.draggable ?? interactivity?.nodesDraggable ?? true

/** A node's own `selectable` wins over `elementsSelectable`. */
export const isNodeSelectable = (
  interactivity: FlowInteractivityInput | undefined,
  node: Pick<FlowNode, 'selectable'>
): boolean => node.selectable ?? interactivity?.elementsSelectable ?? true

/** An edge's own `selectable` wins over `elementsSelectable`. */
export const isEdgeSelectable = (
  interactivity: FlowInteractivityInput | undefined,
  edge: Pick<FlowEdge, 'selectable'>
): boolean => edge.selectable ?? interactivity?.elementsSelectable ?? true

/** A node's own `connectable` wins over `nodesConnectable`. */
export const isNodeConnectable = (
  interactivity: FlowInteractivityInput | undefined,
  node: Pick<FlowNode, 'connectable'>
): boolean => node.connectable ?? interactivity?.nodesConnectable ?? true

/**
 * Whether a handle can start (`start`) or finish (`end`) a connection, as
 * React Flow's Handle `isConnectable`, `isConnectableStart` and
 * `isConnectableEnd`. A handle's own `connectable` wins over its node's.
 */
export const isHandleConnectable = (
  interactivity: FlowInteractivityInput | undefined,
  node: Pick<FlowNode, 'connectable'>,
  handle: Pick<
    FlowHandle,
    'connectable' | 'connectableStart' | 'connectableEnd'
  >,
  end: 'start' | 'end'
): boolean => {
  const connectable =
    handle.connectable ?? isNodeConnectable(interactivity, node)

  if (!connectable) {
    return false
  }

  return end === 'start'
    ? handle.connectableStart !== false
    : handle.connectableEnd !== false
}
