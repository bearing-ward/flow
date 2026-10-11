import {
  Cause,
  Effect,
  Exit,
  Option,
  Schema as S,
  SchemaIssue,
  SchemaParser,
  Predicate,
} from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowEdgeVariantSchema } from './flow-data-contract.ts'
import { FlowDefaultEdgeOptionsSchema } from './flow-default-edge-options.ts'
import {
  MeasuredHandleSchema,
  bezierEdgePath,
  edgeAttachmentPosition,
  edgeLabelPosition,
  resolveEdgeHandles,
  straightEdgePath,
} from './flow-edge.schema.ts'
import {
  decodeFlowDocument,
  FlowEdgeMarkerConfigurationSchema,
  FlowEdgeMarkerValueSchema,
  FlowEdgeMarkerSchema,
  FlowEdgeSchema,
} from './flow.schema.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    edges: [{ id: 'edge-1', source: 'first', target: 'second' }],
    nodes: [
      {
        id: 'first',
        label: 'First',
        position: { x: 100, y: 120 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'second',
        label: 'Second',
        position: { x: 350, y: 120 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
  })
)

describe('straight edge geometry', () => {
  it('uses explicit noncanonical declarations and their measured physical sides', () => {
    const accepted = Effect.runSync(
      decodeFlowDocument({
        nodes: document.nodes.map((node) => ({
          ...node,
          handles: [
            {
              id: 'physical',
              kind: node.id === 'first' ? 'target' : 'source',
              side: node.id === 'first' ? 'left' : 'bottom',
            },
          ],
        })),
        edges: [
          {
            id: 'edge',
            source: 'first',
            sourceHandle: 'physical',
            target: 'second',
            targetHandle: 'physical',
          },
        ],
      })
    )

    const [edge] = accepted.edges

    if (edge === undefined) {
      throw new Error('Expected explicit edge')
    }

    const resolved = resolveEdgeHandles(accepted, edge)

    if (resolved === undefined) {
      throw new Error('Expected physical declarations')
    }

    const source = S.decodeUnknownSync(MeasuredHandleSchema)({
      nodeId: 'first',
      handleId: 'physical',
      offset: { x: 10, y: 20 },
      width: 12,
      height: 12,
    })

    const target = S.decodeUnknownSync(MeasuredHandleSchema)({
      nodeId: 'second',
      handleId: 'physical',
      offset: { x: 30, y: 40 },
      width: 12,
      height: 12,
    })

    expect(
      edgeAttachmentPosition(
        resolved.sourceNode.position,
        resolved.sourceHandle,
        source
      )
    ).toStrictEqual({ x: 104, y: 140 })
    expect(
      edgeAttachmentPosition(
        resolved.targetNode.position,
        resolved.targetHandle,
        target
      )
    ).toStrictEqual({ x: 380, y: 166 })
    expect(resolved.sourceHandle.kind).toBe('target')
    expect(resolved.targetHandle.kind).toBe('source')
  })

  it('selects the first declared handles when an edge omits handle IDs', () => {
    const [edge] = document.edges

    if (edge === undefined) {
      throw new Error('Missing test edge')
    }

    const resolved = resolveEdgeHandles(document, edge)

    expect(resolved?.sourceHandle.id).toBe('out')
    expect(resolved?.targetHandle.id).toBe('in')
  })

  it('attaches a straight path to measured handle sides', () => {
    const [edge] = document.edges

    if (edge === undefined) {
      throw new Error('Missing test edge')
    }

    const resolved = resolveEdgeHandles(document, edge)

    if (resolved === undefined) {
      throw new Error('Missing test handles')
    }

    const sourceMeasured = S.decodeSync(MeasuredHandleSchema)({
      nodeId: 'first',
      handleId: 'out',
      offset: { x: 149, y: 22 },
      width: 12,
      height: 12,
    })

    const targetMeasured = S.decodeSync(MeasuredHandleSchema)({
      nodeId: 'second',
      handleId: 'in',
      offset: { x: -1, y: 22 },
      width: 12,
      height: 12,
    })

    const source = edgeAttachmentPosition(
      resolved.sourceNode.position,
      resolved.sourceHandle,
      sourceMeasured
    )

    const target = edgeAttachmentPosition(
      resolved.targetNode.position,
      resolved.targetHandle,
      targetMeasured
    )

    expect(source).toStrictEqual({ x: 255, y: 142 })
    expect(target).toStrictEqual({ x: 343, y: 142 })
    expect(straightEdgePath(source, target)).toBe('M 255,142L 343,142')
  })
})

describe('Bezier edge geometry', () => {
  it('accepts the explicit Bezier path choice at document decode', () => {
    const decoded = Effect.runSync(
      decodeFlowDocument({
        ...document,
        edges: [
          {
            id: 'edge-1',
            source: 'first',
            target: 'second',
            path: 'bezier',
          },
        ],
      })
    )

    expect(decoded.edges[0]?.path).toBe('bezier')
  })

  it('places forward horizontal controls halfway between endpoints', () => {
    expect(
      bezierEdgePath({ x: 0, y: 0 }, { x: 100, y: 0 }, 'right', 'left')
    ).toBe('M0,0 C50,0 50,0 100,0')
  })

  it('bends controls outward for backward horizontal endpoints', () => {
    expect(
      bezierEdgePath({ x: 100, y: 0 }, { x: 0, y: 0 }, 'right', 'left')
    ).toBe('M100,0 C162.5,0 -62.5,0 0,0')
  })

  it('uses vertical and mixed attachment sides', () => {
    expect(
      bezierEdgePath({ x: 0, y: 100 }, { x: 0, y: 0 }, 'top', 'bottom')
    ).toBe('M0,100 C0,50 0,50 0,0')

    expect(
      bezierEdgePath({ x: 0, y: 0 }, { x: 100, y: 100 }, 'right', 'top')
    ).toBe('M0,0 C50,0 100,50 100,100')
  })
})

describe('edge label geometry', () => {
  it('centers straight labels between attachments', () => {
    expect(
      edgeLabelPosition(
        { x: 0, y: 0 },
        { x: 100, y: 40 },
        'straight',
        'right',
        'left'
      )
    ).toStrictEqual({ x: 50, y: 20 })
  })

  it('places Bezier labels at the cubic half-parameter point', () => {
    expect(
      edgeLabelPosition(
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        'bezier',
        'right',
        'top'
      )
    ).toStrictEqual({ x: 68.75, y: 31.25 })
  })
})

describe('edge marker and stroke contracts', () => {
  it('decodes supported arrows and positive stroke width', () => {
    const decoded = Effect.runSync(
      decodeFlowDocument({
        ...document,
        edges: [
          {
            id: 'edge-1',
            source: 'first',
            target: 'second',
            markerStart: 'arrowclosed',
            markerEnd: 'arrow',
            stroke: '#ff0000',
            strokeWidth: 3,
          },
        ],
      })
    )

    expect(decoded.edges[0]).toMatchObject({
      markerStart: 'arrowclosed',
      markerEnd: 'arrow',
      stroke: '#ff0000',
      strokeWidth: 3,
    })
  })

  it('retains an exact empty accessibility label through full document decoding', () => {
    const decoded = Effect.runSync(
      decodeFlowDocument({
        ...document,
        edges: [
          {
            id: 'edge-1',
            source: 'first',
            target: 'second',
            ariaLabel: '',
          },
        ],
      })
    )

    expect({
      label: decoded.edges[0]?.ariaLabel,
      ownLabel: Object.hasOwn(decoded.edges[0] ?? {}, 'ariaLabel'),
    }).toStrictEqual({ label: '', ownLabel: true })
  })

  it('rejects unsupported arrows, reconnection options, colors, and widths', () => {
    for (const invalid of [
      { markerStart: 'triangle' },
      { stroke: 'red' },
      { strokeWidth: 0 },
      { interactionWidth: 0 },
      { reconnectable: 'both' },
      { ariaLabel: null },
      { ariaLabel: false },
    ]) {
      expect(() =>
        Effect.runSync(
          decodeFlowDocument({
            ...document,
            edges: [
              {
                id: 'edge-1',
                source: 'first',
                target: 'second',
                ...invalid,
              },
            ],
          })
        )
      ).toThrow(/./u)
    }
  })
})

describe('original 065 handle identity boundary, unit path', () => {
  it('rejects null, empty and missing identities rather than inventing DOM identities', () => {
    for (const handleId of [null, '', undefined]) {
      expect(() =>
        S.decodeUnknownSync(MeasuredHandleSchema)({
          nodeId: 'node',
          handleId,
          offset: { x: 0, y: 0 },
          width: 0,
          height: 0,
        })
      ).toThrow('Expected')
    }
  })
})

// Standalone foundation tests use caller-owned compositions; existing graphs remain unchanged.
let markerAssertions = 0

const markerCase = (name: string, run: () => void) =>
  it(`marker foundation: ${name}`, () => {
    const before = markerAssertions
    run()
    expect(markerAssertions).toBeGreaterThan(before)
  })

const markerCheck = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message)
  }

  markerAssertions += 1
}

