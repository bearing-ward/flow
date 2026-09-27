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
  initial: '',
  add: '',
  setters: '',
  merge: '',
  replace: '',
  missing: '',
  delete: '',
})

const serialize = <Value,>(value: Value): string => JSON.stringify(value)

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

const root = document.querySelector('#root')

if (root === null) {
  throw new Error('The graph edit probe root is missing')
}

createRoot(root).render(
  <XYFlow.ReactFlowProvider
    initialNodes={initialNodes}
    initialEdges={initialEdges}
    defaultNodes={initialNodes}
    defaultEdges={initialEdges}
  >
    <Probe />
  </XYFlow.ReactFlowProvider>
)
