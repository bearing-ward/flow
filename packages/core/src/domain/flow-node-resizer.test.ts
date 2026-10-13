import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { calculateFlowExpandParent } from './flow-expand-parent.ts'
import { createFlowGraph } from './flow-graph.ts'
import {
  calculateFlowNodeResizerDimensions,
  FlowNodeResizeConstraintsSchema,
  FlowResizeParamsWithDirectionSchema,
  getFlowResizeControlDirection,
  getFlowResizeDirection,
  startFlowNodeResize,
  stepFlowNodeResize,
} from './flow-node-resizer.ts'
import type { FlowNodeResizerDimensionsInput } from './flow-node-resizer.ts'
import { NodeIdSchema } from './flow-values.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const start = { x: 0, y: 0, width: 100, height: 50 }

const resize = (
  input: Partial<FlowNodeResizerDimensionsInput> &
    Pick<FlowNodeResizerDimensionsInput, 'controlPosition' | 'delta'>
) => calculateFlowNodeResizerDimensions({ start, ...input })

describe('NodeResizer contracts', () => {
  it('decodes resize params and constraints', () => {
    expect(
      S.decodeUnknownSync(FlowResizeParamsWithDirectionSchema)({
        ...start,
        direction: [1, -1],
      })
    ).toStrictEqual({ ...start, direction: [1, -1] })
    expect(
      S.decodeUnknownSync(FlowNodeResizeConstraintsSchema)({
        minWidth: 10,
        maxWidth: Number.MAX_VALUE,
        keepAspectRatio: true,
      })
    ).toMatchObject({ keepAspectRatio: true })
    expect(() =>
      S.decodeUnknownSync(FlowNodeResizeConstraintsSchema)({ minWidth: -1 })
    ).toThrow(/Expected/u)
  })

  it('parses control positions and resize directions like React', () => {
    expect(getFlowResizeControlDirection('top-left')).toStrictEqual({
      isHorizontal: true,
      isVertical: true,
      affectsX: true,
      affectsY: true,
    })
    expect(getFlowResizeControlDirection('bottom')).toStrictEqual({
      isHorizontal: false,
      isVertical: true,
      affectsX: false,
      affectsY: false,
    })
    expect(
      getFlowResizeDirection({
        width: 120,
        prevWidth: 100,
        height: 40,
        prevHeight: 50,
        affectsX: true,
        affectsY: false,
      })
    ).toStrictEqual([-1, -1])
    expect(
      getFlowResizeDirection({
        width: 100,
        prevWidth: 100,
        height: 60,
        prevHeight: 50,
        affectsX: false,
        affectsY: true,
      })
    ).toStrictEqual([0, -1])
  })
})

describe('getDimensionsAfterResize port', () => {
  it('resizes from each side and corner', () => {
    expect(
      resize({ controlPosition: 'bottom-right', delta: { x: 50, y: 30 } })
    ).toStrictEqual({ x: 0, y: 0, width: 150, height: 80 })
    expect(
      resize({ controlPosition: 'left', delta: { x: -20, y: 99 } })
    ).toStrictEqual({ x: -20, y: 0, width: 120, height: 50 })
    expect(
      resize({ controlPosition: 'top', delta: { x: 0, y: 10.7 } })
    ).toStrictEqual({ x: 0, y: 10, width: 100, height: 40 })
  })

  it('honours React min and max defaults and explicit limits', () => {
    expect(
      resize({ controlPosition: 'right', delta: { x: -95, y: 0 } }).width
    ).toBe(10)
    expect(
      resize({
        controlPosition: 'right',
        delta: { x: 50, y: 0 },
        constraints: { maxWidth: 120 },
      }).width
    ).toBe(120)
    expect(
      resize({
        controlPosition: 'top-left',
        delta: { x: 80, y: 30 },
        constraints: { minWidth: 40, minHeight: 30 },
      })
    ).toStrictEqual({ x: 60, y: 20, width: 40, height: 30 })
  })

  it('keeps the aspect ratio on sides and corners', () => {
    expect(
      resize({
        controlPosition: 'right',
        delta: { x: 50, y: 0 },
        constraints: { keepAspectRatio: true },
      })
    ).toStrictEqual({ x: 0, y: 0, width: 150, height: 75 })
    expect(
      resize({
        controlPosition: 'bottom-right',
        delta: { x: 50, y: 10 },
        constraints: { keepAspectRatio: true },
      })
    ).toStrictEqual({ x: 0, y: 0, width: 150, height: 75 })
    expect(
      resize({
        controlPosition: 'right',
        delta: { x: 100, y: 0 },
        constraints: { keepAspectRatio: true, maxHeight: 60 },
      })
    ).toStrictEqual({ x: 0, y: 0, width: 120, height: 60 })
  })

  it('stops at the extent and at children kept inside', () => {
    expect(
      resize({
        controlPosition: 'right',
        delta: { x: 100, y: 0 },
        extent: { minX: 0, minY: 0, maxX: 150, maxY: 100 },
      }).width
    ).toBe(150)
    expect(
      resize({
        controlPosition: 'left',
        delta: { x: 80, y: 0 },
        childExtent: { minX: 50, minY: 0, maxX: 70, maxY: 20 },
      })
    ).toStrictEqual({ x: 50, y: 0, width: 50, height: 50 })
  })

  it('keeps the node origin anchored', () => {
    expect(
      calculateFlowNodeResizerDimensions({
        controlPosition: 'right',
        start: { x: 50, y: 25, width: 100, height: 50 },
        delta: { x: 20, y: 0 },
        nodeOrigin: [0.5, 0.5],
      })
    ).toStrictEqual({ x: 60, y: 25, width: 120, height: 50 })
  })
})