const markerFailure = <A, E>(
  result: Exit.Exit<A, E>,
  label: string,
  boundary: 'schema' | 'issue' = 'schema'
) => {
  markerCheck(Exit.isFailure(result), `${label}: rejection`)

  if (Exit.isFailure(result)) {
    markerCheck(Cause.hasFails(result.cause), `${label}: typed failure`)
    markerCheck(
      !Cause.hasDies(result.cause),
      `${label}: no defect or suspension`
    )
    markerCheck(!Cause.hasInterrupts(result.cause), `${label}: no interruption`)
    const error = Cause.findErrorOption(result.cause)
    markerCheck(Option.isSome(error), `${label}: actual error`)

    if (Option.isSome(error)) {
      markerCheck(
        boundary === 'schema'
          ? error.value instanceof S.SchemaError
          : SchemaIssue.isIssue(error.value),
        `${label}: exact ${boundary} failure`
      )
    }
  }
}

const markerDecode = S.decodeUnknownSync(FlowEdgeMarkerConfigurationSchema)

const markerEncode = S.encodeUnknownSync(FlowEdgeMarkerConfigurationSchema)

const markerJson = S.toCodecJson(FlowEdgeMarkerConfigurationSchema)

const markerEquivalent = S.toEquivalence(FlowEdgeMarkerConfigurationSchema)

