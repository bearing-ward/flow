import {
  copyFlowSelection,
  createFlowHistory,
  flowHistoryDocument,
  projectFlowRoomDocument,
  prepareFlowEdit,
} from '@flow/core'
import { Deferred, Effect, Exit, Result, Schema as S, Scope } from 'effect'
import { TestClock } from 'effect/testing'
import { describe, expect, it } from 'vitest'

import {
  baseWorkflowFixture,
  aiWorkflowFixture,
  decodeWorkflowDocument,
  evaluateOfflineWorkflowNode,
  prepareWorkflowEdit,
  reduceWorkflowRunEvent,
  startWorkflowRun,
  WorkflowRunEventSchema,
  WorkflowRunStateSchema,
  WorkflowRunIdSchema,
  WorkflowRuntimeError,
  WorkflowRevisionError,
} from './public.ts'
import type {
  WorkflowEvaluator,
  WorkflowRunEvent,
  WorkflowRunState,
} from './public.ts'

const decode = (input: Parameters<typeof decodeWorkflowDocument>[0]) =>
  Effect.runSync(decodeWorkflowDocument(input))

const base = () => decode(baseWorkflowFixture)

const id = S.decodeUnknownSync(WorkflowRunIdSchema)

const labels = (events: readonly WorkflowRunEvent[]) =>
  events.map((event) =>
    event.kind === 'node'
      ? `${event.event.nodeId}:${event.event.state}`
      : `run:${event.state}`
  )

const collect = async (
  document = base(),
  evaluate: WorkflowEvaluator = evaluateOfflineWorkflowNode
) => {
  const events: WorkflowRunEvent[] = []
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* run() {
        const session = yield* startWorkflowRun(
          { document, revision: 7 },
          {
            runId: 'run-1',
            expectedRevision: 7,
            evaluate,
            onEvent: (event) => events.push(event),
          }
        )

        yield* session.await
      })
    )
  )

  return events
}

