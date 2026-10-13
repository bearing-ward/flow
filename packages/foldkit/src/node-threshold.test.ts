import { decodeFlowDocument, NodeIdSchema, HandleIdSchema } from '@flow/core'
import { Deferred, Effect, Fiber, Predicate, Match, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createProgramUpdate,
  initialModel,
  update,
  wrapGraphMessage,
  AppMessage,
  HostAction,
} from './application.ts'
import { Message, defaultInteractionOptions } from './graph.ts'
import {
  fixtureDocument,
  pointerEvent,
  setupPointer,
} from './node-threshold-fixture.ts'

const down = () =>
  Message.PointerDown({
    pointerId: 1,
    clientX: 10,
    clientY: 20,
    nodeId: 'source',
    handleId: null,
    edgeId: null,
    endpoint: null,
    direction: null,
  })

const move = (x: number, y = 20, pointerId = 1) =>
  Message.NodeDragMoved({
    pointerId,
    clientX: x,
    clientY: y,
    flowX: x,
    flowY: y,
  })

const up = (x: number, y = 20) =>
  Message.PointerReleased({
    pointerId: 1,
    clientX: x,
    clientY: y,
    targetNodeId: null,
    targetHandleId: null,
  })

const step = (
  model: ReturnType<typeof initialModel>,
  message: typeof Message.Type
) => update(model, wrapGraphMessage({ message }))

// Lifecycle order only; live drag payloads are covered by live-drag.test.ts.
const events = (result: ReturnType<typeof update>) =>
  result.outMessage?.flatMap((item) =>
    item.kind === 'interaction'
      ? item.events.map(
          ({
            position: _position,
            positionAbsolute: _positionAbsolute,
            nodePositions: _nodePositions,
            ...event
          }) => event
        )
      : []
  ) ?? []

const semantic = (result: ReturnType<typeof update>) =>
  result.outMessage?.flatMap((item) =>
    item.kind === 'change' && item.change !== undefined ? [item.change] : []
  ) ?? []

const initial = (threshold = 5) =>
  initialModel(
    fixtureDocument,
    { x: 0, y: 0, zoom: 1 },
    [],
    undefined,
    'full',
    { ...defaultInteractionOptions, nodeDragThreshold: threshold }
  )

describe('node threshold pure application transitions', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('pending is quiet, strict crossing starts and progresses, retreat remains active', () => {
    let result = step(initial(), down())
    const phases = [result.model.graph.pointerSession?.kind]
    const observed = [events(result).map((event) => event.name)]

    for (const message of [
      move(13, 24),
      move(16, 20, 2),
      move(16),
      move(10),
      up(10),
    ]) {
      result = step(result.model, message)
      phases.push(result.model.graph.pointerSession?.kind)
      observed.push(events(result).map((event) => event.name))
    }

    expect({
      phases,
      observed,
      changes: semantic(result),
      kinds: result.model.changeKinds,
    }).toStrictEqual({
      phases: [
        'node-pending',
        'node-pending',
        'node-pending',
        'node-drag',
        'node-drag',
        undefined,
      ],
      observed: [
        ['onInit'],
        [],
        [],
        ['onNodeDragStart', 'onNodeDrag'],
        ['onNodeDrag'],
        ['onNodeDragStop'],
      ],
      changes: [
        { kind: 'node-position', nodeId: 'source', position: { x: 0, y: 0 } },
      ],
      kinds: ['node-position'],
    })
  })

  it('up cannot activate pending and zero starts on down', () => {
    const pending = step(initial(), down())
    expect(events(step(pending.model, up(100)))).toStrictEqual([])
    const active = step(initial(0), down())
    expect(
      events(active).filter((event) => event.phase === 'start')
    ).toHaveLength(1)
    expect(semantic(step(active.model, up(10)))).toHaveLength(1)
  })

  it('corrects parent-local anchors with nonzero origins at zoom two', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: 'parent', label: 'Parent', position: { x: 100, y: 200 } },
          {
            id: 'source',
            label: 'Child',
            parentId: 'parent',
            position: { x: 30, y: 40 },
            size: { width: 20, height: 10 },
            origin: [0.5, 0.5],
          },
        ],
        edges: [],
      })
    )

    const base = initialModel(
      document,
      { x: 0, y: 0, zoom: 2 },
      [],
      undefined,
      'full',
      { ...defaultInteractionOptions, nodeDragThreshold: 0 }
    )

    expect(semantic(step(step(base, down()).model, up(22, 26)))).toStrictEqual([
      { kind: 'node-position', nodeId: 'source', position: { x: 36, y: 43 } },
    ])
  })

  it.each(['ReplaceViewport', 'SetAllowedTargets'] as const)(
    'adds only active pointer-node cancellation on %s',
    (route) => {
      const active = step(initial(0), down()).model

      const action =
        route === 'ReplaceViewport'
          ? HostAction.ReplaceViewport({ viewport: { x: 1, y: 0, zoom: 1 } })
          : HostAction.SetAllowedTargets({ targets: [] })

      const result = update(active, AppMessage.HostAction({ action }))
      expect(
        events(result).map((event) => [event.name, event.outcome, event.reason])
      ).toStrictEqual([['onNodeDragStop', 'cancelled', route]])
      expect(
        events(step(result.model, Message.CancelGesture({})))
      ).toStrictEqual([])
      expect(
        events(
          update(
            step(initial(), down()).model,
            AppMessage.HostAction({ action })
          )
        )
      ).toStrictEqual([])
    }
  )
})