const markerColors = [
  { name: 'absent', fields: {} },
  { name: 'undefined', fields: { color: undefined } },
  { name: 'null', fields: { color: null } },
  { name: 'empty', fields: { color: '' } },
  { name: 'css', fields: { color: 'var(--edge, rgb(1 2 3 / 40%))' } },
]

for (const kind of ['arrow', 'arrowclosed']) {
  for (const schema of [
    FlowEdgeMarkerConfigurationSchema,
    FlowEdgeMarkerValueSchema,
  ]) {
    const identity =
      schema === FlowEdgeMarkerConfigurationSchema ? 'configuration' : 'value'

    const decodeColor = S.decodeUnknownSync(schema)
    const encodeColor = S.encodeUnknownSync(schema)
    const colorCodec = S.toCodecJson(schema)
    const equalColor = S.toEquivalence(schema)

    for (const color of markerColors) {
      markerCase(`${identity} ${kind} color ${color.name}`, () => {
        const input = { type: kind, ...color.fields }
        const decoded = decodeColor(input)
        const encoded = encodeColor(decoded)
        const encodedAgain = encodeColor(decoded)
        const wire = S.encodeUnknownSync(colorCodec)(decoded)

        const restored = S.decodeUnknownSync(colorCodec)(
          // eslint-disable-next-line unicorn/prefer-structured-clone -- canonical JSON roundtrip must cross actual serialized JSON.
          JSON.parse(JSON.stringify(wire))
        )

        markerCheck(
          decoded !== input && encoded !== decoded && encodedAgain !== encoded,
          'ordinary outputs detach'
        )

        for (const output of [decoded, encoded, encodedAgain, restored]) {
          if (Predicate.isString(output)) {
            throw new TypeError('Expected configuration color branch')
          }

          markerCheck(
            Object.hasOwn(output, 'color') === Object.hasOwn(input, 'color'),
            'exact color own key'
          )
          markerCheck(output.color === input.color, 'exact color value')
          markerCheck(!Object.hasOwn(output, 'colorPresence'), 'no live flags')
          markerCheck(
            Object.keys(output).length === Object.keys(input).length,
            'no defaults'
          )
        }

        markerCheck(
          equalColor(decoded, restored),
          'detached equal configurations'
        )

        // eslint-disable-next-line anti-slop/no-runtime-typeof -- public Json must be narrowed before own-key and value assertions.
        if (
          // eslint-disable-next-line anti-slop/no-runtime-typeof -- narrow public Json before inspecting actual wire keys.
          typeof wire === 'object' &&
          wire !== null &&
          !Array.isArray(wire) &&
          Predicate.isReadonlyObject(wire)
        ) {
          markerCheck(
            Object.hasOwn(wire, 'colorPresence') ===
              (color.name === 'undefined'),
            'wire flag presence'
          )
          markerCheck(
            Object.hasOwn(wire, 'color') ===
              (Object.hasOwn(input, 'color') && color.name !== 'undefined'),
            'wire color presence'
          )
        } else {
          throw new TypeError('Expected a JSON configuration object')
        }
      })
    }
  }
}

markerCase('own color presence distinguishes absent undefined and null', () => {
  const absent = markerDecode({ type: 'arrow' })
  const ownUndefined = markerDecode({ type: 'arrow', color: undefined })
  const ownNull = markerDecode({ type: 'arrow', color: null })
  markerCheck(
    !markerEquivalent(absent, ownUndefined),
    'absence differs from own undefined'
  )
  markerCheck(!markerEquivalent(absent, ownNull), 'absence differs from null')
  markerCheck(
    !markerEquivalent(ownUndefined, ownNull),
    'own undefined differs from null'
  )
  markerCheck(
    !markerEquivalent(absent, markerDecode({ type: 'arrowclosed' })),
    'kinds differ'
  )
})

