import { Schema } from 'effect'

/**
 * The serializable part of a browser mouse event that Foldkit interaction
 * events carry in place of the DOM event React Flow handlers receive.
 */
export const MouseDetailSchema = Schema.Struct({
  clientX: Schema.Finite,
  clientY: Schema.Finite,
  button: Schema.Int,
  altKey: Schema.Boolean,
  ctrlKey: Schema.Boolean,
  metaKey: Schema.Boolean,
  shiftKey: Schema.Boolean,
})

export type MouseDetail = typeof MouseDetailSchema.Type

export const ObservedMouseNameSchema = Schema.Literals([
  'onPaneClick',
  'onPaneContextMenu',
  'onSelectionContextMenu',
  'onPaneMouseEnter',
  'onPaneMouseMove',
  'onPaneMouseLeave',
  'onNodeClick',
  'onNodeContextMenu',
  'onNodeMouseEnter',
  'onNodeMouseMove',
  'onNodeMouseLeave',
  'onEdgeContextMenu',
  'onEdgeMouseEnter',
  'onEdgeMouseMove',
  'onEdgeMouseLeave',
])

export type ObservedMouseName = typeof ObservedMouseNameSchema.Type

export type ObservedMouse =
  | {
      readonly kind: 'observe'
      readonly name: ObservedMouseName
      readonly nodeId: string | null
      readonly edgeId: string | null
      readonly pointer: MouseDetail
      /** A node click outside Foldkit's own controls selects the node. */
      readonly select: boolean
    }
  | {
      readonly kind: 'select-edge'
      readonly edgeId: string
      readonly pointer: MouseDetail
    }

export const mouseDetail = (event: MouseEvent): MouseDetail => ({
  clientX: event.clientX,
  clientY: event.clientY,
  button: event.button,
  altKey: event.altKey,
  ctrlKey: event.ctrlKey,
  metaKey: event.metaKey,
  shiftKey: event.shiftKey,
})

const elementOf = (target: EventTarget | null): Element | null =>
  target instanceof Element ? target : null

const nodeElement = (element: Element | null) =>
  element?.closest<HTMLElement>('.flow-foldkit-node[data-node-id]') ?? null

const edgeHitElement = (element: Element | null) =>
  element?.closest('.flow-foldkit-edge-hit-target') ?? null

/** Foldkit's own node controls, whose clicks do not select the node. */
const nodeControlSelector =
  '.flow-foldkit-select-node, [data-handle-id], [data-resize-direction], [data-edge-endpoint]'

const edgeIdOf = (element: Element | null): string | null =>
  element?.closest<SVGElement>('[data-edge-id]')?.dataset.edgeId ?? null

/**
 * Observe node, edge and pane mouse events of one canvas through document
 * listeners, so each record carries the event's client position, button and
 * modifier keys. Enter and leave come from `mouseover`/`mouseout` with
 * `relatedTarget`, which matches element `mouseenter`/`mouseleave`.
 */
