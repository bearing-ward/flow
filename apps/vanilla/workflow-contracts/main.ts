import '@flow/vanilla/style.css'
import { createFlow } from '@flow/vanilla'

import {
  initialWorkflowDocument,
  mountWorkflowImports,
  showAcceptedWorkflow,
} from '../../shared/workflow-contracts/owner.ts'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing workflow canvas')
}

const initial = await initialWorkflowDocument()

const controller = await createFlow(root, initial, {
  documentMode: 'uncontrolled',
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 0.8 },
    limits: { minZoom: 0.1, maxZoom: 2 },
  },
})

showAcceptedWorkflow(controller.getSnapshot().document)

const stop = controller.subscribeState(({ current }) =>
  showAcceptedWorkflow(current.document)
)

mountWorkflowImports({
  replace: (document) => {
    controller.update(document)

    return Promise.resolve()
  },
  dispose: () => {
    stop()
    controller.destroy()
  },
})
