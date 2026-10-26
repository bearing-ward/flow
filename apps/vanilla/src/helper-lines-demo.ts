import {
  helperLinesDocument,
  mountHelperControls,
} from '../../shared/helper-lines/demo.ts'
import { createFlow } from './public.ts'

import './style.css'
import '../../shared/helper-lines/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing clipboard root')
}

const controller = await createFlow(root, helperLinesDocument(), {
  helperLines: true,
  selectNodesOnDrag: true,
  snapToGrid: new URLSearchParams(location.search).has('grid'),
  snapGrid: { x: 50, y: 50 },
  nodeDragThreshold: 0,
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

mountHelperControls({
  copy: controller.copySelection,
  paste: controller.pasteSelection,
  undo: controller.undo,
  redo: controller.redo,
  document: () => Promise.resolve(controller.getSnapshot().document),
  history: () => Promise.resolve(controller.getHistoryStatus()),
  transform: () => controller.setViewport({ x: 100, y: 50, zoom: 0.75 }),
  dispose: controller.destroyAsync,
})

window.addEventListener('pagehide', controller.destroy, { once: true })
