import {
  createFlowDataDocumentSchema,
  createFlowNodeVariantSchema,
  createFlowEdgeVariantSchema,
  createFlowTypedSnapshotSchema,
  defineFlowDataContract,
  makeTypedFlow,
} from '@flow/core'
import type {
  FlowGraphCodec,
  FlowTypedError,
  FlowTypedSnapshot,
  TypedFlow,
} from '@flow/core'
import type { Scope } from 'effect'
import { Context, Effect, Schema as S, SchemaGetter as G } from 'effect'

class Counter {
  #value: number
  constructor(value: number) {
    this.#value = value
  }
  read() {
    return this.#value
  }
}

const RD = Context.Service<'089/packed/RD', { readonly name: string }>(
  '089/packed/RD'
)

const RE = Context.Service<'089/packed/RE', { readonly name: string }>(
  '089/packed/RE'
)

const RI = Context.Service<'089/packed/RI', { readonly clone: boolean }>(
  '089/packed/RI'
)

const RC = Context.Service<'089/packed/RC', { readonly clone: boolean }>(
  '089/packed/RC'
)

const RU = Context.Service<'089/packed/RU', { readonly value: number }>(
  '089/packed/RU'
)

const RL = Context.Service<'089/packed/RL', { readonly value: number }>(
  '089/packed/RL'
)

