import {
  edgeToolbarPlacement,
  nodeToolbarAnchor,
  nodeToolbarTranslate,
} from '@flow/core'
import type {
  FlowEdgeToolbarAlignX,
  FlowEdgeToolbarAlignY,
  FlowGraphView,
  FlowToolbarAlign,
  FlowToolbarPosition,
  NodeId,
  XYPosition,
} from '@flow/core'

interface ToolbarViewport {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

export interface FlowNodeToolbarOptions {
  readonly nodeId: NodeId
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
  readonly update: (graph: FlowGraphView, viewport: ToolbarViewport) => void
  readonly dispose: () => void
}

export interface FlowEdgeToolbarMount {
  readonly element: HTMLDivElement
  readonly update: (
    graph: FlowGraphView,
    viewport: ToolbarViewport,
    point?: XYPosition
  ) => void
  readonly dispose: () => void
}

const activeToolbarContents = new WeakSet<HTMLElement>()

const toolbarLayer = (canvas: HTMLElement): HTMLDivElement => {
  const existing = canvas.querySelector<HTMLDivElement>(
    ':scope > .flow-foldkit-toolbar-layer'
  )

  if (existing !== null) {
    return existing
  }

  const layer = canvas.ownerDocument.createElement('div')
  layer.className = 'flow-foldkit-toolbar-layer'
  layer.dataset.flowUi = 'toolbar-layer'
  canvas.append(layer)

  return layer
}

interface ToolbarHost {
  readonly element: HTMLDivElement
  readonly attach: () => void
  readonly dispose: () => void
}

/** Moves caller content into a canvas-scoped screen-space toolbar host. */
const mountToolbarHost = (
  canvas: HTMLElement,
  content: HTMLElement,
  kind: 'node' | 'edge',
  className: string | undefined
): ToolbarHost => {
  if (activeToolbarContents.has(content)) {
    throw new Error('Foldkit toolbar content is already mounted')
  }

  activeToolbarContents.add(content)

  const { parentNode: parent, nextSibling } = content
  const host = canvas.ownerDocument.createElement('div')

  host.className = [
    `flow-foldkit-${kind}-toolbar`,
    'flow-foldkit-nopan',
    'flow-foldkit-nodrag',
    'flow-foldkit-nowheel',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  host.dataset.flowNoPan = 'true'
  host.dataset.flowNoDrag = 'true'
  host.dataset.flowNoWheel = 'true'
  host.dataset.flowUi = `${kind}-toolbar`
  host.hidden = true
  host.append(content)

  const attach = (): void => {
    const layer = toolbarLayer(canvas)

    if (host.parentElement !== layer) {
      layer.append(host)
    }
  }

  attach()

  let disposed = false

  return {
    element: host,
    attach,
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      activeToolbarContents.delete(content)

      const layer = host.parentElement
      host.remove()

      if (layer?.childElementCount === 0) {
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

const place = (
  host: HTMLDivElement,
  position: XYPosition,
  translate: XYPosition
): void => {
  host.style.left = `${position.x}px`
  host.style.top = `${position.y}px`
  host.style.transform = `translate(${translate.x}%, ${translate.y}%)`
  host.hidden = false
}

/** Mount caller content as a fixed-size toolbar anchored to one node. */
export const mountFlowNodeToolbar = (
  canvas: HTMLElement,
  content: HTMLElement,
  options: FlowNodeToolbarOptions
): FlowNodeToolbarMount => {
  const host = mountToolbarHost(canvas, content, 'node', options.className)
  host.element.dataset.nodeToolbar = options.nodeId

  return {
    element: host.element,
    update: (graph, viewport) => {
      host.attach()

      const node = graph.nodes.get(options.nodeId)

      const selectedCount = graph.orderedNodes.filter(
        ({ node: item }) => item.selected === true
      ).length

      const visible =
        node !== undefined &&
        !node.hidden &&
        (options.isVisible ??
          (node.node.selected === true && selectedCount === 1))

      const anchor = visible
        ? nodeToolbarAnchor(graph, options.nodeId, viewport, {
            position: options.position ?? 'top',
            align: options.align ?? 'center',
            offset: options.offset ?? 10,
          })
        : undefined

      if (anchor === undefined) {
        host.element.hidden = true

        return
      }

      host.element.style.zIndex = String((node?.node.zIndex ?? 0) + 1)
      place(
        host.element,
        anchor.position,
        nodeToolbarTranslate(options.position, options.align)
      )
    },
    dispose: host.dispose,
  }
}

/** Mount caller content as a fixed-size toolbar anchored to a flow point of one edge. */
export const mountFlowEdgeToolbar = (
  canvas: HTMLElement,
  content: HTMLElement,
  options: FlowEdgeToolbarOptions
): FlowEdgeToolbarMount => {
  const host = mountToolbarHost(canvas, content, 'edge', options.className)
  host.element.dataset.edgeToolbar = options.edgeId

  let point: XYPosition = { x: options.x, y: options.y }

  return {
    element: host.element,
    update: (graph, viewport, nextPoint) => {
      host.attach()
      point = nextPoint ?? point

      const edge = graph.document.edges.find(({ id }) => id === options.edgeId)

      if (
        edge === undefined ||
        edge.hidden === true ||
        !(options.isVisible ?? edge.selected === true)
      ) {
        host.element.hidden = true

        return
      }

      const placement = edgeToolbarPlacement(
        point,
        viewport,
        options.alignX,
        options.alignY
      )

      host.element.style.zIndex = String((edge.zIndex ?? 0) + 1)
      place(host.element, placement.position, placement.translate)
    },
    dispose: host.dispose,
  }
}
