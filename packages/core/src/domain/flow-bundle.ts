import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { flowBundleEndpoints } from './flow-bundle-geometry.ts'
import {
  FlowBundleCommandSchema,
  FlowBundleSchema,
  InvalidFlowBundle,
} from './flow-bundle.schema.ts'
import type { FlowBundle, FlowBundleChange } from './flow-bundle.schema.ts'
import type { FlowEditTransaction } from './flow-edit.schema.ts'
import type { FlowRoutePoint } from './flow-route.schema.ts'
import { FlowRoutePointsSchema } from './flow-route.schema.ts'
import { validateFlowDocument } from './flow.schema.ts'
import type { FlowDocument } from './flow.schema.ts'

/** Changes describe accepted documents; preparing a transaction is not acceptance. */
export const flowBundleChanges = (
  before: FlowDocument,
  after: FlowDocument
): readonly FlowBundleChange[] => {
  const previous = new Map(
    (before.bundles ?? []).map((bundle) => [bundle.id, bundle])
  )

  const next = new Map(
    (after.bundles ?? []).map((bundle) => [bundle.id, bundle])
  )

  const same = S.toEquivalence(FlowBundleSchema)

  return [
    ...[...previous.keys()].flatMap((bundleId): FlowBundleChange[] =>
      next.has(bundleId) ? [] : [{ kind: 'bundle-remove', bundleId }]
    ),
    ...[...next.values()].flatMap((bundle): FlowBundleChange[] => {
      const old = previous.get(bundle.id)

      if (old === undefined) {
        return [{ kind: 'bundle-add', bundle }]
      }

      return same(old, bundle) ? [] : [{ kind: 'bundle-update', bundle }]
    }),
  ]
}

const bundleTieInsertionIndex = (
  document: FlowDocument,
  bundle: FlowBundle,
  point: FlowRoutePoint
): number => {
  let index = bundle.ties.length
  let distance = Number.POSITIVE_INFINITY
  const [first] = bundle.ties
  const last = bundle.ties.at(-1) ?? first
  const endpoints = flowBundleEndpoints(document, bundle)

  const axis =
    bundle.ties.length === 1
      ? {
          x: endpoints.target.x - endpoints.source.x,
          y: endpoints.target.y - endpoints.source.y,
        }
      : { x: last.x - first.x, y: last.y - first.y }

  if ((point.x - first.x) * axis.x + (point.y - first.y) * axis.y < 0) {
    index = 0
  }

  for (let i = 1; i < bundle.ties.length; i += 1) {
    const a = bundle.ties[i - 1] ?? first
    const b = bundle.ties[i] ?? last
    const dx = b.x - a.x
    const dy = b.y - a.y

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)
      )
    )

    const d = Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy)

    if (t > 0 && t < 1 && d < distance) {
      index = i
      distance = d
    }
  }

  return index
}

export const editWireTies = (
  document: FlowDocument,
  input: typeof FlowBundleCommandSchema.Encoded
) =>
  Effect.gen(function* editWireTiesWorkflow() {
    const command = yield* S.decodeUnknownEffect(FlowBundleCommandSchema)(
      input
    ).pipe(
      Effect.withSpan(FlowSpan.documentDecode, {
        attributes: { [FlowAttribute.inputKind]: 'wire-tie-command' },
      })
    )

    let bundles: readonly FlowBundle[] = document.bundles ?? []

    if (command.kind === 'add') {
      bundles = [...bundles, command.bundle]
    } else if (command.kind === 'remove-edge') {
      bundles = bundles.flatMap((bundle) => {
        const edgeIds = bundle.edgeIds.filter((id) => id !== command.edgeId)

        return edgeIds.length < 2 ? [] : [{ ...bundle, edgeIds }]
      })
    } else {
      const bundle = bundles.find(({ id }) => id === command.bundleId)

      if (bundle === undefined) {
        return yield* new InvalidFlowBundle({
          bundleId: command.bundleId,
          reason: 'Missing bundle',
        })
      }

      let replacement: FlowBundle | undefined = bundle

      switch (command.kind) {
        case 'remove': {
          replacement = undefined
          break
        }

        case 'add-tie': {
          const index = bundleTieInsertionIndex(document, bundle, command.point)

          replacement = {
            ...bundle,
            ties: yield* S.decodeUnknownEffect(FlowRoutePointsSchema)([
              ...bundle.ties.slice(0, index),
              command.point,
              ...bundle.ties.slice(index),
            ]),
          }
          break
        }

        case 'move-tie':
        case 'remove-tie': {
          if (bundle.ties[command.index] === undefined) {
            return yield* new InvalidFlowBundle({
              bundleId: bundle.id,
              reason: 'Missing tie index',
            })
          }

          const ties =
            command.kind === 'move-tie'
              ? bundle.ties.map((point, index) =>
                  index === command.index ? command.point : point
                )
              : bundle.ties.filter((_, index) => index !== command.index)

          replacement =
            ties.length === 0
              ? undefined
              : {
                  ...bundle,
                  ties: yield* S.decodeUnknownEffect(FlowRoutePointsSchema)(
                    ties
                  ),
                }
          break
        }

        default: {
          const exhaustive: never = command

          return exhaustive
        }
      }

      bundles = bundles.flatMap((value) => {
        if (value.id !== bundle.id) {
          return [value]
        }

        return replacement === undefined ? [] : [replacement]
      })
    }

    yield* validateFlowDocument({ ...document, bundles })
    yield* Effect.logDebug('Prepared wire tie edit').pipe(
      Effect.annotateLogs({
        [FlowAttribute.changeKind]: command.kind,
        [FlowAttribute.edgeCount]: document.edges.length,
      })
    )

    return {
      operations: [{ kind: 'set-bundles', bundles }],
    } satisfies FlowEditTransaction
  }).pipe(
    Effect.tapError((failure) =>
      Effect.logWarning('Wire tie edit rejected').pipe(
        Effect.annotateLogs({ [FlowAttribute.failureName]: failure._tag }),
        Effect.withSpan(FlowSpan.editFailure)
      )
    ),
    Effect.withSpan(FlowSpan.editPrepare, {
      attributes: { [FlowAttribute.changeKind]: 'wire-ties' },
    })
  )
