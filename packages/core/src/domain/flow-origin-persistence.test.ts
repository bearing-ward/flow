import { Effect, Predicate, Schema as S, SchemaIssue } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as frozen from '../../../conformance/src/fixtures/legacy-v1-persistence/baseline-reader-writer.js'
import { legacyV1Input } from '../../../conformance/src/legacy-v1-input.ts'
import {
  decodeSavedFlowDocument,
  decodeSavedFlowSession,
  decodeVersionedFlowDocument,
  decodeVersionedFlowSession,
  encodeSavedFlowDocument,
  encodeSavedFlowSession,
  encodeVersionedFlowDocument,
  encodeVersionedFlowSession,
} from './flow-persistence.ts'
import type {
  SavedFlowSession,
  SavedVersionedFlowSession,
} from './flow-persistence.ts'
import { EdgeIdSchema, NodeIdSchema, HandleIdSchema } from './flow-values.ts'
import {
  decodeFlowDocument,
  FlowDocumentIntegrityErrorSchema,
  MissingEdgeHandle,
} from './flow.schema.ts'

const raw = {
  nodes: [
    {
      id: 'parent',
      label: 'Parent',
      position: { x: 30, y: 40 },
      size: { width: 500, height: 400 },
    },
    {
      id: 'source',
      label: 'Source',
      parentId: 'parent',
      position: { x: 60, y: 70 },
      handles: [
        { id: 'out', kind: 'source', side: 'right' },
        { id: 'in', kind: 'target', side: 'left' },
      ],
      data: { count: 0 },
      selected: true,
    },
    {
      id: 'target',
      label: 'Target',
      parentId: 'parent',
      position: { x: 200, y: 90 },
      handles: [
        { id: 'out', kind: 'source', side: 'bottom' },
        { id: 'in', kind: 'target', side: 'top' },
      ],
    },
  ],
  edges: [
    {
      id: 'edge',
      source: 'source',
      target: 'target',
      sourceHandle: 'out',
      targetHandle: 'in',
      selected: true,
    },
  ],
}

const viewport = { x: -50, y: 20, zoom: 0.5 }

const decode = <Input>(input: Input) =>
  Effect.runSync(decodeFlowDocument(input))

const cases = [
  { name: 'explicit global zero', input: { ...raw, nodeOrigin: [0, 0] } },
  { name: 'global own undefined', input: { ...raw, nodeOrigin: undefined } },
  {
    name: 'per-node outside finite tuple',
    input: {
      ...raw,
      nodes: raw.nodes.map((node) => ({ ...node, origin: [-0.5, 1.5] })),
    },
  },
  {
    name: 'per-node own undefined',
    input: {
      ...raw,
      nodes: raw.nodes.map((node) => ({ ...node, origin: undefined })),
    },
  },
  ...[undefined, false, true].map((connectable) => ({
    name: `connectable ${connectable}`,
    input: {
      ...raw,
      nodes: raw.nodes.map((node) => ({ ...node, connectable })),
    },
  })),
  ...[undefined, '', '   ', 'custom role'].map((ariaRole) => ({
    name: `node role ${ariaRole}`,
    input: { ...raw, nodes: raw.nodes.map((node) => ({ ...node, ariaRole })) },
  })),
  ...[undefined, '', 'custom role'].map((ariaRole) => ({
    name: `edge role ${ariaRole}`,
    input: { ...raw, edges: raw.edges.map((edge) => ({ ...edge, ariaRole })) },
  })),
  {
    name: 'empty node label and description',
    input: {
      ...raw,
      nodes: raw.nodes.map((node) => ({
        ...node,
        ariaLabel: '',
        ariaDescription: '',
      })),
    },
  },
  {
    name: 'empty edge label',
    input: {
      ...raw,
      edges: raw.edges.map((edge) => ({ ...edge, ariaLabel: '' })),
    },
  },
  {
    name: 'valid explicit noncanonical endpoints',
    input: {
      ...raw,
      edges: raw.edges.map((edge) => ({
        ...edge,
        sourceHandle: 'in',
        targetHandle: 'out',
      })),
    },
  },
  ...[
    { name: 'source-source', sourceHandle: 'out', targetHandle: 'out' },
    { name: 'target-target', sourceHandle: 'in', targetHandle: 'in' },
  ].map(({ name, sourceHandle, targetHandle }) => ({
    name: `valid noncanonical ${name}`,
    input: {
      ...raw,
      edges: raw.edges.map((edge) => ({ ...edge, sourceHandle, targetHandle })),
    },
  })),
  {
    name: 'complete combined body',
    input: {
      ...raw,
      nodeOrigin: [0.5, 1],
      nodes: raw.nodes.map((node) => ({
        ...node,
        origin: [-0.5, 1.5],
        connectable: false,
        ariaRole: '',
        ariaLabel: '',
        ariaDescription: '',
      })),
      edges: raw.edges.map((edge) => ({
        ...edge,
        sourceHandle: 'in',
        ariaRole: 'custom role',
        ariaLabel: '',
      })),
    },
  },
]

