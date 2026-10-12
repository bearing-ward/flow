import {
  decodeFlowDocument,
  NodeIdSchema,
  HandleIdSchema,
  EdgeIdSchema,
} from '@flow/core'
import { Effect, Fiber, Option, Predicate, Stream } from 'effect'
import { beforeAll, afterAll, vi, describe, expect, it } from 'vitest'

import { wrapGraphMessage, initialModel, update } from './application.ts'
import {
  Message,
  defaultInteractionOptions,
  createConnectionPointerResource,
  subscriptions,
} from './graph.ts'

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
) => update(model, wrapGraphMessage({ message }))

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
        completed.commands?.find(({ name }) => name === 'PublishFlowChanges')
          ?.args?.change
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

class TestElement extends EventTarget {
  captured = false
  isConnected = true
  bounds = { left: 0, top: 0 }
  clientWidth = 800
  clientHeight = 600
  handles: TestElement[] = []
  querySelectorAll() {
    return this.handles
  }
  querySelector() {
    return this.parent
  }
  dataset: DOMStringMap = {}
  parent: TestElement | null = null
  ownerDocument = { elementFromPoint: (): TestElement | null => null }
  getBoundingClientRect() {
    return this.bounds
  }
  setPointerCapture() {
    this.captured = true
  }
  hasPointerCapture() {
    return this.captured
  }
  releasePointerCapture() {
    this.captured = false
  }
  contains(target: TestElement) {
    return (
      target === this ||
      target.parent === this ||
      target.parent?.parent === this
    )
  }
  closest(selector: string): TestElement | null {
    if (selector.includes('data-node-id')) {
      return this.dataset.nodeId === undefined ? this.parent : this
    }

    return selector.includes('data-handle-id') &&
      this.dataset.handleId !== undefined
      ? this
      : null
  }
}

const syntheticPointer = (type: string, x = 10, y = 20) =>
  Object.defineProperties(new Event(type), {
    pointerId: { value: 1 },
    detail: { value: 1 },
    clientX: { value: x },
    clientY: { value: y },
  })

const setupResource = () => {
  const owner = new TestElement()
  const node = new TestElement()
  node.dataset = { nodeId: 'source' }
  node.parent = owner
  const handle = new TestElement()
  handle.dataset = { handleId: 'out' }
  handle.parent = node
  owner.ownerDocument.elementFromPoint = () => handle
  const dom = new EventTarget()
  const windowOwner = new EventTarget()
  vi.stubGlobal('window', windowOwner)
  Object.assign(dom, { querySelector: () => owner })
  vi.stubGlobal('document', dom)
  vi.stubGlobal('CSS', { escape: (value: string) => value })
  vi.stubGlobal('Node', TestElement)
  vi.stubGlobal('Element', TestElement)
  vi.stubGlobal('HTMLElement', TestElement)
  vi.stubGlobal('PointerEvent', Event)
  const targetNode = new TestElement()
  targetNode.dataset = { nodeId: 'target' }
  targetNode.parent = owner
  const targetHandle = new TestElement()
  targetHandle.dataset = { handleId: 'in' }
  targetHandle.parent = targetNode
  owner.handles = [handle, targetHandle]
  const base = initial(8)

  const model = {
    ...base,
    graph: {
      ...base.graph,
      allowedConnectionTargets: ['target'],
      document: { ...base.graph.document, edges: [] },
    },
  }

  const resource = createConnectionPointerResource(model.graph)

  return { owner, dom, windowOwner, model, resource }
}