for (const field of [
  'width',
  'height',
  'strokeWidth',
] satisfies readonly (keyof typeof FlowEdgeMarkerConfigurationSchema.Type)[]) {
  for (const value of [undefined, 0, 1.25, Number.MAX_VALUE]) {
    markerCase(`${field} accepts ${String(value)}`, () => {
      const input = { type: 'arrow', [field]: value }

      for (const output of [
        markerDecode(input),
        markerEncode(markerDecode(input)),
      ]) {
        markerCheck(Object.hasOwn(output, field), 'numeric own presence')
        markerCheck(output[field] === value, 'numeric exact value')
      }

      const restored = S.decodeUnknownSync(markerJson)(
        // eslint-disable-next-line unicorn/prefer-structured-clone -- this proof crosses serialized canonical JSON, not a clone.
        JSON.parse(
          JSON.stringify(S.encodeUnknownSync(markerJson)(markerDecode(input)))
        )
      )

      markerCheck(
        Object.hasOwn(restored, field) && restored[field] === value,
        'numeric JSON presence/value'
      )
    })
  }

  for (const value of [-1, Number.NaN, Infinity, -Infinity, null, '1', false]) {
    markerCase(`${field} rejects ${String(value)}`, () => {
      const input = { type: 'arrow', [field]: value }
      markerFailure(
        S.decodeUnknownExit(FlowEdgeMarkerConfigurationSchema)(input),
        'numeric decode'
      )
      markerFailure(
        S.encodeUnknownExit(FlowEdgeMarkerConfigurationSchema)(input),
        'numeric encode'
      )
      markerFailure(
        S.encodeUnknownExit(markerJson)(input),
        'numeric JSON encode rejects invalid live value'
      )

      if (value !== null) {
        markerFailure(
          S.decodeUnknownExit(markerJson)(input),
          'numeric JSON decode'
        )
      }
    })
  }
}

for (const field of [
  'markerUnits',
  'orient',
] satisfies readonly (keyof typeof FlowEdgeMarkerConfigurationSchema.Type)[]) {
  for (const value of [undefined, '', 'userSpaceOnUse', 'custom angle 73']) {
    markerCase(`${field} accepts ${String(value)}`, () => {
      const input = { type: 'arrowclosed', [field]: value }
      const decoded = markerDecode(input)

      const restored = S.decodeUnknownSync(markerJson)(
        // eslint-disable-next-line unicorn/prefer-structured-clone -- canonical JSON roundtrip must cross actual serialized JSON.
        JSON.parse(JSON.stringify(S.encodeUnknownSync(markerJson)(decoded)))
      )

      for (const output of [decoded, markerEncode(decoded), restored]) {
        markerCheck(
          Object.hasOwn(output, field) && output[field] === value,
          'string exact own value'
        )
      }
    })
  }

  for (const value of [null, 12, () => 'invalid']) {
    markerCase(`${field} rejects ${String(value)}`, () => {
      markerFailure(
        S.decodeUnknownExit(FlowEdgeMarkerConfigurationSchema)({
          type: 'arrow',
          [field]: value,
        }),
        'string field decode'
      )
      markerFailure(
        S.encodeUnknownExit(markerJson)({ type: 'arrow', [field]: value }),
        'string field JSON encode'
      )
      markerFailure(
        S.encodeUnknownExit(FlowEdgeMarkerConfigurationSchema)({
          type: 'arrow',
          [field]: value,
        }),
        'string field ordinary encode'
      )

      if (value !== null) {
        markerFailure(
          S.decodeUnknownExit(markerJson)({ type: 'arrow', [field]: value }),
          'string field JSON decode'
        )
      }
    })
  }
}

for (const value of [
  'arrow',
  'arrowclosed',
  '',
  'scope:marker#logical',
  { type: 'arrow' },
  { type: 'arrowclosed', color: undefined },
]) {
  markerCase(`value accepts ${JSON.stringify(value)}`, () => {
    const decoded = S.decodeUnknownSync(FlowEdgeMarkerValueSchema)(value)
    const codec = S.toCodecJson(FlowEdgeMarkerValueSchema)

    const restored = S.decodeUnknownSync(codec)(
      // eslint-disable-next-line unicorn/prefer-structured-clone -- canonical JSON roundtrip must cross actual serialized JSON.
      JSON.parse(JSON.stringify(S.encodeUnknownSync(codec)(decoded)))
    )

    markerCheck(
      S.toEquivalence(FlowEdgeMarkerValueSchema)(decoded, restored),
      'value roundtrip'
    )
  })
}

