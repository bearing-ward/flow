import {
  decodeFlowDocument,
  NodeIdSchema,
  HandleIdSchema,
  EdgeIdSchema,
} from '@flow/core'
import { Effect } from 'effect'
import { beforeAll, afterAll, vi, describe, expect, it } from 'vitest'

import { AppMessage, initialModel, update } from './application.ts'
import { Message, defaultInteractionOptions } from './graph.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'source',
        label: 'Source',
        position: { x: 0, y: 0 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'target',
        label: 'Target',
        position: { x: 200, y: 0 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      {
        id: 'edge',
        source: 'source',
        sourceHandle: 'out',
        target: 'target',
        targetHandle: 'in',
        selected: true,
      },
    ],
  })
)

const initial = (threshold?: number) =>
  initialModel(document, { x: 0, y: 0, zoom: 1 }, [], undefined, 'full', {
    ...defaultInteractionOptions,
    connectionDragThreshold: threshold,
  })

const down = (reconnect = false) =>
  Message.PointerDown({
    pointerId: 1,
    clientX: 10,
    clientY: 20,
    nodeId: reconnect ? null : 'source',
    handleId: reconnect ? null : 'out',
    edgeId: reconnect ? EdgeIdSchema.make('edge') : null,
    endpoint: reconnect ? 'target' : null,
    direction: null,
  })

const move = (x: number, y: number, pointerId = 1) =>
  Message.ConnectionPointerMoved({
    pointerId,
    clientX: x,
    clientY: y,
    flowX: 90,
    flowY: 80,
    autoPanDelta: { x: 0, y: 0 },
  })

const step = (
  model: ReturnType<typeof initial>,
  message: typeof Message.Type
) => update(model, AppMessage.GraphMessage({ message }))

const events = (result: ReturnType<typeof step>) =>
  result.commands
    ?.filter(({ name }) => name === 'PublishFoldkitInteractionEvents')
    .flatMap(({ args }) => args?.events ?? []) ?? []

const assertPromoted = (
  result: ReturnType<typeof step>,
  reconnect: boolean
) => {
  expect(result.model.graph.pointerSession).toMatchObject({
    kind: reconnect ? 'reconnection' : 'connection',
    currentX: 90,
    currentY: 80,
  })
  expect(
    result.commands?.some(({ name }) => name === 'PublishFlowChanges')
  ).toBeTruthy()
}

describe('connectionDragThreshold application transitions, constructed models', () => {
  beforeAll(() => {
    vi.stubGlobal('document', { querySelector: () => null })
    vi.stubGlobal('CSS', { escape: (value: string) => value })
  })

  afterAll(() => vi.unstubAllGlobals())

  it.each([false, true])(
    'keeps pending silent and promotes on the same strict crossing, reconnect=%s',
    (reconnect) => {
      const start = step(initial(8), down(reconnect))
      expect({
        kind: start.model.graph.pointerSession?.kind,
        events: events(start),
      }).toStrictEqual({
        kind: reconnect ? 'reconnection-pending' : 'connection-pending',
        events: [{ name: 'onInit', phase: 'event', inputKind: 'runtime' }],
      })
      const wrong = step(start.model, move(30, 40, 2))
      expect({
        unchanged: wrong.model.graph === start.model.graph,
        events: events(wrong),
      }).toStrictEqual({ unchanged: true, events: [] })
      const equal = step(start.model, move(10, 28))
      expect({
        unchanged: equal.model.graph === start.model.graph,
        events: events(equal),
      }).toStrictEqual({ unchanged: true, events: [] })
      const crossing = step(equal.model, move(16, 28))
      assertPromoted(crossing, reconnect)
      expect(events(crossing)).toStrictEqual([
        {
          name: reconnect ? 'onReconnectStart' : 'onConnectStart',
          phase: 'start',
          inputKind: 'pointer',
          ...(reconnect ? { edgeId: 'edge' } : { nodeId: 'source' }),
        },
        {
          name: reconnect ? 'onReconnectPreview' : 'onConnectionPreview',
          phase: 'progress',
          inputKind: 'pointer',
          ...(reconnect ? { edgeId: 'edge' } : { nodeId: 'source' }),
          x: 90,
          y: 80,
        },
      ])
      expect(events(step(crossing.model, move(30, 40)))).toHaveLength(1)
    }
  )

  it.each([false, true])(
    'zero starts immediately and default one waits, reconnect=%s',
    (reconnect) => {
      expect(
        step(initial(), down(reconnect)).model.graph.pointerSession?.kind
      ).toBe(reconnect ? 'reconnection-pending' : 'connection-pending')
      expect(
        step(initial(0), down(reconnect)).model.graph.pointerSession?.kind
      ).toBe(reconnect ? 'reconnection' : 'connection')
    }
  )

  it('release coordinates never promote, cancellation and replacement remain silent', () => {
    const pending = step(initial(8), down()).model

    for (const message of [
      Message.PointerReleased({
        pointerId: 1,
        clientX: 200,
        clientY: 200,
        targetNodeId: 'target',
        targetHandleId: 'in',
      }),
      Message.PointerCancelled({ pointerId: 1 }),
      Message.CancelGesture({}),
      Message.ReplaceDocument({ document: { nodes: [], edges: [] } }),
    ]) {
      const result = step(pending, message)
      expect(result.model.graph.pointerSession).toBeNull()
      expect(events(result)).toStrictEqual([])
      expect(events(step(result.model, move(40, 40)))).toStrictEqual([])
    }
  })

  it('pending moves preserve a click source without publishing progress; promotion ends click then starts pointer', () => {
    const nodeId = NodeIdSchema.make('source')
    const handleId = HandleIdSchema.make('out')

    const click = step(
      initial(8),
      Message.ClickHandle({
        nodeId,
        handleId,
      })
    ).model

    const pending = step(click, down())
    expect(events(pending)).toStrictEqual([])
    expect(events(step(pending.model, move(10, 28)))).toStrictEqual([])
    const crossing = step(pending.model, move(20, 20))
    expect(events(crossing).map((event) => event)).toStrictEqual([
      {
        name: 'onConnectEnd',
        phase: 'end',
        inputKind: 'click',
        outcome: 'cancelled',
        reason: 'superseded',
        nodeId: 'source',
      },
      {
        name: 'onConnectStart',
        phase: 'start',
        inputKind: 'pointer',
        nodeId: 'source',
      },
      {
        name: 'onConnectionPreview',
        phase: 'progress',
        inputKind: 'pointer',
        nodeId: 'source',
        x: 90,
        y: 80,
      },
    ])
  })

  it.each([-1, null, '8', Number.NaN, Infinity])(
    'rejects invalid constructor input %s',
    (value) => {
      const options = { ...defaultInteractionOptions }
      Reflect.set(options, 'connectionDragThreshold', value)
      expect(() =>
        initialModel(
          document,
          { x: 0, y: 0, zoom: 1 },
          [],
          undefined,
          'full',
          options
        )
      ).toThrow(/Expected/u)
    }
  )
})
