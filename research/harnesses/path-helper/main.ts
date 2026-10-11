import { Schema as S } from 'effect'

import {
  CaptureSchema,
  ExportsSchema,
  observe,
  pathCases,
  ResultTupleSchema,
  decodeInput,
  tagScalar,
} from './cases.ts'

const moduleUrl = process.argv.at(2)

if (moduleUrl === undefined) {
  throw new TypeError('Expected built upstream public module URL')
}

const namespace: unknown = await import(moduleUrl)

const helpers = S.decodeUnknownSync(ExportsSchema)(namespace)

const capture = S.decodeUnknownSync(CaptureSchema)(
  pathCases.map((descriptor) => ({
    descriptor,
    outcome: observe(helpers[descriptor.helper], descriptor),
  }))
)

const isTuple = S.is(ResultTupleSchema)

for (const { descriptor } of capture.filter(
  (record) => record.descriptor.domain === 'numeric'
)) {
  const input = decodeInput(descriptor.input)
  const helper = helpers[descriptor.helper]
  // oxlint-disable-next-line anti-slop/no-reflect-apply -- Run actual upstream public exports with capture-decoded JavaScript inputs, including own-undefined.
  const first: unknown = Reflect.apply(helper, undefined, [input])
  // oxlint-disable-next-line anti-slop/no-reflect-apply -- Independent repeat on the same frozen caller input.
  const second: unknown = Reflect.apply(helper, undefined, [input])

  if (!isTuple(first) || !isTuple(second)) {
    throw new TypeError('Expected reference result tuples')
  }

  const original = JSON.stringify(first.map(tagScalar))

  if (first === second || original !== JSON.stringify(second.map(tagScalar))) {
    throw new Error(`Reference output is not fresh/stable ${descriptor.id}`)
  }

  first[1] = 123_456
  // oxlint-disable-next-line anti-slop/no-reflect-apply -- Mutation must not affect subsequent actual upstream calls.
  const afterMutation: unknown = Reflect.apply(helper, undefined, [input])

  if (
    !isTuple(afterMutation) ||
    original !== JSON.stringify(afterMutation.map(tagScalar))
  ) {
    throw new Error(`Reference output shares caller mutation ${descriptor.id}`)
  }
}

process.stdout.write(`${JSON.stringify(capture)}\n`)
