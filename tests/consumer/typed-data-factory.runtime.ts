import {
  createFlowDataDocumentSchema,
  createFlowEdgeVariantSchema,
  createFlowNodeVariantSchema,
  defineFlowDataContract,
  EdgeIdSchema,
  FlowTypedFailureSchema,
  HandleIdSchema,
  NodeIdSchema,
  validateFlowGraphDocument,
} from '@flow/core'
import { Context, Effect, Exit, Schema as S, SchemaGetter as G } from 'effect'

let assertions = 0

const check = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message)
  }

  assertions += 1
}

type DecodeRequirement = '087/runtime/decode'

const DecodeContext = Context.Service<
  DecodeRequirement,
  {
    readonly prefix: string
  }
>('087/runtime/decode')

type EncodeRequirement = '087/runtime/encode'

const EncodeContext = Context.Service<
  EncodeRequirement,
  {
    readonly prefix: string
  }
>('087/runtime/encode')

type IsolationRequirement = '087/runtime/isolation'

const IsolationContext = Context.Service<
  IsolationRequirement,
  {
    readonly enabled: boolean
  }
>('087/runtime/isolation')

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

const iso = '2026-10-02T00:00:00.000Z'

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

const beforeDefinition = { ...calls }

const contract = defineFlowDataContract({
  id: 'installed',
  document: Document,
  isolation: {
    detach: (value: typeof Document.Type) =>
      Effect.gen(function* detachDocument() {
        const service = yield* IsolationContext

        calls.detach += 1

        if (!service.enabled) {
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

check(
  JSON.stringify(calls) === JSON.stringify(beforeDefinition),
  'Factory construction invoked a caller operation'
)

check(contract.document === Document, 'Factory replaced caller codec')

const base = { id: 'one', label: 'One', position: { x: 1, y: 2 } }

const edgeBase = { id: 'edge', source: 'one', target: 'two' }

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
      ariaRole: '',
      ariaLabel: '',
      ariaDescription: '',
      connectable: false,
      size: { width: 10, height: 20 },
      handles: [{ id: 'port', kind: 'target', side: 'left' }],
      data: { date: iso, counter: 4, text: 'value' },
    },
    { ...base, id: 'two', type: 'counted', data: { count: 2 } },
  ],
  edges: [
    {
      ...edgeBase,
      sourceHandle: 'port',
      type: 'weighted',
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
  S.decodeUnknownEffect(contract.document)(value).pipe(
    Effect.provideService(DecodeContext, { prefix: 'prefix:' })
  )

const document = await Effect.runPromise(decode(input))

const [first] = document.nodes

const [, second] = document.nodes

const [edge] = document.edges

if (first?.type !== 'dated' || second === undefined || edge === undefined) {
  throw new Error('Expected decoded graph')
}

check(
  first.data.date instanceof Date && first.data.counter instanceof Counter,
  'Decoded classes lost'
)

check(
  first.data.counter.read() === 4 && first.data.text === 'prefix:value',
  'Decode service/class data lost'
)

check(
  JSON.stringify(document.nodeOrigin) === '[-0.25,2]' &&
    JSON.stringify(first.origin) === '[0,0]',
  'Origin metadata lost'
)

check(
  first.connectable === false &&
    first.ariaDescription === '' &&
    first.size?.width === 10,
  'Accepted node metadata lost'
)

check(
  first.parentId === second.id &&
    first.extent === 'parent' &&
    first.selected === true &&
    first.selectable === false &&
    first.focusable === true &&
    first.draggable === false &&
    first.deletable === false &&
    first.hidden === false,
  'Parent/flag metadata changed'
)

check(
  edge.selected === true &&
    edge.selectable === false &&
    edge.focusable === true &&
    edge.deletable === false &&
    edge.path === 'straight' &&
    edge.markerStart === 'arrow' &&
    edge.markerEnd === 'arrowclosed' &&
    edge.strokeWidth === 2 &&
    edge.interactionWidth === 8,
  'Edge metadata changed'
)

const encoded = await Effect.runPromise(
  S.encodeUnknownEffect(contract.document)(document).pipe(
    Effect.provideService(EncodeContext, { prefix: 'prefix:' })
  )
)

check(
  JSON.stringify(encoded) ===
    JSON.stringify(S.decodeUnknownSync(S.toEncoded(Document))(input)),
  'Encoded roundtrip changed geometry/data/metadata'
)

const beforeIntegrity = { ...calls }

const same = await Effect.runPromise(validateFlowGraphDocument(document))

check(
  same === document &&
    same.nodes === document.nodes &&
    same.edges === document.edges,
  'Integrity projected or copied graph'
)

check(
  same.nodes[0] === first &&
    same.edges[0] === edge &&
    same.nodes[0]?.data === first.data,
  'Integrity replaced subtype/data'
)

check(
  JSON.stringify(calls) === JSON.stringify(beforeIntegrity),
  'Integrity reinvoked codec/isolation'
)

const reject = async <C extends S.ConstraintDecoder<unknown>>(
  schema: C,
  value: CodecInput,
  message: string
) =>
  check(
    Exit.isFailure(
      await Effect.runPromiseExit(S.decodeUnknownEffect(schema)(value))
    ),
    message
  )

await reject(
  S.toType(Document),
  input,
  'Encoded representations accepted as decoded classes'
)

await reject(
  S.toType(Document),
  {
    ...document,
    nodes: [{ ...first, data: { ...first.data, counter: { read: () => 4 } } }],
  },
  'Plain object accepted as private class'
)

await Effect.runPromise(S.decodeUnknownEffect(S.toType(Document))(document))

check(
  Exit.isFailure(
    await Effect.runPromiseExit(
      decode({
        ...input,
        nodes: [{ ...base, type: 'dated', data: { count: 1 } }],
      })
    )
  ),
  'Wrong node pair accepted'
)

check(
  Exit.isFailure(
    await Effect.runPromiseExit(
      decode({
        ...input,
        edges: [{ ...edgeBase, type: 'weighted', data: { date: iso } }],
      })
    )
  ),
  'Wrong edge pair accepted'
)

await Promise.all(
  [
    { size: { width: 0, height: 2 } },
    { connectable: 'yes' },
    { origin: [0] },
    { handles: [{ id: '', kind: 'source', side: 'left' }] },
  ].map(async (bad) => {
    check(
      Exit.isFailure(
        await Effect.runPromiseExit(
          decode({ ...input, nodes: [{ ...input.nodes[0], ...bad }] })
        )
      ),
      'Base constraint weakened'
    )
  })
)

const absent = await Effect.runPromise(
  decode({
    nodes: [{ ...base, type: 'counted', data: { count: 1 } }],
    edges: [],
  })
)

check(
  !Object.hasOwn(absent, 'nodeOrigin') &&
    !Object.hasOwn(absent.nodes[0] ?? {}, 'origin'),
  'Absent origins fabricated'
)

const zero = await Effect.runPromise(
  decode({
    nodeOrigin: [0, 0],
    nodes: [{ ...base, origin: [-2, 3], type: 'counted', data: { count: 1 } }],
    edges: [],
  })
)

check(
  JSON.stringify(zero.nodeOrigin) === '[0,0]' &&
    JSON.stringify(zero.nodes[0]?.origin) === '[-2,3]',
  'Zero/unclamped origin changed'
)

const detach = () =>
  contract.isolation
    .detach(document)
    .pipe(Effect.provideService(IsolationContext, { enabled: true }))

const a = await Effect.runPromise(detach())

const b = await Effect.runPromise(detach())

const [an] = a.nodes

const [bn] = b.nodes

if (an?.type !== 'dated' || bn?.type !== 'dated') {
  throw new Error('Expected detached variants')
}

check(
  an.data.date !== first.data.date && an.data.counter !== bn.data.counter,
  'Capability failed independence'
)

an.data.date.setUTCFullYear(2050)

an.data.counter.increment()

check(
  first.data.date.toISOString() === iso &&
    bn.data.date.toISOString() === iso &&
    first.data.counter.read() === 4 &&
    bn.data.counter.read() === 4,
  'Detached mutation escaped'
)

await Effect.runPromise(S.decodeUnknownEffect(S.toType(Document))(a))

let syncFailed = false

try {
  S.decodeUnknownSync(date)(iso)
} catch {
  syncFailed = true
}

check(syncFailed, 'Service-free suspended codec unexpectedly ran synchronously')

const awaitedValue0 = await Effect.runPromise(S.decodeUnknownEffect(date)(iso))

check(
  awaitedValue0.toISOString() === iso,
  'Effect parser failed service-free suspension'
)

const singleton = new Counter(1)

const Singleton = createFlowNodeVariantSchema({
  type: S.Literal('singleton'),
  data: S.Number.pipe(
    S.decodeTo(S.instanceOf(Counter), {
      decode: G.transform(() => singleton),
      encode: G.transform((value) => value.read()),
    })
  ),
})

const singletonDoc = createFlowDataDocumentSchema({
  nodes: Singleton,
  edges: Weighted,
})

const singletonContract = defineFlowDataContract({
  id: 'singleton',
  document: singletonDoc,
  isolation: {
    detach: (value: typeof singletonDoc.Type) => Effect.succeed(value),
  },
})

const s1 = await Effect.runPromise(
  S.decodeUnknownEffect(singletonContract.document)({
    nodes: [{ ...base, type: 'singleton', data: 1 }],
    edges: [],
  })
)

const s2 = await Effect.runPromise(
  S.decodeUnknownEffect(singletonContract.document)({
    nodes: [{ ...base, type: 'singleton', data: 2 }],
    edges: [],
  })
)

check(
  s1.nodes[0]?.data === s2.nodes[0]?.data,
  'Singleton diagnostic fixture no longer aliases'
)

singleton.increment()

check(
  s1.nodes[0]?.data.read() === 2 && s2.nodes[0]?.data.read() === 2,
  'Singleton schema diagnostic missing private alias'
)

const optional = S.optional(S.Literal('default'))

const key = S.Literal('default').pipe(
  S.withDecodingDefaultKey(Effect.succeed('default'))
)

const valueDefault = S.Literal('default').pipe(
  S.withDecodingDefault(Effect.succeed('default'))
)

const omit = S.Literal('default').pipe(
  S.withDecodingDefaultKey(Effect.succeed('default'), {
    encodingStrategy: 'omit',
  })
)

await Promise.all(
  [optional, key, valueDefault, omit].map(async (type) => {
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
          S.decodeUnknownEffect(schema)({ ...geometry, data: { date: iso } })
        )

        check(
          decoded.type === (type === optional ? undefined : 'default'),
          'Discriminator default changed'
        )
        check(
          Object.hasOwn(decoded, 'type') === (type !== optional),
          'Optional absence fabricated'
        )

        const out = await Effect.runPromise(
          S.encodeUnknownEffect(schema)(decoded)
        )

        check(
          Object.hasOwn(out, 'type') ===
            (type === key || type === valueDefault),
          'Caller encoding strategy lost'
        )

        const undefinedResult = await Effect.runPromiseExit(
          S.decodeUnknownEffect(schema)({
            ...geometry,
            type: undefined,
            data: { date: iso },
          })
        )

        check(
          Exit.isFailure(undefinedResult) === (type === key || type === omit),
          'Key/value own undefined semantics changed'
        )
        await reject(
          schema,
          { ...geometry, type: 'foreign', data: { date: iso } },
          'Foreign optional/default discriminator accepted'
        )
        await reject(
          schema,
          { ...geometry, type: 'default', data: { count: 1 } },
          'Wrong optional/default data accepted'
        )
      })
    )
  })
)

const requiredEmpty = S.Literal('empty')

await Promise.all(
  [
    requiredEmpty,
    S.optional(S.Literal('empty')),
    S.Literal('empty').pipe(S.withDecodingDefaultKey(Effect.succeed('empty'))),
    S.optional(S.Undefined),
  ].map(async (type) => {
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
        const fields = type === requiredEmpty ? { type: 'empty' } : {}
        await Effect.runPromise(
          S.decodeUnknownEffect(schema)({ ...geometry, ...fields })
        )
        await Effect.runPromise(
          S.decodeUnknownEffect(schema)({
            ...geometry,
            ...fields,
            data: undefined,
          })
        )
        await Promise.all(
          [{}, '', null].map(async (data) => {
            await reject(
              schema,
              { ...geometry, ...fields, data },
              'No-data branch accepted foreign data'
            )
          })
        )
      })
    )
  })
)

