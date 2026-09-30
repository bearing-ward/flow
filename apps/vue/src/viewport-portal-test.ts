import { decodeFlowDocument } from '@flow/core'
import { FlowCanvas, FlowViewportPortal, useFlow } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, ref } from 'vue'

import '@flow/vue/style.css'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [],
    edges: [],
  })
)

const CanvasContents = defineComponent({
  name: 'ViewportPortalCanvasContents',
  props: { owner: { type: String, required: true } },
  setup(props) {
    const flow = useFlow()
    const mounted = ref(true)
    const events = ref({ click: 0, keydown: 0, wheel: 0 })

    return () =>
      h('section', { 'data-canvas-owner': props.owner }, [
        h(
          'button',
          {
            'data-testid': `viewport-${props.owner}`,
            onClick: () => flow.updateViewport({ x: 40, y: 50, zoom: 2 }),
          },
          'Move viewport'
        ),
        h(
          'button',
          {
            'data-testid': `toggle-${props.owner}`,
            onClick: () => (mounted.value = !mounted.value),
          },
          'Toggle portal'
        ),
        h('output', {
          'data-testid': `events-${props.owner}`,
          'data-mounted': String(mounted.value),
          'data-x': flow.viewport.value.x,
          'data-y': flow.viewport.value.y,
          'data-zoom': flow.viewport.value.zoom,
          'data-click': events.value.click,
          'data-keydown': events.value.keydown,
          'data-wheel': events.value.wheel,
        }),
        mounted.value
          ? h(FlowViewportPortal, null, {
              default: () =>
                h(
                  'div',
                  {
                    class: 'portal-fixture-content',
                    'data-testid': `portal-${props.owner}`,
                    style: {
                      position: 'absolute',
                      left: '100px',
                      top: '80px',
                      width: '40px',
                      height: '30px',
                    },
                    onClick: () => (events.value.click += 1),
                    onKeydown: () => (events.value.keydown += 1),
                    onWheel: () => (events.value.wheel += 1),
                  },
                  [
                    h('div', {
                      'data-testid': `portal-overflow-${props.owner}`,
                      style: {
                        position: 'absolute',
                        left: '39px',
                        top: '25px',
                        width: '1000px',
                        height: '4px',
                      },
                    }),
                    h(
                      'button',
                      {
                        'data-testid': `portal-button-${props.owner}`,
                        'aria-label': `Portal action ${props.owner}`,
                      },
                      'Action'
                    ),
                  ]
                ),
            })
          : null,
      ])
  },
})

export const mountVueViewportPortalFixture = (
  root: HTMLElement
): (() => void) => {
  const app = createApp(
    defineComponent({
      name: 'VueViewportPortalFixture',
      setup() {
        return () =>
          h(
            'main',
            (['first', 'second'] as const).map((owner) => {
              const props =
                owner === 'first'
                  ? {
                      key: owner,
                      defaultDocument: document,
                      noPanClassName: 'portal-no-pan',
                      noDragClassName: 'portal-no-drag',
                      noWheelClassName: 'portal-no-wheel',
                    }
                  : { key: owner, defaultDocument: document }

              return h(FlowCanvas, props, {
                default: () => h(CanvasContents, { owner }),
              })
            })
          )
      },
    })
  )

  app.mount(root)

  return () => app.unmount()
}
