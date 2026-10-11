import type { Effect, Option, Scope } from 'effect'
import { Schema as S } from 'effect'

import type {
  FlowDataContract,
  FlowEdgeOf,
  FlowGraphCodec,
  FlowNodeOf,
  FlowTypedError,
  FlowTypedFailure,
} from './flow-data-contract.schema.ts'
import { ViewportSchema } from './flow-runtime.schema.ts'
import type { Viewport } from './flow-runtime.schema.ts'
import type { EdgeId, NodeId } from './flow.schema.ts'

export const RevisionSchema = S.Finite.check(
  S.isInt(),
  S.isGreaterThanOrEqualTo(0)
)

export const CheckpointViewportSchema = ViewportSchema.check(
  S.makeFilter((viewport) => {
    if (!Number.isFinite(viewport.x)) {
      return { path: ['x'], issue: 'Checkpoint viewport.x must be finite' }
    }

    if (!Number.isFinite(viewport.y)) {
      return { path: ['y'], issue: 'Checkpoint viewport.y must be finite' }
    }

    return true
  })
)

export const FlowTypedCommitResultSchema = S.Struct({
  revision: RevisionSchema,
  changed: S.Boolean,
})

export const FlowTypedCheckpointSchema = S.Struct({
  contractId: S.String,
  revision: RevisionSchema,
  document: S.Json,
  viewport: CheckpointViewportSchema,
})

export const createFlowTypedSnapshotSchema = <C extends FlowGraphCodec>(
  document: C
) =>
  S.Struct({
    revision: RevisionSchema,
    document: S.Union([S.toType(document)]),
    viewport: ViewportSchema,
  })

export type FlowTypedSnapshot<C extends FlowGraphCodec> = ReturnType<
  typeof createFlowTypedSnapshotSchema<C>
>['Type']

export type FlowTypedCommitResult = typeof FlowTypedCommitResultSchema.Type

export type FlowTypedCheckpoint = typeof FlowTypedCheckpointSchema.Type

export interface FlowTypedEncodedInputCapture<RC> {
  readonly capture: (
    // oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the encoded-input/descriptor validation boundary; arbitrary caller values must be captured before Schema runs.
    input: unknown
  ) => Effect.Effect<unknown, FlowTypedFailure, RC>
}

export interface FlowTypedCheckpointReservation {
  readonly isCurrent: () => boolean
  readonly abort: Effect.Effect<void>
  readonly accepted: Effect.Effect<void, FlowTypedFailure>
}

export interface FlowTypedCheckpointGate {
  readonly stage: (
    checkpoint: FlowTypedCheckpoint
  ) => Effect.Effect<FlowTypedCheckpointReservation, FlowTypedFailure>
}

export interface FlowTypedActorOptions<
  C extends FlowGraphCodec,
  RI,
  RC = never,
> {
  readonly contract: FlowDataContract<C, RI>
  readonly viewport: Viewport
  readonly encodedInputCapture?: FlowTypedEncodedInputCapture<RC>
  readonly checkpointGate?: FlowTypedCheckpointGate
}

export interface TypedFlow<C extends FlowGraphCodec, RI, RC = never> {
  readonly readSnapshot: () => Effect.Effect<
    FlowTypedSnapshot<C>,
    FlowTypedError,
    RI
  >
  readonly readNodes: () => Effect.Effect<
    readonly FlowNodeOf<C>[],
    FlowTypedError,
    RI
  >
  readonly readEdges: () => Effect.Effect<
    readonly FlowEdgeOf<C>[],
    FlowTypedError,
    RI
  >
  readonly readNode: (
    id: NodeId
  ) => Effect.Effect<Option.Option<FlowNodeOf<C>>, FlowTypedError, RI>
  readonly readEdge: (
    id: EdgeId
  ) => Effect.Effect<Option.Option<FlowEdgeOf<C>>, FlowTypedError, RI>
  readonly readSelected: <A>(
    selector: (snapshot: FlowTypedSnapshot<C>) => A
  ) => Effect.Effect<A, FlowTypedError, RI>
  readonly replaceEncoded: (
    // oxlint-disable-next-line anti-slop/no-unknown-parameters -- This is the encoded-input/descriptor validation boundary; arbitrary caller values must be captured before Schema runs.
    input: unknown,
    expectedRevision: number
  ) => Effect.Effect<
    FlowTypedCommitResult,
    FlowTypedError,
    C['DecodingServices'] | C['EncodingServices'] | RI | RC
  >
  readonly replaceDecoded: (
    input: C['Type'],
    expectedRevision: number
  ) => Effect.Effect<
    FlowTypedCommitResult,
    FlowTypedError,
    C['EncodingServices'] | RI
  >
  readonly updateDecoded: <RU>(
    update: (
      snapshot: FlowTypedSnapshot<C>
    ) => Effect.Effect<C['Type'], FlowTypedFailure, RU>
  ) => Effect.Effect<
    FlowTypedCommitResult,
    FlowTypedError,
    C['EncodingServices'] | RI | RU
  >
  readonly encodeDocument: () => Effect.Effect<
    S.Json,
    FlowTypedError,
    C['EncodingServices'] | RI
  >
  readonly observe: <RL>(
    listener: (
      snapshot: FlowTypedSnapshot<C>
    ) => Effect.Effect<void, FlowTypedFailure, RL>
  ) => Effect.Effect<void, FlowTypedError, RI | RL | Scope.Scope>
}
