import { Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { FlowEditResultSchema } from './flow-edit.schema.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import {
  createFlowHistory,
  flowHistoryDocument,
  flowHistoryDocumentsEqual,
  flowHistoryStatus,
  FlowHistoryEventSchema,
  FlowHistoryStateSchema,
  FlowHistoryStatusSchema,
  reduceFlowHistory,
  restoreFlowHistoryDocument,
} from './flow-history.ts'
import type { FlowHistoryEvent, FlowHistoryState } from './flow-history.ts'
import {
  FlowEditProposalChangeSchema,
  prepareFlowCommand,
} from './flow-runtime.schema.ts'
import { FlowTransactionContextSchema } from './flow-transaction-context.schema.ts'
import type { FlowTransactionContext } from './flow-transaction-context.schema.ts'
import {
  decodeFlowDocument,
  EdgeIdSchema,
  MissingEdgeEndpoint,
  NodeIdSchema,
} from './flow.schema.ts'
import type { FlowDocument } from './flow.schema.ts'

const document = (x = 0): FlowDocument =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        { id: 'a', label: 'A', position: { x, y: 0 } },
        { id: 'b', label: 'B', position: { x: 100, y: 0 } },
      ],
      edges: [{ id: 'ab', source: 'a', target: 'b' }],
    })
  )

const local = (
  transactionId: string,
  gestureId?: string
): FlowTransactionContext => ({
  transactionId,
  origin: { kind: 'local', actorId: 'editor' },
  ...(gestureId === undefined ? undefined : { gestureId }),
})

const accept = (
  state: FlowHistoryState,
  next: FlowDocument,
  context?: FlowTransactionContext
): FlowHistoryState =>
  reduceFlowHistory(state, { kind: 'accepted', document: next, context }).state

const replay = (
  state: FlowHistoryState,
  direction: 'undo' | 'redo',
  transactionId: string = direction
): FlowHistoryState => {
  const reserved = reduceFlowHistory(state, {
    kind: 'replay',
    direction,
    transactionId,
  })

  if (reserved.replacement === undefined) {
    throw new Error('Expected replay replacement')
  }

  return accept(
    reserved.state,
    reserved.replacement.document,
    reserved.replacement.context
  )
}

