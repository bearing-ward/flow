import { Schema as S } from 'effect'

/** Payload of React's `node.a11yDescription.ariaLiveMessage`. */
export interface FlowAriaLiveMessageInput {
  readonly direction: string
  readonly x: number
  readonly y: number
}

/**
 * React Flow `AriaLabelConfig` (`system/src/constants.ts`). Keys are React's
 * so translations carry over. The live message is a function; every other
 * entry is text.
 */
export interface FlowAriaLabelConfig {
  readonly 'node.a11yDescription.default': string
  readonly 'node.a11yDescription.keyboardDisabled': string
  readonly 'node.a11yDescription.ariaLiveMessage': (
    input: FlowAriaLiveMessageInput
  ) => string
  readonly 'edge.a11yDescription.default': string
  readonly 'controls.ariaLabel': string
  readonly 'controls.zoomIn.ariaLabel': string
  readonly 'controls.zoomOut.ariaLabel': string
  readonly 'controls.fitView.ariaLabel': string
  readonly 'controls.interactive.ariaLabel': string
  readonly 'minimap.ariaLabel': string
  readonly 'handle.ariaLabel': string
}

/** React's English defaults, verbatim. */
export const defaultFlowAriaLabelConfig: FlowAriaLabelConfig = {
  'node.a11yDescription.default':
    'Press enter or space to select a node. Press delete to remove it and escape to cancel.',
  'node.a11yDescription.keyboardDisabled':
    'Press enter or space to select a node. You can then use the arrow keys to move the node around. Press delete to remove it and escape to cancel.',
  'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }) =>
    `Moved selected node ${direction}. New position, x: ${x}, y: ${y}`,
  'edge.a11yDescription.default':
    'Press enter or space to select an edge. You can then press delete to remove it or escape to cancel.',
  'controls.ariaLabel': 'Control Panel',
  'controls.zoomIn.ariaLabel': 'Zoom In',
  'controls.zoomOut.ariaLabel': 'Zoom Out',
  'controls.fitView.ariaLabel': 'Fit View',
  'controls.interactive.ariaLabel': 'Toggle Interactivity',
  'minimap.ariaLabel': 'Mini Map',
  'handle.ariaLabel': 'Handle',
}

/** Schema for the serializable text entries of a partial override. */
export const FlowAriaLabelTextConfigSchema = S.Struct({
  'node.a11yDescription.default': S.optional(S.String),
  'node.a11yDescription.keyboardDisabled': S.optional(S.String),
  'edge.a11yDescription.default': S.optional(S.String),
  'controls.ariaLabel': S.optional(S.String),
  'controls.zoomIn.ariaLabel': S.optional(S.String),
  'controls.zoomOut.ariaLabel': S.optional(S.String),
  'controls.fitView.ariaLabel': S.optional(S.String),
  'controls.interactive.ariaLabel': S.optional(S.String),
  'minimap.ariaLabel': S.optional(S.String),
  'handle.ariaLabel': S.optional(S.String),
})

export type FlowAriaLabelTextConfig = typeof FlowAriaLabelTextConfigSchema.Type

/** Partial host option, as React's `ariaLabelConfig` prop. */
export type FlowAriaLabelConfigInput = Partial<FlowAriaLabelConfig>

/** Merge a partial override over the defaults, as React's store does. */
export const resolveFlowAriaLabelConfig = (
  input?: FlowAriaLabelConfigInput
): FlowAriaLabelConfig => ({ ...defaultFlowAriaLabelConfig, ...input })
