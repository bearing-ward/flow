import type { editEdgeRoute, FlowEdge, XYPosition } from '@flow/core'
import { h, shallowRef } from 'vue'

type RouteCommand = Parameters<typeof editEdgeRoute>[2]

interface RouteEditorHost {
  readonly enabled: () => boolean
  readonly available: () => boolean
  readonly owns: (target: Element) => boolean
  readonly captureFailed: (error: Error) => void
  readonly observe: (
    phase: 'start' | 'cancel',
    edgeId: string,
    pointerId: number
  ) => void
  readonly edge: (id: string) => FlowEdge | undefined
  readonly point: (event: MouseEvent) => XYPosition
  readonly autoPan: (event: PointerEvent) => boolean
  readonly commit: (edgeId: string, command: RouteCommand) => void
}

interface PointDrag {
  readonly edge: FlowEdge
  readonly index: number
  readonly pointerId: number
  readonly target: SVGElement
  readonly start: XYPosition
  readonly origin: XYPosition
  readonly points: readonly XYPosition[]
  readonly event: PointerEvent
  readonly listeners: AbortController
}

const keyboardCommand = (
  event: KeyboardEvent,
  index: number,
  point: XYPosition
): RouteCommand | undefined => {
  const step = event.shiftKey ? 10 : 1

  switch (event.key) {
    case 'Delete':
    case 'Backspace': {
      return { kind: 'remove', index }
    }

    case 'ArrowLeft': {
      return { kind: 'move', index, point: { x: point.x - step, y: point.y } }
    }

    case 'ArrowRight': {
      return { kind: 'move', index, point: { x: point.x + step, y: point.y } }
    }

    case 'ArrowUp': {
      return { kind: 'move', index, point: { x: point.x, y: point.y - step } }
    }

    case 'ArrowDown': {
      return { kind: 'move', index, point: { x: point.x, y: point.y + step } }
    }

    default: {
      return undefined
    }
  }
}

