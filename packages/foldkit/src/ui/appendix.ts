export type FoldkitAppendixOptions = Readonly<{
  /** Stable, document-unique ID used by the disclosure's `aria-controls`. */
  id: string
  title: string
  content: string
  expanded?: boolean
}>

export type FoldkitAppendixMount = Readonly<{
  element: HTMLElement
  destroy: () => void
}>

const stopCanvasEvent = (event: Event): void => event.stopPropagation()

/** Mount an accessible, app-content-owned disclosure in a host element. */
export const createFoldkitAppendix = (
  container: HTMLElement,
  options: FoldkitAppendixOptions
): FoldkitAppendixMount => {
  const section = document.createElement('section')
  section.className = 'flow-foldkit-appendix'
  section.dataset.flowNoPan = ''
  section.dataset.flowNoDrag = ''
  section.dataset.flowNoWheel = ''

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'flow-foldkit-appendix-toggle'
  button.textContent = options.title
  button.setAttribute('aria-controls', options.id)
  button.setAttribute('aria-expanded', String(options.expanded ?? false))
  button.dataset.flowNoPan = ''
  button.dataset.flowNoDrag = ''
  button.dataset.flowNoWheel = ''

  const content = document.createElement('div')
  content.className = 'flow-foldkit-appendix-content'
  content.id = options.id
  content.textContent = options.content
  content.hidden = !(options.expanded ?? false)

  const toggle = (): void => {
    const expanded = button.getAttribute('aria-expanded') !== 'true'
    button.setAttribute('aria-expanded', String(expanded))
    content.hidden = !expanded
  }

  button.addEventListener('click', toggle)

  for (const eventName of ['pointerdown', 'mousedown', 'keydown', 'wheel']) {
    button.addEventListener(eventName, stopCanvasEvent)
  }

  section.append(button, content)
  container.append(section)

  let destroyed = false

  return {
    element: section,
    destroy: () => {
      if (destroyed) {
        return
      }

      destroyed = true
      button.removeEventListener('click', toggle)

      for (const eventName of [
        'pointerdown',
        'mousedown',
        'keydown',
        'wheel',
      ]) {
        button.removeEventListener(eventName, stopCanvasEvent)
      }

      section.remove()
    },
  }
}
