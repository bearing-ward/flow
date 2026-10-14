import type {
  FlowNodeResizeConstraints,
  FlowResizeControlDirection,
  FlowResizeControlPosition,
  FlowResizeControlVariant,
  FlowResizeParams,
  FlowResizeParamsWithDirection,
  FlowStyle,
} from '@flow/core'

import { applyFlowClassName, applyFlowStyle } from './presentation.ts'

/** One React `NodeResizeControl`: where it sits and how it looks. */
export interface FlowResizeControlSpec {
  readonly position: FlowResizeControlPosition
  readonly variant: FlowResizeControlVariant
  readonly className?: string | undefined
  readonly style?: FlowStyle | undefined
  readonly color?: string | undefined
  /** Custom control content, as React `NodeResizeControl` children. */
  readonly content?: HTMLElement | undefined
}

/** The pointer event and React `ResizeParams` a resize callback receives. */
export type FlowResizeCallback<Params> = (
  event: PointerEvent,
  params: Params
) => void

/**
 * One `createFlowNodeResizer` or `createFlowNodeResizeControl` mount: its
 * controls, constraints and callbacks. The host renders the controls in
 * the node and drives their gestures with the core resizer session.
 */
export interface FlowNodeResizerRegistration {
  readonly controls: readonly FlowResizeControlSpec[]
  readonly isVisible: boolean
  readonly autoScale: boolean
  readonly constraints: FlowNodeResizeConstraints
  readonly resizeDirection?: FlowResizeControlDirection | undefined
  readonly shouldResize?:
    | ((event: PointerEvent, params: FlowResizeParamsWithDirection) => boolean)
    | undefined
  readonly onResizeStart?: FlowResizeCallback<FlowResizeParams> | undefined
  readonly onResize?:
    | FlowResizeCallback<FlowResizeParamsWithDirection>
    | undefined
  readonly onResizeEnd?: FlowResizeCallback<FlowResizeParams> | undefined
}

/** A registration handle returned by the host. */
export interface FlowNodeResizerHandle {
  readonly update: (registration: FlowNodeResizerRegistration) => void
  readonly remove: () => void
}

const controlKey = (registrationId: number, index: number): string =>
  `${registrationId}:${index}`

/**
 * Render the registered controls of one node into its element, reusing
 * existing control elements by registration and index. Returns whether any
 * registration exists, so the caller can drop the built-in controls.
 */
export const renderRegisteredResizeControls = (
  element: HTMLElement,
  nodeLabel: string,
  registrations: ReadonlyMap<number, FlowNodeResizerRegistration> | undefined
): boolean => {
  const existing = new Map(
    [
      ...element.querySelectorAll<HTMLElement>(':scope > .flow-resize-control'),
    ].map((control) => [control.dataset.controlKey ?? '', control])
  )

  const kept = new Set<string>()

  for (const [registrationId, registration] of registrations ?? []) {
    if (!registration.isVisible) {
      continue
    }

    for (const [index, spec] of registration.controls.entries()) {
      const key = controlKey(registrationId, index)

      const control =
        existing.get(key) ?? element.ownerDocument.createElement('div')

      kept.add(key)
      control.className = 'flow-resize-control nodrag'
      control.classList.add(spec.variant, ...spec.position.split('-'))
      control.classList.toggle(
        'auto-scale',
        registration.autoScale && spec.variant === 'handle'
      )
      applyFlowClassName(control, spec.className)
      control.dataset.controlKey = key
      control.dataset.resizerId = String(registrationId)
      control.dataset.controlIndex = String(index)
      control.dataset.direction = spec.position
      control.dataset.variant = spec.variant
      control.dataset.testid = 'flow-node-resize-control'
      control.setAttribute(
        'aria-label',
        `Resize ${nodeLabel} from ${spec.position.replaceAll('-', ' ')}`
      )
      applyFlowStyle(
        control,
        spec.color === undefined
          ? spec.style
          : {
              ...spec.style,
              [spec.variant === 'handle' ? 'backgroundColor' : 'borderColor']:
                spec.color,
            }
      )

      if (
        spec.content !== undefined &&
        spec.content.parentElement !== control
      ) {
        control.replaceChildren(spec.content)
      }

      if (!control.isConnected || control.parentElement !== element) {
        element.append(control)
      }
    }
  }

  for (const [key, control] of existing) {
    if (!kept.has(key)) {
      control.remove()
    }
  }

  return registrations !== undefined && registrations.size > 0
}
