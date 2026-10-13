import type { FlowGraphView } from './flow-graph.ts'
import { resolveNodeOrigin } from './flow-origin.schema.ts'
import type { FlowRect } from './flow-visibility.schema.ts'
import type { NodeId, XYPosition } from './flow.schema.ts'

/** A child with `expandParent` and its proposed absolute rectangle. */
export interface FlowExpandParentChild {
  readonly id: NodeId
  readonly parentId: NodeId
  readonly rect: FlowRect
}

export type FlowExpandParentChange =
  | {
      readonly kind: 'position'
      readonly nodeId: NodeId
      readonly position: XYPosition
    }
  | {
      readonly kind: 'size'
      readonly nodeId: NodeId
      readonly size: { readonly width: number; readonly height: number }
    }

const union = (a: FlowRect, b: FlowRect): FlowRect => {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)

  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  }
}

const parentExpansionChanges = (
  graph: FlowGraphView,
  parentId: NodeId,
  expanded: FlowRect,
  movedIds: ReadonlySet<NodeId>
): readonly FlowExpandParentChange[] => {
  const parent = graph.nodes.get(parentId)

  if (parent === undefined) {
    return []
  }

  const changes: FlowExpandParentChange[] = []
  const { absolutePosition, dimensions } = parent
  const origin = resolveNodeOrigin(parent.node, graph.document)

  const xChange =
    expanded.x < absolutePosition.x
      ? Math.round(Math.abs(absolutePosition.x - expanded.x))
      : 0

  const yChange =
    expanded.y < absolutePosition.y
      ? Math.round(Math.abs(absolutePosition.y - expanded.y))
      : 0

  const newWidth = Math.max(dimensions.width, Math.round(expanded.width))
  const newHeight = Math.max(dimensions.height, Math.round(expanded.height))
  const widthChange = (newWidth - dimensions.width) * origin[0]
  const heightChange = (newHeight - dimensions.height) * origin[1]

  if (xChange > 0 || yChange > 0 || widthChange !== 0 || heightChange !== 0) {
    changes.push({
      kind: 'position',
      nodeId: parentId,
      position: {
        x: parent.node.position.x - xChange + widthChange,
        y: parent.node.position.y - yChange + heightChange,
      },
    })

    for (const siblingId of graph.children.get(parentId) ?? []) {
      const sibling = graph.nodes.get(siblingId)

      if (sibling !== undefined && !movedIds.has(siblingId)) {
        changes.push({
          kind: 'position',
          nodeId: siblingId,
          position: {
            x: sibling.node.position.x + xChange,
            y: sibling.node.position.y + yChange,
          },
        })
      }
    }
  }

  if (
    dimensions.width < expanded.width ||
    dimensions.height < expanded.height ||
    xChange !== 0 ||
    yChange !== 0
  ) {
    changes.push({
      kind: 'size',
      nodeId: parentId,
      size: {
        width:
          newWidth + (xChange === 0 ? 0 : origin[0] * xChange - widthChange),
        height:
          newHeight + (yChange === 0 ? 0 : origin[1] * yChange - heightChange),
      },
    })
  }

  return changes
}

/**
 * Port of React `handleExpandParent`: grow each parent to contain its
 * `expandParent` children. When a parent grows up or left, its stored
 * position moves and its other children get compensating positions, so
 * nothing moves on screen. Returns no changes when every child fits.
 */
export const calculateFlowExpandParent = (
  graph: FlowGraphView,
  children: readonly FlowExpandParentChild[]
): readonly FlowExpandParentChange[] => {
  const expansions = new Map<NodeId, FlowRect>()

  for (const child of children) {
    const parent = graph.nodes.get(child.parentId)

    if (parent === undefined) {
      continue
    }

    const parentRect = expansions.get(child.parentId) ?? {
      ...parent.absolutePosition,
      ...parent.dimensions,
    }

    expansions.set(child.parentId, union(parentRect, child.rect))
  }

  const movedIds = new Set(children.map((child) => child.id))

  return [...expansions].flatMap(([parentId, expanded]) =>
    parentExpansionChanges(graph, parentId, expanded, movedIds)
  )
}
