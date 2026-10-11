import { Schema as S } from 'effect'

export const HelperSchema = S.Literals([
  'getBezierPath',
  'getSimpleBezierPath',
  'getSmoothStepPath',
  'getStraightPath',
  'getEdgeCenter',
])

export const ScalarSchema = S.Union([
  S.Struct({ tag: S.Literal('finite'), value: S.Finite }),
  S.Struct({
    tag: S.Literals([
      'NaN',
      '+Infinity',
      '-Infinity',
      '-0',
      'undefined',
      'null',
    ]),
  }),
  S.Struct({ tag: S.Literal('string'), value: S.String }),
])

export type Scalar = typeof ScalarSchema.Type

const RawScalarSchema = S.Union([S.Number, S.String, S.Null, S.Undefined])

type RawScalar = typeof RawScalarSchema.Type

const RawInputSchema = S.Union([
  S.Record(S.String, RawScalarSchema),
  RawScalarSchema,
])

type RawInput = typeof RawInputSchema.Type

export const InputSchema = S.Union([
  S.Struct({
    tag: S.Literal('object'),
    fields: S.Record(S.String, ScalarSchema),
  }),
  ScalarSchema,
])

export const CaseSchema = S.Struct({
  id: S.String,
  helper: HelperSchema,
  group: S.Literals([
    'coordinates',
    'sides-defaults',
    'curvature',
    'smooth-options',
    'numeric-malformed',
    'aliases',
  ]),
  domain: S.Literals(['numeric', 'outside-type']),
  input: InputSchema,
})

export type PathCase = typeof CaseSchema.Type

export const ResultTupleSchema = S.mutable(S.Array(RawScalarSchema))

export const OutcomeSchema = S.Union([
  S.Struct({ kind: S.Literal('return'), tuple: S.Array(ScalarSchema) }),
  S.Struct({ kind: S.Literal('throw'), category: S.String }),
])

export const RecordSchema = S.Struct({
  descriptor: CaseSchema,
  outcome: OutcomeSchema,
})

export const CaptureSchema = S.Array(RecordSchema)

export const FixtureSchema = S.Struct({
  metadata: S.Struct({
    upstreamSha: S.String,
    package: S.String,
    version: S.String,
    method: S.String,
    manifestSha256: S.String,
    twoProcessEqual: S.Boolean,
    normalization: S.String,
    capturedAt: S.String,
  }),
  cases: CaptureSchema,
})

// oxlint-disable anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof -- Validate upstream callable exports; their unknown results are decoded by the capture boundary.
export const CallableSchema = S.declare(
  (value: unknown): value is (...args: never[]) => unknown =>
    typeof value === 'function'
)
// oxlint-enable anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof

export const ExportsSchema = S.Struct({
  getBezierPath: CallableSchema,
  getSimpleBezierPath: CallableSchema,
  getSmoothStepPath: CallableSchema,
  getStraightPath: CallableSchema,
  getEdgeCenter: CallableSchema,
})

export const tagScalar = (value: RawScalar): Scalar => {
  if (value === undefined) {
    return { tag: 'undefined' }
  }

  if (value === null) {
    return { tag: 'null' }
  }

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Tagged normalization of the already decoded scalar union.
  if (typeof value === 'string') {
    return { tag: 'string', value }
  }

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Only numbers remain after undefined/null/string variants.
  if (typeof value !== 'number') {
    throw new TypeError('Unsupported capture scalar')
  }

  if (Number.isNaN(value)) {
    return { tag: 'NaN' }
  }

  if (value === Infinity) {
    return { tag: '+Infinity' }
  }

  if (value === -Infinity) {
    return { tag: '-Infinity' }
  }

  if (Object.is(value, -0)) {
    return { tag: '-0' }
  }

  return { tag: 'finite', value }
}

export const untagScalar = (value: Scalar): RawScalar => {
  switch (value.tag) {
    case 'finite':
    case 'string': {
      return value.value
    }

    case 'NaN': {
      return Number.NaN
    }

    case '+Infinity': {
      return Infinity
    }

    case '-Infinity': {
      return -Infinity
    }

    case '-0': {
      return -0
    }

    case 'undefined': {
      return undefined
    }

    case 'null': {
      return null
    }

    default: {
      const exhaustive: never = value

      return exhaustive
    }
  }
}

export const decodeInput = (input: typeof InputSchema.Type): RawInput =>
  input.tag === 'object'
    ? Object.freeze(
        Object.fromEntries(
          Object.entries(input.fields).map(([name, value]) => [
            name,
            untagScalar(value),
          ])
        )
      )
    : untagScalar(input)

