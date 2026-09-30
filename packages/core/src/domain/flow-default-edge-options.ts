import { Effect, Schema as S } from 'effect'

import type { FlowEdge } from './flow.schema.ts'
import {
  FlowEdgeMarkerSchema,
  FlowEdgePathSchema,
  FlowEdgeReconnectableSchema,
  FlowEdgeStrokeSchema,
} from './flow.schema.ts'

/**
 * Edge fields supported as host defaults. Identity, endpoints, handles, and
 * selection are supplied by the stored edge or connection and cannot be defaults.
 */
export const FlowDefaultEdgeOptionsSchema = S.Struct({
  type: S.optional(S.NonEmptyString),
  path: S.optional(FlowEdgePathSchema),
  label: S.optional(S.String),
  data: S.optional(S.JsonObject),
  markerStart: S.optional(FlowEdgeMarkerSchema),
  markerEnd: S.optional(FlowEdgeMarkerSchema),
  stroke: S.optional(FlowEdgeStrokeSchema),
  strokeWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
  deletable: S.optional(S.Boolean),
  selectable: S.optional(S.Boolean),
  focusable: S.optional(S.Boolean),
  reconnectable: S.optional(FlowEdgeReconnectableSchema),
  interactionWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
  ariaLabel: S.optional(S.NonEmptyString),
  hidden: S.optional(S.Boolean),
  zIndex: S.optional(S.Finite),
})

export type FlowDefaultEdgeOptions = typeof FlowDefaultEdgeOptionsSchema.Encoded

const supportedKeys = new Set([
  'type',
  'path',
  'label',
  'data',
  'markerStart',
  'markerEnd',
  'stroke',
  'strokeWidth',
  'deletable',
  'selectable',
  'focusable',
  'reconnectable',
  'interactionWidth',
  'ariaLabel',
  'hidden',
  'zIndex',
])

/** Decode defaults strictly so unsupported React edge fields are not silently ignored. */
// eslint-disable-next-line anti-slop/no-unknown-parameters -- this public decoder is the external options boundary and must accept unknown input for validation.
export const decodeFlowDefaultEdgeOptions = (input: unknown) =>
  Effect.gen(function* decodeDefaults() {
    // eslint-disable-next-line anti-slop/no-runtime-typeof -- reject non-object boundary input before enumerating allowed keys.
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return yield* Effect.fail(
        new Error('FlowDefaultEdgeOptions must be an object')
      )
    }

    const unsupported = Object.keys(input).filter(
      (key) => !supportedKeys.has(key)
    )

    if (unsupported.length > 0) {
      return yield* Effect.fail(
        new Error(
          `Unsupported FlowDefaultEdgeOptions fields: ${unsupported.join(', ')}`
        )
      )
    }

    return yield* S.decodeUnknownEffect(FlowDefaultEdgeOptionsSchema)(input)
  })

/** Apply defaults below stored edge values; edge and connection data wins. */
export const applyDefaultEdgeOptions = (
  edge: FlowEdge,
  defaults: FlowDefaultEdgeOptions | undefined
): FlowEdge => (defaults === undefined ? edge : { ...defaults, ...edge })
