import { Exit } from 'effect'
import { describe, expect, test } from 'vitest'

import type {
  EditRequestSchema,
  EditResponse,
  SnapshotRequest,
  SnapshotResponseSchema,
} from './application.ts'
import { createFoldkitFlowInstance } from './instance.ts'
import type { FoldkitFlowInstancePorts } from './instance.ts'

type Response = typeof SnapshotResponseSchema.Encoded

type InternalNode = NonNullable<Response['internalNode']>

const node = (id: string, x: number, y: number) => ({
  id,
  label: id,
  position: { x, y },
})

const nodes = [
  {
    ...node('a', 0, 0),
    handles: [{ id: 'out', kind: 'source' as const, side: 'right' as const }],
  },
  {
    ...node('b', 100, 20),
    handles: [{ id: 'in', kind: 'target' as const, side: 'left' as const }],
  },
  node('c', 400, 400),
  { ...node('child', 10, 10), parentId: 'c' },
]

const edges = [
  {
    id: 'a-b',
    source: 'a',
    sourceHandle: 'out',
    target: 'b',
    targetHandle: 'in',
  },
]

const viewport = { x: 5, y: 6, zoom: 2 }

const internal = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): InternalNode => ({
  absolutePosition: { x, y },
  handles: [],
  height,
  measurementStatus: 'measured',
  node: nodes.find((candidate) => candidate.id === id) ?? node(id, x, y),
  width,
})

const internals = [
  internal('a', 0, 0, 150, 40),
  internal('b', 100, 20, 150, 40),
  internal('c', 400, 400, 200, 200),
  internal('child', 410, 410, 50, 20),
]

const respond = (request: SnapshotRequest): Response => {
  const response: Response = {
    requestId: request.requestId,
    snapshot: { document: { nodes, edges }, viewport },
    internalNode:
      internals.find((item) => item.node.id === request.nodeId) ?? null,
    nodesInitialized: true,
    nodesData: [],
    nodeConnections: [],
    handleConnections: [],
    connectionPreview: null,
    savedSession: { version: 1, document: { nodes, edges }, viewport },
  }

  const flowNode = nodes.find(({ id }) => id === request.nodeId)
  const flowEdge = edges.find(({ id }) => id === request.edgeId)

  return {
    ...response,
    node: flowNode,
    edge: flowEdge,
    internalNodes: request.internalNodes === true ? internals : undefined,
  }
}

const editResult = (requestId: string): EditResponse => ({
  requestId,
  result: {
    document: { nodes, edges },
    deletion: { deletedNodeIds: [], deletedEdgeIds: [] },
  },
})

/** In-memory Runtime ports that answer snapshot and edit requests in a microtask. */
const fakeRuntime = () => {
  const snapshotListeners = new Set<(response: Response) => void>()
  const editListeners = new Set<(response: EditResponse) => void>()
  const snapshotRequests: SnapshotRequest[] = []
  const edits: (typeof EditRequestSchema.Encoded)[] = []

  const snapshotPort = {
    subscribe: (listener: (response: Response) => void) => {
      snapshotListeners.add(listener)

      return () => {
        snapshotListeners.delete(listener)
      }
    },
  }

  const snapshotRequestPort = {
    send: (request: SnapshotRequest) => {
      snapshotRequests.push(request)
      queueMicrotask(() => {
        for (const listener of snapshotListeners) {
          listener(respond(request))
        }
      })

      return Exit.void
    },
  }

  const ports: FoldkitFlowInstancePorts = {
    snapshots: snapshotPort,
    versionedSnapshots: snapshotPort,
    snapshotFailures: { subscribe: () => () => null },
    snapshotRequests: snapshotRequestPort,
    versionedSnapshotRequests: snapshotRequestPort,
    editResults: {
      subscribe: (listener) => {
        editListeners.add(listener)

        return () => {
          editListeners.delete(listener)
        }
      },
    },
    editRequests: {
      send: (request) => {
        edits.push(request)
        queueMicrotask(() => {
          for (const listener of editListeners) {
            listener(editResult(request.requestId))
          }
        })

        return Exit.void
      },
    },
  }

  return { ports, edits, snapshotRequests, snapshotListeners, editListeners }
}

const ids = async (
  items: Promise<readonly { readonly id: string }[]>
): Promise<readonly string[]> => {
  const resolved = await items

  return resolved.map(({ id }) => id)
}

