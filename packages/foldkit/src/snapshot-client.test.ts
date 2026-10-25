import { Exit } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  LegacySnapshotFailure,
  SnapshotRequest,
  SnapshotResponseSchema,
  VersionedSnapshotResponseSchema,
} from './application.ts'
import { createFoldkitSnapshotClient } from './snapshot-client.ts'
import type {
  FoldkitSnapshotClient,
  FoldkitSnapshotResult,
  FoldkitVersionedSnapshotClient,
  FoldkitVersionedSnapshotResult,
} from './snapshot-client.ts'

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
  it('correlates only the owning request and survives unmatched and duplicate replies', async () => {
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

  it('disposes pending requests once, rejects new reads, and ignores a retained late callback', async () => {
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

  it('settles invalid, rejected and throwing sends without leaking pending requests', async () => {
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

  it('handles a synchronous response or disposal during send without double settlement', async () => {
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

  it.each([
    'origin-requires-versioned-session',
    'native-fields-require-versioned-session',
    'noncanonical-handles-require-versioned-session',
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

  it('handles synchronous format failure during send and a failure delivered by unsubscribe', async () => {
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

const versionedResponse = (
  requestId: string
): typeof VersionedSnapshotResponseSchema.Encoded => ({
  ...response(requestId),
  snapshot: {
    document: { nodes: [], edges: [], nodeOrigin: [0, 0] },
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  savedSession: {
    version: 2,
    document: { nodes: [], edges: [], nodeOrigin: [0, 0] },
    viewport: { x: 0, y: 0, zoom: 1 },
  },
})

const versionedHost = () => {
  const legacy = host()

  const listeners = new Set<
    (value: typeof VersionedSnapshotResponseSchema.Encoded) => void
  >()

  const requests: SnapshotRequest[] = []
  const stopCounts = { legacy: 0, failure: 0, versioned: 0 }

  const ports = {
    ...legacy.ports,
    snapshots: {
      subscribe: (
        listener: (value: typeof SnapshotResponseSchema.Encoded) => void
      ) => {
        const stop = legacy.ports.snapshots.subscribe(listener)

        return () => {
          stopCounts.legacy += 1
          stop()
        }
      },
    },
    snapshotFailures: {
      subscribe: (listener: (value: LegacySnapshotFailure) => void) => {
        const stop = legacy.ports.snapshotFailures.subscribe(listener)

        return () => {
          stopCounts.failure += 1
          stop()
        }
      },
    },
    versionedSnapshots: {
      subscribe: (
        listener: (
          value: typeof VersionedSnapshotResponseSchema.Encoded
        ) => void
      ) => {
        listeners.add(listener)

        return () => {
          stopCounts.versioned += 1
          listeners.delete(listener)
        }
      },
    },
    versionedSnapshotRequests: {
      send: (request: SnapshotRequest) => {
        requests.push(request)

        return Exit.void
      },
    },
  }

  return {
    legacy,
    ports,
    requests,
    listeners,
    stopCounts,
    emit: (value: typeof VersionedSnapshotResponseSchema.Encoded) => {
      for (const listener of new Set(listeners)) {
        listener(value)
      }
    },
  }
}

describe('one-owner legacy and versioned snapshot protocols', () => {
  it('preserves overloads and one sequence across legacy failure then versioned success', async () => {
    const source = versionedHost()
    const client = createFoldkitSnapshotClient(source.ports)
    expectTypeOf(client).toEqualTypeOf<FoldkitVersionedSnapshotClient>()
    expectTypeOf(client.request).returns.toEqualTypeOf<
      Promise<FoldkitSnapshotResult>
    >()
    expectTypeOf(client.requestVersioned).returns.toEqualTypeOf<
      Promise<FoldkitVersionedSnapshotResult>
    >()
    const legacyOnly = createFoldkitSnapshotClient(source.legacy.ports)
    expectTypeOf(legacyOnly).toEqualTypeOf<FoldkitSnapshotClient>()
    legacyOnly.dispose()
    const first = client.request()
    const [legacyRequest] = source.legacy.requests

    if (legacyRequest === undefined) {
      throw new Error('Missing legacy request')
    }

    source.legacy.fail({
      requestId: legacyRequest.requestId,
      code: 'noncanonical-handles-require-versioned-session',
    })
    await expect(first).resolves.toMatchObject({
      status: 'failed',
      reason: 'noncanonical-handles-require-versioned-session',
    })
    const second = client.requestVersioned()
    const [versionedRequest] = source.requests

    if (versionedRequest === undefined) {
      throw new Error('Missing versioned request')
    }

    expect([
      legacyRequest.requestId.slice(0, -1),
      versionedRequest.requestId.slice(0, -1),
    ]).toStrictEqual([
      legacyRequest.requestId.slice(0, -1),
      legacyRequest.requestId.slice(0, -1),
    ])
    source.emit(versionedResponse(versionedRequest.requestId))
    await expect(second).resolves.toMatchObject({
      status: 'succeeded',
      response: { savedSession: { version: 2 } },
    })
    client.dispose()
  })

  it('ignores wrong protocol channels before decoding and settles only the matching channel', async () => {
    const source = versionedHost()
    const client = createFoldkitSnapshotClient(source.ports)
    let settled = 0

    const pending = client.requestVersioned().then((value) => {
      settled += 1

      return value
    })

    const [request] = source.requests

    if (request === undefined) {
      throw new Error('Missing versioned request')
    }

    source.legacy.emit({
      ...response(request.requestId),
      get nodesInitialized(): never {
        throw new Error('Wrong-channel response decoded')
      },
    })
    source.legacy.fail({
      requestId: request.requestId,
      get code(): never {
        throw new Error('Wrong-channel failure decoded')
      },
    })
    source.emit(versionedResponse('foreign'))
    await Promise.resolve()
    expect(settled).toBe(0)
    source.emit(versionedResponse(request.requestId))
    source.emit(versionedResponse(request.requestId))
    await expect(pending).resolves.toMatchObject({
      status: 'succeeded',
      response: { savedSession: { version: 2 } },
    })
    const legacyPending = client.request()
    const [legacyRequest] = source.legacy.requests

    if (legacyRequest === undefined) {
      throw new Error('Missing legacy request')
    }

    source.emit({
      ...versionedResponse(legacyRequest.requestId),
      get nodesInitialized(): never {
        throw new Error('Wrong-channel versioned response decoded')
      },
    })
    source.legacy.emit(response(legacyRequest.requestId))
    await expect(legacyPending).resolves.toMatchObject({
      status: 'succeeded',
      response: { savedSession: { version: 1 } },
    })
    expect(settled).toBe(1)
    client.dispose()
  })

  it('disposes both protocol requests once, unsubscribes every channel once and ignores late callbacks', async () => {
    const source = versionedHost()
    const client = createFoldkitSnapshotClient(source.ports)
    const legacy = client.request()
    const versioned = client.requestVersioned()
    const [late] = source.listeners
    const [request] = source.requests
    client.dispose()
    client.dispose()
    expect([
      await legacy,
      await versioned,
      await client.requestVersioned(),
    ]).toMatchObject([
      { status: 'disposed' },
      { status: 'disposed' },
      { status: 'disposed' },
    ])

    if (request === undefined) {
      throw new Error('Missing request')
    }

    late?.(versionedResponse(request.requestId))
    expect([
      source.legacy.listeners.size,
      source.legacy.failures.size,
      source.listeners.size,
    ]).toStrictEqual([0, 0, 0])
    expect(source.stopCounts).toStrictEqual({
      legacy: 1,
      failure: 1,
      versioned: 1,
    })
  })

  it('settles versioned send failures and malformed queries without adding a failure reason', async () => {
    const source = versionedHost()

    const rejected = createFoldkitSnapshotClient({
      ...source.ports,
      versionedSnapshotRequests: { send: () => false },
    })

    await expect(rejected.requestVersioned()).resolves.toMatchObject({
      status: 'failed',
      reason: 'send-failed',
    })
    const invalidQuery = { nodeIds: 12 }
    // @ts-expect-error Foreign query primitives remain invalid at the public boundary.
    const invalidRequest = rejected.requestVersioned(invalidQuery)
    await expect(invalidRequest).resolves.toMatchObject({
      status: 'failed',
      reason: 'invalid-request',
    })

    const throwing = createFoldkitSnapshotClient({
      ...source.ports,
      versionedSnapshotRequests: {
        send: () => {
          throw new Error('closed')
        },
      },
    })

    await expect(throwing.requestVersioned()).resolves.toMatchObject({
      status: 'failed',
      reason: 'send-failed',
    })
    rejected.dispose()
    throwing.dispose()
    expect(source.listeners.size).toBe(0)
  })
})
