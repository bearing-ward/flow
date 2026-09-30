export interface FlowAppendixOptions {
  readonly label: string
  readonly content: Node
  readonly id?: string
  readonly className?: string
  readonly initiallyExpanded?: boolean
}

export interface FlowAppendix {
  readonly element: HTMLElement
  readonly button: HTMLButtonElement
  readonly region: HTMLElement
  readonly destroy: () => void
}

let nextAppendixId = 0

/** Create a keyboard-operable disclosure for app-owned content. */
export const createFlowAppendix = (
  owner: Document,
  options: FlowAppendixOptions
): FlowAppendix => {
  const element = owner.createElement('section')
  element.className = ['flow-appendix', options.className]
    .filter(Boolean)
    .join(' ')
  element.dataset.flowNoDrag = ''

  const button = owner.createElement('button')
  button.type = 'button'
  button.className = 'flow-appendix-trigger'
  button.textContent = options.label

  const region = owner.createElement('div')
  region.className = 'flow-appendix-content'

  if (options.id === undefined) {
    nextAppendixId += 1
  }

  region.id = options.id ?? `flow-appendix-${nextAppendixId}`
  region.append(options.content)

  const setExpanded = (expanded: boolean): void => {
    button.setAttribute('aria-expanded', String(expanded))
    region.hidden = !expanded
  }

  setExpanded(options.initiallyExpanded ?? false)
  button.setAttribute('aria-controls', region.id)

  const toggle = (): void => {
    setExpanded(button.getAttribute('aria-expanded') !== 'true')
  }

  button.addEventListener('click', toggle)

  element.append(button, region)

  return {
    element,
    button,
    region,
    destroy: () => {
      button.removeEventListener('click', toggle)
      element.remove()
    },
  }
}
