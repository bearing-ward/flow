import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { getNodesBounds, toFlowObject } from './flow-instance.ts'
import {
  FlowMeasurementStateSchema,
  getFlowInternalNode,
} from './flow-measurement.schema.ts'
import type { FlowInternalNode } from './flow-measurement.schema.ts'
import { createFlowSnapshot } from './flow-snapshot.ts'
import { FlowDocumentSchema } from './flow.schema.ts'

const document = S.decodeUnknownSync(FlowDocumentSchema)({
  nodes: [
    {
      id: 'a',
      label: 'a',
      position: { x: 0, y: 0 },
      size: { width: 50, height: 25 },
    },
    {
      id: 'b',
      label: 'b',
      position: { x: 100, y: 100 },
      size: { width: 50, height: 25 },
    },
    {
      id: 'child',
      label: 'child',
      parentId: 'b',
      position: { x: 10, y: 10 },
      size: { width: 100, height: 100 },
    },
  ],
  edges: [{ id: 'e', source: 'a', target: 'b' }],
})

const measurementState = S.decodeUnknownSync(FlowMeasurementStateSchema)({
  generations: [{ nodeId: 'a', generation: 1 }],
  nodes: [
    {
      generation: 1,
      measurement: { nodeId: 'a', width: 80, height: 40 },
    },
  ],
  revision: 1,
})

const lookup = new Map(
  document.nodes.flatMap(({ id }): [string, FlowInternalNode][] => {
    const internal = getFlowInternalNode(document, measurementState, id)

    return internal === undefined ? [] : [[id, internal]]
  })
)

describe(getNodesBounds, () => {
  it("matches React Flow's documented example for plain nodes", () => {
    expect(getNodesBounds(document.nodes.slice(0, 2))).toStrictEqual({
      x: 0,
      y: 0,
      width: 150,
      height: 125,
    })
  })

  it('resolves ids and nodes through a lookup for measured, absolute bounds', () => {
    expect(
      getNodesBounds(['a', 'child'], { nodeLookup: lookup })
    ).toStrictEqual({ x: 0, y: 0, width: 210, height: 210 })
    expect(
      getNodesBounds(document.nodes.slice(0, 1), { nodeLookup: lookup })
    ).toStrictEqual({ x: 0, y: 0, width: 80, height: 40 })
  })

  it('skips unresolved items and returns a zero rect for none', () => {
    expect(getNodesBounds([])).toStrictEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    })
    expect(getNodesBounds(['missing'])).toStrictEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    })
    expect(
      getNodesBounds(['missing', 'b'], { nodeLookup: lookup })
    ).toStrictEqual({ x: 100, y: 100, width: 50, height: 25 })
  })

  it('applies the node origin to plain nodes', () => {
    expect(
      getNodesBounds(document.nodes.slice(0, 1), { nodeOrigin: [0.5, 0.5] })
    ).toStrictEqual({ x: -25, y: -12.5, width: 50, height: 25 })
  })

  it('accepts internal nodes and candidates directly', () => {
    expect(
      getNodesBounds([
        { id: 'r', bounds: { x: -10, y: -10, width: 5, height: 5 } },
        ...lookup.values(),
      ])
    ).toStrictEqual({ x: -10, y: -10, width: 220, height: 220 })
  })
})

describe(toFlowObject, () => {
  it('returns detached nodes, edges and viewport', () => {
    const snapshot = createFlowSnapshot(document, { x: 1, y: 2, zoom: 3 })
    const object = toFlowObject(snapshot)

    expect(object.viewport).toStrictEqual({ x: 1, y: 2, zoom: 3 })
    expect(object.nodes.map(({ id }) => id)).toStrictEqual(['a', 'b', 'child'])
    expect(object.edges).toStrictEqual(document.edges)
    expect(object).not.toHaveProperty('nodeOrigin')
  })

  it('returns mutable copies that leave the snapshot alone', () => {
    const snapshot = createFlowSnapshot(document, { x: 1, y: 2, zoom: 3 })
    const object = toFlowObject(snapshot)

    object.nodes.pop()
    expect(snapshot.document.nodes).toHaveLength(3)
    expect(Object.isFrozen(object.nodes)).toBeFalsy()
  })

  it('keeps a document node origin', () => {
    const snapshot = createFlowSnapshot(
      { ...document, nodeOrigin: [0.5, 0.5] },
      { x: 0, y: 0, zoom: 1 }
    )

    expect(toFlowObject(snapshot).nodeOrigin).toStrictEqual([0.5, 0.5])
  })
})
