// oxlint-disable-next-line eslint/max-classes-per-file -- Distinct decoded and encoded private-slot class fixtures prove both ownership capabilities through public operations.
import {
  Cause,
  Context,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Option,
  Match,
  Logger,
  Result,
  Schema as S,
  SchemaGetter as G,
  SchemaIssue,
  SchemaTransformation as ST,
  Scope,
  Struct,
} from 'effect'
import { describe, expect, it } from 'vitest'

import {
  makeTypedFlow,
  FlowTypedFailureSchema,
  validateFlowGraphDocument,
  defineFlowDataContract,
  createFlowNodeVariantSchema,
  createFlowEdgeVariantSchema,
  createFlowDataDocumentSchema,
} from '../public.ts'
import type {
  FlowGraphCodec,
  FlowTypedError,
  FlowTypedFailure,
  FlowTypedSnapshot,
} from '../public.ts'
import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { ViewportSchema } from './flow-runtime.schema.ts'
import {
  FlowTypedCheckpointSchema,
  createFlowTypedSnapshotSchema,
} from './flow-typed-actor.schema.ts'
import { FlowDocumentSchema } from './flow.schema.ts'

const SnapshotSchema = createFlowTypedSnapshotSchema(FlowDocumentSchema)

const document: typeof FlowDocumentSchema.Type = { nodes: [], edges: [] }

const exactDocument: typeof FlowDocumentSchema.Type = S.decodeUnknownSync(
  SnapshotSchema
)({ revision: 0, document, viewport: { x: 0, y: 0, zoom: 1 } }).document

describe('typed actor checkpoint contract', () => {
  it('retains the exact authoritative snapshot document type', () => {
    expect(exactDocument).toStrictEqual(document)
  })

  it.each(
    ['x', 'y'].flatMap((axis) =>
      [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].map(
        (value) => ({ axis, value })
      )
    )
  )(
    'rejects nonfinite checkpoint $axis=$value while concrete viewport remains unchanged',
    async ({ axis, value }) => {
      const viewport = { x: 0, y: 0, zoom: 1, [axis]: value }
      expect(S.decodeUnknownSync(ViewportSchema)(viewport)).toStrictEqual(
        viewport
      )

      const exit = await Effect.runPromiseExit(
        S.decodeUnknownEffect(FlowTypedCheckpointSchema)({
          contractId: 'test',
          revision: 0,
          document,
          viewport,
        })
      )

      expect(Exit.isFailure(exit)).toBeTruthy()
    }
  )

  it('accepts finite negative and zero coordinates', () => {
    expect(
      S.decodeUnknownSync(FlowTypedCheckpointSchema)({
        contractId: 'test',
        revision: 0,
        document,
        viewport: { x: -2, y: 0, zoom: 0.5 },
      }).viewport
    ).toStrictEqual({ x: -2, y: 0, zoom: 0.5 })
  })
})

// The actor tests below execute public operations against actual scoped owners.

export const constructGenericSnapshot = <C extends FlowGraphCodec>(
  inputDocument: C['Type']
): FlowTypedSnapshot<C> => ({
  revision: 0,
  document: inputDocument,
  viewport: { x: 0, y: 0, zoom: 1 },
})

export const genericSnapshotDocument = <C extends FlowGraphCodec>(
  snapshot: FlowTypedSnapshot<C>
): C['Type'] => snapshot.document

const contract = defineFlowDataContract({
  id: 'actor-unit',
  document: FlowDocumentSchema,
  isolation: {
    detach: (value: typeof FlowDocumentSchema.Type) =>
      Effect.sync(() => structuredClone(value)),
  },
})

const viewport = { x: 0, y: 0, zoom: 1 }

const failureOf = <A>(exit: Exit.Exit<A, FlowTypedError>) =>
  Exit.isFailure(exit) ? Cause.findErrorOption(exit.cause) : Option.none()

const emptyActor = () =>
  makeTypedFlow({
    contract,
    viewport,
    initial: { kind: 'decoded', input: document },
  })

const yieldSnapshot = <C extends FlowGraphCodec>(
  graph: ReturnType<typeof createFlowTypedSnapshotSchema<C>>
) => S.decodeUnknownSync(graph)({ document, viewport, revision: 0 })

const yieldFailure = <A>(exit: Exit.Exit<A, FlowTypedError>) => {
  const result = failureOf(exit)

  if (Option.isNone(result)) {
    throw new Error('Expected failure')
  }

  return result.value
}

describe('real scoped typed actor', () => {
  it('reads, replaces, updates and encodes the single accepted graph', async () => {
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runResult() {
          const flow = yield* emptyActor()
          expect({
            assertion0: Object.is((yield* flow.readSnapshot()).revision, 0),
            assertion1: yield* flow.readNodes(),
            assertion2: yield* flow.readEdges(),
            assertion3: Object.is(
              yield* flow.readSelected((snapshot) => snapshot.revision),
              0
            ),
            assertion4: yield* flow.replaceDecoded(document, 0),
            assertion5: yield* flow.updateDecoded((snapshot) =>
              Effect.succeed(snapshot.document)
            ),
            assertion6: yield* flow.encodeDocument(),
          }).toStrictEqual({
            assertion0: true,
            assertion1: [],
            assertion2: [],
            assertion3: true,
            assertion4: {
              revision: 1,
              changed: true,
            },
            assertion5: { revision: 2, changed: true },
            assertion6: document,
          })

          return yield* flow.readSnapshot()
        })
      )
    )

    expect(result.revision).toBe(2)
  })

  it.each([
    FlowDocumentSchema,
    S.optionalKey(FlowDocumentSchema),
    S.mutableKey(FlowDocumentSchema),
    FlowDocumentSchema.pipe(S.withConstructorDefault(Effect.succeed(document))),
  ])(
    'normalizes only the snapshot outer metadata while preserving all graph schema wrappers',
    async (graph) => {
      const schema = createFlowTypedSnapshotSchema(graph)
      const decoded = yieldSnapshot(schema)
      expect({
        assertion0: decoded.document,
        assertion1: Object.is(schema.fields.document.members[0].schema, graph),
      }).toStrictEqual({
        assertion0: document,
        assertion1: true,
      })

      const invalidExits = await Promise.all(
        [
          { revision: 0, viewport },
          { document, viewport },
          { revision: 0, document },
          { revision: 0, document: undefined, viewport },
        ].map((invalid) =>
          Effect.runPromiseExit(S.decodeUnknownEffect(schema)(invalid))
        )
      )

      expect(invalidExits.map(Exit.isFailure)).toStrictEqual(
        invalidExits.map(() => true)
      )
    }
  )

  it.each(
    ['x', 'y'].flatMap((axis) =>
      [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].map(
        (value) => ({ axis, value })
      )
    )
  )(
    'actual initialization rejects $axis=$value before document hooks or staging',
    async ({ axis, value }) => {
      let isolateCalls = 0
      let stageCalls = 0
      let activationCalls = 0

      const counting = defineFlowDataContract({
        id: 'counter',
        document: FlowDocumentSchema,
        isolation: {
          detach: (inputDocument: typeof FlowDocumentSchema.Type) =>
            Effect.sync(() => {
              isolateCalls += 1

              return structuredClone(inputDocument)
            }),
        },
      })

      const exit = yieldFailure(
        await Effect.runPromiseExit(
          Effect.scoped(
            makeTypedFlow({
              contract: counting,
              viewport: { ...viewport, [axis]: value },
              initial: { kind: 'decoded', input: document },
              checkpointGate: {
                stage: () =>
                  Effect.sync(() => {
                    stageCalls += 1

                    return {
                      isCurrent: () => true,
                      abort: Effect.void,
                      accepted: Effect.sync(() => {
                        activationCalls += 1
                      }),
                    }
                  }),
              },
            })
          )
        )
      )

      expect({
        assertion0: exit,
        assertion1: [isolateCalls, stageCalls, activationCalls],
      }).toStrictEqual({
        assertion0: FlowTypedFailureSchema.members[0].make({
          operation: 'encode',
          message: `Checkpoint viewport.${axis} must be finite`,
        }),
        assertion1: [0, 0, 0],
      })
    }
  )

  it('rejects accessors and checks x before y without caller effects', async () => {
    const both = await Effect.runPromiseExit(
      Effect.scoped(
        makeTypedFlow({
          contract,
          viewport: { x: Number.NaN, y: Infinity, zoom: 1 },
          initial: { kind: 'decoded', input: document },
        })
      )
    )

    expect(yieldFailure(both)).toStrictEqual(
      FlowTypedFailureSchema.members[0].make({
        operation: 'encode',
        message: 'Checkpoint viewport.x must be finite',
      })
    )
    let gets = 0

    const badViewport = Object.defineProperty({ x: 0, y: 0, zoom: 1 }, 'x', {
      get: () => {
        gets += 1

        return 0
      },
    })

    const bad = await Effect.runPromiseExit(
      Effect.scoped(
        makeTypedFlow({
          contract,
          viewport: badViewport,
          initial: { kind: 'decoded', input: document },
        })
      )
    )

    expect({
      assertion0: yieldFailure(bad),
      assertion1: Object.is(gets, 0),
    }).toStrictEqual({
      assertion0: FlowTypedFailureSchema.members[0].make({
        operation: 'encode',
        message: 'Invalid checkpoint viewport',
      }),
      assertion1: true,
    })
  })

  it('rejects stale/invalid revisions before isolation and preserves authority', async () => {
    let calls = 0

    const counting = defineFlowDataContract({
      ...contract,
      isolation: {
        detach: (value: typeof FlowDocumentSchema.Type) =>
          Effect.sync(() => {
            calls += 1

            return structuredClone(value)
          }),
      },
    })

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runRejectsStaleInvalidRevisions1() {
          const flow = yield* makeTypedFlow({
            contract: counting,
            viewport,
            initial: { kind: 'decoded', input: document },
          })

          const before = calls
          expect({
            assertion0: yieldFailure(
              yield* Effect.exit(flow.replaceDecoded(document, 2))
            ),
            assertion1: Object.is(calls, before),
          }).toStrictEqual({
            assertion0: FlowTypedFailureSchema.members[3].make({
              expected: 2,
              actual: 0,
            }),
            assertion1: true,
          })

          for (const invalid of [
            -1,
            0.1,
            Number.NaN,
            Infinity,
            Number.MAX_SAFE_INTEGER + 1,
          ]) {
            expect(
              yieldFailure(
                yield* Effect.exit(flow.replaceDecoded(document, invalid))
              )._tag
            ).toBe('FlowCallbackFailure')
          }

          expect({
            assertion0: Object.is(calls, before),
            assertion1: Object.is((yield* flow.readSnapshot()).revision, 0),
          }).toStrictEqual({
            assertion0: true,
            assertion1: true,
          })
        })
      )
    )
  })

  it('an awaited nested write completes and the outer updater conflicts without replay', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runAnAwaitedNestedWrite2() {
          const flow = yield* emptyActor()
          let updates = 0

          const outer = yield* Effect.exit(
            flow.updateDecoded((snapshot) =>
              Effect.gen(function* runOuter() {
                updates += 1
                yield* flow
                  .replaceDecoded(snapshot.document, snapshot.revision)
                  .pipe(
                    Effect.mapError((): FlowTypedFailure =>
                      FlowTypedFailureSchema.members[1].make({
                        message: 'Nested caller write rejected',
                      })
                    )
                  )

                return snapshot.document
              })
            )
          )

          expect({
            assertion0: yieldFailure(outer),
            assertion1: Object.is(updates, 1),
            assertion2: yield* flow.updateDecoded((snapshot) =>
              Effect.succeed(snapshot.document)
            ),
          }).toStrictEqual({
            assertion0: FlowTypedFailureSchema.members[3].make({
              expected: 0,
              actual: 1,
            }),
            assertion1: true,
            assertion2: { revision: 2, changed: true },
          })
        })
      )
    )
  })

  it('competing staged identities accept once and each release once', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runCompetingStagedIdentitiesAccept3() {
          const entered = yield* Deferred.make<undefined>()
          const resume = yield* Deferred.make<undefined>()
          let staged = 0
          const releases: number[] = []
          const activated: number[] = []

          const flow = yield* makeTypedFlow({
            contract,
            viewport,
            initial: { kind: 'decoded', input: document },
            checkpointGate: {
              stage: (checkpoint) =>
                Effect.gen(function* runStage() {
                  const id = staged
                  staged += 1

                  if (checkpoint.revision === 1 && id === 1) {
                    // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                    yield* Deferred.succeed(entered, undefined)
                    yield* Deferred.await(resume)
                  }

                  return {
                    isCurrent: () => true,
                    abort: Effect.sync(() => {
                      releases.push(id)
                    }),
                    accepted: Effect.sync(() => {
                      activated.push(id)
                    }),
                  }
                }),
            },
          })

          const first = yield* Effect.forkScoped(
            Effect.exit(flow.replaceDecoded(document, 0))
          )

          yield* Deferred.await(entered)
          expect(yield* flow.replaceDecoded(document, 0)).toStrictEqual({
            revision: 1,
            changed: true,
          })
          // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
          yield* Deferred.succeed(resume, undefined)
          expect({
            assertion0: yieldFailure(yield* Fiber.join(first)),
            assertion1: Object.is((yield* flow.readSnapshot()).revision, 1),
          }).toStrictEqual({
            assertion0: FlowTypedFailureSchema.members[3].make({
              expected: 0,
              actual: 1,
            }),
            assertion1: true,
          })
          expect(releases.filter((id) => id === 1)).toHaveLength(1)
          expect(activated).not.toContain(1)
        })
      )
    )
  })

  it('closed owners reject future operations and settle a paused updater', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runClosedOwnersRejectFuture4() {
          const owner = yield* Scope.make()
          const entered = yield* Deferred.make<undefined>()
          const flow = yield* emptyActor().pipe(Scope.provide(owner))

          const pending = yield* Effect.forkScoped(
            Effect.exit(
              flow.updateDecoded(() =>
                // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                Deferred.succeed(entered, undefined).pipe(
                  Effect.andThen(Effect.never)
                )
              )
            )
          )

          yield* Deferred.await(entered)
          yield* Scope.close(owner, Exit.void)
          expect({
            assertion0: yieldFailure(yield* Fiber.join(pending)),
            assertion1: yieldFailure(yield* Effect.exit(flow.readSnapshot())),
            assertion2: yieldFailure(
              yield* Effect.exit(flow.replaceDecoded(document, 0))
            ),
          }).toStrictEqual({
            assertion0: FlowTypedFailureSchema.members[2].make({}),
            assertion1: FlowTypedFailureSchema.members[2].make({}),
            assertion2: FlowTypedFailureSchema.members[2].make({}),
          })
          yield* Scope.close(owner, Exit.void)
        })
      )
    )
  })
})

