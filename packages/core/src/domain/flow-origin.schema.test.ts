import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  edgeAttachmentPosition,
  inferHandleMeasurement,
} from './flow-edge.schema.ts'
import { fitViewportToNodes } from './flow-fit-view.ts'
import {
  createFlowGraph,
  graphBounds,
  graphNodesIntersecting,
} from './flow-graph.ts'
import {
  applyNodeMeasurement,
  emptyFlowMeasurementState,
  getFlowInternalNode,
} from './flow-measurement.schema.ts'
import {
  constrainNodeGroupDelta,
  constrainNodePosition,
} from './flow-node-extent.schema.ts'
import {
  NodeOriginSchema,
  nodeAnchorToTopLeft,
  nodeTopLeftToAnchor,
  resolveNodeOrigin,
} from './flow-origin.schema.ts'
import {
  encodeSavedFlowDocument,
  encodeSavedFlowSession,
} from './flow-persistence.ts'
import {
  applyNodeBoundsChange,
  applyNodePositionChange,
  calculateNodeResize,
  beginNodeDrag,
  completeNodeDrag,
  moveSelectedNodes,
  applyNodePositionsChange,
} from './flow-runtime.schema.ts'
import type { NodeResizeDirection } from './flow-runtime.schema.ts'
import {
  nodeIntersectsViewport,
  selectionInRect,
} from './flow-visibility.schema.ts'
import { decodeFlowDocument, NodeIdSchema } from './flow.schema.ts'

const id = S.decodeUnknownSync(NodeIdSchema)

const origin = S.decodeUnknownSync(NodeOriginSchema)

