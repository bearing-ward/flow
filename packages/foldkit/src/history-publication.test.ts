import {
  decodeFlowDocument,
  FlowHistoryStatusSchema,
  flowHistoryStatus,
  NodeIdSchema,
} from '@flow/core'
import { Effect, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

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
    nodes: [{ id: 'a', label: 'Alpha', position: { x: 10, y: 20 } }],
    edges: [],
  })
)

const initial = () => initialModel(document, { x: 0, y: 0, zoom: 1 })

const move = (model: Model, x: number) =>
  update(
    model,
    AppMessage.HostAction({
      action: HostAction.DispatchCommand({
        command: {
          kind: 'set-node-position',
          nodeId: NodeIdSchema.make('a'),
          position: { x, y: 20 },
        },
      }),
    })
  )

const request = (model: Model, action: 'status' | 'undo' | 'redo') =>
  update(
    model,
    AppMessage.HistoryRequest({
      request: { requestId: 'observed-history', action },
    })
  )

const publishedStatus = (result: ReturnType<typeof update>) => {
  const command = result.commands?.find(
    ({ name }) => name === 'PublishFoldkitHistory'
  )

  if (command === undefined) {
    throw new Error('Missing requested history publication')
  }

  return Schema.decodeUnknownSync(FlowHistoryStatusSchema)(command.args?.status)
}

describe('optional Foldkit history status publication', () => {
  test('records accepted edits without adding commands for an unobserved history port', () => {
    const changed = move(initial(), 30)
    expect({
      position: changed.model.graph.document.nodes[0]?.position,
      status: flowHistoryStatus(changed.model.history),
      commands: changed.commands ?? [],
    }).toMatchObject({
      position: { x: 30, y: 20 },
      status: { pastCount: 1, canUndo: true },
      commands: [],
    })
    const twice = move(changed.model, 40)
    expect({
      count: twice.model.history.past.length,
      commands: twice.commands ?? [],
    }).toStrictEqual({ count: 2, commands: [] })
  })

  test('an explicit status read activates updates and exposes already recorded edits', () => {
    const changed = move(initial(), 30)
    const read = request(changed.model, 'status')
    expect(publishedStatus(read)).toMatchObject({
      pastCount: 1,
      canUndo: true,
      pending: false,
    })
    const next = move(read.model, 40)
    expect(publishedStatus(next)).toMatchObject({ pastCount: 2, canUndo: true })
    expect(next.commands?.map(({ name }) => name)).toStrictEqual([
      'PublishFoldkitHistory',
    ])
  })

  test('native history requests can undo previously unobserved edits and enable status updates', () => {
    const changed = move(initial(), 30)
    const undone = request(changed.model, 'undo')
    expect({
      position: undone.model.graph.document.nodes[0]?.position,
      status: publishedStatus(undone),
    }).toMatchObject({
      position: { x: 10, y: 20 },
      status: { pastCount: 0, futureCount: 1, canRedo: true, pending: false },
    })
    const redone = request(undone.model, 'redo')
    expect({
      position: redone.model.graph.document.nodes[0]?.position,
      status: publishedStatus(redone),
    }).toMatchObject({
      position: { x: 30, y: 20 },
      status: { pastCount: 1, futureCount: 0, canUndo: true },
    })
  })

  test('a new runtime session resets optional publication along with the cursor', () => {
    const observed = request(move(initial(), 30).model, 'status').model
    const pointer = Graph.createPointerResource(observed.graph)

    const programUpdate = createProgramUpdate(
      pointer,
      { enqueue: () => {}, close: () => {} },
      'replacement-runtime'
    )

    const restored = programUpdate(
      observed,
      AppMessage.HistoryPublished()
    ).model

    const changed = move(restored, 40)
    expect({
      position: changed.model.graph.document.nodes[0]?.position,
      status: flowHistoryStatus(changed.model.history),
      commands: changed.commands ?? [],
    }).toMatchObject({
      position: { x: 40, y: 20 },
      status: { pastCount: 1, canUndo: true },
      commands: [],
    })
    pointer.close()
  })
})
