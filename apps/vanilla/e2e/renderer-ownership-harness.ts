import {
  Context,
  Effect,
  Logger,
  Option,
  Predicate,
  References,
  Schema,
  Tracer,
} from 'effect'

import type { FlowChange } from '../../../packages/core/dist/public.js'
import {
  NodeIdSchema,
  XYPositionSchema,
} from '../../../packages/core/dist/public.js'
import {
  dispatchPointer,
  mountedGeometry,
  reentryDocument,
  reentryRoot,
  requiredElement,
  syntheticCaptures,
} from '../../shared-e2e/node-reentry-fixture.ts'
import { FlowBrowserLive } from '../src/flow-browser.ts'
import { createFlow, createFlowHost } from '../src/mount-flow.ts'
import type {
  FlowController,
  FlowNodeRenderer,
  FlowEdgeRenderer,
} from '../src/mount-flow.ts'

/**
 * These ownership proofs predate Plan 105's renderer props, which have their
 * own e2e coverage; record the original context fields only.
 */
const withoutRendererProps = <Context extends object>(context: Context) => {
  if (!('props' in context)) {
    return context
  }

  const { props: _props, ...rest } = context

  return rest
}

const heldResizeObserver = (NativeObserver: typeof ResizeObserver) =>
  class extends NativeObserver {
    constructor(deliverResize: ResizeObserverCallback) {
      super(() => {
        void deliverResize
      })
    }
  }

const scopeKeys = (value: { readonly state: unknown }): unknown[] => {
  const { state } = value

  if (!Predicate.isTagged(state, 'Open')) {
    return []
  }

  return [
    ...('finalizerKey' in state && state.finalizerKey !== undefined
      ? [state.finalizerKey]
      : []),
    ...('finalizers' in state && state.finalizers instanceof Map
      ? state.finalizers.keys()
      : []),
  ]
}

const scopeRecorder = (labelOverrides?: readonly string[]) => {
  const scopes: {
    value: { readonly state: unknown }
    label: string
    parent: number | undefined
    key: unknown
  }[] = []

  const labels = labelOverrides ?? [
    'host',
    'renderer',
    'browser',
    'a-renderer',
    'a-browser',
    'b-renderer',
    'b-browser',
    'c-renderer',
    'c-browser',
    'edge-renderer',
  ]

  const run = <A>(effect: Effect.Effect<A>): A => {
    const before = scopes.map((scope) => scopeKeys(scope.value))
    const value = Effect.runSync(effect)

    if (
      Predicate.hasProperty(value, 'state') &&
      Predicate.hasProperty(value, 'strategy')
    ) {
      const index = scopes.length
      let parent: number | undefined
      let key: unknown

      for (const [candidate, scope] of scopes.entries()) {
        const added = scopeKeys(scope.value).find(
          (keyInput) => !before[candidate]?.includes(keyInput)
        )

        if (added !== undefined) {
          parent = candidate
          key = added
          break
        }
      }

      scopes.push({
        value,
        label: labels[index] ?? `frame-${index - 9}`,
        parent,
        key,
      })
    }

    return value
  }

  const snapshot = () =>
    scopes.map((scope) => {
      const { state } = scope.value

      if (!Predicate.isObject(state) || !('_tag' in state)) {
        throw new Error('Invalid observed Scope state')
      }

      const parent =
        scope.parent === undefined ? undefined : scopes[scope.parent]

      return {
        label: scope.label,
        state: Predicate.isTagged(state, 'Closed') ? 'closed' : 'open',
        parent: parent?.label ?? null,
        linked:
          parent === undefined
            ? false
            : scopeKeys(parent.value).includes(scope.key),
      }
    })

  return { run, snapshot }
}

export const continuationRoundFourAcquisition = async (
  mode:
    | 'cancel-registering'
    | 'scheduled-sample'
    | 'executing-sample'
    | 'early'
    | 'destroy-registering'
    | 'request-throw'
    | 'delivery-cancel-throw'
    | 'gesture-cancel-throw'
    | 'start-throw'
    | 'error-handler-throw'
    | 'telemetry-throw'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const scopes = scopeRecorder()
  const events: { name: string; payload: unknown }[] = []

  const native: {
    op: string
    handle?: number
    timestamp?: number
    message?: string
  }[] = []

  const errors: {
    channel: string
    message: string
    containsSentinel: boolean
  }[] = []

  const pending = new Map<number, FrameRequestCallback>()
  const saved = new Map<number, FrameRequestCallback>()
  let armed = false
  let reentered = false
  let sequence = 100

  const callbackMode =
    mode === 'start-throw' ||
    mode === 'error-handler-throw' ||
    mode === 'telemetry-throw'

  const sentinel = new Error(
    (() => {
      if (callbackMode) {
        return 'node-start'
      }

      if (mode === 'request-throw') {
        return 'node-raf'
      }

      return 'node-cancel'
    })()
  )

  const telemetryError = new Error('telemetry')
  const handlerError = new Error('error-handler')
  const errorCallbacks: { message: string; same: boolean }[] = []

  const logs: {
    message: unknown
    // eslint-disable-next-line anti-slop/no-shape-in-symbol-names -- Effect names its public service value extractor Shape.
    attributes: Context.Service.Shape<typeof References.CurrentLogAnnotations>
    span: string | null
  }[] = []

  let telemetryFailed = false

  const logger = Logger.make(({ message, fiber }) => {
    const span = Context.getOption(fiber.context, Tracer.ParentSpan)
    logs.push({
      message:
        Array.isArray(message) && message.length === 1 ? message[0] : message,
      attributes: fiber.getRef(References.CurrentLogAnnotations),
      span:
        Option.isSome(span) && Predicate.isTagged(span.value, 'Span')
          ? span.value.name
          : null,
    })
  })

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const send = (type: string, x: number) =>
    requiredElement(root, '[data-node-id="a"]').dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        buttons: 1,
        pointerId: 7,
        clientX: x,
        clientY: 200,
      })
    )

  const error = (channel: string, cause: unknown) => {
    const message = cause instanceof Error ? cause.message : String(cause)
    errors.push({
      channel,
      message,
      containsSentinel: message.includes(
        mode === 'telemetry-throw' ? telemetryError.message : sentinel.message
      ),
    })
  }

  const windowError = (event: ErrorEvent) => {
    error('native-event', event.error)
    event.preventDefault()
  }

  globalThis.addEventListener('error', windowError)

  const controller = await Effect.runPromise(
    createFlowHost(root, reentryDocument(), {
      documentMode: 'uncontrolled',
      nodesResizable: true,
      nodeDragThreshold: 0,
      selectNodesOnDrag: false,
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.25, maxZoom: 4 },
      },
      runEffect: scopes.run,
      runTelemetry: (effect) => {
        if (!callbackMode) {
          return
        }

        Effect.runSync(
          effect.pipe(
            Effect.provide(Logger.layer([logger])),
            Effect.provideService(References.MinimumLogLevel, 'Error')
          )
        )

        if (mode === 'telemetry-throw' && logs.length > 0 && !telemetryFailed) {
          telemetryFailed = true
          throw telemetryError
        }
      },
      onError: (callbackError) => {
        errorCallbacks.push({
          message: callbackError.message,
          same: callbackError === sentinel,
        })

        if (mode === 'error-handler-throw') {
          throw handlerError
        }
      },
      onNodeDragStart: (value) => {
        record('nodeStart', value)

        if (callbackMode) {
          throw sentinel
        }
      },
      onNodeDrag: (value) => record('nodeMove', value),
      onNodeDragStop: (value) => record('nodeStop', value),
      onMove: (value) => {
        record('move', value)

        if (
          armed &&
          mode === 'executing-sample' &&
          value.viewport.x === -15 &&
          !reentered
        ) {
          reentered = true
          send('pointermove', 980)
        }
      },
    }).pipe(Effect.provide(FlowBrowserLive))
  )

  await mountedGeometry()
  const capture = syntheticCaptures(root)
  const a = requiredElement(root, '[data-node-id="a"]')
  const b = requiredElement(root, '[data-node-id="b"]')
  const viewport = requiredElement(root, '.flow-viewport')

  if (
    !(
      a instanceof HTMLElement &&
      b instanceof HTMLElement &&
      viewport instanceof HTMLElement
    )
  ) {
    throw new TypeError('Missing exact retained DOM')
  }

  const publications: { name: string; payload: unknown }[] = []
  let accepted = controller.getSnapshot()
  controller.subscribe((payload) =>
    publications.push({ name: 'change', payload: structuredClone(payload) })
  )
  controller.subscribeState((payload) => {
    accepted = payload.current
    publications.push({ name: 'state', payload: structuredClone(payload) })
  })
  const nativeFrame = globalThis.requestAnimationFrame
  const nativeCancel = globalThis.cancelAnimationFrame

  const checkpoints: {
    phase: string
    scopes: ReturnType<typeof scopes.snapshot>
    a: string
    dragging: boolean
    viewport: string
    held: number
    pending: number[]
    state: ReturnType<FlowController['getSnapshot']>
    accepted: ReturnType<FlowController['getSnapshot']>
    captures: typeof capture.history
    publications: typeof publications
  }[] = []

  const checkpoint = (phase: string) =>
    checkpoints.push({
      phase,
      scopes: scopes.snapshot(),
      a: a.style.transform,
      dragging: a.classList.contains('dragging'),
      viewport: viewport.style.transform,
      held: capture.count(),
      pending: [...pending.keys()],
      state: structuredClone(controller.getSnapshot()),
      accepted: structuredClone(accepted),
      captures: structuredClone(capture.history),
      publications: structuredClone(publications),
    })

  try {
    globalThis.requestAnimationFrame = (deliverFrame) => {
      if (mode === 'request-throw') {
        native.push({ op: 'request-throw', message: 'node-raf' })
        throw sentinel
      }

      sequence += 1
      const handle = sequence
      pending.set(handle, deliverFrame)
      saved.set(handle, deliverFrame)

      if (
        handle === 101 &&
        (mode === 'cancel-registering' ||
          mode === 'destroy-registering' ||
          mode === 'early')
      ) {
        native.push({ op: 'request-enter', handle })
        checkpoint('registering')

        if (mode === 'early') {
          native.push({ op: 'early-deliver', handle, timestamp: 100 })
          deliverFrame(100)
        } else if (mode === 'destroy-registering') {
          controller.destroy()
        } else {
          send('pointercancel', 995)
        }

        checkpoint('before-handle-return')
        native.push({ op: 'return-handle', handle })
      } else {
        native.push({ op: 'request', handle })
      }

      return handle
    }

    globalThis.cancelAnimationFrame = (handle) => {
      pending.delete(handle)

      if (
        !reentered &&
        (mode === 'delivery-cancel-throw' || mode === 'gesture-cancel-throw')
      ) {
        reentered = true
        native.push({ op: 'cancel-throw', handle, message: 'node-cancel' })
        throw sentinel
      }

      native.push({ op: 'cancel', handle })
    }

    armed = true
    send('pointerdown', 650)

    if (mode !== 'telemetry-throw') {
      send('pointermove', 995)
    }

    if (mode === 'scheduled-sample') {
      send('pointermove', 990)
    }

    checkpoint('before-delivery')

    if (
      mode === 'scheduled-sample' ||
      mode === 'executing-sample' ||
      mode === 'delivery-cancel-throw'
    ) {
      const deliverFrame = pending.get(101)
      pending.delete(101)
      native.push({ op: 'deliver', handle: 101, timestamp: 100 })

      try {
        deliverFrame?.(100)
      } catch (cleanupError) {
        error('frame', cleanupError)
      }
    }

    checkpoint('after-delivery')

    if (mode !== 'cancel-registering' && mode !== 'destroy-registering') {
      send('pointercancel', 995)
    }

    checkpoint('cancelled')

    const beforeReplay = {
      events: structuredClone(events),
      native: structuredClone(native),
      scopes: scopes.snapshot(),
    }

    for (const deliverFrame of saved.values()) {
      deliverFrame(200)
      deliverFrame(300)
    }

    const afterReplay = {
      events: structuredClone(events),
      native: structuredClone(native),
      scopes: scopes.snapshot(),
    }

    await controller.destroyAsync()
    checkpoint('destroyed')
    await controller.destroyAsync()

    return {
      events,
      native,
      errors,
      logs,
      errorCallbacks,
      captures: capture.history,
      checkpoints,
      beforeReplay,
      afterReplay,
      state: structuredClone(controller.getSnapshot()),
      pixels: {
        a: a.style.transform,
        b: b.style.transform,
        dragging: a.classList.contains('dragging'),
        viewport: viewport.style.transform,
      },
      connected: root.contains(a),
      pending: [...pending.keys()],
    }
  } finally {
    globalThis.requestAnimationFrame = nativeFrame
    globalThis.cancelAnimationFrame = nativeCancel
    globalThis.removeEventListener('error', windowError)
    await controller.destroyAsync()
    root.remove()
  }
}

