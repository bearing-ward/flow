import {
  Cause,
  Deferred,
  Effect,
  Exit,
  Option,
  Queue,
  Schema as S,
  Scope,
} from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { FlowTypedFailureSchema } from './flow-data-contract.schema.ts'
import type {
  FlowGraphCodec,
  FlowTypedError,
  FlowTypedFailure,
} from './flow-data-contract.schema.ts'
import { ViewportSchema } from './flow-runtime.schema.ts'
import type { Viewport } from './flow-runtime.schema.ts'
import type {
  FlowTypedActorOptions,
  FlowTypedCheckpoint,
  FlowTypedCheckpointReservation,
  FlowTypedSnapshot,
  FlowTypedCommitResult,
  TypedFlow,
} from './flow-typed-actor.schema.ts'
import { FlowTypedCheckpointSchema } from './flow-typed-actor.schema.ts'
import {
  copyFlowPlainData,
  flowBoundary,
  freezeFlowData,
  logFlowFailure,
  translateFlowFailure,
} from './flow-typed-ownership.ts'
import { validateFlowGraphDocument } from './flow.schema.ts'

const disposed: FlowTypedFailure = FlowTypedFailureSchema.members[2].make({})

const codecFailure = (
  operation: 'decode' | 'validate-decoded' | 'encode' | 'isolate',
  message: string
): FlowTypedFailure =>
  FlowTypedFailureSchema.members[0].make({ operation, message })

const projectionFailure = (
  revision: number,
  message: string
): FlowTypedFailure =>
  FlowTypedFailureSchema.members[4].make({ revision, message })

const callbackFailure = (message: string): FlowTypedFailure =>
  FlowTypedFailureSchema.members[1].make({ message })

const finiteJSONFailure = codecFailure(
  'encode',
  'Checkpoint must contain only finite JSON values'
)

const parseViewport = (input: Viewport) =>
  Effect.gen(function* runParseViewport() {
    const captured = yield* copyFlowPlainData(input, {
      finite: false,
      operation: 'encode',
      message: 'Invalid checkpoint viewport',
    })

    const viewport = yield* translateFlowFailure(
      S.decodeUnknownEffect(ViewportSchema)(captured),
      codecFailure('encode', 'Invalid checkpoint viewport')
    )

    if (!Number.isFinite(viewport.x)) {
      return yield* Effect.fail(
        codecFailure('encode', 'Checkpoint viewport.x must be finite')
      )
    }

    if (!Number.isFinite(viewport.y)) {
      return yield* Effect.fail(
        codecFailure('encode', 'Checkpoint viewport.y must be finite')
      )
    }

    return freezeFlowData(viewport)
  })

const leaseCheck = (
  reservation: FlowTypedCheckpointReservation,
  revision: number,
  onThrow: (cause: Cause.Cause<unknown>, failure: FlowTypedFailure) => void
) =>
  Effect.try({
    try: () => reservation.isCurrent(),
    catch: (error) => {
      const failure = projectionFailure(
        revision,
        'Checkpoint reservation check failed'
      )

      onThrow(Cause.fail(error), failure)

      return failure
    },
  }).pipe(
    Effect.flatMap((current) =>
      current
        ? Effect.void
        : Effect.fail(
            projectionFailure(
              revision,
              'Checkpoint reservation is no longer current'
            )
          )
    )
  )

type LeasePhase =
  | 'held'
  | 'queued'
  | 'activating'
  | 'releasing'
  | 'released'
  | 'release-defective'

interface Lease {
  readonly reservation: FlowTypedCheckpointReservation
  readonly revision: number
  readonly released: Deferred.Deferred<undefined>
  phase: LeasePhase
}

interface Request {
  readonly scope: Scope.Closeable
  readonly write: boolean
  readonly reject: (failure: FlowTypedError) => Effect.Effect<void>
  readonly finalized: Deferred.Deferred<undefined>
  cleanupPhase: 'active' | 'closing' | 'closed' | 'defective'
  phase: 'pending' | 'settled' | 'cancelled'
}