describe('actor publication and ordered observation', () => {
  it.each(['failure', 'expired', 'throwing'])(
    'stage failure and invalid/throwing leases preserve acceptance and gate health',
    async (mode) => {
      let first = true
      let aborts = 0
      let activations = 0
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runStageFailureAndInvalid5() {
            const flow = yield* makeTypedFlow({
              contract,
              viewport,
              initial: { kind: 'decoded', input: document },
              checkpointGate: {
                stage: (checkpoint) =>
                  Effect.gen(function* runStage() {
                    const failing = checkpoint.revision === 1 && first

                    if (failing) {
                      first = false
                    }

                    if (failing && mode === 'failure') {
                      return yield* Effect.fail<FlowTypedFailure>(
                        FlowTypedFailureSchema.members[1].make({
                          message: 'provider stage failure',
                        })
                      )
                    }

                    return {
                      isCurrent: () => {
                        if (failing && mode === 'throwing') {
                          throw new Error('Broken guard')
                        }

                        return !(failing && mode === 'expired')
                      },
                      abort: Effect.sync(() => {
                        aborts += 1
                      }),
                      accepted: Effect.sync(() => {
                        activations += 1
                      }),
                    }
                  }),
              },
            })

            const expected = Match.value(mode).pipe(
              Match.when('failure', () => 'Checkpoint staging failed'),
              Match.when(
                'expired',
                () => 'Checkpoint reservation is no longer current'
              ),
              Match.orElse(() => 'Checkpoint reservation check failed')
            )

            expect({
              assertion0: yieldFailure(
                yield* Effect.exit(flow.replaceDecoded(document, 0))
              ),
              assertion1: Object.is((yield* flow.readSnapshot()).revision, 0),
              assertion2: yield* flow.replaceDecoded(document, 0),
            }).toStrictEqual({
              assertion0: FlowTypedFailureSchema.members[4].make({
                revision: 1,
                message: expected,
              }),
              assertion1: true,
              assertion2: {
                revision: 1,
                changed: true,
              },
            })
          })
        )
      )
      expect({
        assertion0: Object.is(aborts, mode === 'failure' ? 2 : 3),
        assertion1: Object.is(activations, 2),
      }).toStrictEqual({
        assertion0: true,
        assertion1: true,
      })
    }
  )

  it('sticky activation failure preserves accepted revisions and releases queued/pending identities once', async () => {
    const released: number[] = []
    const activated: number[] = []
    const observed: number[] = []
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runStickyActivationFailurePreserves6() {
          const initialReleased = yield* Deferred.make<undefined>()
          const oneEntered = yield* Deferred.make<undefined>()
          const failOne = yield* Deferred.make<undefined>()
          const stageFourEntered = yield* Deferred.make<undefined>()
          const releaseFour = yield* Deferred.make<undefined>()
          const observedThree = yield* Deferred.make<undefined>()
          let stageId = 0
          let captures = 0

          const owned = defineFlowDataContract({
            ...contract,
            isolation: {
              detach: (value: typeof FlowDocumentSchema.Type) =>
                Effect.sync(() => {
                  captures += 1

                  return structuredClone(value)
                }),
            },
          })

          const flow = yield* makeTypedFlow({
            contract: owned,
            viewport,
            initial: { kind: 'decoded', input: document },
            checkpointGate: {
              stage: (checkpoint) =>
                Effect.gen(function* runStage() {
                  const id = stageId
                  stageId += 1

                  if (checkpoint.revision === 4) {
                    // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                    yield* Deferred.succeed(stageFourEntered, undefined)
                    yield* Deferred.await(releaseFour)
                  }

                  return {
                    isCurrent: () => true,
                    abort: Effect.gen(function* runAbort() {
                      released.push(id)

                      if (id === 0) {
                        // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                        yield* Deferred.succeed(initialReleased, undefined)
                      }
                    }),
                    accepted: Effect.gen(function* runAccepted() {
                      activated.push(id)

                      if (checkpoint.revision === 1) {
                        // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                        yield* Deferred.succeed(oneEntered, undefined)
                        yield* Deferred.await(failOne)

                        return yield* Effect.fail<FlowTypedFailure>(
                          FlowTypedFailureSchema.members[1].make({
                            message: 'real publication failed',
                          })
                        )
                      }
                    }),
                  }
                }),
            },
          })

          yield* Deferred.await(initialReleased)
          yield* Effect.forkScoped(
            flow.observe((snapshot) =>
              Effect.gen(function* runStickyActivationFailurePreserves7() {
                observed.push(snapshot.revision)

                if (snapshot.revision === 3) {
                  // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                  yield* Deferred.succeed(observedThree, undefined)
                }
              })
            )
          )
          expect(yield* flow.replaceDecoded(document, 0)).toStrictEqual({
            revision: 1,
            changed: true,
          })
          yield* Deferred.await(oneEntered)
          expect({
            assertion0: yield* flow.replaceDecoded(document, 1),
            assertion1: yield* flow.replaceDecoded(document, 2),
          }).toStrictEqual({
            assertion0: {
              revision: 2,
              changed: true,
            },
            assertion1: {
              revision: 3,
              changed: true,
            },
          })
          yield* Deferred.await(observedThree)

          const four = yield* Effect.forkScoped(
            Effect.exit(flow.replaceDecoded(document, 3))
          )

          yield* Deferred.await(stageFourEntered)
          // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
          yield* Deferred.succeed(failOne, undefined)

          const sticky = FlowTypedFailureSchema.members[4].make({
            revision: 1,
            message: 'Checkpoint activation failed',
          })

          const fourFailure = yieldFailure(yield* Fiber.join(four))
          const before = captures
          expect({
            four: fourFailure,
            next: yieldFailure(
              yield* Effect.exit(flow.replaceDecoded(document, 3))
            ),
          }).toStrictEqual({ four: sticky, next: sticky })
          let updateCalls = 0
          expect({
            assertion0: yieldFailure(
              yield* Effect.exit(
                flow.updateDecoded((snapshot) => {
                  updateCalls += 1

                  return Effect.succeed(snapshot.document)
                })
              )
            ),
            assertion1: Object.is(updateCalls, 0),
            assertion2: Object.is(captures, before),
            assertion3: Object.is((yield* flow.readSnapshot()).revision, 3),
            assertion4: yield* flow.encodeDocument(),
          }).toStrictEqual({
            assertion0: sticky,
            assertion1: true,
            assertion2: true,
            assertion3: true,
            assertion4: document,
          })
          const newObserved = yield* Deferred.make<number>()
          yield* Effect.forkScoped(
            flow.observe((snapshot) =>
              Deferred.succeed(newObserved, snapshot.revision).pipe(
                Effect.asVoid
              )
            )
          )
          expect(yield* Deferred.await(newObserved)).toBe(3)
          // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
          yield* Deferred.succeed(releaseFour, undefined)
        })
      )
    )
    expect({
      assertion0: observed,
      assertion1: activated,
      assertion2: released.toSorted(),
    }).toStrictEqual({
      assertion0: [0, 1, 2, 3],
      assertion1: [0, 1],
      assertion2: [0, 1, 2, 3],
    })
    // Interrupted stage4 never returned a reservation, so partial acquisition remains the provider's responsibility.
  })

  it('slow or reentrant listeners do not block another listener or the writer', async () => {
    const slowRevisions: number[] = []
    const fastRevisions: number[] = []
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runSlowOrReentrantListeners8() {
          const slowEntered = yield* Deferred.make<undefined>()
          const resumeSlow = yield* Deferred.make<undefined>()
          const fastTwo = yield* Deferred.make<undefined>()
          const slowTwo = yield* Deferred.make<undefined>()
          const nestedDone = yield* Deferred.make<undefined>()
          const flow = yield* emptyActor()

          const slow = yield* Effect.forkScoped(
            flow.observe((snapshot) =>
              Effect.gen(function* runSlow() {
                slowRevisions.push(snapshot.revision)

                if (snapshot.revision === 0) {
                  // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                  yield* Deferred.succeed(slowEntered, undefined)
                  yield* Deferred.await(resumeSlow)
                }

                if (snapshot.revision === 2) {
                  // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                  yield* Deferred.succeed(slowTwo, undefined)
                }
              })
            )
          )

          yield* Deferred.await(slowEntered)
          yield* Effect.forkScoped(
            flow.observe((snapshot) =>
              Effect.gen(function* runSlowOrReentrantListeners9() {
                fastRevisions.push(snapshot.revision)

                if (snapshot.revision === 2) {
                  // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                  yield* Deferred.succeed(fastTwo, undefined)
                }
              })
            )
          )
          yield* flow.replaceDecoded(document, 0)
          yield* flow.replaceDecoded(document, 1)
          yield* Deferred.await(fastTwo)
          expect({
            assertion0: slowRevisions,
            assertion1: fastRevisions,
          }).toStrictEqual({
            assertion0: [0],
            assertion1: [0, 1, 2],
          })
          // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
          yield* Deferred.succeed(resumeSlow, undefined)
          yield* Deferred.await(slowTwo)

          const reentrant = yield* Effect.forkScoped(
            flow.observe((snapshot) =>
              Effect.gen(function* runReentrant() {
                if (snapshot.revision === 2) {
                  yield* flow
                    .updateDecoded((value) => Effect.succeed(value.document))
                    .pipe(
                      Effect.mapError((): FlowTypedFailure =>
                        FlowTypedFailureSchema.members[1].make({
                          message: 'Nested observer write rejected',
                        })
                      )
                    )
                  // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                  yield* Deferred.succeed(nestedDone, undefined)
                }
              })
            )
          )

          yield* Deferred.await(nestedDone)
          expect((yield* flow.readSnapshot()).revision).toBe(3)
          yield* Fiber.interrupt(reentrant)
          yield* Fiber.interrupt(slow)
        })
      )
    )
    expect(slowRevisions.slice(0, 3)).toStrictEqual([0, 1, 2])
  })
})

class PrivateCounter {
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

const DecoderService = Context.Service<
  '089/unit/RD',
  { readonly name: string; readonly calls: string[] }
>('089/unit/RD')

const EncoderService = Context.Service<
  '089/unit/RE',
  { readonly name: string; readonly calls: string[] }
>('089/unit/RE')

const IsolationService = Context.Service<
  '089/unit/RI',
  { readonly name: string; readonly calls: string[] }
>('089/unit/RI')

const CaptureService = Context.Service<
  '089/unit/RC',
  { readonly name: string; readonly calls: string[] }
>('089/unit/RC')

const UpdaterService = Context.Service<
  '089/unit/RU',
  { readonly name: string; readonly calls: string[] }
>('089/unit/RU')

const ListenerService = Context.Service<
  '089/unit/RL',
  { readonly name: string; readonly calls: string[] }
>('089/unit/RL')

const typedControls = {
  mutateEncoder: false,
  failEncoder: false,
  mutateChecker: false,
  failChecker: false,
}

const TypedDate = S.String.pipe(
  S.decodeTo(S.Date, {
    decode: G.transform((value) => new Date(value)),
    encode: G.transform((value) => value.toISOString()),
  })
)

const TypedCounter = S.Number.pipe(
  S.decodeTo(S.instanceOf(PrivateCounter), {
    decode: G.transform((value) => new PrivateCounter(value)),
    encode: G.transformEffect((value) =>
      Effect.gen(function* runEncode() {
        const service = yield* EncoderService
        service.calls.push(service.name)

        if (typedControls.mutateEncoder) {
          value.increment()
        }

        if (typedControls.failEncoder) {
          return yield* Effect.fail(
            new SchemaIssue.InvalidValue(
              { message: 'Caller encoder rejected' },
              value
            )
          )
        }

        return value.read()
      })
    ),
  })
)

const TypedText = S.String.pipe(
  S.decodeTo(S.String, {
    decode: G.transformEffect((value) =>
      DecoderService.pipe(
        Effect.map((service) => {
          service.calls.push(service.name)

          return `${service.name}:${value}`
        })
      )
    ),
    encode: G.transform((value) => value.slice(value.indexOf(':') + 1)),
  })
)

const TypedDated = createFlowNodeVariantSchema({
  type: S.Literal('dated'),
  data: S.Struct({ date: TypedDate, counter: TypedCounter, text: TypedText }),
}).check(
  S.makeFilter((node) => {
    if (typedControls.mutateChecker) {
      node.data.counter.increment()
    }

    return !typedControls.failChecker
  })
)

const TypedCounted = createFlowNodeVariantSchema({
  type: S.Literal('counted'),
  data: S.Struct({ count: S.Number }),
})

const TypedNoData = createFlowNodeVariantSchema({
  type: S.optional(S.Undefined),
  data: S.optional(S.Undefined),
})

const TypedOptional = createFlowNodeVariantSchema({
  type: S.optional(S.Literal('optional')),
  data: S.optionalKey(S.Number),
})

const TypedEdge = createFlowEdgeVariantSchema({
  type: S.Literal('weighted'),
  data: S.Struct({ weight: S.Number }),
})

const TypedBase = createFlowDataDocumentSchema({
  nodes: S.Union([TypedDated, TypedCounted, TypedOptional, TypedNoData]),
  edges: TypedEdge,
})

const TypedDocument = S.Struct({ ...TypedBase.fields, metadata: S.String })

const detachTypedDocument = (
  value: typeof TypedDocument.Type
): typeof TypedDocument.Type => ({
  ...structuredClone(Struct.omit(value, ['nodes'])),
  nodes: value.nodes.map((node) =>
    node.type === 'dated'
      ? {
          ...structuredClone(Struct.omit(node, ['data'])),
          data: {
            date: new Date(node.data.date),
            counter: new PrivateCounter(node.data.counter.read()),
            text: node.data.text,
          },
        }
      : structuredClone(node)
  ),
})

const typedContract = defineFlowDataContract({
  id: 'private-data',
  document: TypedDocument,
  isolation: {
    detach: (value: typeof TypedDocument.Type) =>
      IsolationService.pipe(
        Effect.map((service) => {
          service.calls.push(service.name)

          return detachTypedDocument(value)
        })
      ),
  },
})

const rawTypedDocument = {
  metadata: 'whole-document',
  nodeOrigin: [0.25, -1],
  nodes: [
    {
      id: 'dated',
      type: 'dated',
      label: 'Date',
      position: { x: 1, y: 2 },
      data: { date: '2026-10-02T00:00:00.000Z', counter: 5, text: 'text' },
    },
    {
      id: 'counted',
      type: 'counted',
      label: 'Count',
      position: { x: 2, y: 3 },
      data: { count: 7 },
    },
    { id: 'absent', label: 'Absent', position: { x: 3, y: 4 } },
  ],
  edges: [
    {
      id: 'weighted',
      type: 'weighted',
      source: 'dated',
      target: 'counted',
      data: { weight: 2 },
    },
  ],
}

const provideTyped = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  name: string,
  calls: { rd: string[]; re: string[]; ri: string[] }
) =>
  effect.pipe(
    Effect.provideService(DecoderService, { name, calls: calls.rd }),
    Effect.provideService(EncoderService, { name, calls: calls.re }),
    Effect.provideService(IsolationService, { name, calls: calls.ri })
  )

const getDated = (value: typeof TypedDocument.Type) => {
  const node = value.nodes.find((entry) => entry.type === 'dated')

  if (!node || node.type !== 'dated') {
    throw new Error('Missing actual dated node')
  }

  return node
}