const Untagged = createFlowNodeVariantSchema({
  type: S.optional(S.Undefined),
  data: S.Struct({ count: S.Number }),
})

const OptionalNode = createFlowNodeVariantSchema({
  type: optional,
  data: S.Struct({ date }),
})

const Ordinary = S.Union([OptionalNode, Untagged])

await Effect.runPromise(
  S.decodeUnknownEffect(Ordinary)({ ...base, data: { count: 1 } })
)

await reject(
  Ordinary,
  { ...base, type: 'default', data: { count: 1 } },
  'Wrong default pair stripped into untagged'
)

await reject(
  Ordinary,
  { ...base, type: 'foreign', data: { count: 1 } },
  'Foreign tag stripped into untagged'
)

const OrdinaryEdge = S.Union([
  createFlowEdgeVariantSchema({ type: optional, data: S.Struct({ date }) }),
  createFlowEdgeVariantSchema({
    type: S.optional(S.Undefined),
    data: S.Struct({ count: S.Number }),
  }),
])

await Effect.runPromise(
  S.decodeUnknownEffect(OrdinaryEdge)({ ...edgeBase, data: { count: 1 } })
)

await reject(
  OrdinaryEdge,
  { ...edgeBase, type: 'foreign', data: { count: 1 } },
  'Foreign edge tag stripped'
)

