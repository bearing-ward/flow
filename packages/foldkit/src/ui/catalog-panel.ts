import { mountFlowPanel } from '../ui.ts'
import type { FlowPanelPosition } from '../ui.ts'

const stopPropagation = (event: Event): void => event.stopPropagation()

const contained = ['click', 'dblclick', 'keydown'] as const

export interface FoldkitCatalogPanel {
  readonly element: HTMLDivElement
  readonly content: HTMLDivElement
  /** Re-attach the panel if a canvas re-render removed it. */
  readonly attach: () => void
  readonly dispose: () => void
}

/**
 * Mount a UI catalog control in a canvas-scoped Foldkit panel. The panel
 * carries the no-pan, no-drag and no-wheel markers; clicks and keys stay out
 * of canvas shortcuts.
 */
export const mountCatalogPanel = (
  canvas: HTMLElement,
  options: {
    readonly kind: string
    readonly position: FlowPanelPosition
    readonly ariaLabel: string
    readonly className?: string | undefined
    readonly role?: string
  }
): FoldkitCatalogPanel => {
  const content = canvas.ownerDocument.createElement('div')
  content.className = `flow-foldkit-${options.kind}`

  const panel = mountFlowPanel(canvas, content, {
    position: options.position,
    ariaLabel: options.ariaLabel,
    role: options.role ?? 'group',
    className: ['flow-foldkit-catalog', options.className]
      .filter(Boolean)
      .join(' '),
  })

  panel.element.dataset.flowUi = options.kind

  for (const type of contained) {
    panel.element.addEventListener(type, stopPropagation)
  }

  return {
    element: panel.element,
    content,
    attach: () => {
      if (panel.element.parentElement !== canvas) {
        canvas.append(panel.element)
      }
    },
    dispose: () => {
      for (const type of contained) {
        panel.element.removeEventListener(type, stopPropagation)
      }

      panel.dispose()
    },
  }
}
