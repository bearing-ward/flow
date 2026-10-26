import { Effect, Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { copyFlowSelection, pasteFlowGraphFragment } from './flow-clipboard.ts'
import {
  getEdgeGeometry,
  getEdgeDistanceToPoint,
  getEdgeIntersections,
} from './flow-edge-geometry.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import {
  decodeVersionedFlowDocument,
  encodeSavedFlowDocument,
  encodeVersionedFlowDocument,
} from './flow-persistence.ts'
import { InvalidEdgeRoute } from './flow-route-error.ts'
import {
  FlowEdgeRouteSchema,
  FlowRoutePointsSchema,
} from './flow-route.schema.ts'
import {
  editEdgeRoute,
  getManualRouteGeometry,
  hitTestRoutePoint,
  sampleRoutePoint,
} from './flow-route.ts'
import { SavedFlowFormatError } from './flow-save-format-error.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const fixture = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 40 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
          selected: true,
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 400, y: 0 },
          size: { width: 100, height: 40 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
          selected: true,
        },
        {
          id: 'c',
          label: 'C',
          position: { x: 600, y: 100 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'ab',
          source: 'a',
          target: 'b',
          label: 'Route',
          data: { opaque: { id: 'ab' } },
          route: {
            mode: 'manual',
            points: [
              { x: 200, y: 120 },
              { x: 300, y: 120 },
            ],
          },
        },
      ],
    })
  )

