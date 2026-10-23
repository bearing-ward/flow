import {
  FlowFitViewOptionsSchema,
  flowInteractivityFor,
  resolveFlowAriaLabelConfig,
  isFlowInteractive,
} from '@flow/core'
import type {
  FlowAriaLabelConfig,
  FlowFitViewOptions,
  FlowInteractivity,
  FlowInteractivityInput,
  FlowPanelPosition as CoreFlowPanelPosition,
} from '@flow/core'
import { Effect, Schema as S } from 'effect'

import type { ViewportClient } from './application.ts'

export { createFlowMiniMap } from './ui/minimap.ts'

export type { FlowMiniMapMount, FoldkitMiniMapOptions } from './ui/minimap.ts'

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

interface BackgroundViewport {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

const backgroundRenderers = new WeakMap<
  SVGSVGElement,
  (viewport: BackgroundViewport) => void
>()

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
  pattern.setAttribute('patternUnits', 'userSpaceOnUse')
  pattern.setAttribute('class', options.patternClassName ?? '')

  const patternElement = owner.createElementNS(
    'http://www.w3.org/2000/svg',
    variant === 'dots' ? 'circle' : 'path'
  )

  if (variant === 'dots') {
    patternElement.setAttribute('fill', foreground)
  } else {
    patternElement.setAttribute('fill', 'none')
    patternElement.setAttribute('stroke', foreground)
    patternElement.setAttribute('stroke-width', String(width))
  }

  pattern.append(patternElement)

  const renderViewport = (viewport: BackgroundViewport): void => {
    const scaledGapX = gapX * viewport.zoom || 1
    const scaledGapY = gapY * viewport.zoom || 1
    const scaledSize = size * viewport.zoom
    const patternWidth = variant === 'cross' ? scaledSize : scaledGapX
    const patternHeight = variant === 'cross' ? scaledSize : scaledGapY
    const scaledOffsetX = offsetX * viewport.zoom + patternWidth / 2
    const scaledOffsetY = offsetY * viewport.zoom + patternHeight / 2

    pattern.setAttribute('width', String(scaledGapX))
    pattern.setAttribute('height', String(scaledGapY))
    pattern.setAttribute('x', String(viewport.x % scaledGapX))
    pattern.setAttribute('y', String(viewport.y % scaledGapY))
    pattern.setAttribute(
      'patternTransform',
      `translate(-${scaledOffsetX},-${scaledOffsetY})`
    )

    if (variant === 'dots') {
      patternElement.setAttribute('cx', String(scaledSize / 2))
      patternElement.setAttribute('cy', String(scaledSize / 2))
      patternElement.setAttribute('r', String(scaledSize / 2))
    } else {
      patternElement.setAttribute(
        'd',
        `M ${patternWidth / 2} 0 V ${patternHeight} M 0 ${patternHeight / 2} H ${patternWidth}`
      )
    }
  }

  backgroundRenderers.set(svg, renderViewport)
  renderViewport({ x: 0, y: 0, zoom: 1 })

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
  const render = backgroundRenderers.get(background)

  if (render !== undefined) {
    render(viewport)

    return
  }

  background
    .querySelector('pattern')
    ?.setAttribute(
      'patternTransform',
      `translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`
    )
}

export interface FlowControlsOptions {
  readonly position?: FlowPanelPosition
  readonly orientation?: 'vertical' | 'horizontal'
  readonly showZoom?: boolean
  readonly showFitView?: boolean
  /** Show the lock button that toggles node and edge interactivity. Defaults to true. */
  readonly showInteractive?: boolean
  /**
   * React `fitViewOptions` (`padding`, `nodes`, `includeHiddenNodes`,
   * `minZoom`, `maxZoom`, `duration`, `easing`) for the fit button.
   */
  readonly fitViewOptions?: typeof FlowFitViewOptionsSchema.Encoded
  readonly minZoom?: number
  readonly maxZoom?: number
  readonly zoomStep?: number
  /** Group label; wins over `ariaLabelConfig['controls.ariaLabel']`. */
  readonly ariaLabel?: string
  /**
   * Partial React `ariaLabelConfig` for the group and buttons, merged over
   * React's defaults ('Control Panel', 'Zoom In', 'Zoom Out', 'Fit View',
   * 'Toggle Interactivity').
   */
  readonly ariaLabelConfig?: Partial<FlowAriaLabelConfig>
  readonly className?: string
  readonly children?: readonly HTMLElement[]
  readonly onZoomIn?: () => void
  readonly onZoomOut?: () => void
  readonly onFitView?: () => void
  /** Called with the next interactive state after the lock button toggles. */
  readonly onInteractiveChange?: (interactive: boolean) => void
  /**
   * The Runtime's interaction switches, usually `createFoldkitInteractivity`.
   * The lock starts from them, follows every published change and sets all
   * three together.
   *
   * Without it the lock cannot reach the Runtime: the button only toggles
   * its own pressed state and reports it through `onInteractiveChange`, so
   * the app must apply the switches itself. Creating such a lock logs a
   * warning.
   */
  readonly interactivity?: {
    readonly get: () => FlowInteractivity
    readonly set: (next: FlowInteractivityInput) => void
    readonly subscribe: (
      listener: (interactivity: FlowInteractivity) => void
    ) => () => void
  }
}