export const observe = (
  helper: typeof CallableSchema.Type,
  descriptor: PathCase
): typeof OutcomeSchema.Type => {
  let result: unknown

  try {
    // oxlint-disable-next-line anti-slop/no-reflect-apply -- Required raw JavaScript observations deliberately include malformed arguments without casts into valid public params.
    result = Reflect.apply(helper, undefined, [decodeInput(descriptor.input)])
  } catch (error) {
    return {
      kind: 'throw',
      category: error instanceof Error ? error.name : 'NonErrorThrow',
    }
  }

  const tuple = S.decodeUnknownSync(ResultTupleSchema)(result)

  if (tuple.length !== (descriptor.helper === 'getEdgeCenter' ? 4 : 5)) {
    throw new TypeError('Unexpected captured tuple length')
  }

  return { kind: 'return', tuple: tuple.map(tagScalar) }
}

const cases: PathCase[] = []

const add = (
  helper: PathCase['helper'],
  group: PathCase['group'],
  id: string,
  fields: Readonly<Record<string, RawScalar>>,
  domain: PathCase['domain'] = 'numeric'
): void => {
  cases.push({
    helper,
    group,
    id: `${helper}/${id}`,
    domain,
    input: {
      tag: 'object',
      fields: Object.fromEntries(
        Object.entries(fields).map(([name, value]) => [name, tagScalar(value)])
      ),
    },
  })
}

const helpers = HelperSchema.literals

const coords = {
  sourceX: -30.5,
  sourceY: 12.25,
  targetX: 140.75,
  targetY: 93.5,
}

const coordinates = ['sourceX', 'sourceY', 'targetX', 'targetY']

const sides = ['left', 'right', 'top', 'bottom']

const coordinateCases = {
  forward: coords,
  reverse: { sourceX: 140.75, sourceY: 93.5, targetX: -30.5, targetY: 12.25 },
  coincident: {
    sourceX: -30.5,
    sourceY: 12.25,
    targetX: -30.5,
    targetY: 12.25,
  },
  horizontal: {
    sourceX: -30.5,
    sourceY: 12.25,
    targetX: 140.75,
    targetY: 12.25,
  },
  vertical: { sourceX: -30.5, sourceY: 12.25, targetX: -30.5, targetY: 93.5 },
  zero: { sourceX: 0, sourceY: 0, targetX: 0, targetY: 0 },
}

for (const helper of helpers) {
  for (const [name, fields] of Object.entries(coordinateCases)) {
    add(helper, 'coordinates', name, fields)
  }

  for (const coordinate of coordinates) {
    add(helper, 'coordinates', `perturb-${coordinate}`, {
      ...coords,
      [coordinate]: 7.125,
    })
  }

  for (const coordinate of coordinates) {
    for (const [name, value] of [
      ['NaN', Number.NaN],
      ['plusInfinity', Infinity],
      ['minusInfinity', -Infinity],
      ['negativeZero', -0],
      ['large', 1e150],
    ] satisfies [string, number][]) {
      add(helper, 'numeric-malformed', `${coordinate}-${name}`, {
        ...coords,
        [coordinate]: value,
      })
    }

    const omitted = Object.fromEntries(
      Object.entries(coords).filter(([name]) => name !== coordinate)
    )

    add(
      helper,
      'numeric-malformed',
      `missing-${coordinate}`,
      omitted,
      'outside-type'
    )

    for (const [name, value] of [
      ['undefined', undefined],
      ['null', null],
      ['string', '7'],
    ] satisfies [string, RawScalar][]) {
      add(
        helper,
        'numeric-malformed',
        `${coordinate}-${name}`,
        { ...coords, [coordinate]: value },
        'outside-type'
      )
    }
  }

  for (const scalar of [null, undefined, 'argument', 7]) {
    cases.push({
      helper,
      group: 'numeric-malformed',
      id: `${helper}/nonobject-${tagScalar(scalar).tag}`,
      domain: 'outside-type',
      input: tagScalar(scalar),
    })
  }
}

for (const helper of [
  'getBezierPath',
  'getSimpleBezierPath',
  'getSmoothStepPath',
] satisfies PathCase['helper'][]) {
  for (const [coordinateCase, fields] of Object.entries(coordinateCases).filter(
    ([name]) => ['forward', 'reverse', 'coincident'].includes(name)
  )) {
    for (const sourcePosition of sides) {
      for (const targetPosition of sides) {
        add(
          helper,
          'sides-defaults',
          `sides-${coordinateCase}-${sourcePosition}-${targetPosition}`,
          { ...fields, sourcePosition, targetPosition }
        )
      }
    }
  }

  add(helper, 'sides-defaults', 'omitted-source', {
    ...coords,
    targetPosition: 'left',
  })
  add(helper, 'sides-defaults', 'omitted-target', {
    ...coords,
    sourcePosition: 'right',
  })
  add(helper, 'sides-defaults', 'omitted-both', coords)

  for (const field of ['sourcePosition', 'targetPosition']) {
    add(helper, 'sides-defaults', `${field}-own-undefined`, {
      ...coords,
      [field]: undefined,
    })

    for (const value of [null, 'invalid']) {
      add(
        helper,
        'numeric-malformed',
        `${field}-${String(value)}`,
        { ...coords, [field]: value },
        'outside-type'
      )
    }
  }
}

