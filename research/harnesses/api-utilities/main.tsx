import * as XYFlow from '@xyflow/react'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

declare global {
  interface Window {
    __apiUtilityCapture?: string
  }
}

const nodes = [
  { id: 'a', position: { x: 1, y: 2 }, data: { label: 'A' } },
  { id: 'b', position: { x: 3, y: 4 }, data: { label: 'B' } },
  { id: 'c', position: { x: 5, y: 6 }, data: { label: 'C' } },
]

const edges = [
  {
    id: 'ab',
    source: 'a',
    target: 'b',
    sourceHandle: 'out',
    targetHandle: null,
  },
  { id: 'bc', source: 'b', target: 'c' },
]

const utilityCapture = () => {
  const nodeInput = structuredClone(nodes)
  const edgeInput = structuredClone(edges)

  const nodeChanges: XYFlow.NodeChange[] = [
    { type: 'select', id: 'a', selected: true },
    { type: 'position', id: 'a', position: { x: 9, y: 8 }, dragging: true },
    {
      type: 'dimensions',
      id: 'b',
      dimensions: { width: 80, height: 40 },
      setAttributes: true,
      resizing: false,
    },
    { type: 'remove', id: 'c' },
    { type: 'select', id: 'c', selected: true },
    {
      type: 'add',
      index: 1,
      item: { id: 'd', position: { x: 7, y: 8 }, data: { label: 'D' } },
    },
  ]

  const edgeChanges: XYFlow.EdgeChange[] = [
    { type: 'select', id: 'ab', selected: true },
    { type: 'remove', id: 'bc' },
    { type: 'add', item: { id: 'cd', source: 'c', target: 'd' } },
  ]

  const added = XYFlow.addEdge(
    {
      id: 'ac',
      source: 'a',
      target: 'c',
      sourceHandle: null,
      targetHandle: null,
    },
    edgeInput
  )

  const duplicate = XYFlow.addEdge(
    {
      id: 'duplicate',
      source: 'a',
      target: 'b',
      sourceHandle: 'out',
      targetHandle: null,
    },
    edgeInput
  )

  const reconnectInput = structuredClone(edgeInput)
  const [oldEdge] = reconnectInput

  if (oldEdge === undefined) {
    throw new Error('The reconnect fixture edge is missing')
  }

  const reconnected = XYFlow.reconnectEdge(
    oldEdge,
    { source: 'b', target: 'c', sourceHandle: 'other', targetHandle: null },
    reconnectInput,
    { shouldReplaceId: false }
  )

  const reconnectMissing = XYFlow.reconnectEdge(
    { id: 'missing', source: 'x', target: 'y' },
    { source: 'a', target: 'c', sourceHandle: null, targetHandle: null },
    reconnectInput,
    {
      shouldReplaceId: false,
      onError: (code, message) => console.info(code, message),
    }
  )

  return {
    applyNodeChanges: XYFlow.applyNodeChanges(nodeChanges, nodeInput),
    applyEdgeChanges: XYFlow.applyEdgeChanges(edgeChanges, edgeInput),
    inputsUnchanged: { nodes: nodeInput, edges: edgeInput },
    addEdge: added,
    duplicateAddReturnsSameArray: duplicate === edgeInput,
    reconnectEdge: reconnected,
    missingReconnectReturnsSameArray: reconnectMissing === reconnectInput,
    typePredicates: {
      node: XYFlow.isNode(nodes[0]),
      edge: XYFlow.isEdge(edges[0]),
      null: { node: XYFlow.isNode(null), edge: XYFlow.isEdge(null) },
    },
  }
}

const initialNodes = [
  { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A' } },
  { id: 'b', position: { x: 100, y: 0 }, data: { label: 'B' } },
]

const initialEdges = [{ id: 'ab', source: 'a', target: 'b' }]

const DeletionProbe = () => {
  const instance = XYFlow.useReactFlow()
  const events: unknown[] = []
  let beforeCompleted = false

  const beforeDelete = async ({
    nodes: candidateNodes,
    edges: candidateEdges,
  }: {
    nodes: XYFlow.Node[]
    edges: XYFlow.Edge[]
  }) => {
    events.push({
      type: 'before:start',
      nodes: candidateNodes.map(({ id }) => id),
      edges: candidateEdges.map(({ id }) => id),
    })
    await Promise.resolve()
    beforeCompleted = true
    events.push({ type: 'before:resolved' })

    return true
  }

  const onEdgesDelete = (deleted: XYFlow.Edge[]) =>
    events.push({
      type: 'edges',
      beforeCompleted,
      ids: deleted.map(({ id }) => id),
    })

  const onNodesDelete = (deleted: XYFlow.Node[]) =>
    events.push({
      type: 'nodes',
      beforeCompleted,
      ids: deleted.map(({ id }) => id),
    })

  const onDelete = ({
    nodes: deletedNodes,
    edges: deletedEdges,
  }: {
    nodes: XYFlow.Node[]
    edges: XYFlow.Edge[]
  }) =>
    events.push({
      type: 'delete',
      beforeCompleted,
      nodes: deletedNodes.map(({ id }) => id),
      edges: deletedEdges.map(({ id }) => id),
    })

  useEffect(() => {
    const captureDeletion = async (): Promise<void> => {
      const result = await instance.deleteElements({ nodes: [{ id: 'b' }] })

      window.__apiUtilityCapture = JSON.stringify({
        utilities: utilityCapture(),
        deletion: {
          events,
          result: {
            nodes: result.deletedNodes.map(({ id }) => id),
            edges: result.deletedEdges.map(({ id }) => id),
          },
        },
      })
    }

    void captureDeletion()
  }, [instance])

  return (
    <XYFlow.ReactFlow
      defaultNodes={initialNodes}
      defaultEdges={initialEdges}
      fitView
      onBeforeDelete={beforeDelete}
      onEdgesDelete={onEdgesDelete}
      onNodesDelete={onNodesDelete}
      onDelete={onDelete}
    />
  )
}

const root = document.querySelector('#root')

if (root === null) {
  throw new Error('The API utility probe root is missing')
}

createRoot(root).render(
  <XYFlow.ReactFlowProvider>
    <DeletionProbe />
  </XYFlow.ReactFlowProvider>
)