describe('ordered graph-space edge routes', () => {
  it('rejects a fully collapsed requested route against resolved endpoint anchors', () => {
    const document = fixture()

    const overlapping = {
      ...document,
      nodes: document.nodes.map((node) =>
        node.id === 'b' ? { ...node, position: { x: 111, y: 0 } } : node
      ),
    }

    expect(() =>
      Effect.runSync(
        editEdgeRoute(overlapping, 'ab', {
          kind: 'manual',
          points: [{ x: 105.5, y: 20 }],
        })
      )
    ).toThrow(InvalidEdgeRoute)
  })

  it('decodes modes, finite positions and ordered nondegenerate interior points', () => {
    expect(
      S.decodeUnknownSync(FlowEdgeRouteSchema)({ mode: 'automatic' })
    ).toStrictEqual({ mode: 'automatic' })

    for (const points of [
      [],
      [{ x: Number.NaN, y: 0 }],
      [{ x: 0, y: Infinity }],
      [
        { x: 1, y: 2 },
        { x: 1, y: 2 },
      ],
    ]) {
      expect(
        Exit.isFailure(
          S.decodeUnknownExit(FlowEdgeRouteSchema)({ mode: 'manual', points })
        )
      ).toBeTruthy()
    }

    const points = [
      { x: -3.5, y: 7 },
      { x: 2, y: -1 },
    ]

    expect(S.decodeUnknownSync(FlowRoutePointsSchema)(points)).toStrictEqual(
      points
    )
  })

  it('shares the literal path, length midpoint, hit distance and intersections', () => {
    const geometry = getManualRouteGeometry(
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      [{ x: 100, y: 0 }]
    )

    expect(geometry).toStrictEqual({
      path: 'M0,0 L100,0 L100,100',
      label: { x: 100, y: 0 },
    })
    expect(getEdgeDistanceToPoint(geometry, { x: 50, y: 3 })).toBe(3)
    expect(
      getEdgeIntersections(geometry, { path: 'M50,-20 L50,20' })
    ).toStrictEqual([{ x: 50, y: 0 }])
  })

  it('hits points at the tolerance boundary and drops duplicate samples', () => {
    expect(
      hitTestRoutePoint(
        [
          { x: 20, y: 30 },
          { x: 40, y: 30 },
        ],
        { x: 24, y: 30 },
        4
      )
    ).toBe(0)
    expect(
      hitTestRoutePoint([{ x: 20, y: 30 }], { x: 24.1, y: 30 }, 4)
    ).toBeUndefined()
    expect(sampleRoutePoint([{ x: 1, y: 2 }], { x: 1, y: 2 }, 4)).toStrictEqual(
      [{ x: 1, y: 2 }]
    )
    expect(sampleRoutePoint([{ x: 1, y: 2 }], { x: 5, y: 2 }, 4)).toStrictEqual(
      [
        { x: 1, y: 2 },
        { x: 5, y: 2 },
      ]
    )
  })

  it('coalesces coincident measured endpoint segments without changing authored points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]

    expect(
      getManualRouteGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, points)
    ).toStrictEqual({ path: 'M0,0 L100,0', label: { x: 50, y: 0 } })
    expect(points).toStrictEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
    expect(
      getManualRouteGeometry({ x: 0, y: 0 }, { x: 0, y: 0 }, [{ x: 0, y: 0 }])
    ).toStrictEqual({ path: 'M0,0', label: { x: 0, y: 0 } })
  })

  it('moves, inserts in segment order, removes and returns to automatic through one ordinary edit', () => {
    const document = fixture()

    const moved = Effect.runSync(
      prepareFlowEdit(
        document,
        Effect.runSync(
          editEdgeRoute(document, 'ab', {
            kind: 'move',
            index: 0,
            point: { x: 220, y: 150 },
          })
        )
      )
    ).document

    expect(moved.edges[0]?.route).toStrictEqual({
      mode: 'manual',
      points: [
        { x: 220, y: 150 },
        { x: 300, y: 120 },
      ],
    })
    expect(moved.edges[0]?.data).toStrictEqual({ opaque: { id: 'ab' } })

    const inserted = Effect.runSync(
      prepareFlowEdit(
        document,
        Effect.runSync(
          editEdgeRoute(document, 'ab', {
            kind: 'insert',
            point: { x: 250, y: 120 },
          })
        )
      )
    ).document

    expect(inserted.edges[0]?.route).toStrictEqual({
      mode: 'manual',
      points: [
        { x: 200, y: 120 },
        { x: 250, y: 120 },
        { x: 300, y: 120 },
      ],
    })

    const once = Effect.runSync(
      prepareFlowEdit(
        document,
        Effect.runSync(
          editEdgeRoute(document, 'ab', { kind: 'remove', index: 1 })
        )
      )
    ).document

    const automatic = Effect.runSync(
      prepareFlowEdit(
        once,
        Effect.runSync(editEdgeRoute(once, 'ab', { kind: 'remove', index: 0 }))
      )
    ).document

    expect(automatic.edges[0]?.route).toStrictEqual({ mode: 'automatic' })
  })

  it('rejects invalid indices and duplicate point edits', () => {
    const document = fixture()

    expect(
      Exit.isFailure(
        Effect.runSync(
          Effect.exit(
            editEdgeRoute(document, 'ab', {
              kind: 'move',
              index: 9,
              point: { x: 0, y: 0 },
            })
          )
        )
      )
    ).toBeTruthy()
    expect(
      Exit.isFailure(
        Effect.runSync(
          Effect.exit(
            editEdgeRoute(document, 'ab', {
              kind: 'move',
              index: 0,
              point: { x: 300, y: 120 },
            })
          )
        )
      )
    ).toBeTruthy()
  })

  it('reattaches moved and reconnected endpoints without moving interior points', () => {
    const document = fixture()
    const before = getEdgeGeometry(document, 'ab')

    const moved = Effect.runSync(
      prepareFlowEdit(document, {
        operations: [
          {
            kind: 'update-node',
            nodeId: 'a',
            patch: { position: { x: 50, y: 40 } },
          },
          {
            kind: 'update-edge',
            edgeId: 'ab',
            patch: { target: 'c' },
          },
        ],
      })
    ).document

    const after = getEdgeGeometry(moved, 'ab')
    expect(moved.edges[0]?.route).toStrictEqual(document.edges[0]?.route)
    expect(after?.source).not.toStrictEqual(before?.source)
    expect(after?.target).not.toStrictEqual(before?.target)
    expect(after?.path).toContain('L200,120 L300,120')
  })

  it('round-trips v4 and offsets copied manual points with pasted endpoints', () => {
    const document = fixture()
    const saved = encodeVersionedFlowDocument(document)
    expect(saved.version).toBe(4)
    expect(
      Effect.runSync(decodeVersionedFlowDocument(saved)).edges[0]?.route
    ).toStrictEqual(document.edges[0]?.route)
    expect(() => encodeSavedFlowDocument(document)).toThrow(
      SavedFlowFormatError
    )
    const state = Effect.runSync(copyFlowSelection(document))

    const pasted = Effect.runSync(
      prepareFlowEdit(
        document,
        pasteFlowGraphFragment(state, document).transaction
      )
    ).document

    expect(pasted.edges.at(-1)?.route).toStrictEqual({
      mode: 'manual',
      points: [
        { x: 220, y: 140 },
        { x: 320, y: 140 },
      ],
    })
    expect(pasted.edges.at(-1)?.data).toStrictEqual({ opaque: { id: 'ab' } })
  })
})