const date = S.String.pipe(
  S.decodeTo(S.Date, {
    decode: G.transform((value) => new Date(value)),
    encode: G.transform((value) => value.toISOString()),
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
      RD.pipe(Effect.map((service) => service.name + value))
    ),
    encode: G.transformEffect((value) =>
      RE.pipe(Effect.map((service) => value.slice(service.name.length)))
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

const Optional = createFlowNodeVariantSchema({
  type: S.optional(S.Literal('optional')),
  data: S.optionalKey(S.Number),
})

const NoData = createFlowNodeVariantSchema({
  type: S.optional(S.Undefined),
  data: S.optional(S.Undefined),
})

const Weighted = createFlowEdgeVariantSchema({
  type: S.Literal('weighted'),
  data: S.Struct({ weight: S.Number }),
})

const Named = createFlowEdgeVariantSchema({
  type: S.Literal('named'),
  data: S.Struct({ name: S.String }),
})

const Base = createFlowDataDocumentSchema({
  nodes: S.Union([Dated, Counted, Optional, NoData]),
  edges: S.Union([Weighted, Named]),
})

const Document = S.Struct({ ...Base.fields, metadata: S.String })

const PureDocument = createFlowDataDocumentSchema({
  nodes: Counted,
  edges: Weighted,
})

const nodeId = Dated.fields.id.make('dated')

const edgeId = Weighted.fields.id.make('weighted')

const source = Counted.fields.id.make('source')

const target = Counted.fields.id.make('target')

const validNode: (typeof Document.Type.nodes)[number] = {
  id: nodeId,
  type: 'dated',
  label: '',
  position: { x: 0, y: 0 },
  data: { date: new Date(0), counter: new Counter(1), text: 'text' },
}

const validEncodedNode: (typeof Document.Encoded.nodes)[number] = {
  id: nodeId,
  type: 'dated',
  label: '',
  position: { x: 0, y: 0 },
  data: { date: '1970-01-01T00:00:00.000Z', counter: 1, text: 'text' },
}

const validEdge: (typeof Document.Type.edges)[number] = {
  id: edgeId,
  source,
  target,
  type: 'weighted',
  data: { weight: 2 },
}

const decoded: typeof Document.Type = {
  nodes: [validNode],
  edges: [],
  metadata: 'whole',
}

const encoded: typeof Document.Encoded = {
  nodes: [validEncodedNode],
  edges: [],
  metadata: 'whole',
}

const optionalNode: (typeof Document.Type.nodes)[number] = {
  id: nodeId,
  label: '',
  position: { x: 0, y: 0 },
  type: 'optional',
}

const noDataNode: (typeof Document.Type.nodes)[number] = {
  id: nodeId,
  label: '',
  position: { x: 0, y: 0 },
  type: undefined,
  data: undefined,
}

const contract = defineFlowDataContract({
  id: 'compile',
  document: Document,
  isolation: {
    detach: (value: typeof Document.Type) => RI.pipe(Effect.as(value)),
  },
})

const viewport = { x: 0, y: 0, zoom: 1 }

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the encoded-input/descriptor validation boundary; arbitrary caller values must be captured before Schema runs.
const capture = { capture: (input: unknown) => RC.pipe(Effect.as(input)) }

const decodedCreation = makeTypedFlow({
  contract,
  initial: { kind: 'decoded', input: decoded },
  viewport,
  encodedInputCapture: capture,
})

const encodedCreation = makeTypedFlow({
  contract,
  initial: { kind: 'encoded', input: encoded },
  viewport,
  encodedInputCapture: capture,
})

type Same<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

export const decodedConstructorServices: Same<
  Effect.Services<typeof decodedCreation>,
  '089/packed/RE' | '089/packed/RI' | Scope.Scope
> = true

export const encodedConstructorServices: Same<
  Effect.Services<typeof encodedCreation>,
  | '089/packed/RD'
  | '089/packed/RE'
  | '089/packed/RI'
  | '089/packed/RC'
  | Scope.Scope
> = true

export const dynamicCreation = (
  initial:
    | { readonly kind: 'decoded'; readonly input: typeof Document.Type }
    | { readonly kind: 'encoded'; readonly input: unknown }
) => {
  const value = makeTypedFlow({
    contract,
    initial,
    viewport,
    encodedInputCapture: capture,
  })

  const services: Same<
    Effect.Services<typeof value>,
    | '089/packed/RD'
    | '089/packed/RE'
    | '089/packed/RI'
    | '089/packed/RC'
    | Scope.Scope
  > = true

  return { value, services }
}

export const genericSnapshot = <C extends FlowGraphCodec>(
  document: C,
  value: C['Type']
) => {
  const schema = createFlowTypedSnapshotSchema(document)

  const snapshot: FlowTypedSnapshot<C> = {
    document: value,
    revision: 0,
    viewport,
  }

  const encodedSnapshot: typeof schema.Encoded = snapshot
  const extracted: C['Type'] = encodedSnapshot.document
  const required: 'required' = schema.fields.document['~type.optionality']
  const readonly: 'readonly' = schema.fields.document['~type.mutability']

  return { snapshot, extracted, required, readonly }
}

const Snapshot = createFlowTypedSnapshotSchema(S.optionalKey(Document))

export const decodedSnapshot: typeof Snapshot.Type = {
  revision: 0,
  document: decoded,
  viewport,
}

export const encodedSnapshot: typeof Snapshot.Encoded = decodedSnapshot

export const exactSnapshotDocument: Same<
  typeof Snapshot.Type.document,
  typeof Document.Type
> = true

export const exactEncodedSnapshotDocument: Same<
  typeof Snapshot.Encoded.document,
  typeof Document.Type
> = true

export const snapshotDecodingServices: Same<
  typeof Snapshot.DecodingServices,
  never
> = true

export const snapshotEncodingServices: Same<
  typeof Snapshot.EncodingServices,
  never
> = true

export const wrongNode: (typeof Document.Type.nodes)[number] = {
  ...validNode,
  type: 'dated',
  // N01 correlated node discriminator/data rejection; branded ID setup above is valid.
  // @ts-expect-error dated nodes cannot carry counted data
  data: { count: 1 },
}

export const wrongEdge: (typeof Document.Type.edges)[number] = {
  ...validEdge,
  type: 'weighted',
  // N02 correlated edge discriminator/data rejection.
  // @ts-expect-error weighted edges cannot carry named data
  data: { name: 'wrong' },
}

export const wrongDecodedDate: typeof Dated.Type = {
  ...validNode,
  type: 'dated',
  // N03 decoded Date must be Date, with every other field valid.
  // @ts-expect-error decoded Date cannot be its encoded string
  data: { date: '1970-01-01', counter: new Counter(1), text: 'text' },
}

export const wrongEncodedDate: typeof Dated.Encoded = {
  ...validEncodedNode,
  type: 'dated',
  // N04 a typed encoded value must use encoded string Date and numeric Counter.
  // @ts-expect-error document Encoded Date cannot use decoded Date
  data: { date: new Date(0), counter: 1, text: 'text' },
}

export const negatives = (
  flow: TypedFlow<typeof Document, '089/packed/RI', '089/packed/RC'>,
  pureCaptureFlow: TypedFlow<typeof PureDocument, never, '089/packed/RC'>,
  isolationOnlyFlow: TypedFlow<typeof PureDocument, '089/packed/RI'>
) => {
  // N05 lookup requires the branded node ID.
  // @ts-expect-error unbranded NodeId
  flow.readNode('dated')
  // N06 lookup requires the branded edge ID.
  // @ts-expect-error unbranded EdgeId
  flow.readEdge('weighted')
  const read = flow.readSnapshot()
  const replaced = flow.replaceEncoded(encoded, 0)

  const update = flow.updateDecoded((snapshot) =>
    RU.pipe(Effect.as(snapshot.document))
  )

  const observer = flow.observe(() => RL.pipe(Effect.asVoid))
  const save = flow.encodeDocument()
  const readServices: Same<Effect.Services<typeof read>, '089/packed/RI'> = true

  const replaceServices: Same<
    Effect.Services<typeof replaced>,
    '089/packed/RD' | '089/packed/RE' | '089/packed/RI' | '089/packed/RC'
  > = true

  const updateServices: Same<
    Effect.Services<typeof update>,
    '089/packed/RE' | '089/packed/RI' | '089/packed/RU'
  > = true

  const observeServices: Same<
    Effect.Services<typeof observer>,
    '089/packed/RI' | '089/packed/RL' | Scope.Scope
  > = true

  const saveServices: Same<
    Effect.Services<typeof save>,
    '089/packed/RE' | '089/packed/RI'
  > = true

  const exactError: Same<Effect.Error<typeof read>, FlowTypedError> = true
  // Positive controls supply exactly the capabilities omitted below.
  Effect.runPromise(read.pipe(Effect.provideService(RI, { clone: true })))
  Effect.runPromise(
    replaced.pipe(
      Effect.provideService(RD, { name: '' }),
      Effect.provideService(RE, { name: '' }),
      Effect.provideService(RI, { clone: true }),
      Effect.provideService(RC, { clone: true })
    )
  )
  Effect.runPromise(
    update.pipe(
      Effect.provideService(RE, { name: '' }),
      Effect.provideService(RI, { clone: true }),
      Effect.provideService(RU, { value: 1 })
    )
  )
  Effect.runPromise(
    Effect.scoped(
      observer.pipe(
        Effect.provideService(RI, { clone: true }),
        Effect.provideService(RL, { value: 1 })
      )
    )
  )
  Effect.runPromise(
    save.pipe(
      Effect.provideService(RE, { name: '' }),
      Effect.provideService(RI, { clone: true })
    )
  )
  Effect.runPromise(pureCaptureFlow.readSnapshot())
  Effect.runPromise(
    pureCaptureFlow
      .replaceEncoded({}, 0)
      .pipe(Effect.provideService(RC, { clone: true }))
  )
  Effect.runPromise(
    isolationOnlyFlow
      .encodeDocument()
      .pipe(Effect.provideService(RI, { clone: true }))
  )
  // N07 reads retain RI.
  // @ts-expect-error RI is missing
  Effect.runPromise(read)
  Effect.runPromise(
    // N08 encoded replacement retains RD even when all other services are supplied.
    // @ts-expect-error RD is missing
    replaced.pipe(
      Effect.provideService(RE, { name: '' }),
      Effect.provideService(RI, { clone: true }),
      Effect.provideService(RC, { clone: true })
    )
  )
  Effect.runPromise(
    // N09 decoded replacement still requires RE.
    // @ts-expect-error RE is missing
    flow
      .replaceDecoded(decoded, 0)
      .pipe(Effect.provideService(RI, { clone: true }))
  )
  // N10 independent encoded RC is retained even with RI=never.
  // @ts-expect-error RC is missing
  Effect.runPromise(pureCaptureFlow.replaceEncoded({}, 0))
  Effect.runPromise(
    // N11 updater service is introduced at call time.
    // @ts-expect-error RU is missing
    update.pipe(
      Effect.provideService(RE, { name: '' }),
      Effect.provideService(RI, { clone: true })
    )
  )
  Effect.runPromise(
    // N12 observer service is introduced at registration time.
    // @ts-expect-error RL is missing
    Effect.scoped(observer.pipe(Effect.provideService(RI, { clone: true })))
  )
  Effect.runPromise(
    // N13 observe is scoped even with listener and isolation supplied.
    // @ts-expect-error Scope is missing
    observer.pipe(
      Effect.provideService(RI, { clone: true }),
      Effect.provideService(RL, { value: 1 })
    )
  )
  // N14 document encoding requires RE.
  // @ts-expect-error RE is missing
  Effect.runPromise(save.pipe(Effect.provideService(RI, { clone: true })))
  // N15 document encoding requires RI independently when RE=never.
  // @ts-expect-error RI is missing
  Effect.runPromise(isolationOnlyFlow.encodeDocument())
  flow.updateDecoded((snapshot) =>
    // N16 updater cannot return a wrong typed node variant.
    // @ts-expect-error invalid typed document returned by updater
    Effect.succeed({
      ...snapshot.document,
      nodes: [
        {
          ...validNode,
          type: Dated.fields.type.make('dated'),
          data: { count: 1 },
        },
      ],
    })
  )
  // N17 selected payload inference remains exact.
  // @ts-expect-error selected whole-document string metadata is not a numeric payload

  const wrongSelected: Effect.Effect<number, FlowTypedError, '089/packed/RI'> =
    flow.readSelected((snapshot) => snapshot.document.metadata)

  return {
    readServices,
    replaceServices,
    updateServices,
    observeServices,
    saveServices,
    exactError,
    wrongSelected,
  }
}

export const wrongNoData: typeof NoData.Type = {
  ...noDataNode,
  type: undefined,
  // N18 optional/no-data branch still rejects unrelated data.
  // @ts-expect-error own undefined discriminator cannot carry string data
  data: 'wrong',
}

// N19 snapshot is required even when its input C is optionalKey.
// @ts-expect-error document is required
export const missingSnapshotDocument: typeof Snapshot.Type = {
  revision: 0,
  viewport,
}

export const encodedGraphInSnapshot: typeof Snapshot.Encoded = {
  revision: 0,
  // N20 snapshot encoding carries decoded Date, not the original encoded graph.
  // @ts-expect-error encoded document graph is not a decoded snapshot document
  document: encoded,
  viewport,
}

export const validOptionalAndNoData = { optionalNode, noDataNode }