for (const value of [
  null,
  undefined,
  () => 'invalid',
  [],
  1,
  false,
  {},
  { type: 'invalid' },
  { type: 'arrow', color: 1 },
  { type: 'arrow', colorPresence: undefined },
  { type: 'arrow', colorPresence: 'explicit-undefined' },
]) {
  markerCase(`value rejects ${String(value)}`, () => {
    markerFailure(
      S.decodeUnknownExit(FlowEdgeMarkerValueSchema)(value),
      'value decode'
    )
    markerFailure(
      S.encodeUnknownExit(FlowEdgeMarkerValueSchema)(value),
      'value encode'
    )
    markerFailure(
      Effect.runSyncExit(
        SchemaParser.decodeUnknownEffect(FlowEdgeMarkerValueSchema)(value)
      ),
      'internal parser',
      'issue'
    )
  })
}

for (const fields of [
  { colorPresence: undefined },
  { colorPresence: 'wrong' },
  { colorPresence: 'explicit-undefined', color: undefined },
  { colorPresence: 'explicit-undefined', color: null },
  { colorPresence: 'explicit-undefined', color: 'red' },
  { colorPresence: 'explicit-undefined', color: '' },
  { colorPresence: 1 },
]) {
  markerCase(
    `JSON wire rejects raw keys ${Object.keys(fields).join(',')} color ${String(fields.color)} flag ${String(fields.colorPresence)}`,
    () => {
      const result = S.decodeUnknownExit(markerJson)({
        type: 'arrow',
        ...fields,
      })

      markerFailure(result, 'wire decode')
      markerFailure(
        Effect.runSyncExit(
          SchemaParser.decodeUnknownEffect(markerJson)({
            type: 'arrow',
            ...fields,
          })
        ),
        'internal wire parser',
        'issue'
      )

      if (
        Object.hasOwn(fields, 'color') &&
        fields.color !== undefined &&
        Exit.isFailure(result)
      ) {
        markerCheck(
          Cause.pretty(result.cause).includes(
            'Marker color flag/value conflict'
          ),
          'stable conflict message'
        )
      }
    }
  )
}

markerCase(
  'unknown ordinary keys strip through authoritative Struct parser',
  () => {
    const decoded = markerDecode({ type: 'arrow', unrelated: 'ignored' })
    markerCheck(
      !Object.hasOwn(decoded, 'unrelated'),
      'ordinary unknown key stripped'
    )

    const wire = S.decodeUnknownSync(markerJson)({
      type: 'arrowclosed',
      unrelated: 'ignored',
    })

    markerCheck(!Object.hasOwn(wire, 'unrelated'), 'JSON unknown key stripped')
  }
)

const markerCaller = S.Struct({
  start: S.optional(FlowEdgeMarkerValueSchema),
  end: S.optional(FlowEdgeMarkerValueSchema),
})

const markerSlot = S.Struct({ value: S.optional(S.Unknown) })

const markerSlots: readonly (typeof markerSlot.Type)[] = [
  {},
  { value: undefined },
  { value: '' },
  { value: 'id:custom' },
  ...markerColors.map((color) => ({
    value: { type: 'arrowclosed', ...color.fields },
  })),
]

for (const [startIndex, start] of markerSlots.entries()) {
  for (const [endIndex, end] of markerSlots.entries()) {
    markerCase(
      `caller-owned recursive Struct ${startIndex}/${endIndex}`,
      () => {
        // eslint-disable-next-line anti-slop/no-unsafe-dictionary-type -- raw caller inputs deliberately retain absent versus own undefined before Schema decoding.
        const input: Record<string, unknown> = {}

        if (Object.hasOwn(start, 'value')) {
          input.start = start.value
        }

        if (Object.hasOwn(end, 'value')) {
          input.end = end.value
        }

        const decoded = S.decodeUnknownSync(markerCaller)(input)
        const codec = S.toCodecJson(markerCaller)

        const restored = S.decodeUnknownSync(codec)(
          // eslint-disable-next-line unicorn/prefer-structured-clone -- canonical JSON roundtrip must cross actual serialized JSON.
          JSON.parse(JSON.stringify(S.encodeUnknownSync(codec)(decoded)))
        )

        markerCheck(
          S.toEquivalence(markerCaller)(decoded, restored),
          'recursive caller equality and presence'
        )

        for (const key of ['start', 'end']) {
          markerCheck(
            Object.hasOwn(decoded, key) === Object.hasOwn(input, key),
            'ordinary caller presence'
          )
          markerCheck(
            Object.hasOwn(restored, key) === Object.hasOwn(input, key),
            'JSON caller presence'
          )
        }
      }
    )
  }
}

