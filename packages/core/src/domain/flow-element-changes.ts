import {
  applyEdgeChanges,
  applyNodeChanges,
} from './flow-change-compatibility.ts'
import type { EdgeChange, NodeChange } from './flow-change-compatibility.ts'
import { createFlowGraph } from './flow-graph.ts'
import type { FlowResizeParams } from './flow-node-resizer.ts'
import {
  applyEdgeReconnectChange,
  applyEdgeRemoveChange,
  applyEdgeSelectionChange,
  applyNodeBoundsChange,
  applyNodePositionChange,
  applyNodePositionsChange,
  applyNodeSelectionChange,
  applyNodeSizeChange,
  applySelectionSetChange,
} from './flow-runtime.schema.ts'
import type { FlowChange, MeasuredNode } from './flow-runtime.schema.ts'
import type { NodeId } from './flow-values.ts'
import type { FlowDocument, FlowEdge, FlowNode } from './flow.schema.ts'

/** React Flow style element deltas derived from one accepted document change. */
export interface FlowElementChanges {
  readonly nodes: readonly NodeChange[]
  readonly edges: readonly EdgeChange[]
}

/** JSON text with sorted object keys, so field order never reads as a change. */
const stableJson = <T>(value: T, omit: readonly string[] = []): string =>
  JSON.stringify(value, (key, nested: T) => {
    if (
      nested === null ||
      Array.isArray(nested) ||
      !(nested instanceof Object)
    ) {
      return nested
    }

    return Object.fromEntries(
      Object.entries(nested)
        .filter(([name]) => key !== '' || !omit.includes(name))
        .toSorted(([left], [right]) => left.localeCompare(right))
    )
  })

const sameValue = <T>(left: T, right: T, omit: readonly string[] = []) =>
  left === right || stableJson(left, omit) === stableJson(right, omit)

/** Fields that have dedicated position or select deltas. */
const nodeDeltaKeys = ['position', 'selected'] as const

const edgeDeltaKeys = ['selected'] as const

const elementOrderKept = (
  previous: readonly { readonly id: string }[],
  current: readonly { readonly id: string }[]
): boolean => {
  const currentIds = new Set(current.map((element) => element.id))
  const previousIds = new Set(previous.map((element) => element.id))
  const kept = previous.filter((element) => currentIds.has(element.id))
  const keptInCurrent = current.filter((element) => previousIds.has(element.id))

  return kept.every((element, index) => keptInCurrent[index]?.id === element.id)
}

const removalsAndAdditions = <T extends { readonly id: string }>(
  previous: readonly T[],
  current: readonly T[]
) => {
  const currentIds = new Set(current.map((element) => element.id))
  const previousIds = new Set(previous.map((element) => element.id))

  return {
    removed: previous.filter((element) => !currentIds.has(element.id)),
    added: current.flatMap((item, index) =>
      previousIds.has(item.id) ? [] : [{ item, index }]
    ),
  }
}

/** Every element as a replace delta, used when kept elements were reordered. */
const reorderNodes = (
  previous: readonly FlowNode[],
  current: readonly FlowNode[]
): NodeChange[] => [
  ...previous.map((node): NodeChange => ({ id: node.id, type: 'remove' })),
  ...current.map((item, index): NodeChange => ({ item, type: 'add', index })),
]

const reorderEdges = (
  previous: readonly FlowEdge[],
  current: readonly FlowEdge[]
): EdgeChange[] => [
  ...previous.map((edge): EdgeChange => ({ id: edge.id, type: 'remove' })),
  ...current.map((item, index): EdgeChange => ({ item, type: 'add', index })),
]

/**
 * Node deltas between two accepted documents. Applying them with
 * `applyNodeChanges` to the previous nodes yields the current nodes.
 */
export const flowNodeChanges = (
  previous: readonly FlowNode[],
  current: readonly FlowNode[]
): readonly NodeChange[] => {
  if (previous === current) {
    return []
  }

  if (!elementOrderKept(previous, current)) {
    return reorderNodes(previous, current)
  }

  const before = new Map(previous.map((node) => [node.id, node]))
  const { removed, added } = removalsAndAdditions(previous, current)

  const changes: NodeChange[] = removed.map((node) => ({
    id: node.id,
    type: 'remove',
  }))

  for (const node of current) {
    const old = before.get(node.id)

    if (old === undefined || old === node) {
      continue
    }

    if (
      !sameValue(old, node, nodeDeltaKeys) ||
      (old.selected !== node.selected && node.selected === undefined)
    ) {
      changes.push({ id: node.id, item: node, type: 'replace' })
      continue
    }

    if (!sameValue(old.position, node.position)) {
      changes.push({ id: node.id, type: 'position', position: node.position })
    }

    if (node.selected !== undefined && old.selected !== node.selected) {
      changes.push({ id: node.id, type: 'select', selected: node.selected })
    }
  }

  for (const { item, index } of added) {
    changes.push({ item, type: 'add', index })
  }

  return changes
}

