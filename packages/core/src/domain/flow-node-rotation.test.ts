import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { copyFlowSelection, pasteFlowGraphFragment } from './flow-clipboard.ts'
import { getEdgesGeometry, getFlowNodeBounds } from './flow-edge-geometry.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import { fitViewportToNodes } from './flow-fit-view.ts'
import { createFlowGraph, graphBounds } from './flow-graph.ts'
import { groupNodes, reparentNode } from './flow-grouping.ts'
import { solveFlowAlignment } from './flow-helper-lines.ts'
import { createFlowHistory, reduceFlowHistory } from './flow-history.ts'
import { prepareFlowImageExport } from './flow-image-export.ts'
import { getNodesBounds } from './flow-instance.ts'
import {
  boundedNodeRect,
  getInternalNodeLayoutBounds,
} from './flow-intersection.ts'
import {
  getFlowInternalNodes,
  emptyFlowMeasurementState,
} from './flow-measurement.schema.ts'
import {
  FlowNodeRotationSchema,
  reduceFlowRotation,
  rotatedFlowBounds,
  startFlowRotation,
  unrotateFlowHandle,
} from './flow-node-rotation.ts'
import {
  decodeSavedFlowDocument,
  decodeVersionedFlowDocument,
  decodeVersionedFlowSession,
  encodeSavedFlowDocument,
  encodeVersionedFlowDocument,
  encodeVersionedFlowSession,
} from './flow-persistence.ts'
import { SavedFlowFormatError } from './flow-save-format-error.ts'
import { nodeIntersectsViewport } from './flow-visibility.schema.ts'
import { decodeFlowDocument, NodeIdSchema } from './flow.schema.ts'

const document = (rotation = 90) =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 100, y: 100 },
          size: { width: 160, height: 80 },
          rotation,
          selected: true,
          sourcePosition: 'right',
          targetPosition: 'left',
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 400, y: 100 },
          size: { width: 100, height: 100 },
          sourcePosition: 'right',
          targetPosition: 'left',
        },
      ],
      edges: [{ id: 'ab', source: 'a', target: 'b', path: 'straight' }],
    })
  )

const nodeId = NodeIdSchema.make('a')

const expectRect = (
  rect: { x: number; y: number; width: number; height: number } | undefined
) => {
  expect(rect?.x).toBeCloseTo(140)
  expect(rect?.y).toBeCloseTo(60)
  expect(rect?.width).toBeCloseTo(80)
  expect(rect?.height).toBeCloseTo(160)
}

