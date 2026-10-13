import { decodeFlowDocument, EdgeIdSchema, NodeIdSchema } from '@flow/core'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { useEdgesState, useNodesState } from './use-elements-state.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      { id: 'a', label: 'A', position: { x: 0, y: 0 } },
      { id: 'b', label: 'B', position: { x: 10, y: 0 } },
    ],
    edges: [{ id: 'e', source: 'a', target: 'b' }],
  })
)

describe('useNodesState and useEdgesState', () => {
  it('apply node deltas to the caller-owned array', () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(document.nodes)

    onNodesChange([
      {
        id: NodeIdSchema.make('a'),
        type: 'position',
        position: { x: 5, y: 6 },
      },
      { id: NodeIdSchema.make('b'), type: 'select', selected: true },
    ])

    expect(nodes.value.map(({ position }) => position)).toStrictEqual([
      { x: 5, y: 6 },
      { x: 10, y: 0 },
    ])
    expect(nodes.value[1]?.selected).toBeTruthy()

    setNodes((current) => current.slice(1))
    expect(nodes.value.map(({ id }) => id)).toStrictEqual(['b'])
  })

  it('apply edge deltas and replace the array with setEdges', () => {
    const [edges, setEdges, onEdgesChange] = useEdgesState(document.edges)

    onEdgesChange([{ id: EdgeIdSchema.make('e'), type: 'remove' }])
    expect(edges.value).toStrictEqual([])

    setEdges(document.edges)
    expect(edges.value).toStrictEqual(document.edges)
  })
})
