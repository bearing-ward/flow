import { describe, expect, it } from 'vitest'

import {
  applyFlowLayoutPositions,
  getFlowLayoutInput,
  layoutCenterToTopLeft,
  orientFlowHandles,
} from './flow-layout.ts'
import type { FlowInternalNode } from './flow-measurement.schema.ts'
import type { FlowDocument } from './flow.schema.ts'

const document: FlowDocument = {
  nodes: [
    {
      id: 'a',
      label: 'a',
      position: { x: 0, y: 0 },
      handles: [
        { id: 'out-1', kind: 'source', side: 'right' },
        { id: 'in', kind: 'target', side: 'left' },
      ],
    },
    { id: 'b', label: 'b', position: { x: 0, y: 0 } },
    { id: 'c', label: 'c', position: { x: 0, y: 0 } },
    { id: 'h', label: 'h', position: { x: 0, y: 0 }, hidden: true },
    { id: 'child', label: 'child', position: { x: 0, y: 0 }, parentId: 'b' },
  ],
  edges: [
    { id: 'ab', source: 'a', sourceHandle: 'out-1', target: 'b' },
    { id: 'ac', source: 'a', target: 'c' },
    { id: 'ah', source: 'a', target: 'h' },
  ],
}

const internal = (
  id: string,
  width: number,
  height: number,
  handles: FlowInternalNode['handles'] = []
): FlowInternalNode => {
  const node = document.nodes.find((candidate) => candidate.id === id)

  if (node === undefined) {
    throw new Error(`missing ${id}`)
  }

  return {
    absolutePosition: { x: 0, y: 0 },
    handles,
    height,
    measurementStatus: 'measured',
    node,
    width,
  }
}

const handle = (handleId: string, x: number, y: number) => ({
  nodeId: 'a',
  handleId,
  offset: { x, y },
  width: 10,
  height: 10,
})

describe(getFlowLayoutInput, () => {
  it('uses measured sizes and handle boxes', () => {
    const lookup = new Map([
      [
        'a',
        internal('a', 180, 60, [
          handle('out-1', 180, 20),
          handle('stale', 0, 0),
        ]),
      ],
      ['b', internal('b', 120, 40)],
    ])

    const input = getFlowLayoutInput(document, (id) => lookup.get(id))

    expect(input.nodes).toStrictEqual([
      {
        id: 'a',
        width: 180,
        height: 60,
        handles: [
          {
            id: 'out-1',
            kind: 'source',
            side: 'right',
            x: 175,
            y: 15,
            width: 10,
            height: 10,
          },
        ],
      },
      { id: 'b', width: 120, height: 40, handles: [] },
    ])
    expect(input.edges).toStrictEqual([
      {
        id: 'ab',
        source: 'a',
        target: 'b',
        sourceHandle: 'out-1',
        targetHandle: undefined,
      },
    ])
    expect(input.unmeasured).toStrictEqual(['c'])
  })
})

describe(layoutCenterToTopLeft, () => {
  it('offsets by half the size', () => {
    expect(
      layoutCenterToTopLeft({ x: 100, y: 50 }, { width: 40, height: 20 })
    ).toStrictEqual({ x: 80, y: 40 })
  })
})

describe(applyFlowLayoutPositions, () => {
  it('rounds new positions and keeps unlisted nodes', () => {
    const next = applyFlowLayoutPositions(
      document.nodes,
      new Map([['a', { x: 10.4, y: 19.6 }]])
    )

    expect(next[0]?.position).toStrictEqual({ x: 10, y: 20 })
    expect(next[1]).toBe(document.nodes[1])
  })
})

describe(orientFlowHandles, () => {
  it('moves handles to the sides of the layout direction', () => {
    expect(
      orientFlowHandles(document.nodes.slice(0, 1), 'TB')[0]?.handles
    ).toStrictEqual([
      { id: 'out-1', kind: 'source', side: 'bottom' },
      { id: 'in', kind: 'target', side: 'top' },
    ])
    expect(
      orientFlowHandles(document.nodes.slice(0, 1), 'LR')[0]?.handles
    ).toStrictEqual([
      { id: 'out-1', kind: 'source', side: 'right' },
      { id: 'in', kind: 'target', side: 'left' },
    ])
  })
})
