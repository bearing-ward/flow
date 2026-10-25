import {
  decodeFlowDocument,
  flowHistoryDocument,
  flowHistoryStatus,
  NodeIdSchema,
} from '@flow/core'
import type { FlowDocument } from '@flow/core'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  AppMessage,
  createProgramUpdate,
  HostAction,
  initialModel,
  update,
} from './application.ts'
import type { Model } from './application.ts'
import * as Graph from './graph.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      { id: 'a', label: 'Alpha', position: { x: 10, y: 20 }, selected: true },
    ],
    edges: [],
  })
)

const makeModel = (historyCapacity = 100) =>
  initialModel(
    document,
    { x: 0, y: 0, zoom: 1 },
    [],
    undefined,
    'full',
    undefined,
    { historyCapacity }
  )

const position = (model: Model, x: number) =>
  update(
    model,
    AppMessage.EditRequest({
      request: {
        requestId: `edit-${x}`,
        transaction: {
          operations: [
            {
              kind: 'update-node',
              nodeId: NodeIdSchema.make('a'),
              patch: { position: { x, y: 20 } },
            },
          ],
        },
      },
    })
  )

const history = (
  model: Model,
  action: 'undo' | 'redo' | 'status' | 'reject',
  transactionId?: string
) =>
  update(
    model,
    AppMessage.HistoryRequest({
      request: { requestId: 'history-request', action, transactionId },
    })
  )

const replace = (model: Model, next: FlowDocument) =>
  update(
    model,
    AppMessage.HostAction({
      action: HostAction.ReplaceDocument({ document: next }),
    })
  ).model

const keyboard = (model: Model) =>
  update(
    model,
    AppMessage.GraphMessage({
      message: Graph.Message.MoveNodeByKeyboard({
        nodeId: NodeIdSchema.make('a'),
        key: 'ArrowRight',
        shift: false,
      }),
    })
  )

const move = (model: Model) => keyboard(model).model

const proposal = (result: ReturnType<typeof update>) => {
  const change = result.outMessage?.find(
    (item) => item.kind === 'change' && item.change?.kind === 'edit-proposal'
  )

  if (change?.kind !== 'change' || change.change?.kind !== 'edit-proposal') {
    throw new Error('Missing public history proposal')
  }

  return change.change
}

