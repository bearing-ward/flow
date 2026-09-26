import { decodeFlowDocument } from '@flow/core'
import { createFlow } from '@flow/vanilla'
import { Effect } from 'effect'

import '@flow/vanilla/style.css'

declare global {
  interface Window {
    __flowConsumerController?: Awaited<ReturnType<typeof createFlow>>
    __flowConsumerResult?: {
      readonly decodedNodeId: string
      readonly canvasCount: number
    }
  }
}

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'packed-node',
        label: 'Packed consumer',
        position: { x: 45, y: 60 },
      },
    ],
    edges: [],
  })
)

const root = globalThis.document.querySelector<HTMLElement>('#root')

if (root === null) {
  throw new Error('Missing consumer root')
}

const controller = await createFlow(root, document, {
  documentMode: 'uncontrolled',
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
})

window.__flowConsumerController = controller

window.__flowConsumerResult = {
  decodedNodeId: document.nodes[0]?.id ?? 'missing',
  canvasCount: root.querySelectorAll("[data-testid='flow-canvas']").length,
}