markerCase(
  'caller-owned Struct retains real fields mapFields annotate check and rebuild',
  () => {
    markerCheck(markerCaller.fields.start !== undefined, 'real fields')

    const mapped = markerCaller.mapFields((fields) => ({
      ...fields,
      note: S.optional(S.String),
    }))

    const annotated = mapped
      .annotate({ identifier: '090 caller-owned markers' })
      .check(S.makeFilter(() => true))

    const rebuilt = S.Struct(annotated.fields)
    const input = { start: { type: 'arrow', color: undefined }, note: 'caller' }
    markerCheck(
      S.decodeUnknownSync(rebuilt)(input).note === 'caller',
      'rebuild keeps caller field'
    )
  }
)

const markerFactory = createFlowEdgeVariantSchema({
  type: S.Literal('weighted'),
  data: S.Struct({ weight: S.Number }),
})

for (const field of [
  'markerStart',
  'markerEnd',
] satisfies readonly (keyof typeof FlowEdgeSchema.Type)[]) {
  for (const marker of ['arrow', 'arrowclosed', undefined]) {
    markerCase(`protected ${field} accepts old ${String(marker)}`, () => {
      const input = { id: 'edge', source: 'a', target: 'b', [field]: marker }

      for (const output of [
        S.decodeUnknownSync(FlowEdgeSchema)(input),
        S.decodeUnknownSync(FlowDefaultEdgeOptionsSchema)({ [field]: marker }),
        S.decodeUnknownSync(markerFactory)({
          ...input,
          type: 'weighted',
          data: { weight: 1 },
        }),
      ]) {
        markerCheck(
          Object.hasOwn(output, field) && output[field] === marker,
          'old endpoint exact presence'
        )
      }
    })
  }

  for (const marker of [{ type: 'arrow' }, 'reference:id', '', null]) {
    markerCase(
      `protected ${field} rejects new ${JSON.stringify(marker)}`,
      () => {
        const input = { id: 'edge', source: 'a', target: 'b', [field]: marker }
        markerFailure(
          S.decodeUnknownExit(FlowEdgeSchema)(input),
          'existing edge'
        )
        markerFailure(
          S.decodeUnknownExit(FlowDefaultEdgeOptionsSchema)({
            [field]: marker,
          }),
          'existing defaults'
        )
        markerFailure(
          S.decodeUnknownExit(markerFactory)({
            ...input,
            type: 'weighted',
            data: { weight: 1 },
          }),
          'accepted factory'
        )
      }
    )
  }
}

markerCase(
  'existing kind and edge remain genuine unchanged Schema capabilities',
  () => {
    markerCheck(
      S.decodeUnknownSync(FlowEdgeMarkerSchema)('arrow') === 'arrow',
      'legacy kind'
    )
    markerFailure(
      S.decodeUnknownExit(FlowEdgeMarkerSchema)('custom'),
      'legacy kind rejects arbitrary string'
    )
    const mapped = FlowEdgeSchema.mapFields((fields) => fields)
    markerCheck(
      mapped.fields.markerStart === FlowEdgeSchema.fields.markerStart,
      'existing real edge fields/mapFields'
    )
  }
)

