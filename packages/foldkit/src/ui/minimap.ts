import {
  FlowMiniMapOptionsSchema,
  flowMiniMapDefaults,
  flowMiniMapPanViewport,
  flowMiniMapWheelZoom,
  flowPanelPlacement,
  flowThemeTokens,
  flowThemeVariable,
  resolveFlowAriaLabelConfig,
  selectFlowMiniMapProjection,
} from '@flow/core'
import type {
  FlowAriaLabelConfig,
  FlowGraphView,
  FlowMiniMapNodeProps,
  FlowMiniMapOptions,
  FlowMiniMapProjection,
  FlowNode,
  FlowPanelPosition,
} from '@flow/core'
import { Schema as S, Struct } from 'effect'

import type { ViewportClient } from '../application.ts'

const svgNamespace = 'http://www.w3.org/2000/svg'

const width = 180

const height = 120

interface MiniMapViewport {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

/**
 * React `MiniMapProps` for one Foldkit minimap. The serializable part is
 * decoded with `FlowMiniMapOptionsSchema`; the node renderer is a host-side
 * DOM function, the Foldkit equivalent of React's `nodeComponent`.
 */
export type FoldkitMiniMapOptions = FlowMiniMapOptions & {
  /** Draw one minimap node. The minimap adds `data-minimap-node`. */
  readonly nodeComponent?: (
    props: FlowMiniMapNodeProps,
    owner: Document
  ) => SVGElement
  /** Partial React `ariaLabelConfig`; the title reads `minimap.ariaLabel`. */
  readonly ariaLabelConfig?: Partial<FlowAriaLabelConfig>
  /**
   * React `onClick`: a click on the minimap with the flow point under the
   * pointer. When given, the minimap does not recentre on click (React
   * never does); without it Foldkit recentres the viewport on that point.
   */
  readonly onClick?: (
    event: MouseEvent,
    point: { readonly x: number; readonly y: number }
  ) => void
  /** React `onNodeClick`: a click on one minimap node with its user node. */
  readonly onNodeClick?: (event: MouseEvent, node: FlowNode) => void
}

export interface FlowMiniMapMount {
  readonly element: SVGSVGElement
  readonly update: (graph: FlowGraphView, viewport: MiniMapViewport) => void
  readonly dispose: () => void
}

/**
 * The minimap's accessible title, or undefined for none. `ariaLabel` wins
 * (`null` removes the title), then `ariaLabelConfig['minimap.ariaLabel']`,
 * then React's default 'Mini Map'.
 */
export const foldkitMiniMapLabel = (
  options: Pick<FoldkitMiniMapOptions, 'ariaLabel' | 'ariaLabelConfig'>
): string | undefined => {
  if (options.ariaLabel === null) {
    return undefined
  }

  return (
    options.ariaLabel ??
    resolveFlowAriaLabelConfig(options.ariaLabelConfig)['minimap.ariaLabel']
  )
}

/** React's minimap mask: the whole minimap with the viewport cut out (evenodd). */
export const foldkitMiniMapMaskPath = (
  size: { readonly width: number; readonly height: number },
  viewport: FlowMiniMapProjection['viewport']
): string =>
  `M0,0h${size.width}v${size.height}h${-size.width}z ` +
  `M${viewport.x},${viewport.y}h${viewport.width}v${viewport.height}h${-viewport.width}z`

const themeFallbacks = new Map(
  flowThemeTokens.map((token) => [token.name, token.light])
)

/** A theme token with its color-mode default, then React's light value. */
const themed = (name: string): string => {
  const variable = flowThemeVariable(name)

  return `var(${variable}, var(${variable}-default, ${themeFallbacks.get(name) ?? 'initial'}))`
}

/**
 * The serializable minimap options. Function-valued node attributes and the
 * renderer stay host-typed; unknown keys are ignored by the decode.
 */
const SerializableMiniMapOptionsSchema = FlowMiniMapOptionsSchema.mapFields(
  Struct.omit(['nodeColor', 'nodeStrokeColor', 'nodeClassName'])
)

const decodeOptions = S.decodeUnknownSync(SerializableMiniMapOptionsSchema)

const isMacOs = (owner: Document): boolean =>
  owner.defaultView?.navigator.userAgent.includes('Mac') === true

let miniMapInstance = 0

/** Create an app-local, accessible graph overview for one Foldkit canvas. */
export const createFlowMiniMap = (
  owner: Document,
  canvas: HTMLElement,
  viewportClient: ViewportClient,
  graph: FlowGraphView,
  viewport: MiniMapViewport,
  options: FoldkitMiniMapOptions = {}
): FlowMiniMapMount => {
  const decoded = decodeOptions(options)

  miniMapInstance += 1

  const id = `flow-foldkit-minimap-${miniMapInstance}`

  const position: FlowPanelPosition =
    decoded.position ?? flowMiniMapDefaults.position

  const pannable = decoded.pannable ?? flowMiniMapDefaults.pannable
  const zoomable = decoded.zoomable ?? flowMiniMapDefaults.zoomable

  const svg = owner.createElementNS(svgNamespace, 'svg')
  const title = owner.createElementNS(svgNamespace, 'title')
  title.id = `${id}-title`
  svg.setAttribute(
    'class',
    'flow-foldkit-minimap flow-foldkit-nopan flow-foldkit-nowheel'
  )
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.dataset.flowMinimap = id
  svg.dataset.position = position
  svg.dataset.pannable = String(pannable)
  svg.dataset.zoomable = String(zoomable)

  const background = decoded.bgColor ?? themed('minimap-background-color')
  svg.style.background = background

  if (decoded.position !== undefined) {
    const placement = flowPanelPlacement(position)
    svg.style.top = placement.style.top ?? 'auto'
    svg.style.right = placement.style.right ?? 'auto'
    svg.style.bottom = placement.style.bottom ?? 'auto'
    svg.style.left = placement.style.left ?? 'auto'
    svg.style.transform = placement.style.transform ?? ''
  }

  let liveViewport = viewport

  const project = (
    nextGraph: FlowGraphView
  ): FlowMiniMapProjection | undefined =>
    selectFlowMiniMapProjection({
      graph: nextGraph,
      viewport: liveViewport,
      canvas: { width: canvas.clientWidth, height: canvas.clientHeight },
      size: { width, height },
      options,
    })

  let currentGraph = graph
  let current = project(graph)
  let disposed = false

  const drawNode = (node: FlowMiniMapNodeProps): SVGElement => {
    if (options.nodeComponent !== undefined) {
      return options.nodeComponent(node, owner)
    }

    const rect = owner.createElementNS(svgNamespace, 'rect')
    rect.setAttribute(
      'class',
      [
        'flow-foldkit-minimap-node',
        node.className,
        node.selected ? 'selected' : '',
      ]
        .filter(Boolean)
        .join(' ')
    )
    rect.setAttribute('x', String(node.x))
    rect.setAttribute('y', String(node.y))
    rect.setAttribute('width', String(node.width))
    rect.setAttribute('height', String(node.height))
    rect.setAttribute('rx', String(node.borderRadius))
    rect.setAttribute('ry', String(node.borderRadius))
    // Inline style beats the stylesheet's class rule, as React's style prop.
    rect.style.fill = node.fill ?? themed('minimap-node-background-color')
    rect.style.stroke = node.strokeColor ?? themed('minimap-node-stroke-color')
    rect.style.strokeWidth =
      node.strokeWidth === undefined
        ? themed('minimap-node-stroke-width')
        : String(node.strokeWidth)

    return rect
  }

  const render = (): void => {
    svg.replaceChildren()
    const label = foldkitMiniMapLabel(options)

    if (label === undefined) {
      svg.removeAttribute('aria-label')
      svg.removeAttribute('aria-labelledby')
    } else {
      title.textContent = label
      svg.append(title)
      svg.setAttribute('aria-label', label)
      svg.setAttribute('aria-labelledby', title.id)
    }

    svg.setAttribute('role', current === undefined ? 'img' : 'button')

    if (current === undefined) {
      svg.removeAttribute('tabindex')

      return
    }

    svg.setAttribute('tabindex', '0')
    const bg = owner.createElementNS(svgNamespace, 'rect')
    bg.setAttribute('class', 'flow-foldkit-minimap-background')
    bg.setAttribute('width', String(width))
    bg.setAttribute('height', String(height))
    bg.style.fill = background
    svg.append(bg)

    for (const node of current.nodes) {
      const element = drawNode(node)
      element.dataset.minimapNode = node.id
      svg.append(element)
    }

    const mask = owner.createElementNS(svgNamespace, 'path')
    mask.setAttribute('class', 'flow-foldkit-minimap-mask')
    mask.dataset.minimapMask = 'true'
    mask.setAttribute(
      'd',
      foldkitMiniMapMaskPath({ width, height }, current.viewport)
    )
    mask.setAttribute('fill-rule', 'evenodd')
    mask.style.pointerEvents = 'none'
    mask.style.fill =
      decoded.maskColor ?? themed('minimap-mask-background-color')
    mask.style.stroke =
      decoded.maskStrokeColor ?? themed('minimap-mask-stroke-color')
    mask.style.strokeWidth =
      decoded.maskStrokeWidth === undefined
        ? themed('minimap-mask-stroke-width')
        : String(decoded.maskStrokeWidth)
    svg.append(mask)
  }

  const toMiniMap = (
    event: MouseEvent
  ): { x: number; y: number } | undefined => {
    const rect = svg.getBoundingClientRect()

    if (rect.width <= 0 || rect.height <= 0) {
      return undefined
    }

    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    }
  }

