import { decodeFlowDocument, EdgeIdSchema, flowHistoryStatus } from '@flow/core'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  initialModel,
  update,
  wrapGraphMessage,
  AppMessage,
} from './application.ts'
import type { Model } from './application.ts'
import { defaultInteractionOptions, Message } from './graph.ts'
import type { GraphMessageData } from './graph.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'a',
        label: 'Source',
        position: { x: 80, y: 70 },
        size: { width: 120, height: 50 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'b',
        label: 'Target',
        position: { x: 480, y: 70 },
        size: { width: 120, height: 50 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
      {
        id: 'c',
        label: 'Other target',
        position: { x: 650, y: 300 },
        size: { width: 120, height: 50 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      {
        id: 'ab',
        source: 'a',
        target: 'b',
        sourceHandle: 'out',
        targetHandle: 'in',
        route: {
          mode: 'manual',
          points: [
            { x: 280, y: 180 },
            { x: 380, y: 180 },
          ],
        },
      },
    ],
  })
)

const edgeId = EdgeIdSchema.make('ab')

const initial = (editableEdges = true): Model =>
  initialModel(
    document,
    { x: 0, y: 0, zoom: 1 },
    ['b', 'c'],
    undefined,
    'full',
    {
      ...defaultInteractionOptions,
      editableEdges,
      connectionDragThreshold: 0,
    }
  )

const step = (model: Model, message: GraphMessageData) =>
  update(model, wrapGraphMessage({ message }))

const move = (x: number, y: number) =>
  Message.ConnectionPointerMoved({
    pointerId: 1,
    clientX: x,
    clientY: y,
    flowX: x,
    flowY: y,
    autoPanDelta: { x: 0, y: 0 },
  })

const press = () =>
  Message.PointerDown({
    pointerId: 1,
    clientX: 200,
    clientY: 95,
    nodeId: 'a',
    handleId: 'out',
    direction: null,
    edgeId: null,
    endpoint: null,
    freeform: true,
  })

const release = () =>
  Message.PointerReleased({
    pointerId: 1,
    clientX: 480,
    clientY: 95,
    targetNodeId: 'c',
    targetHandleId: 'in',
  })

describe('Foldkit editable edge accepted owner', () => {
  it('keeps point previews out of accepted documents and commits one undoable transaction', () => {
    const preview = step(
      initial(),
      Message.RoutePreview({
        preview: {
          edgeId,
          gestureId: 'drag',
          points: [
            { x: 300, y: 200 },
            { x: 380, y: 180 },
          ],
        },
      })
    ).model

    expect({
      document: preview.graph.document,
      history: flowHistoryStatus(preview.history).pastCount,
    }).toStrictEqual({ document, history: 0 })

    const committed = step(
      preview,
      Message.RouteCommand({
        edgeId,
        gestureId: 'drag',
        command: { kind: 'move', index: 0, point: { x: 300, y: 200 } },
      })
    ).model

    expect(committed.graph.document.edges[0]?.route).toStrictEqual({
      mode: 'manual',
      points: [
        { x: 300, y: 200 },
        { x: 380, y: 180 },
      ],
    })
    expect(committed.graph.routePreview).toBeNull()
    expect(flowHistoryStatus(committed.history).pastCount).toBe(1)

    const undone = update(
      committed,
      AppMessage.HistoryRequest({
        request: { requestId: 'undo', action: 'undo' },
      })
    ).model

    expect(undone.graph.document.edges[0]?.route).toStrictEqual(
      document.edges[0]?.route
    )
  })

  it('discards cancelled point previews and refuses their stale release', () => {
    const preview = step(
      initial(),
      Message.RoutePreview({
        preview: {
          edgeId,
          gestureId: 'drag',
          points: [
            { x: 300, y: 200 },
            { x: 380, y: 180 },
          ],
        },
      })
    ).model

    const cancelled = step(
      preview,
      Message.RoutePreview({ preview: null })
    ).model

    const stale = step(
      cancelled,
      Message.RouteCommand({
        edgeId,
        gestureId: 'drag',
        command: { kind: 'move', index: 0, point: { x: 300, y: 200 } },
      })
    ).model

    expect(stale.graph.document).toBe(document)
    expect(flowHistoryStatus(stale.history).pastCount).toBe(0)
  })

  it('retains routes when editing is disabled and changes the last removed point to automatic', () => {
    const ignored = step(
      initial(false),
      Message.RouteCommand({ edgeId, command: { kind: 'remove', index: 0 } })
    ).model

    expect(ignored.graph.document).toBe(document)

    const first = step(
      initial(),
      Message.RouteCommand({ edgeId, command: { kind: 'remove', index: 0 } })
    ).model

    const last = step(
      first,
      Message.RouteCommand({ edgeId, command: { kind: 'remove', index: 0 } })
    ).model

    expect(last.graph.document.edges[0]?.route).toStrictEqual({
      mode: 'automatic',
    })
    expect(flowHistoryStatus(last.history).pastCount).toBe(2)
  })

  it('stores sampled freeform points in the single native edge-add history entry', () => {
    const started = step(initial(), press()).model
    const moved = step(started, move(280, 180)).model
    const sampled = step(moved, move(380, 180)).model
    expect(sampled.graph.document.edges).toHaveLength(1)
    const committed = step(sampled, release()).model
    expect(committed.graph.document.edges.at(-1)?.route).toStrictEqual({
      mode: 'manual',
      points: [
        { x: 280, y: 180 },
        { x: 380, y: 180 },
      ],
    })
    expect(committed.graph.document.edges).toHaveLength(2)
    expect(flowHistoryStatus(committed.history).pastCount).toBe(1)

    const undone = update(
      committed,
      AppMessage.HistoryRequest({
        request: { requestId: 'undo-freeform', action: 'undo' },
      })
    ).model

    expect(undone.graph.document.edges.map(({ id }) => id)).toStrictEqual([
      'ab',
    ])
  })

  it('discards freeform samples on cancellation and ignores the late pointerup', () => {
    const started = step(initial(), press()).model
    const moved = step(started, move(280, 180)).model

    const cancelled = step(
      moved,
      Message.PointerCancelled({ pointerId: 1 })
    ).model

    const stale = step(cancelled, release()).model
    expect(stale.graph.document).toBe(document)
    expect(flowHistoryStatus(stale.history).pastCount).toBe(0)
  })
})
