import { Schema as S } from 'effect'

import type { EdgeId, FlowEdge, FlowNode, NodeId } from './flow.schema.ts'

/**
 * React Flow `ZIndexMode`. `basic` elevates selections and keeps children
 * above parents; `auto` also separates root sub flows; `manual` applies only
 * `zIndex` (children still stack above their parent, as in React).
 */
export const FlowZIndexModeSchema = S.Literals(['basic', 'auto', 'manual'])

export type FlowZIndexMode = typeof FlowZIndexModeSchema.Type

/** React `SELECTED_NODE_Z` and the selected-edge elevation. */
export const flowSelectedElementZ = 1000

/** React `ROOT_PARENT_Z_INCREMENT` for `auto` mode. */
export const flowRootParentZIncrement = 10

export interface FlowStackingInput {
  readonly nodes: readonly Pick<
    FlowNode,
    'id' | 'parentId' | 'zIndex' | 'selected'
  >[]
  readonly edges?: readonly Pick<
    FlowEdge,
    'id' | 'source' | 'target' | 'zIndex' | 'selected'
  >[]
  /** Defaults to `basic`, as React. */
  readonly zIndexMode?: FlowZIndexMode
  /** Defaults to true, as React. */
  readonly elevateNodesOnSelect?: boolean
  /** Defaults to false, as React. */
  readonly elevateEdgesOnSelect?: boolean
}

export interface FlowStacking {
  /** CSS `z-index` for each node wrapper. */
  readonly nodes: ReadonlyMap<NodeId, number>
  /** CSS `z-index` for each edge. */
  readonly edges: ReadonlyMap<EdgeId, number>
}

/**
 * Compute React Flow node and edge z-indices (`adoptUserNodes`,
 * `updateChildNode`, `calculateChildXYZ` and `getElevatedEdgeZIndex`).
 * Nodes are visited in input order; a parent listed after its child is
 * visited first instead of being skipped.
 */
export const computeFlowStacking = ({
  nodes,
  edges = [],
  zIndexMode = 'basic',
  elevateNodesOnSelect = true,
  elevateEdgesOnSelect = false,
}: FlowStackingInput): FlowStacking => {
  const manual = zIndexMode === 'manual'

  const selectedNodeZ =
    elevateNodesOnSelect && !manual ? flowSelectedElementZ : 0

  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const nodeZ = new Map<NodeId, number>()
  const rootParentIndex = new Map<NodeId, number>()
  const visiting = new Set<NodeId>()
  let rootCounter = 0

  const ownZ = (node: FlowStackingInput['nodes'][number]): number =>
    (node.zIndex ?? 0) + (!manual && node.selected === true ? selectedNodeZ : 0)

  const visit = (node: FlowStackingInput['nodes'][number]): void => {
    if (nodeZ.has(node.id) || visiting.has(node.id)) {
      return
    }

    visiting.add(node.id)

    const parent =
      node.parentId === undefined ? undefined : nodesById.get(node.parentId)

    if (parent === undefined) {
      nodeZ.set(node.id, ownZ(node))
      visiting.delete(node.id)

      return
    }

    visit(parent)

    if (
      parent.parentId === undefined &&
      !rootParentIndex.has(parent.id) &&
      zIndexMode === 'auto'
    ) {
      rootCounter += 1
      rootParentIndex.set(parent.id, rootCounter)
      nodeZ.set(
        parent.id,
        (nodeZ.get(parent.id) ?? 0) + rootCounter * flowRootParentZIncrement
      )
    }

    // React resets the counter to an already-indexed parent's index.
    rootCounter = rootParentIndex.get(parent.id) ?? rootCounter

    const childZ = ownZ(node)
    const parentZ = nodeZ.get(parent.id) ?? 0
    nodeZ.set(node.id, parentZ >= childZ ? parentZ + 1 : childZ)
    visiting.delete(node.id)
  }

  for (const node of nodes) {
    visit(node)
  }

  const edgeZ = new Map<EdgeId, number>()

  for (const edge of edges) {
    const zIndex = edge.zIndex ?? 0

    if (manual) {
      edgeZ.set(edge.id, zIndex)
      continue
    }

    const elevated =
      elevateEdgesOnSelect && edge.selected === true
        ? zIndex + flowSelectedElementZ
        : zIndex

    const endpointZ = (id: NodeId): number => {
      const node = nodesById.get(id)

      return node !== undefined &&
        (node.parentId !== undefined ||
          (elevateEdgesOnSelect && node.selected === true))
        ? (nodeZ.get(id) ?? 0)
        : 0
    }

    edgeZ.set(
      edge.id,
      elevated + Math.max(endpointZ(edge.source), endpointZ(edge.target))
    )
  }

  return { nodes: nodeZ, edges: edgeZ }
}
