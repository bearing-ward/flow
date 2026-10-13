import { Effect, Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  applyEdgeChanges,
  applyNodeChanges,
} from './flow-change-compatibility.ts'
import { ConnectionPreviewStateSchema } from './flow-connection-preview.schema.ts'
import {
  flowConnectionState,
  flowFinalConnectionState,
  flowNoConnection,
} from './flow-connection-state.ts'
import {
  connectionFromHandleGesture,
  handleGestureConnectable,
} from './flow-connection.schema.ts'
import {
  applyFlowElementChanges,
  flowChangeElementChanges,
  flowElementChanges,
} from './flow-element-changes.ts'
import {
  flowInteractivityFor,
  isEdgeSelectable,
  isFlowInteractive,
  isHandleConnectable,
  isNodeDraggable,
  isNodeSelectable,
  resolveFlowInteractivity,
} from './flow-interactivity.ts'
import { FlowChangeSchema } from './flow-runtime.schema.ts'
import { HandleIdSchema, NodeIdSchema } from './flow-values.ts'
import { decodeFlowDocument } from './flow.schema.ts'
import type { FlowDocument, FlowDocumentInput } from './flow.schema.ts'

const decode = (input: FlowDocumentInput): FlowDocument =>
  Effect.runSync(decodeFlowDocument(input))

const base = decode({
  nodes: [
    {
      id: 'a',
      label: 'A',
      position: { x: 0, y: 0 },
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    },
    {
      id: 'b',
      label: 'B',
      position: { x: 200, y: 0 },
      handles: [
        { id: 'in', kind: 'target', side: 'left' },
        { id: 'closed', kind: 'target', side: 'top', connectableEnd: false },
      ],
    },
    { id: 'c', label: 'C', position: { x: 400, y: 0 }, selected: true },
  ],
  edges: [{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'out' }],
})

const decodeChange = S.decodeUnknownSync(FlowChangeSchema)

const decodePreview = S.decodeUnknownSync(ConnectionPreviewStateSchema)

const roundTrip = (previous: FlowDocument, current: FlowDocument) => {
  const changes = flowElementChanges(previous, current)

  expect(applyNodeChanges(changes.nodes, previous.nodes)).toStrictEqual(
    current.nodes.map((node) => ({ ...node }))
  )
  expect(applyEdgeChanges(changes.edges, previous.edges)).toStrictEqual(
    current.edges.map((edge) => ({ ...edge }))
  )

  return changes
}

describe('Flow element changes', () => {
  it('emits position and select deltas that round-trip', () => {
    const current = decode({
      ...base,
      nodes: base.nodes.map((node) =>
        node.id === 'a'
          ? { ...node, position: { x: 5, y: 6 }, selected: true }
          : node
      ),
    })

    expect(roundTrip(base, current).nodes).toStrictEqual([
      { id: 'a', type: 'position', position: { x: 5, y: 6 } },
      { id: 'a', type: 'select', selected: true },
    ])
  })

  it('emits add, remove and replace deltas in document order', () => {
    const current = decode({
      nodes: [
        { ...base.nodes[0], label: 'Renamed' },
        base.nodes[1],
        { id: 'd', label: 'D', position: { x: 1, y: 1 } },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', sourceHandle: 'out', label: 'x' },
        { id: 'e2', source: 'b', target: 'a', selected: true },
      ],
    })

    const changes = roundTrip(base, current)

    expect(changes.nodes.map((change) => change.type)).toStrictEqual([
      'remove',
      'replace',
      'add',
    ])
    expect(changes.edges.map((change) => change.type)).toStrictEqual([
      'replace',
      'add',
    ])
  })

  it('treats field order as no change and a cleared flag as replace', () => {
    const [first] = base.nodes

    const reordered = decode({
      ...base,
      nodes: [
        { position: first?.position, label: first?.label, ...first },
        ...base.nodes.slice(1),
      ],
    })

    expect(flowElementChanges(base, reordered).nodes).toStrictEqual([])

    const cleared = decode({
      ...base,
      nodes: base.nodes.map(({ selected: _selected, ...node }) => node),
    })

    expect(
      roundTrip(base, cleared).nodes.map((change) => change.type)
    ).toStrictEqual(['replace'])
  })

  it('applies deltas to a whole document', () => {
    const current = decode({
      ...base,
      nodes: base.nodes.map((node) => ({ ...node, selected: true })),
    })

    expect(
      applyFlowElementChanges(base, flowElementChanges(base, current))
    ).toStrictEqual({ ...current, nodes: current.nodes.map((n) => ({ ...n })) })
  })

  it('falls back to remove and add when kept elements are reordered', () => {
    const current = decode({ ...base, nodes: base.nodes.toReversed() })

    expect(roundTrip(base, current).nodes).toHaveLength(6)
  })

  it('derives deltas from a semantic change before a controlled host accepts it', () => {
    expect(
      flowChangeElementChanges(
        base,
        decodeChange({
          kind: 'node-position',
          nodeId: 'b',
          position: { x: 9, y: 9 },
        })
      ).nodes
    ).toStrictEqual([{ id: 'b', type: 'position', position: { x: 9, y: 9 } }])

    expect(
      flowChangeElementChanges(base, {
        kind: 'viewport',
        viewport: { x: 0, y: 0, zoom: 1 },
      })
    ).toStrictEqual({ nodes: [], edges: [] })

    expect(
      flowChangeElementChanges(
        base,
        decodeChange({ kind: 'edge-remove', edgeId: 'e1' })
      ).edges
    ).toStrictEqual([{ id: 'e1', type: 'remove' }])
  })
})

