import {
  createFlowGraph,
  flowMeasurementsFromInternalNodes,
  flowMiniMapDefaults,
  FlowMiniMapOptionsSchema,
  flowMiniMapPanViewport,
  flowMiniMapWheelZoom,
  flowThemeValue,
  NodeIdSchema,
  selectFlowMiniMapProjection,
} from '@flow/core'
import type {
  FlowMiniMapNodeAttribute,
  FlowMiniMapNodeProps,
  FlowMiniMapProjection,
  FlowNode,
  XYPosition,
} from '@flow/core'
import * as S from 'effect/Schema'

import type { JavaScriptFlowController } from './mount-flow.ts'
import { applyFlowClassName } from './presentation.ts'

const svgNamespace = 'http://www.w3.org/2000/svg'

/** The serializable options; node attributes may also be functions. */
const MiniMapOptionsSchema = S.Struct({
  ...FlowMiniMapOptionsSchema.fields,
  nodeColor: S.optional(S.String),
  nodeStrokeColor: S.optional(S.String),
  nodeClassName: S.optional(S.String),
  width: S.optional(S.Finite.check(S.isGreaterThan(0))),
  height: S.optional(S.Finite.check(S.isGreaterThan(0))),
  className: S.optional(S.String),
})

/**
 * React `MiniMapProps`. `nodeColor`, `nodeStrokeColor` and `nodeClassName`
 * take a value or a per-node function; `nodeComponent` draws each node from
 * React `MiniMapNodeProps` instead of the default rectangle.
 */
export type FlowMiniMapOptions = Omit<
  typeof MiniMapOptionsSchema.Encoded,
  'nodeColor' | 'nodeStrokeColor' | 'nodeClassName'
> & {
  readonly nodeColor?: FlowMiniMapNodeAttribute | undefined
  readonly nodeStrokeColor?: FlowMiniMapNodeAttribute | undefined
  readonly nodeClassName?: FlowMiniMapNodeAttribute | undefined
  /** React `nodeComponent`: return the SVG element for one minimap node. */
  readonly nodeComponent?:
    | ((props: FlowMiniMapNodeProps) => SVGElement)
    | undefined
  /** React `onClick`: the clicked point in flow coordinates. */
  readonly onClick?:
    | ((event: MouseEvent, position: XYPosition) => void)
    | undefined
  readonly onNodeClick?:
    | ((event: MouseEvent, node: FlowNode) => void)
    | undefined
}

export interface FlowMiniMapMount {
  readonly element: HTMLDivElement
  readonly svg: SVGSVGElement
  /** Redraw now, for example after nodes were measured outside an update. */
  readonly refresh: () => void
  readonly destroy: () => void
}

type MiniMapController = Pick<
  JavaScriptFlowController,
  | 'overlayPortal'
  | 'getSnapshot'
  | 'getNodes'
  | 'getNode'
  | 'getInternalNode'
  | 'getViewport'
  | 'setViewport'
  | 'zoomTo'
  | 'nodesInitialized'
  | 'subscribeState'
  | 'subscribeViewport'
  | 'getRenderedNodePositions'
  | 'subscribeRenderedPositions'
> &
  Partial<Pick<JavaScriptFlowController, 'getAriaLabelConfig'>>

let nextTitleId = 0

/** The node presentation options `selectFlowMiniMapProjection` takes. */
type MiniMapNodeOptions = NonNullable<
  Parameters<typeof selectFlowMiniMapProjection>[0]['options']
>

/** React's default minimap size. */
const defaultSize = { width: 200, height: 150 }

/** Frames to redraw after mount while node measurements arrive. */
const settleFrames = 60

const isMac = (): boolean => /mac/iu.test(globalThis.navigator.platform)

const defaultMiniMapNode = (
  props: FlowMiniMapNodeProps,
  rect: SVGElement = globalThis.document.createElementNS(svgNamespace, 'rect')
): SVGElement => {
  rect.setAttribute('class', '')
  rect.removeAttribute('style')
  rect.classList.add('flow-minimap-node')
  rect.classList.toggle('selected', props.selected)
  applyFlowClassName(rect, props.className)
  rect.setAttribute('x', String(props.x))
  rect.setAttribute('y', String(props.y))
  rect.setAttribute('width', String(props.width))
  rect.setAttribute('height', String(props.height))
  rect.setAttribute('rx', String(props.borderRadius))
  rect.setAttribute('ry', String(props.borderRadius))
  rect.setAttribute('shape-rendering', 'crispEdges')

  // React's MiniMapNode style: fill, stroke and stroke width when set.
  if (props.fill !== undefined) {
    rect.style.fill = props.fill
  }

  if (props.strokeColor !== undefined) {
    rect.style.stroke = props.strokeColor
  }

  if (props.strokeWidth !== undefined) {
    rect.style.strokeWidth = String(props.strokeWidth)
  }

  return rect
}