for (const direction of ['backwards', 'positive']) {
  const fields = {
    ...coords,
    sourcePosition: direction === 'backwards' ? 'left' : 'right',
    targetPosition: direction === 'backwards' ? 'right' : 'left',
  }

  add('getBezierPath', 'curvature', `${direction}-default`, fields)

  for (const curvature of [0, 0.25, 0.5, -0.5]) {
    add('getBezierPath', 'curvature', `${direction}-${curvature}`, {
      ...fields,
      curvature,
    })
  }
}

const routes = {
  oppositeHorizontal: {
    ...coords,
    sourcePosition: 'right',
    targetPosition: 'left',
  },
  oppositeVertical: {
    ...coords,
    sourcePosition: 'bottom',
    targetPosition: 'top',
  },
  same: { ...coords, sourcePosition: 'right', targetPosition: 'right' },
  orthogonal: { ...coords, sourcePosition: 'right', targetPosition: 'bottom' },
  tie: {
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: 'right',
    targetPosition: 'right',
  },
  collapsed: {
    sourceX: 0,
    sourceY: 0,
    targetX: 0,
    targetY: 0,
    sourcePosition: 'right',
    targetPosition: 'right',
  },
}

const optionValues = {
  borderRadius: [0, 5, 1000, -5],
  offset: [0, 20, 35, -10],
  stepPosition: [0, 0.25, 0.5, 1, -0.5, 1.5],
  centerX: [0, 23],
  centerY: [0, 37],
}

for (const [route, fields] of Object.entries(routes)) {
  add('getSmoothStepPath', 'smooth-options', `${route}-default`, fields)

  for (const [option, values] of Object.entries(optionValues)) {
    for (const value of values) {
      add(
        'getSmoothStepPath',
        'smooth-options',
        `${route}-${option}-${value}`,
        { ...fields, [option]: value }
      )
    }
  }

  for (const value of [0, 33]) {
    add('getSmoothStepPath', 'smooth-options', `${route}-centers-${value}`, {
      ...fields,
      centerX: value,
      centerY: value,
    })
  }
}

for (const side of sides) {
  const axis = side === 'left' || side === 'right' ? 'X' : 'Y'

  const fields = {
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: side,
    targetPosition: side,
    offset: 20,
  }

  for (const endpoint of ['source', 'target']) {
    add(
      'getSmoothStepPath',
      'numeric-malformed',
      `BUG-088-01-${side}-${endpoint}-NaN`,
      { ...fields, [`${endpoint}${axis}`]: Number.NaN }
    )
  }

  add(
    'getSmoothStepPath',
    'numeric-malformed',
    `BUG-088-01-${side}-offset-NaN`,
    { ...fields, offset: Number.NaN }
  )

  for (const gap of [10, 20, 30]) {
    add(
      'getSmoothStepPath',
      'smooth-options',
      `BUG-088-01-${side}-finite-gap-${gap}`,
      { ...fields, [`target${axis}`]: gap }
    )
  }
}

for (const [helper, options] of [
  ['getBezierPath', ['curvature']],
  [
    'getSmoothStepPath',
    ['borderRadius', 'offset', 'stepPosition', 'centerX', 'centerY'],
  ],
] satisfies [PathCase['helper'], string[]][]) {
  for (const option of options) {
    add(helper, 'numeric-malformed', `${option}-own-undefined`, {
      ...coords,
      [option]: undefined,
    })

    for (const [name, value] of [
      ['NaN', Number.NaN],
      ['plusInfinity', Infinity],
      ['minusInfinity', -Infinity],
      ['large', 1e150],
    ] satisfies [string, number][]) {
      add(helper, 'numeric-malformed', `${option}-${name}`, {
        ...coords,
        [option]: value,
      })
    }

    for (const [name, value] of [
      ['null', null],
      ['string', '7'],
    ] satisfies [string, RawScalar][]) {
      add(
        helper,
        'numeric-malformed',
        `${option}-${name}`,
        { ...coords, [option]: value },
        'outside-type'
      )
    }
  }
}

for (const [alias, helper] of [
  ['default', 'getBezierPath'],
  ['simplebezier', 'getSimpleBezierPath'],
  ['step', 'getSmoothStepPath'],
  ['smoothstep', 'getSmoothStepPath'],
  ['straight', 'getStraightPath'],
] satisfies [string, PathCase['helper']][]) {
  add(
    helper,
    'aliases',
    `alias-${alias}`,
    alias === 'step' ? { ...coords, borderRadius: 0 } : coords
  )
}

export const pathCases = S.decodeUnknownSync(S.Array(CaseSchema))(cases)
