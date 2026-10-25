import { NodeResizer, ReactFlow, useNodesState } from '@xyflow/react'
import type { ResizeParams } from '@xyflow/react'
import { useState } from 'react'

/** Release regression fixture for the two XYResizer changes in 12.12.0. */
export const ResizeRegression = () => {
  const [events, setEvents] = useState<
    readonly { readonly name: string; readonly params: ResizeParams }[]
  >([])

  const record = (name: string, params: ResizeParams) =>
    setEvents((previous) => [...previous, { name, params }])

  const [nodes, , onNodesChange] = useNodesState([
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

  return (
    <>
      <ReactFlow nodes={nodes} onNodesChange={onNodesChange} />
      <output data-testid="resize-events">{JSON.stringify(events)}</output>
    </>
  )
}
