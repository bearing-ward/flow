export interface FlowBaseNodeOptions {
  readonly title: string
  readonly ariaLabel?: string
  readonly content?: Node
  readonly className?: string
}

/** Create a caller-composed accessible shell inside a Vanilla node renderer. */
export const createFlowBaseNode = (
  owner: Document,
  options: FlowBaseNodeOptions
): HTMLElement => {
  const shell = owner.createElement('section')
  shell.className = ['flow-base-node', options.className]
    .filter(Boolean)
    .join(' ')
  shell.setAttribute('role', 'group')
  shell.setAttribute('aria-label', options.ariaLabel ?? options.title)
  shell.dataset.flowBaseNode = ''

  const title = owner.createElement('h2')
  title.className = 'flow-base-node-title'
  title.textContent = options.title
  shell.append(title)

  if (options.content !== undefined) {
    const content = owner.createElement('div')
    content.className = 'flow-base-node-content'
    content.append(options.content)
    shell.append(content)
  }

  return shell
}
