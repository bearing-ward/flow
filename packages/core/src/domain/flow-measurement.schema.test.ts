import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowGraph } from './flow-graph.ts'
import {
  NodeMeasurementInputSchema,
  advanceNodeMeasurementGeneration,
  applyNodeMeasurements,
  applyNodeMeasurement,
  areFlowNodesInitialized,
  emptyFlowMeasurementState,
  getFlowInternalNode,
  getFlowInternalNodes,
  projectFlowInternalNode,
  pruneFlowMeasurements,
} from './flow-measurement.schema.ts'
import {
  encodeSavedFlowSession,
  decodeSavedFlowSession,
} from './flow-persistence.ts'
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
  it.each([1, 100, 1000])(
    'does not revalidate %i accepted nodes when one DOM sample arrives',
    (nodeCount) => {
      const accepted = S.decodeUnknownSync(FlowDocumentSchema)({
        nodes: Array.from({ length: nodeCount }, (_, index) => ({
          id: `node-${index}`,
          label: `Node ${index}`,
          position: { x: index, y: 0 },
        })),
        edges: [],
      })

      let documentFieldReads = 0
      let sampleFieldReads = 0

      const observed = {
        ...accepted,
        nodes: accepted.nodes.map((node) => ({
          ...node,
          get label() {
            documentFieldReads += 1

            return node.label
          },
        })),
      }

      const measured = applyNodeMeasurements(
        observed,
        emptyFlowMeasurementState(),
        [
          {
            generation: 0,
            nodeId: id('node-0'),
            height: 48,
            get width() {
              sampleFieldReads += 1

              return 120
            },
          },
        ]
      )

      expect(measured.nodes).toStrictEqual([
        {
          generation: 0,
          handleDeclarations: [],
          measurement: {
            nodeId: 'node-0',
            width: 120,
            height: 48,
            handles: [],
          },
        },
      ])
      expect(measured.revision).toBe(1)
      expect({ documentFieldReads, sampleFieldReads }).toStrictEqual({
        documentFieldReads: 0,
        sampleFieldReads: 1,
      })
    }
  )

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
      handles: [],
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

  it('returns read-only internal node projections and leaves an empty graph uninitialized', () => {
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
      // Pinned system/src/utils/store.ts:140 starts readiness at nodes.length > 0.
      emptyReady: false,
      missing: undefined,
    })
  })

  it('projects every node in document order like the single-node read', () => {
    const state = applyNodeMeasurement(document, emptyFlowMeasurementState(), {
      generation: 1,
      height: 20,
      nodeId: id('child'),
      width: 30,
    })

    const all = getFlowInternalNodes(document, state)

    expect(all.map(({ node }) => node.id)).toStrictEqual(
      document.nodes.map((node) => node.id)
    )
    expect(all).toStrictEqual(
      document.nodes.map((node) =>
        getFlowInternalNode(document, state, node.id)
      )
    )
    expect(all.map(({ measurementStatus }) => measurementStatus)).toStrictEqual(
      ['unmeasured', 'measured', 'hidden']
    )
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

describe('generation-scoped measured handles', () => {
  const graph = S.decodeUnknownSync(FlowDocumentSchema)({
    nodes: [
      { id: 'parent', label: 'Parent', position: { x: 20, y: 30 } },
      {
        id: 'child',
        label: 'Child',
        parentId: 'parent',
        position: { x: 10, y: 12 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
    ],
    edges: [],
  })

  const sample = S.decodeUnknownSync(NodeMeasurementInputSchema)({
    generation: 0,
    nodeId: 'child',
    width: 100,
    height: 50,
    handles: [
      {
        nodeId: 'child',
        handleId: 'out',
        offset: { x: 100, y: 15 },
        width: 10,
        height: 12,
      },
    ],
  })

  it('invalidates bounds, handles and readiness together on generation replacement', () => {
    const measured = applyNodeMeasurement(
      graph,
      emptyFlowMeasurementState(),
      sample
    )

    const replaced = advanceNodeMeasurementGeneration(measured, id('child'))
    expect(
      getFlowInternalNode(graph, measured, id('child'))?.handles
    ).toHaveLength(1)
    expect(getFlowInternalNode(graph, replaced, id('child'))).toMatchObject({
      handles: [],
      measurementStatus: 'unmeasured',
    })
    expect(
      areFlowNodesInitialized(graph, replaced, {
        mountedNodeIds: new Set([id('child')]),
      })
    ).toBeFalsy()
    expect(applyNodeMeasurement(graph, replaced, sample).revision).toBe(
      replaced.revision
    )
  })

  it('replaces same-size handle geometry atomically and removes undeclared handles', () => {
    const before = applyNodeMeasurement(
      graph,
      emptyFlowMeasurementState(),
      sample
    )

    const after = applyNodeMeasurement(graph, before, {
      ...sample,
      handles: [],
    })

    expect(after.revision).toBe(before.revision + 1)
    expect(
      getFlowInternalNode(graph, after, id('child'))?.handles
    ).toStrictEqual([])

    const withoutHandle = {
      ...graph,
      nodes: graph.nodes.map((node) => ({ ...node, handles: [] })),
    }

    expect(
      getFlowInternalNode(withoutHandle, before, id('child'))?.handles
    ).toStrictEqual([])
  })

  it('detaches and freezes nested public handle geometry', () => {
    const state = applyNodeMeasurement(
      graph,
      emptyFlowMeasurementState(),
      sample
    )

    const value = getFlowInternalNode(graph, state, id('child'))
    const original = state.nodes[0]?.measurement.handles?.[0]

    if (value?.handles[0] === undefined || original === undefined) {
      throw new Error('Missing measured handle')
    }

    expect({
      absolute: value.absolutePosition,
      arrayFrozen: Object.isFrozen(value.handles),
      handleFrozen: Object.isFrozen(value.handles[0]),
      offsetFrozen: Object.isFrozen(value.handles[0].offset),
      handleDetached: value.handles[0] !== original,
      offsetDetached: value.handles[0].offset !== original.offset,
    }).toStrictEqual({
      absolute: { x: 30, y: 42 },
      arrayFrozen: true,
      handleFrozen: true,
      offsetFrozen: true,
      handleDetached: true,
      offsetDetached: true,
    })
    expect(Reflect.set(value.handles[0].offset, 'x', 999)).toBeFalsy()
    expect(original.offset.x).toBe(100)
  })

  it('filters inherited visibility and same-ID kind or side replacements', () => {
    const state = applyNodeMeasurement(
      graph,
      emptyFlowMeasurementState(),
      sample
    )

    const hidden = {
      ...graph,
      nodes: graph.nodes.map((node) =>
        node.id === id('parent') ? { ...node, hidden: true } : node
      ),
    }

    expect(getFlowInternalNode(hidden, state, id('child'))).toMatchObject({
      handles: [],
      measurementStatus: 'hidden',
    })
    expect(
      getFlowInternalNode({ ...graph, nodes: [] }, state, id('child'))
    ).toBeUndefined()

    for (const declaration of [
      { id: 'out', kind: 'target', side: 'right' },
      { id: 'out', kind: 'source', side: 'left' },
    ]) {
      const replaced = S.decodeUnknownSync(FlowDocumentSchema)({
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.id === id('child') ? { ...node, handles: [declaration] } : node
        ),
      })

      expect(
        getFlowInternalNode(replaced, state, id('child'))?.handles
      ).toStrictEqual([])
    }
  })

  it('keeps transient handles outside the unchanged saved-v1 contract', () => {
    const state = applyNodeMeasurement(
      graph,
      emptyFlowMeasurementState(),
      sample
    )

    const viewport = { x: 10, y: 20, zoom: 2 }
    const savedBefore = encodeSavedFlowSession(graph, viewport)
    const moved = applyNodeMeasurement(graph, state, { ...sample, handles: [] })

    expect(moved.revision).toBeGreaterThan(state.revision)
    expect(encodeSavedFlowSession(graph, viewport)).toStrictEqual(savedBefore)
    expect(
      Effect.runSync(decodeSavedFlowSession(savedBefore)).viewport
    ).toStrictEqual(viewport)
    expect(JSON.stringify(savedBefore)).not.toContain('offset')
    expect(S.encodeSync(FlowDocumentSchema)(graph)).not.toHaveProperty(
      'measurements'
    )
  })

  it('rejects nonfinite or negative measured geometry at the schema boundary', () => {
    expect(() =>
      S.decodeUnknownSync(NodeMeasurementInputSchema)({
        ...sample,
        handles: [{ ...sample.handles?.[0], width: -1 }],
      })
    ).toThrow('Expected')
    expect(() =>
      S.decodeUnknownSync(NodeMeasurementInputSchema)({
        ...sample,
        height: Number.NaN,
      })
    ).toThrow('Expected')
  })
})

describe('measurement dimension absence boundary', () => {
  it('keeps current hidden dimensions while clearing handles, and uses fallback without a sample', () => {
    const unmeasured = getFlowInternalNode(
      document,
      emptyFlowMeasurementState(),
      id('hidden')
    )

    expect(unmeasured).toMatchObject({
      width: 150,
      height: 44,
      measurementStatus: 'hidden',
      handles: [],
    })

    const measured = applyNodeMeasurement(
      document,
      emptyFlowMeasurementState(),
      {
        generation: 0,
        nodeId: id('hidden'),
        width: 91,
        height: 37,
      }
    )

    expect(getFlowInternalNode(document, measured, id('hidden'))).toMatchObject(
      { width: 91, height: 37, measurementStatus: 'hidden', handles: [] }
    )
  })

  it('rejects nullable or missing sample dimensions while preserving zero samples', () => {
    for (const dimension of ['width', 'height']) {
      for (const value of [null, undefined]) {
        expect(() =>
          S.decodeUnknownSync(NodeMeasurementInputSchema)({
            generation: 0,
            nodeId: 'child',
            width: 0,
            height: 0,
            [dimension]: value,
          })
        ).toThrow('Expected')
      }
    }

    expect(
      S.decodeUnknownSync(NodeMeasurementInputSchema)({
        generation: 0,
        nodeId: 'child',
        width: 0,
        height: 0,
      })
    ).toMatchObject({ width: 0, height: 0 })
  })
})

describe('paint graph internal-node projection', () => {
  it('projects detached live geometry and preserves accepted local positions', () => {
    const offset = { x: 80, y: 50 }
    const positions = new Map([[id('parent'), offset]])
    const graph = createFlowGraph(document, new Map(), positions)
    const item = graph.nodes.get(id('child'))
    const parent = graph.nodes.get(id('parent'))

    if (item === undefined || parent === undefined) {
      throw new Error('Missing fixture nodes')
    }

    const projected = projectFlowInternalNode(item)

    const live = projectFlowInternalNode(
      parent,
      undefined,
      positions.get(id('parent'))
    )

    offset.x = 100
    offset.y = 200
    expect({
      absolute: projected.absolutePosition,
      local: projected.node.position,
    }).toStrictEqual({ absolute: { x: 90, y: 62 }, local: { x: 10, y: 12 } })
    expect(live.node.position).toStrictEqual({ x: 80, y: 50 })
    expect(document.nodes[0]?.position).toStrictEqual({ x: 0, y: 0 })
    expect(
      [live, live.node, live.absolutePosition].every(Object.isFrozen)
    ).toBeTruthy()
  })
})
