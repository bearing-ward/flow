import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { FlowEditTransactionSchema } from './flow-edit.schema.ts'
import type { FlowEditTransaction } from './flow-edit.schema.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import { FlowLayoutResultSchema } from './flow-layout-request.ts'
import { applyFlowLayoutPositions } from './flow-layout.ts'
import type { FlowDocument, XYPosition } from './flow.schema.ts'

const positions = S.ReadonlyMap(
  S.String,
  S.Struct({ x: S.Finite, y: S.Finite })
)

export const FlowNodeAnimationRequestSchema = S.Struct({
  result: FlowLayoutResultSchema,
  edit: S.optional(FlowEditTransactionSchema),
  duration: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
})

export type FlowNodeAnimationRequest =
  typeof FlowNodeAnimationRequestSchema.Type

export const FlowNodeTransitionSchema = S.Struct({
  revision: S.String,
  from: positions,
  to: positions,
  duration: S.Finite,
  elapsed: S.Finite,
})

export type FlowNodeTransition = typeof FlowNodeTransitionSchema.Type

export const FlowNodeAnimationResultSchema = S.Struct({
  revision: S.String,
  kind: S.Literals(['finished', 'cancelled', 'superseded', 'disposed']),
})

export type FlowNodeAnimationResult = typeof FlowNodeAnimationResultSchema.Type

export const createFlowNodeTransition = (
  request: FlowNodeAnimationRequest,
  displayed: ReadonlyMap<string, XYPosition>,
  reducedMotion = false
): FlowNodeTransition => ({
  revision: request.result.revision,
  from: new Map(
    [...request.result.positions].map(([id, target]) => [
      id,
      displayed.get(id) ?? target,
    ])
  ),
  to: request.result.positions,
  duration: reducedMotion ? 0 : (request.duration ?? 300),
  elapsed: 0,
})

/** Linear, parent-relative graph coordinates shared by every geometry consumer. */
export const stepFlowNodeTransition = (
  transition: FlowNodeTransition,
  delta: number
) => {
  const elapsed = Math.min(
    transition.duration,
    transition.elapsed + Math.max(0, delta)
  )

  const progress = transition.duration === 0 ? 1 : elapsed / transition.duration

  const displayed = new Map(
    [...transition.to].map(([id, target]) => {
      const from = transition.from.get(id) ?? target

      return [
        id,
        progress === 1
          ? target
          : {
              x: from.x + (target.x - from.x) * progress,
              y: from.y + (target.y - from.y) * progress,
            },
      ] as const
    })
  )

  return {
    kind: progress === 1 ? ('finished' as const) : ('running' as const),
    transition: { ...transition, elapsed },
    positions: displayed,
  }
}

export const finishFlowNodeTransition = (
  transition: FlowNodeTransition,
  kind: FlowNodeAnimationResult['kind']
): FlowNodeAnimationResult => ({ revision: transition.revision, kind })

export const nodeAnimationDocument = (
  document: FlowDocument,
  transition: FlowNodeTransition
): FlowDocument => ({
  ...document,
  nodes: applyFlowLayoutPositions(document.nodes, transition.to),
})

const decodeAnimation = S.decodeUnknownEffect(FlowNodeAnimationRequestSchema)

export const decodeFlowNodeAnimationRequest = Effect.fn(
  FlowSpan.documentDecode
)(function* decodeFlowNodeAnimationRequest(
  ...args: Parameters<typeof decodeAnimation>
) {
  const request = yield* decodeAnimation(...args)

  yield* Effect.logDebug('Node animation decoded').pipe(
    Effect.annotateLogs({ [FlowAttribute.inputKind]: 'node-animation' })
  )

  return request
})

/** Topology/data and the layout destination share one host transaction. */
export const prepareFlowNodeAnimationEdit = (
  document: FlowDocument,
  request: FlowNodeAnimationRequest,
  transition: FlowNodeTransition
) =>
  Effect.gen(function* prepareAnimationEdit() {
    const candidate =
      request.edit === undefined
        ? document
        : (yield* prepareFlowEdit(document, request.edit)).document

    const destination = nodeAnimationDocument(candidate, transition)

    const transaction: FlowEditTransaction = {
      ...request.edit,
      operations: [
        ...(request.edit?.operations ?? []),
        { kind: 'set-nodes', nodes: destination.nodes },
      ],
    }

    yield* prepareFlowEdit(document, transaction)

    return transaction
  })
