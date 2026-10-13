import { decodeFlowDocument } from '@flow/core'
import type {
  FlowEdge,
  FlowEditResult,
  Viewport,
  ViewportOperationResult,
} from '@flow/core'
import { FlowCanvas, FlowEdgeToolbar, useFlow } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h } from 'vue'

import '@flow/vue/style.css'

interface EdgeToolbarFixtureApi {
  readonly setViewport: (viewport: Viewport) => Promise<ViewportOperationResult>
  readonly selectEdges: (ids: readonly string[]) => Promise<FlowEditResult>
  readonly updateEdge: (
    id: string,
    patch: Partial<FlowEdge>
  ) => Promise<FlowEditResult>
  readonly removeEdge: (id: string) => Promise<FlowEditResult>
  readonly clicks: () => number
}

declare global {
  interface Window {
    __flowVueEdgeToolbar?: EdgeToolbarFixtureApi
    __flowVueEdgeToolbarClicks?: number
  }
}

const initialDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 60, y: 80 },
          size: { width: 120, height: 60 },
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 420, y: 220 },
          size: { width: 120, height: 60 },
        },
      ],
      edges: [
        { id: 'selected-edge', source: 'a', target: 'b', selected: true },
        { id: 'forced-edge', source: 'b', target: 'a', zIndex: 4 },
      ],
    })
  )

/** Flow-space points the fixture anchors toolbars to, as a path label point would. */
export const edgeToolbarFixturePoints = {
  selected: { x: 300, y: 180 },
  forced: { x: 200, y: 260 },
} as const

export const mountVueEdgeToolbarFixture = (root: HTMLElement): (() => void) => {
  let actions: ReturnType<typeof useFlow> | undefined

  const Probe = defineComponent({
    setup() {
      actions = useFlow()

      return () => null
    },
  })

  const Root = defineComponent({
    setup() {
      return () =>
        h('main', [
          h(
            FlowCanvas,
            {
              document: initialDocument(),
              style: { width: '720px', height: '420px' },
            },
            {
              default: () => [
                h(
                  FlowEdgeToolbar,
                  {
                    edgeId: 'selected-edge',
                    ...edgeToolbarFixturePoints.selected,
                    'data-testid': 'edge-toolbar-default',
                  },
                  {
                    default: () =>
                      h(
                        'button',
                        {
                          type: 'button',
                          'data-testid': 'edge-toolbar-action',
                          onClick: () => {
                            window.__flowVueEdgeToolbarClicks =
                              (window.__flowVueEdgeToolbarClicks ?? 0) + 1
                          },
                        },
                        'Delete'
                      ),
                  }
                ),
                h(
                  FlowEdgeToolbar,
                  {
                    edgeId: 'forced-edge',
                    ...edgeToolbarFixturePoints.forced,
                    isVisible: true,
                    alignX: 'right',
                    alignY: 'bottom',
                    'data-testid': 'edge-toolbar-forced',
                  },
                  {
                    default: () =>
                      h(
                        'span',
                        { style: { display: 'block', width: '80px' } },
                        'Forced'
                      ),
                  }
                ),
                h(Probe),
              ],
            }
          ),
          h(
            FlowCanvas,
            {
              document: initialDocument(),
              style: { width: '420px', height: '280px' },
            },
            {
              default: () =>
                h(
                  FlowEdgeToolbar,
                  {
                    edgeId: 'selected-edge',
                    ...edgeToolbarFixturePoints.selected,
                    'data-testid': 'edge-toolbar-isolated',
                  },
                  { default: () => h('span', 'Isolated') }
                ),
            }
          ),
        ])
    },
  })

  const app = createApp(Root)
  app.mount(root)

  const getActions = () => {
    if (actions === undefined) {
      throw new Error('Vue edge toolbar fixture actions are unavailable')
    }

    return actions
  }

  window.__flowVueEdgeToolbarClicks = 0
  window.__flowVueEdgeToolbar = {
    setViewport: (viewport) => getActions().setViewport(viewport),
    selectEdges: (ids) =>
      getActions().setEdges((edges) =>
        edges.map((edge) => ({ ...edge, selected: ids.includes(edge.id) }))
      ),
    updateEdge: (id, patch) => getActions().updateEdge(id, patch),
    removeEdge: (id) =>
      getActions().setEdges((edges) => edges.filter((edge) => edge.id !== id)),
    clicks: () => window.__flowVueEdgeToolbarClicks ?? 0,
  }

  return () => {
    app.unmount()
    delete window.__flowVueEdgeToolbar
  }
}
