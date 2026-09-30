import { decodeFlowDocument } from '@flow/core'
import type {
  FlowNode,
  Viewport,
  ViewportLimits,
  ViewportOperationResult,
  ViewportBounds,
  ViewportPadding,
} from '@flow/core'
import { FlowCanvas, useFlow } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

interface ViewportHarnessApi {
  readonly read: () => {
    readonly viewport: Viewport
    readonly zoom: number
    readonly initialized: boolean
    readonly rect: { readonly left: number; readonly top: number }
  }
  readonly screenToFlow: (position: { x: number; y: number }) => {
    x: number
    y: number
  }
  readonly flowToScreen: (position: { x: number; y: number }) => {
    x: number
    y: number
  }
  readonly setViewport: (viewport: Viewport) => Promise<ViewportOperationResult>
  readonly animate: (viewport: Viewport) => Promise<ViewportOperationResult>
  readonly zoomTo: (zoom: number) => Promise<ViewportOperationResult>
  readonly fitBounds: (
    bounds: ViewportBounds,
    padding: ViewportPadding
  ) => Promise<ViewportOperationResult>
  readonly fitView: (
    nodes?: 'all' | 'selected' | readonly string[]
  ) => Promise<ViewportOperationResult>
  readonly interrupt: () => void
  readonly observations: () => readonly string[]
  readonly proposals: () => readonly Viewport[]
  readonly acknowledge: (viewport: Viewport) => Promise<void>
  readonly destroy: () => void
}

interface FitViewHarnessOptions {
  nodes?: 'all' | 'selected' | readonly string[]
  padding: ViewportPadding
}

declare global {
  interface Window {
    __flowVueViewportTest?: ViewportHarnessApi
  }
}

export const mountViewportHarness = (
  mode: 'controlled' | 'uncontrolled',
  viewportLimits: ViewportLimits
) => {
  const viewport = ref<Viewport>({ x: 10, y: 20, zoom: 1 })
  const proposals: Viewport[] = []
  const observations: string[] = []
  let actions: ReturnType<typeof useFlow> | undefined

  const Probe = defineComponent({
    // SAFETY: FlowNode is the exact runtime shape passed through FlowCanvas's `nodeComponent` prop.
    props: { node: { type: Object as PropType<FlowNode>, required: true } },
    setup(props) {
      actions = useFlow()

      return () => h('span', props.node.label)
    },
  })

  const Root = defineComponent({
    setup() {
      return () =>
        h(FlowCanvas, {
          document: Effect.runSync(
            decodeFlowDocument({
              nodes: [
                {
                  id: 'viewport-node',
                  label: 'Viewport node',
                  selected: true,
                  position: { x: 100, y: 80 },
                },
                {
                  id: 'viewport-node-far',
                  label: 'Far node',
                  position: { x: 800, y: 120 },
                },
              ],
              edges: [],
            })
          ),
          documentMode: 'uncontrolled',
          viewport: viewport.value,
          viewportMode: mode,
          viewportLimits,
          nodeComponent: Probe,
          onViewportStart: () => observations.push('start'),
          onViewportChange: () => observations.push('change'),
          onViewportEnd: (_viewport: Viewport, status: string) =>
            observations.push(`end:${status}`),
          'onUpdate:viewport': (next: Viewport) => proposals.push(next),
        })
    },
  })

  const app = createApp(Root)
  app.mount('#app')

  const getActions = () => {
    if (actions === undefined) {
      throw new Error('Vue useFlow probe is unavailable')
    }

    return actions
  }

  window.__flowVueViewportTest = {
    read: () => {
      const bounds = document
        .querySelector('.flow-vue-canvas')
        ?.getBoundingClientRect()

      const flow = getActions()

      return {
        viewport: flow.getViewport(),
        zoom: flow.getZoom(),
        initialized: flow.viewportInitialized(),
        rect: { left: bounds?.left ?? 0, top: bounds?.top ?? 0 },
      }
    },
    screenToFlow: (position) => getActions().screenToFlowPosition(position),
    flowToScreen: (position) => getActions().flowToScreenPosition(position),
    setViewport: (next) => getActions().setViewport(next),
    animate: (next) => getActions().setViewport(next, { duration: 100 }),
    zoomTo: (zoom) => getActions().zoomTo(zoom),
    fitBounds: (bounds, padding) => getActions().fitBounds(bounds, { padding }),
    fitView: async (nodes) => {
      const options: FitViewHarnessOptions = {
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
      }

      if (nodes !== undefined) {
        options.nodes = nodes
      }

      const result = await getActions().fitView(options)

      await nextTick()

      return result
    },
    interrupt: () => getActions().updateViewport({ x: 40, y: 50, zoom: 1.1 }),
    observations: () => observations,
    proposals: () => proposals,
    acknowledge: async (next) => {
      viewport.value = next
      await nextTick()
    },
    destroy: () => app.unmount(),
  }
}
