import {
  createFlowGraph,
  decodeFlowDocument,
  selectFlowMiniMapProjection,
} from '@flow/core'
import type { FlowInternalNode, Viewport } from '@flow/core'
import { FlowCanvas, FlowMiniMap, useFlow } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h } from 'vue'

import '@flow/vue/style.css'
import './style.css'

declare global {
  interface Window {
    __flowMiniMapViewport?: () => Viewport
    __flowMiniMapPaneEvents?: () => number
    __flowMiniMapResetPaneEvents?: () => void
    __flowMiniMapInternalNode?: (id: string) => FlowInternalNode | undefined
    __flowMiniMapDocument?: () => {
      readonly nodes: readonly {
        readonly id: string
        readonly size?:
          | {
              readonly width: number
              readonly height: number
            }
          | undefined
      }[]
    }
    __flowMiniMapExpectedNodes?: () =>
      | readonly {
          readonly id: string
          readonly width: number
          readonly height: number
        }[]
      | undefined
  }
}

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: new URLSearchParams(window.location.search).has('empty')
      ? []
      : [
          { id: 'near', label: 'Near', position: { x: 100, y: 80 } },
          {
            id: 'far',
            label: 'Far',
            position: { x: 700, y: 320 },
            size: { width: 180, height: 90 },
          },
          {
            id: 'hidden',
            label: 'Hidden',
            position: { x: 1500, y: 1000 },
            hidden: true,
          },
        ],
    edges: [],
  })
)

const StateProbe = defineComponent({
  setup() {
    const flow = useFlow()
    window.__flowMiniMapViewport = () => flow.viewport.value
    window.__flowMiniMapInternalNode = (id) => flow.getInternalNode(id)
    window.__flowMiniMapDocument = () => flow.document.value
    window.__flowMiniMapExpectedNodes = () => {
      const measured = new Map(
        flow.document.value.nodes.flatMap(({ id }) => {
          const internal = flow.getInternalNode(id)

          return internal?.measurementStatus === 'measured'
            ? [
                [
                  id,
                  {
                    nodeId: id,
                    width: internal.width,
                    height: internal.height,
                  },
                ] as const,
              ]
            : []
        })
      )

      const projection = selectFlowMiniMapProjection({
        graph: createFlowGraph(flow.document.value, measured),
        viewport: flow.viewport.value,
        canvas: { width: 1080, height: 620 },
        size: { width: 180, height: 120 },
      })

      return projection?.nodes
    }

    return () => null
  },
})

const Root = defineComponent({
  setup() {
    let paneEvents = 0
    window.__flowMiniMapPaneEvents = () => paneEvents
    window.__flowMiniMapResetPaneEvents = () => {
      paneEvents = 0
    }

    return () =>
      h(
        FlowCanvas,
        {
          document,
          defaultViewport: { x: 0, y: 0, zoom: 1 },
          zoomOnDoubleClick: true,
          onPaneMouseDown: () => (paneEvents += 1),
          onPaneMouseUp: () => (paneEvents += 1),
          onPaneClick: () => (paneEvents += 1),
          onPaneMouseMove: () => (paneEvents += 1),
          onPaneMouseEnter: () => (paneEvents += 1),
          onPaneMouseLeave: () => (paneEvents += 1),
          onPaneContextMenu: () => (paneEvents += 1),
        },
        { default: () => [h(FlowMiniMap), h(StateProbe)] }
      )
  },
})

createApp(Root).mount('#app')