export const continuationRoundFourRenderer = async (
  kind: 'node' | 'edge-geometry' | 'edge-factory',
  action: 'replace' | 'destroy' | 'throw' = 'replace'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const nativeAppend = SVGElement.prototype.append
  const anchorGroups: SVGElement[] = []
  SVGElement.prototype.append = function append(...nodes) {
    nativeAppend.call(this, ...nodes)

    if (this.classList.contains('flow-edge-anchor-group')) {
      anchorGroups.push(this)
    }
  }

  const retained: {
    name: string
    owner: Element | null
    anchors: SVGElement | null
  }[] = []

  const retainedSnapshot = () =>
    retained.map(({ name, owner, anchors }) => ({
      name,
      connected: owner?.isConnected ?? false,
      transform: owner instanceof HTMLElement ? owner.style.transform : null,
      path: owner?.querySelector('.flow-edge-path')?.getAttribute('d') ?? null,
      anchors:
        anchors === null
          ? []
          : [
              ...anchors.querySelectorAll<SVGElement>(
                '.flow-edge-reconnect-anchor'
              ),
            ].map((anchor) => ({
              endpoint: anchor.dataset.endpoint,
              x: anchor.getAttribute('cx'),
              y: anchor.getAttribute('cy'),
            })),
    }))

  const nativeObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = heldResizeObserver(nativeObserver)
  const nativeFrame = globalThis.requestAnimationFrame
  const nativeCancel = globalThis.cancelAnimationFrame
  const pending = new Map<number, FrameRequestCallback>()
  const frames: { op: string; handle: number; timestamp?: number }[] = []

  const hooks: {
    hook: string
    node?: unknown
    edge?: unknown
    context?: unknown
    endpoints?: unknown
    instance?: string
    container?: string
    value?: unknown
  }[] = []

  const publicEvents: { name: string; payload: unknown }[] = []
  const errors: { message: string; sameCause: boolean }[] = []
  const containers: { name: string; element: Element }[] = []

  const scopes = scopeRecorder(
    kind === 'node'
      ? [
          'host',
          'renderer',
          'browser',
          'c-renderer',
          'c-browser',
          'A-renderer',
          'A-browser',
          'B-renderer',
          'B-browser',
          'b-renderer',
          'b-browser',
          'edge-renderer',
        ]
      : [
          'host',
          'renderer',
          'browser',
          'c-renderer',
          'c-browser',
          'a-renderer',
          'a-browser',
          'b-renderer',
          'b-browser',
          'A-edge',
          'B-edge',
        ]
  )

  let toolbars:
    | Parameters<
        NonNullable<Parameters<typeof createFlowHost>[2]['onToolbarAnchors']>
      >[0]
    | null = null

  let controller: FlowController | undefined
  let armed = false
  let entered = false
  let sequence = 400
  const sentinel = new Error('renderer-hook')
  const base = reentryDocument()

  const off = {
    ...base,
    nodes: base.nodes.map((node) => ({
      ...node,
      ...(() => {
        if (node.id === 'a') {
          return kind === 'node'
            ? { position: { x: -2000, y: 20 }, type: 'A' }
            : { position: { x: -2000, y: 20 } }
        }

        if (node.id === 'b') {
          return { position: { x: -1800, y: 20 } }
        }

        return {}
      })(),
    })),
    edges: base.edges.map((edge) =>
      kind === 'node' ? { ...edge } : { ...edge, type: 'A' }
    ),
  }

  const replacement = {
    ...base,
    nodes: base.nodes.map((node) =>
      node.id === 'a' && kind === 'node' ? { ...node, type: 'B' } : node
    ),
    edges: base.edges.map((edge) =>
      kind === 'node' ? edge : { ...edge, type: 'B' }
    ),
  }

  const shutdownCheckpoints: {
    phase: string
    scopes: ReturnType<typeof scopes.snapshot>
    retained: ReturnType<typeof retainedSnapshot>
  }[] = []

  const recordShutdown = (phase: string) =>
    shutdownCheckpoints.push({
      phase,
      scopes: scopes.snapshot(),
      retained: retainedSnapshot(),
    })

  const reenter = () => {
    if (!armed || entered || controller === undefined) {
      return
    }

    entered = true

    if (action === 'throw') {
      throw sentinel
    }

    if (action === 'destroy') {
      recordShutdown('before-destroy')
      hooks.push({ hook: 'destroy-host' })
      controller.destroy()
      recordShutdown('after-destroy')
    } else {
      controller.update(replacement)
    }
  }

  const nodeRenderer: FlowNodeRenderer = (node, container) => {
    const instance = node.type ?? 'default'
    const name = `N_${instance}`
    containers.push({ name, element: container })
    retained.push({ name, owner: container.parentElement, anchors: null })
    container.textContent = instance
    hooks.push({
      hook: 'factory-enter',
      node: structuredClone(node),
      container: name,
    })

    if (instance === 'A') {
      reenter()
    }

    hooks.push({ hook: 'factory-return', instance, container: name })

    if (action === 'destroy') {
      recordShutdown('factory-return')
    }

    return {
      update: (nodeInput) =>
        hooks.push({
          hook: 'update',
          node: structuredClone(nodeInput),
          instance,
          container: name,
        }),
      destroy: () => hooks.push({ hook: 'destroy', instance, container: name }),
    }
  }

  const edgeRenderer: FlowEdgeRenderer = {
    geometry: (edge, endpoints) => {
      hooks.push({
        hook: 'geometry',
        edge: structuredClone(edge),
        endpoints: structuredClone(endpoints),
      })

      if (kind === 'edge-geometry' && edge.type === 'A') {
        reenter()

        const value = {
          pathData: 'M 1,1L 2,2',
          labelAnchor: { x: 1.5, y: 1.5 },
        }

        hooks.push({ hook: 'geometry-return', instance: 'A', value })

        return value
      }

      return {
        pathData: `M ${endpoints.source.x},${endpoints.source.y}L ${endpoints.target.x},${endpoints.target.y}`,
        labelAnchor: {
          x: (endpoints.source.x + endpoints.target.x) / 2,
          y: (endpoints.source.y + endpoints.target.y) / 2,
        },
      }
    },
    render: (edge, context, container) => {
      const instance = edge.type ?? 'default'
      const name = `E_${instance}`
      containers.push({ name, element: container })
      retained.push({
        name,
        owner: container.parentElement,
        anchors: anchorGroups.at(-1) ?? null,
      })
      container.textContent = instance
      hooks.push({
        hook: 'factory-enter',
        edge: structuredClone(edge),
        context: structuredClone(withoutRendererProps(context)),
        container: name,
      })

      if (kind === 'edge-factory' && instance === 'A') {
        reenter()
      }

      hooks.push({ hook: 'factory-return', instance, container: name })

      if (action === 'destroy') {
        recordShutdown('factory-return')
      }

      return {
        update: (edgeInput, contextInput) =>
          hooks.push({
            hook: 'update',
            edge: structuredClone(edgeInput),
            context: structuredClone(withoutRendererProps(contextInput)),
            instance,
            container: name,
          }),
        destroy: () =>
          hooks.push({ hook: 'destroy', instance, container: name }),
      }
    },
  }

  const snapshot = () => ({
    retained: retainedSnapshot(),
    toolbars,
    minimap: [
      ...root.querySelectorAll<SVGElement>(
        '.flow-minimap-node, .flow-minimap-viewport'
      ),
    ].map((element) => ({
      nodeId: element.dataset.nodeId ?? null,
      x: element.getAttribute('x'),
      y: element.getAttribute('y'),
      width: element.getAttribute('width'),
      height: element.getAttribute('height'),
    })),
    hooks: structuredClone(hooks),
    publicEvents: structuredClone(publicEvents),
    frames: structuredClone(frames),
    scopes: scopes.snapshot(),
    containers: containers.map(({ name, element }) => ({
      name,
      connected: element.isConnected,
      text: element.textContent,
      parentTransform:
        element.parentElement instanceof HTMLElement
          ? element.parentElement.style.transform
          : null,
    })),
    a:
      root.querySelector<HTMLElement>('.flow-node[data-node-id="a"]')?.style
        .transform ?? null,
    b:
      root.querySelector<HTMLElement>('.flow-node[data-node-id="b"]')?.style
        .transform ?? null,
    path:
      root
        .querySelector('[data-edge-id="edge"] .flow-edge-path')
        ?.getAttribute('d') ?? null,
    anchors: [
      ...root.querySelectorAll<SVGElement>(
        '[data-edge-id="edge"] .flow-edge-reconnect-anchor'
      ),
    ].map((element) => ({
      endpoint: element.dataset.endpoint,
      x: element.getAttribute('cx'),
      y: element.getAttribute('cy'),
    })),
    state: controller?.getSnapshot(),
    internals: ['a', 'b', 'c'].map((id) => controller?.getInternalNode(id)),
  })

  try {
    controller = await Effect.runPromise(
      createFlowHost(root, off, {
        documentMode: 'uncontrolled',
        nodesResizable: true,
        ui: { minimap: true },
        onToolbarAnchors: (value) => {
          toolbars = structuredClone(value)
        },
        renderOnlyVisible: true,
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.25, maxZoom: 4 },
        },
        runEffect: scopes.run,
        runTelemetry: (effect) => {
          void effect
        },
        nodeRenderers:
          kind === 'node' ? { A: nodeRenderer, B: nodeRenderer } : undefined,
        edgeRenderers:
          kind === 'node' ? undefined : { A: edgeRenderer, B: edgeRenderer },
      }).pipe(Effect.provide(FlowBrowserLive))
    )
    controller.subscribe((change) =>
      publicEvents.push({ name: 'change', payload: structuredClone(change) })
    )
    controller.subscribeState((change) =>
      publicEvents.push({
        name: 'acceptedState',
        payload: structuredClone(change),
      })
    )
    const canvas = requiredElement(root, '.flow-canvas')

    if (!(canvas instanceof HTMLElement)) {
      throw new TypeError('Missing canvas')
    }

    canvas.style.cssText =
      'position:relative;width:1000px;height:600px;margin:0;border:0;padding:0'
    armed = true

    try {
      controller.dispatch({
        kind: 'set-node-position',
        nodeId: NodeIdSchema.make('a'),
        position: { x: 20, y: 20 },
      })
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : String(error),
        sameCause: error === sentinel,
      })
    }

    const initial = snapshot()

    const rects: {
      nodeId: string | undefined
      handleId: string | undefined
      x: number
      y: number
      width: number
      height: number
      rectCount: number
    }[] = []

    let refresh: Awaited<
      ReturnType<FlowController['updateNodeInternals']>
    > | null = null

    let measured = initial

    if (action === 'replace') {
      for (const node of root.querySelectorAll<HTMLElement>('.flow-node')) {
        node.style.border = '0'
        node.style.padding = '0'
        node.style.margin = '0'
        node.style.boxSizing = 'border-box'

        for (const handle of node.querySelectorAll<HTMLElement>(
          '.flow-handle'
        )) {
          handle.style.cssText = `box-sizing:border-box;width:11px;height:11px;margin:0;top:17px;transform:none;right:auto;bottom:auto;left:${handle.dataset.handleId === 'out' ? 138 : 1}px`
          const rect = handle.getBoundingClientRect()
          rects.push({
            nodeId: node.dataset.nodeId,
            handleId: handle.dataset.handleId,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            rectCount: handle.getClientRects().length,
          })
        }
      }

      globalThis.requestAnimationFrame = (deliverFrame) => {
        sequence += 1
        const handle = sequence
        pending.set(handle, deliverFrame)
        frames.push({ op: 'request', handle })

        return handle
      }

      globalThis.cancelAnimationFrame = (handle) => {
        pending.delete(handle)
        frames.push({ op: 'cancel', handle })
      }

      const refreshed = controller.updateNodeInternals(['a', 'b', 'c'])
      const deliverFrame = pending.get(401)
      pending.delete(401)
      frames.push({ op: 'deliver', handle: 401, timestamp: 100 })
      deliverFrame?.(100)
      refresh = await refreshed
      measured = snapshot()
    }

    const firstDestroy = controller.destroyAsync()
    const sameDestroy = firstDestroy === controller.destroyAsync()
    await firstDestroy

    return {
      initial,
      shutdownCheckpoints,
      measured,
      final: snapshot(),
      rects,
      refresh,
      errors,
      sameDestroy,
      pending: [...pending.keys()],
    }
  } finally {
    armed = false
    await controller?.destroyAsync()
    SVGElement.prototype.append = nativeAppend
    globalThis.ResizeObserver = nativeObserver
    globalThis.requestAnimationFrame = nativeFrame
    globalThis.cancelAnimationFrame = nativeCancel
    root.remove()
  }
}

