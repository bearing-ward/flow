import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { nodeToolbarAnchorForBounds } from './flow-toolbar-anchor.ts'
import {
  blocksLockedInteraction,
  clampZoom,
  describeFlowStateChange,
  devToolsNodeRows,
  nextListIndex,
  parseZoomPresetValue,
  searchFlowNodes,
  selectOnlyNodeTransaction,
  zoomPercentLabel,
} from './flow-ui-controls.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      { id: 'a', label: 'Alpha', position: { x: 0, y: 0 }, selected: true },
      { id: 'b', label: 'Beta', position: { x: 100, y: 50 } },
      { id: 'c', label: 'alphabet', position: { x: 10, y: 10 }, hidden: true },
    ],
    edges: [{ id: 'ab', source: 'a', target: 'b', selected: true }],
  })
)

const viewport = { x: 0, y: 0, zoom: 1 }

describe('Flow UI controls', () => {
  it('formats and clamps zoom', () => {
    expect(zoomPercentLabel(1.234)).toBe('123%')
    expect([
      clampZoom(5, { minZoom: 0.5, maxZoom: 2 }),
      clampZoom(0.1, { minZoom: 0.5, maxZoom: 2 }),
    ]).toStrictEqual([2, 0.5])
  })

  it('parses zoom presets', () => {
    expect(
      ['fit', '1.5', 'nope'].map((value) => parseZoomPresetValue(value))
    ).toStrictEqual(['fit', 1.5, undefined])
  })

  it('searches visible node labels case-insensitively', () => {
    expect(searchFlowNodes(document.nodes, 'ALP')).toStrictEqual([
      { id: 'a', label: 'Alpha' },
    ])
    expect(searchFlowNodes(document.nodes, '  ')).toStrictEqual([])
    expect(searchFlowNodes(document.nodes, 'a', 1)).toHaveLength(1)
  })

  it('selects exactly one node and clears edge selection', () => {
    expect(selectOnlyNodeTransaction(document, 'b')).toStrictEqual({
      operations: [
        { kind: 'update-node', nodeId: 'a', patch: { selected: false } },
        { kind: 'update-node', nodeId: 'b', patch: { selected: true } },
        { kind: 'update-edge', edgeId: 'ab', patch: { selected: false } },
      ],
    })
  })

  it('navigates result lists with wrapping', () => {
    expect(
      [
        [-1, 3, 'ArrowDown'],
        [2, 3, 'ArrowDown'],
        [0, 3, 'ArrowUp'],
        [1, 3, 'End'],
        [1, 3, 'Home'],
        [0, 0, 'ArrowDown'],
        [0, 3, 'x'],
      ].map(([current, count, key]) =>
        nextListIndex(Number(current), Number(count), String(key))
      )
    ).toStrictEqual([0, 0, 2, 2, 0, undefined, undefined])
  })

  it('lists node rows', () => {
    expect(devToolsNodeRows(document)[1]).toStrictEqual({
      id: 'b',
      label: 'Beta',
      type: 'default',
      x: 100,
      y: 50,
      selected: false,
      hidden: false,
    })
  })

  it('describes semantic changes between snapshots', () => {
    const current = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: 'a', label: 'Alpha', position: { x: 20, y: 0 } },
          { id: 'd', label: 'Delta', position: { x: 0, y: 0 } },
        ],
        edges: [],
      })
    )

    expect(
      describeFlowStateChange({
        previous: { document, viewport },
        current: { document: current, viewport },
      }).map(({ text }) => text)
    ).toStrictEqual([
      'node a position 20, 0',
      'node a deselected',
      'node d add',
      'node b remove',
      'node c remove',
      'edge ab remove',
    ])
    expect(
      describeFlowStateChange({
        previous: { document, viewport },
        current: { document, viewport: { x: 5, y: 5, zoom: 2 } },
      })
    ).toStrictEqual([])
  })

  it('blocks element gestures and activation keys only', () => {
    const inputs: readonly Parameters<typeof blocksLockedInteraction>[0][] = [
      { type: 'pointerdown', target: 'node' },
      { type: 'click', target: 'edge' },
      { type: 'pointerdown', target: 'other' },
      { type: 'pointerdown', target: 'exempt' },
      { type: 'keydown', target: 'node', key: 'Enter' },
      { type: 'keydown', target: 'node', key: 'Tab' },
    ]

    expect(inputs.map((input) => blocksLockedInteraction(input))).toStrictEqual(
      [true, true, false, false, true, false]
    )
  })

  it('anchors a node toolbar from flow-space bounds', () => {
    expect(
      nodeToolbarAnchorForBounds(
        'a',
        { x: 10, y: 20, width: 100, height: 40 },
        { x: 5, y: 5, zoom: 2 },
        { offset: 10 }
      )
    ).toStrictEqual({ id: 'a', position: { x: 125, y: 35 } })
  })
})
