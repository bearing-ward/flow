import type { FlowHandleSchema } from '@flow/core'
import type { Html as FoldHtml } from 'foldkit'

export interface FoldkitBaseHandleOptions {
  readonly handle: typeof FlowHandleSchema.Type
  readonly label: string
}

/** Build an original, descriptive view for a graph handle inside a node renderer.
 * The Runtime continues to own the actual focusable connection control.
 */
export const createFoldkitBaseHandle = <Message>(
  options: FoldkitBaseHandleOptions,
  h: FoldHtml.HtmlBuilder<Message>
): FoldHtml.Html =>
  h.span(
    [
      h.Class('flow-foldkit-base-handle'),
      h.DataAttribute('flow-base-handle', options.handle.id),
      h.DataAttribute('handle-kind', options.handle.kind),
      h.DataAttribute('handle-side', options.handle.side),
      h.AriaHidden(true),
    ],
    [
      h.span([h.Class('flow-foldkit-base-handle-label')], [options.label]),
      h.span(
        [h.Class('flow-foldkit-base-handle-direction')],
        [options.handle.kind === 'source' ? 'Output' : 'Input']
      ),
    ]
  )