  const center = (point: { readonly x: number; readonly y: number }): void => {
    void viewportClient.setCenter(point)
  }

  let pan: { pointerId: number; last: { x: number; y: number } } | undefined
  let suppressClick = false

  const notifyNodeClick = (event: MouseEvent): void => {
    const { target } = event

    if (options.onNodeClick === undefined || !(target instanceof Element)) {
      return
    }

    const nodeId = target.closest<SVGElement>('[data-minimap-node]')?.dataset
      .minimapNode

    const entry = currentGraph.orderedNodes.find((node) => node.id === nodeId)

    if (entry !== undefined) {
      options.onNodeClick(event, entry.node)
    }
  }

  const onClick = (event: MouseEvent): void => {
    event.stopPropagation()

    if (suppressClick) {
      suppressClick = false

      return
    }

    const point = toMiniMap(event)

    if (current === undefined || point === undefined) {
      return
    }

    const flowPoint = current.pointToGraph(point)

    notifyNodeClick(event)

    if (options.onClick === undefined) {
      center(flowPoint)
    } else {
      options.onClick(event, flowPoint)
    }
  }

  const onKeydown = (event: KeyboardEvent): void => {
    if (current === undefined || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }

    event.preventDefault()
    center(current.graphCenter)
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (!pannable || current === undefined || event.button !== 0) {
      return
    }

    const point = toMiniMap(event)

    if (point === undefined) {
      return
    }

    event.stopPropagation()
    suppressClick = false
    pan = { pointerId: event.pointerId, last: point }
    svg.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (pan === undefined || pan.pointerId !== event.pointerId) {
      return
    }

    const point = toMiniMap(event)

    if (current === undefined || point === undefined) {
      return
    }

    const delta = { x: point.x - pan.last.x, y: point.y - pan.last.y }

    if (delta.x === 0 && delta.y === 0) {
      return
    }

    pan.last = point
    suppressClick = true
    liveViewport = flowMiniMapPanViewport({
      viewport: liveViewport,
      delta,
      scale: current.scale,
      inversePan: decoded.inversePan ?? flowMiniMapDefaults.inversePan,
    })
    void viewportClient.setViewport(liveViewport)
  }

