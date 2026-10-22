import {
  FlowDocumentSchema,
  createFlowGraph,
  projectFlowInternalNode,
  constrainNodePosition,
} from '@flow/core'
import type { NodeExtent, NodeOrigin } from '@flow/core'
import { Schema as S } from 'effect'

export const lookup = (
  nodes: readonly unknown[],
  nodeOrigin: NodeOrigin = [0, 0],
  extent?: NodeExtent
) => {
  const document = S.decodeUnknownSync(FlowDocumentSchema)({
    nodes,
    edges: [],
    nodeOrigin,
  })

  const graph = createFlowGraph(document)

  return new Map(
    [...graph.nodes].map(([id, item]) => [
      id,
      projectFlowInternalNode(
        extent
          ? {
              ...item,
              absolutePosition: constrainNodePosition(
                item.absolutePosition,
                item.dimensions,
                extent
              ),
            }
          : item
      ),
    ])
  )
}

export const fixtureNode = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  parentId?: string
) => {
  const node = {
    id,
    label: 'node',
    data: { label: 'node' },
    position: { x, y },
    measured: { width, height },
  }

  if (parentId !== undefined) {
    return { ...node, parentId }
  }

  return node
}

export const lookupNodes = (
  nodeLookup: ReturnType<typeof lookup>,
  ids: readonly string[]
) =>
  ids.flatMap((id) => {
    const node = [...nodeLookup.values()].find(
      (item) => item.node.id === id
    )?.node

    return node ? [node] : []
  })
