import { Effect, Schema as S } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as frozen from '../../../conformance/src/fixtures/legacy-v1-persistence/baseline-reader-writer.js'
import { legacyV1Input } from '../../../conformance/src/legacy-v1-input.ts'
import {
  FlowConnectionRequestSchema,
  FlowConnectionSchema,
  InvalidFlowConnection,
  InvalidFlowConnectionRequest,
  MissingEdgeHandle,
  connectionFromHandleGesture,
  decodeFlowDocument,
  decodeSavedFlowDocument,
  decodeSavedFlowSession,
  encodeSavedFlowDocument,
  encodeSavedFlowSession,
  nextConnectionEdge,
  normalizeFlowConnection,
  reconnectFlowEdge,
  resolveEdgeHandles,
  resolveFlowConnectionRequest,
  validateFlowConnection,
  EdgeIdSchema,
} from '../public.ts'
import type { FlowConnection, FlowConnectionRequest } from '../public.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: ['a', 'b', 'c'].map((id, index) => ({
      id,
      label: id,
      position: { x: index * 200, y: 0 },
      handles: [
        { id: 's1', kind: 'source', side: 'right' },
        { id: 's2', kind: 'source', side: 'bottom' },
        { id: 't1', kind: 'target', side: 'left' },
        { id: 't2', kind: 'target', side: 'top' },
      ],
    })),
    edges: [],
  })
)

const pair = (sourceHandle: string, targetHandle: string): FlowConnection =>
  S.decodeUnknownSync(FlowConnectionSchema)({
    source: 'a',
    sourceHandle,
    target: 'b',
    targetHandle,
  })

