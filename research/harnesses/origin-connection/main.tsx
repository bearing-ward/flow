import * as XYFlow from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import { Schema as S } from 'effect'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { ObservationSchema, ProbeRequestSchema } from './fixture-schema.ts'

const request = S.decodeUnknownSync(ProbeRequestSchema)(
  JSON.parse(new URLSearchParams(location.search).get('request') ?? 'null')
)

const ProbeDataSchema = S.Struct({ role: S.String })

type ProbeNode = XYFlow.Node<typeof ProbeDataSchema.Type, 'probe' | 'group'>

const lineTypes = {
  default: XYFlow.ConnectionLineType.Bezier,
  straight: XYFlow.ConnectionLineType.Straight,
  step: XYFlow.ConnectionLineType.Step,
  smoothstep: XYFlow.ConnectionLineType.SmoothStep,
  simplebezier: XYFlow.ConnectionLineType.SimpleBezier,
}

const round = (value: number): number => Math.round(value * 1000) / 1000

const point = ({ x, y }: XYFlow.XYPosition) => ({ x: round(x), y: round(y) })

const bounds = (rect: DOMRect) => ({
  ...point(rect),
  width: round(rect.width),
  height: round(rect.height),
})

const handle = (value: XYFlow.Handle) => ({
  id: value.id ?? null,
  kind: value.type,
  side: value.position,
  x: round(value.x),
  y: round(value.y),
  width: round(value.width),
  height: round(value.height),
})

let starts = 0

let ends = 0

const connections: XYFlow.Connection[] = []

const errors: string[] = []

let custom: (typeof ObservationSchema.Type)['custom'] = null

const CustomLine = (props: XYFlow.ConnectionLineComponentProps<ProbeNode>) => {
  custom = {
    lineType: props.connectionLineType,
    status: props.connectionStatus,
    from: point({ x: props.fromX, y: props.fromY }),
    to: point({ x: props.toX, y: props.toY }),
    pointer: point(props.pointer),
    fromNode: props.fromNode.id,
    toNode: props.toNode?.id ?? null,
    fromHandle: handle(props.fromHandle),
    toHandle: props.toHandle ? handle(props.toHandle) : null,
    fromPosition: props.fromPosition,
    toPosition: props.toPosition,
    ownLineStyle: props.connectionLineStyle !== undefined,
    stroke: S.decodeUnknownSync(S.optional(S.String))(
      props.connectionLineStyle?.stroke
    ),
  }

  return (
    <path
      className="react-flow__connection-path"
      d={`M ${props.fromX},${props.fromY} L ${props.toX},${props.toY}`}
      style={props.connectionLineStyle}
    />
  )
}

const NodeView = () => (
  <div style={{ width: 120, height: 80, position: 'relative' }}>
    <XYFlow.Handle
      {...(request.unnamed ? {} : { id: 'out' })}
      type="source"
      position={XYFlow.Position.Right}
      style={{
        width: 10,
        height: 10,
        border: 0,
        top: '25%',
        right: -5,
        transform: 'translateY(-50%)',
      }}
    />
    <XYFlow.Handle
      {...(request.unnamed ? {} : { id: 'in' })}
      type="target"
      position={XYFlow.Position.Left}
      style={{
        width: 10,
        height: 10,
        border: 0,
        top: '75%',
        left: -5,
        transform: 'translateY(-50%)',
      }}
    />
  </div>
)

const nodeTypes = { probe: NodeView }

const initialNodes: ProbeNode[] = request.geometry
  ? [
      {
        id: 'parent',
        type: 'group',
        data: { role: 'parent' },
        position: { x: 300, y: 260 },
        style: { width: 200, height: 160 },
      },
      {
        id: 'a',
        type: 'probe',
        data: { role: 'source' },
        parentId: 'parent',
        origin: [1, 0],
        position: { x: 100, y: 80 },
      },
      {
        id: 'b',
        type: 'probe',
        data: { role: 'target' },
        position: { x: 800, y: 260 },
      },
    ]
  : [
      {
        id: 'a',
        type: 'probe',
        data: { role: 'source' },
        position: { x: 150, y: 180 },
      },
      {
        id: 'b',
        type: 'probe',
        data: { role: 'target' },
        position: { x: 650, y: 260 },
      },
    ]

