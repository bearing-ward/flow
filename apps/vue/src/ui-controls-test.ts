import { decodeFlowDocument } from '@flow/core'
import type {
  FlowEditResult,
  FlowEditTransactionInput,
  FlowNode,
  Viewport,
  ViewportOperationResult,
} from '@flow/core'
import {
  FlowCanvas,
  FlowControls,
  FlowDevTools,
  FlowNodeSearch,
  FlowZoomSelect,
  FlowZoomSlider,
  useFlow,
} from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h } from 'vue'

import '@flow/vue/style.css'

export interface VueUiControlsFixture {
  readonly viewport: () => Viewport
  readonly setViewport: (viewport: Viewport) => Promise<ViewportOperationResult>
  readonly nodes: () => readonly FlowNode[]
  readonly edgeCount: () => number
  readonly applyEdit: (
    transaction: FlowEditTransactionInput
  ) => Promise<FlowEditResult>
  readonly interactiveCalls: () => readonly boolean[]
  readonly unmount: () => void
}

declare global {
  interface Window {
    __flowVueUiControls?: VueUiControlsFixture
  }
}

const initialDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'Alpha',
          position: { x: 80, y: 120 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'b',
          label: 'Beta',
          position: { x: 400, y: 260 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        { id: 'c', label: 'Gamma', position: { x: 1100, y: 700 } },
      ],
      edges: [],
    })
  )

export const mountVueUiControlsFixture = (root: HTMLElement): void => {
  let actions: ReturnType<typeof useFlow> | undefined
  const interactiveCalls: boolean[] = []

  const Probe = defineComponent({
    setup() {
      actions = useFlow()

      return () => null
    },
  })

  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h(
            FlowCanvas,
            {
              defaultDocument: initialDocument(),
              viewportLimits: { minZoom: 0.5, maxZoom: 2 },
              style: { width: '720px', height: '420px' },
            },
            {
              default: () => [
                h(FlowControls, {
                  position: 'bottom-left',
                  onInteractiveChange: (interactive: boolean) =>
                    interactiveCalls.push(interactive),
                }),
                h(FlowZoomSlider, { position: 'bottom-right' }),
                h(FlowZoomSelect, { position: 'top-center' }),
                h(FlowNodeSearch, { position: 'top-left' }),
                h(FlowDevTools, { position: 'top-right' }),
                h(Probe),
              ],
            }
          )
      },
    })
  )

  app.mount(root)

  const flow = () => {
    if (actions === undefined) {
      throw new Error('Vue UI controls fixture actions are unavailable')
    }

    return actions
  }

  window.__flowVueUiControls = {
    viewport: () => flow().getViewport(),
    setViewport: (viewport) => flow().setViewport(viewport),
    // SAFETY: the fixture only reads node snapshots; Vue's readonly view has the same shape.
    nodes: () => flow().nodes.value as readonly FlowNode[],
    edgeCount: () => flow().edges.value.length,
    applyEdit: (transaction) => flow().applyEdit(transaction),
    interactiveCalls: () => interactiveCalls,
    unmount: () => app.unmount(),
  }
}