describe('directed named-handle core public boundary', () => {
  it('keeps a requested pair eligible when another target uses identical handle IDs', () => {
    const connection = pair('s1', 't1')

    const unrelated = nextConnectionEdge(
      document,
      S.decodeUnknownSync(FlowConnectionSchema)({
        ...connection,
        target: 'c',
      })
    )

    const accepted = Effect.runSync(
      decodeFlowDocument({ ...document, edges: [unrelated] })
    )

    expect(Effect.runSync(validateFlowConnection(accepted, connection))).toBe(
      connection
    )
    expect(
      Effect.runSync(validateFlowConnection(accepted, connection, 'loose'))
    ).toBe(connection)
    const duplicate = nextConnectionEdge(accepted, connection)

    expect(
      Effect.runSync(
        Effect.flip(
          validateFlowConnection(
            { ...accepted, edges: [unrelated, duplicate] },
            connection
          )
        )
      ).reason
    ).toBe('duplicate-connection')
  })

  it.each([
    ['s1', 't1', true],
    ['s1', 's1', false],
    ['t1', 's1', false],
    ['t1', 't1', false],
  ])(
    'validates %s -> %s without reversing directed input',
    (source, target, strict) => {
      const connection = pair(source, target)
      expect(
        Effect.runSync(validateFlowConnection(document, connection, 'loose'))
      ).toBe(connection)
      expect(
        Effect.runSync(validateFlowConnection(document, connection, 'loose'))
      ).toBe(connection)
      expect(
        Effect.runSync(
          Effect.exit(validateFlowConnection(document, connection))
        )._tag
      ).toBe(strict ? 'Success' : 'Failure')
      const edge = nextConnectionEdge(document, connection)

      const accepted = Effect.runSync(
        decodeFlowDocument({ ...document, edges: [edge] })
      )

      const resolved = resolveEdgeHandles(accepted, edge)
      expect([
        resolved?.sourceHandle.id,
        resolved?.targetHandle.id,
      ]).toStrictEqual([source, target])
      expect(
        Effect.runSync(
          Effect.flip(validateFlowConnection(accepted, connection, 'loose'))
        ).reason
      ).toBe('duplicate-connection')
    }
  )

  it.each([
    ['s1', 't1'],
    ['s1', 's1'],
    ['t1', 's1'],
    ['t1', 't1'],
  ])('constructs fresh %s -> %s gesture direction once', (from, to) => {
    const raw = pair(from, to)

    const directed = Effect.runSync(
      connectionFromHandleGesture(
        {
          document,
          fromNodeId: raw.source,
          fromHandleId: raw.sourceHandle,
          toNodeId: raw.target,
          toHandleId: raw.targetHandle,
        },
        'loose'
      )
    )

    expect(directed).toStrictEqual(
      from === 't1'
        ? {
            source: raw.target,
            sourceHandle: raw.targetHandle,
            target: raw.source,
            targetHandle: raw.sourceHandle,
          }
        : raw
    )
    expect(
      Effect.runSync(validateFlowConnection(document, directed, 'loose'))
    ).toBe(directed)
    expect(
      Effect.runSync(
        Effect.exit(
          connectionFromHandleGesture({
            document,
            fromNodeId: raw.source,
            fromHandleId: raw.sourceHandle,
            toNodeId: raw.target,
            toHandleId: raw.targetHandle,
          })
        )
      )._tag
    ).toBe(from === to ? 'Failure' : 'Success')
  })

  it.each([
    ['s1', 't1'],
    ['s1', 's1'],
    ['t1', 's1'],
    ['t1', 't1'],
    ['missing', 's1'],
    ['t1', 'missing'],
  ])(
    'normalizes only resolved loose opposite kinds idempotently: %s/%s',
    (source, target) => {
      const connection = pair(source, target)
      expect(normalizeFlowConnection(document, connection)).toBe(connection)
      expect(normalizeFlowConnection(document, connection, 'strict')).toBe(
        connection
      )
      const normalized = normalizeFlowConnection(document, connection, 'loose')
      expect(normalized).toStrictEqual(
        source === 't1' && target === 's1'
          ? {
              source: connection.target,
              sourceHandle: connection.targetHandle,
              target: connection.source,
              targetHandle: connection.sourceHandle,
            }
          : connection
      )
      expect(normalizeFlowConnection(document, normalized, 'loose')).toBe(
        normalized
      )
    }
  )

  it('rejects identical physical handles and missing identities without reversing failures', () => {
    const raw = pair('t1', 't1')
    const same = { ...raw, target: raw.source }
    expect(
      Effect.runSync(
        Effect.flip(validateFlowConnection(document, same, 'loose'))
      ).reason
    ).toBe('same-handle')

    for (const connection of [pair('missing', 't1'), pair('t1', 'missing')]) {
      const failure = Effect.runSync(
        Effect.flip(validateFlowConnection(document, connection, 'loose'))
      )

      expect(failure).toBeInstanceOf(InvalidFlowConnection)
      expect(failure).toMatchObject(connection)
    }

    expect(
      Effect.runSync(
        Effect.flip(
          validateFlowConnection({ ...document, nodes: [] }, raw, 'loose')
        )
      ).reason
    ).toBe('missing-source-node')
    expect(
      Effect.runSync(
        Effect.flip(
          validateFlowConnection(
            {
              ...document,
              nodes: document.nodes.filter((node) => node.id !== 'b'),
            },
            raw,
            'loose'
          )
        )
      ).reason
    ).toBe('missing-target-node')
  })

  it('decodes required nullable request fields with distinct resolved inference', () => {
    const request = S.decodeUnknownSync(FlowConnectionRequestSchema)({
      source: 'a',
      sourceHandle: null,
      target: 'b',
      targetHandle: null,
    })

    expectTypeOf(request).toEqualTypeOf<FlowConnectionRequest>()

    const resolved = Effect.runSync(
      resolveFlowConnectionRequest(document, request)
    )

    expectTypeOf(resolved).toEqualTypeOf<FlowConnection>()
    expect(resolved).toStrictEqual(pair('s1', 't1'))

    // @ts-expect-error Required request handles cannot be omitted.
    const omitted: FlowConnectionRequest = {
      source: request.source,
      target: request.target,
    }

    expect(S.is(FlowConnectionRequestSchema)(omitted)).toBeFalsy()

    const invalid: FlowConnectionRequest = {
      source: request.source,
      target: request.target,
      // @ts-expect-error Resolved brands cannot be replaced with raw strings.
      sourceHandle: 's1',
      targetHandle: null,
    }

    expect(S.is(FlowConnectionRequestSchema)(invalid)).toBeTruthy()
    expectTypeOf<FlowConnectionRequest>().not.toExtend<FlowConnection>()

    for (const input of [
      omitted,
      { ...request, sourceHandle: undefined },
      { ...request, sourceHandle: '' },
    ]) {
      expect(
        Effect.runSync(
          Effect.exit(resolveFlowConnectionRequest(document, input))
        )._tag
      ).toBe('Failure')
    }
  })

  it('retains null-resolved named IDs through reorder and legacy save/restore', () => {
    const request = {
      source: 'a',
      sourceHandle: null,
      target: 'b',
      targetHandle: null,
    }

    const resolved = Effect.runSync(
      resolveFlowConnectionRequest(document, request)
    )

    const edge = nextConnectionEdge(document, resolved)

    const reordered = Effect.runSync(
      decodeFlowDocument({
        ...document,
        edges: [edge],
        nodes: document.nodes.map((node) => ({
          ...node,
          handles: (node.handles ?? []).toReversed(),
        })),
      })
    )

    for (const input of [request, resolved]) {
      // Reorder changes what a new null request selects; duplicate uses its current physical pair.
      const original = { ...document, edges: [edge] }

      const failure = Effect.runSync(
        Effect.flip(resolveFlowConnectionRequest(original, input))
      )

      expect(failure).toBeInstanceOf(InvalidFlowConnection)

      if (!(failure instanceof InvalidFlowConnection)) {
        throw new Error('Expected resolved validation failure')
      }

      expect(failure.reason).toBe('duplicate-connection')
    }

    expect(
      Effect.runSync(resolveFlowConnectionRequest(reordered, request))
    ).toStrictEqual(pair('s2', 't2'))

    const loaded = Effect.runSync(
      decodeSavedFlowDocument(encodeSavedFlowDocument(reordered))
    )

    expect(loaded.edges[0]).toStrictEqual(edge)
    expect(resolveEdgeHandles(loaded, edge)?.sourceHandle.id).toBe('s1')
    expect(resolveEdgeHandles(loaded, edge)?.targetHandle.id).toBe('t1')
    expect(request.sourceHandle).toBeNull()
  })

  it('fails unresolved null defaults without fabricated handles or graph changes', () => {
    const noSources = {
      ...document,
      nodes: document.nodes.map((node) => ({
        ...node,
        handles: node.handles?.filter((handle) => handle.kind === 'target'),
      })),
    }

    const before = structuredClone(noSources)

    const failure = Effect.runSync(
      Effect.flip(
        resolveFlowConnectionRequest(noSources, {
          source: 'a',
          sourceHandle: null,
          target: 'b',
          targetHandle: null,
        })
      )
    )

    expect(S.is(InvalidFlowConnectionRequest)(failure)).toBeTruthy()
    expect(failure).toMatchObject({
      reason: 'missing-source-handle',
      sourceHandle: null,
      targetHandle: null,
    })
    expect(noSources).toStrictEqual(before)

    const noncanonical = Effect.runSync(
      Effect.flip(resolveFlowConnectionRequest(document, pair('t1', 's1')))
    )

    expect(noncanonical).toBeInstanceOf(InvalidFlowConnection)
    expect(noncanonical).toMatchObject({
      sourceHandle: 't1',
      targetHandle: 's1',
    })
  })

  it('preserves omitted/own-undefined fallback and does not invent missing geometry', () => {
    const explicit = nextConnectionEdge(document, pair('s1', 't1'))

    const {
      sourceHandle: _source,
      targetHandle: _target,
      ...omitted
    } = explicit

    const reordered = {
      ...document,
      nodes: document.nodes.map((node) => ({
        ...node,
        handles: (node.handles ?? []).toReversed(),
      })),
    }

    for (const edge of [
      omitted,
      { ...omitted, sourceHandle: undefined, targetHandle: undefined },
    ]) {
      expect(resolveEdgeHandles(document, edge)?.sourceHandle.id).toBe('s1')
      expect(resolveEdgeHandles(reordered, edge)?.sourceHandle.id).toBe('s2')
      expect(resolveEdgeHandles(reordered, edge)?.targetHandle.id).toBe('t2')
      expect(
        Effect.runSync(
          Effect.flip(
            validateFlowConnection(
              { ...document, edges: [edge] },
              pair('s1', 't1')
            )
          )
        ).reason
      ).toBe('duplicate-connection')
      expect(
        resolveEdgeHandles(
          {
            ...document,
            nodes: document.nodes.map((node) => ({ ...node, handles: [] })),
          },
          edge
        )
      ).toBeUndefined()
    }

    expect(
      resolveEdgeHandles(document, {
        ...explicit,
        sourceHandle: pair('missing', 't1').sourceHandle,
      })
    ).toBeUndefined()
  })

  it.each([
    ['s1', 's1'],
    ['t1', 't1'],
    ['t1', 's1'],
  ])(
    'reconnects each endpoint of %s/%s without moving the other endpoint',
    (source, target) => {
      const edge = nextConnectionEdge(document, pair(source, target))

      const accepted = Effect.runSync(
        decodeFlowDocument({ ...document, edges: [edge] })
      )

      const replacement = pair('s2', 't2')

      for (const endpoint of ['source', 'target'] as const) {
        const result = Effect.runSync(
          reconnectFlowEdge(
            accepted,
            edge.id,
            endpoint,
            replacement.target,
            endpoint === 'source'
              ? replacement.sourceHandle
              : replacement.targetHandle,
            'loose'
          )
        )

        expect(result).toStrictEqual(
          endpoint === 'source'
            ? {
                ...edge,
                source: replacement.target,
                sourceHandle: replacement.sourceHandle,
              }
            : {
                ...edge,
                target: replacement.target,
                targetHandle: replacement.targetHandle,
              }
        )

        if (result === undefined) {
          throw new Error('Expected replacement')
        }

        expect(
          Effect.runSync(decodeFlowDocument({ ...accepted, edges: [result] }))
            .edges[0]
        ).toStrictEqual(result)
      }

      expect(
        Effect.runSync(
          Effect.exit(
            reconnectFlowEdge(
              accepted,
              edge.id,
              'target',
              replacement.target,
              replacement.targetHandle
            )
          )
        )._tag
      ).toBe(source === 's1' ? 'Success' : 'Failure')
      expect(accepted.edges[0]).toStrictEqual(edge)
    }
  )
})

