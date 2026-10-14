import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { EdgeIdSchema, NodeIdSchema } from './flow-values.ts'
import { computeFlowStacking, FlowZIndexModeSchema } from './flow-z-index.ts'

const id = (value: string) => NodeIdSchema.make(value)

const node = (
  value: string,
  parent?: string,
  extra: { readonly zIndex?: number; readonly selected?: boolean } = {}
) =>
  parent === undefined
    ? { id: id(value), ...extra }
    : { id: id(value), parentId: id(parent), ...extra }

const z = (stacking: ReturnType<typeof computeFlowStacking>) =>
  Object.fromEntries(stacking.nodes)

describe('z-index modes', () => {
  it('decodes the React ZIndexMode literals', () => {
    expect(S.decodeUnknownSync(FlowZIndexModeSchema)('auto')).toBe('auto')
    expect(() => S.decodeUnknownSync(FlowZIndexModeSchema)('none')).toThrow(
      /Expected/u
    )
  })

  it('basic: elevates selected nodes and keeps children above parents', () => {
    expect(
      z(
        computeFlowStacking({
          nodes: [
            node('A'),
            node('a1', 'A'),
            node('a2', 'A', { zIndex: 5 }),
            node('B', undefined, { selected: true }),
            node('C', undefined, { zIndex: 2, selected: true }),
          ],
        })
      )
    ).toStrictEqual({ A: 0, a1: 1, a2: 5, B: 1000, C: 1002 })
  })

  it('basic without elevateNodesOnSelect ignores selection', () => {
    expect(
      z(
        computeFlowStacking({
          nodes: [node('B', undefined, { selected: true })],
          elevateNodesOnSelect: false,
        })
      )
    ).toStrictEqual({ B: 0 })
  })

  it('auto: separates root sub flows, including React counter reuse', () => {
    expect(
      z(
        computeFlowStacking({
          zIndexMode: 'auto',
          nodes: [
            node('A'),
            node('a1', 'A'),
            node('C'),
            node('c1', 'C'),
            node('a2', 'A'),
            node('D'),
            node('d1', 'D'),
            node('d1x', 'd1'),
          ],
        })
      )
    ).toStrictEqual({
      A: 10,
      a1: 11,
      C: 20,
      c1: 21,
      a2: 11,
      D: 20,
      d1: 21,
      d1x: 22,
    })
  })

  it('manual: applies zIndex only, children still above an equal parent', () => {
    expect(
      z(
        computeFlowStacking({
          zIndexMode: 'manual',
          nodes: [
            node('A', undefined, { selected: true }),
            node('a1', 'A'),
            node('a2', 'A', { zIndex: 7 }),
          ],
        })
      )
    ).toStrictEqual({ A: 0, a1: 1, a2: 7 })
  })

  it('visits a parent listed after its child first', () => {
    expect(
      z(
        computeFlowStacking({
          nodes: [node('a1', 'A'), node('A', undefined, { zIndex: 3 })],
        })
      )
    ).toStrictEqual({ a1: 4, A: 3 })
  })

  it('stacks edges like getElevatedEdgeZIndex', () => {
    const nodes = [
      node('A'),
      node('a1', 'A'),
      node('B', undefined, { selected: true }),
    ]

    const edges = [
      {
        id: EdgeIdSchema.make('child-edge'),
        source: id('a1'),
        target: id('B'),
      },
      {
        id: EdgeIdSchema.make('selected-edge'),
        source: id('a1'),
        target: id('B'),
        selected: true,
        zIndex: 2,
      },
    ]

    expect(
      Object.fromEntries(computeFlowStacking({ nodes, edges }).edges)
    ).toStrictEqual({ 'child-edge': 1, 'selected-edge': 3 })
    expect(
      Object.fromEntries(
        computeFlowStacking({ nodes, edges, elevateEdgesOnSelect: true }).edges
      )
    ).toStrictEqual({ 'child-edge': 1000, 'selected-edge': 2002 })
    expect(
      Object.fromEntries(
        computeFlowStacking({ nodes, edges, zIndexMode: 'manual' }).edges
      )
    ).toStrictEqual({ 'child-edge': 0, 'selected-edge': 2 })
  })
})
