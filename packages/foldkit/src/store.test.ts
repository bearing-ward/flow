import { Exit } from 'effect'
import { describe, expect, test } from 'vitest'

import type {
  MeasurementResultSchema,
  SnapshotRequest,
  SnapshotResponseSchema,
  ViewportEventSchema,
  ViewportResponseSchema,
} from './application.ts'
import { createFoldkitStore } from './store.ts'
import type { FoldkitFlowState, FoldkitStorePorts } from './store.ts'

type Response = typeof SnapshotResponseSchema.Encoded

type StateChange = Parameters<
  Parameters<FoldkitStorePorts['acceptedStates']['subscribe']>[0]
>[0]

type Document = StateChange['current']['document']

const viewport = { x: 0, y: 0, zoom: 1 }

const blue = { tone: 'blue' }

const document = (
  aData: Readonly<Record<string, string>>,
  bData: Readonly<Record<string, string>> = blue,
  x = 0
): Document => ({
  nodes: [
    { id: 'a', label: 'A', position: { x, y: 0 }, data: aData },
    { id: 'b', label: 'B', position: { x: 200, y: 0 }, data: bData },
  ],
  edges: [],
})

const initial = document({ tone: 'red' })

const respond = (request: SnapshotRequest): Response => ({
  requestId: request.requestId,
  snapshot: { document: initial, viewport },
  internalNode: null,
  nodesInitialized: false,
  nodesData: [],
  nodeConnections: [],
  handleConnections: [],
  connectionPreview: null,
  savedSession: { version: 1, document: { nodes: [], edges: [] }, viewport },
})

/** A list of listeners for one outbound port. */
const channel = <Value>() => {
  const listeners = new Set<(value: Value) => void>()

  return {
    listeners,
    port: {
      subscribe: (listener: (value: Value) => void) => {
        listeners.add(listener)

        return () => {
          listeners.delete(listener)
        }
      },
    },
    emit: (value: Value) => {
      for (const listener of listeners) {
        listener(value)
      }
    },
  }
}

const fakeRuntime = () => {
  const snapshots = channel<Response>()
  const accepted = channel<StateChange>()
  const viewportResults = channel<typeof ViewportResponseSchema.Encoded>()
  const viewportEvents = channel<typeof ViewportEventSchema.Encoded>()
  const measurements = channel<typeof MeasurementResultSchema.Encoded>()

  const snapshotRequestPort = {
    send: (request: SnapshotRequest) => {
      queueMicrotask(() => snapshots.emit(respond(request)))

      return Exit.void
    },
  }

  const ports: FoldkitStorePorts = {
    snapshots: snapshots.port,
    versionedSnapshots: snapshots.port,
    snapshotFailures: { subscribe: () => () => null },
    snapshotRequests: snapshotRequestPort,
    versionedSnapshotRequests: snapshotRequestPort,
    acceptedStates: accepted.port,
    viewportResults: viewportResults.port,
    viewportEvents: viewportEvents.port,
    measurementResults: measurements.port,
  }

  const accept = (next: Document, nextViewport = viewport) =>
    accepted.emit({
      previous: { document: initial, viewport },
      current: { document: next, viewport: nextViewport },
      cause: 'semantic-change',
    })

  return {
    ports,
    accept,
    viewportEvents,
    measurements,
    listenerCount: () =>
      snapshots.listeners.size +
      accepted.listeners.size +
      viewportResults.listeners.size +
      viewportEvents.listeners.size +
      measurements.listeners.size,
  }
}

describe('Foldkit store', () => {
  test('loads the first state from a snapshot and exposes the React transform', async () => {
    const runtime = fakeRuntime()
    const store = createFoldkitStore(runtime.ports)

    expect(store.getState().ready).toBeFalsy()

    const state = await store.ready

    expect({
      ready: state.ready,
      ids: state.nodes.map(({ id }) => id),
      transform: state.transform,
      nodesInitialized: state.nodesInitialized,
    }).toStrictEqual({
      ready: true,
      ids: ['a', 'b'],
      transform: [0, 0, 1],
      nodesInitialized: false,
    })
    runtime.measurements.emit({
      requestId: 'm',
      nodeId: 'a',
      status: 'measured',
      internalNode: null,
      nodesInitialized: true,
    })
    expect(store.getState().nodesInitialized).toBeTruthy()
    store.dispose()
    expect(runtime.listenerCount()).toBe(0)
  })

  test('a selector listener fires only when its selected value changes', async () => {
    const runtime = fakeRuntime()
    const store = createFoldkitStore(runtime.ports)
    await store.ready
    const zooms: number[] = []
    const counts: number[] = []

    store.select(
      (state: FoldkitFlowState) => state.viewport.zoom,
      (zoom) => zooms.push(zoom)
    )
    store.select(
      (state) => state.nodes.map(({ id }) => id),
      (selected) => counts.push(selected.length),
      (previous, next) => previous.join(',') === next.join(',')
    )
    runtime.accept(document({ tone: 'red' }, { tone: 'blue' }, 50))
    runtime.viewportEvents.emit({
      kind: 'change',
      source: 'user',
      viewport: { x: 10, y: 0, zoom: 1 },
    })
    runtime.viewportEvents.emit({
      kind: 'change',
      source: 'user',
      viewport: { x: 10, y: 0, zoom: 2 },
    })
    runtime.accept(
      { nodes: [], edges: [] },
      {
        x: 10,
        y: 0,
        zoom: 2,
      }
    )
    expect({ zooms, counts }).toStrictEqual({ zooms: [2], counts: [0] })
  })

  test('observes node data once known, then only on changes to the observed nodes', async () => {
    const runtime = fakeRuntime()
    const store = createFoldkitStore(runtime.ports)
    const seen: string[] = []

    const stop = store.observeNodesData(['a', 'missing'], (nodesData) =>
      seen.push(JSON.stringify(nodesData))
    )

    await store.ready
    runtime.accept(document({ tone: 'red' }, { tone: 'green' }, 40))
    runtime.accept(document({ tone: 'yellow' }, { tone: 'green' }, 40))
    stop()
    runtime.accept(document({ tone: 'pink' }))
    expect(seen).toStrictEqual([
      JSON.stringify([{ id: 'a', data: { tone: 'red' } }]),
      JSON.stringify([{ id: 'a', data: { tone: 'yellow' } }]),
    ])
  })

  test('emits node data at once when the state is already known', async () => {
    const store = createFoldkitStore(fakeRuntime().ports)
    await store.ready
    const seen: unknown[] = []

    store.observeNodesData(['b'], (nodesData) => seen.push(nodesData))
    expect(seen).toStrictEqual([
      [{ id: 'b', type: undefined, data: { tone: 'blue' } }],
    ])
  })
})