// Both public schemas exercise every nonnullable optional field at each boundary.
for (const kind of ['arrow', 'arrowclosed']) {
  for (const field of [
    'width',
    'height',
    'strokeWidth',
    'markerUnits',
    'orient',
  ] satisfies readonly (keyof typeof FlowEdgeMarkerConfigurationSchema.Type)[]) {
    const numeric =
      field === 'width' || field === 'height' || field === 'strokeWidth'

    const validValues = numeric
      ? [0, 1.25, Number.MAX_VALUE]
      : ['', 'userSpaceOnUse', 'custom angle 73', 'auto']

    const invalidValues = numeric
      ? [-1, Number.NaN, Infinity, -Infinity, null, '1', false]
      : [null, 12, () => 'invalid']

    for (const schema of [
      FlowEdgeMarkerConfigurationSchema,
      FlowEdgeMarkerValueSchema,
    ]) {
      const identity =
        schema === FlowEdgeMarkerConfigurationSchema ? 'configuration' : 'value'

      const codec = S.toCodecJson(schema)

      for (const presence of ['absent', 'undefined']) {
        markerCase(
          `${identity} ${kind} ${field} ${presence} complete boundary`,
          () => {
            const input =
              presence === 'absent'
                ? { type: kind }
                : { type: kind, [field]: undefined }

            const decoded = S.decodeUnknownSync(schema)(input)
            const ordinary = S.encodeUnknownSync(schema)(decoded)
            const ordinaryAgain = S.encodeUnknownSync(schema)(decoded)
            const wire = S.encodeUnknownSync(codec)(decoded)

            const restored = S.decodeUnknownSync(codec)(
              // eslint-disable-next-line unicorn/prefer-structured-clone -- canonical JSON roundtrip must cross actual serialized JSON.
              JSON.parse(JSON.stringify(wire))
            )

            markerCheck(
              decoded !== input &&
                ordinary !== decoded &&
                ordinaryAgain !== ordinary,
              'detached ordinary outputs'
            )

            for (const output of [decoded, ordinary, ordinaryAgain, restored]) {
              if (Predicate.isString(output)) {
                throw new TypeError('Expected configuration branch')
              }

              markerCheck(
                Object.hasOwn(output, field) === (presence === 'undefined'),
                'exact own optional key'
              )
              markerCheck(
                output[field] === undefined,
                'no defaults or wire sentinel in live value'
              )
              markerCheck(
                !Object.hasOwn(output, 'colorPresence'),
                'no ordinary metadata'
              )
            }

            if (
              // eslint-disable-next-line anti-slop/no-runtime-typeof -- public Json must be narrowed before own-key and value assertions.
              typeof wire === 'object' &&
              wire !== null &&
              !Array.isArray(wire) &&
              Predicate.isReadonlyObject(wire)
            ) {
              markerCheck(
                Object.hasOwn(wire, field) === (presence === 'undefined'),
                'wire own key'
              )
              markerCheck(
                wire[field] === (presence === 'undefined' ? null : undefined),
                'wire exact null sentinel'
              )
            } else {
              throw new TypeError('Expected configuration JSON object')
            }

            const fromNull = S.decodeUnknownSync(codec)({
              type: kind,
              [field]: null,
            })

            if (Predicate.isString(fromNull)) {
              throw new TypeError('Expected configuration branch')
            }

            markerCheck(
              Object.hasOwn(fromNull, field) && fromNull[field] === undefined,
              'raw JSON null restores own undefined'
            )
            markerFailure(
              S.decodeUnknownExit(codec)({ type: kind, [field]: undefined }),
              'raw own undefined is not JSON'
            )
            markerFailure(
              Effect.runSyncExit(
                SchemaParser.decodeUnknownEffect(codec)({
                  type: kind,
                  [field]: undefined,
                })
              ),
              'internal raw own undefined',
              'issue'
            )
            markerCheck(
              S.toEquivalence(schema)(decoded, restored),
              'optional recursive inverse equality'
            )
          }
        )
      }

      for (const value of validValues) {
        markerCase(
          `${identity} ${kind} ${field} valid ${String(value)} complete boundary`,
          () => {
            const input = { type: kind, [field]: value }
            const decoded = S.decodeUnknownSync(schema)(input)
            const ordinary = S.encodeUnknownSync(schema)(decoded)
            const wire = S.encodeUnknownSync(codec)(decoded)

            const restored = S.decodeUnknownSync(codec)(
              // eslint-disable-next-line unicorn/prefer-structured-clone -- canonical JSON roundtrip must cross actual serialized JSON.
              JSON.parse(JSON.stringify(wire))
            )

            for (const output of [decoded, ordinary, restored]) {
              if (Predicate.isString(output)) {
                throw new TypeError('Expected configuration branch')
              }

              markerCheck(
                Object.hasOwn(output, field) && output[field] === value,
                'exact live value and presence'
              )
            }

            if (
              // eslint-disable-next-line anti-slop/no-runtime-typeof -- public Json must be narrowed before own-key and value assertions.
              typeof wire === 'object' &&
              wire !== null &&
              !Array.isArray(wire) &&
              Predicate.isReadonlyObject(wire)
            ) {
              markerCheck(
                Object.hasOwn(wire, field) && wire[field] === value,
                'exact wire value and presence'
              )
            } else {
              throw new TypeError('Expected configuration JSON object')
            }
          }
        )
      }

      for (const value of invalidValues) {
        markerCase(
          `${identity} ${kind} ${field} invalid ${String(value)} complete boundary`,
          () => {
            const input = { type: kind, [field]: value }
            markerFailure(
              S.decodeUnknownExit(schema)(input),
              'ordinary invalid decode'
            )
            markerFailure(
              S.encodeUnknownExit(schema)(input),
              'ordinary invalid encode'
            )
            markerFailure(
              S.encodeUnknownExit(codec)(input),
              'JSON invalid live encode'
            )
            markerFailure(
              Effect.runSyncExit(
                SchemaParser.decodeUnknownEffect(schema)(input)
              ),
              'internal ordinary invalid decode',
              'issue'
            )
            markerFailure(
              Effect.runSyncExit(
                SchemaParser.encodeUnknownEffect(schema)(input)
              ),
              'internal ordinary invalid encode',
              'issue'
            )

            if (value !== null) {
              markerFailure(
                S.decodeUnknownExit(codec)(input),
                'JSON invalid wire decode'
              )
              markerFailure(
                Effect.runSyncExit(
                  SchemaParser.decodeUnknownEffect(codec)(input)
                ),
                'internal invalid wire decode',
                'issue'
              )
            }
          }
        )
      }
    }
  }

  for (const flag of [undefined, 'explicit-undefined', 'wrong', 1]) {
    markerCase(`${kind} reserved live metadata ${String(flag)}`, () => {
      const input = { type: kind, colorPresence: flag }

      for (const schema of [
        FlowEdgeMarkerConfigurationSchema,
        FlowEdgeMarkerValueSchema,
      ]) {
        markerFailure(
          S.decodeUnknownExit(schema)(input),
          'reserved ordinary decode'
        )
        markerFailure(
          S.encodeUnknownExit(schema)(input),
          'reserved ordinary encode'
        )
        markerFailure(
          S.encodeUnknownExit(S.toCodecJson(schema))(input),
          'reserved JSON live encode'
        )
      }
    })
  }

  for (const color of [null, '', 'red', undefined, 1]) {
    markerCase(`${kind} exact wire conflict ${String(color)}`, () => {
      const input = { type: kind, colorPresence: 'explicit-undefined', color }

      for (const schema of [
        FlowEdgeMarkerConfigurationSchema,
        FlowEdgeMarkerValueSchema,
      ]) {
        const codec = S.toCodecJson(schema)
        const high = S.decodeUnknownExit(codec)(input)

        const internal = Effect.runSyncExit(
          SchemaParser.decodeUnknownEffect(codec)(input)
        )

        markerFailure(high, 'conflict high-level')
        markerFailure(internal, 'conflict internal', 'issue')

        if (color === null || Predicate.isString(color)) {
          if (Exit.isFailure(high)) {
            markerCheck(
              Cause.pretty(high.cause).includes(
                'Marker color flag/value conflict'
              ),
              'exact stable conflict text'
            )
          }

          if (Exit.isFailure(internal)) {
            markerCheck(
              Cause.pretty(internal.cause).includes(
                'Marker color flag/value conflict'
              ),
              'internal stable conflict text'
            )
          }
        }
      }
    })
  }

  markerCase(`${kind} caller-owned all five sentinels recursively`, () => {
    for (const color of markerColors) {
      const configuration = {
        type: kind,
        width: undefined,
        height: undefined,
        strokeWidth: undefined,
        markerUnits: undefined,
        orient: undefined,
        ...color.fields,
      }

      const input = { start: configuration, end: configuration }
      const decoded = S.decodeUnknownSync(markerCaller)(input)
      const codec = S.toCodecJson(markerCaller)

      const restored = S.decodeUnknownSync(codec)(
        // eslint-disable-next-line unicorn/prefer-structured-clone -- canonical JSON roundtrip must cross actual serialized JSON.
        JSON.parse(JSON.stringify(S.encodeUnknownSync(codec)(decoded)))
      )

      markerCheck(
        S.toEquivalence(markerCaller)(decoded, restored),
        'all five sentinels and every color preserve recursive presence'
      )
      markerCheck(
        decoded.start !== configuration && decoded.end !== configuration,
        'nested ordinary delivery detached'
      )
      markerFailure(
        S.decodeUnknownExit(markerCaller)({ start: null }),
        'caller live endpoint null'
      )
      markerFailure(
        S.encodeUnknownExit(markerCaller)({ end: null }),
        'caller ordinary endpoint null encode'
      )
    }
  })
}

