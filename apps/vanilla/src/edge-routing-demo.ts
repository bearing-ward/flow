import {
  edgeRoutingDocument,
  mountEdgeRoutingDemo,
} from '../../shared/edge-routing/demo.ts'
import { createFlow } from './public.ts'

import './style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing routing root')
}

const controller = await createFlow(root, edgeRoutingDocument(), {
  documentMode: 'uncontrolled',
  editableEdges: true,
  autoPanOnNodeFocus: false,
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
})

mountEdgeRoutingDemo({
  read: () => Promise.resolve(controller.getSnapshot().document),
  internals: () =>
    Promise.resolve(
      controller.getSnapshot().document.nodes.flatMap(({ id }) => {
        const internal = controller.getInternalNode(id)

        return internal === undefined ? [] : [internal]
      })
    ),
  publish: controller.setEdgeRouting,
  apply: async (document) => {
    await controller.applyEdit({
      operations: [
        { kind: 'set-nodes', nodes: document.nodes },
        { kind: 'set-edges', edges: document.edges },
      ],
    })
  },
  viewport: (viewport) => {
    void controller.setViewport(viewport)
  },
  dispose: controller.destroy,
})
