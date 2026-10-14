import { resolveFlowAriaLabelConfig } from '@flow/core'
import type { FlowAriaLabelConfig, FlowAriaLabelConfigInput } from '@flow/core'

/** The resolved labels plus whether the caller set a handle label. */
export interface FlowResolvedAriaLabels {
  readonly config: FlowAriaLabelConfig
  /** React labels every handle with `handle.ariaLabel`; Vanilla names each by kind and id until it is set. */
  readonly handleLabelConfigured: boolean
}

export const resolveVanillaAriaLabels = (
  input: FlowAriaLabelConfigInput | undefined
): FlowResolvedAriaLabels => ({
  config: resolveFlowAriaLabelConfig(input),
  handleLabelConfigured: input?.['handle.ariaLabel'] !== undefined,
})

let nextDescriptionScope = 0

const visuallyHidden = (element: HTMLElement): void => {
  element.style.position = 'absolute'
  element.style.width = '1px'
  element.style.height = '1px'
  element.style.margin = '-1px'
  element.style.border = '0'
  element.style.padding = '0'
  element.style.overflow = 'hidden'
  element.style.clip = 'rect(0px, 0px, 0px, 0px)'
  element.style.clipPath = 'inset(100%)'
}

export interface FlowA11yDescriptions {
  /** Hidden description and live-region elements for the host to append. */
  readonly elements: readonly HTMLElement[]
  readonly nodeDescriptionId: string
  readonly edgeDescriptionId: string
  /** React `AriaLiveMessage`: announce a keyboard node move. */
  readonly announceNodeMove: (input: {
    readonly key: string
    readonly x: number
    readonly y: number
  }) => void
}

/**
 * React `A11yDescriptions`: hidden node and edge descriptions that node and
 * edge elements reference with `aria-describedby`, and an assertive live
 * region for keyboard moves.
 */
export const createA11yDescriptions = (
  canvas: HTMLElement,
  labels: FlowResolvedAriaLabels,
  keyboardEnabled: boolean
): FlowA11yDescriptions => {
  nextDescriptionScope += 1
  const scope = nextDescriptionScope
  const nodeDescription = canvas.ownerDocument.createElement('div')
  nodeDescription.id = `flow-node-desc-${scope}`
  nodeDescription.dataset.testid = 'flow-node-description'
  // React's key names are swapped: with keyboard support it reads the
  // `keyboardDisabled` text, which explains the arrow keys.
  nodeDescription.textContent = keyboardEnabled
    ? labels.config['node.a11yDescription.keyboardDisabled']
    : labels.config['node.a11yDescription.default']
  visuallyHidden(nodeDescription)

  const edgeDescription = canvas.ownerDocument.createElement('div')
  edgeDescription.id = `flow-edge-desc-${scope}`
  edgeDescription.dataset.testid = 'flow-edge-description'
  edgeDescription.textContent = labels.config['edge.a11yDescription.default']
  visuallyHidden(edgeDescription)

  const live = canvas.ownerDocument.createElement('div')
  live.dataset.testid = 'flow-aria-live'
  live.setAttribute('aria-live', 'assertive')
  live.setAttribute('aria-atomic', 'true')
  visuallyHidden(live)

  return {
    elements: [nodeDescription, edgeDescription, live],
    nodeDescriptionId: nodeDescription.id,
    edgeDescriptionId: edgeDescription.id,
    announceNodeMove: ({ key, x, y }) => {
      live.textContent = labels.config['node.a11yDescription.ariaLiveMessage']({
        direction: key.replace('Arrow', '').toLowerCase(),
        x: Math.trunc(x),
        y: Math.trunc(y),
      })
    },
  }
}