describe('typed actor private class ownership and caller contexts', () => {
  it('captures each later operation/listener context rather than construction services', async () => {
    const calls = {
      rd: new Array<string>(),
      re: new Array<string>(),
      ri: new Array<string>(),
    }

    const captureCalls: string[] = []
    const updates: string[] = []
    const listeners: string[] = []
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runCapturesEachLaterOperation10() {
          const flow = yield* provideTyped(
            makeTypedFlow({
              contract: typedContract,
              viewport,
              initial: { kind: 'encoded', input: rawTypedDocument },
              encodedInputCapture: {
                capture: (input) =>
                  CaptureService.pipe(
                    Effect.map((service) => {
                      service.calls.push(service.name)

                      return structuredClone(input)
                    })
                  ),
              },
            }),
            'A',
            calls
          ).pipe(
            Effect.provideService(CaptureService, {
              name: 'A',
              calls: captureCalls,
            })
          )

          expect(
            getDated(
              (yield* provideTyped(flow.readSnapshot(), 'B', calls)).document
            ).data.text
          ).toBe('A:text')
          yield* provideTyped(
            flow.replaceEncoded(rawTypedDocument, 0),
            'B',
            calls
          ).pipe(
            Effect.provideService(CaptureService, {
              name: 'B',
              calls: captureCalls,
            })
          )
          expect(
            getDated(
              (yield* provideTyped(flow.readSnapshot(), 'B', calls)).document
            ).data.text
          ).toBe('B:text')
          yield* provideTyped(
            flow.updateDecoded((snapshot) =>
              UpdaterService.pipe(
                Effect.map((service) => {
                  service.calls.push(service.name)

                  return snapshot.document
                })
              )
            ),
            'B',
            calls
          ).pipe(
            Effect.provideService(UpdaterService, {
              name: 'late-updater',
              calls: updates,
            })
          )
          const listenerDone = yield* Deferred.make<undefined>()

          const listener = yield* Effect.forkScoped(
            provideTyped(
              flow.observe((snapshot) =>
                ListenerService.pipe(
                  Effect.flatMap((service) => {
                    service.calls.push(service.name)
                    expect(snapshot.revision).toBe(2)

                    // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                    return Deferred.succeed(listenerDone, undefined).pipe(
                      Effect.asVoid
                    )
                  })
                )
              ),
              'B',
              calls
            ).pipe(
              Effect.provideService(ListenerService, {
                name: 'late-listener',
                calls: listeners,
              })
            )
          )

          yield* Deferred.await(listenerDone)
          yield* Fiber.interrupt(listener)
          expect({
            assertion0: updates,
            assertion1: listeners,
            assertion2: captureCalls,
            assertion3: calls.rd,
            assertion4: calls.re,
            assertion5: calls.ri.includes('B'),
          }).toStrictEqual({
            assertion0: ['late-updater'],
            assertion1: ['late-listener'],
            assertion2: ['A', 'B'],
            assertion3: ['A', 'B'],
            assertion4: ['A', 'B', 'B'],
            assertion5: true,
          })
        })
      )
    )
  })

  it('keeps Date/private slots independent across input, reads, selectors, updaters and observers', async () => {
    const calls = {
      rd: new Array<string>(),
      re: new Array<string>(),
      ri: new Array<string>(),
    }

    await Effect.runPromise(
      provideTyped(
        Effect.scoped(
          Effect.gen(function* runKeepsDatePrivateSlots11() {
            const decoded =
              yield* S.decodeUnknownEffect(TypedDocument)(rawTypedDocument)

            const heldInput = getDated(decoded).data

            const flow = yield* makeTypedFlow({
              contract: typedContract,
              viewport,
              initial: { kind: 'decoded', input: decoded },
            })

            heldInput.counter.increment()
            heldInput.date.setTime(0)
            const first = yield* flow.readSnapshot()
            const second = yield* flow.readSnapshot()
            const a = getDated(first.document).data
            const b = getDated(second.document).data
            expect({
              assertion0: Object.is(a.counter, b.counter),
              assertion1: Object.is(a.date, b.date),
              assertion2: Object.is(a.counter.read(), 5),
            }).toStrictEqual({
              assertion0: false,
              assertion1: false,
              assertion2: true,
            })
            a.counter.increment()
            a.date.setTime(3)
            expect({
              assertion0: Object.is(b.counter.read(), 5),
              assertion1: Object.is(
                b.date.toISOString(),
                '2026-10-02T00:00:00.000Z'
              ),
            }).toStrictEqual({
              assertion0: true,
              assertion1: true,
            })

            const selected = yield* flow.readSelected(
              (snapshot) => getDated(snapshot.document).data
            )

            selected.counter.increment()
            selected.date.setTime(7)
            const oneDone = yield* Deferred.make<undefined>()
            const twoDone = yield* Deferred.make<undefined>()

            const one = yield* Effect.forkScoped(
              flow.observe((snapshot) =>
                Effect.sync(() => {
                  const value = getDated(snapshot.document).data
                  value.counter.increment()
                  value.date.setTime(8)
                }).pipe(
                  // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                  Effect.andThen(Deferred.succeed(oneDone, undefined)),
                  Effect.asVoid
                )
              )
            )

            const two = yield* Effect.forkScoped(
              flow.observe((snapshot) =>
                Effect.sync(() => {
                  const value = getDated(snapshot.document).data
                  expect({
                    assertion0: Object.is(value.counter.read(), 5),
                    assertion1: Object.is(
                      value.date.toISOString(),
                      '2026-10-02T00:00:00.000Z'
                    ),
                  }).toStrictEqual({
                    assertion0: true,
                    assertion1: true,
                  })
                }).pipe(
                  // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                  Effect.andThen(Deferred.succeed(twoDone, undefined)),
                  Effect.asVoid
                )
              )
            )

            yield* Deferred.await(oneDone)
            yield* Deferred.await(twoDone)
            yield* Fiber.interrupt(one)
            yield* Fiber.interrupt(two)

            const update = yield* Effect.exit(
              flow.updateDecoded((snapshot) => {
                getDated(snapshot.document).data.counter.increment()

                return Effect.fail<FlowTypedFailure>(
                  FlowTypedFailureSchema.members[1].make({
                    message: 'caller updater rejected',
                  })
                )
              })
            )

            expect({
              assertion0: Boolean(Option.isSome(failureOf(update))),
              assertion1: Object.is(
                getDated(
                  (yield* flow.readSnapshot()).document
                ).data.counter.read(),
                5
              ),
              assertion2: Object.is(
                (yield* flow.readSnapshot()).document.metadata,
                'whole-document'
              ),
              assertion3: (yield* flow.readSnapshot()).document.nodeOrigin,
            }).toStrictEqual({
              assertion0: true,
              assertion1: true,
              assertion2: true,
              assertion3: [0.25, -1],
            })
          })
        ),
        'classes',
        calls
      )
    )
  })

  it('successful and failing mutating encoder/checker hooks cannot alter accepted graph or other read', async () => {
    const calls = {
      rd: new Array<string>(),
      re: new Array<string>(),
      ri: new Array<string>(),
    }

    try {
      await Effect.runPromise(
        provideTyped(
          Effect.scoped(
            Effect.gen(function* runSuccessfulAndFailingMutating12() {
              const flow = yield* makeTypedFlow({
                contract: typedContract,
                viewport,
                initial: { kind: 'encoded', input: rawTypedDocument },
              })

              const retained = yield* flow.readSnapshot()
              typedControls.mutateEncoder = true
              yield* flow.encodeDocument()
              expect({
                assertion0: Object.is(
                  getDated(retained.document).data.counter.read(),
                  5
                ),
                assertion1: Object.is(
                  getDated(
                    (yield* flow.readSnapshot()).document
                  ).data.counter.read(),
                  5
                ),
              }).toStrictEqual({
                assertion0: true,
                assertion1: true,
              })
              typedControls.failEncoder = true

              const failedEncode = yield* Effect.exit(
                flow.replaceDecoded(retained.document, 0)
              )

              expect(Option.isSome(failureOf(failedEncode))).toBeTruthy()
              typedControls.failEncoder = false
              typedControls.mutateEncoder = false
              typedControls.mutateChecker = true
              typedControls.failChecker = true

              const failedCheck = yield* Effect.exit(
                flow.replaceDecoded(retained.document, 0)
              )

              expect(Option.isSome(failureOf(failedCheck))).toBeTruthy()
              typedControls.mutateChecker = false
              typedControls.failChecker = false
              expect({
                assertion0: Object.is(
                  getDated(retained.document).data.counter.read(),
                  5
                ),
                assertion1: Object.is(
                  getDated(
                    (yield* flow.readSnapshot()).document
                  ).data.counter.read(),
                  5
                ),
                assertion2: Object.is((yield* flow.readSnapshot()).revision, 0),
              }).toStrictEqual({
                assertion0: true,
                assertion1: true,
                assertion2: true,
              })
            })
          ),
          'mutators',
          calls
        )
      )
    } finally {
      typedControls.mutateEncoder = false
      typedControls.failEncoder = false
      typedControls.mutateChecker = false
      typedControls.failChecker = false
    }
  })

  it('default encoded capture rejects class/own-undefined/accessor values before decoder', async () => {
    const calls = {
      rd: new Array<string>(),
      re: new Array<string>(),
      ri: new Array<string>(),
    }

    let getters = 0

    const accessor = Object.defineProperty({ ...rawTypedDocument }, 'nodes', {
      get: () => {
        getters += 1

        return rawTypedDocument.nodes
      },
    })

    const failures = await Promise.all(
      [
        accessor,
        { ...rawTypedDocument, extension: undefined },
        { ...rawTypedDocument, extension: new PrivateCounter(1) },
      ].map(async (input) =>
        yieldFailure(
          await Effect.runPromiseExit(
            provideTyped(
              Effect.scoped(
                makeTypedFlow({
                  contract: typedContract,
                  viewport,
                  initial: { kind: 'encoded', input },
                })
              ),
              'invalid',
              calls
            )
          )
        )
      )
    )

    expect(failures).toStrictEqual(
      failures.map(() =>
        FlowTypedFailureSchema.members[0].make({
          operation: 'decode',
          message: 'Invalid encoded plain JSON input',
        })
      )
    )

    expect({
      assertion0: Object.is(getters, 0),
      assertion1: calls.rd,
      assertion2: calls.re,
      assertion3: calls.ri,
    }).toStrictEqual({
      assertion0: true,
      assertion1: [],
      assertion2: [],
      assertion3: [],
    })
  })
})

describe('trusted abort contract violations are observable without abandoned release jobs', () => {
  it('initial invalid lease retains both projection failure and abort defect', async () => {
    let aborts = 0
    let accepted = 0
    const broken = new Error('initial abort contract violation')

    const exit = await Effect.runPromiseExit(
      Effect.scoped(
        makeTypedFlow({
          contract,
          viewport,
          initial: { kind: 'decoded', input: document },
          checkpointGate: {
            stage: () =>
              Effect.succeed({
                isCurrent: () => false,
                abort: Effect.sync(() => {
                  aborts += 1
                }).pipe(Effect.andThen(Effect.die(broken))),
                accepted: Effect.sync(() => {
                  accepted += 1
                }),
              }),
          },
        })
      )
    )

    expect(Exit.isFailure(exit)).toBeTruthy()

    if (Exit.isSuccess(exit)) {
      throw new Error('Expected initial lease failure')
    }

    expect({
      assertion0: Cause.findErrorOption(exit.cause),
      assertion1: Boolean(Cause.hasDies(exit.cause)),
    }).toStrictEqual({
      assertion0: Option.some(
        FlowTypedFailureSchema.members[4].make({
          revision: 0,
          message: 'Checkpoint reservation is no longer current',
        })
      ),
      assertion1: true,
    })

    expect({
      assertion0: Object.is(aborts, 1),
      assertion1: Object.is(accepted, 0),
    }).toStrictEqual({
      assertion0: true,
      assertion1: true,
    })
  })

  it('close joins the same defective completion and still releases every other identity once', async () => {
    const aborted: number[] = []
    const broken = new Error('abort contract violation')

    const exit = await Effect.runPromiseExit(
      Effect.scoped(
        Effect.gen(function* runExit() {
          const entered = yield* Deferred.make<undefined>()
          const released = yield* Deferred.make<undefined>()
          const owner = yield* Scope.make()

          const flow = yield* makeTypedFlow({
            contract,
            viewport,
            initial: { kind: 'decoded', input: document },
            checkpointGate: {
              stage: (checkpoint) =>
                Effect.succeed({
                  isCurrent: () => true,
                  abort: Effect.gen(function* runAbort() {
                    aborted.push(checkpoint.revision)

                    if (checkpoint.revision === 1) {
                      // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                      yield* Deferred.succeed(released, undefined)

                      return yield* Effect.die(broken)
                    }
                  }),
                  accepted:
                    checkpoint.revision === 1
                      ? // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                        Deferred.succeed(entered, undefined).pipe(
                          Effect.andThen(Effect.never)
                        )
                      : Effect.void,
                }),
            },
          }).pipe(Scope.provide(owner))

          yield* flow.replaceDecoded(document, 0)
          yield* Deferred.await(entered)
          yield* flow.replaceDecoded(document, 1)

          const closing = yield* Effect.forkScoped(
            Effect.exit(Scope.close(owner, Exit.void))
          )

          yield* Deferred.await(released)
          const closed = yield* Fiber.join(closing)
          expect(Exit.isFailure(closed)).toBeTruthy()

          if (Exit.isFailure(closed)) {
            expect(Cause.hasDies(closed.cause)).toBeTruthy()
          }

          expect(
            failureOf(yield* Effect.exit(flow.readSnapshot()))
          ).toStrictEqual(
            Option.some(FlowTypedFailureSchema.members[2].make({}))
          )
        })
      )
    )

    expect({
      assertion0: Boolean(Exit.isSuccess(exit)),
      assertion1: aborted.toSorted(),
    }).toStrictEqual({
      assertion0: true,
      assertion1: [0, 1, 2],
    })
  })
})

describe('arbitrary encoded classes and atomic Effectful deliveries', () => {
  const PlainGraph = createFlowDataDocumentSchema({
    nodes: S.Union([TypedCounted, TypedNoData]),
    edges: TypedEdge,
  })

  const EncodedGraph = class EncodedGraph {
    #document: typeof PlainGraph.Encoded
    constructor(value: typeof PlainGraph.Encoded) {
      this.#document = structuredClone(value)
    }
    copy() {
      return structuredClone(this.#document)
    }
    replace(value: typeof PlainGraph.Encoded) {
      this.#document = structuredClone(value)
    }
  }

  const EncodedSchema = S.instanceOf(EncodedGraph).annotate({
    toCodecJson: () =>
      S.link<InstanceType<typeof EncodedGraph>>()(
        S.toEncoded(PlainGraph),
        ST.transform({
          decode: (value) => new EncodedGraph(value),
          encode: (value) => value.copy(),
        })
      ),
  })

  const ClassDocument = EncodedSchema.pipe(
    S.decodeTo(PlainGraph, {
      decode: G.transformEffect((value) =>
        DecoderService.pipe(
          Effect.map((service) => {
            service.calls.push(service.name)

            return value.copy()
          })
        )
      ),
      encode: G.transformEffect((value) =>
        EncoderService.pipe(
          Effect.map((service) => {
            service.calls.push(service.name)

            return new EncodedGraph(value)
          })
        )
      ),
    })
  )

  const classContract = defineFlowDataContract({
    id: 'encoded-class',
    document: ClassDocument,
    isolation: {
      detach: (value: typeof PlainGraph.Type) =>
        Effect.sync(() => structuredClone(value)),
    },
  })

  it('requires explicit encoded-class capture and preserves independent RC with RI=never', async () => {
    const calls = {
      rd: new Array<string>(),
      re: new Array<string>(),
      ri: new Array<string>(),
    }

    const captureCalls: string[] = []

    const raw = new EncodedGraph({
      nodes: [
        {
          id: TypedNoData.fields.id.make('none'),
          label: 'None',
          position: { x: 0, y: 0 },
          type: undefined,
          data: undefined,
        },
      ],
      edges: [],
    })

    const without = await Effect.runPromiseExit(
      provideTyped(
        Effect.scoped(
          makeTypedFlow({
            contract: classContract,
            viewport,
            initial: { kind: 'encoded', input: raw },
          })
        ),
        'class-A',
        calls
      )
    )

    expect({
      assertion0: failureOf(without),
      assertion1: calls.rd,
    }).toStrictEqual({
      assertion0: Option.some(
        FlowTypedFailureSchema.members[0].make({
          operation: 'decode',
          message: 'Invalid encoded plain JSON input',
        })
      ),
      assertion1: [],
    })
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runRequiresExplicitEncodedClass13() {
          const flow = yield* provideTyped(
            makeTypedFlow({
              contract: classContract,
              viewport,
              initial: { kind: 'encoded', input: raw },
              encodedInputCapture: {
                capture: (input) =>
                  CaptureService.pipe(
                    Effect.flatMap((service) => {
                      service.calls.push(service.name)

                      return input instanceof EncodedGraph
                        ? Effect.succeed(new EncodedGraph(input.copy()))
                        : Effect.fail<FlowTypedFailure>(
                            FlowTypedFailureSchema.members[0].make({
                              operation: 'decode',
                              message: 'Expected encoded class',
                            })
                          )
                    })
                  ),
              },
            }),
            'class-A',
            calls
          ).pipe(
            Effect.provideService(CaptureService, {
              name: 'capture-A',
              calls: captureCalls,
            })
          )

          raw.replace({ nodes: [], edges: [] })
          const first = yield* flow.readSnapshot()
          expect(first.document.nodes).toHaveLength(1)
          expect(
            Object.hasOwn(first.document.nodes[0] ?? {}, 'data')
          ).toBeTruthy()
          expect(first.document.nodes[0]?.data).toBeUndefined()
          expect(yield* flow.readNodes()).toHaveLength(1)
          yield* provideTyped(flow.encodeDocument(), 'class-B', calls)
          yield* provideTyped(
            flow.replaceDecoded(first.document, 0),
            'class-B',
            calls
          )
          yield* provideTyped(
            flow.replaceEncoded(raw, 1),
            'class-B',
            calls
          ).pipe(
            Effect.provideService(CaptureService, {
              name: 'capture-B',
              calls: captureCalls,
            })
          )
          expect({
            assertion0: (yield* flow.readSnapshot()).document.nodes,
            assertion1: captureCalls,
            assertion2: calls.rd,
          }).toStrictEqual({
            assertion0: [],
            assertion1: ['capture-A', 'capture-B'],
            assertion2: ['class-A', 'class-B'],
          })
        })
      )
    )
  })

  it('allows a captured old revision read while a newer graph commits, without mismatching the pair', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runAllowsACapturedOld14() {
          const entered = yield* Deferred.make<undefined>()
          const resume = yield* Deferred.make<undefined>()
          let pause = false

          const isolated = defineFlowDataContract({
            ...contract,
            isolation: {
              detach: (value: typeof FlowDocumentSchema.Type) =>
                Effect.gen(function* runDetach() {
                  if (pause) {
                    pause = false
                    // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                    yield* Deferred.succeed(entered, undefined)
                    yield* Deferred.await(resume)
                  }

                  return structuredClone(value)
                }),
            },
          })

          const flow = yield* makeTypedFlow({
            contract: isolated,
            viewport,
            initial: { kind: 'decoded', input: document },
          })

          pause = true
          const reading = yield* Effect.forkScoped(flow.readSnapshot())
          yield* Deferred.await(entered)

          const next = {
            ...document,
            nodeOrigin: [0.25, 0.75],
          } satisfies typeof FlowDocumentSchema.Type

          yield* flow.replaceDecoded(next, 0)
          // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
          yield* Deferred.succeed(resume, undefined)
          const old = yield* Fiber.join(reading)
          expect(old.revision).toBe(0)
          expect(old.document.nodeOrigin).toBeUndefined()
          const current = yield* flow.readSnapshot()
          expect({
            assertion0: Object.is(current.revision, 1),
            assertion1: current.document.nodeOrigin,
          }).toStrictEqual({
            assertion0: true,
            assertion1: [0.25, 0.75],
          })
        })
      )
    )
  })

  it('caller interruption before staging prevents acceptance while completed CAS cannot be rolled back', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runCallerInterruptionBeforeStaging15() {
          const entered = yield* Deferred.make<undefined>()
          const resume = yield* Deferred.make<undefined>()
          let pause = false
          let staged = 0

          const isolated = defineFlowDataContract({
            ...contract,
            isolation: {
              detach: (value: typeof FlowDocumentSchema.Type) =>
                Effect.gen(function* runDetach() {
                  if (pause) {
                    pause = false
                    // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                    yield* Deferred.succeed(entered, undefined)
                    yield* Deferred.await(resume)
                  }

                  return structuredClone(value)
                }),
            },
          })

          const flow = yield* makeTypedFlow({
            contract: isolated,
            viewport,
            initial: { kind: 'decoded', input: document },
            checkpointGate: {
              stage: () =>
                Effect.sync(() => {
                  staged += 1

                  return {
                    isCurrent: () => true,
                    abort: Effect.void,
                    accepted: Effect.void,
                  }
                }),
            },
          })

          pause = true

          const cancelled = yield* Effect.forkScoped(
            Effect.exit(flow.replaceDecoded(document, 0))
          )

          yield* Deferred.await(entered)
          yield* Fiber.interrupt(cancelled)
          const interrupted = yield* Fiber.await(cancelled)
          expect(Exit.isFailure(interrupted)).toBeTruthy()

          if (Exit.isFailure(interrupted)) {
            expect(Cause.hasInterrupts(interrupted.cause)).toBeTruthy()
          }

          // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
          yield* Deferred.succeed(resume, undefined)
          expect({
            assertion0: Object.is((yield* flow.readSnapshot()).revision, 0),
            assertion1: Object.is(staged, 1),
          }).toStrictEqual({
            assertion0: true,
            assertion1: true,
          })

          const committed = yield* Effect.forkScoped(
            flow.replaceDecoded(document, 0)
          )

          expect(yield* Fiber.join(committed)).toStrictEqual({
            revision: 1,
            changed: true,
          })
          yield* Fiber.interrupt(committed)
          expect((yield* flow.readSnapshot()).revision).toBe(1)
        })
      )
    )
  })

  it('closed scope rejects a still-pending detached read and selectors map actual throws', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runClosedScopeRejectsA16() {
          const owner = yield* Scope.make()
          const entered = yield* Deferred.make<undefined>()
          let pause = false

          const isolated = defineFlowDataContract({
            ...contract,
            isolation: {
              detach: (value: typeof FlowDocumentSchema.Type) =>
                Effect.gen(function* runDetach() {
                  if (pause) {
                    pause = false
                    // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                    yield* Deferred.succeed(entered, undefined)
                    yield* Effect.never
                  }

                  return structuredClone(value)
                }),
            },
          })

          const flow = yield* makeTypedFlow({
            contract: isolated,
            viewport,
            initial: { kind: 'decoded', input: document },
          }).pipe(Scope.provide(owner))

          expect(
            failureOf(
              yield* Effect.exit(
                flow.readSelected(() => {
                  throw new Error('Caller selector defect')
                })
              )
            )
          ).toStrictEqual(
            Option.some(
              FlowTypedFailureSchema.members[1].make({
                message: 'Flow selector failed',
              })
            )
          )
          pause = true

          const read = yield* Effect.forkScoped(
            Effect.exit(flow.readSnapshot())
          )

          yield* Deferred.await(entered)
          yield* Scope.close(owner, Exit.void)
          expect(failureOf(yield* Fiber.join(read))).toStrictEqual(
            Option.some(FlowTypedFailureSchema.members[2].make({}))
          )
        })
      )
    )
  })
})