/** Browser ownership for route-point previews; accepted edits stay with the canvas. */
export const createVueRouteEditor = (host: RouteEditorHost) => {
  const drag = shallowRef<PointDrag>()
  let frame: number | undefined

  const points = (edge: FlowEdge): readonly XYPosition[] | undefined => {
    if (drag.value?.edge.id === edge.id) {
      return drag.value.points
    }

    return edge.route?.mode === 'manual' ? edge.route.points : undefined
  }

  const release = (cancelled: boolean): void => {
    const active = drag.value
    drag.value = undefined

    if (frame !== undefined) {
      cancelAnimationFrame(frame)
      frame = undefined
    }

    if (active !== undefined) {
      active.listeners.abort()

      if (active.target.hasPointerCapture(active.pointerId)) {
        active.target.releasePointerCapture(active.pointerId)
      }

      if (cancelled) {
        host.observe('cancel', active.edge.id, active.pointerId)
      }
    }
  }

  const cancel = (): void => release(true)

  const preview = (active: PointDrag, event: PointerEvent): void => {
    const pointer = host.point(event)

    const point = {
      x: active.origin.x + pointer.x - active.start.x,
      y: active.origin.y + pointer.y - active.start.y,
    }

    drag.value = {
      ...active,
      event,
      points: active.points.map((value, index) =>
        index === active.index ? point : value
      ),
    }
  }

  const pan = (): void => {
    frame = undefined
    const active = drag.value

    if (active === undefined || !host.available() || !host.enabled()) {
      cancel()

      return
    }

    const moved = host.autoPan(active.event)

    if (drag.value !== active) {
      return
    }

    if (moved) {
      preview(active, active.event)
      frame = requestAnimationFrame(pan)
    }
  }

  const move = (event: PointerEvent): void => {
    const active = drag.value

    if (active === undefined || event.pointerId !== active.pointerId) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    preview(active, event)

    if (frame === undefined) {
      frame = requestAnimationFrame(pan)
    }
  }

  const finish = (event: PointerEvent): void => {
    const active = drag.value

    if (active === undefined || event.pointerId !== active.pointerId) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    preview(active, event)
    const point = drag.value?.points[active.index]
    release(false)

    if (
      host.available() &&
      host.enabled() &&
      point !== undefined &&
      (point.x !== active.origin.x || point.y !== active.origin.y)
    ) {
      host.commit(active.edge.id, { kind: 'move', index: active.index, point })
    }
  }

  const cancelPointer = (event: PointerEvent): void => {
    if (event.pointerId === drag.value?.pointerId) {
      cancel()
    }
  }

  const start = (edge: FlowEdge, index: number, event: PointerEvent): void => {
    const point = points(edge)?.[index]
    const target = event.currentTarget

    if (
      event.button !== 0 ||
      !host.enabled() ||
      !host.available() ||
      point === undefined ||
      !(target instanceof SVGElement)
    ) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    cancel()
    target.focus({ preventScroll: true })

    try {
      target.setPointerCapture(event.pointerId)
    } catch (error) {
      host.captureFailed(
        error instanceof Error ? error : new Error(String(error))
      )

      return
    }

    if (!target.hasPointerCapture(event.pointerId)) {
      return
    }

    const listeners = new AbortController()

    drag.value = {
      listeners,
      edge,
      index,
      pointerId: event.pointerId,
      target,
      start: host.point(event),
      origin: point,
      points: points(edge) ?? [],
      event,
    }
    const options = { capture: true, signal: listeners.signal }

    target.addEventListener('lostpointercapture', cancel, options)
    globalThis.addEventListener('pointermove', move, options)
    globalThis.addEventListener('pointerup', finish, options)
    globalThis.addEventListener('pointercancel', cancelPointer, options)
    globalThis.addEventListener('blur', cancel, options)
    host.observe('start', edge.id, event.pointerId)
  }

  const keyboard = (event: KeyboardEvent): boolean => {
    if (event.key === 'Escape' && drag.value !== undefined) {
      event.preventDefault()
      event.stopPropagation()
      cancel()

      return true
    }

    const { target } = event

    if (
      !host.enabled() ||
      !host.available() ||
      !(target instanceof SVGElement) ||
      !host.owns(target) ||
      !Object.hasOwn(target.dataset, 'flowRoutePoint')
    ) {
      return false
    }

    const edge = host.edge(target.dataset.edgeId ?? '')
    const index = Number(target.dataset.pointIndex)

    const point =
      edge?.route?.mode === 'manual' ? edge.route.points[index] : undefined

    if (
      edge === undefined ||
      point === undefined ||
      event.isComposing ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    ) {
      return false
    }

    const command = keyboardCommand(event, index, point)

    if (command === undefined) {
      return false
    }

    event.preventDefault()
    event.stopPropagation()
    cancel()
    host.commit(edge.id, command)

    return true
  }

  const insertPoint = (edge: FlowEdge, point: XYPosition): void => {
    if (host.enabled() && host.available()) {
      cancel()
      host.commit(edge.id, { kind: 'insert', point })
    }
  }

  const insert = (edge: FlowEdge, event: MouseEvent): void => {
    if (host.enabled() && host.available()) {
      event.preventDefault()
      event.stopPropagation()
      insertPoint(edge, host.point(event))
    }
  }

  const render = (edge: FlowEdge) =>
    host.enabled()
      ? (points(edge) ?? []).map((point, index) =>
          h('circle', {
            key: `route-point-${index}`,
            class: 'flow-vue-route-point',
            'data-flow-route-point': '',
            'data-edge-id': edge.id,
            'data-point-index': index,
            tabindex: 0,
            role: 'button',
            'aria-label': `Route point ${index + 1} of edge ${edge.id}`,
            cx: point.x,
            cy: point.y,
            r: 6,
            fill: 'white',
            stroke: 'currentColor',
            'stroke-width': 2,
            style: { pointerEvents: 'all', cursor: 'move' },
            onPointerdown: (event: PointerEvent) => start(edge, index, event),
            onDblclick: (event: MouseEvent) => event.stopPropagation(),
          })
        )
      : []

  return {
    points,
    cancel,
    keyboard,
    insert,
    insertPoint,
    render,
    dragging: () => drag.value !== undefined,
  }
}
