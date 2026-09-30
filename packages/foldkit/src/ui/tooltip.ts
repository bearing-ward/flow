export type FoldkitTooltipOptions = Readonly<{
  /** Optional class added to the tooltip wrapper. */
  className?: string
}>

export type FoldkitTooltipMount = Readonly<{
  element: HTMLSpanElement
  tooltip: HTMLSpanElement
  destroy: () => void
}>

const stopCanvasEvent = (event: Event): void => event.stopPropagation()

/** Mount app-owned, noninteractive tooltip text beside a graph trigger. */
export const createFoldkitTooltip = (
  trigger: HTMLElement,
  text: string,
  options: FoldkitTooltipOptions = {}
): FoldkitTooltipMount => {
  const owner = trigger.ownerDocument
  const wrapper = owner.createElement('span')
  const tooltip = owner.createElement('span')
  const placeholder = owner.createComment('flow tooltip trigger')
  const previousDescription = trigger.getAttribute('aria-describedby')
  const previousTabIndex = trigger.getAttribute('tabindex')

  const previousInputOwnership = new Map(
    ['data-flow-no-drag', 'data-flow-no-pan', 'data-flow-no-wheel'].map(
      (attribute) => [attribute, trigger.getAttribute(attribute)] as const
    )
  )

  let tooltipId = `flow-foldkit-tooltip-${crypto.randomUUID()}`

  while (owner.querySelector(`#${tooltipId}`) !== null) {
    tooltipId = `flow-foldkit-tooltip-${crypto.randomUUID()}`
  }

  const describedBy = new Set([
    ...(previousDescription ?? '').split(/\s+/u).filter(Boolean),
    tooltipId,
  ])

  wrapper.className = ['flow-foldkit-tooltip-anchor', options.className]
    .filter(Boolean)
    .join(' ')
  wrapper.dataset.flowNoDrag = ''
  wrapper.dataset.flowNoPan = ''
  wrapper.dataset.flowNoWheel = ''
  tooltip.className = 'flow-foldkit-tooltip'
  tooltip.id = tooltipId
  tooltip.setAttribute('role', 'tooltip')
  tooltip.textContent = text
  tooltip.hidden = true
  trigger.setAttribute('aria-describedby', [...describedBy].join(' '))
  trigger.tabIndex = trigger.tabIndex < 0 ? 0 : trigger.tabIndex
  trigger.dataset.flowNoDrag = ''
  trigger.dataset.flowNoPan = ''
  trigger.dataset.flowNoWheel = ''

  trigger.before(placeholder)
  wrapper.append(trigger, tooltip)
  placeholder.replaceWith(wrapper)

  let pointerInside = false
  let focusInside = false
  let destroyed = false

  const refresh = (): void => {
    tooltip.hidden = !pointerInside && !focusInside
  }

  const onPointerEnter = (): void => {
    pointerInside = true
    refresh()
  }

  const onPointerLeave = (): void => {
    pointerInside = false
    refresh()
  }

  const onFocusIn = (): void => {
    focusInside = true
    refresh()
  }

  const onFocusOut = (event: FocusEvent): void => {
    if (
      event.relatedTarget instanceof Node &&
      wrapper.contains(event.relatedTarget)
    ) {
      return
    }

    focusInside = false
    refresh()
  }

  wrapper.addEventListener('pointerenter', onPointerEnter)
  wrapper.addEventListener('pointerleave', onPointerLeave)
  wrapper.addEventListener('focusin', onFocusIn)
  wrapper.addEventListener('focusout', onFocusOut)

  for (const eventName of ['pointerdown', 'mousedown', 'wheel', 'keydown']) {
    wrapper.addEventListener(eventName, stopCanvasEvent)
  }

  return {
    element: wrapper,
    tooltip,
    destroy: () => {
      if (destroyed) {
        return
      }

      destroyed = true
      wrapper.removeEventListener('pointerenter', onPointerEnter)
      wrapper.removeEventListener('pointerleave', onPointerLeave)
      wrapper.removeEventListener('focusin', onFocusIn)
      wrapper.removeEventListener('focusout', onFocusOut)

      for (const eventName of [
        'pointerdown',
        'mousedown',
        'wheel',
        'keydown',
      ]) {
        wrapper.removeEventListener(eventName, stopCanvasEvent)
      }

      if (previousDescription === null) {
        trigger.removeAttribute('aria-describedby')
      } else {
        trigger.setAttribute('aria-describedby', previousDescription)
      }

      if (previousTabIndex === null) {
        trigger.removeAttribute('tabindex')
      } else {
        trigger.setAttribute('tabindex', previousTabIndex)
      }

      for (const [attribute, value] of previousInputOwnership) {
        if (value === null) {
          trigger.removeAttribute(attribute)
        } else {
          trigger.setAttribute(attribute, value)
        }
      }

      if (placeholder.parentNode === null) {
        wrapper.replaceWith(trigger)
      } else {
        placeholder.replaceWith(trigger)
      }
    },
  }
}
