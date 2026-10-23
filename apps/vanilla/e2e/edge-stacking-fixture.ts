import '@flow/vanilla/style.css'
import { mountFlow, createFlowEdgeText } from '@flow/vanilla'

import {
  edgeStackingInput,
  edgeStackingOptions,
} from '../../shared-e2e/edge-stacking-fixture.ts'

export const mountEdgeStackingFixture = (
  root: HTMLElement,
  panOnDrag: boolean
) => {
  const clicks: string[] = []

  const controller = mountFlow(root, edgeStackingInput, {
    ...edgeStackingOptions,
    documentMode: 'uncontrolled',
    edgeRenderers: {
      portal: {
        render: (_edge, context, visual) => {
          const label = document.createElement('div')
          label.dataset.testid = 'default-portal-label'
          label.style.cssText = 'position:absolute;left:40px;top:400px'
          label.textContent = 'Portal label'
          context.edgeLabelRenderer.append(label)
          const options = { x: 350, y: 400, label: 'SVG built-in label' }
          const text = createFlowEdgeText(document, options)
          visual.append(text.element)
          const frame = requestAnimationFrame(() => text.update(options))

          return {
            update: () => {
              label.textContent = 'Portal label'
              text.update(options)
            },
            destroy: () => {
              cancelAnimationFrame(frame)
              text.dispose()
              label.remove()
            },
          }
        },
      },
    },
    panOnDrag,
    selectionOnDrag: !panOnDrag,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
    onEdgeClick: ({ edgeId }) => clicks.push(edgeId ?? ''),
  })

  window.__flowEdgeStacking = {
    edgeClicks: () => clicks,
    coverEdge: (selected) =>
      controller.update({
        ...edgeStackingInput,
        edges: edgeStackingInput.edges.map((edge) => ({
          ...edge,
          selected: edge.id === 'edge' && selected,
        })),
      }),
  }
}
