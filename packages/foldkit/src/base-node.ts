import type { Html as FoldHtml } from 'foldkit'

/** Build a caller-composed accessible shell inside a Foldkit node renderer. */
export const createFoldkitBaseNode = <Message>(
  title: string,
  h: FoldHtml.HtmlBuilder<Message>,
  content: FoldHtml.Html = null,
  ariaLabel = title
): FoldHtml.Html =>
  h.section(
    [
      h.Class('flow-foldkit-base-node'),
      h.Role('group'),
      h.AriaLabel(ariaLabel),
      h.DataAttribute('flow-base-node', ''),
    ],
    [
      h.h2([h.Class('flow-foldkit-base-node-title')], [title]),
      h.div([h.Class('flow-foldkit-base-node-content')], [content]),
    ]
  )
