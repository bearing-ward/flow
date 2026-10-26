import { flowFigureNodeType } from '@flow/core'

import {
  mountFiguresControls,
  figuresDocument,
} from '../../shared/shapes/demo.ts'
import {
  createFlow,
  createFlowMiniMap,
  createFlowFigureMiniMapNode,
  flowFigureNodeRenderer,
} from './public.ts'

import './style.css'
import '../../shared/shapes/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing shapes root')
}

const controller = await createFlow(root, figuresDocument(), {
  documentMode: 'uncontrolled',
  nodeRenderers: { [flowFigureNodeType]: flowFigureNodeRenderer },
  nodesResizable: true,
  autoPanOnNodeFocus: false,
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
})

const miniMap = createFlowMiniMap(controller, {
  nodeComponent: (props) =>
    createFlowFigureMiniMapNode(props, controller.getNode(props.id)),
})

const stops = new Set<() => void>()

const controls = mountFiguresControls({
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
  dispose: () => {
    for (const release of stops) {
      release()
    }

    miniMap.destroy()
    controller.destroy()
  },
})

stops.add(
  controller.subscribeState(() =>
    controls.refresh(controller.getSnapshot().document)
  )
)

window.addEventListener(
  'pagehide',
  () => {
    controls.dispose()

    for (const release of stops) {
      release()
    }

    miniMap.destroy()
    controller.destroy()
  },
  { once: true }
)
