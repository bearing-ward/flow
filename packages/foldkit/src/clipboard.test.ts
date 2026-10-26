import { decodeFlowDocument, flowHistoryStatus } from '@flow/core'
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

const makeModel = () => initialModel(document, { x: 0, y: 0, zoom: 1 }, [])

const clipboard = (
  model: Model,
  command: Parameters<typeof HostAction.Clipboard>[0]['command']
) =>
  update(
    model,
    AppMessage.HostAction({ action: HostAction.Clipboard({ command }) })
  )

describe('Foldkit model-owned graph clipboard', () => {
  it('records an accepted paste as one undo step and leaves other models isolated', () => {
    const copied = clipboard(makeModel(), { kind: 'copy' }).model
    const pasted = clipboard(copied, { kind: 'paste', options: {} }).model
    expect(pasted.graph.document.nodes.at(-1)).toMatchObject({
      id: 'a-copy-1',
      position: { x: 30, y: 40 },
    })
    expect(flowHistoryStatus(pasted.history)).toMatchObject({ pastCount: 1 })

    const undone = update(
      pasted,
      AppMessage.HistoryRequest({
        request: { requestId: 'undo', action: 'undo' },
      })
    ).model

    expect(undone.graph.document.nodes.map(({ id }) => id)).toStrictEqual(['a'])
    expect(
      clipboard(makeModel(), {
        kind: 'paste',
        options: {},
      }).model.graph.document.nodes.map(({ id }) => id)
    ).toStrictEqual(['a'])
  })

  it('keeps controlled paste proposals out of history until accepted, including rejection', () => {
    const copied = clipboard(makeModel(), { kind: 'copy' }).model

    const controlled = {
      ...copied,
      graph: { ...copied.graph, documentMode: 'controlled' },
    } satisfies Model

    const proposed = clipboard(controlled, { kind: 'paste', options: {} })

    const publication = proposed.outMessage?.find(
      (item) => item.kind === 'change' && item.change?.kind === 'edit-proposal'
    )

    if (
      publication?.kind !== 'change' ||
      publication.change?.kind !== 'edit-proposal'
    ) {
      throw new Error('Missing clipboard proposal')
    }

    const { change } = publication
    expect({
      nodes: proposed.model.graph.document.nodes.length,
      history: flowHistoryStatus(proposed.model.history).pastCount,
    }).toStrictEqual({ nodes: 1, history: 0 })

    const rejected = update(
      proposed.model,
      AppMessage.HistoryRequest({
        request: {
          requestId: 'reject',
          action: 'reject',
          transactionId: change.context?.transactionId,
        },
      })
    ).model

    expect(flowHistoryStatus(rejected.history).pastCount).toBe(0)

    const accepted = update(
      proposed.model,
      AppMessage.HostAction({
        action: HostAction.ReplaceDocument({
          document: change.document,
          context: change.context,
        }),
      })
    ).model

    expect({
      nodes: accepted.graph.document.nodes.length,
      history: flowHistoryStatus(accepted.history).pastCount,
    }).toStrictEqual({ nodes: 2, history: 1 })
  })

  it('starts an empty clipboard when a new runtime restores an earlier session model', () => {
    const copied = clipboard(makeModel(), { kind: 'copy' }).model
    const pointer = Graph.createPointerResource(copied.graph)

    const programUpdate = createProgramUpdate(
      pointer,
      { enqueue: () => {}, close: () => {} },
      'new-clipboard-session'
    )

    const restored = programUpdate(
      copied,
      AppMessage.HistoryRequest({
        request: { requestId: 'status', action: 'status' },
      })
    ).model

    expect(restored.clipboard).toStrictEqual({ fragment: null, pasteCount: 0 })
    expect(
      clipboard(restored, {
        kind: 'paste',
        options: {},
      }).model.graph.document.nodes.map(({ id }) => id)
    ).toStrictEqual(['a'])
  })

  it('rejects malformed clipboard replacement without losing the current fragment', () => {
    const copied = clipboard(makeModel(), { kind: 'copy' }).model

    const rejected = clipboard(copied, {
      kind: 'set',
      input: { version: 9 },
    }).model

    expect(rejected.clipboard).toBe(copied.clipboard)
    expect(
      clipboard(rejected, {
        kind: 'paste',
        options: {},
      }).model.graph.document.nodes.at(-1)?.id
    ).toBe('a-copy-1')
  })
})
