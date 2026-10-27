import '@flow/vanilla/style.css'
import { createFlow } from '@flow/vanilla'
import type { FlowNodeRenderer } from '@flow/vanilla'

import {
  mountWorkflowControls,
  workflowDocument,
  workflowCaption,
} from '../../shared/workflow/demo.ts'

import '../../shared/workflow/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing workflow root')
}

const renderer: FlowNodeRenderer = (node, content) => {
  const card = document.createElement('div')
  card.className = 'workflow-card'
  content.append(card)

  const update = (current: typeof node) => {
    card.textContent = workflowCaption(current)
  }

  update(node)

  return { update, destroy: () => card.remove() }
}

const controller = await createFlow(root, workflowDocument(), {
  documentMode: 'uncontrolled',
  nodeRenderers: { workflow: renderer },
  autoPanOnNodeFocus: false,
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.1, maxZoom: 2 },
  },
})

const stops = new Set<() => void>()

const controls = mountWorkflowControls({
  document: () => Promise.resolve(controller.getSnapshot().document),
  edit: async (transaction) => {
    await controller.applyEdit(transaction)
  },
  flowToScreen: (point) =>
    Promise.resolve(controller.flowToScreenPosition(point)),
  screenToFlow: (point) =>
    Promise.resolve(controller.screenToFlowPosition(point)),
  viewport: async (value) => {
    await controller.setViewport(value)
  },
  undo: controller.undo,
  redo: controller.redo,
  dispose: () => {
    for (const stop of stops) {
      stop()
    }

    controller.destroy()
  },
})

stops.add(
  controller.subscribeState(() => {
    void controls.refresh()
  })
)
