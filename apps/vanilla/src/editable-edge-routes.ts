import {
  editEdgeRoute,
  getEdgeGeometry,
  screenToFlowPosition,
  selectionAutoPanDelta,
} from '@flow/core'
import type {
  EdgeId,
  FlowDocument,
  FlowEdgeGeometryOptions,
  FlowEditTransactionInput,
  FlowEditResult,
  Viewport,
  XYPosition,
} from '@flow/core'
import { Effect } from 'effect'

type RouteCommand = Parameters<typeof editEdgeRoute>[2]

interface RouteDrag {
  readonly pointerId: number
  readonly edgeId: EdgeId
  readonly index: number
  readonly original: readonly XYPosition[]
  readonly start: XYPosition
  readonly viewport: Viewport
  pointer: XYPosition
  points: readonly XYPosition[]
}

const pointTarget = (target: EventTarget | null) =>
  target instanceof Element
    ? target.closest<SVGCircleElement>('[data-flow-route-point]')
    : null

const pointCommand = (
  event: KeyboardEvent,
  index: number,
  point: XYPosition
): RouteCommand | undefined => {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    return { kind: 'remove', index }
  }

  if (event.ctrlKey || event.metaKey || event.altKey) {
    return undefined
  }

  const step = event.shiftKey ? 10 : 1
  let delta: XYPosition

  switch (event.key) {
    case 'ArrowLeft': {
      delta = { x: -step, y: 0 }
      break
    }

    case 'ArrowRight': {
      delta = { x: step, y: 0 }
      break
    }

    case 'ArrowUp': {
      delta = { x: 0, y: -step }
      break
    }

    case 'ArrowDown': {
      delta = { x: 0, y: step }
      break
    }

    default: {
      return undefined
    }
  }

  return {
    kind: 'move',
    index,
    point: { x: point.x + delta.x, y: point.y + delta.y },
  }
}

