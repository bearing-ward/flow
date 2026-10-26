import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { flowBundleEndpoints, flowBundleFrame } from './flow-bundle-geometry.ts'
import { flowWireSlash } from './flow-bundle-slash.ts'
import { FlowBundleSchema } from './flow-bundle.schema.ts'
import { editWireTies, flowBundleChanges } from './flow-bundle.ts'
import { copyFlowSelection, pasteFlowGraphFragment } from './flow-clipboard.ts'
import {
  getEdgeDistanceToPoint,
  getEdgeGeometry,
  getEdgesGeometry,
} from './flow-edge-geometry.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import { createFlowHistory, reduceFlowHistory } from './flow-history.ts'
import { toFlowObject } from './flow-instance.ts'
import {
  decodeVersionedFlowDocument,
  decodeVersionedFlowSession,
  encodeVersionedFlowDocument,
  encodeVersionedFlowSession,
  encodeSavedFlowDocument,
} from './flow-persistence.ts'
import { SavedFlowFormatError } from './flow-save-format-error.ts'
import { createFlowSnapshot } from './flow-snapshot.ts'
import { decodeFlowDocument } from './flow.schema.ts'
import type { FlowDocument } from './flow.schema.ts'

const graph = (): FlowDocument =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 50 },
          selected: true,
          handles: [
            { id: 'out', kind: 'source', side: 'right' },
            { id: 'in', kind: 'target', side: 'left' },
          ],
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 500, y: 0 },
          size: { width: 100, height: 50 },
          selected: true,
          handles: [
            { id: 'out', kind: 'source', side: 'right' },
            { id: 'in', kind: 'target', side: 'left' },
          ],
        },
        {
          id: 'c',
          label: 'C',
          position: { x: 0, y: 150 },
          size: { width: 100, height: 50 },
          selected: true,
          handles: [
            { id: 'out', kind: 'source', side: 'right' },
            { id: 'in', kind: 'target', side: 'left' },
          ],
        },
        {
          id: 'd',
          label: 'D',
          position: { x: 500, y: 150 },
          size: { width: 100, height: 50 },
          selected: true,
          handles: [
            { id: 'out', kind: 'source', side: 'right' },
            { id: 'in', kind: 'target', side: 'left' },
          ],
        },
      ],
      edges: [
        {
          id: 'cd',
          source: 'c',
          target: 'd',
          stroke: '#00ff00',
          data: { opaque: 'cd' },
        },
        { id: 'ab', source: 'a', target: 'b', stroke: '#ff0000' },
      ],
    })
  )

const bundle = () =>
  S.decodeUnknownSync(FlowBundleSchema)({
    id: 'ribbon',
    edgeIds: ['ab', 'cd'],
    ties: [{ x: 300, y: 100 }],
  })

const tied = () => ({ ...graph(), bundles: [bundle()] })

const edit = (
  document: FlowDocument,
  command: Parameters<typeof editWireTies>[1]
) =>
  Effect.runSync(
    prepareFlowEdit(document, Effect.runSync(editWireTies(document, command)))
  ).document