describe('Foldkit flow instance', () => {
  test('getNodes carries measured sizes, as React getNodes', async () => {
    const instance = createFoldkitFlowInstance(fakeRuntime().ports)
    const read = await instance.getNodes()

    expect(read.find(({ id }) => id === 'a')?.measured).toStrictEqual({
      width: 150,
      height: 40,
    })
  })

  test('reads nodes, edges and nodes by id through the snapshot port', async () => {
    const instance = createFoldkitFlowInstance(fakeRuntime().ports)

    await expect(ids(instance.getNodes())).resolves.toStrictEqual([
      'a',
      'b',
      'c',
      'child',
    ])
    await expect(ids(instance.getEdges())).resolves.toStrictEqual(['a-b'])
    await expect(instance.getNode('b')).resolves.toMatchObject({ id: 'b' })
    await expect(instance.getNode('missing')).resolves.toBeUndefined()
    await expect(instance.getEdge('a-b')).resolves.toMatchObject({
      source: 'a',
    })
  })

  test('reads internal nodes and the viewport, and stops listening on dispose', async () => {
    const runtime = fakeRuntime()
    const instance = createFoldkitFlowInstance(runtime.ports)

    await expect(instance.getInternalNode('child')).resolves.toMatchObject({
      absolutePosition: { x: 410, y: 410 },
    })
    await expect(instance.getInternalNodes()).resolves.toHaveLength(4)
    await expect(instance.getViewport()).resolves.toStrictEqual(viewport)
    await expect(instance.getZoom()).resolves.toBe(2)
    instance.dispose()
    expect([
      runtime.snapshotListeners.size,
      runtime.editListeners.size,
      runtime.snapshotRequests.filter(({ internalNodes }) => internalNodes)
        .length,
    ]).toStrictEqual([0, 0, 1])
  })

  test('finds intersecting nodes by id, node or rectangle over the internal nodes', async () => {
    const instance = createFoldkitFlowInstance(fakeRuntime().ports)

    await expect(
      ids(instance.getIntersectingNodes('a'))
    ).resolves.toStrictEqual(['b'])
    await expect(
      ids(instance.getIntersectingNodes({ id: 'c' }, false))
    ).resolves.toStrictEqual(['child'])
    await expect(
      ids(
        instance.getIntersectingNodes({
          x: 390,
          y: 390,
          width: 100,
          height: 100,
        })
      )
    ).resolves.toStrictEqual(['c', 'child'])
    await expect(
      instance.getIntersectingNodes('missing')
    ).resolves.toStrictEqual([])
  })

  test('checks one intersection, bounds, toObject and edge geometry', async () => {
    const instance = createFoldkitFlowInstance(fakeRuntime().ports)

    const area = { x: 140, y: 0, width: 100, height: 100 }

    await expect(
      Promise.all([
        instance.isNodeIntersecting('a', area),
        instance.isNodeIntersecting('a', area, false),
      ])
    ).resolves.toStrictEqual([true, false])
    await expect(
      instance.getNodesBounds(['a', 'child'])
    ).resolves.toStrictEqual({ x: 0, y: 0, width: 460, height: 430 })
    await expect(instance.toObject()).resolves.toStrictEqual({
      nodes,
      edges,
      viewport,
    })
    await expect(ids(instance.getEdgesGeometry())).resolves.toStrictEqual([
      'a-b',
    ])
  })

  test('maps the React edit methods to one typed edit transaction each', async () => {
    const runtime = fakeRuntime()
    const instance = createFoldkitFlowInstance(runtime.ports)

    await instance.setNodes((current) => current.filter(({ id }) => id !== 'c'))
    await instance.setEdges([])
    await instance.addNodes(node('d', 1, 2))
    await instance.addEdges([{ id: 'b-a', source: 'b', target: 'a' }])
    await instance.updateNode('a', { position: { x: 9, y: 9 } })
    await instance.updateNodeData('a', (current) => ({ label: current.label }))
    await instance.updateNodeData('b', { tone: 'red' }, { replace: true })
    await instance.updateEdge('a-b', { animated: true })
    await instance.updateEdgeData('a-b', { weight: 2 })
    await instance.deleteElements({ nodes: [{ id: 'b' }] })
    expect(
      runtime.edits.map(({ transaction }) => transaction.operations)
    ).toStrictEqual([
      [{ kind: 'set-nodes', nodes: [nodes[0], nodes[1], nodes[3]] }],
      [{ kind: 'set-edges', edges: [] }],
      [{ kind: 'add-nodes', nodes: [node('d', 1, 2)] }],
      [{ kind: 'add-edges', edges: [{ id: 'b-a', source: 'b', target: 'a' }] }],
      [
        {
          kind: 'update-node',
          nodeId: 'a',
          patch: { position: { x: 9, y: 9 } },
          replace: false,
        },
      ],
      [
        {
          kind: 'update-node-data',
          nodeId: 'a',
          data: { label: 'a' },
          replace: false,
        },
      ],
      [
        {
          kind: 'update-node-data',
          nodeId: 'b',
          data: { tone: 'red' },
          replace: true,
        },
      ],
      [
        {
          kind: 'update-edge',
          edgeId: 'a-b',
          patch: { animated: true },
          replace: false,
        },
      ],
      [
        {
          kind: 'update-edge-data',
          edgeId: 'a-b',
          data: { weight: 2 },
          replace: false,
        },
      ],
      [{ kind: 'delete-elements', nodeIds: ['b'], edgeIds: [] }],
    ])
  })

  test('settles edits as disposed after dispose and rejects viewport calls without a client', async () => {
    const runtime = fakeRuntime()
    const instance = createFoldkitFlowInstance(runtime.ports)

    instance.dispose()
    instance.dispose()
    await expect(instance.addNodes(node('z', 0, 0))).resolves.toHaveProperty(
      'error'
    )
    expect(runtime.edits).toHaveLength(0)
    expect(() => instance.fitView()).toThrow(/viewport client/u)
    await expect(instance.getNodes()).rejects.toThrow(/disposed/u)
  })
})
