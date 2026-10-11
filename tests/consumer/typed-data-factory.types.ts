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
import type {
  FlowDataContract,
  FlowEdgeOf,
  FlowIsolation,
  FlowNodeOf,
  FlowTypedFailure,
  FlowDocumentIntegrityError,
} from '@flow/core'
import { Context, Effect, Schema as S, SchemaGetter as G } from 'effect'

type DecodeRequirement = '087/types/decode'

const DecodeContext = Context.Service<
  DecodeRequirement,
  { readonly value: string }
>('087/types/decode')

type EncodeRequirement = '087/types/encode'

const EncodeContext = Context.Service<
  EncodeRequirement,
  { readonly value: string }
>('087/types/encode')

type IsolationRequirement = '087/types/isolate'

const IsolationContext = Context.Service<
  IsolationRequirement,
  { readonly value: boolean }
>('087/types/isolate')

class Counter {
  #value: number
  constructor(value: number) {
    this.#value = value
  }
  read() {
    return this.#value
  }
}

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
    decode: G.transform((value) => new Counter(value)),
    encode: G.transform((value) => value.read()),
  })
)

const text = S.String.pipe(
  S.decodeTo(S.String, {
    decode: G.transformEffect((value) =>
      DecodeContext.pipe(Effect.map((service) => service.value + value))
    ),
    encode: G.transformEffect((value) =>
      EncodeContext.pipe(
        Effect.map((service) => value.slice(service.value.length))
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

const Nodes = S.Union([Dated, Counted]).pipe(S.toTaggedUnion('type'))

const Edges = S.Union([Weighted, Timed]).pipe(S.toTaggedUnion('type'))

const Document = createFlowDataDocumentSchema({ nodes: Nodes, edges: Edges })

const contract = defineFlowDataContract({
  id: 'types',
  document: Document,
  isolation: {
    detach: (value: typeof Document.Type) =>
      IsolationContext.pipe(Effect.map(() => value)),
  },
})

const optionalType = S.optional(S.Literal('default'))

const keyDefault = S.Literal('default').pipe(
  S.withDecodingDefaultKey(Effect.succeed('default'))
)

const valueDefault = S.Literal('default').pipe(
  S.withDecodingDefault(Effect.succeed('default'))
)

const optionalData = S.optional(date)

const exactData = S.optionalKey(date)

const AuthoritativeExact = S.Struct({ data: exactData })

const Optional = createFlowNodeVariantSchema({
  type: optionalType,
  data: optionalData,
})

const Exact = createFlowNodeVariantSchema({ type: keyDefault, data: exactData })

const Default = createFlowEdgeVariantSchema({
  type: valueDefault,
  data: date.pipe(S.withDecodingDefaultKey(Effect.succeed('2026-10-02'))),
})

const Constructed = createFlowNodeVariantSchema({
  type: S.Literal('constructed'),
  data: S.Number.pipe(S.withConstructorDefault(Effect.succeed(1))),
})

const Untagged = createFlowNodeVariantSchema({
  type: S.optional(S.Undefined),
  data: S.Struct({ count: S.Number }),
})

const OptionalUnion = S.Union([Dated, Optional, Exact, Untagged])

const Empty = createFlowNodeVariantSchema({
  type: S.Literal('empty'),
  data: S.optional(S.Undefined),
})

const EmptyOptional = createFlowNodeVariantSchema({
  type: S.optional(S.Literal('empty')),
  data: S.optional(S.Undefined),
})

const EmptyDefault = createFlowEdgeVariantSchema({
  type: keyDefault,
  data: S.optional(S.Undefined),
})

const EmptyUntagged = createFlowEdgeVariantSchema({
  type: S.optional(S.Undefined),
  data: S.optional(S.Undefined),
})

const ServiceDefault = createFlowNodeVariantSchema({
  type: S.Literal('service'),
  data: S.String.pipe(
    S.withDecodingDefaultKey(
      DecodeContext.pipe(Effect.map((service) => service.value))
    )
  ),
})

// Compare against authoritative field schemas under each consumer's existing compiler mode.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

type Assert<T extends true> = T

export type FactoryTypeProofs = [
  Assert<Equal<typeof Optional.fields.type, typeof optionalType>>,
  Assert<Equal<typeof Optional.fields.data, typeof optionalData>>,
  Assert<Equal<typeof Exact.fields.data, typeof exactData>>,
  Assert<Equal<typeof Exact.fields.type, typeof keyDefault>>,
  Assert<Equal<typeof Default.fields.type, typeof valueDefault>>,
  Assert<Equal<typeof Document.DecodingServices, DecodeRequirement>>,
  Assert<Equal<typeof Document.EncodingServices, EncodeRequirement>>,
  Assert<Equal<typeof ServiceDefault.DecodingServices, DecodeRequirement>>,
  Assert<Equal<typeof ServiceDefault.EncodingServices, never>>,
  Assert<Equal<FlowNodeOf<typeof Document>, typeof Nodes.Type>>,
  Assert<Equal<FlowEdgeOf<typeof Document>, typeof Edges.Type>>,
  Assert<
    Equal<(typeof Exact.Type)['data'], (typeof AuthoritativeExact.Type)['data']>
  >,
  Assert<Equal<(typeof Optional.Encoded)['data'], typeof optionalData.Encoded>>,
]

export const checkFactoryTypes = (
  dated: typeof Dated.Type,
  encodedDated: typeof Dated.Encoded,
  weighted: typeof Weighted.Type,
  encodedWeighted: typeof Weighted.Encoded,
  graph: typeof Document.Type,
  exact: typeof Exact.Type,
  optional: typeof Optional.Type,
  empty: typeof Empty.Type
) => {
  const id = S.decodeUnknownSync(NodeIdSchema)('node')
  const edgeId = S.decodeUnknownSync(EdgeIdSchema)('edge')
  const handleId = S.decodeUnknownSync(HandleIdSchema)('handle')
  const decodedDate: Date = dated.data.date
  const encodedDate: string = encodedDated.data.date
  const decodedCounter: Counter = dated.data.counter
  const encodedCounter: number = encodedDated.data.counter

  const ids: typeof Dated.Type = {
    ...dated,
    id,
    handles: [{ id: handleId, kind: 'target', side: 'left' }],
  }

  const edgeIds: typeof Weighted.Type = {
    ...weighted,
    id: edgeId,
    source: id,
    target: id,
  }

  const exactContract: FlowDataContract<typeof Document, IsolationRequirement> =
    contract

  const isolation: FlowIsolation<typeof Document, IsolationRequirement> =
    contract.isolation

  const sameGraph: Effect.Effect<
    typeof Document.Type,
    FlowDocumentIntegrityError
  > = validateFlowGraphDocument(graph)

  Nodes.match(dated, {
    dated: (node) => node.data.date.toISOString(),
    counted: (node) => String(node.data.count),
  })

  const ordinary = (node: typeof OptionalUnion.Type) =>
    node.type === 'dated' ? node.data.counter.read() : node.label

  const optionalAssignment: typeof Optional.Type = {
    ...optional,
    type: undefined,
    data: undefined,
  }

  const exactAssignment: typeof Exact.Type = { ...exact, data: new Date() }

  const encodedExact: typeof Exact.Encoded = {
    id,
    label: '',
    position: { x: 0, y: 0 },
  }

  const encodedDefault: typeof Default.Encoded = {
    id: edgeId,
    source: id,
    target: id,
    type: undefined,
  }

  const made = Constructed.make({
    ...dated,
    type: 'constructed',
    data: undefined,
  })

  const emptyOptional: typeof EmptyOptional.Type = {
    ...dated,
    type: undefined,
    data: undefined,
  }

  const emptyDefault: typeof EmptyDefault.Type = {
    ...weighted,
    type: 'default',
    data: undefined,
  }

  const emptyUntagged: typeof EmptyUntagged.Type = {
    ...weighted,
    type: undefined,
    data: undefined,
  }

  const wrongNodePairInput = {
    ...dated,
    type: S.Literal('counted').make('counted'),
    data: { date: new Date(), counter: new Counter(1), text: '' },
  }

  // @ts-expect-error Explicit node discriminator cannot select another variant's data.
  const wrongNodePair: typeof Nodes.Type = wrongNodePairInput

  const wrongEncodedPairInput = {
    ...encodedDated,
    type: S.Literal('counted').make('counted'),
    data: { date: '', counter: 1, text: '' },
  }

  // @ts-expect-error Encoded node pairs retain correlation.
  const wrongEncodedPair: typeof Nodes.Encoded = wrongEncodedPairInput

  const wrongEdgePairInput = {
    ...weighted,
    type: S.Literal('timed').make('timed'),
    data: { weight: 1 },
  }

  // @ts-expect-error Explicit edge discriminator cannot select timed data.
  const wrongEdgePair: typeof Edges.Type = wrongEdgePairInput

  const wrongEncodedEdgeInput = {
    ...encodedWeighted,
    type: S.Literal('timed').make('timed'),
    data: { weight: 1 },
  }

  // @ts-expect-error Encoded edge pair retains correlation.
  const wrongEncodedEdge: typeof Edges.Encoded = wrongEncodedEdgeInput

  const wrongDateInput = {
    ...dated,
    data: { ...dated.data, date: '' },
  }

  // @ts-expect-error Decoded Date cannot receive its encoded string.
  const wrongDate: typeof Dated.Type = wrongDateInput

  const wrongEncodedDateInput = {
    ...encodedDated,
    data: { ...encodedDated.data, date: new Date() },
  }

  // @ts-expect-error Encoded Date cannot receive a Date instance.
  const wrongEncodedDate: typeof Dated.Encoded = wrongEncodedDateInput

  const wrongCounterInput = {
    ...dated,
    data: { ...dated.data, counter: { read: () => 1 } },
  }

  // @ts-expect-error A plain lookalike lacks Counter private state.
  const wrongCounter: typeof Dated.Type = wrongCounterInput

  const wrongEncodedCounterInput = {
    ...encodedDated,
    data: { ...encodedDated.data, counter: new Counter(1) },
  }

  // @ts-expect-error Encoded Counter is a number, not the private class.
  const wrongEncodedCounter: typeof Dated.Encoded = wrongEncodedCounterInput
  const wrongNodeIdInput = { ...dated, id: 'node' }
  // @ts-expect-error Node IDs retain their schema brand.
  const wrongNodeId: typeof Dated.Type = wrongNodeIdInput
  const wrongEdgeIdInput = { ...weighted, id: 'edge' }
  // @ts-expect-error Edge IDs retain their schema brand.
  const wrongEdgeId: typeof Weighted.Type = wrongEdgeIdInput

  const wrongHandleIdInput = {
    ...weighted,
    sourceHandle: 'handle',
  }

  // @ts-expect-error Handle IDs retain their schema brand.
  const wrongHandleId: typeof Weighted.Type = wrongHandleIdInput

  const missingDataInput = {
    id,
    label: '',
    position: { x: 0, y: 0 },
    type: S.Literal('dated').make('dated'),
  }

  // @ts-expect-error Required node data cannot be omitted.
  const missingData: typeof Dated.Type = missingDataInput

  const missingDefaultInput = {
    id,
    label: '',
    position: { x: 0, y: 0 },
  }

  // @ts-expect-error Default discriminator is required on the decoded side.
  const missingDefault: typeof Exact.Type = missingDefaultInput

  const wrongOptionalInput = {
    ...optional,
    type: S.Literal('foreign').make('foreign'),
  }

  // @ts-expect-error Optional literal still rejects foreign discriminators.
  const wrongOptional: typeof Optional.Type = wrongOptionalInput

  const wrongUntaggedInput = {
    ...dated,
    type: S.Literal('foreign').make('foreign'),
    data: { count: 1 },
  }

  // @ts-expect-error Ordinary union cannot strip foreign discriminator into an untagged branch.
  const wrongUntagged: typeof OptionalUnion.Type = wrongUntaggedInput
  const wrongEmptyInput = { ...empty, data: {} }
  // @ts-expect-error No-data node rejects object data.
  const wrongEmpty: typeof Empty.Type = wrongEmptyInput

  const wrongEmptyOptionalInput = {
    ...emptyOptional,
    data: null,
  }

  // @ts-expect-error Optional no-data node rejects null data.
  const wrongEmptyOptional: typeof EmptyOptional.Type = wrongEmptyOptionalInput

  const wrongEmptyDefaultInput = {
    ...emptyDefault,
    data: {},
  }

  // @ts-expect-error Default no-data edge rejects object data.
  const wrongEmptyDefault: typeof EmptyDefault.Type = wrongEmptyDefaultInput

  const wrongEmptyUntaggedInput = {
    ...emptyUntagged,
    data: '',
  }

  // @ts-expect-error Untagged no-data edge rejects string data.
  const wrongEmptyUntagged: typeof EmptyUntagged.Type = wrongEmptyUntaggedInput
  const wrongExactDataInput = { ...exact, data: '' }
  // @ts-expect-error Exact optional data remains Date when supplied in both compiler modes.
  const wrongExactData: typeof Exact.Type = wrongExactDataInput
  const missingService0 = S.decodeUnknownEffect(contract.document)({})
  // @ts-expect-error Decoder service cannot disappear at the run boundary.
  Effect.runPromise(missingService0)

  const missingService1 = S.decodeUnknownEffect(contract.document)({}).pipe(
    Effect.provideService(EncodeContext, { value: '' })
  )

  // @ts-expect-error Supplying only the encoder service leaves decoder service unsatisfied.
  Effect.runPromise(missingService1)
  const missingService2 = S.encodeUnknownEffect(contract.document)(graph)
  // @ts-expect-error Encoder service cannot disappear at the run boundary.
  Effect.runPromise(missingService2)

  const missingService3 = S.encodeUnknownEffect(contract.document)(graph).pipe(
    Effect.provideService(DecodeContext, { value: '' })
  )

  // @ts-expect-error Supplying only the decoder service leaves encoder service unsatisfied.
  Effect.runPromise(missingService3)
  const missingService4 = contract.isolation.detach(graph)
  // @ts-expect-error Detach independently retains its isolation service.
  Effect.runPromise(missingService4)

  const missingService5 = contract.isolation
    .detach(graph)
    .pipe(Effect.provideService(DecodeContext, { value: '' }))

  // @ts-expect-error Supplying decoder service cannot satisfy isolation.
  Effect.runPromise(missingService5)
  const missingService6 = S.decodeUnknownEffect(ServiceDefault)({})
  // @ts-expect-error Serviceful default preserves its decoding environment.
  Effect.runPromise(missingService6)
  Effect.runPromise(
    S.decodeUnknownEffect(contract.document)({}).pipe(
      Effect.provideService(DecodeContext, { value: '' })
    )
  )
  Effect.runPromise(
    S.encodeUnknownEffect(contract.document)(graph).pipe(
      Effect.provideService(EncodeContext, { value: '' })
    )
  )
  Effect.runPromise(
    contract.isolation
      .detach(graph)
      .pipe(Effect.provideService(IsolationContext, { value: true }))
  )
  Effect.runPromise(S.decodeUnknownEffect(S.toType(contract.document))(graph))

  const failure = FlowTypedFailureSchema.members[0].make({
    operation: 'validate-decoded',
    message: 'x',
  })

  const wrongFailureInput = {
    ...failure,
    operation: S.Literal('render').make('render'),
  }

  // @ts-expect-error Failure operations retain their four literals.
  const wrongFailure: FlowTypedFailure = wrongFailureInput
  void [
    decodedDate,
    encodedDate,
    decodedCounter,
    encodedCounter,
    ids,
    edgeIds,
    exactContract,
    isolation,
    sameGraph,
    ordinary,
    optionalAssignment,
    exactAssignment,
    encodedExact,
    encodedDefault,
    made,
    emptyOptional,
    emptyDefault,
    emptyUntagged,
    wrongNodePair,
    wrongEncodedPair,
    wrongEdgePair,
    wrongEncodedEdge,
    wrongDate,
    wrongEncodedDate,
    wrongCounter,
    wrongEncodedCounter,
    wrongNodeId,
    wrongEdgeId,
    wrongHandleId,
    missingData,
    missingDefault,
    wrongOptional,
    wrongUntagged,
    wrongEmpty,
    wrongEmptyOptional,
    wrongEmptyDefault,
    wrongEmptyUntagged,
    wrongExactData,
    failure,
    wrongFailure,
  ]
}

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
      IsolationContext.pipe(Effect.map(() => value)),
  },
})

export type WholeDocumentProofs = [
  Assert<Equal<typeof whole.document, typeof Whole>>,
  Assert<Equal<typeof Whole.DecodingServices, DecodeRequirement>>,
  Assert<Equal<typeof Whole.EncodingServices, EncodeRequirement>>,
  Assert<Equal<FlowNodeOf<typeof Whole>, typeof Nodes.Type>>,
  Assert<Equal<FlowEdgeOf<typeof Whole>, typeof Edges.Type>>,
  Assert<
    Equal<typeof whole, FlowDataContract<typeof Whole, IsolationRequirement>>
  >,
]
