import { flowFigureNodeType } from '@flow/core'

import {
  rotationDocument,
  mountRotationControls,
} from '../../shared/rotatable-node/demo.ts'
import { createFlow, flowFigureNodeRenderer } from './public.ts'

import './style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing rotation root')
}

const controller = await createFlow(root, rotationDocument(), {
  documentMode: 'uncontrolled',
  nodeRenderers: { [flowFigureNodeType]: flowFigureNodeRenderer },
  autoPanOnNodeFocus: false,
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
})

const controls = mountRotationControls({
  refresh: async (id) => {
    await controller.updateNodeInternals(id)
  },
  document: () => Promise.resolve(controller.getSnapshot().document),
  history: () => Promise.resolve(controller.getHistoryStatus()),
  edit: async (transaction) => {
    await controller.applyEdit(transaction)
  },
  undo: controller.undo,
  redo: controller.redo,
  copy: controller.copySelection,
  paste: controller.pasteSelection,
  viewport: controller.setViewport,
  dispose: controller.destroy,
})

window.addEventListener(
  'pagehide',
  () => {
    controls.dispose()
    controller.destroy()
  },
  { once: true }
)
