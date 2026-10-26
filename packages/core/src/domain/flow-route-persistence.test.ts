import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  copyFlowSelection,
  decodeFlowGraphFragment,
  pasteFlowGraphFragment,
} from './flow-clipboard.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import {
  decodeSavedFlowDocument,
  decodeSavedFlowSession,
  decodeVersionedFlowDocument,
  decodeVersionedFlowSession,
  encodeSavedFlowDocument,
  encodeSavedFlowSession,
  encodeVersionedFlowDocument,
  encodeVersionedFlowSession,
  SavedFlowDocumentSchema,
  SavedOriginFlowDocumentSchema,
  SavedPresentationFlowDocumentSchema,
  SavedRouteFlowDocumentSchema,
  SavedRouteFlowSessionSchema,
  SavedVersionedFlowDocumentSchema,
  SavedVersionedFlowSessionSchema,
} from './flow-persistence.ts'
import { FlowEdgeRouteSchema } from './flow-route.schema.ts'
import { SavedFlowFormatError } from './flow-save-format-error.ts'
import { decodeFlowDocument, EdgeIdSchema } from './flow.schema.ts'
import type { FlowEdge } from './flow.schema.ts'

const nodes = [
  { id: 'a', label: 'A', position: { x: 10, y: 30 }, selected: true },
  { id: 'b', label: 'B', position: { x: 200, y: 80 }, selected: true },
]

const data = {
  route: { mode: 'manual', points: [{ x: 7, y: 9 }] },
  id: 'a',
  values: [true, null, 'edge'],
}

const edge = { id: 'edge', source: 'a', target: 'b', selected: true, data }

const viewport = { x: 12, y: -30, zoom: 1.5 }

const manual = S.decodeUnknownSync(FlowEdgeRouteSchema)({
  mode: 'manual',
  points: [
    { x: 80, y: -10 },
    { x: 150, y: 120 },
  ],
})

const automatic = S.decodeUnknownSync(FlowEdgeRouteSchema)({
  mode: 'automatic',
})

const routedDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes,
      edges: [
        { ...edge, route: manual },
        { ...edge, id: 'automatic', route: automatic },
      ],
    })
  )

const wireRoundtrip = <A>(input: A) => {
  const json = JSON.stringify(input)

  return S.decodeUnknownSync(S.Json)(JSON.parse(json))
}

const formatCode = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runSync(
    Effect.match(effect, {
      onFailure: (failure) =>
        failure instanceof SavedFlowFormatError
          ? failure.code
          : 'other-failure',
      onSuccess: () => 'success',
    })
  )

