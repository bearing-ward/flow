import {
  createFlowDataDocumentSchema,
  createFlowNodeVariantSchema,
  createFlowEdgeVariantSchema,
  defineFlowDataContract,
  makeTypedFlow,
  FlowTypedFailureSchema,
  FlowTypedCheckpointSchema,
  ViewportSchema,
} from '@flow/core'
import type { FlowTypedError, FlowTypedFailure } from '@flow/core'
import {
  Cause,
  Context,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Option,
  Schema as S,
  SchemaGetter as G,
  Scope,
  Struct,
} from 'effect'

let assertions = 0

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message)
  }

  assertions += 1
}

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- Assertion comparison accepts arbitrary actual/expected runtime receipts; it does not establish a product contract.
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- Assertion comparison accepts arbitrary actual/expected runtime receipts; it does not establish a product contract.
const equal = (actual: unknown, expected: unknown, message: string) =>
  assert(JSON.stringify(actual) === JSON.stringify(expected), message)

const failure = <A>(exit: Exit.Exit<A, FlowTypedError>): FlowTypedError => {
  if (Exit.isSuccess(exit)) {
    throw new Error('Expected typed actor rejection')
  }

  const error = Cause.findErrorOption(exit.cause)

  if (Option.isNone(error)) {
    throw new Error('Expected typed failure, received defect/interruption')
  }

  return error.value
}

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

const RD = Context.Service<
  '089/runtime/RD',
  { readonly name: string; readonly calls: string[] }
>('089/runtime/RD')

const RE = Context.Service<
  '089/runtime/RE',
  { readonly name: string; readonly calls: string[] }
>('089/runtime/RE')

const RI = Context.Service<
  '089/runtime/RI',
  { readonly name: string; readonly calls: string[] }
>('089/runtime/RI')

const RC = Context.Service<
  '089/runtime/RC',
  { readonly name: string; readonly calls: string[] }
>('089/runtime/RC')

const RU = Context.Service<
  '089/runtime/RU',
  { readonly name: string; readonly calls: string[] }
>('089/runtime/RU')

const RL = Context.Service<
  '089/runtime/RL',
  { readonly name: string; readonly calls: string[] }
>('089/runtime/RL')

const date = S.String.pipe(
  S.decodeTo(S.Date, {
    decode: G.transform((value) => new Date(value)),
    encode: G.transform((value) => value.toISOString()),
  })
)

const counter = S.Number.pipe(
  S.decodeTo(S.instanceOf(Counter), {
    decode: G.transform((value) => new Counter(value)),
    encode: G.transformEffect((value) =>
      RE.pipe(
        Effect.map((service) => {
          service.calls.push(service.name)

          return value.read()
        })
      )
    ),
  })
)