interface Observer<C extends FlowGraphCodec> {
  readonly scope: Scope.Closeable
  readonly queue: Queue.Queue<FlowTypedSnapshot<C>>
  readonly complete: Effect.Effect<void>
}

type Initial<C extends FlowGraphCodec> =
  | { readonly kind: 'encoded'; readonly input: unknown }
  | { readonly kind: 'decoded'; readonly input: C['Type'] }

export function makeTypedFlow<C extends FlowGraphCodec, RI, RC = never>(
  options: FlowTypedActorOptions<C, RI, RC> & {
    readonly initial: { readonly kind: 'encoded'; readonly input: unknown }
  }
): Effect.Effect<
  TypedFlow<C, RI, RC>,
  FlowTypedError,
  C['DecodingServices'] | C['EncodingServices'] | RI | RC | Scope.Scope
>
export function makeTypedFlow<C extends FlowGraphCodec, RI, RC = never>(
  options: FlowTypedActorOptions<C, RI, RC> & {
    readonly initial: { readonly kind: 'decoded'; readonly input: C['Type'] }
  }
): Effect.Effect<
  TypedFlow<C, RI, RC>,
  FlowTypedError,
  C['EncodingServices'] | RI | Scope.Scope
>
export function makeTypedFlow<C extends FlowGraphCodec, RI, RC = never>(
  // oxlint-disable-next-line typescript/unified-signatures -- Separate encoded, decoded, and dynamic construction channels preserve the exact decoding/capture service requirements.
  options: FlowTypedActorOptions<C, RI, RC> & { readonly initial: Initial<C> }
): Effect.Effect<
  TypedFlow<C, RI, RC>,
  FlowTypedError,
  C['DecodingServices'] | C['EncodingServices'] | RI | RC | Scope.Scope
>
export function makeTypedFlow<C extends FlowGraphCodec, RI, RC = never>(
  options: FlowTypedActorOptions<C, RI, RC> & { readonly initial: Initial<C> }
): Effect.Effect<
  TypedFlow<C, RI, RC>,
  FlowTypedError,
  C['DecodingServices'] | C['EncodingServices'] | RI | RC | Scope.Scope
