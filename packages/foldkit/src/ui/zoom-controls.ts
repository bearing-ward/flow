import {
  clampZoom,
  flowZoomPresets,
  parseZoomPresetValue,
  zoomPercentLabel,
} from '@flow/core'
import type { ViewportPaddingSchema } from '@flow/core'

import type { ViewportClient } from '../application.ts'
import type { FlowPanelPosition } from '../ui.ts'
import { mountCatalogPanel } from './catalog-panel.ts'

interface ZoomViewport {
  readonly zoom: number
}

export interface FoldkitZoomControlOptions {
  readonly position?: FlowPanelPosition
  readonly className?: string
  readonly ariaLabel?: string
  readonly fitViewPadding?: typeof ViewportPaddingSchema.Type
}

export interface FoldkitZoomSliderOptions extends FoldkitZoomControlOptions {
  readonly orientation?: 'horizontal' | 'vertical'
}

export interface FoldkitZoomControlMount {
  readonly element: HTMLDivElement
  /** Feed accepted or in-flight viewports from the Runtime. */
  readonly update: (viewport: ZoomViewport) => void
  readonly dispose: () => void
}

/** Read the Runtime's current zoom once; later zooms arrive through `update`. */
const syncZoom = async (
  viewport: ViewportClient,
  update: (viewport: ZoomViewport) => void
): Promise<void> => {
  update({ zoom: await viewport.getZoom() })
}

const button = (
  owner: Document,
  label: string,
  text: string,
  onClick: () => void
): HTMLButtonElement => {
  const element = owner.createElement('button')
  element.type = 'button'
  element.className = 'flow-foldkit-control-button'
  element.setAttribute('aria-label', label)
  element.textContent = text
  element.addEventListener('click', onClick)

  return element
}

/** React Flow UI Zoom Slider for one Foldkit canvas, fed by app viewport updates. */
export const mountFlowZoomSlider = (
  canvas: HTMLElement,
  viewport: ViewportClient,
  options: FoldkitZoomSliderOptions = {}
): FoldkitZoomControlMount => {
  const panel = mountCatalogPanel(canvas, {
    kind: 'zoom-slider',
    position: options.position ?? 'bottom-left',
    ariaLabel: options.ariaLabel ?? 'Zoom slider',
    className: options.className,
  })

  const owner = canvas.ownerDocument
  const limits = viewport.getViewportLimits()
  panel.content.dataset.orientation = options.orientation ?? 'horizontal'

  const zoomOut = button(owner, 'Zoom out', '−', () => {
    void viewport.zoomOut()
  })

  const range = owner.createElement('input')
  range.type = 'range'
  range.className = 'flow-foldkit-zoom-slider-range'
  range.min = String(limits.minZoom)
  range.max = String(limits.maxZoom)
  range.step = '0.01'
  range.setAttribute('aria-label', 'Zoom level')

  if (options.orientation === 'vertical') {
    range.setAttribute('aria-orientation', 'vertical')
  }

  range.addEventListener('input', () => {
    void viewport.zoomTo(clampZoom(range.valueAsNumber, limits))
  })

  const zoomIn = button(owner, 'Zoom in', '+', () => {
    void viewport.zoomIn()
  })

  const reset = button(owner, 'Reset zoom to 100%', '100%', () => {
    void viewport.zoomTo(clampZoom(1, limits))
  })

  reset.classList.add('flow-foldkit-zoom-slider-percent')

  const fit = button(owner, 'Fit view', 'Fit', () => {
    void viewport.fitView('all', options.fitViewPadding)
  })

  panel.content.append(zoomOut, range, zoomIn, reset, fit)

  const update = ({ zoom }: ZoomViewport): void => {
    panel.attach()
    range.value = String(zoom)
    range.setAttribute('aria-valuetext', zoomPercentLabel(zoom))
    reset.textContent = zoomPercentLabel(zoom)
    zoomOut.disabled = zoom <= limits.minZoom
    zoomIn.disabled = zoom >= limits.maxZoom
  }

  update({ zoom: 1 })
  void syncZoom(viewport, update)

  return { element: panel.element, update, dispose: panel.dispose }
}

/** React Flow UI Zoom Select for one Foldkit canvas: zoom presets plus fit view. */
export const mountFlowZoomSelect = (
  canvas: HTMLElement,
  viewport: ViewportClient,
  options: FoldkitZoomControlOptions = {}
): FoldkitZoomControlMount => {
  const panel = mountCatalogPanel(canvas, {
    kind: 'zoom-select',
    position: options.position ?? 'top-left',
    ariaLabel: options.ariaLabel ?? 'Zoom select',
    className: options.className,
  })

  const owner = canvas.ownerDocument
  const select = owner.createElement('select')
  select.className = 'flow-foldkit-zoom-select-input'
  select.setAttribute('aria-label', 'Zoom')

  const current = owner.createElement('option')
  current.value = 'current'
  current.hidden = true
  select.append(current)

  for (const preset of flowZoomPresets) {
    const option = owner.createElement('option')
    option.value = String(preset.value)
    option.textContent = preset.label
    select.append(option)
  }

  select.addEventListener('change', () => {
    const value = parseZoomPresetValue(select.value)

    if (value === 'fit') {
      void viewport.fitView('all', options.fitViewPadding)
    } else if (value !== undefined) {
      void viewport.zoomTo(clampZoom(value, viewport.getViewportLimits()))
    }

    select.value = 'current'
  })

  panel.content.append(select)

  const update = ({ zoom }: ZoomViewport): void => {
    panel.attach()
    current.textContent = zoomPercentLabel(zoom)
    select.value = 'current'
  }

  update({ zoom: 1 })
  void syncZoom(viewport, update)

  return { element: panel.element, update, dispose: panel.dispose }
}