describe('late stage return remains actor-owned after terminal public settlement', () => {
  it('settles sticky failure before stage resumes and provider releases interrupted partial identity4 once', async () => {
    const released: number[] = []
    const activated: number[] = []
    const observations: number[] = []
    const providerReleased: number[] = []
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runSettlesStickyFailureBefore17() {
          const owner = yield* Scope.make()
          const initialDone = yield* Deferred.make<undefined>()
          const oneEntered = yield* Deferred.make<undefined>()
          const failOne = yield* Deferred.make<undefined>()
          const fourEntered = yield* Deferred.make<undefined>()
          const resumeFour = yield* Deferred.make<undefined>()
          const fourReleased = yield* Deferred.make<undefined>()
          const observedThree = yield* Deferred.make<undefined>()

          const flow = yield* makeTypedFlow({
            contract,
            viewport,
            initial: { kind: 'decoded', input: document },
            checkpointGate: {
              stage: (checkpoint) => {
                const abort = Effect.gen(function* runAbort() {
                  released.push(checkpoint.revision)

                  if (checkpoint.revision === 0) {
                    // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                    yield* Deferred.succeed(initialDone, undefined)
                  }

                  if (checkpoint.revision === 4) {
                    // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                    yield* Deferred.succeed(fourReleased, undefined)
                  }
                })

                return Effect.uninterruptible(
                  Effect.gen(function* runStage() {
                    if (checkpoint.revision === 4) {
                      // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                      yield* Deferred.succeed(fourEntered, undefined)
                      yield* Deferred.await(resumeFour)
                    }

                    return {
                      isCurrent: () => true,
                      abort,
                      accepted: Effect.gen(function* runAccepted() {
                        activated.push(checkpoint.revision)

                        if (checkpoint.revision === 1) {
                          // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                          yield* Deferred.succeed(oneEntered, undefined)
                          yield* Deferred.await(failOne)

                          return yield* Effect.fail<FlowTypedFailure>(
                            FlowTypedFailureSchema.members[1].make({
                              message: 'Activation1 failed',
                            })
                          )
                        }
                      }),
                    }
                  })
                ).pipe(
                  Effect.onExit((exit) =>
                    Exit.isFailure(exit)
                      ? Effect.sync(() => {
                          providerReleased.push(checkpoint.revision)
                        }).pipe(Effect.andThen(abort))
                      : Effect.void
                  )
                )
              },
            },
          }).pipe(Scope.provide(owner))

          yield* Deferred.await(initialDone)
          yield* Effect.forkScoped(
            flow.observe((snapshot) =>
              Effect.gen(function* runSettlesStickyFailureBefore18() {
                observations.push(snapshot.revision)

                if (snapshot.revision === 3) {
                  // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                  yield* Deferred.succeed(observedThree, undefined)
                }
              })
            )
          )
          yield* flow.replaceDecoded(document, 0)
          yield* Deferred.await(oneEntered)
          yield* flow.replaceDecoded(document, 1)
          yield* flow.replaceDecoded(document, 2)
          yield* Deferred.await(observedThree)

          const four = yield* Effect.forkScoped(
            Effect.exit(flow.replaceDecoded(document, 3))
          )

          yield* Deferred.await(fourEntered)
          // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
          yield* Deferred.succeed(failOne, undefined)
          const failed = yield* Fiber.join(four)
          expect(failureOf(failed)).toStrictEqual(
            Option.some(
              FlowTypedFailureSchema.members[4].make({
                revision: 1,
                message: 'Checkpoint activation failed',
              })
            )
          )
          // The public call settles before the held provider resumes. Pending interruption is owned by stage until core receives its result.
          expect(released).not.toContain(4)
          expect((yield* flow.readSnapshot()).revision).toBe(3)
          // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
          yield* Deferred.succeed(resumeFour, undefined)
          yield* Deferred.await(fourReleased)
          expect((yield* flow.readSnapshot()).revision).toBe(3)
          yield* Scope.close(owner, Exit.void)
        })
      )
    )
    expect({
      assertion0: providerReleased,
      assertion1: observations,
      assertion2: activated,
      assertion3: released.toSorted(),
    }).toStrictEqual({
      assertion0: [4],
      assertion1: [0, 1, 2, 3],
      assertion2: [0, 1],
      assertion3: [0, 1, 2, 3, 4],
    })
  })

  it('close settles pending caller promptly but joins its bounded late reservation handoff', async () => {
    const released: number[] = []
    const events: string[] = []
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runCloseSettlesPendingCaller19() {
          const owner = yield* Scope.make()
          const entered = yield* Deferred.make<undefined>()
          const resume = yield* Deferred.make<undefined>()
          const closingEntered = yield* Deferred.make<undefined>()

          const flow = yield* makeTypedFlow({
            contract,
            viewport,
            initial: { kind: 'decoded', input: document },
            checkpointGate: {
              stage: (checkpoint) =>
                Effect.uninterruptible(
                  Effect.gen(function* runStage() {
                    if (checkpoint.revision === 1) {
                      // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                      yield* Deferred.succeed(entered, undefined)
                      yield* Deferred.await(resume)
                      events.push('late-stage-return')
                    }

                    return {
                      isCurrent: () => true,
                      abort: Effect.sync(() => {
                        released.push(checkpoint.revision)

                        if (checkpoint.revision === 1) {
                          events.push('late-release')
                        }
                      }),
                      accepted: Effect.void,
                    }
                  })
                ),
            },
          }).pipe(Scope.provide(owner))

          const call = yield* Effect.forkScoped(
            Effect.exit(flow.replaceDecoded(document, 0))
          )

          yield* Deferred.await(entered)

          const closing = yield* Effect.forkScoped(
            // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
            Deferred.succeed(closingEntered, undefined).pipe(
              Effect.andThen(Scope.close(owner, Exit.void)),
              Effect.tap(() =>
                Effect.sync(() => {
                  events.push('close-complete')
                })
              )
            )
          )

          yield* Deferred.await(closingEntered)
          expect(failureOf(yield* Fiber.join(call))).toStrictEqual(
            Option.some(FlowTypedFailureSchema.members[2].make({}))
          )
          events.push('caller-settled')
          expect(events).toStrictEqual(['caller-settled'])
          // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
          yield* Deferred.succeed(resume, undefined)
          yield* Fiber.join(closing)
        })
      )
    )
    expect({
      assertion0: events,
      assertion1: released.toSorted(),
    }).toStrictEqual({
      assertion0: [
        'caller-settled',
        'late-stage-return',
        'late-release',
        'close-complete',
      ],
      assertion1: [0, 1],
    })
  })

  it('closing interrupted updater and listener finalizers preserves all remaining cleanup', async () => {
    const finalizers: string[] = []
    const releases: number[] = []
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runClosingInterruptedUpdaterAnd20() {
          const owner = yield* Scope.make()
          const updateEntered = yield* Deferred.make<undefined>()
          const listenerEntered = yield* Deferred.make<undefined>()

          const flow = yield* makeTypedFlow({
            contract,
            viewport,
            initial: { kind: 'decoded', input: document },
            checkpointGate: {
              stage: (checkpoint) =>
                Effect.succeed({
                  isCurrent: () => true,
                  abort: Effect.sync(() => {
                    releases.push(checkpoint.revision)
                  }),
                  accepted: Effect.void,
                }),
            },
          }).pipe(Scope.provide(owner))

          const updating = yield* Effect.forkScoped(
            Effect.exit(
              flow.updateDecoded(() =>
                // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                Deferred.succeed(updateEntered, undefined).pipe(
                  Effect.andThen(Effect.never),
                  Effect.ensuring(
                    Effect.sync(() => {
                      finalizers.push('updater')
                    }).pipe(
                      Effect.andThen(Effect.die('updater finalizer defect'))
                    )
                  )
                )
              )
            )
          )

          const observing = yield* Effect.forkScoped(
            Effect.exit(
              flow.observe(() =>
                // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                Deferred.succeed(listenerEntered, undefined).pipe(
                  Effect.andThen(Effect.never),
                  Effect.ensuring(
                    Effect.sync(() => {
                      finalizers.push('listener')
                    }).pipe(
                      Effect.andThen(Effect.die('listener finalizer defect'))
                    )
                  )
                )
              )
            )
          )

          yield* Deferred.await(updateEntered)
          yield* Deferred.await(listenerEntered)
          yield* Scope.close(owner, Exit.void)
          expect({
            assertion0: failureOf(yield* Fiber.join(updating)),
            assertion1: Boolean(Exit.isSuccess(yield* Fiber.join(observing))),
          }).toStrictEqual({
            assertion0: Option.some(FlowTypedFailureSchema.members[2].make({})),
            assertion1: true,
          })
        })
      )
    )
    expect({
      assertion0: finalizers.toSorted(),
      assertion1: releases,
    }).toStrictEqual({
      assertion0: ['listener', 'updater'],
      assertion1: [0],
    })
  })
})

describe('completed reservation handoff against terminal activation failure', () => {
  it.each([
    'signal-then-return',
    'signal-and-yield',
    'signal-finalizer',
    'signal-finalizer-yield',
  ])(
    'core receives and releases reservation4 under %s without acceptance',
    async (scheduling) => {
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runCompletedReservationRace() {
            const owner = yield* Scope.make()
            const initialReleased = yield* Deferred.make<boolean>()
            const activationOne = yield* Deferred.make<boolean>()
            const failOne = yield* Deferred.make<boolean>()
            const observedThree = yield* Deferred.make<boolean>()
            const releases: number[] = []
            const activations: number[] = []
            const observations: number[] = []
            let updateCalls = 0

            const flow = yield* makeTypedFlow({
              contract,
              viewport,
              initial: { kind: 'decoded', input: document },
              checkpointGate: {
                stage: (checkpoint) => {
                  const reservation = {
                    isCurrent: () => true,
                    // No provider partial-acquisition cleanup calls this Effect. A call for4 proves core received its reservation.
                    abort: Effect.sync(() => {
                      releases.push(checkpoint.revision)
                    }).pipe(
                      Effect.andThen(
                        checkpoint.revision === 0
                          ? Deferred.succeed(initialReleased, true)
                          : Effect.void
                      )
                    ),
                    accepted: Effect.gen(function* runActivateCheckpoint() {
                      activations.push(checkpoint.revision)

                      if (checkpoint.revision === 1) {
                        yield* Deferred.succeed(activationOne, true)
                        yield* Deferred.await(failOne)

                        return yield* Effect.fail<FlowTypedFailure>(
                          FlowTypedFailureSchema.members[1].make({
                            message: 'Activation1 failed',
                          })
                        )
                      }
                    }),
                  }

                  if (checkpoint.revision !== 4) {
                    return Effect.succeed(reservation)
                  }

                  const signal = Deferred.succeed(failOne, true).pipe(
                    Effect.asVoid
                  )

                  switch (scheduling) {
                    case 'signal-then-return': {
                      return signal.pipe(Effect.as(reservation))
                    }

                    case 'signal-and-yield': {
                      return signal.pipe(
                        Effect.andThen(Effect.yieldNow),
                        Effect.as(reservation)
                      )
                    }

                    case 'signal-finalizer': {
                      return Effect.succeed(reservation).pipe(
                        Effect.onExit(() => signal)
                      )
                    }

                    default: {
                      return Effect.succeed(reservation).pipe(
                        Effect.onExit(() =>
                          signal.pipe(Effect.andThen(Effect.yieldNow))
                        )
                      )
                    }
                  }
                },
              },
            }).pipe(Scope.provide(owner))

            yield* Deferred.await(initialReleased)

            yield* Effect.forkScoped(
              flow.observe((snapshot) =>
                Effect.sync(() => {
                  observations.push(snapshot.revision)
                }).pipe(
                  Effect.andThen(
                    snapshot.revision === 3
                      ? Deferred.succeed(observedThree, true).pipe(
                          Effect.asVoid
                        )
                      : Effect.void
                  )
                )
              )
            )
            yield* flow.replaceDecoded(document, 0)
            yield* Deferred.await(activationOne)
            yield* flow.replaceDecoded(document, 1)
            yield* flow.replaceDecoded(document, 2)
            yield* Deferred.await(observedThree)
            const four = yield* Effect.exit(flow.replaceDecoded(document, 3))

            const subsequent = yield* Effect.exit(
              flow.updateDecoded((snapshot) =>
                Effect.sync(() => {
                  updateCalls += 1

                  return snapshot.document
                })
              )
            )

            const snapshot = yield* flow.readSnapshot()
            const encoded = yield* flow.encodeDocument()
            yield* Scope.close(owner, Exit.void)

            return {
              four: failureOf(four),
              subsequent: failureOf(subsequent),
              revision: snapshot.revision,
              document: snapshot.document,
              encoded,
              releases: releases.toSorted(),
              activations,
              observations,
              updateCalls,
            }
          })
        )
      )

      expect(result).toStrictEqual({
        four: Option.some(
          FlowTypedFailureSchema.members[4].make({
            revision: 1,
            message: 'Checkpoint activation failed',
          })
        ),
        subsequent: Option.some(
          FlowTypedFailureSchema.members[4].make({
            revision: 1,
            message: 'Checkpoint activation failed',
          })
        ),
        revision: 3,
        document,
        encoded: document,
        releases: [0, 1, 2, 3, 4],
        activations: [0, 1],
        observations: [0, 1, 2, 3],
        updateCalls: 0,
      })
    }
  )
})