export const createEditableEdgeRoutes = (options: {
  readonly canvas: HTMLElement
  readonly document: () => FlowDocument
  readonly viewport: () => Viewport
  readonly geometry: () => FlowEdgeGeometryOptions
  readonly capture: (pointerId: number) => boolean
  readonly release: (pointerId: number) => void
  readonly preview: (
    edgeId: EdgeId,
    points: readonly XYPosition[] | undefined
  ) => void
  readonly pan: (viewport: Viewport) => void
  readonly commitViewport: (viewport: Viewport) => void
  readonly submit: (
    resolve: (document: FlowDocument) => FlowEditTransactionInput
  ) => Promise<FlowEditResult>
  readonly reportFailure: (error: Error) => void
  readonly reportCancel: (edgeId: EdgeId, reason: string) => void
  readonly suppressClick: () => void
  readonly autoPanSpeed: number
}) => {
  let drag: RouteDrag | undefined
  let frame: number | undefined

  const canvasPoint = (event: MouseEvent): XYPosition => {
    const bounds = options.canvas.getBoundingClientRect()

    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }

  const submit = (edgeId: EdgeId, command: RouteCommand): void => {
    void (async () => {
      try {
        await options.submit((document) =>
          Effect.runSync(
            editEdgeRoute(document, edgeId, command, options.geometry())
          )
        )
      } catch (error) {
        options.reportFailure(
          error instanceof Error ? error : new Error(String(error))
        )
      }
    })()
  }

  const stop = (): RouteDrag | undefined => {
    const active = drag
    drag = undefined

    if (frame !== undefined) {
      globalThis.cancelAnimationFrame(frame)
      frame = undefined
    }

    if (active !== undefined) {
      options.release(active.pointerId)
      options.preview(active.edgeId, undefined)
    }

    return active
  }

  const cancel = (reason: string, pointerId?: number): boolean => {
    if (
      drag === undefined ||
      (pointerId !== undefined && drag.pointerId !== pointerId)
    ) {
      return false
    }

    const active = stop()

    if (active !== undefined) {
      options.pan(active.viewport)
      options.reportCancel(active.edgeId, reason)
    }

    return true
  }

  const paint = (active: RouteDrag): void => {
    const point = screenToFlowPosition(active.pointer, options.viewport())
    const original = active.original[active.index]

    if (original === undefined) {
      return
    }

    const moved = {
      x: original.x + point.x - active.start.x,
      y: original.y + point.y - active.start.y,
    }

    const previous = active.original[active.index - 1]
    const next = active.original[active.index + 1]

    if (
      [previous, next].some(
        (neighbor) => neighbor?.x === moved.x && neighbor.y === moved.y
      )
    ) {
      return
    }

    active.points = active.original.map((value, index) =>
      index === active.index ? moved : value
    )
    options.preview(active.edgeId, active.points)
  }

  const schedule = (active: RouteDrag): void => {
    if (frame !== undefined) {
      return
    }

    frame = globalThis.requestAnimationFrame(() => {
      frame = undefined

      if (drag !== active) {
        return
      }

      const delta = selectionAutoPanDelta(
        active.pointer,
        options.canvas.clientWidth,
        options.canvas.clientHeight,
        40,
        options.autoPanSpeed
      )

      if (delta.x === 0 && delta.y === 0) {
        return
      }

      const viewport = options.viewport()
      options.pan({
        ...viewport,
        x: viewport.x + delta.x,
        y: viewport.y + delta.y,
      })

      if (drag === active) {
        paint(active)
        schedule(active)
      }
    })
  }

  const insertFromKeyboard = (event: KeyboardEvent): boolean => {
    const group =
      event.target instanceof Element
        ? event.target.closest<SVGGElement>('.flow-edge-group')
        : null

    const edge = options
      .document()
      .edges.find(({ id }) => id === group?.dataset.edgeId)

    if (
      event.key !== 'Enter' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      edge === undefined
    ) {
      return false
    }

    const geometry = getEdgeGeometry(
      options.document(),
      edge.id,
      options.geometry()
    )

    if (geometry === undefined) {
      return false
    }

    event.preventDefault()

    if (!event.repeat) {
      cancel('keyboard-insert')
      submit(edge.id, { kind: 'insert', point: geometry.label })
    }

    return true
  }

  return {
    cancel,
    active: () => drag !== undefined,
    documentChanged: (document: FlowDocument): void => {
      const active = drag

      if (active === undefined) {
        return
      }

      const edge = document.edges.find(({ id }) => id === active.edgeId)
      const points = edge?.route?.mode === 'manual' ? edge.route.points : []

      if (
        edge?.hidden === true ||
        points.length !== active.original.length ||
        points.some(
          (point, index) =>
            point.x !== active.original[index]?.x ||
            point.y !== active.original[index]?.y
        )
      ) {
        cancel('document-update')
      }
    },
    pointerDown: (event: PointerEvent): boolean => {
      const handle = pointTarget(event.target)

      if (handle === null || event.button !== 0) {
        return false
      }

      event.preventDefault()
      event.stopPropagation()

      if (drag !== undefined) {
        return true
      }

      const edge = options
        .document()
        .edges.find(({ id }) => id === handle.dataset.edgeId)

      const index = Number(handle.dataset.pointIndex)

      if (
        edge?.route?.mode !== 'manual' ||
        edge.route.points[index] === undefined ||
        !options.capture(event.pointerId)
      ) {
        return true
      }

      const pointer = canvasPoint(event)

      const active: RouteDrag = {
        pointerId: event.pointerId,
        edgeId: edge.id,
        index,
        original: edge.route.points,
        points: edge.route.points,
        start: screenToFlowPosition(pointer, options.viewport()),
        pointer,
        viewport: options.viewport(),
      }

      drag = active
      handle.focus()
      options.suppressClick()
      schedule(active)

      return true
    },
    pointerMove: (event: PointerEvent): boolean => {
      const active = drag

      if (active === undefined || active.pointerId !== event.pointerId) {
        return false
      }

      event.preventDefault()
      active.pointer = canvasPoint(event)
      paint(active)
      schedule(active)

      return true
    },
    pointerUp: (event: PointerEvent): void => {
      const active = drag

      if (active === undefined || active.pointerId !== event.pointerId) {
        return
      }

      active.pointer = canvasPoint(event)
      paint(active)
      stop()
      const point = active.points[active.index]
      const original = active.original[active.index]

      if (
        point !== undefined &&
        (point.x !== original?.x || point.y !== original.y)
      ) {
        submit(active.edgeId, { kind: 'move', index: active.index, point })
      }

      const viewport = options.viewport()

      if (
        viewport.x !== active.viewport.x ||
        viewport.y !== active.viewport.y
      ) {
        options.commitViewport(viewport)
      }
    },
    doubleClick: (event: MouseEvent): boolean => {
      const target = event.target instanceof Element ? event.target : undefined
      const group = target?.closest<SVGGElement>('.flow-edge-group')

      const edge = options
        .document()
        .edges.find(({ id }) => id === group?.dataset.edgeId)

      if (
        edge === undefined ||
        !target?.matches(
          '.flow-edge-path, .flow-edge-hit, .flow-edge-interaction'
        )
      ) {
        return false
      }

      event.preventDefault()
      submit(edge.id, {
        kind: 'insert',
        point: screenToFlowPosition(canvasPoint(event), options.viewport()),
      })

      return true
    },
    keyDown: (event: KeyboardEvent): boolean => {
      const handle = pointTarget(event.target)

      if (event.isComposing) {
        return false
      }

      if (handle === null) {
        return insertFromKeyboard(event)
      }

      const edge = options
        .document()
        .edges.find(({ id }) => id === handle.dataset.edgeId)

      const index = Number(handle.dataset.pointIndex)

      const point =
        edge?.route?.mode === 'manual' ? edge.route.points[index] : undefined

      if (edge === undefined || point === undefined) {
        return true
      }

      const command = pointCommand(event, index, point)

      if (command === undefined) {
        return false
      }

      event.preventDefault()

      if (command.kind !== 'remove' || !event.repeat) {
        cancel('keyboard-edit')
        submit(edge.id, command)
      }

      return true
    },
  }
}
