import { decodeFlowDocument } from '@flow/core'
import { FlowCanvas, useFlow } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h } from 'vue'

import { liveInternalDocument } from '../../shared-e2e/live-internal-document.ts'

import '@flow/vue/style.css'

export const mountLiveInternalFixture = (root: HTMLElement): void => {
  const Probe = defineComponent({
    setup() {
      const flow = useFlow()
      window.__flowLiveInternal = {
        internal: flow.getInternalNode,
        node: flow.getNode,
        nodes: flow.getNodes,
      }

      return () => null
    },
  })

  createApp(
    defineComponent({
      setup: () => () =>
        h(
          FlowCanvas,
          {
            defaultDocument: Effect.runSync(
              decodeFlowDocument(liveInternalDocument)
            ),
            nodesResizable: true,
            autoPanOnNodeDrag: false,
            style: { width: '900px', height: '600px' },
          },
          { default: () => h(Probe) }
        ),
    })
  ).mount(root)
}