const text = S.String.pipe(
  S.decodeTo(S.String, {
    decode: G.transformEffect((value) =>
      RD.pipe(
        Effect.map((service) => {
          service.calls.push(service.name)

          return `${service.name}:${value}`
        })
      )
    ),
    encode: G.transform((value) => value.slice(value.indexOf(':') + 1)),
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

const Edge = createFlowEdgeVariantSchema({
  type: S.Literal('weighted'),
  data: S.Struct({ weight: S.Number }),
})

const PureDocument = createFlowDataDocumentSchema({
  nodes: Counted,
  edges: Edge,
})

const yieldExit = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runSync(Effect.exit(effect))

const Base = createFlowDataDocumentSchema({
  nodes: S.Union([Dated, Counted, Optional, NoData]),
  edges: Edge,
})

const Document = S.Struct({ ...Base.fields, metadata: S.String })

const clone = (value: typeof Document.Type): typeof Document.Type => ({
  ...structuredClone(Struct.omit(value, ['nodes'])),
  nodes: value.nodes.map((node) =>
    node.type === 'dated'
      ? {
          ...structuredClone(Struct.omit(node, ['data'])),
          data: {
            date: new Date(node.data.date),
            counter: new Counter(node.data.counter.read()),
            text: node.data.text,
          },
        }
      : structuredClone(node)
  ),
})

const contract = defineFlowDataContract({
  id: '089-installed-actor',
  document: Document,
  isolation: {
    detach: (value: typeof Document.Type) =>
      RI.pipe(
        Effect.map((service) => {
          service.calls.push(service.name)

          return clone(value)
        })
      ),
  },
})

const raw = {
  metadata: 'whole-document',
  nodeOrigin: [0.25, -0.5],
  nodes: [
    {
      id: 'dated',
      label: 'Date',
      position: { x: 1, y: 2 },
      type: 'dated',
      data: { date: '2026-10-02T00:00:00.000Z', counter: 4, text: 'data' },
    },
    {
      id: 'counted',
      label: 'Count',
      position: { x: 2, y: 3 },
      type: 'counted',
      data: { count: 3 },
    },
    { id: 'optional', label: 'Optional', position: { x: 3, y: 4 } },
  ],
  edges: [
    {
      id: 'weighted',
      source: 'dated',
      target: 'counted',
      type: 'weighted',
      data: { weight: 2 },
    },
  ],
}

const viewport = { x: -2, y: 0, zoom: 0.5 }

const dated = (value: typeof Document.Type) => {
  const node = value.nodes.find((entry) => entry.type === 'dated')

  if (!node || node.type !== 'dated') {
    throw new Error('Missing decoded dated node')
  }

  return node
}

const calls = {
  rd: new Array<string>(),
  re: new Array<string>(),
  ri: new Array<string>(),
  rc: new Array<string>(),
  ru: new Array<string>(),
  rl: new Array<string>(),
}

const provide = <A, E, R>(effect: Effect.Effect<A, E, R>, name: string) =>
  effect.pipe(
    Effect.provideService(RD, { name, calls: calls.rd }),
    Effect.provideService(RE, { name, calls: calls.re }),
    Effect.provideService(RI, { name, calls: calls.ri })
  )

await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* runWorkflow1() {
      const owner = yield* Scope.make()

      const flow = yield* provide(
        makeTypedFlow({
          contract,
          viewport,
          initial: { kind: 'encoded', input: raw },
          encodedInputCapture: {
            capture: (input) =>
              RC.pipe(
                Effect.map((service) => {
                  service.calls.push(service.name)

                  return structuredClone(input)
                })
              ),
          },
        }),
        'A'
      ).pipe(
        Effect.provideService(RC, { name: 'A', calls: calls.rc }),
        Scope.provide(owner)
      )

      const first = yield* provide(flow.readSnapshot(), 'B')
      equal(first.revision, 0, 'initial revision')
      equal(first.viewport, viewport, 'finite detached viewport')
      equal(first.document.metadata, 'whole-document', 'metadata preserved')
      equal(first.document.nodeOrigin, [0.25, -0.5], 'origin preserved')
      assert(dated(first.document).data.date instanceof Date, 'decoded Date')
      assert(
        dated(first.document).data.counter instanceof Counter,
        'private Counter'
      )
      equal(
        dated(first.document).data.counter.read(),
        4,
        'initial private value'
      )
      dated(first.document).data.counter.increment()
      dated(first.document).data.date.setTime(0)
      const second = yield* provide(flow.readSnapshot(), 'B')
      equal(dated(second.document).data.counter.read(), 4, 'read independence')
      equal(
        dated(second.document).data.date.toISOString(),
        '2026-10-02T00:00:00.000Z',
        'Date independence'
      )
      assert(
        dated(first.document).data.counter !==
          dated(second.document).data.counter,
        'separate class instances'
      )
      equal(
        (yield* provide(flow.readNodes(), 'B')).length,
        3,
        'typed node read'
      )
      equal(
        yield* provide(flow.readEdges(), 'B'),
        raw.edges,
        'typed edge read preserves payload'
      )
      equal(
        (yield* provide(
          flow.readEdge(Edge.fields.id.make('weighted')),
          'B'
        )).pipe(Option.map((edge) => edge.data.weight)),
        Option.some(2),
        'branded typed edge lookup preserves correlated data'
      )
      equal(
        Option.isSome(
          yield* provide(flow.readNode(Dated.fields.id.make('dated')), 'B')
        ),
        true,
        'branded existing node lookup'
      )
      equal(
        Option.isNone(
          yield* provide(flow.readEdge(Edge.fields.id.make('absent')), 'B')
        ),
        true,
        'missing edge Option.none'
      )
      equal(
        yield* provide(
          flow.readSelected((snapshot) => snapshot.document.metadata),
          'B'
        ),
        'whole-document',
        'selector exact payload'
      )
      const listenerInitial = yield* Deferred.make<undefined>()
      const listenerTwo = yield* Deferred.make<undefined>()
      const observations: number[] = []

      const observer = yield* Effect.forkScoped(
        provide(
          flow.observe((snapshot) =>
            RL.pipe(
              Effect.flatMap((service) =>
                Effect.gen(function* runObserver() {
                  service.calls.push(service.name)
                  observations.push(snapshot.revision)

                  if (snapshot.revision === 0) {
                    // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                    yield* Deferred.succeed(listenerInitial, undefined)
                  }

                  if (snapshot.revision === 2) {
                    // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                    yield* Deferred.succeed(listenerTwo, undefined)
                  }
                })
              )
            )
          ),
          'B'
        ).pipe(
          Effect.provideService(RL, { name: 'listener-B', calls: calls.rl })
        )
      )

      yield* Deferred.await(listenerInitial)
      equal(
        yield* provide(flow.replaceEncoded(raw, 0), 'B').pipe(
          Effect.provideService(RC, { name: 'capture-B', calls: calls.rc })
        ),
        { revision: 1, changed: true },
        'encoded replace'
      )
      equal(
        dated((yield* provide(flow.readSnapshot(), 'B')).document).data.text,
        'B:data',
        'per-operation decoder B'
      )
      equal(
        yield* provide(
          flow.updateDecoded((snapshot) =>
            RU.pipe(
              Effect.map((service) => {
                service.calls.push(service.name)

                return snapshot.document
              })
            )
          ),
          'B'
        ).pipe(
          Effect.provideService(RU, { name: 'updater-B', calls: calls.ru })
        ),
        { revision: 2, changed: true },
        'updater with later service'
      )
      yield* Deferred.await(listenerTwo)
      equal(observations, [0, 1, 2], 'ordered initial and accepted revisions')
      yield* Fiber.interrupt(observer)
      const encoded = yield* provide(flow.encodeDocument(), 'B')
      equal(
        encoded,
        {
          nodeOrigin: raw.nodeOrigin,
          nodes: raw.nodes,
          edges: raw.edges,
          metadata: raw.metadata,
        },
        'explicit encoded values preserve full graph'
      )

      const stale = yield* provide(
        Effect.exit(flow.replaceEncoded(raw, 0)),
        'B'
      ).pipe(Effect.provideService(RC, { name: 'unused', calls: calls.rc }))

      equal(
        failure(stale),
        FlowTypedFailureSchema.members[3].make({ expected: 0, actual: 2 }),
        'exact conflict'
      )
      equal(calls.rc, ['A', 'capture-B'], 'stale call executes zero capture')
      let callbacks = 0

      const nested = yield* provide(
        Effect.exit(
          flow.updateDecoded((snapshot) =>
            Effect.gen(function* runNested() {
              callbacks += 1
              yield* flow
                .replaceDecoded(snapshot.document, snapshot.revision)
                .pipe(
                  Effect.mapError((): FlowTypedFailure =>
                    FlowTypedFailureSchema.members[1].make({
                      message: 'Nested write failed',
                    })
                  )
                )

              return snapshot.document
            })
          )
        ),
        'B'
      )

      equal(
        failure(nested),
        FlowTypedFailureSchema.members[3].make({ expected: 2, actual: 3 }),
        'awaited nested write completes then outer conflicts'
      )
      equal(callbacks, 1, 'no callback replay')
      const prior = yield* provide(flow.readSnapshot(), 'B')
      const invalid = { ...raw, nodes: [...raw.nodes, raw.nodes[0]] }

      const invalidResult = yield* provide(
        Effect.exit(flow.replaceEncoded(invalid, 3)),
        'B'
      ).pipe(Effect.provideService(RC, { name: 'invalid', calls: calls.rc }))

      equal(
        failure(invalidResult)._tag,
        'DuplicateNodeId',
        'actual generic integrity error'
      )
      equal(
        (yield* provide(flow.readSnapshot(), 'B')).revision,
        prior.revision,
        'failed integrity preserves revision'
      )
      yield* Scope.close(owner, Exit.void)
      equal(
        failure(yield* provide(Effect.exit(flow.readSnapshot()), 'B')),
        FlowTypedFailureSchema.members[2].make({}),
        'disposed read'
      )
      equal(
        failure(
          yield* provide(
            Effect.exit(flow.replaceDecoded(prior.document, 3)),
            'B'
          )
        ),
        FlowTypedFailureSchema.members[2].make({}),
        'disposed write'
      )
      assert(
        calls.rd.includes('B') &&
          calls.re.includes('B') &&
          calls.ri.includes('B'),
        'later RD RE RI actually used'
      )
      equal(calls.ru, ['updater-B'], 'late updater Context')
      equal(
        calls.rl,
        ['listener-B', 'listener-B', 'listener-B'],
        'late observer Context'
      )
    })
  )
)