const Exact = createFlowNodeVariantSchema({
  type: S.Literal('exact'),
  data: S.optionalKey(date),
})

const OptionalData = createFlowNodeVariantSchema({
  type: S.Literal('optional'),
  data: S.optional(date),
})

const exactAbsent = await Effect.runPromise(
  S.decodeUnknownEffect(Exact)({ ...base, type: 'exact' })
)

check(!Object.hasOwn(exactAbsent, 'data'), 'Exact optional absence fabricated')

await reject(
  Exact,
  { ...base, type: 'exact', data: undefined },
  'Exact optional accepted own undefined'
)

const optionalUndefined = await Effect.runPromise(
  S.decodeUnknownEffect(OptionalData)({
    ...base,
    type: 'optional',
    data: undefined,
  })
)

check(
  Object.hasOwn(optionalUndefined, 'data') &&
    optionalUndefined.data === undefined,
  'Optional value own undefined lost'
)

const DefaultData = createFlowNodeVariantSchema({
  type: S.Literal('default'),
  data: date.pipe(S.withDecodingDefaultKey(Effect.succeed(iso))),
})

const defaultData = await Effect.runPromise(
  S.decodeUnknownEffect(DefaultData)({ ...base, type: 'default' })
)

check(defaultData.data.toISOString() === iso, 'Data default failed decode')