// eslint-disable-next-line complexity -- Each fault branch preserves its actual acquisition, direct or queued error channel.
export const continuationRoundFourReadyRenderer = async (
  kind: 'node' | 'edge-geometry' | 'edge-update',
  action:
    | 'throw'
    | 'replace'
    | 'remove'
    | 'remove-replace'
    | 'queued'
    | 'queued-throw'
    | 'destroy-throw'
    | 'throw-cleanup'
    | 'factory-throw'
    | 'remove-throw'
    | 'state-listener'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const nativeObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = heldResizeObserver(nativeObserver)
  const nativeFrame = globalThis.requestAnimationFrame
  const nativeCancel = globalThis.cancelAnimationFrame
  const frames: { op: string; handle: number; timestamp?: number }[] = []
  const callbacks = new Map<number, FrameRequestCallback>()

  const hooks: {
    hook: string
    node?: unknown
    edge?: unknown
    context?: unknown
    endpoints?: unknown
    instance?: string
  }[] = []

  const events: { name: string; payload: unknown }[] = []

  const errors: {
    same: boolean
    cause: boolean
    message: string
    aggregate: boolean
  }[] = []

  const aggregateErrors: {
    primary: boolean
    secondary: boolean
    cause: boolean
  }[] = []

  const scopes = scopeRecorder([
    'host',
    'renderer',
    'browser',
    'a-renderer',
    'a-browser',
    'b-renderer',
    'b-browser',
    'c-renderer',
    'c-browser',
    'edge-renderer',
    ...(() => {
      if (kind === 'node') {
        return ['B-renderer', 'B-browser']
      }

      if (action === 'remove-replace') {
        return [
          'new-a-renderer',
          'new-a-browser',
          'new-b-renderer',
          'new-b-browser',
          'B-edge',
        ]
      }

      return ['B-edge']
    })(),
  ])

  const destroyPhases: {
    instance: string
    scopes: ReturnType<ReturnType<typeof scopeRecorder>['snapshot']>
    rootChildren: number
  }[] = []

  const containers: {
    instance: string
    element: Element
    owner: Element | null
  }[] = []

  const primary = new Error('renderer-primary')
  const cleanup = new Error('renderer-cleanup')
  let controller: FlowController | undefined
  let armed = false
  let entered = false
  let sequence = 500
  let telemetryCalls = 0

  const logs: {
    message: unknown
    // eslint-disable-next-line anti-slop/no-shape-in-symbol-names -- Effect names its public service value extractor Shape.
    attributes: Context.Service.Shape<typeof References.CurrentLogAnnotations>
    span: string | null
  }[] = []

  const logger = Logger.make(({ message, fiber }) => {
    const span = Context.getOption(fiber.context, Tracer.ParentSpan)
    logs.push({
      message:
        Array.isArray(message) && message.length === 1 ? message[0] : message,
      attributes: fiber.getRef(References.CurrentLogAnnotations),
      span:
        Option.isSome(span) && Predicate.isTagged(span.value, 'Span')
          ? span.value.name
          : null,
    })
  })

  const base = reentryDocument()

  const initial = {
    ...base,
    nodes: base.nodes.map((node) =>
      (() => {
        if (node.id === 'a' && kind === 'node') {
          return node.id === 'b' &&
            (action === 'remove' ||
              action === 'remove-replace' ||
              action === 'remove-throw')
            ? { ...node, type: 'A', position: { x: -1800, y: 20 } }
            : { ...node, type: 'A' }
        }

        return node.id === 'b' &&
          (action === 'remove' ||
            action === 'remove-replace' ||
            action === 'remove-throw')
          ? { ...node, position: { x: -1800, y: 20 } }
          : { ...node }
      })()
    ),
    edges: base.edges.map((edge) =>
      kind === 'node' ? edge : { ...edge, type: 'A' }
    ),
  }

  const replacement = {
    ...base,
    nodes: base.nodes.map((node) =>
      node.id === 'a' && kind === 'node' ? { ...node, type: 'B' } : node
    ),
    edges: base.edges.map((edge) =>
      kind === 'node' ? edge : { ...edge, type: 'B' }
    ),
  }

  const outer = {
    ...initial,
    nodes: initial.nodes.map((node) =>
      node.id === 'a' ? { ...node, label: 'next' } : node
    ),
  }

  const reenter = () => {
    if (!armed || entered) {
      return
    }

    entered = true

    if (action === 'throw' || action === 'throw-cleanup') {
      throw primary
    }

    if (action !== 'remove' && action !== 'destroy-throw') {
      controller?.update(replacement)
    }
  }

  const destroy = (instance: string) => {
    hooks.push({ hook: 'destroy', instance })
    destroyPhases.push({
      instance,
      scopes: scopes.snapshot(),
      rootChildren: root.childElementCount,
    })

    if (armed && instance === 'A') {
      if (
        action === 'throw-cleanup' ||
        action === 'destroy-throw' ||
        action === 'remove-throw'
      ) {
        throw cleanup
      }

      if (action === 'remove-replace') {
        reenter()
      }
    }
  }

  const nodeRenderer: FlowNodeRenderer = (node, element) => {
    const instance = node.type ?? 'default'
    containers.push({ instance, element, owner: element.parentElement })
    hooks.push({ hook: 'factory', node: structuredClone(node), instance })

    if (
      armed &&
      (action === 'queued-throw' || action === 'factory-throw') &&
      instance === 'B'
    ) {
      throw primary
    }

    return {
      update: (nodeInput) => {
        hooks.push({
          hook: 'update',
          node: structuredClone(nodeInput),
          instance,
        })

        if (
          instance === 'A' &&
          action !== 'remove' &&
          action !== 'remove-replace'
        ) {
          reenter()
        }

        hooks.push({ hook: 'update-return', instance })
      },
      destroy: () => destroy(instance),
    }
  }

  const edgeRenderer: FlowEdgeRenderer = {
    geometry: (edge, endpoints) => {
      hooks.push({
        hook: 'geometry',
        edge: structuredClone(edge),
        endpoints: structuredClone(endpoints),
      })

      if (
        kind === 'edge-geometry' &&
        edge.type === 'A' &&
        action !== 'remove' &&
        action !== 'remove-replace'
      ) {
        reenter()
      }

      return {
        pathData: `M ${endpoints.source.x},${endpoints.source.y}L ${endpoints.target.x},${endpoints.target.y}`,
        labelAnchor: {
          x: (endpoints.source.x + endpoints.target.x) / 2,
          y: (endpoints.source.y + endpoints.target.y) / 2,
        },
      }
    },
    render: (edge, context, element) => {
      const instance = edge.type ?? 'default'
      containers.push({ instance, element, owner: element.parentElement })
      hooks.push({
        hook: 'factory',
        edge: structuredClone(edge),
        context: structuredClone(withoutRendererProps(context)),
        instance,
      })

      if (
        armed &&
        (action === 'queued-throw' || action === 'factory-throw') &&
        instance === 'B'
      ) {
        throw primary
      }

      return {
        update: (edgeInput, contextInput) => {
          hooks.push({
            hook: 'update',
            edge: structuredClone(edgeInput),
            context: structuredClone(withoutRendererProps(contextInput)),
            instance,
          })

          if (kind === 'edge-update' && instance === 'A') {
            reenter()
          }

          hooks.push({ hook: 'update-return', instance })
        },
        destroy: () => destroy(instance),
      }
    },
  }

  const snapshot = () => ({
    hooks: structuredClone(hooks),
    events: structuredClone(events),
    scopes: scopes.snapshot(),
    frames: structuredClone(frames),
    state: structuredClone(controller?.getSnapshot()),
    containers: containers.map(({ instance, element, owner }) => ({
      instance,
      connected: element.isConnected,
      transform: owner instanceof HTMLElement ? owner.style.transform : null,
      path: owner?.querySelector('.flow-edge-path')?.getAttribute('d') ?? null,
    })),
    path: root.querySelector('.flow-edge-path')?.getAttribute('d') ?? null,
    a:
      root.querySelector<HTMLElement>('.flow-node[data-node-id="a"]')?.style
        .transform ?? null,
  })

  try {
    controller = await Effect.runPromise(
      createFlowHost(root, initial, {
        documentMode: 'uncontrolled',
        nodesResizable: true,
        renderOnlyVisible: true,
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.25, maxZoom: 4 },
        },
        runEffect: scopes.run,
        runTelemetry: (effect) => {
          if (armed) {
            telemetryCalls += 1
            const previousLogCount = logs.length
            Effect.runSync(
              effect.pipe(
                Effect.provide(Logger.layer([logger])),
                Effect.provideService(References.MinimumLogLevel, 'Error')
              )
            )

            if (action === 'state-listener' && logs.length > previousLogCount) {
              throw new Error('telemetry')
            }
          }
        },
        onError: (error) =>
          events.push({ name: 'onError', payload: String(error) }),
        nodeRenderers:
          kind === 'node' ? { A: nodeRenderer, B: nodeRenderer } : undefined,
        edgeRenderers:
          kind === 'node' ? undefined : { A: edgeRenderer, B: edgeRenderer },
      }).pipe(Effect.provide(FlowBrowserLive))
    )
    const canvas = requiredElement(root, '.flow-canvas')

    if (!(canvas instanceof HTMLElement)) {
      throw new TypeError('Missing canvas')
    }

    canvas.style.cssText =
      'position:relative;width:1000px;height:600px;margin:0;border:0;padding:0'

    for (const node of root.querySelectorAll<HTMLElement>('.flow-node')) {
      node.style.border = '0'
      node.style.padding = '0'
      node.style.margin = '0'

      for (const handle of node.querySelectorAll<HTMLElement>('.flow-handle')) {
        handle.style.cssText = `box-sizing:border-box;width:11px;height:11px;margin:0;top:17px;transform:none;right:auto;bottom:auto;left:${handle.dataset.handleId === 'out' ? 138 : 1}px`
      }
    }

    globalThis.requestAnimationFrame = (deliverFrame) => {
      sequence += 1
      const handle = sequence
      callbacks.set(handle, deliverFrame)
      frames.push({ op: 'request', handle })

      return handle
    }

    globalThis.cancelAnimationFrame = (handle) => {
      callbacks.delete(handle)
      frames.push({ op: 'cancel', handle })
    }

    const refresh = controller.updateNodeInternals(['a', 'b', 'c'])
    const deliver = callbacks.get(501)
    callbacks.delete(501)
    frames.push({ op: 'deliver', handle: 501, timestamp: 100 })
    deliver?.(100)
    await refresh
    const before = snapshot()
    hooks.length = 0
    frames.length = 0
    controller.subscribe((change) =>
      events.push({ name: 'change', payload: structuredClone(change) })
    )

    if (action === 'state-listener') {
      controller.subscribeState((change) => {
        events.push({
          name: 'firstSubscriber',
          payload: structuredClone(change),
        })
        throw new Error('state-listener')
      })
      controller.subscribeState((change) =>
        events.push({
          name: 'secondSubscriber',
          payload: structuredClone(change),
        })
      )
    } else {
      controller.subscribeState((change) =>
        events.push({ name: 'acceptedState', payload: structuredClone(change) })
      )
    }

    armed = true

    try {
      if (action === 'factory-throw' || action === 'state-listener') {
        controller.update(replacement)
      } else if (action === 'queued' || action === 'queued-throw') {
        controller.update(outer)
      } else if (action === 'destroy-throw') {
        await controller.destroyAsync()
      } else {
        controller.dispatch({
          kind: 'set-node-position',
          nodeId: NodeIdSchema.make('a'),
          position: {
            x:
              action === 'remove' ||
              action === 'remove-replace' ||
              action === 'remove-throw'
                ? -2000
                : 40,
            y: 20,
          },
        })
      }
    } catch (error) {
      if (error instanceof AggregateError) {
        aggregateErrors.push({
          primary: error.errors[0] === primary,
          secondary: error.errors[1] === cleanup,
          cause: error.cause === primary,
        })
      }

      errors.push({
        same: error === primary,
        cause: error instanceof Error && error.cause === primary,
        message: error instanceof Error ? error.message : String(error),
        aggregate: error instanceof AggregateError,
      })
    }

    const after = snapshot()
    let measured = after

    if (action === 'replace') {
      for (const node of root.querySelectorAll<HTMLElement>('.flow-node')) {
        node.style.border = '0'
        node.style.padding = '0'
        node.style.margin = '0'

        for (const handle of node.querySelectorAll<HTMLElement>(
          '.flow-handle'
        )) {
          handle.style.cssText = `box-sizing:border-box;width:11px;height:11px;margin:0;top:17px;transform:none;right:auto;bottom:auto;left:${handle.dataset.handleId === 'out' ? 138 : 1}px`
        }
      }

      const refreshed = controller.updateNodeInternals(['a', 'b', 'c'])
      const deliverRefresh = callbacks.get(502)
      callbacks.delete(502)
      frames.push({ op: 'deliver', handle: 502, timestamp: 200 })
      deliverRefresh?.(200)
      await refreshed
      measured = snapshot()
    }

    armed = false
    const first = controller.destroyAsync()
    const sameDestroy = first === controller.destroyAsync()
    await first

    return {
      before,
      after,
      measured,
      logs,
      final: snapshot(),
      errors,
      aggregateErrors,
      sameDestroy,
      destroyPhases,
      telemetryCalls,
      pending: [...callbacks.keys()],
    }
  } finally {
    armed = false
    await controller?.destroyAsync()
    globalThis.ResizeObserver = nativeObserver
    globalThis.requestAnimationFrame = nativeFrame
    globalThis.cancelAnimationFrame = nativeCancel
    root.remove()
  }
}