describe('flow history', () => {
  it('defaults to 100 accepted semantic transactions and evicts the oldest snapshot', () => {
    let state = createFlowHistory(document())

    for (let x = 1; x <= 105; x += 1) {
      state = accept(state, document(x))
    }

    expect(flowHistoryStatus(state)).toStrictEqual({
      canUndo: true,
      canRedo: false,
      pending: false,
      pastCount: 100,
      futureCount: 0,
      capacity: 100,
      disposed: false,
    })
    expect(state.past[0]).toStrictEqual(document(5))

    for (let x = 0; x < 100; x += 1) {
      state = replay(state, 'undo', `undo-${x}`)
    }

    expect(state.present).toStrictEqual(document(5))
    expect(flowHistoryStatus(state).canUndo).toBeFalsy()
    expect(state.future).toHaveLength(100)
  })

  it('supports disabled capacity zero and a capacity of one', () => {
    const zero = accept(
      createFlowHistory(document(), { capacity: 0 }),
      document(10)
    )

    expect({ present: zero.present, past: zero.past }).toStrictEqual({
      present: document(10),
      past: [],
    })
    expect(
      reduceFlowHistory(zero, {
        kind: 'replay',
        direction: 'undo',
        transactionId: 'u',
      })
    ).toStrictEqual({ state: zero })

    const one = accept(
      accept(createFlowHistory(document(), { capacity: 1 }), document(10)),
      document(20)
    )

    expect(one.past).toStrictEqual([document(10)])
    expect(replay(one, 'undo').present).toStrictEqual(document(10))
    expect(replay(replay(one, 'undo'), 'redo').past).toStrictEqual([
      document(10),
    ])
  })

  it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid capacity %s',
    (capacity) => {
      expect(() => createFlowHistory(document(), { capacity })).toThrow(
        'Expected'
      )
    }
  )

  it('records an atomic node and edge edit once and leaves failed edits out', () => {
    const initial = document()
    const state = createFlowHistory(initial)

    const edited = Effect.runSync(
      prepareFlowEdit(initial, {
        context: local('atomic'),
        operations: [
          {
            kind: 'add-nodes',
            nodes: [
              {
                id: NodeIdSchema.make('c'),
                label: 'C',
                position: { x: 5, y: 5 },
              },
            ],
          },
          {
            kind: 'add-edges',
            edges: [
              {
                id: EdgeIdSchema.make('ac'),
                source: NodeIdSchema.make('a'),
                target: NodeIdSchema.make('c'),
              },
            ],
          },
        ],
      })
    )

    const recorded = accept(state, edited.document, edited.context)

    expect(recorded.past).toStrictEqual([initial])
    expect({
      nodes: recorded.present.nodes.map(({ id }) => id),
      edges: recorded.present.edges.map(({ id }) => id),
    }).toStrictEqual({ nodes: ['a', 'b', 'c'], edges: ['ab', 'ac'] })
    expect(replay(recorded, 'undo').present).toStrictEqual(initial)
    expect(replay(replay(recorded, 'undo'), 'redo').present).toStrictEqual(
      edited.document
    )
    expect(state.past).toStrictEqual([])
  })

  it('does not record a failed atomic edit', () => {
    const initial = document()
    const state = createFlowHistory(initial)

    expect(() =>
      Effect.runSync(
        prepareFlowEdit(initial, {
          operations: [{ kind: 'set-nodes', nodes: [] }],
        })
      )
    ).toThrow(MissingEdgeEndpoint)
    expect(state.past).toStrictEqual([])
    expect(state.present).toStrictEqual(initial)
  })

  it('undoes and redoes accepted deletion of nodes and incident edges', () => {
    const initial = document()

    const deleted = Effect.runSync(
      prepareFlowEdit(initial, {
        operations: [
          { kind: 'delete-elements', nodeIds: [NodeIdSchema.make('a')] },
        ],
      })
    )

    const state = accept(createFlowHistory(initial), deleted.document)

    expect(state.present.nodes.map(({ id }) => id)).toStrictEqual(['b'])
    expect(state.present.edges).toStrictEqual([])
    expect(replay(state, 'undo').present).toStrictEqual(initial)
    expect(replay(replay(state, 'undo'), 'redo').present).toStrictEqual(
      deleted.document
    )
  })

  it('ignores selection and measurement noise and compares object keys structurally', () => {
    const original = document()

    const initial = {
      ...original,
      nodes: original.nodes.map((node) => ({
        ...node,
        data: { first: 1, second: { a: 2, b: 3 } },
      })),
    }

    const reordered = {
      ...original,
      nodes: original.nodes.map((node) => ({
        ...node,
        selected: true,
        measured: { width: 40, height: 20 },
        data: { second: { b: 3, a: 2 }, first: 1 },
      })),
      edges: original.edges.map((edge) => ({ ...edge, selected: true })),
    }

    const state = createFlowHistory(initial)

    expect(flowHistoryDocumentsEqual(initial, reordered)).toBeTruthy()
    expect(accept(state, reordered)).toBe(state)
    expect(flowHistoryDocument(reordered)).toStrictEqual(initial)
    expect(
      flowHistoryDocumentsEqual(document(), {
        ...document(),
        nodeOrigin: [0.5, 0.5],
      })
    ).toBeFalsy()
  })

  it('clears the redo branch only on a new semantic edit', () => {
    const recorded = accept(
      accept(createFlowHistory(document()), document(10)),
      document(20)
    )

    const undone = replay(recorded, 'undo')

    const noise = {
      ...document(10),
      nodes: document(10).nodes.map((node) => ({ ...node, selected: true })),
    }

    expect(accept(undone, noise)).toBe(undone)
    expect(undone.future).toStrictEqual([document(20)])

    const branch = accept(undone, document(15))

    expect(branch.past).toStrictEqual([document(), document(10)])
    expect(branch.future).toStrictEqual([])
    expect(flowHistoryStatus(branch).canRedo).toBeFalsy()
  })

  it('coalesces explicitly opened keyboard repeats and preserves accepted edits on cancel', () => {
    let { state } = reduceFlowHistory(createFlowHistory(document()), {
      kind: 'gesture',
      action: 'begin',
      gestureId: 'key',
    })

    for (let x = 1; x < 5; x += 1) {
      state = accept(state, document(x), local(`key-${x}`, 'key'))
    }

    expect(state.past).toStrictEqual([document()])
    expect(
      reduceFlowHistory(state, {
        kind: 'gesture',
        action: 'begin',
        gestureId: 'key',
      }).state
    ).toBe(state)
    ;({ state } = reduceFlowHistory(state, {
      kind: 'gesture',
      action: 'cancel',
      gestureId: 'key',
    }))
    expect(state.gesture).toBeNull()
    expect(replay(state, 'undo').present).toStrictEqual(document())
    expect(replay(replay(state, 'undo'), 'redo').present).toStrictEqual(
      document(4)
    )
  })

  it('cancels a preview with no accepted document without creating a step', () => {
    const state = createFlowHistory(document())

    const begun = reduceFlowHistory(state, {
      kind: 'gesture',
      action: 'begin',
      gestureId: 'drag',
    }).state

    const cancelled = reduceFlowHistory(begun, {
      kind: 'gesture',
      action: 'cancel',
      gestureId: 'drag',
    }).state

    expect(cancelled).toStrictEqual(state)
    expect(flowHistoryStatus(cancelled).canUndo).toBeFalsy()
  })

  it.each([0, 1, 100])(
    'restores the entire pre-gesture cursor on returning to baseline at capacity %s',
    (capacity) => {
      let state = accept(
        accept(createFlowHistory(document(), { capacity }), document(10)),
        document(20)
      )

      if (capacity > 0) {
        state = replay(state, 'undo')
      }

      const before = state

      ;({ state } = reduceFlowHistory(state, {
        kind: 'gesture',
        action: 'begin',
        gestureId: 'drag',
      }))
      state = accept(state, document(50), local('drag-out', 'drag'))
      state = accept(state, before.present, local('drag-back', 'drag'))
      ;({ state } = reduceFlowHistory(state, {
        kind: 'gesture',
        action: 'end',
        gestureId: 'drag',
      }))

      expect(state.past).toStrictEqual(before.past)
      expect(state.present).toStrictEqual(before.present)
      expect(state.future).toStrictEqual(before.future)
      expect(state.revision).toBe(before.revision + 2)
    }
  )

  it('does not coalesce unopened or unrelated edits, even when old gesture tags return', () => {
    let state = createFlowHistory(document())

    state = accept(state, document(1), local('first', 'unopened'))
    state = accept(state, document(2), local('second', 'unopened'))
    ;({ state } = reduceFlowHistory(state, {
      kind: 'gesture',
      action: 'begin',
      gestureId: 'drag',
    }))
    state = accept(state, document(3), local('third', 'drag'))
    state = accept(state, document(4), local('unrelated'))
    expect(state.gesture).toBeNull()
    state = accept(state, document(5), local('old-tag', 'drag'))

    expect(state.past).toStrictEqual([
      document(),
      document(1),
      document(2),
      document(3),
      document(4),
    ])
    expect(replay(state, 'undo').present).toStrictEqual(document(4))
  })

  it('reserves without moving stacks, waits through noise, and acknowledges matching identity and target', () => {
    const state = accept(
      createFlowHistory(document(), { session: 'session-a' }),
      document(10)
    )

    const reserved = reduceFlowHistory(state, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'u',
    })

    expect(reserved.replacement).toStrictEqual({
      document: document(),
      context: {
        transactionId: 'u',
        origin: { kind: 'local', actorId: 'session-a' },
      },
    })
    expect({
      past: reserved.state.past,
      present: reserved.state.present,
      future: reserved.state.future,
    }).toStrictEqual({ past: [document()], present: document(10), future: [] })
    expect(flowHistoryStatus(reserved.state)).toStrictEqual({
      canUndo: false,
      canRedo: false,
      pending: true,
      pastCount: 1,
      futureCount: 0,
      capacity: 100,
      disposed: false,
    })
    expect(accept(reserved.state, document(10))).toBe(reserved.state)
    expect(
      reduceFlowHistory(reserved.state, {
        kind: 'replay',
        direction: 'undo',
        transactionId: 'another',
      })
    ).toStrictEqual({ state: reserved.state })
  })

  it('moves stacks only after matching replay identity and target are accepted', () => {
    const state = accept(
      createFlowHistory(document(), { session: 'session-a' }),
      document(10)
    )

    const reserved = reduceFlowHistory(state, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'u',
    })

    const accepted = accept(reserved.state, document(), {
      transactionId: 'u',
      origin: { kind: 'local', actorId: 'session-a' },
    })

    expect(accepted.phase).toStrictEqual({ kind: 'idle' })
    expect(accepted.past).toStrictEqual([])
    expect(accepted.future).toStrictEqual([document(10)])
    expect(replay(accepted, 'redo').present).toStrictEqual(document(10))
  })

  it.each([
    { transactionId: 'other', x: 0 },
    { transactionId: 'u', x: 5 },
    { transactionId: 'other', x: 5 },
  ])(
    'records actual accepted edits when replay identity or target mismatches: %s',
    ({ transactionId, x }) => {
      const initial = accept(createFlowHistory(document()), document(10))

      const reserved = reduceFlowHistory(initial, {
        kind: 'replay',
        direction: 'undo',
        transactionId: 'u',
      }).state

      const actual = accept(reserved, document(x), local(transactionId))

      expect(actual.phase).toStrictEqual({ kind: 'idle' })
      expect(actual.present).toStrictEqual(document(x))
      expect(actual.past).toStrictEqual([document(), document(10)])
      expect(actual.future).toStrictEqual([])
      expect(replay(actual, 'undo').present).toStrictEqual(document(10))
    }
  )

  it('requires a replay context echo and treats an untagged target as an ordinary accepted edit', () => {
    const initial = accept(createFlowHistory(document()), document(10))

    const reserved = reduceFlowHistory(initial, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'u',
    }).state

    const actual = accept(reserved, document())

    expect(actual.phase).toStrictEqual({ kind: 'idle' })
    expect(actual.past).toStrictEqual([document(), document(10)])
    expect(actual.future).toStrictEqual([])
  })

  it('clears only a matching reservation on rejection and records delayed acceptance as a fresh edit', () => {
    const initial = accept(createFlowHistory(document()), document(10))

    const reserved = reduceFlowHistory(initial, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'u',
    }).state

    expect(
      reduceFlowHistory(reserved, { kind: 'rejected', transactionId: 'other' })
        .state
    ).toBe(reserved)

    const rejected = reduceFlowHistory(reserved, {
      kind: 'rejected',
      transactionId: 'u',
    }).state

    expect(rejected).toStrictEqual(initial)
    expect(
      reduceFlowHistory(rejected, { kind: 'rejected', transactionId: 'u' })
        .state
    ).toBe(rejected)

    const late = accept(rejected, document(), local('u'))

    expect({
      present: late.present,
      past: late.past,
      future: late.future,
    }).toStrictEqual({
      present: document(),
      past: [document(), document(10)],
      future: [],
    })
  })

  it.each([
    'remote',
    'system',
  ] satisfies readonly FlowTransactionContext['origin']['kind'][])(
    'resets the baseline for explicit %s semantic acceptance',
    (kind) => {
      const initial = replay(
        accept(
          accept(createFlowHistory(document()), document(10)),
          document(20)
        ),
        'undo'
      )

      const pending = reduceFlowHistory(initial, {
        kind: 'replay',
        direction: 'undo',
        transactionId: 'u',
      }).state

      const reset = accept(pending, document(30), {
        transactionId: 'peer',
        origin: { kind, actorId: 'peer' },
      })

      expect({
        present: reset.present,
        past: reset.past,
        future: reset.future,
        phase: reset.phase,
        gesture: reset.gesture,
      }).toStrictEqual({
        present: document(30),
        past: [],
        future: [],
        phase: { kind: 'idle' },
        gesture: null,
      })
      expect(flowHistoryStatus(reset).canUndo).toBeFalsy()
      expect(accept(reset, document(20)).past).toStrictEqual([document(30)])
    }
  )

  it.each([
    'remote',
    'system',
  ] satisfies readonly FlowTransactionContext['origin']['kind'][])(
    'preserves the cursor, gesture, and pending reservation on %s presentation noise',
    (kind) => {
      const edited = accept(
        accept(createFlowHistory(document()), document(10)),
        document(20)
      )

      const state = replay(edited, 'undo')

      const pending = reduceFlowHistory(state, {
        kind: 'replay',
        direction: 'undo',
        transactionId: 'u',
      }).state

      const gesturing = reduceFlowHistory(state, {
        kind: 'gesture',
        action: 'begin',
        gestureId: 'g',
      }).state

      const noise = {
        ...document(10),
        nodes: document(10).nodes.map((node) => ({
          ...node,
          selected: true,
          measured: { width: 40, height: 20 },
        })),
        edges: document(10).edges.map((edge) => ({ ...edge, selected: true })),
      }

      expect({ past: state.past, future: state.future }).toStrictEqual({
        past: [document()],
        future: [document(20)],
      })

      for (const current of [state, pending, gesturing]) {
        expect(
          accept(current, noise, {
            transactionId: 'peer-noise',
            origin: { kind, actorId: 'peer' },
          })
        ).toBe(current)
      }
    }
  )

  it('disposes all retained snapshots and disables every subsequent event', () => {
    const state = accept(createFlowHistory(document()), document(10))

    const pending = reduceFlowHistory(state, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'u',
    }).state

    const disposed = reduceFlowHistory(pending, { kind: 'dispose' }).state

    expect({
      present: disposed.present,
      past: disposed.past,
      future: disposed.future,
      gesture: disposed.gesture,
    }).toStrictEqual({
      present: { nodes: [], edges: [] },
      past: [],
      future: [],
      gesture: null,
    })
    expect(flowHistoryStatus(disposed)).toStrictEqual({
      canUndo: false,
      canRedo: false,
      pending: false,
      pastCount: 0,
      futureCount: 0,
      capacity: 100,
      disposed: true,
    })
    expect(accept(disposed, document(20))).toBe(disposed)

    for (const event of [
      { kind: 'replay', direction: 'undo', transactionId: 'u' },
      { kind: 'gesture', action: 'begin', gestureId: 'g' },
      { kind: 'rejected', transactionId: 'u' },
      { kind: 'dispose' },
    ] satisfies readonly FlowHistoryEvent[]) {
      expect(reduceFlowHistory(disposed, event).state).toBe(disposed)
    }
  })

  it('clones nested semantic data on initial, accepted, and replay output boundaries', () => {
    const data = { nested: { values: [1, 2] } }

    const initial = {
      nodes: [
        {
          id: NodeIdSchema.make('a'),
          label: 'A',
          position: { x: 0, y: 0 },
          data,
        },
      ],
      edges: [],
    }

    const state = createFlowHistory(initial)

    initial.nodes[0]?.data.nested.values.push(99)
    expect(state.present.nodes[0]?.data).toStrictEqual({
      nested: { values: [1, 2] },
    })

    const changed = {
      ...initial,
      nodes: initial.nodes.map((node) => ({
        ...node,
        position: { x: 10, y: 0 },
      })),
    }

    const accepted = accept(state, changed)

    changed.nodes[0]?.data.nested.values.push(100)
    expect(accepted.present.nodes[0]?.data).toStrictEqual({
      nested: { values: [1, 2, 99] },
    })
    expect(accepted.past[0]?.nodes[0]?.data).toStrictEqual({
      nested: { values: [1, 2] },
    })

    const reserved = reduceFlowHistory(accepted, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'u',
    })

    if (reserved.replacement === undefined) {
      throw new Error('Expected replay replacement')
    }

    const [node] = reserved.replacement.document.nodes

    if (node === undefined || reserved.state.phase.kind !== 'pending') {
      throw new Error('Expected pending snapshot')
    }

    Object.assign(node.position, { x: 999 })
    Object.assign(node.data ?? {}, { nested: { values: [999] } })
    Object.assign(reserved.replacement.context.origin, { actorId: 'mutated' })
    expect({
      target: reserved.state.phase.target,
      past: accepted.past[0],
      actor: reserved.state.phase.context.origin.actorId,
      x: accepted.present.nodes[0]?.position.x,
    }).toStrictEqual({
      target: state.present,
      past: state.present,
      actor: 'flow-history',
      x: 10,
    })
  })

  it('preserves current selection and safe measurements, never historical measurements', () => {
    const target = document()

    const historical = {
      ...target,
      nodes: target.nodes.map((node) => ({
        ...node,
        selected: true,
        measured: { width: 999, height: 999 },
      })),
      edges: target.edges.map((edge) => ({ ...edge, selected: true })),
    }

    const current = {
      ...document(10),
      nodes: document(10)
        .nodes.filter(({ id }) => id === 'a')
        .map((node) => ({
          ...node,
          selected: true,
          measured: { width: 40, height: 20 },
        })),
      edges: [],
    }

    const restored = restoreFlowHistoryDocument(historical, current)

    expect(restored).toStrictEqual({
      nodes: [
        {
          ...target.nodes[0],
          selected: true,
          measured: { width: 40, height: 20 },
        },
        { ...target.nodes[1], selected: false },
      ],
      edges: [{ ...target.edges[0], selected: false }],
    })
    expect(flowHistoryDocumentsEqual(restored, target)).toBeTruthy()

    const changedLabel = {
      ...current,
      nodes: current.nodes.map((node) => ({ ...node, label: 'changed' })),
    }

    expect(
      restoreFlowHistoryDocument(historical, changedLabel).nodes[0]
    ).not.toHaveProperty('measured')
    expect(restored.nodes[0]?.measured).not.toBe(current.nodes[0]?.measured)
  })

  it('roundtrips state, status, and events through their public schemas', () => {
    const initial = accept(createFlowHistory(document()), document(10))

    const pending = reduceFlowHistory(initial, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'u',
    }).state

    const gesture = reduceFlowHistory(initial, {
      kind: 'gesture',
      action: 'begin',
      gestureId: 'g',
    }).state

    for (const state of [
      initial,
      pending,
      gesture,
      reduceFlowHistory(pending, { kind: 'dispose' }).state,
    ]) {
      expect(
        Schema.decodeUnknownSync(FlowHistoryStateSchema)(
          Schema.encodeSync(FlowHistoryStateSchema)(state)
        )
      ).toStrictEqual(state)
      const status = flowHistoryStatus(state)

      expect(
        Schema.decodeUnknownSync(FlowHistoryStatusSchema)(
          Schema.encodeSync(FlowHistoryStatusSchema)(status)
        )
      ).toStrictEqual(status)
    }

    expect(
      Schema.decodeUnknownSync(FlowHistoryEventSchema)({
        kind: 'accepted',
        document: document(),
        context: local('x'),
      })
    ).toStrictEqual({
      kind: 'accepted',
      document: document(),
      context: local('x'),
    })
    expect(flowHistoryDocument(document())).toStrictEqual(document())
  })
})