describe('XYResizer drag steps', () => {
  const childId = NodeIdSchema.make('child')

  it('reports no step without a change', () => {
    const session = startFlowNodeResize({
      controlPosition: 'bottom-right',
      start,
    })

    expect(stepFlowNodeResize(session, { x: 0.4, y: 0 }).step).toBeUndefined()
  })

  it('moves position, compensates children and reports the direction', () => {
    const session = startFlowNodeResize({
      controlPosition: 'top-left',
      start,
      children: [{ id: childId, position: { x: 10, y: 10 } }],
    })

    const first = stepFlowNodeResize(session, { x: -10, y: -20 })

    expect(first.step).toStrictEqual({
      params: { x: -10, y: -20, width: 110, height: 70, direction: [-1, -1] },
      position: { x: -10, y: -20 },
      size: { width: 110, height: 70 },
      childPositions: [{ id: childId, position: { x: 20, y: 30 } }],
    })

    const second = stepFlowNodeResize(first.session, { x: 5, y: -20 })

    expect(second.step?.params).toStrictEqual({
      x: 5,
      y: -20,
      width: 95,
      height: 70,
      direction: [1, 0],
    })
    expect(second.step?.childPositions).toStrictEqual([
      { id: childId, position: { x: 5, y: 30 } },
    ])
  })

  it('restricts a control to its resize direction', () => {
    const session = startFlowNodeResize({
      controlPosition: 'bottom-right',
      start,
      resizeDirection: 'horizontal',
    })

    expect(
      stepFlowNodeResize(session, { x: 20, y: 20 }).step?.size
    ).toStrictEqual({ width: 120, height: 50 })
  })

  it('holds an expandParent child at the parent edge', () => {
    const session = startFlowNodeResize({
      controlPosition: 'left',
      start: { x: 5, y: 5, width: 50, height: 50 },
      expandParent: true,
    })

    const { session: next, step } = stepFlowNodeResize(session, {
      x: -15,
      y: 0,
    })

    expect(step?.position).toStrictEqual({ x: -10, y: 5 })
    expect(step?.params.x).toBe(0)
    expect(next.start.x).toBe(15)
  })
})

describe('expandParent', () => {
  it('grows the parent and keeps siblings in place, like handleExpandParent', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'parent',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
          },
          {
            id: 'moved',
            label: 'Moved',
            parentId: 'parent',
            expandParent: true,
            position: { x: 80, y: -20 },
            size: { width: 40, height: 40 },
          },
          {
            id: 'sibling',
            label: 'Sibling',
            parentId: 'parent',
            position: { x: 10, y: 10 },
            size: { width: 10, height: 10 },
          },
        ],
        edges: [],
      })
    )

    const graph = createFlowGraph(document)

    expect(
      calculateFlowExpandParent(graph, [
        {
          id: NodeIdSchema.make('moved'),
          parentId: NodeIdSchema.make('parent'),
          rect: { x: 80, y: -20, width: 40, height: 40 },
        },
      ])
    ).toStrictEqual([
      { kind: 'position', nodeId: 'parent', position: { x: 0, y: -20 } },
      { kind: 'position', nodeId: 'sibling', position: { x: 10, y: 30 } },
      { kind: 'size', nodeId: 'parent', size: { width: 120, height: 120 } },
    ])
    expect(
      calculateFlowExpandParent(graph, [
        {
          id: NodeIdSchema.make('moved'),
          parentId: NodeIdSchema.make('parent'),
          rect: { x: 10, y: 10, width: 20, height: 20 },
        },
      ])
    ).toStrictEqual([])
  })
})