describe('cooperative shutdown through each public preparation boundary', () => {
  it.each([
    'capture',
    'decoder',
    'isolation',
    'checker',
    'encoder',
    'stage',
    'updater',
    'observer',
  ])(
    'settles and joins while %s suspends without services',
    async (boundary) => {
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runBoundaryShutdown() {
            const owner = yield* Scope.make()
            const entered = yield* Deferred.make<boolean>()
            const initialReleased = yield* Deferred.make<boolean>()
            const releases: number[] = []
            let pause = false
            let finalized = 0

            const suspendAt = (step: string) =>
              Effect.suspend(() => {
                if (!pause || boundary !== step) {
                  return Effect.void
                }

                pause = false

                return Deferred.succeed(entered, true).pipe(
                  Effect.andThen(Effect.never),
                  Effect.ensuring(
                    Effect.sync(() => {
                      finalized += 1
                    })
                  )
                )
              })

            const Checked = S.declareConstructor<
              typeof FlowDocumentSchema.Type
            >()(
              [],
              () => (input) =>
                S.decodeUnknownEffect(FlowDocumentSchema)(input).pipe(
                  Effect.mapError((error) => error.issue),
                  Effect.tap(() => suspendAt('checker'))
                ),
              {
                toCodecJson: () =>
                  S.link<typeof FlowDocumentSchema.Type>()(
                    FlowDocumentSchema,
                    ST.transform({
                      decode: (value) => value,
                      encode: (value) => value,
                    })
                  ),
              }
            )

            const Codec = FlowDocumentSchema.pipe(
              S.decodeTo(Checked, {
                decode: G.transformEffect((value) =>
                  suspendAt('decoder').pipe(Effect.as(value))
                ),
                encode: G.transformEffect((value) =>
                  suspendAt('encoder').pipe(Effect.as(value))
                ),
              })
            )

            const owned = defineFlowDataContract({
              id: '089/suspension',
              document: Codec,
              isolation: {
                detach: (value: typeof Codec.Type) =>
                  suspendAt('isolation').pipe(
                    Effect.andThen(Effect.sync(() => structuredClone(value)))
                  ),
              },
            })

            const flow = yield* makeTypedFlow({
              contract: owned,
              viewport,
              initial: { kind: 'decoded', input: document },
              encodedInputCapture: {
                capture: (input) =>
                  suspendAt('capture').pipe(
                    Effect.andThen(Effect.sync(() => structuredClone(input)))
                  ),
              },
              checkpointGate: {
                stage: (checkpoint) =>
                  suspendAt('stage').pipe(
                    Effect.as({
                      isCurrent: () => true,
                      abort: Effect.sync(() => {
                        releases.push(checkpoint.revision)
                      }).pipe(
                        Effect.andThen(
                          checkpoint.revision === 0
                            ? Deferred.succeed(initialReleased, true)
                            : Effect.void
                        )
                      ),
                      accepted: Effect.void,
                    })
                  ),
              },
            }).pipe(Scope.provide(owner))

            yield* Deferred.await(initialReleased)
            const before = yield* flow.readSnapshot()
            pause = true

            const pending = Effect.suspend(() => {
              if (boundary === 'observer') {
                return flow.observe(() => suspendAt('observer'))
              }

              if (boundary === 'updater') {
                return flow.updateDecoded((snapshot) =>
                  suspendAt('updater').pipe(Effect.as(snapshot.document))
                )
              }

              return boundary === 'capture' || boundary === 'decoder'
                ? flow.replaceEncoded(document, 0)
                : flow.replaceDecoded(document, 0)
            })

            const call = yield* Effect.forkScoped(Effect.exit(pending))
            yield* Deferred.await(entered)
            yield* Scope.close(owner, Exit.void)
            const outcome = yield* Fiber.join(call)
            const future = yield* Effect.exit(flow.readSnapshot())

            return {
              before: before.revision,

              failure: failureOf(outcome),
              healthyObserver:
                boundary === 'observer' && Exit.isSuccess(outcome),
              future: failureOf(future),
              finalized,

              releases,
            }
          })
        )
      )

      expect(result).toStrictEqual({
        before: 0,
        failure:
          boundary === 'observer'
            ? Option.none()
            : Option.some(FlowTypedFailureSchema.members[2].make({})),
        healthyObserver: boundary === 'observer',
        future: Option.some(FlowTypedFailureSchema.members[2].make({})),
        finalized: 1,
        releases: [0],
      })
    }
  )
})

describe('initial staging and complete checkpoint rejection boundaries', () => {
  it.each(['failure', 'expired', 'throws'])(
    'returns no actor for initial %s reservation',
    async (mode) => {
      let stages = 0
      let activations = 0
      let releases = 0

      const result = await Effect.runPromiseExit(
        Effect.scoped(
          makeTypedFlow({
            contract,
            viewport,
            initial: { kind: 'decoded', input: document },
            checkpointGate: {
              stage: () => {
                stages += 1

                if (mode === 'failure') {
                  return Effect.fail<FlowTypedFailure>(
                    FlowTypedFailureSchema.members[1].make({
                      message: 'Initial provider rejected',
                    })
                  )
                }

                return Effect.succeed({
                  isCurrent: () => {
                    if (mode === 'throws') {
                      throw new Error('Initial predicate defect')
                    }

                    return false
                  },
                  abort: Effect.sync(() => {
                    releases += 1
                  }),
                  accepted: Effect.sync(() => {
                    activations += 1
                  }),
                })
              },
            },
          })
        )
      )

      expect({
        result: failureOf(result),
        stages,

        releases,
        activations,
      }).toStrictEqual({
        result: Option.some(
          FlowTypedFailureSchema.members[4].make({
            revision: 0,
            message: Match.value(mode).pipe(
              Match.when('failure', () => 'Checkpoint staging failed'),
              Match.when(
                'expired',
                () => 'Checkpoint reservation is no longer current'
              ),
              Match.orElse(() => 'Checkpoint reservation check failed')
            ),
          })
        ),
        stages: 1,
        releases: mode === 'failure' ? 0 : 1,
        activations: 0,
      })
    }
  )

  it('postcreation activation0 failure preserves core0 and uses sticky accepted revision0', async () => {
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runInitialActivationFailure() {
          const owner = yield* Scope.make()
          const released = yield* Deferred.make<boolean>()
          const identities: number[] = []
          let updaters = 0

          const flow = yield* makeTypedFlow({
            contract,
            viewport,
            initial: { kind: 'decoded', input: document },
            checkpointGate: {
              stage: (checkpoint) =>
                Effect.succeed({
                  isCurrent: () => true,
                  abort: Effect.sync(() => {
                    identities.push(checkpoint.revision)
                  }).pipe(Effect.andThen(Deferred.succeed(released, true))),
                  accepted: Effect.fail<FlowTypedFailure>(
                    FlowTypedFailureSchema.members[1].make({
                      message: 'Initial activation failed',
                    })
                  ),
                }),
            },
          }).pipe(Scope.provide(owner))

          yield* Deferred.await(released)

          const rejection = yield* Effect.exit(
            flow.updateDecoded((snapshot) =>
              Effect.sync(() => {
                updaters += 1

                return snapshot.document
              })
            )
          )

          const snapshot = yield* flow.readSnapshot()
          const encoded = yield* flow.encodeDocument()
          yield* Scope.close(owner, Exit.void)

          return {
            rejection: failureOf(rejection),
            revision: snapshot.revision,
            document: snapshot.document,
            encoded,
            updaters,
            identities,
          }
        })
      )
    )

    expect(result).toStrictEqual({
      rejection: Option.some(
        FlowTypedFailureSchema.members[4].make({
          revision: 0,
          message: 'Checkpoint activation failed',
        })
      ),
      revision: 0,
      document,
      encoded: document,
      updaters: 0,
      identities: [0],
    })
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'retains installed Number JSON encoding for document coordinate %s',
    async (coordinate) => {
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runCompleteCheckpointFailure() {
            let stages = 0

            const flow = yield* makeTypedFlow({
              contract,
              viewport,
              initial: { kind: 'decoded', input: document },
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

            const invalid = S.decodeUnknownSync(FlowDocumentSchema)({
              nodes: [
                { id: 'a', label: 'a', position: { x: coordinate, y: 0 } },
              ],
              edges: [],
            })

            const rejected = yield* Effect.exit(flow.replaceDecoded(invalid, 0))
            const current = yield* flow.readSnapshot()

            return {
              failure: failureOf(rejected),
              stages,
              revision: current.revision,
              document: current.document,

              encoded: yield* flow.encodeDocument(),
            }
          })
        )
      )

      expect(result).toStrictEqual({
        failure: Option.none(),

        stages: 2,
        revision: 1,
        document: S.decodeUnknownSync(FlowDocumentSchema)({
          nodes: [{ id: 'a', label: 'a', position: { x: coordinate, y: 0 } }],
          edges: [],
        }),

        encoded: {
          nodes: [
            { id: 'a', label: 'a', position: { x: String(coordinate), y: 0 } },
          ],
          edges: [],
        },
      })
    }
  )
})

const integrityNodeA = { id: 'a', label: 'A', position: { x: 0, y: 0 } }

const integrityNodeB = { id: 'b', label: 'B', position: { x: 0, y: 0 } }

const integrityEdge = { id: 'e', source: 'a', target: 'b' }

const integrityCases = [
  ['DuplicateNodeId', { nodes: [integrityNodeA, integrityNodeA], edges: [] }],
  [
    'MissingParentNode',
    { nodes: [{ ...integrityNodeA, parentId: 'missing' }], edges: [] },
  ],
  [
    'ParentExtentWithoutParent',
    { nodes: [{ ...integrityNodeA, extent: 'parent' }], edges: [] },
  ],
  [
    'SelfParentNode',
    { nodes: [{ ...integrityNodeA, parentId: 'a' }], edges: [] },
  ],
  [
    'ParentCycle',
    {
      nodes: [
        { ...integrityNodeA, parentId: 'b' },
        { ...integrityNodeB, parentId: 'a' },
      ],
      edges: [],
    },
  ],
  [
    'DuplicateEdgeId',
    {
      nodes: [integrityNodeA, integrityNodeB],
      edges: [integrityEdge, integrityEdge],
    },
  ],
  [
    'DuplicateHandleId',
    {
      nodes: [
        {
          ...integrityNodeA,
          handles: [
            { id: 'h', kind: 'source', side: 'right' },
            { id: 'h', kind: 'target', side: 'left' },
          ],
        },
      ],
      edges: [],
    },
  ],
  ['MissingEdgeEndpoint', { nodes: [integrityNodeA], edges: [integrityEdge] }],
  [
    'MissingEdgeHandle',
    {
      nodes: [integrityNodeA, integrityNodeB],
      edges: [{ ...integrityEdge, sourceHandle: 'missing' }],
    },
  ],
  [
    'DuplicateNodeId',
    {
      nodes: [{ ...integrityNodeA, parentId: 'missing' }, integrityNodeA],
      edges: [{ ...integrityEdge, sourceHandle: 'missing' }, integrityEdge],
    },
  ],
] satisfies readonly (readonly [string, unknown])[]

describe('typed actor retains the authoritative integrity traversal', () => {
  it.each(integrityCases)(
    'preserves exact %s payload and no acceptance',
    async (tag, raw) => {
      const candidate = S.decodeUnknownSync(FlowDocumentSchema)(raw)

      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runIntegrityRejection() {
            const expected = yield* Effect.exit(
              validateFlowGraphDocument(candidate)
            )

            let stages = 0
            const seen: number[] = []
            const initialSeen = yield* Deferred.make<boolean>()

            const flow = yield* makeTypedFlow({
              contract,
              viewport,
              initial: { kind: 'decoded', input: document },
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

            const listener = yield* Effect.forkScoped(
              flow.observe((snapshot) =>
                Effect.sync(() => {
                  seen.push(snapshot.revision)
                }).pipe(
                  Effect.andThen(Deferred.succeed(initialSeen, true)),
                  Effect.asVoid
                )
              )
            )

            yield* Deferred.await(initialSeen)
            const actual = yield* Effect.exit(flow.replaceDecoded(candidate, 0))
            const snapshot = yield* flow.readSnapshot()
            yield* Fiber.interrupt(listener)

            return {
              expected: failureOf(expected),
              actual: failureOf(actual),
              stages,
              revision: snapshot.revision,
              seen,
            }
          })
        )
      )

      expect({
        assertion0: result.actual,
        assertion1: result.actual.pipe(Option.map((failure) => failure._tag)),
        assertion2: {
          stages: result.stages,
          revision: result.revision,

          seen: result.seen,
        },
      }).toStrictEqual({
        assertion0: result.expected,
        assertion1: Option.some(tag),
        assertion2: { stages: 1, revision: 0, seen: [0] },
      })
    }
  )
})

describe('actual malformed JSON representation output', () => {
  it.each(['NaN', 'Infinity', '-Infinity', 'prototype'])(
    'rejects caller JSON representation %s before mandatory staging',
    async (kind) => {
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runMalformedOutput() {
            let malformed = false
            let stages = 0

            const Codec = S.declareConstructor<
              typeof FlowDocumentSchema.Type
            >()(
              [],
              () => (input) =>
                S.decodeUnknownEffect(FlowDocumentSchema)(input).pipe(
                  Effect.mapError((error) => error.issue)
                ),
              {
                toCodecJson: () =>
                  S.link<typeof FlowDocumentSchema.Type>()(
                    S.Json,
                    ST.transform({
                      decode: () => document,
                      encode: (): S.Json => {
                        if (!malformed) {
                          return { nodes: [], edges: [] }
                        }

                        if (kind === 'prototype') {
                          const output: S.Json = { nodes: [], edges: [] }
                          Object.setPrototypeOf(output, { custom: true })

                          return output
                        }

                        return Number(kind)
                      },
                    })
                  ),
              }
            )

            const owned = defineFlowDataContract({
              id: '089/malformed-output',
              document: Codec,
              isolation: {
                detach: (value: typeof Codec.Type) =>
                  Effect.sync(() => structuredClone(value)),
              },
            })

            const flow = yield* makeTypedFlow({
              contract: owned,
              viewport,
              initial: { kind: 'decoded', input: document },
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

            malformed = true

            const rejected = yield* Effect.exit(
              flow.replaceDecoded(document, 0)
            )

            malformed = false
            const current = yield* flow.readSnapshot()

            return {
              failure: failureOf(rejected),
              stages,
              revision: current.revision,
              document: current.document,
            }
          })
        )
      )

      expect(result).toStrictEqual({
        failure: Option.some(
          FlowTypedFailureSchema.members[0].make({
            operation: 'encode',
            message: 'Flow document encoding failed',
          })
        ),
        stages: 1,
        revision: 0,

        document,
      })
    }
  )
})

