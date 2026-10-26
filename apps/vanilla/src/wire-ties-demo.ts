import './style.css'
import { flowMeasurementsFromInternalNodes } from '@flow/core'

import { mountWireTiesDemo } from '../../shared/wire-ties/demo.ts'
import { wireTiesDocument } from '../../shared/wire-ties/document.ts'
import { createFlow } from './public.ts'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing wire tie root')
}

const controller = await createFlow(root, wireTiesDocument(), {
  documentMode: 'uncontrolled',
  autoPanOnNodeFocus: false,
  selectionKeyCode: 'Shift',
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
})

await mountWireTiesDemo({
  publishRouting: controller.setEdgeRouting,
  owner: root,
  object: () => Promise.resolve(controller.toObject()),
  read: () => Promise.resolve(controller.getSnapshot()),
  geometry: () =>
    Promise.resolve({
      edgeRouting: controller.getEdgeRouting(),
      measurements: flowMeasurementsFromInternalNodes(
        controller
          .getSnapshot()
          .document.nodes.map(({ id }) => controller.getInternalNode(id))
      ),
    }),
  apply: async (transaction) => {
    await controller.applyEdit(transaction)
  },
  viewport: (viewport) => {
    void controller.setViewport(viewport)
  },
  history: () => Promise.resolve(controller.getHistoryStatus()),
  undo: controller.undo,
  redo: controller.redo,
  copy: controller.copySelection,
  paste: () => {
    void controller.pasteSelection()
  },
  dispose: controller.destroy,
})
