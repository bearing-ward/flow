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

describe('measured handle identity boundary', () => {
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

const markerSchemas = [
  FlowEdgeMarkerConfigurationSchema,
  FlowEdgeMarkerValueSchema,
]

const markerKinds = ['arrow', 'arrowclosed']

const numericFields = ['width', 'height', 'strokeWidth'] as const

const stringFields = ['markerUnits', 'orient'] as const

const markerFields = [...numericFields, ...stringFields]

const markerColors = [
  { fields: {}, wire: {} },
  {
    fields: { color: undefined },
    wire: { colorPresence: 'explicit-undefined' },
  },
  { fields: { color: null }, wire: { color: null } },
  { fields: { color: '' }, wire: { color: '' } },
  {
    fields: { color: 'var(--edge, rgb(1 2 3 / 40%))' },
    wire: { color: 'var(--edge, rgb(1 2 3 / 40%))' },
  },
]

const serialized = (value: S.Json): S.Json =>
  // eslint-disable-next-line unicorn/prefer-structured-clone -- canonical JSON proofs must cross actual serialized JSON.
  S.decodeUnknownSync(S.Json)(JSON.parse(JSON.stringify(value)))

const expectMarkerFailure = <A, E>(
  result: Exit.Exit<A, E>,
  boundary: 'schema' | 'issue' = 'schema'
) => {
  expect(Exit.isFailure(result)).toBeTruthy()

  if (!Exit.isFailure(result)) {
    throw new Error('Expected marker rejection')
  }

  const error = Cause.findErrorOption(result.cause)
  expect({
    fails: Cause.hasFails(result.cause),
    dies: Cause.hasDies(result.cause),
    interrupts: Cause.hasInterrupts(result.cause),
    error: Option.isSome(error),
  }).toStrictEqual({ fails: true, dies: false, interrupts: false, error: true })

  if (!Option.isSome(error)) {
    throw new Error('Expected typed marker failure')
  }

  expect(
    boundary === 'schema'
      ? error.value instanceof S.SchemaError
      : SchemaIssue.isIssue(error.value)
  ).toBeTruthy()
}

const markerCaller = S.Struct({
  start: S.optional(FlowEdgeMarkerValueSchema),
  end: S.optional(FlowEdgeMarkerValueSchema),
})

const markerFactory = createFlowEdgeVariantSchema({
  type: S.Literal('weighted'),
  data: S.Struct({ weight: S.Number }),
})

describe('marker configuration boundaries', () => {
  it('preserves exact color presence and canonical JSON across both schemas', () => {
    for (const kind of markerKinds) {
      for (const schema of markerSchemas) {
        const codec = S.toCodecJson(schema)

        for (const color of markerColors) {
          const input = { type: kind, ...color.fields }
          const decoded = S.decodeUnknownSync(schema)(input)
          const encoded = S.encodeUnknownSync(schema)(decoded)
          const encodedAgain = S.encodeUnknownSync(schema)(decoded)
          const wire = S.encodeUnknownSync(codec)(decoded)
          const restored = S.decodeUnknownSync(codec)(serialized(wire))

          expect([
            decoded === input,
            encoded === decoded,
            encodedAgain === encoded,
          ]).toStrictEqual([false, false, false])
          expect([decoded, encoded, encodedAgain, restored]).toStrictEqual([
            input,
            input,
            input,
            input,
          ])
          expect(wire).toStrictEqual({ type: kind, ...color.wire })
          expect(S.toEquivalence(schema)(decoded, restored)).toBeTruthy()
        }
      }
    }
  })

  it('distinguishes absent, undefined, null and marker kinds by equivalence', () => {
    const decode = S.decodeUnknownSync(FlowEdgeMarkerConfigurationSchema)
    const equivalent = S.toEquivalence(FlowEdgeMarkerConfigurationSchema)
    const absent = decode({ type: 'arrow' })
    const ownUndefined = decode({ type: 'arrow', color: undefined })
    const ownNull = decode({ type: 'arrow', color: null })
    expect([
      equivalent(absent, ownUndefined),
      equivalent(absent, ownNull),
      equivalent(ownUndefined, ownNull),
      equivalent(absent, decode({ type: 'arrowclosed' })),
    ]).toStrictEqual([false, false, false, false])
  })

  it('preserves standalone references and strips unrelated ordinary and JSON keys', () => {
    const codec = S.toCodecJson(FlowEdgeMarkerValueSchema)

    for (const value of [
      'arrow',
      'arrowclosed',
      '',
      'scope:marker#logical',
      { type: 'arrow' },
      { type: 'arrowclosed', color: undefined },
    ]) {
      const decoded = S.decodeUnknownSync(FlowEdgeMarkerValueSchema)(value)
      expect(
        S.decodeUnknownSync(codec)(
          serialized(S.encodeUnknownSync(codec)(decoded))
        )
      ).toStrictEqual(value)
    }

    expect(
      S.decodeUnknownSync(FlowEdgeMarkerConfigurationSchema)({
        type: 'arrow',
        unrelated: 'ignored',
      })
    ).toStrictEqual({ type: 'arrow' })
    expect(
      S.decodeUnknownSync(codec)({ type: 'arrowclosed', unrelated: 'ignored' })
    ).toStrictEqual({ type: 'arrowclosed' })
  })

  it('preserves exact optional presence and canonical null sentinels', () => {
    for (const kind of markerKinds) {
      for (const schema of markerSchemas) {
        const codec = S.toCodecJson(schema)

        for (const field of markerFields) {
          for (const presence of ['absent', 'undefined']) {
            const input =
              presence === 'absent'
                ? { type: kind }
                : { type: kind, [field]: undefined }

            const decoded = S.decodeUnknownSync(schema)(input)
            const ordinary = S.encodeUnknownSync(schema)(decoded)
            const again = S.encodeUnknownSync(schema)(decoded)
            const wire = S.encodeUnknownSync(codec)(decoded)
            const restored = S.decodeUnknownSync(codec)(serialized(wire))

            expect([
              decoded === input,
              ordinary === decoded,
              again === ordinary,
            ]).toStrictEqual([false, false, false])
            expect([decoded, ordinary, again, restored]).toStrictEqual([
              input,
              input,
              input,
              input,
            ])
            expect(wire).toStrictEqual(
              presence === 'absent'
                ? { type: kind }
                : { type: kind, [field]: null }
            )
            expect(S.toEquivalence(schema)(decoded, restored)).toBeTruthy()
          }

          expect(
            S.decodeUnknownSync(codec)({ type: kind, [field]: null })
          ).toStrictEqual({ type: kind, [field]: undefined })
          expectMarkerFailure(
            S.decodeUnknownExit(codec)({ type: kind, [field]: undefined })
          )
          expectMarkerFailure(
            Effect.runSyncExit(
              SchemaParser.decodeUnknownEffect(codec)({
                type: kind,
                [field]: undefined,
              })
            ),
            'issue'
          )
        }
      }
    }
  })

  it('retains every accepted optional value in canonical JSON', () => {
    for (const kind of markerKinds) {
      for (const schema of markerSchemas) {
        const codec = S.toCodecJson(schema)

        for (const field of markerFields) {
          const numeric =
            field === 'width' || field === 'height' || field === 'strokeWidth'

          const values = numeric
            ? [0, 1.25, Number.MAX_VALUE]
            : ['', 'userSpaceOnUse', 'custom angle 73', 'auto']

          for (const value of values) {
            const input = { type: kind, [field]: value }
            const decoded = S.decodeUnknownSync(schema)(input)
            const wire = S.encodeUnknownSync(codec)(decoded)
            const restored = S.decodeUnknownSync(codec)(serialized(wire))

            expect([
              decoded,
              S.encodeUnknownSync(schema)(decoded),
              restored,
              wire,
            ]).toStrictEqual([input, input, input, input])
          }
        }
      }
    }
  })

  it('rejects invalid optional values at every public and internal boundary', () => {
    expect.hasAssertions()

    for (const kind of markerKinds) {
      for (const schema of markerSchemas) {
        const codec = S.toCodecJson(schema)

        for (const field of markerFields) {
          const numeric =
            field === 'width' || field === 'height' || field === 'strokeWidth'

          const values = numeric
            ? [-1, Number.NaN, Infinity, -Infinity, null, '1', false]
            : [null, 12, () => 'invalid']

          for (const value of values) {
            const input = { type: kind, [field]: value }
            expectMarkerFailure(S.decodeUnknownExit(schema)(input))
            expectMarkerFailure(S.encodeUnknownExit(schema)(input))
            expectMarkerFailure(S.encodeUnknownExit(codec)(input))
            expectMarkerFailure(
              Effect.runSyncExit(
                SchemaParser.decodeUnknownEffect(schema)(input)
              ),
              'issue'
            )
            expectMarkerFailure(
              Effect.runSyncExit(
                SchemaParser.encodeUnknownEffect(schema)(input)
              ),
              'issue'
            )

            if (value !== null) {
              expectMarkerFailure(S.decodeUnknownExit(codec)(input))
              expectMarkerFailure(
                Effect.runSyncExit(
                  SchemaParser.decodeUnknownEffect(codec)(input)
                ),
                'issue'
              )
            }
          }
        }
      }
    }
  })

  it('rejects invalid standalone values at public and internal parser boundaries', () => {
    expect.hasAssertions()

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
      expectMarkerFailure(S.decodeUnknownExit(FlowEdgeMarkerValueSchema)(value))
      expectMarkerFailure(S.encodeUnknownExit(FlowEdgeMarkerValueSchema)(value))
      expectMarkerFailure(
        Effect.runSyncExit(
          SchemaParser.decodeUnknownEffect(FlowEdgeMarkerValueSchema)(value)
        ),
        'issue'
      )
    }
  })

  it('rejects reserved live metadata and malformed wire flags across both schemas', () => {
    expect.hasAssertions()

    for (const kind of markerKinds) {
      for (const schema of markerSchemas) {
        const codec = S.toCodecJson(schema)

        for (const flag of [undefined, 'explicit-undefined', 'wrong', 1]) {
          const input = { type: kind, colorPresence: flag }
          expectMarkerFailure(S.decodeUnknownExit(schema)(input))
          expectMarkerFailure(S.encodeUnknownExit(schema)(input))
          expectMarkerFailure(S.encodeUnknownExit(codec)(input))
        }

        for (const flag of [undefined, 'wrong', 1]) {
          const input = { type: kind, colorPresence: flag }
          expectMarkerFailure(S.decodeUnknownExit(codec)(input))
          expectMarkerFailure(
            Effect.runSyncExit(SchemaParser.decodeUnknownEffect(codec)(input)),
            'issue'
          )
        }
      }
    }
  })

  it('rejects conflicting wire color values with stable public and internal diagnostics', () => {
    for (const kind of markerKinds) {
      for (const schema of markerSchemas) {
        const codec = S.toCodecJson(schema)

        for (const color of [null, '', 'red', undefined, 1]) {
          const input = {
            type: kind,
            colorPresence: 'explicit-undefined',
            color,
          }

          const high = S.decodeUnknownExit(codec)(input)

          const internal = Effect.runSyncExit(
            SchemaParser.decodeUnknownEffect(codec)(input)
          )

          expectMarkerFailure(high)
          expectMarkerFailure(internal, 'issue')

          if (!Exit.isFailure(high) || !Exit.isFailure(internal)) {
            throw new Error('Expected color conflict')
          }

          const diagnostics =
            color === null || Predicate.isString(color)
              ? [Cause.pretty(high.cause), Cause.pretty(internal.cause)]
              : []

          for (const diagnostic of diagnostics) {
            expect(diagnostic).toContain('Marker color flag/value conflict')
          }
        }
      }
    }
  })

  it('preserves all sentinels through caller-owned compositions', () => {
    for (const kind of markerKinds) {
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
          serialized(S.encodeUnknownSync(codec)(decoded))
        )

        expect(restored).toStrictEqual(input)
        expect(S.toEquivalence(markerCaller)(decoded, restored)).toBeTruthy()
        expect([
          decoded.start === configuration,
          decoded.end === configuration,
        ]).toStrictEqual([false, false])
        expectMarkerFailure(S.decodeUnknownExit(markerCaller)({ start: null }))
        expectMarkerFailure(S.encodeUnknownExit(markerCaller)({ end: null }))
      }
    }
  })

  it('preserves configured and legacy endpoint markers while rejecting invalid values', () => {
    for (const field of ['markerStart', 'markerEnd'] as const) {
      for (const marker of [
        'arrow',
        'arrowclosed',
        undefined,
        { type: 'arrowclosed', color: '#ff0072', width: 20 },
      ]) {
        const input = { id: 'edge', source: 'a', target: 'b', [field]: marker }

        const outputs = [
          S.decodeUnknownSync(FlowEdgeSchema)(input),
          S.decodeUnknownSync(FlowDefaultEdgeOptionsSchema)({
            [field]: marker,
          }),
          S.decodeUnknownSync(markerFactory)({
            ...input,
            type: 'weighted',
            data: { weight: 1 },
          }),
        ]

        for (const output of outputs) {
          expect(Object.hasOwn(output, field)).toBeTruthy()
          expect(output[field]).toStrictEqual(marker)
        }
      }

      for (const marker of [
        { type: 'triangle' },
        { color: 'red' },
        'reference:id',
        '',
        null,
      ]) {
        const input = { id: 'edge', source: 'a', target: 'b', [field]: marker }
        expectMarkerFailure(S.decodeUnknownExit(FlowEdgeSchema)(input))
        expectMarkerFailure(
          S.decodeUnknownExit(FlowDefaultEdgeOptionsSchema)({ [field]: marker })
        )
        expectMarkerFailure(
          S.decodeUnknownExit(markerFactory)({
            ...input,
            type: 'weighted',
            data: { weight: 1 },
          })
        )
      }
    }

    expect(S.decodeUnknownSync(FlowEdgeMarkerSchema)('arrow')).toBe('arrow')
    expectMarkerFailure(S.decodeUnknownExit(FlowEdgeMarkerSchema)('custom'))
  })
})

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
