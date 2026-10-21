import * as XYFlow from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

const nodes: XYFlow.Node[] = [
  {
    id: 'parent',
    position: { x: 30, y: 40 },
    data: {},
    style: { width: 180, height: 160 },
    type: 'group',
  },
  {
    id: 'source',
    parentId: 'parent',
    position: { x: 20, y: 30 },
    data: { kind: 'source' },
    type: 'custom',
  },
  {
    id: 'target',
    position: { x: 350, y: 110 },
    data: { kind: 'target' },
    type: 'custom',
  },
]

const CustomNode = ({ data }: XYFlow.NodeProps) => (
  <div style={{ width: 120, height: 80, position: 'relative' }}>
    <XYFlow.Handle
      id={data.kind === 'source' ? 'out' : 'in'}
      type={data.kind === 'source' ? 'source' : 'target'}
      position={
        data.kind === 'source' ? XYFlow.Position.Right : XYFlow.Position.Left
      }
      style={{
        width: 10,
        height: 10,
        border: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        ...(data.kind === 'source' ? { right: -5 } : { left: -5 }),
      }}
    />
  </div>
)

const Probe = () => {
  const flow = XYFlow.useReactFlow()
  const update = XYFlow.useUpdateNodeInternals()
  const ready = XYFlow.useNodesInitialized()

  useEffect(() => {
    if (!ready) {
      return
    }

    const frame = (): Promise<void> => {
      const { promise, resolve } = Promise.withResolvers<undefined>()
      requestAnimationFrame(() => resolve())

      return promise
    }

    const observe = () => {
      const source = flow.getInternalNode('source')
      const target = flow.getInternalNode('target')
      const a = source?.internals.handleBounds?.source?.[0]
      const b = target?.internals.handleBounds?.target?.[0]

      if (
        source === undefined ||
        target === undefined ||
        a === undefined ||
        b === undefined
      ) {
        throw new Error('Missing upstream measurements')
      }

      const path = document.querySelector<SVGPathElement>(
        '.react-flow__edge path.react-flow__edge-path'
      )

      if (path === null) {
        throw new Error('Missing upstream edge')
      }

      const first = path.getPointAtLength(0)
      const last = path.getPointAtLength(path.getTotalLength())

      return {
        sourceHandle: a,
        targetHandle: b,
        source: {
          absolutePosition: source.internals.positionAbsolute,
          width: source.measured.width,
          height: source.measured.height,
          center: { x: a.x + a.width / 2, y: a.y + a.height / 2 },
        },
        target: {
          absolutePosition: target.internals.positionAbsolute,
          width: target.measured.width,
          height: target.measured.height,
          center: { x: b.x + b.width / 2, y: b.y + b.height / 2 },
        },
        endpoints: {
          start: { x: first.x, y: first.y },
          end: { x: last.x, y: last.y },
        },
      }
    }

    void (async () => {
      await frame()
      await frame()
      const initial = observe()

      const source = document.querySelector<HTMLElement>(
        '[data-id="source"] .react-flow__handle'
      )

      const target = document.querySelector<HTMLElement>(
        '[data-id="target"] .react-flow__handle'
      )

      if (source === null || target === null) {
        throw new Error('Missing upstream handles')
      }

      source.style.top = '25%'
      target.style.top = '75%'
      update(['source', 'target', 'source', 'absent'])
      await frame()
      await frame()
      await frame()
      const moved = observe()
      const extra = target.cloneNode(true)

      if (!(extra instanceof HTMLElement)) {
        throw new TypeError('Expected HTML clone')
      }

      extra.dataset.handleid = 'added'
      extra.style.top = '25%'
      target.parentElement?.append(extra)
      update(['target'])
      await frame()
      await frame()
      await frame()

      const added = flow
        .getInternalNode('target')
        ?.internals.handleBounds?.target?.map(({ id }) => id)

      extra.remove()
      update(['target'])
      await frame()
      await frame()
      await frame()

      const removed = flow
        .getInternalNode('target')
        ?.internals.handleBounds?.target?.map(({ id }) => id)

      Object.assign(window, {
        __handleRefreshCapture: JSON.stringify({
          initial,
          moved,
          added,
          removed,
          nodePositions: flow
            .getNodes()
            .map(({ id, position }) => ({ id, position })),
          viewport: flow.getViewport(),
        }),
      })
    })()
  }, [ready])

  return null
}

const root = document.querySelector<HTMLElement>('#root')

if (root === null) {
  throw new Error('Missing reference mount')
}

createRoot(root).render(
  <XYFlow.ReactFlowProvider>
    <XYFlow.ReactFlow
      defaultNodes={nodes}
      defaultEdges={[
        {
          id: 'initial',
          source: 'source',
          sourceHandle: 'out',
          target: 'target',
          targetHandle: 'in',
          type: 'straight',
        },
      ]}
      nodeTypes={{ custom: CustomNode }}
      defaultViewport={{ x: 10, y: 20, zoom: 1 }}
    >
      <Probe />
    </XYFlow.ReactFlow>
  </XYFlow.ReactFlowProvider>
)