export const continuationRoundFourMountError = async (
  kind: 'node' | 'edge-geometry' | 'edge-factory'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const sentinel = new Error('mount-hook')
  const scopes = scopeRecorder()

  const hooks: {
    hook: string
    node?: unknown
    edge?: unknown
    context?: unknown
    endpoints?: unknown
  }[] = []

  const base = reentryDocument()

  const input = {
    ...base,
    nodes: base.nodes.map((node) =>
      node.id === 'a' && kind === 'node' ? { ...node, type: 'A' } : node
    ),
    edges: base.edges.map((edge) =>
      kind === 'node' ? edge : { ...edge, type: 'A' }
    ),
  }

  let returned = false
  let failure: { same: boolean; message: string } | null = null

  try {
    await Effect.runPromise(
      createFlowHost(root, input, {
        documentMode: 'uncontrolled',
        nodesResizable: true,
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.25, maxZoom: 4 },
        },
        runEffect: scopes.run,
        runTelemetry: (effect) => {
          void effect
        },
        nodeRenderers: {
          A: (node) => {
            hooks.push({ hook: 'factory', node: structuredClone(node) })
            throw sentinel
          },
        },
        edgeRenderers: {
          A: {
            geometry: (edge, endpoints) => {
              hooks.push({
                hook: 'geometry',
                edge: structuredClone(edge),
                endpoints: structuredClone(endpoints),
              })

              if (kind === 'edge-geometry') {
                throw sentinel
              }

              return {
                pathData: `M ${endpoints.source.x},${endpoints.source.y}L ${endpoints.target.x},${endpoints.target.y}`,
                labelAnchor: { x: 195, y: 42.5 },
              }
            },
            render: (edge, context) => {
              hooks.push({
                hook: 'factory',
                edge: structuredClone(edge),
                context: structuredClone(withoutRendererProps(context)),
              })
              throw sentinel
            },
          },
        },
      }).pipe(Effect.provide(FlowBrowserLive))
    )
    returned = true
  } catch (error) {
    failure = {
      same: error === sentinel,
      message: error instanceof Error ? error.message : String(error),
    }
  } finally {
    root.remove()
  }

  return {
    returned,
    failure,
    hooks,
    scopes: scopes.snapshot(),
    children: root.childElementCount,
  }
}

