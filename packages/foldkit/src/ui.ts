import { selectFlowMiniMapProjection } from '@flow/core'
import type { FlowGraphView, ViewportPaddingSchema } from '@flow/core'

import type { ViewportClient } from './application.ts'

const stopCanvasClick = (event: MouseEvent): void => event.stopPropagation()

export type FlowBackgroundVariant = 'dots' | 'lines' | 'cross'

export type FlowBackgroundSpacing = number | readonly [number, number]

export interface FlowBackgroundOptions {
  readonly variant?: FlowBackgroundVariant
  readonly gap?: FlowBackgroundSpacing
  readonly size?: number
  readonly offset?: FlowBackgroundSpacing
  readonly color?: string
  readonly bgColor?: string
  readonly lineWidth?: number
  readonly id?: string
  readonly className?: string
  readonly patternClassName?: string
}

const isAxisPair = (
  value: FlowBackgroundSpacing
): value is readonly [number, number] => Array.isArray(value)

const pair = (
  value: FlowBackgroundSpacing | undefined,
  fallback: number,
  positive = true
) => {
  let values: readonly [number, number]

  if (value === undefined) {
    values = [fallback, fallback]
  } else if (isAxisPair(value)) {
    values = [value[0] ?? fallback, value[1] ?? fallback]
  } else {
    values = [value, value]
  }

  const [x, y] = values

  if (
    (positive && (x <= 0 || y <= 0)) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    throw new RangeError('Background gap must contain positive finite values')
  }

  return [x, y] as const
}

/** Build an original, canvas-sized SVG background with no input ownership. */
export const createFlowBackground = (
  owner: Document,
  options: FlowBackgroundOptions = {}
): SVGSVGElement => {
  const variant = options.variant ?? 'dots'
  const [gapX, gapY] = pair(options.gap, 20)

  const [offsetX, offsetY] = pair(options.offset, 0, false)

  const size = options.size ?? (variant === 'cross' ? 6 : 1)
  const width = options.lineWidth ?? 1
  const id = options.id ?? `flow-background-${crypto.randomUUID()}`

  if (
    ![offsetX, offsetY, size, width].every(Number.isFinite) ||
    size <= 0 ||
    width <= 0
  ) {
    throw new RangeError(
      'Background size, offset, and line width must be finite and positive'
    )
  }

  const svg = owner.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const defs = owner.createElementNS('http://www.w3.org/2000/svg', 'defs')
  const pattern = owner.createElementNS('http://www.w3.org/2000/svg', 'pattern')
  const foreground = options.color ?? '#cbd5e1'
  const background = options.bgColor

  svg.setAttribute(
    'class',
    ['flow-foldkit-background', options.className].filter(Boolean).join(' ')
  )
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  pattern.setAttribute('id', id)
  pattern.setAttribute('width', String(gapX))
  pattern.setAttribute('height', String(gapY))
  pattern.setAttribute('x', String(offsetX))
  pattern.setAttribute('y', String(offsetY))
  pattern.setAttribute('patternUnits', 'userSpaceOnUse')
  pattern.setAttribute('class', options.patternClassName ?? '')

  const add = (tag: 'circle' | 'path', attrs: Record<string, string>) => {
    const element = owner.createElementNS('http://www.w3.org/2000/svg', tag)

    for (const [key, value] of Object.entries(attrs)) {
      element.setAttribute(key, value)
    }

    pattern.append(element)
  }

  if (variant === 'dots') {
    add('circle', {
      cx: String(gapX / 2),
      cy: String(gapY / 2),
      r: String(size),
      fill: foreground,
    })
  } else if (variant === 'lines') {
    add('path', {
      d: `M ${gapX} 0 L 0 0 0 ${gapY}`,
      fill: 'none',
      stroke: foreground,
      'stroke-width': String(width),
    })
  } else {
    const cx = gapX / 2
    const cy = gapY / 2
    add('path', {
      d: `M ${cx - size} ${cy} H ${cx + size} M ${cx} ${cy - size} V ${cy + size}`,
      fill: 'none',
      stroke: foreground,
      'stroke-width': String(width),
    })
  }

  defs.append(pattern)
  svg.append(defs)

  if (background !== undefined) {
    const rect = owner.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', '100%')
    rect.setAttribute('height', '100%')
    rect.setAttribute('fill', background)
    svg.append(rect)
  }

  const fill = owner.createElementNS('http://www.w3.org/2000/svg', 'rect')
  fill.setAttribute('width', '100%')
  fill.setAttribute('height', '100%')
  fill.setAttribute('fill', `url(#${id})`)
  svg.append(fill)

  return svg
}