describe('scoped offline workflow runner', () => {
  it.each([
    ['uppercase', ' HELLO '],
    ['lowercase', ' hello '],
    ['trim', 'hello'],
  ])('evaluates the %s transform', async (operation, expected) => {
    const document = base()

    const events = await collect(
      decode({
        ...document,
        nodes: document.nodes.map((node) => {
          const workflow = node.data?.workflow

          if (workflow?.kind === 'initial') {
            return {
              ...node,
              data: { workflow: { ...workflow, config: { value: ' hello ' } } },
            }
          }

          return workflow?.kind === 'transform'
            ? {
                ...node,
                data: { workflow: { ...workflow, config: { operation } } },
              }
            : node
        }),
      })
    )

    expect(events.at(-2)).toStrictEqual({
      kind: 'node',
      event: {
        runId: 'run-1',
        revision: 7,
        nodeId: 'output',
        state: 'succeeded',
        outputs: { result: { kind: 'text', text: expected } },
      },
    })
  })

  it('skips a join and its downstream output when every input is inactive', async () => {
    const document = base()

    const events = await collect(
      decode({
        ...document,
        edges: document.edges.filter((edge) => edge.id !== 'branch-true'),
      })
    )

    expect(labels(events).slice(-3)).toStrictEqual([
      'join:skipped',
      'output:skipped',
      'run:succeeded',
    ])
  })

  it('settles queued nodes when the scope closes immediately after acquisition', async () => {
    const events: WorkflowRunEvent[] = []
    await Effect.runPromise(
      Effect.scoped(
        startWorkflowRun(
          { document: base(), revision: 0 },
          {
            runId: 'immediate',
            expectedRevision: 0,
            onEvent: (event) => events.push(event),
            evaluate: () => Effect.never,
          }
        )
      )
    )

    expect(labels(events).slice(-6)).toStrictEqual([
      'initial:cancelled',
      'transform:cancelled',
      'branch:cancelled',
      'join:cancelled',
      'output:cancelled',
      'run:cancelled',
    ])
  })

  it('emits literal sequential events and true-branch, join and final outputs', async () => {
    const events = await collect()
    expect(labels(events)).toStrictEqual([
      'run:queued',
      'initial:queued',
      'transform:queued',
      'branch:queued',
      'join:queued',
      'output:queued',
      'run:running',
      'initial:running',
      'initial:succeeded',
      'transform:running',
      'transform:succeeded',
      'branch:running',
      'branch:succeeded',
      'join:running',
      'join:succeeded',
      'output:running',
      'output:succeeded',
      'run:succeeded',
    ])
    expect(
      events.filter(
        (event) => event.kind === 'node' && event.event.state === 'succeeded'
      )
    ).toStrictEqual([
      {
        kind: 'node',
        event: {
          runId: 'run-1',
          revision: 7,
          nodeId: 'initial',
          state: 'succeeded',
          outputs: { output: { kind: 'text', text: 'hello' } },
        },
      },
      {
        kind: 'node',
        event: {
          runId: 'run-1',
          revision: 7,
          nodeId: 'transform',
          state: 'succeeded',
          outputs: { output: { kind: 'text', text: 'HELLO' } },
        },
      },
      {
        kind: 'node',
        event: {
          runId: 'run-1',
          revision: 7,
          nodeId: 'branch',
          state: 'succeeded',
          outputs: { true: { kind: 'text', text: 'HELLO' } },
        },
      },
      {
        kind: 'node',
        event: {
          runId: 'run-1',
          revision: 7,
          nodeId: 'join',
          state: 'succeeded',
          outputs: { output: { kind: 'text', text: 'HELLO' } },
        },
      },
      {
        kind: 'node',
        event: {
          runId: 'run-1',
          revision: 7,
          nodeId: 'output',
          state: 'succeeded',
          outputs: { result: { kind: 'text', text: 'HELLO' } },
        },
      },
    ])

    for (const event of events) {
      expect(S.decodeUnknownSync(WorkflowRunEventSchema)(event)).toStrictEqual(
        event
      )
    }
  })

  it('skips an inactive branch chain and joins after all predecessors settle', async () => {
    const document = base()
    let sequence = 0

    const transaction = Effect.runSync(
      prepareWorkflowEdit(
        document,
        {
          kind: 'append',
          edgeId: 'branch-false',
          nodeKind: 'transform',
          position: { x: 600, y: 200 },
        },
        { allocate: (namespace) => `inactive-${namespace}-${(sequence += 1)}` }
      )
    )

    const appended = decode(
      Effect.runSync(prepareFlowEdit(document, transaction)).document
    )

    const events = await collect(appended)
    expect(labels(events)).toStrictEqual([
      'run:queued',
      'initial:queued',
      'transform:queued',
      'branch:queued',
      'inactive-node-3:queued',
      'join:queued',
      'output:queued',
      'run:running',
      'initial:running',
      'initial:succeeded',
      'transform:running',
      'transform:succeeded',
      'branch:running',
      'branch:succeeded',
      'inactive-node-3:skipped',
      'join:running',
      'join:succeeded',
      'output:running',
      'output:succeeded',
      'run:succeeded',
    ])
    expect(events.at(-2)).toStrictEqual({
      kind: 'node',
      event: {
        runId: 'run-1',
        revision: 7,
        nodeId: 'output',
        state: 'succeeded',
        outputs: { result: { kind: 'text', text: 'HELLO' } },
      },
    })

    const falseBranch = decode({
      ...document,
      nodes: document.nodes.map((node) =>
        node.data?.workflow?.kind === 'branch'
          ? {
              ...node,
              data: {
                ...node.data,
                workflow: {
                  ...node.data.workflow,
                  config: { operator: 'contains', value: 'absent' },
                },
              },
            }
          : node
      ),
    })

    const falseEvents = await collect(falseBranch)
    expect(
      falseEvents.find(
        (event) =>
          event.kind === 'node' &&
          event.event.nodeId === 'branch' &&
          event.event.state === 'succeeded'
      )
    ).toStrictEqual({
      kind: 'node',
      event: {
        runId: 'run-1',
        revision: 7,
        nodeId: 'branch',
        state: 'succeeded',
        outputs: { false: { kind: 'text', text: 'HELLO' } },
      },
    })
  })

  it('uses stable ready-node and active-input order regardless of document array order', async () => {
    const document = base()
    const initial = document.nodes.find((node) => node.id === 'initial')
    const join = document.nodes.find((node) => node.id === 'join')
    const output = document.nodes.find((node) => node.id === 'output')

    const documentWithJoin = decode({
      nodes: [
        output,
        join,
        {
          ...initial,
          id: 'b',
          data: {
            workflow: {
              version: 1,
              kind: 'initial',
              ports: { output: 'out' },
              config: { value: 'B' },
            },
          },
        },
        {
          ...initial,
          id: 'a',
          data: {
            workflow: {
              version: 1,
              kind: 'initial',
              ports: { output: 'out' },
              config: { value: 'A' },
            },
          },
        },
      ],
      edges: [
        {
          id: 'bj',
          source: 'b',
          sourceHandle: 'out',
          target: 'join',
          targetHandle: 'in',
          data: { workflow: { version: 1, kind: 'data' } },
        },
        {
          id: 'aj',
          source: 'a',
          sourceHandle: 'out',
          target: 'join',
          targetHandle: 'in',
          data: { workflow: { version: 1, kind: 'data' } },
        },
        document.edges.at(-1),
      ],
    })

    const events = await collect(documentWithJoin)
    expect(
      labels(events).filter((label) => label.endsWith(':running'))
    ).toStrictEqual([
      'run:running',
      'a:running',
      'b:running',
      'join:running',
      'output:running',
    ])
    expect(events.at(-2)).toStrictEqual({
      kind: 'node',
      event: {
        runId: 'run-1',
        revision: 7,
        nodeId: 'output',
        state: 'succeeded',
        outputs: { result: { kind: 'text', text: 'A, B' } },
      },
    })
  })

  it('stops on a typed failure and settles the remaining nodes as skipped', async () => {
    const events = await collect(base(), (evaluation) =>
      evaluation.nodeId === 'transform'
        ? Effect.fail(new WorkflowRuntimeError({ code: 'evaluation-failed' }))
        : evaluateOfflineWorkflowNode(evaluation)
    )

    expect(labels(events).slice(7)).toStrictEqual([
      'initial:running',
      'initial:succeeded',
      'transform:running',
      'transform:failed',
      'branch:skipped',
      'join:skipped',
      'output:skipped',
      'run:failed',
    ])
    expect(events.at(-1)).toStrictEqual({
      kind: 'run',
      runId: 'run-1',
      revision: 7,
      state: 'failed',
      failure: { code: 'evaluation-failed' },
    })
  })

  it('turns evaluator defects and invalid output ports into redacted runtime failures', async () => {
    const defect = await collect(base(), () => Effect.die('private content'))
    expect(defect.at(-1)).toStrictEqual({
      kind: 'run',
      runId: 'run-1',
      revision: 7,
      state: 'failed',
      failure: { code: 'evaluator-defect' },
    })

    const invalid = await collect(base(), () =>
      Effect.succeed({ wrong: { kind: 'trigger' } })
    )

    expect(invalid.at(-1)).toStrictEqual({
      kind: 'run',
      runId: 'run-1',
      revision: 7,
      state: 'failed',
      failure: { code: 'invalid-output' },
    })
    expect(JSON.stringify(defect)).not.toContain('private content')
  })

  it('controls time, cancels pending work, and reruns with an isolated identity', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* controlled() {
          const events: WorkflowRunEvent[] = []
          let released = 0

          const session = yield* startWorkflowRun(
            { document: base(), revision: 0 },
            {
              runId: 'cancel',
              expectedRevision: 0,
              onEvent: (event) => events.push(event),
              evaluate: (evaluation) =>
                Effect.sleep('1 second').pipe(
                  Effect.andThen(() => evaluateOfflineWorkflowNode(evaluation)),
                  Effect.ensuring(
                    Effect.sync(() => {
                      released += 1
                    })
                  )
                ),
            }
          )

          yield* TestClock.adjust('1 second')
          expect(labels(events).slice(-2)).toStrictEqual([
            'initial:succeeded',
            'transform:running',
          ])
          yield* session.cancel
          expect(labels(events).slice(-5)).toStrictEqual([
            'transform:cancelled',
            'branch:cancelled',
            'join:cancelled',
            'output:cancelled',
            'run:cancelled',
          ])
          expect(released).toBe(2)
          const count = events.length
          yield* TestClock.adjust('10 seconds')
          expect(events).toHaveLength(count)

          const rerun = yield* startWorkflowRun(
            { document: base(), revision: 0 },
            {
              runId: 'rerun',
              expectedRevision: 0,
              onEvent: (event) => events.push(event),
            }
          )

          yield* rerun.await
          expect(events.at(-1)).toStrictEqual({
            kind: 'run',
            runId: 'rerun',
            revision: 0,
            state: 'succeeded',
          })
        })
      ).pipe(Effect.provide(TestClock.layer()))
    )
  })

  it('cancels on scope close and releases an evaluator without residual work', async () => {
    const events: WorkflowRunEvent[] = []
    let released = false
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* dispose() {
          const entered = yield* Deferred.make<undefined>()
          yield* startWorkflowRun(
            { document: base(), revision: 0 },
            {
              runId: 'dispose',
              expectedRevision: 0,
              onEvent: (event) => events.push(event),
              evaluate: () =>
                Deferred.succeed(entered, undefined).pipe(
                  Effect.andThen(Effect.never),
                  Effect.ensuring(
                    Effect.sync(() => {
                      released = true
                    })
                  )
                ),
            }
          )
          yield* Deferred.await(entered)
        })
      )
    )
    expect(released).toBeTruthy()
    expect(labels(events).slice(-6)).toStrictEqual([
      'initial:cancelled',
      'transform:cancelled',
      'branch:cancelled',
      'join:cancelled',
      'output:cancelled',
      'run:cancelled',
    ])
  })

  it('retains a detached frozen snapshot while the original document changes', async () => {
    const accepted = base()
    const document = { ...accepted, nodes: [...accepted.nodes] }
    const scope = Scope.makeUnsafe()
    const events: WorkflowRunEvent[] = []
    const gate = Effect.runSync(Deferred.make<undefined>())

    try {
      const session = await Effect.runPromise(
        startWorkflowRun(
          { document, revision: 0 },
          {
            runId: 'snapshot',
            expectedRevision: 0,
            onEvent: (event) => events.push(event),
            evaluate: (evaluation) =>
              Deferred.await(gate).pipe(
                Effect.andThen(() => evaluateOfflineWorkflowNode(evaluation))
              ),
          }
        ).pipe(Effect.provideService(Scope.Scope, scope))
      )

      document.nodes.splice(0, 1)
      expect(session.request.document.nodes).toHaveLength(5)
      expect(
        Object.isFrozen(session.request.document.nodes[0]?.data?.workflow)
      ).toBeTruthy()
      Effect.runSync(Deferred.succeed(gate, undefined))
      await Effect.runPromise(session.await)
      expect(labels(events).at(-1)).toBe('run:succeeded')
    } finally {
      await Effect.runPromise(Scope.close(scope, Exit.void))
    }
  })

  it('revalidates revisions and readiness before emitting any event', async () => {
    const events: WorkflowRunEvent[] = []

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.result(
          startWorkflowRun(
            { document: base(), revision: 2 },
            {
              runId: 'invalid',
              expectedRevision: 1,
              onEvent: (event) => events.push(event),
            }
          )
        )
      )
    )

    expect(Result.isFailure(result) ? result.failure : undefined).toStrictEqual(
      new WorkflowRevisionError({ expectedRevision: 1, acceptedRevision: 2 })
    )

    const invalid = await Effect.runPromise(
      Effect.scoped(
        Effect.result(
          startWorkflowRun(
            { document: { ...base(), edges: [] }, revision: 2 },
            {
              runId: 'invalid',
              expectedRevision: 2,
              onEvent: (event) => events.push(event),
            }
          )
        )
      )
    )

    expect(Result.isFailure(invalid) ? invalid.failure._tag : undefined).toBe(
      'WorkflowValidationError'
    )
    expect(events).toStrictEqual([])
  })

  it('leaves AI generation explicitly unsupported until the provider unit', async () => {
    const events = await collect(decode(aiWorkflowFixture))
    expect(events.at(-1)).toStrictEqual({
      kind: 'run',
      runId: 'run-1',
      revision: 7,
      state: 'failed',
      failure: { code: 'unsupported-kind' },
    })
  })

  it('rejects late events from another run, another revision, and a terminal session', () => {
    const current: WorkflowRunState = {
      runId: id('new'),
      revision: 2,
      state: 'running',
      nodes: {},
    }

    for (const event of [
      {
        kind: 'node',
        event: {
          runId: id('old'),
          revision: 2,
          nodeId: base().nodes[0]?.id,
          state: 'succeeded',
          outputs: {},
        },
      },
      { kind: 'run', runId: id('new'), revision: 1, state: 'succeeded' },
    ]) {
      expect(
        reduceWorkflowRunEvent(
          current,
          S.decodeUnknownSync(WorkflowRunEventSchema)(event),
          2
        )
      ).toBe(current)
    }

    const terminal: WorkflowRunState = { ...current, state: 'cancelled' }

    const event: WorkflowRunEvent = {
      kind: 'run',
      runId: current.runId,
      revision: 2,
      state: 'succeeded',
    }

    expect(reduceWorkflowRunEvent(current, event, 3)).toBe(current)
    expect(reduceWorkflowRunEvent(terminal, event, 2)).toBe(terminal)
  })

  it('rejects regressive run events and late updates to a completed node', () => {
    const nodeId = base().nodes[0]?.id

    const current = S.decodeUnknownSync(WorkflowRunStateSchema)({
      runId: 'active',
      revision: 2,
      state: 'running',
      nodes: {
        initial: {
          runId: 'active',
          revision: 2,
          nodeId,
          state: 'succeeded',
          outputs: { output: { kind: 'text', text: 'hello' } },
        },
      },
    })

    const queued: WorkflowRunEvent = {
      kind: 'run',
      runId: current.runId,
      revision: 2,
      state: 'queued',
    }

    const late = S.decodeUnknownSync(WorkflowRunEventSchema)({
      kind: 'node',
      event: { runId: 'active', revision: 2, nodeId, state: 'running' },
    })

    expect([
      reduceWorkflowRunEvent(current, queued, 2),
      reduceWorkflowRunEvent(current, late, 2),
    ]).toStrictEqual([current, current])
  })

  it('keeps run state out of saved documents, history, clipboard, and room projection', async () => {
    const document = decode({
      ...baseWorkflowFixture,
      nodes: baseWorkflowFixture.nodes.map((node) => ({
        ...node,
        selected: true,
      })),
    })

    const history = createFlowHistory(document)

    const before = {
      document: JSON.stringify(document),
      history: structuredClone(history),
      saved: flowHistoryDocument(document),
      room: projectFlowRoomDocument(document),
      clipboard: Effect.runSync(copyFlowSelection(document)),
    }

    await collect(document)
    expect({
      document: JSON.stringify(document),
      history,
      saved: flowHistoryDocument(document),
      room: projectFlowRoomDocument(document),
      clipboard: Effect.runSync(copyFlowSelection(document)),
    }).toStrictEqual(before)
  })
})