describe('activation callback interruption while its actor remains open', () => {
  it('terminally rejects pending and new writes for an accepted callback self-interruption', async () => {
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runSelfInterruptingActivation() {
          const owner = yield* Scope.make()
          const initialDone = yield* Deferred.make<boolean>()
          const enteredOne = yield* Deferred.make<boolean>()
          const interruptOne = yield* Deferred.make<boolean>()
          const releasedOne = yield* Deferred.make<boolean>()
          const activations: number[] = []
          const releases: number[] = []
          let updaterCalls = 0

          const flow = yield* makeTypedFlow({
            contract,
            viewport,
            initial: { kind: 'decoded', input: document },
            checkpointGate: {
              stage: (checkpoint) =>
                Effect.succeed({
                  isCurrent: () => true,
                  abort: Effect.sync(() => {
                    releases.push(checkpoint.revision)
                  }).pipe(
                    Effect.andThen(
                      Effect.suspend(() => {
                        if (checkpoint.revision === 0) {
                          return Deferred.succeed(initialDone, true).pipe(
                            Effect.asVoid
                          )
                        }

                        return checkpoint.revision === 1
                          ? Deferred.succeed(releasedOne, true).pipe(
                              Effect.asVoid
                            )
                          : Effect.void
                      })
                    )
                  ),
                  accepted: Effect.gen(function* runInterruptedActivation() {
                    activations.push(checkpoint.revision)

                    if (checkpoint.revision === 1) {
                      yield* Deferred.succeed(enteredOne, true)
                      yield* Deferred.await(interruptOne)

                      return yield* Effect.interrupt
                    }
                  }),
                }),
            },
          }).pipe(Scope.provide(owner))

          yield* Deferred.await(initialDone)
          yield* flow.replaceDecoded(document, 0)
          yield* Deferred.await(enteredOne)
          yield* flow.replaceDecoded(document, 1)
          yield* flow.replaceDecoded(document, 2)
          yield* Deferred.succeed(interruptOne, true)
          yield* Deferred.await(releasedOne)

          const subsequent = yield* Effect.exit(
            flow.updateDecoded((snapshot) =>
              Effect.sync(() => {
                updaterCalls += 1

                return snapshot.document
              })
            )
          )

          const snapshot = yield* flow.readSnapshot()
          yield* Scope.close(owner, Exit.void)

          return {
            subsequent: failureOf(subsequent),
            revision: snapshot.revision,
            activations,
            releases: releases.toSorted(),
            updaterCalls,
          }
        })
      )
    )

    expect(result).toStrictEqual({
      subsequent: Option.some(
        FlowTypedFailureSchema.members[4].make({
          revision: 1,

          message: 'Checkpoint activation failed',
        })
      ),
      revision: 3,

      activations: [0, 1],
      releases: [0, 1, 2, 3],
      updaterCalls: 0,
    })
  })
})

describe('typed product boundary completeness controls', () => {
  it('retains actual typed edges and rejects wrong node/edge discriminator data before acceptance', async () => {
    const calls = {
      rd: new Array<string>(),
      re: new Array<string>(),
      ri: new Array<string>(),
    }

    const result = await Effect.runPromise(
      provideTyped(
        Effect.scoped(
          Effect.gen(function* runRealTypedPairs() {
            let stages = 0

            const flow = yield* makeTypedFlow({
              contract: typedContract,
              viewport,
              initial: { kind: 'encoded', input: rawTypedDocument },
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

            const edges = yield* flow.readEdges()

            const node = yield* flow.readNode(
              TypedDated.fields.id.make('dated')
            )

            const edge = yield* flow.readEdge(
              TypedEdge.fields.id.make('weighted')
            )

            const badNode = yield* Effect.exit(
              flow.replaceEncoded(
                {
                  ...rawTypedDocument,
                  nodes: [
                    {
                      ...rawTypedDocument.nodes[1],
                      type: 'dated',
                      data: { count: 7 },
                    },
                  ],
                },
                0
              )
            )

            const badEdge = yield* Effect.exit(
              flow.replaceEncoded(
                {
                  ...rawTypedDocument,
                  edges: [{ ...rawTypedDocument.edges[0], data: { count: 7 } }],
                },
                0
              )
            )

            const afterFailures = yield* flow.readSnapshot()
            yield* flow.replaceDecoded(afterFailures.document, 0)
            yield* flow.updateDecoded((snapshot) =>
              Effect.succeed(snapshot.document)
            )

            return {
              edges,
              node: node.pipe(Option.map((value) => value.type)),
              edge: edge.pipe(Option.map((value) => value.data.weight)),
              badNode: failureOf(badNode),
              badEdge: failureOf(badEdge),
              rejectedRevision: afterFailures.revision,
              stages,
              finalRevision: (yield* flow.readSnapshot()).revision,
              encoded: yield* flow.encodeDocument(),
            }
          })
        ),
        'typed-pairs',
        calls
      )
    )

    const rejected = Option.some(
      FlowTypedFailureSchema.members[0].make({
        operation: 'decode',
        message: 'Invalid encoded Flow document',
      })
    )

    expect(result).toStrictEqual({
      edges: rawTypedDocument.edges,
      node: Option.some('dated'),
      edge: Option.some(2),
      badNode: rejected,
      badEdge: rejected,
      rejectedRevision: 0,
      stages: 3,
      finalRevision: 2,
      encoded: rawTypedDocument,
    })
  })

  it('rejects fake private classes and exhibits an explicitly unsafe singleton isolation capability without admitting it', async () => {
    const calls = {
      rd: new Array<string>(),
      re: new Array<string>(),
      ri: new Array<string>(),
    }

    const decoded = await Effect.runPromise(
      provideTyped(
        S.decodeUnknownEffect(TypedDocument)(rawTypedDocument),
        'trust-control',
        calls
      )
    )

    const fake = {
      ...decoded,
      nodes: decoded.nodes.map((node) =>
        node.type === 'dated'
          ? { ...node, data: { ...node.data, counter: { read: () => 5 } } }
          : node
      ),
    }

    const rejected = await Effect.runPromiseExit(
      S.decodeUnknownEffect(S.toType(TypedDocument))(fake)
    )

    const singleton = defineFlowDataContract({
      id: 'explicitly-unsafe-singleton-control',
      document: TypedDocument,
      isolation: {
        detach: (input: typeof TypedDocument.Type) => Effect.succeed(input),
      },
    })

    const first = await Effect.runPromise(singleton.isolation.detach(decoded))
    const second = await Effect.runPromise(singleton.isolation.detach(decoded))
    getDated(first).data.counter.increment()
    expect({
      fakeRejected: Exit.isFailure(rejected),
      sameGraph: Object.is(first, decoded),
      sameCounter: Object.is(
        getDated(first).data.counter,
        getDated(second).data.counter
      ),
      sameDate: Object.is(
        getDated(first).data.date,
        getDated(second).data.date
      ),
      retainedMutation: getDated(second).data.counter.read(),
    }).toStrictEqual({
      fakeRejected: true,
      sameGraph: true,
      sameCounter: true,
      sameDate: true,
      retainedMutation: 6,
    })
  })

  it('listener failure and caller interruption remove only their own registration', async () => {
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runIndependentListenerTermination() {
          const observedTwo = yield* Deferred.make<boolean>()
          const cancelledInitial = yield* Deferred.make<boolean>()
          const observations: number[] = []
          const cancelledObservations: number[] = []
          let failingCalls = 0
          let cancelledFinalizers = 0

          const flow = yield* makeTypedFlow({
            contract,
            viewport,
            initial: { kind: 'decoded', input: document },
          })

          const healthy = yield* Effect.forkScoped(
            flow.observe((snapshot) =>
              Effect.sync(() => {
                observations.push(snapshot.revision)
              }).pipe(
                Effect.andThen(
                  snapshot.revision === 2
                    ? Deferred.succeed(observedTwo, true).pipe(Effect.asVoid)
                    : Effect.void
                )
              )
            )
          )

          const failing = yield* Effect.forkScoped(
            Effect.exit(
              flow.observe(() =>
                Effect.sync(() => {
                  failingCalls += 1
                }).pipe(
                  Effect.andThen(
                    Effect.fail<FlowTypedFailure>(
                      FlowTypedFailureSchema.members[1].make({
                        message: 'Listener rejected',
                      })
                    )
                  )
                )
              )
            )
          )

          const failure = yield* Fiber.join(failing)

          const cancelled = yield* Effect.forkScoped(
            flow.observe((snapshot) =>
              Effect.sync(() => {
                cancelledObservations.push(snapshot.revision)
              }).pipe(
                Effect.andThen(Deferred.succeed(cancelledInitial, true)),
                Effect.andThen(Effect.never),
                Effect.ensuring(
                  Effect.sync(() => {
                    cancelledFinalizers += 1
                  })
                )
              )
            )
          )

          yield* Deferred.await(cancelledInitial)
          yield* Fiber.interrupt(cancelled)
          const cancellation = yield* Fiber.await(cancelled)
          yield* flow.replaceDecoded(document, 0)
          yield* flow.replaceDecoded(document, 1)
          yield* Deferred.await(observedTwo)
          yield* Fiber.interrupt(healthy)

          return {
            failure: failureOf(failure),
            interrupted:
              Exit.isFailure(cancellation) &&
              Cause.hasInterrupts(cancellation.cause),
            failingCalls,
            cancelledFinalizers,
            observations,
            cancelledObservations,
            revision: (yield* flow.readSnapshot()).revision,
          }
        })
      )
    )

    expect(result).toStrictEqual({
      failure: Option.some(
        FlowTypedFailureSchema.members[1].make({ message: 'Listener rejected' })
      ),
      interrupted: true,
      failingCalls: 1,
      cancelledFinalizers: 1,
      observations: [0, 1, 2],
      cancelledObservations: [0],
      revision: 2,
    })
  })
})

describe('actor default and optional payload preservation', () => {
  it('preserves nested Date defaults, optional data, untagged and own-undefined no-data across every write path', async () => {
    const iso = '2026-10-02T00:00:00.000Z'

    const Defaulted = createFlowNodeVariantSchema({
      type: S.Literal('date-default'),
      data: TypedDate.pipe(S.withDecodingDefaultKey(Effect.succeed(iso))),
    })

    const Optional = createFlowNodeVariantSchema({
      type: S.optional(S.Literal('optional')),
      data: S.optionalKey(S.Number),
    })

    const NoData = createFlowNodeVariantSchema({
      type: S.optional(S.Undefined),
      data: S.optional(S.Undefined),
    })

    const Base = createFlowDataDocumentSchema({
      nodes: S.Union([Defaulted, Optional, NoData]),
      edges: TypedEdge,
    })

    const Document = S.Struct({ ...Base.fields, metadata: S.String })

    const owned = defineFlowDataContract({
      id: 'default-optional-actor',
      document: Document,
      isolation: {
        detach: (input: typeof Document.Type) =>
          Effect.sync(() => structuredClone(input)),
      },
    })

    const input = {
      nodes: [
        {
          id: 'default',
          label: 'Default',
          position: { x: 0, y: 0 },
          type: 'date-default',
        },
        {
          id: 'optional',
          label: 'Optional',
          position: { x: 1, y: 0 },
          type: 'optional',
        },
        {
          id: 'untagged',
          label: 'Untagged',
          position: { x: 2, y: 0 },
          data: 11,
        },
        {
          id: 'empty',
          label: 'Empty',
          position: { x: 3, y: 0 },
          type: undefined,
          data: undefined,
        },
      ],
      edges: [],
      metadata: 'default-metadata',
    }

    const receipt = (snapshot: FlowTypedSnapshot<typeof Document>) => ({
      revision: snapshot.revision,
      metadata: snapshot.document.metadata,
      nodes: snapshot.document.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        hasType: Object.hasOwn(node, 'type'),
        hasData: Object.hasOwn(node, 'data'),
        data:
          node.type === 'date-default' ? node.data.toISOString() : node.data,
      })),
    })

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runDefaultOptionalActor() {
          let captures = 0

          const flow = yield* makeTypedFlow({
            contract: owned,
            viewport,
            initial: { kind: 'encoded', input },
            encodedInputCapture: {
              capture: (value) =>
                Effect.sync(() => {
                  captures += 1

                  return structuredClone(value)
                }),
            },
          })

          const first = yield* flow.readSnapshot()
          const initial = receipt(first)

          const date = first.document.nodes.find(
            (node) => node.type === 'date-default'
          )

          if (date?.type === 'date-default') {
            date.data.setTime(0)
          }

          const retained = receipt(yield* flow.readSnapshot())
          yield* flow.replaceEncoded(input, 0)
          const replacedEncoded = receipt(yield* flow.readSnapshot())
          const decoded = yield* flow.readSnapshot()
          yield* flow.replaceDecoded(decoded.document, 1)
          const replacedDecoded = receipt(yield* flow.readSnapshot())
          yield* flow.updateDecoded((snapshot) =>
            Effect.succeed(snapshot.document)
          )

          return {
            captures,
            initial,
            retained,
            replacedEncoded,
            replacedDecoded,
            updated: receipt(yield* flow.readSnapshot()),
            encoded: yield* flow.encodeDocument(),
          }
        })
      )
    )

    const nodes = [
      {
        id: 'default',
        type: 'date-default',
        hasType: true,
        hasData: true,
        data: iso,
      },
      {
        id: 'optional',
        type: 'optional',
        hasType: true,
        hasData: false,
        data: undefined,
      },
      {
        id: 'untagged',
        type: undefined,
        hasType: false,
        hasData: true,
        data: 11,
      },
      {
        id: 'empty',
        type: undefined,
        hasType: true,
        hasData: true,
        data: undefined,
      },
    ]

    expect({
      captures: result.captures,
      initial: result.initial,
      retained: result.retained,
      replacedEncoded: result.replacedEncoded,
      replacedDecoded: result.replacedDecoded,
      updated: result.updated,
    }).toStrictEqual({
      captures: 2,
      initial: { revision: 0, metadata: 'default-metadata', nodes },
      retained: { revision: 0, metadata: 'default-metadata', nodes },
      replacedEncoded: { revision: 1, metadata: 'default-metadata', nodes },
      replacedDecoded: { revision: 2, metadata: 'default-metadata', nodes },
      updated: { revision: 3, metadata: 'default-metadata', nodes },
    })
    expect(result.encoded).toStrictEqual({
      nodes: [
        {
          id: 'default',
          label: 'Default',
          position: { x: 0, y: 0 },
          type: 'date-default',
          data: iso,
        },
        {
          id: 'optional',
          label: 'Optional',
          position: { x: 1, y: 0 },
          type: 'optional',
        },
        {
          id: 'untagged',
          label: 'Untagged',
          position: { x: 2, y: 0 },
          data: 11,
        },
        {
          id: 'empty',
          label: 'Empty',
          position: { x: 3, y: 0 },
          type: null,
          data: null,
        },
      ],
      edges: [],
      metadata: 'default-metadata',
    })
  })
})

