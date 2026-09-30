import { handleRefreshDocument } from '../../shared-e2e/handle-refresh-fixture.ts'
import { createFlow } from './public.ts'

export const startHandleRefresh = async (
  zoom: number,
  controlled: boolean
): Promise<void> => {
  window.dispatchEvent(new Event('beforeunload'))
  const root = document.querySelector<HTMLElement>('#app')

  if (root === null) {
    throw new Error('Missing Vanilla fixture owner')
  }

  root.style.width = '1000px'
  root.style.height = '650px'

  const controller = await createFlow(root, handleRefreshDocument, {
    documentMode: controlled ? 'controlled' : 'uncontrolled',
    viewport: {
      mode: controlled ? 'controlled' : 'uncontrolled',
      initial: { x: 10, y: 20, zoom },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
  })

  window.__handleRefresh = {
    refresh: controller.updateNodeInternals,
    internal: (id) => Promise.resolve(controller.getInternalNode(id) ?? null),
    snapshot: () => Promise.resolve(controller.getSnapshot()),
    preview: () => Promise.resolve(controller.getConnectionPreview()),
    saved: () => Promise.resolve(controller.getSavedSession()),
    replace: (document) => {
      controller.update(document)

      return Promise.resolve()
    },
    dispose: controller.destroy,
  }
}