export const continuationRoundFourResizeRestoration = async (
  keyboard: boolean
) => {
  const root = reentryRoot()

  interface ResizeProbe {
    observe?: () => void
  }

  const probe: ResizeProbe = {}
  const observations: unknown[] = []
  const events: { name: string; payload: unknown }[] = []

  const controller = await createFlow(root, reentryDocument(), {
    documentMode: 'uncontrolled',
    nodesResizable: true,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    onToolbarAnchors: () => {
      probe.observe?.()
    },
  })

  const node = requiredElement(root, '[data-node-id="b"]')

  if (!(node instanceof HTMLElement)) {
    throw new TypeError('Missing node')
  }

  const handle = requiredElement(node, '[data-direction="right"]')
  const capture = syntheticCaptures(root)

  const snapshot = () => ({
    styles: {
      width: node.style.width,
      height: node.style.height,
      minWidth: node.style.minWidth,
      maxWidth: node.style.maxWidth,
      minHeight: node.style.minHeight,
      maxHeight: node.style.maxHeight,
      boxSizing: node.style.boxSizing,
      transform: node.style.transform,
    },
    resizing: node.classList.contains('resizing'),
    dataResizing: node.dataset.resizing,
    capture: capture.count(),
    dimensions: {
      width: controller.getInternalNode('b')?.width,
      height: controller.getInternalNode('b')?.height,
    },
  })

  try {
    await mountedGeometry()
    node.style.border = '0'
    node.style.padding = '0'
    node.style.width = '177px'
    node.style.height = '61px'
    node.style.boxSizing = 'content-box'
    node.style.minWidth = '40px'
    node.style.maxWidth = '300px'
    node.style.minHeight = '17px'
    node.style.maxHeight = '90px'
    await controller.updateNodeInternals(['b'])
    controller.subscribe((value) =>
      events.push({ name: 'change', payload: structuredClone(value) })
    )
    controller.subscribeState((value) =>
      events.push({ name: 'acceptedState', payload: structuredClone(value) })
    )
    const before = snapshot()

    if (keyboard) {
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' })
      )
    } else {
      dispatchPointer(handle, 'pointerdown', { x: 500, y: 200 })
      dispatchPointer(node, 'pointermove', { x: 512, y: 200 })
    }

    const preview = snapshot()
    probe.observe = () => {
      observations.push(snapshot())
    }

    node.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })
    )
    const after = snapshot()
    delete probe.observe
    const state = structuredClone(controller.getSnapshot())
    await controller.destroyAsync()

    return {
      before,
      preview,
      after,
      observations,
      events,
      state,
      captures: capture.history,
      connected: node.isConnected,
    }
  } finally {
    delete probe.observe
    await controller.destroyAsync()
    root.remove()
  }
}

export const ownershipRoundFiveProjection = async (
  route:
    | 'plain'
    | 'node-update'
    | 'edge-geometry'
    | 'edge-update'
    | 'offscreen-control'
    | 'cancel-control'
    | 'cancel-restore'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const nativeObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = heldResizeObserver(nativeObserver)

  const hooks: {
    hook: string
    id: string
    input?: unknown
    context?: unknown
  }[] = []

  const events: { name: string; payload: unknown }[] = []
  const states: unknown[] = []
  const changes: FlowChange[] = []
  let controller: Awaited<ReturnType<typeof createFlow>> | undefined
  let armed = false
  let entered = false

  const visibility =
    route === 'offscreen-control' || route.startsWith('cancel-')

  const reenter = (hook: string) => {
    if (armed && !entered && hook === route) {
      entered = true
      hooks.push({ hook: 'viewport-reentry', id: hook })
      controller?.updateViewport({ x: 7, y: 9, zoom: 1 })
    }
  }

  const nodeRenderer: FlowNodeRenderer = (node, container) => {
    hooks.push({
      hook: 'node-factory',
      id: node.id,
      input: structuredClone(node),
    })
    container.textContent = node.label

    return {
      update: (value) => {
        hooks.push({
          hook: 'node-update',
          id: value.id,
          input: structuredClone(value),
        })
        container.textContent = value.label

        if (value.id === 'a') {
          reenter('node-update')
        }
      },
      destroy: () => {
        hooks.push({ hook: 'node-destroy', id: node.id })
      },
    }
  }

  const edgeRenderer: FlowEdgeRenderer = {
    render: (edge, context) => {
      hooks.push({
        hook: 'edge-factory',
        id: edge.id,
        input: structuredClone(edge),
        context: structuredClone(withoutRendererProps(context)),
      })

      return {
        update: (value, nextContext) => {
          hooks.push({
            hook: 'edge-update',
            id: value.id,
            input: structuredClone(value),
            context: structuredClone(withoutRendererProps(nextContext)),
          })
          reenter('edge-update')
        },
        destroy: () => {
          hooks.push({ hook: 'edge-destroy', id: edge.id })
        },
      }
    },
  }

  Object.defineProperty(edgeRenderer, 'geometry', {
    value: (
      edge: Parameters<NonNullable<FlowEdgeRenderer['geometry']>>[0],
      context: Parameters<NonNullable<FlowEdgeRenderer['geometry']>>[1]
    ) => {
      hooks.push({
        hook: 'edge-geometry',
        id: edge.id,
        input: structuredClone(edge),
        context: structuredClone(context),
      })
      reenter('edge-geometry')
    },
  })
  const initial = reentryDocument()

  const input = {
    ...initial,
    edges: initial.edges.map((edge) => ({
      ...edge,
      label: 'edge-label',
      type: visibility ? undefined : 'probe',
    })),
  }

  try {
    controller = await createFlow(root, input, {
      documentMode: 'uncontrolled',
      nodesResizable: true,
      renderOnlyVisible: visibility,
      panOnScroll: true,
      panOnScrollSpeed: 1,
      nodeDragThreshold: 0,
      nodeRenderers: visibility ? undefined : { default: nodeRenderer },
      edgeRenderers: visibility ? undefined : { probe: edgeRenderer },
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.25, maxZoom: 4 },
      },
      onNodeDragStart: (payload) =>
        events.push({ name: 'nodeStart', payload: structuredClone(payload) }),
      onNodeDrag: (payload) =>
        events.push({ name: 'nodeMove', payload: structuredClone(payload) }),
      onNodeDragStop: (payload) => {
        events.push({ name: 'nodeStop', payload: structuredClone(payload) })

        if (armed && !entered && route === 'cancel-restore') {
          entered = true
          controller?.updateViewport({ x: 0, y: 0, zoom: 1 })
          events.push({
            name: 'restored',
            payload: structuredClone(controller?.getSnapshot()),
          })
        }
      },
    })
    const active = controller
    await mountedGeometry()
    const canvas = requiredElement(root, '.flow-canvas')

    if (!(canvas instanceof HTMLElement)) {
      throw new TypeError('Missing canvas')
    }

    canvas.style.cssText =
      'position:relative;width:1000px;height:600px;margin:0;border:0;padding:0'
    const capture = syntheticCaptures(root)
    const oldNode = requiredElement(root, '[data-node-id="a"]')
    const oldEdge = requiredElement(root, '.flow-edge-group')

    const sourceAnchor = requiredElement(
      root,
      '.flow-edge-reconnect-anchor[data-endpoint="source"]'
    )

    const targetAnchor = requiredElement(
      root,
      '.flow-edge-reconnect-anchor[data-endpoint="target"]'
    )

    const label = requiredElement(root, '.flow-edge-label')
    const layer = requiredElement(root, '.flow-viewport')
    active.subscribe((value) => changes.push(structuredClone(value)))
    active.subscribeState((value) => states.push(structuredClone(value)))

    const snapshot = () => ({
      state: structuredClone(active.getSnapshot()),
      events: structuredClone(events),
      states: structuredClone(states),
      changes: structuredClone(changes),
      hooks: structuredClone(hooks),
      captures: structuredClone(capture.history),
      held: capture.count(),
      nodes: [...root.querySelectorAll<HTMLElement>('.flow-node')].map(
        (node) => ({ id: node.dataset.nodeId, transform: node.style.transform })
      ),
      edgeCount: root.querySelectorAll('.flow-edge-group').length,
      labelCount: root.querySelectorAll('.flow-edge-label').length,
      retained: {
        nodeConnected: oldNode.isConnected,
        edgeConnected: oldEdge.isConnected,
        sameNode: root.querySelector('[data-node-id="a"]') === oldNode,
        sameEdge: root.querySelector('.flow-edge-group') === oldEdge,
        nodeTransform:
          oldNode instanceof HTMLElement ? oldNode.style.transform : null,
        path: oldEdge.querySelector('.flow-edge-path')?.getAttribute('d'),
        source: {
          x: sourceAnchor.getAttribute('cx'),
          y: sourceAnchor.getAttribute('cy'),
        },
        target: {
          x: targetAnchor.getAttribute('cx'),
          y: targetAnchor.getAttribute('cy'),
        },
        label: { x: label.getAttribute('x'), y: label.getAttribute('y') },
      },
      viewport: layer instanceof HTMLElement ? layer.style.transform : null,
    })

    hooks.length = 0

    if (visibility && route !== 'offscreen-control') {
      dispatchPointer(oldNode, 'pointerdown', { x: 95, y: 42 })
      dispatchPointer(oldNode, 'pointermove', { x: 105, y: 42 })
    }

    armed = true

    if (visibility) {
      canvas.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          clientX: 600,
          clientY: 300,
          deltaX: 2000,
          deltaY: 0,
        })
      )
    } else {
      active.dispatch({
        kind: 'set-node-position',
        nodeId: 'a',
        position: { x: 40, y: 20 },
      })
    }

    const afterDispatch = snapshot()
    await mountedGeometry()
    const afterBarrier = snapshot()
    await active.destroyAsync()

    return { afterDispatch, afterBarrier, afterDestroy: snapshot() }
  } finally {
    await controller?.destroyAsync()
    globalThis.ResizeObserver = nativeObserver
    root.remove()
  }
}

