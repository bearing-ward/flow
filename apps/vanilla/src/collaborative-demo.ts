import { flowFigureNodeType } from '@flow/core'

import './style.css'
import { mountCollaborativeDemo } from '../../shared/collaborative/demo.ts'
import { createFlow, flowFigureNodeRenderer } from './public.ts'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing room canvas')
}

const flow = await createFlow(
  root,
  { nodes: [], edges: [] },
  {
    documentMode: 'uncontrolled',
    nodeRenderers: { [flowFigureNodeType]: flowFigureNodeRenderer },
    autoPanOnNodeFocus: false,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
  }
)

await mountCollaborativeDemo({
  owner: root,
  read: () => Promise.resolve(flow.getSnapshot()),
  live: () =>
    Promise.resolve({ ...flow.getSnapshot().document, nodes: flow.getNodes() }),
  replace: (document, context) => {
    flow.update(document, context)

    return Promise.resolve()
  },
  subscribe: flow.subscribeState,
  apply: async (transaction) => {
    await flow.applyEdit(transaction)
  },
  screenToFlow: (position) =>
    Promise.resolve(flow.screenToFlowPosition(position)),
  copy: flow.copySelection,
  paste: async (options) => {
    await flow.pasteSelection(options)
  },
  dispose: flow.destroy,
})
