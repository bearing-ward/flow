import { decodeFlowDocument } from '@flow/core'
import { Effect, Exit, Option, Scope, Stream } from 'effect'
import { vi } from 'vitest'

import { initialModel, update, wrapGraphMessage } from './application.ts'
import { createPointerResource, defaultInteractionOptions } from './graph.ts'
import type { GraphMessageData } from './graph.ts'

export class TestElement extends EventTarget {
  captured = false
  captureFailure: 'throw' | 'false' | undefined
  isConnected = true
  bounds = { left: 0, top: 0 }
  clientWidth = 800
  clientHeight = 600
  dataset: DOMStringMap = {}
  parent: TestElement | null = null
  children: TestElement[] = []
  ownerDocument = { elementFromPoint: (): TestElement | null => null }
  getBoundingClientRect() {
    return this.bounds
  }
  setPointerCapture() {
    if (this.captureFailure === 'throw') {
      throw new Error('synthetic capture failure')
    }

    this.captured = this.captureFailure !== 'false'
  }
  hasPointerCapture() {
    return this.captured
  }
  releasePointerCapture() {
    this.captured = false
  }
  contains(target: TestElement): boolean {
    return (
      target === this || this.children.some((child) => child.contains(target))
    )
  }
  querySelectorAll(): TestElement[] {
    return this.children
      .flatMap((child) => [child, ...child.querySelectorAll()])
      .filter((child) => child.dataset.handleId !== undefined)
  }
  querySelector(): TestElement | null {
    return (
      this.children.find(
        (child) => child.dataset.flowDragHandle !== undefined
      ) ?? null
    )
  }
  closest(selector: string): TestElement | null {
    if (selector === '.flow-foldkit-canvas') {
      return this.parent === null ? this : this.parent.closest(selector)
    }

    if (selector === '[data-node-id]') {
      return this.dataset.nodeId === undefined
        ? (this.parent?.closest(selector) ?? null)
        : this
    }

    if (selector === '[data-edge-endpoint]') {
      return this.dataset.edgeEndpoint === undefined ? null : this
    }

    if (selector === '[data-resize-direction]') {
      return this.dataset.resizeDirection === undefined ? null : this
    }

    if (selector === '[data-handle-id]') {
      return this.dataset.handleId === undefined ? null : this
    }

    if (selector.startsWith('[data-handle-id],')) {
      return this.dataset.handleId === undefined &&
        this.dataset.resizeDirection === undefined &&
        this.dataset.edgeEndpoint === undefined
        ? null
        : this
    }

    return null
  }
}

export const fixtureDocument = Effect.runSync(
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
    edges: [],
  })
)

export const pointerEvent = (
  type: string,
  clientX = 10,
  clientY = 20,
  pointerId = 1
) =>
  Object.defineProperties(new Event(type), {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY },
    detail: { value: 1 },
  })

const collect = (stream: Stream.Stream<GraphMessageData>, count: number) =>
  Effect.runPromise(stream.pipe(Stream.take(count), Stream.runCollect))

export const setupPointer = (threshold = 5) => {
  const canvas = new TestElement()
  const node = new TestElement()
  node.dataset = { nodeId: 'source' }
  node.parent = canvas
  const handle = new TestElement()
  handle.dataset = { handleId: 'out' }
  handle.parent = node
  node.children = [handle]
  const targetNode = new TestElement()
  targetNode.dataset = { nodeId: 'target' }
  targetNode.parent = canvas
  const targetHandle = new TestElement()
  targetHandle.dataset = { handleId: 'in' }
  targetHandle.parent = targetNode
  targetNode.children = [targetHandle]
  const resize = new TestElement()
  resize.dataset = { resizeDirection: 'bottom-right' }
  resize.parent = node
  node.children.push(resize)
  const reconnect = new TestElement()
  reconnect.dataset = { edgeId: 'edge', edgeEndpoint: 'target' }
  reconnect.parent = canvas
  canvas.children = [node, targetNode, reconnect]
  canvas.ownerDocument.elementFromPoint = () => node
  const dom = new EventTarget()
  Object.assign(dom, {
    querySelector: () => canvas,
  })
  const windowOwner = new EventTarget()
  vi.stubGlobal('window', windowOwner)
  vi.stubGlobal(
    'addEventListener',
    windowOwner.addEventListener.bind(windowOwner)
  )
  vi.stubGlobal(
    'removeEventListener',
    windowOwner.removeEventListener.bind(windowOwner)
  )
  // This fixture proves pointer FIFO; real animation frames are exercised in e2e.
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1)
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('document', dom)
  vi.stubGlobal('CSS', { escape: (value: string) => value })
  vi.stubGlobal('Node', TestElement)
  vi.stubGlobal('Element', TestElement)
  vi.stubGlobal('HTMLElement', TestElement)
  vi.stubGlobal('PointerEvent', Event)

  let model = initialModel(
    fixtureDocument,
    { x: 0, y: 0, zoom: 1 },
    [],
    undefined,
    'full',
    {
      ...defaultInteractionOptions,
      nodeDragThreshold: threshold,
      connectionDragThreshold: threshold,
      panOnDrag: true,
      nodesResizable: true,
    }
  )

  const resource = createPointerResource(model.graph)
  const scope = Effect.runSync(Scope.make())

  const acquire = () =>
    Effect.runSync(
      resource.acquire.pipe(Effect.provideService(Scope.Scope, scope))
    )

  const begin = (target = node, x = 10, y = 20) =>
    resource.begin({ button: 0, pointerId: 1, clientX: x, clientY: y, target })

  const process = (message: GraphMessageData) => {
    const wrapped = wrapGraphMessage({ message })
    const prepared = resource.prepare(wrapped.message)

    if (Option.isNone(prepared)) {
      return
    }

    const result = update(model, wrapGraphMessage({ message: prepared.value }))
    resource.reconcile({
      previous: model.graph,
      current: result.model.graph,
      message: prepared.value,
      nativeBarrier: result.nativeBarrier,
    })
    ;({ model } = result)

    return result
  }

  const dispose = () => Effect.runPromise(Scope.close(scope, Exit.void))

  return {
    canvas,
    node,
    handle,
    targetNode,
    targetHandle,
    resize,
    reconnect,
    dom,
    windowOwner,
    resource,
    accept: (next: typeof model) => {
      resource.reconcile({ previous: model.graph, current: next.graph })
      model = next
    },
    acquire,
    begin,
    process,
    collect,
    dispose,
    model: () => model,
  }
}