export const ownershipRoundSixAcquisition = async (
  mode:
    | 'plain-reveal'
    | 'listen-throw'
    | 'observe-throw'
    | 'listen-cleanup-throw'
    | 'observe-cleanup-throw'
    | 'listen-replace'
    | 'observe-replace'
    | 'listen-replace-throw'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'

  const nativeAdd: (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) => void = EventTarget.prototype.addEventListener

  const nativeRemove: (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ) => void = EventTarget.prototype.removeEventListener

  const nativeFrame = globalThis.requestAnimationFrame
  const nativeCancel = globalThis.cancelAnimationFrame
  const frames: { op: string; handle: number }[] = []
  globalThis.requestAnimationFrame = (deliverFrame) => {
    const handle = nativeFrame(deliverFrame)
    frames.push({ op: 'request', handle })

    return handle
  }

  globalThis.cancelAnimationFrame = (handle) => {
    frames.push({ op: 'cancel', handle })
    nativeCancel(handle)
  }

  const NativeObserver = globalThis.ResizeObserver

  const scopes = scopeRecorder([
    'host',
    'renderer',
    'browser',
    'b-renderer',
    'b-browser',
    'c-renderer',
    'c-browser',
    'A-renderer',
    'A-browser',
    'B-renderer',
    'B-browser',
  ])

  const operations: { op: string; type?: string; id?: string }[] = []
  const publications: { name: string; payload: unknown }[] = []
  const events: { name: string; payload: unknown }[] = []
  const live = new Map<string, EventListenerOrEventListenerObject | null>()

  const sentinel = new Error(
    mode.startsWith('listen') ? 'acquire-listen-throw' : 'acquire-observe-throw'
  )

  const secondary = new Error('acquire-cleanup-throw')

  const successorLive = new Map<
    string,
    EventListenerOrEventListenerObject | null
  >()

  const successorOperations: { op: string; type?: string }[] = []
  let successorElement: HTMLElement | null = null

  const successorSnapshot = () => ({
    operations: structuredClone(successorOperations),
    live: [...successorLive.keys()],
    connected: successorElement?.isConnected ?? false,
    transform: successorElement?.style.transform ?? null,
  })

  let returnedElement: HTMLElement | null = null
  let controller: FlowController | undefined
  let accepted: ReturnType<FlowController['getSnapshot']> | undefined
  const capture = syntheticCaptures(root)

  const snapshot = () => ({
    operations: structuredClone(operations),
    scopes: scopes.snapshot(),
    live: [...live.keys()],
    connected: returnedElement?.isConnected ?? false,
    transform: returnedElement?.style.transform ?? null,
    nodes: [...root.querySelectorAll<HTMLElement>('.flow-node')].map(
      (node) => node.dataset.nodeId
    ),
    state: structuredClone(controller?.getSnapshot()),
    accepted: structuredClone(accepted),
    publications: structuredClone(publications),
    events: structuredClone(events),
    frames: structuredClone(frames),
    captures: structuredClone(capture.history),
    held: capture.count(),
  })

  const checkpoints: { phase: string; value: ReturnType<typeof snapshot> }[] =
    []

  const checkpoint = (phase: string) =>
    checkpoints.push({ phase, value: snapshot() })

  const isA = (target: EventTarget) => target === returnedElement

  const replace = () => {
    const base = reentryDocument()
    controller?.update({
      ...base,
      edges: [],
      nodes: base.nodes.map((node) =>
        node.id === 'a' ? { ...node, type: 'B' } : node
      ),
    })
    checkpoint('successor-adopted')
  }

  EventTarget.prototype.addEventListener = function addEventListener(
    type,
    listener,
    options
  ) {
    if (isA(this)) {
      operations.push({ op: 'listen-attempt', type })
      checkpoint(`before-${type}`)

      if (type === 'pointermove') {
        if (mode.startsWith('listen-replace')) {
          replace()
        }

        if (mode.startsWith('listen') && mode !== 'listen-replace') {
          throw sentinel
        }
      }
    }

    if (this === successorElement) {
      successorOperations.push({ op: 'listen-attempt', type })
    }

    nativeAdd.call(this, type, listener, options)

    if (this === successorElement) {
      successorLive.set(type, listener)
      successorOperations.push({ op: 'listen-added', type })
    }

    if (isA(this)) {
      live.set(type, listener)
      operations.push({ op: 'listen-added', type })
    }
  }

  EventTarget.prototype.removeEventListener = function removeEventListener(
    type,
    listener,
    options
  ) {
    nativeRemove.call(this, type, listener, options)

    if (this === successorElement) {
      successorLive.delete(type)
      successorOperations.push({ op: 'listen-removed', type })
    }

    if (isA(this)) {
      if (live.get(type) === listener) {
        live.delete(type)
      }

      operations.push({ op: 'listen-removed', type })

      if (mode.endsWith('cleanup-throw') && type === 'pointerdown') {
        throw secondary
      }
    }
  }

  const nativeObserve = NativeObserver.prototype.observe
  const nativeUnobserve = NativeObserver.prototype.unobserve
  globalThis.ResizeObserver = heldResizeObserver(NativeObserver)
  NativeObserver.prototype.observe = function observe(
    target: Element,
    options?: ResizeObserverOptions
  ) {
    if (isA(target)) {
      operations.push({ op: 'observe-attempt' })
      checkpoint('before-observe')

      if (mode === 'observe-replace') {
        replace()
      } else if (mode.startsWith('observe')) {
        throw sentinel
      }
    }

    if (target === successorElement) {
      successorOperations.push({ op: 'observe-attempt' })
    }

    nativeObserve.call(this, target, options)

    if (target === successorElement) {
      successorOperations.push({ op: 'observe-added' })
    }

    if (isA(target)) {
      operations.push({ op: 'observe-added' })
    }
  }

  NativeObserver.prototype.unobserve = function unobserve(target: Element) {
    nativeUnobserve.call(this, target)

    if (target === successorElement) {
      successorOperations.push({ op: 'unobserve' })
    }

    if (isA(target)) {
      operations.push({ op: 'unobserve' })
    }
  }

  const errors: {
    samePrimary: boolean
    causePrimary: boolean
    primaryFirst: boolean
    secondaryRetained: boolean
    count: number
    message: string
  }[] = []

  const shutdownErrors: string[] = []

  const destroy = async () => {
    try {
      await controller?.destroyAsync()
    } catch (error) {
      shutdownErrors.push(
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  try {
    const base = reentryDocument()

    const off = {
      ...base,
      edges: [],
      nodes: base.nodes.map((node) =>
        node.id === 'a' ? { ...node, position: { x: -2000, y: 20 } } : node
      ),
    }

    const nodeRenderer: FlowNodeRenderer = (node, container) => {
      container.textContent = node.label

      if (node.type === 'B') {
        successorElement = container.parentElement
        successorOperations.push({ op: 'renderer-return' })
      } else if (node.id === 'a') {
        returnedElement = container.parentElement
        checkpoint('factory')
        operations.push({ op: 'renderer-return', id: 'a' })
      }

      return {
        update: (next) => {
          container.textContent = next.label
        },
        destroy: () => {
          if (node.type === 'B') {
            successorOperations.push({ op: 'renderer-destroy' })
          } else {
            operations.push({ op: 'renderer-destroy', id: node.id })
          }
        },
      }
    }

    controller = await Effect.runPromise(
      createFlowHost(root, off, {
        documentMode: 'uncontrolled',
        nodesResizable: true,
        renderOnlyVisible: true,
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.25, maxZoom: 4 },
        },
        runEffect: scopes.run,
        runTelemetry: (effect) => {
          void effect
        },
        nodeRenderers: { default: nodeRenderer, B: nodeRenderer },
        onNodeDragStart: (payload) =>
          events.push({ name: 'nodeStart', payload }),
        onNodeDrag: (payload) => events.push({ name: 'nodeMove', payload }),
        onNodeDragStop: (payload) => events.push({ name: 'nodeStop', payload }),
      }).pipe(Effect.provide(FlowBrowserLive))
    )
    accepted = controller.getSnapshot()
    controller.subscribe((payload) =>
      publications.push({ name: 'change', payload: structuredClone(payload) })
    )
    controller.subscribeState((payload) => {
      accepted = payload.current
      publications.push({ name: 'state', payload: structuredClone(payload) })
    })
    const before = snapshot()

    try {
      controller.dispatch({
        kind: 'set-node-position',
        nodeId: NodeIdSchema.make('a'),
        position: { x: 20, y: 20 },
      })
    } catch (error) {
      errors.push({
        samePrimary: error === sentinel,
        causePrimary: error instanceof Error && error.cause === sentinel,
        primaryFirst:
          error instanceof AggregateError && error.errors[0] === sentinel,
        secondaryRetained:
          error instanceof AggregateError && error.errors[1] === secondary,
        count: error instanceof AggregateError ? error.errors.length : 0,
        message: error instanceof Error ? error.message : String(error),
      })
    }

    const after = snapshot()
    const successorAfter = successorSnapshot()
    await destroy()
    const destroyed = snapshot()
    await destroy()

    return {
      before,
      checkpoints,
      after,
      destroyed,
      repeated: snapshot(),
      errors,
      shutdownErrors,
      successorAfter,
      successorDestroyed: successorSnapshot(),
    }
  } finally {
    try {
      await destroy()
    } finally {
      EventTarget.prototype.addEventListener = nativeAdd
      EventTarget.prototype.removeEventListener = nativeRemove
      NativeObserver.prototype.observe = nativeObserve
      NativeObserver.prototype.unobserve = nativeUnobserve
      globalThis.requestAnimationFrame = nativeFrame
      globalThis.cancelAnimationFrame = nativeCancel
      globalThis.ResizeObserver = NativeObserver
      root.remove()
    }
  }
}

export const ownershipRoundSevenGeometry = async (
  route: 'settled-geometry' | 'settled-visual' | 'inflight-visual'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const nativeObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = heldResizeObserver(nativeObserver)
  const scopes = scopeRecorder()
  const hooks: { hook: string; edge?: unknown; context?: unknown }[] = []
  const publications: { name: string; payload: unknown }[] = []
  const lifecycle: unknown[] = []
  const checkpoints: unknown[] = []
  let controller: FlowController | undefined
  let armed = false

  interface GeometryProbe {
    capture?: () => void
  }

  const probe: GeometryProbe = {}

  const geometry: NonNullable<FlowEdgeRenderer['geometry']> = (
    edge,
    context
  ) => {
    hooks.push({
      hook: 'geometry',
      edge: structuredClone(edge),
      context: structuredClone(context),
    })

    if (armed && route === 'inflight-visual') {
      armed = false
      controller?.updateViewport({ x: 7, y: 9, zoom: 1 })
      probe.capture?.()
    }

    return context.source.x === 195.5
      ? { pathData: 'M 21 22 L 23 24', labelAnchor: { x: 31, y: 33 } }
      : { pathData: 'M 1 2 L 3 4', labelAnchor: { x: 11, y: 13 } }
  }

  const render: NonNullable<FlowEdgeRenderer['render']> = (
    edge,
    context,
    visual
  ) => {
    hooks.push({
      hook: 'render',
      edge: structuredClone(edge),
      context: structuredClone(withoutRendererProps(context)),
    })

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    path.dataset.customPath = 'probe'
    path.setAttribute('d', context.pathData)
    visual.append(path)

    return {
      update: (nextEdge, nextContext) => {
        hooks.push({
          hook: 'update',
          edge: structuredClone(nextEdge),
          context: structuredClone(withoutRendererProps(nextContext)),
        })
        path.setAttribute('d', nextContext.pathData)
      },
      destroy: () => {
        hooks.push({ hook: 'destroy' })
      },
    }
  }

  const renderer: FlowEdgeRenderer =
    route === 'settled-geometry' ? { geometry } : { geometry, render }

  const initial = reentryDocument()

  const input = {
    ...initial,
    edges: initial.edges.map((edge) => ({
      ...edge,
      type: 'probe',
      label: 'edge-label',
    })),
  }

  try {
    controller = await Effect.runPromise(
      createFlowHost(root, input, {
        documentMode: 'uncontrolled',
        nodesResizable: true,
        renderOnlyVisible: false,
        edgeRenderers: { probe: renderer },
        runEffect: scopes.run,
        runTelemetry: (effect) => {
          void effect
        },
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.25, maxZoom: 4 },
        },
        onNodeDragStart: (value) => lifecycle.push(structuredClone(value)),
        onNodeDrag: (value) => lifecycle.push(structuredClone(value)),
        onNodeDragStop: (value) => lifecycle.push(structuredClone(value)),
      }).pipe(Effect.provide(FlowBrowserLive))
    )
    const active = controller
    await mountedGeometry()
    const capture = syntheticCaptures(root)
    const oldNode = requiredElement(root, '[data-node-id="a"]')
    const oldEdge = requiredElement(root, '.flow-edge-group')
    const path = requiredElement(oldEdge, '.flow-edge-path')
    const hit = requiredElement(oldEdge, '.flow-edge-hit')

    const source = requiredElement(
      root,
      '.flow-edge-reconnect-anchor[data-endpoint="source"]'
    )

    const target = requiredElement(
      root,
      '.flow-edge-reconnect-anchor[data-endpoint="target"]'
    )

    const label = requiredElement(root, '.flow-edge-label')
    const custom = oldEdge.querySelector('[data-custom-path]')
    const viewport = requiredElement(root, '.flow-viewport')
    active.subscribe((value) =>
      publications.push({ name: 'change', payload: structuredClone(value) })
    )
    active.subscribeState((value) =>
      publications.push({ name: 'state', payload: structuredClone(value) })
    )

    const snapshot = () => ({
      state: structuredClone(active.getSnapshot()),
      hooks: structuredClone(hooks),
      publications: structuredClone(publications),
      lifecycle: structuredClone(lifecycle),
      captures: structuredClone(capture.history),
      held: capture.count(),
      scopes: scopes.snapshot(),
      retained: {
        node: root.querySelector('[data-node-id="a"]') === oldNode,
        edge: root.querySelector('.flow-edge-group') === oldEdge,
        path: root.querySelector('.flow-edge-path') === path,
        hit: root.querySelector('.flow-edge-hit') === hit,
        label: root.querySelector('.flow-edge-label') === label,
        custom: root.querySelector('[data-custom-path]') === custom,
        source:
          root.querySelector(
            '.flow-edge-reconnect-anchor[data-endpoint="source"]'
          ) === source,
        target:
          root.querySelector(
            '.flow-edge-reconnect-anchor[data-endpoint="target"]'
          ) === target,
      },
      pixels: {
        path: path.getAttribute('d'),
        hit: hit.getAttribute('d'),
        custom: custom?.getAttribute('d') ?? null,
        display: path.getAttribute('display'),
        source: { x: source.getAttribute('cx'), y: source.getAttribute('cy') },
        target: { x: target.getAttribute('cx'), y: target.getAttribute('cy') },
        label: {
          x: label.getAttribute('x'),
          y: label.getAttribute('y'),
          left: label instanceof HTMLElement ? label.style.left : null,
          top: label instanceof HTMLElement ? label.style.top : null,
        },
        node: oldNode instanceof HTMLElement ? oldNode.style.transform : null,
        viewport:
          viewport instanceof HTMLElement ? viewport.style.transform : null,
      },
      counts: {
        nodes: root.querySelectorAll('.flow-node').length,
        edges: root.querySelectorAll('.flow-edge-group').length,
        labels: root.querySelectorAll('.flow-edge-label').length,
      },
    })

    probe.capture = () => {
      checkpoints.push(snapshot())
    }

    const initialHooks = structuredClone(hooks)
    hooks.length = 0
    const before = snapshot()
    armed = true

    if (route === 'inflight-visual') {
      active.dispatch({
        kind: 'set-node-position',
        nodeId: NodeIdSchema.make('a'),
        position: { x: 40, y: 20 },
      })
    } else {
      active.updateViewport({ x: 7, y: 9, zoom: 1 })
    }

    const after = snapshot()
    await mountedGeometry()
    const afterBarrier = snapshot()
    await active.destroyAsync()

    return {
      initialHooks,
      before,
      checkpoints,
      after,
      afterBarrier,
      afterDestroy: {
        hooks: structuredClone(hooks),
        scopes: scopes.snapshot(),
        nodeConnected: oldNode.isConnected,
        edgeConnected: oldEdge.isConnected,
        customConnected: custom?.isConnected ?? false,
        publications: structuredClone(publications),
        lifecycle: structuredClone(lifecycle),
        captures: structuredClone(capture.history),
        held: capture.count(),
      },
    }
  } finally {
    delete probe.capture
    await controller?.destroyAsync()
    globalThis.ResizeObserver = nativeObserver
    root.remove()
  }
}