export const alignFlowBackgroundToViewport = (
  background: SVGSVGElement,
  viewport: { readonly x: number; readonly y: number; readonly zoom: number }
): void => {
  const pattern = background.querySelector('pattern')

  if (pattern !== null) {
    pattern.setAttribute(
      'patternTransform',
      `translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`
    )
  }
}

export interface FlowControlsOptions {
  readonly position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'
  readonly orientation?: 'vertical' | 'horizontal'
  readonly showZoom?: boolean
  readonly showFitView?: boolean
  readonly fitViewOptions?: {
    readonly padding?: typeof ViewportPaddingSchema.Type
  }
  readonly minZoom?: number
  readonly maxZoom?: number
  readonly zoomStep?: number
  readonly ariaLabel?: string
  readonly className?: string
  readonly children?: readonly HTMLElement[]
  readonly onZoomIn?: () => void
  readonly onZoomOut?: () => void
  readonly onFitView?: () => void
}

export interface FlowControlsMount {
  readonly element: HTMLDivElement
  readonly dispose: () => void
}

export interface FlowCanvasUIMount extends FlowControlsMount {
  readonly background: SVGSVGElement
  readonly canvas: HTMLElement
  readonly updateViewport: (viewport: {
    readonly x: number
    readonly y: number
    readonly zoom: number
  }) => void
  readonly ensureMounted: () => void
}

export interface FlowCanvasUIOptions extends FlowControlsOptions {
  readonly background?: FlowBackgroundOptions
}

export interface FlowMiniMapMount {
  readonly element: SVGSVGElement
  readonly update: (
    graph: FlowGraphView,
    viewport: { readonly x: number; readonly y: number; readonly zoom: number }
  ) => void
  readonly dispose: () => void
}

export type FlowPanelPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface FlowPanelOptions {
  readonly position?: FlowPanelPosition
  readonly className?: string
  readonly role?: string
  readonly ariaLabel?: string
}

export interface FlowPanelMount {
  readonly element: HTMLDivElement
  readonly dispose: () => void
}