export interface FlowControlsMount {
  readonly element: HTMLDivElement
  /** Whether nodes and edges currently accept drag, connect and select gestures. */
  readonly isInteractive: () => boolean
  readonly setInteractive: (interactive: boolean) => void
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

/** React Flow `PanelPosition`, including `center-left` and `center-right`. */
export type FlowPanelPosition = CoreFlowPanelPosition

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

const decodeFit = (
  input: typeof FlowFitViewOptionsSchema.Encoded | undefined
): FlowFitViewOptions | undefined =>
  input === undefined
    ? undefined
    : S.decodeUnknownSync(FlowFitViewOptionsSchema)(input)

/** Run React `fitViewOptions` through the viewport client. */
const fitView = async (
  viewport: ViewportClient,
  fit: FlowFitViewOptions | undefined
): Promise<void> => {
  await viewport.fitView(fit ?? 'all')
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

  const fit = decodeFit(options.fitViewOptions)

  const group = owner.createElement('div')
  const listeners: (() => void)[] = []
  group.className = ['flow-foldkit-controls', options.className]
    .filter(Boolean)
    .join(' ')
  group.dataset.position = options.position ?? 'bottom-left'
  group.dataset.orientation = options.orientation ?? 'vertical'
  group.setAttribute('role', 'group')
  const labels = resolveFlowAriaLabelConfig(options.ariaLabelConfig)

  // An explicit `ariaLabel` wins over `ariaLabelConfig`, as React.
  group.setAttribute(
    'aria-label',
    options.ariaLabel ?? labels['controls.ariaLabel']
  )
  group.dataset.flowNoPan = 'true'
  group.addEventListener('click', stopCanvasClick)
  listeners.push(() => group.removeEventListener('click', stopCanvasClick))

  let zoomIn: HTMLButtonElement | undefined
  let zoomOut: HTMLButtonElement | undefined

  const refresh = async () => {
    const currentZoom = await viewport.getZoom()

    if (zoomIn !== undefined) {
      zoomIn.disabled = currentZoom >= maxZoom
    }

    if (zoomOut !== undefined) {
      zoomOut.disabled = currentZoom <= minZoom
    }
  }

  const button = (text: string, label: string, action: () => Promise<void>) => {
    const element = owner.createElement('button')
    element.type = 'button'
    element.textContent = text
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
    zoomIn = button(
      'Zoom in',
      labels['controls.zoomIn.ariaLabel'],
      async () => {
        const currentZoom = await viewport.getZoom()

        await viewport.zoomTo(Math.min(maxZoom, currentZoom * step))
        options.onZoomIn?.()
      }
    )
    zoomOut = button(
      'Zoom out',
      labels['controls.zoomOut.ariaLabel'],
      async () => {
        const currentZoom = await viewport.getZoom()

        await viewport.zoomTo(Math.max(minZoom, currentZoom / step))
        options.onZoomOut?.()
      }
    )
  }

  if (options.showFitView !== false) {
    button('Fit view', labels['controls.fitView.ariaLabel'], async () => {
      await fitView(viewport, fit)
      options.onFitView?.()
    })
  }

  let interactiveState =
    options.interactivity === undefined
      ? true
      : isFlowInteractive(options.interactivity.get())

  const isInteractive = (): boolean => interactiveState

  let lockButton: HTMLButtonElement | undefined

  const renderLock = (interactive: boolean): void => {
    group.dataset.interactive = String(interactive)
    lockButton?.setAttribute('aria-pressed', String(!interactive))

    if (lockButton !== undefined) {
      lockButton.textContent = interactive ? 'Lock' : 'Unlock'
    }
  }

  // React Flow Controls sets nodesDraggable, nodesConnectable and
  // elementsSelectable together.
  const setInteractive = (interactive: boolean): void => {
    interactiveState = interactive
    options.interactivity?.set(flowInteractivityFor(interactive))
    renderLock(interactive)
  }

  if (options.interactivity === undefined) {
    if (options.showInteractive !== false) {
      Effect.runSync(
        Effect.logWarning(
          'Foldkit Controls lock has no interactivity client; it only reports onInteractiveChange'
        )
      )
    }
  } else {
    listeners.push(
      options.interactivity.subscribe((next) => {
        interactiveState = isFlowInteractive(next)
        renderLock(interactiveState)
      })
    )
  }

  if (options.showInteractive !== false) {
    lockButton = button(
      'Toggle interactivity',
      labels['controls.interactive.ariaLabel'],
      () => {
        const next = !isInteractive()
        setInteractive(next)
        options.onInteractiveChange?.(next)

        return Promise.resolve()
      }
    )
  }

  renderLock(interactiveState)

  for (const child of options.children ?? []) {
    group.append(child)
  }

  void refresh()

  return {
    element: group,
    isInteractive,
    setInteractive,
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