export const observeCanvasMouse = (
  owner: Document,
  canvas: () => HTMLElement | null,
  emit: (record: ObservedMouse) => void,
  distances: () => {
    readonly paneClickDistance: number
    readonly nodeClickDistance: number
  } = () => ({ paneClickDistance: 0, nodeClickDistance: 0 }),
  onSuppressedClick?: () => void
): (() => void) => {
  const scoped = (target: EventTarget | null) => {
    const root = canvas()
    const element = elementOf(target)

    return root !== null &&
      element !== null &&
      element.closest('.flow-foldkit-canvas') === root
      ? { root, element }
      : undefined
  }

  const observe = (
    name: ObservedMouseName,
    event: MouseEvent,
    nodeId: string | null = null,
    edgeId: string | null = null,
    select = false
  ) =>
    emit({
      kind: 'observe',
      name,
      nodeId,
      edgeId,
      pointer: mouseDetail(event),
      select,
    })

  let press: { x: number; y: number; distance: number } | undefined

  const down = (event: PointerEvent): void => {
    if (scoped(event.target) !== undefined) {
      press = { x: event.clientX, y: event.clientY, distance: 0 }
    }
  }

  const travel = (event: PointerEvent): void => {
    if (press !== undefined) {
      press.distance = Math.max(
        press.distance,
        Math.hypot(event.clientX - press.x, event.clientY - press.y)
      )
    }
  }

  const click = (event: MouseEvent): void => {
    const target = scoped(event.target)

    if (target === undefined) {
      return
    }

    const node = nodeElement(target.element)

    const limit =
      node === null
        ? distances().paneClickDistance
        : distances().nodeClickDistance

    const travelled = press?.distance ?? 0
    press = undefined

    if (
      event.detail !== 0 &&
      travelled > limit &&
      (node === null || (limit > 0 && node.dataset.draggable === 'true'))
    ) {
      onSuppressedClick?.()

      return
    }

    if (node !== null) {
      observe(
        'onNodeClick',
        event,
        node.dataset.nodeId ?? null,
        null,
        target.element.closest(nodeControlSelector) === null
      )

      return
    }

    const edgeId = edgeIdOf(edgeHitElement(target.element))

    if (edgeId !== null) {
      emit({ kind: 'select-edge', edgeId, pointer: mouseDetail(event) })

      return
    }

    observe('onPaneClick', event)
  }

  const contextMenu = (event: MouseEvent): void => {
    const target = scoped(event.target)

    if (target === undefined) {
      return
    }

    event.preventDefault()

    const node = nodeElement(target.element)

    if (node !== null) {
      observe('onNodeContextMenu', event, node.dataset.nodeId ?? null)

      return
    }

    const edgeId = edgeIdOf(target.element)

    if (edgeId !== null) {
      observe('onEdgeContextMenu', event, null, edgeId)

      return
    }

    observe('onPaneContextMenu', event)
  }

  const move = (event: MouseEvent): void => {
    const target = scoped(event.target)

    if (target === undefined) {
      return
    }

    const node = nodeElement(target.element)

    if (node !== null) {
      observe('onNodeMouseMove', event, node.dataset.nodeId ?? null)
    }

    const edgeId = edgeIdOf(edgeHitElement(target.element))

    if (edgeId !== null) {
      observe('onEdgeMouseMove', event, null, edgeId)
    }

    observe('onPaneMouseMove', event)
  }

  const crossing = (event: MouseEvent, entering: boolean): void => {
    const root = canvas()
    const element = elementOf(event.target)
    const related = elementOf(event.relatedTarget)

    if (root === null || element === null || !root.contains(element)) {
      return
    }

    const inside = scoped(element) === undefined ? null : element
    const relatedInside = scoped(related) === undefined ? null : related
    const node = nodeElement(inside)
    const edge = edgeHitElement(inside)
    const paneCrossed = related === null || !root.contains(related)

    const nodeCrossed =
      node !== null && node !== nodeElement(relatedInside)
        ? (node.dataset.nodeId ?? null)
        : null

    const edgeCrossed =
      edge !== null && edge !== edgeHitElement(relatedInside)
        ? edgeIdOf(edge)
        : null

    if (entering) {
      if (paneCrossed) {
        observe('onPaneMouseEnter', event)
      }

      if (nodeCrossed !== null) {
        observe('onNodeMouseEnter', event, nodeCrossed)
      }

      if (edgeCrossed !== null) {
        observe('onEdgeMouseEnter', event, null, edgeCrossed)
      }

      return
    }

    if (nodeCrossed !== null) {
      observe('onNodeMouseLeave', event, nodeCrossed)
    }

    if (edgeCrossed !== null) {
      observe('onEdgeMouseLeave', event, null, edgeCrossed)
    }

    if (paneCrossed) {
      observe('onPaneMouseLeave', event)
    }
  }

  const over = (event: MouseEvent): void => crossing(event, true)

  const out = (event: MouseEvent): void => crossing(event, false)

  owner.addEventListener('pointerdown', down, true)
  owner.addEventListener('pointermove', travel, true)
  owner.addEventListener('click', click)
  owner.addEventListener('contextmenu', contextMenu)
  owner.addEventListener('mousemove', move)
  owner.addEventListener('mouseover', over)
  owner.addEventListener('mouseout', out)

  return () => {
    owner.removeEventListener('pointerdown', down, true)
    owner.removeEventListener('pointermove', travel, true)
    owner.removeEventListener('click', click)
    owner.removeEventListener('contextmenu', contextMenu)
    owner.removeEventListener('mousemove', move)
    owner.removeEventListener('mouseover', over)
    owner.removeEventListener('mouseout', out)
  }
}