describe('Foldkit model-owned transaction history', () => {
  it('records accepted semantic edits and restores selection without recording presentation state', () => {
    const edited = position(makeModel(), 30)
    expect({
      status: flowHistoryStatus(edited.model.history),
      origin: proposal(edited).context?.origin.kind,
    }).toMatchObject({
      status: { pastCount: 1, futureCount: 0 },
      origin: 'local',
    })

    const presentation = replace(edited.model, {
      ...edited.model.graph.document,
      nodes: edited.model.graph.document.nodes.map((node) => ({
        ...node,
        selected: false,
        measured: { width: 80, height: 40 },
      })),
    })

    const viewport = update(
      presentation,
      AppMessage.HostAction({
        action: HostAction.ReplaceViewport({
          viewport: { x: 30, y: 40, zoom: 2 },
        }),
      })
    ).model

    expect(viewport.history).toBe(edited.model.history)
    const undone = history(viewport, 'undo').model
    expect({
      semantic: flowHistoryDocument(undone.graph.document),
      node: undone.graph.document.nodes[0],
      viewport: undone.graph.viewport,
      status: flowHistoryStatus(undone.history),
    }).toMatchObject({
      semantic: flowHistoryDocument(document),
      node: { selected: false, measured: { width: 80, height: 40 } },
      viewport: { x: 30, y: 40, zoom: 2 },
      status: { pastCount: 0, futureCount: 1, pending: false },
    })
    const redone = history(undone, 'redo').model
    expect({
      position: redone.graph.document.nodes[0]?.position,
      status: flowHistoryStatus(redone.history),
    }).toMatchObject({
      position: { x: 30, y: 20 },
      status: { pastCount: 1, futureCount: 0, pending: false },
    })
  })

  it('controlled replay waits for receipt context, supports rejection, and retains owner authority', () => {
    const uncontrolled = position(makeModel(), 30).model

    const controlled: Model = {
      ...uncontrolled,
      graph: { ...uncontrolled.graph, documentMode: 'controlled' },
    }

    const requested = history(controlled, 'undo')
    const requestedChange = proposal(requested)
    expect({
      status: flowHistoryStatus(requested.model.history),
      document: requested.model.graph.document,
      hasContext: requestedChange.context !== undefined,
    }).toMatchObject({
      status: { pastCount: 1, futureCount: 0, pending: true },
      document: controlled.graph.document,
      hasContext: true,
    })
    const ignored = history(requested.model, 'redo')
    expect(ignored.model.history).toBe(requested.model.history)

    const rejected = history(
      requested.model,
      'reject',
      requestedChange.context?.transactionId
    ).model

    expect(flowHistoryStatus(rejected.history)).toMatchObject({
      pastCount: 1,
      futureCount: 0,
      pending: false,
    })
    const second = history(rejected, 'undo')
    const accepted = proposal(second)

    const echoed = update(
      second.model,
      AppMessage.HostAction({
        action: HostAction.ReplaceDocument({
          document: accepted.document,
          context: accepted.context,
        }),
      })
    ).model

    const replay = proposal(history(echoed, 'redo'))
    expect({
      semantic: flowHistoryDocument(echoed.graph.document),
      status: flowHistoryStatus(echoed.history),
      redoPosition: replay.document.nodes[0]?.position,
    }).toMatchObject({
      semantic: flowHistoryDocument(document),
      status: { pastCount: 0, futureCount: 1, pending: false },
      redoPosition: { x: 30, y: 20 },
    })
    const actual = position(rejected, 70)
    const ordinary = proposal(actual)

    const ownerAccepted = update(
      actual.model,
      AppMessage.HostAction({
        action: HostAction.ReplaceDocument({
          document: ordinary.document,
          context: ordinary.context,
        }),
      })
    ).model

    expect({
      before: flowHistoryStatus(actual.model.history),
      accepted: flowHistoryStatus(ownerAccepted.history),
    }).toMatchObject({
      before: { pastCount: 1 },
      accepted: { pastCount: 2, futureCount: 0 },
    })
  })

  it('groups repeated keyboard updates until keyup and separates unrelated API edits', () => {
    const repeated = move(move(move(makeModel())))
    expect({
      position: repeated.graph.document.nodes[0]?.position,
      count: flowHistoryStatus(repeated.history).pastCount,
    }).toStrictEqual({ position: { x: 25, y: 20 }, count: 1 })
    const ended = update(repeated, AppMessage.HistoryGestureEnd()).model
    const next = move(ended)
    expect(flowHistoryStatus(next.history).pastCount).toBe(2)
    const unrelated = position(next, 80).model
    const after = move(unrelated)
    expect(flowHistoryStatus(after.history).pastCount).toBe(4)
    expect(
      history(after, 'undo').model.graph.document.nodes[0]?.position
    ).toStrictEqual({ x: 80, y: 20 })
  })

  it('coalesces controlled keyboard repeats through owner-echoed proposal context', () => {
    const initial = makeModel()

    let controlled: Model = {
      ...initial,
      graph: { ...initial.graph, documentMode: 'controlled' },
    }

    const contexts: NonNullable<ReturnType<typeof proposal>['context']>[] = []

    for (let repeat = 0; repeat < 3; repeat += 1) {
      const proposed = update(
        controlled,
        AppMessage.GraphMessage({
          message: Graph.Message.MoveNodeByKeyboard({
            nodeId: NodeIdSchema.make('a'),
            key: 'ArrowRight',
          }),
        })
      )

      const change = proposal(proposed)

      if (change.context === undefined) {
        throw new Error('Missing keyboard transaction context')
      }

      contexts.push(change.context)
      controlled = update(
        proposed.model,
        AppMessage.HostAction({
          action: HostAction.ReplaceDocument({
            document: change.document,
            context: change.context,
          }),
        })
      ).model
    }

    controlled = update(controlled, AppMessage.HistoryGestureEnd()).model
    expect({
      position: controlled.graph.document.nodes[0]?.position,
      count: flowHistoryStatus(controlled.history).pastCount,
    }).toStrictEqual({ position: { x: 25, y: 20 }, count: 1 })
    expect({
      origins: contexts.map(({ origin }) => origin),
      gestureCount: new Set(contexts.map(({ gestureId }) => gestureId)).size,
      haveGestureIds: contexts.every(
        ({ gestureId }) => gestureId !== undefined
      ),
    }).toStrictEqual({
      origins: Array.from({ length: 3 }, () => ({
        kind: 'local',
        actorId: initial.history.session,
      })),
      gestureCount: 1,
      haveGestureIds: true,
    })
    const undo = history(controlled, 'undo')
    const undoChange = proposal(undo)

    const undone = update(
      undo.model,
      AppMessage.HostAction({
        action: HostAction.ReplaceDocument({
          document: undoChange.document,
          context: undoChange.context,
        }),
      })
    ).model

    expect({
      position: undone.graph.document.nodes[0]?.position,
      status: flowHistoryStatus(undone.history),
    }).toMatchObject({
      position: { x: 10, y: 20 },
      status: { pastCount: 0, futureCount: 1, pending: false },
    })
    const redo = history(undone, 'redo')
    const redoChange = proposal(redo)

    const redone = update(
      redo.model,
      AppMessage.HostAction({
        action: HostAction.ReplaceDocument({
          document: redoChange.document,
          context: redoChange.context,
        }),
      })
    ).model

    expect({
      position: redone.graph.document.nodes[0]?.position,
      status: flowHistoryStatus(redone.history),
    }).toMatchObject({
      position: { x: 25, y: 20 },
      status: { pastCount: 1, futureCount: 0, pending: false },
    })
  })

  it('allocates a new controlled keyboard hold ID and keeps late old acknowledgments out of the active group', () => {
    const initial = makeModel()

    const start: Model = {
      ...initial,
      graph: { ...initial.graph, documentMode: 'controlled' },
    }

    const accept = (model: Model, change: ReturnType<typeof proposal>) =>
      update(
        model,
        AppMessage.HostAction({
          action: HostAction.ReplaceDocument({
            document: change.document,
            context: change.context,
          }),
        })
      ).model

    const first = keyboard(start)
    const firstAccepted = accept(first.model, proposal(first))
    const late = keyboard(firstAccepted)
    const lateChange = proposal(late)
    const ended = update(late.model, AppMessage.HistoryGestureEnd()).model
    const next = keyboard(ended)
    const nextChange = proposal(next)
    expect({
      sameFirstHold:
        proposal(first).context?.gestureId === lateChange.context?.gestureId,
      differentNextHold:
        lateChange.context?.gestureId !== nextChange.context?.gestureId,
    }).toStrictEqual({ sameFirstHold: true, differentNextHold: true })
    const nextAccepted = accept(next.model, nextChange)
    const repeated = keyboard(nextAccepted)
    expect(proposal(repeated).context?.gestureId).toBe(
      nextChange.context?.gestureId
    )
    const repeatedAccepted = accept(repeated.model, proposal(repeated))
    expect({
      position: repeatedAccepted.graph.document.nodes[0]?.position,
      count: flowHistoryStatus(repeatedAccepted.history).pastCount,
    }).toStrictEqual({ position: { x: 25, y: 20 }, count: 2 })
    const lateAccepted = accept(repeatedAccepted, lateChange)
    expect({
      position: lateAccepted.graph.document.nodes[0]?.position,
      count: flowHistoryStatus(lateAccepted.history).pastCount,
    }).toStrictEqual({ position: { x: 20, y: 20 }, count: 3 })
  })

  it('rejects invalid edits and cancels active previews before replay', () => {
    const committed = position(makeModel(), 30).model

    const failed = update(
      committed,
      AppMessage.EditRequest({
        request: {
          requestId: 'invalid',
          transaction: {
            operations: [{ kind: 'add-nodes', nodes: document.nodes }],
          },
        },
      })
    )

    expect(failed.model.history).toBe(committed.history)
    expect(
      failed.outMessage?.some((item) => item.kind === 'edit-failure')
    ).toBeTruthy()

    const down = update(
      committed,
      AppMessage.GraphMessage({
        message: Graph.Message.PointerDown({
          pointerId: 1,
          nodeId: 'a',
          clientX: 30,
          clientY: 20,
          handleId: null,
          direction: null,
          edgeId: null,
          endpoint: null,
        }),
      })
    ).model

    const moved = update(
      down,
      AppMessage.GraphMessage({
        message: Graph.Message.NodeDragMoved({
          pointerId: 1,
          clientX: 70,
          clientY: 20,
          flowX: 70,
          flowY: 20,
        }),
      })
    ).model

    expect(moved.graph.pointerSession).not.toBeNull()
    const undone = history(moved, 'undo')
    expect({
      pointer: undone.model.graph.pointerSession,
      gesture: undone.model.graph.gestureSession,
      position: undone.model.graph.document.nodes[0]?.position,
      cancelled: undone.outMessage?.some(
        (item) => item.kind === 'change' && item.cancellation !== undefined
      ),
    }).toStrictEqual({
      pointer: null,
      gesture: null,
      position: { x: 10, y: 20 },
      cancelled: true,
    })
  })

  it('validates trailing capacity including zero and disables recording at zero', () => {
    const zero = position(makeModel(0), 30).model
    expect(flowHistoryStatus(zero.history)).toMatchObject({
      capacity: 0,
      canUndo: false,
      pastCount: 0,
    })
    expect(
      history(zero, 'undo').model.graph.document.nodes[0]?.position
    ).toStrictEqual({ x: 30, y: 20 })
    expect(() => makeModel(1)).not.toThrow()

    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => makeModel(invalid)).toThrow(/Expected/u)
    }
  })

  it('starts a fresh cursor when a development runtime restores a previous session model', () => {
    const committed = position(makeModel(), 30).model
    const pointer = Graph.createPointerResource(committed.graph)

    const programUpdate = createProgramUpdate(
      pointer,
      { enqueue: () => {}, close: () => {} },
      'new-session'
    )

    const restored = programUpdate(
      committed,
      AppMessage.HistoryRequest({
        request: { requestId: 'new-status', action: 'status' },
      })
    ).model

    expect(restored.history.session).toBe('new-session')
    expect(flowHistoryStatus(restored.history)).toMatchObject({
      pastCount: 0,
      futureCount: 0,
    })
    expect(restored.history.present.nodes[0]?.position).toStrictEqual({
      x: 30,
      y: 20,
    })
    pointer.close()
  })

  it.each<{ kind: 'remote' | 'system' }>([
    { kind: 'remote' },
    { kind: 'system' },
  ])(
    'preserves explicit $kind origin through public command acceptance',
    ({ kind }) => {
      const committed = position(makeModel(), 30).model

      const accepted = update(
        committed,
        AppMessage.HostAction({
          action: HostAction.DispatchCommand({
            command: {
              kind: 'edit-transaction',
              transaction: {
                context: {
                  transactionId: 'peer-command',
                  origin: { kind, actorId: 'peer' },
                },
                operations: [
                  {
                    kind: 'update-node',
                    nodeId: NodeIdSchema.make('a'),
                    patch: { position: { x: 90, y: 20 } },
                  },
                ],
              },
            },
          }),
        })
      ).model

      expect(flowHistoryStatus(accepted.history)).toMatchObject({
        pastCount: 0,
        futureCount: 0,
      })
      expect(accepted.graph.document.nodes[0]?.position).toStrictEqual({
        x: 90,
        y: 20,
      })
    }
  )

  it('remote accepted updates reset the session baseline and status requests preserve the cursor', () => {
    const committed = position(makeModel(), 30).model

    const remote = update(
      committed,
      AppMessage.HostAction({
        action: HostAction.ReplaceDocument({
          document,
          context: {
            transactionId: 'remote',
            origin: { kind: 'remote', actorId: 'peer' },
          },
        }),
      })
    ).model

    expect(flowHistoryStatus(remote.history)).toMatchObject({
      pastCount: 0,
      futureCount: 0,
    })
    const result = history(remote, 'status')
    expect(result.commands).toHaveLength(1)
    expect(result.model.history).toBe(remote.history)
  })
})
