import type { FlowHandle } from '@flow/core'
import type { Html as FoldHtml } from 'foldkit'

export interface FoldkitLabeledHandleOptions {
  readonly id: FlowHandle['id']
  readonly label: string
  readonly side: 'top' | 'right' | 'bottom' | 'left'
}

/** Label markup; Foldkit Runtime retains handle ownership. */
export const createFoldkitLabeledHandle = <Message>(
  options: FoldkitLabeledHandleOptions,
  h: FoldHtml.HtmlBuilder<Message>
): FoldHtml.Html =>
  h.span(
    [
      h.Class(`flow-labeled-handle flow-labeled-handle-${options.side}`),
      h.Id(`flow-handle-label-${options.id}`),
      h.DataAttribute('flow-labeled-handle', options.id),
    ],
    [options.label]
  )
