import { blocksLockedInteraction, flowLockEventTypes } from '@flow/core'
import type { FlowLockTarget } from '@flow/core'

const exemptSelector = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[data-flow-no-drag]',
  '[data-flow-nodrag]',
  '.nodrag',
  '.flow-foldkit-nodrag',
].join(', ')

const classify = (canvas: HTMLElement, target: EventTarget | null) => {
  if (!(target instanceof Element) || !canvas.contains(target)) {
    return 'other' satisfies FlowLockTarget
  }

  if (target.closest('[data-handle-id]') !== null) {
    return 'handle' satisfies FlowLockTarget
  }

  const exempt = target.closest(exemptSelector)

  if (exempt !== null && canvas.contains(exempt)) {
    return 'exempt' satisfies FlowLockTarget
  }

  if (target.closest('[data-node-id]') !== null) {
    return 'node' satisfies FlowLockTarget
  }

  if (target.closest('[data-edge-id]') !== null) {
    return 'edge' satisfies FlowLockTarget
  }

  return 'other' satisfies FlowLockTarget
}

export interface FlowInteractivityLock {
  readonly isInteractive: () => boolean
  readonly setInteractive: (interactive: boolean) => void
  readonly release: () => void
}

/**
 * Canvas-scoped stand-in for nodesDraggable, nodesConnectable and
 * elementsSelectable. While locked, a window capture listener stops element
 * gestures and activation keys before the canvas sees them.
 */
export const createFlowInteractivityLock = (
  canvas: () => HTMLElement
): FlowInteractivityLock => {
  let interactive = true
  let view: Window | null = null

  const onEvent = (event: Event): void => {
    const key = event instanceof KeyboardEvent ? event.key : undefined
    const type = flowLockEventTypes.find((name) => name === event.type)

    if (
      type === undefined ||
      !blocksLockedInteraction({
        type,
        key,
        target: classify(canvas(), event.target),
      })
    ) {
      return
    }

    event.stopImmediatePropagation()

    if (type === 'keydown') {
      event.preventDefault()
    }
  }

  const detach = (): void => {
    for (const type of flowLockEventTypes) {
      view?.removeEventListener(type, onEvent, true)
    }

    view = null
  }

  return {
    isInteractive: () => interactive,
    setInteractive: (next) => {
      interactive = next

      if (interactive) {
        detach()

        return
      }

      if (view === null) {
        view = canvas().ownerDocument.defaultView

        for (const type of flowLockEventTypes) {
          view?.addEventListener(type, onEvent, true)
        }
      }
    },
    release: () => {
      interactive = true
      detach()
    },
  }
}
