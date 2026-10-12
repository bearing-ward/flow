import {
  decodeFlowDocument,
  NodeIdSchema,
  HandleIdSchema,
  EdgeIdSchema,
} from '@flow/core'
import { Effect, Fiber, Option, Stream } from 'effect'
import { beforeAll, afterAll, vi, describe, expect, it } from 'vitest'

import { AppMessage, initialModel, update } from './application.ts'
import {
  Message,
  defaultInteractionOptions,
  createConnectionPointerResource,
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

class TestElement extends EventTarget {
  captured = false
  isConnected = true
  bounds = { left: 0, top: 0 }
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

    return this.dataset.handleId === undefined ? null : this
  }
}

const syntheticPointer = (type: string) =>
  Object.defineProperties(new Event(type), {
    pointerId: { value: 1 },
    detail: { value: 1 },
    clientX: { value: 10 },
    clientY: { value: 20 },
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
  const model = initial(8)
  const resource = createConnectionPointerResource(model.graph)

  return { owner, dom, windowOwner, model, resource }
}

describe('connectionDragThreshold repair native resource with controlled deferred reduction and synthetic DOM events', () => {
  afterAll(() => vi.unstubAllGlobals())

  it('unrelated update before down reduction preserves synchronous acquisition', () => {
    const { owner, model, resource } = setupResource()
    expect(
      Option.isSome(resource.begin(model.graph, Option.some(down())))
    ).toBeTruthy()
    expect(owner.captured).toBeTruthy()
    resource.reconcile(step(model, Message.PruneMeasurements({})).model.graph)
    expect(owner.captured).toBeTruthy()
    expect(Option.isSome(resource.prepare(down()))).toBeTruthy()
  })

  it('rejected queued down retires acquisition and rejects late events', () => {
    const { owner, model, resource } = setupResource()
    resource.begin(model.graph, Option.some(down()))

    const replaced = step(
      model,
      Message.ReplaceDocument({ document: { nodes: [], edges: [] } })
    ).model

    resource.reconcile(replaced.graph)
    const rejected = step(replaced, down()).model
    resource.reconcile(rejected.graph, down())
    expect(owner.captured).toBeFalsy()
    expect(Option.isNone(resource.prepare(down()))).toBeTruthy()
  })

  it.each([
    Message.CancelGesture({}),
    Message.PointerCancelled({ pointerId: 1 }),
    Message.ReplaceDocument({ document: { nodes: [], edges: [] } }),
    Message.ReplaceViewport({ viewport: { x: 1, y: 2, zoom: 1 } }),
  ])('cancellation retires awaiting acquisition $_tag', (message) => {
    const { owner, model, resource } = setupResource()
    resource.begin(model.graph, Option.some(down()))
    const cancelled = step(model, message)
    resource.reconcile(cancelled.model.graph, message)
    expect(owner.captured).toBeFalsy()
    expect(Option.isNone(resource.prepare(down()))).toBeTruthy()
  })

  it.each(['blur', 'pointercancel'])(
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
        await Effect.runPromise(Effect.sleep('1 millis'))
        resource.begin(model.graph, Option.some(down()))

        if (kind === 'blur') {
          windowOwner.dispatchEvent(new Event('blur'))
        } else {
          dom.dispatchEvent(syntheticPointer('pointercancel'))
        }

        await Effect.runPromise(Effect.sleep('1 millis'))
        expect(queued).toHaveLength(1)
        let reduced = step(model, down()).model
        resource.reconcile(reduced.graph, down())

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
        await Effect.runPromise(Effect.sleep('1 millis'))
        resource.begin(model.graph, Option.some(down()))
        const admitted = step(model, down()).model

        if (!deferDown) {
          resource.reconcile(admitted.graph, down())
        }

        dom.dispatchEvent(syntheticPointer('pointerup'))
        const click = syntheticPointer('click')
        Object.defineProperty(click, 'target', { value: owner })
        const stopped = vi.spyOn(click, 'stopImmediatePropagation')
        dom.dispatchEvent(click)
        await Effect.runPromise(Effect.sleep('1 millis'))
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
          resource.reconcile(admitted.graph, down())
        }

        let reduced = admitted
        const lifecycle: ReturnType<typeof events> = []

        for (const message of queued) {
          const prepared = resource.prepare(message)

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
})
