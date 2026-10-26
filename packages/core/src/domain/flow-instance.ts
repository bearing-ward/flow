import { Predicate } from 'effect'

import type { FlowBundle } from './flow-bundle.schema.ts'
import { boundedNodeRect } from './flow-intersection.ts'
import type { FlowBoundedNode } from './flow-intersection.ts'
import type { FlowInternalNode } from './flow-measurement.schema.ts'
import { nodeAnchorToTopLeft } from './flow-origin.schema.ts'
import type { NodeOrigin } from './flow-origin.schema.ts'
import type { Viewport } from './flow-runtime.schema.ts'
import type { FlowSnapshot } from './flow-snapshot.ts'
import type { FlowRect } from './flow-visibility.schema.ts'
import type { FlowEdge, FlowNode } from './flow.schema.ts'

export interface FlowNodesBoundsOptions {
  /**
   * Internal nodes by id. Ids and plain nodes resolve through it, which gives
   * measured sizes and absolute positions for child nodes, like React Flow's
   * `nodeLookup`.
   */
  readonly nodeLookup?: ReadonlyMap<string, FlowInternalNode> | undefined
  /** Origin for plain nodes without their own; defaults to `[0, 0]`. */
  readonly nodeOrigin?: NodeOrigin | undefined
}

const plainNodeRect = (node: FlowNode, nodeOrigin: NodeOrigin): FlowRect => {
  const size = node.size ?? { width: 0, height: 0 }

  const topLeft = nodeAnchorToTopLeft(
    node.position,
    size,
    node.origin ?? nodeOrigin
  )

  return { ...topLeft, ...size }
}

/**
 * React Flow's `getNodesBounds`: the smallest rectangle around the given
 * nodes, ids or internal nodes. With a `nodeLookup`, ids and plain nodes use
 * the internal node; without one, plain nodes use their parent-relative
 * position and declared size, and ids are skipped. Unresolved items are
 * skipped, and no nodes give a zero rectangle at the origin.
 */
export const getNodesBounds = (
  nodes: readonly (FlowNode | FlowBoundedNode | string)[],
  options: FlowNodesBoundsOptions = {}
): FlowRect => {
  const nodeOrigin = options.nodeOrigin ?? [0, 0]

  const rects = nodes.flatMap((item): FlowRect[] => {
    if (Predicate.isString(item)) {
      const internal = options.nodeLookup?.get(item)

      return internal === undefined ? [] : [boundedNodeRect(internal)]
    }

    if ('absolutePosition' in item || 'bounds' in item) {
      return [boundedNodeRect(item)]
    }

    const internal = options.nodeLookup?.get(item.id)

    if (options.nodeLookup !== undefined) {
      return internal === undefined ? [] : [boundedNodeRect(internal)]
    }

    return [plainNodeRect(item, nodeOrigin)]
  })

  if (rects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const x = Math.min(...rects.map((rect) => rect.x))
  const y = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))

  return { x, y, width: right - x, height: bottom - y }
}

/** React Flow's `toObject` result: detached nodes, edges and viewport. */
export interface FlowObject {
  readonly bundles?: FlowBundle[]
  readonly nodes: FlowNode[]
  readonly edges: FlowEdge[]
  readonly viewport: Viewport
  /** Present when the document sets a default node origin. */
  readonly nodeOrigin?: NodeOrigin
}

/**
 * React Flow's `toObject`: a detached, mutable copy of the accepted nodes,
 * edges and viewport. Flow also keeps a document node origin, so restoring
 * the object loses nothing.
 */
export const toFlowObject = (snapshot: FlowSnapshot): FlowObject => {
  const { document, viewport } = structuredClone(snapshot)

  const base = {
    ...(document.bundles === undefined
      ? undefined
      : { bundles: [...document.bundles] }),
    nodes: [...document.nodes],
    edges: [...document.edges],
    viewport,
  }

  return document.nodeOrigin === undefined
    ? base
    : { ...base, nodeOrigin: document.nodeOrigin }
}
