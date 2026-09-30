import * as XYFlow from '@xyflow/react'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { InitializationCapture } from './initialization'

import '@xyflow/react/dist/style.css'

let sessionCapture: object | undefined

let initializationCapture: unknown

const publish = () => {
  if (sessionCapture !== undefined && initializationCapture !== undefined) {
    window.__providerSessionCapture = JSON.stringify({
      ...sessionCapture,
      initialization: initializationCapture,
    })
  }
}

declare global {
  interface Window {
    __providerSessionCapture?: string
  }
}

const initialNodes: [XYFlow.Node, XYFlow.Node] = [
  {
    id: 'a',
    type: 'probe',
    position: { x: 10, y: 20 },
    data: { label: 'A', value: 1 },
  },
  {
    id: 'b',
    type: 'probe',
    position: { x: 80, y: 20 },
    data: { label: 'B', value: 2 },
  },
]

const initialEdges = [
  { id: 'ab', source: 'a', target: 'b', data: { label: 'AB' } },
]

const normalizeNode = (node: XYFlow.Node) => {
  const { measured: _measured, ...normalized } = node

  return normalized
}

const normalizeObject = (
  value: ReturnType<XYFlow.ReactFlowInstance['toObject']>
) => ({
  ...value,
  nodes: value.nodes.map(normalizeNode),
})

const NodeProbe = () => {
  const id = XYFlow.useNodeId()

  return <div data-node-id={id}>{id}</div>
}

const Probe = () => {
  const instance = XYFlow.useReactFlow()
  const nodes = XYFlow.useNodes()
  const data = XYFlow.useNodesData(['b', 'a', 'missing'])
  const viewport = XYFlow.useViewport()
  const [phase, setPhase] = useState(0)

  const saved = useRef<ReturnType<typeof instance.toObject> | null>(null)

  const changed = useRef<ReturnType<typeof instance.toObject> | null>(null)

  useEffect(() => {
    if (
      phase === 0 &&
      nodes.length === 2 &&
      viewport.x === 13 &&
      viewport.y === 17 &&
      viewport.zoom === 1.25
    ) {
      saved.current = normalizeObject(instance.toObject())
      instance.setNodes([
        { ...initialNodes[0], data: { label: 'A changed', value: 9 } },
      ])
      instance.setEdges([])
      void instance.setViewport({ x: 99, y: 101, zoom: 2 })
      setPhase(1)

      return
    }

    if (
      phase === 1 &&
      nodes.length === 1 &&
      viewport.x === 99 &&
      viewport.y === 101 &&
      viewport.zoom === 2
    ) {
      changed.current = normalizeObject(instance.toObject())
      instance.setNodes(initialNodes)
      instance.setEdges(initialEdges)

      const restoreViewport = async () => {
        await instance.setViewport({ x: 13, y: 17, zoom: 1.25 })
        setPhase(2)
      }

      void restoreViewport()

      return
    }

    if (
      phase === 2 &&
      viewport.x === 13 &&
      viewport.y === 17 &&
      viewport.zoom === 1.25 &&
      nodes.length === 2
    ) {
      if (saved.current === null || changed.current === null) {
        throw new Error('Missing provider/session observations')
      }

      sessionCapture = {
        contextIds: [
          ...document.querySelectorAll<HTMLElement>('[data-node-id]'),
        ].map((el) => el.dataset.nodeId),
        selectors: { nodes: nodes.map(normalizeNode), nodesData: data },
        saved: saved.current,
        changed: changed.current,
        restored: normalizeObject(instance.toObject()),
      }
      publish()
    }
  }, [data, instance, nodes, phase, viewport])

  return null
}

const App = () => (
  <XYFlow.ReactFlowProvider>
    <XYFlow.ReactFlow
      defaultNodes={initialNodes}
      defaultEdges={initialEdges}
      defaultViewport={{ x: 13, y: 17, zoom: 1.25 }}
      nodeTypes={{ probe: NodeProbe }}
      fitView={false}
    >
      <Probe />
    </XYFlow.ReactFlow>
  </XYFlow.ReactFlowProvider>
)

const rootElement = document.querySelector('#root')

if (rootElement === null) {
  throw new Error('Missing provider/session root element')
}

createRoot(rootElement).render(<App />)

const initializationRoot = document.createElement('div')

document.body.append(initializationRoot)

createRoot(initializationRoot).render(
  <InitializationCapture
    onDone={(value) => {
      initializationCapture = value
      publish()
    }}
  />
)
