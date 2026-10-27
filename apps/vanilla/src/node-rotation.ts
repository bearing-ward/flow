import {
  FlowAttribute,
  FlowSpan,
  reduceFlowRotation,
  normalizeFlowRotation,
  screenToFlowPosition,
  selectionAutoPanDelta,
  startFlowRotation,
} from '@flow/core'
import type {
  FlowDocument,
  FlowNode,
  FlowGraphView,
  FlowRotationGesture,
  NodeId,
  Viewport,
  XYPosition,
} from '@flow/core'
import { Effect } from 'effect'

interface RotationHost {
  readonly canvas: () => HTMLElement | null
  readonly document: () => FlowDocument
  readonly graph: () => FlowGraphView
  readonly viewport: () => Viewport
  readonly available: () => boolean
  readonly capture: (owner: HTMLElement, pointerId: number) => boolean
  readonly preview: (
    preview: {
      readonly nodeId: NodeId
      readonly rotation: number
      readonly gestureId: string
    } | null
  ) => void
  readonly commit: (nodeId: NodeId, rotation: number, gestureId: string) => void
  readonly pan: (viewport: Viewport) => void
  readonly commitViewport?: (viewport: Viewport) => void
  readonly autoPan: () => boolean
  readonly autoPanSpeed: () => number
  readonly suppressClick: () => void
}

const record = (span: string, nodeId: NodeId, reason: string) =>
  Effect.runSync(
    Effect.logDebug('Node rotation lifecycle').pipe(
      Effect.annotateLogs({
        [FlowAttribute.nodeId]: nodeId,
        [FlowAttribute.inputKind]: 'node-rotation',
        [FlowAttribute.cancellationReason]: reason,
      }),
      Effect.withSpan(span)
    )
  )