describe('synthetic capture and explicit queue barriers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does not capture before acquisition and buffers down/equality/crossing/up before consumer attachment', async () => {
    const fixture = setupPointer()
    fixture.begin()
    expect(fixture.node.captured).toBeFalsy()
    const stream = fixture.acquire()
    fixture.begin()
    fixture.dom.dispatchEvent(pointerEvent('pointermove', 13, 24))
    fixture.dom.dispatchEvent(pointerEvent('pointermove', 16))
    fixture.dom.dispatchEvent(pointerEvent('pointerup', 16))
    const messages = await fixture.collect(stream, 4)
    expect(messages.map((message) => message._tag)).toStrictEqual([
      'PointerDown',
      'NodeDragMoved',
      'NodeDragMoved',
      'PointerReleased',
    ])

    const outputs = messages.flatMap((message) => {
      const result = fixture.process(message)

      return result === undefined
        ? []
        : events(result).map((event) => event.name)
    })

    expect(outputs).toStrictEqual([
      'onInit',
      'onNodeDragStart',
      'onNodeDrag',
      'onNodeDragStop',
    ])
    expect(fixture.model().graph.document.nodes[0]?.position).toStrictEqual({
      x: 6,
      y: 0,
    })
    await fixture.dispose()
    expect(fixture.node.captured).toBeFalsy()
  })

  it('reused declarative click carriers are copied once and follow already offered up', async () => {
    const fixture = setupPointer()
    const stream = fixture.acquire()
    fixture.begin()
    fixture.dom.dispatchEvent(pointerEvent('pointerup'))

    const carrier = Message.ObserveMouse({
      name: 'onNodeClick',
      nodeId: 'source',
      edgeId: null,
    })

    fixture.resource.prepare(carrier)
    fixture.resource.prepare(carrier)
    const messages = await fixture.collect(stream, 4)
    expect(messages.map((message) => message._tag)).toStrictEqual([
      'PointerDown',
      'PointerReleased',
      'ObserveMouse',
      'ObserveMouse',
    ])
    expect(messages[2]).not.toBe(carrier)

    const outputs = messages.flatMap((message) => {
      const result = fixture.process(message)

      return result === undefined
        ? []
        : events(result).map((event) => event.name)
    })

    expect(outputs).toStrictEqual(['onInit', 'onNodeClick', 'onNodeClick'])
    await fixture.dispose()
  })

  it.each(['throw', 'false'] as const)(
    'capture %s admits nothing',
    async (failure) => {
      const fixture = setupPointer(0)
      fixture.acquire()
      fixture.node.captureFailure = failure
      fixture.begin()
      expect(fixture.node.captured).toBeFalsy()
      expect(fixture.model().graph.pointerSession).toBeNull()
      await fixture.dispose()
    }
  )
})