/** Mount caller-owned screen-space content in a canvas-scoped panel. */
export const mountFlowPanel = (
  canvas: HTMLElement,
  content: HTMLElement,
  options: FlowPanelOptions = {}
): FlowPanelMount => {
  const { parentNode: parent, nextSibling } = content
  const panel = canvas.ownerDocument.createElement('div')
  const position = options.position ?? 'top-left'

  panel.className = [
    'flow-foldkit-panel',
    `flow-foldkit-panel-${position}`,
    'flow-foldkit-nopan',
    'flow-foldkit-nodrag',
    'flow-foldkit-nowheel',
    options.className,
  ]
    .filter(Boolean)
    .join(' ')
  panel.dataset.flowNoPan = 'true'
  panel.dataset.flowNoDrag = 'true'
  panel.dataset.flowNoWheel = 'true'
  panel.dataset.flowUi = 'panel'
  panel.dataset.position = position
  panel.setAttribute('role', options.role ?? 'group')

  if (options.ariaLabel !== undefined) {
    panel.setAttribute('aria-label', options.ariaLabel)
  }

  panel.append(content)
  canvas.append(panel)

  let disposed = false

  return {
    element: panel,
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      panel.remove()

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

export interface FlowViewportPortalMount {
  readonly element: HTMLDivElement
  readonly dispose: () => void
}

interface FlowViewportPortalLifecycle {
  disposed: boolean
  observer: MutationObserver | undefined
}

const activeViewportPortalContents = new WeakSet<HTMLElement>()

/** Mount caller-owned DOM inside this Foldkit canvas's transformed graph viewport. */
export const mountFlowViewportPortal = (
  canvas: HTMLElement,
  content: HTMLElement
): FlowViewportPortalMount => {
  if (activeViewportPortalContents.has(content)) {
    throw new Error('Foldkit viewport portal content is already mounted')
  }

  const viewport = canvas.querySelector<HTMLElement>(
    ':scope > .flow-foldkit-viewport'
  )

  if (viewport === null) {
    throw new Error('Foldkit canvas has no graph viewport')
  }

  const owner = canvas.ownerDocument
  const MutationObserverConstructor = owner.defaultView?.MutationObserver

  if (MutationObserverConstructor === undefined) {
    throw new Error('Foldkit viewport portal requires a document window')
  }

  const placeholder = owner.createComment('flow viewport portal content')
  const origin = content.parentNode
  const host = owner.createElement('div')
  host.className = [
    'flow-foldkit-viewport-portal',
    'flow-foldkit-nopan',
    'flow-foldkit-nodrag',
    'flow-foldkit-nowheel',
  ].join(' ')
  host.dataset.flowNoPan = 'true'
  host.dataset.flowNoDrag = 'true'
  host.dataset.flowNoWheel = 'true'
  host.dataset.flowUi = 'viewport-portal'

  activeViewportPortalContents.add(content)

  if (origin !== null) {
    content.before(placeholder)
  }

  host.append(content)
  viewport.append(host)

  const lifecycle: FlowViewportPortalLifecycle = {
    disposed: false,
    observer: undefined,
  }

  const dispose = (): void => {
    if (lifecycle.disposed) {
      return
    }

    lifecycle.disposed = true
    lifecycle.observer?.disconnect()
    activeViewportPortalContents.delete(content)
    host.remove()

    if (origin !== null && placeholder.parentNode === origin) {
      placeholder.replaceWith(content)
    } else {
      placeholder.remove()
      content.remove()
    }
  }

  const observer = new MutationObserverConstructor(() => {
    if (!canvas.isConnected) {
      dispose()
    }
  })

  lifecycle.observer = observer
  observer.observe(owner.documentElement, {
    childList: true,
    subtree: true,
  })

  return {
    element: host,
    dispose,
  }
}

let miniMapInstance = 0

/** Create an app-local, accessible graph overview for one Foldkit canvas. */
export const createFlowMiniMap = (
  owner: Document,
  canvas: HTMLElement,
  viewportClient: ViewportClient,
  graph: FlowGraphView,
  viewport: { readonly x: number; readonly y: number; readonly zoom: number }
): FlowMiniMapMount => {
  miniMapInstance += 1
  const id = `flow-foldkit-minimap-${miniMapInstance}`
  const width = 180
  const height = 120
  const svg = owner.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const title = owner.createElementNS('http://www.w3.org/2000/svg', 'title')
  title.id = `${id}-title`
  svg.append(title)
  svg.setAttribute('class', 'flow-foldkit-minimap flow-foldkit-nopan')
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.dataset.flowMinimap = id

  let current = selectFlowMiniMapProjection({
    graph,
    viewport,
    canvas: { width: canvas.clientWidth, height: canvas.clientHeight },
    size: { width, height },
  })

  let disposed = false

  const render = (): void => {
    for (const child of [...svg.children].slice(1)) {
      child.remove()
    }

    const label =
      current === undefined
        ? 'Mini map (empty graph)'
        : 'Mini map. Press Enter or Space to center the graph.'

    title.textContent = label
    svg.setAttribute('role', current === undefined ? 'img' : 'button')
    svg.setAttribute('aria-label', label)
    svg.setAttribute('aria-labelledby', title.id)

    if (current === undefined) {
      svg.removeAttribute('tabindex')

      return
    }

    svg.setAttribute('tabindex', '0')
    const bg = owner.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('class', 'flow-foldkit-minimap-background')
    bg.setAttribute('width', String(width))
    bg.setAttribute('height', String(height))
    svg.append(bg)

    for (const node of current.nodes) {
      const rect = owner.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('class', 'flow-foldkit-minimap-node')
      rect.dataset.minimapNode = node.id
      rect.setAttribute('x', String(node.x))
      rect.setAttribute('y', String(node.y))
      rect.setAttribute('width', String(node.width))
      rect.setAttribute('height', String(node.height))
      svg.append(rect)
    }

    const mask = owner.createElementNS('http://www.w3.org/2000/svg', 'rect')
    mask.setAttribute('class', 'flow-foldkit-minimap-viewport')

    for (const key of ['x', 'y', 'width', 'height'] as const) {
      mask.setAttribute(key, String(current.viewport[key]))
    }

    svg.append(mask)
  }

  const center = (point: { readonly x: number; readonly y: number }): void => {
    void viewportClient.setCenter(point)
  }

  const onClick = (event: MouseEvent): void => {
    event.stopPropagation()

    if (current === undefined) {
      return
    }

    const rect = svg.getBoundingClientRect()

    if (rect.width <= 0 || rect.height <= 0) {
      return
    }

    center(
      current.pointToGraph({
        x: ((event.clientX - rect.left) / rect.width) * width,
        y: ((event.clientY - rect.top) / rect.height) * height,
      })
    )
  }

  const onKeydown = (event: KeyboardEvent): void => {
    if (current === undefined || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }

    event.preventDefault()
    center(current.graphCenter)
  }

  svg.addEventListener('click', onClick)
  svg.addEventListener('keydown', onKeydown)
  canvas.append(svg)
  render()

  return {
    element: svg,
    update: (nextGraph, nextViewport) => {
      if (disposed) {
        return
      }

      current = selectFlowMiniMapProjection({
        graph: nextGraph,
        viewport: nextViewport,
        canvas: { width: canvas.clientWidth, height: canvas.clientHeight },
        size: { width, height },
      })
      render()
    },
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      svg.removeEventListener('click', onClick)
      svg.removeEventListener('keydown', onKeydown)
      svg.remove()
    },
  }
}

/** Create accessible native controls backed by Foldkit's public viewport client. */
export const createFlowControls = (
  owner: Document,
  viewport: ViewportClient,
  options: FlowControlsOptions = {}
): FlowControlsMount => {
  const limits = viewport.getViewportLimits()
  const minZoom = Math.max(limits.minZoom, options.minZoom ?? limits.minZoom)
  const maxZoom = Math.min(limits.maxZoom, options.maxZoom ?? limits.maxZoom)
  const step = options.zoomStep ?? 1.2

  if (!(minZoom > 0 && maxZoom >= minZoom && step > 1)) {
    throw new RangeError(
      'Controls require valid zoom limits and a zoom step greater than one'
    )
  }

  const group = owner.createElement('div')
  const listeners: (() => void)[] = []
  group.className = ['flow-foldkit-controls', options.className]
    .filter(Boolean)
    .join(' ')
  group.dataset.position = options.position ?? 'bottom-left'
  group.dataset.orientation = options.orientation ?? 'vertical'
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', options.ariaLabel ?? 'Flow controls')
  group.dataset.flowNoPan = 'true'
  group.addEventListener('click', stopCanvasClick)
  listeners.push(() => group.removeEventListener('click', stopCanvasClick))

  let currentZoom = 1
  let zoomIn: HTMLButtonElement | undefined
  let zoomOut: HTMLButtonElement | undefined

  const refresh = async () => {
    currentZoom = await viewport.getZoom()

    if (zoomIn !== undefined) {
      zoomIn.disabled = currentZoom >= maxZoom
    }

    if (zoomOut !== undefined) {
      zoomOut.disabled = currentZoom <= minZoom
    }
  }

  const button = (label: string, action: () => Promise<void>) => {
    const element = owner.createElement('button')
    element.type = 'button'
    element.textContent = label
    element.setAttribute('aria-label', label)

    const listener = async () => {
      await action()
      await refresh()
    }

    element.addEventListener('click', listener)
    listeners.push(() => element.removeEventListener('click', listener))
    group.append(element)

    return element
  }

  if (options.showZoom !== false) {
    zoomIn = button('Zoom in', async () => {
      await viewport.zoomTo(Math.min(maxZoom, currentZoom * step))
      options.onZoomIn?.()
    })
    zoomOut = button('Zoom out', async () => {
      await viewport.zoomTo(Math.max(minZoom, currentZoom / step))
      options.onZoomOut?.()
    })
  }

  if (options.showFitView !== false) {
    button('Fit view', async () => {
      await viewport.fitView('all', options.fitViewOptions?.padding)
      options.onFitView?.()
    })
  }

  for (const child of options.children ?? []) {
    group.append(child)
  }

  void refresh()

  return {
    element: group,
    dispose: () => {
      for (const stop of listeners) {
        stop()
      }

      group.remove()
    },
  }
}

export const mountFlowCanvasUI = (
  canvas: HTMLElement,
  viewport: ViewportClient,
  options: FlowCanvasUIOptions = {}
): FlowCanvasUIMount => {
  const background = createFlowBackground(
    canvas.ownerDocument,
    options.background
  )

  const controls = createFlowControls(canvas.ownerDocument, viewport, options)
  background.classList.add('flow-foldkit-background-overlay')

  const updateViewport: FlowCanvasUIMount['updateViewport'] = (next) => {
    alignFlowBackgroundToViewport(background, next)
  }

  const ensureMounted = () => {
    if (background.parentElement !== canvas) {
      canvas.prepend(background)
    }

    if (controls.element.parentElement !== canvas) {
      canvas.append(controls.element)
    }
  }

  ensureMounted()
  updateViewport({ x: 0, y: 0, zoom: 1 })

  return {
    ...controls,
    background,
    canvas,
    ensureMounted,
    updateViewport,
    dispose: () => {
      controls.dispose()
      background.remove()
    },
  }
}
