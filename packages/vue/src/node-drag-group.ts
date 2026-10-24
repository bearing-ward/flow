import {
  isEdgeSelectable,
  isNodeDraggable,
  isNodeSelectable,
  nodeTopLeftToAnchor,
  resolveNodeOrigin,
} from '@flow/core'
import type {
  FlowDocument,
  FlowGraphView,
  FlowEdge,
  FlowInteractivity,
  FlowNode,
  XYPosition,
} from '@flow/core'

/** One node moved by a drag, with its document position at drag start. */
export interface DragMember {
  readonly nodeId: FlowNode['id']
  readonly origin: XYPosition
}

/**
 * Nodes a drag of `anchor` moves. A selected anchor drags every selected,
 * draggable node except those whose ancestor also moves, as React Flow's
 * `getDragItems` does; an unselected anchor drags alone.
 */
export const dragGroupMembers = (
  document: FlowDocument,
  interactivity: FlowInteractivity,
  anchor: FlowNode,
  graph: FlowGraphView
): readonly DragMember[] => {
  const member = (node: FlowNode): DragMember => {
    const resolved = graph.nodes.get(node.id)

    const parent =
      resolved?.parentId === undefined
        ? undefined
        : graph.nodes.get(resolved.parentId)

    return {
      nodeId: node.id,
      origin:
        resolved === undefined
          ? node.position
          : nodeTopLeftToAnchor(
              {
                x:
                  resolved.absolutePosition.x -
                  (parent?.absolutePosition.x ?? 0),
                y:
                  resolved.absolutePosition.y -
                  (parent?.absolutePosition.y ?? 0),
              },
              resolved.dimensions,
              resolveNodeOrigin(node, document)
            ),
    }
  }

  if (anchor.selected !== true) {
    return [member(anchor)]
  }

  const byId = new Map(document.nodes.map((node) => [node.id, node]))

  const moving = new Set(
    document.nodes
      .filter(
        (node) =>
          node.id === anchor.id ||
          (node.selected === true && isNodeDraggable(interactivity, node))
      )
      .map(({ id }) => id)
  )

  const hasMovingAncestor = (node: FlowNode): boolean => {
    const seen = new Set<string>()
    let { parentId } = node

    while (parentId !== undefined && !seen.has(parentId)) {
      if (moving.has(parentId)) {
        return true
      }

      seen.add(parentId)
      parentId = byId.get(parentId)?.parentId
    }

    return false
  }

  return document.nodes
    .filter((node) => moving.has(node.id) && !hasMovingAncestor(node))
    .map(member)
}

/** Member positions after a flow-space drag delta. */
export const dragGroupPositions = (
  members: readonly DragMember[],
  delta: XYPosition
): ReadonlyMap<FlowNode['id'], XYPosition> =>
  new Map(
    members.map(({ nodeId, origin }) => [
      nodeId,
      { x: origin.x + delta.x, y: origin.y + delta.y },
    ])
  )

/** The drag members and every descendant they carry along. */
export const dragCarriedNodes = (
  document: FlowDocument,
  memberIds: ReadonlySet<FlowNode['id']>
): ReadonlySet<FlowNode['id']> => {
  const byId = new Map(document.nodes.map((node) => [node.id, node]))

  const carried = (node: FlowNode): boolean => {
    const seen = new Set<string>()
    let current: FlowNode | undefined = node

    while (current !== undefined && !seen.has(current.id)) {
      if (memberIds.has(current.id)) {
        return true
      }

      seen.add(current.id)
      current =
        current.parentId === undefined ? undefined : byId.get(current.parentId)
    }

    return false
  }

  return new Set(document.nodes.filter(carried).map(({ id }) => id))
}

/** Interactive descendants whose clicks do not select their node. */
const nodeClickControls =
  'button, input, select, textarea, a[href], [contenteditable=""], [contenteditable="true"], [data-handle-id]'

/** Whether `target` is, or is inside, a control within `nodeElement`. */
export const isNodeControl = (
  target: EventTarget | null,
  nodeElement: EventTarget | null
): boolean => {
  const control =
    target instanceof Element ? target.closest(nodeClickControls) : null

  return (
    control !== null &&
    nodeElement instanceof Element &&
    nodeElement.contains(control)
  )
}

/** The modifier that adds to or toggles a selection: Meta or Control. */
export const isMultiSelectionEvent = (
  event: Pick<MouseEvent, 'metaKey' | 'ctrlKey'>
): boolean => event.metaKey || event.ctrlKey

interface SelectionIds {
  readonly nodeIds: readonly FlowNode['id'][]
  readonly edgeIds: readonly FlowEdge['id'][]
}

const selectedIds = (
  document: FlowDocument,
  interactivity: FlowInteractivity
): SelectionIds => ({
  nodeIds: document.nodes
    .filter(
      (node) => node.selected === true && isNodeSelectable(interactivity, node)
    )
    .map(({ id }) => id),
  edgeIds: document.edges
    .filter(
      (edge) => edge.selected === true && isEdgeSelectable(interactivity, edge)
    )
    .map(({ id }) => id),
})

/**
 * Selection after a node click, as React Flow's `handleNodeClick`: an
 * unselected node becomes the only selection, the multi-selection key toggles
 * it, and a plain click on a selected node keeps the selection.
 */
export const selectionAfterNodeClick = (
  document: FlowDocument,
  interactivity: FlowInteractivity,
  node: FlowNode,
  multi: boolean
): SelectionIds | undefined => {
  if (!isNodeSelectable(interactivity, node)) {
    return undefined
  }

  const current = selectedIds(document, interactivity)

  if (multi) {
    return {
      nodeIds:
        node.selected === true
          ? current.nodeIds.filter((id) => id !== node.id)
          : [...current.nodeIds, node.id],
      edgeIds: current.edgeIds,
    }
  }

  return node.selected === true
    ? undefined
    : { nodeIds: [node.id], edgeIds: [] }
}

/**
 * Selection after an edge click, as React Flow's edge `onClick`: the
 * multi-selection key toggles the edge, otherwise it becomes the only
 * selection.
 */
export const selectionAfterEdgeClick = (
  document: FlowDocument,
  interactivity: FlowInteractivity,
  edge: FlowEdge,
  multi: boolean
): SelectionIds | undefined => {
  if (!isEdgeSelectable(interactivity, edge)) {
    return undefined
  }

  const current = selectedIds(document, interactivity)

  if (multi) {
    return {
      nodeIds: current.nodeIds,
      edgeIds:
        edge.selected === true
          ? current.edgeIds.filter((id) => id !== edge.id)
          : [...current.edgeIds, edge.id],
    }
  }

  const alreadyOnly =
    edge.selected === true &&
    current.nodeIds.length === 0 &&
    current.edgeIds.length === 1

  return alreadyOnly ? undefined : { nodeIds: [], edgeIds: [edge.id] }
}
