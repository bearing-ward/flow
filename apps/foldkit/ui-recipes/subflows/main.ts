import {
  getDropParentId,
  groupNodes,
  NodeIdSchema,
  reparentNode,
} from '@flow/core'
import type { FlowDocument } from '@flow/core'
import type { FoldkitNodeRenderer } from '@flow/foldkit'

import { measuredBounds, mountRecipeHost } from '../recipe-host.ts'

import './subflows.css'

const box = { width: 140, height: 60 }

const node = (id: string, x: number, y: number) => ({
  id,
  label: id,
  position: { x, y },
  size: box,
})

const groupNode: FoldkitNodeRenderer = (flowNode, h) =>
  h.div([h.Class('subflow-group-label')], [flowNode.label])

const host = mountRecipeHost({
  page: 'subflows-page',
  document: {
    nodes: [
      node('A', 60, 60),
      node('B', 260, 60),
      node('C', 60, 300),
      node('D', 260, 300),
      {
        id: 'G0',
        label: 'G0',
        type: 'group',
        position: { x: 500, y: 60 },
        size: { width: 340, height: 300 },
      },
      { ...node('E', 40, 60), parentId: 'G0' },
    ],
    edges: [],
  },
  registry: { nodeTypes: { group: groupNode } },
})

const isGroup = (id: string, document: FlowDocument): boolean =>
  document.nodes.some(
    (flowNode) => flowNode.id === id && flowNode.type === 'group'
  )

const render = (document: FlowDocument): void => {
  host.status.dataset.nodes = document.nodes
    .map(({ id }) => id)
    .toSorted()
    .join(',')
  host.status.dataset.parents = document.nodes
    .filter(({ type }) => type !== 'group')
    .map(({ id, parentId }) => `${id}:${parentId ?? ''}`)
    .toSorted()
    .join(',')
  host.status.value = `parents:${host.status.dataset.parents}`
}

render(host.document())

host.onAccepted(render)

let groupNumber = 0

// Selection Grouping: wrap the selected nodes in a new parent sized to their measured bounds.
host
  .button('group-selection', 'Group selection')
  .addEventListener('click', async () => {
    const { document, internals } = await host.measuredState()

    const nodeIds = document.nodes
      .filter(({ selected }) => selected === true)
      .map(({ id }) => id)

    groupNumber += 1

    const grouped = groupNodes(document.nodes, measuredBounds(internals), {
      nodeIds,
      groupId: NodeIdSchema.make(`group-${groupNumber}`),
      label: `group-${groupNumber}`,
      type: 'group',
      padding: 20,
    })

    if (grouped.kind === 'rejected') {
      host.status.dataset.error = grouped.reason

      return
    }

    await host.edit([{ kind: 'set-nodes', nodes: grouped.nodes }])
  })

// Parent Child Relation: a committed drag re-parents the dropped node.
const reparent = async (nodeId: string): Promise<void> => {
  const { document, internals } = await host.measuredState()
  const bounds = measuredBounds(internals)
  const dropped = bounds.get(nodeId)
  const flowNode = document.nodes.find(({ id }) => id === nodeId)

  if (dropped === undefined || flowNode === undefined) {
    return
  }

  const candidates = document.nodes.flatMap(({ id }) => {
    const rect = bounds.get(id)

    return isGroup(id, document) && rect !== undefined
      ? [{ id, bounds: rect }]
      : []
  })

  const dropParent = getDropParentId(
    document.nodes,
    candidates,
    nodeId,
    dropped
  )

  const parentId =
    dropParent === undefined ? undefined : NodeIdSchema.make(dropParent)

  if (parentId === flowNode.parentId) {
    return
  }

  await host.edit([
    {
      kind: 'set-nodes',
      nodes: reparentNode(document.nodes, bounds, nodeId, parentId),
    },
  ])
}

host.onChange((change) => {
  if (change.kind === 'node-position') {
    void reparent(change.nodeId)
  }
})
