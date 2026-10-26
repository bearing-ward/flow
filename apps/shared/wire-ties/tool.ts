import {
  createFlowRoutingSession,
  createFlowRoutingRequest,
  flowRoutingRevision,
  FlowRouter,
  editWireTies,
  flowWireSlash,
  flowBundleChanges,
  flowBundleEndpoints,
  flowBundleFrame,
  getEdgesGeometry,
  screenToFlowPosition,
  selectionAutoPanDelta,
  FlowAttribute,
  FlowSpan,
} from '@flow/core'
import type {
  FlowRouterService,
  FlowRoutingResult,
  FlowBundleCommand,
  FlowBundleChange,
  FlowDocument,
  FlowEdgeGeometryOptions,
  FlowEditTransactionInput,
  FlowSnapshot,
  Viewport,
  XYPosition,
} from '@flow/core'
import { Effect, References } from 'effect'

export interface WireTieHost {
  readonly router?: FlowRouterService | undefined
  readonly publishRouting?: ((result: FlowRoutingResult) => void) | undefined
  readonly routingState?: HTMLElement | undefined
  readonly owner: HTMLElement
  readonly read: () => Promise<FlowSnapshot>
  readonly geometry: () => Promise<FlowEdgeGeometryOptions>
  readonly apply: (transaction: FlowEditTransactionInput) => Promise<void>
  readonly viewport: (viewport: Viewport) => void
}

type Gesture = {
  readonly pointerId: number
  readonly baseline: FlowDocument
  readonly start: XYPosition
  pointer: XYPosition
  client: XYPosition
} & (
  | { readonly kind: 'slash' }
  | {
      readonly kind: 'tie'
      readonly bundleId: string
      readonly index: number
      readonly original: XYPosition
    }
)

const svgNamespace = 'http://www.w3.org/2000/svg'

const line = () => document.createElementNS(svgNamespace, 'line')

const positionLine = (
  element: SVGLineElement,
  a: XYPosition,
  b: XYPosition
): void => {
  element.setAttribute('x1', String(a.x))
  element.setAttribute('y1', String(a.y))
  element.setAttribute('x2', String(b.x))
  element.setAttribute('y2', String(b.y))
}

const waitForWireTieCanvas = (owner: HTMLElement): Promise<HTMLElement> => {
  const selector = '.flow-canvas, .flow-vue-canvas, .flow-foldkit-canvas'
  const current = owner.querySelector<HTMLElement>(selector)

  if (current !== null) {
    return Promise.resolve(current)
  }

  const pending = Promise.withResolvers<HTMLElement>()
  let timeout: ReturnType<typeof setTimeout>

  {
    const observer = new MutationObserver(() => {
      const canvas = owner.querySelector<HTMLElement>(selector)

      if (canvas !== null) {
        observer.disconnect()
        clearTimeout(timeout)
        pending.resolve(canvas)
      }
    })

    timeout = setTimeout(() => {
      observer.disconnect()
      pending.reject(new Error('Missing wire tie canvas'))
    }, 5000)

    observer.observe(owner, { childList: true, subtree: true })
  }

  return pending.promise
}

