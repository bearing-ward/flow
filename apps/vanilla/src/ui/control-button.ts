export interface FlowControlButtonOptions {
  readonly type?: 'button' | 'submit' | 'reset'
  readonly disabled?: boolean
  readonly name?: string
  readonly value?: string
  readonly title?: string
  readonly className?: string
  readonly style?: Readonly<Record<string, string>>
  readonly aria?: Readonly<Record<`aria-${string}`, string>>
  readonly children?: readonly Node[]
  readonly onClick?: (event: MouseEvent) => void
}

/** Create a native control button; callers own its content and event behavior. */
export const createFlowControlButton = (
  owner: Document,
  options: FlowControlButtonOptions = {}
): HTMLButtonElement => {
  const button = owner.createElement('button')
  button.type = options.type ?? 'button'
  button.disabled = options.disabled ?? false

  if (options.name !== undefined) {
    button.name = options.name
  }

  if (options.value !== undefined) {
    button.value = options.value
  }

  if (options.title !== undefined) {
    button.title = options.title
  }

  button.className = ['flow-control-button', options.className]
    .filter(Boolean)
    .join(' ')

  for (const [property, value] of Object.entries(options.style ?? {})) {
    const cssProperty = property.startsWith('--')
      ? property
      : property.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)

    const normalizedProperty = cssProperty.startsWith('ms-')
      ? `-${cssProperty}`
      : cssProperty

    button.style.setProperty(normalizedProperty, value)
  }

  for (const [name, value] of Object.entries(options.aria ?? {})) {
    button.setAttribute(name, value)
  }

  button.append(...(options.children ?? []))

  if (options.onClick) {
    button.addEventListener('click', options.onClick)
  }

  return button
}