> {
  return Effect.uninterruptibleMask((restoreCreation) =>
    Effect.gen(function* runWorkflow1() {
      const viewport = yield* restoreCreation(parseViewport(options.viewport))
      const { contract } = options

      const isolate = (value: C['Type']) =>
        flowBoundary(
          Effect.suspend(() => contract.isolation.detach(value)),
          codecFailure('isolate', 'Decoded isolation failed')
        )

      const validate = (value: C['Type']) =>
        flowBoundary(
          translateFlowFailure(
            S.decodeUnknownEffect(S.toType(contract.document))(value),
            codecFailure('validate-decoded', 'Invalid decoded Flow document')
          ).pipe(
            Effect.flatMap(validateFlowGraphDocument),
            Effect.withSpan(FlowSpan.documentIntegrity)
          ),
          codecFailure('validate-decoded', 'Invalid decoded Flow document')
        )

      const deliver = (
        document: C['Type'],
        revision: number
      ): Effect.Effect<FlowTypedSnapshot<C>, FlowTypedError, RI> =>
        Effect.gen(function* runDeliver() {
          const working = yield* isolate(document)
          const checked = yield* validate(working)
          const owned = yield* isolate(checked)

          return { document: owned, revision, viewport: { ...viewport } }
        })

      const encode = (document: C['Type']) =>
        Effect.gen(function* runEncode() {
          const privateDocument = yield* isolate(document)

          const result = yield* flowBoundary(
            translateFlowFailure(
              S.encodeUnknownEffect(S.toCodecJson(contract.document))(
                privateDocument
              ),
              codecFailure('encode', 'Flow document encoding failed')
            ),
            codecFailure('encode', 'Flow document encoding failed')
          )

          const copied = yield* copyFlowPlainData(result, {
            finite: true,
            operation: 'encode',
            message: 'Checkpoint must contain only finite JSON values',
          })

          return freezeFlowData(copied)
        })

      const captureEncoded = (
        // oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the encoded-input/descriptor validation boundary; arbitrary caller values must be captured before Schema runs.
        input: unknown
      ): Effect.Effect<unknown, FlowTypedFailure, RC> =>
        options.encodedInputCapture
          ? flowBoundary(
              Effect.suspend(() =>
                options.encodedInputCapture
                  ? options.encodedInputCapture.capture(input)
                  : Effect.die('Missing captured capability')
              ),
              codecFailure('decode', 'Encoded input capture failed')
            )
          : copyFlowPlainData(input, {
              finite: true,
              operation: 'decode',
              message: 'Invalid encoded plain JSON input',
            })

      // oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the encoded-input/descriptor validation boundary; arbitrary caller values must be captured before Schema runs.
      const decode = (input: unknown) =>
        Effect.gen(function* runDecode() {
          const captured = yield* captureEncoded(input)

          return yield* flowBoundary(
            translateFlowFailure(
              S.decodeUnknownEffect(contract.document)(captured),
              codecFailure('decode', 'Invalid encoded Flow document')
            ),
            codecFailure('decode', 'Invalid encoded Flow document')
          ).pipe(Effect.withSpan(FlowSpan.documentDecode))
        })

      const prepare = (input: C['Type'], revision: number) =>
        Effect.gen(function* runPrepare() {
          const working = yield* isolate(input)
          const checked = yield* validate(working)
          const sealed = freezeFlowData(yield* isolate(checked))
          const document = yield* encode(sealed)

          const checkpoint = yield* translateFlowFailure(
            S.decodeUnknownEffect(FlowTypedCheckpointSchema)({
              contractId: contract.id,
              revision,
              document,
              viewport,
            }),
            finiteJSONFailure
          )

          const copied = yield* copyFlowPlainData(checkpoint, {
            finite: true,
            operation: 'encode',
            message: 'Checkpoint must contain only finite JSON values',
          })

          const privateCheckpoint = yield* translateFlowFailure(
            S.decodeUnknownEffect(FlowTypedCheckpointSchema)(copied),
            finiteJSONFailure
          )

          return { sealed, checkpoint: freezeFlowData(privateCheckpoint) }
        }).pipe(Effect.withSpan(FlowSpan.editPrepare))

      const stage = (checkpoint: FlowTypedCheckpoint) =>
        Effect.gen(function* runStage() {
          const copy = yield* copyFlowPlainData(checkpoint, {
            finite: true,
            operation: 'encode',
            message: 'Checkpoint must contain only finite JSON values',
          })

          const privateCheckpoint = freezeFlowData(
            yield* translateFlowFailure(
              S.decodeUnknownEffect(FlowTypedCheckpointSchema)(copy),
              finiteJSONFailure
            )
          )

          return yield* options.checkpointGate
            ? flowBoundary(
                Effect.suspend(() =>
                  options.checkpointGate
                    ? options.checkpointGate.stage(privateCheckpoint)
                    : Effect.die('Missing captured gate')
                ),
                projectionFailure(
                  checkpoint.revision,
                  'Checkpoint staging failed'
                ),
                false
              )
            : Effect.succeed<FlowTypedCheckpointReservation>({
                isCurrent: () => true,
                abort: Effect.void,
                accepted: Effect.void,
              })
        })

      // No live owner, queue, worker or stage exists until viewport and graph preparation succeed.
      const initialDocument =
        options.initial.kind === 'encoded'
          ? yield* restoreCreation(decode(options.initial.input))
          : options.initial.input

      const initial = yield* restoreCreation(prepare(initialDocument, 0))

      const initialReservation = yield* Effect.uninterruptibleMask((restore) =>
        Effect.gen(function* runInitialReservation() {
          const reservation = yield* restoreCreation(
            restore(stage(initial.checkpoint))
          )

          let diagnostic = Effect.void

          const checked = yield* Effect.exit(
            leaseCheck(reservation, 0, (cause, failure) => {
              diagnostic = logFlowFailure(failure, cause)
            })
          )

          if (Exit.isFailure(checked)) {
            const aborted = yield* Effect.exit(
              Effect.suspend(() => reservation.abort)
            )

            yield* diagnostic

            if (Exit.isFailure(aborted)) {
              yield* Effect.logError(
                'Trusted initial checkpoint abort violated its contract',
                { cause: aborted.cause }
              )

              return yield* Effect.failCause(
                Cause.combine(checked.cause, aborted.cause)
              )
            }

            return yield* Effect.failCause(checked.cause)
          }

          return reservation
        })
      )

      const writerScope = yield* Scope.make()
      const cleanupScope = yield* Scope.make()
      const activationScope = yield* Scope.make()
      const writer = yield* Queue.unbounded<Effect.Effect<void>>()
      const activations = yield* Queue.unbounded<Lease>()
      const requests = new Set<Request>()
      const observers = new Set<Observer<C>>()
      const leases = new Set<Lease>()
      let closed = false
      let health: Option.Option<FlowTypedFailure> = Option.none()

      let authority: Option.Option<{
        document: C['Type']
        revision: number
        checkpoint: FlowTypedCheckpoint
      }> = Option.some({
        document: initial.sealed,
        revision: 0,
        checkpoint: initial.checkpoint,
      })

      const serial = <A, E>(
        action: () => Effect.Effect<A, E>
      ): Effect.Effect<A, E> =>
        Effect.uninterruptibleMask(() =>
          Effect.gen(function* runSerial() {
            const reply = yield* Deferred.make<A, E>()
            yield* Queue.offer(
              writer,
              Effect.suspend(action).pipe(
                Effect.exit,
                Effect.flatMap((exit) => Deferred.done(reply, exit)),
                Effect.asVoid
              )
            )

            return yield* Deferred.await(reply)
          })
        )

      const state = (): Effect.Effect<FlowTypedSnapshot<C>, FlowTypedError> =>
        Effect.suspend(() => {
          if (closed || Option.isNone(authority)) {
            return Effect.fail(disposed)
          }

          return Effect.succeed({
            document: authority.value.document,
            revision: authority.value.revision,
            viewport,
          })
        })

      const writable = (): Effect.Effect<void, FlowTypedError> =>
        Effect.suspend(() => {
          if (closed) {
            return Effect.fail(disposed)
          }

          if (Option.isSome(health)) {
            return Effect.fail(health.value)
          }

          return Effect.void
        })

      const checkRevision = (
        expected: number
      ): Effect.Effect<void, FlowTypedError> =>
        Effect.gen(function* runCheckRevision() {
          yield* writable()

          if (!Number.isSafeInteger(expected) || expected < 0) {
            return yield* Effect.fail(
              callbackFailure(
                'Expected revision must be a nonnegative safe integer'
              )
            )
          }

          const current = yield* state()

          if (expected !== current.revision) {
            return yield* Effect.fail<FlowTypedFailure>(
              FlowTypedFailureSchema.members[3].make({
                expected,
                actual: current.revision,
              })
            )
          }

          if (expected === Number.MAX_SAFE_INTEGER) {
            return yield* Effect.fail(
              callbackFailure('Flow revision exhausted')
            )
          }
        })

      const claimRelease = (
        lease: Lease
      ): Effect.Effect<Deferred.Deferred<undefined>> =>
        Effect.gen(function* runClaimRelease() {
          if (
            lease.phase === 'released' ||
            lease.phase === 'releasing' ||
            lease.phase === 'release-defective'
          ) {
            return lease.released
          }

          lease.phase = 'releasing'

          const cleanup = Effect.suspend(() => lease.reservation.abort).pipe(
            Effect.uninterruptible,
            // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
            Effect.as(undefined),
            Effect.exit,
            Effect.flatMap((exit) =>
              serial(() =>
                Effect.gen(function* runCleanup() {
                  lease.phase = Exit.isSuccess(exit)
                    ? 'released'
                    : 'release-defective'

                  if (Exit.isSuccess(exit)) {
                    leases.delete(lease)
                  } else {
                    yield* Effect.logError(
                      'Trusted checkpoint abort violated its contract',
                      { revision: lease.revision, cause: exit.cause }
                    )
                  }

                  yield* Deferred.done(lease.released, exit)
                })
              )
            )
          )

          yield* Effect.forkIn(cleanup, cleanupScope, { uninterruptible: true })

          return lease.released
        })

      const release = (lease: Lease) =>
        serial(() => claimRelease(lease)).pipe(Effect.flatMap(Deferred.await))

      const claimRequestCleanup = (
        request: Request
      ): Effect.Effect<Deferred.Deferred<undefined>> =>
        Effect.gen(function* runClaimRequestCleanup() {
          if (request.cleanupPhase !== 'active') {
            return request.finalized
          }

          request.cleanupPhase = 'closing'

          const cleanup = Effect.exit(
            // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
            Scope.close(request.scope, Exit.void).pipe(Effect.as(undefined))
          ).pipe(
            Effect.flatMap((exit) =>
              serial(() =>
                Effect.gen(function* runCleanup() {
                  request.cleanupPhase = Exit.isSuccess(exit)
                    ? 'closed'
                    : 'defective'

                  if (Exit.isSuccess(exit)) {
                    requests.delete(request)
                  } else {
                    yield* Effect.logError(
                      'Typed request scope cleanup failed',
                      { cause: exit.cause }
                    )
                  }

                  yield* Deferred.done(request.finalized, exit)
                })
              )
            )
          )

          yield* Effect.forkIn(cleanup, cleanupScope, { uninterruptible: true })

          return request.finalized
        })

      const submit = <A, R>(
        write: boolean,
        work: (
          request: Request,
          accept: (value: A) => Effect.Effect<void>
        ) => Effect.Effect<A, FlowTypedError, R>
      ): Effect.Effect<A, FlowTypedError, R> =>
        Effect.uninterruptibleMask((restore) =>
          Effect.gen(function* runSubmit1() {
            if (closed) {
              return yield* Effect.fail(disposed)
            }

            const context = yield* Effect.context<R>()
            const reply = yield* Deferred.make<A, FlowTypedError>()
            const scope = yield* Scope.make()
            const finalized = yield* Deferred.make<undefined>()

            const request: Request = {
              scope,
              write,
              finalized,
              cleanupPhase: 'active',
              phase: 'pending',
              reject: (failure) =>
                Effect.gen(function* runReject() {
                  if (request.phase !== 'pending') {
                    return
                  }

                  request.phase = 'settled'
                  yield* Deferred.fail(reply, failure)
                }),
            }

            yield* serial(() =>
              Effect.gen(function* runSubmit2() {
                yield* write ? writable() : state()

                requests.add(request)
              })
            )

            const preparation = restore(
              Effect.suspend(() =>
                work(request, (value) =>
                  Effect.gen(function* runPreparation() {
                    if (request.phase !== 'pending') {
                      return
                    }

                    request.phase = 'settled'
                    yield* Deferred.succeed(reply, value)
                  })
                )
              )
            ).pipe(
              Effect.provideContext(context),
              Effect.exit,
              Effect.flatMap((exit) =>
                serial(() =>
                  Effect.gen(function* runPreparation() {
                    if (request.phase !== 'pending') {
                      return
                    }

                    request.phase = 'settled'
                    yield* Deferred.done(reply, exit)
                  })
                )
              )
            )

            yield* Effect.forkIn(preparation, scope)

            return yield* restore(Deferred.await(reply)).pipe(
              Effect.ensuring(
                Effect.gen(function* runSubmit3() {
                  yield* serial(() =>
                    Effect.gen(function* runSubmit4() {
                      if (request.phase === 'pending') {
                        request.phase = 'cancelled'
                      }

                      yield* claimRequestCleanup(request)
                    })
                  )
                })
              )
            )
          })
        )

      const publish = (
        request: Request,
        expected: number,
        candidate: { sealed: C['Type']; checkpoint: FlowTypedCheckpoint },
        accept: (value: FlowTypedCommitResult) => Effect.Effect<void>
      ) =>
        Effect.uninterruptibleMask((restore) =>
          Effect.gen(function* runPublish1() {
            yield* serial(() =>
              Effect.gen(function* runPublish2() {
                if (closed) {
                  return yield* Effect.fail(disposed)
                }

                if (request.phase !== 'pending') {
                  return yield* Effect.interrupt
                }

                yield* writable()
              })
            )
            const reservation = yield* restore(stage(candidate.checkpoint))

            const lease: Lease = {
              reservation,
              revision: candidate.checkpoint.revision,
              phase: 'held',
              released: yield* Deferred.make<undefined>(),
            }

            let diagnostic = Effect.void

            const committed = yield* Effect.exit(
              serial(() =>
                Effect.gen(function* runCommitted() {
                  leases.add(lease)

                  if (closed) {
                    return yield* Effect.fail(disposed)
                  }

                  if (request.phase !== 'pending') {
                    return yield* Effect.interrupt
                  }

                  yield* writable()
                  yield* checkRevision(expected)
                  yield* leaseCheck(
                    reservation,
                    lease.revision,
                    (cause, failure) => {
                      diagnostic = logFlowFailure(failure, cause)
                    }
                  )
                  authority = Option.some({
                    document: candidate.sealed,
                    revision: lease.revision,
                    checkpoint: candidate.checkpoint,
                  })
                  lease.phase = 'queued'

                  const snapshot: FlowTypedSnapshot<C> = {
                    document: candidate.sealed,
                    revision: lease.revision,
                    viewport,
                  }

                  for (const observer of observers) {
                    yield* Queue.offer(observer.queue, snapshot)
                  }

                  yield* Queue.offer(activations, lease)

                  const result: FlowTypedCommitResult = {
                    revision: lease.revision,
                    changed: true,
                  }

                  yield* accept(result)

                  return result
                })
              )
            )

            if (Exit.isFailure(committed)) {
              yield* release(lease)
              yield* diagnostic

              return yield* Effect.failCause(committed.cause)
            }

            return committed.value
          })
        ).pipe(
          Effect.withSpan(FlowSpan.controllerUpdate, {
            attributes: { [FlowAttribute.changeKind]: 'typed-replacement' },
          })
        )

      const terminalGateFailure = (
        failed: Lease,
        cause: Cause.Cause<FlowTypedFailure>
      ) =>
        serial(() =>
          Effect.gen(function* runTerminalGateFailure() {
            if (closed || Option.isSome(health)) {
              return Option.none<FlowTypedFailure>()
            }

            const failure = projectionFailure(
              failed.revision,
              'Checkpoint activation failed'
            )

            health = Option.some(failure)
            yield* Queue.shutdown(activations)

            for (const request of requests) {
              if (request.write) {
                yield* request.reject(failure)
              }
            }

            for (const lease of leases) {
              yield* claimRelease(lease)
            }
            // Preparation scopes are interrupted by a separate cleanup task after replies settle.

            for (const request of requests) {
              if (request.write) {
                yield* claimRequestCleanup(request)
              }
            }

            return Option.some(failure)
          })
        ).pipe(
          Effect.flatMap((failure) =>
            Option.isSome(failure)
              ? logFlowFailure(failure.value, cause)
              : Effect.void
          )
        )

      const activationWorker = Effect.forever(
        Effect.gen(function* runActivationWorker() {
          const lease = yield* Queue.take(activations)

          const run = yield* serial(() =>
            Effect.sync(() => {
              if (closed || Option.isSome(health) || lease.phase !== 'queued') {
                return false
              }

              lease.phase = 'activating'

              return true
            })
          )

          if (!run) {
            return
          }

          const activated = yield* Effect.exit(
            Effect.suspend(() => lease.reservation.accepted)
          )

          if (Exit.isFailure(activated)) {
            yield* terminalGateFailure(lease, activated.cause)
          }

          yield* release(lease)
        })
      )

      const close = Effect.uninterruptible(
        Effect.gen(function* runClose() {
          const owned = yield* serial(() =>
            Effect.gen(function* runOwned() {
              if (closed) {
                return Option.none<{
                  requests: Request[]
                  observers: Observer<C>[]
                }>()
              }

              closed = true

              for (const request of requests) {
                yield* request.reject(disposed)
              }

              for (const observer of observers) {
                yield* observer.complete
              }

              return Option.some({
                requests: [...requests],
                observers: [...observers],
              })
            })
          )

          if (Option.isNone(owned)) {
            return
          }

          let cleanupFailure: Option.Option<Cause.Cause<never>> = Option.none()

          const collectCleanup = (effect: Effect.Effect<void>) =>
            Effect.gen(function* runCollectCleanup() {
              const exit = yield* Effect.exit(effect)

              if (Exit.isFailure(exit)) {
                cleanupFailure = Option.some(
                  Option.isSome(cleanupFailure)
                    ? Cause.combine(cleanupFailure.value, exit.cause)
                    : exit.cause
                )
              }
            })

          yield* collectCleanup(Scope.close(activationScope, Exit.void))

          for (const request of owned.value.requests) {
            yield* serial(() => claimRequestCleanup(request))
          }

          for (const request of owned.value.requests) {
            yield* collectCleanup(Deferred.await(request.finalized))
          }

          for (const observer of owned.value.observers) {
            yield* collectCleanup(Scope.close(observer.scope, Exit.void))
            yield* collectCleanup(Queue.shutdown(observer.queue))
          }

          const releaseCompletions = yield* serial(() =>
            Effect.gen(function* runReleaseCompletions() {
              const completions: Deferred.Deferred<undefined>[] = []

              for (const lease of leases) {
                completions.push(yield* claimRelease(lease))
              }

              return completions
            })
          )

          for (const completion of releaseCompletions) {
            yield* collectCleanup(Deferred.await(completion))
          }

          yield* collectCleanup(Scope.close(cleanupScope, Exit.void))
          yield* serial(() =>
            Effect.sync(() => {
              requests.clear()
              observers.clear()
              authority = Option.none()
            })
          )
          yield* Queue.shutdown(activations)
          yield* Queue.shutdown(writer)
          yield* collectCleanup(Scope.close(writerScope, Exit.void))

          if (Option.isSome(cleanupFailure)) {
            return yield* Effect.failCause(cleanupFailure.value)
          }
        })
      ).pipe(Effect.withSpan(FlowSpan.hostDestroy))

      yield* Effect.forkIn(
        Effect.forever(
          Queue.take(writer).pipe(Effect.flatMap((action) => action))
        ),
        writerScope
      )
      yield* Effect.addFinalizer(() => close)

      const initialLease: Lease = {
        reservation: initialReservation,
        revision: 0,
        phase: 'queued',
        released: yield* Deferred.make<undefined>(),
      }

      leases.add(initialLease)
      yield* Queue.offer(activations, initialLease)
      yield* Effect.forkIn(activationWorker, activationScope)

      const readSnapshot = () =>
        submit(false, () =>
          Effect.gen(function* runReadSnapshot() {
            const captured = yield* serial(state)

            const delivered = yield* deliver(
              captured.document,
              captured.revision
            )

            yield* serial(() => (closed ? Effect.fail(disposed) : Effect.void))

            return delivered
          })
        )

      const actor: TypedFlow<C, RI, RC> = {
        readSnapshot,
        readNodes: () =>
          readSnapshot().pipe(
            Effect.map((snapshot) => snapshot.document.nodes)
          ),
        readEdges: () =>
          readSnapshot().pipe(
            Effect.map((snapshot) => snapshot.document.edges)
          ),
        readNode: (id) =>
          readSnapshot().pipe(
            Effect.map((snapshot) =>
              Option.fromNullishOr(
                snapshot.document.nodes.find((node) => node.id === id)
              )
            )
          ),
        readEdge: (id) =>
          readSnapshot().pipe(
            Effect.map((snapshot) =>
              Option.fromNullishOr(
                snapshot.document.edges.find((edge) => edge.id === id)
              )
            )
          ),
        readSelected: (selector) =>
          readSnapshot().pipe(
            Effect.flatMap((snapshot) =>
              translateFlowFailure(
                Effect.try({
                  try: () => selector(snapshot),
                  catch: (cause) => cause,
                }),
                callbackFailure('Flow selector failed')
              )
            )
          ),
        replaceEncoded: (input, expected) =>
          submit(true, (request, accept) =>
            Effect.gen(function* runReplaceEncoded() {
              yield* serial(() => checkRevision(expected))
              const decoded = yield* decode(input)
              const candidate = yield* prepare(decoded, expected + 1)

              return yield* publish(request, expected, candidate, accept)
            })
          ),
        replaceDecoded: (input, expected) =>
          submit(true, (request, accept) =>
            Effect.gen(function* runReplaceDecoded() {
              yield* serial(() => checkRevision(expected))
              const candidate = yield* prepare(input, expected + 1)

              return yield* publish(request, expected, candidate, accept)
            })
          ),
        updateDecoded: (update) =>
          submit(true, (request, accept) =>
            Effect.gen(function* runUpdateDecoded() {
              const captured = yield* serial(() =>
                Effect.gen(function* runCaptured() {
                  yield* writable()

                  return yield* state()
                })
              )

              const delivered = yield* deliver(
                captured.document,
                captured.revision
              )

              const input = yield* flowBoundary(
                Effect.suspend(() => update(delivered)),
                callbackFailure('Flow updater failed')
              )

              const candidate = yield* prepare(input, captured.revision + 1)

              return yield* publish(
                request,
                captured.revision,
                candidate,
                accept
              )
            })
          ),
        encodeDocument: () =>
          submit(false, () =>
            Effect.gen(function* runEncodeDocument() {
              const captured = yield* serial(state)
              const encoded = yield* encode(captured.document)
              yield* serial(() =>
                closed ? Effect.fail(disposed) : Effect.void
              )

              return encoded
            })
          ),
        observe: (listener) =>
          Effect.uninterruptibleMask((restore) =>
            Effect.gen(function* runObserve1() {
              if (closed) {
                return yield* Effect.fail(disposed)
              }

              const context = yield* Effect.context<
                RI | Effect.Services<ReturnType<typeof listener>>
              >()

              const callerScope = yield* Effect.scope
              const scope = yield* Scope.fork(callerScope)
              const queue = yield* Queue.unbounded<FlowTypedSnapshot<C>>()
              const reply = yield* Deferred.make<undefined, FlowTypedError>()
              yield* Scope.addFinalizer(
                scope,
                Deferred.interrupt(reply).pipe(Effect.asVoid)
              )

              const observer: Observer<C> = {
                scope,
                queue,
                // oxlint-disable-next-line unicorn/no-useless-undefined -- The explicit undefined selects the binary Effect overload; omitting it returns a curried function.
                complete: Deferred.succeed(reply, undefined).pipe(
                  Effect.asVoid
                ),
              }

              yield* serial(() =>
                Effect.gen(function* runObserve2() {
                  const captured = yield* state()
                  observers.add(observer)
                  yield* Queue.offer(queue, captured)
                })
              )

              const worker = Effect.forever(
                Effect.gen(function* runWorker() {
                  const snapshot = yield* Queue.take(queue)

                  const privateSnapshot = yield* deliver(
                    snapshot.document,
                    snapshot.revision
                  )

                  yield* flowBoundary(
                    Effect.suspend(() => listener(privateSnapshot)),
                    callbackFailure('Flow observer failed')
                  )
                })
              ).pipe(
                Effect.provideContext(context),
                Effect.catchCause((cause) => Deferred.failCause(reply, cause)),
                Effect.asVoid
              )

              yield* Effect.forkIn(worker, scope)

              return yield* restore(Deferred.await(reply)).pipe(
                Effect.ensuring(
                  Effect.gen(function* runObserve3() {
                    yield* serial(() =>
                      Effect.sync(() => {
                        observers.delete(observer)
                      })
                    )
                    yield* Scope.close(scope, Exit.void).pipe(
                      Effect.ensuring(Queue.shutdown(queue))
                    )
                  })
                )
              )
            })
          ),
      }

      yield* Effect.logDebug('Typed Flow owner initialized', {
        [FlowAttribute.controlMode]: 'typed-core',
        [FlowAttribute.nodeCount]: initial.sealed.nodes.length,
        [FlowAttribute.edgeCount]: initial.sealed.edges.length,
      })

      return actor
    })
  ).pipe(Effect.withSpan(FlowSpan.hostMount))
}