describe('native origin admission and actual API termination', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rejects a fresh native down when reduction returns the unchanged same-pointer session', async () => {
    const fixture = setupPointer(0)
    const stale = step(fixture.model(), down()).model
    fixture.accept(stale)
    const stream = fixture.acquire()
    fixture.begin()
    const messages = await fixture.collect(stream, 1)
    const [queued] = messages

    if (queued === undefined) {
      throw new Error('Missing native down')
    }

    const rejected = fixture.process(queued)
    expect(rejected?.model.graph.pointerSession).toBe(
      stale.graph.pointerSession
    )
    expect(fixture.node.captured).toBeFalsy()
    await fixture.dispose()
  })

  it.each([
    { mode: 'controlled', route: 'edit' },
    { mode: 'uncontrolled', route: 'edit' },
    { mode: 'controlled', route: 'delete' },
    { mode: 'uncontrolled', route: 'delete' },
  ] as const)(
    'node-removing $mode $route cancels only after accepted invalidity is prepared',
    async ({ mode, route }) => {
      const fixture = setupPointer(0)
      fixture.accept({
        ...fixture.model(),
        graph: { ...fixture.model().graph, documentMode: mode },
      })
      const stream = fixture.acquire()
      fixture.begin()
      const [queuedDown] = await fixture.collect(stream, 1)

      if (queuedDown === undefined) {
        throw new Error('Missing native down')
      }

      fixture.process(queuedDown)
      const active = fixture.model()

      const request = AppMessage.EditRequest({
        request: {
          requestId: 'remove',
          transaction: { operations: [{ kind: 'set-nodes', nodes: [] }] },
        },
      })

      const edited =
        route === 'edit'
          ? update(active, request)
          : update(
              update(
                active,
                AppMessage.DeleteRequest({
                  request: {
                    operationId: 'remove',
                    baseRevision: active.acceptedDocumentRevision,
                    nodeIds: ['source'],
                    edgeIds: [],
                  },
                })
              ).model,
              AppMessage.DeleteApprovalResponse({
                response: {
                  kind: 'approved',
                  operationId: 'remove',
                  baseRevision: active.acceptedDocumentRevision,
                  decision: true,
                },
              })
            )

      expect(edited.model.graph.pointerSession).toBe(
        active.graph.pointerSession
      )
      expect(events(edited)).toStrictEqual([])
      fixture.accept(edited.model)
      fixture.dom.dispatchEvent(pointerEvent('pointermove', 20))
      const [movement] = await fixture.collect(stream, 1)

      if (movement === undefined) {
        throw new Error('Missing movement')
      }

      const result = fixture.process(movement)

      if (result === undefined) {
        throw new Error('Missing prepared transition')
      }

      expect(
        events(result).map((event) => [event.name, event.outcome])
      ).toStrictEqual(
        mode === 'controlled'
          ? [['onNodeDrag', undefined]]
          : [['onNodeDragStop', 'cancelled']]
      )
      expect(result.model.graph.pointerSession === null).toBe(
        mode === 'uncontrolled'
      )
      await fixture.dispose()
    }
  )

  it.each(['blur', 'cancel', 'loss', 'disconnect'] as const)(
    'active %s terminates once without publication',
    async (kind) => {
      const fixture = setupPointer(0)
      const stream = fixture.acquire()
      fixture.begin()
      const [queuedDown] = await fixture.collect(stream, 1)

      if (queuedDown === undefined) {
        throw new Error('Missing native down')
      }

      fixture.process(queuedDown)

      if (kind === 'blur') {
        fixture.windowOwner.dispatchEvent(new Event('blur'))
      }

      if (kind === 'cancel') {
        fixture.dom.dispatchEvent(pointerEvent('pointercancel'))
      }

      if (kind === 'loss') {
        fixture.node.captured = false
        const loss = pointerEvent('lostpointercapture')
        Object.defineProperty(loss, 'target', { value: fixture.node })
        fixture.dom.dispatchEvent(loss)
      }

      if (kind === 'disconnect') {
        fixture.node.isConnected = false
        fixture.dom.dispatchEvent(pointerEvent('pointermove', 20))
      }

      const [cancellation] = await fixture.collect(stream, 1)

      if (cancellation === undefined) {
        throw new Error('Missing cancellation')
      }

      const result = fixture.process(cancellation)

      if (result === undefined) {
        throw new Error('Missing terminal')
      }

      expect({
        events: events(result).map((event) => [event.name, event.outcome]),
        changes: semantic(result),
      }).toStrictEqual({
        events: [['onNodeDragStop', 'cancelled']],
        changes: [],
      })
      expect(
        events(step(result.model, Message.CancelGesture({})))
      ).toStrictEqual([])
      await fixture.dispose()
    }
  )
})

