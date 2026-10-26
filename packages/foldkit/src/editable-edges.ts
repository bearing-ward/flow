import {
  FlowRoutePointsSchema,
  EdgeIdSchema,
  selectionAutoPanDelta,
  getEdgeGeometry,
  getFlowMeasuredNodes,
} from '@flow/core'
import type { FlowDocument, XYPosition } from '@flow/core'
import { Option, Schema } from 'effect'

import type { GraphMessageData, Message, Model } from './graph.ts'
import { isInputDOMNode } from './key-press-observer.ts'

const pointTarget = (target: EventTarget | null): SVGElement | null =>
  target instanceof Element
    ? target.closest<SVGElement>('[data-flow-route-point]')
    : null

const routeKeyDelta = (key: string, step: number): XYPosition | undefined => {
  switch (key) {
    case 'ArrowLeft': {
      return { x: -step, y: 0 }
    }

    case 'ArrowRight': {
      return { x: step, y: 0 }
    }

    case 'ArrowUp': {
      return { x: 0, y: -step }
    }

    case 'ArrowDown': {
      return { x: 0, y: step }
    }

    default: {
      return undefined
    }
  }
}

/** Native point editing is scoped to one Runtime and never mutates accepted state. */
export const createEditableEdgesResource = (
  messages: Pick<typeof Message, 'RoutePreview' | 'RouteCommand' | 'AutoPan'>,
  model: () => Model,
  canvas: () => HTMLElement | null,
  emit: (message: GraphMessageData) => void,
  capture: (owner: HTMLElement, pointerId: number) => boolean
) => {
  let space = false
  let disposed = false
  let mounted = false
  let frame = 0
  const valid = new Set<string>()

  let active:
    | {
        readonly gestureId: string
        readonly pointerId: number
        readonly owner: HTMLElement
        readonly document: FlowDocument
        readonly edgeId: string
        readonly index: number
        readonly original: XYPosition
        readonly start: XYPosition
        client: XYPosition
        point: XYPosition
      }
    | undefined

  const graphPoint = (x: number, y: number, owner: HTMLElement): XYPosition => {
    const bounds = owner.getBoundingClientRect()
    const { viewport } = model()

    return {
      x: (x - bounds.left - viewport.x) / viewport.zoom,
      y: (y - bounds.top - viewport.y) / viewport.zoom,
    }
  }

  const release = (): void => {
    const session = active
    active = undefined
    cancelAnimationFrame(frame)

    if (session?.owner.hasPointerCapture(session.pointerId)) {
      session.owner.releasePointerCapture(session.pointerId)
    }
  }

  const cancel = (): void => {
    if (active !== undefined) {
      valid.delete(active.gestureId)
      release()
      emit(messages.RoutePreview({ preview: null }))
    }
  }

  const invalidate = (): void => {
    const awaitingRelease = active === undefined && valid.size > 0

    cancel()
    valid.clear()

    if (awaitingRelease) {
      emit(messages.RoutePreview({ preview: null }))
    }
  }

  const preview = (): void => {
    const session = active

    if (session === undefined) {
      return
    }

    const edge = model().document.edges.find(({ id }) => id === session.edgeId)

    if (edge?.route?.mode !== 'manual') {
      return
    }

    const pointer = graphPoint(
      session.client.x,
      session.client.y,
      session.owner
    )

    session.point = {
      x: session.original.x + pointer.x - session.start.x,
      y: session.original.y + pointer.y - session.start.y,
    }

    const points = Schema.decodeUnknownOption(FlowRoutePointsSchema)(
      edge.route.points.map((point, index) =>
        index === session.index ? session.point : point
      )
    )

    if (Option.isSome(points)) {
      emit(
        messages.RoutePreview({
          preview: {
            edgeId: edge.id,
            points: points.value,
            gestureId: session.gestureId,
          },
        })
      )
    }
  }

  const autoPan = (): void => {
    const session = active

    if (session === undefined) {
      return
    }

    if (!session.owner.isConnected || model().document !== session.document) {
      cancel()

      return
    }

    const bounds = session.owner.getBoundingClientRect()

    const delta = selectionAutoPanDelta(
      { x: session.client.x - bounds.left, y: session.client.y - bounds.top },
      session.owner.clientWidth,
      session.owner.clientHeight,
      40,
      model().autoPanSpeed
    )

    if (model().autoPanOnConnect && (delta.x !== 0 || delta.y !== 0)) {
      emit(messages.AutoPan(delta))
      preview()
    }

    frame = requestAnimationFrame(autoPan)
  }

  const down = (event: PointerEvent): void => {
    const target = pointTarget(event.target)
    const owner = canvas()

    if (
      !model().editableEdges ||
      active !== undefined ||
      event.button !== 0 ||
      target === null ||
      owner === null ||
      !owner.contains(target) ||
      model().pointerSession !== null ||
      model().gestureSession !== null
    ) {
      return
    }

    const { edgeId } = target.dataset
    const index = Number(target.dataset.pointIndex)
    const edge = model().document.edges.find(({ id }) => id === edgeId)

    const point =
      edge?.route?.mode === 'manual' ? edge.route.points[index] : undefined

    if (edge === undefined || point === undefined) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()

    if (target instanceof SVGElement) {
      target.focus()
    }

    if (!capture(owner, event.pointerId)) {
      return
    }

    const gestureId = crypto.randomUUID()
    valid.add(gestureId)
    active = {
      gestureId,
      pointerId: event.pointerId,
      owner,
      document: model().document,
      edgeId: edge.id,
      index,
      original: point,
      start: graphPoint(event.clientX, event.clientY, owner),
      client: { x: event.clientX, y: event.clientY },
      point,
    }
    preview()
    frame = requestAnimationFrame(autoPan)
  }

  const move = (event: PointerEvent): void => {
    if (active?.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()

    if (event.buttons === 0) {
      cancel()

      return
    }

    active.client = { x: event.clientX, y: event.clientY }
    preview()
  }

  const up = (event: PointerEvent): void => {
    const session = active

    if (session?.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()
    session.client = { x: event.clientX, y: event.clientY }
    preview()
    release()

    if (
      session.point.x === session.original.x &&
      session.point.y === session.original.y
    ) {
      valid.delete(session.gestureId)
      emit(messages.RoutePreview({ preview: null }))

      return
    }

    emit(
      messages.RouteCommand({
        edgeId: EdgeIdSchema.make(session.edgeId),
        gestureId: session.gestureId,
        command: { kind: 'move', index: session.index, point: session.point },
      })
    )
  }

  const pointerCancel = (event: PointerEvent): void => {
    if (active?.pointerId === event.pointerId) {
      cancel()
    }
  }

  const editPointKey = (event: KeyboardEvent): void => {
    const target = pointTarget(event.target)

    if (
      !model().editableEdges ||
      target === null ||
      !canvas()?.contains(target)
    ) {
      return
    }

    const { edgeId } = target.dataset
    const index = Number(target.dataset.pointIndex)
    const edge = model().document.edges.find(({ id }) => id === edgeId)

    const point =
      edge?.route?.mode === 'manual' ? edge.route.points[index] : undefined

    if (edge === undefined || point === undefined) {
      return
    }

    const step = event.shiftKey ? 10 : 1
    const offset = routeKeyDelta(event.key, step)

    if (
      offset === undefined &&
      event.key !== 'Delete' &&
      event.key !== 'Backspace'
    ) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()
    emit(
      messages.RouteCommand({
        edgeId: edge.id,
        command:
          offset === undefined
            ? { kind: 'remove', index }
            : {
                kind: 'move',
                index,
                point: { x: point.x + offset.x, y: point.y + offset.y },
              },
      })
    )
  }

  const preventSpaceScroll = (event: KeyboardEvent): void => {
    if (
      model().editableEdges &&
      ((event.target instanceof Element && canvas()?.contains(event.target)) ||
        canvas()?.matches(':hover'))
    ) {
      event.preventDefault()
    }
  }

  const keydown = (event: KeyboardEvent): void => {
    if (event.isComposing || isInputDOMNode(event)) {
      return
    }

    if (event.code === 'Space' || event.key === ' ') {
      space = true
      preventSpaceScroll(event)

      if (
        model().editableEdges &&
        event.target instanceof Element &&
        canvas()?.contains(event.target) &&
        event.target.closest('[data-handle-id]') !== null
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }

    if (event.key === 'Escape') {
      cancel()

      return
    }

    if (
      model().editableEdges &&
      event.key === 'Enter' &&
      event.target instanceof SVGPathElement
    ) {
      const edgeId =
        event.target.closest<SVGElement>('[data-edge-id]')?.dataset.edgeId

      const geometry =
        edgeId === undefined
          ? undefined
          : getEdgeGeometry(model().document, edgeId, {
              edgeRouting: model().edgeRouting,
              measurements: getFlowMeasuredNodes(
                model().document,
                model().measurements
              ),
            })

      if (
        edgeId !== undefined &&
        geometry !== undefined &&
        canvas()?.contains(event.target)
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()
        emit(
          messages.RouteCommand({
            edgeId: EdgeIdSchema.make(edgeId),
            command: { kind: 'insert', point: geometry.label },
          })
        )

        return
      }
    }

    editPointKey(event)
  }

  const keyup = (event: KeyboardEvent): void => {
    if (event.code === 'Space' || event.key === ' ') {
      space = false
    }
  }

  const blur = (): void => {
    space = false
    invalidate()
  }

  const doubleClick = (event: MouseEvent): void => {
    const owner = canvas()

    if (
      !model().editableEdges ||
      !(event.target instanceof SVGPathElement) ||
      owner === null ||
      !owner.contains(event.target)
    ) {
      return
    }

    const edgeId =
      event.target.closest<SVGElement>('[data-edge-id]')?.dataset.edgeId

    if (
      edgeId === null ||
      edgeId === undefined ||
      !model().document.edges.some(({ id }) => id === edgeId)
    ) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()
    emit(
      messages.RouteCommand({
        edgeId: EdgeIdSchema.make(edgeId),
        command: {
          kind: 'insert',
          point: graphPoint(event.clientX, event.clientY, owner),
        },
      })
    )
  }

  return {
    pressed: () => active !== undefined,
    freeform: () => model().editableEdges && space,
    valid: (gestureId: string) => valid.has(gestureId),
    settle: (gestureId: string) => {
      valid.delete(gestureId)
    },
    invalidate,
    reconcile: () => {
      if (active !== undefined && model().document !== active.document) {
        cancel()
      }
    },
    mount: () => {
      mounted = true
      document.addEventListener('pointerdown', down, true)
      document.addEventListener('pointermove', move, true)
      document.addEventListener('pointerup', up, true)
      document.addEventListener('pointercancel', pointerCancel, true)
      document.addEventListener('lostpointercapture', pointerCancel, true)
      document.addEventListener('keydown', keydown, true)
      document.addEventListener('keyup', keyup, true)
      document.addEventListener('dblclick', doubleClick, true)
      window.addEventListener('blur', blur)
    },
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      cancel()
      valid.clear()

      if (!mounted) {
        return
      }

      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointermove', move, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('pointercancel', pointerCancel, true)
      document.removeEventListener('lostpointercapture', pointerCancel, true)
      document.removeEventListener('keydown', keydown, true)
      document.removeEventListener('keyup', keyup, true)
      document.removeEventListener('dblclick', doubleClick, true)
      window.removeEventListener('blur', blur)
    },
  }
}
