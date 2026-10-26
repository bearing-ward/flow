import { Schema as S } from 'effect'

import { FlowTransactionContextSchema } from './flow-transaction-context.schema.ts'
import type { FlowTransactionContext } from './flow-transaction-context.schema.ts'
import { FlowDocumentSchema, FlowNodeSchema } from './flow.schema.ts'
import type { FlowDocument, FlowNode } from './flow.schema.ts'

const count = S.Finite.check(S.isInt(), S.isGreaterThanOrEqualTo(0))

const direction = S.Literals(['undo', 'redo'])

const cursor = S.Struct({
  past: S.Array(FlowDocumentSchema),
  present: FlowDocumentSchema,
  future: S.Array(FlowDocumentSchema),
})

export const FlowHistoryStateSchema = S.Struct({
  ...cursor.fields,
  capacity: count,
  session: S.NonEmptyString,
  revision: count,
  phase: S.Union([
    S.Struct({ kind: S.Literal('idle') }),
    S.Struct({
      kind: S.Literal('pending'),
      direction,
      context: FlowTransactionContextSchema,
      target: FlowDocumentSchema,
      baseRevision: count,
    }),
    S.Struct({ kind: S.Literal('disposed') }),
  ]),
  gesture: S.NullOr(
    S.Struct({ gestureId: S.NonEmptyString, baseline: cursor })
  ),
})

export type FlowHistoryState = typeof FlowHistoryStateSchema.Type

export const FlowHistoryStatusSchema = S.Struct({
  canUndo: S.Boolean,
  canRedo: S.Boolean,
  pending: S.Boolean,
  pastCount: count,
  futureCount: count,
  capacity: count,
  disposed: S.Boolean,
})

export type FlowHistoryStatus = typeof FlowHistoryStatusSchema.Type

export const FlowHistoryEventSchema = S.Union([
  S.Struct({
    kind: S.Literal('accepted'),
    derived: S.optional(S.Boolean),
    document: FlowDocumentSchema,
    context: S.optional(FlowTransactionContextSchema),
  }),
  S.Struct({
    kind: S.Literal('replay'),
    direction,
    transactionId: S.NonEmptyString,
  }),
  S.Struct({ kind: S.Literal('rejected'), transactionId: S.NonEmptyString }),
  S.Struct({
    kind: S.Literal('gesture'),
    action: S.Literals(['begin', 'end', 'cancel']),
    gestureId: S.NonEmptyString,
  }),
  S.Struct({ kind: S.Literal('dispose') }),
])

export type FlowHistoryEvent = typeof FlowHistoryEventSchema.Type

interface FlowHistoryReduction {
  readonly state: FlowHistoryState
  readonly replacement?: {
    readonly document: FlowDocument
    readonly context: FlowTransactionContext
  }
}

/** Detached graph meaning only. Selection and DOM measurements never enter history. */
export const flowHistoryDocument = (document: FlowDocument): FlowDocument =>
  structuredClone({
    ...document,
    nodes: document.nodes.map(
      ({ selected: _selected, measured: _measured, ...node }) => node
    ),
    edges: document.edges.map(({ selected: _selected, ...edge }) => edge),
  })

const sameDocument = S.toEquivalence(FlowDocumentSchema)

const sameNode = S.toEquivalence(FlowNodeSchema)

export const flowHistoryDocumentsEqual = (
  a: FlowDocument,
  b: FlowDocument
): boolean => sameDocument(flowHistoryDocument(a), flowHistoryDocument(b))

const measurementIdentity = (node: FlowNode): FlowNode => ({
  ...node,
  position: { x: 0, y: 0 },
})

/** Apply semantic history while retaining only safe, current presentation state. */
export const restoreFlowHistoryDocument = (
  target: FlowDocument,
  current: FlowDocument
): FlowDocument => {
  const restored = flowHistoryDocument(target)
  const currentNodes = new Map(current.nodes.map((node) => [node.id, node]))
  const currentEdges = new Map(current.edges.map((edge) => [edge.id, edge]))

  const semanticNodes = new Map(
    flowHistoryDocument(current).nodes.map((node) => [node.id, node])
  )

  return {
    ...restored,
    nodes: restored.nodes.map((node) => {
      const existing = currentNodes.get(node.id)
      const semantic = semanticNodes.get(node.id)

      const safe =
        semantic !== undefined &&
        sameNode(measurementIdentity(node), measurementIdentity(semantic))

      return {
        ...node,
        selected: existing?.selected ?? false,
        ...(safe && existing?.measured !== undefined
          ? { measured: structuredClone(existing.measured) }
          : undefined),
      }
    }),
    edges: restored.edges.map((edge) => ({
      ...edge,
      selected: currentEdges.get(edge.id)?.selected ?? false,
    })),
  }
}

export const createFlowHistory = (
  document: FlowDocument,
  options?: { readonly capacity?: number; readonly session?: string }
): FlowHistoryState => ({
  past: [],
  present: flowHistoryDocument(document),
  future: [],
  capacity: S.decodeUnknownSync(count)(options?.capacity ?? 100),
  session: S.decodeUnknownSync(S.NonEmptyString)(
    options?.session ?? 'flow-history'
  ),
  revision: 0,
  phase: { kind: 'idle' },
  gesture: null,
})

