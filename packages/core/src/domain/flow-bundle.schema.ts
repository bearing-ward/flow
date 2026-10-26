import { Schema as S } from 'effect'

import {
  FlowRoutePointsSchema,
  FlowRoutePointSchema,
} from './flow-route.schema.ts'
import { EdgeIdSchema } from './flow-values.ts'

/** Membership order is lane order. Ties run from source to target in graph space. */
export const FlowBundleSchema = S.Struct({
  id: S.NonEmptyString,
  edgeIds: S.Array(EdgeIdSchema).check(
    S.isMinLength(2),
    S.makeFilter(
      (ids) => new Set(ids).size === ids.length || 'Duplicate bundle edge'
    )
  ),
  ties: FlowRoutePointsSchema,
})

export type FlowBundle = typeof FlowBundleSchema.Type

export const FlowBundleChangeSchema = S.Union([
  S.Struct({ kind: S.Literal('bundle-add'), bundle: FlowBundleSchema }),
  S.Struct({ kind: S.Literal('bundle-update'), bundle: FlowBundleSchema }),
  S.Struct({ kind: S.Literal('bundle-remove'), bundleId: S.String }),
])

export type FlowBundleChange = typeof FlowBundleChangeSchema.Type

export const FlowBundleCommandSchema = S.Union([
  S.Struct({ kind: S.Literal('add'), bundle: FlowBundleSchema }),
  S.Struct({
    kind: S.Literal('add-tie'),
    bundleId: S.String,
    point: FlowRoutePointSchema,
  }),
  S.Struct({
    kind: S.Literal('move-tie'),
    bundleId: S.String,
    index: S.Int.check(S.isGreaterThanOrEqualTo(0)),
    point: FlowRoutePointSchema,
  }),
  S.Struct({
    kind: S.Literal('remove-tie'),
    bundleId: S.String,
    index: S.Int.check(S.isGreaterThanOrEqualTo(0)),
  }),
  S.Struct({ kind: S.Literal('remove-edge'), edgeId: EdgeIdSchema }),
  S.Struct({ kind: S.Literal('remove'), bundleId: S.String }),
])

export type FlowBundleCommand = typeof FlowBundleCommandSchema.Type

const tagged = S.TaggedError

export class InvalidFlowBundle extends tagged<InvalidFlowBundle>()(
  'InvalidFlowBundle',
  { bundleId: S.String, reason: S.String }
) {}

/** Cross-record integrity is checked at the document boundary. */
export const findFlowBundleIssue = (document: {
  readonly edges: readonly { readonly id: string }[]
  readonly bundles?: readonly FlowBundle[] | undefined
}): InvalidFlowBundle | undefined => {
  const edges = new Set(document.edges.map(({ id }) => id))
  const memberships = new Set<string>()
  const ids = new Set<string>()

  for (const bundle of document.bundles ?? []) {
    if (!S.is(FlowBundleSchema)(bundle) || ids.has(bundle.id)) {
      return new InvalidFlowBundle({
        bundleId: bundle.id,
        reason: 'Invalid or duplicate bundle',
      })
    }

    ids.add(bundle.id)

    for (const id of bundle.edgeIds) {
      if (!edges.has(id) || memberships.has(id)) {
        return new InvalidFlowBundle({
          bundleId: bundle.id,
          reason: 'Missing edge or multiple bundle membership',
        })
      }

      memberships.add(id)
    }
  }
}