describe('supplied decoder services execute asynchronously per operation', () => {
  it('suspends a later supplied service outside the owner, conflicts once and preserves an actual asynchronous service failure', async () => {
    const Service = Context.Service<
      '089/unit/async-decoder',
      {
        readonly name: string
        readonly wait: Effect.Effect<void, SchemaIssue.Issue>
        readonly calls: string[]
      }
    >('089/unit/async-decoder')

    const Data = S.String.pipe(
      S.decodeTo(S.String, {
        decode: G.transformEffect((value) =>
          Service.pipe(
            Effect.flatMap((service) =>
              Effect.sync(() => {
                service.calls.push(service.name)
              }).pipe(Effect.andThen(service.wait), Effect.as(value))
            )
          )
        ),
        encode: G.transform((value) => value),
      })
    )

    const Node = createFlowNodeVariantSchema({
      type: S.Literal('async-service'),
      data: Data,
    })

    const Document = createFlowDataDocumentSchema({
      nodes: Node,
      edges: TypedEdge,
    })

    const owned = defineFlowDataContract({
      id: 'actual-asynchronous-service',
      document: Document,
      isolation: {
        detach: (input: typeof Document.Type) =>
          Effect.sync(() => structuredClone(input)),
      },
    })

    const input = {
      nodes: [
        {
          id: 'service',
          label: 'Service',
          position: { x: 0, y: 0 },
          type: 'async-service',
          data: 'initial',
        },
      ],
      edges: [],
    }

    const decoded = S.decodeUnknownSync(S.toType(Document))(input)

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runSuppliedAsynchronousService() {
          const entered = yield* Deferred.make<boolean>()
          const resume = yield* Deferred.make<boolean>()
          const calls: string[] = []

          const flow = yield* makeTypedFlow({
            contract: owned,
            viewport,
            initial: { kind: 'decoded', input: decoded },
          })

          const slow = yield* Effect.forkScoped(
            Effect.exit(
              flow.replaceEncoded(input, 0).pipe(
                Effect.provideService(Service, {
                  name: 'later-suspended',
                  calls,
                  wait: Deferred.succeed(entered, true).pipe(
                    Effect.andThen(Deferred.await(resume)),
                    Effect.asVoid
                  ),
                })
              )
            )
          )

          yield* Deferred.await(entered)
          const whileSuspended = yield* flow.readSnapshot()
          yield* flow.replaceDecoded(
            {
              ...decoded,
              nodes: decoded.nodes.map((node) => ({ ...node, data: 'fast' })),
            },
            0
          )
          yield* Deferred.succeed(resume, true)
          const conflict = yield* Fiber.join(slow)

          const failed = yield* Effect.exit(
            flow.replaceEncoded(input, 1).pipe(
              Effect.provideService(Service, {
                name: 'later-failed',
                calls,
                wait: Effect.yieldNow.pipe(
                  Effect.andThen(
                    Effect.fail(
                      new SchemaIssue.InvalidValue(
                        { message: 'Supplied asynchronous service failed' },
                        input
                      )
                    )
                  )
                ),
              })
            )
          )

          const snapshot = yield* flow.readSnapshot()

          return {
            calls,
            whileSuspended: whileSuspended.revision,
            conflict: failureOf(conflict),
            failed: failureOf(failed),
            revision: snapshot.revision,
            data: snapshot.document.nodes.map((node) => node.data),
          }
        })
      )
    )

    expect(result).toStrictEqual({
      calls: ['later-suspended', 'later-failed'],
      whileSuspended: 0,
      conflict: Option.some(
        FlowTypedFailureSchema.members[3].make({ expected: 0, actual: 1 })
      ),
      failed: Option.some(
        FlowTypedFailureSchema.members[0].make({
          operation: 'decode',
          message: 'Invalid encoded Flow document',
        })
      ),
      revision: 1,
      data: ['fast'],
    })
  })
})

const DiagnosticMessage = S.Struct({
  [FlowAttribute.failureName]: S.String,
  [FlowAttribute.failureMessage]: FlowTypedFailureSchema,
})

const captureDiagnostics = (onLog: () => void = () => {}) => {
  const records: {
    readonly cause: Cause.Cause<unknown>
    readonly message: typeof DiagnosticMessage.Type
    readonly span: string | undefined
  }[] = []

  const logger = Logger.make((event) => {
    if (!S.is(S.Array(S.Unknown))(event.message)) {
      return
    }

    for (const message of event.message) {
      if (S.is(DiagnosticMessage)(message)) {
        records.push({
          cause: event.cause,
          message,
          span:
            event.fiber.cache.span?._tag === 'Span'
              ? event.fiber.cache.span.name
              : undefined,
        })
        onLog()
      }
    }
  })

  return { records, layer: Logger.layer([logger]) }
}

const firstDiagnostic = (
  diagnostics: ReturnType<typeof captureDiagnostics>
) => {
  const [record] = diagnostics.records

  if (!record) {
    throw new Error('Missing original failure diagnostic')
  }

  return record
}

const issueContains = (
  issue: SchemaIssue.Issue,
  original: SchemaIssue.Issue
): boolean => {
  if (issue === original) {
    return true
  }

  return Match.value(issue).pipe(
    Match.tag('Filter', 'Encoding', 'Pointer', (nested) =>
      issueContains(nested.issue, original)
    ),
    Match.tag('Composite', 'AnyOf', (nested) =>
      nested.issues.some((child) => issueContains(child, original))
    ),
    Match.orElse(() => false)
  )
}

const schemaDiagnostic = (cause: Cause.Cause<unknown>) => {
  const original = Cause.findErrorOption(cause)

  if (Option.isNone(original) || !S.isSchemaError(original.value)) {
    throw new Error('Expected original SchemaError in diagnostic Cause')
  }

  return original.value
}

const assertDiagnostic = (
  record: ReturnType<typeof captureDiagnostics>['records'][number],
  failure: FlowTypedFailure
) => {
  expect({
    span: record.span,
    name: record.message[FlowAttribute.failureName],
    failure: record.message[FlowAttribute.failureMessage],
    hasCause: record.cause.reasons.length > 0,
  }).toStrictEqual({
    span: FlowSpan.editFailure,
    name: failure._tag,
    failure,
    hasCause: true,
  })
}

// These controls reach diagnostic boundaries through the exported actor and real installed Logger.
describe('typed actor original failure diagnostics', () => {
  it('retains the viewport SchemaError before rejecting creation and running document hooks', async () => {
    const diagnostics = captureDiagnostics()
    let hooks = 0

    const rejected = await Effect.runPromiseExit(
      Effect.scoped(
        makeTypedFlow({
          contract: defineFlowDataContract({
            id: 'diagnostic-viewport',
            document: FlowDocumentSchema,
            isolation: {
              detach: (value) =>
                Effect.sync(() => {
                  hooks += 1

                  return structuredClone(value)
                }),
            },
          }),
          viewport: { x: 0, y: 0, zoom: -1 },
          initial: { kind: 'decoded', input: document },
          checkpointGate: {
            stage: () =>
              Effect.sync(() => {
                hooks += 1

                return {
                  isCurrent: () => true,
                  abort: Effect.void,
                  accepted: Effect.void,
                }
              }),
          },
        })
      ).pipe(Effect.provide(diagnostics.layer))
    )

    const failure = FlowTypedFailureSchema.members[0].make({
      operation: 'encode',
      message: 'Invalid checkpoint viewport',
    })

    expect({
      failure: failureOf(rejected),
      hooks,
      logs: diagnostics.records.length,
    }).toStrictEqual({ failure: Option.some(failure), hooks: 0, logs: 1 })
    const record = firstDiagnostic(diagnostics)
    assertDiagnostic(record, failure)
    expect(schemaDiagnostic(record.cause).message).toContain('zoom')
  })

  it('retains the decode SchemaError while preserving the accepted revision', async () => {
    const diagnostics = captureDiagnostics()

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runDecodeDiagnostic() {
          const flow = yield* emptyActor()

          const rejected = yield* Effect.exit(
            flow.replaceEncoded({ nodes: 'malformed', edges: [] }, 0)
          )

          return {
            failure: failureOf(rejected),
            current: yield* flow.readSnapshot(),
          }
        })
      ).pipe(Effect.provide(diagnostics.layer))
    )

    const failure = FlowTypedFailureSchema.members[0].make({
      operation: 'decode',
      message: 'Invalid encoded Flow document',
    })

    expect(result).toStrictEqual({
      failure: Option.some(failure),
      current: { document, viewport, revision: 0 },
    })

    const original = diagnostics.records.find((record) =>
      Option.match(Cause.findErrorOption(record.cause), {
        onNone: () => false,
        onSome: S.isSchemaError,
      })
    )

    if (!original) {
      throw new Error('Missing original decode diagnostic')
    }

    assertDiagnostic(original, failure)
    expect(schemaDiagnostic(original.cause).message).toContain('nodes')
  })

  it('retains the exact caller validation issue inside its SchemaError', async () => {
    const diagnostics = captureDiagnostics()

    const issue = new SchemaIssue.InvalidValue({
      message: 'diagnostic validation marker',
    })

    let invalid = false

    const Document = FlowDocumentSchema.check(
      S.makeFilter(() => (invalid ? issue : undefined))
    )

    const diagnosticContract = defineFlowDataContract({
      id: 'diagnostic-check',
      document: Document,
      isolation: {
        detach: (value) => Effect.sync(() => structuredClone(value)),
      },
    })

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runValidationDiagnostic() {
          const flow = yield* makeTypedFlow({
            contract: diagnosticContract,
            viewport,
            initial: { kind: 'decoded', input: document },
          })

          invalid = true
          const rejected = yield* Effect.exit(flow.replaceDecoded(document, 0))
          invalid = false

          return {
            failure: failureOf(rejected),
            current: yield* flow.readSnapshot(),
          }
        })
      ).pipe(Effect.provide(diagnostics.layer))
    )

    const failure = FlowTypedFailureSchema.members[0].make({
      operation: 'validate-decoded',
      message: 'Invalid decoded Flow document',
    })

    expect(result).toStrictEqual({
      failure: Option.some(failure),
      current: { document, viewport, revision: 0 },
    })

    const original = diagnostics.records.find((record) =>
      Option.match(Cause.findErrorOption(record.cause), {
        onNone: () => false,
        onSome: S.isSchemaError,
      })
    )

    if (!original) {
      throw new Error('Missing original validation diagnostic')
    }

    assertDiagnostic(original, failure)
    expect(
      issueContains(schemaDiagnostic(original.cause).issue, issue)
    ).toBeTruthy()
  })

  it.each(['typed', 'defect'])(
    'retains the original %s encoder cause without advancing state',
    async (kind) => {
      const diagnostics = captureDiagnostics()

      const issue = new SchemaIssue.InvalidValue({
        message: 'diagnostic encoder marker',
      })

      const defect = new Error('diagnostic encoder defect')
      let invalid = false

      const Document = S.toEncoded(FlowDocumentSchema).pipe(
        S.decodeTo(FlowDocumentSchema, {
          decode: G.transform((value) => value),
          encode: G.transformEffect((value) =>
            Effect.suspend(() => {
              if (!invalid) {
                return Effect.succeed(value)
              }

              return kind === 'typed' ? Effect.fail(issue) : Effect.die(defect)
            })
          ),
        })
      )

      const diagnosticContract = defineFlowDataContract({
        id: 'diagnostic-encode',
        document: Document,
        isolation: {
          detach: (value) => Effect.sync(() => structuredClone(value)),
        },
      })

      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runEncoderDiagnostic() {
            const flow = yield* makeTypedFlow({
              contract: diagnosticContract,
              viewport,
              initial: { kind: 'decoded', input: document },
            })

            invalid = true

            const rejected = yield* Effect.exit(
              flow.replaceDecoded(document, 0)
            )

            invalid = false

            return {
              failure: failureOf(rejected),
              current: yield* flow.readSnapshot(),
            }
          })
        ).pipe(Effect.provide(diagnostics.layer))
      )

      const failure = FlowTypedFailureSchema.members[0].make({
        operation: 'encode',
        message: 'Flow document encoding failed',
      })

      expect(result).toStrictEqual({
        failure: Option.some(failure),
        current: { document, viewport, revision: 0 },
      })
      const record = firstDiagnostic(diagnostics)
      assertDiagnostic(record, failure)
      expect(
        kind === 'typed'
          ? issueContains(schemaDiagnostic(record.cause).issue, issue)
          : Result.match(Cause.findDefect(record.cause), {
              onFailure: () => false,
              onSuccess: (error) => error === defect,
            })
      ).toBeTruthy()
    }
  )

  it('retains the plain-data exception without invoking an accessor or decoder', async () => {
    const diagnostics = captureDiagnostics()
    let gets = 0

    const input = Object.defineProperty({}, 'nodes', {
      get: () => {
        gets += 1

        return []
      },
    })

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runPlainDataDiagnostic() {
          const flow = yield* emptyActor()
          const rejected = yield* Effect.exit(flow.replaceEncoded(input, 0))

          return {
            failure: failureOf(rejected),
            gets,
            current: yield* flow.readSnapshot(),
          }
        })
      ).pipe(Effect.provide(diagnostics.layer))
    )

    const failure = FlowTypedFailureSchema.members[0].make({
      operation: 'decode',
      message: 'Invalid encoded plain JSON input',
    })

    expect(result).toStrictEqual({
      failure: Option.some(failure),
      gets: 0,
      current: { document, viewport, revision: 0 },
    })
    const record = firstDiagnostic(diagnostics)
    assertDiagnostic(record, failure)
    const original = Cause.findErrorOption(record.cause)
    expect(
      Option.isSome(original) &&
        original.value instanceof Error &&
        original.value.message === 'Accessor record'
    ).toBeTruthy()
  })

  it('retains a thrown selector exception by identity without exposing authority', async () => {
    const diagnostics = captureDiagnostics()
    const error = new Error('diagnostic selector exception')

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runSelectorDiagnostic() {
          const flow = yield* emptyActor()

          const rejected = yield* Effect.exit(
            flow.readSelected((snapshot) => {
              if (snapshot.revision !== 0) {
                throw new Error('Unexpected selector revision')
              }

              throw error
            })
          )

          return {
            failure: failureOf(rejected),
            current: yield* flow.readSnapshot(),
          }
        })
      ).pipe(Effect.provide(diagnostics.layer))
    )

    const failure = FlowTypedFailureSchema.members[1].make({
      message: 'Flow selector failed',
    })

    expect(result).toStrictEqual({
      failure: Option.some(failure),
      current: { document, viewport, revision: 0 },
    })
    const record = firstDiagnostic(diagnostics)
    assertDiagnostic(record, failure)
    expect(Cause.findErrorOption(record.cause)).toStrictEqual(
      Option.some(error)
    )
  })

  it.each([0, 1])(
    'retains the throwing revision %s lease predicate outside acceptance and releases once',
    async (revision) => {
      const diagnostics = captureDiagnostics()
      const error = new Error('diagnostic reservation predicate')
      const releases: number[] = []
      const activations: number[] = []

      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runLeaseDiagnostic() {
            const created = yield* Effect.exit(
              makeTypedFlow({
                contract,
                viewport,
                initial: { kind: 'decoded', input: document },
                checkpointGate: {
                  stage: (checkpoint) =>
                    Effect.succeed({
                      isCurrent: () => {
                        if (checkpoint.revision === revision) {
                          throw error
                        }

                        return true
                      },
                      abort: Effect.sync(() => {
                        releases.push(checkpoint.revision)
                      }),
                      accepted: Effect.sync(() => {
                        activations.push(checkpoint.revision)
                      }),
                    }),
                },
              })
            )

            if (Exit.isFailure(created)) {
              return { failure: failureOf(created), revision: undefined }
            }

            const rejected = yield* Effect.exit(
              created.value.replaceDecoded(document, 0)
            )

            return {
              failure: failureOf(rejected),
              revision: (yield* created.value.readSnapshot()).revision,
            }
          })
        ).pipe(Effect.provide(diagnostics.layer))
      )

      const failure = FlowTypedFailureSchema.members[4].make({
        revision,
        message: 'Checkpoint reservation check failed',
      })

      expect({
        ...result,
        failedReleases: releases.filter((value) => value === revision),
        failedActivations: activations.filter((value) => value === revision),
        logs: diagnostics.records.length,
      }).toStrictEqual({
        failure: Option.some(failure),
        revision: revision === 0 ? undefined : 0,
        failedReleases: [revision],
        failedActivations: [],
        logs: 1,
      })
      const record = firstDiagnostic(diagnostics)
      assertDiagnostic(record, failure)
      expect(Cause.findErrorOption(record.cause)).toStrictEqual(
        Option.some(error)
      )
    }
  )

  it.each(['typed', 'defect'])(
    'retains a %s custom capture provider cause before actor creation',
    async (kind) => {
      const diagnostics = captureDiagnostics()

      const typed = FlowTypedFailureSchema.members[1].make({
        message: 'diagnostic capture typed failure',
      })

      const defect = new Error('diagnostic capture defect')
      let stages = 0

      const rejected = await Effect.runPromiseExit(
        Effect.scoped(
          makeTypedFlow({
            contract,
            viewport,
            initial: { kind: 'encoded', input: document },
            encodedInputCapture: {
              capture: () =>
                kind === 'typed' ? Effect.fail(typed) : Effect.die(defect),
            },
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
        ).pipe(Effect.provide(diagnostics.layer))
      )

      const failure = FlowTypedFailureSchema.members[0].make({
        operation: 'decode',
        message: 'Encoded input capture failed',
      })

      expect({
        failure: failureOf(rejected),
        stages,
        logs: diagnostics.records.length,
      }).toStrictEqual({
        failure: Option.some(kind === 'typed' ? typed : failure),
        stages: 0,
        logs: 1,
      })
      const record = firstDiagnostic(diagnostics)
      assertDiagnostic(record, failure)
      expect(
        kind === 'typed'
          ? Option.match(Cause.findErrorOption(record.cause), {
              onNone: () => false,
              onSome: (error) => error === typed,
            })
          : Result.match(Cause.findDefect(record.cause), {
              onFailure: () => false,
              onSuccess: (error) => error === defect,
            })
      ).toBeTruthy()
    }
  )
})

