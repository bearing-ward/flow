import {
  flowColorModeMediaQuery,
  flowThemeStylesheet,
  resolveFlowColorMode,
} from '@flow/core'
import type { FlowColorMode, FlowColorModeClass } from '@flow/core'

/** The canvas root every theme default is scoped to. */
export const flowThemeRootSelector = '.flow-canvas'

const themeStyleAttribute = 'data-flow-theme'

/**
 * Inject the shared `--flow-*-default` declarations once per document. Light
 * defaults sit on `.flow-canvas`, dark ones on `.flow-canvas.dark`, as React
 * scopes `--xy-*` to `.react-flow` and `.react-flow.dark`.
 */
export const ensureFlowThemeStylesheet = (target: Document): void => {
  if (target.head.querySelector(`style[${themeStyleAttribute}]`) !== null) {
    return
  }

  const style = target.createElement('style')
  style.setAttribute(themeStyleAttribute, '')
  style.textContent = flowThemeStylesheet(flowThemeRootSelector)
  // First in <head>, so the host stylesheet and user rules can override it.
  target.head.prepend(style)
}

export interface FlowColorModeBinding {
  readonly get: () => FlowColorMode
  readonly resolved: () => FlowColorModeClass
  readonly set: (mode: FlowColorMode) => void
  readonly dispose: () => void
}

/**
 * React `useColorModeClass`: put `light` or `dark` on the canvas root. For
 * `system`, follow `prefers-color-scheme: dark` until the mode changes or
 * the binding is disposed.
 */
export const bindFlowColorMode = (
  canvas: HTMLElement,
  initial: FlowColorMode | undefined
): FlowColorModeBinding => {
  ensureFlowThemeStylesheet(canvas.ownerDocument)

  let mode: FlowColorMode = initial ?? 'light'
  let media: MediaQueryList | undefined
  let current: FlowColorModeClass = 'light'

  const apply = (): void => {
    current = resolveFlowColorMode(mode, media?.matches === true)
    // React also adds `light`; Vanilla keeps light as the unclassed default.
    canvas.classList.toggle('dark', current === 'dark')
    canvas.dataset.colorMode = current
  }

  const stopListening = (): void => {
    media?.removeEventListener('change', apply)
    media = undefined
  }

  const listen = (): void => {
    stopListening()

    if (mode !== 'system') {
      return
    }

    media = globalThis.matchMedia(flowColorModeMediaQuery)
    media.addEventListener('change', apply)
  }

  listen()
  apply()

  return {
    get: () => mode,
    resolved: () => current,
    set: (next) => {
      mode = next
      listen()
      apply()
    },
    dispose: stopListening,
  }
}
