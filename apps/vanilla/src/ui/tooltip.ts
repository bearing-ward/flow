export interface FlowTooltipOptions {
  readonly trigger: HTMLElement
  readonly text: string
  readonly id?: string
  readonly className?: string
}

export interface FlowTooltip {
  readonly element: HTMLSpanElement
  readonly destroy: () => void
}

let nextTooltipId = 0

const createTooltipId = (owner: Document): string => {
  let candidate = ''

  do {
    nextTooltipId += 1
    candidate = `flow-tooltip-${nextTooltipId}`
  } while (owner.querySelector(`#${candidate}`) !== null)

  return candidate
}

/** Attach a noninteractive tooltip to a trigger without changing graph geometry. */
export const createFlowTooltip = (
  owner: Document,
  options: FlowTooltipOptions
): FlowTooltip => {
  const { trigger } = options
  const tooltip = owner.createElement('span')
  tooltip.className = ['flow-tooltip', options.className]
    .filter(Boolean)
    .join(' ')
  tooltip.dataset.flowNoDrag = ''
  tooltip.id = options.id ?? createTooltipId(owner)
  tooltip.setAttribute('role', 'tooltip')
  tooltip.hidden = true
  tooltip.textContent = options.text

  const previousDescribedBy = trigger.getAttribute('aria-describedby')

  const describedByIds =
    previousDescribedBy?.split(/\s+/u).filter(Boolean) ?? []

  if (!describedByIds.includes(tooltip.id)) {
    describedByIds.push(tooltip.id)
  }

  trigger.setAttribute('aria-describedby', describedByIds.join(' '))

  let hovered = false
  let focused = false
  let closeTimer: ReturnType<typeof setTimeout> | undefined

  const clearCloseTimer = (): void => {
    if (closeTimer !== undefined) {
      clearTimeout(closeTimer)
      closeTimer = undefined
    }
  }

  const render = (): void => {
    tooltip.hidden = !(hovered || focused)
  }

  const enter = (): void => {
    clearCloseTimer()
    hovered = true
    render()
  }

  const leave = (): void => {
    hovered = false
    clearCloseTimer()
    closeTimer = setTimeout(() => {
      closeTimer = undefined
      render()
    }, 100)
  }

  const focus = (): void => {
    focused = true
    render()
  }

  const blur = (): void => {
    focused = false
    render()
  }

  trigger.addEventListener('pointerenter', enter)
  trigger.addEventListener('pointerleave', leave)
  trigger.addEventListener('focus', focus)
  trigger.addEventListener('blur', blur)
  tooltip.addEventListener('pointerenter', enter)
  tooltip.addEventListener('pointerleave', leave)
  trigger.after(tooltip)

  return {
    element: tooltip,
    destroy: () => {
      clearCloseTimer()
      trigger.removeEventListener('pointerenter', enter)
      trigger.removeEventListener('pointerleave', leave)
      trigger.removeEventListener('focus', focus)
      trigger.removeEventListener('blur', blur)
      tooltip.removeEventListener('pointerenter', enter)
      tooltip.removeEventListener('pointerleave', leave)

      if (previousDescribedBy === null) {
        trigger.removeAttribute('aria-describedby')
      } else {
        trigger.setAttribute('aria-describedby', previousDescribedBy)
      }

      tooltip.remove()
    },
  }
}