/** Native ownership and transient rotation; accepted graph edits happen on release. */
export const createNodeRotationResource = (host: RotationHost) => {
  let disposed = false
  let mounted = false
  let frame: number | undefined

  let active:
    | {
        readonly owner: HTMLElement
        readonly pointerId: number
        readonly document: FlowDocument
        readonly viewport: Viewport
        readonly gestureId: string
        gesture: FlowRotationGesture
        client: XYPosition
      }
    | undefined

  const valid = new Set<string>()

  const point = (client: XYPosition, owner: HTMLElement) => {
    const bounds = owner.getBoundingClientRect()

    return screenToFlowPosition(
      {
        x: client.x - bounds.left - owner.clientLeft,
        y: client.y - bounds.top - owner.clientTop,
      },
      host.viewport()
    )
  }

  const release = (clear: boolean) => {
    const session = active
    active = undefined

    if (frame !== undefined) {
      cancelAnimationFrame(frame)
      frame = undefined
    }

    if (session?.owner.hasPointerCapture(session.pointerId)) {
      session.owner.releasePointerCapture(session.pointerId)
    }

    if (clear) {
      host.preview(null)
    }

    return session
  }

  const cancel = (reason = 'cancelled', pointerId?: number): boolean => {
    if (
      active === undefined ||
      (pointerId !== undefined && pointerId !== active.pointerId)
    ) {
      return false
    }

    const session = active
    valid.delete(session.gestureId)
    session.gesture = reduceFlowRotation(session.gesture, { kind: 'cancel' })
    release(true)
    host.pan(session.viewport)
    record(FlowSpan.gestureCancel, session.gesture.nodeId, reason)

    return true
  }

  const reconcile = () => {
    if (
      active !== undefined &&
      (!active.owner.isConnected || host.document() !== active.document)
    ) {
      cancel('document-update')
    }
  }

  const paint = () => {
    const session = active

    if (session === undefined) {
      return
    }

    session.gesture = reduceFlowRotation(session.gesture, {
      kind: 'move',
      pointer: point(session.client, session.owner),
    })
    host.preview({
      nodeId: session.gesture.nodeId,
      rotation: session.gesture.rotation,
      gestureId: session.gestureId,
    })
  }

  const pan = () => {
    frame = undefined
    reconcile()
    const session = active

    if (session === undefined) {
      return
    }

    if (host.autoPan()) {
      const bounds = session.owner.getBoundingClientRect()

      const delta = selectionAutoPanDelta(
        {
          x: session.client.x - bounds.left - session.owner.clientLeft,
          y: session.client.y - bounds.top - session.owner.clientTop,
        },
        session.owner.clientWidth,
        session.owner.clientHeight,
        40,
        host.autoPanSpeed()
      )

      if (delta.x !== 0 || delta.y !== 0) {
        const viewport = host.viewport()
        host.pan({
          ...viewport,
          x: viewport.x + delta.x,
          y: viewport.y + delta.y,
        })
        paint()
      }
    }

    frame = requestAnimationFrame(pan)
  }

  const down = (event: PointerEvent) => {
    const owner = host.canvas()

    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-flow-rotation]')
        : null

    if (
      disposed ||
      owner === null ||
      target === null ||
      !owner.contains(target) ||
      event.button !== 0
    ) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()

    if (active !== undefined || !host.available()) {
      return
    }

    const node = host
      .graph()
      .orderedNodes.find((item) => item.id === target.dataset.nodeId)

    if (
      node === undefined ||
      node.hidden ||
      !host.capture(owner, event.pointerId)
    ) {
      return
    }

    const client = { x: event.clientX, y: event.clientY }
    const gestureId = crypto.randomUUID()
    valid.add(gestureId)
    active = {
      owner,
      pointerId: event.pointerId,
      document: host.document(),
      viewport: host.viewport(),
      gestureId,
      client,
      gesture: startFlowRotation({
        nodeId: node.id,
        center: {
          x: node.absolutePosition.x + node.dimensions.width / 2,
          y: node.absolutePosition.y + node.dimensions.height / 2,
        },
        pointer: point(client, owner),
        rotation: node.node.rotation ?? 0,
      }),
    }
    target.focus({ preventScroll: true })
    host.suppressClick()
    record(FlowSpan.browserPointerCapture, node.id, 'start')
    frame = requestAnimationFrame(pan)
  }

  const move = (event: PointerEvent) => {
    if (active?.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()

    if (event.buttons === 0) {
      cancel('buttons-released')

      return
    }

    active.client = { x: event.clientX, y: event.clientY }
    reconcile()
    paint()
  }

  const up = (event: PointerEvent) => {
    if (active?.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()
    active.client = { x: event.clientX, y: event.clientY }
    reconcile()
    paint()
    const session = release(false)

    if (session === undefined) {
      return
    }

    session.gesture = reduceFlowRotation(session.gesture, { kind: 'complete' })

    if (
      normalizeFlowRotation(session.gesture.rotation) ===
      normalizeFlowRotation(session.gesture.initialRotation)
    ) {
      valid.delete(session.gestureId)
      host.preview(null)
    } else {
      host.commit(
        session.gesture.nodeId,
        session.gesture.rotation,
        session.gestureId
      )
    }

    host.commitViewport?.(host.viewport())
  }

  const loss = (event: PointerEvent) => {
    cancel(event.type, event.pointerId)
  }

  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && cancel('escape')) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }

  const click = (event: MouseEvent) => {
    if (
      event.target instanceof Element &&
      event.target.closest('[data-flow-rotation]') !== null &&
      host.canvas()?.contains(event.target)
    ) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }

  return {
    active: () => active !== undefined,
    valid: (id: string) => valid.has(id),
    settle: (id: string) => {
      valid.delete(id)
    },
    cancel,
    reconcile,
    invalidate: () => {
      cancel('invalidated')
      valid.clear()
      host.preview(null)
    },
    mount: () => {
      if (mounted || disposed) {
        return
      }

      mounted = true
      document.addEventListener('pointerdown', down, true)
      document.addEventListener('pointermove', move, true)
      document.addEventListener('pointerup', up, true)
      document.addEventListener('pointercancel', loss, true)
      document.addEventListener('lostpointercapture', loss, true)
      document.addEventListener('keydown', key, true)
      document.addEventListener('click', click, true)
    },
    dispose: () => {
      if (disposed) {
        return
      }

      cancel('disposed')
      valid.clear()
      disposed = true

      if (!mounted) {
        return
      }

      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointermove', move, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('pointercancel', loss, true)
      document.removeEventListener('lostpointercapture', loss, true)
      document.removeEventListener('keydown', key, true)
      document.removeEventListener('click', click, true)
    },
  }
}

export const syncNodeRotationHandle = (
  element: HTMLElement,
  node: FlowNode
): void => {
  if (node.rotation === undefined) {
    delete element.dataset.rotation
  } else {
    element.dataset.rotation = String(node.rotation)
    element.style.transformOrigin = 'center'
  }

  let handle = element.querySelector<HTMLButtonElement>('[data-flow-rotation]')

  if (node.rotation === undefined) {
    handle?.remove()

    return
  }

  if (handle === null) {
    handle = document.createElement('button')
    handle.type = 'button'
    handle.dataset.flowRotation = ''
    handle.dataset.nodeId = node.id
    handle.className = 'nodrag nopan'
    handle.setAttribute('aria-label', `Rotate ${node.id}`)
    handle.textContent = '↻'
    handle.style.cssText =
      'position:absolute;left:calc(50% - 9px);top:-30px;width:18px;height:18px;padding:0;border:1px solid #555;border-radius:50%;background:white;color:#222;cursor:grab;touch-action:none;pointer-events:all'
    element.append(handle)
  }
}
