import {
  createFlowDataDocumentSchema,
  createFlowEdgeVariantSchema,
  createFlowNodeVariantSchema,
  defineFlowDataContract,
  FlowTypedFailureSchema,
  validateFlowGraphDocument,
  NodeIdSchema,
  EdgeIdSchema,
  HandleIdSchema,
} from '@flow/core'
import { Context, Effect, Exit, Schema as S, SchemaGetter as G } from 'effect'
import { describe, expect, it } from 'vitest'

type DecodeRequirement = '087/unit/decode'

const DecodeContext = Context.Service<
  DecodeRequirement,
  {
    readonly prefix: string
  }
>('087/unit/decode')

type EncodeRequirement = '087/unit/encode'

const EncodeContext = Context.Service<
  EncodeRequirement,
  {
    readonly prefix: string
  }
>('087/unit/encode')

type IsolationRequirement = '087/unit/isolate'

const IsolationContext = Context.Service<
  IsolationRequirement,
  {
    readonly copy: boolean
  }
>('087/unit/isolate')

class Counter {
  #value: number
  constructor(value: number) {
    this.#value = value
  }
  read() {
    return this.#value
  }
  increment() {
    this.#value += 1
  }
}

const calls = { decode: 0, encode: 0, detach: 0 }

const date = S.String.pipe(
  S.decodeTo(S.Date, {
    decode: G.transformEffect((value) =>
      Effect.sleep(1).pipe(Effect.as(new Date(value)))
    ),
    encode: G.transformEffect((value) =>
      Effect.sleep(1).pipe(Effect.as(value.toISOString()))
    ),
  })
)

const counter = S.Number.pipe(
  S.decodeTo(S.instanceOf(Counter), {
    decode: G.transformEffect((value) =>
      Effect.sync(() => {
        calls.decode += 1

        return new Counter(value)
      })
    ),
    encode: G.transformEffect((value) =>
      Effect.sync(() => {
        calls.encode += 1

        return value.read()
      })
    ),
  })
)

const text = S.String.pipe(
  S.decodeTo(S.String, {
    decode: G.transformEffect((value) =>
      DecodeContext.pipe(Effect.map((service) => service.prefix + value))
    ),
    encode: G.transformEffect((value) =>
      EncodeContext.pipe(
        Effect.map((service) => value.slice(service.prefix.length))
      )
    ),
  })
)

const Dated = createFlowNodeVariantSchema({
  type: S.Literal('dated'),
  data: S.Struct({ date, counter, text }),
})

const Counted = createFlowNodeVariantSchema({
  type: S.Literal('counted'),
  data: S.Struct({ count: S.Number }),
})

const Weighted = createFlowEdgeVariantSchema({
  type: S.Literal('weighted'),
  data: S.Struct({ weight: S.Number }),
})

const Timed = createFlowEdgeVariantSchema({
  type: S.Literal('timed'),
  data: S.Struct({ date }),
})

const Document = createFlowDataDocumentSchema({
  nodes: S.Union([Dated, Counted]).pipe(S.toTaggedUnion('type')),
  edges: S.Union([Weighted, Timed]).pipe(S.toTaggedUnion('type')),
})

const base = { id: 'one', label: 'One', position: { x: 2, y: -3 } }

const edgeBase = { id: 'edge', source: 'one', target: 'two' }

const iso = '2026-10-02T00:00:00.000Z'

