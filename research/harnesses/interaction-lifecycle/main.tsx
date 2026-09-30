import * as XYFlow from '@xyflow/react'
import { useCallback, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'

import '@xyflow/react/dist/style.css'

const initialNodes = [
  {
    id: 'parent',
    type: 'probe',
    position: { x: 80, y: 80 },
    style: { width: 120, height: 100 },
    data: { label: 'Parent' },
  },
  {
    id: 'child',
    type: 'probe',
    parentId: 'parent',
    position: { x: 20, y: 20 },
    style: { width: 50, height: 40 },
    data: { label: 'Child' },
  },
  {
    id: 'target',
    type: 'probe',
    position: { x: 250, y: 120 },
    style: { width: 100, height: 70 },
    data: { label: 'Target' },
  },
]

const initialEdges: XYFlow.Edge[] = []

interface EventRecord {
  event: string
  detail?: string
}

declare global {
  interface Window {
    __interactionCapture?: string
    __interactionEvents?: EventRecord[]
  }
}

const log = (event: string, detail?: string) => {
  window.__interactionEvents?.push({ event, detail })
}

const ProbeNode = ({ id, data }: XYFlow.NodeProps) => (
  <>
    <XYFlow.Handle type="target" position={XYFlow.Position.Left} id="in" />
    <div>{String(data.label)}</div>
    <XYFlow.Handle type="source" position={XYFlow.Position.Right} id="out" />
    {id === 'parent' && (
      <XYFlow.NodeResizer
        minWidth={40}
        minHeight={40}
        onResizeStart={(_event, params) =>
          log('resizeStart', JSON.stringify({ direction: params.direction }))
        }
        onResize={(_event, params) =>
          log(
            'resize',
            JSON.stringify({
              direction: params.direction,
              x: params.x,
              y: params.y,
              width: params.width,
              height: params.height,
            })
          )
        }
        onResizeEnd={(_event, params) =>
          log(
            'resizeEnd',
            JSON.stringify({
              direction: params.direction,
              x: params.x,
              y: params.y,
              width: params.width,
              height: params.height,
            })
          )
        }
      />
    )}
  </>
)

const nodeTypes = { probe: ProbeNode }

const CaptureState = ({
  nodes,
  edges,
}: {
  nodes: XYFlow.Node[]
  edges: XYFlow.Edge[]
}) => {
  const connectionState = XYFlow.useConnection((state) => ({
    inProgress: state.inProgress,
    isValid: state.isValid,
    toNode: state.toNode?.id ?? null,
  }))

  useEffect(() => {
    window.__interactionCapture = JSON.stringify({
      nodes,
      edges,
      connection: connectionState,
    })
  }, [nodes, edges, connectionState])

  return null
}

const App = () => {
  const [nodes, _setNodes, onNodesChange] = XYFlow.useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = XYFlow.useEdgesState(initialEdges)

  const onConnect = useCallback(
    (candidate: XYFlow.Connection) => {
      log('connect', JSON.stringify(candidate))
      setEdges((items) => XYFlow.addEdge(candidate, items))
    },
    [setEdges]
  )

  const onConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: XYFlow.OnConnectStartParams) =>
      log('connectStart', JSON.stringify(params)),
    []
  )

  const onConnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, state: XYFlow.OnConnectEnd) =>
      log(
        'connectEnd',
        JSON.stringify({
          isValid: state.isValid,
          toNode: state.toNode?.id ?? null,
        })
      ),
    []
  )

  const onNodeDragStart = useCallback(
    (_event: MouseEvent, node: XYFlow.Node) => log('nodeDragStart', node.id),
    []
  )

  const onNodeDragStop = useCallback(
    (_event: MouseEvent, node: XYFlow.Node) => log('nodeDragStop', node.id),
    []
  )

  const onError = useCallback(
    (code: string, message: string) =>
      log('error', JSON.stringify({ code, message })),
    []
  )

  const query = new URLSearchParams(window.location.search)

  const connectionMode =
    query.get('mode') === 'loose'
      ? XYFlow.ConnectionMode.Loose
      : XYFlow.ConnectionMode.Strict

  const connectionRadius = Number(query.get('radius') ?? 20)

  const defaultViewport = {
    x: 0,
    y: 0,
    zoom: Number(query.get('zoom') ?? 1),
  }

  const flowRef = useCallback((instance: XYFlow.ReactFlowInstance) => {
    if (!instance) {
      return
    }

    window.__interactionCapture = JSON.stringify({
      ready: true,
      nodes: instance.getNodes(),
      edges: instance.getEdges(),
      connection: { inProgress: false, isValid: null, toNode: null },
    })
  }, [])

  const props = useMemo(() => ({ nodes, edges }), [nodes, edges])

  return (
    <div style={{ width: 900, height: 600 }}>
      <XYFlow.ReactFlow
        {...props}
        nodeTypes={nodeTypes}
        connectionMode={connectionMode}
        connectionRadius={connectionRadius}
        defaultViewport={defaultViewport}
        onInit={flowRef}
        onNodesChange={(changes) => {
          onNodesChange(changes)

          for (const change of changes) {
            if (change.type === 'position' && change.dragging === false) {
              log(
                'positionAccepted',
                JSON.stringify({
                  id: change.id,
                  position: change.position,
                })
              )
            }
          }
        }}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onError={onError}
        fitView={false}
        panOnDrag={false}
        zoomOnScroll={false}
      >
        <CaptureState nodes={nodes} edges={edges} />
      </XYFlow.ReactFlow>
      {null}
    </div>
  )
}

const root = document.querySelector('#root')

if (!root) {
  throw new Error('Missing root')
}

window.__interactionEvents = []

createRoot(root).render(<App />)