const awaitedValue1 = await Effect.runPromise(
  S.encodeUnknownEffect(DefaultData)(defaultData)
)

check(awaitedValue1.data === iso, 'Data default failed encode')

const Constructed = createFlowNodeVariantSchema({
  type: S.Literal('constructed'),
  data: S.Number.pipe(S.withConstructorDefault(Effect.succeed(7))),
})

check(
  Constructed.make({
    id: first.id,
    label: '',
    position: first.position,
    type: 'constructed',
  }).data === 7,
  'Constructor default lost'
)

const ServiceDefault = createFlowNodeVariantSchema({
  type: S.Literal('service'),
  data: S.String.pipe(
    S.withDecodingDefaultKey(
      DecodeContext.pipe(Effect.map((service) => service.prefix))
    )
  ),
})

const awaitedValue2 = await Effect.runPromise(
  S.decodeUnknownEffect(ServiceDefault)({ ...base, type: 'service' }).pipe(
    Effect.provideService(DecodeContext, { prefix: 'default' })
  )
)

check(awaitedValue2.data === 'default', 'Default service lost')

const missing = S.decodeUnknownSync(NodeIdSchema)('missing')

const missingHandle = S.decodeUnknownSync(HandleIdSchema)('missing')

const handle = first.handles?.[0]

