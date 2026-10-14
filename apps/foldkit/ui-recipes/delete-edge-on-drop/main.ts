import type { FlowDocument } from '@flow/core'

import { mountRecipeHost } from '../recipe-host.ts'

const source = { id: 'out', kind: 'source', side: 'bottom' } as const

const target = { id: 'in', kind: 'target', side: 'top' } as const

const node = (
  id: string,
  label: string,
  x: number,
  y: number,
  handles: readonly (typeof source | typeof target)[]
) => ({
  id,
  label,
  position: { x, y },
  size: { width: 150, height: 40 },
  handles,
})

// React Flow "Delete Edge on Drop": drop a reconnecting edge end on the pane
// to delete the edge, or on another handle to reconnect it.
const host = mountRecipeHost({
  page: 'delete-edge-on-drop-page',
  document: {
    nodes: [
      node('1', 'Node A', 360, 40, [source]),
      node('2', 'Node B', 160, 260, [target, source]),
      node('3', 'Node C', 560, 260, [target, source]),
    ],
    edges: [
      {
        id: 'e1-2',
        source: '1',
        sourceHandle: 'out',
        target: '2',
        targetHandle: 'in',
        label: 'reconnectable edge',
      },
    ],
  },
})

const render = (document: FlowDocument): void => {
  host.status.value = `edges:${document.edges
    .map(({ id, source: from, target: to }) => `${id}=${from}>${to}`)
    .join(',')}`
}

render(host.document())

host.onAccepted(render)

// `edgeReconnectSuccessful` in React: false from onReconnectStart until an
// onReconnect proposal arrives; onReconnectEnd deletes the edge otherwise.
let reconnectSuccessful = true

host.runtime.ports.interactionEvents.subscribe((events) => {
  for (const { name, edgeId, outcome } of events) {
    if (name === 'onReconnectStart') {
      reconnectSuccessful = false
    } else if (name === 'onReconnect') {
      reconnectSuccessful = true
    } else if (name === 'onReconnectEnd') {
      host.status.dataset.lastReconnect = outcome ?? 'unknown'

      // A cancelled gesture (blur, capture loss) keeps the edge.
      if (
        !reconnectSuccessful &&
        outcome !== 'cancelled' &&
        edgeId !== undefined &&
        edgeId !== null
      ) {
        void host.edit([{ kind: 'delete-elements', edgeIds: [edgeId] }])
      }

      reconnectSuccessful = true
    }
  }
})
