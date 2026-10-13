import {
  clampZoom,
  flowZoomPresets,
  parseZoomPresetValue,
  zoomPercentLabel,
} from '@flow/core'

import type { CanvasPanelPlacement, FitViewOptions } from '../mount-flow.ts'
import { createFlowOverlay } from './overlay.ts'
import type { FlowUIController } from './overlay.ts'

export interface FlowZoomSliderOptions {
  readonly position?: CanvasPanelPlacement
  readonly orientation?: 'horizontal' | 'vertical'
  readonly className?: string
  readonly ariaLabel?: string
  readonly fitViewOptions?: FitViewOptions
}

export interface FlowZoomControlMount {
  readonly element: HTMLDivElement
  readonly destroy: () => void
}

const button = (
  owner: Document,
  label: string,
  text: string,
  onClick: () => void
): HTMLButtonElement => {
  const element = owner.createElement('button')
  element.type = 'button'
  element.className = 'flow-control-button'
  element.setAttribute('aria-label', label)
  element.textContent = text
  element.addEventListener('click', onClick)

  return element
}

/** React Flow UI Zoom Slider: zoom buttons around a range bound to the viewport zoom. */
export const createFlowZoomSlider = (
  controller: FlowUIController,
  options: FlowZoomSliderOptions = {}
): FlowZoomControlMount => {
  const overlay = createFlowOverlay(controller, {
    kind: 'zoom-slider',
    position: options.position ?? 'bottom-left',
    className: options.className,
    ariaLabel: options.ariaLabel ?? 'Zoom slider',
  })

  const owner = overlay.element.ownerDocument
  const limits = controller.getViewportLimits()
  overlay.element.dataset.orientation = options.orientation ?? 'horizontal'

  const zoomOut = button(owner, 'Zoom out', '−', () => {
    void controller.zoomOut()
  })

  const range = owner.createElement('input')
  range.type = 'range'
  range.className = 'flow-zoom-slider-range'
  range.min = String(limits.minZoom)
  range.max = String(limits.maxZoom)
  range.step = '0.01'
  range.setAttribute('aria-label', 'Zoom level')

  if (options.orientation === 'vertical') {
    range.setAttribute('aria-orientation', 'vertical')
  }

  range.addEventListener('input', () => {
    void controller.zoomTo(clampZoom(range.valueAsNumber, limits))
  })

  const zoomIn = button(owner, 'Zoom in', '+', () => {
    void controller.zoomIn()
  })

  const reset = button(owner, 'Reset zoom to 100%', '100%', () => {
    void controller.zoomTo(clampZoom(1, limits))
  })

  reset.classList.add('flow-zoom-slider-percent')

  const fit = button(owner, 'Fit view', 'Fit', () => {
    void controller.fitView(options.fitViewOptions)
  })

  overlay.element.append(zoomOut, range, zoomIn, reset, fit)

  const sync = (): void => {
    const { zoom } = controller.getViewport()
    range.value = String(zoom)
    range.setAttribute('aria-valuetext', zoomPercentLabel(zoom))
    reset.textContent = zoomPercentLabel(zoom)
    zoomOut.disabled = zoom <= limits.minZoom
    zoomIn.disabled = zoom >= limits.maxZoom
  }

  sync()
  const unsubscribe = controller.subscribeViewport(sync)

  return {
    element: overlay.element,
    destroy: () => {
      unsubscribe()
      overlay.destroy()
    },
  }
}

export interface FlowZoomSelectOptions {
  readonly position?: CanvasPanelPlacement
  readonly className?: string
  readonly ariaLabel?: string
  readonly fitViewOptions?: FitViewOptions
}

/** React Flow UI Zoom Select: a native select of zoom presets plus fit view. */
export const createFlowZoomSelect = (
  controller: FlowUIController,
  options: FlowZoomSelectOptions = {}
): FlowZoomControlMount => {
  const overlay = createFlowOverlay(controller, {
    kind: 'zoom-select',
    position: options.position ?? 'top-left',
    className: options.className,
    ariaLabel: options.ariaLabel ?? 'Zoom select',
  })

  const owner = overlay.element.ownerDocument
  const select = owner.createElement('select')
  select.className = 'flow-zoom-select-input'
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

  const sync = (): void => {
    current.textContent = zoomPercentLabel(controller.getViewport().zoom)
    select.value = 'current'
  }

  select.addEventListener('change', () => {
    const value = parseZoomPresetValue(select.value)

    if (value === 'fit') {
      void controller.fitView(options.fitViewOptions)
    } else if (value !== undefined) {
      void controller.zoomTo(clampZoom(value, controller.getViewportLimits()))
    }

    sync()
  })

  overlay.element.append(select)

  sync()
  const unsubscribe = controller.subscribeViewport(sync)

  return {
    element: overlay.element,
    destroy: () => {
      unsubscribe()
      overlay.destroy()
    },
  }
}