if (handle === undefined) {
  throw new Error('Expected handle')
}

const duplicates = { ...first, handles: [handle, handle] }

const integrityCases = [
  {
    nodes: [first, { ...first, parentId: missing }],
    edges: [],
    tag: 'DuplicateNodeId',
  },
  {
    nodes: [
      { ...first, parentId: missing },
      { ...second, parentId: second.id },
    ],
    edges: [],
    tag: 'MissingParentNode',
  },
  {
    nodes: [{ ...first, parentId: first.id }],
    edges: [],
    tag: 'SelfParentNode',
  },
  {
    nodes: [{ ...first, parentId: undefined, extent: 'parent' }],
    edges: [],
    tag: 'ParentExtentWithoutParent',
  },
  {
    nodes: [
      { ...first, parentId: second.id },
      { ...second, parentId: first.id },
    ],
    edges: [],
    tag: 'ParentCycle',
  },
  { nodes: [duplicates, second], edges: [edge, edge], tag: 'DuplicateEdgeId' },
  { nodes: [duplicates, second], edges: [], tag: 'DuplicateHandleId' },
  {
    nodes: [first, second],
    edges: [
      {
        ...edge,
        source: missing,
        target: missing,
        sourceHandle: missingHandle,
      },
    ],
    tag: 'MissingEdgeEndpoint',
  },
  {
    nodes: [first, second],
    edges: [{ ...edge, target: missing, sourceHandle: missingHandle }],
    tag: 'MissingEdgeEndpoint',
  },
  {
    nodes: [first, second],
    edges: [
      { ...edge, sourceHandle: missingHandle, targetHandle: missingHandle },
    ],
    tag: 'MissingEdgeHandle',
  },
  {
    nodes: [first, second],
    edges: [{ ...edge, targetHandle: missingHandle }],
    tag: 'MissingEdgeHandle',
  },
  {
    nodes: [first, second],
    edges: [
      { ...edge, target: missing },
      {
        ...edge,
        id: S.decodeUnknownSync(EdgeIdSchema)('later'),
        sourceHandle: missingHandle,
      },
    ],
    tag: 'MissingEdgeEndpoint',
  },
]

await Promise.all(
  integrityCases.map(async (item) => {
    const decoded = await Effect.runPromise(
      S.decodeUnknownEffect(S.toType(Document))({
        nodes: item.nodes,
        edges: item.edges,
      })
    )

    const error = await Effect.runPromise(
      Effect.flip(validateFlowGraphDocument(decoded))
    )

    check(
      error._tag === item.tag,
      'Shared integrity error family/order changed'
    )
  })
)

const WholeType = S.Struct({
  nodes: S.toType(Document.fields.nodes),
  edges: S.toType(Document.fields.edges),
  nodeOrigin: S.toType(Document.fields.nodeOrigin),
  owner: S.String,
})

const Whole = S.Struct({ graph: Document, owner: text }).pipe(
  S.decodeTo(WholeType, {
    decode: G.transform((value) => ({ ...value.graph, owner: value.owner })),
    encode: G.transform((value) => ({ graph: value, owner: value.owner })),
  })
)