/** Browser composition shared by the three recipes; graph meaning stays in core. */
export const mountWireTieTool = async (host: WireTieHost) => {
  let snapshot = await host.read()
  let options = await host.geometry()
  const canvas = await waitForWireTieCanvas(host.owner)
  let active: Gesture | undefined
  let preview: FlowDocument | undefined
  let previewRouting: FlowRoutingResult | undefined
  let lastRoutingRevision: string | undefined
  const routing = createFlowRoutingSession()
  let enabled = false
  let disposed = false
  let frame = 0
  let lastRead = 0
  let reading = false
  let sequence = 0

  let selected:
    | { readonly bundleId: string; readonly index: number }
    | undefined

  const changes: FlowBundleChange[] = []
  const listeners = new AbortController()
  const svg = document.createElementNS(svgNamespace, 'svg')
  svg.classList.add('wire-tie-overlay')
  svg.setAttribute('aria-label', 'Wire ties')
  const graph = document.createElementNS(svgNamespace, 'g')
  const ribbons = document.createElementNS(svgNamespace, 'g')
  const markers = document.createElementNS(svgNamespace, 'g')
  const guide = line()
  guide.dataset.wireGuide = ''
  guide.setAttribute('stroke', '#a9a2df')
  guide.setAttribute('stroke-width', '1')
  guide.setAttribute('vector-effect', 'non-scaling-stroke')
  const tooltip = document.createElement('div')
  tooltip.className = 'wire-tie-tooltip'
  tooltip.setAttribute('role', 'status')
  tooltip.setAttribute('aria-label', 'Wire tie guide')
  tooltip.hidden = true
  graph.append(ribbons, markers, guide)
  svg.append(graph)
  host.owner.append(svg, tooltip)
  const markerElements = new Map<string, SVGLineElement>()
  const hiddenElements = new Map<SVGElement, string>()

  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Browser and Promise failures enter here and are normalized before display and logging.
  const report = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error)
    tooltip.textContent = message
    tooltip.hidden = false

    if (host.routingState !== undefined) {
      host.routingState.textContent = 'Routing failed; fallback shown'
      host.routingState.dataset.state = 'failure'
    }

    Effect.runSync(
      Effect.logWarning('Wire tie interaction failed').pipe(
        Effect.annotateLogs({ [FlowAttribute.failureMessage]: message }),
        Effect.withSpan(FlowSpan.editFailure)
      )
    )
  }

  const graphPoint = (client: XYPosition): XYPosition => {
    const bounds = canvas.getBoundingClientRect()

    return screenToFlowPosition(
      { x: client.x - bounds.left, y: client.y - bounds.top },
      snapshot.viewport
    )
  }

  const pathElements = () =>
    host.owner.querySelectorAll<SVGElement>('[data-edge-id]')

  const restore = (): void => {
    ribbons.replaceChildren()

    for (const [element, visibility] of hiddenElements) {
      element.style.visibility = visibility
    }

    hiddenElements.clear()
  }

  const drawPreview = (document: FlowDocument): void => {
    ribbons.replaceChildren()

    const bundled = new Set(document.bundles?.flatMap(({ edgeIds }) => edgeIds))

    for (const element of pathElements()) {
      if ([...bundled].some((id) => id === element.dataset.edgeId)) {
        element.style.visibility = 'hidden'
      }
    }

    for (const geometry of getEdgesGeometry(document, {
      ...options,
      edgeRouting: previewRouting,
    })) {
      if (!bundled.has(geometry.id)) {
        continue
      }

      const path = globalThis.document.createElementNS(svgNamespace, 'path')
      path.setAttribute('d', geometry.path)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', geometry.edge.stroke ?? '#aaa')
      path.setAttribute(
        'stroke-width',
        String(geometry.edge.strokeWidth ?? 1.5)
      )
      path.dataset.previewEdge = geometry.id
      ribbons.append(path)

      if (geometry.edge.label !== undefined) {
        const label = globalThis.document.createElementNS(svgNamespace, 'text')

        label.textContent = geometry.edge.label
        label.setAttribute('x', String(geometry.label.x))
        label.setAttribute('y', String(geometry.label.y - 8))
        label.setAttribute('fill', geometry.edge.stroke ?? '#aaa')
        ribbons.append(label)
      }
    }
  }

  const draw = (): void => {
    const document = preview ?? snapshot.document
    const { viewport } = snapshot
    graph.setAttribute(
      'transform',
      `translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`
    )
    const present = new Set<string>()

    for (const bundle of document.bundles ?? []) {
      const endpoints = flowBundleEndpoints(document, bundle, options)

      for (const [index] of bundle.ties.entries()) {
        const key = `${bundle.id}:${index}`
        present.add(key)
        let marker = markerElements.get(key)

        if (marker === undefined) {
          marker = line()
          marker.classList.add('wire-tie-marker')
          marker.dataset.bundleId = bundle.id
          marker.dataset.tieIndex = String(index)
          marker.setAttribute('tabindex', '0')
          marker.setAttribute('role', 'button')
          marker.setAttribute('aria-label', `Tie ${index + 1} of ${bundle.id}`)
          markerElements.set(key, marker)
          markers.append(marker)
        }

        const markerFrame = flowBundleFrame(
          bundle,
          index,
          endpoints,
          options.edgeRouting?.bundlePaths !== undefined
        )

        positionLine(marker, markerFrame.start, markerFrame.end)
        marker.setAttribute(
          'aria-pressed',
          String(selected?.bundleId === bundle.id && selected.index === index)
        )
      }
    }

    for (const [key, element] of markerElements) {
      if (!present.has(key)) {
        element.remove()
        markerElements.delete(key)
      }
    }

    if (preview !== undefined) {
      drawPreview(preview)
    }

    if (active?.kind === 'slash') {
      const result = flowWireSlash(
        snapshot.document,
        active.start,
        active.pointer,
        options
      )

      positionLine(guide, active.start, active.pointer)
      guide.style.display = ''
      tooltip.hidden = false
      tooltip.textContent = result.label
      const bounds = host.owner.getBoundingClientRect()
      tooltip.style.left = `${active.client.x - bounds.left + 12}px`
      tooltip.style.top = `${active.client.y - bounds.top + 12}px`
    } else {
      guide.style.display = 'none'
      tooltip.hidden = true
    }
  }

  const routeDisplayed = (): void => {
    if (host.router === undefined) {
      return
    }

    const document = preview ?? snapshot.document
    const request = createFlowRoutingRequest(document, options)

    if (request.revision === lastRoutingRevision) {
      return
    }

    lastRoutingRevision = request.revision

    if (host.routingState !== undefined) {
      host.routingState.textContent = 'Routing wires'
      host.routingState.dataset.state = 'pending'
    }

    const { router } = host
    void Effect.runPromise(
      routing
        .run(request, () =>
          flowRoutingRevision(preview ?? snapshot.document, options)
        )
        .pipe(
          Effect.provideService(FlowRouter, router),
          Effect.provideService(
            References.MinimumLogLevel,
            preview === undefined ? 'Info' : 'Warning'
          )
        )
    )
      .then((outcome) => {
        if (disposed || outcome.kind !== 'accepted') {
          return
        }

        if (preview === undefined) {
          options = { ...options, edgeRouting: outcome.result }
          host.publishRouting?.(outcome.result)
        } else {
          previewRouting = outcome.result
        }

        if (host.routingState !== undefined) {
          const unreachable = outcome.result.paths.filter(
            ({ kind }) => kind === 'unreachable'
          ).length

          host.routingState.textContent =
            unreachable > 0
              ? `${unreachable} unreachable wires; fallback shown`
              : `Routed ${outcome.result.paths.length} wires`
          host.routingState.dataset.state =
            unreachable > 0 ? 'unreachable' : 'ready'
        }

        return draw()
      })
      .catch(report)
  }

  const cancel = (reason: string): void => {
    const gesture = active
    active = undefined
    preview = undefined
    previewRouting = undefined
    lastRoutingRevision = undefined
    routing.cancel()
    restore()

    if (gesture !== undefined && svg.hasPointerCapture(gesture.pointerId)) {
      svg.releasePointerCapture(gesture.pointerId)
    }

    if (gesture !== undefined) {
      Effect.runSync(
        Effect.logDebug('Cancelled wire tie gesture').pipe(
          Effect.annotateLogs({ [FlowAttribute.cancellationReason]: reason }),
          Effect.withSpan(FlowSpan.gestureCancel)
        )
      )
    }

    draw()
  }

  const refresh = async (): Promise<void> => {
    const [next, geometry] = await Promise.all([host.read(), host.geometry()])

    if (disposed) {
      return
    }

    if (
      active !== undefined &&
      JSON.stringify(next.document) !== JSON.stringify(active.baseline)
    ) {
      cancel('document-change')
    }

    changes.push(...flowBundleChanges(snapshot.document, next.document))
    snapshot = next
    options = geometry
    routeDisplayed()
    draw()
  }

  const submit = async (command: FlowBundleCommand): Promise<void> => {
    const latest = await host.read()
    await host.apply(Effect.runSync(editWireTies(latest.document, command)))
    await refresh()
  }

  const update = (gesture: Gesture): void => {
    gesture.pointer = graphPoint(gesture.client)

    if (gesture.kind === 'tie') {
      const point = {
        x: gesture.original.x + gesture.pointer.x - gesture.start.x,
        y: gesture.original.y + gesture.pointer.y - gesture.start.y,
      }

      preview = {
        ...snapshot.document,
        bundles: snapshot.document.bundles?.map((bundle) =>
          bundle.id === gesture.bundleId
            ? {
                ...bundle,
                ties: [
                  gesture.index === 0 ? point : bundle.ties[0],
                  ...bundle.ties
                    .slice(1)
                    .map((value, index) =>
                      index + 1 === gesture.index ? point : value
                    ),
                ],
              }
            : bundle
        ),
      }
    }

    routeDisplayed()
    draw()
  }

  const down = (event: PointerEvent): void => {
    const { target } = event

    if (
      active !== undefined ||
      event.button !== 0 ||
      !(target instanceof Element)
    ) {
      return
    }

    const marker = target.closest<SVGLineElement>('[data-tie-index]')

    if (!svg.contains(target) || (!enabled && marker === null)) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()
    const client = { x: event.clientX, y: event.clientY }
    const start = graphPoint(client)

    const base = {
      pointerId: event.pointerId,
      baseline: snapshot.document,
      start,
      pointer: start,
      client,
    }

    if (marker === null) {
      active = { ...base, kind: 'slash' }
    } else {
      const bundleId = marker.dataset.bundleId ?? ''
      const index = Number(marker.dataset.tieIndex)

      const original = snapshot.document.bundles?.find(
        ({ id }) => id === bundleId
      )?.ties[index]

      if (original === undefined) {
        return
      }

      selected = { bundleId, index }
      marker.focus({ preventScroll: true })
      active = { ...base, kind: 'tie', bundleId, index, original }
    }

    try {
      svg.setPointerCapture(event.pointerId)
    } catch (error) {
      report(error)
      cancel('capture-failed')

      return
    }

    if (!svg.hasPointerCapture(event.pointerId)) {
      cancel('capture-failed')

      return
    }

    update(active)
  }

  const move = (event: PointerEvent): void => {
    if (active?.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()
    active.client = { x: event.clientX, y: event.clientY }
    update(active)
  }

  const finish = (event: PointerEvent): void => {
    const gesture = active

    if (gesture?.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()
    gesture.client = { x: event.clientX, y: event.clientY }
    update(gesture)

    const slash =
      gesture.kind === 'slash'
        ? flowWireSlash(
            snapshot.document,
            gesture.start,
            gesture.pointer,
            options
          )
        : undefined

    const point =
      gesture.kind === 'tie'
        ? preview?.bundles?.find(({ id }) => id === gesture.bundleId)?.ties[
            gesture.index
          ]
        : undefined

    active = undefined
    preview = undefined
    previewRouting = undefined
    lastRoutingRevision = undefined
    routing.cancel()

    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId)
    }

    restore()
    draw()
    let command: FlowBundleCommand | undefined

    if (
      gesture.kind === 'tie' &&
      point !== undefined &&
      (point.x !== gesture.original.x || point.y !== gesture.original.y)
    ) {
      command = {
        kind: 'move-tie',
        bundleId: gesture.bundleId,
        index: gesture.index,
        point,
      }
    } else if (slash !== undefined && slash.edgeIds.length >= 2) {
      sequence += 1
      let id = `bundle-${sequence}`

      while (snapshot.document.bundles?.some((bundle) => bundle.id === id)) {
        sequence += 1
        id = `bundle-${sequence}`
      }

      command =
        slash.bundleId === undefined
          ? {
              kind: 'add',
              bundle: { id, edgeIds: slash.edgeIds, ties: [slash.position] },
            }
          : { kind: 'add-tie', bundleId: slash.bundleId, point: slash.position }
    }

    if (command !== undefined) {
      void submit(command).catch(report)
    }
  }

  const key = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && active !== undefined) {
      event.preventDefault()
      event.stopImmediatePropagation()
      cancel('escape')

      return
    }

    if (
      !(event.target instanceof SVGLineElement) ||
      !markers.contains(event.target)
    ) {
      return
    }

    const bundleId = event.target.dataset.bundleId ?? ''
    const index = Number(event.target.dataset.tieIndex)

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      event.stopImmediatePropagation()
      void submit({ kind: 'remove-tie', bundleId, index }).catch(report)
    }
  }

  const pointerCancel = (event: PointerEvent): void => {
    if (active?.pointerId === event.pointerId) {
      cancel(event.type)
    }
  }

  const listen = { capture: true, signal: listeners.signal }
  markers.addEventListener(
    'focusin',
    (event) => {
      if (event.target instanceof SVGLineElement) {
        selected = {
          bundleId: event.target.dataset.bundleId ?? '',
          index: Number(event.target.dataset.tieIndex),
        }
        draw()
      }
    },
    { signal: listeners.signal }
  )
  svg.addEventListener('pointerdown', down, listen)
  window.addEventListener('pointermove', move, listen)
  window.addEventListener('pointerup', finish, listen)
  window.addEventListener('pointercancel', pointerCancel, listen)
  svg.addEventListener('lostpointercapture', pointerCancel, listen)
  window.addEventListener('keydown', key, listen)
  window.addEventListener('blur', () => cancel('blur'), {
    signal: listeners.signal,
  })

  const tick = (time: number): void => {
    if (disposed) {
      return
    }

    if (active !== undefined) {
      const bounds = canvas.getBoundingClientRect()

      const delta = selectionAutoPanDelta(
        { x: active.client.x - bounds.left, y: active.client.y - bounds.top },
        bounds.width,
        bounds.height,
        40,
        15
      )

      if (delta.x !== 0 || delta.y !== 0) {
        snapshot = {
          ...snapshot,
          viewport: {
            ...snapshot.viewport,
            x: snapshot.viewport.x + delta.x,
            y: snapshot.viewport.y + delta.y,
          },
        }
        host.viewport(snapshot.viewport)
        update(active)
      }
    }

    if (!reading && time - lastRead >= 60) {
      reading = true
      lastRead = time
      void refresh()
        .catch(report)
        .finally(() => {
          reading = false
        })
    }

    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)
  draw()
  Effect.runSync(
    Effect.logDebug('Mounted wire tie tool').pipe(
      Effect.withSpan(FlowSpan.hostMount)
    )
  )

  return {
    enabled: (value: boolean) => {
      cancel('mode-change')
      enabled = value
      svg.classList.toggle('tying', value)
    },
    refresh,
    changes: () => [...changes],
    removeEdge: (edgeId: FlowBundleCommand & { kind: 'remove-edge' }) =>
      submit(edgeId),
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      cancel('dispose')
      routing.dispose()
      listeners.abort()
      cancelAnimationFrame(frame)
      svg.remove()
      tooltip.remove()
      Effect.runSync(
        Effect.logDebug('Disposed wire tie tool').pipe(
          Effect.withSpan(FlowSpan.hostDestroy)
        )
      )
    },
  }
}