await Promise.all(
  ['x', 'y'].flatMap((axis) =>
    [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].map(
      async (value) => {
        const invalidViewport = { x: 0, y: 0, zoom: 1, [axis]: value }
        assert(
          Exit.isSuccess(
            yieldExit(S.decodeUnknownEffect(ViewportSchema)(invalidViewport))
          ),
          'unchanged concrete viewport accepts Number control'
        )
        assert(
          Exit.isFailure(
            await Effect.runPromiseExit(
              S.decodeUnknownEffect(FlowTypedCheckpointSchema)({
                contractId: 'finite',
                revision: 0,
                document: {},
                viewport: invalidViewport,
              })
            )
          ),
          'exported checkpoint rejects nonfinite coordinate'
        )
        let stages = 0
        let isolates = 0

        const plain = defineFlowDataContract({
          id: 'finite',
          document: PureDocument,
          isolation: {
            detach: (input: typeof PureDocument.Type) =>
              Effect.sync(() => {
                isolates += 1

                return structuredClone(input)
              }),
          },
        })

        const rejected = await Effect.runPromiseExit(
          Effect.scoped(
            makeTypedFlow({
              contract: plain,
              viewport: invalidViewport,
              initial: { kind: 'decoded', input: { nodes: [], edges: [] } },
              checkpointGate: {
                stage: () =>
                  Effect.sync(() => {
                    stages += 1

                    return {
                      isCurrent: () => true,
                      abort: Effect.void,
                      accepted: Effect.void,
                    }
                  }),
              },
            })
          )
        )

        equal(
          failure(rejected),
          FlowTypedFailureSchema.members[0].make({
            operation: 'encode',
            message: `Checkpoint viewport.${axis} must be finite`,
          }),
          'actual finite initialization error'
        )
        equal(
          [isolates, stages],
          [0, 0],
          'viewport rejects before document/stage hooks'
        )
      }
    )
  )
)

console.log(
  JSON.stringify({
    typedActorRuntimeAssertions: assertions,
    expectedCompilerNegativeCases: 20,
    actorBoundary: 'actual installed @flow/core scoped actor',
    nativeTypedIntegration: false,
  })
)
