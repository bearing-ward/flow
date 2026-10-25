import type { FlowHistoryStatus } from '@flow/core'
import { Exit } from 'effect'
import { describe, expect, test } from 'vitest'

import type {
  HistoryRequestSchema,
  HistoryResultSchema,
} from './application.ts'
import { createFoldkitHistoryClient } from './history-client.ts'

const status: FlowHistoryStatus = {
  canUndo: true,
  canRedo: false,
  pending: false,
  pastCount: 1,
  futureCount: 0,
  capacity: 3,
  disposed: false,
}

const transport = () => {
  const results = new Set<
    (result: typeof HistoryResultSchema.Encoded) => void
  >()

  const states = new Set<(state: FlowHistoryStatus) => void>()
  const requests: (typeof HistoryRequestSchema.Encoded)[] = []

  const ports: Parameters<typeof createFoldkitHistoryClient>[0] = {
    historyRequests: {
      send: (request) => {
        requests.push(request)

        return Exit.void
      },
    },
    historyResults: {
      subscribe: (listener) => {
        results.add(listener)

        return () => {
          results.delete(listener)
        }
      },
    },
    historyStates: {
      subscribe: (listener) => {
        states.add(listener)

        return () => {
          states.delete(listener)
        }
      },
    },
  }

  const answer = (
    request: typeof HistoryRequestSchema.Encoded | undefined
  ): void => {
    if (request === undefined) {
      throw new Error('Missing request')
    }

    for (const listener of states) {
      listener(status)
    }

    for (const listener of results) {
      listener({ requestId: request.requestId, status })
    }
  }

  return { ports, requests, answer, results, states }
}

describe('Foldkit history client transport', () => {
  test('Foldkit history clients correlate concurrent requests without owning history snapshots', async () => {
    const io = transport()
    const first = createFoldkitHistoryClient(io.ports)
    const second = createFoldkitHistoryClient(io.ports)
    const undo = first.undo()
    const redo = second.redo()
    io.answer(io.requests[1])
    io.answer(io.requests[0])
    await expect(undo).resolves.toStrictEqual(status)
    await expect(redo).resolves.toStrictEqual(status)
    expect(io.requests.map(({ action }) => action)).toStrictEqual([
      'undo',
      'redo',
    ])
    first.dispose()
    second.dispose()
    expect({ results: io.results.size, states: io.states.size }).toStrictEqual({
      results: 0,
      states: 0,
    })
  })

  test('Foldkit history client disposal settles pending requests and prevents future sends', async () => {
    const io = transport()
    const client = createFoldkitHistoryClient(io.ports)
    const undo = client.undo()
    client.dispose()
    await expect(undo).resolves.toMatchObject({
      canUndo: false,
      canRedo: false,
      pending: false,
      disposed: true,
    })
    await expect(client.getStatus()).resolves.toMatchObject({ disposed: true })
    await expect(client.redo()).resolves.toMatchObject({ disposed: true })
    expect(io.requests).toHaveLength(1)
    expect({ results: io.results.size, states: io.states.size }).toStrictEqual({
      results: 0,
      states: 0,
    })
  })
})