describe('Flow interactivity', () => {
  const locked = flowInteractivityFor(false)

  it('reports whether any canvas switch is on', () => {
    expect(isFlowInteractive(locked)).toBeFalsy()
    expect(isFlowInteractive(resolveFlowInteractivity())).toBeTruthy()
    expect(
      isFlowInteractive(resolveFlowInteractivity({ nodesDraggable: false }))
    ).toBeTruthy()
  })

  it('lets element flags win over canvas switches', () => {
    expect([
      isNodeDraggable(locked, {}),
      isNodeDraggable(locked, { draggable: true }),
      isNodeDraggable(undefined, { draggable: false }),
      isNodeSelectable(locked, {}),
      isEdgeSelectable({ elementsSelectable: true }, {}),
    ]).toStrictEqual([false, true, false, false, true])
  })

  it('resolves handle start and end connectability', () => {
    const node = {}

    expect([
      isHandleConnectable(undefined, node, {}, 'start'),
      isHandleConnectable({ nodesConnectable: false }, node, {}, 'start'),
      isHandleConnectable(undefined, { connectable: false }, {}, 'end'),
      isHandleConnectable(
        undefined,
        { connectable: false },
        { connectable: true },
        'end'
      ),
      isHandleConnectable(
        undefined,
        node,
        { connectableStart: false },
        'start'
      ),
      isHandleConnectable(undefined, node, { connectableStart: false }, 'end'),
    ]).toStrictEqual([true, false, false, true, false, true])
  })

  it('rejects gestures that end on a non-connectable handle', () => {
    const gesture = {
      fromNodeId: 'a',
      fromHandleId: 'out',
      toNodeId: 'b',
      toHandleId: 'closed',
    }

    expect(handleGestureConnectable(base, gesture)).toBeFalsy()
    expect(
      handleGestureConnectable(base, { ...gesture, toHandleId: 'in' })
    ).toBeTruthy()

    const exit = Effect.runSyncExit(
      connectionFromHandleGesture({
        document: base,
        fromNodeId: S.decodeSync(NodeIdSchema)('a'),
        fromHandleId: S.decodeSync(HandleIdSchema)('out'),
        toNodeId: S.decodeSync(NodeIdSchema)('b'),
        toHandleId: S.decodeSync(HandleIdSchema)('closed'),
      })
    )

    expect(Exit.isFailure(exit)).toBeTruthy()
    expect(JSON.stringify(exit)).toContain('handle-not-connectable')
  })
})

describe('Flow connection state', () => {
  it('maps a preview to React Flow connection state fields', () => {
    const state = flowConnectionState({
      document: base,
      origin: { nodeId: 'a', handleId: 'out' },
      preview: decodePreview({
        kind: 'connect',
        from: { x: 1, y: 2 },
        to: { x: 3, y: 4 },
        candidate: {
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
        },
        valid: true,
      }),
    })

    expect(state).toMatchObject({
      inProgress: true,
      isValid: true,
      fromHandle: { id: 'out', nodeId: 'a', type: 'source', position: 'right' },
      fromNode: { id: 'a' },
      toHandle: { id: 'in', nodeId: 'b', type: 'target', position: 'left' },
      toNode: { id: 'b' },
      toPosition: 'left',
      pointer: { x: 3, y: 4 },
    })
    expect(flowFinalConnectionState(state)).not.toHaveProperty('inProgress')
    expect(
      flowConnectionState({ document: base, preview: null })
    ).toStrictEqual(flowNoConnection)
  })

  it('reports a pane drop with no target handle and a null final position', () => {
    const state = flowConnectionState({
      document: base,
      origin: { nodeId: 'a', handleId: 'out' },
      preview: decodePreview({
        kind: 'connect',
        from: { x: 1, y: 2 },
        to: { x: 30, y: 40 },
        candidate: null,
        valid: null,
      }),
    })

    expect(state).toMatchObject({
      toHandle: null,
      toNode: null,
      toPosition: 'left',
    })
    expect(flowFinalConnectionState(state)).toMatchObject({
      toPosition: null,
      fromNode: { id: 'a' },
      to: { x: 30, y: 40 },
    })
  })

  it('derives a reconnect origin from the fixed edge end', () => {
    const state = flowConnectionState({
      document: decode({
        ...base,
        edges: [
          {
            id: 'e1',
            source: 'a',
            target: 'b',
            sourceHandle: 'out',
            targetHandle: 'in',
          },
        ],
      }),
      preview: decodePreview({
        kind: 'reconnect',
        edgeId: 'e1',
        endpoint: 'target',
        from: { x: 1, y: 2 },
        to: { x: 3, y: 4 },
        candidate: null,
        valid: null,
      }),
    })

    expect(state.fromHandle).toMatchObject({ id: 'out', nodeId: 'a' })
  })
})
