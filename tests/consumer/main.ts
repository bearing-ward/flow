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
      readonly initialSnapshotNodeId: string | undefined
      readonly updatedNodeId: string | undefined
      readonly stateNotificationCount: number
      readonly editResult: string
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

let stateNotificationCount = 0

const stopState = controller.subscribeState(() => {
  stateNotificationCount += 1
})

const initialSnapshotNodeId = controller.getSnapshot().document.nodes[0]?.id

controller.update({
  nodes: [
    {
      id: 'packed-updated',
      label: 'Packed update',
      position: { x: 55, y: 65 },
    },
  ],
  edges: [],
})

const updatedNodeId = controller.getNode('packed-updated')?.id

stopState()

controller.updateViewport({ x: 5, y: 6, zoom: 1.25 })

const stateChangeAfterUnsubscribe = stateNotificationCount

await controller.setNodes([
  { id: 'edit-a', label: 'A', position: { x: 20, y: 20 }, data: { n: 1 } },
])

let updaterCalls = 0

await controller.setNodes((nodes) => nodes)

await controller.addNodes({
  id: 'edit-b',
  label: 'B',
  position: { x: 220, y: 20 },
})

await controller.setEdges([])

await controller.addEdges({
  id: 'edit-edge',
  source: 'edit-a',
  target: 'edit-b',
  data: { weight: 1 },
})

await controller.updateNode('edit-a', { label: 'A updated' })

await controller.updateNodeData('edit-a', { n: 2 })

await controller.updateNodeData('edit-a', (data) => {
  updaterCalls += 1

  return { n: Number(data.n ?? 0) + 1 }
})

await controller.updateEdge('edit-edge', { label: 'A to B' })

await controller.updateEdgeData('edit-edge', { weight: 2 })

await controller.updateEdgeData('edit-edge', (data) => {
  updaterCalls += 1

  return { weight: Number(data.weight ?? 0) + 1 }
})

const edgeWeightBeforeDelete = controller.getEdge('edit-edge')?.data?.weight

const deletion = await controller.deleteElements({ nodeIds: ['edit-b'] })

const editResult = `${controller.getNode('edit-a')?.label}:${controller.getNode('edit-a')?.data?.n}:${edgeWeightBeforeDelete}:${updaterCalls}:${controller.getEdge('edit-edge') === undefined}:${deletion.deletedNodeIds.join(',')}:${deletion.deletedEdgeIds.join(',')}`

window.__flowConsumerResult = {
  decodedNodeId: document.nodes[0]?.id ?? 'missing',
  canvasCount: root.querySelectorAll("[data-testid='flow-canvas']").length,
  initialSnapshotNodeId,
  updatedNodeId,
  stateNotificationCount: stateChangeAfterUnsubscribe,
  editResult,
}
