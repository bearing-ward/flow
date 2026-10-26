import { Schema as S } from 'effect'

import type { FlowDocument, FlowNode, NodeId } from './flow.schema.ts'

/** Reserved node.data.tree envelope; other JSON data remains application-owned. */
export const FlowTreeDataSchema = S.Struct({
  version: S.Literal(1),
  kind: S.Literals(['node', 'placeholder']),
  expanded: S.Boolean,
})

export type FlowTreeData = typeof FlowTreeDataSchema.Type

const isTreeData = S.is(FlowTreeDataSchema)

export const flowTreeData = (
  node: FlowNode | undefined
): FlowTreeData | undefined => {
  const value = node?.data?.tree

  return value !== undefined && isTreeData(value) ? value : undefined
}

/** Derived visibility only. Never overwrite authored node.hidden or edge.hidden. */
export const flowTreeCollapsedIds = (
  document: FlowDocument
): ReadonlySet<NodeId> => {
  const children = new Map<NodeId, NodeId[]>()

  const members = new Set(
    document.nodes
      .filter((node) => flowTreeData(node) !== undefined)
      .map(({ id }) => id)
  )

  for (const edge of document.edges) {
    if (members.has(edge.source) && members.has(edge.target)) {
      const list = children.get(edge.source) ?? []
      list.push(edge.target)
      children.set(edge.source, list)
    }
  }

  const hidden = new Set<NodeId>()

  const pending = document.nodes.flatMap((node) =>
    flowTreeData(node)?.expanded === false ? (children.get(node.id) ?? []) : []
  )

  while (pending.length > 0) {
    const id = pending.pop()

    if (id !== undefined && !hidden.has(id)) {
      hidden.add(id)
      pending.push(...(children.get(id) ?? []))
    }
  }

  return hidden
}

export const projectFlowTree = (document: FlowDocument): FlowDocument => {
  const hidden = flowTreeCollapsedIds(document)

  return {
    ...document,
    nodes: document.nodes.filter(({ id }) => !hidden.has(id)),
    edges: document.edges.filter(
      ({ source, target }) => !hidden.has(source) && !hidden.has(target)
    ),
  }
}

/** Complete expansion state, including descendants outside the current projection. */
export const flowTreeExpandedState = (
  document: FlowDocument
): ReadonlyMap<NodeId, boolean> =>
  new Map(
    document.nodes.flatMap((node) => {
      const data = flowTreeData(node)

      return data === undefined ? [] : [[node.id, data.expanded] as const]
    })
  )