const Probe = () => {
  const flow = XYFlow.useReactFlow<ProbeNode>()
  const ready = XYFlow.useNodesInitialized()
  const state = XYFlow.useConnection<ProbeNode>()
  useEffect(() => {
    Object.assign(window, {
      __originConnectionReady: ready,
      __originConnectionSnapshot: () => {
        const saved = flow.toObject()

        const nodes = saved.nodes.map((node) => {
          const internal = flow.getInternalNode(node.id)

          const element = document.querySelector<HTMLElement>(
            `.react-flow__node[data-id="${node.id}"]`
          )

          if (
            !internal ||
            !element ||
            internal.measured.width === undefined ||
            internal.measured.height === undefined
          ) {
            throw new Error(`Unmeasured node ${node.id}`)
          }

          return {
            id: node.id,
            parentId: node.parentId,
            position: point(node.position),
            origin: node.origin,
            ownOrigin: Object.hasOwn(node, 'origin'),
            absolutePosition: point(internal.internals.positionAbsolute),
            width: round(internal.measured.width),
            height: round(internal.measured.height),
            domBounds: bounds(element.getBoundingClientRect()),
            handles: [
              ...(internal.internals.handleBounds?.source ?? []),
              ...(internal.internals.handleBounds?.target ?? []),
            ].map(handle),
          }
        })

        const renderedEdges = [
          ...document.querySelectorAll<SVGPathElement>(
            '.react-flow__edge-path'
          ),
        ].map((path) => ({
          start: point(path.getPointAtLength(0)),
          end: point(path.getPointAtLength(path.getTotalLength())),
          path: path.getAttribute('d') ?? '',
        }))

        const preview = document.querySelector<SVGPathElement>(
          '.react-flow__connection-path'
        )

        return JSON.stringify(
          S.decodeUnknownSync(ObservationSchema)({
            nodes,
            edges: saved.edges.map((edge) => ({
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle,
              targetHandle: edge.targetHandle,
              ownSourceHandle: Object.hasOwn(edge, 'sourceHandle'),
              ownTargetHandle: Object.hasOwn(edge, 'targetHandle'),
            })),
            viewport: saved.viewport,
            state: {
              inProgress: state.inProgress,
              isValid: state.isValid,
              from: state.from && point(state.from),
              to: state.to && point(state.to),
              pointer: state.pointer && point(state.pointer),
              fromNode: state.fromNode?.id ?? null,
              toNode: state.toNode?.id ?? null,
              fromHandle: state.fromHandle && handle(state.fromHandle),
              toHandle: state.toHandle && handle(state.toHandle),
              fromPosition: state.fromPosition,
              toPosition: state.toPosition,
            },
            custom: state.inProgress ? custom : null,
            starts,
            ends,
            connections,
            errors: [...new Set(errors)],
            renderedEdges,
            previewPath: preview?.getAttribute('d') ?? null,
            previewClass:
              document
                .querySelector('.react-flow__connection')
                ?.getAttribute('class') ?? null,
            containerStyle:
              document
                .querySelector('.react-flow__connectionline')
                ?.getAttribute('style') ?? null,
            pathStyle: preview?.getAttribute('style') ?? null,
          })
        )
      },
    })
  }, [flow, ready, state])

  return null
}

const App = () => {
  const [edges, setEdges] = useState<XYFlow.Edge[]>(
    request.geometry
      ? [
          {
            id: 'initial',
            source: 'a',
            sourceHandle: 'out',
            target: 'b',
            targetHandle: 'in',
            type: 'straight',
          },
        ]
      : []
  )

  useEffect(() => {
    Object.assign(window, {
      __originConnectionAddNull: () =>
        setEdges((old) =>
          XYFlow.addEdge(
            {
              source: 'a',
              target: 'b',
              sourceHandle: null,
              targetHandle: null,
            },
            old
          )
        ),
    })
  }, [])

  return (
    <XYFlow.ReactFlowProvider>
      <XYFlow.ReactFlow<ProbeNode>
        defaultNodes={initialNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodeOrigin={[request.origin[0], request.origin[1]]}
        connectionMode={
          request.mode === 'strict'
            ? XYFlow.ConnectionMode.Strict
            : XYFlow.ConnectionMode.Loose
        }
        connectionDragThreshold={request.threshold}
        connectionRadius={20}
        connectOnClick={false}
        autoPanOnConnect={false}
        defaultViewport={{ x: 40, y: 50, zoom: request.zoom }}
        {...(request.lineType === null
          ? {}
          : { connectionLineType: lineTypes[request.lineType] })}
        {...(request.custom ? { connectionLineComponent: CustomLine } : {})}
        {...(request.styled
          ? {
              connectionLineStyle: { stroke: '#123456', strokeWidth: 3 },
              connectionLineContainerStyle: { opacity: 0.4 },
            }
          : {})}
        isValidConnection={() => !request.reject}
        onConnectStart={() => {
          starts += 1
        }}
        onConnectEnd={() => {
          ends += 1
        }}
        onConnect={(connection) => {
          connections.push(connection)
          setEdges((old) => XYFlow.addEdge(connection, old))
        }}
        onError={(code) => {
          errors.push(code)
        }}
      >
        <Probe />
      </XYFlow.ReactFlow>
    </XYFlow.ReactFlowProvider>
  )
}

const root = document.querySelector<HTMLElement>('#root')

if (!root) {
  throw new Error('Missing capture root')
}

createRoot(root).render(<App />)
