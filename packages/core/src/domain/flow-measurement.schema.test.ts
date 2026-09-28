import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  advanceNodeMeasurementGeneration,
  applyNodeMeasurements,
  applyNodeMeasurement,
  areFlowNodesInitialized,
  emptyFlowMeasurementState,
  getFlowInternalNode,
  pruneFlowMeasurements,
} from './flow-measurement.schema.ts'
import { FlowDocumentSchema, NodeIdSchema } from './flow.schema.ts'
import type { FlowDocument } from './flow.schema.ts'

const id = (value: string) => S.decodeUnknownSync(NodeIdSchema)(value)

const document: FlowDocument = S.decodeUnknownSync(FlowDocumentSchema)({
  nodes: [
    {
      id: 'parent',
      label: 'Parent',
      position: { x: 0, y: 0 },
    },
    {
      id: 'child',
      label: 'Child',
      parentId: 'parent',
      position: { x: 10, y: 12 },
    },
    {
      hidden: true,
      id: 'hidden',
      label: 'Hidden',
      position: { x: 20, y: 30 },
    },
  ],
  edges: [],
})

describe('flow measurement state', () => {
  it('tracks zero-size measurements independently from document readiness', () => {
    const initial = emptyFlowMeasurementState()

    const measured = applyNodeMeasurement(document, initial, {
      generation: 1,
      height: 0,
      nodeId: id('parent'),
      width: 0,
    })

    expect(initial.nodes).toStrictEqual([])
    expect(measured.nodes[0]?.measurement).toStrictEqual({
      height: 0,
      nodeId: id('parent'),
      width: 0,
    })
    expect(measured.revision).toBe(1)
    expect(areFlowNodesInitialized(document, measured)).toBeFalsy()
  })

  it('uses measured node ids for visible readiness and can include hidden nodes', () => {
    let state = emptyFlowMeasurementState()

    for (const nodeId of ['parent', 'child']) {
      state = applyNodeMeasurement(document, state, {
        generation: 1,
        height: 10,
        nodeId: id(nodeId),
        width: 10,
      })
    }

    expect(areFlowNodesInitialized(document, state)).toBeTruthy()
    expect(
      areFlowNodesInitialized(document, state, { includeHidden: true })
    ).toBeFalsy()
  })

  it('returns read-only internal node projections and initializes an empty graph', () => {
    const state = applyNodeMeasurement(document, emptyFlowMeasurementState(), {
      generation: 1,
      height: 0,
      nodeId: id('child'),
      width: 0,
    })

    const child = getFlowInternalNode(document, state, id('child'))

    expect({
      absolutePosition: child?.absolutePosition,
      width: child?.width,
      height: child?.height,
      status: child?.measurementStatus,
      frozen: Object.isFrozen(child),
      nodeFrozen: Object.isFrozen(child?.node),
      emptyReady: areFlowNodesInitialized({ nodes: [], edges: [] }, state),
      missing: getFlowInternalNode(document, state, id('missing')),
    }).toStrictEqual({
      absolutePosition: { x: 10, y: 12 },
      width: 0,
      height: 0,
      status: 'measured',
      frozen: true,
      nodeFrozen: true,
      emptyReady: true,
      missing: undefined,
    })
  })

  it('ignores stale results and nodes removed from the accepted document', () => {
    const first = applyNodeMeasurement(document, emptyFlowMeasurementState(), {
      generation: 2,
      height: 44,
      nodeId: id('parent'),
      width: 150,
    })

    const stale = applyNodeMeasurement(document, first, {
      generation: 1,
      height: 99,
      nodeId: id('parent'),
      width: 99,
    })

    const removed = pruneFlowMeasurements({ nodes: [], edges: [] }, stale)

    const unknown = applyNodeMeasurement({ nodes: [], edges: [] }, removed, {
      generation: 3,
      height: 10,
      nodeId: id('parent'),
      width: 10,
    })

    expect(stale).toStrictEqual(first)
    expect(removed.nodes).toStrictEqual([])
    expect(removed.revision).toBe(first.revision + 1)
    expect(unknown).toStrictEqual(removed)
  })

  it('applies an observer batch with the same stale and revision semantics', () => {
    const initial = emptyFlowMeasurementState()

    const measured = applyNodeMeasurements(document, initial, [
      { generation: 2, height: 44, nodeId: id('parent'), width: 150 },
      { generation: 1, height: 12, nodeId: id('child'), width: 30 },
    ])

    const staleBatch = applyNodeMeasurements(document, measured, [
      { generation: 1, height: 99, nodeId: id('parent'), width: 99 },
      { generation: 2, height: 44, nodeId: id('parent'), width: 150 },
    ])

    expect(measured.nodes).toHaveLength(2)
    expect(measured.revision).toBe(2)
    expect(staleBatch).toStrictEqual(measured)
    expect(initial.nodes).toStrictEqual([])
  })

  it('rejects an old delivery after removal and same-id replacement', () => {
    const measured = applyNodeMeasurement(
      document,
      emptyFlowMeasurementState(),
      { generation: 4, height: 44, nodeId: id('parent'), width: 150 }
    )

    const removed = pruneFlowMeasurements({ nodes: [], edges: [] }, measured)
    const replacement = advanceNodeMeasurementGeneration(removed, id('parent'))

    const stale = applyNodeMeasurement(document, replacement, {
      generation: 4,
      height: 20,
      nodeId: id('parent'),
      width: 20,
    })

    expect(stale.nodes).toStrictEqual([])
    expect(stale.revision).toBe(replacement.revision)
  })

  it('rejects non-finite and negative dimensions at the schema boundary', () => {
    const invalid = [Number.NaN, Number.POSITIVE_INFINITY, -1]

    for (const width of invalid) {
      expect(() =>
        applyNodeMeasurement(document, emptyFlowMeasurementState(), {
          generation: 1,
          height: 10,
          nodeId: id('parent'),
          width,
        })
      ).toThrow('Expected')
    }
  })
})
