import type { FlowInternalNode } from './flow-measurement.schema.ts'
import { flowNodeHandles } from './flow.schema.ts'
import type {
  FlowDocument,
  FlowHandle,
  FlowNode,
  XYPosition,
} from './flow.schema.ts'

/** A measured handle relative to its node's top-left corner. */
export interface FlowLayoutHandle {
  readonly id: string
  readonly kind: FlowHandle['kind']
  readonly side: FlowHandle['side']
  /** Top-left of the handle box, relative to the node. */
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** Measured input for an external layout engine such as Dagre or ELK. */
export interface FlowLayoutNode {
  readonly id: string
  readonly width: number
  readonly height: number
  readonly handles: readonly FlowLayoutHandle[]
}

export interface FlowLayoutEdge {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly sourceHandle: string | undefined
  readonly targetHandle: string | undefined
}

export interface FlowLayoutInput {
  readonly nodes: readonly FlowLayoutNode[]
  readonly edges: readonly FlowLayoutEdge[]
  /** Visible nodes without a measurement; lay out after they are measured. */
  readonly unmeasured: readonly string[]
}

/**
 * Build engine input from measured internal nodes. Hidden nodes and child
 * nodes stay out, as do edges that touch them. Node sizes and handle boxes
 * come from the host's measurements, never from guesses.
 */
export const getFlowLayoutInput = (
  document: FlowDocument,
  getInternalNode: (id: string) => FlowInternalNode | undefined
): FlowLayoutInput => {
  const nodes: FlowLayoutNode[] = []
  const unmeasured: string[] = []

  for (const node of document.nodes) {
    if (node.hidden === true || node.parentId !== undefined) {
      continue
    }

    const internal = getInternalNode(node.id)

    if (internal === undefined || internal.measurementStatus !== 'measured') {
      unmeasured.push(node.id)

      continue
    }

    const declared = new Map(
      flowNodeHandles(node).map((handle) => [handle.id, handle])
    )

    nodes.push({
      id: node.id,
      width: internal.width,
      height: internal.height,
      handles: internal.handles.flatMap((handle) => {
        const declaration = declared.get(handle.handleId)

        return declaration === undefined
          ? []
          : [
              {
                id: handle.handleId,
                kind: declaration.kind,
                side: declaration.side,
                x: handle.offset.x - handle.width / 2,
                y: handle.offset.y - handle.height / 2,
                width: handle.width,
                height: handle.height,
              },
            ]
      }),
    })
  }

  const laidOut = new Set(nodes.map(({ id }) => id))

  return {
    nodes,
    edges: document.edges
      .filter(
        ({ source, target, hidden }) =>
          hidden !== true && laidOut.has(source) && laidOut.has(target)
      )
      .map(({ id, source, target, sourceHandle, targetHandle }) => ({
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
      })),
    unmeasured,
  }
}

/** Convert an engine's center point to the node's top-left position. */
export const layoutCenterToTopLeft = (
  center: XYPosition,
  node: Pick<FlowLayoutNode, 'width' | 'height'>
): XYPosition => ({
  x: center.x - node.width / 2,
  y: center.y - node.height / 2,
})

/**
 * Apply top-left positions from a layout engine. Nodes without a position
 * keep theirs. Positions are rounded to whole flow units so a stable layout
 * produces no further change.
 */
export const applyFlowLayoutPositions = (
  nodes: readonly FlowNode[],
  positions: ReadonlyMap<string, XYPosition>
): readonly FlowNode[] =>
  nodes.map((node) => {
    const position = positions.get(node.id)

    return position === undefined
      ? node
      : {
          ...node,
          position: { x: Math.round(position.x), y: Math.round(position.y) },
        }
  })

export type FlowLayoutDirection = 'TB' | 'LR'

/**
 * Move every source handle to the trailing side and every target handle to the
 * leading side of a layout direction, as React Flow's layout examples set
 * `sourcePosition` and `targetPosition`.
 */
export const orientFlowHandles = (
  nodes: readonly FlowNode[],
  direction: FlowLayoutDirection
): readonly FlowNode[] =>
  nodes.map((node) => {
    if (node.handles === undefined) {
      // Default handles follow sourcePosition/targetPosition, as React's layout examples.
      return node.sourcePosition === undefined &&
        node.targetPosition === undefined
        ? node
        : {
            ...node,
            sourcePosition: direction === 'TB' ? 'bottom' : 'right',
            targetPosition: direction === 'TB' ? 'top' : 'left',
          }
    }

    return {
      ...node,
      handles: node.handles.map((handle) => {
        if (handle.kind === 'source') {
          return {
            ...handle,
            side: direction === 'TB' ? 'bottom' : 'right',
          }
        }

        return { ...handle, side: direction === 'TB' ? 'top' : 'left' }
      }),
    }
  })
