import {
  edgeToolbarPlacement,
  nodeToolbarAnchorForBounds,
  nodeToolbarTranslate,
} from '@flow/core'
import type {
  FlowEdgeToolbarAlignX,
  FlowEdgeToolbarAlignY,
  FlowToolbarAlign,
  FlowToolbarPosition,
  XYPosition,
} from '@flow/core'

import { controllerCanvas } from './overlay.ts'
import type { FlowUIController } from './overlay.ts'

export interface FlowNodeToolbarOptions {
  readonly nodeId: string
  readonly position?: FlowToolbarPosition
  readonly align?: FlowToolbarAlign
  readonly offset?: number
  readonly isVisible?: boolean
  readonly className?: string
}

export interface FlowEdgeToolbarOptions {
  readonly edgeId: string
  readonly x: number
  readonly y: number
  readonly alignX?: FlowEdgeToolbarAlignX
  readonly alignY?: FlowEdgeToolbarAlignY
  readonly isVisible?: boolean
  readonly className?: string
}

export interface FlowNodeToolbarMount {
  readonly element: HTMLDivElement
  /** Re-read controller state now; subscriptions already do this on change. */
  readonly update: () => void
  readonly destroy: () => void
}

export interface FlowEdgeToolbarMount {
  readonly element: HTMLDivElement
  /** Re-read controller state, optionally moving the flow-space anchor point. */
  readonly update: (point?: XYPosition) => void
  readonly destroy: () => void
}

const activeToolbarContents = new WeakSet<HTMLElement>()

const noop = (): void => undefined

const toolbarLayer = (controller: FlowUIController): HTMLDivElement => {
  const portal = controller.overlayPortal

  const existing = portal.querySelector<HTMLDivElement>(
    ':scope > .flow-toolbar-layer'
  )

  if (existing !== null) {
    return existing
  }

  const layer = portal.ownerDocument.createElement('div')
  layer.className = 'flow-toolbar-layer'
  layer.dataset.flowUi = 'toolbar-layer'
  portal.append(layer)

  return layer
}

interface ToolbarHost {
  readonly element: HTMLDivElement
  readonly place: (position: XYPosition, translate: XYPosition) => void
  readonly hide: () => void
  /** Re-run `refresh` once per frame after controller or rendered-node changes. */
  readonly watch: (refresh: () => void) => void
  readonly dispose: () => void
}

/** Moves caller content into a canvas-scoped, screen-space toolbar host. */
const mountToolbarHost = (
  controller: FlowUIController,
  content: HTMLElement,
  kind: 'node' | 'edge',
  className: string | undefined,
  observed?: () => Element | null
): ToolbarHost => {
  if (activeToolbarContents.has(content)) {
    throw new Error('Flow toolbar content is already mounted')
  }

  activeToolbarContents.add(content)

  const { parentNode: parent, nextSibling } = content
  let layer = toolbarLayer(controller)
  const host = layer.ownerDocument.createElement('div')

  host.className = [
    `flow-${kind}-toolbar`,
    'nopan',
    'nodrag',
    'nowheel',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  host.dataset.flowNoPan = ''
  host.dataset.flowNoDrag = ''
  host.dataset.flowNoWheel = ''
  host.dataset.flowUi = `${kind}-toolbar`
  host.hidden = true
  host.append(content)

  if (kind === 'edge') {
    layer.append(host)
  }

  let frame: number | undefined
  let observe: () => void = noop
  let stops: readonly (() => void)[] = []

  const watch = (refresh: () => void): void => {
    const schedule = (): void => {
      frame ??= requestAnimationFrame(() => {
        frame = undefined
        refresh()
      })
    }

    // Rendered drag frames move node elements before the document commits.
    const observer =
      observed === undefined ? undefined : new MutationObserver(schedule)

    let observedElement: Element | null = null

    observe = () => {
      const element = observed?.() ?? null

      if (element === observedElement) {
        return
      }

      observer?.disconnect()
      observedElement = element

      if (element !== null) {
        observer?.observe(element, {
          attributes: true,
          attributeFilter: ['style', 'class'],
        })
      }
    }

    stops = [
      () => observer?.disconnect(),
      controller.subscribeState(schedule),
      controller.subscribeViewport(schedule),
      controller.subscribe(schedule),
    ]
    refresh()
  }

  let disposed = false

  return {
    element: host,
    place: (position, translate) => {
      observe()
      host.style.left = `${position.x}px`
      host.style.top = `${position.y}px`
      host.style.transform = `translate(${translate.x}%, ${translate.y}%)`

      if (kind === 'node' && host.parentElement === null) {
        layer = toolbarLayer(controller)
        layer.append(host)
      }

      host.hidden = false
    },
    hide: () => {
      host.hidden = true

      if (kind === 'node') {
        host.remove()
      }
    },
    watch,
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true

      for (const stop of stops) {
        stop()
      }

      if (frame !== undefined) {
        cancelAnimationFrame(frame)
      }

      activeToolbarContents.delete(content)
      host.remove()

      if (layer.childElementCount === 0) {
        layer.remove()
      }

      if (parent !== null) {
        if (nextSibling?.parentNode === parent) {
          nextSibling.before(content)
        } else {
          parent.append(content)
        }
      }
    },
  }
}

