import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  activateFlowInteraction,
  cancelAllFlowInteractions,
  cancelFlowInteraction,
  finishFlowInteraction,
  FlowInteractionSessionSchema,
  startFlowInteraction,
} from './flow-runtime.schema.ts'

const session = S.decodeUnknownSync(FlowInteractionSessionSchema)

const node = session({
  kind: 'node-drag',
  phase: 'pressed',
  drag: { nodeId: 'a', pointerId: 1, pointerOffset: { x: 0, y: 0 } },
})

const connection = session({
  kind: 'connection',
  connection: { pointerId: 2, source: 'a', sourceHandle: 'out' },
})

const reconnect = session({
  kind: 'reconnection',
  reconnection: { pointerId: 3, edgeId: 'edge', endpoint: 'target' },
})

const resize = session({
  kind: 'node-resize',
  resize: {
    pointerId: 4,
    nodeId: 'a',
    direction: 'right',
    positionStart: { x: 20, y: 20 },
    pointerStart: { x: 40, y: 40 },
    sizeStart: { width: 150, height: 45 },
  },
})

const selection = session({
  kind: 'selection',
  selection: {
    pointerId: 5,
    pointerStart: { x: 0, y: 0 },
    flowStart: { x: 0, y: 0 },
  },
})

const pan = session({
  kind: 'pane-pan',
  pan: {
    pointerId: 6,
    pointerStart: { x: 0, y: 0 },
    viewportStart: { x: 0, y: 0, zoom: 1 },
  },
})

// Browser integration retains native capture, callback reentry and framework disposal.
// This test owns the session reduction and ordered cleanup outcomes those hosts consume.
describe('interaction cancellation and reentry ordering', () => {
  it('drains each entry owner once, in registration order, without semantic proposals', () => {
    const sessions = [node, connection, reconnect, resize, selection, pan]
    const outcomes = cancelAllFlowInteractions(sessions)
    expect(
      outcomes.map((outcome) =>
        outcome.kind === 'cancelled'
          ? {
              kind: outcome.session.kind,
              pointerIds: outcome.pointerIds,
              preview: outcome.preview,
              frame: outcome.frame,
              semanticEvent: outcome.semanticEvent,
              remaining: outcome.sessions.map((current) => current.kind),
            }
          : outcome.kind
      )
    ).toStrictEqual([
      {
        kind: 'node-drag',
        pointerIds: [1],
        preview: 'node',
        frame: undefined,
        semanticEvent: undefined,
        remaining: [
          'connection',
          'reconnection',
          'node-resize',
          'selection',
          'pane-pan',
        ],
      },
      {
        kind: 'connection',
        pointerIds: [2],
        preview: 'connection',
        frame: 'connection-autopan',
        semanticEvent: undefined,
        remaining: ['reconnection', 'node-resize', 'selection', 'pane-pan'],
      },
      {
        kind: 'reconnection',
        pointerIds: [3],
        preview: 'connection',
        frame: undefined,
        semanticEvent: undefined,
        remaining: ['node-resize', 'selection', 'pane-pan'],
      },
      {
        kind: 'node-resize',
        pointerIds: [4],
        preview: 'node-bounds',
        frame: undefined,
        semanticEvent: undefined,
        remaining: ['selection', 'pane-pan'],
      },
      {
        kind: 'selection',
        pointerIds: [5],
        preview: 'selection',
        frame: 'selection-autopan',
        semanticEvent: undefined,
        remaining: ['pane-pan'],
      },
      {
        kind: 'pane-pan',
        pointerIds: [6],
        preview: 'viewport',
        frame: undefined,
        semanticEvent: undefined,
        remaining: [],
      },
    ])
    expect(sessions.map((current) => current.kind)).toStrictEqual([
      'node-drag',
      'connection',
      'reconnection',
      'node-resize',
      'selection',
      'pane-pan',
    ])
    expect(cancelAllFlowInteractions([])).toStrictEqual([])
  })

  it('detaches a terminal owner before admitting a replacement with the same pointer', () => {
    const active = activateFlowInteraction([node], 1)
    const terminal = finishFlowInteraction(active.sessions, 1)
    expect(terminal).toMatchObject({
      kind: 'finished',
      sessions: [],
      pointerIds: [1],
      preview: 'node',
      semanticEvent: 'node-position',
    })
    const replacement = startFlowInteraction(terminal.sessions, node)
    expect(replacement).toStrictEqual({
      kind: 'started',
      sessions: [node],
      session: node,
    })
    // A consumer can retain the terminal receipt while the new session is live.
    // Reducing that detached receipt cannot mutate the replacement's state.
    expect(cancelFlowInteraction(terminal.sessions, 1)).toStrictEqual({
      kind: 'unchanged',
      sessions: [],
    })
    expect(replacement.sessions).toStrictEqual([node])
    expect(startFlowInteraction(replacement.sessions, node)).toStrictEqual({
      kind: 'rejected',
      sessions: [node],
      reason: 'pointer-already-owned',
    })
  })

  it('keeps other pointers live and makes repeated old terminals inert after cancellation', () => {
    const cancelled = cancelFlowInteraction([node, connection], 1)
    expect(cancelled).toMatchObject({
      kind: 'cancelled',
      sessions: [connection],
      pointerIds: [1],
      semanticEvent: undefined,
    })
    expect(finishFlowInteraction(cancelled.sessions, 1)).toStrictEqual({
      kind: 'unchanged',
      sessions: [connection],
    })
    expect(cancelFlowInteraction(cancelled.sessions, 99)).toStrictEqual({
      kind: 'unchanged',
      sessions: [connection],
    })
    expect(finishFlowInteraction(cancelled.sessions, 2)).toMatchObject({
      kind: 'finished',
      sessions: [],
      pointerIds: [2],
      semanticEvent: 'edge-add',
    })
  })

  it('never promotes a pending threshold press into a semantic drag on release or disposal', () => {
    expect(finishFlowInteraction([node], 1)).toMatchObject({
      kind: 'finished',
      sessions: [],
      semanticEvent: undefined,
    })
    expect(cancelFlowInteraction([node], 1)).toMatchObject({
      kind: 'cancelled',
      sessions: [],
      semanticEvent: undefined,
    })
    const active = activateFlowInteraction([node], 1)
    expect(finishFlowInteraction(active.sessions, 1)).toMatchObject({
      kind: 'finished',
      sessions: [],
      semanticEvent: 'node-position',
    })
    expect(cancelFlowInteraction(active.sessions, 1)).toMatchObject({
      kind: 'cancelled',
      sessions: [],
      semanticEvent: undefined,
    })
  })
})