/**
 * Edge deltas between two accepted documents. Applying them with
 * `applyEdgeChanges` to the previous edges yields the current edges.
 */
export const flowEdgeChanges = (
  previous: readonly FlowEdge[],
  current: readonly FlowEdge[]
): readonly EdgeChange[] => {
  if (previous === current) {
    return []
  }

  if (!elementOrderKept(previous, current)) {
    return reorderEdges(previous, current)
  }

  const before = new Map(previous.map((edge) => [edge.id, edge]))
  const { removed, added } = removalsAndAdditions(previous, current)

  const changes: EdgeChange[] = removed.map((edge) => ({
    id: edge.id,
    type: 'remove',
  }))

  for (const edge of current) {
    const old = before.get(edge.id)

    if (old === undefined || old === edge) {
      continue
    }

    if (
      !sameValue(old, edge, edgeDeltaKeys) ||
      (old.selected !== edge.selected && edge.selected === undefined)
    ) {
      changes.push({ id: edge.id, item: edge, type: 'replace' })
      continue
    }

    if (edge.selected !== undefined && old.selected !== edge.selected) {
      changes.push({ id: edge.id, type: 'select', selected: edge.selected })
    }
  }

  for (const { item, index } of added) {
    changes.push({ item, type: 'add', index })
  }

  return changes
}

/** Node and edge deltas for one accepted document change. */
export const flowElementChanges = (
  previous: FlowDocument,
  current: FlowDocument
): FlowElementChanges =>
  previous === current
    ? { nodes: [], edges: [] }
    : {
        nodes: flowNodeChanges(previous.nodes, current.nodes),
        edges: flowEdgeChanges(previous.edges, current.edges),
      }

/** The document a semantic change proposes, or undefined when it changes no element. */
export const applyFlowChangeToDocument = (
  document: FlowDocument,
  change: FlowChange
): FlowDocument | undefined => {
  switch (change.kind) {
    case 'node-position': {
      return applyNodePositionChange(document, change)
    }

    case 'node-positions': {
      return applyNodePositionsChange(document, change)
    }

    case 'node-size': {
      return applyNodeSizeChange(document, change)
    }

    case 'node-bounds': {
      return applyNodeBoundsChange(document, change)
    }

    case 'viewport': {
      return undefined
    }

    case 'edge-add': {
      return { ...document, edges: [...document.edges, change.edge] }
    }

    case 'edge-selection': {
      return applyEdgeSelectionChange(document, change)
    }

    case 'node-selection': {
      return applyNodeSelectionChange(document, change)
    }

    case 'selection-set': {
      return applySelectionSetChange(document, change)
    }

    case 'edge-reconnect': {
      return applyEdgeReconnectChange(document, change)
    }

    case 'edge-remove': {
      return applyEdgeRemoveChange(document, change)
    }

    case 'edit-proposal': {
      return change.document
    }

    default: {
      return undefined
    }
  }
}

/**
 * Node and edge deltas a semantic change proposes against a document. Works
 * in controlled mode too, where the host has not yet accepted the change.
 */
export const flowChangeElementChanges = (
  document: FlowDocument,
  change: FlowChange,
  measurements: ReadonlyMap<NodeId, MeasuredNode> = new Map()
): FlowElementChanges => {
  const proposed = applyFlowChangeToDocument(document, change)

  if (proposed === undefined) {
    return { nodes: [], edges: [] }
  }

  const changes = flowElementChanges(document, proposed)

  if (change.kind !== 'node-position' && change.kind !== 'node-positions') {
    return changes
  }

  const graph = createFlowGraph(proposed, measurements)

  return {
    ...changes,
    nodes: changes.nodes.map((node) =>
      node.type === 'position'
        ? {
            ...node,
            dragging: false,
            positionAbsolute: graph.nodes.get(node.id)?.absolutePosition,
          }
        : node
    ),
  }
}

/**
 * Apply node and edge deltas to a whole document, the controlled pattern
 * `nodes = applyNodeChanges(changes, nodes)` for hosts that hold one document.
 */
export const applyFlowElementChanges = (
  document: FlowDocument,
  changes: Partial<FlowElementChanges>
): FlowDocument => ({
  ...document,
  nodes:
    changes.nodes === undefined || changes.nodes.length === 0
      ? document.nodes
      : applyNodeChanges(changes.nodes, document.nodes),
  edges:
    changes.edges === undefined || changes.edges.length === 0
      ? document.edges
      : applyEdgeChanges(changes.edges, document.edges),
})

/** Observer-only resize completion, including gestures with no accepted step. */
export const flowResizeCompletionChanges = (
  nodeId: NodeId,
  accepted: Pick<FlowResizeParams, 'width' | 'height'>
): readonly NodeChange[] => [
  {
    id: nodeId,
    type: 'dimensions',
    resizing: false,
    dimensions: { width: accepted.width, height: accepted.height },
  },
]
