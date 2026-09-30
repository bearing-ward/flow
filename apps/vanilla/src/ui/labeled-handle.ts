import type { FlowHandle } from '@flow/core'

export interface FlowLabeledHandleOptions {
  readonly handle: Pick<FlowHandle, 'id' | 'kind' | 'side'>
  readonly label: string
}

/** Create label markup for a handle; the canvas retains its connection button. */
export const createFlowLabeledHandleLabel = (
  options: FlowLabeledHandleOptions,
  ownerDocument: Document = globalThis.document
): HTMLSpanElement => {
  const label = ownerDocument.createElement('span')
  label.className = `flow-labeled-handle flow-labeled-handle-${options.handle.side}`
  label.id = `flow-handle-label-${options.handle.id}`
  label.dataset.flowLabeledHandle = options.handle.id
  label.textContent = options.label

  return label
}
