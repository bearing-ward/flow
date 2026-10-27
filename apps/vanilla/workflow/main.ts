import '@flow/vanilla/style.css'
import { createFlow } from '@flow/vanilla'
import type { FlowNodeRenderer } from '@flow/vanilla'

import {
  mountWorkflowControls,
  workflowDocument,
  workflowCaption,
} from '../../shared/workflow/demo.ts'
import {
  workflowValidationSnapshot,
  workflowDocumentChanged,
  workflowCanvasConnection,
} from '../../shared/workflow/validation.ts'

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
  defaultEdgeOptions: { data: { workflow: { version: 1, kind: 'data' } } },
  isValidConnection: (candidate) =>
    workflowCanvasConnection(controller.getSnapshot().document, candidate),
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.1, maxZoom: 2 },
  },
})

const stops = new Set<() => void>()

let model = workflowValidationSnapshot(controller.getSnapshot().document, 0)

const controls = mountWorkflowControls({
  snapshot: () => Promise.resolve(model),
  replace: (document) => {
    controller.update(document)

    return Promise.resolve()
  },
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
  controller.subscribeState((change) => {
    model = workflowValidationSnapshot(
      change.current.document,
      model.revision +
        (workflowDocumentChanged(
          change.previous.document,
          change.current.document
        )
          ? 1
          : 0)
    )
    void controls.refresh()
  })
)