export const ownershipRoundSevenCurrency = async (
  kind: 'geometry' | 'render',
  type: 'explicit' | 'defaulted'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const nativeObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = heldResizeObserver(nativeObserver)
  const scopes = scopeRecorder()
  const hooks: { hook: string; context?: unknown }[] = []
  const publications: { name: string; payload: unknown }[] = []
  let armed = false
  let replaced = false
  let controller: FlowController | undefined

  const initialGeometry = {
    pathData: 'M 1 2 L 3 4',
    labelAnchor: { x: 11, y: 13 },
  }

  const currentGeometry = {
    pathData: 'M 50 60 L 70 80',
    labelAnchor: { x: 61, y: 71 },
  }

  const replacement: NonNullable<FlowEdgeRenderer['geometry']> = (
    _edge,
    context
  ) => {
    hooks.push({
      hook: 'current-geometry',
      context: structuredClone(context),
    })

    return currentGeometry
  }

  const replacementRender: NonNullable<FlowEdgeRenderer['render']> = () => {
    hooks.push({ hook: 'replacement-render' })

    return {
      update: () => {
        hooks.push({ hook: 'replacement-update' })
      },
      destroy: () => {
        hooks.push({ hook: 'replacement-destroy' })
      },
    }
  }

  const renderer = {
    geometry: (_edge, context) => {
      let hook = 'initial-geometry'

      if (armed) {
        hook = replaced ? 'current-geometry' : 'stale-geometry'
      }

      hooks.push({
        hook,
        context: structuredClone(withoutRendererProps(context)),
      })

      if (!armed) {
        return initialGeometry
      }

      if (replaced) {
        return currentGeometry
      }

      replaced = true

      if (kind === 'geometry') {
        renderer.geometry = replacement
      } else {
        renderer.render = replacementRender
      }

      return { pathData: 'M 90 91 L 92 93', labelAnchor: { x: 94, y: 95 } }
    },
    render: (_edge, context, visual) => {
      hooks.push({
        hook: 'original-render',
        context: structuredClone(withoutRendererProps(context)),
      })

      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      )

      path.dataset.currencyPath = 'original'
      path.setAttribute('d', context.pathData)
      visual.append(path)

      return {
        update: (_next, nextContext) => {
          hooks.push({
            hook: 'original-update',
            context: structuredClone(withoutRendererProps(nextContext)),
          })
          path.setAttribute('d', nextContext.pathData)
        },
        destroy: () => {
          hooks.push({ hook: 'original-destroy' })
        },
      }
    },
  } satisfies Required<FlowEdgeRenderer>

  const base = reentryDocument()

  const input = {
    ...base,
    edges: base.edges.map((edge) =>
      type === 'explicit'
        ? { ...edge, type: 'probe', label: 'edge-label' }
        : { ...edge, label: 'edge-label' }
    ),
  }

  try {
    controller = await Effect.runPromise(
      createFlowHost(root, input, {
        documentMode: 'uncontrolled',
        nodesResizable: true,
        renderOnlyVisible: false,
        edgeRenderers: { probe: renderer },
        defaultEdgeOptions: { type: 'probe' },
        runEffect: scopes.run,
        runTelemetry: (effect) => {
          void effect
        },
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.25, maxZoom: 4 },
        },
      }).pipe(Effect.provide(FlowBrowserLive))
    )
    const active = controller
    await mountedGeometry()
    const capture = syntheticCaptures(root)
    const edge = requiredElement(root, '.flow-edge-group')
    const path = requiredElement(edge, '.flow-edge-path')
    const hit = requiredElement(edge, '.flow-edge-hit')
    const visual = requiredElement(edge, '[data-currency-path]')
    const label = requiredElement(root, '.flow-edge-label')

    const source = requiredElement(
      root,
      '.flow-edge-reconnect-anchor[data-endpoint="source"]'
    )

    const target = requiredElement(
      root,
      '.flow-edge-reconnect-anchor[data-endpoint="target"]'
    )

    active.subscribe((value) =>
      publications.push({ name: 'change', payload: structuredClone(value) })
    )
    active.subscribeState((value) =>
      publications.push({ name: 'state', payload: structuredClone(value) })
    )

    const snapshot = () => ({
      state: structuredClone(active.getSnapshot()),
      hooks: structuredClone(hooks),
      publications: structuredClone(publications),
      scopes: scopes.snapshot(),
      retained: {
        edge: root.querySelector('.flow-edge-group') === edge,
        path: root.querySelector('.flow-edge-path') === path,
        hit: root.querySelector('.flow-edge-hit') === hit,
        visual: root.querySelector('[data-currency-path]') === visual,
        label: root.querySelector('.flow-edge-label') === label,
      },
      pixels: {
        path: path.getAttribute('d'),
        hit: hit.getAttribute('d'),
        visual: visual.getAttribute('d'),
        source: { x: source.getAttribute('cx'), y: source.getAttribute('cy') },
        target: { x: target.getAttribute('cx'), y: target.getAttribute('cy') },
        label: { x: label.getAttribute('x'), y: label.getAttribute('y') },
      },
      captures: structuredClone(capture.history),
      held: capture.count(),
    })

    const before = snapshot()
    armed = true
    active.dispatch({
      kind: 'set-node-position',
      nodeId: NodeIdSchema.make('a'),
      position: { x: 40, y: 20 },
    })
    const after = snapshot()
    await mountedGeometry()
    const afterBarrier = snapshot()
    active.dispatch({
      kind: 'set-node-position',
      nodeId: NodeIdSchema.make('a'),
      position: { x: 60, y: 20 },
    })
    const afterNext = snapshot()
    await active.destroyAsync()

    return {
      before,
      after,
      afterBarrier,
      afterNext,
      afterDestroy: {
        hooks: structuredClone(hooks),
        scopes: scopes.snapshot(),
        edgeConnected: edge.isConnected,
        visualConnected: visual.isConnected,
        publications: structuredClone(publications),
      },
    }
  } finally {
    await controller?.destroyAsync()
    globalThis.ResizeObserver = nativeObserver
    root.remove()
  }
}