describe('node owner barriers and route compatibility', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { querySelector: () => null })
    vi.stubGlobal('CSS', { escape: (value: string) => value })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('replacement ahead of queued down retires it without admitting the replacement document', async () => {
    const fixture = setupPointer(0)
    const stream = fixture.acquire()
    fixture.begin()
    const replacement = Message.ReplaceDocument({ document: fixtureDocument })
    const previous = fixture.model()
    const replaced = step(previous, replacement)
    fixture.resource.reconcile({
      previous: previous.graph,
      current: replaced.model.graph,
      message: replacement,
      nativeBarrier: replaced.nativeBarrier,
    })
    fixture.accept(replaced.model)
    const [queued] = await fixture.collect(stream, 1)

    if (queued === undefined) {
      throw new Error('Missing queued down')
    }

    expect(fixture.process(queued)).toBeUndefined()
    expect(fixture.node.captured).toBeFalsy()
    expect(fixture.model().graph.pointerSession).toBeNull()
    await fixture.dispose()
  })

  it('a cloned native message cannot borrow origin ownership and an observed child is consumed once', async () => {
    const fixture = setupPointer(0)
    const stream = fixture.acquire()
    fixture.begin()
    const [queued] = await fixture.collect(stream, 1)

    if (queued === undefined || !Predicate.isTagged('PointerDown')(queued)) {
      throw new Error('Missing native down')
    }

    expect(fixture.process(Message.PointerDown({ ...queued }))).toBeUndefined()
    expect(fixture.process(queued)?.model.graph.pointerSession?.kind).toBe(
      'node-drag'
    )
    fixture.resource.prepare(
      Message.ObserveMouse({
        name: 'onNodeClick',
        nodeId: 'source',
        edgeId: null,
      })
    )
    const [observation] = await fixture.collect(stream, 1)

    if (observation === undefined) {
      throw new Error('Missing observation')
    }

    expect(fixture.process(observation)?.outMessage).toBeDefined()
    expect(fixture.process(observation)).toBeUndefined()
    await fixture.dispose()
  })

  it.each(['ReplaceViewport', 'SetAllowedTargets'] as const)(
    '%s retains connection and pane lifecycle silence',
    (route) => {
      const action =
        route === 'ReplaceViewport'
          ? HostAction.ReplaceViewport({ viewport: { x: 1, y: 0, zoom: 1 } })
          : HostAction.SetAllowedTargets({ targets: [] })

      const connection = step(
        initial(0),
        Message.PointerDown({ ...down(), handleId: 'out' })
      ).model

      const pane = step(
        initial(),
        Message.GestureDown({
          pointerId: 1,
          clientX: 10,
          clientY: 20,
          screenX: 10,
          screenY: 20,
          allowPan: false,
          nodeId: null,
          direction: null,
        })
      ).model

      expect(
        [connection, pane].map((model) =>
          events(update(model, AppMessage.HostAction({ action })))
        )
      ).toStrictEqual([[], []])
    }
  )

  it('ReplaceDocument retains full active node connection and pane terminals', () => {
    const node = step(initial(0), down()).model

    const connectionDown = step(
      initial(),
      Message.PointerDown({ ...down(), handleId: 'out' })
    ).model

    const connection = step(
      connectionDown,
      Message.ConnectionPointerMoved({
        pointerId: 1,
        clientX: 30,
        clientY: 20,
        flowX: 30,
        flowY: 20,
        autoPanDelta: { x: 0, y: 0 },
      })
    ).model

    const pane = step(
      initial(),
      Message.GestureDown({
        pointerId: 1,
        clientX: 10,
        clientY: 20,
        screenX: 10,
        screenY: 20,
        allowPan: false,
        nodeId: null,
        direction: null,
      })
    ).model

    expect(
      [node, connection, pane].map((model) =>
        events(
          update(
            model,
            AppMessage.HostAction({
              action: HostAction.ReplaceDocument({ document: fixtureDocument }),
            })
          )
        ).map((event) => event.name)
      )
    ).toStrictEqual([['onNodeDragStop'], ['onConnectEnd'], ['onSelectionEnd']])
  })

  it.each(['controlled', 'uncontrolled'] as const)(
    '%s release publishes semantic and acceptance before terminal without duplicate bookkeeping',
    (mode) => {
      const base = initial(0)

      const active = step(
        { ...base, graph: { ...base.graph, documentMode: mode } },
        down()
      ).model

      const released = step(active, up(16))
      expect(
        released.outMessage?.flatMap((item) => {
          if (item.kind === 'interaction') {
            return item.events.map((event) => event.name)
          }

          if (item.kind !== 'change') {
            return []
          }

          return [
            ...(item.change === undefined ? [] : ['proposal']),
            ...(item.acceptedState === undefined ? [] : ['accepted']),
          ]
        })
      ).toStrictEqual(
        mode === 'controlled'
          ? ['proposal', 'onNodeDragStop']
          : ['proposal', 'accepted', 'onNodeDragStop']
      )
      expect(released.model.changeKinds).toStrictEqual(['node-position'])
    }
  )
})

