import type {
  CanvasPanelPlacement,
  JavaScriptFlowController,
} from '../mount-flow.ts'

/** Controller members the UI catalog uses; both public controller shapes provide them. */
export type FlowUIController = Pick<
  JavaScriptFlowController,
  | 'overlayPortal'
  | 'applyEdit'
  | 'fitView'
  | 'getEdge'
  | 'getInternalNode'
  | 'getNode'
  | 'getNodes'
  | 'getSnapshot'
  | 'getViewport'
  | 'getViewportLimits'
  | 'setCenter'
  | 'setViewport'
  | 'subscribe'
  | 'subscribeState'
  | 'subscribeViewport'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomTo'
>

const stopPropagation = (event: Event): void => event.stopPropagation()

export interface FlowOverlayOptions {
  readonly position?: CanvasPanelPlacement | undefined
  readonly className?: string | undefined
  readonly ariaLabel: string
  readonly kind: string
}

export interface FlowOverlay {
  readonly element: HTMLDivElement
  readonly destroy: () => void
}

/**
 * Create a positioned screen-space overlay inside the controller's portal. It
 * carries no-pan, no-drag and no-wheel markers, and keeps its clicks and keys
 * from reaching canvas shortcuts.
 */
export const createFlowOverlay = (
  controller: FlowUIController,
  options: FlowOverlayOptions
): FlowOverlay => {
  const owner = controller.overlayPortal.ownerDocument
  const element = owner.createElement('div')

  element.className = [
    'flow-ui-overlay',
    `flow-${options.kind}`,
    'nopan',
    'nodrag',
    'nowheel',
    options.className,
  ]
    .filter(Boolean)
    .join(' ')
  element.dataset.flowUi = options.kind
  element.dataset.position = options.position ?? 'top-left'
  element.dataset.flowNoPan = ''
  element.dataset.flowNoDrag = ''
  element.dataset.flowNoWheel = ''
  element.setAttribute('role', 'group')
  element.setAttribute('aria-label', options.ariaLabel)

  for (const type of ['click', 'dblclick', 'keydown'] as const) {
    element.addEventListener(type, stopPropagation)
  }

  controller.overlayPortal.append(element)

  return {
    element,
    destroy: () => {
      for (const type of ['click', 'dblclick', 'keydown'] as const) {
        element.removeEventListener(type, stopPropagation)
      }

      element.remove()
    },
  }
}

/** The canvas element that owns this controller's overlay portal. */
export const controllerCanvas = (
  controller: Pick<FlowUIController, 'overlayPortal'>
): HTMLElement =>
  controller.overlayPortal.closest<HTMLElement>('.flow-canvas') ??
  controller.overlayPortal
