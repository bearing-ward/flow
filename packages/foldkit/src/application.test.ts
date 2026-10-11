import {
  decodeFlowDocument,
  NodeOriginSchema,
  prepareFlowEdit,
  prepareFlowDeleteCandidate,
  finalizeFlowDeleteCandidate,
} from '@flow/core'
import { Effect, Predicate, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import {
  AppMessage,
  EditResponseSchema,
  initialModel,
  LegacySnapshotFailureSchema,
  update,
  SnapshotRequestSchema,
  VersionedSnapshotResponseSchema,
} from './application.ts'
import { DeleteResultSchema } from './delete-approval.ts'

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
          origin: Schema.decodeUnknownSync(NodeOriginSchema)([0, 0]),
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
      // This constructed model proves only the unit branch. Origins and native
      // metadata are live schema fields. No private Runtime state is used.
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

const mutateQueryData = (data: typeof Schema.JsonObject.Type | undefined) => {
  if (data === undefined || !('nested' in data) || !('list' in data)) {
    throw new Error('Missing query data')
  }

  const { nested, list } = data

  if (!Predicate.isObject(nested) || !Array.isArray(list)) {
    throw new TypeError('Invalid query data')
  }

  const previousLength = list.length
  Object.assign(nested, { value: 99 })
  list.push({ value: 100 })
  expect(nested).toStrictEqual({ value: 99 })
  expect(list).toHaveLength(previousLength + 1)
  expect(list.at(-1)).toStrictEqual({ value: 100 })
}

const ownershipDocument = (extended: boolean) => {
  const input = {
    nodes: [
      {
        id: 'node',
        label: 'Node',
        position: { x: 0, y: 0 },
        handles: [
          { id: 'out', kind: 'source', side: 'right' },
          { id: 'in', kind: 'target', side: 'left' },
        ],
        data: { nested: { value: 1 }, list: [{ value: 2 }] },
      },
    ],
    edges: [
      {
        id: 'edge',
        source: 'node',
        target: 'node',
        sourceHandle: 'out',
        targetHandle: 'in',
        data: { nested: { value: 1 }, list: [{ value: 2 }] },
      },
    ],
  }

  if (extended) {
    Object.assign(input, { nodeOrigin: [0, 0] })
  }

  return Effect.runSync(decodeFlowDocument(input))
}

const ownershipResponseData = (
  response: typeof VersionedSnapshotResponseSchema.Type
) => [
  response.snapshot.document.nodes[0]?.data,
  response.snapshot.document.edges[0]?.data,
  response.node?.data,
  response.internalNode?.node.data,
  response.edge?.data,
  response.nodesData[0]?.data,
  response.handleConnections[0]?.data,
  response.savedSession.document.nodes[0]?.data,
  response.savedSession.document.edges[0]?.data,
]

describe('snapshot/query output ownership (constructed model boundary)', () => {
  test.each([
    { extended: false, protocol: 'legacy' },
    { extended: false, protocol: 'versioned' },
    { extended: true, protocol: 'versioned' },
  ])(
    'detaches every data-bearing output ($protocol, extended=$extended)',
    ({ extended, protocol }) => {
      const model = initialModel(ownershipDocument(extended), {
        x: 5,
        y: -7,
        zoom: 1.5,
      })

      const before = structuredClone(model)

      const request = Schema.decodeUnknownSync(SnapshotRequestSchema)({
        requestId: 'isolation',
        nodeId: 'node',
        edgeId: 'edge',
        nodeIds: ['node'],
        connections: { nodeId: 'node' },
        handleConnections: { nodeId: 'node', type: 'source', id: 'out' },
      })

      const message =
        protocol === 'legacy'
          ? AppMessage.SnapshotRequest({ request })
          : AppMessage.VersionedSnapshotRequest({ request })

      const result = update(model, message)

      const response = Schema.decodeUnknownSync(
        VersionedSnapshotResponseSchema
      )(result.commands?.[0]?.args?.response)

      const fresh = structuredClone(response)

      for (const data of ownershipResponseData(response)) {
        mutateQueryData(data)
      }

      expect(result.model).toBe(model)
      expect(response.nodeConnections).toStrictEqual(fresh.nodeConnections)
      expect(response.handleConnections.map((edge) => edge.id)).toStrictEqual(
        fresh.handleConnections.map((edge) => edge.id)
      )
      expect(model).toStrictEqual(before)
      const reread = update(model, message)
      expect(
        Schema.decodeUnknownSync(VersionedSnapshotResponseSchema)(
          reread.commands?.[0]?.args?.response
        )
      ).toStrictEqual(fresh)
    }
  )
})

describe('edit and delete packet origin transport protocol units', () => {
  test.each([
    [0.5, 0.5],
    [-0.5, 1.5],
    [0, 0],
  ])('retains explicit origin [%s, %s] in genuine result packets', (x, y) => {
    const initial = Effect.runSync(
      decodeFlowDocument({
        nodeOrigin: [x, y],
        nodes: [
          { id: 'a', label: 'A', position: { x: 0, y: 0 } },
          { id: 'b', label: 'B', position: { x: 10, y: 10 } },
        ],
        edges: [{ id: 'ab', source: 'a', target: 'b' }],
      })
    )

    const before = structuredClone(initial)

    const editResult = Effect.runSync(
      prepareFlowEdit(initial, {
        operations: [
          {
            kind: 'update-node',
            nodeId: 'b',
            patch: { label: 'Edited', position: { x: 30, y: -10 } },
          },
        ],
      })
    )

    const editPacket = { requestId: 'origin-edit-request', result: editResult }
    const encodedEdit = Schema.encodeSync(EditResponseSchema)(editPacket)

    const decodedEdit =
      Schema.decodeUnknownSync(EditResponseSchema)(encodedEdit)

    expect({
      origin: editResult.document.nodeOrigin,
      edited: editResult.document.nodes[1],
    }).toMatchObject({
      origin: [x, y],
      edited: {
        label: 'Edited',
        position: { x: 30, y: -10 },
      },
    })
    expect([encodedEdit, decodedEdit]).toStrictEqual([editPacket, editPacket])

    const { candidate } = Effect.runSync(
      prepareFlowDeleteCandidate(initial, { nodeIds: ['b'] })
    )

    const deleteResult = Effect.runSync(
      finalizeFlowDeleteCandidate(
        initial,
        candidate,
        true,
        'origin-delete-operation'
      )
    )

    const deletePacket = {
      operationId: 'origin-delete-operation',
      result: deleteResult,
    }

    const encodedDelete = Schema.encodeSync(DeleteResultSchema)(deletePacket)

    const decodedDelete =
      Schema.decodeUnknownSync(DeleteResultSchema)(encodedDelete)

    expect(deleteResult.document.nodes.map(({ id }) => id)).toStrictEqual(['a'])
    expect([encodedDelete, decodedDelete]).toStrictEqual([
      deletePacket,
      deletePacket,
    ])
    expect(initial).toStrictEqual(before)
  })
})