describe('continuously attached native consumer', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('the acquired FIFO delivers crossing and release after an explicit down-reduction barrier', async () => {
    const fixture = setupPointer()
    const stream = fixture.acquire()
    const admitted = Effect.runSync(Deferred.make<boolean>())
    const completed = Effect.runSync(Deferred.make<boolean>())
    const tags: string[] = []

    const fiber = Effect.runFork(
      Stream.runForEach(stream, (message) =>
        Effect.gen(function* processNative() {
          tags.push(message._tag)
          fixture.process(message)

          if (Predicate.isTagged('PointerDown')(message)) {
            yield* Deferred.succeed(admitted, true)
          }

          if (Predicate.isTagged('PointerReleased')(message)) {
            yield* Deferred.succeed(completed, true)
          }
        })
      )
    )

    fixture.begin()
    await Effect.runPromise(Deferred.await(admitted))
    fixture.dom.dispatchEvent(pointerEvent('pointermove', 13, 24))
    fixture.dom.dispatchEvent(pointerEvent('pointermove', 16))
    fixture.dom.dispatchEvent(pointerEvent('pointerup', 16))
    await Effect.runPromise(Deferred.await(completed))
    expect(tags).toStrictEqual([
      'PointerDown',
      'NodeDragMoved',
      'NodeDragMoved',
      'PointerReleased',
    ])
    expect(fixture.model().graph.document.nodes[0]?.position).toStrictEqual({
      x: 6,
      y: 0,
    })
    await Effect.runPromise(Fiber.interrupt(fiber))
    await fixture.dispose()
  })
})