/**
 * React `<MiniMap />`: a positioned overview of the accepted graph with the
 * visible area cut out of a mask. Drag pans when `pannable`, the wheel
 * zooms around the pane center when `zoomable`.
 */
export const createFlowMiniMap = (
  controller: MiniMapController,
  input: FlowMiniMapOptions = {}
): FlowMiniMapMount => {
  const {
    nodeColor,
    nodeStrokeColor,
    nodeClassName,
    nodeComponent,
    onClick,
    onNodeClick,
    ...serializable
  } = input

  const options = S.decodeUnknownSync(MiniMapOptionsSchema)(serializable)
  const owner = controller.overlayPortal.ownerDocument
  const width = options.width ?? defaultSize.width
  const height = options.height ?? defaultSize.height

  const panel = owner.createElement('div')
  panel.className = 'flow-ui-overlay flow-minimap-panel nopan nodrag nowheel'
  applyFlowClassName(panel, options.className)
  panel.dataset.flowUi = 'minimap'
  panel.dataset.testid = 'flow-minimap-panel'
  panel.dataset.position = options.position ?? flowMiniMapDefaults.position
  panel.dataset.flowNoPan = ''
  panel.dataset.flowNoDrag = ''
  panel.dataset.flowNoWheel = ''

  if (options.bgColor !== undefined) {
    panel.style.setProperty('--flow-minimap-background-color', options.bgColor)
  }

  const svg = owner.createElementNS(svgNamespace, 'svg')
  svg.classList.add('flow-minimap-svg')
  svg.dataset.testid = 'flow-minimap'
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('role', 'img')
  svg.dataset.pannable = String(options.pannable === true)
  svg.dataset.zoomable = String(options.zoomable === true)

  const ariaLabel =
    options.ariaLabel === undefined
      ? (controller.getAriaLabelConfig?.()['minimap.ariaLabel'] ?? 'Mini Map')
      : options.ariaLabel

  if (ariaLabel !== null) {
    nextTitleId += 1
    const title = owner.createElementNS(svgNamespace, 'title')
    title.id = `flow-minimap-title-${nextTitleId}`
    title.textContent = ariaLabel
    svg.setAttribute('aria-labelledby', title.id)
    svg.append(title)
  }

  const nodesLayer = owner.createElementNS(svgNamespace, 'g')
  nodesLayer.classList.add('flow-minimap-nodes')

  const mask = owner.createElementNS(svgNamespace, 'path')
  mask.classList.add('flow-minimap-mask')
  mask.dataset.testid = 'flow-minimap-mask'
  mask.setAttribute('fill-rule', 'evenodd')
  mask.setAttribute('pointer-events', 'none')
  mask.style.fill =
    options.maskColor ?? flowThemeValue('minimap-mask-background-color')
  mask.style.stroke =
    options.maskStrokeColor ?? flowThemeValue('minimap-mask-stroke-color')
  mask.style.strokeWidth =
    options.maskStrokeWidth === undefined
      ? flowThemeValue('minimap-mask-stroke-width')
      : String(options.maskStrokeWidth)

  svg.append(nodesLayer, mask)
  panel.append(svg)
  controller.overlayPortal.append(panel)

  const canvasElement = (): HTMLElement =>
    controller.overlayPortal.closest<HTMLElement>('.flow-canvas') ??
    controller.overlayPortal

  let projection: FlowMiniMapProjection | undefined

  const nodeOptions: {
    -readonly [Key in keyof MiniMapNodeOptions]: MiniMapNodeOptions[Key]
  } = {}

  if (nodeColor !== undefined) {
    nodeOptions.nodeColor = nodeColor
  }

  if (nodeStrokeColor !== undefined) {
    nodeOptions.nodeStrokeColor = nodeStrokeColor
  }

  if (nodeClassName !== undefined) {
    nodeOptions.nodeClassName = nodeClassName
  }

  if (options.nodeBorderRadius !== undefined) {
    nodeOptions.nodeBorderRadius = options.nodeBorderRadius
  }

  if (options.nodeStrokeWidth !== undefined) {
    nodeOptions.nodeStrokeWidth = options.nodeStrokeWidth
  }

  const nodeElements = new Map<string, SVGElement>()

  const render = (): void => {
    const { document } = controller.getSnapshot()

    // Drawn positions, so the overview follows drags and resizes live.
    const graph = createFlowGraph(
      document,
      flowMeasurementsFromInternalNodes(
        document.nodes.map((node) => controller.getInternalNode(node.id))
      ),
      new Map(
        [...controller.getRenderedNodePositions()].map(([id, position]) => [
          NodeIdSchema.make(id),
          position,
        ])
      )
    )

    const canvas = canvasElement()

    projection = selectFlowMiniMapProjection({
      graph,
      viewport: controller.getViewport(),
      canvas: { width: canvas.clientWidth, height: canvas.clientHeight },
      size: { width, height },
      options: nodeOptions,
    })

    if (projection === undefined) {
      nodesLayer.replaceChildren()
      nodeElements.clear()
      mask.setAttribute('d', '')

      return
    }

    const visibleIds = new Set(projection.nodes.map((node) => node.id))

    for (const [id, element] of nodeElements) {
      if (!visibleIds.has(id) || nodeComponent !== undefined) {
        element.remove()
        nodeElements.delete(id)
      }
    }

    for (const props of projection.nodes) {
      const element =
        nodeComponent === undefined
          ? defaultMiniMapNode(props, nodeElements.get(props.id))
          : nodeComponent(props)

      element.dataset.nodeId = props.id
      nodeElements.set(props.id, element)
      nodesLayer.append(element)
    }

    const box = projection.viewBox
    svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`)
    mask.setAttribute('d', projection.maskPath)
    svg.dataset.scale = String(projection.scale)
  }

  let frame: number | undefined

  const settle = (remaining: number): void => {
    frame = undefined
    render()

    if (remaining > 0 && !controller.nodesInitialized()) {
      frame = globalThis.requestAnimationFrame(() => settle(remaining - 1))
    }
  }

  settle(settleFrames)

  // One redraw per animation frame for preview frames.
  let previewFrame: number | undefined

  const renderPreview = (): void => {
    previewFrame ??= globalThis.requestAnimationFrame(() => {
      previewFrame = undefined
      render()
    })
  }

  const stopState = controller.subscribeState(render)
  const stopViewport = controller.subscribeViewport(render)
  const stopPreview = controller.subscribeRenderedPositions(renderPreview)

  const pointInMiniMap = (event: MouseEvent): XYPosition => {
    const bounds = svg.getBoundingClientRect()

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * width,
      y: ((event.clientY - bounds.top) / bounds.height) * height,
    }
  }

  let pan:
    | { readonly pointerId: number; last: XYPosition; moved: boolean }
    | undefined

  const onPointerDown = (event: PointerEvent): void => {
    event.stopPropagation()

    if (options.pannable !== true || event.button !== 0) {
      return
    }

    pan = {
      pointerId: event.pointerId,
      last: { x: event.clientX, y: event.clientY },
      moved: false,
    }
    svg.setPointerCapture(event.pointerId)
    panel.classList.add('panning')
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (pan?.pointerId !== event.pointerId || projection === undefined) {
      return
    }

    const delta = {
      x: event.clientX - pan.last.x,
      y: event.clientY - pan.last.y,
    }

    pan.last = { x: event.clientX, y: event.clientY }
    pan.moved = true

    void controller.setViewport(
      flowMiniMapPanViewport({
        viewport: controller.getViewport(),
        delta,
        scale: projection.scale,
        inversePan: options.inversePan ?? flowMiniMapDefaults.inversePan,
      })
    )
  }

  const onPointerUp = (event: PointerEvent): void => {
    if (pan?.pointerId !== event.pointerId) {
      return
    }

    pan = undefined
    panel.classList.remove('panning')

    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId)
    }
  }

  const onWheel = (event: WheelEvent): void => {
    if (options.zoomable !== true) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    void controller.zoomTo(
      flowMiniMapWheelZoom({
        zoom: controller.getViewport().zoom,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        zoomStep: options.zoomStep ?? flowMiniMapDefaults.zoomStep,
        macPinch: event.ctrlKey && isMac(),
      })
    )
  }

  const onSvgClick = (event: MouseEvent): void => {
    event.stopPropagation()

    if (projection === undefined) {
      return
    }

    const nodeElement =
      event.target instanceof Element
        ? event.target.closest<SVGElement>('[data-node-id]')
        : null

    const node =
      nodeElement?.dataset.nodeId === undefined
        ? undefined
        : controller.getNode(nodeElement.dataset.nodeId)

    if (node !== undefined) {
      onNodeClick?.(event, node)
    }

    onClick?.(event, projection.pointToGraph(pointInMiniMap(event)))
  }

  svg.addEventListener('pointerdown', onPointerDown)
  svg.addEventListener('pointermove', onPointerMove)
  svg.addEventListener('pointerup', onPointerUp)
  svg.addEventListener('pointercancel', onPointerUp)
  svg.addEventListener('wheel', onWheel, { passive: false })
  svg.addEventListener('click', onSvgClick)

  let destroyed = false

  return {
    element: panel,
    svg,
    refresh: render,
    destroy: () => {
      if (destroyed) {
        return
      }

      destroyed = true

      if (frame !== undefined) {
        globalThis.cancelAnimationFrame(frame)
      }

      stopState()
      stopViewport()
      stopPreview()

      if (previewFrame !== undefined) {
        globalThis.cancelAnimationFrame(previewFrame)
      }

      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', onPointerUp)
      svg.removeEventListener('pointercancel', onPointerUp)
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('click', onSvgClick)
      panel.remove()
    },
  }
}
