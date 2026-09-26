import { graphNodeBounds } from './flow-graph.ts'
import type { FlowGraphView } from './flow-graph.ts'
import type { FlowRect } from './flow-visibility.schema.ts'
import type { NodeId } from './flow.schema.ts'

const CELL_SIZE = 128

/** Experimental immutable-by-convention grid. Rebuild it for each graph revision. */
export interface FlowSpatialPrototype {
  readonly query: (rect: FlowRect) => readonly NodeId[]
  /** Number of node-id entries stored across occupied cells; a memory proxy. */
  readonly storedEntries: number
}

const intersectsInclusive = (a: FlowRect, b: FlowRect): boolean =>
  a.x <= b.x + b.width &&
  a.x + a.width >= b.x &&
  a.y <= b.y + b.height &&
  a.y + a.height >= b.y

export const createFlowSpatialPrototype = (
  graph: FlowGraphView
): FlowSpatialPrototype => {
  const cells = new Map<string, NodeId[]>()
  const order = new Map<NodeId, number>()
  let storedEntries = 0

  const graphNode = (id: NodeId) => {
    const node = graph.nodes.get(id)

    if (node === undefined) {
      throw new Error(`Spatial index references missing graph node ${id}`)
    }

    return node
  }

  const orderOf = (id: NodeId) => {
    const index = order.get(id)

    if (index === undefined) {
      throw new Error(`Spatial index has no order for graph node ${id}`)
    }

    return index
  }

  for (const [index, node] of graph.orderedNodes.entries()) {
    order.set(node.id, index)

    if (node.hidden) {
      continue
    }

    const bounds = graphNodeBounds(node)

    for (
      let x = Math.floor(bounds.x / CELL_SIZE);
      x <= Math.floor((bounds.x + bounds.width) / CELL_SIZE);
      x += 1
    ) {
      for (
        let y = Math.floor(bounds.y / CELL_SIZE);
        y <= Math.floor((bounds.y + bounds.height) / CELL_SIZE);
        y += 1
      ) {
        const key = `${x},${y}`
        const ids = cells.get(key) ?? []
        ids.push(node.id)
        cells.set(key, ids)
        storedEntries += 1
      }
    }
  }

  return {
    storedEntries,
    query(rect) {
      const candidates = new Set<NodeId>()

      for (
        let x = Math.floor(rect.x / CELL_SIZE);
        x <= Math.floor((rect.x + rect.width) / CELL_SIZE);
        x += 1
      ) {
        for (
          let y = Math.floor(rect.y / CELL_SIZE);
          y <= Math.floor((rect.y + rect.height) / CELL_SIZE);
          y += 1
        ) {
          for (const id of cells.get(`${x},${y}`) ?? []) {
            candidates.add(id)
          }
        }
      }

      return [...candidates]
        .filter((id) => {
          const node = graphNode(id)

          return intersectsInclusive(graphNodeBounds(node), rect)
        })
        .toSorted((a, b) => orderOf(a) - orderOf(b))
    },
  }
}
