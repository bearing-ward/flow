import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { createFlowSnapshot } from '@flow/core'
import { Effect, Schema as S } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as baseline from '../../../conformance/src/fixtures/legacy-v1-persistence/baseline-reader-writer.js'
import { NodeOriginSchema } from './flow-origin.schema.ts'
import {
  decodeSavedFlowDocument,
  decodeSavedFlowSession,
  encodeSavedFlowDocument,
  encodeSavedFlowSession,
  SavedFlowDocumentSchema,
  SavedFlowSessionSchema,
} from './flow-persistence.ts'
import type { SavedFlowDocument, SavedFlowSession } from './flow-persistence.ts'
import { SavedFlowFormatError } from './flow-save-format-error.ts'
import { EdgeIdSchema, NodeIdSchema } from './flow-values.ts'
import { decodeFlowDocument } from './flow.schema.ts'
import type { FlowDocument } from './flow.schema.ts'

describe('saved flow documents', () => {
  it('round trips declared nested graph fields while excluding selection', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'root',
            label: 'Root',
            position: { x: 20, y: 30 },
            type: 'group',
            data: { title: 'Root' },
            size: { width: 300, height: 200 },
            zIndex: 4,
            selected: true,
            draggable: false,
            ariaDescription: 'Fixed group',
            deletable: false,
          },
          {
            id: 'child',
            label: 'Child',
            parentId: 'root',
            position: { x: 12, y: 18 },
            extent: 'parent',
            type: 'card',
            data: { values: [1, true, null] },
            size: { width: 80, height: 40 },
            zIndex: 2,
            selected: true,
          },
        ],
        edges: [
          {
            id: 'edge',
            source: 'child',
            target: 'root',
            type: 'custom',
            path: 'bezier',
            selected: true,
            data: { config: { retries: [1, 2] } },
          },
        ],
      })
    )

    const saved = encodeSavedFlowDocument(document)
    const [savedRoot, savedChild] = saved.document.nodes
    const [savedEdge] = saved.document.edges

    if (
      savedChild === undefined ||
      savedRoot === undefined ||
      savedEdge === undefined
    ) {
      throw new Error('Expected saved nodes and edge')
    }

    expect([
      saved.version,
      savedChild,
      'selected' in savedChild,
      savedRoot,
      'selected' in savedEdge,
    ]).toStrictEqual([
      1,
      expect.objectContaining({
        parentId: 'root',
        position: { x: 12, y: 18 },
        type: 'card',
        size: { width: 80, height: 40 },
        zIndex: 2,
      }),
      false,
      expect.objectContaining({
        draggable: false,
        ariaDescription: 'Fixed group',
        deletable: false,
      }),
      false,
    ])

    const loaded = Effect.runSync(decodeSavedFlowDocument(saved))
    expect([
      loaded.nodes[1],
      loaded.nodes[0],
      loaded.nodes.every((node) => node.selected !== true),
      loaded.edges.every((edge) => edge.selected !== true),
    ]).toStrictEqual([
      expect.objectContaining({
        parentId: 'root',
        position: { x: 12, y: 18 },
        size: { width: 80, height: 40 },
        data: { values: [1, true, null] },
      }),
      expect.objectContaining({
        draggable: false,
        ariaDescription: 'Fixed group',
      }),
      true,
      true,
    ])
    expect(savedEdge?.data).toStrictEqual({ config: { retries: [1, 2] } })
    expect(loaded.edges[0]?.data).toStrictEqual({ config: { retries: [1, 2] } })
    expect(loaded.nodes[0]?.deletable).toBeFalsy()
  })

  it('rejects unknown versions and invalid parent graphs', () => {
    const invalidVersion = Effect.runSync(
      Effect.exit(
        decodeSavedFlowDocument({
          version: 2 as const,
          document: { nodes: [], edges: [] },
        })
      )
    )

    expect(invalidVersion._tag).toBe('Failure')

    const invalidGraph = Effect.runSync(
      Effect.exit(
        decodeSavedFlowDocument({
          version: 1,
          document: {
            nodes: [
              {
                id: 'child',
                label: 'Child',
                parentId: 'missing',
                position: { x: 0, y: 0 },
              },
            ],
            edges: [],
          },
        })
      )
    )

    expect(invalidGraph._tag).toBe('Failure')
  })

  it('rejects domain-invalid fields through both saved schema and full decode', () => {
    const invalidDocuments: readonly unknown[] = [
      {
        version: 1,
        document: {
          nodes: [{ id: 'node', label: 'Node', position: { x: 0, y: 0 } }],
          edges: [
            { id: 'edge', source: 'node', target: 'node', stroke: 'red' },
          ],
        },
      },
      {
        version: 1,
        document: {
          nodes: [
            {
              id: 'node',
              label: 'Node',
              position: { x: 0, y: 0 },
              size: { width: 0, height: 20 },
            },
          ],
          edges: [],
        },
      },
    ]

    for (const input of invalidDocuments) {
      expect(() => S.decodeUnknownSync(SavedFlowDocumentSchema)(input)).toThrow(
        /Expected/u
      )
      expect(
        Effect.runSync(Effect.exit(decodeSavedFlowDocument(input)))._tag
      ).toBe('Failure')
    }
  })

  it('encodes only node and edge document fields', () => {
    const input = {
      nodes: [
        { id: 'node', label: 'Node', position: { x: 1, y: 2 }, selected: true },
      ],
      edges: [],
      viewport: { x: 10, y: 20, zoom: 2 },
      measurements: [{ nodeId: 'node', width: 100, height: 50 }],
    }

    const document = Effect.runSync(decodeFlowDocument(input))

    expect(encodeSavedFlowDocument(document)).toStrictEqual({
      version: 1,
      document: {
        nodes: [{ id: 'node', label: 'Node', position: { x: 1, y: 2 } }],
        edges: [],
      },
    })
  })

  it('round trips a version 1 document and viewport session without selection', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'node',
            label: 'Node',
            position: { x: 1, y: 2 },
            selected: true,
          },
        ],
        edges: [],
      })
    )

    const viewport = { x: 12, y: -4, zoom: 1.5 }
    const saved = encodeSavedFlowSession(document, viewport)
    const loaded = Effect.runSync(decodeSavedFlowSession(saved))

    expect(S.is(SavedFlowSessionSchema)(saved)).toBeTruthy()
    expect(saved).toStrictEqual({
      version: 1,
      document: {
        nodes: [{ id: 'node', label: 'Node', position: { x: 1, y: 2 } }],
        edges: [],
      },
      viewport,
    })
    expect({
      viewport: loaded.viewport,
      edges: loaded.document.edges,
      selected: loaded.document.nodes[0]?.selected,
      position: loaded.document.nodes[0]?.position,
    }).toStrictEqual({
      viewport,
      edges: [],
      selected: undefined,
      position: { x: 1, y: 2 },
    })
  })

  it('rejects invalid viewport and graph state in session decoding', () => {
    const result = Effect.runSync(
      Effect.exit(
        decodeSavedFlowSession({
          version: 1,
          document: { nodes: [], edges: [] },
          viewport: { x: 0, y: 0, zoom: 0 },
        })
      )
    )

    expect(result._tag).toBe('Failure')
  })
})