describe('connectionDragThreshold repair native resource with controlled deferred reduction and synthetic DOM events', () => {
  afterAll(() => vi.unstubAllGlobals())

  it('unrelated update before down reduction preserves synchronous acquisition', () => {
    const { owner, model, resource } = setupResource()

    const admittedDown = Option.getOrThrow(
      resource.begin(model.graph, Option.some(down()))
    )

    expect(owner.captured).toBeTruthy()
    resource.reconcile(step(model, Message.PruneMeasurements({})).model.graph)
    expect(owner.captured).toBeTruthy()
    expect(
      Option.isSome(
        resource.prepare(wrapGraphMessage({ message: admittedDown }).message)
      )
    ).toBeTruthy()
  })

  it('rejected queued down retires acquisition and rejects late events', () => {
    const { owner, model, resource } = setupResource()

    const admittedDown = Option.getOrThrow(
      resource.begin(model.graph, Option.some(down()))
    )

    const replaced = step(
      model,
      Message.ReplaceDocument({ document: { nodes: [], edges: [] } })
    ).model

    resource.reconcile(replaced.graph)
    const rejected = step(replaced, admittedDown).model
    resource.reconcile(rejected.graph, admittedDown)
    expect(owner.captured).toBeFalsy()
    expect(
      Option.isNone(
        resource.prepare(wrapGraphMessage({ message: admittedDown }).message)
      )
    ).toBeTruthy()
  })

  it.each([
    Message.CancelGesture({}),
    Message.PointerCancelled({ pointerId: 1 }),
    Message.ReplaceDocument({ document: { nodes: [], edges: [] } }),
    Message.ReplaceViewport({ viewport: { x: 1, y: 2, zoom: 1 } }),
  ])('cancellation retires awaiting acquisition $_tag', (message) => {
    const { owner, model, resource } = setupResource()

    const admittedDown = Option.getOrThrow(
      resource.begin(model.graph, Option.some(down()))
    )

    const cancelled = step(model, message)
    resource.reconcile(cancelled.model.graph, message)
    expect(owner.captured).toBeFalsy()
    expect(
      Option.isNone(
        resource.prepare(wrapGraphMessage({ message: admittedDown }).message)
      )
    ).toBeTruthy()
  })

  it.each(['blur', 'pointercancel', 'Escape'])(
    'native %s queues cancellation while down awaits admission',
    async (kind) => {
      const { owner, dom, windowOwner, model, resource } = setupResource()
      const queued: (typeof Message.Type)[] = []

      const fiber = Effect.runFork(
        Stream.runForEach(
          resource.subscriptions.connectionPointerOwner.dependenciesToStream({
            instanceId: model.graph.instanceId,
          }),
          (message) =>
            Effect.sync(() => {
              queued.push(message)
            })
        )
      )

      try {
        await Effect.runPromise(Effect.sleep('10 millis'))

        const admittedDown = Option.getOrThrow(
          resource.begin(model.graph, Option.some(down()))
        )

        if (kind === 'blur') {
          windowOwner.dispatchEvent(new Event('blur'))
        } else if (kind === 'Escape') {
          dom.dispatchEvent(
            Object.defineProperty(
              new Event('keydown', { cancelable: true }),
              'key',
              { value: 'Escape' }
            )
          )
        } else {
          dom.dispatchEvent(syntheticPointer('pointercancel'))
        }

        await Effect.runPromise(Effect.sleep('10 millis'))
        expect(queued).toHaveLength(1)
        let reduced = step(model, admittedDown).model
        resource.reconcile(reduced.graph, admittedDown)

        for (const message of queued) {
          const result = step(reduced, message)
          resource.reconcile(result.model.graph, message)
          expect(events(result)).toStrictEqual([])
          reduced = result.model
        }

        expect(owner.captured).toBeFalsy()
        expect(reduced.graph.pointerSession).toBeNull()
      } finally {
        await Effect.runPromise(Fiber.interrupt(fiber))
      }
    }
  )

  it.each([false, true])(
    'routes release then click through one FIFO while reduction is deferred, down also deferred=%s',
    async (deferDown) => {
      const { owner, dom, model, resource } = setupResource()
      const queued: (typeof Message.Type)[] = []
      const entry = resource.subscriptions.connectionPointerOwner

      const fiber = Effect.runFork(
        Stream.runForEach(
          entry.dependenciesToStream({ instanceId: model.graph.instanceId }),
          (message) =>
            Effect.sync(() => {
              queued.push(message)
            })
        )
      )

      try {
        await Effect.runPromise(Effect.sleep('10 millis'))

        const admittedDown = Option.getOrThrow(
          resource.begin(model.graph, Option.some(down()))
        )

        const admitted = step(model, admittedDown).model

        if (!deferDown) {
          resource.reconcile(admitted.graph, admittedDown)
        }

        dom.dispatchEvent(syntheticPointer('pointerup'))
        const click = syntheticPointer('click')
        Object.defineProperty(click, 'target', { value: owner })
        const stopped = vi.spyOn(click, 'stopImmediatePropagation')
        dom.dispatchEvent(click)
        const replay = syntheticPointer('click')
        Object.defineProperty(replay, 'target', { value: owner })
        dom.dispatchEvent(replay)
        await Effect.runPromise(Effect.sleep('10 millis'))
        expect(stopped).toHaveBeenCalledOnce()

        const release = Message.PointerReleased({
          pointerId: 1,
          clientX: 10,
          clientY: 20,
          targetNodeId: 'source',
          targetHandleId: 'out',
        })

        expect(queued).toStrictEqual([
          release,
          Message.RoutedPointerClick({ pointerId: 1 }),
        ])

        if (deferDown) {
          resource.reconcile(admitted.graph, admittedDown)
        }

        let reduced = admitted
        const lifecycle: ReturnType<typeof events> = []

        for (const message of queued) {
          const prepared = resource.prepare(
            wrapGraphMessage({ message }).message
          )

          if (Option.isNone(prepared)) {
            throw new Error('Unexpected rejected release/click')
          }

          const result = step(reduced, prepared.value)
          resource.reconcile(result.model.graph, prepared.value)
          lifecycle.push(...events(result))
          reduced = result.model
        }

        const routed = { model: reduced }

        expect(routed.model.graph.pointerClickReceipt).toBeNull()
        expect(lifecycle).toStrictEqual([
          {
            name: 'onConnectStart',
            phase: 'start',
            inputKind: 'click',
            nodeId: 'source',
          },
        ])
        expect(
          events(
            step(routed.model, Message.RoutedPointerClick({ pointerId: 1 }))
          )
        ).toStrictEqual([])
      } finally {
        await Effect.runPromise(Fiber.interrupt(fiber))
      }

      expect(owner.captured).toBeFalsy()
    }
  )

  it.each([false, true])(
    'ordered crossing and near-handle release, implicit capture absent=%s',
    async (implicitRelease) => {
      const { owner, dom, model, resource } = setupResource()
      const queued: (typeof Message.Type)[] = []
      const pending = step(model, down()).model

      const fiber = Effect.runFork(
        Stream.runForEach(
          Stream.mergeAll(
            [
              resource.subscriptions.connectionPointerOwner.dependenciesToStream(
                { instanceId: model.graph.instanceId }
              ),
              subscriptions.pointerEvents.dependenciesToStream(
                subscriptions.pointerEvents.modelToDependencies(pending.graph)
              ),
            ],
            { concurrency: 'unbounded' }
          ),
          (message) =>
            Effect.sync(() => {
              queued.push(message)
            })
        )
      )

      try {
        await Effect.runPromise(Effect.sleep('10 millis'))

        const admittedDown = Option.getOrThrow(
          resource.begin(model.graph, Option.some(down()))
        )

        let reduced = step(model, admittedDown).model
        resource.reconcile(reduced.graph, admittedDown)
        owner.ownerDocument.elementFromPoint = () => owner
        dom.dispatchEvent(syntheticPointer('pointermove', 190, 24))
        await Effect.runPromise(Effect.sleep('10 millis'))
        dom.dispatchEvent(syntheticPointer('pointerup', 190, 24))

        if (implicitRelease) {
          owner.captured = false
        }

        await Effect.runPromise(Effect.sleep('10 millis'))
        expect(
          queued.flatMap((message) =>
            Predicate.isTagged('IgnoreInput')(message) ? [] : [message._tag]
          )
        ).toStrictEqual(['ConnectionPointerMoved', 'PointerReleased'])
        const lifecycle: ReturnType<typeof events> = []

        for (const message of queued) {
          const prepared = Option.getOrThrow(
            resource.prepare(wrapGraphMessage({ message }).message)
          )

          const result = step(reduced, prepared)
          resource.reconcile(result.model.graph, prepared)
          lifecycle.push(...events(result))
          reduced = result.model
        }

        expect(reduced.graph.document.edges).toMatchObject([
          {
            source: 'source',
            sourceHandle: 'out',
            target: 'target',
            targetHandle: 'in',
          },
        ])
        expect(lifecycle).toMatchObject([
          { name: 'onConnectStart' },
          { name: 'onConnectionPreview' },
          { name: 'onConnect' },
          { name: 'onConnectEnd', outcome: 'accepted' },
        ])
      } finally {
        await Effect.runPromise(Fiber.interrupt(fiber))
      }
    }
  )

  it.each([
    { nodeId: 'source', handleId: 'out', deferRelease: false },
    { nodeId: 'source', handleId: 'out', deferRelease: true },
    { nodeId: 'target', handleId: 'in', deferRelease: false },
    { nodeId: 'target', handleId: 'in', deferRelease: true },
  ])(
    'old routed click preserves a new $nodeId lease with reused pointer ID, release also deferred=$deferRelease',
    async ({ nodeId, handleId, deferRelease }) => {
      const { owner, dom, model, resource } = setupResource()
      const queued: (typeof Message.Type)[] = []

      const fiber = Effect.runFork(
        Stream.runForEach(
          resource.subscriptions.connectionPointerOwner.dependenciesToStream({
            instanceId: model.graph.instanceId,
          }),
          (message) =>
            Effect.sync(() => {
              queued.push(message)
            })
        )
      )

      try {
        await Effect.runPromise(Effect.sleep('10 millis'))

        const first = Option.getOrThrow(
          resource.begin(model.graph, Option.some(down()))
        )

        let reduced = step(model, first).model
        resource.reconcile(reduced.graph, first)
        dom.dispatchEvent(syntheticPointer('pointerup'))
        await Effect.runPromise(Effect.sleep('10 millis'))

        if (!deferRelease) {
          for (const message of queued.splice(0)) {
            const prepared = Option.getOrThrow(
              resource.prepare(wrapGraphMessage({ message }).message)
            )

            reduced = step(reduced, prepared).model
            resource.reconcile(reduced.graph, prepared)
          }
        }

        const click = syntheticPointer('click')
        Object.defineProperty(click, 'target', { value: owner })
        dom.dispatchEvent(click)
        await Effect.runPromise(Effect.sleep('10 millis'))
        expect(queued).toHaveLength(deferRelease ? 2 : 1)

        const second = Option.getOrThrow(
          resource.begin(
            reduced.graph,
            Option.some(
              Message.PointerDown({ ...down(), clientX: 11, nodeId, handleId })
            )
          )
        )

        for (const message of queued) {
          const prepared = Option.getOrThrow(
            resource.prepare(wrapGraphMessage({ message }).message)
          )

          const result = step(reduced, prepared)
          expect(events(result)).toMatchObject(
            Predicate.isTagged('RoutedPointerClick')(message)
              ? [{ name: 'onConnectStart' }]
              : []
          )
          reduced = result.model
          resource.reconcile(reduced.graph, prepared)
        }

        expect(owner.captured).toBeTruthy()
        expect(reduced.graph.pointerClickReceipt).toBeNull()

        const prepared = Option.getOrThrow(
          resource.prepare(wrapGraphMessage({ message: second }).message)
        )

        reduced = step(reduced, prepared).model
        resource.reconcile(reduced.graph, prepared)
        expect(reduced.graph.pointerSession?.kind).toBe('connection-pending')
        expect(owner.captured).toBeTruthy()
      } finally {
        await Effect.runPromise(Fiber.interrupt(fiber))
      }
    }
  )

  it.each([
    { previous: 'node', reconnect: false },
    { previous: 'node', reconnect: true },
    { previous: 'pane', reconnect: false },
    { previous: 'pane', reconnect: true },
  ])(
    'round3 queued $previous release permits following connection down, reconnect=$reconnect',
    async ({ previous, reconnect }) => {
      const { owner, dom, model: base, resource } = setupResource()

      const model = {
        ...base,
        graph: {
          ...base.graph,
          document: reconnect ? document : base.graph.document,
          panOnDrag: true,
        },
      }

      const previousDown =
        previous === 'node'
          ? Message.PointerDown({ ...down(), handleId: null })
          : Message.GestureDown({
              pointerId: 1,
              clientX: 10,
              clientY: 20,
              screenX: 10,
              screenY: 20,
              nodeId: null,
              direction: null,
              allowPan: true,
            })

      let reduced = step(model, previousDown).model
      resource.reconcile(reduced.graph, previousDown)

      const previousKind =
        reduced.graph.gestureSession?.kind ?? reduced.graph.pointerSession?.kind

      const queued: (typeof Message.Type)[] = []

      const fiber = Effect.runFork(
        Stream.runForEach(
          Stream.mergeAll(
            [
              resource.subscriptions.connectionPointerOwner.dependenciesToStream(
                {
                  instanceId: reduced.graph.instanceId,
                }
              ),
              subscriptions.pointerEvents.dependenciesToStream(
                subscriptions.pointerEvents.modelToDependencies(reduced.graph)
              ),
            ],
            { concurrency: 'unbounded' }
          ),
          (message) =>
            Effect.sync(() => {
              queued.push(message)
            })
        )
      )

      try {
        await Effect.runPromise(Effect.sleep('10 millis'))
        dom.dispatchEvent(syntheticPointer('pointerup'))
        await Effect.runPromise(Effect.sleep('10 millis'))
        expect({
          previousKind,
          tags: queued.map((message) => message._tag),
        }).toStrictEqual({
          previousKind: previous === 'node' ? 'node-drag' : 'viewport-pan',
          tags: [previous === 'node' ? 'PointerReleased' : 'GestureReleased'],
        })

        const admitted = Option.getOrThrow(
          resource.begin(reduced.graph, Option.some(down(reconnect)))
        )

        const captureStages = [owner.captured]

        for (const message of [...queued, admitted]) {
          const prepared = Option.getOrThrow(
            resource.prepare(wrapGraphMessage({ message }).message)
          )

          reduced = step(reduced, prepared).model
          resource.reconcile(reduced.graph, prepared)
          captureStages.push(owner.captured)
        }

        expect({
          gesture: reduced.graph.gestureSession,
          pointerKind: reduced.graph.pointerSession?.kind,
          captureStages,
        }).toStrictEqual({
          gesture: null,
          pointerKind: reconnect
            ? 'reconnection-pending'
            : 'connection-pending',
          captureStages: [true, true, true],
        })
        const crossing = step(reduced, move(20, 20))
        resource.reconcile(crossing.model.graph)
        expect({
          lifecycle: events(crossing),
          captured: owner.captured,
        }).toMatchObject({
          lifecycle: [
            {
              name: reconnect ? 'onReconnectStart' : 'onConnectStart',
              inputKind: 'pointer',
            },
            {
              name: reconnect ? 'onReconnectPreview' : 'onConnectionPreview',
              x: 90,
              y: 80,
            },
          ],
          captured: true,
        })
        const cancelled = step(crossing.model, Message.CancelGesture({}))
        resource.reconcile(cancelled.model.graph, Message.CancelGesture({}))
        expect(owner.captured).toBeFalsy()
      } finally {
        await Effect.runPromise(Fiber.interrupt(fiber))
      }
    }
  )

  it.each([
    { previous: 'node', reconnect: false },
    { previous: 'node', reconnect: true },
    { previous: 'pane', reconnect: false },
    { previous: 'pane', reconnect: true },
  ])(
    'round3 active $previous rejects connection down and retires only its capture, reconnect=$reconnect',
    ({ previous, reconnect }) => {
      const { owner, model: base, resource } = setupResource()

      const model = {
        ...base,
        graph: {
          ...base.graph,
          document: reconnect ? document : base.graph.document,
          panOnDrag: true,
        },
      }

      const previousDown =
        previous === 'node'
          ? Message.PointerDown({ ...down(), handleId: null })
          : Message.GestureDown({
              pointerId: 1,
              clientX: 10,
              clientY: 20,
              screenX: 10,
              screenY: 20,
              nodeId: null,
              direction: null,
              allowPan: true,
            })

      const active = step(model, previousDown).model
      resource.reconcile(active.graph, previousDown)

      const admitted = Option.getOrThrow(
        resource.begin(active.graph, Option.some(down(reconnect)))
      )

      expect(owner.captured).toBeTruthy()

      const prepared = Option.getOrThrow(
        resource.prepare(wrapGraphMessage({ message: admitted }).message)
      )

      const rejected = step(active, prepared)
      resource.reconcile(rejected.model.graph, prepared)
      expect({
        graphPreserved: rejected.model.graph === active.graph,
        events: events(rejected),
        captured: owner.captured,
        rejectedOrigin: Option.isNone(resource.prepare(admitted)),
      }).toStrictEqual({
        graphPreserved: true,
        events: [],
        captured: false,
        rejectedOrigin: true,
      })
      const released = step(active, Message.CancelGesture({})).model
      resource.reconcile(released.graph, Message.CancelGesture({}))

      const retry = Option.getOrThrow(
        resource.begin(released.graph, Option.some(down(reconnect)))
      )

      const accepted = step(released, retry).model
      resource.reconcile(accepted.graph, retry)
      expect({
        kind: accepted.graph.pointerSession?.kind,
        captured: owner.captured,
      }).toStrictEqual({
        kind: reconnect ? 'reconnection-pending' : 'connection-pending',
        captured: true,
      })
      resource.reconcile(
        step(accepted, Message.CancelGesture({})).model.graph,
        Message.CancelGesture({})
      )
      expect(owner.captured).toBeFalsy()
    }
  )

  it('qualified Escape queued after a native click settles the click source after receipt consumption', async () => {
    const { owner, dom, model, resource } = setupResource()
    const queued: (typeof Message.Type)[] = []

    const fiber = Effect.runFork(
      Stream.runForEach(
        resource.subscriptions.connectionPointerOwner.dependenciesToStream({
          instanceId: model.graph.instanceId,
        }),
        (message) =>
          Effect.sync(() => {
            queued.push(message)
          })
      )
    )

    try {
      await Effect.runPromise(Effect.sleep('10 millis'))

      const admitted = Option.getOrThrow(
        resource.begin(model.graph, Option.some(down()))
      )

      let reduced = step(model, admitted).model
      resource.reconcile(reduced.graph, admitted)
      dom.dispatchEvent(syntheticPointer('pointerup'))
      const click = syntheticPointer('click')
      Object.defineProperty(click, 'target', { value: owner })
      dom.dispatchEvent(click)
      dom.dispatchEvent(
        Object.defineProperty(
          new Event('keydown', { cancelable: true }),
          'key',
          { value: 'Escape' }
        )
      )
      await Effect.runPromise(Effect.sleep('10 millis'))
      expect(queued.map((message) => message._tag)).toStrictEqual([
        'PointerReleased',
        'RoutedPointerClick',
        'CancelGesture',
      ])
      const lifecycle: ReturnType<typeof events> = []

      for (const message of queued) {
        const prepared = Option.getOrThrow(
          resource.prepare(wrapGraphMessage({ message }).message)
        )

        const result = step(reduced, prepared)
        lifecycle.push(...events(result))
        reduced = result.model
        resource.reconcile(reduced.graph, prepared)
      }

      expect(reduced.graph.keyboardConnectionSession).toBeNull()
      expect(reduced.graph.pointerClickReceipt).toBeNull()
      expect(lifecycle).toMatchObject([
        { name: 'onConnectStart', inputKind: 'click' },
        { name: 'onConnectEnd', inputKind: 'click', outcome: 'cancelled' },
      ])
      expect(owner.captured).toBeFalsy()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
