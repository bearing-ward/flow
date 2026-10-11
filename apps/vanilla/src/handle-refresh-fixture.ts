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

  const refreshReference = controller.updateNodeInternals

  window.__handleRefresh = {
    refresh: controller.updateNodeInternals,
    internal: (id) => Promise.resolve(controller.getInternalNode(id) ?? null),
    snapshot: () => Promise.resolve(controller.getSnapshot()),
    preview: () => Promise.resolve(controller.getConnectionPreview()),
    saved: () => Promise.resolve(controller.getVersionedSavedSession()),
    replace: (document) => {
      controller.update(document)

      return Promise.resolve()
    },
    refreshIdentity: () => refreshReference === controller.updateNodeInternals,
    rejectInvalidHandleId: async (variant) => {
      const candidate = structuredClone(controller.getSnapshot().document)

      const handle = candidate.nodes.find(({ id }) => id === 'members')
        ?.handles?.[0]

      if (handle === undefined) {
        throw new Error('Missing invalid-ID candidate')
      }

      if (variant === 'missing') {
        Reflect.deleteProperty(handle, 'id')
      } else {
        Reflect.set(handle, 'id', variant === 'null' ? null : '')
      }

      try {
        await controller.setNodes(candidate.nodes)

        return false
      } catch {
        return true
      }
    },
    dispose: controller.destroy,
  }
}
