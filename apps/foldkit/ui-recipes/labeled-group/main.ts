import type { FlowDocument } from '@flow/core'
import { createFoldkitLabeledGroupNode } from '@flow/foldkit'

import { mountRecipeHost } from '../recipe-host.ts'

import './labeled-group.css'

const child = (id: string, x: number, y: number) => ({
  id,
  label: id,
  parentId: 'group',
  extent: 'parent' as const,
  position: { x, y },
  size: { width: 120, height: 44 },
})

// React Flow UI "Labeled Group Node": a group with a title and child nodes
// that stay inside it.
const host = mountRecipeHost({
  page: 'labeled-group-page',
  document: {
    nodes: [
      {
        id: 'group',
        label: 'Group A',
        type: 'labeled-group',
        position: { x: 80, y: 80 },
        size: { width: 380, height: 260 },
      },
      child('child-1', 30, 60),
      child('child-2', 220, 170),
      {
        id: 'outside',
        label: 'outside',
        position: { x: 560, y: 120 },
        size: { width: 120, height: 44 },
      },
    ],
    edges: [{ id: 'e-1-2', source: 'child-1', target: 'child-2' }],
  },
  registry: {
    nodeTypes: { 'labeled-group': createFoldkitLabeledGroupNode() },
  },
})

const render = (document: FlowDocument): void => {
  host.status.dataset.positions = document.nodes
    .map(
      ({ id, position }) =>
        `${id}@${Math.round(position.x)},${Math.round(position.y)}`
    )
    .join(' ')
  host.status.value = host.status.dataset.positions
}

render(host.document())

host.onAccepted(render)
