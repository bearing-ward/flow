export type FlowNodeStatus = 'waiting' | 'ready' | 'error'

export interface FlowStatusIndicatorOptions {
  readonly status: FlowNodeStatus
  readonly label?: string
  readonly className?: string
}

const statusLabels: Record<FlowNodeStatus, string> = {
  waiting: 'Waiting',
  ready: 'Ready',
  error: 'Error',
}

/** Create a native, screen-reader announced status indicator for node content. */
export const createFlowStatusIndicator = (
  owner: Document,
  options: FlowStatusIndicatorOptions
): HTMLSpanElement => {
  const indicator = owner.createElement('span')
  indicator.className = ['flow-status-indicator', options.className]
    .filter(Boolean)
    .join(' ')
  indicator.dataset.flowStatus = options.status
  indicator.setAttribute('role', 'status')
  indicator.setAttribute('aria-live', 'polite')
  indicator.setAttribute('aria-atomic', 'true')

  const marker = owner.createElement('span')
  marker.className = 'flow-status-indicator-marker'
  marker.setAttribute('aria-hidden', 'true')

  const text = owner.createElement('span')
  text.className = 'flow-status-indicator-text'
  text.textContent = options.label ?? statusLabels[options.status]

  indicator.append(marker, text)

  return indicator
}

export const updateFlowStatusIndicator = (
  indicator: HTMLSpanElement,
  status: FlowNodeStatus,
  label?: string
): void => {
  indicator.dataset.flowStatus = status
  const text = indicator.querySelector('.flow-status-indicator-text')

  if (text !== null) {
    text.textContent = label ?? statusLabels[status]
  }
}
