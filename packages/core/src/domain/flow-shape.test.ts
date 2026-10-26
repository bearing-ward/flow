import { Effect, Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  copyFlowSelection,
  decodeFlowGraphFragment,
  pasteFlowGraphFragment,
} from './flow-clipboard.ts'
import { getEdgeGeometry } from './flow-edge-geometry.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import {
  createFlowHistory,
  flowHistoryStatus,
  reduceFlowHistory,
} from './flow-history.ts'
import {
  decodeVersionedFlowDocument,
  encodeVersionedFlowDocument,
} from './flow-persistence.ts'
import {
  FlowFigureDataSchema,
  flowFigureKinds,
  flowFigurePath,
} from './flow-shape.schema.ts'
import {
  FlowFigureEditSchema,
  flowFigureData,
  InvalidFigureNode,
  prepareFlowFigureEdit,
} from './flow-shape.ts'
import { decodeFlowDocument } from './flow.schema.ts'
import type { FlowDocument } from './flow.schema.ts'

const empty = (): FlowDocument =>
  Effect.runSync(decodeFlowDocument({ nodes: [], edges: [] }))

const create = (
  document: FlowDocument,
  type: (typeof flowFigureKinds)[number],
  id = type
) =>
  Effect.runSync(
    prepareFlowEdit(
      document,
      Effect.runSync(
        prepareFlowFigureEdit(document, {
          kind: 'create',
          id,
          position: { x: 20, y: 30 },
          figure: { type, color: '#ff0071' },
        })
      )
    )
  ).document

const fixture = () => {
  const document = create(empty(), 'diamond')

  return {
    ...document,
    nodes: document.nodes.map((node) => ({
      ...node,
      selected: true,
      data: {
        ...node.data,
        opaque: { values: [true, null, 7], id: 'diamond' },
      },
    })),
  }
}

