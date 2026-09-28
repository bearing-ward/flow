import * as XYFlow from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

declare global {
  interface Window {
    __measuredGeometryCapture?: string
    __measurementProbeDebug?: string
  }
}

const initialNodes: XYFlow.Node[] = [
  {
    id: 'measured',
    type: 'measurement',
    position: { x: 120, y: 90 },
    data: { width: 100, height: 64, handleTop: 16 },
  },
  {
    id: 'hidden',
    position: { x: 420, y: 90 },
    hidden: true,
    data: { label: 'Hidden' },
  },
]

const initialEdges: XYFlow.Edge[] = []

const MeasurementNode = ({ data }: XYFlow.NodeProps) => (
  <div
    style={{
      width: `${data.width}px`,
      height: `${data.height}px`,
      position: 'relative',
      background: '#eee',
    }}
  >
    <XYFlow.Handle
      type="source"
      id="out"
      position={XYFlow.Position.Right}
      style={{ top: `${data.handleTop}px` }}
    />
    <XYFlow.Handle type="target" id="in" position={XYFlow.Position.Left} />
  </div>
)

type NormalizedNode = {
  id: string
  measured: XYFlow.InternalNode['measured']
  absolutePosition: XYFlow.InternalNode['internals']['positionAbsolute']
  handles: {
    source: NonNullable<
      XYFlow.InternalNode['internals']['handleBounds']
    >['source']
    target: NonNullable<
      XYFlow.InternalNode['internals']['handleBounds']
    >['target']
  }
} | null

interface CaptureResult {
  initial?: NormalizedNode
  readiness?: { visibleOnly: boolean; includingHidden: boolean }
  hiddenInternal?: NormalizedNode
  missingInternal?: NormalizedNode
  refreshed?: NormalizedNode
}

const normalizeHandle = (
  handle: NonNullable<
    NonNullable<XYFlow.InternalNode['internals']['handleBounds']>['source']
  >[number]
) => ({
  id: handle.id,
  x: handle.x,
  y: handle.y,
  width: handle.width,
  height: handle.height,
  position: handle.position,
})

const normalizeNode = (
  node: XYFlow.InternalNode | undefined
): NormalizedNode => {
  if (node === undefined) {
    return null
  }

  const handles = node.internals.handleBounds

  return {
    id: node.id,
    measured: node.measured,
    absolutePosition: node.internals.positionAbsolute,
    handles: {
      source: handles?.source?.map(normalizeHandle) ?? [],
      target: handles?.target?.map(normalizeHandle) ?? [],
    },
  }
}

const Probe = ({ setNodes }: { setNodes: (nodes: XYFlow.Node[]) => void }) => {
  const instance = XYFlow.useReactFlow()
  const updateNodeInternals = XYFlow.useUpdateNodeInternals()

  const nodesInitialized = XYFlow.useNodesInitialized({
    includeHiddenNodes: false,
  })

  const nodesInitializedIncludingHidden = XYFlow.useNodesInitialized({
    includeHiddenNodes: true,
  })

  const [phase, setPhase] = useState(0)
  const result = useRef<CaptureResult>({})

  useEffect(() => {
    window.__measurementProbeDebug = JSON.stringify({
      phase,
      nodesInitialized,
      nodesInitializedIncludingHidden,
      internal: normalizeNode(instance.getInternalNode('measured')),
    })

    if (!nodesInitialized || phase !== 0) {
      return
    }

    result.current.initial = normalizeNode(instance.getInternalNode('measured'))
    result.current.readiness = {
      visibleOnly: nodesInitialized,
      includingHidden: nodesInitializedIncludingHidden,
    }
    result.current.hiddenInternal = normalizeNode(
      instance.getInternalNode('hidden')
    )
    result.current.missingInternal = normalizeNode(
      instance.getInternalNode('absent')
    )
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === 'measured'
          ? {
              ...node,
              data: { ...node.data, width: 180, height: 92, handleTop: 52 },
            }
          : node
      )
    )
    setPhase(1)
  }, [instance, nodesInitialized, nodesInitializedIncludingHidden, phase])

  useEffect(() => {
    if (phase !== 1) {
      return
    }

    let cancelled = false

    const pollRefreshedGeometry = (attempt: number): void => {
      if (cancelled) {
        return
      }

      const refreshed = instance.getInternalNode('measured')

      const sourceHandle = refreshed?.internals.handleBounds?.source?.find(
        (handle) => handle.id === 'out'
      )

      if (
        refreshed?.measured.width === 180 &&
        refreshed.measured.height === 92 &&
        sourceHandle?.y === 48
      ) {
        result.current.refreshed = normalizeNode(refreshed)
        window.__measuredGeometryCapture = JSON.stringify(result.current)

        return
      }

      if (attempt >= 100) {
        throw new Error(
          `Refreshed geometry did not settle: ${JSON.stringify({
            measured: refreshed?.measured,
            sourceHandle,
          })}`
        )
      }

      window.setTimeout(() => pollRefreshedGeometry(attempt + 1), 50)
    }

    requestAnimationFrame(() => {
      updateNodeInternals('measured')
      pollRefreshedGeometry(0)
    })

    return () => {
      cancelled = true
    }
  }, [instance, phase, updateNodeInternals])

  return null
}

const CaptureApp = () => {
  const [nodes, setNodes] = useState(initialNodes)

  return (
    <XYFlow.ReactFlow
      fitView
      nodes={nodes}
      edges={initialEdges}
      onNodesChange={(changes) =>
        setNodes((currentNodes) =>
          XYFlow.applyNodeChanges(changes, currentNodes)
        )
      }
      nodeTypes={{ measurement: MeasurementNode }}
    >
      <Probe setNodes={setNodes} />
    </XYFlow.ReactFlow>
  )
}

const root = document.querySelector('#root')

if (root === null) {
  throw new Error('Missing probe root')
}

createRoot(root).render(<CaptureApp />)