describe('complete single v2 persistence contract', () => {
  it.each(cases)(
    'retains $name through document/session readers with transient exclusion',
    ({ input }) => {
      const document = decode(input)
      const before = structuredClone(document)
      const saved = encodeVersionedFlowSession(document, viewport)
      const body = encodeVersionedFlowDocument(document)

      const expected = {
        ...document,
        nodes: document.nodes.map(({ selected: _selected, ...node }) => node),
        edges: document.edges.map(({ selected: _selected, ...edge }) => edge),
      }

      expect({ saved, body }).toStrictEqual({
        saved: { version: 2, document: expected, viewport },
        body: { version: 2, document: expected },
      })
      expect(Effect.runSync(decodeVersionedFlowSession(saved))).toStrictEqual({
        document: expected,
        viewport,
      })
      expect(Effect.runSync(decodeVersionedFlowDocument(body))).toStrictEqual(
        expected
      )
      expect(document).toStrictEqual(before)
    }
  )

  it('keeps legacy version 1 fields and frozen output unchanged', () => {
    const document = decode(raw)
    const saved = encodeSavedFlowSession(document, viewport)
    expectTypeOf(saved).toEqualTypeOf<SavedFlowSession>()
    expectTypeOf(
      encodeVersionedFlowSession(document, viewport)
    ).toEqualTypeOf<SavedVersionedFlowSession>()
    expect(encodeVersionedFlowSession(document, viewport)).toStrictEqual(
      frozen.encodeSavedFlowSession(legacyV1Input(document), viewport)
    )
    expect(Effect.runSync(decodeVersionedFlowSession(saved))).toStrictEqual(
      Effect.runSync(frozen.decodeSavedFlowSession(saved))
    )
    expect(
      Object.hasOwn(
        Effect.runSync(
          decodeVersionedFlowDocument(encodeSavedFlowDocument(document))
        ),
        'nodeOrigin'
      )
    ).toBeFalsy()
  })

  it.each(cases)(
    'keeps frozen/current readers rejecting emitted v2: $name',
    ({ input }) => {
      const saved = encodeVersionedFlowSession(decode(input), viewport)
      expect(
        Effect.runSync(Effect.exit(frozen.decodeSavedFlowSession(saved)))._tag
      ).toBe('Failure')
      expect(
        Effect.runSync(Effect.exit(decodeSavedFlowSession(saved)))._tag
      ).toBe('Failure')
    }
  )

  it.each(cases)(
    'rejects forged v1 extensions before stripping: $name',
    ({ input }) => {
      const forged = { version: 1, document: input, viewport }
      expect(
        Effect.runSync(Effect.exit(decodeVersionedFlowSession(forged)))._tag
      ).toBe('Failure')
      expect(
        Effect.runSync(Effect.exit(decodeVersionedFlowDocument(forged)))._tag
      ).toBe('Failure')
    }
  )

  it('preserves old reader unknown-key policy and rejects noncanonical v1 in every reader', () => {
    const unrelated = {
      version: 1,
      document: {
        ...raw,
        futureField: 'ignored',
        nodes: raw.nodes.map((node) => ({ ...node, futureField: 'ignored' })),
      },
      viewport,
    }

    expect(Effect.runSync(decodeVersionedFlowSession(unrelated))).toStrictEqual(
      Effect.runSync(frozen.decodeSavedFlowSession(unrelated))
    )

    const noncanonical = {
      ...unrelated,
      document: cases.find(
        (entry) => entry.name === 'valid explicit noncanonical endpoints'
      )?.input,
    }

    expect([
      Effect.runSync(Effect.exit(frozen.decodeSavedFlowSession(noncanonical)))
        ._tag,
      Effect.runSync(Effect.exit(decodeSavedFlowSession(noncanonical)))._tag,
      Effect.runSync(Effect.exit(decodeVersionedFlowSession(noncanonical)))
        ._tag,
    ]).toStrictEqual(['Failure', 'Failure', 'Failure'])
  })

  it.each([
    {
      name: 'source-source',
      sourceHandle: 'out',
      targetHandle: 'out',
      endpoint: 'target',
      nodeId: 'target',
      handleId: 'out',
    },
    {
      name: 'target-target',
      sourceHandle: 'in',
      targetHandle: 'in',
      endpoint: 'source',
      nodeId: 'source',
      handleId: 'in',
    },
    {
      name: 'reversed kinds',
      sourceHandle: 'in',
      targetHandle: 'out',
      endpoint: 'source',
      nodeId: 'source',
      handleId: 'in',
    },
  ])(
    'preserves exact frozen noncanonical-v1 error identity: $name',
    ({ sourceHandle, targetHandle, endpoint, nodeId, handleId }) => {
      const saved = {
        version: 1,
        document: {
          ...raw,
          edges: raw.edges.map((edge) => ({
            ...edge,
            sourceHandle,
            targetHandle,
          })),
        },
        viewport,
      }

      const identity = new MissingEdgeHandle({
        edgeId: EdgeIdSchema.make('edge'),
        endpoint: S.decodeUnknownSync(MissingEdgeHandle.fields.endpoint)(
          endpoint
        ),
        nodeId: NodeIdSchema.make(nodeId),
        handleId: HandleIdSchema.make(handleId),
      })

      const failures = [
        Effect.runSync(Effect.flip(frozen.decodeSavedFlowDocument(saved))),
        Effect.runSync(Effect.flip(frozen.decodeSavedFlowSession(saved))),
        Effect.runSync(Effect.flip(decodeSavedFlowDocument(saved))),
        Effect.runSync(Effect.flip(decodeSavedFlowSession(saved))),
        Effect.runSync(Effect.flip(decodeVersionedFlowDocument(saved))),
        Effect.runSync(Effect.flip(decodeVersionedFlowSession(saved))),
      ]

      for (const failure of failures) {
        expect(failure).toHaveProperty('_tag', identity._tag)
        expect(failure).toMatchObject({
          edgeId: identity.edgeId,
          endpoint: identity.endpoint,
          nodeId: identity.nodeId,
          handleId: identity.handleId,
        })
      }

      expect(
        Effect.runSync(Effect.flip(decodeVersionedFlowDocument(saved)))
      ).toBeInstanceOf(MissingEdgeHandle)
      expect(
        Effect.runSync(Effect.flip(decodeVersionedFlowSession(saved)))
      ).toBeInstanceOf(MissingEdgeHandle)
    }
  )

  it('keeps invalid transient and nested excess keys stripping identically to both old readers', () => {
    const saved = {
      version: 1,
      document: {
        ...raw,
        extra: { nested: 'ignored' },
        nodes: raw.nodes.map((node) => ({
          ...node,
          selected: 'ignored',
          dragging: { ignored: true },
          position: { ...node.position, extra: null },
          handles: node.handles?.map((handle) => ({
            ...handle,
            selected: 'ignored',
            extra: {},
          })),
        })),
        edges: raw.edges.map((edge) => ({
          ...edge,
          selected: { ignored: true },
          extra: null,
        })),
      },
      viewport,
    }

    const before = structuredClone(saved)
    const expected = Effect.runSync(frozen.decodeSavedFlowSession(saved))
    expect(Effect.runSync(decodeSavedFlowSession(saved))).toStrictEqual(
      expected
    )
    expect(Effect.runSync(decodeVersionedFlowSession(saved))).toStrictEqual(
      expected
    )
    expect(Effect.runSync(decodeVersionedFlowDocument(saved))).toStrictEqual(
      expected.document
    )
    expect(saved).toStrictEqual(before)
  })

  it('separates own undefined in memory from JSON omission while retaining explicit body2', () => {
    const document = decode({
      ...raw,
      nodeOrigin: undefined,
      nodes: raw.nodes.map((node) => ({
        ...node,
        origin: undefined,
        connectable: undefined,
        ariaRole: undefined,
      })),
      edges: raw.edges.map((edge) => ({ ...edge, ariaRole: undefined })),
    })

    const saved = encodeVersionedFlowSession(document, viewport)
    const restored = Effect.runSync(decodeVersionedFlowSession(saved))
    // oxlint-disable-next-line unicorn/prefer-structured-clone -- This case specifically verifies JSON omission, not memory cloning.
    const json = JSON.parse(JSON.stringify(saved))
    const jsonRestored = Effect.runSync(decodeVersionedFlowSession(json))
    expect([
      saved.version,
      Object.hasOwn(restored.document, 'nodeOrigin'),
      Object.hasOwn(restored.document.nodes[0] ?? {}, 'connectable'),
    ]).toStrictEqual([2, true, true])
    expect([
      json.version,
      Object.hasOwn(jsonRestored.document, 'nodeOrigin'),
      Object.hasOwn(jsonRestored.document.nodes[0] ?? {}, 'connectable'),
    ]).toStrictEqual([2, false, false])
  })

  it.each([0, 7, '2', null])(
    'rejects unknown/malformed version %j',
    (version) => {
      expect(
        Effect.runSync(
          Effect.exit(
            decodeVersionedFlowSession({ version, document: raw, viewport })
          )
        )._tag
      ).toBe('Failure')
    }
  )

  it.each([[0], [0, 0, 0], [Infinity, 0], [Number.NaN, 0], null])(
    'rejects malformed origin %j',
    (nodeOrigin) => {
      expect(
        Effect.runSync(
          Effect.exit(
            decodeVersionedFlowSession({
              version: 2,
              document: { ...raw, nodeOrigin },
              viewport,
            })
          )
        )._tag
      ).toBe('Failure')
    }
  )

  it('excludes all extra host/measurement/preview fields and selection without injecting defaults', () => {
    const input = {
      ...raw,
      nodeOrigin: [0, 0],
      measured: { width: 1 },
      preview: {},
      connectionMode: 'loose',
      nodes: raw.nodes.map((node) => ({
        ...node,
        measured: { width: 1 },
        resizing: true,
        dragging: true,
      })),
      edges: raw.edges.map((edge) => ({ ...edge, edgeMode: 'loose' })),
    }

    const saved = encodeVersionedFlowSession(decode(input), viewport)
    expect(Object.keys(saved.document).toSorted()).toStrictEqual([
      'edges',
      'nodeOrigin',
      'nodes',
    ])
    expect(saved.document.nodes[1]).toStrictEqual({
      id: 'source',
      label: 'Source',
      parentId: 'parent',
      position: { x: 60, y: 70 },
      handles: raw.nodes[1]?.handles,
      data: { count: 0 },
    })
    expect(Object.hasOwn(saved.document.edges[0] ?? {}, 'selected')).toBeFalsy()
  })

  it('ordinary graph identity failures precede extension format errors and never mutate input', () => {
    const accepted = decode({ ...raw, nodeOrigin: [0, 0] })

    const invalid = {
      ...accepted,
      edges: accepted.edges.map((edge) => ({
        ...edge,
        sourceHandle: S.decodeUnknownSync(HandleIdSchema)('missing'),
      })),
    }

    const input = {
      version: 2,
      document: {
        ...raw,
        nodes: raw.nodes.map((node) => ({ ...node, parentId: 'missing' })),
      },
      viewport,
    }

    expect(
      Effect.runSync(Effect.flip(decodeVersionedFlowSession(input)))._tag
    ).toBe('MissingParentNode')

    // External invalid identities are revalidated at the normal boundary before encoding.
    const invalidDocument = {
      version: 1,
      document: { ...invalid, nodeOrigin: [0, 0] },
      viewport,
    }

    expect(
      Effect.runSync(Effect.flip(decodeVersionedFlowSession(invalidDocument)))
        ._tag
    ).toBe('MissingEdgeHandle')
    expect(() => encodeVersionedFlowDocument(invalid)).toThrow(
      MissingEdgeHandle
    )
    expect(() => encodeSavedFlowDocument(invalid)).toThrow(MissingEdgeHandle)
    expect(
      Effect.runSync(
        Effect.exit(decodeSavedFlowDocument({ version: 2, document: raw }))
      )._tag
    ).toBe('Failure')
  })
})

