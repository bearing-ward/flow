import { Cause, Effect, Option, Predicate, Result, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { FlowTypedFailureSchema } from './flow-data-contract.schema.ts'
import type { FlowTypedFailure } from './flow-data-contract.schema.ts'

const isPlainScalar = S.is(S.Union([S.Null, S.String, S.Boolean]))

const isPlainNumber = S.is(S.Number)

const copyData = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the encoded-input/descriptor validation boundary; arbitrary caller values must be captured before Schema runs.
  input: unknown,
  finite: boolean,
  ancestors: Set<object>
): S.Json => {
  if (isPlainScalar(input)) {
    return input
  }

  if (isPlainNumber(input)) {
    if (finite && !Number.isFinite(input)) {
      throw new Error('Nonfinite number')
    }

    return input
  }

  if (!Predicate.isObjectOrArray(input)) {
    throw new TypeError('Expected plain data')
  }

  if (ancestors.has(input)) {
    throw new Error('Cyclic data')
  }

  if (Object.getOwnPropertySymbols(input).length !== 0) {
    throw new Error('Symbol key')
  }

  ancestors.add(input)

  try {
    if (Array.isArray(input)) {
      if (Object.getPrototypeOf(input) !== Array.prototype) {
        throw new Error('Custom array prototype')
      }

      const output: S.Json[] = []

      for (let i = 0; i < input.length; i += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(input, String(i))

        if (!descriptor || !('value' in descriptor)) {
          throw new Error('Sparse or accessor array')
        }

        const value: unknown = descriptor.value
        output.push(copyData(value, finite, ancestors))
      }

      if (Object.getOwnPropertyNames(input).length !== input.length + 1) {
        throw new Error('Extra array field')
      }

      return output
    }

    const prototype: unknown = Object.getPrototypeOf(input)

    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('Custom record prototype')
    }

    const output: Record<string, S.Json> = {}

    for (const key of Object.getOwnPropertyNames(input)) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key)

      if (!descriptor || !('value' in descriptor)) {
        throw new Error('Accessor record')
      }

      const value: unknown = descriptor.value
      Object.defineProperty(output, key, {
        value: copyData(value, finite, ancestors),
        enumerable: true,
        configurable: true,
        writable: true,
      })
    }

    return output
  } finally {
    ancestors.delete(input)
  }
}

export const freezeFlowData = <A>(input: A): A => {
  if (
    Predicate.isObjectOrArray(input) &&
    (Array.isArray(input) ||
      Object.getPrototypeOf(input) === Object.prototype ||
      Object.getPrototypeOf(input) === null)
  ) {
    for (const descriptor of Object.values(
      Object.getOwnPropertyDescriptors(input)
    )) {
      if ('value' in descriptor) {
        const value: unknown = descriptor.value
        freezeFlowData(value)
      }
    }

    Object.freeze(input)
  }

  return input
}

export const logFlowFailure = <E>(
  failure: FlowTypedFailure,
  cause: Cause.Cause<E>
) =>
  Effect.logError(
    'Typed Flow boundary failed',
    {
      [FlowAttribute.failureName]: failure._tag,
      [FlowAttribute.failureMessage]: failure,
      cause,
    },
    cause
  ).pipe(Effect.withSpan(FlowSpan.editFailure))

export const translateFlowFailure = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  failure: FlowTypedFailure
) =>
  effect.pipe(
    Effect.tapCause((cause) =>
      !Cause.hasInterrupts(cause) && Option.isSome(Cause.findErrorOption(cause))
        ? logFlowFailure(failure, cause)
        : Effect.void
    ),
    Effect.mapError(() => failure)
  )

export const copyFlowPlainData = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the encoded-input/descriptor validation boundary; arbitrary caller values must be captured before Schema runs.
  input: unknown,
  options: {
    readonly finite: boolean
    readonly operation: 'decode' | 'encode'
    readonly message: string
  }
) =>
  translateFlowFailure(
    Effect.try({
      try: () => copyData(input, options.finite, new Set()),
      catch: (cause) => cause,
    }),
    FlowTypedFailureSchema.members[0].make({
      operation: options.operation,
      message: options.message,
    })
  )

export const flowBoundary = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  failure: FlowTypedFailure,
  preserveError = true
): Effect.Effect<A, E | FlowTypedFailure, R> =>
  effect.pipe(
    Effect.catchCause((cause) => {
      if (Cause.hasInterrupts(cause)) {
        return Effect.failCause(cause)
      }

      const defect = Cause.findDefect(cause)

      if (
        Result.isSuccess(defect) &&
        defect.success instanceof Error &&
        defect.success.message.startsWith('Service not found')
      ) {
        return Effect.logError('Typed Flow service composition failed', {
          cause,
        }).pipe(Effect.andThen(Effect.failCause(cause)))
      }

      const typed = Cause.findErrorOption(cause)

      const rejection: Effect.Effect<never, E | FlowTypedFailure> =
        Option.isSome(typed) && preserveError
          ? Effect.fail(typed.value)
          : Effect.fail(failure)

      return logFlowFailure(failure, cause).pipe(Effect.andThen(rejection))
    })
  )
