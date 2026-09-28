import * as XYFlow from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import { useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

declare global {
  interface Window {
    __rendererContractCapture?: string
  }
}

const initialNodes: XYFlow.Node[] = [
  {
    id: 'source',
    type: 'contract',
    position: { x: 100, y: 100 },
    data: { width: 140, height: 76, outputTop: 24 },
  },
  {
    id: 'target',
    type: 'contract',
    position: { x: 440, y: 100 },
    data: { width: 140, height: 76, outputTop: 24 },
  },
]

const pathKinds = ['straight', 'bezier', 'step', 'smoothstep', 'simplebezier']

const ContractNode = ({ id, data }: XYFlow.NodeProps) => {
  const updateNodeInternals = XYFlow.useUpdateNodeInternals()
  const [expanded, setExpanded] = useState(false)
  const height = expanded ? 116 : Number(data.height)
  const outputTop = expanded ? 52 : Number(data.outputTop)

  useLayoutEffect(() => {
    updateNodeInternals(id)
  }, [height, id, outputTop, updateNodeInternals])

  return (
    <div
      data-contract-node={id}
      style={{
        width: `${Number(data.width)}px`,
        height: `${height}px`,
        position: 'relative',
        background: '#f1f5f9',
        border: '1px solid #334155',
      }}
    >
      <XYFlow.Handle
        type="target"
        id="in"
        position={XYFlow.Position.Left}
        style={{ top: '18px' }}
      />
      <XYFlow.Handle
        type="source"
        id="out"
        position={XYFlow.Position.Right}
        style={{ top: `${outputTop}px` }}
      />
      <input aria-label={`node input ${id}`} defaultValue={id} />
      <button
        type="button"
        data-expand-node={id}
        onClick={() => setExpanded((value) => !value)}
      >
        Resize node
      </button>
    </div>
  )
}

const CustomEdge = (props: XYFlow.EdgeProps) => {
  const [path, labelX, labelY] = XYFlow.getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })

  return (
    <>
      <XYFlow.BaseEdge
        id={props.id}
        path={path}
        labelX={labelX}
        labelY={labelY}
        markerStart={props.markerStart}
        markerEnd={props.markerEnd}
        interactionWidth={props.interactionWidth}
      />
      <XYFlow.EdgeLabelRenderer>
        <button
          type="button"
          data-custom-edge-label={props.id}
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          Custom {props.id}
        </button>
      </XYFlow.EdgeLabelRenderer>
    </>
  )
}

const Capture = () => {
  const instance = XYFlow.useReactFlow()
  const ready = XYFlow.useNodesInitialized()
  const [phase, setPhase] = useState(0)

  useLayoutEffect(() => {
    if (!ready || phase !== 0) {
      return
    }

    const initial = {
      nodes: ['source', 'target'].map((id) => {
        const node = instance.getInternalNode(id)

        return {
          id,
          measured: node?.measured ?? null,
          handles: {
            source: node?.internals.handleBounds?.source ?? [],
            target: node?.internals.handleBounds?.target ?? [],
          },
        }
      }),
      paths: pathKinds.map((kind) => ({
        kind,
        path: document
          .querySelector<SVGPathElement>(
            `.react-flow__edge[data-id="${kind}"] .react-flow__edge-path`
          )
          ?.getAttribute('d'),
      })),
      customLabel: Boolean(
        document.querySelector('[data-custom-edge-label="custom"]')
      ),
      markers: [...document.querySelectorAll<SVGMarkerElement>('marker')].map(
        (marker) => ({
          tag: marker.tagName,
          orient: marker.getAttribute('orient'),
          width: marker.getAttribute('markerWidth'),
          height: marker.getAttribute('markerHeight'),
          markerChildren: [...marker.children].map((child) => ({
            tag: child.tagName,
            attributes: [...child.attributes]
              .map(({ name, value }) => [name, value])
              .toSorted(([left], [right]) => left.localeCompare(right)),
          })),
        })
      ),
      unknownFallback: Boolean(
        document.querySelector(
          '.react-flow__edge[data-id="unknown"] .react-flow__edge-path'
        )
      ),
    }

    const resize = document.querySelector<HTMLButtonElement>(
      '[data-expand-node="source"]'
    )

    resize?.click()
    setPhase(1)

    const poll = (attempt: number): void => {
      const node = instance.getInternalNode('source')

      const output = node?.internals.handleBounds?.source?.find(
        (handle) => handle.id === 'out'
      )

      if (node?.measured.height === 118 && output?.y === 49) {
        const pathsAfterResize = pathKinds.map((kind) => ({
          kind,
          path: document
            .querySelector<SVGPathElement>(
              `.react-flow__edge[data-id="${kind}"] .react-flow__edge-path`
            )
            ?.getAttribute('d'),
        }))

        window.__rendererContractCapture = JSON.stringify({
          initial,
          refreshed: {
            measured: node.measured,
            output,
            paths: pathsAfterResize,
          },
          pathKinds,
        })

        return
      }

      if (attempt >= 100) {
        throw new Error(
          `The resized node handles did not settle: ${JSON.stringify({
            measured: node?.measured,
            output,
          })}`
        )
      }

      window.setTimeout(() => poll(attempt + 1), 50)
    }

    requestAnimationFrame(() => poll(0))
  }, [instance, phase, ready])

  return null
}

const CaptureApp = () => {
  const [nodes, setNodes] = useState(initialNodes)

  const edges: XYFlow.Edge[] = pathKinds.map((path, index) => ({
    id: path,
    source: 'source',
    target: 'target',
    sourceHandle: 'out',
    targetHandle: 'in',
    type: path === 'bezier' ? 'default' : path,
    label: `Label ${path}`,
    markerEnd: { type: XYFlow.MarkerType.ArrowClosed, color: '#123456' },
    data: { index },
  }))

  edges.push(
    {
      id: 'custom',
      source: 'source',
      target: 'target',
      sourceHandle: 'out',
      targetHandle: 'in',
      type: 'contract',
      label: 'Custom label',
      markerStart: { type: XYFlow.MarkerType.Arrow },
      interactionWidth: 24,
      data: { kind: 'custom' },
    },
    {
      id: 'unknown',
      source: 'source',
      target: 'target',
      sourceHandle: 'out',
      targetHandle: 'in',
      type: 'missing-renderer',
    }
  )

  return (
    <XYFlow.ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={(changes) =>
        setNodes((current) => XYFlow.applyNodeChanges(changes, current))
      }
      nodeTypes={{ contract: ContractNode }}
      edgeTypes={{ contract: CustomEdge }}
      fitView
    >
      <Capture />
    </XYFlow.ReactFlow>
  )
}

const root = document.querySelector('#root')

if (root === null) {
  throw new Error('Missing renderer probe root')
}

createRoot(root).render(
  <XYFlow.ReactFlowProvider>
    <CaptureApp />
  </XYFlow.ReactFlowProvider>
)