describe('round one repair regressions', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { querySelector: () => null })
    vi.stubGlobal('CSS', { escape: (value: string) => value })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each(['node', 'connection', 'keyboard'] as const)(
    'first eligible %s activation initializes before lifecycle after silent API traffic',
    (kind) => {
      const base = initial(0)

      const configured = {
        ...base,
        graph: { ...base.graph, connectionDragThreshold: 0 },
      }

      const activate =
        kind === 'keyboard'
          ? Message.ActivateHandle({
              nodeId: NodeIdSchema.make('source'),
              handleId: HandleIdSchema.make('out'),
            })
          : Message.PointerDown({
              ...down(),
              handleId: kind === 'connection' ? 'out' : null,
            })

      for (const apiFirst of ['none', 'host', 'edit']) {
        const edited = update(
          configured,
          AppMessage.EditRequest({
            request: {
              requestId: 'api-first',
              transaction: {
                operations: [
                  { kind: 'set-nodes', nodes: fixtureDocument.nodes },
                ],
              },
            },
          })
        )

        const traffic = Match.value(apiFirst).pipe(
          Match.when('edit', () => edited),
          Match.when('host', () =>
            update(
              configured,
              AppMessage.HostAction({
                action: HostAction.ReplaceViewport({
                  viewport: { x: 4, y: 0, zoom: 1 },
                }),
              })
            )
          ),
          Match.orElse(() => ({ model: configured }))
        )

        expect({
          events: events(traffic),
          ready: traffic.model.lifecycleReady,
        }).toStrictEqual({ events: [], ready: false })
        const started = step(traffic.model, activate)

        const start =
          kind === 'node'
            ? {
                name: 'onNodeDragStart',
                phase: 'start',
                inputKind: 'pointer',
                nodeId: 'source',
                nodeIds: ['source'],
              }
            : {
                name: 'onConnectStart',
                phase: 'start',
                inputKind: kind === 'keyboard' ? 'keyboard' : 'pointer',
                nodeId: 'source',
              }

        expect(events(started)).toStrictEqual([
          { name: 'onInit', phase: 'event', inputKind: 'runtime' },
          start,
        ])
        expect(
          events(step(started.model, Message.IgnoreInput()))
        ).toStrictEqual([])
      }
    }
  )

  it.each(['click', 'keyboard'] as const)(
    'node input owns its lifecycle beside retained %s connection',
    async (kind) => {
      const fixture = setupPointer(5)
      fixture.accept({
        ...fixture.model(),
        graph: {
          ...fixture.model().graph,
          allowedConnectionTargets: ['target'],
        },
      })

      const activate =
        kind === 'click' ? Message.ClickHandle : Message.ActivateHandle

      const connected = step(
        fixture.model(),
        activate({
          nodeId: NodeIdSchema.make('source'),
          handleId: HandleIdSchema.make('out'),
        })
      )

      fixture.accept(connected.model)
      const retained = connected.model.graph.keyboardConnectionSession
      const retainedChecks: boolean[] = []
      const stream = fixture.acquire()

      const drain = async (count: number) => {
        const messages = await fixture.collect(stream, count)

        return messages.flatMap((message) => {
          const result = fixture.process(message)

          return result === undefined ? [] : events(result)
        })
      }

      fixture.begin()
      fixture.dom.dispatchEvent(pointerEvent('pointermove', 12))
      fixture.dom.dispatchEvent(pointerEvent('pointermove', 13, 24))
      fixture.dom.dispatchEvent(pointerEvent('pointerup', 100))
      await expect(drain(4)).resolves.toStrictEqual([])
      retainedChecks.push(
        fixture.model().graph.keyboardConnectionSession === retained
      )
      fixture.begin()
      fixture.dom.dispatchEvent(pointerEvent('pointermove', 16))
      fixture.dom.dispatchEvent(pointerEvent('pointermove', 11))
      fixture.dom.dispatchEvent(pointerEvent('pointerup', 11))
      await expect(drain(4)).resolves.toStrictEqual([
        {
          name: 'onNodeDragStart',
          phase: 'start',
          inputKind: 'pointer',
          nodeId: 'source',
          nodeIds: ['source'],
        },
        {
          name: 'onNodeDrag',
          phase: 'progress',
          inputKind: 'pointer',
          nodeId: 'source',
          nodeIds: ['source'],
          x: 16,
          y: 20,
        },
        {
          name: 'onNodeDrag',
          phase: 'progress',
          inputKind: 'pointer',
          nodeId: 'source',
          nodeIds: ['source'],
          x: 11,
          y: 20,
        },
        {
          name: 'onNodeDragStop',
          phase: 'end',
          inputKind: 'pointer',
          outcome: 'accepted',
          nodeId: 'source',
          nodeIds: ['source'],
        },
      ])
      expect(fixture.model().graph.document.nodes[0]?.position).toStrictEqual({
        x: 1,
        y: 0,
      })
      retainedChecks.push(
        fixture.model().graph.keyboardConnectionSession === retained
      )
      fixture.begin()
      fixture.dom.dispatchEvent(pointerEvent('pointermove', 16))
      fixture.dom.dispatchEvent(pointerEvent('pointercancel', 16))
      await expect(drain(3)).resolves.toStrictEqual([
        {
          name: 'onNodeDragStart',
          phase: 'start',
          inputKind: 'pointer',
          nodeId: 'source',
          nodeIds: ['source'],
        },
        {
          name: 'onNodeDrag',
          phase: 'progress',
          inputKind: 'pointer',
          nodeId: 'source',
          nodeIds: ['source'],
          x: 16,
          y: 20,
        },
        {
          name: 'onNodeDragStop',
          phase: 'end',
          inputKind: 'pointer',
          outcome: 'cancelled',
          reason: 'cancelled',
          nodeId: 'source',
          nodeIds: ['source'],
        },
      ])
      retainedChecks.push(
        fixture.model().graph.keyboardConnectionSession === retained
      )

      const complete = step(
        fixture.model(),
        activate({
          nodeId: NodeIdSchema.make('target'),
          handleId: HandleIdSchema.make('in'),
        })
      )

      expect({
        terminal: events(complete),
        retainedChecks,
        edges: complete.model.graph.document.edges.map((edge) => [
          edge.source,
          edge.target,
        ]),
      }).toStrictEqual({
        terminal: [
          {
            name: 'onConnectEnd',
            phase: 'end',
            inputKind: kind,
            outcome: 'cancelled',
            reason: 'cancelled',
            nodeId: 'source',
            connectionState: {
              isValid: null,
              fromNodeId: 'source',
              fromHandleId: 'out',
              fromHandleType: 'source',
              toNodeId: null,
              toHandleId: null,
              toHandleType: null,
            },
          },
        ],
        retainedChecks: [true, true, true],
        edges: [['source', 'target']],
      })
      await fixture.dispose()
    }
  )

  it.each([
    'replacement',
    'equivalent',
    'unchanged-api',
    'controlled',
    'edit',
  ] as const)(
    'serial composition reconciles actual viewport %s ahead of queued native down',
    async (kind) => {
      const fixture = setupPointer(0)

      const batches: NonNullable<
        ReturnType<typeof update>['outMessage']
      >[number][] = []

      const program = {
        update: createProgramUpdate(fixture.resource, {
          enqueue: (batch) => {
            batches.push(...(batch ?? []))
          },
          close: () => fixture.resource.close(),
        }),
      }

      const stream = fixture.acquire()
      fixture.begin()

      const base = {
        ...fixture.model(),
        graph: {
          ...fixture.model().graph,
          viewportMode:
            kind === 'controlled'
              ? ('controlled' as const)
              : ('uncontrolled' as const),
        },
      }

      const request = Match.value(kind).pipe(
        Match.when('equivalent', () =>
          AppMessage.HostAction({
            action: HostAction.ReplaceViewport({
              viewport: { x: 0, y: 0, zoom: 1 },
            }),
          })
        ),
        Match.when('edit', () =>
          AppMessage.HostAction({
            action: HostAction.DispatchCommand({
              command: {
                kind: 'set-node-position',
                nodeId: NodeIdSchema.make('target'),
                position: { x: 210, y: 0 },
              },
            }),
          })
        ),
        Match.orElse(() =>
          AppMessage.ViewportRequest({
            request: {
              requestId: 'barrier',
              kind: 'set',
              viewport: { x: kind === 'unchanged-api' ? 0 : 20, y: 0, zoom: 1 },
              width: 800,
              height: 600,
              originX: 0,
              originY: 0,
            },
          })
        )
      )

      const changed = program.update(base, request)
      const shouldRetire = kind === 'replacement' || kind === 'equivalent'
      expect(fixture.node.captured).toBe(!shouldRetire)
      fixture.accept(changed.model)
      const [queued] = await fixture.collect(stream, 1)

      if (queued === undefined) {
        throw new Error('Missing held down')
      }

      const admitted = program.update(
        changed.model,
        wrapGraphMessage({ message: queued })
      )

      expect(admitted.model.graph.pointerSession?.kind ?? null).toBe(
        shouldRetire ? null : 'node-drag'
      )
      fixture.dom.dispatchEvent(pointerEvent('pointermove', 16))
      fixture.dom.dispatchEvent(pointerEvent('pointerup', 16))

      let current = admitted.model

      if (!shouldRetire) {
        for (const message of await fixture.collect(stream, 2)) {
          current = program.update(current, wrapGraphMessage({ message })).model
        }
      }

      expect({
        position: current.graph.document.nodes[0]?.position,
        nodeEvents: batches.flatMap((item) =>
          item.kind === 'interaction'
            ? item.events
                .filter((event) => event.name.startsWith('onNodeDrag'))
                .map((event) => event.name)
            : []
        ),
      }).toStrictEqual({
        position: { x: shouldRetire ? 0 : 6, y: 0 },
        nodeEvents: shouldRetire
          ? []
          : ['onNodeDragStart', 'onNodeDrag', 'onNodeDragStop'],
      })

      await fixture.dispose()
    }
  )
})