// Mutate the actual encoded JSON tree, not a decoded or test-created copy.
const mutateNestedData = (data: typeof S.JsonObject.Type | undefined) => {
  if (data === undefined || !('nested' in data) || !('list' in data)) {
    throw new Error('Missing nested saved data')
  }

  const { nested, list } = data

  if (!Predicate.isObject(nested) || !Array.isArray(list)) {
    throw new TypeError('Invalid nested saved data')
  }

  Object.assign(nested, { value: 99 })
  list.push({ value: 100 })
  expect(data).toStrictEqual({
    nested: { value: 99 },
    list: [{ value: 2 }, { value: 100 }],
  })
}

describe('saved JSON output ownership', () => {
  it.each([false, true])(
    'detaches additive document/session JSON trees (v2=%s)',
    (extended) => {
      const candidate = {
        ...raw,
        nodes: raw.nodes.map((node) => ({
          ...node,
          data: { nested: { value: 1 }, list: [{ value: 2 }] },
        })),
        edges: raw.edges.map((edge) => ({
          ...edge,
          data: { nested: { value: 1 }, list: [{ value: 2 }] },
        })),
      }

      if (extended) {
        Object.assign(candidate, { nodeOrigin: [0, 0] })
      }

      const input = decode(candidate)

      const before = structuredClone(input)

      const outputs = [
        encodeVersionedFlowDocument(input),
        encodeVersionedFlowSession(input, viewport),
      ]

      const independent = encodeVersionedFlowSession(input, viewport)

      for (const saved of outputs) {
        expect(saved.version).toBe(extended ? 2 : 1)
        const expected = structuredClone(saved)
        expect(saved).toStrictEqual(expected)

        for (const [index, node] of saved.document.nodes.entries()) {
          expect(node.data).not.toBe(input.nodes[index]?.data)
          mutateNestedData(node.data)
        }

        for (const [index, edge] of saved.document.edges.entries()) {
          expect(edge.data).not.toBe(input.edges[index]?.data)
          mutateNestedData(edge.data)
        }

        expect(input).toStrictEqual(before)
        expect(encodeVersionedFlowSession(input, viewport)).toStrictEqual(
          independent
        )
      }
    }
  )

  it('detaches legacy document/session data while preserving exact frozen values', () => {
    const input = decode({
      ...raw,
      nodes: raw.nodes.map((node) => ({
        ...node,
        data: { nested: { value: 1 }, list: [{ value: 2 }] },
      })),
      edges: raw.edges.map((edge) => ({
        ...edge,
        data: { nested: { value: 1 }, list: [{ value: 2 }] },
      })),
    })

    const before = structuredClone(input)

    const outputs = [
      encodeSavedFlowDocument(input),
      encodeSavedFlowSession(input, viewport),
    ]

    expect(outputs[0]).toStrictEqual(
      frozen.encodeSavedFlowDocument(legacyV1Input(input))
    )
    expect(outputs[1]).toStrictEqual(
      frozen.encodeSavedFlowSession(legacyV1Input(input), viewport)
    )
    const independent = encodeSavedFlowSession(input, viewport)

    for (const saved of outputs) {
      for (const node of saved.document.nodes) {
        mutateNestedData(node.data)
      }

      for (const edge of saved.document.edges) {
        mutateNestedData(edge.data)
      }

      expect(input).toStrictEqual(before)
      expect(encodeSavedFlowSession(input, viewport)).toStrictEqual(independent)
    }
  })
})