describe('frozen de36b4f legacy persistence compatibility', () => {
  const original = Effect.runSync(
    decodeFlowDocument({
      nodes: [{ id: 'node', label: '', position: { x: 1, y: -2 } }],
      edges: [],
    })
  )

  const viewport = { x: 3, y: -4, zoom: 1 }

  it('retains exact original encoded literal-v1 types and runtime output', () => {
    expectTypeOf<SavedFlowDocument>().toEqualTypeOf<baseline.SavedFlowDocument>()
    expectTypeOf<SavedFlowSession>().toEqualTypeOf<baseline.SavedFlowSession>()
    expect(encodeSavedFlowDocument(original)).toStrictEqual(
      baseline.encodeSavedFlowDocument(original)
    )
    expect(encodeSavedFlowSession(original, viewport)).toStrictEqual(
      baseline.encodeSavedFlowSession(original, viewport)
    )
  })

  it('proves generated artifact/source integrity against the actual baseline revision', () => {
    const directory = new URL(
      '../../../conformance/src/fixtures/legacy-v1-persistence/',
      import.meta.url
    )

    const provenance = S.decodeUnknownSync(
      S.Struct({
        revision: S.Literal('de36b4f64fe80d99886c0b7a9fb505258b872ac9'),
        bun: S.Literal('1.4.3'),
        effect: S.Literal('4.0.0-rc.116'),
        typescript: S.Literal('5.9.3'),
        sourceHashes: S.Record(S.String, S.String),
        artifactHashes: S.Record(S.String, S.String),
      })
    )(JSON.parse(readFileSync(new URL('provenance.json', directory), 'utf-8')))

    for (const [file, digest] of Object.entries(provenance.artifactHashes)) {
      expect(
        createHash('sha256')
          .update(readFileSync(new URL(file, directory)))
          .digest('hex')
      ).toBe(digest)
    }

    for (const [file, digest] of Object.entries(provenance.sourceHashes)) {
      expect(
        createHash('sha256')
          .update(
            execFileSync('git', ['show', `${provenance.revision}:${file}`])
          )
          .digest('hex')
      ).toBe(digest)
    }

    expect(Object.keys(provenance.artifactHashes)).toHaveLength(25)
    execFileSync('bun', [
      'run',
      'scripts/capture-legacy-v1-persistence.ts',
      '--check',
    ])
  })

  it('matches the baseline writer on the full nested representative field projection', () => {
    const fixture = S.decodeUnknownSync(
      S.Struct({
        document: SavedFlowDocumentSchema,
        session: SavedFlowSessionSchema,
      })
    )(
      JSON.parse(
        readFileSync(
          new URL(
            '../../../conformance/src/fixtures/legacy-v1-persistence/representative.json',
            import.meta.url
          ),
          'utf-8'
        )
      )
    )

    const document = Effect.runSync(
      baseline.decodeSavedFlowDocument(fixture.document)
    )

    const withSelection = {
      ...document,
      nodes: document.nodes.map((node) => ({ ...node, selected: true })),
      edges: document.edges.map((edge) => ({ ...edge, selected: true })),
    }

    expect(encodeSavedFlowDocument(withSelection)).toStrictEqual(
      fixture.document
    )
    expect(
      encodeSavedFlowSession(withSelection, fixture.session.viewport)
    ).toStrictEqual(fixture.session)
    expect(
      Object.keys(
        SavedFlowDocumentSchema.fields.document.fields.nodes.value.fields
      )
    ).toStrictEqual(
      Object.keys(
        baseline.SavedFlowDocumentSchema.fields.document.fields.nodes.value
          .fields
      )
    )
    expect(
      Object.keys(
        SavedFlowDocumentSchema.fields.document.fields.edges.value.fields
      )
    ).toStrictEqual(
      Object.keys(
        baseline.SavedFlowDocumentSchema.fields.document.fields.edges.value
          .fields
      )
    )
  })

  it.each([
    [
      'document own undefined nodeOrigin',
      { ...original, nodeOrigin: undefined },
    ],
    [
      'document explicit zero origin',
      {
        ...original,
        nodeOrigin: S.decodeUnknownSync(NodeOriginSchema)([0, 0]),
      },
    ],
    [
      'node own undefined origin',
      {
        ...original,
        nodes: original.nodes.map((node) => ({ ...node, origin: undefined })),
      },
    ],
    [
      'node negative/outside origin',
      {
        ...original,
        nodes: original.nodes.map((node) => ({
          ...node,
          origin: S.decodeUnknownSync(NodeOriginSchema)([-0.5, 1.5]),
        })),
      },
    ],
    [
      'both families origin precedence',
      {
        ...original,
        nodeOrigin: S.decodeUnknownSync(NodeOriginSchema)([0, 0]),
        nodes: original.nodes.map((node) => ({ ...node, connectable: false })),
      },
    ],
  ])('rejects %s before legacy projection', (_name, document) => {
    const before = structuredClone(document)
    expect(() => encodeSavedFlowDocument(document)).toThrow(
      SavedFlowFormatError
    )
    expect(() => encodeSavedFlowSession(document, viewport)).toThrow(
      expect.objectContaining({ code: 'origin-requires-versioned-session' })
    )
    expect(document).toStrictEqual(before)
  })

  const nativeVariants: readonly FlowDocument[] = [
    ...[undefined, false, true].map((connectable) => ({
      ...original,
      nodes: original.nodes.map((node) => ({ ...node, connectable })),
    })),
    ...[undefined, '', 'custom role'].map((ariaRole) => ({
      ...original,
      nodes: original.nodes.map((node) => ({ ...node, ariaRole })),
    })),
    {
      ...original,
      nodes: original.nodes.map((node) => ({ ...node, ariaLabel: '' })),
    },
    {
      ...original,
      nodes: original.nodes.map((node) => ({ ...node, ariaDescription: '' })),
    },
    ...[undefined, '', 'link'].map((ariaRole) => ({
      ...original,
      edges: [
        {
          id: EdgeIdSchema.make('edge'),
          source: NodeIdSchema.make('node'),
          target: NodeIdSchema.make('node'),
          ariaRole,
        },
      ],
    })),
    {
      ...original,
      edges: [
        {
          id: EdgeIdSchema.make('edge'),
          source: NodeIdSchema.make('node'),
          target: NodeIdSchema.make('node'),
          ariaLabel: '',
        },
      ],
    },
  ]

  it.each(nativeVariants)(
    'rejects reserved native fields without changing accepted schemas',
    (document) => {
      expect(() => encodeSavedFlowDocument(document)).toThrow(
        SavedFlowFormatError
      )
      expect(() => encodeSavedFlowSession(document, viewport)).toThrow(
        expect.objectContaining({
          code: 'native-fields-require-versioned-session',
        })
      )
    }
  )

  it('preserves original own-undefined label/description behavior and excludes unrelated metadata', () => {
    const document = {
      ...original,
      nodes: original.nodes.map((node) => ({
        ...node,
        ariaLabel: undefined,
        ariaDescription: undefined,
        selected: false,
        measurements: { width: 4 },
        renderer: () => 'node',
      })),
    }

    expect(encodeSavedFlowDocument(document)).toStrictEqual(
      baseline.encodeSavedFlowDocument(document)
    )
  })

  it('keeps actual frozen unknown-key stripping while rejecting a v2 literal and empty old fields', () => {
    const forged = {
      version: 1,
      document: {
        ...original,
        nodeOrigin: [0, 0],
        nodes: original.nodes.map((node) => ({
          ...node,
          ariaRole: 'button',
          connectable: false,
          extra: true,
        })),
      },
    }

    expect(Effect.runSync(decodeSavedFlowDocument(forged))).toStrictEqual(
      Effect.runSync(baseline.decodeSavedFlowDocument(forged))
    )
    expect(Effect.runSync(decodeSavedFlowDocument(forged))).toStrictEqual(
      original
    )

    for (const decoder of [
      decodeSavedFlowDocument,
      baseline.decodeSavedFlowDocument,
    ]) {
      expect(
        Effect.runSync(Effect.exit(decoder({ ...forged, version: 2 })))._tag
      ).toBe('Failure')
      expect(
        Effect.runSync(
          Effect.exit(
            decoder({
              version: 1,
              document: {
                ...original,
                nodes: original.nodes.map((node) => ({
                  ...node,
                  ariaDescription: '',
                })),
              },
            })
          )
        )._tag
      ).toBe('Failure')
    }
  })

  it.each([
    { handles: [{ id: '', kind: 'source', side: 'right' }] },
    { handles: [{ id: 'handle', kind: 'wrong', side: 'right' }] },
    { handles: [{ id: 'handle', kind: 'source', side: 'middle' }] },
    { size: { width: 0, height: 10 } },
    { size: { width: 10, height: Number.POSITIVE_INFINITY } },
    { zIndex: Number.NaN },
    { type: '' },
    { ariaLabel: '' },
    { ariaDescription: '' },
  ])('retains frozen malformed node constraints', (patch) => {
    const input = {
      version: 1,
      document: {
        ...original,
        nodes: original.nodes.map((node) => ({ ...node, ...patch })),
      },
    }

    expect(
      Effect.runSync(Effect.exit(decodeSavedFlowDocument(input)))._tag
    ).toBe('Failure')
    expect(
      Effect.runSync(Effect.exit(baseline.decodeSavedFlowDocument(input)))._tag
    ).toBe('Failure')
  })

  it.each([
    { markerStart: { type: 'arrow' } },
    { markerEnd: 'other' },
    { path: 'other' },
    { reconnectable: 'other' },
    { interactionWidth: 0 },
    { strokeWidth: -1 },
    { stroke: 'red' },
    { ariaLabel: '' },
  ])('retains frozen malformed edge constraints', (patch) => {
    const input = {
      version: 1,
      document: {
        ...original,
        edges: [{ id: 'edge', source: 'node', target: 'node', ...patch }],
      },
    }

    expect(
      Effect.runSync(Effect.exit(decodeSavedFlowDocument(input)))._tag
    ).toBe('Failure')
    expect(
      Effect.runSync(Effect.exit(baseline.decodeSavedFlowDocument(input)))._tag
    ).toBe('Failure')
  })
})

