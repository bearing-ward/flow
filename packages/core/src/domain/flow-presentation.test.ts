import { Effect, Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { resolveEdgeHandles } from './flow-edge.schema.ts'
import { createFlowGraph } from './flow-graph.ts'
import {
  decodeVersionedFlowDocument,
  decodeVersionedFlowSession,
  encodeSavedFlowDocument,
  encodeVersionedFlowDocument,
  encodeVersionedFlowSession,
} from './flow-persistence.ts'
import {
  decodeFlowDocument,
  flowNodeHandles,
  FlowNodeSchema,
} from './flow.schema.ts'

const presentationDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'a',
        label: 'A',
        position: { x: 0, y: 0 },
        style: { backgroundColor: '#fff', width: 180 },
        className: 'custom-node',
        sourcePosition: 'right',
        targetPosition: 'left',
        dragHandle: '.drag-handle',
        expandParent: true,
        selected: true,
        measured: { width: 180, height: 40 },
      },
      { id: 'b', label: 'B', position: { x: 300, y: 0 } },
    ],
    edges: [
      {
        id: 'e',
        source: 'a',
        target: 'b',
        markerEnd: { type: 'arrowclosed', color: '#ff0072' },
        style: { stroke: '#ff0072' },
        className: 'custom-edge',
        animated: true,
        label: 'label',
        labelStyle: { fill: 'white' },
        labelShowBg: true,
        labelBgStyle: { fill: '#333' },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 4,
      },
    ],
  })
)

describe('Plan 114 node fields', () => {
  it('decodes React node presentation fields and rejects bad values', () => {
    const [node] = presentationDocument.nodes

    expect(node).toMatchObject({
      className: 'custom-node',
      sourcePosition: 'right',
      targetPosition: 'left',
      dragHandle: '.drag-handle',
      expandParent: true,
      measured: { width: 180, height: 40 },
    })

    for (const patch of [
      { sourcePosition: 'middle' },
      { dragHandle: '' },
      { style: { width: Number.POSITIVE_INFINITY } },
      { measured: { width: -1 } },
      { className: 1 },
    ]) {
      expect(
        Exit.isFailure(
          S.decodeUnknownExit(FlowNodeSchema)({
            id: 'n',
            label: 'N',
            position: { x: 0, y: 0 },
            ...patch,
          })
        )
      ).toBeTruthy()
    }
  })

  it('derives default handles from source and target positions', () => {
    const [node, plain] = presentationDocument.nodes

    expect(node === undefined ? [] : flowNodeHandles(node)).toStrictEqual([
      { id: 'target', kind: 'target', side: 'left' },
      { id: 'source', kind: 'source', side: 'right' },
    ])
    expect(plain === undefined ? [] : flowNodeHandles(plain)).toStrictEqual([])
    expect(
      flowNodeHandles({ targetPosition: 'bottom' }).map(({ side }) => side)
    ).toStrictEqual(['bottom', 'bottom'])
    expect(
      flowNodeHandles({
        handles: [],
        sourcePosition: 'right',
      })
    ).toStrictEqual([])

    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 0, y: 0 },
            sourcePosition: 'right',
          },
          {
            id: 'b',
            label: 'B',
            position: { x: 9, y: 0 },
            targetPosition: 'left',
          },
        ],
        edges: [{ id: 'e', source: 'a', target: 'b' }],
      })
    )

    const [edge] = document.edges

    expect(
      edge === undefined
        ? undefined
        : resolveEdgeHandles(document, edge)?.sourceHandle.side
    ).toBe('right')
  })

  it('uses node.measured below DOM measurements and above size', () => {
    const graph = createFlowGraph(presentationDocument)
    const [first] = graph.orderedNodes

    expect(first?.dimensions).toStrictEqual({ width: 180, height: 40 })
  })
})

describe('Plan 114 persistence', () => {
  const viewport = { x: 1, y: 2, zoom: 1 }

  it('stores presentation fields in a v3 envelope and round trips them', () => {
    const saved = encodeVersionedFlowSession(presentationDocument, viewport)

    expect(saved.version).toBe(3)
    expect(Object.hasOwn(saved.document.nodes[0] ?? {}, 'selected')).toBeFalsy()
    expect(Object.hasOwn(saved.document.nodes[0] ?? {}, 'measured')).toBeFalsy()

    const json = structuredClone(saved)
    const restored = Effect.runSync(decodeVersionedFlowSession(json))

    expect(restored.document.edges[0]).toStrictEqual(
      presentationDocument.edges[0]
    )

    const [stored] = presentationDocument.nodes

    expect(restored.document.nodes[0]).toStrictEqual(
      stored === undefined
        ? undefined
        : (({ selected: _selected, measured: _measured, ...node }) => node)(
            stored
          )
    )
  })

  it('round trips the v3 document body', () => {
    expect(
      Effect.runSync(
        decodeVersionedFlowDocument(
          encodeVersionedFlowDocument(presentationDocument)
        )
      ).edges
    ).toStrictEqual(presentationDocument.edges)
  })

  it('keeps v1 and v2 output for documents without presentation fields', () => {
    const plain = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 0, y: 0 },
            measured: { width: 5, height: 5 },
          },
        ],
        edges: [],
      })
    )

    expect(encodeVersionedFlowDocument(plain)).toStrictEqual({
      version: 1,
      document: {
        nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 0 } }],
        edges: [],
      },
    })
    expect(
      encodeVersionedFlowDocument({ ...plain, nodeOrigin: [0.5, 0.5] }).version
    ).toBe(2)
  })

  it('refuses to drop presentation fields into the legacy v1 writer', () => {
    expect(() => encodeSavedFlowDocument(presentationDocument)).toThrow(
      expect.objectContaining({
        code: 'presentation-fields-require-versioned-session',
      })
    )
  })

  it('strips presentation keys from v1 and v2 input, as the frozen readers do', () => {
    const forged = {
      version: 2,
      document: {
        nodes: [
          { id: 'a', label: 'A', position: { x: 0, y: 0 }, className: 'x' },
        ],
        edges: [],
      },
    }

    expect(
      Effect.runSync(decodeVersionedFlowDocument(forged)).nodes[0]
    ).toStrictEqual({ id: 'a', label: 'A', position: { x: 0, y: 0 } })
    expect(
      Exit.isFailure(
        Effect.runSyncExit(
          decodeVersionedFlowDocument({
            ...forged,
            document: {
              ...forged.document,
              nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 0 } }],
              edges: [
                {
                  id: 'e',
                  source: 'a',
                  target: 'a',
                  markerEnd: { type: 'arrow' },
                },
              ],
            },
          })
        )
      )
    ).toBeTruthy()
  })
})
