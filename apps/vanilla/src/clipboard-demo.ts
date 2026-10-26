import {
  clipboardDocument,
  mountClipboardControls,
} from '../../shared/clipboard/demo.ts'
import { createFlow } from './public.ts'

import './style.css'
import '../../shared/clipboard/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing clipboard root')
}

const controller = await createFlow(root, clipboardDocument(), {
  documentMode: 'uncontrolled',
  selectionKeyCode: 'Shift',
  multiSelectionKeyCode: 'Meta',
  autoPanOnNodeFocus: false,
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
})

mountClipboardControls({
  copy: controller.copySelection,
  paste: controller.pasteSelection,
  set: controller.setClipboardFragment,
  undo: controller.undo,
  redo: controller.redo,
  document: () => Promise.resolve(controller.getSnapshot().document),
  history: () => Promise.resolve(controller.getHistoryStatus()),
  transform: () => controller.setViewport({ x: 100, y: 50, zoom: 0.75 }),
  dispose: controller.destroyAsync,
})

window.addEventListener('pagehide', controller.destroy, { once: true })