describe('live native retention against frozen legacy writers and readers', () => {
  const node = {
    id: 'node',
    label: 'Node',
    position: { x: 2, y: 3 },
    selected: true,
  }

  const edge = { id: 'edge', source: 'node', target: 'node', selected: true }
  const viewport = { x: 4, y: -5, zoom: 1.25 }

  const extensions = [
    ...[undefined, false, true].map((value) => ({
      owner: 'node',
      field: 'connectable',
      value,
    })),
    ...[undefined, '', '   ', 'custom role'].flatMap((value) =>
      ['node', 'edge'].map((owner) => ({ owner, field: 'ariaRole', value }))
    ),
    { owner: 'node', field: 'ariaDescription', value: '' },
    ...['node', 'edge'].map((owner) => ({
      owner,
      field: 'ariaLabel',
      value: '',
    })),
  ]

  it.each(extensions)(
    'rejects decoded $owner.$field=$value before either legacy projection without mutating a snapshot',
    ({ owner, field, value }) => {
      const document = Effect.runSync(
        decodeFlowDocument({
          nodes: [owner === 'node' ? { ...node, [field]: value } : node],
          edges: [owner === 'edge' ? { ...edge, [field]: value } : edge],
        })
      )

      const snapshot = createFlowSnapshot(document, viewport)
      const before = structuredClone(snapshot)
      const record = owner === 'node' ? document.nodes[0] : document.edges[0]
      expect(Object.hasOwn(record ?? {}, field)).toBeTruthy()
      expect(() => encodeSavedFlowDocument(snapshot.document)).toThrow(
        expect.objectContaining({
          code: 'native-fields-require-versioned-session',
        })
      )
      expect(() =>
        encodeSavedFlowSession(snapshot.document, snapshot.viewport)
      ).toThrow(
        expect.objectContaining({
          code: 'native-fields-require-versioned-session',
        })
      )
      expect(snapshot).toStrictEqual(before)
    }
  )

  it.each([undefined, '   ', 'Existing label'])(
    'preserves old-field value %j and selection omission with the independent baseline',
    (value) => {
      const document = Effect.runSync(
        decodeFlowDocument({
          nodes: [{ ...node, ariaLabel: value, ariaDescription: value }],
          edges: [{ ...edge, ariaLabel: value }],
        })
      )

      const saved = encodeSavedFlowSession(document, viewport)
      expect(saved).toStrictEqual(
        baseline.encodeSavedFlowSession(document, viewport)
      )
      expect(
        Object.hasOwn(saved.document.nodes[0] ?? {}, 'selected')
      ).toBeFalsy()
      expect(
        Object.hasOwn(saved.document.edges[0] ?? {}, 'selected')
      ).toBeFalsy()
      expect(Effect.runSync(decodeSavedFlowSession(saved))).toStrictEqual(
        Effect.runSync(baseline.decodeSavedFlowSession(saved))
      )
    }
  )

  it('retains combined live fields while origin deterministically wins legacy rejection', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            ...node,
            connectable: false,
            ariaRole: '',
            ariaLabel: '',
            ariaDescription: '',
          },
        ],
        edges: [{ ...edge, ariaRole: 'custom', ariaLabel: '' }],
      })
    )

    for (const input of [
      { ...document, nodeOrigin: undefined },
      {
        ...document,
        nodes: document.nodes.map((entry) => ({
          ...entry,
          origin: S.decodeUnknownSync(NodeOriginSchema)([0, 0]),
        })),
      },
    ]) {
      expect(() => encodeSavedFlowDocument(input)).toThrow(
        expect.objectContaining({ code: 'origin-requires-versioned-session' })
      )
      expect(() => encodeSavedFlowSession(input, viewport)).toThrow(
        expect.objectContaining({ code: 'origin-requires-versioned-session' })
      )
    }
  })

  it.each(
    extensions.filter(
      ({ field }) => field === 'connectable' || field === 'ariaRole'
    )
  )(
    'keeps frozen raw and JSON readers stripping forged $owner.$field=$value in v1',
    ({ owner, field, value }) => {
      const document = Effect.runSync(
        decodeFlowDocument({ nodes: [node], edges: [edge] })
      )

      const saved = encodeSavedFlowSession(document, viewport)

      const forged = {
        ...saved,
        document: {
          nodes: saved.document.nodes.map((entry) =>
            owner === 'node' ? { ...entry, [field]: value } : entry
          ),
          edges: saved.document.edges.map((entry) =>
            owner === 'edge' ? { ...entry, [field]: value } : entry
          ),
        },
      }

      const json = JSON.stringify(forged)

      for (const input of [forged, JSON.parse(json)]) {
        const current = Effect.runSync(decodeSavedFlowSession(input))
        expect(current).toStrictEqual(
          Effect.runSync(baseline.decodeSavedFlowSession(input))
        )

        const record =
          owner === 'node'
            ? current.document.nodes[0]
            : current.document.edges[0]

        expect(Object.hasOwn(record ?? {}, field)).toBeFalsy()
      }
    }
  )

  it.each([
    { owner: 'node', field: 'ariaDescription' },
    { owner: 'node', field: 'ariaLabel' },
    { owner: 'edge', field: 'ariaLabel' },
  ])(
    'keeps both frozen readers rejecting explicit empty $owner.$field',
    ({ owner, field }) => {
      const input = {
        version: 1,
        viewport,
        document: {
          nodes: [owner === 'node' ? { ...node, [field]: '' } : node],
          edges: [owner === 'edge' ? { ...edge, [field]: '' } : edge],
        },
      }

      expect(
        Effect.runSync(Effect.exit(decodeSavedFlowSession(input)))._tag
      ).toBe('Failure')
      expect(
        Effect.runSync(Effect.exit(baseline.decodeSavedFlowSession(input)))._tag
      ).toBe('Failure')
    }
  )
})
