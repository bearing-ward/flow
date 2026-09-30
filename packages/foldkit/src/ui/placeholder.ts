export interface FoldkitPlaceholderOptions {
  readonly label?: string
  readonly onActivate: () => void
}

/** Create the keyboard-operable empty-canvas action; the app owns graph edits. */
export const createFoldkitPlaceholder = (
  owner: Document,
  options: FoldkitPlaceholderOptions
): HTMLButtonElement => {
  const button = owner.createElement('button')
  button.type = 'button'
  button.className = 'flow-foldkit-placeholder'
  button.setAttribute('aria-label', options.label ?? 'Add your first node')
  button.textContent = options.label ?? 'Add your first node'
  button.addEventListener('click', options.onActivate)

  return button
}
