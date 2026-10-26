import { NodeResizer, ReactFlow, useNodesState } from '@xyflow/react'
import type {
  Node,
  NodeChange,
  ReactFlowInstance,
  ResizeParams,
} from '@xyflow/react'
import { useRef, useState } from 'react'

/** Release regression fixture for the two XYResizer changes in 12.12.0. */
export const ResizeRegression = () => {
  const [events, setEvents] = useState<
    readonly { readonly name: string; readonly params: ResizeParams }[]
  >([])

  const record = (name: string, params: ResizeParams) =>
    setEvents((previous) => [...previous, { name, params }])

  const [changes, setChanges] = useState<readonly (readonly NodeChange[])[]>([])
  const [mounted, setMounted] = useState(true)

  const instance = useRef<ReactFlowInstance | null>(null)

  const [nodes, , applyChanges] = useNodesState<Node>([
    {
      id: 'r',
      position: { x: 100, y: 100 },
      style: { width: 150, height: 80 },
      data: {
        label: (
          <>
            <NodeResizer
              isVisible
              shouldResize={(_event, params) => params.width <= 180}
              onResizeStart={(_event, params) => record('start', params)}
              onResize={(_event, params) => record('resize', params)}
              onResizeEnd={(_event, params) => record('end', params)}
            />
            Resize
          </>
        ),
      },
    },
  ])

  const controlled =
    new URLSearchParams(window.location.search).get('mode') !== 'uncontrolled'

  const onNodesChange = (next: NodeChange[]) => {
    setChanges((previous) => [...previous, next])

    if (controlled) {
      applyChanges(next)
    }
  }

  return (
    <>
      {mounted && (
        <ReactFlow
          {...(controlled ? { nodes } : { defaultNodes: nodes })}
          onNodesChange={onNodesChange}
          onInit={(flow) => {
            instance.current = flow
          }}
        />
      )}
      <button onClick={() => setChanges([])}>Clear changes</button>
      <button onClick={() => instance.current?.setNodes([])}>
        Remove node
      </button>
      <button onClick={() => setMounted(false)}>Unmount flow</button>
      <output data-testid="resize-node-changes">
        {JSON.stringify(changes)}
      </output>
      <output data-testid="resize-events">{JSON.stringify(events)}</output>
    </>
  )
}