export const flowHistoryStatus = (
  state: FlowHistoryState
): FlowHistoryStatus => ({
  canUndo: state.phase.kind === 'idle' && state.past.length > 0,
  canRedo: state.phase.kind === 'idle' && state.future.length > 0,
  pending: state.phase.kind === 'pending',
  pastCount: state.past.length,
  futureCount: state.future.length,
  capacity: state.capacity,
  disposed: state.phase.kind === 'disposed',
})

const appendPast = (
  past: readonly FlowDocument[],
  present: FlowDocument,
  capacity: number
): readonly FlowDocument[] =>
  capacity === 0 ? [] : [...past, present].slice(-capacity)

const acceptedGesture = (
  state: FlowHistoryState,
  context: FlowTransactionContext | undefined
): FlowHistoryState['gesture'] => {
  const gestureId = context?.gestureId

  if (gestureId === undefined) {
    return null
  }

  if (state.gesture?.gestureId === gestureId) {
    return state.gesture
  }

  if (context?.gestureMode === 'continuation') {
    return {
      gestureId,
      baseline: {
        past: state.past.slice(0, -1),
        present: state.past.at(-1) ?? state.present,
        future: [],
      },
    }
  }

  if (context?.gestureMode !== 'continuous') {
    return null
  }

  return {
    gestureId,
    baseline: {
      past: state.past,
      present: state.present,
      future: state.future,
    },
  }
}

const acceptDocument = (
  state: FlowHistoryState,
  event: Extract<FlowHistoryEvent, { kind: 'accepted' }>
): FlowHistoryState => {
  const document = flowHistoryDocument(event.document)

  if (event.derived === true) {
    return { ...state, present: document }
  }

  if (
    state.phase.kind === 'pending' &&
    event.context?.origin.kind === 'local' &&
    event.context.transactionId === state.phase.context.transactionId &&
    state.phase.baseRevision === state.revision &&
    sameDocument(document, state.phase.target)
  ) {
    const undo = state.phase.direction === 'undo'

    return {
      ...state,
      past: undo
        ? state.past.slice(0, -1)
        : appendPast(state.past, state.present, state.capacity),
      present: document,
      future: undo ? [state.present, ...state.future] : state.future.slice(1),
      revision: state.revision + 1,
      phase: { kind: 'idle' },
      gesture: null,
    }
  }

  if (sameDocument(document, state.present)) {
    return state
  }

  // A peer/system baseline cannot safely share snapshot undo with local edits.
  if (event.context !== undefined && event.context.origin.kind !== 'local') {
    return {
      ...state,
      past: [],
      present: document,
      future: [],
      revision: state.revision + 1,
      phase: { kind: 'idle' },
      gesture: null,
    }
  }

  const gesture = acceptedGesture(state, event.context)

  const baseline = gesture?.baseline ?? state
  const returned = sameDocument(document, baseline.present)

  return {
    ...state,
    past: returned
      ? baseline.past
      : appendPast(baseline.past, baseline.present, state.capacity),
    present: document,
    future: returned ? baseline.future : [],
    revision: state.revision + 1,
    phase: { kind: 'idle' },
    gesture,
  }
}

/** Reserve replay until its ordinary accepted publisher acknowledges the target. */
export const reduceFlowHistory = (
  state: FlowHistoryState,
  event: FlowHistoryEvent
): FlowHistoryReduction => {
  if (state.phase.kind === 'disposed') {
    return { state }
  }

  switch (event.kind) {
    case 'accepted': {
      return { state: acceptDocument(state, event) }
    }

    case 'replay': {
      if (state.phase.kind !== 'idle') {
        return { state }
      }

      const target =
        event.direction === 'undo' ? state.past.at(-1) : state.future[0]

      if (target === undefined) {
        return { state }
      }

      const context: FlowTransactionContext = {
        transactionId: event.transactionId,
        origin: { kind: 'local', actorId: state.session },
      }

      return {
        state: {
          ...state,
          phase: {
            kind: 'pending',
            direction: event.direction,
            context,
            target,
            baseRevision: state.revision,
          },
          gesture: null,
        },
        replacement: {
          document: flowHistoryDocument(target),
          context: structuredClone(context),
        },
      }
    }

    case 'rejected': {
      return {
        state:
          state.phase.kind === 'pending' &&
          state.phase.context.transactionId === event.transactionId
            ? { ...state, phase: { kind: 'idle' } }
            : state,
      }
    }

    case 'gesture': {
      if (state.phase.kind !== 'idle') {
        return { state }
      }

      if (event.action === 'begin') {
        return {
          state:
            state.gesture?.gestureId === event.gestureId
              ? state
              : {
                  ...state,
                  gesture: {
                    gestureId: event.gestureId,
                    baseline: {
                      past: state.past,
                      present: state.present,
                      future: state.future,
                    },
                  },
                },
        }
      }

      return {
        state:
          state.gesture?.gestureId === event.gestureId
            ? { ...state, gesture: null }
            : state,
      }
    }

    case 'dispose': {
      return {
        state: {
          ...state,
          past: [],
          present: { nodes: [], edges: [] },
          future: [],
          phase: { kind: 'disposed' },
          gesture: null,
        },
      }
    }

    default: {
      const exhaustive: never = event

      return exhaustive
    }
  }
}
