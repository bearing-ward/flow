import { HandleIdSchema } from '@flow/core'
import {
  createFlowBaseHandle,
  createFlowLabeledHandleLabel,
  mountFlow,
} from '@flow/vanilla'
import { Schema } from 'effect'

import './style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Base Handle fixture root')
}

const decodeHandleId = Schema.decodeUnknownSync(HandleIdSchema)

const controller = mountFlow(
  root,
  {
    nodes: [
      {
        id: 'source',
        label: 'Source',
        position: { x: 80, y: 100 },
        handles: [
          createFlowBaseHandle({
            id: decodeHandleId('output'),
            kind: 'source',
            side: 'right',
          }),
        ],
      },
      {
        id: 'accepted-target',
        label: 'Accepted target',
        position: { x: 360, y: 100 },
        handles: [
          createFlowBaseHandle({
            id: decodeHandleId('input'),
            kind: 'target',
            side: 'left',
          }),
        ],
      },
      {
        id: 'rejected-target',
        label: 'Rejected target',
        position: { x: 360, y: 300 },
        handles: [
          createFlowBaseHandle({
            id: decodeHandleId('blocked'),
            kind: 'target',
            side: 'left',
          }),
        ],
      },
    ],
    edges: [],
  },
  {
    documentMode: 'uncontrolled',
    isValidConnection: ({ target }) => target === 'accepted-target',
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
  }
)

for (const [id, text] of [
  ['output', 'Result'],
  ['input', 'Input'],
] as const) {
  const button = root.querySelector<HTMLButtonElement>(
    `[data-handle-id="${id}"]`
  )

  const host = button?.parentElement

  if (button === null || host === null || host === undefined) {
    continue
  }

  const label = createFlowLabeledHandleLabel({
    handle: {
      id: decodeHandleId(button.dataset.handleId ?? id),
      kind: id === 'output' ? 'source' : 'target',
      side: id === 'output' ? 'right' : 'left',
    },
    label: text,
  })

  button.setAttribute('aria-describedby', label.id)
  host.append(label)
}

root.dataset.edgeCount = '0'

controller.subscribeState((change) => {
  root.dataset.edgeCount = String(change.current.document.edges.length)
})

const unsubscribeViewport = controller.subscribeViewport(({ viewport }) => {
  root.style.setProperty(
    '--flow-labeled-handle-inverse-zoom',
    String(1 / viewport.zoom)
  )
})

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})

globalThis.addEventListener('pagehide', unsubscribeViewport, { once: true })
