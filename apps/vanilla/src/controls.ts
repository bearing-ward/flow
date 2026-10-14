import {
  FlowPanelPositionSchema,
  flowInteractivityFor,
  isFlowInteractive,
  resolveFlowAriaLabelConfig,
} from '@flow/core'
import type { FlowAriaLabelConfig } from '@flow/core'
import * as S from 'effect/Schema'

import type { FitViewOptions, FlowController } from './mount-flow.ts'

const ControlsOptionsSchema = S.Struct({
  showZoom: S.optional(S.Boolean),
  showFitView: S.optional(S.Boolean),
  showInteractive: S.optional(S.Boolean),
  position: S.optional(FlowPanelPositionSchema),
  orientation: S.optional(S.Literals(['vertical', 'horizontal'])),
  className: S.optional(S.String),
  ariaLabel: S.optional(S.NonEmptyString),
})

export type FlowControlsOptions = typeof ControlsOptionsSchema.Encoded & {
  readonly fitViewOptions?: FitViewOptions | undefined
  readonly children?: readonly HTMLButtonElement[] | undefined
  readonly onZoomIn?: (() => void) | undefined
  readonly onZoomOut?: (() => void) | undefined
  readonly onFitView?: (() => void) | undefined
  /** Called with the next interactive state after the lock button toggles. */
  readonly onInteractiveChange?: ((interactive: boolean) => void) | undefined
  readonly style?: Readonly<Record<string, string>> | undefined
}

export interface FlowControlsMount {
  readonly element: HTMLDivElement
  /** Whether nodes and edges currently accept drag, connect and select gestures. */
  readonly isInteractive: () => boolean
  readonly setInteractive: (interactive: boolean) => void
  readonly destroy: () => void
}

type ControlAction = 'zoom-in' | 'zoom-out' | 'fit' | 'interactive'

const actionLabels: Record<
  ControlAction,
  {
    label: Exclude<
      keyof FlowAriaLabelConfig,
      'node.a11yDescription.ariaLiveMessage'
    >
    text: string
  }
> = {
  'zoom-in': { label: 'controls.zoomIn.ariaLabel', text: '+' },
  'zoom-out': { label: 'controls.zoomOut.ariaLabel', text: '−' },
  fit: { label: 'controls.fitView.ariaLabel', text: 'Fit' },
  interactive: { label: 'controls.interactive.ariaLabel', text: 'Lock' },
}

interface RestoredButton {
  readonly element: HTMLButtonElement
  readonly parent: Node | null
  readonly nextSibling: Node | null
  readonly classAttribute: string | null
}

