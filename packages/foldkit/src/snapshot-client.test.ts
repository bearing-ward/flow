import { Exit } from 'effect'
import { describe, expect, test } from 'vitest'

import type {
  LegacySnapshotFailure,
  SnapshotRequest,
  SnapshotResponseSchema,
} from './application.ts'
import { createFoldkitSnapshotClient } from './snapshot-client.ts'

const response = (
  requestId: string
): typeof SnapshotResponseSchema.Encoded => ({
  requestId,
  snapshot: {
    document: { nodes: [], edges: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  internalNode: null,
  nodesInitialized: false,
  nodesData: [],
  nodeConnections: [],
  handleConnections: [],
  connectionPreview: null,
  savedSession: {
    version: 1,
    document: { nodes: [], edges: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  },
})

const host = () => {
  const failures = new Set<(failure: LegacySnapshotFailure) => void>()

  const listeners = new Set<
    (value: typeof SnapshotResponseSchema.Encoded) => void
  >()

  const requests: SnapshotRequest[] = []

  const ports: Parameters<typeof createFoldkitSnapshotClient>[0] = {
    snapshotFailures: {
      subscribe: (listener) => {
        failures.add(listener)

        return () => {
          failures.delete(listener)
        }
      },
    },
    snapshots: {
      subscribe: (listener) => {
        listeners.add(listener)

        return () => {
          listeners.delete(listener)
        }
      },
    },
    snapshotRequests: {
      send: (request) => {
        requests.push(request)

        return Exit.void
      },
    },
  }

  return {
    ports,
    requests,
    listeners,
    failures,
    fail: (failure: LegacySnapshotFailure) => {
      for (const listener of new Set(failures)) {
        listener(failure)
      }
    },
    emit: (value: typeof SnapshotResponseSchema.Encoded) => {
      for (const listener of new Set(listeners)) {
        listener(value)
      }
    },
  }
}

describe('Foldkit correlated public snapshot client', () => {
  test('correlates only the owning request and survives unmatched and duplicate replies', async () => {
    const source = host()
    const first = createFoldkitSnapshotClient(source.ports)
    const second = createFoldkitSnapshotClient(source.ports)
    const a = first.request({ nodeId: 'a' })
    const b = second.request()
    const [aRequest, bRequest] = source.requests

    if (aRequest === undefined || bRequest === undefined) {
      throw new Error('Missing requests')
    }

    expect(aRequest.requestId).not.toBe(bRequest.requestId)
    source.emit(response('foreign'))
    source.emit(response(bRequest.requestId))
    await expect(b).resolves.toMatchObject({
      status: 'succeeded',
      response: { requestId: bRequest.requestId },
    })
    source.emit(response(aRequest.requestId))
    source.emit(response(aRequest.requestId))
    await expect(a).resolves.toMatchObject({
      status: 'succeeded',
      response: { requestId: aRequest.requestId },
    })
    first.dispose()
    second.dispose()
    expect([source.listeners.size, source.failures.size]).toStrictEqual([0, 0])
  })

  test('disposes pending requests once, rejects new reads, and ignores a retained late callback', async () => {
    const source = host()
    const client = createFoldkitSnapshotClient(source.ports)
    const [late] = source.listeners
    const [lateFailure] = source.failures
    const a = client.request()
    const b = client.request()
    client.dispose()
    client.dispose()
    expect([await a, await b]).toMatchObject([
      { status: 'disposed' },
      { status: 'disposed' },
    ])
    const [request] = source.requests

    if (request === undefined) {
      throw new Error('Missing request')
    }

    late?.(response(request.requestId))
    lateFailure?.({
      requestId: request.requestId,
      code: 'native-fields-require-versioned-session',
    })
    await expect(client.request()).resolves.toMatchObject({
      status: 'disposed',
    })
    expect(source.requests).toHaveLength(2)
    expect([source.listeners.size, source.failures.size]).toStrictEqual([0, 0])
  })

  test('settles invalid, rejected and throwing sends without leaking pending requests', async () => {
    const source = host()

    const rejected = createFoldkitSnapshotClient({
      ...source.ports,
      snapshotRequests: { send: () => false },
    })

    await expect(rejected.request()).resolves.toMatchObject({
      status: 'failed',
      reason: 'send-failed',
    })
    // @ts-expect-error A foreign JavaScript caller can bypass the declared query type.
    await expect(rejected.request({ nodeIds: 12 })).resolves.toMatchObject({
      status: 'failed',
      reason: 'invalid-request',
    })

    const throwing = createFoldkitSnapshotClient({
      ...source.ports,
      snapshotRequests: {
        send: () => {
          throw new Error('closed')
        },
      },
    })

    await expect(throwing.request()).resolves.toMatchObject({
      status: 'failed',
      reason: 'send-failed',
    })
    rejected.dispose()
    throwing.dispose()
    expect(source.listeners.size).toBe(0)
  })

  test('handles a synchronous response or disposal during send without double settlement', async () => {
    const source = host()

    const sync = createFoldkitSnapshotClient({
      ...source.ports,
      snapshotRequests: {
        send: (request) => {
          source.emit(response(request.requestId))

          return false
        },
      },
    })

    await expect(sync.request()).resolves.toMatchObject({ status: 'succeeded' })
    sync.dispose()

    const reentrant = createFoldkitSnapshotClient({
      ...source.ports,
      snapshotRequests: {
        send: () => {
          reentrant.dispose()

          return Exit.void
        },
      },
    })

    await expect(reentrant.request()).resolves.toMatchObject({
      status: 'disposed',
    })
    expect(source.listeners.size).toBe(0)
  })

  test.each([
    'origin-requires-versioned-session',
    'native-fields-require-versioned-session',
  ] as const)('settles %s once and permits a fresh request', async (code) => {
    const source = host()
    const client = createFoldkitSnapshotClient(source.ports)
    const first = client.request()
    const [request] = source.requests

    if (request === undefined) {
      throw new Error('Missing request')
    }

    source.fail({ requestId: 'foreign', code })
    source.fail({ requestId: request.requestId, code })
    source.fail({ requestId: request.requestId, code })
    source.emit(response(request.requestId))
    await expect(first).resolves.toStrictEqual({
      status: 'failed',
      requestId: request.requestId,
      reason: code,
    })
    const second = client.request()
    const [, next] = source.requests

    if (next === undefined) {
      throw new Error('Missing fresh request')
    }

    source.emit(response(next.requestId))
    source.fail({ requestId: next.requestId, code })
    await expect(second).resolves.toMatchObject({
      status: 'succeeded',
      response: { requestId: next.requestId },
    })
    client.dispose()
    expect([source.listeners.size, source.failures.size]).toStrictEqual([0, 0])
  })

  test('handles synchronous format failure during send and a failure delivered by unsubscribe', async () => {
    const source = host()

    const client = createFoldkitSnapshotClient({
      ...source.ports,
      snapshotRequests: {
        send: (request) => {
          source.fail({
            requestId: request.requestId,
            code: 'native-fields-require-versioned-session',
          })

          return false
        },
      },
    })

    await expect(client.request()).resolves.toMatchObject({
      status: 'failed',
      reason: 'native-fields-require-versioned-session',
    })
    client.dispose()

    const reentrant = createFoldkitSnapshotClient({
      ...source.ports,
      snapshotFailures: {
        subscribe: (listener) => {
          const stop = source.ports.snapshotFailures.subscribe(listener)

          return () => {
            const [request] = source.requests

            if (request !== undefined) {
              listener({
                requestId: request.requestId,
                code: 'origin-requires-versioned-session',
              })
            }

            stop()
          }
        },
      },
    })

    const pending = reentrant.request()
    reentrant.dispose()
    await expect(pending).resolves.toMatchObject({ status: 'disposed' })
    expect([source.listeners.size, source.failures.size]).toStrictEqual([0, 0])
  })
})
