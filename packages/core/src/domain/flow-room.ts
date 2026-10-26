import { Effect, Schema as S } from 'effect'

import { flowHistoryDocument } from './flow-history.ts'
import { NodeIdSchema, XYPositionSchema } from './flow-values.ts'
import { flowNodeHandles, validateFlowDocument } from './flow.schema.ts'
import type { FlowDocument, FlowNode } from './flow.schema.ts'

export const FlowRoomPresenceSchema = S.Struct({
  actorId: S.NonEmptyString,
  name: S.NonEmptyString,
  cursor: S.NullOr(XYPositionSchema),
  drag: S.optional(
    S.Array(S.Struct({ nodeId: NodeIdSchema, position: XYPositionSchema }))
  ),
})

export type FlowRoomPresence = typeof FlowRoomPresenceSchema.Type

export const FlowRoomStatusSchema = S.Literals([
  'connecting',
  'connected',
  'disconnected',
  'disposed',
])

export type FlowRoomStatus = typeof FlowRoomStatusSchema.Type

const compareIds = (
  a: { readonly id: string },
  b: { readonly id: string }
): number => {
  if (a.id === b.id) {
    return 0
  }

  return a.id < b.id ? -1 : 1
}

/** Deterministic relational projection. Tombstoned parents retain their last position. */
export const projectFlowRoomDocument = (
  document: FlowDocument,
  retiredNodes: readonly FlowNode[] = []
): FlowDocument => {
  const semantic = flowHistoryDocument(document)

  const all = new Map(
    [...retiredNodes, ...semantic.nodes].map((node) => [node.id, node])
  )

  const active = new Set(semantic.nodes.map(({ id }) => id))

  const parents = new Map(
    semantic.nodes.map((node) => [
      node.id,
      node.parentId !== undefined && active.has(node.parentId)
        ? node.parentId
        : undefined,
    ])
  )

  for (const node of semantic.nodes.toSorted(compareIds)) {
    const path: FlowNode['id'][] = []
    const visited = new Map<FlowNode['id'], number>()
    let id: FlowNode['id'] | undefined = node.id

    while (id !== undefined) {
      const cycleStart = visited.get(id)

      if (cycleStart !== undefined) {
        const [cut] = path.slice(cycleStart).toSorted()

        if (cut !== undefined) {
          parents.set(cut, undefined)
        }

        break
      }

      visited.set(id, path.length)
      path.push(id)
      id = parents.get(id)
    }
  }

  const nodes = semantic.nodes.toSorted(compareIds).map((node) => {
    if (parents.get(node.id) === node.parentId) {
      if (node.parentId === undefined && node.extent === 'parent') {
        const { extent: _extent, ...unconstrained } = node

        return unconstrained
      }

      return node
    }

    const { parentId, extent: _extent, ...detached } = node
    const visited = new Set([node.id])
    let parent = parentId
    let { x, y } = node.position

    while (parent !== undefined && !visited.has(parent)) {
      visited.add(parent)
      const ancestor = all.get(parent)

      if (ancestor === undefined) {
        break
      }

      const origin = ancestor.origin ?? semantic.nodeOrigin ?? [0, 0]
      x += ancestor.position.x - (ancestor.size?.width ?? 0) * origin[0]
      y += ancestor.position.y - (ancestor.size?.height ?? 0) * origin[1]
      parent = ancestor.parentId
    }

    return { ...detached, position: { x, y } }
  })

  const byId = new Map(nodes.map((node) => [node.id, node]))

  const edges = semantic.edges.toSorted(compareIds).filter((edge) => {
    const source = byId.get(edge.source)
    const target = byId.get(edge.target)

    return (
      source !== undefined &&
      target !== undefined &&
      (edge.sourceHandle === undefined ||
        flowNodeHandles(source).some(({ id }) => id === edge.sourceHandle)) &&
      (edge.targetHandle === undefined ||
        flowNodeHandles(target).some(({ id }) => id === edge.targetHandle))
    )
  })

  const edgeIds = new Set(edges.map(({ id }) => id))
  const memberships = new Set<string>()

  const bundles = semantic.bundles?.toSorted(compareIds).flatMap((bundle) => {
    const ids = bundle.edgeIds.filter(
      (id) => edgeIds.has(id) && !memberships.has(id)
    )

    if (ids.length < 2) {
      return []
    }

    for (const id of ids) {
      memberships.add(id)
    }

    return [{ ...bundle, edgeIds: ids }]
  })

  return Effect.runSync(
    validateFlowDocument({ ...semantic, nodes, edges, bundles })
  )
}

/** Awareness is a presentation projection; it never mutates the durable room document. */
export const projectFlowRoomPresence = (
  document: FlowDocument,
  presence: readonly FlowRoomPresence[]
): FlowDocument => {
  const positions = new Map<FlowNode['id'], FlowNode['position']>()

  const ordered = presence.toSorted((a, b) => {
    if (a.actorId === b.actorId) {
      return 0
    }

    return a.actorId < b.actorId ? -1 : 1
  })

  for (const actor of ordered) {
    for (const item of actor.drag ?? []) {
      positions.set(item.nodeId, item.position)
    }
  }

  return {
    ...document,
    nodes: document.nodes.map((node) => {
      const position = positions.get(node.id)

      return position === undefined ? node : { ...node, position }
    }),
  }
}
