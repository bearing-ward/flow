import { decodeFlowDocument } from '@flow/core'
import { createFlow } from '@flow/vanilla'
import { Effect } from 'effect'

import '@flow/vanilla/style.css'

export const createFirstCanvasDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        { id: 'source', label: 'Source', position: { x: 80, y: 120 } },
        { id: 'target', label: 'Target', position: { x: 360, y: 220 } },
      ],
      edges: [{ id: 'source-target', source: 'source', target: 'target' }],
    })
  )

export const mountFirstCanvas = (
  root: HTMLElement,
  document: ReturnType<typeof createFirstCanvasDocument>
) =>
  createFlow(root, document, {
    documentMode: 'uncontrolled',
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
  })
