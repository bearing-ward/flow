import { getFlowLayoutInput } from '@flow/core'

import {
  animationDocument,
  mountNodeAnimationControls,
} from '../../shared/node-animation/demo.ts'
import { createFlow } from './public.ts'

import './style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing animation root')
}

const controller = await createFlow(root, animationDocument(), {
  documentMode: 'uncontrolled',
  autoPanOnNodeFocus: false,
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
})

const controls = mountNodeAnimationControls({
  read: () => {
    const { document } = controller.getSnapshot()

    return Promise.resolve({
      document,
      input: getFlowLayoutInput(document, controller.getInternalNode),
    })
  },
  animate: controller.animateNodePositions,
  edit: async (transaction) => {
    await controller.applyEdit(transaction)
  },
  history: () => Promise.resolve(controller.getHistoryStatus()),
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
