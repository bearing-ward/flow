import type { Html as FoldHtml } from 'foldkit'

export type FlowNodeStatus = 'waiting' | 'ready' | 'error'

const statusCopy: Record<FlowNodeStatus, string> = {
  waiting: 'Waiting',
  ready: 'Ready',
  error: 'Error',
}

/** Build an original, accessible node status view. The caller owns its status data. */
export const createFoldkitStatusIndicator = <Message>(
  status: FlowNodeStatus,
  h: FoldHtml.HtmlBuilder<Message>,
  detail?: string
): FoldHtml.Html =>
  h.div(
    [
      h.Class('flow-foldkit-status-indicator'),
      h.Role('status'),
      h.AriaLive('polite'),
      h.DataAttribute('flow-status', status),
    ],
    [
      h.span(
        [h.Class('flow-foldkit-status-indicator-mark'), h.AriaHidden(true)],
        ['●']
      ),
      h.span(
        [h.Class('flow-foldkit-status-indicator-label')],
        [statusCopy[status]]
      ),
      ...(detail === undefined
        ? []
        : [
            h.span([h.Class('flow-foldkit-status-indicator-detail')], [detail]),
          ]),
    ]
  )