export const ownershipRoundSevenNumeric = async () => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const nativeObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = heldResizeObserver(nativeObserver)
  const NativeMap = globalThis.Map
  const scopes = scopeRecorder()
  const writes: unknown[] = []

  const hooks: {
    hook: string
    id?: string
    input?: unknown
    context?: unknown
  }[] = []

  const events: { name: string; payload: unknown }[] = []
  const publications: { name: string; payload: unknown }[] = []
  const checkpoints: unknown[] = []

  interface NumericProbe {
    capture?: () => void
    move?: () => void
  }

  const probe: NumericProbe = {}
  let phase: 'idle' | 'initial-preview' | 'nested-preview' = 'idle'
  const positionMaps: Map<unknown, unknown>[] = []
  const decodePosition = Schema.decodeUnknownOption(XYPositionSchema)
  let armed = false
  let controller: FlowController | undefined
  const nativeSet = NativeMap.prototype.set
  globalThis.Map = new Proxy(NativeMap, {
    construct: (Constructor, args) => {
      const map = new Constructor<unknown, unknown>(args[0])
      Object.defineProperty(map, 'set', {
        configurable: true,
        writable: true,
        value<Key, Value>(this: Map<Key, Value>, key: Key, value: Value) {
          if (phase !== 'idle' && key === 'a') {
            const decoded = decodePosition(value)

            if (
              Option.isSome(decoded) &&
              decoded.value.y === 20 &&
              decoded.value.x === (phase === 'initial-preview' ? 30 : 40)
            ) {
              const previous = structuredClone(this.get(key))

              if (positionMaps.length === 0) {
                positionMaps.push(this)
              }

              writes.push({
                phase,
                sameMap: this === positionMaps[0],
                previous,
                current: decoded.value,
              })
              phase = 'idle'
            }
          }

          nativeSet.call(this, key, value)

          return this
        },
      })

      return map
    },
  })

  const nodeRenderer: FlowNodeRenderer = (node, container) => {
    hooks.push({ hook: 'node-render', id: node.id })
    container.textContent = node.label

    return {
      update: (next) => {
        hooks.push({
          hook: 'node-update',
          id: next.id,
          input: structuredClone(next),
        })

        if (armed && next.id === 'a') {
          armed = false
          probe.capture?.()
          phase = 'nested-preview'
          probe.move?.()
          probe.capture?.()
        }
      },
      destroy: () => {
        hooks.push({ hook: 'node-destroy', id: node.id })
      },
    }
  }

  const renderer: FlowEdgeRenderer = {
    geometry: (_edge, context) => {
      hooks.push({
        hook: 'geometry',
        context: structuredClone(withoutRendererProps(context)),
      })

      return {
        pathData: `M ${context.source.x} ${context.source.y} L ${context.target.x} ${context.target.y}`,
        labelAnchor: { x: context.source.x + 10, y: 99 },
      }
    },
    render: (_edge, context, visual) => {
      hooks.push({
        hook: 'render',
        context: structuredClone(withoutRendererProps(context)),
      })

      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      )

      path.dataset.numericPath = 'probe'
      path.setAttribute('d', context.pathData)
      visual.append(path)

      return {
        update: (_next, nextContext) => {
          hooks.push({
            hook: 'update',
            context: structuredClone(withoutRendererProps(nextContext)),
          })
          path.setAttribute('d', nextContext.pathData)
        },
        destroy: () => {
          hooks.push({ hook: 'edge-destroy' })
        },
      }
    },
  }

  const base = reentryDocument()

  const input = {
    ...base,
    edges: base.edges.map((edge) => ({
      ...edge,
      type: 'probe',
      label: 'edge-label',
    })),
  }

  try {
    controller = await Effect.runPromise(
      createFlowHost(root, input, {
        documentMode: 'uncontrolled',
        nodesResizable: true,
        renderOnlyVisible: false,
        nodeDragThreshold: 0,
        selectNodesOnDrag: false,
        nodeRenderers: { default: nodeRenderer },
        edgeRenderers: { probe: renderer },
        runEffect: scopes.run,
        runTelemetry: (effect) => {
          void effect
        },
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.25, maxZoom: 4 },
        },
        onNodeDragStart: (value) =>
          events.push({ name: 'start', payload: structuredClone(value) }),
        onNodeDrag: (value) =>
          events.push({ name: 'move', payload: structuredClone(value) }),
        onNodeDragStop: (value) =>
          events.push({ name: 'stop', payload: structuredClone(value) }),
      }).pipe(Effect.provide(FlowBrowserLive))
    )
    const active = controller
    await mountedGeometry()
    const node = requiredElement(root, '[data-node-id="a"]')
    const edge = requiredElement(root, '.flow-edge-group')
    const visual = requiredElement(edge, '[data-numeric-path]')
    const path = requiredElement(edge, '.flow-edge-path')
    const hit = requiredElement(edge, '.flow-edge-hit')
    const label = requiredElement(root, '.flow-edge-label')

    const source = requiredElement(
      root,
      '.flow-edge-reconnect-anchor[data-endpoint="source"]'
    )

    const target = requiredElement(
      root,
      '.flow-edge-reconnect-anchor[data-endpoint="target"]'
    )

    const capture = syntheticCaptures(root)
    active.subscribe((value) =>
      publications.push({ name: 'change', payload: structuredClone(value) })
    )
    active.subscribeState((value) =>
      publications.push({ name: 'state', payload: structuredClone(value) })
    )

    const snapshot = () => ({
      state: structuredClone(active.getSnapshot()),
      hooks: structuredClone(hooks),
      events: structuredClone(events),
      publications: structuredClone(publications),
      scopes: scopes.snapshot(),
      captures: structuredClone(capture.history),
      held: capture.count(),
      retained: {
        node: root.querySelector('[data-node-id="a"]') === node,
        edge: root.querySelector('.flow-edge-group') === edge,
        visual: root.querySelector('[data-numeric-path]') === visual,
        path: root.querySelector('.flow-edge-path') === path,
        hit: root.querySelector('.flow-edge-hit') === hit,
        label: root.querySelector('.flow-edge-label') === label,
      },
      pixels: {
        node: node instanceof HTMLElement ? node.style.transform : null,
        path: path.getAttribute('d'),
        hit: hit.getAttribute('d'),
        visual: visual.getAttribute('d'),
        source: { x: source.getAttribute('cx'), y: source.getAttribute('cy') },
        target: { x: target.getAttribute('cx'), y: target.getAttribute('cy') },
        label: { x: label.getAttribute('x'), y: label.getAttribute('y') },
      },
      mapValue: structuredClone(positionMaps[0]?.get('a')),
    })

    probe.capture = () => {
      checkpoints.push(snapshot())
    }

    probe.move = () => dispatchPointer(node, 'pointermove', { x: 520, y: 300 })
    dispatchPointer(node, 'pointerdown', { x: 500, y: 300 })
    phase = 'initial-preview'
    dispatchPointer(node, 'pointermove', { x: 510, y: 300 })
    const initialHooks = structuredClone(hooks)
    hooks.length = 0
    const before = snapshot()
    armed = true
    active.dispatch({
      kind: 'set-node-position',
      nodeId: NodeIdSchema.make('a'),
      position: { x: 40, y: 20 },
    })
    const after = snapshot()
    await mountedGeometry()
    const afterBarrier = snapshot()
    node.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })
    )
    const afterCancel = snapshot()
    await active.destroyAsync()

    return {
      initialHooks,
      writes,
      before,
      checkpoints,
      after,
      afterBarrier,
      afterCancel,
      afterDestroy: {
        hooks: structuredClone(hooks),
        scopes: scopes.snapshot(),
        events: structuredClone(events),
        publications: structuredClone(publications),
        captures: structuredClone(capture.history),
        held: capture.count(),
        nodeConnected: node.isConnected,
        edgeConnected: edge.isConnected,
      },
    }
  } finally {
    delete probe.capture
    delete probe.move
    await controller?.destroyAsync()
    globalThis.Map = NativeMap
    globalThis.ResizeObserver = nativeObserver
    root.remove()
  }
}