const input = {
  nodeOrigin: [-0.25, 2],
  nodes: [
    {
      ...base,
      type: 'dated',
      origin: [0, 0],
      parentId: 'two',
      extent: 'parent',
      zIndex: -2,
      selected: true,
      selectable: false,
      focusable: true,
      draggable: false,
      deletable: false,
      hidden: false,
      connectable: false,
      ariaRole: '',
      ariaLabel: '',
      ariaDescription: '',
      size: { width: 10, height: 20 },
      handles: [{ id: 'port', kind: 'target', side: 'left' }],
      data: { date: iso, counter: 4, text: 'value' },
    },
    { ...base, id: 'two', type: 'counted', data: { count: 2 } },
  ],
  edges: [
    {
      ...edgeBase,
      type: 'weighted',
      sourceHandle: 'port',
      ariaRole: '',
      ariaLabel: '',
      selected: true,
      selectable: false,
      focusable: true,
      deletable: false,
      hidden: false,
      path: 'straight',
      markerStart: 'arrow',
      markerEnd: 'arrowclosed',
      stroke: '#123abc',
      strokeWidth: 2,
      interactionWidth: 8,
      data: { weight: 3 },
    },
  ],
}

type CodecInput = Parameters<
  ReturnType<typeof S.decodeUnknownEffect<typeof Document>>
>[0]

const decode = (value: CodecInput) =>
  S.decodeUnknownEffect(Document)(value).pipe(
    Effect.provideService(DecodeContext, { prefix: 'prefix:' })
  )

const contract = defineFlowDataContract({
  id: 'unit',
  document: Document,
  isolation: {
    detach: (value: typeof Document.Type) =>
      Effect.gen(function* detachDocument() {
        const service = yield* IsolationContext

        calls.detach += 1

        if (!service.copy) {
          return value
        }

        return {
          ...value,
          nodes: value.nodes.map((node) =>
            node.type === 'dated'
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    date: new Date(node.data.date),
                    counter: new Counter(node.data.counter.read()),
                  },
                }
              : { ...node, data: { ...node.data } }
          ),
          edges: value.edges.map((edge) =>
            edge.type === 'timed'
              ? { ...edge, data: { date: new Date(edge.data.date) } }
              : { ...edge, data: { ...edge.data } }
          ),
        }
      }),
  },
})

const rejected = async <C extends S.ConstraintDecoder<unknown>>(
  schema: C,
  value: CodecInput
) =>
  expect(
    Exit.isFailure(
      await Effect.runPromiseExit(S.decodeUnknownEffect(schema)(value))
    )
  ).toBeTruthy()

