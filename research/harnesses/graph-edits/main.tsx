import * as XYFlow from '@xyflow/react'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

const initialNodes = [
  {
    id: 'a',
    position: { x: 0, y: 0 },
    data: { label: 'A', nested: { keep: 1 } },
  },
  { id: 'b', position: { x: 100, y: 0 }, data: { label: 'B' } },
  {
    id: 'b-child',
    parentId: 'b',
    position: { x: 0, y: 60 },
    data: { label: 'B child' },
  },
  { id: 'c', position: { x: 200, y: 0 }, data: { label: 'C' } },
]

const initialEdges = [
  {
    id: 'ab',
    source: 'a',
    target: 'b',
    data: { label: 'AB', nested: { keep: 1 } },
  },
  { id: 'bc', source: 'b', target: 'c' },
  { id: 'child-c', source: 'b-child', target: 'c' },
]

interface GraphEditCapture {
  utilities: string
  controlledDeletion: string
  initial: string
  add: string
  setters: string
  merge: string
  replace: string
  missing: string
  delete: string
}

declare global {
  interface Window {
    __graphEditCapture?: string
  }
}

const emptyCapture = (): GraphEditCapture => ({
  utilities: '',
  controlledDeletion: '',
  initial: '',
  add: '',
  setters: '',
  merge: '',
  replace: '',
  missing: '',
  delete: '',
})

const serialize = <Value,>(value: Value): string => JSON.stringify(value)

