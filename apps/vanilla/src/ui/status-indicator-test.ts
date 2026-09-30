import {
  createFlowStatusIndicator,
  mountFlow,
  updateFlowStatusIndicator,
} from '@flow/vanilla'
import type { FlowNodeStatus, FlowNodeRenderer } from '@flow/vanilla'

import '../style.css'

const canvas = document.querySelector<HTMLElement>('#canvas')

const controls = document.querySelector<HTMLElement>(
  '.flow-status-recipe-controls'
)

if (canvas === null || controls === null) {
  throw new Error('Missing Status Indicator fixture root')
}

const renderer: FlowNodeRenderer = (node, content) => {
  const shell = document.createElement('section')
  shell.className = 'flow-status-recipe-node'
  const title = document.createElement('h2')
  title.textContent = node.label
  const dataStatus = node.data?.status

  const status: FlowNodeStatus =
    dataStatus === 'ready' || dataStatus === 'error' ? dataStatus : 'waiting'

  const indicator = createFlowStatusIndicator(document, { status })
  shell.append(title, indicator)
  content.append(shell)

  return {
    update: (next) => {
      title.textContent = next.label
      const nextStatus = next.data?.status

      const validStatus: FlowNodeStatus =
        nextStatus === 'ready' || nextStatus === 'error'
          ? nextStatus
          : 'waiting'

      updateFlowStatusIndicator(indicator, validStatus)
    },
    destroy: () => shell.remove(),
  }
}

const controller = mountFlow(
  canvas,
  {
    nodes: [
      {
        id: 'status-node',
        label: 'Import records',
        type: 'status-recipe',
        position: { x: 220, y: 180 },
        data: { status: 'waiting' },
      },
    ],
    edges: [],
  },
  {
    documentMode: 'uncontrolled',
    nodeRenderers: { 'status-recipe': renderer },
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
  }
)

controls.addEventListener('click', (event) => {
  const { target } = event

  if (!(target instanceof Element)) {
    return
  }

  const button = target.closest<HTMLButtonElement>('[data-status-update]')

  if (button === null) {
    return
  }

  const status = button.dataset.statusUpdate

  if (status === 'reset') {
    controller.update({
      nodes: [
        {
          id: 'status-node',
          label: 'Import records',
          type: 'status-recipe',
          position: { x: 220, y: 180 },
          data: { status: 'waiting' },
        },
      ],
      edges: [],
    })
  } else if (status === 'waiting' || status === 'ready' || status === 'error') {
    void controller.updateNodeData('status-node', { status })
  }
})

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})