const diagnosticReasons = (cause: Cause.Cause<unknown>) =>
  cause.reasons.map((reason) =>
    Match.value(reason).pipe(
      Match.tag('Fail', (failureReason) => ({
        kind: 'typed',
        error: failureReason.error,
      })),
      Match.tag('Die', (defectReason) => ({
        kind: 'defect',
        error: defectReason.defect,
      })),
      Match.tag('Interrupt', (interruptReason) => ({
        kind: 'interrupt',
        fiberId: interruptReason.fiberId,
      })),
      Match.exhaustive
    )
  )

describe('activation failure Cause diagnostics and terminal settlement', () => {
  it.each(['typed', 'defect', 'self-interruption', 'throwing-logger'])(
    'retains %s activation cause after terminal settlement and exact release',
    async (kind) => {
      const loggerDefect = new Error('diagnostic logger defect')

      const diagnostics = captureDiagnostics(() => {
        if (kind === 'throwing-logger') {
          throw loggerDefect
        }
      })

      const typed = FlowTypedFailureSchema.members[1].make({
        message: 'diagnostic activation typed failure',
      })

      const defect = new Error('diagnostic activation defect')
      const releases: number[] = []
      const activations: number[] = []
      const observations: number[] = []

      let originalCause: Option.Option<Cause.Cause<FlowTypedFailure>> =
        Option.none()

      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runActivationDiagnostic() {
            const owner = yield* Scope.make()
            const initialReleased = yield* Deferred.make<boolean>()
            const enteredOne = yield* Deferred.make<boolean>()
            const failOne = yield* Deferred.make<boolean>()
            const pendingThree = yield* Deferred.make<boolean>()
            const releasedTwo = yield* Deferred.make<boolean>()
            const observedTwo = yield* Deferred.make<boolean>()

            const flow = yield* makeTypedFlow({
              contract,
              viewport,
              initial: { kind: 'decoded', input: document },
              checkpointGate: {
                stage: (checkpoint) =>
                  Effect.gen(function* runDiagnosticStage() {
                    if (checkpoint.revision === 3) {
                      yield* Deferred.succeed(pendingThree, true)
                      yield* Effect.never
                    }

                    return {
                      isCurrent: () => true,
                      abort: Effect.gen(function* runDiagnosticRelease() {
                        releases.push(checkpoint.revision)

                        if (checkpoint.revision === 0) {
                          yield* Deferred.succeed(initialReleased, true)
                        }

                        if (checkpoint.revision === 2) {
                          yield* Deferred.succeed(releasedTwo, true)
                        }
                      }),
                      accepted: Effect.gen(function* runDiagnosticActivation() {
                        activations.push(checkpoint.revision)

                        if (checkpoint.revision === 1) {
                          yield* Deferred.succeed(enteredOne, true)
                          yield* Deferred.await(failOne)

                          if (kind === 'defect') {
                            return yield* Effect.die(defect)
                          }

                          if (kind === 'self-interruption') {
                            return yield* Effect.interrupt
                          }

                          return yield* Effect.fail(typed)
                        }
                      }).pipe(
                        Effect.tapCause((cause) =>
                          Effect.sync(() => {
                            originalCause = Option.some(cause)
                          })
                        )
                      ),
                    }
                  }),
              },
            }).pipe(Scope.provide(owner))

            yield* Deferred.await(initialReleased)

            const listener = yield* Effect.forkChild(
              flow.observe((snapshot) =>
                Effect.gen(function* runDiagnosticListener() {
                  observations.push(snapshot.revision)

                  if (snapshot.revision === 2) {
                    yield* Deferred.succeed(observedTwo, true)
                  }
                })
              )
            )

            yield* flow.replaceDecoded(document, 0)
            yield* Deferred.await(enteredOne)
            yield* flow.replaceDecoded(document, 1)
            yield* Deferred.await(observedTwo)

            const pending = yield* Effect.forkChild(
              Effect.exit(flow.replaceDecoded(document, 2))
            )

            yield* Deferred.await(pendingThree)
            yield* Deferred.succeed(failOne, true)
            const rejected = yield* Fiber.join(pending)
            yield* Deferred.await(releasedTwo)

            const subsequent = yield* Effect.exit(
              flow.replaceDecoded(document, 2)
            )

            const snapshot = yield* flow.readSnapshot()
            yield* Scope.close(owner, Exit.void)
            const listenerExit = yield* Fiber.await(listener)

            return {
              pending: failureOf(rejected),
              subsequent: failureOf(subsequent),
              revision: snapshot.revision,
              document: snapshot.document,
              observations,
              activations,
              releases: releases.toSorted(),
              listenerClosed: Exit.isSuccess(listenerExit),
            }
          })
        ).pipe(Effect.provide(diagnostics.layer))
      )

      const failure = FlowTypedFailureSchema.members[4].make({
        revision: 1,
        message: 'Checkpoint activation failed',
      })

      expect(result).toStrictEqual({
        pending: Option.some(failure),
        subsequent: Option.some(failure),
        revision: 2,
        document,
        observations: [0, 1, 2],
        activations: [0, 1],
        releases: [0, 1, 2],
        listenerClosed: true,
      })
      expect(diagnostics.records).toHaveLength(1)
      const record = firstDiagnostic(diagnostics)
      assertDiagnostic(record, failure)
      expect(originalCause.pipe(Option.map(diagnosticReasons))).toStrictEqual(
        Option.some(diagnosticReasons(record.cause))
      )
      expect(
        Match.value(kind).pipe(
          Match.when('defect', () =>
            Result.match(Cause.findDefect(record.cause), {
              onFailure: () => false,
              onSuccess: (error) => error === defect,
            })
          ),
          Match.when('self-interruption', () =>
            Cause.hasInterrupts(record.cause)
          ),
          Match.orElse(() =>
            Option.match(Cause.findErrorOption(record.cause), {
              onNone: () => false,
              onSome: (error) => error === typed,
            })
          )
        )
      ).toBeTruthy()
    }
  )

  it('does not report owner-close interruption as a live activation failure', async () => {
    const diagnostics = captureDiagnostics()
    const releases: number[] = []

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* runClosingDiagnostic() {
          const owner = yield* Scope.make()
          const entered = yield* Deferred.make<boolean>()

          const flow = yield* makeTypedFlow({
            contract,
            viewport,
            initial: { kind: 'decoded', input: document },
            checkpointGate: {
              stage: (checkpoint) =>
                Effect.succeed({
                  isCurrent: () => true,
                  abort: Effect.sync(() => {
                    releases.push(checkpoint.revision)
                  }),
                  accepted: Deferred.succeed(entered, true).pipe(
                    Effect.andThen(Effect.never)
                  ),
                }),
            },
          }).pipe(Scope.provide(owner))

          yield* Deferred.await(entered)
          yield* Scope.close(owner, Exit.void)

          return failureOf(yield* Effect.exit(flow.readSnapshot()))
        })
      ).pipe(Effect.provide(diagnostics.layer))
    )

    expect({
      failure: result,
      releases,
      logs: diagnostics.records.length,
    }).toStrictEqual({
      failure: Option.some(FlowTypedFailureSchema.members[2].make({})),
      releases: [0],
      logs: 0,
    })
  })
})

describe('checkpoint stage provider diagnostic causes', () => {
  it.each(['typed', 'defect'])(
    'retains the original %s stage cause without accepting or activating its candidate',
    async (kind) => {
      const diagnostics = captureDiagnostics()

      const typed = FlowTypedFailureSchema.members[1].make({
        message: 'diagnostic stage typed failure',
      })

      const defect = new Error('diagnostic stage defect')
      const stages: number[] = []
      const activations: number[] = []
      const releases: number[] = []

      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runStageDiagnostic() {
            const initialReleased = yield* Deferred.make<boolean>()

            const flow = yield* makeTypedFlow({
              contract,
              viewport,
              initial: { kind: 'decoded', input: document },
              checkpointGate: {
                stage: (checkpoint) =>
                  Effect.suspend(() => {
                    stages.push(checkpoint.revision)

                    if (checkpoint.revision === 1) {
                      return kind === 'typed'
                        ? Effect.fail(typed)
                        : Effect.die(defect)
                    }

                    return Effect.succeed({
                      isCurrent: () => true,
                      accepted: Effect.sync(() => {
                        activations.push(checkpoint.revision)
                      }),
                      abort: Effect.sync(() => {
                        releases.push(checkpoint.revision)
                      }).pipe(
                        Effect.andThen(Deferred.succeed(initialReleased, true)),
                        Effect.asVoid
                      ),
                    })
                  }),
              },
            })

            yield* Deferred.await(initialReleased)

            const rejected = yield* Effect.exit(
              flow.replaceDecoded(document, 0)
            )

            return {
              failure: failureOf(rejected),
              current: yield* flow.readSnapshot(),
              stages,
              activations,
              releases,
            }
          })
        ).pipe(Effect.provide(diagnostics.layer))
      )

      const failure = FlowTypedFailureSchema.members[4].make({
        revision: 1,
        message: 'Checkpoint staging failed',
      })

      expect(result).toStrictEqual({
        failure: Option.some(failure),
        current: { document, viewport, revision: 0 },
        stages: [0, 1],
        activations: [0],
        releases: [0],
      })
      expect(diagnostics.records).toHaveLength(1)
      const record = firstDiagnostic(diagnostics)
      assertDiagnostic(record, failure)
      expect(
        kind === 'typed'
          ? Option.match(Cause.findErrorOption(record.cause), {
              onNone: () => false,
              onSome: (error) => error === typed,
            })
          : Result.match(Cause.findDefect(record.cause), {
              onFailure: () => false,
              onSuccess: (error) => error === defect,
            })
      ).toBeTruthy()
    }
  )
})

describe('initial lease diagnostic logger failure', () => {
  it('releases the invalid initial reservation before a caller logger can defect', async () => {
    const predicateError = new Error('initial predicate failed')
    const loggerError = new Error('initial diagnostic logger failed')

    const diagnostics = captureDiagnostics(() => {
      throw loggerError
    })

    let aborts = 0
    let activations = 0

    const rejected = await Effect.runPromiseExit(
      Effect.scoped(
        makeTypedFlow({
          contract,
          viewport,
          initial: { kind: 'decoded', input: document },
          checkpointGate: {
            stage: () =>
              Effect.succeed({
                isCurrent: () => {
                  throw predicateError
                },
                abort: Effect.sync(() => {
                  aborts += 1
                }),
                accepted: Effect.sync(() => {
                  activations += 1
                }),
              }),
          },
        })
      ).pipe(Effect.provide(diagnostics.layer))
    )

    expect({
      aborts,
      activations,
      loggerDefect:
        Exit.isFailure(rejected) &&
        Result.match(Cause.findDefect(rejected.cause), {
          onFailure: () => false,
          onSuccess: (error) => error === loggerError,
        }),
    }).toStrictEqual({ aborts: 1, activations: 0, loggerDefect: true })
    const record = firstDiagnostic(diagnostics)
    assertDiagnostic(
      record,
      FlowTypedFailureSchema.members[4].make({
        revision: 0,
        message: 'Checkpoint reservation check failed',
      })
    )
    expect(Cause.findErrorOption(record.cause)).toStrictEqual(
      Option.some(predicateError)
    )
  })
})

describe('composite Schema codec diagnostic causes', () => {
  it.each(['typed-pair', 'typed-and-defect'])(
    'retains every original reason from a %s codec failure before stable translation',
    async (kind) => {
      const diagnostics = captureDiagnostics()

      const first = new SchemaIssue.InvalidValue({
        message: 'first composite encoder issue',
      })

      const second = new SchemaIssue.InvalidValue({
        message: 'second composite encoder issue',
      })

      const defect = new Error('composite encoder defect')
      let invalid = false

      let originalCause: Option.Option<Cause.Cause<SchemaIssue.Issue>> =
        Option.none()

      const stages: number[] = []
      const activations: number[] = []
      const releases: number[] = []

      const Document = S.toEncoded(FlowDocumentSchema).pipe(
        S.decodeTo(FlowDocumentSchema, {
          decode: G.transform((value) => value),
          encode: G.transformEffect((value) =>
            Effect.suspend(() => {
              if (!invalid) {
                return Effect.succeed(value)
              }

              return Effect.failCause(
                Cause.combine(
                  Cause.fail(first),
                  kind === 'typed-pair' ? Cause.fail(second) : Cause.die(defect)
                )
              )
            }).pipe(
              Effect.tapCause((cause) =>
                Effect.sync(() => {
                  originalCause = Option.some(cause)
                })
              )
            )
          ),
        })
      )

      const diagnosticContract = defineFlowDataContract({
        id: 'composite-encoder',
        document: Document,
        isolation: {
          detach: (value) => Effect.sync(() => structuredClone(value)),
        },
      })

      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* runCompositeDiagnostic() {
            const initialReleased = yield* Deferred.make<boolean>()

            const flow = yield* makeTypedFlow({
              contract: diagnosticContract,
              viewport,
              initial: { kind: 'decoded', input: document },
              checkpointGate: {
                stage: (checkpoint) =>
                  Effect.sync(() => {
                    stages.push(checkpoint.revision)

                    return {
                      isCurrent: () => true,
                      accepted: Effect.sync(() => {
                        activations.push(checkpoint.revision)
                      }),
                      abort: Effect.sync(() => {
                        releases.push(checkpoint.revision)
                      }).pipe(
                        Effect.andThen(Deferred.succeed(initialReleased, true)),
                        Effect.asVoid
                      ),
                    }
                  }),
              },
            })

            yield* Deferred.await(initialReleased)
            invalid = true

            const rejected = yield* Effect.exit(
              flow.replaceDecoded(document, 0)
            )

            invalid = false

            return {
              failure: failureOf(rejected),
              current: yield* flow.readSnapshot(),
              stages,
              activations,
              releases,
            }
          })
        ).pipe(Effect.provide(diagnostics.layer))
      )

      const failure = FlowTypedFailureSchema.members[0].make({
        operation: 'encode',
        message: 'Flow document encoding failed',
      })

      expect(result).toStrictEqual({
        failure: Option.some(failure),
        current: { document, viewport, revision: 0 },
        stages: [0],
        activations: [0],
        releases: [0],
      })
      const record = firstDiagnostic(diagnostics)
      assertDiagnostic(record, failure)
      expect(record.cause.reasons).toHaveLength(2)

      const schemaErrors = record.cause.reasons
        .filter(Cause.isFailReason)
        .map((reason) => reason.error)

      const expectedIssues = kind === 'typed-pair' ? [first, second] : [first]
      expect(
        schemaErrors.map((error, index) => {
          const expected = expectedIssues[index]

          return (
            S.isSchemaError(error) &&
            expected !== undefined &&
            issueContains(error.issue, expected)
          )
        })
      ).toStrictEqual(expectedIssues.map(() => true))
      expect(
        originalCause.pipe(
          Option.map((cause) =>
            cause.reasons.map((reason) =>
              Match.value(reason).pipe(
                Match.tag('Fail', (failureReason) => failureReason.error),
                Match.tag('Die', (defectReason) => defectReason.defect),
                Match.tag('Interrupt', () => 'unexpected interruption'),
                Match.exhaustive
              )
            )
          )
        )
      ).toStrictEqual(
        Option.some(kind === 'typed-pair' ? [first, second] : [first, defect])
      )
      expect(
        kind === 'typed-and-defect'
          ? Result.match(Cause.findDefect(record.cause), {
              onFailure: () => false,
              onSuccess: (error) => error === defect,
            })
          : record.cause.reasons.every(Cause.isFailReason)
      ).toBeTruthy()
    }
  )
})