describe('node anchor origins', () => {
  it('keeps physical opposite corners and descendant world positions during every resize direction', () => {
    const scenarios: readonly {
      readonly direction: NodeResizeDirection
      readonly topLeft: { readonly x: number; readonly y: number }
      readonly size: { readonly width: number; readonly height: number }
    }[] = [
      {
        direction: 'top-left',
        topLeft: { x: 110, y: 208 },
        size: { width: 70, height: 32 },
      },
      {
        direction: 'top-right',
        topLeft: { x: 100, y: 208 },
        size: { width: 90, height: 32 },
      },
      {
        direction: 'bottom-left',
        topLeft: { x: 110, y: 200 },
        size: { width: 70, height: 48 },
      },
      {
        direction: 'bottom-right',
        topLeft: { x: 100, y: 200 },
        size: { width: 90, height: 48 },
      },
      {
        direction: 'left',
        topLeft: { x: 110, y: 200 },
        size: { width: 70, height: 40 },
      },
      {
        direction: 'right',
        topLeft: { x: 100, y: 200 },
        size: { width: 90, height: 40 },
      },
      {
        direction: 'top',
        topLeft: { x: 100, y: 208 },
        size: { width: 80, height: 32 },
      },
      {
        direction: 'bottom',
        topLeft: { x: 100, y: 200 },
        size: { width: 80, height: 48 },
      },
    ]

    for (const value of [
      [0, 0],
      [0.5, 0.5],
      [1, 1],
      [-0.5, 1.5],
    ]) {
      const decodedOrigin = origin(value)
      const sizeStart = { width: 80, height: 40 }

      const positionStart = nodeTopLeftToAnchor(
        { x: 100, y: 200 },
        sizeStart,
        decodedOrigin
      )

      for (const scenario of scenarios) {
        const document = Effect.runSync(
          decodeFlowDocument({
            nodes: [
              {
                id: 'parent',
                label: 'Parent',
                position: positionStart,
                size: sizeStart,
                origin: decodedOrigin,
              },
              {
                id: 'child',
                label: 'Child',
                parentId: 'parent',
                position: { x: 30, y: 20 },
                size: { width: 20, height: 10 },
                origin: [1, 1],
              },
              {
                id: 'grandchild',
                label: 'Grandchild',
                parentId: 'child',
                position: { x: 5, y: 6 },
                size: { width: 10, height: 8 },
                origin: [0.5, 0.5],
              },
            ],
            edges: [],
          })
        )

        const result = calculateNodeResize({
          direction: scenario.direction,
          positionStart,
          sizeStart,
          origin: decodedOrigin,
          delta: { x: 10, y: 8 },
          minimumSize: { width: 10, height: 10 },
        })

        expect({
          size: result.size,
          topLeft: nodeAnchorToTopLeft(
            result.position,
            result.size,
            decodedOrigin
          ),
          positionDelta: result.positionDelta,
          childrenPositionDelta: result.childrenPositionDelta,
        }).toStrictEqual({
          size: scenario.size,
          topLeft: scenario.topLeft,
          positionDelta: {
            x: result.position.x - positionStart.x,
            y: result.position.y - positionStart.y,
          },
          childrenPositionDelta: {
            x: 100 - scenario.topLeft.x,
            y: 200 - scenario.topLeft.y,
          },
        })

        const changed = applyNodeBoundsChange(document, {
          kind: 'node-bounds',
          nodeId: id('parent'),
          position: result.position,
          size: result.size,
          childPositions: [
            {
              nodeId: id('child'),
              position: {
                x: 30 + result.childrenPositionDelta.x,
                y: 20 + result.childrenPositionDelta.y,
              },
            },
          ],
        })

        if (changed === undefined) {
          throw new Error('Resize fixture change rejected')
        }

        const before = createFlowGraph(document)
        const after = createFlowGraph(changed)
        expect(
          ['child', 'grandchild'].map(
            (name) => after.nodes.get(id(name))?.absolutePosition
          )
        ).toStrictEqual(
          ['child', 'grandchild'].map(
            (name) => before.nodes.get(id(name))?.absolutePosition
          )
        )
        expect(changed.nodes.slice(1).map((node) => node.origin)).toStrictEqual(
          [
            [1, 1],
            [0.5, 0.5],
          ]
        )
      }
    }
  })

  it('bounds anchored resize physically and rejects nonfinite resize origins', () => {
    const base = {
      direction: 'right',
      positionStart: { x: 60, y: 30 },
      sizeStart: { width: 80, height: 40 },
      delta: { x: 100, y: 0 },
      minimumSize: { width: 10, height: 10 },
      bounds: { minX: 0, minY: 0, maxX: 120, maxY: 80 },
      origin: origin([0.5, 0.5]),
    } satisfies Parameters<typeof calculateNodeResize>[0]

    expect(calculateNodeResize(base)).toStrictEqual({
      position: { x: 70, y: 30 },
      size: { width: 100, height: 40 },
      positionDelta: { x: 10, y: 0 },
      childrenPositionDelta: { x: 0, y: 0 },
      boundsIssues: [],
    })
    expect(() =>
      calculateNodeResize({ ...base, origin: [Number.NaN, 0] })
    ).toThrow(/./u)
  })

  // Pinned packages/system/src/utils/general.ts:20-29 aligns oversized axes to maximum minus size.
  it('constrains anchors by complete physical extents including oversized nodes and physical groups', () => {
    const dimensions = { width: 80, height: 40 }
    const extent = { minX: 0, minY: 0, maxX: 100, maxY: 80 }

    for (const value of [
      [0, 0],
      [0.5, 0.5],
      [1, 1],
      [-0.5, 1.5],
    ]) {
      const decoded = origin(value)

      const constrained = constrainNodePosition(
        { x: 1000, y: -1000 },
        dimensions,
        extent,
        decoded
      )

      expect(
        nodeAnchorToTopLeft(constrained, dimensions, decoded)
      ).toStrictEqual({ x: 20, y: 0 })
      const oversized = { width: 140, height: 120 }
      expect(
        nodeAnchorToTopLeft(
          constrainNodePosition(
            { x: 1000, y: -1000 },
            oversized,
            extent,
            decoded
          ),
          oversized,
          decoded
        )
      ).toStrictEqual({ x: -40, y: -40 })
    }

    expect(
      constrainNodeGroupDelta(
        [
          { position: { x: 10, y: 10 }, width: 20, height: 20 },
          { position: { x: 60, y: 10 }, width: 20, height: 20 },
        ],
        { x: 100, y: -20 },
        extent
      )
    ).toStrictEqual({ x: 20, y: -10 })
  })

  it('moves stored anchors with the pointer grab offset and preserves selected descendant handling', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodeOrigin: [0.5, 0.5],
        nodes: [
          {
            id: 'parent',
            label: 'Parent',
            position: { x: 100, y: 100 },
            size: { width: 80, height: 40 },
            selected: true,
          },
          {
            id: 'child',
            label: 'Child',
            parentId: 'parent',
            position: { x: 20, y: 20 },
            selected: true,
            size: { width: 20, height: 10 },
          },
        ],
        edges: [],
      })
    )

    const drag = beginNodeDrag(
      id('parent'),
      { x: 100, y: 100 },
      { x: 67, y: 85 },
      1
    )

    const change = completeNodeDrag(drag, { x: 77, y: 105 })
    expect(change.position).toStrictEqual({ x: 110, y: 120 })
    const moved = applyNodePositionChange(document, change)

    if (moved === undefined) {
      throw new Error('Move fixture change rejected')
    }

    expect(
      createFlowGraph(moved).nodes.get(id('parent'))?.absolutePosition
    ).toStrictEqual({ x: 70, y: 100 })
    const selectedChange = moveSelectedNodes(document, { x: 10, y: 20 })
    expect(selectedChange.positions).toStrictEqual([
      { nodeId: id('parent'), position: { x: 110, y: 120 } },
    ])
    const group = applyNodePositionsChange(document, selectedChange)

    if (group === undefined) {
      throw new Error('Group fixture change rejected')
    }

    expect(
      createFlowGraph(group).nodes.get(id('child'))?.absolutePosition
    ).toStrictEqual({ x: 80, y: 115 })
  })

  it('decodes finite exact tuples without clamping and rejects malformed boundaries', () => {
    expect(origin([-0.5, 1.5])).toStrictEqual([-0.5, 1.5])

    for (const value of [
      null,
      [],
      [0],
      [0, 0, 0],
      [Number.NaN, 0],
      [0, Infinity],
      ['0', 0],
    ]) {
      expect(() => origin(value)).toThrow(/./u)
      expect(
        Effect.runSync(
          Effect.exit(
            decodeFlowDocument({ nodes: [], edges: [], nodeOrigin: value })
          )
        )._tag
      ).toBe('Failure')
      expect(
        Effect.runSync(
          Effect.exit(
            decodeFlowDocument({
              nodes: [
                {
                  id: 'n',
                  label: 'N',
                  position: { x: 0, y: 0 },
                  origin: value,
                },
              ],
              edges: [],
            })
          )
        )._tag
      ).toBe('Failure')
    }
  })

  it('resolves per-node over global origin, defaults independently, and inverts physical conversion', () => {
    const global = { nodeOrigin: origin([0.5, 0.5]) }
    expect(resolveNodeOrigin({}, {})).toStrictEqual([0, 0])
    expect(resolveNodeOrigin({}, global)).toStrictEqual([0.5, 0.5])
    expect(resolveNodeOrigin({ origin: origin([1, 0]) }, global)).toStrictEqual(
      [1, 0]
    )
    const dimensions = { width: 80, height: 40 }
    const anchor = { x: 100, y: 100 }

    for (const value of [
      [0, 0],
      [0.5, 0.5],
      [1, 1],
      [-0.5, 1.5],
    ]) {
      const decoded = origin(value)
      expect(
        nodeTopLeftToAnchor(
          nodeAnchorToTopLeft(anchor, dimensions, decoded),
          dimensions,
          decoded
        )
      ).toStrictEqual(anchor)
    }

    const first = resolveNodeOrigin({}, {})
    expect(resolveNodeOrigin({}, {})).not.toBe(first)
  })

  it('resolves nested parents in physical space and treats overrides as stored anchors', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodeOrigin: [0.5, 0.5],
        nodes: [
          {
            id: 'leaf',
            label: 'Leaf',
            parentId: 'child',
            position: { x: 10, y: 20 },
            size: { width: 20, height: 10 },
            origin: [-0.5, 1.5],
          },
          {
            id: 'child',
            label: 'Child',
            parentId: 'root',
            position: { x: 100, y: 80 },
            size: { width: 80, height: 40 },
            origin: [1, 1],
          },
          {
            id: 'root',
            label: 'Root',
            position: { x: 300, y: 200 },
            size: { width: 200, height: 100 },
          },
        ],
        edges: [],
      })
    )

    const graph = createFlowGraph(document)
    expect(graph.nodes.get(id('root'))?.absolutePosition).toStrictEqual({
      x: 200,
      y: 150,
    })
    expect(graph.nodes.get(id('child'))?.absolutePosition).toStrictEqual({
      x: 220,
      y: 190,
    })
    expect(graph.nodes.get(id('leaf'))?.absolutePosition).toStrictEqual({
      x: 240,
      y: 195,
    })

    const overridden = createFlowGraph(
      document,
      new Map(),
      new Map([
        [id('root'), { x: 400, y: 300 }],
        [id('child'), { x: 150, y: 100 }],
      ])
    )

    expect(overridden.nodes.get(id('leaf'))?.absolutePosition).toStrictEqual({
      x: 390,
      y: 315,
    })
    expect(document.nodes[1]?.position).toStrictEqual({ x: 100, y: 80 })
  })

  it('preserves both-positive measurement policy, fallback and hidden geometry', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodeOrigin: [0.5, 0.5],
        nodes: [
          {
            id: 'n',
            label: 'N',
            position: { x: 100, y: 100 },
            size: { width: 80, height: 40 },
          },
          { id: 'fallback', label: 'Fallback', position: { x: 100, y: 100 } },
          {
            id: 'hidden',
            label: 'Hidden',
            position: { x: 100, y: 100 },
            hidden: true,
            size: { width: 80, height: 40 },
          },
        ],
        edges: [],
      })
    )

    for (const dimensions of [
      { width: 0, height: 0 },
      { width: 0, height: 60 },
      { width: 120, height: 0 },
    ]) {
      const graph = createFlowGraph(
        document,
        new Map([[id('n'), { nodeId: id('n'), ...dimensions }]])
      )

      expect(graph.nodes.get(id('n'))).toMatchObject({
        absolutePosition: { x: 60, y: 80 },
        dimensions: { width: 80, height: 40 },
      })
    }

    const graph = createFlowGraph(
      document,
      new Map([[id('n'), { nodeId: id('n'), width: 120, height: 60 }]])
    )

    expect(graph.nodes.get(id('n'))?.absolutePosition).toStrictEqual({
      x: 40,
      y: 70,
    })
    expect(graph.nodes.get(id('fallback'))?.absolutePosition).toStrictEqual({
      x: 25,
      y: 78,
    })
    expect(graph.nodes.get(id('hidden'))).toMatchObject({
      hidden: true,
      absolutePosition: { x: 60, y: 80 },
    })

    const state = applyNodeMeasurement(document, emptyFlowMeasurementState(), {
      nodeId: id('n'),
      generation: 1,
      width: 0,
      height: 0,
    })

    expect(getFlowInternalNode(document, state, id('n'))).toMatchObject({
      absolutePosition: { x: 60, y: 80 },
      width: 0,
      height: 0,
      measurementStatus: 'measured',
    })
  })

  it('shares physical bounds across fit, intersection, visibility, selection and endpoints', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodeOrigin: [0.5, 0.5],
        nodes: [
          {
            id: 'n',
            label: 'N',
            position: { x: 100, y: 100 },
            size: { width: 80, height: 40 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
        ],
        edges: [],
      })
    )

    const graph = createFlowGraph(document)
    const node = graph.nodes.get(id('n'))
    const handle = node?.node.handles?.[0]

    if (node === undefined || handle === undefined) {
      throw new Error('Origin fixture missing node or handle')
    }

    expect(graphBounds(graph)).toStrictEqual({
      x: 60,
      y: 80,
      width: 80,
      height: 40,
    })
    expect({
      intersecting: graphNodesIntersecting(graph, {
        x: 60,
        y: 80,
        width: 1,
        height: 1,
      }).map((entry) => entry.id),
      outside: nodeIntersectsViewport(graph, id('n'), {
        x: 141,
        y: 80,
        width: 1,
        height: 1,
      }),
      full: selectionInRect(graph, { x: 60, y: 80, width: 80, height: 40 })
        .nodeIds,
      anchorRectangle: selectionInRect(graph, {
        x: 100,
        y: 100,
        width: 80,
        height: 40,
      }).nodeIds,
      partial: selectionInRect(
        graph,
        { x: 139, y: 119, width: 1, height: 1 },
        'partial'
      ).nodeIds,
    }).toStrictEqual({
      intersecting: [id('n')],
      outside: false,
      full: [id('n')],
      anchorRectangle: [],
      partial: [id('n')],
    })
    expect(
      fitViewportToNodes({
        document,
        measurements: new Map(),
        currentViewport: { x: 0, y: 0, zoom: 1 },
        paneWidth: 400,
        paneHeight: 200,
        limits: { minZoom: 1, maxZoom: 2 },
        padding: 0,
      })
    ).toStrictEqual({ x: 0, y: -100, zoom: 2 })
    expect(
      edgeAttachmentPosition(
        node.absolutePosition,
        handle,
        inferHandleMeasurement(node.id, handle, node.dimensions)
      )
    ).toStrictEqual({ x: 145.5, y: 100 })
    expect(
      edgeAttachmentPosition(node.absolutePosition, handle, {
        nodeId: node.id,
        handleId: handle.id,
        offset: { x: 75, y: 15 },
        width: 10,
        height: 8,
      })
    ).toStrictEqual({ x: 140, y: 95 })
  })

  it('retains explicit zero origins but refuses to silently save them in frozen v1', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodeOrigin: [0, 0],
        nodes: [
          { id: 'n', label: 'N', position: { x: 0, y: 0 }, origin: [0, 0] },
        ],
        edges: [],
      })
    )

    expect(document.nodeOrigin).toStrictEqual([0, 0])
    expect(document.nodes[0]?.origin).toStrictEqual([0, 0])
    expect(() => encodeSavedFlowDocument(document)).toThrow(
      expect.objectContaining({ code: 'origin-requires-versioned-session' })
    )
    expect(() =>
      encodeSavedFlowSession(document, { x: 0, y: 0, zoom: 1 })
    ).toThrow(
      expect.objectContaining({ code: 'origin-requires-versioned-session' })
    )
  })
})