describe('wire bundles', () => {
  it('decodes finite points, at least two distinct edges and nonempty ties', () => {
    for (const patch of [
      { edgeIds: ['ab'] },
      { edgeIds: ['ab', 'ab'] },
      { ties: [] },
      { ties: [{ x: Infinity, y: 0 }] },
      {
        ties: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
      },
    ]) {
      expect(S.is(FlowBundleSchema)({ ...bundle(), ...patch })).toBeFalsy()
    }
  })

  it('rejects missing edges, duplicate bundle IDs and multiple memberships at decode', () => {
    for (const bundles of [
      [{ ...bundle(), edgeIds: ['missing', 'ab'] }],
      [bundle(), bundle()],
      [bundle(), { ...bundle(), id: 'other' }],
    ]) {
      expect(
        Effect.runSync(Effect.exit(decodeFlowDocument({ ...graph(), bundles })))
          ._tag
      ).toBe('Failure')
    }
  })

  it('sorts slash hits by crossing distance rather than document order', () => {
    const slash = flowWireSlash(graph(), { x: 300, y: -50 }, { x: 300, y: 250 })
    expect(slash.edgeIds).toStrictEqual(['ab', 'cd'])
    expect(slash.label).toBe('Tie 2 wires')
    expect(slash.position).toStrictEqual({ x: 300, y: 100 })
    expect(
      flowWireSlash(graph(), { x: 300, y: 250 }, { x: 300, y: -50 }).edgeIds
    ).toStrictEqual(['cd', 'ab'])
  })

  it('produces exactly spaced lanes and perpendicular markers with common tangents', () => {
    const document = tied()

    const frame = flowBundleFrame(
      bundle(),
      0,
      flowBundleEndpoints(document, bundle())
    )

    expect({
      dot: frame.normal.x * frame.tangent.x + frame.normal.y * frame.tangent.y,
      start: frame.start,
      end: frame.end,
    }).toStrictEqual({
      dot: 0,
      start: { x: 300, y: 94 },
      end: { x: 300, y: 106 },
    })
    const first = getEdgeGeometry(document, 'ab')
    const second = getEdgeGeometry(document, 'cd')

    if (first === undefined || second === undefined) {
      throw new Error('Missing geometry')
    }

    expect(getEdgeDistanceToPoint(first, { x: 300, y: 98 })).toBeCloseTo(0, 8)
    expect(getEdgeDistanceToPoint(second, { x: 300, y: 102 })).toBeCloseTo(0, 8)
    expect([first.edge.stroke, second.edge.stroke]).toStrictEqual([
      '#ff0000',
      '#00ff00',
    ])
    expect(first.path).toContain('C')
  })

  it('keeps single-edge and full-document geometry identical', () => {
    const document = tied()
    expect(getEdgesGeometry(document).find(({ id }) => id === 'ab')?.path).toBe(
      getEdgeGeometry(document, 'ab')?.path
    )
  })

  it('uses identical cubic derivatives on both sides of each interior knot', () => {
    const geometry = getEdgeGeometry(tied(), 'ab')

    const numbers =
      geometry?.path
        .match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gu)
        ?.map(Number) ?? []

    expect(numbers.length).toBeGreaterThanOrEqual(14)

    // M has 2 coordinates; each C has 6. Derivatives are 3*(end-lastControl) and 3*(nextControl-start).
    for (let offset = 2; offset + 11 < numbers.length; offset += 6) {
      for (const axis of [0, 1]) {
        expect(
          (numbers[offset + 4 + axis] ?? 0) - (numbers[offset + 2 + axis] ?? 0)
        ).toBeCloseTo(
          (numbers[offset + 6 + axis] ?? 0) - (numbers[offset + 4 + axis] ?? 0),
          8
        )
      }
    }
  })

  it('adds a second tie in source-to-target order without changing membership', () => {
    const document = tied()
    expect(
      flowWireSlash(document, { x: 310, y: 50 }, { x: 310, y: 150 }).label
    ).toBe('Add a second tie')

    const second = edit(document, {
      kind: 'add-tie',
      bundleId: 'ribbon',
      point: { x: 400, y: 120 },
    })

    expect(second.bundles?.[0]?.ties).toStrictEqual([
      { x: 300, y: 100 },
      { x: 400, y: 120 },
    ])
    expect(second.bundles?.[0]?.edgeIds).toStrictEqual(['ab', 'cd'])
    expect(
      flowWireSlash(second, { x: 300, y: -50 }, { x: 300, y: 250 }).edgeIds
    ).toStrictEqual(['ab', 'cd'])
  })

  it('moves ties and reports add/update/remove events from accepted documents', () => {
    const base = graph()
    const added = edit(base, { kind: 'add', bundle: bundle() })

    const moved = edit(added, {
      kind: 'move-tie',
      bundleId: 'ribbon',
      index: 0,
      point: { x: 250, y: 200 },
    })

    const removed = edit(moved, {
      kind: 'remove-tie',
      bundleId: 'ribbon',
      index: 0,
    })

    expect(
      flowBundleChanges(base, added).map(({ kind }) => kind)
    ).toStrictEqual(['bundle-add'])
    expect(
      flowBundleChanges(added, moved).map(({ kind }) => kind)
    ).toStrictEqual(['bundle-update'])
    expect(flowBundleChanges(moved, removed)).toStrictEqual([
      { kind: 'bundle-remove', bundleId: 'ribbon' },
    ])
    expect(removed.bundles).toStrictEqual([])
  })

  it('prunes singletons on deletion and explicit edge removal', () => {
    const document = tied()

    const deleted = Effect.runSync(
      prepareFlowEdit(document, {
        operations: [{ kind: 'delete-elements', edgeIds: ['ab'] }],
      })
    ).document

    expect(deleted.bundles).toStrictEqual([])
    expect(
      edit(document, {
        kind: 'remove-edge',
        edgeId: document.edges[0]?.id ?? bundle().edgeIds[0] ?? '',
      }).bundles
    ).toStrictEqual([])
  })

  it('prunes deleted memberships in compound bundle edits and rejects newly missing references', () => {
    const document = tied()

    const deletion = Effect.runSync(
      prepareFlowEdit(document, {
        operations: [
          { kind: 'set-bundles', bundles: [bundle()] },
          { kind: 'delete-elements', edgeIds: ['ab'] },
        ],
      })
    )

    expect(deletion.document.bundles).toStrictEqual([])
    const invalid = { ...bundle(), edgeIds: ['ab', 'missing'] }
    expect(
      Effect.runSync(
        Effect.exit(
          prepareFlowEdit(document, {
            operations: [{ kind: 'set-bundles', bundles: [invalid] }],
          })
        )
      )._tag
    ).toBe('Failure')
  })

  it('retains membership and points on reconnect and node motion', () => {
    const document = tied()

    const result = Effect.runSync(
      prepareFlowEdit(document, {
        operations: [
          {
            kind: 'update-edge',
            edgeId: document.edges[0]?.id ?? '',
            patch: { target: 'b' },
          },
          {
            kind: 'update-node',
            nodeId: 'a',
            patch: { position: { x: 20, y: 40 } },
          },
        ],
      })
    ).document

    expect(result.bundles).toStrictEqual(document.bundles)
    expect(getEdgeGeometry(result, 'ab')?.path).not.toBe(
      getEdgeGeometry(document, 'ab')?.path
    )
  })

  it('round trips v5 document and session while rejecting mislabeled older envelopes', () => {
    const document = tied()
    const saved = encodeVersionedFlowDocument(document)
    expect(saved.version).toBe(5)
    expect(
      Effect.runSync(decodeVersionedFlowDocument(saved)).bundles
    ).toStrictEqual([bundle()])

    const session = encodeVersionedFlowSession(document, {
      x: 123,
      y: 456,
      zoom: 0.7,
    })

    expect(
      Effect.runSync(decodeVersionedFlowSession(session)).viewport
    ).toStrictEqual({ x: 123, y: 456, zoom: 0.7 })

    for (const version of [1, 2, 3, 4]) {
      expect(
        Effect.runSync(
          Effect.exit(decodeVersionedFlowDocument({ ...saved, version }))
        )._tag
      ).toBe('Failure')
    }

    expect(() => encodeSavedFlowDocument(document)).toThrow(
      SavedFlowFormatError
    )
    expect(encodeVersionedFlowDocument(graph()).version).toBe(1)
  })

  it('remaps bundle and edge IDs and translates ties on repeated paste', () => {
    const document = tied()
    const clipboard = Effect.runSync(copyFlowSelection(document))
    const first = pasteFlowGraphFragment(clipboard, document)

    const pasted = Effect.runSync(
      prepareFlowEdit(document, first.transaction)
    ).document

    expect(pasted.bundles?.[1]).toStrictEqual({
      id: 'ribbon-copy-1',
      edgeIds: ['ab-copy-1', 'cd-copy-1'],
      ties: [{ x: 320, y: 120 }],
    })

    const second = Effect.runSync(
      prepareFlowEdit(
        pasted,
        pasteFlowGraphFragment(first.state, pasted).transaction
      )
    ).document

    expect(second.bundles?.[2]).toStrictEqual({
      id: 'ribbon-copy-2',
      edgeIds: ['ab-copy-2', 'cd-copy-2'],
      ties: [{ x: 340, y: 140 }],
    })
    expect(
      second.edges.find(({ id }) => id === 'cd-copy-2')?.data
    ).toStrictEqual({
      opaque: 'cd',
    })
  })

  it('retains detached bundle intent through the shared host toObject projection', () => {
    const snapshot = createFlowSnapshot(tied(), { x: 30, y: 40, zoom: 0.8 })
    const object = toFlowObject(snapshot)
    expect(Effect.runSync(decodeFlowDocument(object)).bundles).toStrictEqual([
      { id: 'ribbon', edgeIds: ['ab', 'cd'], ties: [{ x: 300, y: 100 }] },
    ])
    object.bundles?.pop()
    expect(snapshot.document.bundles).toHaveLength(1)
    expect(
      toFlowObject(createFlowSnapshot(graph(), snapshot.viewport))
    ).not.toHaveProperty('bundles')
  })

  it('records each tie and drag as one semantic history step', () => {
    const document = graph()
    const added = edit(document, { kind: 'add', bundle: bundle() })

    const moved = edit(added, {
      kind: 'move-tie',
      bundleId: 'ribbon',
      index: 0,
      point: { x: 350, y: 150 },
    })

    const one = reduceFlowHistory(createFlowHistory(document), {
      kind: 'accepted',
      document: added,
    }).state

    const two = reduceFlowHistory(one, {
      kind: 'accepted',
      document: moved,
    }).state

    expect(two.past).toHaveLength(2)
    expect(
      reduceFlowHistory(two, {
        kind: 'replay',
        direction: 'undo',
        transactionId: 'undo-drag',
      }).replacement?.document.bundles
    ).toStrictEqual(added.bundles)
  })
})