/** React Flow `<NodeToolbar />`: fixed-size caller content anchored to one node. */
export const createFlowNodeToolbar = (
  controller: FlowUIController,
  content: HTMLElement,
  options: FlowNodeToolbarOptions
): FlowNodeToolbarMount => {
  const canvas = controllerCanvas(controller)

  const nodeElement = (): Element | null =>
    canvas.querySelector(
      `.flow-node[data-node-id="${CSS.escape(options.nodeId)}"]`
    )

  const host = mountToolbarHost(
    controller,
    content,
    'node',
    options.className,
    nodeElement
  )

  host.element.dataset.nodeToolbar = options.nodeId

  const update = (): void => {
    const nodes = controller.getNodes()
    const node = nodes.find(({ id }) => id === options.nodeId)
    const element = nodeElement()

    const selectedCount = nodes.filter(
      ({ selected }) => selected === true
    ).length

    const visible =
      node !== undefined &&
      element !== null &&
      node.hidden !== true &&
      (options.isVisible ?? (node.selected === true && selectedCount === 1))

    if (!visible) {
      host.hide()

      return
    }

    // Rendered screen bounds include in-progress drag frames and the viewport.
    const origin = canvas.getBoundingClientRect()
    const rect = element.getBoundingClientRect()

    const anchor = nodeToolbarAnchorForBounds(
      options.nodeId,
      {
        x: rect.left - origin.left - canvas.clientLeft,
        y: rect.top - origin.top - canvas.clientTop,
        width: rect.width,
        height: rect.height,
      },
      { x: 0, y: 0, zoom: 1 },
      {
        position: options.position ?? 'top',
        align: options.align ?? 'center',
        offset: options.offset ?? 10,
      }
    )

    host.element.style.zIndex = String((node.zIndex ?? 0) + 1)
    host.place(
      anchor.position,
      nodeToolbarTranslate(options.position, options.align)
    )
  }

  host.watch(update)

  return { element: host.element, update, destroy: host.dispose }
}

/** React Flow `<EdgeToolbar />`: fixed-size caller content at a flow point of one edge. */
export const createFlowEdgeToolbar = (
  controller: FlowUIController,
  content: HTMLElement,
  options: FlowEdgeToolbarOptions
): FlowEdgeToolbarMount => {
  let point: XYPosition = { x: options.x, y: options.y }

  const host = mountToolbarHost(controller, content, 'edge', options.className)
  host.element.dataset.edgeToolbar = options.edgeId

  const refresh = (): void => {
    const edge = controller.getEdge(options.edgeId)

    if (
      edge === undefined ||
      edge.hidden === true ||
      !(options.isVisible ?? edge.selected === true)
    ) {
      host.hide()

      return
    }

    const placement = edgeToolbarPlacement(
      point,
      controller.getViewport(),
      options.alignX,
      options.alignY
    )

    host.element.style.zIndex = String((edge.zIndex ?? 0) + 1)
    host.place(placement.position, placement.translate)
  }

  host.watch(refresh)

  return {
    element: host.element,
    update: (next) => {
      point = next ?? point
      refresh()
    },
    destroy: host.dispose,
  }
}
