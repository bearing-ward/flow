import {
  decodeFlowDocument,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
} from '@flow/core'
import type {
  FlowChange,
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowSnapshot,
  FlowStateChange,
} from '@flow/core'
import { createFlow, mountFlow } from '@flow/vanilla'
import type { JavaScriptFlowController } from '@flow/vanilla'
import { Effect } from 'effect'

export { FlowSnapshotSchema } from '@flow/core'

const document: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      { id: 'consumer-node', label: 'Consumer', position: { x: 10, y: 20 } },
    ],
    edges: [],
  })
)

const viewport = {
  mode: 'uncontrolled' as const,
  initial: { x: 0, y: 0, zoom: 1 },
  limits: { minZoom: 0.5, maxZoom: 2 },
}

const options = { documentMode: 'controlled' as const, viewport }

const onChange = (_change: FlowChange): void => undefined

const consumeState = (_change: FlowStateChange): void => undefined

export const syncMount: typeof mountFlow = mountFlow

export const asyncMount: typeof createFlow = createFlow

export const controllerPromise: Promise<JavaScriptFlowController> = createFlow(
  globalThis.document.body,
  document,
  { ...options, onChange }
)

export const snapshot: FlowSnapshot = {
  document,
  viewport: { x: 0, y: 0, zoom: 1 },
}

export const readAndSubscribe = async (): Promise<void> => {
  const controller = await controllerPromise
  const current: FlowSnapshot = controller.getSnapshot()
  const nodes: readonly FlowNode[] = controller.getNodes()
  const edges: readonly FlowEdge[] = controller.getEdges()
  const node: FlowNode | undefined = controller.getNode('consumer-node')
  const edge: FlowEdge | undefined = controller.getEdge('missing')
  const currentViewport = controller.getViewport()
  const unsubscribe = controller.subscribeState(consumeState)
  unsubscribe()
  void [current, nodes, edges, node, edge, currentViewport]
}

const graphNodes: readonly FlowNode[] = document.nodes

const graphEdges: readonly FlowEdge[] = document.edges

const selectedNode = document.nodes.find((node) => node.id === 'consumer-node')

if (selectedNode === undefined) {
  throw new Error('Consumer fixture is missing its node')
}

const selectedNodeId = { id: selectedNode.id }

export const graphIncomers: readonly FlowNode[] = getIncomers(
  selectedNode,
  graphNodes,
  graphEdges
)

export const graphOutgoers: readonly FlowNode[] = getOutgoers(
  selectedNodeId,
  graphNodes,
  graphEdges
)

export const graphConnectedEdges: readonly FlowEdge[] = getConnectedEdges(
  [selectedNode],
  graphEdges
)