describe('legacy-representable endpoint presence', () => {
  it('own undefined endpoint IDs retain legacy version 1 selection and frozen value equality', () => {
    const document = decode({
      ...raw,
      edges: raw.edges.map((edge) => ({
        ...edge,
        sourceHandle: undefined,
        targetHandle: undefined,
      })),
    })

    const saved = encodeVersionedFlowSession(document, viewport)
    expect(saved.version).toBe(1)
    expect(saved).toStrictEqual(
      frozen.encodeSavedFlowSession(legacyV1Input(document), viewport)
    )
    expect(
      Object.hasOwn(saved.document.edges[0] ?? {}, 'sourceHandle')
    ).toBeTruthy()
    expect(
      Effect.runSync(decodeVersionedFlowSession(saved)).document
    ).toStrictEqual(Effect.runSync(decodeSavedFlowSession(saved)).document)
  })
})

const wrongKindDocument = {
  ...raw,
  edges: raw.edges.map((edge) => ({ ...edge, sourceHandle: 'in' })),
}

const mixedLegacyCases = [
  {
    name: 'wrong source kind with missing target node',
    tag: 'MissingEdgeEndpoint',
    document: {
      ...wrongKindDocument,
      edges: wrongKindDocument.edges.map((edge) => ({
        ...edge,
        target: 'missing',
      })),
    },
  },
  {
    name: 'duplicate node before wrong kind',
    tag: 'DuplicateNodeId',
    document: { ...wrongKindDocument, nodes: [...raw.nodes, ...raw.nodes] },
  },
  {
    name: 'missing parent before wrong kind',
    tag: 'MissingParentNode',
    document: {
      ...wrongKindDocument,
      nodes: raw.nodes.map((node) =>
        node.id === 'source' ? { ...node, parentId: 'missing' } : node
      ),
    },
  },
  {
    name: 'parent extent before wrong kind',
    tag: 'ParentExtentWithoutParent',
    document: {
      ...wrongKindDocument,
      nodes: raw.nodes.map((node) =>
        node.id === 'parent' ? { ...node, extent: 'parent' } : node
      ),
    },
  },
  {
    name: 'self parent before wrong kind',
    tag: 'SelfParentNode',
    document: {
      ...wrongKindDocument,
      nodes: raw.nodes.map((node) =>
        node.id === 'source' ? { ...node, parentId: node.id } : node
      ),
    },
  },
  {
    name: 'parent cycle before wrong kind',
    tag: 'ParentCycle',
    document: {
      ...wrongKindDocument,
      nodes: raw.nodes.map((node) =>
        node.id === 'parent' ? { ...node, parentId: 'source' } : node
      ),
    },
  },
  {
    name: 'duplicate edge before wrong kind',
    tag: 'DuplicateEdgeId',
    document: {
      ...wrongKindDocument,
      edges: [...wrongKindDocument.edges, ...raw.edges],
    },
  },
  {
    name: 'duplicate handle before wrong kind',
    tag: 'DuplicateHandleId',
    document: {
      ...wrongKindDocument,
      nodes: raw.nodes.map((node) =>
        node.handles === undefined
          ? node
          : { ...node, handles: [...node.handles, ...node.handles] }
      ),
    },
  },
  {
    name: 'missing source handle before wrong target kind',
    tag: 'MissingEdgeHandle',
    document: {
      ...raw,
      edges: raw.edges.map((edge) => ({
        ...edge,
        sourceHandle: 'missing',
        targetHandle: 'out',
      })),
    },
  },
  {
    name: 'earlier missing node before later wrong kind',
    tag: 'MissingEdgeEndpoint',
    document: {
      ...raw,
      edges: [
        ...raw.edges.map((edge) => ({ ...edge, source: 'missing' })),
        ...wrongKindDocument.edges.map((edge) => ({ ...edge, id: 'later' })),
      ],
    },
  },
  {
    name: 'earlier missing handle before later wrong kind',
    tag: 'MissingEdgeHandle',
    document: {
      ...raw,
      edges: [
        ...raw.edges.map((edge) => ({ ...edge, targetHandle: 'missing' })),
        ...wrongKindDocument.edges.map((edge) => ({ ...edge, id: 'later' })),
      ],
    },
  },
  {
    name: 'earlier wrong kind before later missing node',
    tag: 'MissingEdgeHandle',
    document: {
      ...raw,
      edges: [
        ...wrongKindDocument.edges,
        ...raw.edges.map((edge) => ({
          ...edge,
          id: 'later',
          source: 'missing',
        })),
      ],
    },
  },
  {
    name: 'earlier wrong kind before later missing handle',
    tag: 'MissingEdgeHandle',
    document: {
      ...raw,
      edges: [
        ...wrongKindDocument.edges,
        ...raw.edges.map((edge) => ({
          ...edge,
          id: 'later',
          targetHandle: 'missing',
        })),
      ],
    },
  },
  {
    name: 'both nodes missing source wins',
    tag: 'MissingEdgeEndpoint',
    document: {
      ...wrongKindDocument,
      edges: wrongKindDocument.edges.map((edge) => ({
        ...edge,
        source: 'missing-source',
        target: 'missing-target',
      })),
    },
  },
  {
    name: 'both handles missing source wins',
    tag: 'MissingEdgeHandle',
    document: {
      ...raw,
      edges: raw.edges.map((edge) => ({
        ...edge,
        sourceHandle: 'missing-source',
        targetHandle: 'missing-target',
      })),
    },
  },
  {
    name: 'own undefined source handle before wrong target kind',
    tag: 'MissingEdgeHandle',
    document: {
      ...raw,
      edges: raw.edges.map((edge) => ({
        ...edge,
        sourceHandle: undefined,
        targetHandle: 'out',
      })),
    },
  },
  {
    name: 'invalid transient excess before wrong kind',
    tag: 'MissingEdgeHandle',
    document: {
      ...wrongKindDocument,
      nodes: raw.nodes.map((node) => ({
        ...node,
        selected: 'ignored',
        extra: { selected: null },
        position: { ...node.position, extra: false },
      })),
      edges: wrongKindDocument.edges.map((edge) => ({ ...edge, selected: 99 })),
    },
  },
]

