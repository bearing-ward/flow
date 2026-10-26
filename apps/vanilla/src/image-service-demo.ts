import { flowFigureNodeType } from '@flow/core'

import { installImageHost } from '../../shared/image-service/bridge.ts'
import {
  createFlow,
  createVanillaImageExportRequest,
  flowFigureNodeRenderer,
} from './public.ts'

import './style.css'

await installImageHost('vanilla', async (root, prepared) => {
  const controller = await createFlow(root, prepared.document, {
    documentMode: 'uncontrolled',
    autoPanOnNodeFocus: false,
    viewport: {
      mode: 'uncontrolled',
      initial: prepared.viewport,
      limits: { minZoom: 0.01, maxZoom: 10 },
    },
    nodeRenderers: {
      [flowFigureNodeType]: flowFigureNodeRenderer,
      'export-card': (node, content) => {
        const update = (next: typeof node): void => {
          const card = document.createElement('div')
          card.className = 'export-card'
          const image = document.createElement('img')
          image.src = '/image-service/assets/flow-mark.svg'
          image.alt = ''
          const text = document.createElement('div')
          const label = document.createElement('strong')
          label.textContent = next.label
          const detail = document.createElement('small')
          detail.textContent = String(next.data?.detail ?? '')
          text.append(label, detail)
          card.append(image, text)
          content.replaceChildren(card)
        }

        update(node)

        return { update, destroy: () => content.replaceChildren() }
      },
    },
  })

  controller.setEdgeRouting(prepared.request.scene.edgeRouting ?? undefined)

  return {
    exportRequest: (options) =>
      Promise.resolve(createVanillaImageExportRequest(controller, options)),
    routing: (result) => controller.setEdgeRouting(result ?? undefined),
    subscribe: (listener) =>
      controller.subscribeState(() =>
        listener(controller.getSnapshot().document)
      ),
    document: () => Promise.resolve(controller.getSnapshot().document),
    internals: () =>
      Promise.resolve(
        controller
          .getSnapshot()
          .document.nodes.map(({ id }) => controller.getInternalNode(id))
      ),
    refresh: async () => {
      await controller.updateNodeInternals(
        prepared.document.nodes.map(({ id }) => id)
      )
    },
    edit: async (transaction) => {
      await controller.applyEdit(transaction)
    },
    history: () => Promise.resolve(controller.getHistoryStatus()),
    undo: controller.undo,
    redo: controller.redo,
    dispose: controller.destroy,
  }
})
