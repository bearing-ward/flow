export interface FlowPlaceholderOptions {
  readonly label?: string
  readonly onActivate: () => void
}

/** Create the keyboard-operable empty-canvas action; the caller owns graph edits. */
export const createFlowPlaceholder = (
  owner: Document,
  options: FlowPlaceholderOptions
): HTMLButtonElement => {
  const button = owner.createElement('button')
  button.type = 'button'
  button.className = 'flow-placeholder'
  button.setAttribute('aria-label', options.label ?? 'Add your first node')
  button.textContent = options.label ?? 'Add your first node'
  button.addEventListener('click', options.onActivate)

  return button
}
