import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  decodeFlowDocument,
  EdgeIdSchema,
  HandleIdSchema,
  getEdgeCenter,
  getBezierPath,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  isEdge,
  isNode,
  reconnectEdge,
} from '@flow/core'
import type {
  EdgeChange,
  FlowChange,
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowSnapshot,
  FlowStateChange,
  NodeChange,
} from '@flow/core'
import {
  createFlow,
  createFlowBaseHandle,
  createFlowBaseNode,
  createFlowControlButton,
  createFlowStatusIndicator,
  updateFlowStatusIndicator,
  createFlowAppendix,
  createFlowTooltip,
  createFlowLabeledHandleLabel,
  createFlowDatabaseSchema,
  createFlowPlaceholder,
  mountFlow,
} from '@flow/vanilla'
import type {
  FlowBaseHandleOptions,
  FlowBaseNodeOptions,
  JavaScriptFlowController,
} from '@flow/vanilla'
import { Effect, Schema as S } from 'effect'

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

export const packedBaseHandle: FlowBaseHandleOptions = createFlowBaseHandle({
  id: S.decodeUnknownSync(HandleIdSchema)('consumer-handle'),
  kind: 'source',
  side: 'right',
})

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
  await controller.setNodes(nodes)
  await controller.setNodes((nextNodes) => nextNodes)
  const [firstNode] = nodes

  if (firstNode !== undefined) {
    await controller.addNodes(firstNode)
  }

  await controller.setEdges(edges)
  await controller.setEdges((nextEdges) => nextEdges)
  await controller.addEdges(edges)
  await controller.updateNode('consumer-node', { label: 'updated' })
  await controller.updateNode('consumer-node', (currentNode) => ({
    label: `${currentNode.label} updated`,
  }))
  await controller.updateNodeData('consumer-node', { value: 1 })
  await controller.updateNodeData('consumer-node', (data) => ({
    ...data,
    value: 2,
  }))
  await controller.updateEdge('missing', { label: 'updated' })
  await controller.updateEdge('missing', (currentEdge) => ({
    label: currentEdge.label,
  }))
  await controller.updateEdgeData('missing', { value: 1 }, { replace: true })
  await controller.updateEdgeData(
    'missing',
    (data) => ({ ...data, value: 2 }),
    { replace: true }
  )
  const deletion = await controller.deleteElements({ nodeIds: ['missing'] })

  const transaction = await controller.applyEdit({
    operations: [{ kind: 'delete-elements', nodeIds: ['missing'] }],
  })

  const unsubscribe = controller.subscribeState(consumeState)
  unsubscribe()
  void [
    current,
    nodes,
    edges,
    node,
    edge,
    currentViewport,
    deletion,
    transaction,
  ]
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

const nodeChanges: readonly NodeChange[] = [
  { id: selectedNode.id, type: 'select', selected: true },
  {
    id: selectedNode.id,
    type: 'dimensions',
    dimensions: { width: 90, height: 50 },
  },
]

const edgeChanges: readonly EdgeChange[] = [
  {
    type: 'add',
    item: {
      id: S.decodeUnknownSync(EdgeIdSchema)('consumer-edge'),
      source: selectedNode.id,
      target: selectedNode.id,
    },
  },
]

export const utilityConsumer = {
  nodes: applyNodeChanges(nodeChanges, document.nodes),
  edges: applyEdgeChanges(edgeChanges, document.edges),
  addEdge: addEdge(
    { source: selectedNode.id, target: selectedNode.id },
    document.edges
  ),
  reconnectEdge: reconnectEdge(
    {
      id: S.decodeUnknownSync(EdgeIdSchema)('consumer-edge'),
      source: selectedNode.id,
      target: selectedNode.id,
    },
    { source: selectedNode.id, target: selectedNode.id },
    [
      {
        id: S.decodeUnknownSync(EdgeIdSchema)('consumer-edge'),
        source: selectedNode.id,
        target: selectedNode.id,
      },
    ]
  ),
  predicates: [
    isNode(selectedNode),
    isEdge({ id: 'e', source: 'a', target: 'b' }),
  ],
  edgeCenter: getEdgeCenter({
    sourceX: 0,
    sourceY: 0,
    targetX: 20,
    targetY: 10,
  }),
  straightPath: getStraightPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  }),
  bezierPath: getBezierPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  }),
  simpleBezierPath: getSimpleBezierPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  }),
  smoothStepPath: getSmoothStepPath({
    sourceX: 0,
    sourceY: 0,
    targetX: 10,
    targetY: 10,
  }),
}

const mutableCenter = getEdgeCenter({
  sourceX: 0,
  sourceY: 0,
  targetX: 2,
  targetY: 2,
})

mutableCenter[0] = 1

const baseNodeOptions: FlowBaseNodeOptions = {
  title: 'Packed node',
  content: globalThis.document.createElement('button'),
}

const baseNode = createFlowBaseNode(globalThis.document, baseNodeOptions)

export const mountPackedNodeContent = (owner: Document): (() => void) => {
  const content = owner.createElement('div')
  const status = createFlowStatusIndicator(owner, { status: 'waiting' })

  const action = createFlowControlButton(owner, {
    type: 'button',
    name: 'schema-action',
    value: 'refresh',
    disabled: false,
    style: { color: 'navy', '--consumer-accent': 'blue' },
    aria: { 'aria-label': 'Refresh schema' },
    children: [owner.createTextNode('Refresh')],
    onClick: (event) => {
      updateFlowStatusIndicator(
        status,
        'ready',
        `Loaded with button ${event.button}`
      )
    },
  })

  const schema = createFlowDatabaseSchema(owner, {
    name: 'users',
    fields: [
      { id: 'id', name: 'id', type: 'uuid', kind: 'source', side: 'right' },
    ],
  })

  const label = createFlowLabeledHandleLabel(
    { handle: packedBaseHandle, label: 'Output' },
    owner
  )

  const appendix = createFlowAppendix(owner, {
    id: 'packed-schema-details',
    label: 'Details',
    content: schema,
    initiallyExpanded: true,
  })

  const placeholder = createFlowPlaceholder(owner, {
    label: 'Add table',
    onActivate: () => updateFlowStatusIndicator(status, 'waiting'),
  })

  content.append(status, action, label, appendix.element, placeholder)
  baseNode.append(content)
  owner.body.append(baseNode)

  const tooltip = createFlowTooltip(owner, {
    trigger: action,
    text: 'Refresh caller-owned data',
  })

  return () => {
    tooltip.destroy()
    appendix.destroy()
    baseNode.remove()
  }
}
