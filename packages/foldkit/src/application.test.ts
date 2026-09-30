import { decodeFlowDocument } from '@flow/core'
import { Effect, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import {
  AppMessage,
  initialModel,
  LegacySnapshotFailureSchema,
  update,
} from './application.ts'

describe('legacy snapshot update branch (controlled model unit inputs, not mounted public integration)', () => {
  const document = Effect.runSync(
    decodeFlowDocument({
      nodes: [{ id: 'node', label: 'Node', position: { x: 0, y: 0 } }],
      edges: [],
    })
  )

  const model = initialModel(document, { x: 5, y: -7, zoom: 1.5 })

  test.each([
    [
      'global origin',
      { ...document, nodeOrigin: undefined },
      'origin-requires-versioned-session',
    ],
    [
      'node origin plus native flag',
      {
        ...document,
        nodes: document.nodes.map((node) => ({
          ...node,
          origin: [0, 0],
          connectable: false,
        })),
      },
      'origin-requires-versioned-session',
    ],
    [
      'native role',
      {
        ...document,
        nodes: document.nodes.map((node) => ({ ...node, ariaRole: '' })),
      },
      'native-fields-require-versioned-session',
    ],
    [
      'native flag undefined',
      {
        ...document,
        nodes: document.nodes.map((node) => ({
          ...node,
          connectable: undefined,
        })),
      },
      'native-fields-require-versioned-session',
    ],
    [
      'empty existing description',
      {
        ...document,
        nodes: document.nodes.map((node) => ({ ...node, ariaDescription: '' })),
      },
      'native-fields-require-versioned-session',
    ],
  ])(
    'constructs one correlated failure for %s and preserves model identity',
    (_name, input, code) => {
      // This explicitly constructed model is unit branch evidence. Baseline live
      // decoding cannot publish these extensions; no Runtime private state is used.
      const candidate = { ...model, graph: { ...model.graph, document: input } }
      const before = structuredClone(candidate)
      const requestId = 'unit-format-request'

      const result = update(
        candidate,
        AppMessage.SnapshotRequest({ request: { requestId } })
      )

      expect(result.model).toBe(candidate)
      expect(result.model).toStrictEqual(before)
      expect(result.commands).toHaveLength(1)
      const command = result.commands?.[0]

      if (command === undefined) {
        throw new Error('Missing failure command')
      }

      expect({
        name: command.name,
        failure: Schema.decodeUnknownSync(LegacySnapshotFailureSchema)(
          command.args?.failure
        ),
      }).toStrictEqual({
        name: 'RespondFlowSnapshotFailure',
        failure: { requestId, code },
      })
      // Explicit terminal-message unit input; queued Port.emit execution is
      // verified only through the real ordinary Runtime browser path in stage 1.
      const followup = update(result.model, AppMessage.SnapshotPublished())
      expect({
        sameModel: followup.model === candidate,
        model: followup.model,
        commands: followup.commands ?? [],
      }).toStrictEqual({ sameModel: true, model: before, commands: [] })
    }
  )

  test('ordinary baseline reads construct a success and the same literal-v1 session', () => {
    const result = update(
      model,
      AppMessage.SnapshotRequest({ request: { requestId: 'ordinary' } })
    )

    expect(result.model).toBe(model)
    expect(result.commands).toHaveLength(1)
    const command = result.commands?.[0]

    if (command === undefined) {
      throw new Error('Missing success command')
    }

    expect(command.name).toBe('RespondFlowSnapshot')
    expect(command.args?.response).toMatchObject({
      requestId: 'ordinary',
      savedSession: { version: 1, document, viewport: model.graph.viewport },
    })
  })
})
