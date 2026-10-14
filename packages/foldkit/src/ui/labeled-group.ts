import type { FlowNode } from '@flow/core'
import type { Html as FoldHtml } from 'foldkit'

/** Where the group title sits, like the React Flow UI `GroupNode` panel. */
export type FoldkitLabeledGroupPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface FoldkitLabeledGroupOptions {
  /** Title corner or edge; defaults to `top-left`. */
  readonly position?: FoldkitLabeledGroupPosition
  /** The title; defaults to the node's label. An empty title renders none. */
  readonly label?: (node: FlowNode) => string
}

const labelPlacement: Record<
  FoldkitLabeledGroupPosition,
  Readonly<Record<string, string>>
> = {
  'top-left': { top: '0', left: '0' },
  'top-center': { top: '0', left: '50%', transform: 'translateX(-50%)' },
  'top-right': { top: '0', right: '0' },
  'bottom-left': { bottom: '0', left: '0' },
  'bottom-center': { bottom: '0', left: '50%', transform: 'translateX(-50%)' },
  'bottom-right': { bottom: '0', right: '0' },
}

/**
 * A node renderer for React Flow UI's Labeled Group Node: a frame that
 * fills the group node's box with its title in a corner. Register it under
 * a node type such as `group`; children are ordinary nodes with
 * `parentId` set to the group, and usually `extent: 'parent'` so dragging
 * keeps them inside.
 */
export const createFoldkitLabeledGroupNode =
  (options: FoldkitLabeledGroupOptions = {}) =>
  <Message>(
    node: FlowNode,
    h: FoldHtml.HtmlBuilder<Message>
  ): FoldHtml.Html => {
    const position = options.position ?? 'top-left'
    const label = options.label?.(node) ?? node.label

    return h.div(
      [
        h.Class('flow-foldkit-labeled-group'),
        h.Role('group'),
        h.AriaLabel(label === '' ? node.id : label),
        h.DataAttribute('flow-labeled-group', node.id),
        h.Style({
          position: 'absolute',
          inset: '0',
          'box-sizing': 'border-box',
        }),
      ],
      label === ''
        ? []
        : [
            h.div(
              [
                h.Class(
                  `flow-foldkit-labeled-group-label flow-foldkit-labeled-group-label-${position}`
                ),
                h.DataAttribute('flow-labeled-group-label', position),
                h.Style({ position: 'absolute', ...labelPlacement[position] }),
              ],
              [label]
            ),
          ]
    )
  }