describe('ordered legacy integrity and envelope validation', () => {
  it.each(mixedLegacyCases)(
    'preserves frozen errors, viewport precedence and extension precedence: $name',
    ({ document, tag }) => {
      {
        const saved = { version: 1, document, viewport }
        const before = structuredClone(saved)

        const oracle = Effect.runSync(
          Effect.flip(frozen.decodeSavedFlowDocument(saved))
        )

        expect(oracle._tag).toBe(tag)

        const expected = S.decodeUnknownSync(FlowDocumentIntegrityErrorSchema)(
          oracle
        )

        const expectedFields = S.encodeSync(FlowDocumentIntegrityErrorSchema)(
          expected
        )

        const failures = [
          Effect.runSync(Effect.flip(frozen.decodeSavedFlowSession(saved))),
          Effect.runSync(Effect.flip(decodeSavedFlowDocument(saved))),
          Effect.runSync(Effect.flip(decodeSavedFlowSession(saved))),
          Effect.runSync(Effect.flip(decodeVersionedFlowDocument(saved))),
          Effect.runSync(Effect.flip(decodeVersionedFlowSession(saved))),
        ]

        for (const failure of failures) {
          const actual = S.decodeUnknownSync(FlowDocumentIntegrityErrorSchema)(
            failure
          )

          expect(
            S.encodeSync(FlowDocumentIntegrityErrorSchema)(actual)
          ).toStrictEqual(expectedFields)
        }

        for (const failure of failures.slice(1)) {
          expect(failure).toBeInstanceOf(expected.constructor)
        }

        expect(saved).toStrictEqual(before)
      }

      {
        for (const invalidViewport of [
          { viewport: { ...viewport, zoom: 0 } },
          { viewport: { ...viewport, zoom: 'bad' } },
          {},
        ]) {
          const saved = { version: 1, document, ...invalidViewport }

          const oracle = Effect.runSync(
            Effect.flip(frozen.decodeSavedFlowSession(saved))
          )

          if (!S.isSchemaError(oracle)) {
            throw new Error('Frozen viewport failure was not SchemaError')
          }

          const expectedIssues = SchemaIssue.makeFormatterStandardSchemaV1()(
            oracle.issue
          ).issues

          for (const reader of [
            decodeSavedFlowSession,
            decodeVersionedFlowSession,
          ]) {
            const failure = Effect.runSync(Effect.flip(reader(saved)))
            expect(failure).toBeInstanceOf(S.SchemaError)

            if (!S.isSchemaError(failure)) {
              throw new Error('Current viewport failure was not SchemaError')
            }

            expect(
              SchemaIssue.makeFormatterStandardSchemaV1()(failure.issue).issues
            ).toStrictEqual(expectedIssues)
          }
        }
      }

      {
        const saved = {
          version: 1,
          document: {
            ...document,
            nodeOrigin: [0, 0],
            nodes: document.nodes.map((node) => ({
              ...node,
              connectable: false,
            })),
          },
          viewport,
        }

        const oracle = Effect.runSync(
          Effect.flip(frozen.decodeSavedFlowSession(saved))
        )

        const expected = S.decodeUnknownSync(FlowDocumentIntegrityErrorSchema)(
          oracle
        )

        const failures = [
          Effect.runSync(Effect.flip(decodeVersionedFlowDocument(saved))),
          Effect.runSync(Effect.flip(decodeVersionedFlowSession(saved))),
        ]

        for (const failure of failures) {
          expect(failure).toBeInstanceOf(expected.constructor)
          expect(
            S.encodeSync(FlowDocumentIntegrityErrorSchema)(
              S.decodeUnknownSync(FlowDocumentIntegrityErrorSchema)(failure)
            )
          ).toStrictEqual(
            S.encodeSync(FlowDocumentIntegrityErrorSchema)(expected)
          )
        }
      }
    }
  )

  it.each([false, true])(
    'retains absent or own undefined handles and excess stripping (own=%s)',
    (own) => {
      const edge = {
        id: 'edge',
        source: 'source',
        target: 'target',
        selected: 'ignored',
        extra: { nested: 99 },
      }

      if (own) {
        Object.assign(edge, {
          sourceHandle: undefined,
          targetHandle: undefined,
        })
      }

      const saved = {
        version: 1,
        document: {
          ...raw,
          nodes: raw.nodes.map((node) => ({ ...node, selected: 'ignored' })),
          edges: [edge],
        },
        viewport,
      }

      const oracleDocument = Effect.runSync(
        frozen.decodeSavedFlowDocument(saved)
      )

      const oracleSession = Effect.runSync(frozen.decodeSavedFlowSession(saved))
      expect(Effect.runSync(decodeSavedFlowDocument(saved))).toStrictEqual(
        oracleDocument
      )
      expect(Effect.runSync(decodeVersionedFlowDocument(saved))).toStrictEqual(
        oracleDocument
      )
      expect(Effect.runSync(decodeSavedFlowSession(saved))).toStrictEqual(
        oracleSession
      )
      expect(Effect.runSync(decodeVersionedFlowSession(saved))).toStrictEqual(
        oracleSession
      )
    }
  )
})