describe('decoded figure recipe', () => {
  it.each(flowFigureKinds)(
    'creates %s with explicit bounds and stable side-center ports',
    (type) => {
      const [node] = create(empty(), type).nodes
      expect(node?.type).toBe('shape')
      expect(node?.size).toStrictEqual({ width: 120, height: 120 })
      expect(node?.handles).toStrictEqual([
        { id: 'in', kind: 'target', side: 'left' },
        { id: 'out', kind: 'source', side: 'right' },
      ])
      expect(flowFigureData(node)).toStrictEqual({ type, color: '#ff0071' })
    }
  )

  it('returns normalized circle, diamond and hexagon outlines independently of DOM', () => {
    expect(flowFigurePath('circle')).toBe(
      'M 0 50 A 50 50 0 1 0 100 50 A 50 50 0 1 0 0 50 Z'
    )
    expect(flowFigurePath('diamond')).toBe('M 50 0 L 100 50 L 50 100 L 0 50 Z')
    expect(flowFigurePath('hexagon')).toBe(
      'M 25 0 L 75 0 L 100 50 L 75 100 L 25 100 L 0 50 Z'
    )
  })

  it.each([
    { type: 'triangle', color: '#ff0071' },
    { type: 'circle', color: 'url(unsafe)' },
    { type: 'circle' },
    null,
  ])(
    'rejects malformed figure data in live, persisted and clipboard documents',
    (data) => {
      expect(S.is(FlowFigureDataSchema)(data)).toBeFalsy()
      const document = fixture()

      const malformed = {
        ...document,
        nodes: document.nodes.map((node) => ({ ...node, data })),
      }

      expect(
        Exit.isFailure(Effect.runSyncExit(decodeFlowDocument(malformed)))
      ).toBeTruthy()
      const saved = encodeVersionedFlowDocument(document)
      expect(
        Exit.isFailure(
          Effect.runSyncExit(
            decodeVersionedFlowDocument({ ...saved, document: malformed })
          )
        )
      ).toBeTruthy()
      expect(
        Exit.isFailure(
          Effect.runSyncExit(
            decodeFlowGraphFragment({ version: 1, document: malformed })
          )
        )
      ).toBeTruthy()
      expect(document.nodes[0]?.data?.['opaque']).toStrictEqual({
        values: [true, null, 7],
        id: 'diamond',
      })
    }
  )

  it('requires finite positive explicit bounds but permits nonsquare affine circles', () => {
    const document = create(empty(), 'circle')
    const [node] = document.nodes
    expect(
      Exit.isFailure(
        Effect.runSyncExit(
          decodeFlowDocument({
            nodes: [{ ...node, size: undefined }],
            edges: [],
          })
        )
      )
    ).toBeTruthy()

    for (const width of [0, -1, Number.POSITIVE_INFINITY]) {
      expect(
        Exit.isFailure(
          Effect.runSyncExit(
            decodeFlowDocument({
              nodes: [{ ...node, size: { width, height: 80 } }],
              edges: [],
            })
          )
        )
      ).toBeTruthy()
    }

    expect(
      Effect.runSync(
        decodeFlowDocument({
          nodes: [{ ...node, size: { width: 180, height: 80 } }],
          edges: [],
        })
      ).nodes[0]?.size
    ).toStrictEqual({ width: 180, height: 80 })
  })

  it('leaves other custom node data opaque', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'custom',
            type: 'custom',
            label: 'Custom',
            position: { x: 0, y: 0 },
            data: { type: 'arbitrary-svg', color: 'anything', opaque: [1] },
          },
        ],
        edges: [],
      })
    )

    expect(document.nodes[0]?.data).toStrictEqual({
      type: 'arbitrary-svg',
      color: 'anything',
      opaque: [1],
    })
    expect(flowFigureData(document.nodes[0])).toBeUndefined()
  })

  it('rejects invalid commands, duplicate IDs and missing color targets without changing input', () => {
    const document = fixture()
    const before = structuredClone(document)
    expect(() => create(document, 'diamond')).toThrow(InvalidFigureNode)
    expect(() =>
      Effect.runSync(
        prepareFlowFigureEdit(document, {
          kind: 'color',
          nodeId: 'missing',
          color: '#ff0071',
        })
      )
    ).toThrow(InvalidFigureNode)
    expect(
      Exit.isFailure(
        Effect.runSyncExit(
          S.decodeUnknownEffect(FlowFigureEditSchema)({
            kind: 'color',
            nodeId: 'diamond',
            color: 'red',
          })
        )
      )
    ).toBeTruthy()
    expect(
      Exit.isFailure(
        Effect.runSyncExit(
          prepareFlowEdit(document, {
            operations: [
              {
                kind: 'update-node-data',
                nodeId: 'diamond',
                data: { type: 'arbitrary-svg' },
              },
            ],
          })
        )
      )
    ).toBeTruthy()
    expect(document).toStrictEqual(before)
  })

  it('preserves opaque metadata through recolor, persistence and remapped clipboard paste', () => {
    const document = fixture()

    const changed = Effect.runSync(
      prepareFlowEdit(
        document,
        Effect.runSync(
          prepareFlowFigureEdit(document, {
            kind: 'color',
            nodeId: 'diamond',
            color: '#1a8cff',
          })
        )
      )
    ).document

    expect(changed.nodes[0]?.data).toStrictEqual({
      type: 'diamond',
      color: '#1a8cff',
      opaque: { values: [true, null, 7], id: 'diamond' },
    })

    const restored = Effect.runSync(
      decodeVersionedFlowDocument(encodeVersionedFlowDocument(changed))
    )

    expect(restored.nodes[0]?.data).toStrictEqual(changed.nodes[0]?.data)
    const state = Effect.runSync(copyFlowSelection(changed))

    const pasted = Effect.runSync(
      prepareFlowEdit(
        changed,
        pasteFlowGraphFragment(state, changed).transaction
      )
    ).document

    expect(pasted.nodes[1]?.id).toBe('diamond-copy-1')
    expect(pasted.nodes[1]?.data).toStrictEqual(changed.nodes[0]?.data)
    expect(
      pasted.nodes[1]?.handles?.map((handle) => [handle.kind, handle.side])
    ).toStrictEqual([
      ['target', 'left'],
      ['source', 'right'],
    ])
  })

  it('uses current bounds for connected endpoints after color and resize', () => {
    const first = create(empty(), 'circle')

    const document = Effect.runSync(
      decodeFlowDocument({
        ...create(first, 'hexagon'),
        edges: [
          {
            id: 'edge',
            source: 'circle',
            sourceHandle: 'out',
            target: 'hexagon',
            targetHandle: 'in',
            path: 'straight',
          },
        ],
      })
    )

    const resized = Effect.runSync(
      prepareFlowEdit(document, {
        operations: [
          {
            kind: 'update-node',
            nodeId: 'circle',
            patch: {
              position: { x: 100, y: 200 },
              size: { width: 180, height: 80 },
            },
          },
        ],
      })
    ).document

    const geometry = getEdgeGeometry(resized, 'edge')
    expect(geometry?.source).toStrictEqual({ x: 285.5, y: 240 })
    expect(geometry?.target).toStrictEqual({ x: 14.5, y: 90 })
  })

  it('records creation and recolor in the existing history and restores figure intent on undo', () => {
    const initial = empty()
    const created = create(initial, 'hexagon')
    let history = createFlowHistory(initial)
    history = reduceFlowHistory(history, {
      kind: 'accepted',
      document: created,
    }).state

    const changed = Effect.runSync(
      prepareFlowEdit(
        created,
        Effect.runSync(
          prepareFlowFigureEdit(created, {
            kind: 'color',
            nodeId: 'hexagon',
            color: '#ffb300',
          })
        )
      )
    ).document

    history = reduceFlowHistory(history, {
      kind: 'accepted',
      document: changed,
    }).state
    expect(flowHistoryStatus(history).pastCount).toBe(2)

    const replay = reduceFlowHistory(history, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'undo-color',
    })

    expect(replay.replacement?.document.nodes[0]?.data).toStrictEqual({
      type: 'hexagon',
      color: '#ff0071',
    })
  })
})
