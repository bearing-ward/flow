import {
  decodeFlowDocument,
  NodeIdSchema,
  HandleIdSchema,
  EdgeIdSchema,
} from '@flow/core'
import { Effect } from 'effect'
import {
  beforeEach,
  afterAll,
  afterEach,
  vi,
  describe,
  expect,
  it,
} from 'vitest'

import { wrapGraphMessage, initialModel, update } from './application.ts'
import { Message, defaultInteractionOptions } from './graph.ts'
import { setupPointer, pointerEvent } from './node-threshold-fixture.ts'

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
    nodesResizable: true,
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
) => update(model, wrapGraphMessage({ message }))

const events = (result: ReturnType<typeof step>) =>
  result.outMessage?.flatMap((item) =>
    item.kind === 'interaction' ? item.events : []
  ) ?? []

const assertPromoted = (
  result: ReturnType<typeof step>,
  reconnect: boolean
) => {
  expect(result.model.graph.pointerSession).toMatchObject({
    kind: reconnect ? 'reconnection' : 'connection',
    currentX: 90,
    currentY: 80,
  })
  expect(result.outMessage?.some((item) => item.kind === 'change')).toBeTruthy()
}

describe('connectionDragThreshold application transitions, constructed models', () => {
  beforeEach(() => {
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
      // Replacing the document may change the selection; that is not a gesture.
      expect(
        events(result).filter(({ name }) => name !== 'onSelectionChange')
      ).toStrictEqual([])
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

  it.each([
    { threshold: undefined, controlled: false, allowed: true },
    { threshold: undefined, controlled: true, allowed: true },
    { threshold: 8, controlled: false, allowed: true },
    { threshold: 8, controlled: true, allowed: true },
    { threshold: undefined, controlled: false, allowed: false },
    { threshold: undefined, controlled: true, allowed: false },
    { threshold: 8, controlled: false, allowed: false },
    { threshold: 8, controlled: true, allowed: false },
  ])(
    'round3 keyboard receipt uses allowed-target validation and publication, threshold=$threshold controlled=$controlled allowed=$allowed',
    ({ threshold, controlled, allowed }) => {
      const base = initial(threshold)

      const model: ReturnType<typeof initial> = {
        ...base,
        graph: {
          ...base.graph,
          connectOnClick: false,
          connectionMode: 'loose',
          documentMode: controlled ? 'controlled' : 'uncontrolled',
          allowedConnectionTargets: allowed ? ['target'] : [],
          document: { ...base.graph.document, edges: [] },
        },
      }

      const keyboard = step(
        model,
        Message.ActivateHandle({
          nodeId: NodeIdSchema.make('source'),
          handleId: HandleIdSchema.make('out'),
        })
      ).model

      const pending = step(
        keyboard,
        Message.PointerDown({ ...down(), nodeId: 'target', handleId: 'in' })
      ).model

      const released = step(
        pending,
        Message.PointerReleased({
          pointerId: 1,
          clientX: 10,
          clientY: 20,
          targetNodeId: 'target',
          targetHandleId: 'in',
        })
      ).model

      const completed = step(
        released,
        Message.RoutedPointerClick({ pointerId: 1 })
      )

      const publishedOutcome = controlled ? 'proposed' : 'accepted'
      const outcome = allowed ? publishedOutcome : 'rejected'
      expect(events(completed)).toMatchObject([
        ...(allowed
          ? [{ name: 'onConnect', inputKind: 'keyboard', outcome }]
          : []),
        { name: 'onConnectEnd', inputKind: 'keyboard', outcome },
      ])
      expect(completed.model.graph.keyboardConnectionSession).toBeNull()
      expect(completed.model.graph.pointerClickReceipt).toBeNull()
      expect(completed.model.graph.document.edges).toHaveLength(
        allowed && !controlled ? 1 : 0
      )

      const expectedChange = expect.objectContaining({
        kind: 'edge-add',
        edge: expect.objectContaining({
          source: 'source',
          sourceHandle: 'out',
          target: 'target',
          targetHandle: 'in',
        }),
      })

      expect(
        completed.outMessage?.flatMap((item) =>
          item.kind === 'change' && item.change !== undefined
            ? [item.change]
            : []
        )[0]
      ).toStrictEqual(allowed ? expectedChange : undefined)
    }
  )

  it('round3 strict mode keeps disabled native click completion guarded', () => {
    const base = initial(8)
    const model = { ...base, graph: { ...base.graph, connectOnClick: false } }

    const keyboard = step(
      model,
      Message.ActivateHandle({
        nodeId: NodeIdSchema.make('source'),
        handleId: HandleIdSchema.make('out'),
      })
    ).model

    const pending = step(
      keyboard,
      Message.PointerDown({ ...down(), nodeId: 'target', handleId: 'in' })
    ).model

    const released = step(
      pending,
      Message.PointerReleased({
        pointerId: 1,
        clientX: 10,
        clientY: 20,
        targetNodeId: 'target',
        targetHandleId: 'in',
      })
    ).model

    const clicked = step(released, Message.RoutedPointerClick({ pointerId: 1 }))
    expect(clicked.model.graph.keyboardConnectionSession).toStrictEqual({
      kind: 'connection',
      sourceNodeId: 'source',
      sourceHandleId: 'out',
      inputKind: 'keyboard',
    })
    expect(events(clicked)).toStrictEqual([])
    expect(clicked.model.graph.document.edges).toStrictEqual(document.edges)
    expect(clicked.model.graph.pointerClickReceipt).toBeNull()
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

describe('connection owner migration with synthetic capture and queue barriers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each(['node', 'pane', 'connection'] as const)(
    'queued %s release permits following connection down without releasing newer capture',
    async (kind) => {
      const fixture = setupPointer()
      const stream = fixture.acquire()

      const target = {
        node: fixture.node,
        pane: fixture.canvas,
        connection: fixture.handle,
      }[kind]

      fixture.begin(target)
      fixture.dom.dispatchEvent(pointerEvent('pointerup'))
      fixture.begin(fixture.handle)
      expect(fixture.canvas.captured).toBeTruthy()
      const messages = await fixture.collect(stream, 3)

      for (const message of messages) {
        fixture.process(message)
      }

      expect(fixture.model().graph.pointerSession?.kind).toBe(
        'connection-pending'
      )
      expect(fixture.canvas.captured).toBeTruthy()
      await fixture.dispose()
      expect(fixture.canvas.captured).toBeFalsy()
    }
  )

  it('genuinely pressed node blocks another physical admission', async () => {
    const fixture = setupPointer()
    const stream = fixture.acquire()
    fixture.begin()
    fixture.begin(fixture.handle)
    fixture.dom.dispatchEvent(pointerEvent('pointerup'))
    const messages = await fixture.collect(stream, 2)
    expect(messages.map((message) => message._tag)).toStrictEqual([
      'PointerDown',
      'PointerReleased',
    ])
    expect(fixture.canvas.captured).toBeFalsy()
    await fixture.dispose()
  })
})

describe('connection receipt cancellation during deferred reduction', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('qualified Escape after a queued native click settles only its resulting click source', async () => {
    const fixture = setupPointer()
    const stream = fixture.acquire()
    fixture.canvas.ownerDocument.elementFromPoint = () => fixture.handle
    fixture.begin(fixture.handle)
    fixture.dom.dispatchEvent(pointerEvent('pointerup'))
    const click = pointerEvent('click')
    Object.defineProperty(click, 'target', { value: fixture.canvas })
    fixture.dom.dispatchEvent(click)

    const escape = Object.defineProperty(
      new Event('keydown', { cancelable: true }),
      'key',
      { value: 'Escape' }
    )

    fixture.dom.dispatchEvent(escape)
    expect(escape.defaultPrevented).toBeTruthy()
    const messages = await fixture.collect(stream, 4)

    const observed = messages.flatMap((message) => {
      const result = fixture.process(message)

      return result === undefined
        ? []
        : events(result).map((event) => event.name)
    })

    expect(observed).toStrictEqual(['onInit', 'onConnectStart', 'onConnectEnd'])
    expect(fixture.model().graph.keyboardConnectionSession).toBeNull()
    await fixture.dispose()
  })
})

describe('migrated awaiting-connection and resize ownership', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each(['blur', 'pointercancel', 'Escape'] as const)(
    'native %s settles queued down before attachment',
    async (kind) => {
      const fixture = setupPointer()
      const stream = fixture.acquire()
      fixture.begin(fixture.handle)

      if (kind === 'blur') {
        fixture.windowOwner.dispatchEvent(new Event('blur'))
      } else if (kind === 'Escape') {
        fixture.dom.dispatchEvent(
          Object.defineProperty(
            new Event('keydown', { cancelable: true }),
            'key',
            { value: 'Escape' }
          )
        )
      } else {
        fixture.dom.dispatchEvent(pointerEvent(kind))
      }

      const messages = await fixture.collect(stream, 2)

      const emitted = messages.flatMap((message) => {
        const result = fixture.process(message)

        return result === undefined
          ? []
          : events(result).filter((event) => event.name !== 'onInit')
      })

      expect({
        emitted,
        session: fixture.model().graph.pointerSession,
        captured: fixture.canvas.captured,
      }).toStrictEqual({ emitted: [], session: null, captured: false })
      await fixture.dispose()
    }
  )

  it('unrelated reduction preserves awaiting capture and queued native down', async () => {
    const fixture = setupPointer()
    const stream = fixture.acquire()
    fixture.begin(fixture.handle)
    fixture.accept(step(fixture.model(), Message.PruneMeasurements({})).model)
    const [queued] = await fixture.collect(stream, 1)

    if (queued === undefined) {
      throw new Error('Missing down')
    }

    expect(fixture.process(queued)?.model.graph.pointerSession?.kind).toBe(
      'connection-pending'
    )
    expect(fixture.canvas.captured).toBeTruthy()
    await fixture.dispose()
  })

  it('connection release before node down preserves the newer node capture', async () => {
    const fixture = setupPointer()
    const stream = fixture.acquire()
    fixture.begin(fixture.handle)
    fixture.dom.dispatchEvent(pointerEvent('pointerup'))
    fixture.begin(fixture.node)
    const messages = await fixture.collect(stream, 3)

    for (const message of messages) {
      fixture.process(message)
    }

    expect(fixture.model().graph.pointerSession?.kind).toBe('node-pending')
    expect(fixture.node.captured).toBeTruthy()
    await fixture.dispose()
  })
})

describe('cross-kind native FIFO at nontrivial coordinates', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each(['handle', 'reconnect'] as const)(
    'resize release then %s admission survives translated zoomed coordinates',
    async (destination) => {
      const fixture = setupPointer()
      fixture.accept({
        ...fixture.model(),
        graph: {
          ...fixture.model().graph,
          viewport: { x: 80, y: 40, zoom: 2 },
          document: {
            ...document,
            nodes: document.nodes.map((node) => ({ ...node, selected: true })),
          },
        },
      })
      const stream = fixture.acquire()
      fixture.begin(fixture.resize)
      const [downMessage] = await fixture.collect(stream, 1)

      if (downMessage === undefined) {
        throw new Error('Missing resize down')
      }

      fixture.process(downMessage)
      expect(fixture.model().graph.gestureSession?.kind).toBe('resize')
      fixture.dom.dispatchEvent(pointerEvent('pointerup'))
      fixture.begin(fixture[destination])
      const queued = await fixture.collect(stream, 2)

      for (const message of queued) {
        fixture.process(message)
      }

      expect(fixture.model().graph.pointerSession?.kind).toBe(
        destination === 'handle' ? 'connection-pending' : 'reconnection-pending'
      )
      expect(fixture.canvas.captured).toBeTruthy()
      await fixture.dispose()
    }
  )

  it('old routed click cannot release a newer capture with the reused pointer ID', async () => {
    const fixture = setupPointer()
    const stream = fixture.acquire()
    fixture.canvas.ownerDocument.elementFromPoint = () => fixture.handle
    fixture.begin(fixture.handle)
    fixture.dom.dispatchEvent(pointerEvent('pointerup'))
    const click = pointerEvent('click')
    Object.defineProperty(click, 'target', { value: fixture.canvas })
    fixture.dom.dispatchEvent(click)
    fixture.begin(fixture.targetHandle, 11, 20)
    const queued = await fixture.collect(stream, 4)

    for (const message of queued) {
      fixture.process(message)
    }

    expect(fixture.canvas.captured).toBeTruthy()
    expect(fixture.model().graph.pointerSession?.startX).toBe(11)
    await fixture.dispose()
  })
})
