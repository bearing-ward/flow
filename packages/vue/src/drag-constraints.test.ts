import { createFlowGraph, decodeFlowDocument, NodeIdSchema } from '@flow/core'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  flowVueEdgeLabelBox,
  flowVueLabelStyle,
} from './canvas-presentation.ts'
import { constrainFlowVueDrag } from './drag-constraints.ts'

const graph = createFlowGraph(
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'root',
          label: 'Root',
          position: { x: 103, y: 97 },
          size: { width: 100, height: 50 },
        },
        {
          id: 'other',
          label: 'Other',
          position: { x: 300, y: 300 },
          size: { width: 100, height: 50 },
        },
        {
          id: 'group',
          label: 'Group',
          position: { x: 300, y: 80 },
          size: { width: 240, height: 180 },
        },
        {
          id: 'clamped',
          label: 'Clamped',
          parentId: 'group',
          extent: 'parent',
          position: { x: 20, y: 40 },
          size: { width: 80, height: 40 },
        },
        {
          id: 'grower',
          label: 'Grower',
          parentId: 'group',
          expandParent: true,
          position: { x: 130, y: 110 },
          size: { width: 80, height: 40 },
        },
      ],
      edges: [],
    })
  )
)

const id = (value: string) => NodeIdSchema.make(value)

const member = (nodeId: string) => {
  const node = graph.nodes.get(id(nodeId))

  if (node === undefined) {
    throw new Error(`Missing ${nodeId}`)
  }

  return { nodeId: node.id, origin: node.node.position }
}

describe(constrainFlowVueDrag, () => {
  it('snaps the anchor absolute position and moves the group by the same delta', () => {
    const step = constrainFlowVueDrag({
      graph,
      members: [member('root'), member('other')],
      anchorId: id('root'),
      delta: { x: 40, y: 30 },
      snapGrid: { x: 25, y: 25 },
    })

    expect(step.positions.get(id('root'))).toStrictEqual({ x: 150, y: 125 })
    expect(step.positions.get(id('other'))).toStrictEqual({ x: 347, y: 328 })
    expect(step.expand).toStrictEqual([])
  })

  it('keeps root members inside nodeExtent as one group', () => {
    const step = constrainFlowVueDrag({
      graph,
      members: [member('root'), member('other')],
      anchorId: id('root'),
      delta: { x: -300, y: 0 },
      nodeExtent: { minX: 0, minY: 0, maxX: 700, maxY: 500 },
    })

    expect(step.positions.get(id('root'))).toStrictEqual({ x: 0, y: 97 })
    expect(step.positions.get(id('other'))).toStrictEqual({ x: 197, y: 300 })
  })

  it("clamps extent: 'parent' children to their parent box", () => {
    const step = constrainFlowVueDrag({
      graph,
      members: [member('clamped')],
      anchorId: id('clamped'),
      delta: { x: 400, y: -100 },
    })

    expect(step.positions.get(id('clamped'))).toStrictEqual({ x: 160, y: 0 })
  })

  it('grows the parent of an expandParent child instead of clamping it', () => {
    const step = constrainFlowVueDrag({
      graph,
      members: [member('grower')],
      anchorId: id('grower'),
      delta: { x: -200, y: 0 },
    })

    expect(step.positions.get(id('grower'))).toStrictEqual({ x: 0, y: 110 })
    expect(step.expand).toContainEqual({
      kind: 'position',
      nodeId: id('group'),
      position: { x: 230, y: 80 },
    })
    expect(step.expand).toContainEqual({
      kind: 'position',
      nodeId: id('clamped'),
      position: { x: 90, y: 40 },
    })
    expect(step.expand).toContainEqual({
      kind: 'size',
      nodeId: id('group'),
      size: { width: 310, height: 180 },
    })
  })
})

describe('Vue edge label presentation', () => {
  it('maps SVG label styles to HTML text and background styles', () => {
    expect(
      flowVueLabelStyle({ fill: '#0041d0', fontWeight: 700 }, 'text')
    ).toStrictEqual({ color: '#0041d0', 'font-weight': '700' })
    expect(
      flowVueLabelStyle(
        { fill: '#ffcc00', stroke: '#000', opacity: 0.5 },
        'background'
      )
    ).toStrictEqual({
      'background-color': '#ffcc00',
      border: '1px solid #000',
      opacity: '0.5',
    })
  })

  it('uses React label background defaults', () => {
    expect(flowVueEdgeLabelBox({})).toStrictEqual({
      padding: '4px 2px',
      borderRadius: '2px',
    })
    expect(
      flowVueEdgeLabelBox({ labelBgPadding: [8, 4], labelBgBorderRadius: 6 })
    ).toStrictEqual({ padding: '4px 8px', borderRadius: '6px' })
  })
})