/** Mount accessible controls that operate only through the public controller. */
export const createFlowControls = (
  controller: Pick<
    FlowController,
    | 'overlayPortal'
    | 'getViewport'
    | 'getViewportLimits'
    | 'subscribeViewport'
    | 'zoomIn'
    | 'zoomOut'
    | 'fitView'
    | 'getInteractivity'
    | 'setInteractivity'
    | 'subscribeInteractivity'
  > &
    Partial<Pick<FlowController, 'getAriaLabelConfig'>>,
  input: FlowControlsOptions = {}
): FlowControlsMount => {
  const options = {
    ...S.decodeUnknownSync(ControlsOptionsSchema)(input),
    fitViewOptions: input.fitViewOptions,
    children: input.children,
    onZoomIn: input.onZoomIn,
    onZoomOut: input.onZoomOut,
    onFitView: input.onFitView,
    onInteractiveChange: input.onInteractiveChange,
    style: input.style,
  }

  const group = document.createElement('div')
  group.className = 'flow-controls flow-controls-public'
  group.dataset.position = options.position ?? 'bottom-left'
  group.dataset.orientation = options.orientation ?? 'vertical'
  group.setAttribute('role', 'group')

  // The canvas `ariaLabelConfig`; an explicit `ariaLabel` still wins.
  const labels =
    controller.getAriaLabelConfig?.() ?? resolveFlowAriaLabelConfig()

  group.setAttribute(
    'aria-label',
    options.ariaLabel ?? labels['controls.ariaLabel']
  )

  if (options.className) {
    group.classList.add(...options.className.split(/\s+/u).filter(Boolean))
  }

  for (const [name, value] of Object.entries(options.style ?? {})) {
    const property = name.startsWith('--')
      ? name
      : name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)

    group.style.setProperty(property, value)
  }

  const buttons = new Map<string, HTMLButtonElement>()

  const addAction = (action: ControlAction): void => {
    const { label, text } = actionLabels[action]
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'flow-control-button'
    button.dataset.action = action
    button.setAttribute('aria-label', labels[label])
    button.textContent = text
    buttons.set(action, button)
    group.append(button)
  }

  if (options.showZoom !== false) {
    addAction('zoom-in')
    addAction('zoom-out')
  }

  if (options.showFitView !== false) {
    addAction('fit')
  }

  if (options.showInteractive !== false) {
    addAction('interactive')
  }

  // React Flow Controls: interactive while any switch is on; the lock sets all three.
  const isInteractive = (): boolean =>
    isFlowInteractive(controller.getInteractivity())

  const renderInteractive = (): void => {
    const interactive = isInteractive()
    group.dataset.interactive = String(interactive)

    const button = buttons.get('interactive')

    if (button) {
      button.setAttribute('aria-pressed', String(!interactive))
      button.textContent = interactive ? 'Lock' : 'Unlock'
    }
  }

  const setInteractive = (interactive: boolean): void => {
    controller.setInteractivity(flowInteractivityFor(interactive))
    renderInteractive()
  }

  renderInteractive()
  const stopInteractivity = controller.subscribeInteractivity(renderInteractive)

  const restored: RestoredButton[] = (options.children ?? []).map(
    (element) => ({
      element,
      parent: element.parentNode,
      nextSibling: element.nextSibling,
      classAttribute: element.getAttribute('class'),
    })
  )

  for (const { element } of restored) {
    element.classList.add('flow-control-button')
    group.append(element)
  }

  controller.overlayPortal.append(group)

  const updateDisabled = (): void => {
    const { zoom } = controller.getViewport()
    const { minZoom, maxZoom } = controller.getViewportLimits()
    const zoomIn = buttons.get('zoom-in')
    const zoomOut = buttons.get('zoom-out')

    if (zoomIn) {
      zoomIn.disabled = zoom >= maxZoom
    }

    if (zoomOut) {
      zoomOut.disabled = zoom <= minZoom
    }
  }

  updateDisabled()
  const unsubscribe = controller.subscribeViewport(updateDisabled)

  const onClick = (event: MouseEvent): void => {
    const { target } = event

    if (!(target instanceof Element)) {
      return
    }

    const button = target.closest<HTMLButtonElement>('button[data-action]')

    if (!button || !group.contains(button) || button.disabled) {
      return
    }

    switch (button.dataset.action) {
      case 'zoom-in': {
        void controller.zoomIn()
        options.onZoomIn?.()
        break
      }

      case 'zoom-out': {
        void controller.zoomOut()
        options.onZoomOut?.()
        break
      }

      case 'fit': {
        void controller.fitView(options.fitViewOptions)
        options.onFitView?.()
        break
      }

      case 'interactive': {
        const next = !isInteractive()
        setInteractive(next)
        options.onInteractiveChange?.(next)
        break
      }

      default: {
        break
      }
    }

    event.stopPropagation()
  }

  group.addEventListener('click', onClick)

  let destroyed = false

  return {
    element: group,
    isInteractive,
    setInteractive,
    destroy: () => {
      if (destroyed) {
        return
      }

      destroyed = true
      stopInteractivity()
      unsubscribe()
      group.removeEventListener('click', onClick)
      group.remove()

      for (const {
        element,
        parent,
        nextSibling,
        classAttribute,
      } of restored.toReversed()) {
        if (classAttribute === null) {
          element.removeAttribute('class')
        } else {
          element.setAttribute('class', classAttribute)
        }

        if (parent && nextSibling?.parentNode === parent) {
          // eslint-disable-next-line unicorn/prefer-modern-dom-apis -- siblings and parents are Node so restoration also supports document fragments.
          parent.insertBefore(element, nextSibling)
        } else {
          // eslint-disable-next-line unicorn/prefer-dom-node-append -- the saved parent is Node to support document fragments.
          parent?.appendChild(element)
        }
      }
    },
  }
}