const captureUtilities = () => {
  const changes = [
    {
      type: 'position' as const,
      id: 'a',
      position: { x: 12, y: 34 },
      positionAbsolute: { x: 100, y: 100 },
      dragging: true,
    },
    { type: 'select' as const, id: 'b', selected: true },
    { type: 'remove' as const, id: 'missing' },
  ]

  const duplicateEdge = { id: 'duplicate-ab', source: 'a', target: 'b' }

  const [oldEdge] = initialEdges

  return {
    applyNodeChanges: XYFlow.applyNodeChanges(changes, initialNodes),
    addEdgeDuplicate: XYFlow.addEdge(duplicateEdge, initialEdges),
    reconnectEdge: XYFlow.reconnectEdge(
      oldEdge,
      {
        source: 'a',
        target: 'b',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
      initialEdges,
      { shouldReplaceId: false }
    ),
  }
}

const normalizeNode = (
  node: XYFlow.Node | undefined
): Omit<XYFlow.Node, 'measured'> | undefined => {
  if (node === undefined) {
    return undefined
  }

  const { measured: _measured, ...normalized } = node

  return normalized
}

const Probe = () => {
  const instance = XYFlow.useReactFlow()
  const [phase, setPhase] = useState(0)
  const observations = useRef(emptyCapture())

  useEffect(() => {
    if (phase === 0) {
      instance.setNodes(initialNodes)
      instance.setEdges(initialEdges)
      setPhase(1)

      return
    }

    if (phase === 1) {
      observations.current.utilities = serialize(captureUtilities())
      observations.current.initial = serialize({
        nodes: instance.getNodes().map(normalizeNode),
        edges: instance.getEdges(),
      })
      instance.addNodes({
        id: 'd',
        position: { x: 300, y: 0 },
        data: { label: 'D' },
      })
      instance.addEdges({
        id: 'cd',
        source: 'c',
        target: 'd',
        data: { label: 'CD' },
      })
      setPhase(2)

      return
    }

    if (phase === 2) {
      observations.current.add = serialize({
        nodes: instance.getNodes().map(normalizeNode),
        edges: instance.getEdges(),
      })
      instance.setNodes(
        instance
          .getNodes()
          .map((node) =>
            node.id === 'c'
              ? { ...node, data: { ...node.data, label: 'C set' } }
              : node
          )
      )
      instance.setEdges(
        instance
          .getEdges()
          .map((edge) =>
            edge.id === 'bc' ? { ...edge, data: { label: 'BC set' } } : edge
          )
      )
      setPhase(3)

      return
    }

    if (phase === 3) {
      observations.current.setters = serialize({
        nodes: instance.getNodes().map(normalizeNode),
        edges: instance.getEdges(),
      })
      instance.updateNode('a', { data: { label: 'A merged' } })
      instance.updateNodeData('a', { extra: true })
      instance.updateEdge('ab', { data: { label: 'AB merged' } })
      instance.updateEdgeData('ab', { extra: true })
      setPhase(4)

      return
    }

    if (phase === 4) {
      const node = instance.getNode('a')
      observations.current.merge = serialize({
        node: normalizeNode(node),
        edge: instance.getEdge('ab'),
      })
      instance.updateNode(
        'a',
        { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A replaced' } },
        { replace: true }
      )
      instance.updateEdge(
        'ab',
        { id: 'ab', source: 'a', target: 'b', data: { label: 'AB replaced' } },
        { replace: true }
      )
      setPhase(5)

      return
    }

    if (phase === 5) {
      const node = instance.getNode('a')
      observations.current.replace = serialize({
        node: normalizeNode(node),
        edge: instance.getEdge('ab'),
      })
      instance.updateNode('missing', { data: { ignored: true } })
      instance.updateEdge('missing', { data: { ignored: true } })
      setPhase(6)

      return
    }

    if (phase === 6) {
      observations.current.missing = serialize({
        nodes: instance.getNodes().map(normalizeNode),
        edges: instance.getEdges(),
      })

      const captureDeletion = async (): Promise<void> => {
        const deletion = await instance.deleteElements({ nodes: [{ id: 'b' }] })
        observations.current.delete = serialize({
          result: {
            nodes: deletion.deletedNodes.map(({ id }) => id),
            edges: deletion.deletedEdges.map(({ id }) => id),
          },
          nodes: instance.getNodes().map(normalizeNode),
          edges: instance.getEdges(),
        })
        window.__graphEditCapture = JSON.stringify(observations.current)
      }

      void captureDeletion()
    }
  }, [instance, phase])

  return <XYFlow.ReactFlow fitView />
}

const ControlledDeletionProbe = () => {
  const instance = XYFlow.useReactFlow()
  const events = useRef<string[]>([])
  const started = useRef(false)

  useEffect(() => {
    if (started.current) {
      return
    }

    started.current = true
    void (async () => {
      const result = await instance.deleteElements({ nodes: [{ id: 'b' }] })

      window.__graphEditCapture = JSON.stringify({
        events: events.current,
        result: {
          nodes: result.deletedNodes.map(({ id }) => id),
          edges: result.deletedEdges.map(({ id }) => id),
        },
        owner: {
          nodes: instance.getNodes().map(({ id }) => id),
          edges: instance.getEdges().map(({ id }) => id),
        },
      })
    })()
  }, [instance])

  return (
    <XYFlow.ReactFlow
      nodes={initialNodes}
      edges={initialEdges}
      fitView
      onBeforeDelete={async ({ nodes, edges }) => {
        events.current.push(
          `before:${edges.map(({ id }) => id).join(',')}|${nodes.map(({ id }) => id).join(',')}`
        )
        await Promise.resolve()
        events.current.push('approved')

        return true
      }}
      onEdgesDelete={(edges) =>
        events.current.push(`edges:${edges.map(({ id }) => id).join(',')}`)
      }
      onEdgesChange={(changes) =>
        events.current.push(
          `edgeChanges:${changes.map(({ type }) => type).join(',')}`
        )
      }
      onNodesDelete={(nodes) =>
        events.current.push(`nodes:${nodes.map(({ id }) => id).join(',')}`)
      }
      onNodesChange={(changes) =>
        events.current.push(
          `nodeChanges:${changes.map(({ type }) => type).join(',')}`
        )
      }
      onDelete={({ nodes, edges }) =>
        events.current.push(
          `delete:${edges.map(({ id }) => id).join(',')}|${nodes.map(({ id }) => id).join(',')}`
        )
      }
    />
  )
}

const root = document.querySelector('#root')

if (root === null) {
  throw new Error('The graph edit probe root is missing')
}

const isControlledDeletion =
  new URLSearchParams(window.location.search).get('case') ===
  'delete-controlled'

createRoot(root).render(
  isControlledDeletion ? (
    <XYFlow.ReactFlowProvider
      initialNodes={initialNodes}
      initialEdges={initialEdges}
    >
      <ControlledDeletionProbe />
    </XYFlow.ReactFlowProvider>
  ) : (
    <XYFlow.ReactFlowProvider
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      defaultNodes={initialNodes}
      defaultEdges={initialEdges}
    >
      <Probe />
    </XYFlow.ReactFlowProvider>
  )
)