describe('public typed-data factory', () => {
  it('defines a contract without running codecs or isolation', () => {
    const before = { ...calls }

    const made = defineFlowDataContract({
      id: 'pure',
      document: contract.document,
      isolation: contract.isolation,
    })

    expect(made.document).toBe(Document)
    expect(made.isolation).toBe(contract.isolation)
    expect(calls).toStrictEqual(before)
  })

  it('retains explicit pairs, classes, independent services and accepted metadata', async () => {
    const value = await Effect.runPromise(decode(input))
    const [node] = value.nodes

    if (node?.type !== 'dated') {
      throw new Error('Expected dated node')
    }

    expect([
      node.data.date instanceof Date,
      node.data.counter instanceof Counter,
    ]).toStrictEqual([true, true])
    expect({
      counter: node.data.counter.read(),
      text: node.data.text,
      global: value.nodeOrigin,
      local: node.origin,
      connectable: node.connectable,
      role: node.ariaRole,
      description: node.ariaDescription,
    }).toStrictEqual({
      counter: 4,
      text: 'prefix:value',
      global: [-0.25, 2],
      local: [0, 0],
      connectable: false,
      role: '',
      description: '',
    })

    const encoded = await Effect.runPromise(
      S.encodeUnknownEffect(contract.document)(value).pipe(
        Effect.provideService(EncodeContext, { prefix: 'prefix:' })
      )
    )

    expect(encoded).toStrictEqual(input)
    await expect(
      Effect.runPromise(S.decodeUnknownEffect(S.toType(Document))(value))
    ).resolves.toStrictEqual(value)
    await rejected(S.toType(Document), input)
    await rejected(S.toType(Document), {
      ...value,
      nodes: [{ ...node, data: { ...node.data, counter: { read: () => 4 } } }],
    })

    const failures = await Promise.all(
      [
        { ...input, nodes: [{ ...base, type: 'dated', data: { count: 2 } }] },
        {
          ...input,
          edges: [{ ...edgeBase, type: 'weighted', data: { date: iso } }],
        },
        ...[
          { size: { width: 0, height: 2 } },
          { connectable: 'yes' },
          { origin: [0] },
          { handles: [{ id: '', kind: 'source', side: 'left' }] },
        ].map((bad) => ({ ...input, nodes: [{ ...input.nodes[0], ...bad }] })),
      ].map((bad) => Effect.runPromiseExit(decode(bad)))
    )

    expect(failures.map(Exit.isFailure)).toStrictEqual([
      true,
      true,
      true,
      true,
      true,
      true,
    ])
  })

  it('copies Date and private state independently through the supplied capability', async () => {
    const original = await Effect.runPromise(decode(input))

    const detach = () =>
      contract.isolation
        .detach(original)
        .pipe(Effect.provideService(IsolationContext, { copy: true }))

    const first = await Effect.runPromise(detach())
    const second = await Effect.runPromise(detach())
    const [a] = first.nodes
    const [b] = second.nodes
    const [o] = original.nodes

    if (a?.type !== 'dated' || b?.type !== 'dated' || o?.type !== 'dated') {
      throw new Error('Expected dated copies')
    }

    expect([
      a.data.date !== o.data.date,
      a.data.counter !== b.data.counter,
    ]).toStrictEqual([true, true])
    a.data.date.setUTCFullYear(2050)
    a.data.counter.increment()
    expect([
      b.data.date.toISOString(),
      o.data.date.toISOString(),
      b.data.counter.read(),
      o.data.counter.read(),
    ]).toStrictEqual([iso, iso, 4, 4])
    await Effect.runPromise(S.decodeUnknownEffect(S.toType(Document))(first))
  })

  it('keeps suspension independent of service requirements and does not certify singleton isolation', async () => {
    await expect(
      Effect.runPromise(S.decodeUnknownEffect(date)(iso))
    ).resolves.toStrictEqual(new Date(iso))
    expect(() => S.decodeUnknownSync(date)(iso)).toThrow(
      'Sync adapter can only throw schema errors'
    )
    const singleton = new Counter(1)

    const shared = S.Number.pipe(
      S.decodeTo(S.instanceOf(Counter), {
        decode: G.transform(() => singleton),
        encode: G.transform((value) => value.read()),
      })
    )

    const SharedNode = createFlowNodeVariantSchema({
      type: S.Literal('shared'),
      data: shared,
    })

    const SharedDoc = createFlowDataDocumentSchema({
      nodes: SharedNode,
      edges: Weighted,
    })

    const sharedContract = defineFlowDataContract({
      id: 'trusted-only',
      document: SharedDoc,
      isolation: {
        detach: (value: typeof SharedDoc.Type) => Effect.succeed(value),
      },
    })

    const first = await Effect.runPromise(
      S.decodeUnknownEffect(sharedContract.document)({
        nodes: [{ ...base, type: 'shared', data: 1 }],
        edges: [],
      })
    )

    const second = await Effect.runPromise(
      S.decodeUnknownEffect(sharedContract.document)({
        nodes: [{ ...base, type: 'shared', data: 2 }],
        edges: [],
      })
    )

    expect(first.nodes[0]?.data).toBe(second.nodes[0]?.data)
    singleton.increment()
    expect(first.nodes[0]?.data.read()).toBe(2)
    await expect(
      Effect.runPromise(S.decodeUnknownEffect(S.toType(SharedDoc))(first))
    ).resolves.toStrictEqual(first)
  })

  it('preserves optional, key/value defaults, encoding strategies and untagged unions for nodes and edges', async () => {
    const optional = S.optional(S.Literal('default'))

    const key = S.Literal('default').pipe(
      S.withDecodingDefaultKey(Effect.succeed('default'))
    )

    const value = S.Literal('default').pipe(
      S.withDecodingDefault(Effect.succeed('default'))
    )

    const omitted = S.Literal('default').pipe(
      S.withDecodingDefaultKey(Effect.succeed('default'), {
        encodingStrategy: 'omit',
      })
    )

    await Promise.all(
      [optional, key, value, omitted].map(async (type) => {
        await Promise.all(
          [
            {
              schema: createFlowNodeVariantSchema({
                type,
                data: S.Struct({ date }),
              }),
              geometry: base,
            },
            {
              schema: createFlowEdgeVariantSchema({
                type,
                data: S.Struct({ date }),
              }),
              geometry: edgeBase,
            },
          ].map(async ({ schema, geometry }) => {
            const decoded = await Effect.runPromise(
              S.decodeUnknownEffect(schema)({
                ...geometry,
                data: { date: iso },
              })
            )

            expect(decoded.type).toBe(type === optional ? undefined : 'default')
            expect(Object.hasOwn(decoded, 'type')).toBe(type !== optional)

            const encoded = await Effect.runPromise(
              S.encodeUnknownEffect(schema)(decoded)
            )

            expect(Object.hasOwn(encoded, 'type')).toBe(
              type === key || type === value
            )

            const ownUndefined = await Effect.runPromiseExit(
              S.decodeUnknownEffect(schema)({
                ...geometry,
                type: undefined,
                data: { date: iso },
              })
            )

            expect(Exit.isFailure(ownUndefined)).toBe(
              type === key || type === omitted
            )
            await rejected(schema, {
              ...geometry,
              type: 'foreign',
              data: { date: iso },
            })
            await rejected(schema, {
              ...geometry,
              type: 'default',
              data: { count: 1 },
            })
          })
        )
      })
    )

    const Untagged = createFlowNodeVariantSchema({
      type: S.optional(S.Undefined),
      data: S.Struct({ count: S.Number }),
    })

    const Optional = createFlowNodeVariantSchema({
      type: optional,
      data: S.Struct({ date }),
    })

    const union = S.Union([Optional, Untagged])

    const awaitedValue0 = await Effect.runPromise(
      S.decodeUnknownEffect(union)({ ...base, data: { count: 1 } })
    )

    expect(awaitedValue0.type).toBeUndefined()
    await rejected(union, { ...base, type: 'default', data: { count: 1 } })
    await rejected(union, { ...base, type: 'foreign', data: { count: 1 } })

    const edgeUnion = S.Union([
      createFlowEdgeVariantSchema({ type: optional, data: S.Struct({ date }) }),
      createFlowEdgeVariantSchema({
        type: S.optional(S.Undefined),
        data: S.Struct({ count: S.Number }),
      }),
    ])

    await rejected(edgeUnion, {
      ...edgeBase,
      type: 'foreign',
      data: { count: 1 },
    })
  })

  it('rejects foreign data for explicit, optional, default and untagged no-data branches', async () => {
    const types = [
      S.Literal('empty'),
      S.optional(S.Literal('empty')),
      S.Literal('empty').pipe(
        S.withDecodingDefaultKey(Effect.succeed('empty'))
      ),
      S.optional(S.Undefined),
    ]

    await Promise.all(
      types.map(async (type) => {
        await Promise.all(
          [
            {
              schema: createFlowNodeVariantSchema({
                type,
                data: S.optional(S.Undefined),
              }),
              geometry: base,
            },
            {
              schema: createFlowEdgeVariantSchema({
                type,
                data: S.optional(S.Undefined),
              }),
              geometry: edgeBase,
            },
          ].map(async ({ schema, geometry }) => {
            const fields = type === types[0] ? { type: 'empty' } : {}
            await expect(
              Effect.runPromise(
                S.decodeUnknownEffect(schema)({ ...geometry, ...fields })
              )
            ).resolves.not.toHaveProperty('data')
            await expect(
              Effect.runPromise(
                S.decodeUnknownEffect(schema)({
                  ...geometry,
                  ...fields,
                  data: undefined,
                })
              )
            ).resolves.toHaveProperty('data')
            await Promise.all(
              [{}, 'foreign', null].map(async (data) => {
                await rejected(schema, { ...geometry, ...fields, data })
              })
            )
          })
        )
      })
    )
  })

  it('preserves exact optional data and constructor/decoding defaults without another branch', async () => {
    const optionalKey = S.optionalKey(date)

    const OptionalKey = createFlowNodeVariantSchema({
      type: S.Literal('key'),
      data: optionalKey,
    })

    const Optional = createFlowNodeVariantSchema({
      type: S.Literal('value'),
      data: S.optional(date),
    })

    expect(OptionalKey.fields.data).toBe(optionalKey)
    await expect(
      Effect.runPromise(
        S.decodeUnknownEffect(OptionalKey)({ ...base, type: 'key' })
      )
    ).resolves.not.toHaveProperty('data')
    await rejected(OptionalKey, { ...base, type: 'key', data: undefined })
    await expect(
      Effect.runPromise(
        S.decodeUnknownEffect(Optional)({
          ...base,
          type: 'value',
          data: undefined,
        })
      )
    ).resolves.toHaveProperty('data')
    const defaultData = date.pipe(S.withDecodingDefaultKey(Effect.succeed(iso)))

    const Default = createFlowNodeVariantSchema({
      type: S.Literal('default'),
      data: defaultData,
    })

    const decoded = await Effect.runPromise(
      S.decodeUnknownEffect(Default)({ ...base, type: 'default' })
    )

    const awaitedValue1 = await Effect.runPromise(
      S.encodeUnknownEffect(Default)(decoded)
    )

    const Constructed = createFlowNodeVariantSchema({
      type: S.Literal('constructed'),
      data: S.Number.pipe(S.withConstructorDefault(Effect.succeed(7))),
    })

    const constructed = Constructed.make({
      ...S.decodeUnknownSync(
        S.Struct({
          id: Dated.fields.id,
          label: Dated.fields.label,
          position: Dated.fields.position,
        })
      )(base),
      type: 'constructed',
    }).data

    const ServiceDefault = createFlowNodeVariantSchema({
      type: S.Literal('service'),
      data: S.String.pipe(
        S.withDecodingDefaultKey(
          DecodeContext.pipe(Effect.map((service) => service.prefix))
        )
      ),
    })

    const awaitedValue2 = await Effect.runPromise(
      S.decodeUnknownEffect(ServiceDefault)({
        ...base,
        type: 'service',
      }).pipe(Effect.provideService(DecodeContext, { prefix: 'default' }))
    )

    expect([
      decoded.data,
      awaitedValue1.data,
      constructed,
      awaitedValue2.data,
    ]).toStrictEqual([new Date(iso), iso, 7, 'default'])

    // @ts-expect-error Root exactOptionalPropertyTypes rejects own undefined for optionalKey.
    const wrongKey: typeof OptionalKey.Type = {
      ...decoded,
      type: 'key',
      data: undefined,
    }

    void wrongKey
  })

  it('roundtrips all approved failures and rejects malformed tags, operations and fields', async () => {
    const failures = [
      {
        ...Object.fromEntries([['_tag', 'FlowCallbackFailure']]),
        message: 'callback',
      },
      Object.fromEntries([['_tag', 'FlowDisposed']]),
      {
        ...Object.fromEntries([['_tag', 'FlowRevisionConflict']]),
        expected: 1,
        actual: 2,
      },
      {
        ...Object.fromEntries([['_tag', 'FlowProjectionFailure']]),
        revision: 2,
        message: 'projection',
      },
      ...['decode', 'validate-decoded', 'encode', 'isolate']
        .map((operation) => ({
          ...Object.fromEntries([['_tag', 'FlowCodecFailure']]),
          operation,
          message: 'codec',
        }))
        .map((value) => S.decodeUnknownSync(FlowTypedFailureSchema)(value)),
    ].map((failure) => S.decodeUnknownSync(FlowTypedFailureSchema)(failure))

    await Promise.all(
      failures.map(async (failure) => {
        const encoded = await Effect.runPromise(
          S.encodeUnknownEffect(FlowTypedFailureSchema)(failure)
        )

        await expect(
          Effect.runPromise(
            S.decodeUnknownEffect(FlowTypedFailureSchema)(encoded)
          )
        ).resolves.toStrictEqual(failure)
      })
    )
    await Promise.all(
      [
        Object.fromEntries([['_tag', 'unknown']]),
        {
          ...Object.fromEntries([['_tag', 'FlowCodecFailure']]),
          operation: 'render',
          message: 'x',
        },
        {
          ...Object.fromEntries([['_tag', 'FlowCodecFailure']]),
          operation: 'decode',
        },
        {
          ...Object.fromEntries([['_tag', 'FlowCallbackFailure']]),
          message: 1,
        },
        {
          ...Object.fromEntries([['_tag', 'FlowRevisionConflict']]),
          expected: 1,
        },
        {
          ...Object.fromEntries([['_tag', 'FlowProjectionFailure']]),
          revision: '2',
          message: 'x',
        },
      ].map(async (malformed) => {
        await rejected(FlowTypedFailureSchema, malformed)
      })
    )
  })
})

