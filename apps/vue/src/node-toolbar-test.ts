import { decodeFlowDocument } from '@flow/core'
import type {
  FlowEditResult,
  FlowNode,
  Viewport,
  ViewportOperationResult,
} from '@flow/core'
import { FlowCanvas, FlowNodeToolbar, useFlow } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, ref } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

interface ToolbarFixtureApi {
  readonly setViewport: (viewport: Viewport) => Promise<ViewportOperationResult>
  readonly getViewport: () => Viewport
  readonly clicks: () => number
  readonly internalNode: (
    id: string
  ) => ReturnType<ReturnType<typeof useFlow>['getInternalNode']>
  readonly resizeNodeDom: (id: string, width: number, height: number) => boolean
  readonly updateNode: (
    id: string,
    patch: Partial<FlowNode>
  ) => Promise<FlowEditResult>
  readonly select: (ids: readonly string[]) => Promise<FlowEditResult>
  readonly hide: (id: string) => Promise<FlowEditResult>
  readonly remove: (id: string) => Promise<FlowEditResult>
  readonly showToolbar: (show: boolean) => void
  readonly unmount: () => void
}

declare global {
  interface Window {
    __flowVueNodeToolbar?: ToolbarFixtureApi
    __flowVueNodeToolbarClicks?: number
  }
}

const initialDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'toolbar-a',
          label: 'A',
          selected: true,
          position: { x: 120, y: 100 },
          size: { width: 160, height: 80 },
        },
        {
          id: 'toolbar-b',
          label: 'B',
          position: { x: 400, y: 180 },
          size: { width: 120, height: 60 },
        },
      ],
      edges: [],
    })
  )

const NodeView = defineComponent({
  // SAFETY: FlowCanvas supplies an accepted FlowNode to its node renderer.
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () =>
      h(
        'div',
        {
          class: 'toolbar-fixture-node',
          'data-toolbar-fixture-node': props.node.id,
          style: {
            width: `${props.node.size?.width ?? 120}px`,
            height: `${props.node.size?.height ?? 60}px`,
          },
        },
        props.node.label
      )
  },
})

export const mountVueNodeToolbarFixture = (root: HTMLElement): (() => void) => {
  const showToolbar = ref(true)
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
              nodeComponent: NodeView,
              style: { width: '720px', height: '420px' },
            },
            {
              default: () => [
                showToolbar.value
                  ? h(
                      FlowNodeToolbar,
                      { nodeId: 'toolbar-a', 'data-testid': 'toolbar-default' },
                      {
                        default: () =>
                          h(
                            'button',
                            {
                              type: 'button',
                              'data-testid': 'toolbar-action',
                              onClick: () => {
                                window.__flowVueNodeToolbarClicks =
                                  (window.__flowVueNodeToolbarClicks ?? 0) + 1
                              },
                            },
                            'Action'
                          ),
                      }
                    )
                  : null,
                h(
                  FlowNodeToolbar,
                  {
                    nodeId: 'toolbar-b',
                    isVisible: true,
                    position: 'right',
                    align: 'end',
                    offset: 12,
                    'data-testid': 'toolbar-forced',
                  },
                  { default: () => h('span', 'Forced') }
                ),
                h(Probe),
              ],
            }
          ),
          h(
            FlowCanvas,
            {
              document: Effect.runSync(
                decodeFlowDocument({
                  nodes: [
                    {
                      id: 'isolated',
                      label: 'Isolated',
                      selected: true,
                      position: { x: 80, y: 120 },
                    },
                  ],
                  edges: [],
                })
              ),
              nodeComponent: NodeView,
              style: { width: '420px', height: '280px' },
            },
            {
              default: () =>
                h(
                  FlowNodeToolbar,
                  { nodeId: 'isolated', 'data-testid': 'toolbar-isolated' },
                  { default: () => h('span', 'Isolated toolbar') }
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
      throw new Error('Vue node toolbar fixture actions are unavailable')
    }

    return actions
  }

  window.__flowVueNodeToolbarClicks = 0
  window.__flowVueNodeToolbar = {
    setViewport: (viewport) => getActions().setViewport(viewport),
    getViewport: () => getActions().getViewport(),
    clicks: () => window.__flowVueNodeToolbarClicks ?? 0,
    internalNode: (id) => getActions().getInternalNode(id),
    resizeNodeDom: (id, width, height) => {
      const node = document.querySelector<HTMLElement>(
        `.flow-vue-node[data-node-id="${id}"]`
      )

      if (node === null) {
        return false
      }

      node.style.minWidth = `${width}px`
      node.style.minHeight = `${height}px`

      return true
    },
    updateNode: (id, patch) => getActions().updateNode(id, patch),
    select: (ids) =>
      getActions().setNodes((nodes) =>
        nodes.map((node) => ({ ...node, selected: ids.includes(node.id) }))
      ),
    hide: (id) => getActions().updateNode(id, { hidden: true }),
    remove: (id) =>
      getActions().setNodes((nodes) => nodes.filter((node) => node.id !== id)),
    showToolbar: (show) => {
      showToolbar.value = show
    },
    unmount: () => app.unmount(),
  }

  return () => {
    app.unmount()
    delete window.__flowVueNodeToolbar
  }
}