describe('frozen endpoint-kind reader compatibility and legacy extension selection', () => {
  const viewport = { x: 1, y: 2, zoom: 1 }

  it.each([
    ['s1', 't1', true],
    ['s1', 's1', false],
    ['t1', 't1', false],
    ['t1', 's1', false],
    ['missing', 't1', false],
  ])(
    'keeps current and frozen readers aligned for explicit %s/%s',
    (source, target, valid) => {
      const body = {
        ...document,
        edges: [nextConnectionEdge(document, pair(source, target))],
      }

      const saved = { version: 1, document: body }

      for (const decoder of [
        decodeSavedFlowDocument,
        frozen.decodeSavedFlowDocument,
      ]) {
        expect(Effect.runSync(Effect.exit(decoder(saved)))._tag).toBe(
          valid ? 'Success' : 'Failure'
        )
      }

      for (const decoder of [
        decodeSavedFlowSession,
        frozen.decodeSavedFlowSession,
      ]) {
        expect(
          Effect.runSync(Effect.exit(decoder({ ...saved, viewport })))._tag
        ).toBe(valid ? 'Success' : 'Failure')
      }
    }
  )

  it('preserves frozen omitted/undefined behavior, excess stripping, and null/version rejection', () => {
    const edge = {
      id: EdgeIdSchema.make('edge'),
      source: pair('s1', 't1').source,
      target: pair('s1', 't1').target,
    }

    for (const endpointFields of [
      {},
      { sourceHandle: undefined, targetHandle: undefined },
    ]) {
      const saved = {
        version: 1,
        document: {
          ...document,
          extra: true,
          edges: [{ ...edge, ...endpointFields }],
        },
      }

      expect(Effect.runSync(decodeSavedFlowDocument(saved))).toStrictEqual(
        Effect.runSync(frozen.decodeSavedFlowDocument(saved))
      )
    }

    for (const saved of [
      {
        version: 1,
        document: { ...document, edges: [{ ...edge, sourceHandle: null }] },
      },
      { version: 2, document },
      { version: 3, document },
      {
        version: 1,
        document: { ...document, edges: [{ ...edge, source: 'missing' }] },
      },
    ]) {
      for (const decoder of [
        decodeSavedFlowDocument,
        frozen.decodeSavedFlowDocument,
      ]) {
        expect(Effect.runSync(Effect.exit(decoder(saved)))._tag).toBe('Failure')
      }
    }
  })

  it('rejects valid noncanonical saves with exact precedence without changing accepted state', () => {
    const accepted = Effect.runSync(
      decodeFlowDocument({
        ...document,
        edges: [nextConnectionEdge(document, pair('t1', 't1'))],
      })
    )

    const withOrigin = {
      ...accepted,
      nodeOrigin: undefined,
      nodes: accepted.nodes.map((node) => ({ ...node, connectable: false })),
    }

    for (const [body, code] of [
      [accepted, 'noncanonical-handles-require-versioned-session'],
      [
        {
          ...accepted,
          nodes: accepted.nodes.map((node) => ({
            ...node,
            connectable: undefined,
          })),
        },
        'native-fields-require-versioned-session',
      ],
      [withOrigin, 'origin-requires-versioned-session'],
    ] as const) {
      const before = structuredClone(body)
      expect(() => encodeSavedFlowDocument(body)).toThrow(
        expect.objectContaining({ code })
      )
      expect(() => encodeSavedFlowSession(body, viewport)).toThrow(
        expect.objectContaining({ code })
      )
      expect(body).toStrictEqual(before)
    }

    const invalid = {
      ...accepted,
      edges: [nextConnectionEdge(document, pair('missing', 't1'))],
    }

    expect(() => encodeSavedFlowDocument(invalid)).toThrow(MissingEdgeHandle)
    const invalidWithOrigin = { ...invalid, nodeOrigin: undefined }
    expect(() => encodeSavedFlowDocument(invalidWithOrigin)).toThrow(
      MissingEdgeHandle
    )

    const canonical = {
      ...document,
      edges: [nextConnectionEdge(document, pair('s1', 't1'))],
    }

    expect(encodeSavedFlowDocument(canonical)).toStrictEqual(
      frozen.encodeSavedFlowDocument(legacyV1Input(canonical))
    )
  })
})
