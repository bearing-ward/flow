import '@flow/vue/style.css'
import './style.css'
import { decodeFlowDocument } from '@flow/core'
import { FlowCanvas, useFlow } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'

import { handleRefreshDocument } from '../../shared-e2e/handle-refresh-fixture.ts'

export const startHandleRefresh = async (
  zoom: number,
  controlled: boolean
): Promise<void> => {
  const owner = document.querySelector<HTMLElement>('#app')

  if (owner === null) {
    throw new Error('Missing Vue fixture owner')
  }

  owner.style.width = '1000px'
  owner.style.height = '650px'

  const documentState = ref(
    Effect.runSync(decodeFlowDocument(handleRefreshDocument))
  )

  interface OwnerState {
    app: ReturnType<typeof createApp> | undefined
  }

  const ownerState: OwnerState = {
    app: undefined,
  }

  const probe = defineComponent({
    setup() {
      const flow = useFlow()
      window.__handleRefresh = {
        refresh: flow.updateNodeInternals,
        internal: (id) => Promise.resolve(flow.getInternalNode(id) ?? null),
        snapshot: () => Promise.resolve(flow.getSnapshot()),
        preview: () => Promise.resolve(flow.connectionPreview.value),
        saved: () => Promise.resolve(flow.getSavedSession()),
        replace: async (input) => {
          documentState.value = Effect.runSync(decodeFlowDocument(input))
          await nextTick()
          await nextTick()
        },
        dispose: () => ownerState.app?.unmount(),
      }

      return () => null
    },
  })

  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          FlowCanvas,
          {
            document: documentState.value,
            documentMode: controlled ? 'controlled' : 'uncontrolled',
            viewport: { x: 10, y: 20, zoom },
            viewportMode: controlled ? 'controlled' : 'uncontrolled',
            viewportLimits: { minZoom: 0.25, maxZoom: 4 },
            autoPanOnConnect: false,
          },
          { default: () => h(probe) }
        ),
    })
  )

  ownerState.app = app
  app.mount(owner)
  await nextTick()
}