for (const kind of ['arrow', 'arrowclosed']) {
  for (const flag of [undefined, 'wrong', 1]) {
    markerCase(
      `${kind} malformed wire flag ${String(flag)} both schemas`,
      () => {
        for (const schema of [
          FlowEdgeMarkerConfigurationSchema,
          FlowEdgeMarkerValueSchema,
        ]) {
          const codec = S.toCodecJson(schema)
          const input = { type: kind, colorPresence: flag }
          markerFailure(
            S.decodeUnknownExit(codec)(input),
            'malformed wire flag high-level'
          )
          markerFailure(
            Effect.runSyncExit(SchemaParser.decodeUnknownEffect(codec)(input)),
            'malformed wire flag internal',
            'issue'
          )
        }
      }
    )
  }
}

// Root exactOptionalPropertyTypes proofs are never executed.
const markerExactOptionalProof = () => {
  // @ts-expect-error reserved optional-key Never rejects own undefined in exact mode
  const configuration: typeof FlowEdgeMarkerConfigurationSchema.Type = {
    type: 'arrow',
    colorPresence: undefined,
  }

  // @ts-expect-error ordinary Encoded retains the same reserved-key exclusion
  const encoded: typeof FlowEdgeMarkerConfigurationSchema.Encoded = {
    type: 'arrowclosed',
    colorPresence: undefined,
  }

  return { configuration, encoded }
}

void markerExactOptionalProof
