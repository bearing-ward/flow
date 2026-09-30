import { HandleIdSchema } from '@flow/core'
import {
  createFlowBaseHandle,
  createFlowControlButton,
  mountFlow,
} from '@flow/vanilla'
import { Schema } from 'effect'

import './style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Button Handle fixture root')
}

let actions = 0

const controller = mountFlow(
  root,
  {
    nodes: [
      {
        id: 'button-node',
        label: 'Action node',
        type: 'button-handle',
        position: { x: 100, y: 120 },
        size: { width: 190, height: 100 },
        handles: [
          createFlowBaseHandle({
            id: Schema.decodeUnknownSync(HandleIdSchema)('out'),
            kind: 'source',
            side: 'right',
          }),
        ],
      },
      {
        id: 'target-node',
        label: 'Target',
        position: { x: 400, y: 120 },
        handles: [
          createFlowBaseHandle({
            id: Schema.decodeUnknownSync(HandleIdSchema)('in'),
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
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
    nodeRenderers: {
      'button-handle': (_node, content) => {
        const button = createFlowControlButton(document, {
          children: [document.createTextNode('Run action')],
          onClick: () => {
            actions += 1
            root.dataset.actionCount = String(actions)
          },
        })

        button.setAttribute('aria-label', 'Run action')
        button.dataset.flowNoDrag = ''
        button.dataset.flowNoPan = ''
        content.append(button)

        return {
          update: () => button.removeAttribute('disabled'),
          destroy: () => button.remove(),
        }
      },
    },
  }
)

root.dataset.actionCount = '0'

root.dataset.edgeCount = '0'

controller.subscribeState((change) => {
  root.dataset.edgeCount = String(change.current.document.edges.length)
})

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})
