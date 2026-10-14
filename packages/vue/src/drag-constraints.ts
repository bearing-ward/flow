import {
  calculateFlowExpandParentDrag,
  constrainNodeGroupDelta,
  constrainNodePosition,
  resolveNodeOrigin,
  snapGroupDelta,
} from '@flow/core'
import type {
  FlowExpandParentChange,
  FlowGraphView,
  NodeExtent,
  NodeId,
  SnapGrid,
  XYPosition,
} from '@flow/core'

import type { DragMember } from './node-drag-group.ts'

/** One constrained node-drag step. */
export interface FlowVueDragStep {
  /** Stored (parent-relative anchor) position of every drag member. */
  readonly positions: ReadonlyMap<NodeId, XYPosition>
  /** `expandParent` growth: parent and sibling positions and parent sizes. */
  readonly expand: readonly FlowExpandParentChange[]
}

export interface FlowVueDragInput {
  readonly graph: FlowGraphView
  readonly members: readonly DragMember[]
  /** The node under the pointer; its absolute position is snapped. */
  readonly anchorId: NodeId
  /** Unconstrained flow-space pointer travel since the drag began. */
  readonly delta: XYPosition
  /** Set when `snapToGrid` is on. */
  readonly snapGrid?: SnapGrid | undefined
  /** Keyboard movement snaps and constrains each member independently. */
  readonly individualNodes?: boolean | undefined
  readonly nodeExtent?: NodeExtent | undefined
}

/**
 * React `XYDrag.updateNodes` for Flow's delta drag: snap the anchor's
 * absolute position to the grid, keep root members inside `nodeExtent` as
 * one group, clamp `extent: 'parent'` members to their parent box, and let
 * `expandParent` members grow their parent instead of being clamped.
 */
export const constrainFlowVueDrag = ({
  graph,
  members,
  anchorId,
  delta,
  snapGrid,
  nodeExtent,
  individualNodes = false,
}: FlowVueDragInput): FlowVueDragStep => {
  const anchor = graph.nodes.get(anchorId)

  const snapped =
    snapGrid === undefined || anchor === undefined
      ? delta
      : snapGroupDelta(anchor.absolutePosition, delta, snapGrid)

  const rootItems = members.flatMap(({ nodeId }) => {
    const node = graph.nodes.get(nodeId)

    return node === undefined || node.parentId !== undefined
      ? []
      : [{ position: node.absolutePosition, ...node.dimensions }]
  })

  const rootDelta =
    nodeExtent === undefined || rootItems.length === 0
      ? snapped
      : constrainNodeGroupDelta(rootItems, snapped, nodeExtent)

  const items = members.map(({ nodeId, origin }) => {
    const node = graph.nodes.get(nodeId)

    let memberDelta = individualNodes ? delta : snapped

    if (individualNodes && snapGrid !== undefined && node !== undefined) {
      memberDelta = snapGroupDelta(node.absolutePosition, delta, snapGrid)
    }

    const parent =
      node?.parentId === undefined ? undefined : graph.nodes.get(node.parentId)

    if (node === undefined || parent === undefined) {
      let boundedDelta = individualNodes ? memberDelta : rootDelta

      if (individualNodes && nodeExtent !== undefined && node !== undefined) {
        boundedDelta = constrainNodeGroupDelta(
          [{ position: node.absolutePosition, ...node.dimensions }],
          memberDelta,
          nodeExtent
        )
      }

      return {
        id: nodeId,
        position: {
          x: origin.x + boundedDelta.x,
          y: origin.y + boundedDelta.y,
        },
      }
    }

    const proposed = {
      x: origin.x + memberDelta.x,
      y: origin.y + memberDelta.y,
    }

    if (node.node.extent !== 'parent' || node.node.expandParent === true) {
      return { id: nodeId, position: proposed }
    }

    return {
      id: nodeId,
      position: constrainNodePosition(
        proposed,
        node.dimensions,
        {
          minX: 0,
          minY: 0,
          maxX: parent.dimensions.width,
          maxY: parent.dimensions.height,
        },
        resolveNodeOrigin(node.node, graph.document)
      ),
    }
  })

  const memberIds = new Set(members.map(({ nodeId }) => nodeId))
  const positions = new Map<NodeId, XYPosition>()
  const expand: FlowExpandParentChange[] = []

  for (const change of calculateFlowExpandParentDrag(graph, items)) {
    if (change.kind === 'position' && memberIds.has(change.nodeId)) {
      positions.set(change.nodeId, change.position)
    } else {
      expand.push(change)
    }
  }

  return { positions, expand }
}
