import '@flow/vue/style.css'
import { decodeFlowDocument, applyFlowChangeToDocument } from '@flow/core'
import { FlowCanvas, FlowEdgeLabelRenderer, FlowEdgeText } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, shallowRef } from 'vue'

import {
  edgeStackingInput,
  edgeStackingOptions,
} from '../../shared-e2e/edge-stacking-fixture.ts'

export const mountEdgeStackingFixture = (
  root: HTMLElement,
  panOnDrag: boolean
) => {
  const clicks: string[] = []

  const document = shallowRef(
    Effect.runSync(decodeFlowDocument(edgeStackingInput))
  )

  const PortalEdge = defineComponent({
    inheritAttrs: false,
    setup: () => () => [
      h(FlowEdgeText, { x: 350, y: 400, label: 'SVG built-in label' }),
      h(FlowEdgeLabelRenderer, null, {
        default: () =>
          h(
            'div',
            {
              'data-testid': 'default-portal-label',
              style: { position: 'absolute', left: '40px', top: '400px' },
            },
            'Portal label'
          ),
      }),
    ],
  })

  createApp({
    setup: () => () =>
      h(FlowCanvas, {
        ...edgeStackingOptions,
        edgeTypes: { portal: PortalEdge },
        document: document.value,
        onChange: (change) => {
          document.value =
            applyFlowChangeToDocument(document.value, change) ?? document.value
        },
        panOnDrag,
        selectionOnDrag: !panOnDrag,
        onEdgeClick: (edge) => clicks.push(edge.id),
        style: { width: '100%', height: '100%' },
      }),
  }).mount(root)

  window.__flowEdgeStacking = {
    edgeClicks: () => clicks,
    coverEdge: (selected) => {
      document.value = Effect.runSync(
        decodeFlowDocument({
          ...edgeStackingInput,
          edges: edgeStackingInput.edges.map((edge) => ({
            ...edge,
            selected: edge.id === 'edge' && selected,
          })),
        })
      )
    },
  }
}
