import {
  decodeVersionedFlowDocument,
  encodeVersionedFlowDocument,
} from '@flow/core'
import { Effect } from 'effect'

import {
  editableEdgesDocument,
  mountEditableEdgesControls,
} from '../../shared/editable-edges/demo.ts'
import type { EditableEdgesDemo } from '../../shared/editable-edges/demo.ts'
import { createFlow } from './public.ts'

import './style.css'
import '../../shared/editable-edges/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing editable edges root')
}

const controller = await createFlow(root, editableEdgesDocument(), {
  documentMode: 'uncontrolled',
  editableEdges: true,
  connectionMode: new URLSearchParams(location.search).has('loose')
    ? 'loose'
    : 'strict',
  selectionKeyCode: 'Shift',
  autoPanOnNodeFocus: false,
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
})

let saved: ReturnType<typeof encodeVersionedFlowDocument> | undefined

const demo: EditableEdgesDemo = {
  document: () => Promise.resolve(controller.getSnapshot().document),
  history: () => Promise.resolve(controller.getHistoryStatus()),
  undo: controller.undo,
  redo: controller.redo,
  transform: () => {
    void controller.setViewport({ x: 100, y: 50, zoom: 0.75 })
  },
  save: () => {
    saved = encodeVersionedFlowDocument(controller.getSnapshot().document)

    return Promise.resolve()
  },
  load: async () => {
    if (saved !== undefined) {
      const document = Effect.runSync(decodeVersionedFlowDocument(saved))
      await controller.applyEdit({
        operations: [
          { kind: 'set-nodes', nodes: document.nodes },
          { kind: 'set-edges', edges: document.edges },
        ],
      })
    }
  },
  copy: controller.copySelection,
  paste: () => {
    void controller.pasteSelection()
  },
  moveEndpoint: () => {
    void controller.updateNode('a', { position: { x: 110, y: 130 } })
  },
  reconnect: () => {
    const target = controller.getNode('c')
    const handle = target?.handles?.find(({ id }) => id === 'in')

    if (target !== undefined && handle !== undefined) {
      void controller.updateEdge('ab', {
        target: target.id,
        targetHandle: handle.id,
      })
    }
  },
  dispose: controller.destroy,
}

mountEditableEdgesControls(demo)

window.addEventListener('pagehide', controller.destroy, { once: true })
