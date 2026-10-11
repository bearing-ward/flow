import {
  Cause,
  Effect,
  Exit,
  Logger,
  Option,
  Predicate,
  Schema as S,
} from 'effect'
import { describe, expect, it } from 'vitest'

import { FlowTypedFailureSchema } from './flow-data-contract.schema.ts'
import { copyFlowPlainData, freezeFlowData } from './flow-typed-ownership.ts'

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- This fixture calls the production unknown-input validation boundary with deliberately malformed caller values.
const copy = (input: unknown) =>
  copyFlowPlainData(input, {
    finite: true,
    operation: 'decode',
    message: 'Invalid encoded plain JSON input',
  })

interface CyclicFixture {
  next?: CyclicFixture
}

describe('typed actor plain-data ownership', () => {
  it('copies own special keys without executing accessors or losing nested ownership', async () => {
    const input = JSON.parse(
      '{"__proto__":{"flag":true},"constructor":{"flag":false},"nested":[{"x":2}]}'
    )

    const result = await Effect.runPromise(copy(input))
    // Vitest strict equality compares an own constructor object's identity; these plain JSON values deliberately copy that key.
    expect({
      assertion0: Object.is(JSON.stringify(result), JSON.stringify(input)),
      assertion1: Object.is(Object.getPrototypeOf(result), Object.prototype),
      assertion2: Boolean(
        Predicate.isObjectOrArray(result) && Object.hasOwn(result, '__proto__')
      ),
      assertion3: Object.is(result, input),
    }).toStrictEqual({
      assertion0: true,
      assertion1: true,
      assertion2: true,
      assertion3: false,
    })
    input.nested[0].x = 99
    expect(JSON.stringify(result)).toBe(
      '{"__proto__":{"flag":true},"constructor":{"flag":false},"nested":[{"x":2}]}'
    )
    const empty = Object.create(null)
    Object.defineProperty(empty, 'x', { value: 2 })
    await expect(Effect.runPromise(copy(empty))).resolves.toStrictEqual({
      x: 2,
    })
  })

  it('rejects every unsafe default input before evaluating a getter', async () => {
    let gets = 0

    const accessor = Object.defineProperty({}, 'value', {
      get: () => {
        gets += 1

        return 1
      },
    })

    const cyclic: CyclicFixture = {}
    cyclic.next = cyclic
    const sparse: unknown[] = []
    sparse.length = 2

    const cases: readonly unknown[] = [
      accessor,
      cyclic,
      sparse,
      undefined,
      { value: undefined },
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      new Date(),
      () => 1,
      1n,
      { [Symbol('x')]: 1 },
      Object.assign([1], { extra: 2 }),
    ]

    const exits = await Promise.all(
      cases.map((input) => Effect.runPromiseExit(copy(input)))
    )

    expect(exits.map(Exit.isFailure)).toStrictEqual(cases.map(() => true))

    expect(gets).toBe(0)
  })

  it('freezes plain containers while retaining mutable recipient-owned class slots', async () => {
    class Counter {
      #value = 1
      increment() {
        this.#value += 1
      }
      read() {
        return this.#value
      }
    }

    const counter = new Counter()
    const date = new Date(0)
    const data = freezeFlowData({ items: [{ counter, date }] })
    expect({
      assertion0: Boolean(Object.isFrozen(data)),
      assertion1: Boolean(Object.isFrozen(data.items)),
      assertion2: Boolean(Object.isFrozen(data.items[0])),
      assertion3: Boolean(Object.isFrozen(counter)),
    }).toStrictEqual({
      assertion0: true,
      assertion1: true,
      assertion2: true,
      assertion3: false,
    })
    counter.increment()
    date.setTime(2)
    expect({
      assertion0: Object.is(counter.read(), 2),
      assertion1: Object.is(date.getTime(), 2),
    }).toStrictEqual({
      assertion0: true,
      assertion1: true,
    })
    await expect(
      Effect.runPromise(S.decodeUnknownEffect(S.Json)({ x: -2, y: 0 }))
    ).resolves.toStrictEqual({ x: -2, y: 0 })
  })
})

describe('plain-data diagnostic exception ownership', () => {
  it('retains a descriptor trap exception by identity while exposing only the stable public payload', async () => {
    const original = new Error('descriptor trap failed')
    const causes: Cause.Cause<unknown>[] = []

    const logger = Logger.make((event) => {
      causes.push(event.cause)
    })

    const input = new Proxy(
      {},
      {
        ownKeys: () => {
          throw original
        },
      }
    )

    const rejected = await Effect.runPromiseExit(
      copy(input).pipe(Effect.provide(Logger.layer([logger])))
    )

    expect({
      publicFailure: Exit.isFailure(rejected)
        ? Cause.findErrorOption(rejected.cause)
        : Option.none(),
      originalFailure: causes.map((cause) => Cause.findErrorOption(cause)),
    }).toStrictEqual({
      publicFailure: Option.some(
        FlowTypedFailureSchema.members[0].make({
          operation: 'decode',
          message: 'Invalid encoded plain JSON input',
        })
      ),
      originalFailure: [Option.some(original)],
    })
  })
})