describe('route persistence v4', () => {
  it('round trips both route modes in raw and JSON documents and sessions without transient selection', () => {
    const document = routedDocument()
    const before = structuredClone(document)
    const saved = encodeVersionedFlowDocument(document)
    const session = encodeVersionedFlowSession(document, viewport)
    expect([
      saved.version,
      S.is(SavedRouteFlowDocumentSchema)(saved),
      S.is(SavedRouteFlowSessionSchema)(session),
      S.is(SavedVersionedFlowDocumentSchema)(saved),
      S.is(SavedVersionedFlowSessionSchema)(session),
    ]).toStrictEqual([4, true, true, true, true])

    if (saved.version !== 4) {
      throw new Error('Expected v4 route document')
    }

    const expectedEdges = [
      { id: 'edge', source: 'a', target: 'b', data, route: manual },
      { id: 'automatic', source: 'a', target: 'b', data, route: automatic },
    ]

    expect(saved.document.edges).toStrictEqual(expectedEdges)

    for (const input of [saved, wireRoundtrip(saved)]) {
      expect(
        Effect.runSync(decodeVersionedFlowDocument(input)).edges
      ).toStrictEqual(expectedEdges)
    }

    for (const input of [session, wireRoundtrip(session)]) {
      const loaded = Effect.runSync(decodeVersionedFlowSession(input))
      expect([loaded.document.edges, loaded.viewport]).toStrictEqual([
        expectedEdges,
        viewport,
      ])
    }

    expect({
      selectionOmitted: saved.document.nodes.every(
        (node) => !Object.hasOwn(node, 'selected')
      ),
      document,
      routeCloned: saved.document.edges[0]?.route !== document.edges[0]?.route,
    }).toStrictEqual({
      selectionOmitted: true,
      document: before,
      routeCloned: true,
    })
  })

  it.each([manual, automatic, undefined])(
    'selects v4 whenever an edge owns route and rejects legacy writers',
    (route) => {
      const document = Effect.runSync(
        decodeFlowDocument({ nodes, edges: [{ ...edge, route }] })
      )

      expect(encodeVersionedFlowDocument(document).version).toBe(4)
      expect(() => encodeSavedFlowDocument(document)).toThrow(
        expect.objectContaining({
          code: 'route-requires-versioned-session',
        })
      )
      expect(() => encodeSavedFlowSession(document, viewport)).toThrow(
        SavedFlowFormatError
      )
    }
  )

  it.each([
    { version: 1, nodePatch: {}, edgePatch: {} },
    {
      version: 2,
      nodePatch: { origin: [0.5, 0.5], connectable: false },
      edgePatch: { ariaRole: 'link' },
    },
    {
      version: 3,
      nodePatch: { className: 'card' },
      edgePatch: { animated: true, markerEnd: { type: 'arrow' } },
    },
  ])(
    'keeps the exact v$version projection and roundtrip when route intent is absent',
    ({ version, nodePatch, edgePatch }) => {
      const document = Effect.runSync(
        decodeFlowDocument({
          nodes: nodes.map(({ selected: _selected, ...node }) => ({
            ...node,
            ...nodePatch,
          })),
          edges: [{ id: 'edge', source: 'a', target: 'b', data, ...edgePatch }],
        })
      )

      const expected = { version, document }
      expect(encodeVersionedFlowDocument(document)).toStrictEqual(expected)
      expect(
        Effect.runSync(decodeVersionedFlowDocument(expected))
      ).toStrictEqual(document)
      expect(
        Effect.runSync(decodeVersionedFlowSession({ ...expected, viewport }))
          .document
      ).toStrictEqual(document)
      expect(encodeVersionedFlowSession(document, viewport)).toStrictEqual({
        ...expected,
        viewport,
      })
    }
  )

  it('keeps route out of every frozen v1/v2/v3 literal schema', () => {
    const document = routedDocument()

    for (const { schema, version } of [
      { schema: SavedFlowDocumentSchema, version: 1 },
      { schema: SavedOriginFlowDocumentSchema, version: 2 },
      { schema: SavedPresentationFlowDocumentSchema, version: 3 },
    ]) {
      const saved = S.decodeUnknownSync(schema)({ version, document })
      expect(
        saved.document.edges.map((item) => Object.hasOwn(item, 'route'))
      ).toStrictEqual([false, false])
      expect(saved.document.edges[0]?.data).toStrictEqual(data)
    }
  })

  it.each([1, 2, 3])(
    'rejects route ownership on mislabeled v%i documents and sessions',
    (version) => {
      for (const route of [
        manual,
        automatic,
        undefined,
        null,
        { mode: 'manual', points: [] },
      ]) {
        const input = {
          version,
          document: { nodes, edges: [{ ...edge, route }] },
          viewport,
        }

        expect(formatCode(decodeVersionedFlowDocument(input))).toBe(
          'route-requires-versioned-session'
        )
        expect(formatCode(decodeVersionedFlowSession(input))).toBe(
          'route-requires-versioned-session'
        )
      }
    }
  )

  it.each([manual, automatic, undefined, null, { mode: 'manual', points: [] }])(
    'rejects routed v1 envelopes through legacy-only readers',
    (route) => {
      const input = {
        version: 1,
        document: { nodes, edges: [{ ...edge, route }] },
        viewport,
      }

      expect([
        formatCode(decodeSavedFlowDocument(input)),
        formatCode(decodeSavedFlowSession(input)),
      ]).toStrictEqual([
        'route-requires-versioned-session',
        'route-requires-versioned-session',
      ])
    }
  )

  it.each([
    null,
    { mode: 'unknown' },
    { mode: 'manual' },
    { mode: 'manual', points: [] },
    { mode: 'manual', points: [{ x: Infinity, y: 0 }] },
    { mode: 'manual', points: [{ x: 1, y: Number.NaN }] },
    {
      mode: 'manual',
      points: [
        { x: 1, y: 2 },
        { x: 1, y: 2 },
      ],
    },
  ])(
    'rejects invalid route %j in v4 documents, sessions and clipboard fragments',
    (route) => {
      const document = { nodes, edges: [{ ...edge, route }] }
      expect(
        Effect.runSyncExit(
          decodeVersionedFlowDocument({ version: 4, document })
        )._tag
      ).toBe('Failure')
      expect(
        Effect.runSyncExit(
          decodeVersionedFlowSession({ version: 4, document, viewport })
        )._tag
      ).toBe('Failure')
      expect(
        Effect.runSyncExit(decodeFlowGraphFragment({ version: 1, document }))
          ._tag
      ).toBe('Failure')
    }
  )
})

const nestedDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'parent',
          label: 'Parent',
          position: { x: 100, y: 200 },
          selected: true,
        },
        {
          id: 'child',
          label: 'Child',
          parentId: 'parent',
          position: { x: 20, y: 30 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'nested',
          label: 'Nested',
          parentId: 'parent',
          position: { x: 200, y: 30 },
        },
        {
          id: 'leaf',
          label: 'Leaf',
          parentId: 'nested',
          position: { x: 10, y: 20 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          ...edge,
          source: 'child',
          target: 'leaf',
          sourceHandle: 'out',
          targetHandle: 'in',
          route: manual,
        },
        { id: 'automatic', source: 'leaf', target: 'child', route: automatic },
        { id: 'ordinary', source: 'leaf', target: 'child', data },
      ],
    })
  )

describe('route clipboard placement', () => {
  it('translates every manual point once with repeat offsets and preserves original points and opaque data', () => {
    const document = nestedDocument()
    const state = Effect.runSync(copyFlowSelection(document))
    const firstPaste = pasteFlowGraphFragment(state, document)

    const first = Effect.runSync(
      prepareFlowEdit(document, firstPaste.transaction)
    ).document

    const secondPaste = pasteFlowGraphFragment(firstPaste.state, first)

    const second = Effect.runSync(
      prepareFlowEdit(first, secondPaste.transaction)
    ).document

    expect(first.edges.find(({ id }) => id === 'edge-copy-1')).toMatchObject({
      source: 'child-copy-1',
      target: 'leaf-copy-1',
      sourceHandle: 'child-copy-1-out',
      targetHandle: 'leaf-copy-1-in',
      route: {
        mode: 'manual',
        points: [
          { x: 100, y: 10 },
          { x: 170, y: 140 },
        ],
      },
      data,
    })
    expect(second.edges.find(({ id }) => id === 'edge-copy-2')).toMatchObject({
      route: {
        mode: 'manual',
        points: [
          { x: 120, y: 30 },
          { x: 190, y: 160 },
        ],
      },
      data,
    })
    expect(
      second.nodes.find(({ id }) => id === 'parent-copy-2')?.position
    ).toStrictEqual({ x: 140, y: 240 })
    expect(second.nodes.find(({ id }) => id === 'leaf-copy-2')).toMatchObject({
      parentId: 'nested-copy-2',
      position: { x: 10, y: 20 },
    })
    expect({
      automatic: first.edges.find(({ id }) => id === 'automatic-copy-1')?.route,
      ordinaryOwnsRoute: Object.hasOwn(
        first.edges.find(({ id }) => id === 'ordinary-copy-1') ?? {},
        'route'
      ),
      copied: state.fragment?.document.edges[0]?.route,
      original: document.edges[0]?.route,
    }).toStrictEqual({
      automatic,
      ordinaryOwnsRoute: false,
      copied: manual,
      original: manual,
    })
  })

  it('uses the explicit root offset for nested routes before extension hooks', () => {
    const document = nestedDocument()
    const state = Effect.runSync(copyFlowSelection(document))

    const observed: {
      id: string
      route: FlowEdge['route']
      mappedId: string | undefined
    }[] = []

    const paste = pasteFlowGraphFragment(
      state,
      document,
      { position: { x: -50, y: 300 } },
      [
        {
          remapEdge: (item, references) => {
            observed.push({
              id: item.id,
              route: item.route,
              mappedId: references.edgeIds.get(EdgeIdSchema.make('edge')),
            })

            return item.route?.mode === 'manual'
              ? { ...item, label: 'hook saw translated route' }
              : item
          },
        },
      ]
    )

    const pasted = Effect.runSync(
      prepareFlowEdit(document, paste.transaction)
    ).document

    const expected = {
      mode: 'manual',
      points: [
        { x: -70, y: 90 },
        { x: 0, y: 220 },
      ],
    }

    expect(observed[0]).toStrictEqual({
      id: 'edge-copy-1',
      route: expected,
      mappedId: 'edge-copy-1',
    })
    expect(pasted.edges.find(({ id }) => id === 'edge-copy-1')).toMatchObject({
      route: expected,
      data,
      label: 'hook saw translated route',
    })
    expect(
      pasted.nodes.find(({ id }) => id === 'parent-copy-1')?.position
    ).toStrictEqual({ x: -50, y: 300 })
    expect(
      pasted.nodes.find(({ id }) => id === 'child-copy-1')?.position
    ).toStrictEqual({ x: 20, y: 30 })
  })
})
