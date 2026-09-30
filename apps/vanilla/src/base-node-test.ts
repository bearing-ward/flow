import { createFlowBaseNode } from './base-node.ts'
import type { FlowNodeRenderer } from './mount-flow.ts'
import { mountFlow } from './mount-flow.ts'

import './style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Base Node fixture root')
}

const renderer: FlowNodeRenderer = (node, content) => {
  const action = document.createElement('button')
  action.type = 'button'
  action.dataset.flowNoDrag = ''
  action.textContent = 'Open details'
  action.addEventListener('click', () => {
    action.dataset.activated = 'true'
  })

  const shell = createFlowBaseNode(document, {
    title: node.label,
    content: action,
  })

  content.append(shell)

  return {
    update: (next) => {
      shell.setAttribute('aria-label', next.label)
      const title = shell.querySelector('.flow-base-node-title')

      if (title !== null) {
        title.textContent = next.label
      }
    },
    destroy: () => shell.remove(),
  }
}

const controller = mountFlow(
  root,
  {
    nodes: [
      {
        id: 'base-node',
        label: 'Review task',
        type: 'base-node',
        position: { x: 80, y: 80 },
        handles: [{ id: 'output', kind: 'source', side: 'right' }],
      },
    ],
    edges: [],
  },
  {
    documentMode: 'uncontrolled',
    nodeRenderers: { 'base-node': renderer },
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
  }
)

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})
