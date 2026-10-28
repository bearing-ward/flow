import { Effect, Option, Predicate, Schema } from 'effect'

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