describe('transaction context propagation', () => {
  it('preserves local, remote, and system context through edit results and proposals', () => {
    for (const kind of [
      'local',
      'remote',
      'system',
    ] satisfies readonly FlowTransactionContext['origin']['kind'][]) {
      const context: FlowTransactionContext = {
        transactionId: 't',
        origin: { kind, actorId: 'actor' },
        gestureId: 'gesture',
      }

      const transaction = { operations: [], context }
      const result = Effect.runSync(prepareFlowEdit(document(), transaction))

      const proposal = Effect.runSync(
        prepareFlowCommand(document(), {
          kind: 'edit-transaction',
          transaction,
        })
      )

      expect(result.context).toStrictEqual(context)
      expect(
        Schema.decodeUnknownSync(FlowEditResultSchema)(
          Schema.encodeSync(FlowEditResultSchema)(result)
        )
      ).toStrictEqual(result)
      expect(proposal).toStrictEqual({
        kind: 'edit-proposal',
        document: document(),
        deletion: { deletedNodeIds: [], deletedEdgeIds: [] },
        context,
      })
      expect(
        Schema.decodeUnknownSync(FlowEditProposalChangeSchema)(proposal)
      ).toStrictEqual(proposal)
    }
  })

  it('preserves the operations-only result shape', () => {
    const result = Effect.runSync(
      prepareFlowEdit(document(), { operations: [] })
    )

    const proposal = Effect.runSync(
      prepareFlowCommand(document(), {
        kind: 'edit-transaction',
        transaction: { operations: [] },
      })
    )

    expect(result).not.toHaveProperty('context')
    expect(proposal).not.toHaveProperty('context')
  })

  it.each([
    { ...local('valid'), transactionId: '' },
    { ...local('valid'), origin: { kind: 'local', actorId: '' } },
    { ...local('valid'), gestureId: '' },
  ] satisfies readonly FlowTransactionContext[])(
    'rejects empty context identifiers: %s',
    (context) => {
      expect(() =>
        Schema.decodeUnknownSync(FlowTransactionContextSchema)(context)
      ).toThrow('Expected a value with a length of at least 1')
      expect(() =>
        Effect.runSync(prepareFlowEdit(document(), { operations: [], context }))
      ).toThrow('Expected a value with a length of at least 1')
    }
  )

  it('rejects empty history session and gesture identifiers at the boundary', () => {
    expect(() => createFlowHistory(document(), { session: '' })).toThrow(
      'Expected a value with a length of at least 1'
    )
    expect(() =>
      Schema.decodeUnknownSync(FlowHistoryEventSchema)({
        kind: 'gesture',
        action: 'begin',
        gestureId: '',
      })
    ).toThrow('Expected a value with a length of at least 1')
    expect(() =>
      Schema.decodeUnknownSync(FlowHistoryEventSchema)({
        kind: 'replay',
        direction: 'undo',
        transactionId: '',
      })
    ).toThrow('Expected a value with a length of at least 1')
    expect(() =>
      Schema.decodeUnknownSync(FlowHistoryStateSchema)({
        ...createFlowHistory(document()),
        session: '',
      })
    ).toThrow('Expected a value with a length of at least 1')
  })
})
