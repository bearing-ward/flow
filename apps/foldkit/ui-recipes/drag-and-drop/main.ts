import type { FlowDocument } from '@flow/core'
import { Option, Schema as S } from 'effect'

import { mountRecipeHost } from '../recipe-host.ts'

import './drag-and-drop.css'

const dragFormat = 'application/flow-node'

const NodeKindSchema = S.Literals(['input', 'default', 'output'])

type NodeKind = typeof NodeKindSchema.Type

const source = { id: 'out', kind: 'source', side: 'bottom' } as const

const target = { id: 'in', kind: 'target', side: 'top' } as const

const handlesFor = (kind: NodeKind) => {
  if (kind === 'input') {
    return [source]
  }

  return kind === 'output' ? [target] : [target, source]
}

const size = { width: 150, height: 40 }

// React Flow "Drag and Drop": drag a sidebar item onto the pane to create a
// node centered on the drop point (`nodeOrigin: [0.5, 0.5]`).
const host = mountRecipeHost({
  page: 'drag-and-drop-page',
  // A panned and zoomed start proves the drop goes through screenToFlow.
  viewport: { x: 30, y: 20, zoom: 0.8 },
  document: {
    nodeOrigin: [0.5, 0.5],
    nodes: [
      {
        id: '1',
        label: 'input node',
        className: 'dnd-node-input',
        position: { x: 450, y: 60 },
        size,
        handles: handlesFor('input'),
      },
    ],
    edges: [],
  },
})

const sidebar = document.createElement('aside')

sidebar.className = 'dnd-sidebar'

sidebar.dataset.testid = 'dnd-sidebar'

const description = document.createElement('div')

description.textContent = 'You can drag these nodes to the pane below.'

sidebar.append(description)

for (const kind of NodeKindSchema.literals) {
  const item = document.createElement('div')
  item.className = `dnd-item dnd-node-${kind}`
  item.dataset.testid = `dnd-${kind}`
  item.draggable = true
  item.textContent = `${kind[0]?.toUpperCase() ?? ''}${kind.slice(1)} Node`
  item.addEventListener('dragstart', (event) => {
    event.dataTransfer?.setData(dragFormat, kind)

    if (event.dataTransfer !== null) {
      event.dataTransfer.effectAllowed = 'move'
    }
  })
  sidebar.append(item)
}

host.frame.before(sidebar)

let created = 0

// The pane wrapper owns the native drop target, like React's `onDragOver`
// and `onDrop` props on `<ReactFlow />`.
host.frame.addEventListener('dragover', (event) => {
  event.preventDefault()

  if (event.dataTransfer !== null) {
    event.dataTransfer.dropEffect = 'move'
  }
})

host.frame.addEventListener('drop', (event) => {
  event.preventDefault()

  const kind = S.decodeUnknownOption(NodeKindSchema)(
    event.dataTransfer?.getData(dragFormat)
  )

  if (Option.isNone(kind)) {
    return
  }

  const client = { x: event.clientX, y: event.clientY }

  void (async () => {
    // `screenToFlowPosition` through the public viewport client.
    const { point } = await host.viewportClient.screenToFlow(client)

    if (point === undefined) {
      return
    }

    const id = `dndnode_${created}`
    created += 1

    await host.edit([
      {
        kind: 'add-nodes',
        nodes: [
          {
            id,
            label: `${kind.value} node`,
            className: `dnd-node-${kind.value}`,
            position: point,
            size,
            handles: handlesFor(kind.value),
          },
        ],
      },
    ])
  })()
})

const render = (document: FlowDocument): void => {
  host.status.value = document.nodes
    .map(
      ({ id, label, position }) =>
        `${id}:${label}@${Math.round(position.x)},${Math.round(position.y)}`
    )
    .join(' ')
}

render(host.document())

host.onAccepted(render)