describe('node rotation', () => {
  it('decodes finite angles and rejects nonfinite input', () => {
    expect(S.decodeUnknownSync(FlowNodeRotationSchema)(-450)).toBe(-450)

    for (const invalid of [Number.NaN, Infinity, '90', null]) {
      expect(S.decodeUnknownExit(FlowNodeRotationSchema)(invalid)._tag).toBe(
        'Failure'
      )
    }

    expect(
      Effect.runSyncExit(
        decodeFlowDocument({
          nodes: [
            { id: 'a', label: 'A', position: { x: 0, y: 0 }, rotation: '90' },
          ],
          edges: [],
        })
      )._tag
    ).toBe('Failure')
  })

  it('preserves the grab offset, wraps angles and restores the exact baseline on cancel', () => {
    const start = startFlowRotation({
      nodeId,
      center: { x: 100, y: 100 },
      pointer: { x: 150, y: 100 },
      rotation: 350,
    })

    const moved = reduceFlowRotation(start, {
      kind: 'move',
      pointer: { x: 100, y: 150 },
    })

    expect(moved.rotation).toBe(80)
    expect(
      reduceFlowRotation(moved, { kind: 'move', pointer: { x: 100, y: 100 } })
        .rotation
    ).toBe(80)
    expect(reduceFlowRotation(moved, { kind: 'cancel' })).toMatchObject({
      phase: 'cancelled',
      rotation: 350,
    })
    const completed = reduceFlowRotation(moved, { kind: 'complete' })
    expect(
      reduceFlowRotation(completed, { kind: 'move', pointer: { x: 0, y: 100 } })
    ).toBe(completed)
  })

  it('reduces large finite angles before adding pointer travel', () => {
    const start = startFlowRotation({
      nodeId,
      center: { x: 0, y: 0 },
      pointer: { x: 1, y: 0 },
      rotation: 2 ** 60,
    })

    const result = reduceFlowRotation(start, {
      kind: 'move',
      pointer: { x: 0, y: 1 },
    })

    expect(result.rotation).toBe(226)
    expect(reduceFlowRotation(result, { kind: 'cancel' }).rotation).toBe(
      2 ** 60
    )
  })

  it('uses rotated visual bounds for public bounds, culling and fitting, while retaining physical coordinates', () => {
    const input = document()
    const graph = createFlowGraph(input)
    expectRect(graphBounds(graph, new Set([nodeId])))
    expectRect(getNodesBounds(input.nodes.slice(0, 1)))
    expectRect(getFlowNodeBounds(input)[0]?.bounds)
    const [internal] = getFlowInternalNodes(input, emptyFlowMeasurementState())
    expect(internal?.absolutePosition).toStrictEqual({ x: 100, y: 100 })

    if (internal === undefined) {
      throw new Error('Missing internal node')
    }

    expectRect(boundedNodeRect(internal))
    expect(getInternalNodeLayoutBounds(internal).bounds).toStrictEqual({
      x: 100,
      y: 100,
      width: 160,
      height: 80,
    })
    expect(
      nodeIntersectsViewport(graph, nodeId, {
        x: 150,
        y: 62,
        width: 10,
        height: 10,
      })
    ).toBeTruthy()
  })

  it('fits the entire rotated visual inside the viewport', () => {
    const input = document()

    const viewport = fitViewportToNodes({
      document: input,
      nodeIds: new Set([nodeId]),
      measurements: new Map(),
      currentViewport: { x: 0, y: 0, zoom: 1 },
      paneWidth: 400,
      paneHeight: 400,
      limits: { minZoom: 0.1, maxZoom: 10 },
      padding: 0,
    })

    expect(viewport.zoom).toBeCloseTo(2.5)
    expect(viewport.x).toBeCloseTo(-250)
    expect(viewport.y).toBeCloseTo(-150)
  })

  it('rotates the handle outside attachment and uses local measurements at zoom', () => {
    const [edge] = getEdgesGeometry(document())
    expect(edge?.source.x).toBeCloseTo(180)
    expect(edge?.source.y).toBeCloseTo(225.5)
    expect(edge?.target).toStrictEqual({ x: 394.5, y: 150 })
  })

  it('inverse-transforms a noncentral handle sample at zoom', () => {
    const offset = unrotateFlowHandle({
      center: { x: 200, y: 320 },
      nodeCenter: { x: 200, y: 200 },
      size: { width: 160, height: 80 },
      zoom: 2,
      rotation: 90,
    })

    expect(offset.x).toBeCloseTo(140)
    expect(offset.y).toBeCloseTo(40)
  })

  it('aligns to the rotated AABB without snapping the rotation gesture', () => {
    const graph = createFlowGraph(document())

    const result = solveFlowAlignment({
      graph,
      nodeIds: [nodeId],
      delta: { x: 258, y: 0 },
      zoom: 1,
    })

    expect(result.delta.x).toBeCloseTo(260)
    expect(
      result.guides.some(
        (guide) => guide.axis === 'x' && guide.coordinate === 400
      )
    ).toBeTruthy()
  })

  it('groups and reparents rotated nodes without moving their physical anchors', () => {
    const input = document()

    const physical = new Map(
      getFlowInternalNodes(input, emptyFlowMeasurementState()).map((node) => {
        const bounds = getInternalNodeLayoutBounds(node)

        return [bounds.id, bounds.bounds]
      })
    )

    const result = groupNodes(input.nodes, physical, {
      nodeIds: ['a'],
      groupId: NodeIdSchema.make('g'),
      padding: 20,
    })

    expect(result.kind).toBe('grouped')

    if (result.kind !== 'grouped') {
      throw new Error('Grouping rejected')
    }

    const graph = createFlowGraph({ ...input, nodes: result.nodes })
    expect(graph.nodes.get(nodeId)?.absolutePosition).toStrictEqual({
      x: 100,
      y: 100,
    })
    expect(
      graph.nodes.get(NodeIdSchema.make('g'))?.dimensions.width
    ).toBeCloseTo(200)
    expect(graph.nodes.get(nodeId)?.node.rotation).toBe(90)

    const groupedPhysical = new Map(
      graph.orderedNodes.map((node) => [
        node.id,
        { ...node.absolutePosition, ...node.dimensions },
      ])
    )

    const detached = reparentNode(result.nodes, groupedPhysical, 'a')
    expect(detached.find((node) => node.id === 'a')).toMatchObject({
      position: { x: 100, y: 100 },
      rotation: 90,
    })
  })

  it('preserves rotation through clipboard and one semantic undo/redo transaction', () => {
    const before = document(0)
    const after = document(90)
    const copied = Effect.runSync(copyFlowSelection(after))

    const pasted = Effect.runSync(
      prepareFlowEdit(after, pasteFlowGraphFragment(copied, after).transaction)
    ).document

    expect(pasted.nodes.find((node) => node.id === 'a-copy-1')?.rotation).toBe(
      90
    )

    const history = reduceFlowHistory(createFlowHistory(before), {
      kind: 'accepted',
      document: after,
    }).state

    expect(history.past).toHaveLength(1)

    const undo = reduceFlowHistory(history, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'undo',
    })

    expect(undo.replacement?.document.nodes[0]?.rotation).toBe(0)
  })

  it('uses v6 for explicit rotation, retains v1-v5 compatibility and rejects silently lossy envelopes', () => {
    const input = document()
    const saved = encodeVersionedFlowDocument(input)
    const serialized = JSON.stringify(saved)
    expect(saved.version).toBe(6)
    expect(
      Effect.runSync(decodeVersionedFlowDocument(JSON.parse(serialized)))
        .nodes[0]?.rotation
    ).toBe(90)

    const session = encodeVersionedFlowSession(input, {
      x: 10,
      y: 20,
      zoom: 0.75,
    })

    expect(
      Effect.runSync(decodeVersionedFlowSession(session)).document.nodes[0]
        ?.rotation
    ).toBe(90)
  })

  it('rejects rotation in frozen envelopes and keeps the oldest compatible version', () => {
    const input = document()
    const saved = encodeVersionedFlowDocument(input)

    const session = encodeVersionedFlowSession(input, {
      x: 10,
      y: 20,
      zoom: 0.75,
    })

    for (const version of [1, 2, 3, 4, 5]) {
      expect(
        Effect.runSyncExit(decodeVersionedFlowDocument({ ...saved, version }))
          ._tag
      ).toBe('Failure')
      expect(
        Effect.runSyncExit(decodeVersionedFlowSession({ ...session, version }))
          ._tag
      ).toBe('Failure')
    }

    expect(
      Effect.runSyncExit(decodeSavedFlowDocument({ ...saved, version: 1 }))._tag
    ).toBe('Failure')
    expect(() => encodeSavedFlowDocument(input)).toThrow(SavedFlowFormatError)

    const plain = {
      ...input,
      nodes: input.nodes.map(
        ({
          rotation: _rotation,
          sourcePosition: _source,
          targetPosition: _target,
          ...node
        }) => node
      ),
    }

    expect(encodeVersionedFlowDocument(plain).version).toBe(1)
  })

  it('rotates shape bounds and fits image exports around the entire rotated visual', () => {
    const bounds = rotatedFlowBounds(
      { x: 100, y: 100, width: 160, height: 80 },
      90
    )

    expect(bounds.width).toBeCloseTo(80)
    expect(bounds.height).toBeCloseTo(160)
  })

  it('fits image exports around rotated bounds', () => {
    const input = document()
    const single = { ...input, nodes: input.nodes.slice(0, 1), edges: [] }

    const result = Effect.runSync(
      prepareFlowImageExport({
        version: 1,
        host: 'vanilla',
        revision: 'rotation-90',
        width: 400,
        height: 400,
        framing: { kind: 'fit', padding: 0 },
        assets: [],
        scene: {
          document: single,
          edgeRouting: null,
          measurements: [
            {
              nodeId: 'a',
              width: 160,
              height: 80,
              handles: [
                {
                  nodeId: 'a',
                  handleId: 'source',
                  offset: { x: 160, y: 40 },
                  width: 11,
                  height: 11,
                },
                {
                  nodeId: 'a',
                  handleId: 'target',
                  offset: { x: 0, y: 40 },
                  width: 11,
                  height: 11,
                },
              ],
            },
          ],
        },
      })
    )

    expect(result.document.nodes[0]?.rotation).toBe(90)
    expect(result.viewport.zoom).toBeCloseTo(2.5)
  })
})
