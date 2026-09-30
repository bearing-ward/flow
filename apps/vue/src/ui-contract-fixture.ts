import { decodeFlowDocument } from '@flow/core'
import {
  FlowBackground,
  FlowCanvas,
  FlowControlButton,
  FlowControls,
  useFlow,
} from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, ref } from 'vue'

import '@flow/vue/style.css'

export const mountVueUiFixture = (root: HTMLElement): (() => void) => {
  const document = Effect.runSync(
    decodeFlowDocument({
      nodes: [{ id: 'ui-node', label: 'UI node', position: { x: 80, y: 60 } }],
      edges: [],
    })
  )

  const app = createApp(
    defineComponent({
      name: 'VueUiContractFixture',
      setup() {
        const zoomInCount = ref(0)
        const zoomOutCount = ref(0)
        const fitCount = ref(0)

        const Probe = defineComponent({
          name: 'VueUiViewportProbe',
          setup() {
            const flow = useFlow()

            return () =>
              h('output', {
                id: 'ui-viewport',
                'data-zoom': flow.viewport.value.zoom,
              })
          },
        })

        return () =>
          h(
            FlowCanvas,
            { defaultDocument: document },
            {
              default: () => [
                ...(['dots', 'lines', 'cross'] as const).map((variant) =>
                  h(FlowBackground, {
                    variant,
                    id: `fixture-${variant}`,
                    gap: [18, 24],
                    offset: [3, 5],
                    size: 2,
                    color: '#334155',
                    bgColor: '#f8fafc',
                    lineWidth: 2,
                    patternClassName: 'fixture-pattern',
                  })
                ),
                h(FlowControls, {
                  position: 'bottom-center',
                  orientation: 'horizontal',
                  onZoomIn: () => (zoomInCount.value += 1),
                  onZoomOut: () => (zoomOutCount.value += 1),
                  onFitView: () => (fitCount.value += 1),
                }),
                h(
                  FlowControlButton,
                  { disabled: true, 'aria-label': 'Custom disabled action' },
                  { default: () => 'Custom' }
                ),
                h(Probe),
                h(
                  'output',
                  { id: 'ui-callbacks' },
                  `${zoomInCount.value},${zoomOutCount.value},${fitCount.value}`
                ),
              ],
            }
          )
      },
    })
  )

  app.mount(root)

  root.addEventListener('flow-ui-fixture-destroy', () => app.unmount(), {
    once: true,
  })

  return () => app.unmount()
}