describe('typed shared integrity', () => {
  it('returns every decoded reference and complete subtype without invoking caller operations', async () => {
    const document = await Effect.runPromise(decode(input))
    const before = { ...calls }

    const result: typeof Document.Type = await Effect.runPromise(
      validateFlowGraphDocument(document)
    )

    expect([
      result === document,
      result.nodes === document.nodes,
      result.edges === document.edges,
      result.nodes[0] === document.nodes[0],
      result.edges[0] === document.edges[0],
      result.nodes[0]?.data === document.nodes[0]?.data,
    ]).toStrictEqual([true, true, true, true, true, true])
    expect(calls).toStrictEqual(before)
    expect(result.nodeOrigin).toStrictEqual([-0.25, 2])
    // The source endpoint deliberately references an existing target-kind physical ID.
    expect(result.edges[0]?.sourceHandle).toBe('port')
  })

  it('preserves every error family and the shared first-failure order', async () => {
    const document = await Effect.runPromise(decode(input))
    const [one] = document.nodes
    const [, two] = document.nodes
    const [edge] = document.edges

    if (one === undefined || two === undefined || edge === undefined) {
      throw new Error('Expected graph')
    }

    const missing = S.decodeUnknownSync(NodeIdSchema)('missing')
    const badHandle = S.decodeUnknownSync(HandleIdSchema)('missing')
    const handle = one.handles?.[0]

    if (handle === undefined) {
      throw new Error('Expected handle')
    }

    const duplicateHandleNode = { ...one, handles: [handle, handle] }

    const cases = [
      {
        nodes: [one, { ...one, parentId: missing }],
        edges: [],
        tag: 'DuplicateNodeId',
        fields: { nodeId: one.id },
      },
      {
        nodes: [
          { ...one, parentId: missing },
          { ...two, parentId: two.id },
        ],
        edges: [],
        tag: 'MissingParentNode',
        fields: { nodeId: one.id, parentId: missing },
      },
      {
        nodes: [{ ...one, parentId: one.id }],
        edges: [],
        tag: 'SelfParentNode',
        fields: { nodeId: one.id },
      },
      {
        nodes: [{ ...one, parentId: undefined, extent: 'parent' }],
        edges: [],
        tag: 'ParentExtentWithoutParent',
        fields: { nodeId: one.id },
      },
      {
        nodes: [
          { ...one, parentId: two.id },
          { ...two, parentId: one.id },
        ],
        edges: [],
        tag: 'ParentCycle',
        fields: { nodeId: one.id },
      },
      {
        nodes: [duplicateHandleNode, two],
        edges: [edge, edge],
        tag: 'DuplicateEdgeId',
        fields: { edgeId: edge.id },
      },
      {
        nodes: [duplicateHandleNode, two],
        edges: [],
        tag: 'DuplicateHandleId',
        fields: { nodeId: one.id, handleId: handle.id },
      },
      {
        nodes: [one, two],
        edges: [
          {
            ...edge,
            source: missing,
            target: missing,
            sourceHandle: badHandle,
          },
        ],
        tag: 'MissingEdgeEndpoint',
        fields: { endpoint: 'source', nodeId: missing },
      },
      {
        nodes: [one, two],
        edges: [{ ...edge, target: missing, sourceHandle: badHandle }],
        tag: 'MissingEdgeEndpoint',
        fields: { endpoint: 'target', nodeId: missing },
      },
      {
        nodes: [one, two],
        edges: [{ ...edge, sourceHandle: badHandle, targetHandle: badHandle }],
        tag: 'MissingEdgeHandle',
        fields: { endpoint: 'source', handleId: badHandle },
      },
      {
        nodes: [one, two],
        edges: [{ ...edge, targetHandle: badHandle }],
        tag: 'MissingEdgeHandle',
        fields: { endpoint: 'target', handleId: badHandle },
      },
      {
        nodes: [one, two],
        edges: [
          { ...edge, target: missing },
          {
            ...edge,
            id: S.decodeUnknownSync(EdgeIdSchema)('later'),
            sourceHandle: badHandle,
          },
        ],
        tag: 'MissingEdgeEndpoint',
        fields: { endpoint: 'target', edgeId: edge.id },
      },
    ]

    await Promise.all(
      cases.map(async (item) => {
        // Decode through the caller codec first; do not validate a geometry projection.
        const candidate = await Effect.runPromise(
          S.decodeUnknownEffect(S.toType(Document))({
            nodes: item.nodes,
            edges: item.edges,
          })
        )

        const failure = await Effect.runPromise(
          Effect.flip(validateFlowGraphDocument(candidate))
        )

        expect(failure._tag).toBe(item.tag)
        expect(failure).toMatchObject(item.fields)
      })
    )
  })

  it('supports a whole-document codec with a different encoded shape and extra decoded metadata', async () => {
    const WholeType = S.Struct({
      nodes: S.toType(Document.fields.nodes),
      edges: S.toType(Document.fields.edges),
      nodeOrigin: S.toType(Document.fields.nodeOrigin),
      owner: S.String,
    })

    const Whole = S.Struct({ graph: Document, owner: text }).pipe(
      S.decodeTo(WholeType, {
        decode: G.transform((value) => ({
          ...value.graph,
          owner: value.owner,
        })),
        encode: G.transform((value) => ({ graph: value, owner: value.owner })),
      })
    )

    const custom = defineFlowDataContract({
      id: 'whole',
      document: Whole,
      isolation: {
        detach: (value: typeof Whole.Type) =>
          contract.isolation
            .detach(value)
            .pipe(Effect.map((graph) => ({ ...graph, owner: value.owner }))),
      },
    })

    const decoded = await Effect.runPromise(
      S.decodeUnknownEffect(custom.document)({
        graph: input,
        owner: 'owner',
      }).pipe(Effect.provideService(DecodeContext, { prefix: 'prefix:' }))
    )

    expect(decoded.owner).toBe('prefix:owner')
    await expect(
      Effect.runPromise(validateFlowGraphDocument(decoded))
    ).resolves.toBe(decoded)

    const encoded = await Effect.runPromise(
      S.encodeUnknownEffect(custom.document)(decoded).pipe(
        Effect.provideService(EncodeContext, { prefix: 'prefix:' })
      )
    )

    expect(encoded).toStrictEqual({ graph: input, owner: 'owner' })

    const isolated = await Effect.runPromise(
      custom.isolation
        .detach(decoded)
        .pipe(Effect.provideService(IsolationContext, { copy: true }))
    )

    expect(isolated.owner).toBe('prefix:owner')
    expect(isolated.nodeOrigin).toStrictEqual(input.nodeOrigin)
  })
})