const whole = defineFlowDataContract({
  id: 'whole',
  document: Whole,
  isolation: {
    detach: (value: typeof Whole.Type) =>
      contract.isolation
        .detach(value)
        .pipe(Effect.map((graph) => ({ ...graph, owner: value.owner }))),
  },
})

const wholeDecoded = await Effect.runPromise(
  S.decodeUnknownEffect(whole.document)({ graph: input, owner: 'owner' }).pipe(
    Effect.provideService(DecodeContext, { prefix: 'prefix:' })
  )
)

check(
  wholeDecoded.owner === 'prefix:owner' && whole.document === Whole,
  'Whole codec extra metadata lost'
)

check(
  (await Effect.runPromise(validateFlowGraphDocument(wholeDecoded))) ===
    wholeDecoded,
  'Whole graph identity lost'
)

const wholeEncoded = await Effect.runPromise(
  S.encodeUnknownEffect(whole.document)(wholeDecoded).pipe(
    Effect.provideService(EncodeContext, { prefix: 'prefix:' })
  )
)

check(
  wholeEncoded.owner === 'owner' &&
    JSON.stringify(wholeEncoded.graph) === JSON.stringify(encoded),
  'Whole encoded shape lost'
)

const wholeDetached = await Effect.runPromise(
  whole.isolation
    .detach(wholeDecoded)
    .pipe(Effect.provideService(IsolationContext, { enabled: true }))
)

check(
  wholeDetached.owner === wholeDecoded.owner &&
    wholeDetached.nodes !== wholeDecoded.nodes,
  'Whole isolation lost subtype/metadata'
)

const failures = [
  { ...Object.fromEntries([['_tag', 'FlowCallbackFailure']]), message: 'x' },
  Object.fromEntries([['_tag', 'FlowDisposed']]),
  {
    ...Object.fromEntries([['_tag', 'FlowRevisionConflict']]),
    expected: 1,
    actual: 2,
  },
  {
    ...Object.fromEntries([['_tag', 'FlowProjectionFailure']]),
    revision: 2,
    message: 'x',
  },
].map((failure) => S.decodeUnknownSync(FlowTypedFailureSchema)(failure))

await Promise.all(
  ['decode', 'validate-decoded', 'encode', 'isolate'].map((operation) =>
    failures.push(
      S.decodeUnknownSync(FlowTypedFailureSchema)({
        ...Object.fromEntries([['_tag', 'FlowCodecFailure']]),
        operation,
        message: 'x',
      })
    )
  )
)

await Promise.all(
  failures.map(async (failure) => {
    const out = await Effect.runPromise(
      S.encodeUnknownEffect(FlowTypedFailureSchema)(failure)
    )

    check(
      JSON.stringify(
        await Effect.runPromise(
          S.decodeUnknownEffect(FlowTypedFailureSchema)(out)
        )
      ) === JSON.stringify(failure),
      'Failure schema roundtrip changed'
    )
  })
)

await Promise.all(
  [
    Object.fromEntries([['_tag', 'foreign']]),
    {
      ...Object.fromEntries([['_tag', 'FlowCodecFailure']]),
      operation: 'render',
      message: 'x',
    },
    {
      ...Object.fromEntries([['_tag', 'FlowCodecFailure']]),
      operation: 'decode',
    },
    { ...Object.fromEntries([['_tag', 'FlowCallbackFailure']]), message: 1 },
    { ...Object.fromEntries([['_tag', 'FlowRevisionConflict']]), expected: 1 },
    {
      ...Object.fromEntries([['_tag', 'FlowProjectionFailure']]),
      revision: '2',
      message: 'x',
    },
  ].map(async (bad) => {
    await reject(FlowTypedFailureSchema, bad, 'Malformed failure accepted')
  })
)

console.info(
  JSON.stringify({
    boundary: 'installed-public-core-factory',
    assertions,
    codecCalls: calls,
    syncSuspensionDiagnostic: syncFailed,
    exactOptionalAssignmentClaim: false,
    nativeTypedCanvas: false,
  })
)