  const onPointerEnd = (event: PointerEvent): void => {
    if (pan?.pointerId === event.pointerId) {
      pan = undefined
    }
  }

  const onWheel = (event: WheelEvent): void => {
    event.stopPropagation()

    if (!zoomable || current === undefined) {
      return
    }

    event.preventDefault()
    const limits = viewportClient.getViewportLimits()

    const zoom = Math.min(
      limits.maxZoom,
      Math.max(
        limits.minZoom,
        flowMiniMapWheelZoom({
          zoom: liveViewport.zoom,
          deltaY: event.deltaY,
          deltaMode: event.deltaMode,
          zoomStep: decoded.zoomStep ?? flowMiniMapDefaults.zoomStep,
          macPinch: event.ctrlKey && isMacOs(owner),
        })
      )
    )

    if (zoom === liveViewport.zoom) {
      return
    }

    liveViewport = { ...liveViewport, zoom }
    // Without a point the Runtime zooms around the pane centre, as React.
    void viewportClient.zoomTo(zoom)
  }

  svg.addEventListener('click', onClick)
  svg.addEventListener('keydown', onKeydown)
  svg.addEventListener('pointerdown', onPointerDown)
  svg.addEventListener('pointermove', onPointerMove)
  svg.addEventListener('pointerup', onPointerEnd)
  svg.addEventListener('pointercancel', onPointerEnd)
  svg.addEventListener('lostpointercapture', onPointerEnd)
  svg.addEventListener('wheel', onWheel, { passive: false })
  canvas.append(svg)
  render()

  return {
    element: svg,
    update: (nextGraph, nextViewport) => {
      if (disposed) {
        return
      }

      currentGraph = nextGraph
      liveViewport = nextViewport
      current = project(nextGraph)
      render()
    },
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      svg.removeEventListener('click', onClick)
      svg.removeEventListener('keydown', onKeydown)
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', onPointerEnd)
      svg.removeEventListener('pointercancel', onPointerEnd)
      svg.removeEventListener('lostpointercapture', onPointerEnd)
      svg.removeEventListener('wheel', onWheel)
      svg.remove()
    },
  }
}
