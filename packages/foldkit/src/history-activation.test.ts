import type { FlowHistoryStatus } from '@flow/core'
import { Exit } from 'effect'
import { describe, expect, it } from 'vitest'

import type {
  HistoryRequestSchema,
  HistoryResultSchema,
} from './application.ts'
import { createFoldkitHistoryClient } from './history-client.ts'

const status: FlowHistoryStatus = {
  canUndo: true,
  canRedo: false,
  pending: false,
  pastCount: 3,
  futureCount: 0,
  capacity: 10,
  disposed: false,
}

const transport = () => {
  const results = new Set<
    (response: typeof HistoryResultSchema.Encoded) => void
  >()

  const states = new Set<(state: FlowHistoryStatus) => void>()
  const requests: (typeof HistoryRequestSchema.Encoded)[] = []
  const installedAtSend: number[] = []

  const ports: Parameters<typeof createFoldkitHistoryClient>[0] = {
    historyRequests: {
      send: (request) => {
        requests.push(request)
        installedAtSend.push(results.size + states.size)

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

  const publish = (state: FlowHistoryStatus): void => {
    for (const listener of states) {
      listener(state)
    }
  }

  const answer = (): void => {
    const [request] = requests

    if (request === undefined) {
      throw new Error('Missing initial history status request')
    }

    publish(status)

    for (const listener of results) {
      listener({ requestId: request.requestId, status })
    }
  }

  return { ports, requests, installedAtSend, results, states, publish, answer }
}

describe('Foldkit history publication activation', () => {
  it('a subscribe-only client reads existing status after installing its port listeners', async () => {
    const io = transport()
    const client = createFoldkitHistoryClient(io.ports)
    const received: FlowHistoryStatus[] = []
    client.subscribeHistory((state) => {
      received.push(state)
    })
    await Promise.resolve()
    expect(io.requests.map(({ action }) => action)).toStrictEqual(['status'])
    expect(io.installedAtSend).toStrictEqual([2])
    io.answer()
    expect(received).toStrictEqual([status])
    io.publish({ ...status, pastCount: 4 })
    expect(received.map(({ pastCount }) => pastCount)).toStrictEqual([3, 4])
    client.dispose()
    expect({ results: io.results.size, states: io.states.size }).toStrictEqual({
      results: 0,
      states: 0,
    })
  })

  it('disposing before activation cancels the automatic initial read', async () => {
    const io = transport()
    const client = createFoldkitHistoryClient(io.ports)
    client.dispose()
    await Promise.resolve()
    expect(io.requests).toStrictEqual([])
    expect({ results: io.results.size, states: io.states.size }).toStrictEqual({
      results: 0,
      states: 0,
    })
    await expect(client.undo()).resolves.toMatchObject({ disposed: true })
  })

  it('activation and disposal stay isolated between clients on different runtimes', async () => {
    const first = transport()
    const second = transport()
    const firstClient = createFoldkitHistoryClient(first.ports)
    const secondClient = createFoldkitHistoryClient(second.ports)
    const firstReceived: number[] = []
    const secondReceived: number[] = []
    firstClient.subscribeHistory(({ pastCount }) => {
      firstReceived.push(pastCount)
    })
    secondClient.subscribeHistory(({ pastCount }) => {
      secondReceived.push(pastCount)
    })
    await Promise.resolve()
    first.answer()
    second.answer()
    firstClient.dispose()
    first.publish({ ...status, pastCount: 5 })
    second.publish({ ...status, pastCount: 7 })
    expect({ first: firstReceived, second: secondReceived }).toStrictEqual({
      first: [3],
      second: [3, 7],
    })
    expect({
      first: first.requests.length,
      second: second.requests.length,
    }).toStrictEqual({ first: 1, second: 1 })
    secondClient.dispose()
    expect({
      results: second.results.size,
      states: second.states.size,
    }).toStrictEqual({ results: 0, states: 0 })
  })
})
